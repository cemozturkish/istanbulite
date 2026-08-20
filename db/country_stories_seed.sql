-- =====================================================================
-- Kütüphane — Hikâyelerin eksik yarısı (seed).
--
-- db/country_entries_seed.sql gave six countries a page each. Grouping
-- them into stories (db/country_stories.sql) exposed the gaps: the
-- İsrail cephesi had Filistin and Suriye but not Lübnan or İran, the
-- Karabağ hikâyesi was written entirely from Bakü's side, Yunanistan had
-- nothing at all next to Kıbrıs, and Türkiye -- the country the whole map
-- is drawn around -- had no page.
--
-- Five entries, one per missing country, each with its own Zaman Akışı.
-- They are filed under their own country, as every entry is; the story is
-- what puts them on the same page as the others.
--
-- Requires db/country_entries.sql, db/country_entry_events.sql and
-- db/country_stories.sql to have been run first.
--
-- Idempotent, and destructive in the same way the first seed is: an entry
-- is keyed by (country, title), so re-running replaces that entry and its
-- whole timeline. Run it once, then maintain these from admin.html's
-- Ülkeler tab.
--
-- Run in Supabase SQL editor.
-- =====================================================================

do $$
begin
  if to_regclass('public.country_entries') is null then
    raise exception 'Önce db/country_entries.sql çalıştırılmalı: public.country_entries tablosu yok.'
      using hint = 'Sıra: country_entries.sql -> country_entry_events.sql -> country_stories.sql -> country_stories_seed.sql';
  end if;
  if to_regclass('public.country_entry_events') is null then
    raise exception 'Önce db/country_entry_events.sql çalıştırılmalı: public.country_entry_events tablosu yok.'
      using hint = 'Sıra: country_entries.sql -> country_entry_events.sql -> country_stories.sql -> country_stories_seed.sql';
  end if;
  if to_regclass('public.country_stories') is null then
    raise exception 'Önce db/country_stories.sql çalıştırılmalı: public.country_stories tablosu yok.'
      using hint = 'Sıra: country_entries.sql -> country_entry_events.sql -> country_stories.sql -> country_stories_seed.sql';
  end if;
end $$;

create or replace function pg_temp.seed_country_entry(
  p_country text,
  p_title   text,
  p_body    text,
  p_events  jsonb
) returns void language plpgsql as $$
declare v_id uuid;
begin
  -- The events go with it: country_entry_events cascades on delete.
  delete from public.country_entries
   where country = p_country and title = p_title;

  insert into public.country_entries (country, title, body)
  values (p_country, p_title, p_body)
  returning id into v_id;

  insert into public.country_entry_events (entry_id, event_date, title, body)
  select v_id, (e->>'d')::date, e->>'t', nullif(e->>'b', '')
    from jsonb_array_elements(p_events) as e;
end;
$$;


