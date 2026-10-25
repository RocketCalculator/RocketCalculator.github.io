// Lightweight, theme-aware SVG line chart: nice ticks, hover read-out, legend toggles, SVG/CSV export.
// Colours come from CSS custom properties (--series-N), so charts follow light/dark mode automatically.
import { h, s, fmt, num, reducedMotion } from '../util.js';
import { svgRich, texHTML, texToPlain, hasTeX, rich } from '../math.js';
import { exportMenu, exportFigure } from './export.js';
// series names are bare TeX ('X_{CP}'), plain text, or text with $…$ maths ('Flutter Mach $M_f$')
const nameHTML = (n) => (String(n).includes('$') ? rich(n) : hasTeX(n) ? texHTML(n) : String(n).replace(/[&<]/g, (c) => (c === '&' ? '&amp;' : '&lt;')));

/** True when [a, b] is wide enough to draw: a range within ~1e-9 of its magnitude (a flat curve) is widened. */
const wideEnough = (a, b) => b - a > Math.max(Math.abs(a), Math.abs(b)) * 1e-9;

export function niceTicks(min, max, count = 6) {
  if (!(Number.isFinite(min) && Number.isFinite(max))) return [];
  if (!wideEnough(min, max)) { const d = Math.max(Math.abs(min), Math.abs(max)) || 1; min -= d * 0.5; max += d * 0.5; }
  const span = max - min;
  const step0 = span / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(step0));
  const err = step0 / mag;
  const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
  const start = Math.ceil(min / step - 1e-9) * step, out = [];
  // a span below the float resolution of the values (e.g. 52 ± 1e-12) would never advance: fall back to the ends
  const n = Math.floor((max - start) / step + 1e-9);
  if (!(n >= 0 && n <= 1000) || start + step === start) return [min, max].map((v) => +v.toPrecision(12));
  for (let i = 0; i <= n; i++) { const v = start + i * step; out.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12)); }
  return [...new Set(out)];
}
function niceDomain([lo, hi], count) {
  if (!wideEnough(lo, hi)) { const d = Math.max(Math.abs(lo), Math.abs(hi)) * 0.01 || 1; lo -= d; hi += d; }
  const t = niceTicks(lo, hi, count);
  const step = t.length > 1 ? t[1] - t[0] : (hi - lo);
  return [Math.min(lo, Math.floor(lo / step + 1e-9) * step), Math.max(hi, Math.ceil(hi / step - 1e-9) * step)];
}
const color = (i) => `var(--series-${(i % 6) + 1})`;

