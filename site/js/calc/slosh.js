// Propellant sloshing in an upright circular-cylinder tank — C. P. Hoult, "An Analysis of the Motion of Liquids in a
// Partially-Filled Enclosure" (with the 2013 errata), RS&T worksheet SLOSHIT. Equivalent pendulum read from the poles and
// residues of the report's transfer functions: slosh mass from F_z/ν_z (eq. 5-47), hinge depth from M_y/ν_z (eq. 5-49).
// Natural frequencies: ω_n² = (a/R) λ_n tanh(λ_n h/R), λ_n the roots of J₁′(λ) = 0, h = M/(ρπR²) the fill depth.
// Any consistent units.

/** Roots of J₁′(x) = 0 (modern values, errata item 2) — first ten. */
export const LAMBDA = [1.8411837813, 5.3314427735, 8.5363163663, 11.7060049026, 14.8635886339, 18.0155278626, 21.1643698591, 24.3113268572, 27.4570505680, 30.6019229726];

/** Bessel J₁ and J₁′ from Bessel's integral (1/π)∫₀^π cos(τ − x sin τ) dτ — periodic, so the trapezoid rule is
 *  accurate to machine precision; used to check the roots. */
export function besselJ1(x, n = 256) {
  let s = 0, d = 0;
  for (let i = 0; i < n; i++) { const t = ((i + 0.5) * Math.PI) / n; s += Math.cos(t - x * Math.sin(t)); d += Math.sin(t) * Math.sin(t - x * Math.sin(t)); }
  return { J1: s / n, dJ1: d / n };
}

/** Fill depth of fluid mass M of density rho in a tank of radius R. */
export const fillDepth = (M, rho, R) => M / (rho * Math.PI * R * R);

/** Mode n (1-based): circular frequency, equivalent slosh mass and pendulum length. */
export function mode(n, { a, R, h, M }) {
  const L = LAMBDA[n - 1], x = (L * h) / R, th = Math.tanh(x);
  const w = Math.sqrt((a / R) * L * th);
  const mFrac = (2 * th) / (L * (L * L - 1) * (h / R));   // residue of eq. (5-47) over M = πρR²h
  // moment arm of the mode force, eq. (5-49) residue ÷ eq. (5-47) residue: the hinge depth below the free surface
  // (negative = above it); the pendulum bob hangs L_n below the hinge, at (2R/λ) tanh(λh/2R)
  const pendulum = R / (L * th), hinge = (R / L) * (1 - 2 / Math.cosh(x)) / th;
  return { n, lambda: L, w, f: w / (2 * Math.PI), period: (2 * Math.PI) / w, mFrac, m: mFrac * M, pendulum, hinge, bob: hinge + pendulum };
}

/** Fill depth at which mode n has frequency f (Hz); null when even a deep fill stays below f. */
export function depthFor(f, { a, R, n = 1 }) {
  const L = LAMBDA[n - 1], y = ((2 * Math.PI * f) ** 2 * R) / (a * L);
  return y < 1 ? (R / L) * Math.atanh(y) : null;
}

/** Tank radius (same liquid mass) at which the first mode has frequency f (Hz); f₁ falls monotonically as R grows. */
export function radiusFor(f, { a, M, rho }, lo = 1e-6, hi = 1e6) {
  const f1 = (R) => mode(1, { a, R, h: fillDepth(M, rho, R), M }).f;
  for (let k = 0; k < 200; k++) { const m = Math.sqrt(lo * hi); if (f1(m) > f) lo = m; else hi = m; }
  return Math.sqrt(lo * hi);
}

/** Full evaluation. p = { a (thrust acceleration), R, M (fluid mass), rho, hMax (optional: tank length, caps the depth) }. */
export function slosh({ a, R, M, rho, hMax = Infinity }) {
  const h = Math.min(fillDepth(M, rho, R), hMax);
  M = h * rho * Math.PI * R * R;
  const modes = [1, 2, 3].map((n) => mode(n, { a, R, h, M }));
  return { h, hR: h / R, modes, fixedFrac: 1 - modes.reduce((s, q) => s + q.mFrac, 0) };
}
