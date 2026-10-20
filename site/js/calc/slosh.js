// Propellant sloshing in an upright circular-cylinder tank — C. P. Hoult, "An Analysis of the Motion of Liquids in a
// Partially-Filled Enclosure" (with the 2013 errata), RS&T worksheet SLOSHIT; equivalent mechanical model after
// H. N. Abramson (ed.), "The Dynamic Behavior of Liquids in Moving Containers", NASA SP-106, 1966.
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
  const mFrac = (2 * th) / (L * (L * L - 1) * (h / R));   // Abramson SP-106: m_n/M
  return { n, lambda: L, w, f: w / (2 * Math.PI), period: (2 * Math.PI) / w, mFrac, m: mFrac * M, pendulum: R / (L * th) };
}

/** Full evaluation. p = { a (thrust acceleration), R, M (fluid mass), rho }. */
export function slosh({ a, R, M, rho }) {
  const h = fillDepth(M, rho, R);
  const modes = [1, 2, 3].map((n) => mode(n, { a, R, h, M }));
  return { h, hR: h / R, modes, fixedFrac: 1 - modes.reduce((s, q) => s + q.mFrac, 0) };
}
