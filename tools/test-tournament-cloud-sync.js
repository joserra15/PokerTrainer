/* Sync torneos: koins / histórico / active entre dispositivos (cloud + local). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

const cloudSrc = read('js/cloud-store.js');
assert.ok(/tournamentWallet/.test(cloudSrc) && /logicalDataKeys/.test(cloudSrc),
  'logicalDataKeys incluye torneos');
assert.ok(/key === 'tournamentWallet'/.test(cloudSrc), 'hasLocalData wallet');
assert.ok(/key === 'tournamentHistory'/.test(cloudSrc), 'hasLocalData history');
assert.ok(/key === 'tournamentActive'/.test(cloudSrc), 'hasLocalData active');

const storageSrc = read('js/storage.js');
assert.ok(/migrateTournamentKeysForUser/.test(storageSrc), 'migra claves torneo al login');
assert.ok(/replaceFromCloud[\s\S]*tournamentWallet/.test(storageSrc) ||
  /function replaceFromCloud[\s\S]*tournamentHistory/.test(storageSrc),
  'replaceFromCloud aplica torneos');
assert.ok(/mergeTournamentFieldsIntoCloud/.test(storageSrc), 'push no inventa torneos');
assert.ok(/isDefault/.test(storageSrc), 'no pushea wallet default');

const walletSrc = read('js/tournament/wallet.js');
assert.ok(/function peek/.test(walletSrc), 'wallet.peek');
assert.ok(/isDefault/.test(walletSrc), 'snapshot default sin persistir');
assert.ok(/silent:\s*true/.test(walletSrc) || /opts\.silent/.test(walletSrc),
  'merge cloud silent');

const storeSrc = read('js/tournament/store.js');
assert.ok(/mergeFromCloud/.test(storeSrc), 'store.mergeFromCloud');
assert.ok(/replaceAll/.test(storeSrc), 'store.replaceAll');
assert.ok(/markCloudDirty\('active'\)/.test(storeSrc), 'dirty solo active');
assert.ok(/markCloudDirty\('history'\)/.test(storeSrc), 'dirty solo history');

const uiSrc = read('js/tournament/ui.js');
assert.ok(/pt-cloud-synced/.test(uiSrc), 'UI refresca tras sync');
assert.ok(/flushTournamentCloud|flushPush/.test(uiSrc), 'flush al guardar salida');
assert.ok(/displayKoins/.test(uiSrc), 'lobby no inventa wallet con getBalance');

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
  CustomEvent: function () {},
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; },
    clear: () => { Object.keys(localStore).forEach((k) => delete localStore[k]); },
    key: (i) => Object.keys(localStore)[i] || null,
    get length() { return Object.keys(localStore).length; }
  }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

vm.runInContext(read('js/tournament/wallet.js'), sandbox, { filename: 'wallet.js' });
vm.runInContext(read('js/tournament/store.js'), sandbox, { filename: 'store.js' });
vm.runInContext(storageSrc, sandbox, { filename: 'storage.js' });

const Store = sandbox.Store;
const W = sandbox.PTTournamentWallet;
const T = sandbox.PTTournamentStore;
assert.ok(Store && W && T, 'modules loaded');

/* --- wallet: snapshot no inventa; merge remoto gana si no hay local --- */
{
  Object.keys(localStore).forEach((k) => delete localStore[k]);
  Store.setUserId('user-sync-1');
  assert.strictEqual(W.peek(), null, 'peek vacío');
  const def = W.snapshot();
  assert.ok(def.isDefault, 'snapshot default');
  assert.strictEqual(localStore[W.storageKey()], undefined, 'default no escribe local');

  const remote = {
    balance: 247,
    updatedAt: '2026-05-01T12:00:00.000Z',
    tournamentsPlayed: 3,
    trainerHands: 10,
    lessonAwards: {}
  };
  W.mergeFromCloud(remote);
  assert.strictEqual(W.peek().balance, 247, 'merge toma remoto');
  assert.strictEqual(W.peek().updatedAt, remote.updatedAt, 'preserva updatedAt remoto');

  /* Local inventado viejo no debe existir; si ensure + now, remoto antiguo pierde —
     verificamos que peek+merge sin ensure respeta remoto. */
  const older = {
    balance: 50,
    updatedAt: '2026-04-01T12:00:00.000Z',
    tournamentsPlayed: 1
  };
  W.mergeFromCloud(older);
  assert.strictEqual(W.getBalance(), 247, 'local más reciente conserva saldo');
}

/* --- replaceFromCloud restaura wallet + history + active --- */
{
  Object.keys(localStore).forEach((k) => delete localStore[k]);
  Store.setUserId('user-sync-2');
  const active = {
    id: 't_cloud_1',
    status: 'running',
    handIndex: 7,
    _savedAt: '2026-05-02T10:00:00.000Z',
    config: { name: 'MTT Cloud', kind: 'mtt', entries: 18 },
    players: [{ id: 'h', isHero: true, stack: 2000, alive: true }]
  };
  Store.replaceFromCloud({
    stats: { handsPlayed: 0, decisions: 0, optima: 0, aceptable: 0, imprecisa: 0, error: 0,
      totalEvLoss: 0, totalNet: 0,
      byStreet: { preflop: { n: 0, good: 0 }, flop: { n: 0, good: 0 }, turn: { n: 0, good: 0 }, river: { n: 0, good: 0 } } },
    history: [],
    errors: [],
    tournamentWallet: {
      balance: 180,
      updatedAt: '2026-05-02T09:00:00.000Z',
      tournamentsPlayed: 2
    },
    tournamentHistory: [{
      id: 'fin_1',
      name: 'Spin 1',
      kind: 'sng',
      place: 1,
      prizeEur: 10,
      buyInEur: 5,
      profit: 5,
      roi: 100,
      finishedAt: '2026-05-01T18:00:00.000Z'
    }],
    tournamentActive: active
  });
  assert.strictEqual(W.getBalance(), 180, 'replace wallet');
  assert.strictEqual(T.list().length, 1, 'replace history');
  assert.strictEqual(T.list()[0].id, 'fin_1');
  assert.ok(T.hasActive(), 'replace active');
  assert.strictEqual(T.loadActive().handIndex, 7);
}

