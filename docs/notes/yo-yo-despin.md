# Yo-Yo Despinner — notes for the lead (improve/yo-yo-despin-2)

## CHANGELOG entry (ready to paste)

### Yo-Yo Despinner — verdict, checking mode, uncertainty and an animated end view
- **Verdict** (SAFE / MARGINAL / UNSAFE) on two things the builder cares about: the final spin against a user target ±
  tolerance, evaluated at the worst combination of the roll-inertia and initial-spin uncertainties (new inputs, ± %),
  and the peak wire pull (either phase, at the fast end of the spin uncertainty) against the wire's breaking strength
  and a user safety factor. Bands are project choices (D-yo-yo-despin).
- **Solved fixes**: the weight each that hits the target (closed form), the wire length that makes your weights hit it
  (bisection, wire mass following the length), the inertia or spin uncertainty that brings the spread inside the
  tolerance (bisection), the breaking strength needed (closed form), and the lightest wire when the bare wires already
  overshoot. Tests check each lands on its target.
- **Checking mode**: "Check weights I have" takes the weighed mass of each weight and gives the spin it leaves
  (inverse of the release quadratic), including spin reversal for weights that are too heavy.
- **Never refuses** coupled inputs any more: a target at or above the initial spin is sized for 95 % of it with a
  warning; wires heavier than the despin mass give zero weights, the spin they leave, and a lighter-wire fix.
- **Inputs** grouped in fill order (vehicle and spin → yo-yo and wires → your limits), every one bounded with a slider and
  a three-paragraph info tab; spin entered and shown in rpm.
