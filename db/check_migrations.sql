-- =====================================================================
-- Hangi migration çalıştırılmış, hangisi eksik?
--
-- READ ONLY. Bu dosya hiçbir şey oluşturmaz, değiştirmez, silmez — tek
-- yaptığı, db/ altındaki her migration'ın oluşturduğu ana nesneye bakıp
-- "VAR" ya da "EKSİK" demek. Supabase SQL editöründe çalıştırın ve
-- EKSİK yazan satırların dosyasını sırasıyla çalıştırın.
--
-- (Tek geçici istisna: sadece bu oturum boyunca yaşayan bir pg_temp
-- fonksiyonu tanımlar. Seed dosyaları için satır saymak gerekiyor ve
-- olmayan bir tabloyu düz SQL içinde saymak sorgunun tamamını
-- derlenemez hâle getirir — dinamik çalıştırmanın sebebi bu.)
--
-- Sıra önemli: bir dosya kendinden öncekinin bıraktığı tabloya
-- dokunuyorsa, önce onu çalıştırın. Aşağıdaki liste zaten o sırada.
-- =====================================================================

-- Satır sayar; tablo (ya da kolon) yoksa -1 döner. Dinamik olmasının
-- sebebi: olmayan bir tabloya düz SQL içinde yapılan atıf, sorgunun
-- tamamını daha çalışmadan derlenemez hâle getiriyor.
create or replace function pg_temp.rows_or_missing(rel text, cond text default 'true')
returns bigint
language plpgsql
as $$
declare n bigint;
begin
  if to_regclass(rel) is null then return -1; end if;
  execute format('select count(*) from %s where %s', rel, cond) into n;
  return n;
exception when others then
  return -1;
end;
$$;

create or replace function pg_temp.has_fn(fname text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = fname
  );
$$;

create or replace function pg_temp.has_col(tbl text, col text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = tbl and column_name = col
  );
$$;

with checks(sira, dosya, aranan, var) as (
  values
    -- ── Ağustos 11–13 ──
    (11, 'db/coffee_comments.sql',                    'coffee_comments tablosu',
         to_regclass('public.coffee_comments') is not null),
    (12, 'db/coffee_prices_v3_live.sql',              'coffee_prices.hours + discount kolonları',
         pg_temp.has_col('coffee_prices', 'hours') and pg_temp.has_col('coffee_prices', 'discount')),
    (13, 'db/sozcel_used_answers_v5_server_pick.sql', 'sozcel_daily_word() fonksiyonu',
         pg_temp.has_fn('sozcel_daily_word')),
    (14, 'db/game_day_toggles.sql',                   'game_day_toggles tablosu',
         to_regclass('public.game_day_toggles') is not null),

    -- ── Ağustos 14–17: Kütüphane'nin ülkeleri ──
    (20, 'db/country_entries.sql',                    'country_entries tablosu',
         to_regclass('public.country_entries') is not null),
    (21, 'db/breaking_news_countries.sql',            'breaking_news_countries tablosu',
         to_regclass('public.breaking_news_countries') is not null),
    (22, 'db/country_entry_events.sql',               'country_entry_events tablosu',
         to_regclass('public.country_entry_events') is not null),
    (23, 'db/library_letter_reads.sql',               'library_letter_reads tablosu',
         to_regclass('public.library_letter_reads') is not null),
    (24, 'db/country_entries_seed.sql',               'country_entries içinde satır',
         pg_temp.rows_or_missing('public.country_entries') > 0),

    -- ── Ağustos 19–20: koltuklar ve hikâyeler ──
    (30, 'db/political_seats_v2_countries.sql',       'political_seats.country kolonu',
         pg_temp.has_col('political_seats', 'country')),
    (31, 'db/political_seats_countries_seed.sql',     'ülke koltuğu satırları',
         pg_temp.rows_or_missing('public.political_seats', 'country is not null') > 0),
    (32, 'db/country_stories.sql',                    'country_stories tablosu',
         to_regclass('public.country_stories') is not null),
    (33, 'db/country_stories_seed.sql',               'hikâyelerin girdileri (country_entries)',
         pg_temp.rows_or_missing('public.country_entries') > 5),

    -- ── Ağustos 20–21: petek ve oyun soruları ──
    (40, 'db/hive_slots.sql (+ v2, v3)',              'hive_codes tablosu (eski, v5 ile emekli)',
         to_regclass('public.hive_codes') is not null),
    (41, 'db/hive_lattice_v4.sql',                    'hive_cells + hive_bonds + hive_map()',
         to_regclass('public.hive_cells') is not null
         and to_regclass('public.hive_bonds') is not null
         and pg_temp.has_fn('hive_map')),
    (42, 'db/daily_questions.sql',                    'daily_questions + question_tally()',
         to_regclass('public.daily_questions') is not null and pg_temp.has_fn('question_tally')),
    (43, 'db/hive_slot_codes_v5.sql',                 'hive_slot_offers + hive_claim_slot()',
         to_regclass('public.hive_slot_offers') is not null and pg_temp.has_fn('hive_claim_slot'))
)
select
  case when var then '✓ VAR' else '✗ EKSİK' end as durum,
  dosya,
  aranan
from checks
order by var, sira;
