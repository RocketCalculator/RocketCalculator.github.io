// Reliability Growth — UI definition.
import { relgrowth, history, flightsToReach, reliability } from '../calc/relgrowth.js';
import { s, fmt, InputError } from '../util.js';
import { path, text } from '../ui/svg.js';

const ONE = { dim: 'none' };
const N_MAX = 200;   // longest test campaign accepted (loops and plots are sized by it)

/** Flights shown on the plots: the campaign, the flights to the target and a little beyond. */
const span = (v, o) => Math.min(N_MAX, Math.max(12, v.N + 3, Number.isFinite(o.Tstar) ? o.Tstar + 3 : 0));
const flightsText = (x) => (Number.isFinite(x) ? String(x) : 'never');

export default {
  slug: 'reliability-growth',
  topic: 'reliability',
  title: 'Reliability Growth',
  subtitle: 'How the chance of a <b>successful flight</b> grows as flight tests reveal latent defects and they are fixed — and how many test flights reach a target reliability.',
  intro: {
    what: 'Tracks the expected number of hidden lethal defects and the reliability of the next flight through a series of flight tests, and finds the number of tests that reaches a target reliability.',
    why: 'A new rocket carries design and workmanship defects that only show up in flight. How fast they are found depends on how often they appear and on how well each flight is instrumented and investigated.',
    when: 'Planning a flight-test campaign, deciding how much instrumentation, analysis and failure investigation to fund, or judging whether a vehicle is ready for an important flight.',
  },
  info: {
    text: [
      'A new vehicle starts with $D_0$ lethal latent defects. On any flight each one shows up with probability $p$, independently of the others, and any one that shows up destroys the flight.',
      'After a flight, a defect that showed up is found, understood and fixed with probability $d$. On average a fraction $pd$ of the remaining defects is removed by each test.',
      'The next flight succeeds only if none of the remaining defects shows up, so its reliability is $(1-p)$ raised to the number of defects left.',
    ],
    tex: 'R_T=(1-p)^{D_0(1-p\\,d)^T}',
    steps: [
      'Estimate the number of lethal latent defects at the first flight.',
      'Enter the chance that a defect shows up in a flight and the chance that it is found and fixed.',
      'Enter the number of flight tests planned and the reliability you want.',
      'Read the reliability after the tests and the number of tests that reaches the target.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'def', title: 'Latent defects',
      fields: [
        { id: 'D0', label: 'Lethal latent defects at the first flight', sym: 'D_0', ...ONE, default: 4, min: 0, max: 1000,
          info: { text: 'Expected number of design or workmanship defects, each able to cause a failure, that the vehicle carries into its first flight. It is an expected value, so it need not be a whole number.', range: 'About 4 fits the sounding-rocket development histories studied by Schaechter and Hoult. More for a new design or team, fewer for a vehicle built from proven parts.', doc: 'model' } },
        { id: 'p', label: 'Chance a defect shows up in a flight', sym: 'p', ...ONE, default: 0.6, min: 0, max: 1, minExclusive: true, maxExclusive: true,
          info: { text: 'Probability that any one latent defect is triggered during a given flight. A defect that shows up causes a failure.', range: 'About 0.6 in the histories studied by Schaechter and Hoult.', doc: 'model' } },
      ],
    },
    {
      id: 'test', title: 'Flight-test campaign',
      fields: [
        { id: 'd', label: 'Chance a defect that showed up is fixed', sym: 'd', ...ONE, default: 0.8, min: 0, max: 1,
          info: { text: 'Probability that a defect which shows up in a test flight is detected, understood and corrected before the next flight. Flight instrumentation, telemetry, recovery of hardware and careful failure investigation raise it.', range: 'About 0.8 in the histories studied by Schaechter and Hoult. Close to 1 with good telemetry and recovered hardware; low for uninstrumented flights.', doc: 'model' } },
        { id: 'N', label: 'Number of flight tests', sym: 'T', ...ONE, default: 5, min: 0, max: N_MAX,
          info: { text: 'Flight tests flown before the flight of interest, counting failed flights. Zero gives the reliability of the very first flight.', doc: 'model' } },
        { id: 'Rt', label: 'Target reliability', sym: 'R^*', ...ONE, default: 0.95, min: 0, max: 1, minExclusive: true, maxExclusive: true,
          info: { text: 'Reliability wanted for the flight that follows the tests, as a probability of success between 0 and 1.', doc: 'target' } },
      ],
    },
  ],
  results: [
    { id: 'RT', label: 'Reliability of the next flight', sym: 'R_T', ...ONE, key: true, digits: 4,
      status: (x, out, v) => (x >= v.Rt ? 'ok' : 'warn'),
      note: (x, out) => `after the tests · first flight ${fmt(out.o.R0, { digits: 3 })} · failure chance ${fmt(1 - x, { digits: 3 })}`,
      info: { text: 'Probability that the flight after the $T$ flight tests has no defect show up.', tex: 'R_T=(1-p)^{D_T}=(1-p)^{D_0(1-p\\,d)^T}', doc: 'model' } },
    { id: 'DT', label: 'Lethal latent defects left', sym: 'D_T', ...ONE, key: true, digits: 4,
      note: (x, out) => `${fmt(out.o.fixed, { digits: 3 })} found and fixed during the tests`,
      info: { tex: 'D_T=D_0(1-p\\,d)^T', doc: 'model' } },
    { id: 'Tstar', label: 'Flight tests to reach the target', sym: 'T^*', ...ONE, key: true,
      note: (x, out, v) => (x === 'never' ? 'nothing found is fixed' : `target ${fmt(v.Rt, { digits: 4 })}`),
      info: { text: 'Smallest number of flight tests after which the next flight meets the target reliability.', tex: 'T^*=\\left\\lceil\\frac{\\ln(D^*/D_0)}{\\ln(1-p\\,d)}\\right\\rceil,\\quad D^*=\\frac{\\ln R^*}{\\ln(1-p)}', doc: 'target' } },
    { id: 'F', label: 'Expected failures during the tests', sym: 'F_T', ...ONE, key: true, digits: 4,
      note: (x, out, v) => `out of ${v.N} test flight${v.N === 1 ? '' : 's'}`,
      info: { text: 'Sum of the failure chances of the test flights: the number of failed flights to expect, and so of vehicles to budget for.', tex: 'F_T=\\sum_{n=0}^{T-1}\\left[1-(1-p)^{D_n}\\right]', doc: 'campaign' } },
    { id: 'R0', label: 'Reliability of the first flight', sym: 'R_0', ...ONE, digits: 5, info: { tex: 'R_0=(1-p)^{D_0}', doc: 'model' } },
    { id: 'pd', label: 'Share of defects removed per test', sym: 'p\\,d', ...ONE, digits: 4, info: { text: 'Each flight test removes on average this fraction of the remaining latent defects.', doc: 'model' } },
    { id: 'fixed', label: 'Defects found and fixed during the tests', sym: 'D_0-D_T', ...ONE, digits: 4, info: { doc: 'model' } },
    { id: 'shownNext', label: 'Defects expected to show up on the next flight', sym: 'pD_T', ...ONE, digits: 4, info: { doc: 'model' } },
    { id: 'Ds', label: 'Latent defects allowed by the target', sym: 'D^*', ...ONE, digits: 4, info: { tex: 'D^*=\\frac{\\ln R^*}{\\ln(1-p)}', doc: 'target' } },
    { id: 'Texact', label: 'Flight tests to the target, unrounded', sym: 'T^*_{exact}', ...ONE, digits: 4, when: (v, out) => Number.isFinite(out.o.Texact), info: { tex: '\\frac{\\ln(D^*/D_0)}{\\ln(1-p\\,d)}', doc: 'target' } },
  ],
  compute(v) {
    if (!Number.isInteger(v.N)) throw new InputError('The number of flight tests must be a whole number.');
    if (!(v.p > 0 && v.p < 1)) throw new InputError('The chance a defect shows up must lie between 0 and 1.');
    if (!(v.Rt > 0 && v.Rt < 1)) throw new InputError('The target reliability must lie between 0 and 1.');
    const o = relgrowth({ D0: v.D0, p: v.p, d: v.d, T: v.N, Rt: v.Rt });
    const warnings = [];
    if (v.D0 === 0) warnings.push({ level: 'info', text: 'With no latent defects every flight succeeds; testing cannot raise the reliability.' });
    else if (o.Tstar === Infinity) warnings.push({ level: 'warn', text: 'Nothing that shows up in flight is fixed ($d=0$), so the reliability never grows and the target is never reached. Instrument the test flights and investigate every failure.' });
    else if (o.Tstar > v.N) warnings.push({ level: 'info', text: `The planned tests leave the next flight below the target; ${o.Tstar} flight tests are needed.` });
    const results = {
      RT: o.RT, DT: o.DT, Tstar: Number.isFinite(o.Tstar) ? o.Tstar : 'never', F: o.F, R0: o.R0, pd: o.pd, fixed: o.fixed, shownNext: o.shownNext, Ds: o.Ds, Texact: o.Texact,
    };
    return { results, warnings, o };
  },
  plots: [
    {
      id: 'growth', title: 'Reliability flight by flight',
      info: { text: 'Reliability of the next flight against the number of flight tests already flown. The dashed curve is the best case in which every defect that shows up is fixed; the gap shows what better instrumentation and failure investigation would buy.', doc: 'model' },
      build(v, out) {
        const n = span(v, out.o), mine = [], best = [];
        for (let i = 0; i <= n; i++) { mine.push([i, reliability(v.D0, v.p, v.d, i)]); best.push([i, reliability(v.D0, v.p, 1, i)]); }
        const series = [{ name: 'R_n', points: mine }];
        if (v.d < 1) series.push({ name: 'every defect fixed ($d=1$)', points: best, dashed: true, color: 'var(--text-3)' });
        return { x: { label: 'Flight tests flown $n$' }, y: { label: 'Reliability of the next flight' }, yDomain: [0, 1], series,
          hlines: [{ y: v.Rt, label: 'target R^*', color: 'var(--red-text)' }],
          markers: [{ x: v.N, y: out.o.RT, label: 'R_T' }] };
      },
    },
    {
      id: 'defects', title: 'Latent defects and expected failures',
      info: { text: 'Expected number of lethal latent defects left after each flight test, and the running total of failed flights to expect. The total levels off once most defects are fixed.', doc: 'campaign' },
      build(v, out) {
        const rows = history(v.D0, v.p, v.d, span(v, out.o));
        return { x: { label: 'Flight tests flown $n$' }, y: { label: 'Expected number' }, includeZero: true,
          series: [{ name: 'defects left $D_n$', points: rows.map((r) => [r.n, r.D]) }, { name: 'failures so far $F_n$', points: rows.map((r) => [r.n, r.F]), dashed: true }],
          vlines: [{ x: v.N, label: 'planned tests', color: 'var(--text-3)' }],
          markers: [{ x: v.N, y: out.o.DT, label: 'D_T' }] };
      },
    },
    {
      id: 'detect', title: 'Flight tests needed vs chance of fixing',
      info: { text: 'Flight tests needed to reach the target reliability against the chance that a defect which shows up is fixed. It shows how much flight instrumentation and failure investigation shorten a test campaign.', doc: 'target' },
      build(v, out) {
        const pts = [];
        for (let i = 0; i <= 90; i++) { const d = 0.1 + i / 100; pts.push([d, flightsToReach(v.D0, v.p, d, v.Rt).flights]); }
        return { x: { label: 'Chance a defect is fixed $d$' }, y: { label: 'Flight tests needed $T^*$' }, includeZero: true, series: [{ name: 'T^*', points: pts }],
          markers: Number.isFinite(out.o.Tstar) && v.d >= 0.1 ? [{ x: v.d, y: out.o.Tstar, label: 'design' }] : [] };
      },
    },
  ],
  schematicTitle: 'Flight-by-flight reliability ladder',
  schematicHint: 'Each bar is one flight, its height the chance it succeeds; drag the red line to set the target and the grey marker to set the number of flight tests',
  schematic(ctx, v, out) {
    const W = 760, H = 330, o = out.o;
    const fr = ctx.frame({ width: W, height: H, label: 'Reliability of each flight in the test campaign' });
    const g = fr.layer('main'); g.replaceChildren();
    const M = Math.min(41, Math.max(10, v.N + 1, Number.isFinite(o.Tstar) ? o.Tstar + 1 : 0));   // columns (flights) shown
    const x0 = 64, x1 = 736, yb = 268, yt = 58, cw = (x1 - x0) / M, Y = (r) => yb - r * (yb - yt);
    const rows = history(v.D0, v.p, v.d, M - 1);
    // test campaign band
    const nT = Math.min(v.N, M);
    if (nT > 0) {
      g.append(s('rect', { x: x0, y: yt - 26, width: nT * cw, height: yb - yt + 26, fill: 'var(--surface-2)', stroke: 'var(--schem-dim)', 'stroke-dasharray': '4 3', 'data-field': 'N' }));
      g.append(text(x0 + 6, yt - 12, `${v.N} flight test${v.N === 1 ? '' : 's'}`, { size: 11, field: 'N' }));
    }
    // axis and gridlines
    g.append(s('path', { d: `M${x0},${yt}V${yb}H${x1}`, class: 'sc-line' }));
    for (const r of [0, 0.25, 0.5, 0.75, 1]) {
      if (r > 0) g.append(s('line', { x1: x0, x2: x1, y1: Y(r), y2: Y(r), class: 'sc-thin', 'stroke-opacity': 0.5 }));
      g.append(text(x0 - 6, Y(r) + 4, fmt(r, { digits: 2 }), { anchor: 'end', cls: 'sc-dim-text', size: 10 }));
    }
    g.append(text(16, (yt + yb) / 2, 'R', { anchor: 'middle', size: 12 }));
    // one bar per flight: flight n + 1 follows n tests
    const every = Math.ceil(M / 14);
    rows.forEach((r, i) => {
      const x = x0 + i * cw + cw * 0.15, w = cw * 0.7, next = i === v.N;
      g.append(s('rect', { x, y: Y(r.R), width: w, height: Math.max(0.5, yb - Y(r.R)), class: next ? null : 'sc-body', fill: next ? 'var(--red)' : null, 'fill-opacity': next ? 0.85 : null, 'data-field': 'D0 p d' }));
      if (i % every === 0 || next) g.append(text(x + w / 2, yb + 15, String(i + 1), { anchor: 'middle', cls: 'sc-dim-text', size: 10 }));
    });
    // expected latent defects left before each flight, as a share of D0
    if (v.D0 > 0) {
      g.append(s('path', { d: path(rows.map((r, i) => [x0 + (i + 0.5) * cw, Y(r.D / v.D0)])), class: 'sc-accent2', fill: 'none', 'stroke-dasharray': '2 3', 'data-field': 'D0 p d' }));
      g.append(text(x1, H - 10, 'dotted: defects left as a share of D_0', { anchor: 'end', size: 10, cls: 'sc-dim-text', field: 'D0' }));
    }
    g.append(text((x0 + x1) / 2, yb + 34, 'flight number', { anchor: 'middle', cls: 'sc-dim-text', size: 10 }));
    if (v.N < M) g.append(text(Math.min(x1 - 4, x0 + (v.N + 0.5) * cw), Y(o.RT) - 8, `R_T = ${fmt(o.RT, { digits: 3 })}`, { anchor: v.N > M - 4 ? 'end' : 'middle', size: 11 }));
    else g.append(text(x1, yt - 12, `showing the first ${M} flights; the next flight is number ${v.N + 1}`, { anchor: 'end', cls: 'sc-dim-text', size: 10 }));
    // target line
    g.append(s('line', { x1: x0, x2: x1, y1: Y(v.Rt), y2: Y(v.Rt), class: 'sc-accent', 'stroke-dasharray': '6 4', 'data-field': 'Rt' }));
    g.append(text(x1 - 16, Y(v.Rt) - 6, `target R^* = ${fmt(v.Rt, { digits: 3 })}`, { anchor: 'end', size: 11, field: 'Rt' }));
    g.append(text(x0, H - 10, `first flight R_0 = ${fmt(o.R0, { digits: 3 })} · tests to reach the target T^* = ${flightsText(o.Tstar)}`, { size: 11 }));
    ctx.handle('target', x1, Y(v.Rt), {
      field: 'Rt', title: 'Drag up or down to change the target reliability',
      onDrag: (sx, sy) => ctx.setValue('Rt', Math.min(0.999, Math.max(0.001, (yb - sy) / (yb - yt)))),
      onKey: (dx, dy) => ctx.setValue('Rt', Math.min(0.999, Math.max(0.001, v.Rt + 0.01 * dy))),
    });
    ctx.handle('tests', x0 + Math.min(v.N, M) * cw, yb, {
      field: 'N', title: 'Drag left or right to change the number of flight tests',
      onDrag: (sx) => ctx.setValue('N', Math.min(N_MAX, Math.max(0, Math.round((sx - x0) / cw))), { round: 1 }),
      onKey: (dx) => ctx.setValue('N', Math.min(N_MAX, Math.max(0, v.N + dx)), { round: 1 }),
    });
  },
  symbols: {
    D_0: 'number of lethal latent defects at the first flight', p: 'chance that a latent defect shows up in a flight', d: 'chance that a defect that showed up is fixed',
    T: 'number of flight tests', n: 'number of flight tests flown', D_n: 'expected latent defects left after $n$ tests', D_T: 'expected latent defects left after the tests',
    R_n: 'reliability of the flight after $n$ tests', R_0: 'reliability of the first flight', R_T: 'reliability of the flight after the tests', F_T: 'expected number of failed test flights',
    'R^*': 'target reliability', 'D^*': 'latent defects allowed by the target', 'T^*': 'flight tests needed to reach the target',
  },
  report(v, out, R) {
    const o = out.o, n = R.n, T = v.N;
    const steps = [
      { label: 'Reliability of the first flight', lhs: 'R_0', eq: '(1-p)^{D_0}', sub: `(1-${n(v.p)})^{${n(v.D0)}}`, res: n(o.R0) },
      { label: 'Expected latent defects left after the flight tests', lhs: 'D_T', eq: 'D_0(1-p\\,d)^T', sub: `${n(v.D0)}\\times(1-${n(v.p)}\\times${n(v.d)})^{${T}}`, res: n(o.DT) },
      { label: 'Reliability of the flight that follows the tests', lhs: 'R_T', eq: '(1-p)^{D_T}', sub: `(1-${n(v.p)})^{${n(o.DT)}}`, res: n(o.RT) },
      { label: 'Expected failures during the tests (sum of the failure chances of flights 1 to $T$)', lhs: 'F_T', eq: '\\sum_{n=0}^{T-1}\\left[1-(1-p)^{D_n}\\right]', res: n(o.F) },
      { label: 'Latent defects allowed by the target', lhs: 'D^*', eq: '\\frac{\\ln R^*}{\\ln(1-p)}', sub: `\\frac{\\ln ${n(v.Rt)}}{\\ln(1-${n(v.p)})}`, res: n(o.Ds) },
    ];
    if (o.Tstar === 0) steps.push({ label: 'Flight tests needed: none, since $D_0\\le D^*$', lhs: 'T^*', res: '0' });
    else if (!Number.isFinite(o.Tstar)) steps.push({ label: 'Flight tests needed: with $pd=0$ no defect is ever removed', lhs: 'T^*', res: '\\text{never}' });
    else steps.push({ label: 'Flight tests needed to reach the target (rounded up to whole flights)', lhs: 'T^*', eq: '\\left\\lceil\\frac{\\ln(D^*/D_0)}{\\ln(1-p\\,d)}\\right\\rceil',
      sub: `\\left\\lceil\\frac{\\ln(${n(o.Ds)}/${n(v.D0)})}{\\ln(1-${n(v.p)}\\times${n(v.d)})}\\right\\rceil=\\lceil ${n(o.Texact)}\\rceil`, res: String(o.Tstar) });
    return [{
      title: 'Theory',
      text: 'The vehicle enters flight test with $D_0$ lethal latent defects. Each shows up in a flight with probability $p$, independently of the others, and a defect that shows up causes a failure. A defect that shows up in a test flight is found and fixed before the next flight with probability $d$. On an expectation basis each test removes $D_{n-1}p\\,d$ defects, so $D_n=D_{n-1}(1-p\\,d)$ and $D_n=D_0(1-p\\,d)^n$. A flight succeeds when none of the remaining defects shows up, so the reliability after $T$ tests is $R=(1-p)^{D_0(1-p\\,d)^T}$ (Hoult, after Schaechter and Hoult).',
      steps,
    }];
  },
  references: ['reliability-growth'],
  examples: [
    { name: 'Sounding-rocket histories (D₀ = 4, p = 0.6, d = 0.8)', values: { D0: 4, p: 0.6, d: 0.8, N: 5, Rt: 0.95 } },
    { name: 'New design, six latent defects', values: { D0: 6, p: 0.6, d: 0.8, N: 6, Rt: 0.95 } },
    { name: 'Poorly instrumented tests (d = 0.4)', values: { D0: 4, p: 0.6, d: 0.4, N: 5, Rt: 0.95 } },
  ],
};
