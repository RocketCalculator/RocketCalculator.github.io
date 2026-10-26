// Wind-profile sketch for the flight drawings: a height axis with one point per layer, placed sideways by the wind
// speed and joined by a thin line, and an arrow at each point showing where the wind blows, seen from above
// (north up, east right). A demonstration, not a chart: no numbers. Y(h) is the drawing's own height scale.
import { s } from '../util.js';
import { text } from './svg.js';

/** layers: [{ h, w, dir (from, deg) }]; box: { x, w, yTop, yGround }; hMax: top height drawn. */
export function windSketch(g, layers, Y, box, hMax, field = 'winds') {
  const L = layers.filter((r) => [r.h, r.w, r.dir].every(Number.isFinite) && r.h <= hMax).sort((a, b) => a.h - b.h);
  if (!L.length) return;
  const wMax = Math.max(...L.map((r) => r.w), 1e-9), X = (w) => box.x + 8 + (w / wMax) * (box.w - 26);
  g.append(s('line', { x1: box.x, x2: box.x, y1: box.yGround, y2: box.yTop, class: 'sc-thin', 'data-field': field }));
  g.append(s('path', { d: `M${box.x - 4},${box.yTop + 7}L${box.x},${box.yTop}L${box.x + 4},${box.yTop + 7}`, class: 'sc-thin', fill: 'none' }));
  g.append(s('line', { x1: box.x, x2: box.x + box.w, y1: box.yGround, y2: box.yGround, class: 'sc-thin' }));
  g.append(s('path', { d: L.map((r, i) => `${i ? 'L' : 'M'}${X(r.w)},${Y(r.h)}`).join(''), fill: 'none', stroke: 'var(--text-3)', 'stroke-width': 1, 'data-field': field }));
  L.forEach((r, i) => {
    const x = X(r.w), y = Y(r.h), to = ((r.dir + 180) * Math.PI) / 180, ux = Math.sin(to), uy = -Math.cos(to), a = 11;
    g.append(s('circle', { cx: x, cy: y, r: i === 0 ? 3.6 : 2.6, fill: i === 0 ? 'var(--red)' : 'var(--text-2)', 'data-field': field }));
    const tx = x + a * ux, ty = y + a * uy, nx = -uy, ny = ux;
    g.append(s('path', { d: `M${x},${y}L${tx},${ty}M${tx - 4 * ux + 3 * nx},${ty - 4 * uy + 3 * ny}L${tx},${ty}L${tx - 4 * ux - 3 * nx},${ty - 4 * uy - 3 * ny}`, fill: 'none', stroke: 'var(--red)', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'data-field': field }));
  });
  g.append(text(box.x + box.w / 2, box.yGround + 16, 'wind (from above, N up)', { anchor: 'middle', size: 9.5, cls: 'sc-dim-text', field }));
}
