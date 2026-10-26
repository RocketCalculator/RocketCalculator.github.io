// Yo-Yo Despinner — UI definition.
import { yoyo, radialMass, radialSpinRatio, evaluate, solve, G0 } from '../calc/yoyo.js';
import { s, fmt } from '../util.js';
import { path, text, dim } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const INERTIA = { dim: 'inertia', internal: 'slugft2' };
const SPIN = { dim: 'frequency', internal: 'hz', units: { si: 'rpm', us: 'rpm' } };
const DRUM = { dim: 'length', internal: 'in' };
const WIRE = { dim: 'distance', internal: 'in' };
const MU = { dim: 'linearDensity', internal: 'lbpin' };
const MASS = { dim: 'smallMass', internal: 'slug' };
const FORCE = { dim: 'force', internal: 'lbf' };
const TIME = { dim: 'time', internal: 's' };
const PCT = { dim: 'percent', internal: 'pct' };
const NONE = { dim: 'none' };
const TAU = 2 * Math.PI;
const ST = { safe: 'ok', marginal: 'warn', unsafe: 'err' };
const RANK = { safe: 0, marginal: 1, unsafe: 2 };
// verdict bands (D-yo-yo-despin, project choices, not published limits): the final spin is on target within the user's
// tolerance, marginal up to twice it; the wire is safe at the user's safety factor, marginal between 1 and it
const SPIN_MARGINAL = 2;
const check = (v) => v.mode === 'check';
const Q = (x, spec, digits = 3) => `${fmt(toDisplay(x, spec), { digits })} ${unitLabel(displayUnit(spec))}`;

// internal → the slug-ft-s-rad set the dynamics use
const inputsOf = (v) => ({ I: v.I, a: v.a / 12, l: v.l / 12, w0: TAU * v.f0, mu: (v.mu * 12) / G0 });

/** Final spin (Hz) and peak wire tension (lbf) of a built yo-yo (total despin mass m, slug) for inertia × kI and spin × kf. */
const corner = (p, m, kI, kf) => { const e = evaluate({ I: p.I * kI, a: p.a, l: p.l, w0: p.w0 * kf, m }); return { ff: (e.wf / TAU), T: e.T }; };
/** Worst miss of the target (Hz) and the highest tension over the uncertainty corners. */
function spread(p, m, eI, ef, target) {
  let lo = Infinity, hi = -Infinity, T = 0;
  for (const kI of [1 - eI / 100, 1, 1 + eI / 100]) for (const kf of [1 - ef / 100, 1, 1 + ef / 100]) {
    const c = corner(p, m, kI, kf); lo = Math.min(lo, c.ff); hi = Math.max(hi, c.ff); T = Math.max(T, c.T);
  }
  return { lo, hi, T, miss: Math.max(Math.abs(lo - target), Math.abs(hi - target)) };
}

function run(v) {
  const p = inputsOf(v), warnings = [];
  // a yo-yo only slows the spin: a target at or above the initial spin is sized for 95 % of it (nearest buildable)
  const target = Math.min(v.ff, 0.95 * v.f0);
  if (v.ff > target) warnings.push({ level: 'warn', text: `The target final spin (${Q(v.ff, SPIN)}) is not below the initial spin: a yo-yo can only slow the vehicle.`, fix: `Enter a target below ${Q(v.f0, SPIN)}; the weights shown are for ${Q(target, SPIN)}.` });
  const wire = (2 * p.mu * p.l) / 3;   // the wires count as a third of their mass
  let mW = check(v) ? 2 * v.mwEach : radialMass(p.I, p.a, p.l, target / v.f0) - wire, bare = false;
  if (!check(v) && !(mW > 0)) {
    bare = true; mW = 0;
    warnings.push({ level: 'warn', text: 'The two wires alone carry more than the despin mass needed: even with no weights the vehicle is slowed below the target.', fix: `Use lighter wire, at most ${Q((1.5 * radialMass(p.I, p.a, p.l, target / v.f0)) / p.l / 12 * G0, MU, 3)} (now ${Q(v.mu, MU)}), or a shorter one.` });
  }
  const o = yoyo({ ...p, wf: TAU * target, mWeights: check(v) || bare ? mW : undefined });
  return { p, o, target, warnings, bare };
}