- **Drawing**: to-scale end view in a fixed (non-spinning) frame — both weights spiralling out while unwinding (dashed),
  swinging out (red) and flying off after release (dotted, with the release speed), the wires at release coloured by the
  wire verdict, chained a / l / R dimensions, wraps count, a time-scaled SMIL animation (≤ 0.5 rev/s on screen, "shown
  N× slower", pause/play, off under reduced motion) with the wire thickening with its pull; handles for the wire length
  (drag the released weight) and the drum radius.
- **Plots**: "Spin and wire pull through the despin" (stacked panels on one time axis, target ± tolerance and breaking
  strength / ÷ safety factor as limit lines); "Choosing the weights" (final spin against weight mass at nominal and
  ±inertia, target band, your weights); Explore: "Wire length trade-off" (weight needed and peak pull against wire
  length).
- **Physics**: phase-2 integration now takes smaller steps when the motion is fast or stiff (very heavy weights on a light
  vehicle); a warning appears when the time history is only approximate. Sources read: Fedor NASA TN D-1676 and Bush
  1967 (both NTRS); release equations, wire force and the one-third wire-mass rule cited with page numbers.
- Verified: npm test (all), slider sweep, ui-layout 390/1280 SI/US, ui-diagrams, uifuzz, screenshots.

## KNOWLEDGE section (ready to paste)

### Yo-Yo Despinner
**Sources read**
- J. V. Fedor, *Analytical Theory of the Stretch Yo-Yo for De-Spin of Satellites*, NASA TN D-1676, 1963 (NTRS
  19630004528). p. 1 (PDF p. 5): a rigid yo-yo turns a percentage error in initial spin into the same percentage error
  in final spin. p. 6 (PDF p. 10), Eqs. 17–20: momentum at release `(I/m)φ̇₂ + (l+a)(aφ̇₂ + lγ̇) = const`, energy, and
  the release force `kδ = (m/2)(aφ̇₂² + lγ̇²)` — with δ = 0 these are exactly the calculator's release equations and its
  T₂ (test reproduces Eq. 20). p. 7 (PDF p. 11), Eq. 25: with δ = 0 and λ² ≈ I/m it reduces to
  `m = (1−r)I/[(1+r)(l+a)²]` (drops the −a² term the worksheet keeps). p. 10 (PDF p. 14): one third of the wire mass
  counts in the spin mass (citing TN D-708; "full scale tests have verified").
- K. S. Bush, *Yo-Yo Despin Mechanisms*, 2nd Aerospace Mechanisms Symposium, NASA Langley, 1967 (NTRS 19680018324).
  pp. 4–5: flown single-stage system, 3.83 slug·ft², 84 g each (incl. fittings), 10 in drum, 15.71 ft cable (three
  complete wraps), 270 rpm → 0 ± 6 rpm; a complete despin is insensitive to the initial spin; two-stage and stretch
  yo-yos reduce the error (not modelled).
- RS&T worksheet YO-YO DSP (existing tests, cached cells).
- Fedor TN D-708 (1961) is **not on NTRS and was not read**; it is cited only through D-1676 and the worksheet and the
  page says so.

**Worked-example checks**
- Worksheet cells Q5, R5, T5, U5, W5 reproduced (existing); sized weight equals R5/2 within 0.2 % (exact root vs Fedor's form).
- D-1676 Eq. 20 reproduced exactly with the rigid release state.
- Bush flown system: geometry is exactly three wraps; the massless-cable model asks for 102 g per weight against the
  flown 84 g. The cable mass is not given; a cable of about 11 g/m (an **assumption**, used in the page's second
  example) closes the gap through the one-third rule. Recorded as a plausibility check only, not a verification.

**Errata / notes**
- Fedor's Eq. 25 for the rigid limit drops the −a² term; the worksheet keeps it; the calculator solves the quadratic
  exactly (differences < 0.1 % for usual designs).
- In sizing mode with a fixed target, the whole time history is invariant to the roll inertia (m ∝ I keeps c and r
  fixed), so the drawing's paths do not change with I — only the weights and the loads. The weight markers are sized
  by mass so the drawing still responds.
- Very heavy weights (m a² ≳ 20 I) make the swing-out stiff; the integrator now caps its step and the page warns when
  the integrated final spin disagrees with the exact one by > 0.5 %.

**Quality Gate**
| Item | Verdict | Why |
|---|---|---|
| Drawing: end view, fixed frame, animated | REDESIGN (done) | was body-frame paths only; now shows the spiral, swing-out, release and fly-off with dimensions, wire verdict colour, loads (wire thickness), handles |
| Spin and wire pull through the despin (panels) | REDESIGN (done) | merged two separate plots onto one time axis with target and strength limit lines |
| Choosing the weights (final spin vs weight) | KEEP (improved) | trade-off with the target band, inertia uncertainty curves and your weights |
| Wire length trade-off (Explore) | NEW | shows that longer wires need far lighter weights while the pull changes much less |

## D-yo-yo-despin — verdict bands (project choices, not published limits)
- Final spin: SAFE when every combination of inertia (1 ± ε_I) and initial spin (1 ± ε_f) lands within the user's
  tolerance of the target; MARGINAL up to 2× the tolerance; UNSAFE ("misses the target") beyond.
- Wire: SAFE when breaking strength ≥ user safety factor × peak pull (default 2); MARGINAL between 1× and that;
  UNSAFE below 1 (the wire breaks). Peak pull = max of the unwinding peak and the release tension over the
  uncertainty corners. Neither source gives a safety factor.
- Defaults: tolerance ±6 rpm (Bush's flown requirement), ±2 % inertia and spin, breaking strength 400 lbf (a user
  value, no sourced cable data).
- A target at or above the initial spin is sized for 95 % of the initial spin (nearest buildable) with a warning.

## Shared-change wishes
- Add Fedor TN D-1676 and Bush 1967 to `site/references/references.json` (with PDFs) so they can be listed with
  "Go to reference"; for now they are in `externalRefs`.
- `scripts/sweep.mjs` only hashes `<path>` elements; a design input that changes only circles/lines/text reads "same".
- Single charts support only `dashed: true`, not `dash` patterns like panels do.
- Panels have no `markers`; a "your design" dot on a panel would help trade-off panels.

## Screenshots
`/tmp/claude-1000/-home-dara-Professional-projects-RocketCalculator/6a28ad79-4bca-4e7e-9399-c93345c08ae0/scratchpad/shots/`:
ex1-outputs.png, ex1-drawing.png, ex1-plot0.png (panels with hover), ex1-plot1.png (weights trade-off with hover),
ex1-plot2.png (Explore), anim-drawing.png and anim2-drawing.png (mid-animation and after release), ex2-outputs.png /
ex2d-drawing.png (Bush example, dark, US units), ex3phone-outputs.png (390 px).
