// Nose cone design: geometry of the classical shapes, tip blunting, slender-body lift and loads, subsonic pressure,
// supersonic tip shocks and pressure drag, skin friction and stagnation conditions.
// Shapes: G. A. Crowell, "The Descriptive Geometry of Nose Cones" (1996) — cone, bi-conic, tangent and secant ogive,
// elliptical, parabolic series (K′), power series (n), Haack series (C); the superellipse of Felkel/Hoult (optnose.js).
// Lift: slender-body loading (Munk; Hoult, "Barrowman Equations"), C_Nα = 2 on the base area, x_cp = L − V/A (Crowell).
// Subsonic pressure: Hoult's source model with Kármán–Tsien (nosepressure.js). Supersonic: cone flow (conical.js,
// NACA 1135) at the tip; pressure drag by the tangent-cone approximation (each element takes the pressure of a cone
// of its local slope) with Lees' modified Newtonian pressure where the slope is beyond shock attachment
// (cpt, as in Hoult's drag memo). Skin friction: Hoult's turbulent flat-plate law ("Drag Coefficient" memo). Lengths in inches.
import { superellipse } from './optnose.js';
import { nosePressure, cpStar } from './nosepressure.js';
import { coneFlow, maxCone, coneCpTable, machAngle, stagT } from './conical.js';
import { cpt, cfTurb, rhoAOverMu } from './drag.js';
import { interp } from './trajectory.js';
import { prandtlMeyer, machFromNu } from './wedge.js';

const D2R = Math.PI / 180;
/** Half-angle of the cone through the tip and the profile at 2 % of the length: the "tip angle" a real (slightly rounded) tip presents. */
export function tipAngle(pts, L) { const x = pts[0].x + 0.02 * L; return Math.atan2(radiusAt(pts, x) - pts[0].r, x - pts[0].x); }

export const SHAPES = [
  { value: 'cone', label: 'Conical', group: 'Simple' },
  { value: 'biconic', label: 'Bi-conic', group: 'Simple' },
  { value: 'ogive', label: 'Tangent ogive', group: 'Ogives' },
  { value: 'secant', label: 'Secant ogive', group: 'Ogives' },
  { value: 'ellipse', label: 'Elliptical', group: 'Blunt' },
  { value: 'power', label: 'Power series (xⁿ)', group: 'Blunt' },
  { value: 'parabolic', label: 'Parabolic series (K′)', group: 'Series' },
  { value: 'vonkarman', label: 'Von Kármán (Haack C = 0)', group: 'Series' },
  { value: 'lvhaack', label: 'LV-Haack (C = 1/3)', group: 'Series' },
  { value: 'haack', label: 'Haack series (any C)', group: 'Series' },
  { value: 'superellipse', label: 'Superellipse (subsonic optimum family)', group: 'Series' },
  { value: 'custom', label: 'Custom profile (enter points)', group: 'Your own' },
];

/** Radius at x (0 tip … L base). p: { k, pow, C, seN, bL (bi-conic first-cone length fraction), bR (its radius fraction), sRho (secant ρ / tangent ρ) }. */
export function shapeRadius(type, x, L, R, p = {}) {
  const t = Math.min(1, Math.max(0, x / L));
  switch (type) {
    case 'cone': return R * t;
    case 'biconic': { const L1 = (p.bL ?? 0.4) * L, R1 = (p.bR ?? 0.6) * R; return x <= L1 ? (R1 * x) / L1 : R1 + ((x - L1) * (R - R1)) / (L - L1); }
    case 'ogive': { const rho = (R * R + L * L) / (2 * R); return Math.sqrt(Math.max(0, rho * rho - (L - x) ** 2)) + R - rho; }
    case 'secant': {
      const rho = secantRho(L, R, p.sRho), a = Math.atan(R / L) - Math.acos(Math.sqrt(L * L + R * R) / (2 * rho));
      return Math.sqrt(Math.max(0, rho * rho - (x - rho * Math.cos(a)) ** 2)) + rho * Math.sin(a);
    }
    case 'ellipse': return R * Math.sqrt(Math.max(0, 1 - (1 - t) ** 2));
    case 'parabolic': { const k = p.k ?? 0.75; return (R * (2 * t - k * t * t)) / (2 - k); }
    case 'power': return R * t ** (p.pow ?? 0.5);
    case 'vonkarman': case 'lvhaack': case 'haack': {
      const C = type === 'lvhaack' ? 1 / 3 : type === 'haack' ? p.C ?? 0 : 0, th = Math.acos(1 - 2 * t);
      return (R / Math.sqrt(Math.PI)) * Math.sqrt(Math.max(0, th - Math.sin(2 * th) / 2 + C * Math.sin(th) ** 3));
    }
    case 'superellipse': return superellipse(x, L, R, p.seN ?? 2);
    default: throw new Error(`Unknown nose shape ${type}`);
  }
}

