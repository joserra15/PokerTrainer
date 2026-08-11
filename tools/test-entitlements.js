/* RG-C01/C02/E03 — Matriz de límites, usage gates y cuotas IA. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const localStore = {};
const sandbox = {
  window: {},
  console,
  Math,
  Date,
  Set,
  Map,
  JSON,
  Number,
  String,
  Object,
  Array,
  Promise,
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  }
};
sandbox.global = sandbox;
sandbox.window.localStorage = sandbox.localStorage;
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'js/entitlements.js'), 'utf8'),
  sandbox,
  { filename: 'entitlements.js' }
);

const Ent = sandbox.window.PTEntitlements;
assert.ok(Ent, 'PTEntitlements');

const FREE = {
  trainer_hands_per_day: 15,
  import_sessions_per_month: 1,
  max_hands_per_import: 200,
  ai_reports_per_month: 3,
  history_days: 30,
  analysis_hands_max: 5
};
const PRO = {
  trainer_hands_per_day: null,
  import_sessions_per_month: null,
  max_hands_per_import: null,
  ai_reports_per_month: 40,
  history_days: null,
  analysis_hands_max: 20
};
const PREMIUM = {
  trainer_hands_per_day: null,
  import_sessions_per_month: null,
  max_hands_per_month: null,
  max_hands_per_import: null,
  ai_reports_per_month: 150,
  history_days: null,
  analysis_hands_max: 100
};

function ent(plan, usage, extra) {
  const limits = plan === 'pro' ? PRO : plan === 'premium' ? PREMIUM : FREE;
  return Object.assign({
    plan: plan,
    plan_label: Ent.PLAN_LABELS[plan] || plan,
    is_admin: false,
    unlimited: false,
    subscription_status: 'none',
    paid_active: plan === 'pro' || plan === 'premium',
    limits: Object.assign({}, limits),
    usage: Object.assign({
      trainer_hands_today: 0,
      import_sessions_month: 0,
      ai_reports_month: 0,
      ai_plan_used_month: 0,
      ai_bonus_used_month: 0
    }, usage || {}),
    bonus: { balance: 0, expires_at: null }
  }, extra || {});
}

// --- C01 matriz límites ---
assert.strictEqual(Ent.PLAN_LABELS.free, 'Gratis');
assert.strictEqual(Ent.PLAN_LABELS.pro, 'Study');
assert.strictEqual(Ent.PLAN_LABELS.premium, 'Coach');

let t = Ent.canStartTrainerHand(ent('free', { trainer_hands_today: 0 }));
assert.strictEqual(t.ok, true, 'free trainer ok');
t = Ent.canStartTrainerHand(ent('free', { trainer_hands_today: 15 }));
assert.strictEqual(t.ok, false, 'free trainer techo');
assert.strictEqual(t.reason, 'trainer_limit');
assert.strictEqual(t.limit, 15);

t = Ent.canStartTrainerHand(ent('pro'));
assert.strictEqual(t.ok, true, 'pro trainer ilimitado');
t = Ent.canStartTrainerHand(ent('premium'));
assert.strictEqual(t.ok, true, 'premium trainer ilimitado');
t = Ent.canStartTrainerHand(ent('free', { trainer_hands_today: 99 }, { is_admin: true }));
assert.strictEqual(t.ok, true, 'admin trainer ilimitado');

let imp = Ent.canImportSession(50, ent('free', { import_sessions_month: 0 }));
assert.strictEqual(imp.ok, true, 'free import ok');
imp = Ent.canImportSession(50, ent('free', { import_sessions_month: 1 }));
assert.strictEqual(imp.ok, false, 'free import techo sesiones');
assert.strictEqual(imp.reason, 'import_limit');
imp = Ent.canImportSession(201, ent('free', { import_sessions_month: 0 }));
assert.strictEqual(imp.ok, false, 'free import techo manos');
assert.strictEqual(imp.reason, 'import_hands_limit');
imp = Ent.canImportSession(500, ent('pro'));
assert.strictEqual(imp.ok, true, 'pro import ilimitado');

assert.strictEqual(Ent.analysisHandsMax(ent('free')), 5);
assert.strictEqual(Ent.analysisHandsMax(ent('pro')), 20);
assert.strictEqual(Ent.analysisHandsMax(ent('premium')), 100);
assert.strictEqual(Ent.analysisHandsMax(ent('free', null, { is_admin: true })), 1000);
assert.strictEqual(Ent.canSaveAnalysisHand(5, ent('free')).ok, false);
assert.strictEqual(Ent.canSaveAnalysisHand(4, ent('free')).ok, true);

const cut = Ent.historyCutoffDate(ent('free'));
assert.ok(cut && typeof cut === 'string', 'free history cutoff');
assert.strictEqual(Ent.historyCutoffDate(ent('pro')), null, 'pro history ilimitado');
assert.strictEqual(Ent.historyCutoffDate(ent('free', null, { is_admin: true })), null, 'admin history');

// Trialing se trata como plan de pago en billing; aquí el plan sigue siendo pro
const trial = ent('pro', null, { subscription_status: 'trialing', paid_active: true });
assert.strictEqual(Ent.canStartTrainerHand(trial).ok, true, 'trialing Study sin techo trainer');
assert.strictEqual(Ent.canUseAI(trial).ok, true, 'trialing Study puede IA');

// --- C02 usage counters (gates locales) ---
const near = ent('free', { trainer_hands_today: 14 });
assert.strictEqual(Ent.canStartTrainerHand(near).ok, true);
near.usage.trainer_hands_today += 1;
assert.strictEqual(Ent.canStartTrainerHand(near).ok, false, 'tras consumir 15ª mano');

const impU = ent('free', { import_sessions_month: 0 });
assert.strictEqual(Ent.canImportSession(10, impU).ok, true);
impU.usage.import_sessions_month = 1;
assert.strictEqual(Ent.canImportSession(10, impU).ok, false, 'tras 1 import free');

// --- E03 cuotas IA ---
let ai = Ent.canUseAI(ent('free', { ai_reports_month: 0, ai_plan_used_month: 0 }));
assert.strictEqual(ai.ok, true);
assert.strictEqual(ai.source, 'plan');
assert.strictEqual(ai.limit, 3);

ai = Ent.canUseAI(ent('free', { ai_reports_month: 3, ai_plan_used_month: 3 }));
assert.strictEqual(ai.ok, false);
assert.strictEqual(ai.reason, 'ai_limit');

ai = Ent.canUseAI(ent('free', {
  ai_reports_month: 3,
  ai_plan_used_month: 3
}, { bonus: { balance: 2, expires_at: null } }));
assert.strictEqual(ai.ok, true, 'free con bono tras techo plan');
assert.strictEqual(ai.source, 'bonus');

ai = Ent.canUseAI(ent('pro', { ai_plan_used_month: 40, ai_reports_month: 40 }));
assert.strictEqual(ai.ok, false, 'pro techo 40');
assert.strictEqual(ai.reason, 'ai_limit');

ai = Ent.canUseAI(ent('premium', { ai_plan_used_month: 150, ai_reports_month: 150 }));
assert.strictEqual(ai.ok, false, 'premium techo 150');

ai = Ent.canUseAI(ent('free', null, { is_admin: true }));
assert.strictEqual(ai.ok, true);
assert.strictEqual(ai.unlimited, true);

const sumFree = Ent.aiQuotaSummary(ent('free', { ai_reports_month: 1, ai_plan_used_month: 1 }));
assert.ok(/ForgeCoach/.test(sumFree.label), 'label cuota free');
assert.ok(sumFree.totalLeft >= 0);

// Fuente alineada con BILLING / migración free=3
const entSrc = fs.readFileSync(path.join(__dirname, '..', 'js/entitlements.js'), 'utf8');
assert.ok(/ai_reports_per_month:\s*3/.test(entSrc), 'free AI=3 en código');
assert.ok(/ai_reports_per_month:\s*40/.test(entSrc), 'pro AI=40');
assert.ok(/ai_reports_per_month:\s*150/.test(entSrc), 'premium AI=150');
assert.ok(/trainer_hands_per_day:\s*15/.test(entSrc), 'free trainer 15');

const billSrc = fs.readFileSync(path.join(__dirname, '..', 'js/billing.js'), 'utf8');
assert.ok(/trainer_limit/.test(billSrc) && /ai_limit/.test(billSrc), 'billing MESSAGES paywall');
assert.ok(/ai_plan/.test(billSrc), 'billing ai_plan message');

console.log('*** entitlements OK (matriz + usage + cuotas IA) ***');
