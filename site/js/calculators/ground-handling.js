// Ground Handling Loads — UI definition.
import { supports, massProps, cut, liftForce, buttonLoad } from '../calc/handling.js';
import { s, fmt, InputError } from '../util.js';
import { text } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const LEN = { dim: 'length', internal: 'in' };
const MASS = { dim: 'mass', internal: 'lbm' };
const FORCE = { dim: 'force', internal: 'lbf' };
const MOM = { dim: 'moment', internal: 'lbfin' };
const NONE = { dim: 'none' };
// typical IREC rocket (54 lb, CG 68.2 in): weight and centre of gravity of each part
const ITEMS = [[4, 12], [14, 38], [8, 60], [28, 93.67]].map(([w, x]) => ({ w, x }));
const F = (x) => `${fmt(toDisplay(x, FORCE), { digits: 3 })} ${unitLabel(displayUnit(FORCE))}`;

function check(rows) {
  if (rows.some((r) => !Number.isFinite(r.w) || !Number.isFinite(r.x))) return 'Every cell needs a number.';
  if (rows.some((r) => r.w < 0)) return 'Weights cannot be negative.';
  if (!(rows.reduce((a, r) => a + r.w, 0) > 0)) return 'The rocket needs some weight.';
  return '';
}

export default {
  slug: 'ground-handling',
  topic: 'structural-loads',
  title: 'Ground Handling Loads',
  subtitle: 'Loads on a rocket when it is <b>carried by hand</b> and when it is <b>slid onto the launch rail</b> — the two ground cases that break hardware.',
  intro: {
    what: 'Gives the support forces and the bending load at a joint when a rocket is carried at two points, and the load that can tear the aft rail button off when the crew lifts the nose to engage the forward button.',
    why: 'Ground handling failures are usually repairable but cost schedule. Aft buttons have been pulled out at least twice: lifting the nose levers the button against the rail like a claw hammer pulling a nail, and the crew feels almost nothing.',
    when: 'Sizing a joint or the button attachments, writing ground-handling procedures, and briefing the crew who load the rocket on the rail.',
  },
  info: {
    text: [
      'Carried at two points, the rocket is a simple beam: statics give the support forces, and a cut at a joint gives the shear and bending moment it must carry, raised by a load factor for bouncing.',
      'On the rail, the aft button first carries the tail. If the crew keeps lifting the nose after the nozzle exit has touched the rail, the rocket pivots on the nozzle and the button is pulled out of the rocket.',
      'Design the button to the pull reached when the lift force is K times its normal value, and teach the crew that a heavier nose means stop.',
    ],
    tex: 'F_L=W\\,\\frac{K(x_L-x_{CG})(x_A-x_F)-(x_A-x_{CG})(x_L-x_F)}{(x_L-x_F)(x_A-x_L)}',
    steps: ['List the main parts with their weights and centres of gravity.', 'Enter the carrying points, the joint and the load factor.', 'Enter the lift point, the aft button and the nozzle exit for rail loading.', 'Read the joint bending moment and the button design load.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'mass', title: 'Rocket',
      fields: [
        { id: 'items', label: 'Parts: weight and centre-of-gravity station', kind: 'table', minRows: 1,
          columns: [{ id: 'w', label: 'Weight', ...MASS }, { id: 'x', label: 'CG station', ...LEN }], default: ITEMS, validate: check,
          info: { text: 'Main parts of the loaded rocket (nose, payload, avionics, motor and fins …) with the station of each part’s centre of gravity, measured from the nose tip. They set the total weight and CG.', doc: 'transport' } },
      ],
    },
    {
      id: 'carry', title: 'Carried by hand',
      fields: [
        { id: 'xFt', label: 'Forward carrying point', sym: 'x_F', ...LEN, default: 5, min: 0, info: { doc: 'transport' } },
        { id: 'xAt', label: 'Aft carrying point', sym: 'x_A', ...LEN, default: 100, min: 0, info: { doc: 'transport' } },
        { id: 'xJ', label: 'Joint station', sym: 'x_J', ...LEN, default: 55, min: 0, info: { text: 'A potentially weak point, such as an interstage or payload joint.', doc: 'transport' } },
        { id: 'N', label: 'Load factor', sym: 'N', ...NONE, default: 2, min: 1, max: 5, slider: { min: 1, max: 4, step: 0.1 },
          info: { text: 'Multiplies the static loads for bouncing and jouncing while the rocket is carried.', range: '2 is suggested: too high only costs weight, too low breaks hardware.', doc: 'transport' } },
      ],
    },
    {
      id: 'rail', title: 'Loading on the rail',
      fields: [
        { id: 'xF', label: 'Nose lift point', sym: 'x_F', ...LEN, default: 32, min: 0, info: { text: 'Where the crew member lifts the rocket to line up the forward button.', doc: 'button' } },
        { id: 'xL', label: 'Aft button station', sym: 'x_L', ...LEN, default: 100, min: 0, info: { doc: 'button' } },
        { id: 'xN', label: 'Nozzle exit station', sym: 'x_A', ...LEN, default: 107, min: 0, info: { text: 'The aft end, which becomes the pivot once it touches the rail.', doc: 'button' } },
        { id: 'K', label: 'Lift warning factor', sym: 'K', ...NONE, default: 2, min: 1, max: 5, slider: { min: 1, max: 4, step: 0.05 },
          info: { text: 'How many times the normal nose lift force a crew member might apply before noticing. The buttons are designed to the pull at that lift.', range: '2 is recommended absent better knowledge.', doc: 'button' } },
      ],
    },
  ],
  results: [
    { id: 'FL', label: 'Aft button design pull', sym: 'F_L', ...FORCE, key: true, digits: 4, note: (x, out) => `at a nose lift of ${F(out.o.lift)}`,
      info: { text: 'Tension trying to pull the aft button off the rocket when the nose lift reaches K times its normal value. Design both buttons to it.', tex: 'F_L=W\\,\\frac{K(x_L-x_{CG})(x_A-x_F)-(x_A-x_{CG})(x_L-x_F)}{(x_L-x_F)(x_A-x_L)}', doc: 'button' } },
    { id: 'lift0', label: 'Normal nose lift force', sym: 'F_{F0}', ...FORCE, key: true, digits: 4, note: (x, out, v) => `the crew should stop well before ${F(v.K * x)}`, info: { tex: 'F_{F0}=W\\,\\frac{x_L-x_{CG}}{x_L-x_F}', doc: 'button' } },
    { id: 'MJ', label: 'Joint bending moment (carried)', sym: 'M_J', ...MOM, key: true, digits: 4, note: (x, out) => `shear ${F(out.o.cutJ.V)} · ×${out.v.N} load factor`,
      info: { text: 'Bending moment at the joint while carried, including the load factor.', tex: 'M_J=N\\left[F_F(x_J-x_F)-\\sum_{x_i<x_J}w_i(x_J-x_i)\\right]', doc: 'transport' } },
    { id: 'FFt', label: 'Forward carrying force', sym: 'F_F', ...FORCE, key: true, digits: 4, note: (x, out) => `aft ${F(out.o.FA)} (static)`, info: { tex: 'F_F=W\\,\\frac{x_A-x_{CG}}{x_A-x_F}', doc: 'transport' } },
    { id: 'W', label: 'Total weight', sym: 'W', ...MASS, digits: 4, info: { doc: 'transport' } },
    { id: 'xCG', label: 'Centre of gravity', sym: 'x_{CG}', ...LEN, digits: 4, info: { doc: 'transport' } },
    { id: 'VJ', label: 'Joint shear force (carried)', sym: 'V_J', ...FORCE, digits: 4, info: { doc: 'transport' } },
  ],
  compute(v) {
    const msg = check(v.items); if (msg) throw new InputError(msg);
    if (!(v.xAt > v.xFt)) throw new InputError('The aft carrying point must be behind the forward one.');
    if (!(v.xF < v.xL && v.xL < v.xN)) throw new InputError('Stations must run nose lift point < aft button < nozzle exit.');
    const { W, xCG } = massProps(v.items), { FF, FA } = supports(W, xCG, v.xFt, v.xAt), cutJ = cut(v.items, FF, v.xFt, v.xJ, v.N);
    const FL = buttonLoad(W, xCG, v.xF, v.xL, v.xN, v.K), lift0 = liftForce(W, xCG, v.xF, v.xL);
    const warnings = [];
    if (xCG < v.xFt || xCG > v.xAt) warnings.push({ level: 'warn', text: 'The centre of gravity is outside the carrying points: the rocket would tip. Move a carrying point beyond the CG.' });
    if (xCG >= v.xL) warnings.push({ level: 'warn', text: 'The centre of gravity is behind the aft button: the tail will drop off the rail when the nose is released.' });
    if (FL <= 0) warnings.push({ level: 'info', text: 'At this lift factor the aft button is still pushed into the rail, not pulled; the nozzle has not become the pivot.' });
    return { results: { FL, lift0, MJ: cutJ.M, FFt: FF, W, xCG, VJ: cutJ.V }, warnings, o: { W, xCG, FF, FA, cutJ, lift: v.K * lift0 }, v };
  },
  plots: [
    {
      id: 'button', title: 'Aft button pull against nose lift',
      info: { text: 'Pull on the aft button as the nose lift force grows (the memo’s figure). Below the normal lift the button carries the tail; above the nozzle-contact lift it is pulled out of the rocket.', doc: 'button' },
      build(v, out, { U }) {
        const uf = U(FORCE), { W, xCG } = out.o, pts = [];
        for (let i = 0; i <= 40; i++) { const K = 1 + (2.5 * i) / 40; pts.push([uf.v(K * liftForce(W, xCG, v.xF, v.xL)), uf.v(Math.max(0, buttonLoad(W, xCG, v.xF, v.xL, v.xN, K)))]); }
        return { x: { label: 'Nose lift force $F_F$', unit: uf.label }, y: { label: 'Button pull $F_L$', unit: uf.label }, includeZero: true, series: [{ name: 'F_L', points: pts }],
          markers: [{ x: uf.v(out.o.lift), y: uf.v(Math.max(0, out.results.FL)), label: `K = ${fmt(v.K, { digits: 3 })}` }] };
      },
    },
    {
      id: 'moment', title: 'Bending moment while carried',
      info: { text: 'Bending moment along the body while carried at the two points, including the load factor. The joint is marked.', doc: 'transport' },
      build(v, out, { U }) {
        const ul = U(LEN), um = U(MOM), Lb = Math.max(v.xAt, ...v.items.map((i) => i.x)) * 1.02, pts = [];
        for (let i = 0; i <= 200; i++) { const x = (Lb * i) / 200; pts.push([ul.v(x), um.v(cut(v.items, out.o.FF, v.xFt, x, v.N).M + (x > v.xAt ? v.N * out.o.FA * (x - v.xAt) : 0))]); }
        return { x: { label: 'Station from the tip $x$', unit: ul.label }, y: { label: 'Bending moment $M$', unit: um.label }, series: [{ name: 'M', points: pts }],
          vlines: [{ x: ul.v(v.xJ), label: 'joint', color: 'var(--text-3)' }], markers: [{ x: ul.v(v.xJ), y: um.v(out.o.cutJ.M), label: 'M_J' }] };
      },
    },
  ],
  schematicTitle: 'Carried by hand, and loaded on the rail',
  schematicHint: 'Top: the rocket carried at two points with the joint cut. Bottom: the nose lifted while the aft button rides in the rail and the nozzle exit touches it; the red arrow is the button pull',
  schematic(ctx, v, out) {
    const W = 760, H = 330, o = out.o;
    const fr = ctx.frame({ width: W, height: H, label: 'Rocket carried at two points, and on the rail with the button pull' });
    const g = fr.layer('main'); g.replaceChildren();
    const L = Math.max(v.xN, v.xAt, ...v.items.map((i) => i.x)), x0 = 50, k = 640 / L, X = (x) => x0 + x * k, r = 14;
    const body = (cy, tilt = 0) => {
      const gg = s('g', { transform: tilt ? `rotate(${tilt} ${X(v.xN)} ${cy + r})` : null });
      gg.append(s('path', { d: `M${X(0)},${cy}Q${X(L * 0.06)},${cy - r} ${X(L * 0.15)},${cy - r}H${X(L)}V${cy + r}H${X(L * 0.15)}Q${X(L * 0.06)},${cy + r} ${X(0)},${cy}Z`, class: 'sc-body', 'data-field': 'items' }));
      gg.append(s('path', { d: `M${X(L * 0.86)},${cy - r}L${X(L * 0.92)},${cy - r - 18}H${X(L)}V${cy - r}`, class: 'sc-body-2' }));
      return gg;
    };
    // top: carried
    const cy1 = 80;
    g.append(body(cy1));
    g.append(s('circle', { cx: X(o.xCG), cy: cy1, r: 5, fill: 'var(--text)' }));
    g.append(text(X(o.xCG), cy1 - r - 6, 'CG', { anchor: 'middle', size: 10.5 }));
    for (const [x, f, lab] of [[v.xFt, o.FF, 'F_F'], [v.xAt, o.FA, 'F_A']]) {
      g.append(s('line', { x1: X(x), y1: cy1 + r + 40, x2: X(x), y2: cy1 + r + 2, class: 'sc-accent', 'stroke-width': 2, 'marker-end': fr.arrow('acc'), 'data-field': 'xFt xAt' }));
      g.append(text(X(x) + 6, cy1 + r + 36, `${lab} = ${F(f)}`, { size: 10.5 }));
    }
    g.append(s('line', { x1: X(v.xJ), x2: X(v.xJ), y1: cy1 - r - 14, y2: cy1 + r + 14, class: 'sc-thin', 'stroke-dasharray': '4 3', 'data-field': 'xJ' }));
    g.append(text(X(v.xJ) + 4, cy1 - r - 16, `joint · M_J = ${fmt(toDisplay(o.cutJ.M, MOM), { digits: 3 })} ${unitLabel(displayUnit(MOM))}`, { size: 10.5, field: 'xJ' }));
    // bottom: on the rail, nose lifted (tilt exaggerated), pivoting on the nozzle exit
    const cy2 = 230, ry = cy2 + r + 4;
    g.append(s('rect', { x: X(0) - 20, y: ry, width: X(L) - X(0) + 60, height: 8, class: 'sc-body-2' }));
    g.append(text(X(L) + 40, ry + 24, 'rail (horizontal for loading) · ○ nozzle exit pivot', { anchor: 'end', size: 10, cls: 'sc-dim-text' }));
    g.append(body(cy2, 2.5));   // nose raised, pivoting on the nozzle exit
    g.append(s('line', { x1: X(v.xF), y1: cy2 + 60, x2: X(v.xF), y2: cy2 + r - 6, class: 'sc-accent', 'stroke-width': 2, 'marker-end': fr.arrow('acc'), 'data-field': 'xF K' }));
    g.append(text(X(v.xF) + 6, cy2 + 58, `lift ${F(o.lift)} (K × normal)`, { size: 10.5 }));
    g.append(s('rect', { x: X(v.xL) - 5, y: ry - 4, width: 10, height: 8, fill: 'var(--text)', 'data-field': 'xL' }));
    g.append(s('line', { x1: X(v.xL), y1: ry - 6, x2: X(v.xL), y2: ry + 34, stroke: 'var(--red)', 'stroke-width': 2.2, 'marker-end': fr.arrow('acc') }));
    g.append(text(X(v.xL) - 8, ry + 44, `button pull F_L = ${F(out.results.FL)}`, { anchor: 'end', size: 11 }));
    g.append(s('circle', { cx: X(v.xN), cy: ry - 1, r: 4, fill: 'var(--surface)', stroke: 'var(--text)', 'stroke-width': 1.5, 'data-field': 'xN' }));
    g.append(text(20, H - 6, 'not to scale vertically; tilt exaggerated', { size: 10, cls: 'sc-dim-text' }));
  },
  symbols: {
    W: 'rocket weight', x_CG: 'centre-of-gravity station', 'x_{CG}': 'centre-of-gravity station', x_F: 'forward support or lift station', x_A: 'aft support or nozzle exit station', x_J: 'joint station', x_L: 'aft button station',
    F_F: 'forward support or lift force', F_A: 'aft support force', 'F_{F0}': 'normal nose lift force', F_L: 'aft button pull', N: 'load factor', K: 'lift warning factor', w_i: 'weight of part $i$', x_i: 'centre-of-gravity station of part $i$',
    M_J: 'bending moment at the joint', V_J: 'shear force at the joint',
  },
  report(v, out, R) {
    const o = out.o, n = R.n, L = (x) => R.v(x, LEN), Fq = (x) => R.Q(x, FORCE);
    const steps = [
      { label: 'Total weight and centre of gravity of the parts', lhs: 'W', eq: '\\sum w_i', res: R.Q(o.W, MASS) },
      { lhs: 'x_{CG}', eq: '\\frac{\\sum w_ix_i}{W}', res: R.Q(o.xCG, LEN) },
      { label: 'Carrying forces (statics)', lhs: 'F_F', eq: 'W\\,\\frac{x_A-x_{CG}}{x_A-x_F}', sub: `${R.v(o.W, MASS)}\\times\\frac{${L(v.xAt)}-${L(o.xCG)}}{${L(v.xAt)}-${L(v.xFt)}}`, res: Fq(o.FF) },
      { label: 'Bending moment at the joint, moments about the cut, with the load factor', lhs: 'M_J', eq: 'N\\left[F_F(x_J-x_F)-\\sum_{x_i<x_J}w_i(x_J-x_i)\\right]', res: R.Q(o.cutJ.M, MOM) },
      { label: 'Normal nose lift force with the aft button carrying the tail', lhs: 'F_{F0}', eq: 'W\\,\\frac{x_L-x_{CG}}{x_L-x_F}', sub: `${R.v(o.W, MASS)}\\times\\frac{${L(v.xL)}-${L(o.xCG)}}{${L(v.xL)}-${L(v.xF)}}`, res: Fq(out.results.lift0) },
      { label: 'Aft button pull when the lift reaches K times that (nozzle exit pivoting on the rail)', lhs: 'F_L', eq: 'W\\,\\frac{K(x_L-x_{CG})(x_A-x_F)-(x_A-x_{CG})(x_L-x_F)}{(x_L-x_F)(x_A-x_L)}',
        sub: `${R.v(o.W, MASS)}\\times\\frac{${n(v.K)}(${L(v.xL)}-${L(o.xCG)})(${L(v.xN)}-${L(v.xF)})-(${L(v.xN)}-${L(o.xCG)})(${L(v.xL)}-${L(v.xF)})}{(${L(v.xL)}-${L(v.xF)})(${L(v.xN)}-${L(v.xL)})}`, res: Fq(out.results.FL) },
    ];
    return [{
      title: 'Theory',
      text: 'Carried at two points, the rocket is a simple beam: $F_F+F_A=W$ and $F_F(x_{CG}-x_F)=F_A(x_A-x_{CG})$. A cut at a joint carries the shear and moment of everything ahead of it, multiplied by a load factor for bouncing. On the rail, once the nozzle exit touches the rail the extra nose lift is reacted by a pull on the aft button: from the force and moment balances, $F_F(x_A-x_F)+F_L(x_L-x_A)=W(x_A-x_{CG})$ (Hoult).',
      steps,
    }];
  },
  references: ['ground-handling-loads', 'sounding-rocket-structural-design-loads10'],
  examples: [{ name: 'IREC rocket, 54 lb (memo example)', values: { items: ITEMS, xFt: 5, xAt: 100, xJ: 55, N: 2, xF: 32, xL: 100, xN: 107, K: 2 } }],
};
