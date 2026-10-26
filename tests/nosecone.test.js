// Supersonic cone flow (NACA Report 1135 checks) and nose geometry (Crowell shapes, tip rounding).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maxCone, coneFlow, coneTable, machAngle, stagT } from '../site/js/calc/conical.js';
import { shapeRadius, noseProfile, measure, SHAPES } from '../site/js/calc/noseCone.js';

const D = Math.PI / 180, g = 1.405;   // NACA 1135 charts are for γ = 1.405
const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`);

test('NACA 1135 figure 4: largest cone with an attached shock', () => {
  near(maxCone(1.05, g).cone / D, 10, 0.5, 'M 1.05');
  near(maxCone(1.2, g).cone / D, 20, 0.7, 'M 1.2');
  near(maxCone(1.5, g).cone / D, 30.5, 0.7, 'M 1.5');
  near(maxCone(30, g).cone / D, 57.5, 0.4, 'M → ∞');
});

test('NACA 1135 charts 5 and 6: shock angle and surface pressure of cones; Mach angle; stagnation temperature', () => {
  near(coneFlow(2, 32 * D, g).cp, 0.73, 0.015, 'Cp, M 2, 32°');
  near(coneFlow(3, 32 * D, g).cp, 0.65, 0.015, 'Cp, M 3, 32°');
  near(coneFlow(1.6, 32 * D, g).cp, 0.875, 0.02, 'Cp, M 1.6, 32°');
  near(coneFlow(2, 0, g).beta / D, 30, 1e-9, 'zero cone: Mach angle');
  near(machAngle(2) / D, 30, 1e-12, 'Mach angle');
  assert.equal(coneFlow(1.5, 35 * D, g).attached, false, 'detached beyond the limit');
  // the swept table agrees with the exact solution
  const t = coneTable(2, g), f = coneFlow(2, 20 * D, g);
  const i = t.rows.findIndex((r) => r[0] > 20), a = t.rows[i - 1], b = t.rows[i], cp = a[2] + ((b[2] - a[2]) * (20 - a[0])) / (b[0] - a[0]);
  near(cp, f.cp, 0.003, 'table vs exact');
  near(stagT(2), 1.8, 1e-12, 'T0/T at Mach 2');
});

test('Crowell shapes run tip to base; secant and bi-conic limits; rounding keeps the profile smooth and shorter', () => {
  for (const { value } of SHAPES.filter((q) => q.value !== 'custom')) {
    near(shapeRadius(value, 0, 30, 3, { sRho: 1.5 }), 0, 1e-9, `${value} tip`);
    near(shapeRadius(value, 30, 30, 3, { sRho: 1.5 }), 3, 1e-6, `${value} base`);
  }
  near(shapeRadius('secant', 15, 30, 3, { sRho: 1 }), shapeRadius('ogive', 15, 30, 3), 1e-9, 'secant at ρ_t is the tangent ogive');
  near(shapeRadius('biconic', 12, 30, 3, { bL: 0.4, bR: 0.6 }), 1.8, 1e-12, 'bi-conic joint');
  const sharp = noseProfile('ogive', 30, 3, {}, 0), round = noseProfile('ogive', 30, 3, {}, 0.3);
  assert.ok(round.L < sharp.L && round.cap, 'rounded nose is shorter');
  near(round.pts[0].r, 0, 1e-9, 'cap starts on the axis');
  assert.ok(round.pts.every((q, i) => i === 0 || q.x >= round.pts[i - 1].x - 1e-12), 'stations increase');
  // already-blunt tips are left alone
  assert.equal(noseProfile('ellipse', 30, 3, {}, 0.01).cap, null);
  // cone volume and wetted area
  const m = measure(noseProfile('cone', 30, 3, {}, 0).pts);
  near(m.V, (Math.PI * 9 * 30) / 3, 1e-6, 'cone volume'); near(m.S, Math.PI * 3 * Math.hypot(3, 30), 1e-6, 'cone wetted area');
});
