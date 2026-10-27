// Flight Path Angle Dispersions — UI definition.
import { dispersion } from '../calc/dispersion.js';
import { s, fmt, InputError } from '../util.js';
import { text, path } from '../ui/svg.js';
import { toDisplay, displayUnit, unitLabel } from '../units.js';

const G = 32.174;
const ALT = { dim: 'altitude', internal: 'ft' };
const DIST = { dim: 'distance', internal: 'ft' };
const LEN = { dim: 'length', internal: 'ft' };
const ANG = { dim: 'angle', internal: 'rad' };
const WAVE = { dim: 'wavenumber', internal: 'perft' };
const NONE = { dim: 'none' };
const A = (x) => `${fmt(toDisplay(x, ANG), { digits: 3 })}${unitLabel(displayUnit(ANG))}`;

/** Calc parameters from the form values (boost acceleration a = T/m − g, drag neglected). */
const P = (v) => ({ ...v, g: G, a: v.T / v.m - G });
// verdict bands (DECISIONS D42): γ₀ against your limit; up to 1.25× is marginal. Roll at or past 95 % of the pitch
// wave number is lock-in territory and gets no steady answer.
const MARGIN = 1.25, LOCK = 0.95;
const ST = { safe: 'ok', marginal: 'warn', unsafe: 'err' };
const COL = { safe: 'var(--ok)', marginal: 'var(--warn)', unsafe: 'var(--danger)' };
const g0Of = (v, over) => dispersion(P({ ...v, ...over })).g0;
function solve(f, lo, hi) {
  let flo = f(lo); if (!(flo * f(hi) <= 0)) return null;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2, fm = f(m); if (fm * flo > 0) { lo = m; flo = fm; } else hi = m; }
  return (lo + hi) / 2;
}

