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
const Mm = (x) => `${fmt(toDisplay(x, MOM), { digits: 3 })} ${unitLabel(displayUnit(MOM))}`;
const Ln = (x) => `${fmt(toDisplay(x, LEN), { digits: 3 })} ${unitLabel(displayUnit(LEN))}`;
// verdict bands (DECISIONS D41): each load against your strength; above 80 % of it is marginal, above it unsafe
const USE = 0.8;
const ST = { safe: 'ok', marginal: 'warn', unsafe: 'err' };
const COL = { safe: 'var(--ok)', marginal: 'var(--warn)', unsafe: 'var(--danger)' };
const level = (load, strength) => (load <= USE * strength ? 'safe' : load <= strength ? 'marginal' : 'unsafe');
const worst = (...l) => (l.includes('unsafe') ? 'unsafe' : l.includes('marginal') ? 'marginal' : 'safe');
function solve(f, lo, hi) {
  let flo = f(lo); if (!(flo * f(hi) <= 0)) return null;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2, fm = f(m); if (fm * flo > 0) { lo = m; flo = fm; } else hi = m; }
  return (lo + hi) / 2;
}
/** Stations in buildable order: carrying points apart, lift point < aft button < nozzle exit (clamped, with a note). */
function order(v) {
  const w = { ...v }, notes = [];
  if (!(w.xAt > w.xFt)) { w.xAt = w.xFt + 1; notes.push(`the aft carrying point is taken ${Ln(1)} behind the forward one`); }
  if (!(w.xL > w.xF)) { w.xL = w.xF + 1; notes.push(`the aft button is taken ${Ln(1)} behind the nose lift point`); }
  if (!(w.xN > w.xL)) { w.xN = w.xL + 1; notes.push(`the nozzle exit is taken ${Ln(1)} behind the aft button`); }
  return { w, notes };
}

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
  verdict: true,
  tiers: true,
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
    steps: ['List the main parts with their weights and centres of gravity.', 'Enter the carrying points, the joint and the load factor.', 'Enter the lift point, the aft button and the nozzle exit for rail loading.', 'Enter what your button attachment and your joint can take (from a test or the fastener data).', 'Read the verdict and the fixes: where to lift, how hard the crew may pull, or the strength needed.'],
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
        { id: 'xFt', label: 'Forward carrying point', sym: 'x_F', ...LEN, default: 5, min: 0, max: 2000, slider: { min: 0, max: 200, step: 0.5 },
          info: { text: ['Where the front carrier holds the rocket, measured from the nose tip.', 'With the aft point and the centre of gravity it splits the weight between the two carriers.', 'Carrying points close to the joint lower the bending moment there.'], tex: 'F_F=W\\,\\frac{x_A-x_{CG}}{x_A-x_F}', doc: 'transport' } },
        { id: 'xAt', label: 'Aft carrying point', sym: 'x_A', ...LEN, default: 100, min: 0, max: 2000, slider: { min: 0, max: 300, step: 0.5 },
          info: { text: ['Where the rear carrier holds the rocket, from the nose tip.', 'It must be behind the forward point; if not, it is moved just behind it with a note.', 'Keep the centre of gravity between the two points or the rocket tips.'], tex: 'F_A=W\\,\\frac{x_{CG}-x_F}{x_A-x_F}', doc: 'transport' } },
        { id: 'xJ', label: 'Joint station', sym: 'x_J', ...LEN, default: 55, min: 0, max: 2000, slider: { min: 0, max: 300, step: 0.5 },
          info: { text: ['A potentially weak point, such as an interstage, a coupler or a payload joint, from the nose tip.', 'The cut there carries the shear and moment of everything ahead of it.', 'The verdict compares its bending moment with the strength you enter.'], tex: 'M_J=N\\left[F_F(x_J-x_F)-\\sum_{x_i<x_J}w_i(x_J-x_i)\\right]', doc: 'transport' } },
        { id: 'N', label: 'Load factor', sym: 'N', ...NONE, default: 2, min: 1, max: 5, slider: { min: 1, max: 4, step: 0.1 },
          info: { text: ['Multiplies the static loads for bouncing and jouncing while the rocket is carried or driven.', 'Hoult suggests 2: too high only costs weight, too low breaks hardware.', 'The joint moment grows in proportion.'], range: '2 (Hoult).', doc: 'transport' } },
      ],
    },
    {
      id: 'rail', title: 'Loading on the rail',
      fields: [
        { id: 'xF', label: 'Nose lift point', sym: 'x_F', ...LEN, default: 32, min: 0, max: 2000, slider: { min: 0, max: 200, step: 0.5 },
          info: { text: ['Where the crew member lifts the nose to line up the forward button, from the nose tip.', 'Lifting further from the aft button needs less force, but the lever on the button changes too.', 'The verdict gives the lift point that keeps the button pull within its strength.'], tex: 'F_{F0}=W\\,\\frac{x_L-x_{CG}}{x_L-x_F}', doc: 'button' } },
        { id: 'xL', label: 'Aft button station', sym: 'x_L', ...LEN, default: 100, min: 0, max: 2000, slider: { min: 0, max: 300, step: 0.5 },
          info: { text: ['Station of the aft rail button (or lug), from the nose tip.', 'It rides in the rail slot while the nose is lifted.', 'The closer it is to the nozzle exit, the shorter the lever and the larger the pull when the nozzle becomes the pivot.'], doc: 'button' } },
        { id: 'xN', label: 'Nozzle exit station', sym: 'x_A', ...LEN, default: 107, min: 0, max: 2000, slider: { min: 0, max: 320, step: 0.5 },
          info: { text: ['The aft end of the rocket, from the nose tip: it becomes the pivot once it touches the rail.', 'Must be behind the aft button; if not it is moved just behind it with a note.', 'The pull on the button grows as the button-to-exit distance shrinks.'], doc: 'button' } },
        { id: 'K', label: 'Lift warning factor', sym: 'K', ...NONE, default: 2, min: 1, max: 5, slider: { min: 1, max: 4, step: 0.05 },
          info: { text: ['How many times the normal nose lift a crew member might apply before noticing something is wrong.', 'Hoult recommends 2 absent better knowledge; the buttons are designed to the pull at that lift, and the aft button to $K$ times the weight in shear when the rocket stands on the rail.', 'The verdict also gives the largest factor your button can take: brief the crew to stop well before it.'], range: '2 (Hoult).', doc: 'button' } },
      ],
    },
    {
      id: 'limits', title: 'Your limits',
      fields: [
        { id: 'Sb', label: 'Button attachment pull-out strength', sym: 'S_L', ...FORCE, default: 400, min: 1, max: 1e5, slider: { min: 20, max: 1500, step: 5 },
          info: { text: ['The pull that tears the aft button out of the rocket: from a pull test of a sample (best), or the fastener and insert data.', 'Hoult advises designing both buttons to the same load, with countersunk screws so the heads do not rub the rail channel.', 'The verdict compares the design pull with it; above 80 % of it is marginal (this site’s choice).'], range: 'Test it: a wood-screw into a plywood block, a threaded insert in a tube wall and a through-bolt to a centring ring differ by ten times.', doc: 'verdict' } },
        { id: 'SJ', label: 'Joint bending strength', sym: 'M_{max}', ...MOM, default: 2000, min: 1, max: 1e7, slider: { min: 100, max: 20000, step: 10 },
          info: { text: ['The bending moment that breaks or opens the joint: from a test, or from the coupler and fastener calculation.', 'The bending moment of the Body Bending or Upper-Stage pages can be compared with the same value.', 'The verdict compares the joint moment while carried with it; above 80 % of it is marginal.'], doc: 'verdict' } },
      ],
    },
  ],
  results: [
    { id: 'FL', label: 'Aft button design pull', sym: 'F_L', ...FORCE, key: true, digits: 4, status: (x, out) => ST[out.lvB], note: (x, out, v) => `strength ${F(v.Sb)} · at a nose lift of ${F(out.o.lift)}`,
      info: { text: 'Tension trying to pull the aft button off the rocket when the nose lift reaches K times its normal value. Design both buttons to it.', tex: 'F_L=W\\,\\frac{K(x_L-x_{CG})(x_A-x_F)-(x_A-x_{CG})(x_L-x_F)}{(x_L-x_F)(x_A-x_L)}', doc: 'button' } },
    { id: 'Kmax', label: 'Largest lift factor the button takes', sym: 'K_{max}', ...NONE, key: true, digits: 3, status: (x, out, v) => (typeof x !== 'number' || x >= v.K ? 'ok' : ST[out.lvB]), note: (x, out) => `normal nose lift ${F(out.results.lift0)}`,
      info: { text: ['How many times the normal nose lift the crew can apply before the pull reaches the button strength.', 'The pull is linear in the lift factor (memo eq. 6), so this is solved exactly.', 'Brief the crew: if the nose feels heavier than normal, stop.'], tex: 'K_{max}=\\frac{S_L(x_L-x_F)(x_A-x_L)/W+(x_A-x_{CG})(x_L-x_F)}{(x_L-x_{CG})(x_A-x_F)}', doc: 'verdict' } },
    { id: 'lift0', label: 'Normal nose lift force', sym: 'F_{F0}', ...FORCE, digits: 4, info: { text: ['The lift that just raises the nose while the aft button carries the tail.'], tex: 'F_{F0}=W\\,\\frac{x_L-x_{CG}}{x_L-x_F}', doc: 'button' } },
    { id: 'shear', label: 'Aft button shear, rocket erect', sym: 'KW', ...FORCE, digits: 4, info: { text: ['The aft button carries the whole weight when the rocket stands on the rail; Hoult suggests the same factor $K$ as for the pull.'], tex: 'V_L=KW', doc: 'button' } },
    { id: 'MJ', label: 'Joint bending moment (carried)', sym: 'M_J', ...MOM, key: true, digits: 4, status: (x, out) => ST[out.lvJ], note: (x, out, v) => `strength ${Mm(v.SJ)} · ×${fmt(v.N, { digits: 2 })} load factor`,
      info: { text: 'Bending moment at the joint while carried, including the load factor.', tex: 'M_J=N\\left[F_F(x_J-x_F)-\\sum_{x_i<x_J}w_i(x_J-x_i)\\right]', doc: 'transport' } },
    { id: 'FFt', label: 'Forward carrying force', sym: 'F_F', ...FORCE, digits: 4, note: (x, out) => `aft ${F(out.o.FA)} (static)`, info: { tex: 'F_F=W\\,\\frac{x_A-x_{CG}}{x_A-x_F}', doc: 'transport' } },
    { id: 'W', label: 'Total weight', sym: 'W', ...MASS, digits: 4, info: { doc: 'transport' } },
    { id: 'xCG', label: 'Centre of gravity', sym: 'x_{CG}', ...LEN, digits: 4, info: { doc: 'transport' } },
    { id: 'VJ', label: 'Joint shear force (carried)', sym: 'V_J', ...FORCE, digits: 4, info: { doc: 'transport' } },
  ],
  compute(v0) {
    const msg = check(v0.items); if (msg) throw new InputError(msg);
    const { w: v, notes } = order(v0);
    const { W, xCG } = massProps(v.items), { FF, FA } = supports(W, xCG, v.xFt, v.xAt), cutJ = cut(v.items, FF, v.xFt, v.xJ, v.N);
    const FL = buttonLoad(W, xCG, v.xF, v.xL, v.xN, v.K), lift0 = liftForce(W, xCG, v.xF, v.xL);
    const lvB = level(FL, v.Sb), lvJ = level(Math.abs(cutJ.M), v.SJ), lv = worst(lvB, lvJ);
    // fixes: F_L is linear in K (eq. 6); the lift point by bisection; strengths in closed form
    const a = (W * (v.xL - xCG) * (v.xN - v.xF)) / ((v.xL - v.xF) * (v.xN - v.xL)), b = (W * (v.xN - xCG)) / (v.xN - v.xL);
    const Kmax = a > 0 ? (v.Sb + b) / a : 'no limit', Kok = a > 0 ? (USE * v.Sb + b) / a : Infinity;
    const xFok = lvB !== 'safe' ? solve((x) => buttonLoad(W, xCG, x, v.xL, v.xN, v.K) - USE * v.Sb, 0, v.xL - 0.5) : null;
    const fixes = [];
    if (lvB !== 'safe') {
      if (Kok >= 1) fixes.push(`Brief the crew to stop at <b>${fmt(Kok, { digits: 2 })}×</b> the normal nose lift of ${F(lift0)} (design now ${fmt(v.K, { digits: 2 })}×), or`);
      if (xFok != null) fixes.push(`lift the nose at <b>${Ln(xFok)}</b> from the tip (now ${Ln(v.xF)}), or`);
      fixes.push(`make the button attachment take at least <b>${F(FL / USE)}</b> (now ${F(v.Sb)})${lvJ === 'safe' ? '.' : ', and'}`);
    }
    if (lvJ !== 'safe') fixes.push(`${lvB !== 'safe' ? 'make' : 'Make'} the joint take at least <b>${Mm(Math.abs(cutJ.M) / USE)}</b> (now ${Mm(v.SJ)}), or put a carrier at the joint: a support there takes its bending moment to zero.`);
    const verdict = {
      level: lv,
      title: lv === 'safe' ? 'Safe to carry and to load on the rail' : lvB !== 'safe' && lvJ !== 'safe' ? 'Both the aft button and the joint are at risk' : lvB !== 'safe' ? (lvB === 'unsafe' ? 'An over-eager lift can tear the aft button out' : 'Little margin on the aft button') : (lvJ === 'unsafe' ? 'The joint can break while the rocket is carried' : 'Little margin on the joint while carried'),
      text: `On the rail a lift of ${fmt(v.K, { digits: 2 })}× normal (${F(v.K * lift0)}) pulls the aft button with <b>${F(FL)}</b> against your ${F(v.Sb)}. Carried, the joint sees <b>${Mm(Math.abs(cutJ.M))}</b> against your ${Mm(v.SJ)}.`,
      fixes,
    };
    const warnings = [];
    if (notes.length) warnings.push({ level: 'warn', text: `The stations were out of order: ${notes.join('; ')}.`, fix: 'Enter stations from the nose tip, front to back.' });
    if (xCG < v.xFt || xCG > v.xAt) warnings.push({ level: 'warn', text: 'The centre of gravity is outside the carrying points: the rocket would tip.', fix: 'Move a carrying point beyond the centre of gravity.' });
    if (xCG >= v.xL) warnings.push({ level: 'warn', text: 'The centre of gravity is behind the aft button: the tail will drop off the rail when the nose is released.' });
    if (FL <= 0) warnings.push({ level: 'info', text: 'At this lift factor the aft button is still pushed into the rail, not pulled; the nozzle has not become the pivot.' });
    if (lv !== 'safe') warnings.push({ level: lv === 'unsafe' ? 'err' : 'warn', text: verdict.title + '.', fix: 'See the verdict for the fixes.' });
    return { results: { FL, Kmax, lift0, shear: v.K * W, MJ: cutJ.M, FFt: FF, W, xCG, VJ: cutJ.V }, warnings, verdict, lv, lvB, lvJ, o: { W, xCG, FF, FA, cutJ, lift: v.K * lift0 }, v };
  },
  plots: [
    {
      id: 'button', title: 'Aft button pull against nose lift',
      info: { text: ['Pull on the aft button as the nose lift force grows (the memo’s figure). Below the normal lift the button carries the tail; above the nozzle-contact lift it is pulled out of the rocket.', 'Where the line crosses the red line, your button attachment lets go: that lift is the most the crew may ever apply.'], doc: 'verdict' },
      build(v0, out, { U }) {
        const v = out.v;
        const uf = U(FORCE), { W, xCG } = out.o, pts = [];
        for (let i = 0; i <= 40; i++) { const K = 1 + (2.5 * i) / 40; pts.push([uf.v(K * liftForce(W, xCG, v.xF, v.xL)), uf.v(Math.max(0, buttonLoad(W, xCG, v.xF, v.xL, v.xN, K)))]); }
        return { x: { label: 'Nose lift force $F_F$', unit: uf.label }, y: { label: 'Button pull $F_L$', unit: uf.label }, includeZero: true, series: [{ name: 'F_L', points: pts }],
          hlines: [{ y: uf.v(v.Sb), label: 'your button strength', color: 'var(--danger)' }],
          markers: [{ x: uf.v(out.o.lift), y: uf.v(Math.max(0, out.results.FL)), label: `your design, K = ${fmt(v.K, { digits: 3 })}` }] };
      },
    },
    {
      id: 'moment', title: 'Bending moment while carried',
      info: { text: ['Bending moment along the body while carried at the two points, including the load factor.', 'The joint is marked; the red lines are its strength either way. Slide the carrying points to bring the moment at the joint down.'], doc: 'verdict' },
      build(v0, out, { U }) {
        const v = out.v;
        const ul = U(LEN), um = U(MOM), Lb = Math.max(v.xAt, ...v.items.map((i) => i.x)) * 1.02, pts = [];
        for (let i = 0; i <= 200; i++) { const x = (Lb * i) / 200; pts.push([ul.v(x), um.v(cut(v.items, out.o.FF, v.xFt, x, v.N).M + (x > v.xAt ? v.N * out.o.FA * (x - v.xAt) : 0))]); }
        return { x: { label: 'Station from the tip $x$', unit: ul.label }, y: { label: 'Bending moment $M$', unit: um.label }, series: [{ name: 'M', points: pts }],
          hlines: [{ y: um.v(v.SJ), label: 'joint strength', color: 'var(--danger)' }, { y: -um.v(v.SJ), color: 'var(--danger)' }],
          vlines: [{ x: ul.v(v.xJ), label: 'joint', color: 'var(--text-3)' }], markers: [{ x: ul.v(v.xJ), y: um.v(out.o.cutJ.M), label: 'your joint' }] };
      },
    },
  ],
  schematicTitle: 'Carried by hand, and loaded on the rail',
  schematicHint: 'Top: the rocket carried at two points with the joint cut. Bottom: the nose lifted while the aft button rides in the rail and the nozzle exit touches it; the arrow is the button pull. Joint and button are coloured by the verdict. Drag the carrying points, the joint, the lift point, the button or the nozzle exit along the rocket',
  schematic(ctx, v0, out) {
    const v = out.v;
    const W = 760, H = 390, o = out.o;
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
    g.append(text(X(o.xCG) + 9, cy1 + 4, 'CG', { size: 10.5 }));
    for (const [x, f, lab] of [[v.xFt, o.FF, 'F_F'], [v.xAt, o.FA, 'F_A']]) {
      g.append(s('line', { x1: X(x), y1: cy1 + r + 40, x2: X(x), y2: cy1 + r + 2, class: 'sc-accent', 'stroke-width': 2, 'marker-end': fr.arrow('acc'), 'data-field': 'xFt xAt' }));
      g.append(text(X(x) + 6, cy1 + r + 36, `${lab} = ${F(f)}`, { size: 10.5 }));
    }
    g.append(s('line', { x1: X(v.xJ), x2: X(v.xJ), y1: cy1 - r - 14, y2: cy1 + r + 14, stroke: COL[out.lvJ], 'stroke-width': 2, 'stroke-dasharray': '4 3', 'data-field': 'xJ' }));
    // bending-moment diagram along the carried rocket, to the joint strength: the physics on the design
    const my = 196, mh = 22, Mx = (x) => cut(v.items, o.FF, v.xFt, x, v.N).M + (x > v.xAt ? v.N * o.FA * (x - v.xAt) : 0);
    const mpts = []; let mmax = v.SJ;
    for (let i = 0; i <= 120; i++) { const x = (L * i) / 120, m = Mx(x); mmax = Math.max(mmax, Math.abs(m)); mpts.push([x, m]); }
    const MY = (m) => my - (m / mmax) * mh;
    g.append(s('line', { x1: X(0), x2: X(L), y1: my, y2: my, class: 'sc-thin' }));
    for (const sg of [1, -1]) g.append(s('line', { x1: X(0), x2: X(L), y1: MY(sg * v.SJ), y2: MY(sg * v.SJ), stroke: 'var(--danger)', 'stroke-dasharray': '3 3', 'stroke-width': 1, 'data-field': 'SJ' }));
    g.append(s('path', { d: `M${X(0)},${my}` + mpts.map(([x, m]) => `L${X(x)},${MY(m)}`).join('') + `L${X(L)},${my}Z`, fill: 'var(--accent)', 'fill-opacity': 0.18, stroke: 'var(--accent)', 'stroke-width': 1.2, 'data-field': 'N xFt xAt items' }));
    g.append(text(X(0) - 4, my + 4, 'M(x)', { anchor: 'end', size: 10, cls: 'sc-dim-text' }));
    g.append(text(X(L * 0.5), MY(v.SJ) - 4, 'joint strength', { anchor: 'middle', size: 9.5, cls: 'sc-dim-text' }));
    g.append(text(X(v.xJ) + 12, cy1 - r - 12, `joint · M_J = ${fmt(toDisplay(o.cutJ.M, MOM), { digits: 3 })} ${unitLabel(displayUnit(MOM))}`, { size: 10.5, field: 'xJ' }));
    // bottom: on the rail, nose lifted (tilt exaggerated), pivoting on the nozzle exit
    const cy2 = 282, ry = cy2 + r + 4;
    g.append(s('rect', { x: X(0) - 20, y: ry, width: X(L) - X(0) + 60, height: 8, class: 'sc-body-2' }));
    g.append(text(20, H - 22, 'rail horizontal for loading · ○ nozzle exit pivot', { size: 10, cls: 'sc-dim-text' }));
    g.append(body(cy2, 2.5));   // nose raised, pivoting on the nozzle exit
    g.append(s('line', { x1: X(v.xF), y1: cy2 + 60, x2: X(v.xF), y2: cy2 + r - 6, class: 'sc-accent', 'stroke-width': 2, 'marker-end': fr.arrow('acc'), 'data-field': 'xF K' }));
    g.append(text(X(v.xF) + 12, cy2 + 58, `lift ${F(o.lift)} (K × normal)`, { size: 10.5 }));
    g.append(s('rect', { x: X(v.xL) - 5, y: ry - 4, width: 10, height: 8, fill: 'var(--text)', 'data-field': 'xL' }));
    g.append(s('line', { x1: X(v.xL), y1: ry - 6, x2: X(v.xL), y2: ry + 34, stroke: COL[out.lvB], 'stroke-width': 2.4 }));
    g.append(s('path', { d: `M${X(v.xL) - 5},${ry + 28}L${X(v.xL)},${ry + 36}L${X(v.xL) + 5},${ry + 28}`, fill: 'none', stroke: COL[out.lvB], 'stroke-width': 2.4 }));
    g.append(text(X(v.xL) - 8, ry + 44, `button pull F_L = ${F(out.results.FL)}`, { anchor: 'end', size: 11 }));
    g.append(s('circle', { cx: X(v.xN), cy: ry - 1, r: 4, fill: 'var(--surface)', stroke: 'var(--text)', 'stroke-width': 1.5, 'data-field': 'xN' }));
    g.append(text(20, H - 6, 'not to scale vertically; tilt exaggerated', { size: 10, cls: 'sc-dim-text' }));
    // drag any station along the body; the scale k is fixed while dragging
    const toX = (sx) => Math.max(0, Math.min(2000, (sx - x0) / k));
    for (const [id, y, title] of [['xFt', cy1 + r + 40, 'Drag the forward carrying point'], ['xAt', cy1 + r + 40, 'Drag the aft carrying point'], ['xJ', cy1 - r - 14, 'Drag the joint'],
      ['xF', cy2 + 60, 'Drag the nose lift point'], ['xL', ry + 34, 'Drag the aft button'], ['xN', ry - 1, 'Drag the nozzle exit']])
      ctx.handle(id, X(v[id]), y, { field: id, title, onDrag: (sx) => ctx.setValue(id, toX(sx), { round: 0.5 }), onKey: (dx) => ctx.setValue(id, Math.max(0, v[id] + dx)) });
  },
  symbols: {
    W: 'rocket weight', x_CG: 'centre-of-gravity station', 'x_{CG}': 'centre-of-gravity station', x_F: 'forward support or lift station', x_A: 'aft support or nozzle exit station', x_J: 'joint station', x_L: 'aft button station',
    F_F: 'forward support or lift force', F_A: 'aft support force', 'F_{F0}': 'normal nose lift force', F_L: 'aft button pull', N: 'load factor', K: 'lift warning factor', w_i: 'weight of part $i$', x_i: 'centre-of-gravity station of part $i$',
    M_J: 'bending moment at the joint', V_J: 'shear force at the joint',
  },
  report(v0, out, R) {
    const v = out.v;
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
