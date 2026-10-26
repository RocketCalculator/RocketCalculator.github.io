// Single Wedge Airfoil — UI definition.
import { singleWedge, multiplier, exactMultiplier, maxDeflection, waveDrag, busemann, M_VALID, wedgeSection, prandtlMeyer, deflection } from '../calc/wedge.js';
import { s, fmt } from '../util.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';
import { path, text } from '../ui/svg.js';

const LEN = { dim: 'length', internal: 'in' };
const AREA = { dim: 'area', internal: 'in2' };
const ANG = { dim: 'angle', internal: 'deg' };
const d2r = Math.PI / 180;

// verdict (DECISIONS D28): the windward face must keep an attached shock; within 2° of detachment is marginal
const MARGIN_DEG = 2;
const sectionOf = (v, over = {}) => { const w = { ...v, ...over }, MN = w.M * Math.cos(w.sweep * d2r); return MN > 1 ? wedgeSection(MN, w.delta * d2r, w.alpha * d2r, w.cpBase) : null; };
const inputsOf = (v) => ({ alphaDeg: v.alpha, deltaDeg: v.delta, M: v.M, delta: v.delta * d2r, sweep: v.sweep * d2r, N: v.N, S: ((v.cR + v.cT) * v.b) / 2, Sref: Math.PI * v.bodyR ** 2 });

