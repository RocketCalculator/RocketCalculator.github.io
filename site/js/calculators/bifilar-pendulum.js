// Bifilar Pendulum Inertia — UI definition.
import { bifilar, periodRatio } from '../calc/bifilar.js';
import { s, fmt, reducedMotion } from '../util.js';
import { dim, path, text, pointMarker } from '../ui/svg.js';

const D = { dim: 'distance', internal: 'm' };
const T = { dim: 'time', internal: 's' };
const MASS = { dim: 'mass', internal: 'kg' };
const INERTIA = { dim: 'inertia', internal: 'kgm2' };

export default {
  slug: 'bifilar-pendulum',
  topic: 'bifilar-pendulum',
  title: 'Bifilar Pendulum Inertia',
  subtitle: 'Measure a rocket’s <b>pitch/yaw moment of inertia</b> by hanging it level from two wires and timing two kinds of swing.',
  source: 'Bifilar Pendulum memo (2009)',
  verified: { label: 'Checked against memo cases', title: 'Reproduces the memo’s uniform-rod period ratios (0.577 and 1.155) and recovers the rod inertia exactly by both formulas.' },
  intro: {
    what: 'Turns two stopwatch periods — the yaw (twisting) swing and the side-to-side swing — into the as-built moment of inertia.',
    why: 'Pitch/yaw inertia sets the rocket’s short-period dynamics, roll lock-in margins and the response to thrust misalignment.',
    when: 'After assembly, to measure flight hardware the way you weigh it — instead of trusting a component-by-component estimate.',
    typical: 'For a 2.4 m, 20 kg rocket the uniform-rod estimate is mL²/12 = 9.6 kg·m² (k = 0.69 m); the measurement shows how far the real mass distribution departs from it.',
  },
  info: {
    text: [
      'The rocket hangs level from two equal vertical wires a distance $x_1$ and $x_2$ either side of its centre of gravity. Twisted about the vertical axis and released, it oscillates in <b>yaw</b> with a period that depends on its moment of inertia.',
      'The same rig swung sideways as a simple (Galilean) pendulum has a period that depends only on wire length. The ratio of the two periods gives the inertia without needing the wire length or g.',
      '<b>The trap:</b> the two modes are coupled. If their periods are close you will time the wrong one. Keep the wires close to the CG so the yaw period is well above the swing period.',
    ],
    tex: 'I=m\\,x_1x_2\\,\\frac{P_Y^2}{P_G^2}',
    steps: [
      'Hang the rocket level from two equal wires, with its CG between them; mark the CG with a plumb bob.',
      'Yaw it gently (nose and tail opposite sides of the floor line) without displacing the plumb bob; time many cycles → $P_{Y}$.',
      'Swing it sideways as a pendulum (nose and tail moving together); time many cycles → $P_{G}$.',
      'The calculator applies I = m x₁x₂ $P_{Y}$²/$P_{G}$² and cross-checks it with the wire-length formula.',
      'Check the period ratio is not near 1, otherwise the modes may have been confused.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'rocket', title: 'Rocket',
      fields: [
        { id: 'm', label: 'Mass (as hung)', sym: 'm', ...MASS, default: 20, min: 0, minExclusive: true,
          info: { text: 'Total mass of the hardware being measured, including anything attached for the test.', doc: 'analysis' } },
        { id: 'Lrod', label: 'Overall length', sym: 'L', ...D, default: 2.4, min: 0,
          info: { text: 'Used for the drawing and for a uniform-rod comparison (I = mL²/12). Not used in the measurement itself.', doc: 'design' } },
      ],
    },
    {
      id: 'rig', title: 'Rig geometry',
      fields: [
        { id: 'x1', label: 'Forward wire to CG', sym: 'x_1', ...D, default: 0.3, min: 0, minExclusive: true, slider: { min: 0.05, max: 1.5 },
          info: { text: 'Horizontal distance from the CG to the forward wire attachment.', range: 'Keep x₁x₂ small compared with k² so that $P_{Y}$/$P_{G}$ is well above 1.', doc: 'analysis' } },
        { id: 'x2', label: 'Aft wire to CG', sym: 'x_2', ...D, default: 0.3, min: 0, minExclusive: true, slider: { min: 0.05, max: 1.5 },
          info: { text: 'Horizontal distance from the CG to the aft wire attachment. The two need not be equal.', doc: 'analysis' } },
        { id: 'l', label: 'Wire length', sym: 'l', ...D, default: 2.0, min: 0, minExclusive: true,
          info: { text: 'Length of the (equal) suspension wires. Only used for the cross-check and the predicted swing period.', doc: 'analysis' } },
        { id: 'g', label: 'Local gravity', sym: 'g', dim: 'accel', internal: 'ms2', default: 9.80665, min: 9.7, max: 9.84,
          info: { text: 'Local acceleration of gravity (see the Atmosphere & Gravity calculator). Only used in the cross-check.', range: '9.78 m/s² (equator) to 9.83 m/s² (poles).', doc: 'analysis' } },
      ],
    },
    {
      id: 'meas', title: 'Measured periods',
      fields: [
        { id: 'PY', label: 'Yaw period', sym: 'P_Y', ...T, default: 5.87, min: 0, minExclusive: true,
          info: { text: 'Period of the yaw (twisting) oscillation: nose and tail always on opposite sides of the floor line. Time 10 or more cycles and divide.', doc: 'two-modes' } },
        { id: 'PG', label: 'Swing (Galilean) period', sym: 'P_G', ...T, default: 2.84, min: 0, minExclusive: true,
          info: { text: 'Period of the side-to-side pendulum swing: nose and tail on the same side at the same time. Depends only on wire length.', tex: 'P_G=2\\pi\\sqrt{l/g}', doc: 'two-modes' } },
      ],
    },
  ],
  results: [
    { id: 'I_periods', label: 'Moment of inertia', sym: 'I', ...INERTIA, key: true,
      info: { text: 'Pitch/yaw moment of inertia about the CG, from the ratio of the two measured periods (memo result).', tex: 'I=m\\,x_1x_2\\,P_Y^2/P_G^2', doc: 'analysis' } },
    { id: 'k', label: 'Radius of gyration', sym: 'k', ...D, key: true,
      note: (v, o, val) => (val.Lrod > 0 ? `${fmt((100 * v) / val.Lrod, { digits: 3 })} % of length` : ''),
      info: { text: 'Distance at which all the mass could be concentrated to give the same inertia: I = m k².', tex: 'k=\\sqrt{I/m}', doc: 'design' } },
    { id: 'ratio', label: 'Period ratio', sym: 'P_Y/P_G', dim: 'none', key: true, digits: 4,
      status: (r) => (r > 0.8 && r < 1.25 ? 'warn' : 'ok'),
      note: (r) => (r > 0.8 && r < 1.25 ? 'Close to 1 — modes hard to separate' : 'Modes well separated'),
      info: { text: 'Square root of k²/(x₁x₂). Near 1 the yaw and swing modes resonate and are easily confused. (The 0.8–1.25 warning band is this site’s guidance, not a value from the memo.)', tex: '\\frac{P_Y}{P_G}=\\frac{k}{\\sqrt{x_1x_2}}', doc: 'design' } },
    { id: 'I_length', label: 'Inertia from wire length (cross-check)', sym: 'I_l', ...INERTIA,
      info: { text: 'Same yaw dynamics, but using the wire length and g instead of the swing period. Should agree with the main result if the rig is good.', tex: 'I=\\frac{m g x_1x_2P_Y^2}{4\\pi^2 l}', doc: 'analysis' } },
    { id: 'PG_theory', label: 'Predicted swing period', sym: '2\\pi\\sqrt{l/g}', ...T,
      info: { text: 'Galilean pendulum period for the given wire length. Compare with your measured $P_{G}$.', tex: 'P_G=2\\pi\\sqrt{l/g}', doc: 'analysis' } },
    { id: 'PG_error', label: 'Measured vs predicted swing period', dim: 'percent', internal: 'pct',
      info: { text: 'Percentage difference between measured and predicted swing period — a quick check on wire length and timing.', doc: 'analysis' } },
    { id: 'T1', label: 'Forward wire tension', sym: 'T_1', dim: 'force', internal: 'N', info: { text: 'Static tension in the forward wire.', tex: 'T_1=\\frac{m g x_2}{x_1+x_2}', doc: 'analysis' } },
    { id: 'T2', label: 'Aft wire tension', sym: 'T_2', dim: 'force', internal: 'N', info: { text: 'Static tension in the aft wire.', tex: 'T_2=\\frac{m g x_1}{x_1+x_2}', doc: 'analysis' } },
    { id: 'I_rod', label: 'Uniform-rod inertia (same m, L)', ...INERTIA, when: (v) => v.Lrod > 0,
      info: { text: 'Inertia of a uniform rod of the same mass and length, I = mL²/12 — a sanity check on the order of magnitude.', doc: 'design' } },
  ],
  compute(v) {
    const o = bifilar(v);
    const warnings = [];
    if (o.ratio > 0.8 && o.ratio < 1.25) warnings.push({ level: 'warn', text: `$P_{Y}$/$P_{G}$ = ${fmt(o.ratio, { digits: 3 })} is close to 1: the yaw and swing modes are nearly resonant and easy to confuse. Move the wires closer to the CG.` });
    if (Math.abs(o.PG_error) > 0.03) warnings.push({ level: 'info', text: `Measured swing period differs from 2π√(l/g) by ${fmt(100 * o.PG_error, { digits: 2 })} %. Check the wire length and the timing.` });
    if (v.Lrod > 0 && (v.x1 > v.Lrod / 2 || v.x2 > v.Lrod / 2)) warnings.push({ level: 'warn', text: 'A wire is attached beyond the end of the rocket.' });
    return { results: { ...o, PG_error: 100 * o.PG_error }, warnings, o };
  },
  plots: [
    {
      id: 'separation', title: 'Mode separation vs wire spacing',
      info: { text: 'Period ratio for symmetric wires ($x_1$ = $x_2$ = d) with your rocket’s radius of gyration. Ratios near 1 risk timing the wrong mode; the memo recommends wires close to the CG.', doc: 'design' },
      build(v, out, { U }) {
        const ud = U(D), k = out.o.k;
        const dmax = Math.max(2.2 * k, 1.3 * Math.max(v.x1, v.x2));
        const pts = Array.from({ length: 120 }, (_, i) => { const d = dmax * (0.03 + (0.97 * i) / 119); return [ud.v(d), periodRatio(k, d, d)]; });
        return {
          x: { label: 'Wire distance from CG, d', unit: ud.label }, y: { label: 'P_Y/P_G' }, yDomain: [0, Math.min(6, Math.max(3, out.o.ratio * 1.3))],
          series: [{ name: 'P_Y/P_G', points: pts }],
          hlines: [{ y: 1, label: 'resonance (ratio = 1)', color: 'var(--err)' }, { y: 1.25, color: 'var(--warn)' }, { y: 0.8, color: 'var(--warn)' }],
          vlines: [{ x: ud.v(k), label: 'd = k', color: 'var(--text-3)' }],
          markers: [{ x: ud.v(Math.sqrt(v.x1 * v.x2)), y: out.o.ratio, label: 'your rig' }],
        };
      },
    },
    {
      id: 'sensitivity', title: 'Inertia vs measured yaw period',
      info: { text: 'Inertia grows with the square of the yaw period, so a 1 % timing error gives a 2 % inertia error. Time many cycles.', doc: 'analysis' },
      build(v, out, { U }) {
        const ut = U(T), ui = U(INERTIA);
        const pts = Array.from({ length: 61 }, (_, i) => { const p = v.PY * (0.8 + (0.4 * i) / 60); return [ut.v(p), ui.v((v.m * v.x1 * v.x2 * p * p) / (v.PG * v.PG))]; });
        return { x: { label: 'Yaw period P_Y', unit: ut.label }, y: { label: 'Moment of inertia', unit: ui.label },
          series: [{ name: 'I(P_Y)', points: pts }], markers: [{ x: ut.v(v.PY), y: ui.v(out.o.I_periods), label: 'measured' }] };
      },
    },
  ],
  schematicTitle: 'Test rig (side view, wires not to scale) and yaw motion (top view)',
  schematicHint: 'Drag the wire attachments',
  schematic(ctx, v, out) {
    const W = 760, H = 345;
    const fr = ctx.frame({ width: W, height: H, label: 'Bifilar pendulum rig' });
    const g = fr.layer('main'); g.replaceChildren();
    const ud = ctx.U(D), L = v.Lrod > 0 ? v.Lrod : 2.5 * (v.x1 + v.x2);
    // horizontal scale from rocket length; vertical scale compresses the wire if long
    const x0 = 40, wSide = 470, k = wSide / Math.max(L, 2 * Math.max(v.x1, v.x2) * 1.15);
    const cgX = x0 + wSide / 2;                 // CG at the centre of the drawing
    const rocketY = 270, r = Math.max(7, Math.min(18, 0.045 * L * k));
    const wirePx = Math.min(220, Math.max(90, v.l * k * 0.6));
    const ceilY = rocketY - r - wirePx;
    // rocket: nose cone left, body, fins right; CG assumed at mid-length for drawing
    const nose = x0 + wSide / 2 - (L * k) / 2, tail = nose + L * k, nl = Math.min(0.2 * L * k, 6 * r);
    g.append(s('path', { class: 'sc-body', d: `M${nose},${rocketY} Q${nose + nl * 0.55},${rocketY - r} ${nose + nl},${rocketY - r} L${tail},${rocketY - r} L${tail},${rocketY + r} L${nose + nl},${rocketY + r} Q${nose + nl * 0.55},${rocketY + r} ${nose},${rocketY} Z`, 'data-field': 'Lrod' }));
    g.append(s('path', { class: 'sc-body-2', d: path([[tail - 2.2 * r, rocketY - r], [tail, rocketY - 2 * r], [tail, rocketY - r]], true) }));
    g.append(s('path', { class: 'sc-body-2', d: path([[tail - 2.2 * r, rocketY + r], [tail, rocketY + 2 * r], [tail, rocketY + r]], true) }));
    // ceiling
    g.append(s('line', { x1: x0 - 10, x2: x0 + wSide + 10, y1: ceilY, y2: ceilY, class: 'sc-line', 'data-field': 'l' }));
    for (let xx = x0 - 6; xx < x0 + wSide + 10; xx += 14) g.append(s('line', { x1: xx, y1: ceilY, x2: xx + 7, y2: ceilY - 7, class: 'sc-thin', opacity: 0.6 }));
    // wires
    const w1 = cgX - v.x1 * k, w2 = cgX + v.x2 * k;
    for (const [wx, f] of [[w1, 'x1'], [w2, 'x2']]) {
      g.append(s('line', { x1: wx, x2: wx, y1: ceilY, y2: rocketY - r, class: 'sc-line', 'stroke-width': 1.6, 'data-field': `${f} l` }));
      g.append(s('rect', { x: wx - 3, y: rocketY - r - 2, width: 6, height: 2 * r + 4, fill: 'var(--text)', 'data-field': f }));
    }
    // CG + plumb bob
    const bobY = rocketY + r + 30, dimY = rocketY + r + 58;
    g.append(s('line', { x1: cgX, x2: cgX, y1: rocketY, y2: bobY - 8, class: 'sc-thin', 'stroke-dasharray': '3 3' }));
    g.append(s('path', { d: `M${cgX - 5},${bobY - 8} L${cgX + 5},${bobY - 8} L${cgX},${bobY + 2} Z`, class: 'sc-key' }));
    g.append(text(cgX + 10, bobY, 'plumb bob', { size: 10 }));
    g.append(pointMarker(cgX, rocketY, null, { kind: 'cg' }));
    // dimensions
    g.append(dim(fr, w1, dimY, cgX, dimY, `x_1 = ${fmt(ud.v(v.x1), { digits: 3 })} ${ud.label}`, { labelPos: 'before', field: 'x1' }));
    g.append(dim(fr, cgX, dimY, w2, dimY, `x_2 = ${fmt(ud.v(v.x2), { digits: 3 })} ${ud.label}`, { labelPos: 'after', field: 'x2' }));
    for (const wx of [w1, cgX, w2]) g.append(s('line', { x1: wx, x2: wx, y1: rocketY + r + 4, y2: dimY + 5, class: 'sc-thin', opacity: 0.5 }));
    g.append(dim(fr, w2, ceilY, w2, rocketY - r, `l = ${fmt(ud.v(v.l), { digits: 3 })} ${ud.label}`, { off: -(Math.min(70, x0 + wSide - w2 + 30)), field: 'l' }));
    g.append(text(x0, ceilY - 14, `T_1 = ${fmt(ctx.U({ dim: 'force', internal: 'N' }).v(out.o.T1), { digits: 3 })} ${ctx.U({ dim: 'force', internal: 'N' }).label}   T_2 = ${fmt(ctx.U({ dim: 'force', internal: 'N' }).v(out.o.T2), { digits: 3 })} ${ctx.U({ dim: 'force', internal: 'N' }).label}`, { size: 11 }));
    // handles
    ctx.handle('x1', w1, rocketY - r - 18, { field: 'x1', title: 'Drag to move the forward wire', onDrag: (sx) => ctx.setValue('x1', Math.max(0.01, (cgX - sx) / k), { round: 0.005 }), onKey: (dx) => ctx.setValue('x1', v.x1 * (1 - 0.02 * dx)) });
    ctx.handle('x2', w2, rocketY - r - 18, { field: 'x2', title: 'Drag to move the aft wire', onDrag: (sx) => ctx.setValue('x2', Math.max(0.01, (sx - cgX) / k), { round: 0.005 }), onKey: (dx) => ctx.setValue('x2', v.x2 * (1 + 0.02 * dx)) });

    // ---- top view: yaw oscillation animated at the measured period ----
    const tx = 560, tw = 180, tcx = tx + tw / 2, tcy = 170, tk = (tw * 0.92) / Math.max(L, 2 * Math.max(v.x1, v.x2));
    g.append(s('rect', { x: tx, y: 50, width: tw, height: 250, rx: 8, fill: 'var(--surface-2)', stroke: 'var(--border)' }));
    g.append(text(tx + 10, 68, 'TOP VIEW · yaw mode', { cls: 'sc-dim-text', size: 10 }));
    g.append(s('line', { x1: tx + 8, x2: tx + tw - 8, y1: tcy, y2: tcy, class: 'sc-axis' }));
    const body = s('g', {});
    const tl = L * tk, tr = Math.max(4, r * 0.6);
    body.append(s('path', { class: 'sc-body', d: `M${tcx - tl / 2},${tcy} L${tcx - tl / 2 + tl * 0.18},${tcy - tr} L${tcx + tl / 2},${tcy - tr} L${tcx + tl / 2},${tcy + tr} L${tcx - tl / 2 + tl * 0.18},${tcy + tr} Z` }));
    body.append(s('circle', { cx: tcx - v.x1 * tk, cy: tcy, r: 3, fill: 'var(--text)' }), s('circle', { cx: tcx + v.x2 * tk, cy: tcy, r: 3, fill: 'var(--text)' }));
    const amp = 9;
    if (!reducedMotion()) {
      const dur = Math.min(8, Math.max(0.6, v.PY));
      body.append(s('animateTransform', { attributeName: 'transform', type: 'rotate', dur: `${dur}s`, repeatCount: 'indefinite',
        values: `${-amp} ${tcx} ${tcy};${amp} ${tcx} ${tcy};${-amp} ${tcx} ${tcy}`, calcMode: 'spline', keyTimes: '0;0.5;1', keySplines: '0.45 0 0.55 1;0.45 0 0.55 1' }));
    } else body.setAttribute('transform', `rotate(${amp} ${tcx} ${tcy})`);
    g.append(body);
    g.append(pointMarker(tcx, tcy, null, { kind: 'cg' }));
    g.append(text(tx + 10, 280, `P_Y = ${fmt(v.PY, { digits: 3 })} s (animated)`, { cls: 'sc-dim-text', size: 10, field: 'PY' }));
    g.append(text(tx + 10, 294, `I = ${fmt(ctx.U(INERTIA).v(out.o.I_periods), { digits: 4 })} ${ctx.U(INERTIA).label}`, { cls: 'sc-dim-text', size: 10 }));
  },
  reportNotes: ['Equations are evaluated in SI units (kg, m, s); the inputs and results tables use your selected unit system.'],
  report(v, out, R) {
    const o = out.o, n = R.n, q = R.q;
    return [{
      title: 'Theory',
      text: 'The rocket hangs level from two equal vertical wires at distances $x_1$ and $x_2$ either side of its centre of gravity. Static equilibrium gives the wire tensions; for a small yaw angle $\\psi$ the horizontal components of the tensions produce a restoring torque $mg\\psi x_1x_2/l$, so the yaw natural frequency is $\\omega_Y^2=mgx_1x_2/(Il)$. The same rig swung sideways is a simple pendulum with $\\omega_G^2=g/l$. Dividing the two eliminates $g/l$ (C. P. Hoult, Moment of Inertia Measurement with a Bifilar Pendulum, 2009).',
      steps: [
        { label: 'Wire tensions (statics)', lhs: 'T_1', eq: '\\frac{m g\\,x_2}{x_1+x_2}', sub: `\\frac{${n(v.m)}\\times${n(v.g)}\\times${n(v.x2)}}{${n(v.x1)}+${n(v.x2)}}`, res: `${q(o.T1, 'N')},\\quad T_2=${q(o.T2, 'N')}` },
        { label: 'Moment of inertia from the two measured periods', lhs: 'I', eq: 'm\\,x_1x_2\\,\\frac{P_Y^2}{P_G^2}', sub: `${n(v.m)}\\times${n(v.x1)}\\times${n(v.x2)}\\times\\frac{${n(v.PY)}^2}{${n(v.PG)}^2}`, res: q(o.I_periods, 'kgm2') },
        { label: 'Cross-check using the wire length', lhs: 'I_l', eq: '\\frac{m g\\,x_1x_2\\,P_Y^2}{4\\pi^2 l}', sub: `\\frac{${n(v.m)}\\times${n(v.g)}\\times${n(v.x1)}\\times${n(v.x2)}\\times${n(v.PY)}^2}{4\\pi^2\\times${n(v.l)}}`, res: q(o.I_length, 'kgm2') },
        { label: 'Predicted swing period (check on wire length and timing)', lhs: 'P_G', eq: '2\\pi\\sqrt{l/g}', sub: `2\\pi\\sqrt{${n(v.l)}/${n(v.g)}}`, res: `${q(o.PG_theory, 's')}\\quad(\\text{measured } ${q(v.PG, 's')},\\ ${n(100 * o.PG_error, 3)}\\%)` },
        { label: 'Radius of gyration', lhs: 'k', eq: '\\sqrt{I/m}', sub: `\\sqrt{${n(o.I_periods)}/${n(v.m)}}`, res: q(o.k, 'm') },
        { label: 'Mode separation (should not be close to 1)', lhs: '\\frac{P_Y}{P_G}', eq: '\\frac{k}{\\sqrt{x_1x_2}}', sub: `\\frac{${n(o.k)}}{\\sqrt{${n(v.x1)}\\times${n(v.x2)}}}`, res: n(o.ratio, 4) },
      ],
    }];
  },
  references: ['bifilar-pendulum'],
  examples: [
    { name: 'Illustrative 2.4 m, 20 kg rocket', values: { m: 20, Lrod: 2.4, x1: 0.3, x2: 0.3, l: 2.0, g: 9.80665, PY: 5.87, PG: 2.84 } },
    { name: 'Poor rig: wires too far apart (near resonance)', values: { m: 20, Lrod: 2.4, x1: 0.62, x2: 0.62, l: 2.0, g: 9.80665, PY: 2.95, PG: 2.84 } },
  ],
};
