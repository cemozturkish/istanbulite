// tdk — a relay to TDK's Güncel Türkçe Sözlük for instagram.html.
//
// sozluk.gov.tr/gts does not let a browser on another site read its answer
// (no CORS header), so the Instagram templates ask this function instead and
// it asks TDK. It forwards the answer unchanged: an array of entries, or
// { "error": "Sonuç bulunamadı" } when the word is not in the dictionary.
//
// Deployed with "Verify JWT" ON: only a signed-in member can use it, so it is
// not an open proxy. It reads nothing and writes nothing in the database.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // The word comes as ?ara=… or as { "word": … } in a POST body.
  let word = new URL(req.url).searchParams.get('ara') ?? '';
  if (!word && req.method === 'POST') {
    try { word = String((await req.json()).word ?? ''); } catch { /* no body */ }
  }
  word = word.trim().toLocaleLowerCase('tr-TR');
  // A dictionary word and nothing else: Turkish letters, a space or a hyphen.
  if (!/^[a-zçğıöşüâîû -]{1,40}$/.test(word)) return json({ error: 'bad_word' }, 400);

  try {
    const r = await fetch('https://sozluk.gov.tr/gts?ara=' + encodeURIComponent(word), {
      headers: { Accept: 'application/json' },
    });
    const body = await r.text();
    return new Response(body, {
      status: r.ok ? 200 : 502,
      headers: {
        ...CORS,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return json({ error: 'unreachable' }, 502);
  }
});
