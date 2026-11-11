#!/usr/bin/env node
/**
 * Builds ENDPOINTS.md from the page definitions in js/modules/*.js.
 * Usage:  node tools/generate-endpoints.js          (writes ENDPOINTS.md)
 *         node tools/generate-endpoints.js --check  (also verifies every API call in js/ is documented)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SCRIPTS = [
  'js/config.js', 'js/core/registry.js', 'js/core/api.js', 'js/core/ui.js', 'js/core/charts.js',
  'js/components/actions.js', 'js/components/crud.js', 'js/components/report.js', 'js/components/settings.js',
  'js/modules/_common.js', 'js/modules/dashboard.js', 'js/modules/database.js', 'js/modules/transactions.js',
  'js/modules/reports.js', 'js/modules/branches.js', 'js/modules/settings.js', 'js/modules/commerce.js', 'js/menu.js',
];

/**
 * Page modules describe a response by its content — { data, meta?, summary?, totals?, chart? } — which is also what
 * Api.unwrap() hands to the pages. wire() turns that into the envelope the server really sends.
 */
function wire(resp, e) {
  if (!resp || typeof resp !== 'object') return resp;
  const created = /^201/.test((e && e.status) || '');
  let data = resp.data;
  if (resp.meta !== undefined || resp.summary !== undefined || resp.totals !== undefined || resp.chart !== undefined) {
    data = { links: '<Links>', info: '<Info>', rows: resp.data };
    ['summary', 'totals', 'chart'].forEach((k) => { if (resp[k] !== undefined) data[k] = resp[k]; });
  }
  return {
    request_id: 'string', request_url: 'string', status_code: created ? 201 : 200, status: created ? 'Created' : 'OK',
    message: '', timestamp: 'datetime', latency: 'string', data, app: 'lestari',
  };
}

function loadRegistry() {
  const store = {};
  const ctx = {
    console, Intl, Date, Math, JSON, URL, setTimeout, clearTimeout,
    localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } },
    document: { addEventListener() {} },
    location: { pathname: '/', hash: '' },
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  SCRIPTS.forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
  return ctx.Lestari;
}

/* ---------------- schema helpers ---------------- */
function enumOf(options) {
  return (options || []).map((o) => (typeof o === 'object' ? o.value : o)).map((v) => (typeof v === 'number' ? String(v) : '"' + v + '"')).join(' | ');
}

function fieldType(f) {
  switch (f.type) {
    case 'number': return 'number';
    case 'money': return 'number (currency)';
    case 'percent': return 'number (0–100)';
    case 'date': return 'date (YYYY-MM-DD)';
    case 'datetime': return 'datetime (ISO 8601)';
    case 'time': return 'string (HH:mm)';
    case 'switch': return 'boolean';
    case 'image': return 'string (URL from POST /uploads) | null';
    case 'file': return 'binary (multipart)';
    case 'password': return f.encode === false ? 'string (digits, write-only)' : 'string (base64, write-only)';
    case 'color': return 'string (#rrggbb)';
    case 'email': return 'string (email)';
    case 'select':
    case 'lookup':
      if (f.lookup) return lookupType(f.lookup) + ' | null';
      return f.options ? enumOf(f.options) : 'string';
    case 'multiselect':
      if (f.lookup) return [lookupType(f.lookup)];
      return [f.options ? enumOf(f.options) : 'string'];
    case 'items': {
      const o = {};
      (f.fields || []).forEach((s) => setPath(o, s.key, s.format ? formatType(s.format) : fieldType(s)));
      return [o];
    }
    default:
      if (f.format) return formatType(f.format);
      return 'string';
  }
}

