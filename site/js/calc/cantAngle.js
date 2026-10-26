// Fin cant angle & roll derivatives by strip theory — C. P. Hoult, "Strip Theory for Setting Fin Angles (rev. 3)"
// (RS&T memo, 22 May 2014); workbook CANT ANGLE3.xls. Lengths in inches (any consistent unit for the geometry);
// roll-cycle mode uses the workbook's ft / slug units for Ixx, ρ, h and L.

/**
 * Planform integrals for a straight-tapered fin from body radius R to tip radius b (both from the body centre line):
 * chord c(y) = A − C y.
 */
export function planform({ R, b, cR, cT }) {
  const A = (cR * b - cT * R) / (b - R);
  const C = (cR - cT) / (b - R);
  const s2 = b * b + b * R + R * R, s3 = b ** 3 + b * b * R + b * R * R + R ** 3;
  const Ld = (A * (b + R)) / 2 - (C * s2) / 3;               // ∫ y c dy / (b − R)
  const M = (-A * s2) / 3 + (C * s3) / 4;                    // −∫ y² c dy / (b − R)
  const Ycp = (3 * A * (b + R) - 2 * C * s2) / (6 * A - 3 * C * (b + R));   // spanwise CP of the δ load
  return { A, C, Ld, M, Ycp, S: Math.PI * R * R, area: ((cR + cT) * (b - R)) / 2 };
}

/**
 * Roll stability derivatives. compat=true reproduces workbook cell Q5, which has (b − π) for (b − R)
 * and (2 + πR³) for 2πR³.
 */
export function derivatives({ R, b, cR, cT, cNa, N }, { compat = false } = {}) {
  const pf = planform({ R, b, cR, cT });
  const CLd = compat
    ? (cNa * (b - Math.PI) * pf.Ld) / (2 + Math.PI * R ** 3)
    : (cNa * (b - R) * pf.Ld) / (2 * Math.PI * R ** 3);       // single-fin roll-driving derivative, per rad
  const CLp = (cNa * (b - R) * N * pf.M) / (2 * Math.PI * R ** 4);  // N-fin roll-damping derivative
  return { ...pf, CLd, CLp };
}

/** Steady-state cant angle for roll rate f (Hz) at speed V (ft/s): driving = damping, δ = −(p/V)·M/Ld. */
export function cantForRate({ f, V }, d) {
  const p = 2 * Math.PI * f;                 // rad/s
  const pV = p / (12 * V);                   // per inch (V in in/s)
  const delta = (-pV * d.M) / d.Ld;          // rad
  return { p, Vips: 12 * V, pV, delta, deltaDeg: (delta * 180) / Math.PI };
}

/** Memo's cant angle including roll-inertia lag: δ = −pR·CLp(1 − J)/(N U CLδ), J = Ixx / (2πρ(h−L)R⁴CLp). */
export function cantWithLag({ f, V, Ixx, rho, h, L }, d, { R, N }) {
  const p = 2 * Math.PI * f, Rft = R / 12;
  const J = Ixx / (2 * Math.PI * rho * (h - L) * Rft ** 4 * d.CLp);
  const delta = (-p * Rft * d.CLp * (1 - J)) / (N * V * d.CLd);
  return { J, delta, deltaDeg: (delta * 180) / Math.PI };
}

/** Cant angle giving an integer number of roll cycles Mc between launcher exit and burnout altitude h. */
export function cantForCycles({ Ixx, rho, h, L, Mc }, d, { R, N }) {
  const Rft = R / 12;
  const k = Ixx / (2 * Math.PI * rho * Rft ** 4 * d.CLp);
  const brkt = h - L + k * Math.log((h - L - k) / -k);
  const delta = (-2 * Math.PI * Mc * Rft * d.CLp) / (N * d.CLd * brkt);
  return { k, brkt, delta, deltaDeg: (delta * 180) / Math.PI };
}

/**
 * Roll that a common cant δ (rad) gives during a constant-acceleration boost — Hoult, "Small Sounding Rocket Boost Phase
 * Roll Rate" (2013), eqs. (2b), (5b)–(5e). Steady roll wavenumber λ_R0 = −δ N C_Lδ /(R C_Lp) (rad/ft, R in ft);
 * at altitude x (ft above the launcher's base) J = k/(x − L), λ_R = λ_R0/(1 − J) and the roll angle since launcher exit is
 * λ_R0 [x − L + k ln((x − L − k)/(−k))]. Below the launcher top there is no roll.
 */
export function rollFromCant(delta, d, { R, N, Ixx, rho, L }) {
  const Rft = R / 12, lam0 = (-delta * N * d.CLd) / (Rft * d.CLp);
  const k = Ixx / (2 * Math.PI * rho * Rft ** 4 * d.CLp);
  const at = (x) => {
    const s = x - L;
    if (!(s > 0)) return { J: -Infinity, lam: 0, turns: 0 };
    return { J: k / s, lam: lam0 / (1 - k / s), turns: (lam0 * (s + k * Math.log((s - k) / -k))) / (2 * Math.PI) };
  };
  return { lam0, k, at };
}

/** Body-fixed misalignment response factor λ_P²/(λ_P² − λ_R²) (Fin Setting Theory rev. 3, p. 6); null at or past resonance. */
export const misalignmentGain = (ratio) => (Math.abs(ratio) < 1 ? 1 / (1 - ratio * ratio) : null);
