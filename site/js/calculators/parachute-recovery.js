// Parachute Recovery (single parachute, two-piece rocket, optional reefing) — UI definition.
// Physics in ../calc/recovery.js (C. P. Hoult, Dual Purpose Parachute Recovery System rev. 2 and Parachute Reefing,
// RS&T 2013, after Knacke).
import { recovery, descentSpeed, descentTime, aftImpact, reefedDragRatio, densityExponent, tau, REEF, ATM, descentHistory, diameterFor, tetherFor, disreefFor } from '../calc/recovery.js';
import { s, fmt, InputError } from '../util.js';
import { text, dim, path } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const MASS = { dim: 'mass', internal: 'lbm' };
const DIST = { dim: 'distance', internal: 'ft' };
const ALT = { dim: 'altitude', internal: 'ft' };
const SPEED = { dim: 'speed', internal: 'fts' };
const FORCE = { dim: 'force', internal: 'lbf' };
const DENS = { dim: 'density', internal: 'slugft3' };
const LEN = { dim: 'length', internal: 'ft', units: { si: 'm', us: 'ft' } };
const ENERGY = { dim: 'energy', internal: 'ftlbf' };
const reefed = (v) => !!v.reef;
const mins = (t) => `${fmt(t / 60, { digits: 3 })} min`;
const sp = (x) => `${fmt(toDisplay(x, SPEED), { digits: 3 })} ${unitLabel(displayUnit(SPEED))}`;
const ds = (x) => `${fmt(toDisplay(x, DIST), { digits: 3 })} ${unitLabel(displayUnit(DIST))}`;
// verdict bands (DECISIONS D25): landing speed against the user's target, drift against the field radius
const MARGIN = 1.25, DRIFT_WARN = 0.8;

/** Parachute icon of half-width w at (x, y) = canopy skirt centre; reefed: mouth narrowed to the reefing ratio. */
function chute(g, x, y, w, mouthFrac, field, payloadY) {
  const mouth = w * mouthFrac, h = w * (0.7 + 0.5 * (1 - mouthFrac));
  g.append(s('path', { d: `M${x - mouth},${y}Q${x - w},${y - h} ${x},${y - h}Q${x + w},${y - h} ${x + mouth},${y}Q${x},${y - h * 0.25} ${x - mouth},${y}Z`, fill: 'var(--red)', 'fill-opacity': 0.78, stroke: 'var(--red)', 'data-field': field }));
  if (mouthFrac < 0.99) g.append(s('ellipse', { cx: x, cy: y - 1, rx: mouth, ry: 2.2, fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.2 }));
  if (payloadY != null) g.append(s('path', { d: `M${x - mouth},${y}L${x},${payloadY}L${x + mouth},${y}`, class: 'sc-thin', fill: 'none' }));
}

