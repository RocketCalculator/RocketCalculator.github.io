// Propellant Sloshing — UI definition.
import { slosh, mode, fillDepth, depthFor, radiusFor, LAMBDA, besselJ1 } from '../calc/slosh.js';
import { s, fmt, reducedMotion } from '../util.js';
import { dim, path, text } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const ACC = { dim: 'accel', internal: 'fts2' };
const LEN = { dim: 'length', internal: 'ft' };
const MASS = { dim: 'mass', internal: 'slug' };
const DENS = { dim: 'density', internal: 'slugft3', units: { si: 'kgm3', us: 'lbft3' } };
const HZ = { dim: 'frequency', internal: 'hz' };
const NONE = { dim: 'none' };
const G0 = 32.174;
// verdict bands (D-propellant-slosh): separation S = max(f1/fp, fp/f1) of the first slosh frequency from the rocket's
// pitch frequency. SAFE S ≥ r (the user's separation); MARGINAL 1.25 ≤ S < r; UNSAFE S < 1.25. Not a published limit.
const NEAR = 1.25;
const ST = { safe: 'ok', marginal: 'warn', unsafe: 'err' };
const COL = { safe: 'var(--ok)', marginal: 'var(--warn)', unsafe: 'var(--danger)' };

const Q = (x, spec, digits = 3) => `${fmt(toDisplay(x, spec), { digits })} ${unitLabel(displayUnit(spec))}`;
const Hz = (x) => `${fmt(x, { digits: 3 })} Hz`;
const gs = (a) => `${fmt(a / G0, { digits: 3 })} g`;
const sepOf = (f1, fp) => (f1 >= fp ? f1 / fp : fp / f1);
/** First-mode frequency at depth h, other inputs as entered. */
const f1At = (v, h) => mode(1, { a: v.a, R: v.D / 2, h, M: 1 }).f;

