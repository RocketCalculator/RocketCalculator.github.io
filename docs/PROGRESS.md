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
