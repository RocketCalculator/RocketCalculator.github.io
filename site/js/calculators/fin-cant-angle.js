// Fin Cant Angle & Roll Rate — UI definition.
import { derivatives, cantForRate, cantForCycles, cantWithLag, rollFromCant, misalignmentGain } from '../calc/cantAngle.js';
import { s, fmt, reducedMotion, InputError } from '../util.js';
import { dim, path, text, finEndView } from '../ui/svg.js';

const LEN = { dim: 'length', internal: 'in' };
const SPEED = { dim: 'speed', internal: 'fts' };
const DIST = { dim: 'distance', internal: 'ft' };
const ALT = { dim: 'altitude', internal: 'ft' };
const WAVE = { dim: 'wavenumber', internal: 'perft' };
const DEG = Math.PI / 180, TAU = 2 * Math.PI;
const deg = (r) => r / DEG;
const D = (x) => `${fmt(x, { digits: 3 })}°`;
const Hz = (x) => `${fmt(x, { digits: 3 })} Hz`;
// verdict bands (D-fin-cant-angle): burnout roll ÷ pitch frequency; the memo says keep the roll below 30–40 % of the pitch
const SAFE = 0.3, LIMIT = 0.4;
const ST = { safe: 'ok', marginal: 'warn', unsafe: 'err' };
const level = (r) => (r <= SAFE ? 'safe' : r <= LIMIT ? 'marginal' : 'unsafe');
const rateMode = (v) => v.mode === 'rate';

/** Everything the page shows, for page values v (optionally another cant, in degrees). */
function model(v, compat = false, delta = v.delta) {
  const d = derivatives(v, { compat });
  const roll = rollFromCant(delta * DEG, d, v), bo = roll.at(v.h);
  const lamP = (TAU * v.fP) / v.V;                                    // pitch wavenumber (rad/ft), constant in the boost
  const fBO = (bo.lam * v.V) / TAU, f0 = (roll.lam0 * v.V) / TAU, ratio = Math.abs(bo.lam) / lamP;
  const sg = Math.sign(delta) || 1;
  // solved cants (closed form, all linear in δ): your target, 30 % of the pitch frequency, 2 roll turns
  const tgt = rateMode(v) ? cantWithLag(v, d, v).deltaDeg : cantForCycles(v, d, v).deltaDeg;
  const tgtSteady = rateMode(v) ? cantForRate(v, d).deltaDeg : null;
  const d30 = sg * Math.abs(cantWithLag({ ...v, f: SAFE * v.fP }, d, v).deltaDeg);
  const d40 = sg * Math.abs(cantWithLag({ ...v, f: LIMIT * v.fP }, d, v).deltaDeg);
  const d2 = sg * Math.abs(cantForCycles({ ...v, Mc: 2 }, d, v).deltaDeg);
  const tgtRatio = Math.abs(tgt / d30) * SAFE;                       // roll is linear in δ
  return { d, roll, bo, lamP, fBO, f0, ratio, lv: level(ratio), gain: misalignmentGain(ratio), tgt, tgtSteady, tgtRatio, d30, d40, d2 };
}

const targetText = (v) => (rateMode(v) ? `${Hz(v.f)} at burnout` : `${fmt(v.Mc, { digits: 3 })} roll turns to burnout`);

