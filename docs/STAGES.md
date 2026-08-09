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
- [x] `npm install`, then `npm run dev` — page serves at :8788, all four routes verified
- [x] Fix the `dev` script: it passed `--d1 DB=retirement_calculator`, which made
      miniflare key the local database off that literal string, while `db:init` keyed off
      `database_id` from `wrangler.toml`. Two separate `.sqlite` files, so the seeded
      table was invisible to the dev server. `wrangler pages dev` with no flags reads the
      binding from `wrangler.toml` and both commands now agree.
- **Last commit:** `00d7516` — moved source into the Pages layout, unignored `wrangler.toml`
- **Branch:** `main`. Phase 1 landed directly on `main` because it initialises an
  otherwise-empty repository; Phase 2 onward uses `phase-X-name` branches per `CLAUDE.md`.
- **Next task:** Phase 1 complete. Start Phase 2.

### Local verification (Phase 1, run 2026-08-09)
| Check | Result |
|---|---|
| `GET /` | 200, 40 920 bytes, title present |
| `POST /api/scenarios` | 201 `{id,name}` |
| `GET /api/scenarios` | 200, row returned |
| `GET /api/scenarios/:id` | 200 |
| `GET` missing id | 404 |
| `GET` non-numeric id | 400 |
| `POST` empty name | 400 |
| `POST` malformed JSON | 400 |
| `DELETE /api/scenarios/:id` | 200 `{deleted}` |

## Phase 2 – D1 wiring ❌
- [ ] `npx wrangler login` and `npx wrangler d1 create retirement_calculator` *(manual)*
- [ ] Paste the printed `database_id` into `wrangler.toml`
- [ ] `npm run db:init:remote` to create the table
- [x] `npm run db:init` for the local dev database
- [x] Verify save → list → load → delete round-trips locally (done in Phase 1 above)
- **Last commit:** `pending`
- **Branch:** `phase-2-d1-wiring`
- **Next task:** create the remote database and fill in `database_id`. Note that
  `db:init` currently writes to a local database keyed on the literal placeholder
  `PASTE_YOUR_DATABASE_ID_HERE`; once a real `database_id` is pasted in, the local
  database is re-keyed and the table must be created again with `npm run db:init`.

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
