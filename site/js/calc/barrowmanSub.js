// Subsonic normal-force slope and centre of pressure — workbook SUBSONIC BARROWMAN EQUATIONS2.4.xls (single fin set),
// memos "Barrowman Equations" (2010), "Normal Force Acting on a Hemispherical Nose Tip" (2010); NACA TN-2335 (Diederich)
// and NACA Report 1307 (Pitts, Nielsen & Kaattari) interference factors. Lengths in inches (any consistent unit).

/**
 * Body of revolution by slender-body theory, segment by segment.
 * profile: [{x, r}] from the nose (x = 0) aft. If r0 > 0, a tangent hemispherical cap (or a flat face) is fitted.
 */
export function bodySlender(profile, { Sref, flatNose, M, d }) {
  const pts = profile;
  const r0 = pts[0].r;
  const segs = [];
  let thetaT = null, Rh = null, cap = { CNa: 0, xcp: 0 };
  if (r0 > 0) {
    thetaT = Math.PI / 2 - Math.atan((pts[1].r - pts[0].r) / (pts[1].x - pts[0].x));   // I19
    Rh = r0 / Math.sin(thetaT);                                                          // I21
    const s4 = Math.sin(thetaT) ** 4, c = Math.cos(thetaT);
    const xcpCap = Rh * (c - 1 + (s4 - 4 * ((c * s4) / 5 - (c * (Math.sin(thetaT) ** 2 + 2)) / 15 + 2 / 15)) / s4);  // N6, station of cap CP
    const CNa = flatNose ? 0 : (9 * Math.PI * Rh * Rh * s4) / (8 * Sref);               // L6
    cap = { CNa, xcp: xcpCap };
  }
  // Station-0 "area" is taken as half the cap cross-section, as in the workbook (K6 = πr0²/2).
  let Aprev = (Math.PI * r0 * r0) / 2, xprev = pts[0].x, rprev = r0;
  let CNa = cap.CNa, mom = cap.CNa * cap.xcp, vol = 0;
  for (let i = 1; i < pts.length; i++) {
    const { x, r } = pts[i];
    const A = Math.PI * r * r;
    const dCN = (2 * (A - Aprev)) / Sref;                                                  // L
    const V = (A * (x - xprev) * (Aprev / A + rprev / r + 1)) / 3;                        // M (frustum volume form)
    const xc = A === Aprev ? 0 : (x * A - xprev * Aprev - V) / (A - Aprev);                // N
    segs.push({ i, x0: xprev, x1: x, r0: rprev, r1: r, CNa: dCN, xcp: xc, vol: V });
    CNa += dCN; mom += dCN * xc; vol += V;
    Aprev = A; xprev = x; rprev = r;
  }
  // Flat-face pitching-moment term of the workbook (P6), added to the moment sum as published.
  const Cma_flat = r0 > 0 && flatNose ? -0.0054 * 0.85 * (1 + (M * M + M ** 4) / 4) * ((2 * r0) / d) : 0;
  return { CNa, mom, segs, cap, thetaT, Rh, Cma_flat, vol };
}

/** Body radius at station x by linear interpolation of the profile. */
export function radiusAt(profile, x) {
  if (x <= profile[0].x) return profile[0].r;
  for (let i = 1; i < profile.length; i++) if (x <= profile[i].x) {
    const a = profile[i - 1], b = profile[i];
    return a.r + ((b.r - a.r) * (x - a.x)) / (b.x - a.x);
  }
  return profile[profile.length - 1].r;
}

/** NACA 1307 slender-body interference factors for fin span ratio r/s (r body radius, s = r + exposed span). */
export function interference(r, s) {
  const t = r / s, u = s / r;
  const KWB = (2 * ((1 + t ** 4) * (Math.atan((u - t) / 2) / 2 + Math.PI / 4) - t * t * (u - t + 2 * Math.atan(t)))) / (Math.PI * (1 - t) ** 2);   // eq. (14)
  const KBW = ((1 - t * t) ** 2 - (2 / Math.PI) * ((1 + t ** 4) * (Math.atan((u - t) / 2) / 2 + Math.PI / 4) - t * t * (u - t + 2 * Math.atan(t)))) / (1 - t) ** 2;  // eq. (21)
  const q = u, as = Math.asin((q * q - 1) / (q * q + 1));
  const kWB = (Math.PI ** 2 * (q + 1) ** 2 / (4 * q * q) + (Math.PI * (q * q + 1) ** 2) / (q * q * (q - 1) ** 2) * as - (2 * Math.PI * (q + 1)) / (q * (q - 1))
    + ((q * q + 1) ** 2 / (q * q * (q - 1) ** 2)) * as * as - ((4 * (q + 1)) / (q * (q - 1))) * as + (8 / (q - 1) ** 2) * Math.log((q * q + 1) / (2 * q))) / Math.PI ** 2;   // eq. (19)
  return { KWB, KBW, kWB, kBW: KWB - kWB };                                              // eq. (33): kB(W) = KW(B) − kW(B)
}

