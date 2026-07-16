# CLAUDE.md — whatsapp-service

Companion service with **two distinct roles**, running as one process but as
separate Baileys sessions:

1. **Nera bot number** — push reminders for upcoming loan installments, and an
   on-demand "quick consult" that re-runs a risk check over WhatsApp.
2. **Linked personal numbers** — a student can link their own WhatsApp number
   (paired like WhatsApp Web) purely so incoming pinjol threats can be
   auto-detected. Detected messages are saved as evidence, then the chat is
   archived.

A differentiator, not core to the demo — acceptable to fall back to a
recorded clip if time runs out (see root `CLAUDE.md` MVP priority).

## Stack

- Node.js (TypeScript, ESM) + **`baileys`** — note: the package is now
  published unscoped as `baileys`, **not** `@whiskeysockets/baileys`. No
  stable 7.x exists yet as of this writing (`npm view baileys dist-tags`
  shows `latest: 7.0.0-rc13`, `legacy: 6.7.23`) — pinned to the exact
  `7.0.0-rc13` release rather than a `^7.0.0` range, which fails to resolve.
- Own `prisma/schema.prisma` + own `DATABASE_URL` — infra-only, see below.
- `node-cron` for the daily reminder check, `pino` for logging (Baileys'
  expected logger), `qrcode-terminal` to render the login QR code.
- `onnxruntime-node` running `models/threat_detection.onnx` (copied from
  `../notebook/threat_detection.onnx`, source of truth stays in the
  notebook) for the linked-number threat detection — see "Threat detection
  model" below.
- Calls `backend`'s tRPC HTTP endpoints via `@trpc/client`'s
  `createTRPCUntypedClient` (no shared `AppRouter` type — `backend` and
  `whatsapp-service` are separate npm projects, no workspace tooling — so
  call shapes in `src/api/backendClient.ts` must be kept in sync with
  `backend`'s routers by hand).
- Run under PM2 on the same VPS as `backend` (see `../docs/deployment.md`).

## Multi-session architecture

`src/connection.ts` exposes a generic `startSession(prisma, sessionId,
handlers)` — this service runs more than one Baileys connection at once:

- `BOT_SESSION_ID` (`"bot"`) — the Nera bot's own number. `index.ts` starts
  this one unconditionally and registers `handleIncomingMessage` (quick
  consult) as its `onMessages` handler.
- `student:<phone>` (see `src/personal/linkedNumbers.ts`'s
  `studentSessionId()`) — one per linked student. `index.ts` resumes every
  row in the `LinkedNumber` table with status `pending`/`connected` on boot
  by calling `linkPersonalNumber()` again (idempotent — `upsertLinkedNumber`
  no-ops on an existing row).

`getActiveSocket(sessionId)` is how any code (the reminder scheduler, in
particular) looks up "whatever socket is currently connected for this
session" — reconnects replace the socket instance, so this must be looked up
at send-time, never cached.

### Linking a student's personal number

Pairing (the QR scan) is a manual, one-time step per student — run:

```
npm run link:number -- <phone, no leading + or 0>
```

This calls `linkPersonalNumber()` (`src/personal/linkPersonalNumber.ts`),
which upserts a `LinkedNumber` row and starts its session with
`createThreatMonitorHandler()` (`src/personal/threatMonitor.ts`) as the
`onMessages` handler. `onConnected`/`onLoggedOut` keep `LinkedNumber.status`
in sync so `index.ts` knows what to resume on the next restart.

### Threat detection model

`src/threat/detectThreat.ts` loads `models/threat_detection.onnx` — a
TF-IDF + RandomForest classifier trained on **synthetic** pinjol
threat/normal message data (see `../notebook/threat-synthetic.ipynb`),
exported with `skl2onnx`. Labels: `Normal_Formal` | `Normal_Informal` |
`Threat`. Input/output tensor names (`text_input` / `output_label`) come
from that notebook's own inference test, not guessed.

**Known issue, not yet fixed**: the model has a second output,
`output_probability` (a `Sequence<Map<string,float>>`), which
`onnxruntime-node` currently can't deserialize ("Non tensor type is
temporarily not supported"). `session.run()` fetches all outputs by
default, so calling `detectThreat()` as currently written will throw. Fix by
passing an explicit fetch list — `session.run({ text_input }, ["output_label"])`
— to skip `output_probability` entirely. Deliberately left unfixed for now;
the WhatsApp-side integration (session wiring, evidence-then-archive
ordering, resume-on-boot) was the priority, not the model itself.

Because it's trained on synthetic data, treat a `"Threat"` label as "worth
flagging for human review," not ground truth — the notebook's own test case
shows it can miss informally-worded threats.

## Session storage — DB-backed, not file-based

Baileys' own `useMultiFileAuthState` (the common demo pattern) is explicitly
flagged **"DO NOT USE IN PROD"** by the library's current docs. This project
uses `src/auth/dbAuthState.ts` instead: a custom `AuthenticationState`
implementation backed by Postgres via Prisma (`WhatsappCreds` +
`WhatsappSignalKey` models, both keyed by `sessionId` now — one row set per
Baileys session, not a single global row), mirroring
`useMultiFileAuthState`'s shape but persisting through the database.

**This is an exception to the "no direct database access" rule below** — it's
infra state for the WhatsApp connection itself (session credentials, signal
keys), not business data. It's fine for this service to read/write its own
`WhatsappCreds`/`WhatsappSignalKey`/`LinkedNumber`/`ThreatEvidence` tables
directly. Everything else — profiles, risk entries, reminders data — always
goes through `backend`'s API.

## Evidence trail (`ThreatEvidence`)

`createThreatMonitorHandler()` writes a `ThreatEvidence` row **before**
calling `sock.chatModify({ archive: true, ... }, jid)` — evidence has to land
first so proof survives even though the archive call makes the chat
disappear from the student's main WhatsApp inbox. `chatArchived` on that row
is only flipped to `true` after the archive call actually succeeds, so a
failed archive still leaves a queryable trail of what was detected.

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
  the same way — `startSession()` always builds a brand-new socket instance
  for that `sessionId`, never reconnects an old one in place.
- The reminder scheduler is registered **once**, in `index.ts` — it looks up
  whatever socket is currently active for `BOT_SESSION_ID` at send-time
  (`connection.ts`'s `getActiveSocket(sessionId)`) rather than closing over
  one instance, since reconnects replace the socket. Do not call
  `scheduleReminders()` from inside `startSession()` — that would re-register
  the cron job on every reconnect.

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
  by an agent; it's a manual one-time step per session (bot, and each linked
  student number) — session then persists in
  `WhatsappCreds`/`WhatsappSignalKey` (keyed by that session's `sessionId`)
  across restarts.
- If logged out (`DisconnectReason.loggedOut`), the stored session is dead —
  delete that `sessionId`'s `WhatsappCreds`/`WhatsappSignalKey` rows and
  re-pair with a new QR scan rather than trying to reconnect with stale
  credentials. For a linked student number, also check `LinkedNumber.status`
  — it's set to `"logged_out"` automatically via `onLoggedOut`, so `index.ts`
  won't try to auto-resume it on the next restart until it's re-paired.

## Git workflow

See the root `../CLAUDE.md` — branch naming, "passed" criteria, commit/merge/push
rules, and confirmation requirements apply repo-wide, not just to this sub-project.
