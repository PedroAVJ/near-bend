import XCTest
import Vision
@testable import NearDotCore
final class ContractsTests: XCTestCase {
    func testQRDecodesToExactManualPairingLink() throws {
        let link = try PairingLink("near-dot://setup/pair?code=" + String(repeating: "A", count: 43))
        let image = try XCTUnwrap(pairingQRCode(link))
        let request = VNDetectBarcodesRequest()
        request.symbologies = [.qr]
        try VNImageRequestHandler(cgImage: image).perform([request])
        XCTAssertEqual(request.results?.first?.payloadStringValue, link.url.absoluteString)
    }
    func testSafeBackendAndLinkRouting() throws {
        _ = try Backend(id: "local", kind: .localDesktop, endpoint: "http://127.0.0.1:8787")
        for endpoint in ["http://remote.invalid", "https://a:b@remote.invalid", "https://remote.invalid?key=secret", "https://localhost"] {
            XCTAssertThrowsError(try Backend(id: "remote", kind: .remotePrivate, endpoint: endpoint))
        }
        let code = String(repeating: "A", count: 43)
        _ = try PairingLink("near-dot://setup/pair?code=\(code)")
        for link in ["https://setup/pair?code=\(code)", "near-dot://evil/pair?code=\(code)", "near-dot://setup/pair?code=\(code)&redirect=https://evil.invalid", "near-dot://setup/pair?code=\(code)&code=\(code)", "near-dot://setup/pair?code=\(code)#fragment"] {
            XCTAssertThrowsError(try PairingLink(link))
        }
    }
    func testConsentAudiencePermissionAndReplay() async throws {
        let now = Date(timeIntervalSince1970: 1000)
        let backend = try Backend(id: "remote", kind: .remotePrivate, endpoint: "https://example.invalid")
        let authority = try FixturePairingAuthority(audience: "client", backend: backend, now: now)
        let link = authority.link
        do { _ = try await authority.redeem(link, audience: "other", consent: true, accepted: [.chat], now: now); XCTFail() } catch { XCTAssertEqual(error as? ClientFailure, .wrongAudience) }
        do { _ = try await authority.redeem(link, audience: "client", consent: false, accepted: [.chat], now: now); XCTFail() } catch { XCTAssertEqual(error as? ClientFailure, .consentRequired) }
        do { _ = try await authority.redeem(link, audience: "client", consent: true, accepted: [.camera], now: now); XCTFail() } catch { XCTAssertEqual(error as? ClientFailure, .permissionDenied) }
        let pairing = try await authority.redeem(link, audience: "client", consent: true, accepted: [.chat], now: now)
        XCTAssertEqual(pairing.dotID, "sample-dot")
        do { _ = try await authority.redeem(link, audience: "client", consent: true, accepted: [.chat], now: now); XCTFail() } catch { XCTAssertEqual(error as? ClientFailure, .replayed) }
    }
    func testExpiryCancellationAndFreshRetry() async throws {
        let now = Date(timeIntervalSince1970: 1000)
        let backend = try Backend(id: "remote", kind: .remotePrivate, endpoint: "https://example.invalid")
        let expired = try FixturePairingAuthority(audience: "client", backend: backend, now: now, ttl: 1)
        do { _ = try await expired.redeem(expired.link, audience: "client", consent: true, accepted: [], now: now.addingTimeInterval(1)); XCTFail() } catch { XCTAssertEqual(error as? ClientFailure, .expired) }
        let cancelled = try FixturePairingAuthority(audience: "client", backend: backend, now: now)
        await cancelled.cancel()
        do { _ = try await cancelled.redeem(cancelled.link, audience: "client", consent: true, accepted: [], now: now); XCTFail() } catch { XCTAssertEqual(error as? ClientFailure, .cancelled) }
        let retry = try FixturePairingAuthority(audience: "client", backend: backend, now: now)
        _ = try await retry.redeem(retry.link, audience: "client", consent: true, accepted: [], now: now)
    }
    func testConnectionRequiresAllEvidenceAndMobilePrivateRoute() throws {
        let backend = try Backend(id: "local", kind: .localDesktop, endpoint: "http://localhost:8787")
        var e = ConnectionEvidence()
        XCTAssertThrowsError(try checkConnection(backend, platform: .desktop, evidence: e))
        e.authenticated = true
        XCTAssertThrowsError(try checkConnection(backend, platform: .desktop, evidence: e))
        e.compatible = true; e.authorized = true; e.reachable = true; e.running = true
        try checkConnection(backend, platform: .desktop, evidence: e)
        XCTAssertThrowsError(try checkConnection(backend, platform: .ios, evidence: e))
        e.privateRoute = try Backend(id: "route", kind: .remotePrivate, endpoint: "https://private.example.invalid")
        try checkConnection(backend, platform: .ios, evidence: e)
        e.reachable = false
        XCTAssertThrowsError(try checkConnection(backend, platform: .ios, evidence: e))
    }
    func testMCPTrustCapabilityAndActionRecheck() throws {
        let resource = UIResource(serviceID: "service", nodes: [.init(id: "button", kind: .button, text: "Sample", action: "echo", permissions: [.chat])])
        var host = UIHost(connected: ["service"], trusted: [], permissions: [.chat, .mcpUI], capabilities: [.button], actionPolicies: ["service": ["echo": [.chat]]])
        XCTAssertThrowsError(try composeMCPUI(resource, host: host))
        host.trusted = ["service"]
        _ = try composeMCPUI(resource, host: host)
        XCTAssertTrue(authorizeMCPAction(resource, nodeID: "button", host: host))
        host.permissions.remove(.chat)
        XCTAssertFalse(authorizeMCPAction(resource, nodeID: "button", host: host))
        host.permissions.insert(.chat); host.capabilities = [.text]
        XCTAssertThrowsError(try composeMCPUI(resource, host: host))
    }
}
