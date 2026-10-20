// Generic calculator page: renders intro, form, key results, schematic, plots, results table, references.
// A calculator is a definition module (js/calculators/<slug>.js) — see docs/PLAN.md for the API.
import { h, url, fmt, num, debounce, toast, copyText, download, loadRegistry, loadReferences, storage, reveal } from './util.js';
import { initShell, ICONS } from './app.js';
import { displayUnit, unitLabel, unitTex, toDisplay, getSystem } from './units.js';
import { buildForm } from './ui/form.js';
import { infoButton, openInfo } from './ui/drawer.js';
import { chartCard } from './ui/chart.js';
import { frame } from './ui/svg.js';
import { renderAll, loadKatex, texHTML, rich, texToPlain } from './math.js';
import { exportMenu, exportFigure } from './ui/export.js';
import { reportCard, symbolsIn } from './ui/report.js';

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
  Object.assign(state.values, storage.get(storeKey) || {}, fromHash() || {});
  state.values.__compat = false;

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
  const form = buildForm(def, state, { onChange: (id, o) => (o?.fast ? recompute() : recomputeSoon()), onHighlight: highlight, infoFor });
  const compatBox = null;
  const inputsCard = h('aside.card.calc-inputs', { 'aria-label': 'Inputs' },
    h('div.card-head', h('h2', 'Inputs'), h('span.spacer'), h('div.form-actions', exampleSel, exampleBtn, resetBtn, linkBtn)),
    h('div.form-scroll', form.el));

  const warnBox = h('div.warnings', { 'aria-live': 'polite' });
  const keyBox = h('div.key-results', { 'aria-live': 'polite' });
  const schemHost = h('div.schem-host');
  const ANIM_KEY = 'rc-anim-paused';
  const animBtn = h('button.btn.small', { type: 'button', hidden: true, 'aria-pressed': 'false' });
  const syncAnim = () => {
    const svg = schemHost.querySelector('svg.schem');
    const paused = !!storage.get(ANIM_KEY, false);
    if (svg?.pauseAnimations) paused ? svg.pauseAnimations() : svg.unpauseAnimations();
    animBtn.replaceChildren(paused ? '▶ Play animation' : '❚❚ Pause animation');
    animBtn.setAttribute('aria-pressed', String(paused));
    animBtn.hidden = !svg?.querySelector('animate, animateTransform, animateMotion');
  };
  animBtn.addEventListener('click', () => { storage.set(ANIM_KEY, !storage.get(ANIM_KEY, false)); syncAnim(); });
  const schemCard = def.schematic ? h('section.card',
    h('div.card-head', h('h3', def.schematicTitle || 'Schematic'),
      infoButton(() => ({ eyebrow: 'Drawing', title: def.schematicTitle || 'Schematic', text: [def.schematicHint ? def.schematicHint + '.' : '', 'Hover a dimension to find its input; click it to jump there. The drawing updates with every change.', ...(def.schematicInfo?.text ? [def.schematicInfo.text] : [])].filter(Boolean), doc: docHref(def.info?.doc || '') }), { label: 'drawing' }),
      h('span.spacer'), animBtn,
      exportMenu({ formats: ['svg', 'pdf', 'eps', 'png', 'jpeg'], onExport: (f) => { const el = schemHost.querySelector('svg.schem'); if (el) exportFigure(el, f, `${def.slug}-schematic`); } })), schemHost) : null;
  const plotGrid = h('div.plot-grid');
  const charts = (def.plots || []).map((p) => {
    const info = p.info ? infoButton(() => ({ eyebrow: 'Plot', title: p.title, ...p.info, where: whereList(p.info.tex), doc: docHref(p.info.doc || '') }), { label: p.title }) : null;
    const c = chartCard({ title: p.title, info, height: p.height, exportName: `${def.slug}-${p.id}` });
    (p.wide ? plotGrid : plotGrid).append(c.card);
    if (p.wide) c.card.style.gridColumn = '1 / -1';
    return { def: p, ...c };
  });
  const tableBody = h('tbody');
  const resultsCard = h('section.card', h('div.card-head', h('h3', 'All results'), h('span.spacer'),
    h('button.btn.ghost.small', { type: 'button', onclick: () => copyResults() }, ICONS.copy(), 'Copy'),
    h('button.btn.ghost.small', { type: 'button', onclick: () => exportCSV() }, ICONS.download(), 'CSV')),
    h('div', { style: 'overflow-x:auto' }, h('table.results-table', tableBody)));

  const refList = (def.references || []).map((id) => refs.find((r) => r.id === id)).filter(Boolean);
  const theory = h('section.card.card-pad', { id: 'theory' },
    h('h2', 'Theory & references'),
    h('p', 'The full derivation, every equation, symbol definitions and assumptions are on the ',
      h('a', { href: docHref(), target: '_blank', rel: 'noopener' }, 'documentation page ↗'), '.'),
    refList.length ? h('ul.refs-list', refList.map((r) => h('li', h('div', h('div.t', r.title), h('div.a', [r.authors, r.venue].filter(Boolean).join(' · '))),
      h('div.go', h('a.btn.small', { href: url(`references/index.html#${r.id}`) }, 'Go to reference'),
        h('a.btn.small.ghost', { href: url(r.file), target: '_blank', rel: 'noopener', title: 'Open PDF in a new tab' }, 'PDF', ICONS.external()))))) : null,
    null);

  const report = reportCard({ def, state, refList, docHref, getSystem });
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
    h('div.calc-layout', inputsCard,
      h('div.calc-outputs', warnBox, keyBox, schemCard, plotGrid, resultsCard)),
    h('div', { style: 'margin-top:20px' }, theory),
    h('div', { style: 'margin-top:20px' }, report.card),
    prevnext));
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
      state.values[id] = v; form.refresh(); recompute();
    },
    setCell(id, row, col, v, { round } = {}) {
      if (!Number.isFinite(v)) return;
      if (round) v = Math.round(v / round) * round;
      const rows = state.values[id]; if (!rows?.[row]) return;
      rows[row][col] = v; form.refresh(); recompute();
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
      rec.opts = opts;
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
    if (!ids.length) return { el, caption: 'The current drawing, to scale with your inputs.' };
    if (!live.length) return null;
    const hits = new Set(sel(el));
    for (const g of hits) { g.classList.add('hl'); g.querySelectorAll('line,path,text,rect,circle,polygon,ellipse').forEach((c) => c.classList.add('hl')); }
    const inHit = (n) => { for (let p = n; p && p !== el; p = p.parentNode) if (hits.has(p)) return true; return false; };
    el.querySelectorAll('line,path,text,rect,circle,polygon,ellipse').forEach((n) => { if (!inHit(n) && !n.closest('defs')) n.classList.add('dimmed'); });
    // zoom: union of the live elements' screen boxes, mapped back to viewBox units
    const vb = src.viewBox.baseVal, r = src.getBoundingClientRect(), sx = vb.width / r.width, sy = vb.height / r.height;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of live) { const b = n.getBoundingClientRect(); if (!b.width && !b.height) continue; x0 = Math.min(x0, b.left); y0 = Math.min(y0, b.top); x1 = Math.max(x1, b.right); y1 = Math.max(y1, b.bottom); }
    if (Number.isFinite(x0)) {
      let bx = vb.x + (x0 - r.left) * sx, by = vb.y + (y0 - r.top) * sy, bw = (x1 - x0) * sx, bh = (y1 - y0) * sy;
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
  function recompute() {
    form.refresh();
    const ok = form.validateAll();
    storage.set(storeKey, state.values);
    warnBox.replaceChildren();
    if (!ok) {
      warnBox.append(h('div.notice.err', 'Some inputs need attention — see the highlighted fields.'));
      keyBox.style.opacity = 0.45;
      return;
    }
    let out;
    try {
      out = def.compute(state.values, { compat: !!state.values.__compat });
    } catch (err) {
      console.error(err);
      warnBox.append(h('div.notice.err', `Could not compute: ${err.message}`));
      keyBox.style.opacity = 0.45;
      return;
    }
    keyBox.style.opacity = 1;
    state.out = out;
    for (const w of out.warnings || []) warnBox.append(h(`div.notice.${w.level || 'warn'}`, { html: rich(w.text, { html: true }) }));
    renderResults(out);
    if (def.schematic) {
      try { def.schematic(ctx, state.values, out); } catch (err) { console.error(err); }
      syncAnim();
    }
    for (const c of charts) {
      try { const sp = c.def.build(state.values, out, ctx); c.card.hidden = !sp; if (sp) c.chart.update(sp); } catch (err) { console.error(err); }
    }
    report.markDirty();
  }
  const recomputeSoon = debounce(recompute, 110);

  function renderResults(out) {
    const R = out.results || {};
    const cards = [], rows = [];
    for (const r of def.results) {
      if (r.when && !r.when(state.values, out)) continue;
      const v = R[r.id];
      const u = r.dim && r.dim !== 'none' ? texHTML(unitTex(displayUnit(r))) : '';
      const disp = typeof v === 'number' ? toDisplay(v, r) : v;
      const txt = typeof disp === 'number' ? fmt(disp, { digits: r.digits || 5 }) : disp == null ? '—' : String(disp);
      const info = () => infoFor({ ...r, kind: 'result' });
      if (r.key) {
        const st = r.status?.(v, out, state.values);
        const note = r.note?.(v, out, state.values);
        const card = h('div.kr', { class: st ? `status-${st}` : null, 'data-result': r.id },
          h('div.kr-label', h('span', { html: rich(r.label) }), r.sym ? h('span', { html: texHTML(r.sym) }) : null, infoButton(info, { label: r.label })),
          h('div', h('span.kr-value', txt), u ? h('span.kr-unit', { html: u }) : null),
          note ? h('div.kr-note', { html: rich(note, { html: true }) }) : null);
        if (lastKey[r.id] !== undefined && lastKey[r.id] !== txt) card.classList.add('flash');
        lastKey[r.id] = txt;
        cards.push(card);
      }
      rows.push(h('tr', { class: r.key ? 'key' : null },
        h('th', h('span.lbl', h('span', { html: rich(r.label) }), r.sym ? h('span.muted', { html: texHTML(r.sym) }) : null, infoButton(info, { label: r.label }))),
        h('td.v', txt), h('td.u', { html: u })));
    }
    keyBox.replaceChildren(...cards);
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
  function exportCSV() {
    const csv = rowsForExport().map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n');
    download(`${def.slug}.csv`, csv, 'text/csv');
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
  recompute();
  if (location.hash === '#info') openInfo(pageInfo());
  return { state, recompute };
}

// Handle element factory kept separate so ctx.handle can reuse elements across redraws (drag keeps pointer capture).
import { handle as mkHandle } from './ui/svg.js';
function schemFrameHandle(fr, key, onDrag, onKey, opts) {
  return mkHandle(fr, 0, 0, { field: opts.field, title: opts.title, onDrag, onKey });
}