/* --- push completo no pisa history cloud con [] local / default wallet --- */
{
  Object.keys(localStore).forEach((k) => delete localStore[k]);
  Store.setUserId('user-sync-3');
  const cloudPayload = {
    stats: { handsPlayed: 1 },
    history: [],
    errors: [],
    tournamentWallet: { balance: 300, updatedAt: '2026-05-03T00:00:00.000Z' },
    tournamentHistory: [{ id: 'keep_me', name: 'Keep', finishedAt: '2026-05-03T01:00:00.000Z' }],
    tournamentActive: { id: 'act_keep', status: 'running', handIndex: 2, _savedAt: '2026-05-03T02:00:00.000Z', config: { name: 'A' } }
  };
  /* Local vacío: snapshot default no debe borrar cloud wallet/history */
  const pushed = Store.mergeActiveIntoCloudPayload(cloudPayload);
  assert.strictEqual(pushed.tournamentWallet.balance, 300, 'conserva wallet cloud');
  assert.ok(pushed.tournamentHistory.some((h) => h.id === 'keep_me'), 'conserva history cloud');
  /* sin active local → se borra en payload completo (dispositivo sin partida) —
     tras replace/merge el active local existiría; aquí comprobamos history/wallet. */
}

/* --- dirty clearActive elimina active en nube --- */
{
  Object.keys(localStore).forEach((k) => delete localStore[k]);
  Store.setUserId('user-sync-4');
  T.saveActive({
    id: 't_local',
    status: 'running',
    handIndex: 1,
    config: { name: 'Local' },
    players: []
  });
  assert.ok(T.hasActive());
  T.clearActive();
  const merged = Store.mergeDirtyKeysIntoCloud({
    tournamentActive: { id: 't_cloud_old', status: 'running', handIndex: 9 }
  }, ['tournamentActive']);
  assert.strictEqual(merged.tournamentActive, undefined, 'clearActive borra cloud active');
}

/* --- mergeDirty history une por id --- */
{
  Object.keys(localStore).forEach((k) => delete localStore[k]);
  Store.setUserId('user-sync-5');
  T.save({
    id: 'h_local',
    name: 'Local MTT',
    kind: 'mtt',
    place: 3,
    finishedAt: '2026-05-04T10:00:00.000Z'
  });
  const out = Store.mergeDirtyKeysIntoCloud({
    tournamentHistory: [{
      id: 'h_cloud',
      name: 'Cloud MTT',
      finishedAt: '2026-05-04T09:00:00.000Z'
    }]
  }, ['tournamentHistory']);
  const ids = (out.tournamentHistory || []).map((h) => h.id).sort();
  assert.deepStrictEqual(ids, ['h_cloud', 'h_local'], 'unión history dirty');
}

/* --- migración claves sin user / guest → uid --- */
{
  Object.keys(localStore).forEach((k) => delete localStore[k]);
  localStore['pt_tournament_wallet_v1'] = JSON.stringify({
    balance: 155,
    updatedAt: '2026-05-05T00:00:00.000Z'
  });
  localStore['pt_tournament_active_v1'] = JSON.stringify({
    id: 'pre_login',
    status: 'running',
    handIndex: 4,
    config: { name: 'Pre' }
  });
  localStore['pt_tournaments_v1_pt_guest_local'] = JSON.stringify([{
    id: 'guest_fin',
    name: 'Guest',
    finishedAt: '2026-05-05T01:00:00.000Z'
  }]);
  Store.setUserId('user-sync-6');
  assert.ok(localStore['pt_tournament_wallet_v1_user-sync-6'], 'migra wallet unscoped');
  assert.ok(localStore['pt_tournament_active_v1_user-sync-6'], 'migra active unscoped');
  assert.ok(localStore['pt_tournaments_v1_user-sync-6'], 'migra history guest');
  assert.strictEqual(W.getBalance(), 155);
  assert.ok(T.hasActive());
  assert.strictEqual(T.list()[0].id, 'guest_fin');
}

/* --- wallet dirty no arrastra history vacío --- */
{
  assert.ok(!/tournamentHistory'\s*\+\s*s[\s\S]{0,40}return \[/.test(walletSrc) ||
    /Solo wallet/.test(walletSrc),
    'wallet dirty keys solo wallet');
  const keysMatch = walletSrc.match(/function cloudDirtyKeys\([\s\S]*?\n  \}/);
  assert.ok(keysMatch && keysMatch[0].indexOf('tournamentHistory') < 0,
    'cloudDirtyKeys wallet sin history');
}

console.log('*** test-tournament-cloud-sync OK ***');
