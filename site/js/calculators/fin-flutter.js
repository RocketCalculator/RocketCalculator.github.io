// Fin Flutter — UI definition (Phase 1 rebuild, 2026-10-25). Physics in calc/flutter.js; sources and decisions in
// site/docs/fin-flutter.html, KNOWLEDGE.md and DECISIONS.md (D13–D17).
import { flutterSpeed, checkFlight, remedies, seaLevelTemp, altimeterCloudForm, houltWorkbook, air, H_TROPO } from '../calc/flutter.js';
import { s, fmt, InputError } from '../util.js';
import { dim, path, text } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const LEN = { dim: 'length', internal: 'in' };
const ALT = { dim: 'altitude', internal: 'ft' };
const SPD = { dim: 'speed', internal: 'fts' };
const MOD = { dim: 'modulus', internal: 'psi' };
const TEMP = { dim: 'temperature', internal: 'degF' };
const NONE = { dim: 'none' };
const Q = (x, spec, digits = 3) => `${fmt(toDisplay(x, spec), { digits })} ${unitLabel(displayUnit(spec))}`;

// Bennett's suggested working shear moduli "allowing for margin" (Peak of Flight 615, table p. 4), psi.
// Shear moduli G (psi). Bennett's working values (Peak of Flight 615) first; then the bulk materials of OpenRocket's
// database with their in-plane shear modulus (OpenRocket core Databases.java, commit 54b78727d "Add in-plane shear
// modulus to material"; sources in that file's comments: MatWeb, designerdata.nl, Peak of Flight 615, wood handbook
// ratios G_LT/E_L). Not independently verified here; 3D-printed values are for 100 % infill.
const BENNETT_G = 'Bennett (Peak of Flight 615)';
const MATERIALS = [
  { value: 'balsa', label: 'Balsa wood', G: 33359, group: BENNETT_G },
  { value: 'birchply', label: 'Birch aircraft plywood', G: 89000, group: BENNETT_G },
  { value: 'g10', label: 'G10 / G12 epoxy fibreglass', G: 600000, group: BENNETT_G },
  { value: 'cfrp', label: 'Carbon fibre–epoxy composite', G: 600000, group: BENNETT_G },
  { value: 'al6061', label: '6061-T6 aluminium', G: 3800000, group: BENNETT_G },
  { value: 'ti64', label: '6Al-4V titanium', G: 6200000, group: BENNETT_G },
  { value: 'st4130', label: '4130 steel', G: 12000000, group: BENNETT_G },
  { value: 'or-acrylic', label: 'Acrylic', G: 246564, group: 'OpenRocket — Plastics' },
  { value: 'or-delrin', label: 'Delrin', G: 137206, group: 'OpenRocket — Plastics' },
  { value: 'or-nylon-6-6', label: 'Nylon (6/6)', G: 166793, group: 'OpenRocket — Plastics' },
  { value: 'or-polycarbonate-lexan', label: 'Polycarbonate (Lexan)', G: 114000, group: 'OpenRocket — Plastics' },
  { value: 'or-polystyrene', label: 'Polystyrene', G: 178396, group: 'OpenRocket — Plastics' },
  { value: 'or-pvc', label: 'PVC', G: 330686, group: 'OpenRocket — Plastics' },
  { value: 'or-pla-100-infill', label: 'PLA, 100 % infill', G: 348091, group: 'OpenRocket — 3D-printed (100 % infill)' },
  { value: 'or-petg-100-infill', label: 'PETG, 100 % infill', G: 116030, group: 'OpenRocket — 3D-printed (100 % infill)' },
  { value: 'or-abs-100-infill', label: 'ABS, 100 % infill', G: 126908, group: 'OpenRocket — 3D-printed (100 % infill)' },
  { value: 'or-asa-100-infill', label: 'ASA, 100 % infill', G: 116030, group: 'OpenRocket — 3D-printed (100 % infill)' },
  { value: 'or-aluminium-6061-t6', label: 'Aluminium (6061-T6)', G: 3.77098e+06, group: 'OpenRocket — Metals' },
  { value: 'or-brass', label: 'Brass', G: 5.64197e+06, group: 'OpenRocket — Metals' },
  { value: 'or-steel', label: 'Steel', G: 1.15595e+07, group: 'OpenRocket — Metals' },
  { value: 'or-titanium', label: 'Titanium', G: 6.23662e+06, group: 'OpenRocket — Metals' },
  { value: 'or-balsa', label: 'Balsa', G: 33358.7, group: 'OpenRocket — Woods' },
  { value: 'or-basswood', label: 'Basswood', G: 48007.5, group: 'OpenRocket — Woods' },
  { value: 'or-birch', label: 'Birch', G: 101526, group: 'OpenRocket — Woods' },
  { value: 'or-cork', label: 'Cork', G: 1450.38, group: 'OpenRocket — Woods' },
  { value: 'or-maple', label: 'Maple', G: 102977, group: 'OpenRocket — Woods' },
  { value: 'or-pine', label: 'Pine', G: 102977, group: 'OpenRocket — Woods' },
  { value: 'or-plywood-birch', label: 'Plywood (birch)', G: 88908.1, group: 'OpenRocket — Woods' },
  { value: 'or-spruce', label: 'Spruce', G: 159542, group: 'OpenRocket — Woods' },
  { value: 'or-carbon-fibre-quasi-isotropic', label: 'Carbon fibre (quasi-isotropic)', G: 600456, group: 'OpenRocket — Composites' },
  { value: 'or-fibreglass', label: 'Fibreglass', G: 600456, group: 'OpenRocket — Composites' },
  { value: 'or-kraft-phenolic', label: 'Kraft phenolic', G: 258167, group: 'OpenRocket — Composites' },
  { value: 'or-cardboard', label: 'Cardboard', G: 58015.1, group: 'OpenRocket — Paper and foam' },
  { value: 'or-depron-xps', label: 'Depron (XPS)', G: 391.602, group: 'OpenRocket — Paper and foam' },
  { value: 'or-styrofoam-eps', label: 'Styrofoam (EPS)', G: 290.075, group: 'OpenRocket — Paper and foam' },
  { value: 'or-blue-foam-xps', label: 'Blue foam (XPS)', G: 406.106, group: 'OpenRocket — Paper and foam' },
  { value: 'custom', label: 'Custom (enter G)', G: null },
];
const GROUP_OF = (v) => MATERIALS.find((m) => m.value === v.material)?.group || '';
const G_OF = (v) => (v.material === 'custom' ? v.Gc : MATERIALS.find((m) => m.value === v.material)?.G ?? v.Gc) * (v.tipToTip ? 2 : 1);

