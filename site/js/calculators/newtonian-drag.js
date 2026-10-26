// Modified Newtonian Drag — UI definition. Wave (pressure) drag of a blunt nose and rounded fin leading edges at
// supersonic speed from Lees' modified Newtonian pressure, C_P = C_PT cos²θ (Hoult, Modified Newtonian Aerodynamics rev. 4).
// The nose is entered as the builder measures it (tip radius, length, body radius) and split into a cap and a cone here.
import { newtonian, cpStagnation, sphereCone, noseSurface, fairing, M_CRIT_CAP, M_CRIT_LE } from '../calc/newtonian.js';
import { coneFlow } from '../calc/conical.js';
import { s, fmt, InputError } from '../util.js';
import { dim, path, text } from '../ui/svg.js';

const LEN = { dim: 'length', internal: 'in' };
const AREA = { dim: 'area', internal: 'in2' };
const ANG = { dim: 'angle', internal: 'deg' };
const NONE = { dim: 'none' };
const d2r = Math.PI / 180;
const CPT_MAX = cpStagnation(1e4);   // hypersonic limit, 1.839: arrows in the drawing are scaled to it
const isSC = (v) => v.noseType === 'spherecone', isFlat = (v) => v.noseType === 'flat', hasNose = (v) => v.noseType !== 'none';
const fins = (v) => !!v.fins;
const NOSE_TYPES = [
  { value: 'spherecone', label: 'Rounded cone (sphere-cone)' },
  { value: 'flat', label: 'Flat-faced cone' },
  { value: 'none', label: 'No blunt nose (fins only)' },
];

/** Nose geometry from the form: the nearest buildable shape (tip radius ≤ body radius, face ≤ body diameter). */
function geom(v) {
  const R = v.bodyR, L = v.L;
  if (isSC(v)) {
    const rn = Math.min(v.rn, R), g = sphereCone(rn, L, R);
    return { kind: 'spherecone', R, L, rn, ...g, clamped: v.rn > R,
      cap: rn > 0 ? { R: rn, thetaM: g.thetaM } : null, cone: R - g.r1 > 1e-9 ? { r1: g.r1, r2: R, L: g.Lc, x0: g.xJ } : null, flat: null };
  }
  if (isFlat(v)) {
    const D = Math.min(v.Df, 2 * R), r1 = D / 2;
    return { kind: 'flat', R, L, D, r1, xJ: 0, Lc: L, delta: Math.atan2(R - r1, L), clamped: v.Df > 2 * R,
      cap: null, cone: R - r1 > 1e-9 ? { r1, r2: R, L, x0: 0 } : null, flat: { D } };
  }
  return { kind: 'none', R, L, cap: null, cone: null, flat: null };
}

/** Inputs of calc/newtonian.js for page values v (optionally at another Mach number or geometry). */
function params(v, over = {}) {
  const w = { ...v, ...over }, G = geom(w);
  return {
    G, M: w.M, Sref: Math.PI * w.bodyR ** 2, cap: G.cap, cone: G.cone, flat: G.flat,
    le: w.fins ? { N: w.N, R: w.t / 2, l: w.b / Math.cos(w.sweep * d2r), sweep: w.sweep * d2r } : null,
  };
}

const dash = '—';
const n3 = (x) => fmt(x, { digits: 3 });

