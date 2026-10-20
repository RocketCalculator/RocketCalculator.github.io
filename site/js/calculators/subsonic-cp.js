// Subsonic Centre of Pressure (Barrowman / NACA 1307) — UI definition.
import { subsonicCP } from '../calc/barrowmanSub.js';
import { NOSE_TYPES, bodyProfile } from '../calc/noseShapes.js';
import { s, fmt } from '../util.js';
import { dim, path, text, pointMarker, finEndView } from '../ui/svg.js';

const LEN = { dim: 'length', internal: 'in' };

const GR3 = [
  { x: 0, r: 0.05 }, { x: 2.5, r: 0.487 }, { x: 5, r: 0.907 }, { x: 7.5, r: 1.261 }, { x: 10, r: 1.549 }, { x: 12.5, r: 1.773 },
  { x: 15, r: 1.932 }, { x: 17.5, r: 2.028 }, { x: 20, r: 2.06 }, { x: 86, r: 2.06 }, { x: 93.16, r: 2.06 },
];
const GR3_FINS = { N: 6, xLE: 83.16, cR: 10, cT: 3, xTipLE: 90.16, b: 4, bt: 0 };

/** The body profile actually analysed: generated from the nose shape, or the custom table. */
export function profileOf(v) {
  if (v.noseType === 'custom') return v.profile;
  return bodyProfile({ noseType: v.noseType, noseL: v.noseL, R: v.R, bodyLen: v.bodyLen, btLen: v.btLen, btR: v.btR, k: v.k, n: v.pow });
}
const notCustom = (v) => v.noseType !== 'custom';

function finsOf(v) {
  return { N: v.N, xLE: v.xLE, xTipLE: v.xTipLE, cR: v.cR, cT: v.cT, b: v.b, tanBT: Math.tan((v.bt * Math.PI) / 180) };
}