-- ── LÜBNAN ───────────────────────────────────────────────────────────
select pg_temp.seed_country_entry(
  'lebanon',
  'Lübnan: Cephe ve Çöküş',
  E'Aynı anda iki şey oluyor: bir ülke ekonomik olarak çöküyor, ve o ülkenin güneyi başka birinin savaşının cephesi haline geliyor. İkisi ayrı ayrı anlatılabilir ama aynı yıllara denk geliyorlar.\n\nİstanbul için Lübnan uzak değil: Beyrut, Doğu Akdeniz''in bu şehre en çok benzeyen limanıydı.',
  '[
    {"d":"2006-07-12","t":"Otuz üç gün savaşı","b":"Hizbullah''ın sınır baskınıyla başlayan savaş binden fazla Lübnanlı sivilin ölümüyle ve BM''nin 1701 sayılı kararıyla sona erdi."},
    {"d":"2019-10-17","t":"Ekim ayaklanması","b":"WhatsApp aramalarına getirilen vergi bahaneydi; sokağa çıkan yüz binlerce kişi bütün siyasi sınıfın gitmesini istedi."},
    {"d":"2020-03-07","t":"Lübnan tarihinde ilk kez borcunu ödeyemedi","b":"Lira üç yılda değerinin %98''ini kaybetti, banka mevduatları fiilen donduruldu."},
    {"d":"2020-08-04","t":"Beyrut Limanı patlaması","b":"Altı yıldır depoda bekleyen 2.750 ton amonyum nitrat patladı: 200''den fazla ölü, şehrin yarısı hasarlı. Soruşturma yıllarca siyasi olarak engellendi."},
    {"d":"2023-10-08","t":"Güney cephesi açıldı","b":"Gazze savaşının ertesi günü Hizbullah sınır hattında ateş açtı; on bir ay boyunca iki taraftan yüz binlerce kişi evini terk etti."},
    {"d":"2024-09-17","t":"Çağrı cihazı saldırıları","b":"İki gün içinde binlerce telsiz ve çağrı cihazı aynı anda patlatıldı; savaş bütün ülkeye yayıldı."},
    {"d":"2024-09-27","t":"Hasan Nasrallah öldürüldü","b":"Hizbullah''ı otuz iki yıl yöneten lider Beyrut''un güneyindeki bir saldırıda hayatını kaybetti."},
    {"d":"2024-11-27","t":"Ateşkes yürürlüğe girdi","b":"Hizbullah''ın Litani''nin kuzeyine çekilmesi ve Lübnan ordusunun güneye konuşlanması öngörüldü."},
    {"d":"2025-01-09","t":"İki yıllık boşluktan sonra cumhurbaşkanı seçildi","b":"Ordu komutanı Joseph Aoun''un seçilmesiyle devletin başı iki yıldan uzun süredir ilk kez dolduruldu."}
  ]'::jsonb
);


-- ── İRAN ─────────────────────────────────────────────────────────────
select pg_temp.seed_country_entry(
  'iran',
  'İran–İsrail: Gölge Savaştan Açık Savaşa',
  E'Kırk yıl boyunca birbirine doğrudan tek kurşun sıkmayan iki ülke, iki yıl içinde birbirinin başkentini vurdu. Aradaki mesafeyi kapatan şey, ikisinin arasındaki ülkelerde olanlardı.\n\nBu sayfa nükleer dosyayla cephe hattının aynı hikâye olduğu yerde duruyor.',
  '[
    {"d":"1979-02-11","t":"İran Devrimi","b":"Şah devrildi; İsrail ile diplomatik ilişkiler kesildi, elçilik binası Filistin temsilciliğine verildi."},
    {"d":"2015-07-14","t":"Nükleer anlaşma imzalandı","b":"Altı büyük güçle varılan anlaşma zenginleştirmeyi sınırlandırıyor, yaptırımları kaldırıyordu."},
    {"d":"2018-05-08","t":"ABD anlaşmadan çekildi","b":"Yaptırımlar geri geldi; İran kademeli olarak sınırların dışına çıktı."},
    {"d":"2020-01-03","t":"Kasım Süleymani öldürüldü","b":"Kudüs Gücü komutanı Bağdat''ta bir ABD hava saldırısında öldürüldü; İran Irak''taki üsleri füzeyle vurdu."},
    {"d":"2022-09-16","t":"Mahsa Amini protestoları","b":"Gözaltında ölümünün ardından aylarca süren gösteriler ülkenin en geniş çaplı ayaklanmalarından biri oldu."},
    {"d":"2023-03-10","t":"Suudi Arabistan ile normalleşme","b":"Çin arabuluculuğunda yedi yıl sonra diplomatik ilişkiler yeniden kuruldu."},
    {"d":"2024-04-13","t":"İran ilk kez doğrudan saldırdı","b":"Şam''daki konsolosluğunun vurulmasına karşılık İsrail''e yüzlerce insansız hava aracı ve füze fırlatıldı; neredeyse tamamı düşürüldü."},
    {"d":"2024-10-01","t":"İkinci füze dalgası","b":"Nasrallah''ın öldürülmesinin ardından yaklaşık iki yüz balistik füze fırlatıldı; İsrail beş gün sonra askeri hedefleri vurarak karşılık verdi."},
    {"d":"2025-06-13","t":"On İki Gün Savaşı","b":"İsrail nükleer tesisleri, füze üslerini ve komuta kademesini hedef alan bir hava harekâtı başlattı; İran füzelerle karşılık verdi."},
    {"d":"2025-06-22","t":"ABD Fordo, Natanz ve İsfahan''ı vurdu","b":"Savaşa doğrudan giren Washington, İran''ın zenginleştirme tesislerini hedef aldı."},
    {"d":"2025-06-24","t":"Ateşkes","b":"On iki gün sonra çatışmalar durdu; nükleer dosya çözülmeden askıya alındı."}
  ]'::jsonb
);


