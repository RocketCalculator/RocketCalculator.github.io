# Governance

How decisions are made in Rocket Calculator, who makes them, and how to take on more responsibility.

## Roles

| Role | Who | Can | Becomes one by |
|---|---|---|---|
| **Contributor** | Anyone who opens an issue, comments, or sends a pull request | Everything in [CONTRIBUTING.md](CONTRIBUTING.md) | Taking part |
| **Triager** | Trusted contributors | Label, assign and close issues; mark duplicates; ask for information | Several useful issue reports or reviews; proposed by a maintainer |
| **Reviewer** | Contributors who know part of the code or the physics well | Review and approve pull requests in their area (listed in [CODEOWNERS](.github/CODEOWNERS)) | Several merged pull requests in that area; proposed by a maintainer |
| **Maintainer** | People responsible for the whole project | Merge pull requests, release, change repository settings, enforce the Code of Conduct | Sustained reviewing and good judgement; agreed by the existing maintainers |
| **Lead maintainer** | Dara Rahmat Samii ([@DaraSamii](https://github.com/DaraSamii)) | Everything above; final say when consensus fails | Founder of the project |

Current maintainers are listed in [MAINTAINERS](#maintainers) below. Roles are given on GitHub through the
`RocketCalculator` organisation's teams.

## How decisions are made

- **Day to day: lazy consensus.** A proposal (issue or pull request) that no maintainer objects to within 7 days
  can go ahead. Silence is agreement; an objection must give a reason.
- **Physics and verdict limits** need a maintainer to have checked the cited source. Where the source gives no limit,
  the choice is recorded in [DECISIONS.md](DECISIONS.md) with its reasoning.
- **Larger changes** (a new dependency, a change to the shared page, a licence question, removing a calculator) are
  discussed in an issue labelled `status: needs-decision` and recorded in DECISIONS.md.
- **When consensus fails**, the lead maintainer decides and writes down why.
- **Code of Conduct** reports are handled by the maintainers privately, following [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
  A maintainer involved in a report steps aside from deciding it.

## Issue and pull request management

**Triage** (triagers and maintainers, aim: within 7 days of opening)

1. New issues arrive labelled `status: needs-triage` by the issue forms.
2. Check it is not a duplicate (close with `resolution: duplicate` and a link) and that it has what is needed;
   otherwise ask and label `status: needs-info`. An issue with no answer for 30 days is closed; it can be reopened.
3. Add a `type:` label, an `area:` label and, when it matters, a `priority:` label.
4. Accepted work gets `status: accepted`. Small, well-described tasks also get `good first issue` or `help wanted`.
5. A *Wrong result* report is `priority: high` until a maintainer has checked it against the source. If it is
   confirmed and the error could make a design look safe when it is not, it becomes `priority: critical`: fix it
   first, or put a warning on the calculator until it is fixed.

**Pull requests**

- Every pull request needs a passing `test` check and one approving review from a maintainer or a reviewer of that
  area. While the lead maintainer is the only maintainer, they may merge their own pull requests after CI passes.
- Pull requests are squash-merged; the title must be a Conventional Commit. Branches are deleted on merge.
- Reviewers label pull requests `status: changes-requested` or `status: ready-to-merge`; a pull request waiting on
  its author for 30 days may be closed.

The full label set is defined in [.github/labels.yml](.github/labels.yml).

## Releases

The site deploys continuously: every merge to `main` that touches `site/` goes live. When maintainers decide that a
set of changes is worth announcing, they publish a release:

1. Move the changes from the top of [CHANGELOG.md](CHANGELOG.md) under a version heading.
2. Tag `main` with an annotated tag `vMAJOR.MINOR.PATCH`: **minor** for a new calculator or feature, **patch** for
   fixes and docs, **major** for a change that breaks saved designs or share links.
3. Create a GitHub Release from the tag with the changelog section as its notes.

There are no per-calculator tags.

## Changing this document

Changes to governance, the Code of Conduct or the licences are proposed in a pull request and need the agreement of
all maintainers (while there is one maintainer, the lead maintainer's).

## Maintainers

- Dara Rahmat Samii ([@DaraSamii](https://github.com/DaraSamii)), lead maintainer
