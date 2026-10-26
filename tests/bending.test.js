// Body bending: the field tool's Aries frequencies and mode shapes, and the exact uniform free-free beam.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close } from './_workbook.js';
import { bending, shape, BETA, psi, tubeElems, strainShare } from '../site/js/calc/bending.js';
import def from '../site/js/calculators/body-bending.js';

const W = workbook('FLEXIT(Aries)');
const elems = [7, 8, 9, 10, 11].map((r) => ({ x: W(`G${r}`), EIf: W(`J${r}`), EIa: W(`K${r}`), wf: W(`M${r}`), wa: W(`N${r}`) }));

test('Aries: the three frequencies of the field tool (rad/s)', () => {
  const o = bending(elems, W('C6'));
  close(o.modes[0].omega, W('BO6'), 1e-3, 'fundamental');
  close(o.modes[1].omega, W('BR6'), 1e-3, 'first harmonic');
  close(o.modes[2].omega, W('BU6'), 1e-3, 'second harmonic');
  // stiffness and mass integrals (summed elements, row 17)
  close(o.K[0][0], W('AS17'), 2e-3, 'K11'); close(o.M[1][2], W('BH17'), 2e-3, 'M23');
});

test('Aries mode shapes: exact eigenvectors; the field tool’s shapes follow from its typo (l13st for j13st)', () => {
  const o = bending(elems, W('C6')), { K, M } = o;
  for (const { omega, q } of o.modes) {                                      // (K − ω²M) q = 0
    const r = K.map((row, i) => row.reduce((acc, k, j) => acc + (k - omega ** 2 * M[i][j]) * q[j], 0));
    assert.ok(Math.hypot(...r) < 1e-9 * Math.hypot(...K.map((row) => Math.hypot(...row))) * Math.hypot(...q), `residual ${r}`);
  }
  // the tool's q2/q1 and q3/q1 with a₁₃ = ω²M₁₃ (its typo drops −K₁₃), at its own ω and matrices
  const om = W('BO6'), m = (c) => W(`${c}17`), a = (ma, st) => m(ma) * om * om - m(st);
  const a11 = a('BC', 'AS'), a12 = a('BD', 'AT'), a13 = m('BE') * om * om, a21 = a('BF', 'AV'), a22 = a('BG', 'AW'), a23 = a('BH', 'AX');
  close((a23 * a11 - a21 * a13) / (a22 * a13 - a23 * a12), W('BV6'), 1e-9, 'q2/q1 with the typo');
  close((a12 * a21 - a11 * a22) / (a22 * a13 - a23 * a12), W('BW6'), 1e-9, 'q3/q1 with the typo');
  // the mode shape table follows those ratios; ours differ because the stiffness term is restored
  close(shape([W('BX6'), W('BX6') * W('BV6'), W('BX6') * W('BW6')], W('CB15')), W('CC15'), 1e-5, 'shape table (its rounded β)');
});

test('Uniform beam: Rayleigh–Ritz with the exact modes returns ω_n = (β_n/L)²√(EI/m) and orthogonal modes', () => {
  const EI = 5e9, w = 10, x = 300, o = bending([{ x, EIf: EI, EIa: EI, wf: w, wa: w }], 32.174);
  const exact = BETA.map((b) => (b / (x / 12)) ** 2 * Math.sqrt(EI / 144 / ((12 * w) / 32.174)));
  o.modes.forEach((m, i) => close(m.omega, exact[i], 1e-6, `mode ${i + 1}`));
  close(o.M[0][1], 0, 1e-6, 'orthogonal', o.M[0][0]);
  close(psi(0, 0), 2, 1e-12, 'nose value');
  assert.ok(o.uniform.every((u, i) => Math.abs(u / exact[i] - 1) < 1e-9));
});

test('Tube sections: EI = Eπ(D⁴ − d⁴)/64, mass per length m/l, the total mass is kept', () => {
  const tubes = [{ len: 20, D: 4, t: 0.1, E: 2.5e6, m: 2 }, { len: 60, D: 4, t: 2, E: 1e7, m: 10 }];
  const e = tubeElems(tubes), o = bending(e);
  close(e[0].EIf, (2.5e6 * Math.PI * (4 ** 4 - 3.8 ** 4)) / 64, 1e-12, 'thin tube EI');
  close(e[1].EIa, (1e7 * Math.PI * 4 ** 4) / 64, 1e-12, 'solid rod EI');
  assert.equal(e[1].x, 80); close(e[0].wf, 0.1, 1e-12, 'w');
  close(o.mass, 12, 1e-9, 'total mass');
});

test('Bending energy shares sum to 1 and are symmetric on a uniform body', () => {
  const e = [1, 2, 3, 4].map((i) => ({ x: 25 * i, EIf: 1e8, EIa: 1e8, wf: 1, wa: 1 })), o = bending(e), sh = strainShare(e, o.modes[0].q);
  close(sh.reduce((a, b) => a + b, 0), 1, 1e-12, 'sum');
  close(sh[0], sh[3], 1e-6, 'ends'); close(sh[1], sh[2], 1e-6, 'middle'); assert.ok(sh[1] > sh[0]);
});

test('Verdict fixes hit the frequency you want (wall by bisection, material in closed form, excitation)', () => {
  const ex = def.examples[1].values, v = { ...structuredClone(ex), fx: 12, sep: 3 }, out = def.compute(v);
  assert.equal(out.level, 'marginal');
  const need = 36, R = out.results;
  close(R.need, need, 1e-12, 'need');
  const thick = v.tubes.map((r, j) => (j === out.crit ? { ...r, t: R.tNeed } : r));
  close(bending(tubeElems(thick)).modes[0].omega / (2 * Math.PI), need, 1e-6, 'wall fix');
  close(bending(tubeElems(v.tubes.map((r) => ({ ...r, E: r.E * R.kAll })))).modes[0].omega / (2 * Math.PI), need, 1e-9, 'material fix');
  close(R.fxMax * 3, R.f1, 1e-12, 'excitation fix');
  assert.equal(def.compute({ ...v, fx: R.fxMax }).level, 'safe');
  assert.equal(out.verdict.fixes.length, 3);
});
