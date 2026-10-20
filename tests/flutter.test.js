import { test, after } from 'node:test';
import { workbook, close, stats } from './_workbook.js';
import { flutter } from '../site/js/calc/flutter.js';

const W = workbook('FLUTTER MARGIN1');
const inp = { cR: W('B6'), cT: W('C6'), t: W('D6'), b: W('E6'), h: W('G6'), G: W('H6'), M: W('P6') };

test('FLUTTER MARGIN1.xls row 6 (Gold Rush III)', () => {
  const o = flutter(inp);
  close(o.lambda, W('I6'), 1e-12, 'taper I6');
  close(o.S, W('J6'), 1e-12, 'area J6');
  close(o.AR, W('K6'), 1e-12, 'aspect ratio K6');
  close(o.c75, W('L6'), 1e-12, 'c(0.75) L6');
  close(o.X, W('M6'), 1e-12, 'X M6');
  close(o.pr, W('N6'), 1e-12, 'p/po N6');
  close(o.Mf, W('O6'), 1e-12, 'flutter Mach O6');
  close(o.MS, W('Q6'), 1e-12, 'margin Q6');
});

test('Minimum thickness gives zero margin', () => {
  const o = flutter(inp);
  const o2 = flutter({ ...inp, t: o.tMin });
  close(o2.Mf, inp.M, 1e-12, 'Mf(tMin) = M');
});

after(() => console.log(`flutter: ${stats.compared} values compared, max rel err ${stats.maxRel.toExponential(2)}`));
