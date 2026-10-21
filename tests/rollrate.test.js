// Roll-rate history: the boost-phase asymptotic formula against a direct integration of the roll equation, the closed
// form of the apogee ratio against the memo's integral (7) and its Figure 1, and the error function.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { close } from './_workbook.js';
import { erf, apogeeRatio, rollRate, G0 } from '../site/js/calc/rollrate.js';
import { derivatives } from '../site/js/calc/cantAngle.js';

// fin set of the cant-angle example (inches), burnout 2000 ft at 1037 ft/s, 18 ft launcher
const fins = derivatives({ R: 3.125, b: 5.5, cR: 10, cT: 2, cNa: 3.5, N: 4 });
const base = { CLd: fins.CLd, CLp: fins.CLp, N: 4, delta: (0.5 * Math.PI) / 180, R: 3.125 / 12, I: 0.22, rho: 0.0023, rhoA: 0.0019, L: 18, hB: 2000, VB: 1037.2 };

test('erf matches tabulated values', () => {
  for (const [x, v] of [[0.1, 0.1124629160182849], [0.5, 0.5204998778130465], [1, 0.8427007929497149], [2, 0.9953222650189527], [3, 0.9999779095030014], [4.5, 0.9999999998033839]]) close(erf(x), v, 1e-14, `erf(${x})`);
});

test('Apogee ratio: closed form equals the memo’s integral (7) and reads like its Figure 1', () => {
  for (const X of [0.01, 0.5, 1, 2, 4, 6, 20]) {
    // e^{−X/2} + X ∫₀¹ u² e^{−Xu²/2} du by Simpson’s rule
    const n = 4000, f = (u) => u * u * Math.exp((-X * u * u) / 2);
    let sum = f(0) + f(1);
    for (let i = 1; i < n; i++) sum += (i % 2 ? 4 : 2) * f(i / n);
    close(apogeeRatio(X), Math.exp(-X / 2) + (X * sum) / (3 * n), 1e-10, `X = ${X}`);
  }
  // Figure 1 read-offs: 1 at 0, ≈ 0.75 at 2, ≈ 0.6 at 4, ≈ 0.5 at 6
  close(apogeeRatio(0), 1, 1e-12, 'X = 0');
  assert.ok(Math.abs(apogeeRatio(2) - 0.75) < 0.02 && Math.abs(apogeeRatio(4) - 0.6) < 0.02 && Math.abs(apogeeRatio(6) - 0.5) < 0.02);
});

test('Apogee roll rate solves dp/dV − GVp = −HV² from the burnout state', () => {
  const o = rollRate(base), H = (o.G * o.pB0) / base.VB;
  // RK4 in V from V_B down to 0, starting at the lagged burnout rate
  let p = o.pB, V = base.VB; const n = 20000, h = -base.VB / n, F = (V, p) => o.G * V * p - H * V * V;
  for (let i = 0; i < n; i++) {
    const k1 = F(V, p), k2 = F(V + h / 2, p + (h / 2) * k1), k3 = F(V + h / 2, p + (h / 2) * k2), k4 = F(V + h, p + h * k3);
    p += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4); V += h;
  }
  close(o.pA, p, 1e-9, 'p_A');
});

test('Boost: the integrated roll rate solves the roll equation; the memo’s approximation is close for small |J|', () => {
  const o = rollRate(base), a = base.VB ** 2 / (2 * base.hB), d = 2 * base.R, S = Math.PI * base.R ** 2;
  // independent fine RK4 of I dp/dt = qSd[CLp pd/2U + N CLd δ], U = at, p = 0 at launcher exit
  let t = Math.sqrt((2 * base.L) / a), p = 0; const tB = base.VB / a, n = 100000, dt = (tB - t) / n;
  const F = (t, p) => { const U = a * t, q = 0.5 * base.rho * U * U; return (q * S * d * (base.CLp * p * d / (2 * U) + base.N * base.CLd * base.delta)) / base.I; };
  for (let i = 0; i < n; i++) {
    const k1 = F(t, p), k2 = F(t + dt / 2, p + (dt / 2) * k1), k3 = F(t + dt / 2, p + (dt / 2) * k2), k4 = F(t + dt, p + dt * k3);
    p += (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4); t += dt;
  }
  close(o.pB, p, 1e-8, 'p at burnout');
  close(o.pB0, (-2 * base.CLd * 4 * base.delta * base.VB) / (d * base.CLp), 1e-12, 'p = λ_R0 U');
  // small |J| (light rocket, high burnout): the memo’s λ_R0/(1 − J) is within 0.5 %
  const lite = rollRate({ ...base, I: 0.05, hB: 5000 });
  assert.ok(Math.abs(lite.JB) < 0.03 && Math.abs(lite.pBapprox / lite.pB - 1) < 0.005, `approx ${lite.pBapprox} vs ${lite.pB}`);
  // large |J|: the approximation overestimates, the integration stays below the elementary rate
  assert.ok(o.pBapprox > o.pB && o.pB < o.pB0);
});

test('Roll angle: integrated turns match the memo’s Δφ for small |J|; zero cant gives no roll', () => {
  const lite = rollRate({ ...base, I: 0.05, hB: 5000 });
  close(lite.phiB, lite.phiApprox, 0.05, 'Δφ (approximation is weakest just off the launcher)');
  // Δφ is the integral of λ_R over height in the memo's form
  let sum = 0; const n = 20000, dh = (base.hB - base.L) / n, o = rollRate(base);
  for (let i = 0; i < n; i++) sum += o.lamAt(base.L + (i + 0.5) * dh) * dh;
  close(o.phiApprox, sum, 1e-6, 'memo Δφ');
  const z = rollRate({ ...base, delta: 0 });
  close(z.pB, 0, 1e-12, 'no cant', 1); close(z.pA, 0, 1e-12, 'no cant at apogee', 1);
  assert.ok(o.G > 0 && o.tCoast > 0 && G0 > 32 && o.hist.length > 100 && o.hist.length < 500);
});
