-- =====================================================================
-- Kütüphane — Ülke sayfalarının ilk içeriği (seed).
--
-- The first thing a reader finds behind the phone map: one standing
-- entry per country, each carrying a Zaman Akışı -- a chain of dated key
-- moments (db/country_entry_events.sql). These are the pages a country
-- is worth opening for at all: what happened, in order, in one screen.
--
-- Read-only content, admin-curated. Everything here can be edited or
-- extended afterwards from admin.html's Ülkeler tab -- this file is the
-- starting set, not a fixed one, and a timeline is expected to grow.
--
-- Requires db/country_entries.sql and db/country_entry_events.sql to
-- have been run first.
--
-- Idempotent: an entry is keyed by (country, title) here, so re-running
-- replaces that entry and its whole timeline rather than duplicating it.
-- That also means it OVERWRITES later hand edits to these six entries --
-- run it once, then maintain them from the admin portal.
--
-- Run in Supabase SQL editor.
-- =====================================================================

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


-- ── UKRAYNA ──────────────────────────────────────────────────────────
select pg_temp.seed_country_entry(
  'ukraine',
  'Rusya–Ukrayna Savaşı',
  E'Avrupa''nın İkinci Dünya Savaşı''ndan bu yana gördüğü en büyük savaş 2022''de başlamadı: 2014''te Kırım''ın ilhakı ve Donbas cephesiyle başladı, sekiz yıl alçak yoğunlukta sürdü, sonra topyekûn bir işgale dönüştü.\n\nİstanbul bu savaşın içinde bir yer tutuyor. Karadeniz''in tahıl koridoru burada imzalandı; iki tarafın heyetleri 2022''den sonra ilk kez yine burada, aynı şehirde yüz yüze geldi.',
  '[
    {"d":"2013-11-21","t":"Meydan protestoları başladı","b":"Yanukoviç hükümetinin AB Ortaklık Anlaşması''nı askıya alması Kiev''de Bağımsızlık Meydanı''nda kitlesel gösterileri başlattı."},
    {"d":"2014-02-22","t":"Yanukoviç görevden uzaklaştırıldı","b":"Meydan''da onlarca göstericinin öldürülmesinin ardından Cumhurbaşkanı Rusya''ya geçti, parlamento onu görevden aldı."},
    {"d":"2014-03-18","t":"Rusya Kırım''ı ilhak etti","b":"Uluslararası kabul görmeyen bir referandumun iki gün sonrasında Moskova ilhak anlaşmasını imzaladı."},
    {"d":"2014-04-06","t":"Donbas''ta savaş başladı","b":"Donetsk ve Luhansk''ta Rusya destekli silahlı gruplar kamu binalarını ele geçirdi; sekiz yıl duracak cephe böyle kuruldu."},
    {"d":"2014-07-17","t":"MH17 düşürüldü","b":"Amsterdam–Kuala Lumpur seferini yapan yolcu uçağı Donbas semalarında vuruldu; 298 kişi öldü."},
    {"d":"2015-02-12","t":"Minsk II imzalandı","b":"Ateşkes, ağır silahların geri çekilmesi ve bölgeye özel statü öngören anlaşma hiçbir zaman tam olarak uygulanmadı."},
    {"d":"2022-02-24","t":"Rusya topyekûn işgali başlattı","b":"Kuzeyden, doğudan ve güneyden eş zamanlı saldırı; Kiev''e yürüyüş ilk haftalarda durduruldu."},
    {"d":"2022-04-02","t":"Rus birlikleri Kiev çevresinden çekildi","b":"Buça ve çevresinde sivil katliamları ortaya çıktı; savaşın ağırlığı doğuya ve güneye kaydı."},
    {"d":"2022-07-22","t":"Tahıl Koridoru İstanbul''da imzalandı","b":"Türkiye ve BM arabuluculuğunda, Ukrayna tahılının Karadeniz üzerinden çıkışına izin veren anlaşma Dolmabahçe''de imzalandı."},
    {"d":"2022-11-11","t":"Herson geri alındı","b":"Harkiv ve Herson karşı saldırıları savaşın en büyük toprak değişimini yarattı."},
    {"d":"2023-06-08","t":"Ukrayna''nın karşı saldırısı başladı","b":"Aylar süren hazırlığın ardından güneyde başlayan harekât mayın hatlarını aşamadı, sınırlı kazanımla kaldı."},
    {"d":"2023-07-17","t":"Rusya tahıl anlaşmasından çekildi","b":"Koridor bir yıl işledikten sonra kapandı; Ukrayna Tuna ve kıyı sularını izleyen alternatif bir rota kurdu."},
    {"d":"2024-02-17","t":"Avdiyivka düştü","b":"Bahmut''tan sonraki en büyük kazanım; cephe yavaş ama sürekli batıya kaymaya başladı."},
    {"d":"2024-08-06","t":"Ukrayna Kursk''a girdi","b":"Savaşın başından beri ilk kez Rusya toprağında sınır ötesi bir harekât yürütüldü."},
    {"d":"2025-05-16","t":"İki taraf İstanbul''da doğrudan görüştü","b":"Heyetler 2022''den bu yana ilk kez yüz yüze geldi. Ateşkes çıkmadı; esir takası kararlaştırıldı."},
    {"d":"2025-06-02","t":"İkinci İstanbul turu","b":"Çırağan''daki görüşmede binlerce esirin ve savaşta ölen askerlerin naaşlarının karşılıklı iadesi kararlaştırıldı."}
  ]'::jsonb
);


