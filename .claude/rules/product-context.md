# Product context — Nera

Nera helps Indonesian university students make safer financial decisions across
their entire borrowing journey (pinjaman online, cicilan, paylater kampus). Built
for Garuda Hacks 7.0, Track 2 (Safety).

## HMW questions

- How might we help students see the true cost of a loan before they commit,
  not after the first missed payment?
- How might we surface safer, campus-available alternatives at the moment a
  student is about to borrow, instead of after the fact?
- How might we give students an honest, ongoing picture of their financial risk
  without needing them to understand credit terminology?

## The 7-step flow

1. **Onboarding** — student intent, no financial data collected yet
2. **Financial Survival Check** — self-reported profile (income, existing debt)
3. **Borrowing Scenario** — student describes a loan they're considering
4. **Financial Risk Intelligence** — true cost-of-credit simulation + deterministic
   risk score, explained in plain language
5. **Decision Support** — campus-available alternatives to the loan being considered
6. **Financial Safety Dashboard** — trend of the student's self-reported entries
   over time (lives inside `mobile-app`, not a separate surface)
7. **AI Coach** — ongoing plain-language coaching, narrative only

## Privacy principle

Every input into the system is something the student explicitly typed or
submitted — never inferred from device signals (installed apps, contacts, SMS,
location, etc.). If a feature would require reading device signals to work, it's
out of scope, not a workaround to design around.

### Exception: consent-based pinjol usage tracking (Android only, debug/testing)

One narrow, explicit exception, added 2026-07-17 for an in-progress experiment:
detecting how often and how long a student opens known pinjol (online loan) apps,
surfaced on the Financial Safety Dashboard (step 6).

- Requires an explicit in-app consent screen before any device signal is read —
  no silent collection. The consent copy must name exactly what's read (app open
  count + foreground duration for a defined pinjol app list) and let the student
  decline without blocking the rest of the app.
- Android only, via `UsageStatsManager` (user must manually grant Usage Access in
  system Settings — this can't be requested as a normal runtime permission).
  iOS has no equivalent public API for reading other apps' usage, so this feature
  cannot exist on iOS; do not attempt an iOS workaround.
- Scope stays narrow: open count + time-in-app for a specific pinjol app list.
  Not general installed-app enumeration, not SMS, not contacts, not location.
- Currently debug/testing only, gated behind development builds while validated
  on a real Android device — not yet a claimed feature for the hackathon
  submission or demo. Revisit before demo day whether this ships or gets pulled.

Everything else in this principle (SMS, contacts, location, general installed-app
lists) remains out of scope, full stop — this exception does not generalize.

## Scope note

There is no separate web dashboard / institutional portal — dropped from scope.
If a "dashboard" feature is requested, it means step 6 inside `mobile-app`, not a
new surface.