/** SVG path through screen points: straight segments, or a monotone cubic (Fritsch–Carlson) that never overshoots the data. */
export function linePath(P, smooth) {
  if (!P.length) return '';
  const f = (v) => v.toFixed(2);
  if (!smooth || P.length < 3) return P.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)},${f(y)}`).join('');
  const n = P.length, dx = [], m = [], t = new Array(n);
  for (let i = 0; i < n - 1; i++) { dx.push(P[i + 1][0] - P[i][0]); m.push(dx[i] ? (P[i + 1][1] - P[i][1]) / dx[i] : 0); }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
  let d = `M${f(P[0][0])},${f(P[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const h3 = dx[i] / 3;
    d += `C${f(P[i][0] + h3)},${f(P[i][1] + h3 * t[i])} ${f(P[i + 1][0] - h3)},${f(P[i + 1][1] - h3 * t[i + 1])} ${f(P[i + 1][0])},${f(P[i + 1][1])}`;
  }
  return d;
}

/**
 * createChart(host, { height, title }) → { update(spec), el }
 * spec = { x: {label, unit}, y: {label, unit}, series: [{name, points:[[x,y]], dashed, color, smooth, dots}], markers:[{x,y,label,color}],
 *          hlines:[{y,label,color}], vlines:[{x,label,color}], xDomain, yDomain, includeZero, hover: 'x'|'y', aspect }
 */
export function createChart(host, opts = {}) {
  const wrap = h('div.chart');
  const svgHost = h('div.chart-body');
  const tip = h('div.chart-tip', { 'aria-hidden': 'true' });
  const legend = h('div.chart-legend');
  const emptyMsg = h('div.chart-empty-msg', { role: 'status' });
  wrap.append(svgHost, tip, legend, emptyMsg);
  host.append(wrap);
  const hidden = new Set();
  let spec = null, drawn = false, svg = null, geom = null;

  function render() {
    if (!spec) return;
    const W = Math.max(280, svgHost.clientWidth || 600);
    const H = Math.round(opts.height ?? Math.min(360, Math.max(230, W * (spec.aspect ?? 0.56))));
    const m = { l: 58, r: 18, t: 14, b: 44 };
    // malformed points (not [x, y] pairs) are dropped rather than breaking the chart
    const series = spec.series.map((se, i) => ({ ...se, idx: i, col: se.color || color(i), points: (se.points || []).filter(Array.isArray) })).filter((se) => se.points.length);
    const vis = series.filter((se) => !hidden.has(se.name));
    const pts = vis.flatMap((se) => se.points).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
    const extraY = [...(spec.hlines || []).map((l) => l.y), ...(spec.markers || []).map((mk) => mk.y)].filter(Number.isFinite);
    const extraX = [...(spec.vlines || []).map((l) => l.x), ...(spec.markers || []).map((mk) => mk.x)].filter(Number.isFinite);
    let xd = spec.xDomain || [Math.min(...pts.map((p) => p[0]), ...extraX), Math.max(...pts.map((p) => p[0]), ...extraX)];
    let yd = spec.yDomain || [Math.min(...pts.map((p) => p[1]), ...extraY), Math.max(...pts.map((p) => p[1]), ...extraY)];
    if (!pts.length) { xd = spec.xDomain || [0, 1]; yd = spec.yDomain || [0, 1]; }
    if (spec.includeZero && !spec.yDomain) yd = [Math.min(0, yd[0]), Math.max(0, yd[1])];
    if (!spec.xDomain) xd = spec.xTight ? xd : niceDomain(xd, 7);
    if (!spec.yDomain) yd = niceDomain(yd, 6);
    const xLabelW = Math.max(...[xd[0], xd[1]].map((v) => fmt(v, { digits: 4 }).length)) * 7 + 22;
    const xt = niceTicks(xd[0], xd[1], Math.max(3, Math.min(8, Math.floor((W - m.l - m.r) / xLabelW)))), yt = niceTicks(yd[0], yd[1], 6);
    const X = (v) => m.l + ((v - xd[0]) / (xd[1] - xd[0] || 1)) * (W - m.l - m.r);
    const Y = (v) => H - m.b - ((v - yd[0]) / (yd[1] - yd[0] || 1)) * (H - m.t - m.b);
    geom = { X, Y, m, W, H, xd, yd, vis };
    const tickFmt = (v, ticks) => { const st = Math.abs(ticks[1] - ticks[0]) || 1; const d = Math.max(0, -Math.floor(Math.log10(st) + 1e-9)); return Math.abs(v) >= 1e5 || (Math.abs(v) < 1e-3 && v !== 0) ? fmt(v, { digits: 3 }) : v.toFixed(Math.min(d, 6)).replace(/^-/, '−'); };

    svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.title || spec.title || 'Chart', preserveAspectRatio: 'xMidYMid meet' });
    const grid = s('g', { class: 'grid' });
    for (const v of yt) grid.append(s('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }));
    for (const v of xt) grid.append(s('line', { y1: m.t, y2: H - m.b, x1: X(v), x2: X(v), opacity: 0.6 }));
    const axes = s('g', { class: 'axis' }, s('path', { d: `M${m.l},${m.t}V${H - m.b}H${W - m.r}`, fill: 'none' }));
    const ticks = s('g', { class: 'tick' });
    for (const v of yt) ticks.append(s('text', { x: m.l - 7, y: Y(v) + 3.5, 'text-anchor': 'end' }, tickFmt(v, yt)));
    for (const v of xt) ticks.append(s('text', { x: X(v), y: H - m.b + 15, 'text-anchor': 'middle' }, tickFmt(v, xt)));
    const lab = (a) => (a ? a.label + (a.unit ? ` (${a.unit})` : '') : '');
    const labels = s('g', {},
      svgRich(s('text', { class: 'axis-label', x: (m.l + W - m.r) / 2, y: H - 6, 'text-anchor': 'middle' }), lab(spec.x), 12),
      svgRich(s('text', { class: 'axis-label', transform: `translate(13 ${(m.t + H - m.b) / 2}) rotate(-90)`, 'text-anchor': 'middle' }), lab(spec.y), 12));
    const clipId = 'clip' + Math.random().toString(36).slice(2, 8);
    const defs = s('defs', {}, s('clipPath', { id: clipId }, s('rect', { x: m.l, y: m.t - 2, width: W - m.l - m.r, height: H - m.t - m.b + 4 })));
    const plot = s('g', { 'clip-path': `url(#${clipId})` });
    for (const l of spec.hlines || []) {
      if (!Number.isFinite(l.y)) continue;
      plot.append(s('line', { class: 'hline', x1: m.l, x2: W - m.r, y1: Y(l.y), y2: Y(l.y), stroke: l.color || 'var(--text-3)' }));
      if (l.label) plot.append(svgRich(s('text', { x: W - m.r - 4, y: Y(l.y) - 5, 'text-anchor': 'end', fill: l.color || 'var(--text-3)', 'font-size': 10.5 }), l.label, 10.5));
    }
    for (const l of spec.vlines || []) {
      if (!Number.isFinite(l.x)) continue;
      plot.append(s('line', { class: 'hline', y1: m.t, y2: H - m.b, x1: X(l.x), x2: X(l.x), stroke: l.color || 'var(--text-3)' }));
      if (l.label) plot.append(svgRich(s('text', { x: X(l.x) + 5, y: m.t + 11, fill: l.color || 'var(--text-3)', 'font-size': 10.5 }), l.label, 10.5));
    }
    const animate = !drawn && !reducedMotion();
    for (const se of vis) {
      // split at non-finite points; each run is drawn straight or as a monotone cubic (smooth)
      let d = '', run = [];
      const flush = () => { d += linePath(run, se.smooth); run = []; };
      for (const [x, y] of se.points) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) { flush(); continue; }
        run.push([X(x), Y(y)]);
      }
      flush();
      const p = s('path', { class: `series${se.dashed ? ' dashed' : ''}`, d, stroke: se.col, 'stroke-width': se.width || 2 });
      // area: true fills down to zero; area: 'above' fills up to the top of the plot (a danger zone above a limit)
      if (se.area) { const yEdge = se.area === 'above' ? Y(yd[1]) : Y(Math.max(yd[0], 0)); plot.append(s('path', { d: d + `L${X(se.points.at(-1)[0])},${yEdge}L${X(se.points[0][0])},${yEdge}Z`, fill: se.col, opacity: se.area === 'above' ? 0.12 : 0.08, stroke: 'none' })); }
      plot.append(p);
      if (se.dots) for (const [x, y] of se.points) if (Number.isFinite(x) && Number.isFinite(y)) plot.append(s('circle', { class: 'series-dot', cx: X(x).toFixed(2), cy: Y(y).toFixed(2), r: 2.6, fill: se.col }));
      if (animate && !se.dashed) { requestAnimationFrame(() => { const len = p.getTotalLength?.() || 1000; p.style.setProperty('--len', len); p.classList.add('anim'); }); }
    }
    const marks = s('g', { class: 'marker' });
    for (const mk of spec.markers || []) {
      if (!Number.isFinite(mk.x) || !Number.isFinite(mk.y)) continue;
      const c = mk.color || 'var(--accent)';
      marks.append(s('circle', { cx: X(mk.x), cy: Y(mk.y), r: mk.r || 5, fill: c }));
      if (mk.label) {
        const right = X(mk.x) < W * 0.7;
        marks.append(svgRich(s('text', { x: X(mk.x) + (right ? 9 : -9), y: Y(mk.y) - 8, 'text-anchor': right ? 'start' : 'end', fill: c }), mk.label, 11));
      }
    }
    const cross = s('line', { class: 'crosshair', y1: m.t, y2: H - m.b, visibility: 'hidden' });
    const dots = s('g');
    const hit = s('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent' });
    svg.append(defs, grid, axes, ticks, labels, plot, marks, cross, dots, hit);
    svgHost.replaceChildren(svg);
    drawn = true;

    const hoverY = spec.hover === 'y';
    const onMove = (ev) => {
      const r = svg.getBoundingClientRect();
      const px = ((ev.clientX - r.left) / r.width) * W, py = ((ev.clientY - r.top) / r.height) * H;
      const xv = xd[0] + ((px - m.l) / (W - m.l - m.r)) * (xd[1] - xd[0]);
      const yv = yd[0] + ((H - m.b - py) / (H - m.t - m.b)) * (yd[1] - yd[0]);
      const rows = [];
      dots.replaceChildren();
      for (const se of vis) {
        const v = interp(se.points, hoverY ? yv : xv, hoverY);
        if (v == null) continue;
        const [cx, cy] = hoverY ? [X(v), Y(yv)] : [X(xv), Y(v)];
        dots.append(s('circle', { class: 'hover-dot', cx, cy, r: 4, fill: se.col }));
        rows.push(h('div', h('i', { style: `background:${se.col}` }), h('span', { html: nameHTML(se.name) }), `: ${fmt(v, { digits: 4 })}`));
      }
      if (hoverY) cross.setAttribute('x1', m.l), cross.setAttribute('x2', W - m.r), cross.setAttribute('y1', Y(yv)), cross.setAttribute('y2', Y(yv));
      else cross.setAttribute('x1', X(xv)), cross.setAttribute('x2', X(xv)), cross.setAttribute('y1', m.t), cross.setAttribute('y2', H - m.b);
      cross.setAttribute('visibility', 'visible');
      const ax = hoverY ? spec.y : spec.x, val = hoverY ? yv : xv;
      const head = h('div', { style: 'opacity:.7', html: `${nameHTML(ax?.label || (hoverY ? 'y' : 'x'))} = ${fmt(val, { digits: 4 })}${ax?.unit ? ' ' + nameHTML(ax.unit) : ''}` });
      tip.replaceChildren(head, ...rows);
      const hr = svgHost.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      let left = ev.clientX - wr.left; const top = ev.clientY - wr.top;
      tip.style.left = `${left}px`; tip.style.top = `${top}px`;
      tip.classList.add('show');
      const tw = tip.offsetWidth;
      tip.style.transform = left + tw + 20 > hr.width ? 'translate(calc(-100% - 12px), -50%)' : 'translate(12px, -50%)';
    };
    const onLeave = () => { tip.classList.remove('show'); cross.setAttribute('visibility', 'hidden'); dots.replaceChildren(); };
    hit.addEventListener('pointermove', onMove);
    hit.addEventListener('pointerdown', onMove);
    hit.addEventListener('pointerleave', onLeave);

    // the legend follows the series the plot defines, not the ones that happen to have points: a legend that comes and
    // goes with the data changed the card's height (empty series are listed, dimmed)
    const all = spec.series.map((se, i) => series.find((x) => x.idx === i) || { ...se, idx: i, col: se.color || color(i), points: [], empty: true });
    legend.replaceChildren(...(all.length > 1 || spec.legend ? all.map((se) => {
      const b = h('button', { type: 'button', 'aria-pressed': String(!hidden.has(se.name)), disabled: se.empty || null, title: se.empty ? 'No points for these inputs' : null },
        h('i', { style: `background:${se.col}${se.dashed ? ';background:repeating-linear-gradient(90deg,' + se.col + ' 0 4px,transparent 4px 7px)' : ''}` }), h('span', { html: nameHTML(se.name) }));
      b.addEventListener('click', () => { hidden.has(se.name) ? hidden.delete(se.name) : hidden.add(se.name); render(); });
      return b;
    }) : []));
    // a plot whose number of series depends on the inputs keeps the legend row once it has had one
    if (legend.childElementCount) legend.style.minHeight = `${Math.max(legend.offsetHeight, parseFloat(legend.style.minHeight) || 0)}px`;
  }

  const ro = new ResizeObserver(() => { if (svg && Math.abs((svgHost.clientWidth || 0) - (geom?.W || 0)) > 4) render(); });
  ro.observe(svgHost);
  window.addEventListener('themechange', () => render());

  return {
    el: wrap,
    update(next) { spec = next; wrap.classList.remove('is-empty'); svgHost.style.minHeight = ''; render(); },
    /** No plot for these inputs: keep the card's size (dim the last drawing, or reserve the usual height) and say so. */
    empty(msg = 'Not available for these inputs.') {
      if (!svg) { const W = Math.max(280, svgHost.clientWidth || 600); svgHost.style.minHeight = `${Math.round(opts.height ?? Math.min(360, Math.max(230, W * 0.56)))}px`; }
      emptyMsg.textContent = msg; wrap.classList.add('is-empty');
    },
    /** One sheet per series: header row then [x, y] rows (plain-text labels with units). */
    toSheets() {
      if (!spec) return [];
      const P = texToPlain, col = (ax, d) => `${P(ax?.label || d)}${ax?.unit ? ' (' + P(ax.unit) + ')' : ''}`;
      return spec.series.map((se) => ({ name: P(se.name), rows: [[col(spec.x, 'x'), col(spec.y, 'y')], ...se.points.map(([x, y]) => [num(x), num(y)])] }));
    },
    toJSON(title) {
      if (!spec) return {};
      const P = texToPlain, ax = (a) => ({ label: P(a?.label || ''), unit: P(a?.unit || '') });
      return { title: P(title || ''), x: ax(spec.x), y: ax(spec.y), series: spec.series.map((se) => ({ name: P(se.name), points: se.points.filter((p) => p.every(Number.isFinite)) })) };
    },
    svgEl: () => svg,
    /** Temporarily draw title + legend into the SVG while fn(svg) runs synchronously (used for image export). */
    withLegend(fn, title) {
      if (!svg || !geom) return fn(svg);
      const vis = spec.series.filter((se) => se.points?.length && !hidden.has(se.name));
      const vb = svg.getAttribute('viewBox');
      const g = s('g', {});
      let x = 12, y = geom.H + 18, rowsH = 0;
      vis.forEach((se, i) => {
        const col = se.color || color(spec.series.indexOf(se));
        const w = 30 + texToPlain(se.name).length * 6.6;
        if (x + w > geom.W - 8) { x = 12; y += 18; }
        g.append(s('line', { x1: x, x2: x + 16, y1: y - 4, y2: y - 4, stroke: col, 'stroke-width': 3, 'stroke-dasharray': se.dashed ? '5 3' : null }));
        g.append(svgRich(s('text', { x: x + 22, y, fill: 'var(--text)', 'font-size': 11 }), se.name, 11));
        x += w; rowsH = y - geom.H + 8; void i;
      });
      let top = 0;
      if (title) { g.append(svgRich(s('text', { x: 12, y: -10, fill: 'var(--text)', 'font-size': 14, 'font-weight': 700 }), title, 14)); top = 26; }
      svg.append(g);
      svg.setAttribute('viewBox', `0 ${-top} ${geom.W} ${geom.H + (vis.length > 1 ? rowsH + 6 : 0) + top}`);
      try { return fn(svg); } finally { g.remove(); svg.setAttribute('viewBox', vb); }
    },
  };
}

