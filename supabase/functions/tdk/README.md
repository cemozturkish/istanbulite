# tdk — kurulum

`instagram.html`'in Sözcük postu kelimenin türünü, kökenini ve anlamını TDK'nin
Güncel Türkçe Sözlük'ünden (`sozluk.gov.tr/gts`) alır. TDK, başka bir siteden
tarayıcıyla okunmasına izin vermediği için sayfa bu fonksiyon üzerinden sorar;
fonksiyon TDK'nin cevabını olduğu gibi geri verir. Veritabanında hiçbir şey
okumaz ve yazmaz.

## Deploy

Dashboard → Edge Functions → **Deploy a new function** → adı `tdk`, içeriği
`index.ts`. **Verify JWT açık kalsın**: yalnızca giriş yapmış bir üye
kullanabilsin, herkese açık bir aracı olmasın.

CLI ile: `supabase functions deploy tdk --project-ref fgxispjoiynnoqitwpks`

Secret gerekmez.

## Deneme

instagram.html'de giriş yapıp "Verilerden doldur"a bas. Durum satırında
"TDK'ye ulaşılamadı" yazmıyorsa çalışıyor demektir.
