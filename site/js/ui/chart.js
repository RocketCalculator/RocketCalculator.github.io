// Lightweight, theme-aware SVG line chart: nice ticks, hover read-out, legend toggles, SVG/CSV export.
// Colours come from CSS custom properties (--series-N), so charts follow light/dark mode automatically.
import { h, s, fmt, num, download, reducedMotion } from '../util.js';

export function niceTicks(min, max, count = 6) {
  if (!(Number.isFinite(min) && Number.isFinite(max))) return [];
  if (min === max) { const d = Math.abs(min) || 1; min -= d * 0.5; max += d * 0.5; }
  const span = max - min;
  const step0 = span / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(step0));
  const err = step0 / mag;
  const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
  const start = Math.ceil(min / step - 1e-9) * step, out = [];
  for (let v = start; v <= max + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12));
  return out;
}
function niceDomain([lo, hi], count) {
  if (lo === hi) { const d = Math.abs(lo) || 1; lo -= d * 0.5; hi += d * 0.5; }
  const t = niceTicks(lo, hi, count);
  const step = t.length > 1 ? t[1] - t[0] : (hi - lo);
  return [Math.min(lo, Math.floor(lo / step + 1e-9) * step), Math.max(hi, Math.ceil(hi / step - 1e-9) * step)];
}
const color = (i) => `var(--series-${(i % 6) + 1})`;

/**
 * createChart(host, { height, title }) → { update(spec), el }
 * spec = { x: {label, unit}, y: {label, unit}, series: [{name, points:[[x,y]], dashed, color}], markers:[{x,y,label,color}],
 *          hlines:[{y,label,color}], vlines:[{x,label,color}], xDomain, yDomain, includeZero, hover: 'x'|'y', aspect }
 */
