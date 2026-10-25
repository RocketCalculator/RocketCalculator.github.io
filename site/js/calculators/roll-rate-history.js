// Roll Rate History — UI definition.
import { rollRate, apogeeRatio } from '../calc/rollrate.js';
import { derivatives } from '../calc/cantAngle.js';
import { s, fmt, reducedMotion, InputError } from '../util.js';
import { text, finEndView } from '../ui/svg.js';
import { linePath } from '../ui/chart.js';

const LEN = { dim: 'length', internal: 'in' };
const DIST = { dim: 'distance', internal: 'ft' };
const ALT = { dim: 'altitude', internal: 'ft' };
const SPEED = { dim: 'speed', internal: 'fts' };
const DENS = { dim: 'density', internal: 'slugft3' };
const HZ = { dim: 'frequency', internal: 'hz' };
const WAVE = { dim: 'wavenumber', internal: 'perft' };
const RAD = Math.PI / 180, TAU = 2 * Math.PI;

/** Model inputs (ft, slug, s, rad) from the page values, with the strip-theory roll derivatives of the fin set. */
function model(v) {
  const der = derivatives({ R: v.R, b: v.b, cR: v.cR, cT: v.cT, cNa: v.cNa, N: v.N });
  return { der, p: { CLd: der.CLd, CLp: der.CLp, N: v.N, delta: v.delta * RAD, R: v.R / 12, I: v.Ixx, rho: v.rho, rhoA: v.rhoA, L: v.L, hB: v.hB, VB: v.VB } };
}

