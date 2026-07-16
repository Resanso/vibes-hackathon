#!/usr/bin/env bash
# iOS Maestro E2E test runner for mobile-app. Registered as a Stop hook in
# .claude/settings.json — every new screen needs a passing Maestro flow in
# mobile-app/.maestro/ before work on it counts as done; this is enforced
# automatically here, not just a convention (see mobile-app/CLAUDE.md).
#
# All diagnostic/failure output goes to stderr — Claude Code's blocking Stop
# hook feedback only surfaces stderr, not stdout. A script that only echoes
# to stdout reports "No stderr output" on failure, which is useless.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$REPO_ROOT/mobile-app"
DEVICE="iPhone 17"
BUILD_TIMEOUT_SECS=600

log() { echo "$1" >&2; }

# Portable timeout wrapper (macOS has no `timeout`/`gtimeout` by default) —
# without this, a hung `npx expo run:ios` (e.g. trying to reach a blocked
# registry with no local node_modules) burns the entire hook timeout with no
# useful diagnostic instead of failing fast with a clear reason.
run_with_timeout() {
  local timeout_secs=$1
  shift
  "$@" &
  local pid=$!
  ( sleep "$timeout_secs" && kill -9 "$pid" 2>/dev/null ) &
  local watcher=$!
  wait "$pid" 2>/dev/null
  local status=$?
  kill "$watcher" 2>/dev/null
  wait "$watcher" 2>/dev/null
  return $status
}

cd "$REPO_ROOT"

# Skip entirely if this session touched nothing under mobile-app/ — keeps
# backend/whatsapp-service-only sessions fast, per the guard this hook needs.
if [ -z "$(git status --porcelain -- mobile-app 2>/dev/null)" ]; then
  log "==> No changes in mobile-app/ this session, skipping iOS test run."
  exit 0
fi

log "==> Changes detected in mobile-app/, running iOS E2E tests"

# Environment-not-ready checks below exit 0 (non-blocking), not 1/2 — these
# are conditions only a human can fix (run an install, plug in a simulator),
# not something Claude re-attempting work will resolve. Blocking on them
# would just loop the Stop hook forever with nothing new to act on. Only an
# actual test run that fails (build breaks, a flow fails) should block.
if [ ! -x "$MOBILE_DIR/node_modules/.bin/expo" ]; then
  log "SKIP (not blocking): mobile-app/node_modules is missing (or incomplete) — run 'npm install' (and 'npx expo install --check') in mobile-app/ first. Not attempting a build: npx would try to fetch expo from the registry, which is unreachable from this sandbox and hangs rather than failing fast."
  exit 0
fi

if ! command -v maestro >/dev/null 2>&1; then
  log "SKIP (not blocking): maestro CLI not found on PATH."
  exit 0
fi

log "==> Looking up simulator: $DEVICE"
if ! run_with_timeout 30 bash -c "xcrun simctl list devices available > /tmp/nera-simctl-list.$$ 2>&1"; then
  log "SKIP (not blocking): 'xcrun simctl list devices' timed out after 30s — CoreSimulatorService may be wedged. Try: killall -9 com.apple.CoreSimulator.CoreSimulatorService, then retry."
  exit 0
fi
DEVICE_ID=$(grep -F "$DEVICE (" "/tmp/nera-simctl-list.$$" | grep -oE '[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}' | head -1)
rm -f "/tmp/nera-simctl-list.$$"

if [ -z "$DEVICE_ID" ]; then
  log "SKIP (not blocking): simulator '$DEVICE' not found. Available devices:"
  xcrun simctl list devices available >&2
  exit 0
fi
log "==> Found device: $DEVICE_ID"

if xcrun simctl list devices | grep "$DEVICE_ID" | grep -q "Booted"; then
  log "==> Simulator already booted, skipping boot step."
else
  log "==> Booting simulator: $DEVICE ($DEVICE_ID)"
  xcrun simctl boot "$DEVICE_ID" 2>&1 | while IFS= read -r line; do log "    $line"; done
  log "==> Waiting for boot to complete (max 60s)..."
  if ! run_with_timeout 60 xcrun simctl bootstatus "$DEVICE_ID" -b 1>&2; then
    log "SKIP (not blocking): simulator boot did not complete within 60s — CoreSimulatorService may be wedged. Try: killall -9 com.apple.CoreSimulator.CoreSimulatorService, then retry."
    exit 0
  fi
fi
log "==> Opening Simulator.app"
open -a Simulator 2>/dev/null || true

cd "$MOBILE_DIR"

log "==> Building & installing app on simulator (expo run:ios) — first run can take a few minutes, hard-capped at ${BUILD_TIMEOUT_SECS}s"
if ! run_with_timeout "$BUILD_TIMEOUT_SECS" npx expo run:ios --device "$DEVICE" 1>&2; then
  log "FAIL: expo run:ios build/install failed or timed out after ${BUILD_TIMEOUT_SECS}s — see output above."
  exit 1
fi

log "==> Running Maestro flows: mobile-app/.maestro/"
if ! maestro test .maestro/ 1>&2; then
  log "FAIL: one or more Maestro flows failed — see flow-by-flow output above for which one and why."
  exit 1
fi

log "==> All Maestro flows passed."
exit 0
