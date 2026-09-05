/**
 * tools/test-tournament.js — Smoke tests del chunk Torneos IA.
 * Run: node tools/test-tournament.js
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

  // Minimal Cards stub for live-hand strength / deal fallback
  sandbox.Cards = {
    fullDeck: function () {
      const R = '23456789TJQKA';
      const S = 'cdhs';
      const d = [];
      for (let r = 0; r < R.length; r++) {
        for (let s = 0; s < S.length; s++) d.push(R[r] + S[s]);
      }
      return d;
    },
    shuffle: function (arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    },
    evaluate: function () { return { rank: 4000 }; },
    compare: function () { return 0; },
    handCode: null
  };

  vm.createContext(sandbox);
  return sandbox;
}

function load(sandbox, rel) {
  const abs = path.join(ROOT, rel);
  const code = fs.readFileSync(abs, 'utf8');
  vm.runInContext(code, sandbox, { filename: path.basename(rel) });
}

const FILES = [
  'js/tournament/config.js',
  'js/tournament/blinds.js',
  'js/tournament/names.js',
  'js/tournament/seating.js',
  'js/tournament/state.js',
  'js/tournament/live-hand.js',
  'js/tournament/other-tables.js',
  'js/tournament/role-guess.js',
  'js/tournament/stats.js',
  'js/tournament/hud.js',
  'js/tournament/store.js',
  'js/tournament/runner.js',
  'js/tournament/ui.js',
  'js/tournament/index.js'
];

const g = createSandbox();
FILES.forEach(function (f) { load(g, f); });

// --- config normalize caps entries ≤ 90 ---
{
  const cfg = g.PTTournamentConfig.normalize({ entries: 200, seatsPerTable: 9, kind: 'mtt' });
  assert.strictEqual(cfg.entries, 90, 'entries capped at 90');
  assert.ok(g.PTTournamentConfig.ROLE_IDS.indexOf('tag') >= 0, 'ROLE_IDS');
  assert.ok(g.PTTournamentConfig.listPresets().length >= 5, 'presets');
  const pool = g.PTTournamentConfig.prizePool(g.PTTournamentConfig.fromPreset('sng6'));
  assert.ok(pool > 0, 'prizePool');
  console.log('OK config');
}

// --- blinds level advances by hands ---
{
  const sched = g.PTTournamentConfig.DEFAULT_SCHEDULE;
  const lv0 = g.PTTournamentBlinds.currentLevel(sched, 0);
  const lv1 = g.PTTournamentBlinds.currentLevel(sched, 8);
  assert.strictEqual(lv0.level, 1, 'hand 0 → level 1');
  assert.strictEqual(lv1.level, 2, 'hand 8 → level 2');
  assert.strictEqual(g.PTTournamentBlinds.handsUntilNext(sched, 5), 3, 'hands until next');
  console.log('OK blinds');
}

// --- state create SNG6: 6 players, unique names ---
{
  const state = g.PTTournamentState.create(g.PTTournamentConfig.fromPreset('sng6'), { seed: 42 });
  assert.strictEqual(state.players.length, 6, '6 players');
  const names = state.players.map(function (p) { return p.name; });
  assert.strictEqual(new Set(names).size, 6, 'unique names');
  assert.ok(state.players.every(function (p) { return p.stack === state.config.startingStack; }), 'stacks');
  assert.strictEqual(g.PTTournamentState.playersLeft(state), 6);
  assert.ok(g.PTTournamentState.hero(state).isHero);
  console.log('OK state SNG6');
}

// --- seating rebalance ---
{
  const state = g.PTTournamentState.create({
    kind: 'mtt', entries: 18, seatsPerTable: 6, startingStack: 1500, buyInEur: 5, placesPaid: 3
  }, { seed: 7 });
  assert.ok(state.tables.length >= 2, 'multi table');
  const victim = state.players.find(function (p) { return !p.isHero; });
  g.PTTournamentSeating.bustPlayer(state, victim.id);
  const rb = g.PTTournamentSeating.rebalance(state);
  assert.ok(rb.tables >= 1, 'rebalance tables');
  assert.strictEqual(g.PTTournamentState.playersLeft(state), 17);
  console.log('OK seating');
}

// --- live hand all-AI simulateTable completes ---
{
  const state = g.PTTournamentState.create(g.PTTournamentConfig.fromPreset('sng6'), { seed: 99 });
  const tableId = state.tables[0].id;
  const on = g.PTTournamentSeating.playersOnTable(state, tableId);
  const btn = g.PTTournamentSeating.assignButton(state, tableId);
  const ordered = g.PTTournamentSeating.seatOrderWithButton(on, btn);
  const blinds = g.PTTournamentBlinds.currentLevel(state.config.blindSchedule, 0);
  const hand = g.PTTournamentLiveHand.simulateTable(ordered, blinds);
  assert.strictEqual(hand.stage, 'complete', 'simulateTable completes');
  assert.ok(hand.result && hand.result.deltas, 'deltas');
  console.log('OK live-hand simulateTable');
}

// --- role guess scoring ---
{
  const state = g.PTTournamentState.create(g.PTTournamentConfig.fromPreset('sng6'), { seed: 11 });
  const v = state.players.find(function (p) { return !p.isHero; });
  g.PTTournamentRoleGuess.setGuess(state, v.id, v.roleId);
  const other = state.players.find(function (p) { return !p.isHero && p.id !== v.id; });
  g.PTTournamentRoleGuess.setGuess(state, other.id, v.roleId === 'fish' ? 'nit' : 'fish');
  const sc = g.PTTournamentRoleGuess.score(state);
  assert.strictEqual(sc.total, 2);
  assert.strictEqual(sc.correct, 1);
  assert.strictEqual(sc.xp, 15);
  assert.ok(g.PTTournamentRoleGuess.ROLE_LABELS.maniac, 'Spanish labels');
  console.log('OK role-guess');
}

// --- hud field chip ---
{
  const state = g.PTTournamentState.create(g.PTTournamentConfig.fromPreset('sng6'), { seed: 3 });
  const chip = g.PTTournamentHud.fieldChip(state);
  assert.ok(/^\d+\/6 \(6\)$/.test(chip), 'fieldChip format got ' + chip);
  const rows = g.PTTournamentHud.infoRows(state);
  assert.ok(rows.length >= 8, 'infoRows');
  console.log('OK hud');
}

// --- store ---
{
  g.PTTournamentStore.clear();
  const saved = g.PTTournamentStore.save({
    id: 't1', name: 'Test', kind: 'sng', entries: 6, place: 2,
    prizeEur: 10, buyInEur: 5, profit: 5, roi: 100, roleAccuracy: 50, presetId: 'sng6'
  });
  assert.ok(saved.ok);
  assert.strictEqual(g.PTTournamentStore.list().length, 1);
  assert.strictEqual(g.PTTournamentStore.get('t1').place, 2);
  g.PTTournamentStore.remove('t1');
  assert.strictEqual(g.PTTournamentStore.list().length, 0);
  console.log('OK store');
}

// --- runner: forced-fold hero hands until progress ---
{
  const state = g.PTTournamentRunner.create('sng6', { seed: 123, heroName: 'Tester' });
  assert.strictEqual(state.players.length, 6);
  let progressed = false;
  for (let i = 0; i < 12; i++) {
    if (state.status !== 'running') break;
    let hand = g.PTTournamentRunner.beginHand(state);
    if (!hand) break;
    let guard = 0;
    while (hand && hand.stage === 'playing' && hand.awaitingHero && guard++ < 40) {
      const opt = (hand.heroOptions && hand.heroOptions[0]) || { id: 'fold' };
      g.PTTournamentRunner.heroAct(state, opt.id === 'check' ? 'check' : (opt.id === 'fold' ? 'fold' : opt.id), opt.amount);
      hand = state._liveHand;
    }
    if (hand && hand.stage === 'complete' && !state._liveHand) {
      // already applied
    } else if (hand && hand.stage === 'complete') {
      g.PTTournamentRunner.applyResults(state, hand);
    }
    if (state.handIndex > 0) progressed = true;
    if (state.status === 'finished' || state.status === 'busted_pending') break;
  }
  assert.ok(progressed || state.handIndex > 0 || state.status !== 'running',
    'runner should progress hands (handIndex=' + state.handIndex + ' status=' + state.status + ')');
  assert.ok(state.stats.handsPlayed >= 1 || state.handIndex >= 1, 'stats or handIndex');
  console.log('OK runner (hands=' + state.handIndex + ', status=' + state.status + ')');
}

// --- stats summary helpers ---
{
  const state = g.PTTournamentRunner.create('sng6', { seed: 5 });
  const sum = g.PTTournamentStats.summary(state);
  assert.strictEqual(sum.invested, state.config.buyInEur);
  assert.ok('roi' in sum && 'vpip' in sum && 'pfr' in sum);
  console.log('OK stats');
}

// --- index API ---
{
  assert.ok(typeof g.PTTournaments.menuVisible === 'function');
  assert.ok(typeof g.PTTournaments.render === 'function');
  assert.strictEqual(g.PTTournaments.menuVisible(), false, 'no admin → hidden');
  console.log('OK index');
}

console.log('*** test-tournament OK ***');
