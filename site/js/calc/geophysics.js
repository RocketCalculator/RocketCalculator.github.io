// Sounding-rocket geophysical environment — C. P. Hoult, "Sounding Rocket Geophysical Environment" (RS&T memo, 2010);
// workbook GEOPHYSICS.xls. Native English units: ft, °R, lb/ft², slug/ft³, ft/s.

export const C = {
  ATR: 52500,            // equatorial tropopause altitude, ft
  BTR: 27900,            // polar tropopause altitude, ft
  ARE: 20925597.9,       // equatorial Earth radius, ft (WGS-84)
  BRE: 20855437.3,       // polar Earth radius, ft
  alfa: -0.00357448,     // tropospheric lapse rate, °R/ft
  po: 2116.217,          // sea-level (geoid) pressure, lb/ft²
  Rair: 1716,            // gas constant for air, ft·lb/(slug·°R)
  gamma: 1.4,
  Prot: 86164.09,        // sidereal day, s
};

/** Tropopause altitude for geodetic latitude φ (rad): ellipse between equatorial and polar values. */
export const tropopause = (Phi) => 1 / Math.sqrt((Math.cos(Phi) / C.ATR) ** 2 + (Math.sin(Phi) / C.BTR) ** 2);
/** Potsdam surface gravity, ft/s². */
export const surfaceGravity = (Phi) => 32.0876228 * (1 + 0.00530224 * Math.sin(Phi) ** 2 - 0.000058 * Math.sin(2 * Phi) ** 2);
/** Radius of the tangent sphere to the geoid at latitude φ, ft. */
export const earthRadius = (Phi) => Math.sqrt(((C.ARE ** 2 * Math.cos(Phi)) ** 2 + (C.BRE ** 2 * Math.sin(Phi)) ** 2) /
  ((C.ARE * Math.cos(Phi)) ** 2 + (C.BRE * Math.sin(Phi)) ** 2));

/**
 * Atmosphere state at altitude h (ft MSL) for a launch site at ho (ft) with surface temperature To (°R), latitude phi (deg).
 * compat=false: memo form  p = p_SL (1 + α h/(T*−α h*))^(−g/Rα)  — sea-level pressure on the geoid.
 * compat=true : workbook form, which uses (h − ho) in the troposphere so p = p_SL at the launch site.
 */
export function atmosphere({ h, ho, To, phi }, { compat = false } = {}) {
  const { alfa, po, Rair, gamma } = C;
  const Phi = (phi * Math.PI) / 180;
  const hT = tropopause(Phi);
  const go = surfaceGravity(Phi);
  const RE = earthRadius(Phi);
  const Tsl = To - alfa * ho;                         // temperature extrapolated to sea level
  const TT = To + alfa * (hT - ho);
  const n = go / (Rair * alfa);                       // (1/x)^n form used by both memo and workbook
  const pT = po * (1 / (1 + (alfa * hT) / Tsl)) ** n;
  const T = h <= hT ? To + alfa * (h - ho) : TT;
  let p;
  if (h <= hT) p = po * (1 / (1 + (alfa * (compat ? h - ho : h)) / Tsl)) ** n;
  else p = pT * Math.exp((-go * (h - hT)) / (Rair * TT));
  const rho = p / (Rair * T);
  const a = Math.sqrt(gamma * Rair * T);
  const gh = go * (RE / (RE + h)) ** 2;               // inverse-square correction (memo); not in workbook
  return { Phi, hT, go, RE, TT, pT, T, p, rho, a, gh, omega: (2 * Math.PI) / C.Prot, Tsl };
}

/** Profile of the atmosphere from hmin to hmax (ft) with n points. */
export function profile(inp, hmin, hmax, n = 120, opts) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const h = hmin + ((hmax - hmin) * i) / n;
    out.push({ h, ...atmosphere({ ...inp, h }, opts) });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// U.S. Standard Atmosphere, 1976 (NOAA/NASA/USAF, NASA-TM-X-74335), 0–86 km, SI units. Read for this work:
// constants p. 3–4 (R* = 8.31432e3 J/(kmol·K), g0 = 9.80665 m/s², r0 = 6356.766 km, T0 = 288.15 K, β, S), table 4
// (layers), eq. (5) (hydrostatics). M0 = 28.9644 kg/kmol checks against table I (ρ R* T / P = 28.964 at 11 km).
// Printing errors noted in the NASA copy's erratum: S is 110.4 K (printed 110), β is 1.458e-6 (printed 1.458e6).
export const STD = { R: 8.31432e3, M0: 28.9644, g0: 9.80665, r0: 6356766, T0: 288.15, P0: 101325, beta: 1.458e-6, S: 110.4, gamma: 1.4 };
const LAYERS = [[0, -6.5], [11, 0], [20, 1], [32, 2.8], [47, 0], [51, -2.8], [71, -2], [84.852, 0]];   // H_b (km'), L_M,b (K/km')
// base temperatures and pressures of each layer, built once from T0, P0 by the layer formulas
const BASES = (() => {
  const out = [];
  let T = STD.T0, P = STD.P0;
  for (let i = 0; i < LAYERS.length; i++) {
    out.push({ H: LAYERS[i][0] * 1000, L: LAYERS[i][1] / 1000, T, P });
    if (i + 1 < LAYERS.length) { const dH = (LAYERS[i + 1][0] - LAYERS[i][0]) * 1000; ({ T, P } = layerState(out[i], dH)); }
  }
  return out;
})();
function layerState(b, dH) {
  const k = (STD.g0 * STD.M0) / STD.R;                      // g0' M0 / R*, K/m
  if (b.L === 0) return { T: b.T, P: b.P * Math.exp((-k * dH) / b.T) };
  const T = b.T + b.L * dH;
  return { T, P: b.P * (b.T / T) ** (k / b.L) };
}
/** Geopotential altitude H (m') from geometric altitude Z (m). */
export const geopotential = (Z) => (STD.r0 * Z) / (STD.r0 + Z);
/** Standard atmosphere at geometric altitude Z (m), valid −5 to 86 km: T (K), P (Pa), rho (kg/m³), a (m/s), mu (Pa·s). */
export function std1976(Z) {
  const H = geopotential(Z);
  let i = BASES.length - 1; while (i > 0 && H < BASES[i].H) i--;
  const { T, P } = layerState(BASES[i], H - BASES[i].H);
  const rho = (P * STD.M0) / (STD.R * T);
  return { Z, H, T, P, rho, a: Math.sqrt((STD.gamma * STD.R * T) / STD.M0), mu: sutherland(T) };
}
/** Dynamic viscosity by Sutherland's law (US 1976 eq. 51 form), Pa·s, T in K. */
export const sutherland = (T) => (STD.beta * T ** 1.5) / (T + STD.S);
/** Geometric altitude (m) at which the standard atmosphere has the given value of key ('rho' or 'P'); null outside −5…86 km. */
export function stdAltitudeOf(key, value) {
  let lo = -5000, hi = 86000;
  const f = (z) => std1976(z)[key];
  if (!(value <= f(lo) && value >= f(hi))) return null;
  for (let k = 0; k < 100; k++) { const mid = (lo + hi) / 2; if (f(mid) > value) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
