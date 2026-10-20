// Nose-cone shape functions — radius r(x) at distance x aft of the tip, for length L and base radius R.
// Standard definitions as collected by G. A. Crowell, "The Descriptive Geometry of Nose Cones" (1996).

export const NOSE_TYPES = [
  { value: 'ogive', label: 'Tangent ogive' },
  { value: 'cone', label: 'Conical' },
  { value: 'vonkarman', label: 'Von Kármán (Haack, C = 0)' },
  { value: 'lvhaack', label: 'LV-Haack (C = 1/3)' },
  { value: 'ellipse', label: 'Elliptical' },
  { value: 'parabolic', label: 'Parabolic series (K′)' },
  { value: 'power', label: 'Power series (n)' },
  { value: 'custom', label: 'Custom profile (enter points)' },
];

/** r(x): x measured from the tip (0 … L). opts: { k (parabolic K′, 0–1), n (power exponent, 0–1) } */
export function noseRadius(type, x, L, R, opts = {}) {
  const t = Math.min(1, Math.max(0, x / L));
  switch (type) {
    case 'cone': return R * t;
    case 'ogive': { const rho = (R * R + L * L) / (2 * R); return Math.sqrt(Math.max(0, rho * rho - (L - x) ** 2)) + R - rho; }
    case 'ellipse': return R * Math.sqrt(Math.max(0, 1 - (1 - t) ** 2));
    case 'parabolic': { const k = opts.k ?? 0.75; return (R * (2 * t - k * t * t)) / (2 - k); }
    case 'power': return R * t ** (opts.n ?? 0.5);
    case 'vonkarman': case 'lvhaack': {
      const C = type === 'lvhaack' ? 1 / 3 : 0, th = Math.acos(1 - 2 * t);
      return (R / Math.sqrt(Math.PI)) * Math.sqrt(Math.max(0, th - Math.sin(2 * th) / 2 + C * Math.sin(th) ** 3));
    }
    default: throw new Error(`Unknown nose type ${type}`);
  }
}

/**
 * Body profile [{x, r}] from the tip: nose of the given shape (n points, denser near the tip),
 * cylinder to the boat-tail start, optional conical boat-tail to the base.
 */
export function bodyProfile({ noseType, noseL, R, bodyLen, btLen = 0, btR = R, k, n: pow, points = 40 }) {
  const out = [];
  for (let i = 0; i <= points; i++) {
    const x = noseL * (i / points) ** 1.6;
    out.push({ x, r: i === points ? R : noseRadius(noseType, x, noseL, R, { k, n: pow }) });
  }
  const btStart = bodyLen - Math.max(0, btLen);
  if (btLen > 0 && btStart > noseL) { out.push({ x: btStart, r: R }); out.push({ x: bodyLen, r: btR }); }
  else out.push({ x: bodyLen, r: R });
  return out;
}
