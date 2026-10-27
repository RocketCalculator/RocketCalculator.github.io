// Payload Bay Venting — UI definition.
import { vent } from '../calc/vent.js';
import { criticalMach } from '../calc/nosepressure.js';
import { atmosphere } from '../calc/geophysics.js';
import { s, fmt, InputError } from '../util.js';
import { text, path, dim } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const LEN = { dim: 'length', internal: 'in' };
const ALT = { dim: 'altitude', internal: 'ft' };
const SPEED = { dim: 'speed', internal: 'fts' };
const VOL = { dim: 'volume', internal: 'ft3' };
const PRES = { dim: 'pressure', internal: 'psf', units: { si: 'kPa', us: 'psi' } };
const NONE = { dim: 'none' };
const PEEL = { dim: 'lineLoad', internal: 'lbfpin' };
const FORCE = { dim: 'force', internal: 'lbf' };
// verdict bands (DECISIONS D29): |Δp| against the allowable; up to 1.25× is marginal
const MARGIN = 1.25;
const ST = { safe: 'ok', marginal: 'warn', unsafe: 'err' };
// trajectory of the field tool's example (10 000 ft IREC rocket), every 0.5 s: time, height above the site, speed
const TRAJ = [[0, 0, 0], [0.5, 16.7, 83.9], [1, 87.3, 199.9], [1.5, 217.7, 322.6], [2, 410.4, 448.2], [2.5, 666, 573.8], [3, 983.3, 694.3], [3.5, 1357.8, 800.7], [4, 1780.9, 888.8], [4.5, 2242.9, 955.4],
  [5, 2733.1, 1002.5], [5.5, 3241.4, 1026.1], [6, 3753.9, 1018.1], [6.5, 4255.5, 985.3], [7, 4737.1, 939.3], [7.5, 5196.3, 898.5], [8, 5635.9, 860.3], [8.5, 6056.9, 824.1], [9, 6460.3, 789.6],
  [9.5, 6846.8, 756.8], [10, 7217.3, 725.4], [10.5, 7572.4, 695.3], [11, 7912.8, 666.4], [11.5, 8239, 638.7], [12, 8551.6, 611.9], [12.5, 8851.1, 586], [13, 9137.8, 561.1], [13.5, 9412.2, 536.8]].map(([t, h, V]) => ({ t, h, V }));
const SUPER = [[1, -0.0932], [1.1, -0.0494], [1.2, -0.0376], [1.3, -0.0335], [1.4, -0.0308], [1.5, -0.0288]].map(([M, cp]) => ({ M, cp }));
const P = (x) => `${fmt(toDisplay(x, PRES), { digits: 3 })} ${unitLabel(displayUnit(PRES))}`;

function checkRows(rows, keys, label) {
  if (rows.some((r) => keys.some((k) => !Number.isFinite(r[k])))) return 'Every cell needs a number.';
  for (let i = 1; i < rows.length; i++) if (rows[i][keys[0]] <= rows[i - 1][keys[0]]) return `${label} must increase down the table (row ${i}).`;
  return '';
}

/** Model run for page values v (optionally overriding the vent diameter and count). */
function run(v, d = v.d, N = v.N) {
  const A = (N * Math.PI * (d / 12) ** 2) / 4, a0 = Math.sqrt(1.4 * 1716.4827 * v.T0);
  const atm = (h) => { const a = atmosphere({ h, ho: v.ho, To: v.T0, phi: v.lat }); return { p: a.p, T: a.T }; };
  const tau = v.Vol / (A * v.Csonic * a0), dt = Math.min(0.01, Math.max(2e-4, tau / 20));   // resolve the venting time constant
  const quasi = tau < 20 * 2e-4;   // a step that cannot resolve τ would be unstable; the bay then tracks the outside pressure
  return { A, tau, ...vent({ traj: v.traj.map((r) => [r.t, v.ho + r.h, r.V]), atm, Vol: v.Vol, A, Cinc: v.Cinc, Csonic: v.Csonic, Cp0: v.Cp0, Mcr: v.Mcr, cpTable: v.super.map((r) => [r.M, r.cp]), dt, quasi }) };
}

/** Allowable pressure difference (lbf/ft²): taped door peeling (Hoult; Espinoza et al.) or the user's own value. */
const allowable = (v) => (v.limitMode === 'door' ? ((v.peel * 2 * (v.doorL + v.doorW)) / (v.doorL * v.doorW)) * 144 : v.dpAllow);
const door = (v) => v.limitMode === 'door';
/** History row at time t (nearest). */
const at = (hist, t) => hist.reduce((b, r) => (Math.abs(r.t - t) < Math.abs(b.t - t) ? r : b), hist[0]);

