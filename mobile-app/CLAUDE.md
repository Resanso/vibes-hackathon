# CLAUDE.md — mobile-app

React Native client — the **only** frontend in this product (no separate web
dashboard). See root `.claude/rules/product-context.md` for the original
7-step flow concept — **superseded** by the architecture below: real
email+password auth (Login/Register) gates a 5-step onboarding stack
(Register → FinancialSurvivalCheck → BorrowingScenario →
FinancialRiskIntelligence → DecisionSupport), then a persistent 5-tab
bottom navigator (Beranda/Cek Baru/Alternatif/Edukasi/Profil) as the app's
home. `AICoach` was dropped from scope — the tab bar's `Edukasi`/`Profil`
tabs cover what it would have.

**Auth, added 2026-07-17**: the old bare `Onboarding` screen (name+phone,
no credentials, no persistence) was replaced by `Register` (name, phone,
email, password → `auth.register`) and a new `Login` screen (email,
password → `auth.login`), both calling `backend`'s real auth endpoints (see
`backend/CLAUDE.md`'s "Auth" section). A session (`{ phone, name, token }`)
now persists across app restarts via `expo-secure-store` — `App.tsx` calls
`useSessionStore`'s `restoreSession()` on boot, which verifies the stored
token against `auth.me` (not just trusts it's present) before deciding the
initial route: `Login` (no valid session), `FinancialSurvivalCheck` (logged
in, `onboardingCompletedAt` still null), or straight to `MainTabs`
(logged in and already onboarded — no repeated onboarding every launch).
`ProfileTab`'s "Keluar" button (`logout-button` testID) clears the stored
session via the same `clearSession()` used for testing purposes.

All onboarding screens + the tab navigator + all 5 tabs exist and are
wired up. Design pass against reference mockups in `design-reference/` is
done for `FinancialSurvivalCheck`, `FinancialRiskIntelligence` (the
calibration screens; the old `Onboarding` mockup pass doesn't carry over
1:1 to `Register`/`Login`, which reuse the same visual language but weren't
individually re-validated against the reference); `BorrowingScenario`,
`DecisionSupport`, `SafetyDashboard` got a lighter pass using the same
components. Character illustrations from the reference mockups were
**deliberately skipped** (icon + layout + copy only) — deprioritized as a
time sink relative to finishing every screen; nice-to-have if time allows
before submission.

## Stack

- React Native via Expo (SDK ~52, see `package.json` — reconcile exact
  versions with `npx expo install --check` once installed, since they were
  hand-written without registry access)
- TypeScript, React Navigation (`@react-navigation/native-stack`, wired up in
  `src/navigation/RootNavigator.tsx`), Zustand for state
- NativeWind (Tailwind for RN) — see root `.claude/rules/design.md`'s
  "Brand tokens (locked)" section; Nera's colors/typography are final, not a
  starting point
- `lucide-react-native` for icons (outline/stroke by default)
- API client: plain `fetch` (`src/api/client.ts`), not `@trpc/client` — no
  shared `AppRouter` type across `mobile-app` and `backend` (separate npm
  projects, no workspace tooling), same reasoning already applied in
  `whatsapp-service`. Backend URL + shared API key come from
  `EXPO_PUBLIC_BACKEND_URL` / `EXPO_PUBLIC_SHARED_API_KEY` (Expo inlines
  `EXPO_PUBLIC_*` vars at build time — see `.env.example`), currently
  pointing at the live VPS (`http://103.235.75.245:3000`), not `localhost`.

## Structure

- `src/theme/colors.ts`, `src/theme/typography.ts` — locked brand tokens, raw
  values for non-className consumers (e.g. SVG props). `tailwind.config.js`
  is the className-based equivalent — both must stay in sync, see the
  comments in each file.
- `src/components/` — `PrimaryButton` (glossy pill, `showArrow` prop),
  `SecondaryButton`, `BackButton`, `StatusToast`, `StatusBadge` (aman/
  waspada/bahaya pill, exactly 3 variants), `StepProgressHeader` (logo +
  decorative circles + segmented progress bar + "Langkah X dari 5" pill;
  exports `DecorativeCircles` standalone too, used on `SafetyDashboard`),
  `IconCircleField` (icon-circle form input), `SummaryCallout` (colored
  left-border callout box), `ListItemCard` (icon + title + description +
  chevron, `featured` variant for the one recommended alternative),
  `RiskScoreGauge` (ring + score/100, no label baked in — pair with
  `StatusBadge`), `TrendChart` (custom SVG line chart with 30/60 threshold
  lines + last-point tooltip). Reuse these rather than rebuilding
  equivalents inside a screen.
- `App.tsx` — mounts `NavigationContainer` + `RootNavigator`, handles Poppins
  font loading / splash screen.
- `src/navigation/RootNavigator.tsx` — native-stack navigator for the 5-step
  onboarding sequence + `MainTabs` as its final screen (entered via
  `navigation.reset` from `DecisionSupport`, so there's no "back into
  onboarding"). `BorrowingScenario`/`FinancialRiskIntelligence` take an
  optional `standalone` route param — `true` when reached from the "Cek
  Baru" tab (skips the step header + onboarding-specific copy).
- `src/navigation/MainTabNavigator.tsx` — the 5-tab bottom navigator:
  `Beranda` (`SafetyDashboard`), `Cek Baru` (never renders — `tabPress` is
  intercepted to push `BorrowingScenario` with `standalone: true` on the
  parent stack instead), `Alternatif` (`AlternativesTab`, reuses
  `DecisionSupport.tsx`'s exported `RecommendationList`), `Edukasi`
  (`EducationPlaceholder`, no content model yet — genuinely just a
  placeholder), `Profil` (`ProfileTab`, real `profile.get` data, read-only).
- `src/screens/` — `Login`, `Register` (auth, gate everything below),
  `FinancialSurvivalCheck`, `BorrowingScenario`, `FinancialRiskIntelligence`,
  `DecisionSupport` (onboarding steps after auth), `SafetyDashboard`,
  `AlternativesTab`, `EducationPlaceholder`, `ProfileTab` (all 5 tabs).
  `Register.tsx` exports a shared `Field` component that `Login.tsx` also
  imports — small enough that a separate `components/` file felt like
  premature extraction for two consumers.
- `src/store/sessionStore.ts` — Zustand, now persisted (not session-only —
  the name is legacy). `{ phone, name, token, onboardingCompletedAt,
  isRestoring }`, set by `Register`/`Login` via `setSession()`, or restored
  on boot via `restoreSession()` (verifies the token against `auth.me`
  rather than trusting storage blindly). `clearSession()` powers both a
  real "Keluar" tap and `ProfileTab`'s testing-only reset — same effect
  either way, forget the local session so the app boots back into `Login`.
  **`expo-secure-store` needs its native module compiled into the running
  binary, confirmed the hard way (2026-07-17)**: a tester hit "Cannot find
  native module 'ExpoSecureStore'" on a dev-client build made before this
  dependency was added — same class of issue as `formDraft.ts`'s
  AsyncStorage note below, just discovered later. `safeSetItem`/
  `safeGetItem`/`safeDeleteItem` in this file catch that and fall back to
  an in-memory `Map` (not persisted across restarts, but doesn't crash) —
  do a full native rebuild (`npx expo run:ios`/`run:android`) to actually
  get persistence back. **Never select an object literal out of a Zustand
  store** (`useStore((s) => ({ a: s.a, b: s.b }))`) — it returns a new
  reference every render and causes an infinite re-render loop ("Maximum
  update depth exceeded"). Select each primitive field separately.
- `src/utils/formDraft.ts` — in-memory (not persisted across app restarts)
  draft storage so typed form values survive navigating away and back
  within a session. Not backed by AsyncStorage — that native module wasn't
  compiled into the dev-client build this was tested against; swap back if
  a future native rebuild includes it.
- `src/api/client.ts` — `trpcQuery`/`trpcMutation` helpers + typed wrappers
  per backend router used. **Known scope cut**: no full SuperJSON
  date-revival — response dates arrive as ISO strings, not `Date` objects.
  Includes the "State 2" loan-tracking wrappers (`startTracking`,
  `checkInTracking`, `getTrackingStatus`) — see "Loan payoff tracking"
  below.

## Loan payoff tracking ("State 2")

After `FinancialRiskIntelligence` shows a risk result, a secondary
"Saya Jadi Ambil Pinjaman Ini" button (`SecondaryButton`, not the primary
CTA — taking the loan is a real-world action, not just advancing the flow)
calls `tracking.start` with that `RiskEntry`'s id. This marks the loan as
actually taken (not every `risk.assess` call is a real loan — many are just
simulations) and starts daily payoff tracking on the backend
(`backend/src/server/api/routers/tracking.ts` — `LoanTracking` +
`DailyCheckIn` models, daily target = `monthlyInstallment` spread evenly
across the calendar month).

`SafetyDashboard` (the `Beranda` tab) shows a "Progress Pelunasan" card when
`tracking.status` returns non-null: remaining tunggakan, daily target, and
either a confirmed-today state or a "Sudah Sisihkan Hari Ini" button (calls
`tracking.checkIn`) plus a spiral-borrower warning callout. Confirmation
can also come from WhatsApp — `whatsapp-service`'s `/sudah` command calls
the same `tracking.checkIn` with `source: "whatsapp"`; the unique
`(loanTrackingId, date)` constraint keeps an app-tap and a WhatsApp reply on
the same day from double-counting. See `whatsapp-service/CLAUDE.md` for the
daily reminder cron (`CHECKIN_REMINDER_CRON`, default 8pm) that nudges
users who haven't confirmed yet.

## Building the next screen: `token-keeper` → `screen-builder` → `design-reviewer`

The 3 subagents in `.claude/agents/` implement this loop, but **subagent
resolution failed to pick up project-level `.claude/agents/` definitions in
this session** (`Agent type 'token-keeper' not found` etc.) — the first 2
screens were built by manually following the exact same process instead
(read `design.md`/`product-context.md`/this file → token plan scoped to
layout concept + signature element only, since color/type are locked →
self-critique → implement → cold review against the checklist). If a fresh
session still can't resolve these agent names, use the same manual fallback
and say so explicitly rather than skipping the rigor.

## Conventions

- Financial data lives in Zustand only for what's needed across screens
  (currently just identity); form fields specific to one screen (income,
  debt, etc.) live as local component state and go straight to the API on
  submit, not through the global store.
- Never call any native module for installed-app enumeration, contacts, or SMS —
  hard rule, see root `.claude/rules/product-context.md` privacy principle. The
  **one exception** (added 2026-07-17, debug/testing only, not yet a demo
  feature): `modules/pinjol-usage-stats` (Android-only `UsageStatsManager`
  wrapper) reads open count + foreground time for a fixed pinjol app list,
  gated behind an explicit in-app consent screen. Do not extend this to general
  installed-app lists, SMS, contacts, or location — see the root doc's
  "Exception" subsection for the exact boundary.
- `SafetyDashboard` (`Beranda` tab) is the one screen judges will likely
  spend the most time on during Q&A since it's the only "dashboard" in the
  product — worth polishing more than the others if time is tight
  elsewhere.
- Step indicators (`StepProgressHeader`'s segmented bar) are a legitimate
  use of ordered/numbered UI — the 5-step onboarding flow is a real fixed
  sequence, not the banned decorative `01/02/03` pattern from `design.md`.
  Only the 5 onboarding screens show one; tab screens (`Beranda`,
  `Alternatif`, `Edukasi`, `Profil`) never do — they're not steps in a
  sequence.
- Interactive elements that Maestro needs to target reliably (buttons, form
  inputs) get a `testID` — `PrimaryButton`/`SecondaryButton` accept it as a
  prop, `TextInput`s take it directly. Don't rely on visible text as a
  Maestro selector when two elements could share the same text/placeholder
  (e.g. two inputs both showing `"Rp0"`).

## Testing — every new screen needs a passing Maestro flow, enforced automatically

**A new screen is not done until it has a corresponding flow in
`.maestro/`** (named after the screen, e.g. `borrowing-scenario.yaml` for
`BorrowingScenario`) that at minimum: launches the app, verifies the screen
renders without crashing, taps its main interactive element (continue/submit
button), and asserts navigation to the next screen (or the expected
in-screen result, like a success toast, if there's no next screen yet). This
is **not just a convention** — it's enforced by a `Stop` hook in root
`.claude/settings.json` that runs `scripts/run-ios-tests.sh` at the end of
every session, which builds the app and runs every flow in `.maestro/`
against an iOS simulator. The hook blocks (exit code 2) if any flow fails,
which feeds the failure back to Claude Code instead of letting the session
end on a broken state. The hook skips entirely (fast exit 0) if a session
touched nothing under `mobile-app/` — see the guard at the top of
`run-ios-tests.sh` — so it doesn't slow down `backend`/`whatsapp-service`
sessions.

All onboarding-step flows exist (`register.yaml`,
`financial-survival-check.yaml`, `borrowing-scenario.yaml`,
`financial-risk-intelligence.yaml`, `decision-support.yaml`), plus
`login.yaml` (register → complete onboarding → logout → log back in,
proving both the round-trip and the "skip onboarding for a returning user"
behavior), `safety-dashboard.yaml` (replays register+onboarding through to
the tab bar), `main-tabs.yaml` (exercises all 5 tabs after onboarding), and
`cek-baru.yaml` (the standalone `BorrowingScenario`→`FinancialRiskIntelligence`
loop triggered from the `Cek Baru` tab). No flow for `AICoach` — dropped
from scope. `Edukasi`/`Alternatif`/`Profil` tabs are covered inline within
`main-tabs.yaml` rather than getting their own dedicated flow files, since
they're simple enough to assert in-line without replaying onboarding
separately each time.

**Every flow that replays registration generates a unique phone/email per
run** (`- evalScript: ${output.uniqueId = Date.now()}`, then
`08${output.uniqueId}` / `test${output.uniqueId}@nera.test`) — `auth.register`
now enforces real uniqueness on both fields (unlike the old `profile.upsert`,
which was a true upsert keyed by a hardcoded test phone). A flow hardcoding
a fixed phone/email will pass once and then fail every run after with a
CONFLICT error.

`financial-survival-check.yaml` has no deep link to reach that screen
directly yet, so it replays the `Register` steps first before testing its
own elements — normal for flows further down a linear stack with no deep
linking configured.

## MVP scope for hackathon

```
IN scope: 5-step onboarding + 5-tab main navigator, SafetyDashboard connected
to backend's dashboard router, loan payoff tracking ("State 2" — see above)
OUT of scope: AICoach, offline mode, real push notification infra,
biometric storage, character illustrations from design-reference/ (icon +
layout + copy only), Edukasi tab content (placeholder only, no content model)
```

## Git workflow

See the root `../CLAUDE.md` — branch naming, "passed" criteria, commit/merge/push
rules, and confirmation requirements apply repo-wide, not just to this sub-project.

## Gotchas

- Physical iOS devices need `REACT_NATIVE_PACKAGER_HOSTNAME=<mac-lan-ip>` set
  when running `expo run:ios --device <udid>`, or the app defaults to
  `localhost` for the Metro connection and shows "No script URL provided."
  Also needs an `NSAppTransportSecurity` exception in `app.json` for the
  backend's plain-HTTP IP (`103.235.75.245`) on a custom dev-client build —
  Expo Go exempts this by default, a bare/dev-client build doesn't.
- If two different native modules fail with "Unimplemented component" /
  "NativeModule: X is null" right after adding a dependency, the installed
  dev-client build predates that dependency — a JS-only reload can't add
  native code. Either do a full native rebuild (`expo run:ios`) or, if
  time's tight, avoid the native dependency (see `PrimaryButton`'s
  View/opacity-band gradient instead of `expo-linear-gradient`, and
  `src/utils/formDraft.ts`'s in-memory store instead of AsyncStorage).
- `design-reference/` holds final design mockups (1.png–7.png, not the
  `01-screen-name.png` naming that may be referenced elsewhere) — 2/3 are
  the same `FinancialSurvivalCheck` screen at two polish levels ("before"/
  "after"); "after" is the calibration target for the whole app's polish
  level, not just that one screen. No reference exists for `AICoach`
  (dropped) or the tab bar (built to match this project's existing design
  system per an explicit ask, not the reference's tab bar visuals).
