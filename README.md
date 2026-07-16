# FinSafe

Monorepo — one git repo, one sub-project folder per platform. Built for Garuda
Hacks 7.0 (Track 2: Safety). Structure favors speed over ceremony: each
sub-project is independently runnable, with its own dependencies and lockfile.

## Structure

```
vibes-hackathon/
├── CLAUDE.md                    ← shared Claude Code guidance (all sub-projects)
├── docs/deployment.md           ← VPS/Nginx/PM2/Docker deployment notes
├── .claude/
│   ├── settings.json            ← shared hooks/permissions, auto-detects sub-projects
│   ├── rules/
│   │   ├── design.md            ← design PRINCIPLES (platform-agnostic)
│   │   └── product-context.md   ← product rationale, 7-step flow, privacy principle
│   └── skills/                  ← workflows shared across sub-projects
├── .github/workflows/           ← CI (per-sub-project lint/typecheck jobs)
├── backend/                     ← Next.js API-only (tRPC + Prisma), no dashboard pages
│   └── CLAUDE.md
├── mobile-app/                  ← React Native (Expo) — the only frontend (not scaffolded yet)
│   ├── CLAUDE.md
│   └── .claude/agents/          ← screen-builder, design-reviewer, token-keeper subagents
└── whatsapp-service/            ← Node.js + Baileys (WhatsApp reminders/quick consult)
    └── CLAUDE.md
```

`backend/` and `whatsapp-service/` have real code; `mobile-app/` is still a
placeholder with just a `CLAUDE.md` (and its design subagents) until
scaffolded. There is no separate web dashboard — `backend` is API-only, and
the only UI lives in `mobile-app`.

No shared workspace tooling (npm/pnpm workspaces) is used unless code actually needs to
be shared between sub-projects — see `CLAUDE.md` for the reasoning.

## Running `backend`

Set `DATABASE_URL` to your Postgres connection string — see
`docs/deployment.md` for the self-hosted VPS/Docker setup.

```bash
cd backend
npm install

cp .env.example .env
# set DATABASE_URL (and MAIA_API_KEY / MAIA_BASE_URL for AI calls)

npm run db:push   # sync Prisma schema to the database
npm run dev        # start the dev server (Turbopack) at http://localhost:3000
```

Other commands (run from inside `backend/`, or via `npm --prefix backend run <script>`
from the repo root):

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server (`next dev --turbo`) |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run check` | Lint + typecheck (`next lint && tsc --noEmit`) |
| `npm run lint` / `lint:fix` | Lint only / lint with auto-fix |
| `npm run typecheck` | Typecheck only |
| `npm run format:check` / `format:write` | Prettier check / write |
| `npm run db:push` | Push Prisma schema to the database (no migration files) |
| `npm run db:generate` | Create a Prisma migration in dev |
| `npm run db:studio` | Open Prisma Studio |

No test runner is wired up yet in `backend`. See `backend/CLAUDE.md` for full stack
detail, architecture, and conventions.

## Running `whatsapp-service`

```bash
cd whatsapp-service
npm install

cp .env.example .env
# set BACKEND_URL, SHARED_API_KEY (must match backend's), DATABASE_URL

npm run db:push   # own Postgres tables: WhatsappCreds, WhatsappSignalKey
npm run dev        # scan the printed QR code with WhatsApp on first run
```

See `whatsapp-service/CLAUDE.md` for the quick-consult command format,
reminder scheduling, and session-storage gotchas.

## Tech stack per folder

| Folder | Stack |
| --- | --- |
| `backend/` | Next.js 15 (App Router) API-only, TypeScript, tRPC v11, Prisma 6 + PostgreSQL, `@tanstack/react-query` v5, MAIA Router for AI explanations |
| `mobile-app/` | React Native (Expo), TypeScript, React Navigation, Zustand, NativeWind — not scaffolded yet |
| `whatsapp-service/` | Node.js (TypeScript, ESM), `baileys` (unscoped package), Prisma 6 + PostgreSQL, `node-cron` |

## Git workflow

See root `CLAUDE.md` → **Git workflow (monorepo)** for branch naming
(`feature/<area>-<slug>`), what "passed" means per sub-project, and the confirmation
rule before any commit/merge/push.
