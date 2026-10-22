// Ground handling: the UNBUTTON table (button load against lift factor K), statics of the carried rocket, and the
// joint moment taken about the cut agreeing from both sides.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close } from './_workbook.js';
import { supports, massProps, cut, liftForce, buttonLoad } from '../site/js/calc/handling.js';

test('Button extraction load and nose lift force reproduce UNBUTTON for K = 1 … 3', () => {
  const W = workbook('UNBUTTON'), [xL, xA, xF, xCG, Wt] = ['B4', 'C4', 'D4', 'E4', 'F4'].map(W);
  for (let row = 4; row <= 14; row++) {
    const K = W(`G${row}`);
    close(K * liftForce(Wt, xCG, xF, xL), W(`J${row}`), 1e-12, `J${row} lift`);
    close(buttonLoad(Wt, xCG, xF, xL, xA, K), W(`H${row}`) / W(`I${row}`), 1e-12, `H/I ${row}`);
  }
  close(buttonLoad(Wt, xCG, xF, xL, xA, 2), 241.82, 1e-4, 'memo: about 243 lb at K = 2');
  // at K = 1 the button is not pulled (negative: it pushes up)
  assert.ok(buttonLoad(Wt, xCG, xF, xL, xA, 1) < 0);
});

test('Carried rocket: supports balance weight and moment; the joint moment is the same from either side', () => {
  const items = [{ w: 4, x: 12 }, { w: 14, x: 38 }, { w: 8, x: 60 }, { w: 28, x: 93.67 }], { W, xCG } = massProps(items);
  const xF = 5, xA = 100, { FF, FA } = supports(W, xCG, xF, xA);
  close(FF + FA, W, 1e-12, 'forces'); close(FF * (xCG - xF), FA * (xA - xCG), 1e-12, 'moments');
  for (const xJ of [20, 55, 80]) {
    const fwd = cut(items, FF, xF, xJ);
    // aft piece: support FA at xA and the items behind the cut, moments about the cut (opposite sign convention)
    let V = -FA, M = FA * (xA - xJ);
    for (const i of items) if (i.x > xJ) { V += i.w; M -= i.w * (i.x - xJ); }
    close(fwd.V, V, 1e-9, `shear at ${xJ}`, 1); close(fwd.M, M, 1e-9, `moment at ${xJ}`, 1);
  }
  close(cut(items, FF, xF, 55, 2).M, 2 * cut(items, FF, xF, 55).M, 1e-12, 'load factor');
});
