// Single-wedge airfoil: Busemann coefficients against Normal Force Multiplier.xls and against the exact oblique shock.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close, stats } from './_workbook.js';
import { busemann, multiplier, cpSeries, obliqueShock, maxDeflection, exactMultiplier, waveDrag, singleWedge } from '../site/js/calc/wedge.js';

const W = workbook('Normal Force Multiplier');
const d2r = Math.PI / 180;
const rows = Array.from({ length: 40 }, (_, i) => 6 + i).filter((r) => W.cells[`F${r}`] != null && W.cells[`K${r}`] != null);

test('Busemann functions match the workbook columns', () => {
  for (const r of rows) {
    const c = busemann(W(`F${r}`));
    close(c.beta2, W(`G${r}`), 1e-12, `G${r}`); close(c.H, W(`H${r}`), 1e-12, `H${r}`); close(c.I, W(`I${r}`), 1e-11, `I${r}`);
  }
});

test('Multiplier: cubic term as in the workbook; the linear term uses β^(3/2) (the workbook’s β^(1/2) is a slip)', () => {
  const delta = W('D6');
  for (const r of rows) {
    const M = W(`F${r}`), c = busemann(M), b = c.beta2;
    const wbLinear = (c.H * delta) / (2 * Math.sqrt(b)), ours = (c.H * delta) / (2 * b ** 1.5);
    close(multiplier(M, delta), W(`K${r}`) - wbLinear + ours, 1e-12, `K${r}`);
  }
  // the corrected form is the true derivative of the series: compare with a finite difference of C_P
  for (const M of [1.5, 2, 3, 6]) {
    const d = 4 * d2r, h = 1e-6;
    close(multiplier(M, d), (cpSeries(M, d + h) - cpSeries(M, d - h)) / (2 * h) / busemann(M).C1, 1e-8, `derivative M=${M}`);
  }
});

test('Busemann series converges to the exact oblique-shock pressure (C3 recovered from the residual)', () => {
  for (const M of [2, 3, 5]) {
    const c = busemann(M), th = 0.004, ex = obliqueShock(M, th).cp;
    close((ex - c.C1 * th - c.C2 * th * th) / th ** 3, c.C3, 5e-3, `C3 at M=${M}`);
  }
});

test('Shock-detachment limit matches NACA 1135 values (γ = 1.4)', () => {
  close(maxDeflection(1.5).theta / d2r, 12.11, 2e-3, 'M = 1.5');
  close(maxDeflection(2).theta / d2r, 22.97, 1e-3, 'M = 2');
  close(maxDeflection(3).theta / d2r, 34.07, 1e-3, 'M = 3');
  assert.equal(obliqueShock(1.5, 13 * d2r), null, 'detached above the limit');
  close(obliqueShock(2, 10 * d2r).beta / d2r, 39.31, 1e-3, 'weak shock angle M=2, θ=10°');
});

test('Cubic multiplier tracks the exact one for thin wedges at the memo’s valid Mach numbers', () => {
  for (const M of [2, 3, 4, 6]) {
    const d = 3 * d2r, K = multiplier(M, d), Ke = exactMultiplier(M, d);
    assert.ok(Math.abs(K - Ke) / Ke < 5e-3, `M=${M}: ${K} vs exact ${Ke}`);
  }
});

test('Single wedge: subsonic leading edge gives multiplier 1, sweep reduces the normal Mach number, wave drag positive', () => {
  const sub = singleWedge({ M: 2, delta: 5 * d2r, sweep: 61 * d2r });
  assert.ok(sub.MN < 1); assert.equal(sub.K, 1); assert.equal(sub.CDw, 0);
  const s = singleWedge({ M: 3, delta: 5 * d2r, sweep: 30 * d2r, N: 4, S: 30, Sref: 28 });
  close(s.MN, 3 * Math.cos(30 * d2r), 1e-12);
  close(s.CDw, waveDrag(s.MN, 5 * d2r) * Math.cos(30 * d2r) ** 3, 1e-12);
  close(s.CDvehicle, (4 * 30 * s.CDw) / 28, 1e-12);
  assert.ok(s.K > 1 && s.attached && s.valid);
});

after(() => console.log(`# wedge: ${stats.compared} comparisons, max rel err ${stats.maxRel.toExponential(2)}`));

test('Shock–expansion section: NACA 1135 Prandtl–Meyer values, small-angle limit, exact multiplier, expansion branch', async () => {
  const { prandtlMeyer, nuMax, machFromNu, wedgeSection, exactMultiplier, turn } = await import('../site/js/calc/wedge.js');
  const D = Math.PI / 180, near = (a, b, t, w) => assert.ok(Math.abs(a - b) <= t, `${w}: ${a} vs ${b}`);
  near(nuMax() / D, 130.45, 0.01, 'ν_max (eq. 172)');
  near(prandtlMeyer(2) / D, 26.38, 0.01, 'ν(2)');
  near(machFromNu(prandtlMeyer(3.7)), 3.7, 1e-6, 'inverse');
  // thin section, tiny angle: linear theory
  const t = wedgeSection(2.5, 1e-4, 1e-3);
  near(t.CN / t.lin.CN, 1, 2e-3, 'Ackeret limit');
  // slope at α = 0 gives the exact multiplier
  const h = 1e-4, d = 6 * D, K = (wedgeSection(3, d, h).CN - wedgeSection(3, d, -h).CN) / (2 * h) / (4 / Math.sqrt(8));
  near(K, exactMultiplier(3, d), 1e-4, 'exact multiplier');
  // α > δ: the upper face expands, the pressure there is below ambient, M rises
  const e = wedgeSection(2.5, 3 * D, 8 * D);
  assert.equal(e.upper.kind, 'expansion'); assert.ok(e.upper.cp < 0 && e.upper.M2 > 2.5);
  // detachment
  assert.equal(turn(1.6, 15 * D).kind, 'detached');
});