// Lookup values are the referenced row's UUID unless the lookup uses another attribute (e.g. a code).
function lookupType(lk) {
  const src = lk.endpoint.replace(/^\//, '');
  if (lk.value && lk.value !== 'id') return 'string (' + src + ' ' + lk.value + ')';
  return 'string (uuid, ' + src + ' id)';
}

function formatType(fmt) {
  return ({ money: 'number (currency)', number: 'number', percent: 'number (0–100)', date: 'date', datetime: 'datetime', boolean: 'boolean', image: 'string (URL)', list: ['string'] })[fmt] || 'string';
}

function setPath(obj, key, val) {
  const parts = key.split('.');
  let o = obj;
  parts.slice(0, -1).forEach((p) => { if (typeof o[p] !== 'object' || Array.isArray(o[p])) o[p] = {}; o = o[p]; });
  const last = parts[parts.length - 1];
  if (o[last] === undefined || typeof o[last] === 'string') o[last] = val;
}

function bodySchema(fields, opts) {
  opts = opts || {};
  const o = {};
  (fields || []).forEach((f) => {
    if (f.type === 'heading' || f.form === false) return;
    if (opts.writable && f.readonly) return;
    setPath(o, f.key, fieldType(f));
  });
  return o;
}

function resourceSchema(def) {
  const o = { id: 'string (uuid)' };
  const idKey = def.idKey || 'id';
  if (idKey !== 'id') { delete o.id; o[idKey] = 'string (uuid)'; }
  (def.fields || []).forEach((f) => {
    if (f.type === 'heading' || f.type === 'password' || f.type === 'file') return;
    setPath(o, f.key, fieldType(f));
    if (f.lookup && /_id$/.test(f.key) && f.type !== 'multiselect') {
      setPath(o, f.key.replace(/_id$/, ''), { id: 'string (uuid)', [f.lookup.label || 'name']: 'string' });
    }
  });
  (def.columns || []).forEach((c) => {
    if (c.key && UIget(o, c.key) === undefined) setPath(o, c.key, c.format ? formatType(c.format) : c.type === 'image' ? 'string (URL)' : c.type === 'select' && c.options ? enumOf(c.options) : 'string');
  });
  (def.detailFields || []).forEach((f) => { if (f.key && UIget(o, f.key) === undefined) setPath(o, f.key, f.format ? formatType(f.format) : fieldType(f)); });
  o.created_at = 'datetime';
  o.updated_at = 'datetime';
  return o;
}

function UIget(o, key) { return key.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o); }

function rowSchema(columns) {
  const o = {};
  (columns || []).forEach((c) => setPath(o, c.key, c.format ? formatType(c.format) : (c.type === 'image' ? 'string (URL)' : 'string')));
  return o;
}

function requiredKeys(fields) {
  return (fields || []).filter((f) => f.required && f.form !== false && f.type !== 'heading').map((f) => '`' + f.key + '`');
}

function queryFromFields(fields) {
  const q = {};
  (fields || []).forEach((f) => {
    if (f.type === 'heading') return;
    const t = fieldType(f);
    q[f.key + (Array.isArray(t) ? '[]' : '')] = Array.isArray(t) ? (typeof t[0] === 'string' ? t[0] : 'object') : t.replace(/ \| null$/, '');
  });
  return q;
}

/* ---------------- endpoint collection ---------------- */
function actionEndpoint(a) {
  if (!a.path) return null;
  const method = a.method || 'POST';
  const ep = { method, path: a.path, summary: a.summary || a.label };
  if (a.download) {
    ep.summary = (a.summary || a.label) + ' Returns a file download.';
    if (a.form) ep.query = queryFromFields(a.form);
    ep.response = 'File (' + path.extname(a.download).slice(1).toUpperCase() + ') with Content-Disposition: attachment';
    ep.isFile = true;
    return ep;
  }
  if (a.upload) {
    ep.contentType = 'multipart/form-data';
    ep.body = bodySchema(a.form);
  } else if (a.request) {
    ep.body = a.request;
  } else if (a.form) {
    ep.body = Object.assign({}, bodySchema(a.form), a.body ? Object.fromEntries(Object.entries(a.body).map(([k, v]) => [k, JSON.stringify(v)])) : {});
  } else if (a.body) {
    ep.body = Object.fromEntries(Object.entries(a.body).map(([k, v]) => [k, JSON.stringify(v)]));
  }
  if (a.form) ep.required = requiredKeys(a.form);
  ep.response = a.response || { data: 'object' };
  return ep;
}

