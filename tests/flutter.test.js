// Fin flutter: Bennett's worked example (Peak of Flight 615, 2023), the altimetercloud.com form (its page code), the
// FLUTTER MARGIN1 workbook (Hoult), the remedies, and limits.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close, stats } from './_workbook.js';
import { flutterSpeed, centroid, denominatorConstant, air, seaLevelTemp, altimeterCloudForm, houltWorkbook, checkFlight, remedies } from '../site/js/calc/flutter.js';

// Bennett's fin: 7.5 in root, 2.5 in tip, 3 in semispan, 4.285 in sweep length, G10 (600 000 psi); launch site 4500 ft,
// maximum velocity 1500 ft/s at 14 000 ft AGL (18 500 ft ASL), standard atmosphere.
const FIN = { cR: 7.5, cT: 2.5, b: 3, m: 4.285, G: 600000 };

test('Bennett worked example: intermediate values as printed', () => {
  const { Cx, eps } = centroid(7.5, 2.5, 4.285);
  close(Cx, 4.49, 1e-3, 'C_x = 4.49 in'); close(eps, 0.349, 1e-3, 'ε = 0.349'); close(denominatorConstant(eps), 54.88, 1e-4, 'DN = 54.88');
  close(denominatorConstant(0.25), 39.294, 1e-4, 'DN(0.25) = 39.294 psi');
  const at = air(18500);
  close(at.TF, -6.86, 1e-3, 'T = −6.86 °F'); close(at.a, 1043.36, 1e-5, 'a = 1043.36 ft/s'); close(at.p, 7.2, 1e-3, 'p = 7.2 psi'); close(at.pr, 0.49, 0.002, 'p/p0 = 0.49');
  const o = flutterSpeed({ ...FIN, t: 0.125, h: 18500 });
  close(o.S, 15, 1e-12, 'area 15 in²'); close(o.tc, 0.0167, 0.002, 't/c'); close(o.lam, 1 / 3, 1e-12, 'λ'); close(o.A, 0.6, 1e-12, 'A');
});

test('Bennett worked example: flutter speeds for three thicknesses (standard day) and a 95 °F day', () => {
  for (const [t, Vf] of [[0.125, 1425], [0.15625, 1991.7], [0.1875, 2618.1]]) close(flutterSpeed({ ...FIN, t, h: 18500 }).Vf, Vf, 5e-4, `t = ${t}`);
  // the newsletter's hot-day figures use its shortcut: site temperature as the sea-level value, altitude AGL
  for (const [t, Vf] of [[0.15625, 1580.2], [0.1875, 2077]]) close(flutterSpeed({ ...FIN, t, h: 14000, TslF: 95 }).Vf, Vf, 5e-4, `hot day t = ${t}`);
  // the calculator ties the lapse line to the launch site: a standard site at 4500 ft gives T_SL = 59 °F exactly
  close(seaLevelTemp(59 - 0.00356 * 4500, 4500), 59, 1e-12, 'standard site');
});

test('altimetercloud.com form: its page code, three designs; it lacks (A + 2), so it is √(2/(A + 2)) × Martin', () => {
  // ffCalc() as published (metric, ISA with a 200 K floor): Vf = a √(G (t/c)³ / (1.337 AR³ P (λ+1)/2))
  const theirs = ({ spanMm, rootMm, tipMm, thickMm, altM, GMPa }) => {
    const span = spanMm / 1000, root = rootMm / 1000, tip = tipMm / 1000, thick = thickMm / 1000, G = GMPa * 1e6;
    let T = 288.15 - 0.0065 * altM; if (T < 200) T = 200;
    const P = 101325 * (T / 288.15) ** 5.2561, a = Math.sqrt(1.4 * 287.05 * T);
    const lambda = tip / root, S = (span * (root + tip)) / 2, AR = (span * span) / S, tc = thick / root;
    return a * Math.sqrt((G * tc ** 3) / (1.337 * AR ** 3 * P * ((lambda + 1) / 2)));
  };
  const IN = 25.4, FT = 0.3048, PSI_MPA = 0.006894757;
  for (const d of [{ cR: 7.5, cT: 2.5, b: 3, t: 0.125, h: 18500, G: 600000 }, { cR: 10, cT: 4, b: 6, t: 0.0625, h: 2000, G: 3.8e6 }, { cR: 6, cT: 0, b: 5, t: 0.25, h: 9000, G: 89000 }]) {
    const ref = theirs({ spanMm: d.b * IN, rootMm: d.cR * IN, tipMm: d.cT * IN, thickMm: d.t * IN, altM: d.h * FT, GMPa: d.G * PSI_MPA }) / FT;
    const ours = altimeterCloudForm(d);
    close(ours, ref, 0.004, `same form, our atmosphere (${d.cR}/${d.cT}/${d.b})`);
    const martin = flutterSpeed({ ...d, m: d.cR - d.cT }).Vf, A = flutterSpeed(d).A;   // m giving ε ≥ 0.25 symmetric-ish
    const sym = flutterSpeed({ ...d, m: (d.cR - d.cT) / 2 });                            // symmetric planform: ε = 0.25
    close(ours / sym.Vf, Math.sqrt(2 / (A + 2)) * Math.sqrt(denominatorConstant(0.25) / (2 * 1.337 * 14.696)), 1e-9, 'ratio √(2/(A+2))');
    assert.ok(ours < sym.Vf && martin <= sym.Vf * (1 + 1e-12));
  }
});