export default {
  slug: 'yo-yo-despin',
  topic: 'yo-yo-despinner',
  title: 'Yo-Yo Despinner',
  subtitle: 'Size the two <b>despin weights</b> and wires that slow a spinning stage or payload to a chosen roll rate — or check the ones you have — with the final spin, the peak wire load against the wire’s strength, and the time it takes.',
  verdict: true,
  tiers: true,
  intro: {
    what: 'Two weights on wires wrapped round the vehicle are let go; they fly out, unwind the wires and swing out until the wires point straight outwards, where they are released. The calculator finds the weights for your target spin, or the spin your weights give, and the pull on each wire.',
    why: 'Spin-stabilised stages often must be slowed before a payload separates or an instrument works. Yo-yo weights do it with no propellant and very little hardware, but the wires take a sharp pull and the final spin is only as good as the roll inertia you know.',
    when: 'Designing the despin system of a spin-stabilised stage or payload, checking weights and wires you already have, and choosing a wire strong enough.',
  },
  info: {
    text: [
      'Two weights sit on wires wrapped round the vehicle. Let go, they fly outward, unwinding the wires and carrying spin (angular momentum) away from the vehicle.',
      'Fully unwound, each wire swings about its attachment point until it points straight out along the radius, where the weights let go. Momentum and energy are conserved, so the final spin depends only on the roll inertia, the drum radius, the wire length and the despin mass.',
      'The verdict checks the final spin against your target and tolerance (including what you do not know exactly about the inertia and the initial spin) and the peak wire pull against the wire’s breaking strength.',
    ],
    tex: '(D+ma^2)^2=mR^2(D^\\prime+ma^2),\\quad D=I(1-r),\\ D^\\prime=I(1-r^2),\\ R=a+l',
    steps: [
      'Enter the roll moment of inertia and the initial spin, each with how well you know it.',
      'Choose whether to size the weights or check weights you have; enter the drum radius, wire length, wire mass and breaking strength.',
      'Enter the final spin you want, the tolerance you accept and the safety factor for the wire.',
      'Read the verdict and its fixes; watch the weights unwind in the drawing and follow spin and wire pull in time below.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'veh', title: 'Vehicle and spin',
      fields: [
        { id: 'I', label: 'Roll moment of inertia', sym: 'I', ...INERTIA, default: 2.5, min: 1e-4, max: 1000, slider: { min: 0.01, max: 10, step: 0.01 },
          info: { text: ['How hard the vehicle is to spin about its long axis, without the despin weights — mass times radius squared, added up over every part.', 'Measure it with a bifilar pendulum (see that calculator) or add up the parts in CAD. Include a burnt-out motor if it is despun with the payload.', 'The despin mass needed grows in proportion: 10 % more inertia needs about 10 % heavier weights.'], tex: 'm\\approx\\frac{(1-r)I}{(1+r)R^2-a^2}', range: 'Small payloads 0.01–0.2 slug·ft² (0.014–0.27 kg·m²); sounding-rocket payloads 2–8 slug·ft² (3–11 kg·m²).', doc: 'overview' } },
        { id: 'eI', label: 'Inertia known to within ±', sym: '\\epsilon_I', ...PCT, default: 2, min: 0, max: 50, slider: { min: 0, max: 20, step: 0.5 },
          info: { text: ['How far the real roll inertia may be from the value above, as a percentage.', 'A pendulum measurement is good to a few per cent; an estimate from CAD or a spent motor with unknown residue may be 10–20 % off.', 'A rigid yo-yo turns an error in inertia into an error in final spin; the verdict checks the target at both ends of this range.'], tex: 'I^\\prime=I(1\\pm\\epsilon_I)', range: '1–3 % measured; 5–20 % estimated.', doc: 'uncertainty' } },
        { id: 'f0', label: 'Initial spin rate', sym: 'f_0', ...SPIN, default: 7.5, min: 0.01, max: 50, slider: { min: 0.5, max: 15, step: 0.05 },
          info: { text: ['How fast the vehicle spins when the weights are let go, in revolutions per minute.', 'From the spin-up design (canted fins, spin motors) or flight data.', 'The wire pull grows with the square of the spin: 20 % faster spin pulls 44 % harder. For a target above zero, the final spin scales with it too.'], tex: '\\omega_0=2\\pi f_0', range: '100–600 rpm for spin-stabilised stages and sounding-rocket payloads.', doc: 'phase1' } },
        { id: 'ef', label: 'Initial spin known to within ±', sym: '\\epsilon_f', ...PCT, default: 2, min: 0, max: 50, slider: { min: 0, max: 30, step: 0.5 },
          info: { text: ['How far the real initial spin may be from the value above, as a percentage.', 'Spin-up by fins or motors can be well off: one satellite launch spun up 30 % faster than planned (Fedor).', 'A rigid yo-yo leaves the same percentage error in the final spin; for a complete despin (target 0) it does not matter.'], tex: 'f_f=r\\,f_0(1\\pm\\epsilon_f)', range: '2–5 % for a known motor; up to 30 % for uncertain spin-up.', doc: 'uncertainty' } },
      ],
    },
    {
      id: 'yo', title: 'Yo-yo and wires',
      fields: [
        { id: 'mode', label: 'What to do', kind: 'select', default: 'size', options: [{ value: 'size', label: 'Size the weights for the target' }, { value: 'check', label: 'Check weights I have' }],
          info: { text: ['Size: the calculator finds the two weights that leave exactly the target spin.', 'Check: enter the weights you have (each, as weighed) and it gives the spin they leave.'], doc: 'release' } },
        { id: 'a', label: 'Drum (attachment) radius', sym: 'a', ...DRUM, default: 15, min: 0.1, max: 100, slider: { min: 0.5, max: 30, step: 0.1 },
          info: { text: ['Radius at which the wires are wrapped and fixed — usually the outer skin, half the body diameter.', 'Measure the body diameter and halve it.', 'A larger drum releases the weights further out, so they need less mass, but each wire pulls harder.'], tex: 'R=a+l', range: '1–3 in (25–75 mm) small payloads; 10–15 in (250–380 mm) sounding rockets.', doc: 'phase1' } },
        { id: 'l', label: 'Wire length (each)', sym: 'l', ...WIRE, default: 206, min: 1, max: 2000, slider: { min: 5, max: 400, step: 1 },
          info: { text: ['Length of each wire from its fixing on the drum to the weight.', 'Measure it; one full wrap round the drum is 2π times the drum radius.', 'A longer wire releases the weights further out: much lighter weights do the same despin, and the manoeuvre takes longer.'], tex: '\\varphi_{end}=l/a', range: '1–3 wraps; one flown sounding-rocket yo-yo used three wraps, 15.7 ft on a 10 in drum (Bush).', doc: 'phase1' } },
        { id: 'mu', label: 'Wire mass per unit length', sym: '\\mu', ...MU, default: 0.0002083, min: 0, max: 0.01, slider: { min: 0, max: 0.002, step: 0.00001 },
          info: { text: ['Mass of the wire per unit length.', 'Weigh a measured length of the wire or cable and divide.', 'Each wire counts as a third of its mass in the despin mass, so a heavy wire lets the weights be lighter.'], tex: 'm=m_w+\\frac{2\\mu l}{3}', range: 'Thin steel cable about 2–10 g/m (0.0001–0.0006 lb/in).', doc: 'wire' } },
        { id: 'Tb', label: 'Wire breaking strength', sym: 'T_b', ...FORCE, default: 400, min: 0.1, max: 1e5, slider: { min: 5, max: 1000, step: 1 },
          info: { text: ['The pull at which one wire, with its end fittings, breaks.', 'From the cable maker’s datasheet, or pull-test a sample with its fittings; use the weakest of wire, crimp and attachment.', 'The verdict compares it with the highest pull in either phase, at the fast end of your spin uncertainty.'], tex: 'n=\\frac{T_b}{T_{max}}', range: 'Read it from the datasheet of your wire or cable.', doc: 'verdict' } },
        { id: 'mwEach', label: 'Each despin weight (as weighed)', sym: 'm_w/2', ...MASS, default: 0.0019, min: 1e-6, max: 1, slider: { min: 0.00005, max: 0.01, step: 0.00001 }, when: check,
          info: { text: ['Mass of one of your two weights, with its fittings but without the wire.', 'Weigh it.', 'Heavier weights take more spin away: the final spin falls, and the wire pull rises.'], tex: 'r=\\frac{\\omega_f}{\\omega_0}', range: 'Tens of grams to a few hundred grams each.', doc: 'release' } },
      ],
    },
    {
      id: 'lim', title: 'Your limits',
      fields: [
        { id: 'ff', label: 'Target final spin rate', sym: 'f_f', ...SPIN, default: 1.66667, min: 0, max: 50, slider: { min: 0, max: 10, step: 0.01 },
          info: { text: ['The spin you want after the weights let go. Zero stops the vehicle completely.', 'From what the payload or the next stage needs.', 'A lower target needs heavier weights; a complete despin is the one case where an error in the initial spin does not matter.'], tex: 'r=\\frac{f_f}{f_0}', range: '0 for a complete despin; 10–100 rpm to keep a little spin.', doc: 'release' } },
        { id: 'tol', label: 'Final spin tolerance ±', sym: '\\Delta f_f', ...SPIN, default: 0.1, min: 0.001, max: 10, slider: { min: 0.01, max: 1, step: 0.005 },
          info: { text: ['How far the final spin may be from the target and still be acceptable.', 'From the payload’s requirement; one flown complete despin asked for 0 ± 6 rpm (Bush).', 'The verdict is on target within this tolerance and marginal up to twice it — a project choice, not a published limit.'], tex: '|f_f-f_{target}|\\le\\Delta f_f', range: '±2–10 rpm.', doc: 'verdict' } },
        { id: 'SF', label: 'Wire safety factor', sym: 'n_{req}', ...NONE, default: 2, min: 1, max: 10, slider: { min: 1, max: 4, step: 0.05 },
          info: { text: ['How many times stronger than the highest pull each wire must be.', 'Your choice or your programme’s rule; there is no published value for yo-yo wires.', 'Between 1 and this factor the verdict is marginal; below 1 the wire breaks.'], tex: 'n=\\frac{T_b}{T_{max}}\\ge n_{req}', range: '1.5–3.', doc: 'verdict' } },
      ],
    },
  ],
  results: [
    { id: 'ffActual', label: 'Final spin rate', sym: 'f_f', ...SPIN, key: true, digits: 4, status: (x, out) => ST[out.spinLv],
      note: (x, out) => `target ${fmt(toDisplay(out.target, SPIN), { digits: 3 })} ± ${fmt(toDisplay(out.v.tol, SPIN), { digits: 2 })} · ${fmt(toDisplay(out.sp.lo, SPIN), { digits: 3 })} to ${fmt(toDisplay(out.sp.hi, SPIN), { digits: 3 })} with the uncertainties`,
      info: { text: ['The spin left when the weights let go, for your nominal inertia and initial spin.', 'The note gives the range over the inertia and spin uncertainties; the verdict uses its worst end.', 'Below zero means the weights reversed the spin.'], tex: 'f_f=r\\,f_0', doc: 'uncertainty' } },
    { id: 'weightEach', label: 'Each despin weight', sym: 'm_w/2', ...MASS, key: true, digits: 4,
      note: (x, out) => (check(out.v) ? (out.results.mNeedEach === '—' ? 'as weighed' : `as weighed; ${Q(out.results.mNeedEach, MASS)} hits the target`) : 'sized for the target; ⅓ of the wire mass deducted'),
      info: { text: ['Mass of each of the two weights. Sizing: the mass that leaves exactly the target spin, after deducting a third of the wire mass. Checking: your weights.', 'The two weights must be equal so the vehicle is not pushed sideways.'], tex: '\\frac{m_w}{2}=\\frac{1}{2}\\left(m-\\frac{2\\mu l}{3}\\right)', doc: 'wire' } },
    { id: 'Tpeak', label: 'Peak wire tension', sym: 'T_{max}', ...FORCE, key: true, digits: 3, status: (x, out) => ST[out.wireLv],
      note: (x, out) => `${fmt(out.results.nWire, { digits: 3 })}× under the breaking strength (you ask ${fmt(out.v.SF, { digits: 3 })}×)`,
      info: { text: ['The highest pull in each wire, in either phase, at the worst end of your spin and inertia uncertainty.', 'It usually peaks while the wire unwinds; the swing-out ends at a second, lower peak.', 'It grows with the square of the spin and roughly with the drum radius.'], tex: 'T_{max}=\\max(T_{1,max},T_{2,max})', doc: 'verdict' } },
    { id: 'tRelease', label: 'Despin time', sym: 't_r', ...TIME, digits: 3, note: (x, out) => `unwinding ${fmt(out.o.tUnwind, { digits: 3 })} s, then swing-out`,
      info: { text: ['Time from letting the weights go to their release.', 'Unwinding takes the unwound angle divided by the initial spin; the swing-out is integrated in time.', 'Longer wires take longer and pull more gently.'], tex: 't_r=\\frac{l}{a\\,\\omega_0}+t_{swing}', doc: 'phase1' } },
    { id: 'nWire', label: 'Wire safety factor achieved', sym: 'n', ...NONE, digits: 3, info: { text: ['Breaking strength over the peak tension.'], tex: 'n=\\frac{T_b}{T_{max}}', doc: 'verdict' } },
    { id: 'ffLo', label: 'Final spin, low end of the uncertainty', sym: 'f_{f,min}', ...SPIN, digits: 4, info: { text: ['Lowest final spin over the inertia and initial-spin uncertainty, with the weights fixed.'], doc: 'uncertainty' } },
    { id: 'ffHi', label: 'Final spin, high end of the uncertainty', sym: 'f_{f,max}', ...SPIN, digits: 4, info: { text: ['Highest final spin over the uncertainty.'], doc: 'uncertainty' } },
    { id: 'mNeedEach', label: 'Each weight for the target (— when no weight can)', sym: 'm_{w,req}/2', ...MASS, digits: 4, info: { text: ['The weight that leaves exactly the target spin with your wire.'], tex: '\\frac{m_{w,req}}{2}=\\frac12\\left(m(r)-\\frac{2\\mu l}{3}\\right)', doc: 'verdict' } },
    { id: 'lNeed', label: 'Wire length for the target with your weights (— if sizing)', sym: 'l_{req}', ...WIRE, digits: 4, info: { text: ['Checking mode: the wire length (each) that makes your weights hit the target, solved by bisection.'], doc: 'verdict' } },
    { id: 'TbNeed', label: 'Breaking strength needed', sym: 'T_{b,req}', ...FORCE, digits: 3, info: { tex: 'T_{b,req}=n_{req}T_{max}', doc: 'verdict' } },
    { id: 'T1', label: 'Peak tension while unwinding (nominal)', sym: 'T_{1,max}', ...FORCE, info: { text: ['Peak pull in each wire during unwinding, at the nominal spin.'], tex: 'T_1=\\frac{m}{2}a\\omega_0^2\\,\\frac{4c\\varphi(c-1)}{(c+\\varphi^2)^2},\\ \\max\\text{ at }\\varphi^2=c/3', doc: 'phase1' } },
    { id: 'T2', label: 'Peak tension during swing-out (nominal)', sym: 'T_{2,max}', ...FORCE, info: { text: ['Pull in each wire as it swings out; highest at release.'], tex: 'T_2=\\frac{m}{2}\\left(a\\omega_f^2+l\\dot\\beta^2\\right)', doc: 'release' } },
    { id: 'm', label: 'Total despin mass (weights + ⅓ wires)', sym: 'm', ...MASS, info: { tex: 'm=\\frac{-A_1-\\sqrt{A_1^2-4A_2A_0}}{2A_2}', doc: 'release' } },
    { id: 'mApprox', label: 'Total despin mass, Fedor closed form', sym: 'm_F', ...MASS, info: { tex: 'm_F=\\frac{(1-r)I}{(1+r)R^2-a^2}', text: ['Neglects small terms in $ma^2$; within a fraction of a percent for usual designs.'], doc: 'release' } },
    { id: 'r', label: 'Spin ratio', sym: 'r', ...NONE, digits: 4, info: { text: ['Final over initial spin.'], tex: 'r=\\omega_f/\\omega_0', doc: 'release' } },
    { id: 'wraps', label: 'Wraps of wire round the drum', sym: 'l/2\\pi a', ...NONE, digits: 3, info: { text: ['How many times each wire goes round the drum.'], tex: 'n_{wraps}=\\frac{l}{2\\pi a}', doc: 'phase1' } },
    { id: 'lambda', label: 'Wire length for complete despin (tangential release)', sym: '\\lambda', ...WIRE, info: { text: ['If the weights were let go at the end of unwinding instead of after the swing-out, this length would stop the spin.'], tex: '\\lambda=\\sqrt{I/m+a^2}', doc: 'phase1' } },
    { id: 'c', label: 'Yo-yo parameter', sym: 'c', ...NONE, digits: 5, info: { tex: 'c=1+\\frac{I}{ma^2}', doc: 'phase1' } },
    { id: 'releaseSpeed', label: 'Weight speed at release', sym: 'u', dim: 'speed', internal: 'fts', info: { text: ['How fast each weight flies away after release.'], tex: 'u=\\frac{(I+ma^2)\\omega_0-I\\omega_f}{mR}', doc: 'release' } },
    { id: 'T2Fedor', label: 'Release tension, worksheet estimate', sym: 'T_{2,F}', ...FORCE, info: { text: ['A simpler estimate of the phase-2 tension; it is lower than the exact release value and should not be used for design.'], doc: 'release' } },
    { id: 'wireMass', label: 'Mass of both wires', sym: '2\\mu l', ...MASS, info: { tex: 'm_{wires}=2\\mu l', doc: 'wire' } },
  ],
  compute(v) {
    const { p, o, target, warnings, bare } = run(v);
    const sp = spread(p, o.m, v.eI, v.ef, target);
    const Tmax = Math.max(o.T1, o.T2, sp.T), n = v.Tb / Tmax, ffNom = (o.r * p.w0) / TAU, tolHz = v.tol;
    const spinLv = sp.miss <= tolHz * (1 + 1e-9) ? 'safe' : sp.miss <= SPIN_MARGINAL * tolHz ? 'marginal' : 'unsafe';
    const wireLv = n >= v.SF ? 'safe' : n >= 1 ? 'marginal' : 'unsafe';
    const lv = RANK[spinLv] >= RANK[wireLv] ? spinLv : wireLv;
    // solved fixes
    const rT = target / v.f0, wire = (2 * p.mu * p.l) / 3, mT = radialMass(p.I, p.a, p.l, rT), mNeed = (mT - wire) / 2;
    const nomMiss = Math.abs(ffNom - target) > 1e-9 * Math.max(1, v.f0);
    let lNeed = null;
    if (check(v)) lNeed = solve((L) => radialSpinRatio(p.I, p.a, L, o.mWeights + (2 * p.mu * L) / 3), rT, 1e-3 * p.a, 200 * (p.a + p.l));
    const missAt = (eI, ef) => spread(p, o.m, eI, ef, target).miss;
    const eINeed = v.eI > 0 && missAt(0, v.ef) < tolHz ? solve((e) => missAt(e, v.ef), tolHz, 0, v.eI) : null;
    const efNeed = v.ef > 0 && missAt(v.eI, 0) < tolHz ? solve((e) => missAt(v.eI, e), tolHz, 0, v.ef) : null;
    const spinFixes = [], wireFixes = [];
    if (spinLv !== 'safe') {
      if (check(v) && nomMiss && mNeed > 0) spinFixes.push(`Use weights of <b>${Q(mNeed, MASS)}</b> each (now ${Q(v.mwEach, MASS)})`);
      if (check(v) && nomMiss && lNeed) spinFixes.push(`make each wire <b>${Q(lNeed * 12, WIRE)}</b> long (now ${Q(v.l, WIRE)})`);
      if (bare) spinFixes.push(`use wire of at most <b>${Q((1.5 * mT) / p.l / 12 * G0, MU)}</b> (now ${Q(v.mu, MU)})`);
      if (eINeed != null) spinFixes.push(`measure the roll inertia to within <b>±${fmt(eINeed, { digits: 2 })} %</b> (now ±${fmt(v.eI, { digits: 3 })} %)`);
      if (efNeed != null) spinFixes.push(`know the initial spin to within <b>±${fmt(efNeed, { digits: 2 })} %</b> (now ±${fmt(v.ef, { digits: 3 })} %)`);
      if (!spinFixes.length) spinFixes.push(`widen the tolerance to <b>±${Q(sp.miss, SPIN)}</b>, or despin in two stages to cut the error`);
    }
    if (wireLv !== 'safe') wireFixes.push(`use wire and fittings of at least <b>${Q(v.SF * Tmax, FORCE)}</b> breaking strength (now ${Q(v.Tb, FORCE)})`);
    const fixes = (RANK[wireLv] > RANK[spinLv] ? [...wireFixes, ...spinFixes] : [...spinFixes, ...wireFixes]).slice(0, 3)
      .map((f, i, a) => (i ? f : f[0].toUpperCase() + f.slice(1)) + (i < a.length - 1 ? ', or' : '.'));
    const spinTxt = `final spin <b>${Q(ffNom, SPIN)}</b> (target ${Q(target, SPIN)} ± ${Q(v.tol, SPIN, 2)}; ${fmt(toDisplay(sp.lo, SPIN), { digits: 3 })} to ${Q(sp.hi, SPIN)} with the uncertainties)`;
    const wireTxt = `peak wire pull <b>${Q(Tmax, FORCE)}</b> against ${Q(v.Tb, FORCE)} breaking (${fmt(n, { digits: 3 })}×, you ask ${fmt(v.SF, { digits: 3 })}×)`;
    const title = lv === 'safe' ? 'On target, and the wires hold'
      : wireLv === 'unsafe' ? 'The wires break' : spinLv === 'unsafe' ? 'The final spin misses the target'
        : wireLv === 'marginal' && spinLv === 'marginal' ? 'Little margin on the spin and the wire' : wireLv === 'marginal' ? 'On target, but little margin on the wire' : 'The wires hold, but the spin may drift off target';
    const verdict = { level: lv, title, text: `${spinTxt[0].toUpperCase()}${spinTxt.slice(1)}; ${wireTxt}.`, fixes };
    if (o.T1atEnd) warnings.push({ level: 'info', text: 'The wire is shorter than the length at which the unwinding pull would peak; the peak is reached at full unwinding.' });
    if (o.m * p.a * p.a > 0.2 * p.I) warnings.push({ level: 'warn', text: 'The despin mass carries more than a fifth of the roll inertia at the drum radius — check the design.', fix: 'A longer wire needs much less mass.' });
    if (!(Math.abs(o.wSim / p.w0 - o.r) <= 5e-3 * Math.max(1, Math.abs(o.r)))) warnings.push({ level: 'warn', text: 'The weights are so heavy against the vehicle that the time history (plots, drawing, swing-out peak) is only approximate; the final spin and release values come from the exact conservation solution.', fix: 'Use lighter weights or check the roll inertia.' });
    if (o.r < 0) warnings.push({ level: 'warn', text: 'These weights reverse the spin: the vehicle ends up turning the other way.', fix: check(v) && mNeed > 0 ? `Use lighter weights (${Q(mNeed, MASS)} each hits the target).` : 'Use lighter weights or a shorter wire.' });
    const results = {
      ffActual: ffNom, weightEach: o.mWeights / 2, Tpeak: Tmax, tRelease: o.tRelease, nWire: n, ffLo: sp.lo, ffHi: sp.hi,
      mNeedEach: mNeed > 0 ? mNeed : '—', lNeed: lNeed ? lNeed * 12 : '—', TbNeed: v.SF * Tmax,
      T1: o.T1, T2: o.T2, m: o.m, mApprox: o.mApprox, r: o.r, wraps: p.l / (TAU * p.a), lambda: o.lambda * 12, c: o.c,
      releaseSpeed: o.releaseSpeed, T2Fedor: o.T2Fedor, wireMass: o.wireMass,
    };
    return { results, warnings, verdict, o, p, v, sp, target, Tmax, spinLv, wireLv, lv };
  },
  plots: [
    {
      id: 'history', title: 'Spin and wire pull through the despin', wide: true, height: 460,
      info: { text: ['Two views on one time axis, from letting the weights go to their release: the vehicle’s spin (with your target and tolerance as red lines) and the pull in each wire (with the breaking strength in red and the strength divided by your safety factor dashed).', 'The pull peaks while the wire unwinds, drops, and rises again as the wire swings out. Hover to read both at one moment.'], doc: 'phase1' },
      build(v, out, { U }) {
        const us = U(SPIN), uf = U(FORCE), smp = out.o.sim.samples, ph = (k, f) => smp.filter((q) => q.phase === k).map((q) => [q.t, f(q)]);
        const T = (q) => uf.v(q.T), W = (q) => us.v(q.w / TAU), top = uf.v(1.12 * Math.max(out.Tmax, Math.min(v.Tb, 2.5 * out.Tmax)));
        const tl = [out.target - v.tol, out.target + v.tol].map((y) => us.v(y));
        return {
          x: { label: 'Time after letting go', unit: '\\mathrm{s}' }, xDomain: [0, out.o.tRelease],
          vlines: [{ x: out.o.tUnwind, label: 'unwound', color: 'var(--text-3)' }],
          panels: [
            { y: { label: 'Spin', unit: us.label }, color: 'var(--series-2)', includeZero: true,
              series: [{ name: 'spin, unwinding', points: ph(1, W) }, { name: 'spin, swing-out', dash: '7 4', points: ph(2, W) }],
              hlines: [{ y: tl[1], label: 'target ± tolerance', color: 'var(--danger)' }, { y: tl[0], color: 'var(--danger)' }] },
            { y: { label: 'Wire pull', unit: uf.label }, color: 'var(--series-1)', yDomain: [0, top],
              series: [{ name: 'pull, unwinding', points: ph(1, T) }, { name: 'pull, swing-out', dash: '7 4', points: ph(2, T) }],
              hlines: [...(uf.v(v.Tb) <= top ? [{ y: uf.v(v.Tb), label: 'breaking strength', color: 'var(--danger)' }] : []),
                ...(uf.v(v.Tb / v.SF) <= top ? [{ y: uf.v(v.Tb / v.SF), label: `÷ safety factor ${fmt(v.SF, { digits: 3 })}`, color: 'var(--text-3)' }] : [])] },
          ],
        };
      },
    },
    {
      id: 'design', title: 'Choosing the weights: final spin against weight mass', wide: true,
      info: { text: ['Final spin against the mass of each weight, for your wire and drum: solid at your nominal inertia, dashed at the low and high ends of its uncertainty. The red lines are your target ± tolerance.', 'Where the curves cross the band are the weights that work; the dashed curves show how much a wrong inertia moves the spin.'], doc: 'uncertainty' },
      build(v, out, { U }) {
        const us = U(SPIN), um = U(MASS), p = out.p, wire = (2 * p.mu * p.l) / 3, mw = out.o.mWeights / 2, mn = typeof out.results.mNeedEach === 'number' ? out.results.mNeedEach : mw;
        const top = 2.2 * Math.max(mw, mn, 1e-7), curve = (k) => Array.from({ length: 81 }, (_, i) => {
          const each = (top * (i + 1)) / 81;
          return [um.v(each), us.v((radialSpinRatio(p.I * k, p.a, p.l, 2 * each + wire) * v.f0))];
        });
        const series = [{ name: 'nominal inertia', points: curve(1) }];
        if (v.eI > 0) series.push({ name: `inertia −${fmt(v.eI, { digits: 2 })} %`, dashed: true, color: 'var(--series-3)', points: curve(1 - v.eI / 100) }, { name: `inertia +${fmt(v.eI, { digits: 2 })} %`, dashed: true, color: 'var(--series-5)', points: curve(1 + v.eI / 100) });
        const markers = [{ x: um.v(mw), y: us.v(out.results.ffActual), label: check(v) ? 'your weights' : 'sized weights' }];
        if (check(v) && typeof out.results.mNeedEach === 'number') markers.push({ x: um.v(mn), y: us.v(out.target), label: 'hits the target' });
        return { x: { label: 'Each weight $m_w/2$', unit: um.label }, y: { label: 'Final spin $f_f$', unit: us.label }, xDomain: [0, um.v(top)], series,
          hlines: [{ y: us.v(out.target + v.tol), label: 'target ± tolerance', color: 'var(--danger)' }, { y: us.v(out.target - v.tol), color: 'var(--danger)' }], markers };
      },
    },
    {
      id: 'wire', title: 'Wire length trade-off: weights needed and peak pull', wide: true, explore: true, height: 420,
      info: { text: ['For other wire lengths (same drum, inertia and target): the weight each needs to hit the target, and the peak pull in each wire with that weight. The marker is your wire.', 'Longer wires need much lighter weights; the pull changes much less.'], doc: 'release' },
      build(v, out, { U }) {
        const um = U(MASS), uf = U(FORCE), ul = U(WIRE), p = out.p, rT = out.target / v.f0, A = [], B = [];
        for (let i = 0; i <= 60; i++) {
          const l = (v.l * (0.3 + (2.2 * i) / 60)) / 12, m = radialMass(p.I, p.a, l, rT), each = (m - (2 * p.mu * l) / 3) / 2;
          if (!(each > 0)) continue;
          A.push([ul.v(l * 12), um.v(each)]); B.push([ul.v(l * 12), uf.v(evaluate({ I: p.I, a: p.a, l, w0: p.w0, m }).T)]);
        }
        const mT = radialMass(p.I, p.a, p.l, rT), x0 = ul.v(v.l);
        return {
          x: { label: 'Wire length $l$', unit: ul.label }, xDomain: [A[0]?.[0] ?? 0, A.at(-1)?.[0] ?? 1], vlines: [{ x: x0, label: 'your wire', color: 'var(--text-3)' }],
          panels: [
            { y: { label: 'Each weight', unit: um.label }, color: 'var(--series-2)', includeZero: true, series: [{ name: 'weight for the target', points: A }] },
            { y: { label: 'Peak pull', unit: uf.label }, color: 'var(--series-5)', includeZero: true, series: [{ name: 'peak pull', dash: '7 4', points: B }],
              hlines: [{ y: uf.v(v.Tb), label: 'breaking strength', color: 'var(--danger)' }].filter((h) => h.y <= 3 * Math.max(...B.map((q) => q[1]), uf.v(evaluate({ I: p.I, a: p.a, l: p.l, w0: p.w0, m: mT }).T))) },
          ],
        };
      },
    },
  ],
  schematicTitle: 'The despin seen from the nose',
  schematicHint: 'End view, to scale, in a fixed (non-spinning) frame: the vehicle, the paths of both weights — unwinding (dashed), swinging out (solid) and flying away after release (dotted) — and the moment of release with the wires along the radius. The animation replays the despin slowed down, the wire getting thicker as it pulls harder. Drag the weight to change the wire length, or the top of the drum to change its radius',
  schematic(ctx, v, out) {
    const W = 800, H = 500, cx = 290, cy = 220, p = out.p, o = out.o, smp = o.sim.samples;
    const fr = ctx.frame({ width: W, height: H, label: 'Yo-yo despin seen from the nose: vehicle, paths of the weights and release' });
    const g = fr.layer('main'); g.replaceChildren();
    const R = p.a + p.l, k = 175 / R, raTrue = p.a * k, ra = Math.max(12, raTrue), lpx = R * k - ra, phiE = p.l / p.a;
    const thRel = smp.at(-1).th, al = -thRel;                     // attachment angle chosen so release happens on the horizontal
    const col = { safe: 'var(--ok)', marginal: 'var(--warn)', unsafe: 'var(--danger)' };
    const wireCol = col[out.wireLv], spinCol = col[out.spinLv];
    // body-frame position of weight 1 (attachment at angle al): phase 1 on the involute, phase 2 swinging about A
    const bodyPos = (q) => {
      if (q.phase === 1) {
        const ps = al - (phiE - q.phi), u = ra * q.phi * (lpx / (ra * phiE));   // free wire length, drawn to the drum scale
        return [ra * Math.cos(ps) + u * Math.sin(ps), ra * Math.sin(ps) - u * Math.cos(ps), ra * Math.cos(ps), ra * Math.sin(ps)];
      }
      const A = [ra * Math.cos(al), ra * Math.sin(al)];
      return [A[0] + lpx * Math.cos(al + q.psi), A[1] + lpx * Math.sin(al + q.psi), A[0], A[1]];
    };
    // inertial (fixed) frame: rotate by the body angle; weight 2 is opposite
    const world = (q, sgn = 1) => {
      const [x, y, tx, ty] = bodyPos(q), c = Math.cos(q.th), sn = Math.sin(q.th);
      return [cx + sgn * (x * c - y * sn), cy - sgn * (x * sn + y * c), cx + sgn * (tx * c - ty * sn), cy - sgn * (tx * sn + ty * c)];
    };
    // flight after release: straight on at the release speed (ft/s → px)
    const rb = Math.max(3, Math.min(10, 2.5 + 1.6 * Math.cbrt((o.mWeights / 2) * 14593.9)));   // weight marker grows with its mass (cube root), not to scale
    const tPost = Math.min(0.4 * o.tRelease, (0.45 * R) / Math.max(o.releaseSpeed, 1e-9)), uPx = o.releaseSpeed * k;
    const post = (t, sgn) => [cx + sgn * R * k, cy - sgn * uPx * t];
    // release circle and dimension
    g.append(s('circle', { cx, cy, r: R * k, fill: 'none', class: 'sc-thin', 'stroke-dasharray': '2 4', opacity: 0.6, 'data-field': 'l a' }));
    // paths of both weights
    for (const sgn of [1, -1]) {
      const p1 = smp.filter((q) => q.phase === 1).map((q) => world(q, sgn).slice(0, 2)), p2 = smp.filter((q) => q.phase === 2).map((q) => world(q, sgn).slice(0, 2));
      g.append(s('path', { d: path(p1), class: 'sc-thin', fill: 'none', 'stroke-dasharray': '4 3', 'data-field': 'l' }));
      g.append(s('path', { d: path([p1.at(-1), ...p2]), fill: 'none', stroke: 'var(--red)', 'stroke-width': 1.6, 'data-field': 'l' }));
      g.append(s('path', { d: path([post(0, sgn), post(tPost, sgn)]), class: 'sc-thin', fill: 'none', 'stroke-dasharray': '1.5 3', 'marker-end': fr.arrow() }));
      // the moment of release: wire along the radius, coloured by the wire verdict
      g.append(s('line', { x1: cx + sgn * ra, y1: cy, x2: cx + sgn * R * k, y2: cy, stroke: wireCol, 'stroke-width': 2, opacity: 0.55, 'data-field': 'l Tb' }));
      g.append(s('circle', { cx: cx + sgn * R * k, cy, r: rb, fill: 'none', stroke: 'var(--text-2)', 'stroke-dasharray': '2 2' }));
    }
    // vehicle (drum) with a spin mark, rotating in the animation
    const body = s('g', { transform: `rotate(${(-thRel * 180) / Math.PI} ${cx} ${cy})` });
    body.append(s('circle', { cx, cy, r: ra, class: 'sc-body', 'data-field': 'a' }));
    body.append(s('line', { x1: cx, y1: cy, x2: cx + ra * Math.cos(al + 0.6), y2: cy - ra * Math.sin(al + 0.6), stroke: 'var(--text-2)', 'stroke-width': 1.5 }));
    for (const sgn of [1, -1]) body.append(s('circle', { cx: cx + sgn * ra * Math.cos(al), cy: cy - sgn * ra * Math.sin(al), r: 2.2, fill: 'var(--text)' }));
    g.append(body);
    // animation: time-scaled replay (≤ 0.5 rev/s on screen), the wire thickening with its pull
    const slow = Math.max(1, Math.ceil(v.f0 / 0.4)), N = 90, tEnd = o.tRelease + tPost, hold = 0.8;
    const dur = tEnd * slow + hold, frames = Array.from({ length: N + 1 }, (_, i) => (tEnd * i) / N);
    const at = (t) => { let j = smp.findIndex((q) => q.t >= t); if (j < 0) j = smp.length - 1; return smp[j]; };
    const kt = [...frames.map((t) => (t * slow) / dur), 1].map((x) => x.toFixed(5)).join(';');
    const motion = typeof window === 'undefined' || !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (motion) {
      const thAt = (t) => (t <= o.tRelease ? at(t).th : thRel + o.wSim * (t - o.tRelease));
      const vals = (f) => [...frames.map(f), f(tEnd)].join(';');
      body.append(s('animateTransform', { attributeName: 'transform', type: 'rotate', dur: `${dur}s`, repeatCount: 'indefinite', keyTimes: kt, values: vals((t) => `${(-thAt(t) * 180) / Math.PI} ${cx} ${cy}`) }));
      for (const sgn of [1, -1]) {
        const pos = (t) => (t <= o.tRelease ? world(at(t), sgn) : [...post(t - o.tRelease, sgn), NaN, NaN]);
        const wire = s('path', { d: `M${cx},${cy}`, stroke: wireCol, fill: 'none', 'stroke-linecap': 'round' });
        wire.append(s('animate', { attributeName: 'd', dur: `${dur}s`, repeatCount: 'indefinite', keyTimes: kt,
          values: vals((t) => { const q = pos(t); return t <= o.tRelease ? `M${q[2].toFixed(1)},${q[3].toFixed(1)}L${q[0].toFixed(1)},${q[1].toFixed(1)}` : `M${q[0].toFixed(1)},${q[1].toFixed(1)}L${q[0].toFixed(1)},${q[1].toFixed(1)}`; }) }));
        wire.append(s('animate', { attributeName: 'stroke-width', dur: `${dur}s`, repeatCount: 'indefinite', keyTimes: kt, values: vals((t) => (t <= o.tRelease ? (1 + (4 * at(t).T) / out.Tmax).toFixed(2) : 0)) }));
        const ball = s('circle', { cx: cx + sgn * R * k, cy, r: rb, 'data-field': 'mwEach ff', class: 'sc-body-2' });
        for (const [attr, j] of [['cx', 0], ['cy', 1]]) ball.append(s('animate', { attributeName: attr, dur: `${dur}s`, repeatCount: 'indefinite', keyTimes: kt, values: vals((t) => pos(t)[j].toFixed(1)) }));
        g.append(wire, ball);
      }
    } else for (const sgn of [1, -1]) g.append(s('circle', { cx: cx + sgn * R * k, cy, r: rb, class: 'sc-body-2' }));
    // dimensions and labels (outside the paths)
    const ul = ctx.U(WIRE), ud = ctx.U(DRUM), us = ctx.U(SPIN), uf = ctx.U(FORCE), um = ctx.U(MASS);
    // chained dimensions below the circle: a and l on one baseline, R under them
    const yb = cy + R * k + 22;
    for (const xx of [cx, cx + ra, cx + R * k]) g.append(s('line', { x1: xx, x2: xx, y1: yb - 6, y2: yb + 28, class: 'sc-thin', opacity: 0.5 }));
    g.append(dim(fr, cx, yb, cx + ra, yb, `a=${fmt(ud.v(v.a), { digits: 3 })}\\,${ud.plain}${ra > raTrue + 0.5 ? ' (drum enlarged)' : ''}`, { field: 'a', labelPos: 'before' }));
    g.append(dim(fr, cx + ra, yb, cx + R * k, yb, `l=${fmt(ul.v(v.l), { digits: 3 })}\\,${ul.plain}\\ (${fmt(out.results.wraps, { digits: 2 })}\\ wraps)`, { field: 'l' }));
    g.append(dim(fr, cx, yb + 24, cx + R * k, yb + 24, `R=a+l=${fmt(ul.v((p.a + p.l) * 12), { digits: 3 })}\\,${ul.plain}`, { field: 'l a' }));
    g.append(text(cx + R * k + 12, cy + 4, 'release', { size: 10.5, cls: 'sc-dim-text' }));
    g.append(text(cx + R * k + 12, cy - 24, `u = ${fmt(ctx.U({ dim: 'speed', internal: 'fts' }).v(o.releaseSpeed), { digits: 3 })} ${ctx.U({ dim: 'speed', internal: 'fts' }).plain}`, { size: 10.5, cls: 'sc-dim-text' }));
    // right column: the numbers the drawing is about
    const x2 = 610;
    g.append(text(x2, 40, `spin ${fmt(us.v(v.f0), { digits: 3 })} → ${fmt(us.v(out.results.ffActual), { digits: 3 })} ${us.plain}`, { size: 12, field: 'f0 ff' }));
    g.append(s('rect', { x: x2 - 10, y: 30, width: 4, height: 12, fill: spinCol }));
    g.append(text(x2, 58, `target ${fmt(us.v(out.target), { digits: 3 })} ± ${fmt(us.v(v.tol), { digits: 2 })}`, { size: 10.5, cls: 'sc-dim-text', field: 'ff tol' }));
    g.append(text(x2, 84, `weights ${fmt(um.v(o.mWeights / 2), { digits: 3 })} ${um.plain} each`, { size: 12, field: check(v) ? 'mwEach' : 'ff' }));
    g.append(text(x2, 110, `peak pull ${fmt(uf.v(out.Tmax), { digits: 3 })} ${uf.plain}`, { size: 12, field: 'Tb' }));
    g.append(s('rect', { x: x2 - 10, y: 100, width: 4, height: 12, fill: wireCol }));
    g.append(text(x2, 128, `breaks at ${fmt(uf.v(v.Tb), { digits: 3 })} (${fmt(out.results.nWire, { digits: 2 })}×)`, { size: 10.5, cls: 'sc-dim-text', field: 'Tb SF' }));
    g.append(text(x2, 154, `despin ${fmt(o.tRelease, { digits: 3 })} s`, { size: 12 }));
    // spin arrow (counter-clockwise seen from the nose)
    const ar = ra + 16;
    g.append(s('path', { d: `M${cx + ar * Math.cos(2.4)},${cy - ar * Math.sin(2.4)} A${ar},${ar} 0 0 0 ${cx + ar * Math.cos(1.4)},${cy - ar * Math.sin(1.4)}`, fill: 'none', class: 'sc-accent', 'marker-end': fr.arrow('acc') }));
    g.append(text(16, H - 46, `To scale${ra > raTrue + 0.5 ? ' except the drum (enlarged)' : ''}, seen from the nose in a fixed frame; weight markers sized by mass.`, { size: 10, cls: 'sc-dim-text' }));
    g.append(text(16, H - 30, 'Dashed: unwinding · red: swing-out · dotted: after release.', { size: 10, cls: 'sc-dim-text' }));
    g.append(text(16, H - 14, motion ? `Animation shown ${slow}× slower; the wire thickens as it pulls harder.` : 'Animation off (reduced motion).', { size: 10, cls: 'sc-dim-text' }));
    // handles: the released weight (wire length) and the top of the drum (drum radius)
    ctx.handle('wire', cx + R * k, cy, { field: 'l', title: 'Drag left or right to change the wire length',
      onDrag: (px) => ctx.setValue('l', Math.max(1, Math.min(2000, v.l * Math.max(0.2, (px - cx - ra) / lpx))), { round: 0.5 }),
      onKey: (dx) => ctx.setValue('l', Math.max(1, Math.min(2000, v.l * (1 + 0.05 * dx)))) });
    ctx.handle('drum', cx, cy - ra, { field: 'a', title: 'Drag up or down to change the drum radius',
      onDrag: (px, py) => ctx.setValue('a', Math.max(0.1, Math.min(100, v.a * Math.max(0.3, (cy - py) / ra))), { round: 0.05 }),
      onKey: (dx, dy) => ctx.setValue('a', Math.max(0.1, Math.min(100, v.a * (1 + 0.05 * dy)))) });
  },
  symbols: {
    I: 'roll moment of inertia of the vehicle (slug·ft² or kg·m²)', '\\omega_0': 'initial spin rate (rad/s)', '\\omega_f': 'final spin rate (rad/s)', r: 'spin ratio, final over initial (no unit)', a: 'drum radius (in or mm)', l: 'wire length, each (in or mm)', R: 'release radius a + l (ft or m)',
    m: 'total despin mass: weights plus a third of the wires (slug or kg)', m_w: 'mass of both weights (slug or kg)', '\\mu': 'wire mass per unit length (lb/in or g/m)', c: 'yo-yo parameter (no unit)', '\\varphi': 'unwound angle of the wire (rad)', '\\lambda': 'wire length for complete despin (ft or m)',
    D: 'momentum loss factor $I(1-r)$', 'D^\\prime': 'energy loss factor $I(1-r^2)$', A_0: 'quadratic coefficient', A_1: 'quadratic coefficient', A_2: 'quadratic coefficient',
    u: 'weight speed at release (ft/s or m/s)', '\\dot\\beta': 'turning rate of the wire at release (rad/s)', 'T_{1,max}': 'peak pull in each wire while unwinding (lbf or N)', 'T_{2,max}': 'pull in each wire at release (lbf or N)', f_0: 'initial spin rate (rpm)', f_f: 'final spin rate (rpm)',
    '\\epsilon_I': 'uncertainty of the roll inertia (%)', '\\epsilon_f': 'uncertainty of the initial spin (%)', 'I^\\prime': 'roll inertia at the end of its uncertainty', T_b: 'breaking strength of one wire with its fittings (lbf or N)', 'T_{max}': 'peak pull in each wire (lbf or N)', n: 'safety factor achieved (no unit)', 'n_{req}': 'safety factor you ask for (no unit)',
    '\\Delta f_f': 'final spin tolerance (rpm)', 'f_{target}': 'target final spin (rpm)', 'T_{b,req}': 'breaking strength needed (lbf or N)', 'm_{w,req}': 'mass of both weights for the target (slug or kg)', 'm(r)': 'total despin mass for spin ratio r', 'T_1': 'pull in each wire while unwinding (lbf or N)', 'T_2': 'pull in each wire during swing-out (lbf or N)',
    'm_F': 'despin mass from the closed form (slug or kg)', 't_r': 'time from letting go to release (s)', 't_{swing}': 'time of the swing-out (s)', '\\varphi_{end}': 'unwound angle at full unwinding (rad)', 'n_{wraps}': 'number of wraps on the drum', 'm_{wires}': 'mass of both wires (slug or kg)',
  },
  report(v, out, R) {
    const o = out.o, n = R.n, Ms = MASS, F = FORCE;
    const I = R.v(v.I, INERTIA), a = R.v(v.a, DRUM), Rr = R.v(v.a + v.l, WIRE);
    const mass = check(v)
      ? [{ label: 'Total despin mass from your weights', lhs: 'm', eq: 'm_w+\\frac{2\\mu l}{3}', res: R.Q(o.m, Ms) },
        { label: 'Spin ratio from momentum and energy at radial release', lhs: '(D+ma^2)^2', eq: 'mR^2(D^\\prime+ma^2)', res: `r=${n(o.r)},\\ R=a+l=${Rr}` }]
      : [{ label: 'Spin ratio', lhs: 'r', eq: '\\frac{\\omega_f}{\\omega_0}', sub: `\\frac{${R.v(out.target, SPIN)}}{${R.v(v.f0, SPIN)}}`, res: n(o.r) },
        { label: 'Momentum and energy at radial release', lhs: '(D+ma^2)^2', eq: 'mR^2(D^\\prime+ma^2)', res: `D=I(1-r),\\ D^\\prime=I(1-r^2),\\ R=a+l=${Rr}` },
        { label: 'Total despin mass (positive root)', lhs: 'm', eq: '\\frac{-A_1-\\sqrt{A_1^2-4A_2A_0}}{2A_2},\\quad A_2=a^2(a^2-R^2),\\ A_1=2Da^2-R^2D^\\prime,\\ A_0=D^2', res: R.Q(o.m, Ms) },
        { label: 'Despin weights (each)', lhs: '\\frac{m_w}{2}', eq: '\\frac12\\left(m-\\frac{2\\mu l}{3}\\right)', res: R.Q(o.mWeights / 2, Ms) }];
    return [{
      title: 'Theory',
      text: 'Two weights of total mass $m$ on wires of length $l$ wrapped on a drum of radius $a$ are released from a vehicle spinning at $\\omega_0$. While a wire unwinds, conservation of angular momentum and energy give $\\varphi=\\omega_0t$ and $\\omega=\\omega_0(c-\\varphi^2)/(c+\\varphi^2)$ with $c=1+I/(ma^2)$. Fully unwound, each wire swings about its attachment until it lies along the radius, where the weights are released at radius $R=a+l$, moving tangentially. Equating angular momentum and energy before and at release links the despin mass and the spin ratio $r=\\omega_f/\\omega_0$ (Fedor, NASA TN D-1676, Eqs. 18–20 without the spring).',
      steps: [
        ...mass,
        { label: 'Yo-yo parameter', lhs: 'c', eq: '1+\\frac{I}{ma^2}', sub: `1+\\frac{${I}}{${R.v(o.m, Ms)}\\times(${a})^2}`, res: n(o.c) },
        { label: 'Peak tension while unwinding (at $\\varphi^2=c/3$, or at full unwinding if the wire is shorter)', lhs: 'T_{1,max}', eq: '\\frac{m}{2}a\\omega_0^2\\frac{4c\\varphi(c-1)}{(c+\\varphi^2)^2}', res: R.Q(o.T1, F) },
        { label: 'Weight speed at release', lhs: 'u', eq: '\\frac{(I+ma^2)\\omega_0-I\\omega_f}{mR}', res: R.Q(o.releaseSpeed, { dim: 'speed', internal: 'fts' }) },
        { label: 'Wire turning rate and tension at release', lhs: '\\dot\\beta', eq: '\\frac{u-a\\omega_f}{l}', res: `${n(o.wireRate)}\\ \\mathrm{rad\\,s^{-1}}` },
        { lhs: 'T_{2,max}', eq: '\\frac{m}{2}\\left(a\\omega_f^2+l\\dot\\beta^2\\right)', res: R.Q(o.T2release, F) },
        { label: 'Highest pull over the inertia and spin uncertainty, and the safety factor', lhs: 'n', eq: '\\frac{T_b}{T_{max}}', sub: `\\frac{${R.v(v.Tb, F)}}{${R.v(out.Tmax, F)}}`, res: n(out.results.nWire) },
        { label: 'Duration', lhs: 't_r', eq: '\\frac{l}{a\\,\\omega_0}+t_{swing}', res: `${n(o.tRelease)}\\ \\mathrm{s}` },
      ],
    }];
  },
  references: [],
  externalRefs: [
    { title: 'Analytical Theory of the Stretch Yo-Yo for De-Spin of Satellites (NASA TN D-1676) — release momentum, energy and wire force, Eqs. 17–20; rigid limit; one-third wire mass rule', authors: 'J. V. Fedor', venue: 'NASA Goddard, 1963', url: 'https://ntrs.nasa.gov/citations/19630004528' },
    { title: 'Yo-Yo Despin Mechanisms (Second Aerospace Mechanisms Symposium) — flown single-stage design and its tolerance', authors: 'K. S. Bush', venue: 'NASA Langley, 1967', url: 'https://ntrs.nasa.gov/citations/19680018324' },
    { title: 'Theory and Design Curves for a Yo-Yo De-Spin Mechanism for Satellites (NASA TN D-708) — cited through Fedor (1963) and the worksheet; not read directly', authors: 'J. V. Fedor', venue: 'NASA, 1961', url: null },
    { title: 'Yo-yo despin worksheet (YO-YO DSP)', authors: 'C. P. Hoult', venue: 'Rocket Science and Technology', url: 'http://www.rsandt.com/media/YO-YO%20DSP.xls' },
  ],
  examples: [
    { name: 'Worksheet: 450 → 100 rpm', values: { mode: 'size', I: 2.5, eI: 2, f0: 7.5, ef: 2, ff: 1.66667, tol: 0.1, a: 15, l: 206, mu: 0.0002083, Tb: 400, SF: 2 } },
    { name: 'Flown payload (Bush): 270 rpm → 0', values: { mode: 'check', I: 3.83, eI: 3, f0: 4.5, ef: 10, ff: 0, tol: 0.1, a: 10, l: 188.5, mu: 0.000625, mwEach: 0.0057558, Tb: 400, SF: 2 } },
    { name: 'Small payload, inertia estimated', values: { mode: 'size', I: 0.15, eI: 15, f0: 4, ef: 5, ff: 0, tol: 0.05, a: 3, l: 40, mu: 0.0001, Tb: 100, SF: 2 } },
  ],
};
