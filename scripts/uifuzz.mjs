// Needs puppeteer-core and Chrome (set CHROME=path); serve site/ on :8765. Usage: node scripts/uifuzz.mjs [slug …]
// Aggressive UI test for each calculator page: garbage input in every field, every select/bool option, unit switch,
// drag handles and keyboard on handles, report tabs; checks page errors, NaN/undefined text, overflow; screenshots.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
const B = (process.env.BASE || 'http://127.0.0.1:8765/') + 'calculators/';
const slugs = process.argv.slice(2).length ? process.argv.slice(2) : ['nose-cone', 'geophysics', 'bifilar-pendulum', 'fin-flutter', 'fin-cant-angle', 'drag-coefficient', 'subsonic-cp'];
mkdirSync('shots/ui', { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium-browser', headless: true, protocolTimeout: 20000, args: ['--no-sandbox'] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let problems = 0, lastStep = '';
const bad = (slug, msg) => { problems++; console.log(`  ✗ ${slug}: ${msg}`); };
for (const slug of slugs) {
  const page = await browser.newPage(); await page.setViewport({ width: 1300, height: 1000 });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', async (m) => { if (m.type() !== 'error') return; const parts = await Promise.all(m.args().map((a) => a.evaluate((x) => (x instanceof Error ? `${x.name}: ${x.message} @ ${(x.stack || '').split('\n').slice(0, 4).join(' | ')}` : String(x))).catch(() => '?'))); errs.push(`${parts.join(' ')} [after ${lastStep}]`); });
  await page.goto(B + slug + '.html', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(B + slug + '.html', { waitUntil: 'networkidle0' }); await wait(300);
  const outText = () => page.evaluate(() => { const o = document.querySelector('.calc-outputs'); return o ? o.innerText : ''; });
  const badText = async (where) => { const t = await outText(); const m = t.match(/.{0,40}\b(NaN|undefined|Infinity|null)\b.{0,20}/); if (m) bad(slug, `${where}: "${m[0].replace(/\n/g, ' ')}"`); };
  await badText('defaults');
  const ids = await page.$$eval('.calc-inputs input[type=number]', (es) => es.map((e) => e.id));
  const GARBAGE = ['', 'abc', '-1', '0', '1e309', '-1e309', '1e12', '1e-12', '1,5', ' 2 ', '--3', '0x10', '∞'];
  for (const id of ids) {
    const visible = await page.$eval('#' + id, (e) => !!e.offsetParent); if (!visible) continue;
    const orig = await page.$eval('#' + id, (e) => e.value);
    for (const g of GARBAGE) {
      lastStep = `${id}=${JSON.stringify(g)}`; if (process.env.TRACE) console.log('   ', slug, id, JSON.stringify(g));
      await page.click('#' + id, { clickCount: 3 }); await page.keyboard.press('Backspace');
      if (g) await page.type('#' + id, g);
      await wait(160);
      const state = await page.evaluate((id) => {
        const f = document.querySelector(`.field[data-for="${id.slice(2)}"]`);
        return { err: f?.querySelector('.err-msg')?.textContent || '', notice: document.querySelector('.warnings')?.innerText || '' };
      }, id);
      const meta = await page.$eval('#' + id, (e) => ({ optional: e.placeholder === 'optional', bad: e.validity.badInput, v: e.value }));
      const needsErr = meta.optional ? meta.bad || /^-?1e309$/.test(meta.v) : ['', 'abc', '1e309', '-1e309', '--3', '∞'].includes(g);
      if (needsErr && !state.err) bad(slug, `${id} = "${g}" shows no field error`);
      if (!state.err && !/attention|Could not compute/.test(state.notice)) await badText(`${id}="${g}"`);
      if (/Could not compute/.test(state.notice) && !/[A-Z].*[.)]/.test(state.notice)) bad(slug, `${id}="${g}" internal error: ${state.notice}`);
      if (/Could not compute: .*(undefined|null|is not|NaN|Cannot)/.test(state.notice)) bad(slug, `${id}="${g}" crash text: ${state.notice.slice(0, 120)}`);
    }
    await page.$eval('#' + id, (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, orig); await wait(150);
  }
  // selects: every option
  const sels = await page.$$eval('.calc-inputs select[id^="f-"]', (es) => es.map((e) => ({ id: e.id, opts: [...e.options].map((o) => o.value) })));
  for (const s of sels) {
    for (const o of s.opts) {
      lastStep = `${s.id}=${o}`; await page.select('#' + s.id, o); await wait(250);
      const notice = await page.$eval('.warnings', (e) => e.innerText);
      if (!/attention|Could not compute/.test(notice)) await badText(`${s.id}=${o}`);
    }
    await page.select('#' + s.id, s.opts[0]); await wait(200);
  }
  // bools
  const bools = await page.$$eval('.calc-inputs .field.bool input', (es) => es.map((e) => e.id));
  for (const b of bools) { await page.click('#' + b).catch(() => page.$eval('#' + b, (e) => e.click())); await wait(200); await badText(`toggle ${b}`); await page.$eval('#' + b, (e) => e.click()); await wait(150); }
  // units round trip: values identical after SI→US→SI
  const before = await page.$$eval('.calc-inputs input[type=number]', (es) => es.map((e) => e.value));
  await page.click('.seg button[data-sys="us"]'); await wait(400); await badText('US units');
  const usShot = await page.$$eval('.calc-inputs input[type=number]', (es) => es.map((e) => e.value));
  await page.click('.seg button[data-sys="si"]'); await wait(400);
  const after = await page.$$eval('.calc-inputs input[type=number]', (es) => es.map((e) => e.value));
  before.forEach((b, i) => { if (b !== after[i] && Math.abs(+b - +after[i]) > 1e-6 * Math.abs(+b)) bad(slug, `unit round trip field ${i}: ${b} → ${usShot[i]} → ${after[i]}`); });
  // drag handles
  const handles = await page.$$('.schem-host .sc-handle');
  for (const hd of handles) {
    const bb = await hd.boundingBox(); if (!bb) continue; lastStep = 'drag handle';
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down();
    await page.mouse.move(bb.x + 40, bb.y - 30, { steps: 5 }); await page.mouse.move(bb.x - 2000, bb.y + 2000, { steps: 5 }); await page.mouse.up(); await wait(200);
    await badText('after extreme drag');
  }
  const handles2 = await page.$$('.schem-host .sc-handle');
  for (const hd of handles2) { await hd.focus().catch(() => {}); for (let k = 0; k < 30; k++) await page.keyboard.press('ArrowUp'); for (let k = 0; k < 30; k++) await page.keyboard.press('ArrowRight'); }
  await wait(300); await badText('after keyboard on handles');
  // report tabs
  await page.$eval('#report', (e) => e.scrollIntoView()); await wait(500);
  for (const k of ['md', 'tex', 'preview']) {
    const btn = await page.$(`.report-tabs button[data-k="${k}"]`); if (!btn) continue;
    await btn.click(); await wait(300);
    const txt = await page.evaluate(() => { const a = document.querySelector('.report-card textarea'); return (a && !a.hidden ? a.value : document.querySelector('.report-preview')?.innerText) || ''; });
    const m = txt.match(/.{0,40}\b(NaN|undefined|Infinity)\b.{0,20}/); if (m) bad(slug, `report ${k}: ${m[0]}`);
    if (txt.length < 500) bad(slug, `report ${k} too short (${txt.length})`);
  }
  // reset and screenshots
  await page.click('.calc-inputs button[title="Restore default inputs"]'); await wait(400);
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (ov > 0) bad(slug, `horizontal overflow ${ov}px`);
  await page.screenshot({ path: `shots/ui/${slug}-1300.png`, fullPage: true });
  await page.setViewport({ width: 375, height: 800 }); await wait(500);
  const ov2 = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (ov2 > 0) bad(slug, `overflow at 375: ${ov2}px`);
  await page.screenshot({ path: `shots/ui/${slug}-375.png`, fullPage: true });
  for (const e of errs) bad(slug, 'page error: ' + e.slice(0, 200));
  console.log(`${slug}: ${ids.length} numeric fields, ${sels.length} selects, ${bools.length} switches, ${handles.length} handles`);
  await page.close();
}
console.log(problems ? `${problems} PROBLEMS` : 'NO PROBLEMS');
await browser.close();
