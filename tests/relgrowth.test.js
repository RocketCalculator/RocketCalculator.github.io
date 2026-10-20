// Reliability growth: the worksheet table (RELGRWTH.xls), the defect recursion, the inverse for the target and
// the expected-failure sum.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close, stats } from './_workbook.js';
import { defectsAfter, reliability, allowableDefects, flightsToReach, history, relgrowth } from '../site/js/calc/relgrowth.js';

const W = workbook('RELGRWTH');
const D0 = W('D8'), p = W('E8'), d = W('F8');

test('R = (1 − p)^{D₀(1 − pd)^T} reproduces the worksheet for T = 0 … 25', () => {
  close(reliability(D0, p, d, 0), W('H8'), 1e-12, 'H8 first flight');
  for (let row = 9; row <= 33; row++) close(reliability(D0, p, d, W(`G${row}`)), W(`H${row}`), 1e-12, `H${row}`);
  const h = history(D0, p, d, 25);
  h.forEach((r, n) => close(r.R, W(`H${n + 8}`), 1e-12, `history H${n + 8}`));
});

test('Defects follow D_n = D_{n−1} − D_{n−1}pd (recursion of the memo)', () => {
  let D = D0;
  for (let n = 1; n <= 30; n++) {
    D -= D * p * d;
    close(defectsAfter(D0, p, d, n), D, 1e-12, `D${n}`);
  }
  const h = history(D0, p, d, 5);
  h.forEach((r) => { close(r.shown, r.D * p, 1e-14, 'shown'); close(r.fixed, r.D * p * d, 1e-14, 'fixed'); });
});

test('Flights to the target invert the reliability formula', () => {
  for (const Rt of [0.5, 0.9, 0.95, 0.99, 0.999]) {
    const { exact, flights, Ds } = flightsToReach(D0, p, d, Rt);
    close(allowableDefects(p, Rt), Ds, 1e-14);
    close(reliability(D0, p, d, exact), Rt, 1e-10, `R(T exact) = ${Rt}`);
    assert.ok(reliability(D0, p, d, flights) >= Rt - 1e-12, `meets ${Rt} after ${flights}`);
    assert.ok(flights === 0 || reliability(D0, p, d, flights - 1) < Rt, `one fewer is short of ${Rt}`);
  }
  // worksheet table: 0.9 first reached at T = 6 (H14 = 0.930), 0.95 at T = 7 (H15 = 0.963)
  assert.equal(flightsToReach(D0, p, d, 0.95).flights, 7);
  assert.equal(flightsToReach(D0, p, d, 0.9).flights, 6);
  assert.equal(flightsToReach(D0, p, d, 0.02).flights, 0, 'first flight already meets a low target');
  assert.equal(flightsToReach(D0, p, 0, 0.95).flights, Infinity, 'nothing fixed: never');
  assert.equal(flightsToReach(0, p, d, 0.95).flights, 0, 'no defects');
});

test('Expected failures are the sum of the failure chances of the test flights', () => {
  const o = relgrowth({ D0, p, d, T: 5, Rt: 0.95 });
  let F = 0;
  for (let row = 8; row <= 12; row++) F += 1 - W(`H${row}`);
  close(o.F, F, 1e-12, 'F5');
  assert.equal(relgrowth({ D0, p, d, T: 0, Rt: 0.95 }).F, 0);
  // with no fixing every flight fails with chance 1 − R₀
  close(relgrowth({ D0, p, d: 0, T: 10, Rt: 0.95 }).F, 10 * (1 - (1 - p) ** D0), 1e-12, 'd = 0');
  close(o.fixed + o.DT, D0, 1e-14, 'defects conserved');
});

test('Trends: more tests, better fixing and fewer defects all raise reliability', () => {
  assert.ok(reliability(D0, p, d, 6) > reliability(D0, p, d, 5));
  assert.ok(reliability(D0, p, 1, 5) > reliability(D0, p, 0.5, 5));
  assert.ok(reliability(2, p, d, 5) > reliability(6, p, d, 5));
  assert.ok(flightsToReach(D0, p, 0.4, 0.95).flights > flightsToReach(D0, p, 0.8, 0.95).flights);
});

after(() => console.log(`# relgrowth: ${stats.compared} comparisons, max rel err ${stats.maxRel.toExponential(2)}`));
