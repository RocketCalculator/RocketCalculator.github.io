// Wind Compensation (launcher settings) — UI definition.
import { windComp, qeForRange, bearing, rangeForQE, rangeForTilt } from '../calc/windcomp.js';
import { s, fmt, InputError } from '../util.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';
import { text, path, fit } from '../ui/svg.js';
import { niceTicks } from '../ui/chart.js';

const DIST = { dim: 'distance', internal: 'ft' };
const ANG = { dim: 'angle' };
const RAD = Math.PI / 180;
// zero-wind impact range against launcher QE, from trajectory runs (the example rocket of the field tool)
const TABLE = [[0, 90], [1250, 88], [2430, 86], [3610, 84], [4600, 82], [5500, 80]].map(([r, qe]) => ({ r, qe }));

/** Signed angle a − b wrapped to (−180°, 180°]. */
const wrap = (a) => { const x = ((a % 360) + 540) % 360 - 180; return x === -180 ? 180 : x; };
const deg = (x, d = 4) => `${fmt(x, { digits: d })}°`;
const ST = { safe: 'ok', marginal: 'warn', unsafe: 'err' };

function checkTable(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return 'Enter at least two trajectory runs.';
  if (rows.some((r) => !Number.isFinite(r.r) || !Number.isFinite(r.qe))) return 'Every cell needs a number.';
  if (rows[0].r !== 0 || rows[0].qe !== 90) return 'The first run must be the vertical launch: range 0 at QE 90°.';
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].r <= rows[i - 1].r) return `Ranges must increase down the table (row ${i}).`;
    if (rows[i].qe >= rows[i - 1].qe) return `QE must fall as the range grows (row ${i}).`;
  }
  if (rows.some((r) => r.qe <= 0)) return 'Every QE must be above 0°.';
  return '';
}

