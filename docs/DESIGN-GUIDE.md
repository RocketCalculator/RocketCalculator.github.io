# Rocket Calculator — design & styling guide

The rules every page, calculator and export must follow. It records the decisions made with the project owner;
read it before building or changing anything. Visual language derives from `DESIGN-vodafone.md` (Vodafone-inspired),
adapted for an engineering tool used by student rocket clubs preparing PDR/FDR documents.

---

## 1. Principles

1. **Easy to understand and use.** A student who is not an aerodynamicist must understand what a calculator does and use
   it within a minute. Plain language first; theory one click away.
2. **Uncluttered pages.** Show only what is needed to use the tool. Everything explanatory — theory, symbol meanings,
   guidance, typical values, caveats — goes behind an **ⓘ button**, never as extra text on the page.
3. **A new, independent project.** The site is built from C. P. Hoult’s rsandt.com reports, credited in the references
   and footer, but pages never talk about “the workbook”, “the spreadsheet”, cell names, `.xls` files, “not part of the
   workbook”, “this site’s guidance”, etc. Cite sources in the references list, not in running text.
4. **Correct, then pretty.** Every formula is verified (tests in `tests/`). Never show a number that is not computed.
5. **Professional and rocket-related.** Clean engineering look; animation is welcome but subtle and stoppable.

## 2. Colour

Single accent, ink and greys — no second accent colour.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--red` | `#e60000` | `#e60000` | Primary buttons, highlights, the brand mark, left edge of key results, active states |
| `--red-text` | `#d40000` | `#ff4d4d` | Red used as text (AA contrast) |
| `--ink-brand` | `#25282b` | `#25282b` | Header, hero band, footer, drawer header (always dark) |
| `--bg` | `#ffffff` | `#141618` | Page canvas |
| `--surface` | `#f2f2f2` | `#25282b` | Cards (flat, no shadow) |
| `--surface-2` | `#ffffff` | `#1c1e21` | Surfaces inside cards, inputs, key-result cards |
| `--text` / `--text-2` / `--text-3` | `#25282b` / `#4b4f53` / `#6b6e71` | `#fff` / `#d0d2d4` / `#a9acaf` | Text hierarchy (the spec’s `#7e7e7e` is too light for small text — keep AA) |

- **Plots** use a red / ink / grey / slate family: `--series-1…6`. Distinguish series by dashes as well as colour.
  Stacked panels: each quantity keeps one series colour and its own line pattern (nozzle: area ink solid, Mach red
  solid, pressure dark red dashed, temperature red dotted, density dark red dash-dot), axis label in that colour.
- **Final badge:** calculators the owner has signed off carry a purple "Final" chip on the home page
  (`FINAL` in `scripts/seed_registry.py` → `final: true` in the registry).
- **Status**: green (ok), amber (warning), red (error) — only on borders, small text and notices.
- **Light and dark mode** are both required: tokens on `:root`, overridden for `prefers-color-scheme: dark` and for
  `[data-theme="dark"]`; manual toggle in the header, remembered. Plots and drawings read the same tokens.

## 3. Typography

- One family: **Inter** (self-hosted, weights 300–800) — open substitute for the Vodafone face. No mono for prose;
  numbers use Inter with `font-variant-numeric: tabular-nums`. A system mono only for code.
- **Page titles**: weight 800, UPPERCASE, tight tracking (`-0.02em`), line-height ≈ 0.95.
  Home hero: up to 144 px, `-0.035em`, line-height 0.8.
- **Section headings**: weight 300, sentence case, 32–48 px.
- **Eyebrows / group legends / table headers**: 12–14 px, weight 800, UPPERCASE, `letter-spacing: .06em`.
- Body 16 px; secondary 14–15 px.

## 4. Shape & layout

- Buttons and chips: **pills** (60 px radius buttons, 32 px chips). Primary = red fill; secondary = 1 px ink outline;
  tertiary = ghost. No square buttons.
- Cards: 6 px radius, **flat** (`--surface` on `--bg`), no drop shadows. Depth comes from surface contrast.
- Dark bands (ink) for header and home hero; white content bands in between. The **footer is a slim strip**
  (one credit line + inline links, ~80 px) — never a tall multi-column block. Below the footer the page background is ink.
- Container max 1400 px, 32 px gutters (16 px on phones). Must work at 360–375 px with no horizontal scroll.
- Calculator layout: inputs card left (sticky on desktop), outputs right; one column on tablets/phones.

## 5. Calculator page anatomy (top to bottom)

1. Breadcrumb · **title** (uppercase) · ⓘ (page theory) · “Full documentation ↗” · “References” link.
2. One-line subtitle.
3. Three intro cards: **What it does · Why it matters · When to use it**. No “typical output” card, no source or
   verification badges.
