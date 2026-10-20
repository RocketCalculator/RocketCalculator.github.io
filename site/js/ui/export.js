// Exporting figures: SVG string → SVG / PNG / JPEG / PDF files, plus a reusable "Export" pill menu.
import { h, url, download, toast } from '../util.js';
import { ICONS } from '../app.js';

let fontCss;
/** @font-face rules with Inter embedded as data URLs, so rasterised SVG keeps its typography. */
async function embeddedFonts() {
  if (fontCss) return fontCss;
  const faces = [[400, 'inter-latin-400-normal.woff2'], [600, 'inter-latin-600-normal.woff2'], [800, 'inter-latin-800-normal.woff2']];
  const rules = [];
  for (const [w, f] of faces) {
    try {
      const buf = await (await fetch(url(`vendor/fonts/${f}`))).arrayBuffer();
      let bin = ''; const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      rules.push(`@font-face{font-family:Inter;font-weight:${w};src:url(data:font/woff2;base64,${btoa(bin)}) format("woff2")}`);
    } catch { /* fall back to system fonts */ }
  }
  fontCss = rules.join('');
  return fontCss;
}

/** Make a standalone SVG string: resolve CSS variables and inline the styles the figure relies on. */
export function standaloneSVG(svgEl, { background = true, extraCss = '' } = {}) {
  const srcAll = [...svgEl.querySelectorAll('*')];
  srcAll.forEach((n, i) => n.setAttribute('data-ei', i));
  const clone = svgEl.cloneNode(true);
  srcAll.forEach((n) => n.removeAttribute('data-ei'));
  clone.querySelectorAll('.sc-handle, [data-export="skip"]').forEach((n) => n.remove());
  clone.querySelectorAll('animate, animateTransform, animateMotion').forEach((n) => n.remove());
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => cs.getPropertyValue(n).trim();
  const resolve = (val) => val?.replace(/var\((--[\w-]+)\)/g, (_, n) => v(n));
  // copy computed presentation for every element (fill/stroke/font), so classes are not needed
  clone.querySelectorAll('[data-ei]').forEach((d) => {
    const n = srcAll[+d.dataset.ei]; d.removeAttribute('data-ei'); if (!n) return;
    const st = getComputedStyle(n);
    const props = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'font-size', 'font-weight', 'font-family', 'paint-order', 'stroke-linejoin', 'stroke-linecap'];
    let style = '';
    for (const p of props) { const val = st.getPropertyValue(p); if (val && val !== 'normal') style += `${p}:${val};`; }
    d.setAttribute('style', style + (d.getAttribute('style') || ''));
    for (const a of ['stroke', 'fill']) if (d.getAttribute(a)?.includes('var(')) d.setAttribute(a, resolve(d.getAttribute(a)));
  });
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const vb = (clone.getAttribute('viewBox') || '0 0 800 400').split(/\s+/).map(Number);
  clone.setAttribute('width', vb[2]); clone.setAttribute('height', vb[3]);
  if (extraCss) { const st = document.createElementNS('http://www.w3.org/2000/svg', 'style'); st.textContent = extraCss; clone.prepend(st); }
  if (background) {
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', vb[0]); r.setAttribute('y', vb[1]); r.setAttribute('width', vb[2]); r.setAttribute('height', vb[3]); r.setAttribute('fill', v('--surface') || '#ffffff');
    clone.insertBefore(r, clone.firstChild);
  }
  return { svg: new XMLSerializer().serializeToString(clone), width: vb[2], height: vb[3] };
}

/** Rasterise an SVG string to a canvas at `scale`. */
async function rasterise(svgStr, w, h, scale = 2, bg = '#ffffff') {
  const fonts = await embeddedFonts();
  const withFonts = svgStr.replace(/(<svg[^>]*>)/, `$1<style>${fonts}</style>`);
  const img = new Image();
  const blobUrl = URL.createObjectURL(new Blob([withFonts], { type: 'image/svg+xml;charset=utf-8' }));
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = blobUrl; });
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(blobUrl);
  return c;
}
const canvasBlob = (c, type, q) => new Promise((res) => c.toBlob(res, type, q));

/** A one-page PDF containing a JPEG image (hand-written PDF, no library). */
async function pdfFromJpeg(jpegBlob, pxW, pxH, imgW, imgH) {
  const jpg = new Uint8Array(await jpegBlob.arrayBuffer());
  const W = (pxW * 0.75).toFixed(2), H = (pxH * 0.75).toFixed(2);   // CSS px → points
  const enc = new TextEncoder();
  const parts = []; const offsets = []; let len = 0;
  const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const obj = (n, body) => { offsets[n] = len; push(`${n} 0 obj\n${body}\nendobj\n`); };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = len;
  push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);
  push(jpg); push('\nendstream\nendobj\n');
  const content = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  const xref = len;
  let x = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) x += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  push(`${x}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}

/** Export an SVG element in the given format. getCsv is optional. */
export async function exportFigure(svgEl, format, name, getCsv) {
  try {
    if (format === 'csv') { download(`${name}.csv`, getCsv(), 'text/csv'); return; }
    const { svg, width, height } = standaloneSVG(svgEl);
    if (format === 'svg') { download(`${name}.svg`, svg, 'image/svg+xml'); return; }
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#ffffff';
    const canvas = await rasterise(svg, width, height, format === 'pdf' ? 3 : 2, bg);
    if (format === 'png') { download(`${name}.png`, await canvasBlob(canvas, 'image/png')); return; }
    const jpeg = await canvasBlob(canvas, 'image/jpeg', 0.95);
    if (format === 'jpeg') { download(`${name}.jpg`, jpeg); return; }
    if (format === 'pdf') download(`${name}.pdf`, await pdfFromJpeg(jpeg, width, height, canvas.width, canvas.height));
  } catch (err) {
    console.error(err);
    toast(`Export failed: ${err.message}`);
  }
}

/** "Export ▾" pill menu. options: {formats, onExport(format)} */
export function exportMenu({ formats = ['csv', 'svg', 'png', 'jpeg', 'pdf'], onExport, label = 'Export' }) {
  const LABELS = { csv: ['CSV', 'data'], svg: ['SVG', 'vector'], png: ['PNG', 'image'], jpeg: ['JPEG', 'image'], pdf: ['PDF', 'document'] };
  const btn = h('button.btn.small', { type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false' }, ICONS.download(), label);
  const pop = h('div.menu-pop', { role: 'menu' }, formats.map((f) => h('button', { type: 'button', role: 'menuitem', 'data-f': f }, LABELS[f][0], h('small', LABELS[f][1]))));
  const wrap = h('div.menu', btn, pop);
  const close = () => { wrap.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !wrap.classList.contains('open');
    document.querySelectorAll('.menu.open').forEach((m) => m.classList.remove('open'));
    wrap.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open));
    if (open) pop.querySelector('button')?.focus();
  });
  pop.addEventListener('click', (e) => { const b = e.target.closest('button[data-f]'); if (b) { close(); onExport(b.dataset.f); } });
  pop.addEventListener('keydown', (e) => {
    const items = [...pop.querySelectorAll('button')]; const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { items[(i + 1) % items.length].focus(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { items[(i - 1 + items.length) % items.length].focus(); e.preventDefault(); }
    if (e.key === 'Escape') { close(); btn.focus(); }
  });
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) close(); });
  return wrap;
}
