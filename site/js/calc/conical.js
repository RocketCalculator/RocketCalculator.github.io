// Supersonic flow at the tip of a pointed body: Mach angle, oblique shock, and the flow past a circular cone at zero
// incidence. Oblique-shock relations and the attachment limits from NACA Report 1135 (Ames Research Staff, 1953),
// eqs. 128–170 and figure 4. The cone flow (shock angle, surface Mach number and pressure) is found by integrating the
// conical-flow (Taylor–Maccoll) equation inward from the shock; it is checked against NACA 1135 charts 5 and 6.

const D2R = Math.PI / 180;

/** Mach angle μ = asin(1/M) (rad); NaN below M = 1. */
export const machAngle = (M) => (M >= 1 ? Math.asin(1 / M) : NaN);

/** Stream deflection δ behind an oblique shock of angle β (rad) at upstream Mach M. */
export function deflection(M, beta, g = 1.4) {
  const s2 = Math.sin(beta) ** 2;
  return Math.atan((2 / Math.tan(beta)) * (M * M * s2 - 1) / (M * M * (g + Math.cos(2 * beta)) + 2));
}

/** State behind an oblique shock: pressure ratio, Mach number, deflection. */
export function obliqueShock(M, beta, g = 1.4) {
  const Mn = M * Math.sin(beta), d = deflection(M, beta, g);
  const p21 = 1 + ((2 * g) / (g + 1)) * (Mn * Mn - 1);
  const Mn2 = Math.sqrt((1 + ((g - 1) / 2) * Mn * Mn) / (g * Mn * Mn - (g - 1) / 2));
  return { p21, M2: Mn2 / Math.sin(beta - d), delta: d };
}

/**
 * Integrate the Taylor–Maccoll equation inward from a shock of angle β; returns the cone half-angle where the
 * polar velocity vanishes, and the surface Mach number there. Velocities are scaled by the limiting speed.
 */
function coneFromShock(M, beta, g) {
  const sh = obliqueShock(M, beta, g), th = beta - sh.delta;
  const V = 1 / Math.sqrt(2 / ((g - 1) * sh.M2 * sh.M2) + 1);
  let y = [V * Math.cos(th), -V * Math.sin(th)], t = beta;
  const f = (t, [vr, vt]) => {
    const A = ((g - 1) / 2) * (1 - vr * vr - vt * vt);
    return [vt, (vt * vt * vr - A * (2 * vr + vt / Math.tan(t))) / (A - vt * vt)];
  };
  const h = -Math.min(1e-3, beta / 400);
  for (let k = 0; k < 200000 && t > 1e-6; k++) {
    const k1 = f(t, y), y2 = y.map((v, i) => v + (h / 2) * k1[i]), k2 = f(t + h / 2, y2), y3 = y.map((v, i) => v + (h / 2) * k2[i]);
    const k3 = f(t + h / 2, y3), y4 = y.map((v, i) => v + h * k3[i]), k4 = f(t + h, y4);
    const yn = y.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    if (yn[1] >= 0) {                                   // polar velocity crosses zero: the cone surface
      const fr = -y[1] / (yn[1] - y[1]), vr = y[0] + fr * (yn[0] - y[0]);
      const Mc = Math.sqrt((2 / (g - 1)) * (vr * vr) / (1 - vr * vr));
      return { cone: t + fr * h, Mc, sh };
    }
    y = yn; t += h;
  }
  return { cone: 0, Mc: sh.M2, sh };
}

/** Pressure coefficient (p − p∞)/q∞ from the static-pressure ratio p/p∞. */
const cpOf = (pr, M, g) => (2 / (g * M * M)) * (pr - 1);

/** Surface state of a cone from its shock: pressure ratio p_c/p∞ (isentropic from just behind the shock). */
function surface(M, r, g) {
  const k = (g - 1) / 2, pc = r.sh.p21 * ((1 + k * r.sh.M2 ** 2) / (1 + k * r.Mc ** 2)) ** (g / (g - 1));
  return { pr: pc, cp: cpOf(pc, M, g), Mc: r.Mc };
}

