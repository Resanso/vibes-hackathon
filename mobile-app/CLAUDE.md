# CLAUDE.md — mobile-app

React Native client — the **only** frontend in this product (no separate web
dashboard). Implements all 7 steps of the user flow, including the personal
Financial Safety Dashboard (step 6) as a normal in-app screen — not a separate
platform. See root `.claude/rules/product-context.md` for the full flow.

**Expo skeleton + locked design tokens exist.** `src/screens/` and navigation
do not exist yet — that's `screen-builder`'s job, one screen at a time.
`npm install` hasn't been run in this sandbox (see root gotchas) — the user
runs it locally.

## Stack

- React Native via Expo (SDK ~52, see `package.json` — reconcile exact
  versions with `npx expo install --check` once installed, since they were
  hand-written without registry access)
- TypeScript, React Navigation (native-stack, not yet wired up), Zustand for
  state
- NativeWind (Tailwind for RN) — see root `.claude/rules/design.md`'s
  "Brand tokens (locked)" section; Nera's colors/typography are final, not a
  starting point
- `lucide-react-native` for icons (outline/stroke by default)
- API client: plain `fetch` calling `backend`'s tRPC HTTP endpoints on our VPS
  domain (e.g. `https://api.yourdomain.com/api/trpc/...`) — never `localhost`
  once the VPS is live

## Structure

- `src/theme/colors.ts`, `src/theme/typography.ts` — locked brand tokens, raw
  values for non-className consumers (e.g. SVG props). `tailwind.config.js`
  is the className-based equivalent — both must stay in sync, see the
  comments in each file.
- `src/components/` — `PrimaryButton`, `SecondaryButton`, `RiskScoreGauge`,
  `StatusToast`, already built to the locked tokens. Reuse these rather than
  rebuilding equivalents inside a screen.
- `App.tsx` — currently a **temporary component showcase**, not the real app
  entry (see the TODO comment at its top). Gets replaced by React Navigation
  once real screens exist.
- `src/screens/` (not created yet) — one per flow step: `Onboarding`,
  `FinancialSurvivalCheck`, `BorrowingScenario`, `FinancialRiskIntelligence`,
  `DecisionSupport`, `SafetyDashboard`, `AICoach`
- `src/store/` (not created yet) — Zustand (financial profile, session)
- `src/api/` (not created yet) — calls to `backend`

## Conventions

- Financial data lives in Zustand during session; only sent to `backend` on
  explicit "Analyze" action.
- Never call any native module for installed-app enumeration, contacts, or SMS —
  hard rule, see root `.claude/rules/product-context.md` privacy principle.
- `SafetyDashboard` screen is the one screen judges will likely spend the most
  time on during Q&A since it's the only "dashboard" in the product — worth
  polishing more than the others if time is tight elsewhere.

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