export default {
  slug: 'parachute-recovery',
  topic: 'recovery',
  title: 'Parachute Recovery',
  subtitle: 'Descent time, <b>wind drift</b> and landing speeds of a two-piece rocket under a single parachute, with optional reefing — and the parachute, tether or disreef height that lands it softly inside your field.',
  verdict: true,
  tiers: true,
  intro: {
    what: 'Follows a rocket split into a heavy nose and a lighter aft body, joined by a tether under one parachute, from the moment the parachute opens to landing: how fast it falls, how long it takes, how far the wind carries it, and how hard each piece lands.',
    why: 'A big parachute lands softly but drifts far; a small one stays close but lands hard. Reefing (holding the canopy partly closed high up) lets you fall fast through the windy upper air and still land softly.',
    when: 'Choosing a parachute size, deciding whether to reef it and when to open it fully, and checking that the rocket will land inside the recovery area.',
  },
  info: {
    text: [
      'Once the parachute is open, the rocket soon falls at a steady speed where the air drag on the parachute equals the weight. Thin air high up gives less drag, so the rocket falls faster there and slows down as it gets lower.',
      'The time to fall from opening to the ground, times the wind speed, is how far the wind carries it (the drift). Holding the canopy partly closed (reefing) makes it fall faster through the upper air, which cuts the drift; the canopy is opened fully near the ground for a soft landing.',
      'The heavy nose lands first. Then the lighter aft body with the electronics is held by the whole parachute and slows down over the length of the tether before it touches the ground.',
    ],
    tex: 'V=\\sqrt{\\frac{2Mg}{C_D\\rho S}}',
    steps: ['Enter the masses of the two pieces and the tether length.', 'Enter the parachute size and drag coefficient; choose whether to reef it.', 'Enter the opening height, ground elevation, speed at opening and the wind.', 'Set the landing speed you want and the radius of your recovery area.', 'Read the verdict and the fixes: a bigger parachute, a longer tether or a lower disreef height.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'mass', title: 'Rocket',
      fields: [
        { id: 'W1', label: 'Nose (payload / ballast) mass', sym: 'm_1', ...MASS, default: 10, min: 0, minExclusive: true, max: 2000, slider: { min: 0.2, max: 60, step: 0.1 },
          info: { text: ['The mass of the front piece of the rocket — the nose cone with any payload or ballast. It hangs at the end of the tether and touches the ground first.', 'Weigh the nose section as it flies.', 'A heavier nose pulls the parachute down faster (more drift time saved, harder landing for the nose), and it gives the aft body more to slow down from once the nose is on the ground.'], tex: 'M=m_1+m_2', range: 'Model rockets 0.05–0.5 kg; high-power 0.5–5 kg; research rockets up to tens of kg.', doc: 'impact' } },
        { id: 'W2', label: 'Aft body mass (with parachute)', sym: 'm_2', ...MASS, default: 8.5, min: 0, minExclusive: true, max: 2000, slider: { min: 0.2, max: 60, step: 0.1 },
          info: { text: ['The mass of the back piece — the body tube with the motor case, the electronics and the parachute itself.', 'Weigh it after the flight, without the propellant (it has burnt).', 'This is the piece you most want to land softly. The lighter it is compared with the parachute, the slower it lands once the nose is down.'], tex: 'V_{aft,\\min}=\\sqrt{\\frac{2m_2g}{C_D\\rho_GS}}', range: 'Usually somewhat lighter than the nose in this two-piece scheme.', doc: 'impact' } },
        { id: 'L', label: 'Tether length', sym: 'L', ...DIST, default: 33, min: 0, max: 1000, slider: { min: 0, max: 150, step: 1 },
          info: { text: ['The cord between the nose and the parachute. When the nose lands, the aft body is still this far above it.', 'It is the length of cord you pack (Hoult: a 2 in spool holds about 33 ft of 1/8 in nylon cord).', 'A longer tether gives the aft body more height to slow down after the nose lands — but only up to a few “slowing lengths”; after that the landing speed stops improving.'], tex: 'V_{aft}^2=\\frac{2m_2g}{C_D\\rho_GS}+\\frac{2m_1g}{C_D\\rho_GS}e^{-C_D\\rho_GSL/m_2}', range: '5–20 m (15–60 ft) is common.', doc: 'impact' } },
      ],
    },
    {
      id: 'chute', title: 'Parachute',
      fields: [
        { id: 'D0', label: 'Parachute flat diameter', sym: 'D_0', ...LEN, default: 5.18, min: 0, minExclusive: true, max: 100, slider: { min: 0.5, max: 20, step: 0.01 },
          info: { text: ['The diameter of the parachute canopy laid out flat on the floor (not its smaller, puffed-up size when open).', 'Measure it flat, or read the size from the maker (a “44 in” parachute is 44 in across flat).', 'Drag grows with the area, so doubling the diameter quadruples the drag area and halves the descent speed — but the slower fall also roughly doubles the time and the wind drift.'], tex: 'S=\\frac{\\pi D_0^2}{4}', range: 'Model rockets 0.3–1 m (12–36 in); high-power 1–3 m (3–10 ft).', doc: 'descent' } },
        { id: 'CD', label: 'Drag coefficient (open)', sym: 'C_D', dim: 'none', default: 0.8, min: 0.1, max: 2.5, slider: { min: 0.3, max: 1.8, step: 0.01 },
          info: { text: ['A number that says how good the canopy shape is at making drag, based on the flat area. It does not depend on size.', 'Take it from the maker or from drop tests. Hoult uses about 0.8 for flat circular parachutes; drop tests of 3 ft canopies gave 0.78–0.86.', 'Drag is proportional to it: a 20 % higher C_D gives about 10 % slower descent.'], tex: 'D=\\tfrac12\\,C_D\\,\\rho\\,V^2S', range: 'Flat circular about 0.8; cross / elliptical canopies often 1.2–1.5 (maker’s data).', doc: 'descent' } },
        { id: 'reef', label: 'Reef the parachute', kind: 'bool', default: true,
          info: { text: ['Reefing ties a cord round the edge of the canopy so it can only open part of the way. A cutter frees it lower down (“disreef”) and the canopy opens fully.', 'Use it when the opening is high and the wind is strong.', 'A reefed canopy falls faster, so the rocket spends less time drifting in the wind; the full canopy then gives the soft landing.'], doc: 'reefing' } },
        { id: 'ratio', label: 'Reefing ratio', sym: 'D_R/D_0', dim: 'none', default: 0.25, min: 0.06, max: 0.62, when: reefed, slider: { min: 0.06, max: 0.62, step: 0.01 },
          info: { text: ['How far the reefed canopy can open: the diameter of the reefing-cord circle divided by the flat diameter.', 'Set by the length of the reefing cord: ratio = cord length / (π × flat diameter).', 'Smaller ratio → less drag, faster fall, less drift, but a harder jolt when it disreefs. At 0.62 the canopy is already fully open (that is the mouth size of an open canopy).'], tex: '\\frac{C_{DR}}{C_D}=f\\!\\left(\\frac{D_R}{D_0}\\right)', range: 'Keep at least about 0.2 for small parachutes (Hoult, after Knacke); 0.06 only for canopies over 4 m.', doc: 'reefing' } },
        { id: 'hR', label: 'Disreef height (above ground)', sym: 'h_{DR}', ...ALT, default: 1000, min: 0, max: 100000, when: reefed, slider: { min: 0, max: 5000, step: 10 },
          info: { text: ['The height above the ground at which the reefing cord is cut and the canopy opens fully.', 'Set it on the altimeter or flight computer that fires the cutter.', 'Lower disreef = less time under the big canopy = less drift; but leave enough height for the canopy to open and slow down before landing.'], range: '150–500 m (500–1500 ft) is typical.', doc: 'descent' } },
      ],
    },
    {
      id: 'flight', title: 'Flight and wind',
      fields: [
        { id: 'hD', label: 'Parachute opening height (above ground)', sym: 'h_D', ...ALT, default: 25000, min: 1, max: 100000, slider: { min: 100, max: 30000, step: 50 },
          info: { text: ['How high above the ground the parachute comes out — usually just after the top of the flight (apogee).', 'From your flight simulation, or the apogee setting of the flight computer.', 'The higher it opens, the longer the descent and the farther the wind carries the rocket. This is why high flights reef the parachute or use a small drogue first.'], range: 'Model rockets 100–500 m; high-power 1–6 km; research rockets up to about 10 km (inside the troposphere for this model).', doc: 'descent' } },
        { id: 'hG', label: 'Ground elevation', sym: 'h_G', ...ALT, default: 4300, min: 0, max: 30000, slider: { min: 0, max: 10000, step: 10 },
          info: { text: ['How high the landing area is above sea level.', 'From a map or GPS.', 'Air is thinner at a high site, so the parachute makes less drag and the rocket lands faster: about 3 % faster per 1000 m.'], tex: '\\rho=\\rho_0\\tau^m,\\ \\tau=1+\\frac{\\alpha h}{T_0}', range: 'Black Rock Desert ≈ 1190 m (3900 ft); Spaceport America ≈ 1400 m (4600 ft).', doc: 'descent' } },
        { id: 'VD', label: 'Speed when the parachute opens', sym: 'V_D', ...SPEED, default: 100, min: 0, max: 5000, slider: { min: 0, max: 500, step: 1 },
          info: { text: ['How fast the rocket is moving at the moment the parachute comes out.', 'From the flight simulation at the opening time (near apogee it is mostly the sideways speed).', 'The jolt on the parachute and the reefing cord grows with the square of this speed.'], tex: 'q_D=\\tfrac12\\rho_DV_D^2', range: 'Near apogee 10–60 m/s (30–200 ft/s).', doc: 'reefing' } },
        { id: 'wind', label: 'Average wind speed', sym: 'w', ...SPEED, default: 20, min: 0, max: 300, slider: { min: 0, max: 100, step: 1 },
          info: { text: ['The average horizontal wind the parachute falls through, from opening to landing.', 'Use the forecast “winds aloft”, averaged over the heights of the descent; ground wind alone is usually too low.', 'The drift is directly proportional to it: double the wind, double the drift.'], tex: 'x_w=w\\,t', range: 'Ground 2–8 m/s; aloft often 10–20 m/s (30–60 ft/s) or more.', doc: 'drift' } },
      ],
    },
    {
      id: 'goal', title: 'Your limits',
      fields: [
        { id: 'vT', label: 'Landing speed you accept', sym: 'V_{T}', ...SPEED, default: 25, min: 1, max: 200, slider: { min: 5, max: 60, step: 0.5 },
          info: { text: ['The fastest you are happy for the aft body (with the electronics) to hit the ground.', 'Your choice: it depends on how robust the airframe and electronics are, and on your range’s rules.', 'The verdict compares the aft-body landing speed with it, and the calculator works out the parachute diameter or tether length that reaches it.'], range: 'Set it from your hardware and your range’s rules; this tool does not impose a value.', doc: 'verdict' } },
        { id: 'Rf', label: 'Recovery area radius', sym: 'R_f', ...DIST, default: 10000, min: 1, max: 1e6, slider: { min: 500, max: 30000, step: 100 },
          info: { text: ['How far from the launch point the rocket can land and still be safe and recoverable.', 'Measure on a map from the pad to the nearest road, fence, water or edge of open ground in the downwind direction.', 'The verdict checks that the drift stays inside it, and the calculator gives the disreef height that keeps it there.'], range: 'From a few hundred metres (club field) to several kilometres (desert launch sites).', doc: 'verdict' } },
      ],
    },
  ],
  results: [
    { id: 'vAft', label: 'Aft body landing speed', sym: 'V_{aft}', ...SPEED, key: true, digits: 4,
      status: (x, out) => (x > MARGIN * out.v.vT ? 'err' : x > out.v.vT ? 'warn' : 'ok'),
      note: (x, out) => `nose lands at ${sp(out.o.vNose)} · target ${sp(out.v.vT)}`,
      info: { text: ['How fast the back piece with the electronics hits the ground.', 'It is lower than the nose’s landing speed: once the heavy nose is down, the whole parachute holds only the aft body, which slows down over the tether length.', 'Lower it with a bigger parachute, a longer tether or a lighter aft body.'], tex: 'V_{aft}^2=\\frac{2m_2g}{C_D\\rho_GS}+\\frac{2m_1g}{C_D\\rho_GS}e^{-C_D\\rho_GSL/m_2}', doc: 'impact' } },
    { id: 'drift', label: 'Wind drift', sym: 'x_w', ...DIST, key: true, digits: 4,
      status: (x, out) => (x > out.v.Rf ? 'err' : x > DRIFT_WARN * out.v.Rf ? 'warn' : 'ok'),
      note: (x, out) => `recovery area ${ds(out.v.Rf)}`,
      info: { text: ['How far the wind carries the rocket sideways between the parachute opening and landing.', 'It is the average wind speed times the descent time — so anything that shortens the descent (reefing, a lower opening, a smaller parachute) cuts it.', 'Compare it with the distance to the edge of your recovery area.'], tex: 'x_w=w\\,t', doc: 'drift' } },
    { id: 't', label: 'Descent time', sym: 't', dim: 'time', key: true, digits: 4,
      note: (x, out, v) => `${mins(x)}${v.reef ? ` · reefed ${mins(out.o.tReefed)}` : ''}`,
      info: { text: ['How long the rocket hangs under the parachute, from opening to landing.', 'Found by adding up small steps of height divided by the descent speed at that height (the speed changes as the air gets thicker).', 'Longer time = more drift and more chance of losing sight of the rocket.'], tex: 't=\\int\\frac{dh}{V}=\\frac{T_0\\left(\\tau_D^{\\,e}-\\tau_G^{\\,e}\\right)}{\\alpha V_0e}', doc: 'descent' } },
    { id: 'vDeploy', label: 'Descent speed after opening', sym: 'V_{D,s}', ...SPEED, key: true, digits: 4, note: (x, out, v) => (v.reef ? 'reefed, in the thin air up high' : 'open, in the thin air up high'),
      info: { text: ['The steady falling speed just after the parachute opens, high up where the air is thin.', 'It is the fastest part of the descent; it falls as the rocket reaches thicker air.', 'Reefing raises it on purpose to cut the drift.'], tex: 'V=\\sqrt{\\frac{2Mg}{C_D\\rho S}}', doc: 'descent' } },
    { id: 'Dneed', label: 'Parachute diameter for your landing speed', sym: 'D_{0,req}', ...LEN, digits: 4, info: { text: ['The flat diameter that would make the aft body land exactly at your accepted landing speed, with everything else unchanged.', 'A bigger parachute also drifts farther, so check the drift again after changing it.'], doc: 'verdict' } },
    { id: 'Lneed', label: 'Tether length for your landing speed', sym: 'L_{req}', ...DIST, digits: 4, info: { text: ['The tether that would make the aft body land at your accepted speed. “—” when even a very long tether cannot do it — then the parachute is too small for the aft body alone.'], doc: 'verdict' } },
    { id: 'hRneed', label: 'Disreef height that keeps the drift in the area', sym: 'h_{DR,max}', ...ALT, digits: 4, info: { text: ['The highest disreef height (reefing at your ratio) for which the drift stays inside the recovery area. “—” when even disreefing at the ground drifts too far: reef tighter, open lower or wait for less wind.'], doc: 'verdict' } },
    { id: 'KEaft', label: 'Aft body landing energy', sym: 'E_{aft}', ...ENERGY, digits: 4,
      info: { text: ['The energy of motion of the aft body when it lands. It is what the airframe and the electronics have to absorb.', 'It grows with the square of the landing speed: landing 20 % slower cuts it by more than a third.'], tex: 'E=\\tfrac12mV^2', doc: 'impact' } },
    { id: 'KEnose', label: 'Nose landing energy', sym: 'E_{1}', ...ENERGY, digits: 4, info: { tex: 'E=\\tfrac12mV^2', doc: 'impact' } },
    { id: 'vNose', label: 'Nose landing speed', sym: 'V_I', ...SPEED, digits: 4, info: { text: ['The steady descent speed of the whole rocket at the ground, which is how fast the nose lands.'], tex: 'V_I=\\sqrt{\\frac{2Mg}{C_D\\rho_GS}}', doc: 'impact' } },
    { id: 'vAftMin', label: 'Aft landing speed with an endless tether', sym: 'V_{aft,\\min}', ...SPEED, digits: 4, info: { text: ['The slowest the aft body could ever land with this parachute: what it would reach with a very long tether.'], tex: 'V_{aft,\\min}=\\sqrt{\\frac{2m_2g}{C_D\\rho_GS}}', doc: 'impact' } },
    { id: 'vDisreef', label: 'Descent speed at disreef', sym: 'V_{DR}', ...SPEED, digits: 4, when: reefed, info: { text: ['How fast the reefed parachute is falling when the cord is cut. Faster means a harder jolt as the canopy opens fully (Hoult).'], doc: 'reefing' } },
    { id: 'tReefed', label: 'Time reefed', sym: 't_{R}', dim: 'time', digits: 4, when: reefed, info: { doc: 'descent' } },
    { id: 'tOpen', label: 'Time fully open', sym: 't_{O}', dim: 'time', digits: 4, info: { doc: 'descent' } },
    { id: 'k', label: 'Reefed drag ratio', sym: 'C_{DR}/C_D', dim: 'none', digits: 4, when: reefed, info: { text: ['How much of the full drag the reefed canopy makes, read from Knacke’s measurements on flat circular canopies.'], doc: 'reefing' } },
    { id: 'reefLine', label: 'Reefing cord strength needed', sym: 'S_R', ...FORCE, digits: 4, when: reefed, info: { text: ['The breaking strength the reefing cord should have (Hoult’s estimate from Knacke’s data).'], tex: 'S_R\\ge q_D\\frac{\\pi}{4}D_0^2C_S,\\ C_S\\approx0.02', doc: 'reefing' } },
    { id: 'rhoG', label: 'Air density at the ground', sym: '\\rho_G', ...DENS, digits: 4, info: { doc: 'descent' } },
  ],
  compute(v) {
    if (v.hG + v.hD > 36000) throw new InputError('The parachute must open inside the troposphere (below about 36 000 ft / 11 km above sea level) for this atmosphere model.');
    const o = recovery(v);
    // fixes
    const Dneed = diameterFor(v, v.vT), Lneed = tetherFor(v, v.vT), hRneed = disreefFor({ ...v, ratio: v.reef ? v.ratio : 0.25 }, v.Rf);
    const KEaft = 0.5 * o.m2 * o.vAft ** 2, KEnose = 0.5 * o.m1 * o.vNose ** 2;   // slug·ft²/s² = ft·lbf
    // verdict: soft landing and inside the recovery area
    const slow = o.vAft <= v.vT, slowish = o.vAft <= MARGIN * v.vT, inside = o.drift <= DRIFT_WARN * v.Rf, insideish = o.drift <= v.Rf;
    const level = !slowish || !insideish ? 'unsafe' : !slow || !inside ? 'marginal' : 'safe';
    const fixes = [];
    if (!slow) {
      if (Dneed) fixes.push(`Use a parachute of at least <b>${ds(Dneed)}</b> flat diameter (now ${ds(v.D0)}), or`);
      if (Lneed != null && Lneed > v.L) fixes.push(`lengthen the tether to <b>${ds(Lneed)}</b> (now ${ds(v.L)}), or`);
      fixes.push('make the aft body lighter.');
    }
    if (!inside) {
      if (hRneed != null) fixes.push(`${v.reef ? 'Disreef' : 'Reef to 0.25 and disreef'} at or below <b>${fmt(toDisplay(hRneed, ALT), { digits: 3 })} ${unitLabel(displayUnit(ALT))}</b> above ground${v.reef ? ` (now ${fmt(toDisplay(v.hR, ALT), { digits: 3 })})` : ''} to land inside the area, or`);
      fixes.push('open the parachute lower, reef it tighter, or wait for less wind.');
    }
    const verdict = {
      level,
      title: level === 'safe' ? 'Soft landing inside the recovery area' : !slowish ? 'The aft body lands too hard' : !insideish ? 'The rocket drifts out of the recovery area' : !slow ? 'Landing a little faster than you want' : 'Landing close to the edge of the area',
      text: `The aft body lands at <b>${sp(o.vAft)}</b> (you accept ${sp(v.vT)}) after a ${mins(o.t)} descent, <b>${ds(o.drift)}</b> downwind (recovery area ${ds(v.Rf)}).`,
      fixes: fixes.slice(0, 3),
    };
    const warnings = [];
    if (v.reef && v.hR >= v.hD) warnings.push({ level: 'warn', text: 'The disreef height is at or above the opening height, so the canopy opens fully straight away: no reefed phase.', fix: `Set the disreef height below the opening height (${fmt(toDisplay(v.hD, ALT), { digits: 3 })} ${unitLabel(displayUnit(ALT))}).` });
    if (v.reef && v.ratio < 0.2 && v.D0 < 13) warnings.push({ level: 'warn', text: 'A reefing ratio below about 0.2 can make a small parachute unstable (Hoult, after Knacke).', fix: 'Use a reefing ratio of at least 0.2, or a larger canopy (over 4 m) if you need tighter reefing.' });
    if (v.reef && v.ratio >= 0.62) warnings.push({ level: 'info', text: 'At a reefing ratio of 0.62 the canopy is already fully open: reefing does nothing.' });
    if (v.reef && o.vDisreef > 3 * o.vNose) warnings.push({ level: 'info', text: `The parachute is still falling at ${sp(o.vDisreef)} when it disreefs, ${fmt(o.vDisreef / o.vNose, { digits: 2 })} times its final speed: expect a hard opening jolt (Hoult).`, fix: 'A larger reefing ratio lowers the speed at disreef (at the cost of more drift).' });
    if (!v.reef && v.hD > 5000 && o.drift > v.Rf) warnings.push({ level: 'info', text: 'High opening without reefing: most of the drift happens in the upper air.', fix: 'Turn on reefing to fall faster through it.' });
    const results = { vAft: o.vAft, drift: o.drift, t: o.t, vDeploy: o.vDeploy, Dneed: Dneed ?? '—', Lneed: Lneed ?? '—', hRneed: hRneed ?? '—', KEaft, KEnose,
      vNose: o.vNose, vAftMin: o.vAftMin, vDisreef: o.vDisreef, tReefed: o.tReefed, tOpen: o.tOpen, k: o.k, reefLine: o.reefLine, rhoG: o.rhoG };
    return { results, warnings, verdict, o, v, hist: descentHistory(v) };
  },
  plots: [
    {
      id: 'history', title: 'The descent, second by second', wide: true, height: 560,
      info: { text: ['Three views of the same descent on one time axis, starting when the parachute opens: the height above the ground, the falling speed, and how far the wind has carried the rocket.', 'Hover anywhere to read all three at that moment. The step in the speed is the disreef: the canopy opens fully and the rocket slows down.', 'The red lines are your limits: the landing speed you accept and the edge of the recovery area. A good descent ends below both.'], doc: 'descent' },
      build(v, out, { U }) {
        const ua = U(ALT), us = U(SPEED), ud = U(DIST), H = out.hist;
        const tDR = v.reef ? out.o.tReefed : null;
        return {
          x: { label: 'Time since the parachute opened', unit: 's' }, xDomain: [0, out.o.t],
          vlines: tDR != null ? [{ x: tDR, label: 'disreef', color: 'var(--text-3)' }] : [],
          panels: [
            { y: { label: 'Height above ground', unit: ua.label }, color: 'var(--series-2)', includeZero: true, series: [{ name: 'height', points: H.map((q) => [q.t, ua.v(q.h)]) }] },
            { y: { label: 'Descent speed', unit: us.label }, color: 'var(--series-1)', includeZero: true, series: [{ name: 'speed', points: H.map((q) => [q.t, us.v(q.V)]) }], hlines: [{ y: us.v(v.vT), label: 'your landing speed', color: 'var(--danger)' }] },
            { y: { label: 'Drift', unit: ud.label }, color: 'var(--series-4)', includeZero: true, series: [{ name: 'drift', dash: '7 4', points: H.map((q) => [q.t, ud.v(q.x)]) }], hlines: [{ y: ud.v(v.Rf), label: 'edge of the recovery area', color: 'var(--danger)' }] },
          ],
        };
      },
    },
    {
      id: 'size', title: 'Choosing the parachute size', wide: true, height: 420,
      info: { text: ['What happens to the landing speed and to the drift as the parachute diameter changes, everything else as you set it.', 'A bigger parachute lands softer but drifts farther: the good sizes are where the landing speed is below your limit and the drift is below the edge of the area.', 'The vertical line is your parachute.'], doc: 'verdict' },
      build(v, out, { U }) {
        const ul = U(LEN), us = U(SPEED), ud = U(DIST), sp1 = [], dr = [];
        const d0 = Math.max(0.3, 0.25 * v.D0), d1 = 3 * v.D0;
        for (let i = 0; i <= 80; i++) { const D = d0 + ((d1 - d0) * i) / 80, o = recovery({ ...v, D0: D }); sp1.push([ul.v(D), us.v(o.vAft)]); dr.push([ul.v(D), ud.v(o.drift)]); }
        return {
          x: { label: 'Parachute flat diameter $D_0$', unit: ul.label }, vlines: [{ x: ul.v(v.D0), label: 'your parachute', color: 'var(--text-3)' }],
          panels: [
            { y: { label: 'Aft landing speed', unit: us.label }, color: 'var(--series-1)', includeZero: true, series: [{ name: '$V_{aft}$', points: sp1 }], hlines: [{ y: us.v(v.vT), label: 'your landing speed', color: 'var(--danger)' }] },
            { y: { label: 'Drift', unit: ud.label }, color: 'var(--series-4)', includeZero: true, series: [{ name: '$x_w$', dash: '7 4', points: dr }], hlines: [{ y: ud.v(v.Rf), label: 'edge of the area', color: 'var(--danger)' }] },
          ],
        };
      },
    },
    {
      id: 'disreef', title: 'Drift against disreef height', explore: true,
      info: { text: ['How the drift changes if you cut the reefing cord higher or lower (at your reefing ratio). Lower disreef means less time under the full canopy, so less drift; the landing speed does not change as long as the canopy has time to open.', 'Where the curve crosses the red line is the highest disreef that still lands inside the area.'], doc: 'drift' },
      build(v, out, { U }) {
        if (!v.reef) return null;
        const ua = U(ALT), ud = U(DIST), pts = [];
        for (let i = 0; i <= 60; i++) { const hR = (0.98 * v.hD * i) / 60; pts.push([ua.v(hR), ud.v(recovery({ ...v, hR }).drift)]); }
        return { x: { label: 'Disreef height above ground $h_{DR}$', unit: ua.label }, y: { label: 'Drift $x_w$', unit: ud.label }, includeZero: true,
          series: [{ name: 'drift', points: pts }], hlines: [{ y: ud.v(v.Rf), label: 'edge of the area', color: 'var(--danger)' }],
          markers: [{ x: ua.v(v.hR), y: ud.v(out.o.drift), label: 'your disreef' }] };
      },
    },
    {
      id: 'tether', title: 'Aft landing speed against tether length', explore: true,
      info: { text: ['The longer the tether, the more height the aft body has to slow down after the nose lands. The curve flattens out: after a few metres more tether does almost nothing, and the dashed line is the best any tether can do.', 'If the red line (your landing speed) is below the dashed line, no tether is long enough — use a bigger parachute.'], doc: 'impact' },
      build(v, out, { U }) {
        const o = out.o, us = U(SPEED), ud = U(DIST), top = Math.max(3 * v.L, 3 * (o.m2 / (o.CdS * o.rhoG)), 30), pts = [];
        for (let i = 0; i <= 80; i++) { const L = (top * i) / 80; pts.push([ud.v(L), us.v(aftImpact(o.m1, o.m2, o.CdS, o.rhoG, L))]); }
        return { x: { label: 'Tether length $L$', unit: ud.label }, y: { label: 'Aft landing speed', unit: us.label }, includeZero: true, series: [{ name: '$V_{aft}$', points: pts, smooth: true }],
          hlines: [{ y: us.v(o.vAftMin), label: 'endless tether', color: 'var(--text-3)' }, { y: us.v(v.vT), label: 'your landing speed', color: 'var(--danger)' }], markers: [{ x: ud.v(v.L), y: us.v(o.vAft), label: 'your tether' }] };
      },
    },
    {
      id: 'reefing', title: 'Reefed drag (Knacke)', explore: true,
      info: { text: ['How much drag a reefed flat circular canopy makes compared with fully open, against the reefing ratio — measured data (Knacke, in Hoult’s memo).', 'Drag falls quickly below a ratio of about 0.4; at 0.62 the canopy is fully open.'], doc: 'reefing' },
      build(v) {
        return { x: { label: 'Reefing ratio $D_R/D_0$' }, y: { label: 'Reefed drag / open drag' }, xDomain: [0, 0.7], yDomain: [0, 1], series: [{ name: 'Knacke data', points: REEF, smooth: true }],
          markers: v.reef ? [{ x: v.ratio, y: reefedDragRatio(v.ratio), label: 'your ratio' }] : [] };
      },
    },
  ],
  schematicTitle: 'Descent path and landing',
  schematicHint: 'Left: the descent from parachute opening to landing, height and drift to the same scale, with dots every interval of time and the wind; the shaded ground is the recovery area. Right: the landing — the nose is down and the aft body slows over the tether. Drag the opening and disreef points up or down, the wind arrow sideways, or the flag at the edge of the area',
  schematic(ctx, v, out) {
    const W = 760, H = 440, o = out.o, hist = out.hist, lv = out.verdict.level;
    const fr = ctx.frame({ width: W, height: H, label: 'Descent path with drift and wind, recovery area, and the landing' });
    const g = fr.layer('main'); g.replaceChildren();
    const ua = ctx.U(ALT), ud = ctx.U(DIST), us = ctx.U(SPEED), A = (h) => `${fmt(ua.v(h), { digits: 3 })} ${ua.plain}`, Sp = (x) => `${fmt(us.v(x), { digits: 3 })} ${us.plain}`, Dd = (x) => `${fmt(ud.v(x), { digits: 3 })} ${ud.plain}`;
    const col = lv === 'unsafe' ? 'var(--danger)' : lv === 'marginal' ? 'var(--warn)' : 'var(--ok)';
    // ---- descent panel: height and drift to one scale ----
    const bx0 = 92, bx1 = 470, yt = 58, yg = 362, span = Math.max(o.drift, v.Rf) * 1.08 || 1;
    const k = Math.min((bx1 - bx0) / span, (yg - yt) / v.hD), X = (x) => bx0 + x * k, Y = (h) => yg - h * k;
    // recovery area on the ground
    g.append(s('rect', { x: X(0), y: yg, width: X(v.Rf) - X(0), height: 10, fill: 'var(--ok)', 'fill-opacity': 0.18, 'data-field': 'Rf' }));
    g.append(s('line', { x1: 40, x2: bx1 + 10, y1: yg, y2: yg, class: 'sc-line' }));
    for (let x = 44; x < bx1 + 10; x += 12) g.append(s('line', { x1: x, y1: yg, x2: x - 8, y2: yg + 8, class: 'sc-thin', 'stroke-opacity': 0.4 }));
    g.append(s('path', { d: `M${X(v.Rf)},${yg}V${yg - 26}l12,5l-12,5`, fill: 'var(--ok)', stroke: 'var(--ok)', 'data-field': 'Rf' }));
    g.append(text(X(v.Rf), yg + 24, `area edge ${Dd(v.Rf)}`, { anchor: 'middle', size: 10.5, field: 'Rf' }));
    // launch pad marker
    g.append(s('path', { d: `M${X(0) - 5},${yg}L${X(0)},${yg - 10}L${X(0) + 5},${yg}Z`, fill: 'var(--text-2)' }));
    g.append(text(X(0), yg + 24, 'pad', { anchor: 'middle', size: 10, cls: 'sc-dim-text' }));
    // path and time dots
    g.append(s('path', { d: path(hist.map((q) => [X(q.x), Y(q.h)])), fill: 'none', stroke: 'var(--text-2)', 'stroke-width': 1.4, 'stroke-dasharray': '5 3', 'data-field': 'wind' }));
    const step = [5, 10, 15, 30, 60, 120, 300, 600].find((st) => o.t / st <= 14) || 1200;
    for (let t = step, i = 1; t < o.t; t += step, i++) {
      const j = hist.findIndex((q) => q.t >= t), q = hist[Math.max(0, j)];
      g.append(s('circle', { cx: X(q.x), cy: Y(q.h), r: 2.6, fill: 'var(--text-2)' }));
      if (i % 2 === 0) g.append(text(X(q.x) + 6, Y(q.h) + 3, `${t >= 60 && step >= 60 ? `${fmt(t / 60, { digits: 3 })} min` : `${t} s`}`, { size: 9.5, cls: 'sc-dim-text' }));
    }
    // wind arrows on the left, length ∝ wind speed
    const wl = Math.min(70, 1.4 * us.v(v.wind) * (us.plain === 'm/s' ? 3.2 : 1));
    for (const f of [0.25, 0.55, 0.85]) { const y = Y(f * v.hD); if (wl > 2) g.append(s('path', { d: `M${38},${y}h${wl}`, class: 'sc-accent', 'marker-end': fr.arrow('acc'), 'data-field': 'wind' })); }
    g.append(text(38, Y(0.85 * v.hD) - 8, `wind ${Sp(v.wind)}`, { size: 10.5, field: 'wind' }));
    // parachute at opening (reefed mouth) and at disreef (open), sized by the diameter
    const cw = Math.max(9, Math.min(26, 5 + 3.2 * Math.sqrt(v.D0)));
    const top = hist[0];
    chute(g, X(top.x), Y(top.h) - 14, cw, v.reef ? Math.max(0.18, v.ratio / 0.62) : 1, 'D0 ratio reef', Y(top.h) - 2);
    g.append(text(X(top.x) + cw + 6, Y(top.h) - 16, `opens at ${A(v.hD)} · falls ${Sp(o.vDeploy)}`, { size: 10.5, field: 'hD' }));
    if (v.reef) {
      const q = hist.find((p) => !p.reefed) || hist[hist.length - 1];
      chute(g, X(q.x), Y(q.h) - 14, cw, 1, 'hR D0', Y(q.h) - 2);
      g.append(text(X(q.x) + cw + 6, Y(q.h) - 16, `disreef ${A(v.hR)} · ${Sp(o.vDisreef)}`, { size: 10.5, field: 'hR' }));
    }
    // landing point coloured by the verdict
    g.append(s('circle', { cx: X(o.drift), cy: yg, r: 5.5, fill: col, stroke: 'var(--surface)', 'stroke-width': 1.5 }));
    g.append(dim(fr, X(0), yg + 38, X(o.drift), yg + 38, `drift ${Dd(o.drift)} in ${mins(o.t)}`, { field: 'wind', textOff: 14 }));
    g.append(text(18, 22, `ground ${A(v.hG)} above sea level · height and drift to the same scale`, { size: 10.5, cls: 'sc-dim-text', field: 'hG' }));
    // ---- landing panel ----
    const lx = 620, lg = yg, Lp = Math.max(70, Math.min(200, 40 + 4 * Math.sqrt(ud.v(v.L)) * 6)), ya = lg - Lp;
    g.append(s('line', { x1: 510, x2: 740, y1: lg, y2: lg, class: 'sc-line' }));
    g.append(s('rect', { x: lx - 9, y: lg - 34, width: 18, height: 34, rx: 3, class: 'sc-body-2', 'data-field': 'W1' }));
    g.append(s('path', { d: `M${lx - 9},${lg - 34}Q${lx},${lg - 54} ${lx + 9},${lg - 34}Z`, class: 'sc-body-2', 'data-field': 'W1' }));
    g.append(s('path', { d: `M${lx},${lg - 54}C${lx + 26},${lg - 54 - (Lp - 90) / 3} ${lx - 26},${ya + 60} ${lx},${ya + 34}`, fill: 'none', stroke: 'var(--text-2)', 'stroke-width': 1.3, 'stroke-dasharray': '3 2', 'data-field': 'L' }));
    g.append(s('rect', { x: lx - 8, y: ya - 6, width: 16, height: 40, rx: 3, class: 'sc-body', 'data-field': 'W2' }));
    chute(g, lx, ya - 46, Math.max(22, Math.min(46, 14 + 6 * Math.sqrt(v.D0))), 1, 'D0 CD', ya - 6);
    g.append(dim(fr, lx + 52, lg, lx + 52, ya + 34, `L = ${Dd(v.L)}`, { field: 'L' }));
    g.append(text(lx - 16, lg - 14, `nose ${Sp(o.vNose)}`, { anchor: 'end', size: 10.5, field: 'W1' }));
    g.append(s('circle', { cx: lx - 22, cy: ya + 14, r: 4, fill: col }));
    g.append(text(lx - 30, ya + 18, `aft body lands ${Sp(o.vAft)}`, { anchor: 'end', size: 11, field: 'W2 vT' }));
    g.append(text(625, 22, 'landing (tether not to scale)', { anchor: 'middle', size: 10.5, cls: 'sc-dim-text' }));
    // ---- handles ----
    ctx.handle('open', X(top.x), Y(top.h), { field: 'hD', title: 'Drag up or down to change the opening height',
      onDrag: (px, py) => ctx.setValue('hD', Math.max(100, (yg - py) / k), { round: 50 }), onKey: (dx, dy) => ctx.setValue('hD', v.hD * (1 + 0.03 * dy)) });
    if (v.reef) { const q = hist.find((p) => !p.reefed) || hist[hist.length - 1];
      ctx.handle('disreef', X(q.x), Y(q.h), { field: 'hR', title: 'Drag up or down to change the disreef height',
        onDrag: (px, py) => ctx.setValue('hR', Math.max(0, Math.min(v.hD * 0.99, (yg - py) / k)), { round: 10 }), onKey: (dx, dy) => ctx.setValue('hR', Math.max(0, v.hR + 50 * dy)) }); }
    ctx.handle('field', X(v.Rf), yg - 26, { field: 'Rf', title: 'Drag sideways to change the recovery-area radius',
      onDrag: (px) => ctx.setValue('Rf', Math.max(10, (px - bx0) / k), { round: 10 }), onKey: (dx) => ctx.setValue('Rf', v.Rf * (1 + 0.05 * dx)) });
    if (wl > 2) ctx.handle('wind', 38 + wl, Y(0.55 * v.hD), { field: 'wind', title: 'Drag sideways to change the wind speed',
      onDrag: (px) => ctx.setValue('wind', Math.max(0, (px - 38) / (1.4 * (us.plain === 'm/s' ? 3.2 : 1)) / us.v(1)), { round: 0.5 }), onKey: (dx) => ctx.setValue('wind', Math.max(0, v.wind + dx)) });
  },
  symbols: {
    M: 'total mass under the parachute, $m_1+m_2$ (kg or slug)', m_1: 'nose mass (kg or slug)', m_2: 'aft body mass, with the parachute (kg or slug)', g: 'acceleration of gravity, 9.81 m/s² (32.2 ft/s²)',
    C_D: 'drag coefficient of the open parachute (no unit)', 'C_{DR}': 'drag coefficient of the reefed parachute (no unit)', '\\rho': 'air density (kg/m³ or slug/ft³)', '\\rho_G': 'air density at the ground', '\\rho_0': 'air density at sea level', '\\rho_D': 'air density at the opening height',
    S: 'parachute area laid flat, $\\pi D_0^2/4$ (m² or ft²)', D_0: 'parachute flat diameter (m or ft)', D_R: 'diameter of the reefing-cord circle (m or ft)', D: 'drag force (N or lbf)',
    V: 'steady descent speed, how fast it falls (m/s or ft/s)', V_0: 'descent speed it would have at sea level', V_I: 'nose landing speed', V_D: 'flight speed when the parachute opens', 'V_{aft}': 'aft body landing speed', 'V_{aft,\\min}': 'slowest possible aft landing speed (endless tether)', 'V_{DR}': 'descent speed at disreef',
    '\\tau': 'temperature ratio at a height, $1+\\alpha h/T_0$ (no unit)', '\\tau_D': '$\\tau$ at the opening height', '\\tau_G': '$\\tau$ at the ground', e: 'exponent in the time formula, $m/2+1$', m: 'how fast density falls with height (exponent, about 4.26)',
    '\\alpha': 'how fast the air cools with height (lapse rate, K/m or °R/ft)', T_0: 'sea-level air temperature (K or °R)', R: 'gas constant of air', h: 'height', t: 'descent time (s)', t_R: 'time spent reefed (s)', t_O: 'time with the canopy fully open (s)', '\\tau_{DR}': '$\\tau$ at the disreef height', w: 'average wind speed', x_w: 'wind drift, how far it is carried sideways',
    L: 'tether length (m or ft)', q_D: 'dynamic pressure at opening, $\\tfrac12\\rho V^2$ (Pa or lbf/ft²)', C_S: 'reefing-cord strength coefficient, about 0.02', S_R: 'reefing-cord breaking strength (N or lbf)', E: 'energy of motion at landing (J or ft·lbf)', h_D: 'opening height above ground', 'h_{DR}': 'disreef height above ground',
  },
  constants: [
    { sym: 'g', desc: 'acceleration of gravity', si: [9.80665, '\\mathrm{m\\,s^{-2}}'], us: [32.174, '\\mathrm{ft\\,s^{-2}}'] },
    { sym: '\\alpha', desc: 'temperature lapse rate', si: [-0.0065, '\\mathrm{K\\,m^{-1}}'], us: [-0.003566, '{}^{\\circ}\\mathrm{R\\,ft^{-1}}'] },
    { sym: 'T_0', desc: 'sea-level temperature', si: [288.15, '\\mathrm{K}'], us: [518.67, '{}^{\\circ}\\mathrm{R}'] },
    { sym: 'R', desc: 'gas constant of air', si: [287.05, '\\mathrm{J\\,kg^{-1}\\,K^{-1}}'], us: [1716, '\\mathrm{ft^{2}\\,s^{-2}\\,{}^{\\circ}R^{-1}}'] },
    { sym: '\\rho_0', desc: 'sea-level air density', si: [1.2250, '\\mathrm{kg\\,m^{-3}}'], us: [0.002377, '\\mathrm{slug\\,ft^{-3}}'] },
  ],
  report(v, out, R) {
    const o = out.o, n = R.n, Q = R.Q, m = densityExponent(), e = m / 2 + 1, M = o.m1 + o.m2;
    const T0 = R.us ? ATM.T0 : ATM.T0 / 1.8, al = R.us ? ATM.alpha : ATM.alpha / 1.8 / 0.3048;
    const tD = tau(v.hG + v.hD), tR = tau(v.reef ? v.hG + v.hR : v.hG + v.hD), tG = tau(v.hG);
    const V0r = descentSpeed(M, o.CdSR, 0), V0o = descentSpeed(M, o.CdS, 0), sv = (x) => R.v(x, SPEED);
    const time = (ta, tb, V0) => `\\frac{${n(T0)}\\times(${n(ta)}^{${n(e)}}-${n(tb)}^{${n(e)}})}{(${n(al)})\\times${sv(V0)}\\times${n(e)}}`;
    const steps = [
      { label: 'Density exponent of the troposphere, $\\rho=\\rho_0\\tau^m$', lhs: 'm', eq: '-\\frac{g}{\\alpha R}-1', res: n(m) },
      { label: 'Exponent of the descent-time integral', lhs: 'e', eq: '\\frac{m}{2}+1', res: n(e) },
      { label: `Sea-level descent speed ${v.reef ? 'reefed' : 'open'}`, lhs: 'V_0', eq: v.reef ? '\\sqrt{\\frac{2Mg}{C_{DR}\\rho_0S}}' : '\\sqrt{\\frac{2Mg}{C_D\\rho_0S}}', res: Q(o.vSL, SPEED) },
    ];
    if (v.reef) steps.push({ label: 'Reefed drag coefficient (Knacke data)', lhs: 'C_{DR}', eq: 'C_D\\times\\frac{C_{DR}}{C_D}', sub: `${n(v.CD)}\\times${n(o.k)}`, res: n(v.CD * o.k) },
      { label: 'Time reefed, from opening to disreef', lhs: 't_R', eq: '\\frac{T_0\\left(\\tau_D^{\\,e}-\\tau_{DR}^{\\,e}\\right)}{\\alpha V_0e}', sub: time(tD, tR, V0r), res: `${n(o.tReefed)}\\,\\mathrm{s}` });
    steps.push({ label: v.reef ? 'Time fully open, from disreef to the ground' : 'Descent time, from opening to the ground', lhs: 't_O', eq: '\\frac{T_0\\left(\\tau_{DR}^{\\,e}-\\tau_G^{\\,e}\\right)}{\\alpha V_0e}', sub: time(tR, tG, V0o), res: `${n(o.tOpen)}\\,\\mathrm{s}` },
      { label: 'Total descent time and wind drift', lhs: 't', eq: 't_R+t_O', sub: `${n(o.tReefed)}+${n(o.tOpen)}`, res: `${n(o.t)}\\,\\mathrm{s}` },
      { lhs: 'x_w', eq: 'w\\,t', sub: `${R.v(v.wind, SPEED)}\\times${n(o.t)}`, res: Q(o.drift, DIST) },
      { label: 'Nose landing speed (steady descent at the ground)', lhs: 'V_I', eq: '\\sqrt{\\frac{2Mg}{C_D\\rho_GS}}', res: Q(o.vNose, SPEED) },
      { label: 'Aft body landing speed after slowing over the tether', lhs: 'V_{aft}', eq: '\\sqrt{\\frac{2m_2g}{C_D\\rho_GS}+\\frac{2m_1g}{C_D\\rho_GS}e^{-C_D\\rho_GSL/m_2}}', res: Q(o.vAft, SPEED) });
    if (v.reef) steps.push({ label: 'Reefing cord strength', lhs: 'S_R', eq: 'q_D\\frac{\\pi}{4}D_0^2C_S', res: Q(o.reefLine, FORCE) });
    return [{
      title: 'Theory',
      text: 'In steady descent the drag balances the weight, $Mg=\\tfrac12C_D\\rho SV^2$. In the troposphere $\\rho=\\rho_0\\tau^m$ with $\\tau=1+\\alpha h/T_0$, so $V=V_0\\tau^{-m/2}$ and $dt=dh/V$ integrates in closed form. A reefed canopy has a smaller drag coefficient (Knacke). When the nose lands, the aft body decelerates over the tether length under $m_2\\,dV/dt=m_2g-\\tfrac12C_D\\rho SV^2$ (Hoult).',
      steps,
    }];
  },
  references: ['dpparachuterev2', 'parachute-reefing'],
  examples: [
    { name: 'Hoult’s second stage from 25 000 ft, reefed to 0.25', values: { W1: 10, W2: 8.5, L: 33, D0: 5.18, CD: 0.8, reef: true, ratio: 0.25, hR: 1000, hD: 25000, hG: 4300, VD: 100, wind: 20, vT: 25, Rf: 10000 } },
    { name: 'Same, not reefed (drifts out)', values: { W1: 10, W2: 8.5, L: 33, D0: 5.18, CD: 0.8, reef: false, ratio: 0.25, hR: 1000, hD: 25000, hG: 4300, VD: 100, wind: 20, vT: 25, Rf: 10000 } },
    { name: 'Light rocket, 2 ft parachute, windy', values: { W1: 11.9, W2: 2.1, L: 60, D0: 2, CD: 0.82, reef: false, ratio: 0.3, hR: 500, hD: 21600, hG: 3400, VD: 80, wind: 30, vT: 25, Rf: 15000 } },
    { name: 'Club launch: 1500 ft, 36 in parachute', values: { W1: 1.2, W2: 1.0, L: 10, D0: 3, CD: 0.8, reef: false, ratio: 0.3, hR: 300, hD: 1500, hG: 300, VD: 40, wind: 15, vT: 20, Rf: 1500 } },
  ],
};
