// Tethered Pilot-Balloon Wind Sensor — UI definition.
import { pibal, windSpeed, bias } from '../calc/pibal.js';
import { density } from '../calc/recovery.js';
import { s, fmt, InputError } from '../util.js';
import { text, path } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const DIST = { dim: 'distance', internal: 'ft' };
const ALT = { dim: 'altitude', internal: 'ft' };
const SPEED = { dim: 'speed', internal: 'fts' };
const FORCE = { dim: 'force', internal: 'lbf' };
const SMALL = { dim: 'smallMass', internal: 'lbm' };
const DENS = { dim: 'density', internal: 'slugft3' };
const MATD = { dim: 'matDensity', internal: 'gcm3' };
const TEMP = { dim: 'temperature', internal: 'K' };
const PRES = { dim: 'pressure', internal: 'Pa', units: { si: 'kPa', us: 'psi' } };
const LEN = { dim: 'length', internal: 'in' };
const RAD = Math.PI / 180, GCM3 = 1.9403203;   // g/cm³ → slug/ft³
// a value in the reader's unit, for result notes
const inUnits = (x, spec) => `${fmt(toDisplay(x, spec), { digits: 3 })} ${unitLabel(displayUnit(spec))}`;

/** Model inputs (ft, lbf, slug/ft³, Pa, K) and the air density at the balloon (standard troposphere at site + height). */
function model(v, over = {}) {
  const w = { ...v, ...over }, h = w.L * Math.sin(w.theta * RAD);
  return { D: w.D, We: w.We, CD: w.CD, gas: w.gas, pG: w.pG, TG: w.TG, dt: w.dt / 12, rhoT: w.rhoT * GCM3, Cd: w.Cd, L: w.L, theta: w.theta, az: w.az, rho: density(w.hG + h) };
}

