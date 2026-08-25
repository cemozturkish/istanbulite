-- =====================================================================
-- Kütüphane — OLAYLAR: the starting set.
--
-- Four olaylar and the moments that are beyond dispute about them. It is
-- deliberately thin: an olay earns its page by being kept, and the point
-- of the admin portal's Olaylar tab is that the chain grows there, in
-- the admin's own words, as the thing develops. What is seeded here is
-- the spine -- dates nobody argues about -- so the page is never empty
-- on the day it ships.
--
-- Verify and extend from the portal before showing anyone. A timeline is
-- an editorial object, and this file is only its first draft.
--
-- Requires db/world_events.sql. Run in Supabase SQL editor. Idempotent.
-- =====================================================================

-- paper_x / paper_y (db/world_events_v3_paper.sql) is where the olay's
-- paper hangs on the board, in the map's own 1080x1920 frame. Only the
-- ones with a drawing carry it: the rest have no line running to
-- anywhere yet, so their paper falls back to hanging over their
-- countries until somebody picks a spot in the portal.
--
-- color (db/world_events_v4_color.sql) is sampled straight off each
-- drawing's own ink, so the paper's pin matches the string that was
-- actually drawn instead of defaulting every olay to the same red. The
-- one without a drawing yet carries null -- the site's red until
-- somebody draws it and picks a colour to match.
insert into public.world_events
  (id, name_tr, blurb, parties, status, started_on, sort_order, paper_x, paper_y, color) values
  ('rusya-ukrayna-savasi', 'Rusya–Ukrayna Savaşı',
   'Avrupa''nın İkinci Dünya Savaşı''ndan bu yana gördüğü en büyük savaş — ve İstanbul''un iki kez masayı kurduğu yer.',
   'Rusya · Ukrayna', 'ongoing', '2014-02-20', 100,
   -- assets/olaylar/rusya-ukrayna-savasi.png: four strokes fanning out of
   -- Rusya -- to Ukrayna, to the Kafkasya, to the Hazar, and down to
   -- Suriye. The paper hangs at the Ukrayna end of that fan, so the
   -- string runs out of the note and into Rusya rather than the note
   -- sitting off on its own.
   478, 155,
   -- Sampled off the drawing's own ink.
   '#557c94'),

  -- assets/olaylar/gazze.png: one stroke off the Gazze coast, run
  -- south-west across Sina into the empty desert. The paper hangs at that
  -- far end, so the string runs out of the note and back up into Gazze.
  ('gazze', 'Gazze',
   'Bir yılı aşan bombardıman, bir açlık ve bir soykırım davası. Bölgedeki her dosyanın üstünden geçtiği yer.',
   'İsrail · Filistin', 'ongoing', '2023-10-07', 90, 406, 1412,
   -- Sampled off the drawing's own ink.
   '#4c8059'),

  -- assets/olaylar/iran-abd.png: six strokes fanning between İran and
  -- İsrail across the Levant. The paper hangs at the İran end of that
  -- fan -- the open end, out over the Körfez -- so the strings run out
  -- of the note and west into İsrail rather than piling on the coast.
  ('iran-abd', 'İran ve ABD',
   'Kırk yıllık husumetin nükleer bir dosyaya, oradan da doğrudan vuruşlara dönüşmesi.',
   'İran · ABD · İsrail', 'ongoing', '2015-07-14', 80, 1010, 950,
   -- Sampled off the drawing's own ink.
   '#7c7c7c'),

  ('suriye', 'Suriye''de Rejimin Düşüşü',
   'On üç yıllık savaşın on bir günde biten son perdesi — ve Türkiye''nin sınırındaki her şeyin yeniden kurulması.',
   'Suriye · Türkiye · Rusya · İran', 'ongoing', '2024-11-27', 70, null, null, null),

  -- The one with a drawing already made for it
  -- (assets/olaylar/dogu-akdeniz.png): Yunanistan, Kıbrıs ve İsrail, and
  -- the line run between them across the map.
  ('dogu-akdeniz', 'Doğu Akdeniz',
   'Bir denizin altındaki gaz, üstündeki sınırlar ve Türkiye''nin batısındaki en yeni hat.',
   'Yunanistan · Kıbrıs · İsrail · Türkiye · Mısır', 'ongoing', '2010-12-30', 60,
   -- Pinned on the Mediterranean just under Türkiye's southern coast, so
   -- the string runs up to it from Kıbrıs and İsrail rather than the note
   -- sitting down in the empty bottom of the map.
   250, 850,
   -- Sampled off the drawing's own ink.
   '#9f2e2b')
