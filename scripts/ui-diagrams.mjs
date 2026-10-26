// Diagram-interaction acceptance test (KNOWLEDGE.md → DiagramViewport). For every calculator with a drawing:
//  1. it opens fitted (zoom 1, viewBox = the drawing's canvas) and its box keeps its size while a slider moves;
//  2. zoom reaches 5× with the + button and Ctrl+wheel; a mouse drag pans; pan/zoom frames stay smooth on a laptop
//     profile (CPU ×1, 1280 px) and an emulated mid-range phone (CPU ×4, 375 px): frame p95 ≤ 20 ms, no long tasks;
//  3. the view is kept when an input changes; Reset and double-click return to the fitted view;
//  4. the plain mouse wheel over an inactive drawing scrolls the page and does not zoom;
//  5. touch: the drawing lets one finger scroll the page (touch-action pan-y), handles keep one-finger drag (none).
// Usage: npm run test:ui-diagrams [-- --only nose-cone,fin-flutter --jobs 4]   (CHROME=/path/to/chromium)
import puppeteer from 'puppeteer-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const SITE = new URL('../site/', import.meta.url).pathname;
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const reg = JSON.parse(readFileSync(join(SITE, 'js/registry.json'), 'utf8'));
const slugs = arg('only', '') ? arg('only', '').split(',') : reg.calculators.map((c) => c.slug);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  let f = join(SITE, normalize(decodeURIComponent(req.url.split(/[?#]/)[0])).replace(/^(\.\.[/\\])+/, ''));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f));
}).listen(0);
const BASE = `http://127.0.0.1:${server.address().port}/`;
const exe = process.env.CHROME || ['/usr/bin/chromium', '/usr/bin/google-chrome', '/usr/bin/chromium-browser'].find(existsSync);
if (!exe) { console.error('No Chromium-family browser found: set CHROME=/path/to/chrome'); process.exit(2); }
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });
const failures = [];
const PROFILES = [{ name: 'laptop', width: 1280, cpu: 1, touch: false }, { name: 'phone', width: 375, cpu: 4, touch: true }];

async function check(slug, prof) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const tag = `${slug} [${prof.name}]`, fail = (m) => failures.push(`${tag}: ${m}`);
  await page.setViewport({ width: prof.width, height: 800, hasTouch: prof.touch, isMobile: prof.touch });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`${BASE}calculators/${slug}.html`, { waitUntil: 'networkidle0' });
  const has = await page.$('.dv');
  if (!has) { if (await page.$('.schem-host')) fail('drawing is not in a DiagramViewport'); await ctx.close(); return; }
  const vb = () => page.$eval('.dv svg.schem', (s) => ({ vb: s.getAttribute('viewBox'), base: s.dataset.base }));
  const parse = (s) => s.split(/[ ,]+/).map(Number);
  const same = (a, b) => { const x = parse(a), y = parse(b); return x.every((q, i) => Math.abs(q - y[i]) <= 1e-6 * Math.max(1, Math.abs(y[i]))); };
  const frames = (ms = 120) => page.evaluate((ms) => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, ms)))), ms);
  // 1. fitted on load, fixed box
  let v = await vb();
  if (!same(v.vb, v.base)) fail(`does not open fitted (${v.vb} vs ${v.base})`);
  const box0 = await page.$eval('.dv', (e) => { const r = e.getBoundingClientRect(); return [r.width, r.height]; });
  const slider = await page.$('.calc-inputs input[type=range]');
  if (slider) {
    for (const f of [0, 1, 0.5]) {
      await page.$eval('.calc-inputs input[type=range]', (s, f) => { s.value = String(+s.min + (+s.max - +s.min) * f); s.dispatchEvent(new Event('input', { bubbles: true })); }, f);
      await new Promise((r) => setTimeout(r, 150));
      const b = await page.$eval('.dv', (e) => { const r = e.getBoundingClientRect(); return [r.width, r.height]; });
      if (Math.abs(b[0] - box0[0]) > 1 || Math.abs(b[1] - box0[1]) > 1) { fail(`box resized ${box0.map(Math.round)} → ${b.map(Math.round)} with a slider`); break; }
    }
  }
  // 4. a plain wheel over the inactive drawing scrolls the page, does not zoom
  await page.evaluate(() => { document.activeElement?.blur(); document.querySelector('.dv').scrollIntoView({ block: 'center' }); });
  const r = await page.$eval('.dv', (e) => { const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
  if (!prof.touch) {
    const y0 = await page.evaluate(() => scrollY);
    await page.mouse.move(r.x, r.y); await page.mouse.wheel({ deltaY: 200 }); await frames(200);
    v = await vb();
    if (!same(v.vb, v.base)) fail('the plain wheel zoomed an inactive drawing');
    if ((await page.evaluate(() => scrollY)) === y0) fail('the plain wheel over the drawing did not scroll the page');
  }
  // 5. touch-action
  const ta = await page.$eval('.dv svg.schem', (s) => getComputedStyle(s).touchAction);
  if (!/pan-y/.test(ta)) fail(`drawing touch-action is "${ta}", one finger cannot scroll the page`);
  const th = await page.$eval('.sc-handle', (s) => getComputedStyle(s).touchAction).catch(() => 'none');
  if (th !== 'none') fail(`handle touch-action is "${th}"`);
  // 2. zoom to ≥ 5× with the + button, then pan with the mouse (or measure the button zoom on the phone)
  await page.evaluate(() => document.querySelector('.dv').scrollIntoView({ block: 'center' }));
  for (let i = 0; i < 4; i++) { await page.click('.dv-bar button[aria-label="Zoom in"]'); await frames(40); }
  v = await vb();
  const z = parse(v.base)[2] / parse(v.vb)[2];
  if (!(z >= 5)) fail(`zoom reached only ${z.toFixed(2)}×`);
  const cdp = await page.createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: prof.cpu });
  await page.evaluate(() => {
    window.__lt = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push(e.duration); }).observe({ type: 'longtask' });
    window.__fr = []; let last = performance.now(); const tick = (t) => { window.__fr.push(t - last); last = t; if (window.__fr.length < 4000) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  });
  const rr = await page.$eval('.dv', (e) => { const b = e.getBoundingClientRect(); return { x: b.left + b.width * 0.3, y: b.top + b.height * 0.5 }; });
  const before = (await vb()).vb;
  if (prof.touch) {
    // two-finger pan with CDP touch events
    const pts = (dx) => [{ x: rr.x + dx, y: rr.y }, { x: rr.x + 60 + dx, y: rr.y }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(0) });
    for (let i = 1; i <= 30; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(i * 3) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.mouse.move(rr.x, rr.y); await page.mouse.down();
    for (let i = 1; i <= 30; i++) await page.mouse.move(rr.x + i * 4, rr.y + (i % 3));
    await page.mouse.up();
  }
  await frames(300);
  const perf = await page.evaluate(() => { const f = window.__fr.slice(3).sort((a, b) => a - b); return { p95: f[Math.floor(f.length * 0.95)] || 0, lt: window.__lt.length }; });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  if ((await vb()).vb === before) fail(`${prof.touch ? 'two-finger' : 'mouse'} drag did not pan the zoomed drawing`);
  if (perf.p95 > 20) fail(`pan frames p95 ${perf.p95.toFixed(1)} ms (> 20 ms)`);
  if (perf.lt) fail(`${perf.lt} long tasks while panning`);
  // 3. the view survives an input change; Reset returns to fit
  const zoomed = (await vb()).vb;
  if (slider) {
    await page.$eval('.calc-inputs input[type=range]', (s) => { s.value = String(+s.min + (+s.max - +s.min) * 0.6); s.dispatchEvent(new Event('input', { bubbles: true })); });
    await frames(200);
    const after = parse((await vb()).vb), zb = parse(zoomed);
    if (Math.abs(after[2] - zb[2]) / zb[2] > 0.02) fail('the zoom was reset when an input changed');
  }
  // the warning dock is fixed to the bottom corner: bring the bar to the top so the button is not under it
  await page.evaluate(() => scrollTo(0, document.querySelector('.dv-bar').getBoundingClientRect().top + scrollY - 120));
  await page.click('.dv-bar button[aria-label="Reset view"]'); await frames(100);
  v = await vb();
  if (!same(v.vb, v.base)) fail(`Reset did not return to the fitted view (${v.vb} vs ${v.base})`);
  if (!prof.touch) {
    await page.click('.dv-bar button[aria-label="Zoom in"]'); await frames(60);
    const c = await page.$eval('.dv', (e) => { e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.left + 4, y: b.top + 4 }; });
    await page.mouse.click(c.x, c.y, { clickCount: 2 }); await frames(100);
    v = await vb();
    if (!same(v.vb, v.base)) fail('double-click did not reset the view');
    // Ctrl+wheel zooms even when not activated
    await page.evaluate(() => document.activeElement?.blur());
    const rc = await page.$eval('.dv', (e) => { const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    await page.keyboard.down('Control'); await page.mouse.move(rc.x, rc.y); await page.mouse.wheel({ deltaY: -300 }); await page.keyboard.up('Control');
    await frames(120);
    v = await vb();
    if (same(v.vb, v.base)) fail('Ctrl+wheel did not zoom');
  }
  if (errs.length) fail(`page errors — ${errs.slice(0, 2).join(' | ')}`);
  await ctx.close();
  process.stdout.write('.');
}

const jobs = slugs.flatMap((slug) => PROFILES.map((p) => [slug, p]));
await Promise.all(Array.from({ length: +arg('jobs', 3) }, async () => { while (jobs.length) await check(...jobs.shift()); }));
await browser.close(); server.close();
failures.sort();
console.log(`\n${slugs.length} calculators × laptop/phone: ${failures.length ? `${failures.length} FAILURES` : 'diagram interaction OK'}`);
for (const f of failures) console.log('  ✗ ' + f);
process.exit(failures.length ? 1 : 0);
