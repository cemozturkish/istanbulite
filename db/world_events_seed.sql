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

insert into public.world_events
  (id, name_tr, blurb, parties, status, started_on, sort_order) values
  ('rusya-ukrayna-savasi', 'Rusya–Ukrayna Savaşı',
   'Avrupa''nın İkinci Dünya Savaşı''ndan bu yana gördüğü en büyük savaş — ve İstanbul''un iki kez masayı kurduğu yer.',
   'Rusya · Ukrayna', 'ongoing', '2014-02-20', 100),

  ('gazze', 'Gazze',
   'Bir yılı aşan bombardıman, bir açlık ve bir soykırım davası. Bölgedeki her dosyanın üstünden geçtiği yer.',
   'İsrail · Filistin', 'ongoing', '2023-10-07', 90),

  ('iran-abd', 'İran ve ABD',
   'Kırk yıllık husumetin nükleer bir dosyaya, oradan da doğrudan vuruşlara dönüşmesi.',
   'İran · ABD · İsrail', 'ongoing', '2015-07-14', 80),

  ('suriye', 'Suriye''de Rejimin Düşüşü',
   'On üç yıllık savaşın on bir günde biten son perdesi — ve Türkiye''nin sınırındaki her şeyin yeniden kurulması.',
   'Suriye · Türkiye', 'ongoing', '2024-11-27', 70)
on conflict (id) do update set
  name_tr = excluded.name_tr,
  blurb = excluded.blurb,
  parties = excluded.parties,
  status = excluded.status,
  started_on = excluded.started_on,
  sort_order = excluded.sort_order;


-- What the map lights behind an open olay. Only the drawn countries can
-- be here -- ABD is a party to one of these and is nowhere on the
-- artwork, which is exactly why `parties` above is plain text.
insert into public.world_event_countries (event_id, country) values
  ('rusya-ukrayna-savasi', 'ukraine'),
  ('rusya-ukrayna-savasi', 'russia'),
  ('gazze', 'palestine'),
  ('iran-abd', 'iran'),
  ('suriye', 'syria'),
  ('suriye', 'turkiye')
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
   'On üç yıllık savaş, on bir gün süren bir harekâtın sonunda rejimin çöküşüyle bitti.')
) as v(event_id, moment_date, title, body)
where not exists (
  select 1 from public.world_event_moments m
  where m.event_id = v.event_id
    and m.moment_date = v.moment_date
    and m.title = v.title
);
