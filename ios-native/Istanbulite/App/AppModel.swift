import SwiftUI
import Observation

/// The whole of the app's state. project.html keeps the same facts in
/// `homeData`, the petek module and the games cache; here they are one object
/// so the map, the card, the petek and the plan sheet can never disagree.
@MainActor
@Observable
final class AppModel {
    enum Phase: Equatable { case launching, signedOut, signedIn }

    let sb = SupabaseClient.shared

    var phase: Phase = .launching
    var uid: String?
    var lang: Lang = Lang(rawValue: UserDefaults.standard.string(forKey: "lang") ?? "") ?? .tr {
        didSet { UserDefaults.standard.set(lang.rawValue, forKey: "lang") }
    }
    var theme = Theme.now

    var profile: Profile?
    var neighborhoods: [Neighborhood] = []

    // The week on the map
    var events: [Event] = []
    var plans: [Event] = []
    var plansOpen = false
    var going: Set<String> = []
    var answered: [String: String] = [:]
    var people: [String: PersonRef] = [:]
    var eventsFailed = false

    // The petek
    var hive: [HiveCell] = []
    var hiveLoaded = false

    // Today's games
    var games: [GameSlot] = []

    // What is open on the home screen
    var openDistrict: String?
    var openKind: EventKind = .city
    var openIndex = 0
    var guestList: [String: GuestState] = [:]
    var pickedMember: HiveCell?
    var wholePetek = false

    enum EventKind: Equatable { case city, plan }
    enum GuestState: Equatable { case kefil, go, no }

    // MARK: Session

