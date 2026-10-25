// Layout-stability acceptance test (KNOWLEDGE.md → "UI performance and layout lessons").
// For every calculator, width and unit system: record the boxes of every input field, key-result card, results-table
// cell, plot card and diagram; sweep each visible slider from min to max; fail if anything moves or resizes by more
// than 1 px, if a unit wraps away from its value, or if NaN / undefined / Infinity is shown. An extreme-value pass
// types 0.001, 1e6, −1 and an empty string into each number field (at the narrowest width) with the same checks.
//
// Usage: npm run test:ui-layout [-- --widths 320,768,1280 --units si,us --only subsonic-cp,fin-flutter --parts … --jobs 4]
// Needs puppeteer-core (devDependency) and a Chromium-family browser: set CHROME=/path/to/chrome, otherwise
// /usr/bin/chromium, /usr/bin/google-chrome or /usr/bin/chromium-browser is used.
import puppeteer from 'puppeteer-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const SITE = new URL('../site/', import.meta.url).pathname;
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const widths = arg('widths', '320,768,1280').split(',').map(Number);
const systems = arg('units', 'si,us').split(',');
const PARTS = {
  inputs: '.calc-inputs .field',
  cards: '.kr',
  table: '.results-table td.v, .results-table td.u',
  plots: '.plot-grid > .card',
  diagrams: '.schem-host',
};
const parts = arg('parts', Object.keys(PARTS).join(',')).split(',');
const reg = JSON.parse(readFileSync(join(SITE, 'js/registry.json'), 'utf8'));
const only = arg('only', '');
const slugs = only ? only.split(',') : reg.calculators.map((c) => c.slug);
const extremes = arg('extremes', 'yes') !== 'no';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.png': 'image/png' };
const server = createServer((req, res) => {
  const p = normalize(decodeURIComponent(req.url.split(/[?#]/)[0])).replace(/^(\.\.[/\\])+/, '');
  let f = join(SITE, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f));
}).listen(0);
const BASE = `http://127.0.0.1:${server.address().port}/`;
const exe = process.env.CHROME || ['/usr/bin/chromium', '/usr/bin/google-chrome', '/usr/bin/chromium-browser'].find(existsSync);
if (!exe) { console.error('No Chromium-family browser found: set CHROME=/path/to/chrome'); process.exit(2); }
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });

const settle = (page, ms = 170) => page.evaluate((ms) => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, ms)))), ms);
// runs in the page: boxes of every watched element, unit-wrap and bad-text checks
const probe = (sel) => {
  const boxes = {};
  for (const [part, s] of Object.entries(sel)) [...document.querySelectorAll(s)].forEach((e, i) => {
    if (!e.offsetParent) return;
    const r = e.getBoundingClientRect(); boxes[`${part}#${i}`] = [r.left + scrollX, r.top + scrollY, r.width, r.height];
  });
  const wraps = [];
  for (const card of document.querySelectorAll('.kr')) {
    const v = card.querySelector('.kr-value'), u = card.querySelector('.kr-unit');
    if (v && u && u.getBoundingClientRect().top > v.getBoundingClientRect().top + v.getBoundingClientRect().height / 2) wraps.push(`key result ${card.dataset.result}`);
  }
  for (const td of document.querySelectorAll('.results-table td.u, .field .unit')) if (td.offsetParent && td.scrollHeight > td.clientHeight + 2 && td.textContent.trim()) wraps.push(`unit "${td.textContent.trim()}"`);
  const txt = document.querySelector('.calc-outputs')?.innerText || '';
  const bad = (txt.match(/\bNaN\b|\bundefined\b|\bInfinity\b/g) || []).slice(0, 3);
  // which fields and key results are shown: an input can legitimately show or hide other inputs (a boat-tail length
  // shows the boat-tail angle) and results; that is the question changing, not the layout jumping
  const shown = [...document.querySelectorAll('.calc-inputs .field, .kr')].filter((e) => e.offsetParent).map((e) => e.dataset.for || e.dataset.result).join(',');
  return { boxes, wraps, bad, shown };
};
const compare = (a, b) => {
  const moved = [];
  for (const [k, box] of Object.entries(b)) {
    const o = a[k]; if (!o) continue;
    const d = Math.max(...box.map((x, i) => Math.abs(x - o[i])));
    if (d > 1) moved.push([k, Math.round(d), o[1]]);
  }
  return moved.sort((x, y) => x[2] - y[2]);   // topmost first: that one is the cause, the rest follow it
};

