// Parachute Recovery (single parachute, two-piece rocket, optional reefing) — UI definition.
import { recovery, descentSpeed, descentTime, aftImpact, reefedDragRatio, densityExponent, tau, REEF, ATM } from '../calc/recovery.js';
import { s, fmt, InputError } from '../util.js';
import { text, dim, path } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const MASS = { dim: 'mass', internal: 'lbm' };
const DIST = { dim: 'distance', internal: 'ft' };
const ALT = { dim: 'altitude', internal: 'ft' };
const SPEED = { dim: 'speed', internal: 'fts' };
const FORCE = { dim: 'force', internal: 'lbf' };
const DENS = { dim: 'density', internal: 'slugft3' };
const reefed = (v) => !!v.reef;
const mins = (t) => `${fmt(t / 60, { digits: 3 })} min`;
// a speed in the reader's unit, for result notes
const sp = (x) => `${fmt(toDisplay(x, SPEED), { digits: 3 })} ${unitLabel(displayUnit(SPEED))}`;

/** Parachute icon: canopy of half-width w (reefed: narrower mouth and a reefing ring), lines to (x, y + len). */
function chute(g, x, y, w, open, field) {
  const mouth = open ? w : w * 0.45, h = open ? w * 0.75 : w * 1.05;
  g.append(s('path', { d: `M${x - mouth},${y}Q${x - w},${y - h} ${x},${y - h}Q${x + w},${y - h} ${x + mouth},${y}Q${x},${y - h * 0.25} ${x - mouth},${y}Z`, fill: 'var(--red)', 'fill-opacity': 0.75, stroke: 'var(--red)', 'data-field': field }));
  g.append(s('path', { d: `M${x - mouth},${y}L${x},${y + w * 0.9}L${x + mouth},${y}`, class: 'sc-thin', fill: 'none' }));
  if (!open) g.append(s('ellipse', { cx: x, cy: y - 1, rx: mouth, ry: 2.5, fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.2 }));
}

