// Launcher rail tip-off deflection — C. P. Hoult, "Launcher Tipoff Deflection" (RS&T, 2010), for the CSULB launcher of
// F. Calderon et al., "A New Launcher for University Sounding Rockets" (AIAA student paper, 2011).
// The rail is a cantilever from its base; just before the rocket leaves, the transverse load F acts at the tip:
//   EI y'' = F(L − x)  ⇒  y'(L) = FL²/(2EI),  y(L) = FL³/(3EI),  both × a dynamic overshoot factor (memo: 2).
// Pitch load F = kTσ + W cos QE (weight component is fixed; thrust misalignment taken at k standard deviations);
// yaw load F = kTσ. Three-tube tower truss (tube OD D, wall t, face width d): I = A d²/2, A = πDt.
// Pounds and inches; angles in radians unless named …Deg.

const RAD = Math.PI / 180;

/** Second moment of area of a three-tube triangular truss of face width d (memo: I = A d²/2, A = πDt). */
export const towerI = (D, t, d) => (Math.PI * D * t * d * d) / 2;

/** Lateral loads (lbf): weight component in pitch, thrust misalignment at k σ. */
export function lateralLoads({ W, T, sigmaDeg, k, QE }) {
  const weight = W * Math.cos(QE * RAD), thrust = k * T * sigmaDeg * RAD;
  return { weight, thrust, pitch: weight + thrust, yaw: thrust };
}

/** Tip slope (rad) and tip deflection (in) of a cantilever of length L (in) under tip load F, × overshoot. */
export const tipSlope = (F, L, EI, factor = 2) => (factor * F * L * L) / (2 * EI);
export const tipDeflection = (F, L, EI, factor = 2) => (factor * F * L ** 3) / (3 * EI);

/** Longest rail (in) whose tip slope stays within allow (rad). */
export const maxLength = (F, EI, allow, factor = 2) => Math.sqrt((2 * EI * allow) / (factor * F));

/**
 * Full evaluation. { W (lbf), T (lbf), sigmaDeg, k, QE (deg), L (in), E (psi), section: 'tower' | 'custom',
 * D, t, d (in) or I (in⁴), factor, allowDeg }.
 */
export function launcher({ W, T, sigmaDeg, k, QE, L, E, section, D, t, d, I: Ic, factor, allowDeg }) {
  const I = section === 'tower' ? towerI(D, t, d) : Ic, EI = E * I, F = lateralLoads({ W, T, sigmaDeg, k, QE });
  const pitch = tipSlope(F.pitch, L, EI, factor), yaw = tipSlope(F.yaw, L, EI, factor), allow = allowDeg * RAD;
  return {
    I, EI, F, A: Math.PI * D * t,
    pitchDeg: pitch / RAD, yawDeg: yaw / RAD, totalDeg: Math.hypot(pitch, yaw) / RAD,
    tip: tipDeflection(F.pitch, L, EI, factor), Lmax: maxLength(F.pitch, EI, allow, factor),
  };
}
