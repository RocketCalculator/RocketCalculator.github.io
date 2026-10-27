// Roll Rate History — UI definition.
import { rollRate, apogeeRatio, G0 } from '../calc/rollrate.js';
import { derivatives } from '../calc/cantAngle.js';
import { atmosphere } from '../calc/geophysics.js';
import { s, fmt, reducedMotion, InputError } from '../util.js';
import { text, finEndView, path } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const LEN = { dim: 'length', internal: 'in' };
const DIST = { dim: 'distance', internal: 'ft' };
const ALT = { dim: 'altitude', internal: 'ft' };
const SPEED = { dim: 'speed', internal: 'fts' };
const DENS = { dim: 'density', internal: 'slugft3' };
const HZ = { dim: 'frequency', internal: 'hz' };
const WAVE = { dim: 'wavenumber', internal: 'perft' };
const INERTIA = { dim: 'inertia', internal: 'slugft2' };
const RAD = Math.PI / 180, TAU = 2 * Math.PI;
// verdict bands (D-roll-rate-history): roll rate against the user's limit; up to 1.25× is marginal, as for the other user limits
const MARGIN = 1.25;
const ST = { safe: 'ok', marginal: 'warn', unsafe: 'err' };
const level = (r) => (r <= 1 ? 'safe' : r <= MARGIN ? 'marginal' : 'unsafe');
const Q = (x, u, d = 3) => `${fmt(toDisplay(x, u), { digits: d })} ${unitLabel(displayUnit(u))}`;
const hz = (p) => Math.abs(p) / TAU;
const rpm = (p) => `${fmt(hz(p) * 60, { digits: 3 })} rpm`;

/** Model inputs (ft, slug, s, rad) from the page values, with the strip-theory roll derivatives of the fin set. */
function model(v, over = {}) {
  v = { ...v, b: v.R + v.span };   // tip radius from the measured span: always outside the body
  const der = derivatives({ R: v.R, b: v.b, cR: v.cR, cT: v.cT, cNa: v.cNa, N: v.N });
  return { der, p: { CLd: der.CLd, CLp: der.CLp, N: v.N, delta: v.delta * RAD, R: v.R / 12, I: v.Ixx, rho: v.rho, rhoA: v.rhoA, L: v.L, hB: v.hB, VB: v.VB, ...over } };
}

/** Ratios of the peak and apogee roll rates to the user's limits. */
const ratios = (o, v) => ({ peak: hz(o.pMax) / v.fMaxLim, apo: hz(o.pA) / v.fApoLim });

