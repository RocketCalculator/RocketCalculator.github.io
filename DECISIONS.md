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

## D13 — 2026-10-25 — Fin flutter: Martin's form as corrected by Bennett, not the "1.337" form
- **Question:** the plan quotes V_f = a √(G / ((1.337 A³ P (λ+1)) / (2 (A+2) (t/c)³))).
- **Finding:** Bennett (2023) shows that form divides by two twice and overstates V_f by √2 — unconservative.
- **Choice:** Martin's form with DN = 24 ε κ p₀/π (Bennett), t/c on the root chord.
- **Reverse:** `flutterSpeed()` in `calc/flutter.js`.

## D14 — 2026-10-25 — ε below 0.25 not credited
- **Choice:** ε = max(C_x/c_R − 0.25, 0.25). A forward centroid would raise V_f; Bennett only discusses ε ≥ 0.25.

## D15 — 2026-10-25 — Flutter verdict thresholds
- UNSAFE: SF < 1.2 (Bennett: margin < 20 % "potentially unsafe"; altimetercloud: < 1.2 "danger").
- MARGINAL: 1.2 ≤ SF < target. SAFE: SF ≥ target; target default 1.5 (altimetercloud minimum), 2.0 when the flight
  is supersonic (altimetercloud), user may raise it. Consequence: Bennett's chosen 3/16 in fin (SF 1.75 at Mach 1.4)
  is MARGINAL here — the stricter reading.

## D16 — 2026-10-25 — Flutter atmosphere stays Bennett's
- Bennett's standard atmosphere (its constants reproduce his worked example exactly), tied to the launch-site
  temperature by the same lapse line; not merged with `geophysics.atmosphere()` (Hoult's latitude-dependent model),
  which would shift his numbers by ~0.3 %. Two models exist for two sources.

## D17 — 2026-10-25 — Small shared additions inside the Fin Flutter branch
- `def.actions`, `def.externalRefs`, chart `area: 'above'`, LaTeX thin-space mapping were added in
  `feat/fin-flutter-calculator` as separate commits (opt-in, no change to other calculators), instead of separate
  shared branches, to avoid a 30-minute full test cycle per one-line feature. All suites re-run before merge.

## D18 — 2026-10-25 — Subsonic CP verdict uses the worst case, including no carry-over lift
- **Question:** which margin to judge — the nominal NACA 1307 one, or something more conservative?
- **Choice:** the minimum over Mach {0, M_max}, CG {launch, burnout}, and with/without the body carry-over lift.
  The carry-over is real lift in slender-body theory, but Barrowman's method uses the smaller 1 + r/(r + b); a design
  that only passes with it is relying on lift that the method most builders use does not count.
- **Cost:** stricter than the nominal margin (≈ 0.64 cal on the GR3 example). The nominal and no-carry margins are
  both shown as results.
- **Reverse:** `margins()` in `calculators/subsonic-cp.js` (drop the `carry` loop).

## D19 — 2026-10-25 — Static-margin thresholds are rules of thumb
- UNSAFE < 1 cal, MARGINAL 1 cal to target, SAFE ≥ target (default 1.5, slider 1–3). Common amateur practice; **no
  primary source read this session** — the docs table says so. > 4 cal gives an info note only.
- Adds a `none` verdict level (no CG entered yet) to the shared banner: neutral "i" badge.


## D20 — 2026-10-25 — Bare-minimum testing until the user calls the testing stage
- **Who:** the user, mid-cycle: keep only the bare-minimum tests for now; full testing starts at a later stage.
- **Choice:** per calculator, `npm test` plus a quick browser look. The plan's DoD items 6–8 (layout-stability sweep,
  diagram interaction, 320/768/1280 × SI/US) and the smoke / uifuzz / LaTeX sweeps are deferred, not dropped.
- **Subsonic CP cycle 1** was the last one run with the full set (all passed after the fixes in its CHANGELOG entry).
- **Reverse:** when the user starts the testing stage, run every suite over all calculators changed since this entry.

## D21 — 2026-10-25 — Nozzle verdict: separation margin 1.15
- **Choice:** SAFE when the attached exit pressure is ≥ 1.15 × the separation pressure at the exit Mach number (or in
  vacuum), MARGINAL from 1 to 1.15, UNSAFE when the wall separates inside, an inviscid shock sits inside, or C_F ≤ 0.
- **Why 1.15:** Schmucker (NASA TM-77396) shows criteria and averaged data differing by roughly 10 % (cold gas ~10 %
  lower than hot gas). **Not a published limit**: this project's choice, stated as such on the theory page.
- **Reverse:** `SAFE_MARGIN` in `calculators/nozzle-thrust.js`.

## D22 — 2026-10-25 — Nozzle: Schmucker's eq. (11) is the default separation criterion
- Summerfield's p_e < 0.4 p_a (the previous rule) is, per Schmucker, a guide for p_c/p_a ≈ 15–20 that decreases at
  higher ratios; eq. (11) fits chemical-engine data in terms of the wall Mach number. Summerfield and Kalt–Bendall
  stay selectable. Held at M = 5 (data limit); a warning flags separation predicted outside M 2–5.
- The choke limit was also corrected: from p* to the subsonic-exit pressure (the regime in between is a normal shock
  inside, now solved). BREAKING for designs with p* < p_a < p_sub, which used to be refused.

## D23 — 2026-10-25 — Nozzle geometry entered as diameters and lengths (user request)
- Inputs d_in, d_t, d_e, L_c, L_d replace ε, θc, α and L_f; those become results, solved by bisection with accepted
  ranges θc 10–80°, cone α 3–45°, bell 50–120 % of a 15° cone (outside: refused with the achievable lengths).
- BREAKING for saved links and designs of the previous version (the old fields are ignored; defaults are used).

## D24 — 2026-10-25 — No per-calculator tags; branches deleted on merge (owner's request)
- All 21 tags (per-calculator `<calc>/vX.Y.Z`, site `vX.Y.Z`, `baseline-pre-overhaul`) and 7 merged branches were
  deleted (all verified merged into `main`; the commits remain in its history). Releases are recorded in CHANGELOG.md
  with their PR and merge commit; PRs are merged with `--delete-branch`. Supersedes the tag scheme of the original plan.

