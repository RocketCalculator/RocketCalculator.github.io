# bifilar-pendulum — notes for the lead

## CHANGELOG entry

### Bifilar Pendulum Inertia — measurement verdict, error budget, rig drawn to scale
- **Verdict** GOOD / CHECK / REDO (custom `verdict.word`, same colours as SAFE / MARGINAL / UNSAFE) against **your limits**:
  least period ratio `r_min` (default 1.5), largest error `u_max` (5 %), cross-check tolerance (3 %). Solved fixes:
  wire distances that put P_Y/P_G exactly on `r_min` (closed form) with the re-timed P_Y, the fewest cycles to time
  (closed form), the largest distance error (closed form), the wire length the measured swing implies.
- **Uncertainty of I**: first-order propagation of independent errors (stopwatch error per run, distance error, scale
  error) through I = m x1 x2 P_Y²/P_G², with each measurement's share. Labelled as an addition, not from the memo.
- **Inputs** in set-up order: rocket as hung (mass, length shared, body radius shared, CG from nose) → rig → what you
  timed (periods + cycles timed) → how well you measure → your limits. All bounded with sliders.
- **Drawing**: front view to one scale (wires, rocket, CG, plumb bob, floor line), wire pulls as arrows ∝ tension,
  wires coloured by the separation verdict, dimensions x1, x2, x_cg, L, l; handles for x1, x2, l. Insets: yaw from
  above and swing from the nose, animated at their true periods (slowed if a period is under 1.2 s), so close
  periods are visibly in step.
- **Plots**: "Where to put the wires" (panels on wire spacing: both periods, resonance crossing and the r_min limits;
  error total/distances/timing against your target) and "Error budget: how many cycles to time" (each share vs N).
  Removed the I(P_Y) parabola.
- Verified: npm test, sweep, ui-layout 390/1280 SI/US, ui-diagrams, uifuzz, screenshots light/dark/phone.

## KNOWLEDGE section

**Source read**: C. P. Hoult, "Moment of Inertia Measurement with a Bifilar Pendulum", RS&T memo, 11 June 2009
(site/references/from-word/Bifilar Pendulum.pdf, 4 pp.). p. 1: set-up sketch (two equal wires, CG between them,
plumb bob, floor line; "measure many oscillations"). p. 2: the two modes, the trap, Galilean ω_G² = g/l. p. 3:
T1, T2, θ_i = x_i ψ/l, yaw torque mgψx1x2/l, ω_Y² = mgx1x2/(Il), I = m x1 x2 P_Y²/P_G², P_Y²/P_G² = k²/x1x2,
uniform rod 0.577 (wires at the ends) and 1.155 (half-way), "wires close to the CG".

**Worked example check**: the memo has no numerical example; tests reproduce its two rod ratios (0.577, 1.155) and
recover the rod inertia with both formulas.

**Errata**: none found. The memo writes "to close to unity" (typo for "too"). Its torque sum checks:
T1x1θ1 + T2x2θ2 = mgψ x1x2(x1+x2)/((x1+x2) l).

**Not from the memo (labelled as such)**: the uncertainty estimate (standard first-order error propagation), the
verdict bands, the wire-length cross-check tolerance.

**Left out (no source read)**: large-amplitude period correction; coupled two-mode analysis (memo declines it);
correlated CG-mark errors; repeatability across trials (would need a multi-trial table — possible later).

**Quality Gate**

| Item | Verdict | Why |
|---|---|---|
| Drawing: front view to scale + animated yaw/swing insets | REDESIGN (done) | was not to scale (wire compressed); now one scale, physics on it, both modes animated side by side |
| Plot "Mode separation vs wire spacing" | REDESIGN → "Where to put the wires" | adds the periods (crossing = resonance) and the error trade-off on the same spacing axis |
| Plot "Inertia vs measured yaw period" | REMOVE | a parabola; the number "1 % → 2 %" says it all |
| Plot "Error budget: how many cycles to time" | KEEP (new) | shows which measurement dominates and where the total meets the target |

## D-bifilar-pendulum — measurement verdict bands (project choice, not published limits)
- REDO when max(P_Y/P_G, P_G/P_Y) < r_min (user-set, default 1.5). The memo only says "not close to unity" and shows
  1.155 as close; 1.5 leaves margin.
- CHECK when the uncertainty exceeds u_max (default 5 %), or |I_l/I − 1| exceeds the tolerance (default 3 %).
- GOOD otherwise. Words GOOD/CHECK/REDO instead of SAFE/MARGINAL/UNSAFE because the verdict judges a measurement,
  not a flight hardware margin (the page renderer supports `verdict.word`).
- Stopwatch default 0.2 s per run, tape 2 mm, scale 50 g: user judgements, stated as such in the info tabs.

## Shared-change wishes
- `chart.js`: support `se.dash` (custom dash patterns) in single charts, as panels already do; the error-budget plot
  has five series and only solid/dashed to tell them apart.
- `chart.js`: markers in `spec.panels` (the "your rig" point is a vline for now).
- `scripts/sweep.mjs` hashes only `<path>` elements, so drawings built from `<line>`s read as "same".

## Screenshots
/tmp/claude-1000/-home-dara-Professional-projects-RocketCalculator/6a28ad79-4bca-4e7e-9399-c93345c08ae0/scratchpad/bif/
draw-light-0.png, draw-light-1.png, draw-light-2.png, draw-dark-0..2.png, verdict-*.png, plot-light-0.png,
plot-light-1.png, plot-dark-0.png (hover), plot-dark-1.png, desktop-full.png, phone.png
