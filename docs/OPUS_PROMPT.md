# Prompt for Opus 5.5 — build the Rocket Calculator website

You are working in the repo `RocketCalculator` (GitHub: DaraSamii/RocketCalculator, deployed to GitHub Pages at `https://darasamii.github.io/RocketCalculator/`). Read `README.md`, `docs/BRIEF.md` and `docs/TOPICS.md` first. All source material is already in the repo; do not re-download anything.

## 1. Goal
Build a professional, rocket-themed static website that turns the content of <http://www.rsandt.com/reports.html> (rocket-engineering theory by C. P. Hoult plus ~34 Excel calculators) into **easy-to-understand, easy-to-use interactive calculators**, each with its own page, live plots, interactive schematics, and linked theory. A visitor who is not a rocket scientist should understand what each tool does and be able to use it within a minute.

## 2. Decisions already made (do not re-ask)
- **Stack:** vanilla HTML/CSS/JS with ES modules. No build step; everything under `site/` deploys as-is. Vendor libraries into `site/vendor/` (KaTeX for equations, Plotly.js or D3 for plots, optionally a PDF viewer such as PDF.js) — no runtime CDN dependence. Use only relative URLs (served under `/RocketCalculator/`).
- **Scope of release 1:** a **pilot set of 8 working calculators** (below). Every other topic appears on the home page as "Coming soon" with its abstract and links to its reference PDFs.
- **Units:** global SI / English toggle, **SI default**, remembered in `localStorage`. Compute internally in SI; convert at the input/output boundary. The source workbooks mostly use English units, so when verifying against them, switch to English.
- **Documentation:** full rewritten theory pages for the 8 pilot calculators; for all other topics, the documentation is the reference PDFs.

