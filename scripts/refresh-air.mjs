#!/usr/bin/env node
// Fetches WAQI air-quality stations for the corridor (padded ~3 km, see corridor.js) and
// writes OUT_DIR/air.json. WAQI_TOKEN is read from the environment and is never logged.
// A missing token or a WAQI failure exits non-zero (or 0 for a missing token) but must never
// stop scripts/refresh-traffic.mjs from publishing tiles — the workflow runs this separately.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CORRIDOR } from '../corridor.js';

const OUT_DIR = process.env.OUT_DIR || 'public/traffic';
const token = process.env.WAQI_TOKEN;

if (!token) {
  console.warn('⚠ WAQI_TOKEN is not set — skipping air-quality fetch.');
  process.exit(0);
}

const [w, s, e, n] = CORRIDOR.airBounds;
const url = `https://api.waqi.info/map/bounds/?latlng=${s},${w},${n},${e}&token=${encodeURIComponent(token)}`;

let res;
try {
  res = await fetch(url);
} catch (err) {
  console.error(`✗ WAQI request failed: ${err.message}`);
  process.exit(1);
}
if (!res.ok) {
  console.error(`✗ HTTP ${res.status} from WAQI.`);
  process.exit(1);
}

const body = await res.json();
if (body.status !== 'ok' || !Array.isArray(body.data)) {
  console.error(`✗ Unexpected WAQI response: ${body.status}`);
  process.exit(1);
}

const stations = body.data
  .map((st) => ({
    uid: st.uid,
    name: st.station?.name ?? 'Unknown station',
    lat: st.lat,
    lon: st.lon,
    aqi: Number(st.aqi),
    time: st.station?.time ?? null,
  }))
  .filter((st) => Number.isFinite(st.aqi));

await mkdir(OUT_DIR, { recursive: true });
await writeFile(
  path.join(OUT_DIR, 'air.json'),
  JSON.stringify({ updated: new Date().toISOString(), stations }, null, 2) + '\n',
);
console.log(`✓ ${stations.length} air-quality stations written to ${OUT_DIR}/air.json`);
if (stations.length === 0) console.warn('⚠ WAQI returned no stations with numeric AQI in the padded corridor bounds.');