on conflict (id) do update set
  name_tr = excluded.name_tr,
  blurb = excluded.blurb,
  parties = excluded.parties,
  status = excluded.status,
  started_on = excluded.started_on,
  sort_order = excluded.sort_order,
  paper_x = excluded.paper_x,
  paper_y = excluded.paper_y,
  color = excluded.color;


-- The `parties` above are also what strings the pinboard together: two
-- olaylar sharing a party are tied by a labelled thread (see
-- worldEventThreads in kutuphane.html). These four give three threads --
-- İSRAİL between Gazze and İran ve ABD, RUSYA and İRAN out of Suriye --
-- which is the board saying, before a word is read, that the same few
-- countries keep turning up in different wars.
--
-- What the map lights behind an open olay. Only the drawn countries can
-- be here -- ABD is a party to one of these and is nowhere on the
-- artwork, which is exactly why `parties` above is plain text.
insert into public.world_event_countries (event_id, country) values
  ('rusya-ukrayna-savasi', 'ukraine'),
  ('rusya-ukrayna-savasi', 'russia'),
  ('gazze', 'palestine'),
  ('iran-abd', 'iran'),
  ('suriye', 'syria'),
  ('suriye', 'turkiye'),
  -- İsrail is a party to this one and is not a shape on the map, which is
  -- exactly why `parties` above is plain text.
  ('dogu-akdeniz', 'greece'),
  ('dogu-akdeniz', 'cyprus')
on conflict (event_id, country) do nothing;


