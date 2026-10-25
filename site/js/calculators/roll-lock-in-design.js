// Roll Lock-In — UI definition.
import { design, vortex, rollMoment, lockIn, sigmaAlpha } from '../calc/lockin.js';
import { s, fmt, InputError } from '../util.js';
import { text, path } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const LEN = { dim: 'length', internal: 'm' };
const ANG = { dim: 'angle', internal: 'rad' };
const SLOPE = { dim: 'perAngle', internal: 'perrad' };
const NONE = { dim: 'none' };
const IN = 0.0254, DEG = Math.PI / 180;
const A = (x) => `${fmt(toDisplay(x, ANG), { digits: 3 })}${unitLabel(displayUnit(ANG))}`;
const Lq = (x) => `${fmt(toDisplay(x, LEN), { digits: 3 })} ${unitLabel(displayUnit(LEN))}`;

const P = (v) => ({ ...v, sweep: v.sweep, alphaMax: v.alphaMax });
const xi = (p, a) => ((p.xF - p.xS) * a) / p.R;
/** |C_Li|max / damping term against α for a design (coarser grid for the trade plots). */
const ratioCurve = (p, n = 40) => { const d = design(p), L = lockIn(p, d, n, 24); return L.curve.map((c) => [c.alpha, Math.abs(c.cl) / d.D]); };

function check(v) {
  for (const k of ['U', 'q', 'R', 'Ip', 'CNN', 'b', 'SM', 'CNa', 'alphaMax']) if (!(v[k] > 0)) throw new InputError('Speed, dynamic pressure, radius, inertia, lift slopes, fin span, static margin and the angle range must be positive.');
  if (!(v.xF > v.xS)) throw new InputError('The fins must be behind the vortex separation station: no vortex reaches them otherwise.');
  if (!(v.xF > v.xCG + v.SM && v.xCG + v.SM > v.xN)) throw new InputError('This static margin cannot be reached: the required centre of pressure (CG + static margin) must lie between the nose and fin centres of pressure.');
}

