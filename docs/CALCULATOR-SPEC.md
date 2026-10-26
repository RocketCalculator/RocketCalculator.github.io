# Calculator specification — UI, UX, design and quality

How every calculator on the site must look, behave and be checked. Each rule comes from a decision or a correction the
owner made while reviewing the calculators. `DESIGN-GUIDE.md` holds the visual system (colours, type, components);
this file says **what a calculator page must contain and how it must behave**. When the two disagree, this file wins
for calculator pages.

The reader is a rocketeer with **high-school science**: they know speed, mass, force and pressure, not aerospace
jargon. They arrive with a design and three questions: *Is it safe? Where will it fail, and why? What should I change,
and by how much?* Every page answers all three within five seconds.

---

## 1. Page anatomy, top to bottom

| # | Block | Must contain | Notes |
|---|---|---|---|
| 1 | **Header** (shared) | Brand, nav (Home, Calculators, References, How to use, About), search, SI/US, dark mode, **accent colour picker**, GitHub | Fits on one line from 320 to 1440 px; the nav collapses below 1000 px. |
| 2 | **Title + subtitle** | The calculator's name (what it designs, e.g. "Nozzle Design and Thrust") and one sentence on what it gives | A name says what the user designs, not the source's formula name. |
| 3 | **Intro cards** | What it does · Why it matters · When to use it | Plain words, 2–3 sentences each. |
| 4 | **Design bar** (shared) | Shared rocket name, share dimensions across calculators, pin baseline, save/open design | Unchanged per calculator. |
| 5 | **Inputs** (left column) | Grouped fields (§3), "Load example…", Reset, Share, action buttons | Inputs never move when results change. |
| 6 | **Verdict banner** | SAFE / MARGINAL / UNSAFE (icon + word + colour, never colour alone), one-line title, one sentence with the key numbers, up to 3 fixes with **exact values** | Fixed height. "NO VERDICT" when an input it needs is missing. |
| 7 | **Key result cards** | 3–5 numbers that answer the question, each with unit, a short note and a status colour | Status = the same thresholds as the verdict. |
| 8 | **Drawing** (one box) | The design to scale, dimensioned like an engineering drawing, with the physics on it (§4) | Above the plots. |
| 9 | **Main plots** | 1–2 plots that tell the story (§5) | Wide when they share an axis or need the width. |
| 10 | **Explore** (collapsed) | Secondary plots, all results, assumptions and limits of validity | Tier 2 for the curious. |
| 11 | **Theory & references** | Link to the theory page; sources actually read | |
| 12 | **Notice dock** (floating) | Warnings sorted err → warn → info, each with *what is wrong* and **Fix:** *what to change* | On phones each notice shows two lines; a tap opens it. |
| 13 | **Footer** (shared) | Credit to C. P. Hoult and to the site's author, "Report a problem" (GitHub issues) | |

## 2. Verdict and fixes

- Every calculator that can judge a design has `verdict: true`. Thresholds come from the source; when the source has
  none, the **user sets the limit** (e.g. the landing speed they accept, the recovery-area radius) and the bands
  around it are recorded as a project decision (DECISIONS.md) and stated on the theory page as *not a published limit*.
- Fixes are **solved, not suggested**: "Reduce the exit diameter from 95.3 mm to at most **61.8 mm**". Solve by closed
  form when one exists, otherwise by bisection, and add a test that the suggested value hits the target exactly.
- Each fix names the input to change, its current value and the new value. At most three fixes, the most effective first.
- **Danger is always red** (`var(--danger)`), whatever accent colour the reader picked: UNSAFE badges, error notices,
  separation, unsafe and limit lines.

## 3. Inputs

- **Enter what the builder measures or machines.** Use diameters and lengths, not angles and ratios, when that is how
  the part is made (nozzle: d_in, d_t, d_e, L_c, L_d). Derived quantities (ε, angles, %) become results.
- **Every input is bounded:** `min`/`max`, and a **slider** whose range covers realistic designs. Sliders are in
  internal units; the unit switch converts the display.
- **Coupled inputs never block the page.** Refuse only what is physically impossible (exit smaller than the throat).
  When a combination cannot be built (a convergent too short for its throat rounding, a disreef above the opening),
  use the nearest buildable value, **draw what is actually computed**, and warn with the achievable range. A refusal
  leaves the old drawing on screen, which reads as "the inputs do nothing".
