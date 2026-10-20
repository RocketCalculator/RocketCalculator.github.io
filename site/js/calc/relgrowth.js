// Reliability growth during flight test — C. P. Hoult, "Reliability Growth During Flight Test", RS&T, 2013, after
// W. Schaechter and C. P. Hoult, "Economic Considerations in Sounding Rocket Utilization", 1967.
// Expectation model: D₀ lethal latent defects; each shows up in a flight with probability p and, once seen, is found
// and fixed before the next flight with probability d. After n tests D_n = D₀(1 − pd)ⁿ and the next flight succeeds
// with probability R_n = (1 − p)^{D_n}. Dimensionless.

/** Expected latent defects left after n flight tests. */
export const defectsAfter = (D0, p, d, n) => D0 * (1 - p * d) ** n;

/** Reliability of the flight that follows n tests (n = 0: the first flight). */
export const reliability = (D0, p, d, n) => (1 - p) ** defectsAfter(D0, p, d, n);

/** Latent defects that still allow reliability Rt: (1 − p)^D ≥ Rt ⇔ D ≤ ln Rt / ln(1 − p). */
export const allowableDefects = (p, Rt) => Math.log(Rt) / Math.log(1 - p);

/**
 * Flight tests needed before the next flight reaches reliability Rt: the real-valued solution of
 * D₀(1 − pd)^T = D* and the whole number of flights (its ceiling). 0 when the first flight already meets Rt;
 * Infinity when nothing is ever fixed (pd = 0).
 */
export function flightsToReach(D0, p, d, Rt) {
  const Ds = allowableDefects(p, Rt);
  if (!(D0 > Ds)) return { exact: 0, flights: 0, Ds };
  if (!(p * d > 0)) return { exact: Infinity, flights: Infinity, Ds };
  const exact = Math.log(Ds / D0) / Math.log(1 - p * d);
  return { exact, flights: Math.max(0, Math.ceil(exact - 1e-9)), Ds };
}

/**
 * Flight-by-flight history for n = 0 … N: defects left D_n, reliability of the next flight R_n, defects expected to
 * show up in that flight D_n p and to be fixed after it D_n p d, and the expected failures in the first n flights.
 */
export function history(D0, p, d, N) {
  const rows = [];
  let F = 0;
  for (let n = 0; n <= N; n++) {
    const D = defectsAfter(D0, p, d, n), R = (1 - p) ** D;
    rows.push({ n, D, R, shown: D * p, fixed: D * p * d, F });
    F += 1 - R;
  }
  return rows;
}

/** Full evaluation. { D0, p, d, T (flight tests, whole number), Rt (target reliability) }. */
export function relgrowth({ D0, p, d, T, Rt }) {
  const h = history(D0, p, d, T), last = h[T];
  const need = flightsToReach(D0, p, d, Rt);
  return {
    R0: h[0].R, DT: last.D, RT: last.R, F: last.F, fixed: D0 - last.D, shownNext: last.shown, pd: p * d,
    Ds: need.Ds, Tstar: need.flights, Texact: need.exact, history: h,
  };
}