export default {
  slug: 'roll-lock-in-design',
  topic: 'roll-lock-in',
  title: 'Roll Lock-In',
  subtitle: 'Smallest angle of attack at which <b>nose vortices</b> can lock a rocket’s roll rate onto its pitch frequency, and the chance it never gets there.',
  intro: {
    what: 'Sizes the fins for a required static margin, computes the roll moment induced on them by the vortex pair shed from the nose, and finds the smallest angle of attack at which that moment can hold the roll rate at the pitch frequency against roll damping. Thrust misalignment statistics then give the probability of no lock-in.',
    why: 'Locked-in (lunar) coning holds the rocket at a large angle of attack with one side facing inward: drag soars and apogee is lost. It has struck Aerobee sounding rockets and Sidewinder missiles. Fin count and static margin are the levers.',
    when: 'Choosing static margin and the number of fins, and checking a design that will pass slowly through pitch–roll resonance.',
  },
  info: {
    text: [
      'At angle of attack the nose sheds a pair of vortices that trail over the fins. With their images in the body they induce a roll moment that varies with roll angle and grows quickly with angle of attack.',
      'Lock-in is possible once the largest induced moment balances the fin roll damping at the pitch frequency. Below that angle of attack it cannot happen; above, it is a matter of the misalignment statistics.',
      'More static margin and more fins (six or eight) raise the lock-in angle; taper and span matter little.',
    ],
    tex: '\\left|\\frac{C_{Lp}}{U}\\left(R\\omega-R\\omega_n\\right)\\right|\\le\\left|C_{Li\\,max}(\\alpha^*)\\right|',
    steps: ['Enter the flight condition at resonance and the body data.', 'Enter the fin layout and the required static margin; the root chord follows.', 'Enter the thrust misalignment statistics.', 'Read the lock-in angle of attack and the probability of no lock-in; try more fins or margin.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'flight', title: 'Flight condition (at pitch–roll resonance)',
      fields: [
        { id: 'U', label: 'Flight speed', sym: 'U', dim: 'speed', internal: 'ms', default: 10000 * IN, min: 1e-6, info: { doc: 'damping' } },
        { id: 'q', label: 'Dynamic pressure', sym: 'q', dim: 'pressure', internal: 'Pa', default: 4 * 6894.757, min: 1e-6, info: { text: 'Lower dynamic pressure (higher altitude) makes lock-in easier.', doc: 'damping' } },
      ],
    },
    {
      id: 'body', title: 'Body',
      fields: [
        { id: 'R', label: 'Body radius', sym: 'R', ...LEN, default: 3 * IN, min: 1e-6, info: { doc: 'vortex' } },
        { id: 'Ip', label: 'Pitch moment of inertia', sym: 'I_p', dim: 'inertia', internal: 'kgm2', default: 21.78, min: 1e-9, info: { text: 'About the centre of mass. The default is a uniform 60 lb, 122 in rocket (mL²/12).', doc: 'damping' } },
        { id: 'xCG', label: 'Centre of mass station', sym: 'x_{CG}', ...LEN, default: 71 * IN, min: 0, info: { text: 'Stations are measured aft of the nose tip.', doc: 'fins' } },
        { id: 'xN', label: 'Nose centre of pressure', sym: 'x_{CPN}', ...LEN, default: 39 * IN, min: 0, info: { doc: 'fins' } },
        { id: 'CNN', label: 'Nose normal-force slope', sym: 'C_{N\\alpha N}', ...SLOPE, default: 2, min: 1e-6, info: { text: '2 per radian for any slender nose.', doc: 'fins' } },
        { id: 'xS', label: 'Vortex separation station', sym: 'x_S', ...LEN, default: 36 * IN, min: 0,
          info: { text: 'Where the vortex pair leaves the body, about where the zero-α surface pressure is lowest (just aft of the nose shoulder). The Nose Pressure Distribution calculator gives it.', doc: 'vortex' } },
      ],
    },
    {
      id: 'fins', title: 'Fins',
      fields: [
        { id: 'N', backView: (v) => ({ R: v.R, span: v.b, nominal: { t: true }, unit: LEN, range: [3, 8], note: 'The induced roll moment sums N fins 2π/N apart: more fins smooth it out, raising the lock-in angle (six or eight fins markedly).' }), label: 'Number of fins', sym: 'N', ...NONE, default: 4, min: 3, max: 8, slider: { min: 3, max: 8, step: 1 }, info: { text: 'Six fins are much better than four, and eight better still; three and four differ little.', doc: 'design' } },
        { id: 'xF', label: 'Fin centre of pressure', sym: 'x_{CPF}', ...LEN, default: 108 * IN, min: 0, info: { doc: 'fins' } },
        { id: 'b', label: 'Exposed semispan', sym: 'b', ...LEN, default: 6 * IN, min: 1e-6, info: { doc: 'fins' } },
        { id: 'lam', label: 'Taper ratio', sym: '\\lambda', ...NONE, default: 0.3, min: 0, max: 1, slider: { min: 0, max: 1, step: 0.05 }, info: { text: 'Tip chord / root chord.', doc: 'fins' } },
        { id: 'SM', label: 'Required static margin', sym: 'SM', ...LEN, default: 20 * IN, min: 1e-6, info: { text: 'Sets the fin size (root chord). The classical two calibres is often not enough to avoid lock-in.', doc: 'fins' } },
        { id: 'CNa', label: 'Fin airfoil normal-force slope', sym: 'C_{N\\alpha}', ...SLOPE, default: 4, min: 1e-6, info: { text: 'Span-averaged 3-D slope without body interference.', range: 'About 4 per radian for a typical fin.', doc: 'fins' } },
        { id: 'CDaa', label: 'Fin drag-polar constant', sym: 'C_{D\\alpha\\alpha}', ...NONE, default: 0.2, min: 0, max: 2, slider: { min: 0, max: 1, step: 0.01 }, info: { text: 'Second derivative of section drag with angle of attack; about 0.2. Only affects the small coning rate.', doc: 'damping' } },
        { id: 'sweep', label: 'Leading-edge sweep', sym: '\\Lambda', ...ANG, default: 60 * DEG, min: 0, max: 85 * DEG, slider: { min: 0, max: 80 * DEG, step: DEG }, info: { doc: 'damping' } },
      ],
    },
    {
      id: 'perturb', title: 'Perturbations (one sigma, per axis)',
      fields: [
        { id: 'T', label: 'Thrust', sym: 'T', dim: 'force', internal: 'N', default: 2224, min: 0, info: { doc: 'probability' } },
        { id: 'lT', label: 'Nozzle to centre of mass', sym: 'l_T', ...LEN, default: 51 * IN, min: 0, info: { doc: 'probability' } },
        { id: 'sdT', label: 'Thrust misalignment angle', sym: '\\delta_T', ...ANG, default: 0.002, min: 0, max: 0.1, slider: { min: 0, max: 0.006, step: 0.0001 }, info: { range: 'Typically 0.05–0.3° for fixed-nozzle solid motors.', doc: 'probability' } },
        { id: 'sOm', label: 'Centre of mass offset', sym: '\\Omega', ...LEN, default: 0.002, min: 0, info: { text: 'Lateral offset of the centre of mass from the thrust line.', doc: 'probability' } },
        { id: 'alphaMax', label: 'Largest angle of attack examined', sym: '\\alpha_{max}', ...ANG, default: 9 * DEG, min: DEG, max: 30 * DEG, slider: { min: 2 * DEG, max: 20 * DEG, step: 0.5 * DEG }, info: { text: 'Upper end of the search. The cross-flow model holds while √(M²−1)·sin α ≪ 1.', doc: 'lockin' } },
      ],
    },
  ],
  results: [
    { id: 'alphaStar', label: 'Smallest lock-in angle of attack', sym: '\\alpha^*', ...ANG, key: true, digits: 3, note: (x, out) => (typeof x === 'number' ? 'below it lock-in cannot happen' : `none up to ${A(out.v.alphaMax)}`),
      info: { text: 'Smallest angle of attack at which the largest vortex-induced roll moment can balance fin roll damping at the pitch frequency (eq. 30).', doc: 'lockin' } },
    { id: 'Pno', label: 'Probability of no lock-in', sym: 'P', dim: 'percent', internal: 'pct', key: true, digits: 4, note: (x, out) => (typeof out.results.alphaStar === 'number' ? 'trim α stays below α* (Rayleigh)' : `at least: α stays below ${A(out.v.alphaMax)}`),
      info: { tex: 'P=1-\\exp\\left(-\\frac{\\alpha^{*2}}{2\\sigma_\\alpha^2}\\right)', doc: 'probability' } },
    { id: 'sigma', label: 'Trim angle of attack at resonance (1σ per axis)', sym: '\\sigma_\\alpha', ...ANG, key: true, digits: 3, info: { text: 'From the thrust misalignment and centre-of-mass offset statistics (eq. 27).', doc: 'probability' } },
    { id: 'D', label: 'Roll damping term (eq. 30)', sym: 'C_{L,damp}', ...NONE, key: true, digits: 4, note: (x, out) => `pitch frequency ${fmt(out.o.d.wn / (2 * Math.PI), { digits: 3 })} Hz`, info: { tex: '\\left|\\frac{C_{Lp}R}{U}(\\omega-\\omega_n)\\right|', doc: 'damping' } },
    { id: 'cR', label: 'Fin root chord (from static margin)', sym: 'c_R', ...LEN, digits: 4, note: (x, out) => `tip ${Lq(out.o.d.cT)}`, info: { doc: 'fins' } },
    { id: 'CNaF', label: 'Fin assembly normal-force slope', sym: 'C_{N\\alpha F}', ...SLOPE, digits: 4, info: { doc: 'fins' } },
    { id: 'CMa', label: 'Pitching moment slope', sym: 'C_{M\\alpha}', ...SLOPE, digits: 4, info: { text: 'On reference area πR² and length 2R.', doc: 'damping' } },
    { id: 'CLp', label: 'Roll damping derivative', sym: 'C_{Lp}', ...NONE, digits: 4, info: { text: 'Per Rp/U, on πR² and 2R.', doc: 'damping' } },
    { id: 'w', label: 'Coning rate', sym: '\\omega', dim: 'rate', internal: 'rads', digits: 3, info: { doc: 'damping' } },
  ],
  compute(v) {
    check(v);
    const p = P(v), d = design(p);
    if (!(d.cR > 0) || !(d.CMa < 0)) throw new InputError('No fin size gives this static margin with these inputs.');
    const L = lockIn(p, d), sig = sigmaAlpha(p, d), aS = L.alphaStar, edge = aS ?? v.alphaMax;
    const Pno = 100 * (sig > 0 ? -Math.expm1(-(edge * edge) / (2 * sig * sig)) : 1);
    const warnings = [];
    if (aS === null) warnings.push({ level: 'info', text: `No lock-in is possible up to ${A(v.alphaMax)}: the vortex-induced roll moment never reaches the damping term. Raise the largest angle examined to find α*.` });
    else if (Pno < 99) warnings.push({ level: 'warn', text: `A ${fmt(100 - Pno, { digits: 2 })}% chance of roll lock-in. Add static margin or fins (six or eight), or improve alignment.` });
    if (d.cR > 6 * v.b) warnings.push({ level: 'warn', text: 'The root chord is more than six semispans: very low aspect ratio fins, where strip theory is poor. Increase the span.' });
    return { results: { alphaStar: aS ?? '—', Pno, sigma: sig, D: d.D, cR: d.cR, CNaF: d.CNaF, CMa: d.CMa, CLp: d.CLp, w: d.w }, warnings, o: { d, L, edge }, v };
  },
  plots: [
    {
      id: 'lockin', title: 'Conditions for lock-in',
      info: { text: 'Largest vortex-induced roll moment against angle of attack (memo Fig. 7). Lock-in is possible where it rises above the damping line; the first crossing is α*.', doc: 'lockin' },
      build(v, out, { U }) {
        const ua = U(ANG), { L, d } = out.o, aS = L.alphaStar;
        return { x: { label: 'Angle of attack $\\alpha$', unit: ua.label }, y: { label: 'Roll moment coefficient', unit: '' }, includeZero: true,
          series: [{ name: '|C_Li| max over roll angle', points: [[0, 0], ...L.curve.map((c) => [ua.v(c.alpha), Math.abs(c.cl)])], smooth: true }],
          hlines: [{ y: d.D, label: 'roll damping', color: 'var(--text-3)' }],
          ...(aS !== null ? { vlines: [{ x: ua.v(aS), label: `α* = ${A(aS)}`, color: 'var(--err)' }], markers: [{ x: ua.v(aS), y: d.D }] } : {}) };
      },
    },
    {
      id: 'roll', title: 'Induced roll moment against roll angle',
      info: { text: 'Vortex-induced roll moment over one fin period at four angles of attack (memo Fig. 6). It is nearly a sine wave; at small angles its phase can flip by 180°.', doc: 'vortex' },
      build(v, out, { U }) {
        const ua = U(ANG), p = P(v), f = out.o.L.f, per = (2 * Math.PI) / v.N;
        const series = [1 / 3, 5 / 9, 7 / 9, 1].map((k, i) => {
          const a = k * v.alphaMax, vt = vortex(a, xi(p, a), p.R, p.U), pts = [];
          for (let j = 0; j <= 72; j++) { const phi = (per * j) / 72; pts.push([ua.v(phi), rollMoment(f, vt, phi)]); }
          return { name: `α = ${A(a)}`, points: pts, smooth: true, dashed: i < 3 };
        });
        return { x: { label: 'Roll angle $\\phi$', unit: ua.label }, y: { label: 'Induced roll moment $C_{Li}$', unit: '' }, series, hlines: [{ y: 0, color: 'var(--text-3)' }] };
      },
    },
    {
      id: 'fins', title: 'Effect of the number of fins',
      info: { text: 'Largest induced roll moment divided by the roll damping term, for 3, 4, 6 and 8 fins at the same static margin (memo Figs. 10–13). Lock-in is possible where a curve passes 1.', doc: 'design' },
      build(v, out, { U }) {
        const ua = U(ANG), p = P(v);
        const series = [3, 4, 6, 8].map((N) => ({ name: `${N} fins`, points: [[0, 0], ...ratioCurve({ ...p, N }).map(([a, r]) => [ua.v(a), r])], smooth: true, dashed: N !== v.N, width: N === v.N ? 2.4 : 1.5 }));
        return { x: { label: 'Angle of attack $\\alpha$', unit: ua.label }, y: { label: '|C_Li| max / damping term', unit: '' }, includeZero: true, series, hlines: [{ y: 1, label: 'lock-in possible above', color: 'var(--err)' }] };
      },
    },
    {
      id: 'margin', title: 'Effect of static margin',
      info: { text: 'Smallest lock-in angle of attack against required static margin (memo Fig. 8). Larger margins put lock-in out of reach of ordinary perturbations.', doc: 'design' },
      build(v, out, { U }) {
        const ua = U(ANG), ul = U(LEN), p = P(v), lo = Math.max(1e-6, v.xN - v.xCG) + 0.02 * (v.xF - v.xCG), hi = 0.97 * (v.xF - v.xCG), pts = [];
        for (let i = 0; i <= 14; i++) {
          const SM = lo + ((hi - lo) * i) / 14, q = { ...p, SM }, d = design(q);
          if (!(d.cR > 0) || !(d.CMa < 0)) continue;
          const a = lockIn(q, d, 40, 24).alphaStar;
          if (a !== null) pts.push([ul.v(SM), ua.v(a)]);
        }
        if (pts.length < 2) return null;
        return { x: { label: 'Static margin $SM$', unit: ul.label }, y: { label: 'Lock-in angle of attack $\\alpha^*$', unit: ua.label }, includeZero: true,
          series: [{ name: '\\alpha^*', points: pts, smooth: true, dots: true }],
          ...(out.o.L.alphaStar !== null ? { markers: [{ x: ul.v(v.SM), y: ua.v(out.o.L.alphaStar), label: 'design' }] } : {}) };
      },
    },
  ],
  schematicTitle: 'Nose vortices over the fins',
  schematicHint: 'Left: looking forward at the fin station, the free vortex pair (filled) and their images inside the body (open), with the fins at the roll angle of the largest induced moment. Right: side view, vortices leaving the body at the separation station and trailing over the fins (not to scale)',
  schematic(ctx, v, out) {
    const W = 760, H = 330, { d, L, edge } = out.o, p = P(v);
    const fr = ctx.frame({ width: W, height: H, label: 'Vortex pair and fins looking forward, and side view of the vortex trail' });
    const g = fr.layer('main'); g.replaceChildren();
    const aS = L.alphaStar ?? edge, vt = vortex(aS, xi(p, aS), p.R, p.U), phiW = (L.curve.reduce((best, c) => (Math.abs(c.alpha - aS) < Math.abs(best.alpha - aS) ? c : best), L.curve[0])).phi;
    // left: cross-section looking forward
    const cx = 175, cy = 170, k = 118 / Math.max(v.R + v.b, vt.r * 1.08), P2 = (rho, th) => [cx + rho * k * Math.sin(th), cy - rho * k * Math.cos(th)];
    for (let i = 0; i < v.N; i++) {
      const th = phiW + (2 * Math.PI * i) / v.N, [x1, y1] = P2(v.R, th), [x2, y2] = P2(v.R + v.b, th);
      g.append(s('line', { x1, y1, x2, y2, stroke: 'var(--schem-stroke)', 'stroke-width': 4.5, 'stroke-linecap': 'round', 'data-field': 'N b' }));
    }
    g.append(s('circle', { cx, cy, r: v.R * k, class: 'sc-body', 'data-field': 'R' }));
    for (const sg of [1, -1]) {
      const [fx, fy] = P2(vt.r, sg * vt.phiV), [ix, iy] = P2(vt.s, sg * vt.phiV);
      g.append(s('line', { x1: cx, y1: cy, x2: fx, y2: fy, class: 'sc-thin', 'stroke-dasharray': '3 3' }));
      g.append(s('circle', { cx: fx, cy: fy, r: 5, fill: 'var(--red)' }));
      g.append(s('path', { d: `M${fx - 11 * sg},${fy - 7}A13,13 0 0 ${sg > 0 ? 1 : 0} ${fx + 11 * sg},${fy - 7}`, class: 'sc-accent', 'stroke-width': 1.4, 'marker-end': fr.arrow('acc') }));
      g.append(s('circle', { cx: ix, cy: iy, r: 4, fill: 'var(--surface)', stroke: 'var(--red)', 'stroke-width': 1.5 }));
    }
    const [lx, ly] = P2(vt.r, vt.phiV);
    g.append(text(lx + 16, ly + 4, 'Γ', { size: 12 }));
    g.append(text(cx, cy + 4, 'image', { anchor: 'middle', size: 9.5, cls: 'sc-dim-text' }));
    g.append(s('line', { x1: cx, y1: cy + 150, x2: cx, y2: cy + 112, class: 'sc-accent2', 'marker-end': fr.arrow() }));
    g.append(text(cx + 8, cy + 146, 'U sin α (cross flow)', { size: 10.5 }));
    g.append(text(20, 22, `looking forward · α = ${A(aS)} · fins at the worst roll angle`, { size: 10, cls: 'sc-dim-text' }));
    // right: side view (stations to scale along x, heights exaggerated)
    const Lb = v.xF + 0.6 * d.cR, x0 = 400, kx = 330 / Lb, X = (x) => x0 + x * kx, by = 205, r = 15, nL = Math.min(2.1 * v.xN, 0.45 * Lb);
    g.append(s('path', { d: `M${X(0)},${by}Q${X(nL * 0.35)},${by - r} ${X(nL)},${by - r}H${X(Lb)}V${by + r}H${X(nL)}Q${X(nL * 0.35)},${by + r} ${X(0)},${by}Z`, class: 'sc-body' }));
    const cr = d.cR * kx, ct = d.cT * kx, fx0 = X(Lb) - cr, span = 34;
    g.append(s('path', { d: `M${fx0},${by - r}L${X(Lb) - ct},${by - r - span}H${X(Lb)}V${by - r}Z M${fx0},${by + r}L${X(Lb) - ct},${by + r + span}H${X(Lb)}V${by + r}Z`, class: 'sc-body-2', 'data-field': 'SM b lam' }));
    const vy = (x) => by - r - Math.min(55, Math.max(0, 0.21 * ((x - v.xS) * aS) / v.R) * r * 2.4 + 4);
    const trail = []; for (let i = 0; i <= 30; i++) { const x = v.xS + ((Lb - v.xS) * i) / 30; trail.push([X(x), vy(x)]); }
    g.append(s('path', { d: path(trail), class: 'sc-accent', 'stroke-dasharray': '6 4', 'data-field': 'xS' }));
    g.append(s('circle', { cx: X(v.xS), cy: by - r, r: 3.5, fill: 'var(--red)', 'data-field': 'xS' }));
    g.append(text(X(v.xS), by - r - 12, 'x_S separation', { anchor: 'middle', size: 10.5, field: 'xS' }));
    g.append(text(X(Lb) - 4, vy(Lb) - 12, 'vortex over the fins', { anchor: 'end', size: 10.5 }));
    g.append(s('circle', { cx: X(v.xCG), cy: by, r: 5, fill: 'var(--text)', 'data-field': 'xCG' }));
    g.append(text(X(v.xCG), by + r + 16, 'CG', { anchor: 'middle', size: 10.5, field: 'xCG' }));
    g.append(s('line', { x1: X(v.xCG + v.SM), x2: X(v.xCG + v.SM), y1: by - r - 4, y2: by + r + 4, class: 'sc-thin', 'stroke-dasharray': '3 2', 'data-field': 'SM' }));
    g.append(text(X(v.xCG + v.SM), by + r + 30, `CP · SM ${Lq(v.SM)}`, { anchor: 'middle', size: 10.5, field: 'SM' }));
    // free stream at α (exaggerated)
    const ua = Math.max(aS, 6 * DEG) * 1.5;
    g.append(s('line', { x1: X(0) - 8 - 60 * Math.cos(ua), y1: by + 4 + 60 * Math.sin(ua), x2: X(0) - 8, y2: by + 4, class: 'sc-accent2', 'marker-end': fr.arrow() }));
    g.append(text(X(0) - 40, by + 4 + 60 * Math.sin(ua) + 16, 'U at α', { anchor: 'middle', size: 10.5 }));
    g.append(text(x0, 22, 'side view · heights exaggerated', { size: 10, cls: 'sc-dim-text' }));
  },
  symbols: {
    U: 'flight speed', q: 'dynamic pressure', R: 'body radius', I_p: 'pitch moment of inertia', 'x_{CG}': 'centre-of-mass station', 'x_{CPN}': 'nose centre of pressure', 'x_{CPF}': 'fin centre of pressure', x_S: 'vortex separation station',
    'C_{N\\alpha N}': 'nose normal-force slope', 'C_{N\\alpha F}': 'fin assembly normal-force slope', 'C_{N\\alpha}': 'fin airfoil normal-force slope', SM: 'static margin', N: 'number of fins', b: 'exposed semispan', '\\lambda': 'taper ratio',
    c_R: 'root chord', c_1: 'chord factor $1+(R/b)(1-\\lambda)$', c_2: 'chord slope $(\\lambda-1)/b$', 'C_{M\\alpha}': 'pitching moment slope', 'C_{Nr}': 'yaw damping derivative', 'C_{Np\\alpha}': 'Magnus (yaw-due-to-roll) derivative', 'C_{Lp}': 'roll damping derivative',
    '\\omega_n': 'pitch natural frequency', '\\omega': 'coning rate', '\\Gamma': 'vortex circulation', r: 'vortex core radius', s: 'image vortex radius', '\\phi_V': 'vortex roll angle', '\\xi': 'distance aft of separation $(x-x_S)\\alpha/R$', '\\alpha': 'angle of attack',
    '\\alpha^*': 'smallest lock-in angle of attack', 'C_{Li}': 'vortex-induced roll moment coefficient', 'C_{L,damp}': 'roll damping term of eq. 30', '\\sigma_\\alpha': 'trim angle of attack (one sigma)', T: 'thrust', l_T: 'nozzle to centre of mass', '\\delta_T': 'thrust misalignment angle', '\\Omega': 'centre of mass offset', P: 'probability of no lock-in',
    '\\Lambda': 'leading-edge sweep', 'C_{D\\alpha\\alpha}': 'fin drag-polar constant',
  },
  report(v, out, R) {
    const { d, L } = out.o, n = R.n, Lv = (x) => R.v(x, LEN), aS = L.alphaStar;
    const steps = [
      { label: 'Fin assembly slope needed for the static margin (eq. 37)', lhs: 'C_{N\\alpha F}', eq: 'C_{N\\alpha N}\\,\\frac{x_{CG}+SM-x_{CPN}}{x_{CPF}-x_{CG}-SM}', sub: `${n(v.CNN)}\\times\\frac{${Lv(v.xCG)}+${Lv(v.SM)}-${Lv(v.xN)}}{${Lv(v.xF)}-${Lv(v.xCG)}-${Lv(v.SM)}}`, res: R.Q(d.CNaF, SLOPE) },
      { label: 'Root chord with body upwash (eq. 33), c(y) = c_R(c_1 + c_2 y)', lhs: 'c_R', eq: '\\frac{2\\pi R^2C_{N\\alpha F}}{N\\,C_{N\\alpha}\\left[c_1b+c_2(b^2+2bR)/2+c_1R^2b/(R(b+R))+c_2R^2\\ln((b+R)/R)\\right]}', res: R.Q(d.cR, LEN) },
      { label: 'Pitching moment slope and pitch frequency', lhs: 'C_{M\\alpha}', eq: '\\frac{x_{CG}(C_{N\\alpha N}+C_{N\\alpha F})-x_{CPN}C_{N\\alpha N}-x_{CPF}C_{N\\alpha F}}{2R}', res: n(d.CMa) },
      { lhs: '\\omega_n', eq: '\\sqrt{-2\\pi q R^3C_{M\\alpha}/I_p}', res: R.Q(d.wn, { dim: 'rate', internal: 'rads' }) },
      { label: 'Yaw damping, Magnus and roll damping derivatives (eqs. 38, 41, 35)', lhs: 'C_{Nr}', eq: '-\\frac{(x_{CPN}-x_{CG})^2C_{N\\alpha N}+(x_{CPF}-x_{CG})^2C_{N\\alpha F}}{2R^2}', res: n(d.CNr) },
      { lhs: 'C_{Np\\alpha}', eq: '-\\frac{N\\,c_R(C_{N\\alpha}-C_{D\\alpha\\alpha}\\sin^2\\Lambda)}{2\\pi R^4}\\left[\\ldots\\right]', res: n(d.CNpa) },
      { lhs: 'C_{Lp}', eq: '-\\frac{N\\,C_{N\\alpha}c_R}{2\\pi R^4}\\left[\\frac{c_1}{3}((b+R)^3-R^3)+\\frac{c_2}{4}((b+R)^4-R^4)\\right]', res: n(d.CLp) },
      { label: 'Coning rate (eq. 25) and the roll damping term of eq. 30', lhs: '\\omega', eq: '\\frac{2\\pi qR^4}{U\\,I_p}(C_{Nr}-C_{Np\\alpha})', res: R.Q(d.w, { dim: 'rate', internal: 'rads' }) },
      { lhs: 'C_{L,damp}', eq: '\\left|\\frac{C_{Lp}R}{U}(\\omega-\\omega_n)\\right|', res: n(d.D) },
      { label: 'Vortex pair at the fins (eqs. 1–4), ξ = (x_CPF − x_S)α/R', lhs: '\\Gamma', eq: '2\\pi RU\\alpha\\,(0.6+0.08\\,\\xi^{1.52})', res: aS !== null ? `${n(vortex(aS, xi(P(v), aS), v.R, v.U).Gamma)}\\ \\text{m}^2/\\text{s at }\\alpha^*` : '—' },
      { label: 'Induced roll moment of N fins and four vortices (eqs. 12–19), largest over roll angle; α* is where it first reaches the damping term (eq. 30)', lhs: '\\alpha^*', eq: '\\min\\{\\alpha:\\ \\max_\\phi|C_{Li}(\\phi,\\alpha)|\\ge C_{L,damp}\\}', res: aS !== null ? R.Q(aS, ANG) : '\\text{none up to }' + R.Q(v.alphaMax, ANG) },
      { label: 'Trim angle of attack statistics (eq. 27) and the probability of no lock-in', lhs: '\\sigma_\\alpha', eq: '\\frac{T\\sqrt{l_T^2\\delta_T^2+\\Omega^2}}{2\\pi qR^3\\left|C_{M\\alpha}-\\frac{2\\pi qR^5}{U^2I_p}(C_{Nr}-C_{Np\\alpha})^2\\right|}', res: R.Q(out.results.sigma, ANG) },
      { lhs: 'P', eq: '1-\\exp\\left(-\\frac{\\alpha^{*2}}{2\\sigma_\\alpha^2}\\right)', res: R.Q(out.results.Pno, { dim: 'percent', internal: 'pct' }) },
    ];
    return [{
      title: 'Theory',
      text: 'The nose sheds a vortex pair whose strength and position come from wind-tunnel fits; with image vortices inside the body it induces a normal velocity on each fin strip, integrated in closed form across the span. In steady lunar coning at the pitch frequency, roll equilibrium requires the induced roll moment to balance fin roll damping; the smallest angle of attack where that is possible is $\\alpha^*$. The trim angle of attack from thrust misalignment is Rayleigh distributed (Hoult & Tran).',
      steps,
    }];
  },
  references: ['sounding-rocket-fin-design-to-mitigate-roll-lock-in-orig'],
  examples: [{ name: 'Memo example: 60 lb rocket, 4 fins, 20 in static margin', values: { U: 10000 * IN, q: 4 * 6894.757, R: 3 * IN, Ip: 21.78, xCG: 71 * IN, xN: 39 * IN, CNN: 2, xS: 36 * IN, N: 4, xF: 108 * IN, b: 6 * IN, lam: 0.3, SM: 20 * IN, CNa: 4, CDaa: 0.2, sweep: 60 * DEG, T: 2224, lT: 51 * IN, sdT: 0.002, sOm: 0.002, alphaMax: 9 * DEG } }],
};
