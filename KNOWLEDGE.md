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
