#!/usr/bin/env node
/**
 * Writes the Bahasa Indonesia dictionary (js/i18n/id.js) as plain JSON, e.g. for the Android app:
 *   node tools/i18n-export.js ../lestari-mobile/app/src/main/assets/i18n/id.json
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const out = process.argv[2];
if (!out) { console.error('usage: node tools/i18n-export.js <output.json>'); process.exit(2); }
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js/i18n/id.js'), 'utf8'), ctx);
const dict = ctx.window.LESTARI_I18N_ID;
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, JSON.stringify(dict, Object.keys(dict).sort(), 1) + '\n');
console.log(Object.keys(dict).length + ' entries → ' + out);
