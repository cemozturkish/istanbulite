import SwiftUI

/// The drawn hexagon inside a cell's 1024×1536 box (assets/frame.png).
struct HexShape: Shape {
    func path(in r: CGRect) -> Path {
        let pts: [(CGFloat, CGFloat)] = [(512, 186), (899, 410), (899, 1125), (512, 1350), (125, 1125), (125, 410)]
        var p = Path()
        for (i, (x, y)) in pts.enumerated() {
            let pt = CGPoint(x: r.minX + x / 1024 * r.width, y: r.minY + y / 1536 * r.height)
            i == 0 ? p.move(to: pt) : p.addLine(to: pt)
        }
        p.closeSubpath()
        return p
    }
}

/// Directions 0–5 exactly as `hive_dir()` numbers them (HIVE_DIRS in profile-card.js).
let hiveDirs: [(Int, Int)] = [(0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1)]

/// The layered avatar on the hexframe canvas (avatar.js): base, shirt, hair, glasses.
struct AvatarStack: View {
    var hair: String?
    var shirt: String?
    var accessory: String?

    var body: some View {
        ZStack {
            Image("avatar-base").resizable()
            Image(shirt == "black" ? "avatar-shirt-black" : "avatar-shirt-white").resizable()
            if let hair, ["buzz", "short", "long", "curly-long"].contains(hair) {
                Image("avatar-hair-" + hair).resizable()
            }
            if accessory == "glasses" { Image("avatar-accessory-glasses").resizable() }
        }
    }
}

/// One hexagon of the petek: a member, the reader, a free seat or empty field.
struct HexCell: View {
    enum Kind { case me, member(HiveCell), seat(dir: Int), field }
    @Environment(\.theme) private var theme
    @Environment(\.lang) private var lang

    let kind: Kind
    let width: CGFloat
    var ring: Color
    var faded = false
    var tag: String?
    var name: String?
    var seatCode: (code: String, minutes: Int)?

    var body: some View {
        ZStack {
            HexShape().fill(Color(hex: 0xDCDBDB).opacity(isField ? 0 : 1))
            content.clipShape(HexShape())
            Image("frame").resizable().renderingMode(.template).foregroundStyle(ring)
        }
        .frame(width: width, height: width * 1.5)
        .opacity(faded ? 0.42 : 1)
        .overlay(alignment: .bottom) {
            VStack(spacing: 1) {
                if let name {
                    Text(name).font(.system(size: max(9, width * 0.13), weight: .heavy))
                        .foregroundStyle(theme.ink).lineLimit(1).minimumScaleFactor(0.7)
                }
                if let tag {
                    Text(tag).font(.system(size: max(7, width * 0.09), weight: .black))
                        .foregroundStyle(theme.red)
                }
            }
            .padding(.horizontal, 4).padding(.vertical, 1)
            .background(theme.paper.opacity(name == nil && tag == nil ? 0 : 0.88))
            .frame(maxWidth: width * 0.74)
            // Inside the drawn hexagon, above its foot, so the row below never covers it.
            .offset(y: -width * 1.5 * 0.15)
        }
    }

    private var isField: Bool { if case .field = kind { return true }; return false }

    @ViewBuilder private var content: some View {
        switch kind {
        case .me: EmptyView()
        case .member(let c): AvatarStack(hair: c.avatar_hair, shirt: c.avatar_shirt, accessory: c.avatar_accessory)
        case .seat:
            ZStack {
                theme.paper.opacity(0.9)
                if let seatCode {
                    VStack(spacing: width * 0.04) {
                        Text(seatCode.code).font(.system(size: width * 0.17, weight: .black, design: .monospaced))
                            .foregroundStyle(theme.ink).minimumScaleFactor(0.5).lineLimit(1)
                        Text(L.t("hive.seat.left", lang, seatCode.minutes))
                            .font(.system(size: width * 0.09, weight: .bold)).foregroundStyle(theme.muted)
                    }
                    .padding(.horizontal, width * 0.14)
                } else {
                    Image(systemName: "plus").font(.system(size: width * 0.28, weight: .bold)).foregroundStyle(theme.muted)
                }
            }
        case .field: EmptyView()
        }
    }
}

