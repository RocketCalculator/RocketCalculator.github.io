// Body Bending Modes — UI definition.
import { bending, shape, slope, curvature, tubeElems, strainShare } from '../calc/bending.js';
import { s, fmt, InputError } from '../util.js';
import { text, path, dim } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const LEN = { dim: 'length', internal: 'in' };
const EI = { dim: 'stiffness', internal: 'lbfin2' };
const WPL = { dim: 'linearDensity', internal: 'lbpin', units: { si: 'kgpm', us: 'lbpin' } };
const MOD = { dim: 'modulus', internal: 'psi' };
const MASS = { dim: 'mass', internal: 'lbm' };
const HZ = { dim: 'frequency', internal: 'hz' };
const NONE = { dim: 'none' };
const TAU = 2 * Math.PI;
// verdict bands (D33): f1 against the user's excitation frequency f_exc and wanted separation r.
// SAFE f1 ≥ r·f_exc; MARGINAL 1.25·f_exc ≤ f1 < r·f_exc; UNSAFE below (at or near resonance, or swept through it).
const NEAR = 1.25;
const ST = { safe: 'ok', marginal: 'warn', unsafe: 'err' };
const COL = { safe: 'var(--ok)', marginal: 'var(--warn)', unsafe: 'var(--danger)' };
// Aries sounding rocket (field-tool example): aft station, stiffness and weight per length at both ends of each element
const ARIES = [[141, 0, 3.89e10, 0, 18.13], [177, 8.14e11, 8.14e11, 29.89, 29.89], [207, 1.6e11, 1.6e11, 12.67, 12.67], [330, 4.637e10, 5.692e10, 47.89, 47.89], [365, 1.6e11, 4.69e11, 5.43, 5.43]]
  .map(([x, EIf, EIa, wf, wa]) => ({ x, EIf, EIa, wf, wa }));
// tube examples, entered in SI and stored in the internal units (in, psi, lbm)
const MM = 1 / 25.4, GPA = 145037.738, KG = 2.20462262;
const tubes = (rows) => rows.map(([len, D, t, E, m]) => ({ len: len * MM, D: D * MM, t: t * MM, E: E * GPA, m: m * KG }));
const HPR98 = tubes([[450, 98, 2, 17, 1.0], [600, 98, 2, 17, 2.2], [1300, 98, 2, 17, 6.5]]);
const MIN54 = tubes([[350, 56, 1.5, 17, 0.35], [400, 56, 1.5, 17, 0.6], [1500, 56, 1.5, 17, 2.4]]);

const L = (x) => `${fmt(toDisplay(x, LEN), { digits: 3 })} ${unitLabel(displayUnit(LEN))}`;
const Hz = (x) => `${fmt(x, { digits: 3 })} Hz`;

function check(rows) {
  if (rows.some((r) => ['x', 'EIf', 'EIa', 'wf', 'wa'].some((k) => !Number.isFinite(r[k])))) return 'Every cell needs a number.';
  if (!(rows[0].x > 0)) return 'The first element must end aft of the nose tip (station > 0).';
  for (let i = 1; i < rows.length; i++) if (rows[i].x <= rows[i - 1].x) return `Stations must increase down the table (row ${i}).`;
  if (rows.some((r) => r.EIf < 0 || r.EIa < 0 || r.wf < 0 || r.wa < 0)) return 'Stiffness and weight cannot be negative.';
  if (!rows.some((r) => r.EIf > 0 || r.EIa > 0) || !rows.some((r) => r.wf > 0 || r.wa > 0)) return 'The body needs some stiffness and some weight.';
  return '';
}
function checkTubes(rows) {
  if (rows.some((r) => ['len', 'D', 't', 'E', 'm'].some((k) => !Number.isFinite(r[k])))) return 'Every cell needs a number.';
  for (const [i, r] of rows.entries()) {
    if (!(r.len > 0) || !(r.D > 0)) return `Row ${i}: the length and the outer diameter must be positive.`;
    if (!(r.t > 0) || r.t > r.D / 2) return `Row ${i}: the wall must be thicker than zero and at most half the diameter (a solid rod).`;
    if (!(r.E > 0) || r.m < 0) return `Row ${i}: Young’s modulus must be positive and the mass cannot be negative.`;
  }
  if (!rows.some((r) => r.m > 0)) return 'The body needs some mass.';
  return '';
}
/** Interior zero crossings of fn(q, ξ), as fractions of the length. */
function zeros(fn, q) {
  const out = []; let prev = fn(q, 0);
  for (let i = 1; i <= 400; i++) { const xi = i / 400, y = fn(q, xi); if (prev * y < 0) out.push(xi - (y / 400) / (y - prev)); prev = y; }
  return out;
}
const f1Of = (elems) => bending(elems).modes[0].omega / TAU;
/** Bisection for the smallest a in [lo, hi] with f1(make(a)) ≥ target (f1 grows with stiffness); null if hi is not enough. */
function solve(make, lo, hi, target) {
  if (f1Of(make(hi)) < target) return null;
  for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (f1Of(make(m)) >= target) hi = m; else lo = m; }
  return hi;
}
const elemsOf = (v) => (v.entry === 'ei' ? v.elems : tubeElems(v.tubes));
const scaleRow = (elems, i, k) => elems.map((e, j) => (j === i ? { ...e, EIf: e.EIf * k, EIa: e.EIa * k } : e));

