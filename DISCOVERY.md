# State of the codebase — discovery report (2026-10-25)

Written before any calculator or UI change of the overhaul. Measurements were taken on the code at
`baseline-pre-overhaul` (44358b8) with headless Chromium 155, served locally; the probe scripts are described in §6–7
and become the Phase 0 acceptance tests.

## 1. File map and architecture

- **Static site, no build step.** Everything deployed is in `site/` (GitHub Actions publishes the folder as is).
  Vanilla ES modules, one CSS file (`site/css/site.css`, ~620 lines), KaTeX for maths, no framework.
- **Pages are generated** by `scripts/generate_pages.mjs` from `site/js/registry.json`, which
  `scripts/seed_registry.py` writes (areas → topics → calculators; references). Each calculator page
  `site/calculators/<slug>.html` only imports `js/calculators/<slug>.js` and calls `mountCalculator(def)`.
  Theory pages `site/docs/<slug>.html` are hand-written HTML. Topic slugs with one calculator get a redirect page.
- **Three layers per calculator**
  1. `site/js/calc/<name>.js` — pure physics in the source's native units, no DOM; unit-tested in `tests/`.
  2. `site/js/calculators/<slug>.js` — the *definition*: fields (with unit specs, limits, sliders, info),
     results, `compute(v)`, `plots[].build()`, `schematic(ctx, v, out)`, `report()`, references, examples.
  3. `site/js/calculator-page.js` — generic page: intro, design bar (shared rocket, design files, baseline),
     form (`ui/form.js`), key-result cards, schematic, plot grid (`ui/chart.js`), results table, report
     (`ui/report.js`), notice dock for warnings.
- **Shared UI modules:** `ui/chart.js` (own SVG line chart: ticks, monotone smoothing, hover, legend, export),
  `ui/svg.js` (schematic frame, dims, labels, draggable handles, `finEndView` rear view), `ui/form.js`,
  `ui/drawer.js` (ⓘ panels), `ui/export.js` + `ui/vector.js` (SVG/PNG/JPEG/PDF/EPS, CSV/XLSX/JSON without
  libraries), `ui/report.js` (Markdown/LaTeX/print report), `units.js` (SI/US, 40+ units), `math.js` (KaTeX + an
  SVG TeX-lite), `design.js` (shared rocket across calculators, `.rocket.json` files).
- **Tests:** `npm test` = `node --test tests/*.test.js` — 23 physics test files against Excel-cached workbook values,
  memo examples and analytic limits, plus `tests/aggressive.test.js` (every calculator: defaults/examples, 1500 random
  designs, every field at its limits, unit round trips, report cleanliness, trend checks). 281 tests pass.
  Browser checks (`scripts/smoke.mjs`, `scripts/uifuzz.mjs`) need `puppeteer-core` installed separately.
- **Duplicated code across calculators** (candidates for shared modules):
  - unit-spec presets re-declared in every definition (`const LEN = { dim: 'length', internal: 'in' }` …);
  - "value with unit" formatters (`F(x)`, `A(x)`, `Q(x, spec)`) re-written in ~15 definitions;
  - parameter sweeps for trade plots (loop, recompute, collect points) in ~40 plot builders;
  - input checks (`check()` functions) and repeated `InputError` text patterns;
  - the atmosphere: `calc/flutter.js` has its own pressure-ratio law next to `calc/geophysics.js`;
  - result *status* (ok/warn/err) exists as `status()` on a few results only; verdicts are not a concept yet.

## 2. Calculator inventory (29)

