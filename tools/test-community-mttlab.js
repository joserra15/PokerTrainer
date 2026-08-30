/* Multi-comunidad: configs, gates SQL, menús MTT Lab, aislamiento PF. */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.join(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

// —— Archivos base ——
assert.ok(fs.existsSync(path.join(root, 'js/community.js')), 'community.js');
assert.ok(fs.existsSync(path.join(root, 'js/community-config-mttlab.js')), 'config mttlab');
assert.ok(fs.existsSync(path.join(root, 'js/community-config-pokerforge.js')), 'config pokerforge');
assert.ok(fs.existsSync(path.join(root, 'js/school-data-mttlab.js')), 'school mttlab');
assert.ok(fs.existsSync(path.join(root, 'js/manager-panel.js')), 'manager panel');
assert.ok(fs.existsSync(path.join(root, 'mttlab/index.html')), 'entry /mttlab/');
assert.ok(fs.existsSync(path.join(root, 'icons/mttlab-logo.jpg')) ||
  fs.existsSync(path.join(root, 'icons/mttlab-logo.png')), 'logo mttlab');
assert.ok(fs.existsSync(path.join(root, 'supabase/migrations/043_communities.sql')), 'migration 043');
assert.ok(fs.existsSync(path.join(root, 'supabase/migrations/044_community_admin_ai_welcome.sql')), 'migration 044');

const html = read('index.html');
assert.ok(html.includes('community-config-mttlab.js'), 'index carga config mttlab');
assert.ok(html.includes('js/community.js'), 'index carga community.js');
assert.ok(/data-tab="manager"/.test(html), 'tab manager en HTML');
assert.ok(/id="tab-manager"/.test(html), 'panel tab-manager');
assert.ok(/admin-filter-community/.test(html), 'filtro comunidad admin');
assert.ok(/admin-communities-btn/.test(html), 'botón Admin Comunidades');
assert.ok(/id="admin-communities-panel"/.test(html), 'panel Admin Comunidades');

const chunks = read('js/bundle-chunks.js');
assert.ok(chunks.includes('school-data-mttlab.js'), 'chunk school incluye mttlab');
assert.ok(/manager:\s*\[\s*'js\/manager-panel\.js'/.test(chunks), 'chunk manager');

const loader = read('js/pt-loader.js');
assert.ok(/manager:\s*'dist\/pt-manager\.js'/.test(loader), 'pt-loader manager');

const sql = read('supabase/migrations/043_communities.sql');
[
  'pt_communities',
  'pt_community_members',
  'pt_is_community_member',
  'pt_is_community_manager',
  'pt_assert_community_access',
  'pt_my_communities',
  'pt_join_community',
  'pt_admin_set_community_member',
  'pt_community_feature_access',
  'pt_manager_list_members',
  'pt_manager_member_usage',
  'pt_manager_contact_threads',
  'default_app',
  'community_id'
].forEach(function (needle) {
  assert.ok(sql.includes(needle), 'SQL tiene ' + needle);
});
assert.ok(/raise exception 'forbidden'/.test(sql), 'SQL usa forbidden');
assert.ok(/pt_admin_user_list/.test(sql) && /communities json/.test(sql), 'lista admin con communities');

const sql44 = read('supabase/migrations/044_community_admin_ai_welcome.sql');
[
  'welcome_message',
  'pt_admin_update_community',
  'pt_admin_community_detail',
  'pt_manager_set_welcome',
  'pt_manager_get_settings',
  'pt_community_ai_limit',
  'pt_community_ai_usage_month_count',
  'pt_my_community_ai_status',
  'pt_get_community_welcome',
  'p_community_id'
].forEach(function (needle) {
  assert.ok(sql44.includes(needle), 'SQL 044 tiene ' + needle);
});
assert.ok(/select 40/.test(sql44), 'cupo comunidad 40');
assert.ok(/community_id is null/.test(sql44), 'uso PF independiente (community_id null)');

// Manager RPCs no exponen stripe/plan en su cuerpo de retorno
assert.ok(!/create or replace function public\.pt_manager_list_members[\s\S]*?\$\$;[\s\S]*?stripe/i.test(
  sql.match(/create or replace function public\.pt_manager_list_members[\s\S]*?\$\$;/)[0]
), 'manager list sin stripe');
assert.ok(/pt_manager_member_usage[\s\S]{0,1200}school/.test(sql), 'manager usage escuela');

const site = read('js/site-config.js');
assert.ok(!/mttlab/.test(site), 'OAuth solo a / (sin redirect por comunidad)');
assert.ok(site.includes("appUrl: 'https://www.pokerforgeai.com/'"), 'appUrl raíz');

const app = read('js/app.js');
const commSrc = read('js/community.js');
assert.ok(/PTCommunity\.canOpenTab/.test(app), 'goToTab usa canOpenTab sync');
assert.ok(/goToTabUnlocked/.test(app), 'goToTabUnlocked');
assert.ok(/function canOpenTab/.test(commSrc), 'canOpenTab sync');
assert.ok(/PT_E2E_MODE/.test(commSrc), 'bypass E2E comunidad');
assert.ok(/tabId === 'manager'/.test(app), 'tab manager en app');
assert.ok(/welcomeFromManager/.test(app), 'home usa bienvenida manager');
assert.ok(/hideDailySpot/.test(app), 'home oculta spot del día en comunidad');
assert.ok(/hideQuickAccess/.test(app), 'home oculta accesos rápidos');
assert.ok(/aiCommunityId/.test(commSrc), 'cupo IA comunidad');
assert.ok(/communityDataSuffix|scopedDataKey/.test(read('js/storage.js')), 'storage namespaced por comunidad');
assert.ok(fs.existsSync(path.join(root, 'supabase/migrations/045_community_school_no_pf_fallback.sql')), 'migration 045');
assert.ok(fs.existsSync(path.join(root, 'supabase/migrations/046_community_contact_manager_fixes.sql')), 'migration 046');

const sql46 = read('supabase/migrations/046_community_contact_manager_fixes.sql');
assert.ok(/pt_contact_my_threads\(p_community_id/.test(sql46), 'contacto threads por comunidad');
assert.ok(/pt_contact_unread_count\(p_community_id/.test(sql46), 'unread por comunidad');
assert.ok(/Sin fallback a PokerForge|\/\* Sin fallback a PokerForge \*\//.test(sql46), '046 sin fallback PF escuela');
assert.ok(/return json_build_object\('ok', false, 'error', 'not_a_member'/.test(sql46), 'detalle not_a_member amigable');
assert.ok(/lower\(p\.email\) = lower\(uid\)/.test(sql46), 'detalle fallback email');

const auth = read('js/auth.js');
assert.ok(/gateAfterLogin/.test(auth), 'auth gate comunidad');
assert.ok(/resolveActiveFromMemberships/.test(commSrc), 'resolve post-login');
assert.ok(/ids\.length === 1/.test(commSrc), 'un solo acceso → ese shell');
assert.ok(/cleanEntryUrl/.test(commSrc), 'limpia ?app= tras login');
assert.ok(!/forced = /.test(commSrc), 'ya no fuerza shell por URL tras login');
assert.ok(/community-shell/.test(commSrc), 'clase community-shell');
assert.ok(/home-card\[data-go-tab="learn"\]/.test(commSrc), 'oculta card Guía básica');

const school = read('js/school.js');
assert.ok(/unlockMode\(\) === 'allOpen'/.test(school), 'allOpen unlock');
assert.ok(/bypassPaywalls/.test(school), 'bypass paywalls comunidad');
assert.ok(/externalLinks/.test(school), 'externalLinks UI');
assert.ok(/mttlab/.test(school), 'ruta mttlab en school');

const contact = read('js/contact.js');
assert.ok(/p_community_id/.test(contact), 'contacto envía community_id');
assert.ok(/contactThreadsRpcArgs|pt_contact_my_threads',\s*contactThreadsRpcArgs/.test(contact), 'lista hilos scoped');
assert.ok(/pt_contact_unread_count',\s*contactThreadsRpcArgs/.test(contact), 'unread scoped');

const account = read('js/account-settings.js');
assert.ok(/communitySettingsSection/.test(account), 'settings comunidades');
assert.ok(/setDefaultApp/.test(account), 'settings default app');

const admin = read('js/admin-panel.js');
assert.ok(/admin-filter-community|adminUsersFilters\.community/.test(admin), 'admin filtro comunidad');
assert.ok(/pt_admin_set_community_member/.test(admin), 'admin grant comunidad');
assert.ok(/Hacer manager|Quitar manager/.test(admin), 'admin marca manager');
assert.ok(/showAdminCommunities|pt_admin_list_communities/.test(admin), 'admin panel comunidades');
assert.ok(/pt_admin_update_community/.test(admin), 'admin edita join code / welcome');

const mgr = read('js/manager-panel.js');
assert.ok(/pt_manager_list_members/.test(mgr), 'manager lista');
assert.ok(/pt_manager_contact_/.test(mgr), 'manager mensajes');
assert.ok(/Sin datos de pago/.test(mgr) || /sin datos de pago/i.test(mgr), 'copy sin pagos');
assert.ok(/pt_manager_set_welcome/.test(mgr), 'manager edita bienvenida');
assert.ok(/ai_used_month/.test(mgr), 'manager muestra IA');
assert.ok(/school_passed|Escuela/.test(mgr), 'manager muestra escuela');
assert.ok(/online_count|Activos ahora/.test(mgr), 'manager activos');
assert.ok(/manager-member-cards/.test(mgr), 'manager cards móvil');
assert.ok(/data-manager-idx/.test(mgr), 'detalle por índice cache');
assert.ok(/formatMemberError|not_a_member/.test(mgr), 'error detalle amigable');

const billing = read('js/billing.js');
assert.ok(/requireMembership\(\)/.test(billing) && /mountAnnualUpsell/.test(billing), 'upsell oculto en comunidad');

assert.ok(/communityHide/.test(app), 'legendary respeta hide comunidad');
assert.ok(/manager-member-cards/.test(read('css/styles.css')), 'CSS manager responsive');
assert.ok(/body\.community-shell/.test(read('css/styles.css')), 'CSS oculta learn/legendary en comunidad');

const aiReport = read('js/ai-report.js');
assert.ok(/communityId/.test(aiReport), 'ai-report envía communityId');

const entitlements = read('js/entitlements.js');
assert.ok(/aiCommunityId|source: 'community'/.test(entitlements), 'entitlements cupo comunidad');

// —— Runtime configs ——
const sandbox = {
  window: {},
  console: console,
  document: {
    readyState: 'complete',
    body: { setAttribute: function () {}, classList: { toggle: function () {}, add: function () {}, remove: function () {} } },
    getElementById: function () { return null; },
    querySelectorAll: function () { return []; },
    querySelector: function () { return null; },
    addEventListener: function () {},
    createElement: function () { return { setAttribute: function () {}, appendChild: function () {}, addEventListener: function () {}, style: {}, classList: { add: function () {}, remove: function () {}, toggle: function () {} } }; }
  },
  sessionStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} },
  localStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} },
  location: { pathname: '/', search: '', hash: '' },
  history: { replaceState: function () {} }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(read('js/community-config-pokerforge.js'), sandbox);
vm.runInContext(read('js/community-config-mttlab.js'), sandbox);
vm.runInContext(read('js/community.js'), sandbox);

const C = sandbox.PTCommunity;
assert.ok(C, 'PTCommunity API');
assert.strictEqual(C.getConfig('pokerforge').requireMembership, false);
assert.strictEqual(C.getConfig('mttlab').requireMembership, true);
assert.ok(C.getConfig('mttlab').menus.hide.indexOf('pricing') >= 0, 'mttlab oculta pricing');
assert.ok(C.getConfig('mttlab').menus.show.indexOf('school') >= 0, 'mttlab muestra school');
assert.ok(C.getConfig('mttlab').school.unlockMode === 'allOpen');
assert.ok(C.getConfig('mttlab').billing.hidePricing);
assert.ok(C.getConfig('mttlab').home.hideDailySpot, 'mttlab hide daily spot');
assert.ok(C.getConfig('mttlab').home.hideQuickAccess, 'mttlab hide quick access');
assert.ok(C.getConfig('mttlab').home.welcomeFromManager, 'mttlab welcome from manager');
assert.strictEqual(C.getConfig('mttlab').ai.monthlyLimit, 40);

// Resolución post-login: 1 acceso → ese; varios → default_app
assert.ok(typeof C.resolveActiveFromMemberships === 'function', 'resolveActiveFromMemberships');

// PF default no oculta manager en hide de pokerforge config
assert.ok(C.getConfig('pokerforge').menus.hide.indexOf('manager') >= 0);

// School pack esqueleto
const schoolDataStub = `
var LESSONS = [];
var ROUTES = [];
window.PTSchoolData = {
  registerLessons: function(list) { LESSONS = LESSONS.concat(list); window.__mlLessons = LESSONS; },
  setRouteStatus: function(id, status) { ROUTES.push({id:id,status:status}); window.__mlRoutes = ROUTES; }
};
`;
vm.runInContext(schoolDataStub, sandbox);
vm.runInContext(read('js/school-data-mttlab.js'), sandbox);
const lessons = sandbox.__mlLessons || [];
assert.ok(lessons.length >= 70, 'esqueleto >= 70 lecciones, got ' + lessons.length);
assert.ok(lessons.every(function (l) { return l.route === 'mttlab'; }), 'todas route mttlab');
assert.ok(lessons.some(function (l) { return l.module === 'M1'; }));
assert.ok(lessons.some(function (l) { return l.module === 'M8'; }));
assert.ok(lessons.every(function (l) { return Array.isArray(l.externalLinks); }), 'externalLinks array');

console.log('*** community-mttlab OK ***');
