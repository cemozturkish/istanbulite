import Foundation

/// THE Istanbul clock — the native counterpart of ist-date.js. Every day key
/// is the İstanbul calendar day (CONTENT_FOLLOWS_SUN is off for launch), and
/// the sun decides only the colours.
enum IstDate {
    static let tz = TimeZone(identifier: "Europe/Istanbul")!

    static var calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = tz
        return c
    }()

    /// 'YYYY-MM-DD' for today in İstanbul, `offset` days on.
    static func iso(_ offset: Int = 0, from now: Date = Date()) -> String {
        let d = calendar.date(byAdding: .day, value: offset, to: now)!
        let p = calendar.dateComponents([.year, .month, .day], from: d)
        return String(format: "%04d-%02d-%02d", p.year!, p.month!, p.day!)
    }

    /// game_results.date is the unpadded 'YYYY-M-D' shape (gameNightSeed()).
    static func seed(from now: Date = Date()) -> String {
        let p = calendar.dateComponents([.year, .month, .day], from: now)
        return "\(p.year!)-\(p.month!)-\(p.day!)"
    }

    /// Midnight at the start of that İstanbul day, as an instant.
    static func midnight(_ offset: Int = 0, from now: Date = Date()) -> Date {
        let start = calendar.startOfDay(for: now)
        return calendar.date(byAdding: .day, value: offset, to: start)!
    }

    static func dayIndex(of date: Date, from now: Date = Date()) -> Int {
        calendar.dateComponents([.day], from: calendar.startOfDay(for: now), to: calendar.startOfDay(for: date)).day ?? 0
    }

    private static let isoFrac: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    private static let isoPlain = ISO8601DateFormatter()

    static func parse(_ s: String) -> Date? {
        isoFrac.date(from: s) ?? isoPlain.date(from: s) ?? {
            // PostgREST prints "2026-11-05T18:00:00+00:00"; some rows lack the colon in the offset.
            let f = DateFormatter()
            f.locale = Locale(identifier: "en_US_POSIX")
            f.dateFormat = "yyyy-MM-dd'T'HH:mm:ssZ"
            return f.date(from: s)
        }()
    }

    static func isoString(_ d: Date) -> String { isoFrac.string(from: d) }

    static func hhmm(_ d: Date) -> String {
        let f = DateFormatter()
        f.timeZone = tz
        f.dateFormat = "HH:mm"
        return f.string(from: d)
    }

    /// BUGÜN / YARIN / weekday name, the labels the map's days carry.
    static func dayLabel(_ d: Date, lang: Lang, now: Date = Date()) -> String {
        switch dayIndex(of: d, from: now) {
        case 0: return L.t("home.today", lang)
        case 1: return L.t("events.tomorrow", lang)
        default:
            let f = DateFormatter()
            f.timeZone = tz
            f.locale = Locale(identifier: lang == .en ? "en_GB" : "tr_TR")
            f.dateFormat = "EEEE"
            return f.string(from: d).trUpper
        }
    }

    // MARK: The sun over İstanbul — the same arithmetic as ist-date.js's sunTimes

    private static let lat = 41.0082, lng = 28.9784

    static func sunTimes(_ base: Date = Date()) -> (sunrise: Date, sunset: Date) {
        let p = calendar.dateComponents([.year, .month, .day], from: base)
        let a = (14 - p.month!) / 12
        let yy = p.year! + 4800 - a
        let mm = p.month! + 12 * a - 3
        let jdn = Double(p.day! + (153 * mm + 2) / 5 + 365 * yy + yy / 4 - yy / 100 + yy / 400 - 32045)
        let lw = -lng
        let n = (jdn - 2451545.0009 - lw / 360).rounded()
        let jStar = 2451545.0009 + lw / 360 + n
        var M = (357.5291 + 0.98560028 * (jStar - 2451545.0)).truncatingRemainder(dividingBy: 360)
        if M < 0 { M += 360 }
        let Mr = M * .pi / 180
        let C = 1.9148 * sin(Mr) + 0.0200 * sin(2 * Mr) + 0.0003 * sin(3 * Mr)
        var lambda = (M + 102.9372 + C + 180).truncatingRemainder(dividingBy: 360)
        if lambda < 0 { lambda += 360 }
        let lr = lambda * .pi / 180
        let jTransit = jStar + 0.0053 * sin(Mr) - 0.0069 * sin(2 * lr)
        let delta = asin(sin(lr) * sin(23.4397 * .pi / 180))
        let latR = lat * .pi / 180
        let cosO = (sin(-0.833 * .pi / 180) - sin(latR) * sin(delta)) / (cos(latR) * cos(delta))
        let omega = acos(max(-1, min(1, cosO))) * 180 / .pi
        func date(_ j: Double) -> Date { Date(timeIntervalSince1970: (j - 2440587.5) * 86400) }
        return (date(jTransit - omega / 360), date(jTransit + omega / 360))
    }

    static func isDaytime(_ now: Date = Date()) -> Bool {
        let s = sunTimes(now)
        return now >= s.sunrise && now < s.sunset
    }
}