| Calculator | What it computes | Inputs | Key outputs | Source(s) cited | Tests |
|---|---|---|---|---|---|
| Subsonic Centre of Pressure | C_Nα and CP below critical Mach, Barrowman + body lift | 19 | CP, static margin, C_Nα | Barrowman equations & thesis; NACA hemisphere | subsonic-cp, nose-shapes, optnose |
| Zero-Lift Drag Coefficient | Component drag build-up, power on/off | 26 | C_D off/on, skin friction | Drag Coefficient rev 3.4; Newtonian; Ogive | drag |
| Atmosphere & Gravity | Site-temperature atmosphere, gravity, Earth radius | 4 | T, p, ρ, a | Geophysical Environment memo | geophysics |
| Ogive Nose Profile | Tangent-ogive geometry, area, centroid, mass | 5 | wetted area, centroid, ρ_ogive, mass | Ogive Nose; Drag Coefficient | ogive |
| Fin Flutter Margin | NACA TN-4197 flutter Mach and margin | 8 | margin, M_f, t for zero margin | FLUTTER MARGIN1.xls (cites an unrelated memo — flag) | flutter |
| Bifilar Pendulum Inertia | I from two pendulum periods | 8 | I, radius of gyration, period ratio | Bifilar Pendulum memo | bifilar |
| Fin Cant Angle & Roll Rate | Strip-theory roll derivatives, cant for target roll | 14 | cant δ, C_lδ, C_lp | Strip Theory rev 3; Boost Roll Rate | cant-angle, rollrate |
| Single Wedge Airfoil | Supersonic wedge lift multiplier, wave drag | 8 | multiplier, ΔC_D, max half-angle | Single Wedge memo | wedge |
| Yo-Yo Despinner | Despin weights, wire tensions, timing | 6 | weight, tensions, time | (none cited — flag) | yoyo |
| Propellant Sloshing | Slosh frequencies, slosh mass/pendulum | 4 | f₁…f₃ | NASA R-222 + errata | slosh |
| Reliability Growth | Reliability vs flight tests | 5 | R next flight, tests to target | Reliability Growth memo | relgrowth |
| Modified Newtonian Drag | Blunt-element supersonic wave drag | 16 | wave drag, C_p,max | Modified Newtonian rev 4 | newtonian |
| Nozzle Thrust Coefficient | 1-D isentropic C_F with Malina correction | 6 | C_F, thrust, M_e, p_e | (none cited — flag) | nozzle |
| Wind Compensation | Launcher QE/azimuth for a target impact point | 5 | QE, azimuth, tilts | Lewis; finite inertia; gust spectra | windcomp |
| Pitch-Yaw Wave Number | Pitch wavelength and frequency | 11 | λ, wave number, f | Pitch-Yaw Wave Number rev 3 | pitchwave |
| Roll Rate History | Boost roll rate, turns, apogee roll | 13 | p_b, turns, p_apogee | Boost / Apogee Roll Rate memos | rollrate |
| Parachute Recovery | Descent time, drift, landing speeds, reefing | 12 | descent time, drift, impact speeds | Dual Purpose Recovery rev 2; Reefing | recovery |
| Upper-Stage Divergence | Divergence q and load amplification | 15 | q_D, margin, amplification | Upper Stage Bending rev 3 | divergence |
| Launcher Rail Deflection | Rail tip slope at tip-off, longest rail | 14 | tip slopes, longest rail | Launcher Tipoff; New Launcher | launcher |
| Tethered Balloon Wind Sensor | Wind from tethered pibal lean | 13 | wind, height, bias | Pibal Bias rev 1 + CSULB reports | pibal |
| Nose Pressure Distribution | Subsonic Cp along nose/body, critical Mach | 11 | C_p,min, M_cr, gradient | Nose Pressure rev 4 + 2 memos | nosepressure |
| Optimum Nose Shape | Superellipse optimum vs cone/ogive/VK | 4 | n_opt, C_p,min, M_cr | Nose Profiles memos | optnose |
| Payload Bay Venting | Bay pressure lag through vents | 12 | max Δp, time, τ, vent area | Payload Venting rev 2 + 2 | vent |
| Body Bending Modes | Free-free bending frequencies (Rayleigh–Ritz) | 1 table | f₁…f₃, nodes | Longitudinal Body Bending | bending |
| Ground Handling Loads | Carried-rocket joint loads, rail-button pull | 9 | button pull, lift, joint moment | Ground Handling; Structural Design Loads | handling |
| Flight Path Angle Dispersions | Velocity tilt from misalignment + gusts | 15 | γ₀, γ, γ_D, γ_G | Flt Path Angl Dispersions; Thrust Misalignment | dispersion |
| Roll Lock-In | Vortex-induced roll moment, α*, P(no lock-in) | 21 | α*, P, σ_α | Hoult & Tran paper | lockin |
| Trajectory Simulation (SKYAERO) | 2-DOF point-mass flight, 1–3 stages | 42 | apogee, range, M_max, rail speed | SKYAERO manual; Hoult 1976 | trajectory |
| Two-Stage Weight Allocation | Optimum stage split (Vertregt) | 6 | liftoff mass, stage masses | Optimum Allocation rev 1 | twostage |

