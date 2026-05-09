# [Project Name] – Claude AI Master Context

You are building a [brief description of the app] using the following stack:
- Frontend: [e.g., React + Vite, hosted on Cloudflare Pages]
- Backend: [e.g., Cloudflare Workers with Hono]
- Database: [e.g., Cloudflare D1, Supabase, etc.]
- File Storage: [if any]
- AI/LLM: [if any]

## Every session you must:
1. Load `PROJECT_SPECS.md` (requirements) and `TECH_STACK.md` (architecture).
2. Check `AGENTS.md` for your assigned role.
3. Read `STAGES.md` to know the exact build phase and the last completed commit.
4. NEVER implement features outside the current active phase unless explicitly asked.
5. After every meaningful change, update `STAGES.md` with the new commit hash and a brief progress note.
6. If the session is interrupted, the next session MUST resume from the last commit logged in `STAGES.md`.

## Rules
- Write production‑ready, clean code.
- Follow the conventions and patterns defined in `TECH_STACK.md`.
- Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`.
- Create a new git branch for each phase: `phase-X-short-name`.
- Never commit secrets; sensitive values go in environment variables.
- Provide clear manual steps (deploy, run migrations) when they can’t be automated directly.