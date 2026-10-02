# Open Dot / near-dot

Open Dot is a shared client application built with near-function (F). The same client pairs with personal desktop or private remote deployments. Each deployment owns its Dots, connected services, tools, storage and access. This package does not embed a business-specific workflow.

## Web milestone

Run `npm run build --workspace near-dot`, then `npm run preview --workspace near-dot`. The preview binds only loopback and uses an in-memory synthetic fixture. The built `dist` contains static HTML/CSS/ES modules and an explicit browser-only F dependency closure. No Node pairing authority or provider credentials enter it.

The client has an injected adapter contract: issue, redeem, connect, observeHost and action. Pairing links are validated by F, expire after five minutes, require authenticated owner consent supplied by the fixture, explicit recipient consent and an audience, and can be redeemed once. Manual entry and the exact QR payload are supported. This web milestone does **not** render a scannable QR or register installed-app deep links. Desktop/native adapters can display QR for the same link.

Deployment trust is explicit. Installation does not authenticate or establish network reachability. Backend identity and endpoint must match the redeemed pairing. A browser/mobile client needs a separately observed private route to reach a desktop backend. Fixture evidence is injected, clearly labeled in the UI, and never proves an actual remote service is reachable. No fixture request contacts the example remote endpoint.

F validates service connection, trust, host capabilities and action permissions. Its browser renderer composes typed text/button components; action authorization is observed again before invocation. Unsupported arbitrary HTML/JS/frames are not loaded. This is a bounded declarative composition adapter, **not a complete MCP Apps protocol implementation**.

State and pairing data remain in memory and disconnect clears them. Cancellation ignores late responses. Retrying issues a fresh link; replay and expiry fail. The preview requires exact Host and Origin headers, bounds request bodies, rejects symlink escapes and path traversal, and restricts browser connections with CSP. It is a local verification fixture, not a production authenticated backend.

## Verification

`npm test --workspace near-dot` checks client lifecycle and the loopback fixture. `scripts/browser-check.mjs` takes an evidence directory and an existing Chrome CDP screenshot harness path. It checks desktop and mobile trust, consent, pairing, replay, retry, cancellation, disconnect, declarative service rendering/action and viewport overflow. It creates and closes a temporary loopback fixture and Chrome profiles; it performs no deployment.

## Web deployment checks without a pass

| Check | Status | Reason / next step |
|---|---|---|
| Production backend authentication | Unimplemented adapter | Replace fixture with reviewed authenticated deployment transport. |
| Deployment protocol negotiation | Not observed live | Exercise a compatible authenticated deployment; fixture evidence is synthetic. |
| Private desktop route | Not observed | Supply and verify a reachable private endpoint; loopback alone is insufficient on another device. |
| Production service UI transport | Unimplemented | Implement supported MCP Apps transport/sandbox before advertising full MCP Apps support. |
| Browser QR encoder/scanner | Absent capability | Add an audited encoder/scanner adapter; manual entry already works. |
| Production pairing persistence/atomic redemption | Unimplemented adapter | Use transactional server storage rather than the fixture's single-process map. |
| Deployment destination and TLS | Not observed | Confirm destination and artifact before any separately authorized release. |
| Public web upload / release | Not run | Build and verify only are authorized. |

No live credentials, authentication grants, accounts, permissions, infrastructure or app-store submissions were created or changed.