Every calculator has physics tests; every calculator is in the aggressive test. None has a UI-level test of layout.

## 3. Fin-count inventory (back-view rollout list)

| Calculator | Field | Range | Back view today |
|---|---|---|---|
| Subsonic CP (`subsonic-cp`) | `N` Number of fin panels | 1–8 | `finEndView` inside the schematic |
| Zero-Lift Drag (`drag-coefficient`) | `N` Number of fins | 1–12 | `finEndView` inside the schematic |
| Fin Cant Angle (`fin-cant-angle`) | `N` Number of fins | 1–12 | `finEndView` (with cant, spinning) |
| Roll Rate History (`roll-rate-history`) | `N` Number of fins | 1–12 | `finEndView` |
| Single Wedge (`single-wedge`) | `N` Number of fins | 1–12 | none |
| Modified Newtonian Drag (`newtonian-drag`) | `N` Number of fins | 1–12 | none |
| Roll Lock-In (`roll-lock-in-design`) | `N` Number of fins | 3–8 | cross-section with vortices (not next to the input) |

Fin Flutter has no fin count (the correlation is per panel); the new Fin Flutter will add one for the back view and
the per-fin notes. The existing `finEndView` is drawn inside the schematic, not next to the input, has no labels
for 360/N, span or diameter, and ignores the "Viewed from behind" convention — `RocketBackView` replaces it.

## 4. Diagram inventory and first-pass Quality Gate

All 116 diagrams are drawn by the project's own SVG code: 29 schematics (`ui/svg.js` helpers, one per calculator)
and 87 plots (`ui/chart.js`). No Plotly, Chart.js, D3 or canvas. Verdicts below are first-pass; each calculator's
cycle records the full five-question gate in KNOWLEDGE.md. Common findings: plots have labelled axes with units,
hover read-outs and legends; few show limit lines or a danger zone; schematics mostly redraw the inputs to scale
and some show a computed consequence (CP/CG, pressures, trajectory).

