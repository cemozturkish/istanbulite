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
-- dokunuyorsa, önce onu çalıştırın. Aşağıdaki liste zaten o sırada —
-- ailelerin tamamı ve hangi dosyanın hangisinden sonra geldiği için
-- db/README.md'ye bakın.
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
    (19, 'db/coffee_comments.sql',                    'coffee_comments tablosu',
         to_regclass('public.coffee_comments') is not null),
    -- v3'ün eklediği kolonlar: hours + happy_* beşlisi. (Burada bir ara
    -- 'discount' aranıyordu; öyle bir kolon hiç olmadı, dolayısıyla bu
    -- satır migration çalıştırılmış olsa bile EKSİK diyordu.)
    (12, 'db/coffee_prices_v3_live.sql',              'coffee_prices.hours + happy_* kolonları',
         pg_temp.has_col('coffee_prices', 'hours')
         and pg_temp.has_col('coffee_prices', 'happy_price')
         and pg_temp.has_col('coffee_prices', 'happy_days')
         and pg_temp.has_col('coffee_prices', 'happy_start')
         and pg_temp.has_col('coffee_prices', 'happy_end')
         and pg_temp.has_col('coffee_prices', 'happy_label')),
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
    (24, 'db/seed/country_entries_seed.sql',               'country_entries içinde satır',
         pg_temp.rows_or_missing('public.country_entries') > 0),

    -- ── Ağustos 19–20: koltuklar ve hikâyeler ──
    (30, 'db/political_seats_v2_countries.sql',       'political_seats.country kolonu',
         pg_temp.has_col('political_seats', 'country')),
    (31, 'db/seed/political_seats_countries_seed.sql',     'ülke koltuğu satırları',
         pg_temp.rows_or_missing('public.political_seats', 'country is not null') > 0),
    (32, 'db/country_stories.sql',                    'country_stories tablosu',
         to_regclass('public.country_stories') is not null),
    (33, 'db/seed/country_stories_seed.sql',               'hikâyelerin girdileri (country_entries)',
         pg_temp.rows_or_missing('public.country_entries') > 5),

    -- ── Profil eklentileri, uygulama ayarları, mahalleler ──
    (1,  'db/avatar_hair.sql (+ v2)',                 'profiles.avatar_hair kolonu',
         pg_temp.has_col('profiles', 'avatar_hair')),
    (2,  'db/avatar_hat.sql / _accessory / _shirt',   'profiles.avatar_hat + avatar_shirt kolonları',
         pg_temp.has_col('profiles', 'avatar_hat') and pg_temp.has_col('profiles', 'avatar_shirt')),
    (3,  'db/profile_badges.sql',                     'profiles.cover_badges kolonu',
         pg_temp.has_col('profiles', 'cover_badges')),
    (4,  'db/onboarding.sql',                         'profiles.onboarded_at kolonu',
         pg_temp.has_col('profiles', 'onboarded_at')),
    (5,  'db/app_settings.sql',                       'app_settings tablosu',
         to_regclass('public.app_settings') is not null),
    (6,  'db/admin_notifications.sql (+ _reads)',     'admin_notifications + admin_notification_reads',
         to_regclass('public.admin_notifications') is not null
         and to_regclass('public.admin_notification_reads') is not null),
    (7,  'db/mahalles.sql',                           'mahalles tablosunda satır',
         pg_temp.rows_or_missing('public.mahalles') > 0),

    -- ── Etkinlikler, haberler, kütüphane ──
    (8,  'db/events.sql (+ event_rsvps)',             'events + event_rsvps',
         to_regclass('public.events') is not null and to_regclass('public.event_rsvps') is not null),
    (9,  'db/breaking_news.sql (+ sources/updates/series/archive)', 'breaking_news + breaking_news_updates',
         to_regclass('public.breaking_news') is not null
         and to_regclass('public.breaking_news_updates') is not null),
    (10, 'db/breaking_news_polls.sql',                'breaking_news_polls + poll_votes',
         to_regclass('public.breaking_news_polls') is not null
         and to_regclass('public.breaking_news_poll_votes') is not null),
    -- v2 çok seçenekli anketi getirir ve oyları kendi tablosuna taşır;
    -- v1'in tablosu yerinde kaldığı için ayrı satır olmak zorunda.
    (11, 'db/breaking_news_polls_v2.sql',             'breaking_news_poll_option_votes tablosu',
         to_regclass('public.breaking_news_poll_option_votes') is not null),
    (15, 'db/library_articles.sql (+ v2, v3, v6-v8)', 'library_articles.image_url kolonu',
         pg_temp.has_col('library_articles', 'image_url')),
    (16, 'db/library_categories_v4.sql',              'library_categories tablosu',
         to_regclass('public.library_categories') is not null),
    (17, 'db/library_shelves_v5.sql (+ v6)',          'library_shelves tablosu',
         to_regclass('public.library_shelves') is not null),
    (18, 'db/library_letters.sql (+ letter_reads)',   'library_letters tablosu',
         to_regclass('public.library_letters') is not null),

    -- ── Siyasetçiler, TBMM ──
    (25, 'db/politicians.sql',                        'politicians + political_seats',
         to_regclass('public.politicians') is not null
         and to_regclass('public.political_seats') is not null),
    (26, 'db/seed/istanbul_mayors_import.sql',        'ilçe koltuğu satırları',
         pg_temp.rows_or_missing('public.political_seats', 'neighborhood is not null') > 0),
    (27, 'db/tbmm_parties.sql (+ tbmm_seats)',        'tbmm_parties + tbmm_seats',
         to_regclass('public.tbmm_parties') is not null and to_regclass('public.tbmm_seats') is not null),
    (28, 'db/seed/tbmm_28_donem_import.sql',          'tbmm_seats içinde satır',
         pg_temp.rows_or_missing('public.tbmm_seats') > 0),

    -- ── Oyunlar ──
    (34, 'db/game_results.sql (+ v2_guesses)',        'game_results.guesses kolonu',
         pg_temp.has_col('game_results', 'guesses')),
    (35, 'db/sozcel_sozcul_assignments.sql',          'sozcel_sozcul_assignments tablosu',
         to_regclass('public.sozcel_sozcul_assignments') is not null),
    (36, 'db/sozcel_used_answers_v4_syllables.sql',   'sozcel_used_answers.syllables kolonu',
         pg_temp.has_col('sozcel_used_answers', 'syllables')),
    (37, 'db/tumcel_puzzles.sql (+ quote_suggestions)', 'tumcel_puzzles + tumcel_quote_suggestions',
         to_regclass('public.tumcel_puzzles') is not null
         and to_regclass('public.tumcel_quote_suggestions') is not null),
    (38, 'db/quotes.sql',                             'quotes tablosu',
         to_regclass('public.quotes') is not null),

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