function pageEndpoints(def) {
  const eps = [];
  const add = (e) => { if (e) eps.push(e); };
  if (def.kind === 'crud') {
    const ops = def.ops || ['list', 'create', 'read', 'update', 'delete'];
    const res = resourceSchema(def);
    const idKey = def.idKey || 'id';
    const base = def.endpoint;
    const listQuery = { q: 'string (search)', page: 'integer (default 1)', per_page: 'integer (default 25, max 1000)', sort: 'string (field name)', order: '"asc" | "desc"' };
    if (def.tabs) listQuery[def.tabs.key] = enumOf(def.tabs.options.filter((o) => o.value !== ''));
    (def.filters || []).forEach((f) => { const t = fieldType(f); listQuery[f.key + (Array.isArray(t) ? '[]' : '')] = (Array.isArray(t) ? t[0] : t).replace(/ \| null$/, ''); });
    const body = bodySchema(def.fields, { writable: true });
    const req = requiredKeys(def.fields);
    if (ops.includes('list')) add({ method: 'GET', path: base, summary: 'List ' + def.title.toLowerCase() + '.', query: listQuery, response: { data: [res], meta: '<Pagination>' } });
    if (ops.includes('create')) add({ method: 'POST', path: base, summary: 'Create a ' + (def.singular || def.title).toLowerCase() + '.', body, required: req, status: '201 Created', response: { data: res } });
    if (ops.includes('read')) add({ method: 'GET', path: base + '/{' + idKey + '}', summary: 'Get one ' + (def.singular || def.title).toLowerCase() + '.', response: { data: res } });
    if (ops.includes('update')) add({ method: 'PUT', path: base + '/{' + idKey + '}', summary: 'Update a ' + (def.singular || def.title).toLowerCase() + '. Only attributes present in the body are written; send null to clear one.', body, required: req, response: { data: res } });
    if (ops.includes('delete')) add({ method: 'DELETE', path: base + '/{' + idKey + '}', summary: 'Delete a ' + (def.singular || def.title).toLowerCase() + '.', response: '204 No Content' });
    if (ops.includes('bulk_delete')) add({ method: 'POST', path: base + '/bulk-delete', summary: 'Delete several at once.', body: { ids: ['string (uuid)'] }, required: ['`ids`'], response: { data: { deleted: 'integer' } } });
    if (ops.includes('import')) {
      add({ method: 'POST', path: base + '/import', contentType: 'multipart/form-data', summary: 'Import rows from a spreadsheet.', body: Object.assign({ file: 'binary (.xlsx / .csv)' }, def.importModes ? { mode: enumOf(def.importModes) } : {}), required: ['`file`'], response: { data: { created: 'integer', updated: 'integer', failed: 'integer', errors: [{ row: 'integer', message: 'string' }] } } });
      add({ method: 'GET', path: base + '/import-template', summary: 'Download the import template.', response: 'File (XLSX)', isFile: true });
    }
    if (ops.includes('export')) add({ method: 'GET', path: base + '/export', summary: 'Export the list with the same filters as the list endpoint.', query: Object.assign({}, listQuery, { format: '"xlsx" | "csv"', page: undefined, per_page: undefined }), response: 'File (XLSX/CSV)', isFile: true });
  } else if (def.kind === 'report') {
    const q = {};
    if (def.dateRange !== false) { q.start_date = 'date (YYYY-MM-DD)'; q.end_date = 'date (YYYY-MM-DD)'; }
    if (def.groupBy) q[def.groupBy.key] = enumOf(def.groupBy.options);
    (def.filters || []).forEach((f) => { q[f.key] = fieldType(f).toString().replace(/ \| null$/, ''); });
    if (def.search) q.q = 'string (search)';
    if (def.paginated !== false) { q.page = 'integer'; q.per_page = 'integer (default 50)'; }
    const resp = { data: [rowSchema(def.columns)] };
    if (def.summary) { resp.summary = {}; def.summary.forEach((s) => { resp.summary[s.key] = s.format ? formatType(s.format) : 'string'; }); }
    resp.totals = '{ <column>: number } | null (sums of numeric columns, optional)';
    if (def.chart && def.chart.source !== 'data') { const c = {}; c[def.chart.label] = 'string'; def.chart.series.forEach((s) => { c[s.key] = 'number'; }); resp.chart = [c]; }
    if (def.paginated !== false) resp.meta = '<Pagination>';
    add({ method: 'GET', path: def.endpoint, summary: (def.description || def.title + ' report.'), query: q, response: resp, note: def.responseNote });
    if (def.export !== false) {
      const eq = Object.assign({}, q, { format: '"xlsx" | "csv" | "pdf"' });
      delete eq.page; delete eq.per_page;
      add({ method: 'GET', path: def.endpoint + '/export', summary: 'Download the report.', query: eq, response: 'File', isFile: true });
    }
    if (def.detail) {
      let r;
      if (def.detail.fields) { r = {}; def.detail.fields.forEach((f) => setPath(r, f.key, f.format ? formatType(f.format) : fieldType(f))); }
      else r = { sales: [{ id: 'string (uuid)', created_at: 'datetime', receipt_number: 'string', cashier_name: 'string', payment_method: 'string', grand_total: 'number' }] };
      if (!eps.some((e) => e.path === def.detail.endpoint)) add({ method: 'GET', path: def.detail.endpoint, summary: def.detail.title || 'Row detail.', response: { data: r } });
    }
  } else if (def.kind === 'settings') {
    const full = bodySchema(def.fields);
    add({ method: 'GET', path: def.endpoint, summary: 'Read ' + def.title.toLowerCase() + (def.kind === 'settings' ? ' settings.' : '.'), response: { data: full }, note: def.responseNote });
    if (!def.readOnly) add({ method: def.method || 'PUT', path: def.endpoint, summary: 'Save ' + def.title.toLowerCase() + ' settings.', body: bodySchema(def.fields, { writable: true }), required: requiredKeys(def.fields), response: { data: full }, note: def.requestNote });
  }
  (def.toolbar || []).forEach((a) => add(actionEndpoint(a)));
  (def.rowActions || []).forEach((a) => add(actionEndpoint(a)));
  (def.endpoints || []).forEach((e) => add(e));
  // de-duplicate (same method + path)
  const seen = new Set();
  return eps.filter((e) => { const k = e.method + ' ' + e.path; if (seen.has(k)) return false; seen.add(k); return true; });
}

