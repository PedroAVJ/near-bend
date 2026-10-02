import Foundation
public enum BackendKind: String, Codable, Sendable { case localDesktop = "local-desktop", remotePrivate = "remote-private" }
public struct Backend: Equatable, Sendable {
    public let id: String
    public let kind: BackendKind
    public let endpoint: URL
    public init(id: String, kind: BackendKind, endpoint: String) throws {
        guard id.range(of: "^[A-Za-z0-9_-]{1,96}$", options: .regularExpression) != nil,
              let parts = URLComponents(string: endpoint), let url = parts.url,
              let host = parts.host, !host.isEmpty, parts.user == nil, parts.password == nil,
              parts.query == nil, parts.fragment == nil else { throw ClientFailure.unsafeBackend }
        let loopback = ["localhost", "127.0.0.1", "[::1]", "::1"].contains(host.lowercased())
        guard kind == .localDesktop ? loopback && ["http", "https"].contains(parts.scheme ?? "") : !loopback && parts.scheme == "https" else { throw ClientFailure.unsafeBackend }
        self.id = id; self.kind = kind; self.endpoint = url
    }
}
public enum ClientFailure: Error, Equatable, Sendable {
    case unsafeBackend, invalidLink, expired, replayed, cancelled, wrongAudience, consentRequired, permissionDenied
    case authenticationRequired, protocolUnverified, authorizationRequired, localBackendUnreachable, networkUnverified, backendUnavailable, untrustedService, unsupportedUI
}
public enum ClientPlatform: Sendable { case desktop, ios, android, browser }
public struct ConnectionEvidence: Sendable {
    public var authenticated = false
    public var compatible = false
    public var authorized = false
    public var reachable = false
    public var running = false
    public var privateRoute: Backend? = nil
    public init() {}
}
public func checkConnection(_ backend: Backend, platform: ClientPlatform, evidence: ConnectionEvidence) throws {
    guard evidence.authenticated else { throw ClientFailure.authenticationRequired }
    guard evidence.compatible else { throw ClientFailure.protocolUnverified }
    guard evidence.authorized else { throw ClientFailure.authorizationRequired }
    if backend.kind == .localDesktop && platform != .desktop {
        guard evidence.privateRoute?.kind == .remotePrivate else { throw ClientFailure.localBackendUnreachable }
    }
    guard evidence.reachable else { throw ClientFailure.networkUnverified }
    guard evidence.running else { throw ClientFailure.backendUnavailable }
}
