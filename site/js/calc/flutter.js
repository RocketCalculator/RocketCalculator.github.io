// Fin flutter — D. J. Martin, NACA TN 4197 (1958), as restated and corrected by J. K. Bennett, "Fin Flutter Analysis
// Revisited (Again)", Apogee Components Peak of Flight newsletter 615 (2023). Native units: inches, psi, feet, °F,
// ft/s.
//
//   V_f = a √( G / ( DN A³ / ((t/c)³ (A + 2)) · (λ + 1)/2 · p/p₀ ) ),     DN = 24 ε κ p₀ / π
//
// A = b²/S of one exposed panel, t/c on the ROOT chord, λ = c_T/c_R, ε = centroid aft of the quarter chord as a
// fraction of the root chord (0.25 for symmetric planforms → Martin's DN = 39.3 psi). The "1.337" form quoted widely
// divides by two once more and overstates V_f by √2 (Bennett) — it is not used.

export const P0 = 14.696;          // sea-level pressure, psi (Bennett)
export const KAPPA = 1.4;          // ratio of specific heats of air
export const H_TROPO = 36089;      // ft; Bennett's equations hold below; above, the isothermal standard layer
const LAPSE = 0.00356;             // °F per ft (Bennett)

/** Standard-day air at h (ft MSL) for a sea-level temperature T_SL (°F; 59 is the standard day). */
export function air(h, TslF = 59) {
  const TtF = TslF - LAPSE * H_TROPO, pT = P0 * ((TtF + 459.7) / 518.7) ** 5.256;
  const TF = h <= H_TROPO ? TslF - LAPSE * h : TtF;
  const p = h <= H_TROPO ? P0 * ((TF + 459.7) / 518.7) ** 5.256 : pT * Math.exp((-32.174 * (h - H_TROPO)) / (1716 * (TtF + 459.7)));
  return { TF, p, pr: p / P0, a: 49.03 * Math.sqrt(TF + 459.7) };
}
/** Sea-level temperature (°F) of the standard lapse line through the launch-site temperature at elevation h0 (ft). */
export const seaLevelTemp = (TsiteF, h0) => TsiteF + LAPSE * Math.min(h0, H_TROPO);

/** Fin centroid C_x behind the root leading edge and ε (trapezoid with leading-edge sweep length m), after Bennett. */
export function centroid(cR, cT, m) {
  const Cx = (2 * cT * m + cT * cT + m * cR + cT * cR + cR * cR) / (3 * (cT + cR));
  return { Cx, eps: Cx / cR - 0.25 };
}
export const denominatorConstant = (eps) => (24 * eps * KAPPA * P0) / Math.PI;   // DN, psi

/**
 * Flutter speed at one altitude. { cR, cT, b, t, m = 0 (LE sweep length), G (psi), h (ft MSL), TslF }.
 * ε below 0.25 (centroid ahead of mid-chord) is raised to 0.25 — the conservative choice (DECISIONS.md D14).
 */
export function flutterSpeed({ cR, cT, b, t, m = 0, G, h, TslF = 59 }) {
  const S = ((cR + cT) * b) / 2, A = (b * b) / S, lam = cT / cR, tc = t / cR;
  const { Cx, eps: eps0 } = centroid(cR, cT, m), eps = Math.max(eps0, 0.25), DN = denominatorConstant(eps);
  const { TF, p, pr, a } = air(h, TslF);
  const den = ((DN * A ** 3) / (tc ** 3 * (A + 2))) * ((lam + 1) / 2) * pr;
  const Vf = a * Math.sqrt(G / den);
  return { S, A, lam, tc, Cx, eps0, eps, DN, TF, p, pr, a, den, Vf, Mf: Vf / a };
}

/** The altimetercloud.com form (read from its page code, 2026-10-25): no (A + 2) term → √(2/(A + 2)) × Martin. */
export function altimeterCloudForm({ cR, cT, b, t, G, h, TslF = 59 }) {
  const S = ((cR + cT) * b) / 2, A = (b * b) / S, lam = cT / cR, tc = t / cR, { p, a } = air(h, TslF);
  return a * Math.sqrt((G * tc ** 3) / (1.337 * A ** 3 * p * ((lam + 1) / 2)));
}

/**
 * The FLUTTER MARGIN1 workbook form (Hoult): t/c on the chord at 75 % span, DN fixed at 39.3, the pressure ratio
 * (1 − 0.0035662 h/T_SL)^5.2575 with T_SL in °R. Returns the flutter Mach number (and the pieces the workbook shows).
 */
export function houltWorkbook({ cR, cT, t, b, h, G, Tsl = 551.8 }) {
  const lam = cT / cR, S = ((cR + cT) * b) / 2, AR = (b * b) / S, c75 = cR / 4 + (3 * cT) / 4, tc = t / c75;
  const k = 32.174 / (1716 * 0.0035662);
  const pr = h <= H_TROPO ? (1 - (0.0035662 * h) / Tsl) ** k
    : ((Tsl - 0.0035662 * H_TROPO) / Tsl) ** k * Math.exp((-32.174 * (h - H_TROPO)) / (1716 * (Tsl - 0.0035662 * H_TROPO)));
  const X = (39.3 * AR ** 3) / (tc ** 3 * (AR + 2));
  return { lambda: lam, S, AR, c75, tc, X, pr, Mf: Math.sqrt(G / (X * ((lam + 1) / 2) * pr)) };
}

/**
 * Check a flight: points [{ h (ft AGL), V (ft/s) }] for a site at h0 (ft MSL) with T_SL (°F).
 * Returns per-point flutter speed and safety factor, and the worst (lowest SF) point.
 */
export function checkFlight(fin, points, { h0, TslF }) {
  const rows = points.map(({ h, V }) => { const o = flutterSpeed({ ...fin, h: h0 + h, TslF }); return { h, V, Vf: o.Vf, a: o.a, M: V / o.a, SF: V > 0 ? o.Vf / V : Infinity }; });
  const worst = rows.reduce((w, r) => (r.SF < w.SF ? r : w), rows[0]);
  return { rows, worst };
}

/** Design changes that reach a target safety factor at the worst point (others held fixed). */
export function remedies(fin, worst, { h0, TslF }, target) {
  const sf = (f) => flutterSpeed({ ...f, h: h0 + worst.h, TslF }).Vf / worst.V;
  const SF = sf(fin), r = target / SF;
  // V_f ∝ t^1.5 and ∝ √G exactly; the span enters through A and the area, so it is solved by bisection
  const tNeed = fin.t * r ** (2 / 3), Gneed = fin.G * r * r;
  let bMax = null;
  const f = (b) => sf({ ...fin, b }) - target;
  if (f(fin.b * 1e-3) > 0) {
    let lo = fin.b * 1e-3, hi = fin.b;
    while (f(hi) > 0 && hi < fin.b * 1e3) { lo = hi; hi *= 2; }
    if (f(hi) <= 0) { for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; } bMax = lo; }
  }
  return { SF, tNeed, Gneed, bMax };
}
