# Product context — Nera

Nera helps Indonesian university students make safer financial decisions across
their entire borrowing journey (pinjaman online, cicilan, paylater kampus). Built
for Garuda Hacks 7.0, Track 2 (Safety).

## HMW questions

- How might we help students see the true cost of a loan before they commit,
  not after the first missed payment?
- How might we surface safer, campus-available alternatives at the moment a
  student is about to borrow, instead of after the fact?
- How might we give students an honest, ongoing picture of their financial risk
  without needing them to understand credit terminology?

## The 7-step flow

1. **Onboarding** — student intent, no financial data collected yet
2. **Financial Survival Check** — self-reported profile (income, existing debt)
3. **Borrowing Scenario** — student describes a loan they're considering
4. **Financial Risk Intelligence** — true cost-of-credit simulation + deterministic
   risk score, explained in plain language
5. **Decision Support** — campus-available alternatives to the loan being considered
6. **Financial Safety Dashboard** — trend of the student's self-reported entries
   over time (lives inside `mobile-app`, not a separate surface)
7. **AI Coach** — ongoing plain-language coaching, narrative only

## Privacy principle

Every input into the system is something the student explicitly typed or
submitted — never inferred from device signals (installed apps, contacts, SMS,
location, etc.). If a feature would require reading device signals to work, it's
out of scope, not a workaround to design around.

### Exception: consent-based pinjol usage tracking (Android only, debug/testing)

One narrow, explicit exception, added 2026-07-17 for an in-progress experiment:
detecting how often and how long a student opens known pinjol (online loan) apps,
surfaced on the Financial Safety Dashboard (step 6).

- Requires an explicit in-app consent screen before any device signal is read —
  no silent collection. The consent copy must name exactly what's read (app open
  count + foreground duration for a defined pinjol app list) and let the student
  decline without blocking the rest of the app.
- Android only, via `UsageStatsManager` (user must manually grant Usage Access in
  system Settings — this can't be requested as a normal runtime permission).
  iOS has no equivalent public API for reading other apps' usage, so this feature
  cannot exist on iOS; do not attempt an iOS workaround.
- Scope stays narrow: open count + time-in-app for a specific pinjol app list.
  Not general installed-app enumeration, not SMS, not contacts, not location.
- Currently debug/testing only, gated behind development builds while validated
  on a real Android device — not yet a claimed feature for the hackathon
  submission or demo. Revisit before demo day whether this ships or gets pulled.

Everything else in this principle (SMS, contacts, location, general installed-app
lists) remains out of scope, full stop — this exception does not generalize.

### Exception: consent-based pinjol app blocking (Android only, proof-of-concept)

Second narrow exception, added 2026-07-17, layered on top of the usage-tracking
one above. A teammate is building the real anomaly-detection algorithm that
should decide *when* to trigger this separately — this exception only covers
the blocking *mechanism* itself, exposed for now as a manual debug toggle in
`ProfileTab` so it can be tested and later wired to that algorithm's output.

- Mechanism: Android `AccessibilityService` watches foreground-app change
  events; when the foreground package matches the same fixed pinjol app list
  from the usage-tracking exception AND the debug toggle is on, it redirects
  to a screen inside Nera's own app explaining the block (via a `nera://`
  deep link the service launches) — not a system `SYSTEM_ALERT_WINDOW`
  overlay drawn on top of the other app, and not `GLOBAL_ACTION_HOME` (the
  original version of this exception, revised 2026-07-17 once the "why was I
  blocked" explanation was added). No reading of on-screen content beyond the
  foreground package name.
- Requires its own explicit consent + a separate system permission grant
  (Accessibility Service is a materially more sensitive permission class than
  Usage Access — Play Store restricts it to apps with a core accessibility
  purpose). The consent copy must say plainly that this is a proof-of-concept
  that can force-close other apps, separate from the usage-tracking consent.
- Android only — no iOS equivalent exists; do not attempt an iOS workaround.
- Debug/testing only, manual toggle in `ProfileTab`, not wired to any real
  detection logic yet (that's the teammate's in-progress algorithm). Revisit
  before demo day: this either gets a real trigger condition or gets pulled,
  same as the usage-tracking exception above.
- Scope stays narrow: foreground-package-name watching + home-screen redirect
  for the fixed pinjol list only. Not screen content reading, not input
  interception, not device-admin/MDM enrollment.

### Known gap (not a blessed exception): notification-listener threat detection

Added by a teammate 2026-07-17 (`mobile-app/src/services/NotificationService.ts` +
`ThreatDetector.ts` + `plugins/withNotificationService.js` +
`assets/threat_detection.onnx`), landed on `main` without going through the
exception process the two entries above did. Documented here for
transparency, not endorsed as compliant — team decision (2026-07-17) was to
keep it as shipped rather than fix it before demo.

- Mechanism: registers an Android `NotificationListenerService`
  (`BIND_NOTIFICATION_LISTENER_SERVICE`), which receives title+text of
  **every notification from every app on the device** — not scoped to the
  pinjol app list used by the two exceptions above. Runs each one through an
  on-device ONNX classifier; shows an Alert if flagged "Threat."
- **Mitigating fact, verified in the code (2026-07-17)**: `ThreatDetector.ts`
  never persists the raw title/text anywhere — it's held in memory only
  for the duration of one `analyzeNotification()` call, run through the
  on-device ONNX model, and discarded; nothing is written to a database or
  sent to any remote server (the model call is local, unlike `explainRisk`/
  `coachChat` in `backend`, which do call an external AI API). The one
  `console.log` that exists logs the output label only, not the raw text.
  **Updated same day**: a `SafetyDashboard` tracking card was added on top
  of this (`src/utils/threatDetectionLog.ts`), so a positive detection now
  persists locally — but deliberately only a timestamp + source app package
  name (e.g. `com.finaccel.android`), never the notification's title/text.
  That distinction was kept intentional specifically so this addition
  wouldn't quietly widen the feature into storing message content.
- **Still does not meet this doc's bar for an exception, and retention
  isn't the reason**: the consent requirement here is about the *act of
  reading* every app's notification content, not about how long it's kept.
  `App.tsx` requests the OS permission silently on boot
  (`checkAndRequestNotificationPermission()`) with no in-app disclosure UI —
  Play Store's Notification Listener policy requires that disclosure
  regardless of whether the data is later persisted. Scope is also still
  unbounded (every app, not the fixed pinjol list the other two exceptions
  use) — a debt-collector threat could arrive via SMS or WhatsApp, but so
  could a bank OTP or a private message, and this reads all of them
  identically before discarding them.
- Android only, same as the other two — no iOS equivalent.
- Flagged risk, not resolved: if this ships to Play Store or gets scrutinized
  in a Track 2 (Safety) hackathon review, "app reads all your notifications
  with no consent screen" is a real problem for a *financial safety* product
  specifically, not just a generic privacy nitpick. If this needs to become
  legitimately defensible later, the fix is the same pattern as the two
  exceptions above (explicit consent screen naming exactly what's read, and
  scoping to the known pinjol app list instead of every app) — not wording
  or framing.

## Scope note

There is no separate web dashboard / institutional portal — dropped from scope.
If a "dashboard" feature is requested, it means step 6 inside `mobile-app`, not a
new surface.
