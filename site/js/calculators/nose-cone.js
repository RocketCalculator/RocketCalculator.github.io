// Nose Cone Design — UI definition. Merges the former Ogive Nose Profile, Optimum Nose Shape and Nose Pressure
// Distribution calculators and adds supersonic tip flow, drag, lift, loads and heating (calc/noseCone.js).
import { SHAPES, analyseNose, noseProfile, measure, tipAngle, radiusAt as radiusAtPts } from '../calc/noseCone.js';
import { optimumExponent, noseCp, superellipse } from '../calc/optnose.js';
import { coneTable, machAngle, stagT } from '../calc/conical.js';
import { interp } from '../calc/trajectory.js';
import { atmosphere } from '../calc/geophysics.js';
import { s, fmt, InputError } from '../util.js';
import { text, path, dim } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const LEN = { dim: 'length', internal: 'in' };
const ALT = { dim: 'altitude', internal: 'ft' };
const ANG = { dim: 'angle', internal: 'deg' };
const NONE = { dim: 'none' };
const TEMP = { dim: 'temperature', internal: 'R', units: { si: 'degC', us: 'degF' } };
const FORCE = { dim: 'force', internal: 'lbf' };
const MOM = { dim: 'moment', internal: 'lbfin' };
const PRES = { dim: 'pressure', internal: 'psf' };
const D2R = Math.PI / 180, G = 1.4;
const Q = (x, spec, d = 3) => `${fmt(toDisplay(x, spec), { digits: d })} ${unitLabel(displayUnit(spec))}`;
const custom = (v) => v.noseType === 'custom', notCustom = (v) => !custom(v);
const is = (...t) => (v) => t.includes(v.noseType);
const ST = { safe: 'ok', marginal: 'warn', unsafe: 'err' };
const FAIRED = [{ x: 0, r: 0 }, { x: 4, r: 1.2 }, { x: 8, r: 1.9 }, { x: 12, r: 2.4 }, { x: 16, r: 2.72 }, { x: 20, r: 2.9 }, { x: 24, r: 3 }, { x: 30, r: 3.06 }, { x: 36, r: 3.08 }];
// shapes compared on the drag plot (same length and radius as yours)
const COMPARE = [['cone', 'Conical'], ['ogive', 'Tangent ogive'], ['vonkarman', 'Von Kármán'], ['lvhaack', 'LV-Haack']];

/** Calc input from the form values (lengths in inches). */
function params(v, over = {}) {
  const w = { ...v, ...over }, atm = atmosphere({ h: w.h, ho: 0, To: 518.67, phi: 45 });
  return { type: w.noseType, L: w.L, R: w.R, k: w.k, pow: w.pow, C: w.C, seN: w.seN, bL: w.bL, bR: w.bR, sRho: w.sRho, rn: w.blunt ? w.rn : 0, custom: w.profile,
    M: w.M, alpha: w.alpha, atm, bodyLen: w.L + w.bodyLen, CD: w.CD, CDb: w.CDb, eps: w.eps * D2R, g: G };
}
// Prandtl–Meyer expansion waves: the same light red as the Single Wedge's fan
const FAN = 'var(--series-6, var(--text-2))';
const levelColor = (lv) => (lv === 'unsafe' ? 'var(--danger)' : lv === 'marginal' ? 'var(--warn)' : 'var(--ok)');