4. **Design bar** (one slim `--surface` strip): rocket name · “Share dimensions across calculators” switch · ⓘ ·
   Pin as baseline (or Baseline chip · Restore · Clear) · Save design · Open design. See §5a.
5. **Inputs** card: grouped fields (group legend uppercase), each field = label + symbol (KaTeX) + ⓘ + input + unit.
   “Load example…”, Reset, Share. No footnotes. Bounded inputs (fractions and probabilities 0–1, counts with a
   sensible range) get a **slider** under the box, with a tidy `step` (e.g. 0.01, or 1 for whole numbers). Prefer **choices over raw data**: e.g. nose shape is a dropdown
   (tangent ogive, cone, Von Kármán, LV-Haack, elliptical, parabolic K′, power n) with length/radius; a “Custom
   profile” option reveals the point table only for users who need it.
6. **Key results**: 3–4 cards, **light** (`--surface-2`, dark surface in dark mode) with a 1 px border and a 4 px
   coloured **left edge** (red; green/amber when status applies). Never solid black blocks. Value and unit stay on
   one line (the number scales with the card width).
   **Warnings and notes never sit in the page flow**: they appear in the fixed notice dock (bottom corner), each
   dismissible, so they cannot shift the cards and drawings below.
7. **Drawing** (schematic) card, to scale, linked to inputs (hover/focus highlights both ways, drag handles edit
   inputs). Must show every input that changes the geometry — e.g. a **rear view with the actual number of fins**,
   and a visible **joint line where the nose cone meets the body tube**.
   Card header: title, ⓘ (how to use the drawing), pause/play (if animated), Export.
8. Plots (each with ⓘ and Export).
9. All results table (Copy · Export: CSV, TXT/TSV, XLSX, JSON).
10. Theory & references (reference titles only — no file names).
11. **Export report** box.
12. Previous / next calculator.

## 5a. Shared rocket, design files, comparison

- **Shared rocket** (`js/design.js`, stored as `rc-rocket`): geometry common to several calculators — body radius,
  nose length and shape, overall length, fin count, chords, exposed semispan, thickness. A field joins with
  `shared: 'key'` (same internal unit everywhere — a test enforces it) or `shared: { key, get, set }` when the page
  describes it differently (cant angle: tip radius = R + span). Flight conditions are never shared.
  Only user edits push to the rocket; a page pulls on load (not when opened from a share link). Shared fields show a
  small chain mark while sharing is on. A calculator may define `sharedAdjust(v)` to keep its own geometry valid.
- **Design file** `<name>.rocket.json` (`format: "rocket-calculator-design"`): rocket name, shared values, every
  calculator’s inputs and baselines, all in internal units. Opening one replaces them and reloads.
- **Baseline** (per calculator, `rc-base-<slug>`): key results show “Baseline … · ±Δ (±%)”, the results table gains
  Baseline and Change columns, plots draw the baseline curves dashed in `--text-3` with “(baseline)” in the legend.
  Neutral colours only — a change is not judged good or bad.

## 6. The ⓘ drawer (where the detail lives)

Order of contents:
1. **In short** — plain-language explanation (1–3 sentences).
2. **Key formula** — KaTeX display.
3. **where** — every symbol in the formula with its meaning (from the calculator’s `symbols` dictionary).
   Any new formula must have all its symbols in the dictionary.
4. **Diagram** — a focused view of the current design: zoomed to the dimension, the dimension highlighted, the rest
   faded. Caption must describe what is actually shown (don’t claim “red” if the element keeps its own colour,
   e.g. the black CG marker). Inputs that are not geometric get no diagram.
5. **Walk-through** — 3–5 numbered steps (page/plot level).
6. **Typical values** — ranges and practical guidance.
7. Footer: “Open full documentation ↗” (new tab, to the right section).

## 7. Mathematics, symbols and units

- **Every symbol and unit is typeset**, never written as ASCII. KaTeX in HTML (`texHTML`, `rich('… $C_{N\alpha}$ …')`);
  TeX-lite in SVG (`svgRich`) for axes, legends and drawings; `texToPlain` only for CSV.
- Symbols: proper sub/superscripts (`X_{CG}`, `C_{L\delta}`, `\bar{x}`); never `C_g` as plain text or “C_Nα”.
- Units: SI style with negative exponents — `\mathrm{m\,s^{-1}}`, `\mathrm{kg\,m^{-3}}`, `\mathrm{lbf\,ft^{-2}}`;
  never `m.s-1` or `m/s` strings. Unit TeX lives in `UNIT_TEX` (`js/units.js`).
- Labels may embed `$…$`; plain text elsewhere.
- **SI / US switch** in the header (SI default, remembered). Every display — inputs, results, plots, drawings,
  reports — follows it. Calculations may run in any internal unit; conversion happens at the boundary.

