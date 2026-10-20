// De Laval nozzle thrust coefficient — one-dimensional isentropic flow (NACA Report 1135, "Equations, Tables and
// Charts for Compressible Flow", 1953) with the Malina divergence correction for conical source flow
// (F. J. Malina, J. Franklin Inst. 230, 1940), as in C. P. Hoult's RS&T thrust-coefficient tool (THRUSTCF).
//   C_F = λ √{2γ²/(γ−1) (2/(γ+1))^((γ+1)/(γ−1)) [1 − (p_e/p_c)^((γ−1)/γ)]} + (p_e − p_a) ε / p_c,  λ = (1 + cos α)/2
// Pressures in any one unit; only their ratios enter C_F.

/** Area ratio A/A* of isentropic flow at Mach M, as its logarithm (no overflow for γ → 1 or large M). */
export function logAreaRatio(M, g) {
  return -Math.log(M) + ((g + 1) / (2 * (g - 1))) * Math.log((2 / (g + 1)) * (1 + ((g - 1) / 2) * M * M));
}
export const areaRatio = (M, g) => Math.exp(logAreaRatio(M, g));

/** Static-to-stagnation pressure ratio p/p_c at Mach M. */
export const pressureRatio = (M, g) => Math.exp((-g / (g - 1)) * Math.log1p(((g - 1) / 2) * M * M));

/** Mach number at pressure ratio p/p_c (inverse of pressureRatio). */
export const machFromPressure = (pr, g) => Math.sqrt((2 / (g - 1)) * Math.expm1(((g - 1) / g) * -Math.log(pr)));

/** Supersonic Mach number with area ratio eps ≥ 1 (bisection in ln M — bounded and monotone on M ≥ 1). */
export function exitMach(eps, g) {
  if (eps <= 1) return 1;
  const target = Math.log(eps);
  let lo = 0, hi = 1;                                    // in ln M
  for (let k = 0; k < 60 && logAreaRatio(Math.exp(hi), g) < target; k++) hi *= 2;
  for (let k = 0; k < 200 && hi - lo > 1e-15 * Math.max(1, hi); k++) {
    const mid = (lo + hi) / 2;
    if (logAreaRatio(Math.exp(mid), g) < target) lo = mid; else hi = mid;
  }
  return Math.exp((lo + hi) / 2);
}

/** Throat (sonic) pressure ratio p_t/p_c. */
export const throatRatio = (g) => (2 / (g + 1)) ** (g / (g - 1));

/** Thrust coefficient of a nozzle infinitely expanded into vacuum: √{2γ²/(γ−1) (2/(γ+1))^((γ+1)/(γ−1))}. */
export const cfInfinity = (g) => Math.sqrt(((2 * g * g) / (g - 1)) * (2 / (g + 1)) ** ((g + 1) / (g - 1)));

/** Malina divergence factor of a conical nozzle of half angle alpha (degrees). */
export const malina = (alphaDeg) => (1 + Math.cos((alphaDeg * Math.PI) / 180)) / 2;

/** Thrust coefficients for area ratio eps and ambient-to-chamber pressure ratio pac = p_a/p_c. */
export function cf(g, eps, pac, alphaDeg = 0) {
  const Me = exitMach(eps, g), pec = pressureRatio(Me, g);
  const radical = Math.sqrt(-Math.expm1(((g - 1) / g) * Math.log(pec)));   // √(1 − (p_e/p_c)^((γ−1)/γ))
  const momentum = cfInfinity(g) * radical, pressure = (pec - pac) * eps, lambda = malina(alphaDeg);
  return { Me, pec, radical, momentum, pressure, lambda, cf1D: momentum + pressure, cf3D: lambda * momentum + pressure };
}

/**
 * Full evaluation. p = { g (γ), eps (A_e/A_t), alpha (deg), pc, pa (same pressure unit), dt (throat diameter) }.
 * Thrust is in (pressure unit) × (length unit)².
 */
export function nozzle({ g, eps, alpha, pc, pa, dt }) {
  const pStar = pc * throatRatio(g);
  const c = cf(g, eps, pa / pc, alpha);
  const pe = c.pec * pc, At = (Math.PI * dt * dt) / 4;
  const vac = cf(g, eps, 0, alpha);
  // optimum expansion (p_e = p_a) and the area ratio at which the jet would separate (p_e = 0.4 p_a)
  const MeOpt = pa > 0 ? machFromPressure(pa / pc, g) : Infinity;
  const epsOpt = pa > 0 ? areaRatio(MeOpt, g) : Infinity;
  const MeSep = pa > 0 ? machFromPressure(Math.min(1, (0.4 * pa) / pc), g) : Infinity;
  const epsSep = pa > 0 ? areaRatio(MeSep, g) : Infinity;
  const de = dt * Math.sqrt(eps), Ld = (de - dt) / 2 / Math.tan((alpha * Math.PI) / 180);   // conical divergent section
  return {
    ...c, pStar, pe, At, thrust: c.cf3D * pc * At, thrust1D: c.cf1D * pc * At, cfVac: vac.cf3D, thrustVac: vac.cf3D * pc * At,
    epsOpt, cfOpt: malina(alpha) * cfInfinity(g) * Math.sqrt(-Math.expm1(((g - 1) / g) * Math.log(pa / pc))), MeOpt, epsSep, separated: pe < 0.4 * pa, de, Ld,
  };
}
