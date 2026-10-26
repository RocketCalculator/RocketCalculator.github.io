// Slider sweep (CALCULATOR-SPEC §9 step 2): every slider at seven points; reports refusals, page errors and whether the
// drawing changed ("same" is expected for inputs that only change numbers). Usage: BASE=http://127.0.0.1:PORT/ CHROME=… node scripts/sweep.mjs <slug>
// For every slider: set 7 values across its range (others at default); report page errors, refusals, and whether the drawing changed.
import puppeteer from 'puppeteer-core';
const slug = process.argv[2] || 'nozzle-thrust';
const b = await puppeteer.launch({ executablePath: process.env.CHROME, headless: true, args: ['--no-sandbox'] });
const pg = await b.newPage(); await pg.setViewport({ width: 1280, height: 1000 });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', async (m) => { if (m.type() === 'error') errs.push(m.text() + ' ' + (await Promise.all(m.args().map((a) => a.evaluate((x) => (x && x.stack) || String(x)).catch(() => '')))).join(' ').slice(0, 400)); });
await pg.goto((process.env.BASE || 'http://127.0.0.1:8765/') + 'index.html'); await pg.evaluate(() => localStorage.clear());
await pg.goto(`http://127.0.0.1:8765/calculators/${slug}.html`, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 800));
const sliders = await pg.$$eval('.calc-inputs input[type=range]', (els) => els.map((e, i) => ({ i, id: e.closest('.field')?.querySelector('input:not([type=range])')?.id || e.id || i, min: +e.min, max: +e.max })));
const snap = () => pg.evaluate(() => ({
  geo: [...document.querySelectorAll('.calc-outputs svg path')].slice(0, 400).map((p) => p.getAttribute('d') || '').join('|').length + ':' + [...document.querySelectorAll('.calc-outputs svg path')].map((p) => p.getAttribute('d') || '').join('').split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0),
  refused: document.querySelector('.calc-outputs .verdict')?.innerText.includes('NO VERDICT') || !!document.querySelector('.notice.err')?.innerText.match(/must|cannot|never/),
  msg: (document.querySelector('.notice.err')?.innerText || '').slice(0, 140),
}));
const reset = async () => { await pg.click('button[title="Restore default inputs"]'); await new Promise((r) => setTimeout(r, 300)); };
for (const sl of sliders) {
  await reset();
  if (process.argv[3]) { await pg.select('select#f-type', process.argv[3]); await new Promise((r) => setTimeout(r, 300)); }
  const base = await snap(); const rows = [];
  for (const f of [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1]) {
    await pg.evaluate((i, f) => { const s = document.querySelectorAll('.calc-inputs input[type=range]')[i]; s.value = String(+s.min + (+s.max - +s.min) * f); s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); }, sl.i, f);
    await new Promise((r) => setTimeout(r, 1200));
    const s = await snap(); rows.push(`${f}:${s.refused ? 'REFUSED ' + s.msg : s.geo === base.geo ? 'same' : 'ok'}`);
  }
  console.log(sl.id, '|', rows.join('  '));
}
console.log('page errors:', errs.slice(0, 5));
await b.close();
