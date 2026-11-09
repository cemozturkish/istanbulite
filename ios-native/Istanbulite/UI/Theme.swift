import SwiftUI

/// The siyah-beyaz palette (palette.js's default), in its two states. The sun
/// over İstanbul decides which — never the phone's own dark mode — exactly as
/// on the site.
struct Theme: Equatable {
    let night: Bool

    var paper: Color { night ? Color(hex: 0x828282) : .white }
    var card: Color { night ? Color(hex: 0xBCBCBC) : Color(hex: 0xF5F5F5) }   // --lit by night: a lit window
    var cardHi: Color { night ? Color(hex: 0xC8C8C8) : .white }
    var ink: Color { night ? Color(hex: 0x101010) : .black }
    var muted: Color { night ? Color(hex: 0x3D3D3D) : Color(hex: 0x868686) }
    var rule: Color { night ? Color(hex: 0x5C5C5C) : Color(hex: 0xCCCCCC) }
    var red: Color { night ? Color(hex: 0x9E2E2A) : Color(hex: 0xB93631) }
    var sea: Color { night ? Color(hex: 0x828282) : Color(hex: 0xF7F7F7) }
    var bar: Color { night ? Color(hex: 0x262626) : Color(hex: 0x383838) }
    let barLabel = Color(hex: 0x9B9B9B)
    let barLabelOn = Color(hex: 0xF4F4F4)

    /// The drawn map is four flat grays; by night the whole ladder slides down
    /// in order (sea stays the lightest), which one multiply reproduces.
    var mapMultiply: Color { night ? Color(white: 0.527) : .white }
    var friendFill: Color { night ? Color(hex: 0x8F8F8F) : Color(hex: 0xBDBDBD) }
    var homeFill: Color { night ? Color(hex: 0x5A5A5A) : Color(hex: 0x9A9A9A) }
    var pickFill: Color { night ? Color(hex: 0x3A3A3A) : Color(hex: 0x6A6A6A) }

    static var now: Theme { Theme(night: !IstDate.isDaytime()) }
}

private struct ThemeKey: EnvironmentKey { static let defaultValue = Theme(night: false) }
private struct LangKey: EnvironmentKey { static let defaultValue = Lang.tr }

extension EnvironmentValues {
    var theme: Theme { get { self[ThemeKey.self] } set { self[ThemeKey.self] = newValue } }
    var lang: Lang { get { self[LangKey.self] } set { self[LangKey.self] = newValue } }
}

extension Color {
    init(hex: UInt32) {
        self.init(red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255)
    }
}

/// The site's one button: ink border, a chunky foot it sinks into when pressed.
struct BoxButtonStyle: ButtonStyle {
    @Environment(\.theme) private var theme
    var filled = false

    func makeBody(configuration: Configuration) -> some View {
        let pressed = configuration.isPressed
        configuration.label
            .font(.system(size: 14, weight: .heavy))
            .foregroundStyle(filled ? theme.cardHi : theme.ink)
            .frame(maxWidth: .infinity, minHeight: 44)
            .background(filled ? theme.ink : theme.card)
            .overlay(alignment: .top) {
                Rectangle().fill(Color.black.opacity(0.18)).frame(height: pressed ? 4 : 0)
            }
            .overlay(Rectangle().strokeBorder(theme.ink, lineWidth: 2))
            .overlay(alignment: .bottom) { Rectangle().fill(theme.ink).frame(height: pressed ? 2 : 5) }
            .offset(y: pressed ? 3 : 0)
            .animation(.easeOut(duration: 0.1), value: pressed)
    }
}

extension View {
    func kicker(_ theme: Theme, red: Bool = true) -> some View {
        self.font(.system(size: 11, weight: .heavy)).tracking(0.6).foregroundStyle(red ? theme.red : theme.muted)
    }
}
