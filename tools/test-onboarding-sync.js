/* Primeros pasos: merge nube/local, inferencia desde stats y push entre dispositivos. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const version = fs.readFileSync(path.join(root, 'js/version.js'), 'utf8');
const cloudSrc = fs.readFileSync(path.join(root, 'js/cloud-store.js'), 'utf8');
const storageSrc = fs.readFileSync(path.join(root, 'js/storage.js'), 'utf8');
const onboardingSrc = fs.readFileSync(path.join(root, 'js/onboarding.js'), 'utf8');
const ciSrc = fs.readFileSync(path.join(root, 'tools/run-ci-tests.js'), 'utf8');

assert.ok(/PT_BUILD\s*=\s*'3.1.4'/.test(version), 'versión 3.1.4');
assert.ok(/onboarding/.test(cloudSrc) && /DATA_KEYS/.test(cloudSrc), 'DATA_KEYS incluye onboarding');
assert.ok(/hasOnboardingProgress/.test(cloudSrc), 'hasOnboardingProgress');
assert.ok(/payloadToPush/.test(cloudSrc), 'payloadToPush conserva claves extra');
assert.ok(/flushPush/.test(onboardingSrc) && /Safari/.test(onboardingSrc), 'markDone hace flushPush');
assert.ok(/function mergeFromCloud/.test(onboardingSrc), 'onboarding.mergeFromCloud');
assert.ok(/applyOnboardingFromCloud/.test(storageSrc), 'Store aplica onboarding de la nube');
assert.ok(/pt-cloud-synced/.test(onboardingSrc), 'onboarding escucha pt-cloud-synced');
assert.ok(/test-onboarding-sync\.js/.test(ciSrc), 'registrado en test:ci');

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
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; },
    clear: () => { Object.keys(localStore).forEach((k) => delete localStore[k]); }
  }
};
sandbox.global = sandbox;
sandbox.window.localStorage = sandbox.localStorage;
vm.createContext(sandbox);
vm.runInContext(storageSrc, sandbox, { filename: 'storage.js' });
vm.runInContext(onboardingSrc, sandbox, { filename: 'onboarding.js' });

const Store = sandbox.window.Store;
const OB = sandbox.window.PTOnboarding;
assert.ok(Store && Store.mergeFromCloud && Store.getUserId, 'Store');
assert.ok(OB && OB.mergeFromCloud && OB.getCloudState, 'PTOnboarding cloud API');

Store.setUserId('user-ob-sync');
sandbox.window.PT_AUTH_USER = { sub: 'user-ob-sync' };

assert.ok(OB.shouldShow(), 'checklist visible sin progreso');

OB.markDone('demo');
const snap = Store.getCloudSnapshot();
assert.ok(snap.onboarding, 'snapshot incluye onboarding');
assert.strictEqual(snap.onboarding.done.demo, true, 'demo en snapshot');
assert.ok(!snap.onboarding.done.warmup, 'warmup aún no');

Object.keys(localStore).forEach((k) => delete localStore[k]);
Store.setUserId('user-ob-sync');
sandbox.window.PT_AUTH_USER = { sub: 'user-ob-sync' };
assert.ok(OB.shouldShow(), 'PC vacío muestra checklist');

Store.mergeFromCloud({
  history: [],
  errors: [],
  stats: { handsPlayed: 0, decisions: 0, optima: 0, aceptable: 0, imprecisa: 0, error: 0, totalEvLoss: 0, totalNet: 0, byStreet: {} },
  onboarding: { dismissed: false, done: { demo: true, warmup: true, leaks: true }, updatedAt: 50 }
});
assert.ok(!OB.shouldShow(), 'tras sync nube oculta checklist');
assert.ok(OB.isDone('demo') && OB.isDone('warmup') && OB.isDone('leaks'), '3 pasos desde la nube');

Object.keys(localStore).forEach((k) => delete localStore[k]);
Store.setUserId('user-ob-sync');
sandbox.window.PT_AUTH_USER = { sub: 'user-ob-sync' };
OB.markDone('warmup');
const union = Store.mergeDirtyKeysIntoCloud({
  onboarding: { dismissed: false, done: { demo: true }, updatedAt: 1 }
}, ['onboarding']);
assert.ok(union.onboarding.done.demo, 'unión conserva demo de la nube');
assert.ok(union.onboarding.done.warmup, 'unión conserva warmup local');

Object.keys(localStore).forEach((k) => delete localStore[k]);
Store.setUserId('user-ob-infer');
sandbox.window.PT_AUTH_USER = { sub: 'user-ob-infer' };
assert.ok(OB.shouldShow(), 'sin stats sigue visible');
sandbox.localStorage.setItem('pt_stats_v1_user-ob-infer', JSON.stringify({
  handsPlayed: 12,
  decisions: 20,
  optima: 10,
  aceptable: 8,
  imprecisa: 2,
  error: 0,
  totalEvLoss: 1,
  totalNet: 0,
  byStreet: {},
  updatedAt: 9
}));
assert.ok(!OB.shouldShow(), 'stats sincronizadas infieren los 3 pasos');
const inferred = OB.getCloudState();
assert.ok(inferred.done.demo && inferred.done.warmup && inferred.done.leaks, 'inferencia completa');

console.log('*** onboarding-sync OK (nube + inferencia) ***');
