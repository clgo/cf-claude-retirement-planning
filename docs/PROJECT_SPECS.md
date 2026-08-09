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
9. **Save scenario to cloud** *(optional)* – Persist the current input set under a name to
   D1, list saved scenarios in a dropdown, reload one into the form, and delete one.
   When D1 is unbound the dropdown reads "cloud storage not connected" and every other
   feature continues to work.

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
- `name` TEXT NOT NULL — user-supplied label, trimmed, max 120 chars
- `data` TEXT NOT NULL — JSON string of the input state above, max 10 000 chars
- `created_at` TEXT NOT NULL DEFAULT `datetime('now')`
- Index `idx_scenarios_created` on `(created_at DESC)`

## Non-Functional Requirements
- **Performance**: Single HTML document, no build step, no external requests on load.
  Recalculation and re-render on every input change must feel instant (projections are
  bounded by a human lifespan, so a few hundred rows at most).
- **Security**: No authentication and no user accounts — the scenarios table is therefore
  a shared, world-readable/writable store. Do **not** put anything personally identifying
  in it. All SQL uses bound parameters. Input is length-capped server-side (120 char name,
  10 KB payload) to bound abuse. Adding auth is a future phase, not an assumption.
- **Deployment**: Cloudflare Pages, deployed from GitHub `main`. Build command empty,
  output directory `public`, Functions auto-discovered from `functions/`.
- **Cost constraints**: Cloudflare free tier only — Pages static hosting, Pages Functions
  requests, and D1 free quota. No paid services, no R2.
- **Accuracy disclaimer**: Figures are nominal SGD and ignore tax, CPF, and market
  volatility. The UI must continue to state that this is a planning aid, not advice.