export default {
  slug: 'fin-cant-angle',
  topic: 'fin-setting',
  title: 'Fin Cant Angle & Roll Rate',
  subtitle: 'How fast your <b>canted fins</b> spin the rocket, whether that roll stays safely below the <b>pitch frequency</b>, and the exact cant to set for your roll target.',
  verdict: true,
  tiers: true,
  intro: {
    what: 'Takes the cant angle you set on the fins and works out the roll rate it gives at burnout, the roll turns from launcher exit to burnout, and how close the roll comes to the rocket’s pitch frequency. It also solves the cant that hits your roll target.',
    why: 'A steady roll averages out thrust and fin misalignments and shrinks dispersion. Roll too fast, though, and it approaches the pitch frequency: misalignments then push the rocket to larger angles of attack and loads (roll lock-in in the extreme).',
    when: 'Setting the fins during assembly with a laser level, checking a measured as-built cant, or choosing a roll programme for a new design.',
  },
  info: {
    text: [
      'A canted fin meets the air at a small angle, so it makes a sideways force that twists the rocket into a roll. As the rocket rolls, each fin also moves sideways through the air, which takes away angle of attack — most at the tip. The roll settles where driving and damping balance.',
      'That balance fixes the roll wavenumber, the roll angle per foot flown, so the roll rate grows in step with the speed. Roll inertia makes it lag early in the boost.',
      'The memo’s rule: keep the roll below 30–40 % of the pitch frequency, and make at least 2–3 roll turns to burnout. The verdict judges your cant against the first; the fixes give the exact cants.',
    ],
    tex: 'dL=q\\,y\\,c(y)\\,c_{N\\alpha}\\Big(\\delta-\\frac{py}{U}\\Big)dy,\\qquad \\lambda_{R0}=\\frac{p}{U}=-\\frac{N C_{L\\delta}\\,\\delta}{R\\,C_{Lp}}',
    steps: [
      'Enter the fin set and the cant angle you set (or measured) on each fin.',
      'Enter the burnout speed and altitude, the launcher length, the roll inertia, and the pitch frequency at burnout (from the Pitch-Yaw Wave Number calculator).',
      'Choose your roll target: a roll rate at burnout, or a number of roll turns to burnout.',
      'Read the verdict: the roll against the pitch frequency, and the exact cant to set. Drag the fin section in the drawing to try another cant.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'fins', title: 'Fin set',
      fields: [
        { id: 'R', shared: 'bodyR', label: 'Body radius', sym: 'R', ...LEN, default: 3.125, min: 0.2, max: 40, slider: { min: 0.5, max: 8, step: 0.005 },
          info: { text: ['Half the outside diameter of the body tube where the fins are.', 'Measure the tube’s outside diameter and halve it.', 'A fatter body moves the fins outward: each fin’s push has a longer lever arm, but the fins also sweep faster through the air when rolling, so the damping grows even more.'], range: '1–3 in (25–75 mm) for high-power rockets, up to 6 in (150 mm) for large research rockets.', doc: 'derivatives' } },
        { id: 'span', shared: 'finSpan', label: 'Exposed fin span (body to tip)', sym: 's', ...LEN, default: 2.375, min: 0.05, max: 100, slider: { min: 0.25, max: 15, step: 0.005 },
          info: { text: ['How far each fin sticks out from the body tube, measured from the tube to the tip.', 'The tip’s distance from the centre line is the body radius plus this span.', 'Longer fins push harder and damp harder; the roll they settle to depends on the planform shape, not on the size.'], tex: 'b=R+s', range: 'Usually 0.5–2 × the body radius.', doc: 'strip-theory' } },
        { id: 'cR', shared: 'finCr', label: 'Root chord', sym: 'c_R', ...LEN, default: 10, min: 0.1, max: 200, slider: { min: 1, max: 30, step: 0.05 },
          info: { text: ['Length of the fin where it meets the body, front to back.', 'Measure along the body tube at the fin root.', 'A longer root puts more fin area close to the body, where a strip drives the roll more than it damps it: the same cant gives a faster roll.'], range: '1–3 body diameters.', doc: 'strip-theory' } },
        { id: 'cT', shared: 'finCt', label: 'Tip chord', sym: 'c_T', ...LEN, default: 2, min: 0, max: 200, slider: { min: 0, max: 20, step: 0.05 },
          info: { text: ['Length of the fin at its tip, front to back (0 for a pointed fin).', 'Measure along the fin tip.', 'Area at the tip damps the roll more than it drives it: a bigger tip chord slows the roll for the same cant.'], range: '0–0.6 × the root chord.', doc: 'strip-theory' } },
        { id: 'N', backView: (v) => ({ R: v.R, span: v.b - v.R, nominal: { t: true }, unit: LEN, range: [3, 8], note: 'Driving and damping both grow with N, so the steady roll for a cant does not depend on N; the roll-inertia lag does.' }), shared: 'finN', label: 'Number of fins', sym: 'N', dim: 'none', default: 4, min: 1, max: 12, slider: { min: 2, max: 8, step: 1 },
          info: { text: ['How many identical fins the rocket has.', 'Three or more fins set to the same cant give no net pitch or yaw push, only roll.', 'More fins drive and damp the roll in proportion, so the steady roll is unchanged; they do overcome roll inertia sooner.'], range: '3 or 4 for most rockets.', doc: 'fin-adjustment' } },
      ],
    },
    {
      id: 'set', title: 'Fin setting',
      fields: [
        { id: 'delta', label: 'Cant angle you set (each fin)', sym: '\\delta', dim: 'angle', default: 0.15, min: -5, max: 5, slider: { min: 0, max: 1, step: 0.005 },
          info: { text: ['The angle between each fin and the rocket’s long axis, all fins the same way round, after any warp has been nulled.', 'Measure it with a laser level along the body axis: the spot moves on a screen at the nose by about the distance × the angle. The memo’s example is 0.2°, a quarter inch at the nose of a long rocket.', 'The roll rate is proportional to the cant: double it and the roll doubles. Drag the fin section in the drawing to change it.'], tex: '\\lambda_{R0}=-\\frac{N C_{L\\delta}\\,\\delta}{R\\,C_{Lp}}', range: '0.1–0.5° for sounding rockets; the strip theory gets rough above about 3°.', doc: 'fin-adjustment' } },
      ],
    },
    {
      id: 'boost', title: 'Rocket and flight at burnout',
      fields: [
        { id: 'Ixx', label: 'Roll moment of inertia', sym: 'I_{xx}', dim: 'inertia', internal: 'slugft2', default: 0.22, min: 1e-5, max: 500, slider: { min: 0.01, max: 3, step: 0.005 },
          info: { text: ['How hard the rocket is to spin up about its long axis, at burnout.', 'Measure it with a bifilar pendulum (see the Bifilar Pendulum calculator) or take it from your CAD model.', 'More inertia makes the roll lag further behind its steady value early in the boost: you need a little more cant for the same roll at burnout.'], tex: 'J=\\frac{I_{xx}}{2\\pi\\rho(h-L)R^4C_{Lp}}', range: '0.02–0.5 slug·ft² (0.03–0.7 kg·m²) for high-power rockets.', doc: 'boost-roll' } },
        { id: 'V', label: 'Burnout speed', sym: 'U', dim: 'speed', internal: 'fts', default: 1037.2, min: 30, max: 10000, slider: { min: 200, max: 3500, step: 1 },
          info: { text: ['How fast the rocket flies when the motor burns out.', 'Take it from a trajectory simulation (the Trajectory Simulation calculator, OpenRocket, RockSim).', 'The roll rate grows in step with the speed: the faster the rocket, the faster it spins for the same cant.'], tex: 'p=\\lambda_R U', range: '600–1500 ft/s (180–460 m/s) for high-power rockets.', doc: 'boost-roll' } },
        { id: 'h', label: 'Burnout altitude (AGL)', sym: 'h', dim: 'altitude', internal: 'ft', default: 2000, min: 10, max: 500000, slider: { min: 200, max: 30000, step: 10 },
          info: { text: ['Height above the launcher’s base when the motor burns out.', 'From the same trajectory simulation.', 'A longer boost gives more roll turns and lets the roll catch up with its steady value.'], tex: '\\Delta\\phi=\\lambda_{R0}\\Big[h-L+k\\ln\\frac{h-L-k}{-k}\\Big]', range: '500–10 000 ft (150–3000 m).', doc: 'boost-roll' } },
        { id: 'L', label: 'Launcher length', sym: 'L', dim: 'distance', internal: 'ft', default: 18, min: 0, max: 200, slider: { min: 0, max: 60, step: 0.5 },
          info: { text: ['Length of the rail or tower that guides the rocket.', 'Measure the rail; the rocket cannot roll until it leaves it.', 'A longer rail delays the roll and costs some roll turns before burnout.'], range: '6–20 ft (2–6 m) rails; longer towers.', doc: 'boost-roll' } },
        { id: 'rho', label: 'Air density during the boost', sym: '\\rho', dim: 'density', internal: 'slugft3', default: 0.0023, min: 1e-5, max: 0.003, slider: { min: 0.0012, max: 0.0026, step: 0.00001 },
          info: { text: ['A representative air density over the boost.', 'Take the density about halfway up the boost from the Atmosphere & Gravity calculator.', 'Thinner air makes the aerodynamic torque weaker against the roll inertia, so the roll lags more.'], range: '0.0023 slug/ft³ (1.2 kg/m³) near sea level; 0.0018 (0.93) at 8000 ft.', doc: 'boost-roll' } },
        { id: 'fP', label: 'Pitch natural frequency at burnout', sym: 'f_N', dim: 'frequency', default: 4.13, min: 0.05, max: 100, slider: { min: 0.5, max: 15, step: 0.01 },
          info: { text: ['How many times per second the rocket would swing nose-to-tail about its centre of gravity if disturbed, at burnout speed.', 'The Pitch-Yaw Wave Number calculator gives it (press the button below to fill it). It grows with speed and with static margin.', 'The higher it is, the faster the rocket may roll before misalignments start to push it to larger angles of attack.'], tex: 'f_N=\\frac{\\lambda_P U}{2\\pi}', range: '2–10 Hz at burnout for high-power rockets.', doc: 'pitch-limit' } },
      ],
    },
    {
      id: 'target', title: 'Roll target',
      fields: [
        { id: 'mode', label: 'Design for', kind: 'select', default: 'rate', options: [{ value: 'rate', label: 'Roll rate at burnout' }, { value: 'cycles', label: 'Roll turns to burnout' }],
          info: { text: ['What you want the cant to achieve.', 'A roll rate at burnout (the memo’s example uses 0.3 × the pitch frequency), or a whole number of roll turns between launcher exit and burnout, which best cancels misalignments fixed to the body.', 'The verdict always judges the cant you set; the target only sets the cant the fixes suggest.'], doc: 'roll-rate-selection' } },
        { id: 'f', label: 'Target roll rate at burnout', sym: 'p', dim: 'frequency', default: 1.24, min: 0, max: 50, when: rateMode, slider: { min: 0, max: 5, step: 0.01 },
          info: { text: ['The roll rate you want when the motor burns out, in turns per second.', 'The memo’s example: 0.3 × the burnout pitch frequency.', 'The cant needed grows in proportion: double the rate, double the cant.'], tex: '\\delta=-\\frac{pR\\,C_{Lp}}{NUC_{L\\delta}}(1-J)', range: 'Keep it below 30 % of the pitch frequency.', doc: 'fin-adjustment' } },
        { id: 'Mc', label: 'Target roll turns to burnout', sym: 'M_c', dim: 'none', default: 4, min: 0.1, max: 100, when: (v) => v.mode === 'cycles', slider: { min: 1, max: 12, step: 1 },
          info: { text: ['How many complete turns the rocket should make between leaving the launcher and burnout.', 'A whole number cancels misalignments fixed to the body best. The memo: at least 2 or 3; more is better.', 'The cant needed grows in proportion to the number of turns.'], tex: '\\delta=-\\frac{2\\pi M_c R\\,C_{Lp}}{N C_{L\\delta} D}', range: '2–6 turns.', doc: 'roll-rate-selection' } },
      ],
    },
    {
      id: 'model', title: 'Model settings (advanced)',
      fields: [
        { id: 'cNa', label: 'Fin airfoil normal-force slope', sym: 'c_{N\\alpha}', dim: 'perAngle', internal: 'perrad', default: 3.5, min: 0.5, max: 8, slider: { min: 1, max: 6.3, step: 0.05 },
          info: { text: ['How much sideways force a strip of fin makes per radian of angle of attack, averaged over the fin.', 'Thin-airfoil theory gives 2π subsonic and 4/√(M²−1) supersonic; a lower panel average (about 3.5) accounts for the losses at the root and tip.', 'It scales driving and damping alike, so the steady roll does not change; only the inertia lag does.'], range: '3–6.3 per radian.', doc: 'strip-theory' } },
      ],
    },
  ],
  actions: [{
    label: 'Fill the pitch frequency from Pitch-Yaw Wave Number', group: 'boost', title: 'Take the pitch wavenumber from the Pitch-Yaw Wave Number calculator (your saved inputs) and convert it to a frequency at your burnout speed',
    async run(v) {
      const def = (await import('./pitch-yaw-wavenumber.js')).default;
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem('rc-calc-pitch-yaw-wavenumber')); } catch { /* none */ }
      const p = {}; for (const g of def.groups) for (const f of g.fields) p[f.id] = structuredClone(f.default);
      Object.assign(p, structuredClone(def.examples?.[0]?.values || {}), saved || {});
      const lamFt = def.compute(p).results.lam * 0.3048;   // its wavenumber is per metre
      const fP = (lamFt * v.V) / TAU;
      return { values: { fP: +fP.toPrecision(4) },
        message: `Pitch frequency ${Hz(fP)} at your burnout speed, from ${saved ? 'your Pitch-Yaw Wave Number inputs' : 'the Pitch-Yaw Wave Number example — open that calculator to enter your rocket'}` };
    },
  }],
  results: [
    { id: 'fBO', label: 'Roll rate at burnout (your cant)', sym: 'f_{BO}', dim: 'frequency', key: true, digits: 3, status: (x, out) => ST[out.m.lv],
      note: (x, out) => `${Hz(out.m.f0)} once the inertia lag dies out`,
      info: { text: ['How many turns per second the rocket makes at burnout with the cant you set.', 'It is the roll wavenumber (roll angle per foot flown) times the burnout speed, reduced by the roll-inertia lag.', 'It is proportional to the cant and to the speed.'], tex: 'f_{BO}=\\frac{\\lambda_{R0}U}{2\\pi(1-J)}', doc: 'boost-roll' } },
    { id: 'ratio', label: 'Roll ÷ pitch frequency at burnout', sym: '\\lambda_R/\\lambda_P', dim: 'percent', key: true, digits: 3, status: (x, out) => ST[out.m.lv],
      note: (x, out) => (out.m.gain ? `misalignment response ×${fmt(out.m.gain, { digits: 3 })}` : 'at or past resonance'),
      info: { text: ['How fast the roll is compared with the pitch frequency: the verdict’s number.', 'Body-fixed misalignments (thrust, fins) push the rocket to an angle of attack that grows by λ_P²/(λ_P² − λ_R²) as the roll approaches the pitch frequency. The memo: below 30–40 % the damage is small. SAFE up to 30 %, MARGINAL to 40 %, UNSAFE above.', 'It scales with the cant.'], tex: 'G=\\frac{\\lambda_P^2}{\\lambda_P^2-\\lambda_R^2}', range: '≤ 30 %: misalignment response at most ×1.10.', doc: 'pitch-limit' } },
    { id: 'turns', label: 'Roll turns, launcher exit to burnout', sym: 'M', dim: 'none', key: true, digits: 3, status: (x) => (Math.abs(x) >= 2 ? 'ok' : 'warn'),
      note: () => 'the memo: at least 2–3',
      info: { text: ['How many complete turns the rocket makes between leaving the launcher and burnout with your cant.', 'The roll angle is the roll wavenumber times the distance flown, less what roll inertia holds back.', 'More turns average out body-fixed misalignments better.'], tex: '2\\pi M=\\lambda_{R0}\\Big[h-L+k\\ln\\frac{h-L-k}{-k}\\Big]', doc: 'boost-roll' } },
    { id: 'deltaT', label: 'Cant for your roll target', sym: '\\delta_t', dim: 'angle', key: true, digits: 3, status: (x, out) => ST[level(out.m.tgtRatio)],
      note: (x, out) => `${targetText(out.v)} · ${fmt(100 * out.m.tgtRatio, { digits: 3 })} % of pitch`,
      info: (val) => ({ text: ['The cant to set on every fin to meet your roll target, including the roll-inertia lag.', val.mode === 'rate' ? 'The steady cant for the target rate, increased by (1 − J) because the roll lags its steady value during the boost.' : 'The cant that makes exactly the target number of turns between launcher exit and burnout.', 'Its colour shows how that target compares with the pitch frequency.'],
        tex: val.mode === 'rate' ? '\\delta_t=-\\frac{pR\\,C_{Lp}}{NUC_{L\\delta}}(1-J)' : '\\delta_t=-\\frac{2\\pi M_c R\\,C_{Lp}}{N C_{L\\delta} D}', doc: val.mode === 'rate' ? 'fin-adjustment' : 'roll-rate-selection' }) },
    { id: 'deltaSteady', label: 'Steady-state cant for the target rate (no lag) — rate target', sym: '\\delta_{ss}', dim: 'angle', digits: 4,
      info: { text: ['The cant that gives the target rate once the roll has caught up (no inertia lag): driving and damping balance.'], tex: '\\delta_{ss}=-\\frac{p}{U}\\,\\frac{M}{L_\\delta}', doc: 'fin-adjustment' } },
    { id: 'delta30', label: 'Largest cant for roll at 30 % of pitch', sym: '\\delta_{30}', dim: 'angle', digits: 4,
      info: { text: ['The cant at which the burnout roll reaches 30 % of the pitch frequency, the SAFE limit.'], tex: '\\delta_{30}=-\\frac{0.3\\,\\lambda_PR\\,C_{Lp}}{NC_{L\\delta}}(1-J)', doc: 'pitch-limit' } },
    { id: 'delta2', label: 'Smallest cant for 2 roll turns', sym: '\\delta_2', dim: 'angle', digits: 4,
      info: { text: ['The cant that gives 2 roll turns between launcher exit and burnout, the memo’s minimum.'], tex: '\\delta_2=-\\frac{4\\pi R\\,C_{Lp}}{N C_{L\\delta} D}', doc: 'roll-rate-selection' } },
    { id: 'lamR', label: 'Roll wavenumber at burnout', sym: '\\lambda_R', ...WAVE, digits: 4, info: { text: ['Roll angle per unit distance flown at burnout (radians per length).'], tex: '\\lambda_R=\\frac{\\lambda_{R0}}{1-J}', doc: 'boost-roll' } },
    { id: 'lamP', label: 'Pitch wavenumber', sym: '\\lambda_P', ...WAVE, digits: 4, info: { text: ['Pitch frequency × 2π ÷ burnout speed: the pitch angle per unit distance flown.'], tex: '\\lambda_P=\\frac{2\\pi f_N}{U}', doc: 'pitch-limit' } },
    { id: 'J', label: 'Roll-inertia lag factor at burnout', sym: 'J', dim: 'none', digits: 4, info: { text: ['Negative; the further from zero, the more the roll lags its steady value.'], tex: 'J=\\frac{I_{xx}}{2\\pi\\rho(h-L)R^4C_{Lp}}', doc: 'boost-roll' } },
    { id: 'k', label: 'Roll-lag length', sym: 'k', ...DIST, digits: 4, info: { text: ['The distance scale over which roll inertia delays the roll (negative by the sign convention).'], tex: 'k=\\frac{I_{xx}}{2\\pi\\rho R^4C_{Lp}}', doc: 'boost-roll' } },
    { id: 'brkt', label: 'Effective roll distance', sym: 'D', ...DIST, digits: 4, info: { text: ['Distance flown after launcher exit, less what the roll lag costs.'], tex: 'D=h-L+k\\ln\\frac{h-L-k}{-k}', doc: 'boost-roll' } },
    { id: 'CLd', label: 'Roll-driving derivative (one fin)', sym: 'C_{L\\delta}', dim: 'perAngle', internal: 'perrad', digits: 4,
      info: { text: ['Rolling-moment coefficient per radian of cant on a single fin, referenced to πR² and 2R.'], tex: 'C_{L\\delta}=\\frac{c_{N\\alpha}(b-R)}{2\\pi R^3}L_\\delta', doc: 'derivatives' } },
    { id: 'CLp', label: 'Roll-damping derivative (all fins)', sym: 'C_{Lp}', dim: 'none', digits: 4,
      info: { text: ['Rolling-moment coefficient per unit pR/U for all N fins (negative: it opposes the roll).'], tex: 'C_{Lp}=\\frac{c_{N\\alpha}(b-R)N}{2\\pi R^4}M', doc: 'derivatives' } },
    { id: 'Ycp', label: 'Spanwise centre of the cant load', sym: 'Y_{CP}', ...LEN, digits: 4, info: { text: ['Radius from the centre line at which the force due to cant acts.'], tex: 'Y_{CP}=\\frac{3A(b+R)-2C(b^2+bR+R^2)}{6A-3C(b+R)}', doc: 'strip-theory' } },
    { id: 'Ld', label: 'Planform integral', sym: 'L_\\delta', dim: 'area', internal: 'in2', digits: 4, info: { text: ['∫ y c dy ÷ (b − R).'], tex: 'L_\\delta=\\frac{A(b+R)}{2}-\\frac{C(b^2+bR+R^2)}{3}', doc: 'strip-theory' } },
    { id: 'M', label: 'Planform integral', sym: 'M', dim: 'volume', internal: 'in3', digits: 4, info: { text: ['−∫ y² c dy ÷ (b − R).'], tex: 'M=-\\frac{A(b^2+bR+R^2)}{3}+\\frac{C(b^3+b^2R+bR^2+R^3)}{4}', doc: 'strip-theory' } },
  ],
  limits: [
    'Linear strip theory: no fin–body interference, one normal-force slope along the span, small angles (rough above about 3° of cant).',
    'Boost with constant acceleration (U² = 2ah) and one representative air density; the pitch wavenumber is taken as constant through the boost.',
    'The 30–40 % rule is the memo’s guidance on how much roll erodes the pitch stability, not a hard limit; the 30 % / 40 % bands are this site’s reading of it.',
    'Fin static aeroelasticity (fins twisting under load) is not modelled; it can raise the roll late in the boost.',
  ],
  compute(v, { compat } = {}) {
    v.b = v.R + v.span;   // tip radius from the measured span: always outside the body
    if (!(v.h > v.L)) throw new InputError('The burnout altitude must be above the top of the launcher.');
    const m = model(v, compat);
    const warnings = [];
    if (Math.abs(v.delta) > 3 || Math.abs(m.tgt) > 3) warnings.push({ level: 'warn', text: 'More than 3° of cant: the strip theory and small-angle assumptions become rough, and the cant adds drag.', fix: 'Aim for a lower roll target, or check the result with a wind-tunnel or CFD estimate.' });
    if (Math.abs(m.bo.turns) < 2) warnings.push({ level: 'info', text: `Your cant gives only ${fmt(Math.abs(m.bo.turns), { digits: 3 })} roll turns from launcher exit to burnout: misalignments are poorly averaged out (the memo: at least 2–3).`, fix: `Set the cant to at least ${D(Math.abs(m.d2))} for 2 turns${Math.abs(m.d2) > Math.abs(m.d30) ? ' — above the 30 % pitch limit, so a longer boost or a stiffer rocket is needed for both' : ''}.` });
    if (m.tgtRatio > SAFE) warnings.push({ level: m.tgtRatio > LIMIT ? 'warn' : 'info', text: `Your roll target (${targetText(v)}) rolls at ${fmt(100 * m.tgtRatio, { digits: 3 })} % of the pitch frequency at burnout.`, fix: `Choose a target at or below ${rateMode(v) ? Hz(SAFE * v.fP) : `${fmt(v.Mc * Math.abs(m.d30 / m.tgt), { digits: 3 })} turns`} (30 % of pitch).` });
    if (m.bo.J < -1) warnings.push({ level: 'info', text: `Roll inertia dominates (J = ${fmt(m.bo.J, { digits: 3 })}): at burnout the roll is still well below its steady value.` });
    // verdict: the cant you set against the pitch frequency; solved fixes (closed form, linear in δ)
    const fixes = [];
    if (m.lv !== 'safe') fixes.push(`Reduce the cant to at most <b>${D(Math.abs(m.d30))}</b> (now ${D(Math.abs(v.delta))}) for a roll at 30 % of the pitch frequency, or`);
    if (Math.abs(m.tgt - v.delta) > 0.005 * Math.abs(m.tgt) + 1e-4) fixes.push(`Set every fin to <b>${D(m.tgt)}</b> (now ${D(v.delta)}) for your target, ${targetText(v)}${m.tgtRatio > SAFE ? ` — ${fmt(100 * m.tgtRatio, { digits: 3 })} % of pitch, too fast` : ''}.`);
    if (m.lv !== 'safe') fixes.push('or raise the pitch frequency with more static margin (move the CG forward).');
    const pct = fmt(100 * m.ratio, { digits: 3 });
    const verdict = {
      level: m.lv,
      title: m.lv === 'safe' ? 'The roll stays well below the pitch frequency' : m.lv === 'marginal' ? 'The roll is getting close to the pitch frequency' : 'Too much roll: misalignments will grow the angle of attack',
      text: `With ${D(v.delta)} of cant the rocket rolls at <b>${Hz(Math.abs(m.fBO))}</b> at burnout, <b>${pct} %</b> of its pitch frequency (${Hz(v.fP)}; keep below 30–40 %), and makes <b>${fmt(Math.abs(m.bo.turns), { digits: 3 })}</b> roll turns from launcher exit to burnout.`,
      fixes: fixes.slice(0, 3),
    };
    const results = {
      fBO: Math.abs(m.fBO), ratio: 100 * m.ratio, turns: Math.abs(m.bo.turns), deltaT: m.tgt, deltaSteady: m.tgtSteady ?? '—', delta30: Math.abs(m.d30), delta2: Math.abs(m.d2),
      lamR: Math.abs(m.bo.lam), lamP: m.lamP, J: m.bo.J, k: m.roll.k, brkt: v.h - v.L + m.roll.k * Math.log((v.h - v.L - m.roll.k) / -m.roll.k),
      CLd: m.d.CLd, CLp: m.d.CLp, Ycp: m.d.Ycp, Ld: m.d.Ld, M: m.d.M,
    };
    return { results, warnings, verdict, m, v, d: m.d };
  },
  plots: [
    {
      id: 'boost', title: 'Roll through the boost', wide: true, height: 480,
      info: { text: ['The roll from launcher exit to burnout, against flight speed (constant acceleration). Top: your roll rate (solid), the steady roll without inertia lag (dashed) and 30 % of the pitch frequency (red). Bottom: roll turns since launcher exit.', 'The roll rate grows in step with speed; inertia makes it lag at first. The hover shows the ratio to the pitch frequency.', 'Look for the solid line staying under the red one, and the turns passing 2 before burnout.'], doc: 'boost-roll' },
      build(v, out, { U }) {
        const us = U(SPEED), m = out.m, n = 80, A = [], B = [], C = [], T = [];
        for (let i = 0; i <= n; i++) {
          const x = v.L + (v.h - v.L) * (i / n) ** 2, Ux = v.V * Math.sqrt(x / v.h), r = m.roll.at(x), X = us.v(Ux);
          A.push([X, Math.abs(r.lam * Ux) / TAU, Math.abs(r.lam) / m.lamP]); B.push([X, Math.abs(m.roll.lam0 * Ux) / TAU]); C.push([X, (SAFE * m.lamP * Ux) / TAU]); T.push([X, Math.abs(r.turns)]);
        }
        const hl = [{ y: 2, label: 'at least 2 turns', color: 'var(--text-3)' }];
        return {
          x: { label: 'Flight speed $U$', unit: us.label }, xDomain: [A[0][0], A[n][0]],
          panels: [
            { y: { label: 'Roll rate $f$', unit: 'Hz' }, color: 'var(--series-1)', includeZero: true, ratio: { label: '$\\lambda_R/\\lambda_P$' },
              series: [{ name: 'your roll', points: A }, { name: 'steady, no lag', dash: '7 4', color: 'var(--series-2)', points: B }, { name: '30 % of pitch', dash: '3 3', color: 'var(--danger)', points: C }] },
            { y: { label: 'Roll turns $M$' }, color: 'var(--series-2)', includeZero: true, series: [{ name: 'turns since launcher exit', points: T }], hlines: hl },
          ],
        };
      },
    },
    {
      id: 'cant', title: 'Choosing the cant: roll and turns at burnout', wide: true, height: 460,
      info: { text: ['What other cant angles would give at burnout. Top: the roll rate, with 30 % and 40 % of the pitch frequency as red lines (and your target rate). Bottom: the roll turns to burnout, with the memo’s minimum of 2.', 'Both grow in proportion to the cant. The good range is where the turns are above 2 and the rate is below the 30 % line.', 'The vertical lines mark your cant and the cant for your target.'], doc: 'pitch-limit' },
      build(v, out) {
        const m = out.m, top = 1.5 * Math.max(Math.abs(v.delta), Math.abs(m.tgt), Math.abs(m.d40), Math.abs(m.d2), 0.05), n = 40, F = [], T = [];
        const u1 = model(v, false, 1), kf = Math.abs(u1.fBO), kt = Math.abs(u1.bo.turns);   // the roll is linear in δ: per degree
        for (let i = 0; i <= n; i++) { const dd = (top * i) / n; F.push([dd, kf * dd, (kf * dd) / v.fP]); T.push([dd, kt * dd]); }
        const hlF = [{ y: SAFE * v.fP, label: '30 % of pitch', color: 'var(--danger)' }, { y: LIMIT * v.fP, label: '40 %: unsafe above', color: 'var(--danger)' }];
        if (rateMode(v)) hlF.push({ y: v.f, label: 'your target', color: 'var(--text-3)' });
        const hlT = [{ y: 2, label: 'at least 2', color: 'var(--text-3)' }];
        if (!rateMode(v)) hlT.push({ y: v.Mc, label: 'your target', color: 'var(--text-3)' });
        return {
          x: { label: 'Cant angle $\\delta$', unit: '°' }, xDomain: [0, top],
          vlines: [{ x: Math.abs(v.delta), label: 'your cant', color: 'var(--text)' }, { x: Math.abs(m.tgt), label: 'target', color: 'var(--series-1)', row: 1 }],
          panels: [
            { y: { label: 'Roll rate at burnout', unit: 'Hz' }, color: 'var(--series-1)', includeZero: true, yDomain: [0, Math.max(kf * top, LIMIT * v.fP * 1.15)], ratio: { label: '$\\lambda_R/\\lambda_P$' }, series: [{ name: '$f_{BO}$', points: F }], hlines: hlF },
            { y: { label: 'Roll turns to burnout' }, color: 'var(--series-2)', includeZero: true, series: [{ name: '$M$', dash: '7 4', points: T }], hlines: hlT },
          ],
        };
      },
    },
    {
      id: 'alpha', title: 'Strip angle of attack along the span', explore: true,
      info: { text: ['In steady roll each strip of fin meets the air at α = δ − py/U: the cant minus the sideways motion of the strip.', 'Inboard strips (positive α) still drive the roll, outboard strips (negative α) brake it; weighted by chord and radius they cancel exactly.', 'The vertical line is the centre of the cant load, Y_CP.'], doc: 'strip-theory' },
      build(v, out, { U }) {
        const ul = U(LEN), lam0in = out.m.roll.lam0 / 12, dl = v.delta * DEG;
        const pts = Array.from({ length: 41 }, (_, i) => { const y = v.R + ((v.b - v.R) * i) / 40; return [ul.v(y), deg(dl - lam0in * y)]; });
        return { x: { label: 'Radius from centre line $y$', unit: ul.label }, y: { label: 'Strip angle of attack $\\alpha$', unit: '°' },
          series: [{ name: '$\\alpha(y)$', points: pts, area: true }], hlines: [{ y: 0, color: 'var(--text-3)' }],
          vlines: [{ x: ul.v(out.d.Ycp), label: '$Y_{CP}$', color: 'var(--text-2)' }] };
      },
    },
  ],
  schematicTitle: 'Fin, rear view and tip section',
  schematicHint: 'Left: the fin to scale, with the push of each strip in steady roll (⊙ with the roll, ⊗ against it). Centre: rear view spinning at the burnout roll rate, coloured by the verdict. Right: the fin tip seen along the span, with the cant, the relative wind and the push. Drag the tip and root corners to change the chords and span, and the fin section to change the cant',
  schematic(ctx, v, out) {
    const W = 820, H = 420, m = out.m;
    const fr = ctx.frame({ width: W, height: H, label: 'Fin planform with strip loads, rear view with canted fins and roll, and the fin tip section with the cant angle' });
    const g = fr.layer('main'); g.replaceChildren();
    const u = ctx.U(LEN), L = (x) => `${fmt(u.v(x), { digits: 3 })} ${u.label}`;
    const col = { safe: 'var(--ok)', marginal: 'var(--warn)', unsafe: 'var(--danger)' }[m.lv];
    const lam0in = m.roll.lam0 / 12, dl = v.delta * DEG;                       // steady roll wavenumber per inch; cant in rad
    // angle exaggeration: fixed by the target and the 30 % cant so dragging the cant does not rescale the view
    const ref = Math.max(Math.abs(m.tgt), Math.abs(m.d30), 0.02), K = [1, 2, 5, 10, 20, 50, 100, 200].reduce((a, c) => (c * ref <= 16 ? c : a), 1);
    // ---- side view: fin from y = R to b above the centre line, TE unswept (drawing convention)
    const cmax = Math.max(v.cR, v.cT), k = Math.min(270 / cmax, 300 / v.b);
    const axisY = 392, xTE = 90 + cmax * k, Y = (y) => axisY - y * k;
    const cAt = (y) => v.cR + ((v.cT - v.cR) * (y - v.R)) / (v.b - v.R);
    const rootLE = [xTE - v.cR * k, Y(v.R)], tipLE = [xTE - v.cT * k, Y(v.b)];
    g.append(s('rect', { x: 20, y: Y(v.R), width: xTE + 30 - 20, height: v.R * k, class: 'sc-body-2', 'data-field': 'R' }));
    g.append(s('line', { x1: 14, x2: xTE + 40, y1: axisY, y2: axisY, class: 'sc-axis' }));
    g.append(s('path', { class: 'sc-body', d: path([rootLE, [xTE, Y(v.R)], [xTE, Y(v.b)], tipLE], true), 'data-field': 'cR cT span' }));
    // strip pushes in steady roll: ⊙ drives (out of the page, with the roll), ⊗ brakes; size ∝ c(y)·α(y)
    const NS = 6, st = Array.from({ length: NS }, (_, i) => { const y = v.R + ((i + 0.5) * (v.b - v.R)) / NS; return { y, c: cAt(y), w: cAt(y) * (dl - lam0in * y) }; });
    const wmax = Math.max(...st.map((q) => Math.abs(q.w)));
    if (wmax > 0) for (const q of st) {
      const r = Math.min(3 + (7 * Math.abs(q.w)) / wmax, (q.c * k) / 2 - 1, ((v.b - v.R) * k) / NS / 2 - 1), x = xTE - (q.c * k) / 2, y = Y(q.y), drive = q.w * Math.sign(dl || 1) > 0;
      if (r < 2) continue;
      const cl = drive ? 'sc-accent' : 'sc-accent2';
      g.append(s('circle', { cx: x, cy: y, r, class: cl, fill: 'var(--surface)', 'stroke-width': 1.4, 'data-field': 'delta' }));
      g.append(drive ? s('circle', { cx: x, cy: y, r: Math.max(1, r / 3), class: 'sc-accent-fill' })
        : s('path', { d: `M${x - r * 0.7},${y - r * 0.7}L${x + r * 0.7},${y + r * 0.7}M${x - r * 0.7},${y + r * 0.7}L${x + r * 0.7},${y - r * 0.7}`, class: cl, 'stroke-width': 1.4 }));
    }
    const y0 = -m.d.M / m.d.Ld;                                               // radius where α = 0 in steady roll
    if (dl && y0 > v.R && y0 < v.b) {
      g.append(s('line', { x1: xTE - cAt(y0) * k, x2: xTE, y1: Y(y0), y2: Y(y0), class: 'sc-thin', 'stroke-dasharray': '4 3' }));
      g.append(text(xTE - cAt(y0) * k - 6, Y(y0) + 4, '\\alpha = 0', { anchor: 'end', size: 10.5 }));
    }
    g.append(text(20, 18, dl ? '⊙ strip pushes with the roll   ⊗ against it (steady roll)' : 'no cant: the fins make no roll', { size: 10.5, cls: 'sc-dim-text' }));
    g.append(dim(fr, rootLE[0], Y(v.R), xTE, Y(v.R), `c_R = ${L(v.cR)}`, { off: 18, textOff: 14, field: 'cR' }));
    g.append(dim(fr, tipLE[0], Y(v.b), xTE, Y(v.b), `c_T = ${L(v.cT)}`, { off: -14, field: 'cT' }));
    g.append(dim(fr, xTE, axisY, xTE, Y(v.b), `b = ${L(v.b)}`, { off: 24, field: 'span' }));
    g.append(dim(fr, 34, axisY, 34, Y(v.R), `R = ${L(v.R)}`, { off: 0, field: 'R' }));
    g.append(text(14, 412, `fin to scale · angles drawn ×${K}`, { size: 10, cls: 'sc-dim-text' }));
    // ---- rear view, spinning at the burnout roll rate, roll arrow in the verdict colour
    const cx = 575, cy = 132, size = 82;
    const f = Math.abs(m.fBO), slow = f > 0.5 ? Math.ceil(f / 0.5) : 1;
    const spin = f > 1e-3 && !reducedMotion() ? { dur: slow / f, dir: v.delta >= 0 ? 1 : -1 } : null;
    g.append(finEndView(cx, cy, size, { N: v.N, r: v.R, s: v.b, cant: Math.max(-0.6, Math.min(0.6, K * dl)), cR: v.cR, cT: v.cT, spin, field: 'N delta',
      caption: [`${v.N} fin${v.N === 1 ? '' : 's'} · rear view`, slow > 1 ? `spin shown ${slow}× slower` : 'spin at true rate'] }));
    const ar = size + 16, [a0, a1, sw] = v.delta >= 0 ? [-0.75, -2.39, 0] : [-2.39, -0.75, 1];
    const P = (a) => [cx + ar * Math.cos(a), cy + ar * Math.sin(a)];
    if (f > 1e-3) {
      g.append(s('path', { d: `M${P(a0)}A${ar},${ar} 0 0 ${sw} ${P(a1)}`, fill: 'none', stroke: col, 'stroke-width': 2.5 }));
      const [ex, ey] = P(a1), tx = sw ? -Math.sin(a1) : Math.sin(a1), ty = sw ? Math.cos(a1) : -Math.cos(a1);   // tangent along the travel
      g.append(s('path', { d: `M${ex + 9 * tx},${ey + 9 * ty}L${ex - 5 * ty},${ey + 5 * tx}L${ex + 5 * ty},${ey - 5 * tx}Z`, fill: col }));
    }
    const rx = 690;
    const big = text(rx, 70, Hz(f), { size: 18, field: 'delta V' }); big.setAttribute('style', `font-size:18px;font-weight:700;fill:${col}`); g.append(big);
    g.append(text(rx, 88, 'roll at burnout', { size: 11, cls: 'sc-dim-text' }));
    g.append(text(rx, 112, `${fmt(100 * m.ratio, { digits: 3 })} % of pitch`, { size: 11, cls: 'sc-dim-text', field: 'fP' }));
    g.append(text(rx, 127, `(${Hz(v.fP)}; ≤ 30 %)`, { size: 10, cls: 'sc-dim-text', field: 'fP' }));
    g.append(text(rx, 151, `${fmt(Math.abs(m.bo.turns), { digits: 3 })} turns to burnout`, { size: 11, cls: 'sc-dim-text', field: 'h L' }));
    g.append(text(rx, 166, `inertia lag J = ${fmt(m.bo.J, { digits: 2 })}`, { size: 10, cls: 'sc-dim-text', field: 'Ixx rho' }));
    // ---- tip section seen along the span: cant δ, relative wind at the tip, push
    const sx = 620, sy = 345, hc = 78, th = Math.max(-0.6, Math.min(0.6, K * dl)), phi = Math.max(-0.7, Math.min(0.7, K * lam0in * v.b));
    const ux = Math.cos(th), uy = Math.sin(th), LE = [sx - hc * ux, sy - hc * uy], TE = [sx + hc * ux, sy + hc * uy];
    g.append(text(440, 286, `fin tip seen along the span, steady roll (angles ×${K})`, { size: 10.5, cls: 'sc-dim-text' }));
    g.append(s('line', { x1: 520, x2: 760, y1: sy, y2: sy, class: 'sc-axis' }));
    g.append(text(762, sy + 4, 'body axis', { size: 9.5, cls: 'sc-dim-text' }));
    g.append(s('line', { x1: 440, x2: 500, y1: sy, y2: sy, class: 'sc-thin', 'stroke-width': 1.6, 'marker-end': fr.arrow() }));
    g.append(text(446, sy - 6, 'U', { size: 11 }));
    // target cant ghost
    const tt = Math.max(-0.6, Math.min(0.6, K * m.tgt * DEG));
    g.append(s('line', { x1: sx - hc * Math.cos(tt), y1: sy - hc * Math.sin(tt), x2: sx + hc * Math.cos(tt), y2: sy + hc * Math.sin(tt), stroke: 'var(--text-3)', 'stroke-width': 1.2, 'stroke-dasharray': '5 4', 'data-field': 'f Mc mode' }));
    g.append(text(sx + hc * Math.cos(tt) + 6, sy + hc * Math.sin(tt) + (tt >= th ? 12 : -4), `target ${D(m.tgt)}`, { size: 9.5, cls: 'sc-dim-text', field: 'f Mc mode' }));
    g.append(s('line', { x1: LE[0], y1: LE[1], x2: TE[0], y2: TE[1], stroke: 'var(--schem-stroke)', 'stroke-width': 5, 'stroke-linecap': 'round', 'data-field': 'delta' }));
    // cant arc at the trailing edge side
    const ra = 52, arc = (a, r) => `M${sx + r},${sy}A${r},${r} 0 0 ${a >= 0 ? 1 : 0} ${sx + r * Math.cos(a)},${sy + r * Math.sin(a)}`;
    if (Math.abs(th) > 0.01) g.append(s('path', { d: arc(th, ra), class: 'sc-thin', 'stroke-width': 1.4, 'data-field': 'delta' }));
    g.append(text(sx + ra + 6, sy + (th >= 0 ? 16 : -8), `\\delta = ${D(v.delta)}`, { size: 11, field: 'delta' }));
    // relative wind at the tip: the free stream plus the tip moving with the roll (helix angle pb/U)
    const wl = 64, wx = Math.cos(phi), wy = Math.sin(phi);
    g.append(s('line', { x1: LE[0] - wl * wx - 4, y1: LE[1] - wl * wy, x2: LE[0] - 6 * wx, y2: LE[1] - 6 * wy, class: 'sc-thin', 'stroke-width': 1.6, 'stroke-dasharray': '6 3', 'marker-end': fr.arrow(), 'data-field': 'delta b' }));
    g.append(text(LE[0] - wl * wx - 6, LE[1] - wl * wy - 8, `relative wind at tip, pb/U = ${D(deg(lam0in * v.b))}`, { size: 9.5, cls: 'sc-dim-text', field: 'span' }));
    // push on the tip strip ⟂ chord, ∝ α_tip; and on the root strip for contrast
    const aTip = dl - lam0in * v.b, aRoot = dl - lam0in * v.R, amax = Math.max(Math.abs(aTip), Math.abs(aRoot), 1e-12);
    const push = (frac, a, lab, dy) => {
      if (!dl) return;
      const px = sx + frac * hc * ux, py = sy + frac * hc * uy, len = 34 * (a / amax), nx = uy, ny = -ux;   // normal pointing "up" (with the roll for δ > 0)
      if (Math.abs(len) < 3) return;
      g.append(s('line', { x1: px, y1: py, x2: px + nx * len, y2: py + ny * len, class: a * dl > 0 ? 'sc-accent' : 'sc-accent2', 'marker-end': fr.arrow(a * dl > 0 ? 'acc' : 'acc2') }));
      g.append(text(px + nx * len + 6, py + ny * len + dy, lab, { size: 9.5, cls: 'sc-dim-text' }));
    };
    push(0.25, aTip, `tip: α = ${D(deg(aTip))} ${aTip * dl > 0 ? 'drives' : 'brakes'}`, aTip * dl > 0 ? 0 : 10);
    push(-0.55, aRoot, `root: α = ${D(deg(aRoot))}`, aRoot * dl > 0 ? 0 : 10);
    // ---- handles: tip corner (c_T, b), root corner (c_R), fin section (δ)
    ctx.handle('tip', tipLE[0], tipLE[1], {
      field: 'cT span', title: 'Drag to change the tip chord and the span',
      onDrag: (px, py) => { ctx.setValue('span', Math.max(0.05 * v.R, (axisY - py) / k - v.R), { round: 0.05 }); ctx.setValue('cT', Math.max(0, (xTE - px) / k), { round: 0.05 }); },
      onKey: (dx, dy) => { if (dy) ctx.setValue('span', Math.max(0.05, v.span * (1 + 0.02 * dy))); if (dx) ctx.setValue('cT', Math.max(0, v.cT * (1 - 0.02 * dx))); },
    });
    ctx.handle('root', rootLE[0], rootLE[1], {
      field: 'cR', title: 'Drag left or right to change the root chord',
      onDrag: (px) => ctx.setValue('cR', Math.max(0.1, (xTE - px) / k), { round: 0.05 }),
      onKey: (dx) => ctx.setValue('cR', Math.max(0.1, v.cR * (1 - 0.02 * dx))),
    });
    ctx.handle('cant', LE[0], LE[1], {
      field: 'delta', title: 'Drag up or down to change the cant angle',
      onDrag: (px, py) => ctx.setValue('delta', Math.max(-5, Math.min(5, deg(Math.asin(Math.max(-0.6, Math.min(0.6, (sy - py) / hc))) / K))), { round: 0.005 }),
      onKey: (dx, dy) => ctx.setValue('delta', Math.max(-5, Math.min(5, v.delta + 0.005 * dy))),
    });
  },
  symbols: {
    R: 'body radius at the fins (ft or in)', b: 'fin tip radius from the body centre line (in or mm)', s: 'exposed fin span (in or mm)', c_R: 'root chord (in or mm)', c_T: 'tip chord (in or mm)', N: 'number of fins',
    'c_{N\\alpha}': 'normal-force slope of a fin strip (per radian)', y: 'radius of a strip from the body centre line (in or mm)', 'c(y)': 'local chord at radius $y$ (in or mm)', c: 'local chord at radius $y$ (in or mm)',
    A: 'chord-line intercept, $c=A-Cy$ (in or mm)', C: 'chord-line slope', 'L_\\delta': 'first planform integral (in² or mm²)', M: 'second planform integral (in³ or mm³), or roll turns', 'Y_{CP}': 'spanwise position of the cant load (in or mm)',
    'C_{L\\delta}': 'roll-driving derivative of one fin (per radian)', 'C_{Lp}': 'roll-damping derivative of all fins', '\\delta': 'fin cant angle (rad or °)', '\\delta_t': 'cant for your roll target (°)', '\\delta_{ss}': 'steady-state cant for the target rate (°)',
    '\\delta_{30}': 'cant giving a roll at 30 % of the pitch frequency (°)', '\\delta_2': 'cant giving 2 roll turns to burnout (°)', p: 'roll rate (rad/s)', f: 'roll rate in turns per second (Hz)', 'f_{BO}': 'roll rate at burnout (Hz)', f_N: 'pitch natural frequency at burnout (Hz)',
    U: 'flight speed (ft/s or m/s)', q: 'dynamic pressure (lbf/ft² or Pa)', dL: 'rolling moment of one strip (lbf·ft or N·m)', dy: 'width of a strip (in or mm)', 'I_{xx}': 'roll moment of inertia (slug·ft² or kg·m²)', '\\rho': 'air density (slug/ft³ or kg/m³)', h: 'burnout altitude above the launcher base (ft or m)', L: 'launcher length (ft or m)',
    J: 'roll-inertia lag factor at burnout (negative)', k: 'roll-lag length (ft or m, negative)', D: 'effective roll distance (ft or m)', M_c: 'target number of roll turns to burnout', '\\pi': 'pi, 3.14159',
    '\\lambda_{R0}': 'steady roll wavenumber, roll angle per distance flown (rad/ft or rad/m)', '\\lambda_R': 'roll wavenumber at burnout (rad/ft or rad/m)', '\\lambda_P': 'pitch wavenumber (rad/ft or rad/m)', G: 'misalignment response factor', '\\Delta\\phi': 'roll angle from launcher exit to burnout (rad)',
  },
  report(v, out, R) {
    const d = out.d, m = out.m, n = R.n;
    const Ls = { dim: 'length', internal: 'in' }, As = { dim: 'area', internal: 'in2', units: { si: 'mm2', us: 'in2' } }, Vs = { dim: 'volume', internal: 'in3', units: { si: 'mm3', us: 'in3' } };
    const Ds = { dim: 'distance', internal: 'in' }, Us = { dim: 'speed', internal: 'fts' }, Is = { dim: 'inertia', internal: 'slugft2' }, Rh = { dim: 'density', internal: 'slugft3' }, Hs = { dim: 'distance', internal: 'ft' };
    const l = (x) => R.v(x, Ls), Rd = R.v(v.R, Ds), lamU = (x) => R.Q(x, WAVE);
    const geo = [
      { label: 'Linear chord distribution $c(y)=A-Cy$', lhs: 'A', eq: '\\frac{c_Rb-c_TR}{b-R}', sub: `\\frac{${l(v.cR)}\\times${l(v.b)}-${l(v.cT)}\\times${l(v.R)}}{${l(v.b)}-${l(v.R)}}`, res: R.Q(d.A, Ls) },
      { lhs: 'C', eq: '\\frac{c_R-c_T}{b-R}', sub: `\\frac{${l(v.cR)}-${l(v.cT)}}{${l(v.b)}-${l(v.R)}}`, res: n(d.C) },
      { label: 'Planform integrals', lhs: 'L_\\delta', eq: '\\frac{A(b+R)}{2}-\\frac{C(b^2+bR+R^2)}{3}', res: R.Q(d.Ld, As) },
      { lhs: 'M', eq: '-\\frac{A(b^2+bR+R^2)}{3}+\\frac{C(b^3+b^2R+bR^2+R^3)}{4}', res: R.Q(d.M, Vs) },
      { label: 'Spanwise centre of pressure of the cant load', lhs: 'Y_{CP}', eq: '\\frac{3A(b+R)-2C(b^2+bR+R^2)}{6A-3C(b+R)}', res: R.Q(d.Ycp, Ls) },
      { label: 'Roll-driving derivative of one fin (reference area $\\pi R^2$, length $2R$)', lhs: 'C_{L\\delta}', eq: '\\frac{c_{N\\alpha}(b-R)}{2\\pi R^3}L_\\delta', sub: `\\frac{${n(v.cNa)}\\,(${l(v.b)}-${l(v.R)})}{2\\pi\\times(${l(v.R)})^3}\\times${R.v(d.Ld, As)}`, res: `${n(d.CLd)}\\ \\mathrm{rad^{-1}}` },
      { label: 'Roll-damping derivative of all fins', lhs: 'C_{Lp}', eq: '\\frac{c_{N\\alpha}(b-R)N}{2\\pi R^4}M', sub: `\\frac{${n(v.cNa)}\\,(${l(v.b)}-${l(v.R)})\\times${n(v.N)}}{2\\pi\\times(${l(v.R)})^4}\\times(${R.v(d.M, Vs)})`, res: n(d.CLp) },
    ];
    const dl = v.delta * DEG;
    const roll = [
      { label: 'Steady roll wavenumber of your cant (driving balances damping)', lhs: '\\lambda_{R0}', eq: '-\\frac{N C_{L\\delta}\\,\\delta}{R\\,C_{Lp}}', sub: `-\\frac{${n(v.N)}\\times${n(d.CLd)}\\times${n(dl)}}{${Rd}\\times(${n(d.CLp)})}`, res: lamU(Math.abs(m.roll.lam0)) },
      { label: 'Roll-inertia lag factor at burnout', lhs: 'J', eq: '\\frac{I_{xx}}{2\\pi\\rho(h-L)R^4C_{Lp}}', sub: `\\frac{${R.v(v.Ixx, Is)}}{2\\pi\\times${R.v(v.rho, Rh)}\\times(${R.v(v.h, Hs)}-${R.v(v.L, Hs)})\\times(${Rd})^4\\times(${n(d.CLp)})}`, res: n(m.bo.J) },
      { label: 'Roll rate at burnout', lhs: 'f_{BO}', eq: '\\frac{\\lambda_{R0}U}{2\\pi(1-J)}', sub: `\\frac{${R.v(Math.abs(m.roll.lam0), WAVE)}\\times${R.v(v.V, Us)}}{2\\pi\\,(1-(${n(m.bo.J)}))}`, res: `${n(Math.abs(m.fBO))}\\ \\mathrm{Hz}` },
      { label: 'Compared with the pitch frequency (the memo: keep below 30–40 %)', lhs: '\\lambda_R/\\lambda_P', eq: '\\frac{f_{BO}}{f_N}', sub: `\\frac{${n(Math.abs(m.fBO))}}{${n(v.fP)}}`, res: `${n(100 * m.ratio, 4)}\\,\\%` },
      { label: 'Misalignment response factor', lhs: 'G', eq: '\\frac{\\lambda_P^2}{\\lambda_P^2-\\lambda_R^2}', res: m.gain ? n(m.gain) : '\\text{resonance}' },
      { label: 'Roll-lag length', lhs: 'k', eq: '\\frac{I_{xx}}{2\\pi\\rho R^4C_{Lp}}', sub: `\\frac{${R.v(v.Ixx, Is)}}{2\\pi\\times${R.v(v.rho, Rh)}\\times(${Rd})^4\\times(${n(d.CLp)})}`, res: R.Q(m.roll.k, Hs) },
      { label: 'Roll turns from launcher exit to burnout', lhs: 'M', eq: '\\frac{\\lambda_{R0}}{2\\pi}\\Big[h-L+k\\ln\\frac{h-L-k}{-k}\\Big]', res: n(Math.abs(m.bo.turns)) },
    ];
    const target = v.mode === 'rate' ? [
      { label: 'Steady-state cant for the target rate', lhs: '\\delta_{ss}', eq: '-\\frac{2\\pi f}{U}\\,\\frac{M}{L_\\delta}', sub: `-\\frac{2\\pi\\times${n(v.f)}}{${R.v(v.V, Us)}}\\times\\frac{${R.v(d.M, Vs)}}{${R.v(d.Ld, As)}}`, res: `${n(m.tgtSteady, 4)}^{\\circ}` },
      { label: 'Cant including the roll-inertia lag', lhs: '\\delta_t', eq: '-\\frac{2\\pi f\\,R\\,C_{Lp}}{N\\,U\\,C_{L\\delta}}(1-J)', sub: `-\\frac{2\\pi\\times${n(v.f)}\\times${Rd}\\times(${n(d.CLp)})}{${n(v.N)}\\times${R.v(v.V, Us)}\\times${n(d.CLd)}}(1-(${n(m.bo.J)}))`, res: `${n(m.tgt, 4)}^{\\circ}` },
    ] : [
      { label: 'Effective roll distance from launcher exit to burnout', lhs: 'D', eq: 'h-L+k\\ln\\frac{h-L-k}{-k}', sub: `${R.v(v.h, Hs)}-${R.v(v.L, Hs)}+(${R.v(m.roll.k, Hs)})\\ln\\frac{${R.v(v.h, Hs)}-${R.v(v.L, Hs)}-(${R.v(m.roll.k, Hs)})}{${R.v(-m.roll.k, Hs)}}`, res: R.Q(out.results.brkt, Hs) },
      { label: `Cant for $M_c=${n(v.Mc)}$ roll turns`, lhs: '\\delta_t', eq: '-\\frac{2\\pi M_c R\\,C_{Lp}}{N\\,C_{L\\delta}\\,D}', sub: `-\\frac{2\\pi\\times${n(v.Mc)}\\times${Rd}\\times(${n(d.CLp)})}{${n(v.N)}\\times${n(d.CLd)}\\times${R.v(out.results.brkt, Hs)}}`, res: `${n(m.tgt, 4)}^{\\circ}` },
    ];
    return [
      { title: 'Theory', text: 'Each fin is divided into streamwise strips of span $dy$, each with the same normal-force slope $c_{N\\alpha}$. A strip at radius $y$ on a fin canted by $\\delta$, rolling at rate $p$, meets the air at $\\delta-py/U$, so its rolling moment is $dL=q\\,y\\,c\\,c_{N\\alpha}(\\delta-py/U)\\,dy$ with the linear chord $c=A-Cy$. Integrating over the fin gives the roll-driving derivative $C_{L\\delta}$ of one fin and the roll-damping derivative $C_{Lp}$ of all $N$ fins (Hoult, Strip Theory for Setting Fin Angles). In steady roll the two balance, so the roll wavenumber $\\lambda_R=p/U$ is fixed by the cant and the roll rate grows with speed; roll inertia makes it lag during a constant-acceleration boost (Hoult, Small Sounding Rocket Boost Phase Roll Rate). The memo advises keeping $\\lambda_R$ below 30–40 % of the pitch wavenumber $\\lambda_P$.', steps: geo },
      { title: 'Roll from your cant', steps: roll },
      { title: v.mode === 'rate' ? 'Cant for the target roll rate' : 'Cant for the target roll turns', steps: target },
    ];
  },
  references: ['fin-setting-theory-3', 'boost-phase-roll-rate2'],
  examples: [
    { name: 'Gold Rush III — fins at 0.15°, target 1.24 Hz', values: { R: 3.125, span: 2.375, cR: 10, cT: 2, N: 4, cNa: 3.5, delta: 0.15, mode: 'rate', f: 1.24, V: 1037.2, Mc: 4, Ixx: 0.22, rho: 0.0023, h: 2000, L: 18, fP: 4.13 } },
    { name: 'Gold Rush III — fins at 0.25° (close to the pitch limit)', values: { R: 3.125, span: 2.375, cR: 10, cT: 2, N: 4, cNa: 3.5, delta: 0.25, mode: 'rate', f: 1.24, V: 1037.2, Mc: 4, Ixx: 0.22, rho: 0.0023, h: 2000, L: 18, fP: 4.13 } },
    { name: 'Gold Rush III — 4 roll turns, fins at 0.45°', values: { R: 3.125, span: 2.375, cR: 10, cT: 2, N: 4, cNa: 3.5, delta: 0.45, mode: 'cycles', f: 1.24, V: 1037.2, Mc: 4, Ixx: 0.22, rho: 0.0023, h: 2000, L: 18, fP: 4.13 } },
  ],
};
