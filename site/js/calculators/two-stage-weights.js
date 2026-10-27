// Two-Stage Weight Allocation — UI definition.
import { twoStage, commonIsp, velocityRange, splitDV, stageDV, singleStageRatio, G0 } from '../calc/twostage.js';
import { s, fmt, InputError } from '../util.js';
import { text } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const SPEED = { dim: 'speed', internal: 'fts' };
const MASS = { dim: 'mass', internal: 'lbm' };
const ISP = { dim: 'time', internal: 's' };
const FRAC = { dim: 'none', min: 0, max: 1, minExclusive: true, maxExclusive: true, step: 0.01, slider: { min: 0.03, max: 0.5, step: 0.01 } };
const ISP_SLIDER = { slider: { min: 100, max: 320, step: 1 } };

// internal → the exhaust velocities and structural efficiencies the optimum uses
const stagesOf = (v) => ({ c1: G0 * v.Isp1, c2: G0 * v.Isp2, s1: v.s1, s2: v.s2 });
const which = (k) => (k === 1 ? 'first' : 'second');
// a mass in the reader's unit, for result notes
const dm = (x) => `${fmt(toDisplay(x, MASS), { digits: 4 })} ${unitLabel(displayUnit(MASS))}`;
const split = (st) => `propellant ${dm(st.pr)} · structure ${dm(st.st)}`;
const dv = (x) => `${fmt(toDisplay(x, SPEED), { digits: 4 })} ${unitLabel(displayUnit(SPEED))}`;
// verdict bands (DECISIONS D44): liftoff mass against your limit; up to 1.25× is marginal
const MARGIN = 1.25;
const ST = { safe: 'ok', marginal: 'warn', unsafe: 'err' };
const COL = { safe: 'var(--ok)', marginal: 'var(--warn)', unsafe: 'var(--danger)' };
function solve(f, lo, hi) {
  let flo = f(lo); if (!(flo * f(hi) <= 0)) return null;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2, fm = f(m); if (fm * flo > 0) { lo = m; flo = fm; } else hi = m; }
  return (lo + hi) / 2;
}
/** Liftoff mass of the optimum split, Infinity when the stages cannot reach dv. */
const liftoff = (v, over = {}) => {
  const w = { ...v, ...over }, p = stagesOf(w);
  if (!(w.dv < velocityRange(p).max)) return Infinity;
  const o = twoStage({ dv: w.dv, Mpl: w.Mpl, ...p });
  return Number.isFinite(o.M01) && o.etaTot > 0 ? o.M01 : Infinity;
};

