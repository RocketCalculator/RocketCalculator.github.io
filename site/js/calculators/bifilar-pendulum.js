// Bifilar Pendulum Inertia — UI definition.
import { bifilar, periodRatio, uncertainty, cyclesFor, distErrorFor, spacingScale } from '../calc/bifilar.js';
import { s, fmt, reducedMotion } from '../util.js';
import { dim, path, text, pointMarker } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const D = { dim: 'distance', internal: 'm' };
const SMALL = { dim: 'length', internal: 'm' };
const RADIUS = { dim: 'length', internal: 'in' };
const T = { dim: 'time', internal: 's' };
const MASS = { dim: 'mass', internal: 'kg' };
const INERTIA = { dim: 'inertia', internal: 'kgm2' };
const FORCE = { dim: 'force', internal: 'N' };
const NONE = { dim: 'none' };
const PCT = { dim: 'percent', internal: 'pct' };
const IN = 0.0254;
// verdict bands (D37): modes closer than the user's ratio → REDO; error above the target or the
// wire-length cross-check outside the tolerance → CHECK. Project choices, not published limits.
const WORD = { safe: 'GOOD', marginal: 'CHECK', unsafe: 'REDO' };
const ST = { safe: 'ok', marginal: 'warn', unsafe: 'err' };
const show = (x, spec, d = 3) => `${fmt(toDisplay(x, spec), { digits: d })} ${unitLabel(displayUnit(spec))}`;
const sep = (r) => Math.max(r, 1 / r);   // how far the period ratio is from resonance, either side of 1

/** Everything the page shows, from the page values. */
function run(v) {
  const L = v.Lrod, xcg = Math.min(0.95 * L, Math.max(0.05 * L, v.xcg));   // CG kept on the rocket (warned below)
  const o = bifilar(v);
  const u = uncertainty(v);
  const cross = 100 * (o.I_length / o.I_periods - 1);
  const sepOK = sep(o.ratio) >= v.rmin, uOK = 100 * u.total <= v.uMax, crossOK = Math.abs(cross) <= v.crossTol;
  const lv = !sepOK ? 'unsafe' : !uOK || !crossOK ? 'marginal' : 'safe';
  const f = spacingScale(o.k, v.x1, v.x2, v.rmin);
  const N0 = cyclesFor(v, v.uMax / 100), Nreq = N0 && N0 <= 1000 ? N0 : null;   // over 1000 cycles is not a practical fix
  const dxReq = distErrorFor(v, v.uMax / 100);
  const lImplied = (v.g * v.PG * v.PG) / (4 * Math.PI ** 2);
  return { o, u, cross, sepOK, uOK, crossOK, lv, f, Nreq, dxReq, lImplied, xcg, L };
}