export default {
  slug: 'newtonian-drag',
  topic: 'modified-newtonian-drag',
  title: 'Modified Newtonian Drag',
  subtitle: 'The supersonic <b>wave drag</b> of a <b>blunt nose</b> (rounded or flat tip) and of <b>rounded fin leading edges</b>, ready to enter in the Drag Coefficient calculator — with where on the surface the pressure acts.',
  tiers: true,
  intro: {
    what: 'Works out how hard the air pushes on the blunt parts of a supersonic rocket — a rounded or flat nose tip, a cone, the rounded front edges of the fins — and turns it into drag coefficients you can add to the drag build-up.',
    why: 'Above the speed of sound the air hits blunt parts almost head-on and stops there, so they carry high pressure and a large share of the drag. The friction-based drag build-up does not include it.',
    when: 'Supersonic designs: fill in the nose and fin wave-drag inputs of the Drag Coefficient calculator, or see what rounding the tip or sweeping the fins costs.',
  },
  info: {
    text: [
      'Newton pictured air as a hail of tiny particles: each one that hits the surface loses the part of its speed that points into the surface. That gives a pressure that is highest where the surface faces the flow head-on and zero where it runs parallel to it: $C_P=2\\cos^2\\theta$.',
      'Lees improved it: instead of the 2 he used the real pressure at the nose tip, found behind the shock wave in front of it ($C_{PT}$). This works well for blunt shapes from about Mach 1.2 up.',
      'Adding up this pressure over the cap, the cone and the edges gives their drag. Divided by the body cross-section, these are the numbers the Drag Coefficient calculator asks for.',
    ],
    tex: 'C_P=C_{PT}\\cos^2\\theta',
    steps: [
      'Enter the Mach number (or take the peak from the Trajectory Simulation) and the body radius.',
      'Pick the nose type and enter its tip radius (or flat-face diameter) and length.',
      'Switch on rounded fin leading edges if your fins have them, and enter the fin count, thickness, span and sweep.',
      'Copy the nose and fin results into the Drag Coefficient calculator’s wave-drag inputs.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'flight', title: 'Flight condition',
      fields: [
        { id: 'M', label: 'Mach number', sym: 'M_\\infty', ...NONE, default: 2, min: 0, minExclusive: true, max: 25, slider: { min: 0.3, max: 6, step: 0.01 },
          info: { text: [
            'Flight speed divided by the speed of sound. Check the fastest point of the flight: the peak Mach number from the Trajectory Simulation (the button below fills it in).',
            'The method is meant for supersonic flight. Below Mach 1 the values are blended down to zero (an estimate, flagged on the page).',
            'Faster flight raises the pressure at the tip, from $C_{PT}=1.28$ at Mach 1 to 1.84 at very high speed, so the drag coefficients grow by up to about 45 %.',
          ], range: 'High-power rockets: Mach 1.2–3. Research rockets: up to Mach 5+.', doc: 'stagnation' } },
      ],
    },
    {
      id: 'body', title: 'Rocket body',
      fields: [
        { id: 'bodyR', shared: 'bodyR', label: 'Body radius (half the diameter)', sym: 'R', ...LEN, default: 3, min: 0.05, max: 200, slider: { min: 0.5, max: 12, step: 0.01 },
          info: { text: [
            'Half the outside diameter of the body tube.',
            'It sets the reference area $S_{ref}=\\pi R^2$ that every drag coefficient here is divided by — the same one the Drag Coefficient calculator uses, so the numbers add directly.',
            'A larger body with the same nose tip and fins gives smaller coefficients (the same drag force on a bigger area). Drag the shoulder in the drawing to change it.',
          ], tex: 'S_{ref}=\\pi R^2', range: '29 mm (1.14 in) to 152 mm (6 in) diameter tubes: R 0.57–3 in.', doc: 'overview' } },
      ],
    },
    {
      id: 'nose', title: 'Nose',
      fields: [
        { id: 'noseType', label: 'Nose type', kind: 'select', default: 'spherecone', options: NOSE_TYPES,
          info: { text: [
            'A rounded cone is a cone with a ball-shaped (spherical) tip that blends smoothly into it; with a tip radius of 0 it is a sharp cone. A flat-faced cone has its tip cut off flat.',
            'For an ogive or other curved nose use the Nose Cone Design calculator, which already uses this method for a rounded tip; choose “No blunt nose” here to work out the fins only.',
          ], doc: 'cap' } },
        { id: 'rn', label: 'Tip radius', sym: 'r_n', ...LEN, default: 1.2, min: 0, max: 200, slider: { min: 0, max: 3, step: 0.01 }, when: isSC,
          info: { text: [
            'Radius of the ball-shaped tip: measure the tip with a radius gauge, or half the width of the rounded part.',
            'It can be at most the body radius (then the nose is a hemisphere); 0 is a sharp cone.',
            'A rounder tip carries more of the full stagnation pressure: the cap’s drag grows with the square of its radius. Drag the handle under the tip to change it.',
          ], tex: 'R\\cos\\delta-(L-r_n)\\sin\\delta=r_n', range: 'Hobby noses: 5–10 % of the body radius. Blunt re-entry-like noses: 50–100 %.', doc: 'cap' } },
        { id: 'Df', label: 'Flat-face diameter', sym: 'D_F', ...LEN, default: 1.5, min: 0, max: 400, slider: { min: 0, max: 6, step: 0.01 }, when: isFlat,
          info: { text: [
            'Diameter of the flat face at the front of the nose.',
            'At most the body diameter: then the nose is a flat-ended cylinder.',
            'The face carries the full stagnation pressure, so its drag grows with its area (the square of the diameter). Drag the handle at the edge of the face to change it.',
          ], tex: '(C_DS)_F=C_{PT}\\frac{\\pi D_F^2}{4}', doc: 'flat' } },
        { id: 'L', shared: 'noseL', label: 'Nose length (tip to shoulder)', sym: 'L', ...LEN, default: 11.3033, min: 0.001, max: 2000, slider: { min: 0.5, max: 40, step: 0.01 }, when: hasNose,
          info: { text: [
            'From the very front of the nose to the shoulder, where it meets the body tube (not counting the part that slides inside).',
            'With the tip and body radius it sets the cone half-angle $\\delta$.',
            'A longer nose has a slimmer cone: its pressure falls with $\\sin^2\\delta$, so doubling the length of a slim cone roughly quarters the cone’s drag. Drag the tip in the drawing to change it.',
          ], tex: '\\tan\\delta=\\frac{R-r_1}{L_C}', range: 'Fineness L/2R of 1–5 for cones.', doc: 'cone' } },
      ],
    },
    {
      id: 'fing', title: 'Fins',
      fields: [
        { id: 'fins', label: 'Rounded fin leading edges', kind: 'bool', default: true,
          info: { text: [
            'Fins cut from flat plate with the front edge sanded round (a half-cylinder). Sharp or bevelled edges are not blunt: their wave drag comes from the supersonic fin tools instead.',
          ], doc: 'leading-edge' } },
        { id: 'N', backView: (v) => ({ R: v.bodyR, span: v.b, t: v.t, unit: LEN, range: [1, 12], note: 'The leading-edge drag is N times one fin’s.' }), shared: 'finN', label: 'Number of fins', sym: 'N', ...NONE, default: 4, min: 1, max: 12, slider: { min: 1, max: 8, step: 1 }, when: fins,
          info: { text: ['How many fins the rocket has.', 'The leading-edge drag is that of one fin times the count.'], range: '3 or 4.', doc: 'leading-edge' } },
        { id: 't', shared: 'finT', label: 'Fin thickness', sym: 't', ...LEN, default: 0.125, min: 0.001, max: 5, slider: { min: 0.03, max: 0.5, step: 0.005 }, when: fins,
          info: { text: [
            'Thickness of the fin plate. A fully rounded edge has a radius of half the thickness, $R_{LE}=t/2$.',
            'Measure it with calipers.',
            'The edge drag is proportional to the thickness: a 1/4 in fin has twice the drag of a 1/8 in fin.',
          ], tex: 'R_{LE}=t/2', range: '1/16–1/8 in (1.5–3 mm) for mid-power, 1/8–1/4 in (3–6 mm) for high-power fins.', doc: 'leading-edge' } },
        { id: 'b', shared: 'finSpan', label: 'Fin span (height from the body)', sym: 'b', ...LEN, default: 6, min: 0.01, max: 500, slider: { min: 0.5, max: 24, step: 0.01 }, when: fins,
          info: { text: [
            'Height of the fin from the body tube to its tip (the exposed semispan).',
            'With the sweep it sets the length of the leading edge, $l=b/\\cos\\Lambda$.',
            'The edge drag grows in proportion to the span.',
          ], tex: 'l=\\frac{b}{\\cos\\Lambda}', doc: 'leading-edge' } },
        { id: 'sweep', label: 'Leading-edge sweep angle', sym: '\\Lambda', ...ANG, default: 30, min: 0, max: 85, slider: { min: 0, max: 80, step: 0.5 }, when: fins,
          info: { text: [
            'How far the front edge leans back, measured from a line straight out from the body (0° = edge square to the flow).',
            'Only the part of the flow that meets the edge square-on pushes on it: its Mach number is $M_N=M_\\infty\\cos\\Lambda$.',
            'More sweep cuts the edge drag fast (about as $\\cos^2\\Lambda$ at the same span). Below $M_N=1$ the edge has no shock and the drag is only an estimate. Drag the fin tip in the drawing to change it.',
          ], tex: 'M_N=M_\\infty\\cos\\Lambda', range: '30–60° is common.', doc: 'leading-edge' } },
      ],
    },
  ],
  actions: [{
    label: 'Use the peak Mach number from the Trajectory Simulation', group: 'flight', title: 'Run the Trajectory Simulation with its saved inputs and take its peak Mach number',
    async run() {
      const def = (await import('./skyaero-trajectory.js')).default;
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem('rc-calc-skyaero-trajectory')); } catch { /* none */ }
      const v = {}; for (const g of def.groups) for (const f of g.fields) v[f.id] = structuredClone(f.default);
      Object.assign(v, structuredClone(def.examples?.[0]?.values || {}), saved || {});
      const M = def.compute(v).results.maxMach;
      if (!(M > 0)) return { message: 'The Trajectory Simulation gave no peak Mach number.' };
      return { values: { M: +M.toFixed(3) }, message: saved ? `Peak Mach ${M.toFixed(3)} from your Trajectory Simulation` : `Peak Mach ${M.toFixed(3)} from the Trajectory Simulation example — open that calculator to simulate your own rocket` };
    },
  }],
  results: [
    { id: 'CDnose', label: 'Nose wave drag', sym: 'C_{D,nose}', ...NONE, key: true, digits: 4,
      status: (x, out) => (!hasNose(out.v) ? null : out.v.M < 1 || out.lowH ? 'warn' : 'ok'),
      note: (x, out) => (!hasNose(out.v) ? 'no blunt nose' : out.v.M < 1 ? 'subsonic: blended estimate' : 'enter as “Nose wave drag” in Drag Coefficient'),
      info: { text: [
        'The drag of the whole blunt nose (tip, cone and any flat face) divided by the dynamic pressure and the body cross-section.',
        'Enter it as the “Nose wave drag” input of the Drag Coefficient calculator. If you count a flat face here, untick “flat nose” there so it is not counted twice.',
        'Green: supersonic and blunt enough for the method; amber: below Mach 1 or a slim cone, where it is only an estimate.',
      ], tex: 'C_{D,nose}=\\frac{(C_DS)_{cap}+(C_DS)_{cone}+(C_DS)_F}{S_{ref}}', doc: 'totals' } },
    { id: 'CDfins', label: 'Fin leading-edge drag', sym: 'C_{D,LE}', ...NONE, key: true, digits: 4,
      status: (x, out) => (!out.v.fins ? null : out.o.le.MN < 1 ? 'warn' : 'ok'),
      note: (x, out) => (!out.v.fins ? 'no rounded edges' : out.o.le.MN < 1 ? `edge subsonic (M_N ${n3(out.o.le.MN)}): estimate` : 'add to “Fin wave drag”; untick blunt edges there'),
      info: { text: [
        'The drag of the rounded front edges of all fins, on the body cross-section.',
        'Add it to the “Fin wave drag” input of the Drag Coefficient calculator and untick its “blunt leading edges”: that box computes the same edge drag in a simpler form (no sweep fairing).',
        'Amber when the flow across the edge is slower than sound ($M_N<1$): there is no shock on the edge and the value is a blended estimate.',
      ], tex: 'C_{D,LE}=\\frac{N\\,(C_DS)_{LE}}{S_{ref}}', doc: 'totals' } },
    { id: 'CD', label: 'Blunt-element wave drag, nose + fins', sym: 'C_D', ...NONE, key: true, digits: 4,
      note: (x, out) => `nose ${fmt(out.o.CDnose, { digits: 3 })} + fins ${fmt(out.o.CDfins, { digits: 3 })}`,
      info: { text: [
        'The two results above added together: the drag of every blunt part of the rocket, on the body cross-section.',
        'For comparison, a whole high-power rocket has a drag coefficient of roughly 0.3–0.6 at Mach 2.',
        'The drawing and the plot along the nose show where this drag comes from.',
      ], tex: 'C_D=C_{D,nose}+C_{D,LE}', doc: 'totals' } },
    { id: 'cpt', label: 'Pressure coefficient at the nose tip', sym: 'C_{PT}', ...NONE, key: true, digits: 4,
      note: (x, out) => (out.v.M > 1 ? 'behind the bow shock · classical value 2' : 'no shock (subsonic)'),
      info: { text: [
        'How much the air pressure rises where the flow stops dead at the tip (the stagnation point), as a fraction of the dynamic pressure.',
        'Above Mach 1 the air first crosses a shock wave, losing some pressure; this is the Rayleigh pitot formula. Newton’s original theory uses 2.',
        'Every pressure in the method is this value times $\\cos^2\\theta$, so every drag result scales with it.',
      ], tex: 'C_{PT}=\\frac{2}{\\gamma M_\\infty^2}\\left(\\frac{p_T}{p_\\infty}-1\\right)', range: '1.28 at Mach 1, 1.66 at Mach 2, 1.84 at very high Mach number.', doc: 'stagnation' } },
    { id: 'Sref', label: 'Reference area', sym: 'S_{ref}', ...AREA, digits: 4,
      info: { text: ['The body cross-section every coefficient is divided by.'], tex: 'S_{ref}=\\pi R^2', doc: 'overview' } },
    { id: 'delta', label: 'Cone half-angle', sym: '\\delta', ...ANG, digits: 4,
      info: { text: ['Angle between the cone surface and the rocket axis, from the tip radius (or face), length and body radius. The cone pressure is $C_{PT}\\sin^2\\delta$.', '— without a nose.'], tex: '\\tan\\delta=\\frac{R-r_1}{L_C}', doc: 'cone' } },
    { id: 'thetaM', label: 'Cap angle (where the tip meets the cone)', sym: '\\theta_M', ...ANG, digits: 4,
      info: { text: ['Angle of the surface normal from the axis at the edge of the rounded tip: 90° − δ for a cap tangent to the cone. 90° is a full hemisphere. — without a rounded tip.'], tex: '\\theta_M=90^\\circ-\\delta', doc: 'cap' } },
    { id: 'H', label: 'Hypersonic similarity parameter of the nose', sym: 'H', ...NONE, digits: 3,
      info: { text: ['The memo’s test for whether a part is “locally hypersonic”, where Newtonian theory works: $H\\ge1$. Slim cones at low supersonic speed fail it; then use the Nose Cone Design calculator’s cone-flow result. — below Mach 1 or without a nose.'], tex: 'H=\\frac{\\sqrt{M_\\infty^2-1}}{L/2R}', doc: 'overview' } },
    { id: 'capCDS', label: 'Tip (cap) drag area', sym: '(C_DS)_{cap}', ...AREA, digits: 4,
      info: { text: ['Drag force of the rounded tip divided by the dynamic pressure. — without a rounded tip.'], tex: '(C_DS)_{cap}=\\pi r_n^2\\frac{C_{PT}}{2}(1-\\cos^4\\theta_M)', doc: 'cap' } },
    { id: 'coneCDS', label: 'Cone drag area', sym: '(C_DS)_{cone}', ...AREA, digits: 4,
      info: { text: ['Drag force of the conical part divided by the dynamic pressure. — without a cone.'], tex: '(C_DS)_{cone}=C_{PT}\\sin^2\\delta\\,\\pi(R^2-r_1^2)', doc: 'cone' } },
    { id: 'flatCDS', label: 'Flat-face drag area', sym: '(C_DS)_F', ...AREA, digits: 4,
      info: { text: ['Drag force of the flat face divided by the dynamic pressure. Supersonic: the face carries $C_{PT}$ all over (within 4 % of wind-tunnel data, memo). — without a flat face.'], tex: '(C_DS)_F=C_{D,F}\\frac{\\pi D_F^2}{4}', doc: 'flat' } },
    { id: 'noseCNa', label: 'Nose normal-force slope (tip + cone)', sym: 'C_{N\\alpha,nose}', dim: 'perAngle', internal: 'perrad', digits: 4,
      info: { text: ['How fast the nose’s side force grows with angle of attack, on the body cross-section (a flat face adds none). For stability work; slender-body theory gives 2 per radian for a pointed nose. — without a nose.'], tex: 'C_{N\\alpha}S_{ref}=\\pi r_n^2\\frac{C_{PT}}{2}\\sin^4\\theta_M+\\pi C_{PT}\\sin\\delta\\cos\\delta\\,L_C(r_1+R)', doc: 'cone' } },
    { id: 'noseXcp', label: 'Nose centre of pressure from the tip', sym: 'X_{CP}', ...LEN, digits: 4,
      info: { text: ['Where the nose’s side force acts, measured from the tip: the cap’s and the cone’s, weighted by their normal force. — without a nose.'], tex: 'X_{CP}=\\frac{\\sum C_{N\\alpha}X}{\\sum C_{N\\alpha}}', doc: 'cone' } },
    { id: 'MN', label: 'Mach number across the leading edge', sym: 'M_N', ...NONE, digits: 4,
      info: { text: ['The part of the flight Mach number that meets the swept edge square-on. Above 1 the edge has its own bow shock. — without rounded edges.'], tex: 'M_N=M_\\infty\\cos\\Lambda', doc: 'leading-edge' } },
    { id: 'cptLE', label: 'Pressure coefficient at the leading edge', sym: 'C_{PT}(M_N)', ...NONE, digits: 4,
      info: { text: ['The stagnation pressure coefficient for the cross flow, $M_N$, used on the edge. — without rounded edges.'], doc: 'leading-edge' } },
    { id: 'lLE', label: 'Leading-edge length (one fin)', sym: 'l', ...LEN, digits: 4,
      info: { text: ['Length along the swept edge. — without rounded edges.'], tex: 'l=b/\\cos\\Lambda', doc: 'leading-edge' } },
    { id: 'leCDS', label: 'Leading-edge drag area (one fin)', sym: '(C_DS)_{LE}', ...AREA, digits: 4,
      info: { text: ['Drag force of one fin’s rounded edge divided by the dynamic pressure. — without rounded edges.'], tex: '(C_DS)_{LE}=\\tfrac43R_{LE}\\,l\\,C_{PT}(M_N)\\cos^3\\Lambda', doc: 'leading-edge' } },
  ],
  compute(v) {
    if (fins(v) && !(v.sweep < 90)) throw new InputError('The leading-edge sweep must be less than 90°.');
    const p = params(v), G = p.G, o = newtonian(p);
    const warnings = [];
    const faired = [o.cap?.faired && 'tip', o.cone?.faired && 'cone', o.le?.faired && 'fin edges'].filter(Boolean);
    if (faired.length) warnings.push({ level: 'info', text: `Below Mach 1 Newtonian theory does not apply: the ${faired.join(', ')} values are blended linearly to zero at the critical Mach number (${M_CRIT_CAP} for the nose, ${M_CRIT_LE} across a leading edge). Treat them as estimates.` });
    if (G.clamped && isSC(v)) warnings.push({ level: 'warn', text: `The tip radius is larger than the body radius: the nose is drawn and computed as a hemisphere (tip radius ${n3(G.rn)}).`, fix: 'Enter a tip radius no larger than the body radius.' });
    if (G.clamped && isFlat(v)) warnings.push({ level: 'warn', text: 'The flat face is wider than the body: it is computed as a flat-ended body tube.', fix: 'Enter a face diameter no larger than the body diameter.' });
    if (G.cone && G.delta > 60 * d2r && hasNose(v)) warnings.push({ level: 'warn', text: `The cone half-angle is ${n3(G.delta / d2r)}°, above 60°: the shock stands off and the cone acts more like a flat face (Newtonian still gives a fair estimate).`, fix: 'Lengthen the nose for a slimmer cone.' });
    const H = hasNose(v) && v.M > 1 ? Math.sqrt(v.M * v.M - 1) / (v.L / (2 * v.bodyR)) : null;
    const lowH = H != null && H < 1;
    if (lowH) warnings.push({ level: 'info', text: `The nose is not locally hypersonic (H = ${n3(H)} < 1, the memo’s test): for a slim cone the Newtonian cone pressure is only rough.`, fix: 'Compare with the Nose Cone Design calculator’s cone-flow drag for this nose.' });
    // combined nose normal-force slope and centre of pressure (cap at the tip, cone from its forward face at xJ)
    const capN = o.cap?.CNaS || 0, coneN = o.cone?.CNaS || 0, noseN = capN + coneN;
    const noseXcp = noseN > 0 ? (capN * (o.cap?.xcp || 0) + coneN * (G.xJ + (o.cone?.xcp || 0))) / noseN : null;
    const or = (x) => (x == null || !Number.isFinite(x) ? dash : x);
    const results = {
      CDnose: o.CDnose, CDfins: o.CDfins, CD: o.CD, cpt: o.cpt, Sref: p.Sref,
      delta: hasNose(v) ? G.delta / d2r : dash, thetaM: G.cap ? G.thetaM / d2r : dash, H: or(H),
      capCDS: or(o.cap?.CDS), coneCDS: or(o.cone?.CDS), flatCDS: or(o.flat?.CDS),
      noseCNa: hasNose(v) ? noseN / p.Sref : dash, noseXcp: or(noseXcp),
      MN: or(o.le?.MN), cptLE: o.le ? cpStagnation(o.le.MN) : dash, lLE: o.le ? p.le.l : dash, leCDS: or(o.le?.CDS),
    };
    return { results, warnings, o, v, G, p, lowH, H };
  },
  plots: [
    {
      id: 'along', title: 'Along the nose: where the pressure and the drag are', wide: true, height: 560, when: hasNose,
      info: { text: [
        'Everything on one length axis from the tip: the nose itself, the pressure on its surface, and its drag added up from the tip back.',
        'The pressure is highest at the tip (the stagnation point, $C_{PT}$) and falls over the rounded cap as the surface turns away from the flow, as $\\cos^2\\theta$; on the cone it is constant. The dashed line is Newton’s original theory, with 2 in place of $C_{PT}$.',
        'Look at the bottom panel: a small rounded tip adds little drag, most of it comes from the cone’s area.',
      ], doc: 'cap' },
      build(v, out, { U }) {
        if (!hasNose(v)) return null;
        const ul = U(LEN), G = out.G, S = noseSurface(G, v.M), cpt = fairing(v.M, M_CRIT_CAP) * cpStagnation(Math.max(v.M, 1));
        const stub = 0.3 * Math.max(G.L, G.R), Lx = ul.v(G.L);
        const draw = (g, X, Y) => {
          const top = outline(G, stub).map(([x, r]) => [X(ul.v(x)), Y(ul.v(r))]), bot = outline(G, stub).map(([x, r]) => [X(ul.v(x)), Y(-ul.v(r))]).reverse();
          g.append(s('path', { d: path([...top, ...bot], true), fill: 'var(--surface-2)', stroke: 'var(--text)', 'stroke-width': 1.4 }));
          g.append(s('line', { x1: X(0), x2: X(ul.v(G.L + stub)), y1: Y(0), y2: Y(0), class: 'sc-thin', 'stroke-dasharray': '6 3' }));
        };
        const classical = v.M >= 1 ? S.map(([x, , c]) => [ul.v(x), (2 * c) / cpt]) : [];
        const vl = G.cap && G.cone ? [{ x: ul.v(G.xJ), label: 'tip | cone', color: 'var(--text-3)' }] : [];
        return {
          x: { label: 'Station from the tip $x$', unit: ul.label }, xDomain: [0, Lx], vlines: vl,
          panels: [
            { y: { label: 'Nose', scaleNote: 'not to scale' }, yDomain: [-1.15 * ul.v(G.R), 1.15 * ul.v(G.R)], equalAspect: true, minHeight: 70, maxHeight: 150, draw },
            { y: { label: 'Surface pressure $C_P$' }, color: 'var(--series-1)', includeZero: true,
              series: [{ name: 'modified Newtonian $C_{PT}\\cos^2\\theta$', points: S.map(([x, , c]) => [ul.v(x), c]) }, ...(classical.length ? [{ name: 'classical Newtonian $2\\cos^2\\theta$', dash: '7 4', color: 'var(--text-3)', points: classical }] : [])],
              hlines: cpt > 0 ? [{ y: cpt, label: `stagnation $C_{PT}$ = ${n3(cpt)}`, color: 'var(--text-3)' }] : [] },
            { y: { label: 'Drag from the tip $C_D$' }, color: 'var(--series-2)', includeZero: true,
              series: [{ name: 'nose drag so far', dash: '2 3', points: S.map(([x, , , a]) => [ul.v(x), a / out.p.Sref]) }],
              hlines: [{ y: out.o.CDnose, label: `your nose $C_{D,nose}$ = ${fmt(out.o.CDnose, { digits: 3 })}`, color: 'var(--text-3)' }] },
          ],
        };
      },
    },
    {
      id: 'mach', title: 'Wave drag against Mach number', wide: true,
      info: { text: [
        'The drag coefficient of each blunt part and their total across Mach number; the dot is your flight.',
        'Above Mach 1 the drag grows slowly as the tip pressure $C_{PT}$ rises. Below Mach 1 the curves are blended to zero (estimate). Swept fin edges only start to carry a shock where the flow across them reaches Mach 1 (the second line).',
        'Use it to see how much the blunt parts cost over your whole flight, not just at its peak.',
      ], doc: 'totals' },
      build(v, out) {
        const mmax = Math.max(4, v.M * 1.3), keys = [['CD', 'total', 'var(--text)', null], ['nose', 'nose', 'var(--series-1)', '7 4'], ['fins', 'fin edges', 'var(--series-4)', '9 3 2 3']];
        const series = keys.filter(([k]) => k === 'CD' || (k === 'fins' ? v.fins : hasNose(v))).map(([k, name, color, d]) => ({ k, name, color, dash: d, points: [] }));
        for (let i = 0; i <= 160; i++) {
          const M = 0.3 + ((mmax - 0.3) * i) / 160, o = newtonian(params(v, { M }));
          for (const se of series) se.points.push([M, se.k === 'CD' ? o.CD : se.k === 'fins' ? o.CDfins : o.CDnose]);
        }
        const vlines = [{ x: 1, label: 'Mach 1', color: 'var(--text-3)' }];
        const Medge = v.fins && v.sweep > 0.5 ? 1 / Math.cos(v.sweep * d2r) : null;
        if (Medge && Medge <= mmax) vlines.push({ x: Medge, label: 'fin edge $M_N=1$', color: 'var(--text-3)', row: 1 });
        return { x: { label: 'Mach number $M_\\infty$' }, y: { label: 'Drag coefficient $C_D$' }, includeZero: true, series: series.map(({ k, ...se }) => se), vlines,
          markers: [{ x: v.M, y: out.o.CD, label: `your rocket $C_D$ = ${fmt(out.o.CD, { digits: 3 })}` }] };
      },
    },
    {
      id: 'blunt', title: 'Trade-off: nose drag against tip bluntness', explore: true, when: hasNose,
      info: { text: [
        'The nose wave drag at your Mach number, length and body radius, for tip radii (or flat-face diameters) from sharp to fully blunt; the dot is your nose.',
        'A small rounding costs almost nothing; the drag climbs steeply once the tip is a large part of the body radius.',
      ], doc: 'cap' },
      build(v, out, { U }) {
        if (!hasNose(v)) return null;
        const ul = U(LEN), id = isSC(v) ? 'rn' : 'Df', top = isSC(v) ? v.bodyR : 2 * v.bodyR, pts = [];
        for (let i = 0; i <= 80; i++) { const x = (top * i) / 80, o = newtonian(params(v, { [id]: x })); pts.push([ul.v(x), o.CDnose]); }
        const mine = Math.min(v[id], top);
        return { x: { label: isSC(v) ? 'Tip radius $r_n$' : 'Flat-face diameter $D_F$', unit: ul.label }, y: { label: 'Nose wave drag $C_{D,nose}$' }, includeZero: true,
          series: [{ name: '$C_{D,nose}$', points: pts }], markers: [{ x: ul.v(mine), y: out.o.CDnose, label: 'your nose' }] };
      },
    },
    {
      id: 'sweep', title: 'Trade-off: fin edge drag against sweep', explore: true, when: fins,
      info: { text: [
        'The leading-edge drag of all fins at your Mach number, thickness and span, for sweep angles from 0 to 80°; the dot is your fins.',
        'Sweeping the edge back slows the flow across it ($M_N=M\\cos\\Lambda$). Beyond the line the cross flow is subsonic: no shock on the edge, and the value is a blended estimate.',
      ], doc: 'leading-edge' },
      build(v, out) {
        if (!v.fins) return null;
        const pts = []; for (let i = 0; i <= 160; i++) { const sw = (80 * i) / 160; pts.push([sw, newtonian(params(v, { sweep: sw })).CDfins]); }
        const vlines = v.M > 1 ? [{ x: Math.acos(1 / v.M) / d2r, label: 'edge $M_N=1$', color: 'var(--text-3)' }] : [];
        return { x: { label: 'Leading-edge sweep $\\Lambda$', unit: '°' }, y: { label: 'Fin edge drag $C_{D,LE}$' }, includeZero: true, xDomain: [0, 80],
          series: [{ name: '$C_{D,LE}$', color: 'var(--series-4)', points: pts }], vlines, markers: [{ x: v.sweep, y: out.o.CDfins, label: 'your fins' }] };
      },
    },
    {
      id: 'cpt', title: 'Pressure at the tip against Mach number', explore: true,
      info: { text: ['Lees’ $C_{PT}$ against Mach number (the memo’s first figure); Newton’s original theory uses the constant 2. Above Mach 1 it is the pressure behind a normal shock (Rayleigh pitot formula), below it the shock-free value.'], doc: 'stagnation' },
      build(v, out) {
        const top = Math.max(6, v.M * 1.2), pts = Array.from({ length: 121 }, (_, i) => { const M = 0.1 + ((top - 0.1) * i) / 120; return [M, cpStagnation(M)]; });
        return { x: { label: 'Mach number $M_\\infty$' }, y: { label: 'Tip pressure coefficient $C_{PT}$' }, includeZero: true, yDomain: [0, 2.2],
          series: [{ name: '$C_{PT}$', points: pts }, { name: 'classical Newtonian (2)', points: [[0.1, 2], [top, 2]], dash: '7 4', color: 'var(--text-3)' }],
          markers: [{ x: v.M, y: out.o.cpt, label: `your flight $C_{PT}$ = ${fmt(out.o.cpt, { digits: 3 })}` }] };
      },
    },
  ],
  schematicTitle: 'Blunt parts and the pressure on them',
  schematicHint: 'The nose to scale with the Newtonian pressure on its surface (arrows ∝ C_P), the stagnation point and the shock (sketched), and a fin with its leading edge, the flow across it and a section through the rounded edge. Drag the tip to change the nose length, the shoulder for the body radius, the handle under the tip for the tip radius (or the face edge for its diameter), and the fin tip for the sweep',
  schematic(ctx, v, out) {
    const W = 760, H = 410, G = out.G, o = out.o;
    const fr = ctx.frame({ width: W, height: H, label: 'Blunt nose and fin leading edge with the Newtonian surface pressure' });
    const g = fr.layer('main'); g.replaceChildren();
    const u = ctx.U(LEN), D = (x) => `${fmt(u.v(x), { digits: 3 })} ${u.plain}`;
    const yc = 205, tx = 165;
    g.append(s('line', { x1: 478, x2: 478, y1: 14, y2: H - 14, stroke: 'var(--border)', 'stroke-dasharray': '4 4' }));
    g.append(text(18, 24, 'NOSE · TO SCALE', { cls: 'sc-dim-text', size: 10 }));
    // oncoming flow
    for (const dy of [-150, -80, 80, 150]) g.append(s('path', { d: `M24,${yc + dy}l62,0`, class: 'sc-thin', 'marker-end': fr.arrow() }));
    g.append(text(24, yc - 160, `air · M = ${n3(v.M)}`, { size: 11, field: 'M' }));
    // ---------- nose ----------
    if (!hasNose(v)) {
      g.append(text(250, yc, 'no blunt nose', { anchor: 'middle', cls: 'sc-dim-text', size: 12, field: 'noseType' }));
      g.append(text(250, yc + 18, 'its wave drag comes from Nose Cone Design', { anchor: 'middle', cls: 'sc-dim-text', size: 10.5, field: 'noseType' }));
    } else {
      const stub = 0.3 * Math.max(G.L, G.R), k = Math.min((462 - tx) / (G.L + stub), 118 / G.R);
      const X = (x) => tx + x * k, Y = (r) => yc - r * k;
      // shock: attached cone shock for a sharp cone (NACA 1135 cone flow), otherwise a detached bow shock (qualitative)
      const bluntPx = G.cap ? G.rn * k : G.flat ? (G.D / 2) * k : 0;
      let sx = tx;
      if (v.M > 1) {
        const mu = Math.asin(1 / v.M), cf = bluntPx < 0.5 ? coneFlow(v.M, G.delta) : { attached: false };
        if (cf.attached) {
          const l = Math.min(330, 175 / Math.sin(cf.beta));
          for (const sg of [1, -1]) g.append(s('line', { x1: tx, y1: yc, x2: tx + l * Math.cos(cf.beta), y2: yc - sg * l * Math.sin(cf.beta), stroke: 'var(--danger)', 'stroke-width': 2, 'data-field': 'M L bodyR' }));
          g.append(text(tx + 150 * Math.cos(cf.beta) - 6, yc - 150 * Math.sin(cf.beta) - 6, `attached shock ${n3(cf.beta / d2r)}°`, { anchor: 'end', size: 10.5, field: 'M' }));
        } else {
          // stand-off grows as M → 1 (qualitative only); hyperbola-like curve with Mach-angle asymptotes
          const so = Math.min(60, Math.max(6, 0.35 * Math.max(bluntPx, 8) / Math.sqrt(v.M * v.M - 1)));
          const Rs = Math.max(bluntPx, 10) * 1.3, cot = 1 / Math.tan(mu), pts = [];
          sx = tx - so;
          for (let i = -40; i <= 40; i++) { const yy = (175 * i) / 40, xx = sx + (Math.sqrt(Rs * Rs + yy * yy) - Rs) * cot; if (xx < 470) pts.push([xx, yc - yy]); }
          g.append(s('path', { d: path(pts), fill: 'none', stroke: 'var(--danger)', 'stroke-width': 2, 'data-field': 'M rn Df' }));
          const lp = pts[Math.max(0, pts.length - 4)];
          g.append(text(Math.min(lp[0], 462), lp[1] + 2, 'bow shock (sketch)', { anchor: 'end', size: 10.5, field: 'M' }));
        }
      } else g.append(text(tx - 6, yc - 128, 'subsonic: no shock', { anchor: 'middle', cls: 'sc-dim-text', size: 10.5, field: 'M' }));
      // body outline (to scale)
      const top = outline(G, stub).map(([x, r]) => [X(x), Y(r)]), bot = outline(G, stub).map(([x, r]) => [X(x), Y(-r)]).reverse();
      g.append(s('path', { d: path([...top, ...bot], true), class: 'sc-body', 'data-field': 'noseType rn Df L bodyR' }));
      g.append(s('line', { x1: X(G.L), x2: X(G.L), y1: Y(G.R), y2: Y(-G.R), class: 'sc-thin', 'stroke-dasharray': '3 3' }));
      g.append(s('line', { x1: tx - 4, x2: X(G.L + stub) + 8, y1: yc, y2: yc, class: 'sc-thin', 'stroke-dasharray': '8 3 2 3' }));
      // Newtonian pressure arrows on the top surface, length ∝ C_P (scaled to the hypersonic C_PT)
      const S = noseSurface(G, v.M, 80), pts = S.map(([x, r, c]) => ({ x, r, c }));
      const nrm = (q, i) => {
        if (G.flat && i < 2) return [-1, 0];
        if (G.cap && q.x <= G.xJ + 1e-12 && i <= 80) { const th = Math.atan2(q.r, G.rn - q.x); return [-Math.cos(th), Math.sin(th)]; }
        return [-Math.sin(G.delta), Math.cos(G.delta)];
      };
      const arc = [0]; for (let i = 1; i < pts.length; i++) arc.push(arc[i - 1] + Math.hypot((pts[i].x - pts[i - 1].x) * k, (pts[i].r - pts[i - 1].r) * k));
      const total = arc.at(-1), nA = 13, ag = s('g', { 'data-field': 'M rn Df L' });
      for (let j = 0; j < nA; j++) {
        const target = (total * j) / (nA - 1); let i = arc.findIndex((a) => a >= target - 1e-9); if (i < 0) i = pts.length - 1;
        const q = pts[i], len = (q.c / CPT_MAX) * 46; if (len < 2) continue;
        const [nx, ny] = nrm(q, i), px = X(q.x), py = Y(q.r);
        ag.append(s('path', { d: `M${px + nx * (len + 3)},${py - ny * (len + 3)}L${px + nx * 3},${py - ny * 3}`, class: 'sc-accent', 'stroke-width': 1.6, 'marker-end': fr.arrow('acc') }));
      }
      g.append(ag);
      g.append(text(X(G.L + stub) - 4, Y(G.R) - 8, 'parallel to the flow: C_P = 0', { anchor: 'end', size: 10, cls: 'sc-dim-text' }));
      // stagnation point
      g.append(s('circle', { cx: tx, cy: yc, r: 4, fill: 'var(--accent)' }));
      g.append(text(sx - 8, yc - 22, 'stagnation point', { anchor: 'end', size: 10.5 }));
      g.append(text(sx - 8, yc - 8, `C_{PT} = ${n3(o.cpt)}`, { anchor: 'end', size: 10.5, field: 'M' }));
      // dimensions (bottom half)
      g.append(dim(fr, X(0), Y(-G.R) + 26, X(G.L), Y(-G.R) + 26, `L = ${D(G.L)}`, { field: 'L' }));
      g.append(dim(fr, X(G.L + stub) - 30, yc, X(G.L + stub) - 30, Y(-G.R), `R = ${D(G.R)}`, { field: 'bodyR', textSide: 6 }));
      if (G.cone && G.delta > 0.3 * d2r) {
        const jx = X(G.xJ), jy = Y(-G.r1), ar = 30;
        g.append(s('line', { x1: jx, y1: jy, x2: jx + ar + 10, y2: jy, class: 'sc-thin', 'stroke-dasharray': '3 3' }));
        g.append(s('path', { d: `M${jx + ar},${jy}A${ar},${ar} 0 0 1 ${jx + ar * Math.cos(G.delta)},${jy + ar * Math.sin(G.delta)}`, class: 'sc-thin', fill: 'none' }));
        g.append(text(jx + ar + 14, jy + 12, `\\delta = ${n3(G.delta / d2r)}°`, { size: 10.5, field: 'L rn Df' }));
      }
      if (G.cap) {
        const a = Math.min(G.thetaM, 50 * d2r), cx = X(G.rn), ex = X(G.rn - G.rn * Math.cos(a)), ey = Y(-G.rn * Math.sin(a));
        g.append(s('line', { x1: cx, y1: yc, x2: ex, y2: ey, class: 'sc-thin', 'data-field': 'rn' }));
        g.append(text(tx - 12, Math.max(yc + 34, ey + 16), `r_n = ${D(G.rn)}`, { anchor: 'end', size: 10.5, field: 'rn' }));
      } else if (G.flat) {
        g.append(text(tx - 12, Math.max(yc + 34, Y(-G.D / 2) + 16), `D_F = ${D(G.D)}`, { anchor: 'end', size: 10.5, field: 'Df' }));
      } else g.append(text(tx - 12, yc + 34, 'sharp tip', { anchor: 'end', size: 10.5, field: 'rn' }));
      g.append(text(18, H - 12, 'Nose to scale · arrows ∝ C_P = C_{PT} cos²θ · shock: sketch', { size: 10, cls: 'sc-dim-text' }));
      // handles
      ctx.handle('tip', tx, yc, { field: 'L', title: 'Drag sideways to change the nose length', onDrag: (px) => ctx.setValue('L', Math.max(0.01, v.L + (tx - px) / k), { round: 0.01 }), onKey: (dx) => ctx.setValue('L', Math.max(0.01, v.L * (1 - 0.03 * dx))) });
      ctx.handle('shoulder', X(G.L), Y(G.R), { field: 'bodyR', title: 'Drag up or down to change the body radius', onDrag: (px, py) => ctx.setValue('bodyR', Math.max(0.05, (yc - py) / k), { round: 0.01 }), onKey: (dx, dy) => ctx.setValue('bodyR', v.bodyR * (1 + 0.03 * dy)) });
      if (isSC(v)) {
        const sn = Math.sin(50 * d2r), hy = yc + 16 + G.rn * k * sn;
        ctx.handle('rn', X(G.rn * (1 - Math.cos(50 * d2r))), hy, { field: 'rn', title: 'Drag down to round the tip more (tip radius)', onDrag: (px, py) => ctx.setValue('rn', Math.min(v.bodyR, Math.max(0, (py - yc - 16) / (k * sn))), { round: 0.01 }), onKey: (dx, dy) => ctx.setValue('rn', Math.min(v.bodyR, Math.max(0, v.rn - 0.02 * dy * Math.max(v.bodyR, 0.1)))) });
      } else ctx.handle('face', tx, Y(G.D / 2), { field: 'Df', title: 'Drag up or down to change the flat-face diameter', onDrag: (px, py) => ctx.setValue('Df', Math.min(2 * v.bodyR, Math.max(0, (2 * (yc - py)) / k)), { round: 0.01 }), onKey: (dx, dy) => ctx.setValue('Df', Math.min(2 * v.bodyR, Math.max(0, v.Df + 0.04 * dy * v.bodyR))) });
    }
    // ---------- fin leading edge ----------
    const fg = s('g', { opacity: v.fins ? 1 : 0.28 }); g.append(fg);
    fg.append(text(492, 24, `FIN LEADING EDGE · ${v.fins ? `${v.N} FIN${v.N === 1 ? '' : 'S'}` : 'OFF'}`, { cls: 'sc-dim-text', size: 10, field: 'fins N' }));
    const lam = Math.min(v.sweep, 85) * d2r, b = v.b, tan = Math.tan(lam), cr = b * tan + 0.5 * b;
    const kf = Math.min(200 / b, 205 / cr), rx = 530, yb = 350;
    const tipX = rx + b * tan * kf, tipY = yb - b * kf;
    fg.append(s('rect', { x: 486, y: yb, width: W - 492, height: 16, fill: 'var(--surface-2)', stroke: 'var(--text-3)' }));
    fg.append(text(W - 10, yb + 12, 'body', { anchor: 'end', size: 9.5, cls: 'sc-dim-text' }));
    fg.append(s('path', { class: 'sc-body-2', d: path([[rx, yb], [tipX, tipY], [tipX + 0.5 * b * kf, tipY], [rx + cr * kf, yb]], true), 'data-field': 'b sweep' }));
    fg.append(s('line', { x1: rx, y1: yb, x2: tipX, y2: tipY, class: 'sc-accent', 'stroke-width': 3.5, 'data-field': 'sweep b t' }));
    fg.append(dim(fr, rx - 16, yb, rx - 16, tipY, `b = ${D(b)}`, { field: 'b', textSide: 6 }));
    if (lam > 0.5 * d2r) {
      const ar = 36;
      fg.append(s('line', { x1: rx, y1: yb, x2: rx, y2: yb - ar - 12, class: 'sc-thin', 'stroke-dasharray': '3 3' }));
      fg.append(s('path', { d: `M${rx},${yb - ar}A${ar},${ar} 0 0 1 ${rx + ar * Math.sin(lam)},${yb - ar * Math.cos(lam)}`, class: 'sc-thin', fill: 'none' }));
    }
    fg.append(text(rx + 6, yb - 50, `\\Lambda = ${n3(v.sweep)}°`, { size: 10.5, field: 'sweep' }));
    // flow and its component across the edge, at the middle of the edge
    const mx = rx + 0.72 * (tipX - rx), my = yb + 0.72 * (tipY - yb), nX = Math.cos(lam), nY = Math.sin(lam), aL = 64;   // high on the edge, clear of the span and sweep labels
    fg.append(s('path', { d: `M${mx - aL},${my}L${mx - 4},${my}`, class: 'sc-thin', 'marker-end': fr.arrow(), 'data-field': 'M' }));
    fg.append(text(mx - aL, my - 6, `M = ${n3(v.M)}`, { size: 10, cls: 'sc-dim-text', field: 'M' }));
    if (lam > 0.5 * d2r) {
      const nl = aL * Math.cos(lam);
      fg.append(s('path', { d: `M${mx - nl * nX - 3 * nX},${my - nl * nY - 3 * nY}L${mx - 3 * nX},${my - 3 * nY}`, class: 'sc-accent', 'stroke-width': 1.8, 'marker-end': fr.arrow('acc'), 'data-field': 'sweep M' }));
      fg.append(text(mx - aL, my - 20, `M_N = ${o.le ? n3(o.le.MN) : n3(v.M * Math.cos(lam))}`, { size: 10.5, field: 'sweep M' }));
    }
    // section across the edge, enlarged: rounded nose with Newtonian pressure arrows ∝ cos²θ
    {
      const cx = 600, cy = 92, rr = 16, MN = v.M * Math.cos(lam), cptN = fairing(MN, M_CRIT_LE) * cpStagnation(Math.max(MN, 1));
      const sg = s('g', { 'data-field': 't M sweep' }); fg.append(sg);
      sg.append(s('path', { class: 'sc-body', d: `M${cx + 40},${cy - rr}L${cx},${cy - rr}A${rr},${rr} 0 0 0 ${cx},${cy + rr}L${cx + 40},${cy + rr}` }));
      for (let i = -3; i <= 3; i++) {
        const th = (i * Math.PI) / 7.5, len = (Math.max(0, cptN) / CPT_MAX) * 30 * Math.cos(th) ** 2; if (len < 2) continue;
        const px = cx - rr * Math.cos(th), py = cy - rr * Math.sin(th);
        sg.append(s('path', { d: `M${px - Math.cos(th) * (len + 3)},${py - Math.sin(th) * (len + 3)}L${px - Math.cos(th) * 3},${py - Math.sin(th) * 3}`, class: 'sc-accent', 'stroke-width': 1.5, 'marker-end': fr.arrow('acc') }));
      }
      if (MN > 1) sg.append(s('path', { d: `M${cx - rr - 44 + 30},${cy - 52}Q${cx - rr - 52},${cy} ${cx - rr - 44 + 30},${cy + 52}`, fill: 'none', stroke: 'var(--danger)', 'stroke-width': 1.6 }));
      sg.append(text(cx + 48, cy - 4, `t = ${D(v.t)}`, { size: 10.5, field: 't' }));
      sg.append(text(cx + 48, cy + 12, `C_{PT}(M_N) = ${n3(cpStagnation(MN))}`, { size: 10.5, field: 'M sweep' }));
      sg.append(text(cx + 20, cy + 40, MN > 1 ? 'edge section, enlarged (shock sketched)' : 'edge section, enlarged: subsonic', { anchor: 'middle', size: 9.5, cls: 'sc-dim-text' }));
    }
    g.append(text(W - 10, H - 12, 'Fin to its own scale · chords drawn nominal', { anchor: 'end', size: 10, cls: 'sc-dim-text' }));
    if (v.fins) ctx.handle('sweep', tipX, tipY, { field: 'sweep', title: 'Drag sideways to change the leading-edge sweep', onDrag: (px, py) => ctx.setValue('sweep', Math.max(0, Math.min(80, Math.atan2(px - rx, Math.max(1, yb - py)) / d2r)), { round: 0.5 }), onKey: (dx) => ctx.setValue('sweep', Math.max(0, Math.min(80, v.sweep + dx))) });
  },
  symbols: {
    'M_\\infty': 'free-stream (flight) Mach number (no unit)', '\\gamma': 'ratio of specific heats of air, 1.4 (no unit)', p_T: 'stagnation pressure behind the normal shock (Pa or lbf/ft²)', 'p_\\infty': 'free-stream air pressure (Pa or lbf/ft²)',
    'C_{PT}': 'stagnation pressure coefficient (no unit)', 'C_P': 'surface pressure coefficient (no unit)', '\\theta': 'angle between the surface normal and the flow (°)', '\\theta_M': 'cap angle where the tip meets the cone (°)',
    R: 'body radius (mm or in)', r_n: 'tip radius (mm or in)', L: 'nose length from the tip to the shoulder (mm or in)', r_1: 'radius where the tip meets the cone (mm or in)', L_C: 'length of the cone (mm or in)', x_J: 'station where the tip meets the cone (mm or in)',
    'S_{ref}': 'reference area, the body cross-section (cm² or in²)', '\\delta': 'cone half-angle (°)', D_F: 'flat-face diameter (mm or in)', 'C_{D,F}': 'flat-face drag coefficient on its own area (no unit)', H: 'hypersonic similarity parameter (no unit)',
    M_N: 'Mach number across the leading edge (no unit)', '\\Lambda': 'leading-edge sweep angle (°)', 'R_{LE}': 'leading-edge radius (mm or in)', t: 'fin thickness (mm or in)', b: 'fin span (mm or in)', l: 'leading-edge length of one fin (mm or in)', N: 'number of fins',
    '(C_DS)_{cap}': 'drag area of the rounded tip (cm² or in²)', '(C_DS)_{cone}': 'drag area of the cone (cm² or in²)', '(C_DS)_F': 'drag area of the flat face (cm² or in²)', '(C_DS)_{LE}': 'drag area of one leading edge (cm² or in²)',
    'C_{D,nose}': 'nose wave-drag coefficient (no unit)', 'C_{D,LE}': 'leading-edge drag coefficient of all fins (no unit)', C_D: 'drag coefficient of the blunt parts (no unit)',
    'C_{N\\alpha,nose}': 'nose normal-force slope (per radian)', 'C_{N\\alpha}': 'normal-force slope (per radian)', 'X_{CP}': 'nose centre of pressure behind the tip (mm or in)', u: 'one minus the cosine of the cap angle (no unit)', f: 'subsonic blending factor (no unit)',
  },
  report(v, out, R) {
    const o = out.o, G = out.G, n = R.n, l = (x) => R.v(x, LEN), A = (x) => R.Q(x, AREA), steps = [];
    steps.push({ label: 'Stagnation pressure coefficient behind a normal shock (Rayleigh pitot formula)', lhs: 'C_{PT}',
      eq: v.M > 1 ? '\\frac{2}{\\gamma M_\\infty^2}\\left\\{\\left[\\tfrac12(\\gamma+1)M_\\infty^2\\right]^{\\frac{\\gamma}{\\gamma-1}}\\left[\\frac{\\gamma+1}{2\\gamma M_\\infty^2-(\\gamma-1)}\\right]^{\\frac{1}{\\gamma-1}}-1\\right\\}' : '\\frac{2}{\\gamma M_\\infty^2}\\left\\{\\left[1+\\tfrac{\\gamma-1}{2}M_\\infty^2\\right]^{\\frac{\\gamma}{\\gamma-1}}-1\\right\\}',
      sub: `\\gamma=1.4,\\ M_\\infty=${n(v.M)}`, res: n(o.cpt) });
    if (G.kind === 'spherecone') steps.push(
      { label: 'Cone half-angle of a rounded cone (the tip sphere tangent to the cone through the shoulder)', lhs: '\\delta', eq: '\\text{root of }R\\cos\\delta-(L-r_n)\\sin\\delta=r_n', sub: `R=${l(G.R)},\\ L=${l(G.L)},\\ r_n=${l(G.rn)}`, res: `${n(G.delta / d2r)}^{\\circ}` },
      { label: 'Where the tip meets the cone', lhs: 'r_1', eq: 'r_n\\cos\\delta', res: R.Q(G.r1, LEN) },
      { lhs: 'L_C', eq: 'L-r_n(1-\\sin\\delta)', res: R.Q(G.Lc, LEN) });
    if (G.kind === 'flat') steps.push({ label: 'Cone half-angle behind the flat face', lhs: '\\delta', eq: '\\arctan\\frac{R-D_F/2}{L}', sub: `\\arctan\\frac{${l(G.R)}-${l(G.D / 2)}}{${l(G.L)}}`, res: `${n(G.delta / d2r)}^{\\circ}` });
    if (o.cap) steps.push(
      { label: 'Tip (cap) drag area (memo eq. 7)', lhs: '(C_DS)_{cap}', eq: '\\pi r_n^2\\,\\frac{C_{PT}}{2}\\,(1-\\cos^4\\theta_M)', sub: `\\theta_M=90^{\\circ}-\\delta=${n(G.thetaM / d2r)}^{\\circ}${o.cap.faired ? ',\\ \\text{blended below Mach 1}' : ''}`, res: A(o.cap.CDS) },
      { label: 'Tip centre of pressure behind the tip (memo eq. 17, cancellation-free form)', lhs: 'X_{CP,cap}', eq: 'r_n\\,\\frac{4u\\left(\\frac23-\\frac34u+\\frac15u^2\\right)}{(2-u)^2},\\qquad u=1-\\cos\\theta_M', res: R.Q(o.cap.xcp, LEN) });
    if (o.cone) steps.push({ label: 'Cone pressure and drag area (memo eqs. 23–24)', lhs: '(C_DS)_{cone}', eq: 'C_{PT}\\sin^2\\delta\\;\\pi(R^2-r_1^2)', res: A(o.cone.CDS) });
    if (o.flat) steps.push({ label: 'Flat face (memo eqs. 1 and 29)', lhs: '(C_DS)_F', eq: v.M >= 1 ? 'C_{PT}\\,\\frac{\\pi D_F^2}{4}' : '0.85\\left[1+\\tfrac14\\left(M_\\infty^2+M_\\infty^4\\right)\\right]\\frac{\\pi D_F^2}{4}', sub: `D_F=${l(G.D)}`, res: A(o.flat.CDS) });
    if (o.le) steps.push(
      { label: 'Mach number across the leading edge', lhs: 'M_N', eq: 'M_\\infty\\cos\\Lambda', sub: `${n(v.M)}\\cos${n(v.sweep)}^{\\circ}`, res: n(o.le.MN) },
      { label: 'Leading-edge drag area of one fin (memo eqs. 18–22, cross-flow $C_{PT}$ at $M_N$)', lhs: '(C_DS)_{LE}', eq: '\\tfrac43\\,R_{LE}\\,l\\,C_{PT}(M_N)\\cos^3\\Lambda,\\qquad R_{LE}=\\tfrac t2,\\ l=\\frac{b}{\\cos\\Lambda}', sub: `t=${l(v.t)},\\ b=${l(v.b)},\\ C_{PT}(M_N)=${n(cpStagnation(Math.max(o.le.MN, 1)))}${o.le.faired ? ',\\ \\text{blended below } M_N=1' : ''}`, res: A(o.le.CDS) });
    steps.push(
      { label: 'Reference area', lhs: 'S_{ref}', eq: '\\pi R^2', sub: `\\pi\\,(${l(v.bodyR)})^2`, res: A(out.p.Sref) },
      { label: 'Wave-drag coefficients for the Drag Coefficient calculator', lhs: 'C_{D,nose}', eq: '\\frac{(C_DS)_{cap}+(C_DS)_{cone}+(C_DS)_F}{S_{ref}}', res: n(o.CDnose, 4) },
      { lhs: 'C_{D,LE}', eq: '\\frac{N\\,(C_DS)_{LE}}{S_{ref}}', sub: `N=${v.fins ? v.N : 0}`, res: n(o.CDfins, 4) },
      { lhs: 'C_D', eq: 'C_{D,nose}+C_{D,LE}', sub: `${n(o.CDnose, 4)}+${n(o.CDfins, 4)}`, res: n(o.CD, 4) });
    return [{
      title: 'Theory',
      text: 'Newtonian impact theory gives the pressure coefficient $C_P=2\\cos^2\\theta$ on a surface whose normal makes the angle $\\theta$ with the flow. Lees’ modification replaces the 2 by the stagnation pressure coefficient $C_{PT}$ behind a normal shock, so that the stagnation pressure is right; this describes blunt elements well from low supersonic Mach numbers. Integrating $C_P$ over the rounded tip, the cone and a rounded (half-cylinder) leading edge gives the closed forms below. For a swept leading edge only the Mach number across the edge counts. Below Mach 1 the values are blended linearly to zero at the critical Mach number.',
      steps,
    }];
  },
  references: ['modified-newtonian-aero4'],
  examples: [
    { name: 'Rounded cone, 6 in body, 1/8 in fins at Mach 2', values: { M: 2, bodyR: 3, noseType: 'spherecone', rn: 1.2, L: 11.3033, fins: true, N: 4, t: 0.125, b: 6, sweep: 30 } },
    { name: 'Memo example: 1/8 in fin, 15 in edge swept 30° (Mach 4)', values: { M: 4, bodyR: 3, noseType: 'none', fins: true, N: 1, t: 0.125, b: 15 * Math.cos(30 * d2r), sweep: 30 } },
    { name: 'Flat-faced cone at Mach 1.5', values: { M: 1.5, bodyR: 3, noseType: 'flat', Df: 3, L: 6, fins: false } },
    { name: 'Hemisphere nose at Mach 4', values: { M: 4, bodyR: 2, noseType: 'spherecone', rn: 2, L: 2, fins: false } },
  ],
};

/** Top half of the nose and a body stub as [x, r] points (tip at x = 0). */
function outline(G, stub) {
  const pts = [];
  if (G.kind === 'spherecone') {
    if (G.cap) for (let i = 0; i <= 40; i++) { const th = (G.thetaM * i) / 40; pts.push([G.rn * (1 - Math.cos(th)), G.rn * Math.sin(th)]); }
    else pts.push([0, 0]);
  } else pts.push([0, 0], [0, G.D / 2]);
  pts.push([G.L, G.R], [G.L + stub, G.R]);
  return pts;
}
