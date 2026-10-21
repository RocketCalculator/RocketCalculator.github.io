// Payload Bay Venting — UI definition.
import { vent } from '../calc/vent.js';
import { atmosphere } from '../calc/geophysics.js';
import { s, fmt, InputError } from '../util.js';
import { text } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const LEN = { dim: 'length', internal: 'in' };
const ALT = { dim: 'altitude', internal: 'ft' };
const SPEED = { dim: 'speed', internal: 'fts' };
const VOL = { dim: 'volume', internal: 'ft3' };
const PRES = { dim: 'pressure', internal: 'psf', units: { si: 'kPa', us: 'psi' } };
const NONE = { dim: 'none' };
// trajectory of the field tool's example (10 000 ft IREC rocket), every 0.5 s: time, height above the site, speed
const TRAJ = [[0, 0, 0], [0.5, 16.7, 83.9], [1, 87.3, 199.9], [1.5, 217.7, 322.6], [2, 410.4, 448.2], [2.5, 666, 573.8], [3, 983.3, 694.3], [3.5, 1357.8, 800.7], [4, 1780.9, 888.8], [4.5, 2242.9, 955.4],
  [5, 2733.1, 1002.5], [5.5, 3241.4, 1026.1], [6, 3753.9, 1018.1], [6.5, 4255.5, 985.3], [7, 4737.1, 939.3], [7.5, 5196.3, 898.5], [8, 5635.9, 860.3], [8.5, 6056.9, 824.1], [9, 6460.3, 789.6],
  [9.5, 6846.8, 756.8], [10, 7217.3, 725.4], [10.5, 7572.4, 695.3], [11, 7912.8, 666.4], [11.5, 8239, 638.7], [12, 8551.6, 611.9], [12.5, 8851.1, 586], [13, 9137.8, 561.1], [13.5, 9412.2, 536.8]].map(([t, h, V]) => ({ t, h, V }));
const SUPER = [[1, -0.0932], [1.1, -0.0494], [1.2, -0.0376], [1.3, -0.0335], [1.4, -0.0308], [1.5, -0.0288]].map(([M, cp]) => ({ M, cp }));
const P = (x) => `${fmt(toDisplay(x, PRES), { digits: 3 })} ${unitLabel(displayUnit(PRES))}`;

function checkRows(rows, keys, label) {
  if (rows.some((r) => keys.some((k) => !Number.isFinite(r[k])))) return 'Every cell needs a number.';
  for (let i = 1; i < rows.length; i++) if (rows[i][keys[0]] <= rows[i - 1][keys[0]]) return `${label} must increase down the table (row ${i}).`;
  return '';
}

/** Model run for page values v (optionally overriding the vent diameter). */
function run(v, d = v.d) {
  const A = (v.N * Math.PI * (d / 12) ** 2) / 4, a0 = Math.sqrt(1.4 * 1716.4827 * v.T0);
  const atm = (h) => { const a = atmosphere({ h, ho: v.ho, To: v.T0, phi: v.lat }); return { p: a.p, T: a.T }; };
  const tau = v.Vol / (A * v.Csonic * a0), dt = Math.min(0.01, Math.max(2e-4, tau / 20));   // resolve the venting time constant
  return { A, tau, ...vent({ traj: v.traj.map((r) => [r.t, v.ho + r.h, r.V]), atm, Vol: v.Vol, A, Cinc: v.Cinc, Csonic: v.Csonic, Cp0: v.Cp0, Mcr: v.Mcr, cpTable: v.super.map((r) => [r.M, r.cp]), dt }) };
}

