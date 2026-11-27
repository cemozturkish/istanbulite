-- =====================================================================
-- push_notifications — iOS push notifications (APNs), all of it in the
-- database except the last hop to Apple.
--
-- FIVE KINDS, and nothing else sends a push:
--   plan_new        somebody the reader's plan-reach fence lets them see
--                   (event_readable's own rule) puts up a plan
--   plan_join       a member RSVPs to a plan the reader created
--   event_reminder  an evening or plan the reader is going to starts in
--                   push_config.reminder_minutes
--   announcement    the admin writes one by hand (admin_push_announce)
--   poke            a member attached to the reader on the petek nudges
--                   them to play today's games (hive_poke,
--                   db/hive_pokes.sql) -- one poke a day per member
--
-- HOW IT FLOWS: triggers / the reminder job / the admin call ENQUEUE rows
-- into push_outbox (in the member's own language, with quiet hours
-- already applied as send_after). The send-push Edge Function
-- (supabase/functions/send-push) claims due rows with push_claim(), which
-- RE-CHECKS every plan/evening push against the event and the member's
-- reach as they are at that moment (push_compose) -- a row that waited
-- overnight is never sent on what was true when it was queued -- and
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
  kind       text        primary key check (kind in ('plan_new', 'plan_join', 'event_reminder', 'announcement', 'poke')),
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
-- The table above is created once, so a database that ran this file
-- before 'poke' existed still carries the four-kind check: re-point it
-- BEFORE the poke row goes in, or that insert fails the old check.
alter table public.push_kinds drop constraint if exists push_kinds_kind_check;
alter table public.push_kinds add constraint push_kinds_kind_check
  check (kind in ('plan_new', 'plan_join', 'event_reminder', 'announcement', 'poke'));
insert into public.push_kinds (kind, title_tr, body_tr, title_en, body_en) values
  ('poke', '{name} seni oyuna dürttü', 'Bugünün oyunları seni bekliyor.',
           '{name} poked you to play', 'Today''s games are waiting for you.')
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
-- title/body are rendered when the row is queued (so the log can show
-- an announcement) but are NOT what goes out for an event-bound kind:
-- push_claim() re-checks and re-renders those from the plan or evening
-- as it stands at the moment of release (see push_compose). ctx carries
-- what the row needs for that besides the event -- for plan_join, who
-- joined. dedupe_key is what stops a second push about the same thing
-- (an RSVP taken back and given again, a reminder job that runs every
-- five minutes).
create table if not exists public.push_outbox (
  id          bigint      generated always as identity primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  kind        text        not null,
  title       text        not null,
  body        text        not null,
  data        jsonb       not null default '{}'::jsonb,
  ctx         jsonb       not null default '{}'::jsonb,
  dedupe_key  text,
  send_after  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '1 day',
  status      text        not null default 'queued',
  attempts    int         not null default 0,
  error       text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);
alter table public.push_outbox add column if not exists ctx jsonb not null default '{}'::jsonb;
alter table public.push_outbox drop constraint if exists push_outbox_status_check;
alter table public.push_outbox add constraint push_outbox_status_check
  check (status in ('queued', 'sending', 'sent', 'failed', 'no_device', 'expired', 'cancelled'));
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

