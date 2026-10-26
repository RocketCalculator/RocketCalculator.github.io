// Modified Newtonian aerodynamics: checked against NEWTON.xls cached values, the memo's closed forms and direct
// numerical integration of the Newtonian pressure over each surface.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close, stats } from './_workbook.js';
import { cpStagnation, noseCap, coneSegment, flatFace, leadingEdge, fairing, sphereCone, noseSurface } from '../site/js/calc/newtonian.js';
import calc from '../site/js/calculators/newtonian-drag.js';

const W = workbook('NEWTON');
const d2r = Math.PI / 180;
const rows = Array.from({ length: 31 }, (_, i) => 5 + i).filter((r) => W.cells[`D${r}`] != null);

test('Stagnation pressure coefficient matches the workbook column (Rayleigh pitot)', () => {
  for (const r of rows) close(cpStagnation(W(`D${r}`)), W(`E${r}`), 1e-12, `E${r}`);
  close(cpStagnation(1), 1.2756130839112, 1e-12, 'M = 1');
  close(cpStagnation(1 - 1e-12), cpStagnation(1 + 1e-12), 1e-9, 'continuous at M = 1 (isentropic below)');
  assert.ok(Math.abs(cpStagnation(1e4) - 1.8394) < 1e-3, 'hypersonic limit (γ = 1.4) ≈ 1.839');
});

test('Leading-edge drag area matches the workbook (4/3 R l C_PT(M_N) cos³Λ)', () => {
  const R = W('M5'), l = W('L5'), sweep = W('K5') * d2r;
  for (const r of rows) {
    const M = W(`D${r}`), le = leadingEdge(R, l, sweep, M);
    close(le.MN, W(`N${r}`), 1e-12, `N${r}`);
    if (le.MN > 1) close(le.CDS, W(`Q${r}`), 1e-12, `Q${r}`);
  }
});

test('Nose-cap drag area: the memo’s eq. (7) is half the workbook column (which omits the ½ of C_PT/2)', () => {
  const R = W('F5'), thM = W('G5') * d2r;
  for (const r of rows) close(noseCap(R, thM, W(`D${r}`)).CDS, W(`I${r}`) / 2, 1e-12, `I${r}/2`);
  // the memo's form gives the measured supersonic sphere drag: C_D ≈ C_PT/2 ≈ 0.91 at high Mach
  const sphere = noseCap(1, Math.PI / 2, 6);
  close(sphere.CDS / Math.PI, 0.5 * cpStagnation(6), 1e-12, 'hemisphere C_D = C_PT/2');
});

/** Direct integration of modified Newtonian pressure over the cap: drag, normal-force slope, moment about the tip. */
function capByQuadrature(R, thM, cpt, n = 4000) {
  let D = 0, N = 0, Mt = 0;
  for (let i = 0; i < n; i++) {
    const th = ((i + 0.5) * thM) / n, dth = thM / n, s = Math.sin(th), c = Math.cos(th);
    D += cpt * c * c * 2 * Math.PI * R * s * R * dth * c;               // eq. (6) with C_PT for 2
    const dN = (cpt / 2) * 4 * R * R * Math.PI * s ** 3 * c * dth;       // eq. (11) per unit α and q
    N += dN; Mt += dN * R * (1 - c);
  }
  return { CDS: D, CNaS: N, xcp: Mt / N };
}

test('Nose cap: closed forms equal direct integration for every cap angle; stable for tiny caps', () => {
  for (const deg of [1, 5, 20, 45, 60, 80, 90]) {
    const th = deg * d2r, a = noseCap(2, th, 3), q = capByQuadrature(2, th, cpStagnation(3));
    close(a.CDS, q.CDS, 1e-6, `${deg}° drag`); close(a.CNaS, q.CNaS, 1e-6, `${deg}° CNα`); close(a.xcp, q.xcp, 1e-6, `${deg}° xcp`);
  }
  close(noseCap(1, Math.PI / 2, 2).xcp, 7 / 15, 1e-14, 'hemisphere xcp = 7R/15');
  const tiny = noseCap(1, 1e-4, 2);
  close(tiny.xcp, (1e-4) ** 2 / 3, 1e-6, 'small cap: xcp → Rθ²/3');
  assert.ok(Number.isFinite(noseCap(1, 1e-9, 2).xcp));
});

test('Cone: pointed-cone forms of eq. (23)–(28) and frustum consistency', () => {
  const L = 10, delta = 15 * d2r, r2 = L * Math.tan(delta), M = 2.5, cpt = cpStagnation(M);
  const c = coneSegment(0, r2, L, M);
  close(c.delta, delta, 1e-12, 'δ');
  close(c.CDS, cpt * Math.sin(delta) ** 2 * Math.PI * r2 * r2, 1e-12, 'eq. (24) drag area');
  close(c.CNaS, Math.PI * L * L * cpt * Math.sin(delta) ** 2, 1e-12, 'eq. (28) CNα·S');
  close(c.xcp, (2 * L) / 3, 1e-12, 'CP at 2L/3');
  // a frustum is the pointed cone minus its tip
  const Lt = 4, tip = coneSegment(0, Lt * Math.tan(delta), Lt, M), fr = coneSegment(Lt * Math.tan(delta), r2, L - Lt, M);
  close(fr.CDS + tip.CDS, c.CDS, 1e-12, 'drag adds'); close(fr.CNaS + tip.CNaS, c.CNaS, 1e-12, 'lift adds');
  close((tip.CNaS * tip.xcp + fr.CNaS * (Lt + fr.xcp)) / c.CNaS, c.xcp, 1e-12, 'moments add');
});

