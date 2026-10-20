// Propellant sloshing: Bessel roots, the worksheet frequencies (with the fill depth restored), limits and slosh masses.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close, stats } from './_workbook.js';
import { LAMBDA, besselJ1, fillDepth, mode, slosh } from '../site/js/calc/slosh.js';

const W = workbook('SLOSHIT');

test('λ_n are the roots of J₁′(λ) = 0 (worksheet values to 8 digits)', () => {
  for (const L of LAMBDA) assert.ok(Math.abs(besselJ1(L).dJ1) < 2e-9, `J1'(${L}) = ${besselJ1(L).dJ1}`);
  close(besselJ1(1).J1, 0.44005058574493355, 1e-13, 'J1(1)');
  close(LAMBDA[0], W('F7'), 1e-8, 'λ1'); close(LAMBDA[1], W('G7'), 1e-8, 'λ2'); close(LAMBDA[2], W('H7'), 1e-8, 'λ3');
});

test('Frequencies: ω² = (a/R)λ tanh(λh/R) with h = M/(ρπR²) — the worksheet’s tanh argument uses ρ for M', () => {
  const a = W('B7'), R = W('C7'), M = W('D7'), rho = W('E7');
  // reproduce the worksheet exactly when its argument λ·ρ/(πρR³) is used …
  const wb = (L) => Math.sqrt(a * (L / R) * Math.tanh((L * rho) / (Math.PI * rho * R ** 3)));
  close(wb(LAMBDA[0]), W('I7'), 1e-8, 'I7'); close(wb(LAMBDA[1]), W('J7'), 1e-8, 'J7'); close(wb(LAMBDA[2]), W('K7'), 1e-8, 'K7');
  // … and the report's argument λM/(πρR³) = λh/R is what the calculator uses
  const o = slosh({ a, R, M, rho });
  close(o.h, M / (rho * Math.PI * R * R), 1e-14, 'fill depth');
  close(o.modes[0].w, Math.sqrt(a * (LAMBDA[0] / R) * Math.tanh((LAMBDA[0] * M) / (Math.PI * rho * R ** 3))), 1e-14, 'mode 1');
});

test('Deep- and shallow-tank limits', () => {
  const deep = mode(1, { a: 32.174, R: 1, h: 50, M: 1 });
  close(deep.w, Math.sqrt(32.174 * LAMBDA[0]), 1e-12, 'deep: ω² = aλ/R');
  const sh = mode(1, { a: 32.174, R: 1, h: 1e-4, M: 1 });
  close(sh.w, LAMBDA[0] * Math.sqrt(32.174 * 1e-4), 1e-6, 'shallow: ω = λ√(ah)/R (shallow-water wave)');
  close(deep.pendulum, 1 / LAMBDA[0], 1e-12, 'deep pendulum length R/λ');
  close(deep.w, Math.sqrt(32.174 / deep.pendulum), 1e-12, 'pendulum analogue ω² = a/L');
});

test('Slosh masses: Σ 2/(λ²−1) → 1, so a shallow fill sloshes almost entirely; a deep fill mostly stays fixed', () => {
  let sum = 0;
  for (const L of LAMBDA) sum += 2 / (L * L - 1);
  assert.ok(sum > 0.98 && sum < 1, `ten-mode sum ${sum}`);
  const shallow = slosh({ a: 32, R: 1, M: 0.001 * Math.PI, rho: 1 });
  assert.ok(shallow.modes[0].mFrac > 0.83 && shallow.fixedFrac < 0.07);
  const deep = slosh({ a: 32, R: 1, M: 4 * Math.PI, rho: 1 });
  assert.ok(deep.modes[0].mFrac < 0.15 && deep.fixedFrac > 0.8, `deep m1/M ${deep.modes[0].mFrac}`);
  close(fillDepth(4 * Math.PI, 1, 1), 4, 1e-14);
});

after(() => console.log(`# slosh: ${stats.compared} comparisons, max rel err ${stats.maxRel.toExponential(2)}`));
