# Open Dot Android native client

This is a bounded native Java source milestone for `near-dot`, consuming the F setup protocol through a native adapter boundary. Native Android controls accept manual pairing links or installed-client `near-dot://setup/pair` Intents, require consent, cancel/reset safely, and clearly report unavailable connection adapters. Incoming Intents never authenticate a deployment or automatically redeem a bearer code. Codes stay in memory and are not logged, saved, or included in provider credentials. The controller accepts an audience supplied by a future authenticated installation identity, not an audience shared by all Android users.

The desktop QR carries the same link as manual entry. Camera scanning is not implemented. A desktop loopback endpoint is not reachable from a phone without a separately authenticated, compatible and reachable private route. No Internet/camera/microphone/storage permission is declared or granted in this offline milestone. Existing Mac security settings and credentials remain untouched.

`SetupController` is a native implementation of a subset of the setup state contract, **not compiled F code**. F's authority owns expiry, single-use consumption, owner identity/consent, callback allowlisting and audience enforcement. Its native `Redeemer` boundary must eventually call an authenticated compatible deployment; the Activity has no production backend adapter and cannot report a successful connection. It currently renders no remote MCP UI or arbitrary HTML/JavaScript.

## Verification

```sh
python3 tests/check-manifest.py
NEAR_FUNCTION_SETUP_ROOT=/path/to/F-root node --test tests/contracts.test.mjs
sh tests/run-native.sh
# After an independently provisioned/approved JDK, SDK and Gradle are available:
gradle --offline :app:assembleRelease
```

The F root contains `setup/client.mjs` and `setup/server.mjs`; fixture tests call those real modules, not a Java model. Tests pass for the shared contract and manifest; Java compiler/controller tests, Activity build, APK and device tests are **unrun/blocked**. No Gradle wrapper binary is fabricated. Release and debug signing are explicitly disabled to prevent automatic credential creation. `assembleRelease` is build-only and should produce an unsigned APK; do not run install/publish tasks.

Pinned toolchain: Android Gradle plugin 9.4.0, Gradle 9.6.0, JDK 17, Android API 36 and SDK Build Tools 36.0.0. This configuration has not executed on this Mac. Discovery found no standard SDK/JDK, configured SDK/JAVA environment, Gradle executable/cache or Android Studio. An existing debug keystore was observed by existence only; it is not a release identity and was not opened, exported, changed or used.

## Remaining deployment checks

See `readiness.json` for each check and reason. Next engineering step is provision an approved build environment, compile/run controller fixtures and unsigned APK, then implement authenticated deployment selection, audience identity, native transport and safe declarative MCP UI renderer. Pairing/device/application test evidence must precede any release. Store signing, Play Console destination, privacy/Data Safety, app assets and review are separate gates; no store acceptance is inferred from contracts.

Current official sources checked 2026-10-02:

- [Android command-line builds](https://developer.android.com/build/building-cmdline): distinguish unsigned build from signed device/store distribution.
- [AGP 9.4 compatibility](https://developer.android.com/build/releases/agp-9-4-0-release-notes): Gradle 9.6, JDK 17, Build Tools 36.
- [Android deep links](https://developer.android.com/training/app-links/create-deeplinks): installed routing does not establish service trust; verified HTTPS App Links require a future approved domain/destination association.
- [Google Play Device and Network Abuse](https://support.google.com/googleplay/android-developer/answer/16559646): no downloaded dex/JAR/native executable code; interpreted content remains subject to policy. Future MCP UI rendering must not give untrusted content a privileged native bridge. This implementation downloads or executes no remote code. Store review remains an external gate.
