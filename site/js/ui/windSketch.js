// Winds aloft as standard meteorological wind barbs on a height axis (the convention of station plots and soundings):
// the staff points to where the wind comes from (north up, east right), feathers sit on the north-hemisphere side and
// count the speed in knots — half feather 5 kn, feather 10 kn, flag 50 kn; a circle is calm (under 2.5 kn).
// Y(h) is the drawing's own height scale, so each barb sits at its height next to the flight path.
import { s } from '../util.js';
import { text } from './svg.js';

const KN = 0.592484;   // knots per ft/s

/** One barb rooted at (x, y): speed w (ft/s), from-direction dir (deg). */
export function barb(g, x, y, w, dir, field) {
  const kn = Math.round((w * KN) / 5) * 5;
  if (kn < 5) { g.append(s('circle', { cx: x, cy: y, r: 4, fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.3, 'data-field': field })); return; }
  const a = (dir * Math.PI) / 180, ux = Math.sin(a), uy = -Math.cos(a), nx = -uy, ny = ux, Ls = 30;
  const tip = [x + Ls * ux, y + Ls * uy], at = (d) => [tip[0] - d * ux, tip[1] - d * uy];
  let d = 'M' + x + ',' + y + 'L' + tip[0] + ',' + tip[1], fill = '', k = kn, pos = 0;
  const feather = (len) => { const [px, py] = at(pos); d += `M${px},${py}l${len * (0.94 * nx + 0.34 * ux)},${len * (0.94 * ny + 0.34 * uy)}`; };
  while (k >= 50) { const [px, py] = at(pos), [qx, qy] = at(pos + 7); fill += `M${px},${py}L${px + 12 * nx},${py + 12 * ny}L${qx},${qy}Z`; pos += 9; k -= 50; }
  while (k >= 10) { feather(12); pos += 5; k -= 10; }
  if (k >= 5) { if (pos === 0) pos = 4; feather(6.5); }
  g.append(s('path', { d, fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'data-field': field }));
  if (fill) g.append(s('path', { d: fill, fill: 'var(--text)', stroke: 'var(--text)', 'stroke-width': 0.8, 'data-field': field }));
  g.append(s('circle', { cx: x, cy: y, r: 2.4, fill: 'var(--red)', 'data-field': field }));
}

/** Wind arrow rooted at (x, y): length len px, pointing where the wind blows to (from-direction dir, deg; N up). */
export function windArrow(g, x, y, len, dir, field) {
  const to = ((dir + 180) * Math.PI) / 180, ux = Math.sin(to), uy = -Math.cos(to), nx = -uy, ny = ux, tx = x + len * ux, ty = y + len * uy, hd = Math.min(6, 0.45 * len);
  g.append(s('path', { d: `M${x},${y}L${tx},${ty}M${tx - hd * ux + 0.6 * hd * nx},${ty - hd * uy + 0.6 * hd * ny}L${tx},${ty}L${tx - hd * ux - 0.6 * hd * nx},${ty - hd * uy - 0.6 * hd * ny}`,
    fill: 'none', stroke: 'var(--red)', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'data-field': field }));
}

/**
 * Winds aloft on a height axis: one arrow per layer starting on the axis at its height, its length proportional to the
 * speed (the fastest layer drawn 44 px) and its angle the direction the wind blows, seen from above (north up).
 * layers: [{ h, w (ft/s), dir (from, deg) }]; box: { x, yTop, yGround }; hMax: top height drawn.
 */
export function windBarbs(g, layers, Y, box, hMax, field = 'winds', legendY = null) {
  const L = layers.filter((r) => [r.h, r.w, r.dir].every(Number.isFinite) && r.h >= 0 && r.h <= hMax).sort((a, b) => a.h - b.h);
  g.append(s('line', { x1: box.x, x2: box.x, y1: box.yGround, y2: box.yTop, class: 'sc-thin', 'data-field': field }));
  const ly = legendY ?? box.yTop - 8;   // legend baseline: above the axis, or where the caller has room
  g.append(text(6, ly - 12, 'Winds aloft', { size: 10.5, field }));
  g.append(text(6, ly, 'arrow: speed and direction, seen from above (N up)', { size: 9, cls: 'sc-dim-text', field }));
  const wMax = Math.max(...L.map((r) => r.w), 1e-9);
  let last = Infinity;
  for (const r of L) {
    const y = Y(r.h); if (last - y < 12) continue; last = y;
    g.append(s('circle', { cx: box.x, cy: y, r: 2.2, fill: 'var(--text-2)', 'data-field': field }));
    if (r.w > 0.02 * wMax) windArrow(g, box.x, y, 44 * (r.w / wMax), r.dir, field);
  }
}
