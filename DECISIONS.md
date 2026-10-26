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

## D25 — 2026-10-25 — Parachute verdict against the user's own limits
- The memos give no recommended landing speed or drift, so the user sets both (landing speed accepted, recovery-area
  radius). SAFE: V_aft ≤ V_T and drift ≤ 0.8 R_f; MARGINAL: up to 1.25 V_T / R_f; UNSAFE beyond. The 1.25 / 0.8 bands
  are this project's margin for wind and C_D uncertainty — not published limits (stated on the theory page).
- Coupled inputs degrade instead of refusing: a disreef height at or above the opening height means no reefed phase,
  with a warning.

## D26 — 2026-10-25 — Trajectory verdict against the user's own limits
- SKYAERO gives no pass/fail limits, so the user sets five: rail exit speed (rule of thumb 44 ft/s), liftoff T/W (rule
  of thumb 5), altitude ceiling, recovery-area radius, accepted landing speed. Bands: rail and T/W SAFE ≥ limit,
  MARGINAL ≥ 0.8·limit; apogee SAFE ≤ 0.9·ceiling, MARGINAL ≤ ceiling; landing speed as D25 (1.25); landing distance as
  D25 (0.8 R_f). No parachute is UNSAFE (ballistic). Project margins, not published limits (stated on the theory page).
- The rail exit speed judged is off the **physical** rail; the simulated (longer) rail only models weathercocking.
- Crossrange drift is an estimate (full crosswind after apogee, none before), not a 3-D simulation; labelled as such.
- The default example now has dual deploy (drogue + 12 ft main) so the page opens on a recoverable flight; SKYAERO's
  ballistic validation case stays as the second example.

## D27 — 2026-10-26 — One Nose Cone Design calculator; its verdict and its estimates
- Ogive Nose Profile, Nose Pressure Distribution and Optimum Nose Shape are merged into **Nose Cone Design**
  (`nose-cone`), at the owner's request: all three described the same part. Their pages and theory pages redirect to
  it; their physics modules and tests stay.
- Verdict: **marginal** (never unsafe) when the stagnation temperature exceeds the user's material limit — T₀ is an
  upper bound and transient heating is not modelled; **marginal** when the windward tip shock is detached or the
  flight is transonic (M_cr ≤ M < 1.1, no method). Otherwise safe.
- Supersonic pressure drag of curved noses uses the tangent-cone estimate (not checked against a source here;
  labelled ±20 %); cones are exact. Windward/leeward tip shocks at incidence use cones of θ_tip ± α (estimate).
- The tip half-angle is the cone through the tip and the profile at 2 % of the length (Haack and power noses have an
  infinite slope exactly at the tip).


## D28 — 2026-10-26 — Single wedge: exact section by shock–expansion theory; verdict on shock attachment
- Angle of attack added; each face solved exactly (oblique shock or Prandtl–Meyer expansion, NACA 1135 p. 624),
  Busemann and Ackeret shown for comparison. Base pressure is a user input (default 0, base drag excluded): no source
  for a fin-base pressure was read.
- Verdict: the windward face must keep an attached shock. SAFE with ≥ 2° to spare (δ + α ≤ θ_max − 2°), MARGINAL
  within 2° or with a subsonic leading edge, UNSAFE when detached. The 2° margin is this project's choice.

## D29 — 2026-10-26 — Payload venting verdict against the door (or the user's) allowable pressure difference
- Taped doors: Δp_allow = σL/A (Hoult 2011; Espinoza et al.), σ = 0.2 lbf/in by default (their recommended design
  value; measured failure ≈ 0.3). SAFE |Δp|max ≤ Δp_allow, MARGINAL ≤ 1.25 Δp_allow, UNSAFE beyond. The 1.25 band is
  this project's choice (the measured peel gives failure at 1.5×). Otherwise the user enters an allowable.

## D30 — 2026-10-26 — Subsonic CP verdict on the worst-case static margin
- Worst of launch/burnout CG, Mach 0/top Mach and with/without NACA 1307 carry-over lift. UNSAFE below the user's
  minimum (default 1 cal), MARGINAL below the target (default 1.5), SAFE above; > 4 cal flagged as strong
  weathercocking. Defaults are common amateur practice, not source limits. No root-chord fix (grown forward it moves
  fin area forward and hardly changes the margin).

