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
  intro: {
    what: 'Gives temperature, pressure, density, speed of sound and gravity at any altitude, for your launch site and latitude.',
    why: 'Small sounding rockets fly like light aircraft: hot-day density and the local tropopause change drag, Mach number and apogee noticeably.',
    when: 'Setting up a trajectory simulation, converting speed to Mach number, or finding the dynamic pressure at max-q.',
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
      info: { text: 'Inverse-square correction of surface gravity for altitude.', tex: 'g(h)=g_0\\Big(\\frac{R_E}{R_E+h}\\Big)^2', doc: 'gravity' } },
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
      info: { text: 'The tropopause is far lower over the poles than at the equator.', doc: 'tropopause' },
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
    g.append(text(x1 - 18, Y(o.hT) - 6, `tropopause ${fmt(uh.v(o.hT), { digits: 4 })} ${uh.label}`, { anchor: 'end', field: 'phi', size: 11 }));
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
    // altitude axis ticks, round numbers in the displayed unit
    const kd = uh.v(1), step = niceStep((kd * (hmax - hmin)) / 6);
    for (let i = 0, dd = Math.ceil((kd * hmin) / step) * step; i < 40 && dd <= kd * hmax; i++, dd += step) {
      const hh = dd / kd;
      g.append(s('line', { x1: x0 - 6, x2: x0, y1: Y(hh), y2: Y(hh), class: 'sc-thin' }));
      g.append(text(x0 - 9, Y(hh) + 4, fmt(dd, { digits: 4 }), { anchor: 'end', cls: 'sc-dim-text', size: 10 }));
    }
    g.append(text(x0 - 9, yTop - 8, uh.label, { anchor: 'end', cls: 'sc-dim-text', size: 10 }));
    // altitude marker + readout
    const yh = Y(Math.min(Math.max(v.h, hmin), hmax));
    g.append(s('line', { x1: x0, x2: x1, y1: yh, y2: yh, class: 'sc-line', 'stroke-width': 1.6, 'data-field': 'h' }));
    g.append(s('circle', { cx: XT(o.T), cy: yh, r: 4.5, class: 'sc-accent-fill' }));
    const box = s('g', { 'data-field': 'h' });
    // above the altitude line when it fits, else below — never across it
    const bx = XT(o.T) > (x0 + x1) / 2 ? x0 + 12 : x1 - 200, by = yh - 78 >= yTop + 4 ? yh - 78 : Math.min(yh + 10, yBot - 74);
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
  symbols: {
    h: 'altitude above mean sea level', 'h^*': 'launch-site altitude', 'T^*': 'launch-site air temperature', '\\varphi': 'geodetic latitude',
    h_T: 'tropopause altitude', a_T: 'equatorial tropopause altitude', b_T: 'polar tropopause altitude', T_T: 'tropopause (stratosphere) temperature', p_T: 'tropopause pressure',
    T: 'air temperature', p: 'air pressure', '\\rho': 'air density', a: 'speed of sound', '\\alpha': 'tropospheric temperature lapse rate', R: 'gas constant of air',
    '\\gamma': 'ratio of specific heats of air', 'p_{SL}': 'sea-level pressure on the geoid', 'T_{SL}': 'sea-level temperature of the local profile ($T^*-\\alpha h^*$)', g_0: 'gravity on the geoid at this latitude',
    'g(h)': 'gravity at altitude', R_E: 'radius of the sphere tangent to the Earth at this latitude', a_E: 'equatorial Earth radius', b_E: 'polar Earth radius',
  },
  constants: [
    { sym: '\\alpha', desc: 'tropospheric lapse rate', si: [-0.00357448 * (5 / 9) / 0.3048, '\\mathrm{K\\,m^{-1}}'], us: [-0.00357448, '{}^{\\circ}\\mathrm{R\\,ft^{-1}}'] },
    { sym: 'R', desc: 'gas constant of air', si: [1716 * 0.3048 * 0.3048 * 1.8, '\\mathrm{J\\,kg^{-1}\\,K^{-1}}'], us: [1716, '\\mathrm{ft\\,lbf\\,slug^{-1}\\,{}^{\\circ}R^{-1}}'] },
    { sym: '\\gamma', desc: 'ratio of specific heats', si: [1.4, ''], us: [1.4, ''] },
    { sym: 'p_{SL}', desc: 'sea-level pressure', si: [2116.217 * 47.880258980, '\\mathrm{Pa}'], us: [2116.217, '\\mathrm{lbf\\,ft^{-2}}'] },
    { sym: 'a_T', desc: 'equatorial tropopause altitude', si: [52500 * 0.3048, '\\mathrm{m}'], us: [52500, '\\mathrm{ft}'] },
    { sym: 'b_T', desc: 'polar tropopause altitude', si: [27900 * 0.3048, '\\mathrm{m}'], us: [27900, '\\mathrm{ft}'] },
    { sym: 'a_E', desc: 'WGS-84 equatorial radius', si: [20925597.9 * 0.3048, '\\mathrm{m}'], us: [20925597.9, '\\mathrm{ft}'] },
    { sym: 'b_E', desc: 'WGS-84 polar radius', si: [20855437.3 * 0.3048, '\\mathrm{m}'], us: [20855437.3, '\\mathrm{ft}'] },
  ],
  report(v, out, R) {
    const o = out.o, n = R.n;
    const H = { dim: 'altitude', internal: 'ft' }, Tk = { dim: 'temperature', internal: 'R', units: { si: 'K', us: 'R' } }, P = { dim: 'pressure', internal: 'psf' }, D = { dim: 'density', internal: 'slugft3' }, V = { dim: 'speed', internal: 'fts' }, G = { dim: 'accel', internal: 'fts2' }, RE = { dim: 'distance', internal: 'ft' };
    const al = R.v(C.alfa, { dim: 'lapse', internal: 'Rft' }, 6), Rg = R.pick(n(1716 * 0.3048 * 0.3048 * 1.8, 5), '1716'), pSL = R.v(C.po, P, 7);
    const aT = R.v(C.ATR, H, 6), bT = R.v(C.BTR, H, 6), gP = R.v(32.0876228, G, 9);
    const h = (x) => R.v(x, H, 6), T = (x) => R.v(x, Tk, 6);
    const tropo = v.h <= o.hT;
    const steps = [
      { label: 'Tropopause altitude at this latitude (ellipse between equatorial and polar values)', lhs: 'h_T', eq: '\\left[\\left(\\frac{\\cos\\varphi}{a_T}\\right)^2+\\left(\\frac{\\sin\\varphi}{b_T}\\right)^2\\right]^{-1/2}', sub: `\\left[\\left(\\frac{\\cos ${n(v.phi)}^{\\circ}}{${aT}}\\right)^2+\\left(\\frac{\\sin ${n(v.phi)}^{\\circ}}{${bT}}\\right)^2\\right]^{-1/2}`, res: R.Q(o.hT, H) },
      { label: 'Tropopause temperature (the lapse line passes through the launch-site temperature)', lhs: 'T_T', eq: 'T^*+\\alpha\\,(h_T-h^*)', sub: `${T(v.To)}+(${al})(${h(o.hT)}-${h(v.ho)})`, res: R.Q(o.TT, Tk) },
      { label: 'Surface gravity (Potsdam formula)', lhs: 'g_0', eq: `${gP}\\,(1+0.00530224\\sin^2\\varphi-0.000058\\sin^2 2\\varphi)`, sub: `${gP}\\,(1+0.00530224\\sin^2 ${n(v.phi)}^{\\circ}-0.000058\\sin^2 ${n(2 * v.phi)}^{\\circ})`, res: R.Q(o.go, G) },
      { label: 'Local Earth radius (sphere tangent to the WGS-84 ellipsoid)', lhs: 'R_E', eq: '\\sqrt{\\frac{(a_E^2\\cos\\varphi)^2+(b_E^2\\sin\\varphi)^2}{(a_E\\cos\\varphi)^2+(b_E\\sin\\varphi)^2}}', res: R.Q(o.RE, RE, 9) },
      { label: 'Sea-level temperature of the local profile', lhs: 'T_{SL}', eq: 'T^*-\\alpha h^*', sub: `${T(v.To)}-(${al})(${h(v.ho)})`, res: R.Q(o.Tsl, Tk) },
      { label: 'Tropopause pressure (hydrostatic balance in the troposphere)', lhs: 'p_T', eq: 'p_{SL}\\left(1+\\frac{\\alpha h_T}{T_{SL}}\\right)^{-g_0/R\\alpha}', sub: `${pSL}\\left(1+\\frac{(${al})(${h(o.hT)})}{${T(o.Tsl)}}\\right)^{-${R.v(o.go, G)}/(${Rg}\\times(${al}))}`, res: R.Q(o.pT, P) },
      tropo
        ? { label: 'Temperature at the evaluation altitude (troposphere)', lhs: 'T', eq: 'T^*+\\alpha\\,(h-h^*)', sub: `${T(v.To)}+(${al})(${h(v.h)}-${h(v.ho)})`, res: R.Q(o.T, Tk) }
        : { label: 'Temperature at the evaluation altitude (isothermal stratosphere)', lhs: 'T', eq: 'T_T', res: R.Q(o.T, Tk) },
      tropo
        ? { label: 'Pressure (troposphere)', lhs: 'p', eq: 'p_{SL}\\left(1+\\frac{\\alpha h}{T_{SL}}\\right)^{-g_0/R\\alpha}', sub: `${pSL}\\left(1+\\frac{(${al})(${h(v.h)})}{${T(o.Tsl)}}\\right)^{-${R.v(o.go, G)}/(${Rg}\\times(${al}))}`, res: R.Q(o.p, P) }
        : { label: 'Pressure (stratosphere)', lhs: 'p', eq: 'p_T\\exp\\left[-\\frac{g_0(h-h_T)}{R\\,T_T}\\right]', sub: `${R.v(o.pT, P)}\\exp\\left[-\\frac{${R.v(o.go, G)}(${h(v.h)}-${h(o.hT)})}{${Rg}\\times${T(o.TT)}}\\right]`, res: R.Q(o.p, P) },
      { label: 'Density (perfect gas)', lhs: '\\rho', eq: '\\frac{p}{R\\,T}', sub: `\\frac{${R.v(o.p, P)}}{${Rg}\\times${T(o.T)}}`, res: R.Q(o.rho, D) },
      { label: 'Speed of sound', lhs: 'a', eq: '\\sqrt{\\gamma R T}', sub: `\\sqrt{1.4\\times${Rg}\\times${T(o.T)}}`, res: R.Q(o.a, V) },
      { label: 'Gravity at altitude (inverse square)', lhs: 'g(h)', eq: 'g_0\\left(\\frac{R_E}{R_E+h}\\right)^2', sub: `${R.v(o.go, G)}\\left(\\frac{${R.v(o.RE, RE, 9)}}{${R.v(o.RE, RE, 9)}+${h(v.h)}}\\right)^2`, res: R.Q(o.gh, G) },
    ];
    return [{
      title: 'Theory',
      text: 'The atmosphere is modelled in two layers. In the troposphere the temperature falls linearly with altitude, at the standard lapse rate $\\alpha$, along a line that passes through the measured launch-site temperature $T^*$ at altitude $h^*$; above the latitude-dependent tropopause $h_T$ the stratosphere is isothermal. Pressure follows from hydrostatic balance $dp/dh=-\\rho g$ with the perfect-gas law $p=\\rho RT$: a power law in the troposphere and an exponential in the stratosphere. Density and the speed of sound follow from $p$ and $T$. Gravity uses the Potsdam formula for latitude and an inverse-square correction for altitude; the Earth is the sphere tangent to the WGS-84 ellipsoid at the launch latitude.',
      steps,
    }];
  },
  references: ['geophysics'],
  examples: [
    { name: 'Mojave desert summer day, 40,000 ft', values: { ho: 4000, To: 550, phi: 34, h: 40000 } },
    { name: 'Standard day at sea level, 45°N, 10,000 ft', values: { ho: 0, To: 518.67, phi: 45, h: 10000 } },
    { name: 'Esrange (68°N) cold day, 30,000 ft', values: { ho: 1100, To: 459.67 + 14, phi: 68, h: 30000 } },
  ],
};

function niceStep(raw) {
  const m = 10 ** Math.floor(Math.log10(raw)), e = raw / m;
  return (e >= 5 ? 10 : e >= 2 ? 5 : e >= 1 ? 2 : 1) * m;
}
