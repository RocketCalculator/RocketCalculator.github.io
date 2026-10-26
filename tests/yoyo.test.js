// Yo-yo despinner: the worksheet example (YO-YO DSP.xls), the exact radial-release solution and a full simulation.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close, stats } from './_workbook.js';
import { yoyo, radialMass, radialMassApprox, radialSpinRatio, simulate, phase1Tension, phase2TensionFedor } from '../site/js/calc/yoyo.js';

const W = workbook('YO-YO DSP');
const inp = { I: W('J5'), a: W('L5'), l: W('N5'), w0: W('F5'), wf: W('H5'), mu: W('P5') };

test('Fedor closed forms reproduce the worksheet', () => {
  const r = W('I5');
  close(radialMassApprox(inp.I, inp.a, inp.l, r), W('Q5'), 1e-12, 'Q5 total despin mass');
  const m = W('Q5'), c = 1 + inp.I / (m * inp.a ** 2);
  close(Math.sqrt(inp.I / m + inp.a ** 2), W('T5'), 1e-12, 'T5 λ');
  close(phase1Tension(m, inp.a, inp.w0, c, Math.sqrt(c / 3)), W('U5'), 1e-12, 'U5 peak phase-1 tension');
  close(phase2TensionFedor(W('R5'), inp.a, inp.l, inp.w0, r), W('W5'), 1e-12, 'W5 phase-2 tension');
  close(W('Q5') - (2 * inp.mu * inp.l) / 3, W('R5'), 1e-12, 'R5 weights mass');
});

test('Exact radial-release mass: conserves momentum and energy, within 0.1 % of Fedor for the example', () => {
  const r = W('I5'), m = radialMass(inp.I, inp.a, inp.l, r);
  assert.ok(Math.abs(m / W('Q5') - 1) < 1e-3, `${m} vs ${W('Q5')}`);
  close(radialSpinRatio(inp.I, inp.a, inp.l, m), r, 1e-10, 'inverse');
  // conservation at release: tangential mass speed u from momentum, then energy balances
  const R = inp.a + inp.l, J = inp.I + m * inp.a ** 2, w0 = inp.w0, wf = r * w0;
  const u = (J * w0 - inp.I * wf) / (m * R);
  close(inp.I * wf * wf + m * u * u, J * w0 * w0, 1e-10, 'energy');
  close(radialMassApprox(inp.I, inp.a, inp.l, 0), radialMass(inp.I, inp.a, inp.l, 0), 1e-12, 'identical for complete despin');
});

test('Simulation of both phases ends at the exact spin and conserves angular momentum and energy', () => {
  const r = W('I5'), m = radialMass(inp.I, inp.a, inp.l, r);
  const sim = simulate({ I: inp.I, a: inp.a, l: inp.l, w0: inp.w0, m, n: 2000 });
  close(sim.wRelease / inp.w0, r, 1e-6, 'final spin ratio from integration');
  // phase-1 time = unwound angle / initial spin
  close(sim.t1, inp.l / inp.a / inp.w0, 1e-12, 'phase-1 duration');
});

test('Peak tensions: phase 1 exact at φ² = c/3; phase 2 peaks at release (exact closed form)', () => {
  const o = yoyo(inp);
  const m = o.m, c = o.c, phis = Array.from({ length: 2001 }, (_, i) => (i / 2000) * inp.l / inp.a);
  const peak = Math.max(...phis.map((p) => phase1Tension(m, inp.a, inp.w0, c, p)));
  close(o.T1, peak, 1e-5, 'phase-1 peak');
  const sim = simulate({ I: inp.I, a: inp.a, l: inp.l, w0: inp.w0, m, n: 4000 });
  close(sim.T2max, o.T2release, 1e-4, 'phase-2 peak is the exact release tension');
  close(sim.samples.find((x) => x.phase === 2).T, phase1Tension(m, inp.a, inp.w0, c, inp.l / inp.a), 2e-3, 'tension continuous between phases');
  assert.ok(o.T2Fedor < o.T2, 'the worksheet estimate is lower than the exact value');
});

test('Design trends: more spin removed needs more mass; longer wires need less', () => {
  const m = (wf, l = inp.l) => yoyo({ ...inp, wf, l }).m;
  assert.ok(m(0) > m(inp.wf) && m(inp.wf) > m(0.5 * inp.w0));
  assert.ok(m(inp.wf, 10) > m(inp.wf, 20));
});

