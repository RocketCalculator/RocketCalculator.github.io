// Pressure distribution over a body of revolution at zero angle of attack — C. P. Hoult, "Nose Pressure Distribution
// (rev. 4)" (RS&T, 2012), Munk airship theory (NACA TN-192, 1924), and the MUNKSHIP field tool.
// Line sources of strength σ = 2πU r dr/dz on the axis; the axial perturbation velocity at station z_p, linearised
// (Cp = −2q_z/U), discretised with the central difference r dr/dz = r_i (r_{i+1} − r_{i−1}) / 2Δz:
//   Cp₀(z_p) = −Σ_i (z_p − z_i) r_i (r_{i+1} − r_{i−1}) / 2 / ((z_p − z_i)² + r_i²)^{3/2}
// A wake closes the body behind its base: a cone of half angle ε down to the cylindrical wake diameter
//   D_w = D √(C_D / (2(1 − √C_Db)))   (impulse–momentum with Bernoulli to the base),
// Kármán–Tsien: Cp = Cp₀ / (β + (Cp₀/2)(1 − β)), β = √(1 − M²). Lengths in any one unit.

/** Kármán–Tsien compressible pressure coefficient. */
export function karmanTsien(Cp0, M) {
  const b = Math.sqrt(1 - M * M);
  return Cp0 / (b + (Cp0 / 2) * (1 - b));
}

/** Critical pressure coefficient (local Mach 1) at free-stream Mach M. */
export function cpStar(M, g = 1.4) {
  return (2 / (g * M * M)) * (((2 + (g - 1) * M * M) / (g + 1)) ** (g / (g - 1)) - 1);
}

/** Critical Mach number: the free-stream Mach at which the Kármán–Tsien Cp of the minimum Cp₀ is sonic (bisection). */
export function criticalMach(Cp0min, g = 1.4) {
  if (!(Cp0min < 0)) return 1;
  // Kármán–Tsien is singular where β = (−Cp₀/2)/(1 − Cp₀/2); the sonic crossing lies below that Mach number
  const bs = -Cp0min / 2 / (1 - Cp0min / 2);
  let lo = 0.05, hi = Math.sqrt(1 - bs * bs) * (1 - 1e-12);
  const f = (M) => karmanTsien(Cp0min, M) - cpStar(M, g);
  for (let k = 0; k < 100; k++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/** Cylindrical wake diameter from forebody and base drag coefficients (both on the body cross section). */
export const wakeDiameter = (D, CD, CDb) => D * Math.sqrt(CD / (2 * (1 - Math.sqrt(CDb))));

/**
 * Incompressible Cp₀ at the stations z_p of r[], r[i] at z = iΔz (i = 0 … n, plus r[n + 1] one step beyond):
 * sources at i = 1 … n (as the field tool), every field station p = 0 … n.
 */
export function sourceCp(r, dz) {
  const n = r.length - 2, cp = new Float64Array(n + 1), w = new Float64Array(n + 1);
  for (let i = 1; i <= n; i++) w[i] = (r[i] * (r[i + 1] - r[i - 1])) / 2;      // r dr/dz Δz
  for (let p = 0; p <= n; p++) {
    let s = 0;
    for (let i = 1; i <= n; i++) {
      if (!w[i]) continue;
      const dzp = (p - i) * dz, q = dzp * dzp + r[i] * r[i];
      s += (dzp * w[i]) / (q * Math.sqrt(q));
    }
    cp[p] = -s;
  }
  return cp;
}

/** Station radii: body r(z) on 0 … L, then the wake (cone of half angle eps to rw, then cylinder) to zEnd. */
export function stations(rBody, L, R, rw, eps, dz, zEnd) {
  const n = Math.ceil(zEnd / dz), r = new Float64Array(n + 2), t = Math.tan(eps);
  for (let i = 0; i <= n + 1; i++) {
    const z = i * dz;
    r[i] = z <= L + 1e-9 ? rBody(z) : Math.max(rw, R - t * (z - L));
  }
  return r;
}

/**
 * Full evaluation. { rBody (z → r), noseL, L (base station), R (body radius), M, CD, CDb, eps (rad), dz }.
 * Returns stations, Cp₀ and Cp along body and wake, and the summary results.
 */
export function nosePressure({ rBody, noseL, L, R, M, CD, CDb, eps, dz }) {
  const rw = wakeDiameter(2 * R, CD, CDb) / 2;
  const zEnd = L + Math.max(0, R - rw) / Math.tan(eps) + 4 * R;
  dz = Math.max(dz, zEnd / 1200);                       // at most 1 200 stations: the source sum is O(n²)
  const r = stations(rBody, L, R, rw, eps, dz, zEnd), cp0 = sourceCp(r, dz), n = cp0.length - 1;
  const cp = Array.from(cp0, (c) => karmanTsien(c, M));
  const iBase = Math.round(L / dz);
  // the source model is unreliable near the blunt base (memo), so the minimum and the gradient are sought on the
  // body up to two diameters ahead of the base (the whole body if that leaves less than the nose)
  const iEnd = Math.max(Math.min(iBase, Math.round(noseL / dz) + 1), Math.round((L - 4 * R) / dz));
  let iMin = 1;
  for (let i = 1; i <= iEnd; i++) if (cp0[i] < cp0[iMin]) iMin = i;
  // steepest adverse (rising) pressure gradient behind the minimum, per body diameter
  let grad = 0, iGrad = iMin;
  for (let i = iMin; i < iEnd; i++) { const gi = ((cp[i + 1] - cp[i]) / dz) * 2 * R; if (gi > grad) { grad = gi; iGrad = i; } }
  // nose axial force / (q π R²): tip element π Cp₁ r₁² plus 2π Σ Cp r dr/dz Δz over the nose (memo)
  const iNose = Math.round(noseL / dz);
  let F = Math.PI * cp[1] * r[1] * r[1];
  for (let i = 1; i < iNose; i++) F += 2 * Math.PI * cp[i] * ((r[i] * (r[i + 1] - r[i - 1])) / 2);
  return { r, cp0, cp, n, dz, rw, iBase, iEnd, iMin, zMin: iMin * dz, cpMin: cp[iMin], cp0Min: cp0[iMin], Mcr: criticalMach(cp0[iMin]), grad, zGrad: iGrad * dz, CA: F / (Math.PI * R * R) };
}
