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
