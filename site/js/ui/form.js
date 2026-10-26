// Input form: grouped fields with units, validation, switches, selects and editable point tables.
// Values are held in the calc module's internal units; the form converts for display.
import { h, s, num, fmt } from '../util.js';
import { rocketBackView, finCountWarning } from './backview.js';
import { displayUnit, unitLabel, unitTex, toDisplay, fromDisplay, getSystem } from '../units.js';
import { texHTML, rich } from '../math.js';
const L = (f) => h('span', { html: rich(f.label) });
const SYM = (f) => (f.sym ? h('span.sym', { html: texHTML(f.sym) }) : null);
/** Chain mark on fields that belong to the shared rocket (shown only while sharing is on). */
const SHARED_MARK = (f) => (f.shared ? h('span.shared-mark', { title: 'Shared with the other calculators (your rocket)', 'aria-label': 'shared with other calculators' },
  s('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'aria-hidden': 'true' },
    s('path', { d: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1' }))) : null);
import { infoButton } from './drawer.js';

const parse = (str) => {
  if (typeof str !== 'string') return NaN;
  const t = str.trim().replace(/−/g, '-').replace(/,(?=\d{1,2}$)/, '.').replace(/[\s,_]/g, '');
  if (t === '') return NaN;
  return Number(t);
};
const show = (v, spec, sys) => (v == null || Number.isNaN(v) ? '' : num(toDisplay(v, spec, sys), 6));

/**
 * buildForm(def, state, { onChange, onFocusField, infoFor })
 * state.values holds current internal values. Returns { el, refresh(), setValue(id,v), errors() , fieldEl(id) }
 */
export function buildForm(def, state, { onChange, onHighlight, infoFor }) {
  const fieldEls = new Map();      // id -> { el, sync(), validate() }
  const errs = new Map();

  function numberField(f) {
    const input = h('input', { type: 'number', inputmode: 'decimal', step: 'any', id: `f-${f.id}`, name: f.id, 'aria-describedby': `e-${f.id}`, autocomplete: 'off' });
    const unit = h('span.unit');
    const err = h('div.err-msg', { id: `e-${f.id}`, role: 'alert' });
    const lab = h('label', { for: `f-${f.id}` }, L(f), SYM(f), SHARED_MARK(f), infoButton(() => infoFor(f), { label: f.label }));
    const el = h('div.field', { 'data-for': f.id }, lab, h('div.ctl', input, unit), err);
    let slider;
    if (f.slider) {
      slider = h('input', { type: 'range', 'aria-label': `${f.label} slider`, step: 'any' });
      el.append(slider);
      slider.addEventListener('input', () => {
        // a slider with its own step (e.g. whole flights) snaps to it in the field's internal unit (a 1e5 psi step must
        // not round a value shown in GPa to zero); otherwise it moves in 1/400 of its range
        const raw = fromDisplay(Number(slider.value), f, getSystem()), st = f.slider.step;
        const v = st ? +(Math.round(raw / st) * st).toPrecision(12) : raw;
        state.values[f.id] = v; input.value = show(v, f, getSystem()); validate(); onChange(f.id, { fast: true });
      });
    }
    // RocketBackView under a fin-count input: f.backView(v) → { R, span, t, Rin, unit, nominal, note, range }
    let bv, bvSig = '';
    if (f.backView) {
      // one fixed-size drawing and one fixed-height text box (note, or the warning when there is one): nothing below
      // moves whatever N is typed
      bv = { svg: h('div.bv-svg'), text: h('p.bv-text', { role: 'status' }) };
      el.append(h('div.backview', bv.svg, bv.text));
    }
    const syncBackView = (sys) => {
      const N = state.values[f.id], cfg = f.backView(state.values) || {};
      const sig = JSON.stringify([N, sys, cfg]);
      if (sig === bvSig) return;
      bvSig = sig;
      const fmtLen = (x) => `${fmt(toDisplay(x, cfg.unit, sys), { digits: 3 })} ${unitLabel(displayUnit(cfg.unit, sys))}`;
      const ok = Number.isFinite(N) && N >= 0 && cfg.R > 0 && Number.isFinite(cfg.span ?? 0);
      bv.svg.replaceChildren(rocketBackView(ok ? { ...cfg, N } : { N: 0, R: 0 }, fmtLen));
      const warn = ok ? finCountWarning(N, cfg.range) : 'Enter a fin count and body radius to see the rear view.';
      bv.text.classList.toggle('warn', !!warn);
      bv.text.innerHTML = warn ? rich(warn) : cfg.note ? rich(cfg.note, { html: true }) : '';
      bv.text.title = bv.text.textContent;
    };
    const sync = () => {
      const sys = getSystem();
      if (bv) syncBackView(sys);
      unit.innerHTML = texHTML(unitTex(displayUnit(f, sys)));
      if (document.activeElement !== input || !input.value) input.value = show(state.values[f.id], f, sys);
      if (slider) {
        const lo = toDisplay(f.slider.min, f, sys), hi = toDisplay(f.slider.max, f, sys);
        slider.min = Math.min(lo, hi); slider.max = Math.max(lo, hi); slider.step = f.slider.step ? Math.abs(toDisplay(f.slider.min + f.slider.step, f, sys) - lo) : Math.abs(hi - lo) / 400;
        slider.value = toDisplay(state.values[f.id], f, sys);
      }
    };
    const validate = () => {
      const v = state.values[f.id];
      let msg = '';
      if (f.optional && v == null) msg = '';
      else if (v == null || !Number.isFinite(v)) msg = 'Enter a number.';
      else if (f.min != null && (f.minExclusive ? v <= f.min : v < f.min)) msg = f.minMsg || `Must be ${f.minExclusive ? 'greater than' : 'at least'} ${show(f.min, f, getSystem()) || 0} ${unitLabel(displayUnit(f))}.`.replace(/ \.$/, '.');
      else if (f.max != null && (f.maxExclusive ? v >= f.max : v > f.max)) msg = f.maxMsg || `Must be ${f.maxExclusive ? 'less than' : 'at most'} ${show(f.max, f, getSystem())} ${unitLabel(displayUnit(f))}.`.replace(/ \.$/, '.');
      setErr(f.id, msg, el, err);
      return !msg;
    };
    input.addEventListener('input', () => {
      // a number input reports unparseable text as '' — validity.badInput tells it apart from a cleared field
      const raw = input.validity?.badInput ? NaN : parse(input.value);
      state.values[f.id] = Number.isNaN(raw) ? (f.optional && input.value.trim() === '' && !input.validity?.badInput ? null : NaN) : fromDisplay(raw, f, getSystem());
      if (slider && !Number.isNaN(raw)) slider.value = raw;
      validate(); onChange(f.id);
    });
    input.addEventListener('blur', () => { if (state.values[f.id] != null && !Number.isNaN(state.values[f.id])) input.value = show(state.values[f.id], f, getSystem()); });
    if (f.optional) input.placeholder = 'optional';
    return { el, sync, validate, focus: () => input.focus() };
  }

  function boolField(f) {
    const input = h('input', { type: 'checkbox', id: `f-${f.id}`, role: 'switch' });
    const lab = h('label', { for: `f-${f.id}` }, L(f), SYM(f), SHARED_MARK(f), infoButton(() => infoFor(f), { label: f.label }));
    const el = h('div.field.bool', { 'data-for': f.id }, lab, h('span.switch', input, h('span')));
    input.addEventListener('change', () => { state.values[f.id] = input.checked; onChange(f.id); });
    return { el, sync: () => { input.checked = !!state.values[f.id]; }, validate: () => true, focus: () => input.focus() };
  }

  // date and time as 'YYYY-MM-DDTHH:MM' (empty = now): a calendar popover with month and year jumps and hour/minute
  function dateField(f) {
    const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], pad = (n) => String(n).padStart(2, '0');
    const parts = (v) => (v ? { y: +v.slice(0, 4), m: +v.slice(5, 7) - 1, d: +v.slice(8, 10), H: +v.slice(11, 13) || 0, M: +v.slice(14, 16) || 0 } : null);
    const wd = (y, m, d) => (new Date(Date.UTC(y, m, d)).getUTCDay() + 6) % 7;   // Monday = 0
    const nowP = () => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate(), H: n.getHours(), M: 0 }; };
    const btn = h('button.dt-btn', { type: 'button', id: `f-${f.id}`, 'aria-haspopup': 'dialog', 'aria-expanded': 'false' });
    const pop = h('div.dt-pop', { role: 'dialog', 'aria-label': `${f.label}: choose a date and time`, hidden: true });
    const lab = h('label', { for: `f-${f.id}` }, L(f), SYM(f), infoButton(() => infoFor(f), { label: f.label }));
    const el = h('div.field.date', { 'data-for': f.id }, lab, h('div.dt', btn, pop));
    let view = nowP();
    const set = (p) => { state.values[f.id] = p ? `${p.y}-${pad(p.m + 1)}-${pad(p.d)}T${pad(p.H)}:${pad(p.M)}` : ''; sync(); onChange(f.id); };
    const sel = (opts, value, label, on) => { const x = h('select', { 'aria-label': label }, opts.map(([v, t]) => h('option', { value: v }, t))); x.value = String(value); x.addEventListener('change', () => on(+x.value)); return x; };
    function render() {
      const cur = parts(state.values[f.id]), today = nowP(), y0 = today.y;
      const step = (k) => { view.m += k; if (view.m < 0) { view.m = 11; view.y--; } if (view.m > 11) { view.m = 0; view.y++; } render(); };
      const prev = h('button.dt-nav', { type: 'button', 'aria-label': 'Previous month' }, '‹'), next = h('button.dt-nav', { type: 'button', 'aria-label': 'Next month' }, '›');
      prev.addEventListener('click', () => step(-1)); next.addEventListener('click', () => step(1));
      const years = []; for (let y = Math.min(view.y, y0 - 10); y <= Math.max(view.y, y0 + 10); y++) years.push([y, y]);
      const head = h('div.dt-head', prev, sel(MON.map((n, i) => [i, n]), view.m, 'Month', (m) => { view.m = m; render(); }), sel(years, view.y, 'Year', (y) => { view.y = y; render(); }), next);
      const grid = h('div.dt-grid', { role: 'grid' }, DAY.map((d) => h('span.dt-dow', d)));
      const first = wd(view.y, view.m, 1), n = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
      for (let i = 0; i < first; i++) grid.append(h('span'));
      for (let d = 1; d <= n; d++) {
        const isSel = cur && cur.y === view.y && cur.m === view.m && cur.d === d, isToday = today.y === view.y && today.m === view.m && today.d === d;
        const b = h(`button.dt-day${isSel ? '.on' : ''}${isToday ? '.today' : ''}`, { type: 'button', 'aria-pressed': String(!!isSel), 'aria-label': `${d} ${MON[view.m]} ${view.y}` }, String(d));
        b.addEventListener('click', () => { const t = cur || { H: 12, M: 0 }; set({ y: view.y, m: view.m, d, H: t.H, M: t.M }); render(); });
        grid.append(b);
      }
      const t = cur || { H: 12, M: 0 }, setTime = (k, x) => { const p = parts(state.values[f.id]) || { ...nowP(), y: view.y, m: view.m, d: Math.min(today.d, n) }; p[k] = x; set(p); render(); };
      const hours = []; for (let x = 0; x < 24; x++) hours.push([x, pad(x)]);
      const mins = []; for (let x = 0; x < 60; x += 5) mins.push([x, pad(x)]);
      const time = h('div.dt-time', h('span', 'Time'), sel(hours, t.H, 'Hour', (x) => setTime('H', x)), h('b', ':'), sel(mins, t.M - (t.M % 5), 'Minute', (x) => setTime('M', x)), h('span.muted', 'site local'));
      const nowB = h('button.btn.small.ghost', { type: 'button', title: 'Use the current time' }, 'Now'), todayB = h('button.btn.small.ghost', { type: 'button' }, 'Today'), done = h('button.btn.small', { type: 'button' }, 'Done');
      nowB.addEventListener('click', () => { set(null); view = nowP(); render(); });
      todayB.addEventListener('click', () => { view = nowP(); render(); });
      done.addEventListener('click', () => close(true));
      pop.replaceChildren(head, grid, time, h('div.dt-foot', nowB, todayB, h('span.spacer'), done));
    }
    const open = () => { const c = parts(state.values[f.id]); view = c ? { y: c.y, m: c.m } : nowP(); render(); pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', esc, true); };
    function close(focus) { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', esc, true); if (focus) btn.focus(); }
    const outside = (e) => { if (!el.querySelector('.dt').contains(e.target)) close(false); };
    btn.addEventListener('click', () => (pop.hidden ? open() : close(false)));
    const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(true); } };
    function sync() {
      const p = parts(state.values[f.id]);
      btn.replaceChildren(h('span.dt-ico', { 'aria-hidden': 'true' }, '📅'), p ? `${DAY[wd(p.y, p.m, p.d)]} ${p.d} ${MON[p.m].slice(0, 3)} ${p.y} · ${pad(p.H)}:${pad(p.M)}` : 'Now — choose a date…');
    }
    return { el, sync, validate: () => true, focus: () => btn.focus() };
  }

  function selectField(f) {
    // options with a `group` are gathered into <optgroup>s (in order of first appearance); others stay at the top level
    const opt = (o) => h('option', { value: String(o.value) }, o.label), groups = new Map(), items = [];
    for (const o of f.options) {
      if (!o.group) { items.push(opt(o)); continue; }
      if (!groups.has(o.group)) { const og = h('optgroup', { label: o.group }); groups.set(o.group, og); items.push(og); }
      groups.get(o.group).append(opt(o));
    }
    const sel = h('select', { id: `f-${f.id}` }, items);
    const lab = h('label', { for: `f-${f.id}` }, L(f), SYM(f), SHARED_MARK(f), infoButton(() => infoFor(f), { label: f.label }));
    const el = h('div.field', { 'data-for': f.id }, lab, h('div.ctl', sel));
    sel.addEventListener('change', () => {
      const o = f.options.find((x) => String(x.value) === sel.value);
      state.values[f.id] = o ? o.value : sel.value; onChange(f.id);
    });
    return { el, sync: () => { sel.value = String(state.values[f.id]); }, validate: () => true, focus: () => sel.focus() };
  }

  function tableField(f) {
    const err = h('div.err-msg', { role: 'alert' });
    const wrapT = h('div.ptable-wrap');
    const headUnits = f.columns.map(() => h('span.muted'));
    const thead = h('thead', h('tr', h('th', '#'), f.columns.map((c, i) => h('th', c.label, ' ', headUnits[i])), h('th', h('span.sr-only', 'Remove'))));
    const tbody = h('tbody');
    wrapT.append(h('table.ptable', thead, tbody));
    const lab = h('label', L(f), SHARED_MARK(f), infoButton(() => infoFor(f), { label: f.label }));
    const addBtn = h('button.btn.small', { type: 'button' }, '+ Add point');
    const el = h('div.field', { 'data-for': f.id, style: 'grid-template-columns:1fr' }, lab, wrapT, h('div.ptable-actions', addBtn), err);
    const rows = () => state.values[f.id];
    const render = () => {
      const sys = getSystem();
      f.columns.forEach((c, i) => { const u = unitTex(displayUnit(c, sys)); headUnits[i].innerHTML = u ? `(${texHTML(u)})` : ''; });
      tbody.replaceChildren(...rows().map((row, ri) => {
        const tr = h('tr', { 'data-row': ri }, h('td.idx', String(ri)));
        for (const c of f.columns) {
          const inp = h('input', { type: 'text', inputmode: 'decimal', value: show(row[c.id], c, sys), 'aria-label': `${c.label}, row ${ri}` });
          inp.addEventListener('input', () => { const raw = parse(inp.value); row[c.id] = Number.isNaN(raw) ? NaN : fromDisplay(raw, c, getSystem()); validate(); onChange(f.id); });
          inp.addEventListener('focus', () => onHighlight?.(f.id, { row: ri, col: c.id }));
          inp.addEventListener('blur', () => { if (!Number.isNaN(row[c.id])) inp.value = show(row[c.id], c, getSystem()); });
          tr.append(h('td', inp));
        }
        const del = h('button', { type: 'button', 'aria-label': `Remove row ${ri}`, title: 'Remove point', disabled: rows().length <= (f.minRows || 2) }, '×');
        del.addEventListener('click', () => { rows().splice(ri, 1); render(); validate(); onChange(f.id); });
        tr.append(h('td', del));
        return tr;
      }));
    };
    addBtn.addEventListener('click', () => {
      const r = rows(), last = r[r.length - 1] || {}, prev = r[r.length - 2] || last;
      const nr = {};
      for (const c of f.columns) nr[c.id] = (last[c.id] ?? 0) + (c.id === f.columns[0].id ? Math.max(1e-6, (last[c.id] ?? 0) - (prev[c.id] ?? 0) || 1) : 0);
      r.push(nr); render(); validate(); onChange(f.id);
      tbody.lastElementChild?.querySelector('input')?.focus();
    });
    const validate = () => {
      const msg = f.validate ? f.validate(rows()) : rows().some((r) => f.columns.some((c) => Number.isNaN(r[c.id]))) ? 'Every cell needs a number.' : '';
      setErr(f.id, msg || '', el, err);
      return !msg;
    };
    return { el, sync: render, validate, focus: () => tbody.querySelector('input')?.focus(), highlightRow: (ri) => tbody.querySelectorAll('tr').forEach((tr) => tr.classList.toggle('hl', +tr.dataset.row === ri)) };
  }

  function setErr(id, msg, el, errEl) {
    if (msg) errs.set(id, msg); else errs.delete(id);
    el.classList.toggle('invalid', !!msg);
    errEl.textContent = msg;
  }

  const groups = def.groups.map((g) => {
    const fs = h('fieldset.fgroup', { 'data-group': g.id }, h('legend', g.title, g.info ? infoButton(g.info, { label: g.title }) : null));
    for (const f of g.fields) {
      const kind = f.kind || 'number';
      const fe = kind === 'bool' ? boolField(f) : kind === 'select' ? selectField(f) : kind === 'table' ? tableField(f) : kind === 'datetime' ? dateField(f) : numberField(f);
      fe.def = f;
      fieldEls.set(f.id, fe);
      fe.el.addEventListener('mouseenter', () => onHighlight?.(f.id));
      fe.el.addEventListener('mouseleave', () => onHighlight?.(null));
      fe.el.addEventListener('focusin', () => onHighlight?.(f.id));
      fe.el.addEventListener('focusout', () => onHighlight?.(null));
      fs.append(fe.el);
    }
    return fs;
  });

  const el = h('div', groups);
  const api = {
    el,
    fields: fieldEls,
    refresh() {
      for (const [id, fe] of fieldEls) {
        const f = fe.def;
        const visible = !f.when || f.when(state.values);
        fe.el.hidden = !visible;
        fe.sync();
      }
      for (const g of groups) g.hidden = [...g.querySelectorAll('.field')].every((x) => x.hidden);
    },
    validateAll() {
      let ok = true;
      for (const [, fe] of fieldEls) if (!fe.el.hidden && !fe.validate()) ok = false;
      return ok;
    },
    errors: () => errs,
  };
  return api;
}
