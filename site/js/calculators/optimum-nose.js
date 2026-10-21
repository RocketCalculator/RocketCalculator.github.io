// Optimum Nose Shape — UI definition.
import { superellipse, noseCp, optimumExponent } from '../calc/optnose.js';
import { karmanTsien } from '../calc/nosepressure.js';
import { noseRadius } from '../calc/noseShapes.js';
import { s, fmt, InputError } from '../util.js';
import { text, path, dim } from '../ui/svg.js';

const LEN = { dim: 'length', internal: 'in' };
const NONE = { dim: 'none' };

/** The compared noses for length L and radius R: profile functions z → r. */
function shapes(L, R, n, nOpt) {
  return [
    { id: 'cone', label: 'Cone', f: (z) => noseRadius('cone', z, L, R) },
    { id: 'ogive', label: 'Tangent ogive', f: (z) => noseRadius('ogive', z, L, R) },
    { id: 'vk', label: 'Von Kármán', f: (z) => noseRadius('vonkarman', z, L, R) },
    { id: 'se', label: `Superellipse n = ${fmt(n, { digits: 3 })}`, f: (z) => superellipse(z, L, R, n) },
    { id: 'opt', label: `Optimum superellipse n = ${fmt(nOpt, { digits: 3 })}`, f: (z) => superellipse(z, L, R, nOpt) },
  ];
}

