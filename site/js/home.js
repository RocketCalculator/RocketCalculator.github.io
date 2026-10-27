// Home page: hero, walkthrough, topic grid with search/filter, navigation guide, units & colour code.
import { h, s, url, loadRegistry, loadReferences, reveal, reducedMotion, storage } from './util.js';
import { initShell, openPalette } from './app.js';

// Hero: a small flight you can play with. Boost along the rail, coast to apogee, drogue at apogee, main low down, drift
// to landing in the wind. Drag the rail to change the launch angle and the wind arrow to change the wind; the path, the
// deployments and the landing point follow. Screen units: x right, altitude up from the ground line (y = 330).
const GY = 330, X0 = 72, G = 40, VB = 104, LB = 118;   // gravity (px/s²), burnout speed (px/s), boost length (px)
const VD = 34, VM = 11, HM = 92;                       // drogue and main descent rates (px/s), main opening height (px)

/** Flight points { x, y, phase } every 0.04 s of model time for launch angle th (deg) and wind w (px/s, + to the right). */
function flight(th, w) {
  const a = (th * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a), pts = [], dt = 0.04;
  const xb = X0 + LB * c, hb = LB * sn;
  const tb = (2 * LB) / VB;
  for (let t = 0; t <= tb; t += dt) { const d = LB * (t / tb) ** 2; pts.push({ x: X0 + d * c, h: d * sn, phase: 'boost', t }); }
  // coast: the wind turns the climbing rocket a little into it (weathercocking) and carries it with it
  const vx = VB * c - 0.25 * w, vy = VB * sn, ta = vy / G;
  for (let t = dt; t <= ta; t += dt) pts.push({ x: xb + vx * t + 0.15 * w * t, h: hb + vy * t - (G * t * t) / 2, phase: 'coast', t: tb + t });
  const xa = xb + vx * ta + 0.15 * w * ta, ha = hb + (vy * vy) / (2 * G), tA = tb + ta;
  pts.push({ x: xa, h: ha, phase: 'apogee', t: tA });
  // descent, smoothed: the rocket first falls freely and keeps its sideways speed (carried at the stretched scale of the
  // climb, so the path does not kink), then settles to the drogue rate and the wind; the main eases the rate down again
  const ASC = 3.2;
  let x = xa, hh = ha, t = tA, vz = 0, u = ASC * (vx + 0.15 * w), tM = null;
  while (hh > 0) {
    t += dt;
    if (hh <= HM && tM == null) tM = t;
    // descent and sideways speeds ease towards the drogue (then main) rate and the wind
    vz += ((hh > HM ? VD : VM) - vz) * (1 - Math.exp(-dt / (hh > HM ? 0.9 : 0.7)));
    u += (w - u) * (1 - Math.exp(-dt / 0.7));
    hh = Math.max(0, hh - vz * dt); x += u * dt;
    pts.push({ x, h: hh, phase: hh > HM || tM == null ? 'drogue' : 'main', t });
  }
  // fill the frame: the climb's sideways spread is stretched (it is small next to the drift), then the whole flight is
  // scaled so the landing sits near the right edge; heights stay to scale
  const xaS = X0 + ASC * (xa - X0), land = x - xa;
  const sx = (p) => (p.phase === 'drogue' || p.phase === 'main' ? xaS + (p.x - xa) : X0 + ASC * (p.x - X0));
  const k = (600 - X0) / Math.max(xaS - X0 + land, xaS - X0 + 120, 160), X = (v) => X0 + k * (v - X0);
  return { pts: pts.map((p) => ({ ...p, x: X(sx(p)), y: GY - p.h })), xb: X(X0 + ASC * (xb - X0)), hb, xa: X(xaS), ha, tA, tM };
}

