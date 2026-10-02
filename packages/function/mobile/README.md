# F mobile sandbox contracts

`near-function/platform` describes iOS and Android sandbox hosts for the same generic Open Dot client. A compatible deployment owns dots, tools, storage and access policy. F owns reusable target, capability and readiness contracts; deployment-specific frontend composition belongs in the Dot template. Selecting a Dot does not authenticate its owner, establish backend reachability, or grant connected-service permissions.

Implemented here: pure validated JS target definitions, strict TypeScript contracts, platform API declarations, two synthetic F cases and dry-run requirements/evidence evaluation. Bend provides typed constructors and a bounded basic-evidence predicate, checked and executed with four synthetic cases. Its predicate is necessary evidence only: it does not implement the extra JS policy gates or semantic parity. No iOS/Android renderer, device bridge, app binary, signed archive, store submission, device run, network probe or approval-verification adapter exists. API declarations all report `declared` and `nativeAdapter:false`.

Targets explicitly choose `html-js` or `structured-ui`, requested capabilities, distribution and backend placement. A `local-desktop` backend requires an explicit LAN/private-relay HTTPS address reachable from the phone; mobile loopback cannot reach another machine. A `remote-private` backend uses a remote HTTPS address. Addresses must contain no userinfo, query or fragment. Parsing an address is not trust establishment or a connectivity test: readiness separately requires authentication, observed connectivity and service consent. Runtime adapters must enforce trusted content origins and sandbox isolation before rendering service UIs. Provider credentials stay server-side. Pairing/setup contracts are a separate core module; this target contract neither issues links nor authenticates a deployment.

```js
import {mobileCases, planMobileTarget} from 'near-function/platform';
const plan = planMobileTarget(mobileCases[0].target);
// ready:false; executable:false. Installation supplies none of the missing evidence.
```

`mobileDeploymentRequirements` returns signed-bundle artifact requirements, runtime/device/security checks and external approval gates. These are mobile-host requirements, not invented Node/container executors. Existing V runtime enums remain unchanged; a future V bridge must consume the external checks explicitly. The dry-run cannot submit or deploy. Caller-supplied approval records must match application, version and exact bundle SHA256; a reference is recorded, not cryptographically authenticated. Changing bytes/version invalidates prior evidence. A passing synthetic observation means only that this bounded evidence contract passes, never that Apple or Google will accept an app.

## Current official policy evidence

Checked 2026-10-02. [Apple App Review Guidelines, 4.7](https://developer.apple.com/app-store/review/guidelines/#mini-apps-mini-games-streaming-games-chatbots-plug-ins-and-game-emulators) conditionally permits specified software outside the binary. Host responsibility includes compliance, privacy, moderation/reporting/blocking, purchase rules, a software index with universal links, and age restrictions. Native platform API exposure requires prior Apple permission; sharing data/privacy permissions requires explicit consent per software instance. Accordingly, iOS HTML/JS targets requesting a native bridge have an additional external permission gate. Store review remains external evidence; local checks cannot confer acceptance. The actual implementation/distribution must be assessed against the full guidelines, including completeness and privacy rules.

[Google Play Device and Network Abuse](https://support.google.com/googleplay/android-developer/answer/9888379) restricts updates and externally downloaded native executable code, with an interpreter/VM exception that still requires policy compliance. Untrusted WebView content bridged to native APIs can violate policy. [Android unsafe URI loading guidance](https://developer.android.com/privacy-and-security/risks/unsafe-uri-loading) calls for parsed scheme and exact host validation, rather than substring trust. [Android security checklist](https://developer.android.com/privacy-and-security/security-tips) explains sandbox resource sharing and permission minimization. These contracts declare checks and capability boundaries; actual adapters must enforce them on-device.

## Verification and integration

All work is isolated. Parent integration should copy `packages/function/mobile/` and this document, add package export `./platform` with `types:./mobile/index.d.mts`, `import:./mobile/index.mjs`, include mobile tests in the package test glob, and include the Bend entry points in existing compiler checks. No root manifest is modified by this worker.

Commands passed:

- `node --test packages/function/mobile/tests/mobile.test.mjs`: nine synthetic tests.
- `tsc --noEmit --strict --module nodenext --moduleResolution nodenext --target es2022 packages/function/mobile/tests/consumer.ts`: positive imports plus rejected unsupported capability/backend transport.
- `bun tools/bend/main.ts packages/function/mobile/tests/native.bend --check-only`: all proofs check (compiler/type check, not an assertion of policy correctness).
- `bun tools/bend/main.ts packages/function/mobile/tests/native.bend`: four native evidence cases executed.

Missing release work: concrete iOS/Android host adapters and sandbox implementation, application builds/signing, on-device tests, privacy/content/payment configuration and official review evidence. These remain blocked rather than advertised as finished.
