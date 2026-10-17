#!/usr/bin/env node
/**
 * Paridad de motor MTT: mismo evaluateSpot con comunidad pokerforge vs mttlab.
 * Koins/wallet sí deben namespaced distinto.
 */
'use strict';
const assert = require('assert');
const path = require('path');
const { createSandbox, loadEngine, runFiles, ROOT } = require('./load-engine-vm');

let ACTIVE = 'pokerforge';
const localStore = {};

const sandbox = createSandbox({
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
    setItem: (k, v) => { localStore[k] = String(v); },
    removeItem: (k) => { delete localStore[k]; }
  },
  PTCommunity: {
    id: function () { return ACTIVE; },
    aiCommunityId: function () { return ACTIVE === 'pokerforge' ? null : ACTIVE; },
    hasAccess: function () { return true; },
    requireMembership: function () { return ACTIVE !== 'pokerforge'; },
    bypassPaywalls: function () { return ACTIVE !== 'pokerforge'; },
    progressKey: function () {
      return ACTIVE === 'pokerforge' ? 'school_progress' : ('school_progress_' + ACTIVE);
    }
  }
});
/* Wallet/Store se cuelgan de window; unificar con el contexto vm. */
sandbox.window = sandbox;

loadEngine(sandbox);
runFiles(sandbox, [
  path.join(ROOT, 'js/storage.js'),
  path.join(ROOT, 'js/tournament/wallet.js')
]);

const GTO = sandbox.GTO;
assert.ok(GTO && typeof GTO.evaluateSpot === 'function', 'GTO.evaluateSpot disponible');

const MTT_SPOT = {
  street: 'preflop',
  heroPos: 'BTN',
  heroCards: ['As', 'Kd'],
  board: [],
  facing: 'none',
  potBB: 1.5,
  toCallBB: 0,
  stackBB: 25,
  openSize: null,
  villainPos: null,
  formatHub: 'mtt',
  gameType: 'mtt',
  mttPhase: 'early',
  playersSeated: 6,
  tableMax: 6
};

function evalSpot() {
  if (sandbox.GTOCache && sandbox.GTOCache.clear) sandbox.GTOCache.clear();
  if (sandbox.Cards && sandbox.Cards.rng && sandbox.Cards.rng.setSeed) {
    sandbox.Cards.rng.setSeed(42);
  }
  return GTO.evaluateSpot(Object.assign({}, MTT_SPOT));
}

function summarize(res) {
  assert.ok(res && res.strategy, 'strategy presente');
  const strat = res.strategy;
  const freqs = {};
  Object.keys(strat).sort().forEach((k) => {
    const v = strat[k];
    freqs[k] = typeof v === 'number' ? Math.round(v * 1000) / 1000 : v;
  });
  const ev = res.evaluation || {};
  return {
    spotKey: res.spotKey || null,
    freqs: freqs,
    best: ev.best || ev.bestAction || null,
    cls: ev.class || ev.classification || null
  };
}

ACTIVE = 'pokerforge';
const pf = summarize(evalSpot());

ACTIVE = 'mttlab';
const mt = summarize(evalSpot());

assert.deepStrictEqual(mt, pf, 'evaluateSpot MTT idéntico en pokerforge y mttlab');

const Wallet = sandbox.PTTournamentWallet;
assert.ok(Wallet, 'PTTournamentWallet');

ACTIVE = 'pokerforge';
Object.keys(localStore).forEach((k) => {
  if (/pt_tournament_wallet/.test(k)) delete localStore[k];
});
Wallet.setBalance(50, { type: 'parity_pf' });
assert.ok(Wallet.storageKey().indexOf('_mttlab') < 0, 'wallet PF sin sufijo comunidad');
assert.strictEqual(Wallet.getBalance(), 50, 'saldo PF 50');

ACTIVE = 'mttlab';
assert.ok(/_mttlab/.test(Wallet.storageKey()), 'wallet mttlab namespaced');
assert.strictEqual(Wallet.getBalance(), 0, 'wallet mttlab independiente');
Wallet.setBalance(7, { type: 'parity_mt' });
assert.strictEqual(Wallet.getBalance(), 7);

ACTIVE = 'pokerforge';
assert.strictEqual(Wallet.getBalance(), 50, 'vuelta a PF: Koins intactos');

console.log('*** community-mtt-engine-parity OK ***');
console.log('spot', pf.spotKey || '(none)', 'best', pf.best || '(n/a)');
