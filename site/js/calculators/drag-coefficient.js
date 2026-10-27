// Zero-Lift Drag Coefficient — UI definition.
import { drag, cfTurb } from '../calc/drag.js';
import { atmosphere } from '../calc/geophysics.js';
import { s, fmt, InputError } from '../util.js';
import { dim, path, text, finEndView } from '../ui/svg.js';
import { niceTicks } from '../ui/chart.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const LEN = { dim: 'length', internal: 'in' };
const FT = { dim: 'distance', internal: 'ft' };
const ALT = { dim: 'altitude', internal: 'ft' };
const FORCE = { dim: 'force', internal: 'lbf' };
const PRES = { dim: 'pressure', internal: 'psf' };
const NONE = { dim: 'none' };

// the drag sources in build-up order (bottom of the stack first); one colour family per kind: friction reds,
// base ink/slate, pressure greys/dark red; the lugs and the entered wave drag are hatched to tell them apart
const PARTS = [
  { key: 'CDfBody', name: 'Body skin friction', short: 'body friction', color: 'var(--series-1)', field: 'ReTbody trip useTrip bodyLength noseLength bodyRadius' },
  { key: 'CDfFin', name: 'Fin skin friction', short: 'fin friction', color: 'var(--series-6)', field: 'cR cT b N ReTfin' },
  { key: 'CDbOff', name: 'Body base', short: 'body base', color: 'var(--series-2)', field: 'bodyRadius nozzleD' },
  { key: 'CDbFin', name: 'Fin trailing-edge base', short: 'fin base', color: 'var(--series-5)', field: 'bluntTE wedge t b' },
  { key: 'CDle', name: 'Fin leading edges', short: 'fin edges', color: 'var(--series-3)', field: 'bluntLE t b' },
  { key: 'CDflat', name: 'Flat nose face', short: 'flat face', color: 'var(--series-4)', field: 'flatNose flatD' },
  { key: 'CDlugs', name: 'Launch lugs', short: 'lugs', color: 'var(--series-3)', hatch: true, field: 'nLugs lugArea' },
  { key: 'wave', name: 'Wave drag (entered)', short: 'wave', color: 'var(--text-3)', hatch: true, field: 'noseWave finWave' },
];
const partValue = (p, r, v) => (p.key === 'wave' ? v.noseWave + v.finWave : r[p.key]);
const DASH = ['', '7 4', '2 3', '9 3 2 3'];

/** Air temperature (°R) and pressure (lb/ft²) at the flight condition: standard day at an altitude, or entered. */
function air(v) {
  if (v.air !== 'alt') return { T: v.T, p: v.p };
  const a = atmosphere({ h: v.h, ho: 0, To: 518.67, phi: 45 });
  return { T: a.T, p: a.p };
}
/** The model for page values v (optionally at another Mach number). */
const model = (v, over = {}, compat = false) => drag({ ...v, ...air(v), trip: v.useTrip ? v.trip : 1e9, ...over }, { compat });
const alt = (v) => v.air === 'alt';

