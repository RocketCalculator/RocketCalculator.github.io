// Nozzle thrust coefficient: the THRUSTCF example (γ 1.4, ε 6, 15°, 600/14.7 psia), NACA 1135 table values,
// closed-form limits and the optimum expansion ratio.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close, stats } from './_workbook.js';
import { nozzle, cf, exitMach, areaRatio, pressureRatio, machFromPressure, throatRatio, cfInfinity, malina, subsonicMach, normalShock, raoAngles, bellEfficiency, conicalLength, contour, nozzleFlow, separationRatio, cStar } from '../site/js/calc/nozzle.js';
import def from '../site/js/calculators/nozzle-thrust.js';

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

test('Huzel & Huang worked example: 80 % bell, ε 14, r_t 12.45 in (NASA SP-125 p. 98)', () => {
  const rt = 12.45, { thn, the } = raoAngles(14, 80);
  close(conicalLength(rt, 14, 15, 0.382 * rt), 128.0, 2e-3, 'eq. (4-7): 15° cone length 128 in');
  assert.ok(Math.abs(thn - 27.4) < 0.15 && Math.abs(the - 9.8) < 0.15, `θn ${thn}, θe ${the} vs 27.4°, 9.8°`);
  const c = contour({ rt, rc: 2 * rt, thetaC: 30, eps: 14, type: 'bell', Lf: 80 });
  close(c.Ln, 102.4, 1e-3, 'L_n = 0.8 × 128 = 102.4 in');
  close(c.xN, 2.19, 3e-3, 'N_c = 0.382 r_t sin θn'); close(c.rN, 12.99, 1e-3, 'N_a = r_t + 0.382 r_t (1 − cos θn)');
  const [xe, re] = c.pts[c.pts.length - 1]; close(xe, c.Ln, 1e-12, 'exit station'); close(re, rt * Math.sqrt(14), 1e-12, 'exit radius');
  // the contour is continuous, monotone downstream of the throat and meets the throat at r_t
  const dv = c.pts.filter(([x]) => x >= 0);
  dv.slice(1).forEach(([x, r], i) => assert.ok(x > dv[i][0] && r >= dv[i][1], 'monotone divergent'));
  close(Math.min(...c.pts.map(([, r]) => r)), rt, 1e-12, 'throat radius');
});

test('Huzel & Huang fig. 4-12/4-14 tables: limits and trends', () => {
  close(bellEfficiency(20, 100), 0.9915, 1e-12, 'full bell 99.15 %');
  assert.ok(bellEfficiency(10, 60) < bellEfficiency(10, 80) && bellEfficiency(10, 80) < bellEfficiency(10, 100), 'longer bell, less loss');
  assert.ok(bellEfficiency(30, 80) > malina(15), '80 % bell beats a full 15° cone');
  assert.ok(raoAngles(20, 60).thn > raoAngles(20, 100).thn && raoAngles(20, 60).the > raoAngles(20, 100).the, 'shorter bell turns harder');
});

test('Normal shock (NACA 1135 eqs. 93, 96, 99; table II, γ = 1.4)', () => {
  const s = normalShock(2, 1.4);
  close(s.M2, 0.57735, 1e-5, 'M2'); close(s.p2p1, 4.5, 1e-12, 'p2/p1'); close(s.p02p01, 0.72087, 1e-5, 'p02/p01');
  close(normalShock(1, 1.4).p02p01, 1, 1e-12, 'no loss at M = 1');
  close(subsonicMach(areaRatio(0.3, 1.2), 1.2), 0.3, 1e-10, 'subsonic root');
});

test('Schmucker eq. (11) and Summerfield eq. (7)', () => {
  close(separationRatio('schmucker', 3, 40), (1.88 * 3 - 1) ** -0.64, 1e-15);
  close(separationRatio('schmucker', 3, 40), 0.3743, 1e-3, 'p_i/p_a ≈ 0.37 at M_i = 3 (fig. 25)');
  close(separationRatio('summerfield', 3, 40), 0.4, 0);
  close(separationRatio('schmucker', 9, 40), separationRatio('schmucker', 5, 40), 0, 'held at the data limit M = 5');
});

