// The shared rocket and design files, DOM-free (tested in Node).
// A field joins the shared rocket with `shared: 'key'` (same value, same internal unit everywhere) or
// `shared: { key, get(values), set(values, s) }` when the calculator describes it differently (e.g. fin tip radius = R + span).

export const SHARED = {
  bodyR: 'Body radius', noseL: 'Nose length', noseType: 'Nose shape', length: 'Overall length',
  finN: 'Number of fins', finCr: 'Fin root chord', finCt: 'Fin tip chord', finSpan: 'Fin exposed semispan', finT: 'Fin thickness',
};
export const DESIGN_FORMAT = 'rocket-calculator-design';

const fieldsOf = (def) => def.groups.flatMap((g) => g.fields);

/** [{ key, id, get(values), set(values, s) }] for the def's shared fields. */
export function sharedLinks(def) {
  return fieldsOf(def).filter((f) => f.shared).map((f) => {
    const o = typeof f.shared === 'string' ? { key: f.shared } : f.shared;
    return { key: o.key, id: f.id, field: f, get: o.get || ((v) => v[f.id]), set: o.set || ((v, s) => { v[f.id] = s; }) };
  });
}

function clampTo(f, v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return v;
  if (f.min != null) v = Math.max(f.min + (f.minExclusive ? 1e-9 : 0), v);
  if (f.max != null) v = Math.min(f.max, v);
  if (f.dim === 'none' && /^(N|finN)$/.test(f.id)) v = Math.round(v);
  return v;
}
const validFor = (f, v) => (f.kind === 'select' ? f.options.some((o) => o.value === v) : typeof v === 'number' && Number.isFinite(v));

/** Copy shared values into `values` (identity links first, then derived ones); returns the ids that changed. */
export function pullShared(def, values, shared) {
  const changed = [];
  const links = sharedLinks(def).sort((a, b) => (typeof a.field.shared === 'string' ? 0 : 1) - (typeof b.field.shared === 'string' ? 0 : 1));
  for (const l of links) {
    if (!(l.key in shared)) continue;
    const before = values[l.id];
    const trial = { ...values };
    l.set(trial, shared[l.key]);
    const next = clampTo(l.field, trial[l.id]);
    if (next === undefined || !validFor(l.field, next)) continue;   // e.g. a nose shape this calculator lacks
    if (next !== before) { values[l.id] = next; changed.push(l.id); }
  }
  if (changed.length) def.sharedAdjust?.(values);
  return changed;
}

/** Write the shared keys for the given field ids (all links when ids is omitted) into `shared`; returns keys written. */
export function pushShared(def, values, shared, ids) {
  const keys = [];
  for (const l of sharedLinks(def)) {
    if (ids && !ids.includes(l.id)) continue;
    const s = l.get(values);
    if (s === undefined || (typeof s === 'number' && !Number.isFinite(s))) continue;
    shared[l.key] = s; keys.push(l.key);
  }
  return keys;
}

/** Design file contents. calcs: { slug: values } in internal units. */
export function designFile({ name, notes = '', shared = {}, calcs = {}, baselines = {} }, now = new Date()) {
  return { format: DESIGN_FORMAT, version: 1, name: name || 'My rocket', notes, saved: now.toISOString(), shared, calculators: calcs, baselines };
}

/** Parse and validate a design file; throws with a readable message. */
export function parseDesignFile(text, knownSlugs) {
  let d;
  try { d = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  if (!d || d.format !== DESIGN_FORMAT) throw new Error('This is not a Rocket Calculator design file.');
  if (d.version > 1) throw new Error('This design file was saved by a newer version of the site.');
  const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  const keep = (o) => Object.fromEntries(Object.entries(obj(o)).filter(([k, v]) => (!knownSlugs || knownSlugs.includes(k)) && v && typeof v === 'object'));
  const shared = Object.fromEntries(Object.entries(obj(d.shared)).filter(([k, v]) => k in SHARED && (typeof v === 'number' ? Number.isFinite(v) : typeof v === 'string')));
  return { name: String(d.name || 'My rocket').slice(0, 80), notes: String(d.notes || ''), saved: d.saved, shared, calcs: keep(d.calculators), baselines: keep(d.baselines) };
}

export const fileSlug = (name) => (String(name).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'rocket').slice(0, 60);

/** Relative change used by the A/B comparison; null when undefined (zero or non-numeric baseline). */
export function delta(cur, base) {
  if (typeof cur !== 'number' || typeof base !== 'number' || !Number.isFinite(cur) || !Number.isFinite(base)) return null;
  return { abs: cur - base, rel: base !== 0 ? (cur - base) / Math.abs(base) : null };
}
