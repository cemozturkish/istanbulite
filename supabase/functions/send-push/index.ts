// send-push — delivers what db/push_notifications.sql queued to APNs.
//
// Called every minute by pg_cron (db/push_notifications_cron.sql) while
// anything is due. It claims due rows (push_claim), sends each to every
// device its member has, and writes back sent / failed / no_device. A
// token Apple says is dead is deleted.
//
// Secrets (Edge Functions → Secrets):
//   APNS_KEY_P8       the .p8 key's full text, BEGIN/END lines included
//   APNS_KEY_ID       its 10-character Key ID
//   APNS_TEAM_ID      TJ67T5HY3Q
//   APNS_BUNDLE_ID    net.istanbulite.app
//   PUSH_CRON_SECRET  a random string, the same one put in the vault
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
//
// Deploy with JWT verification OFF (the cron call carries the secret
// header instead): `supabase functions deploy send-push --no-verify-jwt`.

import { createClient } from "jsr:@supabase/supabase-js@2";

type Row = {
  id: number;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  dedupe_key: string | null;
  expires_at: string;
};

const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`missing secret ${k}`);
  return v;
};

const HOSTS = {
  production: "https://api.push.apple.com",
  sandbox: "https://api.sandbox.push.apple.com",
};

// ── The provider token: an ES256 JWT, good for up to an hour ──
let jwtCache: { token: string; at: number } | null = null;
const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const b64urlJson = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));

async function providerToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (jwtCache && now - jwtCache.at < 45 * 60) return jwtCache.token;
  const pem = env("APNS_KEY_P8").replace(/\\n/g, "\n");
  const der = Uint8Array.from(
    atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")),
    (c) => c.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"],
  );
  const head = b64urlJson({ alg: "ES256", kid: env("APNS_KEY_ID") });
  const claims = b64urlJson({ iss: env("APNS_TEAM_ID"), iat: now });
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(`${head}.${claims}`),
  );
  const token = `${head}.${claims}.${b64url(sig)}`;
  jwtCache = { token, at: now };
  return token;
}

type Result = { ok: true } | { ok: false; dead: boolean; reason: string };

async function sendTo(host: string, token: string, row: Row): Promise<{ status: number; reason: string }> {
  const payload = {
    aps: {
      alert: { title: row.title, body: row.body },
      sound: "default",
      "thread-id": row.kind,
    },
    ...row.data,
  };
  const headers: Record<string, string> = {
    authorization: `bearer ${await providerToken()}`,
    "apns-topic": env("APNS_BUNDLE_ID"),
    "apns-push-type": "alert",
    "apns-priority": "10",
    "apns-expiration": String(Math.floor(new Date(row.expires_at).getTime() / 1000)),
  };
  if (row.dedupe_key) headers["apns-collapse-id"] = row.dedupe_key.slice(0, 64);
  const res = await fetch(`${host}/3/device/${token}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  let reason = "";
  if (res.status !== 200) {
    try { reason = (await res.json()).reason || ""; } catch { /* empty body */ }
  } else {
    await res.body?.cancel();
  }
  return { status: res.status, reason };
}

// Production first: App Store and TestFlight builds. A build run from
// Xcode holds a sandbox token, which production answers BadDeviceToken.
async function deliver(token: string, row: Row): Promise<Result> {
  let r = await sendTo(HOSTS.production, token, row);
  if (r.status === 200) return { ok: true };
  if (r.reason === "BadDeviceToken") {
    const s = await sendTo(HOSTS.sandbox, token, row);
    if (s.status === 200) return { ok: true };
    r = s;
  }
  const dead = r.status === 410 || r.reason === "BadDeviceToken" || r.reason === "Unregistered";
  return { ok: false, dead, reason: `${r.status} ${r.reason}`.trim() };
}

Deno.serve(async (req) => {
  if (req.headers.get("x-push-secret") !== env("PUSH_CRON_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }
  const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

  const { data: rows, error } = await sb.rpc("push_claim", { p_limit: 200 });
  if (error) return new Response(`claim: ${error.message}`, { status: 500 });
  const claimed = (rows || []) as Row[];
  if (!claimed.length) return Response.json({ sent: 0 });

  const userIds = [...new Set(claimed.map((r) => r.user_id))];
  const { data: toks, error: tErr } = await sb
    .from("push_tokens").select("token, user_id").in("user_id", userIds);
  if (tErr) return new Response(`tokens: ${tErr.message}`, { status: 500 });
  const byUser = new Map<string, string[]>();
  for (const t of toks || []) {
    const list = byUser.get(t.user_id) || [];
    list.push(t.token);
    byUser.set(t.user_id, list);
  }

  const dead = new Set<string>();
  let sent = 0, failed = 0, none = 0;

  // A few at a time: APNs is happy with many, the function's own limits less so.
  const queue = [...claimed];
  async function worker() {
    for (let row = queue.shift(); row; row = queue.shift()) {
      const tokens = byUser.get(row.user_id) || [];
      let status: string, err: string | null = null;
      if (!tokens.length) {
        status = "no_device"; none++;
      } else {
        const results = await Promise.all(tokens.map((tk) =>
          deliver(tk, row!).catch((e) => ({ ok: false, dead: false, reason: String(e) } as Result))
        ));
        results.forEach((r, i) => { if (!r.ok && r.dead) dead.add(tokens[i]); });
        if (results.some((r) => r.ok)) { status = "sent"; sent++; }
        else {
          status = "failed"; failed++;
          err = results.map((r) => (r.ok ? "" : r.reason)).filter(Boolean).join("; ").slice(0, 500);
        }
      }
      await sb.from("push_outbox").update({
        status, error: err, sent_at: status === "sent" ? new Date().toISOString() : null,
      }).eq("id", row.id);
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));

  if (dead.size) await sb.from("push_tokens").delete().in("token", [...dead]);
  return Response.json({ claimed: claimed.length, sent, failed, no_device: none, dead_tokens: dead.size });
});
