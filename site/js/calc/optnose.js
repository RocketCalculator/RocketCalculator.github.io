// Optimum subsonic nose shape — R. J. Felkel, "Effect of Different Nose Profiles on Subsonic Pressure Coefficients"
// (AIAA Region VI student conference, 2011) and C. P. Hoult, "Compressibility Effects on a Minimum Pressure Gradient
// Nose" (RS&T, 2010). The best nose keeps the minimum Cp behind the shoulder as close to zero as possible: that gives
// the highest critical Mach number and the weakest adverse gradient on the cylinder. A superellipse nose,
//   (r/R)^n + (1 − z/L)^n = 1   (n = 1 cone, n = 2 ellipse),
// matches the cut-and-try optimum when n is chosen for the fineness ratio. Pressures from nosepressure.js.
import { nosePressure } from './nosepressure.js';

/** Superellipse nose radius at z (0 … L) for base radius R and exponent n. */
export const superellipse = (z, L, R, n) => R * Math.max(0, 1 - (1 - Math.min(1, z / L)) ** n) ** (1 / n);

/** Pressure solution for nose profile f(z) (0 … L) on a cylinder 12 diameters long, wake as in the field tool. */
export function noseCp(f, L, R, M = 0) {
  // stations R/4 apart: Cp₀,min is converged to < 1 % there, and the optimiser and the results agree exactly
  const Lb = L + 24 * R, dz = Lb / Math.min(1200, Math.max(150, Math.round(Lb / (R / 4))));
  return nosePressure({ rBody: (z) => (z < L ? f(z) : R), noseL: L, L: Lb, R, M, CD: 0.3755, CDb: 0.0813, eps: 0.1, dz });
}

/** Exponent n in [1.05, 4] whose superellipse has the least negative Cp₀,min: coarse scan, then golden section. */
export function optimumExponent(L, R) {
  const memo = new Map(), f = (n) => memo.get(n) ?? memo.set(n, noseCp((z) => superellipse(z, L, R, n), L, R).cp0Min).get(n);
  let best = 1.05;
  for (let n = 1.3; n <= 4; n += 0.25) if (f(n) > f(best)) best = n;
  let a = Math.max(1.05, best - 0.25), b = Math.min(4, best + 0.25);
  const g = (Math.sqrt(5) - 1) / 2;
  let c = b - g * (b - a), d = a + g * (b - a), fc = f(c), fd = f(d);
  // the objective has a kink at the optimum (two suction peaks equal), so refine the bracket to ±4×10⁻⁵
  for (let k = 0; k < 20; k++) {
    if (fc > fd) { b = d; d = c; fd = fc; c = b - g * (b - a); fc = f(c); } else { a = c; c = d; fc = fd; d = a + g * (b - a); fd = f(d); }
  }
  return [...memo].reduce((p, q) => (q[1] > p[1] ? q : p))[0];   // the best exponent actually evaluated
}
