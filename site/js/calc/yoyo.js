// Two-mass yo-yo despinner with radial release — J. V. Fedor, "Theory and Design Curves for a Yo-Yo De-Spin
// Mechanism for Satellites", NASA TN D-708, 1961, as used in the RS&T yo-yo worksheet.
// Units: slug, ft, s, rad (any consistent set works for the dynamics).
//
// Phase 1: two weights (total mass m) unwind their wires from a drum of radius a. With c = 1 + I/(m a²), the unwound
//   angle grows as φ = ω₀t and the spin is ω = ω₀(c − φ²)/(c + φ²).
// Phase 2: each fully unwound wire swings about its drum attachment until it lies along the radius, where the weights
//   are released. Spin then follows from conservation of angular momentum and energy at release radius R = a + l.

export const G0 = 32.174;

/** Total despin mass that leaves spin ratio r = ω_f/ω₀ at radial release (exact conservation solution). */
export function radialMass(I, a, l, r) {
  const R = a + l, D = I * (1 - r), D2 = I * (1 - r * r);
  // (D + m a²)² = m R² (D2 + m a²)  →  A2 m² + A1 m + A0 = 0, with one positive root
  const A2 = a * a * (a * a - R * R), A1 = 2 * D * a * a - R * R * D2, A0 = D * D;
  return (-A1 - Math.sqrt(A1 * A1 - 4 * A2 * A0)) / (2 * A2);
}
/** Fedor's closed form (drops the small m²a² terms): m ≈ (1 − r) I / [(1 + r)R² − a²]. */
export const radialMassApprox = (I, a, l, r) => ((1 - r) * I) / ((1 + r) * (a + l) ** 2 - a * a);

/** Spin ratio after radial release for total mass m (inverse of radialMass). */
export function radialSpinRatio(I, a, l, m) {
  const R = a + l, J = I + m * a * a;
  // (J − I x)² = m R² (J − I x²)  →  I(I + mR²) x² − 2IJ x + J² − mR²J = 0; the root below 1 is the physical one
  const A = I * (I + m * R * R), B = -2 * I * J, C = J * J - m * R * R * J;
  return (-B - Math.sqrt(B * B - 4 * A * C)) / (2 * A);
}

/** Phase-1 wire tension (each wire) at unwound angle φ; maximum at φ² = c/3. */
export const phase1Tension = (m, a, w0, c, phi) => (m / 2) * a * w0 * w0 * (4 * c * phi * (c - 1)) / (c + phi * phi) ** 2;

/** Wire tension (each wire) at radial release, from the exact release state: the weight moves tangentially at
 *  u = (Jω₀ − Iω_f)/(mR) and the wire turns at β̇ = (u − aω_f)/l, so T = (m/2)(aω_f² + lβ̇²). */
export function releaseTension(I, a, l, w0, wf, m) {
  const R = a + l, J = I + m * a * a, u = (J * w0 - I * wf) / (m * R), bd = (u - a * wf) / l;
  return { T: (m / 2) * (a * wf * wf + l * bd * bd), u, wireRate: bd };
}

/** The worksheet's phase-2 tension estimate (each wire), weights mass mw — lower than the exact release value. */
export function phase2TensionFedor(mw, a, l, w0, r) {
  const k = l / a;
  return (mw * w0 * w0 * l * ((a * r * r) / l + ((r + 1) * (k + 1) - r * r) / k)) / 2;
}

/**
 * Time history of both phases by integrating the equations of motion (RK4) — used for the plots and for the
 * exact peak phase-2 tension. Returns samples { t, w, phase, T } and the state at release.
 */
