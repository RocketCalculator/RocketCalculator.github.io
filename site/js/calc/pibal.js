// Tethered pilot-balloon (pibal) wind sensor — C. P. Hoult, "Tethered Pilot Balloon Bias Errors (rev. 1)" (RS&T,
// 2013), M. Samir and M. F. Buharie, "A New Wind Sensor for Rocket Launches", and the WIND CALCULATOR field tool.
// A helium balloon on a thin tether leans downwind until its net lift and drag balance along the tether:
//   tan Θ = (B − W)/D,  D = ½ρV²C_D S   ⇒   V = √(2(B − W) cot Θ / (ρ C_D S))                         (eq. 1)
// Tether sag (weight W_T) and tether drag both raise the elevation angle seen from the ground; the cotangent is
// corrected by the factor (eq. 5)
//   1 − (W_T + C_d ρ r d V² tan Θ sin Θ) / (2(B − W)),   r: tether radius, d: tether length,
// so the corrected speed is V √(that factor). US units: ft, lbf, slug/ft³, ft/s; angles in degrees.

const RAD = Math.PI / 180;
export const G = 32.174;
export const R_GAS = { helium: 2077.1, hydrogen: 4124.2 };   // J/(kg K)

/** Weight (lbf) of the lifting gas filling volume V (ft³) at pressure p (Pa) and temperature T (K). */
export function gasWeight(V, p, T, gas = 'helium') {
  const rho = p / (R_GAS[gas] * T);                        // kg/m³
  return (rho * V * 0.3048 ** 3) / 0.45359237;              // lbm = lbf at standard gravity
}

/** Raw wind speed from the balloon force balance (eq. 1). B, W in lbf; S in ft². */
export const windSpeed = (B, W, theta, rho, CD, S) => Math.sqrt((2 * (B - W)) / Math.tan(theta * RAD) / (rho * CD * S));

/** Bias terms of eq. (5): b from tether weight, c from tether drag (r, d in ft). */
export function bias({ B, W, WT, theta, rho, Cd, r, d, V }) {
  const b = WT / (2 * (B - W)), c = (Cd * rho * r * d * V * V * Math.tan(theta * RAD) * Math.sin(theta * RAD)) / (2 * (B - W));
  return { b, c, factor: 1 - b - c };
}

/**
 * Full evaluation. { D (balloon diameter, ft), We (empty weight, lbf), CD, gas, pG (Pa), TG (K) — gas fill on the ground,
 * dt (tether diameter, ft), rhoT (tether material density, slug/ft³), Cd (tether cross-flow drag), L (tether length, ft),
 * theta (elevation, deg), az (balloon azimuth = downwind direction, deg), rho (air density at the balloon, slug/ft³) }.
 */
export function pibal({ D, We, CD, gas, pG, TG, dt, rhoT, Cd, L, theta, az, rho }) {
  const S = (Math.PI * D * D) / 4, Vol = (Math.PI * D ** 3) / 6;
  const B = rho * Vol * G, Wg = gasWeight(Vol, pG, TG, gas), W = We + Wg, WT = L * (Math.PI * dt * dt / 4) * rhoT * G;
  if (!(B > W)) return { S, Vol, B, Wg, W, WT, lift: B - W, sinks: true };
  const V = windSpeed(B, W, theta, rho, CD, S), bs = bias({ B, W, WT, theta, rho, Cd, r: dt / 2, d: L, V });
  const Vc = bs.factor > 0 ? V * Math.sqrt(bs.factor) : NaN;
  return { S, Vol, B, Wg, W, WT, lift: B - W, V, ...bs, Vc, h: L * Math.sin(theta * RAD), north: Vc * Math.cos(az * RAD), east: Vc * Math.sin(az * RAD) };
}
