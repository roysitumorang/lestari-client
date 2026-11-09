#!/usr/bin/env node
/**
 * Bahasa Indonesia coverage check.
 *
 *   node tools/i18n-check.js            # lists English strings with no entry in js/i18n/id.js (exit 1 if any)
 *   node tools/i18n-check.js --keys     # prints every translatable string as JSON (used to build dictionaries)
 *
 * Strings are collected from:
 *   - page definitions and menu groups (the same walk core/i18n.js does at registration),
 *   - T('…') / I18n.t('…') literals in js/,
 *   - data-i18n* attributes in the HTML pages,
 *   - badge values: the option values of fields shown as badges (statuses, types …).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SCRIPTS = [
  'js/config.js', 'js/core/i18n.js', 'js/core/registry.js', 'js/core/api.js', 'js/core/ui.js', 'js/core/charts.js',
  'js/components/actions.js', 'js/components/crud.js', 'js/components/report.js', 'js/components/settings.js',
  'js/modules/_common.js', 'js/modules/dashboard.js', 'js/modules/database.js', 'js/modules/transactions.js',
  'js/modules/reports.js', 'js/modules/branches.js', 'js/modules/settings.js', 'js/modules/commerce.js', 'js/menu.js',
];

const DATA_VALUES = [
  'owner', 'administrator', 'manager', 'cashier', 'active', 'inactive', 'invited', 'revoked', 'present', 'late', 'absent', 'leave',
  'pending', 'paid', 'unpaid', 'partially_paid', 'completed', 'success', 'failed', 'cancelled', 'expired', 'submitted', 'queued',
  'approved', 'rejected', 'processing', 'shipped', 'delivered', 'received', 'in_transit', 'draft', 'claimed', 'available',
  'in_progress', 'trial', 'refunded', 'void', 'earned', 'redeemed', 'adjusted', 'adjustment', 'opname', 'sale', 'purchase', 'return',
  'transfer_in', 'transfer_out', 'income', 'expense', 'payable', 'receivable', 'prepaid', 'postpaid', 'cash', 'qris', 'debit',
  'bank', 'bank_transfer', 'virtual_account', 'e_wallet', 'top_up', 'coin_topup', 'subscription', 'storage', 'online_order',
  'online_store', 'direct', 'back_office', 'percent', 'amount', 'product_discount', 'minimum_purchase', 'basic', 'pro', 'business',
  'pulsa', 'data', 'pln_token', 'pln_postpaid', 'e_money', 'game_voucher', 'gas_postpaid', 'internet_tv', 'streaming', 'bpjs', 'pdam', 'telkom',
];

function walk(dir, ext, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { if (f.name !== 'i18n') walk(p, ext, out); } else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}

function collect() {
  const keys = new Set();
  const add = (s) => { if (typeof s === 'string' && s.trim() && /[A-Za-z]/.test(s)) keys.add(s); };

  // 1. registry: load with lang=id and a dictionary proxy that records every lookup
  const store = { 'lestari.lang': 'id' };
  const ctx = {
    console, Intl, Date, Math, JSON, URL, setTimeout, clearTimeout, Object, Array, String, Set, Map, Proxy,
    localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } },
    navigator: { language: 'id' },
    document: { addEventListener() {} },
    location: { pathname: '/', hash: '', reload() {} },
  };
  ctx.LESTARI_I18N_ID = new Proxy({}, { getOwnPropertyDescriptor(_, k) { add(k); return undefined; } });
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  SCRIPTS.forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));

  // badge values: option values of fields formatted as badges (lists, filters, forms share keys)
  const badgeKeys = new Set();
  const optionValues = {};
  const scan = (o) => {
    if (Array.isArray(o)) return o.forEach(scan);
    if (!o || typeof o !== 'object') return;
    if (o.format === 'badge' && o.key) badgeKeys.add(o.key);
    if (o.key && Array.isArray(o.options)) (optionValues[o.key] = optionValues[o.key] || new Set()), o.options.forEach((x) => optionValues[o.key].add(x && typeof x === 'object' ? x.value : x));
    Object.keys(o).forEach((k) => { if (k !== 'endpoints' && typeof o[k] === 'object') scan(o[k]); });
  };
  Object.values(ctx.Lestari.pages || {}).forEach(scan);
  badgeKeys.forEach((k) => (optionValues[k] || []).forEach((v) => add(String(v))));

  // values the API returns in badge columns even when no option list names them
  DATA_VALUES.forEach(add);

  // 2. T('…') literals, T(cond ? 'a' : 'b'), and text keys of object literals built at run time (custom pages, forms)
  const lit = /(?:\bT|I18n\.t)\(\s*'((?:[^'\\]|\\.)*)'/g;
  const cond = /(?:\bT|I18n\.t)\([^()']*\?\s*'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'/g;
  const prop = /\b(?:label|title|description|placeholder|help|confirm|success|okText|submitText|emptyText|singular|searchPlaceholder|info|createLabel|savedText)\s*:\s*'((?:[^'\\]|\\.)*)'(?!\s*\+)/g;
  const call = /\b(?:emptyState|toast|confirm|errorToast|stat)\(\s*'((?:[^'\\]|\\.)*)'(?!\s*\+)/g;
  const unq = (s) => s.replace(/\\'/g, "'");
  walk(path.join(ROOT, 'js'), '.js').forEach((f) => {
    const src = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = lit.exec(src))) add(unq(m[1]));
    while ((m = cond.exec(src))) { add(unq(m[1])); add(unq(m[2])); }
    while ((m = call.exec(src))) add(unq(m[1]));
    if (f.includes(path.sep + 'modules' + path.sep)) while ((m = prop.exec(src))) if (!/^[a-z0-9_]+$/.test(m[1]) && !/^(string|number|integer|boolean)\b/.test(m[1])) add(unq(m[1]));
  });
  // 3. data-i18n attributes
  const attr = /data-i18n(?:-[a-z-]+)?="([^"]+)"/g;
  fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).forEach((f) => {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    let m; while ((m = attr.exec(src))) add(m[1].replace(/&amp;/g, '&'));
  });
  return [...keys].sort();
}

const keys = collect();
if (process.argv.includes('--keys')) {
  process.stdout.write(JSON.stringify(keys, null, 1) + '\n');
  process.exit(0);
}
const dictCtx = { window: {} };
vm.createContext(dictCtx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/i18n/id.js'), 'utf8'), dictCtx);
const dict = dictCtx.window.LESTARI_I18N_ID || {};
const missing = keys.filter((k) => !Object.prototype.hasOwnProperty.call(dict, k));
const placeholders = keys.filter((k) => dict[k] && (k.match(/\{\w+\}/g) || []).sort().join() !== (dict[k].match(/\{\w+\}/g) || []).sort().join());
console.log(keys.length + ' strings, ' + (keys.length - missing.length) + ' translated, ' + missing.length + ' missing, ' + placeholders.length + ' placeholder mismatches');
missing.forEach((k) => console.log('  missing: ' + JSON.stringify(k)));
placeholders.forEach((k) => console.log('  placeholders differ: ' + JSON.stringify(k)));
process.exit(missing.length || placeholders.length ? 1 : 0);
