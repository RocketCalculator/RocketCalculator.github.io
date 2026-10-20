// Aggressive tests for every calculator: random inputs across the allowed ranges, every field at its limits,
// unit round-trips, reports free of NaN/undefined, and physical trends that must hold.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { toDisplay, fromDisplay } from '../site/js/units.js';
import { buildModel, toLaTeX, toMarkdown } from '../site/js/ui/report.js';
import { InputError } from '../site/js/util.js';
import { niceTicks } from '../site/js/ui/chart.js';

globalThis.location ??= { href: 'https://darasamii.github.io/RocketCalculator/', origin: 'https://darasamii.github.io', pathname: '/RocketCalculator/' };
const dir = new URL('../site/js/calculators/', import.meta.url);
const defs = await Promise.all(readdirSync(dir).filter((f) => f.endsWith('.js')).sort().map(async (f) => (await import(new URL(f, dir))).default));
const bySlug = Object.fromEntries(defs.map((d) => [d.slug, d]));
const fields = (def) => def.groups.flatMap((g) => g.fields);
const defaults = (def) => {
  const v = {};
  for (const f of fields(def)) v[f.id] = structuredClone(f.default);
  if (def.examples?.[0]) Object.assign(v, structuredClone(def.examples[0].values));
  return v;
};

// deterministic PRNG (mulberry32)
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** The range a user can enter: the field's limits, else its slider, else a decade either side of the default. */
function range(f, v0) {
  const d = Math.abs(typeof v0 === 'number' ? v0 : f.default) || 1;
  let lo = f.min ?? f.slider?.min ?? -10 * d, hi = f.max ?? f.slider?.max ?? 10 * d;
  if (f.min != null && f.max == null) hi = Math.max(f.slider?.max ?? 0, 10 * d, lo + d);
  if (f.minExclusive) lo += Math.max(1e-6 * (hi - lo), 1e-9);
  if (f.maxExclusive) hi -= Math.max(1e-6 * (hi - lo), 1e-9);
  return [lo, hi];
}
function sample(f, r, v0) {
  if (f.kind === 'select') return f.options[Math.floor(r() * f.options.length)].value;
  if (f.kind === 'bool') return r() < 0.5;
  if (f.kind === 'table') return v0;
  const [lo, hi] = range(f, v0);
  const x = lo > 0 && hi / lo > 50 ? Math.exp(Math.log(lo) + r() * Math.log(hi / lo)) : lo + r() * (hi - lo);
  return /^(N|nLugs)$/.test(f.id) ? Math.max(Math.ceil(lo), Math.round(x)) : x;
}
const isNumField = (f) => !f.kind || f.kind === 'number';
/** A calculator may refuse an inconsistent design with an InputError (shown to the user); any other throw is a bug. */
function computeOrRefuse(def, v, where) {
  try { return def.compute(v, {}); } catch (e) {
    if (e instanceof InputError) return null;
    assert.fail(`${where} threw ${e.constructor.name}: ${e.message}\n${JSON.stringify(v)}`);
  }
}

