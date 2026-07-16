# CLAUDE.md — whatsapp-service

Companion service: push reminders for upcoming loan installments, and an
on-demand "quick consult" that re-runs a risk check over WhatsApp. A
differentiator, not core to the demo — acceptable to fall back to a recorded
clip if time runs out (see root `CLAUDE.md` MVP priority).

## Stack

- Node.js (TypeScript, ESM) + **`baileys`** — note: the package is now
  published unscoped as `baileys`, **not** `@whiskeysockets/baileys`. Current
  major is 7.0.0, requires Node 17+.
- Own `prisma/schema.prisma` + own `DATABASE_URL` — infra-only, see below.
- `node-cron` for the daily reminder check, `pino` for logging (Baileys'
  expected logger), `qrcode-terminal` to render the login QR code.
- Calls `backend`'s tRPC HTTP endpoints via `@trpc/client`'s
  `createTRPCUntypedClient` (no shared `AppRouter` type — `backend` and
  `whatsapp-service` are separate npm projects, no workspace tooling — so
  call shapes in `src/api/backendClient.ts` must be kept in sync with
  `backend`'s routers by hand).
- Run under PM2 on the same VPS as `backend` (see `../docs/deployment.md`).

## Session storage — DB-backed, not file-based

Baileys' own `useMultiFileAuthState` (the common demo pattern) is explicitly
flagged **"DO NOT USE IN PROD"** by the library's current docs. This project
uses `src/auth/dbAuthState.ts` instead: a custom `AuthenticationState`
implementation backed by Postgres via Prisma (`WhatsappCreds` +
`WhatsappSignalKey` models), mirroring `useMultiFileAuthState`'s shape but
persisting through the database.

**This is an exception to the "no direct database access" rule below** — it's
infra state for the WhatsApp connection itself (session credentials, signal
keys), not business data. It's fine for this service to read/write its own
`WhatsappCreds`/`WhatsappSignalKey` tables directly. Everything else —
profiles, risk entries, reminders data — always goes through `backend`'s API.

## Responsibilities

- **Quick consult** (`src/handlers/quickConsult.ts`): a WhatsApp user sends a
  fixed-format command, `/cek <nominal> <bunga%/tahun> <biaya> <tenor bulan>`
  (e.g. `/cek 3000000 24 50000 6`). The handler calls `backend`'s
  `simulation.calculate` + `risk.assess` using the sender's phone number
  (from the JID) and replies with the risk label + MAIA explanation. This is
  **command-based, not free-text NLP** — no AI is used to parse the inbound
  message; MAIA is only used inside `backend` to narrate the score. Requires
  a `Profile` to already exist (created via `mobile-app`) — `risk.assess`
  throws `NOT_FOUND` otherwise, and the handler turns that into a
  plain-language reply telling the student to set up their profile first.
- **Reminders** (`src/reminders/scheduler.ts`): a `node-cron` job (daily,
  `REMINDER_CRON` env) calls `backend`'s `reminders.dueSoon` and sends one WA
  message per result. Due dates are derived from `RiskEntry.firstDueDate` +
  `tenorMonths` — there's no payment-tracking feature, so this only ever
  answers "an installment date is coming up," never "was it paid."

## Conventions

- Authenticates to `backend` with the same `SHARED_API_KEY` value `mobile-app`
  uses, sent as the `x-api-key` header on every call.
- No financial calculation or risk scoring logic lives here — always call
  `backend`, never reimplement `calculateRiskScore()` or the cost-of-credit
  simulation locally.
- Reconnect logic (`src/connection.ts`) checks
  `lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut` to
  decide reconnect vs. requiring a fresh QR/pairing login.
  `DisconnectReason.restartRequired` (fires right after a QR scan) is handled
  the same way — `startConnection()` always builds a brand-new socket
  instance, never reconnects an old one in place.
- The reminder scheduler is registered **once**, in `index.ts` — it looks up
  whatever socket is currently active at send-time
  (`connection.ts`'s `getActiveSocket()`) rather than closing over one
  instance, since reconnects replace the socket. Do not call
  `scheduleReminders()` from inside `startConnection()` — that would
  re-register the cron job on every reconnect.

## Gotchas

- **Real ban/rate-limit risk in production** is documented across multiple
  Baileys GitHub issues — accounts have been banned even when code worked
  fine locally. `sendDueReminders()` already randomizes a 1.5-3s delay
  between sends; don't remove it, and don't add bulk/concurrent sending.
- **Never add a third-party "anti-ban" package without vetting it first** — a
  popular one (`lotusbail`, ~56k downloads) was confirmed exfiltrating
  session credentials.
- First run requires scanning a QR code (printed to the terminal via
  `qrcode-terminal`) with a real phone — this can't be automated or verified
  by an agent; it's a manual one-time step per deployment (session then
  persists in `WhatsappCreds`/`WhatsappSignalKey` across restarts).
- If logged out (`DisconnectReason.loggedOut`), the stored session is dead —
  delete the `WhatsappCreds`/`WhatsappSignalKey` rows and re-pair with a new
  QR scan rather than trying to reconnect with stale credentials.

## Git workflow

See the root `../CLAUDE.md` — branch naming, "passed" criteria, commit/merge/push
rules, and confirmation requirements apply repo-wide, not just to this sub-project.
