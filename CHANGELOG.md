# Changelog

Every commit adds an entry here, newest first. Live site: https://darasamii.github.io/RocketCalculator/

## 2026-10-21

### New calculator: Pitch-Yaw Wave Number
- Added: `calculators/pitch-yaw-wavenumber.html`. It gives the pitch/yaw wavelength $L=2\pi\sqrt{2I/(-\rho SdC_{M\alpha})}$, the wave number $\lambda_p$, and the natural frequency and period at any airspeed.
- $C_{M\alpha}$ is entered directly or comes from $C_{N\alpha}$ and the static margin (with sliders). The inertia is measured or estimated as a slender rod $m\ell^2/12$. The body radius and length are shared with the other calculators.
- Drawing: one wavelength with the attitude swinging nose-up and nose-down, and the rocket to scale with its CG and a draggable CP.
- Plots: wavelength against static margin, wavelength against altitude (standard atmosphere), and frequency against airspeed. Also a report and a documentation page.
- Tests: the memo's relations; a numerical integration of the pitch equation that recovers the period to $10^{-6}$; speed independence, $\rho^{-1/2}$ and $L\propto\ell$ scaling; and random-input invariants.

### New calculator: Wind Compensation
- Added: `calculators/wind-compensation.html`. It gives the launcher quadrant elevation and azimuth that cancel the wind drift and place the impact point at a desired azimuth and range.
- Inputs: the desired impact point, the in-plane and cross-plane wind drift of a vertical launch (from a trajectory simulation), and an editable table of zero-wind range against launcher QE.
- Method: the in-plane and cross-plane tilts are read from the table (linear interpolation, slope extrapolated past the last run, as in the field tool) and added as a small-angle vector.
- Key results: launcher QE, launcher azimuth, and the in-plane and cross-plane tilts.
- Drawing: a plan view with north up, range rings, the wind-only impact, the tilt correction and a draggable target, plus a side view of the launcher rail.
- Plots: the zero-wind runs with the look-up points, the tilts against desired range, and the launcher azimuth offset against desired range. Also a report and a documentation page.
- The launcher azimuth uses the presentation's signed formula $AZ_T=AZ+\tan^{-1}(\theta_C/\theta_I)$. The original field tool adds the off-axis angle whatever the sign of the cross-plane drift; the docs page explains this.
- Tests: the field example is reproduced exactly (QE 81.061°, off-axis angle 70.85°), along with extrapolation, a tilt back uprange and the zero-wind limit; there is also a random-input fuzz with invariants.

## 2026-10-20 (continued)

### Two-Stage Weight Allocation: rocket drawing and sliders
- New drawing: a two-stage rocket (nozzle, fins, interstage, payload bay and nose). Section lengths are proportional to mass. Each motor shows its propellant grain, sized by $1-\sigma$.
- A stage that the optimum leaves out is drawn as a dashed ghost. This also fixes the old drawing, which labelled the wrong stage as the one carrying everything.
- Sliders for the specific impulses (100–320 s) and the structural fractions (0.03–0.5).

### Nozzle Thrust Coefficient: new nozzle drawing
- Half-section drawing with wall thickness: the cut chamber, the convergent section with a rounded throat entry, and the diverging cone (throat and cone to scale).
- The gas is shaded by static pressure: the cone uses the Mach number of its local area ratio.
- Station labels: chamber ($p_c$, $\gamma$), throat ($M=1$, $p^*$), exit ($M_e$, $p_e$) and ambient ($p_a$ and the expansion state), with leaders that move apart when the throat is small.
- The plume flares when under-expanded and necks when over-expanded. When the jet separates, the drawing marks the point on the wall where $p=0.4\,p_a$.
- Dimensions $d_t$, $L_d$ and $d_e$ (with $\varepsilon$) sit in one row below the nozzle, outside the gas.

### Reliability Growth: sliders, smooth plots, clearer ladder
- Sliders for every bounded input: $D_0$, $p$, $d$ and $R^*$ in steps of 0.1/0.01/0.005, and the number of flight tests in whole flights.
- Plots are smooth curves (monotone cubic through the whole-flight values, shown as dots); the tests-needed plot shows the unrounded $T^*$ instead of a staircase.
- New plot: reliability of the first flight and after the tests against the chance a defect shows up, with a docs paragraph on why it dips.
- Ladder drawing: bracket over the test campaign, later flights outlined, the next flight's value inside its bar, target labelled in the margin, smooth defects curve and a legend.
- Framework: chart series options `smooth` and `dots`; sliders accept a `step` (snapped values). Design guide updated.

