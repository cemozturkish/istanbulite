-- =====================================================================
-- onboarding_copy — admin-editable overrides for the lane tour's speech
-- (onboarding.js, COPY.lanes). One row per beat key, both languages.
--
-- onboarding.js fetches the whole table once per run and lays it over its
-- own hardcoded COPY.lanes[lang], key for key (see laneCopy()) -- a
-- missing table, a missing row, or an empty field all fall back to the
-- hardcoded default exactly as if this table did not exist. Managed from
-- admin.html's Users tab, in the same "Onboarding" panel as the on/off
-- switch (app_settings.onboarding_enabled).
--
-- The key set mirrors the beats array in onboarding.js's stepTour() —
-- adding a beat there means adding a row here (seeded with its current
-- hardcoded text, so the admin always starts from what is actually
-- showing, never a blank field).
--
-- Run this in Supabase SQL editor. It's idempotent.
-- =====================================================================

create table if not exists public.onboarding_copy (
  key         text primary key,
  body_tr     text,
  body_en     text,
  updated_by  uuid references public.profiles(id),
  updated_at  timestamptz not null default now()
);

insert into public.onboarding_copy (key, body_tr, body_en) values
  ('reveal',      'Burası Hane — uygulamanın ortası. Her yere buradan, parmağınla gidiliyor.',
                  'This is Hane — the middle of the app. Everywhere else is a finger away from here.'),
  ('avatarIntro', 'Öncelikle, senin avatarını yaratalım.',
                  'First, let''s create your avatar.'),
  ('pickHair',    'Saçını seç. Beğenince devam et.',
                  'Pick your hair. Continue once you like it.'),
  ('pickShirt',   'Tişörtünü seç. Beğenince devam et.',
                  'Pick your shirt. Continue once you like it.'),
  ('senDone',     'Geri kalanı — şapkalar, rozetler — dışarıda kazanılır. Satın alınamaz.',
                  'The rest of it — hats, badges — is earned outside. It cannot be bought.'),
  ('toNear',      'Şimdi yukarı kaydır.',
                  'Now pull up.'),
  ('near',        'Bu petek. Şu an sadece sen varsın. Biri sana kendi kodunu verdiğinde, yanındaki boş yerlerden birine oturur — gerçek hayatta, yüz yüze.',
                  'This is the petek. Right now it is only you. When somebody gives you their code they take one of the empty places beside you — in person, face to face.'),
  ('toAll',       'Bir kere daha yukarı kaydır.',
                  'Pull up once more.'),
  ('petekAll',    'Bütün petek bu. Sen sadece kendi altı komşununla değil, koca şehirle aynı ağdasın.',
                  'This is the whole petek. You are not just connected to your own six neighbours — you are on the same network as the whole city.'),
  ('twoSides',    'İstanbul Avrupa ve Anadolu yakası diye ikiye ayrılır. İstanbulite de öyle — sağda Kahvehane, solda Kütüphane.',
                  'Istanbul splits into a European side and an Anatolian side. Istanbulite splits the same way — Kahvehane on the right, Kütüphane on the left.'),
  ('toKahve',     'Kahvehane sağda. Parmağını sola kaydır.',
                  'Kahvehane is to the right. Pull your finger left.'),
  ('events',      'Etkinlikler. Bunlar internette değil, dışarıda. Beğendiğin Hane''de seni bekler.',
                  'Events. These happen outside, not in here. The ones you keep wait for you on Hane.'),
  ('games',       'Üç oyun, her gün yeni. Sırayla açılır.',
                  'Three games, new every day. They unlock in order.'),
  ('toKutup',     'Kütüphane en solda. Sağa kaydır, Hane''den geçip devam et.',
                  'Kütüphane is all the way left. Pull right, past Hane, and keep going.'),
  ('news',        'Haberler. İstanbul, Türkiye ve Dünya — günde bir avuç, bitince biter.',
                  'The news. İstanbul, Türkiye and Dünya — a handful a day, and then it is done.'),
  ('anket',       'Anket. Cevabın kendi ilçenin altına yazılır, yani sonuç tek bir yüzde değil — yirmi beş tane.',
                  'The poll. Your answer is filed under your own district, so the result is not one percentage — it is twenty-five.'),
  ('toHane',      'Hane''ye dönelim. Sola kaydır.',
                  'Back to Hane. Pull left.')
on conflict (key) do nothing;

alter table public.onboarding_copy enable row level security;

-- Every authenticated reader needs this (onboarding.js runs for the
-- brand-new account itself, not the admin).
drop policy if exists "onboarding_copy read for authenticated" on public.onboarding_copy;
create policy "onboarding_copy read for authenticated"
  on public.onboarding_copy for select
  to authenticated
  using (true);

-- Only admin edits the tour's own words.
drop policy if exists "onboarding_copy admin manage" on public.onboarding_copy;
create policy "onboarding_copy admin manage"
  on public.onboarding_copy for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