export default {
  slug: 'body-bending',
  topic: 'body-bending-dynamics',
  title: 'Body Bending Modes',
  subtitle: 'The <b>natural bending frequencies, mode shapes and nodes</b> of a rocket body made of sections, and whether the first bending frequency stays clear of what shakes it.',
  verdict: true,
  intro: {
    what: 'Works out how the whole rocket flexes like a free-flying beam: its first three bending frequencies, the shapes it bends into and the points that stay still, from the tubes (or the stiffness and weight) of each section, by the Rayleigh–Ritz method.',
    why: 'If the roll rate, the pitch motion, a control loop or the motor shakes the body near its first bending frequency, the bending grows: large angles of attack, roll lock-in, even break-up. Sensors also feel the bending, depending on where they sit.',
    when: 'Laying out the airframe and its joints, choosing a tube wall or material, placing an inertial sensor, or checking a long, thin rocket against its roll rate or control bandwidth.',
  },
  info: {
    text: [
      'A flying rocket bends like a beam that nothing holds at either end (free-free). The bending shapes of a uniform beam of the same length are a good starting set of shapes.',
      'The real shape is written as a mix of three of those shapes. The energy of the moving mass and of the bent tube give two small matrices, and the frequencies at which they balance are the natural frequencies (Rayleigh–Ritz).',
      'The lowest frequency is the most accurate; the third is only a rough estimate with three shapes.',
    ],
    tex: '\\det\\left(\\omega^2\\mathbf M-\\mathbf K\\right)=0,\\quad K_{ij}=\\int EI\\,\\psi_i^{\\prime\\prime}\\psi_j^{\\prime\\prime}dx,\\quad M_{ij}=\\int m\\,\\psi_i\\psi_j\\,dx',
    steps: [
      'Describe the body section by section from the nose: length, outer diameter, wall, tube material and the section’s mass with everything inside it.',
      'Enter the highest frequency something shakes the rocket at (roll rate, control bandwidth) and how far above it you want the first bending frequency.',
      'Read the verdict and the wall or material that fixes it; the drawing shows the bent shape, its nodes and the section that bends most.',
      'Place accelerometers near a node and rate gyros near the zero-slope point.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'body', title: 'Body sections (nose to tail)',
      fields: [
        { id: 'entry', label: 'Describe each section by', kind: 'select', default: 'tube',
          options: [{ value: 'tube', label: 'Its tube and mass' }, { value: 'ei', label: 'Stiffness and weight per length' }],
          info: { text: ['How you describe the sections of the body.', 'Tube and mass: what you can measure — length, outer diameter, wall thickness, the tube material’s stiffness and the weighed mass of the section with everything in it.', 'Stiffness and weight per length: the form of the original method, for bodies whose bending stiffness is known from analysis or test; each may vary linearly along a section.'], doc: 'tubes' } },
        { id: 'tubes', label: 'Sections: length, outer diameter, wall, tube modulus and mass (with contents)', kind: 'table', minRows: 1, when: (v) => v.entry !== 'ei',
          columns: [{ id: 'len', label: 'Length', ...LEN }, { id: 'D', label: 'Outer dia.', ...LEN }, { id: 't', label: 'Wall', ...LEN }, { id: 'E', label: 'Modulus', ...MOD }, { id: 'm', label: 'Mass', ...MASS }],
          default: HPR98, validate: checkTubes,
          info: { text: ['One row per section from the nose tip aft: nose cone, payload bay, booster. Each section is treated as a uniform tube.', 'Length and diameters with a calliper; the modulus $E$ from the tube maker’s data sheet; the mass by weighing the section with everything that rides in it (motor, avionics, parachute).', 'A thicker wall, a wider tube or a stiffer material raises the bending frequency; mass lowers it. Drag the joints in the drawing to move them.'],
            tex: 'EI=E\\,\\frac{\\pi\\left(D^4-(D-2t)^4\\right)}{64},\\quad m=\\frac{m_s}{l}', range: 'Typical handbook moduli (check your supplier): fibreglass (G10/G12) about 17–20 GPa (2.5–2.9 Msi), filament-wound fibreglass 15–25 GPa, carbon fibre 50–70 GPa (7–10 Msi), aluminium 69 GPa (10 Msi), phenolic about 7 GPa, cardboard tube about 3 GPa.', doc: 'tubes' } },
        { id: 'elems', label: 'Sections: aft station, stiffness and weight per length at the fore and aft ends', kind: 'table', minRows: 1, when: (v) => v.entry === 'ei',
          columns: [{ id: 'x', label: 'Aft station', ...LEN }, { id: 'EIf', label: 'EI fore', ...EI }, { id: 'EIa', label: 'EI aft', ...EI }, { id: 'wf', label: 'Weight/length fore', ...WPL }, { id: 'wa', label: 'Weight/length aft', ...WPL }],
          default: ARIES, validate: check,
          info: { text: ['One row per body section from the nose tip aft: where it ends, and its bending stiffness and weight per length at its two ends (both vary linearly in between).', 'Stiffness $EI$ from a structural analysis or a bending test; for a thin tube $EI\\approx E\\pi R^3t$. A nose cone’s stiffness can start at zero at the tip.', 'Stiffer sections raise the frequencies, heavier ones lower them.'],
            tex: 'EI\\approx E\\pi R^3t', range: 'The example is the Aries sounding rocket (365 in, about 9 m).', doc: 'model' } },
      ],
    },
    {
      id: 'limits', title: 'Your limits',
      fields: [
        { id: 'fx', label: 'Highest excitation frequency', sym: 'f_{exc}', ...HZ, default: 10, min: 0.1, max: 2000, slider: { min: 1, max: 100, step: 0.5 },
          info: { text: ['The fastest something shakes the rocket during flight: the peak roll rate (revolutions per second), the pitch (weathercock) frequency, a control loop’s bandwidth or a motor’s pressure oscillation.', 'Take the roll rate from a flight log or a roll calculation, the pitch frequency from a stability calculation, the bandwidth from your controller.', 'The verdict wants the first bending frequency well above it: a body that rings at the frequency it is shaken at bends more and more.'], range: 'Roll rates of fin-stabilised rockets: a few rev/s (Hz), spin-stabilised up to 10–20; actively controlled rockets: control bandwidth 1–20 Hz. Not a published limit: your choice.', doc: 'verdict', tex: 'f_1\\ge r\\,f_{exc}' } },
        { id: 'sep', label: 'Separation you want', sym: 'r', ...NONE, default: 3, min: 1.5, max: 20, slider: { min: 1.5, max: 10, step: 0.1 },
          info: { text: ['How many times higher than the excitation frequency the first bending frequency must be for SAFE.', 'Your choice, not a published limit: more separation leaves room for errors in the stiffness and mass.', 'Below 1.25 times the excitation (or under it, so the excitation sweeps through it) the verdict is UNSAFE; between that and your separation, MARGINAL.'],
            tex: 'f_1\\ge r\\,f_{exc}', range: 'Common practice keeps structural modes several times above a control bandwidth; 2–5 is a sensible start.', doc: 'verdict' } },
      ],
    },
  ],
  results: [
    { id: 'f1', label: 'First bending frequency', sym: 'f_1', ...HZ, key: true, digits: 4, status: (x, out) => ST[out.level],
      note: (x, out) => `${fmt(out.o.modes[0].omega, { digits: 4 })} rad/s · wanted ${Hz(out.need)} or more`,
      info: { text: ['How many times per second the whole rocket swings in its lowest bending shape: nose and tail one way, the middle the other.', 'The lowest root of the Rayleigh–Ritz equations; it can only come out a little high, never low, with three shapes.', 'Doubling every section’s stiffness raises it by √2 (41 %); doubling the mass lowers it by the same factor.'], tex: 'f_1=\\frac{\\omega_1}{2\\pi},\\ \\det(\\omega^2\\mathbf M-\\mathbf K)=0', doc: 'model' } },
    { id: 'ratio', label: 'Separation from the excitation', sym: 'f_1/f_{exc}', ...NONE, key: true, digits: 3, status: (x, out) => ST[out.level],
      note: (x, out) => `you want ${fmt(out.v.sep, { digits: 3 })} or more · unsafe below ${NEAR}`,
      info: { text: ['How many times the first bending frequency is above the excitation frequency you entered.', 'Near 1 the excitation shakes the body at its natural frequency (resonance) and the bending builds up.', 'Raise it with a stiffer or lighter body, or a lower roll rate or control bandwidth.'], tex: '\\frac{f_1}{f_{exc}}', doc: 'verdict' } },
    { id: 'nodeF', label: 'Forward node of the first mode (from the tip)', sym: 'x_{n1}', ...LEN, key: true, digits: 4, note: (x, out) => (typeof x === 'number' ? `${fmt((100 * x) / out.Lin, { digits: 3 })} % of the length · accelerometer here` : ''),
      info: { text: ['A point where the first bending mode does not move sideways.', 'An accelerometer there feels no first-mode bending, only the rigid-body motion.', 'Moving mass or stiffness shifts the nodes; they sit near 22 % and 78 % of the length on a uniform body.'], doc: 'shapes' } },
    { id: 'nodeA', label: 'Aft node of the first mode (from the tip)', sym: 'x_{n2}', ...LEN, key: true, digits: 4, note: (x, out) => (typeof x === 'number' ? `${fmt((100 * x) / out.Lin, { digits: 3 })} % of the length` : ''),
      info: { text: ['The second point where the first bending mode does not move sideways.', 'Either node suits an accelerometer; the forward one is often in the avionics bay.', 'It sits near 78 % of the length on a uniform body.'], doc: 'shapes' } },
    { id: 'f2', label: 'Second bending frequency', sym: 'f_2', ...HZ, digits: 4, note: (x, out) => `${fmt(out.o.modes[1].omega, { digits: 4 })} rad/s`,
      info: { text: ['The next bending mode, with three nodes.'], tex: 'f_2=\\frac{\\omega_2}{2\\pi}', doc: 'model' } },
    { id: 'f3', label: 'Third bending frequency (rough)', sym: 'f_3', ...HZ, digits: 3, info: { text: ['Third Rayleigh–Ritz frequency; with only three shapes it is a rough estimate.'], tex: 'f_3=\\frac{\\omega_3}{2\\pi}', doc: 'model' } },
    { id: 'need', label: 'First bending frequency you want', sym: 'f_{1,req}', ...HZ, digits: 4, info: { text: ['The lowest first bending frequency your separation asks for.'], tex: 'f_{1,req}=r\\,f_{exc}', doc: 'verdict' } },
    { id: 'slope0', label: 'Zero-slope point of the first mode (from the tip)', sym: 'x_{s}', ...LEN, digits: 4,
      info: { text: ['Where the first mode bends the most but does not tilt: a rate gyro there feels no first-mode bending.'], doc: 'shapes' } },
    { id: 'crit', label: 'Section that bends most (number, nose = 1)', sym: 'i_{c}', ...NONE, digits: 2,
      info: { text: ['The section that holds the largest share of the bending energy of the first mode: stiffening it raises the frequency most.'], tex: 'U_i=\\frac12\\int_{i}EI\\,(y^{\\prime\\prime})^2dx', doc: 'verdict' } },
    { id: 'critShare', label: 'Its share of the bending energy', sym: 'U_i/U', dim: 'percent', digits: 3, info: { text: ['How much of the bending energy of the first mode sits in the weakest section: where stiffening pays most.'], tex: 'U_i/U', doc: 'verdict' } },
    { id: 'tNeed', label: 'Wall of that section for the separation (tubes; — if not needed or not reachable)', sym: 't_{req}', ...LEN, digits: 3,
      info: { text: ['Thinnest wall of the section that bends most that brings the first frequency to the one you want, with the section’s mass kept as entered.'], doc: 'verdict' } },
    { id: 'kCrit', label: 'Stiffness factor on that section alone (— if not needed or above 1000)', sym: 'k_c', ...NONE, digits: 3, info: { text: ['How many times stiffer that section alone must be to reach the frequency you want.'], doc: 'verdict' } },
    { id: 'kAll', label: 'Stiffness factor on every section', sym: 'k', ...NONE, digits: 3, info: { text: ['How many times stiffer the whole body must be (same mass) to reach the frequency you want: the frequency grows with the square root of the stiffness.'], tex: 'k=\\left(\\frac{f_{1,req}}{f_1}\\right)^2', doc: 'verdict' } },
    { id: 'fxMax', label: 'Highest excitation for your separation', sym: 'f_{exc,max}', ...HZ, digits: 4, info: { text: ['The fastest excitation this body can take with your separation.'], tex: 'f_{exc,max}=\\frac{f_1}{r}', doc: 'verdict' } },
    { id: 'f1u', label: 'Uniform beam of the same length, stiffness and mass', sym: 'f_{1,u}', ...HZ, digits: 4,
      info: { text: ['The first frequency of a uniform beam with the body’s length-averaged stiffness and mass: a check on the order of magnitude.'], tex: 'f_{1,u}=\\frac{1}{2\\pi}\\left(\\frac{\\beta_1}{L}\\right)^2\\sqrt{\\frac{\\overline{EI}}{\\overline m}}', doc: 'model' } },
    { id: 'L', label: 'Body length', sym: 'L', ...LEN, digits: 4, info: { text: ['The length of the body, from the sections you entered.'], tex: 'L=\\sum l', doc: 'model' } },
    { id: 'W', label: 'Total mass', sym: 'W', ...MASS, digits: 4, info: { text: ['The total mass of the body, from the sections and point masses.'], doc: 'model' } },
  ],
  compute(v) {
    const tube = v.entry !== 'ei';
    const msg = tube ? checkTubes(v.tubes) : check(v.elems); if (msg) throw new InputError(msg);
    const elems = elemsOf(v), o = bending(elems);
    if (!o.modes.every((m) => Number.isFinite(m.omega) && m.omega > 0)) throw new InputError('The stiffness or weight distribution is too uneven for three uniform-beam shapes; split long sections or check the units.');
    const f = o.modes.map((m) => m.omega / TAU), f1 = f[0], q = o.modes[0].q, Lin = o.L * 12;
    const nd = zeros(shape, q), zs = zeros(slope, q).filter((xi) => xi > (nd[0] ?? 0) && xi < (nd.at(-1) ?? 1));
    const share = strainShare(elems, q), crit = share.indexOf(Math.max(...share));
    const need = v.sep * v.fx, ratio = f1 / v.fx;
    const level = ratio >= v.sep ? 'safe' : ratio >= NEAR ? 'marginal' : 'unsafe';
    const kAll = (need / f1) ** 2;
    // fixes, solved on the real model: the critical section's wall (tubes) or stiffness, the whole body, the excitation
    let tNeed = null, kCrit = null;
    if (f1 < need) {
      kCrit = solve((k) => scaleRow(elems, crit, k), 1, 1000, need);
      if (tube) {
        const r = v.tubes[crit];
        tNeed = solve((t) => tubeElems(v.tubes.map((x, j) => (j === crit ? { ...x, t } : x))), r.t, r.D / 2, need);
      }
    }
    const fixes = [];
    if (level !== 'safe') {
      if (tube && tNeed) fixes.push(`Thicken the wall of section ${crit + 1} (it holds ${fmt(100 * share[crit], { digits: 2 })} % of the bending) from ${L(v.tubes[crit].t)} to at least <b>${L(tNeed)}</b>, mass as entered, or`);
      else if (!tube && kCrit) fixes.push(`Make section ${crit + 1} (${fmt(100 * share[crit], { digits: 2 })} % of the bending) at least <b>${fmt(kCrit, { digits: 3 })}×</b> stiffer, or`);
      const sameE = tube && v.tubes.every((r) => r.E === v.tubes[0].E);
      const E = (x) => `${fmt(toDisplay(x, MOD), { digits: 3 })} ${unitLabel(displayUnit(MOD))}`;
      fixes.push(sameE ? `use a tube material at least <b>${fmt(kAll, { digits: 3 })}×</b> stiffer (modulus ${E(v.tubes[0].E)} → <b>${E(kAll * v.tubes[0].E)}</b>), or` : `make every section at least <b>${fmt(kAll, { digits: 3 })}×</b> stiffer, or`);
      fixes.push(`keep the excitation at or below <b>${Hz(f1 / v.sep)}</b> (now ${Hz(v.fx)}).`);
    }
    const verdict = {
      level,
      title: level === 'safe' ? 'The first bending frequency is well clear of the excitation' : level === 'marginal' ? 'Clear of resonance, but with less separation than you want' : 'The body bends near the excitation frequency: resonance',
      text: `First bending frequency <b>${Hz(f1)}</b>, ${fmt(ratio, { digits: 3 })} × the excitation of ${Hz(v.fx)} (you want ${fmt(v.sep, { digits: 3 })} ×, i.e. ${Hz(need)}).`,
      fixes: fixes.slice(0, 3),
    };
    const warnings = [];
    if (level === 'unsafe') warnings.push({ level: 'err', text: `The first bending frequency (${Hz(f1)}) is ${f1 < v.fx ? 'below' : 'within 25 % of'} the excitation (${Hz(v.fx)}): the body can resonate, with large angles of attack or roll lock-in.`, fix: fixes[0]?.replace(/, or$/, '.') });
    const eis = elems.flatMap((e) => [e.EIf, e.EIa]).filter((x) => x > 0);
    if (Math.max(...eis) / Math.min(...eis) > 100) warnings.push({ level: 'info', text: 'The stiffness changes more than a hundredfold along the body: three uniform-beam shapes describe that bending only roughly, and the frequencies come out high.' });
    if (nd.length !== 2) warnings.push({ level: 'warn', text: `The first mode has ${nd.length} nodes instead of two: the mass or stiffness is too uneven for three uniform-beam shapes.`, fix: 'Check the units and split long, uneven sections.' });
    const results = {
      f1, ratio, nodeF: nd.length ? nd[0] * Lin : '—', nodeA: nd.length > 1 ? nd.at(-1) * Lin : '—', f2: f[1], f3: f[2], need,
      slope0: zs.length ? zs[0] * Lin : '—', crit: crit + 1, critShare: 100 * share[crit],
      tNeed: tNeed ?? '—', kCrit: kCrit ?? '—', kAll, fxMax: f1 / v.fx > 0 ? f1 / v.sep : '—', f1u: o.uniform[0] / TAU, L: Lin, W: o.mass,
    };
    return { results, warnings, verdict, level, need, o, v, elems, nodes: nd, zs, share, crit, Lin };
  },
  plots: [
    {
      id: 'shapes', title: 'Where the body bends, along its length', wide: true, height: 760,
      info: { text: ['The body (top) and, on the same length scale: the first two bending shapes, the bending stiffness and mass per length of each section, and where the first mode stores its bending energy.', 'The dashed lines are the nodes of the first mode. Hover anywhere to read every quantity at that station.', 'Stiffen where the bending energy is largest; that is where it raises the frequency most.'], doc: 'shapes' },
      build(v, out, { U }) {
        const ul = U(LEN), us = U(EI), uw = U(WPL), { o, elems } = out, Lin = out.Lin, q = o.modes[0].q;
        const N = 200, xs = Array.from({ length: N + 1 }, (_, k) => (Lin * k) / N);
        const stepped = (fn) => { const pts = []; let x0 = 0; for (const e of elems) { pts.push([ul.v(x0), fn(e, 0)], [ul.v(e.x), fn(e, 1)]); x0 = e.x; } return pts; };
        const at = (x) => { let x0 = 0; for (const e of elems) { if (x <= e.x) return { e, f: (x - x0) / (e.x - x0 || 1) }; x0 = e.x; } return { e: elems.at(-1), f: 1 }; };
        const dens = xs.map((x) => { const { e, f } = at(x); return (e.EIf + (e.EIa - e.EIf) * f) * curvature(q, x / Lin) ** 2; }), dMax = Math.max(...dens) || 1;
        return {
          x: { label: 'Station from the nose tip $x$', unit: ul.label }, xDomain: [0, ul.v(Lin)],
          vlines: out.nodes.map((n) => ({ x: ul.v(n * Lin), label: 'node', color: 'var(--text-3)' })),
          panels: [
            { y: { label: 'Body' }, yDomain: [-1.25, 1.25], draw: (g, X, Y, box) => drawStrip(g, X, Y, box, out, ul) },
            { y: { label: 'Mode shape' }, series: [
              { name: 'first mode', points: xs.map((x) => [ul.v(x), shape(q, x / Lin) / 2]) },
              { name: 'second mode', dash: '7 4', color: 'var(--series-2)', points: xs.map((x) => [ul.v(x), shape(o.modes[1].q, x / Lin) / 2]) }], hlines: [{ y: 0, color: 'var(--text-3)' }] },
            { y: { label: 'Stiffness $EI$', unit: us.label }, color: 'var(--series-2)', includeZero: true, series: [{ name: '$EI$', points: stepped((e, f) => us.v(f ? e.EIa : e.EIf)) }] },
            { y: { label: 'Mass $m$', unit: uw.label }, color: 'var(--series-5)', includeZero: true, series: [{ name: '$m$', dash: '2 3', points: stepped((e, f) => uw.v(f ? e.wa : e.wf)) }] },
            { y: { label: 'Bending energy' }, color: 'var(--series-4)', includeZero: true, yDomain: [0, 1.05], series: [{ name: 'first mode', dash: '9 3 2 3', points: xs.map((x, i) => [ul.v(x), dens[i] / dMax]) }] },
          ],
        };
      },
    },
    {
      id: 'stiffen', title: 'First bending frequency against stiffening', wide: true,
      info: { text: ['The first bending frequency if you stiffen only the section that bends most (solid), or every section (dashed), by the factor on the bottom axis; 1 is your design.', 'The red lines are the frequency you want and the excitation.', 'Stiffening one section helps less and less: the rest of the body then does the bending. Where the solid line flattens below the red line, stiffen more than one section.'], doc: 'verdict' },
      build(v, out) {
        const { elems, crit, need } = out, f1 = out.results.f1, kc = typeof out.results.kCrit === 'number' ? out.results.kCrit : null;
        const top = Math.max(4, Math.min(40, kc ? 1.4 * kc : out.results.kAll * 1.4 || 4));
        const ks = Array.from({ length: 41 }, (_, i) => 0.25 * (top / 0.25) ** (i / 40));
        const col = COL[out.level];
        return {
          x: { label: 'Stiffness factor $k$ (1 = your design)' }, y: { label: 'First bending frequency $f_1$', unit: 'Hz' },
          series: [
            { name: `section ${crit + 1} only`, smooth: true, points: ks.map((k) => [k, f1Of(scaleRow(elems, crit, k))]) },
            { name: 'every section', dash: '7 4', color: 'var(--text-3)', smooth: true, points: ks.map((k) => [k, f1 * Math.sqrt(k)]) },
          ],
          hlines: [{ y: need, label: 'frequency you want', color: 'var(--danger)' }, { y: v.fx, label: 'excitation', color: 'var(--danger)' }],
          markers: [{ x: 1, y: f1, label: 'your design', color: col }], includeZero: true,
        };
      },
    },
  ],
  schematicTitle: 'Body, its first bending mode and its frequencies',
  schematicHint: 'The body to scale with its sections, the first bending shape drawn over it (exaggerated), its nodes and zero-slope point, the section that bends most, and the frequencies against your excitation',
  schematic(ctx, v, out) {
    const W = 760, H = 330, { o, elems } = out, Lin = out.Lin, tube = v.entry !== 'ei', field = tube ? 'tubes' : 'elems';
    const fr = ctx.frame({ width: W, height: H, label: 'Body sections, first bending mode and frequencies' });
    const g = fr.layer('main'); g.replaceChildren();
    const x0 = 40, span = 640, k = span / Lin, X = (x) => x0 + x * k, cy = 175, col = COL[out.level];
    // half heights: true radius in tube mode (to scale, capped at 42 px), else ∝ weight per length
    const wMax = Math.max(...elems.flatMap((e) => [e.wf, e.wa])), eiMax = Math.max(...elems.flatMap((e) => [e.EIf, e.EIa]));
    const rMax = tube ? Math.max(...v.tubes.map((r) => r.D / 2)) : 0, kr = tube ? Math.min(k, 42 / rMax) : 0;
    const hh = (i, end) => (tube ? (v.tubes[i].D / 2) * kr : 6 + 30 * ((end ? elems[i].wa : elems[i].wf) / wMax));
    const hMax = Math.max(...elems.map((_, i) => Math.max(hh(i, 0), hh(i, 1))));
    let xa = 0;
    elems.forEach((e, i) => {
      const shade = 0.12 + 0.55 * (((e.EIf + e.EIa) / 2) / eiMax), crit = i === out.crit;
      g.append(s('path', { d: path([[X(xa), cy - hh(i, 0)], [X(e.x), cy - hh(i, 1)], [X(e.x), cy + hh(i, 1)], [X(xa), cy + hh(i, 0)]], true), fill: 'var(--text)', 'fill-opacity': shade.toFixed(2), stroke: crit ? col : 'var(--schem-stroke)', 'stroke-width': crit ? 2.4 : 1.2, 'data-field': field }));
      xa = e.x;
    });
    // the section that bends most, named above the body
    const cx0 = out.crit ? elems[out.crit - 1].x : 0, cx1 = elems[out.crit].x;
    g.append(text((X(cx0) + X(cx1)) / 2, cy - hMax - 34, `section ${out.crit + 1} bends most (${fmt(100 * out.share[out.crit], { digits: 2 })} %)`, { anchor: 'middle', size: 11 }));
    // first mode, exaggerated: deformed centreline and outline
    const A = 26, dy = (xi) => (A * shape(o.modes[0].q, xi)) / 2, pts = Array.from({ length: 121 }, (_, i) => i / 120);
    g.append(s('line', { x1: X(0) - 10, x2: X(Lin) + 10, y1: cy, y2: cy, class: 'sc-thin', 'stroke-dasharray': '10 4 2 4' }));
    g.append(s('path', { d: path(pts.map((xi) => [X(xi * Lin), cy - dy(xi)])), fill: 'none', stroke: col, 'stroke-width': 2.4 }));
    for (const sg of [1, -1]) {
      const edge = pts.map((xi) => { const x = xi * Lin, i = Math.max(0, elems.findIndex((e) => x <= e.x)), x0e = i ? elems[i - 1].x : 0, f = (x - x0e) / (elems[i].x - x0e || 1); return [X(x), cy - dy(xi) - sg * (hh(i, 0) + (hh(i, 1) - hh(i, 0)) * f)]; });
      g.append(s('path', { d: path(edge), fill: 'none', stroke: col, 'stroke-width': 1, 'stroke-dasharray': '4 3', opacity: 0.8 }));
    }
    // nodes (accelerometers) and the zero-slope point (rate gyros), labelled under the body
    const yLab = cy + hMax + 22;
    for (const n of out.nodes) {
      g.append(s('circle', { cx: X(n * Lin), cy, r: 5, fill: 'var(--surface)', stroke: col, 'stroke-width': 2 }));
      g.append(s('line', { x1: X(n * Lin), x2: X(n * Lin), y1: cy + 6, y2: yLab - 11, class: 'sc-thin' }));
      g.append(text(X(n * Lin), yLab, `node ${L(n * Lin)}`, { anchor: 'middle', size: 10.5 }));
    }
    for (const z of out.zs) {
      const zx = X(z * Lin), zy = cy - dy(z);
      g.append(s('path', { d: path([[zx, zy - 6], [zx + 6, zy], [zx, zy + 6], [zx - 6, zy]], true), fill: 'var(--surface)', stroke: col, 'stroke-width': 2 }));
      g.append(text(zx, yLab, 'zero slope', { anchor: 'middle', size: 10.5 }));
    }
    // section lengths on one baseline, then the overall length
    const yDim = yLab + 26;
    xa = 0;
    elems.forEach((e, i) => { g.append(dim(fr, X(xa), yDim, X(e.x), yDim, X(e.x) - X(xa) > 90 ? `${i + 1}: ${L(e.x - xa)}` : `${i + 1}`, { field })); xa = e.x; });
    g.append(dim(fr, X(0), yDim + 26, X(Lin), yDim + 26, `L = ${L(Lin)}`));
    if (tube) { const r = v.tubes[elems.length - 1], xe = X(Lin) + 12; g.append(dim(fr, xe, cy - (r.D / 2) * kr, xe, cy + (r.D / 2) * kr, `${L(r.D)}`, { field })); }
    // frequency strip (log scale): excitation, the band to keep clear and the three frequencies
    const f = o.modes.map((m) => m.omega / TAU), lo = Math.min(v.fx, f[0]) / 2, hi = Math.max(f[2], out.need) * 1.6;
    const F = (x) => x0 + (span * Math.log(x / lo)) / Math.log(hi / lo), yS = 46;
    g.append(s('rect', { x: F(lo), y: yS - 9, width: F(out.need) - F(lo), height: 18, fill: 'var(--danger)', 'fill-opacity': 0.08, 'data-field': 'sep' }));
    g.append(s('rect', { x: F(lo), y: yS - 9, width: F(Math.max(lo, NEAR * v.fx)) - F(lo), height: 18, fill: 'var(--danger)', 'fill-opacity': 0.16, 'data-field': 'fx' }));
    g.append(s('line', { x1: x0, x2: x0 + span, y1: yS, y2: yS, class: 'sc-thin' }));
    g.append(s('line', { x1: F(v.fx), x2: F(v.fx), y1: yS - 12, y2: yS + 12, stroke: 'var(--danger)', 'stroke-width': 2, 'data-field': 'fx' }));
    g.append(text(F(v.fx), yS + 24, `f_{exc} ${Hz(v.fx)}`, { anchor: 'middle', size: 10.5, field: 'fx' }));
    g.append(s('line', { x1: F(out.need), x2: F(out.need), y1: yS - 9, y2: yS + 9, stroke: 'var(--danger)', 'stroke-dasharray': '3 2', 'data-field': 'sep' }));
    if (F(out.need) - F(v.fx) > 70) g.append(text(F(out.need), yS + 24, `wanted ${Hz(out.need)}`, { anchor: 'middle', size: 10.5, field: 'sep' }));
    f.forEach((fi, i) => {
      g.append(s('circle', { cx: F(fi), cy: yS, r: 4.5, fill: i ? 'var(--surface)' : col, stroke: i ? 'var(--text-2)' : col, 'stroke-width': 2 }));
      g.append(text(F(fi), yS - 15, `f_${i + 1} ${Hz(fi)}`, { anchor: 'middle', size: 10.5 }));
    });
    g.append(text(x0, 14, 'frequency (log scale): shaded = closer to the excitation than you want', { size: 10, cls: 'sc-dim-text' }));
    // joints: drag to move them (the body length stays the same)
    for (let i = 0; i < elems.length - 1; i++) {
      const xs = elems[i].x, lo2 = i ? elems[i - 1].x : 0, hi2 = elems[i + 1].x, clamp = (x) => Math.min(hi2 - 0.02 * (hi2 - lo2), Math.max(lo2 + 0.02 * (hi2 - lo2), x));
      const move = (x) => {
        x = clamp(x);
        if (tube) { const d = x - xs; ctx.setCell('tubes', i, 'len', v.tubes[i].len + d); ctx.setCell('tubes', i + 1, 'len', v.tubes[i + 1].len - d); } else ctx.setCell('elems', i, 'x', x);
      };
      ctx.handle(`joint${i}`, X(xs), cy - hMax - 12, { field, title: `Drag to move the joint between sections ${i + 1} and ${i + 2}`, onDrag: (px) => move((px - x0) / k), onKey: (dx) => move(xs + 0.01 * Lin * dx) });
    }
    g.append(text(20, H - 8, tube ? 'to scale (diameter capped to fit); shade ∝ stiffness; bending shape exaggerated' : 'lengths to scale; height ∝ weight per length; shade ∝ stiffness; bending shape exaggerated', { size: 10, cls: 'sc-dim-text' }));
  },
  symbols: {
    EI: 'bending stiffness (N·m² or lbf·in²)', '\\overline{EI}': 'length-averaged bending stiffness (N·m² or lbf·in²)', m: 'mass per unit length (kg/m or lb/in)', '\\overline m': 'length-averaged mass per length (kg/m or lb/in)',
    L: 'body length (m or in)', x: 'station from the nose tip (m or in)', '\\xi': 'fraction of the length', '\\psi_j': 'uniform free-free mode $j$', '\\beta_j': 'eigenvalue of uniform mode $j$', '\\beta_1': 'first uniform-beam eigenvalue 4.730',
    B_j: 'mode coefficient of uniform mode $j$', '\\mathbf K': 'Rayleigh–Ritz stiffness matrix', '\\mathbf M': 'Rayleigh–Ritz mass matrix', K_ij: 'stiffness matrix element', M_ij: 'mass matrix element',
    '\\omega': 'natural circular frequency (rad/s)', '\\omega_1': 'first natural circular frequency (rad/s)', '\\omega_2': 'second natural circular frequency (rad/s)', '\\omega_3': 'third natural circular frequency (rad/s)',
    f: 'natural frequency (Hz)', f_1: 'first bending frequency (Hz)', f_2: 'second bending frequency (Hz)', f_3: 'third bending frequency (Hz)', q_j: 'amplitude of uniform mode $j$',
    E: 'Young’s modulus of the tube (GPa or psi)', D: 'outer diameter (mm or in)', t: 'wall thickness (mm or in)', R: 'tube radius (mm or in)', m_s: 'section mass with contents (kg or lb)', l: 'section length (mm or in)',
    'f_{exc}': 'highest excitation frequency (Hz)', r: 'separation you want', 'f_{1,req}': 'first bending frequency you want (Hz)', 'f_{exc,max}': 'highest excitation for your separation (Hz)', 'f_{1,u}': 'first frequency of the uniform beam (Hz)',
    k: 'stiffness factor on every section', U_i: 'bending energy of section $i$', U: 'bending energy of the body', y: 'lateral bending displacement',
    'x_{n1}': 'forward node of the first mode (mm or in)',
    'x_{n2}': 'aft node of the first mode (mm or in)',
    'x_{s}': 'station of the largest bending slope (mm or in)',
    'i_{c}': 'the weakest section',
    't_{req}': 'wall thickness needed (mm or in)',
    k_c: 'stiffening factor needed',
    W: 'total mass (kg or lb)',
    'U_i/U': 'share of the bending energy in the weakest section',
    '\\det': 'determinant',
  },
  report(v, out, R) {
    const o = out.o, n = R.n;
    const steps = [
      ...(v.entry !== 'ei' ? [{ label: 'Bending stiffness and mass per length of each tube section', eq: 'EI=E\\,\\frac{\\pi\\left(D^4-(D-2t)^4\\right)}{64},\\quad m=\\frac{m_s}{l}' }] : []),
      { label: 'Uniform free-free beam modes used as shapes ($\\beta_j=4.7300,\\ 7.8532,\\ 10.9956$)', eq: '\\psi_j(\\xi)=B_j(\\sinh\\beta_j\\xi+\\sin\\beta_j\\xi)+\\cosh\\beta_j\\xi+\\cos\\beta_j\\xi,\\ B_j=\\frac{\\cos\\beta_j-\\cosh\\beta_j}{\\sinh\\beta_j-\\sin\\beta_j}' },
      { label: 'Stiffness and mass matrices, integrated over the sections (Simpson’s rule)', eq: 'K_{ij}=\\int_0^L EI\\,\\psi_i^{\\prime\\prime}\\psi_j^{\\prime\\prime}\\,dx,\\quad M_{ij}=\\int_0^L m\\,\\psi_i\\psi_j\\,dx' },
      { label: 'Natural frequencies from the eigenvalues', eq: '\\det\\left(\\omega^2\\mathbf M-\\mathbf K\\right)=0' },
      ...o.modes.map((m, i) => ({ lhs: `f_${i + 1}`, eq: '\\frac{\\omega}{2\\pi}', sub: `\\frac{${n(m.omega)}}{2\\pi}`, res: `${n(m.omega / TAU)}\\,\\mathrm{Hz}` })),
      { label: 'Frequency you want (your limit, not a published one)', lhs: 'f_{1,req}', eq: 'r\\,f_{exc}', sub: `${n(v.sep)}\\times${n(v.fx)}`, res: `${n(out.need)}\\,\\mathrm{Hz}` },
    ];
    return [{
      title: 'Theory',
      text: 'The body is a free-free beam whose lateral displacement is approximated by the first three bending modes of a uniform beam of the same length, $y=\\sum q_j\\psi_j(x/L)$. Lagrange’s equations with the kinetic and strain energies give $\\mathbf M\\ddot{\\mathbf q}+\\mathbf K\\mathbf q=0$; its eigenvalues are the natural frequencies and its eigenvectors the mode shapes (Hoult). The first frequency is compared with the excitation frequency you entered.',
      steps,
    }];
  },
  limits: [
    'Free-free, non-rolling beam bending in one plane; three uniform-beam shapes (Rayleigh–Ritz): the first frequency is accurate, the third rough, and with three shapes the frequencies can only come out high.',
    'Tube sections are uniform: a nose cone is treated as a tube of its base diameter with its mass spread evenly; a motor case inside a tube does not add stiffness. Joints and couplers are taken as rigid — a loose joint lowers the real frequency.',
    'The verdict bands (1.25× and your separation) are a project choice, not a published limit.',
  ],
  references: ['longitudinal-body-bending-dynamics'],
  examples: [
    { name: '98 mm fibreglass rocket (3 sections, 2.35 m)', values: { entry: 'tube', tubes: HPR98, fx: 10, sep: 3 } },
    { name: '54 mm minimum-diameter rocket (2.25 m)', values: { entry: 'tube', tubes: MIN54, fx: 10, sep: 3 } },
    { name: 'Aries sounding rocket (5 sections, 365 in)', values: { entry: 'ei', elems: ARIES, fx: 10, sep: 3 } },
  ],
};

