// Home page: hero, walkthrough, topic grid with search/filter, navigation guide, units & colour code.
import { h, s, url, loadRegistry, loadReferences, reveal, reducedMotion, storage } from './util.js';
import { initShell, openPalette } from './app.js';

function heroArt() {
  // Trajectory over a ground line with launch rail, burnout and apogee call-outs; rocket flies the path.
  const traj = 'M70,330 C120,250 170,170 245,120 C305,82 360,72 410,78 C470,86 520,130 560,200 C585,245 600,290 610,330';
  const stars = Array.from({ length: 34 }, (_, i) => {
    const x = (i * 97.3) % 640, y = (i * 53.7) % 220, r = (i % 3) * 0.45 + 0.6;
    return s('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r, fill: 'var(--star)', class: i % 4 === 0 ? 'twinkle' : null, style: `animation-delay:${(i % 7) * 0.4}s` });
  });
  const rocket = s('g', { id: 'hero-rocket' },
    s('path', { d: 'M14,0 C9,-3.6 3,-4.2 -10,-4.2 L -10,4.2 C 3,4.2 9,3.6 14,0 Z', fill: '#ffffff' }),
    s('path', { d: 'M-6,-4.2 L -12,-9 L -10,-4.2 Z M -6,4.2 L -12,9 L -10,4.2 Z', fill: '#e60000' }),
    s('path', { d: 'M-10,-2.4 L -22,0 L -10,2.4 Z', fill: '#e60000', opacity: 0.9 }, s('animate', { attributeName: 'd', dur: '0.18s', repeatCount: 'indefinite', values: 'M-10,-2.4 L -22,0 L -10,2.4 Z;M-10,-2.4 L -18,0 L -10,2.4 Z;M-10,-2.4 L -22,0 L -10,2.4 Z' })));
  const motion = reducedMotion() ? null : s('animateMotion', { dur: '9s', repeatCount: 'indefinite', rotate: 'auto', keyPoints: '0;0.42;0.5;1', keyTimes: '0;0.38;0.52;1', calcMode: 'spline', keySplines: '0.5 0 0.6 1;0.4 0 0.6 1;0.4 0 0.8 0.6' }, s('mpath', { href: '#hero-traj' }));
  if (motion) rocket.append(motion); else rocket.setAttribute('transform', 'translate(405 78)');
  const callout = (x, y, label, sub, dx = 14, anchor = 'start') => s('g', {},
    s('circle', { cx: x, cy: y, r: 4.5, fill: '#25282b', stroke: '#ffffff', 'stroke-width': 1.6 }),
    s('circle', { cx: x, cy: y, r: 9, fill: 'none', stroke: '#ffffff', 'stroke-width': 1, class: 'pulse-ring' }),
    s('text', { x: x + dx, y: y - 6, 'text-anchor': anchor, fill: '#ffffff', style: 'font:600 12px var(--font-sans)' }, label),
    s('text', { x: x + dx, y: y + 9, 'text-anchor': anchor, fill: 'rgba(255,255,255,.62)', style: 'font:11px var(--font-sans)' }, sub));
  return s('svg', { viewBox: '0 0 640 380', role: 'img', 'aria-label': 'Animated sounding-rocket trajectory from launch to apogee' },
    s('g', {}, stars),
    // altitude ticks
    s('g', { opacity: 0.8 }, [0, 1, 2, 3, 4].map((i) => s('line', { x1: 34, x2: 40, y1: 330 - i * 62, y2: 330 - i * 62, stroke: 'rgba(255,255,255,.62)' }))),
    s('line', { x1: 40, x2: 40, y1: 80, y2: 330, stroke: 'rgba(255,255,255,.35)' }),
    s('text', { x: 46, y: 76, fill: 'rgba(255,255,255,.62)', style: 'font:10px var(--font-sans)' }, 'ALTITUDE'),
    s('path', { id: 'hero-traj', d: traj, fill: 'none', stroke: '#e60000', 'stroke-width': 2, class: 'traj-draw', opacity: 0.9 }),
    s('path', { d: traj, fill: 'none', stroke: '#e60000', 'stroke-width': 1, class: 'traj-path', opacity: 0.35, transform: 'translate(0 6)' }),
    // ground & rail
    s('line', { x1: 20, x2: 640, y1: 330, y2: 330, stroke: 'rgba(255,255,255,.35)', 'stroke-width': 1.5 }),
    s('g', { stroke: 'rgba(255,255,255,.62)', 'stroke-width': 1 }, Array.from({ length: 32 }, (_, i) => s('line', { x1: 24 + i * 20, y1: 330, x2: 16 + i * 20, y2: 340 }))),
    s('line', { x1: 66, y1: 332, x2: 92, y2: 292, stroke: 'rgba(255,255,255,.8)', 'stroke-width': 3, 'stroke-linecap': 'round' }),
    callout(245, 120, 'Burnout', 'max velocity'),
    callout(410, 78, 'Apogee', 'vertical speed 0', 0, 'middle'),
    callout(560, 200, 'Descent', 'recovery', 14),
    // wind barb
    s('g', { transform: 'translate(560 60)', stroke: '#ffffff', fill: 'none', 'stroke-width': 1.4, opacity: 0.85 },
      s('path', { d: 'M0,0 H40 M40,0 l-7,-4 M40,0 l-7,4', class: 'traj-path' }),
      s('text', { x: 0, y: -8, fill: '#ffffff', stroke: 'none', style: 'font:10px var(--font-sans)' }, 'WIND')),
    rocket);
}

const STEP_ART = [
  () => s('svg', { viewBox: '0 0 200 74' }, [0, 1, 2].map((i) => s('rect', { x: 14 + i * 62, y: 16, width: 52, height: 42, rx: 6, fill: 'var(--surface)', stroke: i === 1 ? 'var(--accent)' : 'var(--border-strong)' })),
    s('path', { d: 'M100,26 v14 M93,33 h14', stroke: 'var(--accent)', 'stroke-width': 2 })),
  () => s('svg', { viewBox: '0 0 200 74' }, [0, 1, 2].map((i) => s('g', {}, s('rect', { x: 20, y: 12 + i * 18, width: 70, height: 4, rx: 2, fill: 'var(--border-strong)' }),
    s('rect', { x: 104, y: 7 + i * 18, width: 76, height: 14, rx: 3, fill: 'var(--surface)', stroke: 'var(--border-strong)' }), s('rect', { x: 104, y: 7 + i * 18, width: 3, height: 14, fill: 'var(--input-mark)' })))),
  () => s('svg', { viewBox: '0 0 200 74' }, s('path', { d: 'M18,60 C60,58 80,20 120,18 C150,17 170,30 184,40', fill: 'none', stroke: 'var(--series-1)', 'stroke-width': 2 }),
    s('path', { d: 'M18,60 H184 M18,60 V10', stroke: 'var(--border-strong)', fill: 'none' }), s('circle', { cx: 120, cy: 18, r: 4, fill: 'var(--key-mark)' })),
  () => s('svg', { viewBox: '0 0 200 74' }, s('rect', { x: 120, y: 6, width: 72, height: 62, rx: 6, fill: 'var(--surface)', stroke: 'var(--border-strong)' }),
    s('rect', { x: 130, y: 18, width: 50, height: 4, rx: 2, fill: 'var(--text-3)' }), s('rect', { x: 130, y: 30, width: 40, height: 4, rx: 2, fill: 'var(--border-strong)' }), s('rect', { x: 130, y: 40, width: 46, height: 4, rx: 2, fill: 'var(--border-strong)' }),
    s('circle', { cx: 70, cy: 37, r: 13, fill: 'var(--surface)', stroke: 'var(--accent-2)', 'stroke-width': 1.6 }), s('text', { x: 70, y: 42, 'text-anchor': 'middle', fill: 'var(--accent-2)', style: 'font:italic 600 15px Georgia,serif' }, 'i'),
    s('path', { d: 'M86,37 H114', stroke: 'var(--accent-2)', 'stroke-dasharray': '3 3' })),
];

export async function mountHome() {
  const main = initShell({ active: 'home' });
  const [reg, refs] = await Promise.all([loadRegistry(), loadReferences()]);
  const avail = reg.calculators.length;
  const soon = reg.topics.filter((t) => t.status === 'soon').length;

  const hero = h('section.hero',
    h('div.wrap',
      h('div',
        h('p.eyebrow', 'Sounding-rocket engineering toolkit'),
        h('h1', { html: 'Rocket maths, <em>explained</em>.' }),
        h('p.lead', 'Interactive calculators for stability, drag, atmosphere, fins and mass properties — each with a live schematic, plots, and the theory one click away. Built from C. P. Hoult’s rocket-engineering reports at rsandt.com.'),
        h('div.hero-actions',
          h('a.btn.primary', { href: '#calculators' }, 'Browse calculators'),
          h('a.btn.on-dark', { href: '#guide' }, 'How it works'),
          h('a.btn.on-dark', { href: url('references/index.html') }, 'Reference library')),
        h('div.hero-stats',
          h('div', h('b', String(avail)), 'calculators live'),
          h('div', h('b', String(reg.topics.length)), 'engineering topics'),
          h('div', h('b', String(refs.length)), 'reference documents'),
          h('div', h('b', 'SI · US'), 'switchable units'))),
      h('div.hero-art', heroArt())));

  const steps = [
    ['Pick a calculator', 'Choose one from the grid below, or use Search in the top bar to find a calculator, topic or reference.'],
    ['Enter your rocket', 'Every page opens with a worked example. Change the outlined inputs — results update as you type.'],
    ['Read results & plots', 'Key results sit on top; the to-scale drawing and plots react to every change. Export any plot, and the whole calculation as a report.'],
    ['Press ⓘ for theory', 'Every input and result has an ⓘ: a short explanation, the formula and a walk-through, with a link to the full documentation.'],
  ];
  const guide = h('section.section.reveal#guide',
    h('div.wrap',
      h('div.section-head', h('div', h('p.eyebrow', 'How to use this site'), h('h2', 'Four steps from inputs to insight'))),
      h('div.steps', steps.map(([t, p], i) => h('div.card.step', h('div.step-ill', STEP_ART[i]()), h('h3', t), h('p', { html: p }))))));

  // ---- topic grid ----
  const search = h('input', { type: 'search', placeholder: 'Filter topics…', 'aria-label': 'Filter topics' });
  const statusChips = [['all', 'All'], ['available', `Available (${avail})`], ['soon', `Coming soon (${soon})`]].map(([v, l]) =>
    h('button.filter-chip', { type: 'button', 'data-status': v, 'aria-pressed': String(v === 'all') }, l));
  const areaSel = h('select.filter-chip', { 'aria-label': 'Filter by area' }, h('option', { value: '' }, 'All areas'), reg.areas.map((a) => h('option', { value: a.id }, a.title)));
  const gridHost = h('div');
  let status = storage.get('rc-home-status', 'all');
  const renderGrid = () => {
    const q = search.value.trim().toLowerCase();
    const area = areaSel.value;
    statusChips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.status === status)));
    const blocks = [];
    for (const a of reg.areas) {
      if (area && a.id !== area) continue;
      const ts = reg.topics.filter((t) => t.area === a.id)
        .filter((t) => status === 'all' || t.status === status)
        .filter((t) => !q || (t.title + ' ' + t.summary + ' ' + t.abstract + ' ' + t.calculators.join(' ')).toLowerCase().includes(q))
        .sort((x, y) => (x.status === y.status ? x.title.localeCompare(y.title) : x.status === 'available' ? -1 : 1));
      if (!ts.length) continue;
      blocks.push(h('div.area-block', { id: `area-${a.id}` }, h('h3', a.title),
        h('div.topic-grid', ts.map((t) => topicCard(t, reg)))));
    }
    gridHost.replaceChildren(...(blocks.length ? blocks : [h('div.card.empty', 'No topics match that filter.')]));
  };
  search.addEventListener('input', renderGrid);
  areaSel.addEventListener('change', renderGrid);
  statusChips.forEach((c) => c.addEventListener('click', () => { status = c.dataset.status; storage.set('rc-home-status', status); renderGrid(); }));

  const calcs = h('section.section#calculators',
    h('div.wrap',
      h('div.section-head', h('div', h('p.eyebrow', 'What’s available'), h('h2', 'Calculators & topics')),
        h('p', `${avail} calculators are live. The other ${soon} topics have their reference documents ready and are marked “coming soon”.`)),
      h('div.filters', search, ...statusChips, areaSel),
      gridHost));

  const nav = h('section.section.reveal',
    h('div.wrap',
      h('div.section-head', h('div', h('p.eyebrow', 'Getting around'), h('h2', 'Moving between calculators'))),
      h('div.nav-guide',
        h('div.card', h('h3', 'Search anywhere'), h('p', 'Use Search in the top bar on any page to jump to a calculator, a theory page or a reference document.')),
        h('div.card', h('h3', 'Breadcrumbs & next/previous'), h('p', 'Each calculator shows where it sits (Home / area / calculator) and links to the previous and next calculator at the bottom of the page.')),
        h('div.card', h('h3', 'Theory in a side panel'), h('p', 'The ⓘ buttons open a side panel without leaving the calculator. “Open full documentation” opens the complete derivation in a new tab, at the right section.'))),
      h('div.card.card-pad', { style: 'margin-top:14px' },
        h('h3', 'Units and the colour code'),
        h('p', { style: 'color:var(--text-2)' }, 'Switch between SI and US customary units with the ', h('b', 'SI · US'), ' toggle in the top bar — your choice is remembered. The original spreadsheets were written in US units; the calculators reproduce them exactly in either system. Every symbol and unit is typeset as mathematics. On the calculator pages:'),
        h('div.legend-swatches',
          h('span', h('i', { style: 'background:var(--surface-2);border:1px solid var(--hairline)' }), 'Outlined field — your inputs'),
          h('span', h('i', { style: 'background:var(--key-bg);box-shadow:inset 3px 0 0 var(--red)' }), 'Dark card — key results'),
          h('span', h('i', { style: 'background:var(--red)' }), 'Red — highlighted dimension or action'),
          h('span', h('i', { style: 'background:var(--surface);border:1px solid var(--border-strong)' }), 'Table — every other output'))),
      h('div.card.card-pad', { style: 'margin-top:14px' },
        h('h3', 'About the source'),
        h('p', { style: 'color:var(--text-2);margin:0' }, 'All methods come from the reports, memos and spreadsheets published at ',
          h('a', { href: 'http://www.rsandt.com/reports.html', rel: 'noopener' }, 'rsandt.com/reports'),
          ' by C. P. Hoult and his students at CSULB and CSULA. Where a spreadsheet and its memo disagree, the calculator uses the memo and offers a “Match original spreadsheet” switch; every such difference is listed on the documentation page.'))));

  main.append(hero, guide, calcs, nav);
  renderGrid();
  reveal(main);
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
  if (new URLSearchParams(location.search).get('search') != null) openPalette();
}

