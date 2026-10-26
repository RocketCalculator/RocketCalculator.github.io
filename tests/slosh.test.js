// Propellant sloshing: Bessel roots, the worksheet frequencies (with the fill depth restored), limits and slosh masses.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close, stats } from './_workbook.js';
import { LAMBDA, besselJ1, fillDepth, mode, slosh, depthFor, radiusFor } from '../site/js/calc/slosh.js';
import calc from '../site/js/calculators/propellant-slosh.js';

const W = workbook('SLOSHIT');

test('λ_n are the roots of J₁′(λ) = 0 (worksheet values to 8 digits)', () => {
  for (const L of LAMBDA) assert.ok(Math.abs(besselJ1(L).dJ1) < 2e-9, `J1'(${L}) = ${besselJ1(L).dJ1}`);
  close(besselJ1(1).J1, 0.44005058574493355, 1e-13, 'J1(1)');
  close(LAMBDA[0], W('F7'), 1e-8, 'λ1'); close(LAMBDA[1], W('G7'), 1e-8, 'λ2'); close(LAMBDA[2], W('H7'), 1e-8, 'λ3');
});

test('Frequencies: ω² = (a/R)λ tanh(λh/R) with h = M/(ρπR²) — the worksheet’s tanh argument uses ρ for M', () => {
  const a = W('B7'), R = W('C7'), M = W('D7'), rho = W('E7');
  // reproduce the worksheet exactly when its argument λ·ρ/(πρR³) is used …
  const wb = (L) => Math.sqrt(a * (L / R) * Math.tanh((L * rho) / (Math.PI * rho * R ** 3)));
  close(wb(LAMBDA[0]), W('I7'), 1e-8, 'I7'); close(wb(LAMBDA[1]), W('J7'), 1e-8, 'J7'); close(wb(LAMBDA[2]), W('K7'), 1e-8, 'K7');
  // … and the report's argument λM/(πρR³) = λh/R is what the calculator uses
  const o = slosh({ a, R, M, rho });
  close(o.h, M / (rho * Math.PI * R * R), 1e-14, 'fill depth');
  close(o.modes[0].w, Math.sqrt(a * (LAMBDA[0] / R) * Math.tanh((LAMBDA[0] * M) / (Math.PI * rho * R ** 3))), 1e-14, 'mode 1');
});

test('Deep- and shallow-tank limits', () => {
  const deep = mode(1, { a: 32.174, R: 1, h: 50, M: 1 });
  close(deep.w, Math.sqrt(32.174 * LAMBDA[0]), 1e-12, 'deep: ω² = aλ/R');
  const sh = mode(1, { a: 32.174, R: 1, h: 1e-4, M: 1 });
  close(sh.w, LAMBDA[0] * Math.sqrt(32.174 * 1e-4), 1e-6, 'shallow: ω = λ√(ah)/R (shallow-water wave)');
  close(deep.pendulum, 1 / LAMBDA[0], 1e-12, 'deep pendulum length R/λ');
  close(deep.w, Math.sqrt(32.174 / deep.pendulum), 1e-12, 'pendulum analogue ω² = a/L');
});

test('Slosh masses: Σ 2/(λ²−1) → 1, so a shallow fill sloshes almost entirely; a deep fill mostly stays fixed', () => {
  let sum = 0;
  for (const L of LAMBDA) sum += 2 / (L * L - 1);
  assert.ok(sum > 0.98 && sum < 1, `ten-mode sum ${sum}`);
  const shallow = slosh({ a: 32, R: 1, M: 0.001 * Math.PI, rho: 1 });
  assert.ok(shallow.modes[0].mFrac > 0.83 && shallow.fixedFrac < 0.07);
  const deep = slosh({ a: 32, R: 1, M: 4 * Math.PI, rho: 1 });
  assert.ok(deep.modes[0].mFrac < 0.15 && deep.fixedFrac > 0.8, `deep m1/M ${deep.modes[0].mFrac}`);
  close(fillDepth(4 * Math.PI, 1, 1), 4, 1e-14);
});

