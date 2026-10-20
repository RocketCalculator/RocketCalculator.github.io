// Yo-Yo Despinner — UI definition.
import { yoyo, radialSpinRatio, G0 } from '../calc/yoyo.js';
import { s, fmt, InputError } from '../util.js';
import { path, text } from '../ui/svg.js';

const INERTIA = { dim: 'inertia', internal: 'slugft2' };
const SPIN = { dim: 'frequency', internal: 'hz' };
const DRUM = { dim: 'length', internal: 'in' };
const WIRE = { dim: 'distance', internal: 'in' };
const MU = { dim: 'linearDensity', internal: 'lbpin' };
const MASS = { dim: 'smallMass', internal: 'slug' };
const FORCE = { dim: 'force', internal: 'lbf' };
const TIME = { dim: 'time', internal: 's' };
const TAU = 2 * Math.PI;

// internal → the slug-ft-s-rad set the dynamics use
const inputsOf = (v) => ({ I: v.I, a: v.a / 12, l: v.l / 12, w0: TAU * v.f0, wf: TAU * v.ff, mu: (v.mu * 12) / G0 });

export default {
  slug: 'yo-yo-despin',
  topic: 'yo-yo-despinner',
  title: 'Yo-Yo Despinner',
  subtitle: 'Size the two <b>despin weights</b> and wires that slow a spinning stage or payload to a chosen roll rate — with the peak wire loads and the time the manoeuvre takes.',
  intro: {
    what: 'Finds the despin mass for a two-weight yo-yo with radial release, given the roll inertia, initial and final spin, drum radius and wire length; then the wire tensions and timing.',
    why: 'Spin-stabilised stages often must be slowed before payload separation or instrument operation. Yo-yo weights do it with no propellant and very little hardware.',
    when: 'Designing the despin system of a spin-stabilised upper stage or payload, and checking that the wires and their attachments can carry the load.',
  },
  info: {
    text: [
      'Two weights sit on wires wrapped round the vehicle. Released, they fly outward, unwinding the wires and carrying angular momentum away from the vehicle.',
      'While a wire unwinds the unwound angle grows exactly as $\\varphi=\\omega_0t$ and the spin falls as $\\omega=\\omega_0(c-\\varphi^2)/(c+\\varphi^2)$. Fully unwound, each wire swings about its attachment point until it points along the radius, where the weights let go.',
      'Angular momentum and kinetic energy are conserved, so the final spin depends only on the inertia, the drum radius, the wire length and the despin mass.',
    ],
    tex: '(D+ma^2)^2=mR^2(D^\\prime+ma^2),\\quad D=I(1-r),\\ D^\\prime=I(1-r^2),\\ R=a+l',
    steps: [
      'Enter the roll moment of inertia and the initial and final spin rates.',
      'Enter the drum (attachment) radius and the length of each wire.',
      'The despin mass that gives the final spin at radial release follows from momentum and energy conservation.',
      'Wire mass is allowed for; the peak tensions in both phases and the timing follow.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'veh', title: 'Vehicle and spin',
      fields: [
        { id: 'I', label: 'Roll moment of inertia', sym: 'I', ...INERTIA, default: 2.5, min: 0, minExclusive: true, info: { text: 'Roll (spin-axis) moment of inertia of the vehicle without the despin weights.', doc: 'overview' } },
        { id: 'f0', label: 'Initial spin rate', sym: 'f_0', ...SPIN, default: 7.5, min: 0, minExclusive: true, info: { text: 'Roll rate when the weights are let go.', doc: 'phase1' } },
        { id: 'ff', label: 'Final spin rate', sym: 'f_f', ...SPIN, default: 1.66667, min: 0, info: { text: 'Roll rate wanted after release. Zero despins completely.', doc: 'release' } },
      ],
    },
    {
      id: 'yo', title: 'Yo-yo geometry',
      fields: [
        { id: 'a', label: 'Drum (attachment) radius', sym: 'a', ...DRUM, default: 15, min: 0, minExclusive: true, info: { text: 'Radius at which the wires are wrapped and attached — usually the outer skin.', doc: 'phase1' } },
        { id: 'l', label: 'Wire length (each)', sym: 'l', ...WIRE, default: 206, min: 0, minExclusive: true, info: { text: 'Length of each wire from its attachment to the weight.', doc: 'phase1' } },
        { id: 'mu', label: 'Wire mass per unit length', sym: '\\mu', ...MU, default: 0.0002083, min: 0, info: { text: 'Mass of the wire per unit length. Each wire counts as a third of its mass in the despin mass.', doc: 'wire' } },
      ],
    },
  ],
  results: [
    { id: 'weightEach', label: 'Each despin weight', sym: 'm_w/2', ...MASS, key: true, digits: 4, note: () => 'two weights; a third of the wire mass deducted',
      info: { text: 'Mass of each of the two weights, after deducting a third of the wire mass.', tex: '\\frac{m_w}{2}=\\frac{1}{2}\\left(m-\\frac{2\\mu l}{3}\\right)', doc: 'wire' } },
    { id: 'T1', label: 'Peak wire tension while unwinding', sym: 'T_{1,max}', ...FORCE, key: true, info: { tex: 'T_1=\\frac{m}{2}a\\omega_0^2\\,\\frac{4c\\varphi(c-1)}{(c+\\varphi^2)^2},\\ \\max\\text{ at }\\varphi^2=c/3', doc: 'phase1' } },
    { id: 'T2', label: 'Peak wire tension at release', sym: 'T_{2,max}', ...FORCE, key: true, note: (x, out) => (out.o.T2 > out.o.T1 ? 'design load: the larger of the two' : 'below the unwinding peak'),
      info: { tex: 'T_2=\\frac{m}{2}\\left(a\\omega_f^2+l\\dot\\beta^2\\right)', doc: 'release' } },
    { id: 'tRelease', label: 'Time from release to separation', sym: 't_r', ...TIME, key: true, digits: 4, note: (x, out) => `unwinding takes ${fmt(out.o.tUnwind, { digits: 3 })} s`, info: { doc: 'phase1' } },
    { id: 'm', label: 'Total despin mass (weights + ⅓ wires)', sym: 'm', ...MASS, info: { tex: 'm=\\frac{-A_1-\\sqrt{A_1^2-4A_2A_0}}{2A_2}', doc: 'release' } },
    { id: 'mApprox', label: 'Total despin mass, Fedor closed form', sym: 'm_F', ...MASS, info: { tex: 'm_F=\\frac{(1-r)I}{(1+r)R^2-a^2}', text: 'Neglects small terms in $ma^2$; within a fraction of a percent for usual designs.', doc: 'release' } },
    { id: 'r', label: 'Spin ratio', sym: 'r', dim: 'none', digits: 4, info: { tex: 'r=\\omega_f/\\omega_0', doc: 'release' } },
    { id: 'lambda', label: 'Wire length for complete despin (tangential release)', sym: '\\lambda', ...WIRE, info: { tex: '\\lambda=\\sqrt{I/m+a^2}', doc: 'phase1' } },
    { id: 'c', label: 'Yo-yo parameter', sym: 'c', dim: 'none', digits: 5, info: { tex: 'c=1+\\frac{I}{ma^2}', doc: 'phase1' } },
    { id: 'releaseSpeed', label: 'Weight speed at release', sym: 'u', dim: 'speed', internal: 'fts', info: { tex: 'u=\\frac{(I+ma^2)\\omega_0-I\\omega_f}{mR}', doc: 'release' } },
    { id: 'T2Fedor', label: 'Release tension, worksheet estimate', sym: 'T_{2,F}', ...FORCE, info: { text: 'A simpler estimate of the phase-2 tension; it is lower than the exact release value and should not be used for design.', doc: 'release' } },
    { id: 'wireMass', label: 'Mass of both wires', sym: '2\\mu l', ...MASS, info: { doc: 'wire' } },
  ],
  compute(v) {
    if (v.ff >= v.f0) throw new InputError('The final spin rate must be lower than the initial spin rate.');
    const p = inputsOf(v), o = yoyo(p);
    const warnings = [];
    if (!(o.m > 0) || !(o.mWeights > 0)) throw new InputError('The wires alone are heavier than the despin mass needed — use lighter or shorter wire.');
    if (o.T1atEnd) warnings.push({ level: 'info', text: 'The wire is shorter than the length at which the unwinding tension would peak; the peak is reached at full unwinding.' });
    if (o.m * p.a * p.a > 0.2 * p.I) warnings.push({ level: 'warn', text: 'The despin weights carry more than a fifth of the roll inertia at the drum radius — check the design (a longer wire needs less mass).' });
    const results = {
      weightEach: o.mWeights / 2, T1: o.T1, T2: o.T2, tRelease: o.tRelease, m: o.m, mApprox: o.mApprox, r: o.r, lambda: o.lambda * 12, c: o.c,
      releaseSpeed: o.releaseSpeed, T2Fedor: o.T2Fedor, wireMass: o.wireMass,
    };
    return { results, warnings, o, p };
  },
  plots: [
    {
      id: 'spin', title: 'Spin rate during despin',
      info: { text: 'Roll rate from the moment the weights are let go to radial release: unwinding (phase 1), then the wires swinging out (phase 2).', doc: 'phase1' },
      build(v, out, { U }) {
        const us = U(SPIN), smp = out.o.sim.samples;
        return { x: { label: 'Time', unit: '\\mathrm{s}' }, y: { label: 'Spin rate', unit: us.label }, includeZero: true,
          series: [{ name: 'unwinding', points: smp.filter((q) => q.phase === 1).map((q) => [q.t, us.v(q.w / TAU)]) }, { name: 'swing-out', points: smp.filter((q) => q.phase === 2).map((q) => [q.t, us.v(q.w / TAU)]) }],
          vlines: [{ x: out.o.tUnwind, label: 'fully unwound', color: 'var(--text-3)' }],
          markers: [{ x: out.o.tRelease, y: us.v(v.ff), label: 'release' }] };
      },
    },
    {
      id: 'tension', title: 'Wire tension',
      info: { text: 'Tension in each wire through both phases, from integrating the equations of motion. Design the wire and its attachment for the peak with a margin.', doc: 'release' },
      build(v, out, { U }) {
        const uf = U(FORCE), smp = out.o.sim.samples;
        return { x: { label: 'Time', unit: '\\mathrm{s}' }, y: { label: 'Tension', unit: uf.label }, includeZero: true,
          series: [{ name: 'unwinding', points: smp.filter((q) => q.phase === 1).map((q) => [q.t, uf.v(q.T)]) }, { name: 'swing-out', points: smp.filter((q) => q.phase === 2).map((q) => [q.t, uf.v(q.T)]) }],
          markers: [{ x: out.o.tRelease, y: uf.v(out.o.T2release), label: 'release' }] };
      },
    },
    {
      id: 'design', title: 'Final spin vs despin weight',
      info: { text: 'Final roll rate against the mass of each weight for your wire length and drum radius; the dot is your design.', doc: 'release' },
      build(v, out, { U }) {
        const us = U(SPIN), um = U(MASS), p = out.p, mw = out.o.mWeights / 2, pts = [];
        for (let i = 1; i <= 100; i++) {
          const each = (2.2 * mw * i) / 100, m = 2 * each + (2 * p.mu * p.l) / 3;
          pts.push([um.v(each), us.v((radialSpinRatio(p.I, p.a, p.l, m) * p.w0) / TAU)]);
        }
        return { x: { label: 'Each weight', unit: um.label }, y: { label: 'Final spin', unit: us.label }, series: [{ name: 'f_f', points: pts }],
          hlines: [{ y: 0, label: 'despun', color: 'var(--text-3)' }], markers: [{ x: um.v(mw), y: us.v(v.ff), label: 'design' }] };
      },
    },
  ],
  schematicTitle: 'Path of the weights (seen from the nose, vehicle frame)',
  schematicHint: 'The weights unwind along involutes of the drum, then swing out to radial release',
  schematic(ctx, v, out) {
    const W = 760, H = 330, cx = 380, cy = 165, p = out.p;
    const fr = ctx.frame({ width: W, height: H, label: 'Yo-yo despinner paths' });
    const g = fr.layer('main'); g.replaceChildren();
    const R = p.a + p.l, k = 145 / R, ra = Math.max(10, p.a * k), phiE = p.l / p.a;
    const u = ctx.U(WIRE), ud = ctx.U(DRUM);
    g.append(s('circle', { cx, cy, r: ra, class: 'sc-body', 'data-field': 'a' }));
    g.append(s('circle', { cx, cy, r: 2.5, fill: 'var(--text)' }));
    for (const rot of [0, Math.PI]) {
      // involute of the drum (vehicle frame), ending at the attachment point A at angle rot
      const pts = [];
      for (let i = 0; i <= 240; i++) {
        const ph = (phiE * i) / 240, ang = rot + phiE - ph;           // tangent-point angle
        const x = ra * Math.cos(ang) + ra * ph * Math.sin(ang), y = ra * Math.sin(ang) - ra * ph * Math.cos(ang);
        pts.push([cx + x, cy - y]);
      }
      g.append(s('path', { d: path(pts.reverse()), class: 'sc-thin', fill: 'none', 'stroke-dasharray': '4 3', 'data-field': 'l' }));
      // phase 2: swing about A from tangent to radial
      const Ax = cx + ra * Math.cos(rot), Ay = cy - ra * Math.sin(rot), L = p.l * k;
      const tan = [Ax + L * Math.sin(rot), Ay + L * Math.cos(rot)], rad = [Ax + L * Math.cos(rot), Ay - L * Math.sin(rot)];
      g.append(s('path', { d: `M${tan[0]},${tan[1]} A${L},${L} 0 0 0 ${rad[0]},${rad[1]}`, class: 'sc-accent', fill: 'none', 'data-field': 'l' }));
      g.append(s('line', { x1: Ax, y1: Ay, x2: rad[0], y2: rad[1], class: 'sc-line', 'data-field': 'l' }));
      g.append(s('circle', { cx: rad[0], cy: rad[1], r: 7, class: 'sc-body-2', 'data-field': 'mu' }));
      g.append(s('circle', { cx: tan[0], cy: tan[1], r: 4, fill: 'var(--text-3)' }));
    }
    g.append(text(cx + ra + 6, cy - 8, `a = ${fmt(ud.v(v.a), { digits: 3 })} ${ud.label}`, { size: 11, field: 'a' }));
    g.append(text(cx + (p.l * k) / 2, cy + 18, `l = ${fmt(u.v(v.l), { digits: 3 })} ${u.label}`, { anchor: 'middle', size: 11, field: 'l' }));
    g.append(text(cx + R * k - 2, cy - 14, 'release', { anchor: 'middle', cls: 'sc-dim-text', size: 10 }));
    g.append(text(20, 26, `weights ${fmt(ctx.U(MASS).v(out.o.mWeights / 2), { digits: 3 })} ${ctx.U(MASS).label} each`, { size: 11 }));
    g.append(text(20, 44, `spin ${fmt(ctx.U(SPIN).v(v.f0), { digits: 3 })} → ${fmt(ctx.U(SPIN).v(v.ff), { digits: 3 })} ${ctx.U(SPIN).label}`, { size: 11, field: 'f0 ff' }));
    g.append(text(20, H - 14, 'dashed: unwinding (involute) · red: swing-out to radial release', { cls: 'sc-dim-text', size: 10 }));
    // spin arrow
    const ar = ra + 14;
    g.append(s('path', { d: `M${cx + ar * Math.cos(2.2)},${cy - ar * Math.sin(2.2)} A${ar},${ar} 0 0 0 ${cx + ar * Math.cos(1.0)},${cy - ar * Math.sin(1.0)}`, class: 'sc-accent', fill: 'none', 'marker-end': fr.arrow('acc') }));
  },
  symbols: {
    I: 'roll moment of inertia of the vehicle', '\\omega_0': 'initial spin rate', '\\omega_f': 'final spin rate', r: 'spin ratio', a: 'drum radius', l: 'wire length', R: 'release radius',
    m: 'total despin mass', m_w: 'mass of both weights', '\\mu': 'wire mass per unit length', c: 'yo-yo parameter', '\\varphi': 'unwound angle of the wire', '\\lambda': 'wire length for complete despin',
    D: 'momentum loss factor $I(1-r)$', 'D^\\prime': 'energy loss factor $I(1-r^2)$', A_0: 'quadratic coefficient', A_1: 'quadratic coefficient', A_2: 'quadratic coefficient',
    u: 'weight speed at release', '\\dot\\beta': 'turning rate of the wire at release', 'T_{1,max}': 'peak tension while unwinding', 'T_{2,max}': 'tension at release', f_0: 'initial spin rate', f_f: 'final spin rate',
  },
  report(v, out, R) {
    const o = out.o, p = out.p, n = R.n, Ms = MASS, F = FORCE;
    const I = R.v(v.I, INERTIA), a = R.v(v.a, DRUM), l = R.v(v.l, WIRE), Rr = R.v(v.a + v.l, WIRE);
    return [{
      title: 'Theory',
      text: 'Two weights of total mass $m$ on wires of length $l$ wrapped on a drum of radius $a$ are released from a vehicle spinning at $\\omega_0$. While a wire unwinds, conservation of angular momentum and energy give $\\varphi=\\omega_0t$ and $\\omega=\\omega_0(c-\\varphi^2)/(c+\\varphi^2)$ with $c=1+I/(ma^2)$ (Fedor, NASA TN D-708). Fully unwound, each wire swings about its attachment until it lies along the radius, where the weights are released at radius $R=a+l$, moving tangentially. Equating angular momentum and energy before and at release gives a quadratic for the mass needed to leave the spin ratio $r=\\omega_f/\\omega_0$.',
      steps: [
        { label: 'Spin ratio', lhs: 'r', eq: '\\frac{\\omega_f}{\\omega_0}', sub: `\\frac{${n(v.ff)}}{${n(v.f0)}}`, res: n(o.r) },
        { label: 'Momentum and energy at radial release', lhs: '(D+ma^2)^2', eq: 'mR^2(D^\\prime+ma^2)', res: `D=I(1-r),\\ D^\\prime=I(1-r^2),\\ R=a+l=${Rr}` },
        { label: 'Total despin mass (positive root)', lhs: 'm', eq: '\\frac{-A_1-\\sqrt{A_1^2-4A_2A_0}}{2A_2},\\quad A_2=a^2(a^2-R^2),\\ A_1=2Da^2-R^2D^\\prime,\\ A_0=D^2', res: R.Q(o.m, Ms) },
        { label: 'Despin weights (each)', lhs: '\\frac{m_w}{2}', eq: '\\frac12\\left(m-\\frac{2\\mu l}{3}\\right)', res: R.Q(o.mWeights / 2, Ms) },
        { label: 'Yo-yo parameter', lhs: 'c', eq: '1+\\frac{I}{ma^2}', sub: `1+\\frac{${I}}{${R.v(o.m, Ms)}\\times(${a})^2}`, res: n(o.c) },
        { label: 'Peak tension while unwinding (at $\\varphi^2=c/3$, or at full unwinding if the wire is shorter)', lhs: 'T_{1,max}', eq: '\\frac{m}{2}a\\omega_0^2\\frac{4c\\varphi(c-1)}{(c+\\varphi^2)^2}', res: R.Q(o.T1, F) },
        { label: 'Weight speed at release', lhs: 'u', eq: '\\frac{(I+ma^2)\\omega_0-I\\omega_f}{mR}', res: R.Q(o.releaseSpeed, { dim: 'speed', internal: 'fts' }) },
        { label: 'Wire turning rate and tension at release', lhs: '\\dot\\beta', eq: '\\frac{u-a\\omega_f}{l}', res: `${n(o.wireRate)}\\ \\mathrm{rad\\,s^{-1}}` },
        { lhs: 'T_{2,max}', eq: '\\frac{m}{2}\\left(a\\omega_f^2+l\\dot\\beta^2\\right)', res: R.Q(o.T2release, F) },
        { label: 'Duration', lhs: 't_r', eq: '\\frac{l}{a\\,\\omega_0}+t_{swing}', res: `${n(o.tRelease)}\\ \\mathrm{s}` },
      ],
    }];
  },
  references: [],
  examples: [
    { name: '2700 → 600 °/s, 17 ft wires', values: { I: 2.5, f0: 7.5, ff: 1.66667, a: 15, l: 206, mu: 0.0002083 } },
    { name: 'Complete despin of a small payload', values: { I: 0.15, f0: 4, ff: 0, a: 3, l: 40, mu: 0.0001 } },
  ],
};
