# Knowledge base

Notes for anyone (human or AI) working on this repository. Read this, `PROGRESS.md`, `DECISIONS.md` and
`BLOCKERS.md` before starting work; update them when you finish. `docs/DESIGN-GUIDE.md` holds the UI rules.

## Hosting

| | |
|---|---|
| Organization | `RocketCalculator` |
| Repository | `RocketCalculator/RocketCalculator.github.io` (public) |
| Site | `https://rocketcalculator.github.io/` |
| Pages source | GitHub Actions (`.github/workflows/pages.yml`, uploads `site/`) |

- **Deploy:** push to `main` with changes under `site/**` (or run the workflow by hand). The workflow does a sparse
  checkout of `site/` and publishes it as is; there is no build step. `data/`, `derived/`, `source/` are never deployed.
- **Address independence:** every module resolves files with `url(path)` = `new URL(path, ROOT)` where
  `ROOT = new URL('../', import.meta.url)` (`site/js/util.js`); HTML pages use relative links; share links are
  `location.origin + location.pathname + '#s=…'`. Do not introduce root-absolute paths (`/css/...`) — they break the
  project-page address — or hard-coded hosts.
- **404:** `site/404.html` sets `<base href="/">` (the site is at the domain root).
- **Browser storage** (all `localStorage`, via `storage` in `util.js`): `rc-theme`, `rc-units`, `rc-rocket`,
  `rc-flash`, `rc-anim-paused`, `rc-home-status`, `rc-calc-<slug>` (last inputs), `rc-base-<slug>` (pinned baseline).
  Storage is per origin, so it did not carry over from the old address.
- **Retired after the move:** `https://darasamii.github.io/RocketCalculator/...` (Pages does not redirect project
  sites after a transfer; D4). The old repo URL redirects automatically as long as no new repo takes its name.
- **Migration status:** done 2026-10-25 (B1, B2 resolved). A private repo cannot serve Pages on the org's Free plan; keep it public.

## Project architecture and file map

See `DISCOVERY.md` §1 for the full map. In short: `site/js/calc/*.js` pure physics (tested in `tests/`),
`site/js/calculators/<slug>.js` the calculator definition, `site/js/calculator-page.js` the generic page,
`site/js/ui/*` shared UI, `scripts/` page generation and browser tests.

**Adding a calculator:** write `calc/<name>.js` and `tests/<name>.test.js`; write the definition
(`slug, topic, title, subtitle, intro, info, groups[].fields[], results[], compute(v) → { results, warnings },
plots[].build(v, out, { U }) [+ plots[].when(v)], schematic(ctx, v, out), symbols, report(v, out, R), references, examples`); add the
`CALCULATORS` line in `scripts/seed_registry.py`; run `python3 scripts/seed_registry.py && node
scripts/generate_pages.mjs`; write `site/docs/<slug>.html`; add REPAIR/INVARIANTS/trend entries in
`tests/aggressive.test.js`; run `npm test` and `npm run test:ui-layout -- --only <slug>`.

## Shared component reference

### Recompute pipeline (`calculator-page.js`)
- `requestRecompute()` — continuous input (sliders, schematic handles) recomputes **at most once per animation
  frame**. Key-result cards and the schematic follow every frame; the results table and the charts follow after the
  input pauses for 140 ms (`slowSoon`), and only charts within 300 px of the viewport (IntersectionObserver); the rest
  are drawn when they scroll into view.
- `recompute()` (no `live`) — typing (debounced 110 ms), buttons, unit/theme switch, load: everything, all charts.
- Never call `recompute()` from a pointer or slider handler directly.

### Two tiers, verdict and warnings (`calculator-page.js`, opt-in per definition)
- `def.verdict: true` reserves a fixed-height **verdict banner** above the key results; `compute()` returns
  `out.verdict = { level: 'safe' | 'marginal' | 'unsafe', title, text, fixes: [≤ 3 strings] }`. Rendered as icon + word
  (✓ SAFE / ! MARGINAL / ✕ UNSAFE) + colour — never colour alone — then a one-line summary and up to three fixes.
  Invalid inputs show "—".
