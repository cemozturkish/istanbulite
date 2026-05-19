// Edge Function: admin-create-user
//
// Invoked by the admin from admin.html. Sends a magic-link invite to a
// prospective user with all their profile metadata pre-attached.
// Supabase Auth creates the auth.users row, the handle_new_user trigger
// reads raw_user_meta_data and atomically inserts the matching profile
// (admin_created=true path, referred_by = admin).
//
// Deploy via the Supabase dashboard: Edge Functions -> Create new function
// named "admin-create-user" and paste this file's contents.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ADMIN_EMAIL = "cemwozturk@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Missing Supabase env vars" }, 500);
  }

  // Verify the caller is the admin using their JWT.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);
  if (user.email !== ADMIN_EMAIL) return json({ error: "Forbidden" }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const first_name = (body.first_name ?? "").toString().trim();
  const last_name = (body.last_name ?? "").toString().trim();
  const phone = (body.phone ?? "").toString().trim();
  const email = (body.email ?? "").toString().trim().toLowerCase();
  const neighborhood = (body.neighborhood ?? "").toString().trim();
  const birth_neighborhood = (body.birth_neighborhood ?? "").toString().trim();
  const birth_place_raw = (body.birth_place ?? "").toString().trim();

  if (
    !first_name || !last_name || !phone || !email ||
    !neighborhood || !birth_neighborhood
  ) {
    return json({ error: "Missing required fields" }, 400);
  }

  // Service-role client for the actual user creation.
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Invite by email — Supabase creates the auth.users row with this
  // metadata, fires handle_new_user, sends the magic-link email.
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        first_name,
        last_name,
        phone,
        neighborhood,
        birth_neighborhood,
        birth_place: birth_place_raw || null,
        admin_created: "true",
        referred_by_id: user.id, // admin's auth.users.id == admin's profile.id
      },
    },
  );

  if (error) return json({ error: error.message }, 400);
  return json({ ok: true, user_id: data.user.id });
});
