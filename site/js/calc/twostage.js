// Optimum allocation of mass between two rocket stages — C. P. Hoult, "Optimum Allocation of Weight Between Two
// Stages (rev. 1)", RS&T memo, 2015, after Vertregt's Lagrange-multiplier method (J. Brit. Interplanetary Soc., 1955–56).
// Ideal (Tsiolkovskii) velocity: no drag or gravity losses. Stage i has exhaust velocity c_i = g₀I_SPi, structural
// efficiency σ_i = M_STi/(M_STi + M_PRi) and payload ratio η_i = M_0,i+1/M_0i, so ΔV_i = −c_i ln[η_i + σ_i(1 − η_i)].
// Maximising ΔV₁ + ΔV₂ at a fixed total payload ratio η_TOT = η₁η₂ gives η_i = λσ_i/[(c_i − λ)(1 − σ_i)] (eq. 16);
// λ is found here from the required ideal velocity instead of from η_TOT (eq. 17) — the same optimum.
// Velocities in any unit consistent with c (ft/s internally); masses in any unit.

export const G0 = 32.174;

/** Ideal velocity gained by one stage (eqs. 1 and 4). */
export const stageDV = (c, sigma, eta) => -c * Math.log(eta + sigma * (1 - eta));
/** Optimum payload ratio of a stage for multiplier λ (eq. 16). */
export const etaOf = (lam, c, sigma) => (lam * sigma) / ((c - lam) * (1 - sigma));
/** Ideal velocity of the optimum split for multiplier λ. p = { c1, c2, s1, s2 }. */
export const dvOf = (lam, p) => stageDV(p.c1, p.s1, etaOf(lam, p.c1, p.s1)) + stageDV(p.c2, p.s2, etaOf(lam, p.c2, p.s2));

/**
 * Ideal velocities for which the optimum keeps weight in both stages. As λ → 0 the liftoff mass grows without bound
 * and ΔV → −c₁ ln σ₁ − c₂ ln σ₂; at λ = min c_i(1 − σ_i) one stage's payload ratio reaches 1 (that stage vanishes).
 */
export function velocityRange(p) {
  const l1 = p.c1 * (1 - p.s1), l2 = p.c2 * (1 - p.s2), lamMax = Math.min(l1, l2);
  return { min: dvOf(lamMax, p), max: -p.c1 * Math.log(p.s1) - p.c2 * Math.log(p.s2), lamMax, empty: l1 <= l2 ? 1 : 2 };
}

/** Multiplier λ for which the optimum split gives ideal velocity dv (ΔV falls monotonically with λ; bisection). */
export function multiplier(dv, p) {
  let lo = 0, hi = velocityRange(p).lamMax;
  for (let i = 0; i < 2000; i++) {
    const mid = 0.5 * (lo + hi);
    if (mid <= lo || mid >= hi) break;
    if (dvOf(mid, p) > dv) lo = mid; else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/** Stage masses from the payload mass and the two payload ratios. */
export function masses(Mpl, eta1, eta2, s1, s2) {
  const M02 = Mpl / eta2, M01 = M02 / eta1, m1 = M01 - M02, m2 = M02 - Mpl;
  return { M01, M02, stage1: { loaded: m1, st: s1 * m1, pr: (1 - s1) * m1 }, stage2: { loaded: m2, st: s2 * m2, pr: (1 - s2) * m2 } };
}

/** Ideal velocity of any split: liftoff mass M01, second-stage ignition mass M02 (payload + stage 2). */
export const splitDV = (Mpl, M01, M02, p) => stageDV(p.c1, p.s1, M02 / M01) + stageDV(p.c2, p.s2, Mpl / M02);

/** Multiplier of a stage from its payload ratio (eq. 16 inverted); it equals −dΔV/d ln η of that stage. */
export const lamOf = (eta, c, sigma) => (c * (1 - sigma) * eta) / (eta + sigma * (1 - eta));

/**
 * Optimum two-stage design, each stage with its own specific impulse.
 * Inputs: dv (required ideal velocity), Mpl (payload mass), c1, c2 (exhaust velocities), s1, s2 (structural efficiencies).
 * ΔV is concave in ln η₁ at fixed η_TOT, so below range.min — where the stationary point would need a payload ratio
 * above 1 — the best design is the other stage alone (single: the stage that carries everything).
 */
export function twoStage({ dv, Mpl, c1, c2, s1, s2 }) {
  const p = { c1, c2, s1, s2 }, range = velocityRange(p);
  let lam, eta1, eta2, single = 0;
  if (dv < range.min) {
    single = range.empty === 1 ? 2 : 1;
    const [c, s] = single === 1 ? [c1, s1] : [c2, s2], eta = (Math.exp(-dv / c) - s) / (1 - s);
    [eta1, eta2] = single === 1 ? [eta, 1] : [1, eta];
    lam = lamOf(eta, c, s);
  } else {
    lam = multiplier(dv, p); eta1 = etaOf(lam, c1, s1); eta2 = etaOf(lam, c2, s2);
  }
  const etaTot = eta1 * eta2;
  return {
    lam, eta1, eta2, etaTot, range, single, ...masses(Mpl, eta1, eta2, s1, s2),
    mu1: 1 / (eta1 + s1 * (1 - eta1)), mu2: 1 / (eta2 + s2 * (1 - eta2)), dv1: stageDV(c1, s1, eta1), dv2: stageDV(c2, s2, eta2),
  };
}

/**
 * Closed form for a common specific impulse (eqs. 18–20 with N = 2): exhaust velocity c for both stages.
 * Valid while exp(−ΔV/2c) > √(σ₁σ₂); the multiplier from eq. 16 is λ = cR/(1 + R), R = √(η_TOT(1−σ₁)(1−σ₂)/(σ₁σ₂)).
 */
export function commonIsp({ dv, Mpl, c, s1, s2 }) {
  const q = Math.sqrt(s1 * s2), k = (1 - s1) * (1 - s2);
  const etaTot = (Math.exp(-dv / (2 * c)) - q) ** 2 / k, R = Math.sqrt((etaTot * k) / (s1 * s2));
  const eta1 = (s1 / (1 - s1)) * R, eta2 = (s2 / (1 - s2)) * R;
  return { etaTot, lam: (c * R) / (1 + R), eta1, eta2, valid: Math.exp(-dv / (2 * c)) > q && eta1 < 1 && eta2 < 1, ...masses(Mpl, eta1, eta2, s1, s2) };
}
/** Maximum ideal velocity for a common specific impulse and total payload ratio (eq. 19 with N = 2). */
export const dvMaxCommon = (etaTot, c, s1, s2) => -2 * c * Math.log(Math.sqrt(s1 * s2) + Math.sqrt(etaTot * (1 - s1) * (1 - s2)));

/** Liftoff-to-payload mass of a single stage of exhaust velocity c and structural efficiency σ (∞ if out of reach). */
export function singleStageRatio(dv, c, sigma) {
  const eta = (Math.exp(-dv / c) - sigma) / (1 - sigma);
  return eta > 0 ? 1 / eta : Infinity;
}
