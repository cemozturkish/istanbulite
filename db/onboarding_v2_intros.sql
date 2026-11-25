-- =====================================================================
-- onboarding_v2_intros — which first-time intros a member has been shown
--
-- The onboarding is no longer a tour. A new member does whatever they
-- like, and the FIRST time they reach something (the petek, the city,
-- the games, a game, an evening, the whole petek, ...) onboarding.js
-- shows one small card about it. This column is the list of the cards
-- already shown, so a second device does not show them again.
--
-- null  = the account never had intros (it went through the old tour, or
--         joined before this): it is shown none.
-- '{}'  = written on an account's first launch: intros are on, none seen.
--
-- The client keeps its own copy in localStorage (ist_intro_<uid>) and
-- works without this column; it only adds the cross-device memory.
-- Members already UPDATE their own profiles row, and
-- protect_profile_columns does not touch this column.
--
-- Run this in Supabase SQL editor. It's idempotent.
-- =====================================================================

alter table public.profiles
  add column if not exists intro_seen text[];
