// Parachute recovery: the descent-time integral against quadrature and against the field tools (ONECHUTE.xls with its
// own density exponent, 25KDSCNT.xls with constant density), the aft-body impact formula, and the reefing curve.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close } from './_workbook.js';
import { ATM, densityExponent, descentTime, descentSpeed, aftImpact, density, reefedDragRatio, recovery } from '../site/js/calc/recovery.js';

const W = workbook('ONECHUTE');
// the tool's constants: g, α, R, ρ₀, T₀ = 520 °R
const atmW = { g: W('K5'), alpha: W('L5'), R: W('M5'), T0: W('O5'), rho0: W('N5') };
const M = W('Q5') + W('R5'), CdS = W('E5') * W('S5');

test('Sea-level descent speed and the descent-time integral reproduce ONECHUTE with its density exponent', () => {
  close(descentSpeed(M, CdS, 0, atmW), W('F10'), 1e-12, 'F10');
  // the tool's exponent n = (αR − 1)/(2αR) corresponds to m = −1/(αR) − 1 (R used without g)
  const mTool = -1 / (atmW.alpha * atmW.R) - 1;
  close(mTool / 2 + 1, W('C10'), 1e-12, 'C10 exponent');
  close(descentTime(M, CdS, W('G5'), W('H5'), atmW, mTool), W('H10'), 1e-12, 'H10 descent time');
  // its impact speeds use ρ₀·τ_I^n as the ground density
  const rhoTool = W('N5') * W('D10');
  close(aftImpact(W('Q5'), W('R5'), CdS, rhoTool, W('I5'), atmW.g), W('M10'), 1e-12, 'M10 aft impact');
  close(descentSpeed(M, CdS, 0, { ...atmW, rho0: rhoTool }), W('N10'), 1e-12, 'N10 nose impact');
});

test('With the standard exponent −g/(αR) − 1 the closed form matches direct integration of dt = dh/V', () => {
  const m = densityExponent(atmW);
  close(m, 4.2558, 1e-3, 'standard troposphere exponent');
  let t = 0; const n = 200000, ha = W('G5'), hb = W('H5'), dh = (ha - hb) / n;
  for (let i = 0; i < n; i++) t += dh / descentSpeed(M, CdS, hb + (i + 0.5) * dh, atmW, m);
  close(descentTime(M, CdS, ha, hb, atmW, m), t, 1e-9, 'descent time');
  // physically the chute falls faster in thin air, so the correct time is shorter than the tool's
  assert.ok(descentTime(M, CdS, ha, hb, atmW, m) < W('H10'));
  close(density(36089 * 0, atmW, m), atmW.rho0, 1e-15, 'ρ at sea level');
});

test('Constant density reproduces 25KDSCNT (dart from 25 000 ft)', () => {
  const D = workbook('25KDSCNT'), flat = { ...ATM, rho0: 0.0022 * 0.85 };   // its ρ·C_D
  for (const row of [4, 5, 6, 7]) {
    const S = D(`E${row}`), Mw = D(`C${row}`) / ATM.g;
    close(descentSpeed(Mw, S, 0, flat, 0), D(`F${row}`), 1e-12, `F${row}`);
    close(descentTime(Mw, S, 25000, 0, flat, 0) / 60, D(`G${row}`), 1e-12, `G${row}`);
    close(descentTime(Mw, S, 25000, 0, flat, 0) * 10, D(`H${row}`), 1e-12, `H${row} drift at 10 ft/s`);
  }
});

test('Aft-body impact: equals the nose speed for L = 0, falls to √(2m₂g/C_DρS) for a long tether', () => {
  const m1 = 10 / 32.174, m2 = 8.5 / 32.174, k = 0.8 * 21, rho = 0.0022;
  close(aftImpact(m1, m2, k, rho, 0), Math.sqrt((2 * (m1 + m2) * 32.174) / (k * rho)), 1e-12, 'L = 0');
  close(aftImpact(m1, m2, k, rho, 1e5), Math.sqrt((2 * m2 * 32.174) / (k * rho)), 1e-9, 'long tether');
  // integrate m₂ dV/dt = m₂g − ½C_DρSV² over the tether length
  let V2 = (2 * (m1 + m2) * 32.174) / (k * rho); const n = 100000, L = 33, dh = L / n;
  for (let i = 0; i < n; i++) V2 += 2 * dh * (32.174 - (0.5 * k * rho * V2) / m2);   // d(V²)/ds, s downward
  close(aftImpact(m1, m2, k, rho, L), Math.sqrt(V2), 1e-4, 'ODE');
});

test('Reefing curve and the memo’s example (reefing ratio 0.25 gives ≈ 61 ft/s at sea level)', () => {
  close(reefedDragRatio(0.62), 1, 1e-15, 'unreefed at 0.62'); close(reefedDragRatio(0.25), 0.231, 1e-12, 'table');
  for (let r = 0.08; r < 0.62; r += 0.01) assert.ok(reefedDragRatio(r + 0.01) > reefedDragRatio(r), 'monotone');
  const o = recovery({ W1: 10, W2: 8.5, D0: 5.18, CD: 0.82, reef: true, ratio: 0.25, hD: 25000, hR: 1000, hG: 4300, L: 33, wind: 0, VD: 100 });
  assert.ok(Math.abs(o.vSL - 61.25) < 2, `reefed sea-level speed ${o.vSL}`);
  assert.ok(o.vAft < o.vNose && o.vAft > o.vAftMin && o.tReefed > 0 && o.tOpen > 0);
});

test('Sizing helpers: the diameter, tether and disreef height they return hit their targets exactly', async () => {
  const { diameterFor, tetherFor, disreefFor, descentHistory } = await import('../site/js/calc/recovery.js');
  const p = { W1: 10, W2: 8.5, L: 33, D0: 5.18, CD: 0.8, reef: true, ratio: 0.25, hR: 1000, hD: 25000, hG: 4300, VD: 100, wind: 20 };
  close(recovery({ ...p, D0: diameterFor(p, 15) }).vAft, 15, 1e-9, 'diameter for 15 ft/s');
  const L = tetherFor(p, 23); close(recovery({ ...p, L }).vAft, 23, 1e-9, 'tether for 23 ft/s');
  assert.equal(tetherFor(p, 21), null, 'below the endless-tether speed no tether works');
  const hR = disreefFor(p, 8000); close(recovery({ ...p, hR }).drift, 8000, 1e-6, 'disreef for 8000 ft drift');
  assert.equal(disreefFor(p, 5000), null, 'reefed part alone drifts farther than 5000 ft');
  // the time history ends at the computed descent time and drift, speed falls monotonically within each phase
  const H = descentHistory(p), o = recovery(p);
  close(H.at(-1).t, o.t, 1e-9, 'history ends at t'); close(H.at(-1).x, o.drift, 1e-9, 'history ends at the drift');
  for (let i = 1; i < H.length; i++) if (H[i].reefed === H[i - 1].reefed) assert.ok(H[i].V <= H[i - 1].V + 1e-9, 'slower as the air thickens');
});
