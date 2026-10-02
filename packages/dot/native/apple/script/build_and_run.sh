#!/usr/bin/env bash
set -euo pipefail
MODE="${1:---build-only}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${NEAR_DOT_BUILD_DIR:-$ROOT/dist}/macos/NearDot.app"
SCRATCH="${NEAR_DOT_SCRATCH_DIR:-${TMPDIR:-/tmp}/near-dot-apple-build}"
cd "$ROOT"
export CLANG_MODULE_CACHE_PATH="${TMPDIR:-/tmp}/near-dot-apple-clang-cache"
export SWIFTPM_MODULECACHE_OVERRIDE="${TMPDIR:-/tmp}/near-dot-apple-swift-cache"
swift build --disable-sandbox --scratch-path "$SCRATCH" --cache-path "${TMPDIR:-/tmp}/near-dot-apple-package-cache" --config-path "${TMPDIR:-/tmp}/near-dot-apple-config" --security-path "${TMPDIR:-/tmp}/near-dot-apple-security"
BIN="$(swift build --disable-sandbox --scratch-path "$SCRATCH" --show-bin-path)/NearDot"
mkdir -p "$OUT/Contents/MacOS"
cp "$BIN" "$OUT/Contents/MacOS/NearDot"
cat > "$OUT/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleExecutable</key><string>NearDot</string><key>CFBundleIdentifier</key><string>org.near-dot.fixture</string><key>CFBundleName</key><string>Open Dot</string><key>CFBundlePackageType</key><string>APPL</string><key>LSMinimumSystemVersion</key><string>14.0</string><key>NSPrincipalClass</key><string>NSApplication</string><key>CFBundleURLTypes</key><array><dict><key>CFBundleURLSchemes</key><array><string>near-dot</string></array></dict></array></dict></plist>
PLIST
plutil -lint "$OUT/Contents/Info.plist"
case "$MODE" in
  --build-only) echo "Unsigned macOS bundle: $OUT" ;;
  run|--verify|--logs|--telemetry|--debug)
    # Stop only this exact built executable, never another NearDot process.
    pkill -f "^$OUT/Contents/MacOS/NearDot$" >/dev/null 2>&1 || true
    if [[ "$MODE" == --debug ]]; then lldb -- "$OUT/Contents/MacOS/NearDot"; exit; fi
    /usr/bin/open -n "$OUT"
    if [[ "$MODE" == --verify ]]; then sleep 1; pgrep -f "^$OUT/Contents/MacOS/NearDot$" >/dev/null; fi
    if [[ "$MODE" == --logs || "$MODE" == --telemetry ]]; then /usr/bin/log stream --info --style compact --predicate 'process == "NearDot"'; fi
    ;;
  *) echo "usage: $0 [--build-only|run|--verify|--debug|--logs|--telemetry]" >&2; exit 2 ;;
esac
