// Trajectory simulation: SKYAERO's motor bookkeeping, simulated launcher length and wind table, and analytic limits.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close } from './_workbook.js';
import { simulate, motor, simLauncherLength, interp, WIND_CORR, G0 } from '../site/js/calc/trajectory.js';
import { atmosphere } from '../site/js/calc/geophysics.js';

const W = workbook('SKYAERO7.6.2', 'inputsheet');
const thrust = [];
for (let r = 120; r <= 240; r++) thrust.push([W(`A${r}`), W(`C${r}`)]);
const ST = { Wp: W('B111'), Wd: W('B112') + W('B113'), thrust, seaLevel: true, Ae: W('B244'), S: W('F117'), cd: [[0, 0.69, 0.69], [2, 0.52, 0.52]] };

test('SKYAERO: vacuum impulse and Isp of the M1939, simulated launcher length, wind correction table', () => {
  const m = motor(ST, W('B12'));
  close(m.I, W('B245'), 1e-12, 'total vacuum impulse'); close(m.isp, W('B246'), 1e-12, 'vacuum Isp');
  close(simLauncherLength(W('B75'), W('B70')), W('B78'), 1e-12, 'simulated launcher length');
  // Hoult's Table 1: increment λ(L_sim − L) against λL; the fit tracks it to λL = 1
  for (const [x, inc] of [[0.001, 0.1509], [0.01, 0.1702], [0.1, 0.2038], [0.5, 0.1967], [1, 0.1678], [2, 0.1245]])
    close(0.02 * simLauncherLength(0.02, x / 0.02) - x, inc, 0.015, `λL = ${x}`);
  for (let r = 21; r <= 61; r++) {
    const x = (W(`B${r}`) + W(`B${r + 1}`)) / 2;   // the sheet: VLOOKUP + slope × (x − x_lo)
    close(interp(WIND_CORR, x), W(`C${r}`) + W(`D${r}`) * (x - W(`B${r}`)), 1e-9, `row ${r}`, 1);
  }
});

const vac = (g = 32) => () => ({ p: 0, rho: 0, a: 1e9, g });
const flat = { Wp: 20, Wd: 30, thrust: [[0, 1000], [5, 1000]], seaLevel: false, Ae: 0, S: 0.2, cd: [[0, 0.5, 0.5], [5, 0.5, 0.5]] };
const base = { site: { ho: 0, To: 518.67, lat: 45 }, QE: Math.PI / 2, L: 1e-3, lamP: 0.02, useSimRail: false, wind: [], tau: 1, dt: 0.01 };

test('Vacuum, constant thrust, vertical: rocket equation at burnout and the ballistic apogee', () => {
  const o = simulate({ ...base, stages: [flat], atm: vac() }), m0 = 50 / G0, m1 = 30 / G0, isp = (1000 * 5) / 20;
  const vb = isp * G0 * Math.log(m0 / m1) - 32 * 5, hb = isp * G0 * 5 * (1 - (m1 / (m0 - m1)) * Math.log(m0 / m1)) - 16 * 25;
  close(o.burnouts[0].V, vb, 1e-6, 'burnout speed'); close(o.burnouts[0].z, hb, 1e-6, 'burnout altitude');
  close(o.hApo, hb + vb * vb / 64, 1e-4, 'apogee'); close(o.tApo, 5 + vb / 32, 1e-4, 'apogee time');
  close(o.impact.t, 5 + vb / 32 + Math.sqrt((2 * o.hApo) / 32), 1e-4, 'impact time');
});

test('Two stages in vacuum: the velocity gains add, with the spent stage dropped at burnout', () => {
  const s1 = { ...flat, Wp: 20, Wd: 30 }, s2 = { ...flat, Wp: 10, Wd: 10, thrust: [[0, 500], [4, 500]], delay: 2 };
  const o = simulate({ ...base, stages: [s1, s2], atm: vac() });
  const dv1 = ((1000 * 5) / 20) * G0 * Math.log(70 / 50), dv2 = ((500 * 4) / 10) * G0 * Math.log(20 / 10);
  close(o.burnouts[1].t, 11, 1e-9, 'second burnout time');
  close(o.burnouts[1].V, dv1 + dv2 - 32 * 11, 1e-6, 'speed after both burns');
  assert.equal(o.burnouts.length, 2);
});

test('Atmosphere: drag lowers apogee, main parachute lands at terminal speed; RK4 converges; wind turns the rocket upwind', () => {
  const st = { ...ST, thrust: thrust.filter(([t]) => t <= 7.08) };
  const p = { ...base, site: { ho: 1898, To: 559.67, lat: 34 }, QE: (85 * Math.PI) / 180, L: 12, lamP: (2 * Math.PI) / 350, useSimRail: true, stages: [st], dt: 0.05 };
  const o = simulate(p);
  assert.ok(o.landed && o.hApo > 5000 && o.railExit.V > 50);
  close(o.railExit.t > 0 ? Math.hypot(o.hist.find((r) => r.phase === 'free').x, o.hist.find((r) => r.phase === 'free').z) : 0, o.railL, 0.01, 'rail exit at the simulated length');
  close(simulate({ ...p, dt: 0.0125 }).hApo, o.hApo, 1e-4, 'dt convergence');
  const chute = simulate({ ...p, main: { CdS: 0.89 * Math.PI * 25, h: 1500 } }), rho = atmosphere({ h: 1898, ho: 1898, To: 559.67, phi: 34 }).rho;
  const last = chute.hist[chute.hist.length - 1], gr = Math.sqrt((2 * (last.W)) / (0.89 * Math.PI * 25 * rho));
  close(chute.impact.V, gr, 0.03, 'terminal speed under the main');
  // +wind blows away from the launcher: Lewis weathercocking into it shortens the range
  assert.ok(simulate({ ...p, wind: [[0, 20], [5000, 20]] }).impact.x < o.impact.x);
});
