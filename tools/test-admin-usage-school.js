/* Admin: avance Escuela + panel de estadísticas de uso. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const adminSrc = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
const storageSrc = fs.readFileSync(path.join(root, 'js/storage.js'), 'utf8');
const logSrc = fs.readFileSync(path.join(root, 'js/log.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sql = fs.readFileSync(path.join(root, 'supabase/migrations/039_admin_school_usage_stats.sql'), 'utf8');
const sqlFunnel = fs.readFileSync(path.join(root, 'supabase/migrations/040_guest_funnel.sql'), 'utf8');
const version = fs.readFileSync(path.join(root, 'js/version.js'), 'utf8');

assert.ok(/admin-usage-btn/.test(html) && /admin-usage-panel/.test(html), 'HTML panel uso');
assert.ok(/pt_admin_usage_stats/.test(adminSrc), 'RPC uso en admin');
assert.ok(/pt_admin_guest_funnel/.test(adminSrc) && /renderGuestFunnelSection/.test(adminSrc), 'embudo guest en uso');
assert.ok(/Escuela de Póker/.test(adminSrc) && /renderSchoolSection/.test(adminSrc), 'detalle Escuela');
assert.ok(/renderFeatureUsageSection/.test(adminSrc), 'uso individual');
assert.ok(/pt_admin_usage_stats/.test(sql) && /feature_usage/.test(sql) && /school/.test(sql), 'migración SQL');
assert.ok(/pt_admin_guest_funnel/.test(sqlFunnel) && /pt_guest_funnel_ingest/.test(sqlFunnel), 'migración embudo');
assert.ok(/trackFeatureUsage/.test(storageSrc), 'Store.trackFeatureUsage');
assert.ok(/trackFeatureUsage/.test(logSrc), 'PTLog → trackFeatureUsage');
assert.ok(/PT_BUILD\s*=\s*'2.6.4'/.test(version), 'versión 2.6.4');

const localStore = {};
const sandbox = {
  window: {},
  console,
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

vm.createContext(sandbox);
vm.runInContext(storageSrc, sandbox, { filename: 'storage.js' });
vm.runInContext(logSrc, sandbox, { filename: 'log.js' });

const Store = sandbox.window.Store || sandbox.Store;
const PTLog = sandbox.window.PTLog || sandbox.PTLog;
assert.ok(Store && PTLog, 'Store + PTLog');
Store.setUserId('u-usage');

PTLog.event('tab_view', { tab: 'school' });
PTLog.event('tab_view', { tab: 'school' });
PTLog.event('hand_start', { street: 'preflop' });
PTLog.event('ai_coach_used', { scope: 'learn', mode: 'question' });
PTLog.event('ai_coach_greeting', { scope: 'statsGlobal', mode: 'question' });
PTLog.event('lesson_complete', { lessonId: 'C-01' });

const fu = Store.getFeatureUsage();
assert.strictEqual(fu.events.tab_view, 2, 'tab_view count');
assert.strictEqual(fu.tabs.school, 2, 'tabs.school');
assert.strictEqual(fu.events.hand_start, 1, 'hand_start');
assert.strictEqual(fu.events.ai_coach_used, 1, 'ai_coach_used');
assert.strictEqual(fu.events.ai_coach_greeting, 1, 'ai_coach_greeting counted separately');
assert.strictEqual(fu.aiScopes.learn, 1, 'aiScopes.learn');
assert.strictEqual(fu.aiScopes.statsGlobal, undefined, 'greeting no infla aiScopes');
assert.strictEqual(fu.aiModes.question, 1, 'aiModes.question');
assert.strictEqual(fu.events.lesson_complete, 1, 'lesson_complete');

const aiSrc = fs.readFileSync(path.join(root, 'js/ai-report.js'), 'utf8');
assert.ok(/ai_coach_greeting/.test(aiSrc) && /options\.freePromo/.test(aiSrc), 'freePromo → greeting event');
assert.ok(/Saludo ForgeCoach/.test(adminSrc), 'label saludo en admin');
assert.ok(/consumo facturable/.test(adminSrc), 'nota cupo vs analytics');

console.log('*** test-admin-usage-school OK ***');