export default {
  slug: 'roll-rate-history',
  topic: 'roll-rate',
  title: 'Roll Rate History',
  subtitle: 'How fast canted fins <b>spin the rocket</b> from the launcher to apogee, whether the spin stays within <b>your limits</b> for the payload and the recovery, and the cant that keeps it there.',
  verdict: true,
  tiers: true,
  intro: {
    what: 'Follows the roll rate of a rocket with canted fins from the moment it leaves the launcher, through burnout, to apogee: how fast it spins, when the spin peaks and how many turns it makes.',
    why: 'Cameras and sensors need a low spin to work, and a fast spin at apogee can wrap the parachute lines when the drogue comes out. Roll inertia makes the spin lag the fin setting, so the peak often comes after burnout.',
    when: 'Choosing a fin cant angle, predicting the spin a payload will see, or checking the roll rate at apogee before deploying the recovery.',
  },
  info: {
    text: [
      'Canted fins push the rocket round like a windmill; the same fins also brake the spin. Without roll inertia the two balance at a fixed roll per distance flown — the roll wave number — so the roll rate would simply grow with speed.',
      'Roll inertia makes the spin lag behind that value, most strongly just after the launcher, so the spin can keep growing for a while after burnout. As the rocket slows and the air thins the torques fade and the spin decays towards apogee.',
      'Every roll rate is proportional to the cant angle, so the verdict gives the exact cant that meets your limits.',
    ],
    tex: 'I_R\\frac{dp}{dt}=qSd\\left[C_{Lp}\\frac{pd}{2U}+C_{L\\delta}\\sum_i\\delta_i\\right]',
    steps: ['Enter the fin set and its cant angle, and the roll inertia.', 'Enter the launcher length, burnout height and speed and the air densities, or fill them from the Trajectory Simulation.', 'Set the largest roll rates you accept in flight and at apogee.', 'Read the verdict and the cant that fixes it; hover the flight plot to follow the spin second by second.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'fins', title: 'Fin set',
      fields: [
        { id: 'R', shared: 'bodyR', label: 'Body radius', sym: 'R', ...LEN, default: 3.125, min: 0.1, max: 60, slider: { min: 0.5, max: 6, step: 0.025 },
          info: { text: ['Half the outside diameter of the body tube where the fins are.', 'Measure the tube diameter and halve it.', 'A fatter body moves the fins out from the axis: they push harder on the spin but also brake it harder, so the roll per distance flown changes only a little.'], range: 'Model rockets 0.5–1 in (13–25 mm); high-power 1.5–4 in (38–100 mm).', doc: 'derivatives', tex: 'b=R+s' } },
        { id: 'span', shared: 'finSpan', label: 'Exposed fin span (body to tip)', sym: 's', ...LEN, default: 2.375, min: 0.05, max: 100, slider: { min: 0.25, max: 15, step: 0.005 },
          info: { text: ['How far each fin sticks out from the body tube, measured from the tube to the tip.', 'The tip’s distance from the centre line is the body radius plus this span.', 'Longer fins both drive and damp the roll harder; the roll rate they settle to depends on the planform shape.'], tex: 'b=R+s', range: 'Usually 0.5–2 × the body radius.', doc: 'derivatives' } },
        { id: 'cR', shared: 'finCr', label: 'Root chord', sym: 'c_R', ...LEN, default: 10, min: 0.1, max: 200, slider: { min: 1, max: 24, step: 0.1 },
          info: { text: ['The length of the fin where it meets the body.', 'Measure it along the tube.', 'With the tip chord it sets how the fin area is spread along the span, which changes the balance of driving and braking a little.'], range: '1–2 body diameters.', doc: 'derivatives', tex: 'c(y)=c_R-(c_R-c_T)\\frac{y-R}{s}' } },
        { id: 'cT', shared: 'finCt', label: 'Tip chord', sym: 'c_T', ...LEN, default: 2, min: 0, max: 200, slider: { min: 0, max: 16, step: 0.1 },
          info: { text: ['The length of the fin at its tip (0 for a pointed delta fin).', 'Measure it parallel to the root chord.', 'Area at the tip brakes the spin more than area at the root: a bigger tip chord lowers the roll rate a little.'], range: '0–1 root chord.', doc: 'derivatives' } },
        { id: 'N', backView: (v) => ({ R: v.R, span: v.b - v.R, nominal: { t: true }, unit: LEN, range: [3, 8], note: 'Driving and damping both scale with N: the steady roll wave number is the same for any N; how fast it is reached is not.' }), shared: 'finN', label: 'Number of fins', sym: 'N', dim: 'none', default: 4, min: 1, max: 12, slider: { min: 3, max: 8, step: 1 },
          info: { text: ['How many identical fins the rocket has, all canted the same way.', 'Count them.', 'More fins push and brake the spin equally harder, so the steady roll per distance flown is the same, but the rocket reaches it sooner (less lag).'], range: '3 or 4 on most rockets.', doc: 'derivatives', tex: 'I_R\\frac{dp}{dt}=qSd\\left[C_{Lp}\\frac{pd}{2U}+C_{L\\delta}N\\delta\\right]' } },
        { id: 'delta', label: 'Cant angle (each fin)', sym: '\\delta', dim: 'angle', default: 0.2, min: -5, max: 5, slider: { min: 0, max: 1, step: 0.01 },
          info: { text: ['How far each fin is turned from the body axis, like the blades of a windmill. All fins are canted the same way; a negative angle spins the rocket the other way.', 'Set by the fin jig or the slot angle. Unintended misalignment of a few hundredths of a degree acts the same way.', 'Every roll rate is proportional to it: halve the cant and every rate and turn count halves. Drag the fin’s trailing edge in the drawing to change it.'], tex: '\\lambda_{R0}=-\\frac{2C_{L\\delta}N\\delta}{d\\,C_{Lp}}', range: 'A few tenths of a degree for a deliberate slow spin; 0 for no spin.', doc: 'boost' } },
      ],
    },
    {
      id: 'mass', title: 'Roll inertia',
      fields: [
        { id: 'Ixx', label: 'Roll moment of inertia', sym: 'I_R', ...INERTIA, default: 0.22, min: 1e-4, max: 100, slider: { min: 0.005, max: 1.5, step: 0.005 },
          info: { text: ['How hard the rocket is to spin up about its long axis — like the mass, but for turning, and it counts mass far from the axis more.', 'Take it from OpenRocket or CAD (the “longitudinal” or “roll” moment of inertia), or estimate about ½mr² for the motor and the body shell. A representative boost value; it falls as the propellant burns.', 'More inertia makes the spin lag the fins more during the boost, but also keeps it longer in the coast: the peak falls and moves later, the apogee rate can rise.'], tex: 'k=\\frac{I_R}{2\\pi\\rho R^4C_{Lp}}', range: 'A few hundredths to a few tenths of a slug ft² (0.03–0.5 kg m²) for high-power rockets.', doc: 'lag' } },
      ],
    },
    {
      id: 'boost', title: 'Launch and climb',
      fields: [
        { id: 'L', label: 'Launcher length', sym: 'L', ...DIST, default: 18, min: 0, max: 200, slider: { min: 3, max: 40, step: 0.5 },
          info: { text: ['How far the rocket travels along the rail or rod before it is free to turn.', 'Measure it on the launcher.', 'The rocket cannot roll until it leaves the launcher; a longer one starts the spin later, at a higher speed, with a little less lag.'], range: 'Rods 3–6 ft (1–2 m); rails 6–20 ft (2–6 m).', doc: 'boost', tex: 'J=\\frac{I_R}{2\\pi\\rho(h_B-L)R^4C_{Lp}}' } },
        { id: 'hB', label: 'Burnout height above the launcher base', sym: 'h_B', ...ALT, default: 2000, min: 10, max: 100000, slider: { min: 300, max: 10000, step: 10 },
          info: { text: ['The distance the rocket has flown when the motor stops.', 'From a trajectory simulation (or the Trajectory Simulation button). The boost is modelled with constant acceleration from the launcher base.', 'A longer boost to the same speed means a gentler acceleration: the spin has more time to catch up with the fins (less lag). Drag the burnout mark in the drawing to change it.'], range: 'High-power 300–3000 m (1000–10 000 ft).', doc: 'boost', tex: 'J=\\frac{I_R}{2\\pi\\rho(h_B-L)R^4C_{Lp}}' } },
        { id: 'VB', label: 'Burnout speed', sym: 'V_B', ...SPEED, default: 1037.2, min: 10, max: 6000, slider: { min: 150, max: 2500, step: 1 },
          info: { text: ['How fast the rocket flies when the motor stops.', 'From a trajectory simulation.', 'The steady roll rate is proportional to the speed, so a faster rocket spins faster at burnout; it also coasts longer, which gives the spin longer to decay before apogee.'], tex: 'p=\\lambda_{R0}U', range: '100–400 m/s (300–1300 ft/s) for high-power rockets.', doc: 'boost' } },
        { id: 'rho', label: 'Air density during the boost', sym: '\\rho', ...DENS, default: 0.0023, min: 1e-4, max: 0.003, slider: { min: 0.0012, max: 0.0025, step: 0.00001 },
          info: { text: ['A typical density of the air the rocket flies through while the motor burns.', 'Use the density halfway up the boost (Atmosphere & Gravity calculator); the Trajectory Simulation button averages it for you.', 'Thinner air pushes and brakes more weakly, so the spin lags more: the burnout rate falls.'], range: '1.225 kg/m³ (0.00238 slug/ft³) at sea level; about 1.0 kg/m³ at 2000 m.', doc: 'lag' } },
        { id: 'rhoA', label: 'Air density at apogee', sym: '\\rho_A', ...DENS, default: 0.0019, min: 1e-4, max: 0.003, slider: { min: 0.0006, max: 0.0025, step: 0.00001 },
          info: { text: ['The density of the air at the top of the flight.', 'From the Atmosphere & Gravity calculator at the apogee height. The coast model assumes apogee is in the troposphere (below about 11 km).', 'Denser air brakes the spin harder during the coast: the apogee roll rate falls.'], tex: 'G=-\\frac{\\rho_A S d^2C_{Lp}}{4gI_R}', range: 'About 0.9 kg/m³ (0.0017 slug/ft³) at 3 km; 0.6 kg/m³ at 7 km.', doc: 'apogee' } },
      ],
    },
    {
      id: 'limits', title: 'Your limits',
      fields: [
        { id: 'fMaxLim', label: 'Largest roll rate you accept in flight', sym: 'p_{max}', ...HZ, default: 2, min: 0.01, max: 100, slider: { min: 0.2, max: 20, step: 0.1 },
          info: { text: ['The fastest spin your payload may see at any moment: a camera that must not blur, a sensor or a structure. In turns per second (Hz); 1 Hz is 60 rpm.', 'Not a published limit: your choice, from the payload’s data sheet or your own tests.', 'The verdict compares the peak roll rate with it and gives the largest cant that stays below it.'], range: 'Video cameras: under about 1–2 Hz for usable footage; 5–10 Hz for robust electronics. Your choice.', doc: 'limits', tex: 'p_{peak}\\le p_{max}' } },
        { id: 'fApoLim', label: 'Largest roll rate you accept at apogee', sym: 'p_{A,max}', ...HZ, default: 0.5, min: 0.01, max: 50, slider: { min: 0.05, max: 5, step: 0.05 },
          info: { text: ['The fastest spin you accept when the recovery deploys at apogee, where a fast spin can wrap the parachute lines, and where payloads linger longest.', 'Not a published limit: your choice.', 'The verdict compares the apogee roll rate with it.'], range: 'A slow spin, under about 0.5–1 Hz, is a common aim. Your choice.', doc: 'limits', tex: 'p_A\\le p_{A,max}' } },
      ],
    },
    {
      id: 'model', title: 'Model settings (advanced)',
      fields: [
        { id: 'cNa', label: 'Airfoil normal-force slope', sym: 'c_{N\\alpha}', dim: 'perAngle', internal: 'perrad', default: 3.5, min: 0.5, max: 7, slider: { min: 2, max: 6.3, step: 0.05 },
          info: { text: ['How much lift a strip of fin makes per radian of angle to the air.', 'About 2π (6.28) per radian for a thin fin in slow flight; a lower panel average allows for losses at the root and tip.', 'It scales driving and braking equally, so the steady spin barely changes; a larger value cuts the lag.'], range: '3–6.3 per radian.', doc: 'derivatives' } },
      ],
    },
  ],
  actions: [{
    label: 'Fill from the Trajectory Simulation', group: 'boost', title: 'Run the Trajectory Simulation with its saved inputs and take the launcher length, burnout and the air densities from it',
    async run() {
      const def = (await import('./skyaero-trajectory.js')).default;
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem('rc-calc-skyaero-trajectory')); } catch { /* none */ }
      const v = {}; for (const g of def.groups) for (const f of g.fields) v[f.id] = structuredClone(f.default);
      Object.assign(v, structuredClone(def.examples?.[0]?.values || {}), saved || {});
      const o = def.compute(v).o, b = o.burnouts.at(-1);
      if (!b) throw new InputError('The Trajectory Simulation has no burnout.');
      const rhoAt = (z) => atmosphere({ h: v.ho + z, ho: v.ho, To: v.To, phi: v.lat }).rho;
      // distance flown to burnout and the distance-weighted density over the boost (the model's boost is straight)
      let sB = 0, rs = 0;
      for (let i = 1; i <= b.idx; i++) { const a = o.hist[i - 1], c = o.hist[i], ds = Math.hypot(c.x - a.x, c.z - a.z); sB += ds; rs += ds * rhoAt((a.z + c.z) / 2); }
      const values = { L: v.L, hB: Math.max(sB, v.L + 10), VB: b.V, rho: sB > 0 ? rs / sB : rhoAt(0), rhoA: rhoAt(o.hApo) };
      const many = o.burnouts.length > 1 ? ` (last of ${o.burnouts.length} burnouts; the boost is treated as one)` : '';
      return { values, message: `${saved ? 'Filled from your Trajectory Simulation' : 'Filled from the Trajectory Simulation example — open that calculator to simulate your own rocket'}: burnout ${Q(values.hB, ALT)} at ${Q(values.VB, SPEED)}${many}` };
    },
  }],
  results: [
    { id: 'fMax', label: 'Peak roll rate', sym: 'p_{peak}', ...HZ, key: true, digits: 3, status: (x, out) => ST[out.lv.peak],
      note: (x, out) => `${rpm(out.o.pMax)} at ${fmt(out.o.tMax, { digits: 3 })} s (${out.o.tMax > out.o.tB + 1e-6 ? 'coasting' : 'burnout'}) · ${fmt(out.r.peak, { digits: 3 })} × your limit`,
      info: { text: ['The fastest the rocket spins at any moment from the launcher to apogee.', 'Because of roll inertia the spin lags the fins and can keep growing for a while after burnout, so the peak is often in the coast.', 'Compared with your in-flight limit: the cant angle scales it directly.'], tex: 'I_R\\frac{dp}{dt}=qSd\\left[C_{Lp}\\frac{pd}{2U}+C_{L\\delta}N\\delta\\right]', doc: 'coast' } },
    { id: 'fA', label: 'Roll rate at apogee', sym: 'p_A', ...HZ, key: true, digits: 3, status: (x, out) => ST[out.lv.apo],
      note: (x, out) => `${rpm(out.o.pA)} · ${fmt(out.r.apo, { digits: 3 })} × your limit`,
      info: { text: ['How fast the rocket spins at the top of the flight, when the recovery usually deploys.', 'After burnout gravity takes the speed away, the aerodynamic torques fade, and the spin decays — slowly for a rocket with a lot of roll inertia.', 'Compared with your apogee limit.'], tex: 'p_A=p_Be^{-a}+\\lambda_{R0}V_B\\left[\\frac{\\sqrt\\pi\\,\\mathrm{erf}\\sqrt a}{2\\sqrt a}-e^{-a}\\right],\\ a=\\frac{GV_B^2}{2}', doc: 'apogee' } },
    { id: 'deltaMax', label: 'Largest cant within your limits', sym: '\\delta_{max}', dim: 'angle', key: true, digits: 3, status: (x, out) => ST[out.lvAll],
      note: (x, out) => (x === '—' ? 'no cant: no spin' : `now ${fmt(Math.abs(out.v.delta), { digits: 3 })}° · set by your ${out.r.peak >= out.r.apo ? 'in-flight' : 'apogee'} limit`),
      info: { text: ['The largest cant angle (each fin) at which both the peak and the apogee roll rate stay within your limits.', 'Every roll rate is proportional to the cant, so it is your cant divided by the larger of the two ratios to the limits — exact, not an estimate.', 'Any smaller cant spins the rocket more slowly.'], tex: '\\delta_{max}=\\frac{|\\delta|}{\\max\\left(\\frac{p_{peak}}{p_{max}},\\frac{p_A}{p_{A,max}}\\right)}', doc: 'limits' } },
    { id: 'turnsA', label: 'Roll turns to apogee', sym: '\\Delta\\phi_A/2\\pi', dim: 'none', key: true, digits: 3,
      note: (x, out) => `${fmt(Math.abs(out.o.phiB) / TAU, { digits: 3 })} during the boost`,
      info: { text: ['How many complete turns the rocket makes from leaving the launcher to apogee.', 'Several turns during the boost average out the push of a crooked motor or fin; most of the turns usually come in the long coast.', 'Proportional to the cant angle.'], tex: '\\Delta\\phi=\\int p\\,dt', doc: 'coast' } },
    { id: 'fB', label: 'Roll rate at burnout', sym: 'p_B', ...HZ, digits: 4, info: { text: ['Roll rate at burnout from integrating the roll equation from launcher exit, with roll inertia.'], tex: 'I_R\\frac{dp}{dt}=qSd\\left[C_{Lp}\\frac{pd}{2U}+C_{L\\delta}N\\delta\\right]', doc: 'lag' } },
    { id: 'turns', label: 'Roll turns during the boost', sym: '\\Delta\\phi_B/2\\pi', dim: 'none', digits: 4, info: { text: ['Turns between leaving the launcher and burnout. Several turns average out body-fixed misalignments.'], tex: '\\Delta\\phi=\\int p\\,dt', doc: 'boost' } },
    { id: 'tMax', label: 'Time of the peak roll rate', sym: 't_{peak}', dim: 'time', digits: 4, info: { text: ['Time after ignition when the spin is fastest.'], doc: 'coast' } },
    { id: 'hA', label: 'Apogee height above the launcher base (no-drag coast)', sym: 'h_A', ...ALT, digits: 4, info: { text: ['Burnout height plus a coast against gravity alone; drag makes the real apogee lower. Used only to place the coast on the time and height axes.'], tex: 'h_A=h_B+\\frac{V_B^2}{2g}', doc: 'coast' } },
    { id: 'fB0', label: 'Roll rate at burnout without inertia', sym: '\\lambda_{R0}V_B', ...HZ, digits: 4, info: { text: ['The burnout roll rate if the rocket had no roll inertia: the steady helix at the burnout speed.'], tex: 'p=\\lambda_{R0}U', doc: 'boost' } },
    { id: 'fBapprox', label: 'Roll rate at burnout, closed-form estimate', sym: '\\frac{\\lambda_{R0}V_B}{1-J}', ...HZ, digits: 4, info: { text: ['The memo’s closed-form estimate; close to the integrated value while $|J|$ is below about 0.1.'], tex: '\\frac{\\lambda_{R0}}{1-J}V_B,\\ J=\\frac{I_R}{2\\pi\\rho(h_B-L)R^4C_{Lp}}', doc: 'lag' } },
    { id: 'pitch', label: 'Distance flown per roll turn (no inertia)', sym: '2\\pi/\\lambda_{R0}', ...DIST, digits: 4, info: { text: ['The steady roll helix: the distance flown per turn once inertia no longer matters.'], tex: '\\lambda_{R0}=-\\frac{2C_{L\\delta}N\\delta}{d\\,C_{Lp}}', doc: 'boost' } },
    { id: 'JB', label: 'Roll-lag parameter at burnout', sym: 'J', dim: 'none', digits: 4, info: { text: ['How much the roll lags the steady helix at burnout because of roll inertia (memo).'], tex: 'J=\\frac{I_R}{2\\pi\\rho(h_B-L)R^4C_{Lp}}', doc: 'lag' } },
    { id: 'k', label: 'Roll-lag length', sym: 'k', ...DIST, digits: 4, info: { text: ['The roll inertia expressed as a length of flight: the lag fades after a few of these.'], tex: 'k=\\frac{I_R}{2\\pi\\rho R^4C_{Lp}}', doc: 'lag' } },
    { id: 'lam0', label: 'Roll wave number', sym: '\\lambda_{R0}', ...WAVE, digits: 4, info: { text: ['Roll angle turned per unit distance flown, with no inertia.'], tex: '\\lambda_{R0}=-\\frac{2C_{L\\delta}N\\delta}{d\\,C_{Lp}}', doc: 'boost' } },
    { id: 'CLd', label: 'Roll-driving derivative (one fin)', sym: 'C_{L\\delta}', dim: 'perAngle', internal: 'perrad', digits: 4, info: { text: ['How much roll moment one canted fin makes per radian of cant (strip theory).'], doc: 'derivatives' } },
    { id: 'CLp', label: 'Roll-damping derivative (all fins)', sym: 'C_{Lp}', dim: 'none', digits: 4, info: { text: ['How strongly all the fins resist rolling (strip theory).'], doc: 'derivatives' } },
    { id: 'X', label: 'Apogee spin parameter', sym: 'GV_B^2', dim: 'none', digits: 4, info: { text: ['The memo’s apogee spin parameter: large values mean the spin decays strongly in the coast.'], tex: 'G=-\\frac{\\rho_A S d^2C_{Lp}}{4gI_R}', doc: 'apogee' } },
    { id: 'tCoast', label: 'Coast time to apogee (no drag)', sym: 'V_B/g', dim: 'time', digits: 4, info: { text: ['How long the coast to apogee lasts, drag left out.'], tex: 't=\\frac{V_B}{g}', doc: 'apogee' } },
  ],
  compute(v) {
    v.b = v.R + v.span;
    // a burnout below the launcher top cannot happen: take it just above (twice the launcher length) and say so
    const lowBurnout = !(v.hB > v.L);
    if (lowBurnout) v = { ...v, hB: 2 * v.L };
    const { der, p } = model(v);
    const o = rollRate(p), r = ratios(o, v), worst = Math.max(r.peak, r.apo);
    const lv = { peak: level(r.peak), apo: level(r.apo) }, lvAll = level(worst);
    // every rate is linear in the cant (zero initial spin, linear roll equation): the cant that meets the limits is exact
    const deltaMax = v.delta !== 0 && worst > 0 ? Math.abs(v.delta) / worst : null;
    const fixes = [];
    if (lvAll !== 'safe' && deltaMax) fixes.push(`Reduce the cant to at most <b>${fmt(deltaMax, { digits: 3 })}°</b> on each fin (now ${fmt(Math.abs(v.delta), { digits: 3 })}°): every roll rate scales with it.`);
    if (lvAll !== 'safe' && deltaMax && deltaMax < 0.05) fixes.push('A cant this small is within ordinary build tolerance: align the fins with a jig and check them, or accept the spin.');
    const which = r.peak >= r.apo ? `peaks at <b>${fmt(hz(o.pMax), { digits: 3 })} Hz</b> (${rpm(o.pMax)}) at ${fmt(o.tMax, { digits: 3 })} s against your ${fmt(v.fMaxLim, { digits: 3 })} Hz` : `reaches apogee at <b>${fmt(hz(o.pA), { digits: 3 })} Hz</b> (${rpm(o.pA)}) against your ${fmt(v.fApoLim, { digits: 3 })} Hz`;
    const verdict = v.delta === 0
      ? { level: 'safe', title: 'No cant: the fins do not spin the rocket', text: 'With every fin straight the fins neither drive nor need to brake a roll; only misalignments spin the rocket.', fixes: [] }
      : {
        level: lvAll,
        title: lvAll === 'safe' ? 'The spin stays within your limits' : lvAll === 'marginal' ? 'Little or no margin: the spin is just over your limit' : 'The rocket spins faster than you accept',
        text: `The spin ${which}; peak ${fmt(hz(o.pMax), { digits: 3 })} Hz, apogee <b>${fmt(hz(o.pA), { digits: 3 })} Hz</b>, ${fmt(Math.abs(o.phiA) / TAU, { digits: 3 })} turns to apogee.`,
        fixes,
      };
    const warnings = [];
    if (lowBurnout) warnings.push({ level: 'warn', text: 'The burnout height is not above the top of the launcher; it is taken as twice the launcher length.', fix: 'Enter the burnout height above the launcher base (it must exceed the launcher length).' });
    if (Math.abs(o.JB) > 0.1) warnings.push({ level: 'info', text: `Roll inertia is important here ($|J|=${fmt(Math.abs(o.JB), { digits: 2 })}$ at burnout): the spin lags the fin setting${o.tMax > o.tB + 1e-6 ? ' and peaks after burnout' : ''}. The rates shown are integrated, not taken from the closed-form estimate.` });
    if (o.X > 12) warnings.push({ level: 'info', text: 'The spin decays strongly before apogee; the apogee value depends on the assumed apogee density.' });
    if (o.hA > 36000) warnings.push({ level: 'warn', text: `The no-drag apogee (${Q(o.hA, ALT)}) is above the troposphere, where the apogee model is not meant to be used.`, fix: 'Treat the apogee roll rate as a rough estimate.' });
    const results = { fMax: hz(o.pMax), fA: hz(o.pA), deltaMax: deltaMax ?? '—', turnsA: Math.abs(o.phiA) / TAU, fB: o.pB / TAU, turns: o.phiB / TAU, tMax: o.tMax, hA: o.hA,
      fB0: o.pB0 / TAU, fBapprox: o.pBapprox / TAU, pitch: o.lam0 ? TAU / Math.abs(o.lam0) : '—', JB: o.JB, k: o.k, lam0: o.lam0, CLd: der.CLd, CLp: der.CLp, X: o.X, tCoast: o.tCoast };
    return { results, warnings, verdict, o, der, r, lv, lvAll, v };
  },
  plots: [
    {
      id: 'flight', title: 'The flight, second by second', wide: true, height: 520,
      info: { text: ['Three views of the flight on one time axis, from ignition to apogee: the speed; the roll rate (red) with the rate the fins would give without roll inertia (grey dashed) and your limits as red lines; and the turns made so far.', 'The roll rate lags the no-inertia rate after the launcher, keeps growing a little after burnout, then decays as the rocket slows. Hover to read every quantity at one moment, with the roll rate as a fraction of your in-flight limit.'], doc: 'coast' },
      build(v, out, { U }) {
        const o = out.o, us = U(SPEED), sg = Math.sign(v.delta) || 1, a = o.a;
        const rows = [{ t: 0, U: 0, p: 0, phi: 0 }, ...o.hist, ...o.coast.slice(1)];
        const pk = (f) => rows.map((r) => [r.t, f(r)]);
        const pk2 = hz(Math.max(Math.abs(o.pMax), Math.abs(o.pB0))), near = (x) => (x <= 2.5 * pk2 ? x : 0);
        const yTop = 1.1 * Math.max(pk2, near(v.fMaxLim), near(v.fApoLim)) || 1;
        const span = o.tA, apoSeg = [[Math.max(o.tB, o.tA - 0.15 * span), v.fApoLim], [o.tA, v.fApoLim]];
        return {
          x: { label: 'Time after ignition $t$', unit: '\\mathrm{s}' }, xDomain: [0, o.tA],
          vlines: [{ x: o.t0, label: 'leaves launcher', color: 'var(--text-3)' }, { x: o.tB, label: 'burnout', color: 'var(--text-3)', row: 1 }, { x: o.tMax, label: 'peak spin', color: 'var(--text-3)', row: 2 }],
          panels: [
            { y: { label: 'Speed $U$', unit: us.label }, color: 'var(--series-2)', includeZero: true, series: [{ name: 'speed $U$', points: [[0, 0], [o.t0, us.v(a * o.t0)], ...o.hist.slice(1).map((r) => [r.t, us.v(r.U)]), ...o.coast.slice(1).map((r) => [r.t, us.v(r.U)])] }] },
            { y: { label: 'Roll rate $p$', unit: '\\mathrm{Hz}' }, color: 'var(--series-1)', yDomain: [0, yTop], ratio: { label: 'p/p_{max}' },
              series: [{ name: 'roll rate $p$', points: rows.map((r) => [r.t, (sg * r.p) / TAU, (sg * r.p) / TAU / v.fMaxLim]) },
                { name: 'no inertia $\\lambda_{R0}U$', dash: '7 4', color: 'var(--text-3)', points: rows.map((r) => [r.t, (sg * o.lam0 * (r.t < o.t0 ? 0 : r.U)) / TAU]) },
                { name: 'your apogee limit', dash: '3 3', color: 'var(--danger)', points: apoSeg }],
              hlines: [{ y: v.fMaxLim, label: 'your limit in flight', color: 'var(--danger)' }] },
            { y: { label: 'Roll turns $\\Delta\\phi/2\\pi$' }, color: 'var(--series-4)', includeZero: true, series: [{ name: 'turns', dash: '2 3', points: pk((r) => (sg * r.phi) / TAU) }] },
          ],
        };
      },
    },
    {
      id: 'inertia', title: 'Roll inertia: lag against decay', explore: true,
      info: { text: ['The peak roll rate (solid) and the apogee roll rate (dashed) for other roll moments of inertia, everything else unchanged. Your limits are the red lines; the dots are your rocket.', 'More inertia makes the spin lag the fins (lower peak) but also lets it coast on (higher apogee rate): adding or removing mass far from the axis moves you along these curves.'], doc: 'coast' },
      build(v, out, { U }) {
        const ui = U(INERTIA), A = [], B = [];
        // shortcut: linear axis (the chart has no log axis), 0.1–4× your inertia
        for (let i = 0; i <= 30; i++) {
          const I = v.Ixx * (0.1 + (3.9 * i) / 30), o = rollRate(model(v, { I }).p);
          A.push([ui.v(I), hz(o.pMax)]); B.push([ui.v(I), hz(o.pA)]);
        }
        return { x: { label: 'Roll moment of inertia $I_R$', unit: ui.label }, y: { label: 'Roll rate', unit: '\\mathrm{Hz}' }, includeZero: true,
          series: [{ name: 'peak $p_{peak}$', points: A, smooth: true }, { name: 'at apogee $p_A$', points: B, smooth: true, dashed: true, color: 'var(--text-3)' }],
          hlines: [{ y: v.fMaxLim, label: 'your limit in flight', color: 'var(--danger)' }, { y: v.fApoLim, label: 'your apogee limit', color: 'var(--danger)' }],
          markers: [{ x: ui.v(v.Ixx), y: out.results.fMax, label: 'your rocket' }, { x: ui.v(v.Ixx), y: out.results.fA }] };
      },
    },
    {
      id: 'wave', title: 'Roll wave number during the boost', explore: true,
      info: { text: ['Roll per unit distance flown, against time after ignition. It starts at zero on the launcher and climbs towards the no-inertia value $\\lambda_{R0}$; the memo compares this curve with Prospector-18D flight data.'], doc: 'lag' },
      build(v, out, { U }) {
        const o = out.o, uw = U(WAVE), t1 = o.hist.at(-1).t;
        const pts = [[0, 0], ...o.hist.map((r) => [r.t, uw.v(r.p / r.U)])];
        return { x: { label: 'Time after ignition $t$', unit: '\\mathrm{s}' }, y: { label: 'Roll wave number $\\lambda_R$', unit: uw.label }, includeZero: true,
          series: [{ name: '$\\lambda_R$', points: pts }, { name: '$\\lambda_{R0}$', points: [[0, uw.v(o.lam0)], [t1, uw.v(o.lam0)]], dashed: true, color: 'var(--text-3)' }],
          vlines: [{ x: o.t0, label: 'leaves launcher', color: 'var(--text-3)' }] };
      },
    },
    {
      id: 'apogee', title: 'Apogee roll rate', explore: true,
      info: { text: ['Ratio of the apogee roll rate to the burnout roll rate against the spin parameter $GV_B^2$, for a rocket that has reached its no-inertia rate by burnout (the memo’s Figure 1). Heavier damping, faster burnout or lighter roll inertia mean more decay.'], doc: 'apogee' },
      build(v, out) {
        const top = Math.max(6, 1.3 * out.o.X), pts = [];
        for (let i = 0; i <= 120; i++) { const X = (top * i) / 120; pts.push([X, apogeeRatio(X)]); }
        return { x: { label: 'Spin parameter $GV_B^2$' }, y: { label: '$p_A/p_B$' }, yDomain: [0, 1], series: [{ name: '$p_A/p_B$', points: pts, smooth: true }],
          markers: [{ x: out.o.X, y: apogeeRatio(out.o.X), label: 'your rocket' }] };
      },
    },
  ],
  schematicTitle: 'The spin from the launcher to apogee',
  schematicHint: 'Left: the flight to scale in height, with the roll drawn as a helix (one wave per turn) coloured by the roll rate against your in-flight limit. Right: the rear view spinning at the peak rate, and one fin seen from its tip with the cant angle. Drag the fin’s trailing edge to change the cant, or the burnout mark to change the burnout height',
  schematic(ctx, v, out) {
    const W = 800, H = 420, o = out.o, sg = Math.sign(v.delta) || 1;
    const fr = ctx.frame({ width: W, height: H, label: 'Roll history from the launcher to apogee, the spinning rear view and the fin cant' });
    const g = fr.layer('main'); g.replaceChildren();
    const ua = ctx.U(ALT), A = (h) => `${fmt(ua.v(h), { digits: 3 })} ${ua.plain}`, Hz = (p) => `${fmt(hz(p), { digits: 3 })} Hz`;
    const stCol = (r) => (r <= 1 ? 'var(--text-2)' : r <= MARGIN ? 'var(--warn)' : 'var(--danger)');
    // flight column to scale in height: ground y0, apogee yA
    const cx = 120, y0 = 372, yA = 50, w = 22, Y = (h) => y0 - (h / o.hA) * (y0 - yA);
    g.append(s('line', { x1: 40, x2: 300, y1: y0, y2: y0, class: 'sc-line' }));
    for (let x = 44; x < 300; x += 12) g.append(s('line', { x1: x, y1: y0, x2: x - 8, y2: y0 + 8, class: 'sc-thin', 'stroke-opacity': 0.5 }));
    const yL = Math.min(y0 - 8, Y(v.L));
    g.append(s('line', { x1: cx, x2: cx, y1: y0, y2: yL, stroke: 'var(--text-2)', 'stroke-width': 4, 'data-field': 'L' }));
    g.append(s('line', { x1: cx, x2: cx, y1: y0, y2: yA, class: 'sc-thin', 'stroke-dasharray': '10 4 2 4' }));
    // height dimension, ground to apogee and to burnout
    const dimV = (x, ya, yb, label, field) => {
      g.append(s('line', { x1: x, x2: x, y1: ya, y2: yb, class: 'sc-dim', 'marker-start': fr.arrow(), 'marker-end': fr.arrow(), 'data-field': field }));
      const t = text(x - 6, (ya + yb) / 2, label, { anchor: 'middle', size: 10.5, cls: 'sc-dim-text', field });
      t.setAttribute('transform', `rotate(-90 ${x - 6} ${(ya + yb) / 2})`); g.append(t);
    };
    dimV(34, yA, y0, `h_A = ${A(o.hA)}`, 'hB VB');
    dimV(64, Y(v.hB), y0, `h_B = ${A(v.hB)}`, 'hB');
    for (const yy of [yA, Y(v.hB)]) g.append(s('line', { x1: yy === yA ? 30 : 60, x2: cx - w - 4, y1: yy, y2: yy, class: 'sc-thin', opacity: 0.5 }));
    // helix: x = cx + w sin φ, coloured by |p| against the in-flight limit
    const rows = [...o.hist, ...o.coast.slice(1)], turns = Math.abs(o.phiA) / TAU, many = turns > 45;
    if (!many) {
      let run = [], col = null;
      const flush = () => { if (run.length > 1) g.append(s('path', { d: path(run), fill: 'none', stroke: col, 'stroke-width': 1.8, 'data-field': 'delta Ixx' })); };
      for (const r of rows) {
        const c = stCol(hz(r.p) / v.fMaxLim), pt = [cx + w * Math.sin(r.phi), Y(r.h)];
        if (c !== col && run.length) { run.push(pt); flush(); run = []; }
        col = c; run.push(pt);
      }
      flush();
    } else {
      g.append(s('rect', { x: cx - w, y: yA, width: 2 * w, height: y0 - yA, fill: stCol(out.r.peak), 'fill-opacity': 0.15, 'data-field': 'delta Ixx' }));
      g.append(text(cx, (y0 + yA) / 2, `${fmt(turns, { digits: 3 })} turns:`, { anchor: 'middle', size: 10, cls: 'sc-dim-text' }));
      g.append(text(cx, (y0 + yA) / 2 + 13, 'too many to draw', { anchor: 'middle', size: 10, cls: 'sc-dim-text' }));
    }
    // callouts, pushed apart so they never overlap
    const near = Math.abs(o.tMax - o.tB) < 0.04 * o.tA;
    const calls = [
      { y: yA, title: `apogee · ${fmt(o.tA, { digits: 3 })} s`, line: `p_A = ${Hz(o.pA)} · ${fmt(turns, { digits: 3 })} turns in all`, col: stCol(out.r.apo), field: 'rhoA fApoLim' },
      ...(near ? [] : [{ y: Y(o.hMax), title: `peak spin · ${fmt(o.tMax, { digits: 3 })} s`, line: `p = ${Hz(o.pMax)} (${rpm(o.pMax)})`, col: stCol(out.r.peak), field: 'Ixx fMaxLim' }]),
      { y: Y(v.hB), title: `burnout${near ? ' = peak spin' : ''} · ${fmt(o.tB, { digits: 3 })} s`, line: `p_B = ${Hz(o.pB)} · ${fmt(Math.abs(o.phiB) / TAU, { digits: 3 })} turns so far`, col: near ? stCol(out.r.peak) : 'var(--text-2)', field: 'hB VB' },
      { y: yL, title: `leaves launcher · ${fmt(o.t0, { digits: 3 })} s`, line: 'spin starts from 0', col: 'var(--text-2)', field: 'L' },
    ];
    let prev = -Infinity;
    for (const c of calls) { c.ly = Math.max(c.y, prev + 34); prev = c.ly; }
    const over = calls.at(-1).ly - (y0 - 14); if (over > 0) for (const c of calls) c.ly -= over;
    for (const c of calls) {
      g.append(s('path', { d: `M${cx + w + 6},${c.y}H${cx + w + 30}L${196},${c.ly}H${206}`, fill: 'none', class: 'sc-thin', opacity: 0.6 }));
      g.append(text(212, c.ly - 2, c.title, { size: 11, field: c.field }));
      const t = text(212, c.ly + 13, c.line, { size: 10.5, field: c.field }); t.style.fill = c.col; g.append(t);
    }
    ctx.handle('burnout', cx, Y(v.hB), { field: 'hB', title: 'Drag up or down to change the burnout height',
      onDrag: (px, py) => ctx.setValue('hB', Math.max(v.L + 10, v.hB * Math.exp((Y(v.hB) - py) / 120)), { round: 10 }), onKey: (dx, dy) => ctx.setValue('hB', Math.max(v.L + 10, v.hB * (1 + 0.05 * dy)), { round: 10 }) });
    // rear view at the peak, spinning (slowed to ≤ 0.5 rev/s on screen), with the roll direction
    const f = hz(o.pMax), slow = f > 0.5 ? Math.ceil(f / 0.5) : 1, rcx = 600, rcy = 128, size = 74;
    const spin = f > 1e-3 && !reducedMotion() ? { dur: slow / f, dir: sg } : null;
    const dd = Math.max(0.06, Math.min(0.5, Math.abs(v.delta * RAD) * 25)) * sg;
    g.append(finEndView(rcx, rcy, size, { N: v.N, r: v.R, s: v.b, cant: dd, cR: v.cR, cT: v.cT, spin, field: 'N delta R span',
      caption: [`rear view at the peak · ${Hz(o.pMax)}${slow > 1 ? ` · shown ${slow}× slower` : ''}`] }));
    if (v.delta !== 0) {
      // the animation turns counter-clockwise on screen for a positive cant
      const ra = size + 18, a0 = -0.35 * Math.PI, a1 = -0.05 * Math.PI, P = (t) => [rcx + ra * Math.cos(t), rcy + ra * Math.sin(t)];
      const [p0, p1] = sg > 0 ? [P(a1), P(a0)] : [P(a0), P(a1)];
      g.append(s('path', { d: `M${p0[0]},${p0[1]}A${ra},${ra} 0 0 ${sg > 0 ? 0 : 1} ${p1[0]},${p1[1]}`, fill: 'none', class: 'sc-accent', 'stroke-width': 2, 'marker-end': fr.arrow('acc'), 'data-field': 'delta' }));
      g.append(text(rcx + ra * 0.78 + 8, rcy - ra * 0.78 - 4, 'roll', { size: 10.5, cls: 'sc-dim-text', field: 'delta' }));
    }
    // one fin seen from its tip: the chord at the cant angle (exaggerated) in the airflow, and the side force it makes
    const fx0 = 470, fy = 330, cl = 200 * Math.min(1, v.cR / Math.max(v.cR, 2 * (v.b - v.R), 6)), mag = 25;
    const drawn = Math.max(1.5, Math.min(30, Math.abs(v.delta) * mag)) * RAD * sg, cosd = Math.cos(drawn), sind = Math.sin(drawn);
    const lx = fx0 + 60, te = [lx + cl * cosd, fy + cl * sind];
    g.append(text(fx0 - 10, fy - 58, 'one fin, seen from its tip', { size: 11 }));
    g.append(s('line', { x1: fx0 - 10, x2: fx0 + 40, y1: fy - 24, y2: fy - 24, class: 'sc-thin', 'marker-end': fr.arrow() }));
    g.append(text(fx0 - 10, fy - 30, 'air', { size: 10, cls: 'sc-dim-text' }));
    g.append(s('line', { x1: lx - 10, x2: lx + cl + 40, y1: fy, y2: fy, class: 'sc-thin', 'stroke-dasharray': '8 3 2 3' }));
    g.append(text(lx + cl + 40, fy + 14, 'body axis', { anchor: 'end', size: 10, cls: 'sc-dim-text' }));
    g.append(s('path', { d: `M${lx},${fy}L${te[0]},${te[1]}`, stroke: 'var(--text)', 'stroke-width': 5, 'stroke-linecap': 'round', 'data-field': 'delta cR' }));
    const ar = 0.62 * cl;
    g.append(s('path', { d: `M${lx + ar},${fy}A${ar},${ar} 0 0 ${sg > 0 ? 1 : 0} ${lx + ar * cosd},${fy + ar * sind}`, fill: 'none', class: 'sc-dim', 'data-field': 'delta' }));
    g.append(text(lx + ar + 6, fy + (sg > 0 ? 36 : -24), `\\delta = ${fmt(v.delta, { digits: 3 })}° (drawn ×${mag}${Math.abs(v.delta) * mag > 30 || Math.abs(v.delta) * mag < 1.5 ? ', clipped' : ''})`, { size: 10.5, field: 'delta' }));
    if (v.delta !== 0) {
      const mx = lx + 0.45 * cl * cosd, my = fy + 0.45 * cl * sind;
      g.append(s('line', { x1: mx, y1: my, x2: mx, y2: my - sg * 34, class: 'sc-accent', 'stroke-width': 2, 'marker-end': fr.arrow('acc'), 'data-field': 'delta' }));
      g.append(text(mx + 6, my - sg * 26 + 4, 'side force turns the rocket', { size: 10, cls: 'sc-dim-text' }));
    }
    ctx.handle('cant', te[0], te[1], { field: 'delta', title: 'Drag up or down to change the cant angle',
      onDrag: (px, py) => ctx.setValue('delta', Math.max(-1.2, Math.min(1.2, (Math.atan2(py - fy, Math.max(20, px - lx)) / RAD) / mag)), { round: 0.01 }),
      onKey: (dx, dy) => ctx.setValue('delta', v.delta - 0.01 * dy, { round: 0.01 }) });
    g.append(text(16, H - 10, 'height to scale (no-drag coast); helix one wave per turn, width not to scale; colour: grey within your limit, amber up to 1.25×, red above', { size: 10, cls: 'sc-dim-text' }));
  },
  symbols: {
    I_R: 'roll moment of inertia (slug ft² or kg m²)', p: 'roll rate (rad/s; shown in Hz)', t: 'time (s)', q: 'dynamic pressure (lbf/ft² or Pa)', S: 'reference area πR² (ft² or m²)', d: 'reference length 2R (ft or m)', U: 'flight speed (ft/s or m/s)',
    'C_{Lp}': 'roll-damping derivative of all fins (per radian)', 'C_{L\\delta}': 'roll-driving derivative of one fin (per radian)', '\\delta': 'fin cant angle (rad or °)', '\\delta_i': 'cant angle of fin $i$ (rad)', N: 'number of fins',
    '\\lambda_{R0}': 'roll wave number without inertia (rad/ft or rad/m)', '\\lambda_R': 'roll wave number (rad/ft or rad/m)', J: 'roll-lag parameter (dimensionless)', k: 'roll-lag length (ft or m)', '\\rho': 'air density during the boost (slug/ft³ or kg/m³)', '\\rho_A': 'air density at apogee (slug/ft³ or kg/m³)',
    R: 'body radius (in or mm)', b: 'fin tip radius from the centre line (in or mm)', s: 'exposed fin span (in or mm)', h: 'height above the launcher base (ft or m)', h_B: 'burnout height (ft or m)', h_A: 'apogee height without drag (ft or m)', L: 'launcher length (ft or m)', V_B: 'burnout speed (ft/s or m/s)', p_B: 'roll rate at burnout (Hz)', p_A: 'roll rate at apogee (Hz)',
    'p_{peak}': 'largest roll rate in flight (Hz)', 'p_{max}': 'your largest accepted roll rate in flight (Hz)', 'p_{A,max}': 'your limit on the apogee roll rate (rev/s)', '\\delta_{max}': 'largest cant within your limits (°)',
    G: 'apogee damping parameter (s²/ft² or s²/m²)', g: 'acceleration of gravity (ft/s² or m/s²)', a: 'half the apogee spin parameter (dimensionless)', '\\phi': 'roll angle (rad)', '\\Delta\\phi': 'roll angle turned (rad)',
    c_R: 'root chord (mm or in)',
    c_T: 'tip chord (mm or in)',
    'c(y)': 'chord at distance $y$ from the axis (mm or in)',
    y: 'distance from the rocket axis (mm or in)',
    't_{peak}': 'time of the peak roll rate (s)',
    '\\lambda_{R0}V_B': 'burnout roll rate without inertia (rev/s)',
    'GV_B^2': 'apogee spin parameter',
  },
  constants: [{ sym: 'g', desc: 'acceleration of gravity', si: [9.80665, '\\mathrm{m\\,s^{-2}}'], us: [G0, '\\mathrm{ft\\,s^{-2}}'] }],
  report(v, out, R) {
    const o = out.o, n = R.n, rate = (p) => `${n(p / TAU)}\\,\\mathrm{Hz}`;
    const steps = [
      { label: 'Roll derivatives of the fin set by strip theory (see the Fin Cant Angle calculator)', lhs: 'C_{L\\delta}', res: `${n(out.der.CLd)}\\,\\mathrm{rad^{-1}}` },
      { lhs: 'C_{Lp}', res: n(out.der.CLp) },
      { label: 'Roll wave number without roll inertia', lhs: '\\lambda_{R0}', eq: '-\\frac{2C_{L\\delta}N\\delta}{d\\,C_{Lp}}', sub: `-\\frac{2\\times${n(out.der.CLd)}\\times${v.N}\\times${n(v.delta * RAD)}}{${R.v((2 * v.R) / 12, DIST)}\\,${R.u(DIST)}\\times(${n(out.der.CLp)})}`, res: R.Q(o.lam0, WAVE) },
      { label: 'Roll-lag length and lag parameter at burnout', lhs: 'k', eq: '\\frac{I_R}{2\\pi\\rho R^4C_{Lp}}', res: R.Q(o.k, DIST) },
      { lhs: 'J', eq: '\\frac{k}{h_B-L}', sub: `\\frac{${R.v(o.k, DIST)}}{${R.v(v.hB, ALT)}-${R.v(v.L, DIST)}}`, res: n(o.JB) },
      { label: 'Roll rate at burnout from integrating the roll equation from launcher exit (constant acceleration, $U^2=2ah$)', lhs: 'p_B', eq: '\\int_{t_L}^{t_B}\\frac{qSd}{I_R}\\left[C_{Lp}\\frac{pd}{2U}+C_{L\\delta}N\\delta\\right]dt', res: rate(o.pB) },
      { label: 'For comparison, the closed-form estimate', lhs: '\\frac{\\lambda_{R0}V_B}{1-J}', sub: `\\frac{${R.v(o.lam0, WAVE)}\\times${R.v(v.VB, SPEED)}}{1-(${n(o.JB)})}`, res: rate(o.pBapprox) },
      { label: 'Roll turns during boost', lhs: '\\frac{\\Delta\\phi}{2\\pi}', eq: '\\frac{1}{2\\pi}\\int_{t_L}^{t_B}p\\,dt', res: n(o.phiB / TAU) },
      { label: 'Apogee damping parameter', lhs: 'G', eq: '-\\frac{\\rho_A S d^2C_{Lp}}{4gI_R}', res: `${n(R.us ? o.G : o.G / 0.3048 ** 2)}\\,${R.us ? '\\mathrm{s^{2}\\,ft^{-2}}' : '\\mathrm{s^{2}\\,m^{-2}}'}` },
      { lhs: 'a', eq: '\\frac{GV_B^2}{2}', res: n(o.X / 2) },
      { label: 'Roll rate at apogee (coast with $dV/dt=-g$)', lhs: 'p_A', eq: 'p_Be^{-a}+\\lambda_{R0}V_B\\left[\\frac{\\sqrt\\pi\\,\\mathrm{erf}\\sqrt a}{2\\sqrt a}-e^{-a}\\right]', sub: `${n(o.pB / TAU)}e^{-${n(o.X / 2)}}+${n(o.pB0 / TAU)}\\left[${n(o.ratio)}-e^{-${n(o.X / 2)}}\\right]`, res: rate(o.pA) },
      { label: `Peak roll rate over the boost and the coast (the coast equation integrated step by step), at ${n(o.tMax)} s`, lhs: 'p_{peak}', eq: '\\max_t|p|', res: rate(Math.abs(o.pMax)) },
      { label: 'Largest cant within your limits (every rate is proportional to the cant)', lhs: '\\delta_{max}', eq: '\\frac{|\\delta|}{\\max\\left(\\frac{p_{peak}}{p_{max}},\\frac{p_A}{p_{A,max}}\\right)}', res: out.results.deltaMax === '—' ? '\\text{—}' : `${n(out.results.deltaMax)}^{\\circ}` },
    ];
    return [{
      title: 'Theory',
      text: 'For vertical flight at small angle of attack the roll equation is $I_R\\,dp/dt=qSd[C_{Lp}pd/2U+C_{L\\delta}\\sum\\delta_i]$. Neglecting inertia gives the roll wave number $\\lambda_{R0}=-2C_{L\\delta}\\sum\\delta_i/(d\\,C_{Lp})$, so $p=\\lambda_{R0}U$. With inertia the rate lags; the boost is integrated with constant acceleration from launcher exit, and the memo’s estimate $\\lambda_{R0}/(1-J)$ is shown for comparison. After burnout, with $dV/dt\\approx-g$, the equation $dp/dV-GVp=-HV^2$ is integrated to apogee; its end value is the closed form used for the apogee rate (Hoult). The limits are the user’s own, not published values.',
      steps,
    }];
  },
  references: ['boost-phase-roll-rate2', 'apogee-roll-rate', 'fin-setting-theory-3'],
  examples: [
    { name: 'Student rocket, 0.2° cant', values: { R: 3.125, span: 2.375, cR: 10, cT: 2, N: 4, cNa: 3.5, delta: 0.2, Ixx: 0.22, L: 18, hB: 2000, VB: 1037.2, rho: 0.0023, rhoA: 0.0019, fMaxLim: 2, fApoLim: 0.5 } },
    { name: 'Light payload, high burnout, camera aboard', values: { R: 3.125, span: 2.375, cR: 10, cT: 2, N: 4, cNa: 3.5, delta: 0.2, Ixx: 0.05, L: 18, hB: 5000, VB: 1400, rho: 0.0021, rhoA: 0.0012, fMaxLim: 1, fApoLim: 0.5 } },
    { name: 'Three fins, 0.5° cant', values: { R: 2, span: 2, cR: 8, cT: 3, N: 3, cNa: 3.5, delta: 0.5, Ixx: 0.06, L: 12, hB: 1500, VB: 800, rho: 0.0023, rhoA: 0.002, fMaxLim: 2, fApoLim: 0.5 } },
  ],
};