/// The petek drawn from where the reader stands: them in the middle, the six
/// places touching them, and (with the whole petek up) everyone on their map.
struct PetekView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.theme) private var theme
    @Environment(\.lang) private var lang

    let whole: Bool
    let rect: CGRect
    let geo: MapGeometry?

    @State private var offers: [Int: (code: String, expires: Date)] = [:]
    @State private var claiming = false
    @State private var claimCode = ""
    @State private var claimError: String?
    @State private var now = Date()

    private struct Placed: Identifiable {
        let id: String
        let q: Int, r: Int
        let kind: HexCell.Kind
    }

    private var cells: [Placed] {
        let members = model.hive.filter { whole || ring($0.q, $0.r) <= 1 }
        var out: [Placed] = [Placed(id: "me", q: 0, r: 0, kind: .me)]
        out += members.map { Placed(id: $0.member_id, q: $0.q, r: $0.r, kind: .member($0)) }
        let taken = Set(model.hive.map { "\($0.q),\($0.r)" })
        for (i, d) in hiveDirs.enumerated() where !taken.contains("\(d.0),\(d.1)") {
            out.append(Placed(id: "seat\(i)", q: d.0, r: d.1, kind: .seat(dir: i)))
        }
        return out
    }

    private func ring(_ q: Int, _ r: Int) -> Int { (abs(q) + abs(r) + abs(q + r)) / 2 }

    // Packing in units of the cell width (profile-card.css: step-x 0.807, step-y 0.961).
    private func unitPos(_ q: Int, _ r: Int) -> CGPoint { CGPoint(x: 0.807 * (CGFloat(q) + CGFloat(r) / 2), y: 0.961 * CGFloat(r)) }

    /// The largest cell that fits the window, standing on its floor with the
    /// reader centred across — and, on the home map, every roof under the coast.
    private func layout() -> (w: CGFloat, origin: CGPoint) {
        let ps = cells.map { unitPos($0.q, $0.r) }
        let minX = ps.map(\.x).min() ?? 0, maxX = ps.map(\.x).max() ?? 0
        let minY = ps.map(\.y).min() ?? 0, maxY = ps.map(\.y).max() ?? 0
        // Room about the reader: the drawing is centred on them, not on its box.
        let halfSpan = max(abs(minX), abs(maxX)) * 2 + 1.0
        let spanY = (maxY - minY) + 1.5
        var w = min(rect.width / halfSpan, rect.height / spanY, whole ? 96 : 118)
        func origin(_ w: CGFloat) -> CGPoint {
            CGPoint(x: rect.midX, y: rect.maxY - (maxY + 1.5) * w)
        }
        if let geo, !whole {
            // Halve toward the largest cell whose roofs stand under the land.
            var lo: CGFloat = 20, hi = w
            for _ in 0..<12 {
                let mid = (lo + hi) / 2
                let o = origin(mid)
                let ok = ps.allSatisfy { p in
                    let cx = o.x + p.x * mid, top = o.y + p.y * mid + mid * 1.5 * (186 / 1536)
                    let shoulderY = o.y + p.y * mid + mid * 1.5 * (404 / 1536)
                    return top > geo.coastY(atScreenX: cx) + 8
                        && shoulderY > geo.coastY(atScreenX: cx - mid * 0.378) + 8
                        && shoulderY > geo.coastY(atScreenX: cx + mid * 0.378) + 8
                }
                if ok { lo = mid } else { hi = mid }
            }
            w = lo
        }
        return (w, origin(w))
    }

    var body: some View {
        let (w, o) = layout()
        ZStack(alignment: .topLeading) {
            ForEach(cells) { c in
                let p = unitPos(c.q, c.r)
                cellView(c, width: w)
                    .position(x: o.x + p.x * w, y: o.y + p.y * w + w * 0.75)
            }
        }
        .frame(width: rect.maxX, height: rect.maxY, alignment: .topLeading)
        .animation(.spring(duration: 0.5, bounce: 0.15), value: w)
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(20))
                now = Date()
                offers = offers.filter { $0.value.expires > now }
            }
        }
        .alert(L.t("profile.hive.claimprompt", lang), isPresented: $claiming) {
            TextField("ABC123", text: $claimCode)
                .textInputAutocapitalization(.characters).autocorrectionDisabled()
            Button(L.t("auth.continue", lang)) { Task { await claim() } }
            Button(L.t("close", lang), role: .cancel) {}
        } message: {
            if let claimError { Text(claimError) }
        }
    }

    @ViewBuilder private func cellView(_ c: Placed, width w: CGFloat) -> some View {
        switch c.kind {
        case .me:
            Button { claimError = nil; claimCode = ""; claiming = true } label: {
                HexCell(kind: .member(meAsCell), width: w, ring: model.pickedMember == nil ? theme.ink : theme.ink.opacity(0.8),
                        tag: guestTag(model.uid), name: whole ? nil : (model.profile?.first_name ?? "").trUpper)
            }
            .buttonStyle(PressScale())
        case .member(let m):
            Button {
                model.pickedMember = model.pickedMember?.member_id == m.member_id ? nil : m
            } label: {
                HexCell(kind: .member(m), width: w, ring: ringColor(for: m),
                        faded: model.guestList[m.member_id] == .no || (m.bonded != true && !whole && model.openDistrict == nil),
                        tag: guestTag(m.member_id), name: whole ? nil : (m.first_name ?? "").trUpper)
            }
            .buttonStyle(PressScale())
        case .seat(let dir):
            Button { Task { await offer(dir) } } label: {
                let o = offers[dir]
                HexCell(kind: .seat(dir: dir), width: w, ring: theme.muted.opacity(0.6),
                        seatCode: o.map { ($0.code, max(1, Int(ceil($0.expires.timeIntervalSince(now) / 60)))) })
            }
            .buttonStyle(PressScale())
        case .field:
            EmptyView()
        }
    }

    private var meAsCell: HiveCell {
        HiveCell(member_id: model.uid ?? "me", q: 0, r: 0, first_name: model.profile?.first_name, last_name: model.profile?.last_name,
                 neighborhood: model.profile?.neighborhood, avatar_hair: model.profile?.avatar_hair, avatar_hat: nil,
                 avatar_accessory: model.profile?.avatar_accessory, avatar_shirt: model.profile?.avatar_shirt)
    }

    private func ringColor(for m: HiveCell) -> Color {
        if model.pickedMember?.member_id == m.member_id { return theme.red }
        switch model.guestList[m.member_id] {
        case .kefil, .go: return theme.red
        default: break
        }
        if model.openDistrict != nil { return theme.muted.opacity(0.7) }
        return m.bonded == true ? Color(hex: 0x3A3A3A) : theme.muted
    }

    private func guestTag(_ id: String?) -> String? {
        guard let id, model.openDistrict != nil else { return nil }
        if id == model.uid, let ev = model.openEvent {
            if ev.created_by == model.uid { return L.t("plan.kefil", lang) }
            return model.mine(ev) == .go ? L.t("hive.go", lang) : nil
        }
        switch model.guestList[id] {
        case .kefil: return L.t("plan.kefil", lang)
        case .go: return L.t("hive.go", lang)
        case .no: return L.t("hive.no", lang)
        case nil: return nil
        }
    }

    private func offer(_ dir: Int) async {
        if offers[dir] != nil { offers[dir] = nil; return }    // pressing the open one folds it back
        guard let o = await model.offerSeat(dir: dir), let exp = IstDate.parse(o.expires_at) else { return }
        now = Date()
        offers[dir] = (o.code, exp)
    }

    private func claim() async {
        if let err = await model.claim(code: claimCode) {
            claimError = err
            claiming = true
        }
    }
}

/// The hexagon gives way under the finger and pops back (`.ist-hive-cell-pressing`).
struct PressScale: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.955 : 1)
            .animation(.spring(duration: 0.18), value: configuration.isPressed)
    }
}
