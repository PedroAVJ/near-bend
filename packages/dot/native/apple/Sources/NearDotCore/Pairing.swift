import Foundation
public enum Permission: String, CaseIterable, Sendable { case chat, tasks, microphone, camera; case mcpUI = "mcp-ui" }
public struct PairingLink: Equatable, Sendable {
    // Bearer input is kept in memory only. Never log or persist it.
    public let url: URL
    public init(_ value: String) throws {
        guard let parts = URLComponents(string: value), let url = parts.url,
              parts.scheme == "near-dot", parts.host == "setup", parts.path == "/pair",
              parts.user == nil, parts.password == nil, parts.fragment == nil,
              let items = parts.queryItems, items.count == 1, items[0].name == "code",
              items[0].value?.range(of: "^[A-Za-z0-9_-]{43}$", options: .regularExpression) != nil else { throw ClientFailure.invalidLink }
        self.url = url
    }
}
public struct Pairing: Equatable, Sendable {
    public let dotID: String
    public let audience: String
    public let backend: Backend
    public let permissions: Set<Permission>
}
/// Synthetic local test adapter, not a credential store or production authority.
/// Real issuance/redemption belongs to authenticated deployment F setup authority.
public actor FixturePairingAuthority {
    private enum State { case pending, redeemed, cancelled }
    private var state: State = .pending
    public nonisolated let link: PairingLink
    public nonisolated let expiresAt: Date
    private let audience: String
    private let backend: Backend
    private let permissions: Set<Permission>
    public init(audience: String, backend: Backend, now: Date, ttl: TimeInterval = 120) throws {
        guard ttl > 0 && ttl <= 300 else { throw ClientFailure.expired }
        self.audience = audience; self.backend = backend; self.permissions = [.chat, .mcpUI]
        self.link = try PairingLink("near-dot://setup/pair?code=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
        self.expiresAt = now.addingTimeInterval(ttl)
    }
    public func redeem(_ input: PairingLink, audience: String, consent: Bool, accepted: Set<Permission>, now: Date) throws -> Pairing {
        guard input == link else { throw ClientFailure.invalidLink }
        switch state { case .redeemed: throw ClientFailure.replayed; case .cancelled: throw ClientFailure.cancelled; case .pending: break }
        guard now < expiresAt else { throw ClientFailure.expired }
        guard audience == self.audience else { throw ClientFailure.wrongAudience }
        guard consent else { throw ClientFailure.consentRequired }
        guard accepted.isSubset(of: permissions) else { throw ClientFailure.permissionDenied }
        state = .redeemed
        return Pairing(dotID: "sample-dot", audience: audience, backend: backend, permissions: accepted)
    }
    public func cancel() { if state == .pending { state = .cancelled } }
}
