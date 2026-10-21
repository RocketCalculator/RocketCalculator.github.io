// Launcher tip-off deflection: the memo's load comparison for Gold Rush II, the truss moment of inertia against an
// exact parallel-axis sum, and the cantilever slope against integration of the beam equation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { close } from './_workbook.js';
import { towerI, lateralLoads, tipSlope, tipDeflection, maxLength, launcher } from '../site/js/calc/launcher.js';

test('Gold Rush II loads: weight component 9.55 lb, 3σ thrust misalignment 2.09 lb (memo)', () => {
  const f = lateralLoads({ W: 55, T: 400, sigmaDeg: 0.1, k: 3, QE: 80 });
  close(f.weight, 9.55, 2e-3, 'W cos QE');
  close(f.thrust, 2.09, 3e-3, '3Tσ');
  assert.ok(f.weight > 4 * f.thrust, 'weight dominates');
});

test('Truss: I = A d²/2 equals the parallel-axis sum for three tubes on an equilateral triangle of side d', () => {
  const D = 1.25, t = 0.065, d = 12.5, A = Math.PI * D * t, h = (d * Math.sqrt(3)) / 2;
  // centroid at h/3 from the top pair; tubes as points (own I negligible), both axes
  const Ipitch = 2 * A * (h / 3) ** 2 + A * ((2 * h) / 3) ** 2, Iyaw = 2 * A * (d / 2) ** 2;
  close(towerI(D, t, d), Ipitch, 1e-12, 'pitch'); close(towerI(D, t, d), Iyaw, 1e-12, 'yaw (same)');
});

test('Cantilever: slope and deflection integrate EI y” = F(L − x); the longest rail meets the allowance', () => {
  const F = 10, L = 240, EI = 29e6 * towerI(1.25, 0.065, 12.5), n = 100000, dx = L / n;
  let slope = 0, y = 0;
  for (let i = 0; i < n; i++) { const x = (i + 0.5) * dx, curv = (F * (L - x)) / EI; y += slope * dx + 0.5 * curv * dx * dx; slope += curv * dx; }
  close(tipSlope(F, L, EI, 1), slope, 1e-9, 'slope'); close(tipDeflection(F, L, EI, 1), y, 1e-6, 'deflection');
  close(tipSlope(F, L, EI), 2 * slope, 1e-9, 'overshoot ×2');
  const allow = 0.1 * Math.PI / 180;
  close(tipSlope(F, maxLength(F, EI, allow), EI), allow, 1e-12, 'L_max');
  // memo: dy/dx(L) = FL²/(πEDtd²) before the overshoot factor
  close(tipSlope(F, L, EI, 1), (F * L * L) / (Math.PI * 29e6 * 1.25 * 0.065 * 12.5 ** 2), 1e-12, 'memo form');
});

test('Full evaluation: pitch carries weight and thrust, yaw thrust only; steeper QE lowers the pitch slope', () => {
  const base = { W: 55, T: 400, sigmaDeg: 0.1, k: 3, QE: 80, L: 240, E: 29e6, section: 'tower', D: 1.25, t: 0.065, d: 12.5, factor: 2, allowDeg: 0.1 };
  const o = launcher(base);
  assert.ok(o.pitchDeg > o.yawDeg && o.yawDeg > 0);
  assert.ok(launcher({ ...base, QE: 85 }).pitchDeg < o.pitchDeg);
  close(launcher({ ...base, section: 'custom', I: o.I }).pitchDeg, o.pitchDeg, 1e-14, 'custom I');
});

test('Memo plot (Gold Rush II, weight only, ×2): ≈ 0.053° at 240 in and 0.21° at 480 in for QE 80°; ≈ 0.027° at QE 85°', () => {
  const base = { W: 55, T: 400, sigmaDeg: 0.1, k: 0, QE: 80, L: 240, E: 29e6, section: 'tower', D: 1.25, t: 0.065, d: 12.5, factor: 2, allowDeg: 0.1 };
  assert.ok(Math.abs(launcher(base).pitchDeg - 0.053) < 0.003);
  assert.ok(Math.abs(launcher({ ...base, L: 480 }).pitchDeg - 0.21) < 0.01);
  assert.ok(Math.abs(launcher({ ...base, QE: 85 }).pitchDeg - 0.027) < 0.002);
  // the CSULB paper: a 20 ft rail meets its 0.05° requirement only marginally at QE 80°
  assert.ok(launcher(base).pitchDeg < 0.06);
});

