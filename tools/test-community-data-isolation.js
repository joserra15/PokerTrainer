/* Aislamiento de stats/history/errors/school por comunidad. */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.join(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

const storageSrc = read('js/storage.js');
assert.ok(/function communityDataSuffix/.test(storageSrc), 'communityDataSuffix');
assert.ok(/function scopedDataKey/.test(storageSrc), 'scopedDataKey');
assert.ok(/function sliceCloudForActive/.test(storageSrc), 'sliceCloudForActive');
assert.ok(/function mergeActiveIntoCloudPayload/.test(storageSrc), 'mergeActiveIntoCloudPayload');
assert.ok(/'stats' \+ s/.test(storageSrc), 'escribe stats_<community>');

const cloudSrc = read('js/cloud-store.js');
assert.ok(/viewForActive|sliceCloudForActive/.test(cloudSrc), 'cloud usa vista por comunidad');
assert.ok(/mergeActiveIntoCloudPayload/.test(cloudSrc), 'push no pisa otras comunidades');

assert.ok(fs.existsSync(path.join(root, 'supabase/migrations/045_community_school_no_pf_fallback.sql')), 'migration 045');
const sql45 = read('supabase/migrations/045_community_school_no_pf_fallback.sql');
assert.ok(/stats_/.test(sql45) && /Sin fallback/.test(sql45), 'SQL sin fallback PF');

const localStore = {};
let ACTIVE = 'pokerforge';
const sandbox = {
  window: {},
  console,
  Math,
  Date,
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
sandbox.window = sandbox;
sandbox.PTCommunity = {
  id: function () { return ACTIVE; },
  progressKey: function () {
    return ACTIVE === 'pokerforge' ? 'school_progress' : ('school_progress_' + ACTIVE);
  }
};
vm.createContext(sandbox);
vm.runInContext(storageSrc, sandbox, { filename: 'storage.js' });
const Store = sandbox.Store;
assert.ok(Store, 'Store');
Store.setUserId('user_iso_1');

function makeHand(id, cls, spotKey) {
  return {
    id: id,
    createdAt: new Date().toISOString(),
    totalEvLoss: cls === 'error' ? 2 : 0.5,
    heroNet: cls === 'error' ? -1 : 1,
    scenario: { type: 'RFI', heroPos: 'BTN', villainPos: 'BB' },
    hero: { pos: 'BTN', cards: ['As', 'Ks'] },
    villain: { pos: 'BB', cards: ['Qh', 'Jh'] },
    displayHeroPos: 'BTN',
    playConfig: { gameType: 'cash6' },
    result: { totalEvLoss: cls === 'error' ? 2 : 0.5 },
    decisions: [{ street: 'preflop', class: cls, spotKey: spotKey || id, evLoss: cls === 'error' ? 2 : 0 }]
  };
}

ACTIVE = 'pokerforge';
Store.persistStats({
  handsPlayed: 10, decisions: 20, optima: 10, aceptable: 5, error: 3, imprecise: 2,
  totalEvLoss: 1, totalNet: 0, byStreet: { preflop: { n: 0, good: 0 }, flop: { n: 0, good: 0 }, turn: { n: 0, good: 0 }, river: { n: 0, good: 0 } },
  school: { xp: 100, lessons: { a: { passed: true } }, version: 2 },
  updatedAt: Date.now()
});
Store.saveHand(makeHand('h_pf_1', 'optima', 'pf1'));

const pfStats = Store.getStats();
const pfHist = Store.getHistory();
assert.ok(pfStats.handsPlayed >= 10, 'PF stats');
assert.ok(pfHist.some(function (h) { return h.id === 'h_pf_1'; }), 'PF history');

ACTIVE = 'mttlab';
assert.strictEqual(Store.communityDataSuffix(), '_mttlab');
const mtStats0 = Store.getStats();
assert.ok(!mtStats0.handsPlayed, 'mttlab stats vacías al inicio, got ' + mtStats0.handsPlayed);
assert.strictEqual(Store.getHistory().length, 0, 'mttlab history vacía');
assert.strictEqual(Store.getErrors().length, 0, 'mttlab errors vacíos');

Store.saveHand(makeHand('h_mt_1', 'error', 'mt1'));
Store.saveSchoolProgress({ xp: 40, lessons: { m1: { passed: true, bestPct: 80 } }, version: 2 });

const mtStats = Store.getStats();
assert.ok(mtStats.handsPlayed >= 1, 'mttlab tiene manos propias');
assert.ok(Store.getHistory().some(function (h) { return h.id === 'h_mt_1'; }));
assert.ok(Store.getErrors().length >= 1, 'mttlab errores propios');
assert.ok((Store.getSchoolProgress() || {}).xp >= 40, 'mttlab XP escuela');

const frag = Store.mergeActiveIntoCloudPayload({
  stats: pfStats,
  history: pfHist,
  errors: [],
  syncedAt: 'x'
});
assert.ok(frag.stats && frag.stats.handsPlayed >= 10, 'PF stats intactas en payload');
assert.ok(frag.stats_mttlab && frag.stats_mttlab.handsPlayed >= 1, 'stats_mttlab presentes');
assert.ok(Array.isArray(frag.history_mttlab) && frag.history_mttlab.length >= 1);
assert.ok(frag.school_mttlab && frag.school_mttlab.xp >= 40, 'school_mttlab para manager');
assert.ok(!(frag.history || []).some(function (h) { return h.id === 'h_mt_1'; }),
  'history PF no incluye mano mttlab');

ACTIVE = 'pokerforge';
assert.ok(Store.getHistory().some(function (h) { return h.id === 'h_pf_1'; }), 'vuelta a PF: history intacta');
assert.ok(!Store.getHistory().some(function (h) { return h.id === 'h_mt_1'; }), 'PF no ve manos mttlab');
const pfSchool = Store.getSchoolProgress() || {};
assert.ok((pfSchool.xp || 0) >= 100 || (pfSchool.lessons && pfSchool.lessons.a),
  'XP PF no pisada por mttlab');

ACTIVE = 'mttlab';
const slicedMt = Store.sliceCloudForActive(frag);
assert.ok(slicedMt.stats && slicedMt.stats.handsPlayed >= 1);

/* --- Koins Escuela independientes por comunidad --- */
vm.runInContext(read('js/tournament/wallet.js'), sandbox, { filename: 'wallet.js' });
const Wallet = sandbox.PTTournamentWallet;
assert.ok(Wallet, 'PTTournamentWallet');

ACTIVE = 'pokerforge';
Object.keys(localStore).forEach(function (k) {
  if (/pt_tournament_wallet/.test(k)) delete localStore[k];
});
Wallet.setBalance(100, { type: 'iso_pf' });
const pfAward = Wallet.earnFromLesson('C-00');
assert.strictEqual(pfAward.added, 1, 'PF: +1 Koin por lección');
assert.strictEqual(Wallet.getBalance(), 101, 'PF saldo 101');
assert.ok(Wallet.storageKey().indexOf('_mttlab') < 0, 'clave PF sin _mttlab');
assert.strictEqual(Wallet.earnFromLesson('C-00').added, 0, 'PF no dobla misma lección');

ACTIVE = 'mttlab';
assert.ok(/_mttlab/.test(Wallet.storageKey()), 'clave mttlab namespaced');
assert.strictEqual(Wallet.getBalance(), 100, 'mttlab wallet independiente (100 inicial)');
const mtAward = Wallet.earnFromLesson('ML-M1-01');
assert.strictEqual(mtAward.added, 1, 'MTTLab: +1 Koin por lección propia');
assert.strictEqual(Wallet.getBalance(), 101, 'mttlab saldo 101');
/* Misma id de lección PF no debe bloquear award MTTLab (wallets distintos). */
assert.strictEqual(Wallet.earnFromLesson('C-00').added, 1, 'mttlab puede premiar C-00 en su wallet');
assert.strictEqual(Wallet.getBalance(), 102);

ACTIVE = 'pokerforge';
assert.strictEqual(Wallet.getBalance(), 101, 'vuelta a PF: saldo intacto');
assert.strictEqual(Wallet.earnFromLesson('C-00').already, true, 'PF sigue con award C-00');
assert.strictEqual(Wallet.earnFromLesson('ML-M1-01').added, 1, 'PF wallet no hereda awards mttlab');

console.log('*** community-data-isolation OK ***');
