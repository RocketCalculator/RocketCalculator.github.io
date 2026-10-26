// Pitch/yaw wave number: the memo's relations between ω_N, P, L and λ_p, a direct integration of the pitch equation,
// and the scaling law L ∝ ℓ (no spreadsheet exists for this topic).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { close } from './_workbook.js';
import { pitchWave, waveNumber, cmAlpha, rodInertia, rollCheck, TARGET, LIMIT } from '../site/js/calc/pitchwave.js';
import { simLauncherLength } from '../site/js/calc/trajectory.js';
import page from '../site/js/calculators/pitch-yaw-wavenumber.js';

const base = { I: 29.4, rho: 1.225, d: 0.156, Cma: cmAlpha(10, 2), U: 200, l: 3.76 };

test('ω_N² = −ρSdU²C_Mα/2I, P = 2π/ω_N, L = UP = 2π√(2I/−ρSdC_Mα), λ_p = 2π/L', () => {
  const o = pitchWave(base), S = (Math.PI * base.d ** 2) / 4;
  close(o.omega ** 2, (-1.225 * S * base.d * base.U ** 2 * base.Cma) / (2 * base.I), 1e-12, 'ω²');
  close(o.P, (2 * Math.PI) / o.omega, 1e-12, 'P');
  close(o.L, base.U * o.P, 1e-12, 'L = UP');
  close(o.L, 2 * Math.PI * Math.sqrt((2 * base.I) / (-1.225 * S * base.d * base.Cma)), 1e-12, 'L');
  close(o.lam * o.L, 2 * Math.PI, 1e-12, 'λL = 2π');
  close(o.f, base.U / o.L, 1e-12, 'f = U/L');
});

test('Integrating I α̈ = qSdC_Mα α gives the same period', () => {
  const o = pitchWave(base), k = (o.q * o.S * base.d * base.Cma) / base.I;
  // velocity Verlet over many periods; time of the 20th upward zero crossing
  let a = 0, w = 1, t = 0, crossings = 0, last = 0;
  const dt = o.P / 4000;
  while (crossings < 20) {
    const acc = k * a, a1 = a + w * dt + 0.5 * acc * dt * dt, w1 = w + 0.5 * (acc + k * a1) * dt;
    if (a < 0 && a1 >= 0) { crossings++; last = t + dt * (-a / (a1 - a)); }
    a = a1; w = w1; t += dt;
  }
  close(last / 20, o.P, 1e-6, 'period from integration');
});

test('Wavelength is independent of speed and scales with size (I ∝ ℓ⁵, Sd ∝ ℓ³)', () => {
  close(pitchWave({ ...base, U: 50 }).L, pitchWave({ ...base, U: 400 }).L, 1e-14, 'speed');
  const k = 3, big = pitchWave({ ...base, I: base.I * k ** 5, d: base.d * k, l: base.l * k });
  close(big.L, k * pitchWave(base).L, 1e-12, 'L ∝ ℓ');
  close(big.Lrel, pitchWave(base).Lrel, 1e-12, 'wavelengths per body length unchanged');
  // denser air shortens it as ρ^(−1/2)
  close(waveNumber(base.I, 4 * base.rho, base.d, base.Cma), 2 * waveNumber(base.I, base.rho, base.d, base.Cma), 1e-12, 'ρ');
  close(rodInertia(12, 2), 4, 1e-15, 'rod');
  assert.ok(pitchWave(base).L > 150 && pitchWave(base).L < 220, 'student rocket ≈ 180 m (sanity check, not a memo value)');
});

// Roll against pitch (Hoult, fin setting theory rev. 3, p. 6) and the solved fixes of the page verdict.
const pageVals = (patch) => { const v = {}; for (const g of page.groups) for (const f of g.fields) v[f.id] = f.default; return { ...v, ...patch }; };

test('Roll check: λ_R/λ_P = f_R/f_N, response λ_P²/(λ_P²−λ_R²), bands at 30 % and 40 %', () => {
  const o = pitchWave(base), r = rollCheck(o, 0.35 * o.f, base);
  close(r.ratio, 0.35, 1e-12, 'ratio');
  close(r.lamR / o.lam, 0.35, 1e-12, 'λ_R/λ_P');
  close(r.amp, o.lam ** 2 / (o.lam ** 2 - r.lamR ** 2), 1e-12, 'response');
  assert.equal(r.level, 'marginal');
  assert.equal(rollCheck(o, TARGET * o.f, base).level, 'safe');
  assert.equal(rollCheck(o, 1.01 * LIMIT * o.f, base).level, 'unsafe');
  assert.equal(rollCheck(o, 0, base).level, 'safe');
});

test('Each solved fix brings the roll to exactly 30 % of the pitch frequency', () => {
  for (const patch of [{ fR: 1.2, iMode: 'measured', I: 10 }, { fR: 0.45 }, { fR: 2, cmMode: 'direct', Cma: -30 }]) {
    const v = pageVals(patch), out = page.compute(v), rc = out.rc;
    assert.notEqual(out.lv, 'safe');
    const again = (p) => page.compute(pageVals({ ...patch, ...p })).rc;
    close(again({ fR: rc.fR }).ratio, TARGET, 1e-12, 'roll-rate fix');
    if (v.cmMode === 'margin') close(again({ SM: v.SM * rc.stiffen }).ratio, TARGET, 1e-12, 'margin fix');
    else close(again({ Cma: v.Cma * rc.stiffen }).ratio, TARGET, 1e-12, 'C_Mα fix');
    close(again({ iMode: 'measured', I: out.p.I / rc.stiffen }).ratio, TARGET, 1e-12, 'inertia fix');
    assert.equal(again({ fR: rc.fR }).level, 'safe');
    assert.ok(out.verdict.fixes.length >= 2 && out.verdict.fixes.length <= 3);
  }
});

test('Rail a point-mass simulation needs matches the Trajectory Simulation’s (Hoult 1976)', () => {
  const out = page.compute(pageVals({ railL: 4 }));
  close(out.results.Lsim, simLauncherLength(out.o.lam, 4), 1e-15, 'L_sim');
  assert.ok(out.results.Lsim > 4, 'the point-mass rail is longer than the real one');
});
