// Pitch-Yaw Wave Number — UI definition.
import { pitchWave, cmAlpha, rodInertia } from '../calc/pitchwave.js';
import { atmosphere } from '../calc/geophysics.js';
import { s, fmt, InputError } from '../util.js';
import { dim, text, pointMarker, path } from '../ui/svg.js';

const LEN = { dim: 'length', internal: 'in' };
const IN = 0.0254, SLUGFT3 = 515.378818;
const INERTIA = { dim: 'inertia', internal: 'kgm2' };
const MASS = { dim: 'mass', internal: 'kg' };
const DENS = { dim: 'density', internal: 'kgm3' };
const SPEED = { dim: 'speed', internal: 'ms' };
const DIST = { dim: 'distance', internal: 'm' };
const ALT = { dim: 'altitude', internal: 'ft' };
const PERRAD = { dim: 'perAngle', internal: 'perrad' };
const ONE = { dim: 'none' };
const byMargin = (v) => v.cmMode === 'margin', direct = (v) => v.cmMode === 'direct';
const measured = (v) => v.iMode === 'measured', rod = (v) => v.iMode === 'rod';

/** The values the model uses, in SI, from the page inputs. */
function inputs(v) {
  const d = 2 * v.R * IN, l = v.Lr * IN;
  return { d, l, I: v.iMode === 'rod' ? rodInertia(v.m, l) : v.I, Cma: v.cmMode === 'margin' ? cmAlpha(v.CNa, v.SM) : v.Cma, rho: v.rho, U: v.U };
}

/** Rocket side view: ogive nose, body, fins; nose at x, pointing right; returns the outline path. */
function rocketPath(x, cy, Lp, r) {
  const ln = Math.min(Lp * 0.22, 5 * r), lf = Math.min(Lp * 0.16, 3.2 * r), fs = 1.6 * r;
  const xn = x + Lp, xb = x;
  return `M${xn},${cy}Q${xn - ln * 0.55},${cy - r} ${xn - ln},${cy - r}H${xb}V${cy + r}H${xn - ln}Q${xn - ln * 0.55},${cy + r} ${xn},${cy}Z` +
    `M${xb},${cy - r}L${xb - 0.15 * lf},${cy - r - fs}L${xb + 0.35 * lf},${cy - r - fs}L${xb + lf},${cy - r}Z` +
    `M${xb},${cy + r}L${xb - 0.15 * lf},${cy + r + fs}L${xb + 0.35 * lf},${cy + r + fs}L${xb + lf},${cy + r}Z`;
}

