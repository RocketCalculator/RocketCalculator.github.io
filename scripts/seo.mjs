// Search-engine and link-preview metadata for every page, plus sitemap.xml and robots.txt.
// Each indexable page gets one block between <!-- seo --> markers after its description: canonical URL, Open Graph and
// Twitter card tags, and schema.org JSON-LD. Redirect pages get an absolute canonical; the 404 page is left alone.
// Run after generate_pages.mjs (and after editing a theory page):   node scripts/seo.mjs
// The Pages workflow runs it again on deploy so the sitemap's lastmod dates follow the latest commits.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative, sep, posix } from 'node:path';

export const ORIGIN = 'https://rocketcalculator.github.io/';
const NAME = 'Rocket Calculator';
const root = process.argv[2] || 'site';
const reg = JSON.parse(readFileSync(join(root, 'js/registry.json'), 'utf8'));
const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
// the address a page is served at: folder index pages without "index.html"
const urlOf = (rel) => ORIGIN + rel.replace(/(^|\/)index\.html$/, '$1');
const lastmod = (files) => {
  const ds = files.filter(existsSync).map((f) => { try { return execFileSync('git', ['log', '-1', '--format=%cs', '--', f], { encoding: 'utf8' }).trim(); } catch { return ''; } }).filter(Boolean);
  return ds.sort().at(-1) || new Date().toISOString().slice(0, 10);
};

const pages = [];
for (const p of walk(root).filter((f) => f.endsWith('.html'))) {
  const rel = relative(root, p).split(sep).join('/');
  let s = readFileSync(p, 'utf8');
  const refresh = s.match(/http-equiv="refresh" content="0; url=([^"]+)"/);
  if (refresh) {
    // a redirect: its canonical names the target in full, and it stays out of the sitemap
    const to = urlOf(posix.normalize(posix.join(posix.dirname(rel), refresh[1])));
    s = s.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${to}">`);
    writeFileSync(p, s);
    continue;
  }
  if (/name="robots" content="noindex/.test(s)) continue;
  const title = unesc(s.match(/<title>([^<]*)<\/title>/)[1]);
  const desc = unesc(s.match(/<meta name="description" content="([^"]*)">/)[1]);
  const url = urlOf(rel), depth = rel.split('/').length - 1, up = '../'.repeat(depth);
  const [dir, file] = rel.includes('/') ? rel.split('/') : ['', rel], slug = file.replace(/\.html$/, '');
  const calc = reg.calculators.find((c) => c.slug === slug);
  const crumbs = [{ name: 'Home', url: ORIGIN }];
  let ld, type = 'website', src = [p];
  if (rel === 'index.html') {
    ld = [{ '@type': 'WebSite', name: NAME, url: ORIGIN, description: desc, inLanguage: 'en' },
      { '@type': 'Organization', name: NAME, url: ORIGIN, logo: `${ORIGIN}assets/apple-touch-icon.png`, sameAs: ['https://github.com/RocketCalculator'] }];
    src.push(join(root, 'js/home.js'));
  } else if (dir === 'calculators' && calc) {
    crumbs.push({ name: calc.title, url });
    ld = [{ '@type': 'WebApplication', name: calc.title, url, description: desc, applicationCategory: 'EngineeringApplication', operatingSystem: 'Any (web browser)',
      isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, isPartOf: { '@type': 'WebSite', name: NAME, url: ORIGIN } }];
    src.push(join(root, `js/calculators/${slug}.js`));
  } else if (dir === 'docs') {
    type = 'article';
    if (calc) crumbs.push({ name: calc.title, url: `${ORIGIN}calculators/${slug}.html` });
    crumbs.push({ name: 'Theory', url });
    ld = [{ '@type': 'TechArticle', headline: title.replace(/ — Rocket Calculator$/, ''), url, description: desc, inLanguage: 'en',
      isPartOf: { '@type': 'WebSite', name: NAME, url: ORIGIN }, publisher: { '@type': 'Organization', name: NAME, url: ORIGIN } }];
  } else {
    crumbs.push({ name: title.replace(/ — Rocket Calculator$/, ''), url });
    ld = [{ '@type': rel.startsWith('about') ? 'AboutPage' : 'CollectionPage', name: title, url, description: desc, isPartOf: { '@type': 'WebSite', name: NAME, url: ORIGIN } }];
    if (rel.startsWith('references')) src.push(join(root, 'js/references.js'));
  }
  if (crumbs.length > 1) ld.push({ '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })) });
  const json = JSON.stringify(ld.length === 1 ? { '@context': 'https://schema.org', ...ld[0] } : { '@context': 'https://schema.org', '@graph': ld }).replace(/</g, '\\u003c');
  const block = `<!-- seo -->
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#25282b">
<link rel="apple-touch-icon" href="${up}assets/apple-touch-icon.png">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ORIGIN}assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Rocket Calculator: a white rocket on a red launch canvas">
<meta property="og:locale" content="en">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${json}</script>
<!-- /seo -->`;
  s = s.replace(/<!-- seo -->[\s\S]*?<!-- \/seo -->\n?/, '');
  s = s.replace(/(<meta name="description" content="[^"]*">\n)/, `$1${block}\n`);
  writeFileSync(p, s);
  pages.push({ url, lastmod: lastmod(src), priority: rel === 'index.html' ? '1.0' : dir === 'calculators' ? '0.9' : dir === 'docs' ? '0.7' : '0.5' });
}
pages.sort((a, b) => b.priority - a.priority || a.url.localeCompare(b.url));
writeFileSync(join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((x) => `  <url><loc>${x.url}</loc><lastmod>${x.lastmod}</lastmod><priority>${x.priority}</priority></url>`).join('\n')}
</urlset>
`);
writeFileSync(join(root, 'robots.txt'), `User-agent: *
Allow: /

Sitemap: ${ORIGIN}sitemap.xml
`);
console.log(`seo: ${pages.length} indexable pages in sitemap.xml`);
