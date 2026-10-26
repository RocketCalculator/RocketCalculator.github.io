// Aggressive tests for every calculator: random inputs across the allowed ranges, every field at its limits,
// unit round-trips, reports free of NaN/undefined, and physical trends that must hold.
import { test } from 'node:test';
import { conicalLength, convergentLength } from '../site/js/calc/nozzle.js';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { toDisplay, fromDisplay } from '../site/js/units.js';
import { buildModel, toLaTeX, toMarkdown } from '../site/js/ui/report.js';
import { InputError } from '../site/js/util.js';
import { niceTicks } from '../site/js/ui/chart.js';

globalThis.location ??= { href: 'http://localhost/', origin: 'http://localhost', pathname: '/' };   // reports only read location.href
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
  if (f.kind === 'table' || f.kind === 'datetime') return v0;
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
  'nozzle-thrust': (v, r) => { if (r() < 0.8) v.pa = Math.min(v.pa, 0.45 * r() * v.pc); if (v.din < 2.6 * v.dt) v.din = v.dt * (2.6 + 3 * r()); if (v.de <= 1.02 * v.dt) v.de = v.dt * (1.1 + 5 * r()); const eps = (v.de / v.dt) ** 2, rt = v.dt / 2; v.Lc = convergentLength(rt, v.din / 2, 15 + 40 * r()); v.Ld = v.type === 'cone' ? conicalLength(rt, eps, 8 + 20 * r(), 0.382 * rt) : (0.6 + 0.4 * r()) * conicalLength(rt, eps, 15, 0.382 * rt); },
  'wind-compensation': (v, r) => { for (const k of ['WI', 'WC', 'R']) if (Math.abs(v[k]) > 5500) v[k] = Math.sign(v[k]) * 5500 * r(); },
  'roll-rate-history': (v, r) => { if (v.b <= v.R) v.b = v.R * (1.1 + r()); if (v.hB <= v.L) v.hB = v.L * (2 + 20 * r()); },
  'parachute-recovery': (v, r) => { if (v.hG + v.hD > 36000) { v.hG = 6000 * r(); v.hD = 1000 + 25000 * r(); } if (v.reef && v.hR >= v.hD) v.hR = v.hD * r(); },
  'launcher-deflection': (v, r) => { if (v.D <= 2 * v.t) v.t = v.D * 0.4 * r(); if (v.d <= v.D) v.d = v.D * (1.5 + 10 * r()); },
  'tethered-pibal': (v, r) => { if (v.D < 2) v.D = 2 + 4 * r(); if (v.We > 0.5) v.We = 0.5 * r(); if (v.L > 1500) v.L = 50 + 1400 * r(); if (v.dt > 0.05) v.dt = 0.005 + 0.03 * r(); if (v.rhoT > 3) v.rhoT = 0.5 + 2 * r(); if (v.pG > 110000 || v.pG < 50000) v.pG = 50000 + 60000 * r(); if (v.TG < 250) v.TG = 250 + 70 * r(); if (v.theta < 15) v.theta = 15 + 70 * r(); if (v.hG > 15000) v.hG = 15000 * r(); if (v.CD < 0.2) v.CD = 0.2 + 0.6 * r(); },
  'nose-cone': (v, r) => { if (v.L < 1.5 * v.R || v.L > 30 * v.R) v.L = v.R * (1.5 + 20 * r()); if (v.bodyLen > 80 * v.R) v.bodyLen = v.R * 40 * r(); if (v.rn > 0.5 * v.R) v.rn = 0.4 * v.R * r(); },
  'ground-handling': (v, r) => { if (!(v.xAt > v.xFt)) v.xAt = v.xFt + 10 + 100 * r(); const s = [v.xF, v.xL, v.xN].sort((a, b) => a - b); [v.xF, v.xL, v.xN] = [s[0], s[1] + 1e-3, s[2] + 2e-3]; },
  'flight-path-dispersion': (v, r) => { if (v.hb <= v.L) v.hb = v.L * (2 + 50 * r()); if (v.T < 2 * 32.174 * v.m) v.T = 32.174 * v.m * (2 + 15 * r()); if (2 * Math.PI / v.rollWave >= v.lP) v.rollWave = 2 * Math.PI / (v.lP * (0.1 + 0.8 * r())); },
  'roll-lock-in-design': (v, r) => { if (!(v.xF > v.xS)) v.xF = v.xS * (1.1 + r()) + 0.1; const lo = Math.max(0, v.xN - v.xCG); if (!(v.xF - v.xCG > lo + 1e-3)) v.xF = v.xCG + lo + 0.2 + r(); if (!(v.SM > lo && v.SM < v.xF - v.xCG)) v.SM = lo + (v.xF - v.xCG - lo) * (0.1 + 0.8 * r()); },
  'skyaero-trajectory': (v) => { for (const k of [1, 2, 3]) { v[`s${k}Wd`] = Math.min(Math.max(v[`s${k}Wd`], 3), k === 1 ? 120 : 30); v[`s${k}Wp`] = Math.min(Math.max(v[`s${k}Wp`], 0.5), 2 * v[`s${k}Wd`]); v[`s${k}d`] = Math.max(v[`s${k}d`], 0.5); v[`s${k}Ae`] = Math.min(v[`s${k}Ae`], 0.4 * v[`s${k}d`] ** 2); } },
  'two-stage-weights': (v, r) => { const lim = 32.174 * (-v.Isp1 * Math.log(v.s1) - v.Isp2 * Math.log(v.s2)); if (v.dv >= lim) v.dv = lim * (0.02 + 0.93 * r()); },
};

