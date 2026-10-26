// Forecast winds aloft for a launch site, from Open-Meteo (https://open-meteo.com; free for non-commercial use, data
// CC BY 4.0 — attribution "Weather data by Open-Meteo.com"; no key; CORS allowed). Read for this work: the forecast
// API docs and a live call. Direction is taken as the meteorological "from" direction (not stated in the docs).
// Also map links for the site. Fetching happens only when the user presses the button.

const LEVELS = [1000, 975, 950, 925, 900, 850, 800, 700, 600, 500, 400, 300, 250, 200];
const M2FT = 1 / 0.3048;
export const METEO_CREDIT = 'Weather data by Open-Meteo.com (CC BY 4.0).';

/**
 * Wind layers at the hour nearest to now + hoursAhead: rows [{ h (ft above ground), w (ft/s), dir (deg from) }] from
 * the 10 m wind and the pressure levels above the ground, plus the site elevation (ft) and 2 m temperature (°R).
 */
export async function fetchWinds(lat, lon, hoursAhead = 0) {
  const vars = ['wind_speed_10m', 'wind_direction_10m', 'temperature_2m', ...LEVELS.flatMap((p) => [`wind_speed_${p}hPa`, `wind_direction_${p}hPa`, `geopotential_height_${p}hPa`])];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&hourly=${vars.join(',')}&wind_speed_unit=ms&forecast_days=7&timezone=auto`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Open-Meteo did not answer (${r.status}). Check the latitude and longitude, or try again later.`);
  const d = await r.json(), H = d.hourly, elev = d.elevation;
  // times are local (timezone=auto); utc_offset_seconds turns them into instants
  const target = Date.now() + (hoursAhead || 0) * 3600e3;
  let k = 0, best = Infinity;
  H.time.forEach((t, i) => { const e = Math.abs(Date.parse(t + 'Z') - d.utc_offset_seconds * 1000 - target); if (e < best) { best = e; k = i; } });
  const rows = [{ h: 10 * M2FT, w: H.wind_speed_10m[k] * M2FT, dir: H.wind_direction_10m[k] }];
  for (const p of LEVELS) {
    const z = H[`geopotential_height_${p}hPa`]?.[k], w = H[`wind_speed_${p}hPa`]?.[k], dir = H[`wind_direction_${p}hPa`]?.[k];
    if ([z, w, dir].every(Number.isFinite) && z - elev > 30) rows.push({ h: (z - elev) * M2FT, w: w * M2FT, dir });
  }
  const T2 = H.temperature_2m?.[k];
  return { rows, elevFt: Math.max(0, elev * M2FT), elevM: elev, tempR: Number.isFinite(T2) ? (T2 + 273.15) * 1.8 : null, tempC: T2, when: H.time[k].replace('T', ' ') };
}

/** Action buttons that open the launch site (values lat, lon) on OpenStreetMap and Google Maps. */
export const mapActions = () => [
  { label: 'Open in OpenStreetMap', title: 'Show the launch site on OpenStreetMap', async run(v) { window.open(`https://www.openstreetmap.org/?mlat=${v.lat}&mlon=${v.lon}#map=12/${v.lat}/${v.lon}`, '_blank', 'noopener'); return {}; } },
  { label: 'Open in Google Maps', title: 'Show the launch site on Google Maps', async run(v) { window.open(`https://www.google.com/maps/search/?api=1&query=${v.lat},${v.lon}`, '_blank', 'noopener'); return {}; } },
];
