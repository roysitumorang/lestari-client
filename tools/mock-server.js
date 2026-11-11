#!/usr/bin/env node
/**
 * Development mock of the Lestari API, generated from ENDPOINTS (the page registry).
 * Serves the static client on :5500 and a fake API on :8080/api/v1 so the UI can be
 * clicked through without a backend. Data is sample data and nothing is persisted.
 *
 *   node tools/mock-server.js    then open http://localhost:5500/
 * Login with any email/password.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { build } = require('./generate-endpoints');

const ROOT = path.resolve(__dirname, '..');
const STATIC_PORT = Number(process.env.STATIC_PORT || 5500);
const API_PORT = Number(process.env.API_PORT || 8080);
const PREFIX = '/api/v1';

const { all } = build();
const routes = all.map((e) => ({
  method: e.method,
  re: new RegExp('^' + e.path.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\\{\w+\\\}|\{\w+\}/g, '[^/]+') + '$'),
  ep: e,
}));

/** A stable, UUID v7-shaped sample id (same key + index → same id). */
function mockId(key, i) {
  let h = 0;
  for (const ch of String(key || 'id')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hex = (h.toString(16) + '00000000').slice(0, 8);
  return '019a0000-' + hex.slice(0, 4) + '-7' + hex.slice(4, 7) + '-8000-' + String(i).padStart(12, '0');
}

/** Turn a documented type string/structure into a sample value. */
function sample(t, key, i) {
  if (Array.isArray(t)) return t.length ? [sample(t[0], key, 1), sample(t[0], key, 2)] : [];
  if (t && typeof t === 'object') { const o = {}; Object.entries(t).forEach(([k, v]) => { o[k] = sample(v, k, i); }); return o; }
  const s = String(t);
  if (s === '<Pagination>') return { page: 1, per_page: 25, total: 2, total_pages: 1 };
  if (/^"/.test(s)) return s.split('|')[0].trim().replace(/"/g, '');
  if (/^\d+ \|/.test(s)) return Number(s.split('|')[0]);
  if (/^string \(uuid/.test(s)) return mockId(key, i);
  if (/^integer/.test(s)) return 3 * i;
  if (/^number/.test(s)) return /price|total|amount|revenue|profit|sales|value|balance|fee|cost|capital|cash|income|expense/.test(key) ? 125000 * i : 12 * i;
  if (/^boolean/.test(s)) return i % 2 === 1;
  if (/^datetime/.test(s)) return '2026-11-0' + Math.min(i, 8) + 'T10:3' + i + ':00+07:00';
  if (/^date/.test(s)) return '2026-11-0' + Math.min(i, 8);
  if (/URL/.test(s)) return null;
  if (/^binary/.test(s)) return null;
  if (key === 'status') return 'pending';
  if (key === 'hour') return String(7 + i).padStart(2, '0') + ':00';
  if (/email/.test(key)) return 'user' + i + '@example.com';
  return (key || 'value').replace(/_/g, ' ') + ' ' + i;
}

function apiResponse(method, url) {
  const p = url.pathname.slice(PREFIX.length) || '/';
  if (method === 'POST' && p === '/auth/login') return [200, { data: { access_token: 'mock-access', refresh_token: 'mock-refresh', token_type: 'Bearer', expires_in: 3600, user: { id: mockId('user', 1), name: 'Owner' } } }];
  if (method === 'GET' && p === '/auth/me') return [200, { data: { id: mockId('user', 1), name: 'Demo Owner', email: 'owner@example.com', role: 'owner', permissions: [], store: { id: mockId('store', 1), name: 'Toko Lestari', plan: 'pro' }, branch: { id: mockId('branch', 1), name: 'Head office', is_head_office: true }, active_plugins: ['business', 'attendance'] } }];
  if (method === 'GET' && p === '/dashboard') {
    const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: String(h).padStart(2, '0') + ':00', transaction_count: h > 7 && h < 22 ? (h * 7) % 13 : 0, revenue: h > 7 && h < 22 ? ((h * 37) % 23) * 50000 : 0, profit: h > 7 && h < 22 ? ((h * 37) % 23) * 12000 : 0 }));
    return [200, { data: { date: '2026-11-08', summary: { transaction_count: 96, revenue: 7450000, profit: 1820000, compared_to_previous: { transaction_count: 12.5, revenue: -3.2, profit: 4 } }, hourly, top_products: [{ name: 'Paracetamol 500mg', quantity: 42, revenue: 420000 }], low_stock: [{ name: 'Vitamin C', stock: 2, minimum_stock: 10 }], alerts: [{ type: 'store_location', message: 'Your store has no map location yet.', action_label: 'Set location', action_route: 'store' }] } }];
  }
  const r = routes.find((x) => x.method === method && x.re.test(p));
  if (!r) return [404, { error: { code: 'not_found', message: 'Mock has no route for ' + method + ' ' + p } }];
  if (r.ep.isFile) return [200, null, 'file'];
  if (typeof r.ep.response === 'string') return [204, null];
  return [method === 'POST' && r.ep.status ? 201 : 200, sample(r.ep.response, '', 1)];
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Branch-Id, Accept-Language');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  req.resume();
  req.on('end', () => {
    const [status, body, kind] = apiResponse(req.method, url);
    if (kind === 'file') { res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="mock-export.xlsx"' }); res.end('mock'); return; }
    if (status === 204) { res.writeHead(204); res.end(); return; }
    res.writeHead(status, { 'Content-Type': 'application/json', 'X-Request-Id': 'mock' });
    res.end(JSON.stringify(envelope(req, status, body)));
  });
}).listen(API_PORT, () => console.log('Mock API      http://localhost:' + API_PORT + PREFIX));

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.md': 'text/markdown', '.png': 'image/png' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, path.normalize(p));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(STATIC_PORT, () => console.log('Static client http://localhost:' + STATIC_PORT + '/'));

/** Logical body { data, meta?, summary?, … } or { error } → the envelope the real server sends. */
function envelope(req, status, body) {
  const out = {
    request_id: 'mock', request_url: req.method + ' http://' + (req.headers.host || 'localhost') + req.url, status_code: status,
    status: http.STATUS_CODES[status] || '', message: '', timestamp: new Date().toISOString(), latency: '0s', data: null, app: 'lestari-mock',
  };
  if (body && body.error) {
    out.message = body.error.message || '';
    out.data = { code: body.error.code, fields: body.error.fields };
  } else if (body && body.meta) {
    const m = body.meta;
    out.data = { links: { first: '', previous: '', current: '', next: '', last: '' }, info: { limit: m.per_page, page: m.page, pages: m.total_pages, total: m.total }, rows: body.data };
    ['summary', 'totals', 'chart'].forEach((k) => { if (body[k] !== undefined) out.data[k] = body[k]; });
  } else if (body) {
    out.data = body.data === undefined ? null : body.data;
  }
  return out;
}
