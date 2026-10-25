// RocketBackView: the rear view (looking forward from behind) shown under every fin-count input.
// One component for every calculator: body tube (and motor tube when known) and N fins equally spaced, body radius,
// span and thickness to one scale; labelled with the angle between fins, the span, the body diameter and fin 1.
// A field opts in with `backView: (v) => ({ R, span, t, Rin, unit, note, range })` — see KNOWLEDGE.md.
import { s, fmt } from '../util.js';
import { svgRich } from '../math.js';

/**
 * rocketBackView({ N, R, span, t, Rin, nominal }, fmtLen) → <svg>. Lengths in one unit; fmtLen formats a length.
 * nominal = { span?: true, t?: true } marks dimensions this calculator does not take (drawn nominal, labelled so).
 */
export function rocketBackView({ N, R, span, t = 0, Rin = 0, nominal = {} }, fmtLen = (x) => fmt(x, { digits: 3 })) {
  // a dimension the user has cleared or mistyped is drawn as "not given" rather than letting NaN reach the SVG
  const ok = (x) => (Number.isFinite(x) && x > 0 ? x : 0);
  t = ok(t); Rin = ok(Rin); span = ok(span);
  const W = 260, H = 236, cx = 130, cy = 108, rOut = 74;
  const n = Math.max(0, Math.min(24, Math.round(N) || 0));
  const sp = Math.max(0, span || 0), k = rOut / Math.max(R + sp, R * 1.02, 1e-12), rb = R * k, rt = (R + sp) * k;
  const hw = Math.max(0.6, (t * k) / 2);                // to scale, at least ~1 px wide so it stays visible
  if (!(R > 0)) return s('svg', { class: 'rbv', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Rear view not available' },
    s('circle', { class: 'rbv-inner', cx, cy, r: 30 }), s('text', { class: 'rbv-caption', x: 2, y: 14 }, 'Viewed from behind'));
  const svg = s('svg', { class: 'rbv', viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': `Rear view, looking forward: ${n} fin${n === 1 ? '' : 's'}${n ? `, ${fmt(360 / n, { digits: 3 })}° apart` : ''}, fin 1 at the top` });
  const fins = s('g', {});
  for (let i = 0; i < n; i++) {
    // fin 1 straight up (12 o'clock); the others clockwise as seen from behind
    const th = (2 * Math.PI * i) / n - Math.PI / 2, ux = Math.cos(th), uy = Math.sin(th), nx = -uy * hw, ny = ux * hw;
    const P = [[rb, 1], [rt, 1], [rt, -1], [rb, -1]].map(([r, sg]) => `${(cx + ux * r + sg * nx).toFixed(2)},${(cy + uy * r + sg * ny).toFixed(2)}`);
    fins.append(s('path', { class: i === 0 ? 'rbv-fin rbv-fin1' : 'rbv-fin', d: `M${P.join('L')}Z` }));
  }
  svg.append(fins, s('circle', { class: 'rbv-body', cx, cy, r: rb }));
  if (Rin > 0 && Rin < R) svg.append(s('circle', { class: 'rbv-inner', cx, cy, r: Rin * k }));
  if (n >= 1) svg.append(s('text', { class: 'rbv-one', x: cx + hw + 4, y: Math.max(12, cy - rt + 10) }, '1'));
  // angle between fin 1 and fin 2
  if (n >= 2) {
    const a0 = -Math.PI / 2, a1 = a0 + (2 * Math.PI) / n, ra = rt + 9, large = n === 2 ? 0 : 0;
    const P = (a, r = ra) => `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
    svg.append(s('path', { class: 'rbv-dim', d: `M${P(a0)}A${ra},${ra} 0 ${large} 1 ${P(a1)}` }));
    const am = a0 + Math.min((a1 - a0) / 2, Math.PI / 4), lx = cx + (ra + 6) * Math.cos(am), ly = cy + (ra + 6) * Math.sin(am);
    svg.append(svgRich(s('text', { class: 'rbv-label', x: lx, y: ly + 4, 'text-anchor': 'start' }), `${fmt(360 / n, { digits: 3 })}°`, 11));
  }
  // body diameter below, span on the right of the horizontal fin direction
  const yd = cy + rOut + 18;
  svg.append(s('path', { class: 'rbv-dim', d: `M${cx - rb},${yd}H${cx + rb}M${cx - rb},${yd - 4}V${yd + 4}M${cx + rb},${yd - 4}V${yd + 4}` }));
  svg.append(svgRich(s('text', { class: 'rbv-label', x: cx, y: yd + 15, 'text-anchor': 'middle' }), `body ⌀ ${fmtLen(2 * R)}`, 11));
  svg.append(svgRich(s('text', { class: 'rbv-label', x: W - 2, y: 14, 'text-anchor': 'end' }), nominal.span ? 'span not used here' : `span ${fmtLen(sp)}`, 11));
  svg.append(s('text', { class: 'rbv-caption', x: 2, y: 14 }, 'Viewed from behind'));
  if (nominal.t) svg.append(s('text', { class: 'rbv-note', x: 2, y: H - 4 }, 'fin thickness not used here'));
  else if (t > 0 && (t * k) / 2 < 0.6) svg.append(s('text', { class: 'rbv-note', x: 2, y: H - 4 }, 'fins thicker than scale to stay visible'));
  return svg;
}

/** Warning for a fin count that is unusual in general or outside what the calculator's equations cover. */
export function finCountWarning(N, [lo, hi] = [3, 8]) {
  const n = Math.round(N);
  if (n < 1) return 'No fins: the rocket has no aerodynamic stability from fins.';
  if (n === 1) return 'One fin is asymmetric: it gives side force and roll, not stability. Use three or more.';
  if (n === 2) return 'Two fins stabilise in one plane only — the rocket can weathercock freely in the other. Use three or more.';
  if (n < lo || n > hi) return `This calculator’s equations are not established for ${n} fins (${lo}–${hi}); treat the results as indicative.`;
  return '';
}