test('Flow along the nozzle: shock position satisfies p_exit = p_a; mass flow is conserved; regimes ordered', () => {
  const g = 1.2, geo = contour({ rt: 0.5, rc: 1.25, thetaC: 30, eps: 8, type: 'cone', alpha: 15 });
  const pc = 100, f0 = nozzleFlow(geo, g, pc, 0);
  assert.ok(f0.peNS > f0.pe && f0.peSub > f0.peNS, 'p_e < p_NS < p_sub');
  const pa = (f0.peNS + f0.peSub) / 2, f = nozzleFlow(geo, g, pc, pa);
  assert.equal(f.regime, 'shock');
  const ex = f.prof[f.prof.length - 1];
  close(ex.p * pc, pa, 1e-9, 'exit pressure behind the shock = p_a');
  assert.ok(ex.M < 1 && f.shock.M1 > 1 && f.shock.x > 0 && f.shock.x < geo.Ln, 'subsonic exit, shock inside');
  assert.ok(f.sep && f.sep.x < f.shock.x, 'a real nozzle separates before the inviscid shock');
  // ρ V A / (ρ_c a_c A*) is the same everywhere: ρ/ρc · M · √(T/Tc) · A/A* (with A* growing behind the shock)
  const flux = (p) => p.rho * p.M * Math.sqrt(p.T) * p.A;
  const ref = flux(f.prof.find((p) => Math.abs(p.x) < 1e-12));
  for (const p of f.prof) close(flux(p), ref, 1e-6, `mass flux at x = ${p.x.toFixed(3)}`);
  assert.equal(nozzleFlow(geo, g, pc, 0.99 * f0.peSub * 1.02).regime, 'unchoked');
});

test('Calculator: the THRUSTCF example as a cone reproduces the workbook; geometry inverts; verdict and fixes', () => {
  const base = Object.fromEntries(def.groups.flatMap((gr) => gr.fields).map((f) => [f.id, f.default]));
  const v = { ...base, type: 'cone', g: inp.g, dt: 1, de: Math.sqrt(inp.eps), Ld: conicalLength(0.5, inp.eps, inp.alpha, 0.191), pc: inp.pc, pa: inp.pa };
  const o = def.compute(v);
  close(o.results.alpha, 15, 1e-9, 'half angle recovered from L_d'); close(o.results.eps, 6, 1e-12, 'ε from the diameters');
  close(o.results.cf, W('R5'), 1e-9, 'R5 3-D thrust coefficient');
  assert.equal(o.verdict.level, 'safe');
  close(o.results.thetaC, 30, 1e-6, 'default L_c gives θc = 30°');
  close(o.results.mdot * o.results.cstar, v.pc * 6894.757293168 * o.results.At * 0.00064516, 1e-12, 'ṁ c* = p_c A_t');
  // an over-expanded bell: unsafe, and the suggested exit diameter and p_c each restore the 1.15 margin exactly
  const bad = { ...base, type: 'bell', dt: 0.75, de: 3.75, Lc: 1.2, Ld: 0.8 * conicalLength(0.375, 25, 15, 0.14325), pc: 500, pa: 14.7 }, ob = def.compute(bad);
  assert.equal(ob.verdict.level, 'unsafe'); close(ob.results.Lf, 80, 1e-9, 'bell length 80 %');
  const d2 = ob.results.deMax, L2 = 0.8 * conicalLength(0.375, (d2 / 0.75) ** 2, 15, 0.14325);
  close(def.compute({ ...bad, de: d2, Ld: L2 }).results.sepMargin, 1.15, 1e-6, 'd_e,max gives margin 1.15');
  close(def.compute({ ...bad, pc: ob.results.pcMin }).results.sepMargin, 1.15, 1e-6, 'p_c,min gives margin 1.15');
  // a length no angle can produce is drawn at the nearest buildable length, with a warning that gives the range
  const short = def.compute({ ...base, Lc: 0.01 });
  assert.equal(short.results.thetaC, 88); assert.ok(short.warnings.some((x) => /convergent .* cannot be built/.test(x.text) && /between/.test(x.fix)));
  const cone = def.compute({ ...base, type: 'cone', Ld: 0.05 });
  assert.equal(cone.results.alpha, 80); assert.ok(cone.warnings.some((x) => /cone .* cannot reach/.test(x.text)));
  // only physically impossible diameters are refused
  assert.throws(() => def.compute({ ...base, de: 0.9 }), /exit diameter must be larger/);
});

after(() => console.log(`# nozzle: ${stats.compared} comparisons, max rel err ${stats.maxRel.toExponential(2)}`));