### New calculator: Two-Stage Weight Allocation
- Added: `calculators/two-stage-weights.html`, which gives the lightest two-stage rocket for a payload and a required
  ideal velocity, with the following:
  - the optimum payload ratios from Vertregt's Lagrange condition, with each stage's own specific impulse;
  - liftoff mass, loaded mass, propellant and structure of each stage, mass ratios and stage velocities;
  - the single-stage case when a second stage does not pay (with a warning), and the velocity limit of the stages;
  - the common average-impulse closed form for comparison;
  - plots of ideal velocity against the stage split and of liftoff mass against required velocity;
  - a drawing with areas proportional to mass, a report and a documentation page.
- The old "coming soon" topic URL `optimum-weight-allocation.html` redirects to the calculator.
- Tests: `tests/twostage.test.js` — the closed form against the tabulated example, the general solution against
  it and against brute force, λ = dΔV/d ln M₀₁, and the single-stage boundary. Also added to the aggressive suite.
### New calculator: Reliability Growth
- Added: `calculators/reliability-growth.html`, with the following:
  - the expected lethal latent defects left and the reliability of the next flight after a number of flight tests;
  - the number of flight tests that reaches a target reliability, and the failures to expect during the tests;
  - plots of reliability flight by flight (with the every-defect-fixed best case), of defects left and failures,
    and of the tests needed against the chance of fixing a defect;
  - a flight-by-flight reliability ladder in which dragging sets the target and the number of tests;
  - a report and a documentation page.
- The default design ($D_0=4$, $p=0.6$, $d=0.8$) follows the memo's plot and table; its text quotes $D_0=6$.
- The old Reliability topic page now redirects to the calculator.
- Tests: `tests/relgrowth.test.js` — reference table for 0–25 tests, the defect recursion, the target inversion
  and the expected-failure sum. Also added to the aggressive suite.
### New calculator: Nozzle Thrust Coefficient
- Added: `calculators/nozzle-thrust.html`, with the following for a conical de Laval nozzle:
  - exit Mach number and exit pressure from one-dimensional isentropic flow (NACA Report 1135);
  - one-dimensional thrust coefficient and the Malina-corrected value $C_F=\lambda C_{F,m}+(p_e-p_a)\varepsilon/p_c$;
  - thrust, vacuum values, the expansion ratio for $p_e=p_a$ and the separation limit $p_e<0.4\,p_a$;
  - plots against expansion ratio, ambient pressure and half angle;
  - a to-scale drawing of the cone in which dragging the exit lip changes the expansion ratio and half angle;
  - a report and a documentation page. The old Nozzles topic page now redirects to the calculator.
- The exit Mach number is solved exactly; the original 50-step iteration is 6 × 10⁻¹⁰ high, which changes $C_F$ by
  under 10⁻¹¹.
- Tests: `tests/nozzle.test.js` — the original example, NACA 1135 values, sonic and infinite-expansion limits,
  ideal expansion and the Malina factor. Also added to the aggressive suite.

### Home page: coming-soon topics shown again
- Restored the Available / Coming soon grid and filters. The three removed guidelines-only topics stay out.

### Removed guidelines-only topics: Igniters, Safety, Wiring Requirements
- Removed: the topic cards, "coming soon" pages and search entries for these three topics, which have nothing to calculate.
  Their old page URLs now redirect to the home page.
- Added: `SKIP_TOPICS` in `scripts/seed_registry.py` (written to `removed` in the registry) so they are not regenerated.
- The three PDFs (Enhanced Igniters, 2013 Safety Report, Wiring Rules) stay in the reference library.
- Tests (120) and the smoke test pass.

### New calculator: Propellant Sloshing; layout fixes
- Added: `calculators/propellant-slosh.html`, with the following:
  - the first three sloshing frequencies of liquid in an upright cylindrical tank under thrust;
  - the fill depth;
  - the equivalent slosh masses and pendulum length (NASA SP-106);
  - plots against fill depth;
  - an animated first-mode drawing in which dragging the free surface changes the propellant mass;
  - a report and a documentation page.
- The frequencies use the fill depth $h=M/(\rho\pi R^2)$ as in the report; the tabulated example puts the density
  where the mass belongs.
- Tests: `tests/slosh.test.js` — Bessel roots from Bessel's integral, limits, pendulum analogue, and the slosh-mass
  sum rule.
- Changed: warnings and notes appear in a fixed dock in the bottom corner, each one dismissible, so they no
  longer push the results and drawings down.
