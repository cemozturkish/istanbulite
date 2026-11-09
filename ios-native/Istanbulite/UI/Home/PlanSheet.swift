import SwiftUI

/// "+ BİR YERE GİDİYORUM": the reader's week (what they said they are going to,
/// and their own plans), and the form that puts a plan up for their petek.
struct PlanSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.theme) private var theme
    @Environment(\.lang) private var lang
    @Environment(\.dismiss) private var dismiss

    /// Opening straight onto the form (a plan's own DÜZENLE on its card).
    var editing: Event?
    var onShow: (Event) -> Void

    @State private var path: [Route] = []

    enum Route: Hashable { case form(String?) }

    var body: some View {
        NavigationStack(path: $path) {
            week
                .navigationDestination(for: Route.self) { r in
                    switch r {
                    case .form(let id):
                        PlanForm(editing: id.flatMap { id in model.plans.first { $0.id == id } }) { saved in
                            // An edit made from the list goes back to the list; anything
                            // else puts the sheet away and shows the plan on the map.
                            if id != nil && editing == nil { path.removeAll() }
                            else if let saved { dismiss(); onShow(saved) }
                        }
                    }
                }
        }
        .tint(theme.ink)
        .onAppear { if let editing { path = [.form(editing.id)] } }
    }

    private var weekItems: [Event] {
        let goingEvs = (model.events + model.plans).filter { model.going.contains($0.id) && $0.created_by != model.uid }
        let mine = model.plans.filter { $0.created_by == model.uid }
        return (goingEvs + mine).sorted { $0.date < $1.date }
    }

    private var week: some View {
        List {
            Section {
                Text(L.t("plan.week.sub", lang)).font(.subheadline).foregroundStyle(theme.muted)
                if model.plansOpen {
                    Text(L.t("plan.week.count", lang, model.myPlanCount)).font(.footnote.weight(.semibold)).foregroundStyle(theme.muted)
                }
            }
            .listRowBackground(Color.clear)

            if weekItems.isEmpty {
                Text(L.t("plan.week.empty", lang)).font(.subheadline).foregroundStyle(theme.ink)
                    .listRowBackground(theme.card)
            } else {
                let byDay = Dictionary(grouping: weekItems) { IstDate.dayIndex(of: $0.date) }
                ForEach(byDay.keys.sorted(), id: \.self) { day in
                    Section(IstDate.dayLabel(byDay[day]![0].date, lang: lang)) {
                        ForEach(byDay[day]!) { ev in row(ev) }
                    }
                }
            }

            if model.plansOpen {
                Button(L.t("plan.week.new", lang)) { path.append(.form(nil)) }
                    .font(.headline.weight(.heavy)).foregroundStyle(theme.red)
                    .disabled(model.myPlanCount >= Config.planMax)
                    .listRowBackground(theme.card)
            }
        }
        .scrollContentBackground(.hidden)
        .background(theme.paper)
        .navigationTitle(L.t("plan.week.title", lang))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .topBarTrailing) { Button(L.t("close", lang)) { dismiss() } } }
    }

    private func row(_ ev: Event) -> some View {
        let mine = ev.created_by == model.uid
        return Button {
            if mine { path.append(.form(ev.id)) } else { dismiss(); onShow(ev) }
        } label: {
            VStack(alignment: .leading, spacing: 3) {
                Text((mine ? L.t("plan.week.mine", lang) : L.t("plan.week.going", lang)) + " · " +
                     Districts.name(ev.neighborhood).trUpper + " · " + IstDate.hhmm(ev.date))
                    .kicker(theme, red: !mine)
                Text(ev.titleText(lang)).font(.body.weight(.bold)).foregroundStyle(theme.ink)
            }
        }
        .listRowBackground(theme.card)
    }
}

struct PlanForm: View {
    @Environment(AppModel.self) private var model
    @Environment(\.theme) private var theme
    @Environment(\.lang) private var lang

    let editing: Event?
    var done: (Event?) -> Void

