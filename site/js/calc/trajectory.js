// Two-degree-of-freedom point-mass trajectory — SKYAERO 7.6 (Fuentes, Hoult, Tran, Tong, 2014).
// Up to three stages fly in the vertical plane of fire: a rail phase on the simulated launcher length, powered flight
// heading into the relative wind (Lewis, with Hoult's finite-inertia correction), coasts, and optional drogue and main
// parachutes. Hoult's atmosphere and inverse-square gravity (geophysics.js). US units: ft, slug, lbf, s, rad.
import { atmosphere, C as GEO } from './geophysics.js';

export const G0 = 32.174;
/** Hoult, "Finite Inertia Corrections to the Lewis Model Wind Response": fraction of the wind felt in powered flight vs λ_P h. */
export const WIND_CORR = [[0, 0], [0.1, 0.046890593], [0.2, 0.10597452], [0.3, 0.16379493], [0.4, 0.21804787], [0.5, 0.26823295], [0.7, 0.35679925],
  [0.9, 0.43149466], [1.3, 0.54852462], [1.7, 0.63436323], [2.2, 0.71245615], [3.1, 0.80336476], [5, 0.89684593], [10, 0.96761053], [13, 0.97954982],
  [15, 0.98435153], [18, 0.98893524], [20, 0.99096496], [23, 0.99310958], [25, 0.99414391], [28, 0.99530998], [31, 0.99616101], [34, 0.996800662],
  [37, 0.99729321], [40, 0.99768047], [43, 0.99798101], [46, 0.99824201], [49, 0.99844921], [52, 0.99862179], [55, 0.99876703], [58, 0.99889039],
  [61, 0.99899604], [64, 0.99908722], [67, 0.99915899], [70, 0.99923569], [73, 0.99929658], [76, 0.99935041], [79, 0.99939821], [82, 0.99944086],
  [85, 0.99947907], [91, 0.99954444], [100.1, 0.99962202]];

/** Piecewise-linear table lookup in column col, held constant beyond the ends. */
export function interp(rows, x, col = 1) {
  if (!(x > rows[0][0])) return rows[0][col];
  const n = rows.length - 1;
  if (x >= rows[n][0]) return rows[n][col];
  let lo = 0, hi = n;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (rows[m][0] <= x) lo = m; else hi = m; }
  const [a, b] = [rows[lo], rows[hi]];
  return a[col] + ((b[col] - a[col]) * (x - a[0])) / (b[0] - a[0]);
}

/**
 * Hoult (1976): rail length a point-mass simulation needs to reproduce the weathercocking of a real rail of length L.
 * SKYAERO's fit of the note's Table 1 up to λL = 1; beyond, where the fit falls apart, the table's increment
 * λ(L_sim − L) (held at its λL = 2 value further out).
 */
export function simLauncherLength(lamP, L) {
  const x = lamP * L;
  if (x <= 1) return (0.140365 * Math.exp(Math.sqrt(2 * Math.PI * x) - 0.387621 * x ** 1.2)) / lamP;
  return L + interp([[1, 0.1678], [2, 0.1245]], x) / lamP;
}

/** Vacuum thrust curve (sea-level input + p₀A_e), cumulative vacuum impulse, burn time and vacuum Isp of a stage. */
export function motor(st, p0 = GEO.po) {
  const vac = st.thrust.map(([t, T]) => [t, T > 0 ? T + (st.seaLevel ? p0 * st.Ae : 0) : 0]), cum = [0];
  for (let i = 1; i < vac.length; i++) cum.push(cum[i - 1] + ((vac[i][1] + vac[i - 1][1]) * (vac[i][0] - vac[i - 1][0])) / 2);
  const I = cum[cum.length - 1];
  return { vac, cum, I, tb: vac[vac.length - 1][0], isp: st.Wp > 0 ? I / st.Wp : 0 };
}
/** Impulse delivered by time τ after ignition (exact for the trapezoid thrust curve). */
function impulseAt(m, tau) {
  const v = m.vac;
  if (tau <= v[0][0]) return 0;
  if (tau >= m.tb) return m.I;
  let i = 1;
  while (v[i][0] < tau) i++;
  const [t0, T0] = v[i - 1], T = interp(v, tau);
  return m.cum[i - 1] + ((T0 + T) * (tau - t0)) / 2;
}

