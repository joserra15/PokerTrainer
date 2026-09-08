/**
 * tools/test-tournament-leaks-bridge.js — Pipeline Torneos → leaks + informe post-torneo.
 * Run: node tools/test-tournament-leaks-bridge.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');

function createSandbox() {
  const localStorageData = {};
  const sandbox = {
    console,
    Math,
    Date,
    JSON,
    parseFloat,
    parseInt,
    isNaN,
    isFinite,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Error,
    RegExp,
    Set,
    Map,
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(localStorageData, k) ? localStorageData[k] : null; },
      setItem(k, v) { localStorageData[k] = String(v); },
      removeItem(k) { delete localStorageData[k]; }
    }
  };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

function load(sandbox, rel) {
  const abs = path.join(ROOT, rel);
  const code = fs.readFileSync(abs, 'utf8');
  vm.runInContext(code, sandbox, { filename: path.basename(rel) });
}

const g = createSandbox();
load(g, 'js/engine/format/taxonomy.js');
load(g, 'js/leaks.js');
load(g, 'js/trainer-leak-presets.js');
load(g, 'js/tournament/leaks-bridge.js');

assert.ok(g.PTTournamentLeaksBridge, 'PTTournamentLeaksBridge exported');
const LB = g.PTTournamentLeaksBridge;

function makeHand(overrides) {
  return Object.assign({
    id: 'trn_t1_h1',
    datetime: '2026-09-08T12:00:00.000Z',
    heroPos: 'BTN',
    heroCode: 'AKs',
    heroCards: ['As', 'Ks'],
    handIndex: 3,
    tournamentId: 't1',
    gameKind: 'mtt',
    tableMax: 6,
    playersLeft: 12,
    placesPaid: 3,
    mttPhase: 'mid',
    totalEvLoss: 2.4,
    handScore: 4,
    worstClass: 'error',
    decisions: [
      {
        street: 'preflop',
        chosen: 'call',
        action: 'call',
        label: 'Call 2.5 bb',
        class: 'error',
        evLoss: 1.8,
        best: 'fold',
        spotKind: 'vsRFI',
        mttPhase: 'mid',
        unscored: false
      },
      {
        street: 'flop',
        chosen: 'bet',
        action: 'bet',
        label: 'Bet 3 bb',
        class: 'imprecisa',
        evLoss: 0.6,
        best: 'check',
        spotKind: 'postflop',
        mttPhase: 'mid',
        unscored: false
      },
      {
        street: 'turn',
        chosen: 'check',
        action: 'check',
        label: 'Check',
        class: 'optima',
        evLoss: 0,
        best: 'check',
        spotKind: 'postflop',
        mttPhase: 'mid',
        unscored: false
      }
    ]
  }, overrides || {});
}

// --- errorsFromHand: solo imprecisa/error ---
{
  const errs = LB.errorsFromHand(makeHand(), { id: 't1', config: { kind: 'mtt', seatsPerTable: 6, placesPaid: 3 } });
  assert.strictEqual(errs.length, 2, '2 leak decisions');
  assert.ok(errs.every(function (e) { return e.source === 'tournamentAi'; }), 'source tag');
  assert.ok(errs.every(function (e) { return e.tournamentId === 't1'; }), 'tournamentId');
  assert.ok(errs.every(function (e) { return e.mttPhase === 'mid'; }), 'mttPhase');
  assert.ok(errs.every(function (e) { return e.spotKey; }), 'spotKey');
  assert.ok(errs[0].id.indexOf('trn_t1_h1_trn_') === 0, 'stable id prefix');
  assert.strictEqual(errs[0].playConfig.formatHub, 'mtt', 'playConfig mtt');
  console.log('OK errorsFromHand');
}

// --- phaseBucket: early / bubble / ft ---
{
  const early = LB.phaseBucket(
    { playersLeft: 40, placesPaid: 9, tableMax: 9, mttPhase: 'early' },
    { mttPhase: 'early' },
    { config: { seatsPerTable: 9, placesPaid: 9 } }
  );
  assert.strictEqual(early, 'early', 'early bucket');

  const bubble = LB.phaseBucket(
    { playersLeft: 11, placesPaid: 9, tableMax: 9, mttPhase: 'mid', mttStructureSituation: 'bubble' },
    { mttPhase: 'mid' },
    { config: { seatsPerTable: 9, placesPaid: 9 } }
  );
  assert.strictEqual(bubble, 'bubble', 'bubble bucket');

  const ft = LB.phaseBucket(
    { playersLeft: 8, placesPaid: 9, tableMax: 9, mttPhase: 'mid' },
    { mttPhase: 'mid' },
    { config: { seatsPerTable: 9, placesPaid: 9 } }
  );
  assert.strictEqual(ft, 'ft', 'ft bucket');
  console.log('OK phaseBucket');
}

// --- buildReport ---
{
  const state = {
    id: 't1',
    config: { kind: 'mtt', seatsPerTable: 6, placesPaid: 3, name: 'Test' },
    sessionHands: [
      makeHand({ id: 'trn_t1_h1', handIndex: 1, totalEvLoss: 2.4, playersLeft: 12 }),
      makeHand({
        id: 'trn_t1_h2',
        handIndex: 8,
        totalEvLoss: 3.1,
        playersLeft: 5,
        placesPaid: 3,
        mttPhase: 'short',
        decisions: [
          {
            street: 'preflop',
            chosen: 'fold',
            action: 'fold',
            label: 'Fold',
            class: 'error',
            evLoss: 3.1,
            best: 'allin',
            spotKind: 'RFI',
            mttPhase: 'push',
            unscored: false
          }
        ]
      }),
      makeHand({
        id: 'trn_t1_h3',
        handIndex: 2,
        totalEvLoss: 0.1,
        playersLeft: 12,
        decisions: [
          {
            street: 'preflop',
            chosen: 'raise',
            class: 'aceptable',
            evLoss: 0.1,
            spotKind: 'RFI',
            mttPhase: 'early',
            unscored: false
          }
        ]
      })
    ]
  };
  const report = LB.buildReport(state);
  assert.ok(report.errorCount >= 3, 'errorCount');
  assert.ok(report.worstHands.length >= 1, 'worstHands');
  assert.strictEqual(report.worstHands[0].handIndex, 8, 'worst hand by EV');
  assert.ok(report.phase && report.phase.dominant, 'dominant phase');
  assert.ok(report.topLeaks.length >= 1, 'topLeaks');
  assert.ok(report.drills.length >= 1, 'drills');
  assert.ok(report.drills[0].leakKey, 'drill has leakKey');
  assert.ok(report.drills[0].preset, 'drill has mtt preset');
  assert.strictEqual(report.drills[0].preset.formatHub, 'mtt', 'drill formatHub mtt');
  console.log('OK buildReport');
}

// --- appendErrors via Store stub ---
{
  const storeErrs = [];
  g.Store = {
    appendErrors: function (list) {
      let added = 0;
      list.forEach(function (e) {
        if (storeErrs.some(function (x) { return x.id === e.id; })) return;
        storeErrs.push(e);
        added += 1;
      });
      return { ok: true, added: added, total: storeErrs.length };
    },
    getErrors: function () { return storeErrs.slice(); }
  };
  const hand = makeHand();
  const r1 = LB.recordHandErrors(hand, { id: 't1', config: { kind: 'mtt' } });
  assert.strictEqual(r1.added, 2, 'first record adds 2');
  const r2 = LB.recordHandErrors(hand, { id: 't1', config: { kind: 'mtt' } });
  assert.strictEqual(r2.added, 0, 'idempotent second record');
  assert.strictEqual(storeErrs.length, 2, 'store has 2');
  console.log('OK recordHandErrors idempotent');
}

// --- aggregateLeaks ---
{
  const errs = LB.errorsFromHand(makeHand(), { id: 't1', config: {} });
  const leaks = LB.aggregateLeaks(errs);
  assert.ok(leaks.length >= 1, 'aggregated');
  assert.ok(leaks[0].evLoss >= leaks[leaks.length - 1].evLoss, 'sorted by ev');
  console.log('OK aggregateLeaks');
}

console.log('All tournament leaks-bridge tests passed.');
