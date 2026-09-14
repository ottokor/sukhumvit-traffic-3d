// Single source of truth for the corridor geometry.
// Imported by the browser (map.js) and by Node (scripts/refresh-traffic.mjs, tests).
export const CORRIDOR = {
  // [west, south, east, north] in WGS84.
  // Nana BTS and Benjakitti Park (west) to Ekkamai BTS (east),
  // Phetchaburi Rd (north) to Rama IV Rd (south).
  bounds: [100.55, 13.715, 100.592, 13.748],
  center: [100.571, 13.7315],

  // Camera the visitor starts from and returns to with "Reset view".
  // Sukhumvit runs at a compass bearing of ~125°, so bearing 20 lays the corridor
  // roughly horizontal on a landscape screen and 125 lays it vertical on a phone.
  pitch: 58,
  bearing: 20,
  bearingPortrait: 125,
  pitchRange: [30, 72],
  // The zoom is fitted to the viewport but never below this (MapLibre zoom, 512 px
  // tiles): below 14 the basemap has no building extrusions and we fetch no traffic.
  minLockedZoom: 14,

  // TomTom raster tiles are 256 px, so MapLibre asks for zoom+1 tiles:
  // desktop (map zoom ~15) uses z16, phones (map zoom ~14) use z15.
  // `padding` is extra tiles around the bounds so the tilted, rotated view
  // never shows a hole at the edge.
  trafficZooms: [
    { zoom: 15, padding: 1 },
    { zoom: 16, padding: 1 },
  ],
  // TomTom flow style: colours relative to free-flow speed.
  trafficStyle: 'relative0',

  // Points labelled on the map. `labelTh` is the Thai name shown as a smaller
  // second line under `label` (map.js only reads these, never hardcodes them).
  pois: [
    { label: 'Nana', labelTh: 'นานา', type: 'bts', lng: 100.5554, lat: 13.7406 },
    { label: 'Asok', labelTh: 'อโศก', type: 'bts', lng: 100.5604, lat: 13.737 },
    { label: 'Phrom Phong', labelTh: 'พร้อมพงษ์', type: 'bts', lng: 100.5696, lat: 13.7305 },
    { label: 'Thong Lo', labelTh: 'ทองหล่อ', type: 'bts', lng: 100.5786, lat: 13.7242 },
    { label: 'Ekkamai', labelTh: 'เอกมัย', type: 'bts', lng: 100.5853, lat: 13.7196 },
    { label: 'Benjasiri Park', labelTh: 'สวนเบญจสิริ', type: 'park', lng: 100.5682, lat: 13.7302 },
    { label: 'Benjakitti Park', labelTh: 'สวนเบญจกิติ', type: 'park', lng: 100.559, lat: 13.7262 },
  ],
};
