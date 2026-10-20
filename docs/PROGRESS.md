# Progress log

- 2026-10-20 — Plan written (`docs/PLAN.md`). Vendored KaTeX 0.16.11 + IBM Plex fonts. Registry + reference
  metadata seeded (`scripts/seed_registry.py`). Excel-cached values extracted from original .xls
  (`scripts/extract_xls_cached.py`) and defined names (`data/spreadsheets/_defined_names.json`).
- 2026-10-20 — Release 1 complete with **7 calculators** (owner asked to stop before the supersonic one):
  Ogive Nose, Atmosphere & Gravity, Bifilar Pendulum, Fin Flutter, Fin Cant Angle, Zero-Lift Drag, Subsonic CP.
  Each has a docs page, ⓘ drawers, plots, interactive schematic, and Node tests against Excel-cached workbook values
  (`npm test`: 26 tests pass). Smoke test (`scripts/smoke.mjs`): 41 pages × (light, dark, 375 px) — no console
  errors, no HTTP errors, no horizontal overflow, 105 internal links OK.
- Not done / next: Supersonic CP calculator (SUPERSONICBARROWMANEQUATIONS3.5.xls + SUPERDELTA.xls + "Supersonic LE
  Fins" memo — SUPERDELTA formulas already inspected and look directly portable); the other 24 topics are
  "coming soon" pages with their references.
- 2026-10-20 — Redesign after DESIGN-vodafone.md: Inter (open substitute for the Vodafone face) at 800 uppercase
  display / 300 sub-displays; single accent #e60000; ink nav, hero and footer bands; 60 px pill buttons; flat 6 px cards;
  dark key-result cards; red campaign band. Deliberate deviations: secondary text darkened to meet WCAG AA, plot series
  use a red/ink/grey/slate family, light/dark mode kept.
  All symbols and units typeset with KaTeX (HTML) or a TeX-lite SVG renderer (plots, schematics); units such as
  m s⁻¹ come from `UNIT_TEX` in `js/units.js`.
  Plots and schematics: one Export menu (CSV, SVG, PNG, JPEG, PDF — the PDF is written by `js/ui/export.js` without a library).
  Schematic animations: pause/play button (remembered); cant-angle rear view capped at 0.5 Hz on screen.
  ⓘ drawers show the live schematic with the relevant dimension highlighted.
  Export report box on every calculator (`js/ui/report.js` + `report()` in each definition): inputs, theory, each equation
  symbolic → substituted → result, results, notes, references; Markdown, LaTeX (all 7 compile with pdflatex),
  Word (.doc / rich copy with MathML) and print-to-PDF.
- 2026-10-20 — Decluttered calculator pages (no source/verification chips, no "typical output" card, no fidelity switch,
  no workbook remarks; drawing hints moved into ⓘ). Vector PDF and EPS export (`js/ui/vector.js`, no library).
  ⓘ formulas list their symbols ("where"); ⓘ diagrams zoom onto the selected dimension and fade the rest.
  Reports: combined "Symbols and inputs" table, constants listed, every substitution in the selected SI or US units
  (constants converted); Word .doc download removed (rich "Copy for Word / Google Docs" kept). All 14 LaTeX reports
  (7 calculators × SI/US) compile with pdflatex. Ctrl K hint and PDR band removed; footer gap fixed.
