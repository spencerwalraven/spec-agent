/**
 * Weather tool — checks 48-hour forecast for active job site addresses.
 * Uses OpenWeatherMap free API (OPENWEATHER_API_KEY env var).
 */

const API_KEY = () => process.env.OPENWEATHER_API_KEY || '';
const BASE = 'https://api.openweathermap.org';

async function fetchJson(url) {
  const { default: fetch } = await import('node-fetch').catch(() => ({ default: globalThis.fetch }));
  const fn = fetch || globalThis.fetch;
  const res = await fn(url);
  if (!res.ok) throw new Error(`OpenWeather HTTP ${res.status}`);
  return res.json();
}

async function geocodeAddress(address) {
  const q = encodeURIComponent(address);
  const url = `${BASE}/geo/1.0/direct?q=${q}&limit=1&appid=${API_KEY()}`;
  const res = await fetchJson(url);
  if (!res?.length) throw new Error(`Could not geocode: ${address}`);
  return { lat: res[0].lat, lon: res[0].lon };
}

/**
 * Check 48-hour weather for a job site address.
 * Returns an array of alert objects, or null if no significant weather.
 */
async function checkWeatherAlerts(address) {
  if (!API_KEY()) return null;
  if (!address || address.length < 5) return null;

  try {
    const { lat, lon } = await geocodeAddress(address);
    const url = `${BASE}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${API_KEY()}`;
    const forecast = await fetchJson(url);

    // Next 48 hours = 16 × 3-hour slots
    const next48 = (forecast.list || []).slice(0, 16);
    const alerts = [];

    for (const item of next48) {
      const temp    = item.main?.temp;
      const weather = item.weather?.[0]?.main || '';
      const desc    = item.weather?.[0]?.description || weather;
      const wind    = item.wind?.speed || 0;
      const dt      = new Date(item.dt * 1000);
      const timeStr = dt.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric',
      });

      if (/rain|drizzle|thunderstorm/i.test(weather)) {
        alerts.push({ type: 'rain',   icon: '🌧️', time: timeStr, detail: desc });
      }
      if (/snow|blizzard|sleet/i.test(weather)) {
        alerts.push({ type: 'snow',   icon: '❄️', time: timeStr, detail: desc });
      }
      if (temp !== undefined && temp <= 32) {
        alerts.push({ type: 'freeze', icon: '🥶', time: timeStr, detail: `${Math.round(temp)}°F — freezing temps` });
      }
      if (wind >= 25) {
        alerts.push({ type: 'wind',   icon: '💨', time: timeStr, detail: `${Math.round(wind)} mph winds` });
      }
    }

    // Deduplicate by type (only first occurrence matters for alerting)
    const seen = new Set();
    return alerts.filter(a => {
      if (seen.has(a.type)) return false;
      seen.add(a.type);
      return true;
    }) || null;

  } catch (err) {
    console.warn('[weather] Alert check failed for', address, ':', err.message);
    return null;
  }
}

/**
 * Get a simple human-readable summary for an alert array.
 */
function summarizeAlerts(alerts) {
  if (!alerts?.length) return null;
  return alerts.map(a => `${a.icon} ${a.detail} (${a.time})`).join(', ');
}

module.exports = { checkWeatherAlerts, summarizeAlerts };
