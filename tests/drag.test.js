import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close, stats } from './_workbook.js';
import { drag, cpt } from '../site/js/calc/drag.js';

const W = workbook('DRAG_COEFFICIENT3.4');
const inp = {
  T: W('C4'), p: W('D4'), M: W('P4'), ReTbody: W('F4'), trip: W('R4'),
  ogive: W('G21'), noseLength: W('H22'), bodyRadius: W('I22'), bodyLength: W('H23'),
  N: W('F8'), t: W('E8'), cR: W('H8'), cT: W('I8'), b: W('J8'), ReTfin: W('P8'), wedge: W('X8'), bluntLE: W('AA8'), bluntTE: W('AB8'),
  lugArea: W('K16'), nLugs: 2, nozzleD: W('O16'), flatNose: W('Q21'), flatD: W('O21'),
  noseWave: W('AH4'), finWave: W('AH8'), parasite: W('B32'), Nfins2: W('F12'),
};

test('DRAG_COEFFICIENT3.4.xls — every computed cell (spreadsheet mode)', () => {
  const o = drag(inp, { compat: true });
  const cells = {
    E4: o.E, I4: inp.bodyLength / 12, J4: o.Swet, K4: o.Swet / 144, L4: o.d, O4: o.Sref, Q4: o.xNat, S4: o.xTr, T4: o.Slam, U4: o.CfBody, W4: o.CDfBody,
    J22: o.Snose, J23: o.Swet, K8: o.finWet, N8: o.cAvg, O8: o.ReC, Q8: o.xFin, U8: o.CfFin, V8: o.CDfFin, W8: o.CDf,
    AD8: o.CDbFin, AE8: o.sweep, AF8: o.CptLE, AG8: o.CDle, AI8: o.CDpress + o.CDflat * 0 /* AI8 already includes R21 */,
    J16: o.Cpt0, L16: o.CDlug, P16: o.Sex, Q16: o.CPBsub, R16: o.CPBtr, U16: o.Mlim, V16: o.CDbOff, AD16: o.CDbOff + o.CDbFin,
    V20: o.CDbOn, AD20: o.CDbOn + o.CDbFin, P21: o.CDflat, R21: o.CDflat, AK4: o.CDon, AK8: o.CDoff, AK16: o.CDpowerDiff,
  };
  for (const [ref, v] of Object.entries(cells)) close(v, W(ref), 1e-12, ref, 1e-15);
});

test('VBA CPT reproduces the cached stagnation-pressure coefficients', () => {
  close(cpt(1.4, W('P4')), W('J16'), 1e-14, 'CPT(M)');
  close(cpt(1.4, 1), 1.2756, 1e-4, 'memo Fig. 9 at M = 1 ≈ 1.276');
  close(cpt(1.4, 4), 1.8, 0.01, 'memo Fig. 9 approaches ≈ 1.8');
});

test('Memo mode: each documented difference behaves as described', () => {
  const c = drag(inp, { compat: true }), m = drag(inp, { compat: false });
  // flat-face nose drag counted once
  close(m.CDoff, m.CDf + m.CDbOff + m.CDbFin + m.CDpress + m.CDlugs, 1e-12, 'memo total: flat face counted once');
  close(c.CDoff, c.CDf + c.CDbOff + c.CDbFin + c.CDpress + c.CDlugs + c.CDflat, 1e-12, 'workbook total: flat face twice');
  // subsonic flat-face formula: memo eq. (22) is continuous with the supersonic CPT at M = 1
  const sub = drag({ ...inp, M: 0.999999 }), sup = drag({ ...inp, M: 1.000001 });
  close(sub.CDflat, sup.CDflat, 1e-3, 'flat face continuous at M=1 within 0.05 % (0.85·1.5 = 1.275 vs CPT(1) = 1.2756)');
  // fin laminar term weighted by laminar fraction → lower fin friction
  assert.ok(m.CfFin < c.CfFin);
  close(m.CfFin, c.CfFin - (1 - m.xFin / m.cAvg) * 1.328 / Math.sqrt(inp.ReTfin), 1e-12, 'fin laminar weighting');
  // power-on base drag has the factor 1.5 of eq. (14)
  close(m.CDbOn, 1.5 * c.CDbOn, 1e-12, 'power-on factor 1.5');
  // memo eq. (14) example: 1.5(1 − 4²/6²) = 0.833
  close(1.5 * (1 - 16 / 36), 0.8333, 1e-4, 'memo example ratio');
});

after(() => console.log(`drag: ${stats.compared} values compared, max rel err ${stats.maxRel.toExponential(2)}`));
