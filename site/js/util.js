// Small DOM + formatting helpers shared by every page.

export const ROOT = new URL('../', import.meta.url);           // site root (js/ lives directly under it)
export const url = (path) => new URL(path, ROOT).href;

/** Hyperscript: h('div.card#id', {attrs}, ...children). Strings become text nodes. */
export function h(tag, attrs, ...children) {
  const m = /^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i.exec(tag);
  const el = document.createElement(m[1] || 'div');
  for (const part of (m[2] || '').match(/[.#][\w-]+/g) || []) {
    if (part[0] === '.') el.classList.add(part.slice(1)); else el.id = part.slice(1);
  }
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { children.unshift(attrs); attrs = null; }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  append(el, children);
  return el;
}
function append(el, kids) {
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

const SVGNS = 'http://www.w3.org/2000/svg';
/** SVG element factory: s('path', {d, class}). */
export function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const esc = (str) => String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function debounce(fn, ms = 120) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/** Engineering-friendly number formatting: ~5 significant digits, exponent for very small/large. */
export function fmt(v, { digits = 5, fixed } = {}) {
  if (v == null || Number.isNaN(v)) return '—';
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
  if (fixed != null) return minus(v.toFixed(fixed));
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e7 || a < 1e-4) {
    const [m, e] = v.toExponential(digits - 1).split('e');
    return `${minus(trimZeros(m))}×10${sup(e)}`;
  }
  const dec = Math.max(0, digits - 1 - Math.floor(Math.log10(a)));
  let out = v.toFixed(Math.min(dec, 10));
  if (out.includes('.')) out = trimZeros(out);
  if (a >= 1e4) out = groupThousands(out);
  return minus(out);
}
/** Plain machine-readable number (for CSV / inputs). */
export const num = (v, digits = 10) => (v == null || !Number.isFinite(v) ? '' : String(+v.toPrecision(digits)));
const trimZeros = (str) => str.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
const minus = (str) => str.replace(/^-/, '−');
const groupThousands = (str) => { const [i, d] = str.split('.'); return i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (d ? '.' + d : ''); };
const SUP = { '-': '⁻', '+': '', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (e) => String(e).split('').map((c) => SUP[c] ?? c).join('');

export function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = h('div.toast', { role: 'status', 'aria-live': 'polite' }); document.body.append(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 1800);
}

export function download(filename, content, type = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = h('a', { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
  const ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = text; document.body.append(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove(); return ok;
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A design the calculator cannot evaluate, explained to the user in one sentence (not a bug: never logged). */
export class InputError extends Error {
  constructor(message) { super(message); this.name = 'InputError'; }
}

export const storage = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

let regPromise;
export function loadRegistry() {
  regPromise ??= fetch(url('js/registry.json')).then((r) => r.json());
  return regPromise;
}
let refPromise;
export function loadReferences() {
  refPromise ??= fetch(url('references/references.json')).then((r) => r.json());
  return refPromise;
}

/** Fade sections in as they scroll into view. */
export function reveal(root = document) {
  const els = root.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reducedMotion()) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach((e) => io.observe(e));
}
