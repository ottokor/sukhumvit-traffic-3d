import { test } from 'node:test';
import assert from 'node:assert/strict';
import { haversineKm, compassDirection } from '../scripts/geo.mjs';

test('haversineKm returns 0 for the same point', () => {
  assert.equal(haversineKm({ lat: 13.7315, lon: 100.571 }, { lat: 13.7315, lon: 100.571 }), 0);
});

test('haversineKm matches a known distance (1 degree of latitude)', () => {
  // One degree along a meridian is ~111.2 km for Earth radius 6371 km, regardless of longitude.
  const km = haversineKm({ lat: 0, lon: 100 }, { lat: 1, lon: 100 });
  assert.ok(Math.abs(km - 111.19) < 0.5, km);
});

test('haversineKm matches a known distance (1 degree of longitude at the equator)', () => {
  const km = haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 });
  assert.ok(Math.abs(km - 111.19) < 0.5, km);
});

test('compassDirection resolves all eight points', () => {
  const from = { lat: 0, lon: 0 };
  const cases = [
    [{ lat: 1, lon: 0 }, 'N'],
    [{ lat: 1, lon: 1 }, 'NE'],
    [{ lat: 0, lon: 1 }, 'E'],
    [{ lat: -1, lon: 1 }, 'SE'],
    [{ lat: -1, lon: 0 }, 'S'],
    [{ lat: -1, lon: -1 }, 'SW'],
    [{ lat: 0, lon: -1 }, 'W'],
    [{ lat: 1, lon: -1 }, 'NW'],
  ];
  for (const [to, expected] of cases) assert.equal(compassDirection(from, to), expected, expected);
});
