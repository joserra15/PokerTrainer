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
assert.ok(/pt_admin_quota_probe/.test(src), 'admin sondea cuota localStorage');
assert.ok(/Store\.freeStorageSpace/.test(src), 'admin libera cuota si probe falla');
assert.ok(/admin-push-test/.test(src) && /adminSendPush/.test(src), 'admin envía push de prueba');
assert.ok(/id="admin-detail-send-form"/.test(src) && /id="admin-detail-send-msg"/.test(src), 'enviar mensaje en detalle de usuario');
assert.ok(/function canAdminMessageUser/.test(src) && /DEMO_USER_ID/.test(src), 'no mensaje a demo ni a uno mismo');
assert.ok(/targetMode: 'single'/.test(src) && /userIds: \[p\.user_id\]/.test(src), 'envío single al usuario del detalle');
assert.ok(/function notifyAdminMessagePush/.test(src), 'push al enviar mensaje de admin');
assert.ok(/notifyAdminMessagePush\(\{[\s\S]*userIds: pushIds/.test(src), 'push conserva destinatarios antes del reset');
assert.ok(/notifyAdminMessagePush\(\{[\s\S]*allUsers: pushAll/.test(src), 'push a todos si el mensaje es broadcast');
assert.ok(/pt_admin_contact_reply[\s\S]*notifyAdminMessagePush/.test(src), 'push al responder hilo');
assert.ok(/source=push&tab=contact/.test(src), 'deep link a Contacto');
assert.ok(/function userHasPush/.test(src) && /pushStatusCell/.test(src), 'lista muestra estado push');
assert.ok(/admin-filter-push/.test(src) && /push === 'on'/.test(src), 'filtro push activado/no');
assert.ok(/data-col="push"/.test(src) && /colspan="11"/.test(src), 'columna Push en tabla');
assert.ok(/PLAN_AI_LIMITS = \{ free: 3, pro: 40, premium: 150 \}/.test(src), 'límites IA alineados con planes');
assert.ok(/function confirmAdminChange/.test(src) && /¿Cambiar el plan/.test(src), 'confirmación al cambiar plan');
assert.ok(/toISOString\(\)\.slice\(0, 10\)/.test(src), 'filtros de fecha en UTC');
assert.ok(/T23:59:59\.999Z/.test(src), 'fin de plan en UTC');
assert.ok(/function patchUserInCache/.test(src) && /renderUsersTable\(\);\s*renderAdminStats\(\);/.test(src), 'refresh parcial tras update');
assert.ok(/function exportUsersCsv/.test(src) && /admin-export-csv/.test(src), 'export CSV');
assert.ok(/function renderUsersPagination/.test(src) && /adminUsersPageSize/.test(src), 'paginación de usuarios');
assert.ok(/function renderFounderQueue/.test(src) && /pending_founder/.test(src), 'cola FOUNDER');
assert.ok(/function statusBadgeHtml/.test(src) && /admin-status-badge/.test(src), 'badge de estado');
assert.ok(/admin-filter-status/.test(src), 'filtro por estado');
assert.ok(/function renderKoinsEditForm/.test(src) && /data-admin-set-koins/.test(src), 'formulario editar Koins');
assert.ok(/function setUserKoins/.test(src) && /pt_admin_set_user_koins/.test(src), 'RPC setUserKoins');
assert.ok(/admin-koins-community/.test(src) && /admin-koins-mode/.test(src) && /admin-koins-amount/.test(src), 'campos Koins');
assert.ok(/p_mode: mode/.test(src) && /p_notify: true/.test(src), 'modo set/add y notificación Koins');
assert.ok(/pt_admin_user_koins_by_community/.test(src), 'cargan saldos Koins por comunidad');
assert.ok(/communityId: data\.community_id \|\| communityId/.test(src), 'push Koins con communityId');
assert.ok(/encodeURIComponent\(communityId\)/.test(src) && /app=/.test(src),
  'deep link Contacto con app comunidad');

const koinsMig = fs.readFileSync(
  path.join(__dirname, '..', 'supabase/migrations/057_admin_set_user_koins.sql'),
  'utf8'
);
assert.ok(/pt_admin_set_user_koins/.test(koinsMig), 'migración RPC Koins');
assert.ok(/pt_community_tournament_koins/.test(koinsMig), 'migración actualiza ranking');
assert.ok(/tournamentWallet/.test(koinsMig), 'migración actualiza wallet');

const koinsMig60 = fs.readFileSync(
  path.join(__dirname, '..', 'supabase/migrations/060_admin_koins_contact_community.sql'),
  'utf8'
);
assert.ok(/community_id/.test(koinsMig60) && /notify_community_id/.test(koinsMig60),
  '060 notifica Contacto en la comunidad correcta');
assert.ok(/pt_admin_user_koins_by_community/.test(koinsMig60), '060 saldos por comunidad');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.ok(/id="tab-admin"|data-tab="admin"|account-admin/.test(html), 'admin en HTML');
assert.ok(/admin-usage-panel/.test(html), 'panel uso en HTML');
assert.ok(/id="admin-filter-push"/.test(html) && /data-sort="push"/.test(html), 'columna y filtro Push');
assert.ok(/id="admin-filter-status"/.test(html), 'filtro estado en HTML');
assert.ok(/id="admin-export-csv"/.test(html), 'botón export CSV');
assert.ok(/id="admin-founder-queue"/.test(html), 'cola FOUNDER en HTML');
assert.ok(/id="admin-users-pagination"/.test(html), 'paginación en HTML');

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
