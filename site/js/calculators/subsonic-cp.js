// Subsonic Centre of Pressure (Barrowman / NACA 1307) — UI definition.
import { subsonicCP } from '../calc/barrowmanSub.js';
import { s, fmt } from '../util.js';
import { dim, path, text, pointMarker } from '../ui/svg.js';

const LEN = { dim: 'length', internal: 'in' };

const GR3 = [
  { x: 0, r: 0.05 }, { x: 2.5, r: 0.487 }, { x: 5, r: 0.907 }, { x: 7.5, r: 1.261 }, { x: 10, r: 1.549 }, { x: 12.5, r: 1.773 },
  { x: 15, r: 1.932 }, { x: 17.5, r: 2.028 }, { x: 20, r: 2.06 }, { x: 86, r: 2.06 }, { x: 93.16, r: 2.06 },
];
const GR3_FINS = { N: 6, xLE: 83.16, cR: 10, cT: 3, xTipLE: 90.16, b: 4, bt: 0 };

function finsOf(v) {
  return { N: v.N, xLE: v.xLE, xTipLE: v.xTipLE, cR: v.cR, cT: v.cT, b: v.b, tanBT: Math.tan((v.bt * Math.PI) / 180) };
}

export default {
  slug: 'subsonic-cp',
  topic: 'barrowman-equations',
  title: 'Subsonic Centre of Pressure',
  subtitle: 'Normal-force slope <b>C<sub>Nα</sub></b> and centre-of-pressure location of a finned rocket below the critical Mach number — Barrowman’s method with NACA Report 1307 body–fin interference and a hemispherical nose cap.',
  source: 'SUBSONIC BARROWMAN EQUATIONS2.4.xls · Barrowman / Hemisphere memos',
  verified: { label: 'Matches workbook (64 cells)', title: 'Every body segment, fin, interference and total cell of SUBSONIC BARROWMAN EQUATIONS2.4.xls (single fin set) reproduced to 1e-12.' },
  intro: {
    what: 'Splits the rocket into body segments and a fin set, finds each part’s normal force per radian of angle of attack and where it acts, and combines them into one CP.',
    why: 'A rocket is statically stable only if its centre of pressure is behind its centre of gravity. The distance between them in calibres is the static margin.',
    when: 'Sizing fins, checking stability before flight, and producing C<sub>Nα</sub> and CP for trajectory and dynamics tools. Valid below the critical Mach number.',
    typical: 'Gold Rush III ignition (Mach 0.05): C<sub>Nα</sub> ≈ 18.7 /rad with the CP ≈ 79.3 in from the tip of a 93-inch rocket.',
  },
  info: {
    text: [
      'The <b>body</b> uses Munk’s slender-body theory: each segment produces normal force in proportion to how fast its cross-section area grows. Only the nose (and any shoulder or boat-tail) contributes; cylinders carry none.',
      'A blunt nose (non-zero radius at station 0) gets a tangent <b>hemispherical cap</b> with its own normal force, or is treated as a flat face.',
      'The <b>fins</b> use Diederich’s lifting-surface correlation with full Prandtl–Glauert compressibility; the body lifts the fins and the fins lift the body, by the NACA Report 1307 slender-body interference factors K<sub>W(B)</sub> and K<sub>B(W)</sub>.',
    ],
    tex: 'X_{CP}=\\frac{\\sum_i C_{N\\alpha,i}\\,x_i}{\\sum_i C_{N\\alpha,i}},\\qquad \\text{static margin}=\\frac{X_{CP}-X_{CG}}{d}',
    steps: [
      'Enter the body profile as (station, radius) points from the nose tip aft.',
      'Enter the fin set: number of panels, root and tip chords, leading-edge stations and exposed span.',
      'Each body segment’s C<sub>Nα</sub> = 2ΔA/S<sub>ref</sub> acts at its centroid of area change.',
      'The fins’ C<sub>Nα</sub> comes from Diederich’s formula, times the interference factors, acting at the fin and carry-over centres of pressure.',
      'All contributions are summed; CP is the C<sub>Nα</sub>-weighted average station. Enter your CG to get the static margin.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'flight', title: 'Flight condition',
      fields: [
        { id: 'M', label: 'Mach number', sym: 'M', dim: 'none', default: 0.05, min: 0, max: 0.95, maxExclusive: true, slider: { min: 0, max: 0.9 },
          info: { text: 'Free-stream Mach number. Must be below the critical Mach number of the body (where sonic flow first appears locally) — typically 0.8 or so for a slender ogive.', doc: 'fins' } },
        { id: 'xcg', label: 'Centre of gravity (from tip)', sym: 'X_CG', ...LEN, default: 60, min: 0, optional: true,
          info: { text: 'Your rocket’s CG station measured from the nose tip, for the static margin. Not part of the workbook — the default is just an example. Leave empty to skip.', doc: 'stability' } },
      ],
    },
    {
      id: 'body', title: 'Body profile',
      fields: [
        { id: 'profile', label: 'Profile points (station, radius)', kind: 'table', minRows: 3,
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
        { id: 'flatNose', label: 'Blunt tip is a flat face (not a hemisphere)', kind: 'bool', default: true, when: (v) => v.profile?.[0]?.r > 0,
          info: { text: 'For a blunt tip: on = flat face (no cap normal force), off = tangent hemispherical cap with the memo’s normal-force model.', doc: 'hemisphere' } },
      ],
    },
    {
      id: 'fins', title: 'Fin set',
      fields: [
        { id: 'N', label: 'Number of fin panels', sym: 'N', dim: 'none', default: 6, min: 1, max: 8, info: { text: 'Number of identical panels. The model treats each opposite pair as a wing.', doc: 'fins' } },
        { id: 'xLE', label: 'Root leading-edge station', sym: 'x_R', ...LEN, default: 83.16, min: 0, info: { text: 'Station of the root chord leading edge, from the nose tip.', doc: 'fins' } },
        { id: 'cR', label: 'Root chord', sym: 'c_R', ...LEN, default: 10, min: 0, minExclusive: true, info: { text: 'Fin chord at the body.', doc: 'fins' } },
        { id: 'xTipLE', label: 'Tip leading-edge station', sym: 'x_T', ...LEN, default: 90.16, min: 0, info: { text: 'Station of the tip chord leading edge. Its difference from the root LE station sets the sweep.', doc: 'fins' } },
        { id: 'cT', label: 'Tip chord', sym: 'c_T', ...LEN, default: 3, min: 0, info: { text: 'Fin chord at the tip.', doc: 'fins' } },
        { id: 'b', label: 'Exposed semispan', sym: 'b', ...LEN, default: 4, min: 0, minExclusive: true, info: { text: 'Fin height from the body surface to the tip.', doc: 'fins' } },
        { id: 'bt', label: 'Boat-tail half-angle under fins', sym: 'β', dim: 'angle', default: 0, min: 0, max: 20, info: { text: 'If the fins sit on a conical boat-tail, its half-angle (adds root area). Zero for a cylinder.', doc: 'fins' } },
      ],
    },
  ],
  results: [
    { id: 'xcp', label: 'Centre of pressure (from tip)', sym: 'X_CP', ...LEN, key: true,
      note: (v, o) => `${fmt((100 * v) / o.len, { digits: 3 })} % of length`,
      info: { text: 'Station where the total normal force acts, measured from the nose tip.', tex: 'X_{CP}=\\frac{\\sum C_{N\\alpha,i}x_i}{C_{N\\alpha}}', doc: 'stability' } },
    { id: 'margin', label: 'Static margin', dim: 'none', key: true, digits: 3, when: (v) => v.xcg != null,
      status: (m) => (m == null ? null : m < 0 ? 'err' : m < 1 ? 'warn' : 'ok'),
      note: (m) => (m == null ? '' : `calibres · ${m < 0 ? 'UNSTABLE — CP ahead of CG' : m < 1 ? 'below the usual 1-calibre rule of thumb' : 'stable'}`),
      info: { text: 'Distance from CG to CP in body diameters (calibres). Positive = CP behind CG = statically stable. The 1–2 calibre guideline is common amateur practice, not a value from the source.', tex: '\\frac{X_{CP}-X_{CG}}{d}', doc: 'stability' } },
    { id: 'CNa', label: 'Normal-force slope C_Nα', dim: 'perAngle', internal: 'perrad', key: true,
      info: { text: 'Total normal-force coefficient per radian of angle of attack, on the reference area πd²/4.', tex: 'C_{N\\alpha}=C_{N\\alpha,body}+C_{N\\alpha,fins}\\big(K_{W(B)}+K_{B(W)}\\big)', doc: 'stability' } },
    { id: 'CNaBody', label: 'Body C_Nα', dim: 'perAngle', internal: 'perrad', info: { text: 'Slender-body normal force of the nose, shoulders and boat-tails (and the hemispherical cap).', tex: 'C_{N\\alpha}=\\frac{2(A_i-A_{i-1})}{S_{ref}}', doc: 'body' } },
    { id: 'xcpBody', label: 'Body CP', ...LEN, info: { text: 'Where the body’s normal force acts.', doc: 'body' } },
    { id: 'CNaTail', label: 'Fin set C_Nα (with interference)', dim: 'perAngle', internal: 'perrad', info: { text: 'Fins plus the lift they induce on the body.', tex: 'C_{N\\alpha,fins}(K_{W(B)}+K_{B(W)})', doc: 'interference' } },
    { id: 'xcpTail', label: 'Fin set CP', ...LEN, info: { text: 'Combined CP of the fin lift and the body carry-over lift.', doc: 'interference' } },
    { id: 'CNaFins', label: 'Fins alone C_Nα', dim: 'perAngle', internal: 'perrad', info: { text: 'Isolated fin panels (N/2 wings) on the body reference area.', tex: 'C_{N\\alpha}=\\frac N2\\frac{S}{S_{ref}}\\frac{2\\pi F\\cos\\Lambda_c}{\\beta_\\Lambda\\big(F\\sqrt{1+4/F^2}+2\\big)}', doc: 'fins' } },
    { id: 'KWB', label: 'K_W(B) — fins in presence of body', dim: 'none', digits: 4, info: { text: 'Ratio of fin lift on the body to isolated fin lift (NACA 1307 eq. 14).', doc: 'interference' } },
    { id: 'KBW', label: 'K_B(W) — body lift due to fins', dim: 'none', digits: 4, info: { text: 'Body carry-over lift induced by the fins, relative to isolated fin lift (eq. 21).', doc: 'interference' } },
    { id: 'xcpFin', label: 'Fin panel CP', ...LEN, info: { text: 'Barrowman fin CP: quarter of the mean aerodynamic chord, shifted by sweep.', doc: 'fins' } },
    { id: 'xcpBW', label: 'Carry-over lift CP', ...LEN, info: { text: 'CP of the body lift induced by the fins (NACA 1307 eq. D6).', doc: 'interference' } },
    { id: 'AR', label: 'Fin aspect ratio (pair)', dim: 'none', digits: 4, info: { text: 'Two panels joined at the root: 2·(span)²/area.', doc: 'fins' } },
    { id: 'sweep', label: 'Quarter-chord sweep', dim: 'angle', digits: 4, info: { text: 'Sweep of the quarter-chord line.', doc: 'fins' } },
    { id: 'mac', label: 'Mean aerodynamic chord', ...LEN, info: { text: 'MAC of a trapezoidal panel.', tex: '\\bar c=\\tfrac23\\Big(c_R+c_T-\\frac{c_Rc_T}{c_R+c_T}\\Big)', doc: 'fins' } },
    { id: 'CNd', label: 'Single-panel C_Nδ (fin cant)', dim: 'perAngle', internal: 'perrad', info: { text: 'Normal force per radian of panel deflection, including interference.', doc: 'interference' } },
    { id: 'capCNa', label: 'Hemispherical cap C_Nα', dim: 'perAngle', internal: 'perrad', when: (v) => v.profile?.[0]?.r > 0,
      info: { text: 'Normal force of the tangent hemispherical cap (zero for a flat face).', tex: 'C_{N\\alpha}=\\frac{9\\pi}{8}\\frac{R_h^2\\sin^4\\theta_T}{S_{ref}}', doc: 'hemisphere' } },
    { id: 'd', label: 'Reference diameter', ...LEN, info: { text: 'Maximum body diameter; S<sub>ref</sub> = πd²/4.', doc: 'body' } },
  ],
  compute(v) {
    const o = subsonicCP({ M: v.M, profile: v.profile, flatNose: v.flatNose, fins: finsOf(v), xcg: v.xcg });
    const len = v.profile[v.profile.length - 1].x;
    const warnings = [];
    if (v.xLE + v.cR > len + 1e-9) warnings.push({ level: 'warn', text: 'The fin root extends past the end of the body profile.' });
    if (v.b < o.fin.r) warnings.push({ level: 'info', text: 'Fin span is less than the body radius: the carry-over CP uses the analytic continuation of the NACA 1307 formula (the workbook formula is undefined here).' });
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
        for (let i = 0; i <= 40; i++) { const M = (0.9 * i) / 40; const o = subsonicCP({ M, profile: v.profile, flatNose: v.flatNose, fins: finsOf(v) }); pts.push([M, ul.v(o.xcp)]); }
        return { x: { label: 'Mach number' }, y: { label: 'X_CP from tip', unit: ul.label }, series: [{ name: 'X_CP', points: pts }],
          markers: [{ x: v.M, y: ul.v(out.o.xcp), label: 'now' }] };
      },
    },
    {
      id: 'mach-cna', title: 'Normal-force slope vs Mach',
      info: { text: 'Body C<sub>Nα</sub> is independent of Mach in slender-body theory; only the fins change.', doc: 'fins' },
      build(v, out) {
        const tot = [], body = [], tail = [];
        for (let i = 0; i <= 40; i++) { const M = (0.9 * i) / 40; const o = subsonicCP({ M, profile: v.profile, flatNose: v.flatNose, fins: finsOf(v) }); tot.push([M, o.CNa]); body.push([M, o.body.CNa]); tail.push([M, o.fin.CNa]); }
        return { x: { label: 'Mach number' }, y: { label: 'C_Nα', unit: '/rad' }, includeZero: true,
          series: [{ name: 'total', points: tot }, { name: 'fin set', points: tail }, { name: 'body', points: body, dashed: true }], markers: [{ x: v.M, y: out.o.CNa }] };
      },
    },
    {
      id: 'buildup', title: 'Normal-force build-up along the rocket', wide: true,
      info: { text: 'Cumulative C<sub>Nα</sub> from the nose aft, placing each contribution at its own centre of pressure. Steps show where lift is generated.', doc: 'stability' },
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
        return { x: { label: 'Station from tip', unit: ul.label }, y: { label: 'Cumulative C_Nα', unit: '/rad' }, includeZero: true, xDomain: [0, ul.v(out.len)], xTight: true,
          series: [{ name: 'ΣC_Nα', points: pts, area: true }],
          vlines: [{ x: ul.v(o.xcp), label: 'CP', color: 'var(--accent)' }, ...(v.xcg != null ? [{ x: ul.v(v.xcg), label: 'CG', color: 'var(--accent-2)' }] : [])] };
      },
    },
  ],
  schematicTitle: 'Side view with CP and CG (radius exaggerated)',
  schematicHint: 'Drag profile points up/down, or the fin tip',
  schematic(ctx, v, out) {
    const o = out.o, len = out.len, rmax = o.rmax, prof0 = v.profile;
    const W = 760, H = 300;
    const fr = ctx.frame({ width: W, height: H, label: 'Rocket side view with centre of pressure' });
    const g = fr.layer('main'); g.replaceChildren();
    const u = ctx.U(LEN), L = (x) => `${fmt(u.v(x), { digits: 4 })} ${u.label}`;
    const hemi = prof0[0].r > 0 && !v.flatNose && o.body.Rh;
    const capLen = hemi ? o.body.Rh * (1 - Math.cos(o.body.thetaT)) : 0;
    const kx = (W - 90) / (len + capLen), ky = Math.min(kx * Math.max(1, (0.18 * len) / (rmax + v.b)), 95 / (rmax + v.b));
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
    g.append(s('path', { class: 'sc-body', d: path([...top, ...bot], true), 'data-field': 'profile' }));
    if (prof[0].r > 0 && v.flatNose) g.append(s('line', { x1: X(0), x2: X(0), y1: Y(prof[0].r), y2: Y(-prof[0].r), stroke: 'var(--series-5)', 'stroke-width': 3, 'data-field': 'flatNose' }));
    // fins
    const rr = o.fin.r, finTop = [[X(v.xLE), Y(rr)], [X(v.xTipLE), Y(rr + v.b)], [X(v.xTipLE + v.cT), Y(rr + v.b)], [X(v.xLE + v.cR), Y(rr)]];
    const finBot = finTop.map(([px, py]) => [px, 2 * cy - py]);
    g.append(s('path', { class: 'sc-body-2', d: path(finTop, true), 'data-field': 'N xLE cR xTipLE cT b' }));
    g.append(s('path', { class: 'sc-body-2', d: path(finBot, true), 'data-field': 'N xLE cR xTipLE cT b' }));
    g.append(s('line', { x1: X(0) - 14, x2: X(len) + 14, y1: cy, y2: cy, class: 'sc-axis' }));
    // CP / CG markers and margin
    g.append(pointMarker(X(o.xcp), cy, 'CP', { kind: 'cp' }));
    if (v.xcg != null) {
      g.append(pointMarker(X(v.xcg), cy, 'CG', { kind: 'cg', field: 'xcg' }));
      const st = o.margin < 0 ? 'var(--err)' : o.margin < 1 ? 'var(--warn)' : 'var(--ok)';
      const yb = Y(-(rmax + v.b)) + 26;
      g.append(dim(fr, X(Math.min(v.xcg, o.xcp)), yb, X(Math.max(v.xcg, o.xcp)), yb, null, { field: 'xcg' }));
      g.append(s('text', { x: (X(v.xcg) + X(o.xcp)) / 2, y: yb + 16, 'text-anchor': 'middle', style: `fill:${st};font:600 12px var(--font-mono)` }, `static margin ${fmt(o.margin, { digits: 3 })} cal`));
    }
    g.append(dim(fr, X(0), Y(rmax + v.b) - 10, X(o.xcp), Y(rmax + v.b) - 10, `X_CP = ${L(o.xcp)}`, { off: -6 }));
    g.append(text(W - 10, H - 8, `radius ×${fmt(exag, { digits: 2 })} for clarity`, { anchor: 'end', cls: 'sc-dim-text', size: 10 }));
    // profile point markers + handles (radius)
    prof.forEach((p, i) => {
      g.append(s('circle', { cx: X(p.x), cy: Y(p.r), r: 2.5, fill: 'var(--accent-2)', 'data-row': i, 'data-field': 'profile' }));
      if (i > 0 && i < prof.length && p.x <= Math.max(25, 0.35 * len)) {
        ctx.handle(`p${i}`, X(p.x), Y(p.r), {
          field: 'profile', title: `Drag to change the radius at station ${fmt(u.v(p.x), { digits: 4 })} ${u.label}`,
          onDrag: (px, py) => ctx.setCell('profile', i, 'r', Math.max(0, (cy - py) / ky), { round: 0.005 }),
          onKey: (dx, dy) => ctx.setCell('profile', i, 'r', Math.max(0, p.r * (1 + 0.02 * dy))),
        });
      }
    });
    ctx.handle('fintip', X(v.xTipLE), Y(rr + v.b), {
      field: 'xTipLE b', title: 'Drag to change fin sweep (horizontal) and span (vertical)',
      onDrag: (px, py) => { ctx.setValue('b', Math.max(0.1, (cy - py) / ky - rr), { round: 0.05 }); ctx.setValue('xTipLE', (px - 40) / kx - capLen, { round: 0.05 }); },
      onKey: (dx, dy) => { if (dy) ctx.setValue('b', v.b * (1 + 0.02 * dy)); if (dx) ctx.setValue('xTipLE', v.xTipLE + 0.2 * dx); },
    });
  },
  references: ['barrowman-equations', 'barrowmanthesis-orig', 'hemisphere', '1307-supplement-rev2'],
  examples: [
    { name: 'Gold Rush III, ignition (all profile points)', values: { M: 0.05, xcg: 60, profile: GR3, flatNose: true, ...GR3_FINS } },
    { name: 'Gold Rush III, exactly as the workbook (17.5 in point skipped)', values: { M: 0.05, xcg: 60, profile: GR3.filter((p) => p.x !== 17.5), flatNose: true, ...GR3_FINS } },
    { name: 'Gold Rush III with a hemispherical tip', values: { M: 0.05, xcg: 60, profile: GR3, flatNose: false, ...GR3_FINS } },
  ],
};
