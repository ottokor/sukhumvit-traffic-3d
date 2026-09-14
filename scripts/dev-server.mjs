#!/usr/bin/env node
// Zero-dependency dev server. Serves the repo root and, like the Vercel rewrite in
// production, answers /traffic/* from local public/traffic first and otherwise proxies
// to the published traffic-data branch, so you see live tiles while developing.
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 3000);
const TRAFFIC_ORIGIN =
  process.env.TRAFFIC_ORIGIN ||
  'https://raw.githubusercontent.com/ottokor/sukhumvit-traffic-3d/traffic-data/traffic';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
  res.end(body);
}

function sendFile(res, file, extra = {}) {
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', ...extra });
  createReadStream(file).pipe(res);
}

async function proxyTraffic(req, res, pathname, search) {
  const local = path.join(ROOT, 'public', pathname);
  if (existsSync(local) && statSync(local).isFile()) return sendFile(res, local, { 'Cache-Control': 'no-store' });
  try {
    const upstream = await fetch(TRAFFIC_ORIGIN + pathname.slice('/traffic'.length) + search);
    const body = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch (err) {
    send(res, 502, `traffic proxy error: ${err.message}`);
  }
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith('/traffic/')) return proxyTraffic(req, res, pathname, url.search);

    let file = path.normalize(path.join(ROOT, pathname));
    if (!file.startsWith(ROOT)) return send(res, 403, 'forbidden');
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!existsSync(file)) return send(res, 404, `not found: ${pathname}`);
    sendFile(res, file, { 'Cache-Control': 'no-cache' });
  })
  .listen(PORT, () => {
    console.log(`Dev server → http://localhost:${PORT}`);
    console.log(`Traffic tiles: local public/traffic first, then ${TRAFFIC_ORIGIN}`);
  });