function topicCard(t, reg) {
  const calcs = t.calculators.map((slug) => reg.calculators.find((c) => c.slug === slug));
  const refsChip = t.references.length ? h('span.chip', `${t.references.length} reference${t.references.length === 1 ? '' : 's'}`)
    : h('span.chip', `${t.sourceFiles.length} spreadsheet${t.sourceFiles.length === 1 ? '' : 's'}`);
  if (t.status === 'available' && calcs.length === 1) {
    return h('a.card.topic-card.available', { href: url(`calculators/${calcs[0].slug}.html`) },
      h('h4', calcs[0].title), h('p', t.summary),
      h('div.meta', h('span.chip.ok', h('span.dot'), 'Available'), h('span.chip', t.title), refsChip));
  }
  if (t.status === 'available') {
    return h('div.card.topic-card.available',
      h('h4', t.title), h('p', t.summary),
      h('div.calc-links', calcs.map((c) => h('a', { href: url(`calculators/${c.slug}.html`) }, h('span', '→ '), c.title))),
      h('div.meta', h('span.chip.ok', h('span.dot'), `${calcs.length} calculators`), refsChip));
  }
  return h('a.card.topic-card', { href: url(`calculators/${t.slug}.html`) },
    h('h4', t.title), h('p', t.summary),
    h('div.meta', h('span.chip.soon', 'Coming soon'), refsChip));
}
