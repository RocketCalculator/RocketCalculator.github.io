// Upper-Stage Divergence (body static aeroelasticity) — UI definition.
import { divergence, qdTube, qdJoint, amplification, trimAmplification } from '../calc/divergence.js';
import { s, fmt, InputError } from '../util.js';
import { dim, text, path, pointMarker } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const LEN = { dim: 'length', internal: 'in' };
const PRES = { dim: 'pressure', internal: 'psf', units: { si: 'kPa', us: 'psf' } };
const MOD = { dim: 'modulus', internal: 'psi' };
const COMP = { dim: 'compliance', internal: 'radperlbin' };
const PERRAD = { dim: 'perAngle', internal: 'perrad' };
const tube = (v) => v.mode === 'tube', joint = (v) => v.mode === 'joint', trimmed = (v) => !!v.trim;
const amp = (x) => (Number.isFinite(x) ? fmt(x, { digits: 4 }) : 'diverges');
// verdict bands (DECISIONS D39): margin q_D/q against your required margin; below 1.25 (loads ×5) is unsafe
const INNER = 1.25;
const ST = { safe: 'ok', marginal: 'warn', unsafe: 'err' };
const COL = { safe: 'var(--ok)', marginal: 'var(--warn)', unsafe: 'var(--danger)' };
const show = (x, spec, d = 3) => `${fmt(toDisplay(x, spec), { digits: d })} ${unitLabel(displayUnit(spec))}`;

function model(v) {
  return { mode: v.mode, E: v.E, R: v.R, t: v.t, l: v.l, CNa: v.CNa, C: v.C, xj: v.xj, q: v.q,
    trim: v.trim ? { x1: v.x1, CN1a: v.CN1a, x2: v.x2, CN2a: v.CN2a, x3: v.x3 } : null };
}

