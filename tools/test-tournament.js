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

// --- hero action labels in bb ---
{
  const state = g.PTTournamentRunner.create('sng6', { seed: 77, heroName: 'BbHero' });
  let hand = g.PTTournamentRunner.beginHand(state);
  let guard = 0;
  while (hand && hand.stage === 'playing' && !hand.awaitingHero && guard++ < 60) {
    /* villains act inside beginHand / heroAct loop */
    break;
  }
  /* Force advance until hero faces a decision with amounts */
  guard = 0;
  while (hand && hand.stage === 'playing' && guard++ < 80) {
    if (hand.awaitingHero && hand.heroOptions && hand.heroOptions.length) {
      const labeled = hand.heroOptions.filter(function (o) {
        return o.id === 'call' || o.id === 'allin';
      });
      labeled.forEach(function (o) {
        assert.ok(/\bbb\b/i.test(o.label), 'label in bb: ' + o.label);
        assert.ok(!/\bCall \d+(\.\d+)?\s*$/.test(o.label), 'no raw chips in call label: ' + o.label);
      });
      if (labeled.length) {
        console.log('OK bb-labels (' + labeled.map(function (o) { return o.label; }).join(', ') + ')');
        break;
      }
      /* No call/allin this street — check/fold and continue */
      const opt = hand.heroOptions.find(function (o) { return o.id === 'check' || o.id === 'fold'; }) || hand.heroOptions[0];
      g.PTTournamentRunner.heroAct(state, opt.id, opt.amount);
      hand = state._liveHand;
      continue;
    }
    break;
  }
  assert.ok(guard < 80, 'found hero options with bb labels');
}

// --- index API ---
{
  assert.ok(typeof g.PTTournaments.menuVisible === 'function');
  assert.ok(typeof g.PTTournaments.render === 'function');
  assert.strictEqual(g.PTTournaments.menuVisible(), false, 'no admin → hidden');
  console.log('OK index');
}


// --- hand end keeps table until continueAfterHand ---
{
  const state = g.PTTournamentRunner.create('sng6', { seed: 42, heroName: 'EndPop' });
  let hand = g.PTTournamentRunner.beginHand(state);
  let guard = 0;
  while (hand && hand.stage === 'playing' && hand.awaitingHero && guard++ < 80) {
    const opt = (hand.heroOptions || []).find(function (o) { return o.id === 'fold' || o.id === 'check'; })
      || (hand.heroOptions || [])[0];
    g.PTTournamentRunner.heroAct(state, opt.id, opt.amount != null ? opt.amount : opt.suggested);
    hand = state._liveHand;
  }
  assert.ok(hand && hand.stage === 'complete', 'hand stays complete on table');
  assert.ok(hand.result && hand.result.deltas, 'result payload present');
  assert.ok(state._liveHand, 'live hand not cleared before continue');
  g.PTTournamentRunner.continueAfterHand(state);
  assert.ok(state.handIndex >= 1, 'continue applies results');
  console.log('OK hand-end-popup-flow');
}

// --- bet/raise labels include bb ---
{
  const state = g.PTTournamentRunner.create('sng6', { seed: 99 });
  let hand = g.PTTournamentRunner.beginHand(state);
  let found = null;
  let guard = 0;
  while (hand && hand.stage === 'playing' && guard++ < 100) {
    if (hand.awaitingHero && hand.heroOptions) {
      found = hand.heroOptions.find(function (o) { return o.id === 'bet' || o.id === 'raise'; });
      if (found) break;
      const opt = hand.heroOptions.find(function (o) { return o.id === 'check' || o.id === 'call'; })
        || hand.heroOptions[0];
      g.PTTournamentRunner.heroAct(state, opt.id, opt.amount != null ? opt.amount : opt.suggested);
      hand = state._liveHand;
      continue;
    }
    break;
  }
  if (found) {
    assert.ok(/\bbb\b/i.test(found.label), 'bet/raise label in bb: ' + found.label);
    console.log('OK bet-raise-label (' + found.label + ')');
  } else {
    console.log('OK bet-raise-label (skipped — no bet/raise faced)');
  }
}

