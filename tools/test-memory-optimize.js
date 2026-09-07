/* Reclaim de memoria local: optimizeLocalMemory + stubs análisis + trim torneos. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const storageSrc = fs.readFileSync(path.join(root, 'js/storage.js'), 'utf8');
const analysisSrc = fs.readFileSync(path.join(root, 'js/cloud-analysis.js'), 'utf8');
const tournamentSrc = fs.readFileSync(path.join(root, 'js/tournament/store.js'), 'utf8');

assert.ok(/function optimizeLocalMemory/.test(storageSrc), 'optimizeLocalMemory');
assert.ok(/withStorageReclaim/.test(storageSrc), 'withStorageReclaim');
assert.ok(/pt-memory-optimizing/.test(storageSrc), 'overlay class');
assert.ok(/LOCAL_ANALYSIS_KEEP/.test(storageSrc), 'LOCAL_ANALYSIS_KEEP');
assert.ok(/ensureAnalysisHandsCloudOffloaded/.test(storageSrc), 'offload análisis');
assert.ok(/LOCAL_KEEP/.test(tournamentSrc), 'tournament LOCAL_KEEP');
assert.ok(/trimLocalHistory/.test(tournamentSrc), 'trimLocalHistory');
assert.ok(/ensureHistoryOffloaded/.test(tournamentSrc), 'ensureHistoryOffloaded');

const localStore = {};
const sandbox = {
  window: { PT_E2E_MODE: true },
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
  document: {
    body: {
      classList: {
        _c: new Set(),
        add(c) { this._c.add(c); },
        remove(c) { this._c.delete(c); },
        contains(c) { return this._c.has(c); }
      },
      setAttribute() {},
      removeAttribute() {}
    }
  },
  localStorage: {
    get length() { return Object.keys(localStore).length; },
    key(i) { return Object.keys(localStore)[i] || null; },
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null;
    },
    setItem(k, v) { localStore[k] = String(v); },
    removeItem(k) { delete localStore[k]; }
  }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

vm.runInContext(analysisSrc, sandbox, { filename: 'cloud-analysis.js' });
vm.runInContext(tournamentSrc, sandbox, { filename: 'store.js' });
vm.runInContext(storageSrc, sandbox, { filename: 'storage.js' });

const Store = sandbox.Store;
const T = sandbox.PTTournamentStore;
assert.ok(Store && T, 'modules');

Store.setUserId('u-mem');

/* --- Análisis: stubs locales tras buildAnalysisLocalIndex vía save --- */
(async function () {
  for (let i = 0; i < 7; i++) {
    const hand = {
      id: 'ha-' + i,
      createdAt: '2026-09-0' + (i + 1) + 'T10:00:00.000Z',
      heroPos: 'CO',
      heroCards: ['As', 'Kd'],
      decisions: [{ street: 'preflop', action: 'raise', class: 'optima', explanation: 'x'.repeat(200) }]
    };
    const res = await Store.saveAnalysisHand(hand);
    assert.ok(res.ok, 'save ha-' + i + ' ' + (res.error || ''));
  }
  const list = Store.getAnalysisHands();
  assert.ok(list.length >= 7, 'lista tiene 7');
  /* Sin cloud, todas pueden seguir completas; force stub. */
  assert.ok(typeof Store.ensureAnalysisHandsCloudOffloaded === 'function');
  /* freeStorageSpace aggressive debe stubear. */
  Store.freeStorageSpace({ aggressive: true });
  const after = Store.getAnalysisHands();
  const stubs = after.filter(function (h) {
    return h && h.cloudOnly && !h.decisions;
  });
  assert.ok(stubs.length >= 1 || after.length <= 5,
    'tras aggressive hay stubs o lista acotada');

  /* --- Torneos: trim local conserva memoria completa --- */
  for (let i = 0; i < 20; i++) {
    T.save({
      id: 't-' + i,
      name: 'Torneo ' + i,
      finishedAt: '2026-08-' + String((i % 28) + 1).padStart(2, '0') + 'T12:00:00.000Z',
      entries: 90,
      place: i + 1
    });
  }
  const mem = T.getHistoryMemory();
  assert.ok(mem.length >= 20, 'memoria torneos completa');
  const raw = JSON.parse(localStore[T.storageKey()] || '[]');
  assert.ok(raw.length <= T.LOCAL_KEEP, 'localStorage torneos ≤ LOCAL_KEEP (' + raw.length + ')');
  assert.ok(T.get('t-19'), 'get reciente');
  assert.ok(T.get('t-0'), 'get antiguo desde memoria');

  const trimmed = T.trimLocalHistory(5);
  assert.ok(trimmed, 'trimLocalHistory liberó');
  const raw2 = JSON.parse(localStore[T.storageKey()] || '[]');
  assert.ok(raw2.length <= 5, 'local ≤ 5 tras trim');
  assert.strictEqual(T.getHistoryMemory().length, mem.length, 'memoria no se pierde al trim');

  /* --- optimizeLocalMemory API --- */
  localStore['pt_ai_coach_v1_zzz'] = JSON.stringify({ t: 'y'.repeat(3000) });
  const opt = await Store.optimizeLocalMemory({ silent: true, aggressive: true });
  assert.ok(opt && typeof opt.ok === 'boolean', 'optimize result');
  assert.strictEqual(localStore['pt_ai_coach_v1_zzz'], undefined, 'purge AI cache');

  console.log('*** memory-optimize OK ***');
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});
