# Agents

## Active Agent: retirement-runway-fullstack
- Responsibility: full-stack — the single-file frontend (`public/index.html`), the Pages
  Functions API (`functions/api/**`), the D1 schema (`schema.sql`), and deployment config
  (`wrangler.toml`, `package.json`).
- Context files: CLAUDE.md, PROJECT_SPECS.md, TECH_STACK.md, STAGES.md
- Output: source files, `schema.sql` additions, wrangler config, and the manual
  deploy/migration steps the user must run themselves.

## Scope boundaries
- Owns the financial model. Changes to `annuityFV`, `requiredPmt`, `growingAnnuityPV`, or
  `compute` must be stated explicitly in the commit message and reflected in the
  "Model & assumptions" section of `README.md`.
- Does **not** introduce frontend dependencies, a build step, or external network calls
  without an explicit spec change agreed with the user first.
- Does **not** run `wrangler login`, create D1 databases, or deploy. Those are manual
  steps for the user; the agent writes them out as copy-pasteable commands.

## Future Agents (if needed)
- `model-verifier`: independently re-derives the accumulation, drawdown, required-capital,
  and required-injection figures against a reference spreadsheet, and reports discrepancies
  rather than editing code. Worth spawning before any release that touches `compute()`.
- `a11y-and-responsive`: audits the single-page UI for keyboard navigation, colour
  contrast in both themes, screen-reader labelling of the SVG charts, and small-viewport
  layout of the year-by-year tables.
- `auth-backend`: only if `PROJECT_SPECS.md` gains an authentication requirement — would
  own per-user scoping of the `scenarios` table and the session mechanism.