export function createChart(host, opts = {}) {
  const wrap = h('div.chart');
  const svgHost = h('div.chart-body');
  const tip = h('div.chart-tip', { 'aria-hidden': 'true' });
  const legend = h('div.chart-legend');
  wrap.append(svgHost, tip, legend);
  host.append(wrap);
  const hidden = new Set();
  let spec = null, drawn = false, svg = null, geom = null;

  function render() {
    if (!spec) return;
    const W = Math.max(280, svgHost.clientWidth || 600);
    const H = Math.round(opts.height ?? Math.min(360, Math.max(230, W * (spec.aspect ?? 0.56))));
    const m = { l: 58, r: 18, t: 14, b: 44 };
    const series = spec.series.map((se, i) => ({ ...se, idx: i, col: se.color || color(i) })).filter((se) => se.points?.length);
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
      s('text', { class: 'axis-label', x: (m.l + W - m.r) / 2, y: H - 6, 'text-anchor': 'middle' }, lab(spec.x)),
      s('text', { class: 'axis-label', transform: `translate(13 ${(m.t + H - m.b) / 2}) rotate(-90)`, 'text-anchor': 'middle' }, lab(spec.y)));
    const clipId = 'clip' + Math.random().toString(36).slice(2, 8);
    const defs = s('defs', {}, s('clipPath', { id: clipId }, s('rect', { x: m.l, y: m.t - 2, width: W - m.l - m.r, height: H - m.t - m.b + 4 })));
    const plot = s('g', { 'clip-path': `url(#${clipId})` });
    for (const l of spec.hlines || []) {
      if (!Number.isFinite(l.y)) continue;
      plot.append(s('line', { class: 'hline', x1: m.l, x2: W - m.r, y1: Y(l.y), y2: Y(l.y), stroke: l.color || 'var(--text-3)' }));
      if (l.label) plot.append(s('text', { x: W - m.r - 4, y: Y(l.y) - 5, 'text-anchor': 'end', fill: l.color || 'var(--text-3)', 'font-size': 10.5 }, l.label));
    }
    for (const l of spec.vlines || []) {
      if (!Number.isFinite(l.x)) continue;
      plot.append(s('line', { class: 'hline', y1: m.t, y2: H - m.b, x1: X(l.x), x2: X(l.x), stroke: l.color || 'var(--text-3)' }));
      if (l.label) plot.append(s('text', { x: X(l.x) + 5, y: m.t + 11, fill: l.color || 'var(--text-3)', 'font-size': 10.5 }, l.label));
    }
    const animate = !drawn && !reducedMotion();
    for (const se of vis) {
      let d = '', pen = false;
      for (const [x, y] of se.points) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) { pen = false; continue; }
        d += `${pen ? 'L' : 'M'}${X(x).toFixed(2)},${Y(y).toFixed(2)}`; pen = true;
      }
      const p = s('path', { class: `series${se.dashed ? ' dashed' : ''}`, d, stroke: se.col, 'stroke-width': se.width || 2 });
      if (se.area) plot.append(s('path', { d: d + `L${X(se.points.at(-1)[0])},${Y(Math.max(yd[0], 0))}L${X(se.points[0][0])},${Y(Math.max(yd[0], 0))}Z`, fill: se.col, opacity: 0.08, stroke: 'none' }));
      plot.append(p);
      if (animate && !se.dashed) { requestAnimationFrame(() => { const len = p.getTotalLength?.() || 1000; p.style.setProperty('--len', len); p.classList.add('anim'); }); }
    }
    const marks = s('g', { class: 'marker' });
    for (const mk of spec.markers || []) {
      if (!Number.isFinite(mk.x) || !Number.isFinite(mk.y)) continue;
      const c = mk.color || 'var(--accent)';
      marks.append(s('circle', { cx: X(mk.x), cy: Y(mk.y), r: mk.r || 5, fill: c }));
      if (mk.label) {
        const right = X(mk.x) < W * 0.7;
        marks.append(s('text', { x: X(mk.x) + (right ? 9 : -9), y: Y(mk.y) - 8, 'text-anchor': right ? 'start' : 'end', fill: c }, mk.label));
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
        rows.push(h('div', h('i', { style: `background:${se.col}` }), `${se.name}: ${fmt(v, { digits: 4 })}`));
      }
      if (hoverY) cross.setAttribute('x1', m.l), cross.setAttribute('x2', W - m.r), cross.setAttribute('y1', Y(yv)), cross.setAttribute('y2', Y(yv));
      else cross.setAttribute('x1', X(xv)), cross.setAttribute('x2', X(xv)), cross.setAttribute('y1', m.t), cross.setAttribute('y2', H - m.b);
      cross.setAttribute('visibility', 'visible');
      const head = hoverY ? `${spec.y?.label || 'y'} = ${fmt(yv, { digits: 4 })}` : `${spec.x?.label || 'x'} = ${fmt(xv, { digits: 4 })}`;
      tip.replaceChildren(h('div', { style: 'color:var(--text-3)' }, head), ...rows);
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

    legend.replaceChildren(...(series.length > 1 || spec.legend ? series.map((se) => {
      const b = h('button', { type: 'button', 'aria-pressed': String(!hidden.has(se.name)) },
        h('i', { style: `background:${se.col}${se.dashed ? ';background:repeating-linear-gradient(90deg,' + se.col + ' 0 4px,transparent 4px 7px)' : ''}` }), se.name);
      b.addEventListener('click', () => { hidden.has(se.name) ? hidden.delete(se.name) : hidden.add(se.name); render(); });
      return b;
    }) : []));
  }

  const ro = new ResizeObserver(() => { if (svg && Math.abs((svgHost.clientWidth || 0) - (geom?.W || 0)) > 4) render(); });
  ro.observe(svgHost);
  window.addEventListener('themechange', () => render());

  return {
    el: wrap,
    update(next) { spec = next; render(); },
    toCSV() {
      if (!spec) return '';
      const lines = [];
      for (const se of spec.series) {
        lines.push(`# ${se.name}`, `${spec.x?.label || 'x'}${spec.x?.unit ? ' (' + spec.x.unit + ')' : ''},${spec.y?.label || 'y'}${spec.y?.unit ? ' (' + spec.y.unit + ')' : ''}`);
        for (const [x, y] of se.points) lines.push(`${num(x)},${num(y)}`);
        lines.push('');
      }
      return lines.join('\n');
    },
    toSVG() {
      if (!svg) return '';
      const clone = svg.cloneNode(true);
      // Inline computed colours so the exported file renders outside the page.
      const cs = getComputedStyle(document.documentElement);
      const resolve = (v) => v?.replace(/var\((--[\w-]+)\)/g, (_, n) => cs.getPropertyValue(n).trim());
      clone.querySelectorAll('*').forEach((n) => { for (const a of ['stroke', 'fill']) if (n.getAttribute(a)?.includes('var(')) n.setAttribute(a, resolve(n.getAttribute(a))); });
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const style = `text{font-family:${cs.getPropertyValue('--font-mono')};fill:${cs.getPropertyValue('--text-2')};font-size:11px}.grid line{stroke:${cs.getPropertyValue('--border')}}.axis path{stroke:${cs.getPropertyValue('--border-strong')};fill:none}.series{fill:none}.dashed{stroke-dasharray:6 4}.hline{stroke-dasharray:4 4}`;
      clone.prepend(s('style', {}, style));
      clone.prepend(s('rect', { width: '100%', height: '100%', fill: cs.getPropertyValue('--surface').trim() }));
      return new XMLSerializer().serializeToString(clone);
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

/** Card wrapper with title, ⓘ slot and export buttons. Returns { card, chart }. */
export function chartCard({ title, info, height, exportName = 'chart' }) {
  const body = h('div');
  const head = h('div.card-head', h('h3', title), info || null, h('span.spacer'));
  const card = h('section.card', head, body);
  const chart = createChart(body, { height, title });
  head.append(
    h('button.btn.ghost.small', { type: 'button', title: 'Download data as CSV', onclick: () => download(`${exportName}.csv`, chart.toCSV(), 'text/csv') }, 'CSV'),
    h('button.btn.ghost.small', { type: 'button', title: 'Download chart as SVG', onclick: () => download(`${exportName}.svg`, chart.toSVG(), 'image/svg+xml') }, 'SVG'));
  return { card, chart };
}