function heroArt() {
  const state = { th: 84, w: 12 };
  const stars = Array.from({ length: 34 }, (_, i) => {
    const x = (i * 97.3) % 640, y = (i * 53.7) % 220, r = (i % 3) * 0.45 + 0.6;
    return s('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r, fill: 'var(--star)', class: i % 4 === 0 ? 'twinkle' : null, style: `animation-delay:${(i % 7) * 0.4}s` });
  });
  const trail = s('path', { fill: 'none', stroke: 'var(--red)', 'stroke-width': 2.2, opacity: 0.95 });
  const ghost = s('path', { fill: 'none', stroke: 'var(--red)', 'stroke-width': 1, opacity: 0.3, 'stroke-dasharray': '5 6' });
  const marks = s('g');
  const rail = s('line', { x1: X0, y1: GY + 2, stroke: 'rgba(255,255,255,.85)', 'stroke-width': 3, 'stroke-linecap': 'round' });
  const railKnob = s('circle', { r: 9, fill: 'rgba(255,255,255,.12)', stroke: '#fff', 'stroke-width': 1.4, class: 'hero-knob', tabindex: 0, role: 'slider', 'aria-label': 'Launch angle' });
  const windG = s('g', { transform: 'translate(500 52)' });
  const windArrow = s('path', { stroke: '#fff', fill: 'none', 'stroke-width': 1.6 });
  const windKnob = s('circle', { cy: 0, r: 8, fill: 'rgba(255,255,255,.12)', stroke: '#fff', 'stroke-width': 1.4, class: 'hero-knob', tabindex: 0, role: 'slider', 'aria-label': 'Wind speed' });
  const windText = s('text', { x: 0, y: -12, fill: '#fff', style: 'font:600 10px var(--font-sans);letter-spacing:.06em' });
  windG.append(windArrow, windText, windKnob);
  const hint = s('text', { x: 632, y: 372, 'text-anchor': 'end', fill: 'rgba(255,255,255,.55)', style: 'font:11px var(--font-sans)' }, 'drag the rail or the wind');
  // the rocket, and the canopy it hangs from once a parachute is out
  const body = s('g', {},
    s('path', { d: 'M14,0 C9,-3.6 3,-4.2 -10,-4.2 L -10,4.2 C 3,4.2 9,3.6 14,0 Z', fill: '#ffffff' }),
    s('path', { d: 'M-6,-4.2 L -12,-9 L -10,-4.2 Z M -6,4.2 L -12,9 L -10,4.2 Z', fill: 'var(--red)' }));
  // flame: an orange plume with a yellow core that flickers (visible against the accent-coloured trail)
  const flame = s('g', {},
    s('path', { d: 'M-10,-3.2 Q-20,-2 -30,0 Q-20,2 -10,3.2 Z', fill: '#ff7a1a', opacity: 0.95 },
      s('animate', { attributeName: 'd', dur: '0.12s', repeatCount: 'indefinite', values: 'M-10,-3.2 Q-20,-2 -30,0 Q-20,2 -10,3.2 Z;M-10,-3.4 Q-18,-2.4 -25,0 Q-18,2.4 -10,3.4 Z;M-10,-3.2 Q-20,-2 -30,0 Q-20,2 -10,3.2 Z' })),
    s('path', { d: 'M-10,-1.8 Q-15,-1 -19,0 Q-15,1 -10,1.8 Z', fill: '#ffe066' }));
  // two canopies on their own lines to the rocket: the small drogue and the large main
  const chute = (r, top) => {
    const g = s('g', { opacity: 0 }), dome = s('path', { fill: 'var(--red)', stroke: '#fff', 'stroke-width': 1 }), lines = s('path', { stroke: 'rgba(255,255,255,.7)', 'stroke-width': 0.8, fill: 'none' });
    g.append(lines, dome);
    // p: 0 → packed, 1 → fully open; the dome widens and fills as it inflates
    g.set = (p, ax, ay) => {
      g.setAttribute('opacity', p > 0 ? Math.min(1, p * 3) : 0);
      const w = r * (0.25 + 0.75 * p), hgt = r * (0.25 + 0.45 * p), cx = ax, cy = ay - top;
      dome.setAttribute('d', `M${cx - w},${cy} Q${cx},${cy - 2 * hgt} ${cx + w},${cy} Q${cx},${cy - 0.35 * hgt} ${cx - w},${cy} Z`);
      lines.setAttribute('d', `M${cx - w},${cy} L0,0 M${cx + w},${cy} L0,0 M${cx - w / 3},${cy - 0.2 * hgt} L0,0 M${cx + w / 3},${cy - 0.2 * hgt} L0,0`);
    };
    return g;
  };
  const drogue = chute(7, 30), mainChute = chute(17, 46);
  const bodyG = s('g', { class: 'hero-body' }, flame, body);
  const rocket = s('g', {}, drogue, mainChute, bodyG);
  const svg = s('svg', { viewBox: '0 0 640 380', role: 'img', 'aria-label': 'A sounding-rocket flight: boost, coast to apogee, drogue and main parachutes, landing. Drag the rail or the wind arrow to change it.' },
    s('g', {}, stars),
    s('g', { opacity: 0.8 }, [0, 1, 2, 3, 4].map((i) => s('line', { x1: 34, x2: 40, y1: GY - i * 62, y2: GY - i * 62, stroke: 'rgba(255,255,255,.62)' }))),
    s('line', { x1: 40, x2: 40, y1: 70, y2: GY, stroke: 'rgba(255,255,255,.35)' }),
    s('text', { x: 46, y: 66, fill: 'rgba(255,255,255,.62)', style: 'font:10px var(--font-sans)' }, 'ALTITUDE'),
    s('line', { x1: 20, x2: 640, y1: GY, y2: GY, stroke: 'rgba(255,255,255,.35)', 'stroke-width': 1.5 }),
    s('g', { stroke: 'rgba(255,255,255,.62)', 'stroke-width': 1 }, Array.from({ length: 32 }, (_, i) => s('line', { x1: 24 + i * 20, y1: GY, x2: 16 + i * 20, y2: GY + 10 }))),
    ghost, trail, marks, rail, railKnob, windG, rocket, hint);

  const callout = (x, y, label, sub, side = 1, dy = 0) => s('g', {},
    s('circle', { cx: x, cy: y, r: 4.5, fill: '#25282b', stroke: '#ffffff', 'stroke-width': 1.6 }),
    s('circle', { cx: x, cy: y, r: 9, fill: 'none', stroke: '#ffffff', 'stroke-width': 1, class: 'pulse-ring' }),
    s('text', { x: x + 13 * side, y: y - 6 + dy, 'text-anchor': side > 0 ? 'start' : 'end', fill: '#ffffff', style: 'font:600 12px var(--font-sans)' }, label),
    s('text', { x: x + 13 * side, y: y + 9 + dy, 'text-anchor': side > 0 ? 'start' : 'end', fill: 'rgba(255,255,255,.62)', style: 'font:11px var(--font-sans)' }, sub));
  let F;
  const draw = () => {
    F = flight(state.th, state.w);
    const d = 'M' + F.pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L');
    ghost.setAttribute('d', d);
    const a = (state.th * Math.PI) / 180, rx = X0 + 46 * Math.cos(a), ry = GY + 2 - 46 * Math.sin(a);
    rail.setAttribute('x2', rx.toFixed(1)); rail.setAttribute('y2', ry.toFixed(1));
    railKnob.setAttribute('cx', rx.toFixed(1)); railKnob.setAttribute('cy', ry.toFixed(1));
    const L = 14 + state.w * 2.2;
    windArrow.setAttribute('d', state.w > 0.5 ? `M0,0 H${L} M${L},0 l-7,-4 M${L},0 l-7,4` : 'M0,0 H2');
    windKnob.setAttribute('cx', L.toFixed(1));
    windText.textContent = state.w > 0.5 ? 'WIND' : 'CALM';
    const main = F.pts.find((p) => p.phase === 'main'), land = F.pts.at(-1);
    const right = land.x < 520;
    marks.replaceChildren(
      callout(F.xb, GY - F.hb, 'Burnout', 'fastest point', -1),
      callout(F.xa, GY - F.ha, 'Apogee · drogue', 'vertical speed 0', 1),
      main ? callout(main.x, main.y, 'Main opens', 'slow, drifting', -1) : s('g'),
      callout(land.x, land.y, 'Landing', state.w > 0.5 ? 'drifted downwind' : 'calm: near the pad', right ? 1 : -1, -16));
    railKnob.setAttribute('aria-valuenow', String(Math.round(state.th)));
    windKnob.setAttribute('aria-valuenow', String(Math.round(state.w)));
    t0 = performance.now();
  };
  // the rocket flies the path in about 8 s, the slow main descent sped up; then it pauses and starts again
  let t0 = performance.now(), raf = 0;
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  // heading: along the path in flight; after the drogue opens it turns smoothly to hang nose-down under the canopies
  const place = (p, q) => {
    const fly = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI, open = ease((p.t - F.tA - 0.35) / 1.4);
    let d = 70 - fly; while (d > 180) d -= 360; while (d < -180) d += 360;
    rocket.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    bodyG.setAttribute('transform', `rotate(${(fly + d * open).toFixed(1)})`);
    flame.setAttribute('opacity', p.phase === 'boost' ? 1 : 0);
    // the drogue comes out just after apogee and inflates; the main follows at its height, and both stay out
    drogue.set(p.t > F.tA ? ease((p.t - F.tA - 0.2) / 0.9) : 0, -9, 0);
    mainChute.set(F.tM != null && p.t >= F.tM ? ease((p.t - F.tM) / 1.3) : 0, 8, 0);
  };
  const speed = (ph) => (ph === 'main' ? 3.5 : ph === 'drogue' ? 1.8 : ph === 'boost' ? 0.6 : 1);
  const frame = (now) => {
    const P = F.pts; let k = (now - t0) / 1000, i = 0;
    // walk the model time with the display speed of each phase
    let acc = 0; for (i = 0; i < P.length - 1; i++) { const step = 0.04 / speed(P[i].phase); if (acc + step > k) break; acc += step; }
    if (i >= P.length - 1 && k > acc + 1.6) { t0 = now; i = 0; }
    const p = P[Math.min(i, P.length - 1)], q = P[Math.min(i + 1, P.length - 1)];
    trail.setAttribute('d', 'M' + P.slice(0, i + 1).map((r) => `${r.x.toFixed(1)},${r.y.toFixed(1)}`).join('L'));
    place(p, q === p ? { x: 2 * p.x - P[Math.max(0, i - 1)].x, y: 2 * p.y - P[Math.max(0, i - 1)].y } : q);
    raf = requestAnimationFrame(frame);
  };
  draw();
  if (reducedMotion()) {
    const P = F.pts;
    trail.setAttribute('d', ghost.getAttribute('d')); const last = P.at(-1); place({ ...last, t: last.t + 5 }, { x: last.x + 1, y: last.y });
  } else raf = requestAnimationFrame(frame);
  const redrawStatic = () => { if (reducedMotion()) { trail.setAttribute('d', ghost.getAttribute('d')); } };

  // dragging: pointer position in viewBox units
  const toView = (e) => { const r = svg.getBoundingClientRect(), k = 640 / r.width; return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * (380 / r.height) }; };
  const drag = (el, onMove) => {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('dragging'); });
    el.addEventListener('pointermove', (e) => { if (!el.hasPointerCapture(e.pointerId)) return; onMove(toView(e)); draw(); redrawStatic(); });
    el.addEventListener('pointerup', (e) => { el.releasePointerCapture(e.pointerId); el.classList.remove('dragging'); });
  };
  drag(railKnob, (p) => { state.th = Math.min(90, Math.max(68, (Math.atan2(GY + 2 - p.y, p.x - X0) * 180) / Math.PI)); });
  drag(windKnob, (p) => { state.w = Math.min(28, Math.max(0, (p.x - 500 - 14) / 2.2)); });
  const keys = (el, f) => el.addEventListener('keydown', (e) => { const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key]; if (!d) return; e.preventDefault(); f(d); draw(); redrawStatic(); });
  keys(railKnob, (d) => { state.th = Math.min(90, Math.max(68, state.th + d)); });
  keys(windKnob, (d) => { state.w = Math.min(28, Math.max(0, state.w + 2 * d)); });
  // stop the animation when the hero leaves the screen
  new IntersectionObserver(([en]) => { cancelAnimationFrame(raf); if (en.isIntersecting && !reducedMotion()) { t0 = performance.now(); raf = requestAnimationFrame(frame); } }).observe(svg);
  return svg;
}

