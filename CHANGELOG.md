# Changelog

Every commit adds an entry here, newest first. Live site: https://darasamii.github.io/RocketCalculator/

## Unreleased

### Fixed
- Long grey band below the footer after scrolling to the bottom of a calculator page. KaTeX's hidden MathML copy
  (`position: absolute`) escaped the scrolling report preview and stretched the document; KaTeX and scrolling boxes
  are now positioned containers.

### Added
- `CHANGELOG.md` (this file), updated with every commit.

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
