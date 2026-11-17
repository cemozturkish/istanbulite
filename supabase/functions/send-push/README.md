# send-push — kurulum

Bildirimleri Apple'a (APNs) ileten Edge Function. Veritabanı tarafı
`db/push_notifications.sql`, zamanlayıcılar `db/push_notifications_cron.sql`.
Sırasıyla, bir kez:

## 1. APNs anahtarı (Apple Developer)

developer.apple.com → Certificates, Identifiers & Profiles → **Keys** → "+" →
bir ad ver, **Apple Push Notifications service (APNs)** kutusunu işaretle →
Continue → Register → **.p8 dosyasını indir** (yalnızca bir kez indirilebilir).
Sayfadaki **Key ID**'yi (10 karakter) not et.

Ayrıca Identifiers → `net.istanbulite.app` → **Push Notifications** açık olmalı
(Xcode otomatik imzalama bunu kendisi de açar).

## 2. Veritabanı

Supabase SQL editöründe `db/push_notifications.sql`.

## 3. Function'ı deploy et

Dashboard → Edge Functions → **Deploy a new function** → adı `send-push`,
içeriği `index.ts`. Function'ın ayarlarında **Verify JWT** kapalı olmalı
(cron çağrısı JWT değil, `x-push-secret` taşır).

CLI ile: `supabase functions deploy send-push --no-verify-jwt --project-ref fgxispjoiynnoqitwpks`

## 4. Secrets

Edge Functions → Secrets:

| Ad | Değer |
|---|---|
| `APNS_KEY_P8` | .p8 dosyasının tamamı, BEGIN/END satırlarıyla |
| `APNS_KEY_ID` | 1. adımdaki Key ID |
| `APNS_TEAM_ID` | `TJ67T5HY3Q` |
| `APNS_BUNDLE_ID` | `net.istanbulite.app` |
| `PUSH_CRON_SECRET` | rastgele uzun bir dize (ör. `openssl rand -hex 32`) |

## 5. Zamanlayıcılar

Database → Extensions: **pg_cron** ve **pg_net**'i aç. SQL editöründe, aynı
rastgele dizeyle:

```sql
select vault.create_secret('<PUSH_CRON_SECRET ile aynı>', 'push_cron_secret');
```

sonra `db/push_notifications_cron.sql`.

## 6. Dene

Uygulamanın push destekli sürümünü (1.03+) telefonda yönetici hesabıyla aç,
bildirim iznini ver. admin.html → **Bildirimler** → "Kendime deneme gönder".
Bir dakika içinde gelmeli; gelmezse "Son Bildirimler"de satırın hatası yazar
(`403 InvalidProviderToken` → Key ID / Team ID / .p8 yanlış;
`400 DeviceTokenNotForTopic` → bundle id yanlış).

Xcode'dan doğrudan çalıştırılan build sandbox token'ı verir; function önce
production'ı, `BadDeviceToken` alırsa sandbox'ı dener, yani ikisi de çalışır.
