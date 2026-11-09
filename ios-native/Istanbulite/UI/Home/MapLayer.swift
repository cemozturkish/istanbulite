import SwiftUI

/// The İstanbul drawing with what is on this week: friends' districts in gray,
/// every district with an evening in red, the open one breathing, and a dot
/// per district (red ring = later, filled = today, solid = a friend's plan).
struct MapLayer: View {
    @Environment(AppModel.self) private var model
    @Environment(\.theme) private var theme
    @Environment(\.lang) private var lang
    let geo: MapGeometry
    let topBar: CGFloat

    @State private var breathe = false

    var body: some View {
        ZStack(alignment: .topLeading) {
            Image("istanbul-map")
                .resizable()
                .frame(width: DistrictShapes.canvas.width * geo.scale, height: DistrictShapes.canvas.height * geo.scale)
                .colorMultiply(theme.mapMultiply)
                .offset(x: geo.origin.x, y: geo.origin.y)

            fills
            dots
            edgeTags
        }
        .frame(width: geo.size.width, height: geo.size.height, alignment: .topLeading)
        .contentShape(Rectangle())
        .onTapGesture { loc in
            if let d = geo.district(at: loc, among: model.eventDistricts) {
                model.openCard(d)
            } else if model.openDistrict != nil {
                model.closeCard()
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 0.95).repeatForever(autoreverses: true)) { breathe = true }
        }
    }

    // MARK: Fills

    private var friendDistricts: Set<String> {
        Set(model.hive.filter { abs($0.q) + abs($0.r) + abs($0.q + $0.r) == 2 }.compactMap(\.neighborhood))
    }

    private var fills: some View {
        let focus = model.openDistrict
        let red = model.eventDistricts
        let pick = model.pickedMember?.neighborhood
        let home = model.profile?.neighborhood
        return ZStack(alignment: .topLeading) {
            ForEach(Array(friendDistricts.subtracting(red)), id: \.self) { d in
                geo.path(for: d).fill(theme.friendFill.opacity(0.85))
            }
            if let home, !red.contains(home) {
                geo.path(for: home).fill(theme.homeFill.opacity(0.85))
            }
            ForEach(Array(red), id: \.self) { d in
                if d != focus && d != pick {
                    geo.path(for: d).fill(theme.red.opacity(focus == nil ? 0.78 : 0.3))
                }
            }
            if let pick, pick != focus {
                geo.path(for: pick).fill(theme.pickFill)
            }
            if let focus {
                geo.path(for: focus).fill(theme.red.opacity(breathe ? 0.95 : 0.6))
            }
        }
        .allowsHitTesting(false)
    }

    // MARK: Dots

    private struct Marker: Identifiable {
        let district: String
        let kind: AppModel.EventKind
        let count: Int
        let today: Bool
        var id: String { district + (kind == .city ? "c" : "p") }
    }

    private var markers: [Marker] {
        var out: [Marker] = []
        for (kind, list) in [(AppModel.EventKind.city, model.events), (.plan, model.plans)] {
            let byDistrict = Dictionary(grouping: list.filter { $0.neighborhood != nil }, by: { $0.neighborhood! })
            for (d, evs) in byDistrict {
                out.append(Marker(district: d, kind: kind, count: evs.count,
                                  today: evs.contains { IstDate.dayIndex(of: $0.date) == 0 }))
            }
        }
        return out.sorted { $0.id < $1.id }
    }

    private func screenPoint(_ m: Marker) -> CGPoint? {
        guard let c = DistrictShapes.centroids[m.district] else { return nil }
        var p = geo.point(c)
        // A district carrying both kinds stands them side by side.
        let both = markers.contains { $0.district == m.district && $0.kind != m.kind }
        if both { p.x += m.kind == .city ? -11 : 11 }
        return geo.onScreen(p) && p.y > topBar ? p : nil
    }

    private var dots: some View {
        ForEach(markers) { m in
            if let p = screenPoint(m) {
                dot(m)
                    .position(p)
                    .onTapGesture {
                        if model.openDistrict == m.district && model.openKind == m.kind { model.closeCard() }
                        else { model.openCard(m.district, kind: m.kind) }
                    }
            }
        }
    }

    @ViewBuilder private func dot(_ m: Marker) -> some View {
        let size: CGFloat = m.count > 1 ? 22 : 15
        ZStack {
            if m.kind == .plan {
                Circle().fill(theme.red)
                    .shadow(color: m.today ? theme.red.opacity(0.6) : .clear, radius: 6)
            } else if m.today {
                Circle().fill(theme.red).overlay(Circle().strokeBorder(theme.paper, lineWidth: 2.5))
            } else {
                Circle().fill(theme.paper).overlay(Circle().strokeBorder(theme.red, lineWidth: 3.5))
            }
            if m.count > 1 {
                Text("\(m.count)").font(.system(size: 11, weight: .black))
                    .foregroundStyle(m.kind == .plan || m.today ? theme.paper : theme.red)
            }
        }
        .frame(width: size, height: size)
        .frame(width: 44, height: 44)
        .contentShape(Rectangle())
        .scaleEffect(model.openDistrict == m.district && model.openKind == m.kind ? 1.25 : 1)
        .animation(.spring(duration: 0.25), value: model.openDistrict)
    }

    // MARK: Edge tags — districts the drawing does not reach at this width

    private var edgeTags: some View {
        let off = markers.filter { screenPoint($0) == nil }
        let west = off.filter { !DistrictShapes.eastShore.contains($0.district) }
        let east = off.filter { DistrictShapes.eastShore.contains($0.district) }
        return ZStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 6) { ForEach(west) { tag($0, arrow: "←") } }
                .frame(maxWidth: .infinity, alignment: .leading)
            VStack(alignment: .trailing, spacing: 6) { ForEach(east) { tag($0, arrow: "→") } }
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding(.horizontal, 8)
        .padding(.top, topBar + 10)
        .frame(width: geo.size.width)
    }

    private func tag(_ m: Marker, arrow: String) -> some View {
        Button {
            model.openCard(m.district, kind: m.kind)
        } label: {
            HStack(spacing: 4) {
                if arrow == "←" { Text(arrow) }
                Circle().fill(theme.red).frame(width: 7, height: 7).opacity(m.today ? 1 : 0.55)
                Text(Districts.name(m.district).trUpper)
                if arrow == "→" { Text(arrow) }
            }
            .font(.system(size: 10, weight: .heavy))
            .foregroundStyle(theme.red)
            .padding(.horizontal, 7).padding(.vertical, 4)
            .background(theme.paper.opacity(0.92))
            .overlay(Rectangle().strokeBorder(theme.red, lineWidth: 1.5))
        }
        .buttonStyle(.plain)
    }

    /// Where a district's marker is on screen, for pinning its card.
    static func anchor(for district: String, kind: AppModel.EventKind, geo: MapGeometry, topBar: CGFloat) -> CGPoint? {
        guard let c = DistrictShapes.centroids[district] else { return nil }
        let p = geo.point(c)
        return geo.onScreen(p) && p.y > topBar ? p : nil
    }
}
