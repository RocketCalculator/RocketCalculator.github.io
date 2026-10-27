// Subsonic Centre of Pressure (Barrowman / NACA 1307) — UI definition.
import { subsonicCP } from '../calc/barrowmanSub.js';
import { NOSE_TYPES, bodyProfile } from '../calc/noseShapes.js';
import { s, fmt, InputError } from '../util.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';
import { dim, path, text, pointMarker, finEndView } from '../ui/svg.js';

const LEN = { dim: 'length', internal: 'in' };
const MASS = { dim: 'mass', internal: 'lbm' };
const BALLAST = { dim: 'smallMass', internal: 'lbm' };

const GR3 = [
  { x: 0, r: 0.05 }, { x: 2.5, r: 0.487 }, { x: 5, r: 0.907 }, { x: 7.5, r: 1.261 }, { x: 10, r: 1.549 }, { x: 12.5, r: 1.773 },
  { x: 15, r: 1.932 }, { x: 17.5, r: 2.028 }, { x: 20, r: 2.06 }, { x: 86, r: 2.06 }, { x: 93.16, r: 2.06 },
];
const GR3_FINS = { N: 6, xLE: 83.16, cR: 10, cT: 3, xTipLE: 90.16, b: 4, bt: 0 };

const notCustom = (v) => v.noseType !== 'custom';
/** Nose length actually used: never longer than the rocket (coupled inputs never block the page). */
const noseLen = (v) => Math.min(v.noseL, v.bodyLen);

/** The body profile actually analysed: generated from the nose shape, or the custom table. */
export function profileOf(v) {
  if (v.noseType === 'custom') return v.profile;
  return bodyProfile({ noseType: v.noseType, noseL: noseLen(v), R: v.R, bodyLen: v.bodyLen, btLen: v.btLen, btR: v.btR, k: v.k, n: v.pow });
}
/** Station where the nose meets the body tube (custom profile: first point at the full radius). */
function shoulderOf(v, prof) {
  if (notCustom(v)) return noseLen(v);
  const rmax = Math.max(...prof.map((q) => q.r));
  return prof.find((q) => q.r >= rmax * 0.999)?.x ?? 0;
}

// Verdict bands (D-subsonic-cp): UNSAFE below the user's minimum margin (default 1 calibre), MARGINAL up to the user's
// target (default 1.5), SAFE above. Common amateur practice, not a published limit (Hoult only mentions "the classical
// two calibres" in the roll lock-in memo).
const MANY_CAL = 4;
const ST = { safe: 'ok', marginal: 'warn', unsafe: 'err' };
const COL = { safe: 'var(--ok)', marginal: 'var(--warn)', unsafe: 'var(--danger)', none: 'var(--text-3)' };

function finsOf(v) {
  return { N: v.N, xLE: v.xLE, xTipLE: v.xTipLE, cR: v.cR, cT: v.cT, b: v.b, tanBT: Math.tan((v.bt * Math.PI) / 180) };
}
/** CP without the NACA 1307 body carry-over lift (as Barrowman-style tools compute it). */
function xcpNoCarry(o) {
  const b = o.body, f = o.fin;
  return (b.Cma_flat + b.mom + f.xcpFin * f.CNaWB) / (b.CNa + f.CNaWB);
}

/**
 * Static margin in every case that matters: launch and burnout CG, Mach 0 and the flight Mach (fin lift grows with
 * Mach, so the CP is furthest forward at low speed), and with or without the NACA 1307 carry-over lift on the body.
 */
function margins(v, prof) {
  const cgs = [['launch', v.xcg], ['burnout', v.xcgB]].filter(([, x]) => x != null && Number.isFinite(x));
  const rows = [];
  for (const M of [0, v.M]) {
    const o = subsonicCP({ M, profile: prof, flatNose: v.flatNose, fins: finsOf(v) }), x0 = xcpNoCarry(o);
    for (const [cg, x] of cgs) {
      rows.push({ M, cg, x, carry: true, xcp: o.xcp, SM: (o.xcp - x) / o.d, d: o.d });
      rows.push({ M, cg, x, carry: false, xcp: x0, SM: (x0 - x) / o.d, d: o.d });
    }
  }
  const worst = rows.reduce((w, r) => (!w || r.SM < w.SM ? r : w), null);
  return { rows, worst, xcpMin: Math.min(...rows.map((r) => r.xcp)) };
}
const caseText = (w) => `${w.cg} CG, Mach ${fmt(w.M, { digits: 2 })}, ${w.carry ? 'with' : 'without'} body carry-over lift`;

/**
 * Value of x where an increasing f crosses zero, searching outward from x0 (grow ×k up to xmax, or shrink ÷k down to
 * xmin) and then bisecting; null if f stays negative up to xmax. When f(xmin) ≥ 0 already, xmin is returned.
 */
function solveCross(f, x0, xmin, xmax, k = 1.6) {
  let lo = x0, hi = x0;
  if (f(x0) >= 0) { for (let i = 0; i < 40 && f(lo) >= 0 && lo > xmin; i++) lo = Math.max(xmin, lo / k); if (f(lo) >= 0) return lo; }
  else { for (let i = 0; i < 40 && f(hi) < 0 && hi < xmax; i++) hi = Math.min(xmax, hi * k); if (f(hi) < 0) return null; }
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (f(m) < 0) lo = m; else hi = m; }
  return hi;
}

/**
 * Fixes that bring the worst-case margin to `T`: forward CG shift (closed form; the margin is linear in the CG),
 * nose ballast (closed form from the definition of the centre of mass, using the launch mass for both CGs — conservative
 * for burnout, where the real rocket is lighter), exposed semispan (bisection on the full worst case). A longer root chord is not offered: grown forward it moves fin area
 * forward and barely helps.
 */
export function fixesFor(v, prof, T) {
  const mg = margins(v, prof);
  if (!mg.worst) return null;
  const d = mg.worst.d, xb = shoulderOf(v, prof) / 2;
  let dCG = 0, ballast = 0;
  for (const cg of ['launch', 'burnout']) {
    const rs = mg.rows.filter((r) => r.cg === cg);
    if (!rs.length) continue;
    const x = rs[0].x, xreq = Math.min(...rs.map((r) => r.xcp)) - T * d;   // furthest-aft CG that meets the target
    dCG = Math.max(dCG, x - xreq);
    if (x > xreq) ballast = xreq > xb ? Math.max(ballast, (v.mass * (x - xreq)) / (xreq - xb)) : Infinity;
  }
  const worstAt = (p) => margins({ ...v, ...p }, prof).worst.SM - T;
  const bNeed = solveCross((b) => worstAt({ b }), v.b, 1e-3 * v.b, 100 * v.b);
  return { mg, dCG: Math.max(0, dCG), ballast: v.mass > 0 && Number.isFinite(ballast) ? ballast : null, xb, bNeed,
    xcgMax: Math.min(...mg.rows.map((r) => r.xcp)) - T * d };
}


