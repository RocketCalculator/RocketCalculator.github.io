// Tethered pibal: the memo's worked example (eq. 1 and the 0.89495 bias factor) and the field tool's cells with its
// own weights and density.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { close } from './_workbook.js';
import { windSpeed, bias, gasWeight, pibal, G } from '../site/js/calc/pibal.js';

test('Memo example: 3 ft balloon on 600 ft of tether at 56.44° — V = 10.708 ft/s, correction 0.89495', () => {
  const theta = Math.asin(500 / 600) / (Math.PI / 180), rho = 0.002378, S = 7.07, B = 1.082, W = 0.37;
  close(theta, 56.44, 1e-4, 'Θ');
  const V = windSpeed(B, W, theta, rho, 0.49, S);
  close(V, 10.7079, 1e-3, 'V');
  const b = bias({ B, W, WT: 0.024, theta, rho, Cd: 1.92, r: 0.0055 / 12, d: 600, V });
  close(b.b, 0.01685, 1e-3, 'tether weight');
  // the memo's number (0.08820, total 0.89495) puts V sinΘ for V into eq. (5), which already carries sin²Θ;
  // the formula itself (and the field tool) gives 0.08820 / sin²Θ
  const s2 = Math.sin(theta * Math.PI / 180) ** 2;
  close(b.c * s2, 0.08820, 2e-3, 'tether drag (memo with V sinΘ)');
  close(1 - b.b - b.c * s2, 0.89495, 3e-4, 'memo total');
  // helium for that balloon at sea level is 0.15 lb
  close(gasWeight(14.137, 101325, 288.15), 0.15, 0.02, 'W_He');
});

test('Field tool: wind speed, bias terms and corrected speed with its weights and density', () => {
  // the .xlsx is not in the Excel-cached set; its parsed copy keeps the cached cell values
  const cells = JSON.parse(readFileSync(new URL('../data/spreadsheets/WIND CALCULATOR.json', import.meta.url), 'utf8')).Sheet1.cells, W = (k) => cells[k].v;
  for (const [c, th] of [['C', 'C6'], ['G', 'G6']]) {
    const B = W(`${c}29`), Wt = W(`${c}30`), rho = W(`${c}31`), theta = W(th), V = W(`${c}35`);
    close(B, rho * W('C19') * W('C16'), 1e-12, `${c}29 buoyancy`);
    close(windSpeed(B, Wt, theta, rho, W('C24'), W('C20')), V, 1e-12, `${c}35`);
    const bs = bias({ B, W: Wt, WT: W(`${c}32`), theta, rho, Cd: W('C39'), r: W('C25') / 24, d: W(`${c}28`), V });
    close(bs.b, W(`${c}41`), 1e-12, `${c}41`); close(bs.c, W(`${c}42`), 1e-12, `${c}42`);
    close(V * Math.sqrt(bs.factor), W(`${c}45`), 1e-12, `${c}45`);
    close(W(`${c}28`) * Math.sin(theta * Math.PI / 180), W(`${c}33`), 1e-12, `${c}33 height`);
  }
});

test('Full evaluation: components, sinking balloon, and a stronger wind at a lower angle', () => {
  const base = { D: 3, We: 0.223, CD: 0.47, gas: 'helium', pG: 87000, TG: 291, dt: 0.011 / 12, rhoT: 1.87695, Cd: 1.92, L: 158, theta: 50, az: 40, rho: 0.0021 };
  const o = pibal(base);
  close(Math.hypot(o.north, o.east), o.Vc, 1e-12, 'components');
  close(o.WT, 158 * Math.PI * (0.011 / 24) ** 2 * 1.87695 * G, 1e-12, 'tether weight');
  assert.ok(pibal({ ...base, theta: 30 }).Vc > o.Vc);
  assert.ok(pibal({ ...base, D: 0.5 }).sinks);
});