/** Must hold for every accepted input set (warnings may be present). */
const INVARIANTS = {
  'bifilar-pendulum': (v, R) => [R.I_periods > 0, R.I_length > 0, R.PG_theory > 0, R.k > 0],
  'drag-coefficient': (v, R) => [R.CDf > 0, R.CDbOff >= 0, R.CDoff > 0, R.CDon > 0, R.lamFrac >= 0 && R.lamFrac <= 100 + 1e-9, R.CDoffPar >= R.CDoff - 1e-12],
  'fin-cant-angle': (v, R, warned) => [Math.abs(R.delta) < Math.PI / 2 || warned, R.CLp < 0, R.Ycp >= v.R - 1e-9 && R.Ycp <= v.b + 1e-9],
  'fin-flutter': (v, R) => [R.Vf > 0, R.SF > 0, R.tNeed > 0, R.A > 0, R.eps >= 0.25, R.Valt > 0, R.Vhoult > 0, R.SFhot <= R.SF * (1 + 1e-12)],
  geophysics: (v, R) => [R.p > 0, R.rho > 0, R.gh > 0, R.T > 0, R.a > 0],
  'newtonian-drag': (v, R) => [R.CD >= 0, R.CDnose >= 0, R.CDfins >= 0, R.cpt > 0 && R.cpt < 2, !v.cap || (R.capXcp >= 0 && R.capXcp <= v.capR), !v.cone || (R.coneXcp >= 0 && R.coneXcp <= v.coneL)],
  'single-wedge': (v, R, warned) => [R.K >= 1 - 1e-12, R.CDw >= 0, R.CDvehicle >= 0, R.MN > 0, R.thetaMax == null || (R.thetaMax > 0 && R.thetaMax < 46)],
  'yo-yo-despin': (v, R) => [R.weightEach > 0 || !Number.isFinite(R.weightEach), R.T1 >= 0, R.T2 >= 0, R.tRelease > 0, R.r >= 0 && R.r < 1],
  'nozzle-thrust': (v, R) => [R.Me >= 1, R.pStar > 0 && R.pStar < v.pc, R.lambda >= 0.5 && R.lambda <= 1, R.cfVac >= R.cf - 1e-12, (R.sepMargin === '—') === !(v.pa > 0),
    typeof R.sepMargin !== 'number' || R.sepMargin >= 1 || R.xSep !== '—' || R.xShock !== '—', Math.abs(R.isp - (R.cf * R.cstar) / 9.80665) <= 1e-9 * Math.abs(R.isp), R.peNS < R.peSub],
  'propellant-slosh': (v, R) => [R.f1 > 0 && R.f2 > R.f1 && R.f3 > R.f2, R.m1frac > 0 && R.m1frac <= 100, R.fixedFrac >= -1e-9 && R.fixedFrac <= 100, R.L1 > 0],
  'reliability-growth': (v, R) => [R.RT >= R.R0 && R.RT <= 1, R.R0 >= 0, R.DT >= 0 && R.DT <= v.D0, R.F >= 0 && R.F <= v.N + 1e-9, R.Tstar === 'never' || (Number.isInteger(R.Tstar) && (R.Tstar > v.N) === (R.RT < v.Rt))],
  'wind-compensation': (v, R) => [R.QE > 0 && R.QE <= 90, R.AZT >= 0 && R.AZT < 360, Math.abs(Math.hypot(R.tiltI, R.tiltC) - R.tilt) <= 1e-9 * Math.max(1, R.tilt), Math.abs(R.QE + R.tilt - 90) < 1e-9, R.offAxis >= 0 && R.offAxis <= 90],
  'pitch-yaw-wavenumber': (v, R) => [R.L > 0, Math.abs(R.L * R.lam - 2 * Math.PI) < 1e-9, R.f > 0, Math.abs(R.P * R.f - 1) < 1e-9, R.Cma < 0, R.I > 0],
  'roll-rate-history': (v, R) => [R.fB * Math.sign(v.delta || 1) >= -1e-12, Math.abs(R.fB) <= Math.abs(R.fB0) * (1 + 1e-9) + 1e-12, Math.abs(R.fA) <= Math.abs(R.fB0) * (1 + 1e-9) + 1e-12, R.JB <= 0, R.k <= 0, R.X >= 0, R.CLp < 0],
  'parachute-recovery': (v, R) => [R.t > 0, R.drift >= 0, R.vAft <= R.vNose * (1 + 1e-12), R.vAft >= R.vAftMin * (1 - 1e-12), R.vDeploy > 0, !v.reef || (R.k > 0 && R.k <= 1 && R.tReefed > 0)],
  'upper-stage-divergence': (v, R) => [R.qD > 0, typeof R.amp !== 'number' || R.amp >= 1, typeof R.margin !== 'number' || Math.abs(R.margin - R.qD / v.q) <= 1e-9 * R.margin, v.mode !== 'tube' || Math.abs(R.lmax - v.l * Math.sqrt(R.qD / v.q)) <= 1e-9 * R.lmax],
  'launcher-deflection': (v, R) => [R.pitchDeg >= R.yawDeg - 1e-12, R.yawDeg >= 0, R.Fp >= R.Ft - 1e-12, R.I > 0, R.Lmax === 'no limit' || Math.abs(v.factor * R.Fp * R.Lmax ** 2 / (2 * R.EI) * 180 / Math.PI - v.allow) <= 1e-9 * v.allow],
  'tethered-pibal': (v, R) => [R.Vc > 0 && R.Vc <= R.V * (1 + 1e-12), R.corr > 0 && R.corr <= 1, R.lift > 0, Math.abs(Math.hypot(R.north, R.east) - R.Vc) <= 1e-9 * R.Vc, R.b >= 0 && R.c >= 0],
  'nose-cone': (v, R) => [R.T0 > 0, R.xcp > 0 && R.xcp < R.Leff, R.CNa === 2, R.S > 0, R.Vol > 0, R.Mcr > 0 && R.Mcr <= 1, R.CD === '—' || Number.isFinite(R.CD), R.beta === '—' || (R.beta > 0 && R.beta <= 90)],
  'payload-venting': (v, R) => [Number.isFinite(R.dpMax), R.tau > 0, R.A > 0, R.p0 > 0, R.allow > 0, Number.isFinite(R.MTmax)],
  'body-bending': (v, R) => [R.f1 > 0 && R.f2 > R.f1 && R.f3 > R.f2, R.L > 0, R.W > 0],
  'ground-handling': (v, R) => [R.W > 0, R.xCG >= v.xL || R.lift0 > 0, Number.isFinite(R.FL) && Number.isFinite(R.MJ)],
  'flight-path-dispersion': (v, R) => [R.gD >= 0 && R.gG >= 0, Math.abs(Math.hypot(R.gD, R.gG) - R.gam) <= 1e-9 * R.gam + 1e-300, R.g0 <= R.gam * (1 + 1e-12), R.LA >= 0, R.n > 0 && R.n < 1],
  'roll-lock-in-design': (v, R) => [R.Pno >= 0 && R.Pno <= 100, R.sigma >= 0, R.D > 0, R.cR > 0, R.CMa < 0, R.CLp < 0, R.alphaStar === '—' || (R.alphaStar > 0 && R.alphaStar <= v.alphaMax * (1 + 1e-12))],
  'skyaero-trajectory': (v, R) => [R.apo >= 0, R.railV > 0, R.maxMach >= 0, R.tw > 0, Number.isFinite(R.range), R.maxQ >= 0, R.railL > 0, R.dist >= 0, Number.isFinite(R.vImp), R.Dneed > 0, R.bearing >= 0 && R.bearing < 360],
  'two-stage-weights': (v, R) => [R.M01 >= v.Mpl, R.m1 >= 0 && R.m2 >= 0, Math.abs(R.M01 - v.Mpl - R.m1 - R.m2) <= 1e-9 * R.M01, Math.abs(R.dv1 + R.dv2 - v.dv) <= 1e-6 * v.dv, R.payloadPct > 0 && R.payloadPct <= 100, R.lam > 0],
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
        for (const se of sp.series ?? sp.panels.flatMap((pn) => pn.series || [])) assert.ok(se.points.some((q) => q.every(Number.isFinite)), `${name}: plot ${p.id} / ${se.name} has no finite points`);
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
const close2 = (x, y, msg, tol = 1e-6) => assert.ok(Math.abs(x - y) <= tol * Math.max(1, Math.abs(y)), `${msg}: ${x} vs ${y}`);
const increasing = (xs, msg) => xs.slice(1).forEach((x, i) => assert.ok(x > xs[i], `${msg}: ${xs.map((y) => y.toPrecision(5)).join(' → ')}`));

test('Fin flutter: thicker, stiffer, shorter fins and higher, cooler flight are safer; the remedies reach the target', () => {
  increasing([0.06, 0.1, 0.2, 0.4].map((t) => run('fin-flutter', { t }).SF), 'SF vs t');
  increasing([1e6, 2e6, 4e6].map((Gc) => run('fin-flutter', { material: 'custom', Gc }).Vf), 'Vf vs G');
  const a = run('fin-flutter', { material: 'custom', Gc: 1e6 }).Vf, b = run('fin-flutter', { material: 'custom', Gc: 4e6 }).Vf;
  assert.ok(Math.abs(b / a - 2) < 1e-9, 'Vf ∝ √G');
  increasing([6, 4, 3, 2].map((b) => run('fin-flutter', { b }).SF), 'SF vs shorter span');
  increasing([0, 10000, 30000, 60000].map((hMax) => run('fin-flutter', { hMax }).Vf), 'Vf vs altitude');
  increasing([100, 70, 40].map((Tsite) => run('fin-flutter', { Tsite }).SF), 'SF vs cooler day');
  // Bennett's example flies at Mach 1.44: the supersonic target 2.0 applies
  const r = run('fin-flutter', {});
  assert.ok(Math.abs(run('fin-flutter', { t: r.tNeed }).SF - 2) < 1e-9, 't_req gives the target');
  assert.ok(Math.abs(run('fin-flutter', { b: r.bMax }).SF - 2) < 1e-6, 'b_max gives the target');
  const sub = run('fin-flutter', { Vmax: 900 });   // subsonic: the user's target 1.5
  assert.ok(Math.abs(run('fin-flutter', { Vmax: 900, t: sub.tNeed }).SF - 1.5) < 1e-9, 'subsonic target');
  assert.equal(run('fin-flutter', { tipToTip: true }).Gused, 2 * r.Gused);
});

test('Nose cone: Hoult ogive example and Crowell centre-of-pressure fractions; similar noses scale', () => {
  const a = run('nose-cone', { noseType: 'ogive', R: 3, L: 30, blunt: false });
  assert.ok(Math.abs(a.S / 379.2477 - 1) < 2e-4, `ogive wetted area ${a.S}`);
  const frac = (noseType) => 1 - run('nose-cone', { noseType, R: 3, L: 30, blunt: false }).xcp / 30;   // from the base
  assert.ok(Math.abs(frac('cone') - 1 / 3) < 1e-3 && Math.abs(frac('ogive') - 0.534) < 3e-3 && Math.abs(frac('vonkarman') - 0.5) < 2e-3, 'Crowell X_n/L');
  assert.ok(Math.abs(frac('lvhaack') - 0.5625) < 2e-3 && Math.abs(frac('ellipse') - 2 / 3) < 2e-3, 'LV-Haack and ellipse (Crowell misprints corrected)');
  const b = run('nose-cone', { noseType: 'ogive', R: 6, L: 60, blunt: false });
  assert.ok(Math.abs(b.S / a.S - 4) < 1e-6 && Math.abs(b.xcp / a.xcp - 2) < 1e-6 && Math.abs(a.fineness - 5) < 1e-12, 'similarity');
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

test('Dispersion: more misalignment, gust or slower boost raise the error; more static margin lowers it', () => {
  increasing([0.001, 0.002, 0.004].map((dT) => run('flight-path-dispersion', { dT }).g0), 'γ0 vs δ_T');
  increasing([1, 3.3, 8].map((sG) => run('flight-path-dispersion', { sG }).gG), 'γ_G vs σ_G');
  increasing([0.04, 0.03, 0.022, 0.012].map((lP) => run('flight-path-dispersion', { lP }).LA), 'L_A vs falling λ_P');
  increasing([1000, 600, 300].map((T) => run('flight-path-dispersion', { T }).n), 'g/2a vs falling thrust');
});

test('Roll lock-in: more static margin raises α*; worse alignment lowers the chance of no lock-in', () => {
  increasing([16, 18, 20].map((SM) => run('roll-lock-in-design', { SM: SM * 0.0254 }).alphaStar), 'α* vs SM');
  increasing([0.006, 0.004, 0.002].map((sdT) => run('roll-lock-in-design', { sdT, T: 20000 }).Pno), 'P vs better alignment');
  increasing([0.001, 0.002, 0.004].map((sdT) => run('roll-lock-in-design', { sdT }).sigma), 'σ_α vs δ_T');
});

test('Trajectory: lower elevation flies farther; more weight or drag lowers apogee', () => {
  increasing([88, 84, 80].map((QE) => run('skyaero-trajectory', { QE }).range), 'range vs falling QE');
  increasing([80, 60, 51].map((s1Wd) => run('skyaero-trajectory', { s1Wd }).apo), 'apogee vs lighter rocket');
  increasing([9, 7.5, 6.25].map((s1d) => run('skyaero-trajectory', { s1d }).apo), 'apogee vs slimmer rocket');
});

test('Subsonic CP: the worst-case margin is the minimum of the cases; every solved fix reaches the target', () => {
  const r = run('subsonic-cp', { xcg: 75, xcgB: 77, targetSM: 2, mass: 20 });
  assert.ok(r.margin <= r.marginNom + 1e-12 && r.margin <= r.marginNoCarry + 1e-12 && r.margin <= r.marginBurn + 1e-12);
  assert.ok(r.dCG > 0 && typeof r.bNeed === 'number' && r.ballast > 0);
  close2(run('subsonic-cp', { xcg: 75 - r.dCG, xcgB: 77 - r.dCG, targetSM: 2 }).margin, 2, 'CG shift reaches the target');
  close2(run('subsonic-cp', { xcg: r.xcgMax, xcgB: r.xcgMax - 1, targetSM: 2 }).margin, 2, 'furthest-aft CG gives the target');
  close2(run('subsonic-cp', { xcg: 75, xcgB: 77, targetSM: 2, b: r.bNeed }).margin, 2, 'span reaches the target');
  const d = defaults(bySlug['subsonic-cp']);
  // ballast at x_b with the launch mass: the burnout CG moves by the same mass ratio (conservative), so the worst case meets the target
  const xb = d.noseL / 2, mb = r.ballast, cg = (x) => (20 * x + mb * xb) / (20 + mb);
  const rb = run('subsonic-cp', { xcg: cg(75), xcgB: cg(77), targetSM: 2 });
  assert.ok(rb.margin >= 2 - 1e-9 && rb.margin < 2 + 1e-6, `ballast reaches the target: ${rb.margin}`);
  // a safe design: the span for the target is smaller than the current span, and the verdict asks for nothing
  const ok = run('subsonic-cp', { xcg: 60, xcgB: null });
  assert.ok(ok.bNeed < d.b && ok.dCG === 0);
  close2(run('subsonic-cp', { xcg: 60, xcgB: null, b: ok.bNeed }).margin, 1.5, 'smallest span for the target');
  increasing([77, 74, 71].map((xcgB) => run('subsonic-cp', { xcg: 70, xcgB }).margin), 'worst margin vs burnout CG moving forward');
  assert.equal(run('subsonic-cp', { xcg: null }).margin, null);
});

test('Subsonic CP: verdict bands follow the user limits; a nose longer than the rocket is clamped, not refused', () => {
  const def = bySlug['subsonic-cp'], lvl = (p) => def.compute({ ...defaults(def), ...p }, {}).verdict.level;
  const m = run('subsonic-cp', { xcg: 72, xcgB: null }).margin;
  assert.equal(lvl({ xcg: 72, xcgB: null, minSM: m - 0.1, targetSM: m + 0.1 }), 'marginal');
  assert.equal(lvl({ xcg: 72, xcgB: null, minSM: m + 0.1, targetSM: m + 0.2 }), 'unsafe');
  assert.equal(lvl({ xcg: 72, xcgB: null, minSM: m - 0.2, targetSM: m - 0.1 }), 'safe');
  assert.ok(Number.isFinite(run('subsonic-cp', { noseL: 120, bodyLen: 93.16 }).xcp));
});

test('Nozzle: thrust falls with ambient pressure, a wider cone loses thrust, the 1-D C_F peaks at p_e = p_a', () => {
  increasing([200, 100, 50, 14.7, 0].map((pa) => run('nozzle-thrust', { pa }).thrust), 'T vs falling p_a');
  increasing([40, 30, 20, 10, 4].map((a) => run('nozzle-thrust', { type: 'cone', Ld: conicalLength(0.5, 8, a, 0.191) }).cf), 'C_F vs narrowing cone');
  increasing([60, 70, 80, 90, 100].map((Lf) => run('nozzle-thrust', { Ld: (Lf / 100) * conicalLength(0.5, 8, 15, 0.191) }).cf), 'C_F vs longer bell');
  increasing([1.5, 2, 4, 8, 16].map((eps) => run('nozzle-thrust', { pa: 0, type: 'cone', de: Math.sqrt(eps), Ld: conicalLength(0.5, eps, 15, 0.191) }).cf), 'vacuum C_F vs ε');
  const opt = (run('nozzle-thrust', {}).deOpt) ** 2, at = (e) => run('nozzle-thrust', { type: 'cone', de: Math.sqrt(e), Ld: conicalLength(0.5, e, 15, 0.191) }).cf1D;
  for (const f of [0.7, 1.4]) assert.ok(at(opt * f) < at(opt), `C_F off-optimum ×${f}`);
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

test('Two-stage weights: a faster or heavier-structured rocket is heavier; better impulse makes it lighter', () => {
  increasing([1000, 3000, 6000, 10000, 15000].map((dv) => run('two-stage-weights', { dv }).M01), 'M01 vs ΔV');
  increasing([0.08, 0.12, 0.2, 0.3].map((s1) => run('two-stage-weights', { dv: 8000, s1 }).M01), 'M01 vs σ1');
  increasing([300, 260, 220, 180].map((Isp2) => run('two-stage-weights', { dv: 8000, Isp2 }).M01), 'M01 vs falling Isp2');
  const a = run('two-stage-weights', { Mpl: 1 }), b = run('two-stage-weights', { Mpl: 7 });
  assert.ok(Math.abs(b.M01 / a.M01 - 7) < 1e-9, 'masses scale with the payload');
});

test('Wind compensation: more range or more drift needs more tilt; the tilt opposes the cross drift', () => {
  increasing([1000, 2000, 3500, 5000].map((R) => run('wind-compensation', { WI: 0, WC: 0, R }).tilt), 'tilt vs range');
  increasing([0, 1000, 2500, 4000].map((WC) => run('wind-compensation', { WC }).tilt), 'tilt vs cross drift');
  assert.ok(run('wind-compensation', { WC: 2000 }).tiltC < 0 && run('wind-compensation', { WC: -2000 }).tiltC > 0, 'cross tilt against the drift');
  assert.ok(run('wind-compensation', { WI: 6000, R: 2000 }).tiltI < 0, 'tailwind past the target tilts back');
});

test('Pitch-yaw wave number: stiffer or lighter rockets have shorter wavelengths; speed changes only the frequency', () => {
  increasing([4, 3, 2, 1, 0.5].map((SM) => run('pitch-yaw-wavenumber', { SM }).L), 'L vs falling margin');
  increasing([10, 20, 40].map((m) => run('pitch-yaw-wavenumber', { m }).L), 'L vs mass');
  increasing([1.225, 0.9, 0.5].map((rho) => -run('pitch-yaw-wavenumber', { rho }).lam), 'λ vs thinner air');
  const a = run('pitch-yaw-wavenumber', { U: 100 }), b = run('pitch-yaw-wavenumber', { U: 300 });
  assert.ok(Math.abs(a.L - b.L) < 1e-9 * a.L && Math.abs(b.f / a.f - 3) < 1e-9, 'speed scales f only');
});

test('Roll rate history: more cant spins faster; more inertia lags more; thinner apogee air keeps more spin', () => {
  increasing([0.05, 0.1, 0.2, 0.4].map((delta) => run('roll-rate-history', { delta }).fB), 'p_B vs cant');
  increasing([1, 0.5, 0.2, 0.05].map((Ixx) => run('roll-rate-history', { Ixx }).fB), 'p_B vs lighter roll inertia');
  increasing([0.0023, 0.0015, 0.0008].map((rhoA) => run('roll-rate-history', { rhoA }).fA), 'p_A vs thinner apogee air');
  const r = run('roll-rate-history', { delta: -0.2 }), f = run('roll-rate-history', { delta: 0.2 });
  assert.ok(Math.abs(r.fB + f.fB) < 1e-9 && Math.abs(r.turns + f.turns) < 1e-9, 'cant sign flips the spin');
});

test('Parachute recovery: a bigger canopy descends slower; a longer tether lands the aft body softer; reefing shortens the descent', () => {
  increasing([3, 5, 7, 10].map((D0) => run('parachute-recovery', { D0 }).t), 'time vs bigger canopy');
  increasing([100, 60, 30, 10, 0].map((L) => run('parachute-recovery', { L }).vAft), 'aft speed vs shorter tether');
  assert.ok(run('parachute-recovery', { reef: true }).t < run('parachute-recovery', { reef: false }).t, 'reefing descends faster');
  increasing([0, 3000, 6000].map((hG) => run('parachute-recovery', { hG }).vNose), 'landing speed vs ground elevation');
});

test('Upper-stage divergence: longer or softer stages diverge sooner; loads grow toward q_D', () => {
  increasing([250, 200, 150, 100].map((l) => run('upper-stage-divergence', { l }).qD), 'q_D vs shorter stage');
  increasing([0.05, 0.1, 0.2].map((t) => run('upper-stage-divergence', { t }).qD), 'q_D vs thicker wall');
  increasing([0, 4000, 8000, 12000].map((q) => run('upper-stage-divergence', { q }).amp), 'amplification vs q');
  assert.equal(run('upper-stage-divergence', { q: 1e6 }).amp, 'diverges');
});

test('Launcher deflection: longer rails and heavier rockets bend more; steeper rails less', () => {
  increasing([60, 120, 240, 480].map((L) => run('launcher-deflection', { L }).pitchDeg), 'slope vs length');
  increasing([20, 55, 100].map((W) => run('launcher-deflection', { W }).pitchDeg), 'slope vs weight');
  increasing([88, 85, 80, 70].map((QE) => run('launcher-deflection', { QE }).pitchDeg), 'slope vs flatter rail');
  increasing([0.04, 0.065, 0.12].map((t) => run('launcher-deflection', { t }).Lmax), 'L_max vs thicker tubes');
});

test('Tethered pibal: a lower angle means more wind; a longer tether needs more correction', () => {
  increasing([80, 60, 40, 20].map((theta) => run('tethered-pibal', { theta }).Vc), 'wind vs lower angle');
  increasing([1000, 500, 200, 50].map((L) => run('tethered-pibal', { L }).corr), 'correction vs shorter tether');
  increasing([2, 3, 4].map((D) => run('tethered-pibal', { D }).lift), 'lift vs bigger balloon');
});

test('Nose cone: subsonic trends (cone vs ogive, Mach, length), the optimum beats cone and ogive, supersonic drag falls with fineness', () => {
  const sub = (o) => run('nose-cone', { M: 0, alpha: 0, blunt: false, ...o });
  assert.ok(sub({ noseType: 'cone' }).cpMin < sub({ noseType: 'ogive' }).cpMin && sub({ noseType: 'cone' }).grad > sub({ noseType: 'ogive' }).grad, 'cone vs ogive');
  increasing([0, 0.4, 0.7].map((M) => -run('nose-cone', { M, blunt: false }).cpMin), 'suction vs Mach');
  increasing([10, 20, 40].map((L) => sub({ L }).Mcr), 'M_cr vs longer nose');
  const n = sub({}).nOpt, opt = sub({ noseType: 'superellipse', seN: n });
  assert.ok(opt.Mcr > sub({ noseType: 'ogive' }).Mcr && opt.Mcr > sub({ noseType: 'cone' }).Mcr, 'optimum superellipse has the highest M_cr');
  increasing([40, 30, 20].map((L) => run('nose-cone', { L, M: 2, blunt: false }).CDp), 'wave drag vs shorter nose');
  increasing([1.5, 2.5, 4].map((M) => run('nose-cone', { M, blunt: false }).T0), 'stagnation temperature vs Mach');
});

test('Payload venting: bigger or more vents lower the peak difference; a bigger bay raises it', () => {
  increasing([0.4, 0.2, 0.1, 0.05].map((d) => Math.abs(run('payload-venting', { d }).dpMax)), 'Δp vs smaller vent');
  increasing([4, 2, 1].map((N) => Math.abs(run('payload-venting', { N }).dpMax)), 'Δp vs fewer vents');
  increasing([0.05, 0.2, 1].map((Vol) => Math.abs(run('payload-venting', { Vol }).dpMax)), 'Δp vs bay volume');
});

test('Body bending: a stiffer body rings higher, a heavier one lower (f ∝ √(EI/m))', () => {
  const e = (k, kw = 1) => bySlug['body-bending'].examples[0].values.elems.map((r) => ({ ...r, EIf: r.EIf * k, EIa: r.EIa * k, wf: r.wf * kw, wa: r.wa * kw }));
  const f = (k, kw) => run('body-bending', { elems: e(k, kw) }).f1;
  assert.ok(Math.abs(f(4, 1) / f(1, 1) - 2) < 1e-9 && Math.abs(f(1, 4) / f(1, 1) - 0.5) < 1e-9);
});

test('Ground handling: a harder lift pulls the button harder; a bigger load factor raises the joint moment', () => {
  increasing([1.5, 2, 3].map((K) => run('ground-handling', { K }).FL), 'pull vs K');
  increasing([1, 2, 3].map((N) => Math.abs(run('ground-handling', { N }).MJ)), '|M_J| vs N');
});
