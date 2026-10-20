// Input form: grouped fields with units, validation, switches, selects and editable point tables.
// Values are held in the calc module's internal units; the form converts for display.
import { h, s, num } from '../util.js';
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
        const v = fromDisplay(Number(slider.value), f, getSystem());
        state.values[f.id] = v; input.value = show(v, f, getSystem()); validate(); onChange(f.id, { fast: true });
      });
    }
    const sync = () => {
      const sys = getSystem();
      unit.innerHTML = texHTML(unitTex(displayUnit(f, sys)));
      if (document.activeElement !== input || !input.value) input.value = show(state.values[f.id], f, sys);
      if (slider) {
        const lo = toDisplay(f.slider.min, f, sys), hi = toDisplay(f.slider.max, f, sys);
        slider.min = Math.min(lo, hi); slider.max = Math.max(lo, hi); slider.step = Math.abs(hi - lo) / 400;
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

  function selectField(f) {
    const sel = h('select', { id: `f-${f.id}` }, f.options.map((o) => h('option', { value: String(o.value) }, o.label)));
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
      const fe = kind === 'bool' ? boolField(f) : kind === 'select' ? selectField(f) : kind === 'table' ? tableField(f) : numberField(f);
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