/** Secant ogive radius from the ratio to the tangent-ogive radius, kept inside Crowell's limits ρ > L/2 (and ρ ≥ the circle through tip and base). */
export function secantRho(L, R, ratio = 1.5) {
  const rt = (R * R + L * L) / (2 * R), lo = Math.sqrt(L * L + R * R) / 2;
  return Math.max(lo * 1.0001, ratio * rt);
}

/**
 * Profile [{x, r}] from the tip (x = 0) to the base (x = L) with n intervals (denser near the tip), with an optional
 * spherical tip of radius rn inscribed tangent to the shape (the nose gets shorter; Crowell's "bluffness").
 * custom: [{x, r}] used as given (sorted), its own L and R.
 */
export function noseProfile(type, L, R, p = {}, rn = 0, n = 240, custom = null) {
  let pts;
  if (type === 'custom') pts = custom.map((q) => ({ x: q.x, r: q.r })).sort((a, b) => a.x - b.x);
  else { pts = []; for (let i = 0; i <= n; i++) { const x = L * (i / n) ** 1.5; pts.push({ x, r: i === n ? shapeRadius(type, L, L, R, p) : shapeRadius(type, x, L, R, p) }); } }
  let cap = null;
  if (rn > 0 && type !== 'custom') {
    // sphere centred on the axis, tangent to the profile at x_t: r√(1 + r′²) = r_n, centre at x_t + r r′
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], sl = (b.r - a.r) / (b.x - a.x), s = a.r * Math.sqrt(1 + sl * sl);
      if (s >= rn) {
        if (i === 1 || a.x + a.r * sl - rn < 0) break;            // the tip is already rounder than r_n: nothing to round
        const xc = a.x + a.r * sl, x0 = xc - rn, arc = [], th = Math.atan2(a.r, a.x - xc);   // polar angle of the tangent point
        for (let k = 0; k <= 24; k++) { const f = Math.PI - (Math.PI - th) * (k / 24); arc.push({ x: xc + rn * Math.cos(f), r: rn * Math.sin(f) }); }
        pts = [...arc, ...pts.slice(i + 1)].map((q) => ({ x: q.x - x0, r: q.r }));
        cap = { rn, xc: xc - x0, xt: a.x - x0, cut: x0 };
        break;
      }
    }
  }
  return { pts, cap, L: pts[pts.length - 1].x - pts[0].x, R: pts[pts.length - 1].r };
}

/** Volume, wetted area, base area, and the area/volume up to each station (frustum sums). */
export function measure(pts) {
  let V = 0, S = 0;
  const cumV = [0], cumS = [0];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], h = b.x - a.x;
    V += (Math.PI * h * (a.r * a.r + a.r * b.r + b.r * b.r)) / 3;
    S += Math.PI * (a.r + b.r) * Math.hypot(h, b.r - a.r);
    cumV.push(V); cumS.push(S);
  }
  return { V, S, cumV, cumS };
}

/** Local half-angle (slope) of each segment, rad. */
const slopes = (pts) => pts.slice(1).map((b, i) => Math.atan2(b.r - pts[i].r, b.x - pts[i].x));

/**
 * Full analysis. p: { type, L, R, shape params, rn, custom, M, alpha (deg), atm: { p (lb/ft²), T (°R), rho, a }, bodyLen,
 * CD, CDb, eps (rad) (subsonic wake model), g }.
 */
