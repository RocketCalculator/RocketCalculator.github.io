// No workbook exists for the bifilar pendulum: check the memo's analytic results.
import { test, after } from 'node:test';
import { close, stats } from './_workbook.js';
import assert from 'node:assert/strict';
import { bifilar, yawPeriod, periodRatio, uncertainty, cyclesFor, distErrorFor, spacingScale } from '../site/js/calc/bifilar.js';

const g = 9.80665;

test('Uniform rod, wires at the ends: P_Y/P_G = √(1/3) = 0.577 (memo)', () => {
  const L = 2, m = 5, I = (m * L * L) / 12, x1 = L / 2, x2 = L / 2, l = 1.5;
  const PY = yawPeriod({ I, m, g, x1, x2, l }), PG = 2 * Math.PI * Math.sqrt(l / g);
  const o = bifilar({ m, x1, x2, l, PY, PG, g, Lrod: L });
  close(o.ratio, Math.sqrt(1 / 3), 1e-12, 'period ratio');
  close(+o.ratio.toFixed(3), 0.577, 1e-12, 'memo quotes 0.577');
  close(o.I_periods, I, 1e-12, 'I from periods');
  close(o.I_length, I, 1e-12, 'I from wire length');
  close(o.I_rod, I, 1e-12, 'rod inertia');
});

test('Uniform rod, wires half-way to the ends: P_Y/P_G = 1.155 (memo)', () => {
  const L = 2, m = 5, k = Math.sqrt(L * L / 12);
  close(+periodRatio(k, L / 4, L / 4).toFixed(3), 1.155, 1e-12, 'memo quotes 1.155');
});

test('Statics: wire tensions sum to the weight and balance moments about the CG', () => {
  const o = bifilar({ m: 12, x1: 0.4, x2: 0.7, l: 2, PY: 3, PG: 2.8, g, Lrod: 0 });
  close(o.T1 + o.T2, 12 * g, 1e-12, 'ΣT = mg');
  close(o.T1 * 0.4, o.T2 * 0.7, 1e-12, 'moment balance');
  close(o.k, Math.sqrt(o.I_periods / 12), 1e-12, 'radius of gyration');
});

// Measurement quality (first-order error propagation, added here) and the page verdict with its solved fixes.
const def = (await import('../site/js/calculators/bifilar-pendulum.js')).default;
const page = (i, o = {}) => { const v = { ...def.examples[i].values, ...o }; return { v, out: def.compute(v) }; };

test('Uncertainty: exponents 1, 1, 1, 2, 2 of I = m x1 x2 PY²/PG² match a finite-difference check', () => {
  const p = { m: 20, x1: 0.3, x2: 0.25, PY: 5.87, PG: 2.84, dm: 0.05, dx: 0.002, dt: 0.2, NY: 10, NG: 8 };
  const I = (q) => bifilar({ ...q, l: 2, g, Lrod: 2.4 }).I_periods, I0 = I(p);
  const rel = (k, d) => Math.abs(I({ ...p, [k]: p[k] + 1e-6 * d }) / I0 - 1) * 1e6;
  const fd = Math.hypot(rel('m', p.dm), rel('x1', p.dx), rel('x2', p.dx), rel('PY', p.dt / p.NY), rel('PG', p.dt / p.NG));
  close(uncertainty(p).total, fd, 1e-5, 'u_I');
});

test('Fixes land on their targets: cycles, distance error, wire spacing', () => {
  const p = { ...def.examples[2].values }, u = p.uMax / 100;
  const N = cyclesFor(p, u);
  assert.ok(uncertainty({ ...p, NY: N, NG: N }).total <= u && uncertainty({ ...p, NY: N - 1, NG: N - 1 }).total > u, 'fewest cycles');
  assert.equal(distErrorFor(p, u), null, 'timing alone exceeds the target');
  const q = { ...p, NY: 12, NG: 12, dx: 0.004 };
  close(uncertainty({ ...q, dx: distErrorFor(q, u) }).total, u, 1e-12, 'distance error');
  const k = 0.62, f = spacingScale(k, 0.62, 0.62, 1.5);
  close(periodRatio(k, f * 0.62, f * 0.62), 1.5, 1e-12, 'ratio on the limit');
});

test('Page verdict: GOOD, REDO near resonance (wire fix exact), CHECK with too few cycles', () => {
  const a = page(0).out;
  assert.equal(a.verdict.level, 'safe'); assert.equal(a.verdict.word, 'GOOD'); assert.equal(a.verdict.fixes.length, 0);
  const b = page(1);
  assert.equal(b.out.verdict.level, 'unsafe'); assert.match(b.out.verdict.fixes[0], /both wires to <b>≤ 0.429 m<\/b> from the CG/);
  close(periodRatio(b.out.o.k, b.out.f * b.v.x1, b.out.f * b.v.x2), b.v.rmin, 1e-12, 'moved wires give r_min');
  const c = page(2).out;
  assert.equal(c.verdict.level, 'marginal'); assert.match(c.verdict.fixes[0], new RegExp(`${c.Nreq} cycles`));
  assert.equal(page(0, { l: 2.3 }).out.verdict.level, 'marginal', 'cross-check outside 3 %');
  assert.ok(Math.abs(page(0, { l: page(0).out.lImplied }).out.cross) < 1e-9, 'implied wire length closes the cross-check');
});

after(() => console.log(`bifilar: ${stats.compared} values compared, max rel err ${stats.maxRel.toExponential(2)}`));
