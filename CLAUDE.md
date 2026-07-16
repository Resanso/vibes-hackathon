# FinSafe — Financial Safety Intelligence Platform

Guidance for Claude Code across this monorepo. Read this first in every session,
then read the `CLAUDE.md` inside whichever subfolder you're working in.

## What this product is

FinSafe helps Indonesian university students make safer financial decisions across
their entire borrowing journey. Full product rationale (HMW questions, the 7-step
flow, privacy principle) lives in `.claude/rules/product-context.md`.

Built for Garuda Hacks 7.0, Track 2 (Safety).

## Monorepo structure
root/
├── backend/           Next.js (API-only, no pages) + tRPC + Prisma — the single
│                      API mobile-app and whatsapp-service both call
├── mobile-app/        React Native — the ONLY frontend. All 7 user-flow steps,
│                      including the personal Financial Safety Dashboard (step 6)
└── whatsapp-service/  Node.js + Baileys — companion: reminders, quick consult
There is no separate web dashboard / institutional portal — dropped from scope.
If a "dashboard" feature is requested, it means step 6 inside `mobile-app`, not a
new surface.

## MVP priority for hackathon

1. **backend** — the logic has to exist somewhere; both clients depend on it.
2. **mobile-app** — the surface judges actually interact with during the demo.
3. **whatsapp-service** — good differentiator, acceptable as a recorded clip if
   time runs out (see its CLAUDE.md for why).

## Tech stack summary

| Layer | Stack |
|---|---|
| Backend/API | Next.js 15 (App Router) used API-only — no dashboard pages — + tRPC + Prisma |
| Mobile | React Native (Expo) — the only user-facing surface |
| WhatsApp | Node.js + Baileys (`@whiskeysockets/baileys`) |
| Database | PostgreSQL, self-hosted via Docker on our VPS |
| AI layer | MAIA Router (OpenAI-compatible gateway) — coaching narrative/explanations only; risk *scoring* is deterministic, see `backend/CLAUDE.md` |
| Infra | Our own VPS — Nginx + PM2 (backend, whatsapp-service) + Docker (Postgres only) |

See `docs/deployment.md` for VPS setup.

## Git workflow (monorepo)

- Branch naming: `feature/<area>-<slug>`, e.g. `feature/mobile-onboarding`,
  `feature/backend-risk-endpoint`, `feature/whatsapp-reminders`.
- First commit on `main` must be an empty/minimal initial commit (hackathon rule).
- Do not commit, merge, or push without explicit user confirmation — every time.
- No Claude/Anthropic co-author trailer on commits.
- GitHub repo stays public for the full event duration.

## Hackathon submission requirements

- Track: **Safety** only.
- Disclose AI-assisted portions in `docs/ai-disclosure.md` — append as you go.
- Demo video ≤ 2 minutes, Devpost text in English.
- Minimum 3 commits, public repo throughout.

## Gotchas

<!-- Add project-specific gotchas here as they're discovered. -->