## 8. Plots & drawings

- Custom SVG chart (`js/ui/chart.js`): grid, ticks sized to width, TeX axis labels, hover read-out, legend toggles,
  current operating point as a marker.
- Curves are **smooth**: sample continuous models finely; for quantities defined only at whole numbers (flights,
  stages) pass the computed points with `smooth: true` (monotone cubic, no overshoot) and `dots: true`. No staircases
  or jagged polylines; exported data stays the computed points.
- **One Export button** per plot and drawing, grouped with separator lines: **data** — CSV, TXT/TSV, XLSX, JSON
  (plots and the results table; `js/ui/tabular.js`, no library) | **vector** — SVG, PDF, EPS | **image** — PNG, JPEG.
  Drawings have no data group. PDF/EPS are true vector (`js/ui/vector.js`), include the legend and title.
- Animations (e.g. spinning rear view, yaw motion): slow enough to read (≤ 0.5 rev/s on screen, state “shown N×
  slower”), a **Pause/Play** button that is remembered, and respect `prefers-reduced-motion`.

## 9. Export report

Purpose: students paste it into PDR/FDR documents.

- Title “**Export report**” (no “PDR/FDR” wording on the page).
- Tabs: Preview · Markdown · LaTeX. Buttons: Copy, Download (.md/.tex), **Copy for Word / Google Docs** (rich HTML +
  MathML), Print / save as PDF. No Word .doc download.
- Content order: title & “Based on: <reference>” · **Inputs and constants** table (only rows that have a value and
  unit) · Theory paragraph · calculation steps · Results table · Notes · References.
- **Every calculation step follows this procedure**:
  1. introduce the formula (display equation);
  2. a sentence explaining each symbol in it, comma-separated — “where $R$ is the base radius, $L$ is … and $a$ is …”
     (descriptions come from the `symbols` dictionary and must not contain commas);
  3. a sentence giving the values you have — “With $R=76.2\,\mathrm{mm}$, … and $L=762\,\mathrm{mm}$:” (inputs,
     constants and results of earlier steps);
  4. the substitution and the result with its unit.
- **Everything in the selected unit system**, including substituted numbers and converted constants
  (e.g. 39.3 psi ↔ 270 964 Pa, 1716 ft·lbf/(slug·°R) ↔ 286.96 J/(kg·K)). Switching SI/US regenerates the report.
- LaTeX output must compile with `pdflatex` (escape Unicode in text; keep maths in `$…$`).

## 10. Writing style

- Short sentences, active voice, British spelling (centre, calibre, aluminium).
- Name things by what the user does (“Nose shape”, “Exposed semispan”), symbol after the name.
- No internal provenance in UI text (no workbook/spreadsheet/memo-cell talk); sources go in References.
- Warnings say what is wrong and what to do.

## 11. Accessibility & quality

- WCAG AA contrast; visible focus rings; keyboard-operable drawer (Esc, focus trap), menus and drag handles (arrow keys).
- No console errors; no horizontal overflow at 375 px; all internal links valid — run `scripts/smoke.mjs`.
- Calculation changes need tests (`npm test`). `tests/aggressive.test.js` runs every calculator through random inputs
  across its limits, every field at its bounds, unit round-trips, report checks (no NaN/undefined, every formula
  with symbols explains them) and physical trends; `scripts/uifuzz.mjs` types garbage into every field in a browser,
  cycles every option, drags handles to extremes and checks the report tabs.
- A design that cannot be evaluated throws `InputError` (from `js/util.js`) with one sentence saying what to change;
  it is shown as an error notice and never logged. Anything else thrown is a bug. Results that become meaningless
  must come with a warning — no silent NaN.
- Loops sized by user input must be bounded (e.g. the ogive profile caps at 2 000 points).

## 12. Implementation map

| Concern | File |
|---|---|
| Tokens, components | `site/css/site.css` |
| Shell (header, footer, search, theme, units, GitHub link) | `site/js/app.js` |
| Maths rendering | `site/js/math.js` |
| Units & unit TeX | `site/js/units.js` |
| Form fields | `site/js/ui/form.js` |
| Drawer | `site/js/ui/drawer.js` |
| Charts / export menu / vector export / CSV-TSV-XLSX | `site/js/ui/chart.js`, `export.js`, `vector.js`, `tabular.js` |
| Drawing helpers (dimensions, handles, rear fin view) | `site/js/ui/svg.js` |
| Report | `site/js/ui/report.js` |
| Calculator page renderer | `site/js/calculator-page.js` |
| Calculator definitions (texts, `symbols`, `constants`, `report()`) | `site/js/calculators/*.js` |
| Maths modules (DOM-free, tested) | `site/js/calc/*.js` |
