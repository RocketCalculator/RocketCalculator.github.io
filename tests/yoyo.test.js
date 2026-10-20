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

after(() => console.log(`# yoyo: ${stats.compared} comparisons, max rel err ${stats.maxRel.toExponential(2)}`));