/* ---------------- markdown ---------------- */
function json(v) { return '```json\n' + JSON.stringify(v, null, 2) + '\n```'; }

function renderEndpoint(e) {
  let s = '#### `' + e.method + ' ' + e.path + '`\n\n' + (e.summary || '') + (e.auth === false ? ' *(no token required)*' : '') + '\n\n';
  const params = (e.path.match(/\{(\w+)\}/g) || []).map((p) => p.slice(1, -1));
  if (params.length) s += '**Path:** ' + params.map((p) => '`' + p + '`').join(', ') + '\n\n';
  if (e.query) {
    const rows = Object.entries(e.query).filter(([, v]) => v !== undefined);
    if (rows.length) s += '**Query parameters**\n\n| Name | Type |\n|---|---|\n' + rows.map(([k, v]) => '| `' + k + '` | ' + String(v).replace(/\|/g, '\\|') + ' |').join('\n') + '\n\n';
  }
  if (e.body && Object.keys(e.body).length) {
    s += '**Request body** (' + (e.contentType || 'application/json') + ')' + (e.required && e.required.length ? ' — required: ' + e.required.join(', ') : '') + '\n\n' + json(e.body) + '\n\n';
  }
  s += '**Response** ' + (e.status || (e.isFile ? '200 OK' : (typeof e.response === 'string' && /^204/.test(e.response) ? '' : '200 OK'))) + '\n\n';
  s += typeof e.response === 'string' ? e.response + '\n\n' : json(wire(e.response, e)) + '\n\n';
  if (e.note) s += '> ' + e.note + '\n\n';
  return s;
}

