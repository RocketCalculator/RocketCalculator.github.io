// Roll-rate history of a small sounding rocket — C. P. Hoult, "Small Sounding Rocket Boost Phase Roll Rate"
// (RS&T, 28 Sep 2013) and "Small Sounding Rocket Apogee Roll Rate" (RS&T, 15 Jan 2013).
// Roll equation for vertical flight: I_R dp/dt = qSd [C_Lp pd/2U + C_Lδ Σδ].
// Boost (constant acceleration, U² = 2ah, roll from launcher exit at h = L):
//   λ_R0 = −2C_Lδ Σδ / (d C_Lp),  λ_R = λ_R0 / (1 − J),  J = k/(h − L),  k = I_R / (2πρR⁴C_Lp)
//   Δφ = λ_R0 [h − L + k ln((h − L − k)/(−k))]
// Coast to apogee (dV/dt ≈ −g, density at apogee): dp/dV − GVp = −HV², G = −ρ_A S d² C_Lp/(4gI_R), H = ρ_A S d C_Lδ Σδ/(2gI_R).
// The memo integrates eq. (7) numerically; it has the closed form p_A/p_B = √π erf(√a)/(2√a), a = GV_B²/2.
// US units (ft, slug, s); the fin geometry may be in inches (only its ratios and R enter through the derivatives).

export const G0 = 32.174;   // ft/s²

/** Error function, |error| < 1e-15: Maclaurin series below 2.5, continued fraction for erfc above. */
export function erf(x) {
  if (x < 0) return -erf(-x);
  if (x < 2.5) {
    let term = x, sum = x;
    for (let n = 1; n < 200; n++) { term *= (-x * x) / n; const t = term / (2 * n + 1); sum += t; if (Math.abs(t) < 1e-17 * Math.abs(sum)) break; }
    return (2 / Math.sqrt(Math.PI)) * sum;
  }
  // erfc(x) = e^{−x²}/√π · 1/(x + 1/2/(x + 1/(x + 3/2/(x + …)))), evaluated bottom-up
  let f = x;
  for (let n = 60; n >= 1; n--) f = x + n / 2 / f;
  return 1 - Math.exp(-x * x) / (Math.sqrt(Math.PI) * f);
}

/** Apogee-to-burnout roll-rate ratio for X = GV_B² (memo Figure 1): √π erf(√a)/(2√a), a = X/2. */
export function apogeeRatio(X) {
  const a = X / 2;
  if (a < 1e-8) return 1 - a / 3;
  return (Math.sqrt(Math.PI) * erf(Math.sqrt(a))) / (2 * Math.sqrt(a));
}

/**
 * Full evaluation. { CLd (one fin, per rad), CLp (all fins, per rad, < 0), N, delta (rad), R (ft), I (slug ft²),
 * rho (boost, slug/ft³), rhoA (apogee), L (launcher length, ft), hB (burnout height above the launcher base, ft), VB (ft/s) }.
 * The boost is integrated exactly for the memo's model (eq. 1 with U = at, h = at²/2, p = 0 at launcher exit); the memo's
 * closed-form approximation λ_R0/(1 − J) is returned alongside (good while |J| ≲ 0.1).
 */
export function rollRate({ CLd, CLp, N, delta, R, I, rho, rhoA, L, hB, VB }) {
  const d = 2 * R, S = Math.PI * R * R;
  const lam0 = (-2 * CLd * N * delta) / (d * CLp);                 // rad/ft
  const k = I / (2 * Math.PI * rho * R ** 4 * CLp);                 // ft, negative
  // boost: dp/dt = αtp + βt², α = ρaSd²C_Lp/(4I), β = ρa²Sd·NC_Lδδ/(2I); φ̇ = p
  const a = (VB * VB) / (2 * hB), alpha = (rho * a * S * d * d * CLp) / (4 * I), beta = (rho * a * a * S * d * N * CLd * delta) / (2 * I);
  const t0 = Math.sqrt((2 * L) / a), tB = VB / a;
  const tau = 1 / Math.max(1e-12, Math.abs(alpha) * tB);           // shortest roll time constant (at burnout)
  const n = Math.min(200000, Math.max(2000, Math.ceil((20 * (tB - t0)) / tau))), dt = (tB - t0) / n;
  const F = (t, p) => alpha * t * p + beta * t * t;
  const hist = [{ t: t0, h: L, U: a * t0, p: 0, phi: 0 }], every = Math.max(1, Math.floor(n / 400));
  let t = t0, p = 0, phi = 0;
  // RK4 while the step resolves the roll time constant; otherwise (very stiff, step count capped) an exponential
  // step with coefficients frozen at the midpoint, which is stable for any step and tends to the quasi-steady rate
  const stiff = dt * Math.abs(alpha) * tB > 0.5;
  for (let i = 1; i <= n; i++) {
    let p1;
    if (!stiff) {
      const k1 = F(t, p), k2 = F(t + dt / 2, p + (dt / 2) * k1), k3 = F(t + dt / 2, p + (dt / 2) * k2), k4 = F(t + dt, p + dt * k3);
      p1 = p + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
      phi += (dt / 6) * (p + 2 * (p + (dt / 2) * k1) + 2 * (p + (dt / 2) * k2) + (p + dt * k3));   // RK4 for φ̇ = p
    } else {
      const tm = t + dt / 2, c = alpha * tm * dt, ps = (-beta * tm) / alpha;   // ps: quasi-steady rate at tm
      p1 = ps + (p - ps) * Math.exp(c);
      phi += (dt * (p + p1)) / 2;
    }
    p = p1; t += dt;
    if (i % every === 0 || i === n) hist.push({ t, h: (a * t * t) / 2, U: a * t, p, phi });
  }
  // memo's closed-form approximations (eq. 5b, 5c, 5d)
  const lamAt = (h) => (h > L ? (lam0 * (h - L)) / (h - L - k) : 0);
  const phiAt = (h) => (h > L ? lam0 * (h - L + k * Math.log((h - L - k) / -k)) : 0);
  const JB = k / (hB - L), pB = p, pB0 = lam0 * VB, pBapprox = lamAt(hB) * VB;
  // coast
  const G = (-rhoA * S * d * d * CLp) / (4 * G0 * I), X = G * VB * VB, ratio = apogeeRatio(X), e = Math.exp(-X / 2);
  const pA = pB * e + pB0 * (ratio - e);
  return { d, S, lam0, k, JB, pB, pB0, pBapprox, phiB: phi, phiApprox: phiAt(hB), lamB: pB / VB, a, tB, t0, hist, lamAt, phiAt, G, X, ratio, pA, tCoast: VB / G0 };
}
