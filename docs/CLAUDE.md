# Retirement Runway – Claude AI Master Context

You are building **Retirement Runway**, a single-page SGD investment accumulation and
retirement drawdown planner, using the following stack:

- Frontend: vanilla HTML + CSS + JS in one file (`public/index.html`), no build step,
  no framework, no dependencies. Hosted on Cloudflare Pages.
- Backend: Cloudflare Pages Functions (`functions/api/**`), plain `onRequest*` handlers.
  No Hono, no router library.
- Database: Cloudflare D1 (SQLite), bound as `env.DB`. Raw SQL via `env.DB.prepare()`.
- Auth: Google OAuth 2.0, handled **server-side** in `functions/api/auth/*`. The browser
  never loads a Google script — `/api/auth/login` redirects, `/api/auth/callback` exchanges
  the code, and the app issues its own HMAC-signed `HttpOnly` session cookie.
- File Storage: none. R2 is deliberately unused — see README "Why no R2?".
- AI/LLM: none.

The calculator is 100% client-side and must keep working with the backend absent or
unbound. The D1 layer exists only for the optional "Save to cloud" scenario feature.

## Every session you must:
1. Load `PROJECT_SPECS.md` (requirements) and `TECH_STACK.md` (architecture).
2. Check `AGENTS.md` for your assigned role.
3. Read `STAGES.md` to know the exact build phase and the last completed commit.
4. NEVER implement features outside the current active phase unless explicitly asked.
5. After every meaningful change, update `STAGES.md` with the new commit hash and a brief progress note.
6. If the session is interrupted, the next session MUST resume from the last commit logged in `STAGES.md`.

## Rules
- Write production-ready, clean code.
- Follow the conventions and patterns defined in `TECH_STACK.md`.
- Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`.
- Create a new git branch for each phase: `phase-X-short-name`.
- Never commit secrets; sensitive values go in environment variables.
- Provide clear manual steps (deploy, run migrations) when they can't be automated directly.

## Project-specific rules
- **No dependencies in the frontend.** No npm packages, no CDN script tags, no fonts or
  images fetched from other hosts. Charts are hand-rolled inline SVG. This is why Google
  sign-in uses the server-side redirect flow instead of Google Identity Services — adding
  `accounts.google.com/gsi/client` would have broken this rule.
- **Every scenario query filters on `user_sub`.** There is no unscoped read of the
  `scenarios` table anywhere, and there must never be one. A row owned by another account
  returns `404`, never `403` — `403` would confirm the id exists.
- **Never trust a JWT handed over by a browser.** `decodeJwtClaims()` skips signature
  verification and is only valid for the `id_token` returned inside our own TLS call to
  Google's token endpoint. Verifying against Google's JWKS would be required anywhere else.
- **Graceful degradation is a hard requirement.** Every `fetch` to `/api/*` must be
  wrapped so that a 503 (no D1 binding) or a network failure leaves the calculator fully
  usable and shows "cloud storage not connected" rather than an error state.
- **Nominal SGD only.** The model ignores tax, CPF, and market volatility by design.
  Do not silently add these; propose them as a spec change first.
- Keep the financial helpers (`annuityFV`, `requiredPmt`, `growingAnnuityPV`, `compute`)
  pure and free of DOM access, so the math stays testable independently of rendering.
- `wrangler.toml` is committed on purpose — Pages reads the D1 binding from it.