    func start() async {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-demoHome") {
            loadDemo()
            if ProcessInfo.processInfo.arguments.contains("-demoCard") { openCard("kadikoy") }
            return
        }
        #endif
        if let s = await sb.vault.session {
            uid = s.user.id
            phase = .signedIn
            await loadAll()
        } else {
            phase = .signedOut
        }
        await loadNeighborhoods()
    }

    func didSignIn(_ s: AuthSession) async {
        uid = s.user.id
        phase = .signedIn
        await loadAll()
    }

    func signOut() async {
        await sb.signOut()
        resetHome()
        phase = .signedOut
    }

    func deleteAccount() async -> Bool {
        do {
            try await sb.rpcVoid("delete_own_account")
            await signOut()
            return true
        } catch { return false }
    }

    private func resetHome() {
        uid = nil; profile = nil; events = []; plans = []; hive = []; games = []
        going = []; answered = [:]; people = [:]; hiveLoaded = false
        closeCard(); pickedMember = nil; wholePetek = false
    }

    // MARK: Loading

    func loadAll() async {
        theme = .now
        lastLoad = (IstDate.iso(), Date())
        async let p: Void = loadProfile()
        async let e: Void = loadEvents()
        async let h: Void = loadHive()
        async let g: Void = loadGames()
        _ = await (p, e, h, g)
    }

    private var lastLoad: (day: String, at: Date)?

    /// Coming back to the app renews what has turned: a new İstanbul day, or
    /// simply a while away. The colours follow the sun every time.
    func refreshIfDayTurned() async {
        theme = .now
        guard phase == .signedIn, uid != "me" else { return }
        if let l = lastLoad, l.day == IstDate.iso(), Date().timeIntervalSince(l.at) < 300 { return }
        await loadAll()
    }

    func loadNeighborhoods() async {
        guard neighborhoods.isEmpty else { return }
        if let rows: [Neighborhood] = try? await sb.select("neighborhoods", [.select("id,name_tr"), .order("name_tr")]) {
            neighborhoods = rows
            for r in rows where r.id != "istanbul_disi" { Districts.live[r.id] = r.name_tr }
        }
    }

    func loadProfile() async {
        guard let uid else { return }
        let rows: [Profile]? = try? await sb.select("profiles", [
            .select("id,first_name,last_name,neighborhood,referral_code,joined_at,language_pref,avatar_hair,avatar_shirt,avatar_accessory"),
            .eq("id", uid)])
        if let p = rows?.first {
            profile = p
            if let l = p.language_pref.flatMap(Lang.init(rawValue:)) { lang = l }
        }
    }

    /// The edition in force for a kind, or `missing` on a database that
    /// predates the baskı (then the column is read ungated, as the web does).
    private func editionInForce(_ fn: String) async throws -> (date: String?, missing: Bool) {
        do {
            let d: String? = try await sb.rpc(fn, ["p_today": IstDate.iso()])
            return (d, false)
        } catch let e as SupabaseError where e.isMissing {
            return (nil, true)
        }
    }

    func loadEvents() async {
        let from = IstDate.isoString(IstDate.midnight(0))
        let to = IstDate.isoString(IstDate.midnight(Config.homeDays))
        var city: [Event] = []
        var failed = false
        do {
            let ed = try await editionInForce("events_current_edition")
            if ed.missing || ed.date != nil {
                var q: [URLQueryItem] = [.select("*"), .gte("event_date", from), .lt("event_date", to),
                                         .order("event_date.asc,edition_order.asc")]
                if let d = ed.date { q.append(.eq("edition_date", d)) }
                let rows: [Event] = try await sb.select("events", q)
                city = rows.filter { !$0.isPlan }
            }
        } catch { failed = true }

        var planRows: [Event] = []
        var open = false
        do {
            planRows = try await sb.select("events", [.select("*"), .eq("audience", "petek"),
                                                       .gte("event_date", from), .lt("event_date", to),
                                                       .order("event_date.asc")])
            open = true
        } catch { open = false }

        let all = city + planRows
        let ids = all.map(\.id)
        let kefilIDs = Array(Set(all.compactMap(\.kefilID)))
        var newPeople = people
        if !kefilIDs.isEmpty, let ks: [PersonRef] = try? await sb.select("profiles", [
            .select("id,first_name,last_name,neighborhood"), .in("id", kefilIDs)]) {
            for k in ks { newPeople[k.id] = k }
        }
        var newAnswered: [String: String] = [:]
        var newGoing: Set<String> = []
        if let uid, !ids.isEmpty {
            struct V: Decodable { let event_id: String; let verdict: String? }
            struct R: Decodable { let event_id: String }
            if let vs: [V] = try? await sb.select("event_interest", [.select("event_id,verdict"), .eq("user_id", uid), .in("event_id", ids)]) {
                for v in vs { newAnswered[v.event_id] = v.verdict }
            }
            if let rs: [R] = try? await sb.select("event_rsvps", [.select("event_id"), .eq("user_id", uid), .in("event_id", ids)]) {
                newGoing = Set(rs.map(\.event_id))
            }
        }
        events = city
        plans = planRows
        plansOpen = open
        people = newPeople
        answered = newAnswered
        going = newGoing
        eventsFailed = failed
    }

    func loadHive() async {
        do {
            hive = try await sb.rpc("hive_map")
        } catch {
            // A member who never attached has no cell: an empty map, not an error.
        }
        hiveLoaded = true
        for c in hive { people[c.member_id] = PersonRef(id: c.member_id, first_name: c.first_name, last_name: c.last_name, neighborhood: c.neighborhood) }
    }

    func loadGames() async {
        let night = IstDate.iso()
        var lineup = GameRef.defaultLineup.map(Optional.some)
        struct Slot: Decodable { let slot: Int; let game: String? }
        struct Off: Decodable { let game: String }
        struct Res: Decodable { let game: String; let attempts: Int? }
        if let rows: [Slot] = try? await sb.select("game_night_slots", [.select("slot,game"), .eq("game_date", night)]), !rows.isEmpty {
            lineup = [nil, nil]
            for r in rows where (0..<2).contains(r.slot) { lineup[r.slot] = r.game.flatMap { GameRef.catalog[$0] != nil ? $0 : nil } }
        }
        let off = Set(((try? await sb.select("game_day_toggles", [.select("game"), .eq("game_date", night)])) as [Off]?)?.map(\.game) ?? [])
        var played: Set<String> = []
        if let uid, let rs: [Res] = try? await sb.select("game_results", [.select("game,attempts"), .eq("user_id", uid), .eq("date", IstDate.seed())]) {
            // PLAYED means finished (attempts >= 1), never merely opened.
            played = Set(rs.filter { ($0.attempts ?? 0) >= 1 }.map(\.game))
        }
        games = lineup.enumerated().map { i, key in
            let g = key.flatMap { GameRef.catalog[$0] }
            let state: GameState = g == nil || off.contains(g!.key) ? .off : (played.contains(g!.key) ? .done : .play)
            return GameSlot(index: i, game: g, state: state)
        }
    }

    // MARK: The week on the map

    /// Everything on in a district this week, by kind.
    func events(in district: String, kind: EventKind) -> [Event] {
        (kind == .city ? events : plans).filter { $0.neighborhood == district }
    }

    var eventDistricts: Set<String> {
        Set((events + plans).compactMap(\.neighborhood))
    }

    var openEvents: [Event] {
        guard let d = openDistrict else { return [] }
        return events(in: d, kind: openKind)
    }

    var openEvent: Event? {
        let list = openEvents
        return list.isEmpty ? nil : list[min(openIndex, list.count - 1)]
    }

    func openCard(_ district: String, kind: EventKind? = nil, eventID: String? = nil) {
        let k = kind ?? (events.contains { $0.neighborhood == district } ? .city : .plan)
        openDistrict = district
        openKind = k
        let list = events(in: district, kind: k)
        openIndex = eventID.flatMap { id in list.firstIndex { $0.id == id } } ?? 0
        Task { await loadGuestList() }
    }

    func pageCard(_ delta: Int) {
        let n = openEvents.count
        guard n > 1 else { return }
        openIndex = (openIndex + delta + n) % n
        Task { await loadGuestList() }
    }

    func closeCard() {
        openDistrict = nil
        openIndex = 0
        guestList = [:]
    }

    /// 'go' | 'no' | nil — where the reader stands on one evening.
    func mine(_ ev: Event) -> GuestState? {
        if going.contains(ev.id) { return .go }
        return answered[ev.id] == "no" ? .no : nil
    }

    /// While a card is open the petek is its guest list.
    func loadGuestList() async {
        guard let ev = openEvent else { guestList = [:]; return }
        struct Row: Decodable { let event_id: String; let member_id: String; let verdict: String? }
        async let vAsk: [Row]? = try? sb.rpc("hive_event_interest_status", ["p_event_ids": [ev.id]])
        async let gAsk: [Row]? = try? sb.rpc("hive_event_rsvp_status", ["p_event_ids": [ev.id]])
        let (verdicts, goingRows) = await (vAsk ?? [], gAsk ?? [])
        var out: [String: GuestState] = [:]
        for v in verdicts where v.verdict == "no" { out[v.member_id] = .no }
        for g in goingRows { out[g.member_id] = .go }
        if let k = ev.kefilID { out[k] = .kefil }
        guard openEvent?.id == ev.id else { return }
        guestList = out
    }

    /// Both tables, on purpose: event_rsvps is presence, event_interest the verdict.
    func rsvp(_ ev: Event, going goes: Bool) async {
        guard let uid else { return }
        if goes {
            going.insert(ev.id)
            try? await sb.upsert("event_rsvps", [["event_id": ev.id, "user_id": uid]], onConflict: "event_id,user_id")
        } else {
            going.remove(ev.id)
            try? await sb.delete("event_rsvps", [.eq("event_id", ev.id), .eq("user_id", uid)])
        }
        answered[ev.id] = goes ? "yes" : "no"
        try? await sb.upsert("event_interest", [["user_id": uid, "event_id": ev.id, "verdict": goes ? "yes" : "no"]],
                             onConflict: "user_id,event_id")
    }

    // MARK: Plans

    var myPlanCount: Int { plans.filter { $0.created_by == uid }.count }
    var attachedCount: Int { hive.filter { $0.bonded == true }.count }

    enum PlanError: Error { case message(String) }

    /// Writes a plan (new or edited) and answers its id, or the refusal worded
    /// off the error CODE (planErrorText).
    func savePlan(editing: Event?, title: String, district: String, place: String, at: Date) async -> Result<String, PlanError> {
        guard let uid else { return .failure(.message(L.t("plan.err", lang))) }
        var row: [String: Any] = [
            "title": title,
            "neighborhood": district,
            "location": place.isEmpty ? NSNull() : place,
            "event_date": IstDate.isoString(at),
        ]
        struct IDRow: Decodable { let id: String }
        do {
            let id: String
            if let editing {
                let rows = try await sb.update("events", row, [.eq("id", editing.id), .select("id")], returning: IDRow.self)
                guard let r = rows.first else { return .failure(.message(L.t("plan.err.edit.missing", lang))) }
                id = r.id
            } else {
                row["audience"] = "petek"
                row["created_by"] = uid
                let rows = try await sb.insert("events", [row], returning: IDRow.self)
                id = rows.first?.id ?? ""
            }
            await loadEvents()
            return .success(id)
        } catch let e as SupabaseError {
            switch e.code {
            case "42501": return .failure(.message(L.t(editing == nil && myPlanCount >= Config.planMax ? "plan.err.full" : "plan.err.rls", lang)))
            case "PGRST204", "42703": return .failure(.message(L.t("plan.err.missing", lang)))
            default: return .failure(.message(L.t("plan.err", lang)))
            }
        } catch {
            return .failure(.message(L.t("plan.err", lang)))
        }
    }

    func deletePlan(_ ev: Event) async {
        try? await sb.delete("events", [.eq("id", ev.id)])
        closeCard()
        await loadEvents()
    }

    // MARK: The petek's codes

    struct Offer: Decodable { let code: String; let expires_at: String }

    func offerSeat(dir: Int) async -> Offer? {
        let rows: [Offer]? = try? await sb.rpc("hive_offer_slot", ["p_dir": dir])
        return rows?.first
    }

    /// Answers nil on success, or the worded refusal.
    func claim(code: String) async -> String? {
        let c = code.trimmingCharacters(in: .whitespaces).uppercased()
        guard c.count == 6 else { return L.t("profile.hive.err.short", lang) }
        struct R: Decodable { let status: String; let member_id: String? }
        do {
            let rows: [R] = try await sb.rpc("hive_claim_slot", ["p_code": c])
            let status = rows.first?.status ?? "failed"
            if status == "ok" {
                await loadHive()
                await loadEvents()   // a new bond brings the new neighbour's plans in at once
                return nil
            }
            return L.t("profile.hive.err." + status, lang)
        } catch {
            return L.t("profile.hive.err.failed", lang)
        }
    }

    // MARK: Language

    func setLang(_ l: Lang) {
        lang = l
        guard let uid else { return }
        Task { _ = try? await sb.update("profiles", ["language_pref": l.rawValue], [.eq("id", uid)], returning: Profile.self) }
    }
}

