// Fin Flutter Margin — UI definition.
import { flutter, H_TROPO } from '../calc/flutter.js';
import { s, fmt } from '../util.js';
import { dim, path, text } from '../ui/svg.js';

const LEN = { dim: 'length', internal: 'in' };
const ALT = { dim: 'altitude', internal: 'ft' };
const MOD = { dim: 'modulus', internal: 'psi' };

export default {
  slug: 'fin-flutter',
  topic: 'fin-aeroelasticity',
  title: 'Fin Flutter Margin',
  subtitle: 'Will your fins flutter? A quick <b>bending-torsion flutter</b> check from planform, thickness, material stiffness and flight condition (NACA TN-4197).',
  intro: {
    what: 'Estimates the Mach number at which a fin panel would flutter, and the margin of safety against the flight Mach number.',
    why: 'Flutter destroys fins in a fraction of a second — the Prospector P-8 was lost this way. Thin, soft, high-aspect-ratio fins are most at risk.',
    when: 'Choosing fin thickness and material, and checking the worst point of the trajectory (high speed at low altitude).',
  },
  info: {
    text: [
      'Flutter is a self-excited vibration where the fin’s bending and twisting couple with the airflow and feed energy into each other until the fin fails.',
      'The NACA TN-4197 correlation summarises flight and wind-tunnel experience: the flutter speed scales with the speed of sound and the square root of the material shear modulus, and falls with aspect ratio, thinness and air pressure.',
      'It is a rough approximation intended to keep a designer out of trouble, not a substitute for a flutter analysis or test.',
    ],
    tex: 'M_f=\\sqrt{\\dfrac{G}{X\\,\\frac{\\lambda+1}{2}\\,\\frac{p}{p_0}}},\\qquad X=\\frac{39.3\\,A\\!R^3}{(t/c)^3(A\\!R+2)}',
    steps: [
      'Enter the fin root and tip chords, exposed semispan and thickness.',
      'Panel area, aspect ratio and the chord at 75 % semispan (the effective chord) are computed.',
      'The thickness ratio t/c and aspect ratio give the geometric parameter X.',
      'The pressure ratio at the flight altitude scales the aerodynamic load.',
      'Flutter Mach number follows; the margin of safety compares it with the flight Mach number.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'fin', title: 'Fin panel',
      fields: [
        { id: 'cR', shared: 'finCr', label: 'Root chord', sym: 'c_R', ...LEN, default: 10, min: 0, minExclusive: true,
          info: { text: 'Chord of the fin where it meets the body.', doc: 'geometry' } },
        { id: 'cT', shared: 'finCt', label: 'Tip chord', sym: 'c_T', ...LEN, default: 2, min: 0,
          info: { text: 'Chord at the fin tip. Zero gives a pointed (delta) fin.', doc: 'geometry' } },
        { id: 'b', shared: 'finSpan', label: 'Exposed semispan', sym: 'b', ...LEN, default: 5.5, min: 0, minExclusive: true,
          info: { text: 'Height of the exposed fin from the body surface to the tip.', doc: 'geometry' } },
        { id: 't', shared: 'finT', label: 'Thickness', sym: 't', ...LEN, default: 0.125, min: 0, minExclusive: true, slider: { min: 0.02, max: 0.5 },
          info: { text: 'Fin thickness (assumed uniform). The flutter Mach number rises with (t/c)^1.5, so thickness is the most effective fix.', range: '1/16–1/4 in (1.5–6 mm) plates are common on university rockets.', doc: 'geometry' } },
        { id: 'G', label: 'Shear modulus', sym: 'G', ...MOD, default: 3.8e6, min: 0, minExclusive: true,
          info: { text: 'Shear modulus of the fin material (torsional stiffness). For composites use the in-plane shear modulus of the laminate, which can be far below the tensile modulus.', range: 'Aluminium 6061: 3.8×10⁶ psi (26 GPa). Check your material’s datasheet for others.', doc: 'correlation' } },
      ],
    },
    {
      id: 'flight', title: 'Flight condition',
      fields: [
        { id: 'M', label: 'Flight Mach number', sym: 'M', dim: 'none', default: 0.915, min: 0, minExclusive: true, slider: { min: 0.1, max: 3 },
          info: { text: 'Mach number at the condition being checked — usually maximum velocity (burnout) for low-altitude flights. Use the Atmosphere calculator to convert speed to Mach.', doc: 'margin' } },
        { id: 'h', label: 'Altitude (MSL)', sym: 'h', ...ALT, default: 7686, min: 0, max: 150000,
          info: { text: 'Altitude above sea level at that condition. Higher altitude means lower pressure and a higher flutter Mach number.', doc: 'correlation' } },
        { id: 'Tsl', label: 'Sea-level temperature (pressure ratio)', sym: 'T_{SL}', dim: 'temperature', internal: 'R', units: { si: 'K', us: 'R' }, default: 551.8, min: 350, max: 650,
          info: { text: 'Sea-level temperature used in the pressure ratio. The default 551.8 °R (92 °F) is a hot day; a standard day is 518.67 °R (15 °C).', tex: '\\frac{p}{p_0}=\\Big(1-\\frac{0.0035662\\,h}{T_{SL}}\\Big)^{5.2575}', doc: 'correlation' } },
      ],
    },
  ],
  results: [
    { id: 'MS', label: 'Margin of safety', sym: '\\mathrm{MS}', dim: 'none', key: true, digits: 4,
      status: (v) => (v < 0 ? 'err' : v < 0.5 ? 'warn' : 'ok'),
      note: (v) => (v < 0 ? 'Flutter predicted below the flight Mach number' : v < 0.5 ? 'Positive but thin — consider thicker or stiffer fins' : 'Comfortable margin'),
      info: { text: 'How far the flutter Mach number is above the flight Mach number, as a fraction. Negative means flutter is predicted.', tex: 'MS=\\frac{M_f-M}{M}', doc: 'margin' } },
    { id: 'Mf', label: 'Flutter Mach number', sym: 'M_f', dim: 'none', key: true, digits: 4,
      info: { text: 'Mach number at which the correlation predicts bending-torsion flutter at this altitude.', tex: 'M_f=\\sqrt{G\\big/\\big(X\\tfrac{\\lambda+1}{2}\\tfrac{p}{p_0}\\big)}', doc: 'correlation' } },
    { id: 'tMin', label: 'Thickness for zero margin', sym: 't_{min}', ...LEN, key: true,
      info: { text: 'Fin thickness at which the flutter Mach number equals the flight Mach number (MS = 0), found by inverting the correlation. Add your own margin on top.', doc: 'margin' } },
    { id: 'AR', label: 'Panel aspect ratio', sym: '\\mathit{AR}', dim: 'none', info: { text: 'Semispan squared over panel area (one exposed panel).', tex: 'A\\!R=b^2/S', doc: 'geometry' } },
    { id: 'lambda', label: 'Taper ratio', sym: '\\lambda', dim: 'none', info: { text: 'Tip chord over root chord.', tex: '\\lambda=c_T/c_R', doc: 'geometry' } },
    { id: 'S', label: 'Panel area', sym: 'S', dim: 'area', internal: 'in2', info: { text: 'Area of one exposed panel.', tex: 'S=(c_R+c_T)\\,b/2', doc: 'geometry' } },
    { id: 'c75', label: 'Effective chord (75 % span)', sym: 'c_{0.75}', ...LEN, info: { text: 'Chord at 75 % of the semispan, used for the thickness ratio.', tex: 'c=\\tfrac14c_R+\\tfrac34c_T', doc: 'geometry' } },
    { id: 'tc', label: 'Thickness ratio', sym: 't/c', dim: 'none', digits: 4, info: { text: 'Thickness divided by the effective chord.', doc: 'geometry' } },
    { id: 'X', label: 'Geometric parameter', sym: 'X', dim: 'none', info: { text: 'Combines aspect ratio and thickness ratio.', tex: 'X=\\frac{39.3\\,A\\!R^3}{(t/c)^3(A\\!R+2)}', doc: 'correlation' } },
    { id: 'pr', label: 'Pressure ratio', sym: 'p/p_0', dim: 'none', digits: 4, info: { text: 'Static pressure at altitude divided by sea-level pressure.', doc: 'correlation' } },
  ],
  compute(v) {
    const o = flutter(v);
    const warnings = [];
    if (o.MS < 0) warnings.push({ level: 'err', text: `<b>Flutter predicted.</b> $M_{f}$ = ${fmt(o.Mf, { digits: 3 })} is below the flight Mach number. Increase thickness to at least ${fmt(o.tMin, { digits: 3 })} in, use a stiffer material, or reduce the span.` });
    if (o.tc > 0.15) warnings.push({ level: 'info', text: 'Thickness ratio above 15 % — outside the thin-fin experience the correlation was built on.' });
    return { results: o, warnings, o };
  },
  plots: [
    {
      id: 'altitude', title: 'Flutter Mach number vs altitude',
      info: { text: 'The flutter boundary rises as the air thins. Fins are most at risk at high Mach number low in the atmosphere. The dot is your check point.', doc: 'margin' },
      build(v, out, { U }) {
        const uh = U(ALT);
        const hmax = Math.max(60000, v.h * 1.6);
        const pts = Array.from({ length: 101 }, (_, i) => { const h = (hmax * i) / 100; return [uh.v(h), flutter({ ...v, h }).Mf]; });
        return { x: { label: 'Altitude', unit: uh.label }, y: { label: 'Mach number' }, includeZero: true,
          series: [{ name: 'Flutter Mach $M_f$', points: pts, area: true }],
          hlines: [{ y: v.M, label: `flight M = ${fmt(v.M, { digits: 3 })}`, color: 'var(--accent)' }],
          markers: [{ x: uh.v(v.h), y: out.o.Mf, label: `M_f = ${fmt(out.o.Mf, { digits: 3 })}` }] };
      },
    },
    {
      id: 'thickness', title: 'Margin of safety vs fin thickness',
      info: { text: 'Margin grows quickly with thickness (M_f ∝ (t/c)^1.5). The red line is zero margin.', doc: 'margin' },
      build(v, out, { U }) {
        const ul = U(LEN);
        const tmax = Math.max(2 * v.t, 1.5 * out.o.tMin);
        const pts = Array.from({ length: 101 }, (_, i) => { const t = tmax * (0.05 + (0.95 * i) / 100); return [ul.v(t), flutter({ ...v, t }).MS]; });
        return { x: { label: 'Fin thickness', unit: ul.label }, y: { label: 'Margin of safety' },
          series: [{ name: 'MS(t)', points: pts }],
          hlines: [{ y: 0, label: 'flutter boundary', color: 'var(--err)' }],
          vlines: [{ x: ul.v(out.o.tMin), label: 't_{min} (MS = 0)', color: 'var(--text-3)' }],
          markers: [{ x: ul.v(v.t), y: out.o.MS, label: 'your fin' }] };
      },
    },
  ],
  schematicTitle: 'Fin planform and section at 75 % span',
  schematicHint: 'Drag the corners to reshape the fin',
  schematic(ctx, v, out) {
    const W = 760, H = 330;
    const fr = ctx.frame({ width: W, height: H, label: 'Fin planform' });
    const g = fr.layer('main'); g.replaceChildren();
    const u = ctx.U(LEN), L = (x) => `${fmt(u.v(x), { digits: 3 })} ${u.label}`;
    const k = Math.min(350 / Math.max(v.cR, v.cT, 1e-9), 200 / v.b);
    const bodyY = 250, xTE = 60 + v.cR * k;     // trailing edge unswept (drawing convention)
    const P = (x, y) => [xTE - (v.cR - x) * k, bodyY - y * k];
    const rootLE = P(0, 0), rootTE = P(v.cR, 0), tipTE = [xTE, bodyY - v.b * k], tipLE = [xTE - v.cT * k, bodyY - v.b * k];
    // body
    g.append(s('rect', { x: 20, y: bodyY, width: 440, height: 30, class: 'sc-body-2' }));
    g.append(text(28, bodyY + 20, 'body', { cls: 'sc-dim-text', size: 10 }));
    g.append(s('path', { class: 'sc-body', d: path([rootLE, rootTE, tipTE, tipLE], true), 'data-field': 'cR cT b' }));
    // 75 % span chord
    const y75 = 0.75 * v.b, le75 = rootLE[0] + (tipLE[0] - rootLE[0]) * 0.75;
    g.append(s('line', { x1: le75, x2: xTE, y1: bodyY - y75 * k, y2: bodyY - y75 * k, class: 'sc-accent2', 'stroke-dasharray': '5 3', 'data-field': 't' }));
    g.append(text(le75 - 6, bodyY - y75 * k + 4, 'c(0.75)', { anchor: 'end', size: 11, field: 't' }));
    // dimensions
    g.append(dim(fr, rootLE[0], bodyY, rootTE[0], bodyY, `c_R = ${L(v.cR)}`, { off: 46, textOff: 14, field: 'cR' }));
    g.append(dim(fr, tipLE[0], tipLE[1], tipTE[0], tipTE[1], `c_T = ${L(v.cT)}`, { off: -16, field: 'cT' }));
    g.append(dim(fr, xTE, bodyY, xTE, tipTE[1], `b = ${L(v.b)}`, { off: 22, field: 'b' }));
    g.append(text(20, H - 6, 'Trailing edge drawn unswept; sweep does not enter the correlation.', { cls: 'sc-dim-text', size: 10 }));
    // section inset
    const sx = 560, sw = 180, sy = 150, c = out.o.c75, ks = sw / c, th = Math.max(1.5, v.t * ks);
    g.append(s('rect', { x: sx - 10, y: 60, width: sw + 20, height: 170, rx: 8, fill: 'var(--surface-2)', stroke: 'var(--border)' }));
    g.append(text(sx, 80, 'SECTION AT 75 % SPAN (to scale)', { cls: 'sc-dim-text', size: 10 }));
    g.append(s('path', { class: 'sc-body', 'data-field': 't', d: `M${sx + th / 2},${sy - th / 2} L${sx + sw},${sy - th / 2} L${sx + sw},${sy + th / 2} L${sx + th / 2},${sy + th / 2} A${th / 2},${th / 2} 0 0 1 ${sx + th / 2},${sy - th / 2} Z` }));
    g.append(dim(fr, sx, sy + th / 2, sx + sw, sy + th / 2, `c = ${L(c)}`, { off: 26, textOff: 14 }));
    g.append(text(sx, sy - th / 2 - 12, `t = ${L(v.t)}  ·  t/c = ${fmt(out.o.tc, { digits: 3 })}`, { size: 11, field: 't' }));
    const st = out.o.MS < 0 ? 'var(--err)' : out.o.MS < 0.5 ? 'var(--warn)' : 'var(--ok)';
    g.append(s('text', { x: sx, y: 218, style: `fill:${st};font:600 13px var(--font-sans)` }, `MS = ${fmt(out.o.MS, { digits: 3 })}`));
    // handles
    ctx.handle('tip', tipLE[0], tipLE[1], {
      field: 'cT b', title: 'Drag to change tip chord (horizontal) and span (vertical)',
      onDrag: (px, py) => { ctx.setValue('b', Math.max(0.05 * v.cR, (bodyY - py) / k), { round: 0.05 }); ctx.setValue('cT', Math.max(0, Math.min(3 * v.cR, (xTE - px) / k)), { round: 0.05 }); },
      onKey: (dx, dy) => { if (dy) ctx.setValue('b', v.b * (1 + 0.02 * dy)); if (dx) ctx.setValue('cT', Math.max(0, v.cT * (1 - 0.02 * dx))); },
    });
    ctx.handle('root', rootLE[0], rootLE[1], {
      field: 'cR', title: 'Drag horizontally to change the root chord',
      onDrag: (px) => ctx.setValue('cR', Math.max(0.1, (xTE - px) / k), { round: 0.05 }),
      onKey: (dx) => ctx.setValue('cR', v.cR * (1 - 0.02 * dx)),
    });
  },
  reportNotes: ['The NACA TN-4197 correlation is an approximate design guide; confirm critical designs by analysis or test.'],
  symbols: {
    c_R: 'root chord of the fin panel', c_T: 'tip chord', b: 'exposed semispan (body surface to tip)', t: 'fin thickness', G: 'shear modulus of the fin material',
    M: 'flight Mach number', h: 'altitude above sea level', 'T_{SL}': 'sea-level temperature used in the pressure ratio', '\\lambda': 'taper ratio', S: 'area of one exposed panel',
    '\\mathit{AR}': 'panel aspect ratio', 'c_{0.75}': 'chord at 75 % of the semispan', 't/c': 'thickness ratio', X: 'geometric flutter parameter', 'p/p_0': 'ratio of static pressure to sea-level pressure',
    M_f: 'flutter Mach number', '\\mathrm{MS}': 'margin of safety against flutter', 't_{min}': 'thickness giving zero margin', 'X_{crit}': 'value of $X$ at which $M_f=M$', K_X: 'correlation constant (39.3 psi)', k_p: 'lapse constant of the pressure-ratio law',
    h_T: 'tropopause altitude', T_T: 'temperature at the tropopause', g: 'standard gravity', R_a: 'gas constant of air',
  },
  constants: [
    { sym: 'K_X', desc: 'flutter correlation constant', si: [39.3 * 6894.757293, '\\mathrm{Pa}'], us: [39.3, '\\mathrm{psi}'] },
    { sym: 'k_p', desc: 'lapse constant in the pressure ratio', si: [0.0035662 * (5 / 9) / 0.3048, '\\mathrm{K\\,m^{-1}}'], us: [0.0035662, '{}^{\\circ}\\mathrm{R\\,ft^{-1}}'] },
  ],
  report(v, out, R) {
    const o = out.o, n = R.n;
    const Ls = { dim: 'length', internal: 'in' }, As = { dim: 'area', internal: 'in2', units: { si: 'mm2', us: 'in2' } }, H = { dim: 'altitude', internal: 'ft' }, Gs = { dim: 'modulus', internal: 'psi', units: { si: 'Pa', us: 'psi' } }, Ts = { dim: 'temperature', internal: 'R', units: { si: 'K', us: 'R' } };
    const l = (x) => R.v(x, Ls), KX = R.pick(n(39.3 * 6894.757293, 6), '39.3'), kp = R.pick(n(0.0035662 * (5 / 9) / 0.3048, 5), '0.0035662');
    const Xs = R.pick(o.X * 6894.757293, o.X), TT = v.Tsl - 0.0035662 * H_TROPO;
    return [{
      title: 'Theory',
      text: 'Bending–torsion flutter is a self-excited vibration in which the bending and twisting modes of a fin couple with the airflow and draw energy from it. The NACA TN-4197 correlation (D. J. Martin, 1958) summarises flight and wind-tunnel experience: the flutter Mach number $M_f$ of a cantilevered panel rises with the square root of the shear modulus $G$ and with $(t/c)^{3/2}$, and falls with aspect ratio and with air pressure. The thickness ratio is taken at 75 % of the semispan. The margin of safety compares $M_f$ with the flight Mach number $M$.',
      steps: [
        { label: 'Taper ratio', lhs: '\\lambda', eq: '\\frac{c_T}{c_R}', sub: `\\frac{${l(v.cT)}}{${l(v.cR)}}`, res: n(o.lambda) },
        { label: 'Panel area', lhs: 'S', eq: '\\frac{(c_R+c_T)\\,b}{2}', sub: `\\frac{(${l(v.cR)}+${l(v.cT)})\\times${l(v.b)}}{2}`, res: R.Q(o.S, As) },
        { label: 'Panel aspect ratio', lhs: '\\mathit{AR}', eq: '\\frac{b^2}{S}', sub: `\\frac{(${l(v.b)})^2}{${R.v(o.S, As)}}`, res: n(o.AR) },
        { label: 'Chord at 75 % semispan and thickness ratio', lhs: 'c_{0.75}', eq: '\\tfrac14 c_R+\\tfrac34 c_T', sub: `\\tfrac14(${l(v.cR)})+\\tfrac34(${l(v.cT)})`, res: `${R.Q(o.c75, Ls)},\\qquad t/c=\\frac{${l(v.t)}}{${l(o.c75)}}=${n(o.tc)}` },
        { label: 'Geometric flutter parameter', lhs: 'X', eq: '\\frac{K_X\\,\\mathit{AR}^3}{(t/c)^3(\\mathit{AR}+2)}', sub: `\\frac{${KX}\\times${n(o.AR)}^3}{${n(o.tc)}^3\\times(${n(o.AR)}+2)}`, res: `${n(Xs)}\\,${R.pick('\\mathrm{Pa}', '\\mathrm{psi}')}` },
        v.h <= H_TROPO
          ? { label: 'Pressure ratio at the flight altitude', lhs: '\\frac{p}{p_0}', eq: '\\left(1-\\frac{k_p\\,h}{T_{SL}}\\right)^{5.2575}', sub: `\\left(1-\\frac{${kp}\\times${R.v(v.h, H)}}{${R.v(v.Tsl, Ts)}}\\right)^{5.2575}`, res: n(o.pr) }
          : { label: 'Pressure ratio above the tropopause (isothermal layer)', lhs: '\\frac{p}{p_0}', eq: '\\left(\\frac{T_T}{T_{SL}}\\right)^{5.2575}\\exp\\!\\left(-\\frac{g\\,(h-h_T)}{R_a\\,T_T}\\right),\\qquad T_T=T_{SL}-k_p\\,h_T',
            sub: `\\left(\\frac{${R.v(TT, Ts)}}{${R.v(v.Tsl, Ts)}}\\right)^{5.2575}\\exp\\!\\left(-\\frac{${R.pick('9.80665', '32.174')}\\times(${R.v(v.h, H)}-${R.v(H_TROPO, H)})}{${R.pick('287.05', '1716')}\\times${R.v(TT, Ts)}}\\right)`, res: n(o.pr) },
        { label: 'Flutter Mach number', lhs: 'M_f', eq: '\\sqrt{\\frac{G}{X\\,\\frac{\\lambda+1}{2}\\,\\frac{p}{p_0}}}', sub: `\\sqrt{\\frac{${R.v(v.G, Gs)}}{${n(Xs)}\\times\\frac{${n(o.lambda)}+1}{2}\\times${n(o.pr)}}}`, res: n(o.Mf, 4) },
        { label: 'Margin of safety', lhs: '\\mathrm{MS}', eq: '\\frac{M_f-M}{M}', sub: `\\frac{${n(o.Mf)}-${n(v.M)}}{${n(v.M)}}`, res: n(o.MS, 4), note: o.MS < 0 ? 'The margin is negative: flutter is predicted below the flight Mach number.' : 'The margin is positive: no flutter is predicted at this condition.' },
        { label: 'Thickness that would give zero margin ($M_f=M$)', lhs: 't_{min}', eq: 'c_{0.75}\\left[\\frac{K_X\\,\\mathit{AR}^3}{X_{crit}(\\mathit{AR}+2)}\\right]^{1/3},\\qquad X_{crit}=\\frac{G}{M^2\\frac{\\lambda+1}{2}\\frac{p}{p_0}}', res: R.Q(o.tMin, Ls) },
      ],
    }];
  },
  references: ['fin-aeroelasticity'],
  examples: [
    { name: 'Gold Rush III, 1/8 in aluminium', values: { cR: 10, cT: 2, b: 5.5, t: 0.125, G: 3.8e6, M: 0.915, h: 7686, Tsl: 551.8 } },
    { name: 'Thin high-aspect fin at Mach 2 (illustrative)', values: { cR: 8, cT: 4, b: 8, t: 0.0625, G: 3.8e6, M: 2.0, h: 3000, Tsl: 518.67 } },
  ],
};
