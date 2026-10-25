# Knowledge base

Notes for anyone (human or AI) working on this repository. Read this, `PROGRESS.md`, `DECISIONS.md` and
`BLOCKERS.md` before starting work; update them when you finish. `docs/DESIGN-GUIDE.md` holds the UI rules.

## Hosting

| | Now | Target (after B1) |
|---|---|---|
| Organization / owner | `DaraSamii` (personal) | `RocketCalculator` |
| Repository | `DaraSamii/RocketCalculator` | `RocketCalculator/RocketCalculator.github.io` |
| Site | `https://darasamii.github.io/RocketCalculator/` | `https://rocketcalculator.github.io/` |
| Pages source | GitHub Actions (`.github/workflows/pages.yml`, uploads `site/`) | same |

- **Deploy:** push to `main` with changes under `site/**` (or run the workflow by hand). The workflow does a sparse
  checkout of `site/` and publishes it as is; there is no build step. `data/`, `derived/`, `source/` are never deployed.
- **Address independence:** every module resolves files with `url(path)` = `new URL(path, ROOT)` where
  `ROOT = new URL('../', import.meta.url)` (`site/js/util.js`); HTML pages use relative links; share links are
  `location.origin + location.pathname + '#s=…'`. Do not introduce root-absolute paths (`/css/...`) — they break the
  project-page address — or hard-coded hosts.
- **404:** `site/404.html` chooses `<base href>` from the path (D5).
- **Browser storage** (all `localStorage`, via `storage` in `util.js`): `rc-theme`, `rc-units`, `rc-rocket`,
  `rc-flash`, `rc-anim-paused`, `rc-home-status`, `rc-calc-<slug>` (last inputs), `rc-base-<slug>` (pinned baseline).
  Storage is per origin, so all of it resets when the site moves to the organization address.
- **Retired after the move:** `https://darasamii.github.io/RocketCalculator/...` (Pages does not redirect project
  sites after a transfer; D4). The old repo URL redirects automatically as long as no new repo takes its name.
- **Migration status:** pending (B1). Checklist for finishing it is in `BLOCKERS.md`.

## Project architecture and file map

See `DISCOVERY.md` §1 for the full map. In short: `site/js/calc/*.js` pure physics (tested in `tests/`),
`site/js/calculators/<slug>.js` the calculator definition, `site/js/calculator-page.js` the generic page,
`site/js/ui/*` shared UI, `scripts/` page generation and browser tests.

**Adding a calculator:** write `calc/<name>.js` and `tests/<name>.test.js`; write the definition
(`slug, topic, title, subtitle, intro, info, groups[].fields[], results[], compute(v) → { results, warnings },
plots[].build(v, out, { U }) [+ plots[].when(v)], schematic(ctx, v, out), symbols, report(v, out, R), references, examples`); add the
`CALCULATORS` line in `scripts/seed_registry.py`; run `python3 scripts/seed_registry.py && node
scripts/generate_pages.mjs`; write `site/docs/<slug>.html`; add REPAIR/INVARIANTS/trend entries in
`tests/aggressive.test.js`; run `npm test` and `npm run test:ui-layout -- --only <slug>`.

## Shared component reference

### Recompute pipeline (`calculator-page.js`)
- `requestRecompute()` — continuous input (sliders, schematic handles) recomputes **at most once per animation
  frame**. Key-result cards and the schematic follow every frame; the results table and the charts follow after the
  input pauses for 140 ms (`slowSoon`), and only charts within 300 px of the viewport (IntersectionObserver); the rest
  are drawn when they scroll into view.
- `recompute()` (no `live`) — typing (debounced 110 ms), buttons, unit/theme switch, load: everything, all charts.
- Never call `recompute()` from a pointer or slider handler directly.

### DiagramViewport (`ui/viewport.js` → `diagramViewport(host, { label })`)
- Wraps every schematic (`calculator-page.js` creates it; definitions do not change). Returns
  `{ el, stage, attach(svg), reset(), zoomBy(f, px, py), withBase(fn), state() }`; the page calls `attach(svg)` after
  every `def.schematic()` redraw.
- **Fixed box:** the stage's `aspect-ratio` is set from the drawing's canvas (viewBox) the first time it is drawn and
  never changes; a canvas that changes size later is letterboxed (`preserveAspectRatio: meet`). This removed the
  136 px schematic-height shifts.
- **View:** opens fitted to the canvas (`svg.dataset.base`); zoom 1×–8×; pan/zoom only rewrite the viewBox inside
  `requestAnimationFrame`. The relative zoom and centre are kept across redraws (moving a slider never resets it).
- **Input:** wheel zooms only while the stage is active (clicked/focused) or with Ctrl/⌘; mouse drag pans when
  zoomed; touch: `touch-action: pan-y` on the drawing (one finger scrolls the page), two fingers pinch/pan;
  `.sc-handle` keeps `touch-action: none` (one-finger drag). Controls (− + Reset view) in a fixed 34 px bar below the
  stage; double-click and `0` reset; `+`/`−`, arrows when focused; Esc leaves.