export default {
  slug: 'nose-cone',
  topic: 'ogive-nose',
  title: 'Nose Cone Design',
  subtitle: 'Shape a nose cone and see what the air does to it: <b>drag</b>, the <b>shock waves</b> at the tip, lift and the loads along it, the pressure on its surface and how hot it gets — for twelve classic shapes, from subsonic to Mach 5.',
  verdict: true,
  tiers: true,
  intro: {
    what: 'Draws your nose cone to scale from its shape, length and diameter, then works out how the air flows over it at your Mach number and angle of attack: the pressure along it, the shock waves at the tip, its drag, lift and centre of pressure, the shear and bending it carries, and the temperature at the tip.',
    why: 'The nose meets the air first. Its shape decides much of the rocket’s drag near and above the speed of sound, where its centre of pressure sits for stability, how strong the tip shocks are, and how hot the tip gets.',
    when: 'Choosing a nose shape and fineness for your speed range, comparing shapes, checking a 3D-printed or composite nose against heating, and getting the nose’s lift and bending loads.',
  },
  info: {
    text: [
      'Below the speed of sound the air speeds up over the shoulder of the nose and its pressure drops; the “critical Mach number” is the flight speed at which that air first reaches the speed of sound.',
      'Above the speed of sound a pointed nose wears a cone-shaped shock wave at its tip. The sharper the tip and the faster the flight, the more swept-back and weaker the shock. Too blunt a tip and the shock stands off in front of it.',
      'At an angle of attack the nose also lifts, like a small wing; that lift acts at its centre of pressure and bends the nose.',
    ],
    tex: 'C_D=\\frac{D}{qA},\\quad q=\\tfrac12\\rho V^2=\\tfrac12\\gamma pM^2',
    steps: ['Pick a shape and enter the length and base diameter (or your own profile).', 'Enter the Mach number, angle of attack and altitude you want to check.', 'Enter the wall and the material’s temperature limit.', 'Read the verdict, the drawing and the plots; compare shapes on the drag plot.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'shape', title: 'Nose shape',
      fields: [
        { id: 'noseType', shared: 'noseType', label: 'Shape', kind: 'select', default: 'ogive', options: SHAPES,
          info: { text: ['The family of curves that sets the nose profile (Crowell).', 'Cones and ogives are easy to make; Von Kármán and LV-Haack shapes have the least supersonic drag for their length; elliptical and power-series noses are blunt and good below the speed of sound.', 'The drag plot compares the common shapes at your length and diameter, so you can see what changing family buys you.'], doc: 'shapes' } },
        { id: 'k', label: 'Parabolic parameter', sym: "K'", ...NONE, default: 0.75, min: 0, max: 1, slider: { min: 0, max: 1, step: 0.05 }, when: is('parabolic'),
          info: { text: ['Chooses the member of the parabolic family of nose shapes.', '0 gives a cone, 1 a full parabola that meets the body tube smoothly; ½ and ¾ are common.', 'Higher values make the nose fuller near the tip, moving its lift forward slightly and lowering subsonic drag.'], tex: 'r=R\\frac{2(x/L)-K\'(x/L)^2}{2-K\'}', doc: 'shapes', range: '0.5–1; 0.75 is common.' } },
        { id: 'pow', label: 'Power-series exponent', sym: 'n', ...NONE, default: 0.5, min: 0.05, max: 1, slider: { min: 0.1, max: 1, step: 0.05 }, when: is('power'),
          info: { text: ['Chooses the member of the power-series family.', '1 gives a cone; ½ the blunt “parabolic” model-rocket nose; smaller values are blunter. The tip looks sharp above about 0.7.', 'Blunter noses suit subsonic flight; near Mach 1 and above they make more wave drag.'], tex: 'r=R\\,(x/L)^n', doc: 'shapes', range: '0.5–0.75.' } },
        { id: 'C', label: 'Haack parameter', sym: 'C', ...NONE, default: 0.1, min: 0, max: 0.67, slider: { min: 0, max: 0.67, step: 0.01 }, when: is('haack'),
          info: { text: ['Chooses the member of the Haack family.', '0 is the Von Kármán (least drag for a given length and diameter), 1/3 the LV-Haack (least drag for a given length and volume).', 'Larger values bulge more and hold more volume.'], tex: 'r=\\frac{R}{\\sqrt\\pi}\\sqrt{\\theta-\\tfrac12\\sin2\\theta+C\\sin^3\\theta},\\ \\theta=\\cos^{-1}(1-2x/L)', doc: 'shapes', range: '0 (Von Kármán) or 1/3 (LV-Haack).' } },
        { id: 'seN', label: 'Superellipse exponent', sym: 'n', ...NONE, default: 1.8, min: 1, max: 4, slider: { min: 1, max: 4, step: 0.05 }, when: is('superellipse'),
          info: { text: ['The exponent of the superellipse family.', '1 is a cone and 2 an ellipse. Hoult and Felkel found the best subsonic nose in this family; the result “optimum superellipse exponent” gives it for your fineness.', 'The button sets it to that optimum.'], tex: '(r/R)^n+(1-x/L)^n=1', doc: 'optimum', range: '1.5–2.5.' } },
        { id: 'bL', label: 'First cone length fraction', sym: 'L_1/L', ...NONE, default: 0.4, min: 0.05, max: 0.95, slider: { min: 0.05, max: 0.95, step: 0.01 }, when: is('biconic'),
          info: { text: ['How much of the nose length the sharp front cone takes; the rest is a frustum out to the body.', 'From your nose drawing.', 'A longer front cone gives a sharper tip.'], doc: 'shapes', tex: 'L_1=(L_1/L)\\,L', range: '0.3–0.6.' } },
        { id: 'bR', label: 'First cone radius fraction', sym: 'R_1/R', ...NONE, default: 0.6, min: 0.05, max: 0.98, slider: { min: 0.05, max: 0.98, step: 0.01 }, when: is('biconic'),
          info: { text: ['Radius at the joint between the two cones, as a fraction of the base radius.', 'From your nose drawing.', 'Above the straight line from the tip to the base the nose is fuller.'], doc: 'shapes', tex: 'R_1=(R_1/R)\\,R', range: '0.5–0.8.' } },
        { id: 'sRho', label: 'Secant ogive radius / tangent ogive radius', sym: '\\rho/\\rho_t', ...NONE, default: 1.5, min: 0.5, max: 10, slider: { min: 0.55, max: 4, step: 0.05 }, when: is('secant'),
          info: { text: ['The secant ogive’s circle radius over the tangent ogive’s.', 'Above 1 it is a tangent ogive with its base cut off: slimmer, with a corner at the shoulder. Below 1 it bulges wider than the body (like the Honest John).', 'The circle must stay larger than half the length.'], tex: '\\rho_t=\\frac{R^2+L^2}{2R}', doc: 'shapes', range: '0.6–3.' } },
        { id: 'profile', label: 'Profile points (station from tip, radius)', kind: 'table', minRows: 3, when: custom,
          columns: [{ id: 'x', label: 'Station', ...LEN }, { id: 'r', label: 'Radius', ...LEN }], default: FAIRED,
          info: { text: ['Your own profile, from the tip (station 0) to the shoulder.', 'Measure the nose at several stations, or export them from your CAD model; the last row sets the length and base radius.', 'Everything (drag, centre of pressure, shocks) is worked out from these points with straight lines between them.'], doc: 'shapes' } },
        { id: 'blunt', label: 'Round the tip', kind: 'bool', default: false, when: notCustom,
          info: { text: ['Replace the sharp tip with a spherical cap that meets the shape smoothly (the nose gets slightly shorter).', 'Real noses are rounded for strength and safety.', 'A little rounding costs almost no drag (Crowell); a blunt tip detaches the tip shock above Mach 1.'], doc: 'shapes' } },
        { id: 'rn', label: 'Tip radius', sym: 'r_n', ...LEN, default: 0.3, min: 0.001, max: 50, slider: { min: 0.02, max: 2, step: 0.01 }, when: (v) => notCustom(v) && v.blunt,
          info: { text: ['Radius of the rounded tip.', 'Bluffness is the tip diameter over the base diameter; about 0.1 is typical of hobby noses.', 'Up to about 0.2 bluffness costs almost no drag (Crowell); larger tips add pressure drag and heat the tip less.'], range: 'Bluffness 0.05–0.2.', doc: 'shapes', tex: '\\text{bluffness}=\\frac{r_n}{R}' } },
      ],
    },
    {
      id: 'size', title: 'Size',
      fields: [
        { id: 'L', shared: 'noseL', label: 'Nose length (tip to shoulder)', sym: 'L', ...LEN, default: 30, min: 0.1, max: 2000, slider: { min: 2, max: 120, step: 0.1 }, when: notCustom,
          info: { text: ['From the tip to where the nose meets the body tube, without the shoulder that slides into the tube.', 'Measure along the axis, not along the curved surface.', 'Longer noses (higher fineness) have less pressure drag and a higher critical Mach number, but more skin friction and weight. Drag the tip in the drawing to change it.'], range: 'Fineness L/D 3–7; 5 is common.', doc: 'shapes', tex: '\\text{fineness}=\\frac{L}{2R}' } },
        { id: 'R', shared: 'bodyR', label: 'Base radius (half the body diameter)', sym: 'R', ...LEN, default: 3, min: 0.05, max: 200, slider: { min: 0.5, max: 12, step: 0.05 }, when: notCustom,
          info: { text: ['Half the outside diameter of the body tube the nose fits.', 'Measure the tube and halve it.', 'With the length it sets the fineness; a fatter nose of the same length has more drag. Drag the shoulder in the drawing to change it.'], doc: 'shapes', tex: 'A=\\pi R^2', range: '1–3 in (25–75 mm) for high-power rockets.' } },
        { id: 'bodyLen', label: 'Body length behind the nose', sym: 'L_b', ...LEN, default: 78, min: 0, max: 5000, slider: { min: 0, max: 300, step: 1 },
          info: { text: ['How long the body tube is behind the nose.', 'Measure from the shoulder to the base.', 'It only enters the subsonic pressure model, where the body and its wake affect the pressure on the nose.'], doc: 'subsonic', tex: '\\text{fineness of the body}=\\frac{L_b}{2R}', range: '5–20 body diameters.' } },
      ],
    },
    {
      id: 'flight', title: 'Flight condition',
      fields: [
        { id: 'M', label: 'Mach number', sym: 'M', ...NONE, default: 1.4, min: 0, max: 6, slider: { min: 0, max: 5, step: 0.01 },
          info: { text: ['Flight speed divided by the speed of sound. Use the peak Mach number from the Trajectory Simulation.', 'Below the critical Mach number the subsonic model applies; from about Mach 1.1 the supersonic one. In between (transonic) no simple method is reliable.', 'Faster flight raises the drag, the tip temperature and the shock angles.'], doc: 'overview', tex: '\\mu=\\sin^{-1}(1/M)', range: '0.3–0.9 subsonic; 1.1–3 for supersonic amateur flights.' } },
        { id: 'alpha', label: 'Angle of attack', sym: '\\alpha', ...ANG, default: 4, min: 0, max: 20, slider: { min: 0, max: 15, step: 0.25 },
          info: { text: ['The angle between the nose axis and the oncoming air, from gusts, wind shear or coning.', 'It makes the nose lift and bend, and tilts the tip shocks.', 'Lift and the shoulder bending moment grow in proportion. Drag the airflow arrow in the drawing to change it.'], range: 'A few degrees in normal flight; 5–10° in strong wind shear.', doc: 'lift', tex: 'N=qA\\,C_{N\\alpha}\\,\\alpha' } },
        { id: 'h', label: 'Altitude (above sea level)', sym: 'h', ...ALT, default: 10000, min: 0, max: 150000, slider: { min: 0, max: 60000, step: 100 },
          info: { text: ['The altitude of the flight condition, above sea level.', 'It sets the air temperature, pressure and density (standard day, Hoult’s atmosphere).', 'Higher means thinner air: less dynamic pressure, lift and drag force, and colder air.'], doc: 'overview', tex: 'q=\\tfrac12\\gamma p(h)M^2', range: 'Where the Mach number peaks: usually 1–5 km.' } },
      ],
    },
    {
      id: 'build', title: 'Construction',
      fields: [
        { id: 'Tmax', label: 'Material temperature limit', sym: 'T_{max}', ...TEMP, default: (120 + 273.15) * 1.8, min: 300, max: 3000, slider: { min: 450, max: 1500, step: 1 },
          info: { text: ['The highest temperature your nose material can take without softening: the glass-transition or heat-deflection temperature from its data sheet.', 'The verdict flags (as marginal) a stagnation temperature above this limit: the hottest the air can make the tip.', 'Short boosts heat the skin far less; this tool does not model the heating over time.'], range: 'Approximate, check your data sheet: PLA 55–60 °C, PETG 75–80 °C, ABS ~100 °C, glass/epoxy 100–150 °C, aluminium (strength) 150–200 °C.', doc: 'heating', tex: 'T_0\\le T_{max}' } },
        { id: 't', label: 'Wall thickness', sym: 't', ...LEN, default: 0.08, min: 0, max: 5, slider: { min: 0, max: 0.5, step: 0.005 },
          info: { text: ['Thickness of the nose shell.', 'Measure it, or take it from the print settings or layup.', 'Only used for the nose mass (thin-shell estimate); 0 skips it.'], doc: 'shapes', tex: 'm\\approx\\rho_m\\,S\\,t', range: '1–3 mm (0.04–0.12 in).' } },
        { id: 'rho', label: 'Material density', sym: '\\rho_m', dim: 'matDensity', internal: 'lbin3', default: 1.8 / 27.679904710203, min: 0, max: 1, slider: { min: 0, max: 0.3, step: 0.001 },
          info: { text: ['Density of the shell material.', 'From the data sheet.', 'Only used for the nose mass.'], range: 'PLA 1.24, fibreglass 1.8–2.0, aluminium 2.7 g/cm³.', doc: 'shapes', tex: 'm\\approx\\rho_m\\,S\\,t' } },
      ],
    },
    {
      id: 'model', title: 'Subsonic pressure model (advanced)',
      fields: [
        { id: 'CD', label: 'Rocket drag coefficient (with base)', sym: 'C_D', ...NONE, default: 0.3755, min: 0.01, max: 2, slider: { min: 0.1, max: 1, step: 0.005 },
          info: { text: ['Drag coefficient of the whole rocket, from the Drag Coefficient calculator.', 'With the base drag it sets the size of the wake behind the rocket.', 'The subsonic pressure model needs it; it does not change the supersonic results.'], doc: 'subsonic', range: '0.3–0.6.', tex: '\\text{wake size}\\propto C_D-C_{Db}' } },
        { id: 'CDb', label: 'Base drag coefficient', sym: 'C_{Db}', ...NONE, default: 0.0813, min: 0, max: 0.9, slider: { min: 0, max: 0.5, step: 0.005 }, info: { doc: 'subsonic', text: ['The base-drag part of the rocket’s drag coefficient, from the Drag Coefficient calculator.', 'It sets how wide the wake behind the base is.', 'Only the subsonic pressure model uses it.'], range: '0.05–0.2.', tex: '\\text{wake size}\\propto C_{Db}' } },
        { id: 'eps', label: 'Wake convergence half-angle', sym: '\\varepsilon', ...ANG, default: 5.73, min: 0.5, max: 45, slider: { min: 1, max: 20, step: 0.1 }, info: { doc: 'subsonic', text: ['How quickly the wake behind the base closes, as a half-angle.', 'Keep the default unless you have better data.', 'Only the subsonic pressure model uses it.'], range: 'About 5–6°.', tex: '\\text{wake length}\\propto 1/\\tan\\varepsilon' } },
        { id: 'dx', label: 'Profile table step', sym: '\\Delta x', ...LEN, default: 1, min: 0.01, max: 100, info: { text: ['Spacing of the stations in the exported profile table (the “Profile coordinates” plot in Explore).', 'Choose it to suit your lathe or printer.', 'It only changes the export, not the results.'], doc: 'shapes', tex: 'x_k=k\\,\\Delta x', range: 'About 1/30 of the nose length.' }, slider: { min: 0.05, max: 5, step: 0.05 } },
      ],
    },
  ],
  results: [
    { id: 'CD', label: 'Nose drag coefficient', sym: 'C_{D,n}', ...NONE, key: true, digits: 3, note: (x, out) => (out.o.regime === 'transonic' ? 'transonic: no reliable method' : `pressure ${fmt(out.o.CDp, { digits: 2 })} + friction ${fmt(out.o.CDf, { digits: 2 })}`),
      info: { text: ['How much drag the nose makes, on the base area: the pressure on its surface plus the skin friction. “—” in the transonic range.', 'Subsonic: Crowell’s pressure model; supersonic: second-order shock–expansion (NACA 1328); friction from Hoult’s drag memo.', 'Below Mach 0.8 the pressure part is almost zero and friction dominates; above Mach 1 the wave drag dominates, and a longer, slimmer nose cuts it.'], tex: 'C_D=C_{D,p}+C_{D,f}', doc: 'drag' } },
    { id: 'Mcr', label: 'Critical Mach number', sym: 'M_{cr}', ...NONE, key: true, digits: 3, status: (x, out) => (out.v.M < x || out.v.M >= 1.1 ? 'ok' : 'warn'),
      info: { text: ['The flight Mach number at which the air over the shoulder first reaches the speed of sound.', 'From the lowest surface pressure coefficient on the nose (the Kármán–Tsien rule).', 'Above it, shock waves start to form on the nose and drag rises steeply; longer, smoother noses push it up.'], doc: 'subsonic', tex: 'C_p(M_{cr})=C_p^*(M_{cr})' } },
    { id: 'beta', label: 'Tip shock angle (windward)', sym: '\\beta_w', ...ANG, key: true, digits: 3, status: (x, out) => (out.v.M > 1 && !out.o.shocks?.wind.attached ? 'warn' : 'ok'),
      note: (x, out) => (out.v.M <= 1 ? 'subsonic: no shock' : out.o.shocks.wind.attached ? `Mach angle ${fmt(out.o.mu / D2R, { digits: 3 })}°` : 'detached: bow shock'),
      info: { text: ['The angle of the shock wave at the tip on the side facing the air, measured from the oncoming flow.', 'A tangent-cone estimate at the tip angle plus the angle of attack.', 'It lies between the Mach angle (a very weak wave) and 90° (a normal shock); a blunt tip at low supersonic speed detaches it.'], doc: 'shocks', tex: '\\mu<\\beta_w<90^\\circ' } },
    { id: 'T0', label: 'Stagnation temperature at the tip', sym: 'T_0', ...TEMP, key: true, digits: 4, status: (x, out) => ST[out.lv.temp], note: (x, out) => `your limit ${Q(out.v.Tmax, TEMP, 4)}`,
      info: { text: ['The temperature the air reaches where it is brought to rest at the tip: the upper limit of the skin temperature.', 'The skin itself runs a little cooler and needs time to heat up.', 'It grows with the square of the Mach number: about 17 °C more than the air at Mach 0.5, 180 °C at Mach 2 near the ground. The verdict compares it with your material limit.'], tex: 'T_0=T\\left(1+\\tfrac{\\gamma-1}{2}M^2\\right)', doc: 'heating' } },
    { id: 'xcp', label: 'Centre of pressure from the tip', sym: 'x_{cp}', ...LEN, key: true, digits: 4, note: (x, out) => `${fmt(x / out.o.L, { digits: 3 })} L from the tip`,
      info: { text: ['Where the nose’s lift acts, measured from the tip.', 'Slender-body theory puts it at the length minus the nose volume over its base area.', 'Use it in the Subsonic Centre of Pressure calculator for the whole rocket’s stability.'], tex: 'x_{cp}=L-\\frac{V}{A}', doc: 'lift' } },
    { id: 'CNa', label: 'Normal-force slope', sym: 'C_{N\\alpha}', dim: 'none', digits: 3, note: () => 'per radian, on the base area', info: { text: ['How fast the nose’s lift grows with angle of attack. Slender-body theory gives 2 per radian for every pointed nose; NACA 1135 chart 8 shows cones up to 15° within about 10 % of it at supersonic speed.'], tex: 'C_{N\\alpha}=2', doc: 'lift' } },
    { id: 'N', label: 'Normal force at your angle of attack', sym: 'N', ...FORCE, digits: 4, info: { text: ['The sideways (lift) force on the nose at your Mach number, altitude and angle of attack.'], tex: 'N=qA\\,C_{N\\alpha}\\alpha', doc: 'lift' } },
    { id: 'Mbase', label: 'Bending moment at the shoulder', sym: 'M_b', ...MOM, digits: 4, info: { text: ['The bending moment the lift puts on the joint between the nose and the body (aerodynamic load only, before the nose’s own inertia is taken off).'], tex: 'M_b=2q\\alpha V', doc: 'lift' } },
    { id: 'CDp', label: 'Pressure (wave) drag coefficient', sym: 'C_{D,p}', ...NONE, digits: 3, info: { text: ['The pressure (wave) part of the nose drag.'], tex: 'C_{D,p}=\\frac{1}{A}\\oint C_p\\,dA_x', doc: 'drag' } },
    { id: 'CDf', label: 'Skin friction drag coefficient', sym: 'C_{D,f}', ...NONE, digits: 3, info: { text: ['Turbulent skin friction on the nose surface (Hoult’s drag memo), on the base area.'], doc: 'drag' } },
    { id: 'tipHalf', label: 'Tip half-angle', sym: '\\theta_{tip}', ...ANG, digits: 3, info: { text: ['Half-angle of the cone through the tip and the profile at 2 % of the length: what the oncoming flow sees first. 90° for a rounded tip.'], doc: 'shocks' } },
    { id: 'maxCone', label: 'Sharpest-attached limit (largest cone half-angle)', sym: '\\theta_{max}', ...ANG, digits: 3, info: { text: ['The bluntest cone that still keeps its shock attached at your Mach number (NACA 1135 figure 4). Above it the shock detaches.'], doc: 'shocks' } },
    { id: 'mu', label: 'Mach angle', sym: '\\mu', ...ANG, digits: 3, info: { text: ['The angle of the weakest possible pressure wave: sound waves pile up along this cone.'], tex: '\\mu=\\sin^{-1}(1/M)', doc: 'shocks' } },
    { id: 'p0', label: 'Stagnation pressure at the tip', sym: 'p_0', ...PRES, digits: 4, info: { text: ['Air pressure where the flow stops at the tip; above Mach 1 it is behind the normal shock (pitot pressure).'], doc: 'heating' } },
    { id: 'q', label: 'Dynamic pressure', sym: 'q', ...PRES, digits: 4, info: { text: ['The dynamic pressure of the flight condition.'], tex: 'q=\\tfrac12\\gamma pM^2', doc: 'overview' } },
    { id: 'Msh', label: 'Mach number at the shoulder (shock–expansion)', sym: 'M_{sh}', ...NONE, digits: 3, note: (x, out) => (out.o.se ? `after a ${fmt(out.o.se.shoulder.theta / D2R, { digits: 3 })}° corner expansion` : ''),
      info: { text: ['The Mach number on the surface just behind the shoulder: the tip cone’s surface flow, expanded along the curving nose by Prandtl–Meyer turning (NACA 1135 eq. 171) and through the corner fan where the nose meets the body.', 'A shock–expansion estimate at zero incidence; “—” below Mach 1 or for a rounded or detached tip.'], doc: 'shocks' } },
    { id: 'nOpt', label: 'Optimum subsonic superellipse exponent', sym: 'n^*', ...NONE, digits: 3, note: (x, out) => `critical Mach ${fmt(out.McrOpt, { digits: 3 })}`, info: { text: ['The superellipse with the smallest suction peak at your fineness (Felkel; Hoult): the best subsonic nose in that family, with the highest critical Mach number.'], doc: 'optimum' } },
    { id: 'cpMin', label: 'Minimum pressure coefficient (subsonic)', sym: 'C_{p,min}', ...NONE, digits: 4, info: { text: ['The lowest surface pressure coefficient on the nose at Mach 0: where the air first goes sonic.'], tex: 'C_{p,min}=\\min_x C_p(x)', doc: 'subsonic' } },
    { id: 'grad', label: 'Steepest adverse pressure gradient', sym: '\\frac{dC_p}{d(x/d)}', ...NONE, digits: 4, info: { text: ['How steeply the pressure rises again behind the shoulder, per body diameter. Steep rises help the boundary layer separate at angle of attack (nose vortices, roll lock-in).'], doc: 'subsonic' } },
    { id: 'Lfix', label: 'Nose length for an attached tip shock', sym: 'L_{att}', ...LEN, digits: 4, info: { text: ['The shortest nose of this shape whose tip shock stays attached on the windward side at your Mach number and angle of attack. “—” when it already is, or for rounded tips.'], doc: 'shocks' } },
    { id: 'Mtemp', label: 'Fastest Mach number for your material', sym: 'M_{T}', ...NONE, digits: 3, info: { text: ['The Mach number at which the stagnation temperature reaches your material limit, at this altitude.'], tex: 'M=\\sqrt{\\frac{2}{\\gamma-1}\\left(\\frac{T_{max}}{T}-1\\right)}', doc: 'heating' } },
    { id: 'Leff', label: 'Nose length after rounding', sym: 'L', ...LEN, digits: 4, info: { text: ['The nose length after rounding the tip (the cap shortens it slightly).'], doc: 'shapes' } },
    { id: 'fineness', label: 'Fineness ratio', sym: 'L/D', ...NONE, digits: 3, info: { text: ['Length over diameter: how slender the nose is.'], tex: '\\frac{L}{2R}', doc: 'shapes' } },
    { id: 'Vol', label: 'Volume', sym: 'V', dim: 'volume', internal: 'in3', digits: 4, info: { text: ['The volume inside the nose shape.'], tex: 'V=\\int_0^L\\pi r^2\\,dx', doc: 'lift' } },
    { id: 'S', label: 'Wetted area', sym: 'S', dim: 'area', internal: 'in2', digits: 4, info: { text: ['The outside (wetted) surface area of the nose.'], tex: 'S=\\int_0^L2\\pi r\\sqrt{1+(dr/dx)^2}\\,dx', doc: 'drag' } },
    { id: 'mass', label: 'Shell mass', sym: 'm', dim: 'smallMass', internal: 'lbm', digits: 3, info: { text: ['Wetted area × wall thickness × density (thin shell, no shoulder or bulkhead).'], doc: 'shapes' } },
  ],
  compute(v) {
    if (custom(v)) {
      const P = v.profile;
      if (!P?.length || P.some((r) => ![r.x, r.r].every(Number.isFinite))) throw new InputError('Every profile cell needs a number.');
      if (P.some((r, i) => i > 0 && !(r.x > P[i - 1].x))) throw new InputError('Profile stations must increase down the table.');
      if (P.some((r) => r.r < 0) || !(P[P.length - 1].r > 0)) throw new InputError('Radii cannot be negative, and the last one must be above zero.');
    }
    const p = params(v), o = analyseNose(p);
    const T = p.atm.T, results = {};
    // fixes: Mach for the temperature limit (closed form), nose length for an attached windward tip shock (bisection)
    const Mtemp = v.Tmax > T ? Math.sqrt((2 / (G - 1)) * (v.Tmax / T - 1)) : 0;
    let Lfix = null;
    if (v.M > 1 && notCustom(v) && !(v.blunt) && o.shocks && !o.shocks.wind.attached) {
      const lim = o.tip.maxCone - v.alpha * D2R;
      const ok = (L) => { const pr = noseProfile(v.noseType, L, v.R, p, 0, 240); return tipAngle(pr.pts, pr.L) < lim; };
      if (lim > 0 && ok(60 * v.R)) { let lo = v.L, hi = 60 * v.R; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; } Lfix = hi; }
    }
    // subsonic optimum (superellipse) for this fineness
    const nOpt = notCustom(v) ? optimumExponent(o.L, o.R) : null, McrOpt = nOpt ? noseCp((z) => superellipse(z, o.L, o.R, nOpt), o.L, o.R).Mcr : null;
    // verdict (D27): heating against the material, shock attachment, flight in the transonic band
    const band = (ok, near) => (ok ? 'safe' : near ? 'marginal' : 'unsafe');
    const lv = { temp: o.T0 <= v.Tmax ? 'safe' : 'marginal', shock: v.M > 1 && o.shocks && !o.shocks.wind.attached ? 'marginal' : 'safe', trans: o.regime === 'transonic' ? 'marginal' : 'safe' };
    const rank = { safe: 0, marginal: 1, unsafe: 2 }, level = Object.values(lv).reduce((w, x) => (rank[x] > rank[w] ? x : w), 'safe');
    const fixes = [];
    if (lv.temp !== 'safe') fixes.push(`For sustained flight above <b>Mach ${fmt(Mtemp, { digits: 3 })}</b> at this altitude, use a tip material rated above <b>${Q(o.T0, TEMP, 4)}</b> (metal or high-temperature composite); short boosts heat the skin far less.`);
    if (lv.shock !== 'safe') fixes.push(Lfix ? `Lengthen the nose to at least <b>${Q(Lfix, LEN, 3)}</b> (now ${Q(v.L, LEN, 3)}) for an attached tip shock, or use a sharper shape.` : 'Use a sharper tip (cone, ogive or Von Kármán) for an attached tip shock.');
    if (lv.trans !== 'safe') fixes.push(`Shocks form on the nose between Mach ${fmt(o.Mcr, { digits: 3 })} and about 1.1: ${nOpt ? `a superellipse with n = <b>${fmt(nOpt, { digits: 3 })}</b> raises the critical Mach number to ${fmt(McrOpt, { digits: 3 })}, ` : ''}a longer nose raises it further.`);
    const title = level === 'safe' ? (v.M > 1 ? 'Attached tip shock, tip cool enough for the material' : 'Subcritical flow, tip cool enough for the material')
      : lv.temp === 'marginal' ? 'The air at the tip is hotter than your material’s limit' : lv.shock !== 'safe' ? 'Tip too blunt: the shock stands off the tip' : 'Transonic: shock waves on the nose';
    const verdict = {
      level, title, fixes: fixes.slice(0, 3),
      text: `At Mach ${fmt(v.M, { digits: 3 })} and ${Q(v.h, { ...ALT }, 3)} the tip reaches up to <b>${Q(o.T0, TEMP, 4)}</b> (limit ${Q(v.Tmax, TEMP, 4)}); nose drag coefficient <b>${o.CD == null ? '—' : fmt(o.CD, { digits: 3 })}</b>${v.M > 1 ? `, tip shock ${o.shocks.wind.attached ? `at ${fmt(o.shocks.wind.beta / D2R, { digits: 3 })}°` : 'detached'}` : `, critical Mach ${fmt(o.Mcr, { digits: 3 })}`}.`,
    };
    const warnings = [];
    if (o.regime === 'supersonic' && v.M < 1.3) warnings.push({ level: 'info', text: 'Close to Mach 1 the supersonic pressure estimate is rough: the shocks are strong and curved.' });
    if (o.regime === 'supersonic' && !['cone'].includes(v.noseType)) warnings.push({ level: 'info', text: 'Supersonic pressure drag of a curved nose is a tangent-cone estimate (exact only for a cone); treat it as ±20 %, not independently checked.' });
    if (v.noseType === 'power' && v.pow < 0.7 || ['ellipse', 'superellipse'].includes(v.noseType)) if (v.M > 1) warnings.push({ level: 'info', text: 'Blunt shapes carry a bow shock and high pressure at the tip at supersonic speed; they are subsonic shapes (Crowell).' });
    if (v.alpha > 10) warnings.push({ level: 'info', text: 'Above about 10° the nose also gains non-linear (cross-flow) lift, which slender-body theory leaves out: the loads are underestimated.' });
    if (v.noseType === 'secant' && v.sRho < 1) warnings.push({ level: 'info', text: 'A bulging secant ogive is wider than the body: the reference area is still the body’s.' });
    const N = o.q * (o.Aref / 144) * 2 * v.alpha * D2R;
    Object.assign(results, { CD: o.CD ?? '—', Mcr: o.Mcr, beta: v.M > 1 && o.shocks.wind.attached ? o.shocks.wind.beta / D2R : '—', T0: o.T0, xcp: o.xcp, CNa: o.CNa, N, Mbase: o.load[o.load.length - 1].Mb,
      CDp: o.CDp ?? '—', CDf: o.CDf, tipHalf: o.prof.cap ? 90 : o.tipHalf / D2R, maxCone: v.M > 1 ? o.tip.maxCone / D2R : '—', mu: v.M >= 1 ? o.mu / D2R : '—',
      p0: p.atm.p * (v.M > 0 ? 1 + o.cpMax * 0.5 * G * v.M * v.M : 1), Msh: o.se ? o.se.shoulder.M2 : '—', q: o.q, nOpt: nOpt ?? '—', cpMin: o.sub.cpMin, grad: o.sub.grad, Lfix: Lfix ?? '—', Mtemp, Leff: o.L, fineness: o.fineness, Vol: o.V, S: o.S,
      mass: v.t > 0 && v.rho > 0 ? o.S * v.t * v.rho : '—' });
    return { results, warnings, verdict, lv, o, v, p, McrOpt, nOpt };
  },
  actions: [
    { label: 'Use the subsonic optimum shape', title: 'Switch to the superellipse with the highest critical Mach number for this length and diameter (Felkel; Hoult)',
      async run(v) { if (custom(v)) return { message: 'The optimum is a superellipse: pick a built-in shape first.' }; const n = optimumExponent(v.L, v.R); return { values: { noseType: 'superellipse', seN: +n.toFixed(3), blunt: false }, message: `Superellipse n = ${n.toFixed(3)}: the least suction behind the shoulder for L/D = ${(v.L / (2 * v.R)).toFixed(2)}.` }; } },
  ],
  plots: [
    {
      id: 'along', title: 'Along the nose: shape, pressure, lift and bending', wide: true, height: 720,
      info: { text: ['Everything that varies along the nose, on one length axis from the tip: the nose itself (to scale), the surface pressure coefficient at your Mach number, the lift per unit length at your angle of attack, and the shear force and bending moment that lift builds up towards the shoulder.', 'Below the speed of sound the dashed line is the sonic pressure: where the curve dips below it the air is supersonic. Above Mach 1 the pressure is highest at the tip and falls along the nose.', 'Hover to read every quantity at one station.'], doc: 'lift' },
      build(v, out, { U }) {
        const ul = U(LEN), uf = U(FORCE), um = U(MOM), o = out.o, Lx = ul.v(o.L), R = o.R;
        const lp = o.load, dN = []; for (let i = 1; i < lp.length; i++) { const dx = lp[i].x - lp[i - 1].x; if (dx > 1e-9) dN.push([ul.v((lp[i].x + lp[i - 1].x) / 2), uf.v((lp[i].V - lp[i - 1].V) / dx) / ul.v(1)]); }
        const cpPts = o.cp ? o.cp.filter(([x]) => x <= o.L).map(([x, c]) => [ul.v(x), c]) : [];
        const draw = (g, X, Y) => {
          const P = o.pts, top = P.map((q) => [X(ul.v(q.x)), Y(ul.v(q.r))]), bot = P.map((q) => [X(ul.v(q.x)), Y(-ul.v(q.r))]).reverse();
          g.append(s('path', { d: path([...top, ...bot]) + 'Z', fill: 'var(--surface-2)', stroke: 'var(--text)', 'stroke-width': 1.4 }));
          g.append(s('line', { x1: X(0), x2: X(Lx), y1: Y(0), y2: Y(0), class: 'sc-thin', 'stroke-dasharray': '6 3' }));
          g.append(s('path', { d: `M${X(ul.v(o.xcp))},${Y(0) - 6}l5,9h-10Z`, fill: 'var(--red)' }));
        };
        return {
          x: { label: 'Station from the tip $x$', unit: ul.label }, xDomain: [0, Lx], vlines: [{ x: ul.v(o.xcp), label: 'centre of pressure', color: 'var(--text-3)' }],
          panels: [
            { y: { label: 'Nose', scaleNote: 'not to scale' }, yDomain: [-1.15 * ul.v(R), 1.15 * ul.v(R)], equalAspect: true, minHeight: 70, maxHeight: 160, draw },
            { y: { label: 'Pressure $C_p$' }, color: 'var(--series-1)', includeZero: true, series: [...(cpPts.length ? [{ name: o.regime === 'supersonic' ? 'tangent cone' : '$C_p$', points: cpPts }] : []), ...(o.regime === 'supersonic' && o.se ? [{ name: 'shock–expansion', dash: '7 4', points: o.se.cp.map(([x, c]) => [ul.v(x), c]) }] : [])],
              hlines: o.cpS != null ? [{ y: o.cpS, label: 'sonic ($C_p^*$)', color: 'var(--danger)' }] : [] },
            { y: { label: 'Lift per length', unit: `${uf.label}/${ul.label}` }, color: 'var(--series-4)', includeZero: true, series: [{ name: 'lift per length', dash: '7 4', points: dN }] },
            { y: { label: 'Shear force', unit: uf.label }, color: 'var(--series-2)', includeZero: true, series: [{ name: 'shear', points: lp.map((q) => [ul.v(q.x), uf.v(q.V)]) }] },
            { y: { label: 'Bending moment', unit: um.label }, color: 'var(--series-6)', includeZero: true, series: [{ name: 'bending', dash: '2 3', points: lp.map((q) => [ul.v(q.x), um.v(q.Mb)]) }] },
          ],
        };
      },
    },
    {
      id: 'shapes', title: 'Shapes compared: nose drag against Mach number', explore: true, wide: true, height: 420,
      info: { text: ['The drag coefficient of common nose shapes with your length and base diameter, against Mach number, plus your nose (thick). Subsonic: Hoult’s pressure model plus skin friction; supersonic: tangent-cone pressure plus skin friction. The gap around Mach 1 is the transonic range, where these methods do not apply.', 'Blunt noses do well below Mach 0.8 and badly above Mach 1. Near Mach 1–1.5 these inviscid estimates are weakest; there Crowell’s wind-tunnel ranking (theory page) favours Von Kármán over cones and ogives, while the estimate favours slender cones.'], doc: 'drag' },
      build(v, out) {
        const MS = [0.5, 0.85, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 5].filter((m) => m <= Math.max(3, 1.3 * v.M));
        const curve = (over) => MS.map((M) => { const o = analyseNose({ ...params(v, { ...over, M, alpha: 0 }), sub: M < 1.1, coarse: true }); return [M, o.CD ?? NaN]; });
        const series = custom(v) ? [] : COMPARE.filter(([t]) => t !== v.noseType).map(([t, name], i) => ({ name, dashed: true, color: ['var(--text)', 'var(--text-3)', 'var(--series-4)', 'var(--series-5)'][i % 4], points: curve({ noseType: t, blunt: false }) }));
        series.unshift({ name: 'your nose', color: 'var(--red)', points: curve({}) });
        return { x: { label: 'Mach number $M$' }, y: { label: 'Nose drag coefficient $C_{D,n}$' }, includeZero: true, series, vlines: [{ x: v.M, label: 'your Mach number', color: 'var(--text-3)' }] };
      },
    },
    {
      id: 'tip', title: 'Tip shock angle against Mach number', explore: true,
      info: { text: ['The angle of the tip shock (from the oncoming flow) for your tip half-angle, and on the windward and leeward sides at your angle of attack, with the Mach angle below them. Where a curve ends the shock detaches from the tip.'], doc: 'shocks' },
      build(v, out) {
        const th = out.o.prof.cap ? null : out.o.tipHalf / D2R, al = v.alpha, MS = []; for (let M = 1.05; M <= Math.max(4, v.M * 1.3); M += 0.15) MS.push(M);
        const sh = (c) => MS.map((M) => { const t = coneTable(M, G); return [M, c <= t.maxDeg ? interp(t.rowsBeta, c) : NaN]; });
        const series = [{ name: 'Mach angle $\\mu$', dash: '2 3', color: 'var(--text-3)', points: MS.map((M) => [M, machAngle(M) / D2R]) }];
        if (th != null) series.push({ name: 'zero incidence', points: sh(th) }, { name: 'windward', dash: '7 4', points: sh(th + al) }, ...(th - al > 0 ? [{ name: 'leeward', dash: '9 3 2 3', points: sh(th - al) }] : []));
        return { x: { label: 'Mach number $M$' }, y: { label: 'Shock angle $\\beta$', unit: '°' }, yDomain: [0, 90], series: series.filter((q) => q.points.some(([, y]) => Number.isFinite(y))), vlines: v.M > 1 ? [{ x: v.M, label: 'your Mach number', color: 'var(--text-3)' }] : [] };
      },
    },
    {
      id: 'heat', title: 'Stagnation temperature against Mach number', explore: true,
      info: { text: ['How hot the air can make the tip (stagnation temperature) at your altitude, against Mach number, with your material’s limit. The skin runs a little cooler and takes time to heat, so this is the upper bound.'], doc: 'heating' },
      build(v, out, { U }) {
        const ut = U(TEMP), T = out.p.atm.T, pts = []; for (let i = 0; i <= 60; i++) { const M = (Math.max(3, 1.3 * v.M) * i) / 60; pts.push([M, ut.v(T * stagT(M, G))]); }
        return { x: { label: 'Mach number $M$' }, y: { label: 'Stagnation temperature $T_0$', unit: ut.label }, series: [{ name: '$T_0$', points: pts }], hlines: [{ y: ut.v(v.Tmax), label: 'your material limit', color: 'var(--danger)' }],
          markers: [{ x: v.M, y: ut.v(out.o.T0), label: 'your flight' }] };
      },
    },
    {
      id: 'optimum', title: 'Subsonic optimum: suction peak against superellipse exponent', explore: true, when: notCustom,
      info: { text: ['The minimum pressure coefficient (the suction peak behind the shoulder, incompressible) of superellipse noses of your length and diameter, against their exponent. The best exponent keeps the peak smallest: the highest critical Mach number (Felkel; Hoult).'], doc: 'optimum' },
      build(v, out) {
        const L = out.o.L, R = out.o.R, pts = []; for (let n = 1.1; n <= 4.001; n += 0.1) pts.push([n, noseCp((z) => superellipse(z, L, R, n), L, R).cp0Min]);
        return { x: { label: 'Superellipse exponent $n$' }, y: { label: 'Minimum $C_{p0}$' }, series: [{ name: '$C_{p0,min}$', points: pts, smooth: true }], markers: out.nOpt ? [{ x: out.nOpt, y: noseCp((z) => superellipse(z, L, R, out.nOpt), L, R).cp0Min, label: `optimum n = ${fmt(out.nOpt, { digits: 3 })}` }] : [] };
      },
    },
    {
      id: 'profile', title: 'Profile coordinates (export for cutting or printing)', explore: true,
      info: { text: ['The nose radius at stations from the tip, every “profile table step”. Export it (CSV) to cut a template, set up a lathe or model the nose in CAD.'], doc: 'shapes' },
      build(v, out, { U }) {
        const ul = U(LEN), P = out.o.pts, step = Math.max(v.dx, out.o.L / 2000), pts = [];
        const rAt = (x) => { let i = 0; while (i < P.length - 2 && P[i + 1].x < x) i++; const a = P[i], b = P[i + 1]; return a.r + ((b.r - a.r) * (x - a.x)) / (b.x - a.x || 1); };
        for (let x = 0; x < out.o.L; x += step) pts.push([ul.v(x), ul.v(rAt(x))]);
        pts.push([ul.v(out.o.L), ul.v(out.o.R)]);
        return { x: { label: 'Station from the tip $x$', unit: ul.label }, y: { label: 'Radius $r$', unit: ul.label }, includeZero: true, series: [{ name: '$r$', points: pts, dots: true }] };
      },
    },
  ],
  schematicTitle: 'Nose and flow',
  schematicHint: 'The nose to scale with its dimensions and centre of pressure (▲), the oncoming air at your angle of attack, and above Mach 1 the tip shocks (windward and leeward), the Mach lines, and the Prandtl–Meyer expansion waves off the curving surface and the fan at a sharp shoulder (zero incidence). Drag the tip to change the length, the shoulder to change the diameter, or the air arrow to change the angle of attack',
  schematic(ctx, v, out) {
    const W = 760, H = 380, o = out.o, P = o.pts, ul = ctx.U(LEN), D = (x) => `${fmt(ul.v(x), { digits: 3 })} ${ul.plain}`;
    const fr = ctx.frame({ width: W, height: H, label: 'Nose cone to scale with the flow at the tip' });
    const g = fr.layer('main'); g.replaceChildren();
    const stub = 0.35 * o.L, x0 = 250, k = Math.min((W - x0 - 140) / (o.L + stub), 110 / o.R), yc = 190;
    const X = (x) => x0 + x * k, Y = (r) => yc - r * k;
    // flow: freestream arrows at α (from lower left for a nose pitched up)
    const al = v.alpha * D2R, ux = Math.cos(al), uy = -Math.sin(al);
    for (const dy of [-110, -55, 55, 110]) { const sx = 40, sy = yc + dy + 20 * Math.tan(al); g.append(s('path', { d: `M${sx},${sy}l${60 * ux},${60 * uy}`, class: 'sc-thin', 'marker-end': fr.arrow() })); }
    const ax = 70, ay = yc + 150, aLen = 90;
    g.append(s('path', { d: `M${ax},${ay}l${aLen * ux},${aLen * uy}`, class: 'sc-accent', 'stroke-width': 2, 'marker-end': fr.arrow('acc'), 'data-field': 'alpha' }));
    g.append(text(ax, ay + 20, `air M ${fmt(v.M, { digits: 3 })}, α ${fmt(v.alpha, { digits: 3 })}°`, { size: 11, field: 'M alpha' }));
    // shocks and Mach lines from the tip, measured from the flow direction
    const tx = X(P[0].x), ty = yc, clip = (ang, len) => Math.min(len, Math.abs(Math.sin(ang)) > 1e-6 ? (yc - 34) / Math.abs(Math.sin(ang)) : len),
      ray = (ang, len, attrs) => { const l = clip(ang, len); g.append(s('line', { x1: tx, y1: ty, x2: tx + l * Math.cos(ang), y2: ty - l * Math.sin(ang), ...attrs })); };
    const flowAng = al;   // flow direction angle above +x in drawing coordinates (y up)
    if (v.M > 1) {
      const len = Math.min(W - tx - 10, 330) / Math.cos(Math.min(1.2, o.mu));
      ray(flowAng + o.mu, len, { stroke: 'var(--text-3)', 'stroke-dasharray': '2 4' }); ray(flowAng - o.mu, len, { stroke: 'var(--text-3)', 'stroke-dasharray': '2 4' });
      const sw = o.shocks.wind, sl = o.shocks.lee;
      if (sw.attached && !o.prof.cap) {
        ray(flowAng - sw.beta, len, { stroke: 'var(--danger)', 'stroke-width': 2, 'data-field': 'M alpha' });
        if (sl.expansion) {
          // leeward Prandtl–Meyer fan at the tip: from the free-stream Mach line to the Mach line of the turned flow
          const a1 = flowAng + o.mu, a2 = o.tipHalf + Math.asin(1 / sl.M2);
          for (let k = 0; k <= 6; k++) ray(a1 + ((a2 - a1) * k) / 6, 170, { stroke: FAN, 'stroke-width': 1.1, 'data-field': 'M alpha' });
        } else ray(flowAng + sl.beta, len, { stroke: 'var(--danger)', 'stroke-width': 1.6, 'data-field': 'M alpha' });
        { const lw = clip(flowAng - sw.beta, 400) - 4; g.append(text(tx + lw * Math.cos(flowAng - sw.beta) + 8, ty - lw * Math.sin(flowAng - sw.beta) - 4, `shock ${fmt(sw.beta / D2R, { digits: 3 })}°`, { size: 10.5, field: 'M' })); }
        g.append(text(tx + 150 * Math.cos(flowAng + sl.beta), ty - 150 * Math.sin(flowAng + sl.beta) - 8, sl.expansion ? `expansion fan ${fmt(sl.turn / D2R, { digits: 3 })}° · M ${fmt(sl.M2, { digits: 3 })}` : `shock ${fmt(sl.beta / D2R, { digits: 3 })}°`, { size: 10.5, field: 'M' }));
      } else {
        // detached bow shock: drawn qualitatively ahead of the tip
        const so = Math.max(6, 0.25 * o.R * k), hgt = Math.min(150, 1.6 * o.R * k);
        g.append(s('path', { d: `M${tx - so + 30},${ty - hgt}Q${tx - so - 10},${ty} ${tx - so + 30},${ty + hgt}`, fill: 'none', stroke: 'var(--danger)', 'stroke-width': 2, 'data-field': 'M noseType' }));
        g.append(text(tx - so + 34, ty - hgt + 12, 'detached bow shock (sketch)', { size: 10.5, field: 'M' }));
      }
      { const ang = flowAng + o.mu, l = clip(ang, len), ex = tx + l * Math.cos(ang), ey = ty - l * Math.sin(ang); g.append(text(ex + 6, ey + 4, `Mach line μ ${fmt(o.mu / D2R, { digits: 3 })}°`, { size: 10, cls: 'sc-dim-text' })); }
    } else {
      g.append(text(tx, 46, `subsonic: no shocks · the flow first turns sonic at Mach ${fmt(o.Mcr, { digits: 3 })} (critical Mach number)`, { size: 11, cls: 'sc-dim-text', field: 'M' }));
      const zm = o.sub.zMin; if (zm <= o.L + stub) { g.append(s('circle', { cx: X(zm), cy: Y(o.R) - 1, r: 4, fill: 'var(--danger)', 'data-field': 'M' })); g.append(text(X(zm), Y(o.R) - 10, `lowest pressure, Cp ${fmt(o.sub.cpMin, { digits: 3 })}`, { anchor: 'middle', size: 10.5, field: 'M' })); }
    }
    // Prandtl–Meyer expansion: Mach waves leaving the curving surface, and the fan at a shoulder with a slope break
    if (v.M > 1 && o.se) {
      const S = o.se.surf, n = S.length, picks = [0.15, 0.3, 0.45, 0.6, 0.75].map((f) => S[Math.min(n - 1, Math.round(f * n))]);
      for (const [x, , Mi, th] of picks.filter((q) => q[3] < o.tipHalf - 0.5 * D2R)) for (const sg of [1, -1]) {
        const r = radiusAtPts(P, x), ang = sg * (th + Math.asin(1 / Mi)), x1 = X(x), y1 = Y(sg * r), l = Math.min(sg > 0 ? 60 : 34, (yc - 40 - Math.abs(y1 - yc)) / Math.max(0.2, Math.abs(Math.sin(ang))));
        g.append(s('line', { x1, y1, x2: x1 + l * Math.cos(ang), y2: y1 - l * Math.sin(ang), stroke: FAN, 'stroke-width': 1, 'data-field': 'M noseType' }));
      }
      const sh = o.se.shoulder;
      if (sh.theta > 0.5 * D2R) for (const sg of [1, -1]) {
        const a1 = sh.theta + Math.asin(1 / sh.M1), a2 = Math.asin(1 / sh.M2);
        for (let k = 0; k <= 6; k++) { const a = sg * (a1 + ((a2 - a1) * k) / 6), x1 = X(o.L), y1 = Y(sg * o.R); g.append(s('line', { x1, y1, x2: x1 + 80 * Math.cos(a), y2: y1 - 80 * Math.sin(a), stroke: FAN, 'stroke-width': 1.1, 'data-field': 'M noseType' })); }
      }
      g.append(text(W - 14, H - 28, sh.theta > 0.5 * D2R ? `shoulder expansion fan · M ${fmt(sh.M1, { digits: 3 })} → ${fmt(sh.M2, { digits: 3 })}` : `Prandtl–Meyer expansion · M ${fmt(sh.M2, { digits: 3 })} at the shoulder`, { anchor: 'end', size: 10, cls: 'sc-dim-text', field: 'M' }));
    }
    // nose and body stub (to scale)
    const top = P.map((q) => [X(q.x), Y(q.r)]), bot = P.map((q) => [X(q.x), Y(-q.r)]).reverse();
    g.append(s('path', { d: path([...top, [X(o.L + stub), Y(o.R)], [X(o.L + stub), Y(-o.R)], ...bot]) + 'Z', class: 'sc-body', 'data-field': 'noseType L R' }));
    g.append(s('line', { x1: X(o.L), x2: X(o.L), y1: Y(o.R), y2: Y(-o.R), class: 'sc-thin', 'stroke-dasharray': '3 3' }));
    g.append(s('line', { x1: tx - 20, x2: X(o.L + stub) + 10, y1: yc, y2: yc, class: 'sc-thin', 'stroke-dasharray': '8 3 2 3' }));
    // centre of pressure and dimensions
    // centre of pressure: marker on the axis, its label below the nose with a leader
    const cpy = Y(-o.R) + 16;
    g.append(s('path', { d: `M${X(o.xcp)},${yc + 4}l6,11h-12Z`, fill: 'var(--red)', 'data-field': 'noseType L' }));
    g.append(s('line', { x1: X(o.xcp), x2: X(o.xcp), y1: yc + 15, y2: cpy - 10, class: 'sc-thin', 'stroke-dasharray': '2 2' }));
    g.append(text(X(o.xcp), cpy + 2, `CP ${D(o.xcp)} from the tip`, { anchor: 'middle', size: 10.5, field: 'noseType' }));
    g.append(dim(fr, X(0), Y(-o.R) + 48, X(o.L), Y(-o.R) + 48, `L = ${D(o.L)} (L/D ${fmt(o.fineness, { digits: 3 })})`, { field: 'L' }));
    g.append(dim(fr, X(o.L + stub) + 24, Y(o.R), X(o.L + stub) + 24, Y(-o.R), `D = ${D(2 * o.R)}`, { field: 'R' }));
    if (o.prof.cap) g.append(text(tx + 6, Y(o.prof.cap.rn) - 8, `r_n ${D(o.prof.cap.rn)}`, { size: 10, field: 'rn' }));
    else if (o.tipHalf > 0) { const r = 34, a = o.tipHalf; g.append(s('path', { d: `M${tx + r},${ty}A${r},${r} 0 0 0 ${tx + r * Math.cos(a)},${ty - r * Math.sin(a)}`, class: 'sc-thin', fill: 'none' })); g.append(text(tx - 10, ty - 10, `tip ${fmt(a / D2R, { digits: 3 })}°`, { anchor: 'end', size: 10, cls: 'sc-dim-text', field: 'noseType' })); }
    g.append(text(W - 18, H - 12, `${SHAPES.find((q) => q.value === v.noseType)?.label || ''} · to scale (the body behind the nose is cut short)`, { anchor: 'end', size: 10.5, cls: 'sc-dim-text', field: 'noseType' }));
    // handles
    if (notCustom(v)) {
      ctx.handle('tip', tx, ty, { field: 'L', title: 'Drag sideways to change the nose length', onDrag: (px) => ctx.setValue('L', Math.max(0.2, v.L + (tx - px) / k), { round: 0.1 }), onKey: (dx) => ctx.setValue('L', Math.max(0.2, v.L * (1 - 0.03 * dx))) });
      ctx.handle('shoulder', X(o.L), Y(o.R), { field: 'R', title: 'Drag up or down to change the base radius', onDrag: (px, py) => ctx.setValue('R', Math.max(0.05, (yc - py) / k), { round: 0.05 }), onKey: (dx, dy) => ctx.setValue('R', Math.max(0.05, v.R * (1 + 0.03 * dy))) });
    }
    ctx.handle('aoa', ax + aLen * ux, ay + aLen * uy, { field: 'alpha', title: 'Drag up or down to change the angle of attack', onDrag: (px, py) => ctx.setValue('alpha', Math.max(0, Math.min(20, Math.atan2(ay - py, Math.max(1, px - ax)) / D2R)), { round: 0.25 }), onKey: (dx, dy) => ctx.setValue('alpha', Math.max(0, Math.min(20, v.alpha + 0.5 * dy))) });
  },
  symbols: {
    L: 'nose length, tip to shoulder (mm or in)', R: 'base radius, half the body diameter (mm or in)', D: 'base diameter (mm or in)', x: 'station from the tip', r: 'nose radius at station $x$ (mm or in)', 'r_n': 'tip radius of a rounded tip',
    "K'": 'parabolic-series parameter (no unit)', n: 'power-series or superellipse exponent (no unit)', C: 'Haack-series parameter (no unit)', '\\rho_t': 'radius of the tangent-ogive circle', '\\theta': 'Haack angle parameter',
    V: 'nose volume (cm³ or in³)', A: 'base area, $\\pi R^2$ (cm² or in²)', S: 'wetted (surface) area', M: 'Mach number, flight speed / speed of sound', '\\alpha': 'angle of attack (°)', q: 'dynamic pressure (Pa or lbf/ft²)', '\\gamma': 'ratio of specific heats of air, 1.4',
    p: 'air pressure (Pa or lbf/ft²)', '\\rho': 'air density', T: 'air temperature (K or °R)', 'T_0': 'stagnation temperature', 'T_{max}': 'material temperature limit', 'p_0': 'stagnation pressure',
    'C_D': 'drag coefficient on the base area (no unit)', 'C_{D,p}': 'pressure (wave) drag coefficient', 'C_{D,f}': 'skin-friction drag coefficient', 'C_p': 'pressure coefficient, $(p_s-p)/q$', 'C_p^*': 'critical (sonic) pressure coefficient',
    'C_{N\\alpha}': 'normal-force slope (per radian)', N: 'normal (lift) force (N or lbf)', 'x_{cp}': 'centre of pressure from the tip', 'M_b': 'bending moment (N·m or lbf·in)', 'M_{cr}': 'critical Mach number',
    '\\mu': 'Mach angle (°)', '\\beta': 'shock angle (°)', '\\theta_{tip}': 'tip half-angle (°)', '\\theta_{max}': 'largest cone half-angle with an attached shock (°)',
    'C_{D,n}': 'nose drag coefficient, on the base area',
    '\\beta_w': 'windward tip shock angle (°)',
    'M_{sh}': 'Mach number just behind the shoulder',
    'n^*': 'optimum superellipse exponent',
    'C_{p,min}': 'lowest surface pressure coefficient',
    'L_{att}': 'shortest nose length that keeps the tip shock attached (mm or in)',
    M_T: 'Mach number at which the tip reaches your material limit',
    'M_{T}': 'Mach number at which the tip reaches your material limit',
    m: 'nose shell mass (g or lb)',
    '\\Delta x': 'profile table step (mm or in)',
    x_k: 'station $k$ of the profile table (mm or in)',
    k: 'row number of the profile table',
    dA_x: 'surface area element projected on the base',
    L_b: 'body length behind the nose (mm or in)',
    h: 'altitude above sea level (m or ft)',
    t: 'shell thickness (mm or in)',
    '\\rho_m': 'shell material density (g/cm³)',
    'C_{Db}': 'base drag coefficient',
    '\\varepsilon': 'wake convergence half-angle (°)',
    L_1: 'length of the front cone (mm or in)',
    R_1: 'radius at the joint of the two cones (mm or in)',
    'p(h)': 'air pressure at altitude $h$',
  },
  report(v, out, R) {
    const o = out.o, n = R.n, steps = [
      { label: 'Volume and base area of the nose (frustum sums along the profile)', lhs: 'V', eq: '\\sum\\tfrac{\\pi}{3}\\Delta x\\,(r_1^2+r_1r_2+r_2^2)', res: R.Q(o.V, { dim: 'volume', internal: 'in3' }) },
      { label: 'Centre of pressure (slender body; Crowell)', lhs: 'x_{cp}', eq: 'L-\\frac{V}{A}', res: R.Q(o.xcp, LEN) },
      { label: 'Dynamic pressure and normal force at your angle of attack', lhs: 'q', eq: '\\tfrac12\\gamma pM^2', res: R.Q(o.q, PRES) },
      { lhs: 'N', eq: 'qA\\,C_{N\\alpha}\\,\\alpha', sub: `C_{N\\alpha}=2,\\ \\alpha=${n(v.alpha)}^\\circ`, res: R.Q(out.results.N, FORCE) },
      { label: 'Stagnation temperature at the tip (NACA 1135 eq. 43)', lhs: 'T_0', eq: 'T\\left(1+\\tfrac{\\gamma-1}{2}M^2\\right)', res: R.Q(o.T0, TEMP) },
    ];
    if (v.M > 1) steps.push({ label: 'Mach angle and the tip shock (cone flow, NACA 1135 charts 5–6)', lhs: '\\mu', eq: '\\sin^{-1}(1/M)', res: `${n(o.mu / D2R)}^\\circ` });
    steps.push({ label: 'Nose drag coefficient: pressure plus skin friction', lhs: 'C_D', eq: 'C_{D,p}+C_{D,f}', res: o.CD == null ? '\\text{— (transonic)}' : n(o.CD) });
    return [{ title: 'Method', text: 'Shapes from Crowell; lift by slender-body theory; subsonic pressure by Hoult’s line-source model with the Kármán–Tsien correction; supersonic tip shocks from the cone-flow solution checked against NACA 1135; supersonic pressure drag by the tangent-cone estimate (Lees’ modified Newtonian pressure where the slope is too steep for an attached shock); turbulent skin friction from Hoult’s drag memo.', steps }];
  },
  references: ['ogive-nose', 'nose-pressure-distro4', 'aiaafelkel3', 'local-sonic-flow', 'barrowman-equations', 'drag-coefficient3-4', 'modified-newtonian-aero4'],
  externalRefs: [
    { title: 'The Descriptive Geometry of Nose Cones', authors: 'G. A. Crowell Sr.', venue: '1996', url: 'https://web.archive.org/web/2011/http://www.if.sc.usp.br/~projetosulfos/artigos/NoseCone_EQN2.PDF' },
    { title: 'Equations, Tables, and Charts for Compressible Flow (NACA Report 1135)', authors: 'Ames Research Staff', venue: 'NACA, 1953', url: 'https://ntrs.nasa.gov/citations/19930091059' },
  ],
  examples: [
    { name: '6 in, 5-calibre tangent ogive at Mach 1.4, 4°', values: { noseType: 'ogive', L: 30, R: 3, M: 1.4, alpha: 4, h: 10000, blunt: false } },
    { name: 'Von Kármán, 4:1, high-power flight to Mach 1.6', values: { noseType: 'vonkarman', L: 24, R: 3, M: 1.6, alpha: 3, h: 8000, blunt: false } },
    { name: 'Subsonic optimum (superellipse) at Mach 0.8, L/D 6', values: { noseType: 'superellipse', seN: 1.8, L: 36, R: 3, M: 0.8, alpha: 2, h: 3000, blunt: false } },
    { name: 'Hoult’s memo: ogive-cylinder, 6.25 in body, 30 in nose', values: { noseType: 'ogive', L: 30, R: 3.125, bodyLen: 78, M: 0, alpha: 0, blunt: false, CD: 0.3755, CDb: 0.0813, eps: 5.73 } },
    { name: 'PLA nose at Mach 2.5 near the ground (hot tip)', values: { noseType: 'ogive', L: 24, R: 2, M: 2.5, alpha: 2, h: 2000, Tmax: (58 + 273.15) * 1.8, blunt: true, rn: 0.15 } },
    { name: 'Stubby elliptical nose at Mach 1.8 (detached shock)', values: { noseType: 'ellipse', L: 9, R: 3, M: 1.8, alpha: 2, h: 10000, blunt: false } },
  ],
};
