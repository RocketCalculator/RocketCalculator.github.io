# Licences and third-party material

This repository mixes the project's own work with material from other people. Each part has its own terms.

## The project's own work

| What | Licence |
|---|---|
| Code: `site/js/`, `scripts/`, `tests/`, workflows and configuration | [GNU GPL v3.0 or later](LICENSE) (`GPL-3.0-or-later`) |
| Written content and images by the project: theory pages (`site/docs/`), info texts, page copy, `docs/`, README, `site/assets/` images | [Creative Commons Attribution-ShareAlike 4.0](LICENSE-docs) (`CC-BY-SA-4.0`) |

Attribution for reuse of the written content: *“Rocket Calculator, https://rocketcalculator.github.io/, CC BY-SA 4.0”*.

## C. P. Hoult's reports and spreadsheets, and the reference library

The calculators are built from the rocket-engineering reports, memos and Excel workbooks that C. P. Hoult publishes
at [Rocket Science and Engineering Technologies](http://www.rsandt.com/reports.html), and from the papers they cite.
Copies and material derived from them are kept here so that every calculation can be checked against its source:

| Where | What |
|---|---|
| `source/rsandt/` | The original files as downloaded from rsandt.com, unmodified |
| `derived/` | The same documents converted (Word → PDF, `.xls` → `.xlsx`) |
| `data/` | Cells, formulas, macros and text extracted from them |
| `site/references/` | The reference library on the website: RS&T memos, student papers, NACA/NASA reports and journal papers |

**These files are not covered by this project's licences.** Their copyright stays with their authors and publishers.
They are included because they are freely published on rsandt.com (and, for NACA/NASA reports, by the US
government); no other permission is claimed. Do not reuse them on the strength of this repository's licences; go to
the original source.

**Removal on request:** if you hold the rights to one of these documents and want it removed or credited differently,
open a private report as described in [SECURITY.md](SECURITY.md) (title it “Content:”) or contact the maintainers
through GitHub, and we will act promptly.

## Bundled third-party code and fonts

| Component | Where | Licence |
|---|---|---|
| [KaTeX](https://katex.org/) 0.16.11 | `site/vendor/katex/` | MIT, see [its LICENSE](site/vendor/katex/LICENSE) |
| [Inter](https://rsms.me/inter/) font | `site/vendor/fonts/` | SIL Open Font License 1.1, see [LICENSE-Inter-OFL.txt](site/vendor/fonts/LICENSE-Inter-OFL.txt) |

## Data and services used at run time

| Source | Used for | Terms |
|---|---|---|
| [Open-Meteo](https://open-meteo.com/) | Wind and weather forecasts, fetched only when the user asks | CC BY 4.0; attribution shown next to the data |
| [OpenRocket](https://openrocket.info/) material database | Shear moduli offered in Fin Flutter (commit cited in the code) | GPL-3.0 |
