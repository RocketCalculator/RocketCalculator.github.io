// Site shell: header (nav, search, units, theme), footer, command palette, theme handling.
import { h, s, url, loadRegistry, loadReferences, storage } from './util.js';
import { getSystem, setSystem } from './units.js';

const THEME_KEY = 'rc-theme';

export function currentTheme() {
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  storage.set(THEME_KEY, t);
  window.dispatchEvent(new CustomEvent('themechange', { detail: t }));
}

export const ICONS = {
  sun: () => s('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'aria-hidden': 'true' },
    s('circle', { cx: 12, cy: 12, r: 4.2 }), s('path', { d: 'M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6' })),
  moon: () => s('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
    s('path', { d: 'M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z' })),
  search: () => s('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', width: 16, height: 16, 'aria-hidden': 'true' },
    s('circle', { cx: 11, cy: 11, r: 6.5 }), s('path', { d: 'M16 16l4.5 4.5' })),
  menu: () => s('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'aria-hidden': 'true' },
    s('path', { d: 'M4 7h16M4 12h16M4 17h16' })),
  close: () => s('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'aria-hidden': 'true' },
    s('path', { d: 'M6 6l12 12M18 6L6 18' })),
  external: () => s('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
    s('path', { d: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5' })),
  download: () => s('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
    s('path', { d: 'M12 4v11M7 10l5 5 5-5M5 20h14' })),
  copy: () => s('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
    s('rect', { x: 8, y: 8, width: 12, height: 12, rx: 2 }), s('path', { d: 'M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3' })),
  reset: () => s('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
    s('path', { d: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5' })),
  link: () => s('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'aria-hidden': 'true' },
    s('path', { d: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1' })),
  book: () => s('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
    s('path', { d: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M19 19v2H6' })),
};

/** The rocket brand mark: a thin-line sounding rocket on a climb angle. */
export function brandMark() {
  return s('svg', { viewBox: '0 0 32 32', 'aria-hidden': 'true' },
    s('rect', { width: 32, height: 32, rx: 6, fill: '#e60000' }),
    s('path', { d: 'M5 25 Q 13 23 21 10', fill: 'none', stroke: '#ffffff', 'stroke-width': 1.4, 'stroke-dasharray': '1.8 2', opacity: 0.85 }),
    s('g', { transform: 'translate(21 10) rotate(38)' },
      s('path', { d: 'M0 -8.5 C 2.4 -5.4 2.4 -2 2.4 4.2 L -2.4 4.2 C -2.4 -2 -2.4 -5.4 0 -8.5 Z', fill: '#ffffff' }),
      s('path', { d: 'M-2.4 1.4 L -4.8 5.8 L -2.4 5 Z M 2.4 1.4 L 4.8 5.8 L 2.4 5 Z', fill: '#ffffff' }),
      s('path', { d: 'M-1.2 4.8 L 0 8.4 L 1.2 4.8 Z', fill: '#25282b' })));
}

function header(active) {
  const nav = h('nav.nav#site-nav', { 'aria-label': 'Main' },
    h('a', { href: url('index.html'), 'aria-current': active === 'home' ? 'page' : null }, 'Home'),
    h('a', { href: url('index.html#calculators'), 'aria-current': active === 'calculators' ? 'page' : null }, 'Calculators'),
    h('a', { href: url('references/index.html'), 'aria-current': active === 'references' ? 'page' : null }, 'References'),
    h('a', { href: url('index.html#guide') }, 'How to use'));
  const unitsSeg = h('div.seg', { role: 'group', 'aria-label': 'Unit system' },
    h('button', { type: 'button', 'data-sys': 'si', title: 'SI units (metres, kilograms, pascals)' }, 'SI'),
    h('button', { type: 'button', 'data-sys': 'us', title: 'English units (inches, feet, pounds) — as in the original workbooks' }, 'US'));
  const syncUnits = () => unitsSeg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sys === getSystem())));
  unitsSeg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { setSystem(b.dataset.sys); syncUnits(); } });
  window.addEventListener('unitschange', syncUnits);
  syncUnits();

  const themeBtn = h('button.icon-btn', { type: 'button', 'aria-label': 'Toggle light/dark mode' });
  const syncTheme = () => {
    const t = currentTheme();
    themeBtn.replaceChildren(t === 'dark' ? ICONS.sun() : ICONS.moon());
    themeBtn.title = t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  };
  themeBtn.addEventListener('click', () => { setTheme(currentTheme() === 'dark' ? 'light' : 'dark'); syncTheme(); });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTheme);
  syncTheme();

  const menuBtn = h('button.icon-btn.menu-btn', { type: 'button', 'aria-label': 'Menu', 'aria-expanded': 'false', 'aria-controls': 'site-nav' }, ICONS.menu());
  menuBtn.addEventListener('click', () => { const o = nav.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', String(o)); });

  const searchBtn = h('button.search-btn', { type: 'button', 'aria-label': 'Search calculators and references' },
    ICONS.search(), h('span.label', 'Search…'));
  searchBtn.addEventListener('click', () => openPalette());

  return h('header.site-header',
    h('div.wrap',
      h('a.brand', { href: url('index.html'), 'aria-label': 'Rocket Calculator home' }, brandMark(),
        h('span.name', h('span', 'Rocket Calculator'), h('small', 'Sounding-rocket engineering'))),
      nav,
      h('div.header-tools', searchBtn, unitsSeg, themeBtn, menuBtn)));
}

function footer() {
  return h('footer.site-footer',
    h('div.wrap',
      h('p.credit', 'Built from the rocket-engineering reports of ',
        h('a', { href: 'http://www.rsandt.com/reports.html', rel: 'noopener' }, 'Rocket Science and Engineering Technologies'),
        ' (C. P. Hoult). Engineering estimates only — verify before flight.'),
      h('nav.foot-links', { 'aria-label': 'Footer' },
        h('a', { href: url('index.html#calculators') }, 'Calculators'),
        h('a', { href: url('references/index.html') }, 'References'),
        h('a', { href: url('index.html#guide') }, 'How to use'),
        h('a', { href: 'http://www.rsandt.com/bio.html', rel: 'noopener' }, 'About the author'))));
}

/* ---------------- command palette ---------------- */
let palette;
async function buildIndex() {
  const [reg, refs] = await Promise.all([loadRegistry(), loadReferences()]);
  const items = [];
  for (const c of reg.calculators) items.push({ kind: 'Calculator', title: c.title, sub: c.description, href: url(`calculators/${c.slug}.html`), w: 3 });
  for (const t of reg.topics) {
    if (t.status === 'soon') items.push({ kind: 'Topic', title: t.title, sub: t.summary, href: url(`calculators/${t.slug}.html`), w: 2 });
  }
  for (const c of reg.calculators) items.push({ kind: 'Theory', title: `${c.title} — documentation`, sub: '', href: url(`docs/${c.slug}.html`), w: 1.5 });
  for (const r of refs) items.push({ kind: 'Reference', title: r.title, sub: r.authors, href: url(`references/index.html#${r.id}`), w: 1 });
  items.push({ kind: 'Page', title: 'Home', sub: '', href: url('index.html'), w: 1 });
  items.push({ kind: 'Page', title: 'Reference library', sub: '', href: url('references/index.html'), w: 1 });
  return items;
}
function score(item, q) {
  if (!q) return item.w;
  const t = item.title.toLowerCase(), sub = (item.sub || '').toLowerCase();
  let sc = 0;
  for (const w of q.split(/\s+/).filter(Boolean)) {
    if (t.startsWith(w)) sc += 6; else if (t.includes(' ' + w)) sc += 4; else if (t.includes(w)) sc += 3;
    else if (sub.includes(w)) sc += 1; else return 0;
  }
  return sc + item.w;
}
export async function openPalette(initial = '') {
  if (!palette) {
    const input = h('input', { type: 'search', placeholder: 'Search calculators, topics and references…', 'aria-label': 'Search', 'aria-controls': 'palette-list', autocomplete: 'off' });
    const list = h('ul#palette-list', { role: 'listbox' });
    const box = h('div.palette', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Search' }, input, list,
      h('div.hint', h('span', h('kbd', '↑'), ' ', h('kbd', '↓'), ' navigate'), h('span', h('kbd', 'Enter'), ' open'), h('span', h('kbd', 'Esc'), ' close')));
    const overlay = h('div.palette-overlay', box);
    document.body.append(overlay);
    const items = await buildIndex();
    let sel = 0, shown = [];
    const render = () => {
      const q = input.value.trim().toLowerCase();
      shown = items.map((it) => [score(it, q), it]).filter(([sc]) => sc > 0).sort((a, b) => b[0] - a[0]).slice(0, 40).map(([, it]) => it);
      sel = Math.min(sel, Math.max(0, shown.length - 1));
      list.replaceChildren(...(shown.length ? shown.map((it, i) => h('li', h('a', { href: it.href, role: 'option', 'aria-selected': String(i === sel), id: `pal-${i}` },
        h('span.k', it.kind), h('span.t', it.title), it.sub ? h('span.s', it.sub.length > 46 ? it.sub.slice(0, 44) + '…' : it.sub) : null)))
        : [h('li.empty', 'No matches')]));
      input.setAttribute('aria-activedescendant', shown.length ? `pal-${sel}` : '');
    };
    const close = () => { overlay.classList.remove('open'); palette.lastFocus?.focus(); };
    input.addEventListener('input', () => { sel = 0; render(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, shown.length - 1); render(); list.children[sel]?.scrollIntoView({ block: 'nearest' }); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); render(); list.children[sel]?.scrollIntoView({ block: 'nearest' }); e.preventDefault(); }
      else if (e.key === 'Enter' && shown[sel]) { location.href = shown[sel].href; close(); }
    });
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); if (e.key === 'Tab') { e.preventDefault(); input.focus(); } });
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
    palette = { overlay, input, render, close };
  }
  palette.lastFocus = document.activeElement;
  palette.input.value = initial;
  palette.render();
  palette.overlay.classList.add('open');
  palette.input.focus();
}

/** Build the shell around the page's <main>. */
export function initShell({ active } = {}) {
  document.documentElement.dataset.units = getSystem();
  const main = document.querySelector('main') || h('main');
  main.id ||= 'main';
  document.body.prepend(h('a.skip-link', { href: '#' + main.id }, 'Skip to content'), header(active));
  if (!main.isConnected) document.body.append(main);
  document.body.append(footer());
  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); openPalette(); }
  });
  return main;
}
