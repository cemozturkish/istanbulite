import Foundation

/// `profiles.language_pref`: 'default' is Turkish, 'more_english' is English.
enum Lang: String {
    case tr = "default"
    case en = "more_english"
    var toggled: Lang { self == .tr ? .en : .tr }
}

/// The strings the native app prints, lifted from i18n.js under the same keys
/// so the two can be compared line for line.
enum L {
    private static let table: [String: (String, String)] = [
        "home.today": ("BUGÜN", "TODAY"),
        "events.tomorrow": ("YARIN", "TOMORROW"),
        "home.play": ("OYNA", "PLAY"),
        "home.played": ("BİTTİ ✓", "DONE ✓"),
        "home.off": ("Bugün yok", "Not today"),
        "home.noevents": ("Bu hafta haritada etkinlik yok.", "No evenings on the map this week."),
        "events.going": ("Gidiyorum", "I'm going"),
        "events.notgoing": ("Gitmiyorum", "Not going"),
        "events.changed": ("Vazgeç", "Changed my mind"),
        "events.youregoing": ("Gidiyorsun ✓", "You're going ✓"),
        "events.kefil": ("ETKİNLİK KEFİLİ", "EVENT SPONSOR"),
        "events.failed": ("Etkinlikler yüklenemedi.", "Couldn't load events."),

        "plan.add": ("Bir yere gidiyorum", "I'm going somewhere"),
        "plan.title": ("Nereye gidiyorsun?", "Where are you going?"),
        "plan.what": ("Ne yapacaksın", "What are you doing"),
        "plan.what.ph": ("Moda’da çay, belki tavla", "Tea in Moda, maybe backgammon"),
        "plan.where": ("Nerede", "Where"),
        "plan.district": ("İlçe", "District"),
        "plan.place.ph": ("Yer (isteğe bağlı)", "Place (optional)"),
        "plan.when": ("Ne zaman", "When"),
        "plan.time": ("Saat", "Time"),
        "plan.who": ("Peteğinde sana bağlı {n} kişi bunu haritasında görecek. Günü bitince gece yarısı kendiliğinden kalkar.",
                     "The {n} people attached to you on your petek will see this on their map. It comes down by itself at midnight after its day."),
        "plan.send": ("Peteğime duyur", "Tell my petek"),
        "plan.sending": ("Gönderiliyor…", "Sending…"),
        "plan.kefil": ("KEFİL", "HOST"),
        "plan.frompetek": ("PETEĞİNDEN", "FROM YOUR PETEK"),
        "plan.yours": ("SENİN PLANIN · PETEĞİN GÖRÜYOR", "YOUR PLAN · YOUR PETEK SEES IT"),
        "plan.takeback": ("Geri al", "Take it back"),
        "plan.takeback.sure": ("Bu plan geri alınsın mı?", "Take this plan back?"),
        "plan.yes": ("Evet, geri al", "Yes, take it back"),
        "plan.cancel": ("Vazgeç", "Keep it"),
        "plan.err": ("Gönderilemedi, tekrar dene.", "Couldn't send it, try again."),
        "plan.err.what": ("Ne yapacağını yaz.", "Say what you are doing."),
        "plan.err.district": ("Bir ilçe seç.", "Pick a district."),
        "plan.err.past": ("Bu saat geçti.", "That time has already passed."),
        "plan.err.full": ("Aynı anda en fazla 5 planın olabilir. Birini geri alıp yenisini ekle.",
                          "You can have at most 5 plans at once. Take one back to add another."),
        "plan.err.rls": ("Bu plan kaydedilemedi: günü bu haftanın içinde olmalı.",
                         "This plan couldn't be saved: its day has to be within this week."),
        "plan.err.missing": ("Planlar için veritabanı güncellemesi eksik (db/events_v2_plans.sql).",
                             "The database update for plans is missing (db/events_v2_plans.sql)."),
        "plan.err.edit.missing": ("Planı düzenlemek için veritabanı güncellemesi eksik (db/events_v3_plan_edit.sql).",
                                  "The database update for editing plans is missing (db/events_v3_plan_edit.sql)."),
        "plan.edit": ("Düzenle", "Edit"),
        "plan.edit.title": ("Planını düzenle", "Edit your plan"),
        "plan.edit.moved": ("Günü, saati ya da ilçesi değişirse gelenlerin cevabı sıfırlanır; peteğine yeniden sorulur.",
                            "If you change the day, the time or the district, everybody's answer is cleared and your petek is asked again."),
        "plan.save": ("Kaydet", "Save"),
        "plan.saving": ("Kaydediliyor…", "Saving…"),
        "plan.back": ("‹ Bu haftam", "‹ My week"),
        "plan.week.title": ("Bu haftam", "My week"),
        "plan.week.sub": ("Gideceğini söylediğin akşamlar ve kendi planların.", "The evenings you said you are going to, and your own plans."),
        "plan.week.empty": ("Bu hafta henüz bir yere gideceğini söylemedin. Haritadaki kırmızı ilçelere bak ya da kendi planını yaz.",
                            "You haven't said you're going anywhere this week yet. Look at the red districts on the map, or write your own plan."),
        "plan.week.going": ("GİDİYORSUN", "GOING"),
        "plan.week.mine": ("PLANIN", "YOUR PLAN"),
        "plan.week.new": ("+ Yeni plan", "+ New plan"),
        "plan.week.count": ("5 plan hakkından {n} tanesi duruyor.", "{n} of your 5 plans are up."),

        "lang.default": ("Daha Türkçe", "More Turkish"),
        "lang.more_english": ("Daha İngilizce", "More English"),

        "auth.email": ("E-posta", "Email"),
        "auth.password": ("Şifre", "Password"),
        "auth.signin": ("Giriş Yap", "Sign In"),
        "auth.signup": ("Kayıt Ol", "Sign Up"),
        "auth.kefilcode": ("Kefil Kodu", "Sponsor Code"),
        "auth.continue": ("Devam", "Continue"),
        "auth.back": ("Geri", "Back"),
        "auth.firstname": ("Ad", "First Name"),
        "auth.lastname": ("Soyad", "Last Name"),
        "auth.phone": ("Telefon", "Phone"),
        "auth.livedistrict": ("Yaşadığın Mahalle", "Where You Live"),
        "auth.birthdistrict": ("Doğduğun Mahalle", "Where You Were Born"),
        "auth.kefilnote": ("Kayıt için kefil kodu", "Sponsor code required to sign up"),
        "auth.privacypolicy": ("Gizlilik Politikası", "Privacy Policy"),
        "auth.privacyagree": ("Gizlilik Politikası'nı okudum ve kabul ediyorum.", "I have read and accept the Privacy Policy."),
        "auth.notborn": ("İSTANBULDA DOĞMADIM", "NOT BORN IN ISTANBUL"),
        "auth.kefilbad": ("Geçersiz kefil kodu.", "Invalid sponsor code."),
        "auth.pending": ("Kayıt alındı. Onay sonrası giriş yapabilirsiniz.", "Signed up. You can sign in once confirmed."),

        "profile.hive.claimprompt": ("SANA VERİLEN KOD", "A CODE YOU WERE GIVEN"),
        "profile.hive.err.short": ("Kod 6 karakter.", "The code is 6 characters."),
        "profile.hive.err.invalid_code": ("Böyle bir kod yok.", "No such code."),
        "profile.hive.err.expired": ("Bu kodun süresi doldu.", "That code has run out."),
        "profile.hive.err.spent": ("Bu yeri başkası aldı.", "Somebody already took that seat."),
        "profile.hive.err.self": ("Bu senin kendi yerin.", "That's your own seat."),
        "profile.hive.err.dir_taken": ("O yere başkası geçmiş.", "Somebody moved into that place first."),
        "profile.hive.err.already_bonded": ("Bu üye zaten peteğinde.", "You two are already attached."),
        "profile.hive.err.too_far": ("Aynı petektesiniz ama yan yana değilsiniz.", "You're on the same petek, but not side by side."),
        "profile.hive.err.no_room": ("İki petek buraya sığmıyor.", "The two peteks don't fit together there."),
        "profile.hive.err.failed": ("Olmadı, tekrar dene.", "That didn't work, try again."),
        "hive.seat.hint": ("Bu kodu karşındakine oku", "Read this code to them"),
        "hive.seat.left": ("{m} dk kaldı", "{m} min left"),
        "hive.go": ("GİDİYOR", "GOING"),
        "hive.no": ("GİTMİYOR", "NOT GOING"),

        "me.kefilcode": ("KEFİL KODUN", "YOUR SPONSOR CODE"),
        "me.since": ("Üye", "Member since"),
        "me.signout": ("Çıkış Yap", "Sign Out"),
        "me.delete": ("Hesabımı Sil", "Delete My Account"),
        "me.delete.sure": ("Hesabın ve her şeyin kalıcı olarak silinecek.", "Your account and everything in it will be deleted for good."),
        "me.delete.yes": ("Evet, sil", "Yes, delete it"),
        "me.lang": ("Dil", "Language"),
        "me.copied": ("Kopyalandı", "Copied"),
        "close": ("Kapat", "Close"),
    ]