export default {
  slug: 'tethered-pibal',
  topic: 'wind-measurement',
  title: 'Tethered Balloon Wind Sensor',
  subtitle: 'Wind speed from the <b>lean of a tethered helium balloon</b>, corrected for the sag and drag of its tether.',
  intro: {
    what: 'Turns the elevation angle of a tethered pilot balloon, seen from its winch, into the wind speed at the balloon, corrects it for tether sag and drag, and resolves it into north and east components for a trajectory simulation.',
    why: 'Low-level winds near the launcher matter most for wind compensation, and forecasts do not give them. A tethered balloon and a pocket elevation sensor measure them cheaply on the launch site up to a few hundred metres.',
    when: 'On launch day, before setting the launcher, to measure the winds below about 1 km; higher winds come from the forecast winds aloft.',
  },
  info: {
    text: [
      'The balloon’s net lift pulls up and the wind’s drag pulls it downwind; it settles where the tether lines up with their resultant, so the elevation angle of the tether measures the ratio of lift to drag.',
      'Gravity sags the tether and the wind bows it downwind, so the angle measured at the winch is a little steeper than at the balloon; a small correction removes this bias.',
    ],
    tex: 'V=\\sqrt{\\frac{2(B-W)\\cot\\Theta}{\\rho C_DS}},\\qquad V_c=V\\sqrt{1-\\frac{W_T+C_d\\rho rdV^2\\tan\\Theta\\sin\\Theta}{2(B-W)}}',
    steps: ['Describe the balloon and how it was filled.', 'Describe the tether.', 'Enter the tether length paid out, the elevation angle and the balloon’s azimuth.', 'Read the corrected wind speed and its components.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'balloon', title: 'Balloon',
      fields: [
        { id: 'D', label: 'Inflated diameter', sym: 'D', ...DIST, default: 3, min: 0, minExclusive: true, slider: { min: 1, max: 6, step: 0.1 },
          info: { text: 'Diameter of the inflated balloon; inflate it through a template to control the size.', range: 'A 3 ft (0.9 m) balloon is easy to see and responds well to winds up to about 7 m/s.', doc: 'balance' } },
        { id: 'We', label: 'Empty balloon mass', sym: 'W_e', ...SMALL, default: 0.223, min: 0, info: { text: 'Mass of the balloon skin and its fittings.', doc: 'balance' } },
        { id: 'CD', label: 'Balloon drag coefficient', sym: 'C_D', dim: 'none', default: 0.47, min: 0, minExclusive: true, max: 2, slider: { min: 0.1, max: 0.8, step: 0.01 },
          info: { text: 'Drag coefficient of the sphere based on its frontal area.', range: 'About 0.47 below the drag crisis (Reynolds number under ~3×10⁵), falling towards 0.1–0.2 above it (Hoerner).', doc: 'balance' } },
        { id: 'gas', label: 'Lifting gas', kind: 'select', default: 'helium', options: [{ value: 'helium', label: 'Helium' }, { value: 'hydrogen', label: 'Hydrogen' }], info: { doc: 'balance' } },
        { id: 'TG', label: 'Gas temperature at filling', sym: 'T_G', ...TEMP, default: 290.93, min: 150, max: 350, info: { text: 'Temperature of the gas when the balloon was filled (about the ground temperature).', doc: 'balance' } },
        { id: 'pG', label: 'Air pressure at filling', sym: 'p_G', ...PRES, default: 87080, min: 1000, info: { text: 'Barometric pressure on the launch site; with the temperature it sets the mass of gas in the balloon.', doc: 'balance' } },
      ],
    },
    {
      id: 'tether', title: 'Tether',
      fields: [
        { id: 'dt', label: 'Tether diameter', sym: 'd_t', ...LEN, default: 0.011, min: 0, minExclusive: true, info: { text: 'Diameter of the tether line.', range: 'Braided UHMW polyethylene (Spectra) of 0.011 in (0.28 mm) holds about 50 lb.', doc: 'bias' } },
        { id: 'rhoT', label: 'Tether material density', sym: '\\rho_T', ...MATD, default: 0.967, min: 0, minExclusive: true, info: { text: 'Density of the tether material; UHMW polyethylene floats at about 0.97 g/cm³.', doc: 'bias' } },
        { id: 'Cd', label: 'Tether cross-flow drag coefficient', sym: 'C_d', dim: 'none', default: 1.92, min: 0, max: 4, info: { text: 'Two-dimensional drag coefficient of the line across the flow; about 1.9 at the low Reynolds numbers (≈ 50) of a thin line.', doc: 'bias' } },
      ],
    },
    {
      id: 'reading', title: 'Reading',
      fields: [
        { id: 'L', label: 'Tether paid out', sym: 'd', ...DIST, default: 158, min: 0, minExclusive: true, slider: { min: 20, max: 1500, step: 1 }, info: { text: 'Length of tether between the winch and the balloon (from the winch odometer).', doc: 'bias' } },
        { id: 'theta', label: 'Elevation angle', sym: '\\Theta', dim: 'angle', default: 50, min: 1, max: 89, slider: { min: 5, max: 85, step: 0.5 }, info: { text: 'Elevation of the balloon above the horizon seen from the winch.', doc: 'balance' } },
        { id: 'az', label: 'Balloon azimuth', sym: '\\psi', dim: 'angle', default: 40, min: 0, max: 360, slider: { min: 0, max: 360, step: 1 }, info: { text: 'Bearing of the balloon from the winch, clockwise from true north: the direction the wind blows towards.', doc: 'components' } },
        { id: 'hG', label: 'Launch site elevation', sym: 'h_G', ...ALT, default: 4078, min: 0, max: 30000, info: { text: 'Elevation of the winch above sea level; the air density at the balloon comes from the standard atmosphere.', doc: 'balance' } },
      ],
    },
  ],
  results: [
    { id: 'Vc', label: 'Wind speed (corrected)', sym: 'V_c', ...SPEED, key: true, digits: 4, note: (x, out) => `raw ${inUnits(out.o.V, SPEED)} before the tether correction`,
      info: { tex: 'V_c=V\\sqrt{1-b-c}', doc: 'bias' } },
    { id: 'h', label: 'Balloon height above the winch', sym: 'h', ...DIST, key: true, digits: 4, info: { tex: 'h=d\\sin\\Theta', doc: 'balance' } },
    { id: 'corr', label: 'Tether bias correction', sym: '\\sqrt{1-b-c}', dim: 'none', key: true, digits: 4, note: (x) => `corrected speed ${fmt((1 - x) * 100, { digits: 3 })} % below the raw one`,
      info: { text: 'Factor on the raw wind speed that removes the bias from tether sag ($b$) and tether drag ($c$).', doc: 'bias' } },
    { id: 'lift', label: 'Net lift', sym: 'B-W', ...FORCE, key: true, digits: 4, note: (x, out) => `buoyancy ${inUnits(out.o.B, FORCE)} · weight ${inUnits(out.o.W, FORCE)}`,
      info: { text: 'Buoyancy of the balloon minus the weight of its skin and gas.', doc: 'balance' } },
    { id: 'V', label: 'Wind speed (raw)', sym: 'V', ...SPEED, digits: 4, info: { tex: 'V=\\sqrt{\\frac{2(B-W)\\cot\\Theta}{\\rho C_DS}}', doc: 'balance' } },
    { id: 'north', label: 'North component', sym: 'V_N', ...SPEED, digits: 4, info: { tex: 'V_N=V_c\\cos\\psi', doc: 'components' } },
    { id: 'east', label: 'East component', sym: 'V_E', ...SPEED, digits: 4, info: { tex: 'V_E=V_c\\sin\\psi', doc: 'components' } },
    { id: 'b', label: 'Tether-weight bias term', sym: 'b', dim: 'none', digits: 4, info: { tex: 'b=\\frac{W_T}{2(B-W)}', doc: 'bias' } },
    { id: 'c', label: 'Tether-drag bias term', sym: 'c', dim: 'none', digits: 4, info: { tex: 'c=\\frac{C_d\\rho rdV^2\\tan\\Theta\\sin\\Theta}{2(B-W)}', doc: 'bias' } },
    { id: 'B', label: 'Buoyancy', sym: 'B', ...FORCE, digits: 4, info: { tex: 'B=\\rho g\\frac{\\pi D^3}{6}', doc: 'balance' } },
    { id: 'Wg', label: 'Gas weight', sym: 'W_g', ...FORCE, digits: 4, info: { tex: 'W_g=\\frac{p_G}{R_gT_G}\\,g\\,\\frac{\\pi D^3}{6}', doc: 'balance' } },
    { id: 'WT', label: 'Tether weight', sym: 'W_T', ...FORCE, digits: 4, info: { doc: 'bias' } },
    { id: 'rho', label: 'Air density at the balloon', sym: '\\rho', ...DENS, digits: 4, info: { doc: 'balance' } },
  ],
  compute(v) {
    const p = model(v), o = pibal(p);
    if (o.sinks) throw new InputError('The balloon cannot lift itself and its gas: use a larger balloon or a lighter skin.');
    if (!(o.factor > 0)) throw new InputError('The tether correction exceeds the measurement: the tether is too long or too heavy for this balloon. Reel in or use a thinner line.');
    const warnings = [];
    if (v.theta < 15) warnings.push({ level: 'info', text: 'At low elevation angles the balloon is nearly blown down and the reading is very sensitive to the angle; a larger balloon gives a better reading in strong wind.' });
    if (o.factor < 0.8) warnings.push({ level: 'warn', text: `The tether bias is large (${fmt((1 - Math.sqrt(o.factor)) * 100, { digits: 2 })} % of the speed). Shorten the tether or use a thinner line for a more reliable reading.` });
    const results = { Vc: o.Vc, h: o.h, corr: Math.sqrt(o.factor), lift: o.lift, V: o.V, north: o.north, east: o.east, b: o.b, c: o.c, B: o.B, Wg: o.Wg, WT: o.WT, rho: p.rho };
    return { results, warnings, o, p };
  },
  plots: [
    {
      id: 'response', title: 'Elevation angle against wind speed',
      info: { text: 'The balloon’s response curve: the elevation angle you would read at each wind speed, for your balloon (solid) and other sizes (dashed), with the same tether length. Pick a size that stays between about 20° and 70° in the expected winds.', doc: 'balance' },
      build(v, out, { U }) {
        const us = U(SPEED), ud = U(DIST), series = [];
        for (const D of [...new Set([v.D, 2, 4])].sort((a, b) => a - b)) {
          const pts = [];
          for (let i = 0; i <= 80; i++) { const th = 5 + i; const o = pibal(model(v, { D, theta: th })); if (!o.sinks && o.factor > 0) pts.push([us.v(o.Vc), th]); }
          series.push({ name: D === v.D ? `your balloon ($D=${fmt(ud.v(D), { digits: 3 })}$ ${ud.plain})` : `$D=${fmt(ud.v(D), { digits: 3 })}$ ${ud.plain}`, points: pts.reverse(), smooth: true, dashed: D !== v.D, color: D === v.D ? null : 'var(--text-3)' });
        }
        return { x: { label: 'Wind speed $V_c$', unit: us.label }, y: { label: 'Elevation angle $\\Theta$', unit: '{}^{\\circ}' }, yDomain: [0, 90], includeZero: true, series,
          markers: [{ x: us.v(out.o.Vc), y: v.theta, label: 'reading' }] };
      },
    },
    {
      id: 'tether', title: 'Tether correction against tether length',
      info: { text: 'Bias correction at this elevation angle as more tether is paid out. Tether weight and drag grow with length while the balloon’s lift stays the same, so long tethers need large corrections.', doc: 'bias' },
      build(v, out, { U }) {
        const ud = U(DIST), pts = [];
        for (let i = 1; i <= 80; i++) { const L = (2000 * i) / 80, o = pibal(model(v, { L })); if (!o.sinks && o.factor > 0) pts.push([ud.v(L), Math.sqrt(o.factor)]); }
        return { x: { label: 'Tether paid out $d$', unit: ud.label }, y: { label: 'Correction $\\sqrt{1-b-c}$' }, yDomain: [0, 1], series: [{ name: 'correction', points: pts, smooth: true }],
          markers: [{ x: ud.v(v.L), y: Math.sqrt(out.o.factor), label: 'reading' }] };
      },
    },
    {
      id: 'terms', title: 'Bias terms against elevation angle',
      info: { text: 'The two bias terms at your tether length: sag from the tether’s weight ($b$) and bowing from its drag ($c$). Drag dominates at high wind speeds (low angles).', doc: 'bias' },
      build(v) {
        const b = [], c = [];
        for (let i = 0; i <= 75; i++) { const th = 10 + i, o = pibal(model(v, { theta: th })); if (!o.sinks) { b.push([th, o.b]); c.push([th, o.c]); } }
        return { x: { label: 'Elevation angle $\\Theta$', unit: '{}^{\\circ}' }, y: { label: 'Bias term' }, includeZero: true,
          series: [{ name: 'tether weight $b$', points: b, smooth: true }, { name: 'tether drag $c$', points: c, smooth: true, dashed: true }], vlines: [{ x: v.theta, label: 'reading', color: 'var(--text-3)' }] };
      },
    },
  ],
  schematicTitle: 'Balloon, tether and the wind',
  schematicHint: 'Side view: the balloon leans downwind until lift and drag line up with the tether (tether sag exaggerated, balloon not to scale). Drag the balloon to change the angle and tether length. Inset: the wind direction',
  schematic(ctx, v, out) {
    const W = 760, H = 380, o = out.o;
    const fr = ctx.frame({ width: W, height: H, label: 'Tethered balloon with its forces, and a compass with the wind components' });
    const g = fr.layer('main'); g.replaceChildren();
    const ud = ctx.U(DIST), us = ctx.U(SPEED), Dl = (x) => `${fmt(ud.v(x), { digits: 3 })} ${ud.label}`, Sp = (x) => `${fmt(us.v(x), { digits: 3 })} ${us.label}`;
    const x0 = 70, yg = 330, th = v.theta * RAD, span = Math.max(v.L * Math.cos(th) / 420, v.L * Math.sin(th) / 260), k = 1 / span;
    const bx = x0 + v.L * Math.cos(th) * k, by = yg - v.L * Math.sin(th) * k;
    g.append(s('line', { x1: 20, x2: 540, y1: yg, y2: yg, class: 'sc-line' }));
    for (let x = 24; x < 540; x += 12) g.append(s('line', { x1: x, y1: yg, x2: x - 8, y2: yg + 8, class: 'sc-thin', 'stroke-opacity': 0.5 }));
    g.append(s('rect', { x: x0 - 14, y: yg - 16, width: 28, height: 16, rx: 3, class: 'sc-body-2' }));
    g.append(text(x0, yg + 22, 'winch', { anchor: 'middle', size: 10.5, cls: 'sc-dim-text' }));
    // line of sight and the sagging tether (sag exaggerated ×(15 % of length scaled by the bias))
    g.append(s('line', { x1: x0, y1: yg - 16, x2: bx, y2: by, class: 'sc-thin', 'stroke-dasharray': '5 4', 'data-field': 'theta' }));
    const sag = Math.min(40, 6 + 220 * (o.b + o.c)), pts = [];
    for (let i = 0; i <= 30; i++) { const u = i / 30, x = x0 + (bx - x0) * u, y = yg - 16 + (by - yg + 16) * u; pts.push([x + Math.sin(th) * sag * 4 * u * (1 - u), y + Math.cos(th) * sag * 4 * u * (1 - u)]); }
    g.append(s('path', { d: path(pts), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.3, 'data-field': 'dt rhoT Cd L' }));
    // balloon (not to scale) and its forces
    const rb = 22;
    g.append(s('circle', { cx: bx, cy: by - rb * 0.6, r: rb, fill: 'var(--red)', 'fill-opacity': 0.8, 'data-field': 'D We CD' }));
    const fL = 60, fD = fL / Math.tan(th);
    g.append(s('line', { x1: bx, y1: by - rb * 1.6, x2: bx, y2: by - rb * 1.6 - fL, class: 'sc-accent', 'stroke-width': 2, 'marker-end': fr.arrow('acc') }));
    g.append(text(bx + 6, by - rb * 1.6 - fL + 10, 'net lift B − W', { size: 10.5 }));
    g.append(s('line', { x1: bx + rb + 2, y1: by - rb * 0.6, x2: bx + rb + 2 + Math.min(160, fD), y2: by - rb * 0.6, class: 'sc-accent', 'stroke-width': 2, 'marker-end': fr.arrow('acc') }));
    g.append(text(bx + rb + 6, by - rb * 0.6 + 16, `drag · wind ${Sp(o.Vc)}`, { size: 10.5 }));
    // wind arrows
    for (const y of [80, 150, 220]) g.append(s('path', { d: `M560,${y}h50`, class: 'sc-thin', 'marker-end': fr.arrow() }));
    g.append(text(585, 66, 'wind', { anchor: 'middle', size: 10.5, cls: 'sc-dim-text' }));
    // angle, height and length
    const ar = 56;
    g.append(s('path', { d: `M${x0 + ar},${yg - 16} A${ar},${ar} 0 0 0 ${x0 + ar * Math.cos(th)},${yg - 16 - ar * Math.sin(th)}`, class: 'sc-accent', fill: 'none', 'data-field': 'theta' }));
    g.append(text(x0 + ar + 8, yg - 22, `\\Theta = ${fmt(v.theta, { digits: 3 })}°`, { size: 11, field: 'theta' }));
    g.append(s('line', { x1: bx, x2: bx, y1: by, y2: yg, class: 'sc-thin', 'stroke-dasharray': '2 3' }));
    g.append(text(bx - 6, (by + yg) / 2, `h = ${Dl(o.h)}`, { anchor: 'end', size: 11 }));
    g.append(text((x0 + bx) / 2 - 10, (yg + by) / 2 - 14, `d = ${Dl(v.L)}`, { anchor: 'end', size: 11, field: 'L' }));
    // compass inset: wind direction and components
    const cx = 680, cy = 290, cr = 50, az = v.az * RAD, wx = Math.sin(az), wy = -Math.cos(az);
    g.append(s('circle', { cx, cy, r: cr, fill: 'none', class: 'sc-thin' }));
    g.append(text(cx, cy - cr - 6, 'N', { anchor: 'middle', size: 11 }));
    g.append(s('line', { x1: cx, y1: cy, x2: cx + wx * cr, y2: cy + wy * cr, class: 'sc-accent', 'stroke-width': 2.2, 'marker-end': fr.arrow('acc'), 'data-field': 'az' }));
    g.append(s('path', { d: `M${cx},${cy}V${cy + wy * cr}H${cx + wx * cr}`, class: 'sc-thin', 'stroke-dasharray': '2 2', fill: 'none' }));
    g.append(text(cx, cy + cr + 18, `N ${Sp(o.north)} · E ${Sp(o.east)}`, { anchor: 'middle', size: 10.5, field: 'az' }));
    g.append(text(cx, cy + cr + 32, `towards ${fmt(v.az, { digits: 3 })}°`, { anchor: 'middle', size: 10, cls: 'sc-dim-text', field: 'az' }));
    g.append(text(20, H - 8, 'tether sag exaggerated; balloon not to scale', { size: 10, cls: 'sc-dim-text' }));
    ctx.handle('balloon', bx, by - rb * 0.6, {
      field: 'theta', title: 'Drag to change the elevation angle and tether length',
      onDrag: (sx, sy) => { const dx = Math.max(1, sx - x0), dy = Math.max(1, yg - 16 - sy); ctx.setValue('theta', Math.min(85, Math.max(5, Math.atan2(dy, dx) / RAD)), { round: 0.5 }); ctx.setValue('L', Math.max(20, Math.hypot(dx, dy) / k), { round: 1 }); },
      onKey: (dx, dy) => { if (dy) ctx.setValue('theta', Math.min(85, Math.max(5, v.theta + 0.5 * dy))); if (dx) ctx.setValue('L', Math.max(20, v.L * (1 + 0.05 * dx)), { round: 1 }); },
    });
  },
  symbols: {
    V: 'raw wind speed', V_c: 'corrected wind speed', B: 'buoyancy of the balloon', W: 'weight of the balloon and its gas', W_e: 'empty balloon weight', W_g: 'weight of the lifting gas', W_T: 'weight of the deployed tether',
    '\\Theta': 'elevation angle seen from the winch', '\\rho': 'air density at the balloon', C_D: 'balloon drag coefficient', S: 'balloon frontal area', D: 'balloon diameter', C_d: 'tether cross-flow drag coefficient',
    r: 'tether radius', d: 'tether length paid out', b: 'tether-weight bias term', c: 'tether-drag bias term', h: 'balloon height above the winch', '\\psi': 'balloon azimuth', V_N: 'north wind component', V_E: 'east wind component',
    g: 'acceleration of gravity', p_G: 'air pressure at filling', T_G: 'gas temperature at filling', R_g: 'gas constant of the lifting gas', d_t: 'tether diameter', '\\rho_T': 'tether material density',
  },
  report(v, out, R) {
    const o = out.o, p = out.p, n = R.n, Q = R.Q, F = (x) => Q(x, FORCE);
    const steps = [
      { label: 'Buoyancy of the balloon in the air at its height', lhs: 'B', eq: '\\rho g\\frac{\\pi D^3}{6}', res: F(o.B) },
      { label: 'Weight of the gas (filled on the ground) and of the balloon', lhs: 'W_g', eq: '\\frac{p_G}{R_gT_G}\\,g\\,\\frac{\\pi D^3}{6}', res: F(o.Wg) },
      { lhs: 'W', eq: 'W_e+W_g', res: F(o.W) },
      { label: 'Raw wind speed from the force balance', lhs: 'V', eq: '\\sqrt{\\frac{2(B-W)\\cot\\Theta}{\\rho C_DS}}',
        sub: `\\sqrt{\\frac{2\\times${R.v(o.lift, FORCE)}\\times\\cot ${n(v.theta)}^\\circ}{${R.v(p.rho, DENS)}\\times${n(v.CD)}\\times${n(R.us ? o.S : o.S * 0.09290304)}}}`, res: Q(o.V, SPEED) },
      { label: 'Tether bias terms (eq. 5)', lhs: 'b', eq: '\\frac{W_T}{2(B-W)}', sub: `\\frac{${n(o.WT)}}{2\\times${n(o.lift)}}`, res: n(o.b) },
      { lhs: 'c', eq: '\\frac{C_d\\rho rdV^2\\tan\\Theta\\sin\\Theta}{2(B-W)}', res: n(o.c) },
      { label: 'Corrected wind speed', lhs: 'V_c', eq: 'V\\sqrt{1-b-c}', sub: `${n(o.V)}\\times\\sqrt{1-${n(o.b)}-${n(o.c)}}`, res: Q(o.Vc, SPEED) },
      { label: 'North and east components (the balloon’s azimuth is the downwind direction)', lhs: 'V_N', eq: 'V_c\\cos\\psi', res: Q(o.north, SPEED) },
      { lhs: 'V_E', eq: 'V_c\\sin\\psi', res: Q(o.east, SPEED) },
    ];
    return [{
      title: 'Theory',
      text: 'In steady wind the tether lines up with the resultant of the net lift $B-W$ and the drag $\\tfrac12\\rho V^2C_DS$, so $\\tan\\Theta=(B-W)/D$ and $V=\\sqrt{2(B-W)\\cot\\Theta/(\\rho C_DS)}$. Tether sag and tether drag both make the angle seen at the winch steeper than at the balloon; replacing $\\cot\\Theta$ by $\\cot\\Theta[1-(W_T+C_d\\rho rdV^2\\tan\\Theta\\sin\\Theta)/2(B-W)]$ removes the bias to first order (Hoult).',
      steps,
    }];
  },
  references: ['tpb-bias-errors', 'tether-catenary', 'winch-equations', 'csulbwindsensor', 'a-new-wind-sensor-for-rockets-orig'],
  examples: [
    { name: 'Field reading at 158 ft, 50°', values: { D: 3, We: 0.223, CD: 0.47, gas: 'helium', TG: 290.93, pG: 87080, dt: 0.011, rhoT: 0.967, Cd: 1.92, L: 158, theta: 50, az: 40, hG: 4078 } },
    { name: 'High reading: 1 022 ft at 20°', values: { D: 3, We: 0.223, CD: 0.47, gas: 'helium', TG: 290.93, pG: 87080, dt: 0.011, rhoT: 0.967, Cd: 1.92, L: 1022, theta: 20, az: 30, hG: 4078 } },
    { name: 'Memo example: 600 ft of line at 56.4°, sea level', values: { D: 3, We: 0.22, CD: 0.49, gas: 'helium', TG: 288.15, pG: 101325, dt: 0.011, rhoT: 0.967, Cd: 1.92, L: 600, theta: 56.44, az: 0, hG: 0 } },
  ],
};
