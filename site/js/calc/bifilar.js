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
