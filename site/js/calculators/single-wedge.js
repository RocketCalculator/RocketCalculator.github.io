// Single Wedge Airfoil — UI definition.
import { singleWedge, multiplier, exactMultiplier, maxDeflection, waveDrag, busemann, M_VALID } from '../calc/wedge.js';
import { s, fmt } from '../util.js';
import { path, text } from '../ui/svg.js';

const LEN = { dim: 'length', internal: 'in' };
const AREA = { dim: 'area', internal: 'in2' };
const ANG = { dim: 'angle', internal: 'deg' };
const d2r = Math.PI / 180;

const inputsOf = (v) => ({ M: v.M, delta: v.delta * d2r, sweep: v.sweep * d2r, N: v.N, S: ((v.cR + v.cT) * v.b) / 2, Sref: Math.PI * v.bodyR ** 2 });

export default {
  slug: 'single-wedge',
  topic: 'single-wedge-airfoil',
  title: 'Single Wedge Airfoil',
  subtitle: 'How much extra <b>supersonic fin lift</b> a single-wedge section (sharp edge forward, blunt trailing edge) gives over a flat plate — and what it costs in wave drag.',
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
          info: { text: 'Angle between each face and the chord line, measured in the plane normal to the leading edge. The base (trailing-edge) thickness is $2c\\tan\\delta$.', range: 'Typical 3°–8°.', doc: 'busemann' } },
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
    { id: 'K', label: 'Normal-force multiplier', sym: 'K_W', dim: 'none', key: true, digits: 4,
      status: (x, out) => (!out.o.supersonic ? null : !out.o.attached ? 'err' : !out.o.valid ? 'warn' : 'ok'),
      note: (x, out) => (!out.o.supersonic ? 'subsonic edge — flat-plate value' : !out.o.attached ? 'shock detached' : !out.o.valid ? 'below the valid Mach range' : `exact shock: ${fmt(out.o.Kexact, { digits: 4 })}`),
      info: { text: 'Ratio of the single-wedge to the flat-plate normal-force slope. Multiply the flat-plate fin $C_{N\\alpha}$ by it.', tex: 'K_W=1+2\\frac{C_2}{C_1}\\delta+3\\frac{C_3}{C_1}\\delta^2', doc: 'busemann' } },
    { id: 'CDw', label: 'Wave-drag increment (on fin area)', sym: '\\Delta C_{DW}', dim: 'none', key: true, digits: 4, note: () => 'per unit planform area, stream-wise',
      info: { text: 'Extra wave drag over a flat plate, both faces, referred to the fin planform area and free-stream dynamic pressure.', tex: '\\Delta C_{DW}=2\\delta\\,C_P(\\delta)\\cos^3\\Lambda', doc: 'drag' } },
    { id: 'thetaMax', label: 'Largest half-angle with an attached shock', sym: '\\delta_{max}', ...ANG, key: true, digits: 4,
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
  ],
  compute(v) {
    const p = inputsOf(v), o = singleWedge(p);
    const warnings = [];
    if (!o.supersonic) warnings.push({ level: 'info', text: 'The leading edge is subsonic ($M_N\\le 1$): the normal force is essentially that of a flat plate (multiplier 1) — the blunt trailing edge keeps the Kutta condition. There is still base drag; enter the wedge angle in the drag build-up.' });
    else if (!o.attached) warnings.push({ level: 'err', text: `The shock detaches: at $M_N$ = ${fmt(o.MN, { digits: 3 })} an attached shock allows at most ${fmt(o.thetaMax / d2r, { digits: 3 })}°. Reduce the wedge angle or the sweep — the multiplier is not valid.` });
    else if (!o.valid) warnings.push({ level: 'warn', text: `Below $M_N$ = ${M_VALID} the expansion overstates the multiplier (both linear and higher-order theories are singular at $M_N=1$). Fair it smoothly down to 1 at $M_N=1$.` });
    if (o.attached && o.Kexact != null && Math.abs(o.K - o.Kexact) / o.Kexact > 0.05) warnings.push({ level: 'info', text: `The cubic expansion and the exact shock relations differ by ${fmt((100 * Math.abs(o.K - o.Kexact)) / o.Kexact, { digits: 2 })} % here — the wedge is thick for this Mach number.` });
    const results = {
      K: o.K, CDw: o.CDw, thetaMax: o.thetaMax != null ? o.thetaMax / d2r : null, CDvehicle: o.CDvehicle, MN: o.MN, K2: o.K2, Kexact: o.Kexact,
      CNaFlat: o.CNaFlat, CNaWedge: o.CNaWedge, cpFace: o.cpFace, shockAngle: o.shockAngle != null ? o.shockAngle / d2r : null, S: p.S,
    };
    return { results, warnings, o, p };
  },
  plots: [
    {
      id: 'multiplier', title: 'Normal-force multiplier vs normal Mach number',
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
        return { x: { label: 'Normal Mach number M_N' }, y: { label: 'C_{N\\alpha} ratio' }, yDomain: [0, top],
          series: [{ name: 'cubic (Busemann)', points: K3 }, { name: 'second order', points: K2, dashed: true }, { name: 'exact shock', points: Ke, color: 'var(--text)' }],
          vlines: [{ x: M_VALID, label: `valid above ${M_VALID}`, color: 'var(--text-3)' }],
          markers: out.o.supersonic ? [{ x: out.o.MN, y: out.o.K, label: `K_W = ${fmt(out.o.K, { digits: 3 })}` }] : [] };
      },
    },
    {
      id: 'limit', title: 'Shock-detachment limit',
      info: { text: 'Largest wedge half-angle that supports an attached shock, against the normal Mach number; your wedge angle is the horizontal line. The design point must sit below the curve.', doc: 'limit' },
      build(v, out) {
        const mmax = Math.max(3, out.o.MN * 1.2), pts = [];
        for (let i = 0; i <= 100; i++) { const M = 1.01 + ((mmax - 1.01) * i) / 100; pts.push([M, maxDeflection(M).theta / d2r]); }
        return { x: { label: 'Normal Mach number M_N' }, y: { label: 'Half-angle', unit: '{}^{\\circ}' }, includeZero: true,
          series: [{ name: '\\delta_{max}', points: pts }, { name: 'your $\\delta$', points: [[1.01, v.delta], [mmax, v.delta]], dashed: true, color: 'var(--text-2)' }],
          markers: out.o.supersonic ? [{ x: out.o.MN, y: v.delta, label: 'design' }] : [] };
      },
    },
    {
      id: 'drag', title: 'Wave-drag increment vs Mach number',
      info: { text: 'Extra wave drag of the wedge over a flat plate, on the fin planform area, against free-stream Mach number at your sweep. It does not include the base drag of the blunt trailing edge.', doc: 'drag' },
      build(v, out) {
        const d = v.delta * d2r, c3 = Math.cos(v.sweep * d2r) ** 3, mmax = Math.max(6, v.M * 1.2), pts = [];
        for (let i = 0; i <= 120; i++) {
          const M = 1.05 + ((mmax - 1.05) * i) / 120, MN = M * Math.cos(v.sweep * d2r);
          if (MN > 1.1) pts.push([M, waveDrag(MN, d) * c3]);
        }
        const valid = pts.filter(([M]) => M * Math.cos(v.sweep * d2r) >= M_VALID).map((q) => q[1]);
        const top = 1.3 * Math.max(valid.length ? Math.max(...valid) : 0, out.o.supersonic ? out.o.CDw : 0) || 0.1;
        return { x: { label: 'Mach number' }, y: { label: '\\Delta C_{DW}' }, yDomain: [0, top], series: [{ name: '\\Delta C_{DW}', points: pts }],
          markers: out.o.supersonic ? [{ x: v.M, y: out.o.CDw, label: 'now' }] : [] };
      },
    },
  ],
  schematicTitle: 'Section normal to the leading edge',
  schematicHint: 'Drag the trailing-edge corner to change the wedge angle',
  schematic(ctx, v, out) {
    const W = 760, H = 300, o = out.o;
    const fr = ctx.frame({ width: W, height: H, label: 'Single-wedge section with its oblique shocks' });
    const g = fr.layer('main'); g.replaceChildren();
    const x0 = 130, cy = 140, c = 430, d = Math.min(v.delta, 25) * d2r, ht = c * Math.tan(d), xT = x0 + c;
    // shocks (exact, zero incidence)
    if (o.shockAngle != null) {
      const len = 150, bs = o.shockAngle;
      for (const sg of [-1, 1]) g.append(s('line', { x1: x0, y1: cy, x2: x0 + len * Math.cos(bs), y2: cy + sg * len * Math.sin(bs), class: 'sc-accent', 'stroke-dasharray': '6 3' }));
      g.append(text(x0 + 150 * Math.cos(bs) + 6, cy - 150 * Math.sin(bs), `shock \\beta_s = ${fmt(bs / d2r, { digits: 3 })}°`, { size: 11 }));
    } else if (o.supersonic) {
      g.append(s('path', { d: `M${x0 - 26},${cy - 90} Q${x0 - 50},${cy} ${x0 - 26},${cy + 90}`, class: 'sc-accent', fill: 'none', 'stroke-dasharray': '6 3' }));
      g.append(text(x0 - 40, cy - 100, 'detached shock', { anchor: 'middle', size: 11 }));
    }
    g.append(s('line', { x1: 30, x2: xT + 70, y1: cy, y2: cy, class: 'sc-axis' }));
    g.append(s('path', { class: 'sc-body', d: path([[x0, cy], [xT, cy - ht], [xT, cy + ht]], true), 'data-field': 'delta' }));
    // base region
    g.append(s('rect', { x: xT, y: cy - ht, width: 46, height: 2 * ht, fill: 'var(--surface-2)', stroke: 'none', opacity: 0.8 }));
    g.append(text(xT + 8, cy + ht + 16, 'blunt base', { cls: 'sc-dim-text', size: 10 }));
    // half-angle
    const ar = 90;
    g.append(s('path', { d: `M${x0 + ar},${cy} A${ar},${ar} 0 0 0 ${x0 + ar * Math.cos(d)},${cy - ar * Math.sin(d)}`, class: 'sc-accent', fill: 'none', 'data-field': 'delta' }));
    g.append(text(x0 + ar + 6, cy - ar * Math.tan(d) - 12, `\\delta = ${fmt(v.delta, { digits: 3 })}°`, { size: 12, field: 'delta' }));
    g.append(text(xT - 4, cy - ht - 8, `${o.supersonic ? `\\delta_{max} = ${fmt(o.thetaMax / d2r, { digits: 3 })}°` : ''}`, { anchor: 'end', cls: 'sc-dim-text', size: 10 }));
    // flow
    g.append(s('path', { d: `M30,${cy - 110} L110,${cy - 110}`, class: 'sc-accent', 'marker-end': fr.arrow('acc') }));
    g.append(text(30, cy - 118, `M_N = ${fmt(o.MN, { digits: 3 })}`, { size: 11, field: 'M sweep' }));
    // planform inset with sweep
    const px = 655, py = 272, lam = v.sweep * d2r, sp = 70;
    g.append(s('line', { x1: px - 40, x2: px + 90, y1: py, y2: py, class: 'sc-line' }));
    g.append(s('path', { class: 'sc-body-2', d: path([[px, py], [px + sp * Math.tan(lam), py - sp], [px + sp * Math.tan(lam) + 30, py - sp], [px + 60, py]], true), 'data-field': 'sweep' }));
    g.append(text(px + 25, py + 16, `planform · \\Lambda = ${fmt(v.sweep, { digits: 3 })}°`, { anchor: 'middle', cls: 'sc-dim-text', size: 10, field: 'sweep' }));
    ctx.handle('te', xT, cy - ht, {
      field: 'delta', title: 'Drag up or down to change the wedge half-angle',
      onDrag: (px2, py2) => ctx.setValue('delta', Math.atan2(cy - py2, xT - x0) / d2r, { round: 0.1 }),
      onKey: (dx, dy) => ctx.setValue('delta', v.delta + 0.1 * dy),
    });
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
    { name: '5° wedge, unswept, Mach 3', values: { M: 3, sweep: 0, delta: 5, N: 4, cR: 10, cT: 4, b: 5, bodyR: 3 } },
    { name: '10° wedge at Mach 2', values: { M: 2, sweep: 0, delta: 10, N: 4, cR: 10, cT: 4, b: 5, bodyR: 3 } },
    { name: 'Swept 45°, Mach 4, 4° wedge', values: { M: 4, sweep: 45, delta: 4, N: 3, cR: 12, cT: 4, b: 6, bodyR: 3 } },
  ],
};