    static func t(_ key: String, _ lang: Lang, _ n: Int? = nil) -> String {
        guard let pair = table[key] else { return key }
        let s = lang == .en ? pair.1 : pair.0
        if let n { return s.replacingOccurrences(of: "{n}", with: String(n)).replacingOccurrences(of: "{m}", with: String(n)) }
        return s
    }

    /// "BAKIRKÖY'DEN CEM" / "CEM FROM BAKIRKÖY" — trFrom in project.html.
    static func from(_ p: PersonRef?, lang: Lang) -> String {
        guard let p else { return "" }
        let name = (p.first_name ?? "").trUpper
        let nb = Districts.name(p.neighborhood).trUpper
        if lang == .en { return name.isEmpty ? nb : "\(name) FROM \(nb)" }
        return name.isEmpty ? nb : "\(nb)\(ablative(nb)) \(name)"
    }

    /// Turkish ablative suffix with vowel harmony and consonant hardening.
    static func ablative(_ word: String) -> String {
        let lower = word.lowercased(with: Locale(identifier: "tr_TR"))
        let vowels = "aeıioöuü"
        let lastVowel = lower.last { vowels.contains($0) } ?? "a"
        let front = "eiöü".contains(lastVowel)
        let hard = "çfhkpsşt".contains(lower.last ?? "a")
        return "'" + (hard ? "T" : "D") + (front ? "EN" : "AN")
    }
}
