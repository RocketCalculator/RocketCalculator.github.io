// DiagramViewport: the container every schematic is drawn in (KNOWLEDGE.md → Shared component reference).
//  • Fixed aspect ratio, taken from the drawing's own canvas the first time it is drawn, so the box never changes
//    size when the inputs change (a drawing whose canvas grows is letterboxed inside it).
//  • Opens fitted to the canvas; zoom 1× (fit) … 8×; pan and zoom only rewrite the SVG viewBox, inside
//    requestAnimationFrame — nothing is recomputed or redrawn while the view moves.
//  • Never traps the page: the mouse wheel zooms only while the diagram is active (clicked or focused) or with
//    Ctrl/⌘ held; on touch one finger scrolls the page (touch-action: pan-y) and two fingers pinch/pan the diagram.
//    Draggable dimension handles keep one-finger dragging (their own touch-action: none).
//  • The view (relative zoom and centre) survives redraws, so moving a slider never resets it.
//  • + / − / Reset buttons, double-click resets, keyboard: + − zoom, arrows pan, 0 resets.
import { h } from '../util.js';

const MAX_ZOOM = 8;

/** Wrap host (the element frame() draws into). Returns { el, stage, attach(svg), reset(), zoomBy(f, px, py), withBase(fn), state() }. */
export function diagramViewport(host, { label = 'Diagram' } = {}) {
  const zoomIn = h('button.dv-btn', { type: 'button', title: 'Zoom in (+)', 'aria-label': 'Zoom in' }, '+');
  const zoomOut = h('button.dv-btn', { type: 'button', title: 'Zoom out (−)', 'aria-label': 'Zoom out' }, '−');
  const resetBtn = h('button.dv-btn.dv-reset', { type: 'button', title: 'Reset view (double-click, 0)', 'aria-label': 'Reset view' }, 'Reset view');
  const hint = h('div.dv-hint', { 'aria-hidden': 'true' });
  // the stage holds the drawing; the controls sit in a bar below it so they never cover the drawing
  const stage = h('div.dv', { tabindex: 0, role: 'group', 'aria-label': `${label}: click or focus, then scroll or press + and − to zoom; drag to pan` });
  const el = h('div.dv-wrap', stage, h('div.dv-bar', hint, h('span.spacer'), zoomOut, zoomIn, resetBtn));
  host.parentNode?.insertBefore(el, host);
  stage.append(host);

  let svg = null, base = null;            // base = fitted viewBox {x, y, w, h} of the current canvas
  let z = 1, cx = 0.5, cy = 0.5;          // zoom and view centre as fractions of the base box
  let active = false, raf = 0;

  const clampView = () => {
    z = Math.min(MAX_ZOOM, Math.max(1, z));
    const half = 0.5 / z;
    cx = Math.min(1 - half, Math.max(half, cx)); cy = Math.min(1 - half, Math.max(half, cy));
  };
  const apply = () => {
    raf = 0;
    if (!svg || !base) return;
    clampView();
    const w = base.w / z, hh = base.h / z;
    svg.setAttribute('viewBox', `${base.x + cx * base.w - w / 2} ${base.y + cy * base.h - hh / 2} ${w} ${hh}`);
    stage.classList.toggle('dv-zoomed', z > 1.001);
    resetBtn.disabled = z <= 1.001;
    zoomOut.disabled = z <= 1.001; zoomIn.disabled = z >= MAX_ZOOM - 1e-6;
  };
  const schedule = () => { raf ||= requestAnimationFrame(apply); };

  /** Called after every redraw: the drawing sets its own viewBox (its canvas); keep the user's view on top of it. */
  function attach(s) {
    svg = s;
    const vb = svg.viewBox.baseVal;
    if (!vb || !vb.width) return;
    const next = { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
    if (!base) stage.style.aspectRatio = `${next.w} / ${next.h}`;   // fixed from the first canvas
    base = next;
    svg.dataset.base = `${next.x} ${next.y} ${next.w} ${next.h}`;  // the fitted view, for copies and exports
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    apply();
  }
  const reset = () => { z = 1; cx = cy = 0.5; schedule(); };
  /** Zoom by factor f about the point (px, py) given as fractions of the visible box (default: its centre). */
  function zoomBy(f, px = 0.5, py = 0.5) {
    const z0 = z;
    z = Math.min(MAX_ZOOM, Math.max(1, z * f));
    // keep the point under the cursor fixed
    cx += (px - 0.5) / z0 - (px - 0.5) / z; cy += (py - 0.5) / z0 - (py - 0.5) / z;
    schedule();
  }
  const frac = (e) => { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
  const idleHint = matchMedia('(hover: none) and (pointer: coarse)').matches ? 'Pinch with two fingers or tap + to zoom' : 'Click the drawing, then scroll to zoom';
  const setActive = (on) => { active = on; stage.classList.toggle('dv-active', on); hint.textContent = on ? 'Scroll to zoom · drag to pan · Esc to leave' : idleHint; };
  setActive(false);

  zoomIn.addEventListener('click', (e) => { e.stopPropagation(); zoomBy(1.6); });
  zoomOut.addEventListener('click', (e) => { e.stopPropagation(); zoomBy(1 / 1.6); });
  resetBtn.addEventListener('click', (e) => { e.stopPropagation(); reset(); });
  stage.addEventListener('dblclick', (e) => { if (!e.target.closest('.sc-handle')) reset(); });
  stage.addEventListener('focusin', () => setActive(true));
  stage.addEventListener('focusout', (e) => { if (!stage.contains(e.relatedTarget)) setActive(false); });
  stage.addEventListener('keydown', (e) => {
    if (e.target.closest('.sc-handle')) return;             // handles use the arrow keys themselves
    const step = 0.1 / z, keys = { '+': () => zoomBy(1.25), '=': () => zoomBy(1.25), '-': () => zoomBy(0.8), '0': reset,
      ArrowLeft: () => { cx -= step; schedule(); }, ArrowRight: () => { cx += step; schedule(); }, ArrowUp: () => { cy -= step; schedule(); }, ArrowDown: () => { cy += step; schedule(); },
      Escape: () => stage.blur() };
    if (keys[e.key] && (e.key.startsWith('Arrow') ? z > 1.001 : true)) { e.preventDefault(); keys[e.key](); }
  });
  stage.addEventListener('wheel', (e) => {
    if (!svg || !(active || e.ctrlKey || e.metaKey)) return;  // otherwise the page scrolls as usual
    e.preventDefault();
    const [px, py] = frac(e);
    zoomBy(Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * 0.004), px, py);
  }, { passive: false });

  // pointer pan (mouse/pen drag, or two-finger touch); one touch finger is left to the page
  const pts = new Map();
  let last = null;
  stage.addEventListener('pointerdown', (e) => {
    if (!svg || e.target.closest('.sc-handle, a, button')) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (e.pointerType === 'touch' && pts.size < 2) return;
    stage.setPointerCapture(e.pointerId);
    last = null;
  });
  stage.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    const P = [...pts.values()], touch = e.pointerType === 'touch';
    if (touch && P.length < 2) return;
    if (!touch && !(e.buttons & 1)) return;
    const mid = [P.reduce((a, p) => a + p[0], 0) / P.length, P.reduce((a, p) => a + p[1], 0) / P.length];
    const spread = P.length > 1 ? Math.hypot(P[0][0] - P[1][0], P[0][1] - P[1][1]) : 0;
    if (last) {
      const r = svg.getBoundingClientRect();
      cx -= (mid[0] - last.mid[0]) / r.width / z; cy -= (mid[1] - last.mid[1]) / r.height / z;
      if (spread && last.spread) zoomBy(spread / last.spread, (mid[0] - r.left) / r.width, (mid[1] - r.top) / r.height);
      else schedule();
      stage.classList.add('dv-panning');
    }
    last = { mid, spread };
  });
  const end = (e) => { pts.delete(e.pointerId); last = null; if (!pts.size) stage.classList.remove('dv-panning'); };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end); stage.addEventListener('lostpointercapture', end);

  /** Run fn with the fitted (unzoomed) view, e.g. to export the whole drawing. */
  function withBase(fn) {
    if (!svg?.dataset.base) return fn();
    const vb = svg.getAttribute('viewBox');
    svg.setAttribute('viewBox', svg.dataset.base);
    try { return fn(); } finally { svg.setAttribute('viewBox', vb); }
  }
  return { el, stage, attach, reset, zoomBy, withBase, state: () => ({ zoom: z, cx, cy, active }) };
}
