# RocketCalculator

Archive + infrastructure for a GitHub Pages site recreating <http://www.rsandt.com/reports.html> (rocket-engineering theory and calculators).
See [docs/BRIEF.md](docs/BRIEF.md) for layout and build notes, [docs/TOPICS.md](docs/TOPICS.md) for the topic → file index.

Rebuild derived data: `python3 scripts/build_catalog.py`, `scripts/extract_text.sh`, and `scripts/extract_spreadsheets.py` (needs `openpyxl`, `oletools`; LibreOffice for the `derived/` conversions).
