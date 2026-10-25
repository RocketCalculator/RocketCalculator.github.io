// Nozzle Design and Thrust — UI definition. Physics in ../calc/nozzle.js (NACA 1135; Huzel & Huang NASA SP-125;
// Schmucker NASA TM-77396). Geometry is entered directly (diameters and lengths); the angles and ε are derived.
import {
  cf, malina, cfInfinity, throatRatio, exitMach, pressureRatio, areaRatio, machFromPressure, temperatureRatio, densityRatio,
  contour, nozzleFlow, separationRatio, bellEfficiency, conicalLength, convergentLength, solveDecreasing, cStar,
} from '../calc/nozzle.js';
import { s, fmt, InputError } from '../util.js';
import { dim, path, text } from '../ui/svg.js';
import { toDisplay, displayUnit, unitTex } from '../units.js';

const PRES = { dim: 'pressure', internal: 'psi', units: { si: 'kPa', us: 'psi' } };
const LEN = { dim: 'length', internal: 'in' };
const AREA = { dim: 'area', internal: 'in2', units: { si: 'mm2', us: 'in2' } };
const FORCE = { dim: 'force', internal: 'lbf' };
const ANG = { dim: 'angle', internal: 'deg' };
const TEMP = { dim: 'temperature', internal: 'K' };
const SPD = { dim: 'speed', internal: 'ms' };
const MDOT = { dim: 'massFlow', internal: 'kgs' };
const DENS = { dim: 'density', internal: 'kgm3' };
const NONE = { dim: 'none' };
const G0 = 9.80665, PSI = 6894.757293168, IN2 = 0.00064516, RU = 8314.462618;
const SAFE_MARGIN = 1.15;            // exit pressure ≥ 1.15 × separation pressure counts as attached with margin (D21)
const CRITS = { schmucker: 'Schmucker (eq. 11, wall Mach number)', summerfield: 'Summerfield (0.4 of ambient)', kalt: 'Kalt–Bendall (pressure ratio)' };
const CRIT_SHORT = { schmucker: 'Schmucker', summerfield: 'Summerfield', kalt: 'Kalt–Bendall' };
const THETA_C = [10, 80], ALPHA = [3, 45], LF = [50, 120];   // accepted ranges of the derived angles / bell length

/**
 * Derived design: ε from the diameters, the convergent angle from L_c, the cone angle or bell length from L_d.
 * Throws InputError with the achievable range when a length cannot be built.
 */
function derive(v) {
  const rt = v.dt / 2, rc = v.din / 2, eps = (v.de / v.dt) ** 2, R2 = 0.382 * rt;
  const ul = (x) => `${fmt(toDisplay(x, LEN), { digits: 3 })} ${displayUnit(LEN)}`;
  const fc = (t) => convergentLength(rt, rc, t);
  const thetaC = solveDecreasing(fc, v.Lc, THETA_C[0], THETA_C[1]);
  if (thetaC == null) throw new InputError(`With these diameters the convergent length must be between ${ul(fc(THETA_C[1]))} and ${ul(fc(THETA_C[0]))} (half angle ${THETA_C[1]}° to ${THETA_C[0]}°).`);
  let alpha = 15, Lf = 80;
  const L15 = conicalLength(rt, eps, 15, R2);
  if (v.type === 'cone') {
    const fd = (a) => conicalLength(rt, eps, a, R2);
    alpha = solveDecreasing(fd, v.Ld, ALPHA[0], ALPHA[1]);
    if (alpha == null) throw new InputError(`For a cone with these diameters the divergent length must be between ${ul(fd(ALPHA[1]))} and ${ul(fd(ALPHA[0]))} (half angle ${ALPHA[1]}° to ${ALPHA[0]}°).`);
  } else {
    Lf = (100 * v.Ld) / L15;
    if (Lf < LF[0] || Lf > LF[1]) throw new InputError(`For a bell with these diameters the divergent length must be between ${ul((LF[0] / 100) * L15)} and ${ul((LF[1] / 100) * L15)} (${LF[0]}–${LF[1]} % of a 15° cone, ${ul(L15)}).`);
  }
  return { ...v, eps, thetaC, alpha, Lf, L15 };
}
/** Divergence efficiency λ: Malina for a cone, Huzel & Huang fig. 4-12 for a Rao bell. */
const lambdaOf = (w, eps = w.eps) => (w.type === 'bell' ? bellEfficiency(eps, w.Lf) : malina(w.alpha));
/** Thrust coefficient of an attached nozzle of area ratio eps at ambient-to-chamber pressure ratio pac. */
const cfAt = (w, eps, pac) => { const c = cf(w.g, eps, pac, 0); return lambdaOf(w, eps) * c.momentum + c.pressure; };
const geomOf = (w) => contour({ rt: w.dt / 2, rc: w.din / 2, thetaC: w.thetaC, eps: w.eps, type: w.type, alpha: w.alpha, Lf: w.Lf });

/** Thrust coefficient for the actual flow state: attached, truncated at separation, or behind an inviscid shock. */
function cfActual(w, fl) {
  const pac = w.pa / w.pc;
  if (fl.sep) { const c = cf(w.g, fl.sep.eps, pac, 0); return { cf: lambdaOf(w) * c.momentum + c.pressure, how: 'separated' }; }
  if (fl.shock) { const Mx = fl.prof[fl.prof.length - 1].M; return { cf: lambdaOf(w) * w.g * Mx * Mx * pac * fl.eps, how: 'shock' }; }
  return { cf: cfAt(w, w.eps, pac), how: 'attached' };
}
/** Largest ε whose exit pressure stays at `margin` × the separation pressure (searched up to ε = 10⁴). */
function epsForMargin(w, margin) {
  const ok = (e) => { const M = exitMach(e, w.g); return w.pc * pressureRatio(M, w.g) >= margin * separationRatio(w.crit, M, w.pc / w.pa) * w.pa; };
  let lo = 1.0001, hi = 1e4;
  if (!ok(lo)) return null;
  if (ok(hi)) return hi;
  for (let k = 0; k < 100; k++) { const mid = Math.sqrt(lo * hi); if (ok(mid)) lo = mid; else hi = mid; }
  return lo;
}

const lenField = (id, label, sym, def, slider, text) => ({ id, label, sym, ...LEN, default: def, min: 0, minExclusive: true, max: 400, slider, info: { text, doc: 'contour' } });

