// Unit system. Every quantity is converted through SI:
//   display value --(unit.toSI)--> SI --(internal.fromSI)--> value the calc module expects.
// Calc modules declare their internal unit per field, so empirical English-unit correlations
// can be evaluated in the units they were published in.
import { storage } from './util.js';

const lin = (k) => ({ toSI: (v) => v * k, fromSI: (v) => v / k });
const FT = 0.3048, IN = 0.0254, LBF = 4.4482216152605, LBM = 0.45359237, SLUG = 14.593902937206364;

export const UNITS = {
  // length
  m: { label: 'm', ...lin(1) }, mm: { label: 'mm', ...lin(1e-3) }, cm: { label: 'cm', ...lin(1e-2) }, km: { label: 'km', ...lin(1e3) },
  in: { label: 'in', ...lin(IN) }, ft: { label: 'ft', ...lin(FT) },
  // area / volume
  m2: { label: 'm²', ...lin(1) }, cm2: { label: 'cm²', ...lin(1e-4) }, mm2: { label: 'mm²', ...lin(1e-6) },
  in2: { label: 'in²', ...lin(IN * IN) }, ft2: { label: 'ft²', ...lin(FT * FT) },
  m3: { label: 'm³', ...lin(1) }, cm3: { label: 'cm³', ...lin(1e-6) }, in3: { label: 'in³', ...lin(IN ** 3) }, ft3: { label: 'ft³', ...lin(FT ** 3) },
  // pressure / stress
  Pa: { label: 'Pa', ...lin(1) }, kPa: { label: 'kPa', ...lin(1e3) }, MPa: { label: 'MPa', ...lin(1e6) }, GPa: { label: 'GPa', ...lin(1e9) },
  psf: { label: 'lbf/ft²', ...lin(LBF / (FT * FT)) }, psi: { label: 'psi', ...lin(LBF / (IN * IN)) }, Mpsi: { label: 'Mpsi', ...lin(1e6 * LBF / (IN * IN)) },
  // density
  kgm3: { label: 'kg/m³', ...lin(1) }, slugft3: { label: 'slug/ft³', ...lin(SLUG / FT ** 3) },
  gcm3: { label: 'g/cm³', ...lin(1000) }, lbin3: { label: 'lb/in³', ...lin(LBM / IN ** 3) }, lbft3: { label: 'lb/ft³', ...lin(LBM / FT ** 3) },
  // speed / acceleration / rates
  ms: { label: 'm/s', ...lin(1) }, fts: { label: 'ft/s', ...lin(FT) }, kmh: { label: 'km/h', ...lin(1 / 3.6) },
  ms2: { label: 'm/s²', ...lin(1) }, fts2: { label: 'ft/s²', ...lin(FT) },
  rads: { label: 'rad/s', ...lin(1) }, hz: { label: 'Hz', ...lin(1) }, rpm: { label: 'rpm', ...lin(1 / 60) },
  // temperature (absolute)
  K: { label: 'K', ...lin(1) }, R: { label: '°R', ...lin(5 / 9) },
  degC: { label: '°C', toSI: (v) => v + 273.15, fromSI: (v) => v - 273.15 },
  degF: { label: '°F', toSI: (v) => (v + 459.67) * 5 / 9, fromSI: (v) => v * 9 / 5 - 459.67 },
  // temperature gradient
  Km: { label: 'K/m', ...lin(1) }, Rft: { label: '°R/ft', ...lin((5 / 9) / FT) },
  // mass / force / inertia
  kg: { label: 'kg', ...lin(1) }, g: { label: 'g', ...lin(1e-3) }, lbm: { label: 'lb', ...lin(LBM) }, slug: { label: 'slug', ...lin(SLUG) },
  N: { label: 'N', ...lin(1) }, lbf: { label: 'lbf', ...lin(LBF) },
  kgm2: { label: 'kg·m²', ...lin(1) }, slugft2: { label: 'slug·ft²', ...lin(SLUG * FT * FT) }, lbmin2: { label: 'lb·in²', ...lin(LBM * IN * IN) },
  // misc
  s: { label: 's', ...lin(1) }, deg: { label: '°', ...lin(1) }, rad: { label: 'rad', ...lin(180 / Math.PI) },
  perrad: { label: '/rad', ...lin(1) }, perdeg: { label: '/°', ...lin(180 / Math.PI) },
  perm: { label: '1/m', ...lin(1) }, perft: { label: '1/ft', ...lin(1 / FT) },
  pct: { label: '%', ...lin(1) }, none: { label: '', ...lin(1) },
};

/** Default display unit per dimension and system. Fields may override with `units: {si, us}`. */
export const DIMS = {
  length: { si: 'mm', us: 'in' },        // vehicle dimensions
  distance: { si: 'm', us: 'ft' },       // launcher length, wire length …
  altitude: { si: 'm', us: 'ft' },
  radius: { si: 'km', us: 'ft' },        // planetary radius
  area: { si: 'cm2', us: 'in2' },
  volume: { si: 'cm3', us: 'in3' },
  pressure: { si: 'Pa', us: 'psf' },
  modulus: { si: 'GPa', us: 'psi' },
  density: { si: 'kgm3', us: 'slugft3' },
  matDensity: { si: 'gcm3', us: 'lbin3' },
  speed: { si: 'ms', us: 'fts' },
  accel: { si: 'ms2', us: 'fts2' },
  temperature: { si: 'K', us: 'R' },
  lapse: { si: 'Km', us: 'Rft' },
  mass: { si: 'kg', us: 'lbm' },
  smallMass: { si: 'g', us: 'lbm' },
  moment1: { si: 'cm3', us: 'in3' },     // first moment of area
  force: { si: 'N', us: 'lbf' },
  inertia: { si: 'kgm2', us: 'slugft2' },
  angle: { si: 'deg', us: 'deg' },
  angleRad: { si: 'rad', us: 'rad' },
  rate: { si: 'rads', us: 'rads' },
  frequency: { si: 'hz', us: 'hz' },
  time: { si: 's', us: 's' },
  perAngle: { si: 'perrad', us: 'perrad' },
  wavenumber: { si: 'perm', us: 'perft' },
  percent: { si: 'pct', us: 'pct' },
  none: { si: 'none', us: 'none' },
};

