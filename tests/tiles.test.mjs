import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lon2tile, lat2tile, tile2lon, tile2lat, tileRange, tilesForBounds, tileAlignedBounds, dailyRequests } from '../scripts/tiles.mjs';
import { CORRIDOR } from '../corridor.js';

test('tile indices follow the slippy-map convention', () => {
  assert.equal(lon2tile(-180, 0), 0);
  assert.equal(lon2tile(0, 1), 1);
  assert.equal(lat2tile(0, 1), 1);
  assert.equal(lon2tile(100.571, 16), 51076);
  assert.equal(tile2lon(51076, 16) <= 100.571 && 100.571 < tile2lon(51077, 16), true);
});

test('tile2lat / lat2tile round-trip brackets the input latitude', () => {
  for (const lat of [13.715, 13.7315, 13.748, 0, -45, 60]) {
    const y = lat2tile(lat, 16);
    assert.ok(tile2lat(y + 1, 16) <= lat && lat <= tile2lat(y, 16), `lat ${lat}`);
  }
});

test('tilesForBounds returns the full rectangle and padding grows it by 2 per axis', () => {
  const r = tileRange(CORRIDOR.bounds, 16, 0);
  const n = (r.xMax - r.xMin + 1) * (r.yMax - r.yMin + 1);
  assert.equal(tilesForBounds(CORRIDOR.bounds, 16, 0).length, n);
  const padded = tileRange(CORRIDOR.bounds, 16, 1);
  assert.equal(padded.xMax - padded.xMin, r.xMax - r.xMin + 2);
  assert.equal(padded.yMax - padded.yMin, r.yMax - r.yMin + 2);
});

test('tile-aligned bounds contain the corridor bounds', () => {
  const [w, s, e, n] = CORRIDOR.bounds;
  const [aw, as, ae, an] = tileAlignedBounds(CORRIDOR.bounds, 16, 1);
  assert.ok(aw <= w && as <= s && ae >= e && an >= n);
});

test('every point of interest lies inside the corridor bounds', () => {
  const [w, s, e, n] = CORRIDOR.bounds;
  for (const p of CORRIDOR.pois) {
    assert.ok(p.lng >= w && p.lng <= e && p.lat >= s && p.lat <= n, p.label);
  }
});

test('the configured tile set stays under the TomTom free tier at a 5 minute refresh', () => {
  const count = CORRIDOR.trafficZooms.reduce((sum, t) => sum + tilesForBounds(CORRIDOR.bounds, t.zoom, t.padding).length, 0);
  assert.ok(dailyRequests(count, 5) < 50_000, `${dailyRequests(count, 5)} requests/day`);
});

test('dailyRequests multiplies refreshes per day by tile count', () => {
  assert.equal(dailyRequests(10, 5), 2880);
  assert.equal(dailyRequests(40, 3), 19200);
});