| Calculator | Diagram | Verdict (first pass) |
|---|---|---|
| Subsonic CP | Side view with CP and CG | KEEP — shows the static margin, the main answer |
| | CP vs Mach | KEEP |
| | C_Nα vs Mach | KEEP |
| | Normal-force build-up along the rocket | REDESIGN — add margin/limit context (where stability comes from) |
| Zero-Lift Drag | Where the drag comes from | KEEP — breakdown is the insight |
| | Drag build-up vs Mach | KEEP |
| | Body wetted area and transition | REDESIGN — mostly restates inputs; show transition point vs length |
| Atmosphere | Earth & atmosphere column | REDESIGN — decorative; show the queried altitude against layers |
| | Temperature / pressure–density / tropopause vs latitude / gravity vs latitude | KEEP (reference plots) |
| Ogive Nose | Side view to scale | KEEP (geometry is the output) |
| | Nose profile r(x) | REMOVE — duplicates the side view |
| | Wetted area from tip | KEEP |
| Fin Flutter | Fin planform and section | REDESIGN — show margin/verdict on the fin, add back view |
| | Flutter Mach vs altitude | REDESIGN — overlay flight profile, shade danger zone |
| | Margin vs thickness | REDESIGN — add target safety-factor line and minimum thickness |
| Bifilar | Rig + yaw motion | KEEP (explains measurement) |
| | Mode separation vs spacing; inertia vs period | KEEP |
| Fin Cant | Planform + rear view | KEEP — cant shown in the rear view |
| | Strip AoA; cant vs roll rate; cant vs cycles | KEEP |
| Single Wedge | Section normal to LE | KEEP (shock attachment) |
| | Multiplier; detachment limit; wave drag | KEEP |
| Yo-Yo | Weight path | KEEP |
| | Spin rate; tension; final spin vs weight | KEEP; tension needs wire-strength line |
| Slosh | Tank and first mode | KEEP |
| | Frequencies vs depth; slosh mass | KEEP |
| Reliability Growth | Reliability ladder | KEEP |
| | 4 plots | KEEP (target lines present) |
| Newtonian | Blunt elements | REDESIGN — "each to its own scale" weakens it; show contribution |
| | Wave drag vs Mach; C_p,max | KEEP |
| Nozzle | Nozzle section | KEEP |
| | C_F vs ε; thrust vs p_a; divergence loss | KEEP |
| Wind Compensation | Plan view | KEEP |
| | 3 plots | KEEP |
| Pitch-Yaw | One wavelength | KEEP |
| | 3 plots | KEEP; wavelength vs margin needs lock-in/resonance markers later |
| Roll Rate History | Spin from launcher to apogee | KEEP |
| | 4 plots | KEEP; roll rate should show pitch frequency crossing (resonance) |
| Parachute Recovery | Descent and landing | KEEP |
| | 4 plots | KEEP; add safe-landing-speed limits |
| Upper-Stage Divergence | Upper stage under load | KEEP |
| | 3 plots | KEEP (q_D lines present) |
| Launcher Deflection | Rail at tip-off | KEEP |
| | 3 plots | KEEP |
| Tethered Pibal | Balloon/tether/wind | KEEP |
| | 3 plots | KEEP |
| Nose Pressure | Surface pressures | KEEP |
| | 3 plots | KEEP |
| Optimum Nose | Profiles compared | KEEP |
| | 3 plots | KEEP |
| Payload Venting | Bay at worst Δp | KEEP |
| | 3 plots | KEEP; add shell allowable Δp line |
| Body Bending | Body + fundamental mode | KEEP |
| | Mode shapes; stiffness/weight | KEEP |
| Ground Handling | Carried + on rail | KEEP |
| | Button pull; bending moment | KEEP; add allowable load lines |
| Flight Path Dispersions | Rail + top view | KEEP |
| | 4 plots | KEEP |
| Roll Lock-In | Vortices over fins | KEEP |
| | 4 plots | KEEP (damping line present) |
| Trajectory | Flight profile | KEEP |
| | Trajectory | REMOVE — duplicates the flight-profile drawing |
| | Altitude; speed/Mach; thrust+drag; q; flight path angle | KEEP; speed plot needs flutter-speed overlay once linked |
| Two-Stage | Stage masses | KEEP |
| | 2 plots | KEEP |

## 5. Libraries and loading

- **KaTeX 0.16.11**, vendored in `site/vendor/katex` (596 KB incl. fonts), loaded on demand by `math.js`
  (`loadKatex()`), same origin. Current 0.16.x releases are newer but 0.16.11 has no known issue that affects us.
- **Inter** (5 weights, 24 KB each, woff2) vendored; the 400 weight is preloaded.
- No other libraries, no CDN, no analytics. Each calculator page loads its definition, its calc module and the
  shared UI modules (~150 KB unminified, many small requests). Nothing unused was found; no minification or
  bundling (acceptable for this size; HTTP/2 on Pages).
- `site/references/` holds 35 MB of PDFs, loaded only when opened.

## 6. Lag diagnosis (diagram dragging)

**Measured** (`dragprobe`: real mouse drag of the first schematic handle, 30 moves, long-task observer, rAF frame
times, mutation observer; CPU throttled ×4 to stand in for a mid-range phone):

| Calculator | ×1 CPU | ×4 CPU | long tasks (×4) | frame p95 (×4) | DOM mutations / 30 moves |
|---|---|---|---|---|---|
| Ogive Nose | 17 ms/move | 30 ms/move | 0 | 33 ms | 444 |
| Fin Flutter | 17 | 50 | 9 (max 60 ms) | 50 ms | 1263 |
| Subsonic CP | 22 | 86 | 30 (max 115 ms) | 100 ms | 1092 |
| Nose Pressure | 17 | 46 | 4 (max 58 ms) | 50 ms | 1577 |
| Atmosphere | 17 | 45 | 2 (max 57 ms) | 50 ms | 2014 |

