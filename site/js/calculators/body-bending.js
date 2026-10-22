// Body Bending Modes — UI definition.
import { bending, shape } from '../calc/bending.js';
import { s, fmt, InputError } from '../util.js';
import { text, path } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const LEN = { dim: 'length', internal: 'in' };
const EI = { dim: 'stiffness', internal: 'lbfin2' };
const WPL = { dim: 'linearDensity', internal: 'lbpin', units: { si: 'kgpm', us: 'lbpin' } };
const TAU = 2 * Math.PI;
// Aries sounding rocket (field-tool example): aft station, stiffness and weight per length at both ends of each element
const ARIES = [[141, 0, 3.89e10, 0, 18.13], [177, 8.14e11, 8.14e11, 29.89, 29.89], [207, 1.6e11, 1.6e11, 12.67, 12.67], [330, 4.637e10, 5.692e10, 47.89, 47.89], [365, 1.6e11, 4.69e11, 5.43, 5.43]]
  .map(([x, EIf, EIa, wf, wa]) => ({ x, EIf, EIa, wf, wa }));

function check(rows) {
  if (rows.some((r) => ['x', 'EIf', 'EIa', 'wf', 'wa'].some((k) => !Number.isFinite(r[k])))) return 'Every cell needs a number.';
  if (!(rows[0].x > 0)) return 'The first element must end aft of the nose tip (station > 0).';
  for (let i = 1; i < rows.length; i++) if (rows[i].x <= rows[i - 1].x) return `Stations must increase down the table (row ${i}).`;
  if (rows.some((r) => r.EIf < 0 || r.EIa < 0 || r.wf < 0 || r.wa < 0)) return 'Stiffness and weight cannot be negative.';
  if (!rows.some((r) => r.EIf > 0 || r.EIa > 0) || !rows.some((r) => r.wf > 0 || r.wa > 0)) return 'The body needs some stiffness and some weight.';
  return '';
}
/** Zero crossings (nodes) of a mode shape, as fractions of the length. */
function nodes(q) {
  const out = []; let prev = shape(q, 0);
  for (let i = 1; i <= 400; i++) { const xi = i / 400, y = shape(q, xi); if (prev * y < 0) out.push(xi - (y * (1 / 400)) / (y - prev)); prev = y; }
  return out;
}