export default {
  slug: 'bifilar-pendulum',
  topic: 'bifilar-pendulum',
  title: 'Bifilar Pendulum Inertia',
  subtitle: 'Measure a rocket’s <b>pitch/yaw moment of inertia</b> by hanging it level from two wires and timing two kinds of swing — and check the measurement can be trusted.',
  verdict: true,
  tiers: true,
  intro: {
    what: 'Turns two stopwatch periods — the yaw (twisting) swing and the side-to-side swing — into the as-built moment of inertia, with its uncertainty and a check that the two swings were not confused.',
    why: 'Pitch/yaw inertia sets how fast the rocket weathercocks and damps out a disturbance. Measuring it is like weighing the rocket instead of adding up a parts list.',
    when: 'After assembly: plan the rig (where to put the wires, how many swings to time) before you hang the rocket, then enter what you timed.',
  },
  info: {
    text: [
      'The rocket hangs level from two equal vertical wires a distance $x_1$ and $x_2$ either side of its centre of gravity. Twisted about the vertical and released, it swings in <b>yaw</b> with a period that grows with its moment of inertia.',
      'Swung sideways it is a simple pendulum, whose period depends only on the wire length. The ratio of the two periods gives the inertia without needing the wire length or g.',
      '<b>The trap:</b> the two swings are coupled. If their periods are close you will time the wrong one. Keep the wires close to the CG so the yaw period is well above the swing period.',
    ],
    tex: 'I=m\\,x_1x_2\\,\\frac{P_Y^2}{P_G^2}',
    steps: [
      'Enter the rocket as hung: mass, length, diameter and where its CG is.',
      'Place the wires: the spacing plot shows how close to the CG they can go before the distance errors grow.',
      'Hang it level, twist it gently without moving the plumb bob, and time many yaw cycles; then swing it sideways and time many swing cycles.',
      'Enter the periods and how many cycles you timed, and how accurately you can measure. Read the verdict: GOOD, CHECK or REDO, with what to change.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'rocket', title: 'Rocket, as hung',
      fields: [
        { id: 'm', label: 'Mass (as hung)', sym: 'm', ...MASS, default: 20, min: 0, minExclusive: true, max: 2000, slider: { min: 0.2, max: 60, step: 0.05 },
          info: { text: ['The total mass of everything that swings: the rocket plus any clamps or rings attached for the test.', 'Weigh it on a scale with the clamps on.', 'The inertia is proportional to the mass: 10 % more mass with the same periods means 10 % more inertia.'], tex: 'I=m\\,x_1x_2\\,\\frac{P_Y^2}{P_G^2}', range: 'Model rockets 0.2–2 kg (0.5–4 lb); high-power 3–25 kg (7–55 lb).', doc: 'analysis' } },
        { id: 'Lrod', label: 'Overall length', sym: 'L', ...D, default: 2.4, min: 0.1, max: 20, slider: { min: 0.3, max: 5, step: 0.01 },
          shared: { key: 'length', get: (v) => v.Lrod / IN, set: (v, x) => { v.Lrod = x * IN; } },
          info: { text: ['Nose tip to the end of the fins or nozzle.', 'Used for the drawing, to check the wires are on the rocket, and for the uniform-rod comparison. It does not enter the measured inertia.', 'A uniform rod of this length has $k = 0.289L$; real rockets usually come out a little below that.'], tex: 'I_{rod}=\\frac{mL^2}{12}', doc: 'design', range: '1–3 m (3–10 ft) for high-power rockets.' } },
        { id: 'R', label: 'Body radius', sym: 'R', ...RADIUS, default: 3, min: 0.2, max: 40, slider: { min: 0.5, max: 8, step: 0.01 }, shared: 'bodyR',
          info: { text: ['Half the body tube’s outside diameter.', 'Measure the tube and halve it.', 'Only used to draw the rocket to scale; it does not enter the inertia.'], range: '1–3 in (25–76 mm) for high-power rockets.', doc: 'design', tex: 'R=D/2' } },
        { id: 'xcg', label: 'CG from the nose tip', sym: 'x_{cg}', ...D, default: 1.3, min: 0.01, max: 20, slider: { min: 0.1, max: 4, step: 0.005 },
          info: { text: ['Where the rocket balances, measured from the nose tip, in the configuration you hang it.', 'Balance it on a straight edge; mark the point. Hang the plumb bob there.', 'The wires are placed relative to this point; the CG must lie between them (memo).'], range: 'Usually 55–65 % of the length from the nose.', doc: 'overview', tex: 'x_1+x_2=s,\\quad x_{cg}\\ \\text{between the wires}' } },
      ],
    },
    {
      id: 'rig', title: 'Rig',
      fields: [
        { id: 'x1', label: 'Forward wire to CG', sym: 'x_1', ...D, default: 0.3, min: 0, minExclusive: true, max: 10, slider: { min: 0.02, max: 1.5, step: 0.005 },
          info: { text: ['Horizontal distance from the CG mark to the forward wire’s clamp.', 'Measure along the body with a tape from the plumb-bob mark.', 'Closer wires make the yaw period longer, which separates it from the swing (good), but a fixed tape error becomes a larger share of a short distance. Drag the forward wire in the drawing.'], tex: '\\frac{P_Y}{P_G}=\\frac{k}{\\sqrt{x_1x_2}}', range: 'Keep $\\sqrt{x_1x_2}$ well below the radius of gyration $k$ (about a quarter of the length).', doc: 'design' } },
        { id: 'x2', label: 'Aft wire to CG', sym: 'x_2', ...D, default: 0.3, min: 0, minExclusive: true, max: 10, slider: { min: 0.02, max: 1.5, step: 0.005 },
          info: { text: ['Horizontal distance from the CG mark to the aft wire’s clamp.', 'The two distances need not be equal; the aft wire then carries less of the weight.', 'Same effect as the forward distance: the result depends on the product $x_1x_2$. Drag the aft wire in the drawing.'], tex: 'T_2=\\frac{mg\\,x_1}{x_1+x_2}', doc: 'analysis', range: 'Like the forward wire: often 10–30 % of the rocket length from the CG.' } },
        { id: 'l', label: 'Wire length', sym: 'l', ...D, default: 2.0, min: 0.1, max: 20, slider: { min: 0.3, max: 5, step: 0.01 },
          info: { text: ['Length of each (equal) wire from the ceiling to the clamp.', 'The memo’s result does not need it: it is used to predict the swing period and cross-check your timing.', 'Longer wires make both periods longer in the same proportion, so the ratio — and the separation — does not change. Drag the bottom of the length dimension.'], tex: 'P_G=2\\pi\\sqrt{l/g}', range: '1–3 m (3–10 ft) from a ceiling or beam.', doc: 'analysis' } },
        { id: 'g', label: 'Local gravity', sym: 'g', dim: 'accel', internal: 'ms2', default: 9.80665, min: 9.7, max: 9.84, slider: { min: 9.76, max: 9.84, step: 0.0005 },
          info: { text: ['How strongly things fall where you do the test.', 'The Atmosphere & Gravity calculator gives it from your latitude and height.', 'Only the cross-check uses it; the inertia from the two periods does not.'], range: '9.78 m/s² (equator) to 9.83 m/s² (poles); 32.1–32.3 ft/s².', doc: 'analysis', tex: '\\omega_G^2=\\frac{g}{l}' } },
      ],
    },
    {
      id: 'meas', title: 'What you timed',
      fields: [
        { id: 'PY', label: 'Yaw period', sym: 'P_Y', ...T, default: 5.87, min: 0, minExclusive: true, max: 120, slider: { min: 0.5, max: 15, step: 0.01 },
          info: { text: ['Time for one full twist and back: nose and tail always on opposite sides of the floor line.', 'Time many cycles with a stopwatch and divide by the number of cycles.', 'The inertia grows with the square of this period: 1 % longer gives 2 % more inertia.'], tex: '\\omega_Y^2=\\frac{mg\\,x_1x_2}{Il}', doc: 'two-modes', range: '2–10 s for amateur and sounding rockets.' } },
        { id: 'NY', label: 'Yaw cycles timed', sym: 'N_Y', ...NONE, default: 10, min: 1, max: 200, slider: { min: 1, max: 50, step: 1 },
          info: { text: ['How many full yaw cycles your stopwatch run covered.', 'Count crossings of the floor line by the nose: two crossings per cycle.', 'The stopwatch error is shared by all the cycles: timing twice as many halves the period error.'], tex: '\\delta P_Y=\\frac{\\delta t}{N_Y}', range: '10–20 cycles, until the swing dies down.', doc: 'quality' } },
        { id: 'PG', label: 'Swing period', sym: 'P_G', ...T, default: 2.84, min: 0, minExclusive: true, max: 60, slider: { min: 0.5, max: 6, step: 0.01 },
          info: { text: ['Time for one full sideways swing and back: nose and tail on the same side of the floor line at the same time.', 'Time many cycles and divide. It should come close to the predicted $2\\pi\\sqrt{l/g}$.', 'The inertia falls with the square of this period.'], tex: 'P_G=2\\pi\\sqrt{l/g}', doc: 'two-modes', range: 'Set by the wire length: $2\\pi\\sqrt{l/g}$, about 2.8 s for 2 m wires.' } },
        { id: 'NG', label: 'Swing cycles timed', sym: 'N_G', ...NONE, default: 10, min: 1, max: 200, slider: { min: 1, max: 50, step: 1 },
          info: { text: ['How many full sideways swings your stopwatch run covered.', 'Count the nose passing the floor line in the same direction.', 'More cycles share the stopwatch error: twice the cycles, half the timing error.'], tex: '\\delta P_G=\\frac{\\delta t}{N_G}', doc: 'quality', range: '10–20 cycles.' } },
      ],
    },
    {
      id: 'acc', title: 'How well you measure',
      fields: [
        { id: 'dt', label: 'Stopwatch error per run', sym: '\\delta t', ...T, default: 0.2, min: 0, max: 2, slider: { min: 0, max: 0.5, step: 0.01 },
          info: { text: ['How far off a hand-timed run can be: your reaction at the start plus at the stop.', 'Your own judgement. Repeat a run a few times and take the spread; a video with a frame counter is far better.', 'Its effect falls with the number of cycles timed.'], range: 'About 0.1–0.3 s by hand; 0.03 s from 30 fps video.', doc: 'quality', tex: '\\frac{\\delta P}{P}=\\frac{\\delta t}{NP}' } },
        { id: 'dx', label: 'Distance error', sym: '\\delta x', ...SMALL, default: 0.002, min: 0, max: 0.05, slider: { min: 0, max: 0.01, step: 0.0005 },
          info: { text: ['How far off each wire distance from the CG may be: tape reading, clamp width, CG mark.', 'Your own judgement for your tape and marks.', 'It matters more the closer the wires are to the CG: 2 mm is 0.7 % of 300 mm but 2 % of 100 mm.'], tex: 'u_I^2=\\left(\\frac{\\delta m}{m}\\right)^2+\\left(\\frac{\\delta x}{x_1}\\right)^2+\\left(\\frac{\\delta x}{x_2}\\right)^2+\\left(\\frac{2\\delta t}{N_YP_Y}\\right)^2+\\left(\\frac{2\\delta t}{N_GP_G}\\right)^2', range: '1–3 mm (0.04–0.12 in) with a tape.', doc: 'quality' } },
        { id: 'dm', label: 'Scale error', sym: '\\delta m', ...MASS, default: 0.05, min: 0, max: 100, slider: { min: 0, max: 0.5, step: 0.005 },
          info: { text: ['How far off your weighing may be.', 'From the scale’s resolution and calibration.', 'Usually the smallest error in the budget.'], range: '1–50 g on a kitchen or parcel scale.', doc: 'quality', tex: 'u_I^2=\\left(\\frac{\\delta m}{m}\\right)^2+\\left(\\frac{\\delta x}{x_1}\\right)^2+\\left(\\frac{\\delta x}{x_2}\\right)^2+\\left(\\frac{2\\delta t}{N_YP_Y}\\right)^2+\\left(\\frac{2\\delta t}{N_GP_G}\\right)^2' } },
      ],
    },
    {
      id: 'limits', title: 'Your limits',
      fields: [
        { id: 'rmin', label: 'Least period ratio you trust', sym: 'r_{min}', ...NONE, default: 1.5, min: 1.05, max: 4, slider: { min: 1.1, max: 3, step: 0.05 },
          info: { text: ['How far apart the two periods must be before you trust that you timed the right swing (either way round: $P_Y/P_G$ above it or below its inverse).', 'Your choice; the memo only says the ratio must not be close to 1 and shows that 1.155 is close enough to cause trouble. 1.5 is the default here (not a published limit).', 'A higher value forces the wires closer to the CG.'], range: '1.3–2.', doc: 'quality', tex: '\\frac{P_Y}{P_G}\\ge r_{min}' } },
        { id: 'uMax', label: 'Largest error you accept', sym: 'u_{max}', ...PCT, default: 5, min: 0.5, max: 50, slider: { min: 1, max: 20, step: 0.5 },
          info: { text: ['The uncertainty of the inertia you can live with.', 'Depends on the use: a stability or roll analysis is rarely better than 5–10 %.', 'Lower targets need more cycles timed and better distance measurement.'], range: '2–10 %.', doc: 'quality', tex: 'u_I\\le u_{max}' } },
        { id: 'crossTol', label: 'Cross-check tolerance', sym: '\\epsilon_{max}', ...PCT, default: 3, min: 0.5, max: 50, slider: { min: 1, max: 20, step: 0.5 },
          info: { text: ['How far the inertia from the wire length may differ from the one from the two periods.', 'They differ only through the swing period: a gap points to a wrong wire length or a bad swing timing.', 'Your choice (not a published limit).'], tex: '\\epsilon=\\frac{I_l}{I}-1=\\left(\\frac{P_G}{2\\pi\\sqrt{l/g}}\\right)^2-1', range: '2–5 %.', doc: 'quality' } },
      ],
    },
  ],
  results: [
    { id: 'I_periods', label: 'Moment of inertia', sym: 'I', ...INERTIA, key: true, digits: 4, status: (x, out) => ST[out.lv],
      note: (x, out) => `± ${show(out.u.total * out.o.I_periods, INERTIA, 2)} (±${fmt(100 * out.u.total, { digits: 2 })} %)`,
      info: { text: ['The pitch/yaw moment of inertia about the CG: how hard the rocket is to swing nose-over.', 'From the ratio of the two measured periods (memo).', 'The ± is the first-order uncertainty from your measurement errors.'], tex: 'I=m\\,x_1x_2\\,\\frac{P_Y^2}{P_G^2}', doc: 'analysis' } },
    { id: 'ratio', label: 'Period ratio', sym: 'P_Y/P_G', ...NONE, key: true, digits: 3, status: (x, out) => (out.sepOK ? 'ok' : 'err'),
      note: (x, out) => (out.sepOK ? `apart: your limit ${fmt(out.v.rmin, { digits: 3 })}` : `too close to 1 (limit ${fmt(out.v.rmin, { digits: 3 })})`),
      info: { text: ['How many times longer the yaw period is than the swing period.', 'Near 1 the two swings mix and the wrong one is easily timed (memo). Wires closer to the CG raise it.', 'Read the spacing plot to see where your rig sits.'], tex: '\\frac{P_Y}{P_G}=\\frac{k}{\\sqrt{x_1x_2}}', doc: 'design' } },
    { id: 'unc', label: 'Uncertainty of the inertia', sym: 'u_I', ...PCT, key: true, digits: 2, status: (x, out) => (out.uOK ? 'ok' : 'warn'),
      note: (x, out) => `largest share: ${out.biggest}`,
      info: { text: ['How far the inertia may be off, from your stopwatch, tape and scale errors (first order, independent, root-sum-square: standard error propagation, not from the memo).', 'Periods count twice because they are squared.', 'The budget plot shows which measurement to improve.'], tex: 'u_I^2=\\left(\\frac{\\delta m}{m}\\right)^2+\\left(\\frac{\\delta x}{x_1}\\right)^2+\\left(\\frac{\\delta x}{x_2}\\right)^2+\\left(\\frac{2\\delta t}{N_YP_Y}\\right)^2+\\left(\\frac{2\\delta t}{N_GP_G}\\right)^2', doc: 'quality' } },
    { id: 'k', label: 'Radius of gyration', sym: 'k', ...D, digits: 3,
      note: (v, out) => `${fmt((100 * out.o.k) / out.L, { digits: 3 })} % of length (uniform rod 28.9 %)`,
      info: { text: ['The distance from the CG at which all the mass, put in one ring, would give the same inertia.', 'A uniform rod has 28.9 % of its length; heavy ends raise it, a heavy middle lowers it.', 'It sets how close the wires must be: $\\sqrt{x_1x_2}$ well under $k$.'], tex: 'k=\\sqrt{I/m}', doc: 'design' } },
    { id: 'I_length', label: 'Inertia from the wire length (cross-check)', sym: 'I_l', ...INERTIA, digits: 4,
      info: { text: ['The same yaw swing, but using the wire length and g instead of the swing period. It should agree with the main result.'], tex: 'I_l=\\frac{mg\\,x_1x_2P_Y^2}{4\\pi^2 l}', doc: 'analysis' } },
    { id: 'cross', label: 'Cross-check difference', sym: '\\epsilon', ...PCT, digits: 3,
      info: { text: ['How far the wire-length inertia is from the main result.'], tex: '\\epsilon=\\frac{I_l}{I}-1', doc: 'quality' } },
    { id: 'PG_theory', label: 'Predicted swing period', sym: 'P_{G,pred}', ...T, digits: 4, info: { text: ['Simple-pendulum period for your wire length.'], tex: 'P_{G,pred}=2\\pi\\sqrt{l/g}', doc: 'analysis' } },
    { id: 'lImplied', label: 'Wire length your swing implies', sym: 'l_G', ...D, digits: 4, info: { text: ['The wire length that would give your measured swing period.'], tex: 'l_G=\\frac{gP_G^2}{4\\pi^2}', doc: 'quality' } },
    { id: 'uYaw', label: 'Error share: yaw timing', ...PCT, digits: 2, info: { text: ['The part of the inertia error that comes from timing the yaw swing.'], tex: '\\frac{2\\,\\delta t}{N_YP_Y}', doc: 'quality' } },
    { id: 'uSwing', label: 'Error share: swing timing', ...PCT, digits: 2, info: { text: ['The part of the inertia error that comes from timing the sideways swing.'], tex: '\\frac{2\\,\\delta t}{N_GP_G}', doc: 'quality' } },
    { id: 'uDist', label: 'Error share: wire distances', ...PCT, digits: 2, info: { text: ['The part of the inertia error that comes from measuring the wire distances from the CG.'], tex: '\\delta x\\sqrt{\\frac{1}{x_1^2}+\\frac{1}{x_2^2}}', doc: 'quality' } },
    { id: 'uMass', label: 'Error share: mass', ...PCT, digits: 2, info: { text: ['The part of the inertia error that comes from weighing the rocket.'], tex: '\\frac{\\delta m}{m}', doc: 'quality' } },
    { id: 'Nreq', label: 'Cycles to time for your error target (each swing)', sym: 'N_{req}', ...NONE, digits: 3, info: { text: ['Fewest cycles of each swing that meet your error target; “—” when the distance and scale errors alone exceed it.'], doc: 'quality' } },
    { id: 'sMax', label: 'Widest wire spacing for your period ratio', sym: 's_{max}', ...D, digits: 3, info: { text: ['The largest spacing between the two wires (same split about the CG) that keeps the periods your least ratio apart.'], tex: 's_{max}=\\frac{k\\,(x_1+x_2)}{r_{min}\\sqrt{x_1x_2}}', doc: 'quality' } },
    { id: 'T1', label: 'Forward wire tension', sym: 'T_1', ...FORCE, digits: 3, info: { text: ['Static pull in the forward wire.'], tex: 'T_1=\\frac{mg\\,x_2}{x_1+x_2}', doc: 'analysis' } },
    { id: 'T2', label: 'Aft wire tension', sym: 'T_2', ...FORCE, digits: 3, info: { text: ['Static pull in the aft wire.'], tex: 'T_2=\\frac{mg\\,x_1}{x_1+x_2}', doc: 'analysis' } },
    { id: 'I_rod', label: 'Uniform-rod inertia (same m, L)', sym: 'I_{rod}', ...INERTIA, digits: 4, info: { text: ['A uniform rod of the same mass and length: a check on the order of magnitude.'], tex: 'I_{rod}=\\frac{mL^2}{12}', doc: 'design' } },
  ],
  compute(v) {
    const r = run(v), { o, u } = r;
    const shares = [['yaw timing', u.yaw], ['swing timing', u.swing], ['wire distances', u.dist], ['mass', u.mass]].sort((a, b) => b[1] - a[1]);
    const ud = (x) => show(x, D, 3), Iu = (x) => show(x, INERTIA, 3);
    const fixes = [];
    if (!r.sepOK) {
      // scaling both distances by f puts the ratio exactly on the limit (P_Y/P_G ∝ 1/f)
      const to = v.x1 === v.x2 ? `both wires to <b>≤ ${ud(r.f * v.x1)}</b> from the CG (now ${ud(v.x1)})` : `the wires to <b>$x_1$ ≤ ${ud(r.f * v.x1)}, $x_2$ ≤ ${ud(r.f * v.x2)}</b> (now ${ud(v.x1)}, ${ud(v.x2)})`;
      fixes.push(`Move ${to} and re-time: $P_Y$ ≈ ${fmt(v.rmin * v.PG, { digits: 3 })} s.`);
    }
    if (!r.uOK) {
      if (r.Nreq) fixes.push(`Time at least <b>${r.Nreq} cycles</b> of each swing (now ${v.NY} yaw, ${v.NG} swing).`);
      if (r.dxReq) fixes.push(`Measure the wire distances to within <b>±${show(r.dxReq, SMALL, 2)}</b> (now ±${show(v.dx, SMALL, 2)}).`);
      if (!r.Nreq && !r.dxReq) fixes.push(`Weigh more accurately or measure closer: the scale and distance errors alone exceed ${fmt(v.uMax, { digits: 3 })} %.`);
    }
    if (!r.crossOK) fixes.push(`Re-measure the wires: your swing implies <b>$l$ = ${ud(r.lImplied)}</b> (entered ${ud(v.l)}), or re-time the swing (expect ${fmt(o.PG_theory, { digits: 3 })} s).`);
    const title = r.lv === 'safe' ? 'A trustworthy measurement: swings well apart, error within target'
      : r.lv === 'unsafe' ? 'The two swings are too close in period: you may have timed the wrong one'
        : !r.uOK ? 'Less precise than your target' : 'The two inertia estimates disagree: check the wire length or the swing timing';
    const verdict = {
      level: r.lv, word: WORD[r.lv], title,
      text: `$I$ = <b>${Iu(o.I_periods)} ± ${fmt(100 * u.total, { digits: 2 })} %</b>; $P_Y/P_G$ = <b>${fmt(o.ratio, { digits: 3 })}</b> (yours ≥ ${fmt(v.rmin, { digits: 3 })}); the wire-length check gives ${Iu(o.I_length)} (${r.cross >= 0 ? '+' : ''}${fmt(r.cross, { digits: 2 })} %).`,
      fixes: fixes.slice(0, 3),
    };
    const warnings = [];
    if (v.xcg !== r.xcg) warnings.push({ level: 'warn', text: `The CG (${ud(v.xcg)} from the nose) is not on the rocket (length ${ud(v.Lrod)}); it is drawn at ${ud(r.xcg)}.`, fix: 'Enter the balance point measured from the nose tip.' });
    if (r.xcg - v.x1 < 0 || r.xcg + v.x2 > v.Lrod) warnings.push({ level: 'warn', text: 'A wire is placed beyond the end of the rocket.', fix: `Keep $x_1$ ≤ ${ud(r.xcg)} and $x_2$ ≤ ${ud(v.Lrod - r.xcg)}.` });
    if (o.ratio < 1 && r.sepOK) warnings.push({ level: 'info', text: `The yaw is faster than the swing ($P_Y/P_G$ = ${fmt(o.ratio, { digits: 3 })}): the wires are far from the CG. The memo recommends wires close to the CG instead.` });
    const results = {
      I_periods: o.I_periods, ratio: o.ratio, unc: 100 * u.total, k: o.k, I_length: o.I_length, cross: r.cross, PG_theory: o.PG_theory, lImplied: r.lImplied,
      uYaw: 100 * u.yaw, uSwing: 100 * u.swing, uDist: 100 * u.dist, uMass: 100 * u.mass, Nreq: r.Nreq ?? '—',
      sMax: (r.f * (v.x1 + v.x2)), T1: o.T1, T2: o.T2, I_rod: (v.m * v.Lrod * v.Lrod) / 12,
    };
    return { results, warnings, verdict, ...r, biggest: shares[0][0], v };
  },
  plots: [
    {
      id: 'spacing', title: 'Where to put the wires', wide: true, height: 420,
      info: { text: ['Both wire distances scaled together (same split about the CG), for your rocket’s measured inertia. Top: the yaw period you would time, and the swing period — where they cross, the swings resonate. Bottom: the uncertainty of the inertia, from the wire distances (grows as the wires close in) and the timing (shrinks, because the yaw slows down).', 'The red lines bound the spacings where the periods are closer than your least ratio. Pick a spacing left of them with the total under your target.'], doc: 'quality' },
      build(v, out, { U }) {
        const ud = U(D), k = out.o.k, q = v.x1 / (v.x1 + v.x2), gm = Math.sqrt(q * (1 - q));   // √(x1x2) = gm·s
        const sNow = v.x1 + v.x2, sRes = k / gm, sLo = sRes / v.rmin, sHi = sRes * v.rmin;
        const top = Math.max(1.25 * sHi, 1.2 * sNow), pts = [];
        for (let i = 0; i <= 160; i++) {
          const sp = top * (0.02 + (0.98 * i) / 160), x1 = q * sp, x2 = (1 - q) * sp, PY = (v.PG * k) / Math.sqrt(x1 * x2);
          const uu = uncertainty({ ...v, x1, x2, PY });
          pts.push({ x: ud.v(sp), PY, u: 100 * uu.total, d: 100 * uu.dist, t: 100 * uu.timing });
        }
        const P = (f) => pts.map((p) => [p.x, f(p)]);
        return {
          x: { label: 'Wire spacing $x_1+x_2$', unit: ud.label }, xDomain: [0, ud.v(top)],
          vlines: [{ x: ud.v(sNow), label: 'your rig', color: 'var(--text-2)' }, { x: ud.v(sLo), label: `$P_Y/P_G$ = ${fmt(v.rmin, { digits: 3 })}`, color: 'var(--danger)', row: 1 }, { x: ud.v(sHi), label: `$P_Y/P_G$ = 1/${fmt(v.rmin, { digits: 3 })}`, color: 'var(--danger)', row: 1 },
            ...(v.Lrod < top ? [{ x: ud.v(v.Lrod), label: 'rocket length', color: 'var(--text-3)', row: 2 }] : [])],
          panels: [
            { y: { label: 'Period', unit: 's' }, color: 'var(--series-1)', yDomain: [0, Math.max(3 * v.PG, 1.3 * v.PY)], series: [{ name: 'yaw $P_Y$', points: P((p) => p.PY) }, { name: 'swing $P_G$', dash: '7 4', color: 'var(--series-2)', points: P(() => v.PG) }] },
            { y: { label: 'Error', unit: '%' }, color: 'var(--series-4)', yDomain: [0, Math.max(2.5 * v.uMax, 1.5 * out.results.unc)], series: [{ name: 'total $u_I$', points: P((p) => p.u) }, { name: 'distances', dash: '7 4', color: 'var(--series-2)', points: P((p) => p.d) }, { name: 'timing', dash: '2 3', color: 'var(--series-3)', points: P((p) => p.t) }],
              hlines: [{ y: v.uMax, label: 'your target', color: 'var(--danger)' }] },
          ],
        };
      },
    },
    {
      id: 'budget', title: 'Error budget: how many cycles to time', wide: true,
      info: { text: ['The uncertainty of the inertia against the number of cycles timed in each swing, split by measurement. Timing errors fall as you time more cycles; the distance and mass errors do not, and set the floor.', 'Where the total crosses the red line is the fewest cycles that meet your target. If the floor is above the line, measure the distances more closely instead.'], doc: 'quality' },
      build(v, out) {
        const nTop = Math.min(2000, Math.max(40, Math.ceil(2 * Math.max(v.NY, v.NG, out.Nreq || 0)))), pts = [];
        for (let n = 1; n <= nTop; n += n < 10 ? 0.25 : 1) pts.push([n, uncertainty({ ...v, NY: n, NG: n })]);
        const S = (f) => pts.map(([n, uu]) => [n, 100 * f(uu)]);
        const now = 100 * out.u.total, mk = [{ x: Math.sqrt(v.NY * v.NG), y: now, label: `your measurement ${fmt(now, { digits: 2 })} %` }];
        if (out.Nreq && out.Nreq <= nTop) mk.push({ x: out.Nreq, y: 100 * uncertainty({ ...v, NY: out.Nreq, NG: out.Nreq }).total, label: `${out.Nreq} cycles`, color: 'var(--text-2)' });
        return {
          x: { label: 'Cycles timed in each swing $N$' }, y: { label: 'Error', unit: '%' }, xDomain: [0, nTop], yDomain: [0, Math.max(2.5 * v.uMax, 1.5 * now)],
          // single charts draw solid or dashed only: pairs share a colour, told apart by the dash
          series: [{ name: 'total $u_I$', points: S((uu) => uu.total), width: 2.5 }, { name: 'swing timing', points: S((uu) => uu.swing), color: 'var(--series-2)' },
            { name: 'yaw timing', dashed: true, points: S((uu) => uu.yaw), color: 'var(--series-2)' }, { name: 'wire distances', points: S((uu) => uu.dist), color: 'var(--series-5)' },
            { name: 'mass', dashed: true, points: S((uu) => uu.mass), color: 'var(--series-5)' }],
          hlines: [{ y: v.uMax, label: 'your target', color: 'var(--danger)' }], markers: mk,
        };
      },
    },
  ],
  schematicTitle: 'The rig, to scale, and the two swings',
  schematicHint: 'Front view of the rocket hanging on its two wires, to scale, with the wire pulls and the weight; the wires turn red when the two periods are closer than your limit. Right: the yaw seen from above and the swing seen from the end, animated at their periods. Drag a wire to move it, or the bottom of the length dimension to change the wire length',
  schematic(ctx, v, out) {
    const W = 800, H = 440, fr = ctx.frame({ width: W, height: H, label: 'Rocket hanging on two wires, front view to scale, with animated yaw and swing views' });
    const g = fr.layer('main'); g.replaceChildren();
    const ud = ctx.U(D), uf = ctx.U(FORCE), o = out.o, L = v.Lrod, R = v.R * IN, xcg = out.xcg;
    const L1 = (x) => `${fmt(ud.v(x), { digits: 3 })} ${ud.label}`;
    const sepCol = out.sepOK ? 'var(--ok)' : 'var(--danger)';
    // ---- front view, one scale both ways ----
    const xa = Math.min(0, xcg - v.x1), xb = Math.max(L, xcg + v.x2), VB = 215;
    const kh = 400 / (xb - xa), kv = VB / (v.l + 2 * R), k = Math.min(kh, kv);
    const x0 = 255 - ((xb - xa) * k) / 2, X = (x) => x0 + (x - xa) * k;
    const ceilY = 48, attachY = ceilY + v.l * k, rp = Math.max(3, R * k), cy = attachY + rp, thin = R * k < 3;
    const nose = X(0), tail = X(L), nl = Math.min(6 * rp, 0.3 * (tail - nose)), cr = Math.min(5 * rp, 0.18 * (tail - nose)), span = 2.4 * rp;
    g.append(s('path', { class: 'sc-body', 'data-field': 'Lrod R', d: `M${nose},${cy}C${nose + nl * 0.35},${cy - rp} ${nose + nl * 0.7},${cy - rp} ${nose + nl},${cy - rp}L${tail},${cy - rp}L${tail},${cy + rp}L${nose + nl},${cy + rp}C${nose + nl * 0.7},${cy + rp} ${nose + nl * 0.35},${cy + rp} ${nose},${cy}Z` }));
    g.append(s('line', { x1: nose + nl, x2: nose + nl, y1: cy - rp, y2: cy + rp, class: 'sc-thin' }));
    for (const sg of [-1, 1]) g.append(s('path', { class: 'sc-body-2', d: path([[tail - cr, cy + sg * rp], [tail - 0.25 * cr, cy + sg * (rp + span)], [tail, cy + sg * (rp + span)], [tail, cy + sg * rp]], true) }));
    // ceiling beam
    g.append(s('line', { x1: Math.min(X(xcg - v.x1), nose) - 14, x2: Math.max(X(xcg + v.x2), tail) + 14, y1: ceilY, y2: ceilY, class: 'sc-line', 'data-field': 'l' }));
    for (let xx = Math.min(X(xcg - v.x1), nose) - 10; xx < Math.max(X(xcg + v.x2), tail) + 14; xx += 12) g.append(s('line', { x1: xx, y1: ceilY, x2: xx + 7, y2: ceilY - 7, class: 'sc-thin', opacity: 0.55 }));
    // wires, clamps and their pulls (arrow length ∝ share of the weight)
    const w1 = X(xcg - v.x1), w2 = X(xcg + v.x2), cgX = X(xcg);
    for (const [wx, f, Tq, side] of [[w1, 'x1', o.T1, -1], [w2, 'x2', o.T2, 1]]) {
      g.append(s('path', { d: `M${wx},${ceilY}V${cy - rp}`, stroke: sepCol, 'stroke-width': 1.8, 'data-field': `${f} l` }));
      g.append(s('rect', { x: wx - 3, y: cy - rp - 2, width: 6, height: 2 * rp + 4, fill: 'var(--text)', 'data-field': f }));
      const aL = 14 + 46 * (Tq / (v.m * v.g)), ax = wx + side * 8;
      g.append(s('path', { d: `M${ax},${cy - rp - 4}V${cy - rp - 4 - aL}`, class: 'sc-accent', 'stroke-width': 2, 'marker-end': fr.arrow('acc') }));
      g.append(text(ax + side * 4, cy - rp - 8 - aL, `T_${f[1]} ${fmt(uf.v(Tq), { digits: 3 })} ${uf.label}`, { anchor: side < 0 ? 'end' : 'start', size: 10.5, field: f }));
    }
    // ---- dimensions below: x1 | x2 from the CG, then x_cg and L from the nose; plumb bob over the floor line ----
    const d1 = cy + rp + span + 22, d2 = d1 + 24, d3 = d2 + 24, bobY = d3 + 26;
    g.append(s('line', { x1: cgX, x2: cgX, y1: cy, y2: bobY - 9, class: 'sc-thin', 'stroke-dasharray': '3 3' }));
    g.append(s('path', { d: `M${cgX - 5},${bobY - 9}L${cgX + 5},${bobY - 9}L${cgX},${bobY + 1}Z`, class: 'sc-key', 'data-field': 'xcg' }));
    g.append(s('line', { x1: nose, x2: tail, y1: bobY + 5, y2: bobY + 5, class: 'sc-axis' }));
    g.append(text(nose, bobY + 18, 'floor line under the rocket at rest', { size: 10, cls: 'sc-dim-text' }));
    g.append(pointMarker(cgX, cy, null, { kind: 'cg', field: 'xcg' }));
    for (const wx of [w1, w2]) g.append(s('line', { x1: wx, x2: wx, y1: cy + rp + 4, y2: d1 + 5, class: 'sc-thin', opacity: 0.5 }));
    g.append(dim(fr, w1, d1, cgX, d1, `x_1 = ${L1(v.x1)}`, { labelPos: 'before', field: 'x1' }));
    g.append(dim(fr, cgX, d1, w2, d1, `x_2 = ${L1(v.x2)}`, { labelPos: 'after', field: 'x2' }));
    for (const xx of [nose, tail]) g.append(s('line', { x1: xx, x2: xx, y1: cy + 4, y2: d3 + 5, class: 'sc-thin', opacity: 0.4 }));
    g.append(dim(fr, nose, d2, cgX, d2, `x_{cg} = ${L1(xcg)}`, { labelPos: 'before', field: 'xcg' }));
    g.append(text(cgX + 10, bobY - 1, 'plumb bob', { size: 10, cls: 'sc-dim-text' }));
    g.append(dim(fr, nose, d3, tail, d3, `L = ${L1(L)}`, { labelPos: 'after', field: 'Lrod' }));
    // wire length, right of everything
    const lx = Math.max(w2, tail) + 26;
    g.append(dim(fr, w2, ceilY, w2, attachY, `l = ${L1(v.l)}`, { off: -(lx - w2), field: 'l' }));
    const head = text(18, 22, `P_Y/P_G = ${fmt(o.ratio, { digits: 3 })} · ${out.sepOK ? 'swings well apart' : 'swings too close: risk of timing the wrong one'}`, { size: 11.5, field: 'x1 x2' });
    head.setAttribute('style', `font-size:11.5px;fill:${sepCol};font-weight:600`);
    g.append(head);
    g.append(text(18, H - 10, `Front view to scale${thin ? ' (body drawn at least 6 px thick)' : ''} · weight ${fmt(uf.v(v.m * v.g), { digits: 3 })} ${uf.label}`, { size: 10, cls: 'sc-dim-text' }));
    // handles: the wires slide along the body; the wire length from the bottom of its dimension
    ctx.handle('x1', w1, (ceilY + cy) / 2, { field: 'x1', title: 'Drag to move the forward wire', onDrag: (px) => ctx.setValue('x1', Math.max(0.01, (cgX - px) / k), { round: 0.005 }), onKey: (dx) => ctx.setValue('x1', Math.max(0.01, v.x1 * (1 - 0.02 * dx))) });
    ctx.handle('x2', w2, (ceilY + cy) / 2, { field: 'x2', title: 'Drag to move the aft wire', onDrag: (px) => ctx.setValue('x2', Math.max(0.01, (px - cgX) / k), { round: 0.005 }), onKey: (dx) => ctx.setValue('x2', Math.max(0.01, v.x2 * (1 + 0.02 * dx))) });
    ctx.handle('l', lx, attachY, { field: 'l', title: 'Drag up or down to change the wire length', onDrag: (px, py) => {
      // the vertical scale may follow l: invert y = l·min(kh, VB/(l+2R)) for l
      const dpx = Math.max(10, Math.min(VB - 5, py - ceilY)), lh = dpx / kh, lv = (2 * R * dpx) / (VB - dpx);
      ctx.setValue('l', Math.max(0.1, Math.min(20, VB / (lh + 2 * R) >= kh ? lh : lv)), { round: 0.01 });
    }, onKey: (dx, dy) => ctx.setValue('l', Math.max(0.1, v.l * (1 - 0.02 * dy))) });

    // ---- the two swings, animated at their periods (same time scale) ----
    const slow = Math.min(v.PY, v.PG) >= 1.2 ? 1 : Math.ceil(1.2 / Math.min(v.PY, v.PG)), motion = !reducedMotion();
    const swing = (node, cx, cy0, amp, period) => {
      if (motion) node.append(s('animateTransform', { attributeName: 'transform', type: 'rotate', dur: `${Math.min(60, period * slow)}s`, repeatCount: 'indefinite', values: `${-amp} ${cx} ${cy0};${amp} ${cx} ${cy0};${-amp} ${cx} ${cy0}`, keyTimes: '0;0.5;1', calcMode: 'spline', keySplines: '0.45 0 0.55 1;0.45 0 0.55 1' }));
      else node.setAttribute('transform', `rotate(${amp} ${cx} ${cy0})`);
    };
    const bx = 586, bw = 202, bh = 186;
    // top view: yaw about the CG over the floor line
    const ty0 = 14, tcy = ty0 + 100, tk = (bw - 40) / L, tcx = bx + bw / 2 + (L / 2 - xcg) * tk;
    g.append(s('rect', { x: bx, y: ty0, width: bw, height: bh, rx: 6, fill: 'var(--surface-2)', stroke: 'var(--border)' }));
    g.append(text(bx + 10, ty0 + 17, 'FROM ABOVE · yaw', { cls: 'sc-dim-text', size: 10 }));
    g.append(s('line', { x1: bx + 8, x2: bx + bw - 8, y1: tcy, y2: tcy, class: 'sc-axis' }));
    g.append(text(bx + 10, tcy + 30, 'floor line', { size: 9, cls: 'sc-dim-text' }));   // clear of the yawing rocket
    const top = s('g', { 'data-field': 'PY' }), tr = Math.max(3, 0.5 * rp), tl0 = tcx - xcg * tk, tl1 = tl0 + L * tk;
    top.append(s('path', { class: 'sc-body', d: `M${tl0},${tcy}L${tl0 + 0.2 * L * tk},${tcy - tr}L${tl1},${tcy - tr}L${tl1},${tcy + tr}L${tl0 + 0.2 * L * tk},${tcy + tr}Z` }));
    top.append(s('circle', { cx: tcx - v.x1 * tk, cy: tcy, r: 2.6, fill: 'var(--text)' }), s('circle', { cx: tcx + v.x2 * tk, cy: tcy, r: 2.6, fill: 'var(--text)' }));
    swing(top, tcx, tcy, 14, v.PY);
    g.append(top, pointMarker(tcx, tcy, null, { kind: 'cg' }));
    g.append(text(bx + 10, ty0 + bh - 12, `P_Y = ${fmt(v.PY, { digits: 3 })} s · nose and tail opposite`, { cls: 'sc-dim-text', size: 10, field: 'PY' }));
    // end view: the swing as a pendulum
    const ey0 = ty0 + bh + 12, ecx = bx + bw / 2, ep = ey0 + 34, eL = 100, er = Math.max(6, Math.min(16, 0.25 * eL * (R / Math.max(v.l, 0.1)) * 6));
    g.append(s('rect', { x: bx, y: ey0, width: bw, height: bh, rx: 6, fill: 'var(--surface-2)', stroke: 'var(--border)' }));
    g.append(text(bx + 10, ey0 + 17, 'FROM THE NOSE · swing', { cls: 'sc-dim-text', size: 10 }));
    g.append(s('line', { x1: ecx - 40, x2: ecx + 40, y1: ep, y2: ep, class: 'sc-line' }));
    g.append(s('line', { x1: ecx, x2: ecx, y1: ep, y2: ep + eL + er + 18, class: 'sc-axis', 'stroke-dasharray': '3 3' }));
    const pend = s('g', { 'data-field': 'PG l' });
    pend.append(s('line', { x1: ecx, x2: ecx, y1: ep, y2: ep + eL, stroke: sepCol, 'stroke-width': 1.6 }));
    pend.append(s('circle', { cx: ecx, cy: ep + eL + er, r: er, class: 'sc-body' }));
    for (const a of [45, 135, 225, 315]) { const c = Math.cos((a * Math.PI) / 180), sn = Math.sin((a * Math.PI) / 180); pend.append(s('line', { x1: ecx + er * c, y1: ep + eL + er + er * sn, x2: ecx + 2 * er * c, y2: ep + eL + er + 2 * er * sn, class: 'sc-line' })); }
    swing(pend, ecx, ep, 12, v.PG);
    g.append(pend);
    g.append(text(bx + 10, ey0 + bh - 12, `P_G = ${fmt(v.PG, { digits: 3 })} s · nose and tail together`, { cls: 'sc-dim-text', size: 10, field: 'PG' }));
    g.append(text(bx + bw, H - 10, `${slow > 1 ? `shown ${slow}× slower` : 'true speed'} · angles exaggerated`, { anchor: 'end', size: 9.5, cls: 'sc-dim-text' }));
  },
  symbols: {
    m: 'mass of the suspended hardware (kg or lb)', x_1: 'distance from the CG to the forward wire (m or ft)', x_2: 'distance from the CG to the aft wire (m or ft)',
    l: 'length of each wire (m or ft)', g: 'local acceleration of gravity (m/s² or ft/s²)', P_Y: 'measured yaw period (s)', P_G: 'measured swing period (s)',
    I: 'pitch/yaw moment of inertia about the CG (kg·m² or slug·ft²)', I_l: 'inertia from the wire-length formula (kg·m² or slug·ft²)', T_1: 'pull in the forward wire (N or lbf)', T_2: 'pull in the aft wire (N or lbf)',
    k: 'radius of gyration, $\\sqrt{I/m}$ (m or ft)', '\\omega_Y': 'yaw natural frequency (rad/s)', '\\omega_G': 'swing natural frequency (rad/s)', '\\psi': 'small yaw angle (rad)', L: 'overall length of the rocket (m or ft)',
    'I_{rod}': 'inertia of a uniform rod of the same mass and length (kg·m² or slug·ft²)', 'P_{G,pred}': 'predicted swing period (s)', l_G: 'wire length implied by the measured swing (m or ft)',
    N_Y: 'number of yaw cycles timed', N_G: 'number of swing cycles timed', '\\delta t': 'stopwatch error per timed run (s)', '\\delta x': 'error of each wire distance (mm or in)', '\\delta m': 'error of the weighing (kg or lb)',
    '\\delta P_Y': 'error of the yaw period (s)', '\\delta P_G': 'error of the swing period (s)', '\\delta I': 'error of the inertia (kg·m² or slug·ft²)',
    u_I: 'relative uncertainty of the inertia (%)', 'r_{min}': 'least period ratio you trust', 'u_{max}': 'largest uncertainty you accept (%)', '\\epsilon': 'relative difference of the cross-check (%)', '\\epsilon_{max}': 'cross-check tolerance (%)',
    'x_{cg}': 'CG distance from the nose tip (m or ft)', R: 'body radius (mm or in)', 's_{max}': 'widest wire spacing for your period ratio (m or ft)', 'N_{req}': 'cycles to time for your error target',
    s: 'spacing between the two wires, $x_1+x_2$ (m or in)',
    D: 'body outside diameter (mm or in)',
    '\\delta P': 'period timing error (s)',
    P: 'period (s)',
    N: 'number of cycles timed',
  },
  report(v, out, R) {
    const o = out.o, u = out.u, n = R.n;
    const M = { dim: 'mass', internal: 'kg', units: { si: 'kg', us: 'slug' } }, G = { dim: 'accel', internal: 'ms2' };
    const m = R.v(v.m, M), x1 = R.v(v.x1, D), x2 = R.v(v.x2, D), l = R.v(v.l, D), g = R.v(v.g, G), PY = n(v.PY), PG = n(v.PG);
    const steps = [
      ...(R.us ? [{ label: 'Mass in slugs (so that inertia comes out in slug·ft²)', lhs: 'm', eq: `\\frac{${R.v(v.m, { dim: 'mass', internal: 'kg' })}\\,\\mathrm{lb}}{32.174}`, res: R.Q(v.m, M) }] : []),
      { label: 'Wire tensions from statics', lhs: 'T_1', eq: '\\frac{m g\\,x_2}{x_1+x_2}', sub: `\\frac{${m}\\times${g}\\times${x2}}{${x1}+${x2}}`, res: `${R.Q(o.T1, FORCE)},\\qquad T_2=\\frac{m g\\,x_1}{x_1+x_2}=${R.Q(o.T2, FORCE)}` },
      { label: 'Yaw and swing natural frequencies', lhs: '\\omega_Y^2', eq: '\\frac{m g\\,x_1x_2}{I\\,l},\\qquad \\omega_G^2=\\frac{g}{l}' },
      { label: 'Moment of inertia from the two measured periods ($\\omega=2\\pi/P$, $g/l$ eliminated)', lhs: 'I', eq: 'm\\,x_1x_2\\,\\frac{P_Y^2}{P_G^2}', sub: `${m}\\times${x1}\\times${x2}\\times\\frac{${PY}^2}{${PG}^2}`, res: R.Q(o.I_periods, INERTIA) },
      { label: 'Cross-check using the wire length', lhs: 'I_l', eq: '\\frac{m g\\,x_1x_2\\,P_Y^2}{4\\pi^2 l}', sub: `\\frac{${m}\\times${g}\\times${x1}\\times${x2}\\times${PY}^2}{4\\pi^2\\times${l}}`, res: `${R.Q(o.I_length, INERTIA)}\\quad(${n(out.cross, 3)}\\,\\%)` },
      { label: 'Predicted swing period (check on wire length and timing)', lhs: 'P_{G,pred}', eq: '2\\pi\\sqrt{l/g}', sub: `2\\pi\\sqrt{${l}/${g}}`, res: `${R.Q(o.PG_theory, T)}\\quad(\\text{measured } ${PG}\\,\\mathrm{s})` },
      { label: 'Radius of gyration', lhs: 'k', eq: '\\sqrt{I/m}', sub: `\\sqrt{${R.v(o.I_periods, INERTIA)}/${m}}`, res: R.Q(o.k, D) },
      { label: 'Mode separation (must not be close to 1)', lhs: '\\frac{P_Y}{P_G}', eq: '\\frac{k}{\\sqrt{x_1x_2}}', sub: `\\frac{${R.v(o.k, D)}}{\\sqrt{${x1}\\times${x2}}}`, res: `${n(o.ratio, 4)}\\quad(r_{min}=${n(v.rmin, 3)})` },
      { label: 'Uncertainty of the inertia (first-order propagation of independent errors)', lhs: 'u_I', eq: '\\sqrt{\\left(\\frac{\\delta m}{m}\\right)^2+\\left(\\frac{\\delta x}{x_1}\\right)^2+\\left(\\frac{\\delta x}{x_2}\\right)^2+\\left(\\frac{2\\delta t}{N_YP_Y}\\right)^2+\\left(\\frac{2\\delta t}{N_GP_G}\\right)^2}',
        sub: `\\sqrt{${n(u.mass, 3)}^2+${n(u.fwd, 3)}^2+${n(u.aft, 3)}^2+${n(u.yaw, 3)}^2+${n(u.swing, 3)}^2}`, res: `${n(100 * u.total, 3)}\\,\\%` },
    ];
    return [{
      title: 'Theory',
      text: 'The rocket hangs level from two equal vertical wires of length $l$, attached at distances $x_1$ and $x_2$ either side of its centre of gravity. Statics gives the wire tensions. For a small yaw angle $\\psi$ each wire leans by $x_i\\psi/l$, so the horizontal components of the tensions produce a restoring torque $mg\\psi x_1x_2/l$ and the yaw natural frequency is $\\omega_Y^2=mgx_1x_2/(Il)$. The same rig swung sideways is a simple pendulum with $\\omega_G^2=g/l$. Dividing one by the other eliminates $g/l$, so the inertia follows from the two measured periods (Hoult). The two modes are coupled; if their periods are close the wrong one is easily timed. The uncertainty is a standard first-order error propagation added here, not part of the memo.',
      steps,
    }];
  },
  references: ['bifilar-pendulum'],
  examples: [
    { name: 'Illustrative 2.4 m, 20 kg rocket, 10 cycles timed', values: { m: 20, Lrod: 2.4, R: 3, xcg: 1.3, x1: 0.3, x2: 0.3, l: 2.0, g: 9.80665, PY: 5.87, NY: 10, PG: 2.84, NG: 10, dt: 0.2, dx: 0.002, dm: 0.05, rmin: 1.5, uMax: 5, crossTol: 3 } },
    { name: 'Poor rig: wires too far apart (near resonance)', values: { m: 20, Lrod: 2.4, R: 3, xcg: 1.3, x1: 0.62, x2: 0.62, l: 2.0, g: 9.80665, PY: 2.95, NY: 10, PG: 2.84, NG: 10, dt: 0.2, dx: 0.002, dm: 0.05, rmin: 1.5, uMax: 5, crossTol: 3 } },
    { name: 'Model rocket, only 3 cycles timed', values: { m: 1.2, Lrod: 1.0, R: 1.3, xcg: 0.6, x1: 0.1, x2: 0.1, l: 1.0, g: 9.80665, PY: 5.43, NY: 3, PG: 2.01, NG: 3, dt: 0.2, dx: 0.002, dm: 0.005, rmin: 1.5, uMax: 5, crossTol: 3 } },
  ],
};
