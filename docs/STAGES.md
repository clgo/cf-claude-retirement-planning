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

## Phase 3 – D1 wiring ✅
Done before the first Pages deploy, so the placeholder `database_id` never reached a live
deployment.

- [x] `npx wrangler login` — needed an unsandboxed shell; the first attempt timed out at
      120 s because the sandbox could not open a browser or bind the callback port
- [x] `npx wrangler d1 create retirement_calculator` — created in **APAC**
- [x] `database_id = e4f2eb61-01f8-4b1d-b3e2-63e58548bf59` in `wrangler.toml`
- [x] `npm run db:init:remote`; verified remotely that `scenarios` and
      `idx_scenarios_user` exist and `user_sub` is `NOT NULL`
- [x] `npm run db:init` re-run locally, since the real id re-keys the local database
- [x] Verify save → list → load → delete round-trips locally
- **Last commit:** `0a364db` — set the real D1 database_id
- **Branch:** `main`
- **Next task:** Phase 3 complete.

## Phase 4 – Deploy ❌
- [x] Push to GitHub
- [x] Connect the repo in Cloudflare Pages (preset None, empty build command, output `public`)
      — project name is `cf-claude-retirement-planning`, Git-connected to `main`
- [x] Confirm the `DB` binding is picked up from `wrangler.toml` on deploy — proven by
      `/api/scenarios` answering 401 rather than 503, since the `!env.DB` check runs first
- [ ] Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET` as Pages **secrets**
- [ ] Attach `retirement.aipropfolio.com` as a custom domain
- [ ] Create the Google OAuth client against the final domain
- [ ] Redeploy so the secrets reach the running app, then smoke-test every route
- **Last commit:** `81bd286` — matched wrangler name to the Pages project
- **Branch:** `main`
- **Next task:** attach the custom domain, then create the OAuth client against it

### Live verification (Phase 4, first deploy, before any secrets)
| Check | Result |
|---|---|
| `GET /` | 200, 44 976 bytes, privacy note present |
| `/api/auth/me` | `{signedIn:false, configured:false}` |
| `/api/scenarios` | **401** — so `env.DB` is bound; unbound would be 503 |
| `/api/auth/login` | 503 — no OAuth client yet |

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
