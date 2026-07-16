# CLAUDE.md — mobile-app

React Native client — the **only** frontend in this product (no separate web
dashboard). Implements all 7 steps of the user flow, including the personal
Financial Safety Dashboard (step 6) as a normal in-app screen — not a separate
platform. See root `.claude/rules/product-context.md` for the full flow.

**Expo skeleton + locked design tokens + navigation + first 2 screens exist.**
5 screens remain (`BorrowingScenario` onward) — build them one at a time via
the `token-keeper` → `screen-builder` → `design-reviewer` loop below.
`npm install` hasn't been run in this sandbox (see root gotchas) — the user
runs it locally, along with `npx expo install` for the React Navigation deps
added alongside the first 2 screens.

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
- `src/components/` — `PrimaryButton`, `SecondaryButton`, `RiskScoreGauge`,
  `StatusToast`, already built to the locked tokens. Reuse these rather than
  rebuilding equivalents inside a screen.
- `App.tsx` — mounts `NavigationContainer` + `RootNavigator`, handles Poppins
  font loading / splash screen. No longer the temporary component showcase.
- `src/navigation/RootNavigator.tsx` — native-stack navigator,
  `RootStackParamList` is the source of truth for route names/params. Add a
  new `Stack.Screen` here whenever a screen is built.
- `src/screens/` — `Onboarding` (collects name + phone, phone becomes the
  backend user identifier), `FinancialSurvivalCheck` (income/debt/dependents
  → `profile.upsert`). Remaining, not built yet: `BorrowingScenario`,
  `FinancialRiskIntelligence`, `DecisionSupport`, `SafetyDashboard`,
  `AICoach`.
- `src/store/sessionStore.ts` — Zustand, session-only, currently just
  `{ phone, name }` set once in `Onboarding`. Add fields here only once a
  second screen actually needs to read them — don't pre-model state nothing
  consumes yet.
- `src/api/client.ts` — `trpcQuery`/`trpcMutation` helpers + typed wrappers
  per backend router used (`upsertProfile` so far). **Known scope cut**: no
  full SuperJSON date-revival — response dates arrive as ISO strings, not
  `Date` objects. Fine until a screen needs to format one (e.g.
  `dashboard.trend`).

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
  hard rule, see root `.claude/rules/product-context.md` privacy principle.
- `SafetyDashboard` screen is the one screen judges will likely spend the most
  time on during Q&A since it's the only "dashboard" in the product — worth
  polishing more than the others if time is tight elsewhere.
- Step indicators (like `FinancialSurvivalCheck`'s `StepIndicator`) are a
  legitimate use of ordered/numbered UI — the 7-step flow is a real fixed
  sequence, not the banned decorative `01/02/03` pattern from `design.md`.
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

Only `.maestro/onboarding.yaml` and `.maestro/financial-survival-check.yaml`
exist so far, matching the 2 screens actually built. The other 5 filenames
listed in a previous instruction (`borrowing-scenario.yaml`,
`financial-risk-intelligence.yaml`, `decision-support.yaml`,
`safety-dashboard.yaml`, `ai-coach.yaml`) were deliberately **not**
pre-created as empty/placeholder flows — a flow testing a screen that
doesn't exist yet would fail immediately and break every session's Stop
hook for unrelated reasons. Each gets created in the same session its screen
is built, per the rule above.

`financial-survival-check.yaml` has no deep link to reach that screen
directly yet, so it replays the `Onboarding` steps first before testing its
own elements — normal for flows further down a linear stack with no deep
linking configured.

## MVP scope for hackathon

```
IN scope: all 7 screens, including SafetyDashboard connected to backend's
dashboard router (even if trend data is thin/seeded for the demo user)
OUT of scope: offline mode, real push notification infra, biometric storage
```

## Git workflow

See the root `../CLAUDE.md` — branch naming, "passed" criteria, commit/merge/push
rules, and confirmation requirements apply repo-wide, not just to this sub-project.

## Gotchas

<!-- Add as discovered -->
