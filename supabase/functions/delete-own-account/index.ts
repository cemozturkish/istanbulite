// delete-own-account — Supabase Edge Function
//
// Apple Guideline 5.1.1(v): an app that supports account creation must let
// a member delete their own account from inside the app, not just point
// them at a support email. Deleting the auth.users row needs the service
// role key, which must never reach client code, so this function is the
// one place that key is used — and it only ever deletes the CALLER's own
// row, taken from their own JWT, never a target id the client could pass.
//
// Not deployed automatically — this repo has no Supabase CLI project
// linked (see the codebase's own db/*.sql convention: migrations are kept
// here as the source of truth, but applied by hand in the Supabase SQL
// editor). Deploy this the same way: `supabase functions deploy
// delete-own-account`, or paste it into the dashboard's Edge Functions
// editor, from a project where SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are
// already available as function secrets (Supabase sets these
// automatically for every project).
//
// profiles.id is FK'd to auth.users.id with `on delete cascade` (see
// CLAUDE.md's schema section), so deleting the auth user takes the
// profile with it in one step. Any OTHER table that references
// profiles.id (neighborhood_comments.author_id, coffee_comments.author_id,
// hive_cells.user_id, game_results, etc.) needs the same `on delete
// cascade` on its own FK, or this call fails with a foreign-key violation
// instead of silently leaving orphaned rows — worth a one-time check in
// the SQL editor (`select conname, confdeltype from pg_constraint where
// confrelid = 'public.profiles'::regclass;` — confdeltype should be 'c'
// for every row) before this ships.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'missing bearer token' }), { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Resolves the caller's own id from their JWT -- this is what makes it
  // safe for the function to have service-role power: the id being
  // deleted is never taken from the request body, so there is no way for
  // one member to delete another's account through this endpoint.
  const { data: { user }, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'invalid session' }), { status: 401 });
  }

  const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
  if (deleteErr) {
    return new Response(JSON.stringify({ error: deleteErr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
