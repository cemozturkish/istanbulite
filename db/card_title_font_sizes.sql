-- =====================================================================
-- card_title_font_sizes — admin-editable font size for a card's own
-- headline, one row per kind of card project.html casts (see "What each
-- screen carries" in CLAUDE.md): Haberler, Etkinlikler, Anket, Oyunlar.
--
-- One row per kind rather than one global number, because the four
-- columns' headlines are not the same thing at the same size on purpose
-- (Oyunlar's own .fb-oyun .t is a game NAME, not a news headline, and
-- already stands at a different size in the stylesheet) — a single knob
-- would force them to move together. size_px is read by project.html
-- and written onto :root as --fb-title-size-<kind>, which the card CSS
-- falls back to its own hardcoded rem size when the row (or the fetch)
-- is missing, so a database that has not run this migration renders
-- exactly as it did before it existed.
--
-- Managed from admin.html (see the "Görünüm" panel in its Baskı/desk
-- section). Run this in the Supabase SQL editor. It's idempotent.
-- =====================================================================

create table if not exists public.card_title_font_sizes (
  kind        text primary key,
  size_px     numeric not null,
  updated_by  uuid references public.profiles(id),
  updated_at  timestamptz not null default now()
);

insert into public.card_title_font_sizes (kind, size_px) values
  ('haberler', 13.12),
  ('etkinlikler', 13.12),
  ('anket', 13.12),
  ('oyunlar', 18.4)
on conflict (kind) do nothing;

alter table public.card_title_font_sizes enable row level security;

-- Every signed-in member reads it -- project.html applies it on every mount.
drop policy if exists "card_title_font_sizes read for authenticated" on public.card_title_font_sizes;
create policy "card_title_font_sizes read for authenticated"
  on public.card_title_font_sizes for select
  to authenticated
  using (true);

-- Only the admin edits it.
drop policy if exists "card_title_font_sizes admin manage" on public.card_title_font_sizes;
create policy "card_title_font_sizes admin manage"
  on public.card_title_font_sizes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
