// Right-side ⓘ drawer: short theory, key formula, walkthrough, typical range, link to full docs.
import { h } from '../util.js';
import { ICONS } from '../app.js';
import { tex, renderAll, rich, texToPlain, texHTML } from '../math.js';

let drawer, overlay, body, titleEl, eyebrowEl, footerEl, lastFocus;

function build() {
  overlay = h('div.drawer-overlay', { hidden: true });
  titleEl = h('h2#drawer-title');
  eyebrowEl = h('p.eyebrow');
  body = h('div.drawer-body');
  footerEl = h('footer');
  const closeBtn = h('button.icon-btn.close', { type: 'button', 'aria-label': 'Close' }, ICONS.close());
  drawer = h('aside.drawer', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'drawer-title', tabindex: '-1' },
    h('header', h('div', eyebrowEl, titleEl), closeBtn), body, footerEl);
  document.body.append(overlay, drawer);
  closeBtn.addEventListener('click', closeInfo);
  overlay.addEventListener('click', closeInfo);
  drawer.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); closeInfo(); }
    if (e.key === 'Tab') {                                  // focus trap
      const f = [...drawer.querySelectorAll('a[href], button, input, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  });
}

/**
 * info = { eyebrow, title, text (string|Node|array), tex, texNote, steps[], range, doc (href), refs: [{title, href}] }
 */
export function openInfo(info) {
  if (!drawer) build();
  lastFocus = document.activeElement;
  eyebrowEl.textContent = info.eyebrow || 'How it works';
  titleEl.innerHTML = rich(info.title || '');
  const parts = [];
  if (info.text) {
    const texts = Array.isArray(info.text) ? info.text : [info.text];
    parts.push(h('h3', 'In short'), ...texts.map((t) => (t instanceof Node ? t : h('p', { html: rich(t, { html: true }) }))));
  }
  if (info.tex) {
    const f = h('div.formula');
    parts.push(h('h3', 'Key formula'), f);
    tex(f, info.tex, true);
    if (info.where?.length) parts.push(h('dl.where', info.where.map((w) => [h('dt', { html: texHTML(w.sym) }), h('dd', { html: rich(w.desc, { html: true }) })])));
    if (info.texNote) parts.push(h('p.muted', { style: 'font-size:.84rem;margin-top:8px', html: rich(info.texNote, { html: true }) }));
  }
  const dg = typeof info.diagram === 'function' ? info.diagram() : info.diagram;
  if (dg) parts.push(h('h3', 'Diagram'), h('div.diagram', dg.el || dg), dg.caption ? h('p.diagram-cap', { html: rich(dg.caption, { html: true }) }) : null);
  if (info.steps?.length) parts.push(h('h3', 'Walk-through'), h('ol.walk', info.steps.map((st) => h('li', { html: rich(st, { html: true }) }))));
  if (info.range) parts.push(h('h3', 'Typical values'), h('p.range', { html: rich(info.range, { html: true }) }));
  if (info.refs?.length) parts.push(h('h3', 'Sources'), h('ul', { style: 'padding-left:1.1em;margin:0' }, info.refs.map((r) => h('li', h('a', { href: r.href }, r.title)))));
  body.replaceChildren(...parts);
  renderAll(body);
  footerEl.replaceChildren(
    info.doc ? h('a.btn.primary', { href: info.doc, target: '_blank', rel: 'noopener' }, 'Open full documentation', ICONS.external()) : null,
    h('button.btn.ghost', { type: 'button', onclick: closeInfo }, 'Close'));
  footerEl.hidden = false;
  overlay.hidden = false;
  requestAnimationFrame(() => { overlay.classList.add('open'); drawer.classList.add('open'); });
  body.scrollTop = 0;
  setTimeout(() => (footerEl.querySelector('a') || drawer.querySelector('.close')).focus({ preventScroll: true }), 60);
  document.documentElement.style.overflow = 'hidden';
}

export function closeInfo() {
  if (!drawer?.classList.contains('open')) return;
  drawer.classList.remove('open');
  overlay.classList.remove('open');
  setTimeout(() => { overlay.hidden = true; }, 300);
  document.documentElement.style.overflow = '';
  lastFocus?.focus?.({ preventScroll: true });
}

/** A small round ⓘ button that opens `info` (object or function returning one). */
export function infoButton(info, { label, large } = {}) {
  const b = h('button.info-btn', { type: 'button', class: large ? 'lg' : null, 'aria-label': `More about ${texToPlain(label || (typeof info === 'object' ? info.title : '') || 'this')}`, title: 'Explain this' }, 'i');
  b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openInfo(typeof info === 'function' ? info() : info); });
  return b;
}
