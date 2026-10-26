// Launcher settings for wind compensation — C. P. Hoult with A. Espinoza and E. Cortez, "Wind Compensation for Small
// Sounding Rockets", 7th and 8th IREC (2012, 2013), and the LAUNCHER ANGLES field tool.
// For a nearly vertical launch the impact displacements caused by in-plane wind, cross-plane wind and launcher tilt are
// independent and add. A zero-wind table of impact range against quadrant elevation QE (from a trajectory simulation)
// gives the tilt needed in each plane; the two small tilts then add as a vector:
//   tilt_T = √(tilt_I² + tilt_C²),  QE_T = 90° − tilt_T,  AZ_T = AZ + tan⁻¹(tilt_C / tilt_I)
// Lengths in any one unit (the table and the displacements share it); angles in degrees.

const DEG = Math.PI / 180;

/**
 * Quadrant elevation that gives zero-wind impact range x, from rows [{ r, qe }] with r increasing from 0: linear
 * between rows; past the last row the slope is extrapolated as 2F_{n−1} − F_{n−2} (F = slope of each interval).
 */
export function qeForRange(table, x) {
  const n = table.length, slope = (i) => (table[i + 1].qe - table[i].qe) / (table[i + 1].r - table[i].r);
  let i = 0;
  while (i < n - 1 && table[i + 1].r <= x) i++;
  const F = i < n - 1 ? slope(i) : n >= 3 ? 2 * slope(n - 2) - slope(n - 3) : slope(n - 2);
  return { qe: table[i].qe + F * (x - table[i].r), extrapolated: x > table[n - 1].r, row: i, F };
}

/** Bearing (deg, 0–360) of a ground vector given its downrange (along AZ) and cross-range (right of AZ) parts. */
export const bearing = (AZ, along, right) => (((AZ + Math.atan2(right, along) / DEG) % 360) + 360) % 360;

/**
 * Full evaluation. { table: [{ r, qe }], WI (in-plane wind drift at QE = 90°, + downrange), WC (cross-plane drift,
 * + to the right of the azimuth), AZ (desired impact azimuth, deg), R (desired impact range) }.
 */
export function windComp({ table, WI, WC, AZ, R }) {
  // in plane the tilt supplies what the wind does not: R − W_I (negative: tilt back, upwind of the azimuth)
  const dI = R - WI, inP = qeForRange(table, Math.abs(dI)), cross = qeForRange(table, Math.abs(WC));
  const tiltI = Math.sign(dI) * (90 - inP.qe), tiltC = -Math.sign(WC) * (90 - cross.qe);   // cross tilt opposes the drift
  const tilt = Math.hypot(tiltI, tiltC);
  return {
    dI, qeI: inP.qe, qeC: cross.qe, lookI: inP, lookC: cross, tiltI, tiltC, tilt, QE: 90 - tilt,
    AZT: tilt > 0 ? bearing(AZ, tiltI, tiltC) : AZ,
    // angle between the tilt and the azimuth line, as in the field tool (0–90°)
    offAxis: tilt > 0 ? Math.atan2(Math.abs(tiltC), Math.abs(tiltI)) / DEG : 0,
    extrapolated: inP.extrapolated || cross.extrapolated,
    // signed in-plane and cross-plane launcher QEs of the field tool (negative: tilted the other way)
    qeIs: Math.sign(dI || 1) * inP.qe, qeCs: (WC > 0 ? -1 : 1) * cross.qe,
    driftRange: Math.hypot(WI, WC), driftAz: bearing(AZ, WI, WC),
  };
}

/** Inverse of qeForRange: the zero-wind range of a launcher at elevation qe (bisection, ranges up to 2× the last run). */
export function rangeForQE(table, qe) {
  if (qe >= 90) return 0;
  let lo = 0, hi = 2 * table.at(-1).r;
  if (qeForRange(table, hi).qe > qe) return hi;
  for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (qeForRange(table, m).qe > qe) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/**
 * Desired range nearest to p.R whose launcher tilt is at most tmax (deg), or null when no range along this azimuth is
 * reachable within tmax (the cross-plane tilt alone exceeds it). The tilt is least where R = W_I (no in-plane tilt)
 * and grows with |R − W_I| on either side, so it is bisected between p.R and max(0, W_I).
 */
export function rangeForTilt(p, tmax) {
  const tiltAt = (R) => windComp({ ...p, R }).tilt;
  if (tiltAt(p.R) <= tmax) return p.R;
  const best = Math.max(0, p.WI);
  if (tiltAt(best) > tmax) return null;
  let ok = best, bad = p.R;
  for (let k = 0; k < 60; k++) { const m = (ok + bad) / 2; if (tiltAt(m) <= tmax) ok = m; else bad = m; }
  return ok;
}