/**
 * Station of the centre of pressure of the fin-on-body carry-over lift, NACA 1307 eq. (D6) as coded in workbook Z26.
 * For s < 2r the workbook's sqrt/acosh are imaginary; the product is real and equals the analytic continuation used here.
 */
export function carryoverCP({ xLE, cR, r, s, sweepC4 }) {
  const a = s - r;                     // exposed span
  let A, B;
  if (s > 2 * r + 1e-12) {
    const sq = Math.sqrt(s * (s - 2 * r)), ac = Math.acosh(a / r);
    A = sq * ac; B = ((a * r) / sq) * ac;
  } else if (s < 2 * r - 1e-12) {
    const sq = Math.sqrt(s * (2 * r - s)), ac = Math.acos(a / r);
    A = -sq * ac; B = ((a * r) / sq) * ac;
  } else { A = 0; B = a; }             // limit s → 2r: sq·acosh → 0, (a r / sq)·acosh → a
  return xLE + cR / 4 + a * Math.tan(sweepC4) * (r / (r - s) + (A - s + r + (Math.PI * r) / 2) / (B + (a * a) / r - (Math.PI * a) / 2));
}

/**
 * Fin set by Diederich's planform parameter with Prandtl–Glauert compressibility, plus body–fin interference.
 * fins: { N, xLE (root LE station), xTipLE (tip LE station), cR, cT, b (exposed semispan), tanBT (tan of boat-tail half angle under the fins) }
 */
export function finSet(fins, { M, Sref, rBody }) {
  const { N, xLE, xTipLE, cR, cT, b, tanBT = 0 } = fins;
  const S = (tanBT * cR * cR) / 2 + ((cR + cT) * (b - cR * tanBT)) / 2;                   // K26
  const Lq = b - (3 * cR * tanBT) / 4;                                                    // L26
  const AR = (2 * Lq * Lq) / S;                                                           // M26
  const sweepC4 = Math.atan((xTipLE + cT / 4 - xLE - cR / 4) / b);                        // N26
  const bc = Math.sqrt(1 - (M * Math.cos(sweepC4)) ** 2);
  const F = (AR * bc) / Math.cos(sweepC4);                                                // O26
  const CNaW = (2 * Math.PI * F * Math.cos(sweepC4)) / (bc * (F * Math.sqrt(1 + 4 / (F * F)) + 2));   // S26 (on panel-pair area)
  const r = rBody, s = r + b;                                                             // Q26, R26
  const mac = (2 * (cR + cT - (cR * cT) / (cR + cT))) / 3;                                // T26
  const CNaFins = (N / 2) * (S / Sref) * CNaW;                                            // U26
  const xcpFin = xLE + mac / 4 + ((cR + 2 * cT) * (xTipLE - xLE)) / (3 * (cR + cT));     // V26
  const k = interference(r, s);
  const CNaWB = CNaFins * k.KWB;                                                          // X26
  const xcpBW = carryoverCP({ xLE, cR, r, s, sweepC4 });                                  // Z26
  const CNa = CNaWB + CNaFins * k.KBW;                                                    // AA26
  const mom = xcpFin * CNaWB + CNaFins * k.KBW * xcpBW;                                   // AB26
  const xcp = mom / CNa;                                                                  // AC26
  const CNd = (k.kWB + k.kBW) * CNaW * (S / Sref);                                        // AT26 single-panel CNδ
  return { S, Lq, AR, sweepC4, F, CNaW, mac, CNaFins, xcpFin, ...k, CNaWB, xcpBW, CNa, mom, xcp, CNd, r, s };
}

/** Whole vehicle. p = { M, profile, flatNose, fins, xcg? } */
export function subsonicCP(p) {
  const rmax = Math.max(...p.profile.map((q) => q.r));
  const Sref = Math.PI * rmax * rmax, d = 2 * rmax;                                       // E6, F6
  const body = bodySlender(p.profile, { Sref, flatNose: p.flatNose, M: p.M, d });
  const rBody = radiusAt(p.profile, p.fins.xLE + p.fins.cR / 4);                          // Q26: radius at quarter root chord
  const fin = finSet(p.fins, { M: p.M, Sref, rBody });
  const CNa = body.CNa + fin.CNa;                                                         // Q6
  const Cma = body.Cma_flat + body.mom + fin.mom;                                         // R6 (moment about the nose, ×length)
  const xcp = Cma / CNa;                                                                  // S6
  const margin = p.xcg != null ? (xcp - p.xcg) / d : null;
  return { Sref, d, beta: Math.sqrt(1 - p.M * p.M), body, fin, CNa, Cma, xcp, margin, rmax };
}