test('FLUTTER MARGIN1.xls row 6 (Hoult, chord at 75 % span) is reproduced by houltWorkbook()', () => {
  const W = workbook('FLUTTER MARGIN1');
  const o = houltWorkbook({ cR: W('B6'), cT: W('C6'), t: W('D6'), b: W('E6'), h: W('G6'), G: W('H6') });
  for (const [k, c] of [['lambda', 'I6'], ['S', 'J6'], ['AR', 'K6'], ['c75', 'L6'], ['X', 'M6'], ['pr', 'N6'], ['Mf', 'O6']]) close(o[k], W(c), 1e-12, `${k} ${c}`);
  // the root-chord form is more conservative than the workbook's 75 %-span chord
  const site = flutterSpeed({ cR: W('B6'), cT: W('C6'), t: W('D6'), b: W('E6'), m: (W('B6') - W('C6')) / 2, G: W('H6'), h: W('G6'), TslF: 551.8 - 459.67 });   // the workbook's hot day, 551.8 °R
  assert.ok(site.Mf < o.Mf);
});

test('Flight check and remedies: the worst point, and each remedy reaches the target exactly', () => {
  const fin = { ...FIN, t: 0.125 }, site = { h0: 4500, TslF: 59 };
  const flight = checkFlight(fin, [{ h: 2000, V: 900 }, { h: 14000, V: 1500 }, { h: 20000, V: 1200 }], site);
  assert.equal(flight.worst.h, 14000); close(flight.worst.Vf, 1425, 5e-4, 'worst Vf');
  const r = remedies(fin, flight.worst, site, 1.5);
  close(r.SF, 1425 / 1500, 5e-4, 'SF');
  const sf = (f) => flutterSpeed({ ...f, h: site.h0 + 14000, TslF: 59 }).Vf / 1500;
  close(sf({ ...fin, t: r.tNeed }), 1.5, 1e-9, 't for SF 1.5'); close(sf({ ...fin, G: r.Gneed }), 1.5, 1e-9, 'G for SF 1.5'); close(sf({ ...fin, b: r.bMax }), 1.5, 1e-6, 'span for SF 1.5');
  assert.ok(r.bMax < fin.b && r.tNeed > fin.t && r.Gneed > fin.G);
  // limits: zero speed is infinitely safe; doubling G (tip-to-tip) raises Vf by √2
  assert.equal(checkFlight(fin, [{ h: 0, V: 0 }], site).worst.SF, Infinity);
  close(flutterSpeed({ ...fin, G: 2 * fin.G, h: 18500 }).Vf / flutterSpeed({ ...fin, h: 18500 }).Vf, Math.SQRT2, 1e-12, '√2');
  // above the tropopause the pressure keeps falling (isothermal layer) so Vf keeps rising
  assert.ok(flutterSpeed({ ...fin, h: 50000 }).Vf > flutterSpeed({ ...fin, h: 36089 }).Vf);
  close(air(36089).p, air(36089.0001).p, 1e-6, 'continuous at the tropopause');
});

after(() => console.log(`flutter: ${stats.compared} values compared, max rel err ${stats.maxRel.toExponential(2)}`));

test('Fin materials: every preset computes; OpenRocket woods agree with Bennett; printed and foam fins are flagged', async () => {
  const def = (await import('../site/js/calculators/fin-flutter.js')).default;
  const f = def.groups.flatMap((g) => g.fields).find((x) => x.id === 'material');
  const base = Object.fromEntries(def.groups.flatMap((g) => g.fields).map((x) => [x.id, structuredClone(x.default)]));
  for (const o of f.options) { const r = def.compute({ ...base, material: o.value }, {}).results; assert.ok(Number.isFinite(r.SF) && r.SF > 0, o.value); }
  const sf = (m) => def.compute({ ...base, material: m }, {}).results.SF;
  assert.ok(Math.abs(sf('or-plywood-birch') / sf('birchply') - 1) < 1e-3, 'OpenRocket plywood ≈ Bennett plywood');
  assert.ok(Math.abs(sf('or-balsa') / sf('balsa') - 1) < 1e-3, 'OpenRocket balsa = Bennett balsa');
  assert.ok(def.compute({ ...base, material: 'or-pla-100-infill' }, {}).warnings.some((w) => /3D-printed/.test(w.text)));
  assert.ok(def.compute({ ...base, material: 'or-depron-xps' }, {}).warnings.some((w) => /not structural/.test(w.text)));
});
