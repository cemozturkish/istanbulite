import SwiftUI

/// The launch app is one screen (project.html with HOME_SCREEN on): the
/// İstanbul drawing with the week's evenings on it, the petek standing in the
/// sea under the coast, the plan button and today's two games at the foot,
/// between the two charcoal bars.
struct HomeView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.theme) private var theme
    @Environment(\.lang) private var lang

    @State private var showMe = false
    @State private var memberSheet: HiveCell?
    @State private var planSheet = false
    @State private var planEditing: Event?
    @State private var game: GameRef?
    @State private var cardHeight: CGFloat = 200

    private let topBarBody: CGFloat = 54
    private let bottomBarBody: CGFloat = 46

    var body: some View {
        GeometryReader { proxy in
            let safe = proxy.safeAreaInsets
            let size = CGSize(width: proxy.size.width, height: proxy.size.height + safe.top + safe.bottom)
            let topBar = safe.top + topBarBody
            let bottomBar = safe.bottom + bottomBarBody
            let geo = MapGeometry(size: size, topBar: topBar)
            let footH: CGFloat = (model.plansOpen ? 52 : 0) + 64
            let floor = size.height - bottomBar - footH - 6
            let coastTop = geo.coastY(atScreenX: size.width / 2)

            ZStack(alignment: .topLeading) {
                theme.sea

                MapLayer(geo: geo, topBar: topBar)
                    .opacity(model.wholePetek ? 0 : 1)
                    .offset(y: model.wholePetek ? -24 : 0)
                    .allowsHitTesting(!model.wholePetek)

                if model.wholePetek {
                    theme.paper.opacity(0.0001)
                        .contentShape(Rectangle())
                        .onTapGesture { withAnimation(.easeInOut(duration: 0.35)) { model.wholePetek = false } }
                }

                PetekView(whole: model.wholePetek,
                          rect: model.wholePetek
                            ? CGRect(x: 12, y: topBar + 12, width: size.width - 24, height: size.height - topBar - bottomBar - 24)
                            : CGRect(x: 12, y: min(coastTop, floor - 120), width: size.width - 24, height: max(120, floor - min(coastTop, floor - 120))),
                          geo: model.wholePetek ? nil : geo)

                foot(width: size.width)
                    .frame(width: size.width)
                    .offset(y: size.height - bottomBar - footH - 4)
                    .opacity(model.wholePetek ? 0 : 1)
                    .offset(y: model.wholePetek ? 140 : 0)

                if let ev = model.openEvent, !model.wholePetek {
                    card(ev, geo: geo, topBar: topBar, width: size.width)
                }

                TopBar(height: topBar, onMe: { showMe = true }, onMember: { memberSheet = $0 })
                BottomBar(height: bottomBar)
                    .offset(y: size.height - bottomBar)
            }
            .frame(width: size.width, height: size.height)
            .ignoresSafeArea()
            .animation(.easeInOut(duration: 0.35), value: model.wholePetek)
            .animation(.spring(duration: 0.3), value: model.openEvent?.id)
        }
        .sheet(isPresented: $showMe) { MyProfileSheet().presentationDetents([.large]) }
        .sheet(item: $memberSheet) { MemberSheet(member: $0).presentationDetents([.medium, .large]) }
        .sheet(isPresented: $planSheet) {
            PlanSheet(editing: planEditing) { ev in
                if let d = ev.neighborhood { model.openCard(d, kind: ev.isPlan ? .plan : .city, eventID: ev.id) }
            }
            .presentationDetents([.large])
        }
        .sheet(item: $game) { g in
            GameSheet(game: g).presentationDetents([.large]).interactiveDismissDisabled(false)
        }
        .refreshable { await model.loadAll() }
    }

    // MARK: The card pinned to its dot

    @ViewBuilder
    private func card(_ ev: Event, geo: MapGeometry, topBar: CGFloat, width: CGFloat) -> some View {
        let anchor = model.openDistrict.flatMap { MapLayer.anchor(for: $0, kind: model.openKind, geo: geo, topBar: topBar) }
        // Above the dot when there is room under the top bar, else below it.
        let top: CGFloat = {
            guard let a = anchor else { return topBar + 10 }
            if a.y - 18 - cardHeight > topBar + 6 { return a.y - 18 - cardHeight }
            return a.y + 18
        }()
        EventCard(ev: ev) { e in planEditing = e; planSheet = true }
            .onGeometryChange(for: CGFloat.self, of: { $0.size.height }) { cardHeight = $0 }
            .padding(.horizontal, 14)
            .frame(width: width)
            .offset(y: top)
            .transition(.scale(scale: 0.92, anchor: .bottom).combined(with: .opacity))
            .id(ev.id)
    }

    // MARK: The plan button and today's games

    private func foot(width: CGFloat) -> some View {
        VStack(spacing: 10) {
            if model.plansOpen {
                Button {
                    planEditing = nil
                    planSheet = true
                } label: {
                    Text("+ " + L.t("plan.add", lang).trUpper)
                }
                .buttonStyle(BoxButtonStyle())
            }
            HStack(spacing: 12) {
                ForEach(model.games.isEmpty ? [GameSlot(index: 0, game: nil, state: .off), GameSlot(index: 1, game: nil, state: .off)] : model.games) { slot in
                    gameButton(slot)
                }
            }
        }
        .padding(.horizontal, 16)
    }

    private func gameButton(_ slot: GameSlot) -> some View {
        Button {
            if let g = slot.game, slot.state != .off { game = g }
        } label: {
            VStack(spacing: 2) {
                Text(slot.game?.title.trUpper ?? "—").font(.system(size: 17, weight: .black))
                Text(L.t(slot.state == .off ? "home.off" : slot.state == .done ? "home.played" : "home.play", lang).trUpper)
                    .font(.system(size: 10, weight: .heavy)).foregroundStyle(slot.state == .play ? theme.red : theme.muted)
            }
            .frame(height: 54)
        }
        .buttonStyle(BoxButtonStyle())
        .opacity(slot.state == .off ? 0.55 : 1)
        .disabled(slot.state == .off)
    }
}