## D31 — 2026-10-26 — Fin cant verdict on roll ÷ pitch frequency at burnout
- SAFE ≤ 30 %, MARGINAL ≤ 40 %, UNSAFE above: the Fin Setting Theory memo's "below 30–40 % of λ_P" read as bands. Turns
  (memo: at least 2–3) are shown as a warning on their card, not in the verdict.

## D32 — 2026-10-26 — Roll rate history verdict against the user's roll limits
- The memos give no roll limit; the user sets the highest roll in flight and at apogee. SAFE ≤ limit, MARGINAL ≤ 1.25×,
  UNSAFE beyond, on the worse of the two. The largest cant within the limits is exact (rates are linear in the cant).

## D33 — 2026-10-26 — Body bending verdict on the separation of the first bending frequency
- The user sets the highest excitation frequency and the separation wanted (default 3×). SAFE f₁ ≥ r·f_exc,
  MARGINAL 1.25·f_exc ≤ f₁ < r·f_exc, UNSAFE below (at or near resonance). Project choices, not published limits.

## D34 — 2026-10-26 — Launcher deflection verdict on the tip slope
- The user sets the allowed tip slope (default 0.1°, Hoult's chosen bound; CSULB used 0.05°). SAFE ≤ allowed,
  MARGINAL ≤ 1.25×, UNSAFE beyond. Not a published standard.

## D35 — 2026-10-26 — Wind compensation verdict on the launcher tilt
- The user sets the range's tilt limit (default 20° from vertical, a common safety-code value; check your range).
  SAFE θ_T ≤ θ_max, MARGINAL within it but extrapolated past the last zero-wind run, UNSAFE beyond. The reachable
  region is drawn as a circle of radius r(90° − θ_max) round the wind-only point (small-tilt, additive model).

## D36 — 2026-10-26 — slosh / pitch separation bands
Separation S = max(f1/fp, fp/f1). SAFE S ≥ r (user, default 2, range 1.3–10); MARGINAL 1.25 ≤ S < r; UNSAFE S < 1.25.
Same 1.25 inner band as D33. **Not a published limit**: the report gives no criterion. Fixes target r on
the side the slosh is now (above → narrower tank / lower pitch frequency / more acceleration).

## D37 — 2026-10-26 — measurement verdict bands (project choice, not published limits)
- REDO when max(P_Y/P_G, P_G/P_Y) < r_min (user-set, default 1.5). The memo only says "not close to unity" and shows
  1.155 as close; 1.5 leaves margin.
- CHECK when the uncertainty exceeds u_max (default 5 %), or |I_l/I − 1| exceeds the tolerance (default 3 %).
- GOOD otherwise. Words GOOD/CHECK/REDO instead of SAFE/MARGINAL/UNSAFE because the verdict judges a measurement,
  not a flight hardware margin (the page renderer supports `verdict.word`).
- Stopwatch default 0.2 s per run, tape 2 mm, scale 50 g: user judgements, stated as such in the info tabs.

## D38 — 2026-10-26 — verdict bands (project choices, not published limits)
- Final spin: SAFE when every combination of inertia (1 ± ε_I) and initial spin (1 ± ε_f) lands within the user's
  tolerance of the target; MARGINAL up to 2× the tolerance; UNSAFE ("misses the target") beyond.
- Wire: SAFE when breaking strength ≥ user safety factor × peak pull (default 2); MARGINAL between 1× and that;
  UNSAFE below 1 (the wire breaks). Peak pull = max of the unwinding peak and the release tension over the
  uncertainty corners. Neither source gives a safety factor.
- Defaults: tolerance ±6 rpm (Bush's flown requirement), ±2 % inertia and spin, breaking strength 400 lbf (a user
  value, no sourced cable data).
- A target at or above the initial spin is sized for 95 % of the initial spin (nearest buildable) with a warning.

## D39 — 2026-10-26 — Upper-stage divergence verdict on the margin q_D/q
- The user sets the margin to keep below divergence (default 2; the memo gives none). SAFE q_D/q ≥ n_D, MARGINAL
  1.25 ≤ q_D/q < n_D, UNSAFE below 1.25 (loads ×5) or when the bending makes the trimmed rocket unstable. Same 1.25
  inner band as D33/D36. Not a published limit.