Slider sweeps (`layoutprobe`, synchronous cost of one `input` event, desktop CPU): 5–20 ms typical, 28 ms
(Trajectory), 38 ms (Payload Venting), **99 ms (Roll Lock-In)**.

**Cause:** every pointer move of a handle calls `ctx.setValue` → `form.refresh()` + a **synchronous**
`recompute()`; sliders call `recompute()` directly (`{ fast: true }`). `recompute()` re-runs the physics, rebuilds
the **whole schematic layer** (`g.replaceChildren()` in every `schematic()`), rebuilds **every chart's SVG from
scratch** (`render()` → `svgHost.replaceChildren(svg)`), the key-result cards and the results table. The work is
not throttled to frames, so a phone does it several times per frame. SVG node count is *not* the issue (43–110
nodes per schematic); there is no pan/zoom code at all, so nothing else runs on drag.

**"Forced full zoom":** `.schem-host svg { width: 100%; height: auto }` with a fixed viewBox (≈760×330) means the
drawing is always scaled to the card width — enlarged on desktop, shrunk to ~0.43× on a 375 px phone (11.5 px labels
become ≈5 px) — and `touch-action: none` on the SVG blocks pinch-zoom and **page scrolling** when a finger starts on
the drawing. There is no zoom, reset or pan.

**Fix direction (Phase 0):** coalesce inputs to one recompute per animation frame; let charts update in place
(keep the SVG skeleton, replace paths) and skip hidden/off-screen charts; schematics keep their layers. Put every
diagram in `DiagramViewport` with fit-to-content initial view, explicit zoom/pan via viewBox, Reset, and
`touch-action: pan-y` until the user activates the diagram.

## 7. Layout-shift diagnosis

**Measured** (`layoutprobe`: bounding boxes of every input field, key-result card, schematic, plot card and
results-table cell, recorded while sweeping each visible slider through 11 positions; >1 px = shift).
Full output in the probe logs; summary:

| Width | Calculators with shifts | Largest shift |
|---|---|---|
| 1280 px | 21 of 24 with sliders | 136 px (Ogive Nose schematic height), 43 px (Trajectory results table) |
| 768 px | 11 | 480 px (Roll Lock-In results table), 123 px (Ogive Nose) |
| 375 px | 20 | 358 px (Roll Lock-In results table), 314 px (Newtonian Drag table) |

**Causes (CSS/markup):**
1. **Results table** (`.results-table`, `table-layout: auto`, `td.v { white-space: nowrap }`, label cell with
   wrapping): column widths follow the content, so a value gaining a digit moves every column; on phones the label
   column re-wraps and rows change height (the 300+ px shifts).
2. **Key-result cards** (`.key-results` = `repeat(auto-fit, minmax(190px, 1fr))`; `.kr-label` and `.kr-note`
   wrap freely): a note such as "at 5.77 s, 1014 m" that gains characters wraps to a second line, the row grows
   15–20 px and pushes the schematic, plots and table down (the uniform 20 px shifts on 768 px).
3. **Schematic height** (`width: 100%; height: auto` with a viewBox some schematics size from the inputs, e.g. Ogive
   Nose length/radius): the drawing's height follows the inputs → everything below moves (136 px).
4. **Inline validation messages** (`.field .err-msg`) and conditionally shown fields (`when`) insert rows inside the
   input column, moving the fields below (Launcher Deflection 20 px).
5. Values themselves use `tabular-nums` (good), but are formatted with a fixed number of *significant* digits, so
   their character count still changes (0.9 → 1.05 → 10.5) — no reserved width.

Warnings are already in a fixed dock and do not push content (good).

## 8. Correctness risks on first read (flags, not conclusions)