export default {
  slug: 'single-wedge',
  topic: 'single-wedge-airfoil',
  title: 'Single Wedge Airfoil',
  subtitle: 'The supersonic flow over a single-wedge fin section — <b>shock waves</b>, <b>expansion fans</b>, Mach and Prandtl–Meyer angles — and the lift, drag and extra lift over a flat plate it gives.',
  verdict: true,
  tiers: true,
  intro: {
    what: 'Gives the normal-force multiplier of a single-wedge fin section over a flat plate, the extra wave drag, and the largest wedge angle that keeps the shock attached.',
    why: 'On a fast rocket the centre of pressure moves forward with Mach number; wedge fins recover tail lift where it is needed most, and their flat faces are easy to build and to cant.',
    when: 'Designing fins for well-developed supersonic flight: multiply the flat-plate fin normal-force slope from a supersonic Barrowman method by the result.',
  },
  info: {
    text: [
      'Each face of a wedge meets the flow at its half-angle $\\delta$. At an angle of attack $\\alpha$ the lower face turns the flow by $\\delta+\\alpha$ and the upper by $\\delta-\\alpha$; the difference in surface pressure is the normal force.',
      'Busemann’s expansion of the oblique-shock pressure, $C_P=C_1\\theta+C_2\\theta^2+C_3\\theta^3$, makes the pressure rise faster than linearly with $\\theta$, so a wedge gains more lift per degree of attack than a flat plate (where only the linear Ackeret term acts).',
      'Everything is evaluated in the plane normal to the leading edge, with the Mach number normal to the edge.',
      'Shock–expansion theory solves each face exactly: an oblique shock where the face turns the flow into itself, a Prandtl–Meyer expansion fan where it turns away (NACA 1135).',
    ],
    tex: '\\frac{C_{N\\alpha,wedge}}{C_{N\\alpha,flat}}=1+2\\frac{C_2}{C_1}\\delta+3\\frac{C_3}{C_1}\\delta^2',
    steps: [
      'Set the Mach number, leading-edge sweep and wedge half-angle.',
      'The Mach number normal to the leading edge sets the Busemann coefficients.',
      'The multiplier follows; it applies to the flat-plate fin normal-force slope.',
      'The wave-drag increment and the shock-detachment limit show the cost and the range of validity.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'flight', title: 'Flight condition and section',
      fields: [
        { id: 'M', label: 'Mach number', sym: 'M_\\infty', dim: 'none', default: 3, min: 0, minExclusive: true, max: 20, slider: { min: 1.1, max: 6 },
          info: { text: 'Free-stream Mach number.', range: 'The method is meant for $M_N\\gtrsim 1.7$.', doc: 'busemann' } },
        { id: 'sweep', label: 'Leading-edge sweep', sym: '\\Lambda', ...ANG, default: 0, min: 0, max: 80, slider: { min: 0, max: 70 },
          info: { text: 'Sweep-back of the leading edge. The analysis uses the Mach number normal to the edge, $M_N=M_\\infty\\cos\\Lambda$.', doc: 'sweep' } },
        { id: 'delta', label: 'Wedge half-angle (normal to the edge)', sym: '\\delta', ...ANG, default: 5, min: 0, minExclusive: true, max: 25, slider: { min: 0.5, max: 15 },
          info: { text: ['Angle between each face and the chord line, measured in the plane normal to the leading edge. The base (trailing-edge) thickness is $2c\\tan\\delta$.', 'A thicker wedge lifts more per degree but makes more wave drag, and above a limit the shock detaches. Drag the trailing-edge corner in the drawing to change it.'], range: 'Typical 3°–8°.', doc: 'busemann' } },
        { id: 'alpha', label: 'Angle of attack (normal to the edge)', sym: '\\alpha', ...ANG, default: 4, min: 0, max: 30, slider: { min: 0, max: 15, step: 0.1 },
          info: { text: ['The angle between the chord and the oncoming flow. The lower (windward) face then turns the flow by $\\delta+\\alpha$ through a stronger shock; the upper face by $\\delta-\\alpha$ — a weaker shock, or an expansion fan once $\\alpha>\\delta$.', 'Fins see a few degrees in gusts and coning; drag the air arrow in the drawing to change it.'], range: '0–10°.', doc: 'shockexp' } },
        { id: 'cpBase', label: 'Base pressure coefficient (blunt trailing edge)', sym: 'C_{p,b}', dim: 'none', default: 0, min: -1, max: 0, slider: { min: -0.4, max: 0, step: 0.005 },
          info: { text: ['Pressure on the blunt trailing edge, as a coefficient. In reality it is below ambient (negative) and adds base drag; this tool has no source for it, so 0 leaves base drag out. Enter a measured or estimated value to include it.'], doc: 'shockexp' } },
      ],
    },
    {
      id: 'veh', title: 'Fins on the rocket (for the drag coefficient)',
      fields: [
        { id: 'N', backView: (v) => ({ R: v.bodyR, span: v.b, nominal: { t: true }, unit: LEN, range: [1, 12], note: 'The whole-rocket wave-drag increment is N × (one fin’s increment).' }), shared: 'finN', label: 'Number of fins', sym: 'N', dim: 'none', default: 4, min: 1, max: 12, info: { text: 'Number of fin panels.', doc: 'drag' } },
        { id: 'cR', shared: 'finCr', label: 'Root chord', sym: 'c_R', ...LEN, default: 10, min: 0, minExclusive: true, info: { text: 'Fin root chord.', doc: 'drag' } },
        { id: 'cT', shared: 'finCt', label: 'Tip chord', sym: 'c_T', ...LEN, default: 4, min: 0, info: { text: 'Fin tip chord.', doc: 'drag' } },
        { id: 'b', shared: 'finSpan', label: 'Exposed semispan', sym: 'b', ...LEN, default: 5, min: 0, minExclusive: true, info: { text: 'Span of one exposed panel.', doc: 'drag' } },
        { id: 'bodyR', shared: 'bodyR', label: 'Body radius (reference)', sym: 'R_{ref}', ...LEN, default: 3, min: 0, minExclusive: true, info: { text: 'Sets the reference area $S_{ref}=\\pi R_{ref}^2$.', doc: 'drag' } },
      ],
    },
  ],
  results: [
    { id: 'CL', label: 'Section lift coefficient (exact)', sym: 'c_l', dim: 'none', key: true, digits: 3, note: (x, out) => (out.sec?.ok ? `linear theory ${fmt(out.sec.lin.CN * Math.cos(out.p.alpha ?? 0), { digits: 3 })}` : ''),
      info: { text: ['Lift of the fin section per unit dynamic pressure and chord, from the exact shock and expansion on each face (shock–expansion theory), normal to the leading edge.', 'Linear (Ackeret) theory is the small-angle limit; the exact value is larger for a wedge.'], tex: 'c_l=c_n\\cos\\alpha-c_a\\sin\\alpha,\\ c_n=C_{p,l}-C_{p,u}', doc: 'shockexp' } },
    { id: 'CD', label: 'Section wave drag coefficient (exact)', sym: 'c_d', dim: 'none', key: true, digits: 3, note: (x, out) => (out.sec?.ok && out.sec.LD ? `L/D ${fmt(out.sec.LD, { digits: 3 })}` : ''),
      info: { text: ['Wave drag of the section (both faces, plus base if you entered a base pressure), on the chord.'], tex: 'c_d=c_n\\sin\\alpha+c_a\\cos\\alpha,\\ c_a=(C_{p,l}+C_{p,u}-2C_{p,b})\\tan\\delta', doc: 'shockexp' } },
    { id: 'K', label: 'Normal-force multiplier', sym: 'K_W', dim: 'none', key: true, digits: 4,
      status: (x, out) => (!out.o.supersonic ? null : !out.o.attached ? 'err' : !out.o.valid ? 'warn' : 'ok'),
      note: (x, out) => (!out.o.supersonic ? 'subsonic edge — flat-plate value' : !out.o.attached ? 'shock detached' : !out.o.valid ? 'below the valid Mach range' : `exact shock: ${fmt(out.o.Kexact, { digits: 4 })}`),
      info: { text: 'Ratio of the single-wedge to the flat-plate normal-force slope. Multiply the flat-plate fin $C_{N\\alpha}$ by it.', tex: 'K_W=1+2\\frac{C_2}{C_1}\\delta+3\\frac{C_3}{C_1}\\delta^2', doc: 'busemann' } },
    { id: 'CDw', label: 'Wave-drag increment (on fin area)', sym: '\\Delta C_{DW}', dim: 'none', digits: 4, note: () => 'per unit planform area, stream-wise',
      info: { text: 'Extra wave drag over a flat plate, both faces, referred to the fin planform area and free-stream dynamic pressure.', tex: '\\Delta C_{DW}=2\\delta\\,C_P(\\delta)\\cos^3\\Lambda', doc: 'drag' } },
    { id: 'thetaMax', label: 'Largest turning with an attached shock', sym: '\\theta_{max}', ...ANG, key: true, digits: 4, status: (x, out) => (out.verdict.level === 'safe' ? 'ok' : out.verdict.level === 'marginal' ? 'warn' : 'err'), note: (x, out) => `windward face turns ${fmt(out.p.alphaDeg + out.p.deltaDeg, { digits: 3 })}°`,
      note: (x, out, v) => (out.o.supersonic ? (v.delta <= x ? `your ${fmt(v.delta, { digits: 3 })}° is inside the limit` : `your ${fmt(v.delta, { digits: 3 })}° exceeds it`) : 'no shock: subsonic edge'),
      status: (x, out) => (out.o.supersonic ? (out.o.attached ? 'ok' : 'err') : null),
      info: { text: 'Above this deflection the oblique shock cannot stay attached to the leading edge (exact θ–β–M relation).', doc: 'limit' } },
    { id: 'CDvehicle', label: 'Wave-drag increment, whole rocket', sym: '\\Delta C_D', dim: 'none', key: true, digits: 4, note: () => 'on the body cross-section, all fins',
      info: { text: 'Fin wave-drag increment referred to the body reference area. Add it to the fin wave-drag input of the drag build-up.', tex: '\\Delta C_D=\\frac{N\\,S\\,\\Delta C_{DW}}{S_{ref}}', doc: 'drag' } },
    { id: 'MN', label: 'Mach number normal to the edge', sym: 'M_N', dim: 'none', digits: 4, info: { tex: 'M_N=M_\\infty\\cos\\Lambda', doc: 'sweep' } },
    { id: 'K2', label: 'Multiplier, second-order only', sym: 'K_{W,2}', dim: 'none', digits: 4, info: { text: 'Truncating after the $\\theta^2$ term (Busemann’s original suggestion).', tex: 'K_{W,2}=1+2\\frac{C_2}{C_1}\\delta', doc: 'busemann' } },
    { id: 'Kexact', label: 'Multiplier from the exact shock relations', sym: 'K_{W,exact}', dim: 'none', digits: 4, info: { text: 'The same ratio from the exact oblique-shock pressure, for comparison.', doc: 'limit' } },
    { id: 'CNaFlat', label: 'Flat-plate section lift slope (2-D)', sym: 'c_{N\\alpha,flat}', dim: 'perAngle', internal: 'perrad', info: { tex: 'c_{N\\alpha}=\\frac{4}{\\sqrt{M_N^2-1}}', text: 'Two-dimensional Ackeret value, normal to the edge.', doc: 'busemann' } },
    { id: 'CNaWedge', label: 'Single-wedge section lift slope (2-D)', sym: 'c_{N\\alpha,wedge}', dim: 'perAngle', internal: 'perrad', info: { doc: 'busemann' } },
    { id: 'cpFace', label: 'Face pressure coefficient at zero incidence', sym: 'C_P(\\delta)', dim: 'none', digits: 4, info: { tex: 'C_P=C_1\\delta+C_2\\delta^2+C_3\\delta^3', doc: 'busemann' } },
    { id: 'shockAngle', label: 'Shock angle (zero incidence)', sym: '\\beta_s', ...ANG, info: { text: 'Angle of the attached oblique shock from the leading edge.', doc: 'limit' } },
    { id: 'S', label: 'Planform area of one fin', sym: 'S', ...AREA, info: { tex: 'S=\\frac{(c_R+c_T)\\,b}{2}', doc: 'drag' } },
    { id: 'CN', label: 'Section normal-force coefficient (exact)', sym: 'c_n', dim: 'none', digits: 4, info: { doc: 'shockexp' } },
    { id: 'CNlin', label: 'Normal-force coefficient, linear theory', sym: 'c_{n,lin}', dim: 'none', digits: 4, info: { tex: 'c_n=\\frac{4\\alpha}{\\sqrt{M_N^2-1}}', text: ['Ackeret’s small-angle result for comparison.'], doc: 'shockexp' } },
    { id: 'LD', label: 'Lift-to-drag ratio of the section', sym: 'L/D', dim: 'none', digits: 3, info: { doc: 'shockexp' } },
    { id: 'betaL', label: 'Windward (lower) shock angle', sym: '\\beta_l', ...ANG, digits: 4, info: { text: ['Angle of the shock on the lower face, from the oncoming flow.'], doc: 'shockexp' } },
    { id: 'upFlow', label: 'Leeward (upper) face: shock angle, or expansion (negative: turning)', sym: '\\beta_u', ...ANG, digits: 4, info: { text: ['Positive: the shock angle on the upper face. Negative: the upper face turns the flow away by this angle through a Prandtl–Meyer expansion fan.'], doc: 'shockexp' } },
    { id: 'cpL', label: 'Lower-face pressure coefficient', sym: 'C_{p,l}', dim: 'none', digits: 4, info: { doc: 'shockexp' } },
    { id: 'cpU', label: 'Upper-face pressure coefficient', sym: 'C_{p,u}', dim: 'none', digits: 4, info: { doc: 'shockexp' } },
    { id: 'ML', label: 'Mach number on the lower face', sym: 'M_l', dim: 'none', digits: 4, info: { doc: 'shockexp' } },
    { id: 'MU', label: 'Mach number on the upper face', sym: 'M_u', dim: 'none', digits: 4, info: { doc: 'shockexp' } },
    { id: 'ptL', label: 'Total-pressure ratio across the windward shock', sym: 'p_{t2}/p_{t1}', dim: 'none', digits: 5, info: { text: ['How much total pressure the shock destroys (NACA 1135 eq. 142): the loss that becomes wave drag.'], doc: 'shockexp' } },
    { id: 'TL', label: 'Temperature ratio across the windward shock', sym: 'T_2/T_1', dim: 'none', digits: 4, info: { doc: 'shockexp' } },
    { id: 'mu', label: 'Mach angle', sym: '\\mu', ...ANG, digits: 4, info: { tex: '\\mu=\\sin^{-1}(1/M_N)', doc: 'shockexp' } },
    { id: 'nu', label: 'Prandtl–Meyer angle of the free stream', sym: '\\nu', ...ANG, digits: 4, info: { text: ['How far a sonic stream would have to turn, expanding, to reach this Mach number (NACA 1135 eq. 171).'], tex: '\\nu=\\sqrt{\\tfrac{\\gamma+1}{\\gamma-1}}\\tan^{-1}\\sqrt{\\tfrac{\\gamma-1}{\\gamma+1}(M^2-1)}-\\tan^{-1}\\sqrt{M^2-1}', doc: 'shockexp' } },
    { id: 'dmax', label: 'Largest half-angle with a 2° margin at this α', sym: '\\delta_{max}', ...ANG, digits: 4, info: { doc: 'limit' } },
    { id: 'Mattach', label: 'Mach number above which the shock attaches', sym: 'M_{att}', dim: 'none', digits: 4, info: { doc: 'limit' } },
  ],
  compute(v) {
    const p = inputsOf(v), o = singleWedge(p);
    const warnings = [];
    if (!o.supersonic) warnings.push({ level: 'info', text: 'The leading edge is subsonic ($M_N\\le 1$): the normal force is essentially that of a flat plate (multiplier 1) — the blunt trailing edge keeps the Kutta condition. There is still base drag; enter the wedge angle in the drag build-up.' });
    else if (!o.attached) warnings.push({ level: 'err', text: `The shock detaches: at $M_N$ = ${fmt(o.MN, { digits: 3 })} an attached shock allows at most ${fmt(o.thetaMax / d2r, { digits: 3 })}°. Reduce the wedge angle or the sweep — the multiplier is not valid.` });
    else if (!o.valid) warnings.push({ level: 'warn', text: `Below $M_N$ = ${M_VALID} the expansion overstates the multiplier (both linear and higher-order theories are singular at $M_N=1$). Fair it smoothly down to 1 at $M_N=1$.` });
    if (o.attached && o.Kexact != null && Math.abs(o.K - o.Kexact) / o.Kexact > 0.05) warnings.push({ level: 'info', text: `The cubic expansion and the exact shock relations differ by ${fmt((100 * Math.abs(o.K - o.Kexact)) / o.Kexact, { digits: 2 })} % here — the wedge is thick for this Mach number.` });
    const sec = sectionOf(v), lim = o.supersonic ? o.thetaMax / d2r : null, wind = v.delta + v.alpha;
    const lvl = !o.supersonic ? 'marginal' : wind > lim ? 'unsafe' : wind > lim - MARGIN_DEG ? 'marginal' : 'safe';
    let Mattach = null;
    { const need = wind * d2r; let lo = 1.0001, hi = 50; if (maxDeflection(hi).theta > need) { for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (maxDeflection(m).theta > need) hi = m; else lo = m; } Mattach = hi / Math.cos(v.sweep * d2r); } }
    const dmax = lim != null ? Math.max(0, lim - MARGIN_DEG - v.alpha) : null;
    const fixes = [];
    if (lvl !== 'safe' && o.supersonic) {
      if (dmax > 0) fixes.push(`Use a wedge half-angle of at most <b>${fmt(dmax, { digits: 3 })}°</b> (now ${fmt(v.delta, { digits: 3 })}°) to keep a ${MARGIN_DEG}° margin at this angle of attack, or`);
      if (Mattach) fixes.push(`fly faster than <b>Mach ${fmt(Mattach, { digits: 3 })}</b> (normal to the edge ${fmt(Mattach * Math.cos(v.sweep * d2r), { digits: 3 })}), where the shock attaches.`);
    }
    if (!o.supersonic) fixes.push('With a subsonic leading edge the section works like a flat plate: the wedge only adds base drag here.');
    const verdict = {
      level: lvl,
      title: !o.supersonic ? 'Subsonic leading edge: no wedge benefit' : lvl === 'unsafe' ? 'The windward shock detaches' : lvl === 'marginal' ? 'Close to shock detachment' : sec?.upper.kind === 'expansion' ? 'Attached windward shock, expansion fan on the upper face' : 'Attached shocks on both faces',
      text: o.supersonic ? `The windward face turns the flow by <b>${fmt(wind, { digits: 3 })}°</b>; an attached shock allows up to <b>${fmt(lim, { digits: 3 })}°</b> at $M_N$ = ${fmt(o.MN, { digits: 3 })}.${sec?.ok ? ` Section lift coefficient ${fmt(sec.CL, { digits: 3 })}, drag ${fmt(sec.CD, { digits: 3 })}${sec.LD ? `, L/D ${fmt(sec.LD, { digits: 3 })}` : ''}.` : ''}` : `$M_N$ = ${fmt(o.MN, { digits: 3 })} is below 1.`,
      fixes: fixes.slice(0, 3),
    };
    const lo = sec?.lower, up = sec?.upper, dash = '—';
    const results = {
      K: o.K, CDw: o.CDw, thetaMax: o.thetaMax != null ? o.thetaMax / d2r : null, CDvehicle: o.CDvehicle, MN: o.MN, K2: o.K2, Kexact: o.Kexact,
      CNaFlat: o.CNaFlat, CNaWedge: o.CNaWedge, cpFace: o.cpFace, shockAngle: o.shockAngle != null ? o.shockAngle / d2r : null, S: p.S,
      CL: sec?.ok ? sec.CL : dash, CD: sec?.ok ? sec.CD : dash, LD: sec?.LD ?? dash, CN: sec?.ok ? sec.CN : dash, CNlin: sec ? sec.lin.CN : dash,
      betaL: lo?.kind === 'shock' ? lo.beta / d2r : dash, upFlow: up ? (up.kind === 'shock' ? up.beta / d2r : up.kind === 'expansion' ? -(v.alpha - v.delta) : dash) : dash,
      cpL: lo?.cp ?? dash, cpU: up?.cp ?? dash, ML: lo?.M2 ?? dash, MU: Number.isFinite(up?.M2) ? up.M2 : dash, ptL: lo?.pt ?? dash, TL: lo?.T ?? dash,
      mu: o.supersonic ? Math.asin(1 / o.MN) / d2r : dash, nu: o.supersonic ? prandtlMeyer(o.MN) / d2r : dash, dmax: dmax ?? dash, Mattach: Mattach ?? dash,
    };
    if (sec && v.alpha > 0 && sec.ok && Math.abs(sec.CN - sec.lin.CN) / sec.CN > 0.1) warnings.push({ level: 'info', text: `Linear (Ackeret) theory underestimates the section normal force by ${fmt((100 * (sec.CN - sec.lin.CN)) / sec.CN, { digits: 2 })} % here: the exact shock–expansion value is used.` });
    return { results, warnings, verdict, o, p, sec };
  },
  plots: [
    {
      id: 'section', title: 'Lift and drag against angle of attack: exact against linear theory', wide: true, height: 520,
      info: { text: ['The section’s normal-force, drag and lift-to-drag ratio against angle of attack, normal to the leading edge: exact shock–expansion (solid), Busemann’s second-order theory and linear (Ackeret) theory.', 'The exact curve ends where the windward shock detaches (red line). The wedge lifts more than linear theory predicts — that is the multiplier.'], doc: 'shockexp' },
      build(v, out) {
        if (!out.o.supersonic) return null;
        const MN = out.o.MN, d = v.delta * d2r, det = out.o.thetaMax / d2r - v.delta, top = Math.max(2 * v.alpha, 10, Math.min(det * 1.1, 25)), N = [], D = [], LD = [], Nl = [], Dl = [], N2 = [];
        const c = busemann(MN), cp2 = (t) => c.C1 * t + c.C2 * t * t;
        for (let i = 0; i <= 80; i++) {
          const a = (top * i) / 80, sec = wedgeSection(MN, d, a * d2r, v.cpBase);
          if (sec.ok) { N.push([a, sec.CN]); D.push([a, sec.CD]); if (sec.LD) LD.push([a, sec.LD]); }
          Nl.push([a, sec.lin.CN]); Dl.push([a, sec.lin.CD]); N2.push([a, cp2(d + a * d2r) - cp2(d - a * d2r)]);
        }
        const vl = [{ x: v.alpha, label: 'your α', color: 'var(--text-3)' }];
        if (det > 0 && det < top) vl.push({ x: det, label: 'windward shock detaches', color: 'var(--danger)', row: 1 });
        return { x: { label: 'Angle of attack $\\alpha$', unit: '°' }, xDomain: [0, top], vlines: vl,
          panels: [
            { y: { label: 'Normal force $c_n$' }, color: 'var(--series-1)', includeZero: true, series: [{ name: 'exact', points: N }, { name: 'Busemann (2nd order)', dash: '7 4', points: N2 }, { name: 'linear (Ackeret)', dash: '2 3', points: Nl }] },
            { y: { label: 'Drag $c_d$' }, color: 'var(--series-2)', includeZero: true, series: [{ name: 'exact', points: D }, { name: 'linear (Ackeret)', dash: '2 3', points: Dl }] },
            { y: { label: 'Lift / drag' }, color: 'var(--series-4)', includeZero: true, series: [{ name: 'L/D', dash: '9 3 2 3', points: LD }] },
          ] };
      },
    },
    {
      id: 'polar', title: 'Shock angle against turning angle (θ–β–M)', wide: true,
      info: { text: ['For each Mach number, the shock angle that turns the flow by a given angle (weak branch, NACA 1135 eqs. 148): it starts at the Mach angle and ends at the largest turning an attached shock can make (dots). Your faces are marked.', 'Above the end of a curve the shock detaches and stands off the leading edge.'], doc: 'shockexp' },
      build(v, out) {
        const MN = out.o.MN, Ms = [...new Set([1.3, 1.6, 2, 3, 5, ...(MN > 1 ? [MN] : [])])].sort((a, b) => a - b);
        const series = Ms.map((M, i) => {
          const pts = [], mu = Math.asin(1 / M), top = maxDeflection(M).beta;
          for (let k = 0; k <= 60; k++) { const b = mu + ((top - mu) * k) / 60; pts.push([deflection(M, b) / d2r, b / d2r]); }
          const mine = MN > 1 && Math.abs(M - MN) < 1e-9;
          return { name: `M = ${fmt(M, { digits: 3 })}${mine ? ' (yours)' : ''}`, points: pts, color: mine ? 'var(--red)' : `var(--series-${(i % 5) + 2})`, dashed: !mine };
        });
        const mk = [], sec = out.sec;
        if (sec?.lower.kind === 'shock') mk.push({ x: v.delta + v.alpha, y: sec.lower.beta / d2r, label: 'lower face' });
        if (sec?.upper.kind === 'shock') mk.push({ x: v.delta - v.alpha, y: sec.upper.beta / d2r, label: 'upper face' });
        return { x: { label: 'Turning angle $\\theta$', unit: '°' }, y: { label: 'Shock angle $\\beta$', unit: '°' }, yDomain: [0, 90], includeZero: true, series, markers: mk };
      },
    },
    {
      id: 'pm', title: 'Prandtl–Meyer angle against Mach number', explore: true,
      info: { text: ['The Prandtl–Meyer angle (NACA 1135 eq. 171): turning a supersonic stream away from itself by Δν raises its Mach number to the one at ν + Δν. Your free stream and upper face are marked.'], doc: 'shockexp' },
      build(v, out) {
        const pts = []; for (let i = 0; i <= 100; i++) { const M = 1 + (Math.max(5, 1.5 * out.o.MN) - 1) * (i / 100); pts.push([M, prandtlMeyer(M) / d2r]); }
        const mk = out.o.supersonic ? [{ x: out.o.MN, y: prandtlMeyer(out.o.MN) / d2r, label: 'free stream' }] : [];
        if (out.sec?.upper.kind === 'expansion') mk.push({ x: out.sec.upper.M2, y: prandtlMeyer(out.sec.upper.M2) / d2r, label: 'upper face' });
        return { x: { label: 'Mach number $M$' }, y: { label: 'Prandtl–Meyer angle $\\nu$', unit: '°' }, includeZero: true, series: [{ name: '$\\nu$', points: pts }], markers: mk };
      },
    },
    {
      id: 'multiplier', title: 'Normal-force multiplier vs normal Mach number', explore: true,
      info: { text: 'The cubic expansion, its second-order truncation and the exact shock relations. Left of the dashed line the expansion is not to be trusted; the exact curve stops where the shock detaches.', doc: 'busemann' },
      build(v, out) {
        const d = v.delta * d2r, mmax = Math.max(6, out.o.MN * 1.2), K3 = [], K2 = [], Ke = [];
        for (let i = 0; i <= 120; i++) {
          const M = 1.2 + ((mmax - 1.2) * i) / 120;
          K3.push([M, multiplier(M, d)]); K2.push([M, multiplier(M, d, 2)]);
          const e = exactMultiplier(M, d); if (e != null) Ke.push([M, e]);
        }
        // scale to the valid range; the singular rise near M_N = 1 is clipped
        const top = Math.max(2, 1.25 * Math.max(...K3.filter(([M]) => M >= M_VALID).map((q) => q[1]), out.o.supersonic && out.o.attached ? out.o.K : 0));
        return { x: { label: 'Normal Mach number $M_N$' }, y: { label: '$C_{N\\alpha}$ ratio' }, yDomain: [0, top],
          series: [{ name: 'cubic (Busemann)', points: K3 }, { name: 'second order', points: K2, dashed: true }, { name: 'exact shock', points: Ke, color: 'var(--text)' }],
          vlines: [{ x: M_VALID, label: `valid above ${M_VALID}`, color: 'var(--text-3)' }],
          markers: out.o.supersonic ? [{ x: out.o.MN, y: out.o.K, label: `K_W = ${fmt(out.o.K, { digits: 3 })}` }] : [] };
      },
    },
    {
      id: 'limit', title: 'Shock-detachment limit', explore: true,
      info: { text: 'Largest wedge half-angle that supports an attached shock, against the normal Mach number; your wedge angle is the horizontal line. The design point must sit below the curve.', doc: 'limit' },
      build(v, out) {
        const mmax = Math.max(3, out.o.MN * 1.2), pts = [];
        for (let i = 0; i <= 100; i++) { const M = 1.01 + ((mmax - 1.01) * i) / 100; pts.push([M, maxDeflection(M).theta / d2r]); }
        return { x: { label: 'Normal Mach number $M_N$' }, y: { label: 'Half-angle', unit: '°' }, includeZero: true,
          series: [{ name: '$\\delta_{max}$', points: pts }, { name: 'your $\\delta$', points: [[1.01, v.delta], [mmax, v.delta]], dashed: true, color: 'var(--text-2)' }],
          markers: out.o.supersonic ? [{ x: out.o.MN, y: v.delta, label: 'design' }] : [] };
      },
    },
    {
      id: 'drag', title: 'Wave-drag increment vs Mach number', explore: true,
      info: { text: 'Extra wave drag of the wedge over a flat plate, on the fin planform area, against free-stream Mach number at your sweep. It does not include the base drag of the blunt trailing edge.', doc: 'drag' },
      build(v, out) {
        const d = v.delta * d2r, c3 = Math.cos(v.sweep * d2r) ** 3, mmax = Math.max(6, v.M * 1.2), pts = [];
        for (let i = 0; i <= 120; i++) {
          const M = 1.05 + ((mmax - 1.05) * i) / 120, MN = M * Math.cos(v.sweep * d2r);
          if (MN > 1.1) pts.push([M, waveDrag(MN, d) * c3]);
        }
        const valid = pts.filter(([M]) => M * Math.cos(v.sweep * d2r) >= M_VALID).map((q) => q[1]);
        const top = 1.3 * Math.max(valid.length ? Math.max(...valid) : 0, out.o.supersonic ? out.o.CDw : 0) || 0.1;
        return { x: { label: 'Mach number' }, y: { label: '$\\Delta C_{DW}$' }, yDomain: [0, top], series: [{ name: '$\\Delta C_{DW}$', points: pts }],
          markers: out.o.supersonic ? [{ x: v.M, y: out.o.CDw, label: 'now' }] : [] };
      },
    },
  ],
  schematicTitle: 'Section normal to the leading edge, with its shocks and expansion',
  schematicHint: 'The fin section at your angle of attack: the windward (lower) shock, the leeward shock or Prandtl–Meyer expansion fan, the free-stream Mach lines (dotted) and the surface pressure and Mach number on each face. Drag the trailing-edge corner to change the wedge angle, or the air arrow to change the angle of attack',
  schematic(ctx, v, out) {
    const W = 760, H = 360, o = out.o, sec = out.sec;
    const fr = ctx.frame({ width: W, height: H, label: 'Single-wedge section with its shocks and expansion fan' });
    const g = fr.layer('main'); g.replaceChildren();
    const x0 = 210, cy = 170, c = 380, d = Math.min(v.delta, 25) * d2r, ht = c * Math.tan(d), xT = x0 + c, al = v.alpha * d2r;
    const ray = (ang, len, attrs) => g.append(s('line', { x1: x0, y1: cy, x2: x0 + len * Math.cos(ang), y2: cy - len * Math.sin(ang), ...attrs }));
    const lbl = (ang, len, str, dy = 0, field = 'M alpha') => g.append(text(x0 + len * Math.cos(ang) + 6, cy - len * Math.sin(ang) + dy, str, { size: 10.5, field }));
    // free-stream Mach lines
    if (o.supersonic) { const mu = Math.asin(1 / o.MN); ray(al + mu, 210, { stroke: 'var(--text-3)', 'stroke-dasharray': '2 4' }); ray(al - mu, 210, { stroke: 'var(--text-3)', 'stroke-dasharray': '2 4' }); }
    if (sec) {
      const L = sec.lower, U = sec.upper;
      if (L.kind === 'shock') { ray(al - L.beta, 260, { stroke: 'var(--danger)', 'stroke-width': 2, 'data-field': 'delta alpha' }); lbl(al - L.beta, 200, `shock ${fmt(L.beta / d2r, { digits: 3 })}°`, 14); }
      if (U.kind === 'shock') { ray(al + U.beta, 240, { stroke: 'var(--danger)', 'stroke-width': 1.4, 'data-field': 'delta alpha' }); lbl(al + U.beta, 190, `shock ${fmt(U.beta / d2r, { digits: 3 })}°`, -4); }
      if (U.kind === 'expansion') {
        const a1 = al + U.mu1, a2 = d + U.mu2;   // first ray at the free-stream Mach angle, last at the upper-face Mach angle
        for (let k = 0; k <= 5; k++) ray(a1 + ((a2 - a1) * k) / 5, 170, { stroke: 'var(--series-6, var(--text-2))', 'stroke-width': 1, 'data-field': 'alpha delta' });
        lbl((a1 + a2) / 2, 175, `expansion fan ${fmt((v.alpha - v.delta), { digits: 3 })}°`, -6);
      }
    } else if (o.supersonic) {
      g.append(s('path', { d: `M${x0 - 26},${cy - 100} Q${x0 - 56},${cy} ${x0 - 26},${cy + 100}`, stroke: 'var(--danger)', 'stroke-width': 2, fill: 'none' }));
      g.append(text(x0 - 40, cy - 110, 'detached shock (sketch)', { anchor: 'middle', size: 10.5 }));
    }
    if (sec && !sec.ok) { g.append(s('path', { d: `M${x0 - 20},${cy - 40} Q${x0 - 40},${cy + 40} ${x0 - 18},${cy + 120}`, stroke: 'var(--danger)', 'stroke-width': 2, fill: 'none' })); g.append(text(x0 - 50, cy - 50, 'windward shock detached (sketch)', { anchor: 'end', size: 10.5 })); }
    // chord line and section
    g.append(s('line', { x1: x0 - 30, x2: xT + 70, y1: cy, y2: cy, class: 'sc-axis' }));
    g.append(s('path', { class: 'sc-body', d: path([[x0, cy], [xT, cy - ht], [xT, cy + ht]], true), 'data-field': 'delta' }));
    g.append(s('rect', { x: xT, y: cy - ht, width: 40, height: 2 * ht, fill: 'var(--surface-2)', stroke: 'none', opacity: 0.8 }));
    g.append(text(xT + 6, cy + ht + 16, 'blunt base', { cls: 'sc-dim-text', size: 10 }));
    // face states
    if (sec?.ok) {
      g.append(text(x0 + c * 0.55, cy - ht * 0.55 - 12, `Cp ${fmt(sec.upper.cp, { digits: 3 })} · M ${fmt(sec.upper.M2, { digits: 3 })}`, { anchor: 'middle', size: 10.5, field: 'alpha delta' }));
      g.append(text(x0 + c * 0.55, cy + ht * 0.55 + 20, `Cp ${fmt(sec.lower.cp, { digits: 3 })} · M ${fmt(sec.lower.M2, { digits: 3 })}`, { anchor: 'middle', size: 10.5, field: 'alpha delta' }));
    }
    // half-angle arc
    const ar = 80;
    g.append(s('path', { d: `M${x0 + ar},${cy} A${ar},${ar} 0 0 0 ${x0 + ar * Math.cos(d)},${cy - ar * Math.sin(d)}`, class: 'sc-thin', fill: 'none', 'data-field': 'delta' }));
    g.append(text(x0 - 12, cy - 12, `δ ${fmt(v.delta, { digits: 3 })}°`, { anchor: 'end', size: 11, field: 'delta' }));
    // oncoming air at α (from lower left), with its handle
    const ax = 40, ay = cy + 120, aL = 110;
    g.append(s('path', { d: `M${ax},${ay}l${aL * Math.cos(al)},${-aL * Math.sin(al)}`, class: 'sc-accent', 'stroke-width': 2, 'marker-end': fr.arrow('acc'), 'data-field': 'alpha' }));
    g.append(text(ax, ay + 20, `air M_N ${fmt(o.MN, { digits: 3 })}, α ${fmt(v.alpha, { digits: 3 })}°`, { size: 11, field: 'M sweep alpha' }));
    for (const dy of [-110, -60]) g.append(s('path', { d: `M${40},${cy + dy}l${70 * Math.cos(al)},${-70 * Math.sin(al)}`, class: 'sc-thin', 'marker-end': fr.arrow() }));
    // planform inset with sweep
    const px = 655, py = 340, lam = v.sweep * d2r, sp = 60;
    g.append(s('line', { x1: px - 40, x2: px + 90, y1: py, y2: py, class: 'sc-line' }));
    g.append(s('path', { class: 'sc-body-2', d: path([[px, py], [px + sp * Math.tan(lam), py - sp], [px + sp * Math.tan(lam) + 30, py - sp], [px + 60, py]], true), 'data-field': 'sweep' }));
    g.append(text(px + 25, py - sp - 8, `planform · Λ ${fmt(v.sweep, { digits: 3 })}°`, { anchor: 'middle', cls: 'sc-dim-text', size: 10, field: 'sweep' }));
    ctx.handle('te', xT, cy - ht, { field: 'delta', title: 'Drag up or down to change the wedge half-angle',
      onDrag: (px2, py2) => ctx.setValue('delta', Math.max(0.1, Math.min(25, Math.atan2(cy - py2, xT - x0) / d2r)), { round: 0.1 }), onKey: (dx, dy) => ctx.setValue('delta', v.delta + 0.1 * dy) });
    ctx.handle('air', ax + aL * Math.cos(al), ay - aL * Math.sin(al), { field: 'alpha', title: 'Drag up or down to change the angle of attack',
      onDrag: (px2, py2) => ctx.setValue('alpha', Math.max(0, Math.min(30, Math.atan2(ay - py2, Math.max(1, px2 - ax)) / d2r)), { round: 0.1 }), onKey: (dx, dy) => ctx.setValue('alpha', Math.max(0, v.alpha + 0.2 * dy)) });
  },
  symbols: {
    'M_\\infty': 'free-stream Mach number', M_N: 'Mach number normal to the leading edge', '\\Lambda': 'leading-edge sweep angle', '\\delta': 'wedge half-angle normal to the edge',
    '\\theta': 'flow deflection angle', '\\alpha': 'angle of attack', '\\gamma': 'ratio of specific heats of air', '\\beta': 'Prandtl–Glauert factor $M_N^2-1$',
    C_1: 'first Busemann coefficient', C_2: 'second Busemann coefficient', C_3: 'third Busemann coefficient', H: 'second-order shock function', I: 'third-order shock function',
    K_W: 'normal-force multiplier', 'C_P(\\delta)': 'face pressure coefficient', '\\Delta C_{DW}': 'wave-drag increment on the fin area', '\\Delta C_D': 'wave-drag increment on the reference area',
    N: 'number of fins', S: 'planform area of one fin', 'S_{ref}': 'reference area', c_R: 'root chord', c_T: 'tip chord', b: 'exposed semispan', 'R_{ref}': 'body radius',
    'c_{N\\alpha,flat}': 'flat-plate section lift slope',
  },
  report(v, out, R) {
    const o = out.o, n = R.n, d = v.delta * d2r;
    if (!o.supersonic) {
      return [{ title: 'Theory', text: 'With a subsonic leading edge ($M_N\\le1$) there is no attached shock; the Kutta condition at the blunt trailing edge keeps the circulation, so the single wedge has essentially the flat-plate normal force. The multiplier is 1 and the supersonic wave-drag increment is zero; only base drag remains.',
        steps: [{ label: 'Mach number normal to the leading edge', lhs: 'M_N', eq: 'M_\\infty\\cos\\Lambda', sub: `${n(v.M)}\\cos${n(v.sweep)}^{\\circ}`, res: n(o.MN) }] }];
    }
    const c = busemann(o.MN);
    return [{
      title: 'Theory',
      text: 'Busemann’s expansion of the oblique-shock relations gives the pressure coefficient on a surface turning the flow by $\\theta$ as $C_P=C_1\\theta+C_2\\theta^2+C_3\\theta^3$ (NACA Report 1135, eq. 152), in the plane normal to the leading edge. At angle of attack $\\alpha$ the two faces of a single wedge turn the flow by $\\delta+\\alpha$ and $\\delta-\\alpha$; the pressure difference is $2\\alpha\\,C_P\\prime(\\delta)$, against $2\\alpha C_1$ for a flat plate. Their ratio is the normal-force multiplier. The wave-drag increment is the zero-incidence pressure on both faces times their slope; it is carried to free-stream conditions by simple sweep theory.',
      steps: [
        { label: 'Mach number normal to the leading edge', lhs: 'M_N', eq: 'M_\\infty\\cos\\Lambda', sub: `${n(v.M)}\\cos${n(v.sweep)}^{\\circ}`, res: n(o.MN) },
        { label: 'Busemann coefficients', lhs: '\\beta', eq: 'M_N^2-1', res: n(c.beta2) },
        { lhs: 'C_1', eq: '\\frac{2}{\\sqrt{\\beta}}', res: n(c.C1) },
        { lhs: 'C_2', eq: '\\frac{(\\gamma+1)M_N^4-4\\beta}{2\\beta^2}', res: n(c.C2) },
        { lhs: 'C_3', eq: '\\frac{1}{\\beta^{7/2}}\\left[\\frac{(\\gamma+1)^2M_N^8}{16}-\\frac{(7+12\\gamma-3\\gamma^2)M_N^6}{12}+\\frac{3(\\gamma+1)M_N^4}{2}-2M_N^2+\\frac43\\right]', res: n(c.C3) },
        { label: 'Normal-force multiplier', lhs: 'K_W', eq: '1+2\\frac{C_2}{C_1}\\delta+3\\frac{C_3}{C_1}\\delta^2', sub: `1+2\\times\\frac{${n(c.C2)}}{${n(c.C1)}}\\times${n(d)}+3\\times\\frac{${n(c.C3)}}{${n(c.C1)}}\\times${n(d)}^2`, res: n(o.K, 4) },
        { label: 'Face pressure coefficient at zero incidence', lhs: 'C_P(\\delta)', eq: 'C_1\\delta+C_2\\delta^2+C_3\\delta^3', res: n(o.cpFace) },
        { label: 'Wave-drag increment on the fin area', lhs: '\\Delta C_{DW}', eq: '2\\delta\\,C_P(\\delta)\\cos^3\\Lambda', sub: `2\\times${n(d)}\\times${n(o.cpFace)}\\times\\cos^3${n(v.sweep)}^{\\circ}`, res: n(o.CDw, 4) },
        { label: 'On the rocket reference area', lhs: '\\Delta C_D', eq: '\\frac{N\\,S\\,\\Delta C_{DW}}{S_{ref}}', sub: `\\frac{${n(v.N)}\\times${R.v(out.p.S, AREA)}\\times${n(o.CDw, 4)}}{${R.v(out.p.Sref, AREA)}}`, res: n(o.CDvehicle, 4) },
        { label: 'Shock-detachment limit (exact $\\theta$–$\\beta$–$M$ relation)', lhs: '\\delta_{max}', eq: '\\max_{\\beta_s}\\arctan\\left[2\\cot\\beta_s\\frac{M_N^2\\sin^2\\beta_s-1}{M_N^2(\\gamma+\\cos2\\beta_s)+2}\\right]', res: `${n(o.thetaMax / d2r)}^{\\circ}` },
      ],
    }];
  },
  references: ['single-wedge-airfoil'],
  examples: [
    { name: '5° wedge, unswept, Mach 3', values: { M: 3, sweep: 0, delta: 5, alpha: 4, N: 4, cR: 10, cT: 4, b: 5, bodyR: 3 } },
    { name: '10° wedge at Mach 2', values: { M: 2, sweep: 0, delta: 10, alpha: 4, N: 4, cR: 10, cT: 4, b: 5, bodyR: 3 } },
    { name: 'Swept 45°, Mach 4, 4° wedge', values: { M: 4, sweep: 45, delta: 4, alpha: 4, N: 3, cR: 12, cT: 4, b: 6, bodyR: 3 } },
    { name: 'Expansion on the upper face: 3° wedge at 8°, Mach 2.5', values: { M: 2.5, sweep: 0, delta: 3, alpha: 8 } },
    { name: 'Thick wedge at Mach 1.6: the shock detaches', values: { M: 1.6, sweep: 0, delta: 9, alpha: 6 } },
  ],
};
