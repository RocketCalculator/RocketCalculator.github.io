// Fin flutter margin — workbook FLUTTER MARGIN1.xls, implementing the bending-torsion flutter correlation of
// D. J. Martin, NACA TN-4197 (1958). Native units: inches, psi, feet.

/** Atmospheric pressure ratio used by the workbook: (1 − 0.0035662 h / T_SL)^(32.174 / (1716·0.0035662)). */
export const pressureRatio = (h, Tsl = 551.8) => (1 - (0.0035662 * h) / Tsl) ** (32.174 / (1716 * 0.0035662));

/** Geometric parameter X = 39.3 AR³ / ((t/c)³ (AR + 2)). */
export const Xparam = (AR, tc) => (39.3 * AR ** 3) / (tc ** 3 * (AR + 2));

/**
 * @param {{cR, cT, t, b, h, G, M, Tsl}} p  root/tip chord, thickness, exposed semispan (in); altitude MSL (ft);
 *        shear modulus (psi); flight Mach number; sea-level temperature used in the pressure ratio (°R, workbook 551.8).
 */
export function flutter({ cR, cT, t, b, h, G, M, Tsl = 551.8 }) {
  const lambda = cT / cR;                 // taper ratio
  const S = ((cR + cT) * b) / 2;          // panel area
  const AR = (b * b) / S;                 // panel aspect ratio
  const c75 = cR / 4 + (3 * cT) / 4;      // chord at 75 % semispan
  const X = Xparam(AR, t / c75);
  const pr = pressureRatio(h, Tsl);
  const Mf = Math.sqrt(G / ((X * (lambda + 1) / 2) * pr));   // flutter Mach number
  const MS = (Mf - M) / M;                                    // margin of safety
  // thickness at which Mf = M (MS = 0): invert Mf² = G / (X (λ+1)/2 · p/p0) for t
  const Xcrit = G / (M * M * ((lambda + 1) / 2) * pr);
  const tMin = c75 * Math.cbrt((39.3 * AR ** 3) / (Xcrit * (AR + 2)));
  return { lambda, S, AR, c75, X, pr, Mf, MS, tMin, tc: t / c75 };
}