-- ── RUSYA ────────────────────────────────────────────────────────────
select pg_temp.seed_country_entry(
  'russia',
  'Putin Rusyası',
  E'Bir ülkenin çeyrek yüzyılı tek bir ismin etrafında anlatılabiliyorsa, o ülkede olan biteni anlamak için o ismin geçtiği tarihlere bakmak gerekir.\n\nAşağısı 1999''un son gününden bugüne, Rusya''nın içeride ve dışarıda yön değiştirdiği anlar.',
  '[
    {"d":"1999-12-31","t":"Yeltsin görevi bıraktı","b":"Vladimir Putin vekâleten cumhurbaşkanı oldu; üç ay sonra seçimle göreve geldi."},
    {"d":"2000-08-12","t":"Kursk denizaltısı battı","b":"118 denizci öldü. Kazanın yönetilme ve anlatılma biçimi yeni iktidarın basınla ilişkisinin ilk sınavı oldu."},
    {"d":"2003-10-25","t":"Hodorkovski tutuklandı","b":"Yukos''un el değiştirmesi, enerji sektörünün devlet denetimine geçişinin dönüm noktası sayılır."},
    {"d":"2008-08-08","t":"Gürcistan Savaşı","b":"Beş gün süren savaşın ardından Rusya, Abhazya ve Güney Osetya''nın bağımsızlığını tanıdı."},
    {"d":"2011-12-10","t":"Bolotnaya protestoları","b":"Duma seçimlerinde hile iddialarıyla on binlerce kişi sokağa çıktı; Putin döneminin en büyük gösterileri."},
    {"d":"2014-03-18","t":"Kırım ilhak edildi","b":"Batı''nın ilk kapsamlı yaptırım paketi bu tarihten sonra devreye girdi."},
    {"d":"2015-09-30","t":"Suriye''ye askeri müdahale","b":"Esad yönetimi lehine başlayan hava harekâtı Rusya''yı Ortadoğu''ya doğrudan geri getirdi."},
    {"d":"2020-07-01","t":"Anayasa değişikliği kabul edildi","b":"Putin''in 2036''ya kadar aday olabilmesinin önü açıldı."},
    {"d":"2022-02-24","t":"Ukrayna''nın işgali başladı","b":"Tarihin en geniş yaptırım paketi ve yüzlerce büyük şirketin ülkeden çekilmesi izledi."},
    {"d":"2023-06-24","t":"Wagner isyanı","b":"Yevgeni Prigojin''in birlikleri Rostov''u alıp Moskova''ya yürüdü ve bir gün içinde geri döndü; Prigojin iki ay sonra bir uçak kazasında öldü."},
    {"d":"2024-02-16","t":"Aleksey Navalnıy cezaevinde öldü","b":"Muhalefetin en tanınan ismi, Kuzey Kutbu''ndaki bir ceza kolonisinde hayatını kaybetti."},
    {"d":"2024-03-17","t":"Putin beşinci kez seçildi","b":"Gerçek bir rakibin yarışmadığı seçimde resmî oy oranı %87 olarak açıklandı."}
  ]'::jsonb
);


