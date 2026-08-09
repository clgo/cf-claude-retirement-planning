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
│       ├── scenarios.js           # GET (list) + POST (create)  -> /api/scenarios
│       └── scenarios/[id].js      # GET (one) + DELETE          -> /api/scenarios/:id
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

## 3. Run locally (optional)

```bash
npm run dev          # serves public/ + functions/ with a local D1 at http://localhost:8788
```

`npm run db:init` seeds the **local** dev database if you want save/load to work in `wrangler pages dev`.

## 4. Push to GitHub

```bash
git init
git add .
git commit -m "Retirement Runway calculator"
git branch -M main
git remote add origin https://github.com/<your-username>/sg-retirement-calculator.git
git push -u origin main
```

## 5. Connect to Cloudflare Pages

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

| Method | Path                  | Purpose                        |
|--------|-----------------------|--------------------------------|
| GET    | `/api/scenarios`      | list saved scenarios           |
| POST   | `/api/scenarios`      | create `{ name, data }`        |
| GET    | `/api/scenarios/:id`  | fetch one                      |
| DELETE | `/api/scenarios/:id`  | delete one                     |

`data` is a JSON string of the input field values; the frontend serialises/deserialises it.

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
