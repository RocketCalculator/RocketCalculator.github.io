// Touch audit at phone size (390 px, touch emulation): small tap targets, fields that make iOS zoom (< 16 px),
// nested scroll boxes, horizontal overflow, and whether a one-finger vertical swipe starting on each kind of element
// (hero, drawing, plot, slider, key results, report, verdict) scrolls the page. Swipe distances near 0 mean a trap.
// Usage: BASE=http://127.0.0.1:8765/ CHROME=/path/to/chrome node scripts/touch-audit.mjs index.html calculators/fin-flutter.html
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: process.env.CHROME });
for (const path of process.argv.slice(2)) {
  const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(process.env.BASE + path, { waitUntil: 'networkidle0' }); await new Promise((r) => setTimeout(r, 900));
  const audit = await p.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    const small = {}, zoom = {};
    for (const e of document.querySelectorAll('button, a, input, select, textarea, [role=slider], summary, [tabindex="0"]')) {
      if (!vis(e) || e.closest('.site-footer, p, li, td, .doc, .refs-list, .crumb, nav.breadcrumb')) continue;
      const r = e.getBoundingClientRect(), k = e.tagName.toLowerCase() + '.' + (typeof e.className === 'string' ? e.className : e.getAttribute('class') || '').trim().split(/\s+/).slice(0, 2).join('.');
      if (Math.min(r.width, r.height) < 32) (small[k] ||= []).push(Math.round(Math.min(r.width, r.height)));
      if (/INPUT|SELECT|TEXTAREA/.test(e.tagName) && e.type !== 'range' && e.type !== 'checkbox' && parseFloat(getComputedStyle(e).fontSize) < 16) zoom[k] = getComputedStyle(e).fontSize;
    }
    const nested = [...document.querySelectorAll('*')].filter((e) => { const cs = getComputedStyle(e); return /auto|scroll/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 4 && vis(e) && e !== document.documentElement && e !== document.body; })
      .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} ${e.clientHeight}/${e.scrollHeight}`);
    return { small: Object.fromEntries(Object.entries(small).map(([k, v]) => [k, `${v.length}× min ${Math.min(...v)}px`])), zoom, nested, overflowX: document.documentElement.scrollWidth > innerWidth };
  });
  // a one-finger vertical swipe starting on each kind of element must scroll the page
  const swipe = {};
  for (const sel of ['.hero-art svg', '.dv', '.plot-grid svg', '.field input[type=range]', '.key-results', '.report-preview', '.verdict']) {
    const el = await p.$(sel); if (!el) continue;
    await el.evaluate((e) => e.scrollIntoView({ block: 'center' })); await new Promise((r) => setTimeout(r, 200));
    const bx = await el.boundingBox(); if (!bx) continue;
    const y0 = await p.evaluate(() => scrollY);
    const cdp = await p.createCDPSession(), x = bx.x + bx.width / 2, y = bx.y + Math.min(bx.height / 2, 300);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 25 }] }); await new Promise((r) => setTimeout(r, 16)); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await new Promise((r) => setTimeout(r, 400));
    swipe[sel] = Math.round((await p.evaluate(() => scrollY)) - y0);
  }
  console.log('==', path, JSON.stringify({ ...audit, swipe, errs }, null, 1));
  await p.close();
}
await b.close();
