// De Laval nozzle thrust coefficient — one-dimensional isentropic flow (NACA Report 1135, "Equations, Tables and
// Charts for Compressible Flow", 1953) with the Malina divergence correction for conical source flow
// (F. J. Malina, J. Franklin Inst. 230, 1940), as in C. P. Hoult's RS&T thrust-coefficient tool (THRUSTCF).
//   C_F = λ √{2γ²/(γ−1) (2/(γ+1))^((γ+1)/(γ−1)) [1 − (p_e/p_c)^((γ−1)/γ)]} + (p_e − p_a) ε / p_c,  λ = (1 + cos α)/2
// Pressures in any one unit; only their ratios enter C_F.

/** Area ratio A/A* of isentropic flow at Mach M, as its logarithm (no overflow for γ → 1 or large M). */
export function logAreaRatio(M, g) {
  return -Math.log(M) + ((g + 1) / (2 * (g - 1))) * Math.log((2 / (g + 1)) * (1 + ((g - 1) / 2) * M * M));
}
export const areaRatio = (M, g) => Math.exp(logAreaRatio(M, g));

/** Static-to-stagnation pressure ratio p/p_c at Mach M. */
export const pressureRatio = (M, g) => Math.exp((-g / (g - 1)) * Math.log1p(((g - 1) / 2) * M * M));

/** Mach number at pressure ratio p/p_c (inverse of pressureRatio). */
export const machFromPressure = (pr, g) => Math.sqrt((2 / (g - 1)) * Math.expm1(((g - 1) / g) * -Math.log(pr)));

/** Supersonic Mach number with area ratio eps ≥ 1 (bisection in ln M — bounded and monotone on M ≥ 1). */
export function exitMach(eps, g) {
  if (eps <= 1) return 1;
  const target = Math.log(eps);
  let lo = 0, hi = 1;                                    // in ln M
  for (let k = 0; k < 60 && logAreaRatio(Math.exp(hi), g) < target; k++) hi *= 2;
  for (let k = 0; k < 200 && hi - lo > 1e-15 * Math.max(1, hi); k++) {
    const mid = (lo + hi) / 2;
    if (logAreaRatio(Math.exp(mid), g) < target) lo = mid; else hi = mid;
  }
  return Math.exp((lo + hi) / 2);
}

/** Throat (sonic) pressure ratio p_t/p_c. */
export const throatRatio = (g) => (2 / (g + 1)) ** (g / (g - 1));

/** Thrust coefficient of a nozzle infinitely expanded into vacuum: √{2γ²/(γ−1) (2/(γ+1))^((γ+1)/(γ−1))}. */
export const cfInfinity = (g) => Math.sqrt(((2 * g * g) / (g - 1)) * (2 / (g + 1)) ** ((g + 1) / (g - 1)));

/** Malina divergence factor of a conical nozzle of half angle alpha (degrees). */
export const malina = (alphaDeg) => (1 + Math.cos((alphaDeg * Math.PI) / 180)) / 2;

/** Thrust coefficients for area ratio eps and ambient-to-chamber pressure ratio pac = p_a/p_c. */
export function cf(g, eps, pac, alphaDeg = 0) {
  const Me = exitMach(eps, g), pec = pressureRatio(Me, g);
  const radical = Math.sqrt(-Math.expm1(((g - 1) / g) * Math.log(pec)));   // √(1 − (p_e/p_c)^((γ−1)/γ))
  const momentum = cfInfinity(g) * radical, pressure = (pec - pac) * eps, lambda = malina(alphaDeg);
  return { Me, pec, radical, momentum, pressure, lambda, cf1D: momentum + pressure, cf3D: lambda * momentum + pressure };
}

/**
 * Full evaluation. p = { g (γ), eps (A_e/A_t), alpha (deg), pc, pa (same pressure unit), dt (throat diameter) }.
 * Thrust is in (pressure unit) × (length unit)².
 */
