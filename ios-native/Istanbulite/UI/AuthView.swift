import SwiftUI

/// index.html, natively: sign in, or a kefil code first and then the form.
/// There is no signup without an existing member's code.
struct AuthView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.lang) private var lang

    enum Panel { case signin, kefil, signup }
    @State private var panel: Panel = .signin

    @State private var email = ""
    @State private var password = ""
    @State private var error = ""
    @State private var busy = false

    @State private var kefilCode = ""
    @State private var kefil: PersonRef?

    @State private var first = ""
    @State private var last = ""
    @State private var phone = ""
    @State private var home = ""
    @State private var born = ""
    @State private var agreed = false

    // index.html's login overlay: always black, whatever the hour.
    private let fg = Color(hex: 0xF0F0F0)
    private let dim = Color(hex: 0x888888)
    private let line = Color(hex: 0x555555)

    var body: some View {
        GeometryReader { geo in
            ScrollView {
                VStack(spacing: 0) {
                    Image("login-logo")
                        .resizable().scaledToFit()
                        .frame(width: min(280, geo.size.width * 0.8))
                        .padding(.bottom, 48)

                    Group {
                        switch panel {
                        case .signin: signin
                        case .kefil: kefilPanel
                        case .signup: signup
                        }
                    }
                    .frame(width: min(280, geo.size.width - 48))

                    Link(L.t("auth.privacypolicy", lang).trUpper, destination: Config.privacyURL)
                        .font(.system(size: 10)).tracking(1).foregroundStyle(dim)
                        .padding(.top, 20)

                    Button(lang == .tr ? L.t("lang.more_english", .tr) : L.t("lang.default", .en)) {
                        model.lang = model.lang.toggled
                    }
                    .font(.system(size: 10)).tracking(1).foregroundStyle(dim.opacity(0.7))
                    .padding(.top, 12)
                }
                .padding(24)
                .frame(maxWidth: .infinity, minHeight: geo.size.height)
            }
            .scrollBounceBehavior(.basedOnSize)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Color.black.ignoresSafeArea())
        .preferredColorScheme(.dark)
        .tint(fg)
        .disabled(busy)
        .animation(.easeOut(duration: 0.16), value: panel)
    }

    // MARK: Panels

    private var errorLine: some View {
        Text(error)
            .font(.system(size: 11)).tracking(0.5).foregroundStyle(dim)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity, minHeight: 14)
    }

    private var signin: some View {
        VStack(spacing: 12) {
            field(L.t("auth.email", lang), $email).textContentType(.username).keyboardType(.emailAddress)
            secure(L.t("auth.password", lang), $password)
            primary(L.t("auth.signin", lang)) { Task { await doSignIn() } }
            errorLine
            textButton(L.t("auth.signup", lang)) { error = ""; panel = .kefil }
        }
    }

    private var kefilPanel: some View {
        VStack(spacing: 12) {
            Text(L.t("auth.kefilnote", lang))
                .font(.system(size: 11)).tracking(0.5).foregroundStyle(dim)
                .multilineTextAlignment(.center).padding(.bottom, 4)
            field(L.t("auth.kefilcode", lang), $kefilCode)
                .textInputAutocapitalization(.characters)
            primary(L.t("auth.continue", lang)) { Task { await verifyKefil() } }
            errorLine
            textButton(L.t("auth.back", lang)) { error = ""; panel = .signin }
        }
    }

    private var signup: some View {
        VStack(spacing: 12) {
            if let kefil {
                Text(("Kefil: " + L.from(kefil, lang: lang)).trUpper)
                    .font(.system(size: 11)).tracking(1).foregroundStyle(fg)
                    .multilineTextAlignment(.center).padding(.bottom, 4)
            }
            field(L.t("auth.firstname", lang), $first).textContentType(.givenName)
            field(L.t("auth.lastname", lang), $last).textContentType(.familyName)
            field(L.t("auth.phone", lang), $phone).keyboardType(.phonePad).textContentType(.telephoneNumber)
            picker(L.t("auth.livedistrict", lang), $home, includeOutside: false)
            picker(L.t("auth.birthdistrict", lang), $born, includeOutside: true)
            field(L.t("auth.email", lang), $email).textContentType(.username).keyboardType(.emailAddress)
            secure(L.t("auth.password", lang), $password, newPassword: true)
            Button { agreed.toggle() } label: {
                HStack(alignment: .top, spacing: 7) {
                    Image(systemName: agreed ? "checkmark.square.fill" : "square")
                        .font(.system(size: 13)).foregroundStyle(agreed ? fg : dim)
                    Text(L.t("auth.privacyagree", lang))
                        .font(.system(size: 11)).foregroundStyle(dim)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .buttonStyle(.plain)
            .padding(.top, 12)
            primary(L.t("auth.signup", lang)) { Task { await doSignUp() } }
                .disabled(!agreed)
                .opacity(agreed ? 1 : 0.5)
            errorLine
            textButton(L.t("auth.back", lang)) { error = ""; panel = .signin }
        }
    }

    // MARK: Controls

    private func primary(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title.trUpper)
                .font(.system(size: 11, weight: .semibold)).tracking(2)
                .foregroundStyle(.black)
                .frame(maxWidth: .infinity)
                .padding(11)
                .background(fg)
        }
        .buttonStyle(.plain)
        .padding(.top, 4)   // 16px above, with the stack's 12
    }

    private func textButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title.trUpper)
                .font(.system(size: 11)).tracking(1.5).foregroundStyle(dim)
                .padding(6)
        }
        .buttonStyle(.plain)
        .padding(.top, 4)
    }

    private func underline<C: View>(_ content: C) -> some View {
        content
            .font(.system(size: 14.4))
            .foregroundStyle(fg)
            .padding(.vertical, 10)
            .overlay(alignment: .bottom) { Rectangle().fill(line).frame(height: 1) }
    }

    private func prompt(_ label: String) -> Text {
        Text(label).font(.system(size: 14.4, weight: .light)).foregroundColor(dim)
    }

    private func field(_ label: String, _ text: Binding<String>) -> some View {
        underline(
            TextField("", text: text, prompt: prompt(label))
                .textInputAutocapitalization(.never).autocorrectionDisabled()
        )
    }

    private func secure(_ label: String, _ text: Binding<String>, newPassword: Bool = false) -> some View {
        underline(
            SecureField("", text: text, prompt: prompt(label))
                .textContentType(newPassword ? .newPassword : .password)
        )
    }

    private func picker(_ label: String, _ sel: Binding<String>, includeOutside: Bool) -> some View {
        Menu {
            if includeOutside {
                Button(L.t("auth.notborn", lang)) { sel.wrappedValue = "istanbul_disi" }
            }
            ForEach(model.neighborhoods.filter { $0.id != "istanbul_disi" }) { n in
                Button(n.name_tr.trUpper) { sel.wrappedValue = n.id }
            }
        } label: {
            underline(
                HStack {
                    if sel.wrappedValue.isEmpty {
                        prompt(label)
                    } else {
                        Text(sel.wrappedValue == "istanbul_disi" ? L.t("auth.notborn", lang) : Districts.name(sel.wrappedValue).trUpper)
                    }
                    Spacer()
                    Image(systemName: "chevron.down").font(.system(size: 11)).foregroundStyle(dim)
                }
            )
        }
    }

    // MARK: Actions

    private func doSignIn() async {
        error = ""; busy = true; defer { busy = false }
        do {
            let s = try await model.sb.signIn(email: email.trimmingCharacters(in: .whitespaces), password: password)
            await model.didSignIn(s)
        } catch { self.error = error.localizedDescription }
    }

    private func verifyKefil() async {
        error = ""
        let code = kefilCode.trimmingCharacters(in: .whitespaces).uppercased()
        guard !code.isEmpty else { return }
        busy = true; defer { busy = false }
        let rows: [PersonRef]? = try? await model.sb.rpc("verify_kefil_code", ["code": code])
        guard let k = rows?.first else { error = L.t("auth.kefilbad", lang); return }
        kefil = k
        kefilCode = code
        await model.loadNeighborhoods()
        panel = .signup
    }

    private func capitalize(_ s: String) -> String {
        let tr = Locale(identifier: "tr_TR")
        return s.trimmingCharacters(in: .whitespaces).split(separator: " ").map {
            $0.prefix(1).uppercased(with: tr) + $0.dropFirst().lowercased(with: tr)
        }.joined(separator: " ")
    }

    private func doSignUp() async {
        error = ""
        guard !home.isEmpty, !born.isEmpty else { error = L.t("plan.err.district", lang); return }
        busy = true; defer { busy = false }
        do {
            // handle_new_user reads this metadata, validates the code and
            // creates the profile row atomically with the account.
            let s = try await model.sb.signUp(email: email.trimmingCharacters(in: .whitespaces), password: password, metadata: [
                "first_name": capitalize(first), "last_name": capitalize(last), "phone": phone,
                "neighborhood": home, "birth_place": born, "referral_code": kefilCode,
            ])
            if let s { await model.didSignIn(s) } else { error = L.t("auth.pending", lang); panel = .signin }
        } catch { self.error = error.localizedDescription }
    }
}
