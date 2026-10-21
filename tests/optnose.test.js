// Optimum nose: superellipse limits, Felkel's Table 1 (36 in noses, L/D 3–6) and the optimum exponent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { close } from './_workbook.js';
import { superellipse, noseCp, optimumExponent } from '../site/js/calc/optnose.js';
import { noseRadius } from '../site/js/calc/noseShapes.js';

// Felkel Table 1: R (in), Cp_min cone, ogive, optimum; M_cr cone, ogive, optimum
const T1 = [[6, -0.11706, -0.08616, -0.06278, 0.873, 0.895, 0.915], [4.5, -0.09246, -0.06092, -0.04061, 0.891, 0.917, 0.937], [3, -0.06454, -0.03566, -0.02656, 0.914, 0.943, 0.953]];

test('Superellipse: n = 1 is the cone, n = 2 the ellipse', () => {
  for (const z of [0, 3, 10, 27, 36]) {
    close(superellipse(z, 36, 3, 1), noseRadius('cone', z, 36, 3), 1e-12, `cone ${z}`, 1e-9);
    close(superellipse(z, 36, 3, 2), noseRadius('ellipse', z, 36, 3), 1e-12, `ellipse ${z}`, 1e-9);
  }
});

test('Cone and ogive reproduce Felkel’s minimum Cp (within 5 %) and critical Mach (within 0.006)', () => {
  for (const [R, cpC, cpO, , mC, mO] of T1) {
    const c = noseCp((z) => noseRadius('cone', z, 36, R), 36, R), o = noseCp((z) => noseRadius('ogive', z, 36, R), 36, R);
    close(c.cp0Min, cpC, 0.05, `cone R ${R}`); close(o.cp0Min, cpO, 0.03, `ogive R ${R}`);
    assert.ok(Math.abs(c.Mcr - mC) < 0.006 && Math.abs(o.Mcr - mO) < 0.006, `M_cr R ${R}: ${c.Mcr} ${o.Mcr}`);
  }
});

test('Optimum superellipse beats the ogive at every fineness and matches Felkel’s optimum at L/D = 6', () => {
  for (const [R, , cpO, cpOpt] of T1) {
    const n = optimumExponent(36, R), s = noseCp((z) => superellipse(z, 36, R, n), 36, R);
    assert.ok(n > 1.5 && n < 2.2, `n* ${n}`);
    assert.ok(s.cp0Min > cpO, `beats ogive at R ${R}`);
    if (R === 3) close(s.cp0Min, cpOpt, 0.02, 'L/D 6 optimum');
    // its neighbours are no better
    for (const dn of [-0.1, 0.1]) assert.ok(noseCp((z) => superellipse(z, 36, R, n + dn), 36, R).cp0Min <= s.cp0Min + 1e-9);
  }
});