export default {
  slug: 'payload-venting',
  topic: 'venting',
  title: 'Payload Bay Venting',
  subtitle: 'How far the <b>pressure inside a vented payload bay</b> lags the air outside during ascent — the load on the shell and the error of an inside pressure sensor.',
  intro: {
    what: 'Follows the pressure of the air trapped in a payload bay as the rocket climbs, venting through small holes to the pressure outside them, and gives the largest pressure difference across the shell.',
    why: 'The bay air cannot escape instantly, so the bay is pressurised against the thinning (and, near the nose, sucked-down) outside air. Too few or too small vents load the shell — the first Astrobee 1500 lost part of its payload shroud this way — and spoil inside pressure measurements.',
    when: 'Sizing vent holes, checking a payload shell or door for the pressure load, or deciding where to put a pressure sensor.',
  },
  info: {
    text: [
      'The trapped air expands isentropically while it flows out through the vents. The flow depends on the pressure ratio across the vents: subsonic for small ratios, choked (sonic) above about 1.9.',
      'Outside the vents the pressure is the atmospheric pressure plus the local aerodynamic suction, $p_X=p_a+qC_{pX}$; vents just behind the nose see a negative $C_{pX}$, which raises the difference.',
      'Matching the bay’s mass loss to the vent flow gives one differential equation for the bay pressure, integrated along the trajectory.',
    ],
    tex: '\\frac{dp_C}{dt}=-\\gamma\\sqrt{\\gamma RT_0}\\,\\frac{A}{V}\\,C_NM_T\\left[1+\\tfrac{\\gamma-1}{2}M_T^2\\right]^{-\\frac{\\gamma+1}{2(\\gamma-1)}}p_0^{-\\frac{\\gamma-1}{2\\gamma}}p_C^{\\frac{3\\gamma-1}{2\\gamma}}',
    steps: ['Enter the bay volume and the vents.', 'Enter the pressure coefficient where the vents exit.', 'Enter the launch site and the trajectory from a simulation.', 'Read the largest pressure difference and when it happens.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'bay', title: 'Bay and vents',
      fields: [
        { id: 'Vol', label: 'Bay air volume', sym: 'V', ...VOL, default: 0.227, min: 0, minExclusive: true, info: { text: 'Free air volume of the payload cavity (its inside volume less the payload).', doc: 'model' } },
        { id: 'N', label: 'Number of vent holes', sym: 'N', ...NONE, default: 1, min: 1, max: 24, slider: { min: 1, max: 12, step: 1 },
          info: { text: 'Identical holes, all exiting at the same pressure. Use at least three, equally spaced round the body, so angle of attack does not bias the bay pressure.', doc: 'model' } },
        { id: 'd', label: 'Vent hole diameter', sym: 'd_v', ...LEN, default: 0.1256, min: 0, minExclusive: true, info: { text: 'Diameter of each cylindrical vent hole.', doc: 'model' } },
        { id: 'Cinc', label: 'Orifice coefficient, incompressible', sym: 'C_{INC}', ...NONE, default: 0.65, min: 0.3, max: 1, slider: { min: 0.4, max: 0.9, step: 0.01 },
          info: { text: 'Discharge coefficient of a vent at low pressure ratio.', range: 'About 0.5 for a sharp-edged hole, up to 0.8 with a radiused inner edge.', doc: 'orifice' } },
        { id: 'Csonic', label: 'Orifice coefficient, choked', sym: 'C_{SON}', ...NONE, default: 0.95, min: 0.5, max: 1, slider: { min: 0.8, max: 1, step: 0.01 },
          info: { text: 'Discharge coefficient when the vent flow is sonic.', range: '0.96–0.98 typically.', doc: 'orifice' } },
      ],
    },
    {
      id: 'aero', title: 'Pressure at the vents',
      fields: [
        { id: 'Cp0', label: 'Vent pressure coefficient, incompressible', sym: 'C_{pX0}', ...NONE, default: -0.0343, min: -1, max: 1,
          info: { text: 'Pressure coefficient of the body surface at the vent exit at low speed. The Nose Pressure Distribution calculator gives it; just behind the nose shoulder it is about −0.03 to −0.08.', doc: 'external' } },
        { id: 'Mcr', label: 'Critical Mach number at the vents', sym: 'M_{cr}', ...NONE, default: 0.9487, min: 0.3, max: 1, info: { text: 'Above this the Kármán–Tsien correction stops and the supersonic table takes over.', doc: 'external' } },
        { id: 'super', label: 'Vent pressure coefficient above the critical Mach number', kind: 'table', minRows: 2,
          columns: [{ id: 'M', label: 'Mach', ...NONE }, { id: 'cp', label: 'Cp', ...NONE }], default: SUPER,
          validate: (rows) => checkRows(rows, ['M', 'cp'], 'Mach numbers'),
          info: { text: 'Surface pressure coefficient at the vent exit for transonic and supersonic Mach numbers (from a shock-expansion or other aerodynamic method). Linear between rows.', doc: 'external' } },
      ],
    },
    {
      id: 'flight', title: 'Launch site and trajectory',
      fields: [
        { id: 'ho', label: 'Launch site elevation', sym: 'h_o', ...ALT, default: 1898, min: 0, max: 15000, info: { doc: 'model' } },
        { id: 'T0', label: 'Ground temperature', sym: 'T_0', dim: 'temperature', internal: 'R', default: 550, min: 400, max: 600, info: { text: 'Air temperature at the launch site; the bay air starts at it.', doc: 'model' } },
        { id: 'lat', label: 'Latitude', sym: '\\phi', dim: 'angle', default: 34, min: -90, max: 90, info: { doc: 'model' } },
        { id: 'traj', label: 'Trajectory (from a simulation)', kind: 'table', minRows: 2,
          columns: [{ id: 't', label: 'Time', dim: 'time' }, { id: 'h', label: 'Height above site', ...ALT }, { id: 'V', label: 'Speed', ...SPEED }], default: TRAJ,
          validate: (rows) => checkRows(rows, ['t', 'h', 'V'], 'Times') || (rows.some((r) => r.V < 0) ? 'Speeds cannot be negative.' : ''),
          info: { text: 'Height above the launch site and speed against time after lift-off, from a trajectory simulation. Rows every 0.5 s or finer; linear between rows.', doc: 'model' } },
      ],
    },
  ],
  results: [
    { id: 'dpMax', label: 'Largest pressure difference across the shell', sym: '\\Delta p_{max}', ...PRES, key: true, digits: 4,
      note: (x, out) => `${x >= 0 ? 'bay above' : 'bay below'} outside · at ${fmt(out.o.worst.t, { digits: 3 })} s`,
      info: { text: 'Largest difference between the bay pressure and the pressure outside the vents during the trajectory.', tex: '\\Delta p=p_C-p_X', doc: 'model' } },
    { id: 'tMax', label: 'Time of the largest difference', sym: 't_{max}', dim: 'time', key: true, digits: 3, note: (x, out) => `Mach ${fmt(out.o.worst.M, { digits: 3 })}`, info: { doc: 'model' } },
    { id: 'tau', label: 'Venting time constant', sym: '\\tau', dim: 'time', key: true, digits: 3,
      info: { text: 'Rough time for the vents to bring the bay towards the outside pressure. Much shorter than the climb time means a well-vented bay.', tex: '\\tau\\approx\\frac{V}{AC_{SON}a_0}', doc: 'model' } },
    { id: 'A', label: 'Total vent area', sym: 'A', dim: 'area', internal: 'in2', key: true, digits: 4, info: { tex: 'A=N\\frac{\\pi d_v^2}{4}', doc: 'model' } },
    { id: 'p0', label: 'Bay pressure at lift-off', sym: 'p_0', ...PRES, digits: 4, info: { doc: 'model' } },
  ],
  compute(v) {
    for (const [rows, keys, label] of [[v.traj, ['t', 'h', 'V'], 'Times'], [v.super, ['M', 'cp'], 'Mach numbers']]) { const m = checkRows(rows, keys, label); if (m) throw new InputError(m); }
    if (v.traj.length < 2) throw new InputError('Enter at least two trajectory rows.');
    const o = run(v);
    const warnings = [];
    if (v.N < 3) warnings.push({ level: 'info', text: 'With fewer than three vents equally spaced round the body, angle of attack biases the bay pressure. Use three or more.' });
    if (o.tau > v.traj.at(-1).t - v.traj[0].t) warnings.push({ level: 'warn', text: `The vents are small for this bay (time constant ${fmt(o.tau, { digits: 3 })} s): the bay barely vents during the climb. Enlarge or add vents.` });
    // near equilibrium the vent flow goes as √Δp, so explicit integration chatters at a level of about 1 lbf/ft²
    if (Math.abs(o.worst.dp) < 1.5) warnings.push({ level: 'info', text: 'The vents are large enough that the bay follows the outside pressure: the remaining difference (well under 0.01 psi, 0.07 kPa) is at the noise level of the integration.' });
    return { results: { dpMax: o.worst.dp, tMax: o.worst.t, tau: o.tau, A: o.A * 144, p0: o.p0 }, warnings, o };
  },
  plots: [
    {
      id: 'pressures', title: 'Pressures during the climb',
      info: { text: 'Atmospheric pressure, the pressure outside the vents (lower because of the local suction) and the bay pressure, which lags behind.', doc: 'model' },
      build(v, out, { U }) {
        const up = U(PRES), h = out.o.hist, every = Math.max(1, Math.round(h.length / 300)), pick = (f) => h.filter((_, i) => i % every === 0).map((r) => [r.t, up.v(f(r))]);
        return { x: { label: 'Time after lift-off $t$', unit: '\\mathrm{s}' }, y: { label: 'Pressure', unit: up.label },
          series: [{ name: 'bay $p_C$', points: pick((r) => r.pC) }, { name: 'outside the vents $p_X$', points: pick((r) => r.pX), dashed: true }, { name: 'atmosphere $p_a$', points: pick((r) => r.pa), dashed: true, color: 'var(--text-3)' }] };
      },
    },
    {
      id: 'dp', title: 'Pressure difference across the shell',
      info: { text: 'Bay pressure minus the pressure outside the vents. It peaks near burnout, where speed and suction are greatest.', doc: 'model' },
      build(v, out, { U }) {
        const up = U(PRES), h = out.o.hist, every = Math.max(1, Math.round(h.length / 300));
        return { x: { label: 'Time after lift-off $t$', unit: '\\mathrm{s}' }, y: { label: '$\\Delta p$', unit: up.label }, includeZero: true,
          series: [{ name: '\\Delta p', points: h.filter((_, i) => i % every === 0).map((r) => [r.t, up.v(r.dp)]) }], markers: [{ x: out.o.worst.t, y: up.v(out.o.worst.dp), label: 'max' }] };
      },
    },
    {
      id: 'size', title: 'Largest difference against vent size',
      info: { text: 'Largest pressure difference for other vent hole diameters with the same number of holes; read off the hole size for an allowable difference.', doc: 'model' },
      build(v, out, { U }) {
        const up = U(PRES), ul = U(LEN), pts = [];
        for (let i = 1; i <= 16; i++) { const d = (v.d * i) / 6; pts.push([ul.v(d), up.v(Math.abs(run(v, d).worst.dp))]); }
        return { x: { label: 'Vent hole diameter $d_v$', unit: ul.label }, y: { label: '$|\\Delta p|_{max}$', unit: up.label }, includeZero: true, series: [{ name: '|\\Delta p|_{max}', points: pts, smooth: true, dots: true }],
          markers: [{ x: ul.v(v.d), y: up.v(Math.abs(out.o.worst.dp)), label: 'design' }] };
      },
    },
  ],
  schematicTitle: 'Bay at the moment of the largest difference',
  schematicHint: 'The payload bay with its vents, at the time of the largest pressure difference: bay pressure inside, vent-exit pressure outside, air leaving through the vents',
  schematic(ctx, v, out) {
    const W = 760, H = 260, o = out.o, w = o.worst;
    const fr = ctx.frame({ width: W, height: H, label: 'Payload bay with vents and pressures at the peak difference' });
    const g = fr.layer('main'); g.replaceChildren();
    const cy = 130, x0 = 90, x1 = 600, rb = 60;
    g.append(s('path', { d: `M${x0},${cy - rb}Q${x0 - 60},${cy - rb} ${x0 - 80},${cy}Q${x0 - 60},${cy + rb} ${x0},${cy + rb}`, class: 'sc-body-2' }));
    g.append(s('rect', { x: x0, y: cy - rb, width: x1 - x0, height: 2 * rb, class: 'sc-body', 'data-field': 'Vol' }));
    g.append(s('rect', { x: x0 + 8, y: cy - rb + 8, width: x1 - x0 - 16, height: 2 * rb - 16, fill: 'var(--red)', 'fill-opacity': Math.min(0.35, 0.08 + 0.6 * Math.abs(w.dp) / Math.max(1, w.pX)) }));
    // vents just behind the shoulder: arrows out (or in)
    const nv = Math.min(4, v.N), out1 = w.dp >= 0;
    for (let i = 0; i < nv; i++) {
      const x = x0 + 50 + i * 26;
      g.append(s('rect', { x: x - 4, y: cy - rb - 2, width: 8, height: 12, fill: 'var(--surface)', 'data-field': 'N d' }));
      g.append(s('line', { x1: x, y1: out1 ? cy - rb + 4 : cy - rb - 30, x2: x, y2: out1 ? cy - rb - 30 : cy - rb + 4, class: 'sc-accent', 'stroke-width': 2, 'marker-end': fr.arrow('acc') }));
    }
    g.append(text(x0 + 50, cy - rb - 40, `${v.N} vent${v.N > 1 ? 's' : ''} · outside p_X = ${P(w.pX)}`, { size: 11, field: 'Cp0' }));
    g.append(text((x0 + x1) / 2, cy - 6, `bay p_C = ${P(w.pC)}`, { anchor: 'middle', size: 13 }));
    g.append(text((x0 + x1) / 2, cy + 14, `Δp = ${P(w.dp)} at ${fmt(w.t, { digits: 3 })} s, Mach ${fmt(w.M, { digits: 3 })}`, { anchor: 'middle', size: 11, cls: 'sc-dim-text' }));
    g.append(text(x1 + 12, cy + 4, `atmosphere p_a = ${P(w.pa)}`, { size: 10.5, cls: 'sc-dim-text' }));
    g.append(text(20, H - 8, 'not to scale; red tint grows with the pressure difference', { size: 10, cls: 'sc-dim-text' }));
  },
  symbols: {
    p_C: 'bay pressure', p_X: 'pressure outside the vents', p_a: 'atmospheric pressure', p_0: 'bay pressure at lift-off', T_0: 'bay air temperature at lift-off', R: 'gas constant of air',
    '\\gamma': 'ratio of specific heats', A: 'total vent area', V: 'bay air volume', C_N: 'vent orifice coefficient', M_T: 'vent throat Mach number', 'C_{pX}': 'pressure coefficient at the vent exit',
    'C_{pX0}': 'incompressible pressure coefficient at the vent exit', q: 'dynamic pressure', '\\Delta p': 'bay pressure minus outside pressure', N: 'number of vent holes', d_v: 'vent hole diameter',
    'C_{INC}': 'incompressible orifice coefficient', 'C_{SON}': 'choked orifice coefficient', a_0: 'speed of sound at lift-off', '\\tau': 'venting time constant', 'M_\\infty': 'flight Mach number', '\\beta': 'compressibility factor',
  },
  constants: [{ sym: '\\gamma', desc: 'ratio of specific heats of air', si: [1.4, ''], us: [1.4, ''] }, { sym: 'R', desc: 'gas constant of air', si: [287.05, '\\mathrm{J\\,kg^{-1}\\,K^{-1}}'], us: [1716.48, '\\mathrm{ft^{2}\\,s^{-2}\\,{}^{\\circ}R^{-1}}'] }],
  report(v, out, R) {
    const o = out.o, n = R.n, w = o.worst;
    const steps = [
      { label: 'Total vent area', lhs: 'A', eq: 'N\\frac{\\pi d_v^2}{4}', sub: `${v.N}\\times\\frac{\\pi\\times${R.v(v.d, LEN)}^2}{4}`, res: R.Q(o.A * 144, { dim: 'area', internal: 'in2' }) },
      { label: 'Pressure outside the vents (Kármán–Tsien below the critical Mach number)', lhs: 'p_X', eq: 'p_a+\\tfrac12\\gamma p_aM_\\infty^2C_{pX},\\ C_{pX}=\\frac{C_{pX0}}{\\beta+\\frac{C_{pX0}}{2}(1-\\beta)}', res: '\\text{along the trajectory}' },
      { label: 'Vent throat Mach number from the pressure ratio (choked at the sonic ratio)', lhs: 'M_T', eq: '\\sqrt{\\frac{2}{\\gamma-1}\\left[\\left(\\frac{p_C}{p_X}\\right)^{\\frac{\\gamma-1}{\\gamma}}-1\\right]}', res: '\\text{at each step}' },
      { label: 'Orifice coefficient (Busemann)', lhs: 'C_N', eq: '\\frac{C_{SON}}{1+\\sqrt{1-M_T^2}\\left(\\frac{C_{SON}}{C_{INC}}-1\\right)}', res: '\\text{at each step}' },
      { label: `Bay pressure, integrated by fourth-order Runge–Kutta (${o.hist.length - 1} steps)`, lhs: '\\frac{dp_C}{dt}', eq: '-\\gamma\\sqrt{\\gamma RT_0}\\,\\frac{A}{V}C_NM_T\\left[1+\\tfrac{\\gamma-1}{2}M_T^2\\right]^{-\\frac{\\gamma+1}{2(\\gamma-1)}}p_0^{-\\frac{\\gamma-1}{2\\gamma}}p_C^{\\frac{3\\gamma-1}{2\\gamma}}', res: '\\text{(outflow)}' },
      { label: `Largest difference, at ${n(w.t)} s (flight Mach number ${n(w.M)})`, lhs: '\\Delta p_{max}', eq: 'p_C-p_X', sub: `${R.v(w.pC, PRES)}-${R.v(w.pX, PRES)}`, res: R.Q(w.dp, PRES) },
    ];
    return [{
      title: 'Theory',
      text: 'The trapped air expands isentropically and flows through vents of total area $A$, subsonic or choked, with an empirical orifice coefficient. The pressure outside the vents is the atmospheric pressure plus $qC_{pX}$. Matching the bay’s mass loss to the vent mass flow gives a first-order equation for the bay pressure (Hoult), integrated along the trajectory; when the outside pressure is higher, air flows in and the sign changes.',
      steps,
    }];
  },
  references: ['payload-venting2', 'allowablediffpressure', 'door-failure'],
  examples: [
    { name: 'IREC rocket to 10 000 ft, one 1/8 in vent', values: { Vol: 0.227, N: 1, d: 0.1256, Cinc: 0.65, Csonic: 0.95, Cp0: -0.0343, Mcr: 0.9487, super: SUPER, ho: 1898, T0: 550, lat: 34, traj: TRAJ } },
    { name: 'Same, three 1/8 in vents', values: { Vol: 0.227, N: 3, d: 0.125, Cinc: 0.65, Csonic: 0.95, Cp0: -0.0343, Mcr: 0.9487, super: SUPER, ho: 1898, T0: 550, lat: 34, traj: TRAJ } },
    { name: 'Vent just behind a cone shoulder (Cp −0.08)', values: { Vol: 0.227, N: 3, d: 0.125, Cinc: 0.65, Csonic: 0.95, Cp0: -0.08, Mcr: 0.89, super: SUPER, ho: 1898, T0: 550, lat: 34, traj: TRAJ } },
  ],
};
