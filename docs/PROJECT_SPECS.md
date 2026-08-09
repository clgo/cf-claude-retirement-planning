# Project Specs – Retirement Runway

## Overview
Retirement Runway is a single-page planning aid for Singapore-based individuals who want
a concrete answer to one question: *will my money outlast me?* The user enters their
current portfolio value, expected growth rate, planned annual injections, and current
monthly expenses. The app projects the portfolio forward to their chosen exit (retirement)
age, inflates their expenses to that date, then draws the portfolio down year by year and
reports the age at which it hits zero — compared against their target age. Everything is
computed in the browser; no account, no sign-up, no data leaves the device unless the user
explicitly saves a scenario to the cloud.

Target user: a numerate non-specialist planning their own retirement, who wants to test
"what if I add $X a year" without a spreadsheet. Core value: an immediate, legible verdict
(runway vs. target) rather than a wall of numbers.

## User Stories / Features
1. **Accumulation projection** – Given entry age, exit age, current value, and annual
   growth rate, project the portfolio to exit age. Two scenarios are modelled side by side:
   **A** (no further injections) and **B** (a fixed annual injection added at each year-end).
2. **Expense inflation** – Inflate today's monthly expense to its value at exit age, and
   report both monthly and annual figures at that point.
3. **Drawdown simulation** – From exit age onward, withdraw each year's inflated expense,
   then grow the remaining balance at the post-exit rate. Floor the balance at zero once
   depleted, and record the depletion age for each scenario.
4. **Verdict** – A plain-language headline stating, per scenario, whether the money lasts
   to the target age and by how many years it over- or undershoots.
5. **Required capital back-calc** – Compute the lump sum needed at exit age to fund
   inflated expenses through to the death age, using a growing-annuity present value.
6. **Required injection back-calc** – Compute the annual injection needed to reach that
   required capital by exit age.
7. **Runway visualisation** – A horizontal timeline showing each scenario's runway bar
   against the exit and target ages, plus line charts for accumulation and drawdown.
8. **Year-by-year tables** – Accumulation and drawdown tables showing age, invested
   principal, and balance per year for both scenarios.
9. **Save scenario to cloud** *(optional, requires sign-in)* – Persist the current input
   set under a name to D1, list your saved scenarios in a dropdown, reload one into the
   form, and delete one. When D1 is unbound or auth is unconfigured the dropdown reads
   "cloud storage not connected" and every other feature continues to work.
10. **Sign in with Google** – A single "Sign in with Google" link starts a server-side
   OAuth redirect; on return the header shows the signed-in email and a "Sign out" button.
   Saved scenarios are private to the signed-in account. Signing in is **never** required
   to use the calculator — only to save or reload. While signed out, the cloud controls
   are disabled and the dropdown reads "sign in to see saved scenarios".
11. **Privacy note** – Visible near the top of the page, stating in plain language that
   the calculator runs locally and needs no account; that sign-in exists only for saving;
   that saved scenarios are tied to the user's Google account and visible only to them;
   exactly what is stored (Google account id, email, saved figures); and that any saved
   scenario can be deleted at any time.

## Data Model (high-level)

### Client-side input state (serialised as the `data` JSON string)
- `entryAge`, `exitAge`, `targetExit`, `deathAge` — ages in years
- `currentValue` — present portfolio value, SGD
- `growthRate` — pre-exit annual growth, percent
- `injection` — annual capital injection for Scenario B, SGD
- `monthlyExpense` — today's monthly expense, SGD
- `inflation` — annual expense inflation, percent
- `postGrowth` — post-exit annual growth applied during drawdown, percent

### `scenarios` (D1 table)
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `user_sub` TEXT NOT NULL — owner; the Google `sub` claim. Every query filters on this.
- `user_email` TEXT NOT NULL DEFAULT `''` — display only, never used to authorise
- `name` TEXT NOT NULL — user-supplied label, trimmed, max 120 chars
- `data` TEXT NOT NULL — JSON string of the input state above, max 10 000 chars
- `created_at` TEXT NOT NULL DEFAULT `datetime('now')`
- Index `idx_scenarios_user` on `(user_sub, created_at DESC)`

### Session (no table — stateless cookie)
- `sub`, `email`, `exp`, signed with HMAC-SHA256 over `SESSION_SECRET`

## Non-Functional Requirements
- **Performance**: Single HTML document, no build step, no external requests on load.
  Recalculation and re-render on every input change must feel instant (projections are
  bounded by a human lifespan, so a few hundred rows at most).
- **Security**: Google OAuth 2.0 sign-in, server-side authorization-code flow. Every
  `/api/scenarios*` route requires a valid session and filters on `user_sub`, so one
  account cannot read, modify, or delete another's rows. Sessions are HMAC-signed
  `HttpOnly` cookies — tampering with the payload invalidates the signature. All SQL uses
  bound parameters. Input is length-capped server-side (120 char name, 10 KB payload).
  Names are rendered with `textContent`, never `innerHTML`, so a stored name cannot inject
  script. Known gaps, accepted for now: no rate limiting on writes, and no server-side
  session revocation (logout clears the cookie but a stolen cookie stays valid until it
  expires).
- **Privacy**: Stored per scenario — Google account id, email, scenario name, and the
  entered figures. Not shared between accounts. Users can delete any scenario at any time.
  The privacy note in the UI must stay accurate if this list ever changes.
- **Deployment**: Cloudflare Pages, deployed from GitHub `main`. Build command empty,
  output directory `public`, Functions auto-discovered from `functions/`.
- **Cost constraints**: Cloudflare free tier only — Pages static hosting, Pages Functions
  requests, and D1 free quota. No paid services, no R2.
- **Accuracy disclaimer**: Figures are nominal SGD and ignore tax, CPF, and market
  volatility. The UI must continue to state that this is a planning aid, not advice.
