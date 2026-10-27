// Tethered Pilot-Balloon Wind Sensor — UI definition.
import { pibal, windSpeed, bias } from '../calc/pibal.js';
import { density } from '../calc/recovery.js';
import { s, fmt, InputError } from '../util.js';
import { text, path } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const DIST = { dim: 'distance', internal: 'ft' };
const ALT = { dim: 'altitude', internal: 'ft' };
const SPEED = { dim: 'speed', internal: 'fts' };
const FORCE = { dim: 'force', internal: 'lbf' };
const SMALL = { dim: 'smallMass', internal: 'lbm' };
const DENS = { dim: 'density', internal: 'slugft3' };
const MATD = { dim: 'matDensity', internal: 'gcm3' };
const TEMP = { dim: 'temperature', internal: 'K' };
const PRES = { dim: 'pressure', internal: 'Pa', units: { si: 'kPa', us: 'psi' } };
const LEN = { dim: 'length', internal: 'in' };
const RAD = Math.PI / 180, GCM3 = 1.9403203;   // g/cm³ → slug/ft³
// a value in the reader's unit, for result notes
const inUnits = (x, spec) => `${fmt(toDisplay(x, spec), { digits: 3 })} ${unitLabel(displayUnit(spec))}`;
// verdict (DECISIONS D40): below 15° elevation the reading is double-valued (CSULB p. 6) → unsafe; the angle-reading
// uncertainty and the tether correction are judged against your limits → marginal
const THETA_MIN = 15, MU = 3.737e-7;   // air viscosity at 15 °C, slug/(ft·s), for the balloon Reynolds number
const RE_CRISIS = 3e5;                 // sphere drag crisis (Hoerner; CSULB Fig. 1)
const ST = { safe: 'ok', marginal: 'warn', unsafe: 'err' };
const COL = { safe: 'var(--ok)', marginal: 'var(--warn)', unsafe: 'var(--danger)' };
/** Relative wind-speed error from an elevation error dΘ (deg): V ∝ √cot Θ ⇒ dV/V = dΘ / sin 2Θ. */
export const angleError = (theta, dTh) => (dTh * RAD) / Math.sin(2 * theta * RAD);
/** Bisection for x in [lo, hi] with f(x) = 0, f monotonic. */
function solve(f, lo, hi) {
  let flo = f(lo); if (flo * f(hi) > 0) return null;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2, fm = f(m); if (fm * flo > 0) { lo = m; flo = fm; } else hi = m; }
  return (lo + hi) / 2;
}
/** Elevation angle (deg) the same raw wind V would give a balloon of diameter D (tether ignored, eq. 1 inverted). */
function thetaFor(v, D, V) {
  const o = pibal(model(v, { D }));
  if (o.sinks) return 0;
  return Math.atan(o.lift / (0.5 * model(v).rho * V * V * v.CD * o.S)) / RAD;
}

/** Model inputs (ft, lbf, slug/ft³, Pa, K) and the air density at the balloon (standard troposphere at site + height). */
function model(v, over = {}) {
  const w = { ...v, ...over }, h = w.L * Math.sin(w.theta * RAD);
  return { D: w.D, We: w.We, CD: w.CD, gas: w.gas, pG: w.pG, TG: w.TG, dt: w.dt / 12, rhoT: w.rhoT * GCM3, Cd: w.Cd, L: w.L, theta: w.theta, az: w.az, rho: density(w.hG + h) };
}

