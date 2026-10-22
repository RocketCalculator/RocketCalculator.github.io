// Body bending: the field tool's Aries frequencies and mode shapes, and the exact uniform free-free beam.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close } from './_workbook.js';
import { bending, shape, BETA, psi } from '../site/js/calc/bending.js';

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
