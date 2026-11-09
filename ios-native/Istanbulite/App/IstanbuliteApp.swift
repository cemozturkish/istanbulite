import SwiftUI

@main
struct IstanbuliteApp: App {
    @State private var model = AppModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .environment(\.theme, model.theme)
                .environment(\.lang, model.lang)
                .task { await model.start() }
                .onChange(of: scenePhase) { _, phase in
                    // A side renews on arrival: coming back to the app is one.
                    if phase == .active, model.phase == .signedIn { Task { await model.refreshIfDayTurned() } }
                }
        }
    }
}

struct RootView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.theme) private var theme

    var body: some View {
        ZStack {
            theme.sea.ignoresSafeArea()
            switch model.phase {
            case .launching: LaunchView()
            case .signedOut: AuthView().transition(.opacity)
            case .signedIn: HomeView().transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.35), value: model.phase)
        .preferredColorScheme(.light)
    }
}

/// The loading curtain: the sea rising in the logo (assets/loading).
struct LaunchView: View {
    @State private var frame = 1
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            Image(String(format: "logo-%02d", frame))
                .resizable().scaledToFit().padding(.horizontal, 36)
        }
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(150))
                frame = frame % 10 + 1
            }
        }
    }
}
