/* Regresión P0: handsTarget en PTPlayConfig + onboarding storage API. */
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
  parseFloat,
  parseInt,
  isNaN,
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  }
};
sandbox.global = sandbox;
sandbox.window.localStorage = sandbox.localStorage;
vm.createContext(sandbox);

function load(rel) {
  const code = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

// Minimal stubs for play-config dependencies
sandbox.window.GTORangesNotation = {};
sandbox.window.GTORangesData = { OPEN_RAISE: {}, VS_RFI: {}, VS_3BET: {} };
sandbox.window.GTORangesWeights = { fromSets: () => ({}), rangeString: () => '' };
sandbox.window.GTOEquity = {};

load('js/play-config.js');
load('js/onboarding.js');

const PC = sandbox.window.PTPlayConfig;
assert.ok(PC, 'PTPlayConfig missing');

const def = PC.normalize({});
assert.strictEqual(def.handsTarget, 0, 'default handsTarget 0');

const n10 = PC.normalize({ handsTarget: 10 });
assert.strictEqual(n10.handsTarget, 10);
const n25 = PC.normalize({ handsTarget: 25 });
assert.strictEqual(n25.handsTarget, 25);
const n50 = PC.normalize({ handsTarget: '50' });
assert.strictEqual(n50.handsTarget, 50);
const n100 = PC.normalize({ handsTarget: 100 });
assert.strictEqual(n100.handsTarget, 100);
const nBad = PC.normalize({ handsTarget: 33 });
assert.strictEqual(nBad.handsTarget, 0, 'invalid target falls back to 0');

const label = PC.labelFor({ handsTarget: 50 });
assert.ok(/50 manos/.test(label), 'label includes block size: ' + label);
const labelCont = PC.labelFor({ handsTarget: 0 });
assert.ok(/Continua/.test(labelCont), 'label includes Continua');

const OB = sandbox.window.PTOnboarding;
assert.ok(OB, 'PTOnboarding missing');
assert.strictEqual(OB.STEPS.length, 3);
assert.ok(OB.shouldShow(), 'onboarding visible initially');
OB.markDone('demo');
assert.ok(OB.isDone('demo'));
assert.ok(!OB.isDone('warmup'));
OB.markDone('warmup');
OB.markDone('leaks');
assert.ok(!OB.shouldShow(), 'hidden when all done');

// Fresh user key via dismiss path
Object.keys(localStore).forEach((k) => delete localStore[k]);
sandbox.window.PT_AUTH_USER = { sub: 'user-b' };
assert.ok(OB.shouldShow(), 'new user shows onboarding');
OB.dismiss();
assert.ok(!OB.shouldShow(), 'dismissed');

console.log('*** P0 play-config + onboarding OK ***');