function interp(points, v, byY) {
  const a = byY ? 1 : 0, b = byY ? 0 : 1;
  let best = null;
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i], q = points[i + 1];
    if (![p[0], p[1], q[0], q[1]].every(Number.isFinite)) continue;
    const lo = Math.min(p[a], q[a]), hi = Math.max(p[a], q[a]);
    if (v >= lo && v <= hi) {
      const t = hi === lo ? 0 : (v - p[a]) / (q[a] - p[a]);
      best = p[b] + t * (q[b] - p[b]);
      break;
    }
  }
  return best;
}

/** Card wrapper with title, ⓘ slot and one Export menu (data, vector and image formats). Returns { card, chart }. */
export function chartCard({ title, info, height, exportName = 'chart' }) {
  const body = h('div');
  const head = h('div.card-head', h('h3', { html: title.includes('$') ? title.replace(/\$([^$]+)\$/g, (_, x) => texHTML(x)) : title }), info || null, h('span.spacer'));
  const card = h('section.card', head, body);
  const chart = createChart(body, { height, title });
  head.append(exportMenu({ onExport: (f) => chart.withLegend((el) => el && exportFigure(el, f, exportName, { sheets: () => chart.toSheets(), json: () => chart.toJSON(title) }), title) }));
  return { card, chart };
}
