// Roll lock-in from nose vortices — C. P. Hoult & H. Tran, "Sounding Rocket Fin Design to Mitigate Roll Lock-In",
// and the "High Alfa Roll Lock-In" field tool. At angle of attack the nose sheds a vortex pair; with its images in the
// body it induces a roll moment on the tail fins (strip theory, incompressible cross flow, eqs. 1–19). Steady lunar
// lock-in at the pitch frequency is possible once the largest induced roll moment can balance fin roll damping
// (eq. 30). Fins are sized from the required static margin (eqs. 33, 37). Any consistent units.

/** Vortex pair at fin station x, ξ = (x − x_S)α/R (eqs. 1–4): circulation, core radius r, image radius s, roll angle φ_V. */
export function vortex(alpha, xi, R, U) {
  const Gamma = 2 * Math.PI * R * U * alpha * (0.6 + 0.08 * xi ** 1.52), z = R + 0.21 * xi * R, y = 0.7 * R, r = Math.hypot(y, z);
  return { Gamma, r, s: (R * R) / r, phiV: Math.atan(y / z) };
}

/** g of eq. 18 (definite, y from R to R + b) for one fin at roll angle φ and one vortex at (r, φ_V); C1 + C2·y is the chord. */
export function gFin(C1, C2, r, phiV, phi, R, b) {
  let d = phiV - phi;
  if (Math.abs(Math.sin(d)) < 1e-9) d += 1e-7;            // fin through the core: step past the singular line
  const c = Math.cos(d), rs = r * Math.sin(d), c2 = Math.cos(2 * d), c3 = Math.cos(3 * d);
  const F = (y) => {
    const L = Math.log(y * y - 2 * y * r * c + r * r), f0 = Math.atan((y - r * c) / rs) / rs;
    const f1 = L / 2 + r * c * f0, f2 = y + r * c * L + r * r * c2 * f0, f3 = (y * y) / 2 + 2 * y * r * c + r * r * (2 * c * c - 0.5) * L + r ** 3 * c3 * f0;
    return -C1 * r * c * f1 + (C1 - C2 * r * c) * f2 + C2 * f3;
  };
  return F(R + b) - F(R);
}

/** Vortex-induced roll moment coefficient C_Li (on πR²·2R) of N fins at roll angle φ, the four vortices of eq. 19. */
export function rollMoment(f, v, phi) {
  const k = (f.CNa * v.Gamma) / (2 * Math.PI * f.U * Math.PI * f.R ** 2 * 2 * f.R);
  let sum = 0;
  for (let i = 0; i < f.N; i++) {
    const p = phi + (2 * Math.PI * i) / f.N, g = (r, pv) => gFin(f.C1, f.C2, r, pv, p, f.R, f.b);
    sum += g(v.r, v.phiV) - g(v.r, -v.phiV) - g(v.s, v.phiV) + g(v.s, -v.phiV);
  }
  return k * sum;
}

/** Largest |C_Li| over roll angle (period 2π/N): coarse scan, then golden section. Returns { cl (signed), phi }. */
export function clMax(f, v, scan = 36) {
  const P = (2 * Math.PI) / f.N, h = P / scan, F = (phi) => Math.abs(rollMoment(f, v, phi));
  let best = 0, bv = -1;
  for (let i = 0; i < scan; i++) { const x = F(i * h); if (x > bv) { bv = x; best = i * h; } }
  let a = best - h, b = best + h;
  const gr = (Math.sqrt(5) - 1) / 2;
  let x1 = b - gr * (b - a), x2 = a + gr * (b - a), f1 = F(x1), f2 = F(x2);
  for (let i = 0; i < 16; i++) {
    if (f1 > f2) { b = x2; x2 = x1; f2 = f1; x1 = b - gr * (b - a); f1 = F(x1); } else { a = x1; x1 = x2; f1 = f2; x2 = a + gr * (b - a); f2 = F(x2); }
  }
  const phi = f1 > f2 ? x1 : x2, cl = rollMoment(f, v, phi);
  return Math.abs(cl) >= bv ? { cl, phi } : { cl: rollMoment(f, v, best), phi: best };
}

