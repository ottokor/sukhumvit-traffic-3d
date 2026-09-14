// Slippy-map tile maths. Pure functions, no dependencies, shared by the browser and Node.

export function lon2tile(lon, z) {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}

export function lat2tile(lat, z) {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
}

export function tile2lon(x, z) {
  return (x / 2 ** z) * 360 - 180;
}

export function tile2lat(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

/** Inclusive tile index range covering `bounds` ([w, s, e, n]) at `zoom`, grown by `padding` tiles. */
export function tileRange(bounds, zoom, padding = 0) {
  const [w, s, e, n] = bounds;
  const max = 2 ** zoom - 1;
  const clamp = (v) => Math.min(max, Math.max(0, v));
  return {
    z: zoom,
    xMin: clamp(lon2tile(w, zoom) - padding),
    xMax: clamp(lon2tile(e, zoom) + padding),
    yMin: clamp(lat2tile(n, zoom) - padding),
    yMax: clamp(lat2tile(s, zoom) + padding),
  };
}

/** Every {z, x, y} tile in the range. */
export function tilesForBounds(bounds, zoom, padding = 0) {
  const r = tileRange(bounds, zoom, padding);
  const out = [];
  for (let x = r.xMin; x <= r.xMax; x++) {
    for (let y = r.yMin; y <= r.yMax; y++) out.push({ z: r.z, x, y });
  }
  return out;
}

/** The geographic bounds [w, s, e, n] of the padded tile range — what the frontend declares as source bounds. */
export function tileAlignedBounds(bounds, zoom, padding = 0) {
  const r = tileRange(bounds, zoom, padding);
  return [tile2lon(r.xMin, zoom), tile2lat(r.yMax + 1, zoom), tile2lon(r.xMax + 1, zoom), tile2lat(r.yMin, zoom)];
}

/** Requests per day for refreshing `tileCount` tiles every `intervalMinutes`. */
export function dailyRequests(tileCount, intervalMinutes) {
  return Math.ceil((24 * 60) / intervalMinutes) * tileCount;
}
