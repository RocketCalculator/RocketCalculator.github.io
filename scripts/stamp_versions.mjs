// Cache-busting for the deployed site (run by the Pages workflow on the copy it uploads, never on the repo):
// GitHub Pages lets browsers cache each file for 10 minutes, so right after a deploy a page could load a new
// calculator module together with an old cached shared module and break. Every HTML page that loads modules gets an
// import map sending each /js/… module to /js/…?v=<content hash>, and the stylesheet link gets the same stamp: a file
// that changed is fetched fresh, an unchanged one stays cached.
// Usage: node scripts/stamp_versions.mjs <site dir>
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';

const root = process.argv[2] || 'site';
const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const hash = (p) => createHash('sha1').update(readFileSync(p)).digest('hex').slice(0, 10);
const url = (p) => '/' + relative(root, p).split(sep).join('/');

const files = walk(root);
const imports = Object.fromEntries(files.filter((p) => p.startsWith(join(root, 'js')) && p.endsWith('.js')).map((p) => [url(p), `${url(p)}?v=${hash(p)}`]));
const css = join(root, 'css', 'site.css'), cssV = hash(css);
const map = `<script type="importmap">${JSON.stringify({ imports })}</script>`;
let n = 0;
for (const p of files.filter((f) => f.endsWith('.html'))) {
  let s = readFileSync(p, 'utf8');
  if (!s.includes('type="module"')) continue;
  s = s.replace(/<script type="importmap">.*?<\/script>\n?/s, '');
  s = s.replace(/(<meta charset="utf-8">)/i, `$1\n${map}`);
  s = s.replace(/(href="[^"]*css\/site\.css)(\?v=[0-9a-f]+)?"/, `$1?v=${cssV}"`);
  writeFileSync(p, s); n++;
}
console.log(`stamped ${n} pages, ${Object.keys(imports).length} modules`);
