// Nose Pressure Distribution — UI definition.
import { nosePressure, karmanTsien, cpStar, criticalMach } from '../calc/nosepressure.js';
import { NOSE_TYPES, noseRadius } from '../calc/noseShapes.js';
import { s, fmt, InputError } from '../util.js';
import { text, path, dim } from '../ui/svg.js';

const LEN = { dim: 'length', internal: 'in' };
const RAD = Math.PI / 180;
const custom = (v) => v.noseType === 'custom', notCustom = (v) => !custom(v);
// a smoothly faired ogive-cylinder from the memo's nose study (station, radius in inches)
const FAIRED = [{ x: 0, r: 0 }, { x: 4, r: 1.2 }, { x: 8, r: 1.9 }, { x: 12, r: 2.4 }, { x: 16, r: 2.72 }, { x: 20, r: 2.9 }, { x: 24, r: 3 }, { x: 30, r: 3.06 }, { x: 36, r: 3.08 }, { x: 108, r: 3.08 }];

/** Body radius r(z): nose of the chosen shape then cylinder, or the custom table (linear between points). */
function bodyOf(v) {
  if (custom(v)) {
    const p = v.profile, L = p.at(-1).x, R = Math.max(...p.map((q) => q.r));
    const rBody = (z) => { if (z >= L) return p.at(-1).r; let i = 0; while (p[i + 1].x < z) i++; const a = p[i], b = p[i + 1]; return a.r + ((b.r - a.r) * (z - a.x)) / (b.x - a.x); };
    const noseL = (p.find((q) => q.r >= 0.995 * R) || p.at(-1)).x;
    return { rBody, L, R, noseL };
  }
  return { rBody: (z) => (z < v.noseL ? noseRadius(v.noseType, z, v.noseL, v.R, { k: v.k, n: v.pow }) : v.R), L: v.bodyLen, R: v.R, noseL: v.noseL };
}
function run(v, over = {}) {
  const w = { ...v, ...over }, b = bodyOf(w), dz = b.L / Math.min(500, Math.max(150, Math.round(b.L / (b.R / 8))));
  return { b, o: nosePressure({ ...b, M: w.M, CD: w.CD, CDb: w.CDb, eps: w.eps * RAD, dz }) };
}

