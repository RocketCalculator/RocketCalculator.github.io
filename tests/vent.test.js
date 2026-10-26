// Payload venting: the field tool's cavity-pressure history (RK4, 0.01 s, its trajectory and atmosphere), the
// tool's peak differential pressure, the choking limit and the orifice interpolation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close } from './_workbook.js';
import { vent, machThroat, orifice, cpVent } from '../site/js/calc/vent.js';

const W = workbook('BLOWDOWN2', 'Blowdown');
const traj = []; for (let row = 13; row <= 1365; row++) traj.push([W(`E${row}`), W(`F${row}`), W(`G${row}`)]);
// the tool's troposphere (its own constants)
const [pSL, ho, T0, go, alfa, Rair] = [W('E5'), W('F5'), W('G5'), W('K5'), W('E9'), W('F9')];
const atm = (h) => ({ p: pSL * (1 / (1 + (alfa * h) / (T0 - alfa * ho))) ** (go / (Rair * alfa)), T: T0 + alfa * (h - ho) });
const table = [14, 15, 16, 17, 18, 19].map((r) => [W(`L${r}`), W(`M${r}`)]);
const run = (over = {}) => vent({ traj, atm, Vol: W('H9'), A: W('I9'), Cinc: W('J9'), Csonic: W('K9'), Cp0: W('L9'), Mcr: W('N9'), cpTable: table, dt: W('G9'), ...over });

test('Cavity pressure follows the field tool step by step', () => {
  const o = run();
  close(o.K, W('O5'), 1e-12, 'O5 constant');
  for (const row of [6, 100, 300, 600, 700, 1000, 1300]) {
    const hrow = o.hist[row - 5];
    close(hrow.t, W(`Q${row}`), 1e-9, `Q${row}`, 1);
    close(hrow.pC, W(`R${row}`), 1e-9, `R${row} cavity`);
    close(hrow.pX, W(`Y${row}`), 1e-9, `Y${row} vent exit`);
  }
});

test('Peak differential pressure matches the field tool’s own history (0.1437 psi at 5.14 s)', () => {
  // the memo’s plot (0.664 psi) is for another case (vent area 0.0144 in²); the stored tool gives this one
  const { worst } = run();
  close(worst.dp / 144, 0.14374507262687863, 1e-9, 'max Δp');
  close(worst.t, 5.14, 1e-6, 'time of max', 1);
});

test('Choking, orifice coefficient and vent Cp', () => {
  assert.equal(machThroat(1, 1.9), 1);                                 // beyond the sonic ratio 1.893
  close(machThroat(1, 1.8929), 0.99997, 1e-3, 'just subsonic');
  close(orifice(0, 0.95, 0.65), 0.65, 1e-12, 'incompressible'); close(orifice(1, 0.95, 0.65), 0.95, 1e-12, 'choked');
  close(cpVent(1.2, W('L9'), W('N9'), table), W('M16'), 1e-12, 'table above M_cr');
  close(cpVent(W('N9'), W('L9'), W('N9'), table), W('M13'), 1e-12, 'Kármán–Tsien at M_cr');
  // a larger vent tracks the outside more closely
  assert.ok(Math.abs(run({ A: 4 * W('I9') }).worst.dp) < Math.abs(run().worst.dp) / 3);
});

test('Taped-door allowable (Espinoza et al.: 0.2 psi on a 50.47 in², 32.25 in door at 0.3 lbf/in) and the solved vent diameter', async () => {
  const def = (await import('../site/js/calculators/payload-venting.js')).default;
  const v0 = {}; for (const g of def.groups) for (const f of g.fields) v0[f.id] = structuredClone(f.default);
  Object.assign(v0, def.examples[0].values);
  const exp = def.compute({ ...v0, doorL: 11.88, doorW: 4.25, peel: 0.3 });
  close(exp.allow / 144, 0.3 * 32.26 / 50.49, 1e-3, 'allowable from the peel model');
  assert.ok(Math.abs(exp.allow / 144 - 0.2) < 0.01, 'about 0.2 psi as measured');
  const r = def.compute(v0);
  assert.equal(r.verdict.level, 'marginal');
  close(Math.abs(def.compute({ ...v0, d: r.results.dNeed }).results.dpMax), r.allow, 2e-3, 'the solved diameter just holds');
});