export function analyseNose(p) {
  const g = p.g ?? 1.4, prof = noseProfile(p.type, p.L, p.R, p, p.rn || 0, 240, p.custom), pts = prof.pts, L = prof.L, R = prof.R;
  const Aref = Math.PI * R * R, m = measure(pts), al = (p.alpha || 0) * D2R, M = p.M;
  // geometry, lift (slender body), loads per unit dynamic pressure (lbf per lb/ft² → in² units, converted by the caller)
  const xcp = L - m.V / Aref, CNa = 2;
  const q = 0.5 * g * p.atm.p * M * M;                         // lb/ft²
  const sl = slopes(pts), tipHalf = tipAngle(pts, L);
  const load = pts.map((pt, i) => ({ x: pt.x, r: pt.r, V: (2 * q * al * Math.PI * pt.r * pt.r) / 144, Mb: (2 * q * al * m.cumV[i]) / 144 }));   // lbf, lbf·in
  // skin friction (turbulent, Hoult) on the nose wetted area, referenced to the base area
  const ReL = rhoAOverMu(p.atm.p, p.atm.T) * M * (L / 12), CDf = M > 0 ? (cfTurb(Math.max(ReL, 1e5), M) * m.S) / Aref : 0;
  // stagnation conditions
  const T0 = p.atm.T * stagT(M, g), cpMax = M > 0 ? cpt(g, M) : 1, mu = machAngle(M);
  // pressure along the nose and pressure drag
  let regime, cp = null, CDp = null, sub = null, Mcr = null, tip = null, shocks = null, cpS = null;
  if (p.sub !== false || M < 1.1) sub = nosePressure({ rBody: (z) => (z < L ? radiusAt(pts, z) : R), noseL: L, L: Math.max(p.bodyLen ?? 6 * L, L + 4 * R), R, M: Math.min(M, 0.95), CD: p.CD ?? 0.3755, CDb: p.CDb ?? 0.0813, eps: p.eps ?? 0.1, dz: L / (p.coarse ? 100 : 300) });
  Mcr = sub ? sub.Mcr : null;
  if (M < 1.1 && M < Mcr) {
    regime = 'subsonic';
    cp = []; for (let i = 0; i <= sub.iBase; i++) cp.push([i * sub.dz, sub.cp[i]]);
    CDp = sub.CA; cpS = cpStar(Math.max(M, 0.05), g);
  } else if (M < 1.1) {
    regime = 'transonic';
  } else {
    regime = 'supersonic';
    const tab = coneCpTable(M, g), mc = tab.maxDeg;
    const cpAt = (th) => { const d = th / D2R; return d <= 0 ? 0 : d <= mc ? interp(tab.rows, d) : cpMax * Math.sin(th) ** 2; };
    cp = []; let F = 0;
    for (let i = 0; i < sl.length; i++) {
      const c = cpAt(sl[i]), a = pts[i], b = pts[i + 1];
      F += c * Math.PI * (b.r * b.r - a.r * a.r);
      cp.push([(a.x + b.x) / 2, c]);
    }
    CDp = F / Aref;
  }
  // tip flow at incidence: tangent cone at the tip half-angle ± α (windward / leeward)
  if (M > 1 && !p.coarse) {
    const mcone = maxCone(M, g), cap = prof.cap, th = tipHalf;
    const wind = coneFlow(M, th + al, g, mcone), lee = th - al > 0 ? coneFlow(M, th - al, g, mcone) : { attached: true, beta: mu, expansion: true, turn: al - th, M2: machFromNu(prandtlMeyer(M, g) + (al - th), g) };   // leeward turns away: Prandtl–Meyer fan
    tip = { half: th, blunt: !!cap, maxCone: mcone.cone, attached: !cap && th + al < mcone.cone, zero: coneFlow(M, th, g, mcone) };
    shocks = { wind, lee };
  }
  // shock–expansion along the surface (zero incidence): the tip cone's surface flow expands by Prandtl–Meyer as the
  // surface turns away (NACA 1135 eqs. 171–173), and turns through a corner fan at a shoulder with a slope break
  let se = null;
  if (M > 1 && !p.coarse && !prof.cap) {
    const t0 = coneFlow(M, tipHalf, g, maxCone(M, g));
    if (t0.attached) {
      const k = (g - 1) / 2, nu0 = prandtlMeyer(t0.Mc, g), isen = (M1, M2) => ((1 + k * M1 * M1) / (1 + k * M2 * M2)) ** (g / (g - 1));
      const pts2 = [], waves = [];
      for (let i = 0; i < sl.length; i++) {
        const th = Math.min(sl[i], tipHalf), Mi = machFromNu(nu0 + (tipHalf - th), g), pr = t0.pr * isen(t0.Mc, Mi);
        pts2.push([(pts[i].x + pts[i + 1].x) / 2, (2 / (g * M * M)) * (pr - 1), Mi, th]);
      }
      const last = pts2[pts2.length - 1], thB = Math.max(0, last[3]), Mb = machFromNu(prandtlMeyer(last[2], g) + thB, g);
      se = { cp: pts2.map((q) => [q[0], q[1]]), surf: pts2, Mc: t0.Mc, shoulder: { theta: thB, M1: last[2], M2: Mb } };
    }
  }
  const CD = CDp == null ? null : CDp + CDf;
  return { se, prof, pts, L, R, Aref, ...m, xcp, CNa, q, load, ReL, CDf, CDp, CD, T0, cpMax, mu, regime, cp, cpS, sub, Mcr, tip, shocks, tipHalf, fineness: L / (2 * R) };
}

/** Radius at station z by linear interpolation of the profile. */
export function radiusAt(pts, z) {
  if (z <= pts[0].x) return pts[0].r;
  let lo = 0, hi = pts.length - 1;
  if (z >= pts[hi].x) return pts[hi].r;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].x <= z) lo = m; else hi = m; }
  const a = pts[lo], b = pts[hi];
  return a.r + ((b.r - a.r) * (z - a.x)) / (b.x - a.x);
}