- Fixed: on key-result cards a long unit (e.g. kg m⁻³) wrapped onto a second line. Value and unit now stay on one
  line, and the number shrinks with the card.

### New calculator: Yo-Yo Despinner
- Added: `calculators/yo-yo-despin.html`, which gives the following for a two-mass yo-yo with radial release:
  - despin weights;
  - peak wire tensions in both phases;
  - release time;
  - spin and tension histories from integrating the equations of motion;
  - a design curve and a drawing of the involute and swing-out paths;
  - a report and a documentation page.
- The despin mass is the exact root of the momentum and energy balance at release; Fedor's closed form is shown
  alongside. The release tension comes from the exact release state; the worksheet's phase-2 estimate is about
  20 % lower.
- Added: a mass-per-length unit (g/m, lb/in).
- Tests: `tests/yoyo.test.js` — worksheet example, conservation laws, full two-phase simulation ending at the
  target spin, and tension continuity. Also added to the aggressive suite.

### New calculator: Single Wedge Airfoil
- Added: `calculators/single-wedge.html`, with the following:
  - the supersonic normal-force multiplier of a single-wedge fin section over a flat plate (cubic Busemann
    expansion), with the second-order and exact oblique-shock values alongside;
  - the wave-drag increment, on the fin area and on the rocket reference area;
  - the shock-detachment limit and the shock angle, with sweep handled through the normal Mach number;
  - three plots, a section drawing with the shocks, a report and a documentation page.
- The linear term of the multiplier uses β^(3/2), as the series derivative requires. The memo's tabulated example
  has β^(1/2).
- Fixed: redirect pages lacked an icon link (404 for favicon.ico).
- Tests: `tests/wedge.test.js` — reference columns, numerical derivative, C3 recovered from the exact shock, and
  NACA 1135 detachment limits. Also added to the aggressive suite.

### New calculator: Modified Newtonian Drag
- Added: `calculators/newtonian-drag.html`, with the following:
  - supersonic pressure (wave) drag of a hemispherical nose cap, a conical segment (pointed or frustum), a flat
    face and rounded fin leading edges, from Lees' modified Newtonian theory;
  - nose-cap and cone normal-force slopes and centres of pressure;
  - plots of drag against Mach number and of the stagnation pressure coefficient;
  - a four-panel drawing, a report, and a documentation page.
- The nose and fin results feed the drag build-up's wave-drag inputs. Body radius, fin count and fin thickness come
  from the shared rocket.
- The old "coming soon" topic URL redirects to the calculator (`generate_pages.mjs` writes these redirects).
- Tests: `tests/newtonian.test.js` — reference example from Mach 1 to 4, cap closed forms against direct
  integration, cone/frustum additivity, and continuity at Mach 1. Also added to the aggressive suite.

### Neutral documentation wording
- Changed: the documentation pages, home page and units switch no longer talk about workbooks, spreadsheets, cell
  names or a compatibility switch. Cell-name columns are gone, “Known differences” is now “Notes on the method”,
  and source files appear only in the reference lists.
- Fixed: the home-page colour key still described dark key-result cards.

### Aggressive tests and the bugs they found
- Tests: `tests/aggressive.test.js`, covering:
  - 1 500 random designs per calculator, checked against invariants;
  - every field at its limits;
  - unit round-trips;
  - report checks;
  - physical trends;
  - extreme chart ranges.
- Tests: `scripts/uifuzz.mjs`, a browser fuzz of every input, option, handle and report tab.
- Fixed — Ogive Nose: the page froze for very long noses with a small profile increment (the profile is now capped
  at 2 000 points).
- Fixed — Ogive Nose: wrong area and centroid for very slender noses. Floating-point cancellation is gone; the
  formulas are rewritten in an equivalent stable form.
- Fixed — Ogive Nose: `$\Deltax$` typo in the walk-through.
- Fixed — Drag: NaN when the boundary-layer trip is at the nose tip, or when the whole body is laminar.
- Fixed — Drag: negative power-on base drag when the nozzle is wider than the body (now clamped, with a warning).
- Added — Drag: a low-Reynolds-number warning.
- Fixed — Fin Flutter: NaN above about 120 000 ft. The pressure ratio now continues isothermally above the
  tropopause, and the report shows that step.
- Fixed — Fin Cant Angle: the helix parameter was missing at a roll rate of 0.
- Added — Subsonic CP: a refusal for a boat-tail too steep for the fin, and warnings for blunt noses, steep
  boat-tails and non-positive total $C_{N\alpha}$.
