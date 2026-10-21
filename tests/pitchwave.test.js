// Pitch/yaw wave number: the memo's relations between ω_N, P, L and λ_p, a direct integration of the pitch equation,
// and the scaling law L ∝ ℓ (no spreadsheet exists for this topic).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { close } from './_workbook.js';
import { pitchWave, waveNumber, cmAlpha, rodInertia } from '../site/js/calc/pitchwave.js';

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
  assert.ok(pitchWave(base).L > 150 && pitchWave(base).L < 220, 'student rocket ≈ 200 m (memo series)');
});