/** Results that are shown must be numbers, strings, arrays or explicitly empty — never undefined. */
function checkOut(def, v, out, where) {
  assert.ok(out && out.results, `${where}: no results`);
  const warned = (out.warnings || []).length > 0;
  for (const r of def.results) {
    if (r.when && !r.when(v, out)) continue;
    const x = out.results[r.id];
    assert.notEqual(x, undefined, `${where}: result ${r.id} undefined`);
    if (typeof x === 'number' && !Number.isFinite(x) && !warned && !r.allowNonFinite)
      assert.fail(`${where}: ${r.id} = ${x} with no warning shown\n${JSON.stringify(v)}`);
  }
}
function checkReport(def, v, out, where, strict) {
  if (!def.report) return;
  for (const sys of ['si', 'us']) {
    const M = buildModel({ def, state: { values: v, out }, refList: [], getSystem: () => sys });
    const md = toMarkdown(M), tex = toLaTeX(M);
    for (const [name, s] of [['md', md], ['tex', tex]]) {
      assert.ok(!/undefined|\[object |function \(/.test(s), `${where} ${sys} ${name}: ${s.match(/.{0,60}(undefined|\[object |function \().{0,30}/)?.[0]}`);
      if (strict) assert.ok(!/NaN|Infinity/.test(s), `${where} ${sys} ${name}: ${s.match(/.{0,60}(NaN|Infinity).{0,30}/)?.[0]}`);
    }
    // a formula with symbols in it must explain them (pure number/unit conversions need not)
    const hasSymbols = (eq) => /[A-Za-z]/.test(String(eq).replace(/\\(mathrm|text|operatorname)\{[^}]*\}/g, '').replace(/\\[A-Za-z]+/g, '').replace(/\d+(\.\d+)?(e[-+]?\d+)?/gi, ''))
      || /\\(alpha|beta|gamma|delta|lambda|rho|mu|phi|theta|omega|sigma|Sigma|pi|Phi)/.test(eq);
    for (const sec of M.sections) for (const st of sec.steps || []) {
      const eq = sec.steps && st.formula ? st.formula.slice(st.formula.indexOf('=') + 1) : '';
      if (strict && st.formula && hasSymbols(eq.replace(/\\pi/g, ''))) assert.ok(st.where, `${where}: step "${st.label || st.formula}" has no symbol sentence`);
    }
  }
}

/** Random sets are made geometrically possible before computing (otherwise most are refused, not tested). */
const REPAIR = {
  'drag-coefficient': (v, r) => { if (v.noseLength >= v.bodyLength) v.bodyLength = v.noseLength * (1.2 + 6 * r()); },
  'subsonic-cp': (v, r) => {
    if (v.noseL >= v.bodyLen) v.bodyLen = v.noseL * (1.2 + 6 * r());
    if (v.bt > 0 && v.b <= v.cR * Math.tan((v.bt * Math.PI) / 180)) v.bt = 0;
  },
  'fin-cant-angle': (v, r) => { if (v.b <= v.R) v.b = v.R * (1.1 + 2 * r()); },
  'yo-yo-despin': (v, r) => { if (v.ff >= v.f0) v.ff = v.f0 * r(); v.mu = r() < 0.8 ? 0 : Math.min(v.mu, 1e-5 * r()); },
  'newtonian-drag': (v, r) => { if (v.r2 <= v.r1) v.r2 = v.r1 * (1.05 + 3 * r()) + 1e-3; },
  'nozzle-thrust': (v, r) => { if (r() < 0.8) v.pa = Math.min(v.pa, 0.45 * r() * v.pc); },
};

/** Must hold for every accepted input set (warnings may be present). */
const INVARIANTS = {
  'bifilar-pendulum': (v, R) => [R.I_periods > 0, R.I_length > 0, R.PG_theory > 0, R.k > 0],
  'drag-coefficient': (v, R) => [R.CDf > 0, R.CDbOff >= 0, R.CDoff > 0, R.CDon > 0, R.lamFrac >= 0 && R.lamFrac <= 100 + 1e-9, R.CDoffPar >= R.CDoff - 1e-12],
  'fin-cant-angle': (v, R, warned) => [Math.abs(R.delta) < Math.PI / 2 || warned, R.CLp < 0, R.Ycp >= v.R - 1e-9 && R.Ycp <= v.b + 1e-9],
  'fin-flutter': (v, R) => [R.Mf > 0, R.pr > 0 && R.pr <= 1, R.tMin > 0, R.AR > 0],
  geophysics: (v, R) => [R.p > 0, R.rho > 0, R.gh > 0, R.T > 0, R.a > 0],
  'newtonian-drag': (v, R) => [R.CD >= 0, R.CDnose >= 0, R.CDfins >= 0, R.cpt > 0 && R.cpt < 2, !v.cap || (R.capXcp >= 0 && R.capXcp <= v.capR), !v.cone || (R.coneXcp >= 0 && R.coneXcp <= v.coneL)],
  'single-wedge': (v, R, warned) => [R.K >= 1 - 1e-12, R.CDw >= 0, R.CDvehicle >= 0, R.MN > 0, R.thetaMax == null || (R.thetaMax > 0 && R.thetaMax < 46)],
  'yo-yo-despin': (v, R) => [R.weightEach > 0 || !Number.isFinite(R.weightEach), R.T1 >= 0, R.T2 >= 0, R.tRelease > 0, R.r >= 0 && R.r < 1],
  'nozzle-thrust': (v, R) => [R.Me >= 1, R.pe > 0 && R.pe <= R.pStar * (1 + 1e-12), R.lambda >= 0.5 && R.lambda <= 1, R.cf <= R.cf1D + 1e-12, R.cfVac >= R.cf - 1e-12, R.thrust < R.thrustVac * (1 + 1e-12) || v.pa === 0],
  'propellant-slosh': (v, R) => [R.f1 > 0 && R.f2 > R.f1 && R.f3 > R.f2, R.m1frac > 0 && R.m1frac <= 100, R.fixedFrac >= -1e-9 && R.fixedFrac <= 100, R.L1 > 0],
  'reliability-growth': (v, R) => [R.RT >= R.R0 && R.RT <= 1, R.R0 >= 0, R.DT >= 0 && R.DT <= v.D0, R.F >= 0 && R.F <= v.N + 1e-9, R.Tstar === 'never' || (Number.isInteger(R.Tstar) && (R.Tstar > v.N) === (R.RT < v.Rt))],
  'ogive-nose': (v, R) => [R.S > 0, R.xbar > 0 && R.xbar < v.L, R.fineness > 0, R.tipHalfAngle > 0 && R.tipHalfAngle <= 90],
  'subsonic-cp': (v, R, warned) => [R.CNa > 0 || warned, R.CNaFins >= 0, Number.isFinite(R.xcp), R.d > 0],
};

for (const def of defs) {
  test(`${def.slug}: defaults and every example compute and report cleanly`, () => {
    const cases = [['defaults', defaults(def)], ...(def.examples || []).map((e) => [e.name, { ...defaults(def), ...structuredClone(e.values) }])];
    for (const [name, v] of cases) {
      const out = def.compute(v, {});
      checkOut(def, v, out, name);
      for (const r of def.results) {
        if (r.when && !r.when(v, out)) continue;
        const x = out.results[r.id];
        if (typeof x === 'number') assert.ok(Number.isFinite(x), `${name}: ${r.id} = ${x}`);
      }
      checkReport(def, v, out, name, true);
      for (const p of def.plots || []) {
        const sp = p.build(v, out, { U: () => ({ v: (x) => x, label: '', plain: '' }), sys: () => 'si' });
        if (!sp) continue;
        for (const se of sp.series) assert.ok(se.points.some((q) => q.every(Number.isFinite)), `${name}: plot ${p.id} / ${se.name} has no finite points`);
      }
    }
  });

  test(`${def.slug}: 1500 random input sets never crash or show silent NaN`, () => {
    const r = rng(0xc0ffee ^ def.slug.length * 7919);
    let refused = 0;
    for (let i = 0; i < 1500; i++) {
      const v = defaults(def);
      for (const f of fields(def)) if (r() < 0.7) v[f.id] = sample(f, r, v[f.id]);
      REPAIR[def.slug]?.(v, r);
      def.sharedAdjust?.(v);
      const out = computeOrRefuse(def, v, `#${i}`);
      if (!out) { refused++; continue; }
      checkOut(def, v, out, `#${i}`);
      const inv = INVARIANTS[def.slug]?.(v, out.results, (out.warnings || []).length > 0) || [];
      inv.forEach((ok, k) => assert.ok(ok, `#${i}: invariant ${k} of ${def.slug} broken\n${INVARIANTS[def.slug].toString().slice(0, 240)}\n${JSON.stringify(v)}\n${JSON.stringify(out.results).slice(0, 600)}`));
      if (i % 10 === 0) try { checkReport(def, v, out, `#${i}`, false); } catch (e) { assert.fail(`#${i} report: ${e.message}`); }
    }
    assert.ok(refused < 150, `${refused}/1500 repaired random designs still refused — the sampler or the limits are off`);
  });

  test(`${def.slug}: every field at its lower and upper limit`, () => {
    for (const f of fields(def).filter(isNumField)) {
      const [lo, hi] = range(f);
      for (const x of [lo, hi]) {
        const v = defaults(def); v[f.id] = x; def.sharedAdjust?.(v);
        const out = computeOrRefuse(def, v, `${f.id} = ${x}`);
        if (out) checkOut(def, v, out, `${f.id} = ${x}`);
      }
    }
  });

  test(`${def.slug}: unit round-trip SI ↔ US for every field and result`, () => {
    const v = defaults(def), out = def.compute(v, {});
    const specs = [...fields(def).filter(isNumField).map((f) => [f, v[f.id]]), ...def.results.map((r) => [r, out.results[r.id]])];
    for (const [spec, x] of specs) {
      if (typeof x !== 'number' || !Number.isFinite(x) || !spec.dim || spec.dim === 'none') continue;
      for (const sys of ['si', 'us']) {
        const back = fromDisplay(toDisplay(x, spec, sys), spec, sys);
        assert.ok(Math.abs(back - x) <= 1e-9 * Math.max(1, Math.abs(x)), `${spec.id} ${sys}: ${x} → ${back}`);
      }
    }
  });
}

test('Chart ticks: bounded and sensible for degenerate and extreme ranges', () => {
  assert.deepEqual(niceTicks(0, 10), [0, 2, 4, 6, 8, 10]);
  for (const [a, b] of [[52, 52 + 1e-12], [1e300, 1e301], [-1e-300, 1e-300], [5, 5], [1e15, 1e15 + 1], [0, 1e-320]]) {
    const t = niceTicks(a, b);
    assert.ok(t.length >= 1 && t.length <= 20, `${a}..${b}: ${t.length} ticks`);
    assert.equal(new Set(t).size, t.length, 'no duplicates');
  }
  assert.deepEqual(niceTicks(NaN, 1), []);
});

// ---------- physical trends ----------
const run = (slug, patch) => { const def = bySlug[slug]; const v = { ...defaults(def), ...patch }; def.sharedAdjust?.(v); return def.compute(v, {}).results; };
const increasing = (xs, msg) => xs.slice(1).forEach((x, i) => assert.ok(x > xs[i], `${msg}: ${xs.map((y) => y.toPrecision(5)).join(' → ')}`));

test('Fin flutter: thicker, stiffer fins have more margin; flutter Mach rises with altitude', () => {
  increasing([0.06, 0.1, 0.2, 0.4].map((t) => run('fin-flutter', { t }).MS), 'MS vs t');
  increasing([1e6, 2e6, 4e6].map((G) => run('fin-flutter', { G }).Mf), 'Mf vs G');
  const a = run('fin-flutter', { G: 1e6 }).Mf, b = run('fin-flutter', { G: 4e6 }).Mf;
  assert.ok(Math.abs(b / a - 2) < 1e-9, 'Mf ∝ √G');
  increasing([0, 10000, 30000, 60000].map((h) => run('fin-flutter', { h }).Mf), 'Mf vs h');
});

test('Ogive nose: stable for extreme fineness (slender limit S → 4πRL/3, centroid at 5L/8 from the tip)', () => {
  for (const f of [1e3, 1e5, 1e7]) {
    const R = 1, L = 2 * R * f, o = run('ogive-nose', { R, L, dx: L / 10 });
    assert.ok(Math.abs(o.S / ((4 / 3) * Math.PI * R * L) - 1) < 1e-6, `fineness ${f}: S ratio ${o.S / ((4 / 3) * Math.PI * R * L)}`);
    assert.ok(Math.abs(o.xbar / L - 5 / 8) < 1e-6, `fineness ${f}: xbar/L ${o.xbar / L}`);
  }
});

test('Ogive nose: a huge length with a tiny increment stays bounded (no runaway profile)', () => {
  const t0 = Date.now(), o = bySlug['ogive-nose'].compute({ ...defaults(bySlug['ogive-nose']), L: 1e12, dx: 1e-3 }, {});
  assert.ok(o.o.profile.length <= 2002, `${o.o.profile.length} points`);
  assert.ok(Date.now() - t0 < 1000);
  assert.ok(o.warnings.some((w) => /increment/.test(w.text)));
});

test('Ogive nose: area scales with R·L, centroid with L, fineness = L/2R', () => {
  const a = run('ogive-nose', { R: 3, L: 30 }), b = run('ogive-nose', { R: 6, L: 60 });
  assert.ok(Math.abs(b.S / a.S - 4) < 1e-9, 'similar shapes: area × 4');
  assert.ok(Math.abs(b.xbar / a.xbar - 2) < 1e-9, 'centroid × 2');
  assert.ok(Math.abs(a.fineness - 5) < 1e-12);
  assert.ok(a.xbar > 0 && a.xbar < 30);
});

test('Atmosphere: pressure, density and gravity fall with altitude', () => {
  const hs = [0, 5000, 20000, 36000, 60000, 100000];
  const p = hs.map((h) => run('geophysics', { h }).p), rho = hs.map((h) => run('geophysics', { h }).rho), g = hs.map((h) => run('geophysics', { h }).gh);
  increasing(p.reverse(), 'p falls'); increasing(rho.reverse(), 'rho falls'); increasing(g.reverse(), 'g falls');
  const eq = run('geophysics', { phi: 0, h: 0, ho: 0 }).go, pole = run('geophysics', { phi: 90, h: 0, ho: 0 }).go;
  assert.ok(pole > eq, 'gravity larger at the pole');
});

test('Bifilar pendulum: inertia ∝ mass and ∝ period squared', () => {
  const a = run('bifilar-pendulum', { m: 10 }), b = run('bifilar-pendulum', { m: 20 });
  assert.ok(Math.abs(b.I_periods / a.I_periods - 2) < 1e-9);
  const c = run('bifilar-pendulum', { PY: 5 }), d = run('bifilar-pendulum', { PY: 10 });
  assert.ok(Math.abs(d.I_periods / c.I_periods - 4) < 1e-9);
});

test('Drag: positive build-up; parasite allowance and lugs only add drag', () => {
  const base = run('drag-coefficient', {});
  for (const k of ['CDf', 'CDbOff', 'CDoff', 'CDon']) assert.ok(base[k] > 0, k);
  assert.ok(run('drag-coefficient', { parasite: 15 }).CDoffPar > run('drag-coefficient', { parasite: 5 }).CDoffPar);
  assert.ok(run('drag-coefficient', { nLugs: 4 }).CDoff > run('drag-coefficient', { nLugs: 0 }).CDoff);
  increasing([2, 3, 4, 6].map((N) => run('drag-coefficient', { N }).CDfFin), 'fin friction vs N');
});

test('Subsonic CP: bigger fins move the CP aft and raise CNα; more fins raise CNα', () => {
  increasing([2, 3, 4, 6].map((b) => run('subsonic-cp', { b }).xcp), 'xcp vs span');
  increasing([2, 3, 4, 6].map((b) => run('subsonic-cp', { b }).CNa), 'CNa vs span');
  increasing([3, 4, 6, 8].map((N) => run('subsonic-cp', { N }).CNa), 'CNa vs N');
  const nose = run('subsonic-cp', { N: 3, b: 1e-6 });
  assert.ok(Math.abs(nose.CNaBody - 2) < 1e-6, 'slender body CNα = 2');
});

test('Newtonian drag: wave drag rises past Mach 1, more sweep means less leading-edge drag, a hemisphere tends to C_D ≈ 0.92', () => {
  increasing([0.7, 0.9, 1.1, 2, 4].map((M) => run('newtonian-drag', { M }).CD), 'CD vs M');
  const sw = [60, 45, 30, 0].map((sweep) => run('newtonian-drag', { M: 3, sweep }).CDfins);
  increasing(sw, 'LE drag vs decreasing sweep');
  const h = run('newtonian-drag', { M: 10, bodyR: 2, cap: true, capR: 2, thetaM: 90, cone: false, flat: false, fins: false });
  assert.ok(Math.abs(h.CD - 0.92) < 0.01, `hemisphere CD ${h.CD}`);
});

test('Nozzle: thrust falls with ambient pressure, a wider cone loses thrust, the 1-D C_F peaks at p_e = p_a', () => {
  increasing([200, 100, 50, 14.7, 0].map((pa) => run('nozzle-thrust', { pa }).thrust), 'T vs falling p_a');
  increasing([40, 30, 20, 10, 2].map((alpha) => run('nozzle-thrust', { alpha }).cf), 'C_F vs narrowing cone');
  increasing([1, 2, 4, 8, 16].map((eps) => run('nozzle-thrust', { pa: 0, eps }).cf), 'vacuum C_F vs ε');
  const opt = run('nozzle-thrust', {}).epsOpt;
  for (const f of [0.7, 1.4]) assert.ok(run('nozzle-thrust', { eps: opt * f }).cf1D < run('nozzle-thrust', { eps: opt }).cf1D, `C_F off-optimum ×${f}`);
});

test('Fin cant: steady cant angle is linear in roll rate and sign-symmetric', () => {
  const a = run('fin-cant-angle', { mode: 'rate', f: 1 }).delta, b = run('fin-cant-angle', { mode: 'rate', f: 2 }).delta;
  assert.ok(Math.abs(b / a - 2) < 1e-9);
  const n = run('fin-cant-angle', { mode: 'rate', f: -1 }).delta;
  assert.ok(Math.abs(n + a) < 1e-12);
  increasing([2, 4, 8].map((Mc) => run('fin-cant-angle', { mode: 'cycles', Mc }).delta), 'cant vs roll cycles');
});

test('Reliability growth: more tests and better fixing raise reliability; the worksheet table is reproduced', () => {
  increasing([0, 1, 3, 6, 10].map((N) => run('reliability-growth', { N }).RT), 'R vs tests');
  increasing([0, 0.3, 0.6, 1].map((d) => run('reliability-growth', { d }).RT), 'R vs d');
  increasing([8, 4, 2, 1].map((D0) => run('reliability-growth', { D0 }).RT), 'R vs fewer defects');
  assert.ok(Math.abs(run('reliability-growth', { D0: 4, p: 0.6, d: 0.8, N: 10 }).RT - 0.9947158304489335) < 1e-12);
});
