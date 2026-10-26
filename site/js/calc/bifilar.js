// Bifilar pendulum moment of inertia — C. P. Hoult, "Moment of Inertia Measurement with a Bifilar Pendulum"
// (RS&T memo, 11 June 2009). No workbook exists; all relations are the memo's. Units: any consistent set (SI used).

/**
 * @param {object} p  m mass, x1/x2 wire distances fore/aft of the CG, l wire length, PY measured yaw period,
 *                    PG measured Galilean (swing) period, g gravity, Lrod optional body length for the rod comparison.
 */
export function bifilar({ m, x1, x2, l, PY, PG, g, Lrod }) {
  const T1 = (m * g * x2) / (x1 + x2);                       // forward wire tension
  const T2 = (m * g * x1) / (x1 + x2);                       // aft wire tension
  const I_periods = (m * x1 * x2 * PY * PY) / (PG * PG);     // memo result, both periods measured
  const I_length = (m * g * x1 * x2 * PY * PY) / (4 * Math.PI ** 2 * l); // from ω_Y² = m g x1 x2 / (I l)
  const PG_theory = 2 * Math.PI * Math.sqrt(l / g);          // ω_G² = g / l
  const k = Math.sqrt(I_periods / m);                        // radius of gyration
  const ratio = PY / PG;
  const I_rod = Lrod > 0 ? (m * Lrod * Lrod) / 12 : null;    // uniform rod of the same mass and length
  return { T1, T2, I_periods, I_length, PG_theory, k, ratio, I_rod, PG_error: PG / PG_theory - 1 };
}

/** Predicted yaw period for a given inertia (design / planning). */
export const yawPeriod = ({ I, m, g, x1, x2, l }) => 2 * Math.PI * Math.sqrt((I * l) / (m * g * x1 * x2));
/** Period ratio P_Y/P_G = k / √(x1 x2). */
export const periodRatio = (k, x1, x2) => k / Math.sqrt(x1 * x2);

// ---- Measurement quality (not in the memo): first-order propagation of independent errors through
// I = m x1 x2 P_Y²/P_G², combined root-sum-square. A stopwatch run of N cycles with error dt gives dP = dt/N.

/** Relative uncertainty of I and each measurement's share (all as fractions). */
export function uncertainty({ m, x1, x2, PY, PG, dm, dx, dt, NY, NG }) {
  const mass = dm / m, fwd = dx / x1, aft = dx / x2, yaw = (2 * dt) / (NY * PY), swing = (2 * dt) / (NG * PG);
  return { mass, fwd, aft, dist: Math.hypot(fwd, aft), yaw, swing, timing: Math.hypot(yaw, swing), total: Math.hypot(mass, fwd, aft, yaw, swing) };
}

/** Fewest cycles to time in each mode for relative uncertainty u; null when the mass and distance errors alone exceed u. */
export function cyclesFor(p, u) {
  const floor = (p.dm / p.m) ** 2 + p.dx ** 2 * (1 / p.x1 ** 2 + 1 / p.x2 ** 2);
  if (floor >= u * u) return null;
  return Math.max(1, Math.ceil(Math.sqrt((4 * p.dt ** 2 * (1 / p.PY ** 2 + 1 / p.PG ** 2)) / (u * u - floor))));
}

/** Largest distance error for relative uncertainty u with the cycles already timed; null when timing and mass alone exceed u. */
export function distErrorFor(p, u) {
  const rest = u * u - (p.dm / p.m) ** 2 - ((2 * p.dt) / (p.NY * p.PY)) ** 2 - ((2 * p.dt) / (p.NG * p.PG)) ** 2;
  return rest > 0 ? Math.sqrt(rest / (1 / p.x1 ** 2 + 1 / p.x2 ** 2)) : null;
}

/** Factor to scale both wire distances by so that P_Y/P_G = r, for radius of gyration k (from P_Y²/P_G² = k²/x1x2). */
export const spacingScale = (k, x1, x2, r) => k / (r * Math.sqrt(x1 * x2));
