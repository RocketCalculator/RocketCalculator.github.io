# Blockers

Things that stopped a task, what was tried, and what the owner needs to do. Newest first. Resolved blockers are
struck through with the date and commit that resolved them.

## B2 — Site down: the transferred repo is private (opened 2026-10-25)

**Status:** open — **every address returns 404** (`rocketcalculator.github.io/RocketCalculator/`, the org root, and
the old `darasamii.github.io/RocketCalculator/`).

**What happened**
- The repo was transferred to the org (B1 steps 1–2 done) and is now **private**
  (`gh api repos/RocketCalculator/RocketCalculator` → `"visibility": "private"`). The org is on the **Free** plan,
  where GitHub Pages is only available for public repositories.
- Every Pages deploy since then fails at `actions/deploy-pages`: `Failed to create deployment (status: 422)
  Validation Failed`. The build itself succeeds. Tried: re-running the failed job (that only duplicated the
  artifact) and a fresh `workflow_dispatch` run → same 422.
- Pages settings are otherwise right: source = GitHub Actions, `github-pages` environment allows `main`, the org
  lets members create public Pages.

**Not done on purpose:** making the repo public — that publishes the source and is the owner's decision.

**What the owner needs to do (one of)**
1. Make the repo public (Settings → General → Danger Zone → Change visibility), then Actions → Deploy site to GitHub
   Pages → Run workflow. Or
2. Upgrade the org to a plan that allows Pages from private repos (Team), then run the workflow.

**Waiting on it:** live verification and the tags `subsonic-cp/v1.1.0` and `v1.5.1` for PR #8 (merged as 9218a07).

## B1 — Pending manual step: hosting migration (opened 2026-10-25)

**Status:** partly done (2026-10-25): the org exists and the repo was transferred to `RocketCalculator/RocketCalculator`.
Still open: step 3 (rename to `RocketCalculator.github.io`), step 5, and the follow-ups below. See also B2.

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
