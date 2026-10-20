// Modified Newtonian aerodynamics: checked against NEWTON.xls cached values, the memo's closed forms and direct
// numerical integration of the Newtonian pressure over each surface.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { workbook, close, stats } from './_workbook.js';
import { cpStagnation, noseCap, coneSegment, flatFace, leadingEdge, fairing } from '../site/js/calc/newtonian.js';

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

after(() => console.log(`# newtonian: ${stats.compared} comparisons, max rel err ${stats.maxRel.toExponential(2)}`));