// --- active tournament persistence ---
{
  g.PTTournamentStore.clearActive();
  const state = g.PTTournamentRunner.create('sng6', { seed: 7 });
  g.PTTournamentRunner.beginHand(state);
  const saved = g.PTTournamentStore.saveActive(state);
  assert.ok(saved.ok, 'saveActive ok');
  assert.ok(g.PTTournamentStore.hasActive(), 'hasActive');
  const sum = g.PTTournamentStore.activeSummary();
  assert.ok(sum && sum.name, 'activeSummary');
  const loaded = g.PTTournamentStore.loadActive();
  assert.ok(loaded && loaded.id === state.id, 'loadActive id');
  g.PTTournamentStore.clearActive();
  assert.ok(!g.PTTournamentStore.hasActive(), 'clearActive');
  console.log('OK active-persist');
}

// --- deck integrity: 52 cartas únicas por mano, sin repetidos ---
{
  for (let n = 0; n < 40; n++) {
    const state = g.PTTournamentRunner.create('sng6', { seed: 1000 + n });
    const hand = g.PTTournamentRunner.beginHand(state);
    assert.ok(hand, 'hand dealt');
    hand.seats.forEach(function (s) {
      assert.strictEqual((s.cards || []).length, 2, 'two hole cards per seat');
    });
    assert.strictEqual(hand.boardDeck.length, 5, 'five board cards');
    const all = g.PTTournamentLiveHand.allDealtCards(hand);
    assert.strictEqual(all.length, hand.seats.length * 2 + 5, 'dealt count');
    assert.strictEqual(new Set(all).size, all.length, 'no duplicate cards (hand ' + n + ')');
    assert.ok(!g.PTTournamentLiveHand.hasDuplicateCards(hand), 'hasDuplicateCards false');
    all.forEach(function (c) {
      assert.ok(/^[2-9TJQKA][cdhs]$/.test(c), 'valid card code ' + c);
    });
  }
  console.log('OK deck-unique-52');
}

// --- fotogramas: la acción empieza en UTG y llega al héroe ---
{
  const state = g.PTTournamentRunner.create('sng6', { seed: 4242 });
  const hand = g.PTTournamentRunner.beginHand(state);
  const frames = hand._frames || [];
  assert.ok(frames.length >= 1, 'frames captured');
  assert.strictEqual(frames[0].kind, 'deal', 'first frame is the deal');

  const prefs = ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  const seatPos = hand.seats.map(function (s) { return s.pos; });
  const order = prefs.filter(function (p) { return seatPos.indexOf(p) >= 0; });
  const heroSeat = hand.seats.find(function (s) { return s.isHero; });
  const acts = frames.filter(function (f) { return f.kind === 'act'; });

  if (acts.length) {
    const firstActor = order.find(function (p) { return p !== heroSeat.pos; });
    assert.strictEqual(acts[0].pos, firstActor, 'primer actor visible = primero en orden preflop');
    // Orden preflop respetado en los fotogramas preflop (sin repetir vuelta).
    const pre = acts.filter(function (f) { return f.street === 'preflop'; });
    let idx = -1;
    let wrapped = false;
    pre.forEach(function (f) {
      const at = order.indexOf(f.pos);
      if (at <= idx) wrapped = true;
      idx = at;
    });
    assert.ok(!wrapped || pre.length > order.length - 1, 'orden preflop coherente');
  }
  acts.forEach(function (f) {
    assert.ok(!f.isHero, 'ningún fotograma del héroe antes de que actúe');
  });
  assert.ok(hand.awaitingHero || hand.stage === 'complete', 'para en el héroe o cierra la mano');
  console.log('OK frames-utg-to-hero (' + frames.length + ' fotogramas)');
}

