// Launcher Rail Deflection — UI definition.
import { launcher, lateralLoads, tipSlope, maxLength } from '../calc/launcher.js';
import { s, fmt, InputError } from '../util.js';
import { dim, text, path } from '../ui/svg.js';

const LEN = { dim: 'length', internal: 'in' };
const RAIL = { dim: 'distance', internal: 'in' };
const FORCE = { dim: 'force', internal: 'lbf' };
const MASS = { dim: 'mass', internal: 'lbm' };
const MOD = { dim: 'modulus', internal: 'psi' };
const AI = { dim: 'areaInertia', internal: 'in4' };
const RAD = Math.PI / 180;
const tower = (v) => v.section === 'tower', custom = (v) => v.section === 'custom';
const deg = (x, d = 3) => `${fmt(x, { digits: d })}°`;

const inputs = (v) => ({ W: v.W, T: v.T, sigmaDeg: v.sigma, k: v.k, QE: v.QE, L: v.L, E: v.E, section: v.section, D: v.D, t: v.t, d: v.d, I: v.I, factor: v.factor, allowDeg: v.allow });

export default {
  slug: 'launcher-deflection',
  topic: 'new-launcher',
  title: 'Launcher Rail Deflection',
  subtitle: 'How much a <b>launcher rail bends</b> as the rocket rides up it, and the longest rail that keeps the tip-off error within bounds.',
  intro: {
    what: 'Treats the launcher rail and its supporting truss as a cantilever loaded by the rocket’s weight component and thrust misalignment just before it leaves, and gives the tip slope — the change in launch angle — and the longest acceptable rail.',
    why: 'The rail tip slope adds directly to the quadrant elevation and azimuth errors. A flexible rail undoes the care spent on wind compensation and adds to impact dispersion.',
    when: 'Designing or buying a launcher, choosing a rail length, or checking a heavier rocket on an existing launcher.',
  },
  info: {
    text: [
      'Just before the rocket leaves the rail, its weight component across the rail (and any thrust misalignment) acts at the rail tip, so the bending is greatest then.',
      'The rail and its truss bend as a cantilever from the base. The tip slope $FL^2/2EI$ is doubled to allow for the dynamic overshoot of a load applied in about the rail’s own bending period.',
      'The weight component, which never changes, is usually far larger than the thrust misalignment.',
    ],
    tex: '\\theta_{tip}=k_d\\frac{FL^2}{2EI},\\qquad F=W\\cos QE+n_\\sigma T\\sigma_\\delta',
    steps: ['Enter the rocket weight, thrust and thrust misalignment.', 'Enter the rail length and elevation.', 'Describe the support truss (or its second moment of area).', 'Read the tip slope and the longest acceptable rail.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'rocket', title: 'Rocket',
      fields: [
        { id: 'W', label: 'Rocket weight at launch', sym: 'W', ...MASS, default: 55, min: 0, minExclusive: true, info: { text: 'Lift-off weight carried by the launch lugs.', doc: 'loads' } },
        { id: 'T', label: 'Thrust', sym: 'T', ...FORCE, default: 400, min: 0, info: { text: 'Motor thrust while on the rail.', doc: 'loads' } },
        { id: 'sigma', label: 'Thrust misalignment (1σ)', sym: '\\sigma_\\delta', dim: 'angle', default: 0.1, min: 0, max: 5, slider: { min: 0, max: 0.5, step: 0.01 },
          info: { text: 'Standard deviation of the thrust misalignment angle.', range: 'About 0.1° for well-made solid motors (Ammons and Hoult’s standardised perturbations).', doc: 'loads' } },
        { id: 'k', label: 'Standard deviations to cover', sym: 'n_\\sigma', dim: 'none', default: 3, min: 0, max: 6, slider: { min: 0, max: 4, step: 0.5 }, info: { text: 'Design to this many standard deviations of misalignment; 3 covers 99.7 % of motors.', doc: 'loads' } },
      ],
    },
    {
      id: 'rail', title: 'Launcher',
      fields: [
        { id: 'L', label: 'Rail length', sym: 'L', ...RAIL, default: 240, min: 0, minExclusive: true, slider: { min: 60, max: 600, step: 6 },
          info: { text: 'Length of the cantilevered rail and truss from its base to its tip.', range: 'Ham-radio tower sections come in 10 ft lengths; 20 ft (two sections) is common.', doc: 'beam' } },
        { id: 'QE', label: 'Quadrant elevation', sym: 'QE', dim: 'angle', default: 80, min: 0, max: 90, slider: { min: 60, max: 90, step: 0.5 }, info: { text: 'Elevation of the rail above the horizontal.', doc: 'loads' } },
        { id: 'section', label: 'Support structure', kind: 'select', default: 'tower', options: [{ value: 'tower', label: 'Three-tube tower' }, { value: 'custom', label: 'Enter I directly' }],
          info: { text: 'A ham-radio tower: three steel tubes on a triangle, joined by welded zig-zag rods. The rods add little bending stiffness, so the tubes carry it. Or enter the second moment of area of any other section.', doc: 'section' } },
        { id: 'd', label: 'Tower face width', sym: 'd', ...LEN, default: 12.5, min: 0, minExclusive: true, when: tower, info: { text: 'Distance between tube centres along one face of the triangle.', doc: 'section' } },
        { id: 'D', label: 'Tube outside diameter', sym: 'D', ...LEN, default: 1.25, min: 0, minExclusive: true, when: tower, info: { doc: 'section' } },
        { id: 't', label: 'Tube wall thickness', sym: 't', ...LEN, default: 0.065, min: 0, minExclusive: true, when: tower, info: { doc: 'section' } },
        { id: 'I', label: 'Second moment of area', sym: 'I', ...AI, default: 247, min: 0, minExclusive: true, when: custom, info: { text: 'Bending second moment of area of the rail and its support about the bending axis.', doc: 'section' } },
        { id: 'E', label: 'Young’s modulus', sym: 'E', ...MOD, default: 29e6, min: 0, minExclusive: true, info: { text: 'Steel about 29 Mpsi (200 GPa); aluminium 10 Mpsi (69 GPa).', doc: 'beam' } },
      ],
    },
    {
      id: 'req', title: 'Requirement',
      fields: [
        { id: 'allow', label: 'Allowed tip slope', sym: '\\theta_{max}', dim: 'angle', default: 0.1, min: 0, minExclusive: true, max: 5, slider: { min: 0.01, max: 0.5, step: 0.01 },
          info: { text: 'Largest acceptable rail tip slope at launch.', range: '0.1° is a good rule of thumb; the CSULB launcher was specified to 0.05° at QE 80°.', doc: 'overview' } },
        { id: 'factor', label: 'Dynamic overshoot factor', sym: 'k_d', dim: 'none', default: 2, min: 1, max: 3, info: { text: 'The load comes on in about the rail’s bending period, so the beam overshoots its static deflection. A factor of 2 is the classic value for a suddenly applied load.', doc: 'beam' } },
      ],
    },
  ],
  results: [
    { id: 'pitchDeg', label: 'Tip slope in pitch', sym: '\\theta_{pitch}', dim: 'angle', key: true, digits: 4, status: (x, out, v) => (x <= v.allow ? 'ok' : 'warn'),
      note: (x, out, v) => (x <= v.allow ? `within ${deg(v.allow)}` : `over ${deg(v.allow)}`), info: { text: 'Rail tip slope in the vertical plane at the moment the rocket leaves: an error in quadrant elevation.', tex: '\\theta=k_d\\frac{FL^2}{2EI}', doc: 'beam' } },
    { id: 'Lmax', label: 'Longest acceptable rail', sym: 'L_{max}', ...RAIL, key: true, digits: 4, note: (x, out, v) => `${fmt((v.L / x) * 100, { digits: 3 })} % used`,
      info: { tex: 'L_{max}=\\sqrt{\\frac{2EI\\,\\theta_{max}}{k_dF}}', doc: 'beam' } },
    { id: 'Fp', label: 'Lateral load in pitch', sym: 'F', ...FORCE, key: true, digits: 4, note: (x, out) => `weight ${fmt(out.o.F.weight / x * 100, { digits: 3 })} %`, info: { tex: 'F=W\\cos QE+n_\\sigma T\\sigma_\\delta', doc: 'loads' } },
    { id: 'yawDeg', label: 'Tip slope in yaw', sym: '\\theta_{yaw}', dim: 'angle', key: true, digits: 4, note: () => 'thrust misalignment only', info: { tex: '\\theta_{yaw}=k_d\\frac{n_\\sigma T\\sigma_\\delta L^2}{2EI}', doc: 'beam' } },
    { id: 'tip', label: 'Tip deflection in pitch', sym: 'y_{tip}', ...LEN, digits: 4, info: { tex: 'y=k_d\\frac{FL^3}{3EI}', doc: 'beam' } },
    { id: 'Fw', label: 'Weight component across the rail', sym: 'W\\cos QE', ...FORCE, digits: 4, info: { doc: 'loads' } },
    { id: 'Ft', label: 'Thrust misalignment load', sym: 'n_\\sigma T\\sigma_\\delta', ...FORCE, digits: 4, info: { doc: 'loads' } },
    { id: 'I', label: 'Second moment of area', sym: 'I', ...AI, digits: 4, info: { tex: 'I=\\frac{\\pi Dt\\,d^2}{2}', doc: 'section' } },
    { id: 'EI', label: 'Bending stiffness', sym: 'EI', dim: 'stiffness', internal: 'lbfin2', digits: 4, info: { doc: 'beam' } },
  ],
  compute(v) {
    if (v.section === 'tower' && !(v.D > 2 * v.t)) throw new InputError('The tube wall must be thinner than half the tube diameter.');
    if (v.section === 'tower' && !(v.d > v.D)) throw new InputError('The tower face must be wider than one tube.');
    const o = launcher(inputs(v));
    const warnings = [];
    if (o.pitchDeg > v.allow) warnings.push({ level: 'warn', text: `The rail tip slope is ${deg(o.pitchDeg)}, over the ${deg(v.allow)} allowed. Shorten the rail to ${fmt(o.Lmax / 12, { digits: 3 })} ft or less, or stiffen the support.` });
    if (v.QE > 89.9) warnings.push({ level: 'info', text: 'Near-vertical rails carry almost no weight component; only the thrust misalignment bends them.' });
    const results = { pitchDeg: o.pitchDeg, Lmax: o.Lmax, Fp: o.F.pitch, yawDeg: o.yawDeg, tip: o.tip, Fw: o.F.weight, Ft: o.F.thrust, I: o.I, EI: o.EI };
    if (!Number.isFinite(o.Lmax)) results.Lmax = 'no limit';
    return { results, warnings, o };
  },
  plots: [
    {
      id: 'length', title: 'Tip slope against rail length',
      info: { text: 'Pitch-plane tip slope against rail length for your elevation and two others, as in the memo. It grows with the square of the length; the red line is the allowance.', doc: 'beam' },
      build(v, out, { U }) {
        const ur = U(RAIL), top = Math.max(2 * v.L, 480), qes = [...new Set([v.QE, 80, 85])].sort((a, b) => a - b);
        const series = qes.map((QE, i) => {
          const F = lateralLoads({ W: v.W, T: v.T, sigmaDeg: v.sigma, k: v.k, QE }).pitch, pts = [];
          for (let j = 0; j <= 60; j++) { const L = (top * j) / 60; pts.push([ur.v(L), tipSlope(F, L, out.o.EI, v.factor) / RAD]); }
          return { name: QE === v.QE ? `QE ${fmt(QE, { digits: 3 })}° (yours)` : `QE ${QE}°`, points: pts, smooth: true, dashed: QE !== v.QE, color: QE === v.QE ? null : i ? 'var(--text-3)' : 'var(--series-2)' };
        });
        return { x: { label: 'Rail length $L$', unit: ur.label }, y: { label: 'Tip slope', unit: '{}^{\\circ}' }, yDomain: [0, Math.max(3 * v.allow, 1.2 * out.o.pitchDeg)], series,
          hlines: [{ y: v.allow, label: 'allowed', color: 'var(--red-text)' }], markers: [{ x: ur.v(v.L), y: out.o.pitchDeg, label: 'design' }] };
      },
    },
    {
      id: 'qe', title: 'Tip slope against elevation',
      info: { text: 'Pitch and yaw tip slopes as the rail is raised. The weight component falls as $\\cos QE$, so steep launches bend the rail far less; the yaw slope comes from thrust misalignment alone.', doc: 'loads' },
      build(v, out) {
        const p = [], y = [];
        for (let i = 0; i <= 60; i++) { const QE = 60 + (30 * i) / 60, o = launcher({ ...inputs(v), QE }); p.push([QE, o.pitchDeg]); y.push([QE, o.yawDeg]); }
        return { x: { label: 'Quadrant elevation $QE$', unit: '{}^{\\circ}' }, y: { label: 'Tip slope', unit: '{}^{\\circ}' }, includeZero: true,
          series: [{ name: 'pitch', points: p, smooth: true }, { name: 'yaw', points: y, dashed: true }], hlines: [{ y: v.allow, label: 'allowed', color: 'var(--red-text)' }],
          markers: [{ x: v.QE, y: out.o.pitchDeg, label: 'design' }] };
      },
    },
    {
      id: 'weight', title: 'Longest rail against rocket weight',
      info: { text: 'Longest acceptable rail at your elevation for heavier or lighter rockets on the same support.', doc: 'beam' },
      build(v, out, { U }) {
        const ur = U(RAIL), um = U(MASS), pts = [];
        for (let i = 1; i <= 60; i++) { const W = (3 * v.W * i) / 60, F = lateralLoads({ W, T: v.T, sigmaDeg: v.sigma, k: v.k, QE: v.QE }).pitch; pts.push([um.v(W), ur.v(maxLength(F, out.o.EI, v.allow * RAD, v.factor))]); }
        return { x: { label: 'Rocket weight $W$', unit: um.label }, y: { label: 'Longest rail $L_{max}$', unit: ur.label }, includeZero: true, series: [{ name: 'L_{max}', points: pts, smooth: true }],
          hlines: [{ y: ur.v(v.L), label: 'your rail', color: 'var(--text-3)' }], markers: Number.isFinite(out.o.Lmax) ? [{ x: um.v(v.W), y: ur.v(out.o.Lmax), label: 'design' }] : [] };
      },
    },
  ],
  schematicTitle: 'Launcher rail at the moment of tip-off',
  schematicHint: 'Side view: the truss at its elevation with the rocket at the tip and the bent rail (exaggerated). Inset: the tower cross-section. Drag the rail tip to change the length',
  schematic(ctx, v, out) {
    const W = 760, H = 380, o = out.o;
    const fr = ctx.frame({ width: W, height: H, label: 'Launcher rail and truss at tip-off, and the tower cross-section' });
    const g = fr.layer('main'); g.replaceChildren();
    const ur = ctx.U(RAIL), ul = ctx.U(LEN), uf = ctx.U(FORCE), Lr = (x) => `${fmt(ur.v(x), { digits: 3 })} ${ur.label}`, Ll = (x) => `${fmt(ul.v(x), { digits: 3 })} ${ul.label}`;
    // side view: base at (bx, by); rail along the QE direction, length to scale against the truss depth
    const bx = 110, by = 330, Lp = 300, k = Lp / v.L, qe = v.QE * RAD, ux = Math.cos(qe), uy = -Math.sin(qe), nx = -uy, ny = ux;   // n: across the rail, downhill side
    const depth = Math.max(6, Math.min(40, (v.section === 'tower' ? (v.d * Math.sqrt(3)) / 2 : 10) * k));
    const P = (s, n) => [bx + ux * s + nx * n, by + uy * s + ny * n];
    g.append(s('line', { x1: 20, x2: 470, y1: by, y2: by, class: 'sc-line' }));
    for (let x = 24; x < 470; x += 12) g.append(s('line', { x1: x, y1: by, x2: x - 8, y2: by + 8, class: 'sc-thin', 'stroke-opacity': 0.5 }));
    g.append(s('rect', { x: bx - 34, y: by - 14, width: 68, height: 14, class: 'sc-body-2' }));
    // straight truss (reference) and its zig-zag
    const a = [P(0, 0), P(Lp, 0)], b = [P(0, depth), P(Lp, depth)];
    g.append(s('path', { d: path(a) + path(b), class: 'sc-thin', 'stroke-dasharray': '3 3', opacity: 0.7 }));
    // bent shape, exaggerated so the tip slope reads clearly
    const ex = Math.max(1, Math.min(400, 6 / Math.max(1e-9, o.pitchDeg))), defl = (s) => { const u = s / Lp; return (o.tip * k * ex * (3 * u * u - u ** 3)) / 2; };
    const top = [], bot = [], zig = [];
    for (let i = 0; i <= 40; i++) { const sx = (Lp * i) / 40, dy = defl(sx); top.push(P(sx, dy)); bot.push(P(sx, depth + dy)); zig.push(P(sx, (i % 2 ? depth : 0) + dy)); }
    g.append(s('path', { d: path(top), fill: 'none', stroke: 'var(--text)', 'stroke-width': 2, 'data-field': 'L E d D t I' }));
    g.append(s('path', { d: path(bot), fill: 'none', stroke: 'var(--text)', 'stroke-width': 2, 'data-field': 'L E d D t I' }));
    g.append(s('path', { d: path(zig), fill: 'none', class: 'sc-thin' }));
    // rocket riding on the rail tip (upper side)
    const tipS = Lp, tipN = defl(tipS), tp = P(tipS, tipN), slope = Math.atan2(defl(Lp) - defl(Lp - 4), 4), ang = Math.atan2(uy, ux) * 180 / Math.PI + slope * 180 / Math.PI;
    const rl = 70, rr = 7;
    const gr = s('g', { transform: `translate(${tp[0]} ${tp[1]}) rotate(${ang})` });
    // rocket on the upper side of the rail (frame y points downhill), its aft lug at the tip
    const yc = -rr - 3;
    gr.append(s('path', { d: `M${-rl * 0.82},${yc - rr}H${rl * 0.02}Q${rl * 0.13},${yc - rr} ${rl * 0.2},${yc}Q${rl * 0.13},${yc + rr} ${rl * 0.02},${yc + rr}H${-rl * 0.82}Z`, class: 'sc-body', 'data-field': 'W' }));
    gr.append(s('path', { d: `M${-rl * 0.82},${yc - rr}l-8,-7v${2 * rr + 14}l8,-7`, class: 'sc-body-2' }));
    g.append(gr);
    // lateral load at the tip and the tip slope
    const fl = 46, fp = [tp[0] + nx * 4, tp[1] + ny * 4];
    g.append(s('line', { x1: fp[0], y1: fp[1], x2: fp[0] + nx * fl, y2: fp[1] + ny * fl, class: 'sc-accent', 'stroke-width': 2.2, 'marker-end': fr.arrow('acc'), 'data-field': 'W T sigma k QE' }));
    g.append(text(fp[0] + nx * fl + 8, fp[1] + ny * fl + 4, `F = ${fmt(uf.v(o.F.pitch), { digits: 3 })} ${uf.label}`, { size: 11, field: 'W T sigma k QE' }));
    g.append(text(tp[0] + 10, tp[1] - 26, `tip slope ${deg(o.pitchDeg, 3)} (drawn ×${fmt(ex, { digits: 2 })})`, { size: 11, field: 'L' }));
    // QE arc at the base
    const ar = 54;
    g.append(s('path', { d: `M${bx + ar},${by} A${ar},${ar} 0 0 0 ${bx + ar * Math.cos(qe)},${by - ar * Math.sin(qe)}`, class: 'sc-thin', fill: 'none' }));
    g.append(text(bx + ar + 8, by - 10, `QE = ${deg(v.QE, 3)}`, { size: 11, field: 'QE' }));
    g.append(dim(fr, ...P(0, -18), ...P(Lp, -18), `L = ${Lr(v.L)}`, { field: 'L' }));
    // cross-section inset (tower)
    const cx = 610, cy = 170;
    if (v.section === 'tower') {
      const s2 = 150 / v.d, side = v.d * s2, h = (side * Math.sqrt(3)) / 2, rt = Math.max(5, (v.D / 2) * s2);
      const A1 = [cx - side / 2, cy - h / 3], B1 = [cx + side / 2, cy - h / 3], C1 = [cx, cy + (2 * h) / 3];
      g.append(s('path', { d: path([A1, B1, C1], true), class: 'sc-thin', fill: 'none' }));
      for (const [x, y] of [A1, B1, C1]) { g.append(s('circle', { cx: x, cy: y, r: rt, class: 'sc-body', 'data-field': 'D t' })); g.append(s('circle', { cx: x, cy: y, r: Math.max(1, rt - Math.max(1.2, v.t * s2)), fill: 'var(--surface)' })); }
      g.append(s('line', { x1: cx - side / 2 - 20, x2: cx + side / 2 + 20, y1: cy, y2: cy, class: 'sc-thin', 'stroke-dasharray': '8 3 2 3' }));
      g.append(text(cx - side / 2 - 22, cy - 6, 'neutral axis', { size: 10, cls: 'sc-dim-text' }));
      g.append(dim(fr, A1[0], A1[1], B1[0], B1[1], `d = ${Ll(v.d)}`, { off: 22, textOff: -6, field: 'd' }));
      g.append(text(C1[0] + rt + 6, C1[1] + 4, `D = ${Ll(v.D)}, t = ${Ll(v.t)}`, { size: 10.5, field: 'D t' }));
      g.append(text(cx, cy + h + 26, 'tower cross-section', { anchor: 'middle', size: 10.5, cls: 'sc-dim-text' }));
    } else {
      g.append(text(cx, cy, `I = ${fmt(ctx.U(AI).v(v.I), { digits: 4 })} ${ctx.U(AI).label}`, { anchor: 'middle', size: 12, field: 'I' }));
    }
    g.append(text(20, H - 8, 'bending exaggerated; dashed: unloaded rail', { size: 10, cls: 'sc-dim-text' }));
    ctx.handle('tip', ...P(Lp, depth / 2), {
      field: 'L', title: 'Drag along the rail to change its length',
      onDrag: (sx, sy) => { const sAlong = (sx - bx) * ux + (sy - by) * uy; ctx.setValue('L', Math.max(12, (sAlong / Lp) * v.L), { round: 1 }); },
      onKey: (dx) => ctx.setValue('L', Math.max(12, v.L * (1 + 0.05 * dx)), { round: 1 }),
    });
  },
  symbols: {
    E: 'Young’s modulus', I: 'second moment of area of the rail support', EI: 'bending stiffness', y: 'rail deflection', x: 'distance along the rail from its base', F: 'lateral load at the rail tip', L: 'rail length',
    T: 'thrust', '\\sigma_\\delta': 'standard deviation of the thrust misalignment', 'n_\\sigma': 'number of standard deviations', W: 'rocket weight', QE: 'quadrant elevation', k_d: 'dynamic overshoot factor',
    A: 'cross-section area of one tube', D: 'tube outside diameter', t: 'tube wall thickness', d: 'tower face width', '\\theta': 'rail tip slope', '\\theta_{max}': 'allowed tip slope', 'L_{max}': 'longest acceptable rail', y_tip: 'tip deflection',
  },
  report(v, out, R) {
    const o = out.o, n = R.n, Q = R.Q;
    const steps = [
      { label: 'Weight component across the rail', lhs: 'W\\cos QE', sub: `${R.v(v.W, MASS)}\\times\\cos ${n(v.QE)}^\\circ`, res: Q(o.F.weight, FORCE) },
      { label: 'Thrust misalignment load', lhs: 'n_\\sigma T\\sigma_\\delta', sub: `${n(v.k)}\\times${R.v(v.T, FORCE)}\\times${n(v.sigma * RAD)}`, res: Q(o.F.thrust, FORCE) },
      { label: 'Lateral load in pitch', lhs: 'F', eq: 'W\\cos QE+n_\\sigma T\\sigma_\\delta', res: Q(o.F.pitch, FORCE) },
    ];
    if (v.section === 'tower') steps.push({ label: 'Second moment of area of the three-tube tower ($A=\\pi Dt$)', lhs: 'I', eq: '\\frac{\\pi D\\,t\\,d^2}{2}', sub: `\\frac{\\pi\\times${R.v(v.D, LEN)}\\times${R.v(v.t, LEN)}\\times${R.v(v.d, LEN)}^2}{2}`, res: Q(o.I, AI) });
    // slope in consistent units: lbf, in, psi (US) or N, m, Pa (SI)
    const [fF, fL, fE] = R.us ? [1, 1, 1] : [4.4482216152605, 0.0254, 6894.757293168];
    steps.push({ label: 'Tip slope in pitch (cantilever with dynamic overshoot)', lhs: '\\theta_{pitch}', eq: 'k_d\\frac{FL^2}{2EI}',
      sub: `${n(v.factor)}\\times\\frac{${n(o.F.pitch * fF)}\\times${n(v.L * fL)}^2}{2\\times${n(v.E * fE)}\\times${n(o.I * fL ** 4)}}`, res: `${n(o.pitchDeg * RAD)}\\,\\mathrm{rad}=${n(o.pitchDeg)}^\\circ` },
      { label: 'Longest rail that meets the allowed slope', lhs: 'L_{max}', eq: '\\sqrt{\\frac{2EI\\,\\theta_{max}}{k_dF}}', res: Number.isFinite(o.Lmax) ? Q(o.Lmax, RAIL) : '\\infty' });
    return [{
      title: 'Theory',
      text: 'The rail is cantilevered from its base. Just before the rocket separates, the largest bending moment acts over the greatest length: $EI\\,d^2y/dx^2=F(L-x)$, which gives the tip slope $FL^2/2EI$. It is doubled for dynamic overshoot. The lateral load is the weight component $W\\cos QE$ plus the thrust misalignment. For a three-tube tower the tubes carry the bending: $I=Ad^2/2$ with $A=\\pi Dt$ (Hoult).',
      steps,
    }];
  },
  references: ['launcher-tipoff-deflection', 'a-new-launcher', 'standardized-perturbation-values-orig'],
  examples: [
    { name: 'Gold Rush II on a 20 ft tower rail, QE 80°', values: { W: 55, T: 400, sigma: 0.1, k: 3, L: 240, QE: 80, section: 'tower', d: 12.5, D: 1.25, t: 0.065, E: 29e6, allow: 0.1, factor: 2 } },
    { name: 'Same rocket, 10 ft rail', values: { W: 55, T: 400, sigma: 0.1, k: 3, L: 120, QE: 80, section: 'tower', d: 12.5, D: 1.25, t: 0.065, E: 29e6, allow: 0.1, factor: 2 } },
    { name: 'Heavy rocket (150 lb), CSULB requirement 0.05°', values: { W: 150, T: 1200, sigma: 0.1, k: 3, L: 240, QE: 80, section: 'tower', d: 12.5, D: 1.25, t: 0.065, E: 29e6, allow: 0.05, factor: 2 } },
  ],
};
