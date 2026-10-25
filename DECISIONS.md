# Decisions

Decisions taken while the owner was unavailable. Each entry: date, question, options, choice, reason, how to reverse.

## D1 — 2026-10-25 — Organization name and target address
- **Question:** what `<ORG>` is.
- **Choice:** `RocketCalculator` (the owner's instruction). Repo `RocketCalculator/RocketCalculator.github.io`, site
  `https://rocketcalculator.github.io/` (GitHub lower-cases the host).
- **Reverse:** rename the organization; nothing in the site hard-codes the host.

## D2 — 2026-10-25 — Proceed while the migration is not done
- **Question:** the organization does not exist and could not be created (B1). Wait, or work at the current address?
- **Options:** (a) stop; (b) keep working and make the site address-independent; (c) host somewhere else.
- **Choice:** (b). The site already resolves every asset relative to the module URL (`ROOT = new URL('../',
  import.meta.url)`), page links are relative and share links use `location.origin + location.pathname`, so it works
  under `/RocketCalculator/` and at `/` unchanged. Only a 404 page and documentation needed changes.
- **Reverse:** n/a — nothing irreversible was done.

## D3 — 2026-10-25 — `REPO_URL` keeps the current repository until the move
- **Question:** point the footer/GitHub links at the future repo now?
- **Choice:** no. The target repository does not exist; a link to it would 404. GitHub redirects the old repo URL
  after a transfer, so the current link keeps working afterwards too. Change it after the move (B1 checklist).
- **Reverse:** edit `REPO_URL` in `site/js/app.js`.

## D4 — 2026-10-25 — No redirect stub at the old address
- **Question:** create a repo at the old location to redirect old site links?
- **Choice:** no. Creating a new `DaraSamii/RocketCalculator` repo would break GitHub's automatic redirect for the
  transferred repository (git remotes, issue links, the footer link). Trade-off accepted: GitHub Pages does not
  redirect project-site URLs after a transfer, so old `darasamii.github.io/RocketCalculator/...` links will 404 (on
  GitHub's page, since `darasamii.github.io` has no user site). If old links matter more than the repo redirect, the
  owner can later create a *user site* repo `DaraSamii/darasamii.github.io` with a `RocketCalculator/` folder of
  meta-refresh pages — that does not collide with the transferred repo's name.
- **Reverse:** create that user-site repo.

## D5 — 2026-10-25 — 404 page base path
- **Question:** relative links in `404.html` break because GitHub serves it at arbitrary depth.
- **Choice:** a one-line script writes `<base href>`: `/RocketCalculator/` if the path starts with it, else `/`.
- **Reverse:** after the migration, simplify to `<base href="/">`.

## D6 — 2026-10-25 — Baseline tag before the migration is complete
- **Question:** the plan wants `baseline-pre-overhaul` on the migrated, verified `main`; the migration cannot complete.
- **Choice:** tag `main` after the `chore/hosting-migration` merge is verified live at the current address, so a
  known-good point exists before any overhaul work. The tag does not depend on the host.
- **Reverse:** `git tag -d baseline-pre-overhaul && git push origin :refs/tags/baseline-pre-overhaul`.

## D7 — 2026-10-25 — Root-level progress log
- **Question:** `docs/PROGRESS.md` already exists (release log of the first build); the plan asks for `PROGRESS.md`.
- **Choice:** new root `PROGRESS.md` for the overhaul run; `docs/PROGRESS.md` is kept unchanged as history.
- **Reverse:** merge the two files.

## D8 — 2026-10-25 — Shared components keep their module names
- **Question:** the plan names `NumberField`, `SliderInput`, `ResultValue`; the codebase has `numberField()` in
  `ui/form.js` and the result cards/rows in `calculator-page.js`, already shared by all 29 calculators.
- **Choice:** keep the existing functions (no rename churn) and give them the stable-layout behaviour; KNOWLEDGE.md
  maps the plan's names to them. Every calculator is migrated by construction.
- **Reverse:** extract them into `ui/result-value.js` etc. if a second consumer appears.

## D9 — 2026-10-25 — Charts update when the input pauses
- **Question:** "results update live" vs. smooth dragging.
- **Choice:** key results and the drawing update every frame; charts and the table 140 ms after the input pauses
  (and off-screen charts when scrolled to). Measured: removes all long tasks at ×4 CPU.
- **Reverse:** call `renderSlow()` instead of `slowSoon()` in `recompute()`.

## D10 — 2026-10-25 — Browser tests use puppeteer-core
- **Question:** the plan suggests Playwright "or similar"; the repo's browser scripts already use puppeteer-core.
- **Choice:** puppeteer-core 23.11.1 as the only devDependency; Chromium-family browser via `CHROME`.
- **Reverse:** port `scripts/ui-*.mjs` to Playwright.

## D11 — 2026-10-25 — Back view rolled out in the shared branch
- **Question:** the plan migrates calculators to shared components "during their own cycle", but also requires every
  fin-count input to use `RocketBackView`.
- **Choice:** add the one-line `backView` config to all seven fin-count definitions in `shared/rocket-back-view`, so
  the requirement holds site-wide immediately and a test enforces it; physics is untouched.
- **Reverse:** remove the `backView` lines.

## D12 — 2026-10-25 — Fin-count ranges in the notes are conservative
- **Question:** which fin counts each calculator's equations cover.
- **Choice:** Subsonic CP 3–4 (Barrowman's N/2 form; more fins interfere — **the size of that interference was not
  verified from a source in this session**, so 5–8 are flagged "indicative"); drag/Newtonian/wedge 1–12 (terms
  linear in N); roll calculators and Roll Lock-In 3–8 (the lock-in paper studies 3, 4, 6, 8).
- **Reverse:** edit `range` in the definitions.
