// Nozzle thrust coefficient: the THRUSTCF example (γ 1.4, ε 6, 15°, 600/14.7 psia), NACA 1135 table values,
// closed-form limits and the optimum expansion ratio.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close, stats } from './_workbook.js';
import { nozzle, cf, exitMach, areaRatio, pressureRatio, machFromPressure, throatRatio, cfInfinity, malina } from '../site/js/calc/nozzle.js';

const W = workbook('THRUSTCF');
const inp = { g: W('C5'), eps: W('D5'), alpha: W('E5'), pc: W('F5'), pa: W('H5'), dt: 1 };

/** The original exit-Mach iteration: 50 steps of false position from (1, 50) that keep the lower end fixed. */
function mxOriginal(L, U, g, eps) {
  const fm = (M) => areaRatio(M, g) ** -1 * eps - 1;
  let X;
  for (let i = 0; i < 50; i++) { const fl = fm(L), fu = fm(U); X = (L * fu - U * fl) / (fu - fl); if (X < 0) L = X; else U = X; }
  return X;
}

test('Closed-form cells reproduce the example exactly', () => {
  close(inp.pc * throatRatio(inp.g), W('G5'), 1e-12, 'G5 throat pressure');
  close(cfInfinity(inp.g), W('M5'), 1e-12, 'M5 first radical');
  close(malina(inp.alpha), W('Q5'), 1e-12, 'Q5 Malina correction');
  close(mxOriginal(W('I5'), W('J5'), inp.g, inp.eps), W('K5'), 1e-12, 'K5 exit Mach, original iteration');
});

test('Exit Mach solved to machine precision; the example’s 50-step iteration is within 1e-9 of it', () => {
  const M = exitMach(inp.eps, inp.g);
  close(areaRatio(M, inp.g), inp.eps, 1e-13, 'A/A* at the root');
  close(M, W('K5'), 1e-9, 'K5 exit Mach');
  const o = nozzle(inp);
  close(o.pe, W('L5'), 1e-8, 'L5 exit pressure');
  close(o.radical, W('N5'), 1e-9, 'N5 second radical');
  close(o.pressure, W('O5'), 1e-8, 'O5 pressure term');
  close(o.cf1D, W('P5'), 1e-9, 'P5 1-D thrust coefficient');
  close(o.cf3D, W('R5'), 1e-9, 'R5 3-D thrust coefficient');
  // with the original Mach number every downstream cell agrees to rounding
  const Mx = W('K5'), pe = inp.pc * pressureRatio(Mx, inp.g), rad = Math.sqrt(1 - (pe / inp.pc) ** ((inp.g - 1) / inp.g));
  close(pe, W('L5'), 1e-12, 'L5 from K5'); close(rad, W('N5'), 1e-12, 'N5 from K5');
  close(W('M5') * rad * W('Q5') + ((pe - inp.pa) / inp.pc) * inp.eps, W('R5'), 1e-12, 'R5 from K5');
});

test('NACA 1135 table values and the sonic limits', () => {
  close(areaRatio(2, 1.4), 1.6875, 1e-12, 'A/A* at M = 2');
  close(pressureRatio(2, 1.4), 0.12780452546295096, 1e-12, 'p/p0 at M = 2');
  close(throatRatio(1.4), 0.5282817877171742, 1e-12, 'p*/p0');
  close(exitMach(1, 1.2), 1, 1e-15, 'ε = 1 is sonic');
  close(machFromPressure(pressureRatio(3.7, 1.25), 1.25), 3.7, 1e-12, 'inverse pressure ratio');
  // sonic exit into vacuum: C_F = (γ+1)(2/(γ+1))^(γ/(γ−1))
  for (const g of [1.15, 1.25, 1.4, 1.67]) close(cf(g, 1, 0).cf1D, (g + 1) * (2 / (g + 1)) ** (g / (g - 1)), 1e-12, `sonic C_F, γ ${g}`);
  // infinite expansion into vacuum: C_F → the first radical
  const big = cf(1.4, 1e6, 0).cf1D;
  assert.ok(big < cfInfinity(1.4) && big > 0.999 * cfInfinity(1.4), `ε → ∞: ${big}`);
});

test('Ideal expansion: the 1-D C_F peaks where p_e = p_a; with the Malina factor the peak moves to a smaller ε', () => {
  const o = nozzle(inp), h = 1e-4 * o.epsOpt;
  const c1 = (e) => cf(inp.g, e, inp.pa / inp.pc, inp.alpha).cf1D, c3 = (e) => cf(inp.g, e, inp.pa / inp.pc, inp.alpha).cf3D;
  assert.ok(c1(o.epsOpt) > c1(o.epsOpt - h) && c1(o.epsOpt) > c1(o.epsOpt + h), '1-D peak at p_e = p_a');
  assert.ok(c3(o.epsOpt - h) > c3(o.epsOpt), '3-D still rising towards smaller ε');
  const at = c3;
  close(pressureRatio(exitMach(o.epsOpt, inp.g), inp.g), inp.pa / inp.pc, 1e-10, 'p_e = p_a at ε_opt');
  close(at(o.epsOpt), o.cfOpt, 1e-10, 'C_F at ε_opt');
  close(pressureRatio(exitMach(o.epsSep, inp.g), inp.g), (0.4 * inp.pa) / inp.pc, 1e-10, 'separation at p_e = 0.4 p_a');
  close(o.thrust, o.cf3D * inp.pc * Math.PI / 4, 1e-14, 'T = C_F p_c A_t');
});

test('Malina factor: 1 for a parallel jet, (1 + cos α)/2 otherwise; only the momentum term is reduced', () => {
  close(malina(0), 1, 1e-15); close(malina(90), 0.5, 1e-15);
  const a = cf(1.2, 10, 0.01, 0), b = cf(1.2, 10, 0.01, 20);
  close(b.cf3D - a.cf3D, (malina(20) - 1) * a.momentum, 1e-12, 'divergence loss');
  close(a.cf3D, a.cf1D, 1e-15);
});

after(() => console.log(`# nozzle: ${stats.compared} comparisons, max rel err ${stats.maxRel.toExponential(2)}`));
