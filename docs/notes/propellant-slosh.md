# propellant-slosh — notes for the lead (wave 2)

## CHANGELOG entry (ready to paste)

### Propellant Sloshing — separation verdict, equivalent pendulum with its hinge, drain plot
- **Verdict** (new): the first slosh frequency against the rocket's pitch frequency, SAFE / MARGINAL / UNSAFE on the
  separation S = max(f1/fp, fp/f1) (bands D-propellant-slosh, not a published limit). Up to three **solved** fixes on
  the side the slosh is now: tank inside diameter at the same propellant mass (bisection), the pitch frequency
  (closed form), the thrust acceleration (closed form, f ∝ √a at fixed depth). Tests check each fix hits its target.
- **Inputs** re-grouped in fill order: tank (inside **diameter**, inside length, density, propellant now) → flight
  (thrust acceleration) → rocket pitch motion (pitch frequency + "Fill from the Pitch-Yaw Wave Number") → your
  limits (separation). Every input bounded with a slider and a three-paragraph info tab. The radius input became the
  measured inside diameter. More propellant than the tank holds is no longer possible silently: shown full with a
  warning and the fix.
- **Equivalent pendulum** now has its **hinge depth** (and bob depth), derived from the poles/residues of the report's
  own transfer functions (eq. 5-49 ÷ eq. 5-47); the slosh mass is now attributed to the residue of eq. 5-47 (identical
  to the formula used before). The NASA SP-106 citation was removed (not read for this page).
- **Drawing**: tank and pendulum to scale; the first-mode surface rocks (animated, Bessel shape) with the pendulum
  swinging beside it in step about its true hinge; red bands inside the tank mark the liquid levels where the slosh is
  within 25 % of / closer than wanted to the pitch frequency; the crossing level f1 = fp; log frequency strip with
  f1–f3 against fp; the surface shapes of modes 1–3 with the share of liquid in each; handles for surface (mass), tank
  top (length) and bottom corner (diameter); D, h, L_t dimensioned.
- **Plots**: "Slosh frequencies and slosh mass as the tank drains" (stacked panels on depth, framed to ~2 diameters),
  "First slosh frequency against tank diameter (same propellant)" (trade-off with your tank and the fix);
  Explore: "First slosh frequency over the drain at several accelerations".
- Key cards 3 (f1, f1/fp, m1) with status; new results: separation ratio, hinge, bob depth, crossing depth, deep-fill
  frequency, diameter and pitch-frequency for the separation.
- Theory page: new sections `pendulum` and `verdict`; `model` now quotes eq. 5-47.

## KNOWLEDGE section

### Sources read
- C. P. Hoult, *An Analysis of the Motion of Liquids in a Partially-Filled Enclosure* (MIT IL R-222),
  `site/references/original/…Partially-Filled Enclosure.pdf`, read from page images: Fig. 1 p. 20 (geometry: origin
  h above the free surface, depth m/(πρa²)); eqs. 5-30…5-38 pp. 25–27 (potential, constants, poles
  s² cosh + a_t (λ/a) sinh); eqs. 5-42, 5-43 pp. 29–30 (side force); eqs. 5-44…5-46 pp. 30–32 (moment);
  eqs. 5-47…5-50 pp. 32–33 (the four transfer functions). Assumptions pp. 10–11 (baffles: damping + altered geometry,
  "a good discussion … in reference (1)" — not quantified).
- Errata, 27 Aug 2013 (`from-word/Sloshing Errata.pdf`, page image): modern λ1–3; corrections to (5-34), (5-37), (5-41).
- Not read: NASA SP-106 (Abramson). Removed from the theory page's references.

### Derivations (checked in tests/slosh.test.js)
- Slosh mass: eq. 5-47 mode term πρa²·2a tanh(λm/πρa³)/(λ(λ²−1)) → m_n/M = 2 tanh(λh/R)/(λ(λ²−1)h/R).
- Hinge: (residue in 5-49)/(residue in 5-47) = h0 + (R/λ)(1 − 2 sech x)/tanh x, x = λh/R. A pendulum transmits its
  side force through the hinge, so e_n = (R/λ)(1 − 2 sech x)/tanh x is the hinge depth below the still surface;
  bob at e_n + L_n = (2R/λ) tanh(x/2). Limits: deep e = R/λ, bob 2R/λ; shallow: bob on the bottom, hinge far above.
- Crossing depth h× = (R/λ1) artanh((2πfp)²R/(aλ1)); none when the argument ≥ 1.

### Worked example / errata
- SLOSHIT worksheet example still reproduced (existing test), including its ρ-for-M slip in the tanh argument.
- New erratum found: eq. (5-49) rigid term "a²/4 + (h + ½ m/πρa²)" lacks the liquid depth as a factor (dimensionally
  inconsistent with the modal sum). Not used. Eq. (5-47) has "+" before the modal sum, which at high frequency gives
  M + Σm_n rather than M − Σm_n; only magnitudes are used.

### Quality Gate
| Item | Verdict | Why |
|---|---|---|
| Drawing (tank, rocking surface, pendulum, bands, strip, mode shapes) | REDESIGN | Now shows the verdict on the design: which liquid levels ring with the pitch, and the pendulum with its hinge to scale |
| Slosh frequencies vs depth (old) + slosh mass vs depth (old) | REDESIGN → merged | One stacked chart on depth with the pitch band and crossing: the drain history, which a number cannot show |
| f1 vs tank diameter | NEW, KEEP | Trade-off behind the diameter fix, with your tank and the fix marked |
| f1 over the drain at 1–15 g | NEW, Explore | Shows at which depth each acceleration meets the band |

## D-propellant-slosh — slosh / pitch separation bands
Separation S = max(f1/fp, fp/f1). SAFE S ≥ r (user, default 2, range 1.3–10); MARGINAL 1.25 ≤ S < r; UNSAFE S < 1.25.
Same 1.25 inner band as D-body-bending. **Not a published limit**: the report gives no criterion. Fixes target r on
the side the slosh is now (above → narrower tank / lower pitch frequency / more acceleration).

## Left out (no source)
- Baffles (report: damping and changed geometry, no method), damping ratios, domed tank ends, varying acceleration.
- A "fill level" fix: the level is a moment in the burn, not a design choice; shown instead as the crossing depth.

## Shared-change wishes
- A `g` acceleration unit (inputs are m/s² / ft/s²; the drawing and fixes show g).
- Chart: log axes (the diameter trade-off would read better on log–log).
- Sweep script: count `rect`/`circle` changes too (bands drawn as paths here only to register).

## Screenshots
`/tmp/claude-1000/-home-dara-Professional-projects-RocketCalculator/6a28ad79-4bca-4e7e-9399-c93345c08ae0/scratchpad/propellant-slosh/shots/`
a-* (default, light), b-* (hybrid N₂O, UNSAFE), dark-* (4 ft tank, dark, US), phone-* (390 px, kerosene).