const STEP_ART = [
  // 1 · pick: a grid of cards, one picked, and the search glass
  () => s('svg', { viewBox: '0 0 200 74' }, [0, 1, 2, 3].map((i) => s('rect', { x: 14 + (i % 2) * 44, y: 10 + Math.floor(i / 2) * 28, width: 38, height: 22, rx: 4, fill: 'var(--surface)', stroke: i === 1 ? 'var(--accent)' : 'var(--border-strong)', 'stroke-width': i === 1 ? 1.8 : 1 })),
    s('rect', { x: 112, y: 26, width: 74, height: 22, rx: 11, fill: 'var(--surface)', stroke: 'var(--border-strong)' }),
    s('circle', { cx: 126, cy: 37, r: 5, fill: 'none', stroke: 'var(--text-3)', 'stroke-width': 1.5 }), s('path', { d: 'M130,41 l4,4', stroke: 'var(--text-3)', 'stroke-width': 1.5 }),
    s('rect', { x: 140, y: 35, width: 36, height: 4, rx: 2, fill: 'var(--border-strong)' })),
  // 2 · describe: input rows with a slider, and a drawing with a drag handle
  () => s('svg', { viewBox: '0 0 200 74' }, [0, 1, 2].map((i) => s('g', {}, s('rect', { x: 12, y: 10 + i * 20, width: 46, height: 4, rx: 2, fill: 'var(--border-strong)' }),
    s('rect', { x: 64, y: 5 + i * 20, width: 46, height: 14, rx: 3, fill: 'var(--surface)', stroke: 'var(--border-strong)' }), s('rect', { x: 64, y: 5 + i * 20, width: 3, height: 14, fill: 'var(--input-mark)' }))),
    s('path', { d: 'M12,66 H110', stroke: 'var(--border-strong)', 'stroke-width': 2 }), s('circle', { cx: 74, cy: 66, r: 4, fill: 'var(--accent)' }),
    s('path', { d: 'M128,40 L170,40 L184,34 L170,28 L128,28 Z', fill: 'var(--surface)', stroke: 'var(--text-3)' }), s('circle', { cx: 184, cy: 34, r: 5, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.6 }),
    s('path', { d: 'M128,50 H184 M128,46 v8 M184,46 v8', stroke: 'var(--text-3)', 'stroke-width': 0.8 })),
  // 3 · limits: a gauge with your limit drawn on it
  () => s('svg', { viewBox: '0 0 200 74' }, s('rect', { x: 18, y: 32, width: 104, height: 12, fill: 'var(--ok)', opacity: 0.35 }), s('rect', { x: 122, y: 32, width: 30, height: 12, fill: 'var(--warn)', opacity: 0.4 }),
    s('rect', { x: 152, y: 32, width: 30, height: 12, fill: 'var(--danger)', opacity: 0.55 }), s('path', { d: 'M152,24 V52', stroke: 'var(--danger)', 'stroke-width': 2 }),
    s('text', { x: 152, y: 18, 'text-anchor': 'middle', fill: 'var(--text-2)', style: 'font:600 9px var(--font-sans)' }, 'your limit'), s('path', { d: 'M86,52 l-5,8 h10 Z', fill: 'var(--text)' })),
  // 4 · verdict: banner with the word and the solved fixes
  () => s('svg', { viewBox: '0 0 200 74' }, s('rect', { x: 14, y: 8, width: 172, height: 58, rx: 6, fill: 'var(--surface)', stroke: 'var(--border-strong)' }), s('rect', { x: 14, y: 8, width: 4, height: 58, fill: 'var(--warn)' }),
    s('circle', { cx: 32, cy: 23, r: 7, fill: 'var(--warn)' }), s('text', { x: 32, y: 27, 'text-anchor': 'middle', fill: '#fff', style: 'font:800 10px var(--font-sans)' }, '!'),
    s('text', { x: 44, y: 27, fill: 'var(--warn)', style: 'font:800 11px var(--font-sans);letter-spacing:.04em' }, 'MARGINAL'),
    [0, 1].map((i) => s('g', {}, s('circle', { cx: 30, cy: 42 + i * 13, r: 2, fill: 'var(--text-3)' }), s('rect', { x: 38, y: 40 + i * 13, width: 60 + i * 20, height: 4, rx: 2, fill: 'var(--border-strong)' }), s('rect', { x: 102 + i * 20, y: 39 + i * 13, width: 26, height: 6, rx: 2, fill: 'var(--text)' })))),
  // 5 · see why: a plot with your design and your limit
  () => s('svg', { viewBox: '0 0 200 74' }, s('path', { d: 'M18,62 H184 M18,62 V8', stroke: 'var(--border-strong)', fill: 'none' }),
    s('path', { d: 'M18,58 C60,56 90,30 120,20 C150,12 170,11 184,10', fill: 'none', stroke: 'var(--series-1)', 'stroke-width': 2 }),
    s('path', { d: 'M18,28 H184', stroke: 'var(--danger)', 'stroke-dasharray': '4 3' }), s('circle', { cx: 96, cy: 30, r: 4, fill: 'var(--key-mark)' }),
    s('circle', { cx: 168, cy: 46, r: 9, fill: 'var(--surface)', stroke: 'var(--accent-2)', 'stroke-width': 1.4 }), s('text', { x: 168, y: 50, 'text-anchor': 'middle', fill: 'var(--accent-2)', style: 'font:italic 600 12px Georgia,serif' }, 'i')),
  // 6 · compare, share, report: baseline against now, a link and a document
  () => s('svg', { viewBox: '0 0 200 74' }, s('rect', { x: 20, y: 30, width: 18, height: 32, fill: 'var(--border-strong)' }), s('rect', { x: 44, y: 18, width: 18, height: 44, fill: 'var(--accent)' }),
    s('path', { d: 'M14,62 H70', stroke: 'var(--text-3)' }),
    s('path', { d: 'M96,40 a7,7 0 0 1 0,-14 h10 M118,26 a7,7 0 0 1 0,14 h-10 M101,33 h12', stroke: 'var(--text-2)', 'stroke-width': 2, fill: 'none' }),
    s('rect', { x: 140, y: 10, width: 44, height: 54, rx: 4, fill: 'var(--surface)', stroke: 'var(--border-strong)' }),
    [0, 1, 2, 3].map((i) => s('rect', { x: 148, y: 20 + i * 10, width: 28 - (i % 2) * 8, height: 3, rx: 1.5, fill: 'var(--border-strong)' }))),
];

