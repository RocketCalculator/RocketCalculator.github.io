// Single-parachute recovery of a two-piece rocket — C. P. Hoult, "Dual Purpose Parachute Recovery System (rev. 2)"
// (RS&T, 2013), "Parachute Reefing" (RS&T, 2013) after T. W. Knacke, "Reefing of Parachutes", ASD AD-A036 497 (1976).
// A heavy nose (payload / ballast) and a lighter aft body hang under one parachute, joined by a tether of length L.
// Steady descent in the troposphere, ρ = ρ₀τ^m with τ = 1 + αh/T₀ and m = −g/(αR) − 1:
//   V = √(2Mg/(C_D ρ S)) = V₀ τ^{−m/2},   t = ∫dh/V = T₀ (τ_a^e − τ_b^e)/(α V₀ e),  e = m/2 + 1.
// After the nose lands the aft body slows over the tether length (memo eq. 7):
//   V_aft² = 2m₂g/(C_DρS) + 2m₁g/(C_DρS) exp(−C_DρSL/m₂).
// US units: ft, slug, s, °R, lbf.

export const ATM = { g: 32.174, alpha: -0.003566, R: 1716, T0: 518.67, rho0: 0.002377 };
/** Density exponent of the troposphere, ρ ∝ τ^m. */
export const densityExponent = ({ g, alpha, R } = ATM) => -g / (alpha * R) - 1;

/** Reefed / unreefed drag of flat circular canopies against reefed / flat diameter (Knacke data, digitised from the memo). */
export const REEF = [[0.075, 0.028], [0.1, 0.053], [0.125, 0.077], [0.15, 0.103], [0.175, 0.13], [0.2, 0.163], [0.225, 0.192], [0.25, 0.231], [0.275, 0.27],
  [0.3, 0.319], [0.325, 0.358], [0.35, 0.394], [0.375, 0.442], [0.4, 0.494], [0.425, 0.553], [0.45, 0.613], [0.475, 0.671], [0.5, 0.727], [0.525, 0.785],
  [0.55, 0.842], [0.575, 0.899], [0.6, 0.956], [0.62, 1]];
export function reefedDragRatio(r) {
  if (r >= 0.62) return 1;
  if (r <= REEF[0][0]) return REEF[0][1] * (r / REEF[0][0]);
  let i = 0; while (REEF[i + 1][0] < r) i++;
  const [x0, y0] = REEF[i], [x1, y1] = REEF[i + 1];
  return y0 + ((y1 - y0) * (r - x0)) / (x1 - x0);
}

export const tau = (h, atm = ATM) => 1 + (atm.alpha * h) / atm.T0;
export const density = (h, atm = ATM, m = densityExponent(atm)) => atm.rho0 * tau(h, atm) ** m;
/** Steady descent speed of mass M (slug) under drag area CdS (ft²) at altitude h (ft MSL). */
export const descentSpeed = (M, CdS, h, atm = ATM, m) => Math.sqrt((2 * M * atm.g) / (CdS * density(h, atm, m)));

/** Time to descend from ha to hb (ft MSL, ha > hb) at the steady speed with drag area CdS. */
export function descentTime(M, CdS, ha, hb, atm = ATM, m = densityExponent(atm)) {
  const V0 = Math.sqrt((2 * M * atm.g) / (CdS * atm.rho0)), e = m / 2 + 1;
  if (Math.abs(e) < 1e-12) return (atm.T0 / (atm.alpha * V0)) * (Math.log(tau(ha, atm)) - Math.log(tau(hb, atm)));
  return (atm.T0 * (tau(ha, atm) ** e - tau(hb, atm) ** e)) / (atm.alpha * V0 * e);
}

/** Aft-body impact speed after the nose lands (memo eq. 7), density rho at the ground. */
export function aftImpact(m1, m2, CdS, rho, L, g = ATM.g) {
  const k = CdS * rho;
  return Math.sqrt((2 * m2 * g) / k + ((2 * m1 * g) / k) * Math.exp((-k * L) / m2));
}

/**
 * Full evaluation. { W1, W2 (lbf: nose, aft body incl. parachute), D0 (flat diameter, ft), CD (unreefed), reef (bool),
 * ratio (reefed / flat diameter), hD (deployment, ft AGL), hR (disreef, ft AGL), hG (ground elevation, ft MSL),
 * L (tether, ft), wind (ft/s), VD (speed just before deployment, ft/s) }.
 */
