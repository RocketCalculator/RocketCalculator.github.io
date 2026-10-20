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
