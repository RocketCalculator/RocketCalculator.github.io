// Pitch-Yaw Wave Number — UI definition.
import { pitchWave, cmAlpha, rodInertia, rollCheck, TARGET, LIMIT } from '../calc/pitchwave.js';
import { atmosphere } from '../calc/geophysics.js';
import { simLauncherLength } from '../calc/trajectory.js';
import { s, fmt, InputError } from '../util.js';
import { dim, text, pointMarker, path } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const LEN = { dim: 'length', internal: 'in' };
const IN = 0.0254, SLUGFT3 = 515.378818, FT = 0.3048;
const INERTIA = { dim: 'inertia', internal: 'kgm2' };
const MASS = { dim: 'mass', internal: 'kg' };
const DENS = { dim: 'density', internal: 'kgm3' };
const SPEED = { dim: 'speed', internal: 'ms' };
const DIST = { dim: 'distance', internal: 'm' };
const ALT = { dim: 'altitude', internal: 'ft' };
const PERRAD = { dim: 'perAngle', internal: 'perrad' };
const WAVE = { dim: 'wavenumber', internal: 'perm' };
const HZ = { dim: 'frequency' };
const ONE = { dim: 'none' };
const ST = { safe: 'ok', marginal: 'warn', unsafe: 'err' };
const COL = { safe: 'var(--ok)', marginal: 'var(--warn)', unsafe: 'var(--danger)' };
const byMargin = (v) => v.cmMode === 'margin', direct = (v) => v.cmMode === 'direct';
const measured = (v) => v.iMode === 'measured', rod = (v) => v.iMode === 'rod';
const byAlt = (v) => v.atmMode !== 'rho', byRho = (v) => v.atmMode === 'rho';
const Q = (x, spec, digits = 3) => `${fmt(toDisplay(x, spec), { digits })} ${unitLabel(displayUnit(spec))}`;
const pct = (r) => `${fmt(100 * r, { digits: 2 })} %`;
/** Standard-atmosphere density (kg/m³) at altitude h (ft above sea level). */
const rhoAt = (h) => atmosphere({ h, ho: 0, To: 518.67, phi: 45 }).rho * SLUGFT3;
/** Smallest 1, 2, 2.5 or 5 × 10ⁿ at or above x. */
const nice = (x) => { const e = 10 ** Math.floor(Math.log10(x)), m = x / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e; };

/** The values the model uses, in SI, from the page inputs. */
function inputs(v) {
  const d = 2 * v.R * IN, l = v.Lr * IN;
  return { d, l, I: v.iMode === 'rod' ? rodInertia(v.m, l) : v.I, Cma: v.cmMode === 'margin' ? cmAlpha(v.CNa, v.SM) : v.Cma, rho: byRho(v) ? v.rho : rhoAt(v.h), U: v.U };
}

/** Rocket side view: ogive nose, body, fins; base at x, nose pointing right; returns the outline path. */
function rocketPath(x, cy, Lp, r) {
  const ln = Math.min(Lp * 0.22, 5 * r), lf = Math.min(Lp * 0.16, 3.2 * r), fs = 1.6 * r;
  const xn = x + Lp, xb = x;
  return `M${xn},${cy}Q${xn - ln * 0.55},${cy - r} ${xn - ln},${cy - r}H${xb}V${cy + r}H${xn - ln}Q${xn - ln * 0.55},${cy + r} ${xn},${cy}Z` +
    `M${xb},${cy - r}L${xb - 0.15 * lf},${cy - r - fs}L${xb + 0.35 * lf},${cy - r - fs}L${xb + lf},${cy - r}Z` +
    `M${xb},${cy + r}L${xb - 0.15 * lf},${cy + r + fs}L${xb + 0.35 * lf},${cy + r + fs}L${xb + lf},${cy + r}Z`;
}

