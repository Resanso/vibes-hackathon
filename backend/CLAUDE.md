# CLAUDE.md — backend

Next.js used **API-only** — no dashboard, no pages, just tRPC routers exposed at
`/api/trpc/*`. This is the single backend `mobile-app` and `whatsapp-service` both
call. Do not add any dashboard UI here — that scope was dropped; the only
frontend is `mobile-app`.

## Stack

- **Framework**: Next.js 15 (App Router, Turbopack in dev) — used purely as an API server
- **Language**: TypeScript (strict, via `create-t3-app`)
- **API layer**: tRPC v11 (client + server), input validation with Zod
- **Database/ORM**: Prisma 6 + PostgreSQL, self-hosted on our VPS via Docker (see `../docs/deployment.md`). Client is generated into `generated/prisma` (custom output path, not `node_modules/.prisma`)
- **Data fetching**: `@tanstack/react-query` v5 via tRPC React Query integration, SuperJSON as the transformer
- **Env validation**: `@t3-oss/env-nextjs` (schema in `src/env.js`)
- **Package manager**: npm (`packageManager: npm@10.9.8` in package.json)
- **AI**: MAIA Router, OpenAI-compatible gateway, not a direct Anthropic SDK call:

  ```ts
  import OpenAI from "openai";

  const maia = new OpenAI({
    apiKey: process.env.MAIA_API_KEY,
    baseURL: process.env.MAIA_BASE_URL, // https://router.maia.id/v1
  });
  // check MAIA Router's docs for the exact model string before hardcoding one
  ```

This is a `create-t3-app` scaffold (T3 Stack), repurposed as an API-only server —
`src/app/page.tsx` is a bare health-check, not a real UI.

## Commands

Run with `npm run <script>`:

- `dev` — start dev server (`next dev --turbo`)
- `build` — production build (`next build`)
- `start` — run the production build (`next start`)
- `preview` — build then start (`next build && next start`)
- `check` — lint + typecheck together (`next lint && tsc --noEmit`)
- `lint` — lint only (`next lint`)
- `lint:fix` — lint with auto-fix (`next lint --fix`)
- `typecheck` — typecheck only (`tsc --noEmit`)
- `format:check` — Prettier check (`prettier --check "**/*.{ts,tsx,js,jsx,mdx}" --cache`)
- `format:write` — Prettier write (`prettier --write "**/*.{ts,tsx,js,jsx,mdx}" --cache`)
- `db:generate` — run Prisma migrations in dev (`prisma migrate dev`)
- `db:migrate` — deploy Prisma migrations (`prisma migrate deploy`)
- `db:push` — push schema without migrations (`prisma db push`)
- `db:studio` — open Prisma Studio

**No test script exists in `package.json`.** There is no test framework installed. Do not assume `npm test` works — if you add tests, you'll need to pick and wire up a runner first.

## Structure & architecture

- `src/app/page.tsx` — bare health-check response, not a real page. Don't spend time
  polishing it; a working API matters far more than a pretty root route.
- `src/app/api/trpc/[trpc]/route.ts` — the tRPC HTTP handler (Next.js route handler).
- `src/server/api/root.ts` — the root tRPC router (`appRouter`). New routers must be registered here.
- `src/server/api/routers/` — individual tRPC routers, one per domain (see "Core API responsibilities" below).
- `src/server/api/trpc.ts` — tRPC setup: context, base procedures (`publicProcedure`), middleware. Add new procedure types (e.g. `protectedProcedure`) here.
- `src/server/db.ts` — Prisma client singleton.
- `src/server/logic/riskScore.ts` — `calculateRiskScore()`, deterministic and pure — NEVER let the AI produce the score.
- `src/server/ai/explainRisk.ts` — `explainRisk()`, the one MAIA Router call that turns a score + reasons into a plain-language explanation.
- `prisma/schema.prisma` — Prisma schema (source of truth for DB models).
- `generated/prisma/` — generated Prisma client output. **Do not hand-edit**; regenerated via `postinstall`/`prisma generate`.
- `src/env.js` — typed, validated environment variables (server vars under `server`, public vars under `client`, must be listed in `runtimeEnv`).

## Auth (email + password, real — not the shared API key)

`profile` gained real login on 2026-07-17: `email` (unique), `passwordHash`
(bcryptjs, never returned to clients — see "passwordHash never leaks" below),
`name`, `onboardingCompletedAt`. `phone` stays the primary/foreign key
throughout (RiskEntry, LoanTracking, whatsapp/telegram-service message
routing all already keyed off it before auth existed) — auth was layered on
top rather than migrating everything to a generated id.

- `auth.register` (`apiKeyProcedure`) — creates the Profile row itself
  (name/phone/email/passwordHash). `monthlyIncome`/`existingMonthlyDebt`/
  `dependents` start at their schema defaults (0); `profile.upsert`
  (FinancialSurvivalCheck) fills those in afterward and sets
  `onboardingCompletedAt`.
