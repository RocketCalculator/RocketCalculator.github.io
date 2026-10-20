// Mathematics rendering.
//  • KaTeX (vendored) for HTML: texHTML('C_{N\\alpha}'), rich('Slope $C_{N\\alpha}$ per rad')
//  • svgRich(textEl, 'c_T = 50.8\\,\\mathrm{mm}') — a TeX-lite renderer for SVG <text> (sub/superscripts, Greek)
//  • texToPlain() for CSV / plain-text exports.
import { url, esc } from './util.js';

let ready;
export function loadKatex() {
  if (window.katex) return Promise.resolve(window.katex);
  ready ??= new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = url('vendor/katex/katex.min.css');
    document.head.append(css);
    const js = document.createElement('script');
    js.src = url('vendor/katex/katex.min.js');
    js.onload = () => resolve(window.katex);
    js.onerror = reject;
    document.head.append(js);
  });
  return ready;
}

const cache = new Map();
/** KaTeX HTML string (synchronous once loadKatex() has resolved; falls back to escaped source). */
export function texHTML(src, { display = false, mathml = false } = {}) {
  if (src == null || src === '') return '';
  const key = `${display ? 'D' : 'i'}${mathml ? 'M' : ''}${src}`;
  if (cache.has(key)) return cache.get(key);
  if (!window.katex) return esc(src);
  let out;
  try { out = window.katex.renderToString(src, { displayMode: display, throwOnError: false, strict: 'ignore', output: mathml ? 'mathml' : 'htmlAndMathml' }); }
  catch { out = esc(src); }
  cache.set(key, out);
  return out;
}

/** Text with inline $…$ math → HTML. Non-math parts are escaped unless {html: true}. */
export function rich(str, { html = false } = {}) {
  if (str == null) return '';
  return String(str).split(/(\$[^$]+\$)/g).map((part) =>
    part.startsWith('$') && part.endsWith('$') && part.length > 2 ? texHTML(part.slice(1, -1)) : html ? part : esc(part)).join('');
}

/** Render TeX into el (async-safe). */
export async function tex(el, src, display = false) {
  await loadKatex();
  el.innerHTML = texHTML(src, { display });
}

/** Render every [data-tex], [data-tex-display], .tex and .tex-display under root. */
export async function renderAll(root = document) {
  const nodes = root.querySelectorAll('[data-tex], [data-tex-display], .tex, .tex-display');
  if (!nodes.length) return;
  await loadKatex();
  for (const n of nodes) {
    if (n.dataset.rendered) continue;
    const display = n.hasAttribute('data-tex-display') || n.classList.contains('tex-display');
    const src = n.dataset.tex ?? n.dataset.texDisplay ?? n.textContent;
    n.innerHTML = texHTML(src, { display });
    n.dataset.rendered = '1';
  }
}

