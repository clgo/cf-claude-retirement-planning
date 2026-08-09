# Build Stages – Retirement Runway

The calculator and API were written before this tracker existed and arrived as loose files
in the repo root. Phase 1 is therefore mostly *reconciliation*: get the working code into
the layout Cloudflare Pages requires, get it under version control, and confirm it deploys.

## Phase 1 – Foundation & Pages layout 🚧
- [x] Move `index.html` → `public/index.html`
- [x] Move `scenarios.js` → `functions/api/scenarios.js`
- [x] Move `[id].js` → `functions/api/scenarios/[id].js`
- [x] Stop ignoring `wrangler.toml` (Pages reads the D1 binding from it at deploy time)
- [x] Fill in `docs/` context files from the actual project
- [x] Commit the source files
- [x] Resolve the duplicate `README 2.md` (byte-identical copy, since removed)
- [x] Point `origin` at its own repository — the clone was still tracking
      `clgo/claude-webapp-template`, so a push would have polluted the template.
      Now `clgo/cf-claude-retirement-planning` (public). Stray remote `main` removed.
- [ ] `npm install`, then `npm run dev` and confirm the page renders and recalculates
- **Last commit:** `00d7516` — moved source into the Pages layout, unignored `wrangler.toml`
- **Branch:** `main`. Phase 1 landed directly on `main` because it initialises an
  otherwise-empty repository; Phase 2 onward uses `phase-X-name` branches per `CLAUDE.md`.
- **Next task:** `npm install`, then verify `npm run dev` serves the page at :8788 and
  that the scenario dropdown shows "cloud storage not connected"

## Phase 2 – D1 wiring ❌
- [ ] `npx wrangler login` and `npx wrangler d1 create retirement_calculator` *(manual)*
- [ ] Paste the printed `database_id` into `wrangler.toml`
- [ ] `npm run db:init:remote` to create the table
- [ ] `npm run db:init` for the local dev database
- [ ] Verify save → list → load → delete round-trips locally
- **Last commit:** `pending`
- **Branch:** `phase-2-d1-wiring`
- **Next task:** create the database and fill in `database_id`

## Phase 3 – Deploy ❌
- [ ] Push to GitHub
- [ ] Connect the repo in Cloudflare Pages (preset None, empty build command, output `public`)
- [ ] Confirm the `DB` binding is picked up from `wrangler.toml` on deploy
- [ ] Smoke-test all four API routes against the deployed URL
- **Last commit:** `pending`
- **Branch:** `phase-3-deploy`
- **Next task:** blocked on Phase 2

## Phase 4 – Hardening ❌
- [ ] Verify the financial model against a reference spreadsheet (see `model-verifier`
      in `AGENTS.md`) — accumulation, drawdown, required capital, required injection
- [ ] Accessibility pass on the SVG charts and the year-by-year tables
- [ ] Decide whether the unauthenticated shared `scenarios` table is acceptable, or
      whether auth becomes a spec requirement
- **Last commit:** `pending`
- **Branch:** `phase-4-hardening`
- **Next task:** blocked on Phase 3

**Resume instructions**: Read the first incomplete phase, check out its branch (or create
it), and start from the `Next task` line. After each commit update this file.