export function recovery({ W1, W2, D0, CD, reef, ratio, hD, hR, hG, L, wind, VD }) {
  const g = ATM.g, m1 = W1 / g, m2 = W2 / g, M = m1 + m2, S = (Math.PI * D0 * D0) / 4;
  const k = reef ? reefedDragRatio(ratio) : 1, CdS = CD * S, CdSR = k * CdS;
  const hd = hG + hD, hr = reef ? hG + Math.min(hR, hD) : hd;   // disreef height (deployment when not reefed)
  const tReefed = reef ? descentTime(M, CdSR, hd, hr) : 0, tOpen = descentTime(M, CdS, hr, hG), t = tReefed + tOpen;
  const rhoG = density(hG), rhoD = density(hd);
  const vDeploy = descentSpeed(M, reef ? CdSR : CdS, hd), vDisreef = reef ? descentSpeed(M, CdSR, hr) : NaN;
  const qD = 0.5 * rhoD * VD * VD;
  return {
    m1, m2, S, k, CdS, CdSR, tReefed, tOpen, t, drift: wind * t, rhoG, rhoD,
    vDeploy, vDisreef, vSL: descentSpeed(M, reef ? CdSR : CdS, 0), vNose: descentSpeed(M, CdS, hG),
    vAft: aftImpact(m1, m2, CdS, rhoG, L), vAftMin: Math.sqrt((2 * m2 * g) / (CdS * rhoG)),
    qD, reefLine: reef ? qD * (Math.PI / 4) * D0 * D0 * 0.02 : NaN,
  };
}

/**
 * Time history of the descent: [{ t (s from deployment), h (ft AGL), V (ft/s), x (ft drift), reefed }], n samples
 * evenly spaced in height, plus the disreef point itself so the speed step is drawn sharp.
 */
export function descentHistory(p, n = 120) {
  const o = recovery(p), M = o.m1 + o.m2, hTop = p.hG + p.hD, hR = p.reef ? p.hG + Math.min(p.hR, p.hD) : hTop;
  const reef = p.reef && hR < hTop;                                       // a reefed phase only if disreef is below the opening
  const at = (h, reefed) => {
    const t = reefed ? descentTime(M, o.CdSR, hTop, h) : o.tReefed + descentTime(M, o.CdS, hR, h);
    return { t, h: h - p.hG, V: descentSpeed(M, reefed ? o.CdSR : o.CdS, h), x: p.wind * t, reefed };
  };
  const out = [];
  for (let i = 0; i <= n; i++) {
    const h = hTop - ((hTop - p.hG) * i) / n;
    if (reef && h < hR && (out.length === 0 || out[out.length - 1].reefed)) { out.push(at(hR, true)); out.push(at(hR, false)); }
    out.push(at(h, reef && h >= hR));
  }
  return out;
}

/** Root of f(x) = 0 for f increasing on [lo, hi] by bisection in log space; null when there is no sign change. */
function bisectLog(f, lo, hi) {
  if (f(lo) > 0 || f(hi) < 0) return null;
  for (let k = 0; k < 100; k++) { const mid = Math.sqrt(lo * hi); if (f(mid) < 0) lo = mid; else hi = mid; }
  return Math.sqrt(lo * hi);
}
/** Flat diameter (ft) that gives an aft-body landing speed vT (ft/s); landing speed falls as the diameter grows. */
export const diameterFor = (p, vT) => bisectLog((D) => vT - recovery({ ...p, D0: D }).vAft, 0.05, 500);
/** Tether length (ft) that gives an aft-body landing speed vT; null if even an endless tether is too fast. */
export function tetherFor(p, vT) {
  const o = recovery(p), k = o.CdS * o.rhoG, A = (2 * o.m2 * ATM.g) / k, B = (2 * o.m1 * ATM.g) / k;
  if (!(vT * vT > A)) return null;
  return vT * vT >= A + B ? 0 : (-o.m2 / k) * Math.log((vT * vT - A) / B);
}
/** Disreef height (ft AGL) at which the drift equals xMax (lower disreef → shorter time under the full canopy). */
export function disreefFor(p, xMax) {
  const drift = (hR) => recovery({ ...p, reef: true, hR }).drift;
  if (drift(1e-6) > xMax) return null;
  if (drift(p.hD * 0.999) <= xMax) return p.hD * 0.999;
  let lo = 1e-6, hi = p.hD * 0.999;
  for (let k = 0; k < 100; k++) { const mid = (lo + hi) / 2; if (drift(mid) <= xMax) lo = mid; else hi = mid; }
  return lo;
}
