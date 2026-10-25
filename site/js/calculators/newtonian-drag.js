// Modified Newtonian Drag — UI definition.
import { newtonian, cpStagnation, M_CRIT_CAP, M_CRIT_LE } from '../calc/newtonian.js';
import { s, fmt, InputError } from '../util.js';
import { dim, path, text } from '../ui/svg.js';

const LEN = { dim: 'length', internal: 'in' };
const AREA = { dim: 'area', internal: 'in2' };
const ANG = { dim: 'angle', internal: 'deg' };
const d2r = Math.PI / 180;
const on = (k) => (v) => !!v[k];

function inputsOf(v) {
  return {
    M: v.M, Sref: Math.PI * v.bodyR * v.bodyR,
    cap: v.cap ? { R: v.capR, thetaM: v.thetaM * d2r } : null,
    cone: v.cone ? { r1: v.r1, r2: v.r2, L: v.coneL } : null,
    flat: v.flat ? { D: v.flatD } : null,
    le: v.fins ? { N: v.N, R: v.rLE, l: v.lLE, sweep: v.sweep * d2r } : null,
  };
}

export default {
  slug: 'newtonian-drag',
  topic: 'modified-newtonian-drag',
  title: 'Modified Newtonian Drag',
  subtitle: 'Supersonic <b>pressure drag</b> of blunt parts — a hemispherical nose cap, a conical segment, a flat face and rounded fin leading edges — from Lees’ modified Newtonian theory.',
  intro: {
    what: 'Gives the wave (pressure) drag of the blunt elements of a supersonic rocket, the nose-cap and cone normal-force slopes and their centres of pressure.',
    why: 'Blunt noses and rounded fin leading edges are locally hypersonic even at modest supersonic speed; their drag is a large share of the total and is not in a friction build-up.',
    when: 'Supersonic designs: fill in the nose and fin wave-drag inputs of the drag build-up, or compare cap radii and leading-edge sweeps.',
  },
  info: {
    text: [
      'Newtonian theory treats the air as a stream of particles that lose their normal momentum when they hit the surface, giving a pressure coefficient of $2\\cos^2\\theta$ where $\\theta$ is the angle between the surface normal and the flow.',
      'Lees’ modification replaces the 2 by the true stagnation pressure coefficient $C_{PT}$ behind a normal shock, which makes the method work for blunt shapes from low supersonic Mach numbers upwards.',
      'Integrating the pressure over a hemispherical cap, a cone and a hemicylindrical leading edge gives closed-form drag areas, normal-force slopes and centres of pressure.',
    ],
    tex: 'C_P=C_{PT}\\cos^2\\theta,\\qquad C_{PT}=\\frac{2}{\\gamma M^2}\\left(\\frac{p_T}{p_\\infty}-1\\right)',
    steps: [
      'Set the Mach number and the body radius that defines the reference area.',
      'Switch on the blunt elements your rocket has and enter their sizes.',
      'The stagnation pressure coefficient behind a normal shock is computed (cross-flow Mach number for swept leading edges).',
      'Each element’s drag area follows; dividing by the reference area gives drag coefficients you can add to the drag build-up.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'flight', title: 'Flight and reference',
      fields: [
        { id: 'M', label: 'Mach number', sym: 'M_\\infty', dim: 'none', default: 2, min: 0, minExclusive: true, max: 25, slider: { min: 0.5, max: 6 },
          info: { text: 'Free-stream Mach number. The method is meant for supersonic flow; below Mach 1 the values are faired to zero.', range: 'Newtonian estimates improve as Mach number rises; they are usable from about Mach 1.2 for blunt shapes.', doc: 'stagnation' } },
        { id: 'bodyR', shared: 'bodyR', label: 'Body radius (reference)', sym: 'R_{ref}', ...LEN, default: 3, min: 0, minExclusive: true,
          info: { text: 'Radius of the body. The reference area is $S_{ref}=\\pi R_{ref}^2$, the same as in the drag build-up.', doc: 'overview' } },
      ],
    },
    {
      id: 'capg', title: 'Hemispherical nose cap',
      fields: [
        { id: 'cap', label: 'Rounded nose cap', kind: 'bool', default: true, info: { text: 'A spherical nose tip, possibly only a part of a hemisphere.', doc: 'cap' } },
        { id: 'capR', label: 'Cap radius', sym: 'R', ...LEN, default: 1.2, min: 0, minExclusive: true, when: on('cap'),
          info: { text: 'Radius of the sphere the cap is cut from.', doc: 'cap' } },
        { id: 'thetaM', label: 'Cap angle (surface slope at the base)', sym: '\\theta_M', ...ANG, default: 80, min: 0, minExclusive: true, max: 90, slider: { min: 5, max: 90 }, when: on('cap'),
          info: { text: 'Angle between the axis and the surface normal at the cap’s edge: 90° is a full hemisphere. A cap tangent to a cone of half-angle $\\delta$ has $\\theta_M=90^\\circ-\\delta$.', fields: ['capR'], doc: 'cap' } },
      ],
    },
    {
      id: 'coneg', title: 'Conical segment',
      fields: [
        { id: 'cone', label: 'Conical segment', kind: 'bool', default: true, info: { text: 'A cone or cone frustum behind the cap (a sphere-cone nose), or a pointed cone.', doc: 'cone' } },
        { id: 'r1', label: 'Forward radius', sym: 'r_1', ...LEN, default: 1.18177, min: 0, when: on('cone'),
          info: { text: 'Radius at the front of the segment: 0 for a pointed cone, $R\\sin\\theta_M$ where it meets a cap.', doc: 'cone' } },
        { id: 'r2', label: 'Aft radius', sym: 'r_2', ...LEN, default: 3, min: 0, minExclusive: true, when: on('cone'),
          info: { text: 'Radius at the back of the segment, usually the body radius.', doc: 'cone' } },
        { id: 'coneL', label: 'Segment length', sym: 'L_C', ...LEN, default: 10.3117, min: 0, minExclusive: true, when: on('cone'),
          info: { text: 'Axial length of the conical segment.', doc: 'cone' } },
      ],
    },
    {
      id: 'flatg', title: 'Flat face',
      fields: [
        { id: 'flat', label: 'Flat-faced nose', kind: 'bool', default: false, info: { text: 'A nose tip cut off flat, or any flat disc facing the flow.', doc: 'flat' } },
        { id: 'flatD', label: 'Face diameter', sym: 'D_F', ...LEN, default: 1.5, min: 0, minExclusive: true, when: on('flat'), info: { text: 'Diameter of the flat face.', doc: 'flat' } },
      ],
    },
    {
      id: 'fing', title: 'Fin leading edges',
      fields: [
        { id: 'fins', label: 'Rounded fin leading edges', kind: 'bool', default: true, info: { text: 'Fins with a round (hemicylindrical) leading edge — a flat plate with its edge rounded.', doc: 'leading-edge' } },
        { id: 'N', backView: (v) => ({ R: v.bodyR, span: 1.5 * v.bodyR, t: 2 * v.rLE, nominal: { span: true }, unit: LEN, range: [1, 12], note: 'Leading-edge wave drag is N × one fin’s; span is not an input here, so it is drawn nominal.' }), shared: 'finN', label: 'Number of fins', sym: 'N', dim: 'none', default: 4, min: 1, max: 12, when: on('fins'), info: { text: 'Number of fin panels.', doc: 'leading-edge' } },
        { id: 'rLE', shared: { key: 'finT', get: (v) => 2 * v.rLE, set: (v, t) => { v.rLE = t / 2; } }, label: 'Leading-edge radius', sym: 'R_{LE}', ...LEN, default: 0.0625, min: 0, minExclusive: true, when: on('fins'),
          info: { text: 'Radius of the rounded edge — half the thickness for a fully rounded plate.', doc: 'leading-edge' } },
        { id: 'lLE', label: 'Leading-edge length', sym: 'l', ...LEN, default: 15, min: 0, minExclusive: true, when: on('fins'),
          info: { text: 'Length of one leading edge, measured along the edge.', doc: 'leading-edge' } },
        { id: 'sweep', label: 'Leading-edge sweep', sym: '\\Lambda', ...ANG, default: 30, min: 0, max: 85, slider: { min: 0, max: 80 }, when: on('fins'),
          info: { text: 'Sweep-back angle of the leading edge from the span direction. Only the Mach number normal to the edge, $M_N=M_\\infty\\cos\\Lambda$, makes impact pressure.', doc: 'leading-edge' } },
      ],
    },
  ],
  results: [
    { id: 'CD', label: 'Wave drag, nose + fins', sym: 'C_D', dim: 'none', key: true, digits: 4,
      note: (x, out) => `nose ${fmt(out.o.CDnose, { digits: 3 })} · fins ${fmt(out.o.CDfins, { digits: 3 })}`,
      info: { text: 'Sum of the element drag areas over the reference area. Add it to the friction and base drag of the drag build-up.', tex: 'C_D=\\frac{\\sum C_DS}{S_{ref}}', doc: 'totals' } },
    { id: 'CDnose', label: 'Nose wave drag', sym: 'C_{D,nose}', dim: 'none', key: true, digits: 4, note: () => 'enter as nose wave drag in the drag build-up',
      info: { text: 'Cap, cone segment and flat face together.', doc: 'totals' } },
    { id: 'CDfins', label: 'Fin leading-edge drag', sym: 'C_{D,LE}', dim: 'none', key: true, digits: 4, note: () => 'enter as fin wave drag in the drag build-up',
      info: { text: 'All leading edges together.', doc: 'leading-edge' } },
    { id: 'cpt', label: 'Stagnation pressure coefficient', sym: 'C_{PT}', dim: 'none', key: true, digits: 4, note: (x, out) => (out.v.M > 1 ? 'behind a normal shock' : 'isentropic (subsonic)'),
      info: { text: 'Pressure coefficient at the nose stagnation point. Classical Newtonian theory uses 2.', tex: 'C_{PT}=\\frac{2}{\\gamma M^2}\\left(\\frac{p_T}{p_\\infty}-1\\right)', doc: 'stagnation' } },
    { id: 'capCDS', label: 'Cap drag area', sym: '(C_DS)_{cap}', ...AREA, when: on('cap'), info: { tex: '(C_DS)_{cap}=\\pi R^2\\frac{C_{PT}}{2}(1-\\cos^4\\theta_M)', doc: 'cap' } },
    { id: 'capCNa', label: 'Cap normal-force slope', sym: 'C_{N\\alpha,cap}', dim: 'perAngle', internal: 'perrad', when: on('cap'), info: { tex: 'C_{N\\alpha}S_{ref}=\\pi R^2\\frac{C_{PT}}{2}\\sin^4\\theta_M', doc: 'cap' } },
    { id: 'capXcp', label: 'Cap centre of pressure (from tip)', sym: 'X_{CP,cap}', ...LEN, when: on('cap'), info: { text: '7R/15 for a full hemisphere.', doc: 'cap' } },
    { id: 'delta', label: 'Cone half-angle', sym: '\\delta', ...ANG, when: on('cone'), info: { tex: '\\delta=\\arctan\\frac{r_2-r_1}{L_C}', doc: 'cone' } },
    { id: 'coneCDS', label: 'Cone drag area', sym: '(C_DS)_{cone}', ...AREA, when: on('cone'), info: { tex: '(C_DS)_{cone}=C_{PT}\\sin^2\\delta\\,\\pi(r_2^2-r_1^2)', doc: 'cone' } },
    { id: 'coneCNa', label: 'Cone normal-force slope', sym: 'C_{N\\alpha,cone}', dim: 'perAngle', internal: 'perrad', when: on('cone'), info: { doc: 'cone' } },
    { id: 'coneXcp', label: 'Cone centre of pressure (from its front)', sym: 'X_{CP,cone}', ...LEN, when: on('cone'), info: { text: '2L/3 for a pointed cone.', doc: 'cone' } },
    { id: 'flatCD', label: 'Flat-face drag coefficient (on face area)', sym: 'C_{D,F}', dim: 'none', digits: 4, when: on('flat'), info: { doc: 'flat' } },
    { id: 'MN', label: 'Mach number normal to the leading edge', sym: 'M_N', dim: 'none', digits: 4, when: on('fins'), info: { tex: 'M_N=M_\\infty\\cos\\Lambda', doc: 'leading-edge' } },
    { id: 'leCDS', label: 'Leading-edge drag area (one fin)', sym: '(C_DS)_{LE}', ...AREA, when: on('fins'), info: { tex: '(C_DS)_{LE}=\\tfrac43R_{LE}\\,l\\,C_{PT}(M_N)\\cos^3\\Lambda', doc: 'leading-edge' } },
    { id: 'Sref', label: 'Reference area', sym: 'S_{ref}', ...AREA, info: { tex: 'S_{ref}=\\pi R_{ref}^2', doc: 'overview' } },
  ],
  compute(v) {
    if (v.cone && v.r2 <= v.r1) throw new InputError('The aft radius of the conical segment must be larger than its forward radius — a cone facing backwards gets no impact pressure.');
    if (v.fins && v.sweep >= 90) throw new InputError('The leading-edge sweep must be less than 90°.');
    const o = newtonian(inputsOf(v));
    const warnings = [];
    const faired = [o.cap?.faired && 'nose cap', o.cone?.faired && 'cone', o.le?.faired && 'leading edges'].filter(Boolean);
    if (faired.length) warnings.push({ level: 'info', text: `Below Mach 1 Newtonian theory does not apply: the ${faired.join(', ')} values are faired linearly to zero at the critical Mach number (${M_CRIT_CAP} for the cap and cone, ${M_CRIT_LE} normal to a leading edge).` });
    if (v.cap && v.flat) warnings.push({ level: 'warn', text: 'Both a rounded cap and a flat face are switched on — a nose normally has one or the other.' });
    if (v.cap && v.cone && Math.abs(v.r1 - v.capR * Math.sin(v.thetaM * d2r)) > 0.02 * Math.max(v.r1, 1e-9)) warnings.push({ level: 'info', text: 'The cone’s forward radius differs from the cap’s base radius $R\\sin\\theta_M$ — check that the cap and cone are meant to join.' });
    if (v.cone && o.cone.delta > 60 * d2r) warnings.push({ level: 'warn', text: 'The cone half-angle exceeds 60°: the shock detaches and the segment behaves more like a flat face.' });
    const results = {
      CD: o.CD, CDnose: o.CDnose, CDfins: o.CDfins, cpt: o.cpt, Sref: Math.PI * v.bodyR ** 2,
      capCDS: o.cap?.CDS, capCNa: o.CNaCap, capXcp: o.cap?.xcp,
      delta: o.cone ? o.cone.delta / d2r : undefined, coneCDS: o.cone?.CDS, coneCNa: o.CNaCone, coneXcp: o.cone?.xcp,
      flatCD: o.flat?.CD, MN: o.le?.MN, leCDS: o.le?.CDS,
    };
    return { results, warnings, o, v };
  },
  plots: [
    {
      id: 'mach', title: 'Wave drag vs Mach number', wide: true,
      info: { text: 'Each element’s drag coefficient (on the reference area) across Mach number; the dot is your design point. Below Mach 1 the faired values are shown dashed.', doc: 'totals' },
      build(v, out) {
        const mmax = Math.max(5, v.M * 1.3), keys = [['CD', 'Total'], ['cap', 'Nose cap'], ['cone', 'Cone segment'], ['flat', 'Flat face'], ['le', 'Fin leading edges']];
        const series = keys.filter(([k]) => k === 'CD' || (k === 'le' ? v.fins : v[k])).map(([k, name]) => ({ k, name, points: [] }));
        for (let i = 0; i <= 160; i++) {
          const M = 0.3 + ((mmax - 0.3) * i) / 160, o = newtonian({ ...inputsOf(v), M });
          for (const se of series) se.points.push([M, se.k === 'CD' ? o.CD : se.k === 'le' ? o.CDfins : o[se.k].CDS / (Math.PI * v.bodyR ** 2)]);
        }
        return { x: { label: 'Mach number' }, y: { label: 'Drag coefficient' }, includeZero: true, series,
          vlines: [{ x: 1, label: 'M = 1', color: 'var(--text-3)' }], markers: [{ x: v.M, y: out.o.CD, label: `C_D = ${fmt(out.o.CD, { digits: 3 })}` }] };
      },
    },
    {
      id: 'cpt', title: 'Stagnation pressure coefficient',
      info: { text: 'Lees’ $C_{PT}$ against Mach number; classical Newtonian theory uses the constant 2. Above Mach 1 it is the Rayleigh pitot value behind a normal shock.', doc: 'stagnation' },
      build(v, out) {
        const pts = Array.from({ length: 121 }, (_, i) => { const M = 0.1 + (5.9 * i) / 120; return [M, cpStagnation(M)]; });
        return { x: { label: 'Mach number' }, y: { label: 'C_{PT}' }, includeZero: true,
          series: [{ name: 'C_{PT}', points: pts }, { name: 'Newtonian (2)', points: [[0.1, 2], [6, 2]], dashed: true, color: 'var(--text-3)' }],
          markers: [{ x: v.M, y: out.o.cpt, label: `C_{PT} = ${fmt(out.o.cpt, { digits: 3 })}` }] };
      },
    },
  ],
  schematicTitle: 'Blunt elements (each to its own scale)',
  schematicHint: 'Drag the round handle on the cap to change its angle',
  schematic(ctx, v, out) {
    const W = 760, H = 300;
    const fr = ctx.frame({ width: W, height: H, label: 'Nose cap, cone segment, flat face and fin leading edge' });
    const g = fr.layer('main'); g.replaceChildren();
    const u = ctx.U(LEN), L = (x) => `${fmt(u.v(x), { digits: 3 })} ${u.label}`;
    const panel = (x0, title, active, field) => {
      const p = s('g', { opacity: active ? 1 : 0.28, 'data-field': field });
      p.append(text(x0 + 8, 24, title.toUpperCase() + (active ? '' : ' · off'), { cls: 'sc-dim-text', size: 10 }));
      g.append(p);
      return p;
    };
    g.append(s('path', { d: 'M300,286 L460,286', class: 'sc-accent', 'marker-end': fr.arrow('acc') }));
    g.append(text(380, 280, `flow · M = ${fmt(v.M, { digits: 3 })}`, { anchor: 'middle', size: 11, field: 'M' }));
    // --- nose cap
    {
      const p = panel(0, 'Nose cap', v.cap, 'cap capR thetaM');
      const th = v.thetaM * d2r, Rp = 78, cx = 110, cy = 150;
      const P = (t, sg) => [cx - Rp * Math.cos(t), cy + sg * Rp * Math.sin(t)];
      const [ux, uy] = P(th, -1), [lx, ly] = P(th, 1);
      p.append(s('path', { class: 'sc-body', d: `M${ux},${uy} A${Rp},${Rp} 0 0 0 ${lx},${ly} Z`, 'data-field': 'capR thetaM' }));
      p.append(s('line', { x1: cx - Rp - 14, x2: cx + 30, y1: cy, y2: cy, class: 'sc-axis' }));
      p.append(s('line', { x1: cx, y1: cy, x2: ux, y2: uy, class: 'sc-thin' }));
      const ar = 26, a0 = [cx - ar, cy], a1 = [cx - ar * Math.cos(th), cy - ar * Math.sin(th)];
      p.append(s('path', { d: `M${a0[0]},${a0[1]} A${ar},${ar} 0 0 1 ${a1[0]},${a1[1]}`, class: 'sc-accent', fill: 'none', 'data-field': 'thetaM' }));
      p.append(text(cx - 30, cy + Rp + 18, `\\theta_M = ${fmt(v.thetaM, { digits: 3 })}°`, { anchor: 'middle', size: 11, field: 'thetaM' }));
      p.append(text(cx - 30, cy + Rp + 34, `R = ${L(v.capR)}`, { anchor: 'middle', size: 11, field: 'capR' }));
      if (v.cap) ctx.handle('theta', ux, uy, {
        field: 'thetaM', title: 'Drag around the cap to change its angle',
        onDrag: (px, py) => ctx.setValue('thetaM', Math.atan2(cy - py, cx - px) / d2r, { round: 1 }),
        onKey: (dx, dy) => ctx.setValue('thetaM', v.thetaM + dy),
      });
    }
    // --- cone segment
    {
      const p = panel(200, 'Cone segment', v.cone, 'cone r1 r2 coneL');
      const k = Math.min(150 / v.coneL, 170 / (2 * Math.max(v.r2, v.r1))), x1 = 225, x2 = x1 + v.coneL * k, cy = 150;
      p.append(s('path', { class: 'sc-body', d: path([[x1, cy - v.r1 * k], [x2, cy - v.r2 * k], [x2, cy + v.r2 * k], [x1, cy + v.r1 * k]], true), 'data-field': 'r1 r2 coneL' }));
      p.append(s('line', { x1: x1 - 10, x2: x2 + 12, y1: cy, y2: cy, class: 'sc-axis' }));
      p.append(dim(fr, x1, cy + Math.max(v.r2, v.r1) * k + 6, x2, cy + Math.max(v.r2, v.r1) * k + 6, `L_C = ${L(v.coneL)}`, { off: 16, field: 'coneL' }));
      p.append(dim(fr, x2, cy, x2, cy - v.r2 * k, `r_2 = ${L(v.r2)}`, { off: 18, field: 'r2' }));
      p.append(text(x1 - 4, cy - v.r1 * k - 8, `r_1 = ${L(v.r1)}`, { anchor: 'start', size: 11, field: 'r1' }));
      if (out.o.cone) p.append(text((x1 + x2) / 2, cy - 4, `\\delta = ${fmt(out.o.cone.delta / d2r, { digits: 3 })}°`, { anchor: 'middle', size: 11 }));
    }
    // --- fin leading edge (top view + section)
    {
      const p = panel(400, 'Fin leading edge', v.fins, 'fins N rLE lLE sweep');
      const lam = v.sweep * d2r, lp = 150, rx = 440, ry = 250, tx = rx + lp * Math.sin(lam), ty = ry - lp * Math.cos(lam);
      p.append(s('line', { x1: 410, x2: 580, y1: ry, y2: ry, class: 'sc-line' }));
      p.append(s('path', { class: 'sc-body-2', d: path([[rx, ry], [tx, ty], [Math.max(tx + 30, rx + 90), ty], [rx + 120, ry]], true) }));
      p.append(s('line', { x1: rx, y1: ry, x2: tx, y2: ty, class: 'sc-accent', 'stroke-width': 3, 'data-field': 'lLE sweep' }));
      p.append(s('line', { x1: rx, y1: ry, x2: rx, y2: ry - 70, class: 'sc-thin', 'stroke-dasharray': '3 3' }));
      p.append(text(rx - 6, ry - 60, `\\Lambda = ${fmt(v.sweep, { digits: 3 })}°`, { anchor: 'end', size: 11, field: 'sweep' }));
      p.append(text(rx - 6, ry - 44, `l = ${L(v.lLE)}`, { anchor: 'end', size: 11, field: 'lLE' }));
      // section across the edge (radius exaggerated)
      const sx = 540, sy = 70, sr = 12;
      p.append(s('path', { class: 'sc-body', d: `M${sx + 34},${sy - sr} L${sx},${sy - sr} A${sr},${sr} 0 0 0 ${sx},${sy + sr} L${sx + 34},${sy + sr}`, 'data-field': 'rLE' }));
      p.append(text(sx + 4, sy + sr + 16, `R_{LE} = ${L(v.rLE)}`, { anchor: 'middle', size: 11, field: 'rLE' }));
      p.append(text(sx + 4, sy + sr + 31, `N = ${v.N} fins`, { anchor: 'middle', cls: 'sc-dim-text', size: 10, field: 'N' }));
    }
    // --- flat face
    {
      const p = panel(600, 'Flat face', v.flat, 'flat flatD');
      const hgt = 120, x = 650, cy = 150;
      p.append(s('path', { class: 'sc-body', d: path([[x, cy - hgt / 2], [x + 80, cy - hgt / 2], [x + 80, cy + hgt / 2], [x, cy + hgt / 2]], true) }));
      p.append(s('line', { x1: x, x2: x, y1: cy - hgt / 2, y2: cy + hgt / 2, stroke: 'var(--series-1)', 'stroke-width': 4, 'data-field': 'flatD' }));
      p.append(dim(fr, x, cy - hgt / 2, x, cy + hgt / 2, `D_F = ${L(v.flatD)}`, { off: -22, field: 'flatD' }));
    }
  },
  symbols: {
    'M_\\infty': 'free-stream Mach number', '\\gamma': 'ratio of specific heats of air', 'p_T': 'stagnation pressure behind a normal shock', 'p_\\infty': 'free-stream static pressure',
    'C_{PT}': 'stagnation pressure coefficient', R: 'nose-cap radius', '\\theta_M': 'cap angle (surface normal at the cap edge)', '\\theta': 'angle between the surface normal and the flow',
    'S_{ref}': 'reference area', 'R_{ref}': 'body radius', r_1: 'forward radius of the conical segment', r_2: 'aft radius of the conical segment', L_C: 'length of the conical segment',
    '\\delta': 'cone half-angle', 'C_{PC}': 'pressure coefficient on the cone', D_F: 'flat-face diameter', 'C_{D,F}': 'flat-face drag coefficient on its own area',
    M_N: 'Mach number normal to the leading edge', '\\Lambda': 'leading-edge sweep angle', 'R_{LE}': 'leading-edge radius', l: 'leading-edge length', N: 'number of fins',
    '(C_DS)_{cap}': 'drag area of the nose cap', '(C_DS)_{cone}': 'drag area of the conical segment', '(C_DS)_{F}': 'drag area of the flat face', '(C_DS)_{LE}': 'drag area of one leading edge',
    'C_{D,nose}': 'nose wave-drag coefficient', 'C_{D,LE}': 'leading-edge wave-drag coefficient of all fins', C_D: 'total wave-drag coefficient',
    'X_{CP,cap}': 'cap centre of pressure behind the tip', u: 'versine of the cap angle',
  },
  report(v, out, R) {
    const o = out.o, n = R.n, l = (x) => R.v(x, LEN), A = (x) => R.Q(x, AREA);
    const steps = [{ label: 'Stagnation pressure coefficient behind a normal shock (Rayleigh pitot formula)', lhs: 'C_{PT}',
      eq: v.M > 1 ? '\\frac{2}{\\gamma M_\\infty^2}\\left\\{\\left[\\tfrac12(\\gamma+1)M_\\infty^2\\right]^{\\frac{\\gamma}{\\gamma-1}}\\left[\\frac{\\gamma+1}{2\\gamma M_\\infty^2-(\\gamma-1)}\\right]^{\\frac{1}{\\gamma-1}}-1\\right\\}' : '\\frac{2}{\\gamma M_\\infty^2}\\left\\{\\left[1+\\tfrac{\\gamma-1}{2}M_\\infty^2\\right]^{\\frac{\\gamma}{\\gamma-1}}-1\\right\\}',
      sub: `\\gamma=1.4,\\ M_\\infty=${n(v.M)}`, res: n(o.cpt) }];
    if (o.cap) steps.push(
      { label: 'Nose-cap drag area', lhs: '(C_DS)_{cap}', eq: '\\pi R^2\\,\\frac{C_{PT}}{2}\\,(1-\\cos^4\\theta_M)', sub: `\\pi\\,(${l(v.capR)})^2\\times\\frac{${n(cpStagnation(Math.max(v.M, 1)))}}{2}\\times(1-\\cos^4${n(v.thetaM)}^{\\circ})${o.cap.faired ? '\\times f' : ''}`, res: A(o.cap.CDS) },
      { label: 'Nose-cap normal-force slope', lhs: 'C_{N\\alpha,cap}', eq: '\\frac{\\pi R^2}{S_{ref}}\\,\\frac{C_{PT}}{2}\\,\\sin^4\\theta_M', res: `${n(o.CNaCap)}\\ \\mathrm{rad^{-1}}` },
      { label: 'Cap centre of pressure behind the tip', lhs: 'X_{CP,cap}', eq: 'R\\,\\frac{4u\\left(\\frac23-\\frac34u+\\frac15u^2\\right)}{(2-u)^2},\\qquad u=1-\\cos\\theta_M', res: R.Q(o.cap.xcp, LEN) });
    if (o.cone) steps.push(
      { label: 'Cone half-angle', lhs: '\\delta', eq: '\\arctan\\frac{r_2-r_1}{L_C}', sub: `\\arctan\\frac{${l(v.r2)}-${l(v.r1)}}{${l(v.coneL)}}`, res: `${n(o.cone.delta / d2r)}^{\\circ}` },
      { label: 'Cone pressure coefficient and drag area', lhs: '(C_DS)_{cone}', eq: 'C_{PT}\\sin^2\\delta\\;\\pi(r_2^2-r_1^2)', res: A(o.cone.CDS) },
      { label: 'Cone normal-force slope and centre of pressure (from its front)', lhs: 'C_{N\\alpha,cone}', eq: '\\frac{\\pi C_{PT}\\sin\\delta\\cos\\delta\\,L_C(r_1+r_2)}{S_{ref}},\\qquad X_{CP}=\\frac{L_C(r_1+2r_2)}{3(r_1+r_2)}', res: `${n(o.CNaCone)}\\ \\mathrm{rad^{-1}},\\quad X_{CP}=${R.Q(o.cone.xcp, LEN)}` });
    if (o.flat) steps.push({ label: 'Flat face', lhs: 'C_{D,F}', eq: v.M >= 1 ? 'C_{PT}' : '0.85\\left[1+\\tfrac14(M_\\infty^2+M_\\infty^4)\\right]', res: `${n(o.flat.CD)},\\quad (C_DS)_F=${A(o.flat.CDS)}` });
    if (o.le) steps.push(
      { label: 'Mach number normal to the leading edge', lhs: 'M_N', eq: 'M_\\infty\\cos\\Lambda', sub: `${n(v.M)}\\cos${n(v.sweep)}^{\\circ}`, res: n(o.le.MN) },
      { label: 'Leading-edge drag area of one fin (cross-flow $C_{PT}$ at $M_N$)', lhs: '(C_DS)_{LE}', eq: '\\tfrac43\\,R_{LE}\\,l\\,C_{PT}(M_N)\\cos^3\\Lambda', sub: `\\tfrac43\\times${l(v.rLE)}\\times${l(v.lLE)}\\times${n(cpStagnation(Math.max(o.le.MN, 1)))}\\times\\cos^3${n(v.sweep)}^{\\circ}${o.le.faired ? '\\times f' : ''}`, res: A(o.le.CDS) });
    steps.push(
      { label: 'Reference area', lhs: 'S_{ref}', eq: '\\pi R_{ref}^2', sub: `\\pi\\,(${l(v.bodyR)})^2`, res: A(Math.PI * v.bodyR ** 2) },
      { label: 'Wave-drag coefficients', lhs: 'C_{D,nose}', eq: '\\frac{(C_DS)_{cap}+(C_DS)_{cone}+(C_DS)_F}{S_{ref}}', res: n(o.CDnose, 4) },
      { lhs: 'C_{D,LE}', eq: '\\frac{N\\,(C_DS)_{LE}}{S_{ref}}', res: n(o.CDfins, 4) },
      { lhs: 'C_D', eq: 'C_{D,nose}+C_{D,LE}', sub: `${n(o.CDnose, 4)}+${n(o.CDfins, 4)}`, res: n(o.CD, 4) });
    return [{
      title: 'Theory',
      text: 'Newtonian impact theory gives the pressure coefficient $C_P=2\\cos^2\\theta$ on a surface whose normal makes the angle $\\theta$ with the flow. Lees’ modification replaces the 2 by the stagnation pressure coefficient $C_{PT}$ behind a normal shock, so that the stagnation pressure is right; this describes blunt elements well even at modest supersonic Mach numbers. Integrating $C_P$ over a hemispherical cap, a cone and a hemicylindrical leading edge gives the closed forms below. For a swept leading edge only the Mach number normal to the edge counts. Below Mach 1 the cap, cone and leading-edge values are faired linearly to zero at the critical Mach number ($f$).',
      steps,
    }];
  },
  references: ['modified-newtonian-aero4'],
  examples: [
    { name: 'Sphere-cone nose and 1/8 in fins at Mach 2', values: { M: 2, bodyR: 3, cap: true, capR: 1.2, thetaM: 80, cone: true, r1: 1.18177, r2: 3, coneL: 10.3117, flat: false, fins: true, N: 4, rLE: 0.0625, lLE: 15, sweep: 30 } },
    { name: 'Flat-faced nose at Mach 1.5', values: { M: 1.5, bodyR: 3, cap: false, cone: false, flat: true, flatD: 6, fins: false } },
    { name: 'Full hemisphere at Mach 4', values: { M: 4, bodyR: 2, cap: true, capR: 2, thetaM: 90, cone: false, flat: false, fins: false } },
  ],
};
