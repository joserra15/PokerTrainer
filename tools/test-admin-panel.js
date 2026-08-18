/* RG-G01 — Admin panel: acceso solo isAdmin; lockdown para no-admin. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '..', 'js/admin-panel.js'), 'utf8');
assert.ok(/hasAdminAccess|hasAccess/.test(src), 'hasAccess');
assert.ok(/isAdmin/.test(src), 'isAdmin gate');
assert.ok(/lockdown/.test(src), 'lockdown');
assert.ok(/pt-is-admin|tab-admin|account-admin/.test(src), 'UI admin markers');
assert.ok(/pt_admin_usage_stats/.test(src) && /renderSchoolSection/.test(src), 'uso + escuela admin');
assert.ok(/pt_admin_guest_funnel/.test(src) && /renderGuestFunnelSection/.test(src), 'embudo landing en uso');
assert.ok(/function scheduleAutoStripeSync\(\)/.test(src), 'auto sync desacoplado');
assert.ok(/AUTO_STRIPE_SYNC_COOLDOWN_MS = 10 \* 60 \* 1000/.test(src), 'cooldown auto sync');
assert.ok(/refresh\(\)\.then\(function \(\) \{\s*if \(hasAdminAccess\(\)\) scheduleAutoStripeSync\(\);/m.test(src), 'render carga antes de sync');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.ok(/id="tab-admin"|data-tab="admin"|account-admin/.test(html), 'admin en HTML');
assert.ok(/admin-usage-panel/.test(html), 'panel uso en HTML');

const localStore = {};
const sandbox = {
  window: {},
  console,
  document: {
    body: { classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} } },
    getElementById() {
      return {
        classList: { add() {}, remove() {}, contains() { return true; }, toggle() {} },
        className: '',
        hidden: true,
        style: {},
        textContent: '',
        innerHTML: '',
        setAttribute() {},
        getAttribute() { return null; },
        addEventListener() {},
        querySelector() { return null; },
        querySelectorAll() { return []; }
      };
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}
  },
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  },
  addEventListener() {},
  dispatchEvent() { return true; },
  CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; }
};
sandbox.global = sandbox;
sandbox.window = sandbox;

let user = { sub: 'u1', email: 'a@b.c', name: 'A', isAdmin: false };
sandbox.PTAuth = {
  getUser() { return user; }
};
sandbox.PTDemo = { isActive() { return false; } };

vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'admin-panel.js' });

const Admin = sandbox.window.PTAdmin || sandbox.PTAdmin;
assert.ok(Admin, 'PTAdmin');

if (typeof Admin.hasAccess === 'function') {
  assert.strictEqual(Admin.hasAccess(), false, 'no-admin sin acceso');
  user = { sub: 'u1', email: 'a@b.c', name: 'A', isAdmin: true };
  assert.strictEqual(Admin.hasAccess(), true, 'admin con acceso');
  user = { sub: 'u1', email: 'a@b.c', name: 'A', isAdmin: false };
}

if (typeof Admin.lockdown === 'function') {
  assert.doesNotThrow(() => Admin.lockdown());
}

console.log('*** admin-panel OK ***');