- `def.tiers: true` → glance view = verdict, key results, the main plots, the drawing; then a closed **Explore**
  section with plots marked `explore: true`, the full results table and `def.limits` (assumptions and limits of
  validity, list of strings).
- Warnings: `{ level: 'err' | 'warn' | 'info', text, fix? }`, shown most severe first in the notice dock; `fix` is
  printed as "Fix: …". Thresholds and their sources belong in the definition's comments and docs page.

### DiagramViewport (`ui/viewport.js` → `diagramViewport(host, { label })`)
- Wraps every schematic (`calculator-page.js` creates it; definitions do not change). Returns
  `{ el, stage, attach(svg), reset(), zoomBy(f, px, py), withBase(fn), state() }`; the page calls `attach(svg)` after
  every `def.schematic()` redraw.
- **Fixed box:** the stage's `aspect-ratio` is set from the drawing's canvas (viewBox) the first time it is drawn and
  never changes; a canvas that changes size later is letterboxed (`preserveAspectRatio: meet`). This removed the
  136 px schematic-height shifts.
- **View:** opens fitted to the canvas (`svg.dataset.base`); zoom 1×–8×; pan/zoom only rewrite the viewBox inside
  `requestAnimationFrame`. The relative zoom and centre are kept across redraws (moving a slider never resets it).
- **Input:** wheel zooms only while the stage is active (clicked/focused) or with Ctrl/⌘; mouse drag pans when
  zoomed; touch: `touch-action: pan-y` on the drawing (one finger scrolls the page), two fingers pinch/pan;
  `.sc-handle` keeps `touch-action: none` (one-finger drag). Controls (− + Reset view) in a fixed 34 px bar below the
  stage; double-click and `0` reset; `+`/`−`, arrows when focused; Esc leaves.
- `withBase(fn)` runs `fn` with the fitted view — used by Export so a zoomed view still exports the whole drawing.
  The ⓘ drawer copy maps element boxes through `getScreenCTM()` and starts from `dataset.base`.
- **Plots** are deliberately *not* in a viewport: the Quality Gate found no plot that gains from pan/zoom; they are
  fixed-height, fit-to-box figures with hover read-outs.
- `plots[].when(v)` hides a plot that only applies to some input choices (like `fields[].when`); a plot whose
  `build` returns `null` for the current data keeps its card and says "Not available for these inputs".
- **Check:** `npm run test:ui-diagrams` (`scripts/ui-diagrams.mjs`), laptop (×1 CPU, 1280 px) and phone
  (×4 CPU, 375 px, touch) profiles: fitted on load, fixed box under a slider sweep, ≥5× zoom, mouse/two-finger pan
  with frame p95 ≤ 20 ms and no long tasks, view kept on input change, Reset/double-click return to fit, plain wheel
  scrolls the page, Ctrl+wheel zooms, touch-action values.

### RocketBackView (`ui/backview.js` → `rocketBackView()`, `finCountWarning()`)
- Every fin-count field declares `backView: (v) => ({ R, span, t?, Rin?, unit, nominal?, note, range })` (lengths
  in the calculator's internal unit given by `unit`; `nominal: { span | t: true }` for dimensions the calculator does
  not take, drawn nominal and labelled so; `note` = one line on how N enters this calculator's physics; `range` =
  the fin counts its equations cover). `ui/form.js` draws it under the field and redraws only when its inputs change.
- Drawing: body tube (and motor tube when `Rin`), N fins equally spaced, fin 1 at 12 o'clock in red, clockwise as
  seen from behind; body radius, span and thickness to one scale (thickness at least ~1 px, labelled when
  exaggerated); labels: 360/N, span, body ⌀, "1", "Viewed from behind".
- Fixed-size drawing and a fixed 4-line text box that shows the note, or the warning (`finCountWarning`): 0, 1, 2 fins
  (no / asymmetric / one-plane stability) and counts outside `range`; an invalid input shows a placeholder of the
  same size.
- **Check:** `tests/backview.test.js` asserts every fin-count field in every definition has a complete back view;
  the layout test covers its stability (extreme N and R included).