## 3. Pilot calculators (swap one only if its workbook proves unportable, and say so)
| # | Page | Source workbook / doc (in `source/rsandt/media/`, cells+formulas in `data/spreadsheets/`, macros in `data/vba/`) |
|---|---|---|
| 1 | Subsonic Center of Pressure (Barrowman) | `SUBSONIC BARROWMAN EQUATIONS2.4.xls`, `Barrowman Equations.doc` |
| 2 | Supersonic Center of Pressure (Barrowman) | `SUPERSONICBARROWMANEQUATIONS3.5.xls` (+ VBA), `Supersonic LE Fins.doc` — port the simplified path first; document any omitted option |
| 3 | Zero-Lift Drag Coefficient | `DRAG_COEFFICIENT3.4.xls` (+ VBA), `Drag Coefficient3.4.docx` |
| 4 | Atmosphere & Gravity (Geophysics) | `GEOPHYSICS.xls`, `Geophysics.doc` |
| 5 | Ogive Nose Profile | `Ogive Profile.xls`, `Ogive Nose.doc` |
| 6 | Fin Flutter Margin | `FLUTTER MARGIN1.xls`, `Fin Aeroelasticity.doc` |
| 7 | Bifilar Pendulum (moment of inertia) | `Bifilar Pendulum.doc` (no workbook — implement from the document's formulae) |
| 8 | Fin Cant Angle / Roll Rate | `CANT ANGLE3.xls`, `Fin Setting Theory[3].doc` |

**Correctness is the top requirement.** For each calculator: (a) read the Word PDF in `derived/docs-pdf/` for the equations (the `.doc` equations are embedded objects — text dumps in `data/text/` can be garbled); (b) read the workbook JSON for the exact cell formulas; (c) implement in a pure, DOM-free module `site/js/calc/<name>.js`; (d) write a Node-runnable test (`tests/<name>.test.js`, plain `node` + `assert`, no dependencies) that feeds the workbook's cached input cells and checks the cached output cells to a stated tolerance. Document any discrepancy between document and workbook in the calculator's docs page ("Known differences").

## 4. Page structure
```
site/
  index.html                    Home
  calculators/<slug>.html       One page per calculator (pilot: live; others: stub generated from catalog)
  docs/<slug>.html              Full documentation page per pilot calculator
  references/index.html         Reference library (+ references.json, original/ and from-word/ PDFs already present)
  css/  js/  js/calc/  vendor/  assets/
```
Shared header/footer/theme/units code lives in `js/`; pages stay small. A tiny `data/`-driven topic registry (JSON in `site/js/registry.json`, seeded from `data/catalog.json`) must drive the home page, nav, "coming soon" stubs and prev/next links so adding a calculator later = adding one module + one registry entry.

## 5. Requirements

**Home page** — hero with a short animated rocket/trajectory motif; a "How to use this site" walkthrough (3–4 steps: pick a calculator → enter values → read results/plots → press ⓘ for theory); a status grid of all 32 topics grouped by area (Aerodynamics, Structures, Flight dynamics, Launch & recovery, Propulsion & systems, Safety/Reliability, Environment) with clear badges **Available / Coming soon**; search/filter; explanation of how to move between calculators (top nav, grid, prev/next, command-palette-style search); notes on units and the spreadsheet colour code; credits to the original author with link to rsandt.com.

**Each calculator page**
1. Title, one-paragraph plain-language "What it does", "Why it matters" and "When to use it" and typical output (e.g. "CP at 2.3 calibers").
2. Input form with sensible defaults (loaded example so the page is never empty), units shown, validation with friendly messages, a "Reset" and "Load example" button. Group inputs the way the workbook does; mark key results prominently.
3. **Live results** — update as the user edits (debounced); highlighted key results; copy / export CSV.
4. **Plots** — at least one relevant, interactive, themed chart (e.g. CP & CNα vs Mach, Cd vs Mach, atmosphere profiles, nose profile, flutter margin vs altitude).
5. **Interactive schematic** — an SVG diagram drawn to scale from the current inputs (e.g. rocket body with fins and CP/CG markers, ogive profile, fin planform with dimensions, bifilar rig). It must respond to every relevant input in real time, label dimensions, and highlight the field being edited (hover/focus an input ↔ highlights the schematic feature and vice versa; dragging a handle on the schematic may edit the input).
6. **ⓘ info buttons** next to the page title, every input and every result: opens a **right-side drawer** with a short, plain-language explanation, the key formula (KaTeX), a 3–5 step "how it works" walkthrough, and typical value ranges. The drawer has an **"Open full documentation ↗"** link that opens `docs/<slug>.html#<anchor>` **in a new tab**, scrolled to the relevant section. Drawer must be keyboard accessible (Esc closes, focus trap, ARIA).
7. "Theory & references" section at the bottom linking the relevant PDFs from the reference library.

**Documentation pages** (`docs/<slug>.html`, pilot only) — full theory: assumptions and validity range, every equation numbered with KaTeX, definitions of symbols (table), derivation outline, worked example, mapping from equations to code/workbook cells, limitations, known differences from the original workbook, and numbered references linking into the reference library. Each section has a stable anchor used by the ⓘ drawer. Content is rewritten from the Word documents (check each equation against the PDF); do not paste copyrighted text wholesale — summarise and cite.

**References library** (`references/index.html`) — lists **all 69 PDFs** in `site/references/references.json` (15 original PDFs + 54 Word-derived PDFs) with human-readable titles (derive from document title, not just filename), topic tags, size, and a text filter. Clicking opens the PDF in an in-page viewer panel (PDF.js or native `<iframe>/<embed>` fallback) with "Open in new tab" and "Download". Each calculator and topic links to its related references ("Go to reference"). The original `.ppt/.pptx/.zip` files are not served; list them as "Download from rsandt.com" with their original URLs.

**Design**
- Professional aerospace/engineering look: restrained palette (deep navy / graphite with signal-orange or cyan accent), precise typography (a technical sans plus a monospace for numbers), blueprint/grid-paper and subtle starfield or trajectory motifs, thin technical iconography. Not playful; no stock-clipart.
- **Light and dark mode:** CSS custom-property tokens on `:root`, `prefers-color-scheme` default, manual toggle persisted, no flash on load; plots and SVG schematics must be themed from the same tokens.
- Tasteful animation: page transitions, drawer slide, plot/schematic easing, a hero animation; honour `prefers-reduced-motion`.
- Responsive from 360 px phones up; desktop calculator layout = inputs left, schematic + plots right; accessible (WCAG AA contrast, labels, focus rings, keyboard use).
- Fast: no framework, lazy-load Plotly/PDF.js only where needed.

## 6. Process & deliverables
1. Plan first: write `docs/PLAN.md` (architecture, registry schema, component list, calc-module API, test approach) and commit it before coding. Keep a running `docs/PROGRESS.md`.
2. Build the shared framework (theme, units, registry, drawer, plot/schematic helpers, references library, home) **before** the individual calculators, then calculators one at a time, committing after each with its tests passing.
3. Run the Node tests and a headless-browser smoke test of every page (no console errors, no broken links, both themes, mobile width). Use the `run`/browser tools to actually view the pages and screenshot them; fix visual problems.
4. Publish: push to `main`; the Actions workflow `.github/workflows/pages.yml` deploys `site/`. Verify `https://darasamii.github.io/RocketCalculator/` loads and all relative links work under the subpath. Report the result honestly, including anything not verified.
5. Final report: what was built, test results (per calculator: cells compared, max error), known differences, what remains, and any assumptions.

## 7. Constraints & cautions
- The repo is currently **private**; the Pages URL is public. The source documents are third-party (C. P. Hoult, CSULB students, NACA reports, etc.). Show clear attribution and a link back to rsandt.com on every page footer. Do not make the repo public or alter visibility; ask the owner.
- Never invent numbers. If a formula cannot be verified against the workbook or document, flag it on the page ("unverified") and in the final report.
- Do not commit anything >100 MB. Do not edit files in `source/` or `derived/`; they are inputs.
- Commit messages: end with the attribution line required by the session instructions.
