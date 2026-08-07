/* RG-D01 — Store.mergeFromCloud: unión por id, createdAt más reciente gana. */
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
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'js/storage.js'), 'utf8'),
  sandbox,
  { filename: 'storage.js' }
);

const Store = sandbox.window.Store;
assert.ok(Store && Store.mergeFromCloud && Store.setUserId, 'Store.mergeFromCloud');

Store.setUserId('user-a');

const histKey = 'pt_history_v1_user-a';
const errKey = 'pt_errors_v1_user-a';

sandbox.localStorage.setItem(histKey, JSON.stringify([
  {
    id: 'h1',
    createdAt: '2026-01-01T10:00:00.000Z',
    totalEvLoss: 1.5,
    heroNet: -2,
    decisions: [{ street: 'preflop', class: 'optima' }]
  },
  {
    id: 'h-local',
    createdAt: '2026-01-02T10:00:00.000Z',
    totalEvLoss: 0,
    heroNet: 1,
    decisions: []
  }
]));
sandbox.localStorage.setItem(errKey, JSON.stringify([
  {
    id: 'e1',
    createdAt: '2026-01-01T11:00:00.000Z',
    street: 'flop',
    class: 'error'
  }
]));

const cloudNewer = {
  id: 'h1',
  createdAt: '2026-01-03T10:00:00.000Z',
  totalEvLoss: 0.2,
  heroNet: 0,
  decisions: [{ street: 'preflop', class: 'aceptable' }],
  fromCloud: true
};
const cloudOnly = {
  id: 'h-cloud',
  createdAt: '2026-01-04T10:00:00.000Z',
  totalEvLoss: 3,
  heroNet: -3,
  decisions: []
};

const merged = Store.mergeFromCloud({
  history: [cloudNewer, cloudOnly],
  errors: [{
    id: 'e1',
    createdAt: '2026-01-01T09:00:00.000Z',
    street: 'flop',
    class: 'imprecisa'
  }],
  stats: {
    handsPlayed: 2,
    decisions: 2,
    optima: 1,
    aceptable: 1,
    imprecisa: 0,
    error: 0,
    totalEvLoss: 0.2,
    totalNet: 0,
    byStreet: {}
  }
});

assert.ok(merged, 'merge result');
const hist = Store.getHistory();
const ids = hist.map((h) => h.id).sort();
assert.deepStrictEqual(ids, ['h-cloud', 'h-local', 'h1'].sort(), 'unión sin duplicar: ' + ids.join(','));

const h1 = hist.find((h) => h.id === 'h1');
assert.ok(h1.fromCloud, 'h1 gana versión cloud más reciente');
assert.strictEqual(h1.totalEvLoss, 0.2);

const errs = Store.getErrors();
const e1 = errs.find((e) => e.id === 'e1');
assert.ok(e1, 'error e1 presente');
assert.strictEqual(e1.class, 'error', 'local createdAt más nuevo gana en errors');

Store.mergeFromCloud({
  history: [cloudNewer, cloudOnly],
  errors: [],
  stats: { handsPlayed: 2, decisions: 2, optima: 1, aceptable: 1, imprecisa: 0, error: 0, totalEvLoss: 0.2, totalNet: 0, byStreet: {} }
});
assert.strictEqual(Store.getHistory().length, hist.length, 're-merge no duplica');

console.log('*** cloud-merge OK (union + createdAt) ***');
