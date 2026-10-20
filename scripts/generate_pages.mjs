// Generate static HTML shells for calculator pages and "coming soon" topic pages from site/js/registry.json.
// Pages are committed; nothing is built at deploy time.   Run: node scripts/generate_pages.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SITE = new URL('../site/', import.meta.url);
const reg = JSON.parse(readFileSync(new URL('js/registry.json', SITE), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function head({ title, description, depth = 1 }) {
  const up = '../'.repeat(depth);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="${up}assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="${up}vendor/fonts/inter-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${up}css/site.css">
<script>try{var t=JSON.parse(localStorage.getItem('rc-theme'));if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}</script>
</head>`;
}

const noscript = '<noscript><div class="wrap" style="padding:40px 0"><p>This calculator needs JavaScript enabled.</p></div></noscript>';

mkdirSync(new URL('calculators/', SITE), { recursive: true });
let n = 0;
for (const c of reg.calculators) {
  const html = `${head({ title: `${c.title} — Rocket Calculator`, description: c.description })}
<body>
<main id="main">${noscript}</main>
<script type="module">
import def from '../js/calculators/${c.slug}.js';
import { mountCalculator } from '../js/calculator-page.js';
mountCalculator(def);
</script>
</body>
</html>
`;
  writeFileSync(new URL(`calculators/${c.slug}.html`, SITE), html); n++;
}
for (const t of reg.topics.filter((x) => x.status === 'soon')) {
  const html = `${head({ title: `${t.title} — Rocket Calculator`, description: t.summary })}
<body data-topic="${t.slug}">
<main id="main">${noscript}</main>
<script type="module">
import { mountTopic } from '../js/topic-page.js';
mountTopic('${t.slug}');
</script>
</body>
</html>
`;
  writeFileSync(new URL(`calculators/${t.slug}.html`, SITE), html); n++;
}
// a topic that was "coming soon" and now has one calculator under another name keeps its old URL as a redirect
for (const t of reg.topics.filter((x) => x.status === 'available' && x.calculators.length === 1 && x.calculators[0] !== x.slug && x.wasSoon)) {
  const to = `${t.calculators[0]}.html`;
  writeFileSync(new URL(`calculators/${t.slug}.html`, SITE), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(t.title)} — Rocket Calculator</title>
<meta http-equiv="refresh" content="0; url=${to}">
<link rel="canonical" href="${to}">
<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
</head>
<body><p>This topic is now a calculator: <a href="${to}">${esc(t.title)}</a>.</p></body>
</html>
`); n++;
}
writeFileSync(new URL('index.html', SITE), `${head({ title: 'Rocket Calculator — sounding-rocket engineering calculators', description: 'Interactive rocket-engineering calculators with schematics, plots and theory: centre of pressure, drag, atmosphere, fin flutter, cant angle, ogive noses and more.', depth: 0 })}
<body>
<main id="main"><noscript><div class="wrap" style="padding:40px 0"><h1>Rocket Calculator</h1><p>This site needs JavaScript enabled.</p></div></noscript></main>
<script type="module">
import { mountHome } from './js/home.js';
mountHome();
</script>
</body>
</html>
`); n++;
mkdirSync(new URL('references/', SITE), { recursive: true });
writeFileSync(new URL('references/index.html', SITE), `${head({ title: 'Reference library — Rocket Calculator', description: 'Every reference document behind the calculators: RS&T memos, student papers and classic NACA and journal papers, viewable in the browser.' })}
<body>
<main id="main">${noscript}</main>
<script type="module">
import { mountReferences } from '../js/references.js';
mountReferences();
</script>
</body>
</html>
`); n++;
console.log(`wrote ${n} pages`);
