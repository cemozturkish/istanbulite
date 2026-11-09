import Foundation
import Security

// A small Supabase client over plain URLSession: GoTrue for the session,
// PostgREST for tables and RPCs. The app needs a dozen calls, so a package
// dependency would be more surface than the thing it replaces.

struct AuthUser: Codable, Equatable {
    let id: String
    let email: String?
}

struct AuthSession: Codable, Equatable {
    var access_token: String
    var refresh_token: String
    var expires_in: Int?
    var expires_at: Int?
    var token_type: String?
    var user: AuthUser

    var expiresAt: Date {
        if let e = expires_at { return Date(timeIntervalSince1970: TimeInterval(e)) }
        return Date().addingTimeInterval(TimeInterval(expires_in ?? 3600))
    }
}

/// An error PostgREST or GoTrue answered with. `code` is what the app
/// dispatches on — never the message (CLAUDE.md: PGRST202, 42501 …).
struct SupabaseError: LocalizedError {
    let status: Int
    let code: String?
    let message: String
    var errorDescription: String? { message }

    /// "This database predates that function/column" rather than a real failure.
    var isMissing: Bool { ["PGRST202", "42883", "PGRST204", "42703", "42P01"].contains(code ?? "") }
}

enum Keychain {
    private static let service = "net.istanbulite.app.session"

    static func save(_ data: Data) {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service]
        SecItemDelete(q as CFDictionary)
        var add = q
        add[kSecValueData as String] = data
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(add as CFDictionary, nil)
    }

    static func load() -> Data? {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service,
                                kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        var out: AnyObject?
        return SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess ? out as? Data : nil
    }

    static func clear() {
        SecItemDelete([kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service] as CFDictionary)
    }
}

actor SessionVault {
    private(set) var session: AuthSession?
    private var refreshing: Task<AuthSession, Error>?

    init() {
        if let d = Keychain.load(), let s = try? JSONDecoder().decode(AuthSession.self, from: d) { session = s }
    }

    func set(_ s: AuthSession?) {
        session = s
        if let s, let d = try? JSONEncoder().encode(s) { Keychain.save(d) } else { Keychain.clear() }
    }

    /// A token good for at least `margin` seconds, refreshing once if needed —
    /// concurrent callers share the one refresh, because Supabase rotates the
    /// refresh token and a second use of the old one would sign the reader out.
    func validToken(margin: TimeInterval = 60, client: SupabaseClient) async throws -> String? {
        guard let s = session else { return nil }
        if s.expiresAt.timeIntervalSinceNow > margin { return s.access_token }
        if let t = refreshing { return try await t.value.access_token }
        let t = Task { try await client.refresh(s.refresh_token) }
        refreshing = t
        defer { refreshing = nil }
        let fresh = try await t.value
        set(fresh)
        return fresh.access_token
    }
}

final class SupabaseClient: @unchecked Sendable {
    static let shared = SupabaseClient()

    let vault = SessionVault()
    private let base = Config.supabaseURL
    private let key = Config.supabaseKey
    private let http: URLSession = {
        let c = URLSessionConfiguration.default
        c.timeoutIntervalForRequest = 20
        return URLSession(configuration: c)
    }()

    // MARK: Auth

    func signIn(email: String, password: String) async throws -> AuthSession {
        let s: AuthSession = try await authCall("token", grant: "password", body: ["email": email, "password": password])
        await vault.set(s)
        return s
    }

    /// Returns the session when the project signs the new member straight in,
    /// nil when it waits on an email confirmation (index.html says the same).
    func signUp(email: String, password: String, metadata: [String: String]) async throws -> AuthSession? {
        let body: [String: Any] = ["email": email, "password": password, "data": metadata]
        let data = try await raw(path: "/auth/v1/signup", method: "POST", body: body, token: nil)
        if let s = try? JSONDecoder().decode(AuthSession.self, from: data) {
            await vault.set(s)
            return s
        }
        return nil
    }

    func refresh(_ refreshToken: String) async throws -> AuthSession {
        try await authCall("token", grant: "refresh_token", body: ["refresh_token": refreshToken])
    }

    func signOut() async {
        if let t = try? await vault.validToken(client: self) {
            _ = try? await raw(path: "/auth/v1/logout", method: "POST", body: [:], token: t)
        }
        await vault.set(nil)
    }

    /// The game pages refresh the token themselves; what they end up holding
    /// is adopted back so the two never fight over a rotated refresh token.
    func adopt(webSessionJSON: String) async {
        guard let d = webSessionJSON.data(using: .utf8),
              let s = try? JSONDecoder().decode(AuthSession.self, from: d) else { return }
        let current = await vault.session
        guard s.user.id == current?.user.id, s.refresh_token != current?.refresh_token else { return }
        await vault.set(s)
    }