/// Who is here: you, or the member you pressed on the petek. Pressing the
/// name opens that person.
struct TopBar: View {
    @Environment(AppModel.self) private var model
    @Environment(\.theme) private var theme
    let height: CGFloat
    var onMe: () -> Void
    var onMember: (HiveCell) -> Void

    var body: some View {
        let picked = model.pickedMember
        let name = picked.map { [$0.first_name, $0.last_name].compactMap { $0 }.joined(separator: " ") } ?? model.profile?.fullName ?? ""
        let district = picked?.neighborhood ?? model.profile?.neighborhood
        ZStack(alignment: .bottom) {
            theme.bar
            Button {
                if let picked { onMember(picked) } else { onMe() }
            } label: {
                VStack(spacing: 2) {
                    Text(name.trUpper).font(.system(size: 17, weight: .black)).foregroundStyle(theme.barLabelOn)
                        .lineLimit(1).minimumScaleFactor(0.7)
                    Text(Districts.name(district).trUpper).font(.system(size: 10, weight: .heavy)).tracking(0.6)
                        .foregroundStyle(theme.barLabel)
                    Rectangle().fill(picked == nil ? .clear : theme.red).frame(width: 28, height: 2).padding(.top, 2)
                }
                .padding(.horizontal, 30)
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .padding(.bottom, 6)
        }
        .frame(height: height)
        .animation(.easeInOut(duration: 0.2), value: picked?.member_id)
    }
}

/// The compass bar, with the one thing on it that is pressed: the logo. A tap
/// opens the whole petek; a hold fills the sea in the mark and flips the language.
struct BottomBar: View {
    @Environment(AppModel.self) private var model
    @Environment(\.theme) private var theme
    @Environment(\.lang) private var lang
    let height: CGFloat

    @State private var frame = 1
    @State private var holding = false
    @State private var holdTask: Task<Void, Never>?
    @State private var said: String?

    var body: some View {
        ZStack(alignment: .top) {
            theme.bar
            Image(String(format: "logo-%02d", holding ? frame : 1))
                .resizable().scaledToFit()
                .frame(height: 40)
                .blendMode(.screen)
                .overlay {
                    if model.wholePetek {
                        Rectangle().fill(theme.red).frame(height: 2).offset(y: 24)
                    }
                }
                .padding(.top, 4)
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
                .onTapGesture { model.wholePetek.toggle(); if model.wholePetek { model.closeCard() } }
                .onLongPressGesture(minimumDuration: 2.0, maximumDistance: 30) {
                    commit()
                } onPressingChanged: { pressing in
                    pressing ? startHold() : cancelHold()
                }
                .accessibilityLabel("İstanbulite")
                .accessibilityAction(named: L.t(lang == .tr ? "lang.more_english" : "lang.default", lang.toggled)) { commit() }

            if let said {
                Text(said).font(.system(size: 13, weight: .black)).foregroundStyle(theme.barLabelOn)
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(theme.red)
                    .offset(y: -36)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
            }
        }
        .frame(height: height)
    }

    /// After half a second the sea starts rising, ten drawn frames over 1.5s.
    private func startHold() {
        holdTask?.cancel()
        holdTask = Task {
            try? await Task.sleep(for: .milliseconds(500))
            guard !Task.isCancelled else { return }
            holding = true
            let start = Date()
            while !Task.isCancelled {
                let t = Date().timeIntervalSince(start) / 1.5
                frame = min(10, 1 + Int(t * 9))
                if t >= 1 { break }
                try? await Task.sleep(for: .milliseconds(30))
            }
        }
    }

    private func cancelHold() {
        holdTask?.cancel()
        withAnimation(.easeOut(duration: 0.25)) { holding = false }
        frame = 1
    }

    private func commit() {
        frame = 10
        let next = model.lang.toggled
        model.setLang(next)
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        withAnimation { said = L.t(next == .tr ? "lang.default" : "lang.more_english", next) }
        Task {
            try? await Task.sleep(for: .seconds(1.4))
            withAnimation { said = nil }
            holding = false
            frame = 1
        }
    }
}
