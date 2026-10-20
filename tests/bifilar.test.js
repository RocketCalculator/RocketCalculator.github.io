// No workbook exists for the bifilar pendulum: check the memo's analytic results.
import { test, after } from 'node:test';
import { close, stats } from './_workbook.js';
import { bifilar, yawPeriod, periodRatio } from '../site/js/calc/bifilar.js';

const g = 9.80665;

test('Uniform rod, wires at the ends: P_Y/P_G = √(1/3) = 0.577 (memo)', () => {
  const L = 2, m = 5, I = (m * L * L) / 12, x1 = L / 2, x2 = L / 2, l = 1.5;
  const PY = yawPeriod({ I, m, g, x1, x2, l }), PG = 2 * Math.PI * Math.sqrt(l / g);
  const o = bifilar({ m, x1, x2, l, PY, PG, g, Lrod: L });
  close(o.ratio, Math.sqrt(1 / 3), 1e-12, 'period ratio');
  close(+o.ratio.toFixed(3), 0.577, 1e-12, 'memo quotes 0.577');
  close(o.I_periods, I, 1e-12, 'I from periods');
  close(o.I_length, I, 1e-12, 'I from wire length');
  close(o.I_rod, I, 1e-12, 'rod inertia');
});

test('Uniform rod, wires half-way to the ends: P_Y/P_G = 1.155 (memo)', () => {
  const L = 2, m = 5, k = Math.sqrt(L * L / 12);
  close(+periodRatio(k, L / 4, L / 4).toFixed(3), 1.155, 1e-12, 'memo quotes 1.155');
});

test('Statics: wire tensions sum to the weight and balance moments about the CG', () => {
  const o = bifilar({ m: 12, x1: 0.4, x2: 0.7, l: 2, PY: 3, PG: 2.8, g, Lrod: 0 });
  close(o.T1 + o.T2, 12 * g, 1e-12, 'ΣT = mg');
  close(o.T1 * 0.4, o.T2 * 0.7, 1e-12, 'moment balance');
  close(o.k, Math.sqrt(o.I_periods / 12), 1e-12, 'radius of gyration');
});

after(() => console.log(`bifilar: ${stats.compared} values compared, max rel err ${stats.maxRel.toExponential(2)}`));