-- ── Is this push still true, and what does it say NOW? ───────────────
-- The one place a push is checked and rendered, used twice: when it is
-- queued, and again by push_claim() at the moment it is released. A row
-- can wait hours (quiet hours), and in that time the plan can be taken
-- back, edited, narrowed so it no longer reaches this member, or one of
-- them can block the other; an RSVP can be withdrawn; the admin can
-- switch the kind off. A push rendered at queue time and sent blind would
-- carry a plan's private words to somebody the plan no longer reaches.
--
-- Answers o_title/o_body (null when it must not go, with o_reason saying
-- why in a word that names nothing) and o_expires, the latest moment it
-- is still worth sending.
-- Same reason as push_enqueue below: an older deploy may carry other
-- parameter names, which CREATE OR REPLACE cannot rename.
drop function if exists public.push_compose(uuid, text, uuid, jsonb);
create or replace function public.push_compose(
  p_user uuid, p_kind text, p_event uuid, p_ctx jsonb,
  out o_title text, out o_body text, out o_expires timestamptz, out o_reason text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  c     public.push_config;
  k     public.push_kinds;
  e     public.events;
  actor uuid := nullif(coalesce(p_ctx, '{}'::jsonb) ->> 'actor', '')::uuid;
  who   uuid;
  en    boolean;
  vars  jsonb;
  nm    text;
begin
  select * into c from public.push_config where id;
  if c is null or not c.enabled then o_reason := 'off'; return; end if;
  select * into k from public.push_kinds where kind = p_kind;
  if k is null or not k.enabled then o_reason := 'off'; return; end if;

  if p_kind = 'poke' then
    -- Still attached to each other, and neither has blocked the other:
    -- a poke queued overnight from somebody the reader has since blocked
    -- or let go of must not arrive in the morning.
    if actor is null or actor = p_user
       or not exists (select 1 from public.hive_bonds hb
                      where hb.a = least(actor, p_user) and hb.b = greatest(actor, p_user))
       or exists (select 1 from public.member_blocks b
                  where (b.blocker = actor and b.blocked = p_user) or (b.blocker = p_user and b.blocked = actor)) then
      o_reason := 'not_visible'; return;
    end if;
    select coalesce(p.language_pref = 'more_english', false) into en from public.profiles p where p.id = p_user;
    en := coalesce(en, false);
    select nullif(btrim(p.first_name), '') into nm from public.profiles p where p.id = actor;
    vars := jsonb_build_object('name', coalesce(nm, case when en then 'Someone' else 'Biri' end));
    o_title := public.push_render(case when en and k.title_en <> '' then k.title_en else k.title_tr end, vars);
    o_body  := public.push_render(case when en and k.body_en  <> '' then k.body_en  else k.body_tr  end, vars);
    if o_title = '' and o_body = '' then o_title := null; o_body := null; o_reason := 'empty'; return; end if;
    -- A nudge to play TODAY's games is worthless once they turn over at
    -- the İstanbul midnight.
    o_expires := (((now() at time zone 'Europe/Istanbul')::date + 1)::timestamp at time zone 'Europe/Istanbul');
    return;
  end if;

  if p_event is null then o_reason := 'gone'; return; end if;
  select * into e from public.events where id = p_event;
  if e is null then o_reason := 'gone'; return; end if;
  if e.event_date <= now() then o_reason := 'past'; return; end if;

  if p_kind = 'plan_new' then
    -- Still a plan, still not the reader's own, and its CURRENT reach
    -- (and any block since) still lets the reader see it.
    if e.audience is distinct from 'petek' or e.created_by is null or e.created_by = p_user
       or not public.hive_reaches(e.created_by, p_user, public.plan_reach_hops(e.reach)) then
      o_reason := 'not_visible'; return;
    end if;
    who := e.created_by;
  elsif p_kind = 'plan_join' then
    -- Still the reader's plan, the joiner is still going, and neither
    -- has blocked the other. (A reach edit that leaves the joiner out
    -- already takes their RSVP away -- plan_moved_clear_answers.)
    if e.audience is distinct from 'petek' or e.created_by is distinct from p_user or actor is null
       or not exists (select 1 from public.event_rsvps v where v.event_id = e.id and v.user_id = actor)
       or exists (select 1 from public.member_blocks b
                  where (b.blocker = actor and b.blocked = p_user) or (b.blocker = p_user and b.blocked = actor)) then
      o_reason := 'not_visible'; return;
    end if;
    who := actor;
  elsif p_kind = 'event_reminder' then
    -- Still going (an RSVP, or it is the reader's own plan), and a plan
    -- still reaches them.
    if not (exists (select 1 from public.event_rsvps v where v.event_id = e.id and v.user_id = p_user)
            or (e.audience = 'petek' and e.created_by = p_user)) then
      o_reason := 'not_visible'; return;
    end if;
    if e.audience = 'petek' and e.created_by is distinct from p_user
       and (e.created_by is null
            or not public.hive_reaches(e.created_by, p_user, public.plan_reach_hops(e.reach))) then
      o_reason := 'not_visible'; return;
    end if;
  else
    o_reason := 'kind'; return;
  end if;

  select coalesce(p.language_pref = 'more_english', false) into en from public.profiles p where p.id = p_user;
  en := coalesce(en, false);
  vars := public.push_event_vars(e.id, en);
  if who is not null then
    select nullif(btrim(p.first_name), '') into nm from public.profiles p where p.id = who;
    vars := vars || jsonb_build_object('name', coalesce(nm, case when en then 'Someone' else 'Biri' end));
  end if;

  o_title := public.push_render(case when en and k.title_en <> '' then k.title_en else k.title_tr end, vars);
  o_body  := public.push_render(case when en and k.body_en  <> '' then k.body_en  else k.body_tr  end, vars);
  if o_title = '' and o_body = '' then o_title := null; o_body := null; o_reason := 'empty'; return; end if;
  o_expires := e.event_date;
end;
$$;

-- An older deploy of this file named this function's parameters
-- differently (p_vars where it is p_ctx now), and Postgres refuses to
-- rename a parameter through CREATE OR REPLACE (42P13). Dropping first is
-- safe: the triggers and the reminder job call it by name at run time,
-- so nothing depends on the old definition.
drop function if exists public.push_enqueue(uuid, text, uuid, jsonb, text, timestamptz);

-- THE one way an event-bound push is queued. Quietly does nothing when
-- push_compose() says no, the member has no device, or quiet hours would
-- carry it past its own expiry.
create or replace function public.push_enqueue(
  p_user      uuid,
  p_kind      text,
  p_event     uuid,
  p_ctx       jsonb,
  p_dedupe    text,
  p_expires   timestamptz
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m     record;
  after timestamptz;
  exp   timestamptz;
begin
  if not exists (select 1 from public.push_tokens t where t.user_id = p_user) then return; end if;
  select * into m from public.push_compose(p_user, p_kind, p_event, p_ctx);
  if m.o_title is null then return; end if;
  exp := least(coalesce(p_expires, m.o_expires), m.o_expires);
  after := public.push_after_quiet(now());
  if after >= exp then return; end if;

  insert into public.push_outbox (user_id, kind, title, body, data, ctx, dedupe_key, send_after, expires_at)
  values (p_user, p_kind, m.o_title, m.o_body,
          jsonb_build_object('kind', p_kind, 'event_id', p_event),
          coalesce(p_ctx, '{}'::jsonb), p_dedupe, after, exp)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
end;
$$;


-- ── Trigger: a new plan ──────────────────────────────────────────────
-- Everybody with a device standing on the creator's map is a candidate;
-- push_compose() keeps only those the plan's own reach (and blocks) let
-- read it -- hive_reaches is the same fence event_readable() puts on the
-- row.
create or replace function public.push_on_plan_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m    uuid;
  map  uuid;
begin
  if new.audience is distinct from 'petek' or new.created_by is null then return new; end if;
  if new.event_date <= now() then return new; end if;
  select c.map_id into map from public.hive_cells c where c.user_id = new.created_by;
  if map is null then return new; end if;
  for m in
    select distinct t.user_id
    from public.push_tokens t
    join public.hive_cells c on c.user_id = t.user_id and c.map_id = map
    where t.user_id <> new.created_by
  loop
    perform public.push_enqueue(m, 'plan_new', new.id, '{}'::jsonb, 'plan_new:' || new.id, new.event_date);
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
begin
  select * into e from public.events where id = new.event_id;
  if e is null or e.audience is distinct from 'petek' or e.created_by is null
     or e.created_by = new.user_id or e.event_date <= now() then
    return new;
  end if;
  perform public.push_enqueue(e.created_by, 'plan_join', e.id,
    jsonb_build_object('actor', new.user_id), 'plan_join:' || e.id || ':' || new.user_id, e.event_date);
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


-- ── Recovery (also run by the five-minute job, not only by a sender) ──
-- Expires what is too late, and frees what a run that died left
-- 'sending'. It cannot live only inside push_claim(): a sender that
-- claims the LAST batch and crashes leaves nothing 'queued', the
-- push-send job's wake-up finds nothing due, and the batch would wait
-- for some unrelated push to wake the sender. push-reminders calls this
-- every five minutes whatever the queue holds, and push-send's wake-up
-- also counts a stale 'sending' row (db/push_notifications_cron.sql).
create or replace function public.push_recover()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare n int;
begin
  update public.push_outbox set status = 'expired'
   where status = 'queued' and expires_at <= now();
  update public.push_outbox
     set status = case when attempts >= 3 then 'failed' else 'queued' end,
         error  = case when attempts >= 3 then coalesce(error, 'sender never finished') else error end
   where status = 'sending' and send_after < now() - interval '5 minutes';
  get diagnostics n = row_count;
  return n;
end;
$$;


-- ── The reminder job (pg_cron, every five minutes) ───────────────────
-- Who is going: the RSVPs, plus a plan's own creator (who said so by
-- putting it up and has no RSVP button). push_compose() decides whether
-- each one is still true.
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
  perform public.push_recover();
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
-- Claims up to p_limit due rows, and RE-CHECKS each event-bound one at
-- the moment of release: push_compose() against the plan or evening and
-- the member's reach as they are now. One that is no longer true is
-- 'cancelled' (its error is the one-word reason, which names nothing);
-- one that is goes out with its words re-rendered, so an edited plan
-- arrives as it now reads. An announcement is released only while the
-- switches still allow it; the admin's own test always is.
create or replace function public.push_claim(p_limit int default 200)
returns setof public.push_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r   public.push_outbox;
  rel public.push_outbox;
  m   record;
  on_ boolean;
begin
  perform public.push_recover();
  for r in
    select * from public.push_outbox o
    where o.status = 'queued' and o.send_after <= now()
    order by o.send_after, o.id
    limit greatest(1, least(p_limit, 1000))
    for update skip locked
  loop
    if r.kind in ('plan_new', 'plan_join', 'event_reminder', 'poke') then
      select * into m from public.push_compose(r.user_id, r.kind, nullif(r.data ->> 'event_id', '')::uuid, r.ctx);
      if m.o_title is null then
        update public.push_outbox set status = 'cancelled', error = m.o_reason where id = r.id;
        continue;
      end if;
      update public.push_outbox
         set title = m.o_title, body = m.o_body, expires_at = least(expires_at, m.o_expires),
             status = 'sending', attempts = attempts + 1, send_after = now()
       where id = r.id
      returning * into rel;
    else
      if r.kind = 'announcement' then
        select coalesce((select enabled from public.push_config where id), false)
           and coalesce((select enabled from public.push_kinds where kind = 'announcement'), false)
          into on_;
        if not on_ then
          update public.push_outbox set status = 'cancelled', error = 'off' where id = r.id;
          continue;
        end if;
      end if;
      update public.push_outbox
         set status = 'sending', attempts = attempts + 1, send_after = now()
       where id = r.id
      returning * into rel;
    end if;
    return next rel;
  end loop;
end;
$$;

-- What the sender hands back when it could not even try (it never
-- reached APNs): the rows go back in the queue without spending an
-- attempt, so a database hiccup is not a lost batch.
create or replace function public.push_release(p_ids bigint[])
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.push_outbox
     set status = 'queued', attempts = greatest(attempts - 1, 0)
   where id = any(p_ids) and status = 'sending';
$$;

revoke all on function public.push_claim(int) from public, anon, authenticated;
revoke all on function public.push_release(bigint[]) from public, anon, authenticated;
revoke all on function public.push_recover() from public, anon, authenticated;
revoke all on function public.push_compose(uuid, text, uuid, jsonb) from public, anon, authenticated;
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
         case when o.kind in ('plan_new', 'plan_join', 'poke') then null else o.title end,
         case when o.kind in ('plan_new', 'plan_join', 'poke') then null else o.body  end,
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
