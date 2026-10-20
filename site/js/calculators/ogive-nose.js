// Ogive Nose Profile — UI definition.
import { ogive, wettedAreaToStation } from '../calc/ogive.js';
import { s } from '../util.js';
import { fit, dim, path, pointMarker, text, lbl } from '../ui/svg.js';

const L_IN = { dim: 'length', internal: 'in' };

export default {
  slug: 'ogive-nose',
  topic: 'ogive-nose',
  title: 'Ogive Nose Profile',
  subtitle: 'Shape, surface area and centroid of a <b>tangent-ogive</b> nose cone — the circular-arc nose used on most sounding rockets.',
  intro: {
    what: 'Builds the nose profile from just two numbers — base radius and length — and returns its wetted area and area centroid.',
    why: 'Wetted area drives skin-friction drag and the nose shell’s weight; the centroid locates that weight for CG estimates.',
    when: 'Early sizing of a nose cone, drag build-ups, and mass-properties estimates of a fibreglass or metal shell.',
  },
  info: {
    text: [
      'A tangent ogive is the solid formed by rotating a circular arc about the rocket axis. The arc is chosen so that it meets the body tube <b>tangentially</b> at the base (no kink) and closes to a point at the tip.',
      'Only the base radius $R$ and the nose length $L$ are needed: they fix the radius $a$ of the defining circle, and every other property follows in closed form.',
    ],
    tex: 'a=\\frac{L^2+R^2}{2R},\\qquad r(x)=R-a+\\sqrt{a^2-x^2}',
    texNote: '$x$ is measured forward from the base; body station from the tip is <i>L − x</i>.',
    steps: [
      'Enter the base radius $R$ and length $L$ (drag the handles on the drawing if you prefer).',
      'The defining-circle radius $a$ is found so the arc passes through the tip and is tangent at the base.',
      'Radius is evaluated every $\\Deltax$ to build the profile table and plot.',
      'Surface area and its first moment come from exact integrals; their ratio gives the centroid.',
      'Optionally enter wall thickness and material density to estimate the shell mass.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'geom', title: 'Geometry',
      fields: [
        { id: 'R', shared: 'bodyR', label: 'Base radius', sym: 'R', ...L_IN, default: 3, min: 0, minExclusive: true, slider: { min: 0.5, max: 12 },
          info: { text: 'Radius of the body tube where the nose meets it (half the outside diameter).', range: '1–6 in (25–150 mm) for university sounding rockets.', doc: 'geometry' } },
        { id: 'L', shared: 'noseL', label: 'Nose length', sym: 'L', ...L_IN, default: 30, min: 0, minExclusive: true, slider: { min: 2, max: 120 },
          info: { text: 'Axial length from the tip to the base (shoulder excluded).', range: 'Fineness <i>L/D</i> of 3–7 is common; 5 is a good subsonic/supersonic compromise.', doc: 'geometry' } },
        { id: 'dx', label: 'Profile increment', sym: '\\Delta x', ...L_IN, default: 2.5, min: 0, minExclusive: true,
          info: { text: 'Spacing of the points in the profile table. Use it to make a cutting template or CNC points; it does not change the area or centroid, which are exact.', doc: 'profile' } },
      ],
    },
    {
      id: 'shell', title: 'Shell mass (optional)',
      fields: [
        { id: 't', label: 'Wall thickness', sym: 't', ...L_IN, default: 0, min: 0,
          info: { text: 'Thickness of the nose shell. Leave at 0 to skip the mass estimate.', range: 'Fibreglass layup: 0.06–0.12 in (1.5–3 mm).', doc: 'shell-mass' } },
        { id: 'rho', label: 'Material density', sym: '\\rho', dim: 'matDensity', internal: 'lbin3', default: 1.8 / 27.679904710203, min: 0,
          info: { text: 'Density of the shell material. Mass = wetted area × wall thickness × density (thin-shell approximation).', range: 'Fibreglass ≈ 1.8 g/cm³ (0.065 lb/in³); aluminium 2.7 g/cm³ (0.098 lb/in³).', doc: 'shell-mass' } },
      ],
    },
  ],
  results: [
    { id: 'S', label: 'Wetted area', sym: 'S', dim: 'area', internal: 'in2', key: true,
      info: { text: 'Lateral surface area of the ogive (base disc excluded). Used for skin-friction drag and shell weight.', tex: 'S=2\\pi a\\left[(R-a)\\sin^{-1}\\frac{L}{a}+L\\right]', doc: 'wetted-area' } },
    { id: 'xbar', label: 'Area centroid from tip', sym: '\\bar{x}', dim: 'length', internal: 'in', key: true,
      note: (v, o, val) => `${(100 * v / val.L).toFixed(1)} % of nose length`,
      info: { text: 'Body station of the centroid of the surface area, measured aft of the nose tip. For a uniform-thickness shell this is its centre of mass.', tex: '\\bar{x}=L-\\frac{M}{S}', doc: 'centroid' } },
    { id: 'a', label: 'Defining circle radius', sym: 'a', dim: 'length', internal: 'in', key: true,
      info: { text: 'Radius of the circular arc that generates the ogive. Its centre lies on the base plane, a − R below the axis.', tex: 'a=\\frac{L^2+R^2}{2R}', doc: 'geometry' } },
    { id: 'shellMass', label: 'Shell mass', dim: 'smallMass', internal: 'lbm', key: true, when: (v) => v.t > 0 && v.rho > 0,
      info: { text: 'Thin-shell estimate: wetted area × wall thickness × material density. Shoulder, bulkhead and tip fittings are not included.', tex: 'm\\approx S\\,t\\,\\rho', doc: 'shell-mass' } },
    { id: 'M', label: 'First moment of area about base', sym: 'M', dim: 'moment1', internal: 'in3',
      info: { text: 'Integral of x·dS over the surface, with x measured from the base.', tex: 'M=2\\pi a\\left[\\tfrac12L^2+(R-a)\\left(a-\\sqrt{a^2-L^2}\\right)\\right]', doc: 'centroid' } },
    { id: 'fineness', label: 'Fineness ratio', sym: 'L/D', dim: 'none', digits: 4,
      info: { text: 'Nose length divided by base diameter. Higher fineness lowers supersonic wave drag but adds length, mass and skin friction.', doc: 'geometry' } },
    { id: 'tipHalfAngle', label: 'Tip half-angle', sym: '\\theta_{tip}', dim: 'angle', digits: 4,
      info: { text: 'Angle between the surface and the axis at the tip Equals $\\sin^{-1}(L/a)$.', tex: '\\theta_{tip}=\\sin^{-1}\\frac{L}{a}', doc: 'geometry' } },
  ],
  compute(v) {
    const o = ogive({ R: v.R, L: v.L, dx: v.dx, t: v.t, rho: v.rho });
    const warnings = [];
    if (v.L / (2 * v.R) < 1) warnings.push({ level: 'warn', text: 'Fineness below 1: this is a very blunt arc — check that a tangent ogive is really what you want.' });
    if (v.L / v.dx > 400) warnings.push({ level: 'info', text: `Profile increment gives ${Math.round(v.L / v.dx)} points; the table is limited for readability.` });
    return { results: { S: o.S, xbar: o.xbar, a: o.a, M: o.M, fineness: o.fineness, tipHalfAngle: o.tipHalfAngle, shellMass: o.shellMass }, warnings, o };
  },
  plots: [
    {
      id: 'profile', title: 'Nose profile r(x)',
      info: { text: 'Radius versus body station from the tip, with the points of the profile table. Hover for exact values.', doc: 'profile' },
      build(v, out, { U }) {
        const u = U(L_IN);
        const pts = out.o.profile.slice().reverse().map((p) => [u.v(p.station), u.v(p.r)]);
        const fine = Array.from({ length: 121 }, (_, i) => { const xs = (v.L * i) / 120; const x = v.L - xs; return [u.v(xs), u.v(v.R - out.o.a + Math.sqrt(out.o.a ** 2 - x * x))]; });
        return {
          x: { label: 'Body station from tip', unit: u.label }, y: { label: 'Radius', unit: u.label }, includeZero: true,
          series: [{ name: 'Ogive', points: fine, area: true }, { name: 'Table points', points: pts, dashed: true, color: 'var(--series-2)' }],
          markers: [{ x: u.v(out.o.xbar), y: u.v(v.R - out.o.a + Math.sqrt(out.o.a ** 2 - (v.L - out.o.xbar) ** 2)), label: 'centroid', color: 'var(--key-mark)' }],
        };
      },
    },
    {
      id: 'area', title: 'Wetted area from tip',
      info: { text: 'Cumulative surface area between the tip and each station. This is the curve the drag calculator interpolates to find the laminar wetted area ahead of boundary-layer transition.', doc: 'wetted-area' },
      build(v, out, { U }) {
        const u = U(L_IN), ua = U({ dim: 'area', internal: 'in2' });
        const pts = Array.from({ length: 81 }, (_, i) => { const xs = (v.L * i) / 80; return [u.v(xs), ua.v(wettedAreaToStation(v.R, v.L, xs))]; });
        return { x: { label: 'Body station from tip', unit: u.label }, y: { label: 'Wetted area', unit: ua.label }, includeZero: true,
          series: [{ name: 'S(x)', points: pts }], hlines: [{ y: ua.v(out.o.S), label: `total ${ua.v(out.o.S).toPrecision(5)}\\,${ua.label}`, color: 'var(--key-mark)' }] };
      },
    },
  ],
  schematicTitle: 'Side view (to scale)',
  schematicHint: 'Drag the round handles to change R and L',
  schematic(ctx, v, out) {
    const R = v.R, L = v.L, a = out.o.a;
    const tube = Math.max(0.35 * L, 2 * R);
    const W = 760;
    const H = Math.round(Math.min(380, Math.max(210, ((W - 90) * 2.6 * R) / ((L + tube) * 1.06) + 120)));
    const fr = ctx.frame({ width: W, height: H, label: 'Ogive nose side view' });
    const u = ctx.U(L_IN);
    const fmtL = (x) => lbl(u.v(x), u.label);
    const T = fit([-0.03 * L, -R * 1.3, L + tube, R * 1.3], { x: 30, y: 46, w: W - 140, h: H - 100 });
    // nose tip on the left at station 0; body tube continues to the right
    const PX = (xs) => T.X(xs), PY = T.Y;
    const prof = [];
    for (let i = 0; i <= 120; i++) { const x = (L * i) / 120; prof.push([x, R - a + Math.sqrt(Math.max(0, a * a - x * x))]); }
    const top = prof.map(([x, r]) => [PX(L - x), PY(r)]), bot = prof.map(([x, r]) => [PX(L - x), PY(-r)]).reverse();
    const g = fr.layer('main');
    g.replaceChildren();
    // body tube stub (dashed end)
    g.append(s('path', { class: 'sc-body-2', d: path([[PX(L), PY(R)], [PX(L + tube), PY(R)], [PX(L + tube), PY(-R)], [PX(L), PY(-R)]], true), opacity: 0.55 }));
    g.append(s('path', { class: 'sc-body', d: path([...top, ...bot], true), 'data-field': 'R L' }));
    if (v.t > 0) {
      const inner = prof.map(([x, r]) => [PX(L - x), PY(Math.max(0, r - v.t))]);
      g.append(s('path', { class: 'sc-thin', d: path(inner), 'data-field': 't', 'stroke-dasharray': '3 3' }));
    }
    g.append(s('line', { class: 'sc-axis', x1: PX(-0.06 * L) - 10, x2: PX(L + tube) + 10, y1: PY(0), y2: PY(0) }));
    // defining circle centre & radius (centre at base plane, a−R below axis); show a radius line to the tip
    const cy = -(a - R);
    if (T.Y(cy) < H + 400) {
      g.append(s('line', { class: 'sc-thin', x1: PX(L), y1: PY(cy), x2: PX(0), y2: PY(0), 'stroke-dasharray': '5 4', 'data-field': 'a' }));
      if (PY(cy) < H - 6) g.append(s('circle', { cx: PX(L), cy: PY(cy), r: 3, class: 'sc-accent2-fill' }));
      const mx = (PX(L) + PX(0)) / 2, my = Math.min(H - 10, (PY(cy) + PY(0)) / 2);
      g.append(text(mx + 6, my, `a = ${fmtL(a)}`, { field: 'a' }));
    }
    // dimensions
    g.append(dim(fr, PX(0), PY(R), PX(L), PY(R), `L = ${fmtL(L)}`, { off: -24, field: 'L' }));
    g.append(dim(fr, PX(L + tube), PY(0), PX(L + tube), PY(R), `R = ${fmtL(R)}`, { off: 16, field: 'R' }));
    // centroid marker
    const xc = out.o.xbar, rc = R - a + Math.sqrt(Math.max(0, a * a - (L - xc) ** 2));
    g.append(pointMarker(PX(xc), PY(0), 'centroid', { kind: 'cg' }));
    g.append(s('line', { class: 'sc-thin', x1: PX(xc), x2: PX(xc), y1: PY(rc), y2: PY(-rc), 'stroke-dasharray': '2 3' }));
    g.append(dim(fr, PX(0), PY(-R), PX(xc), PY(-R), `\\bar{x} = ${fmtL(xc)}`, { off: 26, textOff: 14 }));
    // handles
    ctx.handle('L', PX(0), PY(0), {
      field: 'L', title: 'Drag horizontally to change the nose length',
      onDrag: (sx) => ctx.setValue('L', Math.max(0.05 * R, L - T.invX(sx))),
      onKey: (dx) => ctx.setValue('L', L * (1 - 0.01 * dx)),
    });
    ctx.handle('R', PX(L), PY(R), {
      field: 'R', title: 'Drag vertically to change the base radius',
      onDrag: (sx, sy) => ctx.setValue('R', Math.max(0.02 * L, T.invY(sy))),
      onKey: (dx, dy) => ctx.setValue('R', R * (1 + 0.01 * dy)),
    });
  },
  symbols: {
    R: 'base radius of the nose (body-tube radius)', L: 'nose length from tip to base', a: 'radius of the circular arc that generates the ogive',
    x: 'axial distance measured forward from the base', r: 'local body radius', S: 'wetted (lateral) surface area of the nose',
    M: 'first moment of the wetted area about the base', '\\bar{x}': 'centroid of the wetted area measured aft of the nose tip',
    '\\theta_{tip}': 'angle between the surface and the axis at the tip', D: 'base diameter ($2R$)', t: 'shell wall thickness', '\\rho': 'shell material density', m: 'shell mass',
  },
  report(v, out, R) {
    const o = out.o;
    const Ls = { dim: 'length', internal: 'in' }, As = { dim: 'area', internal: 'in2', units: { si: 'mm2', us: 'in2' } }, Vs = { dim: 'volume', internal: 'in3', units: { si: 'mm3', us: 'in3' } };
    const l = (x) => R.v(x, Ls), Lq = (x) => R.Q(x, Ls);
    const steps = [
      { label: 'Defining-circle radius', lhs: 'a', eq: '\\frac{L^2+R^2}{2R}', sub: `\\frac{(${l(v.L)})^2+(${l(v.R)})^2}{2\\times${l(v.R)}}`, res: Lq(o.a) },
      { label: 'Wetted (lateral) area', lhs: 'S', eq: '2\\pi a\\left[(R-a)\\sin^{-1}\\frac{L}{a}+L\\right]', sub: `2\\pi(${l(o.a)})\\left[(${l(v.R - o.a)})\\sin^{-1}\\frac{${l(v.L)}}{${l(o.a)}}+${l(v.L)}\\right]`, res: R.Q(o.S, As) },
      { label: 'First moment of the wetted area about the base', lhs: 'M', eq: '2\\pi a\\left[\\tfrac12L^2+(R-a)\\left(a-\\sqrt{a^2-L^2}\\right)\\right]', sub: `2\\pi(${l(o.a)})\\left[\\tfrac12(${l(v.L)})^2+(${l(v.R - o.a)})\\left(${l(o.a)}-\\sqrt{${l(o.a)}^2-${l(v.L)}^2}\\right)\\right]`, res: R.Q(o.M, Vs) },
      { label: 'Area centroid, aft of the nose tip', lhs: '\\bar{x}', eq: 'L-\\frac{M}{S}', sub: `${l(v.L)}-\\frac{${R.v(o.M, Vs)}}{${R.v(o.S, As)}}`, res: `${Lq(o.xbar)}\\quad(${R.n((100 * o.xbar) / v.L, 3)}\\%\\ \\text{of } L)` },
      { label: 'Tip half-angle', lhs: '\\theta_{tip}', eq: '\\sin^{-1}\\frac{L}{a}', sub: `\\sin^{-1}\\frac{${l(v.L)}}{${l(o.a)}}`, res: `${R.n(o.tipHalfAngle)}^{\\circ}` },
      { label: 'Fineness ratio', lhs: 'L/D', eq: '\\frac{L}{2R}', sub: `\\frac{${l(v.L)}}{2\\times${l(v.R)}}`, res: R.n(o.fineness) },
    ];
    if (o.shellMass) {
      const S2 = { dim: 'area', internal: 'in2', units: { si: 'm2', us: 'in2' } }, T2 = { dim: 'length', internal: 'in', units: { si: 'm', us: 'in' } }, D2 = { dim: 'matDensity', internal: 'lbin3', units: { si: 'kgm3', us: 'lbin3' } }, M2 = { dim: 'mass', internal: 'lbm', units: { si: 'kg', us: 'lbm' } };
      steps.push({ label: 'Thin-shell mass', lhs: 'm', eq: 'S\\,t\\,\\rho', sub: `(${R.Q(o.S, S2)})(${R.Q(v.t, T2)})(${R.Q(v.rho, D2)})`, res: R.Q(o.shellMass, M2) });
    }
    return [{
      title: 'Theory',
      text: 'A tangent ogive is generated by rotating a circular arc of radius $a$ about the rocket axis. The arc is tangent to the body tube at the base and closes to a point at the tip, so the base radius $R$ and length $L$ fix the whole shape. With $x$ measured forward from the base, the local radius is $r(x)=R-a+\\sqrt{a^2-x^2}$. A surface strip of width $dx$ has area $dS=2\\pi a\\left(1+\\frac{R-a}{\\sqrt{a^2-x^2}}\\right)dx$; integrating it, and its moment $x\\,dS$, from base to tip gives the wetted area and its centroid in closed form.',
      steps,
    }];
  },
  references: ['ogive-nose', 'drag-coefficient3-4'],
  examples: [
    { name: '6 in, 5-calibre ogive', values: { R: 3, L: 30, dx: 2.5, t: 0, rho: 1.8 / 27.679904710203 } },
    { name: '4 in fibreglass nose, 4.5 calibre', values: { R: 2, L: 18, dx: 1, t: 0.08, rho: 1.8 / 27.679904710203 } },
    { name: '8 in aluminium nose, 6 calibre', values: { R: 4, L: 48, dx: 4, t: 0.063, rho: 2.7 / 27.679904710203 } },
  ],
};