export function simulate({ I, a, l, w0, m, n = 400 }) {
  const c = 1 + I / (m * a * a), phiE = l / a, t1 = phiE / w0, out = [];
  for (let i = 0; i <= n; i++) {
    const t = (t1 * i) / n, phi = w0 * t;
    out.push({ t, w: (w0 * (c - phi * phi)) / (c + phi * phi), phase: 1, T: phase1Tension(m, a, w0, c, phi) });
  }
  // phase 2: θ body angle, β wire angle (absolute); ψ = β − θ runs from −π/2 (tangent) to 0 (radial)
  const J = I + m * a * a, ml = m * l, mal = m * a * l;
  const acc = (s) => {
    const [, , th, bd] = s, psi = s[1] - s[0], cp = Math.cos(psi), sp = Math.sin(psi), pd = bd - th;
    // [J, mal cp; mal cp, m l²] [θ̈, β̈] = [mal sp (θ̇β̇ + β̇ψ̇), mal sp (θ̇ψ̇ − θ̇β̇)]
    const r1 = mal * sp * (th * bd + bd * pd), r2 = mal * sp * (th * pd - th * bd);
    const a11 = J, a12 = mal * cp, a22 = ml * l, det = a11 * a22 - a12 * a12;
    return [(r1 * a22 - a12 * r2) / det, (a11 * r2 - a12 * r1) / det];
  };
  const deriv = (s) => { const [tdd, bdd] = acc(s); return [s[2], s[3], tdd, bdd]; };
  let s = [0, -Math.PI / 2, (w0 * (c - phiE * phiE)) / (c + phiE * phiE), (2 * c * w0) / (c + phiE * phiE)];
  const tension = (st) => {
    const psi = st[1] - st[0], [tdd] = acc(st);
    return (m / 2) * (a * st[2] * st[2] * Math.cos(psi) + l * st[3] * st[3] - a * tdd * Math.sin(psi));
  };
  const dt = t1 / n / 4;
  let t = t1, k = 0, T2max = tension(s);
  while (s[1] - s[0] < 0 && k++ < 200000) {
    const k1 = deriv(s), k2 = deriv(s.map((x, i) => x + (dt / 2) * k1[i])), k3 = deriv(s.map((x, i) => x + (dt / 2) * k2[i])), k4 = deriv(s.map((x, i) => x + dt * k3[i]));
    const next = s.map((x, i) => x + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    if (next[1] - next[0] >= 0) {   // interpolate to ψ = 0
      const f = (0 - (s[1] - s[0])) / ((next[1] - next[0]) - (s[1] - s[0]));
      s = s.map((x, i) => x + f * (next[i] - x)); t += f * dt;
      break;
    }
    s = next; t += dt;
    const T = tension(s); T2max = Math.max(T2max, T);
    if (k % 4 === 0) out.push({ t, w: s[2], phase: 2, T });
  }
  out.push({ t, w: s[2], phase: 2, T: tension(s) });
  return { samples: out, t1, tRelease: t, wRelease: s[2], T2max: Math.max(T2max, tension(s)) };
}

/**
 * Design: inputs I (slug·ft²), a and l (ft), w0 and wf (rad/s), mu wire mass per length (slug/ft).
 */
export function yoyo({ I, a, l, w0, wf, mu = 0 }) {
  const r = wf / w0;
  const m = radialMass(I, a, l, r), mApprox = radialMassApprox(I, a, l, r);
  const mWeights = m - (2 * mu * l) / 3;                     // wires counted as one third of their mass (worksheet)
  const c = 1 + I / (m * a * a), lambda = Math.sqrt(I / m + a * a);
  const phiStar = Math.min(Math.sqrt(c / 3), l / a);
  const T1 = phase1Tension(m, a, w0, c, phiStar);
  const sim = simulate({ I, a, l, w0, m });
  const rel = releaseTension(I, a, l, w0, wf, m);
  return {
    r, m, mApprox, mWeights, weightEach: (G0 * mWeights) / 2, wireMass: 2 * mu * l, c, lambda, tUnwind: sim.t1, tRelease: sim.tRelease,
    T1, T1atEnd: phiStar < Math.sqrt(c / 3), T2: Math.max(rel.T, sim.T2max), T2release: rel.T, releaseSpeed: rel.u, wireRate: rel.wireRate, T2Fedor: phase2TensionFedor(mWeights, a, l, w0, r), wSim: sim.wRelease, sim,
  };
}