export default {
  slug: 'pitch-yaw-wavenumber',
  topic: 'pitch-yaw-wavenumber',
  title: 'Pitch-Yaw Wave Number',
  tiers: true,
  subtitle: 'How far a stable rocket flies during one <b>pitch or yaw wobble</b>, how fast it wobbles, and whether its <b>roll rate</b> stays clear of it.',
  verdict: true,
  intro: {
    what: 'Gives the distance a statically stable rocket flies during one weathercock wobble (the pitch/yaw wavelength), its wobble frequency at your speed, and compares your roll rate with that frequency.',
    why: 'The wavelength sets how quickly the rocket turns into the wind off the rail; the Trajectory Simulation needs it. A roll rate close to the wobble frequency amplifies every misalignment and invites roll lock-in.',
    when: 'Checking a new design’s stiffness, filling the Trajectory Simulation’s wavelength, or choosing the fin cant (roll rate) for burnout.',
  },
  info: {
    text: [
      'A statically stable rocket that is disturbed swings about its centre of gravity like a weathervane. The restoring push grows with the square of the speed, so the swing gets faster as the rocket speeds up.',
      'In one swing, though, the rocket always covers the same distance through the air: the pitch/yaw wavelength. It depends on the inertia, the air density and the stability, not on speed.',
      'A spinning rocket whose roll rate approaches the swing frequency responds more and more strongly to its own misalignments. Hoult keeps the roll below 30–40 % of the pitch frequency.',
    ],
    tex: 'L=2\\pi\\sqrt{\\frac{2I}{-\\rho S d\\,C_{M\\alpha}}},\\qquad f_N=\\frac{U}{L}',
    steps: ['Enter the body radius and length.', 'Give the static margin and normal-force slope (or the pitching-moment slope).', 'Give the pitch inertia, or estimate it from the mass.', 'Enter the altitude and speed of interest (burnout for the roll check), the roll rate there and the rail length.', 'Read the wavelength, the pitch frequency and the roll verdict.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'body', title: 'Rocket',
      fields: [
        { id: 'R', shared: 'bodyR', label: 'Body radius', sym: 'R', ...LEN, default: 3.07, min: 0, minExclusive: true, max: 60, slider: { min: 0.5, max: 8, step: 0.01 },
          info: { text: ['Half the outside diameter of the body tube.', 'Measure the tube’s outside diameter and halve it. The aerodynamic reference area is the tube’s cross-section, $S=\\pi d^2/4$, and the reference length is the diameter $d=2R$.', 'A fatter body with the same stability coefficients is stiffer: the wavelength falls as $d^{-3/2}$.'], tex: 'S=\\frac{\\pi d^2}{4},\\quad d=2R', range: 'Model rockets 0.5–1 in (13–25 mm); high-power 1.5–3 in (38–76 mm); student sounding rockets 3–4 in (76–100 mm).', doc: 'model' } },
        { id: 'Lr', shared: 'length', label: 'Overall length', sym: '\\ell', ...LEN, default: 148, min: 0, minExclusive: true, max: 2000, slider: { min: 12, max: 300, step: 0.5 },
          info: { text: ['Tip-to-base length of the rocket.', 'Measure from the nose tip to the end of the body (not the fin tips if they overhang).', 'It sets the wavelength in rocket lengths and, with the mass, the slender-rod inertia estimate: a longer rocket of the same mass has more inertia and a longer wavelength.'], tex: 'I\\approx\\frac{m\\ell^2}{12}', range: 'Model rockets 12–40 in; high-power 40–120 in (1–3 m); student sounding rockets 100–250 in (2.5–6 m).', doc: 'scaling' } },
      ],
    },
    {
      id: 'aero', title: 'Static stability',
      fields: [
        { id: 'cmMode', label: 'Stability from', kind: 'select', default: 'margin',
          options: [{ value: 'margin', label: 'Static margin' }, { value: 'direct', label: 'Pitching-moment slope' }],
          info: { text: ['How you give the rocket’s stiffness against pitching.', 'Most builders know the static margin (CP behind CG, in calibres) and the normal-force slope from a CP calculation; a wind-tunnel or CFD result may give the pitching-moment slope directly.', 'Both give the same number: the slope of the restoring moment with angle of attack.'], tex: 'C_{M\\alpha}=-C_{N\\alpha}\\,\\frac{X_{CP}-X_{CG}}{d}', doc: 'model' } },
        { id: 'CNa', label: 'Normal-force slope', sym: 'C_{N\\alpha}', ...PERRAD, default: 10, min: 0, minExclusive: true, max: 100, when: byMargin, slider: { min: 2, max: 30, step: 0.1 },
          info: { text: ['How fast the sideways (normal) force on the whole rocket grows with angle of attack, per radian, referred to the body cross-section.', 'The Subsonic Centre of Pressure calculator (Barrowman) gives it, as do OpenRocket and RockSim.', 'Bigger fins raise it and make the rocket stiffer: the wavelength falls as $C_{N\\alpha}^{-1/2}$.'], range: 'About 8–15 per radian for a three- or four-finned rocket at low Mach number.', doc: 'model', tex: 'C_{M\\alpha}=-C_{N\\alpha}\\frac{X_{CP}-X_{CG}}{d}' } },
        { id: 'SM', label: 'Static margin', sym: '\\frac{X_{CP}-X_{CG}}{d}', ...ONE, default: 2, min: 0, minExclusive: true, max: 20, when: byMargin, slider: { min: 0.2, max: 6, step: 0.05 },
          info: { text: ['How far the centre of pressure sits behind the centre of gravity, in body diameters (calibres).', 'Find the CG by balancing the loaded rocket; take the CP from a CP calculation. Drag the CP marker in the drawing to change it.', 'More margin makes a stiffer rocket: a shorter wavelength, a higher pitch frequency (more room for roll), but stronger weathercocking into the wind.'], tex: 'C_{M\\alpha}=-C_{N\\alpha}\\,\\frac{X_{CP}-X_{CG}}{d}', range: '1–2 calibres is the usual design range; above 3 the rocket weathercocks strongly.', doc: 'model' } },
        { id: 'Cma', label: 'Pitching-moment slope', sym: 'C_{M\\alpha}', ...PERRAD, default: -20, min: -1000, max: 0, maxExclusive: true, when: direct, slider: { min: -150, max: -1, step: 0.5 },
          info: { text: ['How fast the pitching moment about the CG grows with angle of attack, per radian, referred to $S$ and $d$.', 'From a wind-tunnel test, CFD, or the normal-force slope times the static margin. Negative for a stable rocket.', 'More negative means stiffer: the wavelength falls as $(-C_{M\\alpha})^{-1/2}$.'], range: 'About −10 to −40 per radian for typical sounding rockets.', doc: 'model', tex: '\\lambda_P=\\sqrt{\\frac{-\\rho S d\\,C_{M\\alpha}}{2I}}' } },
      ],
    },
    {
      id: 'mass', title: 'Pitch inertia',
      fields: [
        { id: 'iMode', label: 'Pitch inertia from', kind: 'select', default: 'rod',
          options: [{ value: 'rod', label: 'Mass and length' }, { value: 'measured', label: 'Measured value' }],
          info: { text: ['How you give the rocket’s resistance to being turned about its CG.', 'The estimate treats the rocket as a uniform slender rod, $I=m\\ell^2/12$. Real rockets carry mass at the motor and in the nose, so the true value is usually larger; the Bifilar Pendulum calculator turns two stopwatch timings into the measured value.', 'More inertia means a slower, longer wobble.'], tex: 'I=\\frac{m\\ell^2}{12}', doc: 'model' } },
        { id: 'm', label: 'Mass', sym: 'm', ...MASS, default: 25, min: 0, minExclusive: true, max: 5000, when: rod, slider: { min: 0.1, max: 100, step: 0.1 },
          info: { text: ['Mass of the rocket at the moment of interest.', 'Weigh it loaded for the launch value; use the burnout (empty-motor) mass for the roll check at burnout.', 'More mass, same length: more inertia and a longer wavelength ($L\\propto\\sqrt{m}$).'], range: 'Model rockets 0.1–1 kg; high-power 2–25 kg; student sounding rockets 20–60 kg.', doc: 'model', tex: 'I\\approx\\frac{mL^2}{12}' } },
        { id: 'I', label: 'Pitch moment of inertia', sym: 'I', ...INERTIA, default: 29.4, min: 0, minExclusive: true, max: 1e5, when: measured, slider: { min: 0.01, max: 100, step: 0.01 },
          info: { text: ['Moment of inertia about a sideways axis through the centre of gravity.', 'Measure it by swinging the rocket on two strings (Bifilar Pendulum calculator) or take it from CAD or OpenRocket.', 'More inertia means a slower, longer wobble ($L\\propto\\sqrt{I}$).'], range: 'High-power 0.5–5 kg m²; student sounding rockets 10–50 kg m².', doc: 'model', tex: '\\lambda_P=\\sqrt{\\frac{-\\rho S d\\,C_{M\\alpha}}{2I}}' } },
      ],
    },
    {
      id: 'flight', title: 'Flight condition',
      fields: [
        { id: 'atmMode', label: 'Air density from', kind: 'select', default: 'alt',
          options: [{ value: 'alt', label: 'Altitude' }, { value: 'rho', label: 'Density value' }],
          info: { text: ['How you give the air density where the rocket is.', 'From the altitude, the calculator uses the standard atmosphere (15 °C at sea level). Give a density yourself for a hot or high launch site (the Atmosphere & Gravity calculator gives it).', 'Thinner air means a weaker restoring push and a longer wavelength.'], doc: 'frequency' } },
        { id: 'h', label: 'Altitude (above sea level)', sym: 'h', ...ALT, default: 0, min: 0, max: 300000, when: byAlt, slider: { min: 0, max: 100000, step: 100 },
          info: { text: ['Height above sea level of the moment you are checking.', 'Use the launch-site elevation for the wavelength the Trajectory Simulation needs, and the burnout altitude for the roll check (“Fill from the Trajectory Simulation” takes it).', 'The wavelength grows as $\\rho^{-1/2}$: about 10 % longer at 2 km (6600 ft), twice as long near 14 km (46 000 ft).'], range: 'Launch sites 0–1.5 km (0–5000 ft); burnout of high-power rockets 0.3–3 km.', doc: 'frequency', tex: '\\rho=\\rho(h)' } },
        { id: 'rho', label: 'Air density', sym: '\\rho', ...DENS, default: 1.225, min: 0, minExclusive: true, max: 2, when: byRho, slider: { min: 0.05, max: 1.3, step: 0.005 },
          info: { text: ['Mass of a cubic metre (or foot) of air where the rocket is.', 'The Atmosphere & Gravity calculator gives it for any altitude and temperature.', 'Thinner air means a longer wavelength ($L\\propto\\rho^{-1/2}$).'], range: '1.225 kg m⁻³ (0.002377 slug ft⁻³) at sea level; about 1.0 at 2 km.', doc: 'frequency', tex: '\\lambda_P=\\sqrt{\\frac{-\\rho S d\\,C_{M\\alpha}}{2I}}' } },
        { id: 'U', label: 'Airspeed', sym: 'U', ...SPEED, default: 200, min: 0, minExclusive: true, max: 3000, slider: { min: 10, max: 1000, step: 1 },
          info: { text: ['Speed through the air at the moment you are checking.', 'For the roll check use the burnout speed (the fastest point, where Hoult compares roll and pitch); the Trajectory Simulation gives it.', 'Speed does not change the wavelength; the pitch frequency grows in proportion to it, $f_N=U/L$.'], range: 'High-power burnout 100–400 m/s (330–1300 ft/s).', doc: 'frequency', tex: 'f_N=\\frac{U}{L}' } },
      ],
    },
    {
      id: 'roll', title: 'Roll and launcher',
      fields: [
        { id: 'fR', label: 'Roll rate at this speed', sym: 'f_R', ...HZ, default: 0.3, min: 0, max: 100, slider: { min: 0, max: 10, step: 0.01 },
          info: { text: ['How many turns per second the rocket spins about its long axis at this speed.', 'From the fin cant (Fin Cant Angle or Roll Rate History calculators) or a flight recording; 0 if the rocket does not roll. Drag the first roll mark in the drawing to change it.', 'The verdict compares it with the pitch frequency: below 30 % is safe, above 40 % misalignments are amplified and the rocket nears roll lock-in.'], tex: '\\frac{\\lambda_R}{\\lambda_P}=\\frac{f_R}{f_N}', range: 'Hoult’s target is 0.3 × the burnout pitch frequency, typically 0.5–3 Hz.', doc: 'roll' } },
        { id: 'railL', label: 'Launch rail length', sym: 'L_r', ...DIST, default: 6, min: 0, max: 100, slider: { min: 0, max: 20, step: 0.1 },
          info: { text: ['Length of rail or tower that guides the rocket before it is free to weathercock.', 'Measure the length the rocket travels guided, from its first launch lug to the end of the rail.', 'It does not change the wavelength; the drawing shows it to scale against the wobble, and the results give the longer rail a point-mass simulation needs (Hoult, 1976).'], range: 'High-power rails 2–5 m (6–16 ft); sounding-rocket towers 6–20 m.', doc: 'launcher', tex: 'L_{sim}=L_r+\\Delta L(\\lambda_P,L_r)' } },
      ],
    },
  ],
  actions: [{
    label: 'Fill from the Trajectory Simulation', group: 'flight', title: 'Run the Trajectory Simulation with its saved inputs and take its burnout speed and altitude and its rail length',
    async run() {
      const def = (await import('./skyaero-trajectory.js')).default;
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem('rc-calc-skyaero-trajectory')); } catch { /* none */ }
      const v = {}; for (const g of def.groups) for (const f of g.fields) v[f.id] = structuredClone(f.default);
      Object.assign(v, structuredClone(def.examples?.[0]?.values || {}), saved || {});
      const b = def.compute(v).o.burnouts.at(-1);
      if (!b || !(b.V > 0)) return { values: {}, message: 'The Trajectory Simulation has no burnout to take' };
      const U = b.V * FT, h = v.ho + b.z;
      return { values: { U, atmMode: 'alt', h, railL: v.L * FT },
        message: `${saved ? 'From your Trajectory Simulation' : 'From the Trajectory Simulation example (open it to simulate your own rocket)'}: burnout ${Q(U, SPEED)} at ${Q(h, ALT)}, rail ${Q(v.L * FT, DIST)}` };
    },
  }],
  results: [
    { id: 'L', label: 'Pitch/yaw wavelength', sym: 'L', ...DIST, key: true, digits: 4,
      note: (x, out) => `${fmt(out.o.Lrel, { digits: 3 })} rocket lengths · the Trajectory Simulation’s $\\Lambda_P$`,
      info: { text: ['How far the rocket flies through the air during one complete wobble, nose up and back.', 'It depends on inertia, density and stability, not on speed. Enter the launch-site value as “Pitch/yaw wavelength” in the Trajectory Simulation.', 'Short is stiff (turns quickly into the wind); long is lazy.'], tex: 'L=2\\pi\\sqrt{\\frac{2I}{-\\rho S d\\,C_{M\\alpha}}}', range: 'High-power rockets 30–300 m (100–1000 ft).', doc: 'model' } },
    { id: 'f', label: 'Pitch natural frequency', sym: 'f_N', ...HZ, key: true, digits: 4,
      note: (x, out) => `at ${Q(out.v.U, SPEED)} · one wobble every ${fmt(out.o.P, { digits: 3 })} s`,
      info: { text: ['How many wobbles per second the rocket makes at this airspeed.', 'It is the airspeed divided by the wavelength, so it rises in proportion to speed and peaks at burnout.', 'The roll rate is compared with it.'], tex: 'f_N=\\frac{\\omega_N}{2\\pi}=\\frac{U}{L}', range: 'High-power rockets at burnout 1–10 Hz.', doc: 'frequency' } },
    { id: 'ratio', label: 'Roll rate ÷ pitch frequency', sym: 'f_R/f_N', ...ONE, key: true, digits: 3, status: (x, out) => ST[out.lv],
      note: (x, out) => `roll ${fmt(out.v.fR, { digits: 3 })} Hz · safe ≤ ${pct(TARGET)}, unsafe > ${pct(LIMIT)}`,
      info: { text: ['How close the spin is to the wobble: the roll wave number over the pitch wave number, or the roll rate over the pitch frequency at the same speed.', 'Hoult: keep it below 30–40 %; his worked design spins at 30 % of the burnout pitch frequency.', '1 is resonance: the rocket can lock its roll onto its pitch motion and cone at a large angle of attack.'], tex: '\\frac{\\lambda_R}{\\lambda_P}=\\frac{f_R}{f_N}', range: '0.2–0.3 is the design target.', doc: 'roll' } },
    { id: 'amp', label: 'Misalignment response factor', sym: '\\frac{\\lambda_P^2}{\\lambda_P^2-\\lambda_R^2}', ...ONE, key: true, digits: 3, status: (x, out) => ST[out.lv],
      note: (x) => (x === '—' ? 'at or past pitch resonance' : `angle of attack and loads ${fmt(x, { digits: 3 })} × the non-rolling value`),
      info: { text: ['How much the roll multiplies the angle of attack (and the loads) caused by body-fixed misalignments such as bent fins or an offset thrust.', 'Hoult: the response is proportional to $\\lambda_P^2/(\\lambda_P^2-\\lambda_R^2)$; roll “destroys” some of the static stability.', 'It is 1.10 at 30 %, 1.19 at 40 % and grows without bound at resonance (“—”).'], tex: '\\frac{\\lambda_P^2}{\\lambda_P^2-\\lambda_R^2}=\\frac{1}{1-(f_R/f_N)^2}', doc: 'roll' } },
    { id: 'lam', label: 'Pitch wave number', sym: '\\lambda_P', ...WAVE, digits: 4,
      info: { text: ['The wobble counted per unit distance flown, in radians per metre or foot: the wavelength the other way up.'], tex: '\\lambda_P=\\sqrt{\\frac{-\\rho S d\\,C_{M\\alpha}}{2I}}=\\frac{2\\pi}{L}', doc: 'model' } },
    { id: 'Lrel', label: 'Wavelength in rocket lengths', sym: 'L/\\ell', ...ONE, digits: 4,
      info: { text: ['Wavelength divided by the overall length. It is the same for geometrically similar rockets of any size (Hoult’s scaling law $L\\propto\\ell$).'], doc: 'scaling' } },
    { id: 'P', label: 'Pitch period', sym: 'P', dim: 'time', digits: 4, info: { text: ['Time for one wobble at this airspeed.'], tex: 'P=\\frac{2\\pi}{\\omega_N}=\\frac{L}{U}', doc: 'frequency' } },
    { id: 'omega', label: 'Pitch natural circular frequency', sym: '\\omega_N', dim: 'rate', digits: 4, info: { text: ['The pitch frequency in radians per second.'], tex: '\\omega_N^2=\\frac{-\\rho S d\\,U^2C_{M\\alpha}}{2I}', doc: 'frequency' } },
    { id: 'lamR', label: 'Roll wave number', sym: '\\lambda_R', ...WAVE, digits: 4, info: { text: ['Roll angle turned per unit distance flown.'], tex: '\\lambda_R=\\frac{2\\pi f_R}{U}', doc: 'roll' } },
    { id: 'LamR', label: 'Distance per roll turn (— if not rolling)', sym: '\\Lambda_R', ...DIST, digits: 4, info: { text: ['How far the rocket flies during one roll turn; the drawing marks each turn along the flight path.'], tex: '\\Lambda_R=\\frac{U}{f_R}=\\frac{2\\pi}{\\lambda_R}', doc: 'roll' } },
    { id: 'fFix', label: 'Highest roll rate for 30 %', sym: 'f_{R,max}', ...HZ, digits: 3, info: { text: ['The roll rate at this speed that puts the spin at Hoult’s 30 % target.'], tex: 'f_{R,max}=0.3\\,f_N', doc: 'roll' } },
    { id: 'railW', label: 'Rail length in wavelengths', sym: 'L_r/L', ...ONE, digits: 3, info: { text: ['How much of one wobble the rail covers. The rocket starts to weathercock only after it leaves the rail.'], doc: 'launcher' } },
    { id: 'Lsim', label: 'Rail a point-mass simulation needs', sym: 'L_{sim}', ...DIST, digits: 4,
      info: { text: ['A point-mass simulation turns into the wind the instant the rocket leaves the rail. Hoult (1976) found the longer, artificial rail that makes it turn like the real rocket; the Trajectory Simulation computes it from the wavelength you give it.'], tex: 'L_{sim}=\\frac{0.140365}{\\lambda_P}\\exp\\left(\\sqrt{2\\pi\\lambda_PL_r}-0.387621(\\lambda_PL_r)^{1.2}\\right)', doc: 'launcher' } },
    { id: 'rho', label: 'Air density used', sym: '\\rho', ...DENS, digits: 4, info: { text: ['From the standard atmosphere at your altitude, or your value.'], doc: 'frequency' } },
    { id: 'Cma', label: 'Pitching-moment slope used', sym: 'C_{M\\alpha}', ...PERRAD, digits: 4, info: { text: ['How strongly the rocket turns back into the wind per radian of angle of attack (negative when stable).'], tex: 'C_{M\\alpha}=-C_{N\\alpha}\\frac{X_{CP}-X_{CG}}{d}', doc: 'model' } },
    { id: 'I', label: 'Pitch moment of inertia used', sym: 'I', ...INERTIA, digits: 4, info: { text: ['The pitch moment of inertia used: yours, or the uniform-rod estimate from the mass and length.'], tex: 'I\\approx\\frac{mL^2}{12}', doc: 'model' } },
    { id: 'S', label: 'Reference area', sym: 'S', dim: 'area', internal: 'm2', digits: 4, info: { text: ['The reference area: the body cross-section.'], tex: 'S=\\frac{\\pi d^2}{4}', doc: 'model' } },
    { id: 'q', label: 'Dynamic pressure', sym: 'q', dim: 'pressure', digits: 4, info: { text: ['The dynamic pressure at this speed and density.'], tex: 'q=\\tfrac12\\rho U^2', doc: 'frequency' } },
  ],
  compute(v) {
    const p = inputs(v);
    if (!(p.Cma < 0)) throw new InputError('The pitching-moment slope must be negative: a rocket with no static margin does not oscillate, it tumbles.');
    const o = pitchWave(p), rc = rollCheck(o, v.fR, p), lv = rc.level;
    const fixes = [];
    if (lv !== 'safe') {
      fixes.push(`Set the fins for a roll rate of at most <b>${fmt(rc.fR, { digits: 3 })} Hz</b> at this speed (now ${fmt(v.fR, { digits: 3 })}) — the Fin Cant Angle calculator gives the cant, or`);
      // a margin beyond the input's range is no fix (a warning says so)
      if (byMargin(v) && v.SM * rc.stiffen <= 20) fixes.push(`raise the static margin to at least <b>${fmt(v.SM * rc.stiffen, { digits: 3 })} calibres</b> (now ${fmt(v.SM, { digits: 3 })}), or`);
      if (direct(v)) fixes.push(`make the pitching-moment slope at most <b>${fmt(v.Cma * rc.stiffen, { digits: 3 })} per rad</b> (now ${fmt(v.Cma, { digits: 3 })}), or`);
      fixes.push(`move mass towards the CG to cut the pitch inertia to at most <b>${Q(p.I / rc.stiffen, INERTIA)}</b> (now ${Q(p.I, INERTIA)}${rod(v) ? ', slender-rod estimate' : ''}).`);
    }
    const r = rc.ratio, roll = v.fR > 0;
    const verdict = {
      level: lv,
      title: !roll ? 'Not rolling: no lock-in risk' : lv === 'safe' ? 'The roll stays well clear of the pitch frequency' : lv === 'marginal' ? 'The roll is getting close to the pitch frequency' : r >= 1 ? 'The roll is at or past pitch resonance: lock-in risk' : 'The roll is too close to the pitch frequency',
      text: `At ${Q(v.U, SPEED)} the rocket wobbles at <b>${fmt(o.f, { digits: 3 })} Hz</b> (one wobble every ${Q(o.L, DIST)}); it rolls at <b>${fmt(v.fR, { digits: 3 })} Hz</b>, ${pct(r)} of that${r < 1 ? `, so misalignments act ${fmt(rc.amp, { digits: 3 })} × as hard` : ''}. Hoult keeps it below 30–40 %.`,
      fixes: fixes.slice(0, 3),
    };
    const warnings = [];
    if (byMargin(v) && v.SM < 1) warnings.push({ level: 'warn', text: 'A static margin below one calibre leaves little room for CG shifts and CP movement at higher Mach numbers.', fix: 'Aim for 1–2 calibres.' });
    if (byMargin(v) && v.SM * rc.stiffen > 6 && lv !== 'safe') warnings.push({ level: 'info', text: `The static margin that brings the roll to 30 % (${fmt(v.SM * rc.stiffen, { digits: 3 })} calibres) is far above the usual range and would make the rocket weathercock hard.`, fix: 'Lower the roll rate (fin cant) instead.' });
    if (r >= 1) warnings.push({ level: 'err', text: 'The rocket rolls at or faster than it wobbles: during boost its roll rate passes through the pitch frequency, where it can lock in and cone at a large angle of attack.', fix: `Reduce the fin cant for at most ${fmt(rc.fR, { digits: 3 })} Hz at this speed, or see the Roll Lock-In calculator.` });
    if (!roll) warnings.push({ level: 'info', text: 'With no roll, fin and thrust misalignments push the rocket the same way all through the boost and are not averaged out.', fix: `Hoult’s target is about 0.3 × the burnout pitch frequency: ${fmt(rc.fR, { digits: 3 })} Hz at this speed and height.` });
    if (o.Lrel < 15) warnings.push({ level: 'info', text: `The wavelength is only ${fmt(o.Lrel, { digits: 2 })} rocket lengths, a very stiff rocket: it will weathercock strongly into crosswinds.`, fix: 'Check that the static margin is not excessive.' });
    const results = { L: o.L, f: o.f, ratio: r, amp: r < 1 ? rc.amp : '—', lam: o.lam, Lrel: o.Lrel, P: o.P, omega: o.omega, lamR: rc.lamR, LamR: roll ? rc.LamR : '—', fFix: rc.fR,
      railW: v.railL / o.L, Lsim: simLauncherLength(o.lam, v.railL), rho: p.rho, Cma: p.Cma, I: p.I, S: o.S, q: o.q };
    return { results, warnings, verdict, lv, rc, o, p, v };
  },
  plots: [
    {
      id: 'lockin', title: 'Roll against the pitch frequency: how misalignments are amplified', wide: true,
      info: { text: ['The factor by which roll multiplies the angle of attack (and loads) from body-fixed misalignments, against the roll rate at this speed (Hoult: $\\lambda_P^2/(\\lambda_P^2-\\lambda_R^2)$, plotted as its size).', 'It stays near 1 at low roll, passes 1.19 at 40 % of the pitch frequency and soars at resonance, where lock-in can happen. The marker is your roll rate; keep it left of the red 40 % line.'], doc: 'roll' },
      build(v, out) {
        const fN = out.o.f, top = Math.max(1.4 * fN, 1.1 * v.fR), pts = [[fN, NaN]];
        for (let i = 0; i <= 280; i++) { const x = (top * i) / 280, r = x / fN; pts.push([x, Math.abs(1 / (1 - r * r))]); }
        pts.sort((a, b) => a[0] - b[0]);
        const r = out.rc.ratio;
        return { x: { label: 'Roll rate $f_R$', unit: '\\mathrm{Hz}' }, y: { label: 'Response factor' }, xDomain: [0, top], yDomain: [0, 5],
          series: [{ name: 'response $\\lambda_P^2/|\\lambda_P^2-\\lambda_R^2|$', points: pts }],
          vlines: [{ x: TARGET * fN, label: '30 % target', color: 'var(--text-3)' }, { x: LIMIT * fN, label: '40 %: unsafe beyond', color: 'var(--danger)', row: 1 }, { x: fN, label: 'pitch frequency: lock-in', color: 'var(--danger)', row: 2 }],
          markers: [{ x: v.fR, y: Math.min(4.8, Math.abs(1 / (1 - r * r))), label: 'your roll rate' }] };
      },
    },
    {
      id: 'speed', title: 'Pitch frequency through the flight: where your roll sits', wide: true,
      info: { text: ['The pitch frequency rises in proportion to airspeed ($f_N=U/L$, at the density you gave), with 30 % and 40 % of it.', 'Your roll rate at your speed is the marker: below the grey line is safe, above the red line unsafe. Off the rail, at low speed, the pitch frequency is low too: a fixed roll rate is closer to resonance early in the boost.'], doc: 'frequency' },
      build(v, out, { U }) {
        const us = U(SPEED), top = Math.max(2 * v.U, 100), A = [], B = [], C = [];
        for (let i = 0; i <= 40; i++) { const u = (top * i) / 40, f = u / out.o.L; A.push([us.v(u), f]); B.push([us.v(u), TARGET * f]); C.push([us.v(u), LIMIT * f]); }
        return { x: { label: 'Airspeed $U$', unit: us.label }, y: { label: 'Frequency', unit: '\\mathrm{Hz}' }, includeZero: true,
          series: [{ name: 'pitch $f_N$', points: A }, { name: '30 % of $f_N$', points: B, dash: '6 4', color: 'var(--text-3)' }, { name: '40 % of $f_N$', points: C, dash: '2 3', color: 'var(--danger)' }],
          markers: [{ x: us.v(v.U), y: out.o.f, label: 'pitch at your speed' }, { x: us.v(v.U), y: v.fR, label: 'your roll rate' }] };
      },
    },
    {
      id: 'margin', title: 'Wavelength vs static margin', explore: true,
      info: { text: ['Wavelength against the static margin for the same rocket. More margin makes a stiffer rocket with a shorter wavelength, falling as the inverse square root of the margin; it also raises the pitch frequency, leaving more room for roll.'], doc: 'model' },
      build(v, out, { U }) {
        const p = out.p, ud = U(DIST), CNa = v.cmMode === 'margin' ? v.CNa : -p.Cma / 2, pts = [];
        for (let i = 0; i <= 100; i++) { const SM = 0.5 + (5.5 * i) / 100; pts.push([SM, ud.v(pitchWave({ ...p, Cma: cmAlpha(CNa, SM) }).L)]); }
        return { x: { label: 'Static margin (calibres)' }, y: { label: 'Wavelength $L$', unit: ud.label }, includeZero: true, series: [{ name: '$L$', points: pts, smooth: true }],
          markers: [{ x: -p.Cma / CNa, y: ud.v(out.o.L), label: 'your rocket' }] };
      },
    },
    {
      id: 'altitude', title: 'Wavelength vs altitude', explore: true,
      info: { text: ['Wavelength in the standard atmosphere as the air thins with altitude. It grows as the inverse square root of density, so a coasting rocket weathercocks more and more slowly.'], doc: 'frequency' },
      build(v, out, { U }) {
        const p = out.p, ud = U(DIST), ua = U(ALT), pts = [];
        for (let i = 0; i <= 80; i++) { const h = (100000 * i) / 80; pts.push([ua.v(h), ud.v(pitchWave({ ...p, rho: rhoAt(h) }).L)]); }
        return { x: { label: 'Altitude', unit: ua.label }, y: { label: 'Wavelength $L$', unit: ud.label }, includeZero: true, series: [{ name: '$L$', points: pts, smooth: true }],
          markers: byAlt(v) && v.h <= 100000 ? [{ x: ua.v(v.h), y: ud.v(out.o.L), label: 'your altitude' }] : [] };
      },
    },
  ],
  schematicTitle: 'The wobble along the flight path',
  schematicHint: 'Top: the flight path to scale — the rail, then the nose swinging up and down once every wavelength (angle exaggerated, rockets enlarged), and a dot for each roll turn, coloured by the verdict. Drag the rail end or the first roll dot. Bottom: the rocket to scale with its CG, CP and the restoring push; drag the CP to change the static margin, or the body edge to change the radius',
  schematic(ctx, v, out) {
    const W = 800, H = 470, o = out.o, rc = out.rc, col = COL[out.lv];
    const fr = ctx.frame({ width: W, height: H, label: 'Flight path with the pitch wobble, roll turns and the rail, to scale; and the rocket with its CG, CP and restoring moment' });
    const g = fr.layer('main'); g.replaceChildren();
    const ud = ctx.U(DIST), ul = ctx.U(LEN), D = (x, d = 3) => `${fmt(ud.v(x), { digits: d })} ${ud.label}`;
    // ---- top: the flight path, to scale in distance ----
    const L = o.L, rail = v.railL, LR = v.fR > 0 ? rc.LamR : Infinity;
    const want = Math.max(2.2 * L, rail + 1.3 * L, Number.isFinite(LR) ? Math.min(rail + 1.08 * LR, rail + 6 * L) : 0);
    const span = nice(ud.v(want)) / ud.v(1);
    const x0 = 110, x1 = 760, yc = 104, A = 28, X = (sm) => x0 + (sm / span) * (x1 - x0);
    const att = (sm) => (sm <= rail ? 0 : Math.sin((2 * Math.PI * (sm - rail)) / L)), Y = (sm) => yc - A * att(sm);
    g.append(s('line', { x1: x0, x2: x1, y1: yc, y2: yc, class: 'sc-axis' }));
    const wave = []; for (let i = 0; i <= 600; i++) { const sm = (span * i) / 600; wave.push([X(sm), Y(sm)]); }
    g.append(s('path', { d: path(wave), class: 'sc-line', 'data-field': 'SM CNa Cma m I h rho R Lr' }));
    g.append(text(x1, yc - A - 8, 'nose angle α (exaggerated)', { anchor: 'end', size: 10, cls: 'sc-dim-text' }));
    // the rail, to scale
    g.append(s('line', { x1: X(0), x2: Math.max(X(rail), X(0) + 2), y1: yc + 2, y2: yc + 2, stroke: 'var(--text-2)', 'stroke-width': 5, 'data-field': 'railL' }));
    g.append(text(X(0) - 8, yc + 4, `rail ${D(rail)}`, { anchor: 'end', size: 10.5, field: 'railL' }));
    // enlarged rockets at the first nose-up and nose-down peaks
    const Lpx = X(L) - X(0), Lp = Math.min(34, 0.3 * Lpx), sizes = [[0.25, 'nose up', -1], [0.75, 'nose down', 1]];
    for (const [k, lab, side] of sizes) {
      const sm = rail + k * L, x = X(sm), y = Y(sm), ang = (-att(sm) * 14);
      g.append(s('g', { transform: `rotate(${ang} ${x} ${y}) translate(${-Lp / 2} 0)` }, s('path', { d: rocketPath(x, y, Lp, Math.max(1.5, Lp / 14)), class: 'sc-body-2' })));
      g.append(text(x, side < 0 ? y - 12 : y + 20, lab, { anchor: 'middle', size: 9.5, cls: 'sc-dim-text' }));
    }
    g.append(s('path', { d: `M${x1 - 34},${yc + 18}h30`, class: 'sc-accent', 'marker-end': fr.arrow('acc') }));
    g.append(text(x1 - 40, yc + 22, 'flight', { anchor: 'end', size: 10, cls: 'sc-dim-text' }));
    g.append(dim(fr, X(rail), 168, X(rail + L), 168, `L = ${D(L)} = ${fmt(o.Lrel, { digits: 3 })}\\,\\ell · one wobble in ${fmt(o.P, { digits: 3 })} s`, { textOff: 15, field: 'SM CNa Cma m I h rho' }));
    // roll turns: a dot every Λ_R along the path, coloured by the verdict
    const yR = 34;
    if (Number.isFinite(LR)) {
      const n = Math.min(60, Math.floor((span - rail) / LR));
      for (let k = 1; k <= n; k++) { const sm = rail + k * LR; g.append(s('circle', { cx: X(sm), cy: Y(sm), r: 4.5, fill: col, stroke: 'var(--surface)', 'stroke-width': 1.5, 'data-field': 'fR U' })); }
      const end = Math.min(rail + LR, span);
      g.append(dim(fr, X(rail), yR, X(end), yR, null, { field: 'fR U' }));
      const lab = `${rail + LR > span ? '→ ' : ''}one roll turn every ${D(LR)} · roll ${pct(rc.ratio)} of pitch`;
      g.append(text(Math.min(X(rail) + 6, x1 - 300), yR - 8, lab, { size: 11, field: 'fR U' }));
      g.lastChild.style.fill = col;
      if (n >= 1) ctx.handle('roll', X(rail + LR), Y(rail + LR), {
        field: 'fR', title: 'Drag along the path to change the roll rate',
        onDrag: (px) => ctx.setValue('fR', Math.min(100, v.U / Math.max(span / 400, ((Math.max(x0, Math.min(x1, px)) - x0) / (x1 - x0)) * span - rail)), { round: 0.01 }),
        onKey: (dx) => ctx.setValue('fR', Math.max(0, v.fR * (1 + 0.05 * dx)), { round: 0.01 }),
      });
    } else g.append(text(X(rail) + 6, yR - 8, 'not rolling (no roll dots)', { size: 11, field: 'fR' }));
    ctx.handle('rail', Math.max(X(rail), X(0) + 2), yc + 2, {
      field: 'railL', title: 'Drag to change the rail length',
      onDrag: (px) => ctx.setValue('railL', Math.max(0, Math.min(100, ((px - x0) / (x1 - x0)) * span)), { round: 0.1 }),
      onKey: (dx) => ctx.setValue('railL', Math.max(0, v.railL + 0.1 * dx), { round: 0.1 }),
    });
    // distance scale
    const ya = 200;
    g.append(s('line', { x1: x0, x2: x1, y1: ya, y2: ya, class: 'sc-thin' }));
    for (let i = 0; i <= 5; i++) {
      const x = x0 + ((x1 - x0) * i) / 5;
      g.append(s('line', { x1: x, x2: x, y1: ya - 4, y2: ya + 4, class: 'sc-thin' }));
      g.append(text(x, ya + 16, fmt(ud.v((span * i) / 5), { digits: 4 }), { anchor: 'middle', size: 10, cls: 'sc-dim-text' }));
    }
    g.append(text(x0 - 8, ya + 4, `distance (${ud.label})`, { anchor: 'end', size: 10, cls: 'sc-dim-text' }));
    // ---- bottom: the rocket to scale with CG, CP and the restoring moment ----
    const lp = 500, xb = 130, k = lp / v.Lr, rr = Math.max(3, Math.min(34, v.R * k)), yr = 300;
    g.append(s('path', { d: rocketPath(xb, yr, lp, rr), class: 'sc-body', 'data-field': 'R Lr' }));
    const xcg = xb + 0.4 * lp;
    const xcp = byMargin(v) ? Math.max(xb + 4, xcg - v.SM * 2 * v.R * k) : null;
    g.append(pointMarker(xcg, yr, null, { kind: 'cg', field: 'm I' }));
    g.append(text(xcg, yr - rr - 8, 'CG', { anchor: 'middle', size: 11, field: 'm I' }));
    // air meets the nose at angle α from below; the normal force at the CP pushes the tail up and the nose back down
    for (const dy of [-10, 6, 22]) g.append(s('path', { d: `M${xb + lp + 112},${yr + dy + 16}L${xb + lp + 30},${yr + dy}`, class: 'sc-thin', 'marker-end': fr.arrow() }));
    g.append(text(xb + lp + 72, yr - rr - 12, 'air at angle α', { anchor: 'middle', size: 10, cls: 'sc-dim-text' }));
    const xN = xcp ?? xb + 0.12 * lp, yTop = yr - 2.6 * rr - 6;
    g.append(s('path', { d: `M${xN},${yTop}v-38`, class: 'sc-accent', 'marker-end': fr.arrow('acc'), 'data-field': 'SM CNa Cma' }));
    g.append(text(xN + 6, yTop - 30, `normal force at ${xcp != null ? 'the CP' : 'the fins'}`, { size: 10.5, field: 'SM CNa Cma' }));
    const ax = xcg + 70;
    g.append(s('path', { d: `M${ax},${yr - rr - 30}A72,72 0 0 1 ${ax},${yr + rr + 30}`, class: 'sc-accent', fill: 'none', 'marker-end': fr.arrow('acc'), opacity: 0.85 }));
    g.append(text(ax + 4, yr - rr - 34, 'restoring moment turns the nose back', { size: 10.5, cls: 'sc-dim-text' }));
    const yd = yr + 2.6 * rr + 18;
    if (xcp != null) {
      g.append(pointMarker(xcp, yr, null, { kind: 'cp', field: 'SM' }));
      g.append(text(xcp - 12, yr - rr - 8, 'CP', { anchor: 'end', size: 11, field: 'SM' }));
      g.append(dim(fr, xcp, yd, xcg, yd, `${fmt(v.SM, { digits: 3 })} cal`, { textOff: 14, field: 'SM' }));
      ctx.handle('cp', xcp, yr, {
        field: 'SM', title: 'Drag to change the static margin',
        onDrag: (sx) => ctx.setValue('SM', Math.max(0.05, Math.min(20, (xcg - sx) / (2 * v.R * k))), { round: 0.05 }),
        onKey: (dx) => ctx.setValue('SM', Math.max(0.05, v.SM - 0.05 * dx), { round: 0.05 }),
      });
    }
    g.append(dim(fr, xb, yd + 30, xb + lp, yd + 30, `\\ell = ${fmt(ul.v(v.Lr), { digits: 4 })} ${ul.label}`, { textOff: 14, field: 'Lr' }));
    g.append(dim(fr, xb - 30, yr + rr, xb - 30, yr - rr, null, { field: 'R' }));
    g.append(text(xb - 38, yr + 4, `d = ${fmt(ul.v(2 * v.R), { digits: 4 })} ${ul.label}`, { anchor: 'end', size: 11, field: 'R' }));
    ctx.handle('radius', xb + 0.62 * lp, yr - rr, {
      field: 'R', title: 'Drag up or down to change the body radius',
      onDrag: (px, py) => ctx.setValue('R', Math.max(0.1, Math.min(60, (yr - py) / k)), { round: 0.01 }),
      onKey: (dx, dy) => ctx.setValue('R', Math.max(0.1, v.R * (1 + 0.02 * dy)), { round: 0.01 }),
    });
    g.append(text(16, H - 8, `Top: distance to scale; angle exaggerated, rockets enlarged. Bottom: to scale${rr !== v.R * k ? ' (radius clamped)' : ''}; CG assumed at 60 % of the length from the nose.`, { size: 10, cls: 'sc-dim-text' }));
  },
  symbols: {
    I: 'pitch moment of inertia about the CG (kg m² or slug ft²)', L: 'pitch/yaw wavelength (m or ft)', '\\ell': 'overall length of the rocket (m or ft)', t: 'time (s)', '\\rho': 'air density (kg/m³ or slug/ft³)',
    S: 'reference area, the body cross-section (m² or ft²)', d: 'reference length, the body diameter (m or ft)', U: 'airspeed (m/s or ft/s)', 'C_{M\\alpha}': 'slope of the pitching-moment coefficient about the CG (per rad)',
    '\\alpha': 'angle of attack (rad)', '\\omega_N': 'pitch natural circular frequency (rad/s)', P: 'pitch period (s)', '\\lambda_p': 'pitch/yaw wave number (rad/m or rad/ft)', '\\lambda_P': 'pitch/yaw wave number (rad/m or rad/ft)', f_N: 'pitch natural frequency (Hz)',
    'C_{N\\alpha}': 'slope of the normal-force coefficient (per rad)', 'X_{CP}': 'centre-of-pressure station (m or ft)', 'X_{CG}': 'centre-of-gravity station (m or ft)',
    m: 'mass of the rocket (kg or slug)', R: 'body radius (m or ft)', q: 'dynamic pressure (Pa or lbf/ft²)', f_R: 'roll rate (turns per second, Hz)', '\\lambda_R': 'roll wave number (rad/m or rad/ft)', '\\Lambda_R': 'distance flown per roll turn (m or ft)',
    'f_{R,max}': 'roll rate at 30 % of the pitch frequency (Hz)', L_r: 'launch rail length (m or ft)', 'L_{sim}': 'rail length a point-mass simulation needs (m or ft)', h: 'altitude above sea level (m or ft)',
    '\\Delta L(\\lambda_P,L_r)': 'extra rail length that matches the turn into the wind (Hoult 1976)',
    '\\rho(h)': 'standard-atmosphere density at height $h$',
  },
  report(v, out, R) {
    const o = out.o, p = out.p, rc = out.rc, n = R.n, Q2 = R.Q;
    const steps = [];
    steps.push({ label: 'Reference length and area', lhs: 'd', eq: '2R', sub: `2\\times${R.v(v.R, LEN)}`, res: Q2(2 * v.R, LEN) });
    steps.push({ lhs: 'S', eq: '\\frac{\\pi d^2}{4}', sub: `\\frac{\\pi\\times(${R.v(p.d, DIST)})^2}{4}`, res: `${n(R.raw(o.S, { dim: 'area', internal: 'm2' }))}\\,${R.u({ dim: 'area' })}` });
    if (v.cmMode === 'margin') steps.push({ label: 'Pitching-moment slope about the CG', lhs: 'C_{M\\alpha}', eq: '-C_{N\\alpha}\\frac{X_{CP}-X_{CG}}{d}', sub: `-${n(v.CNa)}\\times${n(v.SM)}`, res: `${n(p.Cma)}\\,\\mathrm{rad^{-1}}` });
    if (v.iMode === 'rod') steps.push({ label: 'Pitch inertia estimated as a uniform slender rod', lhs: 'I', eq: '\\frac{m\\ell^2}{12}', sub: `\\frac{${R.v(v.m, MASS)}\\times(${R.v(p.l, DIST)})^2}{12}`, res: Q2(p.I, INERTIA) });
    if (byAlt(v)) steps.push({ label: 'Air density, standard atmosphere', lhs: '\\rho', eq: '\\rho(h)', sub: `h=${R.v(v.h, ALT)}`, res: Q2(p.rho, DENS) });
    // substitute in consistent base units: m, kg (SI) or ft, slug (US)
    const [lu, mu] = R.us ? [0.3048, 14.5939029] : [1, 1];
    const bI = p.I / (mu * lu * lu), bRho = (p.rho * lu ** 3) / mu, bS = o.S / (lu * lu), bd = p.d / lu;
    steps.push({ label: `Pitch/yaw wavelength (substituted in ${R.us ? 'ft and slug' : 'm and kg'})`, lhs: 'L', eq: '2\\pi\\sqrt{\\frac{2I}{-\\rho S d\\,C_{M\\alpha}}}',
      sub: `2\\pi\\sqrt{\\frac{2\\times${n(bI)}}{${n(bRho)}\\times${n(bS)}\\times${n(bd)}\\times${n(-p.Cma)}}}`, res: Q2(o.L, DIST) });
    steps.push({ label: 'Wave number', lhs: '\\lambda_P', eq: '\\frac{2\\pi}{L}', sub: `\\frac{2\\pi}{${R.v(o.L, DIST)}}`, res: Q2(o.lam, WAVE) });
    steps.push({ label: 'Natural frequency and period at the chosen airspeed', lhs: 'f_N', eq: '\\frac{U}{L}', sub: `\\frac{${R.v(v.U, SPEED)}}{${R.v(o.L, DIST)}}`, res: `${n(o.f)}\\,\\mathrm{Hz}` });
    steps.push({ lhs: 'P', eq: '\\frac{L}{U}', res: `${n(o.P)}\\,\\mathrm{s}` });
    steps.push({ label: 'Roll against pitch (Hoult, fin setting theory)', lhs: '\\frac{\\lambda_R}{\\lambda_P}', eq: '\\frac{f_R}{f_N}', sub: `\\frac{${n(v.fR)}}{${n(o.f)}}`, res: n(rc.ratio) });
    if (rc.ratio < 1) steps.push({ label: 'Misalignment response factor', lhs: '\\frac{\\lambda_P^2}{\\lambda_P^2-\\lambda_R^2}', eq: '\\frac{1}{1-(f_R/f_N)^2}', sub: `\\frac{1}{1-${n(rc.ratio)}^2}`, res: n(rc.amp) });
    steps.push({ label: 'Rail a point-mass simulation needs (Hoult, 1976)', lhs: 'L_{sim}', eq: '\\frac{0.140365}{\\lambda_P}\\exp\\left(\\sqrt{2\\pi\\lambda_PL_r}-0.387621(\\lambda_PL_r)^{1.2}\\right)', sub: `\\lambda_PL_r=${n(o.lam * v.railL)}`, res: Q2(out.results.Lsim, DIST) });
    return [{
      title: 'Theory',
      text: 'A rocket free to pitch about its centre of gravity obeys $I\\,d^2\\alpha/dt^2=\\tfrac12\\rho S d\\,U^2C_{M\\alpha}\\alpha$. With $\\alpha=\\sin\\omega_N t$ this gives $\\omega_N^2=-\\rho S d\\,U^2C_{M\\alpha}/2I$. In one period $P=2\\pi/\\omega_N$ the rocket moves the wavelength $L=UP=2\\pi\\sqrt{2I/(-\\rho S d\\,C_{M\\alpha})}$, which does not depend on speed (Hoult, pitch-yaw wave number). Body-fixed misalignments on a rolling rocket produce a response proportional to $\\lambda_P^2/(\\lambda_P^2-\\lambda_R^2)$; Hoult keeps $\\lambda_R$ below 30–40 % of $\\lambda_P$ (fin setting theory).',
      steps,
    }];
  },
  references: ['the-pitch-yaw-wave-number3', 'fin-setting-theory-3', 'launcher-length-for-sounding-rocket-point-mass-traj-sim-orig'],
  examples: [
    { name: 'Student rocket (6 in body, 3.8 m, 25 kg), 0.3 Hz roll at 200 m/s', values: { R: 3.07, Lr: 148, cmMode: 'margin', CNa: 10, SM: 2, iMode: 'rod', m: 25, atmMode: 'alt', h: 0, U: 200, fR: 0.3, railL: 6 } },
    { name: 'Same rocket, measured inertia 18 kg m², burnout at 1500 m', values: { R: 3.07, Lr: 148, cmMode: 'margin', CNa: 10, SM: 2, iMode: 'measured', I: 18, atmMode: 'alt', h: 4921, U: 200, fR: 0.3, railL: 6 } },
    { name: 'Small rocket (4 in, 1.5 m, 4 kg) spinning at 1.2 Hz — too fast', values: { R: 2, Lr: 60, cmMode: 'margin', CNa: 9, SM: 1.8, iMode: 'rod', m: 4, atmMode: 'alt', h: 0, U: 150, fR: 1.2, railL: 3 } },
  ],
};
