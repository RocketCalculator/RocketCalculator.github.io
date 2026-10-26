// Modified Newtonian aerodynamics of blunt elements — C. P. Hoult, "Modified Newtonian Aerodynamics (rev.4)",
// RS&T memo, 06 April 2016. Lees' modification: the Newtonian 2cos²θ becomes C_PT cos²θ, with C_PT the pressure
// coefficient at the stagnation point behind a normal shock. Unit-free: any consistent length unit.

export const GAMMA = 1.4;
export const M_CRIT_CAP = 0.6;    // sphere critical Mach number (Hoerner 15-6): subsonic cap/cone drag faired to 0 here
export const M_CRIT_LE = 0.47;    // circular-cylinder critical cross-flow Mach number

/** Stagnation pressure coefficient C_PT = 2(p_T/p∞ − 1)/(γM²): Rayleigh pitot formula (NACA 1135 eq. 100) for M > 1,
 *  isentropic compression for M ≤ 1 (the two agree at M = 1). */
export function cpStagnation(M, g = GAMMA) {
  const ratio = M > 1
    ? ((0.5 * (g + 1) * M * M) ** (g / (g - 1))) * ((g + 1) / (2 * g * M * M - (g - 1))) ** (1 / (g - 1))
    : (1 + 0.5 * (g - 1) * M * M) ** (g / (g - 1));
  return (2 * (ratio - 1)) / (g * M * M);
}

/** Linear fairing from 0 at the critical Mach number to the Newtonian value at Mach 1 (memo's suggestion). */
export const fairing = (M, Mcrit) => (M >= 1 ? 1 : Math.max(0, (M - Mcrit) / (1 - Mcrit)));

/** Hemispherical cap of radius R covering 0 ≤ θ ≤ θM (θM = π/2: full hemisphere), at Mach M.
 *  Drag area (eq. 7), normal-force slope area (eq. 13) and centre of pressure behind the tip (eq. 17). */
export function noseCap(R, thetaM, M, g = GAMMA) {
  const f = fairing(M, M_CRIT_CAP), cpt = cpStagnation(Math.max(M, 1), g);
  const s = Math.sin(thetaM), c = Math.cos(thetaM), u = 2 * Math.sin(thetaM / 2) ** 2;   // u = 1 − cos θM without cancellation
  const CDS = f * Math.PI * R * R * (cpt / 2) * s * s * (1 + c * c);                      // (1 − cos⁴θM) = sin²θM (1 + cos²θM)
  const CNaS = f * Math.PI * R * R * (cpt / 2) * s ** 4;
  // eq. (17) rewritten in u: the bracket of eq. (16) is (2/3)u³ − (3/4)u⁴ + (1/5)u⁵, so no terms cancel for small θM
  const xcp = (R * 4 * u * (2 / 3 - (3 * u) / 4 + (u * u) / 5)) / (2 - u) ** 2;
  return { cpt: cpStagnation(M, g), CDS, CNaS, xcp, faired: f < 1 };
}

/** Conical segment from forward radius r1 to aft radius r2 over length L (r1 = 0: pointed cone).
 *  C_PC = C_PT sin²δ (eq. 23); drag area C_PC·π(r2² − r1²) (eq. 24); normal-force slope area from eq. (27)
 *  integrated over the frustum, π C_PT sinδ cosδ L (r1 + r2) (eq. 28 for a pointed cone); CP from the forward face. */
export function coneSegment(r1, r2, L, M, g = GAMMA) {
  const f = fairing(M, M_CRIT_CAP), cpt = cpStagnation(Math.max(M, 1), g);
  const delta = Math.atan2(r2 - r1, L);
  const cpc = cpt * Math.sin(delta) ** 2;
  const CDS = f * cpc * Math.PI * (r2 * r2 - r1 * r1);
  const CNaS = f * Math.PI * cpt * Math.sin(delta) * Math.cos(delta) * L * (r1 + r2);
  const xcp = r1 + r2 > 0 ? (L * (r1 + 2 * r2)) / (3 * (r1 + r2)) : (2 * L) / 3;
  return { delta, cpc: f * cpc, CDS, CNaS, xcp, faired: f < 1 };
}

/** Flat face of diameter D: C_D = C_PT supersonic (eq. 1, within 4 % of data), 0.85(1 + ¼(M² + M⁴)) subsonic (eq. 29). */
export function flatFace(D, M, g = GAMMA) {
  const CD = M >= 1 ? cpStagnation(M, g) : 0.85 * (1 + 0.25 * (M * M + M ** 4));
  return { CD, CDS: (CD * Math.PI * D * D) / 4 };
}

