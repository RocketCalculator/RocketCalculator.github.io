// Roll lock-in: the "High Alfa Roll Lock-In" field tool (with its slips fed back), the strip integral, and limits.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close } from './_workbook.js';
import { design, vortex, gFin, rollMoment, clMax, lockIn, sigmaAlpha } from '../site/js/calc/lockin.js';

const W = workbook('High Alfa Roll Lock-In_rev1', 'Sheet1');
const P = { U: W('C7'), q: W('AG7'), R: W('E7'), Ip: W('J7'), xCG: W('K7'), xN: W('G7'), CNN: W('M7'), xS: W('N7'), N: W('T7'), xF: W('F7'), b: W('D7'),
  lam: W('X7'), SM: W('L7'), CNa: W('W7'), CDaa: W('C27'), sweep: (W('D32') * Math.PI) / 180, alphaMax: (W('E32') * Math.PI) / 180 };
const d = design(P);
// the tool's eq. 33 takes LOG (base 10) of (b + R)/R; eq. 33 integrates 1/y, so it is ln
const { R, b } = P, bracket = (log) => d.c1 * b + (d.c2 * (b * b + 2 * b * R)) / 2 + (d.c1 * b * R) / (R + b) + d.c2 * R * R * log((R + b) / R);
const toolScale = bracket(Math.log) / bracket(Math.log10);
const toolFin = { N: P.N, R, b, C1: d.C1 * toolScale, C2: d.C2 * toolScale, CNa: P.CNa, U: P.U };
// and its vortex radius is R√(1 + 0.21ξ² + 0.49) where eqs. 2–3 give R√(0.49 + (1 + 0.21ξ)²)
const toolVortex = (a) => {
  const xi = ((P.xF - P.xS) * a) / R, v = vortex(a, xi, R, P.U), r = R * Math.sqrt(1 + 0.21 * xi * xi + 0.49);
  return { ...v, r, s: (R * R) / r };
};

test('Field tool: fin size and stability derivatives', () => {
  close(d.CNaF, W('V7'), 1e-12, 'C_NαF'); close(d.cR * toolScale, W('AA7'), 1e-12, 'root chord (log10 slip)');
  close(d.CMa, W('AC7'), 1e-12, 'C_Mα'); close(d.CNr, W('AD7'), 1e-12, 'C_Nr'); close(d.wn, W('AH7'), 1e-12, 'ω_n');
  close(d.CLp * toolScale, W('AF7'), 1e-12, 'C_Lp');
  // its C_Npα (AE7, eq. 41 with a misplaced parenthesis) is a stale cached value that its own formula does not give;
  // it only enters the small coning rate, taken here from the tool's AI7
  // eq. 30 left side: the tool's 0.3501 with its derivatives
  close(Math.abs((d.CLp * toolScale / P.U) * (R * W('AI7') - R * d.wn)), W('BJ7'), 1e-12, 'damping term');
});

test('Field tool: vortex pair and induced roll moment at 9°, and |C_Li|max against α', () => {
  const a = W('O7'), v = toolVortex(a);
  close(v.Gamma, W('P7'), 1e-12, 'Γ'); close(v.phiV, W('S7'), 1e-12, 'φ_V'); close(v.r, W('Q7'), 1e-12, 'r'); close(v.s, W('R7'), 1e-12, 's');
  for (const [i, col] of [[0, 'AR7'], [1, 'AR8'], [2, 'AR9'], [3, 'AR10']])
    close(rollMoment({ ...toolFin, N: 1 }, v, W('U7') + (i * Math.PI) / 2), W(col), 1e-7, col);
  close(rollMoment(toolFin, v, W('U7')), W('AS7'), 1e-9, 'all fins');
  for (const r of [8, 30, 60, 100, 150, 184]) {
    const al = (W(`BG${r}`) * Math.PI) / 180;
    close(Math.abs(clMax(toolFin, toolVortex(al)).cl), W(`BI${r}`), 2e-4, `BI${r}`);
  }
});

test('Strip integral g equals direct quadrature of eq. 12; symmetry and limits', () => {
  const C1 = 30, C2 = -2.5, r = 5.2, pv = 0.6, phi = 1.9, Rr = 3, bb = 6;
  let q = 0;
  const n = 20000, h = bb / n, I = (y) => (-y * C1 * r * Math.cos(pv - phi) + y * y * (C1 - C2 * r * Math.cos(pv - phi)) + y ** 3 * C2) / (y * y - 2 * y * r * Math.cos(pv - phi) + r * r);
  for (let i = 0; i <= n; i++) q += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * I(Rr + i * h);
  close(gFin(C1, C2, r, pv, phi, Rr, bb), (q * h) / 3, 1e-9, 'g');
  // a symmetric pair on a symmetric fin set at zero roll gives no roll moment
  const v = vortex(0.1, 2, 3, 1e4), f = { N: 4, R: 3, b: 6, C1: 30, C2: -2.5, CNa: 4, U: 1e4 };
  close(rollMoment(f, v, 0), 0, 1e-12, 'symmetric', 1);
  close(rollMoment(f, v, 0.3), -rollMoment(f, v, -0.3), 1e-9, 'odd in φ');
  close(rollMoment(f, v, 0.3), rollMoment(f, v, 0.3 + Math.PI / 2), 1e-9, 'period 2π/N');
});

test('Lock-in: α* is where |C_Li|max first meets the damping term; σ_α and more static margin', () => {
  const L = lockIn(P, d);
  assert.ok(L.alphaStar > 0 && L.alphaStar < P.alphaMax);
  const f = L.f, at = (a) => Math.abs(clMax(f, vortex(a, ((P.xF - P.xS) * a) / R, R, P.U)).cl);
  close(at(L.alphaStar), d.D, 2e-3, 'balance at α*');
  assert.ok(L.curve.filter((c) => c.alpha < L.alphaStar * 0.98).every((c) => Math.abs(c.cl) < d.D));
  // eq. 27 by hand
  const p = { ...P, T: 500, lT: 39, sdT: 0.002, sOm: 0.2 }, den = 2 * Math.PI * p.q * R ** 3 * (d.CMa - (2 * Math.PI * p.q * R ** 5 * (d.CNr - d.CNpa) ** 2) / (p.U ** 2 * p.Ip));
  close(sigmaAlpha(p, d), (500 * Math.hypot(39 * 0.002, 0.2)) / Math.abs(den), 1e-12, 'σ_α');
  // the memo: static margin pushes the lock-in angle up
  assert.ok(lockIn({ ...P, SM: 20 }).alphaStar < L.alphaStar);
});
