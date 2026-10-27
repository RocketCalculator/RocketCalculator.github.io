// Trajectory Simulation (SKYAERO) — UI definition.
// Physics in ../calc/trajectory.js (Fuentes, Hoult, Tran and Tong, SKYAERO 7.6). Wind layers, the verdict against the
// user's own limits and the solved fixes are this site's additions (DECISIONS D26).
import { simulate, simLauncherLength, crossDrift } from '../calc/trajectory.js';
import { atmosphere } from '../calc/geophysics.js';
import { windAt } from '../calc/recovery.js';
import { s, fmt, InputError } from '../util.js';
import { text, path } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';
import { fetchWinds, mapActions, METEO_CREDIT } from '../ui/meteo.js';
import { windBarbs } from '../ui/windSketch.js';

const ALT = { dim: 'altitude', internal: 'ft' };
const DIST = { dim: 'distance', internal: 'ft' };
const LEN = { dim: 'length', internal: 'in' };
const SPD = { dim: 'speed', internal: 'fts' };
const FORCE = { dim: 'force', internal: 'lbf' };
const MASS = { dim: 'mass', internal: 'lbm' };
const ANG = { dim: 'angle', internal: 'deg' };
const TIME = { dim: 'time', internal: 's' };
const AREA = { dim: 'area', internal: 'in2' };
const PRES = { dim: 'pressure', internal: 'psf' };
const NONE = { dim: 'none' };
const D2R = Math.PI / 180;
const Q = (x, spec, d = 4) => `${fmt(toDisplay(x, spec), { digits: d })} ${unitLabel(displayUnit(spec))}`;
// verdict bands (DECISIONS D26): each limit is the user's; the 0.8 / 0.9 / 1.25 bands are this project's margin
const LOW = 0.8, CEIL_WARN = 0.9, AREA_WARN = 0.8, LAND_MARGIN = 1.25;

// AeroTech M1939 (SKYAERO's example, ThrustCurve.org), sea-level thrust; drag of a 6.25 in rocket
const M1939 = [[0, 0], [0.05, 84.72], [0.1, 169.44], [0.2, 338.87], [0.26, 440.54], [0.78, 476.61], [1.31, 495.61], [1.83, 501.03], [2.36, 499.73], [2.88, 483.26],
  [3.41, 431.4], [3.93, 375.42], [4.45, 307.49], [4.98, 253.81], [5.5, 172.59], [6.03, 61.08], [6.55, 4.72], [7.08, 0]].map(([t, T]) => ({ t, T }));
const CD1 = [[0, 0.6907, 0.6904], [0.1, 0.4866, 0.4862], [0.2, 0.4623, 0.4619], [0.3, 0.4481, 0.4477], [0.4, 0.4374, 0.4369], [0.5, 0.4282, 0.4277], [0.6, 0.4197, 0.4192],
  [0.7, 0.4115, 0.411], [0.8, 0.4035, 0.403], [0.9, 0.3955, 0.395], [1, 0.5206, 0.52], [1.2, 0.49, 0.49], [2, 0.42, 0.42], [3, 0.36, 0.36]].map(([M, off, on]) => ({ M, off, on }));
const SMALL = [[0, 0], [0.1, 260], [1, 240], [2.5, 200], [3.2, 120], [3.5, 0]].map(([t, T]) => ({ t, T }));
const CD2 = [[0, 0.55, 0.5], [0.8, 0.5, 0.45], [1.1, 0.62, 0.56], [2, 0.5, 0.45], [4, 0.38, 0.34]].map(([M, off, on]) => ({ M, off, on }));
const STAGE_DEF = [
  { Wp: 10, Wd: 51, Ae: 2.405, d: 6.25, thrust: M1939, cd: CD1, delay: 0 },
  { Wp: 5, Wd: 9, Ae: 1.2, d: 3, thrust: SMALL, cd: CD2, delay: 1.5 },
  { Wp: 2.5, Wd: 4, Ae: 0.6, d: 2.2, thrust: SMALL.map((r) => ({ t: r.t * 0.8, T: r.T * 0.45 })), cd: CD2, delay: 1 },
];

function checkThrust(rows) {
  if (rows.length < 2 || rows.some((r) => !Number.isFinite(r.t) || !Number.isFinite(r.T))) return 'Every cell needs a number.';
  if (rows.some((r, i) => i > 0 && !(r.t > rows[i - 1].t))) return 'Times must increase down the table.';
  if (rows.some((r) => r.T < 0)) return 'Thrust cannot be negative.';
  if (!rows.some((r) => r.T > 0)) return 'The motor needs some thrust.';
  return '';
}
function checkCd(rows) {
  if (rows.length < 1 || rows.some((r) => ![r.M, r.off, r.on].every(Number.isFinite))) return 'Every cell needs a number.';
  if (rows.some((r, i) => i > 0 && !(r.M > rows[i - 1].M))) return 'Mach numbers must increase down the table.';
  if (rows.some((r) => r.off < 0 || r.on < 0)) return 'Drag coefficients cannot be negative.';
  return '';
}
function checkWind(rows) {
  if (!rows.length || rows.some((r) => ![r.h, r.w, r.dir].every(Number.isFinite))) return 'Every cell needs a number.';
  if (rows.some((r) => r.w < 0 || r.h < 0)) return 'Heights and speeds cannot be negative.';
  const h = rows.map((r) => r.h).sort((a, b) => a - b);
  if (h.some((x, i) => i > 0 && x === h[i - 1])) return 'Two layers have the same height.';
  return '';
}

const layered = (v) => v.windMode === 'layers';
/** Wind (uniform, or layers) split along the plane of fire (azimuth az): in-plane (+ downrange) and crosswind (+ to the right). */
function windParts(v) {
  const L = layered(v) ? [...(v.winds || [])].sort((p, q) => p.h - q.h) : [{ h: 0, w: v.windU, dir: v.windDir }];
  if (!L.length) return null;
  const a = v.az * D2R;
  const comp = (h) => { const w = windAt(L, h); return { inPlane: w.u * Math.sin(a) + w.v * Math.cos(a), cross: w.u * Math.cos(a) - w.v * Math.sin(a) }; };
  return { L, comp, table: L.map((r) => [r.h, comp(r.h).inPlane]) };   // components interpolate linearly, so the table is exact
}

const stageOn = (k) => (v) => +v.nStages >= k;
const airframeGroup = (k) => {
  const d = STAGE_DEF[k - 1], on = stageOn(k), id = (x) => `s${k}${x}`;
  return {
    id: `stage${k}`, title: k === 1 ? 'Stage 1 airframe (booster)' : `Stage ${k} airframe`,
    fields: [
      { id: id('Wd'), label: k === 1 ? 'Dry weight (with everything not in later stages)' : 'Dry weight', sym: `W_{d${k}}`, ...MASS, default: d.Wd, min: 1e-6, max: 1e5, slider: { min: 0.5, max: 3 * d.Wd, step: 0.1 }, when: on,
        info: { text: [k === 1 ? 'Everything this stage carries apart from its propellant and the upper stages: airframe, fins, empty motor case, recovery gear and payload.' : 'Everything in this stage apart from its propellant: airframe, empty motor case, recovery gear and payload.', 'Weigh the rocket ready to fly without the propellant.', k === 1 ? 'It is dropped at burnout when an upper stage follows. A heavier rocket climbs lower but leaves the rail slower.' : 'The top stage keeps its dry weight all the way to landing. Heavier means lower apogee.'], range: 'Model rockets 0.1–1 kg; high-power 2–30 kg.', doc: 'phases' } },
      { id: id('d'), label: 'Reference diameter', sym: `d_${k}`, ...LEN, default: d.d, min: 1e-6, max: 120, slider: { min: 0.5, max: 2 * d.d, step: 0.05 }, when: on,
        info: { text: ['The body-tube outer diameter of the rocket flying on this stage.', 'It sets the reference area that the drag coefficients in the table are based on.', 'Drag grows with the square of the diameter: a 10 % fatter rocket has 21 % more drag.'], tex: 'S=\\frac{\\pi d^2}{4}', range: 'Model 1–3 in (25–75 mm); high-power 3–8 in (75–200 mm).', doc: 'forces' } },
      { id: id('cd'), label: 'Drag coefficient against Mach', kind: 'table', minRows: 1, when: on, columns: [{ id: 'M', label: 'Mach', ...NONE }, { id: 'off', label: 'C_D coasting', ...NONE }, { id: 'on', label: 'C_D powered', ...NONE }], default: d.cd, validate: checkCd,
        info: { text: ['How draggy the rocket is at each speed (as a Mach number, the speed divided by the speed of sound).', 'From OpenRocket, RASAero or this site’s Drag Coefficient calculator. “Coasting” includes the drag of the flat base; with the motor burning that is filled by the exhaust, so “powered” is usually lower.', 'Drag jumps near Mach 1. Beyond the last row the last value is used.'], tex: 'D=\\tfrac12\\rho V^2C_DS', range: 'Typical rockets 0.3–0.6 subsonic, up to 0.7–0.9 near Mach 1.', doc: 'forces' } },
    ],
  };
};
const motorGroup = (k) => {
  const d = STAGE_DEF[k - 1], on = stageOn(k), id = (x) => `s${k}${x}`;
  return {
    id: `motor${k}`, title: `Stage ${k} motor`,
    fields: [
      ...(k > 1 ? [{ id: id('delay'), label: `Coast before stage ${k} ignition`, sym: `t_{c${k}}`, ...TIME, default: d.delay, min: 0, max: 600, slider: { min: 0, max: 30, step: 0.1 }, when: on,
        info: { text: [`The wait between the burnout of stage ${k - 1} (when it drops off) and the ignition of stage ${k}.`, 'Set by your staging timer or flight computer.', 'A longer coast lets drag slow the rocket before the next motor lights, but lets it climb in thinner air; too long and the rocket tips over or falls before ignition.'], range: 'Typically 0–5 s; longer coasts for high-altitude upper stages.', doc: 'phases' } }] : []),
      { id: id('thrust'), label: 'Thrust curve (from ignition)', kind: 'table', minRows: 2, when: on, columns: [{ id: 't', label: 'Time', ...TIME }, { id: 'T', label: 'Thrust', ...FORCE }], default: d.thrust, validate: checkThrust,
        info: { text: ['The motor’s thrust against time from ignition; the last time is burnout.', 'Copy it from ThrustCurve.org or the maker’s data sheet (those are sea-level values; the calculator adds the exit pressure term to get the vacuum thrust).', 'The area under the curve is the total impulse; how it is spread decides how fast the rocket leaves the rail.'], doc: 'motor' } },
      { id: id('Wp'), label: 'Propellant weight', sym: `W_{p${k}}`, ...MASS, default: d.Wp, min: 1e-6, max: 5000, slider: { min: 0.1, max: 3 * d.Wp, step: 0.05 }, when: on,
        info: { text: ['The weight of propellant this motor burns: the motor’s loaded weight minus its empty case.', 'From the motor data sheet or ThrustCurve.org.', 'It is burned in proportion to the impulse delivered, so the rocket gets lighter during the burn. More propellant with the same thrust curve means a higher specific impulse is assumed.'], tex: 'I_{sp}=\\frac{I_{vac}}{W_p}', range: 'H–K motors 0.1–1 kg; L–M 1–5 kg; N–O 5–20 kg.', doc: 'motor' } },
      { id: id('Ae'), label: 'Nozzle exit area', sym: `A_{e${k}}`, ...AREA, default: d.Ae, min: 0, max: 1e4, slider: { min: 0, max: 2 * d.Ae, step: 0.01 }, when: on,
        info: { text: ['The area of the motor nozzle’s exit opening, πd²/4 of its exit diameter.', 'Measure the nozzle or take it from the motor drawing.', 'The air pressure pushing on the exit lowers the thrust at low altitude; higher up, where the air is thinner, the motor gives more thrust.'], tex: 'T=T_{vac}-pA_e', range: 'About 0.2–5 in² (1–30 cm²) for high-power motors.', doc: 'motor' } },
      { id: id('vac'), label: 'Thrust curve is vacuum thrust', kind: 'bool', default: false, when: on, info: { text: ['Tick only if your thrust curve is already the vacuum thrust (rare: from a motor-design program).', 'Untick for test-stand or ThrustCurve.org data, which are measured at sea-level pressure.', 'When unticked the calculator adds the pressure thrust that grows as the air thins with height.'], tex: 'T=T_{vac}-p\\,A_e', doc: 'motor' } },
    ],
  };
};