export default {
  slug: 'parachute-recovery',
  topic: 'recovery',
  title: 'Parachute Recovery',
  subtitle: 'Descent time, <b>wind drift</b> and landing speeds of a two-piece rocket under a single parachute, with optional reefing.',
  intro: {
    what: 'Follows a rocket split into a heavy nose and a lighter aft body, joined by a tether under one parachute, from deployment to landing: descent speed through the thinning air, time, wind drift and the impact speed of each piece.',
    why: 'A single parachute that is reefed high up and opened low down keeps the descent fast (less drift) yet the landing soft. Letting the heavy nose land first lets the aft body with the electronics slow down before it touches the ground.',
    when: 'Sizing the parachute, the reefing and the tether, and estimating where and how hard the rocket will land.',
  },
  info: {
    text: [
      'In steady descent the drag balances the weight, so the descent speed is $V=\\sqrt{2Mg/(C_D\\rho S)}$. It is higher in the thin air aloft and falls as the parachute nears the ground.',
      'Integrating $dt=dh/V$ through the troposphere gives the descent time; the drift is the wind speed times that time.',
      'When the nose lands, the tether goes slack and the aft body, now carried by the whole parachute, slows towards a lower speed before it lands.',
    ],
    tex: 'V=\\sqrt{\\frac{2Mg}{C_D\\rho S}},\\qquad V_{aft}^2=\\frac{2m_2g}{C_D\\rho S}+\\frac{2m_1g}{C_D\\rho S}e^{-C_D\\rho SL/m_2}',
    steps: ['Enter the two masses and the parachute.', 'Choose whether to reef, the reefing ratio and the disreef altitude.', 'Enter the deployment altitude, ground elevation, tether length and wind.', 'Read the descent time, drift and landing speeds.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'mass', title: 'Rocket',
      fields: [
        { id: 'W1', label: 'Nose (payload / ballast) mass', sym: 'm_1', ...MASS, default: 10, min: 0, minExclusive: true, info: { text: 'The heavy forward piece, which lands first.', doc: 'impact' } },
        { id: 'W2', label: 'Aft body mass (with parachute)', sym: 'm_2', ...MASS, default: 8.5, min: 0, minExclusive: true, info: { text: 'The lighter piece with the avionics, attached to the parachute.', doc: 'impact' } },
        { id: 'L', label: 'Tether length', sym: 'L', ...DIST, default: 33, min: 0, slider: { min: 0, max: 100, step: 1 },
          info: { text: 'Length of the tether between the nose and the parachute swivel. The longer it is, the more the aft body slows after the nose lands.', range: 'A 2 in spool of 1/8 in nylon cord holds about 33 ft.', doc: 'impact' } },
      ],
    },
    {
      id: 'chute', title: 'Parachute',
      fields: [
        { id: 'D0', label: 'Parachute flat diameter', sym: 'D_0', ...DIST, default: 5.18, min: 0, minExclusive: true, info: { text: 'Diameter of the canopy laid flat. The reference area is $S=\\pi D_0^2/4$.', doc: 'descent' } },
        { id: 'CD', label: 'Drag coefficient (open)', sym: 'C_D', dim: 'none', default: 0.8, min: 0, minExclusive: true, max: 2, slider: { min: 0.3, max: 1.5, step: 0.01 },
          info: { text: 'Drag coefficient of the fully open canopy, based on the flat area.', range: 'About 0.8 for flat circular canopies; drop tests of 3 ft canopies gave 0.78–0.86.', doc: 'descent' } },
        { id: 'reef', label: 'Reef the parachute', kind: 'bool', default: true, info: { text: 'A reefing line round the canopy skirt holds it partly closed after deployment; it is cut at a lower altitude to open the canopy fully.', doc: 'reefing' } },
        { id: 'ratio', label: 'Reefing ratio', sym: 'D_R/D_0', dim: 'none', default: 0.25, min: 0.06, max: 0.62, when: reefed, slider: { min: 0.06, max: 0.62, step: 0.01 },
          info: { text: 'Diameter of the reefing-line circle divided by the flat diameter. At 0.62 the canopy is fully open.', range: 'Keep it above about 0.2 for small parachutes (0.06 for canopies over 4 m), or the canopy may be unstable.', doc: 'reefing' } },
        { id: 'hR', label: 'Disreef altitude (above ground)', sym: 'h_{DR}', ...ALT, default: 1000, min: 0, when: reefed, info: { text: 'Height above the ground at which the reefing line is cut.', doc: 'descent' } },
      ],
    },
    {
      id: 'flight', title: 'Flight and wind',
      fields: [
        { id: 'hD', label: 'Deployment altitude (above ground)', sym: 'h_D', ...ALT, default: 25000, min: 0, minExclusive: true, info: { text: 'Height above the ground at which the parachute deploys, usually just below apogee.', doc: 'descent' } },
        { id: 'hG', label: 'Ground elevation', sym: 'h_G', ...ALT, default: 4300, min: 0, max: 30000, info: { text: 'Elevation of the landing area above sea level. The air there is thinner, so the landing is faster.', doc: 'descent' } },
        { id: 'VD', label: 'Speed at deployment', sym: 'V_D', ...SPEED, default: 100, min: 0, info: { text: 'Flight speed just before the parachute deploys. It sets the reefing-line load.', doc: 'reefing' } },
        { id: 'wind', label: 'Mean wind speed', sym: 'w', ...SPEED, default: 20, min: 0, info: { text: 'Average horizontal wind over the descent. The drift is the wind speed times the descent time.', range: 'Winds aloft are often 30–60 ft/s or more; take them from the forecast winds aloft.', doc: 'drift' } },
      ],
    },
  ],
  results: [
    { id: 't', label: 'Descent time', sym: 't', dim: 'time', key: true, digits: 4,
      note: (x, out, v) => `${mins(x)}${v.reef ? ` · reefed ${mins(out.o.tReefed)}` : ''}`,
      info: { text: 'Time from deployment to landing.', tex: 't=\\frac{T_0\\left(\\tau_D^{\\,e}-\\tau_G^{\\,e}\\right)}{\\alpha V_0e},\\ \\tau=1+\\frac{\\alpha h}{T_0}', doc: 'descent' } },
    { id: 'drift', label: 'Wind drift', sym: 'x_w', ...DIST, key: true, digits: 4, note: () => 'at the mean wind speed', info: { tex: 'x_w=w\\,t', doc: 'drift' } },
    { id: 'vAft', label: 'Aft body impact speed', sym: 'V_{aft}', ...SPEED, key: true, digits: 4,
      note: (x, out) => `nose lands at ${sp(out.o.vNose)}`,
      info: { text: 'Speed at which the aft body (with the avionics) lands, after slowing over the tether length once the nose is down.', tex: 'V_{aft}^2=\\frac{2m_2g}{C_D\\rho S}+\\frac{2m_1g}{C_D\\rho S}e^{-C_D\\rho SL/m_2}', doc: 'impact' } },
    { id: 'vDeploy', label: 'Descent speed at deployment', sym: 'V_D', ...SPEED, key: true, digits: 4, note: (x, out, v) => (v.reef ? 'reefed' : 'open'),
      info: { text: 'Steady descent speed just after the parachute deploys, in the thin air at deployment altitude.', tex: 'V=\\sqrt{\\frac{2Mg}{C_D\\rho S}}', doc: 'descent' } },
    { id: 'vNose', label: 'Nose impact speed', sym: 'V_I', ...SPEED, digits: 4, info: { doc: 'impact' } },
    { id: 'vAftMin', label: 'Aft impact speed with a very long tether', sym: '\\sqrt{2m_2g/C_D\\rho S}', ...SPEED, digits: 4, info: { doc: 'impact' } },
    { id: 'vDisreef', label: 'Descent speed at disreef', sym: 'V_{DR}', ...SPEED, digits: 4, when: (v) => v.reef, info: { doc: 'reefing' } },
    { id: 'vSL', label: 'Sea-level descent speed (as deployed)', sym: 'V_0', ...SPEED, digits: 4, info: { doc: 'descent' } },
    { id: 'tReefed', label: 'Time reefed', sym: 't_{R}', dim: 'time', digits: 4, when: (v) => v.reef, info: { doc: 'descent' } },
    { id: 'tOpen', label: 'Time fully open', sym: 't_{O}', dim: 'time', digits: 4, info: { doc: 'descent' } },
    { id: 'k', label: 'Reefed drag ratio', sym: 'C_{DR}/C_D', dim: 'none', digits: 4, when: (v) => v.reef, info: { text: 'From Knacke’s data for flat circular canopies.', doc: 'reefing' } },
    { id: 'reefLine', label: 'Reefing line strength needed', sym: 'S_R', ...FORCE, digits: 4, when: (v) => v.reef, info: { tex: 'S_R\\ge q_D\\frac{\\pi}{4}D_0^2C_S,\\ C_S\\approx0.02', doc: 'reefing' } },
    { id: 'rhoG', label: 'Air density at the ground', sym: '\\rho_G', ...DENS, digits: 4, info: { doc: 'descent' } },
  ],
  compute(v) {
    if (v.reef && !(v.hR < v.hD)) throw new InputError('The disreef altitude must be below the deployment altitude.');
    if (v.hG + v.hD > 36000) throw new InputError('Deployment must be inside the troposphere (below about 36 000 ft above sea level) for this atmosphere model.');
    const o = recovery(v);
    const warnings = [];
    if (v.reef && v.ratio < 0.2 && v.D0 < 13) warnings.push({ level: 'warn', text: 'Reefing below about 0.2 of the flat diameter can make a small parachute unstable. Use a larger reefing ratio.' });
    if (o.vAft > 30) warnings.push({ level: 'info', text: `The aft body lands at ${sp(o.vAft)}. Above about 6–8 m/s (20–25 ft/s), consider a larger parachute or a longer tether.` });
    const results = { t: o.t, drift: o.drift, vAft: o.vAft, vDeploy: o.vDeploy, vNose: o.vNose, vAftMin: o.vAftMin, vDisreef: o.vDisreef, vSL: o.vSL, tReefed: o.tReefed, tOpen: o.tOpen, k: o.k, reefLine: o.reefLine, rhoG: o.rhoG };
    return { results, warnings, o };
  },
  plots: [
    {
      id: 'speed', title: 'Descent speed against altitude',
      info: { text: 'Steady descent speed of the parachute reefed and fully open as the air thickens. The bold parts are the ones flown.', doc: 'descent' },
      build(v, out, { U }) {
        const o = out.o, M = o.m1 + o.m2, us = U(SPEED), ua = U(ALT), hTop = v.hG + v.hD, hR = v.reef ? v.hG + v.hR : hTop;
        const curve = (CdS, a, b) => { const p = []; for (let i = 0; i <= 60; i++) { const h = a + ((b - a) * i) / 60; p.push([us.v(descentSpeed(M, CdS, h)), ua.v(h - v.hG)]); } return p; };
        const series = [];
        if (v.reef) series.push({ name: 'reefed (flown)', points: curve(o.CdSR, hR, hTop), width: 3 }, { name: 'reefed', points: curve(o.CdSR, v.hG, hR), dashed: true });
        series.push({ name: 'open (flown)', points: curve(o.CdS, v.hG, hR), width: 3, color: 'var(--series-2)' }, { name: 'open', points: curve(o.CdS, hR, hTop), dashed: true, color: 'var(--series-2)' });
        return { x: { label: 'Descent speed $V$', unit: us.label }, y: { label: 'Height above ground', unit: ua.label }, hover: 'y', includeZero: true, series };
      },
    },
    {
      id: 'profile', title: 'Height against time',
      info: { text: 'Height above the ground against time from deployment. The slope is the descent speed; it changes abruptly at disreef.', doc: 'descent' },
      build(v, out, { U }) {
        const o = out.o, M = o.m1 + o.m2, ua = U(ALT), hTop = v.hG + v.hD, hR = v.reef ? v.hG + v.hR : hTop, pts = [];
        for (let i = 0; i <= 80; i++) { const h = hTop - ((hTop - v.hG) * i) / 80;
          const t = h >= hR ? descentTime(M, v.reef ? o.CdSR : o.CdS, hTop, h) : o.tReefed + descentTime(M, o.CdS, hR, h); pts.push([t / 60, ua.v(h - v.hG)]); }
        return { x: { label: 'Time from deployment', unit: '\\mathrm{min}' }, y: { label: 'Height above ground', unit: ua.label }, includeZero: true, series: [{ name: 'h', points: pts }],
          markers: v.reef ? [{ x: o.tReefed / 60, y: ua.v(v.hR), label: 'disreef' }] : [] };
      },
    },
    {
      id: 'tether', title: 'Aft impact speed against tether length',
      info: { text: 'The longer the tether, the longer the aft body has to slow down after the nose lands. Beyond a few “slowing lengths” $m_2/(C_D\\rho S)$ more tether does little.', doc: 'impact' },
      build(v, out, { U }) {
        const o = out.o, us = U(SPEED), ud = U(DIST), top = Math.max(3 * v.L, 60), pts = [];
        for (let i = 0; i <= 80; i++) { const L = (top * i) / 80; pts.push([ud.v(L), us.v(aftImpact(o.m1, o.m2, o.CdS, o.rhoG, L))]); }
        return { x: { label: 'Tether length $L$', unit: ud.label }, y: { label: 'Aft impact speed', unit: us.label }, includeZero: true, series: [{ name: 'V_{aft}', points: pts, smooth: true }],
          hlines: [{ y: us.v(o.vAftMin), label: 'very long tether', color: 'var(--text-3)' }], markers: [{ x: ud.v(v.L), y: us.v(o.vAft), label: 'design' }] };
      },
    },
    {
      id: 'reefing', title: 'Reefed drag',
      info: { text: 'Drag of a reefed flat circular canopy relative to the open canopy, against the reefing ratio (Knacke’s data). The canopy mouth of an open parachute is about 0.62 of its flat diameter.', doc: 'reefing' },
      build(v) {
        return { x: { label: 'Reefing ratio $D_R/D_0$' }, y: { label: 'Reefed drag / open drag' }, xDomain: [0, 0.7], yDomain: [0, 1], series: [{ name: 'Knacke data', points: REEF, smooth: true }],
          markers: v.reef ? [{ x: v.ratio, y: reefedDragRatio(v.ratio), label: 'design' }] : [] };
      },
    },
  ],
  schematicTitle: 'Descent and landing',
  schematicHint: 'Left: height to scale against drift (horizontal scale differs), with the parachute reefed above the disreef altitude. Right: landing — the nose is down and the aft body slows over the tether',
  schematic(ctx, v, out) {
    const W = 760, H = 420, o = out.o, M = o.m1 + o.m2;
    const fr = ctx.frame({ width: W, height: H, label: 'Descent path with drift, and the landing sequence' });
    const g = fr.layer('main'); g.replaceChildren();
    const ua = ctx.U(ALT), ud = ctx.U(DIST), us = ctx.U(SPEED), A = (h) => `${fmt(ua.v(h), { digits: 4 })} ${ua.label}`, Sp = (x) => `${fmt(us.v(x), { digits: 3 })} ${us.label}`;
    // path: x = wind × time, y = height; vertical to scale, horizontal fitted
    const x0 = 70, x1 = 440, yg = 350, yt = 60, hTop = v.hG + v.hD, hR = v.reef ? v.hG + v.hR : hTop;
    const Y = (h) => yg - ((h - v.hG) / v.hD) * (yg - yt), X = (t) => x0 + (o.t > 0 ? (t / o.t) * (x1 - x0) : 0);
    const tAt = (h) => (h >= hR ? descentTime(M, v.reef ? o.CdSR : o.CdS, hTop, h) : o.tReefed + descentTime(M, o.CdS, hR, h));
    const pts = []; for (let i = 0; i <= 60; i++) { const h = hTop - ((hTop - v.hG) * i) / 60; pts.push([X(tAt(h)), Y(h)]); }
    g.append(s('line', { x1: 30, x2: 480, y1: yg, y2: yg, class: 'sc-line' }));
    for (let x = 34; x < 480; x += 12) g.append(s('line', { x1: x, y1: yg, x2: x - 8, y2: yg + 8, class: 'sc-thin', 'stroke-opacity': 0.5 }));
    g.append(s('path', { d: path(pts), class: 'sc-thin', fill: 'none', 'stroke-dasharray': '4 3', 'stroke-width': 1.4, 'data-field': 'wind' }));
    if (v.wind > 0) { g.append(s('path', { d: `M${x0},${yg + 26}H${x1}`, class: 'sc-dim', 'marker-start': fr.arrow(), 'marker-end': fr.arrow(), 'data-field': 'wind' }));
      g.append(text((x0 + x1) / 2, yg + 42, `drift ${fmt(ud.v(o.drift), { digits: 4 })} ${ud.label} in ${mins(o.t)}`, { anchor: 'middle', size: 11, field: 'wind' })); }
    else g.append(text(x0, yg + 40, `no wind · ${mins(o.t)}`, { size: 11 }));
    // parachutes along the path
    chute(g, X(0), Y(hTop) - 16, 13, !v.reef, 'reef ratio D0');
    g.append(text(X(0) + 20, Y(hTop) - 18, `deploy · ${A(v.hD)} · ${Sp(o.vDeploy)}`, { size: 10.5 }));
    if (v.reef) { const xr = X(o.tReefed), yr = Y(hR); chute(g, xr, yr - 16, 18, true, 'hR');
      g.append(s('line', { x1: xr - 30, x2: xr + 30, y1: yr, y2: yr, class: 'sc-thin', 'stroke-dasharray': '2 2' }));
      g.append(text(xr + 26, yr - 18, `disreef · ${A(v.hR)} · ${Sp(o.vDisreef)}`, { size: 10.5, field: 'hR' })); }
    g.append(s('circle', { cx: X(o.t), cy: yg, r: 4, fill: 'var(--red)' }));
    g.append(text(24, 24, `ground ${A(v.hG)} above sea level`, { size: 10.5, cls: 'sc-dim-text', field: 'hG' }));
    // landing inset: nose on the ground, tether L up to the aft body under the parachute
    const bx = 610, Lp = Math.min(220, Math.max(60, 4 * Math.sqrt(v.L) * 10)), ya = yg - Lp;
    g.append(s('line', { x1: 520, x2: 720, y1: yg, y2: yg, class: 'sc-line' }));
    g.append(s('rect', { x: bx - 9, y: yg - 34, width: 18, height: 34, rx: 3, class: 'sc-body-2', 'data-field': 'W1' }));
    g.append(s('path', { d: `M${bx - 9},${yg - 34}Q${bx},${yg - 52} ${bx + 9},${yg - 34}Z`, class: 'sc-body-2', 'data-field': 'W1' }));
    g.append(s('path', { d: `M${bx},${yg - 52}C${bx + 26},${yg - 52 - (Lp - 90) / 3} ${bx - 26},${ya + 60} ${bx},${ya + 34}`, fill: 'none', stroke: 'var(--text-2)', 'stroke-width': 1.2, 'stroke-dasharray': '3 2', 'data-field': 'L' }));
    g.append(s('rect', { x: bx - 8, y: ya - 8, width: 16, height: 42, rx: 3, class: 'sc-body', 'data-field': 'W2' }));
    chute(g, bx, ya - 40, 34, true, 'D0 CD');
    g.append(s('path', { d: `M${bx - 34},${ya - 40}L${bx},${ya - 8}L${bx + 34},${ya - 40}`, class: 'sc-thin', fill: 'none' }));
    g.append(dim(fr, bx + 46, yg, bx + 46, ya + 34, `L = ${fmt(ud.v(v.L), { digits: 3 })} ${ud.label}`, { field: 'L' }));
    g.append(text(bx - 18, yg - 16, `nose ${Sp(o.vNose)}`, { anchor: 'end', size: 10.5, field: 'W1' }));
    g.append(text(bx - 18, ya + 14, `aft body lands at ${Sp(o.vAft)}`, { anchor: 'end', size: 10.5, field: 'W2' }));
    g.append(text(620, 24, 'landing (tether not to scale)', { anchor: 'middle', size: 10.5, cls: 'sc-dim-text' }));
    g.append(text(24, H - 8, 'height to scale; horizontal drift fitted to the width', { size: 10, cls: 'sc-dim-text' }));
  },
  symbols: {
    M: 'total mass under the parachute', m_1: 'nose mass', m_2: 'aft body mass', g: 'acceleration of gravity', C_D: 'drag coefficient of the open parachute', '\\rho': 'air density', S: 'parachute flat area',
    V: 'steady descent speed', V_0: 'descent speed at sea level', V_I: 'nose impact speed', V_D: 'speed at deployment', V_DR: 'descent speed at disreef', '\\tau': 'temperature ratio',
    '\\tau_D': 'temperature ratio at deployment', '\\tau_G': 'temperature ratio at the ground', '\\tau_{DR}': 'temperature ratio at disreef', e: 'time-integral exponent', '\\alpha': 'temperature lapse rate', T_0: 'sea-level temperature',
    h: 'altitude', t: 'descent time', t_R: 'time reefed', t_O: 'time fully open', w: 'mean wind speed', x_w: 'wind drift', L: 'tether length', 'V_{aft}': 'aft body impact speed', m: 'density exponent',
    R: 'gas constant of air', 'C_{DR}': 'drag coefficient of the reefed parachute', q_D: 'dynamic pressure at deployment', D_0: 'flat diameter', C_S: 'reefing-line strength coefficient', S_R: 'reefing line strength', '\\rho_G': 'air density at the ground', '\\rho_0': 'sea-level air density',
  },
  constants: [
    { sym: 'g', desc: 'acceleration of gravity', si: [9.80665, '\\mathrm{m\\,s^{-2}}'], us: [32.174, '\\mathrm{ft\\,s^{-2}}'] },
    { sym: '\\alpha', desc: 'temperature lapse rate', si: [-0.0065, '\\mathrm{K\\,m^{-1}}'], us: [-0.003566, '{}^{\\circ}\\mathrm{R\\,ft^{-1}}'] },
    { sym: 'T_0', desc: 'sea-level temperature', si: [288.15, '\\mathrm{K}'], us: [518.67, '{}^{\\circ}\\mathrm{R}'] },
    { sym: 'R', desc: 'gas constant of air', si: [287.05, '\\mathrm{J\\,kg^{-1}\\,K^{-1}}'], us: [1716, '\\mathrm{ft^{2}\\,s^{-2}\\,{}^{\\circ}R^{-1}}'] },
    { sym: '\\rho_0', desc: 'sea-level air density', si: [1.2250, '\\mathrm{kg\\,m^{-3}}'], us: [0.002377, '\\mathrm{slug\\,ft^{-3}}'] },
  ],
  report(v, out, R) {
    const o = out.o, n = R.n, Q = R.Q, m = densityExponent(), e = m / 2 + 1, M = o.m1 + o.m2;
    // T₀/α and V₀ in the reader's units (K, m or °R, ft)
    const T0 = R.us ? ATM.T0 : ATM.T0 / 1.8, al = R.us ? ATM.alpha : ATM.alpha / 1.8 / 0.3048;
    const tD = tau(v.hG + v.hD), tR = tau(v.reef ? v.hG + v.hR : v.hG + v.hD), tG = tau(v.hG);
    const V0r = descentSpeed(M, o.CdSR, 0), V0o = descentSpeed(M, o.CdS, 0), sv = (x) => R.v(x, SPEED);
    const time = (ta, tb, V0) => `\\frac{${n(T0)}\\times(${n(ta)}^{${n(e)}}-${n(tb)}^{${n(e)}})}{(${n(al)})\\times${sv(V0)}\\times${n(e)}}`;
    const steps = [
      { label: 'Density exponent of the troposphere, $\\rho=\\rho_0\\tau^m$', lhs: 'm', eq: '-\\frac{g}{\\alpha R}-1', res: n(m) },
      { label: 'Exponent of the descent-time integral', lhs: 'e', eq: '\\frac{m}{2}+1', res: n(e) },
      { label: `Sea-level descent speed ${v.reef ? 'reefed' : 'open'}`, lhs: 'V_0', eq: v.reef ? '\\sqrt{\\frac{2Mg}{C_{DR}\\rho_0S}}' : '\\sqrt{\\frac{2Mg}{C_D\\rho_0S}}', res: Q(o.vSL, SPEED) },
    ];
    if (v.reef) steps.push({ label: 'Reefed drag coefficient (Knacke data)', lhs: 'C_{DR}', eq: 'C_D\\times\\frac{C_{DR}}{C_D}', sub: `${n(v.CD)}\\times${n(o.k)}`, res: n(v.CD * o.k) },
      { label: 'Time reefed, from deployment to disreef', lhs: 't_R', eq: '\\frac{T_0\\left(\\tau_D^{\\,e}-\\tau_{DR}^{\\,e}\\right)}{\\alpha V_0e}', sub: time(tD, tR, V0r), res: `${n(o.tReefed)}\\,\\mathrm{s}` });
    steps.push({ label: v.reef ? 'Time fully open, from disreef to the ground' : 'Descent time, from deployment to the ground', lhs: 't_O', eq: '\\frac{T_0\\left(\\tau_{DR}^{\\,e}-\\tau_G^{\\,e}\\right)}{\\alpha V_0e}', sub: time(tR, tG, V0o), res: `${n(o.tOpen)}\\,\\mathrm{s}` },
      { label: 'Total descent time and wind drift', lhs: 't', eq: 't_R+t_O', sub: `${n(o.tReefed)}+${n(o.tOpen)}`, res: `${n(o.t)}\\,\\mathrm{s}` },
      { lhs: 'x_w', eq: 'w\\,t', sub: `${R.v(v.wind, SPEED)}\\times${n(o.t)}`, res: Q(o.drift, DIST) },
      { label: 'Nose impact speed (steady descent at the ground)', lhs: 'V_I', eq: '\\sqrt{\\frac{2Mg}{C_D\\rho_GS}}', res: Q(o.vNose, SPEED) },
      { label: 'Aft body impact speed after slowing over the tether', lhs: 'V_{aft}', eq: '\\sqrt{\\frac{2m_2g}{C_D\\rho_GS}+\\frac{2m_1g}{C_D\\rho_GS}e^{-C_D\\rho_GSL/m_2}}', res: Q(o.vAft, SPEED) });
    if (v.reef) steps.push({ label: 'Reefing line strength', lhs: 'S_R', eq: 'q_D\\frac{\\pi}{4}D_0^2C_S', res: Q(o.reefLine, FORCE) });
    return [{
      title: 'Theory',
      text: 'In steady descent the drag balances the weight, $Mg=\\tfrac12C_D\\rho SV^2$. In the troposphere $\\rho=\\rho_0\\tau^m$ with $\\tau=1+\\alpha h/T_0$, so $V=V_0\\tau^{-m/2}$ and $dt=dh/V$ integrates in closed form. A reefed canopy has a smaller drag coefficient (Knacke). When the nose lands, the aft body decelerates over the tether length under $m_2\\,dV/dt=m_2g-\\tfrac12C_D\\rho SV^2$ (Hoult).',
      steps,
    }];
  },
  references: ['dpparachuterev2', 'parachute-reefing'],
  examples: [
    { name: 'Second stage from 25 000 ft, reefed to 0.25', values: { W1: 10, W2: 8.5, L: 33, D0: 5.18, CD: 0.8, reef: true, ratio: 0.25, hR: 1000, hD: 25000, hG: 4300, VD: 100, wind: 20 } },
    { name: 'Same, not reefed', values: { W1: 10, W2: 8.5, L: 33, D0: 5.18, CD: 0.8, reef: false, ratio: 0.25, hR: 1000, hD: 25000, hG: 4300, VD: 100, wind: 20 } },
    { name: 'Light rocket, 2 ft parachute', values: { W1: 11.9, W2: 2.1, L: 60, D0: 2, CD: 0.82, reef: false, ratio: 0.3, hR: 500, hD: 21600, hG: 3400, VD: 80, wind: 30 } },
  ],
};
