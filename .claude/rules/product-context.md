# Product context — FinSafe

FinSafe helps Indonesian university students make safer financial decisions across
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

## Scope note

There is no separate web dashboard / institutional portal — dropped from scope.
If a "dashboard" feature is requested, it means step 6 inside `mobile-app`, not a
new surface.
