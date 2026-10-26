// Supersonic single-wedge airfoil — C. P. Hoult, "Supersonic Single Wedge Airfoil", RS&T memo, 20 March 2013.
// Busemann's expansion of the oblique-shock pressure coefficient (NACA Report 1135, eq. 152),
//   C_P = C1 θ + C2 θ² + C3 θ³,
// differentiated at the wedge half-angle δ gives the normal-force slope of a single wedge (pointed edge forward) as a
// multiple of the flat-plate (Ackeret) value. All quantities are in the plane normal to the leading edge.

export const GAMMA = 1.4;
export const M_VALID = 1.7;   // the memo: use the expansion only above this normal Mach number

/** Busemann coefficients for normal Mach number M > 1. */
export function busemann(M, g = GAMMA) {
  const b = M * M - 1;
  const H = (g + 1) * M ** 4 - 4 * b;
  const I = ((g + 1) ** 2 * M ** 8) / 16 - ((7 + 12 * g - 3 * g * g) * M ** 6) / 12 + (3 * (g + 1) * M ** 4) / 2 - 2 * M * M + 4 / 3;
  return { beta2: b, H, I, C1: 2 / Math.sqrt(b), C2: H / (2 * b * b), C3: I / b ** 3.5 };
}

/** Pressure coefficient on a surface deflected θ (rad) into the flow, to the given order (1 Ackeret, 2, 3 Busemann). */
export function cpSeries(M, theta, order = 3) {
  const c = busemann(M);
  return c.C1 * theta + (order >= 2 ? c.C2 * theta ** 2 : 0) + (order >= 3 ? c.C3 * theta ** 3 : 0);
}

/** Normal-force slope ratio single wedge / flat plate: [C_P'(δ)]/C1 = 1 + 2(C2/C1)δ + 3(C3/C1)δ² (eqs. 2–3). */
export function multiplier(M, delta, order = 3) {
  const c = busemann(M);
  return 1 + (order >= 2 ? (2 * c.C2 * delta) / c.C1 : 0) + (order >= 3 ? (3 * c.C3 * delta * delta) / c.C1 : 0);
}

/** Flow deflection (rad) produced by a shock at angle β (θ–β–M relation). */
export function deflection(M, beta, g = GAMMA) {
  const s2 = Math.sin(beta) ** 2;
  return Math.atan((2 / Math.tan(beta)) * ((M * M * s2 - 1) / (M * M * (g + Math.cos(2 * beta)) + 2)));
}

/** Largest deflection with an attached shock, and the shock angle where it occurs (golden-section search). */
export function maxDeflection(M, g = GAMMA) {
  let a = Math.asin(1 / M), b = Math.PI / 2;
  const r = (Math.sqrt(5) - 1) / 2;
  let x1 = b - r * (b - a), x2 = a + r * (b - a);
  for (let i = 0; i < 120; i++) {
    if (deflection(M, x1, g) > deflection(M, x2, g)) { b = x2; x2 = x1; x1 = b - r * (b - a); } else { a = x1; x1 = x2; x2 = a + r * (b - a); }
  }
  const beta = (a + b) / 2;
  return { theta: deflection(M, beta, g), beta };
}

/** Exact weak oblique shock for deflection θ: { beta, cp }, or null when the shock detaches. */
export function obliqueShock(M, theta, g = GAMMA) {
  if (M <= 1) return null;
  const top = maxDeflection(M, g);
  if (theta > top.theta) return null;
  if (theta <= 0) return { beta: Math.asin(1 / M), cp: 0 };
  let lo = Math.asin(1 / M), hi = top.beta;                 // θ rises monotonically from 0 to θmax on the weak branch
  for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (deflection(M, m, g) < theta) lo = m; else hi = m; }
  const beta = (lo + hi) / 2;
  return { beta, cp: (4 * (M * M * Math.sin(beta) ** 2 - 1)) / ((g + 1) * M * M) };
}

/** Multiplier from the exact shock relations (central difference of the exact C_P at δ), null if detached. */
export function exactMultiplier(M, delta, h = 1e-5) {
  const up = obliqueShock(M, delta + h), dn = obliqueShock(M, Math.max(0, delta - h));
  if (!up || !dn) return null;
  return (up.cp - dn.cp) / ((delta + h - Math.max(0, delta - h)) * busemann(M).C1);
}

/** Wave-drag increment over a flat plate, on the planform area normal to the edge: both faces, 2δ·C_P(δ) (eq. 4). */
export const waveDrag = (M, delta, order = 3) => 2 * delta * cpSeries(M, delta, order);

/**
 * Full evaluation. p = { M, delta, sweep (rad), N?, S? (one panel), Sref? }.
 * Streamwise values use simple sweep theory: forces scale with q_N = q cos²Λ, the drag component with a further cos Λ.
 */
export function singleWedge({ M, delta, sweep = 0, N = 0, S = 0, Sref = 0 }) {
  const MN = M * Math.cos(sweep);
  const supersonic = MN > 1;
  const limit = supersonic ? maxDeflection(MN) : null;
  const attached = supersonic && delta <= limit.theta;
  const K = supersonic ? multiplier(MN, delta) : 1;
  const K2 = supersonic ? multiplier(MN, delta, 2) : 1;
  const Kexact = attached ? exactMultiplier(MN, delta) : null;
  const shock = attached ? obliqueShock(MN, delta) : null;
  const CDwN = supersonic ? waveDrag(MN, delta) : 0;
  const CDw = CDwN * Math.cos(sweep) ** 3;
  const CNaFlat = supersonic ? 4 / Math.sqrt(MN * MN - 1) : null;
  return {
    MN, supersonic, attached, valid: MN >= 1.7, K, K2, Kexact, thetaMax: limit?.theta ?? null, shockAngle: shock?.beta ?? null,
    cpFace: supersonic ? cpSeries(MN, delta) : null, CNaFlat, CNaWedge: CNaFlat != null ? K * CNaFlat : null,
    CDwN, CDw, CDvehicle: Sref > 0 ? (N * S * CDw) / Sref : null,
  };
}

