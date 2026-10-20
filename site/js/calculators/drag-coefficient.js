// Zero-Lift Drag Coefficient — UI definition.
import { drag } from '../calc/drag.js';
import { s, fmt } from '../util.js';
import { dim, path, text } from '../ui/svg.js';

const LEN = { dim: 'length', internal: 'in' };

const PARTS = [
  ['CDfBody', 'Body skin friction', 'var(--series-1)'],
  ['CDfFin', 'Fin skin friction', 'var(--series-4)'],
  ['CDbOff', 'Body base', 'var(--series-2)'],
  ['CDbFin', 'Fin base', 'var(--series-6)'],
  ['CDle', 'Fin leading edge', 'var(--series-3)'],
  ['CDflat', 'Flat nose face', 'var(--series-5)'],
  ['CDlugs', 'Launch lugs', 'var(--const-mark)'],
  ['wave', 'Wave drag (inputs)', 'var(--text-3)'],
];

export default {
  slug: 'drag-coefficient',
  topic: 'drag-coefficient',
  title: 'Zero-Lift Drag Coefficient',
  subtitle: 'A component <b>drag build-up</b> for a single-stage rocket: laminar/turbulent skin friction, base drag (power off and on), fin leading edges, a flat nose face and launch lugs.',
  source: 'DRAG_COEFFICIENT3.4.xls · Drag Coefficient memo (rev. 3.4)',
  verified: { label: 'Matches workbook (38 cells)', title: 'In spreadsheet mode every computed cell of DRAG_COEFFICIENT3.4.xls, including the VBA CPT function results, is reproduced to 1e-12.' },
  intro: {
    what: 'Adds up each source of drag at one flight condition and plots the build-up across Mach number.',
    why: 'Drag coefficient is the biggest aerodynamic driver of apogee for small rockets — and skin friction, the part you can most easily reduce, is usually the largest.',
    when: 'Feeding a trajectory simulation, comparing nose or fin choices, or checking what a boundary-layer trip or rounded fin edges buy you.',
    typical: 'Workbook rocket (6.1 in × 148 in, four fins, flat nose tip) at Mach 0.9: $C_{D}$ ≈ 0.48 power-off with the memo equations, 0.67 as the spreadsheet computes it.',
  },
  info: {
    text: [
      'Four physical sources make up zero-lift drag: <b>skin friction</b> (viscous shear in the boundary layer), <b>wave drag</b> (shocks), <b>base drag</b> (low pressure behind blunt bases) and <b>parasite drag</b> (lugs, joints, roughness).',
      'Skin friction uses Blasius laminar and Schoenherr-type turbulent flat-plate laws, with natural transition at a fixed Reynolds number or at a trip, whichever comes first. Base drag follows Hoerner; blunt fin edges and lugs use Newtonian stagnation pressure.',
      'Induced drag is not included — sounding rockets fly at almost zero lift.',
    ],
    tex: 'C_D=C_{D_f}+C_{D_{base}}+C_{D_{press}}+C_{D_{lugs}}\\quad\\text{(all on }S_{ref}=\\pi d^2/4)',
    steps: [
      'Enter the flight Mach number and the air temperature and pressure (from the Atmosphere calculator or a trajectory).',
      'Describe the body (nose shape and length, radius, total length), the fins and the small items.',
      'Reynolds number per foot gives the laminar run length; the laminar wetted area is read off the wetted-area curve.',
      'Each component is computed on the body cross-section and summed — power-off (coasting) and power-on (motor burning).',
      'Add a parasite allowance (≈ 5 %) for everything too small to model.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'flight', title: 'Flight condition',
      fields: [
        { id: 'M', label: 'Mach number', sym: 'M', dim: 'none', default: 0.9, min: 0.01, max: 3.2, slider: { min: 0.05, max: 3 },
          info: { text: 'Free-stream Mach number. The model is intended mainly for subsonic and low-supersonic flight; supersonic body and fin wave drag must come from the supersonic tools.', doc: 'overview' } },
        { id: 'T', label: 'Air temperature', sym: 'T', dim: 'temperature', internal: 'R', units: { si: 'K', us: 'R' }, default: 499.17, min: 300, max: 700,
          info: { text: 'Absolute static air temperature at the flight condition.', doc: 'skin-friction' } },
        { id: 'p', label: 'Air pressure', sym: 'p', dim: 'pressure', internal: 'psf', default: 2124, min: 0, minExclusive: true,
          info: { text: 'Static air pressure at the flight condition. Together with temperature it sets the Reynolds number per unit length.', tex: '\\frac{\\rho a}{\\mu}=8\\,816\\,603\\;p_\\infty T^{-1.26}\\ \\mathrm{ft^{-1}}', doc: 'skin-friction' } },
      ],
    },
    {
      id: 'body', title: 'Body',
      fields: [
        { id: 'ogive', label: 'Nose shape', kind: 'select', default: true, options: [{ value: true, label: 'Tangent ogive' }, { value: false, label: 'Cone' }],
          info: { text: 'Sets the nose wetted area (exact closed form for the ogive; see the Ogive calculator).', doc: 'skin-friction' } },
        { id: 'noseLength', label: 'Nose length', sym: 'L_n', ...LEN, default: 36, min: 0, minExclusive: true, info: { text: 'Nose cone length from tip to shoulder.', doc: 'skin-friction' } },
        { id: 'bodyRadius', label: 'Body radius', sym: 'R', ...LEN, default: 3.07, min: 0, minExclusive: true, info: { text: 'Radius of the cylindrical body; d = 2R sets the reference area.', doc: 'overview' } },
        { id: 'bodyLength', label: 'Overall length', sym: 'L', ...LEN, default: 148, min: 0, minExclusive: true, info: { text: 'Tip-to-base length. The cylinder runs from the nose to the base (no boat-tail).', doc: 'skin-friction' } },
        { id: 'ReTbody', label: 'Body transition Reynolds no.', sym: 'Re_T', dim: 'none', default: 200000, min: 1000,
          info: { text: 'Reynolds number at which the body boundary layer turns turbulent naturally. The memo recommends 400,000 for bodies of revolution; the workbook example uses 200,000.', doc: 'skin-friction' } },
        { id: 'trip', label: 'Trip location (from tip)', sym: 'x_{trip}', dim: 'distance', internal: 'ft', default: 2.5, min: 0,
          info: { text: 'Station of a boundary-layer trip (roughness band). Transition happens at the trip or naturally, whichever is nearer the tip.', doc: 'skin-friction' } },
        { id: 'flatNose', label: 'Flat-faced nose tip', kind: 'bool', default: true, info: { text: 'Is the nose tip cut off flat? Adds stagnation-pressure drag on the face.', doc: 'flat-face' } },
        { id: 'flatD', label: 'Flat face diameter', sym: 'd_f', ...LEN, default: 1.5, min: 0, when: (v) => v.flatNose, info: { text: 'Diameter of the flat nose face.', doc: 'flat-face' } },
      ],
    },
    {
      id: 'fins', title: 'Fins',
      fields: [
        { id: 'N', label: 'Number of fins', sym: 'N', dim: 'none', default: 4, min: 1, max: 12, info: { text: 'Number of fin panels.', doc: 'skin-friction' } },
        { id: 'cR', label: 'Root chord', sym: 'c_R', ...LEN, default: 11.8, min: 0, minExclusive: true, info: { text: 'Fin chord at the body.', doc: 'skin-friction' } },
        { id: 'cT', label: 'Tip chord', sym: 'c_T', ...LEN, default: 4.5, min: 0, info: { text: 'Fin chord at the tip.', doc: 'skin-friction' } },
        { id: 'b', label: 'Exposed semispan', sym: 'b', ...LEN, default: 5.84, min: 0, minExclusive: true, info: { text: 'Fin height from the body surface to the tip.', doc: 'skin-friction' } },
        { id: 't', label: 'Fin thickness', sym: 't', ...LEN, default: 0.125, min: 0, info: { text: 'Plate thickness — sets leading-edge and base areas.', doc: 'fin-pressure' } },
        { id: 'bluntLE', label: 'Blunt (rounded) leading edge', kind: 'bool', default: true, info: { text: 'Rounded (hemicylindrical) leading edge, as opposed to a sharp bevel. Blunt edges carry Newtonian pressure drag when the flow normal to the edge is supersonic, or always if the trailing edge is also blunt.', doc: 'fin-pressure' } },
        { id: 'bluntTE', label: 'Blunt (square) trailing edge', kind: 'bool', default: true, info: { text: 'A square trailing edge has base drag; a sharp (bevelled) one does not, unless the fin is a wedge.', doc: 'fin-pressure' } },
        { id: 'wedge', label: 'Wedge half-angle', sym: '\\delta_w', dim: 'angle', default: 0, min: 0, max: 20, info: { text: 'Half-angle of a single-wedge airfoil, in the plane normal to the leading edge. Zero for a flat plate. Adds base area at the trailing edge.', doc: 'fin-pressure' } },
        { id: 'ReTfin', label: 'Fin transition Reynolds no.', sym: 'Re_{T,fin}', dim: 'none', default: 25000, min: 1000,
          info: { text: 'Fins whose leading edges are not smoothly rounded can trip at a low Reynolds number. The memo recommends 25,000.', doc: 'skin-friction' } },
      ],
    },
    {
      id: 'small', title: 'Base, lugs & extras',
      fields: [
        { id: 'nozzleD', label: 'Nozzle exit diameter', sym: 'd_{ex}', ...LEN, default: 0.4, min: 0, info: { text: 'Used for power-on base drag: the jet fills the nozzle exit and only the annulus outside it sees base pressure.', doc: 'base-drag' } },
        { id: 'lugArea', label: 'Lug frontal area (each)', sym: '2Rh', dim: 'area', internal: 'in2', default: 0.36, min: 0, info: { text: 'Projected frontal area of one launch lug (diameter × height).', doc: 'lugs' } },
        { id: 'nLugs', label: 'Number of lugs', dim: 'none', default: 2, min: 0, max: 6, info: { text: 'Riding lugs on the rail. The workbook always counts two.', doc: 'lugs' } },
        { id: 'noseWave', label: 'Nose wave drag $C_D$ (input)', dim: 'none', default: 0, min: 0, info: { text: 'Supersonic body wave drag from the supersonic Barrowman tool (0 below Mach ≈ 1).', doc: 'wave-drag' } },
        { id: 'finWave', label: 'Fin wave drag $C_D$ (input)', dim: 'none', default: 0, min: 0, info: { text: 'Supersonic fin airfoil wave drag from the supersonic tool (0 below Mach ≈ 1).', doc: 'wave-drag' } },
        { id: 'parasite', label: 'Parasite allowance', dim: 'percent', internal: 'pct', default: 5, min: 0, max: 50, info: { text: 'Extra percentage for joints, roughness, antennas and other small items. The memo suggests about 5 %.', doc: 'parasite' } },
      ],
    },
  ],
  compat: {
    label: 'Match original spreadsheet',
    note: 'Off: memo equations. On: DRAG_COEFFICIENT3.4.xls exactly (4 differences — see ⓘ).',
    info: 'Differences between the workbook and its memo: (1) the flat-face nose drag is added twice to the totals; (2) its subsonic formula uses 0.85(1 + ¼M² + M⁴) instead of eq. (22) 0.85(1 + ¼(M² + M⁴)), which is not continuous with the supersonic value; (3) the fin laminar skin-friction term is not weighted by the laminar fraction; (4) power-on base drag omits the factor 1.5 of eq. (14). The memo forms are the default.',
  },
  results: [
    { id: 'CDoff', label: '$C_D$ power-off (coasting)', dim: 'none', key: true, digits: 4, note: (v, o) => `with parasite: ${fmt(o.r.CDoffPar, { digits: 4 })}`,
      info: { text: 'Total zero-lift drag coefficient with the motor off (full base drag). Referenced to the body cross-section.', doc: 'totals' } },
    { id: 'CDon', label: '$C_D$ power-on (thrusting)', dim: 'none', key: true, digits: 4, note: (v, o) => `with parasite: ${fmt(o.r.CDonPar, { digits: 4 })}`,
      info: { text: 'Total drag coefficient while the motor burns: base drag acts only on the annulus outside the nozzle exit.', tex: 'C_{PB}(S_{ex})=1.5\\,C_{PB}(0)\\Big(1-\\frac{S_{ex}}{S_{ref}}\\Big)', doc: 'base-drag' } },
    { id: 'CDf', label: 'Skin friction (body + fins)', dim: 'none', key: true, digits: 4, note: (v, o) => `${fmt((100 * v) / o.r.CDoff, { digits: 3 })} % of power-off total`,
      info: { text: 'Viscous drag of all wetted surfaces.', tex: 'C_{D_f}=C_f\\,\\frac{S_{wet}}{S_{ref}}(1-0.09M^2)', doc: 'skin-friction' } },
    { id: 'CDfBody', label: 'Body skin friction', dim: 'none', digits: 4, info: { text: 'Body friction coefficient times body wetted area over reference area.', doc: 'skin-friction' } },
    { id: 'CDfFin', label: 'Fin skin friction', dim: 'none', digits: 4, info: { text: 'Both sides of every fin panel.', tex: 'C_{D_f}=C_f\\frac{2NS_{fin}}{S_{ref}}', doc: 'skin-friction' } },
    { id: 'CDbOff', label: 'Body base drag (power-off)', dim: 'none', digits: 4, info: { text: 'Hoerner subsonic base pressure, a transonic increment of 0.055, and 65 % of vacuum above the limiting Mach number.', tex: 'C_{PB}=\\frac{0.029}{\\sqrt{C_fS_{wet}/S_{base}}}', doc: 'base-drag' } },
    { id: 'CDbOn', label: 'Body base drag (power-on)', dim: 'none', digits: 4, info: { text: 'Base drag acting on the annulus outside the nozzle exit.', doc: 'base-drag' } },
    { id: 'CDbFin', label: 'Fin base drag', dim: 'none', digits: 4, info: { text: 'Blunt fin trailing edges (and wedge bases).', tex: 'C_{DB}=\\frac{0.135\\,N\\,t\\,b}{S_{ref}\\,C_f^{1/3}}', doc: 'fin-pressure' } },
    { id: 'CDle', label: 'Fin leading-edge pressure drag', dim: 'none', digits: 4, info: { text: 'Newtonian drag of hemicylindrical leading edges.', tex: 'C_D=\\frac{2N t b\\,C_{PT}(M\\cos\\Lambda)\\cos^2\\Lambda}{3S_{ref}}', doc: 'fin-pressure' } },
    { id: 'CDflat', label: 'Flat nose face drag', dim: 'none', digits: 4, info: { text: 'Stagnation pressure on the flat nose face.', tex: 'C_D=\\begin{cases}0.85\\big(1+\\frac14(M^2+M^4)\\big)&M<1\\\\ C_{PT}&M>1\\end{cases}', doc: 'flat-face' } },
    { id: 'CDlugs', label: 'Launch-lug drag', dim: 'none', digits: 4, info: { text: 'Newtonian cylinder drag area 0.8·(2Rh)·$C_{PT}$ per lug.', doc: 'lugs' } },
    { id: 'CfBody', label: 'Body friction coefficient', sym: 'C_f', dim: 'none', digits: 4, info: { text: 'Area-weighted mix of laminar (Blasius) and compressible turbulent friction.', doc: 'skin-friction' } },
    { id: 'CfFin', label: 'Fin friction coefficient', sym: 'C_{f,fin}', dim: 'none', digits: 4, info: { text: 'Average over the fin chord, with transition at the fin transition Reynolds number.', doc: 'skin-friction' } },
    { id: 'xTr', label: 'Body transition station', sym: 'l_T', dim: 'distance', internal: 'ft', info: { text: 'Distance from the tip where the body boundary layer becomes turbulent (natural or trip).', tex: 'l_T=\\frac{\\mu\\,Re_T}{\\rho U}', doc: 'skin-friction' } },
    { id: 'lamFrac', label: 'Laminar fraction of body area', dim: 'percent', internal: 'pct', info: { text: 'Share of the body wetted area ahead of transition.', doc: 'skin-friction' } },
    { id: 'Swet', label: 'Body wetted area', sym: 'S_{wet}', dim: 'area', internal: 'in2', info: { text: 'Nose plus cylinder lateral area.', doc: 'skin-friction' } },
    { id: 'Sref', label: 'Reference area', sym: 'S_{ref}', dim: 'area', internal: 'ft2', units: { si: 'cm2', us: 'ft2' }, info: { text: 'Body cross-section πd²/4 — all coefficients use it.', doc: 'overview' } },
    { id: 'ReBody', label: 'Body Reynolds number', sym: 'Re_L', dim: 'none', info: { text: 'Based on overall length.', doc: 'skin-friction' } },
    { id: 'Mlim', label: 'Transonic base-drag limit Mach', sym: 'M_{lim}', dim: 'none', digits: 4, info: { text: 'Above this Mach number base drag follows the quasi-vacuum law 1.3/γM².', tex: 'M_{lim}=\\sqrt{\\frac{1.3}{\\gamma(C_{DB}+\\Delta C_{DB})}}', doc: 'base-drag' } },
  ],
  compute(v, { compat }) {
    const r = drag(v, { compat });
    const warnings = [];
    if (v.noseLength >= v.bodyLength) throw new Error('The nose must be shorter than the overall length.');
    if (v.M > 1 && v.noseWave === 0) warnings.push({ level: 'info', text: 'Supersonic: add the nose and fin <b>wave drag</b> inputs from the supersonic tools — they are not computed here.' });
    if (v.M > 2.5) warnings.push({ level: 'warn', text: 'The (1 − 0.09M²) friction factor and the base-drag model are increasingly uncertain above Mach ≈ 2.5.' });
    if (v.flatNose && v.flatD >= 2 * v.bodyRadius) warnings.push({ level: 'warn', text: 'The flat face is as large as the body.' });
    const res = { ...r, lamFrac: 100 * r.lamFrac };
    return { results: res, warnings, r, v };
  },
  plots: [
    {
      id: 'mach', title: 'Drag build-up vs Mach number', wide: true,
      info: { text: 'Each component across Mach number at the same air temperature and pressure. The wave-drag inputs are not included in the sweep (they apply to one Mach number). The memo notes the build-up is not smooth through the transonic range — fair through it with judgement.', doc: 'totals' },
      build(v, out, { U }) {
        const mmax = Math.min(3.2, Math.max(2, v.M * 1.4));
        const keys = [['CDoff', 'Total, power-off'], ['CDon', 'Total, power-on'], ['CDf', 'Skin friction'], ['CDbOff', 'Body base (off)'], ['press', 'Fin LE + flat face'], ['CDlugs', 'Lugs']];
        const series = keys.map(([k, name]) => ({ name, points: [] }));
        for (let i = 0; i <= 120; i++) {
          const M = 0.05 + ((mmax - 0.05) * i) / 120;
          const r = drag({ ...v, M, noseWave: 0, finWave: 0 }, { compat: !!v.__compat });
          keys.forEach(([k], j) => series[j].points.push([M, k === 'press' ? r.CDle + r.CDflat : r[k]]));
        }
        series[1].dashed = true;
        return { x: { label: 'Mach number' }, y: { label: 'Drag coefficient' }, includeZero: true, series,
          vlines: [{ x: 1, label: 'M = 1', color: 'var(--text-3)' }],
          markers: [{ x: v.M, y: out.r.CDoff - v.noseWave - v.finWave, label: `C_D = ${fmt(out.r.CDoff, { digits: 3 })}` }] };
      },
    },
    {
      id: 'wetted', title: 'Body wetted area and transition',
      info: { text: 'Wetted area ahead of each station (memo Fig. 1). The laminar wetted area is read from this curve at the transition station.', doc: 'skin-friction' },
      build(v, out, { U }) {
        const ul = U(LEN), ua = U({ dim: 'area', internal: 'in2' });
        const xt = Math.min(12 * out.r.xTr, v.bodyLength);
        return { x: { label: 'Body station from tip', unit: ul.label }, y: { label: 'Wetted area ahead of station', unit: ua.label }, includeZero: true,
          series: [{ name: 'S_{wet}(x)', points: out.r.curve.map(([x, S]) => [ul.v(x), ua.v(S)]) }],
          vlines: [{ x: ul.v(xt), label: 'transition', color: 'var(--ok)' }],
          markers: [{ x: ul.v(xt), y: ua.v(out.r.Slam), label: `laminar ${fmt(ua.v(out.r.Slam), { digits: 3 })} ${ua.label}`, color: 'var(--ok)' }] };
      },
    },
  ],
  schematicTitle: 'Where the drag comes from',
  schematicHint: 'Rocket drawn to scale · bar shows the power-off split',
  schematic(ctx, v, out) {
    const r = out.r;
    const W = 760, H = 300;
    const fr = ctx.frame({ width: W, height: H, label: 'Rocket with drag sources and breakdown bar' });
    const g = fr.layer('main'); g.replaceChildren();
    const u = ctx.U(LEN), L = (x) => `${fmt(u.v(x), { digits: 3 })} ${u.label}`;
    const Lb = v.bodyLength, R = v.bodyRadius, Ln = v.noseLength;
    const k = Math.min((W - 80) / (Lb + 1e-9), 120 / (R + v.b)), x0 = 40, cy = 110;
    const X = (x) => x0 + x * k, Y = (y) => cy - y * k;
    // nose profile
    const a = (Ln * Ln + R * R) / (2 * R);
    const rN = (xs) => (v.ogive ? R - a + Math.sqrt(Math.max(0, a * a - (Ln - xs) ** 2)) : (R * xs) / Ln);
    let xs0 = 0;
    if (v.flatNose && v.flatD > 0) { const rf = Math.min(v.flatD / 2, R * 0.95); let lo = 0, hi = Ln; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (rN(m) < rf) lo = m; else hi = m; } xs0 = lo; }
    const top = [], bot = [];
    for (let i = 0; i <= 60; i++) { const xs = xs0 + ((Ln - xs0) * i) / 60; top.push([X(xs), Y(rN(xs))]); bot.push([X(xs), Y(-rN(xs))]); }
    const body = [...top, [X(Lb), Y(R)], [X(Lb), Y(-R)], ...bot.reverse()];
    g.append(s('path', { class: 'sc-body', d: path(body, true), 'data-field': 'noseLength bodyRadius bodyLength ogive' }));
    // laminar region overlay
    const xt = Math.min(12 * r.xTr, Lb);
    if (xt > xs0) {
      const lamTop = top.filter((p) => p[0] <= X(xt)), xtEnd = Math.min(xt, Lb);
      const yt = xtEnd < Ln ? rN(xtEnd) : R;
      g.append(s('path', { d: path([...lamTop, [X(xtEnd), Y(yt)], [X(xtEnd), Y(yt) - 4], ...lamTop.slice().reverse().map(([px, py]) => [px, py - 4])], true), fill: 'var(--ok)', opacity: 0.85, 'data-field': 'ReTbody trip' }));
    }
    g.append(s('line', { x1: X(xt), x2: X(xt), y1: Y(R) - 4, y2: Y(-R) + 6, stroke: 'var(--ok)', 'stroke-dasharray': '3 3', 'data-field': 'ReTbody trip' }));
    g.append(text(X(xt) + 4, Y(-R) + 16, `transition ${fmt(ctx.U({ dim: 'distance', internal: 'ft' }).v(r.xTr), { digits: 3 })} ${ctx.U({ dim: 'distance', internal: 'ft' }).label}`, { size: 10.5, field: 'ReTbody trip' }));
    if (v.flatNose) g.append(s('line', { x1: X(xs0), x2: X(xs0), y1: Y(rN(xs0)), y2: Y(-rN(xs0)), stroke: 'var(--series-5)', 'stroke-width': 3, 'data-field': 'flatNose flatD' }));
    // fins (TE at base) top and bottom
    const finPts = (sgn) => [[X(Lb - v.cR), Y(sgn * R)], [X(Lb - v.cT), Y(sgn * (R + v.b))], [X(Lb), Y(sgn * (R + v.b))], [X(Lb), Y(sgn * R)]];
    g.append(s('path', { class: 'sc-body-2', d: path(finPts(1), true), 'data-field': 'cR cT b N' }));
    g.append(s('path', { class: 'sc-body-2', d: path(finPts(-1), true), 'data-field': 'cR cT b N' }));
    if (v.bluntLE) g.append(s('path', { d: path([finPts(1)[0], finPts(1)[1]]), stroke: 'var(--series-3)', 'stroke-width': 3, fill: 'none', 'data-field': 'bluntLE t' }));
    if (v.bluntTE || v.wedge) g.append(s('line', { x1: X(Lb), x2: X(Lb), y1: Y(R), y2: Y(R + v.b), stroke: 'var(--series-6)', 'stroke-width': 3, 'data-field': 'bluntTE wedge' }));
    // lugs (positions are illustrative)
    for (let i = 0; i < Math.min(v.nLugs, 4); i++) {
      const xl = Ln + ((Lb - Ln) * (i + 1)) / (Math.min(v.nLugs, 4) + 1);
      g.append(s('rect', { x: X(xl) - 5, y: Y(R) - 5, width: 10, height: 5, fill: 'var(--const-mark)', 'data-field': 'lugArea nLugs' }));
    }
    // base / nozzle
    g.append(s('rect', { x: X(Lb), y: Y(v.nozzleD / 2), width: 5, height: v.nozzleD * k, fill: 'var(--text-2)', 'data-field': 'nozzleD' }));
    g.append(s('path', { d: `M${X(Lb) + 6},${Y(R)} q 14,${R * k} 0,${2 * R * k}`, fill: 'none', stroke: 'var(--series-2)', 'stroke-width': 2, 'stroke-dasharray': '3 3', 'data-field': 'nozzleD' }));
    g.append(s('line', { x1: X(-2), x2: X(Lb) + 22, y1: cy, y2: cy, class: 'sc-axis' }));
    g.append(dim(fr, X(0), Y(-R - v.b), X(Lb), Y(-R - v.b), `L = ${L(Lb)}`, { off: 16, textOff: 14, field: 'bodyLength' }));
    g.append(dim(fr, X(0), Y(R), X(Ln), Y(R), `L_n = ${L(Ln)}`, { off: -30, field: 'noseLength' }));
    // ---- breakdown bar
    const parts = PARTS.map(([key, label, color]) => ({ key, label, color, v: key === 'wave' ? v.noseWave + v.finWave : key === 'CDlugs' ? r.CDlugs : r[key] }))
      .map((p) => (p.key === 'CDflat' && v.__compat ? { ...p, v: 2 * p.v, label: 'Flat nose face (×2 in workbook)' } : p)).filter((p) => p.v > 1e-9);
    const tot = parts.reduce((a2, p) => a2 + p.v, 0);
    const bx = 40, bw = W - 80, by = 222;
    g.append(text(bx, by - 8, `POWER-OFF C_D = ${fmt(r.CDoff, { digits: 4 })}`, { cls: 'sc-dim-text', size: 11 }));
    let acc = 0;
    parts.forEach((p, i) => {
      const w = (p.v / tot) * bw;
      const seg = s('g', {});
      seg.append(s('rect', { x: bx + acc, y: by, width: Math.max(0.5, w - 1), height: 18, fill: p.color, rx: 2 }, s('title', {}, `${p.label}: ${fmt(p.v, { digits: 4 })} (${fmt((100 * p.v) / tot, { digits: 3 })} %)`)));
      if (w > 46) seg.append(s('text', { x: bx + acc + 5, y: by + 13, style: 'fill:var(--surface);font:600 10px var(--font-sans)' }, `${Math.round((100 * p.v) / tot)}%`));
      g.append(seg);
      acc += w;
    });
    // legend
    let lx = bx, ly = by + 36;
    for (const p of parts) {
      const label = `${p.label} ${fmt(p.v, { digits: 3 })}`;
      const w = label.length * 6.4 + 22;
      if (lx + w > bx + bw) { lx = bx; ly += 16; }
      g.append(s('rect', { x: lx, y: ly - 9, width: 10, height: 10, rx: 2, fill: p.color }));
      g.append(text(lx + 14, ly, label, { size: 10.5 }));
      lx += w;
    }
    ctx.handle('nose', X(xs0), cy, { field: 'noseLength', title: 'Drag to change the nose length',
      onDrag: (px) => ctx.setValue('noseLength', Math.max(0.5 * R, Math.min(Lb - v.cR, Ln - (px - X(xs0)) / k)), { round: 0.5 }),
      onKey: (dx) => ctx.setValue('noseLength', Ln * (1 - 0.02 * dx)) });
  },
  reportNotes: ['Equations are evaluated in the memo’s units (inches for geometry, feet in Reynolds numbers, °R, lbf/ft²); coefficients are referenced to $S_{ref}=\\pi d^2/4$. The inputs and results tables use your selected unit system.', 'Supersonic body and fin wave drag are inputs taken from the supersonic tools, not computed here.'],
  report(v, out, R) {
    const r = out.r, n = R.n, q = R.q, M = v.M, cp = v.__compat;
    const fric = [
      { label: 'Reynolds number per foot', lhs: '\\frac{\\rho a}{\\mu}', eq: '8\\,816\\,603\\;p_\\infty T^{-1.26}', sub: `8\\,816\\,603\\times${n(v.p)}\\times${n(v.T)}^{-1.26}`, res: `${n(r.E)}\\ \\mathrm{ft^{-1}}` },
      { label: 'Laminar run (natural transition or trip, whichever is first)', lhs: 'l_T', eq: '\\min\\left(\\frac{Re_T}{(\\rho a/\\mu)M},\\ x_{trip}\\right)', sub: `\\min\\left(\\frac{${n(v.ReTbody)}}{${n(r.E)}\\times${n(M)}},\\ ${n(v.trip)}\\right)`, res: q(r.xTr, 'ft') },
      { label: 'Body wetted area and its laminar part', lhs: 'S_{wet}', eq: 'S_{nose}+2\\pi R(L-L_n)', sub: `${n(r.Snose)}+2\\pi(${n(v.bodyRadius)})(${n(v.bodyLength)}-${n(v.noseLength)})`, res: `${q(r.Swet, 'in2')},\\quad lamS_{wet}=${q(r.Slam, 'in2')}` },
      { label: 'Body friction coefficient (Blasius laminar + compressible turbulent, eq. 7 and 9)', lhs: 'C_f', eq: '\\frac{1.328\\,(lamS/S)}{\\sqrt{Re_T}}+\\frac{0.427\\,(1-lamS/S)\\,(1+0.15M^2)^{-0.58}}{(\\log_{10}Re_L-0.407)^{2.64}}', sub: `\\frac{1.328\\times${n(r.lamFrac)}}{\\sqrt{${n(r.E * M * r.xTr)}}}+\\frac{0.427\\times${n(1 - r.lamFrac)}\\times${n((1 + 0.15 * M * M) ** -0.58)}}{(\\log_{10}${n(r.ReBody)}-0.407)^{2.64}}`, res: n(r.CfBody) },
      { label: 'Body skin-friction drag', lhs: 'C_{D_f,body}', eq: 'C_f\\frac{S_{wet}}{S_{ref}}(1-0.09M^2)', sub: `${n(r.CfBody)}\\times\\frac{${n(r.Swet / 144)}}{${n(r.Sref)}}\\times${n(1 - 0.09 * M * M)}`, res: n(r.CDfBody) },
      { label: 'Fin chord Reynolds number and friction coefficient', lhs: 'Re_{\\bar c}', eq: '\\frac{\\rho a}{\\mu}\\,\\bar c\\,M', sub: `${n(r.E)}\\times${n(r.cAvg)}\\times${n(M)}`, res: `${n(r.ReC)},\\quad C_{f,fin}=${n(r.CfFin)}${cp ? '\\ (\\text{workbook form})' : ''}` },
      { label: 'Fin skin-friction drag (both sides of every panel)', lhs: 'C_{D_f,fins}', eq: 'C_{f,fin}\\frac{2NS_{fin}}{S_{ref}}(1-0.09M^2)', sub: `${n(r.CfFin)}\\times\\frac{${n(v.N)}\\times${n(r.finWet / 144)}}{${n(r.Sref)}}\\times${n(1 - 0.09 * M * M)}`, res: n(r.CDfFin) },
    ];
    const base = [
      { label: 'Subsonic base-pressure coefficient (Hoerner)', lhs: 'C_{PB}', eq: '\\frac{0.029}{\\sqrt{C_f S_{wet}/S_{base}}}', sub: `\\frac{0.029}{\\sqrt{${n(r.CfBody)}\\times${n(r.Swet / 144)}/${n(r.Sref)}}}`, res: `${n(r.CPBsub)},\\quad M_{lim}=\\sqrt{\\frac{1.3}{\\gamma(C_{PB}+0.055)}}=${n(r.Mlim)}` },
      { label: `Body base drag at M = ${n(M)} (power-off)`, lhs: 'C_{D_B}', eq: M < 1 ? 'C_{PB}' : M < r.Mlim ? 'C_{PB}+0.055' : '\\frac{1.3}{\\gamma M^2}', res: n(r.CDbOff) },
      { label: 'Power-on base drag (jet fills the nozzle exit)', lhs: 'C_{D_B,on}', eq: cp ? 'C_{D_B}\\left(1-\\frac{S_{ex}}{S_{ref}}\\right)' : '1.5\\,C_{D_B}\\left(1-\\frac{S_{ex}}{S_{ref}}\\right)', sub: `${cp ? '' : '1.5\\times'}${n(r.CDbOff)}\\times\\left(1-\\frac{${n(r.Sex)}}{${n(r.Sref)}}\\right)`, res: n(r.CDbOn) },
      { label: 'Fin trailing-edge base drag', lhs: 'C_{DB,fins}', eq: '\\frac{0.135\\,N\\,(t\\,b+S_{wedge})}{S_{ref}C_f^{1/3}}', res: n(r.CDbFin) },
    ];
    const press = [
      { label: 'Stagnation-pressure coefficient (isentropic below Mach 1, Rayleigh pitot above)', lhs: 'C_{PT}(M)', eq: M <= 1 ? '\\frac{2}{\\gamma M^2}\\left[\\left(1+\\frac{\\gamma-1}{2}M^2\\right)^{\\frac{\\gamma}{\\gamma-1}}-1\\right]' : '\\frac{2}{\\gamma M^2}\\left[\\left(\\frac{\\gamma+1}{2}M^2\\right)^{\\frac{\\gamma}{\\gamma-1}}\\left(\\frac{\\gamma+1}{2\\gamma M^2-\\gamma+1}\\right)^{\\frac1{\\gamma-1}}-1\\right]', res: n(r.Cpt0) },
      { label: 'Fin leading-edge (Newtonian) pressure drag', lhs: 'C_{D,LE}', eq: '\\frac{2N\\,t\\,b\\,C_{PT}(M\\cos\\Lambda)\\cos^2\\Lambda}{3S_{ref}}', res: `${n(r.CDle)}\\quad(\\Lambda=${n((r.sweep * 180) / Math.PI)}^{\\circ})` },
      { label: 'Launch lugs', lhs: 'C_{D,lugs}', eq: 'n_{lug}\\,\\frac{0.8\\,(2Rh)\\,C_{PT}}{S_{ref}}', sub: `${cp ? 2 : n(v.nLugs)}\\times\\frac{0.8\\times${n(v.lugArea / 144)}\\times${n(r.Cpt0)}}{${n(r.Sref)}}`, res: n(r.CDlugs) },
    ];
    if (v.flatNose) press.push({ label: 'Flat nose face', lhs: 'C_{D,flat}', eq: M > 1 ? 'C_{PT}\\frac{\\pi d_f^2/4}{S_{ref}}' : cp ? '0.85\\left(1+0.25M^2+M^4\\right)\\frac{\\pi d_f^2/4}{S_{ref}}' : '0.85\\left(1+\\tfrac14(M^2+M^4)\\right)\\frac{\\pi d_f^2/4}{S_{ref}}', res: n(r.CDflat) + (cp ? '\\ (\\text{counted twice in the workbook total})' : '') });
    const totals = [
      { label: 'Power-off total', lhs: 'C_{D,off}', eq: 'C_{D_f}+C_{D_B}+C_{DB,fins}+C_{D,wave}+C_{D,LE}+C_{D,flat}+C_{D,lugs}', sub: `${n(r.CDf)}+${n(r.CDbOff)}+${n(r.CDbFin)}+${n(v.noseWave + v.finWave)}+${n(r.CDle)}+${n(r.CDflat)}+${n(r.CDlugs)}${cp ? `+${n(r.CDflat)}` : ''}`, res: n(r.CDoff, 4) },
      { label: 'Power-on total', lhs: 'C_{D,on}', eq: 'C_{D,off}-C_{D_B}+C_{D_B,on}', res: n(r.CDon, 4) },
      { label: `With a ${n(v.parasite)} % parasite allowance`, lhs: 'C_{D,off}^{\\,par}', eq: `C_{D,off}\\times${n(1 + v.parasite / 100)}`, res: `${n(r.CDoffPar, 4)},\\quad C_{D,on}^{\\,par}=${n(r.CDonPar, 4)}` },
    ];
    return [
      { title: 'Theory', text: 'Zero-lift drag is built up from skin friction (viscous shear, laminar ahead of transition and turbulent behind it), base drag (low pressure behind the body base and blunt fin trailing edges), pressure drag of blunt fin leading edges, a flat nose face and launch lugs (Newtonian stagnation pressure), wave drag (inputs) and a parasite allowance. All coefficients are referenced to the body cross-section (C. P. Hoult, Drag Coefficient rev. 3.4, 2016; S. F. Hoerner).' },
      { title: 'Skin friction', steps: fric },
      { title: 'Base drag', steps: base },
      { title: 'Pressure drag of edges, nose face and lugs', steps: press },
      { title: 'Totals', steps: totals },
    ];
  },
  references: ['drag-coefficient3-4', 'modified-newtonian-aero4', 'ogive-nose'],
  examples: [
    { name: 'Workbook rocket at Mach 0.9 (sea level, 39 °F)', values: { M: 0.9, T: 499.17, p: 2124, ogive: true, noseLength: 36, bodyRadius: 3.07, bodyLength: 148, ReTbody: 200000, trip: 2.5, flatNose: true, flatD: 1.5, N: 4, cR: 11.8, cT: 4.5, b: 5.84, t: 0.125, bluntLE: true, bluntTE: true, wedge: 0, ReTfin: 25000, nozzleD: 0.4, lugArea: 0.36, nLugs: 2, noseWave: 0, finWave: 0, parasite: 5 } },
    { name: 'Same rocket, sharp nose, bevelled fins', values: { M: 0.9, T: 499.17, p: 2124, ogive: true, noseLength: 36, bodyRadius: 3.07, bodyLength: 148, ReTbody: 400000, trip: 2.5, flatNose: false, flatD: 1.5, N: 4, cR: 11.8, cT: 4.5, b: 5.84, t: 0.125, bluntLE: false, bluntTE: false, wedge: 0, ReTfin: 25000, nozzleD: 0.4, lugArea: 0.36, nLugs: 2, noseWave: 0, finWave: 0, parasite: 5 } },
  ],
};
