import Foundation
import Combine
#if SWIFT_PACKAGE
import NearDotCore
#endif
@MainActor
final class ClientStore: ObservableObject {
    @Published var input = ""
    @Published var consent = false
    @Published var status = "Choose an offline sample deployment to exercise setup."
    @Published var selectedBackend = "remote"
    @Published var qrLink: String?
    @Published var expiresAt: Date?
    @Published var paired: Pairing?
    @Published var ui: UIResource?
    private var authority: FixturePairingAuthority?
    private let audience = "sample-apple-client"
    private var host: UIHost?
    func issueSample() async {
        do {
            let backend = try Backend(id: "sample-backend", kind: selectedBackend == "local" ? .localDesktop : .remotePrivate, endpoint: selectedBackend == "local" ? "http://127.0.0.1:8787" : "https://example.invalid")
            let authority = try FixturePairingAuthority(audience: audience, backend: backend, now: Date())
            self.authority = authority; input = authority.link.url.absoluteString
            qrLink = input; expiresAt = authority.expiresAt; consent = false; paired = nil; ui = nil
            status = "Synthetic owner-approved grant. Expires in two minutes; one redemption only. No server is running."
        } catch { status = "Sample setup failed: \(error)" }
    }
    func receive(_ url: URL) {
        do { input = try PairingLink(url.absoluteString).url.absoluteString; consent = false; status = "Link validated. Live redemption transport is not configured; sample grants only." }
        catch { input = ""; status = "Rejected unsafe setup link." }
    }
    func redeem() async {
        guard let authority else { status = "Live authority transport is not configured. Create an offline sample first."; return }
        do {
            let link = try PairingLink(input)
            let result = try await authority.redeem(link, audience: audience, consent: consent, accepted: [.chat, .mcpUI], now: Date())
            paired = result; input = ""; qrLink = nil
            var evidence = ConnectionEvidence()
            // Explicit fixture evidence, never presented as observed network/auth state.
            evidence.authenticated = true; evidence.compatible = true; evidence.authorized = true; evidence.reachable = true; evidence.running = true
            #if os(macOS)
            let platform: ClientPlatform = .desktop
            #else
            let platform: ClientPlatform = .ios
            #endif
            try checkConnection(result.backend, platform: platform, evidence: evidence)
            let host = UIHost(connected: ["sample-service"], trusted: ["sample-service"], permissions: result.permissions, capabilities: [.text, .button], actionPolicies: ["sample-service": ["sample.echo": [.chat]]])
            let resource = UIResource(serviceID: "sample-service", nodes: [.init(id: "greeting", kind: .text, text: "A compatible deployment supplies this declarative UI."), .init(id: "echo", kind: .button, text: "Run sample action", action: "sample.echo", permissions: [.chat])])
            ui = try composeMCPUI(resource, host: host); self.host = host
            status = "Paired offline fixture. Compatibility/auth/network evidence is simulated."
        } catch { ui = nil; status = "Setup blocked: \(error). Retry with a new grant if expired or consumed." }
    }
    func cancel() async {
        await authority?.cancel(); input = ""; qrLink = nil; consent = false; status = "Cancelled. Generate a fresh sample grant to retry."
    }
    func perform(nodeID: String) {
        guard let ui, let host, authorizeMCPAction(ui, nodeID: nodeID, host: host) else { status = "Action denied by current capability/permission policy."; return }
        status = "Synthetic action authorized locally; no external request was sent."
    }
}
