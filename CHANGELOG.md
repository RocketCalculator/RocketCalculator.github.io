# Changelog

Newest first, in the spirit of [Keep a Changelog](https://keepachangelog.com/). From 2026-10-25 every entry names its
branch, tag and commit range. Live site: https://darasamii.github.io/RocketCalculator/ (moving to
https://rocketcalculator.github.io/, see `BLOCKERS.md` B1).

## 2026-10-25 — RocketBackView (`shared/rocket-back-view`, tag `v1.3.0`)

### Added
- A to-scale rear view ("Viewed from behind") under every fin-count input: body, N fins with fin 1 marked, 360/N,
  span and body diameter, a one-line note on how N enters that calculator, and a warning for 0–2 fins or counts
  outside what its equations cover. In all seven fin-count calculators.
- `tests/backview.test.js`: every fin-count input must have a back view.

## 2026-10-25 — DiagramViewport (`shared/diagram-viewport`, tag `v1.2.0`)

### Added
- Every drawing sits in a fixed-size box that opens fitted; zoom (+ / − buttons, Ctrl/⌘+wheel, or wheel after
  clicking the drawing), pan by dragging or with two fingers, Reset view / double-click. Panning and zooming only move
  the view, they never recompute; the view stays put while inputs change. One finger on a phone scrolls the page.
- `npm run test:ui-diagrams`: diagram-interaction acceptance test (laptop and ×4-CPU phone profiles).
- `plots[].when(v)`: plots that only apply to some input choices are hidden for the others.

### Fixed
- Drawings no longer change height with the inputs (Ogive Nose moved the page by 136 px).
- Exports and the ⓘ close-ups use the whole drawing even when the view is zoomed.
- Layout test: 29 calculators × 320/768/1280 px × SI/US stable *including* the drawings.

## 2026-10-25 — Shared inputs/results layout and recompute pipeline (`shared/number-field`, tag `v1.1.0`)

### Changed
- Sliders and schematic handles recompute at most once per frame; key results and the drawing follow every frame,
  charts and the results table when the input pauses (and off-screen charts when scrolled to). At ×4 CPU: Subsonic
  CP 86 → 21 ms per drag step, Fin Flutter 50 → 18 ms, no long tasks.
- Results table with fixed value/unit columns (label on its own line on phones); key-result notes keep two lines;
  validation messages float under the input; plot cards keep their size when a plot has no data and say so;
  legends keep one row and a fixed height.

### Added
- `npm run test:ui-layout` (`scripts/ui-layout.mjs`): layout-stability acceptance test (sliders swept at 320/768/1280
  px in SI and US, extreme values typed into every field) — 0 failures with the drawings excluded; the drawings are
  fixed by `DiagramViewport`.
- `puppeteer-core` devDependency.

## 2026-10-25 — Hosting preparation (`chore/hosting-migration`)

### Added
- `site/404.html`: GitHub Pages serves it for any missing path. It picks its base path (`/RocketCalculator/` now, `/`
  after the move) so old or mistyped links lead back to the home page.
- `BLOCKERS.md`, `DECISIONS.md`, `PROGRESS.md`, `KNOWLEDGE.md`: run logs and the knowledge base for the overhaul.

### Changed
- README names the planned organization address; the aggressive-test location stub no longer uses the old path.

### Not done (blocked)
- The move itself (old `https://darasamii.github.io/RocketCalculator/` → new `https://rocketcalculator.github.io/`):
  the `RocketCalculator` organization does not exist and cannot be created from here (B1). Audit result: every asset
  and link is already relative, so nothing on the site breaks when it moves; browser storage (theme, units, saved
  designs) resets with the new origin.

## 2026-10-22

### New calculator: Trajectory Simulation (SKYAERO)
- Added: `calculators/skyaero-trajectory.html`. A two-degree-of-freedom point-mass flight of a one- to three-stage rocket from the rail to impact. It covers a thrust curve and Mach-dependent drag table per stage, the simulated launcher length (Hoult 1976), the Lewis wind response with the finite-inertia correction, and optional drogue and main parachutes, through the latitude-dependent atmosphere.
- Results: apogee, impact range, peak Mach, dynamic pressure and acceleration, rail exit speed and burnout conditions. Plots: trajectory, altitude, speed, thrust and drag, dynamic pressure and flight path angle. The drawing shows the flight profile by phase.
- Tests reproduce SKYAERO's M1939 impulse and Isp, its simulated launcher length and wind table, and Hoult's Table 1. They also check the rocket equation, ballistic apogee, two-stage velocity gains, step convergence and terminal speed under a parachute.
- Fixed relative to SKYAERO: the wind handling inside its Runge–Kutta loop, the upper-stage thrust time base, and the launcher-length fit beyond λL = 1.
- With this, every topic on the home page has a calculator.

### New calculator: Roll Lock-In
- Added: `calculators/roll-lock-in-design.html`. It sizes the fins for a required static margin and computes the roll moment the nose vortex pair induces on them (closed-form strip integral, four vortices). From these it finds the smallest angle of attack at which steady lunar lock-in is possible, and gives the probability of no lock-in from the thrust misalignment statistics.
- Plots: the lock-in conditions (paper Fig. 7), roll moment against roll angle (Fig. 6), the effect of fin count (Figs. 10–13) and of static margin (Fig. 8).
- Tests reproduce the "High Alfa Roll Lock-In" tool once its slips are fed back in: LOG base 10 in the chord formula, the vortex radius, and a stale C_Npα cell. The calculator uses consistent units; the tool's psi with "slug·in²" puts its pitch frequency low by √12.

### New calculator: Flight Path Angle Dispersions
- Added: `calculators/flight-path-dispersion.html`. It gives the one-sigma velocity tilt at burnout of a rolling rocket from thrust misalignment (resolved east and north as the rocket rolls) and gusts, and the equivalent launcher angle error to feed a trajectory run.
- Plots: tilt against altitude, the tilt seen from above, and the effects of roll wavelength (memo Fig. 3) and static margin. Tests reproduce the memo's Figs. 1 and 3 and the field tool's columns.
- The DISPERSION field tool's thrust step is L_A/m times too large and its gust factor uses λ_R for λ_G*. The calculator follows the memo; the test shows that putting both slips back reproduces the tool's λ_P table.

## 2026-10-21

### New calculator: Ground Handling Loads
- Added: `calculators/ground-handling.html`. It covers the support forces and the joint shear and bending moment (with a load factor) of a rocket carried at two points, and the aft rail-button pull when the crew lifts the nose past nozzle contact (memo eq. 6).
- The parts table sets the weight and CG. Plots: the button pull against nose lift (the memo's figure) and the bending moment along the carried body.
- The memo's joint moment is taken about the nose tip. The calculator takes moments about the cut and checks them against the aft piece. This is documented.
- New unit: bending moment (N·m, lbf·in).
- Tests: the UNBUTTON table for $K=1$–3 (241.8 lb at $K=2$), the statics, and the cut equilibrium from both sides.

### New calculator: Body Bending Modes
- Added: `calculators/body-bending.html`. It gives the first three free-free bending frequencies, the mode shapes and the fundamental's nodes for a body built from sections with linearly varying stiffness and weight. Method: Rayleigh–Ritz with the uniform-beam modes, Simpson integration, and a Cholesky + Jacobi eigen-solution.
- Drawing: the sections (height for weight, shade for stiffness) with the fundamental mode and its nodes. Plots: the mode shapes, and the input distributions.
- The field tool's mode-shape macro has a typo (`l13st` for `j13st`) that drops $-K_{13}$, so its shapes are wrong while its frequencies are right. The test reproduces the typo to prove this, and the docs page explains it.
- Tests: the Aries frequencies (257.6, 585.5, 1523.7 rad/s) and integrals within 0.2 %, exact eigenvectors, and a uniform beam returning its exact frequencies.

### New calculator: Payload Bay Venting
- Added: `calculators/payload-venting.html`. It integrates the payload-bay pressure along a trajectory table (memo eq. 9, RK4, step set by the venting time constant) and gives the largest pressure difference across the shell and when it happens.
- Vents are subsonic or choked, with Busemann's orifice-coefficient interpolation. The vent-exit pressure uses Kármán–Tsien below the critical Mach number and a table above it.
- Plots: the pressures during the climb, the difference against time, and the peak difference against vent hole size.
- The original field tool's vents can never choke (it compares the pressure ratio with the inverse sonic ratio); the calculator chokes at 1.893. This is documented.
- Tests: the field tool's bay and vent pressures matched step by step on its 0.01 s trajectory, its peak of 0.1437 psi at 5.14 s, the choking limit, the orifice interpolation and the supersonic table.

### New calculator: Optimum Nose Shape
- Added: `calculators/optimum-nose.html`. It compares cone, tangent-ogive, Von Kármán and superellipse noses of your length and radius by minimum pressure behind the shoulder and by critical Mach number, and finds the superellipse exponent with the smallest suction peak.
- Reuses the Nose Pressure Distribution solver. The optimum is a scan followed by a golden-section refinement of the kink where two suction peaks are equal.
- Results: the optimum exponent is about 1.75 at $L_n/D=3$ and 1.85 at 6. The original notes' 1.6 is slightly blunt-shouldered.
- Drawing: the profiles overlaid (radius exaggerated), with a draggable shoulder.
- Plots: pressure along the nose, minimum pressure against exponent, and critical Mach against fineness (Felkel's Figure 11).
- Nose Pressure Distribution: the source sum is about 6× faster ($q\sqrt q$ in place of `** 1.5`).
- Tests: Felkel's Table 1 (cone within 5 %, ogive within 3 %, $M_{cr}$ within 0.006, his optimum matched at $L_n/D=6$), the superellipse limits, local optimality, and random-input invariants.

### New calculator: Nose Pressure Distribution
- Added: `calculators/nose-pressure.html`. It computes subsonic surface pressure along any nose shape (shared with the other calculators, or a custom profile) and body, using Munk's line-source sum exactly as in the field tool's VBA. A wake from impulse–momentum and Bernoulli closes the body.
- Compressibility: the Kármán–Tsien correction, and the critical Mach number solved against the sonic $C_p^*$ (bracketed below the Kármán–Tsien singularity).
- Results: the minimum $C_p$ behind the shoulder (sought away from the blunt base, where the method is unreliable), the steepest adverse pressure gradient, and the nose axial-force coefficient from the memo's integral.
- Drawing: the body and near wake with radial pressure arrows (radius exaggerated, scale shown), and a draggable shoulder.
- Plots: $C_p$ along body and wake, the critical-Mach crossing, and standard nose shapes compared.
- The source sum is bounded at 1 200 stations because it is $O(n^2)$.
- Charts drop malformed points instead of failing. This was found by the UI fuzz at an extreme radius.
- Tests: every one of the field tool's 140 station radii and incompressible $C_p$ values, the wake diameter, the Kármán–Tsien and $C_p^*$ relations, a textbook critical Mach number, convergence to the exact line-source integral on a cone, and random-input invariants.

### New calculator: Tethered Balloon Wind Sensor
- Added: `calculators/tethered-pibal.html`. It gives the wind speed from the elevation angle of a tethered pilot balloon (force balance, eq. 1), corrected for tether sag and drag (eq. 5), with the balloon height and the north and east components.
- The gas weight comes from the fill pressure and temperature, and the air density at the balloon from the standard troposphere.
- Drawing: the tether line of sight and its sag, the balloon's lift and drag, the elevation angle and height, a draggable balloon, and a compass inset.
- Plots: elevation against wind speed (response curves for three balloon sizes), the correction against tether length, and the two bias terms against angle.
- Documented: the memo's worked example uses $V\sin\Theta$ in eq. (5), counting $\sin^2\Theta$ twice (0.0882 where the formula gives 0.127). The field tool's helium weight mixes pascals and cubic feet, roughly doubling it.
- Tests: both field-tool readings reproduced with its own weights, the memo example, the helium weight, components, and random-input invariants.

### New calculator: Launcher Rail Deflection
- Added: `calculators/launcher-deflection.html`. The launcher rail on a three-tube tower truss ($I=\pi Dt\,d^2/2$, or any $I$) is treated as a cantilever. The lateral load is the weight component plus $n_\sigma$ thrust misalignments.
- Results: the tip slope in pitch and yaw with the memo's dynamic factor of 2, the tip deflection, and the longest acceptable rail.
- Drawing: the inclined truss with the rocket at the tip, the bent rail (exaggerated), the load arrow and a draggable rail tip, plus the tower cross-section.
- Plots: tip slope against rail length (as in the memo), slope against elevation, and the longest rail against rocket weight.
- New unit: second moment of area (cm⁴, in⁴).
- Tests: the memo's Gold Rush II loads, its tip-angle plot (0.053° at 240 in and 0.21° at 480 in for QE 80°), $I$ against an exact parallel-axis sum, the beam integration, and random-input invariants.

### New calculator: Upper-Stage Divergence
- Added: `calculators/upper-stage-divergence.html`. It covers the static aeroelastic divergence of a flexible upper stage, $q_D=2EI/(SC_{NN\alpha}l^2)$ with $EI\approx E\pi R^3t$, or of a flexible joint, $q_D=1/(SC_{NN\alpha}Cx_j)$.
- Results: the divergence margin, the nose-load amplification $q_D/(q_D-q)$, and the longest safe stage $l_{max}$. An optional whole-rocket trim adds the angle-of-attack amplifications of memo eqs. (1) and (2), including loss of static stability.
- Drawing: the upper stage bending as a cantilever (exaggerated by the amplification), the nose load, and a dynamic-pressure gauge with a draggable $q$.
- Plots: amplification against $q/q_D$, $q_D$ against length, and the trim amplifications against $q$.
- New units: joint compliance (rad/(N·m), rad/(lbf·in)) and bending stiffness (N·m², lbf·in²).
- Tests: every $q_D$ and amplification cell of the field tool, eqs. (1) and (2) against a direct solution of the coupled equations, scalings, the joint formula, and random-input invariants.

### New calculator: Parachute Recovery
- Added: `calculators/parachute-recovery.html`. It covers a two-piece rocket under one parachute with optional reefing: descent time in closed form through the troposphere, wind drift, the descent speeds at deployment and disreef, the nose and aft-body landing speeds (memo eq. 7), and the reefing-line strength.
- The reefed drag comes from Knacke's data for flat circular canopies, digitised from the reefing memo.
- Drawing: the descent path with drift, the parachute reefed then open, and the landing sequence with the tether.
- Plots: descent speed against altitude, height against time, aft impact speed against tether length, and the reefing curve.
- The original field tool's density exponent omits $g$ (it uses $R=1716$ where $R/g$ is needed). The calculator uses the standard troposphere; for the tool's example the descent takes 257 s, not 334 s. This is documented.
- Tests: the field tool reproduced exactly with its own exponent, the 25 000 ft dart table, quadrature of the descent time, an ODE check of the landing formula, the memo's reefed descent speed, and random-input invariants.

### New calculator: Roll Rate History
- Added: `calculators/roll-rate-history.html`. Given the fin set and its cant, it gives the roll rate from launcher exit to burnout including roll inertia, the roll turns during boost, and the roll rate at apogee.
- Roll derivatives come from strip theory, shared with Fin Cant Angle, and the fin geometry is shared too.
- The memo's roll equation (constant-acceleration boost) is integrated with RK4, switching to an exponential step for very stiff cases. The memo's closed-form estimate $\lambda_{R0}/(1-J)$ is shown alongside. It is accurate for small $|J|$ but about 20 % high at $|J|=0.3$; the docs page explains this.
- Apogee: the memo's integral (7) has the closed form $p_A/p_B=\sqrt\pi\,\mathrm{erf}\sqrt a/(2\sqrt a)$, extended to a lagged burnout rate.
- Drawing: the boost to scale, with the roll drawn as a helix, burnout and apogee call-outs, and a rear view spinning at the burnout rate.
- Plots: roll rate during boost, roll wave number against time (as in the memo's Prospector-18D figure), roll turns, and the apogee ratio (the memo's Figure 1).
- Report symbol lists, all calculators: a subscript such as the $L$ in $C_{L\delta}$ is no longer taken for a symbol of its own, and a command such as $\delta$ right after a letter ($N\delta$) is now recognised.
- Tests: integration against an independent RK4, the closed form against quadrature and Figure 1, the apogee rate against an ODE solution, the error function, and random-input invariants.

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