/** Calc input from the form values. */
function params(v) {
  const N = +v.nStages, stages = [];
  for (let k = 1; k <= N; k++) {
    const g = (x) => v[`s${k}${x}`];
    stages.push({ Wp: g('Wp'), Wd: g('Wd'), thrust: g('thrust').map((r) => [r.t - g('thrust')[0].t, r.T]), seaLevel: !g('vac'), Ae: g('Ae') / 144, S: (Math.PI * (g('d') / 12) ** 2) / 4,
      cd: g('cd').map((r) => [r.M, r.off, r.on]), delay: k > 1 ? g('delay') : 0 });
  }
  return { site: { ho: v.ho, To: v.To, lat: v.lat }, QE: v.QE * D2R, L: v.L, lamP: (2 * Math.PI) / v.waveP, useSimRail: v.simRail, wind: windParts(v)?.table ?? [],
    stages, tau: v.tau, dt: 0.05,
    drogue: v.useDrogue ? { CdS: (v.cdD * Math.PI * v.dD ** 2) / 4, delay: v.tD } : null, main: v.useMain ? { CdS: (v.cdM * Math.PI * v.dM ** 2) / 4, h: v.hM } : null };
}
/** At most ~600 rows for plotting, always keeping the first and last. */
const thin = (H) => { const k = Math.max(1, Math.ceil(H.length / 600)); return H.filter((r, i) => i % k === 0 || i === H.length - 1); };
/** Bisection between a value that meets the target (good) and one that does not (bad); returns the good side of the edge. */
function edge(ok, good, bad, n = 40) { for (let i = 0; i < n; i++) { const m = (good + bad) / 2; if (ok(m)) good = m; else bad = m; } return good; }
const ST = { safe: 'ok', marginal: 'warn', unsafe: 'err' };
const levelColor = (lv) => (lv === 'unsafe' ? 'var(--danger)' : lv === 'marginal' ? 'var(--warn)' : 'var(--ok)');

