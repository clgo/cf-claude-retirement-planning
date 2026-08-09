# Tech Stack – Retirement Runway

## Architecture Diagram

```
Browser (public/index.html)
  │  all projection math runs here — works with the rest of this diagram absent
  │
  │  fetch /api/scenarios          (optional: "Save to cloud" only)
  ▼
Cloudflare Pages
  ├── static assets  ← public/
  └── Pages Functions ← functions/
        └── /api/scenarios[/:id]  →  env.DB  →  Cloudflare D1 (SQLite)
```

If the `DB` binding is missing, every Function returns `503` with a JSON error and the
frontend degrades to local-only operation. This is the expected state before D1 is set up.

## Frontend
- Framework: **none** — vanilla HTML/CSS/JS in a single file, `public/index.html`.
- State management: module-scoped plain objects. `readInputs()` reads the form into a
  values object; `currentState()` / `applyState()` serialise and restore the field set for
  save/load. There is no store and no reactivity layer — `render()` recomputes and repaints.
- Styling: hand-written CSS in a `<style>` block, driven by CSS custom properties on
  `:root` (`--ink`, `--teal`, `--canvas`, `--pass`, …). No Tailwind, no CSS framework.
- Charts: hand-rolled inline SVG (`lineChart()`, `renderRunway()`). No charting library.
- Hosting: Cloudflare Pages, serving `public/` as static assets.

## Backend
- Runtime: **Cloudflare Workers** via Pages Functions.
- Framework: none. Each file exports `onRequestGet` / `onRequestPost` / `onRequestDelete`
  and receives the `{ request, env, params }` context directly.
- Authentication: **Google OAuth 2.0, server-side authorization-code flow.**
  `/api/auth/login` → Google → `/api/auth/callback` exchanges the code for an `id_token`
  using `GOOGLE_CLIENT_SECRET`, reads the `sub` and `email` claims, and sets a session
  cookie. No third-party script loads in the browser.
- Session: stateless HMAC-SHA256 token in an `HttpOnly`, `SameSite=Lax` cookie
  (`rr_session`), `Secure` whenever the request is https. Payload is `{sub, email, exp}` —
  signed, not encrypted, so nothing secret goes in it. 30-day expiry. No sessions table,
  so there is no server-side revocation; logout clears the cookie.
- CSRF: the OAuth `state` parameter is a `crypto.randomUUID()` stored in a short-lived
  `rr_oauth_state` cookie and compared on callback. Logout is POST-only so it cannot be
  triggered by a cross-site `<img>` or link.
- Config: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`. Local values live
  in `.dev.vars` (gitignored); production values are Pages Secrets. When any are absent the
  auth endpoints return `503` and the app degrades to calculator-only.

## Database
- Provider: **Cloudflare D1** (SQLite), bound as `env.DB` via `wrangler.toml`.
- ORM / Query builder: **raw SQL** through `env.DB.prepare(...).bind(...)`.
  Always bind parameters; never interpolate values into SQL strings.
- Schema lives in `schema.sql` and is applied manually with `wrangler d1 execute`.
  There is no migration framework — schema changes are additive, idempotent
  (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE`), and appended to `schema.sql`.

## Storage (optional)
- None. R2 is intentionally not used: the app stores small structured records, which is
  D1's job. Swapping D1 for KV is viable — the Function contract is four routes.

## AI / External Services
- None. No third-party APIs, no Workers AI, no analytics, no external fonts or CDNs.
  A strict "no external requests" posture keeps the page self-contained and fast.

## Conventions
- **API shape**: every response is JSON with `Content-Type: application/json` and
  `Cache-Control: no-store`. Errors are `{ error: string }` with a meaningful status
  (`400` bad input, `404` missing, `413` payload too large, `500` server, `503` no binding).
  Both Function files define the same local `json()` and `noDB()` helpers — if a third
  route appears, lift these into `functions/api/_shared.js` rather than copying again.
- **Validation** happens in the Function, not the client: trim and cap `name` at 120 chars,
  reject empty `name`/`data`, reject `data` over 10 000 chars, coerce `:id` with
  `Number()` and reject non-integers.
- **Financial helpers are pure.** `annuityFV`, `requiredPmt`, `growingAnnuityPV`, and
  `compute` take values and return values — no DOM reads, no globals.
- Rates are entered as percentages in the UI and divided by 100 at the `readInputs()`
  boundary. Everything downstream works in decimal fractions.
- Growth compounds annually; Scenario B injections are ordinary-annuity (year-end).

## Project Structure

```
sg-retirement-calculator/
├── public/
│   └── index.html                 # the whole calculator (HTML + CSS + JS, no deps)
├── functions/
│   └── api/
│       ├── scenarios.js           # GET (list) + POST (create)  -> /api/scenarios
│       └── scenarios/[id].js      # GET (one) + DELETE          -> /api/scenarios/:id
├── docs/                          # persistent Claude context (this folder)
├── schema.sql                     # D1 table
├── wrangler.toml                  # Pages + D1 binding config (committed on purpose)
├── package.json                   # wrangler scripts
├── .gitignore
└── README.md
```

Pages derives routes from the `functions/` tree, and serves `public/` per
`pages_build_output_dir`. Neither path is arbitrary — moving a file changes its URL.

## Commands

| Command                  | What it does                                              |
|--------------------------|-----------------------------------------------------------|
| `npm run dev`            | Serves `public/` + `functions/` with local D1 on :8788     |
| `npm run db:init`        | Applies `schema.sql` to the **local** dev database         |
| `npm run db:init:remote` | Applies `schema.sql` to the **remote** D1 database         |
| `npm run deploy`         | `wrangler pages deploy public`                             |
