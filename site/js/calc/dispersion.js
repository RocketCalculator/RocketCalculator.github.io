// Flight path angle dispersions — C. P. Hoult, "Flight Path Angle Dispersions" (RS&T, 2011), and the DISPERSION tool.
// Rolling rocket in vertical boost: thrust misalignment holds a steady angle of attack whose constant lift L_A turns the
// velocity vector (eqs. 2–4); roll spins that turn around (eq. 5), so it is summed as east and north components (eq. 6).
// Gusts add a planar part (eq. 7); the two are root-sum-squared (eq. 8) and mapped back to an equivalent launcher
// angle (eq. 10). US units: ft, slug, lbf, s, rad. Altitude h is measured along the rail from the start of motion.

/**
 * p: { rho, S, CLa, T, I, arm, dT, Om, m, a, g, sG, lG, rollWave, lP, L, hb }; a is the boost acceleration (ft/s²).
 * Returns burnout values and a history of about 400 rows.
 */
export function dispersion(p) {
  const { rho, S, CLa, T, I, m, a, g, sG, lG, lP, L, hb } = p, lR = (2 * Math.PI) / p.rollWave, n = g / (2 * a);
  const LA = (rho * S * CLa * T * Math.hypot(p.arm * p.dT, p.Om)) / (2 * I * (lP * lP - lR * lR));   // eq. 2
  const alphaG = sG * lP * Math.sqrt(lG / (2 * a * (lP * lP + lG * lG)));                                 // eq. 15 of the gust memo
  const K = (rho * S * L * CLa * a * alphaG) / (m * (2 * a - g));                                       // eq. 7
  const Z = (h) => (h / L) ** n, gT = (h) => (LA / (m * g)) * (Z(h) - 1);                               // eq. 4
  const row = (h, E, N) => {
    const gD = Math.hypot(E, N), gG = K * (h / L - Z(h)), gam = Math.hypot(gD, gG);
    return { h, gT: gT(h), E, N, gD, gG, gam, g0: gam / Z(h) };
  };
  // exact ΔγT per step, resolved at the mid-step roll angle (eq. 5); 4 ft steps as the memo, ≥ 60 per roll cycle
  const steps = Math.min(40000, Math.ceil((hb - L) / Math.min(4, p.rollWave / 60))), dh = (hb - L) / steps, every = Math.ceil(steps / 400);
  let E = 0, N = 0;
  const hist = [row(L, 0, 0)];
  for (let i = 0; i < steps; i++) {
    const h0 = L + i * dh, d = gT(h0 + dh) - gT(h0), phi = lR * (h0 + dh / 2 - L);
    E += d * Math.cos(phi); N += d * Math.sin(phi);
    if ((i + 1) % every === 0 || i === steps - 1) hist.push(row(h0 + dh, E, N));
  }
  return { LA, n, K, alphaG, lR, ...hist[hist.length - 1], hist };
}