test('Flat face: subsonic and supersonic models meet at Mach 1 (to 0.05 %)', () => {
  close(flatFace(1, 1 - 1e-9).CD, flatFace(1, 1).CD, 6e-4, 'continuous');
  close(flatFace(2, 0).CDS, 0.85 * Math.PI, 1e-12, 'C_D = 0.85 at rest');
});

test('Subsonic fairing: zero at the critical Mach number, full value from Mach 1', () => {
  assert.equal(fairing(0.6, 0.6), 0); assert.equal(fairing(1.2, 0.6), 1); close(fairing(0.8, 0.6), 0.5, 1e-12);
  assert.equal(noseCap(1, 1, 0.5).CDS, 0);
  assert.equal(leadingEdge(1, 1, 0, 0.4).CDS, 0);
  close(leadingEdge(1, 1, 0, 1).CDS, (4 / 3) * cpStagnation(1), 1e-12, 'M_N = 1');
});

test('Memo p. 7 figures, read from the page image: fin edge drag area (1/8 in, 15 in, 30°) and the cap curve (R = 0.1 ft, 80°)', () => {
  // fin: 0.0073 ft² at Mach 1.2, 0.0082 at 1.5, 0.0091 at 2, 0.0100 at 4 (read to about ±0.0002 ft²)
  for (const [M, ft2] of [[1.2, 0.0073], [1.5, 0.0082], [2, 0.0091], [4, 0.0100]]) {
    const a = leadingEdge(0.0625 / 12, 15 / 12, 30 * d2r, M).CDS;
    assert.ok(Math.abs(a - ft2) < 2.5e-4, `M ${M}: ${a} vs ${ft2} ft²`);
  }
  // cap: the figure plots the workbook column, twice eq. (7) (see the test above): 0.040 at Mach 1, 0.052 at 2, 0.056 at 4
  for (const [M, ft2] of [[1, 0.040], [2, 0.052], [4, 0.056]]) {
    const a = 2 * noseCap(0.1, 80 * d2r, M).CDS;
    assert.ok(Math.abs(a - ft2) < 1.5e-3, `cap M ${M}: ${a} vs ${ft2} ft²`);
  }
});

test('Sphere-cone geometry: the cap is tangent to the cone through the shoulder', () => {
  for (const [rn, L, R] of [[1.2, 11.3033, 3], [0.3, 30, 3], [2.9, 3, 3], [1, 0.5, 3], [0, 10, 3]]) {
    const g = sphereCone(rn, L, R);
    assert.ok(Math.abs(R * Math.cos(g.delta) - (L - rn) * Math.sin(g.delta) - rn) < 1e-12, `tangency ${rn},${L}`);
    assert.ok(Math.abs(Math.tan(g.delta) * g.Lc - (R - g.r1)) < 1e-12, `cone through the shoulder ${rn},${L}`);
    assert.ok(Math.abs(g.xJ + g.Lc - L) < 1e-12, 'lengths add');
  }
  close(sphereCone(1.2, 11.3033, 3).delta, 10 * d2r, 1e-5, 'old default: 80° cap on a 10° cone');
  close(sphereCone(0, 10, 3).delta, Math.atan(0.3), 1e-12, 'sharp cone');
  assert.equal(sphereCone(3, 3, 3).delta, 0, 'hemisphere');
});

test('Surface pressure integrates to the drag areas; C_P is C_PT at the tip and C_PT sin²δ on the cone', () => {
  const M = 2.5, cpt = cpStagnation(M), g = sphereCone(1.2, 11.3033, 3);
  const nose = { cap: { R: 1.2, thetaM: g.thetaM }, cone: { r1: g.r1, r2: 3, L: g.Lc, x0: g.xJ } };
  const S = noseSurface(nose, M);
  close(S[0][2], cpt, 1e-12, 'stagnation'); close(S.at(-1)[2], cpt * Math.sin(g.delta) ** 2, 1e-12, 'cone');
  close(S.at(-1)[3], noseCap(1.2, g.thetaM, M).CDS + coneSegment(g.r1, 3, g.Lc, M).CDS, 1e-12, 'accumulated drag area');
  const F = noseSurface({ flat: { D: 2 } }, M);
  close(F.at(-1)[3], flatFace(2, M).CDS, 1e-12, 'flat face');
});

test('Page: the rounded-cone default equals the old element-by-element inputs; the memo fin example per fin', () => {
  const base = Object.fromEntries(calc.groups.flatMap((gr) => gr.fields).map((f) => [f.id, f.default]));
  const out = calc.compute({ ...base, ...calc.examples[0].values, fins: false });
  const g = sphereCone(1.2, 11.3033, 3), S = Math.PI * 9;
  close(out.results.CDnose, (noseCap(1.2, g.thetaM, 2).CDS + coneSegment(g.r1, 3, g.Lc, 2).CDS) / S, 1e-12, 'nose');
  const fin = calc.compute({ ...base, ...calc.examples[1].values });
  close(fin.results.leCDS, leadingEdge(0.0625, 15, 30 * d2r, 4).CDS, 1e-12, 'one fin');
  close(fin.results.lLE, 15, 1e-12, 'edge length');
  // the nose centre of pressure: a pointed cone at 2L/3
  const cone = calc.compute({ ...base, noseType: 'spherecone', rn: 0, L: 12, bodyR: 3, M: 3, fins: false });
  close(cone.results.noseXcp, 8, 1e-12, 'cone CP');
});

after(() => console.log(`# newtonian: ${stats.compared} comparisons, max rel err ${stats.maxRel.toExponential(2)}`));
