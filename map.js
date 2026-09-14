// Sukhumvit live traffic — 3D corridor map (Nana BTS → Ekkamai BTS).
// The camera is locked: visitors can rotate and tilt only. No zoom, no pan.
import { CORRIDOR } from './corridor.js';
import { tileAlignedBounds } from './scripts/tiles.mjs';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
// Traffic tiles come from our own cache (the traffic-data branch), never from TomTom directly.
// Wherever the page is served (dev server, its Vercel project, ottokorpela.com/bangkoktraffic),
// a "traffic/" path next to the page is rewritten to that branch.
const TRAFFIC_BASE = new URL('traffic', document.baseURI).pathname;
const TRAFFIC_TILES = `${TRAFFIC_BASE}/{z}/{x}/{y}.png`;
const UPDATED_URL = `${TRAFFIC_BASE}/updated.json`;
const POLL_MS = 60_000;
const STALE_MS = 15 * 60_000;
const FONT = ['Noto Sans Bold'];

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const [W, S, E, N] = CORRIDOR.bounds;
const BOUNDS = [[W, S], [E, N]];
const [MIN_PITCH, MAX_PITCH] = CORRIDOR.pitchRange;
const finestZoom = Math.max(...CORRIDOR.trafficZooms.map((t) => t.zoom));
const coarsestZoom = Math.min(...CORRIDOR.trafficZooms.map((t) => t.zoom));
const finest = CORRIDOR.trafficZooms.find((t) => t.zoom === finestZoom);
const TRAFFIC_BOUNDS = tileAlignedBounds(CORRIDOR.bounds, finest.zoom, finest.padding);

const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const map = new maplibregl.Map({
  container: 'map',
  style: STYLE_URL,
  bounds: BOUNDS,
  fitBoundsOptions: { padding: 12 },
  maxPitch: MAX_PITCH,
  attributionControl: false,
  // Every built-in gesture is off; setupOrbit() adds rotate + tilt back.
  dragPan: false,
  scrollZoom: false,
  boxZoom: false,
  doubleClickZoom: false,
  keyboard: false,
  touchZoomRotate: false,
  dragRotate: false,
  touchPitch: false,
});
map.addControl(new maplibregl.AttributionControl({ compact: true }), 'top-right');

// --- Camera lock -----------------------------------------------------------
let lockedZoom = null;
let lockedCenter = CORRIDOR.center;
let lastSize = '';

const isPortrait = () => {
  const c = map.getContainer();
  return c.clientHeight > c.clientWidth;
};
const homeBearing = () => (isPortrait() ? CORRIDOR.bearingPortrait : CORRIDOR.bearing);

// Fit the corridor to this viewport once, then pin that zoom (minZoom === maxZoom).
// No-op when the container size has not changed, so spurious resize events never
// interrupt an animation or a drag.
function lockZoom() {
  const c = map.getContainer();
  const size = `${c.clientWidth}x${c.clientHeight}`;
  if (size === lastSize) return;
  lastSize = size;
  const prev = { bearing: map.getBearing(), pitch: map.getPitch() };
  map.setMinZoom(0);
  map.setMaxZoom(24);
  const cam = map.cameraForBounds(BOUNDS, { padding: 12, bearing: homeBearing(), pitch: 0 });
  lockedZoom = Math.max(CORRIDOR.minLockedZoom, cam.zoom);
  lockedCenter = cam.center;
  map.setMinZoom(lockedZoom);
  map.setMaxZoom(lockedZoom);
  map.jumpTo({ center: lockedCenter, zoom: lockedZoom, bearing: prev.bearing, pitch: prev.pitch });
}

function resetView(animate = !reduceMotion) {
  const target = { center: lockedCenter, zoom: lockedZoom, bearing: homeBearing(), pitch: CORRIDOR.pitch };
  if (animate) map.easeTo({ ...target, duration: 900 });
  else map.jumpTo(target);
}

let resizeTimer;
map.on('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(lockZoom, 150);
});

// --- Orbit: left-drag / one-finger drag rotates and tilts --------------------
function setupOrbit() {
  const canvas = map.getCanvas();
  canvas.style.cursor = 'grab';
  let drag = null;

  canvas.addEventListener('pointerdown', (e) => {
    if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, bearing: map.getBearing(), pitch: map.getPitch() };
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    map.jumpTo({
      bearing: drag.bearing - dx * 0.35,
      pitch: clamp(drag.pitch - dy * 0.25, MIN_PITCH, MAX_PITCH),
    });
  });
  const end = (e) => {
    if (drag && e.pointerId === drag.id) {
      drag = null;
      canvas.style.cursor = 'grab';
    }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  // Keyboard: arrows rotate/tilt, R resets.
  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === 'r' || e.key === 'R') return resetView();
    const step = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, 3], ArrowDown: [0, -3] }[e.key];
    if (!step) return;
    e.preventDefault();
    map.jumpTo({
      bearing: map.getBearing() + step[0],
      pitch: clamp(map.getPitch() + step[1], MIN_PITCH, MAX_PITCH),
    });
  });
}

// --- Layers -----------------------------------------------------------------
function addParks() {
  const before = 'building';
  map.addLayer({
    id: 'grass-highlight', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover',
    filter: ['==', ['get', 'class'], 'grass'],
    paint: { 'fill-color': '#7ccf7a', 'fill-opacity': 0.55 },
  }, before);
  map.addLayer({
    id: 'park-highlight', type: 'fill', source: 'openmaptiles', 'source-layer': 'park',
    paint: { 'fill-color': '#49b86a', 'fill-opacity': 0.5 },
  }, before);
  map.addLayer({
    id: 'park-edge', type: 'line', source: 'openmaptiles', 'source-layer': 'park',
    paint: { 'line-color': '#1f7a3a', 'line-width': 1.5, 'line-opacity': 0.7 },
  }, before);
}