const DEF = {
  slug: 'flight-path-dispersion',
  topic: 'dispersion',
  title: 'Flight Path Angle Dispersions',
  verdict: true,
  tiers: true,
  subtitle: 'How <b>thrust misalignment</b> and <b>wind gusts</b> tilt a rolling rocket’s velocity vector during boost, as an equivalent launcher angle error.',
  intro: {
    what: 'Gives the one-sigma tilt of the velocity vector at burnout caused by thrust misalignment and gusts, and the launcher elevation (or azimuth) error that would produce the same tilt.',
    why: 'Sounding rockets fly nearly vertically, so their impact point errors come mainly from rotations of the velocity vector. Feeding the equivalent launcher error into a point-mass trajectory run turns it into an impact dispersion for recovery planning and range safety.',
    when: 'Choosing the spin rate and fin size, comparing launcher lengths, and preparing the dispersion inputs of a trajectory simulation.',
  },
  info: {
    text: [
      'Thrust misalignment holds the rocket at a small steady angle of attack. The resulting lift turns the velocity vector, mostly at low speed just off the rail.',
      'Roll spins that lift around, so the turn partly cancels: rolling a whole number of turns during boost (best: one) gives the least dispersion.',
      'Gusts add a planar part. The two are combined as independent errors and mapped back to the launcher angle that would give the same burnout tilt.',
    ],
    tex: '\\gamma_0=\\sqrt{\\gamma_D^2+\\gamma_G^2}\\,\\left(\\frac{h_b}{L}\\right)^{-g/2a}',
    steps: ['Enter the rocket mass, inertia, thrust and aerodynamics.', 'Enter the misalignment and gust statistics (one sigma).', 'Enter the roll wavelength, pitch wave number, launcher length and burnout altitude.', 'Set the largest launcher-equivalent error you accept.', 'Read the verdict and fixes; use the equivalent launcher angle as the per-axis launcher error of a trajectory run.'],
    doc: 'overview',
  },
  groups: [
    {
      id: 'rocket', title: 'Rocket during boost',
      fields: [
        { id: 'm', label: 'Mass', sym: 'm', dim: 'mass', internal: 'slug', default: 1.95, min: 1e-6, max: 1000, slider: { min: 0.05, max: 20, step: 0.01 },
          info: { text: ['Average mass of the rocket during boost: halfway between lift-off and burnout.', 'With the thrust it sets the boost acceleration $a=T/m-g$.', 'A lighter rocket accelerates harder, so it is turned less before it is fast.'], tex: 'a=\\frac{T}{m}-g', range: '1–30 kg for amateur and small sounding rockets.', doc: 'thrust' } },
        { id: 'I', label: 'Pitch moment of inertia', sym: 'I_p', dim: 'inertia', internal: 'slugft2', default: 12.235, min: 1e-9, max: 1e5, slider: { min: 0.05, max: 100, step: 0.01 },
          info: { text: ['Resistance of the rocket to turning nose-over-tail, about its centre of mass.', 'Measure it with the Bifilar Pendulum page, or from a CAD model.', 'It appears with the pitch wave number in the misalignment lift.'], tex: 'L_A\\propto\\frac{1}{I_p(\\lambda_P^2-\\lambda_R^2)}', range: 'Roughly $mL^2/12$ for a uniform rocket of length $L$.', doc: 'thrust' } },
        { id: 'T', label: 'Thrust', sym: 'T', dim: 'force', internal: 'lbf', default: 550, min: 1e-9, max: 1e5, slider: { min: 20, max: 5000, step: 5 },
          info: { text: ['Average boost thrust (total impulse divided by burn time).', 'The model takes the acceleration as $T/m-g$ (drag neglected); it needs at least 1.5 × the weight.', 'More thrust gets the rocket fast sooner, so the misalignment and gusts turn it less.'], range: 'A thrust-to-weight ratio of 5–20 is usual for amateur rockets.', doc: 'thrust', tex: 'a=\\frac{T}{m}-g' } },
        { id: 'S', label: 'Reference area', sym: 'S', dim: 'area', internal: 'ft2', default: 0.19635, min: 1e-9, max: 50, slider: { min: 0.005, max: 2, step: 0.001 },
          info: { text: ['The area the lift-curve slope is based on: usually the body cross-section, $\\pi d^2/4$.', 'Use the same reference as your $C_{L\\alpha}$ source.', 'Only the product $SC_{L\\alpha}$ matters.'], tex: 'S=\\frac{\\pi d^2}{4}', doc: 'thrust', range: 'Body cross-section: 20–80 cm² (3–12 in²) for amateur rockets.' } },
        { id: 'CLa', label: 'Lift-curve slope', sym: 'C_{L\\alpha}', dim: 'perAngle', internal: 'perrad', default: 6.56325, min: 1e-6, max: 100, slider: { min: 2, max: 20, step: 0.05 },
          info: { text: ['Normal-force coefficient slope of the whole rocket per radian of angle of attack.', 'From the Subsonic CP page (Barrowman) or a wind-tunnel or CFD value.', 'More lift per degree means a gust or the misalignment turns the path more.'], range: '6–15 per radian for finned rockets.', doc: 'thrust', tex: 'L_A=\\frac{\\rho SC_{L\\alpha}T\\sqrt{\\ell^2\\delta_T^2+\\Omega^2}}{2I_p(\\lambda_P^2-\\lambda_R^2)}' } },
        { id: 'rho', label: 'Air density (launch site)', sym: '\\rho', dim: 'density', internal: 'slugft3', default: 0.002378, min: 1e-9, max: 0.003, slider: { min: 0.0015, max: 0.0026, step: 0.00001 },
          info: { text: ['Density of the air at the launch site during boost.', 'Standard sea level is 1.225 kg/m³; it falls about 10 % per 1000 m of elevation.', 'Denser air means more lift for the same angle of attack.'], range: '0.9–1.25 kg/m³.', doc: 'thrust', tex: 'L_A=\\frac{\\rho SC_{L\\alpha}T\\sqrt{\\ell^2\\delta_T^2+\\Omega^2}}{2I_p(\\lambda_P^2-\\lambda_R^2)}' } },
      ],
    },
    {
      id: 'errors', title: 'Perturbations (one sigma, per axis)',
      fields: [
        { id: 'arm', label: 'Nozzle throat to centre of mass', sym: '\\ell', ...LEN, default: 4.2, min: 0, max: 100, slider: { min: 0.2, max: 15, step: 0.05 },
          info: { text: ['Distance from the nozzle throat forward to the centre of mass.', 'It is the lever of a misaligned thrust vector.', 'A longer lever turns the same misalignment into a larger moment.'], doc: 'thrust', tex: 'L_A=\\frac{\\rho SC_{L\\alpha}T\\sqrt{\\ell^2\\delta_T^2+\\Omega^2}}{2I_p(\\lambda_P^2-\\lambda_R^2)}', range: 'About half the rocket length: 0.5–2 m (2–6 ft).' } },
        { id: 'dT', label: 'Thrust misalignment angle', sym: '\\delta_T', ...ANG, default: 0.002, min: 0, max: 0.1, slider: { min: 0, max: 0.006, step: 0.0001 },
          info: { text: ['One component of the angle between the thrust vector and the rocket axis, at the one-sigma level.', 'Hoult’s data for fixed-nozzle solid motors give a few tenths of a degree; careful alignment of the motor mount helps.', 'Usually the largest source of dispersion: the verdict gives the misalignment that meets your limit.'], range: 'Typically 0.05–0.3° for fixed-nozzle solid motors.', doc: 'thrust', tex: 'L_A=\\frac{\\rho SC_{L\\alpha}T\\sqrt{\\ell^2\\delta_T^2+\\Omega^2}}{2I_p(\\lambda_P^2-\\lambda_R^2)}' } },
        { id: 'Om', label: 'Thrust offset from the centre of mass', sym: '\\Omega', ...LEN, default: 0.015, min: 0, max: 1, slider: { min: 0, max: 0.1, step: 0.0005 },
          info: { text: ['One component of the sideways offset of the centre of mass from the thrust line (one sigma).', 'Comes from asymmetric parts and a motor not on the centre line.', 'It adds to the angle term as $\\sqrt{\\ell^2\\delta_T^2+\\Omega^2}$.'], tex: '\\sqrt{\\ell^2\\delta_T^2+\\Omega^2}', range: 'A few hundredths of an inch to a few millimetres.', doc: 'thrust' } },
        { id: 'sG', label: 'Gust speed (planar, one sigma)', sym: '\\sigma_G', dim: 'speed', internal: 'fts', default: 3.3, min: 0, max: 100, slider: { min: 0, max: 30, step: 0.1 },
          info: { text: ['Standard deviation of one horizontal component of the gust velocity near the ground.', 'Turbulence, not the mean wind: about a third of the mean wind on a gusty day.', 'The gust part of the dispersion grows in proportion.'], range: '1–3 m/s.', doc: 'gust', tex: '\\alpha_G=\\sigma_G\\,\\lambda_P\\sqrt{\\frac{\\lambda_G}{2a(\\lambda_P^2+\\lambda_G^2)}}' } },
        { id: 'lG', label: 'Gust correlation wave number', sym: '\\lambda_G', ...WAVE, default: 0.0016949, min: 1e-9, max: 1, slider: { min: 0.0002, max: 0.01, step: 0.0001 },
          info: { text: ['Pseudo correlation wave number of the gust field: about one over the size of a typical gust.', 'Ammons and Hoult suggest about 1/590 ft.', 'It sets how much of the gust energy the rocket responds to.'], range: 'About 1/590 ft (Ammons & Hoult).', doc: 'gust', tex: '\\alpha_G=\\sigma_G\\,\\lambda_P\\sqrt{\\frac{\\lambda_G}{2a(\\lambda_P^2+\\lambda_G^2)}}' } },
      ],
    },
    {
      id: 'flight', title: 'Spin and launch',
      fields: [
        { id: 'rollWave', label: 'Roll wavelength', sym: '\\Lambda_R', ...DIST, default: 1000, min: 1e-6, max: 1e5, slider: { min: 100, max: 5000, step: 10 },
          info: { text: ['Altitude climbed per roll revolution: $2\\pi$ over the roll wave number (from the Fin Cant page).', 'Hoult found about 1000 ft close to optimum over a broad range of pitch wave numbers; whole roll cycles during boost cancel the misalignment turn.', 'Too short a wavelength (fast roll) approaches pitch resonance; the verdict then shows lock-in.'], tex: '\\lambda_R=\\frac{2\\pi}{\\Lambda_R}', range: '500–2000 ft (150–600 m).', doc: 'roll' } },
        { id: 'lP', label: 'Pitch wave number', sym: '\\lambda_P', ...WAVE, default: 0.022, min: 1e-9, max: 10, slider: { min: 0.002, max: 0.1, step: 0.0005 },
          info: { text: ['Static stability per unit path length, from the Pitch-Yaw Wave Number page.', 'It grows with the square root of the static margin.', 'More stability sharply cuts the misalignment lift near roll resonance: the verdict gives the pitch wave number that meets your limit.'], tex: '\\lambda_P^2=\\frac{\\rho SC_{L\\alpha}\\,\\text{margin}}{2I_p}', range: '0.01–0.05 per ft.', doc: 'thrust' } },
        { id: 'L', label: 'Launcher length', sym: 'L', ...DIST, default: 40, min: 1e-6, max: 1000, slider: { min: 5, max: 100, step: 0.5 },
          info: { text: ['Effective rail length: the altitude at which the rocket is released.', 'Off a longer rail the rocket is faster, so the same lift turns it less.', 'The verdict gives the launcher length that meets your limit, if one does.'], tex: '\\gamma_0=\\gamma\\,(h_b/L)^{-g/2a}', range: '6–20 ft (2–6 m) amateur; 40 ft and more for sounding rockets.', doc: 'thrust' } },
        { id: 'hb', label: 'Burnout altitude', sym: 'h_b', ...ALT, default: 2000, min: 1e-6, max: 3e5, slider: { min: 200, max: 20000, step: 10 },
          info: { text: ['Altitude where the motor burns out: from a trajectory simulation.', 'Nearly all of the dispersion has built up by then.', 'Below the launcher top it is taken just above it, with a note.'], range: 'A few hundred metres to a few kilometres.', doc: 'launcher', tex: '\\gamma_0=\\gamma\\,(h_b/L)^{-g/2a}' } },
      ],
    },
    {
      id: 'limits', title: 'Your limits',
      fields: [
        { id: 'gMax', label: 'Largest equivalent launcher error', sym: '\\gamma_{max}', ...ANG, default: 0.017453292519943295, min: 1e-5, max: 0.5, slider: { min: 0.001, max: 0.07, step: 0.0005 },
          info: { text: ['The largest one-sigma launcher-equivalent error you accept, per axis.', 'Set it from your range: feed trial values to the Trajectory Simulation and see how far the impact moves; 1° is this site’s default, not a published limit.', 'The verdict compares $\\gamma_0$ with it (up to 1.25× is marginal) and solves the fixes to meet it.'], range: 'About 0.5–2°; Hoult’s example gives about 0.5–1.5° (0.01–0.025 rad).', doc: 'verdict', tex: '\\gamma_0\\le\\gamma_{max}' } },
      ],
    },
  ],
  results: [
    { id: 'g0', label: 'Equivalent launcher angle error', sym: '\\gamma_0', ...ANG, key: true, digits: 3, status: (x, out) => ST[out.lv], note: (x, out, v) => `one sigma per axis · you accept ${A(v.gMax)}`,
      info: { text: ['The launcher pointing error that would throw the rocket off course as much as the misalignment and gusts do, per axis (one sigma).', 'The burnout tilt mapped back to the rail with the growth law $(h/L)^{g/2a}$ (Hoult).', 'Use it as the launcher error of a trajectory run; the verdict compares it with your limit.'], tex: '\\gamma_0=\\gamma\\,(h_b/L)^{-g/2a}', doc: 'launcher' } },
    { id: 'gam', label: 'Velocity tilt at burnout', sym: '\\gamma', ...ANG, key: true, digits: 3, status: (x, out) => ST[out.lv], note: (x, out) => !out.o ? '' : `${fmt(100 * out.o.gD ** 2 / Math.max(x * x, 1e-300), { digits: 2 })}% of the variance from thrust misalignment`,
      info: { text: ['How far the velocity vector is tilted at burnout, one sigma per axis.', 'The thrust-misalignment and gust parts added as independent errors.', 'Most of it builds up just off the rail, while the rocket is still slow.'], tex: '\\gamma=\\sqrt{\\gamma_D^2+\\gamma_G^2}', doc: 'launcher' } },
    { id: 'gD', label: 'Thrust misalignment part', sym: '\\gamma_D', ...ANG, digits: 3, note: (x, out) => (out.o ? `without roll it would be ${A(out.o.gT)}` : ''),
      info: { text: 'Dispersive flight path angle: the turn by the misalignment lift, summed as north and east components while the rocket rolls.', tex: '\\gamma_D=\\sqrt{E^2+N^2}', doc: 'roll' } },
    { id: 'bestRoll', label: 'Best roll wavelength', sym: '\\Lambda_{R,best}', ...DIST, key: true, digits: 3, status: (x, out) => (typeof x === 'number' && out.bestG0 < 0.97 * out.o.g0 ? 'warn' : 'ok'), note: (x, out) => (typeof x === 'number' ? `γ₀ ${A(out.bestG0)} there` : ''),
      info: { text: ['The roll wavelength that gives the smallest launcher-equivalent error for this rocket, scanning 0.3–3 roll cycles to burnout.', 'Whole roll cycles during boost cancel the misalignment turn.', 'Set the fin cant to give it on the Fin Cant page.'], tex: '\\Lambda_R=\\frac{2\\pi}{\\lambda_R}', doc: 'roll' } },
    { id: 'gG', label: 'Gust part', sym: '\\gamma_G', ...ANG, digits: 3, info: { text: ['The part of the burnout tilt caused by gusts.'], tex: '\\gamma_G=K\\left[\\frac{h_b}{L}-\\left(\\frac{h_b}{L}\\right)^{g/2a}\\right]', doc: 'gust' } },
    { id: 'LA', label: 'Misalignment lift force', sym: 'L_A', dim: 'force', internal: 'lbf', digits: 4, info: { text: ['The sideways (lift) force from the steady angle of attack that the misaligned thrust holds the rocket at.'], tex: 'L_A=\\frac{\\rho SC_{L\\alpha}T\\sqrt{\\ell^2\\delta_T^2+\\Omega^2}}{2I_p(\\lambda_P^2-\\lambda_R^2)}', doc: 'thrust' } },
    { id: 'alphaG', label: 'Gust angle of attack (one sigma)', sym: '\\alpha_G', ...ANG, digits: 3, info: { text: ['The angle of attack the gusts cause, one sigma.'], tex: '\\alpha_G=\\sigma_G\\,\\lambda_P\\sqrt{\\frac{\\lambda_G}{2a(\\lambda_P^2+\\lambda_G^2)}}', doc: 'gust' } },
    { id: 'a', label: 'Boost acceleration', sym: 'a', dim: 'accel', internal: 'fts2', digits: 4, note: (x) => `${fmt(x / G, { digits: 3 })} g`, info: { text: ['The acceleration along the path during boost, drag left out.'], tex: 'a=\\frac{T}{m}-g', doc: 'thrust' } },
    { id: 'n', label: 'Exponent g/2a', sym: 'g/2a', ...NONE, digits: 3, info: { text: 'Small values mean the velocity vector stops turning soon after the rail.', doc: 'thrust' } },
  ],
  compute(v0) {
    for (const k of ['m', 'I', 'T', 'S', 'CLa', 'rho', 'lG', 'rollWave', 'lP', 'L', 'hb']) if (!(v0[k] > 0)) throw new InputError('Mass, inertia, thrust, area, lift slope, density, wave numbers, wavelength and altitudes must be positive.');
    const v = { ...v0 }, warnings = [];
    if (!(v.hb > 1.05 * v.L)) { v.hb = 1.05 * v.L; warnings.push({ level: 'warn', text: 'The burnout altitude is at or below the end of the launcher; it is taken just above it.', fix: 'Enter the burnout altitude from a trajectory simulation.' }); }
    const p = P(v), lR = (2 * Math.PI) / v.rollWave, Dl = (x) => `${fmt(toDisplay(x, DIST), { digits: 3 })} ${unitLabel(displayUnit(DIST))}`;
    const blocked = (title, text, fixes) => ({ results: Object.fromEntries(DEF.results.map((r) => [r.id, '—'])), warnings: [...warnings, { level: 'err', text: title + '.', fix: fixes[0]?.replace(/<\/?b>/g, '') }], verdict: { level: 'unsafe', title, text, fixes }, lv: 'unsafe', blocked: true, v });
    if (!(p.a > G / 2)) return blocked('Too slow off the rail for this model', `The thrust is ${fmt(v.T / (v.m * G), { digits: 3 })}× the weight; the model needs more than 1.5× (boost acceleration above g/2), and a rocket that slow is turned mostly by gravity.`,
      [`Use a motor with at least <b>${fmt(toDisplay(1.5 * v.m * G, { dim: 'force', internal: 'lbf' }), { digits: 3 })} ${unitLabel(displayUnit({ dim: 'force' }))}</b> average thrust (now ${fmt(toDisplay(v.T, { dim: 'force', internal: 'lbf' }), { digits: 3 })}) — aim for 5× the weight or more.`]);
    if (!(lR < LOCK * v.lP)) return blocked('Rolling at the pitch frequency: roll lock-in', `The roll wave number is ${fmt((100 * lR) / v.lP, { digits: 3 })} % of the pitch wave number. At resonance the misalignment lift grows without limit and the rocket can lock in; this steady-state model has no answer.`,
      [`Lengthen the roll wavelength to at least <b>${Dl((2 * Math.PI) / (0.7 * v.lP))}</b> (now ${Dl(v.rollWave)}) with less fin cant, or`, `add static margin: a pitch wave number above <b>${fmt(toDisplay(lR / 0.7, WAVE), { digits: 3 })} ${unitLabel(displayUnit(WAVE))}</b>.`]);
    const o = dispersion(p), r = o.g0 / v.gMax, lv = r <= 1 ? 'safe' : r <= MARGIN ? 'marginal' : 'unsafe';
    // best roll wavelength: scan 0.3–3 roll cycles to burnout, staying clear of lock-in
    let bestRoll = null, bestG0 = Infinity;
    for (let i = 0; i <= 270; i++) { const rw = v.hb / (0.3 + i / 100); if ((2 * Math.PI) / rw >= 0.9 * v.lP) continue; const g = g0Of(v, { rollWave: rw }); if (g < bestG0) { bestG0 = g; bestRoll = rw; } }
    // fixes: each solved on the real model by bisection (γ₀ rises with δ_T, falls with λ_P and with L)
    const fixes = [], fix = {};
    if (lv !== 'safe') {
      const tgt = v.gMax;
      fix.dT = g0Of(v, { dT: 0, Om: 0 }) < tgt ? solve((d) => g0Of(v, { dT: d, Om: v.Om * (d / Math.max(v.dT, 1e-12)) }) - tgt, 0, Math.max(v.dT, 1e-9)) : null;
      fix.lP = solve((l) => g0Of(v, { lP: l }) - tgt, v.lP, 30 * v.lP);
      fix.L = solve((l) => g0Of(v, { L: l, hb: Math.max(v.hb, 1.05 * l) }) - tgt, v.L, v.hb / 1.05);
      if (fix.dT != null) fixes.push(`Align the motor to a misalignment of <b>${A(fix.dT)}</b> or better (now ${A(v.dT)}; offset scaled with it), or`);
      if (fix.lP != null) fixes.push(`add static margin: a pitch wave number of <b>${fmt(toDisplay(fix.lP, WAVE), { digits: 3 })} ${unitLabel(displayUnit(WAVE))}</b> (now ${fmt(toDisplay(v.lP, WAVE), { digits: 3 })}), or`);
      if (fix.L != null && fix.L <= 3 * v.L) fixes.push(`launch from a <b>${Dl(fix.L)}</b> rail (now ${Dl(v.L)}), or`);
      if (bestRoll && bestG0 < 0.97 * o.g0) fixes.push(`roll at a wavelength of <b>${Dl(bestRoll)}</b> (now ${Dl(v.rollWave)}): γ₀ drops to ${A(bestG0)}.`);
      if (!fixes.length) fixes.push(`The gusts alone give ${A(dispersion(P({ ...v, dT: 0, Om: 0 })).g0)}: launch in calmer air or accept a larger error.`);
      fixes[fixes.length - 1] = fixes[fixes.length - 1].replace(/, or$/, '.');
      fixes[0] = fixes[0][0].toUpperCase() + fixes[0].slice(1);
    }
    const share = (100 * o.gD ** 2) / Math.max(o.gam ** 2, 1e-300);
    const verdict = {
      level: lv,
      title: lv === 'safe' ? 'Dispersion within your limit' : lv === 'marginal' ? 'Dispersion slightly above your limit' : 'Dispersion well above your limit',
      text: `The rocket leaves as if the launcher were off by <b>${A(o.g0)}</b> (one sigma, per axis); you accept <b>${A(v.gMax)}</b>. ${fmt(share, { digits: 2 })} % of it comes from thrust misalignment, the rest from gusts.`,
      fixes,
    };
    if (lR > 0.7 * v.lP) warnings.push({ level: 'warn', text: `The roll wave number is ${fmt((100 * lR) / v.lP, { digits: 2 })}% of the pitch wave number: near resonance the misalignment lift grows as 1/(λ_P² − λ_R²).`, fix: 'Spin slower or add static margin.' });
    if (o.n > 0.25) warnings.push({ level: 'info', text: 'Low acceleration (g/2a above 0.25): gravity keeps turning the trajectory long after the rail, so the burnout values depend strongly on the burnout altitude.' });
    if (lv !== 'safe') warnings.push({ level: lv === 'unsafe' ? 'err' : 'warn', text: `The equivalent launcher error ${A(o.g0)} is above the ${A(v.gMax)} you accept.`, fix: 'See the verdict for the misalignment, static margin, rail or roll that meets it.' });
    return { results: { g0: o.g0, gam: o.gam, gD: o.gD, gG: o.gG, bestRoll: bestRoll ?? '—', LA: o.LA, alphaG: o.alphaG, a: p.a, n: o.n }, warnings, verdict, lv, bestG0, fix, o, v };
  },
  plots: [
    {
      id: 'history', title: 'Velocity tilt during boost',
      info: { text: ['Flight path angle dispersion (one sigma) against altitude, if burnout came there. The equivalent launcher angle is the curve to read at burnout.', 'The red line is your limit: most of the tilt builds up just off the rail.'], doc: 'launcher' },
      build(v0, out, { U }) {
        if (out.blocked) return null;
        const v = out.v;
        const ua = U(ALT), ug = U(ANG), H = out.o.hist, ser = (k) => H.map((r) => [ua.v(r.h), ug.v(r[k])]);
        return { x: { label: 'Altitude $h$', unit: ua.label }, y: { label: 'Angle (one sigma)', unit: ug.label }, includeZero: true,
          series: [
            { name: 'γ₀ launcher', points: ser('g0'), smooth: true, width: 2.4 },
            { name: 'γ total', points: ser('gam'), smooth: true },
            { name: 'γ_D thrust', points: ser('gD'), smooth: true, dashed: true },
            { name: 'γ_G gusts', points: ser('gG'), smooth: true, dashed: true },
          ], hlines: [{ y: ug.v(v.gMax), label: 'your limit', color: 'var(--danger)' }] };
      },
    },
    {
      id: 'hodograph', title: 'Velocity tilt seen from above', explore: true,
      info: { text: 'Path of the velocity-vector tilt from the misalignment lift in east (E) and north (N) components, as the roll spins the lift around (memo Fig. 2). Its distance from the origin is γ_D.', doc: 'roll' },
      build(v0, out, { U }) {
        if (out.blocked) return null;
        const v = out.v;
        const ug = U(ANG), H = out.o.hist, end = H[H.length - 1];
        return { x: { label: 'East component $E$', unit: ug.label }, y: { label: 'North component $N$', unit: ug.label }, includeZero: true,
          series: [{ name: 'E, N', points: H.map((r) => [ug.v(r.E), ug.v(r.N)]), smooth: true }],
          markers: [{ x: ug.v(end.E), y: ug.v(end.N), label: 'burnout' }] };
      },
    },
    {
      id: 'roll', title: 'Effect of roll wavelength', explore: true,
      info: { text: 'Equivalent launcher angle against burnout altitude / roll wavelength (memo Fig. 3). Whole numbers of roll cycles during boost cancel the misalignment turn best; a single cycle is usually the minimum.', doc: 'roll' },
      build(v0, out, { U }) {
        if (out.blocked) return null;
        const v = out.v;
        const ug = U(ANG), p = P(v), pts = [];
        for (let i = 0; i <= 60; i++) {
          const x = 0.05 + (2.95 * i) / 60, rollWave = v.hb / x;
          if ((2 * Math.PI) / rollWave < 0.95 * v.lP) pts.push([x, ug.v(dispersion({ ...p, rollWave }).g0)]);
        }
        if (pts.length < 2) return null;
        return { x: { label: 'Burnout altitude / roll wavelength $h_b/\\Lambda_R$', unit: '' }, y: { label: 'Equivalent launcher angle $\\gamma_0$', unit: ug.label }, includeZero: true,
          series: [{ name: '\\gamma_0', points: pts, smooth: true }], hlines: [{ y: ug.v(v.gMax), label: 'your limit', color: 'var(--danger)' }], markers: [{ x: v.hb / v.rollWave, y: ug.v(out.results.g0), label: 'your rocket' }] };
      },
    },
    {
      id: 'pitch', title: 'Effect of static margin',
      info: { text: 'Equivalent launcher angle against pitch wave number. Close to the roll wave number the misalignment lift soars; a little more static margin moves the design past the knee.', doc: 'thrust' },
      build(v0, out, { U }) {
        if (out.blocked) return null;
        const v = out.v;
        const ug = U(ANG), uw = U(WAVE), p = P(v), lR = (2 * Math.PI) / v.rollWave, lo = 1.3 * lR, hi = Math.max(3 * v.lP, 4 * lR), pts = [];
        for (let i = 0; i <= 60; i++) { const lP = lo + ((hi - lo) * i) / 60; pts.push([uw.v(lP), ug.v(dispersion({ ...p, lP }).g0)]); }
        return { x: { label: 'Pitch wave number $\\lambda_P$', unit: uw.label }, y: { label: 'Equivalent launcher angle $\\gamma_0$', unit: ug.label }, includeZero: true,
          series: [{ name: '\\gamma_0', points: pts, smooth: true }], vlines: [{ x: uw.v(lR), label: 'λ_R', color: 'var(--text-3)' }],
          hlines: [{ y: ug.v(v.gMax), label: 'your limit', color: 'var(--danger)' }], markers: [{ x: uw.v(v.lP), y: ug.v(out.results.g0), label: 'your rocket' }] };
      },
    },
  ],
  schematicTitle: 'Leaving the rail, and the tilt seen from above',
  schematicHint: 'Left: the rocket leaves the rail with a misaligned thrust and is turned by the lift and gusts (angles exaggerated). Right: the tip of the velocity tilt spirals as the rocket rolls; the dashed circle is the one-sigma total tilt at burnout',
  schematic(ctx, v0, out) {
    const v = out.v, W = 760, H = 340;
    if (out.blocked) {
      const fr = ctx.frame({ width: W, height: H, label: 'No steady dispersion for these inputs' }), g = fr.layer('main'); g.replaceChildren();
      g.append(text(W / 2, H / 2 - 8, out.verdict.title, { anchor: 'middle', size: 14 }));
      g.append(text(W / 2, H / 2 + 16, 'see the verdict for the roll wavelength, static margin or thrust that fixes it', { anchor: 'middle', size: 11, cls: 'sc-dim-text' }));
      return;
    }
    const o = out.o;
    const fr = ctx.frame({ width: W, height: H, label: 'Rocket leaving the launcher, and the velocity tilt seen from above' });
    const g = fr.layer('main'); g.replaceChildren();
    // left: side view
    const gy = 308, rx = 150, rTop = 224;
    g.append(s('line', { x1: 20, y1: gy, x2: 330, y2: gy, class: 'sc-thin' }));
    for (let x = 26; x < 330; x += 12) g.append(s('line', { x1: x, y1: gy, x2: x - 7, y2: gy + 7, class: 'sc-thin' }));
    g.append(s('rect', { x: rx - 3, y: rTop, width: 6, height: gy - rTop, class: 'sc-body-2', 'data-field': 'L' }));
    g.append(text(rx - 10, (gy + rTop) / 2, `L = ${fmt(toDisplay(v.L, DIST), { digits: 3 })} ${unitLabel(displayUnit(DIST))}`, { anchor: 'end', size: 10.5, field: 'L' }));
    // trajectory: vertical along the rail, then curving off (exaggerated)
    const tilt = 14 * Math.PI / 180, traj = [];
    for (let i = 0; i <= 30; i++) { const t = i / 30, h = 200 * t; traj.push([rx + 6 + 200 * Math.sin(tilt) * t ** 1.6, rTop - h]); }
    g.append(s('path', { d: path(traj), class: 'sc-thin', 'stroke-dasharray': '5 4' }));
    // rocket just off the rail, axis at the misalignment angle of attack (exaggerated)
    const cx = rx + 18, cy = rTop - 80, ax = -tilt * 0.7 * 180 / Math.PI, len = 96, r = 9;
    const rk = s('g', { transform: `rotate(${-ax} ${cx} ${cy})`, 'data-field': 'm I T S CLa' });
    rk.append(s('path', { d: `M${cx},${cy - len / 2}Q${cx + r},${cy - len / 2 + 14} ${cx + r},${cy - len / 2 + 26}V${cy + len / 2}H${cx - r}V${cy - len / 2 + 26}Q${cx - r},${cy - len / 2 + 14} ${cx},${cy - len / 2}Z`, class: 'sc-body' }));
    rk.append(s('path', { d: `M${cx + r},${cy + len / 2 - 22}L${cx + r + 12},${cy + len / 2 + 2}H${cx + r}ZM${cx - r},${cy + len / 2 - 22}L${cx - r - 12},${cy + len / 2 + 2}H${cx - r}Z`, class: 'sc-body-2' }));
    // misaligned thrust at the nozzle
    rk.append(s('line', { x1: cx, y1: cy + len / 2 + 4, x2: cx - 8, y2: cy + len / 2 + 34, class: 'sc-accent', 'marker-start': fr.arrow('acc'), 'data-field': 'dT Om arm' }));
    rk.append(s('line', { x1: cx, y1: cy + len / 2, x2: cx, y2: cy + len / 2 + 34, class: 'sc-axis' }));
    g.append(rk);
    g.append(text(cx + 22, cy + len / 2 + 26, `δ_T = ${A(v.dT)}`, { size: 10.5, field: 'dT' }));
    // velocity vector and its tilt γ from the vertical
    const vx = cx + 18, vy = cy - 64, vl = 58;
    g.append(s('line', { x1: vx, y1: vy, x2: vx, y2: vy - vl - 6, class: 'sc-axis' }));
    g.append(s('line', { x1: vx, y1: vy, x2: vx + vl * Math.sin(tilt), y2: vy - vl * Math.cos(tilt), class: 'sc-accent2', 'marker-end': fr.arrow() }));
    g.append(s('path', { d: `M${vx},${vy - 40}A40,40 0 0 1 ${vx + 40 * Math.sin(tilt)},${vy - 40 * Math.cos(tilt)}`, class: 'sc-thin' }));
    g.append(text(vx + 26, vy - 26, `γ = ${A(out.results.gam)}`, { size: 11 }));
    // gusts
    for (const yy of [cy - 18, cy + 8]) g.append(s('line', { x1: 250, y1: yy, x2: 214, y2: yy, class: 'sc-thin', 'marker-end': fr.arrow(), 'data-field': 'sG' }));
    g.append(text(254, cy - 2, `σ_G = ${fmt(toDisplay(v.sG, { dim: 'speed', internal: 'fts' }), { digits: 3 })} ${unitLabel(displayUnit({ dim: 'speed' }))}`, { size: 10.5, field: 'sG' }));
    g.append(text(20, H - 8, 'side view · angles exaggerated', { size: 10, cls: 'sc-dim-text' }));
    // right: top view of the tilt (E, N)
    const ox = 560, oy = 165, R = 120, Hs = o.hist, ext = Math.max(o.gam, ...Hs.map((q) => Math.hypot(q.E, q.N))) || 1, k = (0.92 * R) / ext;
    g.append(s('line', { x1: ox - R - 10, y1: oy, x2: ox + R + 10, y2: oy, class: 'sc-thin', 'marker-end': fr.arrow() }));
    g.append(s('line', { x1: ox, y1: oy + R + 10, x2: ox, y2: oy - R - 10, class: 'sc-thin', 'marker-end': fr.arrow() }));
    g.append(text(ox + R + 14, oy + 4, 'E', { size: 12 })); g.append(text(ox - 4, oy - R - 16, 'N', { size: 12 }));
    g.append(s('circle', { cx: ox, cy: oy, r: o.gam * k, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.3, 'stroke-dasharray': '6 4' }));
    // your limit as an equivalent-launcher circle mapped to burnout tilt: γ_max (h_b/L)^n, in the verdict colour
    const rl = Math.min(R + 8, v.gMax * Math.pow(v.hb / v.L, o.n) * k);
    g.append(s('circle', { cx: ox, cy: oy, r: rl, fill: COL[out.lv], 'fill-opacity': 0.08, stroke: 'var(--danger)', 'stroke-width': 1.2, 'data-field': 'gMax' }));
    g.append(text(ox - rl * 0.71 - 4, oy - rl * 0.71 - 4, 'your limit', { anchor: 'end', size: 10, cls: 'sc-dim-text', field: 'gMax' }));
    g.append(text(ox + o.gam * k * 0.71 + 6, oy + o.gam * k * 0.71 + 14, `1σ total γ = ${A(o.gam)}`, { size: 10.5 }));
    g.append(s('path', { d: path(Hs.map((q) => [ox + q.E * k, oy - q.N * k])), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2, 'data-field': 'rollWave' }));
    g.append(s('line', { x1: ox, y1: oy, x2: ox + o.E * k, y2: oy - o.N * k, class: 'sc-accent', 'marker-end': fr.arrow('acc') }));
    const th = Math.atan2(o.N, o.E), mx = ox + (o.E * k) / 2 - 14 * Math.sin(th), my = oy - (o.N * k) / 2 - 14 * Math.cos(th);
    g.append(text(mx, my + 4, `γ_D = ${A(o.gD)}`, { size: 11, anchor: Math.sin(th) >= 0 ? 'end' : 'start' }));
    g.append(text(ox, H - 8, `top view · ${fmt(v.hb / v.rollWave, { digits: 3 })} roll cycles to burnout`, { anchor: 'middle', size: 10, cls: 'sc-dim-text' }));
    // drag the rail top to change the launcher length (the rail drawing is schematic: 84 px stands for L)
    ctx.handle('L', rx, rTop, { field: 'L', title: 'Drag up or down to change the launcher length',
      onDrag: (sx, sy) => ctx.setValue('L', Math.max(1, Math.min(0.9 * v.hb, (v.L * (gy - sy)) / (gy - rTop))), { round: 0.5 }),
      onKey: (dx, dy) => ctx.setValue('L', Math.max(1, v.L * (1 + 0.05 * (dy || dx)))) });
  },
  symbols: {
    a: 'boost acceleration along the path (m/s² or ft/s²)', T: 'thrust (N or lbf)', m: 'rocket mass (kg or slug)', g: 'acceleration due to gravity (9.81 m/s²)', n: 'exponent $g/2a$', '\\lambda_R': 'roll wave number, $2\\pi/\\Lambda_R$ (per m or per ft)', '\\Lambda_R': 'roll wavelength: altitude per roll turn (m or ft)',
    L_A: 'lift from the misalignment angle of attack (N or lbf)', '\\rho': 'air density (kg/m³ or slug/ft³)', S: 'reference area (m² or ft²)', 'C_{L\\alpha}': 'lift-curve slope (per radian)', '\\ell': 'nozzle throat to centre of mass (m or ft)', '\\delta_T': 'thrust misalignment angle (°)',
    '\\Omega': 'thrust offset from the centre of mass (m or ft)', I_p: 'pitch moment of inertia (kg·m² or slug·ft²)', '\\lambda_P': 'pitch wave number (per m or per ft)', '\\gamma_T': 'flight path angle from the misalignment lift without roll', h_b: 'burnout altitude (m or ft)', h: 'altitude', L: 'launcher length (m or ft)',
    '\\gamma_D': 'tilt from thrust misalignment (°)', E: 'east component of the flight path angle', N: 'north component of the flight path angle', '\\phi': 'roll angle',
    '\\alpha_G': 'gust angle of attack, one sigma (°)', '\\sigma_G': 'planar gust speed, one sigma (m/s or ft/s)', '\\lambda_G': 'gust correlation wave number (per m or per ft)', K: 'gust response factor', '\\gamma_G': 'tilt from gusts (°)',
    '\\gamma': 'velocity tilt at burnout, one sigma (°)', '\\gamma_0': 'equivalent launcher angle error (°)', 'g/2a': 'exponent',
    '\\gamma_{max}': 'largest launcher-equivalent error you accept (°)',
    '\\Lambda_{R,best}': 'best roll wavelength (m or ft)',
  },
  report(v0, out, R) {
    if (out.blocked) return [];
    const v = out.v;
    const o = out.o, p = P(v), n = R.n, Ang = (x) => R.Q(x, ANG), Wv = (x) => R.v(x, WAVE);
    const steps = [
      { label: 'Boost acceleration (drag neglected) and the exponent', lhs: 'a', eq: 'T/m-g', res: R.Q(p.a, { dim: 'accel', internal: 'fts2' }) },
      { lhs: 'n', eq: 'g/(2a)', res: n(o.n) },
      { label: 'Roll wave number', lhs: '\\lambda_R', eq: '2\\pi/\\Lambda_R', sub: `2\\pi/${R.v(v.rollWave, DIST)}`, res: R.Q(o.lR, WAVE) },
      { label: 'Lift from the steady misalignment angle of attack (eq. 2)', lhs: 'L_A', eq: '\\frac{\\rho\\,S\\,C_{L\\alpha}\\,T\\sqrt{\\ell^2\\delta_T^2+\\Omega^2}}{2I_p(\\lambda_P^2-\\lambda_R^2)}',
        sub: `\\frac{${R.v(v.rho, { dim: 'density', internal: 'slugft3' })}\\times${R.v(v.S, { dim: 'area', internal: 'ft2' })}\\times${n(v.CLa)}\\times${R.v(v.T, { dim: 'force', internal: 'lbf' })}\\times${R.v(Math.hypot(v.arm * v.dT, v.Om), LEN)}}{2\\times${R.v(v.I, { dim: 'inertia', internal: 'slugft2' })}\\,(${Wv(v.lP)}^2-${Wv(o.lR)}^2)}`, res: R.Q(o.LA, { dim: 'force', internal: 'lbf' }) },
      { label: 'Flight path angle it would cause without roll (eq. 4)', lhs: '\\gamma_T', eq: '\\frac{L_A}{m\\,g}\\left[\\left(\\frac{h_b}{L}\\right)^n-1\\right]', res: Ang(o.gT) },
      { label: 'With roll angle φ = λ_R(h − L), the turn summed as east and north components (eqs. 5, 6)', lhs: '\\gamma_D', eq: '\\sqrt{E^2+N^2},\\ \\ E=\\int\\cos\\phi\\,d\\gamma_T,\\ N=\\int\\sin\\phi\\,d\\gamma_T', res: Ang(o.gD) },
      { label: 'Gust angle of attack and response factor (eqs. 15, 7)', lhs: '\\alpha_G', eq: '\\sigma_G\\,\\lambda_P\\sqrt{\\frac{\\lambda_G}{2a(\\lambda_P^2+\\lambda_G^2)}}', res: Ang(o.alphaG) },
      { lhs: 'K', eq: '\\frac{\\rho\\,S\\,L\\,C_{L\\alpha}\\,a\\,\\alpha_G}{m(2a-g)}', res: n(o.K) },
      { lhs: '\\gamma_G', eq: 'K\\left[\\frac{h_b}{L}-\\left(\\frac{h_b}{L}\\right)^n\\right]', res: Ang(o.gG) },
      { label: 'Independent errors combined (eq. 8)', lhs: '\\gamma', eq: '\\sqrt{\\gamma_D^2+\\gamma_G^2}', res: Ang(o.gam) },
      { label: 'Equivalent launcher angle (eq. 10)', lhs: '\\gamma_0', eq: '\\gamma\\,(h_b/L)^{-n}', sub: `${R.v(o.gam, ANG)}\\times(${R.v(v.hb, ALT)}/${R.v(v.L, DIST)})^{-${n(o.n)}}`, res: Ang(o.g0) },
    ];
    return [{
      title: 'Theory',
      text: 'Thrust misalignment holds a steady angle of attack whose lift $L_A$ turns the velocity vector: $h\\,d\\gamma_T/dh=(g/2a)\\gamma_T+L_A/(2ma)$ with $\\gamma_T(L)=0$. Roll spins the lift around, so the turn is resolved into east and north components and summed in altitude steps; gusts add a planar standard deviation. Without lift, a launcher error $\\gamma_0$ grows as $\\gamma_0(h/L)^{g/2a}$, which maps the burnout tilt back to the launcher (Hoult).',
      steps,
    }];
  },
  references: ['flt-path-angl-dispersions', 'thrust-misalignment', 'standardized-perturbation-values-orig', 'theory-behind-dispersion'],
  examples: [{ name: 'DISPERSION field-tool rocket (550 lbf, 1000 ft roll wavelength)', values: { m: 1.95, I: 12.235, T: 550, S: 0.19635, CLa: 6.56325, rho: 0.002378, arm: 4.2, dT: 0.002, Om: 0.015, sG: 3.3, lG: 0.0016949, rollWave: 1000, lP: 0.022, L: 40, hb: 2000 } }],
};
export default DEF;