const DEF = {
  slug: 'two-stage-weights',
  topic: 'optimum-weight-allocation',
  title: 'Two-Stage Weight Allocation',
  verdict: true,
  tiers: true,
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
      'The verdict compares the liftoff mass with the most you can build or launch, and gives the payload, velocity or structure that fits.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'mission', title: 'Mission',
      fields: [
        { id: 'dv', label: 'Required ideal velocity', sym: '\\Delta V_{ID}', ...SPEED, default: 2000, min: 0, minExclusive: true, max: 40000, slider: { min: 200, max: 15000, step: 10 },
          info: { text: ['Velocity the two stages must add with no drag or gravity losses (the rocket-equation velocity).', 'Take the burnout velocity you need and add an allowance for drag and gravity losses.', 'The liftoff mass grows steeply as it nears the limit of the stages; the verdict gives the fastest velocity within your mass limit.'], tex: '\\Delta V_{ID}=\\Delta V_1+\\Delta V_2', range: 'Gravity and drag losses for a vertical sounding-rocket flight are often 10–30 % of the ideal velocity.', doc: 'overview' } },
        { id: 'Mpl', label: 'Payload mass', sym: 'M_{PL}', ...MASS, default: 10, min: 0, minExclusive: true, max: 1e5, slider: { min: 0.5, max: 200, step: 0.5 },
          info: { text: ['Everything above the second stage: payload, recovery system and nose cone.', 'Weigh it, or add up the parts list.', 'Every stage mass scales in proportion to it, so the heaviest payload within your mass limit follows directly.'], tex: 'M_{01}=\\frac{M_{PL}}{\\eta_1\\eta_2}', doc: 'masses', range: '1–5 lb (0.5–2 kg) for amateur payloads; 10–50 lb (5–25 kg) for small sounding rockets.' } },
      ],
    },
    {
      id: 'stage1', title: 'Stage 1 (lower)',
      fields: [
        { id: 'Isp1', label: 'Stage 1 specific impulse', sym: 'I_{SP1}', ...ISP, ...ISP_SLIDER, default: 210, min: 0, minExclusive: true, max: 500,
          info: { text: ['Delivered specific impulse of the first-stage motor: total impulse divided by propellant weight.', 'From the motor data sheet or a static test.', 'Exhaust velocity is $c_1=g_0I_{SP1}$; a higher value means less propellant for the same velocity.'], tex: 'c_1=g_0I_{SP1}', range: 'Amateur solid motors 150–240 s; hybrids 180–250 s.', doc: 'optimum' } },
        { id: 's1', label: 'Stage 1 structural fraction', sym: '\\sigma_1', ...FRAC, default: 0.15,
          info: { text: ['Inert mass of the stage (case, nozzle, fins, interstage, unburnt propellant) divided by its loaded mass.', 'Weigh the stage loaded and empty.', 'Smaller is better: it sets the limit of what the stages can ever reach.'], tex: '\\sigma_1=\\frac{M_{ST1}}{M_{ST1}+M_{PR1}}', range: 'Large solid stages 0.08–0.15; amateur stages 0.2–0.5.', doc: 'optimum' } },
      ],
    },
    {
      id: 'stage2', title: 'Stage 2 (upper)',
      fields: [
        { id: 'Isp2', label: 'Stage 2 specific impulse', sym: 'I_{SP2}', ...ISP, ...ISP_SLIDER, default: 210, min: 0, minExclusive: true, max: 500,
          info: { text: ['Delivered specific impulse of the second-stage motor; it may differ from the first stage’s.', 'Upper-stage motors often have a longer nozzle and a slightly higher value.', 'The optimum gives the better stage more of the work.'], tex: 'c_2=g_0I_{SP2}', doc: 'optimum', range: 'Amateur solid motors 150–240 s; hybrids 180–250 s.' } },
        { id: 's2', label: 'Stage 2 structural fraction', sym: '\\sigma_2', ...FRAC, default: 0.14,
          info: { text: ['Inert mass of the second stage divided by its loaded mass.', 'Weigh the stage loaded and empty.', 'Upper-stage structure is carried all the way, so it costs the most.'], tex: '\\sigma_2=\\frac{M_{ST2}}{M_{ST2}+M_{PR2}}', doc: 'optimum', range: 'Large solid stages 0.08–0.15; amateur stages 0.2–0.5.' } },
      ],
    },
    {
      id: 'limits', title: 'Your limits',
      fields: [
        { id: 'Mmax', label: 'Heaviest liftoff mass you can launch', sym: 'M_{max}', ...MASS, default: 50, min: 0, minExclusive: true, max: 1e6, slider: { min: 2, max: 1000, step: 1 },
          info: { text: ['The most the rocket may weigh at liftoff: your launcher’s rating, the motor class you may fly, the range’s limit or your budget.', 'This site’s default of 50 lb is a placeholder: set your own.', 'The verdict compares the liftoff mass with it (up to 1.25× is marginal) and gives the payload, velocity or structure that fits.'], doc: 'verdict', tex: 'M_{01}\\le M_{max}', range: 'Set by your launcher rating, the motor class you may fly, or the range’s rules.' } },
      ],
    },
  ],
  results: [
    { id: 'M01', label: 'Liftoff mass', sym: 'M_{01}', ...MASS, key: true, status: (x, out) => ST[out.lv], note: (x, out, v) => (out.o ? `${fmt(out.o.M01 / v.Mpl, { digits: 4 })} × the payload · you allow ${dm(v.Mmax)}` : ''),
      info: { text: ['The lightest the whole rocket can be at liftoff and still give your payload the required ideal velocity.', 'The optimum split of mass between the two stages, from the Lagrange condition (Vertregt’s method set out by Hoult).', 'The verdict compares it with your limit; it grows steeply as the required velocity nears what the stages can ever reach.'], tex: 'M_{01}=\\frac{M_{PL}}{\\eta_1\\eta_2}', doc: 'masses' } },
    { id: 'm1', label: 'First stage, loaded', sym: 'M_1', ...MASS, key: true, status: () => 'ok', note: (x, out) => (!out.o ? '' : out.o.single === 2 ? 'leave this stage out' : split(out.o.stage1)),
      info: { text: ['The loaded mass of the first (lower) stage: its propellant and its structure.', 'The liftoff mass minus everything above the first stage.', 'The note splits it into propellant and structure; “leave this stage out” when one stage does the job better.'], tex: 'M_1=M_{01}-M_{02}', doc: 'masses' } },
    { id: 'm2', label: 'Second stage, loaded', sym: 'M_2', ...MASS, key: true, status: () => 'ok', note: (x, out) => (!out.o ? '' : out.o.single === 1 ? 'leave this stage out' : split(out.o.stage2)),
      info: { text: ['The loaded mass of the second (upper) stage: its propellant and its structure.', 'The mass at second-stage ignition minus the payload.', 'Upper-stage structure is carried all the way, so the optimum keeps this stage small.'], tex: 'M_2=M_{02}-M_{PL}', doc: 'masses' } },
    { id: 'payloadPct', label: 'Payload fraction of liftoff mass', sym: '\\eta_{TOT}', dim: 'percent', internal: 'pct', digits: 4, note: (x, out) => !out.o ? '' : `$\\eta_1=${fmt(out.o.eta1, { digits: 4 })}$ · $\\eta_2=${fmt(out.o.eta2, { digits: 4 })}$`,
      info: { text: ['The payload as a share of the liftoff mass.'], tex: '\\eta_{TOT}=\\frac{M_{PL}}{M_{01}}=\\eta_1\\eta_2', doc: 'optimum' } },
    { id: 'MplMax', label: 'Heaviest payload within your mass limit', sym: 'M_{PL,max}', ...MASS, key: true, digits: 4, status: (x, out, v) => (typeof x === 'number' && x >= v.Mpl ? 'ok' : ST[out.lv]), note: (x, out, v) => `now ${dm(v.Mpl)}`,
      info: { text: ['The heaviest payload whose optimum rocket weighs exactly your liftoff limit, at the same velocity and stages.', 'Every mass scales with the payload, so it is exact.', 'Use it to set the payload mass budget before the stages are built.'], tex: 'M_{PL,max}=M_{PL}\\,\\frac{M_{max}}{M_{01}}', doc: 'verdict' } },
    { id: 'dvOk', label: 'Fastest ideal velocity within your mass limit', sym: '\\Delta V_{ok}', ...SPEED, digits: 4,
      info: { text: ['The ideal velocity whose optimum rocket, with your payload and stages, weighs exactly your limit (bisection).'], tex: 'M_{01}(\\Delta V_{ok})=M_{max}', doc: 'verdict' } },
    { id: 'pr1', label: 'First-stage propellant', sym: 'M_{PR1}', ...MASS, info: { text: ['Propellant in the first stage.'], tex: 'M_{PR1}=(1-\\sigma_1)M_1', doc: 'masses' } },
    { id: 'st1', label: 'First-stage structure', sym: 'M_{ST1}', ...MASS, info: { text: ['Structure (inert mass) of the first stage.'], tex: 'M_{ST1}=\\sigma_1M_1', doc: 'masses' } },
    { id: 'pr2', label: 'Second-stage propellant', sym: 'M_{PR2}', ...MASS, info: { text: ['Propellant in the second stage.'], tex: 'M_{PR2}=(1-\\sigma_2)M_2', doc: 'masses' } },
    { id: 'st2', label: 'Second-stage structure', sym: 'M_{ST2}', ...MASS, info: { text: ['Structure (inert mass) of the second stage.'], tex: 'M_{ST2}=\\sigma_2M_2', doc: 'masses' } },
    { id: 'M02', label: 'Mass at second-stage ignition', sym: 'M_{02}', ...MASS, info: { text: ['The mass when the second stage lights: the second stage plus the payload.'], tex: 'M_{02}=\\frac{M_{PL}}{\\eta_2}', doc: 'masses' } },
    { id: 'eta1', label: 'First-stage payload ratio', sym: '\\eta_1', dim: 'none', digits: 5, info: { text: ['What the first stage carries, as a share of its own ignition mass.'], tex: '\\eta_1=\\frac{M_{02}}{M_{01}}=\\frac{\\lambda\\sigma_1}{(c_1-\\lambda)(1-\\sigma_1)}', doc: 'optimum' } },
    { id: 'eta2', label: 'Second-stage payload ratio', sym: '\\eta_2', dim: 'none', digits: 5, info: { text: ['What the second stage carries, as a share of its own ignition mass.'], tex: '\\eta_2=\\frac{M_{PL}}{M_{02}}=\\frac{\\lambda\\sigma_2}{(c_2-\\lambda)(1-\\sigma_2)}', doc: 'optimum' } },
    { id: 'mu1', label: 'First-stage mass ratio', sym: '\\mu_1', dim: 'none', digits: 5, info: { text: ['Ignition mass over burnout mass of the first stage.'], tex: '\\mu_1=\\frac{1}{\\eta_1+\\sigma_1(1-\\eta_1)}', doc: 'optimum' } },
    { id: 'mu2', label: 'Second-stage mass ratio', sym: '\\mu_2', dim: 'none', digits: 5, info: { text: ['Ignition mass over burnout mass of the second stage.'], tex: '\\mu_2=\\frac{1}{\\eta_2+\\sigma_2(1-\\eta_2)}', doc: 'optimum' } },
    { id: 'dv1', label: 'Ideal velocity from the first stage', sym: '\\Delta V_1', ...SPEED, info: { text: ['The ideal velocity the first stage adds (rocket equation).'], tex: '\\Delta V_1=c_1\\ln\\mu_1', doc: 'optimum' } },
    { id: 'dv2', label: 'Ideal velocity from the second stage', sym: '\\Delta V_2', ...SPEED, info: { text: ['The ideal velocity the second stage adds (rocket equation).'], tex: '\\Delta V_2=c_2\\ln\\mu_2', doc: 'optimum' } },
    { id: 'lam', label: 'Velocity gained per fractional increase in liftoff mass', sym: '\\lambda', ...SPEED,
      info: { text: 'The Lagrange multiplier. At the optimum it equals $d\\Delta V_{ID}/d\\ln M_{01}$: adding 1 % to the liftoff mass (with the best split) adds about $0.01\\lambda$ to the ideal velocity.', doc: 'optimum' } },
    { id: 'dvMax', label: 'Ideal velocity limit (infinitely heavy rocket)', sym: '\\Delta V_{lim}', ...SPEED, info: { tex: '\\Delta V_{lim}=-c_1\\ln\\sigma_1-c_2\\ln\\sigma_2', text: 'No two-stage rocket with these stages can exceed it.', doc: 'optimum' } },
    { id: 'dvPays', label: 'Ideal velocity above which both stages carry mass', sym: '\\Delta V_{2st}', ...SPEED, info: { text: ['Below this ideal velocity the lightest design uses one stage only; above it both stages carry mass.'], doc: 'single' } },
    { id: 'M01avg', label: 'Liftoff mass with a common average specific impulse', sym: 'M_{01,c}', ...MASS, when: (v, out) => out?.avg != null,
      info: { text: ['The liftoff mass from the closed-form split when both stages are given the average specific impulse.'], tex: '\\eta_{TOT}=\\frac{\\left[e^{-\\Delta V_{ID}/2c}-\\sqrt{\\sigma_1\\sigma_2}\\right]^2}{(1-\\sigma_1)(1-\\sigma_2)}', doc: 'common' } },
    { id: 'dvAvg', label: 'Ideal velocity that split really gives', sym: '\\Delta V_c', ...SPEED, when: (v, out) => out?.avg != null,
      info: { text: ['The ideal velocity that common-impulse split really gives with each stage’s own specific impulse.'], doc: 'common' } },
  ],
  compute(v) {
    const p = stagesOf(v), range = velocityRange(p);
    // the fastest velocity and the structure (both fractions scaled together) that fit your mass limit
    const dvOk = liftoff(v, { dv: 1 }) > v.Mmax ? null : solve((x) => Math.min(1e12, liftoff(v, { dv: x })) - v.Mmax, 1, 0.999999 * range.max);
    const sScale = solve((k) => Math.min(1e12, liftoff(v, { s1: v.s1 * k, s2: v.s2 * k })) - v.Mmax, 0.05, 1);
    const reach = v.dv < range.max ? twoStage({ dv: v.dv, Mpl: v.Mpl, ...p }) : null;
    if (!reach || !Number.isFinite(reach.M01) || !(reach.etaTot > 0)) {
      // beyond the limit of the stages: an answer, not an input error
      // scaling both fractions by k moves the limit by −(c₁ + c₂) ln k
      const kLim = Math.exp(-(v.dv - range.max) / (p.c1 + p.c2));
      const fixes = [`Ask for at most <b>${dv(range.max)}</b> — the limit of an infinitely heavy rocket with these stages; ${dvOk ? `<b>${dv(dvOk)}</b> fits your mass limit` : 'less to fit your mass limit'}, or`,
        `lighter stages: below structural fractions of <b>${fmt(v.s1 * kLim, { digits: 3 })}</b> and <b>${fmt(v.s2 * kLim, { digits: 3 })}</b> (now ${fmt(v.s1, { digits: 3 })} and ${fmt(v.s2, { digits: 3 })}) ${dv(v.dv)} becomes reachable at all, or`,
        'higher specific impulse motors.'];
      const dash = Object.fromEntries(DEF.results.map((r) => [r.id, '—']));
      return { results: { ...dash, dvMax: range.max, dvPays: range.min, dvOk: dvOk ?? '—' }, warnings: [{ level: 'err', text: 'These stages cannot reach this ideal velocity even with an infinitely heavy rocket.', fix: `Ask for at most ${dv(range.max)}.` }],
        verdict: { level: 'unsafe', title: 'Out of reach for these stages', text: `The ideal velocity ${dv(v.dv)} is above <b>${dv(range.max)}</b>, the most these two stages could give with no payload limit at all.`, fixes }, lv: 'unsafe', blocked: true, p };
    }
    const o = reach, r = o.M01 / v.Mmax, lv = r <= 1 ? 'safe' : r <= MARGIN ? 'marginal' : 'unsafe';
    const MplMax = v.Mpl / r;
    const fixes = [];
    if (lv !== 'safe') {
      fixes.push(`Lighten the payload to <b>${dm(MplMax)}</b> (now ${dm(v.Mpl)}), or`);
      if (dvOk != null) fixes.push(`ask for <b>${dv(dvOk)}</b> ideal velocity (now ${dv(v.dv)}), or`);
      if (sScale != null) fixes.push(`build lighter stages: structural fractions <b>${fmt(v.s1 * sScale, { digits: 3 })}</b> and <b>${fmt(v.s2 * sScale, { digits: 3 })}</b> (now ${fmt(v.s1, { digits: 3 })} and ${fmt(v.s2, { digits: 3 })}).`);
      fixes[fixes.length - 1] = fixes[fixes.length - 1].replace(/, or$/, '.');
    }
    const verdict = {
      level: lv,
      title: lv === 'safe' ? 'Within your liftoff mass' : lv === 'marginal' ? 'Slightly over your liftoff mass' : 'Too heavy for your limit',
      text: `The lightest two-stage rocket for ${dm(v.Mpl)} of payload at ${dv(v.dv)} weighs <b>${dm(o.M01)}</b> at liftoff; you allow <b>${dm(v.Mmax)}</b>.${o.single ? ` The best design uses only the ${which(o.single)} stage.` : ''}`,
      fixes,
    };
    const warnings = [];
    if (o.single) warnings.push({ level: 'warn', text: `At this ideal velocity a second stage does not pay: the lightest design puts everything in the ${which(o.single)} stage. A second stage pays only above ${dv(range.min)}.` });
    if (o.M01 > 100 * v.Mpl) warnings.push({ level: 'warn', text: 'The liftoff mass is more than 100 times the payload: the ideal velocity is close to the limit of these stages, so small changes in the structural fractions change the result a lot.', fix: 'Lighter structure or higher specific impulse would help.' });
    if (lv !== 'safe') warnings.push({ level: lv === 'unsafe' ? 'err' : 'warn', text: `The liftoff mass ${dm(o.M01)} is above the ${dm(v.Mmax)} you allow.`, fix: 'See the verdict for the payload, velocity or structure that fits.' });
    const c = (p.c1 + p.c2) / 2, cm = commonIsp({ dv: v.dv, Mpl: v.Mpl, c, s1: v.s1, s2: v.s2 });
    const avg = cm.valid ? { ...cm, c, dvTrue: splitDV(v.Mpl, cm.M01, cm.M02, p) } : null;
    const results = {
      M01: o.M01, m1: o.stage1.loaded, m2: o.stage2.loaded, payloadPct: 100 * o.etaTot, MplMax, dvOk: dvOk ?? '—', pr1: o.stage1.pr, st1: o.stage1.st, pr2: o.stage2.pr, st2: o.stage2.st, M02: o.M02,
      eta1: o.eta1, eta2: o.eta2, mu1: o.mu1, mu2: o.mu2, dv1: o.dv1, dv2: o.dv2, lam: o.lam, dvMax: range.max, dvPays: range.min,
      M01avg: avg ? avg.M01 : null, dvAvg: avg ? avg.dvTrue : null,
    };
    return { results, warnings, verdict, lv, o, p, avg };
  },
  plots: [
    {
      id: 'split', title: 'Ideal velocity vs stage split',
      info: { text: 'Ideal velocity of every way of splitting your liftoff mass between the two stages, with the payload fixed. The optimum split is at the top of the curve; the dot is the calculated design.', doc: 'optimum' },
      build(v, out, { U }) {
        if (out.blocked) return null;
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
      info: { text: ['Lightest liftoff mass for your payload as the required ideal velocity rises, with each stage used alone for comparison. Where the two-stage curve leaves the single-stage one, a second stage starts to pay.', 'Where the two-stage curve crosses the red line is the fastest ideal velocity within your mass limit.'], doc: 'verdict' },
      build(v, out, { U }) {
        if (out.blocked) return null;
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
          hlines: [{ y: um.v(v.Mmax), label: 'your limit', color: 'var(--danger)' }],
          markers: [{ x: us.v(v.dv), y: um.v(o.M01), label: 'your rocket' }] };
      },
    },
  ],
  schematicTitle: 'Stage masses (lengths to scale)',
  schematicHint: 'Each section’s length is proportional to its mass (equal density), red is propellant, and a stage the optimum leaves out is drawn dashed. The bar below splits the ideal velocity between the stages',
  schematic(ctx, v, out) {
    const W = 760, H = 330;
    if (out.blocked) {
      const fr = ctx.frame({ width: W, height: H, label: 'Out of reach for these stages' }), g = fr.layer('main'); g.replaceChildren();
      g.append(text(W / 2, H / 2 - 8, 'Out of reach for these stages', { anchor: 'middle', size: 14 }));
      g.append(text(W / 2, H / 2 + 16, 'even an infinitely heavy rocket could not give this ideal velocity', { anchor: 'middle', size: 11, cls: 'sc-dim-text' }));
      return;
    }
    const o = out.o;
    const fr = ctx.frame({ width: W, height: H, label: 'Two-stage rocket with section lengths proportional to mass' });
    const g = fr.layer('main'); g.replaceChildren();
    const um = ctx.U(MASS), us = ctx.U(SPEED), M = (x) => `${fmt(um.v(x), { digits: 4 })} ${um.label}`, V = (x) => `${fmt(us.v(x), { digits: 4 })} ${us.label}`;
    // flight to the right: nozzle | stage 1 | stage 2 | payload | nose. Lengths ∝ mass / diameter (equal density);
    // a stage left out by the optimum is drawn as a dashed ghost of fixed length
    const cy = 128, h1 = 66, h2 = 48, x0 = 74, xn = 666, nose = 1.7 * h2, GHOST = 70;
    const m1 = o.stage1.loaded, m2 = o.stage2.loaded, mp = v.Mpl, out1 = o.single === 2, out2 = o.single === 1;
    const fixed = (out1 ? GHOST : 0) + (out2 ? GHOST : 0);
    const k = (xn - nose - x0 - fixed) / ((out1 ? 0 : m1 / h1) + (out2 ? 0 : m2 / h2) + mp / h2);
    const L1 = out1 ? GHOST : Math.max(3, (k * m1) / h1), L2 = out2 ? GHOST : Math.max(3, (k * m2) / h2), Lp = Math.max(10, (k * mp) / h2);
    const xs1 = x0, xs2 = xs1 + L1, xp = xs2 + L2, xnose = xp + Lp;
    const ghost = { fill: 'none', stroke: 'var(--schem-dim)', 'stroke-dasharray': '4 3' };
    // a motor: case, propellant grain (share 1 − σ of the length) with its bore, aft and forward closures
    const motor = (x, L, h, sig, field, gone) => {
      if (gone) { g.append(s('rect', { x, y: cy - h / 2, width: L, height: h, ...ghost, 'data-field': field })); return; }
      g.append(s('rect', { x, y: cy - h / 2, width: L, height: h, class: 'sc-body', 'data-field': field }));
      const Lg = L * (1 - sig), xg = x + (L - Lg) * 0.6, hg = h * 0.72;
      if (Lg > 1) {
        g.append(s('rect', { x: xg, y: cy - hg / 2, width: Lg, height: hg, rx: Math.min(4, Lg / 4), fill: 'var(--red)', 'fill-opacity': 0.28, stroke: 'var(--red)', 'stroke-opacity': 0.5, 'data-field': field }));
        g.append(s('line', { x1: xg + 2, x2: xg + Lg - 2, y1: cy, y2: cy, stroke: 'var(--red)', 'stroke-opacity': 0.6, 'stroke-dasharray': '5 3' }));
      }
    };
    // nozzle and fins of the first stage (shape only)
    const hf = out1 ? h2 : h1, xa = out1 ? xs2 : xs1;
    g.append(s('path', { d: `M${xa},${cy - hf * 0.2}L${xa - 14},${cy - hf * 0.32}V${cy + hf * 0.32}L${xa},${cy + hf * 0.2}`, class: 'sc-body-2' }));
    if (!out1) for (const sg of [-1, 1]) g.append(s('path', { d: `M${xs1 + 2},${cy + sg * h1 / 2}L${xs1 - 6},${cy + sg * (h1 / 2 + 26)}L${xs1 + Math.min(42, L1 * 0.45)},${cy + sg * (h1 / 2 + 26)}L${xs1 + Math.min(62, L1 * 0.7)},${cy + sg * h1 / 2}`, class: 'sc-body-2', 'data-field': 'Isp1 s1' }));
    motor(xs1, L1, h1, v.s1, 'Isp1 s1', out1);
    // interstage taper, then the second stage
    if (!out1) g.append(s('path', { d: `M${xs2 - 10},${cy - h1 / 2}L${xs2},${cy - h2 / 2}V${cy + h2 / 2}L${xs2 - 10},${cy + h1 / 2}`, class: 'sc-body-2' }));
    motor(xs2, L2, h2, v.s2, 'Isp2 s2', out2);
    // payload bay and nose cone
    g.append(s('rect', { x: xp, y: cy - h2 / 2, width: Lp, height: h2, class: 'sc-body-2', 'data-field': 'Mpl' }));
    g.append(s('path', { d: `M${xnose},${cy - h2 / 2}Q${xnose + nose * 0.55},${cy - h2 / 2} ${xnose + nose},${cy}Q${xnose + nose * 0.55},${cy + h2 / 2} ${xnose},${cy + h2 / 2}Z`, class: 'sc-body-2', 'data-field': 'Mpl' }));
    // separation planes
    for (const x of [xs2, xp]) g.append(s('line', { x1: x, x2: x, y1: cy - h1 / 2 - 6, y2: cy + h1 / 2 + 6, class: 'sc-thin', 'stroke-dasharray': '2 3' }));
    g.append(s('line', { x1: x0 - 30, x2: xn + 24, y1: cy, y2: cy, class: 'sc-thin', 'stroke-dasharray': '10 4 2 4', opacity: 0.5 }));
    // labels over each section, pushed apart (≥ 150 px) and joined to their section by a leader
    const lab = [
      { x: xs1 + L1 / 2, h: out1 ? h2 : h1, field: 'Isp1 s1', t: ['Stage 1', out1 ? 'left out' : M(m1), out1 ? '' : `propellant ${M(o.stage1.pr)}`] },
      { x: xs2 + L2 / 2, h: h2, field: 'Isp2 s2', t: ['Stage 2', out2 ? 'left out' : M(m2), out2 ? '' : `propellant ${M(o.stage2.pr)}`] },
      { x: xp + (Lp + nose) / 2, h: h2, field: 'Mpl', t: ['Payload', M(mp), ''] },
    ];
    lab[0].lx = Math.max(70, lab[0].x); lab[1].lx = Math.max(lab[1].x, lab[0].lx + 150); lab[2].lx = Math.max(lab[2].x, lab[1].lx + 150);
    for (let i = 2; i > 0; i--) if (lab[i].lx > W - 70) { lab[i].lx = W - 70; lab[i - 1].lx = Math.min(lab[i - 1].lx, lab[i].lx - 150); }
    for (const l of lab) {
      const yTop = cy - l.h / 2 - (l === lab[0] && !out1 ? 0 : 0);
      g.append(s('path', { d: `M${l.lx},${44}V${50}L${l.x},${Math.min(yTop - 4, 64)}V${yTop - 2}`, class: 'sc-thin', fill: 'none', opacity: 0.6, 'data-field': l.field }));
      l.t.forEach((t, i) => t && g.append(text(l.lx, 8 + (i + 1) * 13 - (i ? 0 : 0), t, { anchor: 'middle', size: i ? 10.5 : 11.5, cls: i ? 'sc-dim-text' : 'sc-label', field: l.field })));
    }
    // liftoff mass against your limit: a gauge in the verdict colour
    const gy = cy + h1 / 2 + 40, gl = 260, gx = xn + 24 - gl, top = Math.max(1.3 * v.Mmax, o.M01), G = (m) => gx + (gl * Math.min(m, top)) / top;
    g.append(s('rect', { x: gx, y: gy - 4, width: gl, height: 8, fill: 'var(--surface-2)', stroke: 'var(--border)' }));
    g.append(s('rect', { x: gx, y: gy - 4, width: G(o.M01) - gx, height: 8, fill: COL[out.lv], 'fill-opacity': 0.6, 'data-field': 'dv Mpl Isp1 Isp2 s1 s2' }));
    g.append(s('line', { x1: G(v.Mmax), x2: G(v.Mmax), y1: gy - 9, y2: gy + 9, stroke: 'var(--danger)', 'stroke-width': 2, 'data-field': 'Mmax' }));
    g.append(text(gx - 8, gy + 4, `liftoff M_{01} = ${M(o.M01)} · ${fmt(o.M01 / mp, { digits: 3 })} × payload`, { anchor: 'end', size: 11 }));
    g.append(text(G(v.Mmax), gy + 22, `your limit ${M(v.Mmax)}`, { anchor: 'middle', size: 10, cls: 'sc-dim-text', field: 'Mmax' }));
    // ideal velocity contributed by each stage
    const yb = 252, bh = 18, bl = xn + 24 - x0, B1 = bl * (o.dv1 / (o.dv1 + o.dv2 || 1));
    g.append(s('rect', { x: x0, y: yb, width: B1, height: bh, class: 'sc-body', 'data-field': 'dv' }));
    g.append(s('rect', { x: x0 + B1, y: yb, width: bl - B1, height: bh, class: 'sc-body-2', 'data-field': 'dv' }));
    g.append(text(x0, yb - 7, `stage 1: \\Delta V_1 = ${V(o.dv1)}`, { size: 11, field: 'dv' }));
    g.append(text(x0 + bl, yb - 7, `stage 2: \\Delta V_2 = ${V(o.dv2)}`, { anchor: 'end', size: 11, field: 'dv' }));
    g.append(text(x0 + bl / 2, yb + bh + 16, `required ideal velocity \\Delta V_{ID} = ${V(v.dv)}`, { anchor: 'middle', cls: 'sc-dim-text', size: 10.5, field: 'dv' }));
    g.append(text(20, H - 10, 'section lengths proportional to mass · red: propellant · nozzle, fins and nose cone drawn for shape', { cls: 'sc-dim-text', size: 10 }));
  },
  symbols: {
    '\\Delta V_{ID}': 'required ideal velocity (m/s or ft/s)', 'M_{PL}': 'payload mass (kg or lb)', 'I_{SP1}': 'first-stage specific impulse', 'I_{SP2}': 'second-stage specific impulse',
    '\\sigma_1': 'first-stage structural fraction', '\\sigma_2': 'second-stage structural fraction', '\\sigma_i': 'structural fraction of stage $i$', 'g_0': 'standard acceleration of gravity',
    'c_1': 'first-stage exhaust velocity', 'c_2': 'second-stage exhaust velocity', 'c_i': 'exhaust velocity of stage $i$', 'c': 'common exhaust velocity',
    '\\lambda': 'Lagrange multiplier: velocity gained per fractional increase in liftoff mass (m/s or ft/s)', '\\eta_1': 'first-stage payload ratio', '\\eta_2': 'second-stage payload ratio', '\\eta_i': 'payload ratio of stage $i$', '\\eta_{TOT}': 'total payload ratio',
    '\\mu_1': 'first-stage mass ratio', '\\mu_2': 'second-stage mass ratio', 'M_{01}': 'liftoff mass (kg or lb)', 'M_{02}': 'mass at second-stage ignition (kg or lb)', 'M_1': 'loaded first-stage mass', 'M_2': 'loaded second-stage mass',
    'M_{PR1}': 'first-stage propellant (kg or lb)', 'M_{ST1}': 'first-stage structure (kg or lb)', 'M_{PR2}': 'second-stage propellant (kg or lb)', 'M_{ST2}': 'second-stage structure (kg or lb)',
    '\\Delta V_1': 'ideal velocity from the first stage (m/s or ft/s)', '\\Delta V_2': 'ideal velocity from the second stage (m/s or ft/s)', '\\Delta V_{lim}': 'ideal velocity limit of the two stages', '\\Delta V_i': 'ideal velocity from stage $i$',
    'M_{max}': 'heaviest liftoff mass you allow (kg or lb)',
    'M_{PL,max}': 'heaviest payload within your limit (kg or lb)',
    '\\Delta V_{ok}': 'fastest ideal velocity within your limit (m/s or ft/s)',
    '\\Delta V_{2st}': 'ideal velocity above which both stages carry mass (m/s or ft/s)',
    'M_{01,c}': 'liftoff mass with a common average specific impulse (kg or lb)',
    '\\Delta V_c': 'ideal velocity the common-impulse split gives (m/s or ft/s)',
    M_1: 'loaded first stage (kg or lb)',
    M_2: 'loaded second stage (kg or lb)',
    c_1: 'first-stage exhaust velocity, $g_0I_{SP1}$ (m/s or ft/s)',
    c_2: 'second-stage exhaust velocity, $g_0I_{SP2}$ (m/s or ft/s)',
    c: 'average exhaust velocity (m/s or ft/s)',
  },
  constants: [
    { sym: 'g_0', desc: 'standard acceleration of gravity', si: [G0 * 0.3048, '\\mathrm{m\\,s^{-2}}'], us: [G0, '\\mathrm{ft\\,s^{-2}}'] },
  ],
  report(v, out, R) {
    if (out.blocked) return [];
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
export default DEF;
