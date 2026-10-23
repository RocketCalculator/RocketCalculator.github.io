// Trajectory Simulation (SKYAERO) — UI definition.
import { simulate, simLauncherLength, G0 } from '../calc/trajectory.js';
import { s, fmt, InputError } from '../util.js';
import { text, path } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

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
  if (rows.some((r) => !Number.isFinite(r.h) || !Number.isFinite(r.w))) return 'Every cell needs a number.';
  if (rows.some((r, i) => i > 0 && !(r.h > rows[i - 1].h))) return 'Altitudes must increase down the table.';
  return '';
}

const stageGroup = (k) => {
  const d = STAGE_DEF[k - 1], on = (v) => +v.nStages >= k, id = (x) => `s${k}${x}`;
  return {
    id: `stage${k}`, title: k === 1 ? 'Stage 1 (booster)' : `Stage ${k}`,
    fields: [
      ...(k > 1 ? [{ id: id('delay'), label: `Coast before stage ${k} ignition`, sym: `t_{c${k}}`, ...TIME, default: d.delay, min: 0, max: 600, when: on, info: { text: `Time from stage ${k - 1} burnout (and separation) to stage ${k} ignition.`, doc: 'phases' } }] : []),
      { id: id('Wp'), label: 'Propellant weight', sym: `W_{p${k}}`, ...MASS, default: d.Wp, min: 1e-6, when: on, info: { text: 'Burned in proportion to the vacuum impulse delivered, so the vacuum Isp is total vacuum impulse / propellant weight.', doc: 'motor' } },
      { id: id('Wd'), label: k === 1 ? 'Dry weight (with everything not in later stages)' : 'Dry weight', sym: `W_{d${k}}`, ...MASS, default: d.Wd, min: 1e-6, when: on,
        info: { text: k === 1 ? 'Structure plus any payload carried by this stage. Dropped at burnout when an upper stage follows.' : 'Structure plus payload of this stage. The top stage keeps its dry weight to impact.', doc: 'phases' } },
      { id: id('d'), label: 'Reference diameter', sym: `d_${k}`, ...LEN, default: d.d, min: 1e-6, when: on, info: { text: 'Sets the drag reference area πd²/4 for this stage’s drag table.', doc: 'forces' } },
      { id: id('Ae'), label: 'Nozzle exit area', sym: `A_{e${k}}`, ...AREA, default: d.Ae, min: 0, when: on, info: { text: 'Thrust falls by p·A_e below its vacuum value.', doc: 'motor' } },
      { id: id('thrust'), label: 'Thrust curve (from ignition)', kind: 'table', minRows: 2, when: on, columns: [{ id: 't', label: 'Time', ...TIME }, { id: 'T', label: 'Thrust', ...FORCE }], default: d.thrust, validate: checkThrust,
        info: { text: 'Thrust against time from ignition; the last time is burnout. Sea-level values are converted to vacuum thrust by adding p₀A_e (or tick vacuum input below).', doc: 'motor' } },
      { id: id('vac'), label: 'Thrust curve is vacuum thrust', kind: 'bool', default: false, when: on, info: { doc: 'motor' } },
      { id: id('cd'), label: 'Drag coefficient against Mach', kind: 'table', minRows: 1, when: on, columns: [{ id: 'M', label: 'Mach', ...NONE }, { id: 'off', label: 'C_D coasting', ...NONE }, { id: 'on', label: 'C_D powered', ...NONE }], default: d.cd, validate: checkCd,
        info: { text: 'Zero-lift drag of the vehicle flying on this stage. Power-off includes base drag; power-on is usually lower. Held constant beyond the table.', doc: 'forces' } },
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
  return { site: { ho: v.ho, To: v.To, lat: v.lat }, QE: v.QE * D2R, L: v.L, lamP: (2 * Math.PI) / v.waveP, useSimRail: v.simRail, wind: v.useWind ? v.wind.map((r) => [r.h, r.w]) : [],
    stages, tau: v.tau, dt: 0.05,
    drogue: v.useDrogue ? { CdS: (v.cdD * Math.PI * v.dD ** 2) / 4, delay: v.tD } : null, main: v.useMain ? { CdS: (v.cdM * Math.PI * v.dM ** 2) / 4, h: v.hM } : null };
}
/** At most ~600 rows for plotting, always keeping the first and last. */
const thin = (H) => { const k = Math.max(1, Math.ceil(H.length / 600)); return H.filter((r, i) => i % k === 0 || i === H.length - 1); };

export default {
  slug: 'skyaero-trajectory',
  topic: 'trajectory-simulation',
  title: 'Trajectory Simulation',
  subtitle: 'Point-mass flight of a one- to three-stage sounding rocket from the rail to impact: <b>apogee</b>, <b>impact range</b>, peak Mach and dynamic pressure — SKYAERO in the browser.',
  intro: {
    what: 'Integrates the two-degree-of-freedom equations of motion in the plane of fire: a launch-rail phase, powered flight heading into the relative wind, coasts, staging, and optional drogue and main parachutes, through a standard atmosphere that depends on the launch site.',
    why: 'Apogee, impact range, burnout conditions and the peak dynamic pressure size the recovery system, the structure and the range safety footprint. The simulated launcher length and finite-inertia wind correction make a point-mass model weathercock like a real rocket.',
    when: 'Predicting performance from a thrust curve and drag table, choosing launcher elevation, checking rail exit speed, and generating impact points for wind compensation.',
  },
  info: {
    text: [
      'The rocket is a point mass. On the rail it accelerates along the rail; after it leaves, thrust acts along the velocity relative to the air and drag opposes it.',
      'Because a point mass has no rotational inertia, the rail used in the simulation is longer than the real one (Hoult, 1976), and in powered flight only part of the wind is felt, growing with altitude in pitch wavelengths.',
      'Stages separate at burnout; parachutes add their drag area over an inflation time constant.',
    ],
    tex: '\\dot{\\vec V}=\\frac{T-D}{m}\\,\\hat u_{rel}-g\\,\\hat z,\\qquad D=\\tfrac12\\rho V_{rel}^2C_D(M)S',
    steps: ['Set the launch site, launcher elevation and rail length.', 'Pick the number of stages; enter weights, thrust curves and drag tables.', 'Add a wind profile and parachutes if wanted.', 'Read apogee, impact range and the flight histories.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'site', title: 'Launch site',
      fields: [
        { id: 'ho', label: 'Site elevation (MSL)', sym: 'h_0', ...ALT, default: 1898, min: -1000, max: 20000, info: { doc: 'atmosphere' } },
        { id: 'To', label: 'Surface temperature', sym: 'T_0', dim: 'temperature', internal: 'R', default: 559.67, min: 400, max: 600, info: { text: 'Measured about 2 m above the ground. Sets the whole temperature profile.', doc: 'atmosphere' } },
        { id: 'lat', label: 'Latitude', sym: '\\Phi', ...ANG, default: 34, min: -90, max: 90, slider: { min: 0, max: 90, step: 1 }, info: { text: 'Sets surface gravity, Earth radius and tropopause altitude.', doc: 'atmosphere' } },
      ],
    },
    {
      id: 'launch', title: 'Launcher',
      fields: [
        { id: 'QE', label: 'Launcher elevation (QE)', sym: 'QE', ...ANG, default: 85, min: 1, max: 90, slider: { min: 60, max: 90, step: 0.5 }, info: { doc: 'rail' } },
        { id: 'L', label: 'Rail length', sym: 'L', ...DIST, default: 12, min: 0.01, info: { doc: 'rail' } },
        { id: 'waveP', label: 'Pitch/yaw wavelength', sym: '\\Lambda_P', ...DIST, default: 350, min: 1, info: { text: 'Distance flown per pitch oscillation at launch (2π / pitch wave number); the Pitch-Yaw Wavenumber calculator gives it.', doc: 'rail' } },
        { id: 'simRail', label: 'Use the simulated launcher length', kind: 'bool', default: true, info: { text: 'Lengthens the rail so the point-mass model weathercocks like a real rocket (Hoult, 1976). Untick to use the physical rail.', doc: 'rail' } },
      ],
    },
    {
      id: 'windg', title: 'Wind',
      fields: [
        { id: 'useWind', label: 'In-plane wind profile', kind: 'bool', default: false, info: { doc: 'wind' } },
        { id: 'wind', label: 'Wind against altitude (above ground)', kind: 'table', minRows: 1, when: (v) => v.useWind, columns: [{ id: 'h', label: 'Altitude', ...ALT }, { id: 'w', label: 'Wind', ...SPD }],
          default: [{ h: 0, w: 10 }, { h: 1000, w: 20 }, { h: 10000, w: 40 }], validate: checkWind,
          info: { text: 'Component in the plane of fire. Positive blows away from the launcher (downrange). Held constant above the last altitude.', doc: 'wind' } },
      ],
    },
    {
      id: 'stagesg', title: 'Vehicle',
      fields: [{ id: 'nStages', label: 'Number of stages', kind: 'select', default: '1', options: [{ value: '1', label: 'One stage' }, { value: '2', label: 'Two stages' }, { value: '3', label: 'Three stages' }], info: { doc: 'phases' } }],
    },
    stageGroup(1), stageGroup(2), stageGroup(3),
    {
      id: 'recovery', title: 'Recovery',
      fields: [
        { id: 'useDrogue', label: 'Drogue parachute', kind: 'bool', default: false, info: { doc: 'recovery' } },
        { id: 'tD', label: 'Drogue deployment after apogee', sym: 't_D', ...TIME, default: 1, min: 0, max: 60, when: (v) => v.useDrogue, info: { doc: 'recovery' } },
        { id: 'dD', label: 'Drogue diameter', sym: 'D_D', ...DIST, default: 3, min: 0.01, when: (v) => v.useDrogue, info: { doc: 'recovery' } },
        { id: 'cdD', label: 'Drogue drag coefficient', sym: 'C_{DD}', ...NONE, default: 0.87, min: 0.1, max: 2.5, slider: { min: 0.3, max: 1.6, step: 0.01 }, when: (v) => v.useDrogue, info: { doc: 'recovery' } },
        { id: 'useMain', label: 'Main parachute', kind: 'bool', default: false, info: { doc: 'recovery' } },
        { id: 'hM', label: 'Main deployment altitude (above ground)', sym: 'h_M', ...ALT, default: 1000, min: 1, when: (v) => v.useMain, info: { doc: 'recovery' } },
        { id: 'dM', label: 'Main diameter', sym: 'D_M', ...DIST, default: 10, min: 0.01, when: (v) => v.useMain, info: { doc: 'recovery' } },
        { id: 'cdM', label: 'Main drag coefficient', sym: 'C_{DM}', ...NONE, default: 0.89, min: 0.1, max: 2.5, slider: { min: 0.3, max: 1.6, step: 0.01 }, when: (v) => v.useMain, info: { doc: 'recovery' } },
        { id: 'tau', label: 'Inflation time constant', sym: '\\tau', ...TIME, default: 2, min: 0.05, max: 20, when: (v) => v.useDrogue || v.useMain, info: { text: 'Drag area grows as 1 − e^(−t/τ) after deployment.', doc: 'recovery' } },
      ],
    },
  ],
  results: [
    { id: 'apo', label: 'Apogee (above ground)', sym: 'h_{max}', ...ALT, key: true, digits: 5, note: (x, out) => `${Q(x + out.v.ho, ALT, 5)} MSL at ${fmt(out.o.tApo, { digits: 3 })} s`, info: { doc: 'overview' } },
    { id: 'range', label: 'Impact range', sym: 'x_I', ...DIST, key: true, digits: 4, note: (x, out) => (out.o.impact ? `at ${fmt(out.o.impact.t, { digits: 4 })} s, ${Q(out.o.impact.V, SPD, 3)}` : 'no impact within 4 h'), info: { text: 'Downrange distance of the impact point (launch-site elevation).', doc: 'overview' } },
    { id: 'maxMach', label: 'Peak Mach number', sym: 'M_{max}', ...NONE, key: true, digits: 3, note: (x, out) => `at ${fmt(out.o.maxMach.t, { digits: 3 })} s, ${Q(out.o.maxMach.z, ALT, 4)}`, info: { doc: 'forces' } },
    { id: 'railV', label: 'Rail exit speed', sym: 'V_L', ...SPD, key: true, digits: 3, note: (x, out) => `at ${fmt(out.o.railExit.t, { digits: 3 })} s off ${Q(out.o.railL, DIST, 3)} of rail${out.v.simRail ? ' (simulated)' : ''}`, info: { doc: 'rail' } },
    { id: 'maxQ', label: 'Peak dynamic pressure', sym: 'q_{max}', ...PRES, digits: 4, note: (x, out) => `at ${fmt(out.o.maxQ.t, { digits: 3 })} s`, info: { doc: 'forces' } },
    { id: 'maxG', label: 'Peak acceleration', sym: 'n_{max}', ...NONE, digits: 3, note: () => 'g', info: { doc: 'forces' } },
    ...[1, 2, 3].map((k) => ({ id: `vb${k}`, label: `Stage ${k} burnout speed`, sym: `V_{b${k}}`, ...SPD, digits: 4, when: (v) => +v.nStages >= k,
      note: (x, out) => { const b = out.o.burnouts[k - 1]; return b ? `${Q(b.z, ALT, 4)} AGL, flight path ${fmt(b.gam / D2R, { digits: 3 })}°` : ''; }, info: { doc: 'phases' } })),
    { id: 'tw', label: 'Liftoff thrust-to-weight', sym: 'T/W', ...NONE, digits: 3, info: { doc: 'rail' } },
    { id: 'railL', label: 'Rail length used in the simulation', sym: 'L_{sim}', ...DIST, digits: 4, info: { tex: 'L_{sim}=\\frac{0.140365}{\\lambda_P}\\exp\\left(\\sqrt{2\\pi\\lambda_PL}-0.387621(\\lambda_PL)^{1.2}\\right)', doc: 'rail' } },
  ],
  compute(v) {
    for (let k = 1; k <= +v.nStages; k++) {
      const m = checkThrust(v[`s${k}thrust`]) || checkCd(v[`s${k}cd`]);
      if (m) throw new InputError(`Stage ${k}: ${m}`);
    }
    if (v.useWind) { const m = checkWind(v.wind); if (m) throw new InputError(`Wind: ${m}`); }
    const p = params(v);
    p.stages.forEach((st, i) => {
      if (st.Ae > st.S) throw new InputError(`Stage ${i + 1}: the nozzle exit area is larger than the reference area πd²/4.`);
      const W = p.stages.slice(i).reduce((a, x) => a + x.Wp + x.Wd, 0), CdS = st.S * Math.max(...st.cd.map((r) => Math.max(r[1], r[2])));
      if (Math.sqrt((2 * W) / (0.0024 * CdS)) < 1) throw new InputError(`Stage ${i + 1}: the drag area is far too large for the weight (terminal speed under 1 ft/s).`);
    });
    const o = simulate(p);
    if (!o.railExit) throw new InputError('The rocket never leaves the rail: liftoff thrust is below the weight component along the rail.');
    const warnings = [], b = o.burnouts;
    if (p.useSimRail && p.lamP * v.L > 2) warnings.push({ level: 'info', text: `λ_P·L = ${fmt(p.lamP * v.L, { digits: 3 })} is beyond Hoult’s launcher-length table (≤ 2); its last increment is used.` });
    if (o.railExit.V < 44) warnings.push({ level: 'warn', text: `Rail exit speed is only ${Q(o.railExit.V, SPD, 3)}: below about 44 ft/s (30 mph) the fins may not stabilize the rocket. Use a longer rail or a harder-starting motor.` });
    if (!o.landed) warnings.push({ level: 'warn', text: 'No impact within four hours of flight time — check the parachutes and weights.' });
    if (o.hApo + v.ho > 154000) warnings.push({ level: 'info', text: 'Apogee is above about 47 km, beyond the altitudes the atmosphere model was built for; drag there is negligible anyway.' });
    if (o.maxMach.mach > Math.max(...p.stages.map((st) => st.cd[st.cd.length - 1][0]))) warnings.push({ level: 'info', text: 'Peak Mach is beyond the end of a drag table; the last C_D is held constant.' });
    if (+v.nStages > 1 && b.length < +v.nStages) warnings.push({ level: 'warn', text: 'An upper stage did not burn before impact: shorten the coast before ignition.' });
    const res = { apo: o.hApo, range: o.impact ? o.impact.x : o.hist[o.hist.length - 1].x, maxMach: o.maxMach.mach, railV: o.railExit.V, maxQ: o.maxQ.q, maxG: o.maxG.gs, tw: o.liftoffTW, railL: o.railL };
    for (let k = 1; k <= 3; k++) res[`vb${k}`] = b[k - 1]?.V ?? '—';
    return { results: res, warnings, o, v };
  },
  plots: [
    {
      id: 'path', title: 'Trajectory',
      info: { text: 'Altitude against downrange distance. Dots mark burnouts and apogee.', doc: 'overview' },
      build(v, out, { U }) {
        const ua = U(ALT), ud = U(DIST), o = out.o, H = thin(o.hist), mk = [...o.burnouts.map((b) => { const r = o.hist[Math.min(b.idx, o.hist.length - 1)]; return { x: ud.v(r.x), y: ua.v(r.z), label: `burnout ${b.stage}` }; })];
        const apo = o.hist.reduce((a, r) => (r.z > a.z ? r : a));
        mk.push({ x: ud.v(apo.x), y: ua.v(apo.z), label: 'apogee' });
        return { x: { label: 'Downrange $x$', unit: ud.label }, y: { label: 'Altitude $h$', unit: ua.label }, includeZero: true, series: [{ name: 'h', points: H.map((r) => [ud.v(r.x), ua.v(r.z)]), smooth: true }], markers: mk };
      },
    },
    {
      id: 'alt', title: 'Altitude and speed',
      info: { text: 'Altitude above the ground and air-relative speed against time after liftoff.', doc: 'overview' },
      build(v, out, { U }) {
        const ua = U(ALT), H = thin(out.o.hist);
        return { x: { label: 'Time $t$', unit: 's' }, y: { label: 'Altitude $h$', unit: ua.label }, includeZero: true, series: [{ name: 'h', points: H.map((r) => [r.t, ua.v(r.z)]), smooth: true }],
          vlines: out.o.burnouts.map((b) => ({ x: b.t, label: `burnout ${b.stage}`, color: 'var(--text-3)' })) };
      },
    },
    {
      id: 'speed', title: 'Speed and Mach number',
      info: { text: 'Speed relative to the air and Mach number against time.', doc: 'forces' },
      build(v, out, { U }) {
        const us = U(SPD), H = thin(out.o.hist), cut = out.o.tApo ? H.filter((r) => r.t <= out.o.tApo * 1.6 || r.phase !== 'free') : H;
        return { x: { label: 'Time $t$', unit: 's' }, y: { label: 'Speed $V$', unit: us.label }, includeZero: true, series: [{ name: 'V', points: cut.map((r) => [r.t, us.v(r.V)]), smooth: true }],
          markers: [{ x: out.o.maxMach.t, y: us.v(out.o.maxMach.V), label: `M = ${fmt(out.o.maxMach.mach, { digits: 3 })}` }] };
      },
    },
    {
      id: 'forces', title: 'Thrust and drag',
      info: { text: 'Thrust (falling with p·A_e below vacuum) and drag against time, through the powered flight and early coast.', doc: 'forces' },
      build(v, out, { U }) {
        const uf = U(FORCE), o = out.o, tMax = Math.max(...o.tBurn) * 1.5 + 2, H = o.hist.filter((r) => r.t <= tMax);
        const H2 = H.filter((r, i) => i % Math.max(1, Math.ceil(H.length / 500)) === 0);
        return { x: { label: 'Time $t$', unit: 's' }, y: { label: 'Force', unit: uf.label }, includeZero: true,
          series: [{ name: 'thrust T', points: H2.map((r) => [r.t, uf.v(r.T)]) }, { name: 'drag D', points: H2.map((r) => [r.t, uf.v(r.D)]), dashed: true, smooth: true }] };
      },
    },
    {
      id: 'q', title: 'Dynamic pressure',
      info: { text: 'Dynamic pressure against time; its peak sets aerodynamic loads and flutter margins.', doc: 'forces' },
      build(v, out, { U }) {
        const up = U(PRES), H = thin(out.o.hist.filter((r) => !out.o.tApo || r.t <= out.o.tApo));
        return { x: { label: 'Time $t$', unit: 's' }, y: { label: 'Dynamic pressure $q$', unit: up.label }, includeZero: true, series: [{ name: 'q', points: H.map((r) => [r.t, up.v(r.q)]), smooth: true }],
          markers: [{ x: out.o.maxQ.t, y: up.v(out.o.maxQ.q), label: 'q max' }] };
      },
    },
    {
      id: 'gamma', title: 'Flight path angle',
      info: { text: 'Angle of the air-relative velocity above the horizontal. It starts at the launcher elevation and passes zero at apogee.', doc: 'overview' },
      build(v, out, { U }) {
        const ug = U(ANG), H = thin(out.o.hist).filter((r) => r.V > 1);
        return { x: { label: 'Time $t$', unit: 's' }, y: { label: 'Flight path angle $\\gamma$', unit: ug.label }, series: [{ name: '\\gamma', points: H.map((r) => [r.t, ug.v(r.gam / D2R)]), smooth: true }], hlines: [{ y: 0, color: 'var(--text-3)' }] };
      },
    },
  ],
  schematicTitle: 'Flight profile',
  schematicHint: 'Altitude against downrange distance (horizontal scale stretched to fit): powered flight in red, coasting solid, parachute descent dashed; the launcher is drawn at its elevation',
  schematic(ctx, v, out) {
    const W = 760, H = 340, o = out.o, hist = o.hist;
    const fr = ctx.frame({ width: W, height: H, label: 'Flight profile: altitude against downrange distance' });
    const g = fr.layer('main'); g.replaceChildren();
    const xmin = hist.reduce((a, r) => Math.min(a, r.x), 0), xmax = hist.reduce((a, r) => Math.max(a, r.x), 1), zmax = Math.max(1, o.hApo);
    const bx = 80, bw = 640, by = 300, bh = 260, X = (x) => bx + ((x - xmin) / (xmax - xmin || 1)) * bw, Z = (z) => by - (z / zmax) * bh;
    g.append(s('line', { x1: 30, y1: by, x2: W - 20, y2: by, class: 'sc-thin' }));
    for (let x = 34; x < W - 20; x += 14) g.append(s('line', { x1: x, y1: by, x2: x - 7, y2: by + 7, class: 'sc-thin' }));
    // path by phase
    const seg = (pred, attrs) => {
      let cur = [];
      const flush = () => { if (cur.length > 1) g.append(s('path', { d: path(cur), fill: 'none', ...attrs })); cur = []; };
      hist.forEach((r, i) => { if (pred(r, i)) cur.push([X(r.x), Z(r.z)]); else flush(); });
      flush();
    };
    const powered = (r) => r.T > 0;
    seg((r) => !powered(r) && r.phase === 'free', { stroke: 'var(--text)', 'stroke-width': 1.8 });
    seg((r) => r.phase === 'drogue' || r.phase === 'main', { stroke: 'var(--text-2)', 'stroke-width': 1.8, 'stroke-dasharray': '6 4' });
    seg((r) => powered(r) || r.phase === 'rail', { stroke: 'var(--red)', 'stroke-width': 3.2 });
    // apogee, burnouts, impact
    const apo = hist.reduce((a, r) => (r.z > a.z ? r : a));
    g.append(s('circle', { cx: X(apo.x), cy: Z(apo.z), r: 4.5, fill: 'var(--text)' }));
    g.append(text(X(apo.x), Z(apo.z) - 10, `apogee ${Q(o.hApo, ALT, 4)} · ${fmt(o.tApo, { digits: 3 })} s`, { anchor: 'middle', size: 11 }));
    for (const b of o.burnouts) {
      const r = hist[Math.min(b.idx, hist.length - 1)];
      g.append(s('circle', { cx: X(r.x), cy: Z(r.z), r: 3.5, fill: 'var(--red)', 'data-field': `s${b.stage}thrust` }));
      g.append(text(X(r.x) + 8, Z(r.z) + 4, `burnout ${b.stage} · ${Q(b.V, SPD, 3)}`, { size: 10.5, field: `s${b.stage}thrust` }));
    }
    for (const kind of ['drogue', 'main']) {
      const r = hist.find((q) => q.phase === kind);
      if (!r) continue;
      const cx = X(r.x), cy = Z(r.z);
      g.append(s('path', { d: `M${cx - 9},${cy - 10}A9,7 0 0 1 ${cx + 9},${cy - 10}Z M${cx - 9},${cy - 10}L${cx},${cy} M${cx + 9},${cy - 10}L${cx},${cy}`, class: 'sc-body-2', 'data-field': kind === 'main' ? 'useMain' : 'useDrogue' }));
      g.append(text(cx + 13, cy - 6, kind, { size: 10.5 }));
    }
    const last = hist[hist.length - 1];
    if (o.impact) {
      g.append(s('path', { d: `M${X(last.x) - 5},${by - 5}l10,10m0,-10l-10,10`, stroke: 'var(--red)', 'stroke-width': 2 }));
      g.append(text(X(last.x), by + 22, `impact ${Q(o.impact.x, DIST, 4)}`, { anchor: last.x > (xmin + xmax) / 2 ? 'end' : 'middle', size: 11 }));
    }
    // launcher at its true elevation
    const lx = X(0), ll = 34;
    g.append(s('line', { x1: lx, y1: by, x2: lx + ll * Math.cos(v.QE * D2R), y2: by - ll * Math.sin(v.QE * D2R), stroke: 'var(--text)', 'stroke-width': 3, 'data-field': 'QE L' }));
    g.append(text(lx - 6, by + 22, `QE ${fmt(v.QE, { digits: 3 })}°`, { anchor: 'end', size: 10.5, field: 'QE' }));
    if (v.useWind) {
      const w = v.wind[v.wind.length - 1]?.w ?? 0, dir = w >= 0 ? 1 : -1;
      for (const yy of [90, 130]) g.append(s('line', { x1: W - 90 - 18 * dir, y1: yy, x2: W - 90 + 18 * dir, y2: yy, class: 'sc-thin', 'marker-end': fr.arrow(), 'data-field': 'wind' }));
      g.append(text(W - 90, 112, 'wind', { anchor: 'middle', size: 10.5, field: 'wind' }));
    }
    g.append(text(20, 20, `red: powered · solid: coasting · dashed: parachute · downrange stretched ×${fmt((bw / (xmax - xmin || 1)) / (bh / zmax), { digits: 2 })}`, { size: 10, cls: 'sc-dim-text' }));
  },
  symbols: {
    T: 'thrust', D: 'drag', m: 'mass', g: 'gravity', 'g_0': 'standard gravity', V: 'speed', 'V_{rel}': 'speed relative to the air', '\\rho': 'air density', 'C_D': 'drag coefficient', S: 'reference area', M: 'Mach number', p: 'ambient pressure', 'p_0': 'sea-level pressure',
    'A_e': 'nozzle exit area', 'T_{vac}': 'vacuum thrust', 'I_{vac}': 'total vacuum impulse', 'W_p': 'propellant weight', 'I_{sp}': 'vacuum specific impulse', L: 'rail length', 'L_{sim}': 'simulated rail length', '\\lambda_P': 'pitch wave number', '\\Lambda_P': 'pitch/yaw wavelength',
    QE: 'launcher elevation', h: 'altitude', w: 'wind speed', 'w_{sim}': 'wind felt by the point mass', 'k(\\lambda_Ph)': 'finite-inertia wind correction', 'h_{max}': 'apogee', 'x_I': 'impact range', 'M_{max}': 'peak Mach number', 'q_{max}': 'peak dynamic pressure', 'V_L': 'rail exit speed',
    '\\hat u_{rel}': 'unit vector along the air-relative velocity', '\\hat z': 'unit vertical', '\\dot{\\vec V}': 'acceleration', 'R_E': 'Earth radius', 'g_s': 'surface gravity',
  },
  report(v, out, R) {
    const o = out.o, p = params(v), m1 = o.motors[0], n = R.n;
    const steps = [
      { label: 'Stage 1 vacuum impulse and specific impulse (sea-level thrust + p₀A_e, trapezoid rule)', lhs: 'I_{vac}', eq: '\\int T_{vac}\\,dt', res: R.Q(m1.I, { dim: 'force', internal: 'lbf' }) + '\\,\\text{s}' },
      { lhs: 'I_{sp}', eq: 'I_{vac}/W_p', sub: `${n(m1.I)}/${R.v(p.stages[0].Wp, MASS)}`, res: `${n(m1.isp)}\\ \\text{s}` },
      { label: 'Rail length the point-mass model needs (Hoult, 1976)', lhs: 'L_{sim}', eq: '\\frac{0.140365}{\\lambda_P}\\exp\\left(\\sqrt{2\\pi\\lambda_PL}-0.387621(\\lambda_PL)^{1.2}\\right)', sub: `\\lambda_P=${n(p.lamP)}\\ \\text{ft}^{-1},\\ L=${R.v(v.L, DIST)}`, res: R.Q(simLauncherLength(p.lamP, v.L), DIST) },
      { label: 'Equations of motion integrated (RK4, 0.05 s; shorter on the rail and under parachutes)', lhs: '\\dot{\\vec V}', eq: '\\frac{T-D}{m}\\,\\hat u_{rel}-g\\,\\hat z,\\quad T=T_{vac}-pA_e,\\quad D=\\tfrac12\\rho V_{rel}^2C_D(M)S', res: '' },
      { label: 'Wind felt in powered flight (Lewis with the finite-inertia correction); full wind when coasting', lhs: 'w_{sim}', eq: 'k(\\lambda_Ph)\\,w(h)', res: '' },
      { label: 'Rail exit', lhs: 'V_L', eq: '', res: R.Q(o.railExit.V, SPD) },
      { label: 'Apogee', lhs: 'h_{max}', eq: '', res: R.Q(o.hApo, ALT) },
      { label: 'Impact range', lhs: 'x_I', eq: '', res: R.Q(out.results.range, DIST) },
      { label: 'Peak Mach number and dynamic pressure', lhs: 'M_{max}', eq: '', res: n(o.maxMach.mach) },
      { lhs: 'q_{max}', eq: '', res: R.Q(o.maxQ.q, PRES) },
    ];
    return [{
      title: 'Method',
      text: 'SKYAERO is a two-degree-of-freedom point-mass simulation in the plane of fire. Gravity falls with the inverse square of the distance from the Earth’s centre, and the atmosphere is Hoult’s latitude-dependent model tied to the launch-site temperature. On the rail the rocket accelerates along the rail; in free flight thrust acts along, and drag against, the air-relative velocity. Stages burn in sequence and separate at burnout; parachutes add drag area exponentially after deployment (Fuentes, Hoult, Tran and Tong).',
      steps,
    }];
  },
  references: ['skyaeromanual-ver3-orig', 'launcher-length-for-sounding-rocket-point-mass-traj-sim-orig'],
  examples: [
    { name: 'SKYAERO example: AeroTech M1939, 61 lb, QE 85°', values: { nStages: '1', ho: 1898, To: 559.67, lat: 34, QE: 85, L: 12, waveP: 350, simRail: true, useWind: false, useDrogue: false, useMain: false } },
    { name: 'Same rocket with wind and dual-deploy recovery', values: { nStages: '1', useWind: true, wind: [{ h: 0, w: 10 }, { h: 1000, w: 20 }, { h: 10000, w: 40 }], useDrogue: true, tD: 1, dD: 3, cdD: 0.87, useMain: true, hM: 1000, dM: 10, cdM: 0.89, tau: 2 } },
    { name: 'Two-stage: M1939 booster and a small sustainer', values: { nStages: '2', s1Wd: 36, s2delay: 1.5 } },
  ],
};