- **Rollout (Step 0 inventory, all done):** Subsonic CP [3–4], Zero-Lift Drag [1–12], Fin Cant Angle [3–8], Roll Rate
  History [3–8], Single Wedge [1–12], Modified Newtonian [1–12, span nominal], Roll Lock-In [3–8]. The new Fin
  Flutter adds the eighth.

### NumberField / SliderInput (`ui/form.js` → `numberField`)
- One grid row: label column `minmax(0, 1fr)`, control column `160px`; the unit sits in its own `min-width: 5ch`
  cell inside the control and never wraps (`white-space: nowrap`).
- Slider (`field.slider = { min, max, step }`) in its own full-width row; `step` snaps the value.
- Validation messages float under the control (`.err-msg`, absolutely positioned, `role="alert"`), so an error
  never moves the fields below.

### ResultValue (`calculator-page.js` → key-result cards `.kr` and results-table rows)
- **Central formatter:** `fmt(x, { digits })` in `util.js` (significant digits; scientific `×10ⁿ` beyond 1e7 or
  below 1e-4; at most 13 characters). Every displayed result goes through `toDisplay()` then `fmt()`.
  Invalid/pending values show "—".
- Key-result card: value + unit on one line (`nowrap`), value font scales with the card (`11cqi`); the note area
  always reserves two lines (clamped, full text in the tooltip) when the result defines a note.
- Results table: `table-layout: fixed`; value column `13ch + 32px`, unit column `8ch + 24px`; on phones each row is
  a grid with the label on its own line and the value/unit in fixed cells below.
- `scrollbar-gutter: stable` on the page and the inputs panel.

## UI performance and layout lessons

- **Lag cause (measured, DISCOVERY.md §6):** synchronous full recompute and rebuild of every chart on every
  pointer/slider event — not SVG node count. Fix: frame coalescing + deferred, visibility-gated charts. Result at ×4
  CPU: Subsonic CP 86 → 21 ms per drag step, Fin Flutter 50 → 18 ms (60 fps), no long tasks.
- **Layout-shift causes (DISCOVERY.md §7):** auto-layout table, wrapping card notes, input-dependent schematic
  height, validation rows. Each fixed as above; the diagram height is fixed by `DiagramViewport`.
- **Charts that change height:** a plot builder returning `null` used to hide its card (everything below jumped
  600–900 px); a legend that appears/disappears with the number of non-empty series, wraps when labels change, grows
  a horizontal scrollbar, or contains maths that changes the line height all moved the page. Now: `chart.empty()`
  keeps the card; the legend lists the defined series, stays on one row with fixed-height buttons, no scrollbar, and
  keeps its row once shown.
- **Test flakiness:** under parallel runs a page may still be drawing when the baseline is taken; the test waits
  until two snapshots 200 ms apart are identical.
- **Drawings:** the "forced full zoom" was `width: 100%; height: auto` (always scaled to the card) plus
  `touch-action: none` (no pinch, page scroll trapped on phones). DiagramViewport fixes both; pan/zoom never
  recomputes. Dragging a *handle* still redraws the drawing every frame (≈ 30 fps at ×4 CPU on Subsonic CP).
- **Fixed overlays cover controls:** the warning dock (bottom-right, fixed) can sit over a diagram's Reset button
  when that bar is near the bottom of the screen; the test scrolls the bar up first. Backlog: offset the dock or
  move controls when overlapped.
- **Lazy rendering trap:** a chart that has never rendered has no height, so lazily drawing it on first scroll moves
  the page. Every chart is drawn on a full recompute; only *updates* are deferred.
- **Check:** `npm run test:ui-layout` (scripts/ui-layout.mjs) — sweeps every slider at 320/768/1280 px in SI and US
  and types 0.001, 1e6, −1 and empty into every number field at 320 px; fails on > 1 px movement, a wrapped unit, or
  NaN/undefined/Infinity on screen. Needs `npm install` (puppeteer-core) and `CHROME=/path/to/chromium`.

## Per-calculator notes

