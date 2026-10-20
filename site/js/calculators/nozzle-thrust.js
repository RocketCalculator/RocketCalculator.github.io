// Nozzle Thrust Coefficient — UI definition.
import { nozzle, cf, malina, cfInfinity, throatRatio } from '../calc/nozzle.js';
import { s, fmt, InputError } from '../util.js';
import { dim, path, text } from '../ui/svg.js';
import { toDisplay, displayUnit, unitTex } from '../units.js';

const PRES = { dim: 'pressure', internal: 'psi', units: { si: 'kPa', us: 'psi' } };
const LEN = { dim: 'length', internal: 'in' };
const AREA = { dim: 'area', internal: 'in2', units: { si: 'mm2', us: 'in2' } };
const FORCE = { dim: 'force', internal: 'lbf' };
const ANG = { dim: 'angle', internal: 'deg' };
const RAD = Math.PI / 180;

export default {
  slug: 'nozzle-thrust',
  topic: 'nozzles',
  title: 'Nozzle Thrust Coefficient',
  subtitle: 'Thrust coefficient and thrust of a conical <b>de Laval nozzle</b> from one-dimensional isentropic flow, with the Malina correction for the spreading exhaust.',
  intro: {
    what: 'Finds the exit Mach number and exit pressure of a conical converging–diverging nozzle, then its thrust coefficient $C_F=T/(p_cA_t)$ and thrust, at any ambient pressure.',
    why: 'The thrust coefficient tells you how well the nozzle turns chamber pressure into thrust. The expansion ratio that suits sea level is too small in vacuum, and one that suits altitude can make the jet separate at launch.',
    when: 'Choosing the expansion ratio and divergence angle of a motor nozzle, predicting thrust from chamber pressure, or checking a nozzle for flow separation at sea level.',
  },
  info: {
    text: [
      'Gas leaves the chamber at pressure $p_c$, speeds up to sound speed at the throat and keeps accelerating in the diverging section. The expansion ratio $\\varepsilon=A_e/A_t$ alone sets the exit Mach number $M_e$ and so the exit pressure $p_e$.',
      'Thrust is the momentum of the jet plus the pressure difference $p_e-p_a$ acting on the exit area. Divided by $p_cA_t$ it gives the thrust coefficient $C_F$.',
      'In a conical nozzle the gas leaves along rays from a point, not parallel to the axis. Malina’s factor $\\lambda=(1+\\cos\\alpha)/2$ removes the sideways part of the momentum.',
    ],
    tex: 'C_F=\\lambda\\sqrt{\\frac{2\\gamma^2}{\\gamma-1}\\left(\\frac{2}{\\gamma+1}\\right)^{\\frac{\\gamma+1}{\\gamma-1}}\\left[1-\\left(\\frac{p_e}{p_c}\\right)^{\\frac{\\gamma-1}{\\gamma}}\\right]}+\\frac{p_e-p_a}{p_c}\\,\\varepsilon',
    steps: [
      'Enter the ratio of specific heats of the exhaust gas.',
      'Enter the throat diameter, expansion ratio and divergence half angle of the nozzle.',
      'Enter the chamber pressure and the ambient pressure at the altitude of interest.',
      'The exit Mach number follows from the expansion ratio, then the exit pressure and the thrust coefficient.',
      'Thrust is the thrust coefficient times chamber pressure times throat area.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'gas', title: 'Exhaust gas',
      fields: [
        { id: 'g', label: 'Ratio of specific heats', sym: '\\gamma', dim: 'none', default: 1.4, min: 1, minExclusive: true, max: 1.67, step: 0.01,
          info: { text: 'Ratio $c_p/c_v$ of the exhaust gas, taken as constant through the nozzle.', range: 'Solid and hybrid motor exhaust 1.15–1.25, air 1.4 (cold-flow tests), helium 1.67.', doc: 'isentropic' } },
      ],
    },
    {
      id: 'geom', title: 'Nozzle geometry',
      fields: [
        { id: 'dt', label: 'Throat diameter', sym: 'd_t', ...LEN, default: 1, min: 0, minExclusive: true, info: { text: 'Diameter of the narrowest section. It sets the thrust for a given chamber pressure but not the thrust coefficient.', doc: 'thrust' } },
        { id: 'eps', label: 'Expansion ratio', sym: '\\varepsilon', dim: 'none', default: 6, min: 1, max: 1000, step: 0.1,
          info: { text: 'Exit area divided by throat area, $\\varepsilon=(d_e/d_t)^2$. It fixes the exit Mach number and the exit pressure.', range: 'Sea-level motors 4–10; upper stages 20–100.', doc: 'isentropic' } },
        { id: 'alpha', label: 'Divergence half angle', sym: '\\alpha', ...ANG, default: 15, min: 1, max: 60, step: 0.5,
          info: { text: 'Half angle of the diverging cone. A wider cone is shorter and lighter but throws more of the jet sideways.', range: '12–18° for conical nozzles; 15° is the usual compromise.', doc: 'malina' } },
      ],
    },
    {
      id: 'press', title: 'Pressures',
      fields: [
        { id: 'pc', label: 'Chamber pressure', sym: 'p_c', ...PRES, default: 600, min: 0, minExclusive: true,
          info: { text: 'Stagnation (total) pressure in the combustion chamber, absolute.', range: 'Amateur and student solid motors 2–7 MPa (300–1000 psi).', doc: 'isentropic' } },
        { id: 'pa', label: 'Ambient pressure', sym: 'p_a', ...PRES, default: 14.7, min: 0,
          info: { text: 'Static pressure of the air around the exit, absolute. Zero gives the vacuum value.', range: 'Sea level 101.3 kPa (14.7 psi); about 26 kPa at 10 km.', doc: 'thrust' } },
      ],
    },
  ],
  results: [
    { id: 'cf', label: 'Thrust coefficient (with Malina correction)', sym: 'C_F', dim: 'none', key: true, digits: 4, note: (x, out) => `one-dimensional $C_{F,1D}$ = ${fmt(out.o.cf1D, { digits: 4 })} · $\\lambda$ = ${fmt(out.o.lambda, { digits: 4 })}`,
      info: { tex: 'C_F=\\lambda\\,C_{F,m}+\\frac{p_e-p_a}{p_c}\\,\\varepsilon', doc: 'malina' } },
    { id: 'thrust', label: 'Thrust', sym: 'T', ...FORCE, key: true, note: (x, out) => `in vacuum ${fmt(toDisplay(out.o.thrustVac, FORCE), { digits: 4 })} $${unitTex(displayUnit(FORCE))}$`, info: { tex: 'T=C_F\\,p_c\\,A_t', doc: 'thrust' } },
    { id: 'Me', label: 'Exit Mach number', sym: 'M_e', dim: 'none', key: true, digits: 4, note: (x, out) => `$p_e/p_c$ = ${fmt(out.o.pec, { digits: 4 })}`,
      info: { tex: '\\varepsilon=\\frac{1}{M_e}\\left[\\frac{2}{\\gamma+1}\\left(1+\\frac{\\gamma-1}{2}M_e^2\\right)\\right]^{\\frac{\\gamma+1}{2(\\gamma-1)}}', doc: 'isentropic' } },
    { id: 'pe', label: 'Exit pressure', sym: 'p_e', ...PRES, key: true,
      note: (x, out) => (out.o.pa > 0 ? `$p_e/p_a$ = ${fmt(out.o.pe / out.o.pa, { digits: 3 })} · ${out.o.state}` : 'expanding into vacuum'),
      info: { tex: 'p_e=p_c\\left(1+\\frac{\\gamma-1}{2}M_e^2\\right)^{-\\frac{\\gamma}{\\gamma-1}}', doc: 'isentropic' } },
    { id: 'cf1D', label: 'Thrust coefficient, one-dimensional', sym: 'C_{F,1D}', dim: 'none', digits: 4, info: { tex: 'C_{F,1D}=C_{F,m}+\\frac{p_e-p_a}{p_c}\\,\\varepsilon', doc: 'isentropic' } },
    { id: 'lambda', label: 'Malina divergence factor', sym: '\\lambda', dim: 'none', digits: 4, info: { tex: '\\lambda=\\frac{1+\\cos\\,\\alpha}{2}', doc: 'malina' } },
    { id: 'cfm', label: 'Momentum part of the thrust coefficient', sym: 'C_{F,m}', dim: 'none', digits: 4, info: { doc: 'isentropic' } },
    { id: 'cfp', label: 'Pressure part of the thrust coefficient', sym: 'C_{F,p}', dim: 'none', digits: 4, info: { tex: 'C_{F,p}=\\frac{p_e-p_a}{p_c}\\,\\varepsilon', doc: 'thrust' } },
    { id: 'pStar', label: 'Throat pressure', sym: 'p_t', ...PRES, info: { tex: 'p_t=p_c\\left(\\frac{2}{\\gamma+1}\\right)^{\\frac{\\gamma}{\\gamma-1}}', text: 'The ambient pressure must stay below this for the throat to be sonic.', doc: 'isentropic' } },
    { id: 'cfVac', label: 'Thrust coefficient in vacuum', sym: 'C_{F,vac}', dim: 'none', digits: 4, info: { doc: 'thrust' } },
    { id: 'thrustVac', label: 'Thrust in vacuum', sym: 'T_{vac}', ...FORCE, info: { doc: 'thrust' } },
    { id: 'epsOpt', label: 'Expansion ratio for ideal expansion ($p_e=p_a$)', sym: '\\varepsilon_{opt}', dim: 'none', digits: 4, when: (v, out) => Number.isFinite(out?.o?.epsOpt),
      info: { text: 'The expansion ratio that makes $p_e=p_a$. It gives the largest one-dimensional thrust coefficient at this ambient pressure; with the Malina factor the best ratio is slightly smaller.', doc: 'thrust' } },
    { id: 'cfOpt', label: 'Thrust coefficient at ideal expansion', sym: 'C_{F,opt}', dim: 'none', digits: 4, info: { doc: 'thrust' } },
    { id: 'epsSep', label: 'Expansion ratio at which the jet separates', sym: '\\varepsilon_{sep}', dim: 'none', digits: 4, when: (v, out) => Number.isFinite(out?.o?.epsSep),
      info: { text: 'Above this expansion ratio the exit pressure falls below 0.4 $p_a$ and the flow separates from the wall.', doc: 'separation' } },
    { id: 'At', label: 'Throat area', sym: 'A_t', ...AREA, info: { tex: 'A_t=\\frac{\\pi d_t^2}{4}', doc: 'thrust' } },
    { id: 'de', label: 'Exit diameter', sym: 'd_e', ...LEN, info: { tex: 'd_e=d_t\\sqrt\\varepsilon', doc: 'malina' } },
    { id: 'Ld', label: 'Length of the diverging cone', sym: 'L_d', ...LEN, info: { tex: 'L_d=\\frac{d_e-d_t}{2\\tan\\alpha}', doc: 'malina' } },
  ],
  compute(v) {
    const pStar = v.pc * throatRatio(v.g);
    if (v.pa >= pStar) throw new InputError('The ambient pressure is at or above the throat pressure, so the throat cannot reach sound speed: raise the chamber pressure or lower the ambient pressure.');
    const o = nozzle(v);
    o.pa = v.pa;
    o.state = Math.abs(o.pe / v.pa - 1) < 0.02 ? 'ideally expanded' : o.pe > v.pa ? 'under-expanded' : 'over-expanded';
    const warnings = [];
    if (o.separated) warnings.push({ level: 'warn', text: `The exit pressure is below 0.4 $p_a$: the jet will separate from the nozzle wall, unevenly, and the thrust coefficient shown is not reliable. Use an expansion ratio below ${fmt(o.epsSep, { digits: 3 })} or a higher chamber pressure.` });
    if (o.cf3D <= 0) warnings.push({ level: 'warn', text: 'The ambient pressure on the exit area outweighs the jet momentum, so the nozzle gives no thrust: use a smaller expansion ratio.' });
    const results = {
      cf: o.cf3D, thrust: o.thrust, Me: o.Me, pe: o.pe, cf1D: o.cf1D, lambda: o.lambda, cfm: o.momentum, cfp: o.pressure, pStar: o.pStar, cfVac: o.cfVac, thrustVac: o.thrustVac,
      epsOpt: o.epsOpt, cfOpt: o.cfOpt, epsSep: o.epsSep, At: o.At, de: o.de, Ld: o.Ld,
    };
    return { results, warnings, o };
  },
  plots: [
    {
      id: 'eps', title: 'Thrust coefficient vs expansion ratio',
      info: { text: 'Thrust coefficient for your gas, half angle and pressures as the expansion ratio changes. At your ambient pressure the one-dimensional value peaks where $p_e=p_a$; in vacuum it keeps rising. Beyond the separation line the jet leaves the wall and the curve no longer applies.', doc: 'thrust' },
      build(v, out) {
        const o = out.o, pac = v.pa / v.pc;
        const top = Math.min(1000, Math.max(2 * v.eps, Number.isFinite(o.epsOpt) ? 1.6 * o.epsOpt : 0, 4));
        const series = [{ name: 'C_F', points: [] }, { name: 'C_{F,1D}', points: [], dashed: true }, { name: 'C_{F,vac}', points: [], dashed: true, color: 'var(--text-3)' }];
        for (let i = 0; i <= 160; i++) {
          const e = 1 + ((top - 1) * i) / 160, c = cf(v.g, e, pac, v.alpha);
          series[0].points.push([e, c.cf3D]); series[1].points.push([e, c.cf1D]); series[2].points.push([e, cf(v.g, e, 0, v.alpha).cf3D]);
        }
        const vlines = [];
        if (Number.isFinite(o.epsOpt) && o.epsOpt <= top) vlines.push({ x: o.epsOpt, label: 'p_e = p_a', color: 'var(--text-3)' });
        if (Number.isFinite(o.epsSep) && o.epsSep <= top) vlines.push({ x: o.epsSep, label: 'separation', color: 'var(--red-text)' });
        return { x: { label: 'Expansion ratio \\varepsilon' }, y: { label: 'Thrust coefficient C_F' }, series, vlines, markers: [{ x: v.eps, y: o.cf3D, label: 'design' }] };
      },
    },
    {
      id: 'pa', title: 'Thrust vs ambient pressure',
      info: { text: 'Thrust of your nozzle from vacuum up to the ambient pressure at which the jet would separate (or the throat stops being sonic). It falls in a straight line because the exit flow does not change; only the back-pressure on the exit area does.', doc: 'separation' },
      build(v, out, { U }) {
        const o = out.o, up = U(PRES), uf = U(FORCE);
        const top = Math.min(o.pStar, Math.max(1.5 * v.pa, 3 * o.pe)), pts = [];
        for (let i = 0; i <= 60; i++) { const pa = (top * i) / 60; pts.push([up.v(pa), uf.v(cf(v.g, v.eps, pa / v.pc, v.alpha).cf3D * v.pc * o.At)]); }
        const sep = 2.5 * o.pe;
        return { x: { label: 'Ambient pressure p_a', unit: up.label }, y: { label: 'Thrust T', unit: uf.label }, includeZero: true, series: [{ name: 'T', points: pts }],
          vlines: sep <= top ? [{ x: up.v(sep), label: 'separation', color: 'var(--red-text)' }] : [],
          markers: [{ x: up.v(v.pa), y: uf.v(o.thrust), label: 'design' }] };
      },
    },
    {
      id: 'alpha', title: 'Divergence loss vs half angle',
      info: { text: 'Malina’s factor and the resulting thrust coefficient against the cone half angle, for your expansion ratio and pressures. A 15° cone loses under 2 % of the jet momentum.', doc: 'malina' },
      build(v, out) {
        const c = cf(v.g, v.eps, v.pa / v.pc, 0), ptsL = [], ptsC = [];
        for (let i = 0; i <= 60; i++) { const a = i; ptsL.push([a, malina(a)]); ptsC.push([a, malina(a) * c.momentum + c.pressure]); }
        return { x: { label: 'Half angle \\alpha', unit: '{}^{\\circ}' }, y: { label: 'Factor' }, series: [{ name: '\\lambda', points: ptsL }, { name: 'C_F', points: ptsC }],
          markers: [{ x: v.alpha, y: out.o.cf3D, label: 'design' }] };
      },
    },
  ],
  schematicTitle: 'Nozzle section',
  schematicHint: 'Drag the exit lip to change the expansion ratio (up and down) and the half angle (along the axis)',
  schematic(ctx, v, out) {
    const W = 760, H = 330, o = out.o;
    const fr = ctx.frame({ width: W, height: H, label: 'Nozzle section with throat, cone and exit' });
    const g = fr.layer('main'); g.replaceChildren();
    const ul = ctx.U(LEN), L = (x) => `${fmt(ul.v(x), { digits: 3 })} ${ul.label}`;
    const rt = v.dt / 2, re = o.de / 2, rc = 2 * rt, Lc = rc - rt;       // convergent drawn as a 45° cone from 2 r_t (context only)
    const k = Math.min(520 / (Lc + o.Ld), 250 / (2 * Math.max(re, rc))), cy = 160;
    const x0 = 120, xt = x0 + Lc * k, xe = xt + o.Ld * k;
    const Y = (r) => cy - r * k, Yb = (r) => cy + r * k;
    g.append(s('line', { x1: x0 - 50, x2: xe + 140, y1: cy, y2: cy, class: 'sc-thin', 'stroke-dasharray': '8 4 2 4' }));
    // convergent (context) and chamber stub
    for (const side of [Y, Yb]) {
      g.append(s('path', { d: path([[x0 - 40, side(rc)], [x0, side(rc)], [xt, side(rt)]]), class: 'sc-thin', fill: 'none', 'stroke-dasharray': '4 3' }));
      g.append(s('path', { d: path([[xt, side(rt)], [xe, side(re)]]), class: 'sc-line', fill: 'none', 'stroke-width': 2.4, 'data-field': 'alpha eps' }));
    }
    // gas fill of the diverging section
    g.append(s('path', { d: path([[xt, Y(rt)], [xe, Y(re)], [xe, Yb(re)], [xt, Yb(rt)]], true), fill: 'var(--series-1)', 'fill-opacity': 0.1, stroke: 'none' }));
    // throat and exit planes
    g.append(s('line', { x1: xt, x2: xt, y1: Y(rt), y2: Yb(rt), class: 'sc-thin', 'data-field': 'dt' }));
    g.append(s('line', { x1: xe, x2: xe, y1: Y(re), y2: Yb(re), class: 'sc-thin', 'data-field': 'eps' }));
    // exhaust plume: flares when under-expanded, necks when over-expanded (sketch)
    const tilt = Math.max(-0.35, Math.min(0.35, 0.12 * Math.log(Math.max(1e-6, o.pe / Math.max(v.pa, 1e-9 * v.pc)))));
    const pl = Math.min(120, W - xe - 20), rp = Math.max(4, re * k + tilt * pl);
    g.append(s('path', { d: `M${xe},${Y(re)} Q${xe + pl / 2},${cy - (re * k + tilt * pl / 2)} ${xe + pl},${cy - rp} M${xe},${Yb(re)} Q${xe + pl / 2},${cy + (re * k + tilt * pl / 2)} ${xe + pl},${cy + rp}`, class: 'sc-thin', fill: 'none', 'stroke-dasharray': '3 3', stroke: 'var(--series-1)' }));
    g.append(s('path', { d: `M${xe + 10},${cy} L${xe + Math.min(90, pl - 10)},${cy}`, class: 'sc-accent', 'marker-end': fr.arrow('acc') }));
    // dimensions
    g.append(dim(fr, xt, Yb(rt), xt, Y(rt), null, { field: 'dt' }));
    g.append(text(xt - 8, cy - 6, `d_t = ${L(v.dt)}`, { anchor: 'end', size: 11, field: 'dt' }));
    g.append(dim(fr, xe, Yb(re), xe, Y(re), null, { field: 'eps' }));
    g.append(text(xe - 8, cy - 6, `d_e = ${L(o.de)}`, { anchor: 'end', size: 11, field: 'eps' }));
    g.append(dim(fr, xt, Yb(Math.max(re, rc)), xe, Yb(Math.max(re, rc)), `L_d = ${L(o.Ld)}`, { off: -22, field: 'alpha' }));
    // half angle arc at the throat (upper wall)
    const ar = Math.min(60, 0.6 * o.Ld * k), aR = v.alpha * RAD;
    g.append(s('line', { x1: xt, x2: xt + ar + 12, y1: Y(rt), y2: Y(rt), class: 'sc-thin', opacity: 0.7, 'data-field': 'alpha' }));
    g.append(s('path', { d: `M${xt + ar},${Y(rt)} A${ar},${ar} 0 0 0 ${xt + ar * Math.cos(aR)},${Y(rt) - ar * Math.sin(aR)}`, class: 'sc-accent', fill: 'none', 'data-field': 'alpha' }));
    g.append(text(xt + ar + 6, Y(rt) - 6, `\\alpha = ${fmt(v.alpha, { digits: 3 })}°`, { size: 11, field: 'alpha' }));
    const up = ctx.U(PRES), P = (x) => `${fmt(up.v(x), { digits: 3 })} ${up.label}`;
    g.append(text(20, 24, `ε = ${fmt(v.eps, { digits: 4 })} · M_e = ${fmt(o.Me, { digits: 3 })}`, { size: 11, field: 'eps' }));
    g.append(text(20, 42, `p_e = ${P(o.pe)} · p_a = ${P(v.pa)}${v.pa > 0 ? ` · ${o.state}` : ''}`, { size: 11, field: 'pa pc' }));
    g.append(text(20, H - 12, 'solid: diverging cone (to scale) · dashed: convergent section for context and plume sketch', { cls: 'sc-dim-text', size: 10 }));
    if (o.separated) g.append(text(xe - 6, Y(re) - 10, 'separation', { anchor: 'end', size: 11, cls: 'sc-dim-text' }));
    ctx.handle('lip', xe, Y(re), {
      field: 'eps', title: 'Drag to change the expansion ratio and the half angle',
      onDrag: (sx, sy) => {
        const r = Math.max(rt * 1.0005, (cy - sy) / k), len = Math.max(1e-6, (sx - xt) / k);
        ctx.setValue('eps', (r / rt) ** 2);
        ctx.setValue('alpha', Math.atan((r - rt) / len) / RAD);
      },
      onKey: (dx, dy) => { if (dy) ctx.setValue('eps', v.eps * (1 + 0.05 * dy)); if (dx) ctx.setValue('alpha', v.alpha - 0.5 * dx); },
    });
  },
  symbols: {
    '\\gamma': 'ratio of specific heats of the exhaust gas', '\\varepsilon': 'expansion ratio $A_e/A_t$', '\\alpha': 'divergence half angle of the cone', p_c: 'chamber pressure', p_a: 'ambient pressure',
    p_e: 'exit pressure', p_t: 'throat pressure', M_e: 'exit Mach number', '\\lambda': 'divergence factor of the cone (Malina)', C_F: 'thrust coefficient with the Malina correction', 'C_{F,1D}': 'one-dimensional thrust coefficient',
    'C_{F,m}': 'momentum part of the one-dimensional thrust coefficient', 'C_{F,p}': 'pressure part of the thrust coefficient', T: 'thrust', A_t: 'throat area', A_e: 'exit area', d_t: 'throat diameter', d_e: 'exit diameter', L_d: 'length of the diverging cone',
  },
  report(v, out, R) {
    const o = out.o, n = R.n, g = v.g, p = (x) => R.v(x, PRES);
    const steps = [
      { label: 'Throat pressure (the throat is sonic when $p_a<p_t$)', lhs: 'p_t', eq: 'p_c\\left(\\frac{2}{\\gamma+1}\\right)^{\\frac{\\gamma}{\\gamma-1}}', sub: `${p(v.pc)}\\left(\\frac{2}{${n(g)}+1}\\right)^{\\frac{${n(g)}}{${n(g)}-1}}`, res: R.Q(o.pStar, PRES) },
      { label: 'Exit Mach number: supersonic root of the area–Mach relation', eq: '\\varepsilon=\\frac{1}{M_e}\\left[\\frac{2}{\\gamma+1}\\left(1+\\frac{\\gamma-1}{2}M_e^2\\right)\\right]^{\\frac{\\gamma+1}{2(\\gamma-1)}}', res: `M_e=${n(o.Me, 6)}` },
      { label: 'Exit pressure', lhs: 'p_e', eq: 'p_c\\left(1+\\frac{\\gamma-1}{2}M_e^2\\right)^{-\\frac{\\gamma}{\\gamma-1}}', sub: `${p(v.pc)}\\left(1+\\frac{${n(g)}-1}{2}\\times${n(o.Me)}^2\\right)^{-\\frac{${n(g)}}{${n(g)}-1}}`, res: R.Q(o.pe, PRES) },
      { label: 'Momentum part of the thrust coefficient', lhs: 'C_{F,m}', eq: '\\sqrt{\\frac{2\\gamma^2}{\\gamma-1}\\left(\\frac{2}{\\gamma+1}\\right)^{\\frac{\\gamma+1}{\\gamma-1}}\\left[1-\\left(\\frac{p_e}{p_c}\\right)^{\\frac{\\gamma-1}{\\gamma}}\\right]}',
        sub: `${n(cfInfinity(g))}\\times\\sqrt{1-\\left(\\frac{${p(o.pe)}}{${p(v.pc)}}\\right)^{\\frac{${n(g)}-1}{${n(g)}}}}`, res: n(o.momentum) },
      { label: 'Pressure part of the thrust coefficient', lhs: 'C_{F,p}', eq: '\\frac{p_e-p_a}{p_c}\\,\\varepsilon', sub: `\\frac{${p(o.pe)}-${p(v.pa)}}{${p(v.pc)}}\\times${n(v.eps)}`, res: n(o.pressure) },
      { label: 'One-dimensional thrust coefficient', lhs: 'C_{F,1D}', eq: 'C_{F,m}+C_{F,p}', sub: `${n(o.momentum)}+(${n(o.pressure)})`, res: n(o.cf1D) },
      { label: 'Malina divergence factor of the conical nozzle', lhs: '\\lambda', eq: '\\frac{1+\\cos\\,\\alpha}{2}', sub: `\\frac{1+\\cos ${n(v.alpha)}^{\\circ}}{2}`, res: n(o.lambda, 6) },
      { label: 'Thrust coefficient with the Malina correction', lhs: 'C_F', eq: '\\lambda\\,C_{F,m}+C_{F,p}', sub: `${n(o.lambda, 6)}\\times${n(o.momentum)}+(${n(o.pressure)})`, res: n(o.cf3D) },
      { label: 'Throat area', lhs: 'A_t', eq: '\\frac{\\pi d_t^2}{4}', sub: `\\frac{\\pi\\,(${R.v(v.dt, LEN)})^2}{4}`, res: R.Q(o.At, AREA) },
      { label: 'Thrust', lhs: 'T', eq: 'C_F\\,p_c\\,A_t', sub: R.us ? `${n(o.cf3D)}\\times${R.Q(v.pc, PRES)}\\times${R.Q(o.At, AREA)}` : `${n(o.cf3D)}\\times${n(R.raw(v.pc, PRES) * 1e3)}\\,\\mathrm{Pa}\\times${n(R.raw(o.At, AREA) * 1e-6)}\\,\\mathrm{m^{2}}`, res: R.Q(o.thrust, FORCE) },
    ];
    return [{
      title: 'Theory',
      text: 'The exhaust is treated as a perfect gas with constant ratio of specific heats $\\gamma$ flowing steadily and isentropically from the chamber at pressure $p_c$ through a sonic throat (NACA Report 1135). The expansion ratio $\\varepsilon=A_e/A_t$ fixes the exit Mach number $M_e$ and the exit pressure $p_e$. The thrust is the jet momentum plus the pressure difference $p_e-p_a$ on the exit area, and the thrust coefficient is $C_F=T/(p_cA_t)$. In a conical nozzle of half angle $\\alpha$ the gas leaves along rays from the cone apex, so only the fraction $\\lambda=(1+\\cos\\alpha)/2$ of the momentum is axial (Malina).',
      steps,
    }];
  },
  reportNotes: ['The jet separates from the wall when the exit pressure falls below about 0.4 times the ambient pressure; the thrust coefficient is then not valid.'],
  references: [],
  examples: [
    { name: 'Air, ε 6, 15° cone, 600 psi at sea level', values: { g: 1.4, dt: 1, eps: 6, alpha: 15, pc: 600, pa: 14.7 } },
    { name: 'Same nozzle in vacuum', values: { g: 1.4, dt: 1, eps: 6, alpha: 15, pc: 600, pa: 0 } },
    { name: 'Solid motor, 7 MPa, ε 8 at sea level', values: { g: 1.2, dt: 0.75, eps: 8, alpha: 15, pc: 1015, pa: 14.7 } },
    { name: 'Over-expanded: ε 25 at sea level', values: { g: 1.2, dt: 0.75, eps: 25, alpha: 15, pc: 500, pa: 14.7 } },
  ],
};