export default {
  slug: 'nose-pressure',
  topic: 'nose-pressure-coefficient',
  title: 'Nose Pressure Distribution',
  subtitle: 'Surface <b>pressure along a nose and body</b> at subsonic speed: where it dips, how steeply it recovers, and when the flow first goes sonic.',
  intro: {
    what: 'Computes the pressure coefficient along a body of revolution at zero angle of attack by Munk’s line-source method, corrects it for compressibility, and gives the minimum pressure, the critical Mach number, the nose axial force and the steepest adverse pressure gradient.',
    why: 'Behind the nose shoulder the pressure rises again. That adverse gradient helps the boundary layer separate at angle of attack, shedding vortices that can lock the roll rate in. The minimum pressure also sets the critical Mach number and the loads on nose and payload doors.',
    when: 'Choosing or refining a nose shape, estimating internal and venting loads near the nose, or checking how close a design comes to sonic flow.',
  },
  info: {
    text: [
      'The body is represented by sources and sinks along its axis, each as strong as the local growth of the cross-section, $2\\pi Ur\\,dr/dz$. Their combined axial velocity gives the surface pressure.',
      'The flow speeds up round the shoulder, so the pressure dips there and rises again along the cylinder: an adverse gradient. A converging wake behind the base closes the body.',
      'The Kármán–Tsien rule scales the pressures for compressibility; the free-stream Mach number at which the lowest pressure becomes sonic is the critical Mach number.',
    ],
    tex: 'C_{p0}(z)=-\\int\\frac{(z-\\zeta)\\,r\\,\\frac{dr}{d\\zeta}}{\\left[(z-\\zeta)^2+r^2\\right]^{3/2}}\\,d\\zeta',
    steps: ['Choose a nose shape (or enter a profile) and the body length.', 'Enter the flight Mach number.', 'Enter the forebody and base drag coefficients for the wake.', 'Read the pressure distribution, the minimum and the critical Mach number.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'body', title: 'Body profile',
      fields: [
        { id: 'noseType', shared: 'noseType', label: 'Nose shape', kind: 'select', default: 'ogive', options: NOSE_TYPES, info: { text: 'Shape of the nose; its profile follows from the length and radius. Pick <b>Custom profile</b> to enter stations and radii.', doc: 'overview' } },
        { id: 'noseL', shared: 'noseL', label: 'Nose length', sym: 'L_n', ...LEN, default: 30, min: 0, minExclusive: true, when: notCustom, slider: { min: 4, max: 80, step: 0.5 }, info: { text: 'Length from the tip to the shoulder.', doc: 'overview' } },
        { id: 'R', shared: 'bodyR', label: 'Body radius', sym: 'R', ...LEN, default: 3.125, min: 0, minExclusive: true, when: notCustom, info: { doc: 'overview' } },
        { id: 'k', label: 'Parabolic parameter', sym: "K'", dim: 'none', default: 0.75, min: 0, max: 1, when: (v) => v.noseType === 'parabolic', info: { doc: 'overview' } },
        { id: 'pow', label: 'Power-series exponent', sym: 'n', dim: 'none', default: 0.5, min: 0, minExclusive: true, max: 1, when: (v) => v.noseType === 'power', info: { doc: 'overview' } },
        { id: 'bodyLen', shared: 'length', label: 'Overall length', sym: 'L', ...LEN, default: 108, min: 0, minExclusive: true, when: notCustom, info: { text: 'Tip-to-base length; behind the base the wake takes over.', doc: 'wake' } },
        { id: 'profile', label: 'Profile points (station, radius)', kind: 'table', minRows: 3, when: custom,
          columns: [{ id: 'x', label: 'Station', ...LEN }, { id: 'r', label: 'Radius', ...LEN }], default: FAIRED,
          validate: (rows) => {
            if (rows.some((r) => !Number.isFinite(r.x) || !Number.isFinite(r.r))) return 'Every cell needs a number.';
            if (rows[0].x !== 0) return 'The first point must be at station 0 (the nose tip).';
            for (let i = 1; i < rows.length; i++) if (rows[i].x <= rows[i - 1].x) return `Stations must increase (row ${i}).`;
            if (rows.some((r) => r.r < 0)) return 'Radii cannot be negative.';
            if (!(rows.at(-1).r > 0)) return 'The base radius must be positive.';
            return '';
          },
          info: { text: 'Body radius at each station from the tip (station 0) to the base; straight lines between points. End with the cylinder.', doc: 'overview' } },
      ],
    },
    {
      id: 'flow', title: 'Flow and wake',
      fields: [
        { id: 'M', label: 'Mach number', sym: 'M_\\infty', dim: 'none', default: 0, min: 0, max: 0.95, slider: { min: 0, max: 0.95, step: 0.01 },
          info: { text: 'Free-stream Mach number. The correction holds only below the critical Mach number.', doc: 'compress' } },
        { id: 'CD', label: 'Forebody drag coefficient (with base)', sym: 'C_D', dim: 'none', default: 0.3755, min: 0, minExclusive: true, max: 2, info: { text: 'Drag coefficient of the body including its base drag, on the body cross-section. Sets the wake diameter.', doc: 'wake' } },
        { id: 'CDb', label: 'Base drag coefficient', sym: 'C_{Db}', dim: 'none', default: 0.0813, min: 0, max: 0.9, info: { text: 'Base drag coefficient on the body cross-section.', doc: 'wake' } },
        { id: 'eps', label: 'Wake convergence half angle', sym: '\\varepsilon', dim: 'angle', default: 5.73, min: 0.5, max: 45, info: { text: 'Half angle of the conical wake behind the base.', range: 'About 0.1 rad (5.7°) for want of better data.', doc: 'wake' } },
      ],
    },
  ],
  results: [
    { id: 'cpMin', label: 'Minimum pressure coefficient', sym: 'C_{p,min}', dim: 'none', key: true, digits: 4,
      note: (x, out, v) => `at ${fmt(out.o.zMin / (2 * out.b.R), { digits: 3 })} diameters from the tip`,
      info: { text: 'Lowest pressure on the body: usually just behind the nose shoulder, where the flow speeds up round the corner.', doc: 'overview' } },
    { id: 'Mcr', label: 'Critical Mach number', sym: 'M_{cr}', dim: 'none', key: true, digits: 4, status: (x, out, v) => (v.M < x ? 'ok' : 'warn'),
      info: { text: 'Free-stream Mach number at which the flow at the minimum-pressure point first reaches the speed of sound.', tex: 'C_p(C_{p0,min},M_{cr})=C_p^*(M_{cr})', doc: 'compress' } },
    { id: 'grad', label: 'Steepest adverse pressure gradient', sym: '\\frac{dC_p}{d(z/d)}', dim: 'none', key: true, digits: 4,
      note: (x, out) => `at ${fmt(out.o.zGrad / (2 * out.b.R), { digits: 3 })} diameters`,
      info: { text: 'Largest rate at which the pressure rises again along the body, per body diameter. Smaller is better for keeping the boundary layer attached at angle of attack.', doc: 'gradient' } },
    { id: 'CA', label: 'Nose pressure axial-force coefficient', sym: 'C_{A,nose}', dim: 'none', key: true, digits: 4, note: (x) => (x < 0 ? 'net forward suction' : 'net rearward'),
      info: { text: 'Axial force of the pressures on the nose, on the body cross-section. It can be negative (a forward pull) in subsonic flow.', tex: 'C_A=\\frac{2}{R^2}\\int_0^{L_n}C_p\\,r\\frac{dr}{dz}\\,dz', doc: 'axial' } },
    { id: 'cp0Min', label: 'Minimum pressure coefficient, incompressible', sym: 'C_{p0,min}', dim: 'none', digits: 4, info: { doc: 'overview' } },
    { id: 'Dw', label: 'Cylindrical wake diameter', sym: 'D_w', ...LEN, digits: 4, info: { tex: 'D_w=D\\sqrt{\\frac{C_D}{2(1-\\sqrt{C_{Db}})}}', doc: 'wake' } },
  ],
  compute(v) {
    if (custom(v) && v.profile.length < 3) throw new InputError('Enter at least three profile points.');
    if (notCustom(v) && !(v.bodyLen > v.noseL)) throw new InputError('The overall length must be longer than the nose.');
    if (!(v.CDb < 1)) throw new InputError('The base drag coefficient must be below 1.');
    const { b, o } = run(v);
    const warnings = [];
    if (v.M >= o.Mcr) warnings.push({ level: 'warn', text: `The Mach number is above the critical Mach number ${fmt(o.Mcr, { digits: 3 })}: there is a pocket of supersonic flow and the Kármán–Tsien pressures are no longer valid.` });
    if (b.noseL < 2 * b.R) warnings.push({ level: 'warn', text: 'The nose is shorter than one body diameter. The slender-body source model assumes a gently sloping nose; for blunt shapes treat the results as rough.' });
    if (o.cp0[1] > 1 || b.rBody(1e-6) > 0.05 * b.R) warnings.push({ level: 'info', text: 'Near a blunt tip the slender-body source model is poor; trust the results from about one diameter aft of the tip.' });
    const results = { cpMin: o.cpMin, Mcr: o.Mcr, grad: o.grad, CA: o.CA, cp0Min: o.cp0Min, Dw: 2 * o.rw };
    return { results, warnings, o, b };
  },
  plots: [
    {
      id: 'cp', title: 'Pressure along the body',
      info: { text: 'Pressure coefficient along the body (solid) and the wake (dashed), incompressible and at the flight Mach number. The dip at the shoulder and the rise behind it (the adverse gradient) show at a glance.', doc: 'overview' },
      build(v, out, { U }) {
        const o = out.o, ul = U(LEN), body = [], wake = [], inc = [];
        for (let i = 1; i <= o.n; i++) { const z = ul.v(i * o.dz); (i <= o.iBase ? body : wake).push([z, o.cp[i]]); if (i <= o.iBase) inc.push([z, o.cp0[i]]); }
        if (wake.length && body.length) wake.unshift(body.at(-1));
        const series = [{ name: v.M > 0 ? `body, $M_\\infty=${fmt(v.M, { digits: 2 })}$` : 'body', points: body }, { name: 'wake', points: wake, dashed: true, color: 'var(--text-3)' }];
        if (v.M > 0) series.push({ name: 'incompressible', points: inc, dashed: true });
        return { x: { label: 'Station from the tip $z$', unit: ul.label }, y: { label: 'Pressure coefficient $C_p$' }, series,
          hlines: v.M > 0 ? [{ y: cpStar(v.M), label: 'sonic $C_p^*$', color: 'var(--red-text)' }] : [], markers: [{ x: ul.v(o.zMin), y: o.cpMin, label: 'minimum' }] };
      },
    },
    {
      id: 'mcr', title: 'Critical Mach number',
      info: { text: 'The minimum pressure coefficient rises in magnitude with Mach number (Kármán–Tsien), while the sonic pressure coefficient $C_p^*$ falls towards zero. Where the curves cross is the critical Mach number.', doc: 'compress' },
      build(v, out) {
        const a = [], b = [];
        for (let i = 0; i <= 100; i++) { const M = 0.3 + (0.69 * i) / 100, c = karmanTsien(out.o.cp0Min, M); if (c > -3) a.push([M, c]); b.push([M, cpStar(M)]); }
        return { x: { label: 'Free-stream Mach number $M_\\infty$' }, y: { label: 'Pressure coefficient' }, yDomain: [-1.5, 0], series: [{ name: '$C_{p,min}$', points: a, smooth: true }, { name: 'sonic $C_p^*$', points: b, smooth: true, dashed: true, color: 'var(--text-3)' }],
          markers: [{ x: out.o.Mcr, y: cpStar(out.o.Mcr), label: '$M_{cr}$' }] };
      },
    },
    {
      id: 'shapes', title: 'Other nose shapes of the same length', when: notCustom,
      info: { text: 'Incompressible pressure distribution for other standard nose shapes with your nose length and radius, near the shoulder. Blunter shoulders dip deeper and recover more steeply.', doc: 'gradient' },
      build(v, out, { U }) {
        if (custom(v)) return null;
        const ul = U(LEN), zTop = Math.min(v.bodyLen, v.noseL + 6 * v.R), series = [];
        for (const t of ['cone', 'ogive', 'vonkarman', 'ellipse']) {
          const { o } = run(v, { noseType: t, M: 0 }), pts = [];
          for (let i = 1; i <= o.iBase && i * o.dz <= zTop; i++) pts.push([ul.v(i * o.dz), o.cp0[i]]);
          series.push({ name: NOSE_TYPES.find((n) => n.value === t).label, points: pts, dashed: t !== v.noseType, color: t === v.noseType ? null : undefined });
        }
        return { x: { label: 'Station from the tip $z$', unit: ul.label }, y: { label: 'Incompressible $C_{p0}$' }, series };
      },
    },
  ],
  schematicTitle: 'Surface pressures on the body',
  schematicHint: 'Upper half of the body with the near wake (dashed), radius exaggerated. Arrows show the pressure: pointing out for suction (red), in for overpressure (grey). Drag the shoulder to change the nose length',
  schematic(ctx, v, out) {
    const W = 760, H = 300, o = out.o, b = out.b;
    const fr = ctx.frame({ width: W, height: H, label: 'Body profile with surface pressure arrows and the wake' });
    const g = fr.layer('main'); g.replaceChildren();
    const ul = ctx.U(LEN);
    // body and near wake; the radius is exaggerated so the shape and the arrows read clearly
    const zEnd = Math.min(o.n * o.dz, b.L + 6 * b.R), x0 = 30, k = 700 / zEnd, kr = Math.min(70 / b.R, Math.max(k, 3 * k)), ex = kr / k;
    const axis = 220, X = (z) => x0 + z * k, Y = (r) => axis - r * kr, nEnd = Math.min(o.n, Math.round(zEnd / o.dz));
    g.append(s('line', { x1: x0 - 10, x2: X(zEnd) + 10, y1: axis, y2: axis, class: 'sc-thin', 'stroke-dasharray': '10 4 2 4' }));
    const bodyPts = [], wakePts = [];
    for (let i = 0; i <= nEnd; i++) (i <= o.iBase ? bodyPts : wakePts).push([X(i * o.dz), Y(o.r[i])]);
    if (bodyPts.length) wakePts.unshift(bodyPts.at(-1));
    g.append(s('path', { d: path([...bodyPts, [X(b.L), axis], [x0, axis]], true), class: 'sc-body', 'data-field': 'noseType noseL R bodyLen profile' }));
    g.append(s('path', { d: path(wakePts), class: 'sc-thin', fill: 'none', 'stroke-dasharray': '5 3', 'data-field': 'CD CDb eps' }));
    // pressure arrows, radial: out for suction (red), in for overpressure (grey); the largest is 40 px
    const every = Math.max(1, Math.round(o.iBase / 70)), big = Math.max(1e-6, ...Array.from({ length: o.iBase }, (_, i) => Math.abs(o.cp[i + 1]))), sc = 40 / big;
    for (let i = every; i <= o.iBase; i += every) {
      const c = o.cp[i], L = Math.abs(c) * sc, px = X(i * o.dz), py = Y(o.r[i]);
      if (L < 2) continue;
      if (c < 0) g.append(s('line', { x1: px, y1: py - 1, x2: px, y2: py - 1 - L, stroke: 'var(--red)', 'stroke-width': 1.4, 'marker-end': fr.arrow('acc') }));
      else g.append(s('line', { x1: px, y1: py - 1 - L, x2: px, y2: py - 1, class: 'sc-thin', 'stroke-width': 1.4, 'marker-end': fr.arrow() }));
    }
    const zm = o.zMin;
    g.append(s('circle', { cx: X(zm), cy: Y(o.r[o.iMin]) - 2, r: 4, fill: 'var(--red)' }));
    g.append(text(X(zm), Y(b.R) - 50, `C_{p,min} = ${fmt(o.cpMin, { digits: 3 })}`, { anchor: 'middle', size: 11 }));
    g.append(dim(fr, x0, axis + 22, X(b.noseL), axis + 22, `L_n = ${fmt(ul.v(b.noseL), { digits: 3 })} ${ul.label}`, { textOff: 16, field: 'noseL' }));
    g.append(text(X(b.L) + 6, axis - 6, 'base', { size: 10, cls: 'sc-dim-text' }));
    g.append(text(X(zEnd), axis + 18, 'near wake', { anchor: 'end', size: 10, cls: 'sc-dim-text' }));
    g.append(text(20, H - 8, `radius drawn ×${fmt(ex, { digits: 2 })}; red arrows: suction (Cp < 0), grey: overpressure; arrow length ∝ |Cp|`, { size: 10, cls: 'sc-dim-text' }));
    if (notCustom(v)) ctx.handle('shoulder', X(v.noseL), Y(v.R), {
      field: 'noseL', title: 'Drag along the body to change the nose length',
      onDrag: (sx) => ctx.setValue('noseL', Math.min(v.bodyLen * 0.9, Math.max(v.R * 0.5, (sx - x0) / k)), { round: 0.5 }),
      onKey: (dx) => ctx.setValue('noseL', Math.min(v.bodyLen * 0.9, Math.max(v.R * 0.5, v.noseL + 0.5 * dx))),
    });
  },
  symbols: {
    'C_{p0}': 'incompressible pressure coefficient', C_p: 'pressure coefficient', 'C_p^*': 'sonic pressure coefficient', z: 'station from the nose tip', '\\zeta': 'station of a source', r: 'body radius',
    U: 'free-stream speed', 'M_\\infty': 'free-stream Mach number', 'M_{cr}': 'critical Mach number', '\\beta': 'compressibility factor', R: 'body radius', D: 'body diameter', D_w: 'cylindrical wake diameter',
    C_D: 'forebody drag coefficient', 'C_{Db}': 'base drag coefficient', '\\varepsilon': 'wake convergence half angle', 'C_A': 'nose axial-force coefficient', L_n: 'nose length', '\\gamma': 'ratio of specific heats',
    'C_{p0,min}': 'minimum incompressible pressure coefficient', 'C_{p,min}': 'minimum pressure coefficient',
  },
  constants: [{ sym: '\\gamma', desc: 'ratio of specific heats of air', si: [1.4, ''], us: [1.4, ''] }],
  report(v, out, R) {
    const o = out.o, n = R.n;
    const steps = [
      { label: 'Cylindrical wake diameter (impulse–momentum and Bernoulli)', lhs: 'D_w', eq: 'D\\sqrt{\\frac{C_D}{2(1-\\sqrt{C_{Db}})}}', sub: `${R.v(2 * out.b.R, LEN)}\\times\\sqrt{\\frac{${n(v.CD)}}{2(1-\\sqrt{${n(v.CDb)}})}}`, res: R.Q(2 * o.rw, LEN) },
      { label: `Incompressible pressure by line-source superposition, summed over ${o.n} stations; the minimum`, lhs: 'C_{p0,min}', eq: '-\\int\\frac{(z-\\zeta)\\,r\\,dr/d\\zeta}{[(z-\\zeta)^2+r^2]^{3/2}}d\\zeta', res: n(o.cp0Min) },
      { label: 'Compressible minimum (Kármán–Tsien)', lhs: 'C_{p,min}', eq: '\\frac{C_{p0,min}}{\\beta+\\frac{C_{p0,min}}{2}(1-\\beta)},\\ \\beta=\\sqrt{1-M_\\infty^2}', sub: `\\frac{${n(o.cp0Min)}}{${n(Math.sqrt(1 - v.M ** 2))}+\\frac{${n(o.cp0Min)}}{2}(1-${n(Math.sqrt(1 - v.M ** 2))})}`, res: n(o.cpMin) },
      { label: 'Critical Mach number, where the minimum pressure becomes sonic', lhs: 'M_{cr}', eq: '\\frac{C_{p0,min}}{\\beta+\\frac{C_{p0,min}}{2}(1-\\beta)}=\\frac{2}{\\gamma M_{cr}^2}\\left[\\left(\\frac{2+(\\gamma-1)M_{cr}^2}{\\gamma+1}\\right)^{\\frac{\\gamma}{\\gamma-1}}-1\\right]', res: n(o.Mcr) },
      { label: 'Axial force of the nose pressures, on the body cross-section', lhs: 'C_A', eq: '\\frac{2}{R^2}\\int_0^{L_n}C_p\\,r\\frac{dr}{dz}\\,dz', res: n(o.CA) },
    ];
    return [{
      title: 'Theory',
      text: 'Munk’s airship theory represents a slender body of revolution by sources of strength $2\\pi Ur\\,dr/dz$ along its axis. Their linearised axial velocity gives $C_{p0}=-2q_z/U$ on the surface; the body radius is sampled at equal stations and $r\\,dr/dz$ is taken from a parabola through three neighbours. A conical wake behind the base closes the body. Kármán–Tsien scales the result for compressibility (Hoult).',
      steps,
    }];
  },
  references: ['nose-pressure-distro4', 'aiaafelkel3', 'local-sonic-flow'],
  examples: [
    { name: 'Ogive-cylinder, 6.25 in body, 30 in nose', values: { noseType: 'ogive', noseL: 30, R: 3.125, bodyLen: 108, M: 0, CD: 0.3755, CDb: 0.0813, eps: 5.73 } },
    { name: 'Cone-cylinder (memo Figure 1), 36 in nose, 6 in body', values: { noseType: 'cone', noseL: 36, R: 3, bodyLen: 108, M: 0, CD: 0.3755, CDb: 0.0813, eps: 5.73 } },
    { name: 'Von Kármán nose at Mach 0.8', values: { noseType: 'vonkarman', noseL: 30, R: 3.125, bodyLen: 108, M: 0.8, CD: 0.3755, CDb: 0.0813, eps: 5.73 } },
    { name: 'Faired custom profile', values: { noseType: 'custom', profile: FAIRED, M: 0, CD: 0.3755, CDb: 0.0813, eps: 5.73 } },
  ],
};