- `auth.login` (`apiKeyProcedure`) — email + password → bcrypt compare →
  issues a JWT (`src/server/auth/jwt.ts`, 30-day expiry).
- `auth.me` (`authedProcedure`) — the ONE endpoint that actually verifies a
  JWT bearer token server-side, rather than every router just trusting
  `SHARED_API_KEY` the way they did before. `mobile-app` calls this on boot
  to confirm a locally-stored token is still genuinely valid, not just
  present in `SecureStore`.

**Scope decision, not an oversight**: every other router (`profile.upsert`,
`risk.assess`, etc.) still uses plain `apiKeyProcedure` — whoever holds
`SHARED_API_KEY` can act as any `phone` they pass in, exactly like before
auth existed. Converting every existing router/screen/service call to
require a JWT bearer too would be a much larger rework; `authedProcedure`
(see `trpc.ts`) exists specifically so that can happen incrementally later
without re-deriving the JWT plumbing from scratch.

**`passwordHash` never leaks**: `src/server/db.ts`'s `PrismaClient` sets a
global `omit: { profile: { passwordHash: true } }` — every query anywhere
in the codebase gets it stripped automatically. `auth.login` is the one
place that overrides this per-query (`omit: { passwordHash: false }`) to
actually read it for the bcrypt compare.

## Core API responsibilities (map to the 7-step flow)

tRPC routers under `src/server/api/routers/`:

0. `auth` — register/login/me, see "Auth" above
1. `profile` — self-reported financial profile (step 2)
2. `simulation` — true cost-of-credit calculator (nominal + interest + service
   fee + tenor → total repayment + late-payment projection). Pure math, no AI.
3. `risk` — `calculateRiskScore()` (deterministic, pure, unit-testable) + `explainRisk()`
4. `recommendations` — campus alternatives, hardcoded seed list
5. `dashboard` — trend of a user's self-reported entries over time, consumed by
   `mobile-app`'s step 6 screen
6. `reminders` — `dueSoon` query, used by `whatsapp-service`'s daily cron to find
   upcoming installment due dates (derived from `RiskEntry.firstDueDate`, not a
   stored payment schedule)
7. `tracking` — "State 2": daily payoff-progress tracking for a loan the
   student explicitly marked as actually taken (`start`, keyed by
   `RiskEntry.id`), not every `risk.assess` call (many are just
   simulations). `checkIn` records "sudah menyisihkan uang" for today
   (idempotent per day, `source: "app" | "whatsapp"`), `status` returns
   computed remaining-tunggakan/days-confirmed for `mobile-app`'s
   `SafetyDashboard`, `pendingToday` is what `whatsapp-service`'s evening
   cron polls to find who to remind. Logic lives in
   `src/server/logic/loanTracking.ts` (pure, unit-testable — mirrors
   `riskScore.ts`'s pattern). `LoanTracking`/`DailyCheckIn` models in
   `prisma/schema.prisma`.

## Conventions

- Import alias `~/*` maps to `src/*` (see `tsconfig.json`) — use `~/server/...`, `~/trpc/...`, not relative `../../` chains.
- tRPC routers: define procedures with `publicProcedure`, validate input with `z.object({...})`, keep one router per file under `src/server/api/routers/`, and register every new router on `appRouter` in `src/server/api/root.ts`.
- `mobile-app` and `whatsapp-service` authenticate with a simple shared API key
  header — full user auth is out of scope for the hackathon.
- Every router input validated with Zod before touching business logic.
- No endpoint reads/infers data from device signals — inputs are only what the
  client explicitly submits (see root `.claude/rules/product-context.md`).
- New environment variables must be added to the Zod schema in `src/env.js` (server or client block) *and* wired into `runtimeEnv`, not read directly off `process.env` elsewhere.
- Prettier + `prettier-plugin-tailwindcss` auto-sorts Tailwind classes if any styling remains — don't hand-order class strings.
- ESLint: `@typescript-eslint/consistent-type-imports` prefers `import { type Foo }` inline type imports; unused vars prefixed with `_` are allowed.
- Formatting: 2-space indent, double quotes, matches existing files — run `format:write` rather than manually matching style.

## MVP scope for hackathon

```
IN scope:
- simulation router (build FIRST — no AI dependency, highest value)
- risk router: deterministic score + at least one working MAIA Router call
- recommendations router with hardcoded seed data
- dashboard router (aggregation query, feeds mobile-app step 6)

OUT of scope:
- Any dashboard UI in this folder
- Auth beyond a shared API key
```

## Git workflow

See the root `../CLAUDE.md` — branch naming, "passed" criteria, commit/merge/push
rules, and confirmation requirements apply repo-wide, not just to this sub-project.

## Gotchas

- Database is a cloud/self-hosted Postgres instance, not local. There is no
  `start-database.sh` step — set `DATABASE_URL` in `.env` (see `.env.example`) and
  run `npm run db:push`. See `../docs/deployment.md` for the VPS/Docker setup.