export default {
  slug: 'optimum-nose',
  topic: 'optimum-nose-shape',
  title: 'Optimum Nose Shape',
  subtitle: 'The <b>subsonic nose shape</b> that keeps the pressure dip behind the shoulder smallest — for the highest critical Mach number and the gentlest pressure rise.',
  intro: {
    what: 'Compares cone, tangent-ogive, Von Kármán and superellipse noses of your length and radius, and finds the superellipse exponent that makes the minimum pressure behind the shoulder as small as possible.',
    why: 'The smaller that suction peak, the higher the critical Mach number and the weaker the adverse pressure gradient on the body — so the boundary layer holds on longer at angle of attack and vortices that can cause roll lock-in form later.',
    when: 'Choosing a nose for a rocket that flies at high subsonic speed, or checking how much a better nose would gain over an ogive or cone.',
  },
  info: {
    text: [
      'Each nose sits on a long cylinder; its zero-angle-of-attack pressure follows from Munk’s line sources, as in the Nose Pressure Distribution calculator.',
      'A superellipse nose, $(r/R)^n+(1-z/L)^n=1$, runs from a cone ($n=1$) through an ellipse ($n=2$). Scanning $n$ finds the exponent with the smallest suction peak.',
      'The minimum pressure sets the critical Mach number through the Kármán–Tsien rule.',
    ],
    tex: '\\left(\\frac{r}{R}\\right)^n+\\left(1-\\frac{z}{L_n}\\right)^n=1',
    steps: ['Enter the nose length and the body radius.', 'Enter the flight Mach number.', 'Read the optimum exponent and how it compares with the standard shapes.', 'Try your own exponent to see how sensitive the result is.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'nose', title: 'Nose',
      fields: [
        { id: 'noseL', shared: 'noseL', label: 'Nose length', sym: 'L_n', ...LEN, default: 36, min: 0, minExclusive: true, info: { text: 'Length from the tip to the shoulder.', doc: 'overview' } },
        { id: 'R', shared: 'bodyR', label: 'Body radius', sym: 'R', ...LEN, default: 3, min: 0, minExclusive: true, info: { text: 'Radius of the body tube behind the nose. The fineness ratio is $L_n/D=L_n/2R$.', doc: 'overview' } },
        { id: 'n', label: 'Your superellipse exponent', sym: 'n', ...NONE, default: 1.6, min: 1, max: 4, slider: { min: 1, max: 4, step: 0.05 },
          info: { text: 'Exponent of a superellipse nose to compare: 1 is a cone, 2 an ellipse; larger values give a blunter shoulder-free nose.', range: '1.6 was suggested as a good match to the optimum; the best value depends on the fineness ratio.', doc: 'superellipse' } },
        { id: 'M', label: 'Mach number', sym: 'M_\\infty', ...NONE, default: 0.8, min: 0, max: 0.95, slider: { min: 0, max: 0.95, step: 0.01 }, info: { text: 'Free-stream Mach number for the compressible pressures.', doc: 'compress' } },
      ],
    },
  ],
  results: [
    { id: 'nOpt', label: 'Optimum superellipse exponent', sym: 'n^*', ...NONE, key: true, digits: 3, note: (x, out) => `for fineness ${fmt(out.fin, { digits: 3 })}`,
      info: { text: 'Exponent whose superellipse nose has the least negative minimum pressure coefficient at this fineness ratio.', doc: 'superellipse' } },
    { id: 'cpOpt', label: 'Minimum pressure, optimum nose', sym: 'C_{p0,min}^*', ...NONE, key: true, digits: 4,
      note: (x, out) => `${fmt((1 - x / out.byId.ogive.cp0Min) * 100, { digits: 3 })} % less suction than the ogive`, info: { doc: 'overview' } },
    { id: 'McrOpt', label: 'Critical Mach number, optimum nose', sym: 'M_{cr}^*', ...NONE, key: true, digits: 4, status: (x, out, v) => (v.M < x ? 'ok' : 'warn'),
      note: (x, out) => `ogive ${fmt(out.byId.ogive.Mcr, { digits: 3 })} · cone ${fmt(out.byId.cone.Mcr, { digits: 3 })}`, info: { doc: 'compress' } },
    { id: 'cpM', label: 'Minimum pressure at your Mach number', sym: 'C_{p,min}^*', ...NONE, key: true, digits: 4, note: (x, out, v) => (v.M < out.o.McrOpt ? 'subcritical' : 'beyond critical'),
      info: { tex: 'C_p=\\frac{C_{p0}}{\\beta+\\frac{C_{p0}}{2}(1-\\beta)}', doc: 'compress' } },
    ...['cone', 'ogive', 'vk', 'se'].flatMap((id) => [
      { id: `cp_${id}`, label: `Minimum pressure, ${({ cone: 'cone', ogive: 'tangent ogive', vk: 'Von Kármán', se: 'your superellipse' })[id]}`, sym: `C_{p0,min}`, ...NONE, digits: 4, info: { doc: 'overview' } },
      { id: `mcr_${id}`, label: `Critical Mach number, ${({ cone: 'cone', ogive: 'tangent ogive', vk: 'Von Kármán', se: 'your superellipse' })[id]}`, sym: 'M_{cr}', ...NONE, digits: 4, info: { doc: 'compress' } },
    ]),
  ],
  compute(v) {
    const fin = v.noseL / (2 * v.R);
    if (fin < 0.5) throw new InputError('The nose is shorter than half a diameter; the slender-body method does not apply. Lengthen the nose.');
    const nOpt = optimumExponent(v.noseL, v.R), list = shapes(v.noseL, v.R, v.n, nOpt);
    const byId = Object.fromEntries(list.map((sh) => [sh.id, noseCp(sh.f, v.noseL, v.R, v.M)]));
    const warnings = [];
    if (fin < 2) warnings.push({ level: 'info', text: 'Short, blunt noses (fineness below 2) are at the edge of the slender-body method; treat the comparison as rough.' });
    if (v.M >= byId.opt.Mcr) warnings.push({ level: 'warn', text: `Even the optimum nose is supercritical at this Mach number (M_cr ${fmt(byId.opt.Mcr, { digits: 3 })}); a shock forms behind the shoulder.` });
    const results = { nOpt, cpOpt: byId.opt.cp0Min, McrOpt: byId.opt.Mcr, cpM: byId.opt.cpMin };
    for (const id of ['cone', 'ogive', 'vk', 'se']) { results[`cp_${id}`] = byId[id].cp0Min; results[`mcr_${id}`] = byId[id].Mcr; }
    return { results, warnings, o: { McrOpt: byId.opt.Mcr }, byId, list, fin, nOpt };
  },
  plots: [
    {
      id: 'cp', title: 'Pressure along the nose and body',
      info: { text: 'Incompressible pressure coefficient behind the tip for each nose, out to three diameters past the shoulder. The optimum keeps the dip behind the shoulder smallest and the recovery gentlest.', doc: 'overview' },
      build(v, out, { U }) {
        const ul = U(LEN), zTop = v.noseL + 6 * v.R;
        const series = out.list.map((sh) => {
          const o = out.byId[sh.id], pts = [];
          for (let i = 1; i <= o.iBase && i * o.dz <= zTop; i++) pts.push([ul.v(i * o.dz), o.cp0[i]]);
          return { name: sh.label, points: pts, dashed: sh.id !== 'opt' && sh.id !== 'se', color: sh.id === 'opt' ? 'var(--red)' : sh.id === 'se' ? 'var(--series-2)' : 'var(--text-3)', width: sh.id === 'opt' ? 2.6 : 1.6 };
        });
        return { x: { label: 'Station from the tip $z$', unit: ul.label }, y: { label: 'Incompressible $C_{p0}$' }, series, vlines: [{ x: ul.v(v.noseL), label: 'shoulder', color: 'var(--text-3)' }] };
      },
    },
    {
      id: 'exp', title: 'Minimum pressure against exponent',
      info: { text: 'Minimum pressure coefficient of superellipse noses of your fineness as the exponent changes. Too pointed (small $n$) and the shoulder is sharp; too blunt (large $n$) and the tip region speeds the flow up.', doc: 'superellipse' },
      build(v, out) {
        const pts = [];
        for (let i = 0; i <= 30; i++) { const n = 1.05 + (2.95 * i) / 30; pts.push([n, noseCp((z) => superellipse(z, v.noseL, v.R, n), v.noseL, v.R).cp0Min]); }
        return { x: { label: 'Superellipse exponent $n$' }, y: { label: '$C_{p0,min}$' }, series: [{ name: 'C_{p0,min}', points: pts, smooth: true }],
          markers: [{ x: out.nOpt, y: out.byId.opt.cp0Min, label: 'optimum' }, { x: v.n, y: out.byId.se.cp0Min, label: 'yours', color: 'var(--text-2)' }] };
      },
    },
    {
      id: 'fineness', title: 'Critical Mach number against fineness',
      info: { text: 'Critical Mach number of each family as the nose gets longer for the same body (Felkel’s Figure 11). The superellipse uses the optimum exponent of your design throughout.', doc: 'compress' },
      build(v, out) {
        const fams = [['cone', 'Cone', (z, L) => noseRadius('cone', z, L, v.R)], ['ogive', 'Tangent ogive', (z, L) => noseRadius('ogive', z, L, v.R)], ['opt', `Superellipse n = ${fmt(out.nOpt, { digits: 3 })}`, (z, L) => superellipse(z, L, v.R, out.nOpt)]];
        const series = fams.map(([id, name, f]) => {
          const pts = [];
          for (let i = 0; i <= 12; i++) { const fin = 2 + i * 0.5, L = fin * 2 * v.R; pts.push([fin, noseCp((z) => f(z, L), L, v.R).Mcr]); }
          return { name, points: pts, smooth: true, dots: true, dashed: id !== 'opt', color: { opt: 'var(--red)', ogive: 'var(--series-2)', cone: 'var(--text-3)' }[id] };
        });
        return { x: { label: 'Fineness ratio $L_n/D$' }, y: { label: 'Critical Mach number $M_{cr}$' }, series, markers: [{ x: out.fin, y: out.byId.opt.Mcr, label: 'design' }] };
      },
    },
  ],
  schematicTitle: 'Nose profiles compared',
  schematicHint: 'Upper halves of the noses on a common shoulder (radius exaggerated); the optimum in red, your superellipse in ink. Drag the shoulder to change the nose length',
  schematic(ctx, v, out) {
    const W = 760, H = 320;
    const fr = ctx.frame({ width: W, height: H, label: 'Nose profiles of the compared shapes' });
    const g = fr.layer('main'); g.replaceChildren();
    // radius exaggerated so the shapes can be told apart
    const ul = ctx.U(LEN), zEnd = v.noseL + 4 * v.R, x0 = 40, k = 680 / zEnd, kr = Math.max(k, Math.min(150 / v.R, 4 * k)), axis = 250, X = (z) => x0 + z * k, Y = (r) => axis - r * kr;
    g.append(s('line', { x1: x0 - 10, x2: X(zEnd) + 10, y1: axis, y2: axis, class: 'sc-thin', 'stroke-dasharray': '10 4 2 4' }));
    g.append(s('path', { d: `M${X(v.noseL)},${Y(v.R)}H${X(zEnd)}V${axis}`, class: 'sc-line', fill: 'none' }));
    const order = ['cone', 'ogive', 'vk', 'se', 'opt'];
    for (const id of order) {
      const sh = out.list.find((q) => q.id === id), pts = [];
      for (let i = 0; i <= 80; i++) { const z = (v.noseL * i) / 80; pts.push([X(z), Y(sh.f(z))]); }
      const style = id === 'opt' ? { stroke: 'var(--red)', 'stroke-width': 2.6 } : id === 'se' ? { stroke: 'var(--text)', 'stroke-width': 1.8 } : { stroke: 'var(--text-3)', 'stroke-width': 1.2, 'stroke-dasharray': '4 3' };
      g.append(s('path', { d: path(pts), fill: 'none', ...style, 'data-field': id === 'se' ? 'n' : 'noseL R' }));
    }
    // labels at a third of the nose length, stacked by radius
    const zl = v.noseL * 0.3;
    order.map((id) => ({ id, r: out.list.find((q) => q.id === id).f(zl) })).sort((a, b) => b.r - a.r).forEach((q, i) => {
      const sh = out.list.find((x) => x.id === q.id), cp = out.byId[q.id].cp0Min;
      g.append(text(x0, 22 + i * 16, `${sh.label}: C_{p0,min} = ${fmt(cp, { digits: 3 })}`, { size: 10.5, cls: q.id === 'opt' ? 'sc-dim-text' : 'sc-label', field: q.id === 'se' ? 'n' : null }));
    });
    g.append(dim(fr, x0, axis + 22, X(v.noseL), axis + 22, `L_n = ${fmt(ul.v(v.noseL), { digits: 3 })} ${ul.label} · L_n/D = ${fmt(out.fin, { digits: 3 })}`, { textOff: 16, field: 'noseL' }));
    g.append(text(20, H - 6, `radius drawn ×${fmt(kr / k, { digits: 2 })}; dashed: standard shapes`, { size: 10, cls: 'sc-dim-text' }));
    ctx.handle('shoulder', X(v.noseL), Y(v.R), {
      field: 'noseL', title: 'Drag along the axis to change the nose length',
      onDrag: (sx) => ctx.setValue('noseL', Math.max(v.R, (sx - x0) / k), { round: 0.5 }),
      onKey: (dx) => ctx.setValue('noseL', Math.max(v.R, v.noseL + 0.5 * dx)),
    });
  },
  symbols: {
    r: 'nose radius', R: 'body radius', z: 'station from the tip', L_n: 'nose length', n: 'superellipse exponent', 'n^*': 'optimum superellipse exponent', D: 'body diameter',
    'C_{p0}': 'incompressible pressure coefficient', C_p: 'pressure coefficient', 'C_{p0,min}': 'minimum incompressible pressure coefficient', 'C_{p0,min}^*': 'minimum incompressible pressure coefficient of the optimum nose',
    '\\beta': 'compressibility factor', 'M_\\infty': 'free-stream Mach number', 'M_{cr}': 'critical Mach number', 'M_{cr}^*': 'critical Mach number of the optimum nose', '\\gamma': 'ratio of specific heats',
  },
  report(v, out, R) {
    const n = R.n, opt = out.byId.opt, b = Math.sqrt(1 - v.M ** 2);
    const steps = [
      { label: 'Fineness ratio', lhs: '\\frac{L_n}{D}', eq: '\\frac{L_n}{2R}', sub: `\\frac{${R.v(v.noseL, LEN)}}{2\\times${R.v(v.R, LEN)}}`, res: n(out.fin) },
      { label: 'Superellipse nose profile', eq: '\\left(\\frac{r}{R}\\right)^n+\\left(1-\\frac{z}{L_n}\\right)^n=1' },
      { label: 'Exponent with the least negative minimum pressure (line-source pressures, searched over $1<n\\le4$)', lhs: 'n^*', res: n(out.nOpt) },
      { label: 'Its minimum incompressible pressure coefficient', lhs: 'C_{p0,min}^*', res: n(opt.cp0Min) },
      { label: 'At the flight Mach number (Kármán–Tsien)', lhs: 'C_{p,min}^*', eq: '\\frac{C_{p0,min}^*}{\\beta+\\frac{C_{p0,min}^*}{2}(1-\\beta)}', sub: `\\frac{${n(opt.cp0Min)}}{${n(b)}+\\frac{${n(opt.cp0Min)}}{2}(1-${n(b)})}`, res: n(karmanTsien(opt.cp0Min, v.M)) },
      { label: 'Critical Mach number, where that minimum becomes sonic', lhs: 'M_{cr}^*', eq: 'C_p(C_{p0,min}^*,M_{cr}^*)=C_p^*(M_{cr}^*)', res: n(opt.Mcr) },
    ];
    return [{
      title: 'Theory',
      text: 'Each nose is placed on a long cylinder and its zero-angle-of-attack pressure is found by superposing line sources of strength $2\\pi Ur\\,dr/dz$ (Munk). The best nose keeps the minimum pressure behind the shoulder closest to zero, which gives the highest critical Mach number and the weakest adverse gradient (Felkel; Hoult).',
      steps,
    }];
  },
  references: ['aiaafelkel3', 'local-sonic-flow', 'nose-pressure-distro4'],
  examples: [
    { name: '36 in nose on a 6 in body (L/D = 6)', values: { noseL: 36, R: 3, n: 1.6, M: 0.8 } },
    { name: 'Stubby nose, L/D = 3', values: { noseL: 36, R: 6, n: 1.6, M: 0.8 } },
    { name: 'Long nose, L/D = 8, at M = 0.9', values: { noseL: 48, R: 3, n: 1.6, M: 0.9 } },
  ],
};