export default {
  slug: 'pitch-yaw-wavenumber',
  topic: 'pitch-yaw-wavenumber',
  title: 'Pitch-Yaw Wave Number',
  subtitle: 'How far a stable rocket flies during one <b>pitch or yaw oscillation</b> — the single number that sets its short-period motion.',
  intro: {
    what: 'Gives the pitch/yaw wavelength and wave number of a statically stable rocket, and the natural frequency and period of its weathercock oscillation at a chosen airspeed.',
    why: 'The wavelength sets how quickly a rocket turns into the wind off the launcher, how it responds to thrust misalignment and gusts, and whether its roll rate can lock in with its pitch motion.',
    when: 'Checking a new design’s stability, comparing launcher length with the wavelength, or choosing a roll rate that stays clear of the pitch frequency.',
  },
  info: {
    text: [
      'A statically stable rocket that is disturbed swings about its centre of gravity like a weathervane. The restoring moment grows with the dynamic pressure, so the swing gets faster as the rocket speeds up.',
      'In one swing, though, the rocket always covers the same distance through the air: the pitch/yaw wavelength. It depends only on the inertia, the air density and the pitching-moment slope — not on speed.',
      'Its reciprocal measure, the wave number, is the spatial frequency of the motion in radians per metre or foot.',
    ],
    tex: 'L=2\\pi\\sqrt{\\frac{2I}{-\\rho S d\\,C_{M\\alpha}}},\\qquad \\lambda_p=\\frac{2\\pi}{L}',
    steps: ['Enter the body radius and length.', 'Give the pitching-moment slope, or the normal-force slope and the static margin.', 'Give the pitch moment of inertia, or estimate it from mass and length.', 'Read the wavelength; the frequency follows for any airspeed.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'body', title: 'Rocket',
      fields: [
        { id: 'R', shared: 'bodyR', label: 'Body radius', sym: 'R', ...LEN, default: 3.07, min: 0, minExclusive: true,
          info: { text: 'Radius of the body tube. The reference area is $S=\\pi d^2/4$ and the reference length is the diameter $d=2R$.', doc: 'model' } },
        { id: 'Lr', shared: 'length', label: 'Overall length', sym: '\\ell', ...LEN, default: 148, min: 0, minExclusive: true,
          info: { text: 'Tip-to-base length. Used for the wavelength in body lengths and for the inertia estimate.', doc: 'scaling' } },
      ],
    },
    {
      id: 'aero', title: 'Static stability',
      fields: [
        { id: 'cmMode', label: 'Pitching-moment slope from', kind: 'select', default: 'margin',
          options: [{ value: 'margin', label: 'Static margin' }, { value: 'direct', label: 'Direct value' }],
          info: { text: 'The pitching-moment slope about the CG is $C_{M\\alpha}=-C_{N\\alpha}\\,(X_{CP}-X_{CG})/d$: the normal-force slope times the static margin in calibres.', doc: 'model' } },
        { id: 'CNa', label: 'Normal-force slope', sym: 'C_{N\\alpha}', ...PERRAD, default: 10, min: 0, minExclusive: true, when: byMargin, slider: { min: 2, max: 30, step: 0.1 },
          info: { text: 'Slope of the normal-force coefficient with angle of attack, per radian, referred to the body cross-section area. The Subsonic Centre of Pressure calculator gives it.', range: 'About 8–15 per radian for a typical three- or four-finned sounding rocket at low Mach number.', doc: 'model' } },
        { id: 'SM', label: 'Static margin', sym: '\\frac{X_{CP}-X_{CG}}{d}', ...ONE, default: 2, min: 0, minExclusive: true, when: byMargin, slider: { min: 0.2, max: 6, step: 0.05 },
          info: { text: 'Distance from the centre of gravity back to the centre of pressure, in body diameters (calibres).', range: '1.5–2.5 calibres is the usual design range; much more makes the rocket weathercock strongly into the wind.', doc: 'model' } },
        { id: 'Cma', label: 'Pitching-moment slope', sym: 'C_{M\\alpha}', ...PERRAD, default: -20, max: 0, maxExclusive: true, when: direct,
          info: { text: 'Slope of the pitching-moment coefficient about the CG with angle of attack, per radian, referred to $S$ and $d$. Negative for a stable rocket.', doc: 'model' } },
      ],
    },
    {
      id: 'mass', title: 'Pitch inertia',
      fields: [
        { id: 'iMode', label: 'Pitch moment of inertia', kind: 'select', default: 'rod',
          options: [{ value: 'rod', label: 'From mass and length' }, { value: 'measured', label: 'Measured value' }],
          info: { text: 'The estimate treats the rocket as a uniform slender rod, $I=m\\ell^2/12$. Real rockets concentrate mass at the motor and nose, so measure it when you can (the Bifilar Pendulum calculator).', doc: 'model' } },
        { id: 'm', label: 'Mass', sym: 'm', ...MASS, default: 25, min: 0, minExclusive: true, when: rod,
          info: { text: 'Mass at the moment of interest: loaded for launch, empty for coast.', doc: 'model' } },
        { id: 'I', label: 'Pitch moment of inertia', sym: 'I', ...INERTIA, default: 29.4, min: 0, minExclusive: true, when: measured,
          info: { text: 'Moment of inertia about a transverse axis through the centre of gravity.', doc: 'model' } },
      ],
    },
    {
      id: 'flight', title: 'Flight condition',
      fields: [
        { id: 'rho', label: 'Air density', sym: '\\rho', ...DENS, default: 1.225, min: 0, minExclusive: true,
          info: { text: 'Density of the air at the altitude of interest. The Atmosphere & Gravity calculator gives it for any altitude.', range: '1.225 kg m⁻³ at sea level in the standard atmosphere; about 1.0 at 2 km.', doc: 'model' } },
        { id: 'U', label: 'Airspeed', sym: 'U', ...SPEED, default: 200, min: 0, minExclusive: true,
          info: { text: 'Speed through the air. Only the frequency and the period depend on it; the wavelength does not.', doc: 'frequency' } },
      ],
    },
  ],
  results: [
    { id: 'L', label: 'Pitch/yaw wavelength', sym: 'L', ...DIST, key: true, digits: 4,
      note: (x, out) => `${fmt(out.o.Lrel, { digits: 3 })} rocket lengths`,
      info: { text: 'Distance the rocket travels through the air during one complete pitch or yaw oscillation.', tex: 'L=2\\pi\\sqrt{\\frac{2I}{-\\rho S d\\,C_{M\\alpha}}}', doc: 'model' } },
    { id: 'lam', label: 'Wave number', sym: '\\lambda_p', dim: 'wavenumber', internal: 'perm', key: true, digits: 4,
      note: () => 'radians per unit length',
      info: { tex: '\\lambda_p=\\sqrt{\\frac{-\\rho S d\\,C_{M\\alpha}}{2I}}=\\frac{2\\pi}{L}', doc: 'model' } },
    { id: 'f', label: 'Pitch natural frequency', sym: 'f_N', dim: 'frequency', key: true, digits: 4,
      note: (x, out) => `at this airspeed · period ${fmt(out.o.P, { digits: 3 })} s`,
      info: { text: 'Natural frequency of the weathercock oscillation at the chosen airspeed, in cycles per second. It grows in proportion to the airspeed.', tex: 'f_N=\\frac{\\omega_N}{2\\pi}=\\frac{U}{L}', doc: 'frequency' } },
    { id: 'Lrel', label: 'Wavelength in body lengths', sym: 'L/\\ell', ...ONE, key: true, digits: 4,
      info: { text: 'Wavelength divided by the overall length. It is the same for geometrically similar rockets of any size.', doc: 'scaling' } },
    { id: 'omega', label: 'Pitch natural circular frequency', sym: '\\omega_N', dim: 'rate', digits: 4, info: { tex: '\\omega_N^2=\\frac{-\\rho S d\\,U^2C_{M\\alpha}}{2I}', doc: 'frequency' } },
    { id: 'P', label: 'Pitch period', sym: 'P', dim: 'time', digits: 4, info: { tex: 'P=\\frac{2\\pi}{\\omega_N}=\\frac{L}{U}', doc: 'frequency' } },
    { id: 'Cma', label: 'Pitching-moment slope used', sym: 'C_{M\\alpha}', ...PERRAD, digits: 4, info: { tex: 'C_{M\\alpha}=-C_{N\\alpha}\\frac{X_{CP}-X_{CG}}{d}', doc: 'model' } },
    { id: 'I', label: 'Pitch moment of inertia used', sym: 'I', ...INERTIA, digits: 4, info: { tex: 'I=\\frac{m\\ell^2}{12}\\ \\text{(estimate)}', doc: 'model' } },
    { id: 'S', label: 'Reference area', sym: 'S', dim: 'area', internal: 'm2', digits: 4, info: { tex: 'S=\\frac{\\pi d^2}{4}', doc: 'model' } },
    { id: 'q', label: 'Dynamic pressure', sym: 'q', dim: 'pressure', digits: 4, info: { tex: 'q=\\tfrac12\\rho U^2', doc: 'frequency' } },
  ],
  compute(v) {
    const p = inputs(v);
    if (!(p.Cma < 0)) throw new InputError('The pitching-moment slope must be negative: a rocket with no static margin does not oscillate, it tumbles.');
    const o = pitchWave(p);
    const warnings = [];
    if (v.cmMode === 'margin' && v.SM < 1) warnings.push({ level: 'warn', text: 'A static margin below one calibre leaves little room for CG shifts and CP movement at higher Mach numbers. Aim for 1.5–2.5 calibres.' });
    if (o.Lrel < 15) warnings.push({ level: 'info', text: `The wavelength is only ${fmt(o.Lrel, { digits: 2 })} rocket lengths, a very stiff rocket: it will weathercock strongly into crosswinds. Check that the static margin is not excessive.` });
    const results = { L: o.L, lam: o.lam, f: o.f, Lrel: o.Lrel, omega: o.omega, P: o.P, Cma: p.Cma, I: p.I, S: o.S, q: o.q };
    return { results, warnings, o, p };
  },
  plots: [
    {
      id: 'margin', title: 'Wavelength vs static margin',
      info: { text: 'Wavelength against the static margin for the same rocket. More margin makes a stiffer rocket with a shorter wavelength, falling as the inverse square root of the margin.', doc: 'model' },
      build(v, out, { U }) {
        const p = out.p, ud = U(DIST), CNa = v.cmMode === 'margin' ? v.CNa : -p.Cma / 2, pts = [];
        for (let i = 0; i <= 100; i++) { const SM = 0.5 + (5.5 * i) / 100; pts.push([SM, ud.v(pitchWave({ ...p, Cma: cmAlpha(CNa, SM) }).L)]); }
        const SM0 = -p.Cma / CNa;
        return { x: { label: 'Static margin (calibres)' }, y: { label: 'Wavelength $L$', unit: ud.label }, includeZero: true, series: [{ name: 'L', points: pts, smooth: true }],
          markers: [{ x: SM0, y: ud.v(out.o.L), label: 'design' }] };
      },
    },
    {
      id: 'altitude', title: 'Wavelength vs altitude',
      info: { text: 'Wavelength in the standard atmosphere (sea-level launch site, 15 °C) as the air thins with altitude. It grows as the inverse square root of density, so a coasting rocket weathercocks more and more slowly.', doc: 'model' },
      build(v, out, { U }) {
        const p = out.p, ud = U(DIST), ua = U(ALT), pts = [];
        for (let i = 0; i <= 80; i++) { const h = (100000 * i) / 80, rho = atmosphere({ h, ho: 0, To: 518.67, phi: 45 }).rho * SLUGFT3; pts.push([ua.v(h), ud.v(pitchWave({ ...p, rho }).L)]); }
        return { x: { label: 'Altitude', unit: ua.label }, y: { label: 'Wavelength $L$', unit: ud.label }, includeZero: true, series: [{ name: 'L', points: pts, smooth: true }] };
      },
    },
    {
      id: 'speed', title: 'Pitch frequency vs airspeed',
      info: { text: 'Natural frequency of the oscillation against airspeed: it grows in proportion, $f_N=U/L$. A spinning rocket whose roll rate approaches this frequency can lock in.', doc: 'frequency' },
      build(v, out, { U }) {
        const us = U(SPEED), top = Math.max(2 * v.U, 100), pts = [];
        for (let i = 0; i <= 40; i++) { const u = (top * i) / 40; pts.push([us.v(u), u / out.o.L]); }
        return { x: { label: 'Airspeed $U$', unit: us.label }, y: { label: 'Frequency $f_N$', unit: '\\mathrm{Hz}' }, includeZero: true, series: [{ name: 'f_N', points: pts }],
          markers: [{ x: us.v(v.U), y: out.o.f, label: 'design' }] };
      },
    },
  ],
  schematicTitle: 'One pitch wavelength',
  schematicHint: 'Top: the rocket’s nose swings up and down once while it flies one wavelength (angles exaggerated). Bottom: the rocket to scale with its CG and CP; drag the CP to change the static margin',
  schematic(ctx, v, out) {
    const W = 760, H = 410, o = out.o;
    const fr = ctx.frame({ width: W, height: H, label: 'Pitch oscillation over one wavelength, and the rocket with its CG and CP' });
    const g = fr.layer('main'); g.replaceChildren();
    const ud = ctx.U(DIST), ul = ctx.U(LEN);
    // top: one wavelength, attitude α = α̂ sin(2πx/L), drawn exaggerated with small rockets
    const x0 = 50, x1 = 668, yc = 92, A = 34, amax = 14 * Math.PI / 180;
    g.append(s('line', { x1: x0 - 20, x2: x1 + 30, y1: yc, y2: yc, class: 'sc-thin', 'stroke-dasharray': '10 4 2 4' }));
    const wave = []; for (let i = 0; i <= 120; i++) { const t = i / 120; wave.push([x0 + t * (x1 - x0), yc - A * Math.sin(2 * Math.PI * t)]); }
    g.append(s('path', { d: path(wave), class: 'sc-thin', fill: 'none', 'stroke-dasharray': '2 3', 'data-field': 'SM CNa Cma m I rho' }));
    g.append(text(x0 + (x1 - x0) * 0.25, yc - A - 8, 'angle of attack \\alpha', { anchor: 'middle', size: 10, cls: 'sc-dim-text' }));
    for (let k = 0; k <= 4; k++) {
      // the flight path stays level; only the attitude swings
      const t = k / 4, x = x0 + t * (x1 - x0), att = amax * Math.sin(2 * Math.PI * t), y = yc;
      const r = 5, Lp = 64;
      const gr = s('g', { transform: `rotate(${(-att * 180) / Math.PI} ${x} ${y}) translate(${-Lp / 2} 0)` });
      gr.append(s('path', { d: rocketPath(x, y, Lp, r), class: k === 0 ? 'sc-body' : 'sc-body-2' }));
      g.append(gr);
      g.append(text(x, yc + 32, k === 1 ? 'nose up' : k === 3 ? 'nose down' : 'level', { anchor: 'middle', size: 10, cls: 'sc-dim-text' }));
    }
    g.append(s('path', { d: `M${x1 + 44},${yc}h30`, class: 'sc-accent', 'marker-end': fr.arrow('acc') }));
    g.append(text(x1 + 59, yc - 8, 'U', { anchor: 'middle', size: 11 }));
    g.append(dim(fr, x0, yc + 46, x1, yc + 46, `L = ${fmt(ud.v(o.L), { digits: 4 })} ${ud.label} · ${fmt(o.Lrel, { digits: 3 })} rocket lengths`, { textOff: 16, field: 'SM CNa Cma m I rho' }));
    g.append(text(x0, 22, `one oscillation takes P = ${fmt(o.P, { digits: 3 })} s at U = ${fmt(ctx.U(SPEED).v(v.U), { digits: 4 })} ${ctx.U(SPEED).label}; angles exaggerated, rockets not to the scale of L`, { size: 10.5, cls: 'sc-dim-text' }));
    // bottom: the rocket to scale with CG and CP (CG shown at 60 % of the length from the nose)
    const lp = 560, k = lp / v.Lr, rr = Math.max(3, v.R * k), yr = 278, xb = 80;
    g.append(s('path', { d: rocketPath(xb, yr, lp, rr), class: 'sc-body', 'data-field': 'R Lr' }));
    const xcg = xb + 0.4 * lp;
    const sm = v.cmMode === 'margin' ? v.SM : null, xcp = sm != null ? Math.max(xb + 4, xcg - sm * 2 * v.R * k) : null;
    g.append(pointMarker(xcg, yr, 'CG', { kind: 'cg', field: 'm I' }));
    if (xcp != null) {
      g.append(pointMarker(xcp, yr, 'CP', { kind: 'cp', field: 'SM' }));
      g.append(dim(fr, xcp, yr + rr + 34, xcg, yr + rr + 34, `${fmt(v.SM, { digits: 3 })} calibres`, { textOff: 16, field: 'SM' }));
    }
    g.append(dim(fr, xb, yr + rr + 62, xb + lp, yr + rr + 62, `\\ell = ${fmt(ul.v(v.Lr), { digits: 4 })} ${ul.label}`, { textOff: 16, field: 'Lr' }));
    g.append(dim(fr, xb + lp + 22, yr + rr, xb + lp + 22, yr - rr, null, { field: 'R' }));
    g.append(text(xb + lp + 30, yr + 4, `d = ${fmt(ul.v(2 * v.R), { digits: 4 })} ${ul.label}`, { size: 11, field: 'R' }));
    // pivot arrow: the rocket swings about its CG
    g.append(s('path', { d: `M${xcg + 70},${yr - rr - 26} A90,90 0 0 1 ${xcg + 70},${yr + rr + 26}`, class: 'sc-thin', fill: 'none', 'marker-start': fr.arrow(), 'marker-end': fr.arrow(), opacity: 0.7 }));
    g.append(text(20, H - 8, 'bottom: to scale; CG drawn at 60 % of the length from the nose, CP behind it by the static margin', { size: 10, cls: 'sc-dim-text' }));
    if (xcp != null) ctx.handle('cp', xcp, yr, {
      field: 'SM', title: 'Drag to change the static margin',
      onDrag: (sx) => ctx.setValue('SM', Math.max(0.05, (xcg - sx) / (2 * v.R * k)), { round: 0.05 }),
      onKey: (dx) => ctx.setValue('SM', Math.max(0.05, v.SM - 0.05 * dx), { round: 0.05 }),
    });
  },
  symbols: {
    I: 'pitch moment of inertia about the CG', L: 'pitch/yaw wavelength', '\\ell': 'overall length of the rocket', t: 'time', '\\rho': 'air density',
    S: 'reference area (body cross section)', d: 'reference length (body diameter)', U: 'airspeed', 'C_{M\\alpha}': 'slope of the pitching-moment coefficient',
    '\\alpha': 'angle of attack', '\\omega_N': 'pitch natural circular frequency', P: 'pitch period', '\\lambda_p': 'pitch/yaw wave number', f_N: 'pitch natural frequency',
    'C_{N\\alpha}': 'slope of the normal-force coefficient', X_CP: 'centre-of-pressure station', X_CG: 'centre-of-gravity station', 'X_{CP}': 'centre-of-pressure station', 'X_{CG}': 'centre-of-gravity station',
    m: 'mass of the rocket', R: 'body radius', q: 'dynamic pressure',
  },
  report(v, out, R) {
    const o = out.o, p = out.p, n = R.n, Q = R.Q;
    const steps = [];
    steps.push({ label: 'Reference length and area', lhs: 'd', eq: '2R', sub: `2\\times${R.v(v.R, LEN)}`, res: Q(2 * v.R, LEN) });
    steps.push({ lhs: 'S', eq: '\\frac{\\pi d^2}{4}', sub: `\\frac{\\pi\\times(${R.v(p.d, DIST)})^2}{4}`, res: `${n(R.raw(o.S, { dim: 'area', internal: 'm2' }))}\\,${R.u({ dim: 'area' })}` });
    if (v.cmMode === 'margin') steps.push({ label: 'Pitching-moment slope about the CG', lhs: 'C_{M\\alpha}', eq: '-C_{N\\alpha}\\frac{X_{CP}-X_{CG}}{d}', sub: `-${n(v.CNa)}\\times${n(v.SM)}`, res: `${n(p.Cma)}\\,\\mathrm{rad^{-1}}` });
    if (v.iMode === 'rod') steps.push({ label: 'Pitch inertia estimated as a uniform slender rod', lhs: 'I', eq: '\\frac{m\\ell^2}{12}', sub: `\\frac{${R.v(v.m, MASS)}\\times(${R.v(p.l, DIST)})^2}{12}`, res: Q(p.I, INERTIA) });
    // substitute in consistent base units: m, kg (SI) or ft, slug (US)
    const [lu, mu] = R.us ? [0.3048, 14.5939029] : [1, 1];
    const bI = p.I / (mu * lu * lu), bRho = (p.rho * lu ** 3) / mu, bS = o.S / (lu * lu), bd = p.d / lu;
    steps.push({ label: `Pitch/yaw wavelength (substituted in ${R.us ? 'ft and slug' : 'm and kg'})`, lhs: 'L', eq: '2\\pi\\sqrt{\\frac{2I}{-\\rho S d\\,C_{M\\alpha}}}',
      sub: `2\\pi\\sqrt{\\frac{2\\times${n(bI)}}{${n(bRho)}\\times${n(bS)}\\times${n(bd)}\\times${n(-p.Cma)}}}`, res: Q(o.L, DIST) });
    steps.push({ label: 'Wave number', lhs: '\\lambda_p', eq: '\\frac{2\\pi}{L}', sub: `\\frac{2\\pi}{${R.v(o.L, DIST)}}`, res: `${n(R.raw(o.lam, { dim: 'wavenumber', internal: 'perm' }))}\\,${R.u({ dim: 'wavenumber' })}` });
    steps.push({ label: 'Natural frequency and period at the chosen airspeed', lhs: 'f_N', eq: '\\frac{U}{L}', sub: `\\frac{${R.v(v.U, SPEED)}}{${R.v(o.L, DIST)}}`, res: `${n(o.f)}\\,\\mathrm{Hz}` });
    steps.push({ lhs: 'P', eq: '\\frac{L}{U}', res: `${n(o.P)}\\,\\mathrm{s}` });
    return [{
      title: 'Theory',
      text: 'A rocket free to pitch about its centre of gravity obeys $I\\,d^2\\alpha/dt^2=\\tfrac12\\rho S d\\,U^2C_{M\\alpha}\\alpha$. With $\\alpha=\\sin\\omega_N t$ this gives $\\omega_N^2=-\\rho S d\\,U^2C_{M\\alpha}/2I$. In one period $P=2\\pi/\\omega_N$ the rocket moves the wavelength $L=UP=2\\pi\\sqrt{2I/(-\\rho S d\\,C_{M\\alpha})}$, which does not depend on speed. The wave number is $\\lambda_p=2\\pi/L$ (Hoult).',
      steps,
    }];
  },
  references: ['the-pitch-yaw-wave-number3'],
  examples: [
    { name: 'Student rocket (6 in body, 3.8 m long, 25 kg)', values: { R: 3.07, Lr: 148, cmMode: 'margin', CNa: 10, SM: 2, iMode: 'rod', m: 25, rho: 1.225, U: 200 } },
    { name: 'Same rocket, measured inertia 18 kg m²', values: { R: 3.07, Lr: 148, cmMode: 'margin', CNa: 10, SM: 2, iMode: 'measured', I: 18, rho: 1.225, U: 200 } },
    { name: 'Small rocket (4 in body, 1.5 m, 4 kg)', values: { R: 2, Lr: 60, cmMode: 'margin', CNa: 9, SM: 1.8, iMode: 'rod', m: 4, rho: 1.225, U: 150 } },
  ],
};