/* ---------------- TeX-lite for SVG and plain text ---------------- */
const GREEK = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', eta: 'η', theta: 'θ', lambda: 'λ', mu: 'μ', nu: 'ν', pi: 'π',
  rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', varphi: 'φ', psi: 'ψ', omega: 'ω', xi: 'ξ', kappa: 'κ', zeta: 'ζ', chi: 'χ',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  circ: '°', infty: '∞', cdot: '·', times: '×', pm: '±', approx: '≈', le: '≤', ge: '≥', leq: '≤', geq: '≥', to: '→', partial: '∂', prime: '′', ell: 'ℓ',
  ',': ' ', ';': ' ', ' ': ' ', '!': '', '%': '%', '#': '#', '&': '&',
};
/** Expand TeX commands to Unicode, leaving _ and ^ grouping for the caller. */
/** Read a balanced {…} group starting at s[i] === '{'; returns [content, indexAfter]. */
function group(s, i) {
  let depth = 0, j = i;
  for (; j < s.length; j++) { if (s[j] === '{') depth++; else if (s[j] === '}' && --depth === 0) break; }
  return [s.slice(i + 1, j), j + 1];
}
/** Replace \cmd{arg}[{arg2}] using balanced braces; fn receives the argument strings. */
function replaceCmd(s, names, nargs, fn) {
  const re = new RegExp(`\\\\(${names})\\s*(?=\\{)`, 'g');
  let out = '', last = 0, m;
  while ((m = re.exec(s))) {
    let k = m.index + m[0].length; const args = [];
    for (let a = 0; a < nargs && s[k] === '{'; a++) { const [c, nk] = group(s, k); args.push(c); k = nk; }
    out += s.slice(last, m.index) + fn(m[1], ...args); last = k; re.lastIndex = k;
  }
  return out + s.slice(last);
}
function expand(src) {
  let s = String(src).replace(/\$/g, '');
  for (let i = 0; i < 4; i++) {
    s = replaceCmd(s, 'mathrm|text|textrm|mathit|operatorname|mathbf|boldsymbol|mathsf', 1, (_, a) => a);
    s = replaceCmd(s, 'frac|tfrac|dfrac', 2, (_, a, b) => `(${a})/(${b})`);
    s = replaceCmd(s, 'sqrt', 1, (_, a) => `√(${a})`);
    s = replaceCmd(s, 'bar|hat|dot', 1, (c, a) => a + ({ bar: '̄', hat: '̂', dot: '̇' }[c]));
  }
  s = s.replace(/\\left|\\right|\\big|\\Big/g, '').replace(/\{\}/g, '');
  s = s.replace(/\\([A-Za-z]+|[,;! %#&])/g, (m, c) => (c in GREEK ? GREEK[c] : c));
  return s;
}
/** Split expanded TeX into runs of {t, m: 0 | 'sub' | 'sup'}. */
function runs(src) {
  const s = expand(src), out = [];
  let i = 0, buf = '';
  const flush = () => { if (buf) out.push({ t: buf, m: 0 }); buf = ''; };
  while (i < s.length) {
    const c = s[i];
    if ((c === '_' || c === '^') && i + 1 < s.length) {
      flush();
      let j = i + 1, content;
      if (s[j] === '{') { let depth = 1, k = j + 1; while (k < s.length && depth) { if (s[k] === '{') depth++; else if (s[k] === '}') depth--; k++; } content = s.slice(j + 1, k - 1); i = k; }
      else { content = s[j]; i = j + 1; }
      out.push({ t: content.replace(/[{}]/g, '').replace(/[_^]/g, ''), m: c === '_' ? 'sub' : 'sup' });
      continue;
    }
    if (c !== '{' && c !== '}') buf += c;
    i++;
  }
  flush();
  return out;
}
const SUP = { '°': '°', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '−': '⁻', '+': '⁺', n: 'ⁿ' };
/** Plain-text version (superscripts as Unicode where possible, subscripts with underscores). */
export function texToPlain(src) {
  if (src == null) return '';
  return runs(src).map(({ t, m }) => (m === 'sup' ? ([...t].every((ch) => SUP[ch]) ? [...t].map((ch) => SUP[ch]).join('') : `^${t}`) : m === 'sub' ? `_${t}` : t)).join('').replace(/ /g, ' ');
}
/** Fill an SVG <text> element with tspans rendering the TeX-lite string. */
export function svgRich(el, src, size = 11.5) {
  while (el.firstChild) el.removeChild(el.firstChild);
  const NS = 'http://www.w3.org/2000/svg';
  let shift = 0;
  for (const { t, m } of runs(src)) {
    const ts = document.createElementNS(NS, 'tspan');
    const target = m === 'sub' ? size * 0.32 : m === 'sup' ? -size * 0.42 : 0;
    if (target !== shift) { ts.setAttribute('dy', String(target - shift)); shift = target; }
    if (m) ts.setAttribute('font-size', `${(size * 0.74).toFixed(1)}px`);
    ts.textContent = t;
    el.append(ts);
  }
  if (shift) { const ts = document.createElementNS(NS, 'tspan'); ts.setAttribute('dy', String(-shift)); ts.textContent = '​'; el.append(ts); }
  return el;
}
/** True if a string contains TeX-lite markup worth rendering. */
export const hasTeX = (s) => /[_^\\]/.test(String(s ?? ''));