// ---------- page: verdict, checking mode and solved fixes ----------
const def = (await import('../site/js/calculators/yo-yo-despin.js')).default;
const base = () => { const v = {}; for (const g of def.groups) for (const f of g.fields) v[f.id] = f.default; return v; };
const page = (patch) => def.compute({ ...base(), ...patch });

test('Sizing and checking are inverse: the sized weights checked give the target spin', () => {
  const a = page({ mode: 'size' });
  const b = page({ mode: 'check', mwEach: a.results.weightEach });
  close(b.results.ffActual, base().ff, 1e-9, 'checked final spin');
  close(a.results.weightEach, W('R5') / 2, 2e-3, 'sized weight vs worksheet R5/2');
});

test('Solved fixes land on their targets', () => {
  const v = { mode: 'check', mwEach: 0.0015, eI: 0, ef: 0 };
  const o = page(v);
  assert.equal(o.spinLv, 'unsafe');
  close(page({ ...v, mwEach: o.results.mNeedEach }).results.ffActual, base().ff, 1e-9, 'weight fix');
  close(page({ ...v, l: o.results.lNeed }).results.ffActual, base().ff, 1e-9, 'wire length fix');
  const w = page({ Tb: 100 });
  assert.equal(w.wireLv, 'unsafe');
  close(page({ Tb: w.results.TbNeed }).results.nWire, base().SF, 1e-12, 'breaking strength fix');
  // uncertainty fix: the inertia tolerance that brings the worst miss to the spin tolerance
  const u = page({ eI: 8, ef: 0 }), m = u.verdict.fixes.join(' ').match(/within <b>±([\d.]+) %/);
  assert.ok(u.spinLv !== 'safe' && m, u.verdict.fixes.join(' '));
  const at = page({ eI: +m[1], ef: 0 });
  assert.ok(Math.abs(Math.max(Math.abs(at.results.ffLo - base().ff), Math.abs(at.results.ffHi - base().ff)) / base().tol - 1) < 0.03, 'spread at the solved tolerance is the tolerance');
});

test('Coupled inputs are never refused: target above the initial spin, wires heavier than the despin mass', () => {
  const a = page({ ff: 9 });
  assert.ok(a.warnings.some((w) => /only slow/.test(w.text)) && a.results.ffActual < base().f0);
  const b = page({ mu: 0.005 });
  assert.equal(b.results.weightEach, 0);
  assert.ok(b.results.ffActual < base().ff && b.verdict.fixes.some((f) => /wire of at most/.test(f)));
});

test('Release tension matches Fedor D-1676 Eq. 20 with the rigid release state of Eq. 18', () => {
  const o = yoyo(inp), R = inp.a + inp.l, wf = o.r * inp.w0, J = inp.I + o.m * inp.a ** 2;
  const v = (J * inp.w0 - inp.I * wf) / (o.m * R), gd = (v - inp.a * wf) / inp.l;   // weight speed a·φ̇ + l·γ̇ at release
  close(o.T2release, (o.m / 2) * (inp.a * wf * wf + inp.l * gd * gd), 1e-12, 'Eq. 20');
});

test('Bush (1967) flown yo-yo: three wraps; the massless-cable model is heavier than the flown 84 g by the cable share', () => {
  const a = 10 / 12, l = 15.71;
  close(l / (2 * Math.PI * a), 3, 1e-3, 'three complete wraps');
  const each = (radialMass(3.83, a, l, 0) / 2) * 14593.9;   // g
  assert.ok(each > 84 && each < 84 * 1.25, `${each} g`);
  // a complete despin is insensitive to the initial spin (Bush p. 5): r does not depend on the initial spin
  const o = page({ mode: 'check', I: 3.83, a: 10, l: 188.52, mu: 0, mwEach: each / 14593.9, ff: 0, eI: 0, ef: 20 });
  assert.ok(Math.abs(o.results.ffLo) < 1e-6 && Math.abs(o.results.ffHi) < 1e-6, `${o.results.ffLo} ${o.results.ffHi}`);
});

after(() => console.log(`# yoyo: ${stats.compared} comparisons, max rel err ${stats.maxRel.toExponential(2)}`));