-- ── ERMENİSTAN ───────────────────────────────────────────────────────
select pg_temp.seed_country_entry(
  'armenia',
  'Kapalı Sınır: Türkiye–Ermenistan',
  E'Türkiye''nin komşularıyla arasındaki en uzun süreli kapalı kapı. Otuz yılı aşkın süredir Kars ile Gümrü arasında bir tren yolu var ve üzerinden tren geçmiyor.\n\nKarabağ''daki her hareket bu kapıyı ya biraz aralıyor ya da yeniden mühürlüyor; ikisi ayrı dosya değil.',
  '[
    {"d":"1993-04-03","t":"Sınır kapatıldı","b":"Birinci Karabağ Savaşı''nda Kelbecer''in alınmasının ardından Türkiye kara sınırını kapattı; hâlâ kapalı."},
    {"d":"2009-10-10","t":"Zürih Protokolleri","b":"İki ülke diplomatik ilişki kurmayı ve sınırı açmayı kabul etti; hiçbir meclisten geçmedi, 2018''de resmen iptal edildi."},
    {"d":"2020-11-10","t":"İkinci Karabağ Savaşı bitti","b":"Bölgedeki dengenin değişmesi normalleşme başlığını yeniden açtı."},
    {"d":"2021-12-14","t":"Özel temsilciler atandı","b":"Ankara ve Erivan normalleşme görüşmeleri için temsilci belirledi; ilk tur Moskova''da yapıldı."},
    {"d":"2022-02-02","t":"Doğrudan uçuşlar yeniden başladı","b":"İstanbul–Erivan hattı iki yıl aradan sonra açıldı."},
    {"d":"2023-02-11","t":"Depremden sonra sınır bir kez açıldı","b":"Ermenistan''dan gelen yardım TIR''ları otuz yılda ilk kez Alican kapısından geçti."},
    {"d":"2023-06-03","t":"Paşinyan Ankara''ya geldi","b":"Ermenistan başbakanı, cumhurbaşkanının yemin törenine katılan konuklar arasındaydı."},
    {"d":"2025-08-08","t":"Washington bildirisi","b":"Azerbaycan ile barış bildirisi ve Nahçıvan bağlantısı üzerinde anlaşma, sınır dosyasını yeniden masaya getirdi."}
  ]'::jsonb
);


-- ── YUNANİSTAN ───────────────────────────────────────────────────────
select pg_temp.seed_country_entry(
  'greece',
  'Ege: Kayalıklar, Sular ve Ziyaretler',
  E'İki ülke arasında savaş çıkmadı ama neredeyse çıkacak anlar oldu; ve her seferinde arkasından bir yakınlaşma dönemi geldi. Ege''nin dosyası bu gel-gitin kendisi.\n\nİstanbul için bu en yakın komşu: bir saatlik uçuş, ortak bir mutfak, ve karşılıklı iki azınlığın hâlâ yaşadığı iki şehir.',
  '[
    {"d":"1955-09-06","t":"6–7 Eylül olayları","b":"İstanbul''da Rum, Ermeni ve Yahudi cemaatlerine ait binlerce ev ve iş yeri yağmalandı; şehrin Rum nüfusunun sonunu getiren süreç başladı."},
    {"d":"1974-07-20","t":"Kıbrıs harekâtı","b":"İki ülke arasındaki ilişkiler koptu; Yunanistan NATO''nun askeri kanadından çekildi."},
    {"d":"1996-01-28","t":"Kardak krizi","b":"İki kayalık yüzünden iki ordu karşı karşıya geldi; kriz üç günde ABD arabuluculuğuyla durduruldu."},
    {"d":"1999-08-17","t":"Deprem diplomasisi","b":"Marmara ve ardından Atina depremlerinde karşılıklı gönderilen ekipler ilişkileri yıllarca sürecek biçimde yumuşattı."},
    {"d":"2015-09-02","t":"Ege''de göç yolu","b":"Aylan Kurdi''nin fotoğrafı dünyaya yayıldı; bir milyondan fazla insanın geçtiği rota iki ülkeyi ortak bir krizin içine soktu."},
    {"d":"2020-08-10","t":"Doğu Akdeniz gerilimi","b":"Oruç Reis''in sismik araştırmaları sırasında iki donanma arasında bir çarpışma yaşandı; gerilim aylarca sürdü."},
    {"d":"2023-02-06","t":"Yunanistan''dan ilk kurtarma ekipleri","b":"Depremden saatler sonra gelen EMAK ekipleri, bir yıl sürecek normalleşmenin başlangıcı sayıldı."},
    {"d":"2023-12-07","t":"Atina Bildirgesi","b":"Erdoğan ve Miçotakis dostane ilişkiler bildirgesini imzaladı; vize kolaylığı ve düzenli üst düzey görüşmeler kararlaştırıldı."},
    {"d":"2024-05-13","t":"Ankara''da karşılık ziyareti","b":"Miçotakis''in ziyaretiyle iki ülke yüksek düzeyli işbirliği konseyini sürdürdü; Ege''deki temel anlaşmazlıklar yerinde duruyor."}
  ]'::jsonb
);