export default {
  slug: 'subsonic-cp',
  verdict: true,
  tiers: true,
  topic: 'barrowman-equations',
  title: 'Subsonic Centre of Pressure',
  subtitle: 'Where the air pushes on your rocket (<b>centre of pressure</b>), its <b>static margin</b> through the flight, and the fin size, CG shift or nose ballast that makes it stable — Barrowman’s method with NACA Report 1307 body–fin interference.',
  intro: {
    what: 'Splits the rocket into nose, body and fins, finds how much side force each part makes when the rocket flies at a small angle to the wind, and where the total acts — the centre of pressure (CP).',
    why: 'A rocket flies straight only if the CP is behind the centre of gravity (CG): then any tilt makes a force that turns the nose back into the wind. The distance between them, in body diameters (calibres), is the static margin.',
    when: 'Sizing fins, checking stability before flight (at lift-off and at burnout), working out nose ballast, and producing $C_{N\\alpha}$ and the CP for trajectory and dynamics tools. Valid below about Mach 0.8.',
  },
  info: {
    text: [
      'The <b>body</b> uses Munk’s slender-body theory: each segment produces normal force in proportion to how fast its cross-section area grows. Only the nose (and any shoulder or boat-tail) contributes; cylinders carry none.',
      'The <b>fins</b> use Diederich’s lifting-surface correlation with Prandtl–Glauert compressibility; the body lifts the fins and the fins lift the body, by the NACA Report 1307 interference factors $K_{W(B)}$ and $K_{B(W)}$. A blunt tip gets a hemispherical cap.',
      'The static margin is checked in the worst case — lift-off and burnout CG, Mach 0 and your top speed, with and without the body carry-over lift — and compared with the limits you set.',
    ],
    tex: 'X_{CP}=\\frac{\\sum_i C_{N\\alpha,i}\\,x_i}{\\sum_i C_{N\\alpha,i}},\\qquad \\text{static margin}=\\frac{X_{CP}-X_{CG}}{d}',
    steps: [
      'Enter the body tube and the nose (or measured profile points with <b>Custom profile</b>).',
      'Enter the fin set: number of panels, chords, leading-edge stations and exposed span.',
      'Enter your top Mach number, the CG at lift-off and at burnout, and (for the ballast fix) the rocket mass.',
      'Set the smallest margin you accept and your target.',
      'Read the verdict and its fixes: fin span, root chord, CG shift or nose ballast.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'body', title: 'Body tube',
      fields: [
        { id: 'R', shared: 'bodyR', label: 'Body radius', sym: 'R', ...LEN, default: 2.06, min: 0.05, max: 20, when: notCustom, slider: { min: 0.3, max: 6, step: 0.01 },
          info: { text: ['Half the outside diameter of the body tube. The nose base has the same radius.', 'Measure the outside diameter with calipers and halve it.', 'The diameter is the ruler for the static margin: a fatter rocket needs its CP further behind the CG for the same margin in calibres, and its nose makes the same normal force on a bigger reference area.'], tex: 'd=2R,\\quad S_{ref}=\\frac{\\pi d^2}{4}', range: 'Model 10–25 mm; high-power 38–100 mm (1.5–4 in); research 100–300 mm (4–12 in).', doc: 'body' } },
        { id: 'bodyLen', shared: 'length', label: 'Overall length', sym: 'L', ...LEN, default: 93.16, min: 0.5, max: 1000, when: notCustom, slider: { min: 10, max: 200, step: 0.1 },
          info: { text: ['Length of the whole rocket, from the nose tip to the base.', 'Measure it assembled, along the body.', 'Length alone does not move the CP (a cylinder makes no normal force), but it sets where the fins can go: the fins must sit on the body, and longer rockets put them further behind the CG.'], range: 'Fineness L/d of 10–20 is common.', doc: 'body', tex: 'X_{CP}=\\frac{\\sum C_{N\\alpha,i}\\,x_{cp,i}}{\\sum C_{N\\alpha,i}}' } },
        { id: 'btLen', label: 'Boat-tail length', sym: 'L_{bt}', ...LEN, default: 0, min: 0, max: 200, when: notCustom, slider: { min: 0, max: 20, step: 0.1 },
          info: { text: ['Length of a conical taper at the base of the rocket. Leave 0 for a plain cylinder.', 'Measure from where the taper starts to the base.', 'A boat-tail makes a small normal force the wrong way (its area shrinks), moving the CP forward and lowering the margin.'], range: 'Usually 0; up to 1–2 calibres on drag-optimised rockets.', doc: 'body', tex: 'C_{N\\alpha}=\\frac{2(A_i-A_{i-1})}{S_{ref}}' } },
        { id: 'btR', label: 'Boat-tail end radius', sym: 'R_{bt}', ...LEN, default: 2.06, min: 0, max: 20, when: (v) => notCustom(v) && v.btLen > 0, slider: { min: 0, max: 6, step: 0.01 },
          info: { text: ['Radius at the very base of the boat-tail.', 'Measure the base diameter and halve it.', 'The smaller it is, the more the boat-tail pulls the CP forward. Keep the taper under about 15° or the flow separates.'], tex: 'C_{N\\alpha}=\\frac{2(A_i-A_{i-1})}{S_{ref}}', doc: 'body', range: 'Usually 60–90 % of the body radius.' } },
      ],
    },
    {
      id: 'nose', title: 'Nose',
      fields: [
        { id: 'noseType', shared: 'noseType', label: 'Nose shape', kind: 'select', default: 'ogive', options: NOSE_TYPES,
          info: { text: ['The shape of the nose cone. The profile is generated from the nose length and the body radius.', 'Pick the shape your nose cone is sold as. Pick <b>Custom profile</b> to type measured points instead (that also replaces the body tube inputs).', 'Every pointed nose makes the same normal force in this theory; the shape only moves where it acts — a cone at 2/3 of its length, an ogive at about 0.47.'], doc: 'nose-shapes' } },
        { id: 'noseL', shared: 'noseL', label: 'Nose length', sym: 'L_n', ...LEN, default: 20, min: 0.1, max: 400, when: notCustom, slider: { min: 1, max: 60, step: 0.1 },
          info: { text: ['Length of the nose cone from its tip to the shoulder, where it meets the body tube.', 'Measure the exposed nose (not the shoulder that slides inside the tube).', 'A longer nose moves the nose’s normal force aft a little, so the CP moves aft slightly. The nose ballast fix places the ballast at half this length.'], range: 'Fineness $L_n/d$ of 3–7 is common.', doc: 'body', tex: 'X_{CP}=\\frac{\\sum C_{N\\alpha,i}\\,x_{cp,i}}{\\sum C_{N\\alpha,i}}' } },
        { id: 'k', label: 'Parabolic parameter', sym: "K'", dim: 'none', default: 0.75, min: 0, max: 1, when: (v) => v.noseType === 'parabolic', slider: { min: 0, max: 1, step: 0.01 },
          info: { text: ['Selects the member of the parabolic family of nose shapes.', '0 gives a cone, 0.5 a half parabola, 0.75 the three-quarter parabola, 1 a full parabola.', 'Higher values make the nose fuller near the tip, moving its normal force forward slightly.'], tex: 'r=R\\,\\frac{2(x/L_n)-K\'(x/L_n)^2}{2-K\'}', doc: 'nose-shapes', range: '0 (cone) to 1 (full parabola); 0.75 is common.' } },
        { id: 'pow', label: 'Power-series exponent', sym: 'n', dim: 'none', default: 0.5, min: 0, minExclusive: true, max: 1, when: (v) => v.noseType === 'power', slider: { min: 0.05, max: 1, step: 0.01 },
          info: { text: ['Selects the member of the power family of nose shapes.', '1 gives a cone, 0.75 a three-quarter power, 0.5 a half power (parabola).', 'Smaller values make a blunter nose, moving its normal force forward.'], tex: 'r=R\\,(x/L_n)^n', doc: 'nose-shapes', range: '0.5 (parabola) to 1 (cone).' } },
        { id: 'profile', label: 'Profile points (station, radius)', kind: 'table', minRows: 3, when: (v) => v.noseType === 'custom',
          columns: [{ id: 'x', label: 'Station', ...LEN }, { id: 'r', label: 'Radius', ...LEN }],
          default: GR3,
          validate: (rows) => {
            if (rows.some((r) => !Number.isFinite(r.x) || !Number.isFinite(r.r))) return 'Every cell needs a number.';
            if (rows[0].x !== 0) return 'The first point must be at station 0 (the nose tip).';
            for (let i = 1; i < rows.length; i++) if (rows[i].x <= rows[i - 1].x) return `Stations must increase (row ${i}).`;
            if (rows.some((r) => r.r < 0)) return 'Radii cannot be negative.';
            if (rows[0].r > 0 && rows[1].r <= rows[0].r) return 'With a blunt tip, the second point must be wider than the first (to fit the hemispherical cap).';
            return '';
          },
          info: { text: ['Body radius at each station, from the nose tip (station 0) to the base: the whole outline of the rocket.', 'Use enough points to follow the nose curve; straight cylinders need only their ends. A boat-tail is a decreasing radius. If the radius at station 0 is not zero, a tangent hemispherical cap is fitted ahead of it.', 'Drag the dots on the nose in the drawing to change a radius.'], doc: 'body' } },
        { id: 'flatNose', label: 'Blunt tip is a flat face (not a hemisphere)', kind: 'bool', default: true, when: (v) => v.noseType === 'custom' && v.profile?.[0]?.r > 0,
          info: { text: ['How the blunt tip of a custom profile is shaped.', 'On = a flat face (it makes no normal force); off = a rounded hemispherical cap fitted tangent to the nose.', 'A rounded cap adds a little normal force right at the tip, moving the CP forward very slightly.'], doc: 'hemisphere' } },
      ],
    },
    {
      id: 'fins', title: 'Fin set',
      fields: [
        { id: 'N', backView: (v) => ({ R: v.R, span: v.b, nominal: { t: true }, unit: LEN, range: [3, 4], note: 'Fin normal-force slope grows as N/2 (Barrowman’s form for 3 and 4 fins; with more fins mutual interference makes it optimistic).' }), shared: 'finN', label: 'Number of fin panels', sym: 'N', dim: 'none', default: 6, min: 1, max: 8, slider: { min: 1, max: 8, step: 1 },
          info: { text: ['How many identical fins are spaced evenly round the body.', 'Count them. The model treats each opposite pair as one wing.', 'The fin normal force grows in proportion to N/2: four fins give a third more than three. With more than four, fins shield each other and the model is optimistic.'], tex: 'C_{N\\alpha,F}=\\frac N2\\,\\frac{S}{S_{ref}}\\,C_{N\\alpha,W}', range: '3 or 4 on most rockets.', doc: 'fins' } },
        { id: 'xLE', label: 'Root leading-edge station', sym: 'x_R', ...LEN, default: 83.16, min: 0, max: 1000, slider: { min: 5, max: 200, step: 0.1 },
          info: { text: ['Where the front of the fin root (the edge on the body) is, measured from the nose tip.', 'Measure from the nose tip along the body to the front of the fin.', 'Moving the fins aft moves the CP aft almost one-for-one with the fin share of the normal force: it is the cheapest way to gain margin, until the fins reach the base. Drag the fin root in the drawing (the sweep is kept).'], doc: 'fins', tex: 'X_{CP}=\\frac{\\sum C_{N\\alpha,i}\\,x_{cp,i}}{\\sum C_{N\\alpha,i}}', range: 'Usually so the fin root ends at or just ahead of the base.' } },
        { id: 'cR', shared: 'finCr', label: 'Root chord', sym: 'c_R', ...LEN, default: 10, min: 0.05, max: 200, slider: { min: 0.5, max: 30, step: 0.05 },
          info: { text: ['Length of the fin along the body.', 'Measure the fin edge that is glued to the body.', 'A longer root gives more fin area and more normal force. The verdict’s fix grows it forward, keeping the trailing edge and the tip where they are.'], tex: 'S=\\frac{(c_R+c_T)\\,b}{2}', range: '1–2 calibres is common.', doc: 'fins' } },
        { id: 'xTipLE', label: 'Tip leading-edge station', sym: 'x_T', ...LEN, default: 90.16, min: 0, max: 1000, slider: { min: 5, max: 200, step: 0.1 },
          info: { text: ['Where the front of the fin tip is, measured from the nose tip.', 'Root station plus the sweep length (how far the tip’s front edge sits behind the root’s).', 'More sweep moves the fin CP aft (more margin) but lowers the fin lift a little. Drag the fin tip sideways in the drawing.'], tex: '\\Lambda_c=\\tan^{-1}\\frac{x_T+c_T/4-x_R-c_R/4}{b}', doc: 'fins', range: 'The root station plus 0–1 root chord of sweep.' } },
        { id: 'cT', shared: 'finCt', label: 'Tip chord', sym: 'c_T', ...LEN, default: 3, min: 0, max: 200, slider: { min: 0, max: 20, step: 0.05 },
          info: { text: ['Length of the fin’s outer edge. Zero for a pointed (delta) fin.', 'Measure the outer edge, parallel to the body.', 'A longer tip adds area far from the body, where it works best.'], range: '0.3–0.6 of the root chord is common.', doc: 'fins', tex: 'S=\\frac{(c_R+c_T)\\,b}{2}' } },
        { id: 'b', shared: 'finSpan', label: 'Exposed semispan', sym: 'b', ...LEN, default: 4, min: 0.01, max: 200, slider: { min: 0.2, max: 20, step: 0.05 },
          info: { text: ['How far each fin sticks out from the body surface (its height).', 'Measure from the body to the fin tip, square to the body.', 'Span is the strongest fin lever: fin lift grows roughly with its square at small spans. The verdict gives the span that reaches your target. Drag the fin tip up or down in the drawing.'], tex: '\\mathit{AR}=\\frac{2b^2}{S}', range: '1–1.5 calibres is common.', doc: 'fins' } },
        { id: 'bt', label: 'Boat-tail half-angle under fins', sym: '\\beta', dim: 'angle', default: 0, min: 0, max: 20, slider: { min: 0, max: 15, step: 0.5 },
          info: { text: ['If the fins sit on a tapering (conical) part of the body, the taper’s half-angle.', 'Zero for fins on a straight tube (almost always).', 'A taper under the fins adds a little root area.'], doc: 'fins', tex: '\\beta=\\sqrt{|1-M^2|}', range: 'Usually off; on for Mach numbers above about 0.5.' } },
      ],
    },
    {
      id: 'flight', title: 'Flight and centre of gravity',
      fields: [
        { id: 'M', label: 'Highest flight Mach number', sym: 'M', dim: 'none', default: 0.05, min: 0, max: 0.95, maxExclusive: true, slider: { min: 0, max: 0.9, step: 0.01 },
          info: { text: ['Your top speed divided by the speed of sound (about 340 m/s, 1115 ft/s near the ground).', 'From a flight simulation, or your motor’s expected top speed. Leave it low for slow model rockets.', 'Faster flight makes the fins lift more (compressibility), so the CP moves aft and the margin grows. The verdict also checks Mach 0, where the margin is smallest.'], tex: '\\beta_\\Lambda=\\sqrt{1-M^2\\cos^2\\Lambda_c}', range: 'Model rockets 0.1–0.4; high-power 0.5–0.9 (this model stops at about 0.8).', doc: 'fins' } },
        { id: 'xcg', label: 'Centre of gravity at launch (from tip)', sym: 'X_{CG}', ...LEN, default: 68, min: 0, max: 1000, optional: true, slider: { min: 5, max: 200, step: 0.1 },
          info: { text: ['The balance point of the loaded rocket, ready to fly, measured from the nose tip.', 'Balance the rocket (motor in, recovery packed) on a straight edge and measure from the tip to the balance point. Leave empty to skip the verdict.', 'Moving the CG forward (nose weight) adds margin one-for-one: 1 calibre forward is 1 calibre more margin. Drag the CG on the ruler under the drawing.'], tex: 'SM=\\frac{X_{CP}-X_{CG}}{d}', range: 'Usually 55–70 % of the length from the tip.', doc: 'stability' } },
        { id: 'xcgB', label: 'Centre of gravity at burnout (from tip)', sym: 'X_{CG,b}', ...LEN, default: 66, min: 0, max: 1000, optional: true, slider: { min: 5, max: 200, step: 0.1 },
          info: { text: ['The balance point after the propellant has burnt: motor case still in, propellant gone.', 'Balance the rocket with a spent motor case, or take it from your design software. Leave empty if unknown.', 'It is usually further forward than at launch (more margin) — but not always, for example with heavy payloads aft or on upper stages.'], doc: 'stability', tex: 'SM=\\frac{X_{CP}-X_{CG}}{d}', range: 'Usually a little ahead of the launch CG.' } },
        { id: 'mass', label: 'Rocket mass at launch', sym: 'm', ...MASS, default: null, min: 0, minExclusive: true, max: 100000, optional: true, slider: { min: 0.05, max: 100, step: 0.01 },
          info: { text: ['The weight of the rocket ready to fly (with the motor).', 'Weigh it. Only needed for the nose-ballast fix; leave empty otherwise.', 'A heavier rocket needs more ballast to move its CG the same distance.'], tex: 'm_b=m\\,\\frac{X_{CG}-X_{CG,req}}{X_{CG,req}-x_b}', range: 'Model 0.05–0.5 kg; high-power 1–25 kg (2–55 lb).', doc: 'verdict' } },
      ],
    },
    {
      id: 'limits', title: 'Your limits',
      fields: [
        { id: 'minSM', label: 'Smallest margin you accept (unsafe below)', sym: 'SM_{min}', dim: 'none', default: 1, min: 0, max: 5, slider: { min: 0, max: 3, step: 0.05 },
          info: { text: ['The static margin below which you would not fly the rocket, in calibres (body diameters).', 'Your choice, and your range’s rules. 1 calibre is the usual amateur floor; it is a rule of thumb, not a published limit.', 'Below it the verdict is UNSAFE.'], range: 'Commonly 1 calibre.', doc: 'verdict', tex: 'SM_{min}\\ge SM_{floor}' } },
        { id: 'targetSM', label: 'Target static margin', sym: 'SM_{target}', dim: 'none', default: 1.5, min: 0, max: 8, slider: { min: 0.5, max: 4, step: 0.05 },
          info: { text: ['The margin you design for, in the worst case.', 'Common amateur practice is 1–2 calibres; Hoult calls two calibres “classical”. More margin also makes the rocket turn into the wind more.', 'Between your minimum and this target the verdict is MARGINAL. The fixes (span, root chord, CG shift, ballast) are solved to reach this target.'], range: '1.5–2 calibres.', doc: 'verdict', tex: 'SM_{min}\\ge SM_{target}' } },
      ],
    },
  ],
  results: [
    { id: 'margin', label: 'Static margin, worst case', sym: 'SM', dim: 'none', key: true, digits: 3,
      status: (m, out) => (typeof m !== 'number' ? null : ST[out.verdict.level]),
      note: (m, out) => (typeof m !== 'number' ? 'enter the CG for a verdict' : `calibres · ${caseText(out.o.mg.worst)}`),
      info: { text: ['How far the CP is behind the CG, in body diameters (calibres), in the worst moment of the flight.', 'It is the smallest of the margins at the launch and burnout CG, at Mach 0 and your top Mach, with and without the lift the fins induce on the body. Positive = CP behind the CG = stable.', 'Compare it with your limits: below the minimum the rocket may wobble or tumble; far above about 4 it turns strongly into the wind.'], tex: 'SM=\\min\\frac{X_{CP}-X_{CG}}{d}', range: '1–2 calibres is common practice.', doc: 'stability' } },
    { id: 'xcp', label: 'Centre of pressure (from tip)', sym: 'X_{CP}', ...LEN, key: true,
      note: (x, out) => `${fmt((100 * x) / out.len, { digits: 3 })} % of length · at your top Mach`,
      info: { text: ['The point along the rocket where the total side force from the air acts, measured from the nose tip.', 'It is the average of each part’s position, weighted by how much normal force that part makes. The fins usually dominate, so the CP sits well aft.', 'Bigger fins, or fins further aft, move it aft; a boat-tail moves it forward.'], tex: 'X_{CP}=\\frac{\\sum C_{N\\alpha,i}x_i}{C_{N\\alpha}}', doc: 'stability' } },
    { id: 'dCG', label: 'CG shift to reach the target', sym: '\\Delta X_{CG}', ...LEN, key: true, digits: 3,
      status: (x, out) => (typeof x !== 'number' ? null : x > 0 ? ST[out.verdict.level] : 'ok'),
      note: (x, out) => (typeof x !== 'number' ? '—' : x > 0 ? (typeof out.results.ballast === 'number' ? `forward · about ${fmt(toDisplay(out.results.ballast, BALLAST), { digits: 3 })} ${unitLabel(displayUnit(BALLAST))} of nose ballast` : 'move the CG this far forward') : 'no change needed'),
      info: { text: ['How far the CG must move forward for the worst-case margin to reach your target.', 'The margin changes one-for-one with the CG, so this is (target − margin) × diameter. Both CGs (launch and burnout) move by it.', 'Add nose weight, move heavy parts forward, or move the motor mount forward. With the rocket mass given, the ballast needed is shown too.'], tex: '\\Delta X_{CG}=(SM_{target}-SM)\\,d', doc: 'verdict' } },
    { id: 'CNa', label: 'Normal-force slope', sym: 'C_{N\\alpha}', dim: 'perAngle', internal: 'perrad', key: true, note: (x, out) => `fins ${fmt((100 * out.o.fin.CNa) / x, { digits: 2 })} %, body ${fmt((100 * out.o.body.CNa) / x, { digits: 2 })} %`,
      info: { text: ['How much side force the whole rocket makes per unit of angle between its axis and the wind (per radian), as a coefficient on the body cross-section.', 'It is the sum of the body’s and the fin set’s contributions, shown under the number.', 'Trajectory and dynamics tools need it; higher values mean a stiffer, faster-correcting rocket.'], tex: 'C_{N\\alpha}=C_{N\\alpha,body}+C_{N\\alpha,fins}\\big(K_{W(B)}+K_{B(W)}\\big)', range: 'About 2 for the body alone; 8–20 with fins.', doc: 'stability' } },
    { id: 'ballast', label: 'Nose ballast to reach the target — if the mass is given', sym: 'm_b', ...BALLAST, digits: 3,
      info: { text: ['Mass to add at half the nose length so the worst-case margin reaches your target.', 'From the centre-of-mass balance with the launch mass. Used for the burnout CG too, which slightly overestimates the ballast (the rocket is lighter then). “—” without a mass, or when the margin is already met (0).', 'Ballast further forward works better; it also lowers the apogee.'], tex: 'm_b=m\\,\\frac{X_{CG}-X_{CG,req}}{X_{CG,req}-x_b}', doc: 'verdict' } },
    { id: 'xcgMax', label: 'Furthest-aft CG for your target', sym: 'X_{CG,req}', ...LEN, digits: 4,
      info: { text: ['The CG station that gives exactly your target margin in the worst case.', 'Worst-case CP minus target × diameter.', 'Any CG ahead of it (smaller number) meets the target.'], tex: 'X_{CG,req}=\\min X_{CP}-SM_{target}\\,d', doc: 'verdict' } },
    { id: 'bNeed', label: 'Fin span to reach the target', sym: 'b_{req}', ...LEN, digits: 4,
      info: { text: ['Exposed semispan that brings the worst-case margin to your target, with everything else unchanged (tip leading edge held at its station).', 'Found by bisection on the full worst-case calculation.', '“—” if no span reaches it (more fin area cannot beat a CG that is too far aft).'], tex: 'SM_{min}(b_{req})=SM_{target}', doc: 'verdict' } },
    { id: 'marginNom', label: 'Static margin, launch CG, Mach 0, with carry-over', sym: 'SM_0', dim: 'none', digits: 3,
      info: { text: ['The classic single-number margin at lift-off (NACA 1307 model): launch CG, Mach 0, with the body carry-over lift.', '“—” without a CG.'], tex: 'SM=\\frac{X_{CP}-X_{CG}}{d}', doc: 'stability' } },
    { id: 'marginNoCarry', label: 'Static margin without body carry-over lift (Barrowman-style)', sym: 'SM_{nc}', dim: 'none', digits: 3,
      info: { text: ['The margin if the lift the fins induce on the body is left out, as Barrowman-style tools do.', 'Launch CG, Mach 0. It is smaller than the margin with carry-over, because that lift acts near the fins.', 'If your rocket only passes with carry-over, it relies on lift most tools do not count.'], tex: 'SM=\\frac{X_{CP}-X_{CG}}{d}', doc: 'interference' } },
    { id: 'marginBurn', label: 'Static margin at burnout (worst Mach) — if given', sym: 'SM_b', dim: 'none', digits: 3,
      info: { text: ['The smallest margin at the burnout CG, over the Mach numbers checked.', '“—” until you enter the CG at burnout.'], tex: 'SM=\\frac{X_{CP}-X_{CG}}{d}', doc: 'stability' } },
    { id: 'CNaBody', label: 'Body normal-force slope', sym: 'C_{N\\alpha,body}', dim: 'perAngle', internal: 'perrad', info: { text: ['Normal force of the nose, shoulders and boat-tails (and the hemispherical cap), per radian.', 'Slender-body theory: twice the growth in cross-section area over the reference area. Any pointed nose gives 2.'], tex: 'C_{N\\alpha}=\\frac{2(A_i-A_{i-1})}{S_{ref}}', doc: 'body' } },
    { id: 'xcpBody', label: 'Body centre of pressure', sym: 'x_{body}', ...LEN, info: { text: ['Where the body’s normal force acts, from the nose tip — near the middle of the nose for a pointed nose.'], doc: 'body' } },
    { id: 'CNaTail', label: 'Fin set, with interference', sym: 'C_{N\\alpha,tail}', dim: 'perAngle', internal: 'perrad', info: { text: ['Fins plus the lift they induce on the body.'], tex: 'C_{N\\alpha,F}(K_{W(B)}+K_{B(W)})', doc: 'interference' } },
    { id: 'xcpTail', label: 'Fin set centre of pressure', sym: 'x_{tail}', ...LEN, info: { text: ['Combined CP of the fin lift and the body carry-over lift, from the nose tip.'], doc: 'interference' } },
    { id: 'CNaFins', label: 'Fins alone', sym: 'C_{N\\alpha,F}', dim: 'perAngle', internal: 'perrad', info: { text: ['Isolated fin panels (N/2 wings) on the body reference area, before interference.'], tex: 'C_{N\\alpha}=\\frac N2\\frac{S}{S_{ref}}\\frac{2\\pi F\\cos\\Lambda_c}{\\beta_\\Lambda\\big(F\\sqrt{1+4/F^2}+2\\big)}', doc: 'fins' } },
    { id: 'KWB', label: 'Fins in presence of body', sym: 'K_{W(B)}', dim: 'none', digits: 4, info: { text: ['How much more the fins lift because the body is there, relative to fins alone (NACA 1307 eq. 14).'], doc: 'interference' } },
    { id: 'KBW', label: 'Body lift due to fins', sym: 'K_{B(W)}', dim: 'none', digits: 4, info: { text: ['Body carry-over lift induced by the fins, relative to fins alone (NACA 1307 eq. 21).'], doc: 'interference' } },
    { id: 'xcpFin', label: 'Fin panel centre of pressure', sym: 'x_F', ...LEN, info: { text: ['Barrowman fin CP: a quarter of the mean aerodynamic chord, shifted by sweep.'], tex: 'x_F=x_R+\\frac{\\bar c}{4}+\\frac{(c_R+2c_T)(x_T-x_R)}{3(c_R+c_T)}', doc: 'fins' } },
    { id: 'xcpBW', label: 'Carry-over lift centre of pressure', sym: '\\bar{x}_{B(W)}', ...LEN, info: { text: ['Where the body lift induced by the fins acts (NACA 1307 eq. D6).'], doc: 'interference' } },
    { id: 'AR', label: 'Fin aspect ratio (pair)', sym: '\\mathit{AR}', dim: 'none', digits: 4, info: { text: ['Two panels joined at the root: 2 × span² / panel area. Higher means more lift per area.'], tex: '\\mathit{AR}=\\frac{2b^2}{S}', doc: 'fins' } },
    { id: 'sweep', label: 'Quarter-chord sweep', sym: '\\Lambda_c', dim: 'angle', digits: 4, info: { text: ['How far the fin’s quarter-chord line leans back.'], tex: '\\Lambda_c=\\tan^{-1}\\frac{x_T+c_T/4-x_R-c_R/4}{b}', doc: 'fins' } },
    { id: 'mac', label: 'Mean aerodynamic chord', sym: '\\bar{c}', ...LEN, info: { text: ['The average chord of a trapezoidal panel, weighted as lift is.'], tex: '\\bar c=\\tfrac23\\Big(c_R+c_T-\\frac{c_Rc_T}{c_R+c_T}\\Big)', doc: 'fins' } },
    { id: 'CNd', label: 'Single-panel deflection slope (fin cant)', sym: 'C_{N\\delta}', dim: 'perAngle', internal: 'perrad', info: { text: ['Normal force per radian of one panel’s deflection, including interference (for fin-cant tools).'], tex: 'C_{N\\delta}=K_{W(B)}\\,C_{N\\alpha,W}', doc: 'interference' } },
    { id: 'capCNa', label: 'Hemispherical cap — custom blunt tip', sym: 'C_{N\\alpha,cap}', dim: 'perAngle', internal: 'perrad',
      info: { text: ['Normal force of the tangent hemispherical cap (zero for a flat face or a pointed nose).'], tex: 'C_{N\\alpha}=\\frac{9\\pi}{8}\\frac{R_h^2\\sin^4\\theta_T}{S_{ref}}', doc: 'hemisphere' } },
    { id: 'd', label: 'Reference diameter', sym: 'd', ...LEN, info: { text: ['Largest body diameter: the ruler for the margin in calibres. $S_{ref}=\\pi d^2/4$.'], doc: 'body' } },
  ],
  compute(v) {
    const prof = profileOf(v), u = (x) => fmt(toDisplay(x, LEN), { digits: 3 }), uL = unitLabel(displayUnit(LEN));
    if (v.bt > 0 && v.b <= v.cR * Math.tan((v.bt * Math.PI) / 180)) throw new InputError('The boat-tail is too steep for this fin: the exposed semispan must be larger than root chord × tan(boat-tail angle).');
    const o = subsonicCP({ M: v.M, profile: prof, flatNose: v.flatNose, fins: finsOf(v), xcg: v.xcg });
    const len = prof[prof.length - 1].x;
    const warnings = [];
    if (notCustom(v) && v.noseL >= v.bodyLen) warnings.push({ level: 'warn', text: 'The nose is as long as the whole rocket: computed with the nose ending at the base.', fix: `Shorten the nose below ${u(v.bodyLen)} ${uL} or lengthen the rocket.` });
    if (notCustom(v) && v.btLen > 0 && v.bodyLen - v.btLen <= noseLen(v)) warnings.push({ level: 'warn', text: 'The boat-tail would start on the nose, so it is left out.', fix: `Keep the boat-tail shorter than ${u(v.bodyLen - noseLen(v))} ${uL}.` });
    if (v.xLE + v.cR > len + 1e-9) warnings.push({ level: 'warn', text: 'The fin root extends past the end of the body.', fix: `Move the root leading edge forward to at most ${u(len - v.cR)} ${uL}.` });
    if (v.b < o.fin.r) warnings.push({ level: 'info', text: 'Fin span is less than the body radius: the carry-over CP uses the analytic continuation of the NACA 1307 formula.' });
    if (v.M > 0.8) warnings.push({ level: 'warn', text: 'Above Mach ≈ 0.8 the flow over the nose may be locally sonic; the subsonic model loses accuracy.', fix: 'Use the supersonic tools for the fast part of the flight.' });
    if (notCustom(v) && noseLen(v) < 2 * v.R) warnings.push({ level: 'info', text: 'The nose is shorter than one calibre: slender-body theory loses accuracy for such blunt noses.' });
    if (notCustom(v) && v.btLen > 0 && Math.atan(Math.abs(v.R - v.btR) / v.btLen) > (15 * Math.PI) / 180) warnings.push({ level: 'warn', text: 'The boat-tail is steeper than 15°: the flow will separate and slender-body theory overstates its (negative) lift.', fix: 'Lengthen the boat-tail or reduce the radius change.' });
    if (v.N > 4) warnings.push({ level: 'info', text: 'With more than four fins, the panels shield each other; the N/2 scaling of the fin lift is optimistic.' });
    if (!(o.CNa > 0)) warnings.push({ level: 'err', text: 'The total normal-force slope is not positive — this rocket has no restoring lift.', fix: 'Check the boat-tail and fin inputs.' });
    const minSM = v.minSM, T = Math.max(v.targetSM, minSM);
    if (v.targetSM < minSM) warnings.push({ level: 'warn', text: 'Your target margin is below your minimum; the minimum is used as the target.', fix: 'Set the target at or above the minimum.' });
    let verdict = { level: 'none', title: 'Enter the centre of gravity', text: 'The verdict needs your CG at launch (and, if you know it, at burnout).', fixes: [] };
    let fx = null;
    if (v.xcg != null) {
      fx = fixesFor(v, prof, T);
      const w = fx.mg.worst, SM = w.SM;
      const level = SM < minSM ? 'unsafe' : SM < T ? 'marginal' : 'safe';
      const fixes = [];
      if (level !== 'safe') {
        const cgFix = `Move the CG forward by at least <b>${u(fx.dCG)} ${uL}</b>, to ${u(fx.xcgMax)} ${uL} from the tip or less (now ${u(w.x)})`;
        fixes.push(fx.ballast != null ? `Add at least <b>${fmt(toDisplay(fx.ballast, BALLAST), { digits: 3 })} ${unitLabel(displayUnit(BALLAST))}</b> of nose ballast at ${u(fx.xb)} ${uL} from the tip (moves the CG ${u(fx.dCG)} ${uL} forward), or` : `${cgFix} with nose weight, or`);
        if (fx.bNeed != null) fixes.push(`enlarge the fin span from ${u(v.b)} to <b>${u(fx.bNeed)} ${uL}</b>, or`);
        if (fx.bNeed == null) fixes.push('bigger fins alone cannot reach the target: move the CG forward or the fins aft.');
      }
      verdict = {
        level,
        title: SM < 0 ? 'Unstable: the centre of pressure is ahead of the CG' : level === 'unsafe' ? `Less than ${fmt(minSM, { digits: 3 })} calibre${minSM === 1 ? '' : 's'} of static margin` : level === 'marginal' ? 'Stable, but below your target margin' : 'Statically stable with your target margin',
        text: `Worst-case static margin <b>${fmt(SM, { digits: 3 })} calibres</b> (${caseText(w)}); you accept ${fmt(minSM, { digits: 3 })}, target ${fmt(T, { digits: 3 })}.`,
        fixes,
      };
      if (SM > MANY_CAL) warnings.push({ level: 'info', text: `More than ${MANY_CAL} calibres of margin even in the worst case: the rocket will turn strongly into the wind (weathercock).`, fix: 'Check the wind drift (Wind Compensation), or trim the fins if this is not intended.' });
      if (v.xcgB == null) warnings.push({ level: 'info', text: 'No burnout CG given: the margin is checked at the launch CG only.', fix: 'Enter the CG with the motor burnt out (casing in, propellant out).' });
    }
    const mg = fx?.mg, row = (cg, M, carry) => mg?.rows.find((r) => r.cg === cg && r.M === M && r.carry === carry)?.SM ?? null;
    const results = {
      margin: mg ? mg.worst.SM : null, xcp: o.xcp, dCG: fx ? fx.dCG : null, CNa: o.CNa,
      ballast: fx?.ballast ?? '—', xcgMax: fx ? fx.xcgMax : null, bNeed: fx?.bNeed ?? '—',
      marginNom: row('launch', 0, true), marginNoCarry: row('launch', 0, false),
      marginBurn: mg && v.xcgB != null ? Math.min(...mg.rows.filter((r) => r.cg === 'burnout').map((r) => r.SM)) : '—',
      CNaBody: o.body.CNa, xcpBody: o.body.mom / o.body.CNa, CNaTail: o.fin.CNa, xcpTail: o.fin.xcp,
      CNaFins: o.fin.CNaFins, KWB: o.fin.KWB, KBW: o.fin.KBW, xcpFin: o.fin.xcpFin, xcpBW: o.fin.xcpBW, AR: o.fin.AR, sweep: (o.fin.sweepC4 * 180) / Math.PI,
      mac: o.fin.mac, CNd: o.fin.CNd, capCNa: v.noseType === 'custom' && v.profile?.[0]?.r > 0 ? o.body.cap.CNa : '—', d: o.d,
    };
    o.mg = mg;
    return { results, warnings, verdict, o, len, v, fx, T, prof };
  },
  plots: [
    {
      id: 'margin', title: 'Static margin and CP through the flight', wide: true, height: 460, when: (v) => v.xcg != null,
      info: { text: ['How the stability changes from leaving the rail (Mach 0) to your top speed. Top: the static margin at the launch CG and (if given) the burnout CG. Bottom: where the CP is, with the CGs as horizontal lines.', 'Solid lines include the lift the fins induce on the body (NACA 1307); dashed lines leave it out, as Barrowman-style tools do. The fins lift more as speed rises, so the CP moves aft and the margin is smallest at Mach 0.', 'The red lines are your limits: keep every curve above your target, and never below the minimum.'], doc: 'stability' },
      build(v, out, { U }) {
        const ul = U(LEN), prof = out.prof, M1 = Math.max(v.M, 0.3), sm = [], cp = [];
        const cgs = [['launch CG', v.xcg, 'var(--series-2)'], ['burnout CG', v.xcgB, 'var(--series-5)']].filter(([, x]) => x != null && Number.isFinite(x));
        const runs = [];
        for (let i = 0; i <= 30; i++) { const M = (M1 * i) / 30, o = subsonicCP({ M, profile: prof, flatNose: v.flatNose, fins: finsOf(v) }); runs.push({ M, xc: o.xcp, x0: xcpNoCarry(o), d: o.d }); }
        for (const [cg, x, col] of cgs) {
          sm.push({ name: `${cg}, with carry-over`, color: col, points: runs.map((r) => [r.M, (r.xc - x) / r.d]) },
            { name: `${cg}, without`, color: col, dash: '6 4', points: runs.map((r) => [r.M, (r.x0 - x) / r.d]) });
        }
        cp.push({ name: '$X_{CP}$ with carry-over', color: 'var(--series-1)', points: runs.map((r) => [r.M, ul.v(r.xc)]) },
          { name: '$X_{CP}$ without', color: 'var(--series-1)', dash: '6 4', points: runs.map((r) => [r.M, ul.v(r.x0)]) });
        return {
          x: { label: 'Mach number $M$', unit: '' }, xDomain: [0, M1],
          vlines: v.M > 0 ? [{ x: v.M, label: 'your top Mach', color: 'var(--text-3)' }] : [],
          panels: [
            { y: { label: 'Static margin', unit: 'cal' }, color: 'var(--series-2)', includeZero: true, series: sm,
              hlines: [{ y: out.T, label: `your target ${fmt(out.T, { digits: 3 })}`, color: 'var(--danger)' }, { y: v.minSM, label: `unsafe below ${fmt(v.minSM, { digits: 3 })}`, color: 'var(--danger)' }] },
            { y: { label: 'Station from tip', unit: ul.label }, color: 'var(--series-1)', series: cp,
              hlines: cgs.map(([cg, x]) => ({ y: ul.v(x), label: cg, color: 'var(--text-3)' })) },
          ],
        };
      },
    },
    {
      id: 'span', title: 'Fin span that reaches your target', wide: true, when: (v) => v.xcg != null,
      info: { text: ['The worst-case static margin as the fin span changes, everything else as you set it (tip leading edge held at its station).', 'Where the curve crosses your target line is the span you need; the marker is your fins. The curve flattens: past a point, bigger fins barely help and only move the CG aft with their weight.', 'If the curve never reaches the target, move the CG forward instead.'], doc: 'verdict' },
      build(v, out, { U }) {
        const ul = U(LEN), prof = out.prof, bN = out.fx?.bNeed, b1 = Math.max(2 * v.b, 1.3 * (bN ?? 0)), pts = [];
        for (let i = 1; i <= 40; i++) { const b = (b1 * i) / 40; pts.push([ul.v(b), margins({ ...v, b }, prof).worst.SM]); }
        const col = COL[out.verdict.level];
        return { x: { label: 'Exposed semispan $b$', unit: ul.label }, y: { label: 'Worst-case static margin', unit: 'cal' }, includeZero: true, series: [{ name: '$SM$ worst case', points: pts, smooth: true }],
          hlines: [{ y: out.T, label: 'your target', color: 'var(--danger)' }, { y: v.minSM, label: 'unsafe below', color: 'var(--danger)' }],
          vlines: bN != null && bN !== v.b ? [{ x: ul.v(bN), label: `span for target ${fmt(ul.v(bN), { digits: 3 })}`, color: 'var(--text-3)' }] : [],
          markers: [{ x: ul.v(v.b), y: out.results.margin, label: 'your fins', color: col }] };
      },
    },
    {
      id: 'mach-cna', title: 'Normal-force slope vs Mach', explore: true,
      info: { text: ['How much side force the body, the fin set and the whole rocket make per radian, against Mach number.', 'The body line is flat: in slender-body theory it does not depend on speed. Only the fins gain lift as speed rises (Prandtl–Glauert).'], doc: 'fins' },
      build(v, out) {
        const tot = [], body = [], tail = [];
        for (let i = 0; i <= 40; i++) { const M = (0.9 * i) / 40; const o = subsonicCP({ M, profile: out.prof, flatNose: v.flatNose, fins: finsOf(v) }); tot.push([M, o.CNa]); body.push([M, o.body.CNa]); tail.push([M, o.fin.CNa]); }
        return { x: { label: 'Mach number $M$' }, y: { label: '$C_{N\\alpha}$', unit: '\\mathrm{rad^{-1}}' }, includeZero: true,
          series: [{ name: 'total', points: tot }, { name: 'fin set', points: tail }, { name: 'body', points: body, dashed: true }], markers: [{ x: v.M, y: out.o.CNa, label: 'your top Mach' }] };
      },
    },
    {
      id: 'buildup', title: 'Normal-force build-up along the rocket', wide: true, explore: true,
      info: { text: ['Running total of the normal-force slope from the nose aft, with each part placed at its own centre of pressure. Each step shows where lift is made: the nose near the front, the fins and their carry-over at the back.', 'The CP is the balance point of these steps; the CG lines show where the rocket balances.'], doc: 'stability' },
      build(v, out, { U }) {
        const ul = U(LEN), o = out.o;
        const items = [];
        if (o.body.cap.CNa) items.push([o.body.cap.xcp, o.body.cap.CNa]);
        for (const sg of o.body.segs) if (sg.CNa) items.push([sg.xcp, sg.CNa]);
        items.push([o.fin.xcpFin, o.fin.CNaWB], [o.fin.xcpBW, o.fin.CNaFins * o.fin.KBW]);
        items.sort((a, b) => a[0] - b[0]);
        let acc = 0; const pts = [[ul.v(0), 0]];
        for (const [x, c] of items) { pts.push([ul.v(x), acc]); acc += c; pts.push([ul.v(x), acc]); }
        pts.push([ul.v(out.len), acc]);
        return { x: { label: 'Station from tip', unit: ul.label }, y: { label: 'Cumulative $C_{N\\alpha}$', unit: '\\mathrm{rad^{-1}}' }, includeZero: true, xDomain: [0, ul.v(out.len)], xTight: true,
          series: [{ name: '$\\Sigma C_{N\\alpha}$', points: pts, area: true }],
          vlines: [{ x: ul.v(o.xcp), label: 'CP', color: 'var(--accent)' }, ...(v.xcg != null ? [{ x: ul.v(v.xcg), label: 'CG', color: 'var(--accent-2)', row: 1 }] : []), ...(v.xcgB != null ? [{ x: ul.v(v.xcgB), label: 'CG burnout', color: 'var(--text-3)', row: 2 }] : [])] };
      },
    },
  ],
  /** After shared-rocket values arrive: keep the fin root on the body (slide fins forward, sweep unchanged). */
  sharedAdjust(v) {
    if (v.noseType === 'custom') return;
    const over = v.xLE + v.cR - v.bodyLen;
    if (over > 1e-9) { v.xLE = Math.max(0, v.xLE - over); v.xTipLE = Math.max(0, v.xTipLE - over); }
  },
  schematicTitle: 'Side view with forces, CP and CG',
  schematicHint: 'The rocket to scale (stations from the nose tip), with the normal force of the nose and of the fin set as arrows sized by their share, and the total at the CP. The ruler underneath shows where the CG must be: green meets your target, amber is marginal, red is unsafe, using the worst-case CP. Drag the nose shoulder (nose length, radius), the fin tip (span, sweep), the fin root ends (fin position, root chord) or the CG on the ruler',
  schematic(ctx, v, out) {
    const o = out.o, len = out.len, rmax = o.rmax, prof = out.prof, fx = out.fx, lv = out.verdict.level;
    const W = 760;
    const u = ctx.U(LEN), L = (x) => `${fmt(u.v(x), { digits: 4 })} ${u.label}`;
    const hemi = prof[0].r > 0 && !v.flatNose && o.body.Rh;
    const capLen = hemi ? o.body.Rh * (1 - Math.cos(o.body.thetaT)) : 0;
    const x0 = 34, rr = o.fin.r, hTot = Math.max(rmax, rr + v.b);
    const kx = (W - x0 - 130) / (len + capLen), k = Math.min(kx, 70 / hTot), exag = Math.max(1, 20 / (hTot * k));
    const kxx = k, ky = k * exag;
    const X = (x) => x0 + (x + capLen) * kxx;
    const hpx = hTot * ky, cy = 44 + 66 + hpx, Y = (r) => cy - r * ky;
    const yr = cy + hpx + 46, H = yr + 82;
    const fr = ctx.frame({ width: W, height: H, label: 'Rocket side view with normal forces, centre of pressure, centre of gravity and the stability ruler' });
    const g = fr.layer('main'); g.replaceChildren();
    // ---- body ----
    if (hemi) {
      const Rh = o.body.Rh, th = o.body.thetaT, c = Rh * Math.cos(th), capPts = [];
      for (let i = 0; i <= 24; i++) { const tt = -th + (2 * th * i) / 24; capPts.push([X(c - Rh * Math.cos(tt)), Y(Rh * Math.sin(tt))]); }
      g.append(s('path', { class: 'sc-body', d: path(capPts, true), 'data-field': 'flatNose' }));
    }
    const top = prof.map((p) => [X(p.x), Y(p.r)]), bot = prof.map((p) => [X(p.x), Y(-p.r)]).reverse();
    g.append(s('path', { class: 'sc-body', d: path([...top, ...bot], true), 'data-field': 'profile noseType noseL R bodyLen btLen btR k pow' }));
    const xs = shoulderOf(v, prof), rj = notCustom(v) ? v.R : rmax;
    if (xs > 0 && xs < len) g.append(s('line', { x1: X(xs), x2: X(xs), y1: Y(rj), y2: Y(-rj), class: 'sc-line', 'data-field': 'noseL noseType' }));
    if (prof[0].r > 0 && v.flatNose) g.append(s('line', { x1: X(0), x2: X(0), y1: Y(prof[0].r), y2: Y(-prof[0].r), stroke: 'var(--series-5)', 'stroke-width': 3, 'data-field': 'flatNose' }));
    // ---- fins ----
    const finTop = [[X(v.xLE), Y(rr)], [X(v.xTipLE), Y(rr + v.b)], [X(v.xTipLE + v.cT), Y(rr + v.b)], [X(v.xLE + v.cR), Y(rr)]];
    g.append(s('path', { class: 'sc-body-2', d: path(finTop, true), 'data-field': 'N xLE cR xTipLE cT b' }));
    g.append(s('path', { class: 'sc-body-2', d: path(finTop.map(([px, py]) => [px, 2 * cy - py]), true), 'data-field': 'N xLE cR xTipLE cT b' }));
    g.append(s('line', { x1: X(0) - 12, x2: X(len) + 12, y1: cy, y2: cy, class: 'sc-axis' }));
    // ---- normal forces: arrows up from the body at each part's CP, length by share of the total ----
    const parts = [];
    const bodyPos = o.body.segs.filter((q) => q.CNa > 0), bodyNeg = o.body.segs.filter((q) => q.CNa < 0);
    const lump = (a, extra = []) => { const c = a.reduce((t, q) => t + q.CNa, 0) + extra.reduce((t, q) => t + q.CNa, 0); return c ? { c, x: (a.reduce((t, q) => t + q.CNa * q.xcp, 0) + extra.reduce((t, q) => t + q.CNa * q.xcp, 0)) / c } : null; };
    const nose = lump(bodyPos, o.body.cap.CNa ? [o.body.cap] : []), tail = lump(bodyNeg);
    if (nose) parts.push({ ...nose, name: 'nose', field: 'noseType noseL profile' });
    if (tail) parts.push({ ...tail, name: 'boat-tail', field: 'btLen btR profile' });
    parts.push({ c: o.fin.CNa, x: o.fin.xcp, name: 'fins + carry-over', field: 'N cR cT b xLE xTipLE' });
    const kF = 62 / Math.max(o.CNa, ...parts.map((p) => Math.abs(p.c)));
    const arrow = (x, y0, lenPx, col, field, w = 2) => {
      const y1 = y0 - lenPx, sg = Math.sign(lenPx) || 1;
      g.append(s('path', { d: `M${x},${y0}L${x},${y1 + 6 * sg}`, stroke: col, 'stroke-width': w, fill: 'none', 'data-field': field }));
      g.append(s('path', { d: `M${x},${y1}l-4.5,${7 * sg}h9Z`, fill: col, 'data-field': field }));
      return y1;
    };
    const rAt = (x) => (x <= prof[0].x ? prof[0].r : prof.find((p, i) => i && p.x >= x)?.r ?? prof[prof.length - 1].r);
    const xFins = X(o.fin.xcp), xCP = X(o.xcp);
    for (const p of parts) {
      const y0 = Y(p.name.startsWith('fins') ? rr + v.b : rAt(p.x)), tip = arrow(X(p.x), y0, p.c * kF, 'var(--series-2)', p.field);
      const right = p.name.startsWith('fins') ? xFins >= xCP : true;
      g.append(text(X(p.x) + (right ? 7 : -7), Math.min(tip, y0) + (Math.abs(p.c * kF) < 16 ? -3 : 9), `${p.name} ${fmt(p.c, { digits: 3 })}`, { anchor: right ? 'start' : 'end', size: 10.5, cls: 'sc-dim-text', field: p.field }));
    }
    { // total at the CP, from the axis
      const tip = arrow(xCP, cy - 12, o.CNa * kF + Math.max(0, cy - 12 - Y(hTot) - 4), 'var(--accent)', 'xcp CNa', 2.6);
      const right = xCP > xFins;
      g.append(text(xCP + (right ? 8 : -8), tip + 9, `total $C_{N\\alpha}$ ${fmt(o.CNa, { digits: 3 })} /rad`, { anchor: right ? 'start' : 'end', size: 11, field: 'CNa' }));
    }
    // ---- dimensions: length, nose, diameter, span ----
    g.append(dim(fr, X(0), 20, X(len), 20, `L = ${L(len)}`, { field: 'bodyLen profile' }));
    if (notCustom(v) && xs > 0) g.append(dim(fr, X(0), Y(-hTot) + 14, X(xs), Y(-hTot) + 14, `L_n = ${L(xs)}`, { field: 'noseL' }));
    g.append(dim(fr, X(len) + 22, Y(rmax), X(len) + 22, Y(-rmax), `d = ${L(o.d)}`, { field: 'R profile' }));
    g.append(dim(fr, X(v.xTipLE + v.cT) + 8, Y(rr), X(v.xTipLE + v.cT) + 8, Y(rr + v.b), `b = ${L(v.b)}`, { field: 'b' }));
    // CP and CG on the axis
    g.append(pointMarker(xCP, cy, '', { kind: 'cp', field: 'xcp' }));
    if (v.xcg != null) g.append(pointMarker(X(v.xcg), cy, '', { kind: 'cg', field: 'xcg' }));
    // ---- rear view ----
    g.append(finEndView(x0 + 46, 56, 28, { N: v.N, r: rr, s: rr + v.b, field: 'N b' }));
    // ---- stability ruler: where the CG must be (worst-case CP) ----
    const xr0 = X(0), xr1 = X(len), cl = (x) => Math.max(xr0, Math.min(xr1, x));
    g.append(text(xr0, yr - 12, 'CG position — stability ruler (worst-case CP)', { size: 10.5, cls: 'sc-dim-text' }));
    if (fx) {
      const xT = cl(X(fx.xcgMax)), xU = cl(X(fx.mg.xcpMin - v.minSM * o.d)), xW = X(fx.mg.xcpMin);
      const band = (a, b, col, lab, field) => {
        if (b - a < 1) return;
        g.append(s('rect', { x: a, y: yr - 5, width: b - a, height: 10, fill: col, 'fill-opacity': 0.35, 'data-field': field }));
        if (b - a > 70) g.append(text((a + b) / 2, yr + 20, lab, { anchor: 'middle', size: 10, cls: 'sc-dim-text' }));
      };
      band(xr0, xT, 'var(--ok)', 'meets your target', 'targetSM');
      band(xT, Math.max(xT, xU), 'var(--warn)', 'marginal', 'targetSM minSM');
      band(Math.max(xT, xU), xr1, 'var(--danger)', 'unsafe', 'minSM');
      g.append(s('line', { x1: xW, x2: xW, y1: yr - 10, y2: yr + 10, stroke: 'var(--accent)', 'stroke-width': 2 }));
      g.append(text(xW, yr - 12, 'CP', { anchor: 'middle', size: 10, field: 'xcp' }));
      const cgs = [['xcg', v.xcg, 'CG'], ['xcgB', v.xcgB, 'burnout']].filter(([, x]) => x != null);
      for (const [f, x, lab] of cgs) {
        const px = cl(X(x));
        g.append(s('path', { d: `M${px},${yr + 6}l-6,10h12Z`, fill: f === 'xcg' ? 'var(--accent-2)' : 'var(--text-3)', 'data-field': f }));
        g.append(text(px, yr + 30, lab, { anchor: 'middle', size: 9.5, cls: 'sc-dim-text', field: f }));
      }
      const w = fx.mg.worst, a = cl(X(w.x)), b = X(w.xcp);
      g.append(dim(fr, a, yr + 42, b, yr + 42, null, { field: 'xcg xcgB' }));
      g.append(s('text', { x: (a + b) / 2, y: yr + 60, 'text-anchor': 'middle', style: `fill:${COL[lv]};font:600 12px var(--font-sans)` }, `worst-case static margin ${fmt(w.SM, { digits: 3 })} cal (${w.cg} CG)`));
      if (v.xcg != null) ctx.handle('cg', cl(X(v.xcg)), yr + 12, { field: 'xcg', title: 'Drag sideways to move the centre of gravity at launch',
        onDrag: (px) => ctx.setValue('xcg', Math.max(0, (px - x0) / kxx - capLen), { round: 0.1 }), onKey: (dx) => ctx.setValue('xcg', v.xcg + 0.5 * dx) });
    } else {
      g.append(s('line', { x1: xr0, x2: xr1, y1: yr, y2: yr, class: 'sc-thin' }));
      g.append(text((xr0 + xr1) / 2, yr + 20, 'enter the CG for the stability ruler', { anchor: 'middle', size: 10.5, cls: 'sc-dim-text' }));
    }
    g.append(text(W - 8, H - 8, exag > 1.01 ? `radii ×${fmt(exag, { digits: 2 })} for clarity` : 'to scale', { anchor: 'end', cls: 'sc-dim-text', size: 10 }));
    // ---- handles ----
    prof.forEach((p, i) => {
      if (v.noseType !== 'custom') return;
      g.append(s('circle', { cx: X(p.x), cy: Y(p.r), r: 2.5, fill: 'var(--accent-2)', 'data-row': i, 'data-field': 'profile' }));
      if (i > 0 && p.x <= Math.max(25, 0.35 * len)) ctx.handle(`p${i}`, X(p.x), Y(p.r), {
        field: 'profile', title: `Drag to change the radius at station ${fmt(u.v(p.x), { digits: 4 })} ${u.label}`,
        onDrag: (px, py) => ctx.setCell('profile', i, 'r', Math.max(0, (cy - py) / ky), { round: 0.005 }),
        onKey: (dx, dy) => ctx.setCell('profile', i, 'r', Math.max(0, p.r * (1 + 0.02 * dy))),
      });
    });
    if (notCustom(v)) ctx.handle('shoulder', X(noseLen(v)), Y(v.R), {
      field: 'noseL R', title: 'Drag to change the nose length (sideways) and body radius (up and down)',
      onDrag: (px, py) => { ctx.setValue('noseL', Math.max(0.5, Math.min(v.bodyLen * 0.8, (px - x0) / kxx - capLen)), { round: 0.1 }); ctx.setValue('R', Math.max(0.1, (cy - py) / ky), { round: 0.01 }); },
      onKey: (dx, dy) => { if (dx) ctx.setValue('noseL', v.noseL * (1 + 0.02 * dx)); if (dy) ctx.setValue('R', v.R * (1 + 0.02 * dy)); },
    });
    ctx.handle('fintip', X(v.xTipLE), Y(rr + v.b), {
      field: 'xTipLE b', title: 'Drag to change fin sweep (sideways) and span (up and down)',
      onDrag: (px, py) => { ctx.setValue('b', Math.max(0.1, (cy - py) / ky - rr), { round: 0.05 }); ctx.setValue('xTipLE', (px - x0) / kxx - capLen, { round: 0.05 }); },
      onKey: (dx, dy) => { if (dy) ctx.setValue('b', v.b * (1 + 0.02 * dy)); if (dx) ctx.setValue('xTipLE', v.xTipLE + 0.2 * dx); },
    });
    ctx.handle('finroot', X(v.xLE), Y(rr), {
      field: 'xLE', title: 'Drag sideways to move the whole fin along the body (sweep kept)',
      onDrag: (px) => { const xn = Math.max(0, (px - x0) / kxx - capLen); ctx.setValue('xTipLE', v.xTipLE + xn - v.xLE, { round: 0.05 }); ctx.setValue('xLE', xn, { round: 0.05 }); },
      onKey: (dx) => { ctx.setValue('xTipLE', v.xTipLE + 0.2 * dx); ctx.setValue('xLE', v.xLE + 0.2 * dx); },
    });
    ctx.handle('finte', X(v.xLE + v.cR), Y(rr), {
      field: 'cR', title: 'Drag sideways to change the root chord (leading edge kept)',
      onDrag: (px) => ctx.setValue('cR', Math.max(0.1, (px - x0) / kxx - capLen - v.xLE), { round: 0.05 }),
      onKey: (dx) => ctx.setValue('cR', Math.max(0.1, v.cR + 0.2 * dx)),
    });
  },
  reportNotes: ['Valid below the critical Mach number, at small angles of attack, for one fin set. Stations are measured aft of the nose tip.'],
  limits: [
    'Small angles of attack (linear normal force); below the critical Mach number of the body (about 0.8 for slender noses).',
    'Slender bodies: noses shorter than about one calibre, steep boat-tails (over ~15°) and blunt shoulders are outside slender-body theory.',
    'One fin set of 3 or 4 trapezoidal panels; with more panels the N/2 scaling is optimistic (mutual interference is not modelled).',
    'Body carry-over lift (NACA Report 1307) moves the CP aft; Barrowman-style tools omit it. The verdict uses the smaller of the two margins.',
    'Static stability only: no dynamic stability, roll coupling (see Roll Lock-In and Pitch-Yaw Wave Number) or flexibility (Upper-Stage Divergence).',
    'The minimum and target margins are yours to set (1 and 1.5 calibres by default): common practice, not a published limit.',
    'Fixes change one thing at a time. Bigger fins and ballast add mass that moves the CG; re-check with the new CG.',
  ],
  symbols: {
    M: 'flight Mach number, speed over the speed of sound (no unit)', 'X_{CG}': 'centre-of-gravity station from the nose tip (mm or in)', 'X_{CP}': 'centre-of-pressure station from the nose tip (mm or in)', d: 'reference (largest body) diameter (mm or in)', 'S_{ref}': 'reference area $\\pi d^2/4$ (mm² or in²)',
    A_i: 'body cross-section area at profile point $i$ (mm² or in²)', A_0: 'cross-section area taken at station 0 (mm² or in²)', x_i: 'station of profile point $i$ (mm or in)', V_i: 'volume of body segment $i$ (mm³ or in³)', 'C_{N\\alpha,i}': 'normal-force slope of part $i$ (per radian)', 'x_{cp,i}': 'centre of pressure of part $i$ (mm or in)',
    R: 'body radius (mm or in)', L_n: 'nose length (mm or in)', "K'": 'parabolic-series parameter (no unit)', n: 'power-series exponent (no unit)', r_0: 'radius at the nose tip (mm or in)',
    R_h: 'radius of the hemispherical cap (mm or in)', '\\theta_T': 'tangency angle of the cap (degrees)', 'C_{N\\alpha,cap}': 'normal-force slope of the cap (per radian)', 'C_{N\\alpha,body}': 'normal-force slope of the body (per radian)', 'x_{body}': 'centre of pressure of the body (mm or in)',
    c_R: 'fin root chord (mm or in)', c_T: 'fin tip chord (mm or in)', b: 'fin exposed semispan (mm or in)', x_R: 'root leading-edge station (mm or in)', x_T: 'tip leading-edge station (mm or in)', N: 'number of fin panels', S: 'area of one fin panel (mm² or in²)',
    '\\mathit{AR}': 'aspect ratio of a pair of panels (no unit)', '\\Lambda_c': 'quarter-chord sweep angle (degrees)', F: 'Diederich planform parameter (no unit)', '\\beta_\\Lambda': 'Prandtl–Glauert compressibility factor (no unit)', 'C_{N\\alpha,W}': 'lift slope of a panel pair on its own area (per radian)', 'C_{N\\alpha,F}': 'normal-force slope of the fins alone on the reference area (per radian)', 'C_{N\\alpha,fins}': 'normal-force slope of the fins alone (per radian)',
    '\\bar c': 'mean aerodynamic chord (mm or in)', x_F: 'fin centre of pressure (mm or in)', '\\tau': 'ratio of body radius to fin tip radius $r/s$ (no unit)', r: 'body radius at the fins (mm or in)', s: 'fin tip radius from the centre line (mm or in)',
    'K_{W(B)}': 'lift on the fins in the presence of the body relative to the fins alone (no unit)', 'K_{B(W)}': 'lift carried over onto the body by the fins (no unit)', '\\bar{x}_{B(W)}': 'centre of pressure of the carry-over lift (mm or in)',
    'C_{N\\alpha,tail}': 'normal-force slope of the fin set with interference (per radian)', 'x_{tail}': 'centre of pressure of the fin set (mm or in)', 'C_{N\\alpha}': 'normal-force slope of the whole rocket (per radian)', SM: 'static margin (calibres)',
    'SM_{target}': 'your target static margin (calibres)', '\\Delta X_{CG}': 'forward CG shift to reach the target (mm or in)', 'X_{CG,req}': 'furthest-aft CG that meets the target (mm or in)',
    m: 'rocket mass at launch (kg or lb)', m_b: 'nose ballast mass (g or lb)', x_b: 'ballast station, half the nose length (mm or in)', L: 'overall length (mm or in)',
    'L_{bt}': 'boat-tail length (mm or in)',
    'R_{bt}': 'boat-tail end radius (mm or in)',
    'A_{i-1}': 'cross-section area at the start of segment $i$ (mm² or in²)',
    x: 'distance from the nose tip (mm or in)',
    'X_{CG,b}': 'centre of gravity at burnout, from the tip (mm or in)',
    'b_{req}': 'fin span to reach the target (mm or in)',
    SM_0: 'static margin at launch, Mach 0, with carry-over (calibres)',
    'SM_{nc}': 'static margin without carry-over lift (calibres)',
    SM_b: 'static margin at burnout (calibres)',
    'SM_{min}': 'worst-case static margin (calibres)',
    '\\bar{c}': 'mean aerodynamic chord (mm or in)',
    'C_{N\\delta}': 'single-panel deflection slope (per radian)',
    '\\beta': 'compressibility factor',
    'SM_{floor}': 'lowest margin you accept (calibres)',
  },
  report(v, out, R) {
    const o = out.o, f = o.fin, b = o.body, n = R.n;
    const Ls = { dim: 'length', internal: 'in' }, As = { dim: 'area', internal: 'in2', units: { si: 'mm2', us: 'in2' } }, l = (x) => R.v(x, Ls), Lq = (x) => R.Q(x, Ls);
    const terms = b.segs.filter((sg) => sg.CNa).map((sg) => n(sg.CNa, 4)).join('+');
    const body = [
      { label: 'Reference area', lhs: 'S_{ref}', eq: '\\frac{\\pi d^2}{4}', sub: `\\frac{\\pi\\times(${l(o.d)})^2}{4}`, res: R.Q(o.Sref, As) },
      { label: 'Slender-body normal force of each body segment and where it acts', lhs: 'C_{N\\alpha,i}', eq: '\\frac{2(A_i-A_{i-1})}{S_{ref}},\\qquad x_{cp,i}=\\frac{x_iA_i-x_{i-1}A_{i-1}-V_i}{A_i-A_{i-1}}' },
    ];
    if (b.cap.CNa) body.push({ label: 'Tangent hemispherical cap', lhs: 'C_{N\\alpha,cap}', eq: '\\frac{9\\pi}{8}\\,\\frac{R_h^2\\sin^4\\theta_T}{S_{ref}}', sub: `\\frac{9\\pi}{8}\\times\\frac{(${l(b.Rh)})^2\\sin^4(${n((b.thetaT * 180) / Math.PI)}^{\\circ})}{${R.v(o.Sref, As)}}`, res: n(b.cap.CNa) });
    body.push({ label: 'Body total (non-zero segments)', lhs: 'C_{N\\alpha,body}', eq: '\\sum_i C_{N\\alpha,i}', sub: (b.cap.CNa ? n(b.cap.CNa, 4) + '+' : '') + terms, res: `${n(b.CNa)},\\qquad x_{body}=${Lq(b.mom / b.CNa)}` });
    const fins = [
      { label: 'Panel area, aspect ratio of a panel pair, quarter-chord sweep', lhs: 'S', eq: '\\frac{(c_R+c_T)\\,b}{2}', sub: `\\frac{(${l(v.cR)}+${l(v.cT)})\\times${l(v.b)}}{2}`, res: `${R.Q(f.S, As)},\\quad \\mathit{AR}=\\frac{2b^2}{S}=${n(f.AR)},\\quad \\Lambda_c=${n((f.sweepC4 * 180) / Math.PI)}^{\\circ}` },
      { label: 'Diederich planform parameter with Prandtl–Glauert compressibility', lhs: 'F', eq: '\\frac{\\mathit{AR}\\sqrt{1-M^2\\cos^2\\Lambda_c}}{\\cos\\Lambda_c}', res: n(f.F) },
      { label: 'Lift slope of a panel pair on its own area', lhs: 'C_{N\\alpha,W}', eq: '\\frac{2\\pi F\\cos\\Lambda_c}{\\sqrt{1-M^2\\cos^2\\Lambda_c}\\left(F\\sqrt{1+4/F^2}+2\\right)}', res: n(f.CNaW) },
      { label: 'Fins alone, on the reference area', lhs: 'C_{N\\alpha,F}', eq: '\\frac N2\\,\\frac{S}{S_{ref}}\\,C_{N\\alpha,W}', sub: `\\frac{${n(v.N)}}{2}\\times\\frac{${R.v(f.S, As)}}{${R.v(o.Sref, As)}}\\times${n(f.CNaW)}`, res: n(f.CNaFins) },
      { label: 'Fin centre of pressure', lhs: 'x_F', eq: 'x_R+\\frac{\\bar c}{4}+\\frac{(c_R+2c_T)(x_T-x_R)}{3(c_R+c_T)}', sub: `${l(v.xLE)}+\\frac{${l(f.mac)}}{4}+\\frac{(${l(v.cR)}+2\\times${l(v.cT)})(${l(v.xTipLE)}-${l(v.xLE)})}{3(${l(v.cR)}+${l(v.cT)})}`, res: Lq(f.xcpFin) },
      { label: `Interference factors with $\\tau=r/s=${l(f.r)}/${l(f.s)}=${n(f.r / f.s, 4)}$`, lhs: 'K_{W(B)}', eq: '\\frac{2}{\\pi(1-\\tau)^2}\\left[(1+\\tau^4)\\left(\\tfrac12\\tan^{-1}\\tfrac12\\left(\\tfrac1\\tau-\\tau\\right)+\\tfrac\\pi4\\right)-\\tau^2\\left(\\tfrac1\\tau-\\tau+2\\tan^{-1}\\tau\\right)\\right]', res: `${n(f.KWB)},\\qquad K_{B(W)}=(1+\\tau)^2-K_{W(B)}=${n(f.KBW)}` },
      { label: 'Fin set including interference', lhs: 'C_{N\\alpha,tail}', eq: 'C_{N\\alpha,F}\\left(K_{W(B)}+K_{B(W)}\\right)', sub: `${n(f.CNaFins)}\\times(${n(f.KWB)}+${n(f.KBW)})`, res: n(f.CNa) },
      { label: 'Centre of pressure of the fin set', lhs: 'x_{tail}', eq: '\\frac{x_F\\,C_{N\\alpha,F}K_{W(B)}+\\bar{x}_{B(W)}\\,C_{N\\alpha,F}K_{B(W)}}{C_{N\\alpha,tail}}', sub: `\\frac{${l(f.xcpFin)}\\times${n(f.CNaWB)}+${l(f.xcpBW)}\\times${n(f.CNaFins * f.KBW)}}{${n(f.CNa)}}`, res: Lq(f.xcp) },
    ];
    const tot = [
      { label: 'Normal-force slope of the rocket', lhs: 'C_{N\\alpha}', eq: 'C_{N\\alpha,body}+C_{N\\alpha,tail}', sub: `${n(b.CNa)}+${n(f.CNa)}`, res: `${n(o.CNa)}\\ \\mathrm{rad^{-1}}` },
      { label: 'Centre of pressure, aft of the nose tip', lhs: 'X_{CP}', eq: '\\frac{C_{N\\alpha,body}\\,x_{body}+C_{N\\alpha,tail}\\,x_{tail}}{C_{N\\alpha}}', sub: `\\frac{${n(b.CNa)}\\times${l(b.mom / b.CNa)}+${n(f.CNa)}\\times${l(f.xcp)}}{${n(o.CNa)}}`, res: Lq(o.xcp) },
    ];
    if (v.xcg != null) {
      tot.push({ label: 'Static margin at the launch CG and your top Mach', lhs: 'SM', eq: '\\frac{X_{CP}-X_{CG}}{d}', sub: `\\frac{${l(o.xcp)}-${l(v.xcg)}}{${l(o.d)}}`, res: `${n(o.margin, 3)}\\ \\text{calibres}`, note: o.margin < 0 ? 'The centre of pressure is ahead of the centre of gravity: the rocket is statically unstable.' : 'The centre of pressure is behind the centre of gravity: the rocket is statically stable.' });
      const w = out.fx.mg.worst;
      tot.push({ label: `Worst case (${caseText(w)}) and the CG shift that reaches the target`, lhs: '\\Delta X_{CG}', eq: '(SM_{target}-SM)\\,d', sub: `(${n(out.T, 3)}-${n(w.SM, 3)})\\times${l(o.d)}`, res: Lq(Math.max(0, (out.T - w.SM) * o.d)) });
    }
    return [
      { title: 'Theory', text: 'The rocket is split into body segments and a fin set. By slender-body theory each body segment produces a normal-force slope proportional to its growth in cross-section area, $C_{N\\alpha,i}=2(A_i-A_{i-1})/S_{ref}$, acting at the centroid of that growth; cylinders carry none. A blunt tip gets a tangent hemispherical cap with its own normal force. The fins use Diederich’s lifting-surface correlation with Prandtl–Glauert compressibility; the body increases the fins’ lift by $K_{W(B)}$ and the fins carry lift onto the body by $K_{B(W)}$ (slender-body interference, NACA Report 1307). The centre of pressure is the $C_{N\\alpha}$-weighted mean station of all contributions; the static margin is its distance behind the centre of gravity in body diameters.' },
      { title: 'Body of revolution', steps: body },
      { title: 'Fin set', steps: fins },
      { title: 'Whole rocket', steps: tot },
    ];
  },
  references: ['barrowman-equations', 'barrowmanthesis-orig', 'hemisphere', '1307-supplement-rev2'],
  examples: [
    { name: 'Gold Rush III proportions, tangent ogive', values: { M: 0.05, xcg: 68, xcgB: 66, mass: null, minSM: 1, targetSM: 1.5, noseType: 'ogive', noseL: 20, R: 2.06, bodyLen: 93.16, btLen: 0, btR: 2.06, ...GR3_FINS } },
    { name: 'Same rocket, CG too far aft (needs ballast)', values: { M: 0.6, xcg: 76, xcgB: 74, mass: 25, minSM: 1, targetSM: 1.5, noseType: 'ogive', noseL: 20, R: 2.06, bodyLen: 93.16, btLen: 0, btR: 2.06, ...GR3_FINS } },
    { name: 'Four small fins, Von Kármán nose (marginal)', values: { M: 0.5, xcg: 70, xcgB: 68, mass: 18, minSM: 1, targetSM: 2, noseType: 'vonkarman', noseL: 20, R: 2.06, bodyLen: 93.16, btLen: 4, btR: 1.6, N: 4, xLE: 83.16, cR: 8, cT: 3, xTipLE: 88, b: 3.5, bt: 0 } },
    { name: 'Gold Rush III, measured profile (custom points)', values: { M: 0.05, xcg: 60, xcgB: null, mass: null, minSM: 1, targetSM: 1.5, noseType: 'custom', profile: GR3, flatNose: true, ...GR3_FINS } },
  ],
};
