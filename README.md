# vibes-hackathon

Monorepo — one git repo, one sub-project folder per platform. Built for a hackathon,
so structure favors speed over ceremony: each sub-project is independently
runnable, with its own dependencies and lockfile.

## Structure

```
vibes-hackathon/
├── CLAUDE.md                    ← shared Claude Code guidance (all sub-projects)
├── .claude/
│   ├── settings.json            ← shared hooks/permissions, auto-detects sub-projects
│   ├── rules/design.md          ← design PRINCIPLES (platform-agnostic)
│   └── skills/                  ← workflows shared across sub-projects
├── .github/workflows/           ← CI (per-sub-project lint/typecheck jobs)
└── web-app/                     ← Next.js 15 + tRPC + Prisma + Tailwind v4 web app
    ├── CLAUDE.md                ← Next.js/tRPC-specific guidance
    └── .claude/rules/design.md  ← Tailwind v4 technical implementation
```

Only `web-app/` exists today. Additional sub-projects (mobile app, backend service,
etc.) may be added later as sibling folders following the same pattern — a folder with
its own `package.json`/lockfile, its own `CLAUDE.md`, and its own `.claude/rules/`.

No shared workspace tooling (npm/pnpm workspaces) is used unless code actually needs to
be shared between sub-projects — see `CLAUDE.md` for the reasoning.

## Running `web-app`

Database is a cloud Postgres instance (Neon) — no local database setup needed.

```bash
cd web-app
npm install

# copy .env.example to .env and set DATABASE_URL to the Neon connection string
# (get it from a teammate or the Neon dashboard — never commit .env)
cp .env.example .env

npm run db:push   # sync Prisma schema to the database
npm run dev        # start the dev server (Turbopack) at http://localhost:3000
```

Other commands (run from inside `web-app/`, or via `npm --prefix web-app run <script>`
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

No test runner is wired up yet in `web-app`. See `web-app/CLAUDE.md` for full stack
detail, architecture, and conventions.

## Tech stack per folder

| Folder | Stack |
| --- | --- |
| `web-app/` | Next.js 15 (App Router), TypeScript, tRPC v11, Prisma 6 + PostgreSQL, Tailwind CSS v4, `@tanstack/react-query` v5 |

## Git workflow

See root `CLAUDE.md` → **Git workflow (monorepo)** for branch naming
(`feature/<area>-<slug>`), what "passed" means per sub-project, and the confirmation
rule before any commit/merge/push.
