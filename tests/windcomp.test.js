// Wind compensation: the field tool's table lookup and launcher angles (LAUNCHER ANGLES.xls), the signed azimuth of
// the memo, and the geometry of the tilt vector.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close } from './_workbook.js';
import { qeForRange, windComp, bearing } from '../site/js/calc/windcomp.js';

const W = workbook('LAUNCHER ANGLES');
const table = [6, 7, 8, 9, 10, 11].map((row) => ({ r: W(`D${row}`), qe: W(`E${row}`) }));
const base = { table, WI: W('B6'), WC: W('C6'), AZ: W('G6'), R: W('H6') };

test('Table lookup reproduces the in-plane and cross-plane QEs (VLOOKUP + slope)', () => {
  close(qeForRange(table, Math.abs(W('B6') - W('H6'))).qe, W('I6'), 1e-12, 'I6');
  close(qeForRange(table, Math.abs(W('C6'))).qe, W('K6'), 1e-12, 'K6');
  // every table row is returned exactly, and the slope past the end is 2F₁₀ − F₉
  for (const row of table) close(qeForRange(table, row.r).qe, row.qe, 1e-14, `row ${row.r}`, 1);
  const x = 6000, F = W('F11');
  close(qeForRange(table, x).qe, W('E11') + F * (x - W('D11')), 1e-12, 'extrapolated');
  assert.equal(qeForRange(table, x).extrapolated, true);
});

test('Total launcher QE and the off-axis angle match the field tool', () => {
  const o = windComp(base);
  close(o.qeIs, W('J6'), 1e-12, 'J6');
  close(o.qeCs, W('L6'), 1e-12, 'L6');
  close(o.offAxis, W('M6'), 1e-12, 'M6');
  close(o.QE, W('N6'), 1e-12, 'N6');
});

test('Azimuth: the memo’s signed formula; the field tool’s value is the cross drift to the left', () => {
  // cross drift to the right (+) → tilt to the left of the azimuth
  close(windComp(base).AZT, W('G6') - W('M6') + 360, 1e-12, 'drift right');
  // the field tool adds the angle whatever the sign of the cross drift; with the drift to the left both agree
  close(windComp({ ...base, WC: -W('C6') }).AZT, W('O6'), 1e-12, 'O6 (drift left)');
  // in-plane drift beyond the desired range: tilt back, upwind
  const back = windComp({ ...base, WI: 7000, WC: 0 });
  assert.ok(back.tiltI < 0);
  close(back.AZT, 225, 1e-12, 'straight back');
});

test('The tilt vector cancels the drift: zero wind needs only the in-plane tilt; no range and no wind needs none', () => {
  const o = windComp({ ...base, WI: 0, WC: 0 });
  close(o.tiltC, 0, 1e-12, 'no cross tilt', 1); close(o.AZT, base.AZ, 1e-12, 'along the azimuth');
  close(o.QE, qeForRange(table, base.R).qe, 1e-12, 'QE from the table');
  const z = windComp({ ...base, WI: 0, WC: 0, R: 0 });
  close(z.QE, 90, 1e-12, 'vertical'); close(z.tilt, 0, 1e-12, 'no tilt', 1);
  close(bearing(350, 10, 10), 35, 1e-12, 'bearing wraps');
});