-- ── FİLİSTİN ─────────────────────────────────────────────────────────
select pg_temp.seed_country_entry(
  'palestine',
  'Filistin–İsrail: Kilit Anlar',
  E'Bir yüzyıl. Aşağıdaki tarihler bir tarafın haklılığını anlatmak için değil, bugün olanların nereden geldiğini görebilmek için burada.\n\nHer satır, sonrakinin zeminini kuruyor: bir deklarasyon bir taksim planına, taksim planı bir savaşa, savaş bir işgale, işgal ellinci yılına.',
  '[
    {"d":"1917-11-02","t":"Balfour Deklarasyonu","b":"İngiltere, Filistin''de \"Yahudi halkı için ulusal bir yurt\" kurulmasını desteklediğini açıkladı."},
    {"d":"1947-11-29","t":"BM Taksim Planı","b":"Genel Kurul''un 181 sayılı kararı toprağı bir Arap ve bir Yahudi devletine bölüyor, Kudüs''ü uluslararası yönetime bırakıyordu."},
    {"d":"1948-05-15","t":"Nekbe","b":"İsrail''in kuruluşu ve ardından gelen savaş sırasında 700 binden fazla Filistinli evinden edildi; geri dönüşlerine izin verilmedi."},
    {"d":"1964-05-28","t":"FKÖ kuruldu","b":"Filistin Kurtuluş Örgütü Kudüs''te toplanan kongreyle kuruldu."},
    {"d":"1967-06-05","t":"Altı Gün Savaşı","b":"İsrail Doğu Kudüs''ü, Batı Şeria''yı, Gazze''yi, Sina''yı ve Golan''ı ele geçirdi. Bugünkü işgalin çerçevesi bu haftada çizildi."},
    {"d":"1987-12-09","t":"Birinci İntifada","b":"Gazze''de başlayan halk ayaklanması altı yıl sürdü."},
    {"d":"1993-09-13","t":"Oslo Anlaşması","b":"Beyaz Saray''da imzalanan anlaşma Filistin Yönetimi''ni doğurdu. Kudüs, mülteciler ve yerleşimler gibi nihai statü konuları sonraya bırakıldı ve hiç konuşulmadı."},
    {"d":"2000-09-28","t":"İkinci İntifada","b":"Beş yıl süren şiddet, ayrım duvarının inşasıyla ve Oslo sürecinin fiilen bitişiyle sonuçlandı."},
    {"d":"2005-09-12","t":"İsrail Gazze''den çekildi","b":"Yerleşimler boşaltıldı; ancak sınırların, hava sahasının ve kıyı sularının denetimi İsrail''de kaldı."},
    {"d":"2007-06-14","t":"Hamas Gazze''nin denetimini aldı","b":"Fetih ile çatışmanın ardından Filistin yönetimi ikiye bölündü; Gazze ablukası başladı."},
    {"d":"2012-11-29","t":"BM''de gözlemci devlet statüsü","b":"Genel Kurul Filistin''i \"üye olmayan gözlemci devlet\" olarak tanıdı."},
    {"d":"2023-10-07","t":"7 Ekim ve Gazze Savaşı","b":"Hamas''ın İsrail''e saldırısında 1.200''den fazla kişi öldü, 250''ye yakın kişi rehin alındı. Ardından başlayan savaş Gazze''de on binlerce kişinin ölümüne ve nüfusun neredeyse tamamının yerinden edilmesine yol açtı."},
    {"d":"2025-01-19","t":"İlk ateşkes yürürlüğe girdi","b":"Katar, Mısır ve ABD arabuluculuğundaki anlaşmanın ilk aşaması rehine–tutuklu takasıyla başladı; mart ayında bozuldu."},
    {"d":"2025-10-10","t":"Yeni ateşkes","b":"ABD''nin 20 maddelik planı çerçevesinde, Türkiye, Katar ve Mısır''ın arabuluculuğuyla ateşkes yürürlüğe girdi; 13 Ekim''de Şarm El-Şeyh''te niyet mektubu imzalandı."}
  ]'::jsonb
);


