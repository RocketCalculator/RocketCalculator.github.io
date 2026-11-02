# Security policy

## Supported versions

Rocket Calculator is a static website. Only the live site at <https://rocketcalculator.github.io/>, built from the
`main` branch, is supported; fixes are made on `main` and go live when merged.

## Reporting a vulnerability

**Do not open a public issue.** Report it privately through GitHub:

1. Go to <https://github.com/RocketCalculator/RocketCalculator.github.io/security/advisories/new>
   (repository → **Security** → **Report a vulnerability**).
2. Describe the problem, the page or file, how to reproduce it, and what an attacker could do.

Only the maintainers can see the report. We aim to:

- acknowledge it within **7 days**;
- tell you whether we accept it, and our plan, within **14 days**;
- fix accepted issues as fast as their severity requires, and credit you in the advisory unless you prefer not.

## What is in scope

The site runs entirely in the browser. Things we want to hear about include:

- script injection (XSS) through share links, saved design files, URL parameters or anything else a page reads and
  displays;
- a way to make a calculator show a manipulated result to someone else, for example through a crafted share link;
- vulnerable third-party code bundled in `site/vendor/`;
- problems in the GitHub Actions workflows (for example a way to run code with the repository's permissions).

## Out of scope

- A calculation that is wrong but not caused by an attacker: report it as a
  [*Wrong result* issue](https://github.com/RocketCalculator/RocketCalculator.github.io/issues/new?template=wrong-result.yml).
- Missing security headers that GitHub Pages does not let us set, and reports produced only by automated scanners
  without a demonstrated impact.
