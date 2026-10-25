import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close, stats } from './_workbook.js';
import { atmosphere, std1976, geopotential, stdAltitudeOf, sutherland, STD } from '../site/js/calc/geophysics.js';

const W = workbook('GEOPHYSICS');
const inp = { h: W('C5'), ho: W('D5'), To: W('E5'), phi: W('F5') };

for (const compat of [true, false]) {
  test(`GEOPHYSICS.xls row 5 (compat=${compat})`, () => {
    const o = atmosphere(inp, { compat });
    close(o.Phi, W('G5'), 1e-12, 'Phi G5');
    close(o.hT, W('H5'), 1e-12, 'tropopause H5');
    close(o.go, W('I5'), 1e-12, 'surface g I5');
    close(o.RE, W('J5'), 1e-12, 'Earth radius J5');
    close(o.TT, W('K5'), 1e-12, 'tropopause T K5');
    close(o.pT, W('L5'), 1e-12, 'tropopause p L5');
    close(o.T, W('M5'), 1e-12, 'T M5');
    close(o.p, W('N5'), 1e-12, 'p N5');
    close(o.rho, W('O5'), 1e-12, 'rho O5');
    close(o.a, W('P5'), 1e-12, 'a P5');
    close(o.omega, W('Q5'), 1e-12, 'omega Q5');
  });
}

test('Workbook troposphere formula: p = p_SL at the launch site (compat)', () => {
  const o = atmosphere({ h: 4000, ho: 4000, To: 550, phi: 34 }, { compat: true });
  close(o.p, 2116.217, 1e-12, 'p at launch site, compat');
});

test('Memo form reproduces the standard atmosphere for a sea-level standard day (±0.2 %)', () => {
  // US Standard Atmosphere 1976 at 10,000 ft: T = 483.04 °R, p = 1455.6 lb/ft²
  const o = atmosphere({ h: 10000, ho: 0, To: 518.67, phi: 45 }, { compat: false });
  // The memo's lapse rate (−0.00357448 °R/ft) is 0.23 % steeper than the 1976 value (−0.0035662 °R/ft).
  close(o.T, 483.04, 5e-4, 'T at 10 kft');
  close(o.p, 1455.6, 2e-3, 'p at 10 kft');
  // continuity of pressure across the tropopause in the memo form
  const lo = atmosphere({ h: o.hT - 1e-6, ho: 0, To: 518.67, phi: 45 }), hi = atmosphere({ h: o.hT + 1e-6, ho: 0, To: 518.67, phi: 45 });
  close(lo.p, hi.p, 1e-9, 'pressure continuous at tropopause');
});

test('Inverse-square gravity decreases with altitude', () => {
  const o = atmosphere({ ...inp, h: 0 }), o2 = atmosphere({ ...inp, h: 100000 });
  close(o.gh, o.go, 1e-12, 'g(0) = go');
  assert.ok(o2.gh < o.go);
});

test('US Standard Atmosphere 1976: table I rows (read from the NASA scan), sea-level values, inverses', () => {
  const at = (H) => std1976((STD.r0 * H) / (STD.r0 - H));          // table I is listed by geopotential altitude
  // H (m'): T (K), P (Pa), rho (kg/m³) as printed (5 significant figures)
  for (const [H, T, P, rho] of [[1500, 278.400, 84555, 1.0581], [11000, 216.650, 22632, 0.36392], [28000, 224.650, 1586.2, 0.024599]]) {
    const s = at(H);
    close(s.T, T, 2e-6, `T at ${H}`); close(s.P, P, 6e-5, `P at ${H}`); close(s.rho, rho, 6e-5, `rho at ${H}`);
  }
  const s0 = std1976(0);
  close(s0.rho, 1.2250, 1e-4, 'rho0'); close(s0.a, 340.294, 1e-5, 'a0'); close(sutherland(288.15), 1.7894e-5, 1e-4, 'mu0 (S = 110.4 K)');
  close(geopotential(11019), 11000, 1e-4, 'Z 11019 m -> H 11000 m (table I)');
  close(stdAltitudeOf('rho', std1976(12345).rho), 12345, 1e-9, 'density altitude inverts'); assert.equal(stdAltitudeOf('rho', 10), null);
});

test('Calculator: standard day reproduces itself; flight condition is consistent', async () => {
  const def = (await import('../site/js/calculators/geophysics.js')).default;
  const base = Object.fromEntries(def.groups.flatMap((g) => g.fields).map((f) => [f.id, f.default]));
  // sea-level standard day: density altitude ≈ altitude (the memo lapse rate is 0.23 % steeper than 1976's)
  const r = def.compute({ ...base, ho: 0, To: 518.67, phi: 45, h: 10000 }, {}).results;
  assert.ok(Math.abs(r.hRho - 10000) < 60, `density altitude ${r.hRho}`);
  close(r.M * r.a, base.V, 1e-12, 'M a = V'); close(r.q, 0.5 * r.rho * base.V ** 2, 1e-12, 'q');
  close(r.Re, r.ReL * base.Lref * 0.0254, 1e-12, 'Re = Re/L × L');
});

after(() => console.log(`geophysics: ${stats.compared} values compared, max rel err ${stats.maxRel.toExponential(2)}`));