const failures = [], notes = [];
// DEBUG=1: print the first output-column elements whose box changed (the cause of a failure)
const deep = (page) => (process.env.DEBUG ? page.evaluate(() => [...document.querySelectorAll('.calc-outputs *:not(svg *)')].map((e) => { const r = e.getBoundingClientRect(); return `${e.tagName}.${String(e.className).slice(0, 24)} ${Math.round(r.top + scrollY)} ${Math.round(r.height)}`; })) : null);
async function debug(page, what, snap0) {
  if (!process.env.DEBUG) return;
  const now = await deep(page);
  console.log('\n' + what, JSON.stringify(now.map((x, i) => (x !== snap0[i] ? `${snap0[i]} → ${x}` : null)).filter(Boolean).slice(0, 8)));
}
const sel = Object.fromEntries(parts.map((p) => [p, PARTS[p]]));
const jobs = slugs.flatMap((slug) => systems.flatMap((sys) => widths.map((w) => ({ slug, sys, w }))));
const CONCURRENCY = +arg('jobs', 4);
async function run({ slug, sys, w }) {
      // its own context: pages share localStorage otherwise, and the unit system is read from it on every recompute
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();
      await page.setViewport({ width: w, height: 900 });
      await page.goto(BASE + 'index.html');
      await page.evaluate((sys) => { localStorage.clear(); localStorage.setItem('rc-units', JSON.stringify(sys)); }, sys);
      const errs = []; page.on('pageerror', (e) => errs.push(e.message));
      await page.goto(`${BASE}calculators/${slug}.html`, { waitUntil: 'networkidle0' });
      // --hide-diagrams isolates the inputs/results layout from the drawings (used before DiagramViewport existed)
      if (process.argv.includes('--hide-diagrams')) await page.addStyleTag({ content: '.schem-host { display: none !important; }' });
      // a run from top to bottom makes every chart visible once, then the sweep happens with the page at rest
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } scrollTo(0, 0); });
      // the baseline is taken only once the page has stopped changing (fonts, KaTeX, charts drawn after load)
      for (let k = 0, prev = ''; k < 25; k++) { await settle(page, 200); const cur = JSON.stringify((await page.evaluate(probe, sel)).boxes); if (cur === prev) break; prev = cur; }
      const tag = `${slug} @${w}px ${sys}`;
      const sliders = await page.$$eval('.calc-inputs input[type=range]', (els) => els.map((e, i) => (e.offsetParent ? i : -1)).filter((i) => i >= 0));
      const base = await page.evaluate(probe, sel);
      base.deep = await deep(page);
      for (const i of sliders) {
        const id = await page.$$eval('.calc-inputs input[type=range]', (els, i) => els[i].closest('.field')?.dataset.for, i);
        for (const f of [0, 0.25, 0.5, 0.75, 1, 0.5]) {
          await page.$$eval('.calc-inputs input[type=range]', (els, i, f) => { const s = els[i]; s.value = String(+s.min + (+s.max - +s.min) * f); s.dispatchEvent(new Event('input', { bubbles: true })); }, i, f);
          await settle(page);
          const now = await page.evaluate(probe, sel);
          const moved = compare(base.boxes, now.boxes);
          if (moved.length) await debug(page, `${tag} ${id} ${f}`, base.deep);
          if (moved.length) failures.push(`${tag} slider ${id} at ${f * 100}%: ${moved.slice(0, 4).map(([k, d]) => `${k} ${d}px`).join(', ')}${moved.length > 4 ? ` (+${moved.length - 4})` : ''}`);
          if (now.wraps.length) failures.push(`${tag} slider ${id}: unit wraps — ${now.wraps.slice(0, 3).join(', ')}`);
          if (now.bad.length) failures.push(`${tag} slider ${id}: shows ${now.bad.join(', ')}`);
          if (moved.length || now.wraps.length) break;
        }
      }
      if (extremes && w === Math.min(...widths)) {
        const ids = await page.$$eval('.calc-inputs input[type=number]', (els) => els.filter((e) => e.offsetParent).map((e) => e.id));
        const ref = await page.evaluate(probe, sel);
        ref.deep = await deep(page);
        for (const id of ids) {
          const orig = await page.$eval(`#${id}`, (e) => e.value);
          for (const val of ['0.001', '1000000', '-1', '']) {
            await page.$eval(`#${id}`, (e, val) => { e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); }, val);
            await settle(page, 260);
            const now = await page.evaluate(probe, sel);
            const moved = now.shown === ref.shown ? compare(ref.boxes, now.boxes) : [];
            if (now.shown !== ref.shown) notes.push(`${tag} ${id}=${val || '(empty)'} changes which inputs/results are shown`);
            if (moved.length) await debug(page, `${tag} ${id}=${val}`, ref.deep);
            if (moved.length) failures.push(`${tag} ${id}=${val || '(empty)'}: ${moved.slice(0, 4).map(([k, d]) => `${k} ${d}px`).join(', ')}${moved.length > 4 ? ` (+${moved.length - 4})` : ''}`);
            if (now.wraps.length) failures.push(`${tag} ${id}=${val || '(empty)'}: unit wraps — ${now.wraps.slice(0, 3).join(', ')}`);
            if (now.bad.length) failures.push(`${tag} ${id}=${val || '(empty)'}: shows ${now.bad.join(', ')}`);
          }
          await page.$eval(`#${id}`, (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, orig);
          await settle(page, 200);
        }
      }
      if (errs.length) failures.push(`${tag}: page errors — ${errs.slice(0, 2).join(' | ')}`);
      await ctx.close();
      process.stdout.write('.');
}
await Promise.all(Array.from({ length: CONCURRENCY }, async () => { while (jobs.length) await run(jobs.shift()); }));
failures.sort();
await browser.close(); server.close();
console.log(`\n${slugs.length} calculators × ${widths.join('/')} px × ${systems.join('/')}: ${failures.length ? `${failures.length} FAILURES` : 'layout stable'}`);
for (const f of failures) console.log('  ✗ ' + f);
if (notes.length) console.log(`  (${notes.length} extreme values changed which inputs/results are shown — expected, not checked for movement)`);
process.exit(failures.length ? 1 : 0);
