-- =====================================================================
-- Data import: birth date/place for Istanbul's 37 belediye başkanı
-- (imported by db/seed/istanbul_mayors_import.sql) and Cumhurbaşkanı Recep
-- Tayyip Erdoğan (whose politicians/political_seats rows were entered
-- by hand via admin.html's Kişiler/Koltuklar tabs, not by a migration
-- file -- see db/politicians.sql's 'cumhurbaskani' seat comment).
--
-- Sourced from Turkish Wikipedia, major news outlets and municipal bio
-- pages. Two tiers, kept separate on purpose:
--
--   1. A confirmed full day-month-year date -> birth_date + birth_place.
--   2. Only a birth *year* was found, no confirmed day/month -> the
--      date column is a real `date`, so storing just a year would mean
--      inventing a day/month that was never verified; left blank
--      instead, only birth_place is filled.
--
-- One mayor (Mevlüt Öztekin, Kağıthane) is omitted entirely -- only an
-- unconfirmed birth year turned up for him and no reliable birth place,
-- so there was nothing worth entering.
--
-- Known caveats on two entries, worth a human spot-check:
--   - Ekrem İmamoğlu: his official/registry birth date (4 June 1970,
--     used below) differs from a later-publicized personal claim of
--     3 June 1971; the registry date is what most reference sources
--     cite, so that's what's used here.
--   - Kemal Çebi: the only date found (1 January 1956) reads like a
--     registry placeholder rather than a confirmed birthday (common for
--     older-generation Turkish records), so it's treated as year-only
--     below and only Trabzon (birth_place) is filled in.
--
-- Matches existing politicians rows by name via tr_upper() (same
-- Turkish-aware uppercase helper politicians.sql uses for its own
-- trigger), so this doesn't depend on exact stored casing. Uses
-- coalesce() so it never overwrites a birth_date/birth_place an admin
-- may have already entered by hand -- only fills in blanks, and is safe
-- to run more than once.
--
-- Run in the Supabase SQL editor after db/politicians.sql and
-- db/seed/istanbul_mayors_import.sql have already run.
-- =====================================================================

-- Tier 1: confirmed full date + place.
update public.politicians p
set birth_date  = coalesce(p.birth_date, v.birth_date::date),
    birth_place = coalesce(p.birth_place, v.birth_place)
from (values
  ('Ekrem',        'İmamoğlu',    '1970-06-04', 'Cevizli, Akçaabat, Trabzon'),
  ('Mustafa',      'Candaroğlu',  '1984-12-05', 'Arnavutköy, İstanbul'),
  ('Onursal',      'Adıgüzel',    '1985-02-11', 'Malatya'),
  ('Hasan',        'Mutlu',       '1961-06-22', 'Safranbolu, Karabük'),
  ('Rıza',         'Akpolat',     '1982-11-11', 'Bahçelievler, İstanbul'),
  ('Mehmet Murat', 'Çalık',       '1972-11-19', 'Maçka, Trabzon'),
  ('Orhan',        'Çerkez',      '1962-04-08', 'Ardahan'),
  ('Mehmet Tevfik','Göksu',       '1966-10-16', 'Gölbaşı, Adıyaman'),
  ('Mehmet Ergün', 'Turan',       '1967-02-26', 'İstanbul'),
  ('Gökhan',       'Yüksel',      '1987-06-18', 'Kartal, İstanbul'),
  ('Resul Emrah',  'Şahan',       '1982-06-11', 'Ankara'),
  ('Eren Ali',     'Bingöl',      '1993-10-04', 'İstanbul'),
  ('Sinem',        'Dedetaş',     '1981-05-14', 'Eskişehir'),
  ('Recep Tayyip', 'Erdoğan',     '1954-02-26', 'Kasımpaşa, İstanbul')
) as v(first_name, last_name, birth_date, birth_place)
where public.tr_upper(p.first_name) = public.tr_upper(v.first_name)
  and public.tr_upper(p.last_name)  = public.tr_upper(v.last_name);

-- Tier 2: birth place only -- only a year (not a confirmed day/month)
-- was found for these, so birth_date is deliberately left blank.
update public.politicians p
set birth_place = coalesce(p.birth_place, v.birth_place)
from (values
  ('Utku Caner',      'Çaykara',            'İstanbul'),
  ('Yasin',            'Yıldız',             'İstanbul'),
  ('Hakan',            'Bahadır',            'İstanbul'),
  ('Ayşegül',          'Özdemir Ovalıoğlu',  'İstanbul'),
  ('Yasin',            'Kartoğlu',           'Küçükçekmece, İstanbul'),
  ('Alaattin',         'Köseler',            'Paşabahçe, Beykoz, İstanbul'),
  ('İnan',             'Güney',              'Örnektepe, Beyoğlu, İstanbul'),
  ('Hasan',            'Akgün',              'Trabzon'),
  ('Ahmet',            'Özer',               'Van'),
  ('Mithat Bülent',    'Özmen',              'Ağrı'),
  ('Hakan',            'Bahçetepe',          'Gaziosmanpaşa, İstanbul'),
  ('Bünyamin',         'Demir',              'İstanbul'),
  ('Mesut',            'Kösedağı',           'İstanbul'),
  ('Kemal',            'Çebi',               'Trabzon'),
  ('Esin',             'Köymen',             'İkizdere, Rize'),
  ('Ahmet',            'Cin',                'Sakarya'),
  ('Alper',            'Yeğin',              'Sancaktepe, İstanbul'),
  ('Mustafa Oktay',    'Aksu',               'Ordu'),
  ('Bora',             'Balcıoğlu',          'Silivri, İstanbul'),
  ('Ali',              'Tombaş',             'Ünye, Ordu'),
  ('Abdurrahman',      'Dursun',             'Adıyaman'),
  ('İsmet',            'Yıldırım',           'Ümraniye, İstanbul'),
  ('Ömer',             'Arısoy',             'Çamlıhemşin, Rize')
) as v(first_name, last_name, birth_place)
where public.tr_upper(p.first_name) = public.tr_upper(v.first_name)
  and public.tr_upper(p.last_name)  = public.tr_upper(v.last_name);
