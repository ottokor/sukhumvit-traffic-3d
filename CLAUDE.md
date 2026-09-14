# Sukhumvit 3D live-traffic map

A single-page website showing a 3D map of the Sukhumvit corridor in Bangkok with live traffic colouring.
Visitors can rotate and tilt the view only — no zoom, no pan. Runs at zero cost.

## Stack (decided)
- Frontend: static HTML + MapLibre GL JS (CDN). No framework.
- Basemap: OpenFreeMap vector tiles (free, no key) — style `https://tiles.openfreemap.org/styles/liberty`.
  Fallback: Protomaps.
- 3D buildings: `fill-extrusion` layer from the basemap's building source.
- Traffic: TomTom Traffic Flow raster tiles, relative style, served through OUR OWN cache
  at `/traffic/{z}/{x}/{y}.png` so visitor count never touches the TomTom quota.
- Hosting: Vercel (static). Owner's existing site ottokorpela.com is on Vercel; deploy as a
  separate project first, attach a subdomain later.
- Refresh job: GitHub Actions on a schedule (every 5 min — GitHub's minimum) fetching the fixed tile
  set from TomTom and force-pushing it as one commit to the `traffic-data` branch (no history growth).
  Vercel rewrites `/traffic/*` to that branch on raw.githubusercontent.com. Free tier limit: 50,000
  tile requests per day. Budget: 152 tiles (z15 + z16, one tile padding) × 288 refreshes ≈ 43,800/day.
  `npm run tiles` prints it; `npm test` fails if it goes over.

## Map behaviour (non-negotiable)
- Bounds in `corridor.js`: Nana BTS and Benjakitti Park (west) to Ekkamai BTS (east), Phetchaburi Rd
  (north) to Rama IV (south). Benjasiri and Benjakitti parks are highlighted; the five BTS stations and
  both parks are labelled.
- `minZoom === maxZoom`: the zoom is computed once by fitting the bounds to the viewport, then pinned
  (re-fitted on resize). All built-in gestures are disabled; a custom pointer handler provides rotate
  (drag left/right) and tilt (drag up/down) on mouse, touch and arrow keys.
- Initial pitch 58°, bearing 20°. Provide "reset view" button.
- Show "last updated HH:MM" from the tile timestamp file and a green/amber/red legend.
- Respect `prefers-reduced-motion`. Mobile: touch rotate works, layout still readable.

## Secrets
- `TOMTOM_API_KEY` — never in the frontend; only in the refresh job (GitHub Actions secret).

## Repo layout
- `index.html`, `style.css`, `map.js`, `corridor.js` (single source of truth for geometry, shared with Node)
- `scripts/tiles.mjs` — tile maths; `scripts/refresh-traffic.mjs` — tile list, budget, TomTom fetch, `updated.json`;
  `scripts/dev-server.mjs` — zero-dependency dev server with the production `/traffic/` behaviour
- `tests/` — `node --test`; run with `npm test`
- `.github/workflows/refresh-traffic.yml` — schedule; `ci.yml`; `agent-task.yml` (issue → PR pipeline);
  `claude.yml` (@claude); `pr-review.yml`
- `.github/agents/*.md` — briefs for the implementer, reviewer and fixer agents. Edit these to change how the agents behave.
- `coffee/index.html` — separate finished mini-app (filter coffee brewing animation); leave as-is, deploy at `/coffee`

## Working style
- Small commits, one feature at a time. Run `npm run dev` and check in the browser before moving on.
- Run `npm test` and `npm run tiles` before finishing any change.
- Ask before adding any paid service or any dependency beyond MapLibre. No build step, no framework.
- Frontend files must never reference `api.tomtom.com` or any API key (CI greps for it).
- TomTom's caching terms: see README. Re-check before a public launch.