// Verdict thresholds (DECISIONS.md D15): UNSAFE below 1.2 (Bennett: under 20 % margin "potentially unsafe";
// altimetercloud: under 1.2 "danger"); SAFE from the target (default 1.5, altimetercloud's minimum) — 2.0 when the
// flight is supersonic (altimetercloud); MARGINAL between.
const UNSAFE_SF = 1.2;
// Bennett's worked example (Peak of Flight 615): Aerotech L1090W, launch site 4500 ft on a standard day
const BENNETT = { cR: 7.5, cT: 2.5, b: 3, m: 4.285, t: 0.125, material: 'g10', Gc: 600000, tipToTip: false, h0: 4500, Tsite: 42.98, mode: 'point', Vmax: 1500, hMax: 14000, target: 1.5,
  profile: [{ h: 0, V: 0 }, { h: 2000, V: 800 }, { h: 7000, V: 1300 }, { h: 14000, V: 1500 }, { h: 20000, V: 1100 }, { h: 26000, V: 500 }] };
const targetFor = (v, M) => Math.max(v.target, M >= 1 ? 2 : 0);

function points(v) {
  if (v.mode === 'profile') {
    const rows = (v.profile || []).filter((r) => Number.isFinite(r.h) && Number.isFinite(r.V));
    if (rows.length < 1) throw new InputError('The flight profile needs at least one row of altitude and speed.');
    if (rows.some((r) => r.V < 0)) throw new InputError('Speeds in the flight profile cannot be negative.');
    return rows.map((r) => ({ h: r.h, V: r.V }));
  }
  return [{ h: v.hMax, V: v.Vmax }];
}
const finOf = (v) => ({ cR: v.cR, cT: v.cT, b: v.b, m: v.m, t: v.t, G: G_OF(v) });

function checkProfile(rows) {
  if (rows.some((r) => !Number.isFinite(r.h) || !Number.isFinite(r.V))) return 'Every cell needs a number.';
  if (rows.some((r) => r.V < 0)) return 'Speeds cannot be negative.';
  return '';
}

