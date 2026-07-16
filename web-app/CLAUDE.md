# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Stack

- **Framework**: Next.js 15 (App Router, Turbopack in dev)
- **Language**: TypeScript (strict, via `create-t3-app`)
- **API layer**: tRPC v11 (client + server), input validation with Zod
- **Database/ORM**: Prisma 6 + PostgreSQL. Client is generated into `generated/prisma` (custom output path, not `node_modules/.prisma`)
- **Data fetching**: `@tanstack/react-query` v5 via tRPC React Query integration, SuperJSON as the transformer
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/postcss`, no `tailwind.config.js` — v4 CSS-based config)
- **Env validation**: `@t3-oss/env-nextjs` (schema in `src/env.js`)
- **Package manager**: npm (`packageManager: npm@10.9.8` in package.json)

This is a `create-t3-app` scaffold (T3 Stack) — currently close to the default template, no auth library wired in yet.

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

- `src/app/` — Next.js App Router pages/layouts. `src/app/page.tsx` is the home route, `src/app/layout.tsx` is the root layout.
- `src/app/_components/` — React components used by app routes (underscore prefix excludes it from routing). E.g. `post.tsx`.
- `src/app/api/trpc/[trpc]/route.ts` — the tRPC HTTP handler (Next.js route handler).
- `src/server/api/root.ts` — the root tRPC router (`appRouter`). New routers must be registered here.
- `src/server/api/routers/` — individual tRPC routers, one per domain (e.g. `post.ts`).
- `src/server/api/trpc.ts` — tRPC setup: context, base procedures (`publicProcedure`), middleware. Add new procedure types (e.g. `protectedProcedure`) here.
- `src/server/db.ts` — Prisma client singleton.
- `src/trpc/react.tsx` — client-side tRPC + React Query provider (`api` hook, for `"use client"` components).
- `src/trpc/server.ts` — server-side tRPC caller for Server Components (`api`, `HydrateClient`).
- `src/trpc/query-client.ts` — shared `QueryClient` factory.
- `prisma/schema.prisma` — Prisma schema (source of truth for DB models).
- `generated/prisma/` — generated Prisma client output. **Do not hand-edit**; regenerated via `postinstall`/`prisma generate`.
- `src/env.js` — typed, validated environment variables (server vars under `server`, public vars under `client`, must be listed in `runtimeEnv`).
- `src/styles/globals.css` — Tailwind v4 entry point.

## Conventions

- Import alias `~/*` maps to `src/*` (see `tsconfig.json`) — use `~/server/...`, `~/trpc/...`, not relative `../../` chains.
- tRPC routers: define procedures with `publicProcedure`, validate input with `z.object({...})`, keep one router per file under `src/server/api/routers/`, and register every new router on `appRouter` in `src/server/api/root.ts`.
- Server Components fetch via `api` imported from `~/trpc/server` (supports `.prefetch()` + `<HydrateClient>` for streaming to client components).
- Client components (`"use client"`) fetch via `api` imported from `~/trpc/react`, using generated hooks (`useSuspenseQuery`, `useMutation`, `api.useUtils()` for cache invalidation).
- New environment variables must be added to the Zod schema in `src/env.js` (server or client block) *and* wired into `runtimeEnv`, not read directly off `process.env` elsewhere.
- Prettier + `prettier-plugin-tailwindcss` auto-sorts Tailwind classes — don't hand-order class strings.
- ESLint: `@typescript-eslint/consistent-type-imports` prefers `import { type Foo }` inline type imports; unused vars prefixed with `_` are allowed.
- Formatting: 2-space indent, double quotes, matches existing files — run `format:write` rather than manually matching style.

## Git workflow

See the root `../CLAUDE.md` — branch naming, "passed" criteria, commit/merge/push
rules, and confirmation requirements apply repo-wide, not just to this sub-project.

## Gotchas

- Database is a cloud Postgres instance (Neon), not local. There is no
  `start-database.sh`/Docker step — set `DATABASE_URL` in `.env` to the Neon
  connection string (see `.env.example`) and run `npm run db:push`.