    /// `grant_type` goes in as a real query item: written into the path,
    /// appendingPathComponent escapes the `?` and GoTrue answers 404.
    private func authCall<T: Decodable>(_ endpoint: String, grant: String, body: [String: Any]) async throws -> T {
        let data = try await raw(path: "/auth/v1/" + endpoint, method: "POST",
                                 query: [.init(name: "grant_type", value: grant)], body: body, token: nil)
        return try JSONDecoder().decode(T.self, from: data)
    }

    // MARK: PostgREST

    func rpc<T: Decodable>(_ fn: String, _ params: [String: Any] = [:], as: T.Type = T.self) async throws -> T {
        let data = try await raw(path: "/rest/v1/rpc/" + fn, method: "POST", body: params, token: await token())
        return try Self.decoder.decode(T.self, from: data.isEmpty ? Data("null".utf8) : data)
    }

    func rpcVoid(_ fn: String, _ params: [String: Any] = [:]) async throws {
        _ = try await raw(path: "/rest/v1/rpc/" + fn, method: "POST", body: params, token: await token())
    }

    func select<T: Decodable>(_ table: String, _ query: [URLQueryItem]) async throws -> [T] {
        let data = try await raw(path: "/rest/v1/" + table, method: "GET", query: query, token: await token())
        return try Self.decoder.decode([T].self, from: data)
    }

    /// Insert or upsert; `onConflict` turns it into an upsert the way
    /// supabase-js's `.upsert(…, { onConflict })` does.
    func insert<T: Decodable>(_ table: String, _ rows: [[String: Any]], onConflict: String? = nil, returning: T.Type) async throws -> [T] {
        var q: [URLQueryItem] = []
        if let onConflict { q.append(.init(name: "on_conflict", value: onConflict)) }
        let prefer = (onConflict != nil ? "resolution=merge-duplicates," : "") + "return=representation"
        let data = try await raw(path: "/rest/v1/" + table, method: "POST", query: q, body: rows,
                                 token: await token(), prefer: prefer)
        return try Self.decoder.decode([T].self, from: data)
    }

    func upsert(_ table: String, _ rows: [[String: Any]], onConflict: String) async throws {
        _ = try await raw(path: "/rest/v1/" + table, method: "POST",
                          query: [.init(name: "on_conflict", value: onConflict)], body: rows,
                          token: await token(), prefer: "resolution=merge-duplicates,return=minimal")
    }

    func update<T: Decodable>(_ table: String, _ values: [String: Any], _ filters: [URLQueryItem], returning: T.Type) async throws -> [T] {
        let data = try await raw(path: "/rest/v1/" + table, method: "PATCH", query: filters, body: values,
                                 token: await token(), prefer: "return=representation")
        return try Self.decoder.decode([T].self, from: data)
    }

    func delete(_ table: String, _ filters: [URLQueryItem]) async throws {
        _ = try await raw(path: "/rest/v1/" + table, method: "DELETE", query: filters, token: await token())
    }

    private func token() async -> String? {
        try? await vault.validToken(client: self)
    }

    static let decoder: JSONDecoder = JSONDecoder()

    // MARK: Transport

    private func raw(path: String, method: String, query: [URLQueryItem] = [], body: Any? = nil,
                     token: String?, prefer: String? = nil) async throws -> Data {
        var comps = URLComponents(url: base.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        if !query.isEmpty {
            comps.queryItems = query
            // `+` in a timestamp means a space to PostgREST unless it is escaped.
            comps.percentEncodedQuery = comps.percentEncodedQuery?.replacingOccurrences(of: "+", with: "%2B")
        }
        var req = URLRequest(url: comps.url!)
        req.httpMethod = method
        req.setValue(key, forHTTPHeaderField: "apikey")
        req.setValue("Bearer " + (token ?? key), forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let prefer { req.setValue(prefer, forHTTPHeaderField: "Prefer") }
        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        let (data, resp) = try await http.data(for: req)
        let status = (resp as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let obj = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            let code = (obj?["code"] as? String) ?? (obj?["error_code"] as? String) ?? (obj?["error"] as? String)
            let msg = (obj?["message"] as? String) ?? (obj?["msg"] as? String)
                ?? (obj?["error_description"] as? String) ?? HTTPURLResponse.localizedString(forStatusCode: status)
            throw SupabaseError(status: status, code: code, message: msg)
        }
        return data
    }
}

/// PostgREST filter helpers: `.eq("id", x)` → `id=eq.x`.
extension URLQueryItem {
    static func select(_ cols: String) -> URLQueryItem { .init(name: "select", value: cols) }
    static func eq(_ c: String, _ v: String) -> URLQueryItem { .init(name: c, value: "eq." + v) }
    static func gte(_ c: String, _ v: String) -> URLQueryItem { .init(name: c, value: "gte." + v) }
    static func lt(_ c: String, _ v: String) -> URLQueryItem { .init(name: c, value: "lt." + v) }
    static func `in`(_ c: String, _ vs: [String]) -> URLQueryItem {
        .init(name: c, value: "in.(" + vs.map { "\"\($0)\"" }.joined(separator: ",") + ")")
    }
    static func order(_ spec: String) -> URLQueryItem { .init(name: "order", value: spec) }
}