    @State private var what = ""
    @State private var district = ""
    @State private var place = ""
    @State private var day = 0
    @State private var time = IstDate.calendar.date(bySettingHour: 20, minute: 0, second: 0, of: Date()) ?? Date()
    @State private var error: String?
    @State private var busy = false

    var body: some View {
        Form {
            Section(L.t("plan.what", lang)) {
                TextField(L.t("plan.what.ph", lang), text: $what)
                    .onChange(of: what) { _, v in if v.count > 80 { what = String(v.prefix(80)) } }
            }
            Section(L.t("plan.where", lang)) {
                Picker(L.t("plan.district", lang), selection: $district) {
                    Text("—").tag("")
                    ForEach(model.neighborhoods.filter { $0.id != "istanbul_disi" }) { Text($0.name_tr).tag($0.id) }
                }
                TextField(L.t("plan.place.ph", lang), text: $place)
                    .onChange(of: place) { _, v in if v.count > 80 { place = String(v.prefix(80)) } }
            }
            Section(L.t("plan.when", lang)) {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(0..<Config.homeDays, id: \.self) { i in
                            let d = IstDate.midnight(i)
                            Button(IstDate.dayLabel(d, lang: lang)) { day = i }
                                .font(.caption.weight(.heavy))
                                .padding(.horizontal, 10).padding(.vertical, 7)
                                .foregroundStyle(day == i ? theme.cardHi : theme.ink)
                                .background(day == i ? theme.ink : theme.card)
                                .overlay(Rectangle().strokeBorder(theme.ink, lineWidth: 1.5))
                                .buttonStyle(.plain)
                        }
                    }
                }
                DatePicker(L.t("plan.time", lang), selection: $time, displayedComponents: .hourAndMinute)
                    .environment(\.timeZone, IstDate.tz)
            }
            Section {
                Text(editing == nil ? L.t("plan.who", lang, model.attachedCount) : L.t("plan.edit.moved", lang))
                    .font(.footnote).foregroundStyle(theme.muted)
                if let error { Text(error).font(.footnote.weight(.bold)).foregroundStyle(theme.red) }
                Button {
                    Task { await save() }
                } label: {
                    Text((busy ? L.t(editing == nil ? "plan.sending" : "plan.saving", lang)
                               : L.t(editing == nil ? "plan.send" : "plan.save", lang)).trUpper)
                }
                .buttonStyle(BoxButtonStyle(filled: true))
                .listRowBackground(Color.clear)
                .disabled(busy)
            }
        }
        .scrollContentBackground(.hidden)
        .background(theme.paper)
        .navigationTitle(L.t(editing == nil ? "plan.title" : "plan.edit.title", lang))
        .navigationBarTitleDisplayMode(.inline)
        .task { await model.loadNeighborhoods(); fill() }
    }

    private func fill() {
        guard let e = editing else { district = model.profile?.neighborhood ?? ""; return }
        what = e.title
        district = e.neighborhood ?? ""
        place = e.location ?? ""
        day = max(0, min(Config.homeDays - 1, IstDate.dayIndex(of: e.date)))
        time = e.date
    }

    private func save() async {
        let t = what.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty else { error = L.t("plan.err.what", lang); return }
        guard !district.isEmpty else { error = L.t("plan.err.district", lang); return }
        let hm = IstDate.calendar.dateComponents([.hour, .minute], from: time)
        guard let at = IstDate.calendar.date(bySettingHour: hm.hour ?? 20, minute: hm.minute ?? 0, second: 0, of: IstDate.midnight(day)) else { return }
        guard at.timeIntervalSinceNow > -60 else { error = L.t("plan.err.past", lang); return }
        if editing == nil && model.myPlanCount >= Config.planMax { error = L.t("plan.err.full", lang); return }
        error = nil; busy = true; defer { busy = false }
        switch await model.savePlan(editing: editing, title: t, district: district, place: place.trimmingCharacters(in: .whitespaces), at: at) {
        case .success(let id): done(model.plans.first { $0.id == id })
        case .failure(.message(let m)): error = m
        }
    }
}