export default {
  slug: 'payload-venting',
  topic: 'venting',
  title: 'Payload Bay Venting',
  subtitle: 'How far the <b>pressure inside a vented payload bay</b> lags the air outside during the climb, whether the <b>doors and shell</b> can take it, and the vent size that fixes it.',
  verdict: true,
  tiers: true,
  intro: {
    what: 'Follows the air trapped in a payload bay as the rocket climbs. The air outside thins (and near the nose is sucked down further), the bay air leaks out through small vent holes, and the difference in between pushes on the doors and the shell.',
    why: 'If the vents are too small the bay is pressurised from inside. Taped-on doors peel off — that is how a CSULB rocket lost its camera window and much of its apogee at the 2011 IREC — and inside pressure sensors read wrong.',
    when: 'Sizing vent holes, checking a door or hatch against the pressure, or deciding where to put a pressure sensor.',
  },
  info: {
    text: [
      'At lift-off the bay holds air at ground pressure. As the rocket climbs the outside pressure falls fast, so the bay air pushes outwards and leaks out through the vents — the smaller the vents, the slower it leaks and the bigger the difference.',
      'The air outside the vents is also at the local surface pressure: just behind the nose it is a little below the atmosphere (suction), which adds to the difference.',
      'The difference pushes each door outwards; tape around its edge holds it in. The door stays on while the push (difference × door area) is less than the tape’s peel strength × the door’s edge length.',
    ],
    tex: '\\frac{dp_C}{dt}=-\\gamma\\sqrt{\\gamma RT_0}\\,\\frac{A}{V}\\,C_NM_T\\left[1+\\tfrac{\\gamma-1}{2}M_T^2\\right]^{-\\frac{\\gamma+1}{2(\\gamma-1)}}p_0^{-\\frac{\\gamma-1}{2\\gamma}}p_C^{\\frac{3\\gamma-1}{2\\gamma}}',
    steps: ['Enter the bay volume and the vents.', 'Enter the door (or your own allowable pressure difference).', 'Enter the pressure where the vents exit, and the launch site and trajectory (or fill it from the Trajectory Simulation).', 'Read the verdict and the vent size that keeps the door on; scrub through the flight on the drawing.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'bay', title: 'Bay and vents',
      fields: [
        { id: 'Vol', label: 'Bay air volume', sym: 'V', ...VOL, default: 0.227, min: 1e-5, max: 100, slider: { min: 0.02, max: 2, step: 0.005 },
          info: { text: ['The volume of air trapped in the bay: its inside volume minus whatever the payload fills.', 'Work it out from the inside diameter and length (πd²L/4) and subtract the payload.', 'More air takes longer to leak out, so a bigger bay needs bigger vents for the same pressure difference.'], tex: 'V=\\frac{\\pi d^2L}{4}-V_{payload}', range: '0.5–20 L (0.02–0.7 ft³) for high-power bays.', doc: 'model' } },
        { id: 'N', label: 'Number of vent holes', sym: 'N', ...NONE, default: 1, min: 1, max: 24, slider: { min: 1, max: 12, step: 1 },
          info: { text: ['How many identical vent holes the bay has.', 'Use at least three, equally spaced round the body, so the angle of attack does not bias the bay pressure.', 'Doubling the holes doubles the vent area: the bay follows the outside pressure about twice as fast.'], range: '3–4 equally spaced holes is common.', doc: 'model', tex: 'A=N\\frac{\\pi d_v^2}{4}' } },
        { id: 'd', label: 'Vent hole diameter', sym: 'd_v', ...LEN, default: 0.1256, min: 0.001, max: 4, slider: { min: 0.03, max: 0.75, step: 0.005 },
          info: { text: ['Diameter of each vent hole (a plain drilled hole).', 'The vent area grows with the square of the diameter: a hole 40 % larger has twice the area.', 'The verdict gives the smallest diameter that keeps the door on. Drag the vent in the drawing to change it.'], tex: 'A=N\\frac{\\pi d_v^2}{4}', range: '1/16–1/4 in (1.5–6 mm) is common.', doc: 'model' } },
        { id: 'Cinc', label: 'Orifice coefficient, slow flow', sym: 'C_{INC}', ...NONE, default: 0.65, min: 0.3, max: 1, slider: { min: 0.4, max: 0.9, step: 0.01 },
          info: { text: ['How much of the hole’s area the flow really uses when the pressure difference is small (the jet contracts after a sharp edge).', 'From hole tests; about 0.6 for a sharp-edged drilled hole.'], range: 'About 0.6 for a sharp edge, up to 0.8 with a rounded inner edge.', doc: 'orifice' } },
        { id: 'Csonic', label: 'Orifice coefficient, choked flow', sym: 'C_{SON}', ...NONE, default: 0.95, min: 0.5, max: 1, slider: { min: 0.8, max: 1, step: 0.01 },
          info: { text: ['The same when the flow through the hole reaches the speed of sound (choked), which happens when the bay pressure is about 1.9 times the outside.'], range: '0.95–0.98.', doc: 'orifice' } },
      ],
    },
    {
      id: 'limit', title: 'What must hold the pressure',
      fields: [
        { id: 'limitMode', label: 'Limit', kind: 'select', default: 'door', options: [{ value: 'door', label: 'A taped-on door or hatch' }, { value: 'custom', label: 'My own allowable pressure difference' }],
          info: { text: ['The weakest thing the pressure pushes on.', 'For a door held by tape round its edge, the allowable difference follows from its size and the tape’s peel strength (Hoult; Espinoza et al.). For a bonded shell, a sensor or anything else, enter your own value.', 'The verdict and the solved vent diameter use whichever limit you choose.'], doc: 'door' } },
        { id: 'doorL', label: 'Door length', sym: 'l', ...LEN, default: 11.88, min: 0.1, max: 200, slider: { min: 1, max: 30, step: 0.05 }, when: door,
          info: { text: ['Length of the door along the rocket.', 'Measure the opening, not the tape.', 'Smaller doors hold more pressure: the push grows with the area, the tape’s hold only with the edge length.'], doc: 'door', tex: '\\Delta p_{allow}=\\frac{\\sigma L}{A_{door}}=\\frac{2\\sigma(l+w)}{lw}', range: '4–15 in (10–40 cm).' } },
        { id: 'doorW', label: 'Door width', sym: 'w', ...LEN, default: 4.25, min: 0.1, max: 200, slider: { min: 0.5, max: 12, step: 0.05 }, when: door,
          info: { text: ['Width of the door round the body (its chord).', 'Measure along the tube surface.', 'Long, narrow doors hold better than square or round ones of the same area (Hoult).'], doc: 'door', tex: '\\Delta p_{allow}=\\frac{\\sigma L}{A_{door}}=\\frac{2\\sigma(l+w)}{lw}', range: '2–6 in (5–15 cm).' } },
        { id: 'peel', label: 'Tape peel strength (design value)', sym: '\\sigma', ...PEEL, default: 0.2, min: 0.01, max: 20, slider: { min: 0.05, max: 1, step: 0.01 }, when: door,
          info: { text: ['The force per length of edge at which the tape peels off the tube.', 'Espinoza et al. measured about 0.3 lbf/in (53 N/m) for three layers of aluminium tape on a cardboard tube and recommend 0.2 lbf/in (35 N/m) for design. Other tapes and surfaces differ: test yours.', 'The allowable pressure difference grows in proportion to it.'], tex: '\\Delta p_{allow}=\\frac{\\sigma L}{A_{door}}=\\frac{2\\sigma(l+w)}{lw}', range: '0.2 lbf/in (35 N/m) design value for taped doors (Espinoza et al.).', doc: 'door' } },
        { id: 'dpAllow', label: 'Allowable pressure difference', sym: '\\Delta p_{allow}', ...PRES, default: 0.5 * 144, min: 0.01, max: 1e5, slider: { min: 1, max: 288, step: 0.5 }, when: (v) => !door(v),
          info: { text: ['The largest pressure difference your bay may see, from your structure, seals or sensor.'], doc: 'door' } },
      ],
    },
    {
      id: 'aero', title: 'Pressure at the vents',
      fields: [
        { id: 'Cp0', label: 'Vent pressure coefficient, slow flight', sym: 'C_{pX0}', ...NONE, default: -0.0343, min: -0.5, max: 1, slider: { min: -0.2, max: 0.1, step: 0.001 },
          info: { text: ['How far the surface pressure where the vents exit is below (negative) or above the atmosphere, as a fraction of the dynamic pressure, at low speed.', 'Read it off the Nose Cone Design calculator’s pressure plot at the vent position. Just behind a nose shoulder it is about −0.03 to −0.08.', 'More suction outside the vents raises the pressure difference.'], tex: 'p_X=p_a+q\\,C_{pX}', doc: 'external', range: '−0.03 to −0.08 just behind a nose shoulder; near 0 further aft on a straight body.' } },
        { id: 'Mcr', label: 'Critical Mach number at the vents', sym: 'M_{cr}', ...NONE, default: 0.9487, min: 0.3, max: 1, slider: { min: 0.6, max: 1, step: 0.005 },
          info: { text: ['Up to this flight Mach number the suction is scaled for compressibility (Kármán–Tsien); above it the table below is used. The Nose Cone Design calculator gives it.'], doc: 'external' } },
        { id: 'super', label: 'Vent pressure coefficient above the critical Mach number', kind: 'table', minRows: 2,
          columns: [{ id: 'M', label: 'Mach', ...NONE }, { id: 'cp', label: 'Cp', ...NONE }], default: SUPER,
          validate: (rows) => checkRows(rows, ['M', 'cp'], 'Mach numbers'),
          info: { text: ['Surface pressure coefficient at the vents for transonic and supersonic flight, from a shock–expansion or other method.', 'Take it from the Nose Cone Design page at the vent station for several Mach numbers; straight lines between rows.', 'Stronger suction outside the vents raises the pressure difference at the fast part of the climb.'], doc: 'external', tex: 'p_X=p_a+q\\,C_{pX}(M_\\infty)' } },
      ],
    },
    {
      id: 'flight', title: 'Launch site and climb',
      fields: [
        { id: 'ho', label: 'Launch site elevation', sym: 'h_o', ...ALT, default: 1898, min: 0, max: 15000, slider: { min: 0, max: 10000, step: 10 }, info: { text: ['Height of the site above sea level: the bay starts at the air pressure there.'], doc: 'model' } },
        { id: 'T0', label: 'Ground temperature', sym: 'T_0', dim: 'temperature', internal: 'R', default: 550, min: 400, max: 600, slider: { min: 440, max: 580, step: 0.5 }, info: { text: ['Air temperature at the site; the bay air starts at it.'], doc: 'model' } },
        { id: 'lat', label: 'Latitude', sym: '\\phi', dim: 'angle', default: 34, min: -90, max: 90, info: { text: ['Sets gravity and the atmosphere (Hoult’s model).'], doc: 'model' } },
        { id: 'traj', label: 'Climb (time, height above site, speed)', kind: 'table', minRows: 2,
          columns: [{ id: 't', label: 'Time', dim: 'time' }, { id: 'h', label: 'Height above site', ...ALT }, { id: 'V', label: 'Speed', ...SPEED }], default: TRAJ,
          validate: (rows) => checkRows(rows, ['t', 'h', 'V'], 'Times') || (rows.some((r) => r.V < 0) ? 'Speeds cannot be negative.' : ''),
          info: { text: ['Height above the launch site and speed against time from lift-off, from a trajectory simulation. Rows every 0.5 s or finer; straight lines between rows.', 'Press “Fill from the Trajectory Simulation” to take the climb from that calculator.', 'The faster the outside pressure falls (fast, steep climbs), the more the bay lags behind.'], doc: 'model' } },
        { id: 'tView', label: 'Moment shown in the drawing (0 = the worst)', sym: 't_{view}', dim: 'time', default: 0, min: 0, max: 1000, slider: { min: 0, max: 15, step: 0.05 },
          info: { text: ['Which moment of the climb the drawing shows; 0 shows the moment of the largest pressure difference.', 'Drag the marker on the drawing’s timeline to scrub through the flight.', 'It changes only the drawing, not the results.'], doc: 'model', tex: '\\Delta p(t_{view})=p_C-p_X', range: '0 (the worst moment) to the end of the climb table.' } },
      ],
    },
  ],
  actions: [{
    label: 'Fill from the Trajectory Simulation', title: 'Run the Trajectory Simulation with its saved inputs and use its climb (to apogee) here',
    async run() {
      const def = (await import('./skyaero-trajectory.js')).default;
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem('rc-calc-skyaero-trajectory')); } catch { /* none */ }
      const v = {}; for (const g of def.groups) for (const f of g.fields) v[f.id] = structuredClone(f.default);
      Object.assign(v, structuredClone(def.examples?.[0]?.values || {}), saved || {});
      const out = def.compute(v), H = out.o.hist.filter((r) => r.t <= out.o.tApo), step = Math.max(1, Math.ceil(H.length / 80));
      const traj = H.filter((r, i) => i % step === 0 || i === H.length - 1).map((r) => ({ t: r.t, h: Math.max(0, r.z), V: r.V }));
      return { values: { traj, ho: v.ho, T0: v.To, lat: v.lat, tView: 0 },
        message: saved ? `Climb filled from your Trajectory Simulation (${traj.length} points, to apogee)` : `Climb filled from the Trajectory Simulation example (${traj.length} points) — open that calculator to simulate your own rocket` };
    },
  }],
  results: [
    { id: 'dpMax', label: 'Largest pressure difference', sym: '\\Delta p_{max}', ...PRES, key: true, digits: 3, status: (x, out) => ST[out.lv],
      note: (x, out) => `${fmt(Math.abs(x) / out.allow, { digits: 3 })} × the allowable, at ${fmt(out.o.worst.t, { digits: 3 })} s`,
      info: { text: ['The largest difference between the bay pressure and the pressure outside the vents during the climb (positive: the bay pushes outwards).', 'From integrating the flow out of the vents (Hoult’s orifice model) along your climb.', 'It usually peaks near burnout, where the rocket is fastest and the outside pressure falls fastest; bigger or more vents lower it.'], tex: '\\Delta p=p_C-p_X', doc: 'model' } },
    { id: 'allow', label: 'Allowable pressure difference', sym: '\\Delta p_{allow}', ...PRES, key: true, digits: 3, note: (x, out) => (door(out.v) ? `door ${fmt(toDisplay(out.v.doorL, LEN), { digits: 3 })} × ${fmt(toDisplay(out.v.doorW, LEN), { digits: 3 })} ${unitLabel(displayUnit(LEN))}, tape peel` : 'your value'),
      info: { text: ['What the door (or your structure) can take.', 'For a taped door: the tape’s peel strength times the edge length, divided by the door area.', 'The verdict compares the largest pressure difference with it.'], tex: '\\Delta p_{allow}=\\frac{2\\sigma(l+w)}{lw}', doc: 'door' } },
    { id: 'dNeed', label: 'Smallest vent diameter for the allowable', sym: 'd_{v,req}', ...LEN, key: true, digits: 3, note: (x, out) => (x === '—' ? '' : `with ${out.v.N} hole${out.v.N > 1 ? 's' : ''}`),
      info: { text: ['The vent hole diameter (same number of holes) at which the largest pressure difference just equals the allowable.', 'Found by bisection on the full flow model.', 'Any larger hole is safer; round up to a drill size.'], doc: 'door', tex: '\\Delta p_{max}(d_{v,req})=\\Delta p_{allow}' } },
    { id: 'tau', label: 'Venting time constant', sym: '\\tau', dim: 'time', key: true, digits: 3,
      info: { text: ['Roughly how long the bay takes to follow a change in outside pressure.', 'The bay air volume divided by the vent flow capacity.', 'Small compared with the climb time means the bay keeps up; larger means it lags and the pressure difference grows.'], tex: '\\tau=\\frac{V}{A\\,C_{SON}a_0}', doc: 'model' } },
    { id: 'Nneed', label: 'Fewest vent holes (same diameter) for the allowable', sym: 'N_{req}', ...NONE, digits: 2, info: { text: ['How many holes of your diameter keep the difference within the allowable; “—” beyond 24.'], doc: 'door' } },
    { id: 'Fdoor', label: 'Push on the door at the worst moment', sym: 'F', ...FORCE, digits: 3, when: door, info: { text: ['The pressure difference times the door area: the force trying to peel the door off.'], tex: 'F=\\Delta p\\,lw', doc: 'door' } },
    { id: 'Fhold', label: 'What the tape can hold', sym: 'F_{hold}', ...FORCE, digits: 3, when: door, info: { text: ['How hard the tape round the door can pull before it peels.'], tex: 'F_{hold}=2\\sigma(l+w)', doc: 'door' } },
    { id: 'MTmax', label: 'Highest vent throat Mach number', sym: 'M_{T,max}', ...NONE, digits: 3, note: (x) => (x >= 1 ? 'choked' : 'never choked'), info: { text: ['The speed of the vent flow as a Mach number; 1 means the holes are choked (the flow cannot get any faster).'], doc: 'orifice' } },
    { id: 'A', label: 'Total vent area', sym: 'A', dim: 'area', internal: 'in2', digits: 4, info: { text: ['The total open area of all the vent holes.'], tex: 'A=N\\frac{\\pi d_v^2}{4}', doc: 'model' } },
    { id: 'p0', label: 'Bay pressure at lift-off', sym: 'p_0', ...PRES, digits: 4, info: { text: ['The air pressure in the bay at lift-off: the launch-site pressure.'], tex: 'p_0=p_a(h_0)', doc: 'model' } },
  ],
  compute(v) {
    for (const [rows, keys, label] of [[v.traj, ['t', 'h', 'V'], 'Times'], [v.super, ['M', 'cp'], 'Mach numbers']]) { const m = checkRows(rows, keys, label); if (m) throw new InputError(m); }
    if (v.traj.length < 2) throw new InputError('Enter at least two trajectory rows.');
    const o = run(v), allow = allowable(v), dp = Math.abs(o.worst.dp), r = dp / allow;
    const lv = r <= 1 ? 'safe' : r <= MARGIN ? 'marginal' : 'unsafe';
    // fixes: the vent diameter (bisection: |Δp| falls as the holes grow) and the number of holes
    const ok = (d, N = v.N) => Math.abs(run(v, d, N).worst.dp) <= allow;
    let dNeed = null;
    if (ok(4)) { let lo = 1e-3, hi = 4; if (ok(lo)) hi = lo; else for (let k = 0; k < 30; k++) { const m = Math.sqrt(lo * hi); if (ok(m)) hi = m; else lo = m; } dNeed = hi; }
    let Nneed = null; for (let N = 1; N <= 24; N++) if (ok(v.d, N)) { Nneed = N; break; }
    const fixes = [];
    if (lv !== 'safe') {
      if (dNeed) fixes.push(`Drill ${v.N > 1 ? `the ${v.N} vent holes` : 'the vent hole'} to at least <b>${fmt(toDisplay(dNeed, LEN), { digits: 3 })} ${unitLabel(displayUnit(LEN))}</b> (now ${fmt(toDisplay(v.d, LEN), { digits: 3 })}), or`);
      if (Nneed) fixes.push(`use <b>${Nneed}</b> holes of this size, or`);
      fixes.push(door(v) ? 'make the door smaller or longer and narrower, or add tape layers (test the peel strength).' : 'raise what the structure can take.');
    }
    const verdict = {
      level: lv,
      title: lv === 'safe' ? (door(v) ? 'The door stays on: the bay vents fast enough' : 'The pressure difference stays within your limit') : lv === 'marginal' ? 'Little or no margin: the bay vents too slowly' : door(v) ? 'The door is likely to peel off during the climb' : 'The pressure difference exceeds your limit',
      text: `The bay reaches <b>${P(o.worst.dp)}</b> above the air outside the vents at ${fmt(o.worst.t, { digits: 3 })} s (Mach ${fmt(o.worst.M, { digits: 3 })}); ${door(v) ? 'the taped door holds' : 'your limit is'} <b>${P(allow)}</b>.`,
      fixes: fixes.slice(0, 3),
    };
    const warnings = [];
    if (v.N < 3) warnings.push({ level: 'info', text: 'With fewer than three vents equally spaced round the body, angle of attack biases the bay pressure.', fix: 'Use three or more equally spaced holes.' });
    if (o.tau > v.traj.at(-1).t - v.traj[0].t) warnings.push({ level: 'warn', text: `The vents are small for this bay (time constant ${fmt(o.tau, { digits: 3 })} s): the bay barely vents during the climb.`, fix: 'Enlarge or add vents.' });
    if (Math.abs(o.worst.dp) < 1.5) warnings.push({ level: 'info', text: 'The vents are large enough that the bay follows the outside pressure: the remaining difference (well under 0.01 psi, 0.07 kPa) is at the noise level of the integration.' });
    const MTmax = Math.max(...o.hist.map((q) => q.MT));
    const mcrCp = criticalMach(v.Cp0);
    if (v.Cp0 < 0 && v.Mcr > mcrCp + 0.02) warnings.push({ level: 'info', text: `The critical Mach number you entered (${fmt(v.Mcr, { digits: 3 })}) is above the one this vent pressure coefficient implies (${fmt(mcrCp, { digits: 3 })}).`, fix: `Use about ${fmt(mcrCp, { digits: 3 })}, or take both from the Nose Cone Design calculator.` });
    const results = { dpMax: o.worst.dp, allow, dNeed: dNeed ?? '—', tau: o.tau, Nneed: Nneed ?? '—', Fdoor: (dp / 144) * v.doorL * v.doorW, Fhold: 2 * v.peel * (v.doorL + v.doorW), MTmax, A: o.A * 144, p0: o.p0 };
    return { results, warnings, verdict, lv, allow, o, v };
  },
  plots: [
    {
      id: 'climb', title: 'The climb, second by second', wide: true, height: 600,
      info: { text: ['Four views of the climb on one time axis: the flight Mach number; the pressures — atmosphere, outside the vents (lower, because of the suction) and in the bay (lagging behind); the difference with your allowable as a red line; and how fast the air leaves through the vents (1 = choked).', 'The difference peaks when the outside pressure falls fastest — usually near burnout. Hover to read every quantity at one moment.'], doc: 'model' },
      build(v, out, { U }) {
        const up = U(PRES), h = out.o.hist, every = Math.max(1, Math.round(h.length / 400)), H = h.filter((_, i) => i % every === 0), pk = (f) => H.map((r) => [r.t, f(r)]);
        const al = up.v(out.allow);
        return {
          x: { label: 'Time after lift-off', unit: 's' }, xDomain: [h[0].t, h[h.length - 1].t], vlines: [{ x: out.o.worst.t, label: 'largest difference', color: 'var(--text-3)' }],
          panels: [
            { y: { label: 'Flight Mach number' }, color: 'var(--series-2)', includeZero: true, series: [{ name: '$M$', points: pk((r) => r.M) }] },
            { y: { label: 'Pressure', unit: up.label }, color: 'var(--series-1)', series: [{ name: 'bay $p_C$', points: pk((r) => up.v(r.pC)) }, { name: 'outside the vents $p_X$', dash: '7 4', points: pk((r) => up.v(r.pX)) }, { name: 'atmosphere $p_a$', dash: '2 3', points: pk((r) => up.v(r.pa)) }] },
            { y: { label: 'Difference $\\Delta p$', unit: up.label }, color: 'var(--series-4)', includeZero: true, series: [{ name: '$\\Delta p$', points: pk((r) => up.v(r.dp)) }],
              hlines: [{ y: al, label: 'allowable', color: 'var(--danger)' }, ...(Math.min(...H.map((r) => r.dp)) < 0 ? [{ y: -al, color: 'var(--danger)' }] : [])] },
            { y: { label: 'Vent throat Mach' }, color: 'var(--series-6)', yDomain: [0, 1.1], series: [{ name: '$M_T$', dash: '9 3 2 3', points: pk((r) => r.MT) }], hlines: [{ y: 1, label: 'choked', color: 'var(--text-3)' }] },
          ],
        };
      },
    },
    {
      id: 'size', title: 'Choosing the vents: largest difference against hole size', wide: true,
      info: { text: ['The largest pressure difference for other vent hole diameters, with your number of holes (solid) and with twice as many (dashed). Where a curve crosses the red line is the smallest hole that keeps within the allowable.'], doc: 'door' },
      build(v, out, { U }) {
        const up = U(PRES), ul = U(LEN), A = [], B = [], dn = out.results.dNeed === '—' ? v.d : out.results.dNeed, lo = 0.4 * Math.min(v.d, dn), top = 2.5 * Math.max(v.d, dn);
        for (let i = 0; i <= 24; i++) { const d = lo + ((top - lo) * i) / 24; A.push([ul.v(d), up.v(Math.abs(run(v, d).worst.dp))]); B.push([ul.v(d), up.v(Math.abs(run(v, d, 2 * v.N).worst.dp))]); }
        const mk = [{ x: ul.v(v.d), y: up.v(Math.abs(out.o.worst.dp)), label: 'your vents' }];
        if (out.results.dNeed !== '—') mk.push({ x: ul.v(out.results.dNeed), y: up.v(out.allow), label: 'smallest that holds' });
        const yTop = 3 * Math.max(up.v(out.allow), up.v(Math.abs(out.o.worst.dp)));
        return { x: { label: 'Vent hole diameter $d_v$', unit: ul.label }, y: { label: 'Largest $|\\Delta p|$', unit: up.label }, yDomain: [0, yTop], includeZero: true,
          series: [{ name: `${v.N} hole${v.N > 1 ? 's' : ''}`, points: A, smooth: true }, { name: `${2 * v.N} holes`, points: B, smooth: true, dashed: true, color: 'var(--text-3)' }],
          hlines: [{ y: up.v(out.allow), label: 'allowable', color: 'var(--danger)' }], markers: mk };
      },
    },
  ],
  schematicTitle: 'The bay during the climb',
  schematicHint: 'The nose and payload bay with its vents and taped door, at the moment chosen on the timeline (the worst by default): air leaving through the vents (arrow size ∝ vent flow), the push on the door against what the tape holds, and the three pressures as columns. Drag the marker on the timeline to scrub through the climb, or the vent to change its diameter',
  schematic(ctx, v, out) {
    const W = 800, H = 380, o = out.o, h = o.hist, tEnd = h[h.length - 1].t;
    const r = v.tView > 0 ? at(h, Math.min(v.tView, tEnd)) : at(h, o.worst.t);
    const fr = ctx.frame({ width: W, height: H, label: 'Payload bay with vents and door, pressures at a chosen moment, and a timeline of the climb' });
    const g = fr.layer('main'); g.replaceChildren();
    const up = ctx.U(PRES), Pp = (x) => `${fmt(up.v(x), { digits: 3 })} ${up.plain}`;
    const cy = 150, rb = 58, xn = 70, x0 = 170, x1 = 520, ratio = Math.abs(r.dp) / out.allow;
    const col = ratio <= 1 ? 'var(--ok)' : ratio <= MARGIN ? 'var(--warn)' : 'var(--danger)';
    // free stream and the suction over the shoulder
    for (const dy of [-110, -84]) g.append(s('path', { d: `M20,${cy + dy}C${xn + 40},${cy + dy} ${x0 - 30},${cy - rb - 22} ${x1 + 40},${cy - rb - 22 - (dy + 110) / 4}`, fill: 'none', class: 'sc-thin', 'stroke-opacity': 0.6 }));
    g.append(text(24, cy - 118, `air Mach ${fmt(r.M, { digits: 3 })} · ${fmt(r.t, { digits: 3 })} s`, { size: 11, field: 'traj' }));
    // nose and bay
    g.append(s('path', { d: `M${x0},${cy - rb}C${x0 - 50},${cy - rb} ${xn + 10},${cy - 20} ${xn},${cy}C${xn + 10},${cy + 20} ${x0 - 50},${cy + rb} ${x0},${cy + rb}Z`, class: 'sc-body-2' }));
    g.append(s('rect', { x: x0, y: cy - rb, width: x1 - x0, height: 2 * rb, class: 'sc-body', 'data-field': 'Vol' }));
    g.append(s('rect', { x: x0 + 6, y: cy - rb + 6, width: x1 - x0 - 12, height: 2 * rb - 12, fill: col, 'fill-opacity': Math.min(0.3, 0.05 + 0.2 * ratio), 'data-field': 'Vol' }));
    g.append(s('path', { d: `M${x1},${cy - rb}h40v${2 * rb}h-40`, fill: 'none', class: 'sc-thin', 'stroke-dasharray': '4 3' }));
    g.append(text((x0 + x1) / 2, cy + 6, `bay ${Pp(r.pC)}`, { anchor: 'middle', size: 13, field: 'Vol' }));
    g.append(text((x0 + x1) / 2, cy + 24, `Δp ${Pp(r.dp)} · ${fmt(ratio, { digits: 3 })} × allowable`, { anchor: 'middle', size: 11, cls: 'sc-dim-text' }));
    // door with tape edges, bulging by the push
    if (door(v)) {
      const dx0 = x0 + 150, dl = Math.min(170, 14 * v.doorL), bulge = Math.min(14, 6 * ratio);
      g.append(s('path', { d: `M${dx0},${cy + rb}Q${dx0 + dl / 2},${cy + rb + 2 * bulge} ${dx0 + dl},${cy + rb}`, fill: 'none', stroke: col, 'stroke-width': 3, 'data-field': 'doorL doorW' }));
      g.append(s('line', { x1: dx0 - 8, x2: dx0 + 6, y1: cy + rb, y2: cy + rb, stroke: 'var(--text-2)', 'stroke-width': 5, 'stroke-opacity': 0.5, 'data-field': 'peel' }));
      g.append(s('line', { x1: dx0 + dl - 6, x2: dx0 + dl + 8, y1: cy + rb, y2: cy + rb, stroke: 'var(--text-2)', 'stroke-width': 5, 'stroke-opacity': 0.5, 'data-field': 'peel' }));
      for (let k = 1; k <= 3; k++) g.append(s('line', { x1: dx0 + (dl * k) / 4, x2: dx0 + (dl * k) / 4, y1: cy + rb - 30, y2: cy + rb - 6, class: 'sc-thin', 'marker-end': fr.arrow() }));
      const F = (Math.abs(r.dp) / 144) * v.doorL * v.doorW, Fh = 2 * v.peel * (v.doorL + v.doorW), uf = ctx.U(FORCE), Ff = (x) => `${fmt(uf.v(x), { digits: 3 })} ${uf.plain}`;
      g.append(text(dx0 + dl / 2, cy + rb + 2 * bulge + 18, `door: push ${Ff(F)} · tape holds ${Ff(Fh)}`, { anchor: 'middle', size: 11, field: 'doorL doorW peel' }));
    }
    // vents near the shoulder, arrows ∝ throat Mach (out of or into the bay)
    const nv = Math.min(4, v.N), outFlow = r.dp >= 0, aL = 10 + 26 * Math.min(1, r.MT);
    for (let i = 0; i < nv; i++) {
      const x = x0 + 30 + i * 24;
      g.append(s('rect', { x: x - 4, y: cy - rb - 2, width: 8, height: 12, fill: 'var(--surface)', stroke: 'var(--text-2)', 'data-field': 'N d' }));
      g.append(s('line', { x1: x, y1: outFlow ? cy - rb + 2 : cy - rb - 6 - aL, x2: x, y2: outFlow ? cy - rb - 6 - aL : cy - rb + 2, class: 'sc-accent', 'stroke-width': 2, 'marker-end': fr.arrow('acc'), 'data-field': 'N d' }));
    }
    g.append(text(x0 + 30, cy - rb - 46, `${v.N} vent${v.N > 1 ? 's' : ''}, ${r.MT >= 1 ? 'choked' : `throat Mach ${fmt(r.MT, { digits: 2 })}`} · outside ${Pp(r.pX)}`, { size: 11, field: 'N d Cp0' }));
    // pressure columns, to one scale
    // the three pressures differ by a few per cent: the columns start from a cut axis so the differences show
    const cx = 610, cb = cy + rb + 30, chh = 170, ps = [r.pC, r.pX, r.pa], pmax = Math.max(...ps), pmin = Math.min(...ps), base = pmin - 0.6 * Math.max(pmax - pmin, 0.002 * pmax), bar = (i, p, lab, c) => {
      const hh = 12 + ((chh - 12) * (p - base)) / (pmax - base), x = cx + i * 58;
      g.append(s('rect', { x, y: cb - hh, width: 36, height: hh, fill: c, 'fill-opacity': 0.8 }));
      g.append(text(x + 18, cb + 14, lab, { anchor: 'middle', size: 10 }));
      g.append(text(x + 18, cb - hh - 6, fmt(up.v(p), { digits: 3 }), { anchor: 'middle', size: 9.5, cls: 'sc-dim-text' }));
    };
    bar(0, r.pa, 'atmos.', 'var(--text-3)'); bar(1, r.pX, 'outside', 'var(--series-5, var(--text-2))'); bar(2, r.pC, 'bay', 'var(--red)');
    g.append(text(cx + 82, cb - chh - 18, `pressures (${up.plain})`, { anchor: 'middle', size: 10.5, cls: 'sc-dim-text' }));
    g.append(text(cx + 82, cb + 30, `axis cut at ${fmt(up.v(base), { digits: 3 })}`, { anchor: 'middle', size: 9.5, cls: 'sc-dim-text' }));
    g.append(s('path', { d: `M${cx - 6},${cb - 4}l6,-4l6,4l6,-4M${cx - 6},${cb + 1}l6,-4l6,4l6,-4`, fill: 'none', class: 'sc-thin' }));
    // timeline: Δp through the climb, the allowable band, and the marker
    const tx0 = 60, tx1 = 520, ty = 330, th = 34, dmax = Math.max(out.allow * 1.1, ...h.map((q) => Math.abs(q.dp))), TX = (t) => tx0 + ((t - h[0].t) / (tEnd - h[0].t || 1)) * (tx1 - tx0), TY = (d) => ty - (Math.abs(d) / dmax) * th;
    g.append(s('rect', { x: tx0, y: TY(out.allow), width: tx1 - tx0, height: ty - TY(out.allow), fill: 'var(--ok)', 'fill-opacity': 0.12 }));
    g.append(s('line', { x1: tx0, x2: tx1, y1: TY(out.allow), y2: TY(out.allow), stroke: 'var(--danger)', 'stroke-dasharray': '5 3' }));
    g.append(s('path', { d: path(h.filter((_, i) => i % Math.max(1, Math.round(h.length / 200)) === 0).map((q) => [TX(q.t), TY(q.dp)])), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.4 }));
    g.append(s('line', { x1: tx0, x2: tx1, y1: ty, y2: ty, class: 'sc-thin' }));
    g.append(text(tx0, ty + 16, `0 s`, { size: 9.5, cls: 'sc-dim-text' })); g.append(text(tx1, ty + 16, `${fmt(tEnd, { digits: 3 })} s`, { anchor: 'end', size: 9.5, cls: 'sc-dim-text' }));
    g.append(text(tx0, ty - th - 8, 'timeline: |Δp| through the climb (red: allowable) — drag the marker', { size: 10, cls: 'sc-dim-text', field: 'tView' }));
    g.append(s('line', { x1: TX(r.t), x2: TX(r.t), y1: ty - th - 2, y2: ty + 2, stroke: 'var(--red)', 'stroke-width': 2 }));
    ctx.handle('time', TX(r.t), ty, { field: 'tView', title: 'Drag along the timeline to see another moment of the climb',
      onDrag: (px) => ctx.setValue('tView', Math.max(0.01, h[0].t + ((Math.max(tx0, Math.min(tx1, px)) - tx0) / (tx1 - tx0)) * (tEnd - h[0].t)), { round: 0.05 }), onKey: (dx) => ctx.setValue('tView', Math.max(0.01, (v.tView || r.t) + 0.1 * dx)) });
    ctx.handle('vent', x0 + 30, cy - rb, { field: 'd', title: 'Drag up or down to change the vent diameter',
      onDrag: (px, py) => ctx.setValue('d', Math.max(0.005, Math.min(4, v.d * Math.exp((cy - rb - py) / 60))), { round: 0.001 }), onKey: (dx, dy) => ctx.setValue('d', Math.max(0.005, v.d * (1 + 0.05 * dy))) });
  },
  symbols: {
    p_C: 'bay pressure', p_X: 'pressure outside the vents', p_a: 'atmospheric pressure', p_0: 'bay pressure at lift-off', T_0: 'bay air temperature at lift-off', R: 'gas constant of air',
    '\\gamma': 'ratio of specific heats', A: 'total vent area', V: 'bay air volume', C_N: 'vent orifice coefficient', M_T: 'vent throat Mach number', 'C_{pX}': 'pressure coefficient at the vent exit',
    'C_{pX0}': 'incompressible pressure coefficient at the vent exit', q: 'dynamic pressure', '\\Delta p': 'bay pressure minus outside pressure', N: 'number of vent holes', d_v: 'vent hole diameter',
    'C_{INC}': 'incompressible orifice coefficient', '\\Delta p_{allow}': 'allowable pressure difference', '\\sigma': 'tape peel strength (force per edge length)', l: 'door length', w: 'door width', L: 'door edge length, 2(l+w)', 'A_{door}': 'door area, lw', F: 'push on the door', 'F_{hold}': 'what the tape holds', 'C_{SON}': 'choked orifice coefficient', a_0: 'speed of sound at lift-off', '\\tau': 'venting time constant', 'M_\\infty': 'flight Mach number', '\\beta': 'compressibility factor',
    'V_{payload}': 'volume the payload fills (L or ft³)',
    d: 'bay inside diameter (mm or in)',
    't_{view}': 'moment shown in the drawing (s)',
    '\\Delta p_{max}': 'largest pressure difference (kPa or psi)',
    'd_{v,req}': 'smallest vent diameter for the allowable (mm or in)',
    'N_{req}': 'vent holes needed at your diameter',
    'M_{T,max}': 'highest Mach number in the vent throat',
    'C_{pX}(M_\\infty)': 'vent pressure coefficient at a flight Mach number',
    h_0: 'launch-site height (m or ft)',
    'p_a(h_0)': 'air pressure at the launch site (kPa or psi)',
  },
  constants: [{ sym: '\\gamma', desc: 'ratio of specific heats of air', si: [1.4, ''], us: [1.4, ''] }, { sym: 'R', desc: 'gas constant of air', si: [287.05, '\\mathrm{J\\,kg^{-1}\\,K^{-1}}'], us: [1716.48, '\\mathrm{ft^{2}\\,s^{-2}\\,{}^{\\circ}R^{-1}}'] }],
  report(v, out, R) {
    const o = out.o, n = R.n, w = o.worst;
    const steps = [
      { label: 'Total vent area', lhs: 'A', eq: 'N\\frac{\\pi d_v^2}{4}', sub: `${v.N}\\times\\frac{\\pi\\times${R.v(v.d, LEN)}^2}{4}`, res: R.Q(o.A * 144, { dim: 'area', internal: 'in2' }) },
      { label: 'Pressure outside the vents (Kármán–Tsien below the critical Mach number)', lhs: 'p_X', eq: 'p_a+\\tfrac12\\gamma p_aM_\\infty^2C_{pX},\\ C_{pX}=\\frac{C_{pX0}}{\\beta+\\frac{C_{pX0}}{2}(1-\\beta)}', res: '\\text{along the trajectory}' },
      { label: 'Vent throat Mach number from the pressure ratio (choked at the sonic ratio)', lhs: 'M_T', eq: '\\sqrt{\\frac{2}{\\gamma-1}\\left[\\left(\\frac{p_C}{p_X}\\right)^{\\frac{\\gamma-1}{\\gamma}}-1\\right]}', res: '\\text{at each step}' },
      { label: 'Orifice coefficient (Busemann)', lhs: 'C_N', eq: '\\frac{C_{SON}}{1+\\sqrt{1-M_T^2}\\left(\\frac{C_{SON}}{C_{INC}}-1\\right)}', res: '\\text{at each step}' },
      { label: `Bay pressure, integrated by fourth-order Runge–Kutta (${o.hist.length - 1} steps)`, lhs: '\\frac{dp_C}{dt}', eq: '-\\gamma\\sqrt{\\gamma RT_0}\\,\\frac{A}{V}C_NM_T\\left[1+\\tfrac{\\gamma-1}{2}M_T^2\\right]^{-\\frac{\\gamma+1}{2(\\gamma-1)}}p_0^{-\\frac{\\gamma-1}{2\\gamma}}p_C^{\\frac{3\\gamma-1}{2\\gamma}}', res: '\\text{(outflow)}' },
      { label: `Largest difference, at ${n(w.t)} s (flight Mach number ${n(w.M)})`, lhs: '\\Delta p_{max}', eq: 'p_C-p_X', sub: `${R.v(w.pC, PRES)}-${R.v(w.pX, PRES)}`, res: R.Q(w.dp, PRES) },
    ];
    return [{
      title: 'Theory',
      text: 'The trapped air expands isentropically and flows through vents of total area $A$, subsonic or choked, with an empirical orifice coefficient. The pressure outside the vents is the atmospheric pressure plus $q\\,C_{pX}$. Matching the bay’s mass loss to the vent mass flow gives a first-order equation for the bay pressure (Hoult), integrated along the trajectory; when the outside pressure is higher, air flows in and the sign changes.',
      steps,
    }];
  },
  references: ['payload-venting2', 'allowablediffpressure', 'door-failure'],
  examples: [
    { name: 'CSULB IREC rocket, one 1/8 in vent, taped 11.9 × 4.3 in door', values: { limitMode: 'door', doorL: 11.88, doorW: 4.25, peel: 0.2, tView: 0, Vol: 0.227, N: 1, d: 0.1256, Cinc: 0.65, Csonic: 0.95, Cp0: -0.0343, Mcr: 0.9487, super: SUPER, ho: 1898, T0: 550, lat: 34, traj: TRAJ } },
    { name: 'Same, three 1/8 in vents', values: { limitMode: 'door', doorL: 11.88, doorW: 4.25, peel: 0.2, tView: 0, Vol: 0.227, N: 3, d: 0.125, Cinc: 0.65, Csonic: 0.95, Cp0: -0.0343, Mcr: 0.9487, super: SUPER, ho: 1898, T0: 550, lat: 34, traj: TRAJ } },
    { name: 'Vent just behind a cone shoulder (Cp −0.08), shell limit 0.5 psi', values: { limitMode: 'custom', dpAllow: 72, tView: 0, Vol: 0.227, N: 3, d: 0.125, Cinc: 0.65, Csonic: 0.95, Cp0: -0.08, Mcr: 0.89, super: SUPER, ho: 1898, T0: 550, lat: 34, traj: TRAJ } },
  ],
};
