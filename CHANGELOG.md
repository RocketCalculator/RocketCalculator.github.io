# Changelog

Every commit adds an entry here, newest first. Live site: https://darasamii.github.io/RocketCalculator/

## 2026-10-20 (continued)

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