- Choices are `select`s, grouped with `<optgroup>`s when long (e.g. fin materials by family, with each value's source).
- Tables (`kind: 'table'`) for profiles: wind layers, flight profiles.
- **Action buttons** for things a form cannot do: fill from another calculator, load forecast winds, open the site on a
  map. They report what they did in a toast, with the data source's attribution. A button that uses particular inputs
  sits **right after them in their group** (`group` on the action): load winds and the map links follow latitude,
  longitude and the launch date.
- **Dates are dates** (`kind: 'datetime'`, site local time, empty = now), not "hours from now".
- Every input has an info tab (§7).

## 4. The drawing

- **One box, to scale.** Say so in the caption; if something cannot be to scale (a radius compressed to fit, a tether
  in an inset), the caption or axis label says exactly what.
- **Dimensioned like an engineering drawing:** ↔ dimension lines for every diameter (vertical) and length (horizontal,
  on one baseline), **angle arcs** for every angle, station names on one aligned row. Labels never sit on the gas, on
  the axis or on each other; use symbols with subscripts that render (`d_{in}`, not `d_in`).
- **It must respond to every input that changes the design** — a slider sweep (§9) checks this. Size things from the
  inputs (a parachute drawn bigger when its diameter grows, its mouth narrower when reefed).
- **Show the physics on the design:** shock and separation on the nozzle wall, the landing point coloured by the
  verdict, the recovery area on the ground, wind arrows by layer, time dots along a path.
- **Drag handles** for the main geometric inputs (exit lip, inlet corner, opening height, wind arrow, area edge).
  Handles the drawing does not ask for in a render are hidden.
- Shared viewport: fit to content, zoom 1–8×, reset, no scroll hijacking, the view kept when inputs change.
- When the flow or a profile is a function of the same position as the drawing, **put the drawing on the plot's axis**:
  a drawing panel at the top of a stacked chart, with the shared vertical lines and the hover crosshair running
  through it (nozzle). A separate, richer drawing above it can still show the outer flow and the dimensions.

## 5. Plots

- **Every plot must show something a number cannot**: a trade-off (size against drift), an evolution (the descent
  second by second), a location (where the jet separates), a crossing (where the wall pressure meets the criterion).
  Record a Quality Gate verdict for each (KNOWLEDGE.md): KEEP, REDESIGN or REMOVE. Decorative plots are removed.
- **Axes must frame the interesting range.** Do not let one extreme flatten the rest: cut the axis (and say so in the
  info), or limit the x range to about twice the largest value that matters. Off-chart or squashed curves are bugs.
- **Stacked panels with a shared x axis** (`spec.panels`) when several quantities vary along the same variable: one
  crosshair through all panels, a tooltip with every value **and its ratio to the reference value** (A/A*, p/p*),
  a rule and space between panels, the throat/shock/limit lines through all of them.
- **Colours:** the design system's series family only (red, ink, grey, dark red, slate, light red), told apart by
  **line pattern** (solid, dashed, dotted, dash-dot) and by the axis label's colour. Limit lines in `--danger`, with a
  label ("your landing speed", "edge of the area", "unsafe below 1").
- **Labels:** wrap maths in `$…$` (`'Expansion ratio $\varepsilon$'`). Bare TeX mixed with words is typeset whole as
  maths in tooltips and legends ("Expansionratioε").
- Hover works everywhere (single charts and panels); the tooltip stays inside the chart on phones.
- Mark the user's design on every trade-off plot ("your nozzle", "your parachute").
- Wide (`wide: true`) for shared-axis panels and trade-offs; fixed heights so nothing moves.

## 6. Results table and layout stability

- Results that apply only sometimes are **always listed**, with "—" when they do not apply, and say so in the label
  ("— if attached"). A row that appears and disappears moves everything below it.
- Nothing moves by more than 1 px while any slider sweeps its range (ui-layout test), in SI and US, at 390 and 1280 px.
- No NaN, Infinity or "undefined" ever shown.

## 7. Info tabs (the ⓘ drawer)

Written for the high-school reader (DESIGN-GUIDE §6a):

1. **In short — three short paragraphs:** *what it is* (a picture in words), *where the number comes from* (how to
   measure, look up or choose it; or how to read a result), *what changing it does* (direction and size of the effect).
2. **Key formula** with every symbol in `symbols`, each with its plain meaning **and unit**.
3. **Diagram:** inputs tied to the drawing with `data-field`, so the tab shows the drawing with that input highlighted.
4. **Typical values** with context (model, high-power, research), in both unit systems where they differ.
5. Plot tabs: what is plotted, how to read the lines and markers, the one thing to look for.
6. At most about 120 words; derivations live on the theory page (`doc` link).

## 8. Physics, sources and honesty

- **Only cite what was read.** Read the primary source (NASA/NTRS PDFs, the RS&T memos in the library); read equations
  and charts from the **page images**, not the text layer. Digitise charts by pixel tracing and **calibrate on a
  known point**.
- **Reproduce the source's worked example** in a test, every printed intermediate.
- **Check against errata and misprints** (US Standard Atmosphere's β and S, a memo's 27.1 min that contradicts its own
  numbers) and record them in KNOWLEDGE.md.
- Label everything unverified ("not independently checked", "rule of thumb", "qualitative").
- Values taken from another tool (OpenRocket's material database) name the tool, commit and the sources it cites.
- When a feature has no source, leave it out and list it in the backlog rather than inventing it.
- Third-party data in the browser (Open-Meteo) only on the user's click, with the attribution its licence asks for.

## 9. Testing a calculator (before every merge)

1. `npm test` — unit tests incl. source examples, solver round-trips, invariants and the random-input sweep.
2. **Slider sweep** in a browser: every slider at seven points; the drawing and plots must change, nothing may be
   refused except physically impossible inputs, no page errors.
3. `npm run test:ui-layout -- --only <slug> --widths 390,1280` — no movement > 1 px.
4. `npm run test:ui-diagrams -- --only <slug>` — zoom, pan, handles on laptop and phone.
5. `node scripts/uifuzz.mjs <slug>` — random inputs, handles, keyboard.
6. `node scripts/smoke.mjs site` after shared changes — every page, light/dark/phone, links.
7. **Look at it**: screenshots of the drawing, each main plot with the hover tooltip, an info tab, light and dark, a
   phone width, and the worst-case example. Fix what looks wrong, then repeat from 1.
8. **Do not merge on a failing check**: gate the merge on the test output, never chain past it.

## 10. Delivery

- Branch `type/short-description`, Conventional Commits with the *why*, PR with the checklist, merge commit,
  **delete the branch** (local and remote). No per-calculator tags.
- CHANGELOG.md (what changed, why, what was verified), KNOWLEDGE.md (sources, equations, test cases, errata, Quality
  Gate table, lessons), DECISIONS.md for every judgement call.
- Verify the live page after the deploy (load, examples, no errors).
- When the owner signs a calculator off, add it to `FINAL` in `scripts/seed_registry.py` (purple **Final** badge).
