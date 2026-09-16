// Pure geo helpers (great-circle distance and compass direction). No dependencies,
// shared by the browser (map.js) and tests. Points are {lat, lon} in WGS84 degrees.

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

/** Great-circle distance in km between two {lat, lon} points. */
export function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** Compass direction (one of N/NE/E/SE/S/SW/W/NW) from `from` toward `to`, both {lat, lon}. */
export function compassDirection(from, to) {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLon = toRad(to.lon - from.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return COMPASS_POINTS[Math.round(bearing / 45) % 8];
}
