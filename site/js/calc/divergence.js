// Static aeroelastic divergence of a flexible upper stage or payload joint — C. P. Hoult, "Upper Stage Bending
// Influence on Static Stability (rev. 3)" (RS&T, 2012), and the DIVERGENCE field tool.
// The upper stage is a cantilever from a stiff booster, loaded by the nose normal force N_N = qSC_NNα(α + dy/dx):
//   flexible tube:  q_D = 2EI / (S C_NNα l²),  EI ≈ EπR³t
//   flexible joint: q_D = 1 / (S C_NNα C x_j)
// Nose loads grow by q_D/(q_D − q). With the whole rocket trimmed against a thrust misalignment, the angle of attack
// grows by (eq. 1) and the nose angle of attack by (eq. 2):
//   α/α_rigid = Σ / [x₁C_N1α − x₂C_N2α − x₃C_NNα q_D/(q_D − q)],   Σ = x₁C_N1α − x₂C_N2α − x₃C_NNα
//   α_N/α_rigid = q_D Σ / [(x₁C_N1α − x₂C_N2α)(q_D − q) − x₃C_NNα q_D]
// Inputs in pounds and inches; q in lbf/ft² (the factor 144 converts).

/** Bending stiffness of a thin-walled tube, EπR³t. */
export const tubeEI = (E, R, t) => E * Math.PI * R ** 3 * t;

/** Divergence dynamic pressure (lbf/ft²) of a flexible tube: E (psi), R, t, l (in), C_NNα (per rad). */
export function qdTube(E, R, t, l, CNa) {
  const S = Math.PI * R * R;
  return (144 * 2 * tubeEI(E, R, t)) / (S * CNa * l * l);
}

/** Divergence dynamic pressure (lbf/ft²) of a flexible joint: compliance C (rad/(lbf·in)), arm x_j (in). */
export function qdJoint(R, CNa, C, xj) {
  return 144 / (Math.PI * R * R * CNa * C * xj);
}

/** Nose-load amplification q_D/(q_D − q); Infinity at or beyond divergence. */
export const amplification = (q, qD) => (q < qD ? qD / (qD - q) : Infinity);

/** Longest upper stage (in) that stays below divergence at dynamic pressure q (lbf/ft²). */
export const maxLength = (E, R, t, CNa, q) => Math.sqrt((144 * 2 * tubeEI(E, R, t)) / (Math.PI * R * R * CNa * q));

/** Whole-rocket angle-of-attack amplifications (eqs. 1 and 2); x’s are moment arms about the CG. */
export function trimAmplification({ x1, CN1a, x2, CN2a, x3, CNNa, q, qD }) {
  const tails = x1 * CN1a - x2 * CN2a, sum = tails - x3 * CNNa, f = qD / (qD - q);
  const den1 = tails - x3 * CNNa * f, den2 = tails * (qD - q) - x3 * CNNa * qD;
  return { sum, body: sum / den1, nose: (qD * sum) / den2, stable: sum > 0 && den1 > 0 && q < qD };
}

/** Full evaluation. { mode: 'tube' | 'joint', E, R, t, l, CNa, C, xj, q, trim: {...} | null } */
export function divergence({ mode, E, R, t, l, CNa, C, xj, q, trim }) {
  const S = Math.PI * R * R, EI = tubeEI(E, R, t);
  const qD = mode === 'joint' ? qdJoint(R, CNa, C, xj) : qdTube(E, R, t, l, CNa);
  const o = { S, EI, qD, ratio: q / qD, amp: amplification(q, qD), lmax: mode === 'joint' ? NaN : maxLength(E, R, t, CNa, q) };
  if (trim) Object.assign(o, { trim: trimAmplification({ ...trim, CNNa: CNa, q, qD }) });
  return o;
}
