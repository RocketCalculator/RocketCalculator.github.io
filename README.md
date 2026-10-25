# RocketCalculator

Archive + infrastructure for a GitHub Pages site recreating <http://www.rsandt.com/reports.html> (rocket-engineering theory and calculators).
**Start here for the website build: [docs/OPUS_PROMPT.md](docs/OPUS_PROMPT.md).** See [docs/BRIEF.md](docs/BRIEF.md) for layout and build notes, [docs/TOPICS.md](docs/TOPICS.md) for the topic → file index.

Rebuild derived data: `python3 scripts/build_catalog.py`, `scripts/extract_text.sh`, and `scripts/extract_spreadsheets.py` (needs `openpyxl`, `oletools`; LibreOffice for the `derived/` conversions).

## Website (release 1)
Live: https://darasamii.github.io/RocketCalculator/ (moving to https://rocketcalculator.github.io/ — see `BLOCKERS.md`) — 29 calculators with theory pages and a 69-document reference library. The site uses relative URLs only, so it works at either address.
- Run locally: `npm run serve` then open http://localhost:8000
- Tests: `npm test` (compares each calculator with the original workbook's Excel-cached values)
- Regenerate registry/pages after adding a calculator: `python3 scripts/seed_registry.py && node scripts/generate_pages.mjs`
- Progress and known gaps: [docs/PROGRESS.md](docs/PROGRESS.md); architecture: [docs/PLAN.md](docs/PLAN.md)
