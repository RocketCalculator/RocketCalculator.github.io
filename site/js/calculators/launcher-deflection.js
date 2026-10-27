// Launcher Rail Deflection — UI definition.
import { launcher, lateralLoads, tipSlope, maxLength } from '../calc/launcher.js';
import { s, fmt, InputError } from '../util.js';
import { dim, text, path } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const LEN = { dim: 'length', internal: 'in' };
const RAIL = { dim: 'distance', internal: 'in' };
const FORCE = { dim: 'force', internal: 'lbf' };
const MASS = { dim: 'mass', internal: 'lbm' };
const MOD = { dim: 'modulus', internal: 'psi' };
const AI = { dim: 'areaInertia', internal: 'in4' };
const MOM = { dim: 'moment', internal: 'lbfin' };
const RAD = Math.PI / 180;
const SECTION = 120;   // ham-radio tower sections come in 10 ft lengths (Hoult memo, CSULB paper)
// verdict bands (DECISIONS D34): tip slope against the allowed slope; up to 1.25× is marginal
const MARGIN = 1.25;
const ST = { safe: 'ok', marginal: 'warn', unsafe: 'err' };
const COL = { safe: 'var(--ok)', marginal: 'var(--warn)', unsafe: 'var(--danger)' };
const tower = (v) => v.section === 'tower', custom = (v) => v.section === 'custom';
const deg = (x, d = 3) => `${fmt(x, { digits: d })}°`;
const show = (x, spec, d = 3) => `${fmt(toDisplay(x, spec), { digits: d })} ${unitLabel(displayUnit(spec))}`;
const level = (r) => (r <= 1 ? 'safe' : r <= MARGIN ? 'marginal' : 'unsafe');

const inputs = (v) => ({ W: v.W, T: v.T, sigmaDeg: v.sigma, k: v.k, QE: v.QE, L: v.L, E: v.E, section: v.section, D: v.D, t: v.t, d: v.d, I: v.I, factor: v.factor, allowDeg: v.allow });

