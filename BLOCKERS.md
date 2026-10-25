# Blockers

Things that stopped a task, what was tried, and what the owner needs to do. Newest first. Resolved blockers are
struck through with the date and commit that resolved them.

## B1 — Pending manual step: hosting migration (opened 2026-10-25)

**Status:** open. Work continued at the current address; the site works at both addresses.

**What was tried**
- `gh api orgs/RocketCalculator` → 404: the organization does not exist yet. `gh api users/RocketCalculator` → 404, so
  the name is free.
- Creating an organization is not possible through GitHub's public REST API (it exists only on GitHub Enterprise
  Server), and the CLI token has no `admin:org` scope.
- Workaround via the browser: no Claude-in-Chrome browser was connected (`list_connected_browsers` → `[]`), so the
  web form could not be used either.

**What the owner needs to do**
1. Create the organization `RocketCalculator` (github.com → + → New organization → Free).
2. Transfer `DaraSamii/RocketCalculator` to it (repo Settings → General → Danger Zone → Transfer).
3. Rename the transferred repo to `RocketCalculator.github.io` (organization user-site repos must be named
   `<org>.github.io`, case-insensitive).
4. Settings → Pages → Source: **GitHub Actions** (the existing `.github/workflows/pages.yml` deploys `site/`), then
   run the workflow once (Actions → Deploy site to GitHub Pages → Run workflow) or push any change under `site/`.
5. Locally: `git remote set-url origin git@github.com:RocketCalculator/RocketCalculator.github.io.git`.

**What the next session must do once the migration is done** (Phase −1 steps 1–8 re-run)
- Change `REPO_URL` in `site/js/app.js` to `https://github.com/RocketCalculator/RocketCalculator.github.io`.
- Replace the remaining old URLs: `README.md` (Live line), `docs/BRIEF.md`, `docs/OPUS_PROMPT.md` (historical
  planning docs; the URL lines only). `grep -rn -i "darasamii\|DaraSamii/RocketCalculator"` must return only
  CHANGELOG/KNOWLEDGE history entries.
- `site/404.html`: the `/RocketCalculator/` branch of the base-href script can then be removed.
- Verify `https://rocketcalculator.github.io/` loads every calculator, no 404s in the network panel, and update the
  Hosting section of `KNOWLEDGE.md` and `CHANGELOG.md`.
- Note for users: browser storage (theme, units, saved designs, baselines) does not carry over to the new origin.
