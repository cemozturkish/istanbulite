import Foundation

struct Profile: Decodable, Equatable {
    let id: String
    var first_name: String?
    var last_name: String?
    var neighborhood: String?
    var referral_code: String?
    var joined_at: String?
    var language_pref: String?
    var avatar_hair: String?
    var avatar_shirt: String?
    var avatar_accessory: String?

    var fullName: String { [first_name, last_name].compactMap { $0 }.joined(separator: " ") }
}

/// The kefil of an evening (admin-assigned) or of a plan (its creator).
struct PersonRef: Decodable, Equatable {
    let id: String
    var first_name: String?
    var last_name: String?
    var neighborhood: String?
}

/// A row of `events`: a city evening (`audience = 'city'`, curated through a
/// baskı) or a member's plan (`'petek'`, seen only by the petek it was told to).
struct Event: Decodable, Identifiable, Equatable {
    let id: String
    var title: String
    var title_en: String?
    var description: String?
    var description_en: String?
    var neighborhood: String?
    var location: String?
    var event_date: String
    var kefil_id: String?
    var audience: String?
    var created_by: String?
    var edition_order: Int?

    var isPlan: Bool { audience == "petek" }
    var date: Date { IstDate.parse(event_date) ?? .distantPast }
    var kefilID: String? { isPlan ? created_by : kefil_id }

    func text(_ field: KeyPath<Event, String?>, en: KeyPath<Event, String?>, lang: Lang) -> String? {
        if lang == .en, let e = self[keyPath: en], !e.trimmingCharacters(in: .whitespaces).isEmpty { return e }
        return self[keyPath: field]
    }
    func titleText(_ lang: Lang) -> String {
        if lang == .en, let e = title_en, !e.trimmingCharacters(in: .whitespaces).isEmpty { return e }
        return title
    }
    func descriptionText(_ lang: Lang) -> String? { text(\.description, en: \.description_en, lang: lang) }
}

struct HiveCell: Decodable, Identifiable, Equatable {
    let member_id: String
    let q: Int
    let r: Int
    var first_name: String?
    var last_name: String?
    var neighborhood: String?
    var avatar_hair: String?
    var avatar_hat: String?
    var avatar_accessory: String?
    var avatar_shirt: String?
    var bonded: Bool?
    var locked: Bool?
    var joined_at: String?
    var id: String { member_id }
}

struct Neighborhood: Decodable, Identifiable, Hashable {
    let id: String
    let name_tr: String
}

struct GameRef: Identifiable, Equatable {
    let key: String
    let title: String
    let file: String
    var id: String { key }

    static let catalog: [String: GameRef] = [
        "sozcel": .init(key: "sozcel", title: "Sözcel", file: "sozcel.html"),
        "tumcel": .init(key: "tumcel", title: "Tümcel", file: "tumcel.html"),
        "bulmaca": .init(key: "bulmaca", title: "Çengel", file: "bulmaca.html"),
    ]
    static let defaultLineup = ["sozcel", "tumcel"]
}

enum GameState: Equatable { case play, done, off }

struct GameSlot: Identifiable, Equatable {
    let index: Int
    let game: GameRef?
    let state: GameState
    var id: Int { index }
}

/// Every district's display name. The live `neighborhoods` fetch wins; this is
/// project.html's `NB_NAMES` plus the fourteen it never carried.
enum Districts {
    static let fallback: [String: String] = [
        "bakirkoy": "Bakırköy", "bayrampasa": "Bayrampaşa", "bahcelievler": "Bahçelievler", "sisli": "Şişli",
        "eyupsultan": "Eyüpsultan", "gop": "Gaziosmanpaşa", "esenler": "Esenler", "bagcilar": "Bağcılar",
        "basaksehir": "Başakşehir", "kucukcekmece": "Küçükçekmece", "sultangazi": "Sultangazi",
        "uskudar": "Üsküdar", "kadikoy": "Kadıköy", "maltepe": "Maltepe", "umraniye": "Ümraniye",
        "cekmekoy": "Çekmeköy", "beykoz": "Beykoz", "sariyer": "Sarıyer", "besiktas": "Beşiktaş",
        "beyoglu": "Beyoğlu", "gungoren": "Güngören", "kagithane": "Kağıthane", "atasehir": "Ataşehir",
        "zeytinburnu": "Zeytinburnu", "fatih": "Fatih",
        "adalar": "Adalar", "arnavutkoy": "Arnavutköy", "avcilar": "Avcılar", "beylikduzu": "Beylikdüzü",
        "buyukcekmece": "Büyükçekmece", "catalca": "Çatalca", "esenyurt": "Esenyurt", "kartal": "Kartal",
        "pendik": "Pendik", "sancaktepe": "Sancaktepe", "silivri": "Silivri", "sultanbeyli": "Sultanbeyli",
        "sile": "Şile", "tuzla": "Tuzla",
    ]
    static var live: [String: String] = [:]

    static func name(_ id: String?) -> String {
        guard let id, !id.isEmpty else { return "İstanbul" }
        return live[id] ?? fallback[id] ?? id
    }
}

extension String {
    /// Turkish-aware uppercase: "i" → "İ", never "I".
    var trUpper: String { uppercased(with: Locale(identifier: "tr_TR")) }
}
