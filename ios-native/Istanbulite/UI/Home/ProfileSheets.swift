import SwiftUI

/// Your own profile (Sen): the cover, your kefil code, the language, and the
/// account's two ways out. Pressing your own name on the top bar opens it.
struct MyProfileSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.theme) private var theme
    @Environment(\.lang) private var lang
    @Environment(\.dismiss) private var dismiss

    @State private var copied = false
    @State private var confirmDelete = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    cover(name: model.profile?.fullName ?? "", district: model.profile?.neighborhood, joined: model.profile?.joined_at,
                          avatar: AvatarStack(hair: model.profile?.avatar_hair, shirt: model.profile?.avatar_shirt,
                                              accessory: model.profile?.avatar_accessory))

                    if let code = model.profile?.referral_code {
                        VStack(spacing: 6) {
                            Text(L.t("me.kefilcode", lang)).kicker(theme)
                            Button {
                                UIPasteboard.general.string = code
                                copied = true
                            } label: {
                                Text(copied ? L.t("me.copied", lang) : code)
                                    .font(.system(size: 26, weight: .black, design: .monospaced))
                                    .foregroundStyle(theme.ink)
                                    .frame(maxWidth: .infinity).padding(.vertical, 12)
                                    .background(theme.card)
                                    .overlay(Rectangle().strokeBorder(theme.ink, lineWidth: 2))
                            }
                        }
                    }

                    VStack(spacing: 6) {
                        Text(L.t("me.lang", lang).trUpper).kicker(theme, red: false)
                        HStack(spacing: 10) {
                            Button(L.t("lang.default", .tr).trUpper) { model.setLang(.tr) }
                                .buttonStyle(BoxButtonStyle(filled: lang == .tr))
                            Button(L.t("lang.more_english", .en).uppercased()) { model.setLang(.en) }
                                .buttonStyle(BoxButtonStyle(filled: lang == .en))
                        }
                    }

                    Button(L.t("me.signout", lang).trUpper) { Task { dismiss(); await model.signOut() } }
                        .buttonStyle(BoxButtonStyle())
                    Button(L.t("me.delete", lang)) { confirmDelete = true }
                        .font(.footnote.weight(.bold)).foregroundStyle(theme.red)
                }
                .padding(20)
            }
            .background(theme.paper)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button(L.t("close", lang)) { dismiss() } } }
            .confirmationDialog(L.t("me.delete.sure", lang), isPresented: $confirmDelete, titleVisibility: .visible) {
                Button(L.t("me.delete.yes", lang), role: .destructive) { Task { dismiss(); _ = await model.deleteAccount() } }
                Button(L.t("plan.cancel", lang), role: .cancel) {}
            }
        }
        .tint(theme.ink)
    }
}

/// Another member, read-only: who they are and where they live. Nothing to
/// write to them — no DMs, ever.
struct MemberSheet: View {
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss
    @Environment(\.lang) private var lang
    let member: HiveCell

    var body: some View {
        NavigationStack {
            ScrollView {
                cover(name: [member.first_name, member.last_name].compactMap { $0 }.joined(separator: " "),
                      district: member.neighborhood, joined: member.joined_at,
                      avatar: AvatarStack(hair: member.avatar_hair, shirt: member.avatar_shirt, accessory: member.avatar_accessory))
                    .padding(20)
            }
            .background(theme.paper)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button(L.t("close", lang)) { dismiss() } } }
        }
        .tint(theme.ink)
    }
}

/// The profile's cover: the framed avatar, the name, the district, the tenure.
@MainActor
private func cover(name: String, district: String?, joined: String?, avatar: AvatarStack) -> some View {
    CoverView(name: name, district: district, joined: joined, avatar: avatar)
}

private struct CoverView: View {
    @Environment(\.theme) private var theme
    @Environment(\.lang) private var lang
    let name: String
    let district: String?
    let joined: String?
    let avatar: AvatarStack

    var body: some View {
        VStack(spacing: 10) {
            ZStack {
                HexShape().fill(Color(hex: 0xDCDBDB))
                avatar.clipShape(HexShape())
                Image("frame").resizable().renderingMode(.template).foregroundStyle(theme.ink)
            }
            .frame(width: 150, height: 225)
            Text(name.trUpper).font(.system(size: 24, weight: .black)).foregroundStyle(theme.ink)
            Text(Districts.name(district).trUpper).kicker(theme)
            if let j = joined.flatMap(IstDate.parse) {
                Text(L.t("me.since", lang) + " · " + j.formatted(.dateTime.month(.wide).year().locale(Locale(identifier: lang == .en ? "en_GB" : "tr_TR"))))
                    .font(.footnote).foregroundStyle(theme.muted)
            }
        }
        .frame(maxWidth: .infinity)
    }
}