/**
 * p: { site: { ho, To (°R), lat (deg) }, QE (rad), L (rail, ft), lamP (rad/ft), useSimRail, wind: [[h AGL, w ft/s]] (+ downrange),
 *      stages: [{ Wp, Wd (lb), thrust: [[t, T]], seaLevel, Ae, S, cd: [[M, CD off, CD on]], delay (s, coast before ignition) }],
 *      drogue?: { CdS, delay }, main?: { CdS, h }, tau, dt }. Optional atm(hAGL) → { p, rho, a, g } replaces the atmosphere.
 */
export function simulate(p) {
  const site = p.site, atm = p.atm ?? ((h) => { const a = atmosphere({ h: h + site.ho, ho: site.ho, To: site.To, phi: site.lat }); return { p: a.p, rho: a.rho, a: a.a, g: a.gh }; });
  const M = p.stages.map((st) => motor(st)), N = M.length;
  // timeline: stage k ignites tIgn[k]; the spent stage k−1 separates at its burnout
  const tIgn = [0];
  for (let k = 1; k < N; k++) tIgn.push(tIgn[k - 1] + M[k - 1].tb + (p.stages[k].delay ?? 0));
  const tBurn = M.map((m, k) => tIgn[k] + m.tb);
  const attached = (t) => { let k = 0; while (k < N - 1 && t >= tBurn[k]) k++; return k; };       // lowest stage still on
  const mass = (t) => {
    let W = 0;
    for (let k = attached(t); k < N; k++) W += p.stages[k].Wd + p.stages[k].Wp * (1 - impulseAt(M[k], t - tIgn[k]) / (M[k].I || 1));
    return W / G0;
  };
  const burning = (t) => { const k = attached(t); return t >= tIgn[k] && t < tBurn[k] ? k : -1; };
  const railL = p.useSimRail ? simLauncherLength(p.lamP, p.L) : p.L, sQ = Math.sin(p.QE), cQ = Math.cos(p.QE);
  const windAt = (h) => (p.wind?.length ? interp(p.wind, h) : 0);
  let phase = 'rail', chute = null, tApo = null, hApo = -Infinity, tDrogue = null;

  /** Accelerations and diagnostics at time t and state y = [x, z, vx, vz]. */
  const f = (t, y) => {
    const [, z, vx, vz] = y, A = atm(Math.max(0, z)), m = mass(t), k = attached(t), b = burning(t), st = p.stages[k];
    const corr = phase === 'rail' ? 0 : b >= 0 ? interp(WIND_CORR, p.lamP * Math.max(0, z)) : 1, w = windAt(Math.max(0, z)) * corr;
    const vxr = vx - w, V = Math.hypot(vxr, vz), mach = V / A.a, q = 0.5 * A.rho * V * V;
    const Tv = b >= 0 ? interp(M[b].vac, t - tIgn[b]) : 0, T = Tv > 0 ? Math.max(0, Tv - A.p * st.Ae) : 0;
    let CdS = st.S * interp(st.cd, mach, b >= 0 ? 2 : 1);
    if (chute) CdS = chute.from + (chute.to - chute.from) * (1 - Math.exp(-(t - chute.t0) / p.tau));
    const D = q * CdS;
    let ax, az;
    if (phase === 'rail') {
      const a = T / m - D / m - A.g * sQ, along = a > 0 || vx * cQ + vz * sQ > 0 ? a : 0;
      ax = along * cQ; az = along * sQ;
    } else {
      const ux = V > 0 ? vxr / V : cQ, uz = V > 0 ? vz / V : sQ;
      ax = ((T - D) / m) * ux; az = ((T - D) / m) * uz - A.g;
    }
    return { d: [vx, vz, ax, az], m, T, D, q, mach, V, w, g: A.g, CdS };
  };

  let t = 0, y = [0, 0, 0, 0];
  const hist = [], push = (t, y, s) => hist.push({ t, x: y[0], z: y[1], vx: y[2], vz: y[3], V: s.V, mach: s.mach, q: s.q, T: s.T, D: s.D, W: s.m * G0, gs: Math.hypot(s.d[2], s.d[3]) / G0, gam: Math.atan2(y[3], y[2] - s.w), phase });
  let s0 = f(t, y);
  push(t, y, s0);
  const ev = { burnout: [], railExit: null };
  const tEnd = 4 * 3600, sched = () => [...tIgn, ...tBurn, tDrogue].filter((x) => x != null && x > t + 1e-9);
  let steps = 0;
  while (t < tEnd && steps++ < 400000) {
    const k = s0.CdS * s0.q > 0 ? (s0.D / s0.m / Math.max(s0.V, 1e-9)) : 0;
    let dt = phase === 'rail' ? Math.min(p.dt, 0.002) : Math.min(p.dt, 0.4 / Math.max(k, 1e-9));
    const next = Math.min(...sched(), Infinity);
    if (t + dt > next) dt = next - t;
    // step ends sit just inside the step so a burnout or ignition on its edge belongs to the right side
    const k1 = f(t + 1e-9, y).d, y2 = y.map((v, i) => v + (dt / 2) * k1[i]);
    const k2 = f(t + dt / 2, y2).d, y3 = y.map((v, i) => v + (dt / 2) * k2[i]);
    const k3 = f(t + dt / 2, y3).d, y4 = y.map((v, i) => v + dt * k3[i]);
    const k4 = f(t + dt - 1e-9, y4).d, yn = y.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    const tn = t + dt;
    if (phase !== 'rail' && yn[1] <= 0 && yn[3] < 0) {                          // impact: interpolate to z = 0
      const fr = y[1] / (y[1] - yn[1]), yi = y.map((v, i) => v + fr * (yn[i] - v));
      t += fr * dt; y = yi; s0 = f(t, y); push(t, y, s0); break;
    }
    if (tApo === null && phase !== 'rail' && y[3] > 0 && yn[3] <= 0) {        // apogee
      const fr = y[3] / (y[3] - yn[3]);
      tApo = t + fr * dt; hApo = y[1] + fr * (yn[1] - y[1]);
      if (p.drogue) tDrogue = tApo + p.drogue.delay;
    }
    for (let i = 0; i < N; i++) if (Math.abs(tn - tBurn[i]) < 1e-9) ev.burnout.push({ stage: i + 1, t: tn, V: null, z: yn[1], idx: hist.length });
    t = tn; y = yn;
    if (phase === 'rail' && Math.hypot(y[0], y[1]) >= railL) { phase = 'free'; ev.railExit = { t, V: Math.hypot(y[2], y[3]) }; }
    if (phase === 'rail' && t > 30 && y[2] * cQ + y[3] * sQ <= 0) break;       // never leaves the rail
    if (tDrogue !== null && t >= tDrogue - 1e-9 && !chute) { chute = { from: s0.CdS, to: p.drogue.CdS, t0: t, kind: 'drogue' }; phase = 'drogue'; }
    if (p.main && tApo !== null && y[1] <= p.main.h && (!chute || chute.kind !== 'main')) {
      chute = { from: chute ? chute.to : s0.CdS, to: p.main.CdS, t0: t, kind: 'main' }; phase = 'main';
    }
    s0 = f(t, y);
    if (steps < 20000 || steps % 10 === 0 || phase !== hist[hist.length - 1].phase) push(t, y, s0);   // thin very long flights
    for (const b of ev.burnout) if (b.V === null) { b.V = s0.V; b.gam = Math.atan2(y[3], y[2] - s0.w); b.idx = hist.length - 1; }
  }
  if (tApo === null) { const top = hist.reduce((a, r) => (r.z > a.z ? r : a)); tApo = top.t; hApo = top.z; }   // never climbed after the rail
  const last = hist[hist.length - 1], landed = phase !== 'rail' && last.z <= 1e-6 && last.vz < 0;
  const peak = (key, from = 0) => hist.slice(from).reduce((a, r) => (r[key] > a[key] ? r : a), hist[0]);
  return { hist, railL, railExit: ev.railExit, burnouts: ev.burnout, tApo, hApo, landed, impact: landed ? { t: last.t, x: last.x, V: Math.hypot(last.vx, last.vz) } : null,
    maxMach: peak('mach'), maxQ: peak('q'), maxG: peak('gs'), motors: M, tIgn, tBurn, liftoffTW: (M[0].vac.reduce((a, r) => Math.max(a, r[1]), 0)) / (mass(0) * G0) };
}