- **Fin Flutter:** uses the chord at 75 % semispan in t/c and the 39.3 constant (= 2 × 1.337 × 14.696 psi) from the
  FLUTTER MARGIN1 workbook; the Apogee newsletter uses the root chord. Its own pressure law duplicates the
  atmosphere. References list "Effects of Fin Static Aeroelasticity on Roll Rate" — not the flutter source.
- **Nose Pressure** (open review items): custom boat-tail profiles start the wake at the maximum radius rather than
  the base radius; C_Db > C_D not validated, wake radius not capped at the base radius; base index uses `Math.round`.
- **Payload Venting** (open review items): `lerp` crashes when only one table row is above the critical Mach; `worst`
  undefined when Δp never becomes non-zero; report step count uses the thinned history; inflow branch untested.
- **Trajectory:** drag tables held constant beyond their last Mach; atmosphere isothermal above the tropopause (no
  stratospheric warming layer); impact at launch-site elevation only.
- **Several calculators** take Mach number or speed as an input without linking to the trajectory (flutter,
  drag, wedge, Newtonian) — users may check the wrong flight condition.
- **Units:** a few definitions keep internal units in inches/psi while others use SI; conversions are tested by the
  aggressive suite, but derived quantities computed in definitions (e.g. `S = π(d/12)²/4`) are hand-converted.
- **Safety thresholds** (static margin limits, rail exit speed, landing speed, flutter safety factor) are mostly
  absent or informal text; no verdicts.
- Sources not cited: Yo-Yo Despinner, Nozzle Thrust Coefficient.

## 9. Order of work for Phase 2

Highest safety consequence first (a wrong answer could lose a rocket or hurt someone), then by how many users rely
on the calculator. Fin Flutter is Phase 1.

1. Subsonic Centre of Pressure — static stability, the most used calculator.
2. Parachute Recovery — landing speeds, drift.
3. Trajectory Simulation — max velocity, rail exit speed, q_max (feeds flutter, loads).
4. Launcher Rail Deflection — tip-off.
5. Ground Handling Loads — structural.
6. Upper-Stage Divergence — structural failure in flight.
7. Payload Venting — shell Δp (has open bugs).
8. Body Bending Modes — structural dynamics.
9. Zero-Lift Drag Coefficient — performance input to everything.
10. Pitch-Yaw Wave Number — stability dynamics.
11. Roll Lock-In · 12. Fin Cant Angle · 13. Roll Rate History — roll dynamics.
14. Nozzle Thrust Coefficient · 15. Two-Stage Weight Allocation.
16. Wind Compensation · 17. Flight Path Dispersions · 18. Tethered Pibal — range safety.
19. Nose Pressure (open bugs) · 20. Optimum Nose · 21. Ogive Nose · 22. Modified Newtonian · 23. Single Wedge.
24. Atmosphere & Gravity · 25. Bifilar Pendulum · 26. Yo-Yo Despinner · 27. Propellant Sloshing · 28. Reliability Growth.

## 10. Git state

- Default branch `main`; no other branches after the hosting merge; tag `baseline-pre-overhaul` (44358b8).
- History: 57 commits since 2026-10-19; until 2026-10-25 work was committed directly to `main` (the branch/PR
  workflow starts with `chore/hosting-migration`, merged as PR #1).
- Pages: GitHub Actions workflow `.github/workflows/pages.yml`, triggered by pushes touching `site/**`, publishes
  `site/`.
- `.gitignore`: existed (venv, locks, node_modules, the 91 MB deck); added editor/OS junk and browser-test output.
- Push access: yes (`gh` authenticated as DaraSamii with `repo` scope; PR #1 created and merged).

## 11. Hosting state

- Organization `RocketCalculator`: not created (B1). Repository still `DaraSamii/RocketCalculator`, site still
  `https://darasamii.github.io/RocketCalculator/`, Pages from Actions.
- No path in the site depends on `/RocketCalculator/` (except the intentional fallback in `404.html`).
- Remaining references to the retired address (to change after B1): `site/js/app.js` `REPO_URL`, `README.md`,
  `CHANGELOG.md` header, `docs/BRIEF.md`, `docs/OPUS_PROMPT.md`.
