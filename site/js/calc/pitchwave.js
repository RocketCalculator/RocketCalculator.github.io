// Pitch/yaw wave number — C. P. Hoult, "The Pitch-Yaw Wave Number (rev. 3)", RS&T, 2013.
// A statically stable rocket pivoting about its CG obeys I α̈ = ½ρU²S d C_Mα α, so it oscillates at
//   ω_N² = −ρSdU²C_Mα / (2I)
// and in one period P = 2π/ω_N it travels the pitch/yaw wavelength
//   L = UP = 2π √(2I / (−ρSdC_Mα)),  wave number λ_p = 2π/L = √(−ρSdC_Mα / (2I))  (rad per unit length).
// The wavelength does not depend on speed (the memo notes it holds under constant acceleration too) and, for
// geometrically similar rockets, grows in proportion to their size. SI units throughout.

/** Pitching-moment slope (per rad, reference length d) from the normal-force slope and the static margin in calibres. */
export const cmAlpha = (CNa, SM) => -CNa * SM;

/** Pitch inertia of a uniform slender rod of mass m and length ℓ about its centre. */
export const rodInertia = (m, l) => (m * l * l) / 12;

/** Wave number λ_p (rad/m) for inertia I, density ρ, diameter d (S = πd²/4) and C_Mα < 0. */
export function waveNumber(I, rho, d, Cma) {
  const S = (Math.PI * d * d) / 4;
  return Math.sqrt((-rho * S * d * Cma) / (2 * I));
}

/** Full evaluation. { I, rho, d, Cma, U, l } → wavelength, wave number, natural frequency and period at speed U. */
export function pitchWave({ I, rho, d, Cma, U, l }) {
  const S = (Math.PI * d * d) / 4, lam = waveNumber(I, rho, d, Cma), L = (2 * Math.PI) / lam;
  const omega = lam * U, q = 0.5 * rho * U * U;
  return { S, lam, L, omega, f: omega / (2 * Math.PI), P: U > 0 ? L / U : Infinity, q, Lrel: L / l, Malpha: q * S * d * Cma };
}

// Roll against pitch — C. P. Hoult, "Strip Theory for Setting Fin Angles (rev. 3)", RS&T, 2014, p. 6: body-fixed
// misalignments on a rolling rocket give an angle-of-attack (and load) response ∝ λ_P²/(λ_P² − λ_R²); "as long as λ_R
// is less than 30-40% of λ_P the damage is not too great"; p. 4 designs for burnout roll rate = 0.3 × pitch frequency.
// Verdict bands (DECISIONS D31, as Fin Cant Angle): ≤ 30 % safe, ≤ 40 % marginal, above unsafe.
export const TARGET = 0.3, LIMIT = 0.4;

/**
 * Roll check at speed U for a pitchWave() result o and roll rate fR (Hz): roll wave number λ_R = 2πf_R/U, the ratio
 * λ_R/λ_P = f_R/f_N, the response factor, the verdict level, the roll rate at the target, and the factor by which
 * −C_Mα (static margin) must grow, or I shrink, to bring the ratio to the target (λ_P ∝ √(−C_Mα/I)).
 */
export function rollCheck(o, fR, { U }) {
  const ratio = fR / o.f, lamR = (2 * Math.PI * fR) / U;
  const level = ratio <= TARGET * (1 + 1e-12) ? 'safe' : ratio <= LIMIT ? 'marginal' : 'unsafe';
  return { ratio, lamR, LamR: fR > 0 ? U / fR : Infinity, amp: ratio < 1 ? 1 / (1 - ratio * ratio) : Infinity, level, fR: TARGET * o.f, stiffen: (ratio / TARGET) ** 2 };
}
