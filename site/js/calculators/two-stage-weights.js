// Two-Stage Weight Allocation — UI definition.
import { twoStage, commonIsp, velocityRange, splitDV, stageDV, singleStageRatio, G0 } from '../calc/twostage.js';
import { s, fmt, InputError } from '../util.js';
import { text } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const SPEED = { dim: 'speed', internal: 'fts' };
const MASS = { dim: 'mass', internal: 'lbm' };
const ISP = { dim: 'time', internal: 's' };
const FRAC = { dim: 'none', min: 0, max: 1, minExclusive: true, maxExclusive: true, step: 0.01 };

// internal → the exhaust velocities and structural efficiencies the optimum uses
const stagesOf = (v) => ({ c1: G0 * v.Isp1, c2: G0 * v.Isp2, s1: v.s1, s2: v.s2 });
const which = (k) => (k === 1 ? 'first' : 'second');
// a mass in the reader's unit, for result notes
const dm = (x) => `${fmt(toDisplay(x, MASS), { digits: 4 })} ${unitLabel(displayUnit(MASS))}`;
const split = (st) => `propellant ${dm(st.pr)} · structure ${dm(st.st)}`;

export default {
  slug: 'two-stage-weights',
  topic: 'optimum-weight-allocation',
  title: 'Two-Stage Weight Allocation',
  subtitle: 'The <b>lightest two-stage rocket</b> that gives a payload a required ideal velocity: how much propellant and structure each stage should carry.',
  intro: {
    what: 'Splits the liftoff mass between two stages so that a given payload reaches a required ideal velocity with the least total mass, and gives the propellant and structure of each stage.',
    why: 'For a fixed payload and velocity the stage split sets the liftoff mass, and so the cost. A poor split wastes mass; sometimes a second stage does not pay at all.',
    when: 'Sizing the stages of a two-stage rocket early in the design, or checking whether staging is worth it for a mission.',
  },
  info: {
    text: [
      'Each stage gains the ideal (rocket-equation) velocity $\\Delta V_i=-c_i\\ln[\\eta_i+\\sigma_i(1-\\eta_i)]$, set by its exhaust velocity $c_i=g_0I_{SP i}$, its structural fraction $\\sigma_i$ and its payload ratio $\\eta_i$ (mass above the stage over mass at its ignition). Drag and gravity losses are left out.',
      'Maximising $\\Delta V_1+\\Delta V_2$ for a fixed total payload ratio $\\eta_{TOT}=\\eta_1\\eta_2$ with a Lagrange multiplier $\\lambda$ gives each stage’s optimum payload ratio. $\\lambda$ is then chosen so that the two stages give the required ideal velocity.',
      'If a stage’s optimum payload ratio would exceed 1, the best design leaves that stage out: one stage does the job better than two.',
    ],
    tex: '\\eta_i=\\frac{\\lambda\\sigma_i}{(c_i-\\lambda)(1-\\sigma_i)},\\qquad \\Delta V_{ID}=-\\sum_{i=1}^{2}c_i\\ln[\\eta_i+\\sigma_i(1-\\eta_i)]',
    steps: [
      'Enter the required ideal velocity and the payload mass.',
      'Enter the specific impulse and structural fraction of each stage.',
      'The multiplier $\\lambda$ is found so that the optimum split gives the required ideal velocity.',
      'The payload ratios give the liftoff mass and the propellant and structure of each stage.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'mission', title: 'Mission',
      fields: [
        { id: 'dv', label: 'Required ideal velocity', sym: '\\Delta V_{ID}', ...SPEED, default: 2000, min: 0, minExclusive: true,
          info: { text: 'Velocity the two stages must add with no drag or gravity losses (the rocket-equation velocity). Add an allowance for those losses to the burnout velocity you need.', range: 'Gravity and drag losses for a vertical sounding-rocket flight are often 10–30 % of the ideal velocity.', doc: 'overview' } },
        { id: 'Mpl', label: 'Payload mass', sym: 'M_{PL}', ...MASS, default: 10, min: 0, minExclusive: true, info: { text: 'Everything above the second stage: payload, recovery system and nose cone. All stage masses scale with it.', doc: 'masses' } },
      ],
    },
    {
      id: 'stage1', title: 'Stage 1 (lower)',
      fields: [
        { id: 'Isp1', label: 'Stage 1 specific impulse', sym: 'I_{SP1}', ...ISP, default: 210, min: 0, minExclusive: true, info: { text: 'Delivered specific impulse of the first-stage motor. Exhaust velocity is $c_1=g_0I_{SP1}$.', range: 'Amateur solid motors 150–240 s; hybrids 180–250 s.', doc: 'optimum' } },
        { id: 's1', label: 'Stage 1 structural fraction', sym: '\\sigma_1', ...FRAC, default: 0.15,
          info: { text: 'Inert mass of the stage (case, nozzle, fins, interstage, unburnt propellant) divided by its loaded mass: $\\sigma_1=M_{ST1}/(M_{ST1}+M_{PR1})$. Also called structural efficiency; smaller is better.', range: 'Large solid stages 0.08–0.15; amateur stages 0.2–0.5.', doc: 'optimum' } },
      ],
    },
    {
      id: 'stage2', title: 'Stage 2 (upper)',
      fields: [
        { id: 'Isp2', label: 'Stage 2 specific impulse', sym: 'I_{SP2}', ...ISP, default: 210, min: 0, minExclusive: true, info: { text: 'Delivered specific impulse of the second-stage motor; it may differ from the first stage’s.', doc: 'optimum' } },
        { id: 's2', label: 'Stage 2 structural fraction', sym: '\\sigma_2', ...FRAC, default: 0.14, info: { text: 'Inert mass of the second stage divided by its loaded mass, $\\sigma_2=M_{ST2}/(M_{ST2}+M_{PR2})$.', doc: 'optimum' } },
      ],
    },
  ],
  results: [
    { id: 'M01', label: 'Liftoff mass', sym: 'M_{01}', ...MASS, key: true, note: (x, out, v) => `${fmt(out.o.M01 / v.Mpl, { digits: 4 })} × the payload`,
      info: { text: 'Smallest total mass at liftoff that gives the payload the required ideal velocity.', tex: 'M_{01}=\\frac{M_{PL}}{\\eta_1\\eta_2}', doc: 'masses' } },
    { id: 'm1', label: 'First stage, loaded', sym: 'M_1', ...MASS, key: true, note: (x, out) => (out.o.single === 2 ? 'leave this stage out' : split(out.o.stage1)),
      info: { tex: 'M_1=M_{01}-M_{02}', doc: 'masses' } },
    { id: 'm2', label: 'Second stage, loaded', sym: 'M_2', ...MASS, key: true, note: (x, out) => (out.o.single === 1 ? 'leave this stage out' : split(out.o.stage2)),
      info: { tex: 'M_2=M_{02}-M_{PL}', doc: 'masses' } },
    { id: 'payloadPct', label: 'Payload fraction of liftoff mass', sym: '\\eta_{TOT}', dim: 'percent', internal: 'pct', key: true, digits: 4, note: (x, out) => `$\\eta_1=${fmt(out.o.eta1, { digits: 4 })}$ · $\\eta_2=${fmt(out.o.eta2, { digits: 4 })}$`,
      info: { tex: '\\eta_{TOT}=\\frac{M_{PL}}{M_{01}}=\\eta_1\\eta_2', doc: 'optimum' } },
    { id: 'pr1', label: 'First-stage propellant', sym: 'M_{PR1}', ...MASS, info: { tex: 'M_{PR1}=(1-\\sigma_1)M_1', doc: 'masses' } },
    { id: 'st1', label: 'First-stage structure', sym: 'M_{ST1}', ...MASS, info: { tex: 'M_{ST1}=\\sigma_1\\,M_1', doc: 'masses' } },
    { id: 'pr2', label: 'Second-stage propellant', sym: 'M_{PR2}', ...MASS, info: { tex: 'M_{PR2}=(1-\\sigma_2)M_2', doc: 'masses' } },
    { id: 'st2', label: 'Second-stage structure', sym: 'M_{ST2}', ...MASS, info: { tex: 'M_{ST2}=\\sigma_2\\,M_2', doc: 'masses' } },
    { id: 'M02', label: 'Mass at second-stage ignition', sym: 'M_{02}', ...MASS, info: { tex: 'M_{02}=\\frac{M_{PL}}{\\eta_2}', doc: 'masses' } },
    { id: 'eta1', label: 'First-stage payload ratio', sym: '\\eta_1', dim: 'none', digits: 5, info: { tex: '\\eta_1=\\frac{M_{02}}{M_{01}}=\\frac{\\lambda\\sigma_1}{(c_1-\\lambda)(1-\\sigma_1)}', doc: 'optimum' } },
    { id: 'eta2', label: 'Second-stage payload ratio', sym: '\\eta_2', dim: 'none', digits: 5, info: { tex: '\\eta_2=\\frac{M_{PL}}{M_{02}}=\\frac{\\lambda\\sigma_2}{(c_2-\\lambda)(1-\\sigma_2)}', doc: 'optimum' } },
    { id: 'mu1', label: 'First-stage mass ratio', sym: '\\mu_1', dim: 'none', digits: 5, info: { tex: '\\mu_1=\\frac{1}{\\eta_1+\\sigma_1(1-\\eta_1)}', doc: 'optimum' } },
    { id: 'mu2', label: 'Second-stage mass ratio', sym: '\\mu_2', dim: 'none', digits: 5, info: { tex: '\\mu_2=\\frac{1}{\\eta_2+\\sigma_2(1-\\eta_2)}', doc: 'optimum' } },
    { id: 'dv1', label: 'Ideal velocity from the first stage', sym: '\\Delta V_1', ...SPEED, info: { tex: '\\Delta V_1=c_1\\ln\\mu_1', doc: 'optimum' } },
    { id: 'dv2', label: 'Ideal velocity from the second stage', sym: '\\Delta V_2', ...SPEED, info: { tex: '\\Delta V_2=c_2\\ln\\mu_2', doc: 'optimum' } },
    { id: 'lam', label: 'Velocity gained per fractional increase in liftoff mass', sym: '\\lambda', ...SPEED,
      info: { text: 'The Lagrange multiplier. At the optimum it equals $d\\Delta V_{ID}/d\\ln M_{01}$: adding 1 % to the liftoff mass (with the best split) adds about $0.01\\lambda$ to the ideal velocity.', doc: 'optimum' } },
    { id: 'dvMax', label: 'Ideal velocity limit (infinitely heavy rocket)', sym: '\\Delta V_{lim}', ...SPEED, info: { tex: '\\Delta V_{lim}=-c_1\\ln\\sigma_1-c_2\\ln\\sigma_2', text: 'No two-stage rocket with these stages can exceed it.', doc: 'optimum' } },
    { id: 'dvPays', label: 'Ideal velocity above which both stages carry mass', sym: '\\Delta V_{2st}', ...SPEED, info: { text: 'Below it the best design is a single stage.', doc: 'single' } },
    { id: 'M01avg', label: 'Liftoff mass with a common average specific impulse', sym: 'M_{01,c}', ...MASS, when: (v, out) => out?.avg != null,
      info: { text: 'Closed-form result when both stages are given the average specific impulse $(I_{SP1}+I_{SP2})/2$.', tex: '\\eta_{TOT}=\\frac{\\left[e^{-\\Delta V_{ID}/2c}-\\sqrt{\\sigma_1\\sigma_2}\\right]^2}{(1-\\sigma_1)(1-\\sigma_2)}', doc: 'common' } },
    { id: 'dvAvg', label: 'Ideal velocity that split really gives', sym: '\\Delta V_c', ...SPEED, when: (v, out) => out?.avg != null,
      info: { text: 'The common-impulse split evaluated with each stage’s own specific impulse.', doc: 'common' } },
  ],
  compute(v) {
    const p = stagesOf(v), range = velocityRange(p);
    const tooFast = 'These stages cannot reach this ideal velocity even with an infinitely heavy rocket — lower the ideal velocity, or raise the specific impulses or lower the structural fractions.';
    if (!(v.dv < range.max)) throw new InputError(tooFast);
    const o = twoStage({ dv: v.dv, Mpl: v.Mpl, ...p });
    if (!Number.isFinite(o.M01) || !(o.etaTot > 0)) throw new InputError(tooFast);
    const warnings = [];
    if (o.single) warnings.push({ level: 'warn', text: `At this ideal velocity a second stage does not pay: the lightest design puts everything in the ${which(o.single)} stage. A second stage pays only above the ideal velocity at which both stages carry mass (see the results table).` });
    if (o.M01 > 100 * v.Mpl) warnings.push({ level: 'warn', text: 'The liftoff mass is more than 100 times the payload: the ideal velocity is close to the limit of these stages, so small changes in the structural fractions change the result a lot. Lighter structure or higher specific impulse would help.' });
    const c = (p.c1 + p.c2) / 2, cm = commonIsp({ dv: v.dv, Mpl: v.Mpl, c, s1: v.s1, s2: v.s2 });
    const avg = cm.valid ? { ...cm, c, dvTrue: splitDV(v.Mpl, cm.M01, cm.M02, p) } : null;
    const results = {
      M01: o.M01, m1: o.stage1.loaded, m2: o.stage2.loaded, payloadPct: 100 * o.etaTot, pr1: o.stage1.pr, st1: o.stage1.st, pr2: o.stage2.pr, st2: o.stage2.st, M02: o.M02,
      eta1: o.eta1, eta2: o.eta2, mu1: o.mu1, mu2: o.mu2, dv1: o.dv1, dv2: o.dv2, lam: o.lam, dvMax: range.max, dvPays: range.min,
      M01avg: avg ? avg.M01 : null, dvAvg: avg ? avg.dvTrue : null,
    };
    return { results, warnings, o, p, avg };
  },
  plots: [
    {
      id: 'split', title: 'Ideal velocity vs stage split',
      info: { text: 'Ideal velocity of every way of splitting your liftoff mass between the two stages, with the payload fixed. The optimum split is at the top of the curve; the dot is the calculated design.', doc: 'optimum' },
      build(v, out, { U }) {
        const us = U(SPEED), o = out.o, pts = [];
        for (let i = 0; i <= 200; i++) {
          const f = i / 200, M02 = v.Mpl + f * (o.M01 - v.Mpl);
          pts.push([100 * f, us.v(splitDV(v.Mpl, o.M01, M02, out.p))]);
        }
        return { x: { label: 'Second-stage share of the stage mass', unit: '\\%' }, y: { label: 'Ideal velocity', unit: us.label }, xDomain: [0, 100],
          series: [{ name: '\\Delta V_{ID}', points: pts }], markers: [{ x: (100 * o.stage2.loaded) / (o.M01 - v.Mpl), y: us.v(v.dv), label: 'optimum' }] };
      },
    },
    {
      id: 'liftoff', title: 'Liftoff mass vs required ideal velocity',
      info: { text: 'Lightest liftoff mass for your payload as the required ideal velocity rises, with each stage used alone for comparison. Where the two-stage curve leaves the single-stage one, a second stage starts to pay.', doc: 'single' },
      build(v, out, { U }) {
        const us = U(SPEED), um = U(MASS), o = out.o, p = out.p, r = o.range;
        const top = Math.max(v.dv, Math.min(1.6 * v.dv, r.min + 0.9 * (r.max - r.min)));
        const cap = 2.5 * twoStage({ dv: top, Mpl: v.Mpl, ...p }).M01;
        const two = { name: 'optimum split', points: [] }, one1 = { name: 'first stage alone', points: [], dashed: true }, one2 = { name: 'second stage alone', points: [], dashed: true, color: 'var(--text-3)' };
        for (let i = 1; i <= 120; i++) {
          const x = (top * i) / 120;
          two.points.push([us.v(x), um.v(twoStage({ dv: x, Mpl: v.Mpl, ...p }).M01)]);
          const a = v.Mpl * singleStageRatio(x, p.c1, p.s1), b = v.Mpl * singleStageRatio(x, p.c2, p.s2);
          if (a <= cap) one1.points.push([us.v(x), um.v(a)]);
          if (b <= cap) one2.points.push([us.v(x), um.v(b)]);
        }
        return { x: { label: 'Required ideal velocity', unit: us.label }, y: { label: 'Liftoff mass', unit: um.label }, includeZero: true, series: [two, one1, one2],
          vlines: r.min > 0 && r.min < top ? [{ x: us.v(r.min), label: 'both stages used', color: 'var(--text-3)' }] : [],
          markers: [{ x: us.v(v.dv), y: um.v(o.M01), label: 'design' }] };
      },
    },
  ],
  schematicTitle: 'Stage masses (areas to scale)',
  schematicHint: 'Each section’s area is proportional to its mass; shading is propellant. The bar below splits the ideal velocity between the stages',
  schematic(ctx, v, out) {
    const W = 760, H = 320, o = out.o;
    const fr = ctx.frame({ width: W, height: H, label: 'Two-stage rocket drawn with areas proportional to mass' });
    const g = fr.layer('main'); g.replaceChildren();
    const um = ctx.U(MASS), us = ctx.U(SPEED), M = (x) => `${fmt(um.v(x), { digits: 4 })} ${um.label}`;
    const x0 = 60, len = 640, cy = 120, h1 = 80, h2 = 58;
    const m1 = o.stage1.loaded, m2 = o.stage2.loaded, mp = v.Mpl;
    const k = len / (m1 / h1 + m2 / h2 + (2 * mp) / h2);       // px² per unit mass
    const L1 = (k * m1) / h1, L2 = (k * m2) / h2, Lp = (2 * k * mp) / h2;
    const sec = (x, L, h, sig, field, cls) => {
      if (L < 0.5) return;
      g.append(s('rect', { x, y: cy - h / 2, width: L, height: h, class: cls, 'data-field': field }));
      g.append(s('rect', { x, y: cy - h / 2, width: L * (1 - sig), height: h, fill: 'var(--series-1)', 'fill-opacity': 0.22, stroke: 'none', 'data-field': field }));
      g.append(s('line', { x1: x + L * (1 - sig), x2: x + L * (1 - sig), y1: cy - h / 2, y2: cy + h / 2, class: 'sc-thin', 'stroke-dasharray': '3 3' }));
    };
    // nozzle (not to scale)
    if (L1 >= 0.5) g.append(s('path', { d: `M${x0},${cy - h1 * 0.28} L${x0 - 18},${cy - h1 * 0.4} L${x0 - 18},${cy + h1 * 0.4} L${x0},${cy + h1 * 0.28}`, class: 'sc-line' }));
    sec(x0, L1, h1, v.s1, 'Isp1 s1', 'sc-body');
    sec(x0 + L1, L2, h2, v.s2, 'Isp2 s2', 'sc-body-2');
    const xp = x0 + L1 + L2;
    g.append(s('path', { d: `M${xp},${cy - h2 / 2} L${xp + Lp},${cy} L${xp},${cy + h2 / 2} Z`, class: 'sc-body-2', 'data-field': 'Mpl' }));
    // labels: stage 1 above (left), payload above (right), stage 2 below
    g.append(text(x0, cy - h1 / 2 - 26, 'Stage 1', { size: 12, field: 'Isp1 s1' }));
    g.append(text(x0, cy - h1 / 2 - 10, o.single === 2 ? `${M(m1)} (carries everything)` : o.single === 1 ? 'left out' : M(m1), { cls: 'sc-dim-text', size: 11, field: 'Isp1 s1' }));
    g.append(text(x0 + len, cy - h2 / 2 - 26, 'Payload', { anchor: 'end', size: 12, field: 'Mpl' }));
    g.append(text(x0 + len, cy - h2 / 2 - 10, M(mp), { anchor: 'end', cls: 'sc-dim-text', size: 11, field: 'Mpl' }));
    const x2 = Math.min(Math.max(x0 + L1 + L2 / 2, x0 + 90), x0 + len - 90);
    g.append(text(x2, cy + h1 / 2 + 20, 'Stage 2', { anchor: 'middle', size: 12, field: 'Isp2 s2' }));
    g.append(text(x2, cy + h1 / 2 + 36, o.single === 1 ? `${M(m2)} (carries everything)` : o.single === 2 ? 'left out' : M(m2), { anchor: 'middle', cls: 'sc-dim-text', size: 11, field: 'Isp2 s2' }));
    g.append(text(20, 22, `liftoff mass M_{01} = ${M(o.M01)} · ${fmt(o.M01 / mp, { digits: 4 })} × payload`, { size: 11 }));
    // ideal-velocity bar
    const yb = 250, bh = 16, f1 = o.dv1 / (o.dv1 + o.dv2), B1 = len * f1;
    g.append(s('rect', { x: x0, y: yb, width: B1, height: bh, class: 'sc-body', 'data-field': 'dv' }));
    g.append(s('rect', { x: x0 + B1, y: yb, width: len - B1, height: bh, class: 'sc-body-2', 'data-field': 'dv' }));
    const V = (x) => `${fmt(us.v(x), { digits: 4 })} ${us.label}`;
    g.append(text(x0, yb - 8, `\\Delta V_1 = ${V(o.dv1)}`, { size: 11, field: 'dv' }));
    g.append(text(x0 + len, yb - 8, `\\Delta V_2 = ${V(o.dv2)}`, { anchor: 'end', size: 11, field: 'dv' }));
    g.append(text(x0 + len / 2, yb + bh + 18, `ideal velocity ${V(v.dv)}, split between the stages`, { anchor: 'middle', cls: 'sc-dim-text', size: 10, field: 'dv' }));
    g.append(text(20, H - 10, 'areas proportional to mass · shaded: propellant · nozzle not to scale', { cls: 'sc-dim-text', size: 10 }));
  },
  symbols: {
    '\\Delta V_{ID}': 'required ideal velocity', 'M_{PL}': 'payload mass', 'I_{SP1}': 'first-stage specific impulse', 'I_{SP2}': 'second-stage specific impulse',
    '\\sigma_1': 'first-stage structural fraction', '\\sigma_2': 'second-stage structural fraction', '\\sigma_i': 'structural fraction of stage $i$', 'g_0': 'standard acceleration of gravity',
    'c_1': 'first-stage exhaust velocity', 'c_2': 'second-stage exhaust velocity', 'c_i': 'exhaust velocity of stage $i$', 'c': 'common exhaust velocity',
    '\\lambda': 'multiplier from the Lagrange condition', '\\eta_1': 'first-stage payload ratio', '\\eta_2': 'second-stage payload ratio', '\\eta_i': 'payload ratio of stage $i$', '\\eta_{TOT}': 'total payload ratio',
    '\\mu_1': 'first-stage mass ratio', '\\mu_2': 'second-stage mass ratio', 'M_{01}': 'liftoff mass', 'M_{02}': 'mass at second-stage ignition', 'M_1': 'loaded first-stage mass', 'M_2': 'loaded second-stage mass',
    'M_{PR1}': 'first-stage propellant mass', 'M_{ST1}': 'first-stage structural mass', 'M_{PR2}': 'second-stage propellant mass', 'M_{ST2}': 'second-stage structural mass',
    '\\Delta V_1': 'ideal velocity from the first stage', '\\Delta V_2': 'ideal velocity from the second stage', '\\Delta V_{lim}': 'ideal velocity limit of the two stages', '\\Delta V_i': 'ideal velocity from stage $i$',
  },
  constants: [
    { sym: 'g_0', desc: 'standard acceleration of gravity', si: [G0 * 0.3048, '\\mathrm{m\\,s^{-2}}'], us: [G0, '\\mathrm{ft\\,s^{-2}}'] },
  ],
  report(v, out, R) {
    const o = out.o, p = out.p, n = R.n, cv = (x) => R.v(x, SPEED), m = (x) => R.v(x, MASS);
    const c1 = cv(p.c1), c2 = cv(p.c2), g0 = R.pick(n(G0 * 0.3048, 7), n(G0, 7));
    const steps = [
      { label: 'Exhaust velocity of each stage', lhs: 'c_1', eq: 'g_0\\,I_{SP1}', sub: `${g0}\\times${n(v.Isp1)}`, res: R.Q(p.c1, SPEED) },
      { lhs: 'c_2', eq: 'g_0\\,I_{SP2}', sub: `${g0}\\times${n(v.Isp2)}`, res: R.Q(p.c2, SPEED) },
      { label: 'Limit of the two stages (infinitely heavy rocket); the required velocity must be below it', lhs: '\\Delta V_{lim}', eq: '-c_1\\ln\\sigma_1-c_2\\ln\\sigma_2', sub: `-${c1}\\ln ${n(v.s1)}-${c2}\\ln ${n(v.s2)}`, res: R.Q(o.range.max, SPEED) },
    ];
    if (!o.single) {
      steps.push(
        { label: 'Optimum payload ratio of each stage (Lagrange condition)', eq: '\\eta_i=\\frac{\\lambda\\sigma_i}{(c_i-\\lambda)(1-\\sigma_i)}' },
        { label: 'The multiplier is the value for which the two stages give the required ideal velocity (solved numerically)', eq: '\\Delta V_{ID}=-c_1\\ln[\\eta_1+\\sigma_1(1-\\eta_1)]-c_2\\ln[\\eta_2+\\sigma_2(1-\\eta_2)]' },
        { lhs: '\\lambda', res: R.Q(o.lam, SPEED) },
        { label: 'First-stage payload ratio', lhs: '\\eta_1', eq: '\\frac{\\lambda\\sigma_1}{(c_1-\\lambda)(1-\\sigma_1)}', sub: `\\frac{${cv(o.lam)}\\times${n(v.s1)}}{(${c1}-${cv(o.lam)})(1-${n(v.s1)})}`, res: n(o.eta1) },
        { label: 'Second-stage payload ratio', lhs: '\\eta_2', eq: '\\frac{\\lambda\\sigma_2}{(c_2-\\lambda)(1-\\sigma_2)}', sub: `\\frac{${cv(o.lam)}\\times${n(v.s2)}}{(${c2}-${cv(o.lam)})(1-${n(v.s2)})}`, res: n(o.eta2) },
      );
    } else {
      const k = o.single, [ck, sk, eta] = k === 1 ? [c1, v.s1, o.eta1] : [c2, v.s2, o.eta2];
      steps.push(
        { label: `Optimum payload ratio of each stage (Lagrange condition); here the ${which(3 - k)} stage would need a payload ratio above 1`, eq: '\\eta_i=\\frac{\\lambda\\sigma_i}{(c_i-\\lambda)(1-\\sigma_i)}' },
        { label: `So the ${which(3 - k)} stage is left out and the ${which(k)} stage alone gives the ideal velocity`, lhs: `\\eta_${k}`, eq: `\\frac{e^{-\\Delta V_{ID}/c_${k}}-\\sigma_${k}}{1-\\sigma_${k}}`, sub: `\\frac{e^{-${cv(v.dv)}/${ck}}-${n(sk)}}{1-${n(sk)}}`, res: n(eta) },
        { lhs: `\\eta_${3 - k}`, res: '1' },
      );
    }
    steps.push(
      { label: 'Total payload ratio', lhs: '\\eta_{TOT}', eq: '\\eta_1\\eta_2', sub: `${n(o.eta1)}\\times${n(o.eta2)}`, res: n(o.etaTot) },
      { label: 'Liftoff mass', lhs: 'M_{01}', eq: '\\frac{M_{PL}}{\\eta_{TOT}}', sub: `\\frac{${m(v.Mpl)}}{${n(o.etaTot)}}`, res: R.Q(o.M01, MASS) },
      { label: 'Mass at second-stage ignition', lhs: 'M_{02}', eq: '\\frac{M_{PL}}{\\eta_2}', sub: `\\frac{${m(v.Mpl)}}{${n(o.eta2)}}`, res: R.Q(o.M02, MASS) },
      { label: 'Loaded stage masses', lhs: 'M_1', eq: 'M_{01}-M_{02}', sub: `${m(o.M01)}-${m(o.M02)}`, res: R.Q(o.stage1.loaded, MASS) },
      { lhs: 'M_2', eq: 'M_{02}-M_{PL}', sub: `${m(o.M02)}-${m(v.Mpl)}`, res: R.Q(o.stage2.loaded, MASS) },
      { label: 'Propellant and structure of each stage', lhs: 'M_{PR1}', eq: '(1-\\sigma_1)M_1', sub: `(1-${n(v.s1)})\\times${m(o.stage1.loaded)}`, res: R.Q(o.stage1.pr, MASS) },
      { lhs: 'M_{ST1}', eq: '\\sigma_1\\,M_1', sub: `${n(v.s1)}\\times${m(o.stage1.loaded)}`, res: R.Q(o.stage1.st, MASS) },
      { lhs: 'M_{PR2}', eq: '(1-\\sigma_2)M_2', sub: `(1-${n(v.s2)})\\times${m(o.stage2.loaded)}`, res: R.Q(o.stage2.pr, MASS) },
      { lhs: 'M_{ST2}', eq: '\\sigma_2\\,M_2', sub: `${n(v.s2)}\\times${m(o.stage2.loaded)}`, res: R.Q(o.stage2.st, MASS) },
      { label: 'Check: ideal velocity of each stage', lhs: '\\Delta V_1', eq: '-c_1\\ln[\\eta_1+\\sigma_1(1-\\eta_1)]', sub: `-${c1}\\ln[${n(o.eta1)}+${n(v.s1)}(1-${n(o.eta1)})]`, res: R.Q(o.dv1, SPEED) },
      { lhs: '\\Delta V_2', eq: '-c_2\\ln[\\eta_2+\\sigma_2(1-\\eta_2)]', sub: `-${c2}\\ln[${n(o.eta2)}+${n(v.s2)}(1-${n(o.eta2)})]`, res: `${R.Q(o.dv2, SPEED)},\\quad \\Delta V_1+\\Delta V_2=${R.Q(o.dv1 + o.dv2, SPEED)}` },
    );
    return [{
      title: 'Theory',
      text: 'Each stage gains the ideal velocity of Tsiolkovskii’s rocket equation, $\\Delta V_i=-c_i\\ln[\\eta_i+\\sigma_i(1-\\eta_i)]$, where $c_i=g_0I_{SPi}$ is its exhaust velocity, $\\sigma_i$ its structural fraction and $\\eta_i$ its payload ratio (mass above the stage over mass at its ignition); drag and gravity losses are neglected. The liftoff mass is $M_{01}=M_{PL}/(\\eta_1\\eta_2)$. Following Vertregt’s method as set out by Hoult, the ideal velocity is maximised at a fixed total payload ratio $\\eta_{TOT}=\\eta_1\\eta_2$ with a Lagrange multiplier $\\lambda$; the stationary condition gives each stage’s payload ratio in terms of $\\lambda$, and $\\lambda$ follows from the required ideal velocity. The ideal velocity is concave in $\\ln\\eta_1$, so this stationary point is the maximum; if it would need a payload ratio above 1 the best design leaves that stage out.',
      steps,
    }];
  },
  references: ['two-stage-weights-rev1'],
  examples: [
    { name: 'Equal motors, 2000 ft/s', values: { dv: 2000, Mpl: 10, Isp1: 210, Isp2: 210, s1: 0.15, s2: 0.14 } },
    { name: '220 s / 200 s at 6000 ft/s', values: { dv: 6000, Mpl: 10, Isp1: 220, Isp2: 200, s1: 0.15, s2: 0.14 } },
    { name: '220 s / 200 s at 2000 ft/s (one stage is enough)', values: { dv: 2000, Mpl: 10, Isp1: 220, Isp2: 200, s1: 0.15, s2: 0.14 } },
    { name: 'Amateur stages, 4 lb payload, 4000 ft/s', values: { dv: 4000, Mpl: 4, Isp1: 230, Isp2: 240, s1: 0.3, s2: 0.25 } },
  ],
};
