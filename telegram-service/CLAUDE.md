# CLAUDE.md — telegram-service

Second messaging companion, alongside `whatsapp-service` — same
responsibilities (reminders, quick consult, loan payoff check-ins), a
different transport. A student picks **one active channel at a time** via
mobile-app's Profil tab (`profile.setChannel`); this service only ever
handles students currently set to `"telegram"`.

**Not in scope here**: the pinjol threat-detection feature
(`whatsapp-service`'s linked-personal-number monitoring) stays WhatsApp-only
regardless of a student's notification channel — see "Why no threat
detection" below for why it can't be replicated here.

## Stack

- Node.js (TypeScript, ESM) + **`grammy`** — a modern, TS-first wrapper
  around the official Telegram Bot API. Long polling (`bot.start()`), not a
  webhook — simplest for a single-VPS deployment with no public HTTPS
  endpoint dedicated to this service.
- **No database, no Prisma** — unlike `whatsapp-service`, the Telegram Bot
  API is stateless from this service's side: a bot token is enough, there's
  no multi-device signal-protocol session to persist (no QR pairing either).
  All actual state (which chat belongs to which student, reminders data,
  loan tracking) lives in `backend`'s Postgres via the Profile model's
  `telegramChatId` field.
- `node-cron` for the daily reminder + check-in crons, `pino` for logging.
- Calls `backend`'s tRPC HTTP endpoints via `@trpc/client`'s
  `createTRPCUntypedClient` — same reasoning and same hand-synced-shapes
  caveat as `whatsapp-service`'s `backendClient.ts`, which this mirrors.

## Identity: chatId → phone, the reverse of WhatsApp's JID

A WhatsApp JID *is* the phone number, so `whatsapp-service` never needs a
separate linking step. A Telegram `chat.id` carries no phone information at
all — every command has to resolve it first via a linking step:

1. Student sends `/start` (`src/handlers/linking.ts`'s `handleStartCommand`)
   — bot replies with a `request_contact` keyboard button.
2. Student taps it, Telegram sends their contact (with phone number) back to
   the bot — `handleContactShared` normalizes it (strips non-digits) and
   calls `backend`'s `profile.linkTelegram({ phone, telegramChatId })`.
3. Every subsequent message calls `backend.getProfileByChatId(chatId)` first
   (see `handlers/chatHandler.ts`) to recover `phone` before forwarding
   anything to the AI Coach. No phone on file yet → the student is told to
   `/start` again.

**Fixed the hard way, 2026-07-17**: a real profile registered with a leading
`0` (e.g. `081234567890`) couldn't link Telegram — Telegram's
`contact.phone_number` always reports the international digits-only format
(`6281234567890`), so the two never matched even though they were "the same
number" to a human. `backend`'s `auth.register` now normalizes every phone
to that same international format at registration time (see its
`normalizePhone()`), so this shouldn't recur for new registrations — but any
profile created before that fix needs a manual migration (rename the
`Profile.phone` + cascade `RiskEntry`/`LoanTracking`, done once already on
the VPS for one account; there is no bulk-migration script for the rest).

## Responsibilities (mirrors whatsapp-service exactly, per-channel)

- **AI Coach chat** (`src/handlers/chatHandler.ts`, added 2026-07-17,
  replaces the old `/cek`/`/sudah`-command-based `quickConsult.ts`): every
  inbound message (no fixed format) is forwarded as-is to `backend`'s
  `chat.message` once `getProfileByChatId` resolves a phone. All
  natural-language understanding and tool-calling (loan risk, check-in,
  tracking, campus alternatives) lives in `backend` — see its `CLAUDE.md`'s
  "AI Coach" section. `/start` is the only command left; everything else is
  free text.
- **Reminders** (`src/reminders/scheduler.ts`): daily cron calls `backend`'s
  `reminders.dueSoon({ channel: "telegram" })` — the `channel` filter is
  what keeps this from double-sending the same reminder `whatsapp-service`
  already sent to a WhatsApp-channel student.
- **Loan payoff check-ins** (`src/reminders/checkInScheduler.ts`): identical
  to `whatsapp-service`'s "State 2" tracking, using
  `tracking.pendingToday({ channel: "telegram" })` for the evening nudge —
  the student's actual "sudah menyisihkan" confirmation now goes through
  the AI Coach's `checkIn` tool (free text) rather than a `/sudah` command.
- **Manual trigger** (`src/internal/triggerServer.ts`): same localhost-only
  HTTP endpoint pattern as `whatsapp-service`, default port `4002` (vs.
  `4001`) so both can run on the same VPS. `backend`'s `reminders.triggerNow`
  routes to whichever port matches the `channel` argument.

## Why no threat detection here

`whatsapp-service`'s teror-detection feature works by pairing a student's
own WhatsApp number as a second Baileys session (like WhatsApp Web) — that
session sees every message sent to that real account, then runs the
ONNX classifier on it. Telegram has no equivalent for a **bot**: the Bot API
can only ever see messages sent directly to the bot itself (or in group
chats it's a member of), never a user's other private chats. The only way to
get WhatsApp-equivalent behavior would be MTProto **user-session** login
(logging into the student's real Telegram account with phone+OTP, e.g. via
`gramjs`) — decided against: it violates Telegram's Terms of Service for
automating a real user account, risks a **permanent** ban (not a temporary
restriction like WhatsApp's), and is a much heavier implementation. This was
an explicit product decision, not an oversight — see conversation history
around 2026-07-17 if the tradeoff needs revisiting.

## Conventions

- Authenticates to `backend` with the same `SHARED_API_KEY` value
  `whatsapp-service`/`mobile-app` use, sent as the `x-api-key` header.
- No financial calculation or risk scoring logic lives here — always call
  `backend`, same rule as `whatsapp-service`.
- Telegram Bot API is an officially sanctioned integration (unlike Baileys'
  unofficial WhatsApp Web protocol reimplementation) — no equivalent
  ban/rate-limit risk from normal use. Telegram does enforce its own
  per-chat/global rate limits (~30 msg/sec), so sends still have a small
  delay, but it's cheap insurance, not the same do-not-remove requirement as
  `whatsapp-service`'s randomized 1.5–3s delay.

## Git workflow

See the root `../CLAUDE.md` — branch naming, "passed" criteria, commit/merge/push
rules, and confirmation requirements apply repo-wide, not just to this sub-project.