const DEF = {
  slug: 'tethered-pibal',
  topic: 'wind-measurement',
  title: 'Tethered Balloon Wind Sensor',
  verdict: true,
  tiers: true,
  subtitle: 'Wind speed from the <b>lean of a tethered helium balloon</b>, corrected for the sag and drag of its tether.',
  intro: {
    what: 'Turns the elevation angle of a tethered pilot balloon, seen from its winch, into the wind speed at the balloon, corrects it for tether sag and drag, and resolves it into north and east components for a trajectory simulation.',
    why: 'Low-level winds near the launcher matter most for wind compensation, and forecasts do not give them. A tethered balloon and a pocket elevation sensor measure them cheaply on the launch site up to a few hundred metres.',
    when: 'On launch day, before setting the launcher, to measure the winds below about 1 km; higher winds come from the forecast winds aloft.',
  },
  info: {
    text: [
      'The balloon’s net lift pulls up and the wind’s drag pulls it downwind; it settles where the tether lines up with their resultant, so the elevation angle of the tether measures the ratio of lift to drag.',
      'Gravity sags the tether and the wind bows it downwind, so the angle measured at the winch is a little steeper than at the balloon; a small correction removes this bias.',
    ],
    tex: 'V=\\sqrt{\\frac{2(B-W)\\cot\\Theta}{\\rho C_DS}},\\qquad V_c=V\\sqrt{1-\\frac{W_T+C_d\\rho rdV^2\\tan\\Theta\\sin\\Theta}{2(B-W)}}',
    steps: ['Describe the balloon and how it was filled.', 'Describe the tether.', 'Enter the tether length paid out, the elevation angle and the balloon’s azimuth.', 'Set how accurately you read the angle and how much error and tether correction you accept.', 'Read the verdict on the reading, the corrected wind speed and its components.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'balloon', title: 'Balloon',
      fields: [
        { id: 'D', label: 'Inflated diameter', sym: 'D', ...DIST, default: 3, min: 0, minExclusive: true, max: 20, slider: { min: 1, max: 6, step: 0.1 },
          info: { text: ['Diameter of the inflated balloon. Inflate it through a hoop or template so it is the same every time.', 'A bigger balloon has more lift for its drag, so it stands higher in the same wind.', 'Choose it so the expected winds give angles between about 20° and 70°: the verdict solves the diameter when the angle is outside your limits. CSULB chose 3 ft (radius 1.5 ft) for winds up to 20–25 ft/s.'], tex: 'B=\\rho g\\frac{\\pi D^3}{6}', range: '2–4 ft (0.6–1.2 m) for launch-site winds; 3 ft (0.9 m) is the CSULB choice.', doc: 'balance' } },
        { id: 'We', label: 'Empty balloon mass', sym: 'W_e', ...SMALL, default: 0.223, min: 0, max: 2, slider: { min: 0.02, max: 0.6, step: 0.001 },
          info: { text: ['Mass of the balloon skin, its tie and the tether clip, weighed before filling.', 'It is subtracted from the buoyancy with the gas weight to give the net lift.', 'A lighter skin gives more net lift, so the balloon stands higher in the same wind.'], range: 'About 0.2 lb (100 g) for a 3 ft latex balloon.', doc: 'balance', tex: 'W=W_e+W_g' } },
        { id: 'CD', label: 'Balloon drag coefficient', sym: 'C_D', dim: 'none', default: 0.47, min: 0, minExclusive: true, max: 2, slider: { min: 0.1, max: 0.8, step: 0.01 },
          info: { text: ['Drag of the sphere divided by the dynamic pressure and its frontal area.', 'From sphere drag data: about 0.47 while the boundary layer stays laminar.', 'Past the drag crisis (Reynolds number about 3×10⁵) it falls sharply and the reading becomes ambiguous; the calculator warns when you get close.'], tex: 'V=\\sqrt{\\frac{2(B-W)\\cot\\Theta}{\\rho C_DS}}', range: 'About 0.47 below the drag crisis, falling towards 0.1–0.2 above it (Hoerner).', doc: 'balance' } },
        { id: 'gas', label: 'Lifting gas', kind: 'select', default: 'helium', options: [{ value: 'helium', label: 'Helium' }, { value: 'hydrogen', label: 'Hydrogen' }],
          info: { text: ['The gas in the balloon: helium (safe) or hydrogen (lighter but flammable).', 'Its weight is worked out from the filling pressure and temperature.', 'Hydrogen gives about 8 % more net lift for the same balloon.'], doc: 'balance' } },
        { id: 'TG', label: 'Gas temperature at filling', sym: 'T_G', ...TEMP, default: 290.93, min: 150, max: 350, slider: { min: 250, max: 320, step: 0.5 },
          info: { text: ['Temperature of the gas when the balloon was filled; take the air temperature on site.', 'With the pressure it fixes how much gas (and gas weight) the balloon holds.', 'Warmer gas is lighter, so the lift rises slightly.'], tex: 'W_g=\\frac{p_G}{R_gT_G}g\\frac{\\pi D^3}{6}', range: '−10 to 40 °C on a launch site.', doc: 'balance' } },
        { id: 'pG', label: 'Air pressure at filling', sym: 'p_G', ...PRES, default: 87080, min: 1000, max: 110000, slider: { min: 60000, max: 105000, step: 10 },
          info: { text: ['Barometric pressure on the launch site when filling (a phone barometer or the weather report for your elevation, not sea-level pressure).', 'A filled balloon is at about the outside pressure, so this sets the mass of gas inside.', 'Higher sites have thinner air: less buoyancy and less gas weight.'], range: '101 kPa at sea level; about 87 kPa at 4000 ft (1.2 km).', doc: 'balance', tex: 'W_g=\\frac{p_G}{R_gT_G}\\,g\\,\\frac{\\pi D^3}{6}' } },
      ],
    },
    {
      id: 'tether', title: 'Tether',
      fields: [
        { id: 'dt', label: 'Tether diameter', sym: 'd_t', ...LEN, default: 0.011, min: 0, minExclusive: true, max: 0.25, slider: { min: 0.004, max: 0.06, step: 0.001 },
          info: { text: ['Diameter of the tether line (from its datasheet, or measure 10 turns on a pencil and divide by 10).', 'A thicker line weighs more and catches more wind, so it sags and bows more.', 'Both make the angle at the winch steeper than at the balloon; the bias correction grows with the diameter.'], range: 'Braided UHMW polyethylene (Spectra) of 0.011 in (0.28 mm) holds about 50 lb.', doc: 'bias', tex: 'c=\\frac{C_d\\rho rdV^2\\tan\\Theta\\sin\\Theta}{2(B-W)},\\quad r=\\frac{d_t}{2}' } },
        { id: 'rhoT', label: 'Tether material density', sym: '\\rho_T', ...MATD, default: 0.967, min: 0, minExclusive: true, max: 10, slider: { min: 0.8, max: 2, step: 0.01 },
          info: { text: ['Density of the tether material.', 'With the diameter and length it gives the tether weight.', 'A denser line sags more; UHMW polyethylene floats at about 0.97 g/cm³.'], range: 'UHMW polyethylene 0.97, nylon 1.14, polyester 1.38 g/cm³.', doc: 'bias', tex: 'W_T=\\rho_T\\,g\\,\\frac{\\pi d_t^2}{4}\\,d' } },
        { id: 'Cd', label: 'Tether cross-flow drag coefficient', sym: 'C_d', dim: 'none', default: 1.92, min: 0, max: 4, slider: { min: 1, max: 2.5, step: 0.01 },
          info: { text: ['Drag of the line across the flow per unit length, divided by dynamic pressure and diameter.', 'About 1.9 at the very low Reynolds numbers (≈ 50) of a thin line (Hoult’s memo).', 'More line drag bows the tether downwind and raises the bias.'], range: 'About 1.9 for a thin line in light wind; 1.2 for thicker cord.', doc: 'bias', tex: 'c=\\frac{C_d\\rho rdV^2\\tan\\Theta\\sin\\Theta}{2(B-W)}' } },
      ],
    },
    {
      id: 'reading', title: 'Reading',
      fields: [
        { id: 'L', label: 'Tether paid out', sym: 'd', ...DIST, default: 158, min: 0, minExclusive: true, max: 5000, slider: { min: 20, max: 1500, step: 1 },
          info: { text: ['Length of tether between the winch and the balloon (from the winch odometer or marks on the line).', 'With the angle it sets the height of the balloon, so the height of the wind you measure.', 'More line means more sag and drag: the verdict gives the longest line within your correction limit.'], tex: 'h=d\\sin\\Theta', range: '50–1500 ft (15–450 m).', doc: 'bias' } },
        { id: 'theta', label: 'Elevation angle', sym: '\\Theta', dim: 'angle', default: 50, min: 1, max: 89, slider: { min: 5, max: 85, step: 0.5 },
          info: { text: ['Elevation of the balloon above the horizon, seen from the winch (inclinometer, sextant or a phone app sighting along the line).', 'The tether lines up with the resultant of lift and drag, so the angle measures their ratio: lower angle, stronger wind.', 'Below about 15° the reading is ambiguous (CSULB); near 90° a small angle error gives a large speed error.'], tex: 'V=\\sqrt{\\frac{2(B-W)\\cot\\Theta}{\\rho C_DS}}', range: '20–70° for a good reading.', doc: 'balance' } },
        { id: 'az', label: 'Balloon azimuth', sym: '\\psi', dim: 'angle', default: 40, min: 0, max: 360, slider: { min: 0, max: 360, step: 1 },
          info: { text: ['Bearing of the balloon from the winch, clockwise from true north (correct a magnetic compass for declination).', 'The balloon sits downwind, so this is the direction the wind blows towards.', 'It splits the speed into north and east components for a trajectory simulation.'], tex: 'V_N=V_c\\cos\\psi,\\ V_E=V_c\\sin\\psi', range: '0–360°.', doc: 'components' } },
        { id: 'hG', label: 'Launch site elevation', sym: 'h_G', ...ALT, default: 4078, min: 0, max: 30000, slider: { min: 0, max: 10000, step: 10 },
          info: { text: ['Elevation of the winch above sea level.', 'The air density at the balloon comes from the standard atmosphere at this elevation plus the balloon height.', 'Thinner air means less drag for the same wind, so the same angle means a faster wind.'], range: 'Sea level to about 5000 ft (1.5 km) for most launch sites.', doc: 'balance', tex: '\\rho=\\rho_{std}(h_G+h)' } },
      ],
    },
    {
      id: 'limits', title: 'Your limits',
      fields: [
        { id: 'dTh', label: 'Angle reading accuracy', sym: '\\delta\\Theta', dim: 'angle', default: 1, min: 0.05, max: 10, slider: { min: 0.1, max: 5, step: 0.1 },
          info: { text: ['How accurately you can read the elevation angle (±), including the balloon bobbing in gusts.', 'A phone inclinometer is good to about ±1°; a sighting tube with a protractor ±2–3°.', 'The wind error it causes is smallest at 45° and grows towards 0° and 90°.'], tex: '\\frac{\\delta V}{V}=\\frac{\\delta\\Theta}{\\sin2\\Theta}', range: '±0.5–3°.', doc: 'verdict' } },
        { id: 'errMax', label: 'Largest wind error you accept', sym: 'e_{max}', dim: 'percent', internal: 'pct', default: 10, min: 1, max: 50, slider: { min: 2, max: 30, step: 0.5 },
          info: { text: ['The largest wind-speed error, in percent, you accept from the angle reading.', 'It sets the band of elevation angles that give a good reading.', 'This site’s default is 10 %; a wind-compensation setting is no better than its wind.'], range: '5–15 %.', doc: 'verdict', tex: '\\frac{\\delta V}{V}=\\frac{\\delta\\Theta}{\\sin2\\Theta}\\le e_{max}' } },
        { id: 'corrMax', label: 'Largest tether correction you accept', sym: 'k_{max}', dim: 'percent', internal: 'pct', default: 10, min: 1, max: 50, slider: { min: 2, max: 30, step: 0.5 },
          info: { text: ['The largest tether bias correction, in percent of the speed, you are willing to rely on.', 'The correction is only first order (Hoult); the bigger it is, the less you should trust it. Hoult’s worked example quotes 5.4 % (about 7.5 % with eq. 5 as written; see the notes).', 'Beyond it the verdict gives the longest line to pay out.'], range: '5–15 %.', doc: 'verdict', tex: '1-\\sqrt{1-b-c}\\le k_{max}' } },
      ],
    },
  ],
  results: [
    { id: 'Vc', label: 'Wind speed (corrected)', sym: 'V_c', ...SPEED, key: true, digits: 4, status: (x, out) => ST[out.lv], note: (x, out) => `at ${inUnits(out.o.h, DIST)} · ± ${inUnits(out.err * out.o.Vc, SPEED)} from the angle`,
      info: { text: ['The wind speed at the balloon, after removing the tether bias.', 'From the force balance on the balloon (raw speed), times the tether correction.', 'Use it, with its height, as one wind layer in the Trajectory Simulation.'], tex: 'V_c=V\\sqrt{1-b-c}', doc: 'bias' } },
    { id: 'err', label: 'Wind error from the angle reading', sym: '\\delta V/V', dim: 'percent', internal: 'pct', key: true, digits: 3, status: (x, out) => (out.v.theta < THETA_MIN ? 'err' : x > out.v.errMax ? 'warn' : 'ok'),
      note: (x, out, v) => `you accept ${fmt(v.errMax, { digits: 3 })} %`,
      info: { text: ['How far off the wind speed can be because of the uncertainty in the angle you read.', 'From $V\\propto\\sqrt{\\cot\\Theta}$: smallest at 45°, growing towards both ends.', 'Below 15° the reading is ambiguous whatever your accuracy (CSULB).'], tex: '\\frac{\\delta V}{V}=\\frac{\\delta\\Theta}{\\sin2\\Theta}', doc: 'verdict' } },
    { id: 'corr', label: 'Tether bias correction', sym: '\\sqrt{1-b-c}', dim: 'none', key: true, digits: 4, status: (x, out, v) => ((1 - x) * 100 > v.corrMax ? 'warn' : 'ok'), note: (x, out, v) => `${fmt((1 - x) * 100, { digits: 3 })} % off the raw speed; you accept ${fmt(v.corrMax, { digits: 3 })} %`,
      info: { text: ['Factor on the raw wind speed that removes the bias from tether sag ($b$) and tether drag ($c$).', 'Both make the angle at the winch steeper than at the balloon, so the raw speed is too high (Hoult’s memo, eq. 5).', 'It is first order: the larger the correction, the less you should trust it.'], tex: '\\sqrt{1-b-c}', doc: 'bias' } },
    { id: 'h', label: 'Balloon height above the winch', sym: 'h', ...DIST, digits: 4,
      info: { text: ['How high above the winch the balloon is, so the height the wind was measured at.', 'Tether length times the sine of the angle (straight-line estimate).', 'Pay out more line to measure higher.'], tex: 'h=d\\sin\\Theta', doc: 'balance' } },
    { id: 'lift', label: 'Net lift', sym: 'B-W', ...FORCE, digits: 4,
      info: { text: ['Buoyancy of the balloon minus the weight of its skin and gas: what pulls it up against the wind.'], tex: 'B-W=B-W_e-W_g', doc: 'balance' } },
    { id: 'Dok', label: 'Balloon diameter for a good angle', sym: 'D_{ok}', ...DIST, digits: 3,
      info: { text: ['The balloon diameter that puts this wind just inside your good-angle band: 30° when the balloon is blown down, 60° when it stands too high (same skin, same gas).', 'Found by bisection: the elevation from the force balance rises with the diameter.', '“—” when your balloon is already inside the band.'], tex: '\\tan\\Theta=\\frac{B-W}{\\tfrac12\\rho V^2C_DS}', doc: 'verdict' } },
    { id: 'Lok', label: 'Longest tether within your correction limit', sym: 'd_{ok}', ...DIST, digits: 4,
      info: { text: ['The longest line you can pay out, at this angle and wind, with the tether correction still within your limit.', 'Found by bisection on the tether length.', 'Longer lines measure higher winds but sag and bow more.'], tex: '1-\\sqrt{1-b-c}=k_{max}', doc: 'verdict' } },
    { id: 'Re', label: 'Balloon Reynolds number', sym: 'Re', dim: 'none', digits: 3,
      info: { text: ['Wind speed times diameter over the kinematic viscosity of air (estimated at 15 °C).', 'Near 3×10⁵ the drag of a smooth sphere drops sharply (drag crisis); CSULB found its 3 ft balloon well-behaved up to about 30 ft/s, so this is shown as a note, not judged.'], tex: 'Re=\\frac{\\rho V D}{\\mu}', doc: 'verdict' } },
    { id: 'thBand', label: 'Good-angle band', sym: '\\Theta_{lo}–\\Theta_{hi}', dim: 'none', digits: 3, info: { text: ['The elevation angles that give a good reading: above 15° (CSULB) and with the angle error within your limit.'], tex: '\\sin2\\Theta_{lo}=\\frac{\\delta\\Theta}{e_{max}},\\quad \\Theta_{hi}=90^\\circ-\\Theta_{lo}', doc: 'verdict' } },
    { id: 'V', label: 'Wind speed (raw)', sym: 'V', ...SPEED, digits: 4, info: { text: ['The wind speed before the tether correction, from the straight-tether force balance.'], tex: 'V=\\sqrt{\\frac{2(B-W)\\cot\\Theta}{\\rho C_DS}}', doc: 'balance' } },
    { id: 'north', label: 'North component', sym: 'V_N', ...SPEED, digits: 4, info: { text: ['The part of the wind blowing towards the north.'], tex: 'V_N=V_c\\cos\\psi', doc: 'components' } },
    { id: 'east', label: 'East component', sym: 'V_E', ...SPEED, digits: 4, info: { text: ['The part of the wind blowing towards the east.'], tex: 'V_E=V_c\\sin\\psi', doc: 'components' } },
    { id: 'b', label: 'Tether-weight bias term', sym: 'b', dim: 'none', digits: 4, info: { text: ['The bias from the tether’s weight sagging the line (Hoult, eq. 5).'], tex: 'b=\\frac{W_T}{2(B-W)}', doc: 'bias' } },
    { id: 'c', label: 'Tether-drag bias term', sym: 'c', dim: 'none', digits: 4, info: { text: ['The bias from the wind bowing the tether downwind (Hoult, eq. 5).'], tex: 'c=\\frac{C_d\\rho rdV^2\\tan\\Theta\\sin\\Theta}{2(B-W)}', doc: 'bias' } },
    { id: 'B', label: 'Buoyancy', sym: 'B', ...FORCE, digits: 4, info: { text: ['The weight of the air the balloon pushes aside: its upward push.'], tex: 'B=\\rho g\\frac{\\pi D^3}{6}', doc: 'balance' } },
    { id: 'Wg', label: 'Gas weight', sym: 'W_g', ...FORCE, digits: 4, info: { text: ['The weight of the gas inside the balloon, filled at the site pressure and temperature.'], tex: 'W_g=\\frac{p_G}{R_gT_G}\\,g\\,\\frac{\\pi D^3}{6}', doc: 'balance' } },
    { id: 'WT', label: 'Tether weight', sym: 'W_T', ...FORCE, digits: 4, info: { text: ['The weight of the tether paid out.'], tex: 'W_T=\\rho_T\\,g\\,\\frac{\\pi d_t^2}{4}\\,d', doc: 'bias' } },
    { id: 'rho', label: 'Air density at the balloon', sym: '\\rho', ...DENS, digits: 4, info: { text: ['Air density at the balloon, from the standard atmosphere at the site elevation plus the balloon height.'], tex: '\\rho=\\rho_{std}(h_G+h)', doc: 'balance' } },
  ],
  compute(v) {
    const p = model(v), o = pibal(p);
    if (o.sinks) {
      // a balloon that cannot lift its skin is an answer, not an input error: say so and solve the smallest that lifts
      const Dmin = solve((D) => pibal(model(v, { D })).lift, 0.05, 50), Dl = (x) => inUnits(x, DIST);
      const verdict = { level: 'unsafe', title: 'The balloon is too heavy to fly', text: `Its buoyancy (${inUnits(o.B, FORCE)}) is less than the weight of its skin and gas (${inUnits(o.W, FORCE)}).`,
        fixes: Dmin ? [`Use a balloon bigger than <b>${Dl(Dmin)}</b> across (now ${Dl(v.D)}) — about ${Dl(1.5 * Dmin)} to stand up in a breeze — or a lighter skin.`] : [] };
      const dash = Object.fromEntries(DEF.results.map((r) => [r.id, '—']));
      return { results: { ...dash, lift: o.lift, B: o.B, Wg: o.Wg, WT: o.WT, rho: p.rho }, warnings: [{ level: 'err', text: 'The balloon is too small: its buoyancy is below the weight of its skin and gas.', fix: verdict.fixes[0] }], verdict, lv: 'unsafe', sinks: true, err: 0, band: false, o: { ...o, Vc: 0, V: 0, b: 0, c: 0, factor: 1, h: 0, north: 0, east: 0 }, p, v };
    }
    // the band of good angles: unambiguous above 15° (CSULB) and the angle error within your limit
    const e = v.errMax / 100, x = Math.min(1, (v.dTh * RAD) / e), half = Math.asin(x) / 2 / RAD;
    const lo = Math.max(THETA_MIN, half), hi = 90 - half, band = lo < hi;
    // the longest tether within your correction limit: the correction falls monotonically as line is paid out
    const kOk = (1 - v.corrMax / 100) ** 2, fac = (L) => { const q = pibal(model(v, { L })); return q.sinks ? -1 : q.factor; };
    const Lok = fac(5000) >= kOk ? 'no limit' : fac(1) < kOk ? 0 : solve((L) => fac(L) - kOk, 1, 5000);
    if (!(o.factor > 0)) {
      // the tether is so long and heavy that the straight-line model breaks: report it with the line to pay out
      throw new InputError(`The tether correction exceeds the measurement: the line is too long or too heavy for this balloon. Pay out no more than ${inUnits(typeof Lok === 'number' ? Lok : v.L, DIST)}, or use a thinner line.`);
    }
    const err = angleError(v.theta, v.dTh), corrPct = (1 - Math.sqrt(o.factor)) * 100, Re = (p.rho * o.V * v.D) / MU;
    const lv = v.theta < THETA_MIN ? 'unsafe' : err * 100 > v.errMax || corrPct > v.corrMax ? 'marginal' : 'safe';
    // a balloon that puts this wind just inside your band: 30° when blown down, 60° when standing too high (Θ rises with D)
    const mid = !band ? 45 : v.theta < lo ? Math.min(Math.max(lo + 5, 30), (lo + hi) / 2) : Math.max(Math.min(hi - 5, 60), (lo + hi) / 2);
    const angleOff = v.theta < lo || v.theta > hi;
    const Dok = angleOff ? solve((D) => thetaFor(v, D, o.V) - mid, 0.3, 20) : null;
    const fixes = [];
    const Dl = (x) => inUnits(x, DIST);
    if (angleOff && Dok) fixes.push(`${v.theta < lo ? 'Use a bigger' : 'Use a smaller'} balloon: <b>${Dl(Dok)}</b> across (now ${Dl(v.D)}) puts this wind at about ${fmt(mid, { digits: 2 })}°, or`);
    if (v.theta > hi && err * 100 > v.errMax) fixes.push(`read the angle to ±<b>${fmt((v.errMax / 100) * Math.sin(2 * v.theta * RAD) / RAD, { digits: 2 })}°</b> or better (now ±${fmt(v.dTh, { digits: 2 })}°), or`);
    if (corrPct > v.corrMax && typeof Lok === 'number') fixes.push(`pay out no more than <b>${Dl(Lok)}</b> of line (now ${Dl(v.L)}) to keep the tether correction within ${fmt(v.corrMax, { digits: 3 })} %, or`);
    if (fixes.length) fixes[fixes.length - 1] = fixes[fixes.length - 1].replace(/, or$/, '.');
    const Sp = (x) => inUnits(x, SPEED);
    const verdict = {
      level: lv,
      title: lv === 'unsafe' ? 'Not a usable reading: the balloon is blown down too far' : lv === 'safe' ? 'A good reading: angle and tether within your limits' : err * 100 > v.errMax ? (v.theta > 45 ? 'Weak reading: the balloon stands too high to read the wind well' : 'Weak reading: the balloon is low and the angle error grows') : 'The tether correction is larger than you accept',
      text: `Wind <b>${Sp(o.Vc)} ± ${fmt(err * 100, { digits: 2 })} %</b> at ${Dl(o.h)} above the winch, blowing towards ${fmt(v.az, { digits: 3 })}°. ${v.theta < THETA_MIN ? `Below ${THETA_MIN}° elevation one angle can mean two wind speeds (CSULB).` : band ? `Good angles for your accuracy: <b>${fmt(lo, { digits: 2 })}°–${fmt(hi, { digits: 2 })}°</b>; the tether correction is ${fmt(corrPct, { digits: 2 })} %.` : 'No angle meets your error limit with this accuracy.'}`,
      fixes,
    };
    const warnings = [];
    if (Re > RE_CRISIS && v.theta >= THETA_MIN) warnings.push({ level: 'info', text: `The balloon Reynolds number is ${fmt(Re / 1e5, { digits: 2 })}×10⁵, near the sphere drag crisis: the drag coefficient may be lower than entered. CSULB found its 3 ft balloon well-behaved up to about 30 ft/s (9 m/s).` });
    if (lv !== 'safe') warnings.push({ level: lv === 'unsafe' ? 'err' : 'warn', text: verdict.title + '.', fix: fixes.length ? 'See the verdict for the balloon, line or accuracy that fixes it.' : undefined });
    const results = { Vc: o.Vc, err: err * 100, corr: Math.sqrt(o.factor), h: o.h, lift: o.lift, Dok: Dok ?? '—', Lok, Re, thBand: band ? `${fmt(lo, { digits: 3 })}°–${fmt(hi, { digits: 3 })}°` : 'none',
      V: o.V, north: o.north, east: o.east, b: o.b, c: o.c, B: o.B, Wg: o.Wg, WT: o.WT, rho: p.rho };
    return { results, warnings, verdict, lv, err, lo, hi, band, Dok, Lok, o, p, v };
  },
  plots: [
    {
      id: 'response', title: 'Elevation angle against wind speed',
      info: { text: ['The balloon’s response curve: the elevation angle you would read at each wind speed, for your balloon (solid) and other sizes (dashed), with the same tether length.', 'Readings between the red lines are unambiguous and within your error limit. Pick a balloon whose curve stays between them over the winds you expect.'], doc: 'verdict' },
      build(v, out, { U }) {
        if (out.sinks) return null;
        const us = U(SPEED), ud = U(DIST), series = [];
        for (const D of [...new Set([v.D, 2, 4])].sort((a, b) => a - b)) {
          const pts = [];
          for (let i = 0; i <= 80; i++) { const th = 5 + i; const o = pibal(model(v, { D, theta: th })); if (!o.sinks && o.factor > 0) pts.push([us.v(o.Vc), th]); }
          series.push({ name: D === v.D ? 'your balloon' : `${fmt(ud.v(D), { digits: 2 })} ${ud.plain}`, points: pts.reverse(), smooth: true, dashed: D !== v.D, color: D === v.D ? null : 'var(--text-3)' });
        }
        const hl = [{ y: THETA_MIN, label: 'ambiguous below', color: 'var(--danger)' }];
        if (out.band && out.lo > THETA_MIN + 1) hl.push({ y: out.lo, label: 'your error limit', color: 'var(--danger)' });
        if (out.band) hl.push({ y: out.hi, label: 'your error limit', color: 'var(--danger)' });
        return { x: { label: 'Wind speed $V_c$', unit: us.label }, y: { label: 'Elevation angle $\\Theta$', unit: '{}^{\\circ}' }, yDomain: [0, 90], includeZero: true, series,
          hlines: hl, markers: [{ x: us.v(out.o.Vc), y: v.theta, label: 'your reading' }] };
      },
    },
    {
      id: 'tether', title: 'Tether correction against tether length',
      info: { text: ['Bias correction at this elevation angle as more tether is paid out. Tether weight and drag grow with length while the balloon’s lift stays the same, so long tethers need large corrections.', 'Where the curve crosses the red line is the longest line within your correction limit.'], doc: 'verdict' },
      build(v, out, { U }) {
        if (out.sinks) return null;
        const ud = U(DIST), pts = [];
        for (let i = 1; i <= 80; i++) { const L = (2000 * i) / 80, o = pibal(model(v, { L })); if (!o.sinks && o.factor > 0) pts.push([ud.v(L), Math.sqrt(o.factor)]); }
        return { x: { label: 'Tether paid out $d$', unit: ud.label }, y: { label: 'Correction $\\sqrt{1-b-c}$' }, yDomain: [0, 1], series: [{ name: 'correction', points: pts, smooth: true }],
          hlines: [{ y: 1 - v.corrMax / 100, label: 'your limit', color: 'var(--danger)' }], markers: [{ x: ud.v(v.L), y: Math.sqrt(out.o.factor), label: 'your reading' }] };
      },
    },
    {
      id: 'terms', title: 'Bias terms against elevation angle', explore: true,
      info: { text: 'The two bias terms at your tether length: sag from the tether’s weight ($b$) and bowing from its drag ($c$). Drag dominates at high wind speeds (low angles).', doc: 'bias' },
      build(v, out) {
        if (out.sinks) return null;
        const b = [], c = [];
        for (let i = 0; i <= 75; i++) { const th = 10 + i, o = pibal(model(v, { theta: th })); if (!o.sinks) { b.push([th, o.b]); c.push([th, o.c]); } }
        return { x: { label: 'Elevation angle $\\Theta$', unit: '{}^{\\circ}' }, y: { label: 'Bias term' }, includeZero: true,
          series: [{ name: 'tether weight $b$', points: b, smooth: true }, { name: 'tether drag $c$', points: c, smooth: true, dashed: true }], vlines: [{ x: v.theta, label: 'your reading', color: 'var(--text-3)' }] };
      },
    },
  ],
  schematicTitle: 'Balloon, tether and the wind',
  schematicHint: 'Side view: the balloon leans downwind until lift and drag line up with the tether (tether sag exaggerated, balloon not to scale). The line of sight is coloured by the verdict; the wedge is your angle-reading accuracy, and the dashed rays mark your good-angle band. Drag the balloon to change the angle and tether length. Inset: the wind direction',
  schematic(ctx, v, out) {
    const W = 760, H = 380, o = out.o;
    const fr = ctx.frame({ width: W, height: H, label: 'Tethered balloon with its forces, and a compass with the wind components' });
    const g = fr.layer('main'); g.replaceChildren();
    const ud = ctx.U(DIST), us = ctx.U(SPEED), Dl = (x) => `${fmt(ud.v(x), { digits: 3 })} ${ud.label}`, Sp = (x) => `${fmt(us.v(x), { digits: 3 })} ${us.label}`;
    const x0 = 70, yg = 330, th = v.theta * RAD, span = Math.max(v.L * Math.cos(th) / 420, v.L * Math.sin(th) / 260), k = 1 / span;
    const bx = x0 + v.L * Math.cos(th) * k, by = yg - v.L * Math.sin(th) * k;
    g.append(s('line', { x1: 20, x2: 540, y1: yg, y2: yg, class: 'sc-line' }));
    for (let x = 24; x < 540; x += 12) g.append(s('line', { x1: x, y1: yg, x2: x - 8, y2: yg + 8, class: 'sc-thin', 'stroke-opacity': 0.5 }));
    g.append(s('rect', { x: x0 - 14, y: yg - 16, width: 28, height: 16, rx: 3, class: 'sc-body-2' }));
    g.append(text(x0, yg + 22, 'winch', { anchor: 'middle', size: 10.5, cls: 'sc-dim-text' }));
    // line of sight and the sagging tether (sag exaggerated ×(15 % of length scaled by the bias))
    // good-angle band (rays), your reading accuracy (wedge) and the line of sight in the verdict colour
    const ray = 150, yw = yg - 16;
    if (out.band) for (const a of [out.lo, out.hi]) g.append(s('line', { x1: x0, y1: yw, x2: x0 + ray * Math.cos(a * RAD), y2: yw - ray * Math.sin(a * RAD), stroke: 'var(--danger)', 'stroke-dasharray': '3 4', 'stroke-width': 1.2, 'data-field': 'errMax dTh' }));
    const w1 = (v.theta - v.dTh) * RAD, w2 = (v.theta + v.dTh) * RAD, wr = Math.hypot(bx - x0, by - yw);
    g.append(s('path', { d: `M${x0},${yw}L${x0 + wr * Math.cos(w1)},${yw - wr * Math.sin(w1)}A${wr},${wr} 0 0 0 ${x0 + wr * Math.cos(w2)},${yw - wr * Math.sin(w2)}Z`, fill: COL[out.lv], 'fill-opacity': 0.12, stroke: 'none', 'data-field': 'dTh' }));
    g.append(s('line', { x1: x0, y1: yw, x2: bx, y2: by, stroke: COL[out.lv], 'stroke-width': 1.4, 'stroke-dasharray': '5 4', 'data-field': 'theta' }));
    const sag = Math.min(40, 6 + 220 * (o.b + o.c)), pts = [];
    for (let i = 0; i <= 30; i++) { const u = i / 30, x = x0 + (bx - x0) * u, y = yg - 16 + (by - yg + 16) * u; pts.push([x + Math.sin(th) * sag * 4 * u * (1 - u), y + Math.cos(th) * sag * 4 * u * (1 - u)]); }
    g.append(s('path', { d: path(pts), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.3, 'data-field': 'dt rhoT Cd L' }));
    // balloon (not to scale) and its forces
    const rb = 22;
    g.append(s('circle', { cx: bx, cy: by - rb * 0.6, r: rb, fill: 'var(--red)', 'fill-opacity': 0.8, 'data-field': 'D We CD' }));
    const fL = 60, fD = fL / Math.tan(th);
    g.append(s('line', { x1: bx, y1: by - rb * 1.6, x2: bx, y2: by - rb * 1.6 - fL, class: 'sc-accent', 'stroke-width': 2, 'marker-end': fr.arrow('acc') }));
    g.append(text(bx + 6, by - rb * 1.6 - fL + 10, 'net lift B − W', { size: 10.5 }));
    g.append(s('line', { x1: bx + rb + 2, y1: by - rb * 0.6, x2: bx + rb + 2 + Math.max(12, Math.min(160, fD, 540 - bx - rb)), y2: by - rb * 0.6, class: 'sc-accent', 'stroke-width': 2, 'marker-end': fr.arrow('acc') }));
    g.append(text(bx + rb + 6, by - rb * 0.6 + 16, `drag · wind ${Sp(o.Vc)}`, { size: 10.5 }));
    // wind arrows
    for (const y of [80, 150, 220]) g.append(s('path', { d: `M560,${y}h50`, class: 'sc-thin', 'marker-end': fr.arrow() }));
    g.append(text(585, 66, 'wind', { anchor: 'middle', size: 10.5, cls: 'sc-dim-text' }));
    // angle, height and length
    const ar = 56;
    g.append(s('path', { d: `M${x0 + ar},${yg - 16} A${ar},${ar} 0 0 0 ${x0 + ar * Math.cos(th)},${yg - 16 - ar * Math.sin(th)}`, class: 'sc-accent', fill: 'none', 'data-field': 'theta' }));
    g.append(text(x0 + ar + 8, yg - 22, `\\Theta = ${fmt(v.theta, { digits: 3 })}°`, { size: 11, field: 'theta' }));
    g.append(s('line', { x1: bx, x2: bx, y1: by, y2: yg, class: 'sc-thin', 'stroke-dasharray': '2 3' }));
    g.append(text(bx - 6, (by + yg) / 2, `h = ${Dl(o.h)}`, { anchor: 'end', size: 11 }));
    g.append(text((x0 + bx) / 2 - 10, (yg + by) / 2 - 14, `d = ${Dl(v.L)}`, { anchor: 'end', size: 11, field: 'L' }));
    // compass inset: wind direction and components
    const cx = 680, cy = 290, cr = 50, az = v.az * RAD, wx = Math.sin(az), wy = -Math.cos(az);
    g.append(s('circle', { cx, cy, r: cr, fill: 'none', class: 'sc-thin' }));
    g.append(text(cx, cy - cr - 6, 'N', { anchor: 'middle', size: 11 }));
    g.append(s('line', { x1: cx, y1: cy, x2: cx + wx * cr, y2: cy + wy * cr, class: 'sc-accent', 'stroke-width': 2.2, 'marker-end': fr.arrow('acc'), 'data-field': 'az' }));
    g.append(s('path', { d: `M${cx},${cy}V${cy + wy * cr}H${cx + wx * cr}`, class: 'sc-thin', 'stroke-dasharray': '2 2', fill: 'none' }));
    g.append(text(cx, cy + cr + 18, `N ${Sp(o.north)} · E ${Sp(o.east)}`, { anchor: 'middle', size: 10.5, field: 'az' }));
    g.append(text(cx, cy + cr + 32, `towards ${fmt(v.az, { digits: 3 })}°`, { anchor: 'middle', size: 10, cls: 'sc-dim-text', field: 'az' }));
    g.append(text(20, H - 8, 'tether sag exaggerated; balloon not to scale', { size: 10, cls: 'sc-dim-text' }));
    ctx.handle('balloon', bx, by - rb * 0.6, {
      field: 'theta', title: 'Drag to change the elevation angle and tether length',
      onDrag: (sx, sy) => { const dx = Math.max(1, sx - x0), dy = Math.max(1, yg - 16 - sy); ctx.setValue('theta', Math.min(85, Math.max(5, Math.atan2(dy, dx) / RAD)), { round: 0.5 }); ctx.setValue('L', Math.max(20, Math.hypot(dx, dy) / k), { round: 1 }); },
      onKey: (dx, dy) => { if (dy) ctx.setValue('theta', Math.min(85, Math.max(5, v.theta + 0.5 * dy))); if (dx) ctx.setValue('L', Math.max(20, v.L * (1 + 0.05 * dx)), { round: 1 }); },
    });
  },
  symbols: {
    V: 'raw wind speed (m/s or ft/s)', V_c: 'corrected wind speed (m/s or ft/s)', B: 'buoyancy of the balloon (N or lbf)', W: 'weight of the balloon and its gas (N or lbf)', W_e: 'empty balloon weight (N or lbf)', W_g: 'weight of the lifting gas (N or lbf)', W_T: 'weight of the tether paid out (N or lbf)',
    '\\Theta': 'elevation angle seen from the winch (°)', '\\rho': 'air density at the balloon (kg/m³ or slug/ft³)', C_D: 'balloon drag coefficient', S: 'balloon frontal area, $\\pi D^2/4$ (m² or ft²)', D: 'balloon diameter (m or ft)', C_d: 'tether cross-flow drag coefficient',
    r: 'tether radius (m or ft)', d: 'tether length paid out (m or ft)', b: 'tether-weight bias term', c: 'tether-drag bias term', h: 'balloon height above the winch (m or ft)', '\\psi': 'balloon azimuth, the direction the wind blows towards (°)', V_N: 'north wind component (m/s or ft/s)', V_E: 'east wind component (m/s or ft/s)',
    g: 'acceleration of gravity (9.81 m/s²)', p_G: 'air pressure at filling (kPa or psi)', T_G: 'gas temperature at filling (K)', R_g: 'gas constant of the lifting gas (J/(kg·K))', d_t: 'tether diameter (mm or in)', '\\rho_T': 'tether material density (g/cm³)',
    h_G: 'launch-site elevation (m or ft)',
    '\\rho_{std}': 'standard-atmosphere air density at a given height',
    '\\delta\\Theta': 'your angle-reading accuracy (°)',
    '\\delta V/V': 'relative wind error from the angle reading',
    'e_{max}': 'largest wind error you accept (%)',
    'k_{max}': 'largest tether correction you accept (%)',
    'D_{ok}': 'balloon diameter for a good angle (m or ft)',
    'd_{ok}': 'longest tether within your correction limit (m or ft)',
    Re: 'balloon Reynolds number',
    '\\mu': 'air viscosity at 15 °C',
    '\\Theta_{lo}': 'lowest good elevation angle (°)',
    '\\Theta_{hi}': 'highest good elevation angle (°)',
    '\\Theta_{lo}–\\Theta_{hi}': 'good-angle band (°)',
    'delta V': 'possible error in the wind speed (m/s or ft/s)',
  },
  report(v, out, R) {
    const o = out.o, p = out.p, n = R.n, Q = R.Q, F = (x) => Q(x, FORCE);
    const steps = [
      { label: 'Buoyancy of the balloon in the air at its height', lhs: 'B', eq: '\\rho g\\frac{\\pi D^3}{6}', res: F(o.B) },
      { label: 'Weight of the gas (filled on the ground) and of the balloon', lhs: 'W_g', eq: '\\frac{p_G}{R_gT_G}\\,g\\,\\frac{\\pi D^3}{6}', res: F(o.Wg) },
      { lhs: 'W', eq: 'W_e+W_g', res: F(o.W) },
      { label: 'Raw wind speed from the force balance', lhs: 'V', eq: '\\sqrt{\\frac{2(B-W)\\cot\\Theta}{\\rho C_DS}}',
        sub: `\\sqrt{\\frac{2\\times${R.v(o.lift, FORCE)}\\times\\cot ${n(v.theta)}^\\circ}{${R.v(p.rho, DENS)}\\times${n(v.CD)}\\times${n(R.us ? o.S : o.S * 0.09290304)}}}`, res: Q(o.V, SPEED) },
      { label: 'Tether bias terms (eq. 5)', lhs: 'b', eq: '\\frac{W_T}{2(B-W)}', sub: `\\frac{${n(o.WT)}}{2\\times${n(o.lift)}}`, res: n(o.b) },
      { lhs: 'c', eq: '\\frac{C_d\\rho rdV^2\\tan\\Theta\\sin\\Theta}{2(B-W)}', res: n(o.c) },
      { label: 'Corrected wind speed', lhs: 'V_c', eq: 'V\\sqrt{1-b-c}', sub: `${n(o.V)}\\times\\sqrt{1-${n(o.b)}-${n(o.c)}}`, res: Q(o.Vc, SPEED) },
      { label: 'North and east components (the balloon’s azimuth is the downwind direction)', lhs: 'V_N', eq: 'V_c\\cos\\psi', res: Q(o.north, SPEED) },
      { lhs: 'V_E', eq: 'V_c\\sin\\psi', res: Q(o.east, SPEED) },
    ];
    return [{
      title: 'Theory',
      text: 'In steady wind the tether lines up with the resultant of the net lift $B-W$ and the drag $\\tfrac12\\rho V^2C_DS$, so $\\tan\\Theta=(B-W)/D$ and $V=\\sqrt{2(B-W)\\cot\\Theta/(\\rho C_DS)}$. Tether sag and tether drag both make the angle seen at the winch steeper than at the balloon; replacing $\\cot\\Theta$ by $\\cot\\Theta[1-(W_T+C_d\\rho rdV^2\\tan\\Theta\\sin\\Theta)/2(B-W)]$ removes the bias to first order (Hoult).',
      steps,
    }];
  },
  references: ['tpb-bias-errors', 'tether-catenary', 'winch-equations', 'csulbwindsensor', 'a-new-wind-sensor-for-rockets-orig'],
  examples: [
    { name: 'Field reading at 158 ft, 50°', values: { D: 3, We: 0.223, CD: 0.47, gas: 'helium', TG: 290.93, pG: 87080, dt: 0.011, rhoT: 0.967, Cd: 1.92, L: 158, theta: 50, az: 40, hG: 4078 } },
    { name: 'High reading: 1 022 ft at 20°', values: { D: 3, We: 0.223, CD: 0.47, gas: 'helium', TG: 290.93, pG: 87080, dt: 0.011, rhoT: 0.967, Cd: 1.92, L: 1022, theta: 20, az: 30, hG: 4078 } },
    { name: 'Memo example: 600 ft of line at 56.4°, sea level', values: { D: 3, We: 0.22, CD: 0.49, gas: 'helium', TG: 288.15, pG: 101325, dt: 0.011, rhoT: 0.967, Cd: 1.92, L: 600, theta: 56.44, az: 0, hG: 0 } },
  ],
};
export default DEF;
