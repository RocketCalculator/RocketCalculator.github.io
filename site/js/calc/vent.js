// Payload-bay venting in flight — C. P. Hoult, "Payload Bay Venting in Flight (rev. 2)" (RS&T, 2012), BLOWDOWN2 tool.
// Trapped air expands isentropically and leaves (or enters) through vents of total throat area A with orifice
// coefficient C_N; the throat is subsonic or choked. Matching the cavity mass loss to the vent flow (memo eq. 9):
//   dp_C/dt = ∓ γ√(γRT₀) (A/Vol) C_N M_T [1 + (γ−1)/2 M_T²]^{−(γ+1)/(2(γ−1))} p₀^{−(γ−1)/(2γ)} p_C^{(3γ−1)/(2γ)}
// (minus for outflow), integrated by RK4 along a tabulated trajectory. Vent exit pressure p_X = p_a + ½γp_aM²C_pX,
// C_pX from Kármán–Tsien below the critical Mach number, from a table above it. US units: ft, s, lbf/ft², °R.

const G = 1.4, R_AIR = 1716.4827;

/** Throat Mach number from the up/downstream pressure ratio (≥ 1), choked (1) beyond the sonic ratio (memo eqs. 2, 3). */
export function machThroat(pX, pC, g = G) {
  const ratio = pC >= pX ? pC / pX : pX / pC;
  if (ratio >= ((g + 1) / 2) ** (g / (g - 1))) return 1;   // the field tool never chokes: it compares with the inverse ratio
  return Math.sqrt((2 / (g - 1)) * (ratio ** ((g - 1) / g) - 1));
}

/** Orifice coefficient: Busemann interpolation between incompressible and choked values (memo eq. 4). */
export const orifice = (MT, Csonic, Cinc) => (MT < 1 ? Csonic / (1 + Math.sqrt(1 - MT * MT) * (Csonic / Cinc - 1)) : Csonic);

/** Linear interpolation in rows [[x, y], …] sorted by x, clamped at the ends. */
export function lerp(rows, x) {
  if (x <= rows[0][0]) return rows[0][1];
  let i = 0; while (i < rows.length - 2 && rows[i + 1][0] <= x) i++;
  const [x0, y0] = rows[i], [x1, y1] = rows[i + 1];
  return x >= x1 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

/** Vent-exit pressure coefficient at Mach M: Kármán–Tsien on Cp0 below Mcr, the table above (memo eq. 6). */
export function cpVent(M, Cp0, Mcr, table) {
  if (M < Mcr) { const b = Math.sqrt(1 - M * M); return Cp0 / (b + (Cp0 / 2) * (1 - b)); }
  const b = Math.sqrt(1 - Mcr * Mcr);
  return lerp([[Mcr, Cp0 / (b + (Cp0 / 2) * (1 - b))], ...table.filter(([m]) => m > Mcr)], M);
}

/**
 * Cavity pressure history. { traj: [[t, h (ft MSL), V (ft/s)], …], atm: h → { p, T }, Vol (ft³), A (ft²), Cinc, Csonic,
 * Cp0, Mcr, cpTable: [[M, Cp], …] above Mcr, dt (s) }. The cavity starts at the launch-site pressure and temperature.
 */
export function vent({ traj, atm, Vol, A, Cinc, Csonic, Cp0, Mcr, cpTable, dt }) {
  const a0 = atm(traj[0][1]), p0 = a0.p, T0 = a0.T;
  const K = (-G * Math.sqrt(G * R_AIR * T0) * A) / (Vol * p0 ** ((G - 1) / (2 * G)));
  const hOf = traj.map(([t, h]) => [t, h]), vOf = traj.map(([t, , V]) => [t, V]);
  const outside = (t) => {
    const a = atm(lerp(hOf, t)), M = lerp(vOf, t) / Math.sqrt(G * R_AIR * a.T), Cp = cpVent(M, Cp0, Mcr, cpTable);
    return { pa: a.p, M, Cp, pX: a.p + ((G * a.p * M * M) / 2) * Cp };
  };
  const rate = (pX, pC) => {
    const MT = machThroat(pX, pC), CN = orifice(MT, Csonic, Cinc);
    const mag = K * CN * MT * (1 + ((G - 1) / 2) * MT * MT) ** (-(G + 1) / (2 * (G - 1))) * pC ** ((3 * G - 1) / (2 * G));
    return pC > pX ? mag : -mag;                                         // K < 0: outflow lowers p_C
  };
  const tEnd = traj.at(-1)[0], n = Math.min(400000, Math.ceil((tEnd - traj[0][0]) / dt)), hist = [], keep = Math.max(1, Math.round(n / 2000));
  let t = traj[0][0], pC = p0, worst = { dp: 0, t }, o = outside(t);
  for (let i = 0; i <= n; i++) {
    const dp = pC - o.pX;
    if (i % keep === 0 || i === n) hist.push({ t, pC, ...o, dp });          // history thinned to about 2 000 rows
    if (Math.abs(dp) > Math.abs(worst.dp)) worst = { dp, t, M: o.M, pC, pX: o.pX, pa: o.pa };
    if (i === n) break;
    // RK4: the outside state at t, t + dt/2 and t + dt is computed once; t + dt carries to the next step
    const mid = outside(t + dt / 2).pX, next = outside(t + dt);
    const k1 = rate(o.pX, pC), k2 = rate(mid, pC + (dt * k1) / 2), k3 = rate(mid, pC + (dt * k2) / 2), k4 = rate(next.pX, pC + dt * k3);
    pC += (dt * (k1 + 2 * k2 + 2 * k3 + k4)) / 6; t += dt; o = next;
  }
  return { hist, worst, p0, T0, K };
}
