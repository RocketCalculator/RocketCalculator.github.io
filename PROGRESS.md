# Progress — overhaul run

Running log of the overhaul (plan given 2026-10-25). Newest last. Read with `DECISIONS.md`, `BLOCKERS.md` and
`KNOWLEDGE.md`. The log of the first build is `docs/PROGRESS.md`.

## 2026-10-25 — Phase −1: hosting

**State detected:** remote `git@github.com:DaraSamii/RocketCalculator.git`, only branch `main` (cad91bb), no tags,
Pages from GitHub Actions (`pages.yml`, publishes `site/`). Organization `RocketCalculator` does not exist; it could not
be created (no public API, no `admin:org` scope, no browser connected) → B1. Proceeded at the current address (D2).

**Audit (read-only):**
- Old-address references: `README.md` (Live line), `docs/BRIEF.md`, `docs/OPUS_PROMPT.md` (planning docs),
  `site/js/app.js` `REPO_URL` (must stay until the move, D3), `tests/aggressive.test.js` location stub, CHANGELOG header.
- Root-absolute paths in `site/`: none. `<base>`, service worker, web manifest, sitemap, canonical/OG URLs: none
  (canonical links exist only in generated redirect pages and are relative).
- `location`/`history` use: hash-based state (`#s=` share links, `#info`, docs anchors, reference ids) and
  `location.origin + location.pathname` — all path-independent.
- Storage keys listed in KNOWLEDGE.md → Hosting; all reset on an origin change.

**Changes (branch `chore/hosting-migration`):** `404.html` with a path-aware base; README and test fixture cleaned;
logs created. Remaining URL edits are listed in B1 for after the move.

**Merged:** PR #1 (`44358b8`), Pages deploy succeeded, live check: 83 pages × light/dark/375 px with no console or
HTTP errors; the custom 404 is served for a missing deep path with styles and a working home link.
**Tagged:** `baseline-pre-overhaul` on `44358b8`.

## 2026-10-25 — Step 0: discovery

`DISCOVERY.md` written (branch `docs/discovery`). Main findings:
- Lag: synchronous full recompute on every slider/handle event rebuilds every chart and the schematic; 45–115 ms
  per drag step at ×4 CPU (≈ 9–20 fps). Not SVG node count. Schematics block page scroll (`touch-action: none`)
  and are always scaled to the card width.
- Layout shift: auto-layout results table (up to 480 px), wrapping key-result notes (15–20 px), input-dependent
  schematic height (136 px), validation rows in the input column.
- Fin count is an input in 7 calculators; 116 diagrams inventoried with first-pass verdicts.
- Phase 2 order decided (§9): Subsonic CP first, then recovery, trajectory, launcher, structures.

**Next:** Phase 0 — `shared/number-field` (layout-stable inputs/results + recompute per frame), then
`shared/diagram-viewport`, then `shared/rocket-back-view`, each with tests, merged and tagged before Phase 1.

## 2026-10-25 — Phase 0: shared foundations (done)

| Tag | PR | What |
|---|---|---|
| `v1.1.0` | #3 `shared/number-field` | per-frame recompute, deferred visible-only charts; fixed results table, reserved notes, floating validation, stable legends; `npm run test:ui-layout` |
| `v1.2.0` | #4 `shared/diagram-viewport` | every drawing in a fixed, fitted, zoomable, scroll-safe viewport; `plots[].when`; `npm run test:ui-diagrams` |
| `v1.3.0` | #5 `shared/rocket-back-view` | to-scale rear view under all 7 fin-count inputs; `tests/backview.test.js` |

**Verified:** `npm test` 283/283; layout stable for 29 calculators × 320/768/1280 px × SI/US (slider sweeps and extreme
values); diagram interaction 29/29 on laptop and ×4-CPU phone profiles (pan p95 ≤ 20 ms); smoke 83 pages × 3 configs;
live pages checked after each deploy.
**Uncertain:** Barrowman fin-interference beyond 4 fins (D12). Handle drags still redraw the drawing each frame
(≈30 fps at ×4 CPU on Subsonic CP).
**Next:** `shared/verdict-tiers` (verdict banner + Explore section, opt-in), then Phase 1 Fin Flutter.
