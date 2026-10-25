// Generic calculator page: renders intro, form, key results, schematic, plots, results table, references.
// A calculator is a definition module (js/calculators/<slug>.js) — see docs/PLAN.md for the API.
import { h, url, fmt, num, debounce, toast, copyText, download, loadRegistry, loadReferences, storage, reveal, InputError } from './util.js';
import { initShell, ICONS } from './app.js';
import { displayUnit, unitLabel, unitTex, toDisplay, getSystem } from './units.js';
import { buildForm } from './ui/form.js';
import { infoButton, openInfo } from './ui/drawer.js';
import { chartCard } from './ui/chart.js';
import { frame } from './ui/svg.js';
import { diagramViewport } from './ui/viewport.js';
import { renderAll, loadKatex, texHTML, rich, texToPlain, hasTeX } from './math.js';
import { exportMenu, exportFigure, exportData, DATA_FORMATS } from './ui/export.js';
import { reportCard, symbolsIn } from './ui/report.js';
import { sharedLinks, pullShared, pushShared, designFile, parseDesignFile, fileSlug, delta } from './design.js';

const ROCKET_KEY = 'rc-rocket', FLASH_KEY = 'rc-flash';
const getRocket = () => ({ name: 'My rocket', values: {}, linked: true, ...(storage.get(ROCKET_KEY) || {}) });
const setRocket = (r) => storage.set(ROCKET_KEY, r);

const clone = (v) => JSON.parse(JSON.stringify(v));

