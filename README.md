# Retirement Runway — SGD Investment & Drawdown Planner

A self-contained single-page web app that projects investment accumulation to your
exit age, then models retirement drawdown against inflated expenses — with and without
annual capital injections — and tells you at what age the money runs out versus your
target age. Optional cloud-saved scenarios use **Cloudflare D1** via **Pages Functions**.

The calculator runs 100% in the browser. The D1 backend is only for the "Save to cloud"
scenario feature and is entirely optional — the app works without it.

```
sg-retirement-calculator/
├── public/
│   └── index.html                 # the whole calculator (HTML + CSS + JS, no deps)
├── functions/
│   └── api/
│       ├── _shared.js             # json/cookie/session helpers (not routed)
│       ├── scenarios.js           # GET (list) + POST (create)  -> /api/scenarios
│       ├── scenarios/[id].js      # GET (one) + DELETE          -> /api/scenarios/:id
│       └── auth/
│           ├── login.js           # 302 -> Google                -> /api/auth/login
│           ├── callback.js        # code exchange, sets cookie   -> /api/auth/callback
│           ├── me.js              # who am I                     -> /api/auth/me
│           └── logout.js          # clears cookie                -> /api/auth/logout
├── schema.sql                     # D1 table
├── wrangler.toml                  # Pages + D1 binding config
├── package.json                   # wrangler scripts
└── .gitignore
```

## Prerequisites

- Node.js 18+ and npm
- A free Cloudflare account and a GitHub account

## 1. Get it into VS Code

Drop this folder into your project directory (or copy each file across), open it in
VS Code, then install the CLI:

```bash
npm install
```

## 2. Create the D1 database (only needed for cloud save/load)

```bash
npx wrangler login
npx wrangler d1 create retirement_calculator
```

Copy the printed `database_id` into **wrangler.toml** (replace `PASTE_YOUR_DATABASE_ID_HERE`),
then create the table on the remote database:

```bash
npx wrangler d1 execute retirement_calculator --remote --file=./schema.sql
```

## 3. Set up Google sign-in (needed for save/load)

Saved scenarios are private to a Google account, so the app needs its own OAuth client.
This part has to be done in the browser — it can't be scripted.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) → create a project
   (or pick an existing one).
2. **APIs & Services → OAuth consent screen**: choose **External**, fill in an app name and
   your support email, and add the `openid` and `email` scopes. While the app is in
   *Testing* only accounts you list as test users can sign in; **Publish** it to allow
   anyone.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorised JavaScript origins:** `http://localhost:8788` and `https://<your-project>.pages.dev`
   - **Authorised redirect URIs:** `http://localhost:8788/api/auth/callback` and
     `https://<your-project>.pages.dev/api/auth/callback`
4. Copy the **Client ID** and **Client secret**.

Then generate a random value for signing session cookies:

```bash
openssl rand -base64 32
```

**Locally**, create `.dev.vars` in the project root (already gitignored — never commit it):

```
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
SESSION_SECRET=<the openssl output>
```

**In production**, add the same three under **Pages project → Settings → Variables and
Secrets**, as *Secrets* rather than plaintext variables, then redeploy.

Until all three are present the app still runs — the API answers `503` and the UI shows
*"cloud storage not connected"*.

## 4. Run locally (optional)

```bash
npm run dev          # serves public/ + functions/ with a local D1 at http://localhost:8788
```

`npm run db:init` seeds the **local** dev database if you want save/load to work in `wrangler pages dev`.

> The local D1 is keyed on `database_id`, so after you paste a real id into `wrangler.toml`
> the dev database changes identity — re-run `npm run db:init` or the table will appear missing.

## 5. Push to GitHub

```bash
git init
git add .
git commit -m "Retirement Runway calculator"
git branch -M main
git remote add origin https://github.com/<your-username>/sg-retirement-calculator.git
git push -u origin main
```

## 6. Connect to Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Pick your repo.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `public`
4. **Save and Deploy.**

### Bind D1 to the Pages project

Pages reads `wrangler.toml`, so once your `database_id` is filled in and pushed, the
`DB` binding is picked up automatically on the next deploy. To set it in the dashboard
instead: **Pages project → Settings → Functions → D1 database bindings → Add** →
variable name `DB` → database `retirement_calculator`.

Redeploy, and **Save to cloud** in the app will work. Until D1 is bound, the app runs
fine and the scenario dropdown simply shows *"cloud storage not connected"*.

## API

| Method | Path                  | Auth | Purpose                                  |
|--------|-----------------------|------|------------------------------------------|
| GET    | `/api/auth/login`     | —    | 302 to Google's consent screen           |
| GET    | `/api/auth/callback`  | —    | Google returns here; sets session cookie |
| GET    | `/api/auth/me`        | —    | `{ signedIn, configured, email }`        |
| POST   | `/api/auth/logout`    | —    | clears the session cookie                |
| GET    | `/api/scenarios`      | ✅   | list **your** saved scenarios            |
| POST   | `/api/scenarios`      | ✅   | create `{ name, data }`                  |
| GET    | `/api/scenarios/:id`  | ✅   | fetch one of yours                       |
| DELETE | `/api/scenarios/:id`  | ✅   | delete one of yours                      |

`data` is a JSON string of the input field values; the frontend serialises/deserialises it.

Routes marked ✅ answer `401` without a valid session. Every query filters on the owner, so
a row belonging to another account answers `404` — not `403`, which would confirm the id
exists.

## Authentication & privacy

Sign-in is **only** required to save or reload scenarios. The calculator itself needs no
account and works with the whole backend absent.

The flow is handled entirely server-side: `/api/auth/login` redirects to Google,
`/api/auth/callback` exchanges the code for an `id_token` using the client secret, and the
app sets its own session cookie. No Google script runs in the browser, so the page stays
dependency-free and makes no third-party requests.

The session cookie is `HttpOnly`, `SameSite=Lax`, `Secure` over https, and signed with
HMAC-SHA256 using `SESSION_SECRET`. It is signed rather than encrypted, so it carries
nothing sensitive — the Google `sub`, the email shown in the header, and an expiry. Editing
any of it invalidates the signature. Sessions last 30 days.

What gets stored, per saved scenario: the Google account id (`sub`), the email address, the
scenario name, and the figures entered. Rows are keyed on `sub` rather than email, because
an email can be reassigned while `sub` cannot. Nothing is shared between accounts, and
users can delete any scenario at any time.

## Model & assumptions

- Growth compounds annually; Scenario B injections are added at each year-end (ordinary annuity).
- Retirement drawdown withdraws each year's inflated expense, then grows the remaining
  balance at the post-exit rate; balance is floored at zero once depleted.
- Required-capital back-calc uses a growing-annuity present value.
- Figures are nominal SGD and ignore tax, CPF, and market volatility. Planning aid, not advice.

## Why no R2?

R2 is object storage for files/blobs. This app stores small structured records, so **D1**
(SQLite) is the right fit and R2 isn't used. Swap D1 for KV if you prefer key-value; the
Function contract is small enough to port in a few lines.
