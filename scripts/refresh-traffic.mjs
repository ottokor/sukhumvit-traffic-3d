#!/usr/bin/env node
// Fetches the fixed set of TomTom traffic-flow tiles for the corridor and writes them to
// OUT_DIR (default public/traffic) plus updated.json. `--dry-run` only prints the tile
// list and the daily request budget. TOMTOM_API_KEY is read from the environment and is
// never logged.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CORRIDOR } from '../corridor.js';
import { tilesForBounds, dailyRequests } from './tiles.mjs';

const dryRun = process.argv.includes('--dry-run');
const OUT_DIR = process.env.OUT_DIR || 'public/traffic';
const INTERVAL_MIN = Number(process.env.REFRESH_INTERVAL_MINUTES || 5);
const DAILY_LIMIT = 50_000; // TomTom free tier
const CONCURRENCY = 6;
const RETRIES = 3;
const key = process.env.TOMTOM_API_KEY;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Tile list and budget -------------------------------------------------------
const tiles = [];
console.log(`Corridor bounds [w, s, e, n]: ${CORRIDOR.bounds.join(', ')}`);
for (const { zoom, padding } of CORRIDOR.trafficZooms) {
  const list = tilesForBounds(CORRIDOR.bounds, zoom, padding);
  tiles.push(...list);
  const xs = list.map((t) => t.x), ys = list.map((t) => t.y);
  console.log(`  z${zoom} (+${padding} tile padding): ${list.length} tiles  x ${Math.min(...xs)}–${Math.max(...xs)}, y ${Math.min(...ys)}–${Math.max(...ys)}`);
}
const perDay = dailyRequests(tiles.length, INTERVAL_MIN);
console.log(`Total ${tiles.length} tiles per refresh; every ${INTERVAL_MIN} min → ${perDay.toLocaleString('en')} requests/day (TomTom free tier: ${DAILY_LIMIT.toLocaleString('en')})`);
if (perDay > DAILY_LIMIT) {
  console.error(`✗ Over the daily budget by ${(perDay - DAILY_LIMIT).toLocaleString('en')} requests. Reduce padding, zooms or frequency.`);
  process.exitCode = 1;
}
if (dryRun) process.exit(process.exitCode ?? 0);

if (!key) {
  console.error('✗ TOMTOM_API_KEY is not set. Export it (or add it as a GitHub Actions secret) and run again.');
  process.exit(1);
}

// --- Fetch --------------------------------------------------------------------------
const base = `https://api.tomtom.com/traffic/map/4/tile/flow/${CORRIDOR.trafficStyle}`;
let ok = 0;
let failed = 0;
let fatal = null;

async function fetchTile(t) {
  const url = `${base}/${t.z}/${t.x}/${t.y}.png?key=${encodeURIComponent(key)}`;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    if (fatal) return;
    try {
      const res = await fetch(url);
      if (res.status === 401 || res.status === 403) {
        fatal = `HTTP ${res.status} from TomTom — the API key is missing, wrong, or not enabled for the Traffic API.`;
        return;
      }
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { noRetry: true });
      const buf = Buffer.from(await res.arrayBuffer());
      const dir = path.join(OUT_DIR, String(t.z), String(t.x));
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, `${t.y}.png`), buf);
      ok++;
      return;
    } catch (err) {
      if (attempt === RETRIES || err.noRetry) {
        failed++;
        console.error(`  ✗ ${t.z}/${t.x}/${t.y}: ${err.message}`);
        return;
      }
      await sleep(400 * attempt);
    }
  }
}

const queue = [...tiles];
const started = Date.now();
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length && !fatal) await fetchTile(queue.shift());
  }),
);

if (fatal) {
  console.error(`✗ ${fatal}`);
  process.exit(1);
}
if (ok === 0) {
  console.error('✗ No tiles fetched.');
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });
await writeFile(
  path.join(OUT_DIR, 'updated.json'),
  JSON.stringify(
    {
      updated: new Date().toISOString(),
      style: CORRIDOR.trafficStyle,
      zooms: CORRIDOR.trafficZooms.map((t) => t.zoom),
      tiles: ok,
      failed,
      intervalMinutes: INTERVAL_MIN,
    },
    null,
    2,
  ) + '\n',
);
console.log(`✓ ${ok} tiles written to ${OUT_DIR} in ${((Date.now() - started) / 1000).toFixed(1)} s${failed ? `, ${failed} failed` : ''}`);
if (failed > tiles.length * 0.2) {
  console.error('✗ More than 20% of tiles failed; treating this run as failed.');
  process.exit(1);
}
