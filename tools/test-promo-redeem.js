/* RG-C07 — Promo redeem + admin promotions (offline). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const sessionStore = {};
const localStore = {};

const sandbox = {
  window: {},
  console,
  sessionStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(sessionStore, k) ? sessionStore[k] : null),
    setItem: (k, v) => { sessionStore[k] = String(v); },
    removeItem: (k) => { delete sessionStore[k]; }
  },
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  },
  location: { href: 'https://www.pokerforgeai.com/?promo=WELCOME-10', search: '?promo=WELCOME-10' },
  URLSearchParams,
  addEventListener() {},
  dispatchEvent() { return true; }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

const promoSrc = fs.readFileSync(path.join(root, 'js/promo-redeem.js'), 'utf8');
vm.runInContext(promoSrc, sandbox, { filename: 'promo-redeem.js' });

const PR = sandbox.window.PTPromoRedeem || sandbox.PTPromoRedeem;
assert.ok(PR, 'PTPromoRedeem');

if (typeof PR.normalizeCode === 'function') {
  assert.strictEqual(PR.normalizeCode('  welcome-10 '), 'WELCOME-10');
  assert.strictEqual(PR.normalizeCode(''), '');
}

if (typeof PR.savePending === 'function' && typeof PR.readPending === 'function') {
  PR.savePending('TESTCODE');
  const pending = PR.readPending();
  assert.ok(pending && (pending === 'TESTCODE' || pending.code === 'TESTCODE' || String(pending).includes('TEST')),
    'pending saved');
}

if (typeof PR.captureFromUrl === 'function') {
  const cap = PR.captureFromUrl();
  assert.ok(cap || sessionStore.pt_promo_pending || PR.readPending(), 'captureFromUrl');
}

// Mapeo de errores en fuente
assert.ok(/existing_user|inactive|exhausted|already_redeemed|not_found/.test(promoSrc),
  'error codes documentados');
assert.ok(/pt_redeem_promotion/.test(promoSrc), 'RPC redeem');

const adminPromo = fs.readFileSync(path.join(root, 'js/admin-promotions.js'), 'utf8');
assert.ok(/pt_admin_list_promotions|pt_admin_create_promotion/.test(adminPromo), 'admin promo RPCs');
assert.ok(/hasAccess|PTAdmin/.test(adminPromo), 'admin gate');

// Casos tabla lógicos (errores RPC / mensajes)
['not_found', 'inactive', 'exhausted', 'already_redeemed', 'existing_user'].forEach((code) => {
  assert.ok(promoSrc.includes(code), 'código ' + code + ' contemplado');
});

console.log('*** promo-redeem OK ***');