export default {
  slug: 'fin-flutter',
  topic: 'fin-aeroelasticity',
  title: 'Fin Flutter',
  subtitle: 'Will your fins flutter? The <b>flutter speed</b> of a fin panel through the whole flight, the <b>safety factor</b> against your rocket’s speed, and the thickness, span or material that fixes it.',
  verdict: true,
  tiers: true,
  intro: {
    what: 'Estimates the speed at which bending–torsion flutter would start on a fin panel (Martin’s NACA correlation as corrected by Bennett, 2023), compares it with your rocket’s speed at every point you give, and finds the thinnest fin, longest span or softest material that still meets your safety factor.',
    why: 'Flutter destroys fins in a fraction of a second. Thin, soft, high-aspect-ratio fins on fast rockets at low altitude are most at risk, and hot days make it worse.',
    when: 'Choosing fin thickness and material, checking a motor upgrade, or a hot launch day. Use the speed and altitude at motor burnout, or a whole flight profile from a simulation.',
  },
  info: {
    text: [
      'Flutter is a self-excited vibration: the fin’s bending and twisting couple with the airflow and draw energy from it until the fin breaks.',
      'Martin’s correlation scales the speed of sound by the root of the shear modulus over a geometry and air-pressure term, so the flutter speed rises with altitude (thinner air) and with (t/c)^1.5.',
      'It is an estimate for preliminary design — keep a healthy margin, and treat composite stiffness, fin attachment and tip-to-tip layups with suspicion.',
    ],
    tex: 'V_f=a\\sqrt{\\dfrac{G}{\\dfrac{DN\\,A^3}{(t/c)^3(A+2)}\\,\\dfrac{\\lambda+1}{2}\\,\\dfrac{p}{p_0}}}',
    steps: ['Enter the fin planform and thickness.', 'Pick the material (or enter its shear modulus).', 'Enter the launch site and the speed and altitude of maximum velocity — or a flight profile.', 'Read the verdict; if it is not safe, use the thickness, span or material the fixes ask for.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'fin', title: 'Fin panel',
      fields: [
        { id: 'cR', shared: 'finCr', label: 'Root chord', sym: 'c_R', ...LEN, default: 7.5, min: 0, minExclusive: true, info: { text: ['The length of the fin where it is glued to the body tube, front edge to back edge.', 'Measure it on the fin or read it from your design file (RockSim and OpenRocket call it the root chord).', 'The thickness ratio $t/c$ uses it: a longer root makes a thin fin relatively thinner and lowers the flutter speed, but it also lowers the aspect ratio, which raises it.'], tex: 'S=\\frac{(c_R+c_T)\\,b}{2},\\qquad \\frac{t}{c}=\\frac{t}{c_R}', range: '2–6 in (5–15 cm) for model and high-power rockets; 6–15 in (15–40 cm) for large ones.', doc: 'geometry' }, max: 100, slider: { min: 1, max: 20, step: 0.05 } },
        { id: 'cT', shared: 'finCt', label: 'Tip chord', sym: 'c_T', ...LEN, default: 2.5, min: 0, info: { text: ['The length of the fin’s outer edge, parallel to the body; zero for a pointed (delta) fin.', 'For an elliptical fin use the pseudo tip chord $c_T=2S/b-c_R$, the trapezoid with the same area.', 'A larger tip chord adds area at the tip, raises the taper ratio $\\lambda$ and lowers the flutter speed a little.'], tex: '\\lambda=\\frac{c_T}{c_R}', range: '0 (delta) to the root chord (rectangle); about a third of the root is common.', doc: 'geometry' }, max: 100, slider: { min: 0, max: 15, step: 0.05 } },
        { id: 'b', shared: 'finSpan', label: 'Semi-span (height)', sym: 'b', ...LEN, default: 3, min: 0, minExclusive: true, info: { text: ['How far the fin sticks out from the body tube to its tip (RockSim “semi-span”, OpenRocket “height”).', 'Measure from the tube surface, not the centre line.', 'The longest lever: a longer span raises the aspect ratio $A=b^2/S$ and the flutter speed falls fast. The verdict gives the longest span that meets your target.'], tex: 'A=\\frac{b^2}{S}', range: '1–6 in (2.5–15 cm); usually 1–1.5 body diameters.', doc: 'geometry' }, max: 60, slider: { min: 0.5, max: 12, step: 0.05 } },
        { id: 'm', label: 'Sweep length', sym: 'm', ...LEN, default: 4.285, min: -100, info: { text: ['How far back the tip’s leading edge sits behind the root’s leading edge, measured along the body (OpenRocket and RockSim “sweep length”). Negative for a forward-swept fin.', 'Read it from your design file, or measure along the tube from the root front to below the tip front.', 'Sweep moves the fin’s centre of area back. Martin’s constant assumes it at mid-chord; further back (more sweep) raises $DN$ and lowers the flutter speed (Bennett’s example: 40 %).'], tex: 'C_x=\\frac{2c_Tm+c_T^2+mc_R+c_Tc_R+c_R^2}{3(c_T+c_R)}', range: '0 (straight leading edge) to about the root chord.', doc: 'centroid' }, max: 100, slider: { min: -5, max: 20, step: 0.05 } },
        { id: 't', shared: 'finT', label: 'Thickness', sym: 't', ...LEN, default: 0.125, min: 0, minExclusive: true, slider: { min: 0.03, max: 0.5, step: 0.005 },
          info: { text: ['How thick the fin plate is. If it tapers, use the average or the thickness at mid-span (Bennett).', 'Measure with calipers on the actual fin, including any skin of fibreglass.', 'The strongest fix: the flutter speed grows as $t^{3/2}$, so 20 % thicker gives 31 % more flutter speed. The verdict gives the thickness that meets your target.'], tex: 'V_f=a\\sqrt{\\dfrac{G\\,(t/c)^3\\,(A+2)}{DN\\,A^3\\,\\frac{\\lambda+1}{2}\\,\\frac{p}{p_0}}}', range: '1/16–1/4 in (1.5–6 mm) on most high-power rockets.', doc: 'geometry' }, max: 2 },
      ],
    },
    {
      id: 'mat', title: 'Material',
      fields: [
        { id: 'material', label: 'Fin material', kind: 'select', default: 'g10', options: MATERIALS.map(({ value, label, G, group }) => ({ value, group, label: G ? `${label} — G ${fmt((G * 6894.757293168) / 1e9, { digits: 3 })} GPa (${fmt(G, { digits: 3 })} psi)` : label })),
          info: { text: ['What the fin is made of. Each choice brings its shear modulus $G$: how stiff the material is against twisting.', 'The values are Bennett’s working values, chosen with margin, plus OpenRocket’s bulk materials. Composites vary a lot: measured G10 lies between 425 000 and 1 700 000 psi.', 'The flutter speed grows as $\\sqrt G$: aluminium (about 6 times stiffer in shear than G10) gives about 2.5 times the flutter speed.'], tex: 'V_f\\propto\\sqrt G', doc: 'material' } },
        { id: 'Gc', label: 'Shear modulus G', sym: 'G', ...MOD, default: 600000, min: 0, minExclusive: true, when: (v) => v.material === 'custom',
          info: { text: ['Your own value of the shear modulus: the stress needed to twist the material by one radian.', 'From a datasheet, or from Young’s modulus $E$ and Poisson’s ratio $\\nu$ as $G=E/2(1+\\nu)$ — that overestimates $G$ for composites, whose shear stiffness comes mostly from the epoxy.', 'The flutter speed grows as $\\sqrt G$; the verdict gives the $G$ that meets your target.'], tex: 'G=\\frac{E}{2(1+\\nu)}', range: 'Balsa 33 000 psi; birch plywood 89 000; G10 or carbon-epoxy 600 000; aluminium 3 800 000; steel 12 000 000 psi (Bennett).', doc: 'material' }, max: 50000000, slider: { min: 10000, max: 15000000, step: 10000 } },
        { id: 'tipToTip', label: 'Tip-to-tip reinforcement', kind: 'bool', default: false,
          info: { text: ['Whether the fins are reinforced tip to tip: fibreglass or carbon cloth laid over one fin, across the body and onto the next.', 'Bennett suggests doubling $G$ as a rough allowance; Martin’s correlation does not model it.', 'With it ticked the flutter speed rises by $\\sqrt2$ (41 %); treat the result as indicative.'], tex: 'G_{used}=2G', doc: 'limits' } },
      ],
    },
    {
      id: 'flight', title: 'Flight',
      fields: [
        { id: 'h0', label: 'Launch site elevation (MSL)', sym: 'h_0', ...ALT, default: 4500, min: -1500, max: 40000, info: { text: ['The height of the launch site above sea level.', 'From a map or GPS. With the site temperature it fixes the air pressure and speed of sound along the flight.', 'Higher sites have thinner air, so the flutter speed is higher there.'], tex: 'T_F=T_{SL}-0.00356\\,h', range: 'Sea level to about 5000 ft (1500 m) for most launch sites.', doc: 'atmosphere' }, slider: { min: 0, max: 12000, step: 10 } },
        { id: 'Tsite', label: 'Launch site temperature', sym: 'T_0', ...TEMP, default: 42.98, min: -60, max: 140, slider: { min: 0, max: 120, step: 1 },
          info: { text: ['The air temperature at the launch site on launch day.', 'The default is the standard day at the site elevation; use the forecast for the day.', 'Hot air lowers the flutter speed: the speed of sound rises but the air pressure at a given height rises more. The results also show the safety factor on a day 20 °F (11 °C) hotter.'], tex: 'a=49.03\\sqrt{T_F+459.7},\\qquad p=14.696\\left(\\frac{T_F+459.7}{518.7}\\right)^{5.256}', range: '0–40 °C (32–104 °F).', doc: 'atmosphere' } },
        { id: 'mode', label: 'Flight condition', kind: 'select', default: 'point', options: [{ value: 'point', label: 'Maximum velocity (one point)' }, { value: 'profile', label: 'Flight profile (table)' }], info: { text: ['How you describe the flight: one point (maximum speed and its altitude) or a table of speed against altitude.', 'One point is quick; the table lets the calculator find the worst point, which is not always the fastest one (dense air low down matters too).', 'Use “Fill from the Trajectory Simulation” to fill the table from that calculator.'], doc: 'flight' } },
        { id: 'Vmax', label: 'Maximum velocity', sym: 'V', ...SPD, default: 1500, min: 0, when: (v) => v.mode === 'point', info: { text: ['The highest speed of the flight, usually just at motor burnout.', 'From a simulation: OpenRocket, RockSim or the Trajectory Simulation on this site.', 'The safety factor is the flutter speed divided by it, so it scales directly.'], tex: 'SF=\\frac{V_f(h)}{V}', range: '600–1200 ft/s (180–370 m/s) for high-power; up to 3000 ft/s (900 m/s) and more for research rockets.', doc: 'flight' }, max: 10000, slider: { min: 100, max: 5000, step: 10 } },
        { id: 'hMax', label: 'Altitude of maximum velocity (AGL)', sym: 'h', ...ALT, default: 14000, min: 0, when: (v) => v.mode === 'point', info: { text: ['The height above the launch site where the maximum speed happens.', 'From the same simulation as the speed.', 'Higher means thinner air and a higher flutter speed, so a burnout low down is the dangerous case.'], tex: 'T_F=T_{SL}-0.00356\\,h', range: '500–5000 ft (150–1500 m) for most high-power flights.', doc: 'flight' }, max: 300000, slider: { min: 0, max: 60000, step: 100 } },
        { id: 'profile', label: 'Flight profile', kind: 'table', minRows: 1, when: (v) => v.mode === 'profile',
          columns: [{ id: 'h', label: 'Altitude AGL', ...ALT }, { id: 'V', label: 'Speed', ...SPD }],
          default: [{ h: 0, V: 0 }, { h: 2000, V: 800 }, { h: 7000, V: 1300 }, { h: 14000, V: 1500 }, { h: 20000, V: 1100 }, { h: 26000, V: 500 }],
          validate: checkProfile, info: { text: ['Speed against height above the launch site at several points of the flight.', 'The calculator evaluates every point and keeps the worst one; use “Fill from the Trajectory Simulation”.', 'Points low down and fast usually set the worst case.'], tex: 'SF=\\min\\frac{V_f(h)}{V(h)}', doc: 'flight' } },
        { id: 'target', label: 'Target safety factor', sym: 'SF_{target}', ...NONE, default: 1.5, min: 1, max: 5, slider: { min: 1.2, max: 3, step: 0.05 },
          info: { text: ['The smallest ratio of flutter speed to flight speed you accept.', '1.5 is altimetercloud.com’s minimum recommendation; it is raised to 2 for supersonic flight. Bennett calls a margin under 25 % a poor risk and under 20 % potentially unsafe.', 'The fixes (thickness, span, material) are solved to reach it.'], tex: 'SF\\ge SF_{target}', range: '1.5 (subsonic) to 2 (supersonic).', doc: 'verdict' } },
      ],
    },
  ],
  actions: [{
    label: 'Fill from the Trajectory Simulation', title: 'Run the Trajectory Simulation with its saved inputs and use its speed and altitude as the flight profile',
    async run() {
      const def = (await import('./skyaero-trajectory.js')).default;
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem('rc-calc-skyaero-trajectory')); } catch { /* none */ }
      const v = {}; for (const g of def.groups) for (const f of g.fields) v[f.id] = structuredClone(f.default);
      Object.assign(v, structuredClone(def.examples?.[0]?.values || {}), saved || {});
      const out = def.compute(v);
      const H = out.o.hist, step = Math.max(1, Math.ceil(H.length / 60));
      const profile = H.filter((r, i) => i % step === 0 || i === H.length - 1).map((r) => ({ h: Math.max(0, r.z), V: r.V }));
      return { values: { mode: 'profile', profile, h0: v.ho, Tsite: v.To - 459.67 },
        message: saved ? `Profile filled from your Trajectory Simulation (${profile.length} points)` : `Profile filled from the Trajectory Simulation example (${profile.length} points) — open that calculator to simulate your own rocket` };
    },
  }],
  results: [
    { id: 'SF', label: 'Safety factor (worst point)', sym: 'SF', ...NONE, key: true, digits: 3,
      status: (x, out) => (x < UNSAFE_SF ? 'err' : x < out.o.target ? 'warn' : 'ok'),
      note: (x, out) => `flutter / flight speed · target ${fmt(out.o.target, { digits: 3 })}`,
      info: { text: ['How many times faster than the rocket the fins would have to fly to flutter, at the worst point of the flight.', 'The flutter speed divided by the flight speed, at each point; the smallest is shown.', 'Below 1.2 the verdict is unsafe, between 1.2 and your target marginal (Bennett, altimetercloud.com).'], tex: 'SF=\\min\\frac{V_f(h)}{V(h)}', range: '1.5 or more subsonic; 2 or more supersonic.', doc: 'verdict' } },
    { id: 'Vf', label: 'Flutter speed at the worst point', sym: 'V_f', ...SPD, key: true, digits: 4,
      note: (x, out) => `Mach ${fmt(out.o.f.Mf, { digits: 3 })} at ${Q(out.o.worst.h, ALT)} AGL, flying ${Q(out.o.worst.V, SPD)}`,
      info: { text: ['The speed at which the fins would start to flutter (shake themselves apart) at the worst point of the flight.', 'From Martin’s correlation as restated by Bennett, with the centroid correction for swept fins.', 'It grows with the shear modulus and the thickness and falls with the aspect ratio, the taper ratio and the air pressure.'], tex: 'V_f=a\\sqrt{\\dfrac{G\\,(t/c)^3\\,(A+2)}{DN\\,A^3\\,\\frac{\\lambda+1}{2}\\,\\frac{p}{p_0}}}', doc: 'correlation' } },
    { id: 'tNeed', label: 'Thickness for the target', sym: 't_{req}', ...LEN, key: true, digits: 3,
      note: (x, out) => `now ${Q(out.v.t, LEN)} (${x > out.v.t ? '+' : ''}${fmt((100 * (x - out.v.t)) / out.v.t, { digits: 2 })} %)`,
      info: { text: ['The thinnest fin that reaches your target safety factor, everything else the same.', 'Exact, because the flutter speed grows as $t^{3/2}$.', 'Compare it with the stock thicknesses you can buy, and round up.'], tex: 't_{req}=t\\left(\\frac{SF_{target}}{SF}\\right)^{2/3}', doc: 'remedies' } },
    { id: 'margin', label: 'Margin', sym: 'SF-1', ...NONE, digits: 3, info: { text: 'How far the flutter speed is above the flight speed, as a fraction.', doc: 'verdict' } },
    { id: 'Mf', label: 'Flutter Mach number (worst point)', sym: 'M_f', ...NONE, digits: 4, info: { text: ['The flutter speed as a Mach number at the worst point.', 'Martin’s correlation is validated to about Mach 1.5 (Bennett); above that it is an extrapolation.'], tex: 'M_f=V_f/a', doc: 'correlation' } },
    { id: 'hWorst', label: 'Worst point altitude (AGL)', sym: 'h_w', ...ALT, digits: 4, info: { text: ['The height above the launch site of the worst point of the flight.'], doc: 'flight' } },
    { id: 'bMax', label: 'Longest semi-span for the target', sym: 'b_{max}', ...LEN, digits: 3, info: { text: 'Everything else unchanged; “—” if no span reaches the target.', doc: 'remedies' } },
    { id: 'Gneed', label: 'Shear modulus for the target', sym: 'G_{req}', ...MOD, digits: 3, info: { text: ['The shear modulus that reaches your target, everything else the same: choose a material at least this stiff.'], tex: 'G_{req}=G\\left(\\frac{SF_{target}}{SF}\\right)^2', doc: 'remedies' } },
    { id: 'SFhot', label: 'Safety factor on a day 20 °F (11 °C) hotter', sym: 'SF_{+20}', ...NONE, digits: 3, info: { text: 'Hot days lower the flutter speed — check the hottest day you might fly.', doc: 'atmosphere' } },
    { id: 'A', label: 'Aspect ratio (one panel)', sym: 'A', ...NONE, digits: 4, info: { text: ['How slender one fin panel is: span squared over area. Flutter speed falls fast as it grows.'], tex: 'A=\\frac{b^2}{S}', doc: 'geometry' } },
    { id: 'lam', label: 'Taper ratio', sym: '\\lambda', ...NONE, digits: 4, info: { text: ['Tip chord over root chord.'], tex: '\\lambda=\\frac{c_T}{c_R}', doc: 'geometry' } },
    { id: 'tc', label: 'Thickness ratio (root chord)', sym: 't/c', ...NONE, digits: 4, info: { text: ['Fin thickness over root chord.'], tex: '\\frac{t}{c}=\\frac{t}{c_R}', doc: 'geometry' } },
    { id: 'S', label: 'Panel area', sym: 'S', dim: 'area', internal: 'in2', digits: 4, info: { text: ['Area of one exposed fin panel.'], tex: 'S=\\frac{(c_R+c_T)\\,b}{2}', doc: 'geometry' } },
    { id: 'Cx', label: 'Centroid behind the root leading edge', sym: 'C_x', ...LEN, digits: 4, info: { text: ['How far behind the root leading edge the fin’s centre of area lies.'], tex: 'C_x=\\frac{2c_Tm+c_T^2+mc_R+c_Tc_R+c_R^2}{3(c_T+c_R)}', doc: 'centroid' } },
    { id: 'eps', label: 'Centroid offset ε (used)', sym: '\\varepsilon', ...NONE, digits: 4, info: { text: 'Distance of the centroid behind the quarter chord, as a fraction of the root chord; values below 0.25 are raised to 0.25.', tex: '\\varepsilon=C_x/c_R-0.25', doc: 'centroid' } },
    { id: 'DN', label: 'Denominator constant DN', sym: 'DN', ...MOD, digits: 4, info: { text: ['Martin’s denominator constant, raised for swept fins (39.3 psi at $\\varepsilon=0.25$).'], tex: 'DN=\\frac{24\\,\\varepsilon\\,\\kappa\\,p_0}{\\pi}', doc: 'centroid' } },
    { id: 'a', label: 'Speed of sound (worst point)', sym: 'a', ...SPD, digits: 4, info: { text: ['Speed of sound at the worst point.'], tex: 'a=49.03\\sqrt{T_F+459.7}', doc: 'atmosphere' } },
    { id: 'p', label: 'Air pressure (worst point)', sym: 'p', dim: 'pressure', internal: 'psi', units: { si: 'kPa', us: 'psi' }, digits: 4, info: { text: ['Air pressure at the worst point.'], tex: 'p=14.696\\left(\\frac{T_F+459.7}{518.7}\\right)^{5.256}', doc: 'atmosphere' } },
    { id: 'Gused', label: 'Shear modulus used', sym: 'G', ...MOD, digits: 3, info: { text: ['The shear modulus used: the material’s value, doubled with the tip-to-tip allowance.'], doc: 'material' } },
    { id: 'Valt', label: 'Cross-check: altimetercloud.com form', sym: 'V_{f,AC}', ...SPD, digits: 4, info: { text: 'The formula in altimetercloud.com’s calculator omits Martin’s (A + 2) term, which lowers V_f by √(2/(A+2)).', doc: 'crosscheck' } },
    { id: 'Vhoult', label: 'Cross-check: Hoult workbook form (chord at 75 % span)', sym: 'V_{f,H}', ...SPD, digits: 4, info: { text: 'FLUTTER MARGIN1 (Hoult) takes t/c at 75 % of the span and ε = 0.25: less conservative for tapered or swept fins.', doc: 'crosscheck' } },
    ...['t', 'G', 'b', 'cR', 'cT', 'V', 'T'].map((k) => ({ id: `sens_${k}`, label: `Sensitivity: ${{ t: 'thickness', G: 'shear modulus', b: 'semi-span', cR: 'root chord', cT: 'tip chord', V: 'flight speed', T: 'site temperature (±10 °F)' }[k]} ${k === 'T' ? '' : '±10 %'}`.trim(),
      ...NONE, info: { text: 'Safety factor with this input lowered / raised (others unchanged). Ranked by effect in the documentation.', doc: 'remedies' } })),
  ],
  compute(v) {
    const G = G_OF(v);
    if (!(G > 0)) throw new InputError('Enter a positive shear modulus.');
    const pts = points(v), fin = finOf(v), TslF = seaLevelTemp(v.Tsite, v.h0), site = { h0: v.h0, TslF };
    const flight = checkFlight(fin, pts, site), worst = flight.worst;
    if (!(worst.V > 0)) throw new InputError('Enter a flight speed above zero.');
    const f = flutterSpeed({ ...fin, h: v.h0 + worst.h, TslF });
    const target = targetFor(v, worst.M);
    const fix = remedies(fin, worst, site, target);
    const hot = checkFlight(fin, pts, { h0: v.h0, TslF: TslF + 20 }).worst.SF;
    const sens = (k, lo, hi) => { const at = (x) => { const g = { ...fin, [k]: x }; return checkFlight(g, pts, site).worst.SF; }; return [at(lo), at(hi)]; };
    const S = {
      t: sens('t', fin.t * 0.9, fin.t * 1.1), G: sens('G', fin.G * 0.9, fin.G * 1.1), b: sens('b', fin.b * 0.9, fin.b * 1.1),
      cR: sens('cR', fin.cR * 0.9, fin.cR * 1.1), cT: fin.cT > 0 ? sens('cT', fin.cT * 0.9, fin.cT * 1.1) : [worst.SF, worst.SF],
      V: [worst.SF / 0.9, worst.SF / 1.1], T: [checkFlight(fin, pts, { h0: v.h0, TslF: TslF - 10 }).worst.SF, checkFlight(fin, pts, { h0: v.h0, TslF: TslF + 10 }).worst.SF],
    };
    const SF = worst.SF, level = SF < UNSAFE_SF ? 'unsafe' : SF < target ? 'marginal' : 'safe';
    const fixes = level === 'safe' ? [] : [
      `Thicken the fins from ${Q(fin.t, LEN)} to at least <b>${Q(fix.tNeed, LEN)}</b>`,
      fix.bMax ? `or cut the semi-span from ${Q(fin.b, LEN)} to at most <b>${Q(fix.bMax, LEN)}</b>` : 'shortening the span alone cannot reach the target',
      `or use a material with G ≥ <b>${Q(fix.Gneed, MOD)}</b> (now ${Q(fin.G, MOD)})`,
    ];
    const verdict = {
      level,
      title: level === 'unsafe' ? (SF < 1 ? 'Flutter predicted below your flight speed' : 'Too little margin against flutter') : level === 'marginal' ? 'Some margin, below your target' : 'Comfortable margin against flutter',
      text: `Flutter speed ${Q(f.Vf, SPD, 4)} against ${Q(worst.V, SPD, 4)} at ${Q(worst.h, ALT)} AGL: safety factor <b>${fmt(SF, { digits: 3 })}</b> (target ${fmt(target, { digits: 3 })}${worst.M >= 1 ? ', supersonic' : ''}).`,
      fixes,
    };
    const warnings = [];
    const maxM = Math.max(...flight.rows.map((r) => r.M));
    if (maxM > 1.5) warnings.push({ level: 'warn', text: `The flight reaches Mach ${fmt(maxM, { digits: 3 })}: Martin’s correlation was validated to about Mach 1.5 (Bennett), so the result is extrapolated.`, fix: 'Treat the safety factor as indicative and keep a larger margin, or analyse the fin properly.' });
    if (hot < Math.max(UNSAFE_SF, target) && SF >= target) warnings.push({ level: 'warn', text: `On a day 20 °F hotter the safety factor drops to ${fmt(hot, { digits: 3 })}.`, fix: `Check the hottest day you might launch; at least ${Q(fin.t * (target / hot) ** (2 / 3), LEN)} thick fins would cover it.` });
    if (Math.max(...flight.rows.map((r) => r.h + v.h0)) > H_TROPO) warnings.push({ level: 'info', text: 'Part of the flight is above 36 000 ft, where Bennett’s equations stop; an isothermal standard layer is used there.' });
    if (/3D-printed/.test(GROUP_OF(v))) warnings.push({ level: 'warn', text: 'A 3D-printed fin’s stiffness depends on the print orientation, layer bonding, infill and temperature; OpenRocket’s value is for 100 % infill and is indicative only.', fix: 'Use a generous safety factor, or test a printed coupon; a laminated or plywood fin is far more predictable.' });
    if (/foam/.test(GROUP_OF(v)) || v.material === 'or-cork') warnings.push({ level: 'warn', text: 'Foam, cork and paper are not structural fin materials: their shear modulus is tiny, so flutter happens at very low speed.', fix: 'Use them only for low-speed models, or skin them with fibreglass or plywood.' });
    if (['g10', 'cfrp', 'or-carbon-fibre-quasi-isotropic', 'or-fibreglass', 'or-kraft-phenolic'].includes(v.material) || (v.material === 'custom' && G < 2e6)) warnings.push({ level: 'info', text: 'Composite shear moduli vary widely (G10 measurements range from 425 000 to 1 700 000 psi); the result is only as good as G.', fix: 'Use a measured or conservative G for your layup.' });
    if (v.tipToTip) warnings.push({ level: 'info', text: 'Tip-to-tip reinforcement is approximated by doubling G (Bennett) — not modelled by the correlation.' });
    if (f.eps0 < 0.25) warnings.push({ level: 'info', text: `The centroid is ahead of the usual position (ε = ${fmt(f.eps0, { digits: 3 })}); ε = 0.25 is used, the conservative choice.` });
    if (worst.h + v.h0 < 0) throw new InputError('The flight goes below sea level in this atmosphere model.');
    return {
      results: {
        SF, Vf: f.Vf, tNeed: fix.tNeed, margin: SF - 1, Mf: f.Mf, hWorst: worst.h, bMax: fix.bMax ?? '—', Gneed: fix.Gneed, SFhot: hot,
        A: f.A, lam: f.lam, tc: f.tc, S: f.S, Cx: f.Cx, eps: f.eps, DN: f.DN, a: f.a, p: f.p, Gused: G,
        Valt: altimeterCloudForm({ ...fin, h: v.h0 + worst.h, TslF }),
        Vhoult: houltWorkbook({ ...fin, h: v.h0 + worst.h, Tsl: TslF + 459.67 }).Mf * f.a,
        ...Object.fromEntries(Object.entries(S).map(([k, [lo, hi]]) => [`sens_${k}`, `${fmt(lo, { digits: 3 })} … ${fmt(hi, { digits: 3 })}`])),
      },
      warnings, verdict, o: { f, worst, flight, target, fix, TslF, fin, sens: S }, v,
    };
  },
  plots: [
    {
      id: 'altitude', title: 'Flutter speed through the flight',
      info: { text: 'Flutter speed against altitude (it rises as the air thins) with your flight on top. Above the red line the fins are predicted to flutter (shaded); the dashed line is the flutter speed divided by your target safety factor — stay below it.', doc: 'flight' },
      build(v, out, { U }) {
        const ua = U(ALT), us = U(SPD), { fin, TslF, flight, target, worst } = out.o;
        const hTop = Math.max(...flight.rows.map((r) => r.h), 1000) * 1.25, pts = [];
        for (let i = 0; i <= 80; i++) { const h = (hTop * i) / 80; pts.push([ua.v(h), us.v(flutterSpeed({ ...fin, h: v.h0 + h, TslF }).Vf)]); }
        const fl = flight.rows.map((r) => [ua.v(r.h), us.v(r.V)]);
        return { x: { label: 'Altitude above the launch site $h$', unit: ua.label }, y: { label: 'Speed', unit: us.label }, includeZero: true,
          series: [
            { name: 'flutter speed $V_f$ (danger above)', points: pts, area: 'above', color: 'var(--danger)', smooth: true },
            { name: `$V_f$ / ${fmt(target, { digits: 3 })} (target)`, points: pts.map(([x, y]) => [x, y / target]), dashed: true, color: 'var(--warn)', smooth: true },
            { name: 'your flight', points: fl, color: 'var(--text)', width: 2.4, dots: fl.length < 40 },
          ],
          markers: [{ x: ua.v(worst.h), y: us.v(worst.V), label: `worst: SF ${fmt(worst.SF, { digits: 3 })}`, color: worst.SF < UNSAFE_SF ? 'var(--danger)' : worst.SF < target ? 'var(--warn)' : 'var(--ok)' }] };
      },
    },
    {
      id: 'thickness', title: 'Safety factor against fin thickness', explore: true,
      info: { text: 'Safety factor at the worst point as the thickness changes (∝ t^1.5). Where the curve crosses the target line is the thickness you need.', doc: 'remedies' },
      build(v, out, { U }) {
        const ul = U(LEN), { fin, fix, target, flight } = out.o, tMax = Math.max(2 * fin.t, 1.3 * fix.tNeed), pts = [];
        for (let i = 1; i <= 60; i++) { const t = (tMax * i) / 60; pts.push([ul.v(t), checkFlight({ ...fin, t }, flight.rows, { h0: v.h0, TslF: out.o.TslF }).worst.SF]); }
        return { x: { label: 'Fin thickness $t$', unit: ul.label }, y: { label: 'Safety factor $SF$', unit: '' }, includeZero: true, series: [{ name: 'SF', points: pts, smooth: true }],
          hlines: [{ y: target, label: `target ${fmt(target, { digits: 3 })}`, color: 'var(--warn)' }, { y: UNSAFE_SF, label: 'unsafe below 1.2', color: 'var(--danger)' }],
          vlines: [{ x: ul.v(fix.tNeed), label: 't_{req}', color: 'var(--text-3)' }], markers: [{ x: ul.v(fin.t), y: out.results.SF, label: 'your fin' }] };
      },
    },
    {
      id: 'span', title: 'Safety factor against semi-span', explore: true,
      info: { text: 'A longer span raises the aspect ratio and lowers the flutter speed. Where the curve crosses the target line is the longest span you can use.', doc: 'remedies' },
      build(v, out, { U }) {
        const ul = U(LEN), { fin, fix, target, flight } = out.o, bTop = Math.max(2 * fin.b, 1.3 * (fix.bMax || 0)), pts = [];
        for (let i = 1; i <= 60; i++) { const b = (bTop * i) / 60; pts.push([ul.v(b), checkFlight({ ...fin, b }, flight.rows, { h0: v.h0, TslF: out.o.TslF }).worst.SF]); }
        return { x: { label: 'Semi-span $b$', unit: ul.label }, y: { label: 'Safety factor $SF$', unit: '' }, includeZero: true, series: [{ name: 'SF', points: pts, smooth: true }],
          hlines: [{ y: target, label: `target ${fmt(target, { digits: 3 })}`, color: 'var(--warn)' }, { y: UNSAFE_SF, label: 'unsafe below 1.2', color: 'var(--danger)' }],
          ...(fix.bMax ? { vlines: [{ x: ul.v(fix.bMax), label: 'b_{max}', color: 'var(--text-3)' }] } : {}), markers: [{ x: ul.v(fin.b), y: out.results.SF, label: 'your fin' }] };
      },
    },
  ],
  schematicTitle: 'Fin planform and root section',
  schematicHint: 'The planform to scale with its centroid and quarter-chord line (they set ε), and the root section that sets t/c. The fin is coloured by the verdict. Drag the tip to change span and sweep, the root trailing edge to change the root chord',
  schematic(ctx, v, out) {
    const W = 760, H = 330, o = out.o, f = o.f;
    const fr = ctx.frame({ width: W, height: H, label: 'Fin planform and root section' });
    const g = fr.layer('main'); g.replaceChildren();
    const L = (x) => Q(x, LEN);
    const xs = [0, v.cR, v.m, v.m + v.cT], x0 = Math.min(...xs), x1 = Math.max(...xs);
    const k = Math.min(420 / Math.max(x1 - x0, 1e-9), 200 / v.b), bodyY = 262, ox = 60 - x0 * k;
    const P = (x, y) => [ox + x * k, bodyY - y * k];
    const rootLE = P(0, 0), rootTE = P(v.cR, 0), tipLE = P(v.m, v.b), tipTE = P(v.m + v.cT, v.b);
    const col = out.verdict?.level === 'unsafe' ? 'var(--danger)' : out.verdict?.level === 'marginal' ? 'var(--warn)' : 'var(--ok)';
    g.append(s('rect', { x: 30, y: bodyY, width: 480, height: 26, class: 'sc-body-2' }));
    g.append(text(38, bodyY + 18, 'body', { cls: 'sc-dim-text', size: 10 }));
    g.append(s('path', { d: path([rootLE, rootTE, tipTE, tipLE], true), fill: col, 'fill-opacity': 0.14, stroke: col, 'stroke-width': 2, 'data-field': 'cR cT b m' }));
    // quarter-chord and half-chord lines and the centroid: ε = C_x/c_R − 0.25
    const line = (fr0) => s('line', { x1: rootLE[0] + fr0 * (rootTE[0] - rootLE[0]), y1: bodyY, x2: tipLE[0] + fr0 * (tipTE[0] - tipLE[0]), y2: tipLE[1], class: 'sc-thin', 'stroke-dasharray': '5 4' });
    g.append(line(0.25), line(0.5));
    const [cx, cy] = P(f.Cx, v.b * (v.cR + 2 * v.cT) / (3 * (v.cR + v.cT)));
    g.append(s('circle', { cx, cy, r: 5, fill: 'var(--text)', 'data-field': 'm' }));
    g.append(text(cx + 8, cy - 6, `centroid · ε = ${fmt(f.eps, { digits: 3 })}`, { size: 10.5, field: 'm' }));
    g.append(dim(fr, rootLE[0], bodyY, rootTE[0], bodyY, `c_R = ${L(v.cR)}`, { off: 40, textOff: 14, field: 'cR' }));
    g.append(dim(fr, tipLE[0], tipLE[1], tipTE[0], tipTE[1], `c_T = ${L(v.cT)}`, { off: -16, field: 'cT' }));
    g.append(dim(fr, Math.max(rootTE[0], tipTE[0]) + 8, bodyY, Math.max(rootTE[0], tipTE[0]) + 8, tipLE[1], `b = ${L(v.b)}`, { off: -14, field: 'b' }));
    g.append(dim(fr, rootLE[0], tipLE[1] - 4, tipLE[0], tipLE[1] - 4, `m = ${L(v.m)}`, { off: -18, field: 'm' }));
    // root section to scale (t/c), and the result
    const sx = 548, sw = 190, sy = 150, ks = sw / v.cR, th = Math.max(1.5, v.t * ks);
    g.append(s('rect', { x: sx - 12, y: 52, width: sw + 24, height: 200, rx: 8, fill: 'var(--surface-2)', stroke: 'var(--border)' }));
    g.append(text(sx, 72, 'ROOT SECTION (to scale)', { cls: 'sc-dim-text', size: 10 }));
    g.append(s('rect', { x: sx, y: sy - th / 2, width: sw, height: th, rx: th / 2, class: 'sc-body', 'data-field': 't' }));
    g.append(text(sx, sy - th / 2 - 12, `t = ${L(v.t)} · t/c = ${fmt(f.tc, { digits: 3 })}`, { size: 11, field: 't' }));
    g.append(s('text', { x: sx, y: 200, style: `fill:${col};font:700 15px var(--font-sans)` }, `SF = ${fmt(out.results.SF, { digits: 3 })}`));
    g.append(text(sx, 222, `V_f = ${Q(f.Vf, SPD, 4)}`, { size: 11 }));
    g.append(text(sx, 240, `flying ${Q(o.worst.V, SPD, 4)}`, { size: 11 }));
    g.append(text(20, H - 6, 'Planform to scale; section thickness drawn at least 1.5 px', { cls: 'sc-dim-text', size: 10 }));
    ctx.handle('tip', tipLE[0], tipLE[1], {
      field: 'b m', title: 'Drag: up/down changes the semi-span, left/right the sweep length',
      onDrag: (px, py) => { ctx.setValue('b', Math.max(0.05 * v.cR, (bodyY - py) / k), { round: 0.05 }); ctx.setValue('m', (px - ox) / k, { round: 0.05 }); },
      onKey: (dx, dy) => { if (dy) ctx.setValue('b', v.b * (1 + 0.02 * dy)); if (dx) ctx.setValue('m', v.m + 0.05 * dx); },
    });
    ctx.handle('rootTE', rootTE[0], rootTE[1], {
      field: 'cR', title: 'Drag left/right to change the root chord',
      onDrag: (px) => ctx.setValue('cR', Math.max(0.1, (px - ox) / k), { round: 0.05 }),
      onKey: (dx) => ctx.setValue('cR', v.cR * (1 + 0.02 * dx)),
    });
  },
  limits: [
    '<b>An estimate, not a guarantee.</b> Martin (NACA TN 4197, 1958) intended the correlation as a guide for the preliminary design of lifting surfaces; keep a margin (Bennett: under 25 % is a poor risk, under 20 % potentially unsafe).',
    'Flat, constant-thickness fins with a trapezoidal planform. For a tapered thickness use the average or mid-span thickness; for an elliptical fin use the pseudo tip chord that gives the same area (Bennett).',
    'Fins cantilevered rigidly from the body: no fin-body or attachment flexibility; fin cans, through-the-wall tabs and tip-to-tip layups are not modelled (doubling G for tip-to-tip is a rough allowance).',
    'Validated to about Mach 1.5 (Bennett). Above 36 000 ft an isothermal standard layer extends Bennett’s tropospheric equations.',
    'The shear modulus dominates the answer; composite values vary widely and are anisotropic.',
    'Centroid correction (ε) as given by Bennett for trapezoids; ε below 0.25 is not credited (taken as 0.25).',
    'Each panel is treated alone; fin count does not enter.',
  ],
  symbols: {
    V_f: 'flutter speed (ft/s or m/s)', a: 'speed of sound at that height (ft/s or m/s)', G: 'shear modulus of the fin material (psi or GPa)', A: 'aspect ratio of one panel', 't/c': 'thickness ratio on the root chord', '\\lambda': 'taper ratio', 'p/p_0': 'pressure ratio', p: 'air pressure at that height (psi or kPa)', p_0: 'sea-level pressure, 14.696 psi (101.3 kPa)',
    DN: 'Martin’s denominator constant (psi or kPa)', '\\varepsilon': 'centroid offset behind the quarter chord, as a fraction of the root chord', '\\kappa': 'ratio of specific heats of air, 1.4', C_x: 'centroid distance behind the root leading edge (in or mm)', c_R: 'root chord (in or mm)', c_T: 'tip chord (in or mm)', b: 'semi-span (in or mm)', m: 'sweep length (in or mm)', t: 'fin thickness (in or mm)', S: 'panel area (in² or cm²)',
    SF: 'safety factor', 'SF_{target}': 'target safety factor', V: 'flight speed (ft/s or m/s)', h: 'height (ft or m)', h_0: 'launch-site elevation (ft or m)', T_0: 'launch-site temperature', 'T_{SL}': 'sea-level temperature of the lapse line (°F)', T_F: 'air temperature (°F)', M_f: 'flutter Mach number', 't_{req}': 'thickness for the target (in or mm)', 'G_{req}': 'shear modulus for the target (psi or GPa)', 'b_{max}': 'longest semi-span for the target (in or mm)',
    'V(h)': 'flight speed at height $h$',
    'V_f(h)': 'flutter speed at height $h$',
    E: 'Young’s modulus of the material (psi or GPa)',
    '\\nu': 'Poisson’s ratio of the material',
    'G_{used}': 'shear modulus used (psi or GPa)',
    h_w: 'height of the worst point above the site (ft or m)',
    'V_{f,AC}': 'flutter speed, altimetercloud.com form',
    'V_{f,H}': 'flutter speed, Hoult workbook form',
    c: 'chord used for the thickness ratio: the root chord (in or mm)',
  },
  report(v, out, R) {
    const o = out.o, f = o.f, n = R.n, l = (x) => R.v(x, LEN), w = o.worst;
    return [{
      title: 'Method',
      text: 'Bending–torsion flutter speed from D. J. Martin’s correlation (NACA TN 4197, 1958) as restated and corrected by J. K. Bennett (Peak of Flight 615, 2023): the speed of sound times the root of the shear modulus over a geometry and pressure term. The thickness ratio uses the root chord; the constant DN depends on the fin centroid. Air from the standard lapse line through the launch-site temperature. The safety factor is the flutter speed over the flight speed at the worst point.',
      steps: [
        { label: 'Panel geometry', lhs: 'S', eq: '\\frac{(c_R+c_T)\\,b}{2}', sub: `\\frac{(${l(v.cR)}+${l(v.cT)})\\times${l(v.b)}}{2}`, res: R.Q(f.S, { dim: 'area', internal: 'in2' }) },
        { lhs: 'A', eq: '\\frac{b^2}{S}', res: n(f.A) },
        { lhs: '\\lambda', eq: '\\frac{c_T}{c_R}', res: n(f.lam) },
        { lhs: 't/c', eq: '\\frac{t}{c_R}', sub: `\\frac{${l(v.t)}}{${l(v.cR)}}`, res: n(f.tc) },
        { label: 'Centroid and denominator constant (Bennett)', lhs: 'C_x', eq: '\\frac{2c_Tm+c_T^2+mc_R+c_Tc_R+c_R^2}{3(c_T+c_R)}', res: R.Q(f.Cx, LEN) },
        { lhs: '\\varepsilon', eq: '\\max\\left(\\frac{C_x}{c_R}-0.25,\\;0.25\\right)', res: n(f.eps) },
        { lhs: 'DN', eq: '\\frac{24\\,\\varepsilon\\,\\kappa\\,p_0}{\\pi}', res: R.Q(f.DN, MOD) },
        { label: 'Air at the worst point', lhs: 'T_F', eq: 'T_{SL}-0.00356\\,(h_0+h)', res: `${n(f.TF)}\\ {}^{\\circ}\\mathrm{F}` },
        { lhs: 'a', eq: '49.03\\sqrt{T_F+459.7}', res: R.Q(f.a, SPD) },
        { lhs: 'p/p_0', eq: '\\left(\\frac{T_F+459.7}{518.7}\\right)^{5.256}', res: n(f.pr) },
        { label: 'Flutter speed', lhs: 'V_f', eq: 'a\\sqrt{\\frac{G}{\\frac{DN\\,A^3}{(t/c)^3(A+2)}\\,\\frac{\\lambda+1}{2}\\,\\frac{p}{p_0}}}', res: R.Q(f.Vf, SPD) },
        { label: 'Safety factor at the worst point', lhs: 'SF', eq: '\\frac{V_f}{V}', sub: `\\frac{${R.v(f.Vf, SPD)}}{${R.v(w.V, SPD)}}`, res: n(w.SF) },
        { label: 'Thickness, span and modulus for the target', lhs: 't_{req}', eq: 't\\,(SF_{target}/SF)^{2/3}', res: R.Q(o.fix.tNeed, LEN) },
        { lhs: 'G_{req}', eq: 'G\\,(SF_{target}/SF)^{2}', res: R.Q(o.fix.Gneed, MOD) },
      ],
    }];
  },
  references: [],
  externalRefs: [
    { title: 'Fin Flutter Analysis Revisited (Again)', authors: 'J. K. Bennett', venue: 'Apogee Components, Peak of Flight newsletter 615, 2023', url: 'https://www.apogeerockets.com/education/downloads/Newsletter615.pdf' },
    { title: 'Rocket Fin Flutter Calculator (cross-check)', authors: 'Altimeter Cloud', venue: 'altimetercloud.com', url: 'https://www.altimetercloud.com/tools/fin_flutter/' },
    { title: 'Summary of Flutter Experiences as a Guide to the Preliminary Design of Lifting Surfaces on Missiles (NACA TN 4197) — cited through Bennett; not read directly', authors: 'D. J. Martin', venue: 'NACA, 1958', url: null },
  ],
  examples: [
    { name: 'Bennett’s example: G10, 1/8 in, 1500 ft/s at 14 000 ft AGL', values: BENNETT },
    { name: 'Same fin, 3/16 in thick (Bennett’s choice)', values: { ...BENNETT, t: 0.1875 } },
    { name: 'Same, 3/16 in on a 95 °F day', values: { ...BENNETT, t: 0.1875, Tsite: 95 } },
    { name: 'Mid-power plywood fin, 650 ft/s', values: { ...BENNETT, cR: 5, cT: 2, b: 3, m: 2.5, t: 0.125, material: 'birchply', h0: 600, Tsite: 70, Vmax: 650, hMax: 1500 } },
  ],
};
