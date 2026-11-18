#!/usr/bin/env bash
# Installs the Play edition on a running emulator, opens it the way a player
# (or a Play reviewer) does, and fails unless the game actually loads.
#
# A launch that merely doesn't crash is not a pass: Play rejected Bubble
# Pop's first upload because the app opened onto the WebView's error page
# instead of the game. So besides a crash or a hang this fails when the page
# never reports itself loaded (MainActivity logs POCKETDECKS_READY once it has),
# when the page has nothing on it, when it failed to load, when a file it
# asks for is missing from the APK, or when its script throws.
#   tools/launch-test.sh <apk> [package]
set -uo pipefail
APK="$1"
PKG="${2:-com.taugustincst.pocketdecks}"
OUT="${LAUNCH_TEST_OUT:-launch-test}"
mkdir -p "$OUT"

fail() { echo "launch-test: FAIL: $*"; exit 1; }
# What the WebView and the app said, printed into the job log itself, for a
# page that never reports itself loaded (the logcat artifact is not always
# reachable): the app's and Chromium's own lines, and its processes.
diag() {
  local app web
  app=$(adb shell pidof "$PKG" 2>/dev/null | tr -d '\r')
  web=$(adb shell ps -A 2>/dev/null | awk '/sandboxed_process/ {print $2}' | tr '\n' ' ')
  echo "---- launch-test: page events (POCKETDECKS_STARTED, _FINISHED, _READY) ----"
  grep -E "POCKETDECKS_(STARTED|FINISHED|READY|LOAD_ERROR|MISSING)" "$OUT/logcat.txt" || echo "(none)"
  echo "---- launch-test: the app's own log, pid ${app:-?} (last 60) ----"
  [ -n "$app" ] && adb logcat -d --pid="$app" | tail -60
  for p in $web; do
    echo "---- launch-test: WebView renderer, pid $p (last 30) ----"
    adb logcat -d --pid="$p" | tail -30
  done
  echo "---- launch-test: Console and chromium lines (last 40) ----"
  grep -E "POCKETDECKSWeb|chromium|Console" "$OUT/logcat.txt" | tail -40
  echo "---- launch-test: processes ----"
  adb shell ps -A 2>/dev/null | grep -E "$PKG|sandboxed_process" || true
  echo "----"
}

adb wait-for-device
adb install -r "$APK" || fail "the APK did not install"
adb shell pm clear "$PKG" >/dev/null 2>&1 || true
adb logcat -c
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
# Wait for the page rather than a fixed time: the first WebView start on a
# cold emulator can take longer than any fixed sleep, and a fixed wait raced it.
# Poll logcat every 2 s, for up to 60 s, until the page reports itself loaded
# or the app crashes, hangs or fails to load; then settle 3 s, so an error the
# page logs just after loading is still caught, and run the same checks.
for _ in $(seq 1 30); do
  sleep 2
  adb logcat -d > "$OUT/logcat.txt"; grep -qE "POCKETDECKS_READY elements=|POCKETDECKS_LOAD_ERROR|FATAL EXCEPTION|ANR in $PKG" "$OUT/logcat.txt" && break
done
sleep 3
adb exec-out screencap -p > "$OUT/after-launch.png" || true
adb logcat -d > "$OUT/logcat.txt"
adb shell dumpsys activity activities | grep -E "mResumedActivity|topResumedActivity" | tee "$OUT/resumed.txt" || true

if grep -A2 "FATAL EXCEPTION" "$OUT/logcat.txt" | grep -q "Process: $PKG"; then
  grep -A30 "FATAL EXCEPTION" "$OUT/logcat.txt" | head -60
  fail "$PKG crashed at launch"
fi
grep -q "ANR in $PKG" "$OUT/logcat.txt" && fail "$PKG stopped responding at launch"
grep -q "Error opening asset path" "$OUT/logcat.txt" && fail "the asset loader could not open a packaged file"
if grep -q "POCKETDECKS_LOAD_ERROR" "$OUT/logcat.txt"; then
  grep "POCKETDECKS_LOAD_ERROR" "$OUT/logcat.txt"
  fail "the game's page did not load"
fi
if grep "POCKETDECKS_MISSING" "$OUT/logcat.txt" | grep -v "/sw.js" | grep -q .; then
  grep "POCKETDECKS_MISSING" "$OUT/logcat.txt"
  fail "the page asked for a file the APK does not carry"
fi
if grep -E "E POCKETDECKSWeb|POCKETDECKSWeb.*Uncaught" "$OUT/logcat.txt" | grep -v "sw.js" | grep -q .; then
  grep -E "POCKETDECKSWeb" "$OUT/logcat.txt" | head -20
  fail "the game's script reported an error"
fi
READY=$(grep -o "POCKETDECKS_READY elements=[0-9]*" "$OUT/logcat.txt" | tail -1)
[ -n "$READY" ] || { diag; fail "the game's page never finished loading (no POCKETDECKS_READY line)"; }
N="${READY##*=}"
[ "${N:-0}" -ge 10 ] || fail "the page loaded nearly empty ($N elements)"
adb shell pidof "$PKG" >/dev/null || fail "$PKG is no longer running"
echo "launch-test: $PKG loaded the game ($N elements on the page) and is still running"
