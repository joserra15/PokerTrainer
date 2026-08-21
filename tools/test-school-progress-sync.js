/* Progreso Escuela: merge nube/local y push inmediato entre dispositivos. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const version = fs.readFileSync(path.join(root, 'js/version.js'), 'utf8');
const cloudSrc = fs.readFileSync(path.join(root, 'js/cloud-store.js'), 'utf8');
const schoolSrc = fs.readFileSync(path.join(root, 'js/school.js'), 'utf8');
const storageSrc = fs.readFileSync(path.join(root, 'js/storage.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const ciSrc = fs.readFileSync(path.join(root, 'tools/run-ci-tests.js'), 'utf8');

assert.ok(/PT_BUILD\s*=\s*'2.7.15'/.test(version), 'versión 2.7.15');
assert.ok(/hasSchoolProgress/.test(cloudSrc), 'cloud hasSchoolProgress');
assert.ok(/hasSchoolProgress\(val\)/.test(cloudSrc), 'hasLocalData cuenta Escuela');
assert.ok(/hasSchoolProgress\(st\)/.test(storageSrc), 'isStatsEmpty cuenta Escuela');
assert.ok(!/if \(localDirty > cloudTs\)/.test(cloudSrc), 'no descarta payload cloud por dirty');
assert.ok(/Siempre fusionar nube/.test(cloudSrc), 'cloudPayloadForMerge siempre fusiona');
assert.ok(/flushPush/.test(schoolSrc) && /Safari/.test(schoolSrc), 'writeSchool hace flushPush');
assert.ok(/function refreshFromCloud/.test(schoolSrc), 'refreshFromCloud');
assert.ok(/state\.view !== VIEW\.hub/.test(schoolSrc), 'refreshFromCloud solo hub');
assert.ok(/pt-cloud-synced/.test(schoolSrc), 'school escucha pt-cloud-synced');
assert.ok(/refreshFromCloud/.test(appSrc), 'app refresca Escuela tras sync');
assert.ok(/maybeSyncOnVisible/.test(cloudSrc), 'pull al volver a la pestaña');
assert.ok(/visibilityState === 'visible'/.test(cloudSrc), 'visibility visible → sync');
assert.ok(/test-school-progress-sync\.js/.test(ciSrc), 'registrado en test:ci');

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

const Store = sandbox.window.Store;
assert.ok(Store && Store.mergeFromCloud && Store.setUserId, 'Store.mergeFromCloud');
Store.setUserId('user-school-sync');

const statsKey = 'pt_stats_v1_user-school-sync';
sandbox.localStorage.setItem(statsKey, JSON.stringify({
  handsPlayed: 0,
  decisions: 0,
  optima: 0,
  aceptable: 0,
  imprecisa: 0,
  error: 0,
  totalEvLoss: 0,
  totalNet: 0,
  byStreet: {},
  updatedAt: 10,
  school: {
    xp: 50,
    lessons: {
      'C-01': {
        passed: true,
        attempts: 1,
        bestScore: 0.7,
        gold: false,
        perfect: false,
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    },
    updatedAt: 100,
    version: 2
  }
}));

Store.mergeFromCloud({
  history: [],
  errors: [],
  stats: {
    handsPlayed: 0,
    decisions: 0,
    optima: 0,
    aceptable: 0,
    imprecisa: 0,
    error: 0,
    totalEvLoss: 0,
    totalNet: 0,
    byStreet: {},
    updatedAt: 20,
    school: {
      xp: 220,
      lessons: {
        'C-03': {
          passed: true,
          attempts: 3,
          bestScore: 1,
          gold: true,
          perfect: true,
          updatedAt: '2026-08-16T00:00:00.000Z'
        }
      },
      updatedAt: 900,
      version: 2
    }
  }
});

const school = Store.getStats().school;
assert.ok(school, 'school tras merge');
assert.strictEqual(school.xp, 220, 'xp = max(local, cloud)');
assert.ok(school.lessons['C-01'] && school.lessons['C-01'].passed, 'conserva lección local');
assert.ok(school.lessons['C-03'] && school.lessons['C-03'].gold, 'une lección cloud');
assert.strictEqual(school.lessons['C-03'].attempts, 3);

sandbox.localStorage.setItem(statsKey, JSON.stringify({
  handsPlayed: 0,
  decisions: 0,
  optima: 0,
  aceptable: 0,
  imprecisa: 0,
  error: 0,
  totalEvLoss: 0,
  totalNet: 0,
  byStreet: {},
  updatedAt: 1,
  school: {
    xp: 80,
    lessons: { 'S-00': { passed: true, attempts: 1, bestScore: 1, updatedAt: '2026-02-01T00:00:00.000Z' } },
    updatedAt: 50,
    version: 2
  }
}));
Store.mergeFromCloud({
  history: [],
  errors: [],
  stats: { handsPlayed: 0, decisions: 0 }
});
const schoolOnly = Store.getStats().school;
assert.ok(schoolOnly && schoolOnly.lessons['S-00'], 'progreso solo-Escuela no se borra si cloud no trae school');
assert.strictEqual(schoolOnly.xp, 80, 'xp local se conserva');

vm.runInContext(schoolSrc, sandbox, { filename: 'school.js' });
assert.ok(sandbox.window.PTSchool && typeof sandbox.window.PTSchool.refreshFromCloud === 'function',
  'PTSchool.refreshFromCloud');
sandbox.window.PTSchool._state.view = 'lesson';
sandbox.window.PTSchool.refreshFromCloud();

console.log('*** school-progress-sync OK ***');