export function nozzle({ g, eps, alpha, pc, pa, dt }) {
  const pStar = pc * throatRatio(g);
  const c = cf(g, eps, pa / pc, alpha);
  const pe = c.pec * pc, At = (Math.PI * dt * dt) / 4;
  const vac = cf(g, eps, 0, alpha);
  // optimum expansion (p_e = p_a) and the area ratio at which the jet would separate (p_e = 0.4 p_a)
  const MeOpt = pa > 0 ? machFromPressure(pa / pc, g) : Infinity;
  const epsOpt = pa > 0 ? areaRatio(MeOpt, g) : Infinity;
  const MeSep = pa > 0 ? machFromPressure(Math.min(1, (0.4 * pa) / pc), g) : Infinity;
  const epsSep = pa > 0 ? areaRatio(MeSep, g) : Infinity;
  const de = dt * Math.sqrt(eps), Ld = (de - dt) / 2 / Math.tan((alpha * Math.PI) / 180);   // conical divergent section
  return {
    ...c, pStar, pe, At, thrust: c.cf3D * pc * At, thrust1D: c.cf1D * pc * At, cfVac: vac.cf3D, thrustVac: vac.cf3D * pc * At,
    epsOpt, cfOpt: malina(alpha) * cfInfinity(g) * Math.sqrt(-Math.expm1(((g - 1) / g) * Math.log(pa / pc))), MeOpt, epsSep, separated: pe < 0.4 * pa, de, Ld,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Nozzle design: contour, flow along it, normal shock and separation.
//   Isentropic and normal-shock relations: NACA Report 1135 (1953), eqs. (93), (96), (99).
//   Contours: D. K. Huzel & D. H. Huang, "Design of Liquid Propellant Rocket Engines", NASA SP-125 (2nd ed., 1971),
//   §4.3: conical length eq. (4-7), Rao's parabolic approximation of the bell (fig. 4-13), θn and θe (fig. 4-14),
//   thrust efficiency against fractional length (fig. 4-12). The figure values below were digitised from the scan.
//   Separation: R. H. Schmucker, "Flow processes in overexpanded chemical rocket nozzles, Part 1: Flow separation",
//   NASA TM-77396 (1984), eqs. (7), (10), (11).

/** Subsonic Mach number with area ratio A/A* = ratio ≥ 1 (bisection; the subsonic branch is monotone in M). */
export function subsonicMach(ratio, g) {
  if (ratio <= 1) return 1;
  const target = Math.log(ratio);
  let lo = 1e-12, hi = 1;
  for (let k = 0; k < 200 && hi - lo > 1e-15; k++) { const mid = (lo + hi) / 2; if (logAreaRatio(mid, g) > target) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
export const temperatureRatio = (M, g) => 1 / (1 + ((g - 1) / 2) * M * M);
export const densityRatio = (M, g) => temperatureRatio(M, g) ** (1 / (g - 1));

/** Normal shock at upstream Mach M1 (NACA 1135 eqs. 93, 96, 99): downstream Mach, static and total pressure ratios. */
export function normalShock(M1, g) {
  const m2 = M1 * M1;
  const M2 = Math.sqrt(((g - 1) * m2 + 2) / (2 * g * m2 - (g - 1)));
  const p2p1 = (2 * g * m2 - (g - 1)) / (g + 1);
  const p02p01 = (((g + 1) * m2) / ((g - 1) * m2 + 2)) ** (g / (g - 1)) * ((g + 1) / (2 * g * m2 - (g - 1))) ** (1 / (g - 1));
  return { M2, p2p1, p02p01 };
}

// Huzel & Huang fig. 4-14: initial (θn) and exit (θe) parabola angles, degrees, by expansion ratio and fractional
// length L_f (% of a 15° cone with the same throat, throat radius and ε). Read from the curves; the chart spans ε 5–50.
const RAO_EPS = [5.5, 6.5, 8, 10, 15, 20, 25, 30, 40, 50];
const RAO_LF = [60, 70, 80, 90, 100];
const RAO_TN = [
  [28.6, 29.6, 30.8, 31.9, 33.9, 35.4, 36.4, 37.2, 38.3, 39.05],
  [25.6, 26.2, 27.2, 28.2, 30.4, 31.6, 32.6, 33.4, 34.5, 35.4],
  [23.3, 24.0, 24.8, 25.8, 27.8, 29.1, 30.0, 30.8, 31.8, 32.55],
  [21.4, 22.1, 23.0, 23.9, 25.9, 27.3, 28.15, 28.9, 30.1, 31.0],
  [20.3, 20.8, 21.5, 22.4, 24.4, 25.7, 26.8, 27.6, 28.7, 29.6],
];
const RAO_TE = [
  [19.6, 18.9, 17.9, 16.9, 15.5, 14.7, 14.2, 13.8, 13.3, 12.9],
  [16.1, 15.5, 14.4, 13.5, 12.1, 11.4, 11.0, 10.7, 10.5, 10.3],
  [13.1, 12.5, 11.6, 10.9, 9.7, 9.0, 8.7, 8.5, 8.2, 8.1],
  [10.6, 9.8, 9.3, 8.6, 7.4, 6.7, 6.6, 6.6, 6.6, 6.6],
  [8.3, 7.9, 7.4, 6.7, 5.7, 5.2, 5.0, 5.0, 5.0, 5.0],
];
// Huzel & Huang fig. 4-12: thrust efficiency λ (fraction of the ideal C_F) of bell nozzles, by L_f and ε 10–40.
const BELL_EPS = [10, 20, 30, 40];
const BELL_LAMBDA = [
  [0.9620, 0.9670, 0.9715, 0.9725],
  [0.9755, 0.9795, 0.9820, 0.9825],
  [0.9855, 0.9875, 0.9880, 0.9885],
  [0.9905, 0.9905, 0.9907, 0.9907],
  [0.9915, 0.9915, 0.9915, 0.9915],
];
/** Bilinear lookup: rows by L_f (linear), columns by ε (linear in ln ε); both clamped to the chart. */
function chart(table, epsGrid, eps, Lf) {
  const seg = (grid, v, f = (x) => x) => {
    const c = Math.min(grid[grid.length - 1], Math.max(grid[0], v));
    let i = 0; while (i < grid.length - 2 && c > grid[i + 1]) i++;
    return [i, (f(c) - f(grid[i])) / (f(grid[i + 1]) - f(grid[i]))];
  };
  const [j, u] = seg(epsGrid, eps, Math.log), [i, w] = seg(RAO_LF, Lf);
  const at = (r) => table[r][j] + (table[r][j + 1] - table[r][j]) * u;
  return at(i) + (at(i + 1) - at(i)) * w;
}
export const raoAngles = (eps, Lf) => ({
  thn: chart(RAO_TN, RAO_EPS, eps, Lf), the: chart(RAO_TE, RAO_EPS, eps, Lf),
  outside: eps < RAO_EPS[0] || eps > RAO_EPS[RAO_EPS.length - 1] || Lf < 60 || Lf > 100,
});
export const bellEfficiency = (eps, Lf) => chart(BELL_LAMBDA, BELL_EPS, eps, Lf);

/** Huzel & Huang eq. (4-7): length throat → exit of a cone of half angle alpha (deg) with a throat arc of radius R. */
export const conicalLength = (rt, eps, alphaDeg, R) => {
  const a = alphaDeg * RAD;
  return (rt * (Math.sqrt(eps) - 1) + R * (1 / Math.cos(a) - 1)) / Math.tan(a);
};
const RAD = Math.PI / 180;

/** Inlet-to-throat length of the convergent: cone at half angle θc (deg) from radius rc into the 1.5 r_t throat arc. */
export const convergentLength = (rt, rc, thetaCdeg) => {
  const t = thetaCdeg * RAD, R1 = 1.5 * rt;
  return R1 * Math.sin(t) + (rc - rt - R1 * (1 - Math.cos(t))) / Math.tan(t);
};
/** Root of f(x) = target for f decreasing on [lo, hi] (bisection); null when the target lies outside [f(hi), f(lo)]. */
export function solveDecreasing(f, target, lo, hi) {
  if (!(target <= f(lo) && target >= f(hi))) return null;
  for (let k = 0; k < 100; k++) { const mid = (lo + hi) / 2; if (f(mid) > target) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

/**
 * Wall contour, x = 0 at the throat. { rt, rc (chamber radius), thetaC (convergent half angle, deg), eps,
 * type: 'cone' | 'bell', alpha (cone half angle), Lf (bell length, %) }. Throat arcs 1.5 r_t upstream and 0.382 r_t
 * downstream (Huzel & Huang fig. 4-13). Returns sampled points [x, r] and the stations.
 */
export function contour({ rt, rc, thetaC, eps, type, alpha, Lf }) {
  const R1 = 1.5 * rt, R2 = 0.382 * rt, re = rt * Math.sqrt(eps), tc = thetaC * RAD;
  // convergent: chamber cylinder, cone at θc, arc R1 into the throat
  const xa = -R1 * Math.sin(tc), ra = rt + R1 * (1 - Math.cos(tc));
  if (!(rc > ra)) throw new RangeError('chamber too narrow for the convergent');
  const xcv = xa - (rc - ra) / Math.tan(tc), Lch = Math.max(rc, 1.2 * rt);
  const pts = [[xcv - Lch, rc], [xcv, rc]];
  for (let i = 0; i <= 24; i++) { const f = tc * (1 - i / 24); pts.push([-R1 * Math.sin(f), rt + R1 * (1 - Math.cos(f))]); }
  // divergent
  let thn, the, Ln, ctrl = null, adjusted = false;
  if (type === 'bell') ({ thn, the } = raoAngles(eps, Lf));
  else thn = the = alpha;
  const arc = (tn) => {
    // the downstream arc stops early if the exit is reached on it (ε close to 1)
    const phiMax = Math.min(tn, Math.acos(Math.max(-1, 1 - (re - rt) / R2)));
    return { phiMax, xN: R2 * Math.sin(phiMax), rN: rt + R2 * (1 - Math.cos(phiMax)) };
  };
  let { phiMax, xN, rN } = arc(thn * RAD);
  if (type === 'bell') {
    Ln = (Lf / 100) * conicalLength(rt, eps, 15, R2);
    // the parabola needs θe < chord angle N→E < θn; outside Huzel & Huang's chart (small ε) nudge the angles past the chord
    for (let k = 0; k < 20; k++) {
      const chord = Math.atan2(re - rN, Ln - xN) / RAD;
      if (!(Ln > xN)) break;
      if (thn > chord + 0.5 && the < chord - 0.5) break;
      adjusted = true;
      if (thn <= chord + 0.5) thn = chord + 1;
      if (the >= chord - 0.5) the = Math.max(0, chord - 1);
      ({ phiMax, xN, rN } = arc(thn * RAD));
    }
    const tn = thn * RAD, te = the * RAD;
    for (let i = 1; i <= 16; i++) { const f = (phiMax * i) / 16; pts.push([R2 * Math.sin(f), rt + R2 * (1 - Math.cos(f))]); }
    const qx = (re - Math.tan(te) * Ln - rN + Math.tan(tn) * xN) / (Math.tan(tn) - Math.tan(te));
    if (qx > xN && qx < Ln && Ln > xN) {
      ctrl = [qx, rN + Math.tan(tn) * (qx - xN)];
      for (let i = 1; i <= 60; i++) { const t = i / 60, a = (1 - t) ** 2, b = 2 * t * (1 - t), c = t * t; pts.push([a * xN + b * ctrl[0] + c * Ln, a * rN + b * ctrl[1] + c * re]); }
    } else {
      // ε barely above 1: the exit is on or just past the throat arc and no parabola fits; a straight wall closes it
      adjusted = true; Ln = Math.max(Ln, xN);
      if (Ln > xN) for (let i = 1; i <= 30; i++) pts.push([xN + ((Ln - xN) * i) / 30, rN + ((re - rN) * i) / 30]);
    }
  } else {
    const tn = thn * RAD;
    for (let i = 1; i <= 16; i++) { const f = (phiMax * i) / 16; pts.push([R2 * Math.sin(f), rt + R2 * (1 - Math.cos(f))]); }
    Ln = phiMax < tn ? xN : xN + (re - rN) / Math.tan(tn);
    if (Ln > xN) for (let i = 1; i <= 30; i++) pts.push([xN + ((Ln - xN) * i) / 30, rN + ((re - rN) * i) / 30]);
  }
  return { pts, R1, R2, re, rt, rc, xcv, xch: xcv - Lch, xN, rN, Ln, thn, the, ctrl, adjusted, Lconv: -xcv };
}

/** Separation pressure ratio p_sep/p_a at wall Mach M (Schmucker TM-77396). crit: 'schmucker' | 'summerfield' | 'kalt'. */
export function separationRatio(crit, M, pcpa) {
  if (crit === 'summerfield') return 0.4;                       // eq. (7)
  if (crit === 'kalt') return 0.667 * pcpa ** -0.2;              // eq. (10), Kalt & Bendall
  return (1.88 * Math.min(M, 5) - 1) ** -0.64;                  // eq. (11); data only up to M = 5
}

/**
 * Quasi-one-dimensional flow through the contour at chamber pressure pc and ambient pa (any one pressure unit).
 * Regimes: 'unchoked' (pa above the subsonic-exit pressure), 'shock' (inviscid normal shock inside the divergent),
 * 'overexpanded' (shocks outside), 'ideal', 'underexpanded'. Separation is located on the attached wall pressure with
 * the chosen criterion. Profiles are ratios to the chamber (stagnation) values.
 */
export function nozzleFlow(geo, g, pc, pa, crit = 'schmucker') {
  const eps = (geo.re / geo.rt) ** 2;
  const peSub = pc * pressureRatio(subsonicMach(eps, g), g), Me = exitMach(eps, g), pe = pc * pressureRatio(Me, g);
  const peNS = pe * normalShock(Me, g).p2p1;
  let regime, epsShock = null, shock = null;
  if (pa >= peSub) regime = 'unchoked';
  else if (pa > peNS) {
    regime = 'shock';
    // exit pressure behind a shock at area ratio As rises as the shock moves upstream: bisect for p_exit = p_a
    const pExit = (As) => { const s = normalShock(exitMach(As, g), g); return pc * s.p02p01 * pressureRatio(subsonicMach(eps * s.p02p01, g), g); };
    let lo = 1 + 1e-12, hi = eps;
    for (let k = 0; k < 200 && hi - lo > 1e-13 * eps; k++) { const mid = (lo + hi) / 2; if (pExit(mid) > pa) lo = mid; else hi = mid; }
    epsShock = (lo + hi) / 2;
    const M1 = exitMach(epsShock, g), s = normalShock(M1, g);
    shock = { eps: epsShock, M1, M2: s.M2, p02p01: s.p02p01, x: xAtArea(geo, epsShock) };
  } else regime = Math.abs(pe / pa - 1) < 0.02 ? 'ideal' : pe > pa ? 'underexpanded' : 'overexpanded';

  // separation: first point downstream of the throat where the attached wall pressure drops to p_sep (Schmucker)
  let sep = null;
  if (pa > 0 && regime !== 'unchoked') {
    const f = (A) => { const M = exitMach(A, g); return pressureRatio(M, g) * pc - separationRatio(crit, M, pc / pa) * pa; };
    const top = shock ? shock.eps : eps;
    if (f(top) <= 0) {
      let lo = 1 + 1e-9, hi = top;
      for (let k = 0; k < 200 && hi - lo > 1e-12 * top; k++) { const mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; }
      const A = (lo + hi) / 2, M = exitMach(A, g);
      sep = { eps: A, M, p: pressureRatio(M, g) * pc, x: xAtArea(geo, A) };
    }
  }
  // margin to separation at the exit (attached flow): p_e / p_sep(M_e) — above 1 the wall stays attached
  const sepMargin = pa > 0 ? pe / (separationRatio(crit, Me, pc / pa) * pa) : Infinity;

  const prof = geo.pts.map(([x, r]) => {
    const A = (r / geo.rt) ** 2;
    let M, p0 = 1;
    if (regime === 'unchoked') { const Mex = machFromPressure(pa / pc, g), As = eps / areaRatio(Mex, g); M = subsonicMach(A / As, g); }
    else if (x <= 0) M = subsonicMach(A, g);
    else if (shock && A > shock.eps) { p0 = shock.p02p01; M = subsonicMach(A * p0, g); }
    else M = exitMach(A, g);
    return { x, r, A, M, p: p0 * pressureRatio(M, g), T: temperatureRatio(M, g), rho: p0 * densityRatio(M, g) };
  });
  return { eps, regime, Me, pe, peSub, peNS, shock, sep, sepMargin, prof };
}

/** Axial station of the divergent wall where A/A* = A (the divergent radius rises monotonically). */
function xAtArea(geo, A) {
  const r = geo.rt * Math.sqrt(A), pts = geo.pts.filter(([x]) => x >= 0);
  for (let i = 1; i < pts.length; i++) if (pts[i][1] >= r) { const [x0, r0] = pts[i - 1], [x1, r1] = pts[i]; return x0 + ((x1 - x0) * (r - r0)) / ((r1 - r0) || 1); }
  return pts[pts.length - 1][0];
}

/** Characteristic velocity c* (m/s) from chamber temperature Tc (K), molar mass Mw (g/mol) and γ. */
export const cStar = (g, Tc, Mw) => Math.sqrt(((8314.462618 / Mw) * Tc) / g) / (2 / (g + 1)) ** ((g + 1) / (2 * (g - 1)));
