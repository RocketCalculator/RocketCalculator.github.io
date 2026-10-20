// Tangent-ogive nose geometry — C. P. Hoult, "Ogive Nose" (RS&T memo, 06 May 2011); workbook "Ogive Profile.xls".
// Unit-free: any consistent length unit (the workbook uses inches).
//   x : measured from the base toward the tip (memo convention); body station = L − x from the tip.

/** Defining-circle radius a = (L² + R²) / 2R. */
export const circleRadius = (R, L) => (L * L + R * R) / (2 * R);

// The memo's closed forms subtract numbers of size a, which is huge for a slender nose (a ≈ L²/2R), so they are
// evaluated here in algebraically identical forms without that cancellation:
//   a − √(a² − x²) = x² / (a + √(a² − x²)),  a·asin(u) − a·u = a·g(u) with g(u) = asin u − u (series for small u).

/** g(u) = asin(u) − u, accurate for small u. */
export function asinMinusX(u) {
  if (Math.abs(u) > 0.05) return Math.asin(u) - u;
  const u2 = u * u;
  return u * u2 * (1 / 6 + u2 * (3 / 40 + u2 * (5 / 112 + u2 * (35 / 1152 + u2 * (63 / 2816)))));
}
const sag = (a, x) => (x * x) / (a + Math.sqrt(Math.max(0, a * a - x * x)));   // a − √(a² − x²)

/** Local radius at distance x forward of the base: r = R − a + √(a² − x²). */
export function radiusAt(R, L, x) {
  return R - sag(circleRadius(R, L), x);
}

/** Wetted (lateral) area S = 2πa[(R − a)·asin(L/a) + L]. */
export function wettedArea(R, L) {
  const a = circleRadius(R, L), u = L / a;
  return 2 * Math.PI * a * (R * Math.asin(u) - a * asinMinusX(u));
}

/** First moment of the wetted area about the base: M = 2πa[L²/2 + (R − a)(a − √(a² − L²))]. */
export function areaMoment(R, L) {
  const a = circleRadius(R, L), c = Math.sqrt(a * a - L * L), w = sag(a, L);
  return 2 * Math.PI * a * w * (R - (L * L) / (2 * (a + c)));
}

/** Wetted area between the tip and body station xs (memo's dS integrated from x = L − xs to L). */
export function wettedAreaToStation(R, L, xs) {
  const a = circleRadius(R, L), x = L - xs;
  return 2 * Math.PI * a * (R * (Math.asin(L / a) - Math.asin(x / a)) - a * (asinMinusX(L / a) - asinMinusX(x / a)));
}

/**
 * Full evaluation.
 * @param {{R:number, L:number, dx:number, t?:number, rho?:number}} p
 *   R base radius, L length, dx profile increment; optional shell wall thickness t and material density rho.
 */
export const MAX_POINTS = 2000;

export function ogive({ R, L, dx, t = 0, rho = 0 }) {
  const a = circleRadius(R, L);
  const S = wettedArea(R, L);
  const M = areaMoment(R, L);
  const xbar = L - M / S;                       // area centroid, body station from the nose tip
  const profile = [];
  const step = L / dx > MAX_POINTS ? L / MAX_POINTS : dx;   // never more than MAX_POINTS rows
  const n = Math.max(1, Math.round(L / step));
  for (let i = 0; i <= n; i++) {
    const x = Math.min(L, i * step);
    const y = Math.sqrt(Math.max(0, a * a - x * x));
    profile.push({ x, y, station: L - x, r: R - sag(a, x) });
    if (x >= L) break;
  }
  if (profile.at(-1).x < L) profile.push({ x: L, y: Math.sqrt(a * a - L * L), station: 0, r: 0 });
  const tipHalfAngle = Math.asin(L / a) * 180 / Math.PI;    // tangent angle at the tip, degrees
  const shellMass = t > 0 && rho > 0 ? S * t * rho : null;  // thin-shell estimate: wetted area × wall × density
  return { a, S, M, xbar, profile, step, tipHalfAngle, fineness: L / (2 * R), shellMass };
}