export default {
  slug: 'wind-compensation',
  topic: 'wind-compensation',
  title: 'Wind Compensation',
  subtitle: 'The launcher <b>elevation and azimuth</b> that put the impact point where you want it in the wind — within your range’s tilt limit, or the nearest point that is.',
  verdict: true,
  tiers: true,
  intro: {
    what: 'Combines the impact-point drift that the measured winds cause with a table of zero-wind range against launcher elevation, and gives the launcher quadrant elevation and azimuth that place the impact point at the desired spot.',
    why: 'Wind can move the impact point of a small sounding rocket by kilometres. Tilting the launcher a few degrees cancels most of it and keeps the impact inside the range safety box.',
    when: 'On launch day, after the winds have been measured and run through a trajectory simulation, to set the launcher for the desired impact point.',
  },
  info: {
    text: [
      'For a nearly vertical launch the impact displacements caused by in-plane wind, cross-plane wind and launcher tilt are independent of one another and simply add.',
      'A zero-wind table of impact range against quadrant elevation gives the tilt needed in each plane: in plane, the tilt must supply the range that the wind does not; across the plane, it must cancel the wind drift.',
      'The two small tilts add as a vector, which gives the total tilt and the direction in which to point the launcher.',
    ],
    tex: 'QE_T=90^\\circ-\\sqrt{\\theta_I^2+\\theta_C^2},\\quad AZ_T=AZ+\\tan^{-1}\\frac{\\theta_C}{\\theta_I}',
    steps: [
      'Press “Fill from the Trajectory Simulation” (or run your own simulation) for the wind drift of a vertical launch and the zero-wind ranges.',
      'Enter the zero-wind impact ranges for a few launcher elevations (90°, 88°, … 80°).',
      'Enter the desired impact azimuth and range.',
      'Set the launcher to the quadrant elevation and azimuth shown.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'target', title: 'Desired impact point',
      fields: [
        { id: 'AZ', label: 'Impact azimuth', sym: 'AZ', ...ANG, default: 45, min: 0, max: 360, slider: { min: 0, max: 360, step: 1 },
          info: { text: ['The compass direction from the launcher to where you want the rocket to land: 0° north, 90° east.', 'Usually the middle of the cleared recovery area, from the range safety officer or a map.', 'It is also the direction along which the wind drift is split into “in-plane” and “cross-plane”. Drag the target in the drawing to move it.'], doc: 'geometry' } },
        { id: 'R', label: 'Impact range', sym: 'R', ...DIST, default: 5000, min: 0, max: 1e6, slider: { min: 0, max: 20000, step: 10 },
          info: { text: ['How far from the launcher you want the rocket to land.', 'Often the centre of the cleared impact area; 0 asks for a landing at the launcher.', 'The further the target is from where the wind alone would take the rocket, the more the launcher must tilt.'], range: 'Set by the range safety officer: the centre of the cleared impact area.', doc: 'geometry' } },
      ],
    },
    {
      id: 'wind', title: 'Wind drift of a vertical launch',
      fields: [
        { id: 'WI', label: 'In-plane drift', sym: 'W_I', ...DIST, default: 3200, min: -1e6, max: 1e6, slider: { min: -10000, max: 10000, step: 10 },
          info: { text: ['Where the wind alone takes a rocket launched straight up: the part of that landing point along the impact azimuth. Positive downrange, negative back towards (and past) the launcher.', 'From a trajectory simulation with the measured winds at QE = 90° — or press “Fill from the Trajectory Simulation”.', 'A tailwind drift that already reaches the target means little or no in-plane tilt.'], doc: 'inputs' } },
        { id: 'WC', label: 'Cross-plane drift', sym: 'W_C', ...DIST, default: 4800, min: -1e6, max: 1e6, slider: { min: -10000, max: 10000, step: 10 },
          info: { text: ['The same landing point’s distance across the impact azimuth: positive to the right (clockwise), negative to the left.', 'From the same simulation.', 'The launcher must tilt against it, and that tilt is spent whatever range you want.'], doc: 'inputs' } },
      ],
    },
    {
      id: 'runs', title: 'Zero-wind trajectory runs',
      fields: [
        { id: 'table', label: 'Impact range for each launcher QE', kind: 'table', minRows: 2,
          columns: [{ id: 'r', label: 'Range', ...DIST }, { id: 'qe', label: 'QE', ...ANG }],
          default: TABLE, validate: checkTable,
          info: { text: ['How far the rocket lands with no wind for a few launcher elevations, from a trajectory simulation: 0 at 90°, then every 2° or so down to 80°.', 'Press “Fill from the Trajectory Simulation” to run them for your rocket.', 'Between rows the elevation is interpolated in straight lines; beyond the last row it is extrapolated (warned).'], range: 'Cover the largest drift you expect.', doc: 'inputs' } },
      ],
    },
    {
      id: 'limits', title: 'Your limit',
      fields: [
        { id: 'tmax', label: 'Largest launcher tilt your range allows', sym: '\\theta_{max}', ...ANG, default: 20, min: 1, max: 45, slider: { min: 2, max: 30, step: 0.5 },
          info: { text: ['How far from vertical your range lets you point the launcher.', 'From your range’s or club’s safety code: many limit it to 20° from vertical, but check yours.', 'The verdict checks the tilt against it; when the target needs more, the calculator gives the nearest range along your azimuth that it can reach, and the drawing shows every landing point within reach.'], range: 'Check your range’s rules; 20° from vertical is common.', doc: 'limits' } },
      ],
    },
  ],
  results: [
    { id: 'tilt', label: 'Total tilt from vertical', sym: '\\theta_T', ...ANG, key: true, digits: 3, status: (x, out) => ST[out.lv], note: (x, out) => `your limit ${deg(out.v.tmax, 3)}`,
      info: { text: ['How far the launcher leans from vertical: the in-plane and cross-plane tilts added as a vector.', 'It must stay within your range’s limit.'], tex: '\\theta_T=\\sqrt{\\theta_I^2+\\theta_C^2}', doc: 'combine' } },
    { id: 'QE', label: 'Launcher quadrant elevation', sym: 'QE_T', ...ANG, key: true, digits: 4,
      note: (x, out) => `tilt ${deg(out.o.tilt, 3)} from vertical`,
      info: { text: 'Elevation of the launcher rail above the horizontal.', tex: 'QE_T=90^\\circ-\\sqrt{\\theta_I^2+\\theta_C^2}', doc: 'combine' } },
    { id: 'AZT', label: 'Launcher azimuth', sym: 'AZ_T', ...ANG, key: true, digits: 4,
      note: (x, out, v) => `${fmt(Math.abs(wrap(x - v.AZ)), { digits: 3 })}° ${wrap(x - v.AZ) < 0 ? 'left' : 'right'} of the impact azimuth`,
      info: { text: 'Direction in which the top of the launcher rail points, clockwise from true north.', tex: 'AZ_T=AZ+\\tan^{-1}\\frac{\\theta_C}{\\theta_I}', doc: 'combine' } },
    { id: 'Rok', label: 'Nearest range within your tilt limit', sym: 'R_{ok}', ...DIST, key: true, digits: 4, note: (x, out) => (x === '—' ? 'none along this azimuth: the crosswind alone needs more' : Math.abs(x - out.v.R) < 1e-6 * (out.v.R || 1) ? 'your target is within reach' : `along your azimuth (you asked ${fmt(out.v.R, { digits: 4 })})`),
      info: { text: ['The impact range along your azimuth closest to the one you asked for that needs no more tilt than your limit.', '“—” when even the best range needs too much tilt: the crosswind alone uses it up. Wait for less wind or change the azimuth.'], doc: 'limits' } },
    { id: 'tiltI', label: 'In-plane tilt', sym: '\\theta_I', ...ANG, digits: 4,
      note: (x) => (x < 0 ? 'back, uprange' : 'downrange'),
      info: { text: 'Launcher tilt along the impact azimuth that supplies the range the wind does not.', tex: '\\theta_I=\\pm\\left(90^\\circ-QE(|R-W_I|)\\right)', doc: 'plane' } },
    { id: 'tiltC', label: 'Cross-plane tilt', sym: '\\theta_C', ...ANG, digits: 4,
      note: (x) => (x < 0 ? 'to the left' : x > 0 ? 'to the right' : 'none'),
      info: { text: 'Launcher tilt across the impact azimuth that cancels the cross-plane drift.', tex: '\\theta_C=-\\operatorname{sign}(W_C)\\left(90^\\circ-QE(|W_C|)\\right)', doc: 'plane' } },
    { id: 'reach', label: 'Reach of the launcher tilt within your limit', sym: 'r_{max}', ...DIST, digits: 4, info: { text: ['How far a launcher tilted by your limit moves the landing point from where the wind alone takes it: the radius of the dashed circle in the drawing.'], doc: 'limits' } },
    { id: 'dI', label: 'Range the tilt must add in plane', sym: 'R-W_I', ...DIST, digits: 5, info: { doc: 'plane' } },
    { id: 'qeI', label: 'Zero-wind QE for the in-plane range', sym: 'QE_I', ...ANG, digits: 5, info: { doc: 'plane' } },
    { id: 'qeC', label: 'Zero-wind QE for the cross-plane drift', sym: 'QE_C', ...ANG, digits: 5, info: { doc: 'plane' } },
    { id: 'offAxis', label: 'Angle between launcher and impact azimuths', sym: '\\psi', ...ANG, digits: 4, info: { tex: '\\psi=\\tan^{-1}\\frac{|\\theta_C|}{|\\theta_I|}', doc: 'combine' } },
    { id: 'driftRange', label: 'Wind drift of a vertical launch', sym: 'W', ...DIST, digits: 5, info: { tex: 'W=\\sqrt{W_I^2+W_C^2}', doc: 'geometry' } },
    { id: 'driftAz', label: 'Azimuth of the wind drift', sym: 'AZ_W', ...ANG, digits: 4, info: { doc: 'geometry' } },
  ],
  compute(v) {
    const msg = checkTable(v.table);
    if (msg) throw new InputError(msg);
    // extrapolate at most to twice the longest run; further out the table says nothing
    const last = v.table.at(-1).r;
    if (Math.abs(v.WC) > 2 * last) throw new InputError('The cross-plane drift is more than twice the longest trajectory run: add runs at lower launcher elevations.');
    // a target beyond what the runs cover is taken at the farthest covered range (and said so), not refused
    const Rc = Math.min(Math.max(v.R, v.WI - 2 * last, 0), v.WI + 2 * last), clamped = Math.abs(Rc - v.R) > 1e-9;
    const o = windComp({ table: v.table, WI: v.WI, WC: v.WC, AZ: v.AZ, R: Rc });
    if (!(o.qeI > 0 && o.qeC > 0 && o.QE > 0)) throw new InputError('The trajectory runs extrapolate to an impossible launcher elevation: add runs at lower elevations.');
    const p = { table: v.table, WI: v.WI, WC: v.WC, AZ: v.AZ }, Rok = rangeForTilt({ ...p, R: Rc }, v.tmax), reach = rangeForQE(v.table, 90 - v.tmax);
    // verdict (DECISIONS D35): within the tilt limit; an extrapolated table makes it marginal
    const lv = o.tilt > v.tmax ? 'unsafe' : o.extrapolated ? 'marginal' : 'safe';
    const fixes = [];
    if (lv === 'unsafe') {
      if (Rok != null) fixes.push(`Aim for <b>${fmt(toDisplay(Rok, DIST), { digits: 4 })} ${unitLabel(displayUnit(DIST))}</b> along ${deg(v.AZ, 3)} instead (you asked ${fmt(toDisplay(v.R, DIST), { digits: 4 })}): the nearest range within ${deg(v.tmax, 3)} of tilt, or`);
      else fixes.push(`No range along ${deg(v.AZ, 3)} is reachable: the crosswind alone needs ${deg(Math.abs(o.tiltC), 3)} of tilt. Choose an azimuth closer to the wind drift (${deg(o.driftAz, 3)}), or`);
      fixes.push('wait for less wind.');
    }
    if (lv === 'marginal') fixes.push('Add a zero-wind trajectory run at a lower launcher elevation, so the table covers the range needed.');
    const verdict = {
      level: lv,
      title: lv === 'safe' ? 'The target is within reach of your launcher tilt' : lv === 'marginal' ? 'Within your tilt limit, but read past the last trajectory run' : 'The target needs more tilt than your range allows',
      text: `Set the launcher to <b>QE ${deg(o.QE, 4)}</b>, azimuth <b>${deg(o.AZT, 4)}</b>: a tilt of <b>${deg(o.tilt, 3)}</b> from vertical (your limit ${deg(v.tmax, 3)}).`,
      fixes: fixes.slice(0, 3),
    };
    const warnings = [];
    if (clamped) warnings.push({ level: 'warn', text: `The range you asked for is beyond twice the longest trajectory run; it is taken as ${fmt(Rc, { digits: 4 })} ft, the farthest the runs cover.`, fix: 'Add zero-wind runs at lower launcher elevations.' });
    if (o.extrapolated) warnings.push({ level: 'warn', text: `A range needed (${o.lookI.extrapolated ? 'in plane' : 'cross plane'}) is beyond the last trajectory run, so the QE is extrapolated. Add a run at a lower launcher elevation.` });
    if (o.tilt > 10) warnings.push({ level: 'info', text: `The launcher is tilted ${fmt(o.tilt, { digits: 3 })}° from vertical. The method assumes small tilts that act independently; check the setting with a full trajectory run.` });
    const results = { tilt: o.tilt, QE: o.QE, AZT: o.AZT, Rok: Rok ?? '—', tiltI: o.tiltI, tiltC: o.tiltC, reach, dI: o.dI, qeI: o.qeI, qeC: o.qeC, offAxis: o.offAxis, driftRange: o.driftRange, driftAz: o.driftAz };
    return { results, warnings, verdict, lv, reach, o, v };
  },
  actions: [{
    label: 'Fill from the Trajectory Simulation', title: 'Run your saved Trajectory Simulation: straight up in its winds (the drift) and in still air at 90° to 80° (the range table)',
    async run(v) {
      const def = (await import('./skyaero-trajectory.js')).default;
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem('rc-calc-skyaero-trajectory')); } catch { /* none */ }
      const base = {}; for (const g of def.groups) for (const f of g.fields) base[f.id] = structuredClone(f.default);
      Object.assign(base, structuredClone(def.examples?.[0]?.values || {}), saved || {});
      // drift of a vertical launch in the winds, resolved along (range) and to the right of (cross) the impact azimuth
      const wind = def.compute({ ...base, QE: 90, az: v.AZ }).results;
      // zero-wind range for launcher elevations 90°, 88° … 80°
      const still = { ...base, az: v.AZ, windMode: 'uniform', windU: 0 }, table = [{ r: 0, qe: 90 }];
      for (const qe of [88, 86, 84, 82, 80]) { const r = def.compute({ ...still, QE: qe }).results.range; if (r > table.at(-1).r) table.push({ r, qe }); }
      return { values: { WI: wind.range, WC: wind.cross, table },
        message: `${saved ? 'Your' : 'The example'} Trajectory Simulation: vertical-launch drift ${Math.round(wind.range)} ft in plane, ${Math.round(wind.cross)} ft across; ${table.length} zero-wind runs.` };
    },
  }],
  plots: [
    {
      id: 'runs', title: 'Zero-wind range against launcher elevation', explore: true,
      info: { text: 'The trajectory runs, with the elevations read off for the in-plane range and for the cross-plane drift. Past the last run the dashed line is extrapolated.', doc: 'inputs' },
      build(v, out, { U }) {
        const o = out.o, ud = U(DIST), last = v.table.at(-1), need = Math.max(Math.abs(o.dI), Math.abs(v.WC));
        // straight segments: the runs are interpolated linearly
        const series = [{ name: 'trajectory runs', points: v.table.map((r) => [ud.v(r.r), r.qe]), dots: true }];
        // always defined (from the last run), so the legend does not jump when a range passes the last run
        const ext = [[ud.v(last.r), last.qe]]; if (need > last.r) for (let i = 1; i <= 20; i++) { const x = last.r + ((need - last.r) * i) / 20; ext.push([ud.v(x), qeForRange(v.table, x).qe]); }
        series.push({ name: 'extrapolated', points: ext, dashed: true });
        return { x: { label: 'Zero-wind impact range', unit: ud.label }, y: { label: 'Launcher QE', unit: '{}^{\\circ}' }, series,
          markers: [{ x: ud.v(Math.abs(o.dI)), y: o.qeI, label: 'in plane' }, { x: ud.v(Math.abs(v.WC)), y: o.qeC, label: 'cross plane', color: 'var(--text-2)' }] };
      },
    },
    {
      id: 'tilts', title: 'Launcher tilt against desired range',
      info: { text: ['Tilt from vertical in plane, across the plane and in total as the desired impact range changes, for the same winds.', 'The in-plane tilt passes through zero where the wind alone carries the rocket to the desired range; the total never drops below the cross-plane tilt. Ranges where the total is under the red line are within your limit.'], doc: 'limits' },
      build(v, out, { U }) {
        const ud = U(DIST), top = Math.max(v.table.at(-1).r, 1.3 * v.R, 1.2 * Math.abs(v.WI)), I = [], C = [], T = [];
        for (let i = 0; i <= 120; i++) {
          const R = (top * i) / 120, o = windComp({ table: v.table, WI: v.WI, WC: v.WC, AZ: v.AZ, R }), x = ud.v(R);
          I.push([x, o.tiltI]); C.push([x, o.tiltC]); T.push([x, o.tilt]);
        }
        return { x: { label: 'Desired impact range $R$', unit: ud.label }, y: { label: 'Tilt from vertical', unit: '{}^{\\circ}' },
          series: [{ name: 'total $\\theta_T$', points: T }, { name: 'in plane $\\theta_I$', points: I, dashed: true }, { name: 'cross plane $\\theta_C$', points: C, dashed: true, color: 'var(--text-3)' }],
          hlines: [{ y: 0, color: 'var(--text-3)' }, { y: v.tmax, label: 'your tilt limit', color: 'var(--danger)' }], markers: [{ x: ud.v(v.R), y: out.o.tilt, label: 'your target' }] };
      },
    },
    {
      id: 'azimuth', title: 'Launcher azimuth against desired range', explore: true,
      info: { text: 'How far the launcher must point off the impact azimuth as the desired range changes. Close in, the launcher mainly fights the wind; far out, it points almost along the impact azimuth.', doc: 'combine' },
      build(v, out, { U }) {
        const ud = U(DIST), top = Math.max(v.table.at(-1).r, 1.3 * v.R, 1.2 * Math.abs(v.WI)), pts = [];
        for (let i = 0; i <= 120; i++) { const R = (top * i) / 120, o = windComp({ table: v.table, WI: v.WI, WC: v.WC, AZ: v.AZ, R }); pts.push([ud.v(R), wrap(o.AZT - v.AZ)]); }
        return { x: { label: 'Desired impact range $R$', unit: ud.label }, y: { label: 'Launcher azimuth minus impact azimuth', unit: '{}^{\\circ}' }, series: [{ name: 'AZ_T-AZ', points: pts }],
          hlines: [{ y: 0, color: 'var(--text-3)' }], markers: [{ x: ud.v(v.R), y: wrap(out.o.AZT - v.AZ), label: 'design' }] };
      },
    },
  ],
  schematicTitle: 'Plan view: wind drift and launcher setting',
  schematicHint: 'North is up. The grey path is where the wind alone takes a vertical launch, the red arrow what the launcher tilt adds, and the dashed circle every landing point a tilt within your limit can reach. Drag the target to move the desired impact point',
  schematic(ctx, v, out) {
    const W = 760, H = 430, o = out.o;
    const fr = ctx.frame({ width: W, height: H, label: 'Plan view of the launcher, the wind drift and the desired impact point' });
    const g = fr.layer('main'); g.replaceChildren();
    const ud = ctx.U(DIST), D = (x) => `${fmt(ud.v(x), { digits: 3 })} ${ud.label}`;
    // ground frame: x east, y north
    const at = (az, d) => [d * Math.sin(az * RAD), d * Math.cos(az * RAD)];
    const off = (along, right) => at(bearing(v.AZ, along, right), Math.hypot(along, right));
    const Pd = off(v.WI, v.WC), Pt = at(v.AZ, v.R), Pa = at(v.AZ, v.WI);
    // the plan shows the target, the wind-only point and the whole reachable circle round it
    const reach = Math.max(1, v.R, Math.hypot(...Pd) + out.reach, Math.abs(v.WI)) * 1.08;
    const ticks = niceTicks(0, reach, 4), ring = ticks[1] - ticks[0], Rmax = Math.ceil(reach / ring) * ring;
    const m = fit([-Rmax, -Rmax, Rmax, Rmax], { x: 24, y: 24, w: 470, h: 382 }), X = (p) => m.X(p[0]), Y = (p) => m.Y(p[1]);
    const O = [0, 0], ox = X(O), oy = Y(O);
    // range rings and compass
    for (let r = ring; r <= Rmax + 1e-9; r += ring) {
      g.append(s('circle', { cx: ox, cy: oy, r: r * m.k, class: 'sc-thin', fill: 'none', 'stroke-opacity': 0.35 }));
      g.append(text(ox + 3, oy + r * m.k - 3, D(r), { size: 9.5, cls: 'sc-dim-text' }));
    }
    g.append(s('path', { d: `M${ox},${oy - Rmax * m.k - 4}V${oy + Rmax * m.k + 4}M${ox - Rmax * m.k - 4},${oy}H${ox + Rmax * m.k + 4}`, class: 'sc-thin', 'stroke-opacity': 0.35 }));
    g.append(text(ox, oy - Rmax * m.k - 8, 'N', { anchor: 'middle', size: 12, cls: 'sc-label' }));
    // impact azimuth line
    const far = at(v.AZ, Rmax);
    g.append(s('line', { x1: ox, y1: oy, x2: X(far), y2: Y(far), class: 'sc-thin', 'stroke-dasharray': '10 4 2 4', 'data-field': 'AZ' }));
    // label beside the end of the line, offset clockwise so it never sits on the north mark
    const lx = X(far) + 12 * Math.cos(v.AZ * RAD), ly = Y(far) + 12 * Math.sin(v.AZ * RAD) + 4;
    g.append(text(lx, ly, `AZ = ${deg(v.AZ, 3)}`, { anchor: Math.sin(v.AZ * RAD) < -0.3 ? 'end' : Math.sin(v.AZ * RAD) > 0.3 ? 'start' : 'middle', size: 11, field: 'AZ' }));
    // wind drift of a vertical launch: in-plane then cross-plane components, and the resultant
    g.append(s('path', { d: path([[ox, oy], [X(Pa), Y(Pa)], [X(Pd), Y(Pd)]]), class: 'sc-thin', fill: 'none', 'stroke-dasharray': '2 3', 'data-field': 'WI WC' }));
    g.append(s('line', { x1: ox, y1: oy, x2: X(Pd), y2: Y(Pd), class: 'sc-thin', 'stroke-width': 1.6, 'marker-end': fr.arrow(), 'data-field': 'WI WC' }));
    g.append(s('path', { d: `M${X(Pd) - 6},${Y(Pd) - 6}l12,12m0,-12l-12,12`, class: 'sc-line', 'data-field': 'WI WC' }));
    g.append(text(Math.min(410, Math.max(110, X(Pd))), Y(Pd) + (Y(Pd) > Y(Pt) ? 20 : -12), 'wind only (vertical launch)', { anchor: 'middle', size: 10.5, cls: 'sc-dim-text', field: 'WI WC' }));
    // every landing point a tilt within your limit can reach: about a circle round the wind-only point (the tilt's
    // displacement in each plane comes from the same zero-wind table)
    g.append(s('circle', { cx: X(Pd), cy: Y(Pd), r: out.reach * m.k, fill: 'var(--ok)', 'fill-opacity': 0.06, stroke: 'var(--danger)', 'stroke-dasharray': '7 4', 'stroke-width': 1.4, 'data-field': 'tmax' }));
    g.append(text(X(Pd), Y(Pd) - out.reach * m.k - 6, `reachable within ${deg(v.tmax, 3)} of tilt`, { anchor: 'middle', size: 10.5, field: 'tmax' }));
    // what the tilt adds, to the desired impact point
    if (Math.hypot(Pt[0] - Pd[0], Pt[1] - Pd[1]) * m.k > 14) g.append(s('line', { x1: X(Pd), y1: Y(Pd), x2: X(Pt), y2: Y(Pt), class: 'sc-accent', 'stroke-width': 2, 'marker-end': fr.arrow('acc'), 'data-field': 'R AZ' }));
    g.append(s('circle', { cx: X(Pt), cy: Y(Pt), r: 9, fill: 'none', stroke: 'var(--red)', 'stroke-width': 2, 'data-field': 'R AZ' }));
    g.append(s('circle', { cx: X(Pt), cy: Y(Pt), r: 3, fill: 'var(--red)', 'data-field': 'R AZ' }));
    const tRight = X(Pt) >= ox;
    g.append(text(X(Pt) + (tRight ? 14 : -14), Y(Pt) - 10, 'desired impact', { anchor: tRight ? 'start' : 'end', size: 11, field: 'R AZ' }));
    g.append(text(X(Pt) + (tRight ? 14 : -14), Y(Pt) + 4, D(v.R), { anchor: tRight ? 'start' : 'end', size: 10.5, cls: 'sc-dim-text', field: 'R' }));
    // the launcher, pointing along AZ_T
    const lp = at(o.AZT, (44 / m.k) * Math.min(1, o.tilt / 3 + 0.4));
    g.append(s('line', { x1: ox, y1: oy, x2: X(lp), y2: Y(lp), stroke: 'var(--red)', 'stroke-width': 4, 'stroke-linecap': 'round' }));
    g.append(s('circle', { cx: ox, cy: oy, r: 5, class: 'sc-body' }));
    g.append(text(X(lp) + (lp[0] >= 0 ? 6 : -6), Y(lp) + (lp[1] >= 0 ? -6 : 14), `launcher AZ_T = ${deg(o.AZT, 4)}`, { anchor: lp[0] >= 0 ? 'start' : 'end', size: 11 }));
    // side view of the launcher (inset)
    const bx = 600, by = 330, Lr = 140, qe = o.QE * RAD;
    g.append(text(670, 40, 'launcher, side view', { anchor: 'middle', size: 11, cls: 'sc-label' }));
    g.append(text(670, 55, 'looking across AZ_T', { anchor: 'middle', size: 10, cls: 'sc-dim-text' }));
    g.append(s('path', { d: `M${bx - 30},${by}H${bx + 140}`, class: 'sc-line' }));
    for (let x = bx - 26; x < bx + 140; x += 12) g.append(s('line', { x1: x, y1: by, x2: x - 8, y2: by + 8, class: 'sc-thin', 'stroke-opacity': 0.5 }));
    g.append(s('line', { x1: bx, y1: by, x2: bx, y2: by - Lr - 10, class: 'sc-thin', 'stroke-dasharray': '4 3' }));
    const tx = bx + Lr * Math.cos(qe), ty = by - Lr * Math.sin(qe);
    g.append(s('line', { x1: bx, y1: by, x2: tx, y2: ty, stroke: 'var(--red)', 'stroke-width': 5, 'stroke-linecap': 'round', 'data-field': 'R WI WC' }));
    g.append(s('path', { d: `M${bx - 14},${by}L${bx},${by - 26}L${bx + 14},${by}`, class: 'sc-body-2' }));
    const ar = 70, tilt = o.tilt * RAD;
    if (o.tilt > 0.05) g.append(s('path', { d: `M${bx},${by - ar} A${ar},${ar} 0 0 1 ${bx + ar * Math.sin(tilt)},${by - ar * Math.cos(tilt)}`, class: 'sc-accent', fill: 'none' }));
    g.append(text(bx - 8, by - ar - 4, `tilt \\theta_T = ${deg(o.tilt, 3)}`, { anchor: 'end', size: 11 }));
    const qr = 42;
    g.append(s('path', { d: `M${bx + qr},${by} A${qr},${qr} 0 0 0 ${bx + qr * Math.cos(qe)},${by - qr * Math.sin(qe)}`, class: 'sc-thin', fill: 'none' }));
    g.append(text(bx + qr + 8, by - 10, `QE_T = ${deg(o.QE, 4)}`, { size: 11 }));
    g.append(text(670, by + 30, `${deg(Math.abs(o.tiltI), 3)} ${o.tiltI < 0 ? 'uprange' : 'downrange'} · ${deg(Math.abs(o.tiltC), 3)} ${o.tiltC < 0 ? 'left' : 'right'}`, { anchor: 'middle', size: 10.5, cls: 'sc-dim-text' }));
    g.append(text(24, H - 8, 'plan view, north up · rings: range from the launcher · launcher arrow length is not to scale', { cls: 'sc-dim-text', size: 10 }));
    ctx.handle('target', X(Pt), Y(Pt), {
      field: 'R', title: 'Drag to move the desired impact point',
      onDrag: (sx, sy) => {
        const x = m.invX(sx), y = m.invY(sy);
        ctx.setValue('AZ', ((Math.atan2(x, y) / RAD) + 360) % 360, { round: 1 });
        ctx.setValue('R', Math.hypot(x, y));
      },
      onKey: (dx, dy) => { if (dx) ctx.setValue('AZ', (v.AZ + dx + 360) % 360); if (dy) ctx.setValue('R', Math.max(0, v.R * (1 + 0.05 * dy))); },
    });
  },
  symbols: {
    AZ: 'desired impact azimuth', R: 'desired impact range', W_I: 'in-plane wind drift of a vertical launch', W_C: 'cross-plane wind drift of a vertical launch',
    QE_I: 'zero-wind launcher elevation for the in-plane range', QE_C: 'zero-wind launcher elevation for the cross-plane drift',
    '\\theta_I': 'in-plane launcher tilt', '\\theta_C': 'cross-plane launcher tilt', '\\theta_T': 'total launcher tilt from vertical',
    QE_T: 'launcher quadrant elevation', AZ_T: 'launcher azimuth', QE_i: 'launcher elevation of table row $i$', r_i: 'impact range of table row $i$', F_i: 'slope of the table between rows $i$ and $i+1$',
    x: 'range looked up in the table', x_I: 'range the launcher tilt must add in plane', '\\psi': 'angle between the launcher and impact azimuths', W: 'wind drift of a vertical launch',
  },
  report(v, out, R) {
    const o = out.o, n = R.n, L = (x) => R.Q(x, DIST), A = (x) => `${n(x)}^\\circ`, rr = (x) => R.v(x, DIST);
    const look = (lk, x) => {
      const row = v.table[lk.row], F = lk.F / R.raw(1, DIST);   // slope per displayed length unit
      return { eq: 'QE_i+F_i\\,(x-r_i)', sub: `${A(row.qe)}+(${n(F)}\\,{}^{\\circ}/${R.u(DIST)})\\times(${rr(x)}-${rr(row.r)})\\,${R.u(DIST)}`, res: A(lk.qe) };
    };
    const lI = look(o.lookI, Math.abs(o.dI)), lC = look(o.lookC, Math.abs(v.WC));
    const steps = [
      { label: 'Range the launcher tilt must add in plane (the wind already supplies $W_I$)', lhs: 'x_I', eq: 'R-W_I', sub: `${rr(v.R)}-${rr(v.WI)}`, res: L(o.dI) },
      { label: `Zero-wind elevation for that range, interpolated in the trajectory runs (row ${o.lookI.row})`, lhs: 'QE_I', ...lI },
      { label: `In-plane tilt, ${o.tiltI < 0 ? 'back uprange since the wind carries the rocket past the desired range' : 'downrange'}`, lhs: '\\theta_I', eq: '\\pm(90^\\circ-QE_I)', sub: `${o.tiltI < 0 ? '-' : ''}(90^\\circ-${A(o.qeI)})`, res: A(o.tiltI) },
      { label: `Zero-wind elevation for the cross-plane drift $|W_C|$ (row ${o.lookC.row})`, lhs: 'QE_C', ...lC },
      { label: 'Cross-plane tilt, against the drift', lhs: '\\theta_C', eq: '-\\operatorname{sign}(W_C)\\,(90^\\circ-QE_C)', sub: `${v.WC > 0 ? '-' : ''}(90^\\circ-${A(o.qeC)})`, res: A(o.tiltC) },
      { label: 'Total tilt (small tilts add as a vector)', lhs: '\\theta_T', eq: '\\sqrt{\\theta_I^2+\\theta_C^2}', sub: `\\sqrt{(${A(o.tiltI)})^2+(${A(o.tiltC)})^2}`, res: A(o.tilt) },
      { label: 'Launcher quadrant elevation', lhs: 'QE_T', eq: '90^\\circ-\\theta_T', sub: `90^\\circ-${A(o.tilt)}`, res: A(o.QE) },
      { label: 'Launcher azimuth (the arctangent taken in the quadrant of $\\theta_I$ and $\\theta_C$)', lhs: 'AZ_T', eq: 'AZ+\\tan^{-1}\\frac{\\theta_C}{\\theta_I}', sub: `${A(v.AZ)}+\\tan^{-1}\\frac{${A(o.tiltC)}}{${A(o.tiltI)}}`, res: A(o.AZT) },
    ];
    return [{
      title: 'Theory',
      text: 'For a nearly vertical launch the impact displacements caused by in-plane wind, cross-plane wind and launcher tilt are approximately independent, so they add. A trajectory simulation gives the wind drift $W_I$, $W_C$ of a vertical launch and the zero-wind impact range for several launcher elevations. In plane the tilt must add the range $R-W_I$; across the plane it must cancel $W_C$. Each tilt is read from the zero-wind runs, and the two small tilts add as a vector (Hoult, Espinoza and Cortez).',
      steps,
    }];
  },
  references: ['the-effect-of-wind-and-rotation-of-the-earth-on-unguided-rockets-orig', 'finite-inertia-corrections-orig', 'van-der-hoven-orig'],
  examples: [
    { name: 'Field example (drift 3 200 ft in plane, 4 800 ft to the right)', values: { AZ: 45, R: 5000, WI: 3200, WC: 4800, table: TABLE } },
    { name: 'Light wind, drift to the left', values: { AZ: 0, R: 3000, WI: 800, WC: -1200, table: TABLE } },
    { name: 'Strong tailwind: tilt back uprange', values: { AZ: 90, R: 2000, WI: 4500, WC: 600, table: TABLE } },
  ],
};