-- ── SURİYE ───────────────────────────────────────────────────────────
select pg_temp.seed_country_entry(
  'syria',
  'Suriye İç Savaşı',
  E'On üç yıl, yarım milyondan fazla ölü, on üç milyona yakın yerinden edilmiş insan — ve Türkiye''nin komşusu olduğu için hiçbir zaman haber olmaktan çıkmayan bir ülke.\n\nİstanbul bu savaşın en görünür sonuçlarından birini taşıyor: milyonlarca Suriyeli''nin sığındığı ülkenin en kalabalık şehri burası.',
  '[
    {"d":"2011-03-15","t":"Protestolar başladı","b":"Dera''da duvara yazı yazan çocukların gözaltına alınmasıyla başlayan gösteriler kısa sürede ülkeye yayıldı."},
    {"d":"2011-07-29","t":"Özgür Suriye Ordusu kuruldu","b":"Ordudan ayrılan subaylar silahlı muhalefeti örgütledi; ayaklanma iç savaşa dönüştü."},
    {"d":"2012-07-19","t":"Halep cephesi açıldı","b":"Ülkenin en kalabalık kenti dört yıl sürecek biçimde ikiye bölündü."},
    {"d":"2013-08-21","t":"Doğu Guta kimyasal saldırısı","b":"Yüzlerce sivil sarin gazıyla öldürüldü. Suriye, kimyasal silah stokunu teslim etmeyi kabul etti."},
    {"d":"2014-06-29","t":"IŞİD hilafet ilan etti","b":"Rakka merkezli örgüt Suriye ve Irak''ta geniş bir alanı denetimine aldı."},
    {"d":"2015-09-30","t":"Rusya müdahalesi","b":"Doğrudan hava harekâtı savaşın seyrini rejim lehine çevirdi."},
    {"d":"2016-08-24","t":"Fırat Kalkanı Harekâtı","b":"Türkiye, Suriye''deki ilk kapsamlı sınır ötesi kara harekâtını başlattı."},
    {"d":"2016-12-22","t":"Halep rejime geçti","b":"Kentin doğusundaki kuşatma tahliyeyle sona erdi; muhalefet en büyük kent merkezini kaybetti."},
    {"d":"2018-01-20","t":"Zeytin Dalı Harekâtı","b":"Afrin, Türkiye ve Suriye Milli Ordusu denetimine geçti."},
    {"d":"2019-10-09","t":"Barış Pınarı Harekâtı","b":"Tel Abyad–Resulayn hattında bir güvenlik bölgesi kuruldu."},
    {"d":"2020-03-05","t":"İdlib''de Moskova mutabakatı","b":"Türkiye ile Rusya arasındaki ateşkes cepheyi dört yıl boyunca büyük ölçüde dondurdu."},
    {"d":"2024-12-08","t":"Şam düştü, Esad ülkeden ayrıldı","b":"On bir gün süren muhalefet saldırısının sonunda 54 yıllık Esad yönetimi sona erdi."},
    {"d":"2025-01-29","t":"Ahmed eş-Şara geçiş dönemi cumhurbaşkanı ilan edildi","b":"Muhalefetin askeri kanatları feshedildi, yeni bir ordu kurulması kararlaştırıldı."},
    {"d":"2025-03-13","t":"Geçici anayasa yürürlüğe girdi","b":"Beş yıllık bir geçiş dönemi ve sonunda seçim öngörüldü."},
    {"d":"2025-10-05","t":"Esad sonrası ilk parlamento seçimi","b":"Sınırlı bir seçimdi: Süveyda''da ve Kürt denetimindeki bölgelerde yapılamadı."}
  ]'::jsonb
);


