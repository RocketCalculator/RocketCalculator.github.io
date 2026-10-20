import { test, after } from 'node:test';
import { workbook, close, stats } from './_workbook.js';
import { ogive, radiusAt, wettedAreaToStation } from '../site/js/calc/ogive.js';

const W = workbook('Ogive Profile');

test('Ogive Profile.xls — scalar results', () => {
  const out = ogive({ R: W('B5'), L: W('C5'), dx: W('E5') });
  close(out.a, W('D5'), 1e-12, 'defining circle radius D5');
  close(out.S, W('J5'), 1e-12, 'wetted area J5');
  close(out.M, W('K5'), 1e-12, 'area moment K5');
  close(out.xbar, W('L5'), 1e-12, 'centroid L5');
});

test('Ogive Profile.xls — profile table rows 5..17', () => {
  const out = ogive({ R: W('B5'), L: W('C5'), dx: W('E5') });
  for (let row = 5; row <= 17; row++) {
    const p = out.profile[row - 5];
    close(p.x, W(`F${row}`), 1e-12, `x F${row}`, 1);
    close(p.y, W(`G${row}`), 1e-12, `y G${row}`);
    close(p.station, W(`H${row}`), 1e-12, `station H${row}`, 1);
    close(p.r, W(`I${row}`), 1e-9, `radius I${row}`, 1);
  }
});

test('Memo check values (379.2477 in², 18.70511 in) and consistency', () => {
  const out = ogive({ R: 3, L: 30, dx: 2.5 });
  close(out.S, 379.2477, 1e-6, 'memo wetted area');
  close(out.xbar, 18.70511, 1e-6, 'memo centroid');
  close(wettedAreaToStation(3, 30, 30), out.S, 1e-12, 'cumulative area at base = total');
  close(radiusAt(3, 30, 0), 3, 1e-12, 'radius at base');
});

after(() => console.log(`ogive: ${stats.compared} values compared, max rel err ${stats.maxRel.toExponential(2)}`));
