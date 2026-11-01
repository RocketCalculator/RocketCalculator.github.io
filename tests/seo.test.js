// Every indexable page carries its SEO block and is in the sitemap; the sitemap lists only real pages.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = 'site', ORIGIN = 'https://rocketcalculator.github.io/';
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const sitemap = [...readFileSync(join(root, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

test('seo: indexable pages have a canonical, Open Graph tags and JSON-LD, and are in the sitemap', () => {
  const expected = [];
  for (const p of walk(root).filter((f) => f.endsWith('.html'))) {
    const rel = relative(root, p).split(sep).join('/'), s = readFileSync(p, 'utf8');
    const canon = s.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
    if (/http-equiv="refresh"/.test(s)) { assert.ok(canon?.startsWith(ORIGIN), `${rel}: redirect needs an absolute canonical`); continue; }
    if (/name="robots" content="noindex/.test(s)) continue;
    const url = ORIGIN + rel.replace(/(^|\/)index\.html$/, '$1');
    assert.equal(canon, url, `${rel}: canonical (run node scripts/seo.mjs)`);
    assert.match(s, /property="og:image" content="[^"]+og-image\.png"/, `${rel}: og:image`);
    JSON.parse(s.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
    expected.push(url);
  }
  assert.deepEqual([...sitemap].sort(), expected.sort());
  assert.ok(existsSync(join(root, 'assets/og-image.png')) && existsSync(join(root, 'robots.txt')));
});
