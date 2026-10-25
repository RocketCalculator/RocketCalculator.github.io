// Fin Cant Angle & Roll Rate — UI definition.
import { derivatives, cantForRate, cantForCycles, cantWithLag } from '../calc/cantAngle.js';
import { s, fmt, reducedMotion, InputError } from '../util.js';
import { dim, path, text, finEndView } from '../ui/svg.js';

const LEN = { dim: 'length', internal: 'in' };
const deg = (r) => (r * 180) / Math.PI;

export default {
  slug: 'fin-cant-angle',
  topic: 'fin-setting',
  title: 'Fin Cant Angle & Roll Rate',
  subtitle: 'Strip-theory <b>roll derivatives</b> of a fin set, and the common cant angle that gives a planned roll rate — or a whole number of roll cycles to burnout.',
  intro: {
    what: 'Computes how strongly canted fins drive roll ($C_{L\\delta}$) and how strongly the fins damp it ($C_{Lp}$), then the cant angle needed for your roll target.',
    why: 'A planned roll rate averages out thrust and fin misalignments and reduces dispersion — but rolling near the pitch frequency invites roll lock-in.',
    when: 'Setting fins during assembly with a laser level, or choosing a roll programme for a new design.',
  },
  info: {
    text: [
      'Each fin panel is split into streamwise strips. A strip at radius $y$ sees the fin cant $\\delta$ minus the helix angle of the roll, <i>py/U</i>, and produces a normal force with the same slope <i>$c_{N\\alpha}$</i> everywhere (no tip losses or body interference).',
      'Integrating strip force × radius over the panel gives a rolling moment linear in δ (driving) and in p (damping). Setting the total to zero gives the steady roll rate for a given cant, or the cant for a target rate.',
      'Set <b>all panels to the same cant</b> after nulling each panel’s normal force: for three or more fins this cancels pitch and yaw moments.',
    ],
    tex: 'dL=q\\,y\\,c(y)\\,c_{N\\alpha}\\Big(\\delta-\\frac{py}{U}\\Big)dy,\\qquad c(y)=A-Cy',
    steps: [
      'Enter body radius, fin tip radius (from the body centre line), root and tip chords, the number of fins and the airfoil normal-force slope.',
      'The planform integrals $L_{\\delta}$ and M give the driving and damping derivatives $C_{L\\delta}$ and $C_{Lp}$.',
      'Choose a target: a roll rate at burnout speed, or a whole number of roll cycles from launcher exit to burnout.',
      'The common cant angle follows. In roll-rate mode the roll-inertia lag correction (1 − J) is shown as well.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'fins', title: 'Fin set',
      fields: [
        { id: 'R', shared: 'bodyR', label: 'Body radius', sym: 'R', ...LEN, default: 3.125, min: 0, minExclusive: true,
          info: { text: 'Radius of the body at the fins. The reference area is πR² and the reference length 2R.', doc: 'derivatives' } },
        { id: 'b', shared: { key: 'finSpan', get: (v) => v.b - v.R, set: (v, s) => { v.b = v.R + s; } }, label: 'Fin tip radius (from centre line)', sym: 'b', ...LEN, default: 5.5, min: 0, minExclusive: true,
          info: { text: 'Distance from the body centre line to the fin tip — body radius plus the exposed span.', doc: 'strip-theory' } },
        { id: 'cR', shared: 'finCr', label: 'Root chord', sym: 'c_R', ...LEN, default: 10, min: 0, minExclusive: true, info: { text: 'Fin chord at the body.', doc: 'strip-theory' } },
        { id: 'cT', shared: 'finCt', label: 'Tip chord', sym: 'c_T', ...LEN, default: 2, min: 0, info: { text: 'Fin chord at the tip.', doc: 'strip-theory' } },
        { id: 'N', backView: (v) => ({ R: v.R, span: v.b - v.R, nominal: { t: true }, unit: LEN, range: [3, 8], note: 'Driving and damping moments both scale with N, so the steady cant angle for a roll rate does not depend on N; the roll-inertia lag does.' }), shared: 'finN', label: 'Number of fins', sym: 'N', dim: 'none', default: 4, min: 1, max: 12,
          info: { text: 'Number of identical panels. Three or more set to a common cant give zero net pitch/yaw moment.', doc: 'fin-adjustment' } },
        { id: 'cNa', label: 'Airfoil normal-force slope', sym: 'c_{N\\alpha}', dim: 'perAngle', internal: 'perrad', default: 3.5, min: 0, minExclusive: true,
          info: { text: 'Section lift-curve slope of a strip, per radian. Thin-airfoil theory gives 2π subsonic and 4/√(M²−1) supersonic; a panel average lower than 2π accounts for root and tip losses.', doc: 'strip-theory' } },
      ],
    },
    {
      id: 'target', title: 'Roll target',
      fields: [
        { id: 'mode', label: 'Design for', kind: 'select', default: 'rate', options: [{ value: 'rate', label: 'Roll rate at burnout' }, { value: 'cycles', label: 'Whole roll cycles to burnout' }],
          info: { text: 'Roll rate: steady-state cant for a chosen spin rate at burnout speed. Roll cycles: cant that makes the rocket roll a whole number of turns between launcher exit and burnout, which best cancels body-fixed misalignments.', doc: 'roll-rate-selection' } },
        { id: 'f', label: 'Roll rate at burnout', sym: 'p', dim: 'frequency', default: 1.24, min: 0, when: (v) => v.mode === 'rate', slider: { min: 0, max: 5 },
          info: { text: 'Desired spin rate at burnout — about 0.3 × the burnout pitch natural frequency is a good target.', range: 'Keep it well below the pitch frequency (≤ 30–40 %) to avoid roll lock-in.', doc: 'roll-rate-selection' } },
        { id: 'V', label: 'Burnout speed', sym: 'U', dim: 'speed', internal: 'fts', default: 1037.2, min: 0, minExclusive: true, when: (v) => v.mode === 'rate',
          info: { text: 'Flight speed at which the roll rate should be reached (from a trajectory simulation).', doc: 'strip-theory' } },
        { id: 'Mc', label: 'Roll cycles to burnout', sym: 'M', dim: 'none', default: 4, min: 0, minExclusive: true, when: (v) => v.mode === 'cycles',
          info: { text: 'Number of complete turns between launcher exit and burnout. Use at least 2–3; more is better.', doc: 'roll-rate-selection' } },
      ],
    },
    {
      id: 'boost', title: 'Roll inertia & boost',
      fields: [
        { id: 'Ixx', label: 'Roll moment of inertia', sym: 'I_{xx}', dim: 'inertia', internal: 'slugft2', default: 0.22, min: 0, minExclusive: true,
          info: { text: 'Moment of inertia about the long axis (burnout value).', doc: 'roll-rate-selection' } },
        { id: 'rho', label: 'Air density', sym: '\\rho', dim: 'density', internal: 'slugft3', default: 0.0023, min: 0, minExclusive: true,
          info: { text: 'Representative air density during the boost (see the Atmosphere calculator).', doc: 'roll-rate-selection' } },
        { id: 'h', label: 'Burnout altitude (AGL)', sym: 'h', dim: 'altitude', internal: 'ft', default: 2000, min: 0, minExclusive: true,
          info: { text: 'Height above the launcher at burnout.', doc: 'roll-rate-selection' } },
        { id: 'L', label: 'Launcher length', sym: 'L', dim: 'distance', internal: 'ft', default: 18, min: 0,
          info: { text: 'Rail length: roll starts building once the rocket leaves the launcher.', doc: 'roll-rate-selection' } },
      ],
    },
  ],
  results: [
    { id: 'deltaDeg', label: 'Cant angle (each fin)', sym: '\\delta', dim: 'angle', key: true, digits: 4,
      note: (v, o, val) => (val.mode === 'rate' ? 'steady state' : `${fmt(val.Mc, { digits: 3 })} roll cycles to burnout`),
      info: (val) => ({ text: val.mode === 'rate' ? 'Common cant angle that makes driving and damping balance at the target roll rate and speed.' : 'Common cant angle that gives the requested number of roll cycles between launcher exit and burnout.',
        tex: val.mode === 'rate' ? '\\delta=-\\frac{p}{U}\\,\\frac{M}{L_\\delta}' : '\\delta=-\\frac{2\\pi M_c R\\,C_{Lp}}{N C_{L\\delta}\\left[h-L+k\\ln\\frac{h-L-k}{-k}\\right]}', doc: val.mode === 'rate' ? 'fin-adjustment' : 'roll-rate-selection' }) },
    { id: 'deltaLagDeg', label: 'Cant incl. roll-inertia lag', sym: '\\delta(1-J)', dim: 'angle', key: true, digits: 4, when: (v) => v.mode === 'rate',
      note: (v, o) => `J = ${fmt(o.lag.J, { digits: 3 })}`,
      info: { text: 'Cant angle for the target roll rate including the lag caused by roll inertia during the boost.', tex: '\\delta=-\\frac{pR\\,C_{Lp}}{NUC_{L\\delta}}(1-J),\\quad J=\\frac{I_{xx}}{2\\pi\\rho(h-L)R^4C_{Lp}}', doc: 'fin-adjustment' } },
    { id: 'CLd', label: 'Roll-driving derivative (one fin)', sym: 'C_{L\\delta}', dim: 'perAngle', internal: 'perrad', key: true,
      info: { text: 'Rolling-moment coefficient per radian of cant on a single panel, referenced to πR² and 2R.', tex: 'C_{L\\delta}=\\frac{c_{N\\alpha}(b-R)}{2\\pi R^3}\\Big[\\frac{A(b+R)}{2}-\\frac{C(b^2+bR+R^2)}{3}\\Big]', doc: 'derivatives' } },
    { id: 'CLp', label: 'Roll-damping derivative (all fins)', sym: 'C_{Lp}', dim: 'none', key: true,
      info: { text: 'Rolling-moment coefficient per unit pR/U for all N panels (negative: it opposes the roll).', tex: 'C_{Lp}=\\frac{c_{N\\alpha}(b-R)N}{2\\pi R^4}\\Big[-\\frac{A(b^2+bR+R^2)}{3}+\\frac{C(b^3+b^2R+bR^2+R^3)}{4}\\Big]', doc: 'derivatives' } },
    { id: 'Ycp', label: 'Spanwise CP of cant load', sym: 'Y_{CP}', ...LEN, info: { text: 'Radius from the centre line at which the normal force due to cant acts.', tex: 'Y_{CP}=\\frac{3A(b+R)-2C(b^2+bR+R^2)}{6A-3C(b+R)}', doc: 'strip-theory' } },
    { id: 'Ld', label: 'Planform integral', sym: 'L_\\delta', dim: 'area', internal: 'in2', info: { text: '$L_{\\delta}$ = A(b+R)/2 − C(b²+bR+R²)/3, i.e. ∫ y c dy /(b − R).', doc: 'strip-theory' } },
    { id: 'M', label: 'Planform integral', sym: 'M', dim: 'volume', internal: 'in3', info: { text: 'M = −A(b²+bR+R²)/3 + C(b³+b²R+bR²+R³)/4, i.e. −∫ y² c dy /(b − R).', doc: 'strip-theory' } },
    { id: 'pV', label: 'Helix parameter', sym: 'p/U', dim: 'wavenumber', internal: 'perft', when: (v) => v.mode === 'rate', info: { text: 'Roll rate divided by speed: the twist of the helical path of a fin tip, per unit length.', doc: 'fin-adjustment' } },
    { id: 'k', label: 'Roll-lag length', sym: 'k', dim: 'distance', internal: 'ft', when: (v) => v.mode === 'cycles', info: { text: '$k = I_{xx}/(2\\pi\\rho R^4C_{Lp})$: the distance scale over which roll inertia delays the roll rate.', doc: 'roll-rate-selection' } },
    { id: 'brkt', label: 'Effective roll distance', sym: 'h-L+k\\ln\\frac{h-L-k}{-k}', dim: 'distance', internal: 'ft', when: (v) => v.mode === 'cycles', info: { text: 'h − L + k ln((h − L − k)/(−k)): flight distance after launcher exit, reduced by the roll lag.', doc: 'roll-rate-selection' } },
  ],
  compute(v, { compat }) {
    const d = derivatives(v, { compat });
    const warnings = [];
    if (v.b <= v.R) throw new InputError('The fin tip radius b must be larger than the body radius R.');
    let res, lag = null;
    if (v.mode === 'cycles') {
      res = cantForCycles(v, d, v);
      if (!Number.isFinite(res.delta)) warnings.push({ level: 'err', text: 'The roll-cycle bracket is not defined for these inputs (check h > L).' });
    } else {
      res = cantForRate(v, d);
      lag = cantWithLag(v, d, v);
    }
    if (Math.abs(res.deltaDeg) > 3) warnings.push({ level: 'warn', text: 'More than 3° of cant: strip theory and small-angle assumptions become questionable, and cant drag grows.' });
    return { results: { ...d, ...res, deltaLagDeg: lag?.deltaDeg, pV: res.pV != null ? res.pV * 12 : undefined }, warnings, d, res, lag };
  },
  plots: [
    {
      id: 'alpha', title: 'Strip angle of attack along the span', when: (v) => v.mode === 'rate',
      info: { text: 'In steady roll each strip sees α = δ − py/U. Inboard strips still drive the roll, outboard strips damp it, and the total moment is zero.', doc: 'strip-theory' },
      build(v, out, { U }) {
        if (v.mode !== 'rate') return null;
        const ul = U(LEN), p = out.res.p, Uips = 12 * v.V;
        const pts = Array.from({ length: 41 }, (_, i) => { const y = v.R + ((v.b - v.R) * i) / 40; return [ul.v(y), deg(out.res.delta - (p * y) / Uips)]; });
        return { x: { label: 'Radius from centre line, y', unit: ul.label }, y: { label: 'Strip angle of attack', unit: '°' },
          series: [{ name: '\\alpha(y)', points: pts, area: true }], hlines: [{ y: 0, color: 'var(--text-3)' }],
          vlines: [{ x: ul.v(out.d.Ycp), label: 'Y_{CP}', color: 'var(--accent-2)' }] };
      },
    },
    {
      id: 'rate', title: 'Cant angle vs target roll rate', when: (v) => v.mode === 'rate',
      info: { text: 'Steady-state cant and the version including roll-inertia lag. Both grow linearly with roll rate.', doc: 'fin-adjustment' },
      build(v, out) {
        if (v.mode !== 'rate') return null;
        const fmax = Math.max(2 * v.f, 1);
        const st = [], lg = [];
        for (let i = 0; i <= 40; i++) {
          const f = (fmax * i) / 40;
          st.push([f, cantForRate({ ...v, f }, out.d).deltaDeg]);
          lg.push([f, cantWithLag({ ...v, f }, out.d, v).deltaDeg]);
        }
        return { x: { label: 'Roll rate at burnout', unit: 'Hz' }, y: { label: 'Cant angle', unit: '°' }, includeZero: true,
          series: [{ name: 'steady state', points: st }, { name: 'with inertia lag (1 − J)', points: lg, dashed: true }],
          markers: [{ x: v.f, y: out.res.deltaDeg, label: `${fmt(out.res.deltaDeg, { digits: 3 })}°` }] };
      },
    },
    {
      id: 'cycles', title: 'Cant angle vs roll cycles to burnout', when: (v) => v.mode === 'cycles',
      info: { text: 'Cant angle needed for each whole number of roll cycles between launcher exit and burnout.', doc: 'roll-rate-selection' },
      build(v, out) {
        if (v.mode !== 'cycles') return null;
        const pts = Array.from({ length: 10 }, (_, i) => [i + 1, cantForCycles({ ...v, Mc: i + 1 }, out.d, v).deltaDeg]);
        return { x: { label: 'Roll cycles to burnout' }, y: { label: 'Cant angle', unit: '°' }, includeZero: true,
          series: [{ name: '\\delta(M)', points: pts }], markers: [{ x: v.Mc, y: out.res.deltaDeg, label: `${fmt(out.res.deltaDeg, { digits: 3 })}°` }] };
      },
    },
  ],
  schematicTitle: 'Fin planform (side) and rear view',
  schematicHint: 'Rear view spins at the roll rate',
  schematic(ctx, v, out) {
    const W = 760, H = 330;
    const fr = ctx.frame({ width: W, height: H, label: 'Fin planform and rear view' });
    const g = fr.layer('main'); g.replaceChildren();
    const u = ctx.U(LEN), L = (x) => `${fmt(u.v(x), { digits: 3 })} ${u.label}`;
    // ---- side view: fin from y = R to b above the centre line, TE unswept (drawing convention)
    const k = Math.min(360 / Math.max(v.cR, v.cT), 250 / v.b);
    const axisY = 290, xTE = 70 + v.cR * k;
    const Y = (y) => axisY - y * k;
    const rootLE = [xTE - v.cR * k, Y(v.R)], tipLE = [xTE - v.cT * k, Y(v.b)];
    g.append(s('rect', { x: 20, y: Y(v.R), width: xTE + 30 - 20, height: v.R * k, class: 'sc-body-2', 'data-field': 'R' }));
    g.append(s('line', { x1: 14, x2: xTE + 40, y1: axisY, y2: axisY, class: 'sc-axis' }));
    g.append(s('path', { class: 'sc-body', d: path([rootLE, [xTE, Y(v.R)], [xTE, Y(v.b)], tipLE], true), 'data-field': 'cR cT b' }));
    // CP strip
    const yc = out.d.Ycp, cAt = (y) => v.cR + ((v.cT - v.cR) * (y - v.R)) / (v.b - v.R);
    g.append(s('rect', { x: xTE - cAt(yc) * k, y: Y(yc) - 3, width: cAt(yc) * k, height: 6, fill: 'var(--accent)', opacity: 0.8 }));
    g.append(text(xTE - cAt(yc) * k - 6, Y(yc) + 4, 'Y_{CP}', { anchor: 'end', size: 11 }));
    g.append(dim(fr, rootLE[0], Y(v.R), xTE, Y(v.R), `c_R = ${L(v.cR)}`, { off: 18, textOff: 14, field: 'cR' }));
    g.append(dim(fr, tipLE[0], Y(v.b), xTE, Y(v.b), `c_T = ${L(v.cT)}`, { off: -14, field: 'cT' }));
    g.append(dim(fr, xTE, axisY, xTE, Y(v.b), `b = ${L(v.b)}`, { off: 24, field: 'b' }));
    g.append(dim(fr, 34, axisY, 34, Y(v.R), `R = ${L(v.R)}`, { off: 0, field: 'R' }));
    // ---- rear view, spinning
    const cx = 652, cy = 165, size = 96;
    const dd = Math.max(0.06, Math.min(0.5, Math.abs(out.res.delta) * 25)) * Math.sign(out.res.delta || 1);   // cant exaggerated
    const f = v.mode === 'rate' ? v.f : null, slow = f > 0.5 ? Math.ceil(f / 0.5) : 1;
    const spin = f && !reducedMotion() ? { dur: slow / f, dir: out.res.delta >= 0 ? 1 : -1 } : null;
    g.append(finEndView(cx, cy, size, { N: v.N, r: v.R, s: v.b, cant: dd, cR: v.cR, cT: v.cT, spin, field: 'N',
      caption: [`${v.N} fin${v.N === 1 ? '' : 's'} · rear view`, f ? `${fmt(f, { digits: 3 })} Hz${slow > 1 ? ` (shown ${slow}× slower)` : ''}` : null].filter(Boolean) }));
    g.append(text(cx, cy - size - 30, `\\delta = ${fmt(out.res.deltaDeg, { digits: 3 })}° per fin (cant drawn ×25)`, { anchor: 'middle', size: 11 }));
    // roll arrow
    const ar = size + 16;
    // counter-clockwise on screen for δ ≥ 0 (matches the spin), over the top of the view
    const [a0, a1, sw] = out.res.delta >= 0 ? [-0.8, -2.4, 0] : [-2.4, -0.8, 1];
    g.append(s('path', { d: `M${cx + ar * Math.cos(a0)},${cy + ar * Math.sin(a0)} A${ar},${ar} 0 0 ${sw} ${cx + ar * Math.cos(a1)},${cy + ar * Math.sin(a1)}`, class: 'sc-accent', fill: 'none', 'marker-end': fr.arrow('acc') }));
    ctx.handle('tip', tipLE[0], tipLE[1], {
      field: 'cT b', title: 'Drag to change the tip chord and tip radius',
      onDrag: (px, py) => { ctx.setValue('b', Math.max(v.R * 1.05, (axisY - py) / k), { round: 0.05 }); ctx.setValue('cT', Math.max(0, (xTE - px) / k), { round: 0.05 }); },
      onKey: (dx, dy) => { if (dy) ctx.setValue('b', v.b * (1 + 0.02 * dy)); if (dx) ctx.setValue('cT', Math.max(0, v.cT * (1 - 0.02 * dx))); },
    });
  },
  symbols: {
    R: 'body radius at the fins', b: 'fin tip radius measured from the body centre line', c_R: 'root chord', c_T: 'tip chord', N: 'number of fin panels',
    'c_{N\\alpha}': 'normal-force slope of a fin strip (per radian)', y: 'radius of a strip from the body centre line', c: 'local chord at radius $y$',
    A: 'chord-line intercept ($c=A-Cy$)', C: 'chord-line slope', 'L_\\delta': 'first planform integral', M: 'second planform integral', 'Y_{CP}': 'spanwise position of the cant load',
    'C_{L\\delta}': 'roll-driving derivative of one fin', 'C_{Lp}': 'roll-damping derivative of all fins', '\\delta': 'fin cant angle', p: 'roll rate', f: 'roll rate in revolutions per second',
    U: 'flight speed', q: 'dynamic pressure', 'I_{xx}': 'roll moment of inertia', '\\rho': 'air density', h: 'burnout altitude above the launcher', L: 'launcher length',
    J: 'roll-inertia lag factor', k: 'roll-lag length', D: 'effective roll distance', M_c: 'number of roll cycles to burnout',
  },
  report(v, out, R) {
    const d = out.d, r = out.res, n = R.n;
    const Ls = { dim: 'length', internal: 'in' }, As = { dim: 'area', internal: 'in2', units: { si: 'mm2', us: 'in2' } }, Vs = { dim: 'volume', internal: 'in3', units: { si: 'mm3', us: 'in3' } };
    const Ds = { dim: 'distance', internal: 'in' }, Us = { dim: 'speed', internal: 'fts' }, Is = { dim: 'inertia', internal: 'slugft2' }, Rh = { dim: 'density', internal: 'slugft3' }, Hs = { dim: 'distance', internal: 'ft' };
    const l = (x) => R.v(x, Ls);
    const geo = [
      { label: 'Linear chord distribution $c(y)=A-Cy$', lhs: 'A', eq: '\\frac{c_Rb-c_TR}{b-R}', sub: `\\frac{${l(v.cR)}\\times${l(v.b)}-${l(v.cT)}\\times${l(v.R)}}{${l(v.b)}-${l(v.R)}}`, res: R.Q(d.A, Ls) },
      { lhs: 'C', eq: '\\frac{c_R-c_T}{b-R}', sub: `\\frac{${l(v.cR)}-${l(v.cT)}}{${l(v.b)}-${l(v.R)}}`, res: n(d.C) },
      { label: 'Planform integrals', lhs: 'L_\\delta', eq: '\\frac{A(b+R)}{2}-\\frac{C(b^2+bR+R^2)}{3}', res: R.Q(d.Ld, As) },
      { lhs: 'M', eq: '-\\frac{A(b^2+bR+R^2)}{3}+\\frac{C(b^3+b^2R+bR^2+R^3)}{4}', res: R.Q(d.M, Vs) },
      { label: 'Spanwise centre of pressure of the cant load', lhs: 'Y_{CP}', eq: '\\frac{3A(b+R)-2C(b^2+bR+R^2)}{6A-3C(b+R)}', res: R.Q(d.Ycp, Ls) },
      { label: 'Roll-driving derivative of one fin (reference area $\\pi R^2$, length $2R$)', lhs: 'C_{L\\delta}', eq: '\\frac{c_{N\\alpha}(b-R)}{2\\pi R^3}L_\\delta', sub: `\\frac{${n(v.cNa)}\\,(${l(v.b)}-${l(v.R)})}{2\\pi\\times(${l(v.R)})^3}\\times${R.v(d.Ld, As)}`, res: `${n(d.CLd)}\\ \\mathrm{rad^{-1}}` },
      { label: 'Roll-damping derivative of all fins', lhs: 'C_{Lp}', eq: '\\frac{c_{N\\alpha}(b-R)N}{2\\pi R^4}M', sub: `\\frac{${n(v.cNa)}\\,(${l(v.b)}-${l(v.R)})\\times${n(v.N)}}{2\\pi\\times(${l(v.R)})^4}\\times(${R.v(d.M, Vs)})`, res: n(d.CLp) },
    ];
    const Rd = R.v(v.R, Ds), MoL = R.v(d.M / d.Ld, Ds);
    const target = v.mode === 'rate' ? [
      { label: 'Roll rate in radians per second', lhs: 'p', eq: '2\\pi f', sub: `2\\pi\\times${n(v.f)}`, res: `${n(r.p)}\\ \\mathrm{rad\\,s^{-1}}` },
      { label: 'Steady roll: driving and damping moments balance', lhs: '\\delta', eq: '-\\frac{p}{U}\\,\\frac{M}{L_\\delta}', sub: `-\\frac{${n(r.p)}}{${R.v(v.V, Us)}}\\times(${MoL})`, res: `${n(r.delta)}\\ \\mathrm{rad}=${n(r.deltaDeg, 4)}^{\\circ}` },
      { label: 'Roll-inertia lag factor during the boost', lhs: 'J', eq: '\\frac{I_{xx}}{2\\pi\\rho(h-L)R^4C_{Lp}}', sub: `\\frac{${R.v(v.Ixx, Is)}}{2\\pi\\times${R.v(v.rho, Rh)}\\times(${R.v(v.h, Hs)}-${R.v(v.L, Hs)})\\times(${Rd})^4\\times(${n(d.CLp)})}`, res: n(out.lag.J) },
      { label: 'Cant angle including the lag', lhs: '\\delta', eq: '-\\frac{pR\\,C_{Lp}}{N\\,U\\,C_{L\\delta}}(1-J)', sub: `-\\frac{${n(r.p)}\\times${Rd}\\times(${n(d.CLp)})}{${n(v.N)}\\times${R.v(v.V, Us)}\\times${n(d.CLd)}}(1-(${n(out.lag.J)}))`, res: `${n(out.lag.deltaDeg, 4)}^{\\circ}` },
    ] : [
      { label: 'Roll-lag length', lhs: 'k', eq: '\\frac{I_{xx}}{2\\pi\\rho R^4C_{Lp}}', sub: `\\frac{${R.v(v.Ixx, Is)}}{2\\pi\\times${R.v(v.rho, Rh)}\\times(${Rd})^4\\times(${n(d.CLp)})}`, res: R.Q(r.k, Hs) },
      { label: 'Effective roll distance from launcher exit to burnout', lhs: 'D', eq: 'h-L+k\\ln\\frac{h-L-k}{-k}', sub: `${R.v(v.h, Hs)}-${R.v(v.L, Hs)}+(${R.v(r.k, Hs)})\\ln\\frac{${R.v(v.h, Hs)}-${R.v(v.L, Hs)}-(${R.v(r.k, Hs)})}{${R.v(-r.k, Hs)}}`, res: R.Q(r.brkt, Hs) },
      { label: `Cant angle for $M_c=${n(v.Mc)}$ whole roll cycles`, lhs: '\\delta', eq: '-\\frac{2\\pi M_c R\\,C_{Lp}}{N\\,C_{L\\delta}\\,D}', sub: `-\\frac{2\\pi\\times${n(v.Mc)}\\times${Rd}\\times(${n(d.CLp)})}{${n(v.N)}\\times${n(d.CLd)}\\times${R.v(r.brkt, Hs)}}`, res: `${n(r.delta)}\\ \\mathrm{rad}=${n(r.deltaDeg, 4)}^{\\circ}` },
    ];
    return [
      { title: 'Theory', text: 'Each fin panel is divided into streamwise strips of span $dy$, each with the same normal-force slope $c_{N\\alpha}$. A strip at radius $y$ from the body centre line, on a fin canted by $\\delta$ and rolling at rate $p$, sees the angle of attack $\\delta-py/U$, so its rolling moment is $dL=q\\,y\\,c\\,c_{N\\alpha}(\\delta-py/U)\\,dy$, with the linear chord $c=A-Cy$ from the root at $y=R$ to the tip at $y=b$. Integrating over the panel gives the roll-driving derivative $C_{L\\delta}$ of one fin and the roll-damping derivative $C_{Lp}$ of all $N$ fins, on reference area $\\pi R^2$ and length $2R$. Setting every panel to one common cant cancels the pitch and yaw moments; the cant follows from the roll target.', steps: geo },
      { title: v.mode === 'rate' ? 'Cant angle for the target roll rate' : 'Cant angle for whole roll cycles to burnout', steps: target },
    ];
  },
  references: ['fin-setting-theory-3', 'boost-phase-roll-rate2', 'fin-aeroelasticity'],
  examples: [
    { name: 'Gold Rush III — target roll rate', values: { R: 3.125, b: 5.5, cR: 10, cT: 2, N: 4, cNa: 3.5, mode: 'rate', f: 1.24, V: 1037.2, Mc: 4, Ixx: 0.22, rho: 0.0023, h: 2000, L: 18 } },
    { name: 'Gold Rush III — 4 roll cycles', values: { R: 3.125, b: 5.5, cR: 10, cT: 2, N: 4, cNa: 3.5, mode: 'cycles', f: 1.24, V: 1037.2, Mc: 4, Ixx: 0.22, rho: 0.0023, h: 2000, L: 18 } },
  ],
};
