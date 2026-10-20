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
