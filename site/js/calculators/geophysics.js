// Atmosphere & Gravity (Geophysics) — UI definition.
import { atmosphere, profile, tropopause, surfaceGravity, C } from '../calc/geophysics.js';
import { s, fmt } from '../util.js';
import { path, text } from '../ui/svg.js';

const ALT = { dim: 'altitude', internal: 'ft' };
const TEMP = { dim: 'temperature', internal: 'R' };
const PRES = { dim: 'pressure', internal: 'psf' };
const DENS = { dim: 'density', internal: 'slugft3' };
const SPD = { dim: 'speed', internal: 'fts' };
const ACC = { dim: 'accel', internal: 'fts2' };

export default {
  slug: 'geophysics',
  topic: 'geophysics',
  title: 'Atmosphere & Gravity',
  subtitle: 'A <b>local</b> atmosphere that passes through your launch-site temperature, with a latitude-dependent tropopause, Potsdam gravity and the WGS-84 Earth radius.',
  source: 'GEOPHYSICS.xls · Geophysical Environment memo (2010)',
  verified: { label: 'Matches workbook (11 cells, both modes)', title: 'All outputs of GEOPHYSICS.xls reproduced to 1e-12; memo form also checked against the 1976 standard atmosphere.' },
  intro: {
    what: 'Gives temperature, pressure, density, speed of sound and gravity at any altitude, for your launch site and latitude.',
    why: 'Small sounding rockets fly like light aircraft: hot-day density and the local tropopause change drag, Mach number and apogee noticeably.',
    when: 'Setting up a trajectory simulation, converting speed to Mach number, or finding the dynamic pressure at max-q.',
    typical: 'From a 4,000 ft desert site on a 90 °F day, at 40,000 ft: 424 °R (−36 °F), 458 lb/ft², ρ = 6.3×10⁻⁴ slug/ft³.',
  },
  info: {
    text: [
      'Standard atmospheres are one-size-fits-all. This model keeps the standard lapse rate, gas constant and sea-level pressure but makes the temperature line <b>pass through the measured launch-site temperature</b> and end at a <b>latitude-dependent tropopause</b>; above it the stratosphere is isothermal.',
      'Pressure follows from hydrostatic balance and the perfect-gas law; density and sound speed follow from pressure and temperature.',
    ],
    tex: 'T=T^*+\\alpha(h-h^*),\\quad p=p_{SL}\\Big(1+\\tfrac{\\alpha h}{T^*-\\alpha h^*}\\Big)^{-g/R\\alpha},\\quad \\rho=\\tfrac{p}{RT}',
    steps: [
      'Enter the launch-site altitude and its surface temperature, the latitude, and the altitude you are interested in.',
      'The tropopause altitude comes from an ellipse between 52,500 ft at the equator and 27,900 ft at the poles.',
      'Temperature falls linearly from the launch-site value to the tropopause, then stays constant.',
      'Pressure integrates hydrostatic balance in each layer; density and sound speed follow.',
      'Gravity uses the Potsdam formula for latitude and an inverse-square correction for altitude.',
    ],
    doc: 'overview',
  },
  groups: [
    {
      id: 'site', title: 'Launch site',
      fields: [
        { id: 'ho', label: 'Site altitude (MSL)', sym: 'h^*', ...ALT, default: 4000, min: -1500, max: 30000,
          info: { text: 'Elevation of the launch site above mean sea level (the geoid).', range: 'FAR / Mojave ≈ 2,000–4,000 ft; Spaceport America ≈ 4,600 ft.', doc: 'atmosphere' } },
        { id: 'To', label: 'Surface temperature', sym: 'T^*', ...TEMP, default: 550, min: 300, max: 600, units: { si: 'degC', us: 'degF' },
          info: { text: 'Air temperature measured at the launch site at launch time. The tropospheric temperature line is forced through this point.', range: 'Desert summer 90–110 °F (32–43 °C); standard day 59 °F (15 °C).', doc: 'atmosphere' } },
        { id: 'phi', label: 'Geodetic latitude', sym: '\\varphi', dim: 'angle', default: 34, min: -90, max: 90, slider: { min: 0, max: 90 },
          info: { text: 'Latitude of the launch site (geodetic, as on maps). Sets the tropopause altitude, surface gravity and local Earth radius.', range: 'Mojave ≈ 35°; White Sands ≈ 32°; Esrange ≈ 68°.', doc: 'geodesy' } },
      ],
    },
    {
      id: 'point', title: 'Evaluate at',
      fields: [
        { id: 'h', label: 'Altitude (MSL)', sym: 'h', ...ALT, default: 40000, min: -1500, max: 300000, slider: { min: 0, max: 100000 },
          info: { text: 'Altitude above mean sea level at which the state is evaluated. Drag the marker on the atmosphere column to scan.', range: 'The two-layer model is meant for the troposphere and lower stratosphere (to ≈ 65,000 ft).', doc: 'atmosphere' } },
      ],
    },
  ],
  compat: {
    label: 'Match original spreadsheet',
    note: 'Off: memo equations (sea-level pressure on the geoid). On: GEOPHYSICS.xls troposphere formula.',
    info: 'The workbook evaluates tropospheric pressure with (h − h*) instead of h, which puts sea-level pressure (2116.2 lb/ft²) at the launch site and makes pressure jump at the tropopause when the site is above sea level. The memo’s form — the default here — is continuous. Above the tropopause both agree.',
  },
  results: [
    { id: 'T', label: 'Temperature', sym: 'T', ...TEMP, key: true, units: { si: 'K', us: 'R' },
      note: (v) => `${fmt(v * 5 / 9 - 273.15, { digits: 3 })} °C · ${fmt(v - 459.67, { digits: 3 })} °F`,
      info: { text: 'Absolute air temperature at the chosen altitude.', tex: 'T=\\begin{cases}T^*+\\alpha(h-h^*) & h\\le h_T\\\\ T_T & h>h_T\\end{cases}', doc: 'atmosphere' } },
    { id: 'p', label: 'Pressure', sym: 'p', ...PRES, key: true,
      note: (v) => `${fmt(v / C.po, { digits: 4 })} × sea-level`,
      info: { text: 'Static pressure from hydrostatic equilibrium in each layer.', tex: 'p=p_T\\,e^{-g(h-h_T)/RT_T}\\;\\;(h>h_T)', doc: 'atmosphere' } },
    { id: 'rho', label: 'Density', sym: '\\rho', ...DENS, key: true,
      note: (v) => `${fmt(v / 0.0023769, { digits: 4 })} × standard sea-level`,
      info: { text: 'Air density from the perfect-gas law.', tex: '\\rho=\\frac{p}{RT}', doc: 'atmosphere' } },
    { id: 'a', label: 'Speed of sound', sym: 'a', ...SPD, key: true,
      info: { text: 'Divide flight speed by this to get the Mach number.', tex: 'a=\\sqrt{\\gamma R T}', doc: 'atmosphere' } },
    { id: 'hT', label: 'Tropopause altitude', sym: 'h_T', ...ALT,
      info: { text: 'Top of the troposphere at this latitude (ellipse between the equatorial and polar values).', tex: 'h_T=\\Big[\\big(\\tfrac{\\cos\\varphi}{a_T}\\big)^2+\\big(\\tfrac{\\sin\\varphi}{b_T}\\big)^2\\Big]^{-1/2}', doc: 'tropopause' } },
    { id: 'TT', label: 'Tropopause temperature', sym: 'T_T', ...TEMP, units: { si: 'K', us: 'R' },
      info: { text: 'Temperature of the isothermal stratosphere. The low polar tropopause makes the polar stratosphere warmer than the tropical one.', tex: 'T_T=T^*+\\alpha(h_T-h^*)', doc: 'tropopause' } },
    { id: 'pT', label: 'Tropopause pressure', sym: 'p_T', ...PRES, info: { text: 'Pressure at the tropopause from the tropospheric equation.', doc: 'atmosphere' } },
    { id: 'go', label: 'Surface gravity', sym: 'g_0', ...ACC,
      info: { text: 'Acceleration of gravity on the geoid at this latitude (Potsdam formula).', tex: 'g_0=32.0876228\\,(1+0.00530224\\sin^2\\varphi-0.000058\\sin^2 2\\varphi)\\ \\mathrm{ft/s^2}', doc: 'gravity' } },
    { id: 'gh', label: 'Gravity at altitude', sym: 'g(h)', ...ACC,
      info: { text: 'Inverse-square correction of surface gravity for altitude (memo; the workbook uses $g_0$ throughout).', tex: 'g(h)=g_0\\Big(\\frac{R_E}{R_E+h}\\Big)^2', doc: 'gravity' } },
    { id: 'RE', label: 'Local Earth radius', sym: 'R_E', dim: 'radius', internal: 'ft', units: { si: 'km', us: 'ft' }, digits: 7,
      info: { text: 'Radius of the sphere tangent to the WGS-84 ellipsoid at this latitude.', tex: 'R_E^2=\\frac{(a^2\\cos\\varphi)^2+(b^2\\sin\\varphi)^2}{(a\\cos\\varphi)^2+(b\\sin\\varphi)^2}', doc: 'geodesy' } },
    { id: 'omega', label: 'Earth rotation rate', sym: '\\Omega', dim: 'rate', internal: 'rads', digits: 6,
      info: { text: 'Sidereal rotation rate, 2π / 86164.09 s.', doc: 'geodesy' } },
  ],
  compute(v, { compat }) {
    const o = atmosphere(v, { compat });
    const warnings = [];
    if (v.h < v.ho) warnings.push({ level: 'info', text: 'The evaluation altitude is below the launch site.' });
    if (v.h > 66000) warnings.push({ level: 'warn', text: 'Above ≈ 66,000 ft the real stratosphere starts warming; this two-layer model keeps it isothermal.' });
    if (compat && v.ho !== 0) warnings.push({ level: 'info', text: 'Spreadsheet mode: pressure equals 2116.2 lb/ft² at the launch site and jumps at the tropopause.' });
    const hmax = Math.max(1.35 * o.hT, 1.15 * v.h, 1.2 * v.ho, 20000);
    const hlo = Math.min(v.ho, v.h);
    const prof = profile(v, hlo, hmax, 160, { compat });
    return { results: o, warnings, o, prof, hmax, hlo };
  },
  plots: [
    {
      id: 'temperature', title: 'Temperature profile',
      info: { text: 'Temperature against altitude: linear through the launch-site value up to the tropopause, constant above. Hover to read off any altitude.', doc: 'atmosphere' },
      build(v, out, { U }) {
        const ut = U({ ...TEMP, units: { si: 'K', us: 'R' } }), uh = U(ALT);
        return {
          x: { label: 'Temperature', unit: ut.label }, y: { label: 'Altitude', unit: uh.label }, hover: 'y',
          series: [{ name: 'T(h)', points: out.prof.map((p) => [ut.v(p.T), uh.v(p.h)]) }],
          hlines: [{ y: uh.v(out.o.hT), label: 'tropopause', color: 'var(--accent-2)' }, { y: uh.v(v.ho), label: 'launch site', color: 'var(--text-3)' }],
          markers: [{ x: ut.v(out.o.T), y: uh.v(v.h), label: `${fmt(ut.v(out.o.T), { digits: 4 })} ${ut.label}` }],
        };
      },
    },
    {
      id: 'ratios', title: 'Pressure & density ratios',
      info: { text: 'Pressure and density divided by their sea-level standard values (2116.2 lb/ft², 0.0023769 slug/ft³).', doc: 'atmosphere' },
      build(v, out, { U }) {
        const uh = U(ALT);
        return {
          x: { label: 'Ratio to sea-level standard' }, y: { label: 'Altitude', unit: uh.label }, hover: 'y',
          series: [
            { name: 'p/p_{SL}', points: out.prof.map((p) => [p.p / C.po, uh.v(p.h)]) },
            { name: '\\rho/\\rho_{SL}', points: out.prof.map((p) => [p.rho / 0.0023769, uh.v(p.h)]) },
          ],
          hlines: [{ y: uh.v(out.o.hT), label: 'tropopause', color: 'var(--accent-2)' }],
          markers: [{ x: out.o.p / C.po, y: uh.v(v.h), color: 'var(--series-1)' }, { x: out.o.rho / 0.0023769, y: uh.v(v.h), color: 'var(--series-2)' }],
        };
      },
    },
    {
      id: 'tropopause', title: 'Tropopause altitude vs latitude',
      info: { text: 'The tropopause is far lower over the poles than at the equator (memo figure).', doc: 'tropopause' },
      build(v, out, { U }) {
        const uh = U(ALT);
        const pts = Array.from({ length: 91 }, (_, i) => [i, uh.v(tropopause((i * Math.PI) / 180))]);
        return { x: { label: 'Latitude', unit: '°' }, y: { label: 'Tropopause altitude', unit: uh.label }, xDomain: [0, 90], includeZero: true,
          series: [{ name: 'h_T', points: pts }], markers: [{ x: Math.abs(v.phi), y: uh.v(out.o.hT), label: `${Math.abs(v.phi)}°` }] };
      },
    },
    {
      id: 'gravity', title: 'Surface gravity vs latitude',
      info: { text: 'Potsdam formula: centripetal relief and the Earth’s flattening make gravity about 0.5 % stronger at the poles.', doc: 'gravity' },
      build(v, out, { U }) {
        const ug = U(ACC);
        const pts = Array.from({ length: 91 }, (_, i) => [i, ug.v(surfaceGravity((i * Math.PI) / 180))]);
        return { x: { label: 'Latitude', unit: '°' }, y: { label: 'g_0', unit: ug.label }, xDomain: [0, 90],
          series: [{ name: 'g_0', points: pts }], hlines: [{ y: ug.v(32.174), label: 'standard g', color: 'var(--text-3)' }],
          markers: [{ x: Math.abs(v.phi), y: ug.v(out.o.go), label: `${fmt(ug.v(out.o.go), { digits: 5 })}` }] };
      },
    },
  ],
  schematicTitle: 'Earth & atmosphere column',
  schematicHint: 'Drag the latitude point or the altitude marker',
  schematic(ctx, v, out) {
    const W = 760, H = 400;
    const fr = ctx.frame({ width: W, height: H, label: 'Earth latitude and atmosphere column' });
    const g = fr.layer('main'); g.replaceChildren();
    const uh = ctx.U(ALT), ut = ctx.U({ ...TEMP, units: { si: 'K', us: 'R' } });
    const o = out.o;
    // ---- Earth (flattening exaggerated ×20 for visibility) ----
    const cx = 150, cy = 210, A = 118, B = A * (1 - 20 * (1 - C.BRE / C.ARE));
    g.append(s('ellipse', { cx, cy, rx: A, ry: B, class: 'sc-body' }));
    for (const lat of [-60, -30, 30, 60]) {
      const be = Math.atan((B / A) * Math.tan((lat * Math.PI) / 180));
      g.append(s('ellipse', { cx, cy: cy - B * Math.sin(be), rx: A * Math.cos(be), ry: A * Math.cos(be) * 0.12, class: 'sc-thin', opacity: 0.35 }));
    }
    g.append(s('line', { x1: cx - A - 12, x2: cx + A + 12, y1: cy, y2: cy, class: 'sc-axis' }));
    g.append(s('line', { x1: cx, x2: cx, y1: cy - B - 14, y2: cy + B + 14, class: 'sc-thin', opacity: 0.6 }));
    g.append(text(cx + A + 16, cy + 4, 'equator', { cls: 'sc-label', size: 11 }));
    const Phi = (v.phi * Math.PI) / 180;
    // parametric angle of the surface point whose normal makes angle φ with the equator (geodetic latitude)
    const bt = Math.atan((B / A) * Math.tan(Phi));
    const px = cx + A * Math.cos(bt), py = cy - B * Math.sin(bt);
    // geodetic vertical through the point, extended back to the equatorial plane
    const nx = Math.cos(Phi), ny = -Math.sin(Phi);
    const footX = Math.abs(ny) > 1e-6 ? px + nx * ((cy - py) / ny) : cx;
    g.append(s('line', { x1: footX, y1: cy, x2: px + nx * 46, y2: py + ny * 46, class: 'sc-accent', 'data-field': 'phi' }));
    const arcR = 26;
    g.append(s('path', { d: `M${footX + arcR},${cy} A${arcR},${arcR} 0 0 0 ${footX + arcR * Math.cos(Phi)},${cy - arcR * Math.sin(Phi)}`, class: 'sc-accent', fill: 'none', 'data-field': 'phi' }));
    g.append(text(footX + arcR + 6, cy - 6, `φ = ${fmt(v.phi, { digits: 3 })}°`, { field: 'phi' }));
    g.append(text(cx - A, cy + B + 34, `R_E = ${fmt(ctx.U({ dim: 'radius', internal: 'ft', units: { si: 'km', us: 'ft' } }).v(o.RE), { digits: 6 })} ${ctx.U({ dim: 'radius', internal: 'ft', units: { si: 'km', us: 'ft' } }).label}   g_0 = ${fmt(ctx.U(ACC).v(o.go), { digits: 5 })} ${ctx.U(ACC).label}`, { size: 11 }));
    g.append(text(cx - A, cy + B + 50, 'flattening exaggerated ×20', { cls: 'sc-label', size: 10 }));
    ctx.handle('phi', px, py, {
      field: 'phi', title: 'Drag around the Earth to change latitude',
      onDrag: (sx, sy) => { const b = Math.atan2(-(sy - cy) / B, Math.max(1e-6, (sx - cx) / A)); const lat = Math.atan((A / B) * Math.tan(b)) * 180 / Math.PI; ctx.setValue('phi', Math.max(-90, Math.min(90, lat)), { round: 0.5 }); },
      onKey: (dx, dy) => ctx.setValue('phi', Math.max(-90, Math.min(90, v.phi + dy + dx))),
    });

    // ---- Atmosphere column ----
    const x0 = 360, x1 = 720, yTop = 24, yBot = H - 40;
    const hmax = out.hmax, hmin = out.hlo - 0.06 * (hmax - out.hlo);
    const Y = (hh) => yBot - ((hh - hmin) / (hmax - hmin)) * (yBot - yTop);
    const invY = (py2) => hmin + ((yBot - py2) / (yBot - yTop)) * (hmax - hmin);
    const id = fr.id;
    const defs = fr.svg.querySelector('defs');
    if (!defs.querySelector(`#${id}-trop`)) {
      defs.append(s('linearGradient', { id: `${id}-trop`, x1: 0, y1: 1, x2: 0, y2: 0 },
        s('stop', { offset: 0, 'stop-color': 'var(--accent)', 'stop-opacity': 0.22 }), s('stop', { offset: 1, 'stop-color': 'var(--accent-2)', 'stop-opacity': 0.16 })));
    }
    g.append(s('rect', { x: x0, y: Y(o.hT), width: x1 - x0, height: Y(hmin) - Y(o.hT), fill: `url(#${id}-trop)`, stroke: 'none' }));
    g.append(s('rect', { x: x0, y: yTop, width: x1 - x0, height: Y(o.hT) - yTop, fill: 'var(--accent-2-soft)', stroke: 'none' }));
    g.append(s('rect', { x: x0, y: yTop, width: x1 - x0, height: yBot - yTop, class: 'sc-thin', fill: 'none' }));
    g.append(text(x0 + 10, Y(o.hT) + 18, 'TROPOSPHERE', { cls: 'sc-dim-text', size: 10 }));
    g.append(text(x0 + 10, Y(o.hT) - 10, 'STRATOSPHERE (isothermal)', { cls: 'sc-dim-text', size: 10 }));
    // tropopause
    g.append(s('line', { x1: x0, x2: x1, y1: Y(o.hT), y2: Y(o.hT), class: 'sc-accent2', 'stroke-dasharray': '6 4', 'data-field': 'phi' }));
    g.append(text(x1 - 6, Y(o.hT) - 6, `tropopause ${fmt(uh.v(o.hT), { digits: 4 })} ${uh.label}`, { anchor: 'end', field: 'phi', size: 11 }));
    // ground at launch site
    g.append(s('rect', { x: x0, y: Y(v.ho), width: x1 - x0, height: Math.max(0, yBot - Y(v.ho)), fill: 'var(--surface-3)', stroke: 'none', 'data-field': 'ho' }));
    g.append(s('line', { x1: x0, x2: x1, y1: Y(v.ho), y2: Y(v.ho), class: 'sc-line', 'data-field': 'ho' }));
    for (let xx = x0 + 6; xx < x1; xx += 14) g.append(s('line', { x1: xx, y1: Y(v.ho), x2: xx - 6, y2: Y(v.ho) + 7, class: 'sc-thin', opacity: 0.6 }));
    g.append(text(x0 + 10, Y(v.ho) - 7, `launch site ${fmt(uh.v(v.ho), { digits: 4 })} ${uh.label} · ${fmt(ctx.U({ ...TEMP, units: { si: 'degC', us: 'degF' } }).v(v.To), { digits: 3 })} ${ctx.U({ ...TEMP, units: { si: 'degC', us: 'degF' } }).label}`, { field: 'ho To', size: 11 }));
    // temperature profile inside the column
    const Ts = out.prof.map((p) => p.T), tmin = Math.min(...Ts) - 10, tmax = Math.max(...Ts) + 10;
    const XT = (T) => x0 + 30 + ((T - tmin) / (tmax - tmin)) * (x1 - x0 - 60);
    g.append(s('path', { d: path(out.prof.map((p) => [XT(p.T), Y(p.h)])), class: 'sc-accent', fill: 'none', 'data-field': 'To' }));
    g.append(text(XT(Ts[Ts.length - 1]) + 6, yTop + 14, 'T(h)', { cls: 'sc-label', size: 11 }));
    // altitude axis ticks
    const step = niceStep((hmax - hmin) / 6);
    for (let hh = Math.ceil(hmin / step) * step; hh <= hmax; hh += step) {
      g.append(s('line', { x1: x0 - 6, x2: x0, y1: Y(hh), y2: Y(hh), class: 'sc-thin' }));
      g.append(text(x0 - 9, Y(hh) + 4, fmt(uh.v(hh), { digits: 3 }), { anchor: 'end', cls: 'sc-dim-text', size: 10 }));
    }
    g.append(text(x0 - 9, yTop - 8, uh.label, { anchor: 'end', cls: 'sc-dim-text', size: 10 }));
    // altitude marker + readout
    const yh = Y(Math.min(Math.max(v.h, hmin), hmax));
    g.append(s('line', { x1: x0, x2: x1, y1: yh, y2: yh, class: 'sc-line', 'stroke-width': 1.6, 'data-field': 'h' }));
    g.append(s('circle', { cx: XT(o.T), cy: yh, r: 4.5, class: 'sc-accent-fill' }));
    const box = s('g', { 'data-field': 'h' });
    const bx = XT(o.T) > (x0 + x1) / 2 ? x0 + 12 : x1 - 192, by = Math.min(Math.max(yh - 60, yTop + 4), yBot - 74);
    box.append(s('rect', { x: bx, y: by, width: 180, height: 68, rx: 6, fill: 'var(--surface)', stroke: 'var(--border-strong)' }));
    const rows = [
      `h  = ${fmt(uh.v(v.h), { digits: 5 })} ${uh.label}`,
      `T  = ${fmt(ut.v(o.T), { digits: 4 })} ${ut.label}`,
      `p  = ${fmt(ctx.U(PRES).v(o.p), { digits: 4 })} ${ctx.U(PRES).label}`,
      `ρ  = ${fmt(ctx.U(DENS).v(o.rho), { digits: 4 })} ${ctx.U(DENS).label}`,
    ];
    rows.forEach((r, i) => box.append(text(bx + 10, by + 17 + i * 15, r, { cls: 'sc-dim-text', size: 11 })));
    g.append(box);
    ctx.handle('h', x1, yh, {
      field: 'h', title: 'Drag up or down to change the altitude',
      onDrag: (sx, sy) => ctx.setValue('h', invY(sy), { round: 100 }),
      onKey: (dx, dy) => ctx.setValue('h', v.h + dy * 500),
    });
  },
  reportNotes: ['Equations are evaluated in the memo’s US customary units (ft, °R, lbf/ft², slug/ft³); the inputs and results tables use your selected unit system.'],
  report(v, out, R) {
    const o = out.o, n = R.n, q = R.q, a = C.alfa;
    const tropo = v.h <= o.hT;
    const steps = [
      { label: 'Tropopause altitude at this latitude (ellipse between equatorial and polar values)', lhs: 'h_T', eq: '\\left[\\left(\\frac{\\cos\\varphi}{a_T}\\right)^2+\\left(\\frac{\\sin\\varphi}{b_T}\\right)^2\\right]^{-1/2}', sub: `\\left[\\left(\\frac{\\cos ${n(v.phi)}^{\\circ}}{52\\,500}\\right)^2+\\left(\\frac{\\sin ${n(v.phi)}^{\\circ}}{27\\,900}\\right)^2\\right]^{-1/2}`, res: q(o.hT, 'ft') },
      { label: 'Tropopause temperature', lhs: 'T_T', eq: 'T^*+\\alpha\\,(h_T-h^*)', sub: `${n(v.To)}+(${n(a)})(${n(o.hT)}-${n(v.ho)})`, res: q(o.TT, 'R') },
      { label: 'Surface gravity (Potsdam formula)', lhs: 'g_0', eq: '32.0876228\\,(1+0.00530224\\sin^2\\varphi-0.000058\\sin^2 2\\varphi)', sub: `32.0876228\\,(1+0.00530224\\sin^2 ${n(v.phi)}^{\\circ}-0.000058\\sin^2 ${n(2 * v.phi)}^{\\circ})`, res: q(o.go, 'fts2') },
      { label: 'Local Earth radius (WGS-84 tangent sphere)', lhs: 'R_E', eq: '\\sqrt{\\frac{(a^2\\cos\\varphi)^2+(b^2\\sin\\varphi)^2}{(a\\cos\\varphi)^2+(b\\sin\\varphi)^2}}', res: q(o.RE, 'ft', 9) },
      { label: 'Tropopause pressure', lhs: 'p_T', eq: 'p_{SL}\\left(\\frac{1}{1+\\alpha h_T/(T^*-\\alpha h^*)}\\right)^{g_0/R\\alpha}', sub: `2116.217\\left(\\frac{1}{1+(${n(a)})(${n(o.hT)})/${n(o.Tsl)}}\\right)^{${n(o.go)}/(1716\\times(${n(a)}))}`, res: q(o.pT, 'psf') },
      tropo
        ? { label: `Temperature at h = ${n(v.h)} ft (troposphere)`, lhs: 'T', eq: 'T^*+\\alpha\\,(h-h^*)', sub: `${n(v.To)}+(${n(a)})(${n(v.h)}-${n(v.ho)})`, res: q(o.T, 'R') }
        : { label: `Temperature at h = ${n(v.h)} ft (isothermal stratosphere)`, lhs: 'T', eq: 'T_T', res: q(o.T, 'R') },
      tropo
        ? { label: v.__compat ? 'Pressure (workbook form, measured from the launch site)' : 'Pressure (memo form)', lhs: 'p', eq: v.__compat ? 'p_{SL}\\left(\\frac{1}{1+\\alpha (h-h^*)/(T^*-\\alpha h^*)}\\right)^{g_0/R\\alpha}' : 'p_{SL}\\left(\\frac{1}{1+\\alpha h/(T^*-\\alpha h^*)}\\right)^{g_0/R\\alpha}', res: q(o.p, 'psf') }
        : { label: 'Pressure in the stratosphere', lhs: 'p', eq: 'p_T\\exp\\left[-\\frac{g_0(h-h_T)}{R\\,T_T}\\right]', sub: `${n(o.pT)}\\exp\\left[-\\frac{${n(o.go)}(${n(v.h)}-${n(o.hT)})}{1716\\times${n(o.TT)}}\\right]`, res: q(o.p, 'psf') },
      { label: 'Density (perfect gas)', lhs: '\\rho', eq: '\\frac{p}{R\\,T}', sub: `\\frac{${n(o.p)}}{1716\\times${n(o.T)}}`, res: q(o.rho, 'slugft3') },
      { label: 'Speed of sound', lhs: 'a', eq: '\\sqrt{\\gamma R T}', sub: `\\sqrt{1.4\\times1716\\times${n(o.T)}}`, res: q(o.a, 'fts') },
      { label: 'Gravity at altitude (inverse square)', lhs: 'g(h)', eq: 'g_0\\left(\\frac{R_E}{R_E+h}\\right)^2', sub: `${n(o.go)}\\left(\\frac{${n(o.RE, 9)}}{${n(o.RE, 9)}+${n(v.h)}}\\right)^2`, res: q(o.gh, 'fts2') },
    ];
    return [{
      title: 'Theory',
      text: 'The model keeps the 1976 Standard Atmosphere constants ($\\alpha=-0.00357448$ °R/ft, $R=1716$ ft·lbf/(slug·°R), $\\gamma=1.4$, $p_{SL}=2116.217$ lbf/ft²) but makes the tropospheric temperature line pass through the measured launch-site temperature $T^*$ at altitude $h^*$, ending at a latitude-dependent tropopause; the stratosphere above is isothermal. Pressure follows from hydrostatic balance $dp/dh=-\\rho g$ with $p=\\rho RT$ (C. P. Hoult, Sounding Rocket Geophysical Environment, 2010).',
      steps,
    }];
  },
  references: ['geophysics'],
  examples: [
    { name: 'Mojave desert summer day, 40,000 ft (workbook)', values: { ho: 4000, To: 550, phi: 34, h: 40000 } },
    { name: 'Standard day at sea level, 45°N, 10,000 ft', values: { ho: 0, To: 518.67, phi: 45, h: 10000 } },
    { name: 'Esrange (68°N) cold day, 30,000 ft', values: { ho: 1100, To: 459.67 + 14, phi: 68, h: 30000 } },
  ],
};

function niceStep(raw) {
  const m = 10 ** Math.floor(Math.log10(raw)), e = raw / m;
  return (e >= 5 ? 10 : e >= 2 ? 5 : e >= 1 ? 2 : 1) * m;
}