export default {
  slug: 'upper-stage-divergence',
  topic: 'body-aeroelasticity',
  title: 'Upper-Stage Divergence',
  verdict: true,
  tiers: true,
  subtitle: 'How close a long, flexible <b>upper stage or payload joint</b> comes to bending until it breaks under its own nose load.',
  intro: {
    what: 'Gives the divergence dynamic pressure of a flexible upper stage (a thin-walled tube cantilevered from the booster) or of a flexible payload joint, the factor by which nose loads grow below it, and the longest stage that stays safe.',
    why: 'The nose load bends the upper stage, the bending raises the nose angle of attack, and that raises the load again. Near the divergence dynamic pressure the loop runs away: early Nike-Cajun rockets with long heavy payloads snapped just before first-stage burnout.',
    when: 'Sizing the tube wall and length of an upper stage or dart, checking a payload joint, or before increasing the maximum dynamic pressure of a design.',
  },
  info: {
    text: [
      'The upper stage acts as a cantilever from the stiff booster, loaded at the nose centre of pressure. Its bending adds the nose slope $dy/dx$ to the angle of attack there.',
      'Solving the beam equation, the nose load becomes $qS\\,C_{NN\\alpha}\\alpha\\,q_D/(q_D-q)$: it grows without limit as $q$ approaches the divergence dynamic pressure $q_D$.',
      'A flexible joint between payload and body behaves the same way with its own $q_D$.',
    ],
    tex: 'q_D=\\frac{2EI}{S\\,C_{NN\\alpha}l^2},\\qquad \\frac{N_N}{N_{N,rigid}}=\\frac{q_D}{q_D-q}',
    steps: ['Choose a flexible tube or a flexible joint.', 'Enter the tube (or joint) properties and the nose normal-force slope.', 'Enter the dynamic pressure, usually the maximum in flight.', 'Set the margin you want to keep below divergence (2 unless you have your own requirement).', 'Read the verdict and the fixes: the wall thickness, the longest stage or the highest dynamic pressure that meet it.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'stage', title: 'Upper stage',
      fields: [
        { id: 'mode', label: 'What bends', kind: 'select', default: 'tube', options: [{ value: 'tube', label: 'The whole tube' }, { value: 'joint', label: 'One joint' }],
          info: { text: ['The whole tube: the upper stage is a thin-walled tube that bends along its length, like a fishing rod held at the booster.', 'One joint: everything is stiff except one joint (for example where the payload bolts to the body), which rotates a little for every unit of bending moment.', 'Both give the same law for how the loads grow; only the formula for the divergence dynamic pressure differs.'], doc: 'joint' } },
        { id: 'R', label: 'Tube radius', sym: 'R', ...LEN, default: 3.375, min: 0, minExclusive: true, max: 40, slider: { min: 0.5, max: 12, step: 0.025 },
          info: { text: ['Outside radius of the upper-stage tube: half the diameter you measure across it.', 'It sets the reference area $S=\\pi R^2$ on which the normal-force slope is based, and, for a tube, the stiffness: $EI$ grows with $R^3$.', 'A fatter tube catches more air but is much stiffer, so it diverges later: $q_D\\propto R\\,t$ for a tube.'], tex: 'S=\\pi R^2', range: '1–2 in (25–50 mm) for model upper stages; 3–8 in (75–200 mm) for sounding-rocket darts and payloads.', doc: 'tube' } },
        { id: 'E', label: 'Young’s modulus of the tube', sym: 'E', ...MOD, default: 10.5e6, min: 0, minExclusive: true, max: 6e7, when: tube, slider: { min: 1e6, max: 3.5e7, step: 1e5 },
          info: { text: ['How stiff the tube material is: the stress needed to stretch it by its own length (a material property, from a datasheet).', 'For a composite tube use the modulus along the tube axis, which depends on the fibre directions.', 'The divergence dynamic pressure grows in proportion: a material twice as stiff doubles $q_D$.'], tex: 'EI\\approx E\\pi R^3t', range: 'Aluminium about 10.5 Mpsi (72 GPa), steel 29 Mpsi (200 GPa), glass-fibre laminate 2–3 Mpsi (15–20 GPa), carbon-fibre laminate 7–10 Mpsi (50–70 GPa).', doc: 'tube' } },
        { id: 't', label: 'Wall thickness', sym: 't', ...LEN, default: 0.125, min: 0, minExclusive: true, max: 4, when: tube, slider: { min: 0.02, max: 0.5, step: 0.005 },
          info: { text: ['Thickness of the tube wall, measured with calipers at the end of the tube.', 'For a thin wall the bending stiffness is $EI\\approx E\\pi R^3t$, so it grows in proportion to the wall.', 'Doubling the wall doubles $q_D$; the verdict gives the thinnest wall that keeps your margin.'], tex: 'EI\\approx E\\pi R^3t', range: '0.04–0.1 in (1–2.5 mm) for fibreglass model tubes; 0.06–0.25 in (1.5–6 mm) for metal sounding-rocket stages.', doc: 'tube' } },
        { id: 'l', label: 'Nose CP to the base of the upper stage', sym: 'l', ...LEN, default: 150, min: 0, minExclusive: true, max: 1000, when: tube, slider: { min: 20, max: 300, step: 1 },
          info: { text: ['Length of the bending arm: from the nose centre of pressure (about halfway along a cone or ogive nose) back to where the upper stage joins the stiff booster.', 'The nose load acts at the end of this arm and bends the tube along all of it.', 'This is the strongest lever: $q_D\\propto1/l^2$, so a 20 % longer payload lowers the divergence dynamic pressure by 30 %.'], tex: 'q_D=\\frac{2EI}{S\\,C_{NN\\alpha}l^2}', range: '30–100 in (0.75–2.5 m) for small upper stages; 140–220 in (3.5–5.5 m) for the Nike-Cajun payloads in the memo.', doc: 'tube' } },
        { id: 'C', label: 'Joint compliance', sym: 'C', ...COMP, default: 1e-6, min: 0, minExclusive: true, max: 1e-3, when: joint, slider: { min: 1e-7, max: 5e-6, step: 1e-8 },
          info: { text: ['How much the joint rotates for each unit of bending moment across it: the softer the joint, the larger $C$.', 'Measure it: clamp the body, hang a known weight on the payload at a known arm, and read the rotation at the joint (a mirror and a laser pointer work well).', 'The divergence dynamic pressure falls in proportion to it: halving the compliance doubles $q_D$.'], tex: 'q_D=\\frac{1}{S\\,C_{NN\\alpha}\\,C\\,x_j}', range: 'About 10⁻⁷–10⁻⁵ rad per lbf·in for bolted and threaded payload joints.', doc: 'joint' } },
        { id: 'xj', label: 'Nose CP to the joint', sym: 'x_j', ...LEN, default: 40, min: 0, minExclusive: true, max: 1000, when: joint, slider: { min: 5, max: 200, step: 1 },
          info: { text: ['Distance from the nose centre of pressure back to the flexible joint.', 'It is the arm on which the nose load bends the joint.', 'A joint further back sees a larger moment, so $q_D$ falls in proportion to $x_j$.'], tex: 'q_D=\\frac{1}{S\\,C_{NN\\alpha}\\,C\\,x_j}', range: 'A little more than the nose length for a payload joint just behind the nose.', doc: 'joint' } },
      ],
    },
    {
      id: 'flight', title: 'Aerodynamics and flight',
      fields: [
        { id: 'CNa', label: 'Nose normal-force slope', sym: 'C_{NN\\alpha}', ...PERRAD, default: 3, min: 0, minExclusive: true, max: 20, slider: { min: 1, max: 6, step: 0.1 },
          info: { text: ['How much sideways (normal) force everything ahead of the bend makes per radian of angle of attack, based on the area $S$.', 'Take it from a Barrowman or CFD breakdown of the nose and upper-stage body; a cone or ogive nose alone gives about 2 per radian.', 'More normal force ahead of the bend means more load to bend it: $q_D$ falls in proportion.'], tex: 'N_N=qS\\,C_{NN\\alpha}\\,\\alpha', range: 'About 2 for a nose cone alone (slender-body theory); 3–5 when upper-stage fins or a long body contribute.', doc: 'tube' } },
        { id: 'q', label: 'Dynamic pressure', sym: 'q', ...PRES, default: 8000, min: 0, max: 1e5, slider: { min: 0, max: 30000, step: 100 },
          info: { text: ['The dynamic pressure $q=\\tfrac12\\rho V^2$ of the flight condition you check: usually the highest in flight, near first-stage burnout.', 'Read it from a trajectory simulation (the Trajectory Simulation shows it against time).', 'The loads grow by $q_D/(q_D-q)$: by 2 at half of $q_D$ and without limit as $q$ reaches $q_D$.'], tex: 'q=\\tfrac12\\rho V^2', range: 'Small sounding rockets reach a few thousand to over 20 000 lbf/ft² (100 kPa and more) near burnout.', doc: 'tube' } },
      ],
    },
    {
      id: 'limits', title: 'Your limits',
      fields: [
        { id: 'rmin', label: 'Margin to keep below divergence', sym: 'n_D', dim: 'none', default: 2, min: 1.1, max: 10, slider: { min: 1.25, max: 5, step: 0.05 },
          info: { text: ['How many times higher than the flight dynamic pressure you want the divergence dynamic pressure to be.', 'At a margin of 2 the nose and bending loads are already twice those of a rigid stage; at 1.25 they are five times. The memo gives no required value: 2 is this site’s default, a common choice for aeroelastic margins.', 'The verdict compares $q_D/q$ with it (between 1.25 and your margin is marginal), and the fixes are solved to meet it.'], tex: '\\frac{q_D}{q}\\ge n_D', range: '1.5–3; use more when the stiffness or the normal-force slope is uncertain.', doc: 'verdict' } },
      ],
    },
    {
      id: 'trimg', title: 'Whole-rocket trim (advanced)',
      fields: [
        { id: 'trim', label: 'Whole-rocket trim', kind: 'bool', default: false, info: { text: ['Also work out how much the angle of attack of the whole rocket, trimmed against a thrust misalignment, grows (memo eqs. 1 and 2).', 'Needs the normal-force slopes of both tails and the nose, and their arms from the centre of gravity.', 'The bending can make the rocket unstable before it diverges; the verdict then says so.'], doc: 'trim' } },
        { id: 'CN1a', label: 'First-stage tail normal-force slope', sym: 'C_{N1\\alpha}', ...PERRAD, default: 10, min: 0, max: 100, slider: { min: 0, max: 40, step: 0.5 }, when: trimmed,
          info: { text: ['Normal-force slope of the first-stage fins (with their body interference), based on $S$.', 'From a Barrowman breakdown of the first stage.', 'The larger it is, the more the tail resists the extra nose load from bending.'], range: '5–30 per radian for a finned booster, on the upper-stage reference area.', doc: 'trim', tex: '\\frac{\\alpha}{\\alpha_{rigid}}=\\frac{x_1C_{N1\\alpha}-x_2C_{N2\\alpha}-x_3C_{NN\\alpha}}{x_1C_{N1\\alpha}-x_2C_{N2\\alpha}-x_3C_{NN\\alpha}\\,q_D/(q_D-q)}' } },
        { id: 'x1', label: 'First-stage tail arm from the CG', sym: 'x_1', ...LEN, default: 120, min: 0, max: 2000, slider: { min: 0, max: 400, step: 1 }, when: trimmed,
          info: { text: ['Distance from the centre of gravity back to the first-stage fin centre of pressure.', 'Measure along the rocket from the balance point.', 'A longer arm gives the tail more restoring moment.'], doc: 'trim', tex: '\\frac{\\alpha}{\\alpha_{rigid}}=\\frac{x_1C_{N1\\alpha}-x_2C_{N2\\alpha}-x_3C_{NN\\alpha}}{x_1C_{N1\\alpha}-x_2C_{N2\\alpha}-x_3C_{NN\\alpha}\\,q_D/(q_D-q)}', range: 'From the CG back to the booster fins: a large share of the rocket length.' } },
        { id: 'CN2a', label: 'Second-stage tail and interstage slope', sym: 'C_{N2\\alpha}', ...PERRAD, default: 4, min: 0, max: 100, slider: { min: 0, max: 20, step: 0.1 }, when: trimmed,
          info: { text: ['Normal-force slope of the second-stage fins and the interstage, based on $S$.', 'They sit ahead of the centre of gravity here, so they push the nose further round.', 'Use 0 if the upper stage has no fins.'], doc: 'trim', tex: '\\frac{\\alpha}{\\alpha_{rigid}}=\\frac{x_1C_{N1\\alpha}-x_2C_{N2\\alpha}-x_3C_{NN\\alpha}}{x_1C_{N1\\alpha}-x_2C_{N2\\alpha}-x_3C_{NN\\alpha}\\,q_D/(q_D-q)}', range: '0 without upper-stage fins; 2–8 per radian with them.' } },
        { id: 'x2', label: 'Second-stage tail arm from the CG', sym: 'x_2', ...LEN, default: 30, min: 0, max: 2000, slider: { min: 0, max: 300, step: 1 }, when: trimmed,
          info: { text: ['Distance from the centre of gravity forward to the second-stage fin and interstage centre of pressure.', 'Measure along the rocket from the balance point.', 'A longer arm makes these surfaces more destabilising.'], doc: 'trim', tex: '\\frac{\\alpha}{\\alpha_{rigid}}=\\frac{x_1C_{N1\\alpha}-x_2C_{N2\\alpha}-x_3C_{NN\\alpha}}{x_1C_{N1\\alpha}-x_2C_{N2\\alpha}-x_3C_{NN\\alpha}\\,q_D/(q_D-q)}', range: 'From the CG forward to the interstage or upper fins.' } },
        { id: 'x3', label: 'Nose CP arm from the CG', sym: 'x_3', ...LEN, default: 170, min: 0, max: 2000, slider: { min: 0, max: 500, step: 1 }, when: trimmed,
          info: { text: ['Distance from the centre of gravity forward to the nose centre of pressure.', 'Measure along the rocket from the balance point.', 'The bending raises the nose load, and this arm turns it into a destabilising moment.'], doc: 'trim', tex: '\\frac{\\alpha}{\\alpha_{rigid}}=\\frac{x_1C_{N1\\alpha}-x_2C_{N2\\alpha}-x_3C_{NN\\alpha}}{x_1C_{N1\\alpha}-x_2C_{N2\\alpha}-x_3C_{NN\\alpha}\\,q_D/(q_D-q)}', range: 'From the CG forward to the nose centre of pressure.' } },
      ],
    },
  ],
  results: [
    { id: 'qD', label: 'Divergence dynamic pressure', sym: 'q_D', ...PRES, key: true, digits: 4,
      status: (x, out) => ST[out.lv],
      info: { text: ['The dynamic pressure at which the bending feedback runs away: the nose load bends the stage, the bend raises the nose load, and the loop no longer settles.', 'From the stiffness and the nose normal-force slope (memo).', 'Compare it with the highest dynamic pressure in flight: the verdict wants it at least your margin times higher.'], tex: 'q_D=\\frac{2EI}{S\\,C_{NN\\alpha}l^2}\\ \\ \\text{or}\\ \\ \\frac{1}{S\\,C_{NN\\alpha}\\,C\\,x_j}', range: 'Several times the flight dynamic pressure for a sound design.', doc: 'tube' } },
    { id: 'margin', label: 'Divergence margin', sym: 'q_D/q', dim: 'none', key: true, digits: 3,
      status: (x, out) => ST[out.lv],
      note: (x, out, v) => `you want ${fmt(v.rmin, { digits: 3 })}`,
      info: { text: ['How many times the dynamic pressure could rise before the stage diverges.', 'The divergence dynamic pressure divided by the flight dynamic pressure.', 'The verdict compares it with your required margin; below 1.25 the loads are more than five times those of a rigid stage.'], tex: '\\frac{q_D}{q}', range: '2 or more (this site’s default requirement).', doc: 'verdict' } },
    { id: 'amp', label: 'Nose-load amplification', sym: '\\frac{q_D}{q_D-q}', dim: 'none', key: true, digits: 3,
      status: (x, out) => ST[out.lv],
      note: () => 'bent / rigid nose load',
      info: { text: ['Factor by which the bending raises the nose normal force and every bending load, compared with a rigid stage.', 'It follows from the margin alone.', 'Use it to scale the loads of a rigid-body loads analysis.'], tex: '\\frac{q_D}{q_D-q}', range: '1.25 at a margin of 5, 2 at a margin of 2, 5 at 1.25.', doc: 'tube' } },
    { id: 'lok', label: 'Longest stage within your margin', sym: 'l_{ok}', ...LEN, key: true, digits: 4, when: tube,
      status: (x, out, v) => (typeof x !== 'number' || v.l <= x ? 'ok' : ST[out.lv]),
      note: (x, out, v) => (typeof x === 'number' ? `now ${show(v.l, LEN)}` : ''),
      info: { text: ['The longest cantilever (nose CP to stage base) with the same tube that still keeps your margin at this dynamic pressure.', 'Solved from $q_D\\propto1/l^2$.', 'A longer payload needs a stiffer tube or a lower dynamic pressure.'], tex: 'l_{ok}=l\\sqrt{\\frac{q_D}{n_Dq}}', doc: 'verdict' } },
    { id: 'jointAmp', label: 'Joint rotation per degree of angle of attack', sym: '\\varphi/\\alpha', dim: 'none', key: true, digits: 4, when: joint,
      info: { text: ['How many degrees the joint bends for each degree of angle of attack of the rocket.', 'From the margin: the bend adds this much to the nose angle of attack.', 'It grows without limit at divergence.'], tex: '\\frac{\\varphi}{\\alpha}=\\frac{q}{q_D-q}', doc: 'joint' } },
    { id: 'qok', label: 'Highest dynamic pressure within your margin', sym: 'q_{ok}', ...PRES, digits: 4,
      info: { text: ['The highest flight dynamic pressure this stage can take while keeping your margin.', 'Your divergence dynamic pressure divided by your margin.', 'Fly a lower-speed or higher-altitude burnout to stay below it.'], tex: 'q_{ok}=\\frac{q_D}{n_D}', doc: 'verdict' } },
    { id: 'tneed', label: 'Thinnest wall within your margin', sym: 't_{ok}', ...LEN, digits: 4, when: tube,
      info: { text: ['The wall thickness at which this stage just keeps your margin.', 'Solved from $q_D\\propto t$ (thin-wall stiffness).', 'Above about a fifth of the radius the thin-wall formula overestimates the stiffness.'], tex: 't_{ok}=t\\,\\frac{n_Dq}{q_D}', doc: 'verdict' } },
    { id: 'Cneed', label: 'Softest joint within your margin', sym: 'C_{ok}', ...COMP, digits: 4, when: joint,
      info: { text: ['The joint compliance at which this design just keeps your margin.', 'Solved from $q_D\\propto1/C$.', 'Stiffen the joint (more bolts, a longer spigot, a tighter fit) to get below it.'], tex: 'C_{ok}=C\\,\\frac{q_D}{n_Dq}', doc: 'verdict' } },
    { id: 'lmax', label: 'Stage length that diverges at this q', sym: 'l_{max}', ...LEN, digits: 4, when: tube,
      info: { text: ['The stage length (nose CP to stage base) that would diverge at this dynamic pressure: margin 1.'], tex: 'l_{max}=\\sqrt{\\frac{2EI}{S\\,C_{NN\\alpha}q}}', doc: 'tube' } },
    { id: 'bodyAmp', label: 'Angle-of-attack amplification (whole rocket)', sym: '\\alpha/\\alpha_{rigid}', dim: 'none', digits: 4, when: trimmed, info: { text: ['How much the trimmed angle of attack of the whole rocket grows compared with a rigid rocket (memo eq. 1).'], tex: '\\frac{\\Sigma}{x_1\\,C_{N1\\alpha}-x_2\\,C_{N2\\alpha}-x_3\\,C_{NN\\alpha}q_D/(q_D-q)}', doc: 'trim' } },
    { id: 'noseAmp', label: 'Nose angle-of-attack amplification', sym: '\\alpha_N/\\alpha_{rigid}', dim: 'none', digits: 4, when: trimmed, info: { text: ['How much the nose angle of attack grows, including its own bending slope (memo eq. 2).'], doc: 'trim' } },
    { id: 'EI', label: 'Bending stiffness', sym: 'EI', dim: 'stiffness', internal: 'lbfin2', digits: 4, when: tube, info: { text: ['How hard the tube is to bend: Young’s modulus times the second moment of area of a thin-walled tube.'], tex: 'EI\\approx E\\pi R^3t', doc: 'tube' } },
    { id: 'S', label: 'Reference area', sym: 'S', dim: 'area', internal: 'in2', digits: 4, info: { text: ['The tube cross-section area the normal-force slope is based on.'], tex: 'S=\\pi R^2', doc: 'tube' } },
  ],
  compute(v) {
    const o = divergence(model(v));
    const m = v.q > 0 ? o.qD / v.q : Infinity, unstable = o.trim && !o.trim.stable && v.q < o.qD;
    const lv = unstable || m < INNER ? 'unsafe' : m < v.rmin ? 'marginal' : 'safe';
    // fixes, closed form, all aiming at q_D = n_D q: q_D ∝ t, ∝ 1/l², ∝ 1/C
    const k = v.q > 0 ? (v.rmin * v.q) / o.qD : 0;
    const qok = o.qD / v.rmin, tneed = v.t * k, lok = k > 0 ? v.l / Math.sqrt(k) : Infinity, Cneed = k > 0 ? v.C / k : Infinity;
    const P = (x) => show(x, PRES, 3), L = (x) => show(x, LEN, 3);
    const fixes = [];
    if (lv !== 'safe' && m < v.rmin) {
      if (tube(v)) {
        fixes.push(`Thicken the wall to at least <b>${L(tneed)}</b> (now ${L(v.t)})${tneed > 0.2 * v.R ? ' — thick for this radius: the thin-wall formula is optimistic there' : ''}, or`);
        fixes.push(`shorten the stage to at most <b>${L(lok)}</b> from nose CP to base (now ${L(v.l)}), or`);
      } else {
        fixes.push(`stiffen the joint to a compliance of at most <b>${show(Cneed, COMP, 3)}</b> (now ${show(v.C, COMP, 3)}), or`);
      }
      fixes.push(`keep the flight dynamic pressure below <b>${P(qok)}</b> (now ${P(v.q)}).`);
    }
    let cn1 = null;
    if (unstable) {
      // the trim denominator x1·CN1a − x2·CN2a − x3·CNa·amp must stay positive
      cn1 = (v.x2 * v.CN2a + v.x3 * v.CNa * o.amp) / v.x1;
      fixes.push(`Keep the rocket stable with the bent nose: a first-stage tail normal-force slope above <b>${fmt(cn1, { digits: 3 })}</b> per radian (now ${fmt(v.CN1a, { digits: 3 })}), or move the CG forward.`);
    }
    const ampTxt = Number.isFinite(o.amp) ? `${fmt(o.amp, { digits: 3 })}×` : 'without limit';
    const verdict = {
      level: lv,
      title: unstable ? 'The bending makes the rocket statically unstable' : lv === 'safe' ? 'Stiff enough: the stage stays well below divergence' : lv === 'marginal' ? 'Little margin: bending raises the loads a lot' : m <= 1 ? 'The stage diverges: it bends until it breaks' : 'Too close to divergence: the loads run away',
      text: v.q > 0 ? `Divergence at <b>${P(o.qD)}</b>, ${fmt(m, { digits: 3 })} × the flight dynamic pressure of ${P(v.q)}; you want <b>${fmt(v.rmin, { digits: 3 })}×</b>. The nose and bending loads grow ${ampTxt}.` : `No dynamic pressure, no load: divergence is at <b>${P(o.qD)}</b>.`,
      fixes,
    };
    const warnings = [];
    if (lv !== 'safe') warnings.push({ level: lv === 'unsafe' ? 'err' : 'warn', text: unstable ? 'With the flexible nose the rocket is no longer statically stable at this dynamic pressure (the trim equation has no positive solution).' : v.q >= o.qD ? 'The dynamic pressure is at or beyond divergence: the upper stage would bend until it breaks.' : `Loads are amplified ${ampTxt}; the margin ${fmt(m, { digits: 3 })} is below the ${fmt(v.rmin, { digits: 3 })} you want.`, fix: 'See the verdict for the wall, length or dynamic pressure that meets your margin.' });
    if (tube(v) && v.t > 0.2 * v.R) warnings.push({ level: 'info', text: 'The wall is thick compared with the radius; $EI\\approx E\\pi R^3\\,t$ assumes a thin wall and overestimates the stiffness.' });
    const results = { qD: o.qD, margin: v.q > 0 ? m : 'no load', amp: Number.isFinite(o.amp) ? o.amp : 'diverges', lok: v.q > 0 ? lok : 'no limit', lmax: v.q > 0 ? o.lmax : 'no limit',
      jointAmp: v.q < o.qD ? v.q / (o.qD - v.q) : 'diverges', qok, tneed: v.q > 0 ? tneed : '—', Cneed: v.q > 0 ? Cneed : '—', EI: o.EI, S: o.S,
      bodyAmp: o.trim ? (o.trim.stable ? o.trim.body : 'unstable') : undefined, noseAmp: o.trim ? (o.trim.stable ? o.trim.nose : 'unstable') : undefined };
    return { results, warnings, verdict, lv, m, o, fix: { tneed, lok, qok, Cneed, cn1 } };
  },
  plots: [
    {
      id: 'amp', title: 'Load amplification as q nears divergence',
      info: { text: ['Bent-to-rigid nose load as the dynamic pressure approaches divergence. It doubles at half of $q_D$ and grows without limit beyond.', 'Left of the red line you keep your margin.'], doc: 'verdict' },
      build(v, out) {
        const pts = []; for (let i = 0; i <= 95; i++) { const r = i / 100; pts.push([r, 1 / (1 - r)]); }
        const r = v.q / out.o.qD;
        return { x: { label: '$q/q_D$' }, y: { label: 'Load amplification' }, xDomain: [0, 1], yDomain: [0, 20], series: [{ name: '\\frac{q_D}{q_D-q}', points: pts, smooth: true }],
          vlines: [{ x: 1 / v.rmin, label: 'your margin', color: 'var(--danger)' }],
          markers: r < 0.95 ? [{ x: r, y: 1 / (1 - r), label: 'your stage' }] : [] };
      },
    },
    {
      id: 'length', title: 'Divergence dynamic pressure against length',
      info: { text: ['Divergence dynamic pressure of the same tube (or joint) for other lengths. It falls as $1/l^2$ for a tube, as $1/x_j$ for a joint.', 'Where the curve crosses the red line (your margin times the flight dynamic pressure) is the longest stage that keeps your margin.'], doc: 'verdict' },
      build(v, out, { U }) {
        const up = U(PRES), ul = U(LEN), pts = [];
        if (v.mode === 'tube') for (let i = 1; i <= 100; i++) { const l = (2 * v.l * i) / 100; pts.push([ul.v(l), up.v(qdTube(v.E, v.R, v.t, l, v.CNa))]); }
        else for (let i = 1; i <= 100; i++) { const x = (2 * v.xj * i) / 100; pts.push([ul.v(x), up.v(qdJoint(v.R, v.CNa, v.C, x))]); }
        const lx = v.mode === 'tube' ? v.l : v.xj;
        return { x: { label: v.mode === 'tube' ? 'Nose CP to stage base $l$' : 'Nose CP to joint $x_j$', unit: ul.label }, y: { label: 'Divergence $q_D$', unit: up.label },
          yDomain: [0, up.v(4 * Math.max(out.o.qD, v.rmin * v.q))], series: [{ name: 'q_D', points: pts, smooth: true }],
          hlines: [{ y: up.v(v.rmin * v.q), label: 'your margin', color: 'var(--danger)' }, { y: up.v(v.q), label: 'flight q', color: 'var(--text-3)' }], markers: [{ x: ul.v(lx), y: up.v(out.o.qD), label: 'your stage' }] };
      },
    },
    {
      id: 'trim', title: 'Angle-of-attack amplification against q', when: (v) => !!v.trim, explore: true,
      info: { text: 'How much the trimmed angle of attack of the whole rocket and of its nose grow with dynamic pressure, compared with a rigid rocket (memo eqs. 1 and 2). They run away before $q_D$ if the bending destroys static stability first.', doc: 'trim' },
      build(v, out, { U }) {
        if (!v.trim) return null;
        const up = U(PRES), qD = out.o.qD, body = [], nose = [], rigid = [];
        const tr = { x1: v.x1, CN1a: v.CN1a, x2: v.x2, CN2a: v.CN2a, x3: v.x3, CNNa: v.CNa, qD };
        for (let i = 0; i <= 120; i++) {
          const q = (0.98 * qD * i) / 120, a = trimAmplification({ ...tr, q }), ok = a.stable && a.body > 0 && a.body < 50;
          body.push([up.v(q), ok ? a.body : NaN]); nose.push([up.v(q), ok && a.nose < 50 ? a.nose : NaN]); rigid.push([up.v(q), amplification(q, qD)]);
        }
        return { x: { label: 'Dynamic pressure $q$', unit: up.label }, y: { label: 'Amplification' }, yDomain: [0, 10],
          series: [{ name: 'body $\\alpha/\\alpha_{rigid}$', points: body }, { name: 'nose $\\alpha_N/\\alpha_{rigid}$', points: nose, dashed: true }, { name: 'nose load, booster held', points: rigid, dashed: true, color: 'var(--text-3)' }],
          vlines: [{ x: up.v(v.q), label: 'flight q', color: 'var(--danger)' }] };
      },
    },
  ],
  schematicTitle: 'Upper stage under its nose load',
  schematicHint: 'The upper stage bends as a cantilever from the booster (deflection exaggerated, growing with the load amplification), coloured by the verdict. The gauge shows the flight dynamic pressure against your margin and divergence. Drag the nose tip (or the joint) to change the length, or the gauge marker to change the dynamic pressure',
  schematic(ctx, v, out) {
    const W = 760, H = 330, o = out.o;
    const fr = ctx.frame({ width: W, height: H, label: 'Flexible upper stage cantilevered from the booster, and the dynamic-pressure gauge' });
    const g = fr.layer('main'); g.replaceChildren();
    const ul = ctx.U(LEN), up = ctx.U(PRES), Ld = (x) => `${fmt(ul.v(x), { digits: 3 })} ${ul.label}`, P = (x) => `${fmt(up.v(x), { digits: 4 })} ${up.label}`;
    // booster (rigid, cut) on the left; the upper stage from xb to the nose tip, to scale with its own radius
    const cy = 120, xb = 250, Lp = 430, lIn = v.mode === 'tube' ? v.l : Math.max(v.xj * 2.5, 6 * v.R), k = Lp / lIn, r = Math.max(5, Math.min(30, v.R * k));
    const div = !Number.isFinite(o.amp), tip = Math.min(70, div ? 70 : 6 * o.amp);
    const shape = (x) => { const u = x / Lp; return v.mode === 'tube' ? (tip * (3 * u * u - u ** 3)) / 2 : Math.max(0, (x - (Lp - v.xj * k)) / (v.xj * k)) * tip; };
    // booster body and fins
    g.append(s('rect', { x: 40, y: cy - r * 1.25, width: xb - 40, height: 2.5 * r, class: 'sc-body-2' }));
    for (const sg of [-1, 1]) g.append(s('path', { d: `M60,${cy + sg * r * 1.25}L46,${cy + sg * (r * 1.25 + 34)}L96,${cy + sg * (r * 1.25 + 34)}L120,${cy + sg * r * 1.25}`, class: 'sc-body-2' }));
    g.append(s('path', { d: `M40,${cy - r * 1.25 - 6}l-6,10l12,10l-12,10l12,10l-6,${2.5 * r - 28}`, class: 'sc-thin' }));
    // upper stage: centre line y(x) bent downward-up (deflects towards the nose load), outline ±r, nose cone
    const n = 60, cl = []; for (let i = 0; i <= n; i++) { const x = (Lp * i) / n; cl.push([xb + x, cy - shape(x)]); }
    const slope = (i) => { const a = cl[Math.max(0, i - 1)], b = cl[Math.min(n, i + 1)]; return Math.atan2(b[1] - a[1], b[0] - a[0]); };
    const lnose = Math.min(Lp * 0.25, 4 * r), iN = Math.round(n * (1 - lnose / Lp));
    const up1 = [], dn1 = [];
    cl.forEach(([x, y], i) => { const th = slope(i), rr = i <= iN ? r : r * (n - i) / (n - iN); up1.push([x + rr * Math.sin(th), y - rr * Math.cos(th)]); dn1.push([x - rr * Math.sin(th), y + rr * Math.cos(th)]); });
    g.append(s('path', { d: path([...up1, ...dn1.reverse()], true), class: 'sc-body', style: out.lv === 'safe' ? null : `fill:${COL[out.lv]};fill-opacity:.2;stroke:${COL[out.lv]}`, 'data-field': 'E t R l C xj' }));
    // undeflected outline for reference
    g.append(s('path', { d: `M${xb},${cy - r}H${xb + Lp - lnose}L${xb + Lp},${cy}L${xb + Lp - lnose},${cy + r}H${xb}`, class: 'sc-thin', fill: 'none', 'stroke-dasharray': '3 3', opacity: 0.6 }));
    if (v.mode === 'joint') { const xjp = xb + Lp - v.xj * k; g.append(s('circle', { cx: xjp, cy: cy - shape(xjp - xb), r: 6, fill: 'var(--surface)', stroke: 'var(--text)', 'stroke-width': 1.5, 'data-field': 'C xj' }));
      g.append(text(xjp, cy + r + 18, 'flexible joint', { anchor: 'middle', size: 10.5, field: 'C xj' })); }
    // nose CP and its normal force, growing with the amplification
    const xcp = xb + Lp - lnose * 0.6, ycp = cy - shape(xcp - xb), fl = Math.min(90, 26 * (div ? 3.4 : Math.min(3.4, o.amp)));
    // the nose force acts upward (towards the bend), drawn from below the nose
    g.append(s('line', { x1: xcp, y1: ycp + r + fl, x2: xcp, y2: ycp + r + 2, class: 'sc-accent', 'stroke-width': 2.4, 'marker-end': fr.arrow('acc') }));
    g.append(text(xcp - 10, Math.max(ycp + r + fl * 0.7, cy + r + 16), div ? 'N_N grows without limit' : `N_N × ${amp(o.amp)}`, { anchor: 'end', size: 11 }));
    g.append(pointMarker(xcp, ycp, '', { kind: 'cp', field: 'CNa' }));
    const yd = cy - r - Math.max(46, tip + 26);
    if (v.mode === 'tube') g.append(dim(fr, xb, yd, xcp, yd, `l = ${Ld(v.l)}`, { field: 'l' }));
    else g.append(dim(fr, xb + Lp - v.xj * k, yd, xcp, yd, `x_j = ${Ld(v.xj)}`, { field: 'xj' }));
    g.append(text(xb - 6, cy + r * 1.25 + 52, 'booster (stiff)', { anchor: 'end', size: 10.5, cls: 'sc-dim-text' }));
    // gauge: 0 … 1.25 q_D; green up to your margin, amber to q_D/1.25, red beyond
    const gx0 = 60, gx1 = 700, gy = 268, top = 1.25 * o.qD, G = (q) => gx0 + (Math.min(q, top) / top) * (gx1 - gx0), qr = o.qD / v.rmin;
    g.append(s('rect', { x: gx0, y: gy - 6, width: G(qr) - gx0, height: 12, fill: 'var(--ok)', 'fill-opacity': 0.25, stroke: 'var(--border)' }));
    g.append(s('rect', { x: G(qr), y: gy - 6, width: Math.max(0, G(o.qD / INNER) - G(qr)), height: 12, fill: 'var(--warn)', 'fill-opacity': 0.3, stroke: 'var(--border)' }));
    g.append(s('rect', { x: G(o.qD / INNER), y: gy - 6, width: G(o.qD) - G(o.qD / INNER), height: 12, fill: 'var(--danger)', 'fill-opacity': 0.3, stroke: 'var(--border)' }));
    g.append(s('rect', { x: G(o.qD), y: gy - 6, width: gx1 - G(o.qD), height: 12, fill: 'var(--danger)', 'fill-opacity': 0.75 }));
    g.append(s('line', { x1: G(qr), y1: gy - 10, x2: G(qr), y2: gy + 10, stroke: 'var(--danger)', 'stroke-width': 2 }));
    if (G(o.qD) - G(qr) > 70) g.append(text(G(qr), gy + 24, `your margin q_D/${fmt(v.rmin, { digits: 3 })}`, { anchor: 'middle', size: 10, field: 'rmin' }));
    g.append(text(G(o.qD), gy + 24, `q_D = ${P(o.qD)}`, { anchor: 'middle', size: 10.5 }));
    g.append(text(gx0, gy + 24, '0', { anchor: 'middle', size: 10, cls: 'sc-dim-text' }));
    g.append(text(G(v.q), gy - 16, `q = ${P(v.q)}`, { anchor: G(v.q) > gx1 - 60 ? 'end' : G(v.q) < gx0 + 60 ? 'start' : 'middle', size: 11, field: 'q' }));
    // drag the nose tip (tube) or the joint to change the length; the drawing rescales to the new length
    if (v.mode === 'tube') ctx.handle('l', xb + Lp, cy - shape(Lp), {
      field: 'l', title: 'Drag to change the stage length',
      onDrag: (sx) => ctx.setValue('l', Math.max(20, Math.min(1000, (v.l * (sx - xb)) / Lp)), { round: 1 }),
      onKey: (dx) => ctx.setValue('l', Math.max(20, v.l + 5 * dx)),
    });
    else { const xjp = xb + Lp - v.xj * k; ctx.handle('xj', xjp, cy - shape(xjp - xb), {
      field: 'xj', title: 'Drag to move the joint',
      onDrag: (sx) => ctx.setValue('xj', Math.max(5, Math.min(0.9 * lIn, (xb + Lp - sx) / k)), { round: 1 }),
      onKey: (dx) => ctx.setValue('xj', Math.max(5, v.xj - 2 * dx)),
    }); }
    g.append(text(20, H - 8, 'deflection exaggerated; dashed: rigid stage', { size: 10, cls: 'sc-dim-text' }));
    ctx.handle('q', G(v.q), gy, {
      field: 'q', title: 'Drag to change the dynamic pressure',
      onDrag: (sx) => ctx.setValue('q', Math.max(0, ((sx - gx0) / (gx1 - gx0)) * top), { round: 10 }),
      onKey: (dx) => ctx.setValue('q', Math.max(0, v.q * (1 + 0.05 * dx))),
    });
  },
  symbols: {
    q: 'dynamic pressure (kPa or lbf/ft²)', q_D: 'divergence dynamic pressure (kPa or lbf/ft²)', E: 'Young’s modulus of the tube (GPa or psi)', I: 'second moment of area of the tube (mm⁴ or in⁴)', EI: 'bending stiffness (N·m² or lbf·in²)', R: 'tube radius (mm or in)', t: 'wall thickness (mm or in)',
    l: 'nose centre of pressure to the stage base (mm or in)', S: 'reference area, $\\pi R^2$ (cm² or in²)', 'C_{NN\\alpha}': 'normal-force slope ahead of the bend', C: 'joint compliance: rotation per unit bending moment (rad per N·m or per lbf·in)', x_j: 'nose centre of pressure to the joint (mm or in)',
    N_N: 'nose normal force', '\\alpha': 'angle of attack', '\\alpha_N': 'nose angle of attack', '\\alpha_{rigid}': 'angle of attack of a rigid rocket', '\\varphi': 'joint rotation',
    'C_{N1\\alpha}': 'first-stage tail normal-force slope (per radian)', 'C_{N2\\alpha}': 'second-stage tail and interstage normal-force slope (per radian)', x_1: 'first-stage tail arm from the CG (mm or in)', x_2: 'second-stage tail arm from the CG (mm or in)', x_3: 'nose arm from the CG (mm or in)',
    '\\Sigma': 'rigid-rocket restoring-moment sum', l_max: 'longest upper stage at this dynamic pressure',
    '\\rho': 'air density (kg/m³)',
    V: 'flight speed (m/s)',
    n_D: 'the margin you want below divergence',
    'l_{ok}': 'longest stage within your margin (mm or in)',
    'q_{ok}': 'highest dynamic pressure within your margin (kPa or lbf/ft²)',
    't_{ok}': 'thinnest wall within your margin (mm or in)',
    'C_{ok}': 'softest joint within your margin',
    'l_{max}': 'stage length that diverges at this $q$ (mm or in)',
  },
  report(v, out, R) {
    const o = out.o, n = R.n, Q = R.Q, tubeMode = v.mode === 'tube';
    const steps = [{ label: 'Reference area', lhs: 'S', eq: '\\pi R^2', sub: `\\pi\\times(${R.v(v.R, LEN)})^2`, res: `${n(R.raw(o.S, { dim: 'area', internal: 'in2' }))}\\,${R.u({ dim: 'area' })}` }];
    // substitutions in consistent base units: lbf, in (result × 144 → lbf/ft²) or N, m (→ Pa)
    const L = (x) => (R.us ? n(x) : n(x * 0.0254)), A = (x) => (R.us ? n(x) : n(x * 0.0254 ** 2)), EIb = R.us ? n(o.EI) : n(o.EI * 4.4482216152605 * 0.0254 ** 2), Eb = R.us ? n(v.E) : n(v.E * 6894.757293168);
    const k144 = R.us ? '144\\times' : '';
    if (tubeMode) steps.push(
      { label: 'Bending stiffness of the thin-walled tube', lhs: 'EI', eq: 'E\\pi R^3\\,t', sub: `${Eb}\\times\\pi\\times${L(v.R)}^3\\times${L(v.t)}`, res: Q(o.EI, { dim: 'stiffness', internal: 'lbfin2' }) },
      { label: `Divergence dynamic pressure of the cantilevered stage${R.us ? ' (144 in² per ft²)' : ''}`, lhs: 'q_D', eq: '\\frac{2EI}{S\\,C_{NN\\alpha}l^2}', sub: `${k144}\\frac{2\\times${EIb}}{${A(o.S)}\\times${n(v.CNa)}\\times${L(v.l)}^2}`, res: Q(o.qD, PRES) },
      { label: 'Longest stage at the flight dynamic pressure', lhs: 'l_{max}', eq: '\\sqrt{\\frac{2EI}{S\\,C_{NN\\alpha}q}}', sub: `\\sqrt{\\frac{${k144}2\\times${EIb}}{${A(o.S)}\\times${n(v.CNa)}\\times${R.v(v.q, PRES)}}}`, res: Q(o.lmax, LEN) });
    else steps.push({ label: `Divergence dynamic pressure of the flexible joint${R.us ? ' (144 in² per ft²)' : ''}`, lhs: 'q_D', eq: '\\frac{1}{S\\,C_{NN\\alpha}\\,C\\,x_j}', sub: `${k144}\\frac{1}{${A(o.S)}\\times${n(v.CNa)}\\times${R.v(v.C, COMP)}\\times${L(v.xj)}}`, res: Q(o.qD, PRES) });
    steps.push({ label: 'Nose-load amplification at the flight dynamic pressure', lhs: '\\frac{N_N}{N_{N,rigid}}', eq: '\\frac{q_D}{q_D-q}', sub: `\\frac{${R.v(o.qD, PRES)}}{${R.v(o.qD, PRES)}-${R.v(v.q, PRES)}}`, res: Number.isFinite(o.amp) ? n(o.amp) : '\\infty' });
    if (o.trim) steps.push(
      { label: 'Rigid-rocket restoring-moment sum', lhs: '\\Sigma', eq: 'x_1\\,C_{N1\\alpha}-x_2\\,C_{N2\\alpha}-x_3\\,C_{NN\\alpha}', res: Q(o.trim.sum, LEN) },
      { label: 'Angle-of-attack amplification of the whole rocket (eq. 1)', lhs: '\\frac{\\alpha}{\\alpha_{rigid}}', eq: '\\frac{\\Sigma}{x_1\\,C_{N1\\alpha}-x_2\\,C_{N2\\alpha}-x_3\\,C_{NN\\alpha}\\frac{q_D}{q_D-q}}', res: o.trim.stable ? n(o.trim.body) : '\\text{unstable}' },
      { label: 'Nose angle-of-attack amplification (eq. 2)', lhs: '\\frac{\\alpha_N}{\\alpha_{rigid}}', eq: '\\frac{q_D\\,\\Sigma}{(x_1\\,C_{N1\\alpha}-x_2\\,C_{N2\\alpha})(q_D-q)-x_3\\,C_{NN\\alpha}\\,q_D}', res: o.trim.stable ? n(o.trim.nose) : '\\text{unstable}' });
    return [{
      title: 'Theory',
      text: 'The upper stage is a cantilever from a stiff booster, loaded at the nose centre of pressure by $N_N=qS\\,C_{NN\\alpha}(\\alpha+dy/dx)$. The beam equation $N_N(l-x)=EI\\,d^2y/dx^2$ gives the nose slope $dy/dx=q\\alpha/(q_D-q)$ with $q_D=2EI/(S\\,C_{NN\\alpha}l^2)$, so the nose load is $qS\\,C_{NN\\alpha}\\alpha\\,q_D/(q_D-q)$. A flexible joint of compliance $C$ at $x_j$ behind the nose CP gives $q_D=1/(S\\,C_{NN\\alpha}\\,C\\,x_j)$ (Hoult).',
      steps,
    }];
  },
  references: ['upper-stage-bending-influence-on-static-stability3', 'longeron-bending'],
  examples: [
    { name: 'Dart: aluminium tube, 6.75 in, 150 in long', values: { rmin: 2, mode: 'tube', R: 3.375, E: 10.5e6, t: 0.125, l: 150, CNa: 3, q: 8000, trim: false } },
    { name: 'Same, long heavy payload (220 in) at high q', values: { mode: 'tube', R: 3.375, E: 10.5e6, t: 0.125, l: 220, CNa: 3, q: 12000, trim: true, CN1a: 10, x1: 120, CN2a: 4, x2: 30, x3: 240 } },
    { name: 'Glass-fibre upper stage, 4 in', values: { mode: 'tube', R: 2, E: 2.5e6, t: 0.08, l: 70, CNa: 2.5, q: 6000, trim: false } },
    { name: 'Flexible payload joint', values: { mode: 'joint', R: 3, C: 1e-6, xj: 40, CNa: 2, q: 5000, trim: false } },
  ],
};
