/* FOUNDER request UI + migration markers */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/037_founder_seats.sql'), 'utf8');
const founderSrc = fs.readFileSync(path.join(root, 'js/founder-request.js'), 'utf8');
const adminSrc = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
const accountSrc = fs.readFileSync(path.join(root, 'js/account-settings.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const billingSrc = fs.readFileSync(path.join(root, 'js/billing.js'), 'utf8');

assert.ok(/is_founder/.test(migration), 'migration is_founder');
assert.ok(/pt_request_founder_seat/.test(migration), 'migration request RPC');
assert.ok(/Solicitud de Founder/.test(migration), 'subject Solicitud de Founder');
assert.ok(/p_is_founder/.test(migration), 'admin update p_is_founder');
assert.ok(/founder_requested_at/.test(migration), 'founder_requested_at');

assert.ok(/PTFounderRequest/.test(founderSrc), 'PTFounderRequest export');
assert.ok(/tryRequestAfterLogin/.test(founderSrc), 'tryRequestAfterLogin');
assert.ok(/pt_request_founder_seat/.test(founderSrc), 'RPC client call');

assert.ok(/founder-request\.js/.test(html), 'founder-request en early scripts');
assert.ok(/admin-filter-founder/.test(html), 'filtro Founder en admin');
assert.ok(/data-sort="founder"/.test(html), 'sort Founder en admin');

assert.ok(/data-field="is_founder"/.test(adminSrc), 'checkbox Founder en tabla');
assert.ok(/p_is_founder/.test(adminSrc), 'updateUser envía p_is_founder');
assert.ok(/adminUsersFilters\.founder/.test(adminSrc), 'filtro founder en JS');

assert.ok(/FOUNDER/.test(accountSrc) && /is_founder/.test(accountSrc), 'cuenta muestra Founder');
assert.ok(/data-founder-request/.test(billingSrc), 'paywall CTA founder');

const sandbox = {
  window: {},
  console,
  sessionStorage: {
    _d: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; }
  },
  document: { getElementById() { return null; } },
  alert() {},
  setTimeout(fn) { return fn(); }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(founderSrc, sandbox, { filename: 'founder-request.js' });
assert.ok(sandbox.PTFounderRequest, 'export global');
assert.strictEqual(sandbox.PTFounderRequest.subject, 'Solicitud de Founder');
sandbox.PTFounderRequest.markPending();
assert.ok(sandbox.PTFounderRequest.hasPending(), 'pending flag');
sandbox.PTFounderRequest.clearPending();
assert.ok(!sandbox.PTFounderRequest.hasPending(), 'clear pending');

console.log('*** founder-request OK ***');