export default {
  slug: 'roll-rate-history',
  topic: 'roll-rate',
  title: 'Roll Rate History',
  subtitle: 'How fast canted fins <b>spin the rocket</b> from launcher exit to burnout, how many turns it makes, and what is left at apogee.',
  intro: {
    what: 'Follows the roll rate of a rocket with canted fins from the moment it leaves the launcher to burnout, counts the roll turns, and estimates the roll rate at apogee.',
    why: 'Spin averages out thrust and fin misalignments, but roll inertia makes the spin lag behind the fin setting, and the spin decays as the air thins. Payload cameras, sensors and parachute deployment all care about the roll rate near apogee.',
    when: 'Checking a fin cant setting, predicting the spin a payload will see, or making sure the roll rate at apogee is low enough for a clean recovery deployment.',
  },
  info: {
    text: [
      'Canted fins drive the roll; the fins also damp it. Without roll inertia the two balance at a fixed roll per distance flown — the roll wave number — so the roll rate would simply grow with speed.',
      'Roll inertia makes the spin lag behind that value, most strongly just after the launcher when the dynamic pressure is still low.',
      'After burnout the rocket slows, the driving and damping torques fade, and the spin is carried mostly by inertia to apogee.',
    ],
    tex: 'I_R\\frac{dp}{dt}=qSd\\left[C_{Lp}\\frac{pd}{2U}+C_{L\\delta}\\sum_i\\delta_i\\right]',
    steps: ['Enter the fin set and its cant angle.', 'Enter the roll moment of inertia.', 'Enter the launcher length, burnout height and speed, and the air densities.', 'Read the roll rate at burnout, the turns during boost and the roll rate at apogee.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'fins', title: 'Fin set',
      fields: [
        { id: 'R', shared: 'bodyR', label: 'Body radius', sym: 'R', ...LEN, default: 3.125, min: 0, minExclusive: true, info: { text: 'Radius of the body at the fins. The reference area is $\\pi R^2$ and the reference length $d=2R$.', doc: 'derivatives' } },
        { id: 'b', shared: { key: 'finSpan', get: (v) => v.b - v.R, set: (v, s) => { v.b = v.R + s; } }, label: 'Fin tip radius (from centre line)', sym: 'b', ...LEN, default: 5.5, min: 0, minExclusive: true,
          info: { text: 'Distance from the body centre line to the fin tip: body radius plus exposed span.', doc: 'derivatives' } },
        { id: 'cR', shared: 'finCr', label: 'Root chord', sym: 'c_R', ...LEN, default: 10, min: 0, minExclusive: true, info: { text: 'Fin chord at the body.', doc: 'derivatives' } },
        { id: 'cT', shared: 'finCt', label: 'Tip chord', sym: 'c_T', ...LEN, default: 2, min: 0, info: { text: 'Fin chord at the tip.', doc: 'derivatives' } },
        { id: 'N', backView: (v) => ({ R: v.R, span: v.b - v.R, nominal: { t: true }, unit: LEN, range: [3, 8], note: 'Driving and damping both scale with N: the steady roll wave number is the same for any N; how fast it is reached is not.' }), shared: 'finN', label: 'Number of fins', sym: 'N', dim: 'none', default: 4, min: 1, max: 12, info: { text: 'Number of identical fin panels, all at the same cant.', doc: 'derivatives' } },
        { id: 'cNa', label: 'Airfoil normal-force slope', sym: 'c_{N\\alpha}', dim: 'perAngle', internal: 'perrad', default: 3.5, min: 0, minExclusive: true,
          info: { text: 'Section lift-curve slope of a fin strip, per radian. About 2π for thin subsonic sections; a lower panel average allows for root and tip losses.', doc: 'derivatives' } },
        { id: 'delta', label: 'Cant angle (each fin)', sym: '\\delta', dim: 'angle', default: 0.2, min: -5, max: 5, slider: { min: 0, max: 1, step: 0.01 },
          info: { text: 'Angle between each fin chord and the body axis, all fins canted the same way. Positive spins the rocket one way, negative the other.', range: 'A few tenths of a degree is typical; 0.1° of misalignment alone gives a noticeable spin.', doc: 'boost' } },
      ],
    },
    {
      id: 'mass', title: 'Roll inertia',
      fields: [
        { id: 'Ixx', label: 'Roll moment of inertia', sym: 'I_R', dim: 'inertia', internal: 'slugft2', default: 0.22, min: 0, minExclusive: true,
          info: { text: 'Moment of inertia about the long axis. A representative boost value; it falls as propellant burns.', range: 'Roughly $\\tfrac12 m r^2$ of the motor and body shell; a few hundredths to a few tenths of a slug ft² for student rockets.', doc: 'lag' } },
      ],
    },
    {
      id: 'boost', title: 'Boost and coast',
      fields: [
        { id: 'L', label: 'Launcher length', sym: 'L', ...DIST, default: 18, min: 0, info: { text: 'Rail length. The rocket cannot roll until it leaves the launcher.', doc: 'boost' } },
        { id: 'hB', label: 'Burnout height above the launcher', sym: 'h_B', ...ALT, default: 2000, min: 0, minExclusive: true, info: { text: 'Height gained at burnout, from a trajectory simulation. The boost is modelled with constant acceleration.', doc: 'boost' } },
        { id: 'VB', label: 'Burnout speed', sym: 'V_B', ...SPEED, default: 1037.2, min: 0, minExclusive: true, info: { text: 'Flight speed at burnout.', doc: 'boost' } },
        { id: 'rho', label: 'Air density during boost', sym: '\\rho', ...DENS, default: 0.0023, min: 0, minExclusive: true, info: { text: 'Representative density over the boost (see Atmosphere & Gravity).', doc: 'boost' } },
        { id: 'rhoA', label: 'Air density at apogee', sym: '\\rho_A', ...DENS, default: 0.0019, min: 0, minExclusive: true, info: { text: 'Density at the apogee altitude. The coast analysis assumes apogee is in the troposphere.', doc: 'apogee' } },
      ],
    },
  ],
  results: [
    { id: 'fB', label: 'Roll rate at burnout', sym: 'p_B', ...HZ, key: true, digits: 4,
      note: (x, out) => `${fmt(x * 60, { digits: 4 })} rpm · without inertia ${fmt(out.o.pB0 / TAU, { digits: 3 })} Hz`,
      info: { text: 'Roll rate at burnout from integrating the roll equation from launcher exit, with roll inertia.', tex: 'I_R\\frac{dp}{dt}=qSd\\left[C_{Lp}\\frac{pd}{2U}+C_{L\\delta}N\\delta\\right]', doc: 'lag' } },
    { id: 'turns', label: 'Roll turns during boost', sym: '\\Delta\\phi/2\\pi', dim: 'none', key: true, digits: 4,
      note: () => 'from launcher exit to burnout',
      info: { text: 'Number of complete roll turns between leaving the launcher and burnout. Several turns average out body-fixed misalignments.', tex: '\\Delta\\phi=\\int p\\,dt', doc: 'boost' } },
    { id: 'fA', label: 'Roll rate at apogee', sym: 'p_A', ...HZ, key: true, digits: 4,
      note: (x, out) => `${fmt(x * 60, { digits: 4 })} rpm · ${fmt(out.o.pA / out.o.pB * 100, { digits: 3 })} % of burnout`,
      info: { text: 'Roll rate at apogee after a coast in which gravity removes the speed and the aerodynamic torques fade.', tex: 'p_A=p_Be^{-a}+\\lambda_{R0}V_B\\left[\\frac{\\sqrt\\pi\\,\\mathrm{erf}\\sqrt a}{2\\sqrt a}-e^{-a}\\right],\\ a=\\frac{GV_B^2}{2}', doc: 'apogee' } },
    { id: 'pitch', label: 'Distance per roll turn (no inertia)', sym: '2\\pi/\\lambda_{R0}', ...DIST, key: true, digits: 4,
      info: { text: 'Steady roll helix: the distance flown per roll turn once inertia no longer matters.', tex: '\\lambda_{R0}=-\\frac{2C_{L\\delta}N\\delta}{d\\,C_{Lp}}', doc: 'boost' } },
    { id: 'fB0', label: 'Roll rate at burnout without inertia', sym: '\\lambda_{R0}V_B', ...HZ, digits: 4, info: { tex: 'p=\\lambda_{R0}U', doc: 'boost' } },
    { id: 'fBapprox', label: 'Roll rate at burnout, closed-form estimate', sym: '\\frac{\\lambda_{R0}V_B}{1-J}', ...HZ, digits: 4, info: { text: 'The memo’s closed-form estimate; close to the integrated value while $|J|$ is below about 0.1.', tex: '\\frac{\\lambda_{R0}}{1-J}V_B,\\ J=\\frac{I_R}{2\\pi\\rho(h_B-L)R^4C_{Lp}}', doc: 'lag' } },
    { id: 'JB', label: 'Roll-lag parameter at burnout', sym: 'J', dim: 'none', digits: 4, info: { tex: 'J=\\frac{I_R}{2\\pi\\rho(h_B-L)R^4C_{Lp}}', doc: 'lag' } },
    { id: 'k', label: 'Roll-lag length', sym: 'k', ...DIST, digits: 4, info: { tex: 'k=\\frac{I_R}{2\\pi\\rho R^4C_{Lp}}', doc: 'lag' } },
    { id: 'lam0', label: 'Roll wave number', sym: '\\lambda_{R0}', ...WAVE, digits: 4, info: { doc: 'boost' } },
    { id: 'CLd', label: 'Roll-driving derivative (one fin)', sym: 'C_{L\\delta}', dim: 'perAngle', internal: 'perrad', digits: 4, info: { doc: 'derivatives' } },
    { id: 'CLp', label: 'Roll-damping derivative (all fins)', sym: 'C_{Lp}', dim: 'none', digits: 4, info: { doc: 'derivatives' } },
    { id: 'X', label: 'Apogee spin parameter', sym: 'GV_B^2', dim: 'none', digits: 4, info: { tex: 'G=-\\frac{\\rho_A S d^2C_{Lp}}{4gI_R}', doc: 'apogee' } },
    { id: 'tCoast', label: 'Coast time to apogee (no drag)', sym: 'V_B/g', dim: 'time', digits: 4, info: { doc: 'apogee' } },
  ],
  compute(v) {
    if (!(v.b > v.R)) throw new InputError('The fin tip radius must be larger than the body radius.');
    if (!(v.hB > v.L)) throw new InputError('The burnout height must be above the top of the launcher.');
    const { der, p } = model(v);
    const o = rollRate(p);
    const warnings = [];
    if (v.delta === 0) warnings.push({ level: 'info', text: 'With no cant the fins neither drive nor need to damp a roll: the rocket does not spin (apart from misalignments).' });
    if (Math.abs(o.JB) > 0.1) warnings.push({ level: 'info', text: `Roll inertia is important here ($|J|=${fmt(Math.abs(o.JB), { digits: 2 })}$ at burnout): the spin lags well behind the fin setting. The rates shown are integrated, not taken from the closed-form estimate.` });
    if (o.X > 12) warnings.push({ level: 'info', text: 'The spin decays strongly before apogee; the apogee value depends on the assumed apogee density.' });
    const results = { fB: o.pB / TAU, turns: o.phiB / TAU, fA: o.pA / TAU, pitch: TAU / Math.abs(o.lam0 || NaN), fB0: o.pB0 / TAU, fBapprox: o.pBapprox / TAU, JB: o.JB, k: o.k, lam0: o.lam0, CLd: der.CLd, CLp: der.CLp, X: o.X, tCoast: o.tCoast };
    if (!Number.isFinite(results.pitch)) results.pitch = 'no spin';
    return { results, warnings, o, der };
  },
  plots: [
    {
      id: 'rate', title: 'Roll rate during boost',
      info: { text: 'Roll rate from launcher exit to burnout. Without inertia it would grow in proportion to speed (grey); inertia makes it lag (red). The dashed red curve is the memo’s closed-form estimate.', doc: 'lag' },
      build(v, out, { U }) {
        const o = out.o, ua = U(ALT), hz = (p) => p / TAU;
        const pts = o.hist.map((r) => [ua.v(r.h), hz(r.p)]), ideal = o.hist.map((r) => [ua.v(r.h), hz(o.lam0 * r.U)]), approx = o.hist.map((r) => [ua.v(r.h), hz(o.lamAt(r.h) * r.U)]);
        return { x: { label: 'Height above the launcher $h$', unit: ua.label }, y: { label: 'Roll rate $p$', unit: '\\mathrm{Hz}' }, includeZero: true,
          series: [{ name: 'integrated', points: pts }, { name: 'closed-form estimate', points: approx, dashed: true }, { name: 'no inertia $\\lambda_{R0}U$', points: ideal, dashed: true, color: 'var(--text-3)' }],
          markers: [{ x: ua.v(v.hB), y: hz(o.pB), label: 'burnout' }] };
      },
    },
    {
      id: 'wave', title: 'Roll wave number during boost',
      info: { text: 'Roll per unit distance flown, against time after ignition. It starts at zero on the launcher and climbs towards the no-inertia value $\\lambda_{R0}$; the memo compares this curve with Prospector-18D flight data.', doc: 'lag' },
      build(v, out, { U }) {
        const o = out.o, uw = U(WAVE), t1 = o.hist.at(-1).t;
        const pts = [[0, 0], ...o.hist.map((r) => [r.t, uw.v(r.p / r.U)])];
        return { x: { label: 'Time after ignition $t$', unit: '\\mathrm{s}' }, y: { label: 'Roll wave number $\\lambda_R$', unit: uw.label }, includeZero: true,
          series: [{ name: '\\lambda_R', points: pts }, { name: '\\lambda_{R0}', points: [[0, uw.v(o.lam0)], [t1, uw.v(o.lam0)]], dashed: true, color: 'var(--text-3)' }],
          vlines: [{ x: o.t0, label: 'leaves launcher', color: 'var(--text-3)' }] };
      },
    },
    {
      id: 'turns', title: 'Roll turns during boost',
      info: { text: 'Accumulated roll turns against height. A whole number of turns by burnout best cancels body-fixed misalignments.', doc: 'boost' },
      build(v, out, { U }) {
        const o = out.o, ua = U(ALT);
        return { x: { label: 'Height above the launcher $h$', unit: ua.label }, y: { label: 'Roll turns $\\Delta\\phi/2\\pi$' }, includeZero: true,
          series: [{ name: 'integrated', points: o.hist.map((r) => [ua.v(r.h), r.phi / TAU]) }, { name: 'closed-form estimate', points: o.hist.map((r) => [ua.v(r.h), o.phiAt(r.h) / TAU]), dashed: true }],
          markers: [{ x: ua.v(v.hB), y: o.phiB / TAU, label: `${fmt(o.phiB / TAU, { digits: 3 })} turns` }] };
      },
    },
    {
      id: 'apogee', title: 'Apogee roll rate',
      info: { text: 'Ratio of the apogee roll rate to the burnout roll rate against the spin parameter $GV_B^2$, for a rocket that has reached its no-inertia rate by burnout. Heavier damping, faster burnout or lighter roll inertia mean more decay.', doc: 'apogee' },
      build(v, out) {
        const top = Math.max(6, 1.3 * out.o.X), pts = [];
        for (let i = 0; i <= 120; i++) { const X = (top * i) / 120; pts.push([X, apogeeRatio(X)]); }
        return { x: { label: 'Spin parameter $GV_B^2$' }, y: { label: '$p_A/p_B$' }, yDomain: [0, 1], series: [{ name: 'p_A/p_B', points: pts, smooth: true }],
          markers: [{ x: out.o.X, y: apogeeRatio(out.o.X), label: 'design' }] };
      },
    },
  ],
  schematicTitle: 'Spin from launcher to apogee',
  schematicHint: 'Left: the boost to scale, with the roll drawn as a helix (one wave per turn). Right: the rear view spins at the burnout roll rate, slowed down if needed; the cant is exaggerated',
  schematic(ctx, v, out) {
    const W = 760, H = 380, o = out.o;
    const fr = ctx.frame({ width: W, height: H, label: 'Roll history from launcher exit to apogee, and the spinning rear view' });
    const g = fr.layer('main'); g.replaceChildren();
    const ua = ctx.U(ALT), A = (h) => `${fmt(ua.v(h), { digits: 4 })} ${ua.label}`, hz = (p) => `${fmt(p / TAU, { digits: 3 })} Hz`;
    // boost column to scale in height: ground at y0, burnout at y1; helix x = cx + w sin φ(h)
    const cx = 150, y0 = 340, y1 = 96, Y = (h) => y0 - (h / v.hB) * (y0 - y1), w = 26;
    g.append(s('line', { x1: 40, x2: 300, y1: y0, y2: y0, class: 'sc-line' }));
    for (let x = 44; x < 300; x += 12) g.append(s('line', { x1: x, y1: y0, x2: x - 8, y2: y0 + 8, class: 'sc-thin', 'stroke-opacity': 0.5 }));
    g.append(s('line', { x1: cx, x2: cx, y1: y0, y2: Math.min(y0 - 6, Y(v.L)), stroke: 'var(--text-2)', 'stroke-width': 4, 'data-field': 'L' }));
    g.append(s('line', { x1: cx, x2: cx, y1: y0, y2: y1, class: 'sc-thin', 'stroke-dasharray': '10 4 2 4' }));
    const turns = o.phiB / TAU, many = Math.abs(turns) > 60;
    const pts = many ? [] : o.hist.map((r) => [cx + w * Math.sin(r.phi), Y(r.h)]);
    if (!many) g.append(s('path', { d: linePath(pts, false), fill: 'none', stroke: 'var(--red)', 'stroke-width': 1.6, 'data-field': 'delta Ixx' }));
    else g.append(s('rect', { x: cx - w, y: y1, width: 2 * w, height: y0 - y1, fill: 'var(--red)', 'fill-opacity': 0.15, 'data-field': 'delta Ixx' }));
    // coast to apogee (not to scale)
    g.append(s('path', { d: `M${cx},${y1 - 4}V40`, class: 'sc-thin', 'stroke-dasharray': '3 4', 'marker-end': fr.arrow() }));
    g.append(s('path', { d: `M${cx - 10},${y1 - 22}l20,-6M${cx - 10},${y1 - 16}l20,-6`, class: 'sc-thin' }));
    // callouts
    const call = (y, title, line, field) => {
      g.append(s('line', { x1: cx + w + 6, x2: 300, y1: y, y2: y, class: 'sc-thin', opacity: 0.5 }));
      g.append(text(306, y - 2, title, { size: 11, field }));
      g.append(text(306, y + 13, line, { size: 10.5, cls: 'sc-dim-text', field }));
    };
    call(36, 'apogee', `p_A = ${hz(o.pA)} · coast not to scale`, 'rhoA');
    call(y1, `burnout · ${A(v.hB)}`, `p_B = ${hz(o.pB)} · ${fmt(turns, { digits: 3 })} turns so far`, 'hB VB');
    call(Math.min(y0 - 22, Y(v.L)), `leaves launcher · ${A(v.L)}`, 'roll starts from zero', 'L');
    if (many) g.append(text(cx, (y0 + y1) / 2, 'too many turns to draw', { anchor: 'middle', size: 10, cls: 'sc-dim-text' }));
    // rear view at burnout, spinning (slowed to ≤ 0.5 rev/s on screen)
    const f = Math.abs(o.pB / TAU), slow = f > 0.5 ? Math.ceil(f / 0.5) : 1, rcx = 620, rcy = 200, size = 92;
    const spin = f > 1e-3 && !reducedMotion() ? { dur: slow / f, dir: v.delta >= 0 ? 1 : -1 } : null;
    const dd = Math.max(0.06, Math.min(0.5, Math.abs(v.delta * RAD) * 25)) * Math.sign(v.delta || 1);
    g.append(finEndView(rcx, rcy, size, { N: v.N, r: v.R, s: v.b, cant: dd, cR: v.cR, cT: v.cT, spin, field: 'N delta',
      caption: [`rear view at burnout · ${hz(o.pB)}`, slow > 1 ? `shown ${slow}× slower` : null, `\\delta = ${fmt(v.delta, { digits: 3 })}° (drawn ×25)`].filter(Boolean) }));
    g.append(text(20, H - 8, 'height to scale up to burnout; helix: one wave per roll turn (width not to scale)', { size: 10, cls: 'sc-dim-text' }));
  },
  symbols: {
    I_R: 'roll moment of inertia', p: 'roll rate', t: 'time', q: 'dynamic pressure', S: 'reference area', d: 'reference length (body diameter)', U: 'flight speed',
    'C_{Lp}': 'roll-damping derivative of all fins', 'C_{L\\delta}': 'roll-driving derivative of one fin', '\\delta': 'fin cant angle', '\\delta_i': 'cant angle of fin $i$', N: 'number of fins',
    '\\lambda_{R0}': 'roll wave number without inertia', '\\lambda_R': 'roll wave number', J: 'roll-lag parameter', k: 'roll-lag length', '\\rho': 'air density during boost', '\\rho_A': 'air density at apogee',
    R: 'body radius', h: 'height above the launcher base', h_B: 'burnout height', L: 'launcher length', V_B: 'burnout speed', p_B: 'roll rate at burnout', p_A: 'roll rate at apogee',
    G: 'apogee damping parameter', g: 'acceleration of gravity', a: 'half the apogee spin parameter', '\\phi': 'roll angle', '\\Delta\\phi': 'roll angle turned during boost',
  },
  constants: [{ sym: 'g', desc: 'acceleration of gravity', si: [9.80665, '\\mathrm{m\\,s^{-2}}'], us: [32.174, '\\mathrm{ft\\,s^{-2}}'] }],
  report(v, out, R) {
    const o = out.o, n = R.n, rate = (p) => `${n(p / TAU)}\\,\\mathrm{Hz}`;
    const steps = [
      { label: 'Roll derivatives of the fin set by strip theory (see the Fin Cant Angle calculator)', lhs: 'C_{L\\delta}', res: `${n(out.der.CLd)}\\,\\mathrm{rad^{-1}}` },
      { lhs: 'C_{Lp}', res: n(out.der.CLp) },
      { label: 'Roll wave number without roll inertia', lhs: '\\lambda_{R0}', eq: '-\\frac{2C_{L\\delta}N\\delta}{d\\,C_{Lp}}', sub: `-\\frac{2\\times${n(out.der.CLd)}\\times${v.N}\\times${n(v.delta * RAD)}}{${R.v((2 * v.R) / 12, DIST)}\\,${R.u(DIST)}\\times(${n(out.der.CLp)})}`, res: R.Q(o.lam0, WAVE) },
      { label: 'Roll-lag length and lag parameter at burnout', lhs: 'k', eq: '\\frac{I_R}{2\\pi\\rho R^4C_{Lp}}', res: R.Q(o.k, DIST) },
      { lhs: 'J', eq: '\\frac{k}{h_B-L}', sub: `\\frac{${R.v(o.k, DIST)}}{${R.v(v.hB, ALT)}-${R.v(v.L, DIST)}}`, res: n(o.JB) },
      { label: 'Roll rate at burnout from integrating the roll equation from launcher exit (constant acceleration, $U^2=2ah$)', lhs: 'p_B', eq: '\\int_{t_L}^{t_B}\\frac{qSd}{I_R}\\left[C_{Lp}\\frac{pd}{2U}+C_{L\\delta}N\\delta\\right]dt', res: rate(o.pB) },
      { label: 'For comparison, the closed-form estimate', lhs: '\\frac{\\lambda_{R0}V_B}{1-J}', sub: `\\frac{${R.v(o.lam0, WAVE)}\\times${R.v(v.VB, SPEED)}}{1-(${n(o.JB)})}`, res: rate(o.pBapprox) },
      { label: 'Roll turns during boost', lhs: '\\frac{\\Delta\\phi}{2\\pi}', eq: '\\frac{1}{2\\pi}\\int_{t_L}^{t_B}p\\,dt', res: n(o.phiB / TAU) },
      { label: 'Apogee damping parameter', lhs: 'G', eq: '-\\frac{\\rho_A S d^2C_{Lp}}{4gI_R}', res: `${n(R.us ? o.G : o.G / 0.3048 ** 2)}\\,${R.us ? '\\mathrm{s^{2}\\,ft^{-2}}' : '\\mathrm{s^{2}\\,m^{-2}}'}` },
      { lhs: 'a', eq: '\\frac{GV_B^2}{2}', res: n(o.X / 2) },
      { label: 'Roll rate at apogee (coast with $dV/dt=-g$)', lhs: 'p_A', eq: 'p_Be^{-a}+\\lambda_{R0}V_B\\left[\\frac{\\sqrt\\pi\\,\\mathrm{erf}\\sqrt a}{2\\sqrt a}-e^{-a}\\right]', sub: `${n(o.pB / TAU)}e^{-${n(o.X / 2)}}+${n(o.pB0 / TAU)}\\left[${n(o.ratio)}-e^{-${n(o.X / 2)}}\\right]`, res: rate(o.pA) },
    ];
    return [{
      title: 'Theory',
      text: 'For vertical flight at small angle of attack the roll equation is $I_R\\,dp/dt=qSd[C_{Lp}pd/2U+C_{L\\delta}\\sum\\delta_i]$. Neglecting inertia gives the roll wave number $\\lambda_{R0}=-2C_{L\\delta}\\sum\\delta_i/(dC_{Lp})$, so $p=\\lambda_{R0}U$. With inertia the rate lags; the boost is integrated with constant acceleration from launcher exit, and the memo’s estimate $\\lambda_{R0}/(1-J)$ is shown for comparison. After burnout, with $dV/dt\\approx-g$, the equation $dp/dV-GVp=-HV^2$ has the closed-form solution used for the apogee rate (Hoult).',
      steps,
    }];
  },
  references: ['boost-phase-roll-rate2', 'apogee-roll-rate', 'fin-setting-theory-3'],
  examples: [
    { name: 'Student rocket, 0.2° cant', values: { R: 3.125, b: 5.5, cR: 10, cT: 2, N: 4, cNa: 3.5, delta: 0.2, Ixx: 0.22, L: 18, hB: 2000, VB: 1037.2, rho: 0.0023, rhoA: 0.0019 } },
    { name: 'Light payload, high burnout', values: { R: 3.125, b: 5.5, cR: 10, cT: 2, N: 4, cNa: 3.5, delta: 0.2, Ixx: 0.05, L: 18, hB: 5000, VB: 1400, rho: 0.0021, rhoA: 0.0012 } },
    { name: 'Three fins, 0.5° cant', values: { R: 2, b: 4, cR: 8, cT: 3, N: 3, cNa: 3.5, delta: 0.5, Ixx: 0.06, L: 12, hB: 1500, VB: 800, rho: 0.0023, rhoA: 0.002 } },
  ],
};