/**
 * p: { U, q, R, Ip, xCG, xN, CNN, xS, N, xF, b, lam, SM, CNa, CDaa, sweep (rad) }.
 * Fin size from the static margin, stability derivatives (eqs. 33–41) and the damping term of eq. 30.
 */
export function design(p) {
  const { U, q, R, Ip, xCG, xN, CNN, xF, N, b, lam, SM, CNa } = p;
  const CNaF = (CNN * (xCG + SM - xN)) / (xF - xCG - SM);                                     // eq. 37
  const c1 = 1 + (R / b) * (1 - lam), c2 = (lam - 1) / b, Rb = R + b;
  const cR = (2 * Math.PI * CNaF * R * R) / (CNa * N * (c1 * b + (c2 * (b * b + 2 * b * R)) / 2 + (c1 * b * R) / Rb + c2 * R * R * Math.log(Rb / R)));  // eq. 33
  const I3 = (c1 * (Rb ** 3 - R ** 3)) / 3 + (c2 * (Rb ** 4 - R ** 4)) / 4;
  const CMa = (xCG * (CNN + CNaF) - xN * CNN - xF * CNaF) / (2 * R);                         // eq. 36, on πR²·2R
  const CNr = -((xN - xCG) ** 2 * CNN + (xF - xCG) ** 2 * CNaF) / (2 * R * R);               // per Rr/U, as eq. 24 uses it
  const CNpa = (-N * (CNa - p.CDaa * Math.sin(p.sweep) ** 2) * cR * (I3 + R * R * (c1 * b + (c2 / 2) * (Rb * Rb - R * R)))) / (2 * Math.PI * R ** 4);  // eq. 41
  const CLp = (-N * CNa * cR * I3) / (2 * Math.PI * R ** 4);                                  // per Rp/U
  const k = (2 * Math.PI * q * R ** 3) / Ip, wn = Math.sqrt(-k * CMa), w = (k * R * (CNr - CNpa)) / U;  // ω_n, eq. 25
  const D = Math.abs((CLp * R * (w - wn)) / U);                                               // left side of eq. 30
  return { CNaF, cR, cT: lam * cR, c1, c2, C1: cR * c1, C2: cR * c2, CMa, CNr, CNpa, CLp, wn, w, D };
}

/** The lock-in curve |C_Li|max(α) on n steps to αmax, and α*, the smallest α where it reaches D (null if never). */
export function lockIn(p, d = design(p), n = 60, scan = 36) {
  const f = { N: p.N, R: p.R, b: p.b, C1: d.C1, C2: d.C2, CNa: p.CNa, U: p.U }, xi = (a) => ((p.xF - p.xS) * a) / p.R;
  const at = (a) => ({ alpha: a, ...clMax(f, vortex(a, xi(a), p.R, p.U), scan) });
  const curve = [];
  let alphaStar = null;
  for (let i = 1; i <= n; i++) {
    const c = at((p.alphaMax * i) / n);
    curve.push(c);
    if (alphaStar === null && Math.abs(c.cl) >= d.D) {
      let lo = (p.alphaMax * (i - 1)) / n, hi = c.alpha;
      for (let j = 0; j < 12; j++) { const m = (lo + hi) / 2; if (Math.abs(at(m).cl) >= d.D) hi = m; else lo = m; }
      alphaStar = hi;
    }
  }
  return { curve, alphaStar, f };
}

/** Per-axis standard deviation of the trim angle of attack from thrust misalignment and offset (eq. 27). */
export function sigmaAlpha(p, d) {
  const den = 2 * Math.PI * p.q * p.R ** 3 * (d.CMa - (2 * Math.PI * p.q * p.R ** 5 * (d.CNr - d.CNpa) ** 2) / (p.U * p.U * p.Ip));
  return Math.abs((p.T * Math.hypot(p.lT * p.sdT, p.sOm)) / den);
}
