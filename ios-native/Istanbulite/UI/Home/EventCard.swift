import SwiftUI

/// The card a dot opens (renderHomeCard): where · when, the title, the
/// description, its kefil, and the one thing it asks — are you going.
struct EventCard: View {
    @Environment(AppModel.self) private var model
    @Environment(\.theme) private var theme
    @Environment(\.lang) private var lang

    let ev: Event
    var onEdit: (Event) -> Void

    @State private var confirmDelete = false
    @State private var busy = false

    private var isMine: Bool { ev.isPlan && ev.created_by == model.uid }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text(Districts.name(ev.neighborhood).trUpper + " · " + IstDate.dayLabel(ev.date, lang: lang) + " " + IstDate.hhmm(ev.date))
                    .kicker(theme)
                Spacer(minLength: 8)
                if model.openEvents.count > 1 {
                    HStack(spacing: 2) {
                        Button { model.pageCard(-1) } label: { Image(systemName: "chevron.left") }
                        Text("\(model.openIndex + 1)/\(model.openEvents.count)").font(.caption2.weight(.bold)).monospacedDigit()
                        Button { model.pageCard(1) } label: { Image(systemName: "chevron.right") }
                    }
                    .foregroundStyle(theme.ink)
                }
                Button { model.closeCard() } label: {
                    Image(systemName: "xmark").font(.system(size: 13, weight: .heavy)).foregroundStyle(theme.ink)
                        .frame(width: 28, height: 28)
                }
                .accessibilityLabel(L.t("close", lang))
            }

            Text(ev.titleText(lang))
                .font(.system(size: 19, weight: .heavy))
                .foregroundStyle(theme.ink)
                .fixedSize(horizontal: false, vertical: true)

            if let loc = ev.location, !loc.isEmpty {
                Label(loc, systemImage: "mappin").font(.footnote.weight(.semibold)).foregroundStyle(theme.muted)
            }

            if let d = ev.descriptionText(lang), !d.isEmpty {
                Text(d).font(.subheadline).foregroundStyle(theme.ink).lineLimit(4)
            }

            kefilLine

            if isMine {
                HStack(spacing: 10) {
                    Button(L.t("plan.edit", lang).trUpper) { onEdit(ev) }.buttonStyle(BoxButtonStyle())
                    Button(L.t("plan.takeback", lang).trUpper) { confirmDelete = true }.buttonStyle(BoxButtonStyle())
                }
                .padding(.top, 4)
            } else {
                rsvpButtons.padding(.top, 4)
            }
        }
        .padding(14)
        .background(theme.card)
        .overlay(Rectangle().strokeBorder(theme.ink, lineWidth: 2))
        .overlay(alignment: .bottom) { Rectangle().fill(theme.ink).frame(height: 5) }
        .overlay(alignment: .leading) { Rectangle().fill(theme.red).frame(width: 5).padding(.vertical, 2).padding(.leading, 2) }
        .shadow(color: .black.opacity(0.18), radius: 10, y: 4)
        .disabled(busy)
        .confirmationDialog(L.t("plan.takeback.sure", lang), isPresented: $confirmDelete, titleVisibility: .visible) {
            Button(L.t("plan.yes", lang), role: .destructive) { Task { await model.deletePlan(ev) } }
            Button(L.t("plan.cancel", lang), role: .cancel) {}
        }
    }

    @ViewBuilder private var kefilLine: some View {
        if isMine {
            Text(L.t("plan.yours", lang)).kicker(theme, red: false)
        } else if let k = ev.kefilID.flatMap({ model.people[$0] }) {
            let label = ev.isPlan ? L.t("plan.kefil", lang) : L.t("events.kefil", lang)
            Text(label + ": " + L.from(k, lang: lang) + (ev.isPlan ? " · " + L.t("plan.frompetek", lang) : ""))
                .kicker(theme, red: false)
        }
    }

    private var rsvpButtons: some View {
        let mine = model.mine(ev)
        return HStack(spacing: 10) {
            Button((mine == .go ? L.t("events.changed", lang) : L.t("events.notgoing", lang)).trUpper) {
                Task { busy = true; await model.rsvp(ev, going: false); await model.loadGuestList(); busy = false }
            }
            .buttonStyle(BoxButtonStyle(filled: mine == .no))
            Button((mine == .go ? L.t("events.youregoing", lang) : L.t("events.going", lang)).trUpper) {
                Task { busy = true; await model.rsvp(ev, going: true); await model.loadGuestList(); busy = false }
            }
            .buttonStyle(BoxButtonStyle(filled: mine == .go))
        }
    }
}