-- ── TÜRKİYE ──────────────────────────────────────────────────────────
select pg_temp.seed_country_entry(
  'turkiye',
  'Türkiye: Sistemin Değiştiği On Yıl',
  E'Haritanın ortasındaki ülke. Bu sayfa bir tarih dersi değil: son on yılda devletin nasıl yönetildiğinin değiştiği anlar, sırasıyla.\n\nAnkara''ya dokunduğunuzda açılan meclis, bu sayfada anlatılan değişikliklerin geçtiği yer.',
  '[
    {"d":"2013-05-28","t":"Gezi Parkı protestoları","b":"Taksim''deki ağaçlarla başlayan gösteriler haftalar içinde ülkenin en geniş çaplı sokak hareketine dönüştü."},
    {"d":"2015-07-20","t":"Suruç ve çatışma sürecinin sonu","b":"İki buçuk yıl süren çözüm süreci sona erdi; kentlerde çatışmalar başladı."},
    {"d":"2016-07-15","t":"Darbe girişimi","b":"251 kişi hayatını kaybetti. Ertesi hafta ilan edilen OHAL iki yıl sürdü."},
    {"d":"2017-04-16","t":"Anayasa referandumu","b":"%51,4 evetle cumhurbaşkanlığı hükümet sistemine geçildi; başbakanlık kaldırıldı."},
    {"d":"2018-06-24","t":"İlk sistemli seçim","b":"Cumhurbaşkanlığı ve meclis seçimleri aynı gün yapıldı; yeni sistem yürürlüğe girdi."},
    {"d":"2019-06-23","t":"İstanbul seçimi yenilendi","b":"Mart''taki seçim iptal edildi; yenilenen seçimde Ekrem İmamoğlu 800 binden fazla oy farkıyla kazandı."},
    {"d":"2021-09-01","t":"İstanbul Sözleşmesi''nden çıkış yürürlükte","b":"Türkiye''nin imzaya açtığı ve adını İstanbul''dan alan sözleşmeden cumhurbaşkanı kararıyla çekilindi."},
    {"d":"2023-02-06","t":"Kahramanmaraş depremleri","b":"On bir ili vuran depremlerde 53 binden fazla kişi öldü; seçim üç ay sonra bu gündemle yapıldı."},
    {"d":"2023-05-28","t":"İkinci tur","b":"Cumhuriyet tarihinin ilk ikinci turlu cumhurbaşkanlığı seçimi %52,2 ile sonuçlandı."},
    {"d":"2024-03-31","t":"Yerel seçimler","b":"CHP yirmi iki yıl sonra ilk kez ülke genelinde birinci parti oldu; İstanbul ve Ankara''da görevdeki başkanlar yeniden seçildi."}
  ]'::jsonb
);