const TYPE_REFS = [
  ['<Pagination>', '`{ "page": integer, "per_page": integer, "total": integer, "total_pages": integer }`'],
  ['<User>', 'The `data` object of `GET /auth/me`.'],
  ['<Product>', 'The `data` object of `GET /products/{id}`.'],
  ['<StockLevel>', 'One row of `GET /inventory/stocks`.'],
  ['<StockOpname>', 'The `data` object of `GET /stock-opnames/{id}`.'],
  ['<PurchaseReturn>', 'The `data` object of `GET /purchase-returns/{id}`.'],
  ['<StockTransfer>', 'The `data` object of `GET /stock-transfers/{id}`.'],
  ['<Invoice>', 'One row of `GET /billing/invoices` (includes `payment_url` and `payment_instructions`).'],
  ['<PpobDeposit>', 'One row of `GET /ppob/deposits`.'],
  ['<CatalogOrder>', 'The `data` object of `GET /catalog/orders/{id}`.'],
  ['<HelpAccess>', 'The `data` object of `GET /help-access/{id}`.'],
  ['<Notification>', 'One row of `GET /notifications`.'],
];

function build() {
  const L = loadRegistry();
  const seenPages = new Set();
  const sections = [];
  const all = [];
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const firstSeen = new Map(); // "METHOD path" → section title where it is documented
  // shared endpoints
  const sharedGroups = {};
  L.sharedEndpoints.forEach((e) => { (sharedGroups[e.group] = sharedGroups[e.group] || []).push(e); all.push(e); firstSeen.set(e.method + ' ' + e.path, e.group); });
  let shared = '## Core\n\n';
  Object.entries(sharedGroups).forEach(([g, eps]) => { shared += '### ' + g + '\n\n' + eps.map(renderEndpoint).join(''); });
  sections.push(shared);

  const toc = [];
  const pageIds = (items) => items.flatMap((it) => (typeof it === 'string' ? [it] : pageIds(it.items)));
  L.groups.forEach((g) => {
    const ids = pageIds(g.items);
    let s = '## ' + g.label + '\n\n';
    toc.push('- [' + g.label + '](#' + slug(g.label) + ')');
    ids.forEach((id) => {
      const def = L.getPage(id);
      if (!def) return;
      seenPages.add(id);
      const eps = pageEndpoints(def);
      eps.forEach((e) => all.push(e));
      const fresh = [], reused = [];
      eps.forEach((e) => {
        const k = e.method + ' ' + e.path;
        if (firstSeen.has(k)) reused.push('`' + k + '` (see [' + firstSeen.get(k) + '](#' + slug(firstSeen.get(k)) + '))');
        else { firstSeen.set(k, def.title); fresh.push(e); }
      });
      toc.push('  - [' + def.title + '](#' + slug(def.title) + ') — ' + eps.length + ' endpoint' + (eps.length === 1 ? '' : 's'));
      s += '### ' + def.title + '\n\n*Screen:* `app.html#/' + def.id + '`' + (def.plugin ? ' · requires the `' + def.plugin + '` plugin' : '') + (def.description ? '  \n' + def.description : '') + '\n\n';
      if (reused.length) s += '*Also uses:* ' + reused.join(', ') + '\n\n';
      s += fresh.map(renderEndpoint).join('');
    });
    sections.push(s);
  });
  const orphan = [...L.pages.keys()].filter((id) => !seenPages.has(id));
  if (orphan.length) throw new Error('Pages missing from the menu: ' + orphan.join(', '));

  const uniq = new Set(all.map((e) => e.method + ' ' + e.path));
  const head = `# Lestari API — endpoints used by lestari-client

> Generated by \`node tools/generate-endpoints.js\` from the page definitions in \`js/modules/\`. Do not edit by hand — change the module and regenerate.

This is the contract the HTML client expects from the Lestari backend. It covers every back-office feature of the client (${L.pages.size} screens, ${uniq.size} endpoints). All attribute names are English \`snake_case\`.

## Conventions

| | |
|---|---|
| Base URL | configured in \`js/config.js\` → \`apiBaseUrl\` (default \`http://localhost:8080/api/v1\`). Every path below is relative to it. |
| Auth | \`Authorization: Bearer <access_token>\` on every request except those marked *no token required*. Tokens come from \`POST /auth/login\`; on \`401\` the client calls \`POST /auth/refresh\` once, then returns to the login page. |
| IDs | every \`id\`, \`*_id\` and \`*_ids\` value is a UUID v7 string generated by PostgreSQL (e.g. \`019a5f3c-8b2e-7d41-9c3a-5e8f1b2c4d6a\`). UUID v7 is time-ordered, so sorting by \`id\` follows creation order. Path parameters that are not valid UUIDs return \`404\`; malformed ids in a body return \`400\`/\`422\`. Exceptions: missions use their \`code\` as \`id\`, and plugins/vouchers are addressed by \`code\`. |
| Branch | \`X-Branch-Id: <branch id>\` (UUID) is sent when the user picked a branch in the top bar. Without it the server uses the user's default branch. All data is scoped to the store + branch. |
| Passwords | every password attribute (\`password\`, \`current_password\`, \`new_password\`, \`new_password_confirmation\`) is sent **base64-encoded** — the UTF-8 bytes of the password in the standard alphabet, e.g. \`demo12345\` → \`ZGVtbzEyMzQ1\`. A value that is not base64 is rejected with \`422\`. PINs (\`new_pin\`, \`ppob_pin\`) are sent as plain digits. Base64 is an encoding, not encryption — always serve the API over HTTPS. |
| Content type | \`application/json\` (UTF-8) unless an endpoint says \`multipart/form-data\`. |
| Dates | \`date\` = \`YYYY-MM-DD\` in the store's time zone; \`datetime\` = ISO 8601 with offset, e.g. \`2026-11-08T10:32:00+07:00\`. |
| Money | plain JSON numbers in the store currency (IDR has no decimals). Percentages are 0–100. |
| Nullable | any field not marked required may be \`null\`. |
| Files | export/download endpoints return the file body with \`Content-Disposition: attachment; filename="…"\`. Images are uploaded first with \`POST /uploads\`; forms then store the returned URL. |
| Language | every request sends \`Accept-Language: en\` or \`Accept-Language: id\` (the language picked in the client). Error messages, notifications and generated documents (receipts, invoices, exports) come back in that language; without the header the account's \`/settings/display\` \`language\` is used, then English. |
| CORS | the client is a static site, so the API must allow its origin, the \`Authorization\`, \`X-Branch-Id\`, \`Accept-Language\` and \`Content-Type\` headers, and expose \`Content-Disposition\`. |

### Response envelope

Every JSON response, success or error, has the same envelope:
\`\`\`json
{
  "request_id": "6ba3451b-ac73-483e-8481-2ac53f5e75a2",
  "request_url": "GET http://localhost:8080/api/v1/taxes/019a5f3c-8b2e-7d41-9c3a-5e8f1b2c4d6a",
  "status_code": 200,
  "status": "OK",
  "message": "",
  "timestamp": "2026-11-11T14:22:47.608963985+07:00",
  "latency": "7.746177ms",
  "data": { "id": "019a5f3c-8b2e-7d41-9c3a-5e8f1b2c4d6a", "name": "…" },
  "app": "lestari"
}
\`\`\`
\`request_id\` is also sent as the \`X-Request-Id\` header. \`204 No Content\` has no body. The examples below show the
whole envelope with placeholder values for the fixed attributes.

List — \`data\` is a page of \`rows\` (all list endpoints accept \`page\` (from 1), \`per_page\`, \`q\`, \`sort\`, \`order\`).
\`links\` are ready-made URLs; \`previous\` / \`next\` are empty at the ends. Lists that are never paged return every row
with \`pages: 1\`:
\`\`\`json
"data": {
  "links": { "first": "…/taxes?per_page=25", "previous": "", "current": "…/taxes?page=1&per_page=25", "next": "…/taxes?page=2&per_page=25", "last": "…/taxes?page=5&per_page=25" },
  "info": { "limit": 25, "page": 1, "pages": 5, "total": 120 },
  "rows": [ { "id": "…" } ]
}
\`\`\`
In the examples \`"<Links>"\` and \`"<Info>"\` stand for these two objects.

Report — a list plus aggregates next to \`rows\`:
\`\`\`json
"data": { "links": { … }, "info": { … }, "rows": [ … ], "summary": { … }, "totals": { … }, "chart": [ … ] }
\`\`\`

Error (any 4xx/5xx) — \`message\` is the text to show (in the request language), \`data.code\` is a stable machine
code, and \`data.fields\` (422) maps request attributes to messages shown next to the form inputs:
\`\`\`json
{
  "request_id": "…", "request_url": "POST http://localhost:8080/api/v1/taxes",
  "status_code": 422, "status": "Unprocessable Entity",
  "message": "Some fields are invalid.",
  "timestamp": "…", "latency": "…",
  "data": { "code": "validation_failed", "fields": { "name": ["Required"] } },
  "app": "lestari"
}
\`\`\`

| Status | When | \`data.code\` examples |
|---|---|---|
| 400 | malformed request | \`bad_request\` |
| 401 | missing/expired token, wrong credentials | \`unauthenticated\`, \`invalid_credentials\`, \`two_factor_required\` |
| 402 | feature needs a plugin or active subscription | \`plugin_required\`, \`subscription_expired\` |
| 403 | role lacks the permission | \`forbidden\` |
| 404 | not found in this store/branch | \`not_found\` |
| 409 | conflict (duplicate SKU, already processed) | \`conflict\` |
| 422 | validation | \`validation_failed\` |
| 429 | rate limited | \`too_many_requests\` |

### Type references

| Reference | Meaning |
|---|---|
${TYPE_REFS.map(([k, v]) => '| `' + k + '` | ' + v + ' |').join('\n')}

## Contents

- [Core](#core)
${toc.join('\n')}

`;
  return { md: head + sections.join('\n') + '\n', all, L };
}

