-- =====================================================================
-- push_notifications — iOS push notifications (APNs), all of it in the
-- database except the last hop to Apple.
--
-- FOUR KINDS, and nothing else sends a push:
--   plan_new        somebody the reader's plan-reach fence lets them see
--                   (event_readable's own rule) puts up a plan
--   plan_join       a member RSVPs to a plan the reader created
--   event_reminder  an evening or plan the reader is going to starts in
--                   push_config.reminder_minutes
--   announcement    the admin writes one by hand (admin_push_announce)
--
-- HOW IT FLOWS: triggers / the reminder job / the admin call ENQUEUE rows
-- into push_outbox (already rendered, in the member's own language, with
-- quiet hours already applied as send_after). The send-push Edge Function
-- (supabase/functions/send-push) claims due rows with push_claim() and
-- delivers them to APNs. pg_cron drives both: see
-- db/push_notifications_cron.sql, which carries the one secret and is run
-- after this file and after the function is deployed.
--
-- WHAT THE ADMIN CONTROLS (admin.html → Bildirimler): the master switch,
-- each kind on/off, each kind's Turkish/English title and body template,
-- quiet hours, how early the reminder goes, and sending an announcement.
-- Templates take {name} {title} {place} {day} {time}; a " · " left
-- dangling by an empty placeholder is tidied away.
--
-- Anti-goal check (CLAUDE.md "remind, don't retain"): every kind is about
-- a real person going to a real place. There is no "you haven't opened
-- the app" push and there must never be one.
--
-- Run in the Supabase SQL editor AFTER db/events_v4_plan_reach.sql.
-- Idempotent.
-- =====================================================================


-- ── Devices ──────────────────────────────────────────────────────────
-- One row per device token. The token is the key, not the member: a phone
-- handed to somebody else (sign out, sign in) moves the token to them.
create table if not exists public.push_tokens (
  token      text        primary key check (char_length(token) between 32 and 400),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  platform   text        not null default 'ios' check (platform in ('ios')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;
-- No client policies: a member writes through push_register /
-- push_unregister, and nobody reads anybody's tokens.

create or replace function public.push_register(p_token text, p_platform text default 'ios')
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, auth.uid(), coalesce(p_platform, 'ios'))
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;

create or replace function public.push_unregister(p_token text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;

revoke all on function public.push_register(text, text) from public, anon;
revoke all on function public.push_unregister(text) from public, anon;
grant execute on function public.push_register(text, text) to authenticated;
grant execute on function public.push_unregister(text) to authenticated;


-- ── The admin's switches ─────────────────────────────────────────────
-- One row. Quiet hours are İstanbul wall-clock; a window may cross
-- midnight (23:00 → 08:00). start = end means no quiet hours.
create table if not exists public.push_config (
  id               boolean     primary key default true check (id),
  enabled          boolean     not null default true,
  quiet_start      time        not null default '23:00',
  quiet_end        time        not null default '08:00',
  reminder_minutes int         not null default 120 check (reminder_minutes between 10 and 1440),
  updated_at       timestamptz not null default now()
);
insert into public.push_config (id) values (true) on conflict (id) do nothing;

create table if not exists public.push_kinds (
  kind       text        primary key check (kind in ('plan_new', 'plan_join', 'event_reminder', 'announcement')),
  enabled    boolean     not null default true,
  title_tr   text        not null default '' check (char_length(title_tr) <= 120),
  body_tr    text        not null default '' check (char_length(body_tr)  <= 300),
  title_en   text        not null default '' check (char_length(title_en) <= 120),
  body_en    text        not null default '' check (char_length(body_en)  <= 300),
  updated_at timestamptz not null default now()
);
insert into public.push_kinds (kind, title_tr, body_tr, title_en, body_en) values
  ('plan_new',       '{name} bir yere gidiyor', '{title} · {day} {time} · {place}',
                     '{name} is going somewhere', '{title} · {day} {time} · {place}'),
  ('plan_join',      '{name} de geliyor',       '{title} · {day} {time}',
                     '{name} is coming too',     '{title} · {day} {time}'),
  ('event_reminder', 'Birazdan: {title}',       '{day} {time} · {place}',
                     'Coming up: {title}',       '{day} {time} · {place}'),
  ('announcement',   '', '', '', '')
on conflict (kind) do nothing;

alter table public.push_config enable row level security;
alter table public.push_kinds  enable row level security;

drop policy if exists "push_config admin" on public.push_config;
create policy "push_config admin" on public.push_config for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "push_kinds admin" on public.push_kinds;
create policy "push_kinds admin" on public.push_kinds for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- ── The queue ────────────────────────────────────────────────────────
-- Rendered and ready: the sender never looks at a template. dedupe_key
-- is what stops a second push about the same thing (an RSVP taken back
-- and given again, a reminder job that runs every five minutes).
create table if not exists public.push_outbox (
  id          bigint      generated always as identity primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  kind        text        not null,
  title       text        not null,
  body        text        not null,
  data        jsonb       not null default '{}'::jsonb,
  dedupe_key  text,
  send_after  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '1 day',
  status      text        not null default 'queued'
                check (status in ('queued', 'sending', 'sent', 'failed', 'no_device', 'expired')),
  attempts    int         not null default 0,
  error       text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);
create unique index if not exists push_outbox_dedupe_idx
  on public.push_outbox (user_id, dedupe_key) where dedupe_key is not null;
create index if not exists push_outbox_due_idx
  on public.push_outbox (send_after) where status = 'queued';
create index if not exists push_outbox_created_idx
  on public.push_outbox (created_at desc);

alter table public.push_outbox enable row level security;
-- No client policies at all, the admin included: a plan's push carries
-- the plan's own words, and the admin reads no plan (see "The admin reads
-- no plan" in db/events_v2_plans.sql). The desk's log is admin_push_log(),
-- which blanks those two kinds and names nobody.
drop policy if exists "push_outbox admin read" on public.push_outbox;

create table if not exists public.push_announcements (
  id         uuid        primary key default gen_random_uuid(),
  title_tr   text        not null check (char_length(title_tr) between 1 and 120),
  body_tr    text        not null check (char_length(body_tr)  between 1 and 300),
  title_en   text        check (title_en is null or char_length(title_en) <= 120),
  body_en    text        check (body_en  is null or char_length(body_en)  <= 300),
  recipients int         not null default 0,
  created_at timestamptz not null default now()
);
alter table public.push_announcements enable row level security;
drop policy if exists "push_announcements admin read" on public.push_announcements;
create policy "push_announcements admin read" on public.push_announcements for select to authenticated
  using (public.is_admin());


-- ── Helpers ──────────────────────────────────────────────────────────
-- The first moment at or after p_at that is outside quiet hours.
create or replace function public.push_after_quiet(p_at timestamptz)
returns timestamptz
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  c        public.push_config;
  loc      timestamp := p_at at time zone 'Europe/Istanbul';
  t        time      := loc::time;
  quiet    boolean;
  wake     timestamp;
begin
  select * into c from public.push_config where id;
  if c is null or c.quiet_start = c.quiet_end then return p_at; end if;
  if c.quiet_start < c.quiet_end then
    quiet := t >= c.quiet_start and t < c.quiet_end;
  else
    quiet := t >= c.quiet_start or t < c.quiet_end;
  end if;
  if not quiet then return p_at; end if;
  wake := loc::date + c.quiet_end;
  if wake <= loc then wake := wake + interval '1 day'; end if;
  return wake at time zone 'Europe/Istanbul';
end;
$$;

-- An evening's words, in the reader's language: {title} {place} {day} {time}.
create or replace function public.push_event_vars(p_event uuid, p_en boolean)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  e     public.events;
  loc   timestamp;
  dd    int;
  dword text;
  place text;
begin
  select * into e from public.events where id = p_event;
  if e is null then return '{}'::jsonb; end if;
  loc := e.event_date at time zone 'Europe/Istanbul';
  dd  := loc::date - (now() at time zone 'Europe/Istanbul')::date;
  dword := case
    when dd = 0 then case when p_en then 'Today'    else 'Bugün' end
    when dd = 1 then case when p_en then 'Tomorrow' else 'Yarın' end
    when p_en   then (array['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])[extract(dow from loc)::int + 1]
    else             (array['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'])[extract(dow from loc)::int + 1]
  end;
  place := nullif(btrim(coalesce(e.location, '')), '');
  if place is null and e.neighborhood is not null then
    select n.name_tr into place from public.neighborhoods n where n.id = e.neighborhood;
  end if;
  return jsonb_build_object(
    'title', case when p_en and nullif(btrim(coalesce(e.title_en, '')), '') is not null then e.title_en else e.title end,
    'place', coalesce(place, ''),
    'day',   dword,
    'time',  to_char(loc, 'HH24:MI')
  );
end;
$$;

-- {key} → value, then tidy the separators an empty value leaves behind.
create or replace function public.push_render(p_tpl text, p_vars jsonb)
returns text
language plpgsql
immutable
as $$
declare
  s   text := coalesce(p_tpl, '');
  k   text;
  v   text;
begin
  for k, v in select key, value from jsonb_each_text(coalesce(p_vars, '{}'::jsonb)) loop
    s := replace(s, '{' || k || '}', coalesce(v, ''));
  end loop;
  s := regexp_replace(s, '\{[a-z_]+\}', '', 'g');        -- unknown placeholders
  s := regexp_replace(s, '\s+', ' ', 'g');
  s := regexp_replace(s, '(\s*·\s*){2,}', ' · ', 'g');
  s := regexp_replace(s, '^\s*·\s*|\s*·\s*$', '', 'g');
  return btrim(s);
end;
$$;

-- THE one way a push is queued. Quietly does nothing when the switch is
-- off, the kind is off, the member has no device, or quiet hours would
-- carry it past its own expiry.
create or replace function public.push_enqueue(
  p_user      uuid,
  p_kind      text,
  p_event     uuid,
  p_vars      jsonb,
  p_dedupe    text,
  p_expires   timestamptz
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c     public.push_config;
  k     public.push_kinds;
  en    boolean;
  vars  jsonb;
  ttl   text;
  bdy   text;
  after timestamptz;
begin
  select * into c from public.push_config where id;
  if c is null or not c.enabled then return; end if;
  select * into k from public.push_kinds where kind = p_kind;
  if k is null or not k.enabled then return; end if;
  if not exists (select 1 from public.push_tokens t where t.user_id = p_user) then return; end if;

  select coalesce(p.language_pref = 'more_english', false) into en
  from public.profiles p where p.id = p_user;
  en := coalesce(en, false);

  vars := coalesce(p_vars, '{}'::jsonb);
  if p_event is not null then vars := public.push_event_vars(p_event, en) || vars; end if;

  ttl := public.push_render(case when en and k.title_en <> '' then k.title_en else k.title_tr end, vars);
  bdy := public.push_render(case when en and k.body_en  <> '' then k.body_en  else k.body_tr  end, vars);
  if ttl = '' and bdy = '' then return; end if;

  after := public.push_after_quiet(now());
  if p_expires is not null and after >= p_expires then return; end if;

  insert into public.push_outbox (user_id, kind, title, body, data, dedupe_key, send_after, expires_at)
  values (p_user, p_kind, ttl, bdy,
          jsonb_strip_nulls(jsonb_build_object('kind', p_kind, 'event_id', p_event)),
          p_dedupe, after, coalesce(p_expires, now() + interval '1 day'))
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
end;
$$;


-- ── Trigger: a new plan ──────────────────────────────────────────────
-- Everybody with a device, standing on the creator's map, whom the plan's
-- own reach (and blocks) let read it -- hive_reaches is the same fence
-- event_readable() puts on the row.
create or replace function public.push_on_plan_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  nm   text;
  m    uuid;
  map  uuid;
  hops int;
begin
  if new.audience is distinct from 'petek' or new.created_by is null then return new; end if;
  if new.event_date <= now() then return new; end if;
  select c.map_id into map from public.hive_cells c where c.user_id = new.created_by;
  if map is null then return new; end if;
  select coalesce(nullif(btrim(p.first_name), ''), 'Biri') into nm from public.profiles p where p.id = new.created_by;
  hops := public.plan_reach_hops(new.reach);
  for m in
    select distinct t.user_id
    from public.push_tokens t
    join public.hive_cells c on c.user_id = t.user_id and c.map_id = map
    where t.user_id <> new.created_by
  loop
    if public.hive_reaches(new.created_by, m, hops) then
      perform public.push_enqueue(m, 'plan_new', new.id,
        jsonb_build_object('name', nm), 'plan_new:' || new.id, new.event_date);
    end if;
  end loop;
  return new;
exception when others then
  -- A push is never worth losing the plan over.
  raise warning 'push_on_plan_insert: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists push_on_plan_insert on public.events;
create trigger push_on_plan_insert
  after insert on public.events
  for each row execute function public.push_on_plan_insert();


-- ── Trigger: somebody joins your plan ────────────────────────────────
create or replace function public.push_on_rsvp_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  e  public.events;
  nm text;
begin
  select * into e from public.events where id = new.event_id;
  if e is null or e.audience is distinct from 'petek' or e.created_by is null
     or e.created_by = new.user_id or e.event_date <= now() then
    return new;
  end if;
  select coalesce(nullif(btrim(p.first_name), ''), 'Biri') into nm from public.profiles p where p.id = new.user_id;
  perform public.push_enqueue(e.created_by, 'plan_join', e.id,
    jsonb_build_object('name', nm), 'plan_join:' || e.id || ':' || new.user_id, e.event_date);
  return new;
exception when others then
  raise warning 'push_on_rsvp_insert: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists push_on_rsvp_insert on public.event_rsvps;
create trigger push_on_rsvp_insert
  after insert on public.event_rsvps
  for each row execute function public.push_on_rsvp_insert();


-- ── The reminder job (pg_cron, every five minutes) ───────────────────
-- Who is going: the RSVPs, plus a plan's own creator (who said so by
-- putting it up and has no RSVP button).
create or replace function public.push_enqueue_reminders()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  lead interval;
  r    record;
  n    int := 0;
begin
  select make_interval(mins => reminder_minutes) into lead from public.push_config where id;
  if lead is null then return 0; end if;
  for r in
    select x.user_id, e.id as event_id, e.event_date
    from public.events e
    join lateral (
      select v.user_id from public.event_rsvps v where v.event_id = e.id
      union
      select e.created_by where e.audience = 'petek' and e.created_by is not null
    ) x on true
    where e.event_date > now() and e.event_date <= now() + lead
      and exists (select 1 from public.push_tokens t where t.user_id = x.user_id)
  loop
    perform public.push_enqueue(r.user_id, 'event_reminder', r.event_id, '{}'::jsonb,
      'reminder:' || r.event_id, r.event_date);
    n := n + 1;
  end loop;
  return n;
end;
$$;


-- ── Sender side (service role only) ──────────────────────────────────
-- Expires what is too late, frees what a crashed run left 'sending', and
-- claims up to p_limit due rows.
create or replace function public.push_claim(p_limit int default 200)
returns setof public.push_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.push_outbox set status = 'expired'
   where status = 'queued' and expires_at <= now();
  -- 'sending' for five minutes means the run that claimed it died.
  update public.push_outbox
     set status = case when attempts >= 3 then 'failed' else 'queued' end,
         error  = case when attempts >= 3 then coalesce(error, 'sender never finished') else error end
   where status = 'sending' and send_after < now() - interval '5 minutes';
  return query
  with due as (
    select o.id from public.push_outbox o
    where o.status = 'queued' and o.send_after <= now()
    order by o.send_after, o.id
    limit greatest(1, least(p_limit, 1000))
    for update skip locked
  )
  update public.push_outbox o
     set status = 'sending', attempts = o.attempts + 1, send_after = now()
    from due where o.id = due.id
  returning o.*;
end;
$$;
revoke all on function public.push_claim(int) from public, anon, authenticated;
revoke all on function public.push_enqueue(uuid, text, uuid, jsonb, text, timestamptz) from public, anon, authenticated;
revoke all on function public.push_enqueue_reminders() from public, anon, authenticated;
revoke all on function public.push_event_vars(uuid, boolean) from public, anon, authenticated;


-- ── Admin calls ──────────────────────────────────────────────────────
-- An announcement to every member with a device. Quiet hours still hold:
-- written at midnight, it arrives in the morning.
create or replace function public.admin_push_announce(
  p_title_tr text, p_body_tr text, p_title_en text default null, p_body_en text default null
) returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a     uuid;
  c     public.push_config;
  k     public.push_kinds;
  after timestamptz;
  n     int;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select * into c from public.push_config where id;
  select * into k from public.push_kinds where kind = 'announcement';
  if not coalesce(c.enabled, false) then raise exception 'Bildirimler kapalı (ana anahtar).'; end if;
  if not coalesce(k.enabled, false) then raise exception 'Duyurular kapalı.'; end if;
  if char_length(btrim(coalesce(p_title_tr, ''))) = 0 or char_length(btrim(coalesce(p_body_tr, ''))) = 0 then
    raise exception 'Türkçe başlık ve metin gerekli.';
  end if;

  insert into public.push_announcements (title_tr, body_tr, title_en, body_en)
  values (btrim(p_title_tr), btrim(p_body_tr), nullif(btrim(p_title_en), ''), nullif(btrim(p_body_en), ''))
  returning id into a;

  after := public.push_after_quiet(now());
  insert into public.push_outbox (user_id, kind, title, body, data, dedupe_key, send_after, expires_at)
  select u.user_id, 'announcement',
         case when u.en and nullif(btrim(p_title_en), '') is not null then btrim(p_title_en) else btrim(p_title_tr) end,
         case when u.en and nullif(btrim(p_body_en),  '') is not null then btrim(p_body_en)  else btrim(p_body_tr)  end,
         jsonb_build_object('kind', 'announcement'),
         'announcement:' || a, after, after + interval '1 day'
  from (
    select distinct t.user_id, coalesce(p.language_pref = 'more_english', false) as en
    from public.push_tokens t left join public.profiles p on p.id = t.user_id
  ) u
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  get diagnostics n = row_count;
  update public.push_announcements set recipients = n where id = a;
  return n;
end;
$$;

-- A test to the admin's own phone(s), now: no switches, no quiet hours.
create or replace function public.admin_push_test(p_title text, p_body text)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  select count(*) into n from public.push_tokens where user_id = auth.uid();
  if n = 0 then return 0; end if;
  insert into public.push_outbox (user_id, kind, title, body, data, expires_at)
  values (auth.uid(), 'test', coalesce(nullif(btrim(p_title), ''), 'İstanbulite'),
          coalesce(nullif(btrim(p_body), ''), 'Deneme bildirimi.'),
          jsonb_build_object('kind', 'test'), now() + interval '1 hour');
  return n;
end;
$$;

create or replace function public.admin_push_stats()
returns table (devices int, members int, queued int, sent_24h int, failed_24h int, my_devices int)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  return query select
    (select count(*)::int from public.push_tokens),
    (select count(distinct user_id)::int from public.push_tokens),
    (select count(*)::int from public.push_outbox where status in ('queued', 'sending')),
    (select count(*)::int from public.push_outbox where status = 'sent' and sent_at > now() - interval '24 hours'),
    (select count(*)::int from public.push_outbox where status = 'failed' and created_at > now() - interval '24 hours'),
    (select count(*)::int from public.push_tokens where user_id = auth.uid());
end;
$$;

-- The desk's log: what went out, when, and how it went -- never to whom,
-- and never what a member's plan said.
create or replace function public.admin_push_log(p_limit int default 50)
returns table (id bigint, kind text, title text, body text, status text, error text,
               created_at timestamptz, send_after timestamptz, sent_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  return query
  select o.id, o.kind,
         case when o.kind in ('plan_new', 'plan_join') then null else o.title end,
         case when o.kind in ('plan_new', 'plan_join') then null else o.body  end,
         o.status, o.error, o.created_at, o.send_after, o.sent_at
  from public.push_outbox o
  order by o.created_at desc, o.id desc
  limit greatest(1, least(p_limit, 200));
end;
$$;

revoke all on function public.admin_push_log(int) from public, anon;
grant execute on function public.admin_push_log(int) to authenticated;
revoke all on function public.admin_push_announce(text, text, text, text) from public, anon;
revoke all on function public.admin_push_test(text, text) from public, anon;
revoke all on function public.admin_push_stats() from public, anon;
grant execute on function public.admin_push_announce(text, text, text, text) to authenticated;
grant execute on function public.admin_push_test(text, text) to authenticated;
grant execute on function public.admin_push_stats() to authenticated;
