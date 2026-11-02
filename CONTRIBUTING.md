# Contributing to Rocket Calculator

Thank you for helping. Rocket Calculator turns C. P. Hoult's rocket-engineering reports into interactive calculators
that people use to judge real rockets, so **a wrong number is the worst bug we can ship**. These rules exist to keep
the physics right and the project pleasant to work on.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to help

| You want to… | Do this |
|---|---|
| Report a result you think is wrong | [Open a *Wrong result* issue](https://github.com/RocketCalculator/RocketCalculator.github.io/issues/new?template=wrong-result.yml) with the calculator's Share link and the source you compared against. |
| Report a bug or a layout problem | [Open a *Bug* issue](https://github.com/RocketCalculator/RocketCalculator.github.io/issues/new?template=bug.yml). |
| Suggest a feature or a new calculator | [Open a *Feature* issue](https://github.com/RocketCalculator/RocketCalculator.github.io/issues/new?template=feature.yml) first, before writing code. |
| Ask a question or share an idea | Use [Discussions](https://github.com/RocketCalculator/RocketCalculator.github.io/discussions), not issues. |
| Report a security problem | Privately, as described in [SECURITY.md](SECURITY.md). Never in a public issue. |
| Fix something | Pick an issue labelled `good first issue` or `help wanted`, say you are on it, then follow the steps below. |

## Before you write code

1. **Find or open an issue.** Every pull request (PR) except a typo fix links to an issue. For a new calculator or
   a change to how a calculator judges a design, wait until a maintainer marks the issue `status: accepted`. This saves
   you from building something that cannot be merged.
2. **Claim it.** Comment that you are working on it; a maintainer assigns it. An issue with no update for 30 days may
   be given to someone else.
3. **Read the guides.** [docs/DEVELOPER-GUIDE.md](docs/DEVELOPER-GUIDE.md) (setup, architecture, tests),
   [docs/CALCULATOR-SPEC.md](docs/CALCULATOR-SPEC.md) (what every calculator page must contain) and
   [docs/DESIGN-GUIDE.md](docs/DESIGN-GUIDE.md) (visual rules).

## Rules for physics and numbers

These are not negotiable, because people fly what these pages tell them.

- **Cite only what you read.** Every equation, constant and threshold names its source (report, page, equation or
  figure number). Never cite a paper you have not opened yourself. Read equations from the page images, not a
  copied text layer.
- **Prove it with a test.** A physics change comes with a test against a published worked example, the original
  workbook's cached values, or a hand calculation you show in the test.
- **Say what is not checked.** A rule of thumb, an extrapolation or a value from another tool is labelled as such
  on the page and on the theory page.
- **Verdict limits** come from the source. When the source has none, the limit is the user's input, and the bands
  around it are recorded in [DECISIONS.md](DECISIONS.md) and called *not a published limit* on the theory page.
- **No source, no feature.** If a behaviour has no source, leave it out and open an issue instead of inventing it.

## Making the change

- **Branch** from `main`: `type/short-description`, for example `fix/flutter-units` or `feat/supersonic-cp`.
- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`,
  `refactor:`, `chore:`, with a scope when it helps (`fix(nozzle): …`). Say *why* in the body.
- **Keep PRs small**: one calculator or one shared change per PR. Large refactors need an accepted issue first.
- **Match the code around you**: vanilla ES modules, no build step, no new runtime dependency without an accepted
  issue. Comment the *why*, not the *what*.
- **Run the checks** in [the developer guide](docs/DEVELOPER-GUIDE.md#checks-before-a-pull-request). For any change you
  can see, attach before/after screenshots at phone (390 px) and desktop (1280 px) widths, light and dark.
- **Update the records**: a dated entry in [CHANGELOG.md](CHANGELOG.md) for anything a user can notice; sources, test
  cases and lessons in [KNOWLEDGE.md](KNOWLEDGE.md); judgement calls in [DECISIONS.md](DECISIONS.md).
- **AI-assisted work is welcome**, but you are responsible for every line: you must understand it, have run it and
  have checked every source it cites. Say in the PR that you used an AI tool.

## Pull request process

1. Open the PR against `main` and fill in the template. Mark it as a draft until it is ready.
2. **CI must pass**: the `test` check runs the whole test suite on every PR. A PR with a failing check is not reviewed.
3. **Review**: a maintainer (see [GOVERNANCE.md](GOVERNANCE.md) and [CODEOWNERS](.github/CODEOWNERS)) reviews within
   about 7 days. Physics changes need a maintainer to check the cited source. Reply to every comment, by a change or
   an answer; the reviewer resolves the conversation.
4. **Merge**: maintainers squash-merge, so the PR title becomes the commit message on `main`. Write it as a
   Conventional Commit. The branch is deleted automatically.
5. A PR with no reply from its author for 30 days may be closed; it can be reopened at any time.

## Licensing of contributions

No contributor agreement and no sign-off are needed. By submitting a contribution you confirm that you have the right
to submit it, and you agree that it is licensed under the project's licences (*inbound = outbound*):

- code (`site/js`, `scripts`, `tests`, configuration): [GPL-3.0-or-later](LICENSE);
- written content and images (theory pages, info texts, documentation): [CC BY-SA 4.0](LICENSE-docs).

Do not add third-party files (papers, data, fonts, code) without an issue that records their licence; see
[THIRD-PARTY.md](THIRD-PARTY.md).
