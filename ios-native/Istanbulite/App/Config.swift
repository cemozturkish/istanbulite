import Foundation

/// The same project the website talks to (see CLAUDE.md "Supabase Configuration").
/// The publishable key is public by design; row-level security does the guarding.
enum Config {
    static let supabaseURL = URL(string: "https://fgxispjoiynnoqitwpks.supabase.co")!
    static let supabaseKey = "sb_publishable_iCNHaPaYLC-WRfmsfNPxYg_x2XJtI9Z"

    /// supabase-js keys its session in localStorage by the project ref; the
    /// game pages read it from there, so the native session is handed over
    /// under exactly this name.
    static let webStorageKey = "sb-fgxispjoiynnoqitwpks-auth-token"

    /// The games still run as the website's own pages (they always did, even
    /// inside project.html — as an iframe), loaded live so a web deploy reaches
    /// the app without an App Store release.
    static let siteURL = URL(string: "https://istanbulite.net/")!
    static let privacyURL = URL(string: "https://istanbulite.net/gizlilik.html")!

    /// How many days the home map shows (project.html `HOME_DAYS`).
    static let homeDays = 7
    /// At most this many of a member's own plans standing at once (`PLAN_MAX`).
    static let planMax = 5
}
