// Schematic helpers: scaled drawing frame, dimension lines, labels, draggable handles.
// Elements tagged with data-field="<inputId>" are linked to the form (hover/focus highlight both ways).
import { s, fmt } from '../util.js';
import { svgRich } from '../math.js';

let uid = 0;

/** Create (or reuse) the schematic <svg> inside host. Returns { svg, layer(name) }. */
export function frame(host, { width = 760, height = 360, label = 'Schematic' } = {}) {
  let svg = host.querySelector('svg.schem');
  if (!svg) {
    const id = `sc${++uid}`;
    svg = s('svg', { class: 'schem', viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': label, 'data-id': id });
    const mk = (name, cls) => s('marker', { id: `${id}-${name}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse' },
      s('path', { d: 'M0,1.5 L9,5 L0,8.5 z', class: cls }));
    svg.append(s('defs', {}, mk('arr', 'sc-arrow'), mk('arr-acc', 'sc-arrow-acc'), mk('arr-acc2', 'sc-arrow-acc2')));
    svg.append(s('style', {}, `.sc-arrow{fill:var(--schem-dim)}.sc-arrow-acc{fill:var(--accent)}.sc-arrow-acc2{fill:var(--accent-2)}`));
    host.prepend(svg);
  }
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const id = svg.dataset.id;
  const layers = {};
  const layer = (name) => {
    if (!layers[name]) {
      let g = svg.querySelector(`g[data-layer="${name}"]`);
      if (!g) { g = s('g', { 'data-layer': name }); svg.append(g); }
      layers[name] = g;
    }
    return layers[name];
  };
  return { svg, id, width, height, layer, arrow: (v = '') => `url(#${id}-arr${v ? '-' + v : ''})` };
}

/** Map model coordinates (x right, y up) into a box, keeping aspect ratio. */
export function fit(bounds, box, { flipY = true, align = 'center' } = {}) {
  const [x0, y0, x1, y1] = bounds;
  const bw = Math.max(1e-12, x1 - x0), bh = Math.max(1e-12, y1 - y0);
  const k = Math.min(box.w / bw, box.h / bh);
  const ox = box.x + (align === 'left' ? 0 : (box.w - bw * k) / 2), oy = box.y + (box.h - bh * k) / 2;
  return {
    k,
    X: (x) => ox + (x - x0) * k,
    Y: flipY ? (y) => oy + (y1 - y) * k : (y) => oy + (y - y0) * k,
    invX: (px) => x0 + (px - ox) / k,
    invY: flipY ? (py) => y1 - (py - oy) / k : (py) => y0 + (py - oy) / k,
  };
}

export const path = (pts, close = false) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join('') + (close ? 'Z' : '');

/**
 * Dimension line between (x1,y1) and (x2,y2) in SVG coords, offset perpendicular by `off` px,
 * with extension lines and a centred label. opts: { field, off, cls, textOff, anchor }
 */
export function dim(fr, x1, y1, x2, y2, label, opts = {}) {
  const off = opts.off ?? 0;
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const a = [x1 + nx * off, y1 + ny * off], b = [x2 + nx * off, y2 + ny * off];
  const g = s('g', { 'data-field': opts.field || null, class: opts.field ? 'sc-hit' : null });
  if (off) {
    const e = Math.sign(off) * 4;
    g.append(s('line', { class: 'sc-thin', x1: x1 + nx * 2 * Math.sign(off), y1: y1 + ny * 2 * Math.sign(off), x2: a[0] + nx * e, y2: a[1] + ny * e, opacity: 0.7 }));
    g.append(s('line', { class: 'sc-thin', x1: x2 + nx * 2 * Math.sign(off), y1: y2 + ny * 2 * Math.sign(off), x2: b[0] + nx * e, y2: b[1] + ny * e, opacity: 0.7 }));
  }
  const short = L < 26;
  g.append(s('line', { class: 'sc-dim', x1: a[0], y1: a[1], x2: b[0], y2: b[1], 'marker-start': short ? null : fr.arrow(), 'marker-end': short ? null : fr.arrow() }));
  if (label != null) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const to = opts.textOff ?? (Math.abs(dx) >= Math.abs(dy) ? -6 : 0);
    const vertical = Math.abs(dy) > Math.abs(dx);
    let tx = vertical ? mx + (opts.textSide ?? 8) : mx, ty = vertical ? my + 4 : my + to;
    let anchor = vertical ? (opts.textSide < 0 ? 'end' : 'start') : 'middle';
    if (opts.labelPos === 'before') { const p = dx >= 0 ? a : b; tx = p[0] - 6; ty = p[1] + 4; anchor = 'end'; }
    if (opts.labelPos === 'after') { const p = dx >= 0 ? b : a; tx = p[0] + 6; ty = p[1] + 4; anchor = 'start'; }
    const t = svgRich(s('text', { class: 'sc-dim-text', x: tx, y: ty, 'text-anchor': anchor }), label);
    g.append(t);
  }
  // wide invisible hit target so the dimension is easy to hover/tap
  g.append(s('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: 'transparent', 'stroke-width': 14 }));
  return g;
}

export function text(x, y, str, { cls = 'sc-label', anchor = 'start', field, size } = {}) {
  return svgRich(s('text', { class: cls, x, y, 'text-anchor': anchor, 'data-field': field || null, style: size ? `font-size:${size}px` : null }), str, size || 11.5);
}

/** Marker for CP / CG style points: circle with cross, labelled. */
export function pointMarker(x, y, label, { kind = 'cp', field } = {}) {
  const g = s('g', { 'data-field': field || null });
  const cls = kind === 'cp' ? 'sc-accent' : 'sc-accent2';
  g.append(s('circle', { cx: x, cy: y, r: 9, class: cls, fill: 'var(--surface)' }));
  if (kind === 'cg') {
    g.append(s('path', { d: `M${x},${y - 9}A9,9 0 0 1 ${x + 9},${y}L${x},${y}Z M${x},${y + 9}A9,9 0 0 1 ${x - 9},${y}L${x},${y}Z`, class: 'sc-accent2-fill' }));
  } else {
    g.append(s('circle', { cx: x, cy: y, r: 3.2, class: 'sc-accent-fill' }));
    g.append(s('line', { x1: x - 13, x2: x + 13, y1: y, y2: y, class: cls }));
    g.append(s('line', { y1: y - 13, y2: y + 13, x1: x, x2: x, class: cls }));
  }
  if (label) g.append(s('text', { x, y: y - 16, 'text-anchor': 'middle', class: 'sc-label', style: `fill:${kind === 'cp' ? 'var(--accent)' : 'var(--accent-2)'};font-weight:600` }, label));
  return g;
}

/**
 * Draggable handle. onDrag(svgX, svgY) is called with pointer position in SVG user units.
 * Keyboard: arrow keys call onKey(dx, dy) with ±1 (×10 with Shift).
 */
export function handle(fr, x, y, { field, onDrag, onKey, title } = {}) {
  const c = s('circle', { class: 'sc-handle', cx: x, cy: y, r: 7, 'data-field': field || null, tabindex: 0, role: 'slider', 'aria-label': title || 'Drag to change' });
  if (title) c.append(s('title', {}, title));
  const toSvg = (ev) => {
    const pt = fr.svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    const p = pt.matrixTransform(fr.svg.getScreenCTM().inverse());
    return [p.x, p.y];
  };
  c.addEventListener('pointerdown', (ev) => {
    ev.preventDefault(); c.setPointerCapture(ev.pointerId); c.classList.add('dragging');
    const move = (e) => onDrag?.(...toSvg(e));
    const up = () => { c.classList.remove('dragging'); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up); };
    c.addEventListener('pointermove', move); c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  });
  c.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 10 : 1;
    const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (map[e.key] && onKey) { e.preventDefault(); onKey(...map[e.key]); }
  });
  return c;
}

/** Format a value with its unit for schematic labels. */
export const lbl = (v, unit, digits = 4) => `${fmt(v, { digits })}${unit ? '\\,' + unit : ''}`;