const KEY = 'rc-units';
export function getSystem() { const v = storage.get(KEY); return v === 'us' ? 'us' : 'si'; }
export function setSystem(sys) {
  storage.set(KEY, sys);
  document.documentElement.dataset.units = sys;
  window.dispatchEvent(new CustomEvent('unitschange', { detail: sys }));
}

/** The display unit key for a quantity spec {dim, units?} in the current (or given) system. */
export function displayUnit(spec, sys = getSystem()) {
  if (spec.units && spec.units[sys]) return spec.units[sys];
  const d = DIMS[spec.dim || 'none'];
  if (!d) throw new Error(`Unknown dimension ${spec.dim}`);
  return d[sys];
}
export const unitLabel = (key) => UNITS[key]?.label ?? key;

/** Convert value from unit `from` to unit `to` (both keys of UNITS). */
export function convert(v, from, to) {
  if (v == null || Number.isNaN(v) || from === to) return v;
  const a = UNITS[from], b = UNITS[to];
  if (!a || !b) throw new Error(`Unknown unit ${from} or ${to}`);
  return b.fromSI(a.toSI(v));
}
/** internal → display, using spec.internal (default: SI display unit of the dim). */
export const toDisplay = (v, spec, sys) => convert(v, spec.internal ?? displayUnit(spec, 'si'), displayUnit(spec, sys));
export const fromDisplay = (v, spec, sys) => convert(v, displayUnit(spec, sys), spec.internal ?? displayUnit(spec, 'si'));

/** LaTeX for each unit (rendered with KaTeX in HTML and TeX-lite in SVG). */
export const UNIT_TEX = {
  m: '\\mathrm{m}', mm: '\\mathrm{mm}', cm: '\\mathrm{cm}', km: '\\mathrm{km}', in: '\\mathrm{in}', ft: '\\mathrm{ft}',
  m2: '\\mathrm{m^{2}}', cm2: '\\mathrm{cm^{2}}', mm2: '\\mathrm{mm^{2}}', in2: '\\mathrm{in^{2}}', ft2: '\\mathrm{ft^{2}}',
  m3: '\\mathrm{m^{3}}', cm3: '\\mathrm{cm^{3}}', in3: '\\mathrm{in^{3}}', ft3: '\\mathrm{ft^{3}}',
  Pa: '\\mathrm{Pa}', kPa: '\\mathrm{kPa}', MPa: '\\mathrm{MPa}', GPa: '\\mathrm{GPa}', psf: '\\mathrm{lbf\\,ft^{-2}}', psi: '\\mathrm{psi}', Mpsi: '\\mathrm{Mpsi}',
  kgm3: '\\mathrm{kg\\,m^{-3}}', slugft3: '\\mathrm{slug\\,ft^{-3}}', gcm3: '\\mathrm{g\\,cm^{-3}}', lbin3: '\\mathrm{lb\\,in^{-3}}', lbft3: '\\mathrm{lb\\,ft^{-3}}',
  ms: '\\mathrm{m\\,s^{-1}}', fts: '\\mathrm{ft\\,s^{-1}}', kmh: '\\mathrm{km\\,h^{-1}}', ms2: '\\mathrm{m\\,s^{-2}}', fts2: '\\mathrm{ft\\,s^{-2}}',
  rads: '\\mathrm{rad\\,s^{-1}}', hz: '\\mathrm{Hz}', rpm: '\\mathrm{rpm}',
  K: '\\mathrm{K}', R: '{}^{\\circ}\\mathrm{R}', degC: '{}^{\\circ}\\mathrm{C}', degF: '{}^{\\circ}\\mathrm{F}', Km: '\\mathrm{K\\,m^{-1}}', Rft: '{}^{\\circ}\\mathrm{R\\,ft^{-1}}',
  kg: '\\mathrm{kg}', g: '\\mathrm{g}', lbm: '\\mathrm{lb}', slug: '\\mathrm{slug}', N: '\\mathrm{N}', lbf: '\\mathrm{lbf}',
  kgm2: '\\mathrm{kg\\,m^{2}}', slugft2: '\\mathrm{slug\\,ft^{2}}', lbmin2: '\\mathrm{lb\\,in^{2}}',
  s: '\\mathrm{s}', deg: '{}^{\\circ}', rad: '\\mathrm{rad}', perrad: '\\mathrm{rad^{-1}}', perdeg: '{}^{\\circ\\,-1}',
  perm: '\\mathrm{m^{-1}}', perft: '\\mathrm{ft^{-1}}', pct: '\\%', none: '',
};
export const unitTex = (key) => UNIT_TEX[key] ?? `\\mathrm{${key}}`;