/* ---------------- coverage check ---------------- */
function check(all) {
  const documented = [...new Set(all.map((e) => e.path))].map((p) => new RegExp('^' + p.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\\{\w+\\\}|\{\w+\}/g, '[^/]+') + '$'));
  const files = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((x) => { const p = path.join(d, x.name); if (x.isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); });
  walk(path.join(ROOT, 'js'));
  files.push(path.join(ROOT, 'index.html'));
  const missing = [];
  const re = /Api\.(?:get|post|put|patch|del|upload|download|request)\(\s*(?:'(?:GET|POST|PUT|PATCH|DELETE)',\s*)?((?:'[^']*'|[A-Za-z_.]+(?:\([^)]*\))?)(?:\s*\+\s*(?:'[^']*'|[A-Za-z_.]+(?:\([^)]*\))?))*)/g;
  files.forEach((f) => {
    const src = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(src))) {
      const expr = m[1];
      if (!/^'\//.test(expr)) continue; // dynamic (def.endpoint, path variables) — covered by generator
      const p = expr.split(/\s*\+\s*/).map((part) => (part.startsWith("'") ? part.slice(1, -1) : 'X')).join('').replace(/\/X(?=\/|$)/g, '/{x}');
      const norm = p.replace(/\{x\}/g, 'X');
      if (!documented.some((r) => r.test(norm))) missing.push(path.relative(ROOT, f) + ': ' + p);
    }
  });
  return missing;
}

module.exports = { loadRegistry, pageEndpoints, build };

if (require.main === module) {
  const { md, all } = build();
  fs.writeFileSync(path.join(ROOT, 'ENDPOINTS.md'), md);
  const n = new Set(all.map((e) => e.method + ' ' + e.path)).size;
  console.log('ENDPOINTS.md written: ' + n + ' endpoints');
  if (process.argv.includes('--check')) {
    const missing = check(all);
    if (missing.length) { console.error('Undocumented API calls:\n  ' + missing.join('\n  ')); process.exit(1); }
    console.log('Check passed: every literal API path in js/ and index.html is documented.');
  }
}
