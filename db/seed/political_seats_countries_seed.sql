-- =====================================================================
-- Kütüphane — the leader of every country drawn on the phone map.
--
-- One seat per country in db/country_entries.sql's `countries` lookup, so
-- touching any country on Kütüphane's map names somebody rather than
-- printing "Henüz eklenmedi". Requires db/politicians.sql and
-- db/political_seats_v2_countries.sql to have been run first.
--
-- ── Which office each seat names ──
-- Whoever actually governs, not a fixed office: the Başbakan where the
-- prime minister leads (Greece, Ethiopia, Armenia), the Cumhurbaşkanı or
-- Devlet Başkanı where the president does (Russia, Azerbaijan, Egypt),
-- and the office that really holds the country where neither ordinary
-- answer is true — Iran's Dini Lider, Saudi Arabia's Veliaht Prens,
-- Yemen's and Sudan's councils. The title is what the seat prints under
-- the name, so it has to be the true one.
--
-- Türkiye's seat reuses the person already holding the `cumhurbaskani`
-- seat rather than adding a second copy of them (the match is on the
-- roster's own uppercase convention, see tr_upper below). Ankara is on
-- the map but opens the meclis rather than a country page, so its seat
-- is the TBMM Başkanı — the person that page is about.
--
-- ── This is a snapshot, not a fact of nature ──
-- Checked against news sources on 19 August 2026. Officeholders change,
-- and several of these were mid-change when this was written — Serbia's
-- president had announced a resignation he had not yet made, Romania and
-- Moldova were both between governments, Iraq had changed prime minister
-- in May and Bulgaria in May. Everything here is editable from the admin
-- portal (Koltuklar → Ülkeler); re-running this file overwrites what is
-- there, so edit in the portal rather than here once it has been run
-- once.
--
-- Run in the Supabase SQL editor. Idempotent.
-- =====================================================================

-- The roster stores names uppercased, Turkish-aware (see the
-- uppercase_politician_name trigger in db/politicians.sql). Defined here
-- too so this file does not depend on which of the earlier migrations has
-- been run — and so the lookup below matches a person who is already in
-- the table instead of adding them twice.
create or replace function public.tr_upper(t text)
  returns text language sql immutable as $$
  select upper(translate(
    t,
    'abcçdefgğhıijklmnoöprsştuüvyz',
    'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'
  ));
$$;

do $$
declare
  r   record;
  pid uuid;
begin
  for r in
    select * from (values
      -- Türkiye and its capital
      ('turkiye',     'Cumhurbaşkanı',              'Recep Tayyip',  'Erdoğan'),
      ('ankara',      'TBMM Başkanı',               'Numan',         'Kurtulmuş'),

      -- Karadeniz and the Balkans
      ('russia',      'Devlet Başkanı',             'Vladimir',      'Putin'),
      ('ukraine',     'Devlet Başkanı',             'Volodimir',     'Zelenski'),
      ('moldova',     'Cumhurbaşkanı',              'Maia',          'Sandu'),
      ('romania',     'Cumhurbaşkanı',              'Nicuşor',       'Dan'),
      ('bulgaria',    'Başbakan',                   'Rumen',         'Radev'),
      ('serbia',      'Cumhurbaşkanı',              'Aleksandar',    'Vucic'),
      ('macedonia',   'Başbakan',                   'Hristiyan',     'Mickoski'),
      ('greece',      'Başbakan',                   'Kiryakos',      'Miçotakis'),
      ('cyprus',      'Cumhurbaşkanı',              'Nikos',         'Hristodulidis'),

      -- Kafkasya
      ('georgia',     'Başbakan',                   'İrakli',        'Kobahidze'),
      ('armenia',     'Başbakan',                   'Nikol',         'Paşinyan'),
      ('azerbaijan',  'Cumhurbaşkanı',              'İlham',         'Aliyev'),

      -- Ortadoğu
      ('iran',        'Dini Lider',                 'Mücteba',       'Hamaney'),
      ('iraq',        'Başbakan',                   'Ali',           'el-Zeydi'),
      ('syria',       'Devlet Başkanı',             'Ahmed',         'eş-Şara'),
      ('lebanon',     'Cumhurbaşkanı',              'Joseph',        'Aoun'),
      ('palestine',   'Devlet Başkanı',             'Mahmud',        'Abbas'),
      ('jordan',      'Kral',                       'II. Abdullah',  'bin Hüseyin'),
      ('saudiarabia', 'Veliaht Prens',              'Muhammed',      'bin Selman'),
      ('yemen',       'Başkanlık Konseyi Başkanı',  'Reşad',         'el-Alimi'),

      -- Kuzey ve Doğu Afrika
      ('egypt',       'Cumhurbaşkanı',              'Abdulfettah',   'es-Sisi'),
      ('libya',       'Başbakan',                   'Abdulhamid',    'Dibeybe'),
      ('sudan',       'Egemenlik Konseyi Başkanı',  'Abdulfettah',   'el-Burhan'),
      ('chad',        'Devlet Başkanı',             'Mahamat İdris', 'Debi'),
      ('eritrea',     'Devlet Başkanı',             'İsayas',        'Afevorki'),
      ('ethiopia',    'Başbakan',                   'Abiy',          'Ahmed')
    ) as t(country_id, title, first_name, last_name)
  loop
    -- Already on the roster? Then this seat takes that person, rather
    -- than the table growing a second Erdoğan.
    select id into pid
      from public.politicians
     where first_name = public.tr_upper(r.first_name)
       and last_name  = public.tr_upper(r.last_name)
     limit 1;

    if pid is null then
      -- Inserted already-uppercased rather than leaning on the trigger,
      -- so the lookup above finds this row on the next run whether or not
      -- the trigger exists yet.
      insert into public.politicians (first_name, last_name)
      values (public.tr_upper(r.first_name), public.tr_upper(r.last_name))
      returning id into pid;
    end if;

    -- neighborhood is cleared explicitly: a seat carries a neighborhood
    -- OR a country, never both (db/political_seats_v2_countries.sql), and
    -- an id could in principle already exist as the other kind.
    insert into public.political_seats (id, country, title, politician_id)
    values (r.country_id, r.country_id, r.title, pid)
    on conflict (id) do update
      set country       = excluded.country,
          neighborhood  = null,
          title         = excluded.title,
          politician_id = excluded.politician_id;
  end loop;
end $$;