/** The body drawn on the panel chart's length scale: sections (height ∝ diameter or weight per length), the
 *  first mode over it and its nodes. Heights are not to scale (the panel's y axis is not a length). */
function drawStrip(g, X, Y, box, out, ul) {
  const { o, elems, v } = out, Lin = out.Lin, tube = v.entry !== 'ei', col = COL[out.level];
  const size = tube ? v.tubes.map((r) => [r.D, r.D]) : elems.map((e) => [e.wf, e.wa]), mx = Math.max(...size.flat()) || 1;
  let xa = 0;
  elems.forEach((e, i) => {
    const a = 0.25 + 0.5 * (size[i][0] / mx), b = 0.25 + 0.5 * (size[i][1] / mx);
    g.append(s('path', { d: path([[X(ul.v(xa)), Y(a)], [X(ul.v(e.x)), Y(b)], [X(ul.v(e.x)), Y(-b)], [X(ul.v(xa)), Y(-a)]], true), fill: 'var(--text)', 'fill-opacity': i === out.crit ? 0.3 : 0.12, stroke: i === out.crit ? col : 'var(--schem-stroke)' }));
    xa = e.x;
  });
  const pts = Array.from({ length: 121 }, (_, i) => [X(ul.v((Lin * i) / 120)), Y(0.45 * shape(o.modes[0].q, i / 120))]);
  g.append(s('path', { d: path(pts), fill: 'none', stroke: col, 'stroke-width': 2 }));
  for (const n of out.nodes) g.append(s('circle', { cx: X(ul.v(n * Lin)), cy: Y(0), r: 4, fill: 'var(--surface)', stroke: col, 'stroke-width': 2 }));
}
