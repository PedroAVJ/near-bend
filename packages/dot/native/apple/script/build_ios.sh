#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${NEAR_DOT_BUILD_DIR:-$ROOT/dist}/ios-simulator/NearDot.app"
SDK="$(xcrun --sdk iphonesimulator --show-sdk-path)"
mkdir -p "$OUT"
SOURCES=()
while IFS= read -r -d '' file; do SOURCES+=("$file"); done < <(find "$ROOT/Sources" -name '*.swift' -print0)
xcrun --sdk iphonesimulator swiftc -parse-as-library -sdk "$SDK" -target arm64-apple-ios17.0-simulator -module-cache-path "${TMPDIR:-/tmp}/near-dot-ios-module-cache" "${SOURCES[@]}" -Xlinker -syslibroot -Xlinker "$SDK" -o "$OUT/NearDot"
cat > "$OUT/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleExecutable</key><string>NearDot</string><key>CFBundleIdentifier</key><string>org.near-dot.fixture</string><key>CFBundleName</key><string>Open Dot</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleVersion</key><string>1</string><key>CFBundleShortVersionString</key><string>0.1.0</string><key>MinimumOSVersion</key><string>17.0</string><key>CFBundleSupportedPlatforms</key><array><string>iPhoneSimulator</string></array><key>UIDeviceFamily</key><array><integer>1</integer><integer>2</integer></array><key>UILaunchScreen</key><dict/><key>CFBundleURLTypes</key><array><dict><key>CFBundleURLSchemes</key><array><string>near-dot</string></array></dict></array></dict></plist>
PLIST
plutil -lint "$OUT/Info.plist"
file "$OUT/NearDot"
echo "Unsigned iOS simulator bundle: $OUT"