export default {
  slug: 'skyaero-trajectory',
  topic: 'trajectory-simulation',
  title: 'Trajectory Simulation',
  subtitle: 'The flight of a one- to three-stage rocket from the rail to landing — <b>apogee</b>, rail exit speed, <b>where it lands</b> in the wind and how hard — checked against your field’s limits, with the rail, parachute or ballast that fixes it.',
  verdict: true,
  tiers: true,
  intro: {
    what: 'Flies your rocket second by second: up the launch rail, through the motor burn and any staging, coasting to apogee, and down under its parachutes, with the winds at each height carrying it across the ground.',
    why: 'Apogee must stay under your altitude waiver, the rocket must leave the rail fast enough for its fins to steer it, and it must land softly inside the recovery area. One simulation answers all three.',
    when: 'Choosing a motor, a rail and a parachute; checking a launch day’s forecast winds; finding apogee, peak Mach and peak dynamic pressure for the structure and the fin-flutter check.',
  },
  info: {
    text: [
      'The calculator treats the rocket as a single point that has weight, thrust and drag. Every few hundredths of a second it adds up these forces, works out the acceleration, and moves the rocket on.',
      'On the rail the rocket can only slide along it. After it leaves, the thrust pushes along the direction it flies through the air, and the drag pulls back. A real rocket turns into the wind (weathercocks); to copy that, the model uses a slightly longer rail and lets the wind act gradually (Hoult).',
      'The flight is in the vertical plane of the launch direction. Wind across that plane is added afterwards as drift during the descent: an estimate.',
    ],
    tex: '\\dot{\\vec V}=\\frac{T-D}{m}\\,\\hat u_{rel}-g\\,\\hat z,\\qquad D=\\tfrac12\\rho V_{rel}^2C_D(M)S',
    steps: ['Set the launch site, launch direction, launcher angle and rail length.', 'Pick the number of stages; enter weights, thrust curves and drag tables.', 'Add parachutes and the wind (or load the forecast winds for the site).', 'Set your limits: rail exit speed, thrust-to-weight, altitude ceiling, recovery area and landing speed.', 'Read the verdict and the fixes, then the plots.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'site', title: 'Launch site',
      fields: [
        { id: 'lat', label: 'Latitude', sym: '\\varphi', ...ANG, default: 34.5, min: -90, max: 90, slider: { min: -90, max: 90, step: 0.1 },
          info: { text: ['North–south position of the launch site in degrees (north positive), as shown by any map app.', 'Sets gravity and the shape of the atmosphere (the tropopause is higher near the equator), and is used to load the forecast winds and open the site on a map.'], doc: 'atmosphere' } },
        { id: 'ho', label: 'Site elevation (above sea level)', sym: 'h_0', ...ALT, default: 1898, min: -1000, max: 20000, slider: { min: 0, max: 10000, step: 10 },
          info: { text: ['How high the launch site is above sea level.', 'From a map app or GPS; “Load winds from Open-Meteo” fills it from the forecast’s terrain height.', 'Higher sites have thinner air, so less drag and a slightly higher apogee. All heights in the results are above the ground.'], range: 'Coastal sites 0–100 m; Black Rock 1190 m (3900 ft); Spaceport America 1400 m.', doc: 'atmosphere', tex: 'p=p(h_0+h),\\quad \\rho=\\rho(h_0+h)' } },
      ],
    },
    {
      id: 'weather', title: 'Weather on the day',
      fields: [
        { id: 'To', label: 'Ground air temperature', sym: 'T_0', dim: 'temperature', internal: 'R', default: 559.67, min: 400, max: 600, slider: { min: 440, max: 580, step: 0.5 },
          info: { text: ['The air temperature about 2 m above the ground on launch day.', 'From a thermometer or the forecast (the Open-Meteo button fills it).', 'Hot air is thinner: on a hot day the rocket meets less drag and climbs a little higher.'], range: '−20 °C to +45 °C (−4 °F to 113 °F).', doc: 'atmosphere' } },
        { id: 'windMode', label: 'Wind', kind: 'select', default: 'uniform', options: [{ value: 'uniform', label: 'Uniform wind' }, { value: 'layers', label: 'Wind layers' }],
          info: { text: ['One wind, the same speed and direction at every height, or a list of wind layers — speed and direction at several heights, as weather forecasts give them.', 'Use “Load winds from Open-Meteo” to fill the layers from a forecast for the latitude and longitude above.', 'Wind tilts the rocket into it off the rail (weathercocking) and then carries the parachutes downwind: it moves both the apogee and the landing point.'], doc: 'wind' } },
        { id: 'windU', label: 'Wind speed', sym: 'w', ...SPD, default: 15, min: 0, max: 300, slider: { min: 0, max: 80, step: 0.5 }, when: (v) => !layered(v),
          info: { text: ['A single wind, the same at every height: its speed.', 'Use the forecast ground wind for a low flight, or an average of the winds aloft for a high one. Set 0 for still air.', 'Along the launch direction it changes the range (the rocket turns into it while climbing); across it, it pushes the rocket sideways during the descent.'], range: 'Ground 2–8 m/s (7–26 ft/s); most ranges stop launches above about 9 m/s (20 mph).', doc: 'wind' } },
        { id: 'windDir', label: 'Wind blows from', sym: '\\theta_w', ...ANG, default: 270, min: 0, max: 360, slider: { min: 0, max: 360, step: 5 }, when: (v) => !layered(v),
          info: { text: ['The compass direction the wind comes FROM: 270° is a west wind, which pushes the rocket east.', 'Weather reports give it this way.', 'Launching into the wind (launch direction close to the wind-from direction) is usual.'], range: '0–360°.', doc: 'wind' } },
        { id: 'winds', label: 'Wind layers', kind: 'table', minRows: 1, when: layered,
          columns: [{ id: 'h', label: 'Height above ground', ...ALT }, { id: 'w', label: 'Speed', ...SPD }, { id: 'dir', label: 'From (°)', ...ANG }],
          default: [{ h: 0, w: 10, dir: 270 }, { h: 3000, w: 25, dir: 260 }, { h: 10000, w: 45, dir: 250 }, { h: 20000, w: 70, dir: 245 }], validate: checkWind,
          info: { text: ['Each row is the wind at one height above the ground: its speed and the compass direction it blows FROM (270 = from the west, so it pushes the rocket east). Between rows it changes smoothly; above the top row and below the bottom row it stays as in that row.', 'Fill it from a forecast (the button below), a balloon sounding, or by hand.', 'Wind along the launch direction changes how far the rocket flies; wind across it pushes the rocket sideways while it descends.'], range: 'Ground 2–8 m/s; 3–10 km often 10–30 m/s (30–100 ft/s).', doc: 'wind' } },
        { id: 'lon', when: layered, label: 'Longitude', sym: '\\lambda_E', ...ANG, default: -117.8, min: -180, max: 180,
          info: { text: ['East–west position of the launch site in degrees (east positive, west negative).', 'Only used to load the forecast winds and to open the site on a map.'], doc: 'wind' } },
        { id: 'when', when: layered, label: 'Launch date and time (site local)', kind: 'datetime', default: '',
          info: { text: ['The date and hour of your launch, in the launch site’s local time. Leave it empty for now.', 'Then press “Load winds from Open-Meteo” to fill the wind layers from the forecast for that hour. Forecasts reach about 16 days ahead; past dates up to about 3 months back give the model’s recent analysis.', 'Only the wind layers depend on it; the flight model itself does not.'], doc: 'wind' } },
      ],
    },
    {
      id: 'launch', title: 'Launcher',
      fields: [
        { id: 'QE', label: 'Launcher elevation (QE)', sym: 'QE', ...ANG, default: 85, min: 1, max: 90, slider: { min: 60, max: 90, step: 0.5 },
          info: { text: ['The angle of the launch rail above the horizontal: 90° is straight up.', 'Set on the launcher; ranges usually allow 80–90° (and require tilting away from the crowd).', 'Tilting the rail further sends the rocket farther downrange and lowers apogee. Drag the launcher in the drawing to change it.'], range: 'Most launches 80–90°; 85° is typical.', doc: 'rail', tex: '\\hat u_0=(\\cos QE\\cos\\psi,\\ \\cos QE\\sin\\psi,\\ \\sin QE)' } },
        { id: 'az', label: 'Launch direction (azimuth)', sym: '\\psi', ...ANG, default: 270, min: 0, max: 360, slider: { min: 0, max: 360, step: 1 },
          info: { text: ['The compass direction the rail leans towards: 0° north, 90° east, 180° south, 270° west.', 'Usually into the wind, so the rocket lands nearer the pad after drifting back.', 'Only matters with wind layers: it decides how much of each wind blows along the flight (changing the range) and how much across it (drift to the side).'], range: '0–360°.', doc: 'wind' } },
        { id: 'L', label: 'Rail length', sym: 'L', ...DIST, default: 12, min: 0.01, max: 500, slider: { min: 1, max: 40, step: 0.25 },
          info: { text: ['How far the rocket slides along the rail or rod before it is free: the length of rail above the rocket’s lower rail button.', 'Measure it on the launcher.', 'A longer rail gives the motor more time to speed the rocket up before the fins have to steer it, so the rocket leaves faster.'], range: 'Rods 1–2 m (3–6 ft); rails 2–6 m (6–20 ft); research rails up to 10 m+.', doc: 'rail', tex: 'V_L=V(\\text{rocket at the end of the rail})' } },
      ],
    },
    {
      id: 'stagesg', title: 'Rocket',
      fields: [{ id: 'nStages', label: 'Number of stages', kind: 'select', default: '1', options: [{ value: '1', label: 'One stage' }, { value: '2', label: 'Two stages' }, { value: '3', label: 'Three stages' }],
        info: { text: ['How many motors fire one after another.', 'Each lower stage drops off when its motor burns out; the next motor lights after its coast time.', 'More stages reach higher by dropping dead weight, but each coast adds drift and an ignition to get right.'], doc: 'phases' } }],
    },
    ...[1, 2, 3].flatMap((k) => [airframeGroup(k), motorGroup(k)]),
    {
      id: 'recovery', title: 'Recovery',
      fields: [
        { id: 'useDrogue', label: 'Drogue parachute', kind: 'bool', default: true, info: { text: ['A small parachute opened near apogee.', 'The rocket falls fast but stable under it, so it drifts less, until the main opens lower down.', 'Without it the rocket tumbles to the main opening height (or the main opens at apogee and drifts far).'], doc: 'recovery', tex: 'V=\\sqrt{\\frac{2W}{C_DS\\rho}}' } },
        { id: 'tD', label: 'Drogue opens … after apogee', sym: 't_D', ...TIME, default: 1, min: 0, max: 60, slider: { min: 0, max: 20, step: 0.5 }, when: (v) => v.useDrogue,
          info: { text: ['The delay from apogee to the drogue opening, as set on the altimeter.', 'A second or two after apogee keeps the opening gentle, while the rocket is slow.'], range: '0–2 s for altimeters; motor ejection is often several seconds off.', doc: 'recovery' } },
        { id: 'dD', label: 'Drogue diameter', sym: 'D_D', ...DIST, default: 3, min: 0.01, max: 100, slider: { min: 0.5, max: 8, step: 0.1 }, when: (v) => v.useDrogue,
          info: { text: ['The flat (laid-out) diameter of the drogue.', 'A bigger drogue falls slower: gentler, but more drift.'], range: 'High-power 1–3 ft (0.3–1 m).', doc: 'recovery' } },
        { id: 'cdD', label: 'Drogue drag coefficient', sym: 'C_{DD}', ...NONE, default: 0.87, min: 0.1, max: 2.5, slider: { min: 0.3, max: 1.6, step: 0.01 }, when: (v) => v.useDrogue,
          info: { text: ['How draggy the drogue is for its flat area; from the maker, or about 0.8 for a round canopy.'], range: 'Cross 0.6–0.8; round 0.75–0.9; elliptical up to 1.5 (based on its own area).', doc: 'recovery' } },
        { id: 'useMain', label: 'Main parachute', kind: 'bool', default: true, info: { text: ['The large parachute that slows the rocket for landing, opened at a set height above the ground.', 'Its diameter and drag coefficient set the landing speed.', 'A bigger main lands softer but drifts farther; the verdict gives the diameter for your landing speed.'], doc: 'recovery', tex: 'V=\\sqrt{\\frac{2W}{C_DS\\rho}}' } },
        { id: 'hM', label: 'Main opens at height (above ground)', sym: 'h_M', ...ALT, default: 1000, min: 1, max: 1e5, slider: { min: 100, max: 5000, step: 50 }, when: (v) => v.useMain,
          info: { text: ['The height above the ground at which the altimeter opens the main.', 'Lower means less time under the big canopy, so less drift, but less time to open before landing.'], range: '500–1500 ft (150–450 m) is common.', doc: 'recovery' } },
        { id: 'dM', label: 'Main diameter', sym: 'D_M', ...DIST, default: 12, min: 0.01, max: 200, slider: { min: 2, max: 30, step: 0.1 }, when: (v) => v.useMain,
          info: { text: ['The flat diameter of the main parachute.', 'The landing speed falls in proportion to the diameter: double it, land at half the speed (and drift farther).'], tex: 'V=\\sqrt{\\frac{8W}{\\pi C_{DM}\\rho D_M^2}}', range: 'High-power 4–15 ft (1.2–4.5 m).', doc: 'recovery' } },
        { id: 'cdM', label: 'Main drag coefficient', sym: 'C_{DM}', ...NONE, default: 0.89, min: 0.1, max: 2.5, slider: { min: 0.3, max: 1.6, step: 0.01 }, when: (v) => v.useMain,
          info: { text: ['How draggy the main is for its flat area; from the maker, or about 0.8 for a round canopy.'], range: 'Round 0.75–0.9; toroidal/annular up to 2.2 (based on their own area).', doc: 'recovery' } },
        { id: 'tau', label: 'Inflation time constant', sym: '\\tau', ...TIME, default: 2, min: 0.05, max: 20, slider: { min: 0.1, max: 6, step: 0.1 }, when: (v) => v.useDrogue || v.useMain,
          info: { text: ['How quickly a parachute fills: its drag reaches 63 % of the full value after τ seconds and 95 % after 3τ.', 'Small parachutes open in a fraction of a second, large ones in a few seconds.'], tex: 'C_DS(t)=C_DS_{full}\\left(1-e^{-t/\\tau}\\right)', range: '0.3–3 s.', doc: 'recovery' } },
      ],
    },
    {
      id: 'limits', title: 'Your limits',
      fields: [
        { id: 'vRail', label: 'Rail exit speed you need', sym: 'V_{L,min}', ...SPD, default: 44, min: 1, max: 500, slider: { min: 20, max: 120, step: 1 },
          info: { text: ['The slowest the rocket may leave the rail and still be steered by its fins.', 'A common rule of thumb is 44 ft/s (13.4 m/s, 30 mph); some ranges ask for more, and gusty days need more. Not a published limit: your choice.', 'The verdict compares the rail exit speed with it, and the calculator gives the shortest rail that reaches it.'], range: 'Rule of thumb 44 ft/s (13.4 m/s); 60–100 ft/s for long, heavy or windy flights.', doc: 'verdict', tex: 'V_L\\ge V_{L,min}' } },
        { id: 'twMin', label: 'Liftoff thrust-to-weight you need', sym: '(T/W)_{min}', ...NONE, default: 5, min: 1, max: 50, slider: { min: 1, max: 15, step: 0.1 },
          info: { text: ['The ratio of the motor’s peak thrust to the rocket’s weight at liftoff.', 'A common rule of thumb is at least 5 for a safe, straight liftoff; some ranges accept 3 with a long rail. Your choice.', 'Below it the rocket creeps off the pad and the wind turns it.'], tex: 'T/W=\\frac{T_{max}}{W_0}', range: 'Rule of thumb 5:1; 3:1 minimum with a long rail.', doc: 'verdict' } },
        { id: 'ceiling', label: 'Altitude ceiling (above ground)', sym: 'h_{ceil}', ...ALT, default: 20000, min: 100, max: 1e6, slider: { min: 1000, max: 60000, step: 100 },
          info: { text: ['The highest the rocket may go: your launch’s altitude waiver or the range’s limit, above the ground.', 'From the range safety officer or the waiver document.', 'The verdict checks apogee against it; if too high, the calculator gives the ballast (extra weight in the top stage) that brings apogee down to it. Drag the red line in the drawing to change it.'], doc: 'verdict', tex: 'h_{max}\\le h_{ceil}', range: 'Set by your waiver: 3000–20 000 ft (1–6 km) for most club launches.' } },
        { id: 'Rf', label: 'Recovery area radius', sym: 'R_f', ...DIST, default: 10000, min: 10, max: 1e6, slider: { min: 500, max: 30000, step: 100 },
          info: { text: ['How far from the pad the rocket can land and still be safe and recoverable.', 'Measure on a map from the pad to the nearest road, fence, water or edge of open ground.', 'The verdict checks the landing point against it. Drag the flag in the drawing to change it.'], range: 'Club fields 500–1500 m; desert sites several km.', doc: 'verdict', tex: 'r_I\\le R_f' } },
        { id: 'vLand', label: 'Landing speed you accept', sym: 'V_{T}', ...SPD, default: 25, min: 1, max: 300, slider: { min: 5, max: 60, step: 0.5 },
          info: { text: ['The fastest you are happy for the rocket to hit the ground under its parachute.', 'Your choice, from how robust the airframe is; 15–25 ft/s (4.5–7.5 m/s) is common for high-power rockets.', 'The verdict compares the landing descent speed with it, and the calculator gives the main parachute diameter that reaches it.'], range: '15–25 ft/s (4.5–7.5 m/s).', doc: 'verdict', tex: 'V_I\\le V_T' } },
      ],
    },    {
      id: 'model', title: 'Weathercocking model (advanced)',
      fields: [
        { id: 'waveP', label: 'Pitch/yaw wavelength', sym: '\\Lambda_P', ...DIST, default: 350, min: 1, max: 1e5, slider: { min: 50, max: 2000, step: 10 },
          info: { text: ['How far the rocket flies during one wobble (pitch oscillation) as it weathercocks after leaving the rail.', 'The Pitch-Yaw Wavenumber calculator gives it from the rocket’s stability; long, stable rockets have short wavelengths.', 'It sets how strongly the point-mass model turns into the wind: short wavelength, quick turn.'], tex: '\\lambda_P=\\frac{2\\pi}{\\Lambda_P}', range: 'High-power rockets 100–1000 ft (30–300 m).', doc: 'rail' } },
        { id: 'simRail', label: 'Use the simulated launcher length', kind: 'bool', default: true,
          info: { text: ['A point has no rotational inertia, so it would turn into the wind the instant it left the rail.', 'Hoult’s correction lengthens the rail in the model so the turn matches a real rocket’s, using its pitch wave number.', 'Leave it on; untick only to compare with simulations that use the physical rail.'], tex: 'L_{sim}=\\frac{0.140365}{\\lambda_P}\\exp\\left(\\sqrt{2\\pi\\lambda_PL}-0.387621(\\lambda_PL)^{1.2}\\right)', doc: 'rail' } },
      ],
    },
  ],
  results: [
    { id: 'apo', label: 'Apogee (above ground)', sym: 'h_{max}', ...ALT, key: true, digits: 4, status: (x, out) => ST[out.lv.ceil], note: (x, out) => `ceiling ${Q(out.v.ceiling, ALT, 3)} · at ${fmt(out.o.tApo, { digits: 3 })} s`,
      info: { text: ['The highest point of the flight, above the launch site.', 'From integrating the three-dimensional point-mass equations of motion with your thrust, drag and winds.', 'It must stay under your altitude ceiling; the verdict gives the ballast that brings it down if it does not.'], doc: 'overview', tex: 'h_{max}=\\max_t h(t)' } },
    { id: 'railV', label: 'Rail exit speed', sym: 'V_L', ...SPD, key: true, digits: 3, status: (x, out) => ST[out.lv.rail], note: (x, out) => `you need ${Q(out.v.vRail, SPD, 3)}${out.v.simRail ? ` · model leaves its ${Q(out.o.railL, DIST, 3)} rail at ${Q(out.o.railExit.V, SPD, 3)}` : ''}`,
      info: { text: ['How fast the rocket is moving when it leaves the real rail (its physical length).', 'Interpolated to the rail’s end within the integration step.', 'Below about 44 ft/s (13 m/s) the fins may not have enough airflow to keep it pointing straight, especially in wind; a longer rail or more initial thrust raises it.'], doc: 'rail', tex: 'V_L=V(\\text{end of the rail})' } },
    { id: 'dist', label: 'Lands … from the pad', sym: 'r_I', ...DIST, key: true, digits: 3, status: (x, out) => ST[out.lv.area], note: (x, out) => (out.o.impact ? `area ${Q(out.v.Rf, DIST, 3)} · towards ${Math.round(out.results.bearing)}°` : 'no landing within 4 h'),
      info: { text: ['The straight-line distance from the pad to the landing point, along and across the launch direction together.', 'From the whole flight, including the drift under the parachutes.', 'It must stay inside your recovery area; a lower main opening or less wind shortens it.'], tex: 'r_I=\\sqrt{x_I^2+y_I^2}', doc: 'wind' } },
    { id: 'vImp', label: 'Landing descent speed', sym: 'V_I', ...SPD, key: true, digits: 3, status: (x, out) => ST[out.lv.land], note: (x, out) => (out.v.useMain || out.v.useDrogue ? `you accept ${Q(out.v.vLand, SPD, 3)}` : 'no parachute: ballistic'),
      info: { text: ['How fast the rocket falls when it reaches the ground (the vertical part; the wind adds a sideways part).', 'Under a fully open main it is the steady descent speed at ground level.', 'The verdict compares it with your accepted landing speed and gives the main diameter that reaches it.'], tex: 'V=\\sqrt{\\frac{2W}{C_DS\\rho}}', doc: 'recovery' } },
    { id: 'maxMach', label: 'Peak Mach number', sym: 'M_{max}', ...NONE, digits: 3, note: (x, out) => `at ${fmt(out.o.maxMach.t, { digits: 3 })} s, ${Q(out.o.maxMach.z, ALT, 4)}`,
      info: { text: ['The fastest the rocket flies, as a multiple of the speed of sound.', 'Near and above Mach 1 drag jumps, the nose and fins heat and flutter becomes likelier: use it in the Fin Flutter calculator.'], doc: 'forces' } },
    { id: 'tw', label: 'Liftoff thrust-to-weight', sym: 'T/W', ...NONE, digits: 3, status: (x, out) => ST[out.lv.tw], note: (x, out) => `you need ${fmt(out.v.twMin, { digits: 3 })}`,
      info: { text: ['Peak thrust divided by the weight at liftoff (vacuum thrust, as SKYAERO reports it).'], tex: 'T/W=\\frac{T_{max}}{W_0}', doc: 'rail' } },
    { id: 'Lneed', label: 'Shortest rail for your exit speed', sym: 'L_{req}', ...DIST, digits: 3,
      info: { text: ['The rail length at which the rocket leaves exactly at your rail exit speed, everything else unchanged. “—” when even 500 ft of rail is not enough: the motor is too weak for the rocket.'], doc: 'verdict' } },
    { id: 'Dneed', label: 'Main diameter for your landing speed', sym: 'D_{M,req}', ...DIST, digits: 3,
      info: { text: ['The main parachute flat diameter that lands the rocket exactly at your accepted speed (steady descent at ground level, with your main drag coefficient).'], tex: 'D_M=\\sqrt{\\frac{8W}{\\pi C_{DM}\\rho_GV_T^2}}', doc: 'verdict' } },
    { id: 'ballast', label: 'Ballast to stay under the ceiling', sym: '\\Delta W', ...MASS, digits: 3,
      info: { text: ['Extra weight in the top stage that brings apogee down to your ceiling. “—” when apogee is already below it.', 'Ballast also slows the rail exit: check the verdict again after adding it.'], doc: 'verdict' } },
    { id: 'hMneed', label: 'Main opening height to land inside the area', sym: 'h_{M,req}', ...ALT, digits: 3,
      info: { text: ['The highest main opening height that keeps the landing point inside the recovery area. “—” when it is already inside, or when even opening at 100 ft is not enough.'], doc: 'verdict' } },
    { id: 'range', label: 'Downrange distance at landing', sym: 'x_I', ...DIST, digits: 4, note: (x, out) => (out.o.impact ? `at ${fmt(out.o.impact.t, { digits: 4 })} s` : 'no landing within 4 h'),
      info: { text: ['How far the landing point is along the launch direction (negative: behind the pad, blown back by the wind).'], doc: 'overview' } },
    { id: 'cross', label: 'Sideways drift (estimate)', sym: 'y_I', ...DIST, digits: 3,
      info: { text: ['How far the crosswind pushes the rocket to the right (+) or left (−) of the launch direction while it descends.', 'An estimate: the flight itself is simulated in the launch plane only, and the rocket is taken to drift with the full crosswind after apogee.'], doc: 'wind' } },
    { id: 'bearing', label: 'Direction of the landing point', sym: '\\beta_I', ...ANG, digits: 3, info: { text: ['Compass direction from the pad to the landing point (0° north, 90° east).'], doc: 'wind' } },
    { id: 'maxQ', label: 'Peak dynamic pressure', sym: 'q_{max}', ...PRES, digits: 4, note: (x, out) => `at ${fmt(out.o.maxQ.t, { digits: 3 })} s`,
      info: { text: ['The largest “wind pressure” on the rocket, ½ρV². It sets the aerodynamic loads on the nose, fins and body.'], tex: 'q=\\tfrac12\\rho V^2', doc: 'forces' } },
    { id: 'maxG', label: 'Peak acceleration', sym: 'n_{max}', ...NONE, digits: 3, note: () => 'g', info: { text: ['The largest acceleration, in multiples of gravity: what the electronics and payload must survive.'], doc: 'forces' } },
    ...[1, 2, 3].map((k) => ({ id: `vb${k}`, label: `Stage ${k} burnout speed`, sym: `V_{b${k}}`, ...SPD, digits: 4, when: (v) => +v.nStages >= k,
      note: (x, out) => { const b = out.o.burnouts[k - 1]; return b ? `${Q(b.z, ALT, 4)} above ground, climbing at ${fmt(b.gam / D2R, { digits: 3 })}°` : ''; }, info: { text: ['Speed when this motor burns out, with the height and the climb angle there.'], doc: 'phases' } })),
    { id: 'railL', label: 'Rail length used in the simulation', sym: 'L_{sim}', ...DIST, digits: 4, info: { text: ['The longer rail the point-mass model uses so it weathercocks like a real rocket (Hoult, 1976).'], tex: 'L_{sim}=\\frac{0.140365}{\\lambda_P}\\exp\\left(\\sqrt{2\\pi\\lambda_PL}-0.387621(\\lambda_PL)^{1.2}\\right)', doc: 'rail' } },
  ],
  compute(v) {
    for (let k = 1; k <= +v.nStages; k++) {
      const m = checkThrust(v[`s${k}thrust`]) || checkCd(v[`s${k}cd`]);
      if (m) throw new InputError(`Stage ${k}: ${m}`);
    }
    if (layered(v)) { const m = checkWind(v.winds); if (m) throw new InputError(`Wind layers: ${m}`); }
    const p = params(v);
    p.stages.forEach((st, i) => {
      if (st.Ae > st.S) throw new InputError(`Stage ${i + 1}: the nozzle exit area is larger than the reference area πd²/4.`);
      const W = p.stages.slice(i).reduce((a, x) => a + x.Wp + x.Wd, 0), CdS = st.S * Math.max(...st.cd.map((r) => Math.max(r[1], r[2])));
      if (Math.sqrt((2 * W) / (0.0024 * CdS)) < 1) throw new InputError(`Stage ${i + 1}: the drag area is far too large for the weight (terminal speed under 1 ft/s).`);
    });
    const o = simulate(p);
    if (!o.railExit) throw new InputError('The rocket never leaves the rail: liftoff thrust is below the weight component along the rail.');
    const b = o.burnouts, last = o.hist[o.hist.length - 1], wp = windParts(v);
    // sideways drift and the landing point on the map (x along the launch direction, y to its right)
    const cd = wp ? crossDrift(o, (h) => wp.comp(h).cross) : { y: o.hist.map(() => 0), final: 0 };
    const a = v.az * D2R, xI = last.x, yI = cd.final, E = xI * Math.sin(a) + yI * Math.cos(a), N = xI * Math.cos(a) - yI * Math.sin(a);
    const dist = Math.hypot(xI, yI), bearing = ((Math.atan2(E, N) / D2R) + 360) % 360, chute = v.useMain || v.useDrogue, vImp = -last.vz;
    // solved fixes
    // the rail exit speed that steers the real rocket is off the physical rail (L_sim only models weathercocking)
    const noChutes = { ...p, drogue: null, main: null };
    const railV = (L) => simulate({ ...noChutes, L, useSimRail: false, stopAfterRail: true }).railExit?.V ?? 0, okRail = (L) => railV(L) >= v.vRail;
    const VL = p.useSimRail ? railV(v.L) : o.railExit.V;
    const Lneed = okRail(500) ? edge(okRail, 500, 0, 30) : null;
    const rhoG = atmosphere({ h: v.ho, ho: v.ho, To: v.To, phi: v.lat }).rho, Wland = last.W;
    const Dneed = Math.sqrt((8 * Wland) / (Math.PI * v.cdM * rhoG * v.vLand ** 2));
    let ballast = null;
    if (o.hApo > v.ceiling) {
      const top = p.stages.length - 1, apoW = (dW) => simulate({ ...noChutes, stages: p.stages.map((st, i) => (i === top ? { ...st, Wd: st.Wd + dW } : st)) }).hApo;
      const big = 4 * p.stages.reduce((s1, st) => s1 + st.Wp + st.Wd, 0);
      if (apoW(big) <= v.ceiling) ballast = edge((dW) => apoW(dW) <= v.ceiling, big, 0, 20);
    }
    let hMneed = null;
    if (v.useMain && o.landed && dist > v.Rf) {
      const distAt = (h) => { const q = simulate({ ...p, main: { ...p.main, h } }), y = wp ? crossDrift(q, (z) => wp.comp(z).cross).final : 0; return Math.hypot(q.hist[q.hist.length - 1].x, y); };
      if (distAt(100) <= v.Rf) hMneed = edge((h) => distAt(h) <= v.Rf, 100, v.hM, 20);
    }
    // verdict (D26): rail exit, liftoff T/W, ceiling, landing speed, recovery area
    const band = (ok, near) => (ok ? 'safe' : near ? 'marginal' : 'unsafe');
    const lv = {
      rail: band(VL >= v.vRail, VL >= LOW * v.vRail),
      tw: band(o.liftoffTW >= v.twMin, o.liftoffTW >= LOW * v.twMin),
      ceil: band(o.hApo <= CEIL_WARN * v.ceiling, o.hApo <= v.ceiling),
      land: !o.landed ? 'marginal' : !chute ? 'unsafe' : band(vImp <= v.vLand, vImp <= LAND_MARGIN * v.vLand),
      area: !o.landed ? 'marginal' : band(dist <= AREA_WARN * v.Rf, dist <= v.Rf),
    };
    const rank = { safe: 0, marginal: 1, unsafe: 2 }, worst = Object.values(lv).reduce((w, x) => (rank[x] > rank[w] ? x : w), 'safe');
    const order = ['rail', 'tw', 'ceil', 'land', 'area'].sort((x, y) => rank[lv[y]] - rank[lv[x]]);
    const TITLES = {
      rail: ['The rocket leaves the rail too slowly', 'Rail exit speed a little below what you need'],
      tw: ['Not enough thrust for a safe liftoff', 'Thrust-to-weight a little below what you need'],
      ceil: ['Apogee is above your altitude ceiling', 'Apogee is close to your ceiling'],
      land: [!chute ? 'No parachute: the rocket lands ballistically' : 'The rocket lands too hard', !o.landed ? 'No landing within four hours of flight' : 'Landing a little faster than you accept'],
      area: ['The rocket lands outside the recovery area', !o.landed ? 'No landing within four hours of flight' : 'Landing close to the edge of the area'],
    };
    const fixFor = {
      rail: () => [Lneed != null ? `Use a rail of at least <b>${Q(Lneed, DIST, 3)}</b> (now ${Q(v.L, DIST, 3)}), or a motor with a harder start.` : 'Even 500 ft of rail is not enough: use a motor with more initial thrust, or make the rocket lighter.'],
      tw: () => [`Pick a motor with at least <b>${Q(v.twMin * o.hist[0].W, FORCE, 3)}</b> peak thrust (the rocket weighs ${Q(o.hist[0].W, FORCE, 3)} at liftoff), or make it lighter.`],
      ceil: () => [ballast != null ? `Add <b>${Q(ballast, MASS, 3)}</b> of ballast to the ${p.stages.length > 1 ? 'top stage' : 'rocket'}, or use a smaller motor.` : 'Use a smaller motor: ballast alone cannot bring apogee under the ceiling.'],
      land: () => [!chute ? `Add a main parachute of at least <b>${Q(Dneed, DIST, 3)}</b> flat diameter.` : `Use a main parachute of at least <b>${Q(Dneed, DIST, 3)}</b> flat diameter${v.useMain ? ` (now ${Q(v.dM, DIST, 3)})` : ''}.`],
      area: () => [hMneed != null ? `Open the main at <b>${Q(hMneed, ALT, 3)}</b> above ground or lower (now ${Q(v.hM, ALT, 3)}), or` : '', 'aim the launcher with the <a href="wind-compensation.html">Wind Compensation</a> calculator, use a smaller drogue, or wait for less wind.'].filter(Boolean),
    };
    const bad = order.filter((k) => lv[k] !== 'safe'), fixes = bad.flatMap((k) => fixFor[k]()).slice(0, 3);
    const verdict = {
      level: worst,
      title: worst === 'safe' ? 'Fast off the rail, under the ceiling, a soft landing inside the area' : TITLES[bad[0]][lv[bad[0]] === 'unsafe' ? 0 : 1],
      text: `Leaves the rail at <b>${Q(VL, SPD, 3)}</b> (you need ${Q(v.vRail, SPD, 3)}), reaches <b>${Q(o.hApo, ALT, 3)}</b> (ceiling ${Q(v.ceiling, ALT, 3)})${o.landed ? ` and lands at <b>${Q(vImp, SPD, 3)}</b>, <b>${Q(dist, DIST, 3)}</b> from the pad (area ${Q(v.Rf, DIST, 3)})` : ''}.`,
      fixes,
    };
    const warnings = [];
    if (p.useSimRail && p.lamP * v.L > 2) warnings.push({ level: 'info', text: `λ_P·L = ${fmt(p.lamP * v.L, { digits: 3 })} is beyond Hoult’s launcher-length table (≤ 2); its last increment is used.` });
    if (!o.landed) warnings.push({ level: 'warn', text: 'No landing within four hours of flight time.', fix: 'Check the parachute sizes and the weights.' });
    if (o.hApo + v.ho > 154000) warnings.push({ level: 'info', text: 'Apogee is above about 47 km, beyond the altitudes the atmosphere model was built for; drag there is negligible anyway.' });
    if (o.maxMach.mach > Math.max(...p.stages.map((st) => st.cd[st.cd.length - 1][0]))) warnings.push({ level: 'info', text: 'Peak Mach is beyond the end of a drag table; the last C_D is held constant.', fix: 'Extend the drag table to the peak Mach number.' });
    if (+v.nStages > 1 && b.length < +v.nStages) warnings.push({ level: 'warn', text: 'An upper stage did not burn before landing.', fix: 'Shorten the coast before ignition.' });
    if (v.useMain && v.useDrogue && v.hM >= o.hApo) warnings.push({ level: 'info', text: 'The main opening height is above apogee, so the main opens as soon as the rocket starts falling.', fix: `Set it below apogee (${Q(o.hApo, ALT, 3)}).` });
    if (wp && (layered(v) || v.windU > 0)) warnings.push({ level: 'info', text: 'Wind directions are where the wind blows from. The sideways drift is an estimate: the flight is simulated in the launch plane and the crosswind is applied during the descent.' });
    const results = { apo: o.hApo, range: xI, maxMach: o.maxMach.mach, railV: VL, maxQ: o.maxQ.q, maxG: o.maxG.gs, tw: o.liftoffTW, railL: o.railL,
      dist, bearing, cross: yI, vImp, Lneed: Lneed ?? '—', Dneed, ballast: ballast ?? '—', hMneed: hMneed ?? '—' };
    for (let k = 1; k <= 3; k++) results[`vb${k}`] = b[k - 1]?.V ?? '—';
    return { results, warnings, verdict, lv, o, v, p, wp, cy: cd.y, ground: { E, N } };
  },
  actions: [
    {
      label: 'Load winds from Open-Meteo', group: 'weather', when: layered, title: 'Fetch the forecast winds at the launch site (Open-Meteo, free, no account) into the wind layers; also sets the site elevation and temperature',
      async run(v) {
        const m = await fetchWinds(v.lat, v.lon, v.when);
        const values = { windMode: 'layers', winds: m.rows, ho: m.elevFt };
        if (m.tempR != null) values.To = Math.min(600, Math.max(400, m.tempR));
        return { values, message: `Loaded ${m.rows.length} wind layers for ${m.when} local time; site elevation ${Math.round(m.elevM)} m${m.tempR != null ? `, ${fmt(m.tempC, { digits: 3 })} °C` : ''}. ${METEO_CREDIT}` };
      },
    },
    ...mapActions('weather', layered),
  ],
  plots: [
    {
      id: 'flight', title: 'The whole flight, second by second', wide: true, height: 560,
      info: { text: ['Three views of the flight on one time axis, from liftoff to landing: height above the ground, speed through the air (hover for the Mach number too), and distance from the pad.', 'The vertical lines mark burnouts, apogee and the parachutes opening. The red lines are your ceiling and your recovery area: the flight should stay below both.', 'The boost is over in seconds; the next plot zooms in on it.'], doc: 'overview' },
      build(v, out, { U }) {
        const ua = U(ALT), us = U(SPD), ud = U(DIST), o = out.o, idx = thin(o.hist.map((r, i) => i)), H = idx.map((i) => ({ ...o.hist[i], y: out.cy[i] }));
        const chuteAt = (k) => o.hist.find((r) => r.phase === k);
        const vl = [...o.burnouts.map((bo) => ({ x: bo.t, label: `burnout ${bo.stage}`, color: 'var(--text-3)', row: bo.stage - 1 })), { x: o.tApo, label: 'apogee', color: 'var(--text-3)', row: 1 }];
        for (const [k, r] of [['drogue', 2], ['main', 0]]) { const q = chuteAt(k); if (q) vl.push({ x: q.t, label: k, color: 'var(--text-3)', row: r }); }
        return {
          x: { label: 'Time since liftoff', unit: 's' }, xDomain: [0, H[H.length - 1].t], vlines: vl,
          panels: [
            { y: { label: 'Height above ground', unit: ua.label }, color: 'var(--series-2)', includeZero: true, series: [{ name: 'height', points: H.map((r) => [r.t, ua.v(r.z)]) }],
              hlines: v.ceiling <= 1.5 * o.hApo ? [{ y: ua.v(v.ceiling), label: 'your ceiling', color: 'var(--danger)' }] : [] },
            { y: { label: 'Speed through the air', unit: us.label }, color: 'var(--series-1)', includeZero: true, ratio: { label: '$M$' }, series: [{ name: 'speed', points: H.map((r) => [r.t, us.v(r.V), r.mach]) }] },
            { y: { label: 'Distance from the pad', unit: ud.label }, color: 'var(--series-4)', includeZero: true, series: [{ name: 'distance', dash: '7 4', points: H.map((r) => [r.t, ud.v(Math.hypot(r.x, r.y))]) }],
              hlines: [{ y: ud.v(v.Rf), label: 'edge of the recovery area', color: 'var(--danger)' }] },
          ],
        };
      },
    },
    {
      id: 'boost', title: 'The boost: thrust, drag, acceleration and loads', wide: true, height: 600,
      info: { text: ['The first seconds of flight, while the motors burn and just after: thrust and drag, acceleration (in g), Mach number and dynamic pressure, on one time axis.', 'Thrust falls slightly below the curve you entered at low altitude (air pressure on the nozzle exit) and rises as the air thins. Drag peaks near Mach 1.', 'The peak dynamic pressure, marked, is what the fins and body must carry: use it in the Fin Flutter calculator.'], doc: 'forces' },
      build(v, out, { U }) {
        const uf = U(FORCE), up = U(PRES), o = out.o, tEnd = Math.min(o.tApo, Math.max(...o.tBurn) * 1.6 + 3);
        const H = o.hist.filter((r) => r.t <= tEnd), k = Math.max(1, Math.ceil(H.length / 500)), P = H.filter((r, i) => i % k === 0 || i === H.length - 1);
        return {
          x: { label: 'Time since liftoff', unit: 's' }, xDomain: [0, tEnd],
          vlines: [{ x: o.railExit.t, label: 'off the rail', color: 'var(--text-3)' }, ...o.burnouts.map((bo) => ({ x: bo.t, label: `burnout ${bo.stage}`, color: 'var(--text-3)', row: bo.stage })), ...(o.maxQ.t <= tEnd ? [{ x: o.maxQ.t, label: 'max q', color: 'var(--text-3)', row: 3 }] : [])],
          panels: [
            { y: { label: 'Force', unit: uf.label }, color: 'var(--series-1)', includeZero: true, series: [{ name: 'thrust $T$', points: P.map((r) => [r.t, uf.v(r.T)]) }, { name: 'drag $D$', dash: '7 4', points: P.map((r) => [r.t, uf.v(r.D)]) }] },
            { y: { label: 'Acceleration', unit: 'g' }, color: 'var(--series-2)', includeZero: true, series: [{ name: 'acceleration', points: P.map((r) => [r.t, r.gs]) }] },
            { y: { label: 'Mach number' }, color: 'var(--series-4)', includeZero: true, series: [{ name: '$M$', dash: '2 3', points: P.map((r) => [r.t, r.mach]) }], hlines: [{ y: 1, label: 'speed of sound', color: 'var(--text-3)' }] },
            { y: { label: 'Dynamic pressure', unit: up.label }, color: 'var(--series-6)', includeZero: true, series: [{ name: '$q$', dash: '9 3 2 3', points: P.map((r) => [r.t, up.v(r.q)]) }] },
          ],
        };
      },
    },
    {
      id: 'track', title: 'Where it lands: the flight seen from above', aspect: 1,
      info: { text: ['The path over the ground from the pad, seen from above (north up, east right). Along the launch direction it is the simulated flight; the sideways part is the crosswind drift during the descent (an estimate).', 'The red circle is your recovery area; the landing point, coloured by the verdict, should be inside it. Hover to read the time and height.'], doc: 'wind' },
      build(v, out, { U }) {
        const ud = U(DIST), o = out.o, a = v.az * D2R, idx = thin(o.hist.map((r, i) => i));
        const P = idx.map((i) => { const r = o.hist[i], y = out.cy[i]; return [r.x * Math.sin(a) + y * Math.cos(a), r.x * Math.cos(a) - y * Math.sin(a)]; });
        const R = Math.max(v.Rf, ...P.map(([e, n]) => Math.hypot(e, n))) * 1.1, ring = [];
        for (let i = 0; i <= 72; i++) { const t = (i / 72) * 2 * Math.PI; ring.push([ud.v(v.Rf * Math.sin(t)), ud.v(v.Rf * Math.cos(t))]); }
        const end = P[P.length - 1], ap = o.hist.reduce((m, r, i) => (r.z > o.hist[m].z ? i : m), 0), apE = o.hist[ap].x * Math.sin(a) + out.cy[ap] * Math.cos(a), apN = o.hist[ap].x * Math.cos(a) - out.cy[ap] * Math.sin(a);
        return { x: { label: 'East', unit: ud.label }, y: { label: 'North', unit: ud.label }, xDomain: [-ud.v(R), ud.v(R)], yDomain: [-ud.v(R), ud.v(R)], aspect: 1,
          series: [{ name: 'ground track', points: P.map(([e, n]) => [ud.v(e), ud.v(n)]) }, { name: 'recovery area', points: ring, dashed: true, color: 'var(--danger)' }],
          markers: [{ x: 0, y: 0, label: 'pad', color: 'var(--text-2)', r: 4 }, { x: ud.v(apE), y: ud.v(apN), label: '', color: 'var(--text-2)', r: 3 },
            { x: ud.v(end[0]), y: ud.v(end[1]), label: `lands ${Q(out.results.dist, DIST, 3)}`, color: levelColor(out.lv.area) }] };
      },
    },
    {
      id: 'rail', title: 'Rail exit speed against rail length', explore: true,
      info: { text: ['How fast the rocket leaves the rail for different rail lengths, everything else as you set it.', 'The curve flattens: each extra metre of rail adds less speed. Where it crosses the red line is the shortest rail that meets your rail exit speed.'], doc: 'rail' },
      build(v, out, { U }) {
        const ud = U(DIST), us = U(SPD), top = Math.max(2 * v.L, 1.3 * (out.results.Lneed === '—' ? v.L : out.results.Lneed), 10), pts = [];
        for (let i = 1; i <= 40; i++) { const L = (top * i) / 40, e = simulate({ ...out.p, L, useSimRail: false, stopAfterRail: true, drogue: null, main: null }).railExit; if (e) pts.push([ud.v(L), us.v(e.V)]); }
        return { x: { label: 'Rail length $L$', unit: ud.label }, y: { label: 'Rail exit speed $V_L$', unit: us.label }, includeZero: true, series: [{ name: '$V_L$', points: pts, smooth: true }],
          hlines: [{ y: us.v(v.vRail), label: 'your rail exit speed', color: 'var(--danger)' }], markers: [{ x: ud.v(v.L), y: us.v(out.results.railV), label: 'your rail' }] };
      },
    },
    {
      id: 'winds', title: 'Wind along and across the flight', explore: true, when: layered,
      info: { text: ['Your wind layers split into the part along the launch direction (positive: blowing downrange, away from the launcher) and the part across it (positive: blowing to the right), against height.', 'Along-wind changes how far the rocket flies; cross-wind pushes it sideways during the descent. The dots are your layers.'], doc: 'wind' },
      build(v, out, { U }) {
        if (!out.wp) return null;
        const us = U(SPD), ua = U(ALT), top = Math.max(out.o.hApo, ...out.wp.L.map((r) => r.h)), A = [], C = [];
        for (let i = 0; i <= 80; i++) { const h = (top * i) / 80, c = out.wp.comp(h); A.push([us.v(c.inPlane), ua.v(h)]); C.push([us.v(c.cross), ua.v(h)]); }
        return { x: { label: 'Wind component', unit: us.label }, y: { label: 'Height above ground', unit: ua.label }, hover: 'y', includeZero: true,
          series: [{ name: 'along the flight', points: A }, { name: 'across (to the right)', points: C, dashed: true }],
          hlines: [{ y: ua.v(out.o.hApo), label: 'apogee', color: 'var(--text-3)' }], vlines: [{ x: 0, color: 'var(--text-3)' }] };
      },
    },
    {
      id: 'gamma', title: 'Flight path angle', explore: true,
      info: { text: ['The angle of the flight through the air above the horizontal. It starts at the launcher elevation, turns into the wind just off the rail, and passes zero at apogee.'], doc: 'overview' },
      build(v, out, { U }) {
        const ug = U(ANG), H = thin(out.o.hist).filter((r) => r.V > 1 && r.t <= out.o.tApo * 1.3);
        return { x: { label: 'Time $t$', unit: 's' }, y: { label: 'Flight path angle $\\gamma$', unit: ug.label }, series: [{ name: '$\\gamma$', points: H.map((r) => [r.t, ug.v(r.gam / D2R)]), smooth: true }], hlines: [{ y: 0, color: 'var(--text-3)' }] };
      },
    },
  ],
  schematicTitle: 'Flight profile',
  schematicHint: 'Height against distance along the launch direction, both to the same scale (the launcher is enlarged): powered flight thick, coasting solid, under the drogue dashed, under the main dotted, with dots at equal time steps, and the winds aloft on the left as standard wind barbs. Drag the launcher to tilt it, the red ceiling line up or down, or the flag at the edge of the recovery area',
  schematic(ctx, v, out) {
    const W = 800, Hh = 440, o = out.o, hist = o.hist, lv = out.lv;
    const fr = ctx.frame({ width: W, height: Hh, label: 'Flight profile: height against distance along the launch direction, to scale' });
    const g = fr.layer('main'); g.replaceChildren();
    const ua = ctx.U(ALT), ud = ctx.U(DIST), us = ctx.U(SPD), A = (h) => `${fmt(ua.v(h), { digits: 3 })} ${ua.plain}`, Dd = (x) => `${fmt(ud.v(x), { digits: 3 })} ${ud.plain}`, Sp = (x) => `${fmt(us.v(x), { digits: 3 })} ${us.plain}`;
    // view: the whole path, the area edge on the landing side, and the ceiling when it is not far above apogee
    const side = hist[hist.length - 1].x < 0 ? -1 : 1, showCeil = v.ceiling <= 1.6 * o.hApo;
    let xL = Math.min(0, ...hist.map((r) => r.x)), xR = Math.max(1, ...hist.map((r) => r.x));
    const showEdge = v.Rf <= 2.5 * Math.max(xR - xL, 0.3 * o.hApo);
    if (showEdge) { if (side > 0) xR = Math.max(xR, v.Rf); else xL = Math.min(xL, -v.Rf); }
    const zTop = Math.max(o.hApo, showCeil ? v.ceiling : 0, 1) * 1.08;
    const bx0 = 140, bx1 = 760, yt = 52, yg = 340, k = Math.min((bx1 - bx0) / (xR - xL || 1), (yg - yt) / zTop);
    const x0 = bx0 + ((bx1 - bx0) - (xR - xL) * k) / 2, X = (x) => x0 + (x - xL) * k, Z = (z) => yg - z * k;
    // ground, recovery area, pad
    const aL = X(Math.max(xL, -v.Rf)), aR = X(Math.min(xR, v.Rf));
    g.append(s('rect', { x: aL, y: yg, width: Math.max(0, aR - aL), height: 9, fill: 'var(--ok)', 'fill-opacity': 0.18, 'data-field': 'Rf' }));
    g.append(s('line', { x1: 24, x2: W - 16, y1: yg, y2: yg, class: 'sc-line' }));
    for (let x = 28; x < W - 16; x += 12) g.append(s('line', { x1: x, y1: yg, x2: x - 8, y2: yg + 8, class: 'sc-thin', 'stroke-opacity': 0.4 }));
    const edgeX = X(side * v.Rf);
    if (showEdge) {
      g.append(s('path', { d: `M${edgeX},${yg}V${yg - 26}l${12 * side},5l${-12 * side},5`, fill: 'var(--ok)', stroke: 'var(--ok)', 'data-field': 'Rf' }));
      g.append(text(edgeX, yg + 58, `area edge ${Dd(v.Rf)}`, { anchor: 'middle', size: 10.5, field: 'Rf' }));
    } else g.append(text(side > 0 ? bx1 : bx0, yg + 58, `area edge ${Dd(v.Rf)} ${side > 0 ? '→' : '←'}`, { anchor: side > 0 ? 'end' : 'start', size: 10.5, field: 'Rf' }));
    // ceiling
    if (showCeil) {
      g.append(s('line', { x1: bx0, x2: bx1, y1: Z(v.ceiling), y2: Z(v.ceiling), stroke: 'var(--danger)', 'stroke-width': 1.4, 'stroke-dasharray': '8 4', 'data-field': 'ceiling' }));
      g.append(text(bx1 - 14, Z(v.ceiling) - 6, `your ceiling ${A(v.ceiling)}`, { anchor: 'end', size: 10.5, field: 'ceiling' }));
    } else g.append(text(bx1, yt - 22, `ceiling ${A(v.ceiling)} ↑ (far above)`, { anchor: 'end', size: 10.5, cls: 'sc-dim-text', field: 'ceiling' }));
    // path by phase
    const seg = (pred, attrs) => {
      let cur = [];
      const flush = () => { if (cur.length > 1) g.append(s('path', { d: path(cur), fill: 'none', ...attrs })); cur = []; };
      hist.forEach((r) => { if (pred(r)) cur.push([X(r.x), Z(r.z)]); else if (cur.length) { cur.push([X(r.x), Z(r.z)]); flush(); } });
      flush();
    };
    seg((r) => r.phase === 'free' && !(r.T > 0), { stroke: 'var(--text)', 'stroke-width': 1.8 });
    seg((r) => r.phase === 'drogue', { stroke: 'var(--text-2)', 'stroke-width': 1.8, 'stroke-dasharray': '7 4', 'data-field': 'useDrogue' });
    seg((r) => r.phase === 'main', { stroke: 'var(--text-2)', 'stroke-width': 1.8, 'stroke-dasharray': '2 3', 'data-field': 'useMain' });
    seg((r) => r.T > 0 || r.phase === 'rail', { stroke: 'var(--red)', 'stroke-width': 3.4 });
    // time dots
    const tEnd = hist[hist.length - 1].t, step = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600].find((st) => tEnd / st <= 24) || 1200;
    let j = 0;
    for (let t = step; t < tEnd; t += step) { while (j < hist.length - 1 && hist[j].t < t) j++; g.append(s('circle', { cx: X(hist[j].x), cy: Z(hist[j].z), r: 2.2, fill: 'var(--text-2)' })); }
    // events
    const apo = hist.reduce((m, r) => (r.z > m.z ? r : m)), apoLeft = apo.x > (xL + xR) / 2;
    g.append(s('circle', { cx: X(apo.x), cy: Z(apo.z), r: 4.5, fill: lv.ceil === 'safe' ? 'var(--text)' : levelColor(lv.ceil), 'data-field': 'ceiling' }));
    g.append(text(X(apo.x) + (apoLeft ? -10 : 10), Z(apo.z) - 8, `apogee ${A(o.hApo)} · ${fmt(o.tApo, { digits: 3 })} s`, { anchor: apoLeft ? 'end' : 'start', size: 11 }));
    for (const bo of o.burnouts) {
      const r = hist[Math.min(bo.idx, hist.length - 1)];
      g.append(s('circle', { cx: X(r.x), cy: Z(r.z), r: 3.5, fill: 'var(--red)', 'data-field': `s${bo.stage}thrust` }));
      g.append(text(X(r.x) + 8, Z(r.z) + 4, `burnout ${bo.stage} · ${Sp(bo.V)}`, { size: 10.5, field: `s${bo.stage}thrust` }));
    }
    for (const kind of ['drogue', 'main']) {
      const r = hist.find((q) => q.phase === kind);
      if (!r) continue;
      const cx = X(r.x), cy = Z(r.z), w = kind === 'main' ? 11 : 7, f = kind === 'main' ? 'useMain dM hM' : 'useDrogue dD tD';
      g.append(s('path', { d: `M${cx - w},${cy - 10}Q${cx - w},${cy - 10 - w} ${cx},${cy - 10 - w}Q${cx + w},${cy - 10 - w} ${cx + w},${cy - 10}Z`, fill: 'var(--red)', 'fill-opacity': 0.75, stroke: 'var(--red)', 'data-field': f }));
      g.append(s('path', { d: `M${cx - w},${cy - 10}L${cx},${cy}L${cx + w},${cy - 10}`, class: 'sc-thin', fill: 'none' }));
      const left = kind === 'drogue' && !apoLeft;
      g.append(text(left ? cx - w - 5 : cx + w + 5, cy - 8, kind === 'main' ? `main at ${A(r.z)}` : 'drogue', { anchor: left ? 'end' : 'start', size: 10.5, field: f }));
    }
    // landing point coloured by the verdict
    const lx = X(hist[hist.length - 1].x), lcol = levelColor(lv.area === 'safe' ? lv.land : lv.area === 'unsafe' || lv.land === 'safe' ? lv.area : lv.land);
    if (o.landed) {
      g.append(s('circle', { cx: lx, cy: yg, r: 5.5, fill: lcol, stroke: 'var(--surface)', 'stroke-width': 1.5 }));
      g.append(text(lx, yg + 22, `lands ${Sp(out.results.vImp)}, ${Dd(out.results.dist)} from the pad`, { anchor: 'middle', size: 11, field: 'vLand Rf' }));
    }
    // launcher (enlarged, at its true elevation)
    const px = X(0), ll = 46, q = v.QE * D2R, tx = px + ll * Math.cos(q), ty = yg - ll * Math.sin(q);
    g.append(s('path', { d: `M${px - 7},${yg}L${px},${yg - 12}L${px + 7},${yg}Z`, fill: 'var(--text-2)' }));
    g.append(s('line', { x1: px, y1: yg, x2: tx, y2: ty, stroke: 'var(--text)', 'stroke-width': 3, 'data-field': 'QE L' }));
    g.append(text(px, yg + 40, `QE ${fmt(v.QE, { digits: 3 })}° · off the rail at ${Sp(out.results.railV)}`, { anchor: 'middle', size: 10.5, field: 'QE vRail' }));
    g.append(text(W - 14, Hh - 10, `to scale · ${o.burnouts.length > 0 ? 'thick: motor burning · ' : ''}dots every ${step >= 60 ? `${step / 60} min` : `${step} s`} · site ${A(v.ho)} above sea level`, { anchor: 'end', size: 10.5, cls: 'sc-dim-text', field: 'ho' }));
    // winds aloft as wind barbs on the left, on the drawing's height scale
    if (out.wp) {
      const top = zTop / 1.08, Lw = layered(v) ? out.wp.L : [0, 0.25, 0.5, 0.75, 1].map((f) => ({ h: f * top, w: v.windU, dir: v.windDir }));
      windBarbs(g, Lw, Z, { x: 58, yTop: yt - 4, yGround: yg }, top, 'winds', null, v.az, 'downrange');
    }
    // handles
    ctx.handle('launcher', tx, ty, { field: 'QE', title: 'Drag to tilt the launcher',
      onDrag: (mx, my) => ctx.setValue('QE', Math.max(1, Math.min(90, Math.atan2(yg - my, Math.max(1e-6, mx - px)) / D2R)), { round: 0.5 }), onKey: (dx, dy) => ctx.setValue('QE', Math.max(1, Math.min(90, v.QE + 0.5 * (dy || -dx)))) });
    if (showCeil) ctx.handle('ceiling', bx1, Z(v.ceiling), { field: 'ceiling', title: 'Drag up or down to change the altitude ceiling',
      onDrag: (mx, my) => ctx.setValue('ceiling', Math.max(100, (yg - my) / k), { round: 100 }), onKey: (dx, dy) => ctx.setValue('ceiling', Math.max(100, v.ceiling * (1 + 0.03 * dy))) });
    if (showEdge) ctx.handle('area', edgeX, yg - 26, { field: 'Rf', title: 'Drag sideways to change the recovery-area radius',
      onDrag: (mx) => ctx.setValue('Rf', Math.max(10, Math.abs(xL + (mx - x0) / k)), { round: 10 }), onKey: (dx) => ctx.setValue('Rf', Math.max(10, v.Rf * (1 + 0.05 * dx * side))) });
  },
  symbols: {
    T: 'thrust (N or lbf)', D: 'drag (N or lbf)', m: 'mass of the rocket (kg or slug)', g: 'acceleration of gravity, 9.81 m/s² (32.2 ft/s²) at sea level', 'g_0': 'standard gravity, 9.80665 m/s²', V: 'speed (m/s or ft/s)', 'V_{rel}': 'speed relative to the air (m/s or ft/s)',
    '\\rho': 'air density (kg/m³ or slug/ft³)', '\\rho_G': 'air density at the ground', 'C_D': 'drag coefficient (no unit)', S: 'reference area, $\\pi d^2/4$ (m² or ft²)', d: 'reference diameter (m or in)', M: 'Mach number, speed / speed of sound (no unit)', p: 'air pressure (Pa or lbf/ft²)', 'p_0': 'sea-level air pressure',
    'A_e': 'nozzle exit area (m² or in²)', 'T_{vac}': 'thrust in vacuum (N or lbf)', 'T_{max}': 'peak thrust', 'W_0': 'weight at liftoff (N or lbf)', W: 'weight (N or lbf)', 'I_{vac}': 'total vacuum impulse (N·s or lbf·s)', 'W_p': 'propellant weight (N or lbf)', 'I_{sp}': 'vacuum specific impulse (s)',
    L: 'rail length (m or ft)', 'L_{sim}': 'rail length used in the model (m or ft)', '\\lambda_P': 'pitch wave number, $2\\pi/\\Lambda_P$ (1/m or 1/ft)', '\\Lambda_P': 'pitch/yaw wavelength (m or ft)', QE: 'launcher elevation above the horizontal (°)', '\\psi': 'launch direction, compass degrees',
    h: 'height above the ground (m or ft)', w: 'wind speed (m/s or ft/s)', 'w_{sim}': 'wind felt by the point mass', 'k(\\lambda_Ph)': 'finite-inertia wind fraction (no unit)', 'h_{max}': 'apogee (m or ft)', 'x_I': 'downrange distance at landing', 'y_I': 'sideways drift at landing', 'r_I': 'distance from the pad at landing',
    'M_{max}': 'peak Mach number', q: 'dynamic pressure, $\\tfrac12\\rho V^2$ (Pa or lbf/ft²)', 'q_{max}': 'peak dynamic pressure', 'V_L': 'rail exit speed', 'V_I': 'landing descent speed', 'V_T': 'landing speed you accept', 'D_M': 'main parachute flat diameter (m or ft)', 'C_{DM}': 'main parachute drag coefficient',
    '\\hat u_{rel}': 'unit vector along the air-relative velocity', '\\hat z': 'unit vector straight up', '\\dot{\\vec V}': 'acceleration (m/s² or ft/s²)', t: 'time (s)', '\\tau': 'parachute inflation time constant (s)',
    h_0: 'launch-site height above sea level (m or ft)',
    'V_{L,min}': 'rail exit speed you need (m/s or ft/s)',
    'h_{ceil}': 'altitude ceiling above ground (m or ft)',
    R_f: 'recovery area radius (m or ft)',
    'V_{T}': 'landing speed you accept (m/s or ft/s)',
    'L_{req}': 'shortest rail for your exit speed (m or ft)',
    'D_{M,req}': 'main diameter for your landing speed (m or ft)',
    '\\Delta W': 'ballast in the top stage (kg or lb)',
    'h_{M,req}': 'main opening height for your recovery area (m or ft)',
    '\\beta_I': 'bearing of the landing point (°)',
    'n_{max}': 'peak acceleration (g)',
    'V_{b1}': 'speed at first-stage burnout (m/s or ft/s)',
    'V_{b2}': 'speed at second-stage burnout (m/s or ft/s)',
    'V_{b3}': 'speed at third-stage burnout (m/s or ft/s)',
    '\\hat u_0': 'launch direction along the rail',
    'p(h_0+h)': 'air pressure at that height above sea level',
    '\\rho(h_0+h)': 'air density at that height above sea level',
    'h(t)': 'height at time $t$ (m or ft)',
    'V(\\text{end of the rail})': 'speed at the end of the rail',
  },
  report(v, out, R) {
    const o = out.o, p = out.p, m1 = o.motors[0], n = R.n;
    const steps = [
      { label: 'Stage 1 vacuum impulse and specific impulse (sea-level thrust + p₀A_e, trapezoid rule)', lhs: 'I_{vac}', eq: '\\int T_{vac}\\,dt', res: R.Q(m1.I, { dim: 'force', internal: 'lbf' }) + '\\,\\text{s}' },
      { lhs: 'I_{sp}', eq: 'I_{vac}/W_p', sub: `${n(m1.I)}/${R.v(p.stages[0].Wp, MASS)}`, res: `${n(m1.isp)}\\ \\text{s}` },
      { label: 'Rail length the point-mass model needs (Hoult, 1976)', lhs: 'L_{sim}', eq: '\\frac{0.140365}{\\lambda_P}\\exp\\left(\\sqrt{2\\pi\\lambda_PL}-0.387621(\\lambda_PL)^{1.2}\\right)', sub: `\\lambda_P=${n(p.lamP)}\\ \\text{ft}^{-1},\\ L=${R.v(v.L, DIST)}`, res: R.Q(simLauncherLength(p.lamP, v.L), DIST) },
      { label: 'Equations of motion integrated (RK4, 0.05 s; shorter on the rail and under parachutes)', lhs: '\\dot{\\vec V}', eq: '\\frac{T-D}{m}\\,\\hat u_{rel}-g\\,\\hat z,\\quad T=T_{vac}-pA_e,\\quad D=\\tfrac12\\rho V_{rel}^2C_D(M)S', res: '' },
      { label: 'Wind felt in powered flight (Lewis with the finite-inertia correction); full wind when coasting', lhs: 'w_{sim}', eq: 'k(\\lambda_Ph)\\,w(h)', res: '' },
      { label: 'Rail exit speed off the physical rail', lhs: 'V_L', eq: '', res: R.Q(out.results.railV, SPD) },
      { label: 'Apogee', lhs: 'h_{max}', eq: '', res: R.Q(o.hApo, ALT) },
      { label: 'Landing point: along the launch direction, sideways drift, distance from the pad', lhs: 'x_I', eq: '', res: R.Q(out.results.range, DIST) },
      { lhs: 'y_I', eq: '\\int_{t_{apo}}^{t_I}w_\\perp(h)\\,dt', res: R.Q(out.results.cross, DIST) },
      { lhs: 'r_I', eq: '\\sqrt{x_I^2+y_I^2}', res: R.Q(out.results.dist, DIST) },
      { label: 'Main diameter for your landing speed (steady descent at the ground)', lhs: 'D_M', eq: '\\sqrt{\\frac{8W}{\\pi C_{DM}\\rho_GV_T^2}}', res: R.Q(out.results.Dneed, DIST) },
      { label: 'Peak Mach number and dynamic pressure', lhs: 'M_{max}', eq: '', res: n(o.maxMach.mach) },
      { lhs: 'q_{max}', eq: '', res: R.Q(o.maxQ.q, PRES) },
    ];
    return [{
      title: 'Method',
      text: 'SKYAERO is a two-degree-of-freedom point-mass simulation in the plane of fire. Gravity falls with the inverse square of the distance from the Earth’s centre, and the atmosphere is Hoult’s latitude-dependent model tied to the launch-site temperature. On the rail the rocket accelerates along the rail; in free flight thrust acts along, and drag against, the air-relative velocity. Stages burn in sequence and separate at burnout; parachutes add drag area exponentially after deployment (Fuentes, Hoult, Tran and Tong). The wind layers are split into a component along the plane of fire, which the simulation uses, and a crosswind, integrated over the descent as a drift estimate.',
      steps,
    }];
  },
  references: ['skyaeromanual-ver3-orig', 'launcher-length-for-sounding-rocket-point-mass-traj-sim-orig'],
  examples: [
    { name: 'AeroTech M1939, 61 lb, dual deploy, 15 ft/s west wind', values: { nStages: '1', windMode: 'uniform', windU: 15, windDir: 270, useDrogue: true, useMain: true } },
    { name: 'SKYAERO example: AeroTech M1939, 61 lb, QE 85°, no parachutes', values: { nStages: '1', ho: 1898, To: 559.67, lat: 34, QE: 85, L: 12, waveP: 350, simRail: true, windMode: 'uniform', windU: 0, useDrogue: false, useMain: false } },
    { name: 'Same rocket, dual deploy, forecast-style winds', values: { nStages: '1', windMode: 'layers', az: 270, winds: [{ h: 0, w: 10, dir: 270 }, { h: 3000, w: 25, dir: 260 }, { h: 10000, w: 45, dir: 250 }, { h: 20000, w: 70, dir: 245 }], useDrogue: true, tD: 1, dD: 3, cdD: 0.87, useMain: true, hM: 1000, dM: 12, cdM: 0.89, tau: 2 } },
    { name: 'Short rod: leaves the rail too slowly', values: { nStages: '1', L: 4, s1Wd: 70, useDrogue: true, useMain: true } },
    { name: 'Two-stage: M1939 booster and a small sustainer (over a 20 000 ft ceiling)', values: { nStages: '2', s1Wd: 36, s2delay: 1.5, ceiling: 20000, useDrogue: true, useMain: true } },
  ],
};
