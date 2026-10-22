// Flight Path Angle Dispersions — UI definition.
import { dispersion } from '../calc/dispersion.js';
import { s, fmt, InputError } from '../util.js';
import { text, path } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const G = 32.174;
const ALT = { dim: 'altitude', internal: 'ft' };
const DIST = { dim: 'distance', internal: 'ft' };
const LEN = { dim: 'length', internal: 'ft' };
const ANG = { dim: 'angle', internal: 'rad' };
const WAVE = { dim: 'wavenumber', internal: 'perft' };
const NONE = { dim: 'none' };
const A = (x) => `${fmt(toDisplay(x, ANG), { digits: 3 })}${unitLabel(displayUnit(ANG))}`;

/** Calc parameters from the form values (boost acceleration a = T/m − g, drag neglected). */
const P = (v) => ({ ...v, g: G, a: v.T / v.m - G });

export default {
  slug: 'flight-path-dispersion',
  topic: 'dispersion',
  title: 'Flight Path Angle Dispersions',
  subtitle: 'How <b>thrust misalignment</b> and <b>wind gusts</b> tilt a rolling rocket’s velocity vector during boost, as an equivalent launcher angle error.',
  intro: {
    what: 'Gives the one-sigma tilt of the velocity vector at burnout caused by thrust misalignment and gusts, and the launcher elevation (or azimuth) error that would produce the same tilt.',
    why: 'Sounding rockets fly nearly vertically, so their impact point errors come mainly from rotations of the velocity vector. Feeding the equivalent launcher error into a point-mass trajectory run turns it into an impact dispersion for recovery planning and range safety.',
    when: 'Choosing the spin rate and fin size, comparing launcher lengths, and preparing the dispersion inputs of a trajectory simulation.',
  },
  info: {
    text: [
      'Thrust misalignment holds the rocket at a small steady angle of attack. The resulting lift turns the velocity vector, mostly at low speed just off the rail.',
      'Roll spins that lift around, so the turn partly cancels: rolling a whole number of turns during boost (best: one) gives the least dispersion.',
      'Gusts add a planar part. The two are combined as independent errors and mapped back to the launcher angle that would give the same burnout tilt.',
    ],
    tex: '\\gamma_0=\\sqrt{\\gamma_D^2+\\gamma_G^2}\\,\\left(\\frac{h_b}{L}\\right)^{-g/2a}',
    steps: ['Enter the rocket mass, inertia, thrust and aerodynamics.', 'Enter the misalignment and gust statistics (one sigma).', 'Enter the roll wavelength, pitch wave number, launcher length and burnout altitude.', 'Use the equivalent launcher angle as the per-axis launcher error of a trajectory run.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'rocket', title: 'Rocket during boost',
      fields: [
        { id: 'm', label: 'Mass', sym: 'm', dim: 'mass', internal: 'slug', default: 1.95, min: 1e-6, info: { text: 'Average mass during boost.', doc: 'thrust' } },
        { id: 'I', label: 'Pitch moment of inertia', sym: 'I_p', dim: 'inertia', internal: 'slugft2', default: 12.235, min: 1e-9, info: { doc: 'thrust' } },
        { id: 'T', label: 'Thrust', sym: 'T', dim: 'force', internal: 'lbf', default: 550, min: 1e-9,
          info: { text: 'Average boost thrust. The acceleration along the path is taken as a = T/m − g (drag neglected), and it must exceed g/2.', doc: 'thrust' } },
        { id: 'S', label: 'Reference area', sym: 'S', dim: 'area', internal: 'ft2', default: 0.19635, min: 1e-9, info: { doc: 'thrust' } },
        { id: 'CLa', label: 'Lift-curve slope', sym: 'C_{L\\alpha}', dim: 'perAngle', internal: 'perrad', default: 6.56325, min: 1e-6, info: { text: 'Normal-force (lift) coefficient slope of the whole rocket.', doc: 'thrust' } },
        { id: 'rho', label: 'Air density (launch site)', sym: '\\rho', dim: 'density', internal: 'slugft3', default: 0.002378, min: 1e-9, info: { doc: 'thrust' } },
      ],
    },
    {
      id: 'errors', title: 'Perturbations (one sigma, per axis)',
      fields: [
        { id: 'arm', label: 'Nozzle throat to centre of mass', sym: '\\ell', ...LEN, default: 4.2, min: 0, info: { text: 'Moment arm of a misaligned thrust vector.', doc: 'thrust' } },
        { id: 'dT', label: 'Thrust misalignment angle', sym: '\\delta_T', ...ANG, default: 0.002, min: 0, max: 0.1, slider: { min: 0, max: 0.006, step: 0.0001 },
          info: { text: 'One component of the angle between the thrust vector and the rocket axis, at the one-sigma level.', range: 'Typically 0.05–0.3° for fixed-nozzle solid motors.', doc: 'thrust' } },
        { id: 'Om', label: 'Thrust offset from the centre of mass', sym: '\\Omega', ...LEN, default: 0.015, min: 0, info: { text: 'One component of the lateral offset of the centre of mass from the thrust line (one sigma).', doc: 'thrust' } },
        { id: 'sG', label: 'Gust speed (planar, one sigma)', sym: '\\sigma_G', dim: 'speed', internal: 'fts', default: 3.3, min: 0, info: { text: 'Standard deviation of one horizontal component of the gust velocity near the ground.', doc: 'gust' } },
        { id: 'lG', label: 'Gust correlation wave number', sym: '\\lambda_G', ...WAVE, default: 0.0016949, min: 1e-9,
          info: { text: 'Pseudo correlation wave number of the gust field (about 1 / correlation length).', range: 'Ammons & Hoult suggest about 1/590 ft.', doc: 'gust' } },
      ],
    },
    {
      id: 'flight', title: 'Spin and launch',
      fields: [
        { id: 'rollWave', label: 'Roll wavelength', sym: '\\Lambda_R', ...DIST, default: 1000, min: 1e-6,
          info: { text: 'Altitude climbed per roll revolution (2π / roll wave number). About 1000 ft is near optimum over a broad range of pitch wave numbers.', doc: 'roll' } },
        { id: 'lP', label: 'Pitch wave number', sym: '\\lambda_P', ...WAVE, default: 0.022, min: 1e-9,
          info: { text: 'Static stability per unit path length, λ_P² = ρSC_{Lα}·(static margin)/(2I_p). More static margin cuts dispersion sharply near roll resonance.', doc: 'thrust' } },
        { id: 'L', label: 'Launcher length', sym: 'L', ...DIST, default: 40, min: 1e-6, info: { text: 'Effective rail length: the altitude at which the rocket is released.', doc: 'thrust' } },
        { id: 'hb', label: 'Burnout altitude', sym: 'h_b', ...ALT, default: 2000, min: 1e-6, info: { text: 'Where the dispersion is evaluated: nearly all of it has built up by burnout.', doc: 'launcher' } },
      ],
    },
  ],
  results: [
    { id: 'g0', label: 'Equivalent launcher angle error', sym: '\\gamma_0', ...ANG, key: true, digits: 3, note: () => 'one sigma, per axis (elevation and azimuth)',
      info: { text: 'The launcher angle error that, without any perturbation, gives the same velocity tilt at burnout. Use it as the per-axis launcher error in a point-mass trajectory run.', tex: '\\gamma_0=\\gamma\\,(h_b/L)^{-g/2a}', doc: 'launcher' } },
    { id: 'gam', label: 'Velocity tilt at burnout', sym: '\\gamma', ...ANG, key: true, digits: 3, note: (x, out) => `${fmt(100 * out.o.gD ** 2 / Math.max(x * x, 1e-300), { digits: 2 })}% of the variance from thrust misalignment`,
      info: { tex: '\\gamma=\\sqrt{\\gamma_D^2+\\gamma_G^2}', doc: 'launcher' } },
    { id: 'gD', label: 'Thrust misalignment part', sym: '\\gamma_D', ...ANG, key: true, digits: 3, note: (x, out) => `without roll it would be ${A(out.o.gT)}`,
      info: { text: 'Dispersive flight path angle: the turn by the misalignment lift, summed as north and east components while the rocket rolls.', tex: '\\gamma_D=\\sqrt{E^2+N^2}', doc: 'roll' } },
    { id: 'gG', label: 'Gust part', sym: '\\gamma_G', ...ANG, key: true, digits: 3, info: { tex: '\\gamma_G=K\\left[\\frac{h_b}{L}-\\left(\\frac{h_b}{L}\\right)^{g/2a}\\right]', doc: 'gust' } },
    { id: 'LA', label: 'Misalignment lift force', sym: 'L_A', dim: 'force', internal: 'lbf', digits: 4, info: { tex: 'L_A=\\frac{\\rho SC_{L\\alpha}T\\sqrt{\\ell^2\\delta_T^2+\\Omega^2}}{2I_p(\\lambda_P^2-\\lambda_R^2)}', doc: 'thrust' } },
    { id: 'alphaG', label: 'Gust angle of attack (one sigma)', sym: '\\alpha_G', ...ANG, digits: 3, info: { doc: 'gust' } },
    { id: 'a', label: 'Boost acceleration', sym: 'a', dim: 'accel', internal: 'fts2', digits: 4, note: (x) => `${fmt(x / G, { digits: 3 })} g`, info: { tex: 'a=T/m-g', doc: 'thrust' } },
    { id: 'n', label: 'Exponent g/2a', sym: 'g/2a', ...NONE, digits: 3, info: { text: 'Small values mean the velocity vector stops turning soon after the rail.', doc: 'thrust' } },
  ],
  compute(v) {
    for (const k of ['m', 'I', 'T', 'S', 'CLa', 'rho', 'lG', 'rollWave', 'lP', 'L', 'hb']) if (!(v[k] > 0)) throw new InputError('Mass, inertia, thrust, area, lift slope, density, wave numbers, wavelength and altitudes must be positive.');
    if (!(v.hb > v.L)) throw new InputError('The burnout altitude must be above the end of the launcher.');
    const p = P(v), lR = (2 * Math.PI) / v.rollWave;
    if (!(p.a > G / 2)) throw new InputError('Thrust must exceed 1.5 × weight (boost acceleration above g/2) for this model.');
    if (!(lR < v.lP)) throw new InputError('The roll wave number 2π/Λ_R must be below the pitch wave number: at or above it the rocket rolls through pitch resonance (roll lock-in) and no steady state exists. Lengthen the roll wavelength or add static margin.');
    const o = dispersion(p), warnings = [];
    if (lR > 0.7 * v.lP) warnings.push({ level: 'warn', text: `The roll wave number is ${fmt((100 * lR) / v.lP, { digits: 2 })}% of the pitch wave number: near resonance the misalignment lift grows as 1/(λ_P² − λ_R²). Spin slower or add static margin.` });
    if (o.n > 0.25) warnings.push({ level: 'info', text: 'Low acceleration (g/2a above 0.25): gravity keeps turning the trajectory long after the rail, so the burnout values depend strongly on the burnout altitude.' });
    return { results: { g0: o.g0, gam: o.gam, gD: o.gD, gG: o.gG, LA: o.LA, alphaG: o.alphaG, a: p.a, n: o.n }, warnings, o, v };
  },
  plots: [
    {
      id: 'history', title: 'Velocity tilt during boost',
      info: { text: 'Flight path angle dispersion (one sigma) against altitude, if burnout came there. The equivalent launcher angle is the curve to read at burnout.', doc: 'launcher' },
      build(v, out, { U }) {
        const ua = U(ALT), ug = U(ANG), H = out.o.hist, ser = (k) => H.map((r) => [ua.v(r.h), ug.v(r[k])]);
        return { x: { label: 'Altitude $h$', unit: ua.label }, y: { label: 'Angle (one sigma)', unit: ug.label }, includeZero: true,
          series: [
            { name: 'equivalent launcher γ₀', points: ser('g0'), smooth: true, width: 2.4 },
            { name: 'total γ', points: ser('gam'), smooth: true },
            { name: 'thrust misalignment γ_D', points: ser('gD'), smooth: true, dashed: true },
            { name: 'gusts γ_G', points: ser('gG'), smooth: true, dashed: true },
          ] };
      },
    },
    {
      id: 'hodograph', title: 'Velocity tilt seen from above',
      info: { text: 'Path of the velocity-vector tilt from the misalignment lift in east (E) and north (N) components, as the roll spins the lift around (memo Fig. 2). Its distance from the origin is γ_D.', doc: 'roll' },
      build(v, out, { U }) {
        const ug = U(ANG), H = out.o.hist, end = H[H.length - 1];
        return { x: { label: 'East component $E$', unit: ug.label }, y: { label: 'North component $N$', unit: ug.label }, includeZero: true,
          series: [{ name: 'E, N', points: H.map((r) => [ug.v(r.E), ug.v(r.N)]), smooth: true }],
          markers: [{ x: ug.v(end.E), y: ug.v(end.N), label: 'burnout' }] };
      },
    },
    {
      id: 'roll', title: 'Effect of roll wavelength',
      info: { text: 'Equivalent launcher angle against burnout altitude / roll wavelength (memo Fig. 3). Whole numbers of roll cycles during boost cancel the misalignment turn best; a single cycle is usually the minimum.', doc: 'roll' },
      build(v, out, { U }) {
        const ug = U(ANG), p = P(v), pts = [];
        for (let i = 0; i <= 60; i++) {
          const x = 0.05 + (2.95 * i) / 60, rollWave = v.hb / x;
          if ((2 * Math.PI) / rollWave < 0.95 * v.lP) pts.push([x, ug.v(dispersion({ ...p, rollWave }).g0)]);
        }
        if (pts.length < 2) return null;
        return { x: { label: 'Burnout altitude / roll wavelength $h_b/\\Lambda_R$', unit: '' }, y: { label: 'Equivalent launcher angle $\\gamma_0$', unit: ug.label }, includeZero: true,
          series: [{ name: '\\gamma_0', points: pts, smooth: true }], markers: [{ x: v.hb / v.rollWave, y: ug.v(out.results.g0), label: 'design' }] };
      },
    },
    {
      id: 'pitch', title: 'Effect of static margin',
      info: { text: 'Equivalent launcher angle against pitch wave number. Close to the roll wave number the misalignment lift soars; a little more static margin moves the design past the knee.', doc: 'thrust' },
      build(v, out, { U }) {
        const ug = U(ANG), uw = U(WAVE), p = P(v), lR = (2 * Math.PI) / v.rollWave, lo = 1.3 * lR, hi = Math.max(3 * v.lP, 4 * lR), pts = [];
        for (let i = 0; i <= 60; i++) { const lP = lo + ((hi - lo) * i) / 60; pts.push([uw.v(lP), ug.v(dispersion({ ...p, lP }).g0)]); }
        return { x: { label: 'Pitch wave number $\\lambda_P$', unit: uw.label }, y: { label: 'Equivalent launcher angle $\\gamma_0$', unit: ug.label }, includeZero: true,
          series: [{ name: '\\gamma_0', points: pts, smooth: true }], vlines: [{ x: uw.v(lR), label: 'λ_R', color: 'var(--text-3)' }],
          markers: [{ x: uw.v(v.lP), y: ug.v(out.results.g0), label: 'design' }] };
      },
    },
  ],
  schematicTitle: 'Leaving the rail, and the tilt seen from above',
  schematicHint: 'Left: the rocket leaves the rail with a misaligned thrust and is turned by the lift and gusts (angles exaggerated). Right: the tip of the velocity tilt spirals as the rocket rolls; the dashed circle is the one-sigma total tilt at burnout',
  schematic(ctx, v, out) {
    const W = 760, H = 340, o = out.o;
    const fr = ctx.frame({ width: W, height: H, label: 'Rocket leaving the launcher, and the velocity tilt seen from above' });
    const g = fr.layer('main'); g.replaceChildren();
    // left: side view
    const gy = 308, rx = 150, rTop = 224;
    g.append(s('line', { x1: 20, y1: gy, x2: 330, y2: gy, class: 'sc-thin' }));
    for (let x = 26; x < 330; x += 12) g.append(s('line', { x1: x, y1: gy, x2: x - 7, y2: gy + 7, class: 'sc-thin' }));
    g.append(s('rect', { x: rx - 3, y: rTop, width: 6, height: gy - rTop, class: 'sc-body-2', 'data-field': 'L' }));
    g.append(text(rx - 10, (gy + rTop) / 2, `L = ${fmt(toDisplay(v.L, DIST), { digits: 3 })} ${unitLabel(displayUnit(DIST))}`, { anchor: 'end', size: 10.5, field: 'L' }));
    // trajectory: vertical along the rail, then curving off (exaggerated)
    const tilt = 14 * Math.PI / 180, traj = [];
    for (let i = 0; i <= 30; i++) { const t = i / 30, h = 200 * t; traj.push([rx + 6 + 200 * Math.sin(tilt) * t ** 1.6, rTop - h]); }
    g.append(s('path', { d: path(traj), class: 'sc-thin', 'stroke-dasharray': '5 4' }));
    // rocket just off the rail, axis at the misalignment angle of attack (exaggerated)
    const cx = rx + 18, cy = rTop - 80, ax = -tilt * 0.7 * 180 / Math.PI, len = 96, r = 9;
    const rk = s('g', { transform: `rotate(${-ax} ${cx} ${cy})`, 'data-field': 'm I T S CLa' });
    rk.append(s('path', { d: `M${cx},${cy - len / 2}Q${cx + r},${cy - len / 2 + 14} ${cx + r},${cy - len / 2 + 26}V${cy + len / 2}H${cx - r}V${cy - len / 2 + 26}Q${cx - r},${cy - len / 2 + 14} ${cx},${cy - len / 2}Z`, class: 'sc-body' }));
    rk.append(s('path', { d: `M${cx + r},${cy + len / 2 - 22}L${cx + r + 12},${cy + len / 2 + 2}H${cx + r}ZM${cx - r},${cy + len / 2 - 22}L${cx - r - 12},${cy + len / 2 + 2}H${cx - r}Z`, class: 'sc-body-2' }));
    // misaligned thrust at the nozzle
    rk.append(s('line', { x1: cx, y1: cy + len / 2 + 4, x2: cx - 8, y2: cy + len / 2 + 34, class: 'sc-accent', 'marker-start': fr.arrow('acc'), 'data-field': 'dT Om arm' }));
    rk.append(s('line', { x1: cx, y1: cy + len / 2, x2: cx, y2: cy + len / 2 + 34, class: 'sc-axis' }));
    g.append(rk);
    g.append(text(cx + 22, cy + len / 2 + 26, `δ_T = ${A(v.dT)}`, { size: 10.5, field: 'dT' }));
    // velocity vector and its tilt γ from the vertical
    const vx = cx + 18, vy = cy - 64, vl = 58;
    g.append(s('line', { x1: vx, y1: vy, x2: vx, y2: vy - vl - 6, class: 'sc-axis' }));
    g.append(s('line', { x1: vx, y1: vy, x2: vx + vl * Math.sin(tilt), y2: vy - vl * Math.cos(tilt), class: 'sc-accent2', 'marker-end': fr.arrow() }));
    g.append(s('path', { d: `M${vx},${vy - 40}A40,40 0 0 1 ${vx + 40 * Math.sin(tilt)},${vy - 40 * Math.cos(tilt)}`, class: 'sc-thin' }));
    g.append(text(vx + 26, vy - 26, `γ = ${A(out.results.gam)}`, { size: 11 }));
    // gusts
    for (const yy of [cy - 18, cy + 8]) g.append(s('line', { x1: 250, y1: yy, x2: 214, y2: yy, class: 'sc-thin', 'marker-end': fr.arrow(), 'data-field': 'sG' }));
    g.append(text(254, cy - 2, `σ_G = ${fmt(toDisplay(v.sG, { dim: 'speed', internal: 'fts' }), { digits: 3 })} ${unitLabel(displayUnit({ dim: 'speed' }))}`, { size: 10.5, field: 'sG' }));
    g.append(text(20, H - 8, 'side view · angles exaggerated', { size: 10, cls: 'sc-dim-text' }));
    // right: top view of the tilt (E, N)
    const ox = 560, oy = 165, R = 120, Hs = o.hist, ext = Math.max(o.gam, ...Hs.map((q) => Math.hypot(q.E, q.N))) || 1, k = (0.92 * R) / ext;
    g.append(s('line', { x1: ox - R - 10, y1: oy, x2: ox + R + 10, y2: oy, class: 'sc-thin', 'marker-end': fr.arrow() }));
    g.append(s('line', { x1: ox, y1: oy + R + 10, x2: ox, y2: oy - R - 10, class: 'sc-thin', 'marker-end': fr.arrow() }));
    g.append(text(ox + R + 14, oy + 4, 'E', { size: 12 })); g.append(text(ox - 4, oy - R - 16, 'N', { size: 12 }));
    g.append(s('circle', { cx: ox, cy: oy, r: o.gam * k, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.3, 'stroke-dasharray': '6 4' }));
    g.append(text(ox + o.gam * k * 0.71 + 6, oy + o.gam * k * 0.71 + 14, `1σ total γ = ${A(o.gam)}`, { size: 10.5 }));
    g.append(s('path', { d: path(Hs.map((q) => [ox + q.E * k, oy - q.N * k])), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2, 'data-field': 'rollWave' }));
    g.append(s('line', { x1: ox, y1: oy, x2: ox + o.E * k, y2: oy - o.N * k, class: 'sc-accent', 'marker-end': fr.arrow('acc') }));
    const th = Math.atan2(o.N, o.E), mx = ox + (o.E * k) / 2 - 14 * Math.sin(th), my = oy - (o.N * k) / 2 - 14 * Math.cos(th);
    g.append(text(mx, my + 4, `γ_D = ${A(o.gD)}`, { size: 11, anchor: Math.sin(th) >= 0 ? 'end' : 'start' }));
    g.append(text(ox, H - 8, `top view · ${fmt(v.hb / v.rollWave, { digits: 3 })} roll cycles to burnout`, { anchor: 'middle', size: 10, cls: 'sc-dim-text' }));
  },
  symbols: {
    a: 'boost acceleration along the path', T: 'thrust', m: 'rocket mass', g: 'acceleration due to gravity', n: 'exponent $g/2a$', '\\lambda_R': 'roll wave number', '\\Lambda_R': 'roll wavelength',
    L_A: 'lift from the steady misalignment angle of attack', '\\rho': 'air density', S: 'reference area', 'C_{L\\alpha}': 'lift-curve slope', '\\ell': 'nozzle throat to centre of mass', '\\delta_T': 'thrust misalignment angle',
    '\\Omega': 'thrust offset from the centre of mass', I_p: 'pitch moment of inertia', '\\lambda_P': 'pitch wave number', '\\gamma_T': 'flight path angle from the misalignment lift without roll', h_b: 'burnout altitude', h: 'altitude', L: 'launcher length',
    '\\gamma_D': 'dispersive flight path angle (thrust misalignment)', E: 'east component of the flight path angle', N: 'north component of the flight path angle', '\\phi': 'roll angle',
    '\\alpha_G': 'gust angle of attack (one sigma)', '\\sigma_G': 'planar gust speed (one sigma)', '\\lambda_G': 'gust correlation wave number', K: 'gust response factor', '\\gamma_G': 'gust flight path angle (one sigma)',
    '\\gamma': 'flight path angle at burnout (one sigma)', '\\gamma_0': 'equivalent launcher angle error', 'g/2a': 'exponent',
  },
  report(v, out, R) {
    const o = out.o, p = P(v), n = R.n, Ang = (x) => R.Q(x, ANG), Wv = (x) => R.v(x, WAVE);
    const steps = [
      { label: 'Boost acceleration (drag neglected) and the exponent', lhs: 'a', eq: 'T/m-g', res: R.Q(p.a, { dim: 'accel', internal: 'fts2' }) },
      { lhs: 'n', eq: 'g/(2a)', res: n(o.n) },
      { label: 'Roll wave number', lhs: '\\lambda_R', eq: '2\\pi/\\Lambda_R', sub: `2\\pi/${R.v(v.rollWave, DIST)}`, res: R.Q(o.lR, WAVE) },
      { label: 'Lift from the steady misalignment angle of attack (eq. 2)', lhs: 'L_A', eq: '\\frac{\\rho\\,S\\,C_{L\\alpha}\\,T\\sqrt{\\ell^2\\delta_T^2+\\Omega^2}}{2I_p(\\lambda_P^2-\\lambda_R^2)}',
        sub: `\\frac{${R.v(v.rho, { dim: 'density', internal: 'slugft3' })}\\times${R.v(v.S, { dim: 'area', internal: 'ft2' })}\\times${n(v.CLa)}\\times${R.v(v.T, { dim: 'force', internal: 'lbf' })}\\times${R.v(Math.hypot(v.arm * v.dT, v.Om), LEN)}}{2\\times${R.v(v.I, { dim: 'inertia', internal: 'slugft2' })}\\,(${Wv(v.lP)}^2-${Wv(o.lR)}^2)}`, res: R.Q(o.LA, { dim: 'force', internal: 'lbf' }) },
      { label: 'Flight path angle it would cause without roll (eq. 4)', lhs: '\\gamma_T', eq: '\\frac{L_A}{m\\,g}\\left[\\left(\\frac{h_b}{L}\\right)^n-1\\right]', res: Ang(o.gT) },
      { label: 'With roll angle φ = λ_R(h − L), the turn summed as east and north components (eqs. 5, 6)', lhs: '\\gamma_D', eq: '\\sqrt{E^2+N^2},\\ \\ E=\\int\\cos\\phi\\,d\\gamma_T,\\ N=\\int\\sin\\phi\\,d\\gamma_T', res: Ang(o.gD) },
      { label: 'Gust angle of attack and response factor (eqs. 15, 7)', lhs: '\\alpha_G', eq: '\\sigma_G\\,\\lambda_P\\sqrt{\\frac{\\lambda_G}{2a(\\lambda_P^2+\\lambda_G^2)}}', res: Ang(o.alphaG) },
      { lhs: 'K', eq: '\\frac{\\rho\\,S\\,L\\,C_{L\\alpha}\\,a\\,\\alpha_G}{m(2a-g)}', res: n(o.K) },
      { lhs: '\\gamma_G', eq: 'K\\left[\\frac{h_b}{L}-\\left(\\frac{h_b}{L}\\right)^n\\right]', res: Ang(o.gG) },
      { label: 'Independent errors combined (eq. 8)', lhs: '\\gamma', eq: '\\sqrt{\\gamma_D^2+\\gamma_G^2}', res: Ang(o.gam) },
      { label: 'Equivalent launcher angle (eq. 10)', lhs: '\\gamma_0', eq: '\\gamma\\,(h_b/L)^{-n}', sub: `${R.v(o.gam, ANG)}\\times(${R.v(v.hb, ALT)}/${R.v(v.L, DIST)})^{-${n(o.n)}}`, res: Ang(o.g0) },
    ];
    return [{
      title: 'Theory',
      text: 'Thrust misalignment holds a steady angle of attack whose lift $L_A$ turns the velocity vector: $h\\,d\\gamma_T/dh=(g/2a)\\gamma_T+L_A/(2ma)$ with $\\gamma_T(L)=0$. Roll spins the lift around, so the turn is resolved into east and north components and summed in altitude steps; gusts add a planar standard deviation. Without lift, a launcher error $\\gamma_0$ grows as $\\gamma_0(h/L)^{g/2a}$, which maps the burnout tilt back to the launcher (Hoult).',
      steps,
    }];
  },
  references: ['flt-path-angl-dispersions', 'thrust-misalignment', 'standardized-perturbation-values-orig', 'theory-behind-dispersion'],
  examples: [{ name: 'DISPERSION field-tool rocket (550 lbf, 1000 ft roll wavelength)', values: { m: 1.95, I: 12.235, T: 550, S: 0.19635, CLa: 6.56325, rho: 0.002378, arm: 4.2, dT: 0.002, Om: 0.015, sG: 3.3, lG: 0.0016949, rollWave: 1000, lP: 0.022, L: 40, hb: 2000 } }],
};