-- ── The spines ───────────────────────────────────────────────────────
-- Keyed on (event_id, moment_date, title) by hand rather than by a
-- constraint, so re-running this file does not lay a second copy of the
-- same moment on a timeline the admin has since added to.
insert into public.world_event_moments (event_id, moment_date, title, body)
select v.event_id, v.moment_date, v.title, v.body
from (values
  ('rusya-ukrayna-savasi', date '2014-03-18', 'Rusya Kırım''ı ilhak etti', null),
  ('rusya-ukrayna-savasi', date '2014-04-06', 'Donbas''ta savaş başladı',
   'Doğu Ukrayna''da ayrılıkçı ilan edilen iki bölge, sekiz yıl sürecek bir cephe hattına dönüştü.'),
  ('rusya-ukrayna-savasi', date '2022-02-24', 'Rusya tam çaplı işgali başlattı', null),
  ('rusya-ukrayna-savasi', date '2022-03-29', 'İstanbul''da müzakere turu',
   'Dolmabahçe''de iki heyet aynı masaya oturdu. Görüşmelerden bir anlaşma çıkmadı.'),
  ('rusya-ukrayna-savasi', date '2022-07-22', 'Tahıl Koridoru İstanbul''da imzalandı',
   'Türkiye ve BM''nin arabuluculuğuyla Karadeniz''den tahıl sevkiyatının önü açıldı; koordinasyon merkezi İstanbul''da kuruldu.'),
  ('rusya-ukrayna-savasi', date '2023-07-17', 'Rusya tahıl anlaşmasından çekildi', null),

  -- Gazze's chapters reach back before the war the feed is reporting on:
  -- 2023 is not where this began, it is where the current chapter began,
  -- and a reader who only sees the last two years is missing the ones
  -- before it that explain them.
  ('gazze', date '1948-05-15', 'Nekbe: 700 binden fazla Filistinli yerinden edildi',
   'İsrail''in kuruluşuyla birlikte Filistinlilerin çoğu kendi topraklarından sürüldü ya da kaçtı; Gazze Şeridi''nin nüfusu büyük ölçüde bu mültecilerden oluştu.'),
  ('gazze', date '1967-06-10', 'Altı Gün Savaşı sonunda Gazze işgal edildi',
   'İsrail, Altı Gün Savaşı''nda Gazze Şeridi''ni, Batı Şeria''yı ve Sina''yı ele geçirdi. Gazze''nin İsrail işgali böyle başladı.'),
  ('gazze', date '2005-09-12', 'İsrail yerleşimcilerini ve askerini Gazze''den çekti',
   'Tek taraflı "ayrılma planı" Gazze''deki yerleşimleri boşalttı, ama hava, deniz ve sınır kontrolü İsrail''de kaldı.'),
  ('gazze', date '2007-06-14', 'Hamas Gazze''nin kontrolünü ele geçirdi, ablukası başladı',
   'Hamas''ın Fetih''i Gazze''den çıkarmasının ardından İsrail ve Mısır bölgeyi kara, deniz ve havadan abluka altına aldı — abluka bugün hâlâ sürüyor.'),
  ('gazze', date '2023-10-07', 'Hamas İsrail''e saldırdı',
   'Gazze''den başlatılan saldırıda 1.200''den fazla kişi öldürüldü, yüzlerce kişi rehin alındı.'),
  ('gazze', date '2023-10-27', 'İsrail kara harekâtını başlattı', null),
  ('gazze', date '2024-01-26', 'UAD''dan ara karar',
   'Uluslararası Adalet Divanı, Güney Afrika''nın soykırım başvurusunda İsrail''e soykırım eylemlerini önleme tedbirleri emretti.'),
  ('gazze', date '2025-01-19', 'Ateşkesin ilk aşaması yürürlüğe girdi', null),

  ('iran-abd', date '2015-07-14', 'Nükleer anlaşma imzalandı',
   'İran ile altı ülke arasındaki anlaşma, yaptırımların kaldırılması karşılığında nükleer programı sınırlandırdı.'),
  ('iran-abd', date '2018-05-08', 'ABD anlaşmadan çekildi', null),
  ('iran-abd', date '2020-01-03', 'Kasım Süleymani Bağdat''ta öldürüldü',
   'Kudüs Gücü komutanı bir ABD hava saldırısında öldürüldü; İran birkaç gün sonra Irak''taki ABD üslerini vurdu.'),
  ('iran-abd', date '2025-06-13', 'İsrail İran''a saldırı başlattı', null),
  ('iran-abd', date '2025-06-22', 'ABD nükleer tesisleri vurdu',
   'Fordo, Natanz ve İsfahan tesisleri hedef alındı — ABD''nin İran''a ilk doğrudan saldırısı.'),
  ('iran-abd', date '2025-06-24', 'Ateşkes ilan edildi', null),

  ('suriye', date '2011-03-15', 'Suriye''de ayaklanma başladı', null),
  ('suriye', date '2024-11-27', 'Halep''e doğru harekât başladı', null),
  ('suriye', date '2024-12-08', 'Şam düştü, Esad ülkeden ayrıldı',
   'On üç yıllık savaş, on bir gün süren bir harekâtın sonunda rejimin çöküşüyle bitti.'),

  ('dogu-akdeniz', date '2010-12-30', 'Leviathan sahası bulundu',
   'İsrail açıklarındaki büyük doğal gaz keşfi, Doğu Akdeniz''i bir enerji dosyası hâline getirdi.'),
  ('dogu-akdeniz', date '2019-11-27', 'Türkiye–Libya deniz yetki anlaşması imzalandı', null),
  ('dogu-akdeniz', date '2020-01-02', 'EastMed boru hattı anlaşması Atina''da imzalandı',
   'Yunanistan, Kıbrıs ve İsrail arasındaki anlaşma, üç ülkeyi tek bir hat olarak tarif etti.')
) as v(event_id, moment_date, title, body)
where not exists (
  select 1 from public.world_event_moments m
  where m.event_id = v.event_id
    and m.moment_date = v.moment_date
    and m.title = v.title
);
