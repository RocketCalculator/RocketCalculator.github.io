// Two-stage weight allocation: the common-impulse closed form against the tabulated example (OPT2STGE.xls), the
// general Lagrange solution against it and against brute force, and the single-stage boundary.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close, stats } from './_workbook.js';
import { twoStage, commonIsp, dvMaxCommon, velocityRange, splitDV, etaOf, stageDV, singleStageRatio, G0 } from '../site/js/calc/twostage.js';

const W = workbook('OPT2STGE');
const ex = { dv: W('D5'), Mpl: W('E5'), Isp1: W('F8'), Isp2: W('F11'), s1: W('G8'), s2: W('G11') };
const c = W('C5') * W('F14');                                  // average specific impulse, as tabulated

test('Common-impulse closed form reproduces the tabulated example', () => {
  close(W('C5'), G0, 1e-15, 'g0');
  close((ex.Isp1 + ex.Isp2) / 2, W('F14'), 1e-15, 'average Isp');
  const o = commonIsp({ dv: ex.dv, Mpl: ex.Mpl, c, s1: ex.s1, s2: ex.s2 });
  assert.ok(o.valid);
  close(o.etaTot, W('H5'), 1e-12, 'H5 total payload ratio');
  close(o.eta1, W('J8'), 1e-12, 'J8 first-stage payload ratio'); close(o.eta2, W('J11'), 1e-12, 'J11 second-stage payload ratio');
  close(o.stage1.pr, W('K8'), 1e-12, 'K8'); close(o.stage1.st, W('L8'), 1e-12, 'L8'); close(o.stage1.loaded, W('M8'), 1e-12, 'M8');
  close(o.stage2.pr, W('K11'), 1e-12, 'K11'); close(o.stage2.st, W('L11'), 1e-12, 'L11'); close(o.stage2.loaded, W('M11'), 1e-12, 'M11');
  close(o.M01, W('N5'), 1e-12, 'N5 liftoff mass');
  close(dvMaxCommon(o.etaTot, c, ex.s1, ex.s2), ex.dv, 1e-12, 'eq. 21 inverts eq. 22');
});

test('Multiplier: eq. 16 gives λ/(c − λ) = √(η_TOT(1−σ₁)(1−σ₂)/(σ₁σ₂)); the tabulated value uses η_TOT for its square root', () => {
  const o = commonIsp({ dv: ex.dv, Mpl: ex.Mpl, c, s1: ex.s1, s2: ex.s2 });
  close(etaOf(o.lam, c, ex.s1), o.eta1, 1e-12, 'eq. 16, stage 1'); close(etaOf(o.lam, c, ex.s2), o.eta2, 1e-12, 'eq. 16, stage 2');
  const K = Math.sqrt(((1 - ex.s1) * (1 - ex.s2)) / (ex.s1 * ex.s2)), H = W('H5');
  close((H * c * K) / (1 + H * K), W('I5'), 1e-12, 'I5 as tabulated');
  assert.ok(Math.abs(o.lam / W('I5') - 1) > 0.02, 'the tabulated multiplier is not the eq. 16 value');
});

test('General solution equals the closed form when both stages share the specific impulse', () => {
  const o = twoStage({ dv: ex.dv, Mpl: ex.Mpl, c1: c, c2: c, s1: ex.s1, s2: ex.s2 });
  assert.equal(o.single, 0);
  close(o.M01, W('N5'), 1e-11, 'liftoff mass'); close(o.stage1.loaded, W('M8'), 1e-10, 'stage 1'); close(o.stage2.loaded, W('M11'), 1e-10, 'stage 2');
  close(o.dv1 + o.dv2, ex.dv, 1e-12, 'ideal velocity met');
  for (const [s1, s2, dv] of [[0.1, 0.2, 8000], [0.3, 0.08, 12000], [0.05, 0.05, 20000]]) {
    const a = twoStage({ dv, Mpl: 1, c1: 8000, c2: 8000, s1, s2 }), b = commonIsp({ dv, Mpl: 1, c: 8000, s1, s2 });
    close(a.M01, b.M01, 1e-10, `σ ${s1}/${s2}`); close(a.lam, b.lam, 1e-10, `λ ${s1}/${s2}`);
  }
});

test('Unequal impulses: the Lagrange split is the brute-force optimum, and λ = dΔV/d ln M01', () => {
  const p = { c1: G0 * 250, c2: G0 * 280, s1: 0.2, s2: 0.15 }, Mpl = 5, dv = 9000;
  const o = twoStage({ dv, Mpl, ...p });
  assert.equal(o.single, 0);
  close(o.dv1 + o.dv2, dv, 1e-12, 'ideal velocity met');
  let best = -Infinity, bestM02 = 0;
  for (let i = 1; i < 200000; i++) { const M02 = Mpl + ((o.M01 - Mpl) * i) / 200000, d = splitDV(Mpl, o.M01, M02, p); if (d > best) { best = d; bestM02 = M02; } }
  close(best, dv, 1e-9, 'no split of the same liftoff mass does better');
  close(bestM02, o.M02, 1e-4, 'brute-force ignition mass');
  const h = 1e-6, up = twoStage({ dv: dv + h * o.lam, Mpl, ...p });
  close(Math.log(up.M01 / o.M01) / h, 1, 1e-4, 'envelope: dΔV = λ d ln M01');
  // the averaged-impulse split is never better: the optimum for the velocity it really gives is lighter
  const avg = commonIsp({ dv, Mpl, c: (p.c1 + p.c2) / 2, s1: p.s1, s2: p.s2 }), dvTrue = splitDV(Mpl, avg.M01, avg.M02, p);
  assert.ok(twoStage({ dv: dvTrue, Mpl, ...p }).M01 < avg.M01, 'averaged split is suboptimal');
});

test('Single-stage boundary: below the range a second stage does not pay', () => {
  // the tabulated stages with their own impulses at the tabulated velocity
  const p = { c1: G0 * ex.Isp1, c2: G0 * ex.Isp2, s1: ex.s1, s2: ex.s2 }, r = velocityRange(p);
  assert.ok(ex.dv < r.min && r.empty === 2, `range ${r.min}`);
  const o = twoStage({ dv: ex.dv, Mpl: ex.Mpl, ...p });
  assert.equal(o.single, 1); assert.equal(o.eta2, 1); assert.equal(o.stage2.loaded, 0);
  close(o.M01, ex.Mpl * singleStageRatio(ex.dv, p.c1, p.s1), 1e-12, 'first stage alone');
  close(o.dv1, ex.dv, 1e-12, 'velocity met by stage 1');
  for (let i = 1; i < 2000; i++) assert.ok(splitDV(ex.Mpl, o.M01, ex.Mpl + ((o.M01 - ex.Mpl) * i) / 2000, p) <= ex.dv + 1e-9, 'every split is worse');
  // continuity at the boundary
  const a = twoStage({ dv: r.min * (1 - 1e-9), Mpl: 1, ...p }), b = twoStage({ dv: r.min * (1 + 1e-9), Mpl: 1, ...p });
  close(a.M01, b.M01, 1e-6, 'continuous at the start of staging');
  close(r.max, -p.c1 * Math.log(p.s1) - p.c2 * Math.log(p.s2), 1e-15, 'velocity limit');
  close(stageDV(1, 0.2, 0), -Math.log(0.2), 1e-15);
});

after(() => console.log(`# twostage: ${stats.compared} comparisons, max rel err ${stats.maxRel.toExponential(2)}`));
