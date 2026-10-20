# Build plan — Rocket Calculator website

Static site in `site/`, vanilla HTML/CSS/ES modules, no build step at deploy. Dev-time scripts in `scripts/`
(Python/Node) generate committed files (registry, stub pages); nothing runs on GitHub except the Pages upload.

## Architecture

```
site/
  index.html                  Home: hero, how-to walkthrough, topic grid (Available / Coming soon), search
  calculators/<slug>.html     8 live calculators + 24 topic pages for "coming soon" topics (generated)
  docs/<slug>.html            Full theory page per live calculator (hand-written, KaTeX)
  references/index.html       Reference library: 69 PDFs, filter, in-page viewer, new tab, download
  css/site.css                Design tokens (light/dark), layout, components
  js/
    registry.json             Areas, topics, calculators (seeded by scripts/seed_registry.py)
    app.js                    Shell: header, footer, theme + units toggles, command palette, prev/next
    theme.js  units.js  store.js  math.js (KaTeX render)  format.js
    ui/drawer.js              ⓘ side drawer (focus trap, Esc, ARIA dialog)
    ui/chart.js               Lightweight themed SVG line chart (hover readout, legend toggle, SVG/CSV export)
    ui/svg.js                 Schematic helpers (dimension lines, handles, highlight linking)
    ui/form.js                Input groups, units, validation, profile tables
    calculator-page.js        Generic calculator renderer driven by a definition module
    calculators/<slug>.js     UI definition: intro, inputs, results, info texts, plots, schematic
    calc/<name>.js            Pure maths, DOM-free, importable by Node tests
  vendor/katex, vendor/fonts  KaTeX 0.16.11, IBM Plex Sans/Mono (OFL) — self-hosted
tests/<name>.test.js          node --test; workbook cached inputs → cached outputs
```

### Registry schema (`site/js/registry.json`)
- `areas[]`: `{id, title, description}`
- `topics[]`: `{id, slug, title, area, summary, abstract, status: available|soon, calculators[], references[], sourceFiles[]}`
- `calculators[]`: `{slug, title, topic, description}`
Adding a calculator = `js/calc/<x>.js` + `js/calculators/<slug>.js` + `calculators/<slug>.html` (copy of a template)
+ one entry in `CALCULATORS` of `scripts/seed_registry.py` (re-run) + `docs/<slug>.html`.

### Calculator definition API (`js/calculators/<slug>.js`)
```js
export default {
  slug, title, topic, intro: {what, why, when, typical},
  groups: [{ id, title, fields: [{ id, label, dim, default, min, max, step, kind: 'number'|'bool'|'select'|'table', info }] }],
  compute(values, opts) -> { results: {...}, warnings: [] },   // values arrive in the module's internal units
  results: [{ id, label, dim, key, info }],
  plots: [{ id, title, build(values, out) -> {x, y, series, markers} }],
  schematic(svgHost, values, out, ctx),                        // redraw; elements tagged data-field
  info: { [fieldOrResultId]: { title, text, tex, steps[], range, doc: '#anchor' } },
  references: [refId...], compat: { label, note }              // optional "match original spreadsheet" switch
}
```

### Units
Global SI/English toggle (`localStorage`, SI default). Every field declares a dimension (`length`, `area`, `pressure`, …);
`units.js` converts display ⇄ internal. **Internal units are declared per calc module.** Geometry-only models are
unit-free; models with empirical English-unit constants (drag Reynolds-number constant, flutter 39.3 factor,
geophysics constants) are evaluated in their native English units so constants are not re-derived by hand.

### Fidelity switch
Where the workbook disagrees with its own memo (found during porting), the calculator defaults to the memo's equations
and offers a **"Match original spreadsheet"** switch that reproduces the workbook exactly. Tests cover both modes.
Each difference is listed under "Known differences" on the docs page.

## Test approach
`node --test tests/` — each test loads the workbook's Excel-cached values (`data/spreadsheets/excel-cached/*.json`,
read from the original .xls with xlrd so VBA results are intact), feeds the input cells to the calc module,
and asserts every comparable output cell within a relative tolerance (1e-9 unless stated). Bifilar pendulum
(no workbook) is checked against the memo's analytic uniform-rod cases. A headless Firefox smoke test
(`scripts/smoke.mjs`) loads every page in both themes and at 360 px, collecting console errors and broken links.

## Pilot calculators and status
| Calculator | Source | Notes from porting |
|---|---|---|
| Subsonic CP | SUBSONIC BARROWMAN 2.4 | single fin set (two-stage vortex path is `#VALUE!` in workbook) |
| ~~Supersonic fins~~ | Supersonic LE Fins memo, SUPERDELTA | **not built in release 1** (owner asked to wrap up) — topic shows as part of Barrowman |
| Drag | DRAG_COEFFICIENT 3.4 | 4 workbook/memo differences → fidelity switch |
| Geophysics | GEOPHYSICS | pressure datum difference → fidelity switch |
| Ogive | Ogive Profile | label "from base" is actually from nose tip |
| Flutter | FLUTTER MARGIN1 | Mach from atmosphere model optional |
| Bifilar | memo only | analytic checks |
| Cant angle | CANT ANGLE3 | CLδ cell typo → fidelity switch |

## Order of work
1. Framework: tokens/theme, shell, units, drawer, chart, form, calculator renderer, home, references, stub pages.
2. Calculators one at a time with tests: ogive → geophysics → bifilar → flutter → cant angle → drag → subsonic CP → supersonic.
3. Docs pages. 4. Smoke test + screenshots + fixes. 5. Push, verify Pages.