- `withBase(fn)` runs `fn` with the fitted view — used by Export so a zoomed view still exports the whole drawing.
  The ⓘ drawer copy maps element boxes through `getScreenCTM()` and starts from `dataset.base`.
- **Plots** are deliberately *not* in a viewport: the Quality Gate found no plot that gains from pan/zoom; they are
  fixed-height, fit-to-box figures with hover read-outs.
- `plots[].when(v)` hides a plot that only applies to some input choices (like `fields[].when`); a plot whose
  `build` returns `null` for the current data keeps its card and says "Not available for these inputs".
- **Check:** `npm run test:ui-diagrams` (`scripts/ui-diagrams.mjs`), laptop (×1 CPU, 1280 px) and phone
  (×4 CPU, 375 px, touch) profiles: fitted on load, fixed box under a slider sweep, ≥5× zoom, mouse/two-finger pan
  with frame p95 ≤ 20 ms and no long tasks, view kept on input change, Reset/double-click return to fit, plain wheel
  scrolls the page, Ctrl+wheel zooms, touch-action values.

### NumberField / SliderInput (`ui/form.js` → `numberField`)
- One grid row: label column `minmax(0, 1fr)`, control column `160px`; the unit sits in its own `min-width: 5ch`
  cell inside the control and never wraps (`white-space: nowrap`).
- Slider (`field.slider = { min, max, step }`) in its own full-width row; `step` snaps the value.
- Validation messages float under the control (`.err-msg`, absolutely positioned, `role="alert"`), so an error
  never moves the fields below.

### ResultValue (`calculator-page.js` → key-result cards `.kr` and results-table rows)
- **Central formatter:** `fmt(x, { digits })` in `util.js` (significant digits; scientific `×10ⁿ` beyond 1e7 or
  below 1e-4; at most 13 characters). Every displayed result goes through `toDisplay()` then `fmt()`.
  Invalid/pending values show "—".
- Key-result card: value + unit on one line (`nowrap`), value font scales with the card (`11cqi`); the note area
  always reserves two lines (clamped, full text in the tooltip) when the result defines a note.
- Results table: `table-layout: fixed`; value column `13ch + 32px`, unit column `8ch + 24px`; on phones each row is
  a grid with the label on its own line and the value/unit in fixed cells below.
- `scrollbar-gutter: stable` on the page and the inputs panel.

## UI performance and layout lessons

- **Lag cause (measured, DISCOVERY.md §6):** synchronous full recompute and rebuild of every chart on every
  pointer/slider event — not SVG node count. Fix: frame coalescing + deferred, visibility-gated charts. Result at ×4
  CPU: Subsonic CP 86 → 21 ms per drag step, Fin Flutter 50 → 18 ms (60 fps), no long tasks.
- **Layout-shift causes (DISCOVERY.md §7):** auto-layout table, wrapping card notes, input-dependent schematic
  height, validation rows. Each fixed as above; the diagram height is fixed by `DiagramViewport`.
- **Charts that change height:** a plot builder returning `null` used to hide its card (everything below jumped
  600–900 px); a legend that appears/disappears with the number of non-empty series, wraps when labels change, grows
  a horizontal scrollbar, or contains maths that changes the line height all moved the page. Now: `chart.empty()`
  keeps the card; the legend lists the defined series, stays on one row with fixed-height buttons, no scrollbar, and
  keeps its row once shown.
- **Test flakiness:** under parallel runs a page may still be drawing when the baseline is taken; the test waits
  until two snapshots 200 ms apart are identical.
- **Drawings:** the "forced full zoom" was `width: 100%; height: auto` (always scaled to the card) plus
  `touch-action: none` (no pinch, page scroll trapped on phones). DiagramViewport fixes both; pan/zoom never
  recomputes. Dragging a *handle* still redraws the drawing every frame (≈ 30 fps at ×4 CPU on Subsonic CP).
- **Fixed overlays cover controls:** the warning dock (bottom-right, fixed) can sit over a diagram's Reset button
  when that bar is near the bottom of the screen; the test scrolls the bar up first. Backlog: offset the dock or
  move controls when overlapped.
- **Lazy rendering trap:** a chart that has never rendered has no height, so lazily drawing it on first scroll moves
  the page. Every chart is drawn on a full recompute; only *updates* are deferred.
- **Check:** `npm run test:ui-layout` (scripts/ui-layout.mjs) — sweeps every slider at 320/768/1280 px in SI and US
  and types 0.001, 1e6, −1 and empty into every number field at 320 px; fails on > 1 px movement, a wrapped unit, or
  NaN/undefined/Infinity on screen. Needs `npm install` (puppeteer-core) and `CHROME=/path/to/chromium`.