export default {
  slug: 'subsonic-cp',
  topic: 'barrowman-equations',
  title: 'Subsonic Centre of Pressure',
  subtitle: 'Normal-force slope <b>$C_{N\\alpha}$</b> and centre-of-pressure location of a finned rocket below the critical Mach number — Barrowman’s method with NACA Report 1307 body–fin interference and a hemispherical nose cap.',
  intro: {
    what: 'Splits the rocket into body segments and a fin set, finds each part’s normal force per radian of angle of attack and where it acts, and combines them into one CP.',
    why: 'A rocket is statically stable only if its centre of pressure is behind its centre of gravity. The distance between them in calibres is the static margin.',
    when: 'Sizing fins, checking stability before flight, and producing $C_{N\\alpha}$ and CP for trajectory and dynamics tools. Valid below the critical Mach number.',
  },
  info: {
    text: [
      'The <b>body</b> uses Munk’s slender-body theory: each segment produces normal force in proportion to how fast its cross-section area grows. Only the nose (and any shoulder or boat-tail) contributes; cylinders carry none.',
      'A blunt nose (non-zero radius at station 0) gets a tangent <b>hemispherical cap</b> with its own normal force, or is treated as a flat face.',
      'The <b>fins</b> use Diederich’s lifting-surface correlation with full Prandtl–Glauert compressibility; the body lifts the fins and the fins lift the body, by the NACA Report 1307 slender-body interference factors $K_{W(B)}$ and $K_{B(W)}$.',
    ],
    tex: 'X_{CP}=\\frac{\\sum_i C_{N\\alpha,i}\\,x_i}{\\sum_i C_{N\\alpha,i}},\\qquad \\text{static margin}=\\frac{X_{CP}-X_{CG}}{d}',
    steps: [
      'Choose the nose shape and give its length, the body radius and the overall length (or enter measured profile points with <b>Custom profile</b>).',
      'Enter the fin set: number of panels, root and tip chords, leading-edge stations and exposed span.',
      'Each body segment’s $C_{N\\alpha}$ = 2ΔA/$S_{ref}$ acts at its centroid of area change.',
      'The fins’ $C_{N\\alpha}$ comes from Diederich’s formula, times the interference factors, acting at the fin and carry-over centres of pressure.',
      'All contributions are summed; CP is the $C_{N\\alpha}$-weighted average station. Enter your CG to get the static margin.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'flight', title: 'Flight condition',
      fields: [
        { id: 'M', label: 'Mach number', sym: 'M', dim: 'none', default: 0.05, min: 0, max: 0.95, maxExclusive: true, slider: { min: 0, max: 0.9 },
          info: { text: 'Free-stream Mach number. Must be below the critical Mach number of the body (where sonic flow first appears locally) — typically 0.8 or so for a slender ogive.', doc: 'fins' } },
        { id: 'xcg', label: 'Centre of gravity (from tip)', sym: 'X_{CG}', ...LEN, default: 60, min: 0, optional: true,
          info: { text: 'Your rocket’s CG station measured from the nose tip, for the static margin. Leave empty to skip.', doc: 'stability' } },
      ],
    },
    {
      id: 'body', title: 'Body profile',
      fields: [
        { id: 'noseType', shared: 'noseType', label: 'Nose shape', kind: 'select', default: 'ogive', options: NOSE_TYPES,
          info: { text: 'Choose the nose-cone shape; its profile is generated from the length and radius. Pick <b>Custom profile</b> to enter measured points instead.', doc: 'body' } },
        { id: 'noseL', shared: 'noseL', label: 'Nose length', sym: 'L_n', ...LEN, default: 20, min: 0, minExclusive: true, when: notCustom, slider: { min: 2, max: 60 },
          info: { text: 'Length of the nose cone from the tip to the shoulder.', range: 'Fineness $L_n/d$ of 3–7 is common.', doc: 'body' } },
        { id: 'R', shared: 'bodyR', label: 'Body radius', sym: 'R', ...LEN, default: 2.06, min: 0, minExclusive: true, when: notCustom,
          info: { text: 'Radius of the body tube (half its outside diameter); the nose base matches it.', doc: 'body' } },
        { id: 'k', label: 'Parabolic parameter', sym: "K'", dim: 'none', default: 0.75, min: 0, max: 1, when: (v) => v.noseType === 'parabolic',
          info: { text: "0 gives a cone, 0.5 a half parabola, 0.75 the three-quarter parabola, 1 a full parabola.", tex: "r=R\\,\\frac{2(x/L_n)-K'(x/L_n)^2}{2-K'}", doc: 'body' } },
        { id: 'pow', label: 'Power-series exponent', sym: 'n', dim: 'none', default: 0.5, min: 0, minExclusive: true, max: 1, when: (v) => v.noseType === 'power',
          info: { text: '1 gives a cone, 0.75 a three-quarter power, 0.5 a half power (parabola).', tex: 'r=R\\,(x/L_n)^n', doc: 'body' } },
        { id: 'bodyLen', shared: 'length', label: 'Overall length', sym: 'L', ...LEN, default: 93.16, min: 0, minExclusive: true, when: notCustom,
          info: { text: 'Length from the nose tip to the base of the rocket.', doc: 'body' } },
        { id: 'btLen', label: 'Boat-tail length', sym: 'L_{bt}', ...LEN, default: 0, min: 0, when: notCustom,
          info: { text: 'Length of a conical boat-tail at the base. Leave 0 for a plain cylinder.', doc: 'body' } },
        { id: 'btR', label: 'Boat-tail end radius', sym: 'R_{bt}', ...LEN, default: 2.06, min: 0, when: (v) => notCustom(v) && v.btLen > 0,
          info: { text: 'Radius at the very base of the boat-tail.', doc: 'body' } },
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
          info: { text: 'Body radius at each station, from the nose tip (station 0) to the base. Use enough points to follow the nose curve; straight cylinders need only their ends. A boat-tail is simply a decreasing radius. If the radius at station 0 is not zero, a tangent hemispherical cap is fitted ahead of it.', doc: 'body' } },
        { id: 'flatNose', label: 'Blunt tip is a flat face (not a hemisphere)', kind: 'bool', default: true, when: (v) => v.noseType === 'custom' && v.profile?.[0]?.r > 0,
          info: { text: 'For a blunt tip: on = flat face (no cap normal force), off = tangent hemispherical cap.', doc: 'hemisphere' } },
      ],
    },
    {
      id: 'fins', title: 'Fin set',
      fields: [
        { id: 'N', shared: 'finN', label: 'Number of fin panels', sym: 'N', dim: 'none', default: 6, min: 1, max: 8, info: { text: 'Number of identical panels. The model treats each opposite pair as a wing.', doc: 'fins' } },
        { id: 'xLE', label: 'Root leading-edge station', sym: 'x_R', ...LEN, default: 83.16, min: 0, info: { text: 'Station of the root chord leading edge, from the nose tip.', doc: 'fins' } },
        { id: 'cR', shared: 'finCr', label: 'Root chord', sym: 'c_R', ...LEN, default: 10, min: 0, minExclusive: true, info: { text: 'Fin chord at the body.', doc: 'fins' } },
        { id: 'xTipLE', label: 'Tip leading-edge station', sym: 'x_T', ...LEN, default: 90.16, min: 0, info: { text: 'Station of the tip chord leading edge. Its difference from the root LE station sets the sweep.', doc: 'fins' } },
        { id: 'cT', shared: 'finCt', label: 'Tip chord', sym: 'c_T', ...LEN, default: 3, min: 0, info: { text: 'Fin chord at the tip.', doc: 'fins' } },
        { id: 'b', shared: 'finSpan', label: 'Exposed semispan', sym: 'b', ...LEN, default: 4, min: 0, minExclusive: true, info: { text: 'Fin height from the body surface to the tip.', doc: 'fins' } },
        { id: 'bt', label: 'Boat-tail half-angle under fins', sym: '\\beta', dim: 'angle', default: 0, min: 0, max: 20, info: { text: 'If the fins sit on a conical boat-tail, its half-angle (adds root area). Zero for a cylinder.', doc: 'fins' } },
      ],
    },
  ],
  results: [
    { id: 'xcp', label: 'Centre of pressure (from tip)', sym: 'X_{CP}', ...LEN, key: true,
      note: (v, o) => `${fmt((100 * v) / o.len, { digits: 3 })} % of length`,
      info: { text: 'Station where the total normal force acts, measured from the nose tip.', tex: 'X_{CP}=\\frac{\\sum C_{N\\alpha,i}x_i}{C_{N\\alpha}}', doc: 'stability' } },
    { id: 'margin', label: 'Static margin', sym: 'SM', dim: 'none', key: true, digits: 3, when: (v) => v.xcg != null,
      status: (m) => (m == null ? null : m < 0 ? 'err' : m < 1 ? 'warn' : 'ok'),
      note: (m) => (m == null ? '' : `calibres · ${m < 0 ? 'UNSTABLE — CP ahead of CG' : m < 1 ? 'below the usual 1-calibre rule of thumb' : 'stable'}`),
      info: { text: 'Distance from CG to CP in body diameters (calibres). Positive = CP behind CG = statically stable. 1–2 calibres is the usual guideline.', tex: '\\frac{X_{CP}-X_{CG}}{d}', doc: 'stability' } },
    { id: 'CNa', label: 'Normal-force slope', sym: 'C_{N\\alpha}', dim: 'perAngle', internal: 'perrad', key: true,
      info: { text: 'Total normal-force coefficient per radian of angle of attack, on the reference area πd²/4.', tex: 'C_{N\\alpha}=C_{N\\alpha,body}+C_{N\\alpha,fins}\\big(K_{W(B)}+K_{B(W)}\\big)', doc: 'stability' } },
    { id: 'CNaBody', label: 'Body normal-force slope', sym: 'C_{N\\alpha,body}', dim: 'perAngle', internal: 'perrad', info: { text: 'Slender-body normal force of the nose, shoulders and boat-tails (and the hemispherical cap).', tex: 'C_{N\\alpha}=\\frac{2(A_i-A_{i-1})}{S_{ref}}', doc: 'body' } },
    { id: 'xcpBody', label: 'Body centre of pressure', sym: 'x_{body}', ...LEN, info: { text: 'Where the body’s normal force acts.', doc: 'body' } },
    { id: 'CNaTail', label: 'Fin set, with interference', sym: 'C_{N\\alpha,tail}', dim: 'perAngle', internal: 'perrad', info: { text: 'Fins plus the lift they induce on the body.', tex: 'C_{N\\alpha,fins}(K_{W(B)}+K_{B(W)})', doc: 'interference' } },
    { id: 'xcpTail', label: 'Fin set centre of pressure', sym: 'x_{tail}', ...LEN, info: { text: 'Combined CP of the fin lift and the body carry-over lift.', doc: 'interference' } },
    { id: 'CNaFins', label: 'Fins alone', sym: 'C_{N\\alpha,F}', dim: 'perAngle', internal: 'perrad', info: { text: 'Isolated fin panels (N/2 wings) on the body reference area.', tex: 'C_{N\\alpha}=\\frac N2\\frac{S}{S_{ref}}\\frac{2\\pi F\\cos\\Lambda_c}{\\beta_\\Lambda\\big(F\\sqrt{1+4/F^2}+2\\big)}', doc: 'fins' } },
    { id: 'KWB', label: 'Fins in presence of body', sym: 'K_{W(B)}', dim: 'none', digits: 4, info: { text: 'Ratio of fin lift on the body to isolated fin lift (NACA 1307 eq. 14).', doc: 'interference' } },
    { id: 'KBW', label: 'Body lift due to fins', sym: 'K_{B(W)}', dim: 'none', digits: 4, info: { text: 'Body carry-over lift induced by the fins, relative to isolated fin lift (eq. 21).', doc: 'interference' } },
    { id: 'xcpFin', label: 'Fin panel centre of pressure', sym: 'x_F', ...LEN, info: { text: 'Barrowman fin CP: quarter of the mean aerodynamic chord, shifted by sweep.', doc: 'fins' } },
    { id: 'xcpBW', label: 'Carry-over lift centre of pressure', sym: '\\bar{x}_{B(W)}', ...LEN, info: { text: 'CP of the body lift induced by the fins (NACA 1307 eq. D6).', doc: 'interference' } },
    { id: 'AR', label: 'Fin aspect ratio (pair)', sym: '\\mathit{AR}', dim: 'none', digits: 4, info: { text: 'Two panels joined at the root: 2·(span)²/area.', doc: 'fins' } },
    { id: 'sweep', label: 'Quarter-chord sweep', sym: '\\Lambda_c', dim: 'angle', digits: 4, info: { text: 'Sweep of the quarter-chord line.', doc: 'fins' } },
    { id: 'mac', label: 'Mean aerodynamic chord', sym: '\\bar{c}', ...LEN, info: { text: 'MAC of a trapezoidal panel.', tex: '\\bar c=\\tfrac23\\Big(c_R+c_T-\\frac{c_Rc_T}{c_R+c_T}\\Big)', doc: 'fins' } },
    { id: 'CNd', label: 'Single-panel deflection slope (fin cant)', sym: 'C_{N\\delta}', dim: 'perAngle', internal: 'perrad', info: { text: 'Normal force per radian of panel deflection, including interference.', doc: 'interference' } },
    { id: 'capCNa', label: 'Hemispherical cap', sym: 'C_{N\\alpha,cap}', dim: 'perAngle', internal: 'perrad', when: (v) => v.noseType === 'custom' && v.profile?.[0]?.r > 0,
      info: { text: 'Normal force of the tangent hemispherical cap (zero for a flat face).', tex: 'C_{N\\alpha}=\\frac{9\\pi}{8}\\frac{R_h^2\\sin^4\\theta_T}{S_{ref}}', doc: 'hemisphere' } },
    { id: 'd', label: 'Reference diameter', sym: 'd', ...LEN, info: { text: 'Maximum body diameter; $S_{ref}$ = πd²/4.', doc: 'body' } },
  ],
  compute(v) {
    const prof = profileOf(v);
    if (notCustom(v) && v.noseL >= v.bodyLen) throw new Error('The nose must be shorter than the overall length.');
    const o = subsonicCP({ M: v.M, profile: prof, flatNose: v.flatNose, fins: finsOf(v), xcg: v.xcg });
    const len = prof[prof.length - 1].x;
    const warnings = [];
    if (v.xLE + v.cR > len + 1e-9) warnings.push({ level: 'warn', text: 'The fin root extends past the end of the body profile.' });
    if (v.b < o.fin.r) warnings.push({ level: 'info', text: 'Fin span is less than the body radius: the carry-over CP uses the analytic continuation of the NACA 1307 formula.' });
    if (v.M > 0.8) warnings.push({ level: 'warn', text: 'Above Mach ≈ 0.8 the flow over the nose may be locally sonic; the subsonic model loses accuracy.' });
    const results = {
      xcp: o.xcp, margin: o.margin, CNa: o.CNa, CNaBody: o.body.CNa, xcpBody: o.body.mom / o.body.CNa, CNaTail: o.fin.CNa, xcpTail: o.fin.xcp,
      CNaFins: o.fin.CNaFins, KWB: o.fin.KWB, KBW: o.fin.KBW, xcpFin: o.fin.xcpFin, xcpBW: o.fin.xcpBW, AR: o.fin.AR, sweep: (o.fin.sweepC4 * 180) / Math.PI,
      mac: o.fin.mac, CNd: o.fin.CNd, capCNa: o.body.cap.CNa, d: o.d,
    };
    return { results, warnings, o, len };
  },
  plots: [
    {
      id: 'mach-cp', title: 'Centre of pressure vs Mach',
      info: { text: 'Compressibility (Prandtl–Glauert) raises the fin lift slope with Mach number, moving the CP aft.', doc: 'fins' },
      build(v, out, { U }) {
        const ul = U(LEN); const pts = [];
        for (let i = 0; i <= 40; i++) { const M = (0.9 * i) / 40; const o = subsonicCP({ M, profile: profileOf(v), flatNose: v.flatNose, fins: finsOf(v) }); pts.push([M, ul.v(o.xcp)]); }
        return { x: { label: 'Mach number' }, y: { label: 'X_{CP} from tip', unit: ul.label }, series: [{ name: 'X_{CP}', points: pts }],
          markers: [{ x: v.M, y: ul.v(out.o.xcp), label: 'now' }] };
      },
    },
    {
      id: 'mach-cna', title: 'Normal-force slope vs Mach',
      info: { text: 'Body $C_{N\\alpha}$ is independent of Mach in slender-body theory; only the fins change.', doc: 'fins' },
      build(v, out) {
        const tot = [], body = [], tail = [];
        for (let i = 0; i <= 40; i++) { const M = (0.9 * i) / 40; const o = subsonicCP({ M, profile: profileOf(v), flatNose: v.flatNose, fins: finsOf(v) }); tot.push([M, o.CNa]); body.push([M, o.body.CNa]); tail.push([M, o.fin.CNa]); }
        return { x: { label: 'Mach number' }, y: { label: 'C_{N\\alpha}', unit: '\\mathrm{rad^{-1}}' }, includeZero: true,
          series: [{ name: 'total', points: tot }, { name: 'fin set', points: tail }, { name: 'body', points: body, dashed: true }], markers: [{ x: v.M, y: out.o.CNa }] };
      },
    },
    {
      id: 'buildup', title: 'Normal-force build-up along the rocket', wide: true,
      info: { text: 'Cumulative $C_{N\\alpha}$ from the nose aft, placing each contribution at its own centre of pressure. Steps show where lift is generated.', doc: 'stability' },
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
        return { x: { label: 'Station from tip', unit: ul.label }, y: { label: 'Cumulative C_{N\\alpha}', unit: '\\mathrm{rad^{-1}}' }, includeZero: true, xDomain: [0, ul.v(out.len)], xTight: true,
          series: [{ name: '\\Sigma C_{N\\alpha}', points: pts, area: true }],
          vlines: [{ x: ul.v(o.xcp), label: 'CP', color: 'var(--accent)' }, ...(v.xcg != null ? [{ x: ul.v(v.xcg), label: 'CG', color: 'var(--accent-2)' }] : [])] };
      },
    },
  ],
  /** After shared-rocket values arrive: keep the fin root on the body (slide fins forward, sweep unchanged). */
  sharedAdjust(v) {
    if (v.noseType === 'custom') return;
    const over = v.xLE + v.cR - v.bodyLen;
    if (over > 1e-9) { v.xLE = Math.max(0, v.xLE - over); v.xTipLE = Math.max(0, v.xTipLE - over); }
  },
  schematicTitle: 'Side view with CP and CG (radius exaggerated)',
  schematicHint: 'Drag the nose shoulder to change nose length and radius, or the fin tip to change span and sweep; the rear view shows the fin count',
  schematic(ctx, v, out) {
    const o = out.o, len = out.len, rmax = o.rmax, prof0 = profileOf(v);
    const W = 760, H = 300;
    const fr = ctx.frame({ width: W, height: H, label: 'Rocket side view with centre of pressure' });
    const g = fr.layer('main'); g.replaceChildren();
    const u = ctx.U(LEN), L = (x) => `${fmt(u.v(x), { digits: 4 })} ${u.label}`;
    const hemi = prof0[0].r > 0 && !v.flatNose && o.body.Rh;
    const capLen = hemi ? o.body.Rh * (1 - Math.cos(o.body.thetaT)) : 0;
    const kx = (W - 230) / (len + capLen), ky = Math.min(kx * Math.max(1, (0.18 * len) / (rmax + v.b)), 95 / (rmax + v.b));
    const exag = ky / kx;
    const X = (x) => 40 + (x + capLen) * kx, cy = 132, Y = (r) => cy - r * ky;
    const prof = prof0;
    const top = prof.map((p) => [X(p.x), Y(p.r)]), bot = prof.map((p) => [X(p.x), Y(-p.r)]).reverse();
    if (hemi) {
      // tangent hemispherical cap ahead of station 0: centre at station Rh·cosθT, polar angle ±θT
      const Rh = o.body.Rh, th = o.body.thetaT, c = Rh * Math.cos(th);
      const capPts = [];
      for (let i = 0; i <= 24; i++) { const tt = -th + (2 * th * i) / 24; capPts.push([X(c - Rh * Math.cos(tt)), Y(Rh * Math.sin(tt))]); }
      g.append(s('path', { class: 'sc-body', d: path(capPts, true), 'data-field': 'flatNose' }));
    }
    g.append(s('path', { class: 'sc-body', d: path([...top, ...bot], true), 'data-field': 'profile noseType noseL R bodyLen btLen btR k pow' }));
    { // nose / body joint
      const xs = v.noseType === 'custom' ? (prof.find((q) => q.r >= rmax * 0.999)?.x ?? 0) : v.noseL;
      const rj = v.noseType === 'custom' ? rmax : v.R;
      if (xs > 0) g.append(s('line', { x1: X(xs), x2: X(xs), y1: Y(rj), y2: Y(-rj), class: 'sc-line', 'data-field': 'noseL noseType' }));
    }
    if (prof[0].r > 0 && v.flatNose) g.append(s('line', { x1: X(0), x2: X(0), y1: Y(prof[0].r), y2: Y(-prof[0].r), stroke: 'var(--series-5)', 'stroke-width': 3, 'data-field': 'flatNose' }));
    // fins
    const rr = o.fin.r, finTop = [[X(v.xLE), Y(rr)], [X(v.xTipLE), Y(rr + v.b)], [X(v.xTipLE + v.cT), Y(rr + v.b)], [X(v.xLE + v.cR), Y(rr)]];
    const finBot = finTop.map(([px, py]) => [px, 2 * cy - py]);
    g.append(s('path', { class: 'sc-body-2', d: path(finTop, true), 'data-field': 'N xLE cR xTipLE cT b' }));
    g.append(s('path', { class: 'sc-body-2', d: path(finBot, true), 'data-field': 'N xLE cR xTipLE cT b' }));
    g.append(s('line', { x1: X(0) - 14, x2: X(len) + 14, y1: cy, y2: cy, class: 'sc-axis' }));
    // CP / CG markers and margin
    g.append(pointMarker(X(o.xcp), cy, 'CP', { kind: 'cp', field: 'xcp margin CNa' }));
    if (v.xcg != null) {
      g.append(pointMarker(X(v.xcg), cy, 'CG', { kind: 'cg', field: 'xcg' }));
      const st = o.margin < 0 ? 'var(--err)' : o.margin < 1 ? 'var(--warn)' : 'var(--ok)';
      const yb = Y(-(rmax + v.b)) + 26;
      g.append(dim(fr, X(Math.min(v.xcg, o.xcp)), yb, X(Math.max(v.xcg, o.xcp)), yb, null, { field: 'xcg' }));
      g.append(s('text', { x: (X(v.xcg) + X(o.xcp)) / 2, y: yb + 16, 'text-anchor': 'middle', style: `fill:${st};font:600 12px var(--font-sans)` }, `static margin ${fmt(o.margin, { digits: 3 })} cal`));
    }
    g.append(dim(fr, X(0), Y(rmax + v.b) - 10, X(o.xcp), Y(rmax + v.b) - 10, `X_{CP} = ${L(o.xcp)}`, { off: -6 }));
    g.append(text(W - 10, H - 8, `radius ×${fmt(exag, { digits: 2 })} for clarity`, { anchor: 'end', cls: 'sc-dim-text', size: 10 }));
    // profile point markers + handles (radius)
    prof.forEach((p, i) => {
      if (v.noseType === 'custom') g.append(s('circle', { cx: X(p.x), cy: Y(p.r), r: 2.5, fill: 'var(--accent-2)', 'data-row': i, 'data-field': 'profile' }));
      if (v.noseType === 'custom' && i > 0 && i < prof.length && p.x <= Math.max(25, 0.35 * len)) {
        ctx.handle(`p${i}`, X(p.x), Y(p.r), {
          field: 'profile', title: `Drag to change the radius at station ${fmt(u.v(p.x), { digits: 4 })} ${u.label}`,
          onDrag: (px, py) => ctx.setCell('profile', i, 'r', Math.max(0, (cy - py) / ky), { round: 0.005 }),
          onKey: (dx, dy) => ctx.setCell('profile', i, 'r', Math.max(0, p.r * (1 + 0.02 * dy))),
        });
      }
    });
    g.append(finEndView(W - 90, 120, 62, { N: v.N, r: o.fin.r, s: o.fin.s, field: 'N b' }));
    if (v.noseType !== 'custom') ctx.handle('shoulder', X(v.noseL), Y(v.R), {
      field: 'noseL R', title: 'Drag to change the nose length (horizontal) and body radius (vertical)',
      onDrag: (px, py) => { ctx.setValue('noseL', Math.max(0.5, Math.min(v.bodyLen * 0.8, (px - 40) / kx - capLen)), { round: 0.1 }); ctx.setValue('R', Math.max(0.1, (cy - py) / ky), { round: 0.01 }); },
      onKey: (dx, dy) => { if (dx) ctx.setValue('noseL', v.noseL * (1 + 0.02 * dx)); if (dy) ctx.setValue('R', v.R * (1 + 0.02 * dy)); },
    });
    ctx.handle('fintip', X(v.xTipLE), Y(rr + v.b), {
      field: 'xTipLE b', title: 'Drag to change fin sweep (horizontal) and span (vertical)',
      onDrag: (px, py) => { ctx.setValue('b', Math.max(0.1, (cy - py) / ky - rr), { round: 0.05 }); ctx.setValue('xTipLE', (px - 40) / kx - capLen, { round: 0.05 }); },
      onKey: (dx, dy) => { if (dy) ctx.setValue('b', v.b * (1 + 0.02 * dy)); if (dx) ctx.setValue('xTipLE', v.xTipLE + 0.2 * dx); },
    });
  },
  reportNotes: ['Valid below the critical Mach number, at small angles of attack, for one fin set. Stations are measured aft of the nose tip.'],
  symbols: {
    M: 'flight Mach number', 'X_{CG}': 'centre-of-gravity station', 'X_{CP}': 'centre-of-pressure station', d: 'reference (maximum body) diameter', 'S_{ref}': 'reference area ($\\pi d^2/4$)',
    A_i: 'body cross-section area at profile point $i$', x_i: 'station of profile point $i$', V_i: 'volume of body segment $i$', 'C_{N\\alpha,i}': 'normal-force slope of body segment $i$', 'x_{cp,i}': 'centre of pressure of segment $i$',
    R_h: 'radius of the hemispherical cap', '\\theta_T': 'tangency angle of the cap', 'C_{N\\alpha,cap}': 'normal-force slope of the cap', 'C_{N\\alpha,body}': 'normal-force slope of the body', 'x_{body}': 'centre of pressure of the body',
    c_R: 'fin root chord', c_T: 'fin tip chord', b: 'fin exposed semispan', x_R: 'root leading-edge station', x_T: 'tip leading-edge station', N: 'number of fin panels', S: 'area of one fin panel',
    '\\mathit{AR}': 'aspect ratio of a pair of panels', '\\Lambda_c': 'quarter-chord sweep', F: 'Diederich planform parameter', 'C_{N\\alpha,W}': 'lift slope of a panel pair on its own area', 'C_{N\\alpha,F}': 'normal-force slope of the fins alone on the reference area',
    '\\bar c': 'mean aerodynamic chord', x_F: 'fin centre of pressure', '\\tau': 'ratio of body radius to fin tip radius ($r/s$)', r: 'body radius at the fins', s: 'fin tip radius from the centre line',
    'K_{W(B)}': 'lift on the fins in the presence of the body relative to the fins alone', 'K_{B(W)}': 'lift carried over onto the body by the fins', '\\bar{x}_{B(W)}': 'centre of pressure of the carry-over lift',
    'C_{N\\alpha,tail}': 'fin set including interference', 'x_{tail}': 'centre of pressure of the fin set', 'C_{N\\alpha}': 'normal-force slope of the whole rocket', SM: 'static margin in calibres',
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
    if (v.xcg != null) tot.push({ label: 'Static margin', lhs: 'SM', eq: '\\frac{X_{CP}-X_{CG}}{d}', sub: `\\frac{${l(o.xcp)}-${l(v.xcg)}}{${l(o.d)}}`, res: `${n(o.margin, 3)}\\ \\text{calibres}`, note: o.margin < 0 ? 'The centre of pressure is ahead of the centre of gravity: the rocket is statically unstable.' : 'The centre of pressure is behind the centre of gravity: the rocket is statically stable.' });
    return [
      { title: 'Theory', text: 'The rocket is split into body segments and a fin set. By slender-body theory each body segment produces a normal-force slope proportional to its growth in cross-section area, $C_{N\\alpha,i}=2(A_i-A_{i-1})/S_{ref}$, acting at the centroid of that growth; cylinders carry none. A blunt tip gets a tangent hemispherical cap with its own normal force. The fins use Diederich’s lifting-surface correlation with Prandtl–Glauert compressibility; the body increases the fins’ lift by $K_{W(B)}$ and the fins carry lift onto the body by $K_{B(W)}$ (slender-body interference, NACA Report 1307). The centre of pressure is the $C_{N\\alpha}$-weighted mean station of all contributions; the static margin is its distance behind the centre of gravity in body diameters.' },
      { title: 'Body of revolution', steps: body },
      { title: 'Fin set', steps: fins },
      { title: 'Whole rocket', steps: tot },
    ];
  },
  references: ['barrowman-equations', 'barrowmanthesis-orig', 'hemisphere', '1307-supplement-rev2'],
  examples: [
    { name: 'Gold Rush III proportions, tangent ogive', values: { M: 0.05, xcg: 60, noseType: 'ogive', noseL: 20, R: 2.06, bodyLen: 93.16, btLen: 0, btR: 2.06, ...GR3_FINS } },
    { name: 'Same rocket, Von Kármán nose', values: { M: 0.05, xcg: 60, noseType: 'vonkarman', noseL: 20, R: 2.06, bodyLen: 93.16, btLen: 0, btR: 2.06, ...GR3_FINS } },
    { name: 'Gold Rush III, measured profile (custom points)', values: { M: 0.05, xcg: 60, noseType: 'custom', profile: GR3, flatNose: true, ...GR3_FINS } },
  ],
};