export default {
  slug: 'launcher-deflection',
  topic: 'new-launcher',
  title: 'Launcher Rail Deflection',
  subtitle: 'How much a <b>launcher rail bends</b> as the rocket rides up it, whether the tip-off error stays within your limit, and the longest rail that does.',
  verdict: true,
  tiers: true,
  intro: {
    what: 'Treats the launcher rail and its supporting truss as a beam fixed at its base and loaded by the rocket’s weight and thrust misalignment just before it leaves. It gives the tip slope — the change in launch angle — and the longest rail that keeps it within your limit.',
    why: 'The rail tip slope adds straight onto the launch elevation and azimuth. A floppy rail undoes the care spent on wind compensation and spreads the landing points.',
    when: 'Designing or buying a launcher, choosing a rail length, or checking whether a heavier rocket can use an existing launcher.',
  },
  info: {
    text: [
      'Just before the rocket leaves the rail, its weight across the rail (and any thrust misalignment) pushes on the rail tip, so the bending is greatest then.',
      'The rail and its truss bend like a diving board fixed at the base. The tip slope $FL^2/2EI$ is doubled because the load comes on about as fast as the rail can spring back (dynamic overshoot).',
      'The weight component, which never changes, is usually far larger than the thrust misalignment, so steep launches bend the rail much less.',
    ],
    tex: '\\theta_{tip}=k_d\\frac{FL^2}{2EI},\\qquad F=W\\cos QE+n_\\sigma T\\sigma_\\delta',
    steps: ['Enter the rocket weight, thrust and thrust misalignment.', 'Enter the elevation and rail length, then the tower (or the second moment of area of your support).', 'Set the tip slope you accept (0.1° unless you have your own requirement).', 'Read the verdict and the fixes: the longest rail, or how much stiffer the tower must be.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'rocket', title: 'Rocket',
      fields: [
        { id: 'W', label: 'Rocket weight at launch', sym: 'W', ...MASS, default: 55, min: 0, minExclusive: true, max: 2000, slider: { min: 1, max: 300, step: 1 },
          info: { text: ['How heavy the rocket is on the pad, with its motor loaded: the load the launch lugs carry.', 'Weigh the loaded rocket, or take the lift-off mass from your simulation.', 'The rail tip slope grows in proportion to the weight across the rail: double the weight, nearly double the slope.'],
            tex: 'F=W\\cos QE+n_\\sigma T\\sigma_\\delta', range: 'High-power rockets 5–25 kg (10–55 lb); university sounding rockets 25–70 kg (55–150 lb).', doc: 'loads' } },
        { id: 'T', label: 'Thrust', sym: 'T', ...FORCE, default: 400, min: 0, max: 20000, slider: { min: 0, max: 3000, step: 10 },
          info: { text: ['How hard the motor pushes while the rocket is still on the rail.', 'Take the average thrust over the first second from the motor’s thrust curve.', 'Only the small sideways part of the thrust (from misalignment) bends the rail, so thrust matters far less than weight.'],
            tex: 'F_{yaw}=n_\\sigma T\\sigma_\\delta', range: '1–2 kN (200–450 lbf) for an M motor; Gold Rush II: 400 lbf.', doc: 'loads' } },
        { id: 'sigma', label: 'Thrust misalignment (1σ)', sym: '\\sigma_\\delta', dim: 'angle', default: 0.1, min: 0, max: 5, slider: { min: 0, max: 0.5, step: 0.01 },
          info: { text: ['How far the thrust line typically points away from the rocket’s axis: the standard deviation (σ, the typical scatter) of that small angle.', 'Use a standard value: Ammons and Hoult’s standardised perturbations give about 0.1° for well-made solid motors.', 'It adds a sideways push on the rail in both pitch and yaw; it is the only load in yaw.'],
            tex: 'F_{yaw}=n_\\sigma T\\sigma_\\delta', range: 'About 0.1° for well-made solid motors.', doc: 'loads' } },
        { id: 'k', label: 'Standard deviations to cover', sym: 'n_\\sigma', dim: 'none', default: 3, min: 0, max: 6, slider: { min: 0, max: 4, step: 0.5 },
          info: { text: ['How unlucky a motor you design for, counted in standard deviations of misalignment.', '3 covers 99.7 % of motors, the usual worst case; 0 ignores misalignment.', 'Raising it raises the misalignment load in proportion.'],
            tex: 'F_{yaw}=n_\\sigma T\\sigma_\\delta', range: '3 (worst case of 99.7 % of motors).', doc: 'loads' } },
      ],
    },
    {
      id: 'rail', title: 'Launcher',
      fields: [
        { id: 'QE', label: 'Quadrant elevation', sym: 'QE', dim: 'angle', default: 80, min: 0, max: 90, slider: { min: 60, max: 90, step: 0.5 },
          info: { text: ['How steeply the rail points up: the angle between the rail and the ground (90° is vertical).', 'Set by the wind compensation on the day; 80–88° is usual for sounding rockets.', 'The weight across the rail falls as cos QE: from 80° to 85° it halves, and so does the bending. Drag the arc handle in the drawing to change it.'],
            tex: 'F=W\\cos QE+n_\\sigma T\\sigma_\\delta', range: '80–88° for sounding rockets; the CSULB launcher requirement was set at 80°.', doc: 'loads' } },
        { id: 'L', label: 'Rail length', sym: 'L', ...RAIL, default: 240, min: 0, minExclusive: true, max: 1200, slider: { min: 60, max: 600, step: 6 },
          info: { text: ['Length of the rail and its truss from the pivot at the base to the tip.', 'Measure from the elevation hinge to the end of the rail.', 'The tip slope grows with the square of the length: a rail 40 % longer bends twice as much. Drag the rail tip in the drawing to change it.'],
            tex: '\\theta_{tip}=k_d\\frac{FL^2}{2EI}', range: 'Ham-radio tower sections come in 10 ft (3.05 m) lengths; 20 ft (6.1 m, two sections) is common.', doc: 'beam' } },
        { id: 'section', label: 'Support structure', kind: 'select', default: 'tower', options: [{ value: 'tower', label: 'Three-tube tower' }, { value: 'custom', label: 'Enter I directly' }],
          info: { text: ['What carries the rail: a ham-radio tower (three steel tubes on a triangle, joined by welded zig-zag rods), or any other beam.', 'For a tower, measure the face width and the tubes. For anything else, look up or work out its second moment of area.', 'The zig-zag rods add little stiffness, so the tubes carry the bending.'], doc: 'section' } },
        { id: 'd', label: 'Tower face width', sym: 'd', ...LEN, default: 12.5, min: 0, minExclusive: true, max: 60, slider: { min: 4, max: 36, step: 0.25 }, when: tower,
          info: { text: ['Distance between the centres of two tubes along one face of the triangle.', 'Measure centre to centre (or outside to outside minus one tube diameter).', 'The stiffness grows with its square: a tower 40 % wider bends half as much. Drag the tube in the cross-section to change it.'],
            tex: 'I=\\frac{\\pi Dt\\,d^2}{2}', range: 'Typical ham tower: 12.5 in (318 mm).', doc: 'section' } },
        { id: 'D', label: 'Tube outside diameter', sym: 'D', ...LEN, default: 1.25, min: 0, minExclusive: true, max: 6, slider: { min: 0.5, max: 3, step: 0.05 }, when: tower,
          info: { text: ['Outside diameter of each of the three corner tubes.', 'Measure with callipers.', 'Each tube’s area, and so the stiffness, grows in proportion to it.'], tex: 'A=\\pi Dt', range: 'Typical ham tower: 1.25 in (31.8 mm).', doc: 'section' } },
        { id: 't', label: 'Tube wall thickness', sym: 't', ...LEN, default: 0.065, min: 0, minExclusive: true, max: 0.5, slider: { min: 0.02, max: 0.25, step: 0.005 }, when: tower,
          info: { text: ['Wall thickness of the corner tubes.', 'Measure at a cut end, or read it from the tower’s data sheet.', 'The stiffness grows in proportion: double the wall, half the bending.'], tex: 'A=\\pi Dt', range: 'Typical ham tower: 0.065 in (1.65 mm).', doc: 'section' } },
        { id: 'I', label: 'Second moment of area', sym: 'I', ...AI, default: 20, min: 0, minExclusive: true, max: 1e5, slider: { min: 1, max: 500, step: 0.5 }, when: custom,
          info: { text: ['How well the cross-section of the rail and its support resists bending (it grows with the square of the distance of material from the centre).', 'Take it from the extrusion’s data sheet, or add up the parts with the parallel-axis rule.', 'The tip slope falls in proportion: double I, half the slope.'], tex: '\\theta_{tip}=k_d\\frac{FL^2}{2EI}', range: 'The typical ham tower (12.5 in face, 1.25 × 0.065 in tubes): about 20 in⁴ (830 cm⁴).', doc: 'section' } },
        { id: 'E', label: 'Young’s modulus', sym: 'E', ...MOD, default: 29e6, min: 0, minExclusive: true, max: 6e7, slider: { min: 1e6, max: 3.5e7, step: 1e5 },
          info: { text: ['How stiff the material of the support is (how hard it is to stretch).', 'Look it up for the material: steel about 29 Mpsi (200 GPa), aluminium about 10 Mpsi (69 GPa).', 'The tip slope falls in proportion: an aluminium tower bends about three times as much as the same steel one.'], tex: '\\theta_{tip}=k_d\\frac{FL^2}{2EI}', range: 'Steel 29 Mpsi (200 GPa); aluminium 10 Mpsi (69 GPa).', doc: 'beam' } },
      ],
    },
    {
      id: 'req', title: 'Your limit',
      fields: [
        { id: 'allow', label: 'Allowed tip slope', sym: '\\theta_{max}', dim: 'angle', default: 0.1, min: 0, minExclusive: true, max: 5, slider: { min: 0.01, max: 0.5, step: 0.01 },
          info: { text: ['The largest change of launch angle you accept from the rail bending.', 'Hoult chose 0.1° as the upper bound; the CSULB launcher was specified to 0.05° at QE 80°. Compare it with how accurately you can set the rail (±0.5° for CSULB).', 'The verdict compares the tip slope with it (up to 1.25× is marginal), and the fixes are solved to reach it.'],
            tex: 'L_{max}=\\sqrt{\\frac{2EI\\,\\theta_{max}}{k_dF}}', range: '0.1° (Hoult); 0.05° (CSULB launcher requirement).', doc: 'verdict' } },
      ],
    },
    {
      id: 'model', title: 'Model settings (advanced)',
      fields: [
        { id: 'factor', label: 'Dynamic overshoot factor', sym: 'k_d', dim: 'none', default: 2, min: 1, max: 3, slider: { min: 1, max: 3, step: 0.1 },
          info: { text: ['How much further the rail swings than it would under a slowly applied load.', 'The rocket runs up the rail in about the rail’s own bending period, so the load is effectively sudden: the classic factor for a sudden load is 2, as in Hoult’s memo.', 'The slope is in proportion to it; 1 gives the static slope.'], tex: '\\theta_{tip}=k_d\\frac{FL^2}{2EI}', range: '2 (sudden load); 1 = static.', doc: 'beam' } },
      ],
    },
  ],
  results: [
    { id: 'pitchDeg', label: 'Tip slope in pitch', sym: '\\theta_{pitch}', dim: 'angle', key: true, digits: 4, status: (x, out) => ST[out.lv],
      note: (x, out, v) => `${fmt(x / v.allow, { digits: 3 })} × your ${deg(v.allow)}`,
      info: { text: ['How far the rail tip tilts downwards as the rocket leaves: the error it adds to the launch elevation.', 'Compare it with your allowed slope. The rocket leaves along the bent tip, so this is the error, not the sideways movement of the tip.', 'It grows with the weight across the rail and the square of the rail length, and falls with the stiffness.'], tex: '\\theta_{pitch}=k_d\\frac{FL^2}{2EI}', range: 'Under 0.1° is good practice.', doc: 'beam' } },
    { id: 'Lmax', label: 'Longest acceptable rail', sym: 'L_{max}', ...RAIL, key: true, digits: 4, status: (x, out) => ST[out.lv],
      note: (x, out, v) => (typeof x === 'number' ? `your rail uses ${fmt((v.L / x) * 100, { digits: 3 })} %` : 'nothing bends the rail'),
      info: { text: ['The longest rail on this support whose tip slope just equals your allowed slope.', 'Any shorter rail meets your limit. For a tower, round down to whole 10 ft sections.', 'It grows with the square root of the stiffness: a tower twice as stiff allows a rail 41 % longer.'], tex: 'L_{max}=\\sqrt{\\frac{2EI\\,\\theta_{max}}{k_dF}}', doc: 'beam' } },
    { id: 'Fp', label: 'Lateral load in pitch', sym: 'F', ...FORCE, key: true, digits: 4, note: (x, out) => (x > 0 ? `weight ${fmt((out.o.F.weight / x) * 100, { digits: 3 })} %` : 'none'),
      info: { text: ['The sideways push of the rocket on the rail tip, in the vertical plane, just before it leaves.', 'It is the weight component across the rail plus the worst-case thrust misalignment push.', 'The weight part usually dominates; launching steeper shrinks it.'], tex: 'F=W\\cos QE+n_\\sigma T\\sigma_\\delta', doc: 'loads' } },
    { id: 'yawDeg', label: 'Tip slope in yaw', sym: '\\theta_{yaw}', dim: 'angle', key: true, digits: 4, status: (x, out, v) => ST[level(x / v.allow)], note: () => 'thrust misalignment only',
      info: { text: ['How far the rail tip turns sideways as the rocket leaves: an error in launch azimuth.', 'Only the thrust misalignment pushes sideways; the tower is as stiff sideways as up and down.', 'It is usually several times smaller than the pitch slope.'], tex: '\\theta_{yaw}=k_d\\frac{n_\\sigma T\\sigma_\\delta L^2}{2EI}', doc: 'beam' } },
    { id: 'totalDeg', label: 'Combined tip-off error (pitch and yaw)', sym: '\\theta_{tot}', dim: 'angle', digits: 4, info: { text: ['Pitch and yaw slopes added at right angles: the total change in launch direction.'], tex: '\\theta_{tot}=\\sqrt{\\theta_{pitch}^2+\\theta_{yaw}^2}', doc: 'beam' } },
    { id: 'tip', label: 'Tip deflection in pitch', sym: 'y_{tip}', ...LEN, digits: 4, info: { text: ['How far the rail tip moves sideways (downhill) as the rocket leaves, with the overshoot.'], tex: 'y_{tip}=k_d\\frac{FL^3}{3EI}', doc: 'beam' } },
    { id: 'Wmax', label: 'Heaviest rocket for this rail', sym: 'W_{max}', ...MASS, digits: 4, info: { text: ['The heaviest rocket (same thrust and misalignment) whose tip slope just equals your allowed slope on this rail. “—” when the misalignment alone exceeds it or the rail is vertical.'], tex: 'W_{max}=\\frac{2EI\\theta_{max}/(k_dL^2)-n_\\sigma T\\sigma_\\delta}{\\cos QE}', doc: 'verdict' } },
    { id: 'Ireq', label: 'Second moment of area needed', sym: 'I_{req}', ...AI, digits: 4, info: { text: ['The stiffness of section (with the same material) at which this rail just meets your allowed slope.'], tex: 'I_{req}=k_d\\frac{FL^2}{2E\\theta_{max}}', doc: 'verdict' } },
    { id: 'Mbase', label: 'Bending moment at the base (static)', sym: 'M_0', ...MOM, digits: 4, info: { text: ['The bending moment the tip load puts on the rail at its pivot, before the overshoot: what the base fittings must hold.'], tex: 'M_0=FL', doc: 'beam' } },
    { id: 'Fw', label: 'Weight component across the rail', sym: 'W\\cos QE', ...FORCE, digits: 4, info: { text: ['The part of the rocket’s weight that presses across the rail when it is tilted: zero for a vertical rail.'], tex: 'F_w=W\\cos QE', doc: 'loads' } },
    { id: 'Ft', label: 'Thrust misalignment load', sym: 'n_\\sigma T\\sigma_\\delta', ...FORCE, digits: 4, info: { text: ['The sideways push of a misaligned thrust, at the number of standard deviations you cover.'], tex: 'F_t=n_\\sigma T\\sigma_\\delta', doc: 'loads' } },
    { id: 'I', label: 'Second moment of area', sym: 'I', ...AI, digits: 4, info: { text: ['How much the tower section resists bending: three tubes at the corners of the face, far from the centre.'], tex: 'I=\\frac{\\pi Dt\\,d^2}{2}', doc: 'section' } },
    { id: 'EI', label: 'Bending stiffness', sym: 'EI', dim: 'stiffness', internal: 'lbfin2', digits: 4, info: { text: ['Bending stiffness of the rail support: Young’s modulus times the second moment of area.'], tex: 'EI=E\\,I', doc: 'beam' } },
  ],
  compute(v) {
    if (v.section === 'tower' && !(v.D > 2 * v.t)) throw new InputError('The tube wall must be thinner than half the tube diameter.');
    if (v.section === 'tower' && !(v.d > v.D)) throw new InputError('The tower face must be wider than one tube.');
    const o = launcher(inputs(v)), r = o.pitchDeg / v.allow, lv = level(r);
    // fixes, closed form: θ ∝ L², θ ∝ 1/d², θ ∝ 1/t, θ ∝ 1/I
    const ur = (x) => show(x, RAIL), ul = (x) => show(x, LEN);
    const fix = {};
    if (Number.isFinite(o.Lmax)) fix.L = o.Lmax;
    if (tower(v)) { fix.d = v.d * Math.sqrt(r); fix.t = v.t * r; } else fix.I = v.I * r;
    const fixes = [];
    if (lv !== 'safe') {
      const n = Math.floor(o.Lmax / SECTION);
      fixes.push(`Shorten the rail to at most <b>${ur(o.Lmax)}</b> (now ${ur(v.L)})${tower(v) && n >= 1 ? ` — ${n} whole 10 ft section${n > 1 ? 's' : ''}` : ''}, or`);
      if (tower(v)) {
        fixes.push(`use a tower at least <b>${ul(fix.d)}</b> wide (now ${ul(v.d)}), or`);
        fixes.push(fix.t < v.D / 2 ? `tubes with walls at least <b>${ul(fix.t)}</b> thick (now ${ul(v.t)}).` : `a stiffer support: ${fmt(r, { digits: 3 })} × the second moment of area.`);
      } else fixes.push(`a support with a second moment of area of at least <b>${show(fix.I, AI)}</b> (now ${show(v.I, AI)}).`);
    }
    const verdict = {
      level: lv,
      title: lv === 'safe' ? 'The rail is stiff enough: the tip-off error is within your limit' : lv === 'marginal' ? 'Little or no margin: the rail tip bends about as much as you allow' : 'The rail bends too much: the launch angle will be off',
      text: `As the rocket leaves, the rail tip tilts <b>${deg(o.pitchDeg)}</b> in pitch (${deg(o.yawDeg)} in yaw); you allow <b>${deg(v.allow)}</b>. ${Number.isFinite(o.Lmax) ? `The longest rail that meets it is <b>${ur(o.Lmax)}</b>.` : ''}`,
      fixes,
    };
    const warnings = [];
    if (lv !== 'safe') warnings.push({ level: lv === 'unsafe' ? 'err' : 'warn', text: `The rail tip slope is ${deg(o.pitchDeg)}, over the ${deg(v.allow)} you allow.`, fix: `Shorten the rail to ${ur(o.Lmax)} or less, or stiffen the support (see the verdict).` });
    if (v.QE > 89.9) warnings.push({ level: 'info', text: 'Near-vertical rails carry almost no weight component; only the thrust misalignment bends them.' });
    if (custom(v)) warnings.push({ level: 'info', text: 'With a second moment of area entered directly, pitch and yaw use the same stiffness.', fix: 'For a section stiffer one way than the other, run the calculator once per plane.' });
    const Fallow = (2 * o.EI * v.allow * RAD) / (v.factor * v.L * v.L), cq = Math.cos(v.QE * RAD);
    const Wmax = cq > 1e-9 && Fallow > o.F.thrust ? (Fallow - o.F.thrust) / cq : '—';
    const results = { pitchDeg: o.pitchDeg, Lmax: Number.isFinite(o.Lmax) ? o.Lmax : 'no limit', Fp: o.F.pitch, yawDeg: o.yawDeg, totalDeg: o.totalDeg, tip: o.tip, Wmax, Ireq: o.I * r, Mbase: o.F.pitch * v.L, Fw: o.F.weight, Ft: o.F.thrust, I: o.I, EI: o.EI };
    return { results, warnings, verdict, lv, r, fix, o };
  },
  plots: [
    {
      id: 'length', title: 'Choosing the rail length: tip slope against length', wide: true,
      info: { text: ['The pitch tip slope (solid) and yaw tip slope (dashed) for other rail lengths on the same support, at your elevation. Both grow with the square of the length.', 'Where the solid curve crosses the red line is the longest acceptable rail. The grey lines mark whole 10 ft tower sections.'], doc: 'beam' },
      build(v, out, { U }) {
        const ur = U(RAIL), o = out.o, Lm = Number.isFinite(o.Lmax) ? o.Lmax : v.L, top = 1.5 * Math.max(v.L, Math.min(Lm, 3 * v.L)), p = [], y = [];
        const Fy = o.F.yaw;
        for (let j = 0; j <= 80; j++) { const L = (top * j) / 80; p.push([ur.v(L), tipSlope(o.F.pitch, L, o.EI, v.factor) / RAD]); y.push([ur.v(L), tipSlope(Fy, L, o.EI, v.factor) / RAD]); }
        const far = !Number.isFinite(o.Lmax) || Math.abs(v.L / o.Lmax - 1) > 0.25;   // labels of near markers would collide
        const markers = [{ x: ur.v(v.L), y: o.pitchDeg, label: far ? 'your rail' : '' }];
        if (Number.isFinite(o.Lmax) && o.Lmax <= top) markers.push({ x: ur.v(o.Lmax), y: v.allow, label: 'longest rail', color: 'var(--danger)' });
        const vlines = tower(v) ? Array.from({ length: Math.floor(top / SECTION) }, (_, i) => ({ x: ur.v((i + 1) * SECTION), color: 'var(--text-3)' })) : [];
        return { x: { label: 'Rail length $L$', unit: ur.label }, xDomain: [0, ur.v(top)], y: { label: 'Tip slope', unit: '{}^{\\circ}' }, yDomain: [0, Math.max(2.5 * v.allow, 1.3 * o.pitchDeg)],
          series: [{ name: 'pitch $\\theta_{pitch}$', points: p, smooth: true }, { name: 'yaw $\\theta_{yaw}$', points: y, smooth: true, dashed: true, color: 'var(--series-2)' }],
          hlines: [{ y: v.allow, label: 'your limit', color: 'var(--danger)' }], vlines, markers };
      },
    },
    {
      id: 'along', title: 'Along the rail at tip-off: where it bends', wide: true, height: 460,
      info: { text: ['The rail at the moment the rocket leaves, from the pivot (left) to the tip (right): the bending moment, the slope and the sideways deflection, all in pitch.', 'The moment is largest at the base, so the lower part does most of the bending: the lower half of the rail gives 75 % of the tip slope. The red line is your allowed slope; only the value at the tip matters. Grey lines are tower section joints.'], doc: 'beam' },
      build(v, out, { U }) {
        const ur = U(RAIL), ul = U(LEN), um = U(MOM), o = out.o, F = o.F.pitch, k = v.factor, EI = o.EI, L = v.L, M = [], th = [], y = [];
        for (let j = 0; j <= 60; j++) {
          const x = (L * j) / 60, X = ur.v(x);
          M.push([X, um.v(F * (L - x))]); th.push([X, (k * F * (2 * L * x - x * x)) / (2 * EI) / RAD]); y.push([X, ul.v((k * F * x * x * (3 * L - x)) / (6 * EI))]);
        }
        const vlines = tower(v) ? Array.from({ length: Math.ceil(L / SECTION) - 1 }, (_, i) => ({ x: ur.v((i + 1) * SECTION), color: 'var(--text-3)' })) : [];
        return {
          x: { label: 'Distance from the base $x$', unit: ur.label }, xDomain: [0, ur.v(L)], vlines,
          panels: [
            { y: { label: 'Moment $M$ (static)', unit: um.label }, color: 'var(--series-2)', includeZero: true, series: [{ name: 'moment $M$', points: M }] },
            { y: { label: 'Slope $\\theta$', unit: '{}^{\\circ}' }, color: 'var(--series-1)', includeZero: true, yDomain: [0, Math.max(1.2 * v.allow, 1.1 * o.pitchDeg)], series: [{ name: 'slope $\\theta$', dash: '7 4', points: th }], hlines: [{ y: v.allow, label: 'your limit', color: 'var(--danger)' }] },
            { y: { label: 'Deflection $y$', unit: ul.label }, color: 'var(--series-4)', includeZero: true, series: [{ name: 'deflection $y$', dash: '2 3', points: y }] },
          ],
        };
      },
    },
    {
      id: 'qe', title: 'Tip slope against elevation', explore: true,
      info: { text: ['Pitch and yaw tip slopes as the rail is raised. The weight across the rail falls as $\\cos QE$, so steep launches bend the rail far less; the yaw slope comes from thrust misalignment alone.', 'Where the pitch curve crosses the red line is the lowest elevation this rail can launch at within your limit.'], doc: 'loads' },
      build(v, out) {
        const p = [], y = [];
        for (let i = 0; i <= 60; i++) { const QE = 60 + (30 * i) / 60, o = launcher({ ...inputs(v), QE }); p.push([QE, o.pitchDeg]); y.push([QE, o.yawDeg]); }
        return { x: { label: 'Quadrant elevation $QE$', unit: '{}^{\\circ}' }, y: { label: 'Tip slope', unit: '{}^{\\circ}' }, includeZero: true,
          series: [{ name: 'pitch', points: p, smooth: true }, { name: 'yaw', points: y, dashed: true, color: 'var(--series-2)' }], hlines: [{ y: v.allow, label: 'your limit', color: 'var(--danger)' }],
          markers: [{ x: v.QE, y: out.o.pitchDeg, label: 'your launch' }] };
      },
    },
    {
      id: 'weight', title: 'Heavier rockets: longest rail against rocket weight', explore: true,
      info: { text: ['The longest acceptable rail at your elevation for heavier or lighter rockets on the same support.', 'Where the curve crosses your rail length (grey) is the heaviest rocket this rail can take within your limit.'], doc: 'verdict' },
      build(v, out, { U }) {
        const ur = U(RAIL), um = U(MASS), pts = [], Wm = typeof out.results.Wmax === 'number' ? out.results.Wmax : v.W, top = 2 * Math.max(v.W, Math.min(Wm, 4 * v.W));
        for (let i = 1; i <= 60; i++) { const W = (top * i) / 60, F = lateralLoads({ W, T: v.T, sigmaDeg: v.sigma, k: v.k, QE: v.QE }).pitch; pts.push([um.v(W), ur.v(Math.min(maxLength(F, out.o.EI, v.allow * RAD, v.factor), 50 * v.L))]); }
        const markers = Number.isFinite(out.o.Lmax) ? [{ x: um.v(v.W), y: ur.v(out.o.Lmax), label: typeof out.results.Wmax !== 'number' || Math.abs(v.W / out.results.Wmax - 1) > 0.3 ? 'your rocket' : '' }] : [];
        if (typeof out.results.Wmax === 'number' && out.results.Wmax <= top) markers.push({ x: um.v(out.results.Wmax), y: ur.v(v.L), label: 'heaviest', color: 'var(--danger)' });
        return { x: { label: 'Rocket weight $W$', unit: um.label }, y: { label: 'Longest rail $L_{max}$', unit: ur.label }, yDomain: [0, ur.v(3 * Math.max(v.L, Math.min(out.o.Lmax, 3 * v.L)))], series: [{ name: '$L_{max}$', points: pts, smooth: true }],
          hlines: [{ y: ur.v(v.L), label: 'your rail', color: 'var(--text-3)' }], markers };
      },
    },
  ],
  schematicTitle: 'Launcher rail at the moment of tip-off',
  schematicHint: 'Side view to scale: the truss at its elevation with the rocket leaving the tip, the bent rail (bending exaggerated) coloured by the verdict, the loads, and the longest acceptable rail. Top right: the rail tip magnified, with the launch direction against your limit. Bottom right: the tower cross-section. Drag the rail tip to change the length, the arc handle to change the elevation, or a tube to change the face width',
  schematic(ctx, v, out) {
    const W = 800, H = 410, o = out.o, col = COL[out.lv];
    const fr = ctx.frame({ width: W, height: H, label: 'Launcher rail and truss at tip-off, the rail tip magnified, and the tower cross-section' });
    const g = fr.layer('main'); g.replaceChildren();
    const ur = ctx.U(RAIL), ul = ctx.U(LEN), uf = ctx.U(FORCE), Lr = (x) => `${fmt(ur.v(x), { digits: 3 })} ${ur.label}`, Ll = (x) => `${fmt(ul.v(x), { digits: 3 })} ${ul.label}`, Ff = (x) => `${fmt(uf.v(x), { digits: 3 })} ${uf.label}`;
    // ---- side view: base (bx, by); rail along QE; the scale fits the rail or L_max, whichever is longer (up to 2L)
    const bx = 100, by = 372, qe = v.QE * RAD, ux = Math.cos(qe), uy = -Math.sin(qe), nx = -uy, ny = ux;   // n: across the rail, downhill side
    const S = Math.max(v.L, Number.isFinite(o.Lmax) ? Math.min(o.Lmax, 2 * v.L) : v.L), Ptot = Math.min(295 / Math.max(Math.sin(qe), 1e-3), 320 / Math.max(ux, 1e-3), 330);
    const k = Ptot / S, Lp = v.L * k;
    const depthTrue = (tower(v) ? (v.d * Math.sqrt(3)) / 2 : 10) * k, depth = Math.max(5, Math.min(40, depthTrue));
    const P = (sa, n) => [bx + ux * sa + nx * n, by + uy * sa + ny * n];
    g.append(s('line', { x1: 14, x2: 440, y1: by, y2: by, class: 'sc-line' }));
    for (let x = 18; x < 440; x += 12) g.append(s('line', { x1: x, y1: by, x2: x - 8, y2: by + 8, class: 'sc-thin', 'stroke-opacity': 0.5 }));
    g.append(s('rect', { x: bx - 30, y: by - 12, width: 60, height: 12, class: 'sc-body-2' }));
    g.append(s('circle', { cx: bx, cy: by, r: 3.5, fill: 'var(--text)' }));
    // unloaded truss (dashed) and the bent one, exaggerated so the drawn tip slope is about 8°
    g.append(s('path', { d: path([P(0, 0), P(Lp, 0)]) + path([P(0, depth), P(Lp, depth)]), class: 'sc-thin', 'stroke-dasharray': '3 3', opacity: 0.7 }));
    const ex = o.pitchDeg > 0 ? Math.max(1, Math.min(5000, 8 / o.pitchDeg)) : 1, defl = (sa) => { const u = sa / Lp; return (o.tip * k * ex * (3 * u * u - u ** 3)) / 2; };
    const top = [], bot = [], zig = [], nz = Math.max(8, Math.round(Lp / Math.max(6, depth)));
    for (let i = 0; i <= 40; i++) { const sa = (Lp * i) / 40; top.push(P(sa, defl(sa))); bot.push(P(sa, depth + defl(sa))); }
    for (let i = 0; i <= nz; i++) { const sa = (Lp * i) / nz; zig.push(P(sa, (i % 2 ? depth : 0) + defl(sa))); }
    g.append(s('path', { d: path(zig), fill: 'none', class: 'sc-thin' }));
    for (const line of [top, bot]) g.append(s('path', { d: path(line), fill: 'none', stroke: col, 'stroke-width': 2.4, 'data-field': 'L E d D t I' }));
    // tower section joints every 10 ft
    if (tower(v)) for (let sj = SECTION; sj < v.L - 1; sj += SECTION) { const sp = sj * k, a = P(sp, defl(sp) - 3), b = P(sp, depth + defl(sp) + 3); g.append(s('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: 'var(--text)', 'stroke-width': 2.2 })); }
    // longest acceptable rail: a red tick across the rail line
    if (Number.isFinite(o.Lmax) && o.Lmax <= S * 1.0001) {
      const sm = o.Lmax * k, a = P(sm, -34), b = P(sm, depth + 8 + (sm <= Lp ? defl(sm) : 0));
      if (sm > Lp) g.append(s('path', { d: path([P(Lp, depth / 2), P(sm, depth / 2)]), class: 'sc-thin', 'stroke-dasharray': '2 4' }));
      g.append(s('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: 'var(--danger)', 'stroke-width': 2 }));
      const la = P(sm, -40);
      g.append(text(la[0], la[1] + 4, `L_{max} = ${Lr(o.Lmax)}`, { anchor: 'end', size: 10.5, field: 'allow' }));
    }
    // rocket riding on the tip (upper side), not to scale; it leaves along the bent tangent
    const tp = P(Lp, defl(Lp)), slopeDr = Math.atan(o.pitchDeg * RAD * ex), ang = (Math.atan2(uy, ux) + slopeDr * (ux >= 0 ? 1 : -1)) / RAD;
    const rl = 74, rr = 7, yc = -rr - 3;
    const gr = s('g', { transform: `translate(${tp[0].toFixed(2)} ${tp[1].toFixed(2)}) rotate(${ang.toFixed(3)})`, 'data-field': 'W T' });
    gr.append(s('path', { d: `M${-rl * 0.82},${yc - rr}H${rl * 0.02}Q${rl * 0.13},${yc - rr} ${rl * 0.2},${yc}Q${rl * 0.13},${yc + rr} ${rl * 0.02},${yc + rr}H${-rl * 0.82}Z`, class: 'sc-body' }));
    gr.append(s('path', { d: `M${-rl * 0.82},${yc - rr}l-8,-7v${2 * rr + 14}l8,-7`, class: 'sc-body-2' }));
    g.append(gr);
    // unloaded direction and the launch direction beyond the tip, with the drawn tip slope
    const ray = 46, ud = [tp[0] + ux * ray, tp[1] + uy * ray], td = [tp[0] + Math.cos(ang * RAD) * ray, tp[1] + Math.sin(ang * RAD) * ray];
    g.append(s('line', { x1: tp[0], y1: tp[1], x2: ud[0], y2: ud[1], class: 'sc-thin', 'stroke-dasharray': '4 3' }));
    g.append(s('line', { x1: tp[0], y1: tp[1], x2: td[0], y2: td[1], stroke: col, 'stroke-width': 1.6 }));
    // loads across the rail at the tip, head to tail: weight component, then misalignment (lengths ∝ force)
    const fl = 52, fw = o.F.pitch > 0 ? (fl * o.F.weight) / o.F.pitch : 0, f0 = [tp[0] + nx * (depth + 6), tp[1] + ny * (depth + 6)];
    if (fw > 1) g.append(s('line', { x1: f0[0], y1: f0[1], x2: f0[0] + nx * fw, y2: f0[1] + ny * fw, class: 'sc-accent', 'stroke-width': 2.4, 'marker-end': fr.arrow('acc'), 'data-field': 'W QE' }));
    if (fl - fw > 1) g.append(s('line', { x1: f0[0] + nx * fw, y1: f0[1] + ny * fw, x2: f0[0] + nx * fl, y2: f0[1] + ny * fl, class: 'sc-accent2', 'stroke-width': 1.6, 'marker-end': fr.arrow('acc2'), 'data-field': 'T sigma k' }));
    const fe = [f0[0] + nx * fl, f0[1] + ny * fl];
    g.append(text(fe[0] + 8, fe[1] + 2, `F = ${Ff(o.F.pitch)}`, { size: 11, field: 'W T sigma k QE' }));
    g.append(text(fe[0] + 8, fe[1] + 16, `weight ${Ff(o.F.weight)} + misalign. ${Ff(o.F.thrust)}`, { size: 9.5, cls: 'sc-dim-text' }));
    g.append(text(fe[0] + 8, fe[1] + 34, `tip slope θ = ${deg(o.pitchDeg)} (drawn ×${fmt(ex, { digits: 2 })})`, { size: 11, field: 'L E d D t I' }));
    // QE arc at the base
    const ar = 48;
    g.append(s('path', { d: `M${bx + ar},${by} A${ar},${ar} 0 0 0 ${bx + ar * Math.cos(qe)},${by - ar * Math.sin(qe)}`, class: 'sc-thin', fill: 'none', 'data-field': 'QE' }));
    g.append(text(bx + ar + 8, by - 8, `QE = ${deg(v.QE, 3)}`, { size: 11, field: 'QE' }));
    g.append(dim(fr, ...P(0, -30), ...P(Lp, -30), `L = ${Lr(v.L)}`, { field: 'L', textSide: -8 }));
    g.append(text(14, H - 6, 'to scale except the bending; rocket not to scale', { size: 10, cls: 'sc-dim-text' }));
    ctx.handle('tip', ...P(Lp, defl(Lp) + depth / 2), {
      field: 'L', title: 'Drag along the rail to change its length',
      onDrag: (sx, sy) => { const sAlong = (sx - bx) * ux + (sy - by) * uy; ctx.setValue('L', Math.max(12, sAlong / k), { round: 1 }); },
      onKey: (dx) => ctx.setValue('L', Math.max(12, v.L * (1 + 0.05 * dx)), { round: 1 }),
    });
    ctx.handle('qe', bx + ar * Math.cos(qe), by - ar * Math.sin(qe), {
      field: 'QE', title: 'Drag round the arc to change the elevation',
      onDrag: (sx, sy) => ctx.setValue('QE', Math.max(0, Math.min(90, Math.atan2(by - sy, sx - bx) / RAD)), { round: 0.5 }),
      onKey: (dx, dy) => ctx.setValue('QE', Math.max(0, Math.min(90, v.QE + 0.5 * (dy || dx)))),
    });
    // ---- inset 1: the rail tip magnified, rail drawn horizontal; angles exaggerated by one factor
    const ix0 = 470, iy0 = 14, iw = 316, ih = 190;
    g.append(s('rect', { x: ix0, y: iy0, width: iw, height: ih, fill: 'none', class: 'sc-thin', rx: 4, opacity: 0.6 }));
    g.append(text(ix0 + iw - 8, iy0 + 16, 'rail tip, magnified', { anchor: 'end', size: 10.5, cls: 'sc-dim-text' }));
    const amax = Math.max(o.pitchDeg, v.allow), ex2 = 20 / amax, tx = ix0 + 150, ty = iy0 + 62, ang1 = o.pitchDeg * ex2 * RAD, ang2 = v.allow * ex2 * RAD;
    g.append(s('line', { x1: ix0 + 10, y1: ty, x2: ix0 + iw - 10, y2: ty, class: 'sc-thin', 'stroke-dasharray': '4 3' }));
    g.append(text(ix0 + iw - 10, ty - 6, 'unloaded rail', { anchor: 'end', size: 9.5, cls: 'sc-dim-text' }));
    g.append(s('line', { x1: tx - 110 * Math.cos(ang1), y1: ty - 110 * Math.sin(ang1), x2: tx, y2: ty, stroke: col, 'stroke-width': 5, 'stroke-linecap': 'round', 'data-field': 'L E d D t I' }));
    g.append(s('line', { x1: tx, y1: ty, x2: tx + 150 * Math.cos(ang1), y2: ty + 150 * Math.sin(ang1), stroke: col, 'stroke-width': 1.6 }));
    g.append(s('line', { x1: tx, y1: ty, x2: tx + 120 * Math.cos(ang2), y2: ty + 120 * Math.sin(ang2), stroke: 'var(--danger)', 'stroke-width': 1.4, 'stroke-dasharray': '6 3', 'data-field': 'allow' }));
    const arc = (r, a, cls) => g.append(s('path', { d: `M${tx + r},${ty} A${r},${r} 0 0 1 ${tx + r * Math.cos(a)},${ty + r * Math.sin(a)}`, fill: 'none', ...cls }));
    arc(64, ang1, { stroke: col, 'stroke-width': 1.4 }); arc(48, ang2, { stroke: 'var(--danger)', 'stroke-width': 1.2 });
    // legend (bottom left of the inset) instead of labels on the rays, which can sit close together
    const ly = iy0 + ih - 46;
    g.append(s('line', { x1: ix0 + 10, x2: ix0 + 30, y1: ly, y2: ly, stroke: col, 'stroke-width': 1.6 }));
    g.append(text(ix0 + 36, ly + 4, `launch direction: tip slope θ = ${deg(o.pitchDeg)}`, { size: 10.5, field: 'L E d D t I' }));
    g.append(s('line', { x1: ix0 + 10, x2: ix0 + 30, y1: ly + 16, y2: ly + 16, stroke: 'var(--danger)', 'stroke-width': 1.4, 'stroke-dasharray': '6 3' }));
    g.append(text(ix0 + 36, ly + 20, `your limit θ_{max} = ${deg(v.allow)}`, { size: 10.5, field: 'allow' }));
    // a small rocket leaving along the bent tangent
    const rk = s('g', { transform: `translate(${tx} ${ty}) rotate(${(ang1 / RAD).toFixed(3)})` });
    rk.append(s('path', { d: 'M8,-14H58Q68,-14 74,-9Q68,-4 58,-4H8Z', class: 'sc-body' }));
    g.append(rk);
    g.append(text(ix0 + 8, iy0 + ih - 8, `angles ×${fmt(ex2, { digits: 3 })}; the rocket leaves along the bent tip`, { size: 9.5, cls: 'sc-dim-text' }));
    // ---- inset 2: cross-section
    const cx = 628, cy = 300;
    if (tower(v)) {
      const s2 = v.d <= 15 ? 7 : 105 / v.d, side = v.d * s2, h = (side * Math.sqrt(3)) / 2, rt = Math.max(3.5, (v.D / 2) * s2);
      const A1 = [cx - side / 2, cy - h / 3], B1 = [cx + side / 2, cy - h / 3], C1 = [cx, cy + (2 * h) / 3];
      g.append(s('path', { d: path([A1, B1, C1], true), class: 'sc-thin', fill: 'none' }));
      for (const [x, y] of [A1, B1, C1]) { g.append(s('circle', { cx: x, cy: y, r: rt, fill: col, 'data-field': 'D t' })); g.append(s('circle', { cx: x, cy: y, r: Math.max(0.8, rt - Math.max(1.2, v.t * s2)), fill: 'var(--bg)' })); }
      g.append(s('line', { x1: cx - side / 2 - 18, x2: cx + side / 2 + 18, y1: cy, y2: cy, class: 'sc-thin', 'stroke-dasharray': '8 3 2 3' }));
      g.append(text(cx + side / 2 + 20, cy + 4, 'neutral axis', { size: 9.5, cls: 'sc-dim-text' }));
      g.append(dim(fr, A1[0], A1[1], B1[0], B1[1], `d = ${Ll(v.d)}`, { off: -16, textOff: -6, field: 'd' }));
      g.append(text(C1[0] + rt + 6, C1[1] + 4, `D = ${Ll(v.D)}, t = ${Ll(v.t)}`, { size: 10, field: 'D t' }));
      g.append(text(cx, H - 6, `tower section${v.d <= 15 ? ' (to scale)' : ''} · I = ${fmt(ctx.U(AI).v(o.I), { digits: 3 })} ${ctx.U(AI).label}`, { anchor: 'middle', size: 10, cls: 'sc-dim-text' }));
      ctx.handle('d', B1[0], B1[1], {
        field: 'd', title: 'Drag sideways to change the tower face width',
        onDrag: (sx) => ctx.setValue('d', Math.max(v.D * 1.2, (2 * (sx - cx)) / s2), { round: 0.05 }),
        onKey: (dx) => ctx.setValue('d', Math.max(v.D * 1.2, v.d + 0.25 * dx)),
      });
    } else {
      g.append(s('rect', { x: cx - 30, y: cy - 40, width: 60, height: 80, rx: 3, fill: col, opacity: 0.25, 'data-field': 'I' }));
      g.append(text(cx, cy + 4, `I = ${fmt(ctx.U(AI).v(v.I), { digits: 4 })} ${ctx.U(AI).label}`, { anchor: 'middle', size: 12, field: 'I' }));
      g.append(text(cx, H - 6, 'your support section (shape not drawn)', { anchor: 'middle', size: 10, cls: 'sc-dim-text' }));
    }
  },
  symbols: {
    E: 'Young’s modulus of the support (psi or Pa)', I: 'second moment of area of the rail support (in⁴ or m⁴)', EI: 'bending stiffness (lbf·in² or N·m²)', y: 'rail deflection (in or m)', x: 'distance along the rail from its base (in or m)',
    F: 'lateral load at the rail tip (lbf or N)', L: 'rail length (in or m)', T: 'thrust (lbf or N)', '\\sigma_\\delta': 'standard deviation of the thrust misalignment (rad)', 'n_\\sigma': 'number of standard deviations covered',
    W: 'rocket weight (lbf or N)', QE: 'quadrant elevation (°)', k_d: 'dynamic overshoot factor', A: 'cross-section area of one tube (in² or m²)', D: 'tube outside diameter (in or m)', t: 'tube wall thickness (in or m)',
    d: 'tower face width (in or m)', '\\theta': 'rail slope (rad or °)', '\\theta_{tip}': 'rail tip slope (rad or °)', '\\theta_{pitch}': 'rail tip slope in pitch (rad or °)', '\\theta_{yaw}': 'rail tip slope in yaw (rad or °)', '\\theta_{tot}': 'combined tip-off error (°)',
    '\\theta_{max}': 'allowed tip slope (rad or °)', 'L_{max}': 'longest acceptable rail (in or m)', y_tip: 'tip deflection (in or m)', 'y_{tip}': 'tip deflection (in or m)', 'F_{yaw}': 'lateral load in yaw (lbf or N)',
    'W_{max}': 'heaviest rocket for the rail (lbf or N)', 'I_{req}': 'second moment of area needed (in⁴ or m⁴)', M: 'bending moment (lbf·in or N·m)', M_0: 'bending moment at the base (lbf·in or N·m)',
    F_w: 'weight component across the rail (N or lbf)',
    F_t: 'thrust misalignment load (N or lbf)',
    'W\\cos QE': 'weight component across the rail (N or lbf)',
    'n_\\sigma T\\sigma_\\delta': 'thrust misalignment load (N or lbf)',
  },
  limits: [
    'The rail and truss are a uniform beam fixed rigidly at the pivot; flexible hinges, jacks or legs add to the tip slope.',
    'The load is a single sideways force at the tip just before the rocket leaves; the static slope is multiplied by the overshoot factor (Hoult: 2) instead of solving the rail’s vibration.',
    'Three-tube tower: the zig-zag rods add no bending stiffness and each tube is a thin ring at its corner ($I=Ad^2/2$).',
    'The allowed slope is your choice; 0.1° is Hoult’s chosen bound and 0.05° the CSULB requirement, not a published standard.',
  ],
  report(v, out, R) {
    const o = out.o, n = R.n, Q = R.Q;
    const steps = [
      { label: 'Weight component across the rail', lhs: 'W\\cos QE', sub: `${R.v(v.W, MASS)}\\times\\cos ${n(v.QE)}^\\circ`, res: Q(o.F.weight, FORCE) },
      { label: 'Thrust misalignment load', lhs: 'n_\\sigma T\\sigma_\\delta', sub: `${n(v.k)}\\times${R.v(v.T, FORCE)}\\times${n(v.sigma * RAD)}`, res: Q(o.F.thrust, FORCE) },
      { label: 'Lateral load in pitch', lhs: 'F', eq: 'W\\cos QE+n_\\sigma T\\sigma_\\delta', res: Q(o.F.pitch, FORCE) },
    ];
    if (v.section === 'tower') steps.push({ label: 'Second moment of area of the three-tube tower ($A=\\pi Dt$)', lhs: 'I', eq: '\\frac{\\pi D\\,t\\,d^2}{2}', sub: `\\frac{\\pi\\times${R.v(v.D, LEN)}\\times${R.v(v.t, LEN)}\\times${R.v(v.d, LEN)}^2}{2}`, res: Q(o.I, AI) });
    // slope in consistent units: lbf, in, psi (US) or N, m, Pa (SI)
    const [fF, fL, fE] = R.us ? [1, 1, 1] : [4.4482216152605, 0.0254, 6894.757293168];
    steps.push({ label: 'Tip slope in pitch (cantilever with dynamic overshoot)', lhs: '\\theta_{pitch}', eq: 'k_d\\frac{FL^2}{2EI}',
      sub: `${n(v.factor)}\\times\\frac{${n(o.F.pitch * fF)}\\times${n(v.L * fL)}^2}{2\\times${n(v.E * fE)}\\times${n(o.I * fL ** 4)}}`, res: `${n(o.pitchDeg * RAD)}\\,\\mathrm{rad}=${n(o.pitchDeg)}^\\circ` },
      { label: 'Longest rail that meets the allowed slope', lhs: 'L_{max}', eq: '\\sqrt{\\frac{2EI\\,\\theta_{max}}{k_dF}}', res: Number.isFinite(o.Lmax) ? Q(o.Lmax, RAIL) : '\\infty' });
    return [{
      title: 'Theory',
      text: 'The rail is cantilevered from its base. Just before the rocket separates, the largest bending moment acts over the greatest length: $EI\\,d^2y/dx^2=F(L-x)$, which gives the tip slope $FL^2/2EI$. It is doubled for dynamic overshoot. The lateral load is the weight component $W\\cos QE$ plus the thrust misalignment. For a three-tube tower the tubes carry the bending: $I=Ad^2/2$ with $A=\\pi Dt$ (Hoult). The tip slope is compared with the allowed slope you set.',
      steps,
    }];
  },
  references: ['launcher-tipoff-deflection', 'a-new-launcher', 'standardized-perturbation-values-orig'],
  examples: [
    { name: 'Gold Rush II on a 20 ft tower rail, QE 80°', values: { W: 55, T: 400, sigma: 0.1, k: 3, L: 240, QE: 80, section: 'tower', d: 12.5, D: 1.25, t: 0.065, E: 29e6, allow: 0.1, factor: 2 } },
    { name: 'Same rocket, 10 ft rail', values: { W: 55, T: 400, sigma: 0.1, k: 3, L: 120, QE: 80, section: 'tower', d: 12.5, D: 1.25, t: 0.065, E: 29e6, allow: 0.1, factor: 2 } },
    { name: 'Heavy rocket (150 lb), CSULB requirement 0.05°', values: { W: 150, T: 1200, sigma: 0.1, k: 3, L: 240, QE: 80, section: 'tower', d: 12.5, D: 1.25, t: 0.065, E: 29e6, allow: 0.05, factor: 2 } },
    { name: '20 ft rail on an aluminium truss (I = 30 in⁴ entered): too flexible', values: { W: 55, T: 400, sigma: 0.1, k: 3, L: 240, QE: 80, section: 'custom', I: 30, E: 10e6, allow: 0.1, factor: 2 } },
  ],
};
