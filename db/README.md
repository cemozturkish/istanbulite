# `db/` — Supabase migrasyonları

Bu klasör, siteyi çalıştıran Supabase şemasının **migrasyon geçmişi**. Her dosya
Supabase SQL editöründe elle çalıştırılıyor; hepsi **idempotent** (yanlışlıkla
ikinci kez çalıştırmak bir şeyi bozmaz).

**Önce şunu bilin:** klasör baştan sona bir veritabanı kuramaz. Kuruluş şeması —
`profiles`, `neighborhoods`, `articles`, `neighborhood_comments`,
`article_comments` ve `is_admin()`, `handle_new_user()`, `verify_kefil_code()`
gibi çekirdek fonksiyonlar — hiçbir zaman buraya yazılmadı, yalnızca Supabase'de
duruyor. Buradaki dosyalar o temelin **üstüne** gelenler.

## Ne nerede

```
db/
├── README.md                 ← bu dosya
├── check_migrations.sql      ← "hangisi çalıştırıldı?" — hiçbir şeyi değiştirmez
├── *.sql                     ← şema: tablolar, kolonlar, RLS, fonksiyonlar
└── seed/                     ← tek seferlik veri: importlar ve düzeltmeler
```

`seed/` altındakiler şema değil, **veri**: bir kez çalıştırılır, sonra bir daha
dokunulmaz. Şema dosyalarından ayrı durmalarının sebebi de bu — biri neyin nasıl
kurulduğunu okumak için açılır, diğeri bir kere koşturulup unutulur.

## Ne çalıştırılmış, ne eksik

`check_migrations.sql`'i Supabase SQL editöründe çalıştırın: her dosyanın geride
bıraktığı ana nesneye bakıp dosya dosya `✓ VAR` / `✗ EKSİK` basar, hem de
çalıştırılmaları gereken sırayla. Hiçbir şey oluşturmaz, değiştirmez, silmez.

## Aileler ve sıra

Aynı ailedeki dosyalar **numara sırasıyla** çalıştırılır: sonrakiler öncekinin
tablosunu `alter` eder, politikasını değiştirir ya da fonksiyonunu değiştirir.
Kalın yazılmış olan, o ailenin **bugünkü** hâlidir; öncekiler tarihtir ama sıfırdan
kurarken yine de sırayla gerekir.

| Aile | Sıra |
|---|---|
| Profil eklentileri | `avatar_hair` → `avatar_hair_v2`, `avatar_hat`, `avatar_accessory`, `avatar_shirt`, `profile_badges` |
| Uygulama ayarları | `onboarding`, `app_settings`, `admin_notifications` → `admin_notification_reads` |
| Mahalleler | `mahalles` |
| Etkinlikler | `events` → `event_rsvps` |
| Haberler | `breaking_news` → `breaking_news_sources`, `breaking_news_updates`, `breaking_news_series`, `breaking_news_archive`, `breaking_news_polls` → **`breaking_news_polls_v2`**, `breaking_news_countries` |
| Kütüphane | `library_articles` → `library_articles_v2` → `library_articles_v3` → `library_categories_v4` → `library_shelves_v5` → `library_shelves_v6_unlimited` → `library_articles_v6_image` → `library_articles_v7_inline_images` → **`library_articles_v8_source_nullable`**; ayrıca `library_letters` → `library_letter_reads` |
| Ülkeler | `country_entries` → `country_entry_events` → `country_stories` (+ `seed/country_entries_seed`, `seed/country_stories_seed`) |
| Siyasetçiler | `politicians` → **`political_seats_v2_countries`** (+ `seed/istanbul_mayors_import`, `seed/tbmm_28_donem_import`, `seed/politicians_birth_info`, `seed/politicians_dedupe_and_uppercase`, `seed/political_seats_countries_seed`) |
| TBMM | `tbmm_parties`, `tbmm_seats` |
| Kahve Endeksi | `coffee_prices` → `coffee_prices_v2_admin_only` → **`coffee_prices_v3_live`**; ayrıca `coffee_comments` |
| Oyunlar | `game_results` → **`game_results_v2_guesses`**; `game_day_toggles`, `daily_questions`, `sozcel_sozcul_assignments`, `tumcel_puzzles`, `tumcel_quote_suggestions`, `quotes` |
| Sözcel'in günün kelimesi | `sozcel_used_answers` → `_v2` → `_v3_fix_insert_rls` → `_v4_syllables` → `_v5_server_pick` → **`_v6_admin_override`** |
| Petek | `hive_slots` → `hive_slots_v2_sunday_week` → `hive_slots_v3_mutual_permanent` → `hive_lattice_v4` → **`hive_slot_codes_v5`** |

## Petek zinciri hakkında bir not

Bu ailede "eski" dosyalar tümüyle ölü değil, o yüzden silinmediler:

- `hive_slots.sql` altı slotlu tasarımı kurar (v4 emekli etti) **ama**
  `hive_week_start()` fonksiyonunu da o tanımlar ve o fonksiyon hâlâ canlı —
  bir bağın hangi haftaya kilitlendiğini v5 onunla hesaplıyor.
- `hive_slots_v2_sunday_week.sql` o haftayı pazara çeker; hâlâ geçerli.
- `hive_lattice_v4.sql`'in en altındaki migration bloğu eski `hive_slots`
  satırlarını yeni ızgaraya yerleştirir — yani sıfırdan kurarken v1'in tablosu
  var olmalı, boş olsa bile.

Aynı mantık `coffee_prices` ve `library_articles` zincirleri için de geçerli:
sonraki dosyalar öncekinin tablosunu `alter` eder, tek başına çalışmazlar.

## Yeni bir migration yazarken

- **Idempotent olsun.** `create table if not exists`, `add column if not exists`,
  `drop policy if exists` + `create policy`, `create or replace function`.
- **Başına ne yaptığını ve neden yaptığını yazın.** Buradaki dosyalar aynı zamanda
  o kararın gerekçesinin durduğu yer; şemanın nasıl olduğu kadar neden öyle
  olduğu da burada okunuyor.
- **Bir aileye ekliyorsanız numarayı sürdürün** (`_v7_...`), yeni bir şeyse düz
  isim verin.
- **`check_migrations.sql`'e bir satır ekleyin**, yoksa çalıştırılıp
  çalıştırılmadığı bir daha anlaşılmaz.
- RLS'i kapatmayın, servis anahtarını istemciye koymayın (bkz. CLAUDE.md →
  Security Notes).
