// Tangent-ogive nose geometry — C. P. Hoult, "Ogive Nose" (RS&T memo, 06 May 2011); workbook "Ogive Profile.xls".
// Unit-free: any consistent length unit (the workbook uses inches).
//   x : measured from the base toward the tip (memo convention); body station = L − x from the tip.

/** Defining-circle radius a = (L² + R²) / 2R. */
export const circleRadius = (R, L) => (L * L + R * R) / (2 * R);

/** Local radius at distance x forward of the base: r = R − a + √(a² − x²). */
export function radiusAt(R, L, x) {
  const a = circleRadius(R, L);
  return R - a + Math.sqrt(Math.max(0, a * a - x * x));
}

/** Wetted (lateral) area S = 2πa[(R − a)·asin(L/a) + L]. */
export function wettedArea(R, L) {
  const a = circleRadius(R, L);
  return 2 * Math.PI * a * ((R - a) * Math.asin(L / a) + L);
}

/** First moment of the wetted area about the base: M = 2πa[L²/2 + (R − a)(a − √(a² − L²))]. */
export function areaMoment(R, L) {
  const a = circleRadius(R, L);
  return 2 * Math.PI * a * (L * L / 2 + (R - a) * (a - Math.sqrt(a * a - L * L)));
}

/** Wetted area between the tip and body station xs (memo's dS integrated from x = L − xs to L). */
export function wettedAreaToStation(R, L, xs) {
  const a = circleRadius(R, L), x = L - xs;
  return 2 * Math.PI * a * ((L - x) + (R - a) * (Math.asin(L / a) - Math.asin(x / a)));
}

/**
 * Full evaluation.
 * @param {{R:number, L:number, dx:number, t?:number, rho?:number}} p
 *   R base radius, L length, dx profile increment; optional shell wall thickness t and material density rho.
 */
export function ogive({ R, L, dx, t = 0, rho = 0 }) {
  const a = circleRadius(R, L);
  const S = wettedArea(R, L);
  const M = areaMoment(R, L);
  const xbar = L - M / S;                       // area centroid, body station from the nose tip
  const profile = [];
  const n = Math.max(1, Math.round(L / dx));
  for (let i = 0; i <= n; i++) {
    const x = Math.min(L, i * dx);
    const y = Math.sqrt(Math.max(0, a * a - x * x));
    profile.push({ x, y, station: L - x, r: R - a + y });
    if (x >= L) break;
  }
  if (profile.at(-1).x < L) profile.push({ x: L, y: Math.sqrt(a * a - L * L), station: 0, r: 0 });
  const tipHalfAngle = Math.asin(L / a) * 180 / Math.PI;    // tangent angle at the tip, degrees
  const shellMass = t > 0 && rho > 0 ? S * t * rho : null;  // thin-shell estimate: wetted area × wall × density
  return { a, S, M, xbar, profile, tipHalfAngle, fineness: L / (2 * R), shellMass };
}
