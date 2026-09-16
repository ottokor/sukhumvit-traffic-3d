// US EPA AQI bands and colours for the PM2.5-driven AQI that WAQI reports, plus WAQI station
// name formatting. Pure functions, no dependencies, shared by the browser (map.js) and tests.

export const AQI_BANDS = [
  { max: 50, name: 'good', color: '#00e400' },
  { max: 100, name: 'moderate', color: '#ffff00' },
  { max: 150, name: 'unhealthy for sensitive groups', color: '#ff7e00' },
  { max: 200, name: 'unhealthy', color: '#ff0000' },
  { max: 300, name: 'very unhealthy', color: '#8f3f97' },
  { max: Infinity, name: 'hazardous', color: '#7e0023' },
];

/** The {max, name, color} band an AQI value falls into. */
export function aqiBand(aqi) {
  return AQI_BANDS.find((b) => aqi <= b.max) ?? AQI_BANDS[AQI_BANDS.length - 1];
}

/** MapLibre `step` expression colouring a numeric AQI property by band. */
export function aqiColorExpression(property = ['get', 'aqi']) {
  const expr = ['step', property, AQI_BANDS[0].color];
  for (let i = 1; i < AQI_BANDS.length; i++) expr.push(AQI_BANDS[i - 1].max + 1, AQI_BANDS[i].color);
  return expr;
}

/**
 * A WAQI station's short English name, e.g. "Nonsi Witthaya School, Bangkok, Thailand"
 * or "Chulalongkorn Hospital (โรงพยาบาลจุฬาลงกรณ์), Bangkok, Thailand" -> "Chulalongkorn Hospital".
 */
export function shortStationName(name) {
  if (!name) return '';
  return name
    .replace(/,\s*Bangkok,\s*Thailand\s*$/i, '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