/** Hemicylindrical leading edge of radius R and length l, swept Λ: drag area (4/3) R l C_PT(M_N) cos³Λ per panel,
 *  with M_N = M cos Λ (eqs. 2, 3, 19–22); subsonic cross flow faired to 0 at M_N = 0.47. */
export function leadingEdge(R, l, sweep, M, g = GAMMA) {
  const MN = M * Math.cos(sweep);
  const f = fairing(MN, M_CRIT_LE), cpt = cpStagnation(Math.max(MN, 1), g);
  return { MN, cpt: cpStagnation(MN, g), CDS: (f * 4 * R * l * cpt * Math.cos(sweep) ** 3) / 3, faired: f < 1 };
}

/**
 * Whole set. p = { M, Sref, cap?: {R, thetaM}, cone?: {r1, r2, L}, flat?: {D}, le?: {N, R, l, sweep} } (angles in rad).
 * Coefficients are referred to Sref.
 */
export function newtonian(p) {
  const { M, Sref } = p;
  const cap = p.cap ? noseCap(p.cap.R, p.cap.thetaM, M) : null;
  const cone = p.cone ? coneSegment(p.cone.r1, p.cone.r2, p.cone.L, M) : null;
  const flat = p.flat ? flatFace(p.flat.D, M) : null;
  const le = p.le ? leadingEdge(p.le.R, p.le.l, p.le.sweep, M) : null;
  const noseCDS = (cap?.CDS || 0) + (cone?.CDS || 0) + (flat?.CDS || 0);
  const finCDS = le ? p.le.N * le.CDS : 0;
  return {
    cpt: cpStagnation(M), cap, cone, flat, le,
    noseCDS, finCDS, CDS: noseCDS + finCDS,
    CDnose: noseCDS / Sref, CDfins: finCDS / Sref, CD: (noseCDS + finCDS) / Sref,
    CNaCap: cap ? cap.CNaS / Sref : 0, CNaCone: cone ? cone.CNaS / Sref : 0,
  };
}

/** Sphere-cone geometry from what the builder measures: tip radius rn, nose length L (tip to shoulder), body radius R.
 *  The cap is tangent to the cone through the shoulder (L, R): R cosδ − (L − rn) sinδ = rn. rn = 0 is a pointed cone,
 *  rn = R (with L ≥ R) a hemisphere ahead of the body. Needs 0 ≤ rn ≤ R. Returns the cone half-angle δ, the cap angle
 *  θM = 90° − δ, the cap base radius r1 and station xJ, and the cone length Lc = L − xJ. */
export function sphereCone(rn, L, R) {
  const delta = Math.max(0, Math.acos(Math.min(1, rn / Math.hypot(R, L - rn))) - Math.atan2(L - rn, R));
  const xJ = rn * (1 - Math.sin(delta));
  return { delta, thetaM: Math.PI / 2 - delta, r1: rn * Math.cos(delta), xJ, Lc: Math.max(0, L - xJ) };
}

/**
 * Modified Newtonian surface pressure along a nose, C_P = C_PT cos²θ (θ: surface normal to the flow), and the drag
 * area accumulated from the tip. nose = { cap?: {R, thetaM}, cone?: {r1, r2, L, x0}, flat?: {D} } (cone starts at
 * station x0). Values carry the same subsonic fairing as the drag areas. Returns [[x, r, Cp, CDS so far], …].
 */
export function noseSurface(nose, M, n = 60, g = GAMMA) {
  const f = fairing(M, M_CRIT_CAP), cpt = f * cpStagnation(Math.max(M, 1), g), out = [];
  let acc = 0;
  if (nose.flat) {
    const cd = flatFace(nose.flat.D, M, g).CD;
    out.push([0, 0, cd, 0], [0, nose.flat.D / 2, cd, (acc = (cd * Math.PI * nose.flat.D ** 2) / 4)]);
  }
  if (nose.cap) {
    const { R, thetaM } = nose.cap;
    for (let i = 0; i <= n; i++) {
      const th = (thetaM * i) / n, c = Math.cos(th), r = R * Math.sin(th);
      acc = Math.PI * R * R * (cpt / 2) * (1 - c ** 4);   // eq. (7) up to θ
      out.push([R * (1 - c), r, cpt * c * c, acc]);
    }
  }
  if (nose.cone && nose.cone.r2 > nose.cone.r1) {
    const { r1, r2, L, x0 = 0 } = nose.cone, cp = cpt * Math.sin(Math.atan2(r2 - r1, L)) ** 2, a0 = acc;
    for (let i = 0; i <= n; i++) {
      const r = r1 + ((r2 - r1) * i) / n;
      out.push([x0 + (L * i) / n, r, cp, (acc = a0 + cp * Math.PI * (r * r - r1 * r1))]);
    }
  }
  return out;
}
