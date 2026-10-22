// Flight path angle dispersions: the memo's Fig. 3, the DISPERSION field tool (and its two slips), and limits.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close } from './_workbook.js';
import { dispersion } from '../site/js/calc/dispersion.js';

const W = workbook('DISPERSION', 'Sheet1');
// the field tool takes the boost acceleration as thrust / mass
const P = { rho: W('C5'), S: W('D5'), CLa: W('E5'), T: W('F5'), I: W('G5'), arm: W('H5'), dT: W('I5'), Om: W('J5'), m: W('K5'), g: W('B5'),
  sG: W('L5'), lG: W('M5'), rollWave: W('P5'), lP: W('R5'), L: W('V5'), a: W('F5') / W('K5') };

test('Memo Fig. 3 (g/2a = 0.1, L_A/mg = 0.2, L = 40 ft): dispersive flight path angle against burnout altitude / roll wavelength', () => {
  const g = 32.174, lP = 0.03, rollWave = 1000, lR = (2 * Math.PI) / rollWave;
  const p = { rho: 1, S: 1, CLa: 1, T: 1, I: 0.5, arm: 0, dT: 0, Om: 0.2 * g * (lP * lP - lR * lR), m: 1, g, a: g / 0.2, sG: 0, lG: 1e-3, rollWave, lP, L: 40 };
  close(dispersion({ ...p, hb: 400 }).LA, 0.2 * g, 1e-12, 'L_A/mg');
  // read from the figure: peak 0.042 near 0.4, dip 0.029 near 0.93, 0.0315 at 2
  for (const [x, y] of [[0.4, 0.042], [0.93, 0.029], [2, 0.0315]]) close(dispersion({ ...p, hb: x * rollWave }).gD, y, 0.02, `x = ${x}`);
  // Fig. 1: without roll, γ_T mg/L_A = (h/L)^(g/2a) − 1 = 0.82 at h/L = 400
  const q = dispersion({ ...p, rollWave: 1e12, hb: 16000 });
  close(q.gD / (q.LA / g), 400 ** 0.1 - 1, 1e-9, 'Fig. 1');
});

test('DISPERSION: lift, burnout γ_T and the gust term; the tool’s two slips reproduce its λ_P table', () => {
  const o = dispersion({ ...P, hb: W('Y496') }), lR = o.lR, lP = P.lP, lG = P.lG;
  close(o.LA, W('S5'), 1e-12, 'L_A'); close(o.gT, W('AD496'), 1e-12, 'γ_T');
  // the tool's gust K has λ_R² where eq. 15 has λ_G*²
  close(o.K * Math.sqrt((lP ** 2 + lG ** 2) / (lP ** 2 + lR ** 2)), W('W5'), 1e-12, 'K with λ_R');
  close(o.gG * W('W5') / o.K, W('AL496'), 1e-12, 'γ_G');
  // its Euler step is (L_A/mg)(L_A/2ma) Z Δh/h: L_A/m times eq. 3's slope; its own γ_T column shows the slip
  const f = o.LA / P.m;
  close(W('AG496') / f, o.E, 0.015, 'E'); close(W('AI496') / f, o.N, 0.02, 'N');
  // with both slips the λ_P study at 1850 ft burnout (AQ, AR) comes back
  const sheet = (lP) => {
    const q = dispersion({ ...P, lP, hb: 1850 }), gG = (q.gG * Math.sqrt((lP ** 2 + lG ** 2) / (lP ** 2 + q.lR ** 2)));
    return Math.hypot(q.gD * q.LA / P.m, gG) / (1850 / P.L) ** q.n;
  };
  for (const r of [5, 8, 11, 14]) close(sheet(W(`AQ${r}`)), W(`AR${r}`), 0.005, `AR${r}`);
});

test('Limits: no roll gives the planar γ_T; equivalent launcher angle maps back through eq. 10', () => {
  const o = dispersion({ ...P, rollWave: 1e15, hb: 2000 });
  close(o.gD, o.gT, 1e-9, 'no roll'); close(o.N, 0, 1e-9, 'no north', o.gT);
  const q = dispersion({ ...P, hb: 2000 });
  close(q.g0 * (2000 / P.L) ** q.n, Math.hypot(q.gD, q.gG), 1e-12, 'eq. 10');
  assert.ok(q.hist.length > 200 && q.hist.length < 410 && q.hist[0].gam === 0);
  close(q.hist.at(-1).h, 2000, 1e-12, 'last row at burnout');
  // the spun-up thrust turn is smaller than the unspun one
  assert.ok(q.gD < q.gT);
});
