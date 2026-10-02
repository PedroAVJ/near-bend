# Open Dot native Apple client milestone

Shared native SwiftUI client sources for macOS 14+ and iOS 17+. This client composition belongs in `near-dot`; reusable setup/backend/MCP contracts mirror F (`near-function`) and do not introduce application-specific workflows. Swift does not execute the JavaScript F authority: this milestone has a clearly labeled synthetic local adapter only. A native wire adapter remains required.

Implemented: deployment kind selection; validated manual/installed-client deep-link input; explicit pairing consent; bounded single-use/expiry/audience/cancel/retry fixture lifecycle; actual CoreImage QR encoding of the same pairing link; authentication, protocol, authorization, reachability and mobile private-route gates; trusted declarative MCP text/button rendering with capability/permission and action-policy rechecks. No arbitrary endpoint is automatically trusted. Form UI is not advertised as supported. The fixed fixture code is intentionally not production issuance; production must use F's random, hashed single-use authority and authenticated principals. Codes stay in memory and are not logged or persisted.

```sh
./script/build_and_run.sh --build-only
./script/build_ios.sh
swift test --disable-sandbox
```

Artifacts default to ignored `dist/`. `NEAR_DOT_BUILD_DIR` and `NEAR_DOT_SCRATCH_DIR` place build evidence outside the checkout. The macOS app can be launched explicitly with `./script/build_and_run.sh run`. The iOS script links an unsigned arm64 simulator `.app` against the installed simulator SDK; this is a real executable, not a distribution archive. No dependencies are downloaded. SwiftPM's nested sandbox may need disabling under an existing tool sandbox. CoreImage/Vision QR verification needs access to installed system services; a sandbox-only QR test can fail despite the same test passing with authorized local access.

Remaining deployment checks, individually:

| Check | Status | Reason / next step |
| --- | --- | --- |
| Apple distribution signing identity | absent capability | Read-only query found zero valid code-signing identities. Obtain/select the appropriate identity only with separately authorized credential workflow. |
| Developer account/team/enrollment | not observed | Xcode preference configuration exists; no account tokens or account authentication were read. Confirm the intended team and enrollment through official Xcode/account UI. |
| Production bundle identifier and app record | unimplemented | Current `org.near-dot.fixture` is a local fixture identifier. Choose actual destination and create records only after authorization. |
| Signed device archive and provisioning | unimplemented | Simulator build is unsigned; no device archive/provisioning profile is selected. Prepare archive once destination/team are confirmed. |
| Physical iPhone runtime | not observed | Only dedicated local simulator verified; no physical device installed. |
| Live deployment authentication/redemption | unimplemented | No URLSession wire API, secure token storage, principal discovery, real host server or transactional authority exists in this native milestone. |
| Actual backend compatibility/network/access | not observed | All passing connection evidence is explicitly synthetic. Installation does not authenticate or establish private routing. |
| Camera QR scanner | unimplemented | Manual entry of QR text and QR display exist; no camera permission or scanning adapter is installed. |
| Universal-link association and trusted callback deployment | unimplemented | Strict custom-scheme route exists; production associated domain and approved callback policy are not configured. |
| Store assets/privacy/support/age controls | unimplemented | No app icon/catalog, privacy policy, App Store metadata, moderation/index/age restriction implementation or distribution entitlement review has been completed. |
| App Review approval | not observed | External Apple review gate; native builds and modeled checks cannot establish acceptance. |
| macOS distribution/notarization | unimplemented | Local app bundle only; Developer ID/App Store route, hardened runtime, sandbox/entitlements, signing and notarization are not prepared. |
| General MCP web/form/camera/tool bridge | unimplemented | Bounded text/button renderer only; no arbitrary code/native API exposure. |

Official policies inspected: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), especially 4.7 and privacy rules, and [macOS notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution). Apple 4.7 conditionally permits listed nonembedded software and imposes privacy, moderation, commerce, API-exposure, per-instance consent, index/universal-link and age-access requirements. Whether this particular client falls within those rules is an external review decision; declarations are not acceptance evidence. This bounded declarative renderer is not a claim of full 4.7 compliance.

No distribution, submission, publication, credentials, OAuth grants, security settings, physical-device installs or live provider calls were performed.