export async function mountHome() {
  const main = initShell({ active: 'home' });
  const [reg, refs] = await Promise.all([loadRegistry(), loadReferences()]);
  // a topic whose only calculator belongs to another topic (calculators merged into one) is not shown twice
  const primary = new Set(reg.calculators.map((c) => c.topic));
  reg.topics = reg.topics.filter((t) => t.status !== 'available' || primary.has(t.slug));
  const avail = reg.calculators.length;
  const soon = reg.topics.filter((t) => t.status === 'soon').length;

  const hero = h('section.hero',
    h('div.wrap',
      h('div',
        h('p.eyebrow', 'Sounding-rocket engineering toolkit'),
        h('h1', { html: 'Rocket maths, <em>explained</em>.' }),
        h('p.lead', 'Interactive calculators for stability, drag, atmosphere, fins and mass properties — each with a live schematic, plots, and the theory one click away. Built from C. P. Hoult’s rocket-engineering reports at rsandt.com.'),
        h('div.hero-actions',
          h('a.btn.primary', { href: '#calculators' }, 'Browse calculators'),
          h('a.btn.on-dark', { href: url('references/index.html') }, 'Reference library')),
        h('div.hero-stats',
          h('div', h('b', String(avail)), 'calculators live'),
          h('div', h('b', String(reg.topics.length)), 'engineering topics'),
          h('div', h('b', String(refs.length)), 'reference documents'),
          h('div', h('b', 'SI · US'), 'switchable units'))),
      h('div.hero-art', heroArt())));

  const steps = [
    ['Pick a calculator', 'Choose one from the grid below, or press <b>Search</b> in the top bar to find a calculator, a theory page or any of the reference documents. A <b>Final</b> badge marks pages that have been reviewed and signed off.'],
    ['Describe your rocket', 'Every page opens on a worked example. The inputs are grouped in the order you would measure them — type a value, move its slider, or drag the handles on the drawing. Some pages fill themselves from another calculator (“Fill from the Trajectory Simulation”).'],
    ['Set your limits', 'The <b>Your limits</b> group holds what you will accept: a landing speed, a safety factor, the tilt your range allows. Each default says where it comes from — a published source or this site’s own choice — so change it to your own rule.'],
    ['Read the verdict', 'At the top: <b>SAFE</b>, <b>MARGINAL</b> or <b>UNSAFE</b>, the one-line reason, and up to three fixes worked out to exact numbers (“use at least 3.3 mm”). Key results turn green, amber or red against your limits.'],
    ['See why', 'The drawing is to scale with the physics on it; the plots show trade-offs with your design and your limits marked — hover for values. <b>Explore</b> holds more plots, every result and the assumptions; the <b>i</b> button on anything explains it with its formula, symbols and typical values.'],
    ['Compare, share, report', '<b>Pin as baseline</b> to see what each change does; <b>Share</b> copies a link that reproduces your inputs; export any plot as SVG or CSV, and the whole calculation as Markdown, LaTeX, Word or PDF.'],
  ];
  const guide = h('section.section.reveal#guide',
    h('div.wrap',
      h('div.section-head', h('div', h('p.eyebrow', 'Using a calculator'), h('h2', 'From your rocket to a verdict')),
        h('p', 'Every calculator works the same way, so once you know one page you know them all.')),
      h('div.steps', steps.map(([t, p], i) => h('div.card.step', h('div.step-ill', STEP_ART[i]()), h('h3', t), h('p', { html: p }))))));

  // ---- topic grid ----
  const search = h('input', { type: 'search', placeholder: 'Filter topics…', 'aria-label': 'Filter topics' });
  const statusChips = [['all', 'All'], ['available', `Available (${avail})`], ['soon', `Coming soon (${soon})`]].map(([v, l]) =>
    h('button.filter-chip', { type: 'button', 'data-status': v, 'aria-pressed': String(v === 'all') }, l));
  const areaSel = h('select.filter-chip', { 'aria-label': 'Filter by area' }, h('option', { value: '' }, 'All areas'), reg.areas.map((a) => h('option', { value: a.id }, a.title)));
  const gridHost = h('div');
  let status = storage.get('rc-home-status', 'all');
  const renderGrid = () => {
    const q = search.value.trim().toLowerCase();
    const area = areaSel.value;
    statusChips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.status === status)));
    const blocks = [];
    for (const a of reg.areas) {
      if (area && a.id !== area) continue;
      const ts = reg.topics.filter((t) => t.area === a.id)
        .filter((t) => status === 'all' || t.status === status)
        .filter((t) => !q || (t.title + ' ' + t.summary + ' ' + t.abstract + ' ' + t.calculators.join(' ')).toLowerCase().includes(q))
        .sort((x, y) => (x.status === y.status ? x.title.localeCompare(y.title) : x.status === 'available' ? -1 : 1));
      if (!ts.length) continue;
      blocks.push(h('div.area-block', { id: `area-${a.id}` }, h('h3', a.title),
        h('div.topic-grid', ts.map((t) => topicCard(t, reg)))));
    }
    gridHost.replaceChildren(...(blocks.length ? blocks : [h('div.card.empty', 'No topics match that filter.')]));
  };
  search.addEventListener('input', renderGrid);
  areaSel.addEventListener('change', renderGrid);
  statusChips.forEach((c) => c.addEventListener('click', () => { status = c.dataset.status; storage.set('rc-home-status', status); renderGrid(); }));

  const calcs = h('section.section#calculators',
    h('div.wrap',
      h('div.section-head', h('div', h('p.eyebrow', 'What’s available'), h('h2', 'Calculators & topics')),
        h('p', soon ? `${avail} calculators are live. The other ${soon} topics have their reference documents ready and are marked “coming soon”.` : `All ${avail} calculators are live, each built from the reference documents in the library.`)),
      h('div.filters', search, ...statusChips, areaSel),
      gridHost));

  const nav = h('section.section.reveal',
    h('div.wrap',
      h('div.section-head', h('div', h('p.eyebrow', 'Getting around'), h('h2', 'Moving between calculators'))),
      h('div.nav-guide',
        h('div.card', h('h3', 'Search anywhere'), h('p', 'Use Search in the top bar on any page to jump to a calculator, a theory page or a reference document.')),
        h('div.card', h('h3', 'Breadcrumbs & next/previous'), h('p', 'Each calculator shows where it sits (Home / area / calculator) and links to the previous and next calculator at the bottom of the page.')),
        h('div.card', h('h3', 'Theory in a side panel'), h('p', 'The i buttons open a side panel without leaving the calculator. “Open full documentation” opens the complete derivation in a new tab, at the right section.'))),
      h('div.card.card-pad', { style: 'margin-top:14px' },
        h('h3', 'Units and the colour code'),
        h('p', { style: 'color:var(--text-2)' }, 'Switch between SI and US customary units with the ', h('b', 'SI · US'), ' toggle in the top bar — your choice is remembered, and plots, drawings and reports follow it. Every symbol and unit is typeset as mathematics. On the calculator pages:'),
        h('div.legend-swatches',
          h('span', h('i', { style: 'background:var(--surface-2);border:1px solid var(--hairline)' }), 'Outlined field — your inputs'),
          h('span', h('i', { style: 'background:var(--surface-2);border:1px solid var(--border);box-shadow:inset 4px 0 0 var(--ok)' }), 'Key result — edge green, amber or red against your limits'),
          h('span', h('i', { style: 'background:var(--red)' }), 'Accent — highlighted dimension or action'),
          h('span', h('i', { style: 'background:var(--surface);border:1px solid var(--border-strong)' }), 'Table — every other output'))),
      h('div.card.card-pad', { style: 'margin-top:14px' },
        h('h3', 'About the source'),
        h('p', { style: 'color:var(--text-2);margin:0' }, 'All methods come from the reports and memos published at ',
          h('a', { href: 'http://www.rsandt.com/reports.html', rel: 'noopener' }, 'rsandt.com/reports'),
          ' by C. P. Hoult and his students at CSULB and CSULA. Each calculator lists its sources under Theory & references, and its documentation page gives the full derivation.'))));

  main.append(hero, guide, calcs, nav);
  renderGrid();
  reveal(main);
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
  if (new URLSearchParams(location.search).get('search') != null) openPalette();
}

