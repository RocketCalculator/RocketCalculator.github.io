// KaTeX, loaded on first use from the vendored copy.
import { url } from './util.js';

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

/** Render TeX into el. Falls back to the raw TeX if KaTeX fails. */
export async function tex(el, src, display = false) {
  const k = await loadKatex();
  try { k.render(src, el, { displayMode: display, throwOnError: false, strict: 'ignore', trust: false }); }
  catch { el.textContent = src; }
}

/** Render every [data-tex] (inline) and [data-tex-display] element under root. */
export async function renderAll(root = document) {
  const nodes = root.querySelectorAll('[data-tex], [data-tex-display], .tex, .tex-display');
  if (!nodes.length) return;
  await loadKatex();
  for (const n of nodes) {
    if (n.dataset.rendered) continue;
    const display = n.hasAttribute('data-tex-display') || n.classList.contains('tex-display');
    const src = n.dataset.tex ?? n.dataset.texDisplay ?? n.textContent;
    await tex(n, src, display);
    n.dataset.rendered = '1';
  }
}