#if DEBUG
extension AppModel {
    /// `-demoHome` launch argument: sample data so the home screen's layout can
    /// be checked in the simulator without an account. Never in release builds.
    func loadDemo() {
        uid = "me"
        profile = Profile(id: "me", first_name: "Cem", last_name: "Öztürk", neighborhood: "atasehir",
                          referral_code: "DEMO1234", joined_at: "2026-07-15T12:00:00Z", language_pref: nil,
                          avatar_hair: "short", avatar_shirt: "black", avatar_accessory: nil)
        func ev(_ id: String, _ t: String, _ d: String, _ day: Int, _ h: Int, plan: Bool = false) -> Event {
            let at = IstDate.calendar.date(bySettingHour: h, minute: 0, second: 0, of: IstDate.midnight(day))!
            return Event(id: id, title: t, title_en: nil, description: "Moda sahilinde akşam buluşması; çay, tavla ve gün batımı.",
                         description_en: nil, neighborhood: d, location: plan ? "Moda Çay Bahçesi" : nil,
                         event_date: IstDate.isoString(at), kefil_id: plan ? nil : "f1", audience: plan ? "petek" : "city",
                         created_by: plan ? "f2" : nil, edition_order: 0)
        }
        events = [ev("e1", "Kadıköy'de film gecesi", "kadikoy", 0, 21), ev("e2", "Beşiktaş konseri", "besiktas", 2, 20),
                  ev("e3", "Fatih yürüyüşü", "fatih", 3, 18), ev("e4", "Pendik pazar", "pendik", 1, 11)]
        plans = [ev("p1", "Moda'da çay", "uskudar", 0, 19, plan: true)]
        plansOpen = true
        hive = [
            HiveCell(member_id: "f1", q: 1, r: -1, first_name: "Ayşe", last_name: "K", neighborhood: "besiktas", avatar_hair: "long", bonded: true),
            HiveCell(member_id: "f2", q: -1, r: 0, first_name: "Mert", last_name: "D", neighborhood: "uskudar", avatar_hair: "buzz", bonded: true),
            HiveCell(member_id: "f3", q: 0, r: 1, first_name: "Deniz", last_name: "A", neighborhood: "sisli", avatar_hair: "curly-long", avatar_accessory: "glasses", bonded: true),
            HiveCell(member_id: "f4", q: 1, r: 1, first_name: "Can", last_name: "B", neighborhood: "fatih", bonded: false),
        ]
        for c in hive { people[c.member_id] = PersonRef(id: c.member_id, first_name: c.first_name, last_name: c.last_name, neighborhood: c.neighborhood) }
        hiveLoaded = true
        games = [GameSlot(index: 0, game: GameRef.catalog["sozcel"], state: .play),
                 GameSlot(index: 1, game: GameRef.catalog["tumcel"], state: .done)]
        phase = .signedIn
    }
}
#endif
