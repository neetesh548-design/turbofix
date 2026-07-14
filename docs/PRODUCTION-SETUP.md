# Production setup checklist

Two things to make TurboFix production-robust: an **automated deploy** and the
**backend source in the repo**. Do them in this order.

---

## Part 1 — Turn on the automated deploy

A workflow is ready at `.github/workflows/deploy.yml`. It builds the SPA and
publishes to GitHub Pages on every push to `main` (replacing the manual
`dist` force-push).

> ⚠️ I could not push this workflow file myself — the git token here lacks the
> `workflow` scope. You need to add it, one of two ways:

**Option A — via GitHub web UI (easiest)**
1. Open the repo → **Add file ▸ Create new file**.
2. Name it `.github/workflows/deploy.yml`.
3. Paste the contents of the local `.github/workflows/deploy.yml` file.
4. Commit to `main`.

**Option B — via your own machine**
1. `git pull` this branch.
2. Re-auth git with a token that has the **`workflow`** scope
   (GitHub ▸ Settings ▸ Developer settings ▸ Tokens), then
   `git push` — the `.github/workflows/deploy.yml` will go up.

**Then, once the workflow is in `main`:**
- [ ] Repo **Settings ▸ Pages ▸ Build and deployment ▸ Source** → switch from
      *Deploy from a branch* to **GitHub Actions**. (This stops the old
      `gh-pages` branch deploy and uses the workflow instead.)
- [ ] *(Optional)* Repo **Settings ▸ Secrets and variables ▸ Actions ▸
      Variables** → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` if the
      app uses them. Safe to skip — the build ships them undefined, same as now.
- [ ] Confirm the first run succeeds under the **Actions** tab, and the site is
      live at `https://neetesh548-design.github.io/turbofix/`.

---

## Part 2 — Add the backend source to the repo

Right now `backend/app/` holds only compiled `.pyc` bytecode — no `.py` source.
That makes the server un-buildable, un-reviewable, and un-rollback-able, and it
blocks all backend-dependent work (consumable scheduling, dashboard fields,
WhatsApp reminders).

The real source almost certainly lives **in a separate repo** (the frontend just
carries a compiled copy) or on the machine that deploys to Render.

- [ ] Find the real `backend/app/**/*.py` source (separate repo, or your Render
      deploy source).
- [ ] Decide how to bring it in:
  - **Same repo** (simplest): copy the `.py` tree into `backend/app/…`. Keep the
    drafted `backend/requirements.txt` (see below) at `backend/requirements.txt`.
  - **Submodule** (cleaner if it's its own repo):
    `git submodule add <backend-repo-url> backend`.
    ⚠️ A submodule *replaces* the `backend/` folder, so the drafted
    `backend/requirements.txt` belongs **inside that backend repo** instead —
    move it there before adding the submodule.
- [ ] Confirm nothing secret gets committed. `.gitignore` now excludes
      `.env`, `google key/`, `**/.venv/`, `**/__pycache__/`, `*.pyc`, keys.
      Sanity check before committing:
      ```
      git add -n .            # dry run — review the list
      git status              # confirm no .env / keys / venv appear
      ```
- [x] `backend/requirements.txt` drafted — versions pinned to what the current
      `.venv` runs (fastapi, uvicorn, gspread, PyJWT, bcrypt, slowapi, httpx, …).
      Confirm it matches your deploy, or regenerate a full lock with
      `pip freeze > requirements.lock.txt`.

Once the source is in, I can implement the production-real pieces:
**Consumable P1** (compute + calendar off real fields), the dashboard-data
additions, and the WhatsApp reminder/escalation loop.

---

## Part 3 — Before trusting P1 + P2 in production

P1 (app shell) and P2 (dashboard tiers) were verified against **stubbed tokens
and a mock API** — not your real login. After the CI deploy is live:

- [ ] Log in with a **real account** on the deployed site.
- [ ] Confirm the **app shell** renders (rail + top bar, correct role badge).
- [ ] Confirm the **dashboard tiers** populate with real KPIs and the
      "Updated just now" cue pulses on each poll.
- [ ] Check on a **phone** (supervisors are mobile) — hamburger, off-canvas rail.

Only after that smoke test should P1/P2 be considered production-verified.