export default {
  slug: 'body-bending',
  topic: 'body-bending-dynamics',
  title: 'Body Bending Modes',
  subtitle: 'The <b>natural bending frequencies and mode shapes</b> of a rocket body with uneven stiffness and mass.',
  intro: {
    what: 'Gives the first three free-free bending frequencies and mode shapes of a rocket made of sections with their own stiffness and weight, by the Rayleigh–Ritz method with uniform-beam modes.',
    why: 'Bending modes couple with the control and guidance sensors, with fin flutter and with structural loads; a sensor at a node sees no bending motion, one at an antinode sees the most. The frequencies must stay clear of the pitch frequency, roll rate and motor oscillations.',
    when: 'Laying out a vehicle’s structure, placing an inertial sensor, or checking that a joint or long payload does not drop the first bending frequency too low.',
  },
  info: {
    text: [
      'A free-flying rocket bends like a free-free beam. The modes of a uniform beam of the same length are a good starting set of shapes.',
      'The actual bending shape is written as a sum of those three shapes. Lagrange’s equations then give stiffness and mass matrices from the section properties, and their eigenvalues are the natural frequencies (Rayleigh–Ritz).',
      'The lowest frequency is the most accurate; the third is only a rough estimate with three shapes.',
    ],
    tex: '\\det\\left(\\omega^2\\mathbf M-\\mathbf K\\right)=0,\\quad K_{ij}=\\int EI\\,\\psi_i^{\\prime\\prime}\\psi_j^{\\prime\\prime}dx,\\quad M_{ij}=\\int m\\,\\psi_i\\psi_j\\,dx',
    steps: ['Split the body into sections from the nose tip aft.', 'Enter each section’s aft station, bending stiffness and weight per length at its two ends.', 'Read the natural frequencies and the mode shapes.', 'Place sensors near nodes, and keep the frequencies away from other excitations.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'body', title: 'Body sections (nose to tail)',
      fields: [
        { id: 'elems', label: 'Sections: aft station, stiffness and weight per length at the fore and aft ends', kind: 'table', minRows: 1,
          columns: [{ id: 'x', label: 'Aft station', ...LEN }, { id: 'EIf', label: 'EI fore', ...EI }, { id: 'EIa', label: 'EI aft', ...EI }, { id: 'wf', label: 'Weight/length fore', ...WPL }, { id: 'wa', label: 'Weight/length aft', ...WPL }],
          default: ARIES, validate: check,
          info: { text: 'One row per body section, from the nose tip aft. Stiffness and weight per length vary linearly within a section. For a thin-walled tube EI ≈ EπR³t; for a nose cone the stiffness can start at zero at the tip.', doc: 'model' } },
      ],
    },
  ],
  results: [
    ...['Fundamental', 'First harmonic', 'Second harmonic'].map((name, i) => ({
      id: `f${i + 1}`, label: `${name} bending frequency`, sym: `f_${i + 1}`, dim: 'frequency', key: true, digits: 4,
      note: (x, out) => `${fmt(out.o.modes[i].omega, { digits: 4 })} rad/s · uniform beam ${fmt(out.o.uniform[i] / TAU, { digits: 3 })} Hz${i === 2 ? ' · rough' : ''}`,
      info: { text: i === 2 ? 'Third Rayleigh–Ritz frequency; with only three shapes it is a rough estimate.' : 'Natural frequency of this free-free bending mode.', tex: 'f=\\frac{\\omega}{2\\pi},\\ \\det(\\omega^2\\mathbf M-\\mathbf K)=0', doc: 'model' },
    })),
    { id: 'nodes', label: 'Nodes of the fundamental mode', sym: 'x_{node}', ...LEN, key: true, digits: 4, note: (x, out) => (out.nodes.length === 2 ? `and ${fmt(toDisplay(out.nodes[1] * out.o.L * 12, LEN), { digits: 4 })} ${unitLabel(displayUnit(LEN))} from the tip` : ''),
      info: { text: 'Stations where the fundamental mode does not move: a good place for a sensor that should not see bending.', doc: 'shapes' } },
    { id: 'L', label: 'Body length', sym: 'L', ...LEN, digits: 4, info: { doc: 'model' } },
    { id: 'W', label: 'Total weight', sym: 'W', dim: 'mass', internal: 'lbm', digits: 4, info: { doc: 'model' } },
  ],
  compute(v) {
    const msg = check(v.elems); if (msg) throw new InputError(msg);
    const o = bending(v.elems), nd = nodes(o.modes[0].q);
    const warnings = [];
    if (!o.modes.every((m) => Number.isFinite(m.omega) && m.omega > 0)) throw new InputError('The stiffness or weight distribution is too uneven for three uniform-beam shapes; split long sections or check the units.');
    if (o.modes[0].omega / TAU < 10) warnings.push({ level: 'warn', text: `The first bending frequency is only ${fmt(o.modes[0].omega / TAU, { digits: 3 })} Hz, close to the pitch and roll frequencies of a sounding rocket. Stiffen the weakest section.` });
    return { results: { f1: o.modes[0].omega / TAU, f2: o.modes[1].omega / TAU, f3: o.modes[2].omega / TAU, nodes: nd.length ? nd[0] * o.L * 12 : 'none', L: o.L * 12, W: o.mass }, warnings, o, nodes: nd };
  },
  plots: [
    {
      id: 'shapes', title: 'Mode shapes',
      info: { text: 'Bending shapes of the three modes along the body, scaled to 1 at the nose tip. Zero crossings are nodes.', doc: 'shapes' },
      build(v, out, { U }) {
        const ul = U(LEN), L = out.o.L * 12;
        const series = out.o.modes.map((m, i) => { const pts = []; for (let k = 0; k <= 100; k++) pts.push([ul.v((L * k) / 100), shape(m.q, k / 100) / 2]); return { name: ['fundamental', 'first harmonic', 'second harmonic'][i], points: pts, dashed: i > 0, color: i === 2 ? 'var(--text-3)' : undefined }; });
        return { x: { label: 'Station from the tip $x$', unit: ul.label }, y: { label: 'Displacement (tip = 1)' }, series, hlines: [{ y: 0, color: 'var(--text-3)' }] };
      },
    },
    {
      id: 'dist', title: 'Stiffness and weight along the body',
      info: { text: 'The section properties as entered, relative to their largest values, to check the input.', doc: 'model' },
      build(v, out, { U }) {
        const ul = U(LEN), eiMax = Math.max(...v.elems.flatMap((e) => [e.EIf, e.EIa])), wMax = Math.max(...v.elems.flatMap((e) => [e.wf, e.wa]));
        const ei = [], w = []; let x0 = 0;
        for (const e of v.elems) { ei.push([ul.v(x0), e.EIf / eiMax], [ul.v(e.x), e.EIa / eiMax]); w.push([ul.v(x0), e.wf / wMax], [ul.v(e.x), e.wa / wMax]); x0 = e.x; }
        return { x: { label: 'Station from the tip $x$', unit: ul.label }, y: { label: 'Relative to the largest' }, yDomain: [0, 1.05], series: [{ name: 'stiffness EI', points: ei }, { name: 'weight per length', points: w, dashed: true }] };
      },
    },
  ],
  schematicTitle: 'Body and its fundamental mode',
  schematicHint: 'The body sections from nose to tail with their relative weight per length (height) and stiffness (shade), and the fundamental bending shape drawn over it (exaggerated). Dots mark the nodes',
  schematic(ctx, v, out) {
    const W = 760, H = 260, o = out.o, L = o.L * 12;
    const fr = ctx.frame({ width: W, height: H, label: 'Body sections and the fundamental bending mode' });
    const g = fr.layer('main'); g.replaceChildren();
    const ul = ctx.U(LEN), x0 = 40, k = 680 / L, cy = 140, X = (x) => x0 + x * k;
    const wMax = Math.max(...v.elems.flatMap((e) => [e.wf, e.wa])), eiMax = Math.max(...v.elems.flatMap((e) => [e.EIf, e.EIa]));
    let xa = 0;
    v.elems.forEach((e, i) => {
      const hf = 10 + 26 * (e.wf / wMax), ha = 10 + 26 * (e.wa / wMax), shade = 0.15 + 0.6 * (((e.EIf + e.EIa) / 2) / eiMax);
      g.append(s('path', { d: path([[X(xa), cy - hf], [X(e.x), cy - ha], [X(e.x), cy + ha], [X(xa), cy + hf]], true), fill: 'var(--text)', 'fill-opacity': shade.toFixed(2), stroke: 'var(--schem-stroke)', 'data-field': 'elems' }));
      g.append(text((X(xa) + X(e.x)) / 2, cy + 52, `${i + 1}`, { anchor: 'middle', size: 10, cls: 'sc-dim-text' }));
      xa = e.x;
    });
    // fundamental mode over the body, exaggerated
    const pts = []; for (let i = 0; i <= 120; i++) pts.push([X((L * i) / 120), cy - 30 * shape(o.modes[0].q, i / 120) / 2]);
    g.append(s('path', { d: path(pts), fill: 'none', stroke: 'var(--red)', 'stroke-width': 2.4 }));
    g.append(s('line', { x1: X(0) - 10, x2: X(L) + 10, y1: cy, y2: cy, class: 'sc-thin', 'stroke-dasharray': '10 4 2 4' }));
    for (const n of out.nodes) {
      g.append(s('circle', { cx: X(n * L), cy, r: 5, fill: 'var(--surface)', stroke: 'var(--red)', 'stroke-width': 2 }));
      g.append(text(X(n * L), cy - 50, `node ${fmt(ul.v(n * L), { digits: 3 })} ${ul.label}`, { anchor: 'middle', size: 10.5 }));
    }
    g.append(text(x0, 30, `fundamental ${fmt(o.modes[0].omega / TAU, { digits: 3 })} Hz · first harmonic ${fmt(o.modes[1].omega / TAU, { digits: 3 })} Hz`, { size: 11.5 }));
    g.append(text(20, H - 8, 'nose at left; section height ∝ weight per length, shade ∝ stiffness; mode shape exaggerated', { size: 10, cls: 'sc-dim-text' }));
  },
  symbols: {
    EI: 'bending stiffness', m: 'mass per unit length', L: 'body length', x: 'station from the nose tip', '\\xi': 'fraction of the length', '\\psi_j': 'uniform free-free mode $j$', '\\beta_j': 'eigenvalue of uniform mode $j$',
    'B_j': 'mode coefficient of uniform mode $j$', '\\mathbf K': 'Rayleigh–Ritz stiffness matrix', '\\mathbf M': 'Rayleigh–Ritz mass matrix', K_ij: 'stiffness matrix element', M_ij: 'mass matrix element', '\\omega': 'natural circular frequency', f: 'natural frequency', q_j: 'amplitude of uniform mode $j$',
  },
  report(v, out, R) {
    const o = out.o, n = R.n;
    const steps = [
      { label: 'Uniform free-free beam modes used as shapes ($\\beta_j=4.7300,\\ 7.8532,\\ 10.9956$)', eq: '\\psi_j(\\xi)=B_j(\\sinh\\beta_j\\xi+\\sin\\beta_j\\xi)+\\cosh\\beta_j\\xi+\\cos\\beta_j\\xi,\\ B_j=\\frac{\\cos\\beta_j-\\cosh\\beta_j}{\\sinh\\beta_j-\\sin\\beta_j}' },
      { label: 'Stiffness and mass matrices, integrated over the sections (Simpson’s rule)', eq: 'K_{ij}=\\int_0^L EI\\,\\psi_i^{\\prime\\prime}\\psi_j^{\\prime\\prime}\\,dx,\\quad M_{ij}=\\int_0^L m\\,\\psi_i\\psi_j\\,dx' },
      { label: 'Natural frequencies from the eigenvalues', eq: '\\det\\left(\\omega^2\\mathbf M-\\mathbf K\\right)=0' },
      ...o.modes.map((m, i) => ({ lhs: `f_${i + 1}`, eq: '\\frac{\\omega}{2\\pi}', sub: `\\frac{${n(m.omega)}}{2\\pi}`, res: `${n(m.omega / TAU)}\\,\\mathrm{Hz}` })),
    ];
    return [{
      title: 'Theory',
      text: 'The body is a free-free beam whose lateral displacement is approximated by the first three bending modes of a uniform beam of the same length, $y=\\sum q_j\\psi_j(x/L)$. Lagrange’s equations with the kinetic and strain energies give $\\mathbf M\\ddot{\\mathbf q}+\\mathbf K\\mathbf q=0$; its eigenvalues are the natural frequencies and its eigenvectors the mode shapes (Hoult).',
      steps,
    }];
  },
  references: ['longitudinal-body-bending-dynamics'],
  examples: [{ name: 'Aries sounding rocket (5 sections, 365 in)', values: { elems: ARIES } }],
};