export async function mountCalculator(def) {
  const main = initShell({ active: 'calculators' });
  const [reg, refs] = await Promise.all([loadRegistry(), loadReferences(), loadKatex()]);
  const topic = reg.topics.find((t) => t.slug === def.topic);
  const area = reg.areas.find((a) => a.id === topic?.area);
  const docHref = (anchor = '') => url(`docs/${def.slug}.html${anchor ? (anchor.startsWith('#') ? anchor : '#' + anchor) : ''}`);
  const storeKey = `rc-calc-${def.slug}`;

  // ---------- state ----------
  const defaults = () => {
    const v = {};
    for (const g of def.groups) for (const f of g.fields) v[f.id] = clone(f.default);
    if (def.examples?.[0]) Object.assign(v, clone(def.examples[0].values));
    if (def.compat) v.__compat = false;
    return v;
  };
  const state = { values: defaults(), out: null };
  const fromHash = () => {
    const m = /[#&]s=([^&]+)/.exec(location.hash);
    if (!m) return null;
    try { return JSON.parse(decodeURIComponent(m[1])); } catch { return null; }
  };
  const hashState = fromHash();
  Object.assign(state.values, storage.get(storeKey) || {}, hashState || {});
  state.values.__compat = false;
  // the shared rocket fills its dimensions in, unless a share link asks for exact inputs
  const pulledOnLoad = !hashState && getRocket().linked ? pullShared(def, state.values, getRocket().values) : [];
  const pendingShared = new Set();
  const baseKey = `rc-base-${def.slug}`;
  let base = storage.get(baseKey), baseOut = null, baseSig = '';

  // ---------- info helpers ----------
  const infoFor = (f) => {
    const i = typeof f.info === 'function' ? f.info(state.values) : f.info || {};
    const u = f.dim && f.dim !== 'none' ? unitTex(displayUnit(f)) : '';
    return {
      eyebrow: f.kind === 'result' ? 'Result' : 'Input',
      title: f.label + (f.sym ? ` $${f.sym}$` : '') + (u ? ` ($${u}$)` : ''),
      diagram: () => schematicDiagram([f.id, ...(i.fields || [])], f),
      text: i.text || f.help,
      tex: i.tex, texNote: i.texNote, steps: i.steps, where: whereList(i.tex),
      range: typeof i.range === 'function' ? i.range(getSystem()) : i.range,
      doc: docHref(i.doc || def.docAnchor || ''),
    };
  };
  const pageInfo = () => ({ eyebrow: 'Calculator', title: def.title, ...def.info, where: whereList(def.info?.tex), diagram: () => schematicDiagram([]), doc: docHref(def.info?.doc || '') });
  const whereList = (tex) => symbolsIn(tex, def.symbols || {});

  // ---------- layout ----------
  const intro = h('div.intro-grid',
    ['what', 'why', 'when'].map((k) => def.intro?.[k] ? h('div.card', h('h3', { what: 'What it does', why: 'Why it matters', when: 'When to use it' }[k]), h('p', { html: rich(def.intro[k], { html: true }) })) : null));

  const resetBtn = h('button.btn.small', { type: 'button', title: 'Restore default inputs' }, ICONS.reset(), 'Reset');
  const exampleSel = def.examples?.length > 1 ? h('select.btn.small', { 'aria-label': 'Load example' }, h('option', { value: '' }, 'Load example…'), def.examples.map((e, i) => h('option', { value: i }, e.name))) : null;
  const exampleBtn = def.examples?.length === 1 ? h('button.btn.small', { type: 'button' }, 'Load example') : null;
  const linkBtn = h('button.btn.small.ghost', { type: 'button', title: 'Copy a link that reproduces these inputs' }, ICONS.link(), 'Share');
  const form = buildForm(def, state, { onChange: (id, o) => { pendingShared.add(id); o?.fast ? requestRecompute() : recomputeSoon(); }, onHighlight: highlight, infoFor });
  const compatBox = null;
  const inputsCard = h('aside.card.calc-inputs', { 'aria-label': 'Inputs' },
    h('div.card-head', h('h2', 'Inputs'), h('span.spacer'), h('div.form-actions', exampleSel, exampleBtn, resetBtn, linkBtn)),
    h('div.form-scroll', form.el, def.actions?.length ? h('div.def-actions', def.actions.map((a) => {
      // def.actions: [{ label, title, run(values) → Promise<{ values, message }> }] e.g. fill inputs from another calculator
      const b = h('button.btn.small', { type: 'button', title: a.title || null }, a.label);
      b.addEventListener('click', async () => {
        b.disabled = true;
        try { const r = await a.run(clone(state.values)); if (r?.values) { Object.assign(state.values, r.values); form.refresh(); recompute(); } if (r?.message) toast(r.message); }
        catch (err) { toast(err.message || String(err)); }
        finally { b.disabled = false; }
      });
      return b;
    })) : null));

  // ---------- design bar: shared rocket, design files, baseline comparison ----------
  const nameInput = h('input.rocket-name', { type: 'text', value: getRocket().name, maxlength: 80, 'aria-label': 'Rocket name', title: 'Rocket name (saved with the design file)' });
  nameInput.addEventListener('change', () => { const r = getRocket(); r.name = nameInput.value.trim() || 'My rocket'; nameInput.value = r.name; setRocket(r); });
  const linkToggle = h('input', { type: 'checkbox', checked: getRocket().linked, 'aria-label': 'Share dimensions across calculators' });
  const syncLinked = () => document.body.classList.toggle('rocket-linked', getRocket().linked);
  linkToggle.addEventListener('change', () => {
    const r = getRocket(); r.linked = linkToggle.checked;
    if (r.linked) {
      // an existing rocket wins; otherwise this page's dimensions start it
      if (Object.keys(r.values).length) { const n = pullShared(def, state.values, r.values).length; setRocket(r); recompute(); toast(n ? `Filled ${n} shared dimension${n === 1 ? '' : 's'} from “${r.name}”` : 'Sharing on'); }
      else { pushShared(def, state.values, r.values); setRocket(r); toast('Sharing on — these dimensions now fill the other calculators'); }
    } else { setRocket(r); toast('Sharing off — this page keeps its own values'); }
    syncLinked();
  });
  const fileInput = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
  const saveBtn = h('button.btn.small.ghost', { type: 'button', title: 'Download every calculator’s inputs and the shared rocket as one file' }, ICONS.download(), 'Save design');
  const openBtn = h('button.btn.small.ghost', { type: 'button', title: 'Load a design file saved from this site' }, ICONS.upload(), 'Open design');
  const compareBox = h('div.compare-box');
  const designInfo = infoButton(() => ({
    eyebrow: 'Your rocket', title: 'Shared rocket, design files and comparison',
    text: ['<b>Shared rocket.</b> With sharing on, the dimensions marked with a chain (body radius, nose, length, fins) are the same in every calculator: change them once and the other pages follow. Flight conditions stay per page.',
      '<b>Save design / Open design.</b> One <code>.rocket.json</code> file holds the shared rocket and the inputs of every calculator you have used — keep it with your team’s documents or in version control and open it on any computer.',
      '<b>Pin as baseline.</b> Keeps the current results; while you change inputs, key results show the change against it, the results table gains Baseline and Δ columns and plots draw the baseline dashed in grey.'],
  }), { label: 'shared rocket' });
  const designBar = h('div.design-bar', { role: 'region', 'aria-label': 'Rocket design' },
    h('div.db-rocket', h('span.db-eyebrow', 'Rocket'), nameInput),
    !sharedLinks(def).length ? null : h('div.db-share-wrap', h('label.db-share', h('span.switch', linkToggle, h('span')), h('span', 'Share dimensions across calculators')), designInfo),
    h('span.spacer'), compareBox, saveBtn, openBtn, fileInput);

  function renderCompare() {
    if (!base) {
      compareBox.replaceChildren(h('button.btn.small', { type: 'button', title: 'Keep these results to compare against while you change inputs', onclick: () => {
        base = { values: clone(state.values), at: new Date().toISOString() }; storage.set(baseKey, base); renderCompare(); recompute(); toast('Baseline pinned — change inputs to compare');
      } }, ICONS.pin(), 'Pin as baseline'));
      return;
    }
    const at = new Date(base.at);
    compareBox.replaceChildren(
      h('span.chip.base-chip', { title: `Pinned ${at.toLocaleString()}` }, h('i.base-swatch'), `Baseline · ${at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`),
      h('button.btn.small.ghost', { type: 'button', title: 'Put the baseline inputs back', onclick: () => { Object.assign(state.values, clone(base.values)); pendingShared.clear(); def.groups.forEach((g) => g.fields.forEach((f) => f.shared && pendingShared.add(f.id))); form.refresh(); recompute(); toast('Baseline inputs restored'); } }, 'Restore'),
      h('button.btn.small.ghost', { type: 'button', title: 'Stop comparing', onclick: () => { base = null; storage.del(baseKey); renderCompare(); recompute(); } }, 'Clear'));
  }
  function baseline() {
    if (!base) return null;
    const sig = JSON.stringify(base.values);
    if (sig !== baseSig) {
      baseSig = sig;
      try { baseOut = { values: { ...defaults(), ...clone(base.values) } }; baseOut.out = def.compute(baseOut.values, {}); } catch { baseOut = null; }
    }
    return baseOut;
  }

  saveBtn.addEventListener('click', () => {
    const r = getRocket(), calcs = {}, baselines = {};
    for (const c of reg.calculators) {
      const v = storage.get(`rc-calc-${c.slug}`); if (v) calcs[c.slug] = v;
      const b = storage.get(`rc-base-${c.slug}`); if (b) baselines[c.slug] = b;
    }
    download(`${fileSlug(r.name)}.rocket.json`, JSON.stringify(designFile({ name: r.name, shared: r.values, calcs, baselines }), null, 2), 'application/json');
    toast(`Saved “${r.name}” (${Object.keys(calcs).length} calculator${Object.keys(calcs).length === 1 ? '' : 's'})`);
  });
  openBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0]; fileInput.value = '';
    if (!file) return;
    try {
      const d = parseDesignFile(await file.text(), reg.calculators.map((c) => c.slug));
      setRocket({ name: d.name, values: d.shared, linked: true });
      for (const c of reg.calculators) {
        if (d.calcs[c.slug]) storage.set(`rc-calc-${c.slug}`, d.calcs[c.slug]); else storage.del(`rc-calc-${c.slug}`);
        if (d.baselines[c.slug]) storage.set(`rc-base-${c.slug}`, d.baselines[c.slug]); else storage.del(`rc-base-${c.slug}`);
      }
      storage.set(FLASH_KEY, `Opened “${d.name}”`);
      location.replace(location.pathname + location.search);
    } catch (err) { toast(err.message); }
  });

  // Warnings live in a fixed dock (bottom corner), so they never push the results down. Each can be dismissed;
  // a dismissed message stays hidden until its text changes.
  const warnBox = h('div.warnings.notice-dock', { 'aria-live': 'polite', role: 'status' });
  const dismissed = new Set(), opened = new Set();
  new MutationObserver(() => {
    for (const n of warnBox.querySelectorAll('.notice:not([data-dock])')) {
      n.dataset.dock = '1';
      const key = n.textContent;
      if (dismissed.has(key)) { n.hidden = true; continue; }
      // phones show each notice clipped to two lines without the fix (site.css); a tap opens it, and it stays open across recomputes
      n.classList.toggle('open', opened.has(key));
      n.addEventListener('click', (e) => { if (e.target.closest('.notice-x')) return; opened[opened.has(key) ? 'delete' : 'add'](key); n.classList.toggle('open'); });
      n.append(h('button.notice-x', { type: 'button', 'aria-label': 'Dismiss', title: 'Dismiss', onclick: () => { dismissed.add(key); n.hidden = true; } }, '×'));
    }
  }).observe(warnBox, { childList: true });
  const keyBox = h('div.key-results', { 'aria-live': 'polite' });
  const schemHost = h('div.schem-host');
  const viewport = def.schematic ? diagramViewport(schemHost, { label: def.schematicTitle || 'Drawing' }) : null;
  const ANIM_KEY = 'rc-anim-paused';
  const animBtn = h('button.btn.small', { type: 'button', style: 'visibility:hidden', 'aria-pressed': 'false' });
  const syncAnim = () => {
    const svg = schemHost.querySelector('svg.schem');
    const paused = !!storage.get(ANIM_KEY, false);
    if (svg?.pauseAnimations) paused ? svg.pauseAnimations() : svg.unpauseAnimations();
    animBtn.replaceChildren(paused ? '▶ Play animation' : '❚❚ Pause animation');
    animBtn.setAttribute('aria-pressed', String(paused));
    // invisible rather than removed, so the card header keeps its height when an animation comes or goes
    animBtn.style.visibility = svg?.querySelector('animate, animateTransform, animateMotion') ? '' : 'hidden';
  };
  animBtn.addEventListener('click', () => { storage.set(ANIM_KEY, !storage.get(ANIM_KEY, false)); syncAnim(); });
  const schemCard = def.schematic ? h('section.card',
    h('div.card-head', h('h3', def.schematicTitle || 'Schematic'),
      infoButton(() => ({ eyebrow: 'Drawing', title: def.schematicTitle || 'Schematic', text: [def.schematicHint ? def.schematicHint + '.' : '', 'Hover a dimension to find its input; click it to jump there. The drawing updates with every change.', ...(def.schematicInfo?.text ? [def.schematicInfo.text] : [])].filter(Boolean), doc: docHref(def.info?.doc || '') }), { label: 'drawing' }),
      h('span.spacer'), animBtn,
      exportMenu({ formats: ['svg', 'pdf', 'eps', 'png', 'jpeg'], onExport: (f) => { const el = schemHost.querySelector('svg.schem'); if (el) viewport.withBase(() => exportFigure(el, f, `${def.slug}-schematic`)); } })), viewport.el) : null;
  const plotGrid = h('div.plot-grid');
  // Two tiers (def.tiers): the glance view keeps the verdict, key results, the drawing and the main plots; plots marked
  // explore, every result and the assumptions go into an Explore section the user opens.
  const exploreGrid = h('div.plot-grid');
  const verdictBox = def.verdict ? h('div.verdict', { role: 'status', 'aria-live': 'polite' }) : null;
  const charts = (def.plots || []).map((p) => {
    const info = p.info ? infoButton(() => ({ eyebrow: 'Plot', title: p.title, ...p.info, where: whereList(p.info.tex), doc: docHref(p.info.doc || '') }), { label: p.title }) : null;
    const c = chartCard({ title: p.title, info, height: p.height, exportName: `${def.slug}-${p.id}` });
    (def.tiers && p.explore ? exploreGrid : plotGrid).append(c.card);
    if (p.wide) c.card.style.gridColumn = '1 / -1';
    return { def: p, ...c };
  });
  const tableBody = h('tbody'), tableHead = h('thead');
  const resultsCard = h('section.card', h('div.card-head', h('h3', 'All results'), h('span.spacer'),
    h('button.btn.ghost.small', { type: 'button', onclick: () => copyResults() }, ICONS.copy(), 'Copy'),
    exportMenu({ formats: DATA_FORMATS, onExport: (f) => exportData(f, def.slug, { sheets: () => [{ name: def.title, rows: rowsForExport() }], json: resultsJSON }) })),
    h('div', { style: 'overflow-x:auto' }, h('table.results-table', tableHead, tableBody)));

  const refList = (def.references || []).map((id) => refs.find((r) => r.id === id)).filter(Boolean);
  const theory = h('section.card.card-pad', { id: 'theory' },
    h('h2', 'Theory & references'),
    h('p', 'The full derivation, every equation, symbol definitions and assumptions are on the ',
      h('a', { href: docHref(), target: '_blank', rel: 'noopener' }, 'documentation page ↗'), '.'),
    refList.length || def.externalRefs?.length ? h('ul.refs-list', [
      ...refList.map((r) => h('li', h('div', h('div.t', r.title), h('div.a', [r.authors, r.venue].filter(Boolean).join(' · '))),
        h('div.go', h('a.btn.small', { href: url(`references/index.html#${r.id}`) }, 'Go to reference'),
          h('a.btn.small.ghost', { href: url(r.file), target: '_blank', rel: 'noopener', title: 'Open PDF in a new tab' }, 'PDF', ICONS.external())))),
      // def.externalRefs: sources outside the library (web pages, papers not held here), linked rather than copied
      ...(def.externalRefs || []).map((r) => h('li', h('div', h('div.t', r.title), h('div.a', [r.authors, r.venue].filter(Boolean).join(' · '))),
        h('div.go', r.url ? h('a.btn.small.ghost', { href: r.url, target: '_blank', rel: 'noopener', title: 'Open the source in a new tab' }, 'Open', ICONS.external()) : null)))]) : null,
    null);

  const report = reportCard({ def, state, refList: [...refList, ...(def.externalRefs || []).map((r) => ({ ...r, venue: [r.venue, r.url].filter(Boolean).join(', ') }))], docHref, getSystem });
  const idx = reg.calculators.findIndex((c) => c.slug === def.slug);
  const prev = reg.calculators[(idx - 1 + reg.calculators.length) % reg.calculators.length];
  const next = reg.calculators[(idx + 1) % reg.calculators.length];
  const prevnext = h('nav.prevnext', { 'aria-label': 'Other calculators' },
    h('a.card.prev', { href: url(`calculators/${prev.slug}.html`) }, h('small', '← Previous'), prev.title),
    h('a.card.next', { href: url(`calculators/${next.slug}.html`) }, h('small', 'Next →'), next.title));

  main.append(h('div.wrap',
    h('nav.breadcrumb', { 'aria-label': 'Breadcrumb' }, h('a', { href: url('index.html') }, 'Home'), h('span.sep', '/'),
      h('a', { href: url(`index.html#area-${area?.id || ''}`) }, area?.title || 'Calculators'), h('span.sep', '/'), h('span', def.title)),
    h('div.calc-title', h('h1', def.title), infoButton(pageInfo, { label: def.title, large: true }),
      h('a.btn.small.ghost', { href: docHref(), target: '_blank', rel: 'noopener' }, ICONS.book(), 'Full documentation', ICONS.external()),
      h('a.btn.small.ghost', { href: '#theory' }, 'References')),
    h('p.calc-sub', { html: rich(def.subtitle || '', { html: true }) }),
    intro,
    designBar,
    h('div.calc-layout', inputsCard,
      def.tiers
        ? h('div.calc-outputs', verdictBox, keyBox, schemCard, plotGrid,
          h('details.explore', h('summary', h('span.explore-title', 'Explore'), h('span.explore-sub', 'more plots, every result, assumptions and limits of validity')),
            h('div.explore-body', exploreGrid, resultsCard, def.limits?.length ? h('section.card.card-pad.limits', h('h3', 'Assumptions and limits of validity'),
              h('ul', def.limits.map((l) => h('li', { html: rich(l, { html: true }) })))) : null)))
        : h('div.calc-outputs', verdictBox, keyBox, schemCard, plotGrid, resultsCard)),
    h('div', { style: 'margin-top:20px' }, theory),
    h('div', { style: 'margin-top:20px' }, report.card),
    prevnext));
  document.body.append(warnBox);
  document.title = `${def.title} — Rocket Calculator`;
  renderAll(main);
  reveal(main);

  // ---------- behaviour ----------
  const U = (spec) => {
    const sp = typeof spec === 'string' ? { dim: spec } : spec;
    return { v: (x) => toDisplay(x, sp), label: unitTex(displayUnit(sp)), plain: unitLabel(displayUnit(sp)) };
  };
  const handles = new Map();
  let schemFrame;
  const ctx = {
    U, sys: getSystem,
    frame: (o) => (schemFrame = frame(schemHost, o)),
    setValue(id, v, { round } = {}) {
      if (!Number.isFinite(v)) return;
      const f = def.groups.flatMap((g) => g.fields).find((x) => x.id === id);
      if (f) { if (f.min != null) v = Math.max(f.min + (f.minExclusive ? 1e-9 : 0), v); if (f.max != null) v = Math.min(f.max, v); }
      if (round) v = Math.round(v / round) * round;
      state.values[id] = v; pendingShared.add(id); requestRecompute();
    },
    setCell(id, row, col, v, { round } = {}) {
      if (!Number.isFinite(v)) return;
      if (round) v = Math.round(v / round) * round;
      const rows = state.values[id]; if (!rows?.[row]) return;
      rows[row][col] = v; requestRecompute();
    },
    handle(key, x, y, opts) {
      let rec = handles.get(key);
      if (!rec || !rec.el.isConnected) {
        rec = { opts };
        const holder = schemFrame.layer('handles');
        rec.el = schemFrameHandle(schemFrame, key, (sx, sy) => rec.opts.onDrag?.(sx, sy), (dx, dy) => rec.opts.onKey?.(dx, dy), opts);
        holder.append(rec.el);
        handles.set(key, rec);
      }
      rec.opts = opts; rec.used = true; rec.el.style.display = '';
      rec.el.setAttribute('cx', x); rec.el.setAttribute('cy', y);
      return rec.el;
    },
  };

  /** Focused copy of the live schematic: zoomed onto the elements tied to `ids`, which are drawn in red;
   *  everything else is faded. Shown in the ⓘ drawer. */
  function schematicDiagram(ids, f) {
    const src = schemHost.querySelector('svg.schem');
    if (!src) return null;
    const sel = (root) => ids.flatMap((id) => [...root.querySelectorAll(`[data-field~="${CSS.escape(id)}"]`)]);
    const live = sel(src);
    const el = src.cloneNode(true);
    el.querySelectorAll('.sc-handle, animate, animateTransform, animateMotion').forEach((n) => n.remove());
    el.querySelectorAll('.hl').forEach((n) => n.classList.remove('hl'));
    el.removeAttribute('data-id');
    if (src.dataset.base) el.setAttribute('viewBox', src.dataset.base);   // the copy starts from the whole drawing
    if (!ids.length) return { el, caption: 'The current drawing, to scale with your inputs.' };
    if (!live.length) return null;
    const hits = new Set(sel(el));
    for (const g of hits) { g.classList.add('hl'); g.querySelectorAll('line,path,text,rect,circle,polygon,ellipse').forEach((c) => c.classList.add('hl')); }
    const inHit = (n) => { for (let p = n; p && p !== el; p = p.parentNode) if (hits.has(p)) return true; return false; };
    el.querySelectorAll('line,path,text,rect,circle,polygon,ellipse').forEach((n) => { if (!inHit(n) && !n.closest('defs')) n.classList.add('dimmed'); });
    // zoom: union of the live elements' screen boxes, mapped to drawing units through the screen matrix (correct
    // whatever the user's zoom and the letterboxing), clamped to the whole drawing
    const [vx, vy, vw, vh] = (src.dataset.base || '').split(' ').map(Number), vbb = src.viewBox.baseVal;
    const vb = Number.isFinite(vw) ? { x: vx, y: vy, width: vw, height: vh } : { x: vbb.x, y: vbb.y, width: vbb.width, height: vbb.height };
    const inv = src.getScreenCTM()?.inverse(), toUser = (x, y) => { const p = src.createSVGPoint(); p.x = x; p.y = y; return p.matrixTransform(inv); };
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of live) {
      const b = n.getBoundingClientRect(); if ((!b.width && !b.height) || !inv) continue;
      for (const q of [toUser(b.left, b.top), toUser(b.right, b.bottom)]) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
    }
    if (Number.isFinite(x0)) {
      let bx = x0, by = y0, bw = x1 - x0, bh = y1 - y0;
      const minW = vb.width * 0.42, minH = vb.height * 0.42, pad = 28;
      const w = Math.max(bw + 2 * pad, minW), hgt = Math.max(bh + 2 * pad, minH, w * 0.45);
      bx = Math.max(vb.x, Math.min(vb.x + vb.width - w, bx + bw / 2 - w / 2));
      by = Math.max(vb.y, Math.min(vb.y + vb.height - hgt, by + bh / 2 - hgt / 2));
      el.setAttribute('viewBox', `${bx} ${by} ${Math.min(w, vb.width)} ${Math.min(hgt, vb.height)}`);
    }
    const sym = f?.sym ? ` $${f.sym}$` : '';
    return { el, caption: `<b>${rich(f?.label || '')}</b>${rich(sym)} — on your current design; the rest of the drawing is faded.` };
  }

  function highlight(id, extra) {
    schemHost.querySelectorAll('.hl').forEach((e) => e.classList.remove('hl'));
    keyBox.querySelectorAll('.kr.hl').forEach((e) => e.classList.remove('hl'));
    if (!id) return;
    schemHost.querySelectorAll(`[data-field~="${CSS.escape(id)}"]`).forEach((g) => {
      g.classList.add('hl');
      g.querySelectorAll('line,path,text,rect,circle,polygon').forEach((c) => c.classList.add('hl'));
    });
    if (extra?.row != null) schemHost.querySelectorAll(`[data-row="${extra.row}"]`).forEach((g) => g.classList.add('hl'));
  }
  // schematic → form
  schemHost.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-field]'); if (!t) return;
    const id = t.dataset.field.split(' ')[0];
    form.fields.get(id)?.el.classList.add('hl');
    t.classList.add('hl'); t.querySelectorAll('line,path,text').forEach((c) => c.classList.add('hl'));
  });
  schemHost.addEventListener('pointerout', (e) => {
    const t = e.target.closest('[data-field]'); if (!t) return;
    form.fields.forEach((fe) => fe.el.classList.remove('hl'));
    t.classList.remove('hl'); t.querySelectorAll('.hl').forEach((c) => c.classList.remove('hl'));
  });
  schemHost.addEventListener('click', (e) => {
    const t = e.target.closest('[data-field]'); if (!t || e.target.classList.contains('sc-handle')) return;
    const fe = form.fields.get(t.dataset.field.split(' ')[0]);
    if (fe) { fe.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); fe.focus(); }
  });

  let lastKey = {};
  function recompute({ live = false } = {}) {
    form.refresh();
    const ok = form.validateAll();
    warnBox.replaceChildren();
    if (ok && pendingShared.size) {
      // user edits of shared dimensions go to the rocket; re-pull so derived inputs stay consistent (tip radius = R + span)
      const r = getRocket();
      if (r.linked && pushShared(def, state.values, r.values, [...pendingShared]).length) {
        setRocket(r);
        if (pullShared(def, state.values, r.values).length) form.refresh();
      }
      pendingShared.clear();
    }
    storage.set(storeKey, state.values);
    if (!ok) {
      warnBox.append(h('div.notice.err', 'Some inputs need attention — see the highlighted fields.'));
      keyBox.style.opacity = 0.45;
      if (verdictBox) renderVerdict(null);
      return;
    }
    let out;
    try {
      out = def.compute(state.values, { compat: !!state.values.__compat });
    } catch (err) {
      if (!(err instanceof InputError)) console.error(err);
      warnBox.append(h('div.notice.err', err instanceof InputError ? err.message : `Could not compute: ${err.message}`));
      keyBox.style.opacity = 0.45;
      if (verdictBox) renderVerdict(null);
      return;
    }
    keyBox.style.opacity = 1;
    state.out = out;
    // most severe first; each says what is wrong (text) and, when it can, what to change (fix)
    const rank = { err: 0, warn: 1, info: 2 };
    for (const w of [...(out.warnings || [])].sort((a, b) => (rank[a.level] ?? 1) - (rank[b.level] ?? 1)))
      warnBox.append(h(`div.notice.${w.level || 'warn'}`, h('div', { html: rich(w.text, { html: true }) }), w.fix ? h('div.notice-fix', { html: `<b>Fix:</b> ${rich(w.fix, { html: true })}` }) : null));
    if (verdictBox) renderVerdict(out.verdict);
    renderResults(out, { cards: true });
    if (def.schematic) {
      // a handle the drawing does not ask for this time (e.g. disreef with reefing off) is hidden, not left stale
      for (const r of handles.values()) r.used = false;
      try { def.schematic(ctx, state.values, out); } catch (err) { console.error(err); }
      for (const r of handles.values()) if (!r.used) r.el.style.display = 'none';
      const sv = schemHost.querySelector('svg.schem');
      if (sv) viewport.attach(sv);
      syncAnim();
    }
    for (const c of charts) c.dirty = true;
    tableDirty = true;
    report.markDirty();
    if (live) slowSoon(); else renderSlow(true);
  }
  const recomputeSoon = debounce(() => recompute(), 110);

  // Continuous input (sliders, schematic handles) recomputes at most once per animation frame; the key results and
  // the drawing follow every frame, the results table and the charts once the input pauses — and a chart only when it
  // is on screen. A full rebuild of every chart on every pointer move was the drag lag (DISCOVERY.md §6).
  let frameReq = 0, tableDirty = false;
  function requestRecompute() { frameReq ||= requestAnimationFrame(() => { frameReq = 0; recompute({ live: true }); }); }
  function renderChart(c) {
    c.dirty = false;
    const out = state.out, bl = baseline();
    if (!out) return;
    // a plot that only makes sense for some input choices (plot.when, like field.when) is hidden for the others;
    // a plot with no data for these inputs keeps its card and says so (below)
    c.card.hidden = !!c.def.when && !c.def.when(state.values);
    if (c.card.hidden) return;
    try {
      let sp = c.def.build(state.values, out, ctx);
      // a plot card never disappears once on the page (that moved everything below it): it says why it is empty
      if (!sp) c.chart.empty();
      if (sp && bl) {
        const bs = c.def.build(bl.values, bl.out, ctx);
        const named = (n) => `${hasTeX(n) && !n.includes('$') ? `$${n}$` : n} (baseline)`;
        if (bs) sp = { ...sp, legend: true, series: [...sp.series, ...bs.series.filter((se) => se.points?.length).map((se) => ({ ...se, name: named(se.name), color: 'var(--text-3)', dashed: true, area: false, width: 1.6 }))] };
      }
      if (sp) c.chart.update(sp);
    } catch (err) { console.error(err); }
  }
  // all = true (a full recompute: load, typing, buttons) draws every chart so its height is known before it is seen;
  // during continuous input only the charts on screen are redrawn, the others when they scroll into view
  function renderSlow(all = false) {
    if (tableDirty && state.out) { tableDirty = false; renderTable(state.out); }
    for (const c of charts) if (c.dirty && (all || c.visible)) renderChart(c);
  }
  const slowSoon = debounce(() => renderSlow(), 140);
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) { const c = charts.find((x) => x.card === e.target); if (!c) continue; c.visible = e.isIntersecting; if (c.visible && c.dirty) renderChart(c); }
  }, { rootMargin: '300px 0px' });
  for (const c of charts) { c.visible = false; io.observe(c.card); }

  const renderTable = (out) => renderResults(out, { table: true });
  const VERDICT = { safe: ['✓', 'SAFE'], marginal: ['!', 'MARGINAL'], unsafe: ['✕', 'UNSAFE'], none: ['i', 'NO VERDICT'] };   // none: an input the verdict needs is missing
  /** Verdict banner: icon + word + colour (never colour alone), one-line summary, up to three fixes; fixed height. */
  function renderVerdict(v) {
    if (!v) { verdictBox.className = 'verdict'; verdictBox.replaceChildren(h('div.verdict-word', '—'), h('div.verdict-text', 'No verdict for these inputs.')); return; }
    const [icon, word] = VERDICT[v.level] || VERDICT.marginal;
    verdictBox.className = `verdict verdict-${v.level}`;
    verdictBox.replaceChildren(
      h('div.verdict-head', h('span.verdict-icon', { 'aria-hidden': 'true' }, icon), h('span.verdict-word', v.word || word), h('span.verdict-title', { html: rich(v.title || '', { html: true }) })),
      h('div.verdict-text', { html: rich(v.text || '', { html: true }) }),
      h('ul.verdict-fixes', (v.fixes || []).slice(0, 3).map((f) => h('li', { html: rich(f, { html: true }) }))));
  }
  function renderResults(out, { cards: doCards = false, table: doTable = false } = {}) {
    const R = out.results || {}, B = baseline()?.out?.results;
    const cards = [], rows = [];
    const show = (r, x) => (typeof x === 'number' ? fmt(toDisplay(x, r), { digits: r.digits || 5 }) : x == null ? '—' : String(x));
    const change = (r, v, bv) => {
      const d = delta(v, bv);
      if (!d) return null;
      if (d.abs === 0) return { txt: 'no change', cls: 'same' };
      const dd = toDisplay(v, r) - toDisplay(bv, r);
      return { txt: `${dd > 0 ? '+' : '−'}${fmt(Math.abs(dd), { digits: 3 })}${d.rel != null ? ` (${d.rel > 0 ? '+' : '−'}${fmt(Math.abs(d.rel * 100), { digits: 2 })} %)` : ''}`, cls: dd > 0 ? 'up' : 'down' };
    };
    for (const r of def.results) {
      if (r.when && !r.when(state.values, out)) continue;
      const v = R[r.id];
      const u = r.dim && r.dim !== 'none' ? texHTML(unitTex(displayUnit(r))) : '';
      const disp = typeof v === 'number' ? toDisplay(v, r) : v;
      const txt = typeof disp === 'number' ? fmt(disp, { digits: r.digits || 5 }) : disp == null ? '—' : String(disp);
      const info = () => infoFor({ ...r, kind: 'result' });
      if (r.key && doCards) {
        const st = r.status?.(v, out, state.values);
        const note = r.note?.(v, out, state.values);
        const card = h('div.kr', { class: st ? `status-${st}` : null, 'data-result': r.id },
          h('div.kr-label', h('span', { html: rich(r.label) }), r.sym ? h('span', { html: texHTML(r.sym) }) : null, infoButton(info, { label: r.label })),
          h('div.kr-row', h('span.kr-value', txt), u ? h('span.kr-unit', { html: u }) : null),
          r.note ? h('div.kr-note', { html: rich(note || '', { html: true }), title: texToPlain(String(note || '').replace(/<[^>]+>/g, '')) || null }) : null,
          B && r.id in B ? (() => { const c = change(r, v, B[r.id]); return h('div.kr-base', `Baseline ${show(r, B[r.id])}`, c ? h(`span.${c.cls}`, ` · ${c.txt}`) : null); })() : null);
        if (lastKey[r.id] !== undefined && lastKey[r.id] !== txt) card.classList.add('flash');
        lastKey[r.id] = txt;
        cards.push(card);
      }
      if (doTable) rows.push(h('tr', { class: r.key ? 'key' : null },
        h('th', h('span.lbl', h('span', { html: rich(r.label) }), r.sym ? h('span.muted', { html: texHTML(r.sym) }) : null, infoButton(info, { label: r.label }))),
        h('td.v', txt), h('td.u', { html: u }),
        B ? h('td.v.base', show(r, B[r.id])) : null,
        B ? (() => { const c = change(r, v, B[r.id]); return h(`td.delta${c ? '.' + c.cls : ''}`, c?.txt || ''); })() : null));
    }
    if (doCards) keyBox.replaceChildren(...cards);
    if (!doTable) return;
    tableHead.replaceChildren(...(B ? [h('tr', h('th', ''), h('th.v', 'Current'), h('th', ''), h('th.v', 'Baseline'), h('th', 'Change'))] : []));
    tableBody.replaceChildren(...rows);
  }

  function rowsForExport() {
    const sys = getSystem(), lines = [['section', 'quantity', 'value', 'unit']];
    for (const g of def.groups) for (const f of g.fields) {
      if (f.when && !f.when(state.values)) continue;
      const v = state.values[f.id];
      if (f.kind === 'table') {
        v.forEach((row, i) => f.columns.forEach((c) => lines.push(['input', `${texToPlain(f.label)}[${i}].${c.label}`, num(toDisplay(row[c.id], c, sys), 8), unitLabel(displayUnit(c, sys))])));
      } else lines.push(['input', texToPlain(f.label), typeof v === 'number' ? num(toDisplay(v, f, sys), 8) : String(v), f.dim ? unitLabel(displayUnit(f, sys)) : '']);
    }
    for (const r of def.results) {
      const v = state.out?.results?.[r.id];
      lines.push(['result', texToPlain(r.label), typeof v === 'number' ? num(toDisplay(v, r, sys), 8) : String(v ?? ''), r.dim ? unitLabel(displayUnit(r, sys)) : '']);
    }
    return lines;
  }
  function resultsJSON() {
    const rows = rowsForExport().slice(1), pick = (sec) => rows.filter((r) => r[0] === sec).map(([, quantity, value, unit]) => ({ quantity, value: Number.isFinite(Number(value)) && value !== '' ? Number(value) : value, unit }));
    return { calculator: def.title, slug: def.slug, unitSystem: getSystem().toUpperCase(), inputs: pick('input'), results: pick('result') };
  }
  async function copyResults() {
    const txt = rowsForExport().filter((r) => r[0] === 'result').map((r) => `${r[1]}: ${r[2]} ${r[3]}`.trim()).join('\n');
    toast((await copyText(`${def.title}\n${txt}`)) ? 'Results copied' : 'Copy failed');
  }

  resetBtn.addEventListener('click', () => { state.values = Object.assign(state.values, defaults()); form.refresh(); recompute(); toast('Inputs reset'); });
  exampleBtn?.addEventListener('click', () => { Object.assign(state.values, clone(def.examples[0].values)); form.refresh(); recompute(); toast(`Loaded: ${def.examples[0].name}`); });
  exampleSel?.addEventListener('change', () => {
    const e = def.examples[+exampleSel.value]; if (!e) return;
    Object.assign(state.values, clone(e.values)); exampleSel.value = ''; form.refresh(); recompute(); toast(`Loaded: ${e.name}`);
  });
  linkBtn.addEventListener('click', async () => {
    const link = `${location.origin}${location.pathname}#s=${encodeURIComponent(JSON.stringify(state.values))}`;
    toast((await copyText(link)) ? 'Link copied to clipboard' : 'Copy failed');
  });
  window.addEventListener('unitschange', () => { form.refresh(); recompute(); });
  window.addEventListener('themechange', () => recompute());

  form.refresh();
  syncLinked();
  renderCompare();
  recompute();
  const flash = storage.get(FLASH_KEY);
  if (flash) { storage.del(FLASH_KEY); toast(flash); }
  else if (pulledOnLoad.length) toast(`${pulledOnLoad.length} dimension${pulledOnLoad.length === 1 ? '' : 's'} from your rocket “${getRocket().name}”`);
  if (location.hash === '#info') openInfo(pageInfo());
  return { state, recompute };
}

// Handle element factory kept separate so ctx.handle can reuse elements across redraws (drag keeps pointer capture).
import { handle as mkHandle } from './ui/svg.js';
function schemFrameHandle(fr, key, onDrag, onKey, opts) {
  return mkHandle(fr, 0, 0, { field: opts.field, title: opts.title, onDrag, onKey });
}
