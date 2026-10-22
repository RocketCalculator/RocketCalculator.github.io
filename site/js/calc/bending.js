// Free-free bending modes of a non-uniform rocket body — C. P. Hoult, "Longitudinal Body Bending Dynamics" (RS&T,
// 2013) and the FLEXIT field tool. The first three modes of a uniform free-free beam,
//   ψ_j(ξ) = B_j (sinh β_jξ + sin β_jξ) + cosh β_jξ + cos β_jξ,  B_j = (cos β_j − cosh β_j)/(sinh β_j − sin β_j),
// are the Rayleigh–Ritz basis: K_ij = ∫ EI ψ_i″ψ_j″ dx, M_ij = ∫ m ψ_iψ_j dx, and det(ω²M − K) = 0.
// The body is a chain of elements with linearly varying stiffness EI and weight per length w. Units: lbf, ft, s.

export const BETA = [4.730040744862704, 7.853204624095838, 10.995607838001671];   // roots of cos β cosh β = 1
const B = BETA.map((b) => (Math.cos(b) - Math.cosh(b)) / (Math.sinh(b) - Math.sin(b)));

/** Uniform free-free mode j (0, 1, 2) and its second derivative with respect to ξ = x/L. */
export const psi = (j, xi) => { const a = BETA[j] * xi; return B[j] * (Math.sinh(a) + Math.sin(a)) + Math.cosh(a) + Math.cos(a); };
export const psi2 = (j, xi) => { const a = BETA[j] * xi; return BETA[j] ** 2 * (B[j] * (Math.sinh(a) - Math.sin(a)) + Math.cosh(a) - Math.cos(a)); };

/** Eigenvalues and vectors of K q = ω² M q (symmetric, M positive definite): Cholesky, then Jacobi rotations. */
export function eigen(K, M) {
  const n = K.length, L = M.map((r) => r.map(() => 0));
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = M[i][j]; for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
    L[i][j] = i === j ? Math.sqrt(s) : s / L[j][j];
  }
  const solve = (b) => { const y = []; for (let i = 0; i < n; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i][k] * y[k]; y.push(s / L[i][i]); } return y; };   // L⁻¹ b
  const Linv = Array.from({ length: n }, (_, c) => solve(Array.from({ length: n }, (_, r) => +(r === c)))).map((col, c, all) => all.map((cl) => cl[c]));
  const A = Linv.map((r) => Linv.map((s) => r.reduce((acc, _, i) => acc + r[i] * K[i].reduce((a2, kij, j) => a2 + kij * s[j], 0), 0)));
  const V = A.map((r, i) => r.map((_, j) => +(i === j)));
  for (let sweep = 0; sweep < 50; sweep++) for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
    if (Math.abs(A[p][q]) < 1e-15 * (Math.abs(A[p][p]) + Math.abs(A[q][q]))) continue;
    const th = 0.5 * Math.atan2(2 * A[p][q], A[q][q] - A[p][p]), c = Math.cos(th), s = Math.sin(th);
    for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
    for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
    for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
  }
  // back to the original coordinates, q = L⁻ᵀ v, sorted by eigenvalue
  return A.map((r, i) => ({ lam: r[i], q: Linv.map((_, a) => Linv.reduce((acc, row, b) => acc + row[a] * V[b][i], 0)) })).sort((x, y) => x.lam - y.lam);
}

/**
 * Full evaluation. elems: [{ x (aft station, in), EIf, EIa (lbf·in²), wf, wa (lbf/in) }] from station 0; g (ft/s²).
 * Returns the stiffness and mass matrices, the three natural frequencies (rad/s), the Ritz coefficients and the
 * uniform-beam reference frequencies.
 */
export function bending(elems, g = 32.174) {
  const L = elems.at(-1).x / 12, K = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  let x0 = 0, sumEI = 0, sumM = 0;
  for (const e of elems) {
    const a = x0 / 12, b = e.x / 12, n = 400, h = (b - a) / n;               // composite Simpson on each element
    for (let k = 0; k <= n; k++) {
      const x = a + k * h, f = (x - a) / (b - a || 1), wgt = (k === 0 || k === n ? 1 : k % 2 ? 4 : 2) * (h / 3);
      const EI = (e.EIf + (e.EIa - e.EIf) * f) / 144, m = (12 * (e.wf + (e.wa - e.wf) * f)) / g, xi = x / L;
      const p = [0, 1, 2].map((j) => psi(j, xi)), p2 = [0, 1, 2].map((j) => psi2(j, xi) / (L * L));
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { K[i][j] += wgt * EI * p2[i] * p2[j]; M[i][j] += wgt * m * p[i] * p[j]; }
      sumEI += wgt * EI; sumM += wgt * m;
    }
    x0 = e.x;
  }
  const modes = eigen(K, M).map(({ lam, q }) => { const s = q[0] + q[1] + q[2]; return { omega: Math.sqrt(lam), q: q.map((v) => v / s) }; });   // nose value 2, as the field tool
  const a = Math.sqrt(sumEI / sumM);                                         // length-averaged EI and mass
  return { L, K, M, modes, uniform: BETA.map((bt) => a * (bt / L) ** 2), mass: sumM * g };
}

/** Mode shape value at ξ = x/L for Ritz coefficients q. */
export const shape = (q, xi) => q[0] * psi(0, xi) + q[1] * psi(1, xi) + q[2] * psi(2, xi);
