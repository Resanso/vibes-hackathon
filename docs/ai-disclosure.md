# AI Disclosure

Nera was built for Garuda Hacks 7.0 with heavy use of **Claude Code**
(Anthropic) as a pair-programming/agentic coding assistant across the whole
monorepo. This file discloses which parts were AI-assisted, appended
incrementally as the team builds — not written once at the end.

## Summary

Nearly all code in this repo (`backend`, `mobile-app`, `whatsapp-service`)
was written with Claude Code doing the implementation under direct human
direction: the team wrote the product requirements, reviewed and directed
every change, tested on real devices/simulators, and made all product and
architecture decisions. Claude Code did not operate autonomously — every
session was interactively steered, with the team approving risky actions
(deploys, schema changes, git operations) explicitly before they happened.

Per root `CLAUDE.md`'s git workflow rule, commits don't carry a
`Co-authored-by: Claude` trailer — that's a repo convention about commit
metadata, not a substitute for this disclosure.

## By area

- **`backend`** — Next.js/tRPC API scaffold, all routers (`profile`,
  `simulation`, `risk`, `recommendations`, `dashboard`, `reminders`,
  `tracking`), Prisma schema and migrations, MAIA Router integration for
  risk explanations, deploy scripts — AI-assisted, human-directed and
  reviewed.
- **`mobile-app`** — Expo/React Native screens for the full onboarding flow,
  the 5-tab main navigator, reusable design-system components, and the
  loan-payoff-tracking ("State 2") feature — AI-assisted. Brand tokens
  (colors/typography) were fixed by the team as non-negotiable constraints;
  layout and component implementation were AI-assisted within those
  constraints.
- **`whatsapp-service`** — Baileys session handling, quick-consult and
  daily reminder/check-in commands — AI-assisted. Pairing (QR scan login)
  is a manual human step that cannot be automated.
- **ML models** (pinjol threat detection, anomaly/spiral-borrower behavior
  detection) — trained on synthetic data by the team; Claude Code assisted
  with the surrounding integration code (ONNX inference wiring), not model
  training itself.
- **Infrastructure** — VPS deployment scripts, PM2/Nginx setup guidance —
  AI-assisted, executed against the team's own VPS credentials with human
  confirmation before each deploy.

## What AI did *not* do

- Risk scoring is deterministic, hand-specified business logic
  (`backend/src/server/logic/riskScore.ts`) — the AI (MAIA Router) is only
  ever used to narrate an already-computed score in plain language, never
  to produce the score itself.
- No autonomous production deploys — every push to the VPS in this
  project's history was explicitly requested and confirmed by a team member
  in the same session.
- Product decisions (scope cuts, feature priority, brand identity, the
  5-step onboarding + tab-bar architecture) were made by the team; Claude
  Code implemented them and flagged tradeoffs where relevant.
