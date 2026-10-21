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
  schematicHint: 'Drag the exit lip to change the expansion ratio (up and down) and the half angle (along the axis). The shading follows the static pressure; the plume flares when under-expanded and necks when over-expanded',
  schematic(ctx, v, out) {
    const W = 760, H = 392, o = out.o;
    const fr = ctx.frame({ width: W, height: H, label: 'Nozzle half-section: chamber, throat, diverging cone and exhaust' });
    const g = fr.layer('main'); g.replaceChildren();
    const ul = ctx.U(LEN), L = (x) => `${fmt(ul.v(x), { digits: 3 })} ${ul.label}`;
    const up = ctx.U(PRES), P = (x) => `${fmt(up.v(x), { digits: 3 })} ${up.label}`;
    // to scale: throat and diverging cone. Context: chamber (2.2 r_t), 45° convergent with a rounded throat entry
    const rt = v.dt / 2, re = o.de / 2, rc = 2.2 * rt, Lcv = (rc - rt) * 1.15;
    const k = Math.min(430 / (Lcv + o.Ld), 108 / Math.max(re, rc)), cy = 196;
    const xt = 150 + Math.max(0, (430 - (Lcv + o.Ld) * k) / 2) + Lcv * k, xe = xt + o.Ld * k, xcv = xt - Lcv * k, xc = xcv - 70;
    const tw = Math.min(12, Math.max(5, 0.2 * rt * k));                     // wall thickness on screen
    const tanA = Math.tan(v.alpha * RAD);
    // inner wall radius (model units) along x (screen): chamber, convergent with a smooth throat entry, cone
    const xr = xt - 0.35 * Lcv * k;                                         // start of the throat rounding
    const rIn = (x) => {
      if (x <= xcv) return rc;
      if (x >= xt) return rt + ((x - xt) / k) * tanA;
      const lin = (x) => rc - ((rc - rt) * (x - xcv)) / (xt - xcv) * 1.15;
      if (x <= xr) return Math.max(rt, lin(x));
      const r0 = Math.max(rt, lin(xr)), u = (x - xr) / (xt - xr);          // quadratic blend to a level tangent at the throat
      return r0 + (rt - r0) * (2 * u - u * u);
    };
    const xs = [];
    for (let i = 0; i <= 24; i++) xs.push(xc + ((xcv - xc) * i) / 24);
    for (let i = 1; i <= 40; i++) xs.push(xcv + ((xt - xcv) * i) / 40);
    for (let i = 1; i <= 60; i++) xs.push(xt + ((xe - xt) * i) / 60);
    const inner = xs.map((x) => [x, rIn(x) * k]);
    // gas, shaded by static pressure: subsonic part blends p_c → p*, the cone uses the Mach number of its local area ratio
    const pAt = (x, r) => (x <= xcv ? 1 : x < xt ? 1 - (1 - o.pStar / v.pc) * ((x - xcv) / (xt - xcv)) ** 2 : cf(v.g, (r / rt) ** 2, 0).pec);
    for (let i = 0; i < inner.length - 1; i++) {
      const [xa, ha] = inner[i], [xb, hb] = inner[i + 1];
      const pr = pAt((xa + xb) / 2, rIn((xa + xb) / 2));
      // crisp edges: no anti-aliased seams between slices (the walls cover the jagged top and bottom)
      g.append(s('path', { d: path([[xa, cy - ha - 1], [xb, cy - hb - 1], [xb, cy + hb + 1], [xa, cy + ha + 1]], true), fill: 'var(--red)', 'fill-opacity': (0.05 + 0.3 * pr ** 0.45).toFixed(3), stroke: 'none', 'shape-rendering': 'crispEdges' }));
    }
    // exhaust plume: flares when under-expanded, necks when over-expanded; leaves the wall early if the jet separates
    const sepR = o.separated ? Math.min(re, rt * Math.sqrt(o.epsSep)) : re, xs0 = o.separated ? xt + ((sepR - rt) / tanA) * k : xe;
    const pl = W - 30 - xe, tilt = Math.max(-0.5, Math.min(0.5, 0.35 * Math.log(Math.max(1e-6, o.pe / Math.max(v.pa, 1e-9 * v.pc)))));
    const hp = (f) => Math.max(0.35 * sepR * k, sepR * k + tilt * pl * f * (1.3 - f));
    const plume = [[xs0, sepR * k]]; for (let i = 1; i <= 20; i++) { const f = i / 20; plume.push([xe + pl * f, hp(f)]); }
    g.append(s('path', { d: path([...plume.map(([x, h]) => [x, cy - h]), ...plume.reverse().map(([x, h]) => [x, cy + h])], true), fill: 'var(--red)', 'fill-opacity': 0.05, stroke: 'var(--red)', 'stroke-opacity': 0.45, 'stroke-dasharray': '4 3', 'data-field': 'pa' }));
    g.append(s('path', { d: `M${xe + 14},${cy}H${xe + Math.min(110, pl - 10)}`, class: 'sc-accent', 'marker-end': fr.arrow('acc') }));
    // walls with thickness (upper and lower), drawn over the gas
    for (const sg of [-1, 1]) {
      const wall = [...inner.map(([x, h]) => [x, cy + sg * h]), ...inner.slice().reverse().map(([x, h]) => [x, cy + sg * (h + tw)])];
      g.append(s('path', { d: path(wall, true), class: 'sc-body-2', 'data-field': 'dt alpha eps' }));
    }
    // break line on the cut chamber
    const hc = rc * k + tw + 4, zig = [];
    for (let i = 0; i <= 8; i++) zig.push([xc + (i % 2 ? -5 : 0) + (i % 4 === 1 ? 10 : 0), cy - hc + (2 * hc * i) / 8]);
    g.append(s('path', { d: path(zig), class: 'sc-thin' }));
    g.append(s('line', { x1: xc - 20, x2: W - 24, y1: cy, y2: cy, class: 'sc-thin', 'stroke-dasharray': '10 4 2 4' }));
    // throat and exit planes
    g.append(s('line', { x1: xt, x2: xt, y1: cy - rt * k, y2: cy + rt * k, class: 'sc-thin', 'stroke-dasharray': '3 3', 'data-field': 'dt' }));
    g.append(s('line', { x1: xe, x2: xe, y1: cy - re * k, y2: cy + re * k, class: 'sc-thin', 'stroke-dasharray': '3 3', 'data-field': 'eps' }));
    // stations: label above, leader down to the wall
    const top = cy - Math.max(rc, re) * k - tw;
    // label x may be moved apart from the station x (min 105 px between labels); the leader then slants to the wall
    const station = (lx, x, y0, lines, field) => {
      g.append(s('path', { d: path([[lx, top - 14], [lx, top - 8], [x, Math.max(top - 2, y0 - 12)], [x, y0 - 3]]), class: 'sc-thin', fill: 'none', opacity: 0.6, 'data-field': field }));
      lines.forEach((t, i) => g.append(text(lx, top - 50 + i * 15, t, { anchor: 'middle', size: i ? 10.5 : 11, cls: i ? 'sc-dim-text' : 'sc-label', field })));
    };
    const sx = (xc + xcv) / 2;
    station(Math.min(sx, xt - 105), sx, cy - rc * k - tw, ['chamber', `p_c = ${P(v.pc)}`, `\\gamma = ${fmt(v.g, { digits: 3 })}`], 'pc g');
    station(xt, xt, cy - rt * k - tw, ['throat', 'M = 1', `p^* = ${P(o.pStar)}`], 'dt');
    station(Math.max(xe, xt + 105), xe, cy - re * k - tw, ['exit', `M_e = ${fmt(o.Me, { digits: 3 })}`, `p_e = ${P(o.pe)}`], 'eps');
    const amb = v.pa > 0 ? (o.separated ? 'jet separates' : o.state) : 'vacuum';
    g.append(text(W - 24, top - 50, 'ambient', { anchor: 'end', size: 11, field: 'pa' }));
    g.append(text(W - 24, top - 35, `p_a = ${P(v.pa)}`, { anchor: 'end', size: 10.5, cls: 'sc-dim-text', field: 'pa' }));
    g.append(text(W - 24, top - 20, amb, { anchor: 'end', size: 10.5, cls: 'sc-dim-text', field: 'pa' }));
    if (o.separated) {
      g.append(s('circle', { cx: xs0, cy: cy - sepR * k, r: 4, fill: 'none', stroke: 'var(--red)', 'stroke-width': 1.5 }));
      g.append(text(xs0 - 8, cy - sepR * k - tw - 6, 'separation', { anchor: 'end', size: 10.5, cls: 'sc-dim-text', field: 'pa' }));
    }
    // half angle at the throat (upper wall)
    const ar = Math.min(56, 0.55 * o.Ld * k), aR = v.alpha * RAD, ya = cy - rt * k;
    g.append(s('line', { x1: xt, x2: xt + ar + 10, y1: ya, y2: ya, class: 'sc-thin', opacity: 0.7, 'data-field': 'alpha' }));
    g.append(s('path', { d: `M${xt + ar},${ya} A${ar},${ar} 0 0 0 ${xt + ar * Math.cos(aR)},${ya - ar * Math.sin(aR)}`, class: 'sc-accent', fill: 'none', 'data-field': 'alpha' }));
    g.append(text(xt + ar + 6, ya + 4, `\\alpha = ${fmt(v.alpha, { digits: 3 })}°`, { size: 11, field: 'alpha' }));
    // dimensions, all outside the gas
    const bot = cy + Math.max(rc, re) * k + tw;
    g.append(dim(fr, xt, bot, xe, bot, `L_d = ${L(o.Ld)}`, { off: 22, textOff: 16, field: 'alpha' }));
    g.append(dim(fr, xt, cy + rt * k, xt, cy - rt * k, null, { field: 'dt' }));
    g.append(text(xt - 10, bot + 26, `d_t = ${L(v.dt)}`, { anchor: 'end', size: 11, field: 'dt' }));
    g.append(dim(fr, xe, cy + re * k, xe, cy - re * k, null, { field: 'eps' }));
    g.append(text(xe + 10, bot + 26, `d_e = ${L(o.de)} · \\varepsilon = ${fmt(v.eps, { digits: 4 })}`, { size: 11, field: 'eps' }));
    g.append(text(24, H - 12, 'to scale: throat and diverging cone · chamber, convergent and plume for context · shading: static pressure', { cls: 'sc-dim-text', size: 10 }));
    ctx.handle('lip', xe, cy - re * k, {
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
