import { test, after } from 'node:test';
import { workbook, close, stats } from './_workbook.js';
import { planform, derivatives, cantForRate, cantForCycles, cantWithLag } from '../site/js/calc/cantAngle.js';

const W = workbook('CANT ANGLE3');
const geo = { R: W('C5'), b: W('D5'), cR: W('E5'), cT: W('F5'), cNa: W('O5'), N: W('P5') };
const cyc = { Ixx: W('B12'), rho: W('C12'), h: W('D12'), L: W('E12'), Mc: W('H12') };

test('CANT ANGLE3.xls — planform and roll damping (both modes)', () => {
  for (const compat of [false, true]) {
    const d = derivatives(geo, { compat });
    close(d.S, W('G5'), 1e-12, 'S G5');
    close(d.A, W('J5'), 1e-12, 'A J5');
    close(d.C, W('K5'), 1e-12, 'C K5');
    close(d.Ld, W('L5'), 1e-12, 'Ld L5');
    close(d.M, W('M5'), 1e-12, 'M M5');
    close(d.CLp, W('R5'), 1e-12, 'CLp R5');
  }
});

test('CANT ANGLE3.xls — fixed burnout roll rate (rows 8–9)', () => {
  const d = derivatives(geo);
  const r = cantForRate({ f: W('D9'), V: W('B9') }, d);
  close(r.Vips, W('C9'), 1e-12, 'V ips C9');
  close(r.p, W('E9'), 1e-12, 'p E9');
  close(r.pV, W('F9'), 1e-12, 'p/V F9');
  close(r.delta, W('G9'), 1e-12, 'delta rad G9');
  close(r.deltaDeg, W('H9'), 1e-12, 'delta deg H9');
});

test('CANT ANGLE3.xls — fixed roll cycles (rows 11–12), spreadsheet mode', () => {
  const d = derivatives(geo, { compat: true });
  close(d.CLd, W('Q5'), 1e-12, 'CLd Q5 (workbook formula)');
  const r = cantForCycles(cyc, d, geo);
  close(r.k, W('F12'), 1e-12, 'k F12');
  close(r.brkt, W('G12'), 1e-12, 'bracket G12');
  close(r.delta, W('I12'), 1e-12, 'delta rad I12');
  close(r.deltaDeg, W('J12'), 1e-12, 'delta deg J12');
});

test('Memo CLδ and the planform integrals agree with direct strip integration', () => {
  const { R, b, cR, cT, cNa } = geo, n = 20000;
  let I1 = 0, I2 = 0;
  for (let i = 0; i < n; i++) {
    const y = R + ((i + 0.5) * (b - R)) / n, c = cR + ((cT - cR) * (y - R)) / (b - R), dy = (b - R) / n;
    I1 += y * c * dy; I2 += y * y * c * dy;
  }
  const pf = planform(geo);
  close(pf.Ld, I1 / (b - R), 1e-8, 'Ld = ∫y c dy/(b−R)');
  close(pf.M, -I2 / (b - R), 1e-8, 'M = −∫y² c dy/(b−R)');
  const d = derivatives(geo);
  close(d.CLd, (cNa * I1) / (2 * Math.PI * R ** 3), 1e-8, 'CLδ = cNα∫yc dy / 2πR³');
});

test('Inertia-lag form reduces to the steady state when J → 0', () => {
  const d = derivatives(geo);
  const s = cantForRate({ f: 1.24, V: 1037.2 }, d);
  const l = cantWithLag({ f: 1.24, V: 1037.2, Ixx: 1e-12, rho: 0.0023, h: 2000, L: 18 }, d, geo);
  close(l.delta, s.delta, 1e-9, 'J→0');
});

after(() => console.log(`cant angle: ${stats.compared} values compared, max rel err ${stats.maxRel.toExponential(2)}`));
