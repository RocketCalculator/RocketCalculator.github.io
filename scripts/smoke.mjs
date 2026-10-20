// Headless smoke test of every page (light, dark, 375 px): console errors, HTTP errors, overflow, broken links.
// Needs `npm i puppeteer-core` and Firefox; serve site/ on :8765 first (npm run serve -- 8765). Usage: node scripts/smoke.mjs site
import puppeteer from 'puppeteer-core';
import { readdirSync } from 'node:fs';
const BASE = 'http://127.0.0.1:8765/';
const site = process.argv[2];
const pages = ['index.html', 'references/index.html',
  ...readdirSync(site + '/calculators').map((f) => 'calculators/' + f),
  ...readdirSync(site + '/docs').map((f) => 'docs/' + f)];
const browser = await puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true });
const problems = []; const links = new Set();
for (const [theme, w] of [['light', 1400], ['dark', 1400], ['dark', 375]]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: 900 });
  await page.goto(BASE + 'index.html'); await page.evaluate((t) => localStorage.setItem('rc-theme', JSON.stringify(t)), theme);
  let cur = '';
  page.on('console', async (m) => { if (m.type() === 'error') { let t = m.text(); try { t = await m.args()[0].evaluate((e) => e?.message || String(e)); } catch {} problems.push(`${cur} [${theme}/${w}] console: ${t}`); } });
  page.on('pageerror', (e) => problems.push(`${cur} [${theme}/${w}] pageerror: ${e.message}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${cur} [${theme}/${w}] HTTP ${r.status()} ${r.url()}`); });
  for (const p of pages) {
    cur = p;
    await page.goto(BASE + p, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 300));
    const info = await page.evaluate(() => ({ hrefs: [...document.querySelectorAll('a[href]')].map((a) => a.href), overflow: document.documentElement.scrollWidth - window.innerWidth, main: document.querySelector('main')?.innerText.length || 0 }));
    info.hrefs.filter((h) => h.startsWith('http://127.0.0.1')).forEach((h) => links.add(h.split('#')[0]));
    if (info.overflow > 2) problems.push(`${p} [${theme}/${w}] horizontal overflow ${info.overflow}px`);
    if (info.main < 200) problems.push(`${p} [${theme}/${w}] main content looks empty (${info.main} chars)`);
  }
  await page.close();
}
await browser.close();
for (const l of links) { const r = await fetch(l); if (!r.ok) problems.push(`broken link ${l} → ${r.status}`); }
console.log(`${pages.length} pages × 3 configs, ${links.size} internal links checked`);
console.log(problems.length ? problems.join('\n') : 'NO PROBLEMS');
