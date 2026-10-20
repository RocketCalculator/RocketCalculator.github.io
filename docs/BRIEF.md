# Brief for the website build (Opus 5.5)

**Goal:** a static website, hosted on GitHub Pages (`https://darasamii.github.io/RocketCalculator/`), that re-creates the content of
<http://www.rsandt.com/reports.html> (Rocket Science and Engineering Technologies, C. P. Hoult): rocket-engineering theory write-ups
plus interactive calculators that replace the Excel workbooks.

## What is already in the repo
| Path | Contents |
|---|---|
| `source/rsandt/reports.html`, `reports.md` | Original page (HTML + plain-text) — topic abstracts, citations, colour-code legend for the spreadsheets |
| `source/rsandt/media/` | All 115 linked files, unmodified (33 `.xls`, 1 `.xlsx`, 54 `.doc/.docx`, 15 `.pdf`, 10 `.ppt/.pptx`, 1 `.zip`) |
| `data/catalog.json` | 32 topics → abstract + list of files (machine-readable; `docs/TOPICS.md` is the human view) |
| `derived/docs-pdf/` | Every Word file rendered to PDF (LibreOffice) — **equations are OLE objects in the .doc files, so read the PDF, not text dumps, for formulas** |
| `derived/xlsx/` | Every `.xls` converted to `.xlsx` |
| `data/text/` | `pdftotext -layout` of all PDFs (theory text; equations may be garbled) |
| `data/spreadsheets/*.json` | Every cell of every workbook: cached value `v` and formula `f` — the spec for each calculator |
| `data/vba/*.bas` | VBA macros from the 13 workbooks that use them (needed to port those calculators) |
| `scripts/` | Reproducible pipeline (`build_catalog.py`, `extract_spreadsheets.py`, `extract_text.sh`) |
| `site/` | Deploy root for GitHub Pages (placeholder `index.html`); `.github/workflows/pages.yml` publishes it on push to `main` |

## Notes for the build
- Spreadsheet colour code (from the source page): light blue = user input, magenta = natural constant, clear = output, bright yellow = key result, dark yellow = column header, grey = advisory notes. Most sheets use **English units** — offer SI toggle.
- Each topic = theory page (from the Word doc: derivation, formulas rendered with KaTeX/MathJax, references) + calculator ported from the workbook (check cached values in `data/spreadsheets` as test vectors).
- Attribution: author C. P. Hoult and students (CSULB); keep citations, link back to rsandt.com. **Check redistribution permission before making the repo/site public** — the raw documents are third-party material.
- Pure static site (no server). Put everything deployed under `site/`; relative URLs only (project pages are served under `/RocketCalculator/`).