const MAXC = new Map();
/** Largest cone half-angle with an attached shock at Mach M (rad), and the shock angle there (cached). */
export function maxCone(M, g = 1.4) {
  const key = `${M}/${g}`;
  if (!MAXC.has(key)) { if (MAXC.size > 200) MAXC.delete(MAXC.keys().next().value); MAXC.set(key, maxConeRaw(M, g)); }
  return MAXC.get(key);
}
function maxConeRaw(M, g) {
  if (!(M > 1)) return { cone: 0, beta: Math.PI / 2 };
  const mu = Math.asin(1 / M);
  let best = { cone: 0, beta: mu };
  for (let i = 1; i < 30; i++) { const b = mu + ((Math.PI / 2 - mu) * i) / 30, c = coneFromShock(M, b, g).cone; if (c > best.cone) best = { cone: c, beta: b }; }
  // golden-section refine around the coarse maximum
  const step = (Math.PI / 2 - mu) / 30, gr = (Math.sqrt(5) - 1) / 2;
  let a = Math.max(mu + 1e-6, best.beta - step), b = Math.min(Math.PI / 2 - 1e-6, best.beta + step);
  let c = b - gr * (b - a), d = a + gr * (b - a), fc = coneFromShock(M, c, g).cone, fd = coneFromShock(M, d, g).cone;
  for (let k = 0; k < 28; k++) { if (fc > fd) { b = d; d = c; fd = fc; c = b - gr * (b - a); fc = coneFromShock(M, c, g).cone; } else { a = c; c = d; fc = fd; d = a + gr * (b - a); fd = coneFromShock(M, d, g).cone; } }
  return fc > fd ? { cone: fc, beta: c } : { cone: fd, beta: d };
}

/**
 * Flow past a cone of half-angle `cone` (rad) at Mach M, weak (attached) shock: { attached, beta (rad), cp, pr, Mc }.
 * Not attached when the cone is blunter than maxCone(M).
 */
export function coneFlow(M, cone, g = 1.4, mc = maxCone(M, g)) {
  if (!(M > 1)) return { attached: false };
  if (cone <= 1e-9) return { attached: true, beta: Math.asin(1 / M), cp: 0, pr: 1, Mc: M };
  if (cone > mc.cone) return { attached: false, maxCone: mc.cone };
  let lo = Math.asin(1 / M) + 1e-9, hi = mc.beta;
  for (let k = 0; k < 34; k++) { const mid = (lo + hi) / 2; if (coneFromShock(M, mid, g).cone < cone) lo = mid; else hi = mid; }
  const r = coneFromShock(M, (lo + hi) / 2, g);
  return { attached: true, beta: (lo + hi) / 2, ...surface(M, r, g), maxCone: mc.cone };
}

const TABLES = new Map();
/**
 * Cone table at Mach M by sweeping the shock angle from the Mach angle to detachment (weak branch): rows
 * [cone half-angle °, shock angle °, surface Cp], increasing in cone angle; maxDeg = detachment cone angle. Cached.
 */
export function coneTable(M, g = 1.4, n = 32) {
  const key = `${M.toFixed(4)}/${g}`;
  if (TABLES.has(key)) return TABLES.get(key);
  const mc = maxCone(M, g), mu = Math.asin(1 / M), rows = [[0, mu / D2R, 0]];
  for (let i = 1; i <= n; i++) {
    const b = mu + (mc.beta - mu) * (i / n) ** 1.5, r = coneFromShock(M, b, g);
    if (r.cone > rows[rows.length - 1][0] * D2R) rows.push([r.cone / D2R, b / D2R, surface(M, r, g).cp]);
  }
  const t = { rows, rowsCp: rows.map((q) => [q[0], q[2]]), rowsBeta: rows.map((q) => [q[0], q[1]]), maxDeg: mc.cone / D2R };
  if (TABLES.size > 60) TABLES.delete(TABLES.keys().next().value);
  TABLES.set(key, t);
  return t;
}
/** Cone surface Cp table at Mach M ([[deg, cp], …] up to detachment). */
export const coneCpTable = (M, g = 1.4) => { const t = coneTable(M, g); return { rows: t.rowsCp, maxDeg: t.maxDeg }; };

/** Stagnation temperature and pressure ratios T₀/T, p₀/p (isentropic; NACA 1135 eqs. 43–44). */
export const stagT = (M, g = 1.4) => 1 + ((g - 1) / 2) * M * M;
export const stagP = (M, g = 1.4) => stagT(M, g) ** (g / (g - 1));