// --- fotogramas tras la acción del héroe (acción posterior visible) ---
{
  const state = g.PTTournamentRunner.create('sng6', { seed: 515 });
  let hand = g.PTTournamentRunner.beginHand(state);
  let guard = 0;
  while (hand && hand.stage === 'playing' && !hand.awaitingHero && guard++ < 20) {
    hand = state._liveHand;
  }
  if (hand && hand.awaitingHero) {
    const opt = (hand.heroOptions || []).find(function (o) { return o.id === 'call' || o.id === 'check'; })
      || (hand.heroOptions || [])[0];
    g.PTTournamentRunner.heroAct(state, opt.id, opt.amount != null ? opt.amount : opt.suggested);
    const after = (state._liveHand._frames || []);
    assert.ok(after.length >= 1, 'fotogramas tras heroAct');
    assert.ok(after[0].isHero, 'primer fotograma posterior = acción del héroe');
    console.log('OK frames-after-hero (' + after.length + ' fotogramas)');
  } else {
    console.log('OK frames-after-hero (skipped — sin turno de héroe)');
  }
}

// --- turno correcto: nadie actúa fuera de orden antes del héroe ---
{
  const PREFS = ['UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  let checked = 0;
  let violations = 0;
  const detail = [];

  for (let n = 0; n < 60; n++) {
    const state = g.PTTournamentRunner.create(n % 2 ? 'sng6' : 'easy', { seed: 7000 + n });
    let hand = g.PTTournamentRunner.beginHand(state);
    for (let h = 0; h < 4 && hand; h++) {
      const seatPos = hand.seats.map(function (s) { return s.pos; });
      const order = PREFS.filter(function (p) { return seatPos.indexOf(p) >= 0; });
      const hero = hand.seats.find(function (s) { return s.isHero; });
      const heroIdx = order.indexOf(hero.pos);
      const pre = hand.log.filter(function (e) { return e.street === 'preflop'; });
      const heroAt = pre.findIndex(function (e) { return e.id === hero.id; });
      const before = heroAt < 0 ? pre : pre.slice(0, heroAt);
      const seen = new Set();
      for (const e of before) {
        if (seen.has(e.id)) break; // segunda vuelta: ya no aplica el invariante
        seen.add(e.id);
        const seat = hand.seats.find(function (s) { return s.id === e.id; });
        if (order.indexOf(seat.pos) > heroIdx) {
          violations++;
          if (detail.length < 3) detail.push(hero.pos + ' actuaría después de ' + seat.pos);
        }
      }
      checked++;
      if (hand.awaitingHero) {
        const opt = (hand.heroOptions || []).find(function (o) { return o.id === 'fold'; })
          || (hand.heroOptions || [])[0];
        g.PTTournamentRunner.heroAct(state, opt.id, opt.amount != null ? opt.amount : opt.suggested);
      }
      g.PTTournamentRunner.continueAfterHand(state);
      hand = state.status === 'running' ? state._liveHand : null;
    }
  }
  assert.strictEqual(violations, 0, 'orden preflop UTG→BB respetado: ' + detail.join(' | '));
  assert.ok(checked > 100, 'manos comprobadas');
  console.log('OK preflop-turn-order (' + checked + ' manos)');
}

// --- el guardado no arrastra fotogramas de presentación ---
{
  g.PTTournamentStore.clearActive();
  const state = g.PTTournamentRunner.create('sng6', { seed: 61 });
  g.PTTournamentRunner.beginHand(state);
  assert.ok((state._liveHand._frames || []).length > 0, 'frames en memoria');
  g.PTTournamentStore.saveActive(state);
  const loaded = g.PTTournamentStore.loadActive();
  assert.ok(loaded && loaded._liveHand, 'mano guardada');
  assert.ok(!loaded._liveHand._frames, 'frames no persistidos');
  g.PTTournamentStore.clearActive();
  console.log('OK frames-not-persisted');
}

console.log('*** test-tournament OK ***');
