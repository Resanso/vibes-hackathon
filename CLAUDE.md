# CLAUDE.md (shared, root)

Guidance that applies across **every** sub-project in this monorepo. Each sub-project
also has its own `CLAUDE.md` with stack-specific detail — read both; the sub-project
file wins on anything stack-specific, this file wins on process/workflow.

## Repo shape

This is a **monorepo**: one git repo, multiple independent sub-projects, each with its
own `package.json`/lockfile/dependencies (no shared workspace tooling unless a
`packages/shared/` folder is explicitly introduced later).

```
vibes-hackathon/
├── CLAUDE.md              ← this file, shared across all sub-projects
├── .claude/
│   ├── settings.json      ← shared hooks/permissions (auto-detects sub-projects)
│   ├── rules/design.md    ← design PRINCIPLES, platform-agnostic
│   └── skills/            ← workflows shared across sub-projects
├── web-app/                ← Next.js/tRPC/Prisma web app (see web-app/CLAUDE.md)
│   └── .claude/rules/design.md  ← Tailwind v4 technical implementation
├── mobile-app/              ← not created yet — illustrative only, do not scaffold
│   └── ...                    unless explicitly asked
└── backend-service/         ← not created yet — illustrative only, do not scaffold
    └── ...                    unless explicitly asked
```

**Currently only `web-app/` exists.** Other sub-project folders shown above (mobile
app, backend service) are purely illustrative of the intended repo shape — do not
create them unless the user explicitly asks for a new sub-project. Folder names for
future sub-projects aren't fixed; match whatever naming the user actually sets up.

## Working across sub-projects

- Each sub-project is self-contained: its own `package.json`, its own lockfile, its
  own `node_modules`. Run commands from inside that sub-project's directory (or via
  `npm --prefix <dir>` from the root) — don't assume a root `package.json` exists.
- Don't introduce a root-level workspace (npm/pnpm workspaces) unless there's actual
  code to share between sub-projects (e.g. a Zod schema used by both a web client and
  a mobile client). If that need shows up, propose a `packages/shared/` folder instead
  of quietly restructuring things.
- Stack-specific commands, architecture, and conventions live in each sub-project's own
  `CLAUDE.md` (e.g. `web-app/CLAUDE.md`) — check there before assuming a command from
  one sub-project works in another.

## Git workflow (monorepo)

- Branch naming: `feature/<area>-<slug>`, where `<area>` names the sub-project being
  touched — e.g. `feature/web-login-form`, `feature/mobile-onboarding`,
  `feature/backend-auth-api`. This keeps parallel work across sub-projects legible.
- "Passed" means the checks **relevant to the area touched** succeed — e.g. for a
  `web-app` change, `npm run check` and `npm run build` inside `web-app/`. Don't run
  another sub-project's build/tests just because you touched an unrelated one.
- **Never commit, merge, or push without the user's explicit confirmation** — ask every
  time, even after checks pass. This is a standing rule, not a one-time check.
- Once confirmed: commit on the feature branch, merge into `main` (no PR — direct
  merge), and push.
- Commits must **not** include a Claude/Anthropic co-author trailer
  (`attribution.commit` is set to `""` in `.claude/settings.json` — don't override it
  per-commit).
- **No git remote is configured yet** (planned to be added later). Until a remote
  exists: stop after the local commit + merge to `main`, and tell the user a push is
  pending a remote. Once `origin` is set, resume pushing the feature branch and `main`
  as part of the same confirmed flow.

## Gotchas

<!-- Add repo-wide gotchas here as they're discovered. Sub-project-specific gotchas
     belong in that sub-project's own CLAUDE.md instead. -->