-- ── AZERBAYCAN ───────────────────────────────────────────────────────
select pg_temp.seed_country_entry(
  'azerbaijan',
  'Karabağ',
  E'Sovyetler''in dağılmasından bu yana post-Sovyet coğrafyasının en uzun süren çatışması. Otuz beş yılda iki savaş, bir dondurulmuş cephe, bir günlük bir harekât ve bir barış bildirisi.',
  '[
    {"d":"1988-02-20","t":"Karabağ hareketi başladı","b":"Dağlık Karabağ Özerk Bölgesi sovyeti Ermenistan''a bağlanma kararı aldı; iki toplum arasındaki gerilim büyüdü."},
    {"d":"1992-02-26","t":"Hocalı katliamı","b":"Kasabada yüzlerce Azerbaycanlı sivil öldürüldü."},
    {"d":"1994-05-12","t":"Bişkek ateşkesi","b":"Birinci Karabağ Savaşı, Karabağ ve çevresindeki yedi rayonun Ermeni denetiminde kalmasıyla dondu; her iki taraftan yüz binlerce kişi yerinden edildi."},
    {"d":"2020-09-27","t":"İkinci Karabağ Savaşı","b":"Kırk dört gün süren savaşta Azerbaycan, işgal altındaki bölgelerin büyük bölümünü geri aldı."},
    {"d":"2020-11-10","t":"Üçlü bildiri","b":"Rusya arabuluculuğundaki ateşkesle Rus barış gücü konuşlandı; Şuşa Azerbaycan''da kaldı."},
    {"d":"2023-09-19","t":"Tek günlük harekât","b":"Azerbaycan Karabağ''ın tamamında denetimi sağladı; izleyen haftalarda 100 binden fazla Ermeni bölgeyi terk etti."},
    {"d":"2025-08-08","t":"Washington''da barış bildirisi","b":"Aliyev ve Paşinyan ortak bildiriyi imzaladı, 17 maddelik barış anlaşması paraflandı; Nahçıvan bağlantısı için bir koridor üzerinde anlaşıldı."}
  ]'::jsonb
);


-- ── KIBRIS ───────────────────────────────────────────────────────────
select pg_temp.seed_country_entry(
  'cyprus',
  'Kıbrıs Meselesi',
  E'Adanın bölünmüşlüğü elli yılı geçti; müzakereler de öyle. Türkiye''nin dış politikasında bir konudan fazlası, çünkü tarafı.',
  '[
    {"d":"1960-08-16","t":"Kıbrıs Cumhuriyeti kuruldu","b":"Zürih ve Londra anlaşmalarıyla; Türkiye, Yunanistan ve İngiltere garantör oldu."},
    {"d":"1963-12-21","t":"Kanlı Noel","b":"Anayasa krizinin ardından başlayan çatışmalar iki toplumu ayırdı; Kıbrıslı Türkler devlet organlarından çekildi."},
    {"d":"1964-03-04","t":"BM Barış Gücü adaya geldi","b":"UNFICYP altmış yılı aşkın süredir görevde."},
    {"d":"1974-07-15","t":"Darbe","b":"Yunan cuntası destekli darbe Makarios''u devirdi; hedef adayı Yunanistan''a bağlamaktı."},
    {"d":"1974-07-20","t":"Türkiye''nin müdahalesi","b":"Garantörlük anlaşmasına dayanan harekât adanın kuzeyini Türk denetimine soktu; iki toplum kuzey ve güneye ayrıştı."},
    {"d":"1983-11-15","t":"KKTC ilan edildi","b":"Türkiye dışında hiçbir devlet tanımadı."},
    {"d":"2004-04-24","t":"Annan Planı referandumu","b":"Kuzeyde %65 evet, güneyde %76 hayır çıktı. Ada bölünmüş kaldı; Kıbrıs Cumhuriyeti bir hafta sonra AB üyesi oldu."},
    {"d":"2017-07-07","t":"Crans-Montana görüşmeleri çöktü","b":"Birleşme müzakerelerinin son kapsamlı turu sonuçsuz kaldı."}
  ]'::jsonb
);
