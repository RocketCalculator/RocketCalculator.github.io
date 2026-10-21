// Upper-Stage Divergence (body static aeroelasticity) — UI definition.
import { divergence, qdTube, qdJoint, amplification, trimAmplification } from '../calc/divergence.js';
import { s, fmt, InputError } from '../util.js';
import { dim, text, path, pointMarker } from '../ui/svg.js';

const LEN = { dim: 'length', internal: 'in' };
const PRES = { dim: 'pressure', internal: 'psf', units: { si: 'kPa', us: 'psf' } };
const MOD = { dim: 'modulus', internal: 'psi' };
const COMP = { dim: 'compliance', internal: 'radperlbin' };
const PERRAD = { dim: 'perAngle', internal: 'perrad' };
const tube = (v) => v.mode === 'tube', joint = (v) => v.mode === 'joint', trimmed = (v) => !!v.trim;
const amp = (x) => (Number.isFinite(x) ? fmt(x, { digits: 4 }) : 'diverges');

function model(v) {
  return { mode: v.mode, E: v.E, R: v.R, t: v.t, l: v.l, CNa: v.CNa, C: v.C, xj: v.xj, q: v.q,
    trim: v.trim ? { x1: v.x1, CN1a: v.CN1a, x2: v.x2, CN2a: v.CN2a, x3: v.x3 } : null };
}