/** SVG hatch pattern (one per colour) for the parts drawn hatched; returns the fill to use. */
function fillOf(g, p, id) {
  if (!p.hatch) return p.color;
  const pid = `${id}-h${p.key}`;
  if (!g.querySelector(`#${pid}`)) g.append(s('defs', {}, s('pattern', { id: pid, width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
    s('rect', { width: 5, height: 5, fill: p.color, 'fill-opacity': 0.35 }), s('line', { x1: 0, y1: 0, x2: 0, y2: 5, stroke: p.color, 'stroke-width': 2.4 }))));
  return `url(#${pid})`;
}

export default {
  slug: 'drag-coefficient',
  topic: 'drag-coefficient',
  title: 'Zero-Lift Drag Coefficient',
  subtitle: 'A <b>drag build-up</b> for a single-stage rocket: how much each part — skin friction, the base, fin edges, a flat nose and the launch lugs — adds to the drag coefficient, coasting and with the motor burning.',
  tiers: true,
  intro: {
    what: 'Adds up each source of drag on your rocket at one flight condition, shows where on the rocket each acts, and how the build-up changes with Mach number.',
    why: 'The drag coefficient is the biggest aerodynamic driver of apogee for small rockets — and skin friction, which a smooth finish and a long laminar run reduce, is usually the largest part.',
    when: 'Feeding a trajectory simulation, comparing nose or fin choices, or checking what rounded fin edges, a pointed nose or fewer lugs buy you.',
  },
  info: {
    text: [
      'Four physical sources make up zero-lift drag: <b>skin friction</b> (air rubbing along the surface), <b>wave drag</b> (shock waves, above Mach 1), <b>base drag</b> (low pressure behind blunt ends) and <b>parasite drag</b> (lugs, joints, roughness).',
      'Each part is worked out on its own and divided by the same reference area, the body cross-section, so the parts simply add up. The drawing shows where each acts; the bars and the plot show how big each is.',
      'There is no pass or fail here: a lower drag coefficient flies higher. Use the numbers in a trajectory simulation, and the build-up to see which change would help most.',
    ],
    tex: 'C_D=C_{D_f}+C_{D_{base}}+C_{D_{press}}+C_{D_{lugs}}\\quad\\text{(all on }S_{ref}=\\pi d^2/4)',
    steps: [
      'Describe the body, the fins, the motor nozzle and the launch lugs.',
      'Say whether the surface has a boundary-layer trip, and where.',
      'Enter the flight Mach number and the altitude (or the air temperature and pressure from a trajectory).',
      'Read the coasting and motor-burning drag coefficients, the drag force, and which part is largest; the plot shows the build-up across Mach number.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'body', title: 'Body',
      fields: [
        { id: 'ogive', shared: { key: 'noseType', get: (v) => (v.ogive ? 'ogive' : 'cone'), set: (v, s) => { if (s === 'ogive' || s === 'cone') v.ogive = s === 'ogive'; } }, label: 'Nose shape', kind: 'select', default: true, options: [{ value: true, label: 'Tangent ogive' }, { value: false, label: 'Cone' }],
          info: { text: ['The shape of the nose cone seen from the side: a tangent ogive (curved, blending smoothly into the body) or a straight-sided cone.', 'Pick the one closest to your nose. Other shapes: use the nearest of the two.', 'It only changes the nose’s wetted (outside) area, so the effect on drag is small — a few per cent of the body friction.'], tex: 'S_{wet}=S_{nose}+2\\pi R(L-L_n)', doc: 'skin-friction' } },
        { id: 'noseLength', shared: 'noseL', label: 'Nose length', sym: 'L_n', ...LEN, default: 36, min: 0, minExclusive: true, max: 200, slider: { min: 1, max: 60, step: 0.1 },
          info: { text: ['Length of the nose cone from its tip to the shoulder where it meets the body tube.', 'Measure it along the rocket’s axis, not along the curved surface.', 'A longer nose has a little more wetted area (more friction) — and below Mach 1 that is about all it changes here. Drag the shoulder in the drawing to change it.'], range: 'Usually 3–6 body diameters.', doc: 'skin-friction', tex: 'C_{D_f}=C_f\\,\\frac{S_{wet}}{S_{ref}}' } },
        { id: 'bodyRadius', shared: 'bodyR', label: 'Body radius', sym: 'R', ...LEN, default: 3.07, min: 0.1, max: 30, slider: { min: 0.25, max: 8, step: 0.01 },
          info: { text: ['Half the outside diameter of the body tube.', 'Measure the outside diameter with calipers and halve it.', 'It sets the reference area πd²/4 that every coefficient is divided by. A fatter rocket of the same length has relatively less skin per cross-section, so its friction coefficient is lower — but the drag force grows with the area.'], tex: 'S_{ref}=\\pi R^2', range: 'Model rockets 10–35 mm (0.4–1.3 in); high-power 50–80 mm (2–3 in).', doc: 'overview' } },
        { id: 'bodyLength', shared: 'length', label: 'Overall length', sym: 'L', ...LEN, default: 148, min: 1, max: 1200, slider: { min: 30, max: 300, step: 0.5 },
          info: { text: ['Length from the nose tip to the base, the flat back end of the body.', 'Measure the assembled rocket. The body is a straight cylinder from the nose shoulder to the base (no boat-tail).', 'Longer means more skin and more friction drag; the base drag falls a little because the thicker boundary layer shelters the base. Drag the base in the drawing to change it.'], range: 'Usually 10–25 body diameters.', doc: 'skin-friction', tex: 'C_{D_f}=C_f\\,\\frac{S_{wet}}{S_{ref}}' } },
        { id: 'flatNose', label: 'Flat-faced nose tip', kind: 'bool', default: true,
          info: { text: ['Is the nose tip cut off flat (for a pitot probe, a camera or a blunt cap) rather than pointed?', 'Look at the very tip of your nose cone.', 'A flat face stops the air head-on and feels nearly the full stagnation pressure, so even a small face adds noticeable drag.'], doc: 'flat-face' } },
        { id: 'flatD', label: 'Flat face diameter', sym: 'd_f', ...LEN, default: 1.5, min: 0, max: 60, slider: { min: 0, max: 6, step: 0.05 }, when: (v) => v.flatNose,
          info: { text: ['Diameter of the flat face at the nose tip.', 'Measure across the flat.', 'Its drag grows with its area: doubling the diameter makes it four times larger. Drag the top edge of the face in the drawing to change it.'], tex: 'C_{D,flat}=0.85\\left(1+\\tfrac14(M^2+M^4)\\right)\\frac{\\pi d_f^2/4}{S_{ref}}', range: 'Pitot or camera tips 10–40 mm (0.4–1.5 in).', doc: 'flat-face' } },
      ],
    },
    {
      id: 'fins', title: 'Fins',
      fields: [
        { id: 'N', backView: (v) => ({ R: v.bodyRadius, span: v.b, t: v.t, unit: LEN, range: [1, 12], note: 'Fin skin friction, trailing-edge base drag and leading-edge drag all grow in proportion to N.' }), shared: 'finN', label: 'Number of fins', sym: 'N', dim: 'none', default: 4, min: 1, max: 12, slider: { min: 1, max: 8, step: 1 },
          info: { text: ['How many fin panels the rocket has.', 'Count them.', 'Every fin drag part — friction, edges and trailing-edge base — is proportional to it: four fins have a third more fin drag than three.'], range: 'Three or four.', doc: 'skin-friction', tex: 'C_{D_f,fins}=N\\,C_{f,fin}\\,\\frac{2S_{fin}}{S_{ref}}' } },
        { id: 'cR', shared: 'finCr', label: 'Root chord', sym: 'c_R', ...LEN, default: 11.8, min: 0.1, max: 200, slider: { min: 0.5, max: 30, step: 0.05 },
          info: { text: ['Length of the fin where it joins the body.', 'Measure along the body from the fin’s leading edge to its trailing edge.', 'Bigger fins have more skin (more friction) and, if the leading edge is swept further back, slightly less edge drag. Drag the root of the top fin in the drawing to change it.'], tex: 'S_{fin}=\\tfrac12(c_R+c_T)\\,b', doc: 'skin-friction', range: '2–6 in (5–15 cm) for model and high-power rockets.' } },
        { id: 'cT', shared: 'finCt', label: 'Tip chord', sym: 'c_T', ...LEN, default: 4.5, min: 0, max: 200, slider: { min: 0, max: 20, step: 0.05 },
          info: { text: ['Length of the fin at its outer tip (0 for a pointed, triangular fin).', 'Measure along the tip, parallel to the body.', 'It adds fin area (friction) and sets the leading-edge sweep: the trailing edge is taken straight across, so a shorter tip chord means a less swept leading edge.'], tex: '\\Lambda=\\arctan\\frac{c_R-c_T}{b}', doc: 'skin-friction', range: '0 to the root chord; about a third of it is common.' } },
        { id: 'b', shared: 'finSpan', label: 'Exposed semispan', sym: 'b', ...LEN, default: 5.84, min: 0, minExclusive: true, max: 100, slider: { min: 0.25, max: 20, step: 0.05 },
          info: { text: ['How far one fin sticks out from the body surface to its tip.', 'Measure from the body tube to the tip, square to the body.', 'Area, edge length and trailing-edge length all grow with it, so every fin drag part grows almost in proportion. Drag the tip of the top fin in the drawing to change it.'], range: 'About 1–2 body diameters.', doc: 'skin-friction', tex: 'S_{fin}=\\frac{(c_R+c_T)\\,b}{2}' } },
        { id: 't', shared: 'finT', label: 'Fin thickness', sym: 't', ...LEN, default: 0.125, min: 0, max: 4, slider: { min: 0.01, max: 0.5, step: 0.005 },
          info: { text: ['Thickness of the fin plate.', 'Measure with calipers.', 'Thickness sets the blunt edge areas: leading-edge and trailing-edge base drag both grow in proportion to it. Friction does not change.'], tex: 'C_{DB,fins}=\\frac{0.135\\,N\\,t\\,b}{S_{ref}\\,C_{f,fin}^{1/3}}', range: 'Model rockets 1.5–3 mm (1/16–1/8 in); high-power 3–6 mm (1/8–1/4 in).', doc: 'fin-pressure' } },
        { id: 'bluntLE', label: 'Rounded (blunt) leading edge', kind: 'bool', default: true,
          info: { text: ['Is the front edge of the fins rounded (a half-cylinder) rather than sharpened to a bevel?', 'A sanded round edge counts as blunt; a knife-edge bevel as sharp.', 'A rounded edge carries stagnation-pressure drag above Mach 1, and below Mach 1 too if the trailing edge is also square. A sharp edge has none here (its slender-wedge wave drag is not modelled).'], tex: 'C_{D,LE}=\\frac{2N\\,t\\,b\\,C_{PT}(M\\cos\\Lambda)\\cos^2\\Lambda}{3S_{ref}}', doc: 'fin-pressure' } },
        { id: 'bluntTE', label: 'Square (blunt) trailing edge', kind: 'bool', default: true,
          info: { text: ['Is the back edge of the fins cut square rather than bevelled to a point?', 'Look at the fin’s back edge.', 'A square edge leaves a thin low-pressure wake: trailing-edge base drag. Bevelling it removes that, unless the fin is a wedge (which always has a base).'], doc: 'fin-pressure' } },
        { id: 'wedge', label: 'Wedge half-angle', sym: '\\delta_w', dim: 'angle', default: 0, min: 0, max: 20, slider: { min: 0, max: 15, step: 0.5 },
          info: { text: ['For a single-wedge fin (thin at the front, thick at the back): the half-angle of the wedge, measured square to the leading edge. Zero for a flat plate.', 'From your fin drawing.', 'A wedge has a thick square back edge, so its trailing-edge base drag grows with the angle.'], range: '0 for flat plates; 2–6° for wedge fins.', doc: 'fin-pressure', tex: 'C_{DB,fins}\\propto 2c\\tan\\delta_w' } },
      ],
    },
    {
      id: 'base', title: 'Motor nozzle and launch lugs',
      fields: [
        { id: 'nozzleD', label: 'Nozzle exit diameter', sym: 'd_{ex}', ...LEN, default: 0.4, min: 0, max: 60, slider: { min: 0, max: 6, step: 0.05 },
          info: { text: ['Diameter of the motor nozzle’s exit, at the base.', 'Measure the nozzle mouth, or read it from the motor’s data.', 'While the motor burns, the jet fills the exit and only the ring around it feels base pressure — but the jet also pumps air out of the base, so the memo takes 1.5 × the coasting base pressure on that ring. A larger exit lowers the burning base drag.'], tex: 'C_{D_B,on}=1.5\\,C_{D_B}\\left(1-\\frac{S_{ex}}{S_{ref}}\\right)', doc: 'base-drag', range: 'The motor nozzle exit: 15–75 mm (0.6–3 in).' } },
        { id: 'nLugs', label: 'Number of lugs', sym: 'n_{lug}', dim: 'none', default: 2, min: 0, max: 6, slider: { min: 0, max: 4, step: 1 },
          info: { text: ['How many launch lugs or rail buttons ride on the rocket.', 'Count them (0 for a tower launch).', 'Each adds the same drag, so two lugs have twice the drag of one.'], range: 'Two for a rail; 0 for a tower.', doc: 'lugs', tex: 'C_{D,lugs}=n_{lug}\\,C_{D,flat}\\frac{2Rh}{S_{ref}}' } },
        { id: 'lugArea', label: 'Lug frontal area (each)', sym: '2Rh', dim: 'area', internal: 'in2', default: 0.36, min: 0, max: 20, slider: { min: 0, max: 2, step: 0.01 }, when: (v) => v.nLugs > 0,
          info: { text: ['The area one lug shows to the oncoming air: its width times how far it stands off the body.', 'For a rail button, the diameter times the height above the tube.', 'Lug drag is proportional to it. Hoerner’s tests give a drag coefficient of about 0.8 on this area at low speed.'], tex: 'C_{D,lugs}=n_{lug}\\,\\frac{0.8\\,(2Rh)\\,C_{PT}}{S_{ref}}', range: 'Rail buttons 0.2–0.5 in² (1.5–3 cm²).', doc: 'lugs' } },
      ],
    },
    {
      id: 'surface', title: 'Surface finish (boundary layer)',
      fields: [
        { id: 'useTrip', label: 'Boundary-layer trip', kind: 'bool', default: true,
          info: { text: ['A trip is a band of roughness (a strip of sandpaper, a joint, a step) that makes the smooth (laminar) layer of air on the skin turn turbulent there.', 'Tick it if your rocket has one, or a joint or seam rough enough to act as one.', 'Turbulent flow rubs harder, so a trip near the nose raises friction drag — but it makes the drag predictable. The laminar run ends at the trip or naturally, whichever is nearer the tip.'], doc: 'skin-friction' } },
        { id: 'trip', label: 'Trip location (from tip)', sym: 'x_{trip}', ...FT, default: 2.5, min: 0, max: 100, slider: { min: 0, max: 15, step: 0.05 }, when: (v) => v.useTrip,
          info: { text: ['Distance from the nose tip to the trip.', 'Measure along the rocket.', 'Moving it aft lengthens the smooth, low-friction run — until natural transition comes first. Drag the trip mark in the drawing to move it.'], tex: 'l_T=\\min\\left(\\frac{Re_T}{(\\rho a/\\mu)M},\\ x_{trip}\\right)', doc: 'skin-friction', range: 'Usually at the nose shoulder, or 0 for an already rough surface.' } },
        { id: 'ReTbody', label: 'Body transition Reynolds number', sym: 'Re_T', dim: 'none', default: 200000, min: 1000, max: 1e7, slider: { min: 50000, max: 2000000, step: 10000 },
          info: { text: ['Sets where the air on the body turns turbulent by itself: at the distance where the Reynolds number (speed × distance ÷ the air’s viscosity) reaches this value.', 'Hoult takes about 400 000 for smooth bodies of revolution; a rough or dusty finish transitions earlier (lower value). The memo’s example uses 200 000.', 'Higher means a longer laminar run and less friction drag.'], tex: 'l_T=\\frac{\\mu\\,Re_T}{\\rho U}', range: '200 000–400 000 for a smooth painted body.', doc: 'skin-friction' } },
        { id: 'ReTfin', label: 'Fin transition Reynolds number', sym: 'Re_{T,fin}', dim: 'none', default: 25000, min: 1000, max: 1e7, slider: { min: 5000, max: 500000, step: 1000 },
          info: { text: ['The same for the fins.', 'Fins whose leading edges are not smoothly rounded turn turbulent almost at once: Hoult takes about 25 000.', 'A higher value (well-rounded edges) gives a longer laminar run on each fin and less fin friction.'], range: '25 000 for ordinary fins.', doc: 'skin-friction', tex: 'l_T=\\frac{Re_{T,fin}}{\\rho U/\\mu}' } },
      ],
    },
    {
      id: 'flight', title: 'Flight condition',
      fields: [
        { id: 'M', label: 'Mach number', sym: 'M', dim: 'none', default: 0.9, min: 0.01, max: 3.2, slider: { min: 0.05, max: 3, step: 0.01 },
          info: { text: ['Flight speed divided by the speed of sound (about 340 m/s, 1100 ft/s, at sea level).', 'From your trajectory simulation, at the moment you are interested in (often the fastest point).', 'Friction coefficients fall slowly with speed; base and edge drag jump up through Mach 1. Above Mach 1 enter the wave drag from the supersonic tools.'], range: 'Model rockets 0.2–0.6; high-power 0.6–2; research rockets up to 3.', doc: 'overview', tex: 'M=\\frac{U}{a}' } },
        { id: 'air', label: 'Air', kind: 'select', default: 'tp', options: [{ value: 'alt', label: 'Standard day at an altitude' }, { value: 'tp', label: 'My own temperature and pressure' }],
          info: { text: ['Where the air temperature and pressure come from: a standard day at the altitude you enter, or values you type (from a trajectory, a weather report or flight data).', 'The Atmosphere & Gravity page gives them for your site.', 'The air sets the Reynolds number: thinner air (higher up) means a longer laminar run and higher friction coefficients.'], doc: 'skin-friction' } },
        { id: 'h', label: 'Altitude (above sea level)', sym: 'h', ...ALT, default: 0, min: 0, max: 100000, slider: { min: 0, max: 60000, step: 100 }, when: alt,
          info: { text: ['Height above sea level at the flight condition.', 'From your trajectory simulation.', 'Higher up the air is thinner: the Reynolds number falls, so the friction coefficient rises a little, while the drag force falls with the air pressure.'], range: '0–3 km for model rockets; up to 20 km (65 000 ft) for research rockets.', doc: 'skin-friction' } },
        { id: 'T', label: 'Air temperature', sym: 'T', dim: 'temperature', internal: 'R', units: { si: 'K', us: 'R' }, default: 499.17, min: 300, max: 700, slider: { min: 390, max: 560, step: 0.5 }, when: (v) => !alt(v),
          info: { text: ['Absolute temperature of the outside air at the flight condition.', 'From a trajectory or weather data (K = °C + 273.15; °R = °F + 459.67).', 'Warmer air is more viscous and less dense: a lower Reynolds number and slightly more friction.'], range: '216–310 K (390–560 °R).', doc: 'skin-friction' } },
        { id: 'p', label: 'Air pressure', sym: 'p_\\infty', ...PRES, default: 2124, min: 10, max: 2500, slider: { min: 50, max: 2200, step: 1 }, when: (v) => !alt(v),
          info: { text: ['Static pressure of the outside air at the flight condition.', 'From a trajectory or weather data (101.3 kPa, 2116 lbf/ft², at sea level).', 'With the temperature it sets the Reynolds number per metre: lower pressure, longer laminar run. It also sets the drag force.'], tex: '\\frac{\\rho a}{\\mu}=K_{Re}\\,p_\\infty T^{-1.26}', range: 'Sea level 101 kPa (2116 lbf/ft²); 10 km about 26 kPa (550 lbf/ft²).', doc: 'skin-friction' } },
      ],
    },
    {
      id: 'model', title: 'Model settings (advanced)',
      fields: [
        { id: 'noseWave', label: 'Nose wave drag $C_D$ (entered)', sym: 'C_{D,wave,nose}', dim: 'none', default: 0, min: 0, max: 2, slider: { min: 0, max: 1, step: 0.005 },
          info: { text: ['Above Mach 1 the nose makes a shock wave and wave drag. This page does not compute it.', 'Take it from a supersonic tool (the second-order shock-expansion method of NACA Report 1328, as in the Nose Cone Design calculator). Leave 0 below Mach 1.', 'It is added straight to the total.'], range: '0 below Mach 1; roughly 0.05–0.3 for slender ogives at Mach 1.5–3.', doc: 'wave-drag', tex: 'C_{D,on}=C_{D_f}+C_{D_B}+\\dots+C_{D,wave,nose}' } },
        { id: 'finWave', label: 'Fin wave drag $C_D$ (entered)', sym: 'C_{D,wave,fin}', dim: 'none', default: 0, min: 0, max: 1, slider: { min: 0, max: 0.5, step: 0.005 },
          info: { text: ['Supersonic wave drag of slender fin sections, which the leading-edge model here does not include.', 'Take it from a supersonic fin tool (for example the Single-Wedge Fins calculator). Leave 0 below Mach 1.', 'It is added straight to the total.'], range: '0 below Mach 1.', doc: 'wave-drag', tex: 'C_{D,on}=\\dots+C_{D,wave,fin}' } },
        { id: 'parasite', label: 'Parasite allowance', sym: 'k_{par}', dim: 'percent', internal: 'pct', default: 5, min: 0, max: 50, slider: { min: 0, max: 20, step: 0.5 },
          info: { text: ['An extra percentage for everything too small to work out: joints, steps, screw heads, paint roughness, antennas.', 'Hoult: about 5 % is customary.', 'It multiplies the total; the drag force uses the total with it.'], tex: 'C_{D,par}=C_D\\,(1+k_{par})', range: '5 % for a clean rocket; 10–15 % with exposed hardware.', doc: 'parasite' } },
      ],
    },
  ],
  results: [
    { id: 'CDoff', label: '$C_D$ coasting (motor off)', sym: 'C_{D,off}', dim: 'none', key: true, digits: 4, note: (x, o) => `${fmt(o.v.parasite, { digits: 3 })} % parasite: ${fmt(o.r.CDoffPar, { digits: 4 })}`,
      info: { text: ['The total drag coefficient while the rocket coasts with the motor off: every part added up, with the full base drag.', 'Use it after burnout in a trajectory simulation. The note gives it with the parasite allowance, which is the value to use.', 'Lower is better: drag force is this number times the dynamic pressure and the reference area.'], tex: 'C_{D,off}=C_{D_f}+C_{D_B}+C_{DB,fins}+C_{D,LE}+C_{D,flat}+C_{D,lugs}+C_{D,wave}', range: 'Typical rockets 0.3–0.6 below Mach 1.', doc: 'totals' } },
    { id: 'CDon', label: '$C_D$ motor burning', sym: 'C_{D,on}', dim: 'none', key: true, digits: 4, note: (x, o) => `${x >= o.r.CDoff ? '+' : '−'}${fmt(Math.abs((100 * (x - o.r.CDoff)) / o.r.CDoff), { digits: 2 })} % vs coasting`,
      info: { text: ['The total while the motor burns. Only the body base drag changes: the jet fills the nozzle exit, but it also pumps air out of the base region.', 'The memo, after Hoerner, takes 1.5 × the coasting base pressure on the ring around the nozzle. With a small nozzle the burning drag is therefore higher than coasting.', 'A larger nozzle exit lowers it.'], tex: 'C_{D,on}=C_{D,off}-C_{D_B}+C_{D_B,on}', doc: 'base-drag' } },
    { id: 'Dforce', label: 'Drag force (coasting, with parasite)', sym: 'D', ...FORCE, key: true, digits: 4, note: (x, o) => `at Mach ${fmt(o.v.M, { digits: 3 })}, q = ${fmt(toDisplay(o.results.q, PRES), { digits: 3 })} ${unitLabel(displayUnit(PRES))}`,
      info: { text: ['The force the air pushes back on the rocket at this flight condition, coasting, including the parasite allowance.', 'The dynamic pressure q grows with the air pressure and the square of the Mach number.', 'Double the Mach number and the force roughly quadruples; fly higher and it falls with the pressure.'], tex: 'D=q\\,S_{ref}\\,C_{D,off}(1+k_{par}),\\quad q=\\tfrac12\\gamma p_\\infty M^2', doc: 'totals' } },
    { id: 'top', label: 'Largest single source', sym: 'C_{D,max}', dim: 'none', key: true, digits: 3, note: (x, o) => `${o.top.name}, ${fmt((100 * x) / o.r.CDoff, { digits: 3 })} % of coasting`,
      info: { text: ['The biggest single part of the coasting drag, and its share.', 'For most subsonic rockets it is the body skin friction; with a flat nose, square fins or supersonic flight, pressure or base drag can take over.', 'Start there when you want less drag.'], doc: 'totals' } },
    { id: 'CDf', label: 'Skin friction (body + fins)', sym: 'C_{D_f}', dim: 'none', digits: 4, info: { text: ['Drag of the air rubbing along all the wetted surfaces.'], tex: 'C_{D_f}=C_f\\,\\frac{S_{wet}}{S_{ref}}(1-0.09M^2)', doc: 'skin-friction' } },
    { id: 'CDfBody', label: 'Body skin friction', sym: 'C_{D_f,body}', dim: 'none', digits: 4, info: { text: ['Body friction coefficient times the body wetted area over the reference area.'], tex: 'C_{D_f,body}=C_f\\,\\frac{S_{wet}}{S_{ref}}\\,(1-0.09M^2)', doc: 'skin-friction' } },
    { id: 'CDfFin', label: 'Fin skin friction', sym: 'C_{D_f,fins}', dim: 'none', digits: 4, info: { text: ['Both sides of every fin panel.'], tex: 'C_{D_f,fins}=C_{f,fin}\\frac{2NS_{fin}}{S_{ref}}(1-0.09M^2)', doc: 'skin-friction' } },
    { id: 'CDbOff', label: 'Body base drag (coasting)', sym: 'C_{D_B}', dim: 'none', digits: 4, info: { text: ['Hoerner’s subsonic base pressure, a transonic increment of 0.055, and 65 % of vacuum above the limiting Mach number.'], tex: 'C_{PB}=\\frac{0.029}{\\sqrt{C_fS_{wet}/S_{base}}}', doc: 'base-drag' } },
    { id: 'CDbOn', label: 'Body base drag (motor burning)', sym: 'C_{D_B,on}', dim: 'none', digits: 4, info: { text: ['Base drag on the ring outside the nozzle exit, 1.5 × the coasting base pressure.'], tex: 'C_{D_B,on}=1.5\\,C_{D_B}\\left(1-\\frac{S_{ex}}{S_{ref}}\\right)', doc: 'base-drag' } },
    { id: 'CDbFin', label: 'Fin trailing-edge base drag', sym: 'C_{DB,fins}', dim: 'none', digits: 4, info: { text: ['Square fin trailing edges (and wedge bases).'], tex: 'C_{DB,fins}=\\frac{0.135\\,N\\,t\\,b}{S_{ref}\\,C_{f,fin}^{1/3}}', doc: 'fin-pressure' } },
    { id: 'CDle', label: 'Fin leading-edge pressure drag', sym: 'C_{D,LE}', dim: 'none', digits: 4, info: { text: ['Newtonian drag of rounded leading edges.'], tex: 'C_{D,LE}=\\frac{2N t b\\,C_{PT}(M\\cos\\Lambda)\\cos^2\\Lambda}{3S_{ref}}', doc: 'fin-pressure' } },
    { id: 'CDflat', label: 'Flat nose face drag', sym: 'C_{D,flat}', dim: 'none', digits: 4, info: { text: ['Stagnation pressure on the flat nose face.'], tex: 'C_{D,flat}=0.85\\left(1+\\tfrac14(M^2+M^4)\\right)\\frac{\\pi d_f^2/4}{S_{ref}}\\ (M<1)', doc: 'flat-face' } },
    { id: 'CDlugs', label: 'Launch-lug drag', sym: 'C_{D,lugs}', dim: 'none', digits: 4, info: { text: ['Newtonian cylinder drag area 0.8·(2Rh)·$C_{PT}$ per lug.'], tex: 'C_{D,lugs}=n_{lug}\\,\\frac{0.8\\,(2Rh)\\,C_{PT}}{S_{ref}}', doc: 'lugs' } },
    { id: 'CDoffPar', label: '$C_D$ coasting with parasite allowance', sym: 'C_{D,off}(1+k_{par})', dim: 'none', digits: 4, info: { text: ['The coasting total with the parasite allowance: the value to use in a trajectory.'], doc: 'parasite' } },
    { id: 'CDonPar', label: '$C_D$ motor burning with parasite allowance', sym: 'C_{D,on}(1+k_{par})', dim: 'none', digits: 4, info: { text: ['The burning total with the parasite allowance.'], doc: 'parasite' } },
    { id: 'CfBody', label: 'Body friction coefficient', sym: 'C_f', dim: 'none', digits: 4, info: { text: ['Area-weighted mix of laminar (Blasius) and compressible turbulent friction.'], doc: 'skin-friction' } },
    { id: 'CfFin', label: 'Fin friction coefficient', sym: 'C_{f,fin}', dim: 'none', digits: 4, info: { text: ['Average over the fin chord, with transition at the fin transition Reynolds number.'], doc: 'skin-friction' } },
    { id: 'xTr', label: 'Body transition station', sym: 'l_T', ...FT, info: { text: ['Distance from the tip where the body boundary layer becomes turbulent (naturally or at the trip).'], tex: 'l_T=\\frac{\\mu\\,Re_T}{\\rho U}', doc: 'skin-friction' } },
    { id: 'lamFrac', label: 'Laminar share of the body area', dim: 'percent', internal: 'pct', info: { text: ['Share of the body wetted area ahead of transition.'], doc: 'skin-friction' } },
    { id: 'Swet', label: 'Body wetted area', sym: 'S_{wet}', dim: 'area', internal: 'in2', info: { text: ['Nose plus cylinder outside area.'], tex: 'S_{wet}=S_{nose}+2\\pi R(L-L_n)', doc: 'skin-friction' } },
    { id: 'Sref', label: 'Reference area', sym: 'S_{ref}', dim: 'area', internal: 'ft2', units: { si: 'cm2', us: 'ft2' }, info: { text: ['Body cross-section πd²/4 — all coefficients use it.'], doc: 'overview' } },
    { id: 'ReBody', label: 'Body Reynolds number', sym: 'Re_L', dim: 'none', info: { text: ['Based on the overall length.'], tex: 'Re_L=\\frac{\\rho a}{\\mu}\\,M\\,L', doc: 'skin-friction' } },
    { id: 'q', label: 'Dynamic pressure', sym: 'q', ...PRES, digits: 4, info: { text: ['Half the air density times the speed squared — the pressure scale of every aerodynamic force.'], tex: 'q=\\tfrac12\\gamma p_\\infty M^2', doc: 'totals' } },
    { id: 'Tair', label: 'Air temperature used', sym: 'T', dim: 'temperature', internal: 'R', units: { si: 'K', us: 'R' }, digits: 4, info: { text: ['Entered, or from the standard day at the altitude.'], doc: 'skin-friction' } },
    { id: 'pAir', label: 'Air pressure used', sym: 'p_\\infty', ...PRES, digits: 4, info: { text: ['Entered, or from the standard day at the altitude.'], doc: 'skin-friction' } },
    { id: 'Mlim', label: 'Transonic base-drag limit Mach', sym: 'M_{lim}', dim: 'none', digits: 4, info: { text: ['Above this Mach number base drag follows the quasi-vacuum law 1.3/γM².'], tex: 'M_{lim}=\\sqrt{\\frac{1.3}{\\gamma(C_{PB}+\\Delta C_{PB})}}', doc: 'base-drag' } },
  ],
  compute(v, { compat } = {}) {
    // a nose as long as the rocket cannot be built: use the longest that fits (90 % of the length) and say so
    const shortened = v.noseLength >= v.bodyLength;
    if (shortened) v = { ...v, noseLength: 0.9 * v.bodyLength };
    const a = air(v), r = model(v, {}, compat);
    // the turbulent friction law (log₁₀Re − 0.407) needs a real boundary layer: a tiny, slow model in near-vacuum has none
    if (!(r.CDf > 0)) throw new InputError('The Reynolds number is too low for the friction law: the rocket is too small or too slow, or the air too thin.');
    const warnings = [];
    if (shortened) warnings.push({ level: 'warn', text: `The nose is as long as the whole rocket; it is taken as ${fmt(v.noseLength, { digits: 3 })} in (90 % of the length).`, fix: 'Make the overall length longer than the nose.' });
    if (v.M > 1 && v.noseWave === 0) warnings.push({ level: 'info', text: 'Supersonic: the nose and fin <b>wave drag</b> are not computed here.', fix: 'Enter them under Model settings, from the Nose Cone Design and Single-Wedge Fins calculators.' });
    if (v.M > 2.5) warnings.push({ level: 'warn', text: 'The (1 − 0.09M²) friction factor and the base-drag model are increasingly uncertain above Mach ≈ 2.5.', fix: 'Treat the result as a rough estimate.' });
    if (v.flatNose && v.flatD >= 2 * v.bodyRadius) warnings.push({ level: 'warn', text: 'The flat face is as large as the body.', fix: `Use a face diameter below ${fmt(2 * v.bodyRadius, { digits: 3 })} in.` });
    if (v.nozzleD > 2 * v.bodyRadius) warnings.push({ level: 'warn', text: 'The nozzle exit is wider than the body; motor-burning base drag is taken as zero.', fix: 'Check the nozzle diameter.' });
    if (v.cR > v.bodyLength - v.noseLength) warnings.push({ level: 'info', text: 'The fin root chord is longer than the body tube: the fins reach onto the nose.', fix: 'Check the root chord and the lengths.' });
    if (r.ReBody < 1e5) warnings.push({ level: 'warn', text: `The body Reynolds number is only ${Math.round(r.ReBody).toLocaleString('en')} — the friction correlations assume at least about 10⁵.`, fix: 'Check the length, Mach number and air pressure.' });
    const top = PARTS.map((p) => ({ ...p, val: partValue(p, r, v) })).reduce((b, p) => (p.val > b.val ? p : b));
    const q = 0.7 * a.p * v.M * v.M;
    const results = { ...r, lamFrac: 100 * r.lamFrac, q, Tair: a.T, pAir: a.p, Dforce: q * r.Sref * r.CDoffPar, top: top.val };
    return { results, warnings, r, v, a, top };
  },
  plots: [
    {
      id: 'buildup', title: 'The drag build-up across Mach number', wide: true, height: 640,
      info: { text: ['Top: each source of coasting drag stacked on the one below, so the top edge is the total. Middle: the coasting and motor-burning totals. Bottom: each source’s share of the coasting total (hover to read its $C_D$ too).', 'The air temperature and pressure are held at your flight condition; the entered wave drag is left out because it belongs to one Mach number. The steps at Mach 1 are real in the model: the memo warns the build-up is not smooth through the transonic range — fair through it with judgement.', 'Look for which band is widest at your Mach number: that is where reducing drag pays.'], doc: 'totals' },
      build(v, out) {
        const mmax = Math.min(3.2, Math.max(2, v.M * 1.4)), n = 140, Ms = [], R = [];
        for (let i = 0; i <= n; i++) { const M = 0.05 + ((mmax - 0.05) * i) / n; Ms.push(M); R.push(model(v, { M, noseWave: 0, finWave: 0 }, !!v.__compat)); }
        const parts = PARTS.filter((p) => p.key !== 'wave' && R.some((r) => r[p.key] > 1e-9));
        const cum = R.map((r) => { let c = 0; return parts.map((p) => (c += r[p.key])); });
        const ymax = niceTicks(0, Math.max(...cum.map((c) => c.at(-1))) * 1.05, 4).at(-1);
        const id = 'db' + Math.random().toString(36).slice(2, 7);
        const stack = {
          y: { label: 'Coasting $C_D$, stacked' }, yDomain: [0, ymax],
          draw(g, X, Y, box) {
            const yt = niceTicks(0, ymax, 4);
            for (const t of yt) {
              g.append(s('line', { x1: box.left, x2: box.right, y1: Y(t), y2: Y(t), stroke: 'var(--border)', 'stroke-width': 1 }));
              g.append(s('text', { x: box.left - 7, y: Y(t) + 3.5, 'text-anchor': 'end', class: 'tick-label', style: 'fill:var(--text-3);font:11px var(--font-sans)' }, fmt(t, { digits: 3 })));
            }
            parts.forEach((p, j) => {
              const topPts = Ms.map((M, i) => [X(M), Y(cum[i][j])]), botPts = Ms.map((M, i) => [X(M), Y(j ? cum[i][j - 1] : 0)]).reverse();
              g.append(s('path', { d: path([...topPts, ...botPts], true), fill: fillOf(g, p, id), 'fill-opacity': p.hatch ? 1 : 0.78, stroke: 'var(--surface)', 'stroke-width': 0.6 }));
            });
            // name each band where it is thick enough, near the right end (below Mach 1 if the plot is mostly subsonic)
            const iL = Math.round(n * 0.78);
            parts.forEach((p, j) => {
              const y0 = Y(j ? cum[iL][j - 1] : 0), y1 = Y(cum[iL][j]);
              if (y0 - y1 >= 12) g.append(s('text', { x: X(Ms[iL]), y: (y0 + y1) / 2 + 3.5, 'text-anchor': 'middle', class: 'sc-dim-text', style: 'font-size:10px' }, p.short));
            });
            g.append(s('path', { class: 'axis', d: `M${box.left},${box.top}V${box.bot}H${box.right}`, fill: 'none', stroke: 'var(--text-3)' }));
          },
        };
        return {
          x: { label: 'Mach number $M$' }, xDomain: [0, mmax],
          vlines: [{ x: 1, label: '$M=1$', color: 'var(--text-3)' }, { x: v.M, label: 'your Mach', color: 'var(--text)', row: 1 }],
          panels: [
            stack,
            { y: { label: 'Total $C_D$' }, color: 'var(--series-1)', includeZero: true, series: [{ name: 'coasting $C_{D,off}$', points: Ms.map((M, i) => [M, R[i].CDoff]) }, { name: 'motor burning $C_{D,on}$', dash: '7 4', color: 'var(--series-2)', points: Ms.map((M, i) => [M, R[i].CDon]) }] },
            { y: { label: 'Share of coasting', unit: '%' }, includeZero: true, ratio: { label: '$C_D$' },
              series: parts.map((p, j) => ({ name: p.name, color: p.color, dash: DASH[j % 4] || null, points: Ms.map((M, i) => [M, (100 * R[i][p.key]) / R[i].CDoff, R[i][p.key]]) })) },
          ],
        };
      },
    },
    {
      id: 'friction', title: 'Laminar or turbulent: friction against Reynolds number', explore: true,
      info: { text: ['The two friction laws of the memo: laminar (Blasius, solid) and turbulent (dashed, at your Mach number). The dots are your body and fins, which sit between the curves because part of each is laminar and part turbulent.', 'The vertical lines are the transition Reynolds numbers: beyond them the boundary layer turns turbulent.', 'The further a dot sits towards the laminar curve, the more of that surface is laminar.'], doc: 'skin-friction' },
      build(v, out) {
        const r = out.r, lg = Math.log10, x0 = Math.min(4, Math.floor(lg(Math.min(r.ReC, r.ReBody)))), x1 = Math.max(9, Math.ceil(lg(Math.max(r.ReC, r.ReBody))));
        const lam = [], tur = [];
        for (let i = 0; i <= 100; i++) { const e = x0 + ((x1 - x0) * i) / 100, Re = 10 ** e; lam.push([e, 1.328 / Math.sqrt(Re)]); tur.push([e, cfTurb(Re, v.M)]); }
        const ytop = Math.max(0.014, 1.25 * Math.max(r.CfBody, r.CfFin));
        return { x: { label: 'Reynolds number $\\log_{10}Re$' }, y: { label: 'Friction coefficient $C_f$' }, xDomain: [x0, x1], yDomain: [0, ytop],
          series: [{ name: 'laminar (Blasius)', points: lam, color: 'var(--series-1)' }, { name: `turbulent at $M=${fmt(v.M, { digits: 3 })}$`, points: tur, dashed: true, color: 'var(--series-2)' }],
          vlines: [{ x: lg(v.ReTbody), label: 'body $Re_T$', color: 'var(--text-3)' }, { x: lg(v.ReTfin), label: 'fin $Re_{T,fin}$', color: 'var(--text-3)', row: 1 }],
          markers: [{ x: lg(r.ReBody), y: r.CfBody, label: 'your body' }, { x: lg(r.ReC), y: r.CfFin, label: 'your fins', color: 'var(--series-4)' }] };
      },
    },
    {
      id: 'wetted', title: 'Body wetted area and transition', explore: true,
      info: { text: ['The outside area of the body ahead of each station, from the tip (memo Fig. 1). The laminar wetted area is read off this curve at the transition station (the dot).', 'The kink is the nose shoulder: from there on the area grows linearly with the cylinder.'], doc: 'skin-friction' },
      build(v, out, { U }) {
        const ul = U(LEN), ua = U({ dim: 'area', internal: 'in2' });
        const xt = Math.min(12 * out.r.xTr, v.bodyLength);
        return { x: { label: 'Body station from tip', unit: ul.label }, y: { label: 'Wetted area ahead of station', unit: ua.label }, includeZero: true,
          series: [{ name: '$S_{wet}(x)$', points: out.r.curve.map(([x, S]) => [ul.v(x), ua.v(S)]) }],
          vlines: [{ x: ul.v(xt), label: 'transition', color: 'var(--text-3)' }],
          markers: [{ x: ul.v(xt), y: ua.v(out.r.Slam), label: `laminar ${fmt(ua.v(out.r.Slam), { digits: 3 })} ${ua.label}`, color: 'var(--series-1)' }] };
      },
    },
  ],
  schematicTitle: 'Where the drag comes from',
  schematicHint: 'The rocket to scale with each drag source numbered where it acts (the boundary-layer thickness and the wake are drawn larger than life). The bars split the coasting and motor-burning drag coefficient into the same parts, to one scale. Drag the nose shoulder, the base, the top fin’s root and tip, the flat face or the trip mark to change them.',
  schematic(ctx, v, out) {
    const r = out.r, W = 800;
    const Lb = v.bodyLength, R = v.bodyRadius, Ln = v.noseLength, span = R + v.b;
    // one scale for x and y; the wake behind the base (about one diameter), the diameter dimension and the rear view need room
    const k = Math.min(520 / (Lb + 2.2 * R), 52 / R, 78 / span), x0 = 64, cy = 26 + Math.max(span * k + 44, R * k + 48, 62);
    const H = 370, by0 = 264;   // fixed so the card never changes height while a slider moves
    const fr = ctx.frame({ width: W, height: H, label: 'Rocket with each drag source marked where it acts, and bars of the drag build-up' });
    const g = fr.layer('main'); g.replaceChildren();
    const id = fr.id || 'dc';
    const u = ctx.U(LEN), L = (x) => `${fmt(u.v(x), { digits: 3 })} ${u.label}`;
    const X = (x) => x0 + x * k, Y = (y) => cy - y * k;
    const parts = PARTS.map((p) => ({ ...p, val: partValue(p, r, v) }));
    const P = Object.fromEntries(parts.map((p) => [p.key, p]));
    // free stream
    for (const dy of [-18, 0, 18]) g.append(s('line', { x1: 8, x2: x0 - 14, y1: cy + dy, y2: cy + dy, class: 'sc-thin', 'marker-end': fr.arrow() }));
    g.append(text(8, cy - 28, `M ${fmt(v.M, { digits: 3 })}`, { size: 11, field: 'M' }));
    // nose profile, cut by the flat face
    const a = (Ln * Ln + R * R) / (2 * R);
    const rN = (xs) => (xs >= Ln ? R : v.ogive ? R - a + Math.sqrt(Math.max(0, a * a - (Ln - xs) ** 2)) : (R * xs) / Ln);
    let xs0 = 0;
    const rf = v.flatNose ? Math.min(v.flatD / 2, R * 0.95) : 0;
    if (rf > 0) { let lo = 0, hi = Ln; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (rN(m) < rf) lo = m; else hi = m; } xs0 = lo; }
    const top = [], bot = [];
    for (let i = 0; i <= 60; i++) { const xs = xs0 + ((Ln - xs0) * i) / 60; top.push([X(xs), Y(rN(xs))]); bot.push([X(xs), Y(-rN(xs))]); }
    // boundary layer on the upper surface: thin and smooth while laminar, thicker and ragged once turbulent (not to scale)
    const xT = Math.min(12 * r.xTr, Lb), nb = 120, bl = [];
    const dLam = (x) => 1 + 3 * Math.sqrt(Math.max(0, x - xs0) / Lb), dTur = (x) => dLam(xT) + 1.5 + 9 * (Math.max(0, x - xT) / Lb) ** 0.8;
    for (let i = 0; i <= nb; i++) { const x = xs0 + ((Lb - xs0) * i) / nb, turb = x > xT, d = turb ? dTur(x) + 1.1 * Math.sin(i * 1.9) : dLam(x); bl.push([X(x), Y(rN(x)) - d, turb]); }
    const surf = bl.map(([px], i) => { const x = xs0 + ((Lb - xs0) * i) / nb; return [px, Y(rN(x))]; });
    const band = (sel) => { const idx = bl.map((b, i) => i).filter((i) => sel(bl[i][2])); if (idx.length < 2) return; g.append(s('path', { d: path([...idx.map((i) => [bl[i][0], bl[i][1]]), ...idx.slice().reverse().map((i) => surf[i])], true), fill: P.CDfBody.color, 'fill-opacity': sel(true) ? 0.38 : 0.18, stroke: P.CDfBody.color, 'stroke-width': 0.8, 'data-field': P.CDfBody.field })); };
    band((t) => !t); band((t) => t);
    // body
    const body = [...top, [X(Lb), Y(R)], [X(Lb), Y(-R)], ...bot.slice().reverse()];
    g.append(s('path', { class: 'sc-body', d: path(body, true), 'data-field': 'noseLength bodyRadius bodyLength ogive' }));
    g.append(s('line', { x1: X(Ln), x2: X(Ln), y1: Y(R), y2: Y(-R), class: 'sc-line', 'data-field': 'noseLength' }));
    g.append(s('line', { x1: X(-1.5), x2: X(Lb) + 2.4 * R * k, y1: cy, y2: cy, class: 'sc-axis' }));
    if (rf > 0) g.append(s('line', { x1: X(xs0), x2: X(xs0), y1: Y(rN(xs0)), y2: Y(-rN(xs0)), stroke: P.CDflat.color, 'stroke-width': 3.5, 'data-field': 'flatNose flatD' }));
    // transition station and the trip
    g.append(s('line', { x1: X(xT), x2: X(xT), y1: Y(rN(xT)) - dTur(xT) - 5, y2: Y(-R - v.b) + 34, stroke: 'var(--text-2)', 'stroke-dasharray': '3 3', 'data-field': 'ReTbody trip useTrip' }));
    const tripX = 12 * v.trip, tripOn = v.useTrip && tripX < Lb;
    if (tripOn) g.append(s('rect', { x: X(tripX) - 2.5, y: Y(rN(tripX)) - 3, width: 5, height: 3, fill: 'var(--text)', 'data-field': 'trip useTrip' }));
    // fins: trailing edge at the base, top and bottom panels
    const finPts = (sg) => [[X(Lb - v.cR), Y(sg * R)], [X(Lb - v.cT), Y(sg * span)], [X(Lb), Y(sg * span)], [X(Lb), Y(sg * R)]];
    for (const sg of [1, -1]) {
      g.append(s('path', { class: 'sc-body-2', d: path(finPts(sg), true), 'data-field': 'cR cT b N' }));
      g.append(s('path', { d: path(finPts(sg), true), fill: P.CDfFin.color, 'fill-opacity': 0.22, stroke: 'none', 'data-field': P.CDfFin.field }));
      const fp = finPts(sg);
      g.append(s('line', { x1: fp[0][0], y1: fp[0][1], x2: fp[1][0], y2: fp[1][1], stroke: P.CDle.color, 'stroke-width': v.bluntLE ? 3.5 : 1, 'data-field': 'bluntLE t' }));
      if (v.bluntTE || v.wedge) g.append(s('line', { x1: X(Lb), x2: X(Lb), y1: Y(sg * R), y2: Y(sg * span), stroke: P.CDbFin.color, 'stroke-width': 3.5, 'data-field': 'bluntTE wedge' }));
    }
    // launch lugs (stations illustrative)
    const nl = Math.min(v.nLugs, 4), lugX = [], lh = Math.max(3, Math.min(8, Math.sqrt(v.lugArea) * k * 0.8));
    for (let i = 0; i < nl; i++) {
      const xl = Ln + (Lb - Ln - v.cR) * (nl === 1 ? 0.6 : 0.4 + (0.5 * i) / (nl - 1));
      lugX.push(xl);
      g.append(s('rect', { x: X(xl) - lh, y: Y(R) - lh, width: 2 * lh, height: lh, fill: fillOf(g, P.CDlugs, id), stroke: P.CDlugs.color, 'data-field': 'lugArea nLugs' }));
    }
    // base: nozzle exit and the dead-air wake (coasting)
    const wake = 2 * R * k, bx = X(Lb);
    g.append(s('path', { d: `M${bx},${Y(R)}C${bx + wake * 0.7},${Y(R * 0.9)} ${bx + wake},${cy - R * k * 0.2} ${bx + wake * 1.05},${cy}C${bx + wake},${cy + R * k * 0.2} ${bx + wake * 0.7},${Y(-R * 0.9)} ${bx},${Y(-R)}`, fill: P.CDbOff.color, 'fill-opacity': 0.1, stroke: P.CDbOff.color, 'stroke-dasharray': '4 3', 'data-field': P.CDbOff.field }));
    for (const sg of [1, -1]) g.append(s('path', { d: `M${bx + wake * 0.55},${cy - sg * R * k * 0.15}a${R * k * 0.28},${R * k * 0.28} 0 1 ${sg > 0 ? 0 : 1} 0,${-sg * R * k * 0.5}`, fill: 'none', stroke: P.CDbOff.color, 'stroke-width': 1, 'marker-end': fr.arrow(), 'data-field': P.CDbOff.field }));
    const nzh = Math.max(1.5, Math.min(2 * R, v.nozzleD) * k);
    g.append(s('rect', { x: bx, y: cy - nzh / 2, width: 4, height: nzh, fill: 'var(--text-2)', 'data-field': 'nozzleD' }));
    // dimensions
    g.append(dim(fr, X(0), Y(-span), X(Lb), Y(-span), `L = ${L(Lb)}`, { off: 14, textOff: 14, field: 'bodyLength' }));
    g.append(dim(fr, X(0), Y(R), X(Ln), Y(R), `L_n = ${L(Ln)}`, { off: -(span - R) * k - 30, field: 'noseLength' }));
    g.append(dim(fr, X(Lb - v.cR), Y(R), X(Lb), Y(R), `c_R = ${L(v.cR)}`, { off: -(span - R) * k - 12, field: 'cR' }));
    g.append(dim(fr, X(Lb), Y(-R), X(Lb), Y(-span), `b = ${L(v.b)}`, { off: -10, field: 'b' }));
    g.append(dim(fr, X(Lb), Y(R), X(Lb), Y(-R), `d = ${L(2 * R)}`, { off: -(wake * 1.05 + 16), field: 'bodyRadius' }));
    const uf = ctx.U(FT);
    g.append(dim(fr, X(0), Y(-span) + 40, X(xT), Y(-span) + 40, `x_T = ${fmt(uf.v(r.xTr), { digits: 3 })} ${uf.label} (${r.xTr < r.xNat ? 'trip' : 'natural'}) · laminar ${fmt(100 * r.lamFrac, { digits: 2 })} % of the body`, { labelPos: 'after', field: 'ReTbody trip useTrip' }));
    // numbered balloons where each part acts (leader to the spot)
    const tipFin = (sg) => finPts(sg);
    const ft = tipFin(1), fb = tipFin(-1);
    const spots = {
      CDfBody: [X(Ln + (Lb - Ln) * 0.18), Y(R) - dTur(Ln + (Lb - Ln) * 0.18) - 2, 0, -22],
      CDfFin: [(ft[0][0] + ft[1][0] + ft[2][0] + ft[3][0]) / 4, (ft[0][1] + ft[1][1]) / 2 + 3, -18, -22],
      CDbOff: [bx + wake * 0.75, cy + R * k * 0.4, 16, 22 + R * k * 0.4],
      CDbFin: [X(Lb) + 1, (fb[2][1] + fb[3][1]) / 2, 22, 14],
      CDle: [(fb[0][0] + fb[1][0]) / 2, (fb[0][1] + fb[1][1]) / 2, -20, 16],
      CDflat: [X(xs0), cy - rf * k, -20, -24],
      CDlugs: lugX.length ? [X(lugX[0]), Y(R) - lh, 10, -24] : null,
      wave: [X(xs0) - 2, cy, -26, 22],
    };
    const shown = parts.filter((p) => p.val > 1e-9 && spots[p.key]);
    shown.forEach((p, i) => {
      const [ax, ay, dx, dy] = spots[p.key], bxx = ax + dx, byy = ay + dy, gg = s('g', { 'data-field': p.field });
      gg.append(s('line', { x1: ax, y1: ay, x2: bxx, y2: byy, class: 'sc-thin' }));
      gg.append(s('circle', { cx: bxx, cy: byy, r: 8, fill: 'var(--surface)', stroke: p.color, 'stroke-width': 2 }));
      gg.append(s('text', { x: bxx, y: byy + 3.6, 'text-anchor': 'middle', style: 'fill:var(--text);font:700 10px var(--font-sans)' }, String(i + 1)));
      g.append(gg);
      p.n = i + 1;
    });
    // rear view
    g.append(finEndView(W - 62, 70, 40, { N: v.N, r: R, s: span, t: v.t, field: 'N b t' }));
    // ---- the build-up bars: coasting and motor burning, one scale
    const barX = 150, barW = W - barX - 64;
    const offParts = shown, onParts = shown.map((p) => ({ ...p, val: p.key === 'CDbOff' ? r.CDbOn : p.val }));
    const totOff = offParts.reduce((s2, p) => s2 + p.val, 0), totOn = onParts.reduce((s2, p) => s2 + p.val, 0), kx = barW / Math.max(totOff, totOn);
    const bar = (ps, y, label, tot, pct) => {
      g.append(text(barX - 8, y + 13, label, { anchor: 'end', size: 11 }));
      let acc = 0;
      for (const p of ps) {
        const w = p.val * kx;
        g.append(s('rect', { x: barX + acc, y, width: Math.max(0.5, w - 1), height: 18, fill: fillOf(g, p, id), 'fill-opacity': p.hatch ? 1 : 0.85, rx: 2, 'data-field': p.field },
          s('title', {}, `${p.name}: ${fmt(p.val, { digits: 4 })} (${fmt((100 * p.val) / tot, { digits: 3 })} %)`)));
        if (pct && w > 34) g.append(s('text', { x: barX + acc + w / 2, y: y + 13, 'text-anchor': 'middle', class: 'sc-dim-text', style: 'font-size:10px' }, `${Math.round((100 * p.val) / tot)}%`));
        acc += w;
      }
      g.append(text(barX + acc + 6, y + 13, fmt(tot, { digits: 3 }), { size: 11, cls: 'sc-dim-text' }));
    };
    g.append(text(barX, by0 - 10, `Drag coefficient build-up · coasting C_{D} = ${fmt(r.CDoff, { digits: 4 })}, with ${fmt(v.parasite, { digits: 3 })} % parasite ${fmt(r.CDoffPar, { digits: 4 })}`, { size: 11.5, cls: 'sc-dim-text', field: 'parasite' }));
    bar(offParts, by0, 'coasting', totOff, true);
    bar(onParts, by0 + 26, 'motor burning', totOn, false);
    // legend with the balloon numbers
    let lx = 16, ly = by0 + 70;
    for (const p of shown) {
      const label = `${p.n}  ${p.name} ${fmt(p.val, { digits: 3 })}`;
      const w = label.length * 6.1 + 26;
      if (lx + w > W - 10) { lx = 16; ly += 18; }
      g.append(s('rect', { x: lx, y: ly - 9, width: 12, height: 12, rx: 2, fill: fillOf(g, p, id), 'fill-opacity': p.hatch ? 1 : 0.85, 'data-field': p.field }));
      g.append(text(lx + 17, ly + 1, label, { size: 10.5, field: p.field }));
      lx += w;
    }
    // handles
    const clampL = (x) => Math.max(0.5 * R, Math.min(Lb * 0.95, x));
    ctx.handle('nose', X(Ln), cy, { field: 'noseLength', title: 'Drag the nose shoulder to change the nose length',
      onDrag: (px) => ctx.setValue('noseLength', clampL((px - x0) / k), { round: 0.1 }), onKey: (dx) => ctx.setValue('noseLength', clampL(Ln * (1 + 0.02 * dx))) });
    ctx.handle('base', X(Lb), cy + R * k * 0.55, { field: 'bodyLength', title: 'Drag the base to change the overall length',
      onDrag: (px) => ctx.setValue('bodyLength', Math.max(Ln * 1.05, (px - x0) / k), { round: 0.5 }), onKey: (dx) => ctx.setValue('bodyLength', Math.max(Ln * 1.05, Lb * (1 + 0.02 * dx))) });
    ctx.handle('root', X(Lb - v.cR), Y(R), { field: 'cR', title: 'Drag the fin root along the body to change the root chord',
      onDrag: (px) => ctx.setValue('cR', Math.max(0.1, Lb - (px - x0) / k), { round: 0.05 }), onKey: (dx) => ctx.setValue('cR', Math.max(0.1, v.cR * (1 - 0.02 * dx))) });
    ctx.handle('tip', X(Lb), Y(span), { field: 'b', title: 'Drag the fin tip up or down to change the span',
      onDrag: (px, py) => ctx.setValue('b', Math.max(0.1, (cy - py) / k - R), { round: 0.05 }), onKey: (dx, dy) => ctx.setValue('b', Math.max(0.1, v.b * (1 + 0.02 * dy))) });
    if (rf > 0) ctx.handle('face', X(xs0), cy - rf * k, { field: 'flatD', title: 'Drag the edge of the flat face to change its diameter',
      onDrag: (px, py) => ctx.setValue('flatD', Math.max(0, Math.min(1.9 * R, (2 * (cy - py)) / k)), { round: 0.05 }), onKey: (dx, dy) => ctx.setValue('flatD', Math.max(0, v.flatD * (1 + 0.04 * dy))) });
    if (tripOn) ctx.handle('trip', X(tripX), Y(rN(tripX)) - 8, { field: 'trip', title: 'Drag the trip along the body',
      onDrag: (px) => ctx.setValue('trip', Math.max(0, Math.min(Lb, (px - x0) / k)) / 12, { round: 0.05 }), onKey: (dx) => ctx.setValue('trip', Math.max(0, v.trip + 0.05 * dx)) });
  },
  limits: [
    'Zero lift: drag due to lift (angle of attack) is not included; sounding rockets fly at very nearly zero lift.',
    'Single-stage body of revolution: an ogive or conical nose, a straight cylinder to a flat base (no boat-tail, no transitions), one set of trapezoidal fins with the trailing edge at the base.',
    'Supersonic body and fin wave drag are entered, not computed. The leading-edge and lug drag use Newtonian stagnation pressure, which the memo calls strictly accurate only above Mach 1.',
    'The build-up is not smooth through the transonic range (about Mach 0.8–1.2): the memo advises fairing through it with judgement.',
    'Motor-burning base drag uses Hoerner’s suggestion of 1.5 × the coasting base pressure on the ring outside the nozzle; the memo calls power-on base drag a very complex phenomenon.',
    'The drawing’s boundary-layer thickness and base wake are illustrative, larger than life; the lug stations are illustrative.',
  ],
  reportNotes: ['Coefficients are referenced to the body cross-section $S_{ref}=\\pi d^2/4$. Supersonic body and fin wave drag are inputs, not computed here.'],
  symbols: {
    M: 'flight Mach number', T: 'static air temperature (K or °R)', 'p_\\infty': 'static air pressure (Pa or lbf/ft²)', '\\frac{\\rho a}{\\mu}': 'Reynolds number per unit length per unit Mach number (1/m or 1/ft)', 'K_{Re}': 'constant of the Reynolds-number relation',
    Re_T: 'transition Reynolds number', l_T: 'laminar run length from the tip (m or ft)', 'x_{trip}': 'boundary-layer trip station (m or ft)', 'S_{wet}': 'body wetted area (m² or ft²)', 'S_{nose}': 'nose wetted area (m² or ft²)', 'lamS_{wet}': 'body wetted area ahead of transition (m² or ft²)',
    R: 'body radius (mm or in)', L: 'overall length (mm or in)', L_n: 'nose length (mm or in)', Re_L: 'Reynolds number on the overall length', C_f: 'area-averaged body skin-friction coefficient', 'S_{ref}': 'reference area $\\pi d^2/4$ (m² or ft²)',
    'C_{D_f}': 'skin-friction drag coefficient', 'C_{D_f,body}': 'body skin-friction drag coefficient', '\\bar c': 'average fin chord (m or ft)', 'Re_{\\bar c}': 'fin chord Reynolds number', 'C_{f,fin}': 'fin skin-friction coefficient', N: 'number of fins', 'S_{fin}': 'area of one side of one fin (m² or ft²)',
    c_R: 'fin root chord (mm or in)', c_T: 'fin tip chord (mm or in)', 'Re_{T,fin}': 'fin transition Reynolds number', d_f: 'flat-face diameter (mm or in)', 'd_{ex}': 'nozzle exit diameter (mm or in)', 'S_{ex}': 'nozzle exit area (m² or ft²)', '\\delta_w': 'wedge half-angle (deg)',
    'C_{D_f,fins}': 'fin skin-friction drag coefficient', 'C_{PB}': 'subsonic base-pressure coefficient', '\\Delta C_{PB}': 'transonic base-pressure increment (0.055)', 'M_{lim}': 'Mach number where the transonic base drag meets the quasi-vacuum law', '\\gamma': 'ratio of specific heats (1.4)',
    'C_{D_B}': 'body base drag coefficient (coasting)', 'C_{D_B,on}': 'body base drag coefficient (motor burning)', 'C_{DB,fins}': 'fin trailing-edge base drag coefficient', t: 'fin thickness (mm or in)', b: 'fin exposed semispan (mm or in)',
    'C_{PT}': 'stagnation-pressure coefficient', 'C_{D,LE}': 'fin leading-edge pressure drag coefficient', '\\Lambda': 'fin leading-edge sweep (deg)', 'C_{D,lugs}': 'launch-lug drag coefficient', 'n_{lug}': 'number of lugs', '2Rh': 'frontal area of one lug (cm² or in²)',
    'C_{D,flat}': 'flat nose-face drag coefficient', 'C_{D,wave}': 'supersonic wave drag (entered)', 'C_{D,wave,nose}': 'nose wave drag coefficient (entered)', 'C_{D,wave,fin}': 'fin wave drag coefficient (entered)', 'C_{D,off}': 'total drag coefficient with the motor off', 'C_{D,on}': 'total drag coefficient with the motor burning',
    'C_{D,max}': 'largest single drag part', 'k_{par}': 'parasite allowance (fraction)', 'C_{D,par}': 'drag coefficient with the parasite allowance', C_D: 'drag coefficient', 'C_{D_{base}}': 'base drag coefficients', 'C_{D_{press}}': 'pressure drag coefficients', 'C_{D_{lugs}}': 'launch-lug drag coefficient',
    D: 'drag force (N or lbf)', q: 'dynamic pressure (Pa or lbf/ft²)', h: 'altitude above sea level (m or ft)', d: 'body diameter (mm or in)', U: 'flight speed (m/s or ft/s)', '\\rho': 'air density (kg/m³ or slug/ft³)', '\\mu': 'air viscosity (Pa·s or lbf·s/ft²)', Re: 'Reynolds number',
    'S_{base}': 'base area (cm² or in²)',
    c: 'chord (mm or in)',
    a: 'speed of sound (m/s or ft/s)',
    '\\dots': 'the other drag parts',
  },
  report(v, out, R) {
    const r = out.r, n = R.n, M = v.M, a = out.a;
    const Dl = { dim: 'distance', internal: 'in' }, Df = { dim: 'distance', internal: 'ft' }, A2 = { dim: 'area', internal: 'in2', units: { si: 'm2', us: 'ft2' } }, Af = { dim: 'area', internal: 'ft2', units: { si: 'm2', us: 'ft2' } };
    const Tk = { dim: 'temperature', internal: 'R', units: { si: 'K', us: 'R' } }, E = { dim: 'wavenumber', internal: 'perft' };
    const K = R.pick(n(8816603 / (0.3048 * 47.880258980) * 1.8 ** -1.26, 7), '8\\,816\\,603');
    const Ku = R.pick('\\mathrm{m^{-1}\\,Pa^{-1}\\,K^{1.26}}', '\\mathrm{ft^{-1}\\,(lbf\\,ft^{-2})^{-1}\\,{}^{\\circ}R^{1.26}}');
    const fric = [
      { label: `Reynolds number per unit length (per unit Mach number)${alt(v) ? ', standard day at the altitude' : ''}`, lhs: '\\frac{\\rho a}{\\mu}', eq: 'K_{Re}\\,p_\\infty T^{-1.26}', sub: `${K}\\times${R.v(a.p, PRES)}\\times${R.v(a.T, Tk)}^{-1.26}`, res: R.Q(r.E, E), note: `Here $K_{Re}=${K}\\,${Ku}$.` },
      { label: 'Laminar run: natural transition or the trip, whichever is nearer the tip', lhs: 'l_T', eq: v.useTrip ? '\\min\\left(\\frac{Re_T}{(\\rho a/\\mu)\\,M},\\ x_{trip}\\right)' : '\\frac{Re_T}{(\\rho a/\\mu)\\,M}', sub: v.useTrip ? `\\min\\left(\\frac{${n(v.ReTbody)}}{${R.v(r.E, E)}\\times${n(M)}},\\ ${R.v(v.trip, Df)}\\right)` : `\\frac{${n(v.ReTbody)}}{${R.v(r.E, E)}\\times${n(M)}}`, res: R.Q(r.xTr, Df) },
      { label: 'Body wetted area and its laminar part', lhs: 'S_{wet}', eq: 'S_{nose}+2\\pi R(L-L_n)', sub: `${R.v(r.Snose, A2)}+2\\pi(${R.v(v.bodyRadius, Dl)})(${R.v(v.bodyLength, Dl)}-${R.v(v.noseLength, Dl)})`, res: `${R.Q(r.Swet, A2)},\\qquad lamS_{wet}=${R.Q(r.Slam, A2)}` },
      { label: 'Body skin-friction coefficient: Blasius laminar part plus compressible turbulent part', lhs: 'C_f', eq: '\\frac{1.328\\,(lamS_{wet}/S_{wet})}{\\sqrt{Re_T}}+\\frac{0.427\\,(1-lamS_{wet}/S_{wet})\\,(1+0.15M^2)^{-0.58}}{(\\log_{10}Re_L-0.407)^{2.64}}', sub: `\\frac{1.328\\times${n(r.lamFrac)}}{\\sqrt{${n(r.E * M * r.xTr)}}}+\\frac{0.427\\times${n(1 - r.lamFrac)}\\times${n((1 + 0.15 * M * M) ** -0.58)}}{(\\log_{10}${n(r.ReBody)}-0.407)^{2.64}}`, res: n(r.CfBody) },
      { label: 'Body skin-friction drag', lhs: 'C_{D_f,body}', eq: 'C_f\\,\\frac{S_{wet}}{S_{ref}}\\,(1-0.09M^2)', sub: `${n(r.CfBody)}\\times\\frac{${R.v(r.Swet, A2)}}{${R.v(r.Sref, Af)}}\\times${n(1 - 0.09 * M * M)}`, res: n(r.CDfBody) },
      { label: 'Fin chord Reynolds number', lhs: 'Re_{\\bar c}', eq: '\\frac{\\rho a}{\\mu}\\,\\bar c\\,M', sub: `${R.v(r.E, E)}\\times${R.v(r.cAvg, Df)}\\times${n(M)}`, res: `${n(r.ReC)},\\qquad C_{f,fin}=${n(r.CfFin)}` },
      { label: 'Fin skin-friction drag (both sides of every panel)', lhs: 'C_{D_f,fins}', eq: 'C_{f,fin}\\,\\frac{2N S_{fin}}{S_{ref}}\\,(1-0.09M^2)', sub: `${n(r.CfFin)}\\times\\frac{${n(v.N)}\\times${R.v(r.finWet, A2)}}{${R.v(r.Sref, Af)}}\\times${n(1 - 0.09 * M * M)}`, res: n(r.CDfFin) },
    ];
    const base = [
      { label: 'Subsonic base-pressure coefficient', lhs: 'C_{PB}', eq: '\\frac{0.029}{\\sqrt{C_f\\,S_{wet}/S_{ref}}}', sub: `\\frac{0.029}{\\sqrt{${n(r.CfBody)}\\times${R.v(r.Swet, A2)}/${R.v(r.Sref, Af)}}}`, res: `${n(r.CPBsub)},\\qquad M_{lim}=\\sqrt{\\frac{1.3}{\\gamma(C_{PB}+0.055)}}=${n(r.Mlim)}` },
      { label: `Body base drag at $M=${n(M)}$, motor off`, lhs: 'C_{D_B}', eq: M < 1 ? 'C_{PB}' : M < r.Mlim ? 'C_{PB}+0.055' : '\\frac{1.3}{\\gamma M^2}', res: n(r.CDbOff) },
      { label: 'Body base drag, motor burning (the jet fills the nozzle exit)', lhs: 'C_{D_B,on}', eq: '1.5\\,C_{D_B}\\left(1-\\frac{S_{ex}}{S_{ref}}\\right)', sub: `1.5\\times${n(r.CDbOff)}\\times\\left(1-\\frac{${R.v(r.Sex, Af)}}{${R.v(r.Sref, Af)}}\\right)`, res: n(r.CDbOn) },
      { label: 'Fin trailing-edge base drag', lhs: 'C_{DB,fins}', eq: '\\frac{0.135\\,N\\,t\\,b}{S_{ref}\\,C_{f,fin}^{1/3}}', res: n(r.CDbFin) },
    ];
    const press = [
      { label: 'Stagnation-pressure coefficient (isentropic below Mach 1, Rayleigh pitot above)', lhs: 'C_{PT}', eq: M <= 1 ? '\\frac{2}{\\gamma M^2}\\left[\\left(1+\\frac{\\gamma-1}{2}M^2\\right)^{\\frac{\\gamma}{\\gamma-1}}-1\\right]' : '\\frac{2}{\\gamma M^2}\\left[\\left(\\frac{\\gamma+1}{2}M^2\\right)^{\\frac{\\gamma}{\\gamma-1}}\\left(\\frac{\\gamma+1}{2\\gamma M^2-\\gamma+1}\\right)^{\\frac1{\\gamma-1}}-1\\right]', res: n(r.Cpt0) },
      { label: 'Fin leading-edge (Newtonian) pressure drag', lhs: 'C_{D,LE}', eq: '\\frac{2N\\,t\\,b\\,C_{PT}(M\\cos\\Lambda)\\cos^2\\Lambda}{3S_{ref}}', res: `${n(r.CDle)}\\qquad(\\Lambda=${n((r.sweep * 180) / Math.PI)}^{\\circ})` },
      { label: 'Launch lugs', lhs: 'C_{D,lugs}', eq: 'n_{lug}\\,\\frac{0.8\\,(2Rh)\\,C_{PT}}{S_{ref}}', sub: `${n(v.nLugs)}\\times\\frac{0.8\\times${R.v(v.lugArea / 144, Af)}\\times${n(r.Cpt0)}}{${R.v(r.Sref, Af)}}`, res: n(r.CDlugs) },
    ];
    if (v.flatNose) press.push({ label: 'Flat nose face', lhs: 'C_{D,flat}', eq: M > 1 ? 'C_{PT}\\,\\frac{\\pi d_f^2/4}{S_{ref}}' : '0.85\\left(1+\\tfrac14(M^2+M^4)\\right)\\frac{\\pi d_f^2/4}{S_{ref}}', res: n(r.CDflat) });
    const totals = [
      { label: 'Total, motor off', lhs: 'C_{D,off}', eq: 'C_{D_f,body}+C_{D_f,fins}+C_{D_B}+C_{DB,fins}+C_{D,wave}+C_{D,LE}+C_{D,flat}+C_{D,lugs}', sub: `${n(r.CDfBody)}+${n(r.CDfFin)}+${n(r.CDbOff)}+${n(r.CDbFin)}+${n(v.noseWave + v.finWave)}+${n(r.CDle)}+${n(r.CDflat)}+${n(r.CDlugs)}`, res: n(r.CDoff, 4) },
      { label: 'Total, motor burning', lhs: 'C_{D,on}', eq: 'C_{D,off}-C_{D_B}+C_{D_B,on}', res: n(r.CDon, 4) },
      { label: `With a ${n(v.parasite)} % parasite allowance`, lhs: 'C_{D,off}\\times' + n(1 + v.parasite / 100), eq: n(r.CDoffPar, 4), res: `C_{D,on}\\times${n(1 + v.parasite / 100)}=${n(r.CDonPar, 4)}` },
      { label: 'Drag force, coasting, with the parasite allowance', lhs: 'D', eq: '\\tfrac12\\gamma p_\\infty M^2\\,S_{ref}\\,C_{D,off}(1+k_{par})', sub: `0.7\\times${R.v(a.p, PRES)}\\times${n(M)}^2\\times${R.v(r.Sref, Af)}\\times${n(r.CDoffPar, 4)}`, res: R.Q(out.results.Dforce, FORCE) },
    ];
    return [
      { title: 'Theory', text: 'Zero-lift drag is built up from its physical sources. Skin friction is viscous shear in the boundary layer, laminar from the tip to transition and turbulent behind it; transition happens at a fixed Reynolds number or at a trip. Base drag is the low pressure behind the body base and behind blunt fin trailing edges; the motor jet changes it while burning. Blunt fin leading edges, a flat nose face and the launch lugs carry Newtonian stagnation pressure. Supersonic wave drag comes from other tools, and a small parasite allowance covers joints and roughness. Every coefficient is referred to the body cross-section, so the parts add.' },
      { title: 'Skin friction', steps: fric },
      { title: 'Base drag', steps: base },
      { title: 'Pressure drag of edges, nose face and lugs', steps: press },
      { title: 'Totals', steps: totals },
    ];
  },
  references: ['drag-coefficient3-4', 'modified-newtonian-aero4', 'ogive-nose'],
  examples: [
    { name: 'Memo example rocket at Mach 0.9 (sea level, 39 °F)', values: { M: 0.9, air: 'tp', h: 0, T: 499.17, p: 2124, ogive: true, noseLength: 36, bodyRadius: 3.07, bodyLength: 148, ReTbody: 200000, useTrip: true, trip: 2.5, flatNose: true, flatD: 1.5, N: 4, cR: 11.8, cT: 4.5, b: 5.84, t: 0.125, bluntLE: true, bluntTE: true, wedge: 0, ReTfin: 25000, nozzleD: 0.4, lugArea: 0.36, nLugs: 2, noseWave: 0, finWave: 0, parasite: 5 } },
    { name: 'Same rocket, pointed nose, bevelled fins, no trip', values: { M: 0.9, air: 'tp', h: 0, T: 499.17, p: 2124, ogive: true, noseLength: 36, bodyRadius: 3.07, bodyLength: 148, ReTbody: 400000, useTrip: false, trip: 2.5, flatNose: false, flatD: 1.5, N: 4, cR: 11.8, cT: 4.5, b: 5.84, t: 0.125, bluntLE: false, bluntTE: false, wedge: 0, ReTfin: 25000, nozzleD: 0.4, lugArea: 0.36, nLugs: 2, noseWave: 0, finWave: 0, parasite: 5 } },
    { name: 'Small model rocket at Mach 0.3, 300 m (illustrative)', values: { M: 0.3, air: 'alt', h: 1000, T: 499.17, p: 2124, ogive: true, noseLength: 3.5, bodyRadius: 0.488, bodyLength: 18, ReTbody: 400000, useTrip: false, trip: 0.5, flatNose: false, flatD: 0, N: 3, cR: 2.5, cT: 1.25, b: 1.75, t: 0.0625, bluntLE: true, bluntTE: false, wedge: 0, ReTfin: 25000, nozzleD: 0.25, lugArea: 0.06, nLugs: 1, noseWave: 0, finWave: 0, parasite: 5 } },
  ],
};