### Fin Flutter (`fin-flutter`) — Phase 1 rebuild, branch `feat/fin-flutter-calculator`, tag `fin-flutter/v1.0.0`
- **Sources read this session:** Bennett, *Fin Flutter Analysis Revisited (Again)*, Apogee Peak of Flight 615 (2023),
  all 16 pages (equations from page images); altimetercloud.com fin-flutter page **and its `ffCalc()` code**.
  Martin, NACA TN 4197 (1958): **not read**, used through Bennett (Bennett's reference list misprints it "TN 4917").
- **Equation:** `V_f = a √(G / (DN A³/((t/c)³(A+2)) · (λ+1)/2 · p/p₀))`, `DN = 24 ε κ p₀/π`, t/c on the root chord,
  `ε = C_x/c_R − 0.25` from Bennett's trapezoid centroid with sweep length m, ε < 0.25 not credited.
- **Atmosphere:** Bennett's (T_F = T_SL − 0.00356 h, a = 49.03 √(T_F + 459.7), p = 14.696 (T_R/518.7)^5.256), lapse
  line through the launch-site temperature, isothermal above 36 089 ft. Kept in `calc/flutter.js` rather than
  `calc/geophysics.js` because Bennett's constants are the source's (D16).
- **Test cases (tests/flutter.test.js):** Bennett: C_x 4.49 in, ε 0.349, DN 54.88 psi, T −6.86 °F, a 1043.36 ft/s,
  p 7.2 psi, V_f 1425 / 1991.7 / 2618.1 ft/s for t = 1/8, 5/32, 3/16 in at 18 500 ft; hot day (his method) 1580.2 / 2077.
  altimetercloud: its code reproduced for three designs; ratio to Martin √(2/(A+2)) (symmetric fin). Hoult's
  FLUTTER MARGIN1 row 6 to 1e-12. Remedies reach the target exactly.
- **Found:** the plan's "commonly cited form" (1.337, extra ÷2) overstates V_f by √2 (Bennett) — unsafe, not used
  (D13). altimetercloud's code omits (A+2): ~12 % lower at A = 0.6. The previous version (Hoult workbook) used the
  75 %-span chord and DN = 39.3: optimistic for tapered/swept fins; its hot-day default was 92 °F.
- **Thresholds (D15):** UNSAFE SF < 1.2, MARGINAL to target, SAFE ≥ target (1.5; 2 when supersonic).
- **Shared code added in this branch (D17):** `def.actions` (buttons under the form), `def.externalRefs` (linked
  sources in Theory and the report), chart `area: 'above'` (danger zone), LaTeX export maps thin spaces.
- **Materials (2026-10-25):** OpenRocket's bulk materials with in-plane G from the owner's OpenRocket fork (core `Databases.java`, commit 54b78727d); woods, plywood, balsa and fibreglass match Bennett's values; listed as given, not independently checked.
- **Open questions:** Martin's original constants and the ε correction's derivation (needs TN 4197); a better G for
  composites; tip-to-tip ×2 allowance unverified.

### Subsonic CP (`subsonic-cp`) — Phase 2 cycle 1, branch `improve/subsonic-cp-cycle-1`, tag `subsonic-cp/v1.1.0`
- **Sources:** Hoult's *Barrowman Equations* and *Normal Force Acting on a Hemispherical Nose Tip* memos and the NACA
  1307 supplement, as extracted into the repo for the original build (`tests/subsonic-cp.test.js` compares the Gold
  Rush III cases to them). **Not re-read in this cycle**: the physics did not change, only the stability layer on top.
- **Hand checks added:** a pointed cone gives C_Nα = 2 with the CP at 2L/3; K_W(B) + K_B(W) = (1 + r/s)² (the
  slender-body total; stated from memory, not re-read this session) and exceeds Barrowman's 1 + r/(r + b).
- **Worst case (D18):** minimum margin over Mach {0, M_max} × CG {launch, burnout} × carry-over {with, without}.
  On the GR3 example the carry-over lift moves the CP ≈ 0.64 cal aft, so dropping it is the binding case.
- **Thresholds (D19):** UNSAFE < 1 cal, MARGINAL 1 to target, SAFE ≥ target (default 1.5). Rules of thumb, **not
  traced to a source**; labelled so in the docs. > 4 cal is an info note (weathercocking), not a verdict.
- **Remedies:** CG shift (SM_target − SM)·d is exact because d is fixed; fin span by bisection on the whole worst-case
  search (tip LE station held).
- **Open questions:** a sourced stability criterion (e.g. a NAR/Tripoli or NASA SL handbook figure); CP shift at angle
  of attack (viscous cross-flow), which the linear model omits.

### Nozzle Design and Thrust (`nozzle-thrust`) — Phase 2 cycle 1, branch `improve/nozzle-cycle-1`, tag `nozzle-thrust/v2.0.0`
- **Sources read this session (NTRS PDFs):** NACA Report 1135 (isentropic eqs.; normal shock eqs. 93, 96, 99 read from
  the page image, p. 619); Huzel & Huang NASA SP-125 2nd ed. §4.3 (eq. 4-7, 4-8, figs. 4-12, 4-13, 4-14 and the A-1
  worked example p. 98); Schmucker NASA TM-77396 (eqs. 7, 10, 11; fig. 25). Malina (1940) and Rao (1958) **not read**,
  used through Huzel & Huang.
- **Digitised charts:** fig. 4-14 (θn, θe by ε and L_f) and fig. 4-12 (bell λ) were read from a 500-dpi render with
  pixel tracing (scratch script; ±0.2° / ±0.05 %). Fig. 4-12's y-axis needed a −0.5 % offset, calibrated on the 15°
  cone = Malina 98.3 %. Check: the book's ε 14 / 80 % example gives θn 27.4°, θe 9.8°; the table gives 27.5°, 9.9°.
- **Model:** contour (1.5 r_t / 0.382 r_t throat arcs; cone or Bézier parabola) → quasi-1-D flow on it; regimes
  unchoked / shock inside (bisection on the shock area ratio) / over- / ideally / under-expanded; separation = first
  wall station with p_wall ≤ p_sep(M) (attached pressures, upstream of any inviscid shock). Thrust after separation
  = nozzle cut at the separation point (estimate).
- **Bug fixed:** the old version refused any p_a > p* (throat pressure); the real choke limit is the subsonic-exit
  pressure, higher (D22).
- **Test cases (tests/nozzle.test.js):** THRUSTCF R5 through the new definition; Huzel & Huang 128 in / 102.4 in /
  N (2.19, 12.99); NACA M1 = 2 → 0.5774 / 4.5 / 0.7209; Schmucker 0.374 at M 3; p_exit = p_a behind the shock and
  ρVA conserved at every station; ε_max and p_c,min restore the 1.15 margin exactly.
- **Cycle 2 (branch `improve/nozzle-cycle-2`):** geometry entered as d_in, d_t, d_e, L_c, L_d (angles solved by bisection, achievable ranges in the refusal message); flow profiles as a stacked-panel chart with hover (value + ratio to the throat value); chart labels use `$…$` (bare TeX in a name made the tooltip typeset whole phrases as maths); ε_max search no longer capped at 4ε; doc error fixed (static T does jump across a shock).
- **Cycle 3 (branch `fix/nozzle-cycle-3`):** found by a slider sweep in the browser: most geometry slider moves were *refused* (derived angle or bell length outside the accepted range), so the page kept the old drawing — "nothing changes". Now only impossible diameters are refused; unbuildable lengths are drawn at the nearest buildable length with a warning. A narrow inlet crashed the contour (1.5 r_t arc did not fit): the arc now shrinks to fit. Results rows that came and went with p_a moved the table: always shown with "—".
- **Open questions:** two-phase losses (sugar/aluminised motors); method-of-characteristics contour instead of the
  parabola; side-load magnitude after separation; a chamber-Mach threshold with a source (0.3 is a rule of thumb).

### Atmosphere & Gravity (`geophysics`) — cycle 1, branch `improve/geophysics-cycle-1`
- **Sources read this session:** U.S. Standard Atmosphere 1976 (NASA-TM-X-74335, NTRS scan): constants p. 3–4,
  table 4 (layers), eq. (5), table I rows at H = 1500, 11 000, 28 000 m′ (page images; no text layer). The NASA copy
  carries an erratum: table 2's R* (×10⁶), r₀ (×1000), S = 110.4 K (printed 110), σ; β is also printed 1.458 × 10⁶
  (must be 10⁻⁶ — gives μ₀ = 1.7894 × 10⁻⁵ Pa·s). M₀ = 28.9644 checked from table I (ρR*T/P).
- **Model:** Hoult's two-layer launch-site atmosphere unchanged (workbook tests); Sutherland viscosity (1976 constants)
  for Mach/q/Re. The 1976 standard comparison was built, verified (table I) and then removed at the owner's request
  (2026-10-25: "not meaningful" for users); it is in git history (merge 878f6d9) if wanted back.
- **Not done (no primary source read):** humidity (virtual temperature, saturation vapour pressure); WGS-84
  Somigliana gravity instead of Potsdam; winds.

### Parachute Recovery (`parachute-recovery`) — cycle 1, branch `improve/recovery-cycle-1`
- **Sources (repo library, read this session):** Hoult, *Dual Purpose Parachute Recovery System rev2* (2013) and
  *Parachute Reefing* (2013, after Knacke AD-A036 497). They give the descent and drift model, the aft-body slowing
  (eq. 7), reefed drag (Knacke data), the 0.2 reefing-ratio limit for small canopies and the reefing-line strength.
  They give **no** recommended landing speed, drift or opening-shock method (OSCALC not read) — hence D25.
- **Memo inconsistency:** table 3 lists a total descent time of 27.1 min for the example, but its own reefed sea-level
  speed (61 ft/s) gives ≈ 5 min; the closed form here matches direct integration and ONECHUTE (tests). Treated as a
  misprint.
- **Helpers (calc/recovery.js):** descentHistory, diameterFor (bisection), tetherFor (closed form), disreefFor
  (bisection); tests check each hits its target exactly.
- **Shared fix:** stale drag handles are hidden after each render (calculator-page.js).

### Diagram Quality Gate log

**Fin Flutter**
| Diagram | 1 Question it answers | 2 Better than a number? | 3 What the user does differently | 4 Shows the problem/change | 5 Scale | Verdict |
|---|---|---|---|---|---|---|
| Flutter speed through the flight (main) | Where in the flight am I closest to flutter, and by how much? | Yes — shows the whole envelope, the danger zone and the worst point at once | Sees whether the risk is at burnout or elsewhere; reads the required margin line | Worst point marked, danger zone shaded, target line | Axes with units | KEEP |
| Safety factor vs thickness (Explore) | How thick must the fins be? | Yes — shows how steeply SF rises (t^1.5) and where the target is crossed | Picks a stock thickness above t_req | t_req line, target and unsafe lines | Axes with units | KEEP |
| Safety factor vs semi-span (Explore) | How long may the fins be? | Yes — the trade between span (stability) and flutter | Trims span or accepts a thicker fin | b_max line, target line | Axes with units | KEEP |
| Fin planform and root section (drawing) | Is my geometry what I think, and what sets ε and t/c? | Partly — it shows the centroid/quarter-chord geometry behind ε, which numbers hide; coloured by verdict | Checks the sweep input; sees the fin's thinness to scale | Centroid, ε, t/c, SF on the drawing | Planform to scale; section thickness ≥ 1.5 px (labelled) | KEEP (redesigned: was 75 %-span section) |
| *Removed:* rear view and the fin-count / body-radius inputs | N and R did not enter the calculation, so the inputs only added a drawing that changed nothing | | | | | REMOVE (2026-10-25: a back view is required only for inputs that affect the result; the docs and report still say fin count does not enter) |
| *Removed:* "Margin of safety vs thickness" (old) | replaced by the SF plot with target lines | | | | | REMOVE → REDESIGN |
| *Removed:* "Flutter Mach vs altitude" (old, single horizontal flight-Mach line) | replaced by the flight-envelope plot | | | | | REDESIGN |

**Subsonic CP**
| Diagram | 1 Question it answers | 2 Better than a number? | 3 What the user does differently | 4 Shows the problem/change | 5 Scale | Verdict |
|---|---|---|---|---|---|---|
| Static margin through the flight (new main) | Is the rocket stable all the way from the rail to max Mach, at both CGs? | Yes — four cases and both thresholds at once; a single margin hides which case binds | Sees whether burnout CG or the carry-over assumption is the problem; moves CG or grows fins | Worst point marked and coloured by verdict; red unsafe line, orange target line; curves in ink/slate so red means only "unsafe" | Axes with units | KEEP (new) |
| Static margin against fin span (Explore, new) | How big must the fins be? | Yes — shows the diminishing return of span | Picks a span above the crossing | Target/unsafe lines, "your fins" marker | Span in display units | KEEP (new) |
| Side view with CP and CG | Where are CP and CG on my rocket? | Yes — the margin as a distance on the body | Checks geometry input; sees the CG burnout marker | Margin label coloured by verdict | To scale (radius exaggerated, labelled) | KEEP (end view removed: now the back view under N) |
| CP / C_Nα vs Mach, build-up (Explore) | How does each part contribute, and how does Mach move them? | Yes for the build-up; Mach plots are secondary | Finds which component dominates | Burnout CG vline on the build-up | Axes with units | KEEP, moved to Explore |

**Nozzle Design and Thrust**
| Diagram | 1 Question it answers | 2 Better than a number? | 3 What the user does differently | 4 Shows the problem/change | 5 Scale | Verdict |
|---|---|---|---|---|---|---|
| Nozzle and exhaust plume (drawing, above the flow box) | What does my nozzle look like, and what does the jet do after the exit? | Yes — the dimensions as a drawing (↔ for d_in, d_t, d_e, L_c, L_d; arcs for θc, α or θn/θe), the shell with wall thickness and flange, and the plume: bulging and shock cells when under-expanded, necking and oblique shocks (Mach disk when strongly over-expanded), a fan in vacuum, separation drawn inside | Drags the exit lip / inlet corner; sees over- or under-expansion at a glance | Separation circles, inviscid shock, plume regime label | Wall to scale; plume waves qualitative (labelled) | KEEP (cycle 4: restored at the user's request, with dimension arrows, angle arcs and wave pattern) |
| Nozzle and the flow along it (main; drawing panel + A, M, p, T, ρ panels, one x axis) | What does my nozzle look like, and what does the gas do along it? | Yes — the wall, the shock and the separation point line up with every flow quantity; hover gives values and ratios to the sonic values through the drawing too | Changes d_e, L_d or p_c until the separation line leaves the nozzle | Throat, shock and separation lines through all panels including the drawing | Drawing true to scale unless capped (axis label then says "radius not to scale") | KEEP (cycle 3: drawing and chart merged into one box at the user's request; the separate schematic and its drag handles were removed) |
| C_F against ε (main) | Which expansion ratio should I pick? | Yes — the optimum, the vacuum gain and the separation limit in one view | Picks ε left of the separation line, near p_e = p_a | Separation and p_e = p_a lines; design marker coloured by verdict | Axes | KEEP |
| Wall pressure against separation pressure (Explore) | Where exactly does the jet leave the wall, and with what margin? | Yes — the crossing is the separation point; the gap is the margin | Sees how much ε or p_c must change | Crossing, inviscid shock | Axes with units | KEEP (new) |
| Thrust against ambient pressure (Explore) | How does thrust change from launch to vacuum, and where does it separate? | Yes — regime boundaries along the climb | Checks the lowest firing altitude | p_e = p_a, separation, shock-at-exit lines | Axes with units | KEEP (redesigned with regimes) |
| Divergence efficiency against length (Explore) | Bell or cone, and how long? | Yes — Huzel & Huang fig. 4-12 for the user's ε | Chooses ~80 % bell or a 15° cone | Your nozzle marked | Axes | KEEP (replaces λ vs α) |

**Atmosphere & Gravity**
| Diagram | 1 Question | 2 Better than a number? | 3 What the user does | 4 Shows the problem | 5 Scale | Verdict |
|---|---|---|---|---|---|---|
| *Removed:* Your air against the standard day | owner's request | | | | | REMOVE
| Temperature profile (main) | What is the temperature at each altitude? | Yes, with the standard overlay and both tropopauses | Sees the local tropopause | Tropopause, launch site | Axes | KEEP (standard overlay added) |
| Dynamic pressure and Mach at your speed (new, Explore) | What loads would this speed give at each altitude? | Yes — q falls with altitude; marker shows Mach | Picks the max-q altitude for loads | Marker | Axes | KEEP |
| Ratios, tropopause vs latitude, gravity vs latitude | Context | Partly | — | — | Axes | KEEP, moved to Explore |

**Parachute Recovery**
| Diagram | 1 Question | 2 Better than a number? | 3 What the user does | 4 Shows the problem | 5 Scale | Verdict |
|---|---|---|---|---|---|---|
| Descent path and landing (drawing) | Where does it land, how long does it take, how hard does it land? | Yes — the path, time dots and the area edge show at a glance whether it lands inside | Drags the opening/disreef heights, wind or area edge | Landing point coloured by verdict; area shaded | Height and drift to one scale; landing inset not to scale (labelled) | REDESIGN done |
| The descent, second by second (main, panels) | How do height, speed and drift evolve? | Yes — the disreef step, speed against the limit, drift against the edge on one time axis | Moves disreef or reefing | Limit lines | Axes with units | KEEP (new; replaces the split speed-vs-altitude plot) |
| Choosing the parachute size (main, panels) | What diameter should I buy? | Yes — the trade-off between softness and drift | Picks a size between the crossings | Limit lines, current size | Axes | KEEP (new) |
| Drift vs disreef height, tether, reefed drag (Explore) | Secondary trade-offs | Yes | Tunes disreef / tether | Limit lines | Axes | KEEP |
| *Removed:* descent speed vs altitude, height vs time | replaced by the panel plot | | | | | REMOVE |

## Lessons learned

### After Nozzle (Phase 2)
- **Sweep every slider in the browser and check that the drawing changes and nothing is refused** (scratch `sweep.mjs`): unit tests passed while most of the input space was refused. Coupled inputs must degrade gracefully (clamp + warn), not refuse.
- **Chart labels: wrap maths in `$…$`.** A label with bare TeX and words (`'Expansion ratio \\varepsilon'`) is typeset whole as maths in the tooltip — no spaces, italic.
- **Let users enter what they would measure or machine** (diameters, lengths), and derive the angles; give the achievable range when a value cannot be built.
- **Digitise charts from a high-resolution render with pixel tracing, then calibrate on a known point** (here Malina 98.3 %) — a visual read was off by 0.5 %.
- **Re-derive regime limits from the source**: the old choke check (p_a < p*) was a textbook slip that refused valid designs.
- **A shared-x strip figure inside the drawing** beats stacking separate charts when the x is a physical position on the drawing.

### After Fin Flutter (Phase 1)
- **Check the source's constants against the most recent correction:** the widely copied 1.337 form is wrong by √2.
  Read every equation image, not just the text layer (pdftotext dropped all equations).
- **When a cross-check tool can't be queried, read its code** — altimetercloud's page text showed three different
  formulas; its JavaScript showed which one runs.
- **Verdict thresholds come from the sources, with the source named in the docs table**; when two sources differ,
  take the stricter bound for SAFE and the agreed bound for UNSAFE.
- **Remedies:** exploit exact power laws (t^1.5, √G) before bisecting.
- **Checklist for the next calculator:** (1) list every equation from page images; (2) hand-compute the source's worked
  example and put every printed intermediate in a test; (3) look for later corrections/errata; (4) define verdict
  thresholds with sources; (5) remedies for the 2–3 inputs a builder can change; (6) Quality Gate table; (7) limits
  list; (8) layout, diagram, LaTeX, smoke tests.
