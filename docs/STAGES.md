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

## Phase 2 – Google sign-in & per-user scoping 🚧
Brought forward ahead of deploy: the API was unauthenticated and the `scenarios` table was
a single shared bucket, so deploying first would have exposed an open read/write endpoint.

- [x] Server-side OAuth (`functions/api/auth/{login,callback,me,logout}.js`) — chosen over
      Google Identity Services so no third-party script loads in the browser
- [x] HMAC-SHA256 signed `HttpOnly` session cookie; `state` cookie for CSRF
- [x] `functions/api/_shared.js` for the helpers both route files were duplicating
- [x] `user_sub` / `user_email` on `scenarios`; every query filtered by owner
- [x] `DELETE` now 404s instead of reporting success for rows that were never there
- [x] Sign-in/out UI and the plain-language privacy note
- [x] Verified locally against a minted session (see table below)
- [x] Merged to `main` (fast-forward) so Pages deploys the authenticated version
- [ ] **Manual:** create the Google OAuth client and fill in `.dev.vars` (README §3)
- [ ] End-to-end sign-in with a real Google account — cannot be tested without the above
- **Last commit:** `0b0a754` — Google sign-in, per-user scoping, privacy note
- **Branch:** `phase-2-google-auth`, merged into `main`
- **Next task:** Phase 3. The OAuth client is created *after* the domain is live, so that
  the redirect URI can be registered as `https://retirement.aipropfolio.com/api/auth/callback`.

### Local verification (Phase 2, run 2026-08-09, dummy credentials + minted cookie)
| Check | Result |
|---|---|
| `GET /api/auth/me` signed out | 200 `{signedIn:false}` |
| list / create / delete, signed out | 401 ×3 |
| `GET /api/auth/login` | 302 to Google, `state` cookie set |
| create as user A, as user B | 201, 201 |
| A lists / B lists | each sees only their own row |
| B reads A's id | 404 |
| B deletes A's id | 404, A's row intact |
| forged signature | 401 |
| **valid cookie, `sub` swapped to A** | **401** |
| expired cookie, valid signature | 401 |
| garbage cookie | 401 |
| A deletes own row / repeats | 200, then 404 |
| callback without `state` cookie | 302 `/?auth=state` |
| callback with `error=access_denied` | 302 `/?auth=denied` |
| `POST /api/auth/logout` | 200, `Max-Age=0` |
| `/api/_shared.js` | not routed; no source exposed |
| calculator signed out | renders, 34 element ids resolve, JS parses |

## Phase 3 – D1 wiring ❌
Do this *before* the first Pages deploy: `wrangler.toml` still holds the literal
`PASTE_YOUR_DATABASE_ID_HERE`, and rather than discover how Pages reacts to that on a live
domain, replace it with a real id first.

- [ ] `npx wrangler login` and `npx wrangler d1 create retirement_calculator` *(manual)*
- [ ] Paste the printed `database_id` into `wrangler.toml`
- [ ] `npm run db:init:remote` to create the table
- [x] `npm run db:init` for the local dev database
- [x] Verify save → list → load → delete round-trips locally
- **Last commit:** `pending`
- **Branch:** `phase-3-d1-wiring`
- **Next task:** create the remote database and fill in `database_id`. Note that
  `db:init` currently writes to a local database keyed on the literal placeholder
  `PASTE_YOUR_DATABASE_ID_HERE`; once a real `database_id` is pasted in, the local
  database is re-keyed and the table must be created again with `npm run db:init`.

## Phase 4 – Deploy ❌
- [ ] Push to GitHub
- [ ] Connect the repo in Cloudflare Pages (preset None, empty build command, output `public`)
- [ ] Confirm the `DB` binding is picked up from `wrangler.toml` on deploy
- [ ] Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET` as Pages **secrets**
- [ ] Add the `https://<project>.pages.dev` origin and callback URL to the Google client
- [ ] Smoke-test every route against the deployed URL
- **Last commit:** `pending`
- **Branch:** `phase-4-deploy`
- **Next task:** blocked on Phase 3

## Phase 5 – Hardening ❌
- [ ] Verify the financial model against a reference spreadsheet (see `model-verifier`
      in `AGENTS.md`) — accumulation, drawdown, required capital, required injection
- [ ] Accessibility pass on the SVG charts and the year-by-year tables
- [ ] Rate-limit `POST /api/scenarios` — an authenticated account can still create
      unlimited rows and burn the D1 free-tier quota
- [ ] Decide whether session revocation is needed (a stolen cookie stays valid for 30 days;
      fixing it means a sessions table or a per-user token version)
- [ ] Consider a `functions/api/[[path]].js` catch-all so unmatched `/api/*` returns JSON
      404 instead of falling through to `index.html` with a 200
- [ ] Upgrade wrangler 3 → 4 (clears 6 dev-only advisories in `esbuild`/`undici`/`ws`/`sharp`)
- **Last commit:** `pending`
- **Branch:** `phase-5-hardening`
- **Next task:** blocked on Phase 4

**Resume instructions**: Read the first incomplete phase, check out its branch (or create
it), and start from the `Next task` line. After each commit update this file.
