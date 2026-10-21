// Nose pressure distribution: every Cp of the field tool's ogive-cylinder (incompressible), its wake profile, the
// Kármán–Tsien correction, the critical-Mach condition, and the source sum against an exact slender-body integral.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close } from './_workbook.js';
import { sourceCp, stations, karmanTsien, cpStar, criticalMach, wakeDiameter, nosePressure } from '../site/js/calc/nosepressure.js';

const W = workbook('MUNKSHIP2');
// the tool's ogive: rB(L = 30, R = 3) up to 31 in, then the 3.125 in cylinder to 108 in, wake beyond
const rB = (z) => { const L = W('M7'), Ro = W('K7'), A = (L * L + Ro * Ro) / (2 * Ro); return z < L + W('J7') ? Ro - A + Math.sqrt(A * A - (L - z) ** 2) : W('L7'); };

test('Wake diameter and the tool’s station radii (ogive, cylinder, converging wake)', () => {
  close(wakeDiameter(W('F7'), W('D7'), W('E7')), W('G7'), 1e-12, 'G7');
  const r = stations(rB, W('H7'), W('L7'), W('G7') / 2, Math.atan(W('I7') / 2), 1, 140);
  for (let row = 8; row <= 147; row++) close(r[row - 7], W(`Q${row}`), 1e-12, `Q${row}`, 1);
});

test('Source sum reproduces every incompressible Cp of the tool (z = 1 … 140 in)', () => {
  const r = stations(rB, W('H7'), W('L7'), W('G7') / 2, Math.atan(W('I7') / 2), 1, 139);   // stations 0 … 139 and r(140)
  const cp = sourceCp(r, 1);
  for (let row = 8; row <= 146; row++) close(cp[row - 7], W(`S${row}`), 1e-9, `S${row}`, 1e-6);
  close(Math.min(...cp.slice(1, 109)), W('U7'), 1e-9, 'U7 minimum');
});

test('Kármán–Tsien, sonic Cp* and the critical Mach number', () => {
  close(karmanTsien(-0.05, 0), -0.05, 1e-15, 'M = 0');
  close(karmanTsien(-0.05, 0.6), -0.05 / (0.8 + (-0.025) * 0.2), 1e-15, 'M = 0.6');
  close(cpStar(1), 0, 1e-12, 'Cp* at M = 1', 1);
  const Mc = criticalMach(-0.05655);
  close(karmanTsien(-0.05655, Mc), cpStar(Mc), 1e-9, 'sonic at M_cr', 1e-3);
  assert.ok(Mc > 0.85 && Mc < 0.95, `M_cr ${Mc}`);
  // textbook case: Cp₀,min = −0.43 gives about 0.74 with Prandtl–Glauert and slightly less with Kármán–Tsien
  assert.ok(Math.abs(criticalMach(-0.43) - 0.725) < 0.01);
});

test('Slender cone: the source sum converges to the exact line-source integral as Δz → 0', () => {
  // cone r = kz to L, then cylinder; exact Cp₀ at mid-cone from ∫ (zp − z) k² z / ((zp − z)² + k²z²)^{3/2} dz
  const k = 0.1, L = 30, R = k * L, rb = (z) => Math.min(k * z, R), zp = 15;
  let exact = 0; const m = 400000, h = L / m;
  for (let j = 0; j < m; j++) { const z = (j + 0.5) * h; exact += ((zp - z) * k * k * z) / ((zp - z) ** 2 + k * k * z * z) ** 1.5 * h; }
  const o = nosePressure({ rBody: rb, noseL: L, L: 60, R, M: 0, CD: 0.3, CDb: 0.1, eps: 0.1, dz: 0.05 });
  // the cylinder adds a small further term; compare the cone part directly
  const r = stations(rb, L, R, R, 0.1, 0.05, L + 0.05);
  const cone = sourceCp(r.map((x, i) => (i * 0.05 > L ? R : x)), 0.05);
  close(cone[Math.round(zp / 0.05)], -exact, 2e-3, 'Cp₀ at mid-cone');
  assert.ok(o.cp0Min < 0 && o.zMin > L - 2 && o.Mcr > 0.8);
});