export default {
  slug: 'propellant-slosh',
  topic: 'propellant-sloshing',
  title: 'Propellant Sloshing',
  subtitle: 'The <b>sloshing frequencies</b> of liquid propellant in a round tank under thrust, the <b>equivalent pendulum</b> (length, hinge and mass) for a dynamics model, and whether the first slosh frequency stays clear of the rocket’s pitch frequency.',
  verdict: true,
  intro: {
    what: 'Gives the first three sloshing frequencies of the liquid in an upright round tank, how much of the liquid takes part in each, and the pendulum that sloshes the same way — at the propellant level you choose and over the whole drain.',
    why: 'Sloshing liquid pushes the tank sideways at its own frequency. If that frequency sits near the rocket’s pitch (weathercock) frequency or the autopilot’s, the two can feed each other and grow.',
    when: 'Sizing tanks, choosing an autopilot bandwidth, or building a dynamics model of a liquid-propellant rocket or hybrid oxidiser tank.',
  },
  info: {
    text: [
      'Under thrust the liquid feels a “gravity” of strength $a=(T-D)/m$ pointing to the tank bottom. Its free surface can rock like water in a cup; each way of rocking (mode) has its own frequency.',
      'The frequencies follow from the tank radius, the liquid depth and $a$ (Hoult, eq. 5-35). Each mode acts like a pendulum carrying part of the liquid; the rest moves with the tank.',
      'As the tank drains the frequencies fall towards zero, so check the moments that matter: lift-off, maximum dynamic pressure, burnout.',
    ],
    tex: '\\omega_n^2=\\frac{a}{R}\\,\\lambda_n\\tanh\\frac{\\lambda_nh}{R},\\qquad h=\\frac{M}{\\rho\\pi R^2}',
    steps: [
      'Enter the tank’s inside diameter and length and the propellant’s density.',
      'Enter the propellant left in the tank and the thrust acceleration at the moment you check.',
      'Enter the rocket’s pitch frequency (or fill it from the Pitch-Yaw Wave Number) and the separation you want.',
      'Read the verdict and its fixes; the drawing shows the rocking surface, the equivalent pendulum and the liquid levels at which the slosh rings with the pitch.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'tank', title: 'Tank and propellant',
      fields: [
        { id: 'D', label: 'Tank inside diameter', sym: 'D', ...LEN, default: 0.5, min: 0, minExclusive: true, max: 50, slider: { min: 0.1, max: 10, step: 0.005 },
          info: { text: ['The inside diameter of the round tank, wall to wall.', 'Measure the bore, or take the outside diameter minus twice the wall. Drag the bottom-right corner of the tank in the drawing to change it.', 'A narrower tank sloshes faster: in a deep fill the frequency grows as $1/\\sqrt D$, so halving the diameter raises it by 41 %.'],
            tex: 'R=\\frac D2', range: 'Student liquid rockets and hybrid oxidiser tanks 75–200 mm (3–8 in); sounding-rocket stages 0.3–1 m; launch-vehicle stages 1.5–4 m.', doc: 'modes' } },
        { id: 'Lt', label: 'Tank inside length (straight part)', sym: 'L_t', ...LEN, default: 3, min: 0, minExclusive: true, max: 300, slider: { min: 0.2, max: 40, step: 0.05 },
          info: { text: ['How tall the straight, round part of the tank is inside.', 'Measure between the end caps; domed ends are not modelled, so use the straight length (the drawing shows flat ends).', 'It sets how much propellant fits and the depth range of the drain plot; it does not change the frequencies at a given depth. Drag the top of the tank to change it.'],
            range: 'Usually 3–10 tank diameters.', doc: 'modes' } },
        { id: 'rho', label: 'Propellant density', sym: '\\rho', ...DENS, default: 1.5309, min: 0, minExclusive: true, max: 5, slider: { min: 0.1, max: 3, step: 0.0005 },
          info: { text: ['The mass of one litre (or cubic foot) of the liquid.', 'Look it up for your propellant at its tank temperature; liquefied gases such as nitrous oxide change a lot with temperature.', 'It converts the propellant mass into a liquid depth: a lighter liquid of the same mass stands deeper. The frequencies do not depend on density otherwise.'],
            range: 'Ethanol 789, kerosene/RP-1 ≈ 810, water 1000, liquid oxygen 1141 kg/m³ (49, 51, 62, 71 lb/ft³); nitrous oxide ≈ 750–1000 kg/m³ at 0–30 °C.', doc: 'modes' } },
        { id: 'M', label: 'Propellant in the tank now', sym: 'M', ...MASS, default: 0.45, min: 0, minExclusive: true, max: 1e5, slider: { min: 0.002, max: 60, step: 0.001 },
          info: { text: ['The liquid left in this tank at the moment you check.', 'The loaded mass minus what has flowed out by then (mass flow × time). Drag the liquid surface in the drawing to change it.', 'Less liquid means a shallower pool and slower sloshing: below a depth of about one radius the frequencies drop quickly, and a larger share of the liquid sloshes.'],
            tex: 'h=\\frac{M}{\\rho\\pi R^2}', range: 'Check full (lift-off), half (around maximum dynamic pressure) and nearly empty (burnout).', doc: 'modes' } },
      ],
    },
    {
      id: 'flight', title: 'Flight condition',
      fields: [
        { id: 'a', label: 'Thrust acceleration (T − D)/m', sym: 'a', ...ACC, default: 160.87, min: 0, minExclusive: true, max: 3217, slider: { min: 3.2, max: 644, step: 0.1 },
          info: { text: ['How hard the thrust (minus drag) pushes the rocket forward, per unit mass: it presses the liquid to the tank bottom like gravity.', 'Thrust minus drag divided by the rocket’s mass at the moment you check; the Trajectory Simulation gives it. 1 g = 9.81 m/s² (32.2 ft/s²).', 'Every slosh frequency grows as $\\sqrt a$: four times the acceleration doubles them.'],
            tex: 'a=\\frac{T-D}{m}', range: 'Student liquid rockets 2–8 g; sounding rockets 5–15 g; launch-vehicle stages 1–5 g.', doc: 'overview' } },
      ],
    },
    {
      id: 'rocket', title: 'Rocket pitch motion',
      fields: [
        { id: 'fp', label: 'Rocket pitch frequency', sym: 'f_p', ...HZ, default: 3, min: 0.01, max: 200, slider: { min: 0.1, max: 20, step: 0.05 },
          info: { text: ['How many times per second the rocket wobbles nose-up and nose-down about its centre of gravity (weathercock motion), or the bandwidth of its autopilot.', 'The Pitch-Yaw Wave Number calculator gives it from the speed, the stability and the pitch inertia (“Fill from the Pitch-Yaw Wave Number”). It rises with speed, so use the value at the moment you check.', 'The verdict wants the first slosh frequency well above or well below it.'],
            range: 'High-power rockets 1–10 Hz near burnout; controlled vehicles: the control bandwidth, 0.5–5 Hz.', doc: 'verdict' } },
      ],
    },
    {
      id: 'limits', title: 'Your limits',
      fields: [
        { id: 'sep', label: 'Separation you want', sym: 'r', ...NONE, default: 2, min: 1.3, max: 10, slider: { min: 1.3, max: 5, step: 0.05 },
          info: { text: ['How many times higher (or lower) than the pitch frequency the first slosh frequency must be for SAFE.', 'Your choice, not a published limit: more separation leaves room for errors in the pitch frequency and the acceleration.', 'Within 1.25 times either way the verdict is UNSAFE; between that and your separation, MARGINAL.'],
            tex: 'f_1\\ge r\\,f_p\\ \\text{or}\\ f_1\\le f_p/r', range: '2–3 is a sensible start. Not a published limit.', doc: 'verdict' } },
      ],
    },
  ],
  actions: [{
    label: 'Fill from the Pitch-Yaw Wave Number', group: 'rocket', title: 'Run the Pitch-Yaw Wave Number calculator with its saved inputs and take its pitch natural frequency',
    async run() {
      const def = (await import('./pitch-yaw-wavenumber.js')).default;
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem('rc-calc-pitch-yaw-wavenumber')); } catch { /* none */ }
      const v = {}; for (const g of def.groups) for (const f of g.fields) v[f.id] = structuredClone(f.default);
      Object.assign(v, saved || {});
      const fp = def.compute(v).results.f;
      if (!(fp > 0)) return { values: {}, message: 'The Pitch-Yaw Wave Number gives no pitch frequency for its inputs' };
      return { values: { fp }, message: `${saved ? 'From your Pitch-Yaw Wave Number' : 'From the Pitch-Yaw Wave Number defaults (open it to enter your rocket)'}: pitch frequency ${Hz(fp)}` };
    },
  }],
  results: [
    { id: 'f1', label: 'First (fundamental) slosh frequency', sym: 'f_1', ...HZ, key: true, digits: 4, status: (x, out) => ST[out.level],
      note: (x, out) => `${fmt(out.o.modes[0].w, { digits: 4 })} rad/s · one rock every ${fmt(out.o.modes[0].period, { digits: 3 })} s`,
      info: { text: ['How many times per second the liquid surface rocks in its main way: up on one side, down on the other, like tea in a jolted cup.', 'From the tank radius, the liquid depth and the thrust acceleration; the 1.841 is the first Bessel root, the number that fits the wave to a round wall.', 'Deeper liquid, a narrower tank or more acceleration raise it.'],
        tex: 'f_1=\\frac{1}{2\\pi}\\sqrt{\\frac{a}{R}\\lambda_1\\tanh\\frac{\\lambda_1h}{R}}', doc: 'modes' } },
    { id: 'ratio', label: 'First slosh frequency ÷ pitch frequency', sym: 'f_1/f_p', ...NONE, key: true, digits: 3, status: (x, out) => ST[out.level],
      note: (x, out) => `want ≥ ${fmt(out.v.sep, { digits: 3 })} or ≤ ${fmt(1 / out.v.sep, { digits: 3 })}`,
      info: { text: ['How many times the first slosh frequency is above (more than 1) or below (less than 1) the rocket’s pitch frequency.', 'Near 1 the rocking liquid pushes the tank sideways in step with the pitch wobble, and each can feed the other.', 'Move it away from 1 with a narrower or wider tank; the drain plot shows how it changes as the tank empties.'], tex: '\\frac{f_1}{f_p}', doc: 'verdict' } },
    { id: 'h', label: 'Liquid depth', sym: 'h', ...LEN, digits: 4, note: (x, out) => `${fmt(out.fill, { digits: 3 })} % of the tank · h/R = ${fmt(out.o.hR, { digits: 3 })}`,
      info: { text: ['How deep the propellant stands in the tank (flat bottom).', 'The propellant mass divided by its density and the tank’s floor area.', 'Above about one radius the frequencies hardly change with depth; below it they fall quickly.'], tex: 'h=\\frac{M}{\\rho\\pi R^2}', doc: 'modes' } },
    { id: 'm1', label: 'First-mode slosh mass', sym: 'm_1', ...MASS, key: true, digits: 4, note: (x, out) => `${fmt(100 * out.o.modes[0].mFrac, { digits: 3 })} % of the liquid, ${Q(out.o.h, LEN)} deep (${fmt(out.fill, { digits: 3 })} % full)`,
      info: { text: ['The part of the liquid that swings in the first mode, as the bob of the equivalent pendulum; the rest moves with the tank.', 'Read from Hoult’s side-force formula (eq. 5-47): each mode adds a mass that answers at its own frequency.', 'A shallow pool sloshes almost entirely (84 % in the first mode); a deep one only a top layer.'],
        tex: 'm_n=M\\,\\frac{2\\tanh(\\lambda_nh/R)}{\\lambda_n(\\lambda_n^2-1)\\,h/R}', doc: 'model' } },
    { id: 'f2', label: 'Second mode', sym: 'f_2', ...HZ, digits: 4, note: (x, out) => `${fmt(out.o.modes[1].w, { digits: 4 })} rad/s`, info: { text: ['The next way of rocking, with a ring that stays still between centre and wall; it carries little liquid.'], tex: 'f_2=\\frac{1}{2\\pi}\\sqrt{\\frac{a}{R}\\lambda_2\\tanh\\frac{\\lambda_2h}{R}}', doc: 'modes' } },
    { id: 'f3', label: 'Third mode', sym: 'f_3', ...HZ, digits: 4, note: (x, out) => `${fmt(out.o.modes[2].w, { digits: 4 })} rad/s`, info: { text: ['The third way of rocking, with two still rings.'], tex: 'f_3=\\frac{1}{2\\pi}\\sqrt{\\frac{a}{R}\\lambda_3\\tanh\\frac{\\lambda_3h}{R}}', doc: 'modes' } },
    { id: 'w1', label: 'First-mode circular frequency', sym: '\\omega_1', dim: 'rate', internal: 'rads', digits: 4, info: { text: ['The first slosh frequency in radians per second, as dynamics models use it.'], tex: '\\omega_1=2\\pi f_1', doc: 'modes' } },
    { id: 'm1frac', label: 'First-mode slosh mass fraction', sym: 'm_1/M', dim: 'percent', internal: 'pct', digits: 4, info: { text: ['The share of the liquid that swings in the first mode.'], tex: '\\frac{m_1}{M}=\\frac{2\\tanh(\\lambda_1h/R)}{\\lambda_1(\\lambda_1^2-1)\\,h/R}', doc: 'model' } },
    { id: 'L1', label: 'Equivalent pendulum length, mode 1', sym: 'L_1', ...LEN, digits: 4,
      info: { text: ['The length of a pendulum that swings at the first slosh frequency in the thrust “gravity”.'], tex: 'L_1=\\frac{a}{\\omega_1^2}=\\frac{R}{\\lambda_1\\tanh(\\lambda_1h/R)}', doc: 'model' } },
    { id: 'hinge1', label: 'Pendulum hinge below the liquid surface (negative: above)', sym: 'e_1', ...LEN, digits: 4,
      info: { text: ['Where the first-mode pendulum hangs from, measured down from the still surface. In a shallow pool it lies far above the surface: a long pendulum.', 'From the moment and force formulas of the report (eqs. 5-49 and 5-47): the side force of the mode acts at this depth.'], tex: 'e_1=\\frac{R}{\\lambda_1}\\,\\frac{1-2\\,\\mathrm{sech}(\\lambda_1h/R)}{\\tanh(\\lambda_1h/R)}', doc: 'pendulum' } },
    { id: 'bob1', label: 'Slosh mass below the liquid surface', sym: 'e_1+L_1', ...LEN, digits: 4,
      info: { text: ['How far below the still surface the swinging mass of the first mode sits.'], tex: 'e_1+L_1=\\frac{2R}{\\lambda_1}\\tanh\\frac{\\lambda_1h}{2R}', doc: 'pendulum' } },
    { id: 'hCross', label: 'Depth at which f₁ equals the pitch frequency (— if never)', sym: 'h_\\times', ...LEN, digits: 4,
      info: { text: ['As the tank drains the slosh frequency falls; at this liquid depth it equals the pitch frequency you entered (at the same acceleration and pitch frequency).', '“—” when even a full, deep tank sloshes slower than the pitch frequency, or the depth is above the tank top.'], tex: 'h_\\times=\\frac{R}{\\lambda_1}\\,\\mathrm{artanh}\\frac{(2\\pi f_p)^2R}{a\\lambda_1}', doc: 'verdict' } },
    { id: 'fDeep', label: 'First frequency of a deep fill', sym: 'f_{1,\\infty}', ...HZ, digits: 4, info: { text: ['The highest first slosh frequency this tank can have at this acceleration, reached once the liquid is deeper than about one diameter.'], tex: 'f_{1,\\infty}=\\frac{1}{2\\pi}\\sqrt{\\frac{a\\lambda_1}{R}}', doc: 'modes' } },
    { id: 'Dfix', label: 'Tank diameter for your separation (same propellant)', sym: 'D_{req}', ...LEN, digits: 4,
      info: { text: ['The inside diameter that puts the first slosh frequency exactly at your separation from the pitch frequency, on the side it is now, with the same propellant mass.', 'Smaller when the slosh is faster than the pitch (raise it further), larger when it is slower.'], doc: 'verdict' } },
    { id: 'fpOk', label: 'Pitch frequency for your separation', sym: 'f_{p,req}', ...HZ, digits: 4, info: { text: ['The pitch frequency that gives your separation with this slosh: at most $f_1/r$ when the slosh is faster, at least $r f_1$ when slower.'], doc: 'verdict' } },
    { id: 'm2', label: 'Second-mode slosh mass', sym: 'm_2', ...MASS, digits: 4, info: { tex: 'm_2=M\\,\\frac{2\\tanh(\\lambda_2h/R)}{\\lambda_2(\\lambda_2^2-1)\\,h/R}', doc: 'model' } },
    { id: 'm3', label: 'Third-mode slosh mass', sym: 'm_3', ...MASS, digits: 4, info: { tex: 'm_3=M\\,\\frac{2\\tanh(\\lambda_3h/R)}{\\lambda_3(\\lambda_3^2-1)\\,h/R}', doc: 'model' } },
    { id: 'fixedFrac', label: 'Liquid moving with the tank (outside modes 1–3)', sym: 'm_0/M', dim: 'percent', internal: 'pct', digits: 4, info: { text: ['The share of the liquid that does not slosh in the first three modes and moves with the tank as a solid.'], tex: '\\frac{m_0}{M}=1-\\sum_{n=1}^{3}\\frac{m_n}{M}', doc: 'model' } },
  ],
  compute(v) {
    const R = v.D / 2, hWant = fillDepth(v.M, v.rho, R);
    const o = slosh({ a: v.a, R, M: v.M, rho: v.rho, hMax: v.Lt });
    const [m1, m2, m3] = o.modes, f1 = m1.f, fill = (100 * o.h) / v.Lt;
    const above = f1 >= v.fp, S = sepOf(f1, v.fp);
    const level = S >= v.sep ? 'safe' : S >= NEAR ? 'marginal' : 'unsafe';
    const hX = depthFor(v.fp, { a: v.a, R }), hCross = hX != null && hX <= v.Lt ? hX : null;
    // fixes, solved exactly: the tank diameter (bisection, same propellant), the pitch frequency and the acceleration
    const target = above ? v.sep * v.fp : v.fp / v.sep;
    const Dfix = 2 * radiusFor(target, { a: v.a, M: o.M, rho: v.rho });
    const hFix = fillDepth(o.M, v.rho, Dfix / 2), fpOk = above ? f1 / v.sep : v.sep * f1, aFix = v.a * (target / f1) ** 2;
    const fixes = [];
    if (level !== 'safe') {
      fixes.push(`${above ? 'Narrow' : 'Widen'} the tank to ${above ? 'at most' : 'at least'} <b>${Q(Dfix, LEN)}</b> (now ${Q(v.D, LEN)}; liquid ${Q(hFix, LEN)} deep${hFix > v.Lt ? ', lengthen the tank' : ''}), or`);
      fixes.push(`a pitch frequency ${above ? 'of at most' : 'of at least'} <b>${Hz(fpOk)}</b> (now ${Hz(v.fp)}), or`);
      fixes.push(`a thrust acceleration ${above ? 'of at least' : 'of at most'} <b>${gs(aFix)}</b> (now ${gs(v.a)}).`);
    }
    const verdict = {
      level,
      title: level === 'safe' ? 'The slosh frequency is well clear of the pitch frequency' : level === 'marginal' ? 'Clear of the pitch frequency, but with less separation than you want' : 'The liquid sloshes at nearly the pitch frequency',
      text: `First slosh frequency <b>${Hz(f1)}</b> is ${fmt(f1 / v.fp, { digits: 3 })} × the pitch frequency of ${Hz(v.fp)}; you want ${above ? '≥' : '≤'} ${Hz(target)}.`,
      fixes,
    };
    const warnings = [];
    if (level === 'unsafe') warnings.push({ level: 'err', text: `The first slosh frequency (${Hz(f1)}) is within 25 % of the pitch frequency (${Hz(v.fp)}): the rocking liquid can drive the pitch motion.`, fix: fixes[0].replace(/, or$/, '.') });
    if (hWant > v.Lt) warnings.push({ level: 'warn', text: `${Q(v.M, MASS)} of this propellant needs ${Q(hWant, LEN)} of depth, more than the ${Q(v.Lt, LEN)} tank holds: shown and computed full (${Q(o.M, MASS)}). A brim-full closed tank has no free surface and cannot slosh.`, fix: `Use at most ${Q(o.M, MASS)} of propellant, or a tank at least ${Q(hWant, LEN)} long.` });
    if (hCross != null && hCross < o.h && level !== 'unsafe') warnings.push({ level: 'info', text: `As the tank drains, the first slosh frequency falls to the pitch frequency when the liquid is ${Q(hCross, LEN)} deep (${fmt((100 * hCross) / v.Lt, { digits: 3 })} % full), at this acceleration and pitch frequency. Check that moment too.` });
    if (o.hR < 0.1) warnings.push({ level: 'info', text: 'A very shallow pool: the waves behave like shallow-water waves and depend on the tank-bottom shape, which the flat-bottom model ignores.' });
    const results = {
      f1, ratio: f1 / v.fp, h: o.h, m1: m1.m, f2: m2.f, f3: m3.f, w1: m1.w, m1frac: 100 * m1.mFrac, L1: m1.pendulum, hinge1: m1.hinge, bob1: m1.bob,
      hCross: hCross ?? '—', fDeep: mode(1, { a: v.a, R, h: 1e3 * R, M: 1 }).f, Dfix, fpOk, m2: m2.m, m3: m3.m, fixedFrac: 100 * o.fixedFrac,
    };
    // plots stop where nothing changes any more: about 2 diameters deep (tanh ≈ 1), or past your depth
    const hView = Math.min(v.Lt, Math.max(4 * R, 1.25 * o.h, 1.25 * (hCross ?? 0)));
    return { results, warnings, verdict, level, o, v, R, fill, above, target, hCross, Dfix, hView };
  },
  plots: [
    {
      id: 'drain', title: 'Slosh frequencies and slosh mass as the tank drains', wide: true, height: 520,
      info: { text: ['The first three slosh frequencies (top) and the share of the liquid in each mode (bottom) against the liquid depth, from empty (left) up to about two diameters (beyond that nothing changes) or the tank top, at your acceleration.', 'The red lines are the pitch frequency and your separation either side of it; the grey line is your depth now. Read the drain from right to left.', 'Look for where the solid $f_1$ curve crosses the red band: at that level the slosh rings with the pitch.'], doc: 'verdict' },
      build(v, out, { U }) {
        const ul = U(LEN), N = 160, R = out.R, hTop = out.hView, hs = Array.from({ length: N }, (_, i) => (hTop * (i + 1)) / N);
        const md = (n, h) => mode(n, { a: v.a, R, h, M: 1 });
        const dash = [null, '7 4', '2 3'];
        const fs = [1, 2, 3].map((n) => ({ name: `$f_${n}$`, dash: dash[n - 1], color: `var(--series-${n === 1 ? 1 : n === 2 ? 2 : 3})`, points: hs.map((h) => [ul.v(h), md(n, h).f]) }));
        const ms = [1, 2, 3].map((n) => ({ name: `$m_${n}/M$`, dash: dash[n - 1], color: `var(--series-${n === 1 ? 1 : n === 2 ? 2 : 3})`, points: hs.map((h) => [ul.v(h), 100 * md(n, h).mFrac]) }));
        const fixed = { name: 'moves with tank', dash: '9 3 2 3', color: 'var(--series-5)', points: hs.map((h) => [ul.v(h), 100 * (1 - [1, 2, 3].reduce((a, n) => a + md(n, h).mFrac, 0))]) };
        // frame the frequency axis on f1 and the red band; f2 and f3 run off the top when they are far above
        const top = 1.15 * Math.max(out.o.modes[0].f, md(1, hTop).f, v.sep * v.fp);
        const vlines = [{ x: ul.v(out.o.h), label: 'your depth', color: 'var(--text-3)' }];
        if (out.hCross != null) vlines.push({ x: ul.v(out.hCross), label: '$f_1=f_p$', color: 'var(--danger)', row: 1 });
        return {
          x: { label: 'Liquid depth $h$', unit: ul.label }, xDomain: [0, ul.v(out.hView)], vlines,
          panels: [
            { y: { label: 'Frequency', unit: 'Hz' }, yDomain: [0, top], series: fs,
              hlines: [{ y: v.fp, label: 'pitch frequency', color: 'var(--danger)' }, { y: v.sep * v.fp, label: 'your separation', color: 'var(--danger)' }, { y: v.fp / v.sep, color: 'var(--danger)' }] },
            { y: { label: 'Share', unit: '\\%' }, yDomain: [0, 100], series: [...ms, fixed] },
          ],
        };
      },
    },
    {
      id: 'diameter', title: 'First slosh frequency against tank diameter (same propellant)', wide: true,
      info: { text: ['The first slosh frequency if the same propellant sat in a narrower or wider tank, at your acceleration. A narrower tank makes the pool deeper and the slosh faster.', 'The red lines are the pitch frequency and your separation either side; the dot is your tank and the green dot the tank the fix asks for.', 'Look at how far you must move along the curve to leave the band.'], doc: 'verdict' },
      build(v, out, { U }) {
        const ul = U(LEN), lo = Math.min(v.D, out.Dfix) / 2.5, hi = Math.max(v.D, out.Dfix) * 2;
        const pts = Array.from({ length: 161 }, (_, i) => { const D = lo + ((hi - lo) * i) / 160; return [ul.v(D), mode(1, { a: v.a, R: D / 2, h: fillDepth(out.o.M, v.rho, D / 2), M: 1 }).f]; });
        const yTop = 1.2 * Math.max(v.sep * v.fp, out.results.f1, out.target);
        return {
          x: { label: 'Tank inside diameter $D$', unit: ul.label }, y: { label: 'First slosh frequency $f_1$', unit: 'Hz' }, xDomain: [ul.v(lo), ul.v(hi)], yDomain: [0, yTop],
          series: [{ name: '$f_1$', smooth: true, points: pts.map(([x, y]) => [x, Math.min(y, 2 * yTop)]) }],
          hlines: [{ y: v.fp, label: 'pitch frequency', color: 'var(--danger)' }, { y: v.sep * v.fp, label: 'your separation', color: 'var(--danger)' }, { y: v.fp / v.sep, color: 'var(--danger)' }],
          markers: [{ x: ul.v(v.D), y: out.results.f1, label: 'your tank', color: COL[out.level] }, ...(out.level !== 'safe' ? [{ x: ul.v(out.Dfix), y: out.target, label: 'fix', color: 'var(--ok)' }] : [])],
        };
      },
    },
    {
      id: 'accel', title: 'First slosh frequency over the drain at several accelerations', explore: true, wide: true,
      info: { text: ['The first slosh frequency against liquid depth for thrust accelerations from 1 g to 15 g (and yours, solid).', 'The red lines are the pitch frequency and your separation.', 'More acceleration lifts every curve by $\\sqrt a$; the depth at which a curve meets the red band is where the slosh rings with the pitch at that acceleration.'], doc: 'modes' },
      build(v, out, { U }) {
        const ul = U(LEN), R = out.R, hs = Array.from({ length: 120 }, (_, i) => (out.hView * (i + 1)) / 120);
        const gsList = [1, 3, 5, 10, 15], dash = ['2 3', '7 4', '9 3 2 3', '4 2', '1 2'];
        const series = [{ name: `yours, ${gs(v.a)}`, points: hs.map((h) => [ul.v(h), f1At(v, h)]) },
          ...gsList.map((g, i) => ({ name: `${g} g`, dash: dash[i], color: 'var(--text-3)', points: hs.map((h) => [ul.v(h), mode(1, { a: g * G0, R, h, M: 1 }).f]) }))];
        return {
          x: { label: 'Liquid depth $h$', unit: ul.label }, y: { label: 'First slosh frequency $f_1$', unit: 'Hz' }, xDomain: [0, ul.v(out.hView)], includeZero: true, series,
          hlines: [{ y: v.fp, label: 'pitch frequency', color: 'var(--danger)' }, { y: v.sep * v.fp, label: 'your separation', color: 'var(--danger)' }],
          vlines: [{ x: ul.v(out.o.h), label: 'your depth', color: 'var(--text-3)' }],
        };
      },
    },
  ],
  schematicTitle: 'Tank, rocking surface and equivalent pendulum',
  schematicHint: 'The tank to scale with the liquid rocking in its first mode and the pendulum that swings with it; red bands mark the liquid levels at which the slosh rings with the pitch. Drag the surface (propellant), the tank top (length) or the bottom corner (diameter)',
  schematic(ctx, v, out) {
    const W = 760, H = 400, o = out.o, m1 = o.modes[0], col = COL[out.level], R = out.R;
    const fr = ctx.frame({ width: W, height: H, label: 'Tank section with the first slosh mode and the equivalent pendulum' });
    const g = fr.layer('main'); g.replaceChildren();
    const L = (x) => Q(x, LEN);
    // tank to scale: left wall at x = 140, bottom at y = 335
    const k = Math.min(285 / v.Lt, 150 / v.D), w = R * k, cx = 140 + w, yb = 335, top = yb - v.Lt * k, ys = yb - o.h * k, Y = (h) => yb - h * k;
    // levels where the slosh is too close to the pitch frequency (red) or closer than wanted (pale), behind the liquid
    const band = (f0, f1, op, field) => {
      const ha = depthFor(f0, { a: v.a, R }), hb = Math.min(depthFor(f1, { a: v.a, R }) ?? v.Lt, v.Lt);
      if (ha == null || ha >= v.Lt) return;
      g.append(s('rect', { x: cx - w, width: 2 * w, y: Y(hb), height: Y(ha) - Y(hb), fill: 'var(--danger)', 'fill-opacity': op, 'data-field': field }));
    };
    band(v.fp / v.sep, v.sep * v.fp, 0.07, 'sep'); band(v.fp / NEAR, NEAR * v.fp, 0.14, 'fp');
    // liquid with its first-mode surface, η ∝ J1(λ1 r/R)/J1(λ1), amplitude exaggerated
    const amp = Math.max(2, Math.min(0.16 * w, Math.max(5, 0.3 * o.h * k), 0.6 * (ys - top))), j1e = besselJ1(LAMBDA[0]).J1;
    const surf = (sg, lam, x0, ww, y0, A, je) => Array.from({ length: 61 }, (_, i) => { const x = -1 + i / 30; return [x0 + x * ww, y0 - sg * A * (Math.sign(x) * besselJ1(lam * Math.abs(x)).J1) / je]; });
    const liquid = (sg) => `M${cx - w},${yb} ` + surf(sg, LAMBDA[0], cx, w, ys, amp, j1e).map((p) => `L${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ') + ` L${cx + w},${yb} Z`;
    const liq = s('path', { d: liquid(1), fill: 'var(--series-1)', 'fill-opacity': 0.16, stroke: 'var(--series-1)', 'stroke-width': 1.6, 'data-field': 'M rho' });
    const f1 = m1.f, anim = !reducedMotion() && f1 > 0, slow = f1 > 0.5 ? Math.ceil(f1 / 0.5) : 1, dur = `${slow / f1}s`;
    const spline = { keyTimes: '0;0.25;0.5;0.75;1', calcMode: 'spline', keySplines: '0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1' };
    if (anim) liq.append(s('animate', { attributeName: 'd', dur, repeatCount: 'indefinite', values: [liquid(1), liquid(0), liquid(-1), liquid(0), liquid(1)].join(';'), ...spline }));
    g.append(liq);
    g.append(s('rect', { x: cx - w, y: top, width: 2 * w, height: yb - top, class: 'sc-line', fill: 'none', 'stroke-width': 2.4, 'data-field': 'D Lt' }));
    // equivalent pendulum beside the tank, same vertical scale: hinge e1 below the still surface, bob L1 lower
    const px = cx + w + 46, yh = ys + m1.hinge * k, yBob = ys + m1.bob * k, yhDraw = Math.max(yh, 24), rBob = 3 + 9 * Math.sqrt(m1.mFrac);
    g.append(s('line', { x1: cx + w + 4, x2: px + 14, y1: ys, y2: ys, class: 'sc-thin', 'stroke-dasharray': '3 3' }));
    const pend = s('g', { 'data-field': 'M a' });
    pend.append(s('line', { x1: px, x2: px, y1: yhDraw, y2: yBob, stroke: col, 'stroke-width': 1.8 }));
    pend.append(s('circle', { cx: px, cy: yBob, r: rBob, fill: col, 'fill-opacity': 0.55, stroke: col, 'stroke-width': 1.5 }));
    // swing about the true hinge in step with the surface (the bob moves towards the side that rises)
    const deg = Math.min(12, Math.max(1.5, (100 * amp) / Math.max(20, yBob - yh))).toFixed(2), rot = (a) => `${a} ${px} ${yh}`;
    if (anim) pend.append(s('animateTransform', { attributeName: 'transform', type: 'rotate', dur, repeatCount: 'indefinite', values: [rot(-deg), rot(0), rot(deg), rot(0), rot(-deg)].join(';'), ...spline }));
    else pend.setAttribute('transform', `rotate(${rot(-deg)})`);
    g.append(pend);
    if (yh >= 24) g.append(s('path', { d: `M${px - 9},${yh} L${px + 9},${yh} M${px - 6},${yh} L${px},${yh + 5} L${px + 6},${yh}`, stroke: col, 'stroke-width': 2, fill: 'none', 'data-field': 'M a' }));
    else g.append(text(px, 16, '↑', { anchor: 'middle', size: 12 }));
    // pendulum labels to its right, kept apart
    const xl = px + 18, yHL = Math.max(28, Math.min(yh + 4, yb - 34)), yBL = Math.max(yHL + 30, Math.min(yBob + 4, yb + 4));
    g.append(text(xl, yHL, yh >= 24 ? `hinge, ${L(Math.abs(m1.hinge))} ${m1.hinge >= 0 ? 'below' : 'above'} surface` : `hinge ${L(-m1.hinge)} above surface`, { size: 10.5 }));
    g.append(text(xl, yBL - 7, `m_1 = ${Q(m1.m, MASS)} (${fmt(100 * m1.mFrac, { digits: 3 })} %)`, { size: 10.5 }));
    g.append(text(xl, yBL + 7, `L_1 = ${L(m1.pendulum)}`, { size: 10.5 }));
    // crossing level, labelled at the far left
    if (out.hCross != null) {
      const yc = Y(out.hCross);
      g.append(s('line', { x1: 14, x2: cx + w, y1: yc, y2: yc, stroke: 'var(--danger)', 'stroke-width': 1.4, 'stroke-dasharray': '6 3', 'data-field': 'fp' }));
      g.append(text(14, yc < 110 ? yc + 13 : yc - 4, 'f_1 = f_p', { size: 10.5, field: 'fp' }));
    }
    // dimensions: diameter under the tank; liquid depth and tank length on the left, labels along the lines
    g.append(dim(fr, cx - w, yb, cx + w, yb, `D = ${L(v.D)}`, { off: 16, field: 'D', textOff: 15 }));
    const vdim = (x, y0, y1, label, field) => {
      g.append(dim(fr, x + 0.001, y0, x, y1, null, { field }));
      const t = text(x - 5, Math.min((y0 + y1) / 2, y0 - 45), label, { anchor: 'middle', size: 11, field, cls: 'sc-dim-text' });
      t.setAttribute('transform', `rotate(-90 ${x - 5} ${Math.min((y0 + y1) / 2, y0 - 45)})`);
      g.append(t);
    };
    g.append(s('line', { x1: cx - w - 54, x2: cx - w - 2, y1: top, y2: top, class: 'sc-thin', opacity: 0.7 }), s('line', { x1: cx - w - 24, x2: cx - w - 2, y1: ys, y2: ys, class: 'sc-thin', opacity: 0.7 }), s('line', { x1: cx - w - 54, x2: cx - w - 2, y1: yb, y2: yb, class: 'sc-thin', opacity: 0.7 }));
    vdim(cx - w - 20, yb, ys, `h = ${L(o.h)}`, 'M rho');
    vdim(cx - w - 50, yb, top, `L_t = ${L(v.Lt)}`, 'Lt');
    // thrust "gravity", top left
    g.append(s('path', { d: 'M24,30 L24,92', class: 'sc-accent', 'marker-end': fr.arrow('acc'), 'data-field': 'a' }));
    g.append(text(32, 58, `a = ${gs(v.a)}`, { size: 11, field: 'a' }));
    // right: frequency strip (log scale) with the pitch frequency and the bands, then the first three surface shapes
    const x0 = 500, span = 220, f = o.modes.map((m) => m.f), lo = Math.min(v.fp / v.sep, f[0]) / 1.5, hi = Math.max(f[2], v.sep * v.fp) * 1.3;
    const F = (x) => x0 + (span * Math.log(x / lo)) / Math.log(hi / lo), yS = 66;
    g.append(s('rect', { x: F(v.fp / v.sep), y: yS - 9, width: F(v.sep * v.fp) - F(v.fp / v.sep), height: 18, fill: 'var(--danger)', 'fill-opacity': 0.08, 'data-field': 'sep' }));
    g.append(s('rect', { x: F(v.fp / NEAR), y: yS - 9, width: F(NEAR * v.fp) - F(v.fp / NEAR), height: 18, fill: 'var(--danger)', 'fill-opacity': 0.16, 'data-field': 'fp' }));
    g.append(s('line', { x1: x0, x2: x0 + span, y1: yS, y2: yS, class: 'sc-thin' }));
    g.append(s('line', { x1: F(v.fp), x2: F(v.fp), y1: yS - 12, y2: yS + 12, stroke: 'var(--danger)', 'stroke-width': 2, 'data-field': 'fp' }));
    g.append(text(F(v.fp), yS + 25, `f_p ${Hz(v.fp)}`, { anchor: 'middle', size: 10.5, field: 'fp' }));
    let lastX = -1e9;
    f.forEach((fi, i) => {
      g.append(s('circle', { cx: F(fi), cy: yS, r: 4.5, fill: i ? 'var(--surface)' : col, stroke: i ? 'var(--text-2)' : col, 'stroke-width': 2 }));
      const x = Math.max(F(fi), lastX + (i === 1 ? 44 : 20)); lastX = x;
      g.append(text(x, yS - 15, i ? `f_${i + 1}` : `f_1 ${Hz(fi)}`, { anchor: 'middle', size: 10.5 }));
    });
    g.append(text(x0 - 6, 20, 'frequency (log): shaded = closer to f_p than you want', { size: 10, cls: 'sc-dim-text' }));
    // the three surface shapes (mode n has n−1 still rings), with the share of the liquid in each
    g.append(text(x0 - 6, 150, 'first three surface shapes, % sloshing', { size: 10, cls: 'sc-dim-text' }));
    o.modes.forEach((m, i) => {
      const bw = 30, bx = x0 + i * 80, by = 200, je = Math.max(...Array.from({ length: 41 }, (_, j) => Math.abs(besselJ1((m.lambda * j) / 40).J1)));
      const d = (sg) => `M${bx},${by + 34} ` + surf(sg, m.lambda, bx + bw, bw, by, 12, je).map((p) => `L${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ') + ` L${bx + 2 * bw},${by + 34} Z`;
      const p = s('path', { d: d(1), fill: 'var(--series-1)', 'fill-opacity': 0.16, stroke: i ? 'var(--text-2)' : col, 'stroke-width': 1.4 });
      if (anim) p.append(s('animate', { attributeName: 'd', dur: `${(slow / f1) * (f1 / m.f)}s`, repeatCount: 'indefinite', values: [d(1), d(0), d(-1), d(0), d(1)].join(';'), ...spline }));
      g.append(p, s('path', { d: `M${bx},${by - 22} L${bx},${by + 34} L${bx + 2 * bw},${by + 34} L${bx + 2 * bw},${by - 22}`, class: 'sc-line', fill: 'none' }));
      g.append(text(bx + bw, by + 52, `mode ${i + 1}`, { anchor: 'middle', size: 10.5 }));
      g.append(text(bx + bw, by + 67, `${fmt(100 * m.mFrac, { digits: 2 })} %`, { anchor: 'middle', size: 10, cls: 'sc-dim-text' }));
    });
    g.append(s('rect', { x: x0 - 6, y: 300, width: 14, height: 10, fill: 'var(--danger)', 'fill-opacity': 0.14 }), text(x0 + 14, 309, 'liquid levels where f_1 is within 25 % of f_p', { size: 10 }));
    g.append(s('rect', { x: x0 - 6, y: 318, width: 14, height: 10, fill: 'var(--danger)', 'fill-opacity': 0.07 }), text(x0 + 14, 327, 'levels closer to f_p than you want', { size: 10 }));
    g.append(text(W - 8, H - 8, `tank and pendulum to scale; surface tilt and swing exaggerated${anim ? `; shown ${slow > 1 ? `${slow}× slower` : 'at true speed'}` : ''}`, { anchor: 'end', size: 10, cls: 'sc-dim-text' }));
    // handles: liquid surface (propellant mass), tank top (length), bottom corner (diameter)
    ctx.handle('surface', cx + w - 12, ys, {
      field: 'M', title: 'Drag up or down to change the propellant in the tank',
      onDrag: (sx, sy) => ctx.setValue('M', Math.max(1e-6, Math.min(v.Lt, (yb - sy) / k)) * v.rho * Math.PI * R * R),
      onKey: (dx, dy) => ctx.setValue('M', o.M * (1 + 0.03 * dy)),
    });
    ctx.handle('top', cx, top, {
      field: 'Lt', title: 'Drag up or down to change the tank length',
      onDrag: (sx, sy) => ctx.setValue('Lt', Math.max(0.01, (yb - sy) / k)),
      onKey: (dx, dy) => ctx.setValue('Lt', v.Lt * (1 + 0.03 * dy)),
    });
    ctx.handle('wall', cx + w, yb, {
      field: 'D', title: 'Drag sideways to change the tank diameter',
      onDrag: (sx) => ctx.setValue('D', Math.max(0.01, (sx - (cx - w)) / k)),
      onKey: (dx) => ctx.setValue('D', v.D * (1 + 0.03 * dx)),
    });
  },
  symbols: {
    a: 'thrust acceleration, thrust minus drag over mass (m/s² or ft/s²)', T: 'thrust (N or lbf)', D: 'tank inside diameter (mm or in)', m: 'rocket mass (kg or lb)',
    R: 'tank inside radius (mm or in)', M: 'propellant mass in the tank (kg or lb)', '\\rho': 'propellant density (kg/m³ or lb/ft³)', h: 'liquid depth (mm or in)',
    '\\lambda_n': '$n$th root of $J_1^\\prime(\\lambda)=0$: 1.841, 5.331, 8.536 (no unit)', '\\lambda_1': 'first root of $J_1^\\prime=0$, 1.841 (no unit)', '\\lambda_2': 'second root, 5.331 (no unit)', '\\lambda_3': 'third root, 8.536 (no unit)',
    '\\omega_n': 'circular frequency of mode $n$ (rad/s)', '\\omega_1': 'first-mode circular frequency (rad/s)', f_n: 'frequency of mode $n$ (Hz)', f_1: 'first slosh frequency (Hz)', f_2: 'second slosh frequency (Hz)', f_3: 'third slosh frequency (Hz)',
    m_n: 'slosh mass of mode $n$ (kg or lb)', m_1: 'first-mode slosh mass (kg or lb)', m_2: 'second-mode slosh mass (kg or lb)', m_3: 'third-mode slosh mass (kg or lb)', m_0: 'liquid moving with the tank (kg or lb)',
    L_n: 'equivalent pendulum length of mode $n$ (mm or in)', L_1: 'first-mode pendulum length (mm or in)', e_1: 'depth of the first-mode pendulum hinge below the surface (mm or in)',
    f_p: 'rocket pitch frequency (Hz)', r: 'separation you want (no unit)', 'h_\\times': 'depth at which $f_1=f_p$ (mm or in)', 'f_{1,\\infty}': 'first slosh frequency of a deep fill (Hz)',
    'f_{p,req}': 'pitch frequency for your separation (Hz)', 'D_{req}': 'tank diameter for your separation (mm or in)', L_t: 'tank inside length (mm or in)',
  },
  report(v, out, R) {
    const o = out.o, n = R.n, l = (x) => R.v(x, LEN), m1 = o.modes[0];
    const steps = [{ label: 'Liquid depth', lhs: 'h', eq: '\\frac{M}{\\rho\\pi R^2}', sub: `\\frac{${R.v(o.M, MASS)}}{${R.v(v.rho, DENS)}\\,\\pi\\,(${l(out.R)})^2}`, res: R.Q(o.h, LEN) }];
    o.modes.forEach((m, i) => steps.push({ label: `Mode ${i + 1} ($\\lambda_${i + 1}=${n(m.lambda, 6)}$)`, lhs: `\\omega_${i + 1}`, eq: `\\sqrt{\\frac{a}{R}\\lambda_${i + 1}\\tanh\\frac{\\lambda_${i + 1}h}{R}}`,
      sub: `\\sqrt{\\frac{${R.v(v.a, ACC)}}{${l(out.R)}}\\times${n(m.lambda, 6)}\\tanh\\frac{${n(m.lambda, 6)}\\times${l(o.h)}}{${l(out.R)}}}`, res: `${n(m.w)}\\ \\mathrm{rad\\,s^{-1}}=${n(m.f)}\\ \\mathrm{Hz}` }));
    steps.push(
      { label: 'First-mode slosh mass (residue of eq. 5-47)', lhs: 'm_1', eq: 'M\\,\\frac{2\\tanh(\\lambda_1h/R)}{\\lambda_1(\\lambda_1^2-1)\\,h/R}', res: R.Q(m1.m, MASS) },
      { label: 'Equivalent pendulum length', lhs: 'L_1', eq: '\\frac{R}{\\lambda_1\\tanh(\\lambda_1h/R)}', res: R.Q(m1.pendulum, LEN) },
      { label: 'Hinge depth below the surface (eq. 5-49 ÷ eq. 5-47)', lhs: 'e_1', eq: '\\frac{R}{\\lambda_1}\\,\\frac{1-2\\,\\mathrm{sech}(\\lambda_1h/R)}{\\tanh(\\lambda_1h/R)}', res: R.Q(m1.hinge, LEN) },
      { label: 'Separation from the pitch frequency (your limit, not a published one)', lhs: 'f_1/f_p', eq: `\\frac{${n(m1.f)}}{${n(v.fp)}}`, res: n(m1.f / v.fp) });
    return [{
      title: 'Theory',
      text: 'Under thrust the propellant sits in an apparent gravity field of strength $a=(T-D)/m$. For small motions of the free surface in an upright cylindrical tank of radius $R$ filled to depth $h$, the velocity potential is a sum of Bessel modes $J_1(\\lambda_nr/R)$; the wall condition requires $J_1^\\prime(\\lambda_n)=0$ and the free-surface condition gives the natural frequencies (Hoult). The side-force and moment transfer functions (eqs. 5-47, 5-49) give each mode’s slosh mass and the depth at which it acts: an equivalent pendulum.',
      steps,
    }];
  },
  limits: [
    'Upright round tank with a flat bottom and no baffles; inviscid liquid, small motions, steady acceleration (Hoult’s assumptions). Domed ends, baffles and damping are not modelled.',
    'Frequencies at one moment: the acceleration and the pitch frequency change during the burn, so check several moments.',
    'The verdict bands (1.25× and your separation) are a project choice, not a published limit.',
  ],
  references: ['analysis-of-the-motion-of-liquids-in-a-partially-filled-enclosure-orig', 'sloshing-errata'],
  examples: [
    { name: 'Student ethanol tank, 152 mm, half full at 5 g', values: { D: 0.5, Lt: 3, rho: 1.5309, M: 0.45, a: 160.87, fp: 3, sep: 2 } },
    { name: 'Hybrid N₂O tank, 6 in, near burnout', values: { D: 0.5, Lt: 4, rho: 1.6, M: 0.25, a: 96.5, fp: 5, sep: 2 } },
    { name: 'Kerosene, 1 m tank, 3 g', values: { D: 3.2808, Lt: 10, rho: 1.5717, M: 32.6, a: 96.522, fp: 2, sep: 2 } },
    { name: '4 ft tank at 10 g', values: { D: 4, Lt: 12, rho: 2, M: 20, a: 322, fp: 1, sep: 2 } },
  ],
};
