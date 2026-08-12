-- =====================================================================
-- coffee_comments — what members say about a venue on the Kahve Endeksi.
--
-- The index itself stays admin-curated (only the admin sets a price, an
-- opening schedule or a discount — see coffee_prices_v2_admin_only.sql
-- and coffee_prices_v3_live.sql). This is the members' half: clicking a
-- venue on the board in Kahvehane opens its detail panel, and anyone
-- signed in can leave a note about the coffee there.
--
-- Deliberately NOT gated on the commenter's own district, unlike
-- neighborhood_comments. That gate exists so a district's discussion
-- feed belongs to the people who live there; a note about a café is the
-- opposite case — it is worth most from someone who actually went, and
-- going somewhere else in the city is the behaviour the app is trying to
-- encourage in the first place. Rate of abuse here is bounded by the
-- referral gate on accounts.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.coffee_comments (
  id         uuid        primary key default gen_random_uuid(),
  -- Deleting a venue from the index takes its comments with it.
  coffee_id  uuid        not null references public.coffee_prices(id) on delete cascade,
  author_id  uuid        not null references public.profiles(id) on delete cascade,
  body       text        not null,
  created_at timestamptz not null default now(),
  constraint coffee_comments_body_len
    check (char_length(btrim(body)) between 1 and 1000)
);

-- The only read pattern: one venue's comments, newest first.
create index if not exists coffee_comments_coffee_idx
  on public.coffee_comments (coffee_id, created_at desc);

alter table public.coffee_comments enable row level security;

-- Every member reads every venue's comments.
drop policy if exists "coffee_comments read for authenticated" on public.coffee_comments;
create policy "coffee_comments read for authenticated"
  on public.coffee_comments for select
  to authenticated
  using (true);

-- Post only as yourself. No district gate (see the header note).
drop policy if exists "coffee_comments insert own" on public.coffee_comments;
create policy "coffee_comments insert own"
  on public.coffee_comments for insert
  to authenticated
  with check (author_id = auth.uid());

-- Delete your own; the admin may delete any. Same shape as
-- neighborhood_comments.
drop policy if exists "coffee_comments delete own or admin" on public.coffee_comments;
create policy "coffee_comments delete own or admin"
  on public.coffee_comments for delete
  to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- No edits, matching every other comment table on the site: a posted
-- comment is a posted comment. Admin-only UPDATE for moderation.
drop policy if exists "coffee_comments update admin only" on public.coffee_comments;
create policy "coffee_comments update admin only"
  on public.coffee_comments for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