let stamp = 'init';
const tileUrl = (s) => `${TRAFFIC_TILES}?v=${encodeURIComponent(s)}`;

function addTraffic() {
  map.addSource('traffic', {
    type: 'raster',
    tiles: [tileUrl(stamp)],
    tileSize: 256,
    minzoom: coarsestZoom,
    maxzoom: finestZoom,
    bounds: TRAFFIC_BOUNDS,
    attribution: 'Traffic © <a href="https://www.tomtom.com/" target="_blank" rel="noopener">TomTom</a>',
  });
  // Under the building footprints so extrusions stand on top of the coloured roads.
  map.addLayer({
    id: 'traffic', type: 'raster', source: 'traffic',
    paint: { 'raster-opacity': 0.9, 'raster-fade-duration': 0 },
  }, 'building');
}

function addPois() {
  const features = CORRIDOR.pois.map((p) => ({
    type: 'Feature',
    properties: { label: p.label, type: p.type },
    geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
  }));
  map.addSource('pois', { type: 'geojson', data: { type: 'FeatureCollection', features } });
  map.addLayer({
    id: 'poi-dot', type: 'circle', source: 'pois',
    paint: {
      'circle-radius': ['match', ['get', 'type'], 'bts', 6, 5],
      'circle-color': ['match', ['get', 'type'], 'bts', '#6cbf3f', '#1f7a3a'],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  });
  map.addLayer({
    id: 'poi-label', type: 'symbol', source: 'pois',
    layout: {
      'text-field': ['get', 'label'],
      'text-font': FONT,
      'text-size': 12.5,
      // Collision-aware placement: try below, then right/left/above, so Benjasiri Park and
      // Phrom Phong never overlap whichever way the view is rotated. Stations win ties.
      'text-variable-anchor': ['top', 'right', 'left', 'bottom'],
      'text-radial-offset': 0.9,
      'text-justify': 'auto',
      'symbol-sort-key': ['match', ['get', 'type'], 'bts', 0, 1],
    },
    paint: { 'text-color': '#14213d', 'text-halo-color': 'rgba(255,255,255,0.95)', 'text-halo-width': 1.6 },
  });
}

// --- Status: "last updated" from the tile timestamp file ----------------------
let lastUpdated = null;

function renderStatus() {
  if (!lastUpdated) {
    statusEl.textContent = 'No traffic data yet — the refresh job hasn’t published tiles.';
    statusEl.className = 'status stale';
    return;
  }
  const ageMs = Date.now() - lastUpdated.getTime();
  const hhmm = lastUpdated.toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });
  const mins = Math.max(0, Math.round(ageMs / 60_000));
  const ago = mins < 1 ? 'just now' : `${mins} min ago`;
  const stale = ageMs > STALE_MS;
  statusEl.textContent = `Traffic updated ${hhmm} Bangkok time (${ago})${stale ? ' — may be stale' : ''}`;
  statusEl.className = `status ${stale ? 'stale' : 'live'}`;
}

async function pollUpdated() {
  try {
    const res = await fetch(`${UPDATED_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const meta = await res.json();
    lastUpdated = new Date(meta.updated);
    if (meta.updated !== stamp) {
      stamp = meta.updated;
      const src = map.getSource('traffic');
      if (src) src.setTiles([tileUrl(stamp)]);
    }
  } catch {
    // Keep whatever we last knew; the status text explains the gap.
  }
  renderStatus();
}

// --- Boot ----------------------------------------------------------------------
map.on('error', (e) => {
  // Missing traffic tiles (before the first refresh) are expected, not errors.
  if (e.sourceId === 'traffic') return;
  console.warn('Map error:', e.error || e);
});

map.on('load', () => {
  // If the container was laid out after construction, MapLibre may still be at its
  // 400×300 fallback size; resize() is idempotent and cheap.
  map.resize();
  lockZoom();
  map.setLight({ anchor: 'viewport', color: '#ffffff', intensity: 0.35, position: [1.15, 210, 30] });
  // Sky above the horizon + a light haze toward it, so the tilted view doesn't end in a flat
  // slab. `fog-color` matches the page background so the horizon blends into the panel chrome.
  map.setSky({
    'sky-color': '#7fb8e0',
    'sky-horizon-blend': 0.6,
    'horizon-color': '#f2e4cf',
    'horizon-fog-blend': 0.6,
    'fog-color': '#dfe7ee',
    'fog-ground-blend': 0.55,
    'atmosphere-blend': 0.6,
  });
  // The basemap only extrudes buildings from zoom 14; the building data exists from 13.
  if (map.getLayer('building-3d')) map.setLayerZoomRange('building-3d', 13, 24);
  addParks();
  addTraffic();
  addPois();
  setupOrbit();

  if (reduceMotion) {
    resetView(false);
  } else {
    map.jumpTo({ bearing: homeBearing() - 25, pitch: 35 });
    map.easeTo({ bearing: homeBearing(), pitch: CORRIDOR.pitch, duration: 2200 });
  }

  pollUpdated();
  setInterval(pollUpdated, POLL_MS);
  setInterval(renderStatus, 30_000);
});

resetBtn.addEventListener('click', () => resetView());

// Handy for debugging in the browser console.
window.__map = map;
