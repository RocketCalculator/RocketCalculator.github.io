// Propellant Sloshing — UI definition.
import { slosh, mode, LAMBDA, besselJ1 } from '../calc/slosh.js';
import { s, fmt, reducedMotion } from '../util.js';
import { dim, path, text } from '../ui/svg.js';

const ACC = { dim: 'accel', internal: 'fts2' };
const LEN = { dim: 'length', internal: 'ft' };
const MASS = { dim: 'mass', internal: 'slug' };
const DENS = { dim: 'density', internal: 'slugft3' };
const HZ = { dim: 'frequency', internal: 'hz' };
const G0 = 32.174;

export default {
  slug: 'propellant-slosh',
  topic: 'propellant-sloshing',
  title: 'Propellant Sloshing',
  subtitle: 'Natural <b>sloshing frequencies</b> of liquid propellant in a cylindrical tank under thrust, with the equivalent slosh mass and pendulum for autopilot and stability analysis.',
  intro: {
    what: 'Gives the first three sloshing frequencies of the liquid in an upright circular tank, the mass that takes part in each mode and the equivalent pendulum length.',
    why: 'Sloshing liquid exerts oscillating side forces; if a slosh frequency sits near the control or structural frequencies of a liquid rocket it can couple with them and grow.',
    when: 'Designing tanks and baffles, choosing autopilot bandwidth, or building a dynamics model of a liquid-propellant stage.',
  },
  info: {
    text: [
      'Under thrust the liquid behaves as if in a gravity field of strength $a=(T-D)/m$ pointing to the tank bottom. Small free-surface waves have natural frequencies set by the tank radius, the fill depth and $a$.',
      'In a circular tank the mode shapes follow the Bessel function $J_1$; the wave numbers are the roots $\\lambda_n$ of $J_1^\\prime(\\lambda)=0$ (1.841, 5.331, 8.536 …).',
      'For dynamics each mode can be replaced by a pendulum of length $L_n$ carrying the slosh mass $m_n$; the rest of the liquid moves with the tank.',
    ],
    tex: '\\omega_n^2=\\frac{a}{R}\\,\\lambda_n\\tanh\\frac{\\lambda_nh}{R},\\qquad h=\\frac{M}{\\rho\\pi R^2}',
    steps: [
      'Enter the thrust acceleration, tank radius, propellant mass and density.',
      'The fill depth follows from the mass and density.',
      'Each mode’s frequency follows from its Bessel root, the depth and the acceleration.',
      'The slosh mass and pendulum length give an equivalent mechanical model.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'g', title: 'Tank and propellant',
      fields: [
        { id: 'a', label: 'Thrust acceleration (T − D)/m', sym: 'a', ...ACC, default: 322, min: 0, minExclusive: true,
          info: { text: 'Axial acceleration of the vehicle; it acts on the liquid like gravity pointing to the tank bottom. Use the value at the time of interest — the frequencies scale with $\\sqrt a$.', range: 'Typical 2–15 g during powered flight.', doc: 'overview' } },
        { id: 'R', label: 'Tank radius', sym: 'R', ...LEN, default: 2, min: 0, minExclusive: true, info: { text: 'Inside radius of the cylindrical tank.', doc: 'modes' } },
        { id: 'M', label: 'Propellant mass in the tank', sym: 'M', ...MASS, default: 20, min: 0, minExclusive: true, info: { text: 'Liquid mass at the time of interest; it sets the fill depth.', doc: 'modes' } },
        { id: 'rho', label: 'Propellant density', sym: '\\rho', ...DENS, default: 2, min: 0, minExclusive: true,
          info: { text: 'Liquid density.', range: 'Liquid oxygen 1141, kerosene ≈ 810, nitrous oxide ≈ 750–1220 (temperature dependent), water 1000, ethanol 789 kg/m³.', doc: 'modes' } },
      ],
    },
  ],
  results: [
    { id: 'f1', label: 'First (fundamental) slosh frequency', sym: 'f_1', ...HZ, key: true, digits: 4, note: (x, out) => `${fmt(out.o.modes[0].w, { digits: 4 })} rad/s · period ${fmt(out.o.modes[0].period, { digits: 3 })} s`, info: { tex: 'f_1=\\frac{1}{2\\pi}\\sqrt{\\frac{a}{R}\\lambda_1\\tanh\\frac{\\lambda_1h}{R}}', doc: 'modes' } },
    { id: 'f2', label: 'Second mode', sym: 'f_2', ...HZ, key: true, digits: 4, note: (x, out) => `${fmt(out.o.modes[1].w, { digits: 4 })} rad/s`, info: { doc: 'modes' } },
    { id: 'f3', label: 'Third mode', sym: 'f_3', ...HZ, key: true, digits: 4, note: (x, out) => `${fmt(out.o.modes[2].w, { digits: 4 })} rad/s`, info: { doc: 'modes' } },
    { id: 'h', label: 'Fill depth', sym: 'h', ...LEN, key: true, note: (x, out) => `h/R = ${fmt(out.o.hR, { digits: 3 })}`, info: { tex: 'h=\\frac{M}{\\rho\\pi R^2}', doc: 'modes' } },
    { id: 'w1', label: 'First-mode circular frequency', sym: '\\omega_1', dim: 'rate', internal: 'rads', info: { doc: 'modes' } },
    { id: 'm1', label: 'First-mode slosh mass', sym: 'm_1', ...MASS, info: { tex: 'm_n=M\\,\\frac{2\\tanh(\\lambda_nh/R)}{\\lambda_n(\\lambda_n^2-1)\\,h/R}', doc: 'model' } },
    { id: 'm1frac', label: 'First-mode slosh mass fraction', sym: 'm_1/M', dim: 'percent', internal: 'pct', info: { doc: 'model' } },
    { id: 'L1', label: 'Equivalent pendulum length, mode 1', sym: 'L_1', ...LEN, info: { tex: 'L_n=\\frac{R}{\\lambda_n\\tanh(\\lambda_nh/R)}\\quad(\\omega_n^2=a/L_n)', doc: 'model' } },
    { id: 'm2', label: 'Second-mode slosh mass', sym: 'm_2', ...MASS, info: { doc: 'model' } },
    { id: 'm3', label: 'Third-mode slosh mass', sym: 'm_3', ...MASS, info: { doc: 'model' } },
    { id: 'fixedFrac', label: 'Liquid moving with the tank (outside modes 1–3)', sym: 'm_0/M', dim: 'percent', internal: 'pct', info: { doc: 'model' } },
  ],
  compute(v) {
    const o = slosh(v);
    const warnings = [];
    if (o.hR < 0.1) warnings.push({ level: 'info', text: 'A very shallow fill: the waves behave like shallow-water waves and are sensitive to tank-bottom shape, which the flat-bottom model ignores.' });
    if (o.hR > 2) warnings.push({ level: 'info', text: 'Deep fill ($h>2R$): the frequencies are those of an infinitely deep tank, and only a small part of the liquid sloshes.' });
    const [m1, m2, m3] = o.modes;
    const results = { f1: m1.f, f2: m2.f, f3: m3.f, h: o.h, w1: m1.w, m1: m1.m, m1frac: 100 * m1.mFrac, L1: m1.pendulum, m2: m2.m, m3: m3.m, fixedFrac: 100 * o.fixedFrac };
    return { results, warnings, o };
  },
  plots: [
    {
      id: 'depth', title: 'Slosh frequencies vs fill depth',
      info: { text: 'The first three frequencies as the tank drains, at your thrust acceleration. They change little once the depth exceeds about one radius.', doc: 'modes' },
      build(v, out, { U }) {
        const uh = U(HZ), series = [1, 2, 3].map((n) => ({ name: `f_${n}`, points: [] }));
        for (let i = 1; i <= 120; i++) {
          const hR = (2.5 * i) / 120;
          series.forEach((se, k) => se.points.push([hR, uh.v(mode(k + 1, { a: v.a, R: v.R, h: hR * v.R, M: 1 }).f)]));
        }
        return { x: { label: 'Fill depth / radius h/R' }, y: { label: 'Frequency', unit: uh.label }, includeZero: true, series,
          markers: [{ x: out.o.hR, y: uh.v(out.o.modes[0].f), label: 'f_1 now' }] };
      },
    },
    {
      id: 'mass', title: 'How much of the liquid sloshes',
      info: { text: 'Fraction of the liquid in each of the first three modes and the part that moves with the tank, against fill depth.', doc: 'model' },
      build(v, out) {
        const series = [1, 2, 3].map((n) => ({ name: `m_${n}/M`, points: [] })), fixed = { name: 'moves with tank', points: [], dashed: true, color: 'var(--text-3)' };
        for (let i = 1; i <= 120; i++) {
          const hR = (2.5 * i) / 120, ms = [1, 2, 3].map((n) => mode(n, { a: 1, R: 1, h: hR, M: 1 }).mFrac);
          ms.forEach((x, k) => series[k].points.push([hR, 100 * x])); fixed.points.push([hR, 100 * (1 - ms.reduce((a, b) => a + b, 0))]);
        }
        return { x: { label: 'Fill depth / radius h/R' }, y: { label: 'Share of liquid', unit: '\\%' }, yDomain: [0, 100], series: [...series, fixed],
          markers: [{ x: out.o.hR, y: 100 * out.o.modes[0].mFrac, label: 'now' }] };
      },
    },
  ],
  schematicTitle: 'Tank section and first slosh mode',
  schematicHint: 'Drag the liquid surface to change the propellant mass; the surface rocks at the first-mode frequency',
  schematic(ctx, v, out) {
    const W = 760, H = 330, o = out.o;
    const fr = ctx.frame({ width: W, height: H, label: 'Tank section with the first slosh mode' });
    const g = fr.layer('main'); g.replaceChildren();
    const ul = ctx.U(LEN), L = (x) => `${fmt(ul.v(x), { digits: 3 })} ${ul.label}`;
    // tank: height shown up to max(2.6R, 1.2h)
    const Ht = Math.max(2.6 * v.R, 1.25 * o.h), k = Math.min(250 / Ht, 300 / (2 * v.R));
    const cx = 300, yb = 300, w = v.R * k, top = yb - Ht * k, ys = yb - o.h * k;
    g.append(s('path', { d: `M${cx - w},${top} L${cx - w},${yb} L${cx + w},${yb} L${cx + w},${top}`, class: 'sc-line', fill: 'none', 'stroke-width': 2.4, 'data-field': 'R' }));
    // free surface of mode 1: η(x) ∝ J1(λ1 x/R)/J1(λ1), amplitude for display
    const amp = Math.min(0.18 * w, Math.max(6, 0.35 * o.h * k)), j1e = besselJ1(LAMBDA[0]).J1;
    const surf = (sg) => Array.from({ length: 61 }, (_, i) => { const x = -1 + i / 30; return [cx + x * w, ys - sg * amp * (Math.sign(x) * besselJ1(LAMBDA[0] * Math.abs(x)).J1) / j1e]; });
    const liquid = (sg) => `M${cx - w},${yb} ` + surf(sg).map((p, i) => `L${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ') + ` L${cx + w},${yb} Z`;
    const liq = s('path', { d: liquid(1), fill: 'var(--series-1)', 'fill-opacity': 0.18, stroke: 'var(--series-1)', 'stroke-width': 1.6, 'data-field': 'M rho' });
    const f1 = o.modes[0].f;
    if (!reducedMotion() && f1 > 0) {
      const slow = f1 > 0.5 ? Math.ceil(f1 / 0.5) : 1;
      liq.append(s('animate', { attributeName: 'd', dur: `${slow / f1}s`, repeatCount: 'indefinite', values: [liquid(1), liquid(0), liquid(-1), liquid(0), liquid(1)].join(';'), keyTimes: '0;0.25;0.5;0.75;1', calcMode: 'spline', keySplines: '0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1' }));
      g.append(text(cx, top - 10, `first mode, shown ${slow > 1 ? `${slow}× slower` : 'at true speed'} · amplitude exaggerated`, { anchor: 'middle', cls: 'sc-dim-text', size: 10 }));
    }
    g.append(liq);
    g.append(s('line', { x1: cx - w - 10, x2: cx + w + 10, y1: ys, y2: ys, class: 'sc-thin', 'stroke-dasharray': '3 3' }));
    g.append(dim(fr, cx - w, yb, cx, yb, `R = ${L(v.R)}`, { off: 18, field: 'R' }));
    g.append(dim(fr, cx + w, yb, cx + w, ys, `h = ${L(o.h)}`, { off: 26, field: 'M rho' }));
    // apparent gravity
    g.append(s('path', { d: `M${cx - w - 60},${top + 30} L${cx - w - 60},${top + 110}`, class: 'sc-accent', 'marker-end': fr.arrow('acc') }));
    g.append(text(cx - w - 66, top + 24, `a = ${fmt(v.a / G0, { digits: 3 })} g`, { anchor: 'middle', size: 11, field: 'a' }));
    // equivalent pendulum (length to scale)
    const px = 600, py = 60, Lp = Math.min(220, o.modes[0].pendulum * k);
    g.append(s('line', { x1: px - 30, x2: px + 30, y1: py, y2: py, class: 'sc-line' }));
    g.append(s('line', { x1: px, y1: py, x2: px + Lp * Math.sin(0.25), y2: py + Lp * Math.cos(0.25), class: 'sc-line', 'stroke-width': 1.6 }));
    g.append(s('circle', { cx: px + Lp * Math.sin(0.25), cy: py + Lp * Math.cos(0.25), r: 9, fill: 'var(--series-1)', 'fill-opacity': 0.5, stroke: 'var(--series-1)' }));
    g.append(text(px + 16, py + Lp / 2, `L_1 = ${L(o.modes[0].pendulum)}`, { size: 11 }));
    g.append(text(px, py + Lp + 30, `m_1 = ${fmt(o.modes[0].mFrac * 100, { digits: 3 })} % of M`, { anchor: 'middle', size: 11 }));
    g.append(text(px, py - 12, 'equivalent pendulum', { anchor: 'middle', cls: 'sc-dim-text', size: 10 }));
    ctx.handle('surface', cx + w - 14, ys, {
      field: 'M', title: 'Drag up or down to change the propellant mass',
      onDrag: (sx, sy) => ctx.setValue('M', Math.max(1e-6, ((yb - sy) / k) * v.rho * Math.PI * v.R * v.R)),
      onKey: (dx, dy) => ctx.setValue('M', v.M * (1 + 0.03 * dy)),
    });
  },
  symbols: {
    a: 'thrust acceleration $(T-D)/m$', R: 'tank radius', M: 'propellant mass in the tank', '\\rho': 'propellant density', h: 'fill depth',
    '\\lambda_n': 'nth root of $J_1^\\prime(\\lambda)=0$', '\\omega_n': 'circular frequency of mode $n$', f_n: 'frequency of mode $n$', m_n: 'slosh mass of mode $n$', L_n: 'equivalent pendulum length of mode $n$',
    '\\lambda_1': 'first root of $J_1^\\prime=0$', '\\omega_1': 'first-mode circular frequency', f_1: 'first slosh frequency', m_1: 'first-mode slosh mass', L_1: 'first-mode pendulum length',
  },
  report(v, out, R) {
    const o = out.o, n = R.n, l = (x) => R.v(x, LEN);
    const steps = [{ label: 'Fill depth', lhs: 'h', eq: '\\frac{M}{\\rho\\pi R^2}', sub: `\\frac{${R.v(v.M, MASS)}}{${R.v(v.rho, DENS)}\\,\\pi\\,(${l(v.R)})^2}`, res: R.Q(o.h, LEN) }];
    o.modes.forEach((m, i) => steps.push({ label: `Mode ${i + 1} ($\\lambda_${i + 1}=${n(m.lambda, 6)}$)`, lhs: `\\omega_${i + 1}`, eq: `\\sqrt{\\frac{a}{R}\\lambda_${i + 1}\\tanh\\frac{\\lambda_${i + 1}h}{R}}`,
      sub: `\\sqrt{\\frac{${R.v(v.a, ACC)}}{${l(v.R)}}\\times${n(m.lambda, 6)}\\tanh\\frac{${n(m.lambda, 6)}\\times${l(o.h)}}{${l(v.R)}}}`, res: `${n(m.w)}\\ \\mathrm{rad\\,s^{-1}}=${n(m.f)}\\ \\mathrm{Hz}` }));
    steps.push(
      { label: 'First-mode slosh mass (equivalent mechanical model)', lhs: 'm_1', eq: 'M\\,\\frac{2\\tanh(\\lambda_1h/R)}{\\lambda_1(\\lambda_1^2-1)\\,h/R}', res: R.Q(o.modes[0].m, MASS) },
      { label: 'Equivalent pendulum length', lhs: 'L_1', eq: '\\frac{R}{\\lambda_1\\tanh(\\lambda_1h/R)}', res: R.Q(o.modes[0].pendulum, LEN) });
    return [{
      title: 'Theory',
      text: 'Under thrust the propellant sits in an apparent gravity field of strength $a=(T-D)/m$. For small motions of the free surface in an upright cylindrical tank of radius $R$ filled to depth $h$, the velocity potential is a sum of Bessel modes $J_1(\\lambda_nr/R)$; the wall condition requires $J_1^\\prime(\\lambda_n)=0$ and the free-surface condition gives the natural frequencies. Each mode can be represented by a pendulum of length $L_n$ carrying a slosh mass $m_n$ (Abramson, NASA SP-106).',
      steps,
    }];
  },
  references: ['analysis-of-the-motion-of-liquids-in-a-partially-filled-enclosure-orig', 'sloshing-errata'],
  examples: [
    { name: '4 ft tank at 10 g', values: { a: 322, R: 2, M: 20, rho: 2 } },
    { name: 'Hybrid N₂O tank, 6 in, near burnout', values: { a: 96.5, R: 0.25, M: 0.25, rho: 1.6 } },
    { name: 'Kerosene, 1 m tank, 3 g', values: { a: 96.522, R: 1.6404, M: 32.6, rho: 1.5717 } },
  ],
};