- Fixed — charts: a near-flat curve (span below float resolution) drew NaN paths or never-ending tick loops.
- Fixed — inputs: "1e309" (∞) and unparseable text in optional fields were accepted silently.
- Changed: impossible designs raise `InputError` (shown to the user, never logged as a console error).
- Changed — Atmosphere drawing: altitude ticks are round numbers in the displayed unit; the readout no longer
  covers the altitude line, and the tropopause label clears the handle.
- Changed: pages without shared dimensions hide the sharing switch.

### Shared rocket, design files, A/B comparison
- Added: **shared rocket**. Body radius, nose length and shape, overall length, fin count, chords, exposed semispan
  and thickness are entered once and fill every calculator that uses them. A chain mark shows the shared fields,
  and a switch turns sharing off. Fin Cant Angle converts its tip radius (R + span) automatically, and Subsonic CP
  keeps the fins on a shortened body.
- Added: **Save design / Open design**. One `.rocket.json` file holds the rocket name, the shared dimensions, and
  every calculator's inputs and baselines.
- Added: **Pin as baseline**. Key results and the results table show the change against the baseline, and plots
  overlay the baseline curves dashed in grey.
- Fixed: legend names that mix text and maths (e.g. "Flutter Mach $M_f$") rendered as one italic formula.
- Tests: `tests/design.test.js` (shared-key consistency, push/pull, limits, design-file validation).

### Export formats
- Data exports for every plot and the results table: CSV, TXT/TSV, XLSX (native writer, no library) and JSON.
- The Export menu is grouped as data | vector | image, with separator lines between the groups.
- The results card's CSV button is replaced by the Export menu.
- Tests for the CSV/TSV/XLSX writer (`tests/tabular.test.js`).

### d0c0691 — GitHub button, fins, home cards
- Added: GitHub button in the header (hidden on phones) and a GitHub link in the footer.
- Changed: home page cards no longer show how many references a topic has.
- Changed: one shared rear-view drawing (`finEndView`) for every calculator with a fin count. Fin Cant Angle now uses it,
  showing canted panels as chord × sin δ, with the spin and caption on two lines.

- Fixed: Fin Cant Angle — the roll-direction arrow drooped through the fins (SVG arc picked the wrong centre), and the
  "b = …" label collided with the rear view.

### 02fae4d — Footer fix, changelog

- Fixed: long grey band below the footer after scrolling to the bottom of a calculator page. KaTeX's hidden MathML copy
  (`position: absolute`) escaped the scrolling report preview and stretched the document; KaTeX and scrolling boxes
  are now positioned containers.
- Added: `CHANGELOG.md` (this file), updated with every commit.

## 2026-10-20

### 73c91a9 — Report procedure, slim footer
- Every report step now gives the formula, a sentence on what each symbol means, the values used, then the
  substitution and result.
- The inputs-and-constants table only lists rows that have a value.
- The drawing shows a joint line where the nose cone meets the body tube.
- Slim one-line footer.

### da820c4 — Nose shapes, rear fin view, design guide
- Nose-shape dropdown: tangent ogive, cone, Von Kármán, LV-Haack, elliptical, parabolic, power series, and custom profile.
- Rear view with the actual fin count in the drawings.
- Light key-result cards with a red left edge.
- `docs/DESIGN-GUIDE.md`.

### ca50519 — Declutter, vector export
- Explanations moved behind ⓘ drawers, with symbol lists and focused diagrams.
- True vector PDF and EPS export.
- Reports follow the SI/US switch, with a nomenclature section.

### 3235b97 — Redesign
- Vodafone-style visual design.
- KaTeX symbols and units throughout.
- Plot export (CSV/SVG/PNG/JPEG/PDF).
- Animation pause.
- Diagrams in the info drawers.
- Report export (Markdown/LaTeX).

### a74e618 — Release 1
- Seven calculators live: Ogive Nose, Atmosphere & Gravity, Bifilar Pendulum, Fin Flutter, Fin Cant Angle,
  Zero-Lift Drag, Subsonic Centre of Pressure.
- Mobile overflow fixes, smoke test, documentation.

### 163f396 … 5cde680 — Calculators and framework
- Site framework: shell, units, drawer, charts, schematics, form, home, references, and topic pages.
- One commit per calculator, each with tests against reference values.

### 6cfd6a0, 648558f — Build plan and assets
- Build plan, registry seed, cached reference values, and vendored KaTeX and Inter.
- Reference PDFs published.

## 2026-10-19

### 8ce00de — Archive
- rsandt.com reports archived with derived data, scripts, and the GitHub Pages scaffold.
