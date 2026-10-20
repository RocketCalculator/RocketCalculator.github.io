// Generated nose profiles: geometry checks and slender-body consequences.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { close, stats } from './_workbook.js';
import { noseRadius, bodyProfile, NOSE_TYPES } from '../site/js/calc/noseShapes.js';
import { bodySlender } from '../site/js/calc/barrowmanSub.js';

const L = 30, R = 3;
test('Every shape is pointed at the tip and meets the body radius at the base', () => {
  for (const { value } of NOSE_TYPES.filter((t) => t.value !== 'custom')) {
    close(noseRadius(value, 0, L, R, { k: 0.75, n: 0.5 }) + 1, 1, 1e-9, `${value} tip`);
    close(noseRadius(value, L, L, R, { k: 0.75, n: 0.5 }), R, 1e-9, `${value} base`);
  }
});
test('Tangent ogive matches the closed form of the Ogive calculator', () => {
  const a = (L * L + R * R) / (2 * R);
  close(noseRadius('ogive', 10, L, R), R - a + Math.sqrt(a * a - (L - 10) ** 2), 1e-12, 'ogive r(10)');
});
test('Slender body: any pointed nose gives C_Nα = 2; a cone has its CP at 2L/3', () => {
  for (const { value } of NOSE_TYPES.filter((t) => t.value !== 'custom')) {
    const prof = bodyProfile({ noseType: value, noseL: L, R, bodyLen: 100, k: 0.75, n: 0.5 });
    const b = bodySlender(prof, { Sref: Math.PI * R * R, flatNose: false, M: 0, d: 2 * R });
    // station-0 radius is 0, so the half-area convention at station 0 has no effect
    close(b.CNa, 2, 1e-9, `${value} CNa`);
    if (value === 'cone') close(b.mom / b.CNa, (2 * L) / 3, 1e-9, 'cone CP');
  }
  const og = bodyProfile({ noseType: 'ogive', noseL: L, R, bodyLen: 100 });
  const b = bodySlender(og, { Sref: Math.PI * R * R, flatNose: false, M: 0, d: 2 * R });
  assert.ok(Math.abs(b.mom / b.CNa / L - 0.466) < 0.005, `ogive CP ${b.mom / b.CNa / L} L ≈ 0.466 L (Barrowman)`);
});
test('Boat-tail adds a negative normal force', () => {
  const p = bodyProfile({ noseType: 'ogive', noseL: L, R, bodyLen: 100, btLen: 10, btR: 2 });
  const b = bodySlender(p, { Sref: Math.PI * R * R, flatNose: false, M: 0, d: 2 * R });
  close(b.CNa, 2 * (4 / 9), 1e-9, 'CNa = 2 A_base/S_ref');
});
after(() => console.log(`nose shapes: ${stats.compared} values compared`));