// ---- Shock–expansion theory (NACA Report 1135): each face of the section takes the exact oblique shock (compression)
// or Prandtl–Meyer expansion (eqs. 171–173) for its turning angle; "if the angle of attack exceeds the semivertex angle
// of the wedge, the flow over the upper (leeward) surface is given by a Prandtl-Meyer expansion" (p. 624).

/** Prandtl–Meyer angle ν(M) (rad), eq. 171c. */
export function prandtlMeyer(M, g = GAMMA) {
  if (!(M >= 1)) return 0;
  const k = Math.sqrt((g + 1) / (g - 1)), b = Math.sqrt(M * M - 1);
  return k * Math.atan(b / k) - Math.atan(b);
}
/** Maximum Prandtl–Meyer angle (M → ∞), eq. 172: 130.45° for γ = 1.4. */
export const nuMax = (g = GAMMA) => (Math.sqrt((g + 1) / (g - 1)) - 1) * (Math.PI / 2);
/** Mach number for a Prandtl–Meyer angle (bisection on eq. 171c). */
export function machFromNu(nu, g = GAMMA) {
  let lo = 1, hi = 2;
  while (prandtlMeyer(hi, g) < nu && hi < 1e6) hi *= 2;
  for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (prandtlMeyer(m, g) < nu) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
const pRatioIsen = (M1, M2, g) => ((1 + ((g - 1) / 2) * M1 * M1) / (1 + ((g - 1) / 2) * M2 * M2)) ** (g / (g - 1));

/**
 * Flow behind a surface that turns the stream by θ (rad; > 0 into the flow) at Mach M: { kind, beta, p (p2/p1), M2, pt
 * (total-pressure ratio), T (T2/T1), cp }, or { kind: 'detached' }. Shock: eqs. 128–145; expansion: eqs. 171–173.
 */
export function turn(M, theta, g = GAMMA) {
  if (theta > 0) {
    const sh = obliqueShock(M, theta, g);
    if (!sh) return { kind: 'detached', thetaMax: maxDeflection(M, g).theta };
    const Mn = M * Math.sin(sh.beta), p = 1 + ((2 * g) / (g + 1)) * (Mn * Mn - 1);
    const Mn2 = Math.sqrt((1 + ((g - 1) / 2) * Mn * Mn) / (g * Mn * Mn - (g - 1) / 2)), M2 = Mn2 / Math.sin(sh.beta - theta);
    const rho = ((g + 1) * Mn * Mn) / ((g - 1) * Mn * Mn + 2), T = p / rho;
    const pt = (rho ** (g / (g - 1))) * ((g + 1) / (2 * g * Mn * Mn - (g - 1))) ** (1 / (g - 1));   // eq. 142
    return { kind: 'shock', beta: sh.beta, p, M2, pt, T, cp: (2 / (g * M * M)) * (p - 1) };
  }
  if (theta === 0) return { kind: 'none', beta: Math.asin(1 / M), p: 1, M2: M, pt: 1, T: 1, cp: 0 };
  const nu2 = prandtlMeyer(M, g) - theta;                    // turning away from the flow: expansion by |θ|
  if (nu2 >= nuMax(g)) return { kind: 'vacuum', p: 0, M2: Infinity, pt: 1, T: 0, cp: -2 / (g * M * M) };
  const M2 = machFromNu(nu2, g), p = pRatioIsen(M, M2, g);
  return { kind: 'expansion', mu1: Math.asin(1 / M), mu2: Math.asin(1 / M2), p, M2, pt: 1, T: p ** ((g - 1) / g), cp: (2 / (g * M * M)) * (p - 1) };
}

/**
 * Single-wedge section (sharp leading edge, faces at ±δ to the chord, blunt base of thickness 2c·tanδ) at angle of
 * attack α, Mach M (all normal to the edge). Coefficients on the chord: C_N = C_p,lower − C_p,upper,
 * C_A = (C_p,lower + C_p,upper − 2C_p,base)·tanδ; lift and drag in wind axes. Linear (Ackeret) values for comparison.
 */
export function wedgeSection(M, delta, alpha, cpBase = 0, g = GAMMA) {
  const lower = turn(M, delta + alpha, g), upper = turn(M, delta - alpha, g);
  const ok = lower.kind !== 'detached' && upper.kind !== 'detached';
  const CN = ok ? lower.cp - upper.cp : null, CA = ok ? (lower.cp + upper.cp - 2 * cpBase) * Math.tan(delta) : null;
  const CL = ok ? CN * Math.cos(alpha) - CA * Math.sin(alpha) : null, CD = ok ? CN * Math.sin(alpha) + CA * Math.cos(alpha) : null;
  const b = Math.sqrt(M * M - 1);
  return { lower, upper, ok, CN, CA, CL, CD, LD: ok && CD > 0 ? CL / CD : null,
    lin: { CN: (4 * alpha) / b, CD: (4 * (alpha * alpha + delta * delta)) / b }, thetaMax: maxDeflection(M, g).theta, mu: Math.asin(1 / M), nu: prandtlMeyer(M, g) };
}
