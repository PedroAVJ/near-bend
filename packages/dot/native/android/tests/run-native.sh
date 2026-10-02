#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if ! javac -version >/dev/null 2>&1; then
  echo 'BLOCKED: Java compiler/runtime absent; native controller tests unrun.' >&2
  exit 2
fi
out=$(mktemp -d "${TMPDIR:-/tmp}/near-dot-android-tests.XXXXXX")
trap 'rm -rf "$out"' EXIT HUP INT TERM
javac --release 17 -d "$out" app/src/main/java/org/neardot/client/SetupController.java tests/SetupControllerTest.java
java -cp "$out" org.neardot.client.SetupControllerTest