export default {
  slug: 'nozzle-thrust',
  topic: 'nozzles',
  title: 'Nozzle Design and Thrust',
  subtitle: 'Contour, flow and thrust of a <b>de Laval nozzle</b> — conical or Rao bell — with the Mach number, pressure, temperature and density along it, normal shocks and flow separation.',
  verdict: true,
  tiers: true,
  intro: {
    what: 'Builds the nozzle wall from the inlet, throat and exit diameters and the convergent and divergent lengths (conical, or the parabolic approximation of Rao’s bell), solves the one-dimensional flow along it, and finds the thrust, specific impulse and whether the jet stays attached to the wall at your ambient pressure.',
    why: 'An expansion ratio that suits altitude can over-expand at launch: the jet then separates from the wall, unevenly, which costs thrust and puts side loads on the nozzle. A nozzle that is too short or too wide throws thrust sideways.',
    when: 'Sizing a motor nozzle, checking it at sea level and at altitude, and predicting thrust, mass flow and specific impulse from chamber conditions.',
  },
  info: {
    text: [
      'Gas leaves the chamber at stagnation pressure $p_c$ and temperature $T_c$, speeds up to sound speed at the throat and keeps accelerating in the diverging section. In one-dimensional isentropic flow the local area ratio $A/A^*$ alone fixes the Mach number, and with it the pressure, temperature and density.',
      'If the ambient pressure is high enough, the ideal (inviscid) solution has a normal shock inside the nozzle. In a real nozzle the boundary layer separates first, upstream, where the wall pressure has fallen to a fraction of $p_a$ (Schmucker).',
      'Thrust is the jet momentum plus $(p_e-p_a)A_e$. A cone throws part of the momentum sideways (Malina, $\\lambda=(1+\\cos\\alpha)/2$); a bell turns the flow back towards the axis and keeps about 99 % of it in a shorter length (Huzel & Huang).',
    ],
    tex: 'C_F=\\lambda\\sqrt{\\frac{2\\gamma^2}{\\gamma-1}\\left(\\frac{2}{\\gamma+1}\\right)^{\\frac{\\gamma+1}{\\gamma-1}}\\left[1-\\left(\\frac{p_e}{p_c}\\right)^{\\frac{\\gamma-1}{\\gamma}}\\right]}+\\frac{p_e-p_a}{p_c}\\,\\varepsilon',
    steps: [
      'Enter the exhaust gas: ratio of specific heats, chamber temperature and molar mass (from a thermochemistry code).',
      'Choose a conical or bell divergent and enter the inlet, throat and exit diameters and the convergent and divergent lengths.',
      'Enter the chamber pressure, the ambient pressure at the altitude of interest, and a separation criterion.',
      'Read the verdict: whether the jet stays attached, and if not the exit diameter or chamber pressure that fixes it.',
      'The flow plot shows area, Mach number, pressure, temperature and density along the nozzle; hover for each value and its ratio to the sonic (throat) value.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'gas', title: 'Exhaust gas',
      fields: [
        { id: 'g', label: 'Ratio of specific heats', sym: '\\gamma', ...NONE, default: 1.2, min: 1.05, max: 1.67, step: 0.005, slider: { min: 1.1, max: 1.4, step: 0.005 },
          info: { text: 'Ratio $c_p/c_v$ of the exhaust, taken as constant (frozen) through the nozzle.', range: 'Rocket exhaust about 1.13–1.26; air 1.4 for cold-flow tests. Take it from a thermochemistry code (NASA CEA, ProPEP, OpenMotor).', doc: 'isentropic' } },
        { id: 'Tc', label: 'Chamber temperature', sym: 'T_c', ...TEMP, default: 1700, min: 200, max: 4500, slider: { min: 800, max: 3800, step: 10 },
          info: { text: 'Adiabatic flame (stagnation) temperature. Sets the temperatures, exhaust speed, mass flow and specific impulse — not the thrust coefficient.', range: 'The default is a round example value, not a particular propellant.', doc: 'performance' } },
        { id: 'Mw', label: 'Molar mass of the exhaust', sym: 'M_w', dim: 'molarMass', internal: 'gmol', default: 30, min: 2, max: 100, slider: { min: 15, max: 45, step: 0.1 },
          info: { text: 'Mean molar mass of the combustion products; the gas constant is $R=R_u/M_w$. Lighter gas leaves faster.', range: 'The default is a round example value; use your propellant’s.', doc: 'performance' } },
      ],
    },
    {
      id: 'geom', title: 'Nozzle geometry',
      fields: [
        { id: 'type', label: 'Divergent contour', kind: 'select', default: 'bell', options: [{ value: 'bell', label: 'Bell — Rao parabolic approximation' }, { value: 'cone', label: 'Conical' }],
          info: { text: 'A cone is simplest to machine. A bell expands fast after the throat, then turns the flow back towards the axis: about 1 % more thrust than a 15° cone in 80 % of its length (Huzel & Huang fig. 4-12).', doc: 'contour' } },
        lenField('din', 'Inlet diameter', 'd_{in}', 2.5, { min: 0.3, max: 12, step: 0.01 }, 'Inside diameter where the convergent starts — the motor case or grain bore end.'),
        lenField('dt', 'Throat diameter', 'd_t', 1, { min: 0.1, max: 6, step: 0.005 }, 'Diameter of the narrowest section. It sets the thrust and mass flow for a given chamber pressure, not the thrust coefficient.'),
        lenField('de', 'Exit diameter', 'd_e', 2.828, { min: 0.12, max: 20, step: 0.005 }, 'Diameter of the exit plane. The expansion ratio is $\\varepsilon=(d_e/d_t)^2$; sea-level motors use 4–10, upper stages 20–100.'),
        lenField('Lc', 'Convergent length (inlet → throat)', 'L_c', 1.5, { min: 0.05, max: 12, step: 0.005 }, 'Axial length from the end of the inlet to the throat. With the diameters it sets the convergent half angle (20–45° is usual, Huzel & Huang). The convergent carries slow gas, so its shape costs little.'),
        lenField('Ld', 'Divergent length (throat → exit)', 'L_d', 2.75, { min: 0.05, max: 40, step: 0.005 }, 'Axial length from the throat to the exit. For a cone it sets the half angle (12–18° usual); for a bell, the length as a percentage of a 15° cone (60–100 %, 80 % common).'),
      ],
    },
    {
      id: 'press', title: 'Pressures',
      fields: [
        { id: 'pc', label: 'Chamber pressure', sym: 'p_c', ...PRES, default: 600, min: 5, max: 15000, slider: { min: 50, max: 2000, step: 1 },
          info: { text: 'Stagnation (total) pressure in the chamber, absolute.', range: 'Amateur and student solid motors 2–7 MPa (300–1000 psi).', doc: 'isentropic' } },
        { id: 'pa', label: 'Ambient pressure', sym: 'p_a', ...PRES, default: 14.7, min: 0, max: 30, slider: { min: 0, max: 14.7, step: 0.01 },
          info: { text: 'Static pressure around the exit, absolute. Zero gives the vacuum value. Check the nozzle at the lowest altitude it fires.', range: 'Sea level 101.3 kPa (14.7 psi); about 26 kPa at 10 km.', doc: 'thrust' } },
        { id: 'crit', label: 'Separation criterion', kind: 'select', default: 'schmucker', options: Object.entries(CRITS).map(([value, label]) => ({ value, label })),
          info: { text: 'How low the wall pressure may fall below $p_a$ before the boundary layer separates. Schmucker fitted rocket-engine data with the wall Mach number; Summerfield’s 0.4 is the classic rule; Kalt–Bendall uses $p_c/p_a$.', doc: 'separation' } },
      ],
    },
  ],
  results: [
    { id: 'thrust', label: 'Thrust', sym: 'T', ...FORCE, key: true, note: (x, out) => `in vacuum ${fmt(toDisplay(out.o.thrustVac, FORCE), { digits: 4 })} $${unitTex(displayUnit(FORCE))}$`, info: { tex: 'T=C_F\\,p_c\\,A_t', doc: 'thrust' } },
    { id: 'cf', label: 'Thrust coefficient', sym: 'C_F', ...NONE, key: true, digits: 4, note: (x, out) => `$\\lambda$ = ${fmt(out.o.lambda, { digits: 4 })} · ${out.o.cfHow === 'separated' ? 'estimate, separated jet' : out.o.cfHow === 'shock' ? 'inviscid shock inside' : 'attached flow'}`,
      info: { tex: 'C_F=\\lambda\\,C_{F,m}+\\frac{p_e-p_a}{p_c}\\,\\varepsilon', doc: 'thrust' } },
    { id: 'isp', label: 'Specific impulse', sym: 'I_{sp}', dim: 'time', internal: 's', key: true, digits: 4, note: (x, out) => `vacuum ${fmt(out.o.ispVac, { digits: 4 })} s · ideal`, info: { tex: 'I_{sp}=\\frac{C_F\\,c^*}{g_0}', doc: 'performance' } },
    { id: 'sepMargin', label: 'Margin against separation', sym: 'p_e/p_{sep}', ...NONE, key: true, digits: 3,
      status: (m) => (typeof m !== 'number' ? null : m < 1 ? 'err' : m < SAFE_MARGIN ? 'warn' : 'ok'),
      note: (x, out) => (typeof x !== 'number' ? 'vacuum: no separation' : out.o.state),
      info: { text: 'Exit pressure of the attached flow divided by the pressure at which the wall boundary layer separates. Below 1 the jet leaves the wall inside the nozzle.', tex: 'p_{sep}=p_a\\,(1.88M_e-1)^{-0.64}', doc: 'separation' } },
    { id: 'Me', label: 'Exit Mach number', sym: 'M_e', ...NONE, key: true, digits: 4, note: (x, out) => `$p_e$ = ${fmt(toDisplay(out.o.fl.pe, PRES), { digits: 4 })} $${unitTex(displayUnit(PRES))}$`,
      info: { tex: '\\varepsilon=\\frac{1}{M_e}\\left[\\frac{2}{\\gamma+1}\\left(1+\\frac{\\gamma-1}{2}M_e^2\\right)\\right]^{\\frac{\\gamma+1}{2(\\gamma-1)}}', doc: 'isentropic' } },
    { id: 'eps', label: 'Expansion ratio', sym: '\\varepsilon', ...NONE, digits: 4, info: { tex: '\\varepsilon=\\left(\\frac{d_e}{d_t}\\right)^2', doc: 'isentropic' } },
    { id: 'thetaC', label: 'Convergent half angle', sym: '\\theta_c', ...ANG, digits: 3, info: { text: 'From the convergent length, the inlet and throat diameters and the 1.5 $r_t$ throat arc.', doc: 'contour' } },
    { id: 'alpha', label: 'Cone half angle', sym: '\\alpha', ...ANG, digits: 3, when: (v) => v.type === 'cone', info: { tex: 'L_d=\\frac{r_t(\\sqrt\\varepsilon-1)+R_2(\\sec\\alpha-1)}{\\tan\\alpha}', doc: 'contour' } },
    { id: 'Lf', label: 'Bell length, % of a 15° cone', sym: 'L_f', dim: 'percent', digits: 3, when: (v) => v.type === 'bell', info: { doc: 'contour' } },
    { id: 'thn', label: 'Bell initial angle', sym: '\\theta_n', ...ANG, digits: 3, when: (v) => v.type === 'bell', info: { text: 'From Huzel & Huang fig. 4-14.', doc: 'contour' } },
    { id: 'the', label: 'Bell exit angle', sym: '\\theta_e', ...ANG, digits: 3, when: (v) => v.type === 'bell', info: { text: 'From Huzel & Huang fig. 4-14.', doc: 'contour' } },
    { id: 'deMax', label: 'Largest exit diameter with margin here', sym: 'd_{e,max}', ...LEN, when: (v) => v.pa > 0, info: { text: `Largest exit diameter whose exit pressure is still ${SAFE_MARGIN} times the separation pressure at this ambient pressure.`, doc: 'separation' } },
    { id: 'deOpt', label: 'Exit diameter for ideal expansion', sym: 'd_{e,opt}', ...LEN, when: (v) => v.pa > 0, info: { text: 'Gives $p_e=p_a$, the largest one-dimensional thrust coefficient at this ambient pressure.', doc: 'thrust' } },
    { id: 'pcMin', label: 'Chamber pressure that keeps the margin', sym: 'p_{c,min}', ...PRES, when: (v) => v.pa > 0, info: { text: `Lowest chamber pressure at which this nozzle’s exit pressure is ${SAFE_MARGIN} times the separation pressure.`, doc: 'separation' } },
    { id: 'mdot', label: 'Mass flow rate', sym: '\\dot m', ...MDOT, digits: 4, info: { tex: '\\dot m=\\frac{p_c A_t}{c^*}', doc: 'performance' } },
    { id: 'cstar', label: 'Characteristic velocity', sym: 'c^*', ...SPD, digits: 5, info: { tex: 'c^*=\\frac{\\sqrt{RT_c/\\gamma}}{\\left(\\frac{2}{\\gamma+1}\\right)^{\\frac{\\gamma+1}{2(\\gamma-1)}}}', doc: 'performance' } },
    { id: 'Ve', label: 'Exhaust velocity at the exit (attached)', sym: 'V_e', ...SPD, digits: 5, info: { tex: 'V_e=M_e\\sqrt{\\gamma R T_e}', doc: 'performance' } },
    { id: 'Te', label: 'Exit temperature (attached)', sym: 'T_e', ...TEMP, digits: 4, info: { tex: 'T_e=\\frac{T_c}{1+\\frac{\\gamma-1}{2}M_e^2}', doc: 'isentropic' } },
    { id: 'rhoE', label: 'Exit density (attached)', sym: '\\rho_e', ...DENS, digits: 4, info: { tex: '\\rho_e=\\frac{p_e}{RT_e}', doc: 'isentropic' } },
    { id: 'cf1D', label: 'Thrust coefficient, attached, one-dimensional', sym: 'C_{F,1D}', ...NONE, digits: 4, info: { doc: 'isentropic' } },
    { id: 'lambda', label: 'Divergence efficiency', sym: '\\lambda', ...NONE, digits: 4, info: { text: 'Fraction of the ideal (axial) jet momentum: Malina for a cone, Huzel & Huang fig. 4-12 for a bell.', doc: 'contour' } },
    { id: 'cfm', label: 'Momentum part of the thrust coefficient', sym: 'C_{F,m}', ...NONE, digits: 4, info: { doc: 'isentropic' } },
    { id: 'cfp', label: 'Pressure part of the thrust coefficient', sym: 'C_{F,p}', ...NONE, digits: 4, info: { tex: 'C_{F,p}=\\frac{p_e-p_a}{p_c}\\,\\varepsilon', doc: 'thrust' } },
    { id: 'cfVac', label: 'Thrust coefficient in vacuum', sym: 'C_{F,vac}', ...NONE, digits: 4, info: { doc: 'thrust' } },
    { id: 'pStar', label: 'Throat (critical) pressure', sym: 'p^*', ...PRES, info: { tex: 'p^*=p_c\\left(\\frac{2}{\\gamma+1}\\right)^{\\frac{\\gamma}{\\gamma-1}}', doc: 'isentropic' } },
    { id: 'peSub', label: 'Ambient pressure that unchokes the nozzle', sym: 'p_{a,1}', ...PRES, info: { text: 'Above this the flow is subsonic everywhere and the nozzle is a venturi.', doc: 'shock' } },
    { id: 'peNS', label: 'Ambient pressure that puts a normal shock at the exit', sym: 'p_{a,2}', ...PRES, info: { text: 'Between this and $p_{a,1}$ the ideal (inviscid) solution has a normal shock inside the divergent.', doc: 'shock' } },
    { id: 'xShock', label: 'Inviscid normal shock (from the throat)', sym: 'x_s', ...LEN, when: (v, out) => !!out?.o?.fl?.shock, info: { doc: 'shock' } },
    { id: 'xSep', label: 'Separation point (from the throat)', sym: 'x_{sep}', ...LEN, when: (v, out) => !!out?.o?.fl?.sep, info: { doc: 'separation' } },
    { id: 'At', label: 'Throat area', sym: 'A_t', ...AREA, info: { tex: 'A_t=\\frac{\\pi d_t^2}{4}', doc: 'thrust' } },
    { id: 'Mc', label: 'Inlet Mach number', sym: 'M_{in}', ...NONE, digits: 3, info: { text: 'Gas speed where the convergent starts. The model takes $p_c$ as the stagnation pressure, which is accurate only while this is small.', doc: 'isentropic' } },
  ],
  compute(v) {
    if (!(v.de > v.dt * 1.005)) throw new InputError('The exit diameter must be larger than the throat diameter.');
    if (!(v.din > v.dt * 1.05)) throw new InputError('The inlet diameter must be larger than the throat diameter.');
    const w = derive(v), geo = geomOf(w);
    const fl = nozzleFlow(geo, w.g, w.pc, w.pa, w.crit);
    const P = (x) => `${fmt(toDisplay(x, PRES), { digits: 4 })} ${displayUnit(PRES) === 'kPa' ? 'kPa' : 'psi'}`, L = (x) => `${fmt(toDisplay(x, LEN), { digits: 3 })} ${displayUnit(LEN)}`;
    if (fl.regime === 'unchoked') throw new InputError(`The ambient pressure is above ${P(fl.peSub)}, so the throat never reaches sound speed: raise the chamber pressure or lower the ambient pressure.`);
    const pac = w.pa / w.pc, c = cf(w.g, w.eps, pac, 0), lambda = lambdaOf(w);
    const act = cfActual(w, fl), At = (Math.PI * w.dt * w.dt) / 4;
    const cstar = cStar(w.g, w.Tc, w.Mw), R = RU / w.Mw, mdot = (w.pc * PSI * At * IN2) / cstar;
    const Me = fl.Me, Te = w.Tc * temperatureRatio(Me, w.g);
    const cfVac = cfAt(w, w.eps, 0);
    const epsOpt = w.pa > 0 ? areaRatio(machFromPressure(pac, w.g), w.g) : Infinity;
    const epsMax = w.pa > 0 ? epsForMargin(w, SAFE_MARGIN) : null;
    const pcMin = w.pa > 0 ? (() => {             // margin ∝ p_c except through Kalt–Bendall's p_c/p_a: bisect
      let lo = 1e-6 * w.pc, hi = 1e3 * w.pc;
      const ok = (pc) => pc * pressureRatio(Me, w.g) >= SAFE_MARGIN * separationRatio(w.crit, Me, pc / w.pa) * w.pa;
      for (let k = 0; k < 120; k++) { const mid = Math.sqrt(lo * hi); if (ok(mid)) hi = mid; else lo = mid; }
      return hi;
    })() : null;
    const state = w.pa <= 0 ? 'vacuum' : fl.sep ? 'separates inside the nozzle' : fl.regime === 'shock' ? 'normal shock inside (inviscid)' : fl.regime === 'ideal' ? 'ideally expanded' : fl.regime === 'underexpanded' ? 'under-expanded' : 'over-expanded, attached';
    const o = { w, geo, fl, lambda, cfHow: act.how, state, thrustVac: cfVac * w.pc * At, ispVac: (cfVac * cstar) / G0, At, cstar, R };

    // verdict: is the flow choked and attached at this ambient pressure?
    const m = fl.sepMargin, sepNow = !!fl.sep || fl.regime === 'shock';
    const level = w.pa <= 0 ? 'safe' : sepNow || m < 1 || act.cf <= 0 ? 'unsafe' : m < SAFE_MARGIN ? 'marginal' : 'safe';
    const fixes = [];
    if (level !== 'safe') {
      if (epsMax) fixes.push(`Reduce the exit diameter from ${L(w.de)} to at most <b>${L(w.dt * Math.sqrt(epsMax))}</b> (ε ${fmt(epsMax, { digits: 3 })}), or`);
      if (pcMin) fixes.push(`raise the chamber pressure from ${P(w.pc)} to at least <b>${P(pcMin)}</b>, or`);
      fixes.push('accept it only for a nozzle that fires at altitude, where the ambient pressure is lower.');
    }
    const verdict = {
      level,
      title: level === 'unsafe' ? (act.cf <= 0 ? 'The nozzle gives no thrust' : 'The jet separates from the wall') : level === 'marginal' ? 'Attached, but close to separation' : w.pa <= 0 ? 'Vacuum: attached, no separation' : 'Attached flow with margin',
      text: w.pa <= 0 ? `Exit Mach ${fmt(Me, { digits: 3 })}; thrust coefficient ${fmt(act.cf, { digits: 4 })}.`
        : `Exit pressure ${P(fl.pe)} against ambient ${P(w.pa)}: margin against separation <b>${fmt(m, { digits: 3 })}</b> (${CRIT_SHORT[w.crit]}; ${SAFE_MARGIN} or more wanted).${fl.sep ? ` The jet leaves the wall ${L(fl.sep.x)} after the throat.` : ''}`,
      fixes,
    };

    const warnings = [];
    if (fl.sep) warnings.push({ level: 'err', text: `The jet separates ${L(fl.sep.x)} after the throat. Separation is uneven and unsteady: side loads on the nozzle and the motor mount, and less thrust than attached (the value shown is an estimate for a nozzle cut at the separation point).`, fix: fixes[0]?.replace(/, or$/, '.') });
    else if (fl.regime === 'shock') warnings.push({ level: 'err', text: 'The ideal solution has a normal shock inside the nozzle: a real nozzle separates before that.', fix: fixes[0]?.replace(/, or$/, '.') });
    if (fl.sep && (fl.sep.M < 2 || fl.sep.M > 5) && w.crit === 'schmucker') warnings.push({ level: 'info', text: `Separation is predicted at Mach ${fmt(fl.sep.M, { digits: 3 })}; Schmucker’s fit rests on data near Mach 3–4.6, so its position is extrapolated.` });
    if (w.pa > 0 && !sepNow && fl.pe / w.pa > 3) warnings.push({ level: 'info', text: `Strongly under-expanded (exit pressure ${fmt(fl.pe / w.pa, { digits: 3 })} × ambient): a larger exit would add thrust here.`, fix: `An exit diameter of ${L(w.dt * Math.sqrt(Math.min(epsOpt, epsMax ?? Infinity)))} expands ideally (or as far as the separation margin allows).` });
    if (w.type === 'bell' && (w.eps < 5.5 || w.eps > 50 || w.Lf < 60 || w.Lf > 100 || geo.adjusted)) warnings.push({ level: 'warn', text: `The bell angles come from Huzel & Huang’s chart (ε 5–50, length 60–100 % of a 15° cone); this design (ε ${fmt(w.eps, { digits: 3 })}, ${fmt(w.Lf, { digits: 3 })} %) is outside it, so the nearest chart values are used${geo.adjusted ? ' and adjusted so that a parabola fits' : ''}.`, fix: 'For a small expansion ratio a 15° cone is as good and simpler.' });
    if (w.type === 'cone' && (w.alpha < 12 || w.alpha > 18)) warnings.push({ level: 'info', text: `Cone half angle ${fmt(w.alpha, { digits: 3 })}° is outside the usual 12–18° (Huzel & Huang): ${w.alpha > 18 ? 'divergence loss grows and the flow may not follow the wall' : 'the nozzle gets long and heavy for little gain'}.`, fix: `A 15° cone with these diameters is ${L(w.L15)} long.` });
    if (w.thetaC < 20 || w.thetaC > 45) warnings.push({ level: 'info', text: `Convergent half angle ${fmt(w.thetaC, { digits: 3 })}° is outside the usual 20–45° (Huzel & Huang).`, fix: `A convergent length of ${L(convergentLength(w.dt / 2, w.din / 2, 30))} gives 30°.` });
    const Mc = fl.prof[0].M;
    if (Mc > 0.3) warnings.push({ level: 'warn', text: `The gas enters the convergent at Mach ${fmt(Mc, { digits: 3 })}: the inlet is narrow for this throat, so $p_c$ is no longer the stagnation pressure and the results are optimistic.`, fix: 'Use a larger inlet (or a smaller throat); an inlet Mach number below about 0.3 is a rule of thumb.' });
    if (w.g > 1.3) warnings.push({ level: 'info', text: 'γ above 1.3 is typical of cold-flow (air) tests rather than rocket exhaust.' });

    const results = {
      thrust: act.cf * w.pc * At, cf: act.cf, isp: (act.cf * cstar) / G0, sepMargin: w.pa > 0 ? m : '—', Me,
      eps: w.eps, thetaC: w.thetaC, alpha: w.alpha, Lf: w.Lf, thn: geo.thn, the: geo.the,
      deMax: epsMax ? w.dt * Math.sqrt(epsMax) : '—', deOpt: Number.isFinite(epsOpt) ? w.dt * Math.sqrt(epsOpt) : '—', pcMin: pcMin ?? '—',
      mdot, cstar, Ve: Me * Math.sqrt(w.g * R * Te), Te, rhoE: (fl.pe * PSI) / (R * Te),
      cf1D: c.momentum + c.pressure, lambda, cfm: c.momentum, cfp: c.pressure, cfVac, pStar: w.pc * throatRatio(w.g), peSub: fl.peSub, peNS: fl.peNS,
      xShock: fl.shock?.x ?? '—', xSep: fl.sep?.x ?? '—', At, Mc,
    };
    return { results, warnings, verdict, o, v };
  },
  plots: [
    {
      id: 'flow', title: 'Flow along the nozzle', height: 620, wide: true,
      info: { text: 'Cross-section area, Mach number, static pressure, temperature and density along the nozzle, on one axial scale (zero at the throat). Hover anywhere: the read-out gives each value and its ratio to the sonic (critical, starred) value at the throat. Vertical lines mark the throat, the inviscid normal shock and the separation point.', doc: 'isentropic' },
      build(v, out, { U }) {
        const o = out.o, w = o.w, fl = o.fl, ul = U(LEN), ua = U(AREA), up = U(PRES), ut = U(TEMP), ud = U(DENS);
        const At = o.At, pS = w.pc * throatRatio(w.g), TS = w.Tc * temperatureRatio(1, w.g), rhoC = (w.pc * PSI) / (o.R * w.Tc), rS = rhoC * densityRatio(1, w.g);
        const ser = (f) => fl.prof.map((q) => [ul.v(q.x), ...f(q)]);
        // Mach number, static pressure, temperature and density jump at a shock; the area does not
        const brk = (pts) => { if (!fl.shock) return pts; const xs = ul.v(fl.shock.x), i = pts.findIndex((q) => q[0] >= xs); return i > 0 ? [...pts.slice(0, i), [NaN, NaN, NaN], ...pts.slice(i)] : pts; };
        const vlines = [{ x: 0, label: 'throat', color: 'var(--text-3)' }];
        if (fl.shock) vlines.push({ x: ul.v(fl.shock.x), label: 'shock', color: 'var(--text-2)' });
        if (fl.sep) vlines.push({ x: ul.v(fl.sep.x), label: 'separation', color: 'var(--red)' });
        return {
          x: { label: 'Distance from the throat $x$', unit: ul.label }, vlines, xDomain: [ul.v(fl.prof[0].x), ul.v(fl.prof[fl.prof.length - 1].x)],
          panels: [
            { y: { label: 'Area $A$', unit: ua.label }, ratio: { label: '$A/A^*$' }, includeZero: true, series: [{ name: '$A$', points: ser((q) => [ua.v(q.A * At), q.A]) }] },
            { y: { label: 'Mach $M$' }, includeZero: true, series: [{ name: '$M$', points: brk(ser((q) => [q.M])) }], hlines: [{ y: 1, label: '$M=1$' }] },
            { y: { label: 'Pressure $p$', unit: up.label }, ratio: { label: '$p/p^*$' }, includeZero: true, series: [{ name: '$p$', points: brk(ser((q) => [up.v(q.p * w.pc), (q.p * w.pc) / pS])) }], hlines: w.pa > 0 ? [{ y: up.v(w.pa), label: '$p_a$', color: 'var(--red)' }] : [] },
            { y: { label: 'Temperature $T$', unit: ut.label }, ratio: { label: '$T/T^*$' }, includeZero: true, series: [{ name: '$T$', points: brk(ser((q) => [ut.v(q.T * w.Tc), (q.T * w.Tc) / TS])) }] },
            { y: { label: 'Density $\\rho$', unit: ud.label }, ratio: { label: '$\\rho/\\rho^*$' }, includeZero: true, series: [{ name: '$\\rho$', points: brk(ser((q) => [ud.v(q.rho * rhoC), (q.rho * rhoC) / rS])) }] },
          ],
        };
      },
    },
    {
      id: 'eps', title: 'Thrust coefficient against expansion ratio',
      info: { text: 'Thrust coefficient of your nozzle type as the expansion ratio changes, at your ambient pressure and in vacuum. At your ambient pressure it peaks near $p_e=p_a$; right of the red line the jet separates and the attached curve no longer applies.', doc: 'thrust' },
      build(v, out) {
        const w = out.o.w, pac = w.pa / w.pc, epsSep = w.pa > 0 ? epsForMargin(w, 1) : null, epsOpt = out.results.deOpt === '—' ? NaN : (out.results.deOpt / w.dt) ** 2;
        const top = Math.min(1000, Math.max(2 * w.eps, Number.isFinite(epsOpt) ? 1.6 * epsOpt : 0, 4));
        const series = [{ name: 'at $p_a$', points: [] }, { name: 'in vacuum', points: [], dashed: true, color: 'var(--text-3)' }];
        for (let i = 0; i <= 160; i++) { const e = 1.02 + ((top - 1.02) * i) / 160; series[0].points.push([e, cfAt(w, e, pac)]); series[1].points.push([e, cfAt(w, e, 0)]); }
        const vlines = [];
        if (Number.isFinite(epsOpt) && epsOpt <= top) vlines.push({ x: epsOpt, label: '$p_e=p_a$', color: 'var(--text-3)' });
        if (epsSep && epsSep <= top) vlines.push({ x: epsSep, label: 'separation', color: 'var(--red)' });
        const col = out.verdict.level === 'unsafe' ? 'var(--red)' : out.verdict.level === 'marginal' ? 'var(--warn)' : 'var(--ok)';
        return { x: { label: 'Expansion ratio $\\varepsilon$' }, y: { label: 'Thrust coefficient $C_F$' }, series, vlines, markers: [{ x: w.eps, y: out.results.cf, label: 'your nozzle', color: col }] };
      },
    },
    {
      id: 'wall', title: 'Wall pressure against the separation pressure', explore: true, when: (v) => v.pa > 0,
      info: { text: 'Attached (isentropic) wall pressure along the divergent, and the pressure at which the boundary layer separates by the chosen criterion, both divided by $p_a$. Where the wall curve drops below the criterion the jet leaves the wall.', doc: 'separation' },
      build(v, out, { U }) {
        const w = out.o.w, fl = out.o.fl;
        if (!(w.pa > 0)) return null;
        const ul = U(LEN), wall = [], crit = [];
        for (const q of fl.prof) {
          if (q.x < 0) continue;
          const M = exitMach(q.A, w.g);
          wall.push([ul.v(q.x), (pressureRatio(M, w.g) * w.pc) / w.pa]); crit.push([ul.v(q.x), separationRatio(w.crit, M, w.pc / w.pa)]);
        }
        const vlines = [];
        if (fl.sep) vlines.push({ x: ul.v(fl.sep.x), label: 'separation', color: 'var(--red)' });
        if (fl.shock) vlines.push({ x: ul.v(fl.shock.x), label: 'inviscid shock', color: 'var(--text-3)' });
        return { x: { label: 'Distance from the throat $x$', unit: ul.label }, y: { label: 'Pressure / ambient $p/p_a$' }, includeZero: true,
          series: [{ name: 'wall pressure (attached)', points: wall, smooth: true }, { name: 'separation pressure', points: crit, dashed: true, color: 'var(--red)' }],
          hlines: [{ y: 1, label: '$p_a$' }], vlines };
      },
    },
    {
      id: 'pa', title: 'Thrust against ambient pressure', explore: true,
      info: { text: 'Thrust of your nozzle from vacuum up to the pressure at which it unchokes. Attached, it falls in a straight line (only the back-pressure on the exit changes); once the jet separates, the estimate follows a nozzle cut at the separation point.', doc: 'shock' },
      build(v, out, { U }) {
        const o = out.o, w = o.w, up = U(PRES), uf = U(FORCE), top = 0.98 * o.fl.peSub, att = [], sep = [];
        for (let i = 0; i <= 80; i++) {
          const pa = (top * i) / 80, fl = nozzleFlow(o.geo, w.g, w.pc, pa, w.crit), c = cfActual({ ...w, pa }, fl);
          (fl.sep || fl.shock ? sep : att).push([up.v(pa), uf.v(c.cf * w.pc * o.At)]);
        }
        if (sep.length && att.length) sep.unshift(att[att.length - 1]);
        const vlines = [{ x: up.v(o.fl.pe), label: '$p_e=p_a$', color: 'var(--text-3)' }, { x: up.v(o.fl.peNS), label: 'shock at exit', color: 'var(--text-3)' }];
        if (w.crit !== 'kalt') { const paSep = o.fl.pe / separationRatio(w.crit, o.fl.Me, 1); if (paSep < top) vlines.push({ x: up.v(paSep), label: 'separation', color: 'var(--red)' }); }
        return { x: { label: 'Ambient pressure $p_a$', unit: up.label }, y: { label: 'Thrust $T$', unit: uf.label }, includeZero: true,
          series: [{ name: 'attached', points: att }, { name: 'separated (estimate)', points: sep, dashed: true, color: 'var(--red)' }], vlines,
          markers: w.pa > 0 ? [{ x: up.v(w.pa), y: uf.v(out.results.thrust), label: 'your nozzle' }] : [] };
      },
    },
    {
      id: 'loss', title: 'Divergence efficiency against nozzle length', explore: true,
      info: { text: 'Fraction of the ideal thrust coefficient kept by a bell (Rao parabola, Huzel & Huang fig. 4-12, at your expansion ratio) and by a cone shortened by widening its angle (Malina), against length as a percentage of a 15° cone.', doc: 'contour' },
      build(v, out) {
        const w = out.o.w, rt = w.dt / 2, bell = [], cone = [];
        for (let Lf = 60; Lf <= 100.001; Lf += 1) {
          bell.push([Lf, 100 * bellEfficiency(w.eps, Lf)]);
          const a = solveDecreasing((x) => conicalLength(rt, w.eps, x, 0.382 * rt), (Lf / 100) * w.L15, 1, 60);
          if (a != null) cone.push([Lf, 100 * malina(a)]);
        }
        const LfNow = (100 * w.Ld) / w.L15;
        return { x: { label: 'Divergent length, % of a 15° cone', unit: '%' }, y: { label: 'Efficiency $\\lambda$', unit: '%' },
          series: [{ name: 'bell', points: bell }, { name: 'cone', points: cone, smooth: true, dashed: true }],
          markers: LfNow >= 60 && LfNow <= 100 ? [{ x: LfNow, y: 100 * out.o.lambda, label: 'your nozzle' }] : [] };
      },
    },
  ],
  schematicTitle: 'Nozzle section',
  schematicHint: 'Half-section of the nozzle with its dimensions; the gas is shaded by Mach number. Drag the exit lip to change the exit diameter and the divergent length, and the inlet corner to change the inlet diameter and the convergent length',
  schematic(ctx, v, out) {
    const o = out.o, w = o.w, geo = o.geo, fl = o.fl, W = 760;
    const ul = ctx.U(LEN), L = (x) => `${fmt(ul.v(x), { digits: 3 })} ${ul.plain}`, up = ctx.U(PRES), P = (x) => `${fmt(up.v(x), { digits: 3 })} ${up.plain}`;
    // inlet stub → exit drawn to one scale in both directions; the plume to the right is context
    const xin = -geo.Lconv, xmin = xin - Math.min(geo.rc, 0.25 * (geo.Ln + geo.Lconv)), xmax = geo.Ln, rmax = Math.max(geo.rc, geo.re);
    const x0 = 150, k = Math.min((W - x0 - 150) / (xmax - xmin), 120 / rmax);
    const X = (x) => x0 + (x - xmin) * k, top = 64, cy = top + rmax * k + 6, R = (r) => r * k;
    const H = Math.round(cy + rmax * k + 112);
    const fr = ctx.frame({ width: W, height: H, label: 'Nozzle half-section with inlet, throat and exit diameters and the convergent and divergent lengths' });
    const g = fr.layer('main'); g.replaceChildren();
    // the inlet stub is a cylinder: start it at the left edge of the drawing
    const pts = [{ ...fl.prof[0], x: xmin }, ...fl.prof.filter((q) => q.x > xmin)];
    // gas shaded by Mach number
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], op = (0.06 + 0.3 * Math.min(1, (a.M + b.M) / 2 / Math.max(1.5, fl.Me))).toFixed(3);
      g.append(s('path', { d: path([[X(a.x), cy - R(a.r) - 0.5], [X(b.x), cy - R(b.r) - 0.5], [X(b.x), cy + R(b.r) + 0.5], [X(a.x), cy + R(a.r) + 0.5]], true), fill: 'var(--red)', 'fill-opacity': op, stroke: 'none', 'shape-rendering': 'crispEdges' }));
    }
    // plume: flares when under-expanded, necks when over-expanded, leaves the wall where it separates
    const rs0 = fl.sep ? R(geo.rt * Math.sqrt(fl.sep.eps)) : R(geo.re), xs0 = fl.sep ? X(fl.sep.x) : X(xmax);
    const pl = W - 20 - X(xmax), tilt = Math.max(-0.4, Math.min(0.4, 0.3 * Math.log(Math.max(1e-6, fl.pe / Math.max(w.pa, 1e-9 * w.pc)))));
    const plume = [[xs0, rs0]]; for (let i = 1; i <= 16; i++) { const f = i / 16; plume.push([X(xmax) + pl * f, Math.max(0.35 * rs0, rs0 + tilt * pl * f * (1.3 - f))]); }
    g.append(s('path', { d: path([...plume.map(([x, h]) => [x, cy - h]), ...plume.slice().reverse().map(([x, h]) => [x, cy + h])], true), fill: 'var(--red)', 'fill-opacity': 0.05, stroke: 'var(--red)', 'stroke-opacity': 0.4, 'stroke-dasharray': '4 3', 'data-field': 'pa' }));
    // walls
    const tw = 5;
    for (const sg of [-1, 1]) g.append(s('path', { d: path([...pts.map((q) => [X(q.x), cy + sg * R(q.r)]), ...pts.slice().reverse().map((q) => [X(q.x), cy + sg * (R(q.r) + tw)])], true), class: 'sc-body-2', 'data-field': 'din dt de Lc Ld type' }));
    g.append(s('line', { x1: X(xmin) - 12, x2: W - 16, y1: cy, y2: cy, class: 'sc-thin', 'stroke-dasharray': '10 4 2 4' }));
    // station planes
    for (const [x, r, f] of [[xin, geo.rc, 'din'], [0, geo.rt, 'dt'], [xmax, geo.re, 'de']]) g.append(s('line', { x1: X(x), x2: X(x), y1: cy - R(r), y2: cy + R(r), class: 'sc-thin', 'stroke-dasharray': '3 3', opacity: 0.7, 'data-field': f }));
    // station names on one row above, Mach under each
    const yName = top - 34, yVal = top - 18;
    const station = (x, name, val, f, anchor = 'middle') => { g.append(text(x, yName, name, { anchor, size: 11.5, field: f })); g.append(text(x, yVal, val, { anchor, size: 10.5, cls: 'sc-dim-text', field: f })); };
    station(X(xin), 'inlet', `M = ${fmt(fl.prof.find((q) => q.x >= xin - 1e-9)?.M ?? 0, { digits: 2 })}`, 'din');
    station(X(0), 'throat', 'M = 1', 'dt');
    station(X(xmax), 'exit', `M = ${fmt(fl.prof[fl.prof.length - 1].M, { digits: 3 })}`, 'de');
    station(W - 16, 'ambient', w.pa > 0 ? P(w.pa) : 'vacuum', 'pa', 'end');
    // diameters: vertical dimension lines, labels beside them
    g.append(dim(fr, X(xmin) - 22, cy + R(geo.rc), X(xmin) - 22, cy - R(geo.rc), null, { field: 'din' }));
    g.append(text(X(xmin) - 30, cy - R(geo.rc) / 2 + 4, `d_{in} = ${L(w.din)}`, { anchor: 'end', size: 11, field: 'din' }));
    g.append(dim(fr, X(0), cy + R(geo.rt), X(0), cy - R(geo.rt), null, { field: 'dt' }));
    g.append(text(X(0) - 6, cy + R(rmax) + tw + 18, `d_t = ${L(w.dt)}`, { anchor: 'end', size: 11, field: 'dt' }));
    g.append(dim(fr, X(xmax) + 14, cy + R(geo.re), X(xmax) + 14, cy - R(geo.re), null, { field: 'de' }));
    g.append(text(X(xmax) + 22, cy - R(geo.re) / 2 + 4, `d_e = ${L(w.de)}`, { size: 11, field: 'de' }));
    // lengths on one baseline below, angles above it
    const yb = cy + R(rmax) + tw + 58;
    for (const x of [xin, 0, xmax]) g.append(s('line', { x1: X(x), x2: X(x), y1: cy + R(x === 0 ? geo.rt : x === xin ? geo.rc : geo.re) + tw + 3, y2: yb + 4, class: 'sc-thin', opacity: 0.3 }));
    g.append(dim(fr, X(xin), yb, X(0), yb, `L_c = ${L(w.Lc)}`, { field: 'Lc', textOff: 16 }));
    g.append(dim(fr, X(0), yb, X(xmax), yb, `L_d = ${L(w.Ld)}`, { field: 'Ld', textOff: 16 }));
    g.append(text((X(xin) + X(0)) / 2, yb - 8, `θ_c = ${fmt(w.thetaC, { digits: 3 })}°`, { anchor: 'middle', size: 10.5, cls: 'sc-dim-text', field: 'Lc' }));
    g.append(text((X(0) + X(xmax)) / 2, yb - 8, w.type === 'bell' ? `bell ${fmt(w.Lf, { digits: 3 })} % · θ_n = ${fmt(geo.thn, { digits: 3 })}°, θ_e = ${fmt(geo.the, { digits: 3 })}°` : `cone α = ${fmt(w.alpha, { digits: 3 })}°`, { anchor: 'middle', size: 10.5, cls: 'sc-dim-text', field: 'Ld' }));
    // shock and separation on the wall
    if (fl.shock) {
      const xs = X(fl.shock.x), rr = R(geo.rt * Math.sqrt(fl.shock.eps));
      g.append(s('line', { x1: xs, x2: xs, y1: cy - rr, y2: cy + rr, stroke: 'var(--text-2)', 'stroke-width': 1.5, 'stroke-dasharray': '5 3' }));
    }
    if (fl.sep) {
      for (const sg of [-1, 1]) g.append(s('circle', { cx: xs0, cy: cy + sg * rs0, r: 4.5, fill: 'none', stroke: 'var(--red)', 'stroke-width': 1.8 }));
      g.append(text(xs0, cy - rs0 - 10, 'separation', { anchor: 'middle', size: 10.5, field: 'pa crit' }));
    }
    g.append(text(16, H - 8, `to scale · gas shaded by Mach number${fl.shock ? ' · dashed: inviscid normal shock' : ''}${fl.sep ? ' · circles: separation point' : ''}`, { size: 10, cls: 'sc-dim-text' }));

    ctx.handle('lip', X(xmax), cy - R(geo.re), {
      field: 'de', title: 'Drag up or down for the exit diameter, along the axis for the divergent length',
      onDrag: (px, py) => { ctx.setValue('de', Math.max(w.dt * 1.01, (2 * (cy - py)) / k)); ctx.setValue('Ld', Math.max(1e-3, (px - X(0)) / k)); },
      onKey: (dx, dy) => { if (dy) ctx.setValue('de', w.de * (1 + 0.02 * dy)); if (dx) ctx.setValue('Ld', w.Ld * (1 + 0.02 * dx)); },
    });
    ctx.handle('inlet', X(xin), cy - R(geo.rc), {
      field: 'din', title: 'Drag up or down for the inlet diameter, along the axis for the convergent length',
      onDrag: (px, py) => { ctx.setValue('din', Math.max(w.dt * 1.1, (2 * (cy - py)) / k)); ctx.setValue('Lc', Math.max(1e-3, (X(0) - px) / k)); },
      onKey: (dx, dy) => { if (dy) ctx.setValue('din', w.din * (1 + 0.02 * dy)); if (dx) ctx.setValue('Lc', w.Lc * (1 - 0.02 * dx)); },
    });
  },
  symbols: {
    '\\gamma': 'ratio of specific heats of the exhaust gas', T_c: 'chamber (stagnation) temperature', M_w: 'molar mass of the exhaust', R: 'gas constant of the exhaust, $R_u/M_w$',
    'd_{in}': 'inlet diameter', d_t: 'throat diameter', d_e: 'exit diameter', L_c: 'convergent length, inlet to throat', L_d: 'divergent length, throat to exit',
    '\\varepsilon': 'expansion ratio $(d_e/d_t)^2$', '\\theta_c': 'convergent half angle', '\\alpha': 'half angle of a conical divergent', L_f: 'bell length as a percentage of a 15° cone',
    '\\theta_n': 'initial angle of the bell parabola', '\\theta_e': 'exit angle of the bell parabola',
    p_c: 'chamber pressure', p_a: 'ambient pressure', p_e: 'exit pressure', 'p^*': 'throat (critical) pressure', M_e: 'exit Mach number', M_i: 'wall Mach number where separation begins',
    '\\lambda': 'divergence efficiency (Malina for a cone; Huzel & Huang fig. 4-12 for a bell)', C_F: 'thrust coefficient', 'C_{F,m}': 'momentum part of the thrust coefficient', 'C_{F,p}': 'pressure part of the thrust coefficient',
    T: 'thrust', A_t: 'throat area', 'c^*': 'characteristic velocity', '\\dot m': 'mass flow rate', 'I_{sp}': 'specific impulse', g_0: 'standard gravity', r_t: 'throat radius', R_2: 'throat arc radius downstream, 0.382 r_t',
  },
  report(v, out, R) {
    const o = out.o, w = o.w, n = R.n, g = w.g, p = (x) => R.v(x, PRES), fl = o.fl, c = cf(g, w.eps, w.pa / w.pc, 0);
    const steps = [
      { label: 'Expansion ratio from the diameters', lhs: '\\varepsilon', eq: '\\left(\\frac{d_e}{d_t}\\right)^2', sub: `\\left(\\frac{${R.v(w.de, LEN)}}{${R.v(w.dt, LEN)}}\\right)^2`, res: n(w.eps) },
      { label: 'Exit Mach number: supersonic root of the area–Mach relation (NACA 1135)', eq: '\\varepsilon=\\frac{1}{M_e}\\left[\\frac{2}{\\gamma+1}\\left(1+\\frac{\\gamma-1}{2}M_e^2\\right)\\right]^{\\frac{\\gamma+1}{2(\\gamma-1)}}', res: `M_e=${n(fl.Me, 6)}` },
      { label: 'Exit pressure of the attached flow', lhs: 'p_e', eq: 'p_c\\left(1+\\frac{\\gamma-1}{2}M_e^2\\right)^{-\\frac{\\gamma}{\\gamma-1}}', sub: `${p(w.pc)}\\left(1+\\frac{${n(g)}-1}{2}\\times${n(fl.Me)}^2\\right)^{-\\frac{${n(g)}}{${n(g)}-1}}`, res: R.Q(fl.pe, PRES) },
    ];
    if (w.pa > 0) {
      steps.push(
        { label: `Separation pressure at the exit (${CRITS[w.crit]}; Schmucker, NASA TM-77396)`, lhs: 'p_{sep}', eq: w.crit === 'schmucker' ? 'p_a\\,(1.88\\,M_e-1)^{-0.64}' : w.crit === 'kalt' ? '0.667\\,p_a\\left(\\frac{p_c}{p_a}\\right)^{-0.2}' : '0.4\\,p_a', res: R.Q(separationRatio(w.crit, fl.Me, w.pc / w.pa) * w.pa, PRES) },
        { label: 'Margin against separation (above 1: attached)', lhs: '\\frac{p_e}{p_{sep}}', res: n(fl.sepMargin) },
      );
    }
    steps.push(
      { label: 'Momentum part of the thrust coefficient', lhs: 'C_{F,m}', eq: '\\sqrt{\\frac{2\\gamma^2}{\\gamma-1}\\left(\\frac{2}{\\gamma+1}\\right)^{\\frac{\\gamma+1}{\\gamma-1}}\\left[1-\\left(\\frac{p_e}{p_c}\\right)^{\\frac{\\gamma-1}{\\gamma}}\\right]}', sub: `${n(cfInfinity(g))}\\times\\sqrt{1-\\left(\\frac{${p(fl.pe)}}{${p(w.pc)}}\\right)^{\\frac{${n(g)}-1}{${n(g)}}}}`, res: n(c.momentum) },
      { label: 'Pressure part of the thrust coefficient', lhs: 'C_{F,p}', eq: '\\frac{p_e-p_a}{p_c}\\,\\varepsilon', sub: `\\frac{${p(fl.pe)}-${p(w.pa)}}{${p(w.pc)}}\\times${n(w.eps)}`, res: n(c.pressure) },
      w.type === 'bell'
        ? { label: `Divergence efficiency of a ${n(w.Lf)} % bell at $\\varepsilon$ = ${n(w.eps)} (Huzel & Huang fig. 4-12)`, lhs: '\\lambda', res: n(o.lambda) }
        : { label: 'Malina divergence factor of the cone', lhs: '\\lambda', eq: '\\frac{1+\\cos\\,\\alpha}{2}', sub: `\\frac{1+\\cos ${n(w.alpha)}^{\\circ}}{2}`, res: n(o.lambda, 6) },
      { label: o.cfHow === 'separated' ? 'Thrust coefficient — estimate for a nozzle cut at the separation point' : o.cfHow === 'shock' ? 'Thrust coefficient behind the inviscid shock ($p_e=p_a$)' : 'Thrust coefficient', lhs: 'C_F', eq: o.cfHow === 'attached' ? '\\lambda\\,C_{F,m}+C_{F,p}' : null, res: n(out.results.cf) },
      { label: 'Throat area', lhs: 'A_t', eq: '\\frac{\\pi d_t^2}{4}', sub: `\\frac{\\pi\\,(${R.v(w.dt, LEN)})^2}{4}`, res: R.Q(o.At, AREA) },
      { label: 'Thrust', lhs: 'T', eq: 'C_F\\,p_c\\,A_t', res: R.Q(out.results.thrust, FORCE) },
      { label: 'Characteristic velocity', lhs: 'c^*', eq: '\\frac{\\sqrt{R_uT_c/(M_w\\gamma)}}{(2/(\\gamma+1))^{(\\gamma+1)/(2(\\gamma-1))}}', res: R.Q(o.cstar, SPD) },
      { label: 'Mass flow and specific impulse', lhs: '\\dot m', eq: '\\frac{p_cA_t}{c^*}', res: R.Q(out.results.mdot, MDOT) },
      { lhs: 'I_{sp}', eq: '\\frac{C_F\\,c^*}{g_0}', res: `${n(out.results.isp)}\\ \\mathrm{s}` },
    );
    const geoText = w.type === 'bell'
      ? `The divergent is Rao’s bell in the parabolic approximation of Huzel & Huang (NASA SP-125, fig. 4-13): an arc of radius $1.5\\,r_t$ upstream of the throat, $0.382\\,r_t$ downstream to $\\theta_n$ = ${n(o.geo.thn)}°, then a parabola to the exit at $\\theta_e$ = ${n(o.geo.the)}° (fig. 4-14 for $\\varepsilon$ = ${n(w.eps)} and a length of ${n(w.Lf)} % of a 15° cone).`
      : `The divergent is a cone of half angle ${n(w.alpha)}° (from its length, Huzel & Huang eq. 4-7) after a throat arc of radius $0.382\\,r_t$.`;
    return [{
      title: 'Theory',
      text: `The exhaust is a perfect gas with constant $\\gamma$ flowing steadily and one-dimensionally from the chamber through a sonic throat (NACA Report 1135). The local area ratio fixes the Mach number, pressure, temperature and density along the nozzle. ${geoText} If the ambient pressure lies between ${p(fl.peNS)} and ${p(fl.peSub)} ${R.us ? 'psi' : 'kPa'}, the inviscid solution has a normal shock inside (NACA 1135 eqs. 93, 96, 99); a real boundary layer separates upstream of it, where the wall pressure falls to the separation pressure (Schmucker).`,
      steps,
    }];
  },
  reportNotes: [
    'One-dimensional, frozen, inviscid flow: no friction, heat loss, two-phase (particle) lag or chemistry; real motors deliver several percent less thrust coefficient and specific impulse.',
    'Separation criteria are empirical fits to rocket-engine data (Schmucker) with scatter of the order of ±10 %.',
  ],
  limits: [
    'Quasi-one-dimensional flow: each cross-section uniform; the bell’s exit angle and the cone’s spreading appear only through the efficiency λ.',
    'Perfect gas with constant (frozen) $\\gamma$ and molar mass; no condensed particles. Aluminised and sugar propellants lose more through two-phase flow.',
    'Bell contour from Huzel & Huang’s parabolic approximation of Rao’s optimum; their chart covers ε 5–50 and lengths 60–100 %.',
    'Throat arcs are fixed at 1.5 $r_t$ upstream and 0.382 $r_t$ downstream (Huzel & Huang); the convergent shape does not change the one-dimensional result.',
    'Separation criteria are empirical (Schmucker: data near wall Mach 3–4.6). After separation the thrust shown is an estimate (nozzle cut at the separation point).',
    'The chamber pressure is taken as the stagnation pressure: valid while the inlet Mach number is small (see the warnings).',
  ],
  references: [],
  externalRefs: [
    { title: 'Equations, Tables, and Charts for Compressible Flow (NACA Report 1135)', authors: 'Ames Research Staff', venue: 'NACA, 1953', url: 'https://ntrs.nasa.gov/citations/19930091059' },
    { title: 'Design of Liquid Propellant Rocket Engines (NASA SP-125), §4.3 nozzle design', authors: 'D. K. Huzel, D. H. Huang', venue: 'NASA, 2nd ed., 1971', url: 'https://ntrs.nasa.gov/citations/19710019929' },
    { title: 'Flow processes in overexpanded chemical rocket nozzles, Part 1: Flow separation (NASA TM-77396)', authors: 'R. H. Schmucker', venue: 'NASA, 1984 (translation)', url: 'https://ntrs.nasa.gov/citations/19840011402' },
  ],
  examples: [
    { name: 'Bell 80 %, ε 8, 600 psi at sea level', values: { type: 'bell', g: 1.2, din: 2.5, dt: 1, de: 2.828, Lc: 1.5, Ld: 2.75, pc: 600, pa: 14.7 } },
    { name: 'THRUSTCF workbook: air, ε 6, 15° cone, 600 psi at sea level', values: { type: 'cone', g: 1.4, din: 2.5, dt: 1, de: Math.sqrt(6), Lc: 1.5, Ld: conicalLength(0.5, 6, 15, 0.191), pc: 600, pa: 14.7 } },
    { name: 'Over-expanded at launch: ε 25 bell, 500 psi', values: { type: 'bell', g: 1.2, din: 2.5, dt: 0.75, de: 3.75, Lc: 1.2, Ld: 0.8 * conicalLength(0.375, 25, 15, 0.14325), pc: 500, pa: 14.7 } },
    { name: 'Low chamber pressure: shock and separation, 60 psi', values: { type: 'cone', g: 1.2, din: 2.5, dt: 1, de: 2.828, Lc: 1.5, Ld: conicalLength(0.5, 8, 15, 0.191), pc: 60, pa: 14.7 } },
    { name: 'Upper stage in vacuum: ε 40 bell', values: { type: 'bell', g: 1.2, din: 2.5, dt: 0.75, de: 4.743, Lc: 1.2, Ld: 0.8 * conicalLength(0.375, 40, 15, 0.14325), pc: 500, pa: 0 } },
  ],
};
