// Nozzle Design and Thrust — UI definition. Physics in ../calc/nozzle.js (NACA 1135; Huzel & Huang NASA SP-125;
// Schmucker NASA TM-77396).
import {
  cf, malina, cfInfinity, throatRatio, exitMach, pressureRatio, areaRatio, machFromPressure,
  contour, nozzleFlow, separationRatio, bellEfficiency, conicalLength, cStar,
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
const RAD = Math.PI / 180, G0 = 9.80665, PSI = 6894.757293168, IN2 = 0.00064516, RU = 8314.462618;
const SAFE_MARGIN = 1.15;            // exit pressure ≥ 1.15 × separation pressure counts as attached with margin (D21)
const CRITS = { schmucker: 'Schmucker (eq. 11, Mach-based)', summerfield: 'Summerfield (p = 0.4 pₐ)', kalt: 'Kalt–Bendall (pressure-ratio based)' };

/** Divergence efficiency λ of the nozzle: Malina for a cone, Huzel & Huang fig. 4-12 for a Rao bell. */
const lambdaOf = (v, eps = v.eps) => (v.type === 'bell' ? bellEfficiency(eps, v.Lf) : malina(v.alpha));
/** Thrust coefficient of an attached nozzle of area ratio eps (any ambient pressure ratio pac). */
const cfAt = (v, eps, pac) => { const c = cf(v.g, eps, pac, 0); return lambdaOf(v, eps) * c.momentum + c.pressure; };
const geomOf = (v) => contour({ rt: v.dt / 2, rc: v.dc / 2, thetaC: v.thetaC, eps: v.eps, type: v.type, alpha: v.alpha, Lf: v.Lf });

/** Thrust coefficient for the actual flow state: attached, truncated at separation, or behind an inviscid shock. */
function cfActual(v, fl) {
  const pac = v.pa / v.pc;
  if (fl.sep) { const c = cf(v.g, fl.sep.eps, pac, 0); return { cf: lambdaOf(v) * c.momentum + c.pressure, how: 'separated' }; }
  if (fl.shock) { const Mx = fl.prof[fl.prof.length - 1].M; return { cf: lambdaOf(v) * v.g * Mx * Mx * pac * fl.eps, how: 'shock' }; }
  return { cf: cfAt(v, v.eps, pac), how: 'attached' };
}

/** Largest ε (≤ the design one) whose exit pressure stays at `margin` × the separation pressure. */
function epsForMargin(v, margin) {
  const ok = (e) => { const M = exitMach(e, v.g); return v.pc * pressureRatio(M, v.g) >= margin * separationRatio(v.crit, M, v.pc / v.pa) * v.pa; };
  if (!ok(1.0001)) return null;
  let lo = 1.0001, hi = Math.max(1.0002, v.eps * 4);
  if (ok(hi)) return hi;
  for (let k = 0; k < 100; k++) { const mid = Math.sqrt(lo * hi); if (ok(mid)) lo = mid; else hi = mid; }
  return lo;
}

export default {
  slug: 'nozzle-thrust',
  topic: 'nozzles',
  title: 'Nozzle Design and Thrust',
  subtitle: 'Contour, flow and thrust of a <b>de Laval nozzle</b> — conical or Rao bell — with the Mach number, pressure, temperature and density along it, normal shocks and flow separation.',
  verdict: true,
  tiers: true,
  intro: {
    what: 'Draws the nozzle wall from chamber to exit (conical, or the parabolic approximation of Rao’s bell), solves the one-dimensional flow along it, and finds the thrust, specific impulse and whether the jet stays attached to the wall at your ambient pressure.',
    why: 'An expansion ratio that suits altitude can over-expand at launch: the jet then separates from the wall, unevenly, which costs thrust and puts side loads on the nozzle. A nozzle that is too short or too wide throws thrust sideways.',
    when: 'Sizing a motor nozzle (throat, expansion ratio, length, contour), checking it at sea level and at altitude, and predicting thrust, mass flow and specific impulse from chamber conditions.',
  },
  info: {
    text: [
      'Gas leaves the chamber at stagnation pressure $p_c$ and temperature $T_c$, speeds up to sound speed at the throat and keeps accelerating in the diverging section. In one-dimensional isentropic flow the local area ratio $A/A^*$ alone fixes the Mach number, and with it $p/p_c$, $T/T_c$ and $\\rho/\\rho_c$.',
      'If the ambient pressure is high enough, the ideal (inviscid) solution has a **normal shock** inside the nozzle. In a real nozzle the boundary layer cannot climb that pressure rise: the flow **separates** from the wall upstream, where the wall pressure has fallen to a fraction of $p_a$ (Schmucker’s criterion).',
      'Thrust is the jet momentum plus $(p_e-p_a)A_e$. A cone throws part of the momentum sideways (Malina’s $\\lambda=(1+\\cos\\alpha)/2$); a bell turns the flow back towards the axis and keeps about 99 % of it in a shorter length (Huzel & Huang).',
    ],
    tex: 'C_F=\\lambda\\sqrt{\\frac{2\\gamma^2}{\\gamma-1}\\left(\\frac{2}{\\gamma+1}\\right)^{\\frac{\\gamma+1}{\\gamma-1}}\\left[1-\\left(\\frac{p_e}{p_c}\\right)^{\\frac{\\gamma-1}{\\gamma}}\\right]}+\\frac{p_e-p_a}{p_c}\\,\\varepsilon',
    steps: [
      'Enter the exhaust gas: ratio of specific heats, chamber temperature and molar mass (from a thermochemistry code).',
      'Choose a conical or bell nozzle and enter the throat diameter, expansion ratio, chamber diameter and convergent angle; then the cone half angle or the bell length.',
      'Enter the chamber pressure and the ambient pressure at the altitude of interest, and pick a separation criterion.',
      'Read the verdict: whether the jet stays attached, and if not the expansion ratio or chamber pressure that fixes it.',
      'The figure shows the wall to scale with the area ratio, Mach number, pressure, temperature and density along it; hover to read values.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'gas', title: 'Exhaust gas',
      fields: [
        { id: 'g', label: 'Ratio of specific heats', sym: '\\gamma', ...NONE, default: 1.2, min: 1, minExclusive: true, max: 1.67, step: 0.01, slider: { min: 1.1, max: 1.4, step: 0.005 },
          info: { text: 'Ratio $c_p/c_v$ of the exhaust, taken as constant (frozen) through the nozzle.', range: 'Rocket exhaust about 1.13–1.26; air 1.4 for cold-flow tests. Take it from a thermochemistry code for your propellant (NASA CEA, ProPEP, OpenMotor).', doc: 'isentropic' } },
        { id: 'Tc', label: 'Chamber temperature', sym: 'T_c', ...TEMP, default: 1700, min: 0, minExclusive: true,
          info: { text: 'Adiabatic flame (stagnation) temperature in the chamber. Sets the temperatures, the exhaust speed, the mass flow and the specific impulse — not the thrust coefficient.', range: 'The default is a round example value, not a particular propellant.', doc: 'performance' } },
        { id: 'Mw', label: 'Molar mass of the exhaust', sym: '\\mathcal{M}', dim: 'molarMass', internal: 'gmol', default: 30, min: 0, minExclusive: true,
          info: { text: 'Mean molar mass of the combustion products, $R=R_u/\\mathcal{M}$. Lighter gas leaves faster.', range: 'The default is a round example value; use your propellant’s from a thermochemistry code.', doc: 'performance' } },
      ],
    },
    {
      id: 'geom', title: 'Nozzle geometry',
      fields: [
        { id: 'type', label: 'Divergent contour', kind: 'select', default: 'bell', options: [{ value: 'bell', label: 'Bell — Rao parabolic approximation' }, { value: 'cone', label: 'Conical' }],
          info: { text: 'A cone is simplest to machine. A bell expands fast just after the throat, then turns the flow back towards the axis: about 1 % more thrust than a 15° cone at 80 % of its length (Huzel & Huang fig. 4-12).', doc: 'contour' } },
        { id: 'dt', label: 'Throat diameter', sym: 'd_t', ...LEN, default: 1, min: 0, minExclusive: true, info: { text: 'Diameter of the narrowest section. It sets thrust and mass flow for a given chamber pressure but not the thrust coefficient.', doc: 'thrust' } },
        { id: 'eps', label: 'Expansion ratio', sym: '\\varepsilon', ...NONE, default: 8, min: 1, minExclusive: true, max: 1000, step: 0.1, slider: { min: 1.5, max: 40, step: 0.1 },
          info: { text: 'Exit area divided by throat area, $\\varepsilon=(d_e/d_t)^2$. It fixes the exit Mach number and pressure.', range: 'Sea-level motors 4–10; upper stages 20–100.', doc: 'isentropic' } },
        { id: 'alpha', label: 'Divergence half angle', sym: '\\alpha', ...ANG, default: 15, min: 1, max: 60, step: 0.5, slider: { min: 5, max: 30, step: 0.5 }, when: (v) => v.type === 'cone',
          info: { text: 'Half angle of the diverging cone. Wider is shorter and lighter but throws more of the jet sideways.', range: '12–18° (Huzel & Huang); 15° is the usual compromise.', doc: 'contour' } },
        { id: 'Lf', label: 'Bell length (% of a 15° cone)', sym: 'L_f', dim: 'percent', default: 80, min: 50, max: 100, step: 1, slider: { min: 60, max: 100, step: 1 }, when: (v) => v.type === 'bell',
          info: { text: 'Length of the bell from throat to exit as a percentage of a 15° cone with the same throat and expansion ratio. Beyond about 80 % there is little to gain (Huzel & Huang).', range: '60–100 % (the chart’s range); 80 % is common.', doc: 'contour' } },
        { id: 'dc', label: 'Chamber (inlet) diameter', sym: 'd_c', ...LEN, default: 2.5, min: 0, minExclusive: true,
          info: { text: 'Inside diameter where the convergent starts — the motor case or grain bore end.', doc: 'contour' } },
        { id: 'thetaC', label: 'Convergent half angle', sym: '\\theta_c', ...ANG, default: 30, min: 5, max: 75, step: 1, slider: { min: 15, max: 60, step: 1 },
          info: { text: 'Half angle of the converging cone. The convergent carries slow gas, so its shape costs little; it sets the nozzle’s length and weight.', range: '20–45° (Huzel & Huang).', doc: 'contour' } },
      ],
    },
    {
      id: 'press', title: 'Pressures',
      fields: [
        { id: 'pc', label: 'Chamber pressure', sym: 'p_c', ...PRES, default: 600, min: 0, minExclusive: true,
          info: { text: 'Stagnation (total) pressure in the chamber, absolute.', range: 'Amateur and student solid motors 2–7 MPa (300–1000 psi).', doc: 'isentropic' } },
        { id: 'pa', label: 'Ambient pressure', sym: 'p_a', ...PRES, default: 14.7, min: 0,
          info: { text: 'Static pressure around the exit, absolute. Zero gives the vacuum value. Check the nozzle at the lowest altitude it fires.', range: 'Sea level 101.3 kPa (14.7 psi); about 26 kPa at 10 km.', doc: 'thrust' } },
        { id: 'crit', label: 'Separation criterion', kind: 'select', default: 'schmucker', options: Object.entries(CRITS).map(([value, label]) => ({ value, label })),
          info: { text: 'How low the wall pressure may fall below $p_a$ before the boundary layer separates. Schmucker fitted chemical-engine data with the wall Mach number; Summerfield’s 0.4 is the classic rule; Kalt–Bendall uses $p_c/p_a$.', doc: 'separation' } },
      ],
    },
  ],
  results: [
    { id: 'thrust', label: 'Thrust', sym: 'T', ...FORCE, key: true, note: (x, out) => `in vacuum ${fmt(toDisplay(out.o.thrustVac, FORCE), { digits: 4 })} $${unitTex(displayUnit(FORCE))}$`, info: { tex: 'T=C_F\\,p_c\\,A_t', doc: 'thrust' } },
    { id: 'cf', label: 'Thrust coefficient', sym: 'C_F', ...NONE, key: true, digits: 4, note: (x, out) => `$\\lambda$ = ${fmt(out.o.lambda, { digits: 4 })} · ${out.o.cfHow === 'separated' ? 'estimate, separated jet' : out.o.cfHow === 'shock' ? 'inviscid shock in the nozzle' : 'attached flow'}`,
      info: { tex: 'C_F=\\lambda\\,C_{F,m}+\\frac{p_e-p_a}{p_c}\\,\\varepsilon', doc: 'thrust' } },
    { id: 'isp', label: 'Specific impulse', sym: 'I_{sp}', dim: 'time', internal: 's', key: true, digits: 4, note: (x, out) => `vacuum ${fmt(out.o.ispVac, { digits: 4 })} s · ideal, no losses but divergence`, info: { tex: 'I_{sp}=\\frac{C_F\\,c^*}{g_0}', doc: 'performance' } },
    { id: 'sepMargin', label: 'Margin against separation', sym: 'p_e/p_{sep}', ...NONE, key: true, digits: 3,
      status: (m) => (typeof m !== 'number' ? null : m < 1 ? 'err' : m < SAFE_MARGIN ? 'warn' : 'ok'),
      note: (x, out) => (typeof x !== 'number' ? 'vacuum: no separation' : `${out.o.state}${out.o.fl.sep ? ` · separates at $\\varepsilon$ = ${fmt(out.o.fl.sep.eps, { digits: 3 })}` : ''}`),
      info: { text: 'Exit pressure of the attached flow divided by the pressure at which the wall boundary layer separates. Below 1 the jet leaves the wall inside the nozzle.', tex: 'p_{sep}=p_a\\,(1.88M_e-1)^{-0.64}', doc: 'separation' } },
    { id: 'Me', label: 'Exit Mach number', sym: 'M_e', ...NONE, key: true, digits: 4, note: (x, out) => `$p_e$ = ${fmt(toDisplay(out.o.fl.pe, PRES), { digits: 4 })} $${unitTex(displayUnit(PRES))}$ · $p_e/p_a$ = ${out.o.v.pa > 0 ? fmt(out.o.fl.pe / out.o.v.pa, { digits: 3 }) : '∞'}`,
      info: { tex: '\\varepsilon=\\frac{1}{M_e}\\left[\\frac{2}{\\gamma+1}\\left(1+\\frac{\\gamma-1}{2}M_e^2\\right)\\right]^{\\frac{\\gamma+1}{2(\\gamma-1)}}', doc: 'isentropic' } },
    { id: 'epsMax', label: 'Largest expansion ratio with margin at this ambient pressure', sym: '\\varepsilon_{max}', ...NONE, digits: 4, when: (v) => v.pa > 0,
      info: { text: `Largest $\\varepsilon$ whose exit pressure is still ${SAFE_MARGIN} times the separation pressure.`, doc: 'separation' } },
    { id: 'epsOpt', label: 'Expansion ratio for ideal expansion ($p_e=p_a$)', sym: '\\varepsilon_{opt}', ...NONE, digits: 4, when: (v) => v.pa > 0, info: { text: 'Gives the largest one-dimensional thrust coefficient at this ambient pressure.', doc: 'thrust' } },
    { id: 'pcMin', label: 'Chamber pressure that keeps the margin', sym: 'p_{c,min}', ...PRES, when: (v) => v.pa > 0, info: { text: `Lowest chamber pressure at which the exit pressure is ${SAFE_MARGIN} times the separation pressure (same nozzle).`, doc: 'separation' } },
    { id: 'mdot', label: 'Mass flow rate', sym: '\\dot m', ...MDOT, digits: 4, info: { tex: '\\dot m=\\frac{p_c A_t}{c^*}', doc: 'performance' } },
    { id: 'cstar', label: 'Characteristic velocity', sym: 'c^*', ...SPD, digits: 5, info: { tex: 'c^*=\\frac{\\sqrt{RT_c/\\gamma}}{\\left(\\frac{2}{\\gamma+1}\\right)^{\\frac{\\gamma+1}{2(\\gamma-1)}}}', doc: 'performance' } },
    { id: 'Ve', label: 'Exhaust velocity at the exit', sym: 'V_e', ...SPD, digits: 5, info: { tex: 'V_e=M_e\\sqrt{\\gamma R T_e}', doc: 'performance' } },
    { id: 'Te', label: 'Exit temperature', sym: 'T_e', ...TEMP, digits: 4, info: { tex: 'T_e=\\frac{T_c}{1+\\frac{\\gamma-1}{2}M_e^2}', doc: 'isentropic' } },
    { id: 'rhoE', label: 'Exit density', sym: '\\rho_e', ...DENS, digits: 4, info: { tex: '\\rho_e=\\frac{p_e}{RT_e}', doc: 'isentropic' } },
    { id: 'cf1D', label: 'Thrust coefficient, attached, one-dimensional', sym: 'C_{F,1D}', ...NONE, digits: 4, info: { doc: 'isentropic' } },
    { id: 'lambda', label: 'Divergence efficiency', sym: '\\lambda', ...NONE, digits: 4, info: { text: 'Fraction of the ideal (axial) jet momentum: Malina for a cone, Huzel & Huang fig. 4-12 for a bell.', doc: 'contour' } },
    { id: 'cfm', label: 'Momentum part of the thrust coefficient', sym: 'C_{F,m}', ...NONE, digits: 4, info: { doc: 'isentropic' } },
    { id: 'cfp', label: 'Pressure part of the thrust coefficient', sym: 'C_{F,p}', ...NONE, digits: 4, info: { tex: 'C_{F,p}=\\frac{p_e-p_a}{p_c}\\,\\varepsilon', doc: 'thrust' } },
    { id: 'cfVac', label: 'Thrust coefficient in vacuum', sym: 'C_{F,vac}', ...NONE, digits: 4, info: { doc: 'thrust' } },
    { id: 'pStar', label: 'Throat pressure', sym: 'p^*', ...PRES, info: { tex: 'p^*=p_c\\left(\\frac{2}{\\gamma+1}\\right)^{\\frac{\\gamma}{\\gamma-1}}', doc: 'isentropic' } },
    { id: 'peSub', label: 'Ambient pressure that unchokes the nozzle', sym: 'p_{a,1}', ...PRES, info: { text: 'Above this the flow is subsonic everywhere and the nozzle is a venturi.', doc: 'shock' } },
    { id: 'peNS', label: 'Ambient pressure that puts a normal shock at the exit', sym: 'p_{a,2}', ...PRES, info: { text: 'Between this and $p_{a,1}$ the ideal (inviscid) solution has a normal shock inside the divergent.', doc: 'shock' } },
    { id: 'xShock', label: 'Inviscid normal shock position (from the throat)', sym: 'x_s', ...LEN, when: (v, out) => !!out?.o?.fl?.shock, info: { doc: 'shock' } },
    { id: 'xSep', label: 'Separation point (from the throat)', sym: 'x_{sep}', ...LEN, when: (v, out) => !!out?.o?.fl?.sep, info: { doc: 'separation' } },
    { id: 'At', label: 'Throat area', sym: 'A_t', ...AREA, info: { tex: 'A_t=\\frac{\\pi d_t^2}{4}', doc: 'thrust' } },
    { id: 'de', label: 'Exit diameter', sym: 'd_e', ...LEN, info: { tex: 'd_e=d_t\\sqrt\\varepsilon', doc: 'contour' } },
    { id: 'Ln', label: 'Divergent length (throat to exit)', sym: 'L_n', ...LEN, info: { tex: 'L_{cone}=\\frac{r_t(\\sqrt\\varepsilon-1)+R_2(\\sec\\alpha-1)}{\\tan\\alpha}', doc: 'contour' } },
    { id: 'Lconv', label: 'Convergent length (inlet to throat)', sym: 'L_c', ...LEN, info: { doc: 'contour' } },
    { id: 'thn', label: 'Bell initial angle', sym: '\\theta_n', ...ANG, digits: 3, when: (v) => v.type === 'bell', info: { text: 'From Huzel & Huang fig. 4-14.', doc: 'contour' } },
    { id: 'the', label: 'Bell exit angle', sym: '\\theta_e', ...ANG, digits: 3, when: (v) => v.type === 'bell', info: { text: 'From Huzel & Huang fig. 4-14.', doc: 'contour' } },
    { id: 'Mc', label: 'Chamber (inlet) Mach number', sym: 'M_c', ...NONE, digits: 3, info: { text: 'Gas speed where the convergent starts. The model takes $p_c$ as the stagnation pressure, which is accurate only while this is small.', doc: 'isentropic' } },
  ],
  compute(v) {
    if (!(v.dc > v.dt)) throw new InputError('The chamber diameter must be larger than the throat diameter.');
    let geo;
    try { geo = geomOf(v); } catch (err) { throw new InputError(err.message.includes('chamber') ? 'The chamber is too narrow for the throat rounding at this convergent angle: enlarge the chamber diameter or the convergent angle.' : 'The bell parabola cannot be fitted for these inputs: try a longer bell or a larger expansion ratio.'); }
    const fl = nozzleFlow(geo, v.g, v.pc, v.pa, v.crit);
    if (fl.regime === 'unchoked') throw new InputError(`The ambient pressure is above ${fmt(toDisplay(fl.peSub, PRES), { digits: 4 })} ${displayUnit(PRES) === 'kPa' ? 'kPa' : 'psi'}, so the throat never reaches sound speed: raise the chamber pressure or lower the ambient pressure.`);
    const pac = v.pa / v.pc, c = cf(v.g, v.eps, pac, 0), lambda = lambdaOf(v);
    const act = cfActual(v, fl), At = (Math.PI * v.dt * v.dt) / 4;
    const cstar = cStar(v.g, v.Tc, v.Mw), R = RU / v.Mw, mdot = (v.pc * PSI * At * IN2) / cstar;
    const MeAct = fl.Me, Te = v.Tc / (1 + ((v.g - 1) / 2) * MeAct * MeAct);   // exit state of the attached flow
    const cfVac = cfAt(v, v.eps, 0);
    const MeOpt = v.pa > 0 ? machFromPressure(pac, v.g) : Infinity, epsOpt = v.pa > 0 ? areaRatio(MeOpt, v.g) : Infinity;
    const epsMax = v.pa > 0 ? epsForMargin(v, SAFE_MARGIN) : null;
    const pcMin = v.pa > 0 && Number.isFinite(fl.sepMargin) ? (() => {             // margin ∝ p_c except through Kalt–Bendall's p_c/p_a
      let lo = 1e-6 * v.pc, hi = 1e3 * v.pc;
      const ok = (pc) => pc * pressureRatio(fl.Me, v.g) >= SAFE_MARGIN * separationRatio(v.crit, fl.Me, pc / v.pa) * v.pa;
      for (let k = 0; k < 120; k++) { const mid = Math.sqrt(lo * hi); if (ok(mid)) hi = mid; else lo = mid; }
      return hi;
    })() : null;
    const state = v.pa <= 0 ? 'vacuum' : fl.sep ? 'jet separates inside the nozzle' : fl.regime === 'shock' ? 'normal shock inside (inviscid)' : fl.regime === 'ideal' ? 'ideally expanded' : fl.regime === 'underexpanded' ? 'under-expanded' : 'over-expanded, attached';
    const o = { v, geo, fl, lambda, cfHow: act.how, state, thrustVac: cfVac * v.pc * At, ispVac: (cfVac * cstar) / G0, At, cstar };

    // verdict: is the flow attached and choked at this ambient pressure?
    const L = (x) => `${fmt(toDisplay(x, LEN), { digits: 3 })} ${displayUnit(LEN)}`, P = (x) => `${fmt(toDisplay(x, PRES), { digits: 4 })} ${displayUnit(PRES) === 'kPa' ? 'kPa' : 'psi'}`;
    const m = fl.sepMargin, sepNow = !!fl.sep || fl.regime === 'shock';
    const level = v.pa <= 0 ? 'safe' : sepNow || m < 1 || act.cf <= 0 ? 'unsafe' : m < SAFE_MARGIN ? 'marginal' : 'safe';
    const fixes = [];
    if (level !== 'safe') {
      if (epsMax) fixes.push(`Reduce the expansion ratio from ${fmt(v.eps, { digits: 3 })} to at most <b>${fmt(epsMax, { digits: 3 })}</b> (exit ${L(v.dt * Math.sqrt(epsMax))}), or`);
      if (pcMin) fixes.push(`raise the chamber pressure from ${P(v.pc)} to at least <b>${P(pcMin)}</b>, or`);
      fixes.push('accept it only for a nozzle that fires at altitude, where the ambient pressure is lower.');
    }
    const verdict = {
      level,
      title: level === 'unsafe' ? (act.cf <= 0 ? 'The nozzle gives no thrust' : 'The jet separates from the wall') : level === 'marginal' ? 'Attached, but close to separation' : v.pa <= 0 ? 'Vacuum: attached, no separation' : 'Attached flow with margin',
      text: v.pa <= 0 ? `Exit Mach ${fmt(fl.Me, { digits: 3 })}; thrust coefficient ${fmt(act.cf, { digits: 4 })}.`
        : `Exit pressure ${P(fl.pe)} against ambient ${P(v.pa)}: margin against separation <b>${fmt(m, { digits: 3 })}</b> (${CRITS[v.crit].split(' (')[0]}; at least ${SAFE_MARGIN} wanted).${fl.sep ? ` The wall pressure falls to the separation pressure ${L(fl.sep.x)} after the throat (ε = ${fmt(fl.sep.eps, { digits: 3 })}).` : ''}`,
      fixes,
    };

    const warnings = [];
    if (fl.sep) warnings.push({ level: 'err', text: `The jet separates ${L(fl.sep.x)} after the throat. Separation is asymmetric and unsteady: side loads on the nozzle and the motor mount, and a thrust lower than the attached value (the figure shown is an estimate for a nozzle cut at the separation point).`, fix: fixes[0]?.replace(/, or$/, '.') });
    else if (fl.regime === 'shock') warnings.push({ level: 'err', text: 'The ideal solution has a normal shock inside the nozzle: a real nozzle separates before that.', fix: fixes[0]?.replace(/, or$/, '.') });
    if (fl.sep && (fl.sep.M < 2 || fl.sep.M > 5) && v.crit === 'schmucker') warnings.push({ level: 'info', text: `Separation is predicted at Mach ${fmt(fl.sep.M, { digits: 3 })}; Schmucker’s fit rests on data near Mach 3–4.6, so the position is extrapolated.` });
    if (v.pa > 0 && !sepNow && fl.pe / v.pa > 3) warnings.push({ level: 'info', text: `Strongly under-expanded ($p_e/p_a$ = ${fmt(fl.pe / v.pa, { digits: 3 })}): a larger expansion ratio would add thrust here.`, fix: `ε = ${fmt(Math.min(epsOpt, epsMax ?? Infinity), { digits: 3 })} expands ideally (or as far as the separation margin allows).` });
    const rao = v.type === 'bell' && (v.eps < 5.5 || v.eps > 50 || v.Lf < 60);
    if (rao || geo.adjusted) warnings.push({ level: 'warn', text: `The bell angles come from Huzel & Huang’s chart, which covers ε 5–50 and lengths 60–100 %; outside it the nearest chart values are used${geo.adjusted ? `, and here they were adjusted to θn = ${fmt(geo.thn, { digits: 3 })}°, θe = ${fmt(geo.the, { digits: 3 })}° so that a parabola fits` : ''}.`, fix: 'For a small expansion ratio a 15° cone is as good and simpler.' });
    if (v.type === 'cone' && (v.alpha < 12 || v.alpha > 18)) warnings.push({ level: 'info', text: `Half angle ${fmt(v.alpha, { digits: 3 })}° is outside the usual 12–18° (Huzel & Huang): ${v.alpha > 18 ? 'divergence loss grows and the flow may not follow the wall' : 'the nozzle gets long and heavy for little gain'}.` });
    if (v.thetaC < 20 || v.thetaC > 45) warnings.push({ level: 'info', text: `Convergent half angle ${fmt(v.thetaC, { digits: 3 })}° is outside the usual 20–45° (Huzel & Huang).` });
    const Mc = fl.prof[0].M;
    if (Mc > 0.3) warnings.push({ level: 'warn', text: `The gas enters the convergent at Mach ${fmt(Mc, { digits: 3 })}: the chamber is narrow for this throat, so $p_c$ is no longer the stagnation pressure and the results are optimistic.`, fix: 'Use a larger chamber diameter (or a smaller throat); a chamber Mach number below about 0.3 is a rule of thumb.' });
    if (v.g > 1.3) warnings.push({ level: 'info', text: 'γ above 1.3 is typical of cold-flow (air) tests rather than rocket exhaust.' });

    const results = {
      thrust: act.cf * v.pc * At, cf: act.cf, isp: (act.cf * cstar) / G0, sepMargin: v.pa > 0 ? m : '—', Me: MeAct,
      epsMax: epsMax ?? '—', epsOpt, pcMin: pcMin ?? '—', mdot, cstar, Ve: MeAct * Math.sqrt(v.g * R * Te), Te, rhoE: (fl.pe * PSI) / (R * Te),
      cf1D: c.momentum + c.pressure, lambda, cfm: c.momentum, cfp: c.pressure, cfVac, pStar: v.pc * throatRatio(v.g), peSub: fl.peSub, peNS: fl.peNS,
      xShock: fl.shock?.x ?? '—', xSep: fl.sep?.x ?? '—', At, de: geo.re * 2, Ln: geo.Ln, Lconv: geo.Lconv, thn: geo.thn, the: geo.the, Mc,
    };
    return { results, warnings, verdict, o, v };
  },
  plots: [
    {
      id: 'eps', title: 'Thrust coefficient against expansion ratio',
      info: { text: 'Thrust coefficient of your nozzle type as the expansion ratio changes, at your ambient pressure and in vacuum. At your ambient pressure it peaks near $p_e=p_a$; right of the red line the jet separates and the attached curve no longer applies.', doc: 'thrust' },
      build(v, out) {
        const o = out.o, pac = v.pa / v.pc, epsSep = v.pa > 0 ? epsForMargin(v, 1) : null;
        const top = Math.min(1000, Math.max(2 * v.eps, Number.isFinite(out.results.epsOpt) ? 1.6 * out.results.epsOpt : 0, 4));
        const series = [{ name: 'C_F at p_a', points: [] }, { name: 'C_F in vacuum', points: [], dashed: true, color: 'var(--text-3)' }];
        for (let i = 0; i <= 160; i++) { const e = 1.02 + ((top - 1.02) * i) / 160; series[0].points.push([e, cfAt(v, e, pac)]); series[1].points.push([e, cfAt(v, e, 0)]); }
        const vlines = [];
        if (Number.isFinite(out.results.epsOpt) && out.results.epsOpt <= top) vlines.push({ x: out.results.epsOpt, label: 'p_e = p_a', color: 'var(--text-3)' });
        if (epsSep && epsSep <= top) vlines.push({ x: epsSep, label: 'separation', color: 'var(--red)' });
        return { x: { label: 'Expansion ratio \\varepsilon' }, y: { label: 'Thrust coefficient C_F' }, series, vlines, markers: [{ x: v.eps, y: out.results.cf, label: 'design', color: out.verdict.level === 'unsafe' ? 'var(--red)' : out.verdict.level === 'marginal' ? 'var(--warn)' : 'var(--ok)' }], hover: 'x' };
      },
    },
    {
      id: 'wall', title: 'Wall pressure against the separation pressure', explore: true, when: (v) => v.pa > 0,
      info: { text: 'Attached (isentropic) wall pressure along the divergent, and the pressure at which the boundary layer separates by the chosen criterion, both divided by $p_a$. Where the wall curve drops below the criterion the jet leaves the wall.', doc: 'separation' },
      build(v, out, { U }) {
        if (!(v.pa > 0)) return null;
        const o = out.o, ul = U(LEN), wall = [], crit = [];
        for (const p of o.fl.prof) {
          if (p.x < 0) continue;
          const M = exitMach(p.A, v.g);
          wall.push([ul.v(p.x), (pressureRatio(M, v.g) * v.pc) / v.pa]); crit.push([ul.v(p.x), separationRatio(v.crit, M, v.pc / v.pa)]);
        }
        const vlines = [];
        if (o.fl.sep) vlines.push({ x: ul.v(o.fl.sep.x), label: 'separation', color: 'var(--red)' });
        if (o.fl.shock) vlines.push({ x: ul.v(o.fl.shock.x), label: 'inviscid shock', color: 'var(--text-3)' });
        return { x: { label: 'Distance from the throat x', unit: ul.label }, y: { label: 'Pressure / ambient' }, includeZero: true, hover: 'x',
          series: [{ name: 'wall pressure (attached)', points: wall, smooth: true }, { name: 'separation pressure', points: crit, dashed: true, color: 'var(--red)' }],
          hlines: [{ y: 1, label: 'p_a' }], vlines };
      },
    },
    {
      id: 'pa', title: 'Thrust against ambient pressure', explore: true,
      info: { text: 'Thrust of your nozzle from vacuum up to the pressure at which it unchokes. Attached, it falls in a straight line (only the back-pressure on the exit changes); once the jet separates, the estimate follows a nozzle cut at the separation point. The marked pressures bound the flow regimes.', doc: 'shock' },
      build(v, out, { U }) {
        const o = out.o, up = U(PRES), uf = U(FORCE), top = 0.98 * o.fl.peSub, att = [], sep = [];
        const paSep = o.fl.pe / separationRatio(v.crit, o.fl.Me, v.pc / Math.max(1e-9, v.pa || o.fl.pe));
        for (let i = 0; i <= 80; i++) {
          const pa = (top * i) / 80, fl = nozzleFlow(o.geo, v.g, v.pc, pa, v.crit), c = cfActual({ ...v, pa }, fl);
          (fl.sep || fl.shock ? sep : att).push([up.v(pa), uf.v(c.cf * v.pc * o.At)]);
        }
        if (sep.length && att.length) sep.unshift(att[att.length - 1]);
        const vlines = [{ x: up.v(o.fl.pe), label: 'p_e = p_a', color: 'var(--text-3)' }, { x: up.v(o.fl.peNS), label: 'shock at exit', color: 'var(--text-3)' }];
        if (v.crit !== 'kalt' && paSep < top) vlines.push({ x: up.v(paSep), label: 'separation', color: 'var(--red)' });
        return { x: { label: 'Ambient pressure p_a', unit: up.label }, y: { label: 'Thrust T', unit: uf.label }, includeZero: true, hover: 'x',
          series: [{ name: 'attached', points: att }, { name: 'separated (estimate)', points: sep, dashed: true, color: 'var(--red)' }], vlines,
          markers: v.pa > 0 ? [{ x: up.v(v.pa), y: uf.v(out.results.thrust), label: 'design' }] : [] };
      },
    },
    {
      id: 'loss', title: 'Divergence efficiency against nozzle length', explore: true,
      info: { text: 'Fraction of the ideal thrust coefficient kept by a bell (Rao parabola, Huzel & Huang fig. 4-12, at your expansion ratio) and by a cone shortened by widening its angle (Malina), against length as a percentage of a 15° cone. A bell keeps about 99 % at 80 % length; a cone that short loses about 2.5 %.', doc: 'contour' },
      build(v, out) {
        const rt = v.dt / 2, L15 = conicalLength(rt, v.eps, 15, 0.382 * rt), bell = [], cone = [];
        for (let Lf = 60; Lf <= 100.001; Lf += 1) {
          bell.push([Lf, 100 * bellEfficiency(v.eps, Lf)]);
          let lo = 1, hi = 60;                                       // cone angle with this length (length falls as α grows)
          for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (conicalLength(rt, v.eps, mid, 0.382 * rt) > (Lf / 100) * L15) lo = mid; else hi = mid; }
          cone.push([Lf, 100 * malina(lo)]);
        }
        const LfNow = v.type === 'bell' ? v.Lf : (100 * out.o.geo.Ln) / L15;
        return { x: { label: 'Length, % of a 15° cone', unit: '\\%' }, y: { label: 'Efficiency \\lambda', unit: '\\%' }, hover: 'x',
          series: [{ name: 'bell', points: bell, smooth: true }, { name: 'cone', points: cone, smooth: true, dashed: true }],
          markers: [{ x: LfNow, y: 100 * out.o.lambda, label: 'your nozzle' }] };
      },
    },
  ],
  schematicTitle: 'Nozzle contour and the flow along it',
  schematicHint: 'The wall is to scale; below it, with the same axial position, the area ratio, Mach number, pressure, temperature and density of the one-dimensional flow. Hover for values; drag the exit lip to change the expansion ratio and the length',
  schematic(ctx, v, out) {
    const o = out.o, geo = o.geo, fl = o.fl, W = 760, sh = 64, gap = 16;
    // shared x scale: the wall from the chamber stub to the exit, plus room for the plume
    const x0 = 96, x1 = W - 110, xmin = geo.xch, xmax = geo.Ln, sx = (x1 - x0) / (xmax - xmin);
    const X = (x) => x0 + (x - xmin) * sx;
    // same scale both ways while the radius fits in 120 px; a wide, short nozzle is drawn with its radius compressed
    const rmax = Math.max(geo.rc, geo.re), k = Math.min(sx, 120 / rmax), cy = 40 + rmax * k;
    const top0 = cy + rmax * k + 90, H = top0 + 5 * (sh + gap) + 14;
    const fr = ctx.frame({ width: W, height: H, label: 'Nozzle contour with area ratio, Mach number, pressure, temperature and density along it' });
    const g = fr.layer('main'); g.replaceChildren();
    const ul = ctx.U(LEN), L = (x) => `${fmt(ul.v(x), { digits: 3 })} ${ul.label}`, up = ctx.U(PRES), P = (x) => `${fmt(up.v(x), { digits: 3 })} ${up.label}`;
    const ut = ctx.U(TEMP), ud = ctx.U(DENS);
    const toScale = k === sx;
    // gas shading by Mach number (axial strips) and the walls
    const pts = fl.prof;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], M = (a.M + b.M) / 2, op = (0.06 + 0.32 * Math.min(1, M / Math.max(1.5, fl.Me))).toFixed(3);
      g.append(s('path', { d: path([[X(a.x), cy - a.r * k - 0.5], [X(b.x), cy - b.r * k - 0.5], [X(b.x), cy + b.r * k + 0.5], [X(a.x), cy + a.r * k + 0.5]], true), fill: 'var(--red)', 'fill-opacity': op, stroke: 'none', 'shape-rendering': 'crispEdges' }));
    }
    const tw = 5;
    for (const sg of [-1, 1]) g.append(s('path', { d: path([...pts.map((p) => [X(p.x), cy + sg * p.r * k]), ...pts.slice().reverse().map((p) => [X(p.x), cy + sg * (p.r * k + tw)])], true), class: 'sc-body-2', 'data-field': 'dt eps dc thetaC alpha Lf type' }));
    g.append(s('line', { x1: x0 - 10, x2: W - 20, y1: cy, y2: cy, class: 'sc-thin', 'stroke-dasharray': '10 4 2 4' }));
    // plume: flares when under-expanded, necks when over-expanded, leaves the wall where it separates
    const re = geo.re * k, pl = W - 20 - X(xmax), tilt = Math.max(-0.45, Math.min(0.45, 0.3 * Math.log(Math.max(1e-6, fl.pe / Math.max(v.pa, 1e-9 * v.pc)))));
    const xs0 = fl.sep ? X(fl.sep.x) : X(xmax), rs0 = fl.sep ? geo.rt * Math.sqrt(fl.sep.eps) * k : re;
    const hp = (f) => Math.max(0.35 * rs0, rs0 + tilt * pl * f * (1.3 - f));
    const plume = [[xs0, rs0]]; for (let i = 1; i <= 16; i++) { const f = i / 16; plume.push([X(xmax) + pl * f, hp(f)]); }
    g.append(s('path', { d: path([...plume.map(([x, h]) => [x, cy - h]), ...plume.slice().reverse().map(([x, h]) => [x, cy + h])], true), fill: 'var(--red)', 'fill-opacity': 0.05, stroke: 'var(--red)', 'stroke-opacity': 0.45, 'stroke-dasharray': '4 3', 'data-field': 'pa' }));
    // throat, exit, labels
    g.append(s('line', { x1: X(0), x2: X(0), y1: cy - geo.rt * k, y2: cy + geo.rt * k, class: 'sc-thin', 'stroke-dasharray': '3 3', 'data-field': 'dt' }));
    const yl = cy - rmax * k - 16;
    g.append(text(X(geo.xch) + 2, yl, `chamber · p_c = ${P(v.pc)}`, { size: 10.5, field: 'pc' }));
    g.append(text(X(0), yl, 'throat · M = 1', { anchor: 'middle', size: 10.5, field: 'dt' }));
    g.append(text(X(xmax), yl - 14, `exit · M_e = ${fmt(pts[pts.length - 1].M, { digits: 3 })}`, { anchor: 'end', size: 10.5, field: 'eps' }));
    g.append(text(W - 16, yl, `ambient p_a = ${P(v.pa)}`, { anchor: 'end', size: 10.5, cls: 'sc-dim-text', field: 'pa' }));
    if (v.type === 'bell') g.append(text(X(xmax) - 4, cy + rmax * k + 22, `θ_n = ${fmt(geo.thn, { digits: 3 })}°, θ_e = ${fmt(geo.the, { digits: 3 })}° · L_f = ${fmt(v.Lf, { digits: 3 })} %`, { anchor: 'end', size: 10.5, cls: 'sc-dim-text', field: 'Lf' }));
    else g.append(text(X(xmax) - 4, cy + rmax * k + 22, `α = ${fmt(v.alpha, { digits: 3 })}°`, { anchor: 'end', size: 10.5, cls: 'sc-dim-text', field: 'alpha' }));
    g.append(dim(fr, X(0), cy + rmax * k + tw, X(xmax), cy + rmax * k + tw, `L_n = ${L(geo.Ln)}`, { off: 34, textOff: 14, field: 'eps Lf alpha' }));
    g.append(text(X(0) - 6, cy + geo.rt * k + 16, `d_t = ${L(v.dt)}`, { anchor: 'end', size: 10.5, field: 'dt' }));
    g.append(text(X(xmax) + 8, cy - 6, `d_e = ${L(2 * geo.re)}`, { size: 10.5, field: 'eps' }));

    // stacked profiles with the same x: area ratio, Mach, p/pc, T/Tc, ρ/ρc
    const R = RU / v.Mw, rhoC = (v.pc * PSI) / (R * v.Tc), last = pts[pts.length - 1];
    const strips = [
      { key: 'A', label: 'A/A^*', max: Math.max(...pts.map((p) => p.A)), ends: [`${fmt(pts[0].A, { digits: 3 })}`, `${fmt(last.A, { digits: 3 })}`] },
      { key: 'M', label: 'M', max: Math.max(1.2, ...pts.map((p) => p.M)), ends: [fmt(pts[0].M, { digits: 2 }), fmt(last.M, { digits: 3 })] },
      { key: 'p', label: 'p/p_c', max: 1, ends: [P(v.pc * pts[0].p), P(v.pc * last.p)], line: v.pa > 0 ? { y: v.pa / v.pc, label: 'p_a' } : null },
      { key: 'T', label: 'T/T_c', max: 1, ends: [`${fmt(ut.v(v.Tc * pts[0].T), { digits: 4 })} ${ut.label}`, `${fmt(ut.v(v.Tc * last.T), { digits: 4 })} ${ut.label}`] },
      { key: 'rho', label: 'ρ/ρ_c', max: 1, ends: [`${fmt(ud.v(rhoC * pts[0].rho), { digits: 3 })} ${ud.label}`, `${fmt(ud.v(rhoC * last.rho), { digits: 3 })} ${ud.label}`] },
    ];
    strips.forEach((st, i) => {
      const yb = top0 + i * (sh + gap) + sh, yt = yb - sh, Y = (val) => yb - (val / st.max) * sh;
      g.append(s('rect', { x: x0, y: yt, width: x1 - x0, height: sh, fill: 'none', class: 'sc-thin', 'stroke-opacity': 0.35 }));
      g.append(s('line', { x1: X(0), x2: X(0), y1: yt, y2: yb, class: 'sc-thin', 'stroke-dasharray': '3 3', opacity: 0.6 }));
      g.append(text(x0 - 8, yt + sh / 2 + 4, st.label, { anchor: 'end', size: 11 }));
      g.append(text(x0 - 8, yb + 3, '0', { anchor: 'end', size: 9, cls: 'sc-dim-text' }));
      g.append(text(x0 - 8, yt + 9, fmt(st.max, { digits: 2 }), { anchor: 'end', size: 9, cls: 'sc-dim-text' }));
      if (st.line) {
        g.append(s('line', { x1: x0, x2: x1, y1: Y(st.line.y), y2: Y(st.line.y), class: 'sc-thin', 'stroke-dasharray': '5 3' }));
        g.append(text(x1 - 4, Y(st.line.y) - 4, st.line.label, { anchor: 'end', size: 9.5, cls: 'sc-dim-text', field: 'pa' }));
      }
      if (st.key === 'M') g.append(s('line', { x1: x0, x2: x1, y1: Y(1), y2: Y(1), class: 'sc-thin', 'stroke-dasharray': '2 3', opacity: 0.6 }));
      // the curve, broken at a shock
      let seg = [];
      const flush = () => { if (seg.length > 1) g.append(s('path', { d: path(seg), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.6 })); seg = []; };
      pts.forEach((p, j) => { if (fl.shock && j && pts[j - 1].x < fl.shock.x && p.x >= fl.shock.x) flush(); seg.push([X(p.x), Y(p[st.key])]); });
      flush();
      g.append(text(x1 + 8, yt + 12, 'exit', { size: 9, cls: 'sc-dim-text' }));
      g.append(text(x1 + 8, yt + 26, st.ends[1], { size: 10 }));
      g.append(text(x1 + 8, yb - 14, 'inlet', { size: 9, cls: 'sc-dim-text' }));
      g.append(text(x1 + 8, yb - 1, st.ends[0], { size: 10 }));
    });
    const yEnd = top0 + strips.length * (sh + gap) - gap;
    // shock and separation through the whole figure
    if (fl.shock) {
      g.append(s('line', { x1: X(fl.shock.x), x2: X(fl.shock.x), y1: cy - geo.rt * Math.sqrt(fl.shock.eps) * k, y2: yEnd, stroke: 'var(--text-2)', 'stroke-width': 1.2, 'stroke-dasharray': '6 3' }));
      const right = X(fl.shock.x) > (x0 + x1) / 2;
      g.append(text(X(fl.shock.x) + (right ? -4 : 4), top0 - 6, `inviscid normal shock · M ${fmt(fl.shock.M1, { digits: 3 })} → ${fmt(fl.shock.M2, { digits: 3 })}`, { anchor: right ? 'end' : 'start', size: 10, cls: 'sc-dim-text' }));
    }
    if (fl.sep) {
      const xs = X(fl.sep.x);
      g.append(s('line', { x1: xs, x2: xs, y1: cy - rs0, y2: yEnd, stroke: 'var(--red)', 'stroke-width': 1.5 }));
      g.append(s('circle', { cx: xs, cy: cy - rs0, r: 4, fill: 'none', stroke: 'var(--red)', 'stroke-width': 1.5 }));
      g.append(text(xs + 6, top0 - (fl.shock ? 20 : 6), `separation (${CRITS[v.crit].split(' (')[0]})`, { size: 10.5, cls: 'sc-label', field: 'pa crit' }));
    }
    const caption = text(x0, H - 6, `${toScale ? 'wall to scale' : 'radius drawn smaller than length'} · shading: Mach number · profiles: one-dimensional ${fl.shock ? 'inviscid ' : ''}flow · x: ${L(xmax - xmin)} from chamber to exit`, { size: 10, cls: 'sc-dim-text' });
    g.append(caption);

    // hover read-out: a cursor through every strip with the local values
    const cur = s('g', { 'pointer-events': 'none', visibility: 'hidden' });
    const cl = s('line', { y1: cy - rmax * k, y2: yEnd, stroke: 'var(--text-2)', 'stroke-width': 1, 'stroke-dasharray': '3 2' }), ct = s('text', { class: 'sc-label', style: 'font-size:10.5px' });
    cur.append(cl, ct); g.append(cur);
    const svg = fr.svg;
    const plain = (u) => (x) => `${fmt(u.v(x), { digits: 3 })} ${u.plain}`;
    svg.__nozzle = { pts, x0, x1, xmin, sx, v, L: plain(ul), P: plain(up), T: (x) => `${fmt(ut.v(x), { digits: 4 })} ${ut.plain}`, yTip: H - 6, caption };
    if (!svg.__nozzleHover) {
      svg.__nozzleHover = true;
      svg.addEventListener('pointermove', (e) => {
        const d = svg.__nozzle, c = svg.querySelector('g[data-layer="main"] > g:last-child');
        if (!d || !c) return;
        const m = svg.getScreenCTM(); if (!m) return;
        const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
        if (p.x < d.x0 || p.x > d.x1) { c.setAttribute('visibility', 'hidden'); d.caption.setAttribute('visibility', 'visible'); return; }
        const x = d.xmin + (p.x - d.x0) / d.sx;
        const q = d.pts.reduce((b, a) => (Math.abs(a.x - x) < Math.abs(b.x - x) ? a : b), d.pts[0]);
        const [ln, tx] = c.children;
        ln.setAttribute('x1', p.x); ln.setAttribute('x2', p.x);
        tx.setAttribute('x', d.x0); tx.setAttribute('y', d.yTip); d.caption.setAttribute('visibility', 'hidden');
        tx.textContent = `x ${d.L(q.x)} · A/A* ${fmt(q.A, { digits: 3 })} · M ${fmt(q.M, { digits: 3 })} · p ${d.P(d.v.pc * q.p)} · T ${d.T(d.v.Tc * q.T)}`;
        c.setAttribute('visibility', 'visible');
      });
      svg.addEventListener('pointerleave', () => { svg.querySelector('g[data-layer="main"] > g:last-child')?.setAttribute('visibility', 'hidden'); svg.__nozzle?.caption.setAttribute('visibility', 'visible'); });
    }

    ctx.handle('lip', X(xmax), cy - re, {
      field: 'eps', title: 'Drag up or down for the expansion ratio, along the axis for the length (bell) or half angle (cone)',
      onDrag: (px, py) => {
        const r = Math.max(geo.rt * 1.01, (cy - py) / k), len = Math.max(1e-6, xmin + (px - x0) / sx);
        ctx.setValue('eps', (r / geo.rt) ** 2);
        if (v.type === 'bell') ctx.setValue('Lf', (100 * len) / conicalLength(geo.rt, (r / geo.rt) ** 2, 15, geo.R2), { round: 1 });
        else ctx.setValue('alpha', Math.atan((r - geo.rt) / len) / RAD, { round: 0.5 });
      },
      onKey: (dx, dy) => { if (dy) ctx.setValue('eps', v.eps * (1 + 0.05 * dy)); if (dx) (v.type === 'bell' ? ctx.setValue('Lf', v.Lf + dx) : ctx.setValue('alpha', v.alpha - 0.5 * dx)); },
    });
  },
  symbols: {
    '\\gamma': 'ratio of specific heats of the exhaust gas', T_c: 'chamber (stagnation) temperature', '\\mathcal{M}': 'molar mass of the exhaust', R: 'gas constant of the exhaust, $R_u/\\mathcal{M}$',
    '\\varepsilon': 'expansion ratio $A_e/A_t$', '\\alpha': 'divergence half angle of a cone', L_f: 'bell length as a fraction of a 15° cone', '\\theta_n': 'initial angle of the bell parabola', '\\theta_e': 'exit angle of the bell parabola',
    p_c: 'chamber pressure', p_a: 'ambient pressure', p_e: 'exit pressure', 'p^*': 'throat pressure', M_e: 'exit Mach number', p_i: 'wall pressure where separation begins', M_i: 'wall Mach number where separation begins',
    '\\lambda': 'divergence efficiency (Malina for a cone; Huzel & Huang fig. 4-12 for a bell)', C_F: 'thrust coefficient', 'C_{F,m}': 'momentum part of the one-dimensional thrust coefficient', 'C_{F,p}': 'pressure part of the thrust coefficient',
    T: 'thrust', A_t: 'throat area', 'c^*': 'characteristic velocity', '\\dot m': 'mass flow rate', I_sp: 'specific impulse', g_0: 'standard gravity', r_t: 'throat radius', R_2: 'throat arc radius downstream, 0.382 r_t',
  },
  report(v, out, R) {
    const o = out.o, n = R.n, g = v.g, p = (x) => R.v(x, PRES), fl = o.fl, c = cf(g, v.eps, v.pa / v.pc, 0);
    const steps = [
      { label: 'Exit Mach number: supersonic root of the area–Mach relation (NACA 1135)', eq: '\\varepsilon=\\frac{1}{M_e}\\left[\\frac{2}{\\gamma+1}\\left(1+\\frac{\\gamma-1}{2}M_e^2\\right)\\right]^{\\frac{\\gamma+1}{2(\\gamma-1)}}', res: `M_e=${n(fl.Me, 6)}` },
      { label: 'Exit pressure of the attached flow', lhs: 'p_e', eq: 'p_c\\left(1+\\frac{\\gamma-1}{2}M_e^2\\right)^{-\\frac{\\gamma}{\\gamma-1}}', sub: `${p(v.pc)}\\left(1+\\frac{${n(g)}-1}{2}\\times${n(fl.Me)}^2\\right)^{-\\frac{${n(g)}}{${n(g)}-1}}`, res: R.Q(fl.pe, PRES) },
    ];
    if (v.pa > 0) {
      steps.push(
        { label: `Separation pressure at the exit (${CRITS[v.crit]}; Schmucker, NASA TM-77396)`, lhs: 'p_{sep}', eq: v.crit === 'schmucker' ? 'p_a\\,(1.88\\,M_e-1)^{-0.64}' : v.crit === 'kalt' ? '0.667\\,p_a\\left(\\frac{p_c}{p_a}\\right)^{-0.2}' : '0.4\\,p_a', res: R.Q(separationRatio(v.crit, fl.Me, v.pc / v.pa) * v.pa, PRES) },
        { label: 'Margin against separation (above 1: attached)', lhs: '\\frac{p_e}{p_{sep}}', res: n(fl.sepMargin) },
      );
    }
    steps.push(
      { label: 'Momentum part of the thrust coefficient', lhs: 'C_{F,m}', eq: '\\sqrt{\\frac{2\\gamma^2}{\\gamma-1}\\left(\\frac{2}{\\gamma+1}\\right)^{\\frac{\\gamma+1}{\\gamma-1}}\\left[1-\\left(\\frac{p_e}{p_c}\\right)^{\\frac{\\gamma-1}{\\gamma}}\\right]}', sub: `${n(cfInfinity(g))}\\times\\sqrt{1-\\left(\\frac{${p(fl.pe)}}{${p(v.pc)}}\\right)^{\\frac{${n(g)}-1}{${n(g)}}}}`, res: n(c.momentum) },
      { label: 'Pressure part of the thrust coefficient', lhs: 'C_{F,p}', eq: '\\frac{p_e-p_a}{p_c}\\,\\varepsilon', sub: `\\frac{${p(fl.pe)}-${p(v.pa)}}{${p(v.pc)}}\\times${n(v.eps)}`, res: n(c.pressure) },
      v.type === 'bell'
        ? { label: `Divergence efficiency of an ${n(v.Lf)} % bell at $\\varepsilon$ = ${n(v.eps)} (Huzel & Huang fig. 4-12)`, lhs: '\\lambda', res: n(o.lambda) }
        : { label: 'Malina divergence factor of the cone', lhs: '\\lambda', eq: '\\frac{1+\\cos\\,\\alpha}{2}', sub: `\\frac{1+\\cos ${n(v.alpha)}^{\\circ}}{2}`, res: n(o.lambda, 6) },
      { label: o.cfHow === 'separated' ? 'Thrust coefficient — estimate for a nozzle cut at the separation point' : o.cfHow === 'shock' ? 'Thrust coefficient behind the inviscid shock ($p_e=p_a$)' : 'Thrust coefficient', lhs: 'C_F', eq: o.cfHow === 'attached' ? '\\lambda\\,C_{F,m}+C_{F,p}' : null, res: n(out.results.cf) },
      { label: 'Throat area', lhs: 'A_t', eq: '\\frac{\\pi d_t^2}{4}', sub: `\\frac{\\pi\\,(${R.v(v.dt, LEN)})^2}{4}`, res: R.Q(o.At, AREA) },
      { label: 'Thrust', lhs: 'T', eq: 'C_F\\,p_c\\,A_t', res: R.Q(out.results.thrust, FORCE) },
      { label: 'Characteristic velocity', lhs: 'c^*', eq: '\\frac{\\sqrt{R_uT_c/(\\mathcal{M}\\gamma)}}{(2/(\\gamma+1))^{(\\gamma+1)/(2(\\gamma-1))}}', res: R.Q(o.cstar, SPD) },
      { label: 'Mass flow and specific impulse', lhs: '\\dot m', eq: '\\frac{p_cA_t}{c^*}', res: R.Q(out.results.mdot, MDOT) },
      { lhs: 'I_{sp}', eq: '\\frac{C_F\\,c^*}{g_0}', res: `${n(out.results.isp)}\\ \\mathrm{s}` },
    );
    const geoText = v.type === 'bell'
      ? `The divergent is Rao’s bell in the parabolic approximation of Huzel & Huang (NASA SP-125, fig. 4-13): a circular arc of radius $1.5\\,r_t$ upstream of the throat, $0.382\\,r_t$ downstream to the angle $\\theta_n$ = ${n(o.geo.thn)}°, then a parabola to the exit at $\\theta_e$ = ${n(o.geo.the)}° (both from their fig. 4-14 for $\\varepsilon$ = ${n(v.eps)}, $L_f$ = ${n(v.Lf)} %). Its length is $L_f$ times that of a 15° cone, eq. (4-7).`
      : `The divergent is a cone of half angle ${n(v.alpha)}° after a throat arc of radius $0.382\\,r_t$; its length follows Huzel & Huang eq. (4-7).`;
    return [{
      title: 'Theory',
      text: `The exhaust is a perfect gas with constant $\\gamma$ flowing steadily and one-dimensionally from the chamber through a sonic throat (NACA Report 1135). The local area ratio fixes the Mach number, pressure, temperature and density along the nozzle. ${geoText} If the ambient pressure lies between ${p(fl.peNS)} and ${p(fl.peSub)} (in ${R.us ? 'psi' : 'kPa'}), the inviscid solution has a normal shock inside (NACA 1135 eqs. 93, 96, 99); a real boundary layer separates upstream of it, where the wall pressure falls to the separation pressure (Schmucker).`,
      steps,
    }];
  },
  reportNotes: [
    'One-dimensional, frozen, inviscid flow: no friction, heat loss, two-phase (particle) lag or chemistry; real motors deliver several percent less thrust coefficient and specific impulse.',
    'Separation criteria are empirical fits to rocket-engine data (Schmucker) and carry scatter of the order of ±10 %.',
  ],
  limits: [
    'Quasi-one-dimensional flow: each cross-section uniform; the bell’s exit angle and the cone’s spreading appear only through the efficiency λ.',
    'Perfect gas with constant (frozen) $\\gamma$ and molar mass; no condensed particles. Aluminised and sugar propellants lose more through two-phase flow.',
    'Bell contour from Huzel & Huang’s parabolic approximation of Rao’s optimum; their chart covers ε 5–50 and lengths 60–100 %.',
    'Throat arcs are fixed at 1.5 $r_t$ upstream and 0.382 $r_t$ downstream (Huzel & Huang); the convergent shape does not change the one-dimensional result.',
    'Separation criteria are empirical (Schmucker: data near wall Mach 3–4.6). After separation the thrust shown is an estimate (nozzle cut at the separation point).',
    'The chamber pressure is taken as the stagnation pressure: valid while the chamber Mach number is small (see the warnings).',
  ],
  references: [],
  externalRefs: [
    { title: 'Equations, Tables, and Charts for Compressible Flow (NACA Report 1135)', authors: 'Ames Research Staff', venue: 'NACA, 1953', url: 'https://ntrs.nasa.gov/citations/19930091059' },
    { title: 'Design of Liquid Propellant Rocket Engines (NASA SP-125), §4.3 nozzle design', authors: 'D. K. Huzel, D. H. Huang', venue: 'NASA, 2nd ed., 1971', url: 'https://ntrs.nasa.gov/citations/19710019929' },
    { title: 'Flow processes in overexpanded chemical rocket nozzles, Part 1: Flow separation (NASA TM-77396)', authors: 'R. H. Schmucker', venue: 'NASA, 1984 (translation)', url: 'https://ntrs.nasa.gov/citations/19840011402' },
  ],
  examples: [
    { name: 'Bell 80 %, ε 8, 600 psi at sea level', values: { type: 'bell', g: 1.2, dt: 1, eps: 8, Lf: 80, pc: 600, pa: 14.7 } },
    { name: 'THRUSTCF workbook: air, ε 6, 15° cone, 600 psi at sea level', values: { type: 'cone', g: 1.4, dt: 1, eps: 6, alpha: 15, pc: 600, pa: 14.7 } },
    { name: 'Over-expanded at launch: ε 25 bell, 500 psi', values: { type: 'bell', g: 1.2, dt: 0.75, dc: 2.5, eps: 25, Lf: 80, pc: 500, pa: 14.7 } },
    { name: 'Low chamber pressure: shock and separation, 60 psi', values: { type: 'cone', g: 1.2, dt: 1, eps: 8, alpha: 15, pc: 60, pa: 14.7 } },
    { name: 'Upper stage in vacuum: ε 40 bell', values: { type: 'bell', g: 1.2, dt: 0.75, dc: 2.5, eps: 40, Lf: 80, pc: 500, pa: 0 } },
  ],
};
