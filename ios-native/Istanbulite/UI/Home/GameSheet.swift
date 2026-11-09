import SwiftUI
import WebKit

/// A game is still the website's own page — it always was, even inside
/// project.html, where it ran in an iframe. Here it runs in a web view in a
/// native sheet, signed in with the app's own session.
struct GameSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss
    let game: GameRef

    @State private var sessionJSON: String?
    @State private var webView: WKWebView?

    var body: some View {
        ZStack {
            theme.paper.ignoresSafeArea()
            if let sessionJSON {
                GameWebView(url: Config.siteURL.appendingPathComponent(game.file), sessionJSON: sessionJSON,
                            onClose: { close() }, webView: $webView)
                    .ignoresSafeArea(edges: .bottom)
            } else {
                ProgressView().tint(theme.ink)
            }
        }
        .task {
            // A token good for the length of a game, so the page does not
            // refresh it out from under the app (Supabase rotates refresh tokens).
            _ = try? await model.sb.vault.validToken(margin: 1800, client: model.sb)
            if let s = await model.sb.vault.session, let d = try? JSONEncoder().encode(s) {
                sessionJSON = String(data: d, encoding: .utf8)
            }
        }
        .onDisappear {
            Task {
                await adoptWebSession()
                await model.loadGames()
            }
        }
    }

    private func close() {
        Task { await adoptWebSession(); dismiss() }
    }

    /// Whatever session the page ended up holding is taken back.
    private func adoptWebSession() async {
        guard let webView else { return }
        let js = "localStorage.getItem('\(Config.webStorageKey)')"
        if let s = try? await webView.evaluateJavaScript(js) as? String {
            await model.sb.adopt(webSessionJSON: s)
        }
    }
}

struct GameWebView: UIViewRepresentable {
    let url: URL
    let sessionJSON: String
    var onClose: () -> Void
    @Binding var webView: WKWebView?

    func makeCoordinator() -> Coordinator { Coordinator(onClose: onClose) }

    func makeUIView(context: Context) -> WKWebView {
        let ucc = WKUserContentController()
        // In every frame, before any of the page's own scripts: put the session
        // where supabase-js looks for it. The game itself runs in the iframe.
        let escaped = sessionJSON.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "'", with: "\\'")
        let boot = """
        try { localStorage.setItem('\(Config.webStorageKey)', '\(escaped)'); } catch (e) {}
        """
        ucc.addUserScript(WKUserScript(source: boot, injectionTime: .atDocumentStart, forMainFrameOnly: false))
        ucc.add(context.coordinator, name: "istClose")

        let cfg = WKWebViewConfiguration()
        cfg.userContentController = ucc
        cfg.websiteDataStore = .default()
        cfg.allowsInlineMediaPlayback = true
        let wv = WKWebView(frame: .zero, configuration: cfg)
        wv.navigationDelegate = context.coordinator
        wv.scrollView.contentInsetAdjustmentBehavior = .never
        wv.scrollView.isScrollEnabled = false
        wv.isOpaque = false
        wv.backgroundColor = .clear
        // A game page sends a top-level visit straight back to project.html
        // (`window.self === window.top`), so it is embedded exactly the way
        // project.html embeds it: an iframe whose back arrow posts
        // 'ist-close-game-overlay' to its parent.
        let html = """
        <!doctype html><html><head><meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
        <style>html,body{margin:0;height:100%;background:transparent;overflow:hidden}
        iframe{border:0;width:100%;height:100%;display:block}</style></head>
        <body><iframe id="g" src="\(url.absoluteString)" allow="autoplay"></iframe>
        <script>
        window.addEventListener('message', function (e) {
          if (e.data === 'ist-close-game-overlay') window.webkit.messageHandlers.istClose.postMessage('close');
        });
        </script></body></html>
        """
        wv.loadHTMLString(html, baseURL: Config.siteURL)
        DispatchQueue.main.async { webView = wv }
        return wv
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "istClose")
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        let onClose: () -> Void
        init(onClose: @escaping () -> Void) { self.onClose = onClose }

        func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) { onClose() }

        /// The wrapper never leaves; a frame that would navigate the whole
        /// view somewhere else is the game saying it is done.
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if action.targetFrame?.isMainFrame == true, webView.url != nil, action.navigationType != .other {
                decisionHandler(.cancel)
                onClose()
                return
            }
            decisionHandler(.allow)
        }
    }
}