export default {
  slug: 'upper-stage-divergence',
  topic: 'body-aeroelasticity',
  title: 'Upper-Stage Divergence',
  subtitle: 'How close a long, flexible <b>upper stage or payload joint</b> comes to bending until it breaks under its own nose load.',
  intro: {
    what: 'Gives the divergence dynamic pressure of a flexible upper stage (a thin-walled tube cantilevered from the booster) or of a flexible payload joint, the factor by which nose loads grow below it, and the longest stage that stays safe.',
    why: 'The nose load bends the upper stage, the bending raises the nose angle of attack, and that raises the load again. Near the divergence dynamic pressure the loop runs away: early Nike-Cajun rockets with long heavy payloads snapped just before first-stage burnout.',
    when: 'Sizing the tube wall and length of an upper stage or dart, checking a payload joint, or before increasing the maximum dynamic pressure of a design.',
  },
  info: {
    text: [
      'The upper stage acts as a cantilever from the stiff booster, loaded at the nose centre of pressure. Its bending adds the nose slope $dy/dx$ to the angle of attack there.',
      'Solving the beam equation, the nose load becomes $qS\\,C_{NN\\alpha}\\alpha\\,q_D/(q_D-q)$: it grows without limit as $q$ approaches the divergence dynamic pressure $q_D$.',
      'A flexible joint between payload and body behaves the same way with its own $q_D$.',
    ],
    tex: 'q_D=\\frac{2EI}{S\\,C_{NN\\alpha}l^2},\\qquad \\frac{N_N}{N_{N,rigid}}=\\frac{q_D}{q_D-q}',
    steps: ['Choose a flexible tube or a flexible joint.', 'Enter the tube (or joint) properties and the nose normal-force slope.', 'Enter the dynamic pressure, usually the maximum in flight.', 'Read the divergence dynamic pressure, the load amplification and the margin.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'stage', title: 'Upper stage',
      fields: [
        { id: 'mode', label: 'Flexibility', kind: 'select', default: 'tube', options: [{ value: 'tube', label: 'Flexible tube' }, { value: 'joint', label: 'Flexible joint' }],
          info: { text: 'Flexible tube: the whole upper stage bends as a thin-walled tube. Flexible joint: the vehicle is rigid except for one joint (for example payload to body) that rotates in proportion to its bending moment.', doc: 'joint' } },
        { id: 'R', label: 'Tube radius', sym: 'R', ...LEN, default: 3.375, min: 0, minExclusive: true, info: { text: 'Radius of the upper-stage tube. The reference area is $S=\\pi R^2$.', doc: 'tube' } },
        { id: 'E', label: 'Young’s modulus of the tube', sym: 'E', ...MOD, default: 10.5e6, min: 0, minExclusive: true, when: tube,
          info: { text: 'Elastic modulus of the tube material.', range: 'Aluminium about 10.5 Mpsi (72 GPa), steel 29 Mpsi (200 GPa), glass-fibre laminate 2–3 Mpsi (15–20 GPa), carbon-fibre laminate 7–10 Mpsi (50–70 GPa).', doc: 'tube' } },
        { id: 't', label: 'Wall thickness', sym: 't', ...LEN, default: 0.125, min: 0, minExclusive: true, when: tube, info: { text: 'Tube wall thickness. The bending stiffness of a thin-walled tube is $EI\\approx E\\pi R^3\\,t$.', doc: 'tube' } },
        { id: 'l', label: 'Nose CP to the base of the upper stage', sym: 'l', ...LEN, default: 150, min: 0, minExclusive: true, when: tube, slider: { min: 20, max: 300, step: 1 },
          info: { text: 'Length of the cantilever: from the nose centre of pressure back to where the upper stage joins the booster.', doc: 'tube' } },
        { id: 'C', label: 'Joint compliance', sym: 'C', ...COMP, default: 1e-6, min: 0, minExclusive: true, when: joint,
          info: { text: 'Rotation of the joint per unit bending moment. Measure it by loading the assembled joint as a cantilever.', doc: 'joint' } },
        { id: 'xj', label: 'Nose CP to the joint', sym: 'x_j', ...LEN, default: 40, min: 0, minExclusive: true, when: joint, info: { text: 'Distance from the nose centre of pressure back to the joint.', doc: 'joint' } },
      ],
    },
    {
      id: 'flight', title: 'Aerodynamics and flight',
      fields: [
        { id: 'CNa', label: 'Nose normal-force slope', sym: 'C_{NN\\alpha}', ...PERRAD, default: 3, min: 0, minExclusive: true, slider: { min: 1, max: 6, step: 0.1 },
          info: { text: 'Normal-force slope of everything ahead of the bend (nose and upper-stage body), per radian, based on $S$.', range: 'About 2 for a nose cone alone (slender-body theory); more when upper-stage fins or a long body contribute.', doc: 'tube' } },
        { id: 'q', label: 'Dynamic pressure', sym: 'q', ...PRES, default: 8000, min: 0,
          info: { text: 'Dynamic pressure of the flight condition, usually the maximum during boost.', range: 'Small sounding rockets reach a few thousand to over 20 000 lbf/ft² (100 kPa and more) near burnout.', doc: 'tube' } },
        { id: 'trim', label: 'Whole-rocket trim', kind: 'bool', default: false, info: { text: 'Also work out how much the angle of attack of the whole rocket, trimmed against a thrust misalignment, grows (memo eqs. 1 and 2). Needs the normal-force slopes and moment arms of both tails and the nose.', doc: 'trim' } },
        { id: 'CN1a', label: 'First-stage tail normal-force slope', sym: 'C_{N1\\alpha}', ...PERRAD, default: 10, min: 0, when: trimmed, info: { doc: 'trim' } },
        { id: 'x1', label: 'First-stage tail arm from the CG', sym: 'x_1', ...LEN, default: 120, min: 0, when: trimmed, info: { doc: 'trim' } },
        { id: 'CN2a', label: 'Second-stage tail and interstage slope', sym: 'C_{N2\\alpha}', ...PERRAD, default: 4, min: 0, when: trimmed, info: { doc: 'trim' } },
        { id: 'x2', label: 'Second-stage tail arm from the CG', sym: 'x_2', ...LEN, default: 30, min: 0, when: trimmed, info: { doc: 'trim' } },
        { id: 'x3', label: 'Nose CP arm from the CG', sym: 'x_3', ...LEN, default: 170, min: 0, when: trimmed, info: { doc: 'trim' } },
      ],
    },
  ],
  results: [
    { id: 'qD', label: 'Divergence dynamic pressure', sym: 'q_D', ...PRES, key: true, digits: 4,
      status: (x, out, v) => (v.q < 0.5 * x ? 'ok' : 'warn'),
      info: { text: 'Dynamic pressure at which the bending feedback runs away.', tex: 'q_D=\\frac{2EI}{S\\,C_{NN\\alpha}l^2}\\ \\ \\text{or}\\ \\ \\frac{1}{S\\,C_{NN\\alpha}\\,C\\,x_j}', doc: 'tube' } },
    { id: 'margin', label: 'Divergence margin', sym: 'q_D/q', dim: 'none', key: true, digits: 4,
      note: (x) => (x > 2 ? 'comfortable' : x > 1 ? 'too close: loads amplified strongly' : 'beyond divergence'),
      status: (x) => (x > 2 ? 'ok' : 'warn'),
      info: { text: 'How many times the dynamic pressure could rise before divergence. Keep it well above 2.', doc: 'tube' } },
    { id: 'amp', label: 'Nose-load amplification', sym: '\\frac{q_D}{q_D-q}', dim: 'none', key: true, digits: 4,
      note: () => 'bent / rigid nose load',
      info: { text: 'Factor by which flexibility raises the nose normal force and the bending loads, compared with a rigid stage.', tex: '\\frac{q_D}{q_D-q}', doc: 'tube' } },
    { id: 'lmax', label: 'Longest upper stage at this q', sym: 'l_{max}', ...LEN, key: true, digits: 4, when: tube,
      note: (x, out, v) => `${fmt(v.l / x * 100, { digits: 3 })} % used`,
      info: { text: 'Cantilever length at which the stage would diverge at this dynamic pressure.', tex: 'l_{max}=\\sqrt{\\frac{2EI}{S\\,C_{NN\\alpha}q}}', doc: 'tube' } },
    { id: 'jointAmp', label: 'Joint rotation per degree of angle of attack', sym: '\\varphi/\\alpha', dim: 'none', key: true, digits: 4, when: joint,
      info: { tex: '\\frac{\\varphi}{\\alpha}=\\frac{q}{q_D-q}', doc: 'joint' } },
    { id: 'bodyAmp', label: 'Angle-of-attack amplification (whole rocket)', sym: '\\alpha/\\alpha_{rigid}', dim: 'none', digits: 4, when: trimmed, info: { tex: '\\frac{\\Sigma}{x_1\\,C_{N1\\alpha}-x_2\\,C_{N2\\alpha}-x_3\\,C_{NN\\alpha}q_D/(q_D-q)}', doc: 'trim' } },
    { id: 'noseAmp', label: 'Nose angle-of-attack amplification', sym: '\\alpha_N/\\alpha_{rigid}', dim: 'none', digits: 4, when: trimmed, info: { doc: 'trim' } },
    { id: 'EI', label: 'Bending stiffness', sym: 'EI', dim: 'stiffness', internal: 'lbfin2', digits: 4, when: tube, info: { tex: 'EI\\approx E\\pi R^3\\,t', doc: 'tube' } },
    { id: 'S', label: 'Reference area', sym: 'S', dim: 'area', internal: 'in2', digits: 4, info: { tex: 'S=\\pi R^2', doc: 'tube' } },
  ],
  compute(v) {
    const o = divergence(model(v));
    const warnings = [];
    if (v.q >= o.qD) warnings.push({ level: 'warn', text: 'The dynamic pressure is at or beyond divergence: the upper stage would bend until it breaks. Stiffen the tube (thicker wall, stiffer material, larger radius), shorten it, or fly a lower dynamic pressure.' });
    else if (o.qD < 2 * v.q) warnings.push({ level: 'warn', text: `Loads are amplified ${fmt(o.amp, { digits: 3 })}×. Keep the divergence dynamic pressure at least twice the flight value.` });
    if (o.trim && !o.trim.stable && v.q < o.qD) warnings.push({ level: 'warn', text: 'With the flexible nose the rocket is no longer statically stable at this dynamic pressure (the trim equation has no positive solution). Move the CG forward or enlarge the first-stage tail.' });
    if (v.mode === 'tube' && v.t > 0.2 * v.R) warnings.push({ level: 'info', text: 'The wall is thick compared with the radius; $EI\\approx E\\pi R^3\\,t$ assumes a thin wall and overestimates the stiffness.' });
    const results = { qD: o.qD, margin: o.qD / Math.max(v.q, 1e-12), amp: Number.isFinite(o.amp) ? o.amp : 'diverges', lmax: o.lmax, jointAmp: v.q < o.qD ? v.q / (o.qD - v.q) : 'diverges', EI: o.EI, S: o.S,
      bodyAmp: o.trim ? (o.trim.stable ? o.trim.body : 'unstable') : undefined, noseAmp: o.trim ? (o.trim.stable ? o.trim.nose : 'unstable') : undefined };
    if (v.q === 0) Object.assign(results, { margin: 'no load', lmax: 'no limit' });
    return { results, warnings, o };
  },
  plots: [
    {
      id: 'amp', title: 'Load amplification against q/q_D',
      info: { text: 'Bent-to-rigid nose load as the dynamic pressure approaches divergence. It doubles at half of $q_D$ and grows without limit beyond.', doc: 'tube' },
      build(v, out) {
        const pts = []; for (let i = 0; i <= 95; i++) { const r = i / 100; pts.push([r, 1 / (1 - r)]); }
        const r = v.q / out.o.qD;
        return { x: { label: '$q/q_D$' }, y: { label: 'Load amplification' }, xDomain: [0, 1], yDomain: [0, 20], series: [{ name: '\\frac{q_D}{q_D-q}', points: pts, smooth: true }],
          markers: r < 0.95 ? [{ x: r, y: 1 / (1 - r), label: 'design' }] : [] };
      },
    },
    {
      id: 'length', title: 'Divergence dynamic pressure against length',
      info: { text: 'Divergence dynamic pressure of the same tube for other cantilever lengths. It falls as $1/l^2$: where the curve crosses the flight dynamic pressure is the longest safe stage.', doc: 'tube' },
      build(v, out, { U }) {
        const up = U(PRES), ul = U(LEN), pts = [];
        if (v.mode === 'tube') for (let i = 1; i <= 100; i++) { const l = (2 * v.l * i) / 100; pts.push([ul.v(l), up.v(qdTube(v.E, v.R, v.t, l, v.CNa))]); }
        else for (let i = 1; i <= 100; i++) { const x = (2 * v.xj * i) / 100; pts.push([ul.v(x), up.v(qdJoint(v.R, v.CNa, v.C, x))]); }
        const lx = v.mode === 'tube' ? v.l : v.xj;
        return { x: { label: v.mode === 'tube' ? 'Nose CP to stage base $l$' : 'Nose CP to joint $x_j$', unit: ul.label }, y: { label: 'Divergence $q_D$', unit: up.label },
          yDomain: [0, up.v(4 * Math.max(out.o.qD, v.q))], series: [{ name: 'q_D', points: pts, smooth: true }],
          hlines: [{ y: up.v(v.q), label: 'flight q', color: 'var(--red-text)' }], markers: [{ x: ul.v(lx), y: up.v(out.o.qD), label: 'design' }] };
      },
    },
    {
      id: 'trim', title: 'Angle-of-attack amplification against q',
      info: { text: 'How much the trimmed angle of attack of the whole rocket and of its nose grow with dynamic pressure, compared with a rigid rocket (memo eqs. 1 and 2). They run away before $q_D$ if the bending destroys static stability first.', doc: 'trim' },
      build(v, out, { U }) {
        if (!v.trim) return null;
        const up = U(PRES), qD = out.o.qD, body = [], nose = [], rigid = [];
        const tr = { x1: v.x1, CN1a: v.CN1a, x2: v.x2, CN2a: v.CN2a, x3: v.x3, CNNa: v.CNa, qD };
        for (let i = 0; i <= 120; i++) {
          const q = (0.98 * qD * i) / 120, a = trimAmplification({ ...tr, q }), ok = a.stable && a.body > 0 && a.body < 50;
          body.push([up.v(q), ok ? a.body : NaN]); nose.push([up.v(q), ok && a.nose < 50 ? a.nose : NaN]); rigid.push([up.v(q), amplification(q, qD)]);
        }
        return { x: { label: 'Dynamic pressure $q$', unit: up.label }, y: { label: 'Amplification' }, yDomain: [0, 10],
          series: [{ name: 'body $\\alpha/\\alpha_{rigid}$', points: body }, { name: 'nose $\\alpha_N/\\alpha_{rigid}$', points: nose, dashed: true }, { name: 'nose load, booster held', points: rigid, dashed: true, color: 'var(--text-3)' }],
          vlines: [{ x: up.v(v.q), label: 'flight q', color: 'var(--red-text)' }] };
      },
    },
  ],
  schematicTitle: 'Upper stage under its nose load',
  schematicHint: 'The upper stage bends as a cantilever from the booster (deflection exaggerated, growing with the load amplification). Drag the marker on the gauge to change the dynamic pressure',
  schematic(ctx, v, out) {
    const W = 760, H = 330, o = out.o;
    const fr = ctx.frame({ width: W, height: H, label: 'Flexible upper stage cantilevered from the booster, and the dynamic-pressure gauge' });
    const g = fr.layer('main'); g.replaceChildren();
    const ul = ctx.U(LEN), up = ctx.U(PRES), Ld = (x) => `${fmt(ul.v(x), { digits: 3 })} ${ul.label}`, P = (x) => `${fmt(up.v(x), { digits: 4 })} ${up.label}`;
    // booster (rigid, cut) on the left; the upper stage from xb to the nose tip, to scale with its own radius
    const cy = 120, xb = 250, Lp = 430, lIn = v.mode === 'tube' ? v.l : Math.max(v.xj * 2.5, 6 * v.R), k = Lp / lIn, r = Math.max(5, Math.min(30, v.R * k));
    const div = !Number.isFinite(o.amp), tip = Math.min(70, div ? 70 : 6 * o.amp);
    const shape = (x) => { const u = x / Lp; return v.mode === 'tube' ? (tip * (3 * u * u - u ** 3)) / 2 : Math.max(0, (x - (Lp - v.xj * k)) / (v.xj * k)) * tip; };
    // booster body and fins
    g.append(s('rect', { x: 40, y: cy - r * 1.25, width: xb - 40, height: 2.5 * r, class: 'sc-body-2' }));
    for (const sg of [-1, 1]) g.append(s('path', { d: `M60,${cy + sg * r * 1.25}L46,${cy + sg * (r * 1.25 + 34)}L96,${cy + sg * (r * 1.25 + 34)}L120,${cy + sg * r * 1.25}`, class: 'sc-body-2' }));
    g.append(s('path', { d: `M40,${cy - r * 1.25 - 6}l-6,10l12,10l-12,10l12,10l-6,${2.5 * r - 28}`, class: 'sc-thin' }));
    // upper stage: centre line y(x) bent downward-up (deflects towards the nose load), outline ±r, nose cone
    const n = 60, cl = []; for (let i = 0; i <= n; i++) { const x = (Lp * i) / n; cl.push([xb + x, cy - shape(x)]); }
    const slope = (i) => { const a = cl[Math.max(0, i - 1)], b = cl[Math.min(n, i + 1)]; return Math.atan2(b[1] - a[1], b[0] - a[0]); };
    const lnose = Math.min(Lp * 0.25, 4 * r), iN = Math.round(n * (1 - lnose / Lp));
    const up1 = [], dn1 = [];
    cl.forEach(([x, y], i) => { const th = slope(i), rr = i <= iN ? r : r * (n - i) / (n - iN); up1.push([x + rr * Math.sin(th), y - rr * Math.cos(th)]); dn1.push([x - rr * Math.sin(th), y + rr * Math.cos(th)]); });
    g.append(s('path', { d: path([...up1, ...dn1.reverse()], true), class: 'sc-body', style: div ? 'fill:var(--red);fill-opacity:.18' : null, 'data-field': 'E t R l C xj' }));
    // undeflected outline for reference
    g.append(s('path', { d: `M${xb},${cy - r}H${xb + Lp - lnose}L${xb + Lp},${cy}L${xb + Lp - lnose},${cy + r}H${xb}`, class: 'sc-thin', fill: 'none', 'stroke-dasharray': '3 3', opacity: 0.6 }));
    if (v.mode === 'joint') { const xjp = xb + Lp - v.xj * k; g.append(s('circle', { cx: xjp, cy: cy - shape(xjp - xb), r: 6, fill: 'var(--surface)', stroke: 'var(--text)', 'stroke-width': 1.5, 'data-field': 'C xj' }));
      g.append(text(xjp, cy + r + 18, 'flexible joint', { anchor: 'middle', size: 10.5, field: 'C xj' })); }
    // nose CP and its normal force, growing with the amplification
    const xcp = xb + Lp - lnose * 0.6, ycp = cy - shape(xcp - xb), fl = Math.min(90, 26 * (div ? 3.4 : Math.min(3.4, o.amp)));
    // the nose force acts upward (towards the bend), drawn from below the nose
    g.append(s('line', { x1: xcp, y1: ycp + r + fl, x2: xcp, y2: ycp + r + 2, class: 'sc-accent', 'stroke-width': 2.4, 'marker-end': fr.arrow('acc') }));
    g.append(text(xcp - 10, ycp + r + fl * 0.7, div ? 'N_N grows without limit' : `N_N × ${amp(o.amp)}`, { anchor: 'end', size: 11 }));
    g.append(pointMarker(xcp, ycp, '', { kind: 'cp', field: 'CNa' }));
    const yd = cy - r - Math.max(46, tip + 26);
    if (v.mode === 'tube') g.append(dim(fr, xb, yd, xcp, yd, `l = ${Ld(v.l)}`, { field: 'l' }));
    else g.append(dim(fr, xb + Lp - v.xj * k, yd, xcp, yd, `x_j = ${Ld(v.xj)}`, { field: 'xj' }));
    g.append(text(xb - 6, cy + r * 1.25 + 52, 'booster (stiff)', { anchor: 'end', size: 10.5, cls: 'sc-dim-text' }));
    // gauge: 0 … 1.25 q_D, red beyond q_D/2
    const gx0 = 60, gx1 = 700, gy = 268, top = 1.25 * o.qD, G = (q) => gx0 + (Math.min(q, top) / top) * (gx1 - gx0);
    g.append(s('rect', { x: gx0, y: gy - 6, width: G(0.5 * o.qD) - gx0, height: 12, fill: 'var(--surface-2)', stroke: 'var(--border)' }));
    g.append(s('rect', { x: G(0.5 * o.qD), y: gy - 6, width: G(o.qD) - G(0.5 * o.qD), height: 12, fill: 'var(--red)', 'fill-opacity': 0.25, stroke: 'var(--border)' }));
    g.append(s('rect', { x: G(o.qD), y: gy - 6, width: gx1 - G(o.qD), height: 12, fill: 'var(--red)', 'fill-opacity': 0.7 }));
    g.append(text(G(0.5 * o.qD), gy + 24, 'q_D/2', { anchor: 'middle', size: 10, cls: 'sc-dim-text' }));
    g.append(text(G(o.qD), gy + 24, `q_D = ${P(o.qD)}`, { anchor: 'middle', size: 10.5 }));
    g.append(text(gx0, gy + 24, '0', { anchor: 'middle', size: 10, cls: 'sc-dim-text' }));
    g.append(text(G(v.q), gy - 16, `q = ${P(v.q)}`, { anchor: G(v.q) > gx1 - 60 ? 'end' : 'middle', size: 11, field: 'q' }));
    g.append(text(20, H - 8, 'deflection exaggerated; dashed: rigid stage', { size: 10, cls: 'sc-dim-text' }));
    ctx.handle('q', G(v.q), gy, {
      field: 'q', title: 'Drag to change the dynamic pressure',
      onDrag: (sx) => ctx.setValue('q', Math.max(0, ((sx - gx0) / (gx1 - gx0)) * top), { round: 10 }),
      onKey: (dx) => ctx.setValue('q', Math.max(0, v.q * (1 + 0.05 * dx))),
    });
  },
  symbols: {
    q: 'dynamic pressure', q_D: 'divergence dynamic pressure', E: 'Young’s modulus of the tube', I: 'second moment of area of the tube', EI: 'bending stiffness', R: 'tube radius', t: 'wall thickness',
    l: 'distance from the nose centre of pressure to the base of the upper stage', S: 'reference area', 'C_{NN\\alpha}': 'normal-force slope ahead of the bend', C: 'joint compliance', x_j: 'distance from the nose centre of pressure to the joint',
    N_N: 'nose normal force', '\\alpha': 'angle of attack', '\\alpha_N': 'nose angle of attack', '\\alpha_{rigid}': 'angle of attack of a rigid rocket', '\\varphi': 'joint rotation',
    'C_{N1\\alpha}': 'first-stage tail normal-force slope', 'C_{N2\\alpha}': 'second-stage tail and interstage normal-force slope', x_1: 'first-stage tail arm from the CG', x_2: 'second-stage tail arm from the CG', x_3: 'nose arm from the CG',
    '\\Sigma': 'rigid-rocket restoring-moment sum', l_max: 'longest upper stage at this dynamic pressure',
  },
  report(v, out, R) {
    const o = out.o, n = R.n, Q = R.Q, tubeMode = v.mode === 'tube';
    const steps = [{ label: 'Reference area', lhs: 'S', eq: '\\pi R^2', sub: `\\pi\\times(${R.v(v.R, LEN)})^2`, res: `${n(R.raw(o.S, { dim: 'area', internal: 'in2' }))}\\,${R.u({ dim: 'area' })}` }];
    // substitutions in consistent base units: lbf, in (result × 144 → lbf/ft²) or N, m (→ Pa)
    const L = (x) => (R.us ? n(x) : n(x * 0.0254)), A = (x) => (R.us ? n(x) : n(x * 0.0254 ** 2)), EIb = R.us ? n(o.EI) : n(o.EI * 4.4482216152605 * 0.0254 ** 2), Eb = R.us ? n(v.E) : n(v.E * 6894.757293168);
    const k144 = R.us ? '144\\times' : '';
    if (tubeMode) steps.push(
      { label: 'Bending stiffness of the thin-walled tube', lhs: 'EI', eq: 'E\\pi R^3\\,t', sub: `${Eb}\\times\\pi\\times${L(v.R)}^3\\times${L(v.t)}`, res: Q(o.EI, { dim: 'stiffness', internal: 'lbfin2' }) },
      { label: `Divergence dynamic pressure of the cantilevered stage${R.us ? ' (144 in² per ft²)' : ''}`, lhs: 'q_D', eq: '\\frac{2EI}{S\\,C_{NN\\alpha}l^2}', sub: `${k144}\\frac{2\\times${EIb}}{${A(o.S)}\\times${n(v.CNa)}\\times${L(v.l)}^2}`, res: Q(o.qD, PRES) },
      { label: 'Longest stage at the flight dynamic pressure', lhs: 'l_{max}', eq: '\\sqrt{\\frac{2EI}{S\\,C_{NN\\alpha}q}}', sub: `\\sqrt{\\frac{${k144}2\\times${EIb}}{${A(o.S)}\\times${n(v.CNa)}\\times${R.v(v.q, PRES)}}}`, res: Q(o.lmax, LEN) });
    else steps.push({ label: `Divergence dynamic pressure of the flexible joint${R.us ? ' (144 in² per ft²)' : ''}`, lhs: 'q_D', eq: '\\frac{1}{S\\,C_{NN\\alpha}\\,C\\,x_j}', sub: `${k144}\\frac{1}{${A(o.S)}\\times${n(v.CNa)}\\times${R.v(v.C, COMP)}\\times${L(v.xj)}}`, res: Q(o.qD, PRES) });
    steps.push({ label: 'Nose-load amplification at the flight dynamic pressure', lhs: '\\frac{N_N}{N_{N,rigid}}', eq: '\\frac{q_D}{q_D-q}', sub: `\\frac{${R.v(o.qD, PRES)}}{${R.v(o.qD, PRES)}-${R.v(v.q, PRES)}}`, res: Number.isFinite(o.amp) ? n(o.amp) : '\\infty' });
    if (o.trim) steps.push(
      { label: 'Rigid-rocket restoring-moment sum', lhs: '\\Sigma', eq: 'x_1\\,C_{N1\\alpha}-x_2\\,C_{N2\\alpha}-x_3\\,C_{NN\\alpha}', res: Q(o.trim.sum, LEN) },
      { label: 'Angle-of-attack amplification of the whole rocket (eq. 1)', lhs: '\\frac{\\alpha}{\\alpha_{rigid}}', eq: '\\frac{\\Sigma}{x_1\\,C_{N1\\alpha}-x_2\\,C_{N2\\alpha}-x_3\\,C_{NN\\alpha}\\frac{q_D}{q_D-q}}', res: o.trim.stable ? n(o.trim.body) : '\\text{unstable}' },
      { label: 'Nose angle-of-attack amplification (eq. 2)', lhs: '\\frac{\\alpha_N}{\\alpha_{rigid}}', eq: '\\frac{q_D\\,\\Sigma}{(x_1\\,C_{N1\\alpha}-x_2\\,C_{N2\\alpha})(q_D-q)-x_3\\,C_{NN\\alpha}\\,q_D}', res: o.trim.stable ? n(o.trim.nose) : '\\text{unstable}' });
    return [{
      title: 'Theory',
      text: 'The upper stage is a cantilever from a stiff booster, loaded at the nose centre of pressure by $N_N=qS\\,C_{NN\\alpha}(\\alpha+dy/dx)$. The beam equation $N_N(l-x)=EI\\,d^2y/dx^2$ gives the nose slope $dy/dx=q\\alpha/(q_D-q)$ with $q_D=2EI/(S\\,C_{NN\\alpha}l^2)$, so the nose load is $qS\\,C_{NN\\alpha}\\alpha\\,q_D/(q_D-q)$. A flexible joint of compliance $C$ at $x_j$ behind the nose CP gives $q_D=1/(S\\,C_{NN\\alpha}\\,C\\,x_j)$ (Hoult).',
      steps,
    }];
  },
  references: ['upper-stage-bending-influence-on-static-stability3', 'longeron-bending'],
  examples: [
    { name: 'Dart: aluminium tube, 6.75 in, 150 in long', values: { mode: 'tube', R: 3.375, E: 10.5e6, t: 0.125, l: 150, CNa: 3, q: 8000, trim: false } },
    { name: 'Same, long heavy payload (220 in) at high q', values: { mode: 'tube', R: 3.375, E: 10.5e6, t: 0.125, l: 220, CNa: 3, q: 12000, trim: true, CN1a: 10, x1: 120, CN2a: 4, x2: 30, x3: 240 } },
    { name: 'Glass-fibre upper stage, 4 in', values: { mode: 'tube', R: 2, E: 2.5e6, t: 0.08, l: 70, CNa: 2.5, q: 6000, trim: false } },
    { name: 'Flexible payload joint', values: { mode: 'joint', R: 3, C: 1e-6, xj: 40, CNa: 2, q: 5000, trim: false } },
  ],
};
