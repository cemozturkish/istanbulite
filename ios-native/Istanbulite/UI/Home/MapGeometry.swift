import SwiftUI

/// The traced districts of istanbul-map-mobile.png (its own 1080×1920 pixel
/// grid), read from Resources/districts.json — generated off
/// assets/map/istanbul-map-mobile.svg, so the fills stop at the drawn borders.
enum DistrictShapes {
    static let canvas = CGSize(width: 1080, height: 1920)

    static let polygons: [String: [[CGPoint]]] = {
        guard let url = Bundle.main.url(forResource: "districts", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let raw = try? JSONDecoder().decode([String: [[[Double]]]].self, from: data) else { return [:] }
        return raw.mapValues { polys in polys.map { $0.map { CGPoint(x: $0[0], y: $0[1]) } } }
    }()

    /// A dot sits at the area centroid of the district's largest piece.
    static let centroids: [String: CGPoint] = polygons.compactMapValues { polys in
        polys.map { ($0, area($0)) }.max { abs($0.1) < abs($1.1) }.map { centroid($0.0, $0.1) }
    }

    private static func area(_ p: [CGPoint]) -> CGFloat {
        var a: CGFloat = 0
        for i in p.indices { let j = (i + 1) % p.count; a += p[i].x * p[j].y - p[j].x * p[i].y }
        return a / 2
    }

    private static func centroid(_ p: [CGPoint], _ a: CGFloat) -> CGPoint {
        guard abs(a) > 0.01 else { return p.first ?? .zero }
        var cx: CGFloat = 0, cy: CGFloat = 0
        for i in p.indices {
            let j = (i + 1) % p.count
            let f = p[i].x * p[j].y - p[j].x * p[i].y
            cx += (p[i].x + p[j].x) * f; cy += (p[i].y + p[j].y) * f
        }
        return CGPoint(x: cx / (6 * a), y: cy / (6 * a))
    }

    /// The Anadolu yakası, for which edge an off-map district is tagged on.
    static let eastShore: Set<String> = ["uskudar", "kadikoy", "maltepe", "umraniye", "cekmekoy", "beykoz", "atasehir",
                                         "kartal", "pendik", "sancaktepe", "sultanbeyli", "sile", "tuzla", "adalar"]

    /// The lowest non-sea row per 20px column (project.html `HOME_COAST`), and
    /// the highest ink per column (`HOME_LAND_TOP`). Re-measure if the drawing changes.
    static let coast: [CGFloat] = [885,895,896,891,885,878,857,826,828,827,812,796,792,770,763,750,731,731,725,718,712,706,620,607,594,678,738,751,777,780,780,774,778,782,787,793,803,821,838,856,873,891,908,913,910,909,918,927,936,936,935,939,938,945]
    static let landTop: [CGFloat] = [178,191,196,201,205,210,212,212,211,211,211,213,215,217,219,221,225,230,231,219,205,205,208,210,213,216,221,226,315,304,296,267,244,233,229,227,226,225,223,211,201,202,205,206,208,211,213,213,212,213,211,197,197,198]
}

/// Where the drawing stands on this screen: laid in with `cover`, then lifted
/// so the highest land sits just under the top bar (`--fb-home-lift`).
struct MapGeometry {
    let scale: CGFloat
    let origin: CGPoint
    let size: CGSize

    init(size: CGSize, topBar: CGFloat) {
        self.size = size
        let s = max(size.width / DistrictShapes.canvas.width, size.height / DistrictShapes.canvas.height)
        let ox = (size.width - DistrictShapes.canvas.width * s) / 2
        let oy0 = (size.height - DistrictShapes.canvas.height * s) / 2
        // The highest land on the visible columns.
        let first = max(0, Int((-ox / s) / 20)), last = min(DistrictShapes.landTop.count - 1, Int(((size.width - ox) / s) / 20))
        let top = (first...max(first, last)).map { DistrictShapes.landTop[$0] }.min() ?? 200
        let lift = min(0, (topBar + 10) - (oy0 + top * s))
        scale = s
        origin = CGPoint(x: ox, y: oy0 + lift)
    }

    func point(_ p: CGPoint) -> CGPoint { CGPoint(x: origin.x + p.x * scale, y: origin.y + p.y * scale) }

    func onScreen(_ p: CGPoint, inset: CGFloat = 12) -> Bool {
        p.x > inset && p.x < size.width - inset && p.y > 0 && p.y < size.height
    }

    /// The coast under a screen x: below it is open sea, room for the petek.
    func coastY(atScreenX x: CGFloat) -> CGFloat {
        let col = Int(((x - origin.x) / scale) / 20)
        let c = DistrictShapes.coast[max(0, min(DistrictShapes.coast.count - 1, col))]
        return origin.y + c * scale
    }

    func path(for district: String) -> Path {
        var path = Path()
        for poly in DistrictShapes.polygons[district] ?? [] {
            guard let f = poly.first else { continue }
            path.move(to: point(f))
            for p in poly.dropFirst() { path.addLine(to: point(p)) }
            path.closeSubpath()
        }
        return path
    }

    func district(at p: CGPoint, among ids: Set<String>) -> String? {
        ids.first { path(for: $0).contains(p) }
    }
}