test('Slosh mass is the residue of eq. (5-47): πρR³·2tanh/(λ(λ²−1)) with M = πρR²h', () => {
  const R = 0.7, h = 0.9, rho = 1.3, M = Math.PI * rho * R * R * h;
  for (const n of [1, 2, 3]) {
    const L = LAMBDA[n - 1];
    close(mode(n, { a: 50, R, h, M }).m, (Math.PI * rho * R ** 3 * 2 * Math.tanh((L * h) / R)) / (L * (L * L - 1)), 1e-13, `m${n}`);
  }
});

test('Pendulum hinge from eq. (5-49) ÷ (5-47): deep and shallow limits, bob depth (2R/λ)tanh(λh/2R)', () => {
  const deep = mode(1, { a: 32.174, R: 1, h: 50, M: 1 });
  close(deep.hinge, 1 / LAMBDA[0], 1e-12, 'deep hinge R/λ below the surface');
  close(deep.bob, 2 / LAMBDA[0], 1e-12, 'deep bob 2R/λ below the surface');
  for (const h of [0.05, 0.3, 1, 2.5]) {
    const m = mode(1, { a: 10, R: 1, h, M: 1 }), x = LAMBDA[0] * h;
    close(m.bob, (2 / LAMBDA[0]) * Math.tanh(x / 2), 1e-12, `bob at h=${h}`);
    close(m.hinge, ((Math.cosh(x) - 2) / Math.sinh(x)) / LAMBDA[0], 1e-12, `hinge at h=${h}`);
    assert.ok(m.bob <= h + 1e-12, 'the bob is inside the liquid');
  }
  assert.ok(mode(1, { a: 10, R: 1, h: 0.05, M: 1 }).hinge < -1, 'a shallow pool hangs a long pendulum from above the surface');
});

test('Solvers: the crossing depth and the tank radius hit their target frequency', () => {
  const p = { a: 160, R: 0.25 };
  const h = depthFor(4, p); close(mode(1, { ...p, h, M: 1 }).f, 4, 1e-10, 'depthFor');
  assert.equal(depthFor(100, p), null, 'above the deep-fill frequency: never');
  const R = radiusFor(7, { a: 160, M: 0.45, rho: 1.53 }); close(slosh({ a: 160, R, M: 0.45, rho: 1.53 }).modes[0].f, 7, 1e-9, 'radiusFor');
});

const run = (over = {}) => { const v = {}; for (const g of calc.groups) for (const f of g.fields) v[f.id] = f.default; return calc.compute({ ...v, ...over }); };

test('Verdict bands and solved fixes reach the separation exactly', () => {
  assert.equal(run({ fp: 1 }).level, 'safe');
  assert.equal(run().level, 'marginal');                 // 5.5 Hz against 3 Hz, want 2×
  assert.equal(run({ fp: 5 }).level, 'unsafe');
  for (const fp of [3, 5, 8, 20]) {
    const out = run({ fp }), v = { ...run().v, fp };
    const hFix = fillDepth(out.o.M, v.rho, out.Dfix / 2), fixD = run({ fp, D: out.Dfix, Lt: Math.max(v.Lt, 1.01 * hFix) }).results.f1, want = out.above ? v.sep * fp : fp / v.sep;
    close(fixD, want, 1e-8, `diameter fix at fp=${fp}`);
    close(run({ fp: out.results.fpOk }).results.ratio, out.above ? v.sep : 1 / v.sep, 1e-10, `pitch fix at fp=${fp}`);
    assert.match(out.verdict.fixes.join(' ') || 'safe', /<b>|safe/);
  }
});

test('More propellant than the tank holds is shown full, with a warning, not refused', () => {
  const out = run({ M: 10 });
  close(out.results.h, out.v.Lt, 1e-12, 'depth capped at the tank length');
  assert.ok(out.warnings.some((w) => w.level === 'warn' && /tank/.test(w.text)));
});

after(() => console.log(`# slosh: ${stats.compared} comparisons, max rel err ${stats.maxRel.toExponential(2)}`));