/** Purple badge for calculators the owner has reviewed and signed off (registry `final`). */
const finalChip = () => h('span.chip.final', { title: 'Reviewed and finalised' }, h('span.dot'), 'Final');

function topicCard(t, reg) {
  const calcs = t.calculators.map((slug) => reg.calculators.find((c) => c.slug === slug));
  if (t.status === 'available' && calcs.length === 1) {
    return h('a.card.topic-card.available', { href: url(`calculators/${calcs[0].slug}.html`) },
      h('h4', calcs[0].title), h('p', t.summary),
      h('div.meta', calcs[0].final ? finalChip() : h('span.chip.ok', h('span.dot'), 'Available'), h('span.chip', t.title)));
  }
  if (t.status === 'available') {
    return h('div.card.topic-card.available',
      h('h4', t.title), h('p', t.summary),
      h('div.calc-links', calcs.map((c) => h('a', { href: url(`calculators/${c.slug}.html`) }, h('span', '→ '), c.title, c.final ? finalChip() : null))),
      h('div.meta', h('span.chip.ok', h('span.dot'), `${calcs.length} calculators`)));
  }
  return h('a.card.topic-card', { href: url(`calculators/${t.slug}.html`) },
    h('h4', t.title), h('p', t.summary),
    h('div.meta', h('span.chip.soon', 'Coming soon')));
}
