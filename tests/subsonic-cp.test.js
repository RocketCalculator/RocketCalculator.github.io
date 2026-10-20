import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close, stats } from './_workbook.js';
import { subsonicCP, carryoverCP, interference } from '../site/js/calc/barrowmanSub.js';

const W = workbook('SUBSONIC BARROWMAN EQUATIONS2.4');
// The workbook skips profile row 13 (x = 17.5 in): its K–O formulas are absent, so segment 6→8 is one frustum.
const rows = [6, 7, 8, 9, 10, 11, 12, 14, 15, 16];
const profile = rows.map((r) => ({ x: W(`H${r}`), r: W(`I${r}`) }));
const inp = {
  M: W('C6'), profile, flatNose: W('J6'),
  fins: { N: W('C26'), xLE: W('E26'), xTipLE: W('D26'), cR: W('F26'), cT: W('G26'), b: W('H26'), tanBT: W('I26') },
};

test('SUBSONIC BARROWMAN EQUATIONS2.4.xls — body of revolution', () => {
  const o = subsonicCP(inp);
  close(o.Sref, W('E6'), 1e-12, 'Sref E6');
  close(o.d, W('F6'), 1e-12, 'd F6');
  close(o.beta, W('C9'), 1e-12, 'beta C9');
  close(o.body.thetaT, W('I19'), 1e-12, 'theta_T I19');
  close(o.body.Rh, W('I21'), 1e-12, 'R hemis I21');
  close(o.body.cap.xcp, W('N6'), 1e-12, 'cap CP N6');
  close(o.body.Cma_flat, W('P6'), 1e-12, 'flat face Cma P6');
  rows.slice(1).forEach((r, i) => {
    const sg = o.body.segs[i];
    close(sg.CNa, W(`L${r}`), 1e-12, `segment CNa L${r}`, 1e-15);
    close(sg.vol, W(`M${r}`), 1e-12, `segment volume M${r}`);
    if (W(`N${r}`) !== 0) close(sg.xcp, W(`N${r}`), 1e-12, `segment CP N${r}`); else assert.equal(sg.xcp, 0);
  });
  close(o.body.CNa, W('L17'), 1e-12, 'body CNa L17');
  close(o.body.mom, W('O17'), 1e-12, 'body moment O17');
});

test('SUBSONIC BARROWMAN EQUATIONS2.4.xls — fins and interference', () => {
  const f = subsonicCP(inp).fin;
  const cells = { K26: f.S, L26: f.Lq, M26: f.AR, N26: f.sweepC4, O26: f.F, Q26: f.r, R26: f.s, S26: f.CNaW, T26: f.mac, U26: f.CNaFins,
    V26: f.xcpFin, W26: f.KWB, X26: f.CNaWB, Y26: f.KBW, Z26: f.xcpBW, AA26: f.CNa, AB26: f.mom, AC26: f.xcp, AR26: f.kWB, AS26: f.kBW, AT26: f.CNd };
  for (const [ref, v] of Object.entries(cells)) close(v, W(ref), 1e-12, ref);
});

test('SUBSONIC BARROWMAN EQUATIONS2.4.xls — vehicle totals (single fin set, B26 = 1)', () => {
  const o = subsonicCP(inp);
  close(o.CNa, W('Q6'), 1e-12, 'CNa Q6');
  close(o.Cma, W('R6'), 1e-12, 'Cma R6');
  close(o.xcp, W('S6'), 1e-12, 'Xcp S6');
});

test('Interference factors: NACA 1307 slender-body limits and K_W(B) + K_B(W) = (1 + r/s)²', () => {
  const k = interference(1e-6, 1);           // no body: K_W(B) → 1, K_B(W) → 0
  close(k.KWB, 1, 1e-4, 'KW(B) → 1 as r/s → 0');
  close(k.KBW + 1, 1, 1e-4, 'KB(W) → 0 as r/s → 0');
  for (const t of [0.1, 0.25, 0.34, 0.5, 0.75, 0.9]) {
    const q = interference(t, 1);
    close(q.KWB + q.KBW, (1 + t) ** 2, 1e-9, `sum identity at r/s = ${t}`);
  }
});

test('Carry-over CP is continuous through s = 2r (analytic continuation of the workbook formula)', () => {
  const base = { xLE: 80, cR: 10, r: 2, sweepC4: 0.6 };
  const lo = carryoverCP({ ...base, s: 4 - 1e-6 }), mid = carryoverCP({ ...base, s: 4 }), hi = carryoverCP({ ...base, s: 4 + 1e-6 });
  close(lo, mid, 1e-6, 'left limit'); close(hi, mid, 1e-6, 'right limit');
  assert.ok(Number.isFinite(carryoverCP({ ...base, s: 3 })), 'short fins give a finite CP');
});

after(() => console.log(`subsonic CP: ${stats.compared} values compared, max rel err ${stats.maxRel.toExponential(2)}`));
