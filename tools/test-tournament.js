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
  'js/hand-end-view.js',
  'js/tournament/config.js',
  'js/tournament/blinds.js',
  'js/tournament/names.js',
  'js/tournament/seating.js',
  'js/tournament/state.js',
  'js/engine/format/taxonomy.js',
  'js/engine/ranges/pushFold.js',
  'js/tournament/gto-eval.js',
  'js/tournament/villain-decide.js',
  'js/tournament/live-hand.js',
  'js/tournament/other-tables.js',
  'js/tournament/role-guess.js',
  'js/tournament/stats.js',
  'js/tournament/hud.js',
  'js/tournament/wallet.js',
  'js/tournament/leaderboard.js',
  'js/tournament/store.js',
  'js/tournament/session-bridge.js',
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
  assert.ok(g.PTTournamentConfig.listPresets().length >= 8, 'presets include spins');
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
    let sawRaise = false;
    pre.forEach(function (f) {
      const at = order.indexOf(f.pos);
      const a = String(f.action || '');
      if (a === 'raise' || a === 'bet') sawRaise = true;
      if (at <= idx) wrapped = true;
      idx = at;
    });
    /* Un wrap es legal tras reopen (3bet/call) o si ya hubo más de una órbita. */
    assert.ok(!wrapped || sawRaise || pre.length > order.length - 1, 'orden preflop coherente');
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

// --- tras raise de SB, la BB actúa antes que un limp en CO ---
{
  const seats = [
    { player: { id: 'co', name: 'Carlos', isHero: false, roleId: 'tag', stack: 500 }, pos: 'CO', seatIndex: 0 },
    { player: { id: 'btn', name: 'Bea', isHero: false, roleId: 'tag', stack: 500 }, pos: 'BTN', seatIndex: 1 },
    { player: { id: 'sb', name: 'Sam', isHero: false, roleId: 'tag', stack: 500 }, pos: 'SB', seatIndex: 2 },
    { player: { id: 'hero', name: 'José', isHero: true, roleId: null, stack: 600 }, pos: 'BB', seatIndex: 3 }
  ];
  const prevDecide = g.PTTournamentVillainDecide;
  g.PTTournamentVillainDecide = {
    decide: function (hand, seat) {
      if (seat.pos === 'CO' && hand.currentBet <= hand.bb + 0.001) {
        return { id: 'call', amount: hand.bb - seat.streetInvested };
      }
      if (seat.pos === 'BTN') return { id: 'fold' };
      if (seat.pos === 'SB') return { id: 'raise', amount: hand.bb * 4.2 };
      return { id: 'fold' };
    }
  };
  try {
    const hand = g.PTTournamentLiveHand.start(seats, { sb: 10, bb: 20 }, 'hero');
    g.PTTournamentLiveHand.runToHeroOrEnd(hand);
    assert.ok(hand.awaitingHero, 'espera acción del héroe (BB)');
    const co = hand.seats.find(function (s) { return s.pos === 'CO'; });
    const sb = hand.seats.find(function (s) { return s.pos === 'SB'; });
    const hero = hand.seats.find(function (s) { return s.isHero; });
    assert.ok(co && !co.folded, 'CO no foldéa antes de que hable la BB');
    assert.ok(sb && sb.lastAction && sb.lastAction.action === 'raise', 'SB ha subido');
    assert.ok(hero && hand._heroSeatId === hero.id, 'turno del héroe');
    const pre = hand.log.filter(function (e) { return e.street === 'preflop'; });
    const heroAt = pre.findIndex(function (e) { return e.id === 'hero'; });
    assert.ok(heroAt < 0, 'héroe aún no ha actuado en el log');
    const coFoldBefore = pre.some(function (e) {
      return e.id === 'co' && e.action === 'fold';
    });
    assert.ok(!coFoldBefore, 'no hay fold de CO previo al héroe');
    console.log('OK raise-sb-bb-before-co-limp');
  } finally {
    if (prevDecide) g.PTTournamentVillainDecide = prevDecide;
    else delete g.PTTournamentVillainDecide;
  }
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


// --- asientos: BTN → SB → BB en sentido horario ---
{
  const players = [0,1,2,3,4,5].map(function (i) {
    return { id: 'p' + i, name: 'P' + i, seat: i, stack: 1500, alive: true };
  });
  const ordered = g.PTTournamentSeating.seatOrderWithButton(players, 'p0');
  assert.deepStrictEqual(ordered.map(function (x) { return x.pos; }),
    ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'], 'clockwise BTN-SB-BB-early');
  // Tras rotar héroe en SB: siguiente es BB, no BTN
  const ring = ordered.slice();
  const hi = ring.findIndex(function (x) { return x.pos === 'SB'; });
  const rotated = ring.slice(hi).concat(ring.slice(0, hi));
  assert.strictEqual(rotated[0].pos, 'SB');
  assert.strictEqual(rotated[1].pos, 'BB');
  assert.notStrictEqual(rotated[1].pos, 'BTN');
  console.log('OK seating-clockwise');
}

// --- showdown: rueda A2345 empate AT vs J5 ---
{
  const seats = [
    { player: { id: 'h', name: 'Hero', isHero: true, roleId: 'tag', stack: 1000 }, pos: 'BTN', seatIndex: 0 },
    { player: { id: 'v', name: 'Vil', isHero: false, roleId: 'tag', stack: 1000 }, pos: 'BB', seatIndex: 1 }
  ];
  // Stub Cards with real-ish evaluate via rank arrays if needed
  if (!g.Cards.evaluate || !g.Cards.evaluate.length) {
    /* keep stub; inject wheel-aware evaluate */
  }
  // Use a minimal evaluator for wheel (restore after)
  const prevEvaluate = g.Cards.evaluate;
  const RANK = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14 };
  g.Cards.evaluate = function (codes) {
    const vals = codes.map(function (c) { return RANK[String(c)[0]]; });
    const set = new Set(vals);
    if (set.has(14)) set.add(1);
    const d = Array.from(set).sort(function (a,b){return b-a;});
    let run = 1;
    for (let i = 0; i < d.length - 1; i++) {
      if (d[i] - 1 === d[i+1]) { run++; if (run >= 5) return { category: 4, name: 'Escalera', rank: [4, d[i-3]] }; }
      else run = 1;
    }
    return { category: 0, name: 'Carta alta', rank: [0].concat(vals.sort(function(a,b){return b-a;}).slice(0,5)) };
  };
  g.Cards.compare = function (a, b) {
    const ra = a.rank || [], rb = b.rank || [];
    for (let i = 0; i < Math.max(ra.length, rb.length); i++) {
      const x = ra[i] || 0, y = rb[i] || 0;
      if (x !== y) return x - y;
    }
    return 0;
  };
  const hand = g.PTTournamentLiveHand.start(seats, { sb: 10, bb: 20 }, 'h');
  hand.seats[0].cards = ['As', 'Ts'];
  hand.seats[1].cards = ['5c', 'Js'];
  hand.boardDeck = ['3h', '4s', '2c', '5h', 'Ad'];
  hand.board = [];
  hand.street = 'river';
  hand.pot = 200;
  hand.seats.forEach(function (s) {
    s.invested = 100; s.streetInvested = 100; s.stack = 900; s.folded = false; s.allIn = true;
    hand.acted[s.id] = true;
  });
  hand.awaitingHero = false;
  g.PTTournamentLiveHand.runToHeroOrEnd(hand);
  assert.strictEqual(hand.stage, 'complete', 'wheel hand completes');
  assert.ok(hand.result.tied, 'wheel chop tied');
  assert.strictEqual(hand.result.winners.length, 2, 'both winners');
  assert.ok(Math.abs(hand.result.deltas.h) < 0.02, 'hero delta ~0 got ' + hand.result.deltas.h);
  assert.ok(Math.abs(hand.result.deltas.v) < 0.02, 'villain delta ~0');
  g.Cards.evaluate = prevEvaluate;
  console.log('OK showdown-wheel-chop');
}

// --- Koins formatter ---
{
  assert.ok(String(g.PTTournamentHud.fmtKoins(5)).indexOf('Koins') >= 0, 'fmtKoins');
  const state = g.PTTournamentState.create(g.PTTournamentConfig.fromPreset('sng6'), { seed: 1 });
  const rows = g.PTTournamentHud.infoRows(state);
  const top = rows.find(function (r) { return /Top 10/i.test(r.label); });
  assert.ok(top, 'info has top 10');
  if (top.value && top.value.html) assert.ok(/trn-stack-list|ol|li/.test(top.value.content), 'top10 list html');
  const buy = rows.find(function (r) { return /Buy-in/i.test(r.label); });
  var buyVal = buy && (buy.value && buy.value.html ? buy.value.content : buy.value);
  assert.ok(buy && /Koins/.test(String(buyVal)), 'buy-in in Koins');
  console.log('OK koins-and-top10');
}

// --- heroOptions sizing buttons ---
{
  const state = g.PTTournamentState.create(g.PTTournamentConfig.fromPreset('sng6'), { seed: 3, heroName: 'Alex' });
  assert.strictEqual(g.PTTournamentState.hero(state).name, 'Alex', 'heroName');
  const tableId = state.tables[0].id;
  const Seat = g.PTTournamentSeating;
  const on = Seat.playersOnTable(state, tableId);
  const btn = Seat.assignButton(state, tableId);
  const ordered = Seat.seatOrderWithButton(on, btn);
  const blinds = g.PTTournamentBlinds.currentLevel(state.config.blindSchedule, 0);
  const hand = g.PTTournamentLiveHand.start(ordered, blinds, 'hero');
  g.PTTournamentLiveHand.runToHeroOrEnd(hand);
  if (hand.awaitingHero && hand.heroOptions && hand.heroOptions.length) {
    assert.ok(hand.heroOptions.length >= 3, 'several hero options');
    const labels = hand.heroOptions.map(function (o) { return o.label; }).join(' ');
    assert.ok(/bb/i.test(labels), 'sizing labels include bb: ' + labels);
  }
  console.log('OK heroOptions sizing');
}

// --- wallet debit/credit ---
{
  const W = g.PTTournamentWallet;
  assert.ok(W, 'wallet module');
  W.setBalance(100);
  assert.strictEqual(W.getBalance(), 100);
  const d = W.debit(5, { type: 'buyin' });
  assert.ok(d.ok);
  assert.strictEqual(W.getBalance(), 95);
  W.credit(12, { type: 'prize' });
  assert.strictEqual(W.getBalance(), 107);
  console.log('OK wallet');
}

// --- popup ciegas centrado (sin botón OK) ---
{
  const uiSrc = fs.readFileSync(path.join(ROOT, 'js/tournament/ui.js'), 'utf8');
  assert.ok(uiSrc.includes('toastPopupHtml'), 'toastPopupHtml in ui');
  assert.ok(uiSrc.includes('trn-center-popup'), 'centered popup class');
  assert.ok(uiSrc.includes("schedulePopupClear('blind', 2000)"), 'auto-clear blind popup');
  assert.ok(!/trn-blind-up[\s\S]{0,200}dismiss-blind-up/.test(uiSrc),
    'old blind-up OK banner removed from paint path');
}
console.log('OK blind-popup-source');

// --- villanos: menos check / no overfold a bet chica ---
{
  const D = g.PTTournamentVillainDecide;
  assert.ok(D && typeof D.decide === 'function', 'VillainDecide loaded');
  const seat = {
    id: 'v1', roleId: 'tag', pos: 'CO',
    cards: [{ code: 'Ah' }, { code: 'Kd' }],
    stack: 1500, streetInvested: 0, invested: 0
  };
  let bets = 0;
  for (let i = 0; i < 80; i++) {
    const act = D.decide({
      street: 'flop', bb: 20, pot: 100, currentBet: 0, minRaise: 20,
      openerId: 'v1', board: [{ code: 'Qc' }, { code: '7h' }, { code: '2d' }],
      seats: [seat], log: []
    }, seat);
    if (act && (act.id === 'bet' || act.id === 'raise')) bets += 1;
  }
  assert.ok(bets >= 25, 'c-bet / lead freq razonable got bets=' + bets + '/80');

  let folds = 0;
  const facing = Object.assign({}, seat, { streetInvested: 0 });
  for (let i = 0; i < 60; i++) {
    const act = D.decide({
      street: 'flop', bb: 20, pot: 100, currentBet: 33, minRaise: 20,
      openerId: 'hero', board: [{ code: 'Qc' }, { code: '7h' }, { code: '2d' }],
      seats: [facing], log: []
    }, facing);
    if (act && act.id === 'fold') folds += 1;
  }
  assert.ok(folds <= 25, 'no overfold a ~33% pot got folds=' + folds + '/60');
}
console.log('OK villain-aggression');

// --- dist bundle debe incluir los cambios (prod carga dist/) ---
{
  const distPath = path.join(ROOT, 'dist/pt-tournaments.js');
  assert.ok(fs.existsSync(distPath), 'dist/pt-tournaments.js exists');
  const dist = fs.readFileSync(distPath, 'utf8');
  assert.ok(dist.includes('PTTournamentVillainDecide'), 'dist includes VillainDecide');
  assert.ok(dist.includes('trn-center-popup'), 'dist includes centered popup');
  assert.ok(dist.includes('toastPopupHtml') || dist.includes('trn-popup-blind'),
    'dist includes blind toast popup');
  assert.ok(!/trn-blind-up[\s\S]{0,220}dismiss-blind-up/.test(dist),
    'dist without old OK blind banner');
  assert.ok(dist.includes('PTTournamentSessionBridge'), 'dist includes session bridge');
  assert.ok(dist.includes('tournamentAi'), 'dist includes tournamentAi source');
  assert.ok(dist.includes('handFromTournament'), 'dist includes handFromTournament');
}
console.log('OK dist-tournaments-bundle');

// --- session-bridge: mano → shape de sesión ---
{
  assert.ok(g.PTTournamentSessionBridge, 'SessionBridge loaded');
  assert.ok(g.PTHandEndView, 'HandEndView loaded');
  const seats = [
    { id: 'h', name: 'Hero', isHero: true, pos: 'BTN', cards: ['Ah', 'Kd'], stack: 1500, startStack: 1500, folded: false },
    { id: 'v', name: 'Villain', isHero: false, pos: 'BB', cards: ['Qc', 'Qd'], stack: 1480, startStack: 1500, folded: false }
  ];
  const source = {
    handIndex: 3,
    bb: 20,
    sb: 10,
    ante: 0,
    board: ['2c', '7h', 'Td', 'Js', '3s'],
    seats: seats,
    log: [
      { street: 'preflop', id: 'h', name: 'Hero', action: 'raise', amount: 60 },
      { street: 'preflop', id: 'v', name: 'Villain', action: 'call', amount: 40 },
      { street: 'flop', id: 'v', name: 'Villain', action: 'check' },
      { street: 'flop', id: 'h', name: 'Hero', action: 'bet', amount: 40 }
    ],
    decisions: [
      { street: 'preflop', action: 'raise', class: 'optima', evLoss: 0, label: 'Raise to 3 bb', gto: { raise: 0.7, fold: 0.3 } },
      { street: 'flop', action: 'bet', class: 'aceptable', evLoss: 0.12, label: 'Bet 2 bb', strategy: { bet: 0.55, check: 0.45 } }
    ],
    result: {
      deltas: { h: 80, v: -80 },
      winners: ['h'],
      showdown: true,
      tied: false,
      pot: 160,
      board: ['2c', '7h', 'Td', 'Js', '3s'],
      holeCards: { h: ['Ah', 'Kd'], v: ['Qc', 'Qd'] },
      heroNet: 80
    }
  };
  const hand = g.PTTournamentSessionBridge.handFromTournament(source, {
    tournamentId: 't_test',
    handIndex: 3,
    heroName: 'Hero'
  });
  assert.ok(hand, 'bridged hand');
  assert.ok(hand.decisions && hand.decisions.length === 2, 'decisions');
  assert.ok(hand.summary && hand.summary.length, 'summary timeline');
  assert.ok(hand.streets && hand.streets.preflop && hand.streets.preflop.length, 'streets');
  assert.strictEqual(hand.heroNetBB, 4, 'heroNetBB = 80/20');
  assert.strictEqual(hand.platform || hand.source, hand.source === 'tournamentAi' ? 'tournamentAi' : hand.platform);
  assert.ok(hand.source === 'tournamentAi' || hand.platform === 'tournamentAi', 'tournamentAi tag');
  assert.ok(hand.decisions[0].class === 'optima' || hand.decisions[0].class === 'aceptable', 'spanish class');
  assert.ok(hand.decisions[0].label, 'decision label');
  const html = g.PTHandEndView.renderHandEndHtml(hand, { title: 'Ganas la mano', showDecisions: true });
  assert.ok(html.includes('hand-end-view') || html.includes('Ganas'), 'hand-end html');
  assert.ok(/nota|score|10|Óptima|óptima|optima|Aceptable|aceptable/i.test(html) || html.includes('dec-review') || html.includes('verdict'),
    'hand-end shows score/decisions style');
  assert.ok(hand.shows && hand.shows.Villain, 'shows villain cards for showdown');
  assert.ok(html.includes('Villain') || html.includes('Qc') || html.includes('hand-end-seat'),
    'hand-end shows villain seat/cards');
  const badge = g.PTHandEndView.scoreBadgeHtml({ score: 10, letter: 'A' });
  assert.ok(/Nota 10\/10/.test(badge), 'badge says Nota X/10');
  assert.ok(!/·\s*A/.test(badge), 'badge no longer shows confusing · A');
  assert.ok(hand.heroCode === 'AKo' || hand.heroCode === 'AKs',
    'heroCode from Ranges/fallback, got ' + hand.heroCode);
  assert.ok(String(hand.heroCode).indexOf('null') < 0, 'heroCode not null string');
  console.log('OK session-bridge');
}

// --- finish → saveSession tournamentAi + stats ---
{
  const saved = [];
  g.Store = {
    saveSession: function (session) {
      saved.push(session);
      return Promise.resolve(session);
    },
    getStats: function () { return { school: { xp: 0, lessons: {} } }; },
    persistStats: function () {}
  };
  g.Importer = {
    computeStats: function (hands) {
      return {
        nHands: hands.length,
        accuracy: 80,
        vpipPct: 25,
        pfrPct: 18,
        netBB: 4,
        evLossBB: 0.12,
        grade: 'B',
        best5: hands.slice(0, 1),
        worst5: hands.slice(0, 1)
      };
    },
    buildHandTags: function () { return []; }
  };

  const state = g.PTTournamentRunner.create(g.PTTournamentConfig.fromPreset('sng6'), { seed: 3 });
  // Simulate one analyzed hand already bridged
  const fakeHand = g.PTTournamentSessionBridge.handFromTournament({
    handIndex: 1,
    bb: 20,
    sb: 10,
    board: ['Ah', '7c', '2d'],
    seats: [
      { id: 'h', name: 'Hero', isHero: true, pos: 'CO', cards: ['Ks', 'Kd'], stack: 1500, startStack: 1500, folded: false },
      { id: 'v', name: 'Villain', isHero: false, pos: 'BB', cards: ['9h', '9c'], stack: 1480, startStack: 1500, folded: false }
    ],
    log: [{ street: 'preflop', id: 'h', name: 'Hero', action: 'raise', amount: 60 }],
    decisions: [{ street: 'preflop', action: 'raise', class: 'optima', evLoss: 0, label: 'Raise' }],
    result: { deltas: { h: 40, v: -40 }, winners: ['h'], showdown: false, pot: 80, heroNet: 40, holeCards: {}, board: ['Ah', '7c', '2d'] }
  }, { tournamentId: state.id, handIndex: 1, heroName: 'Hero' });
  state.sessionHands = [fakeHand];
  state.handLog = [{ handIndex: 1, pot: 80, bb: 20, seats: fakeHand.seats, log: [], decisions: fakeHand.decisions, board: fakeHand.board, result: { heroNet: 40, deltas: { h: 40 }, winners: ['h'] } }];

  const result = g.PTTournamentRunner.finish(state, { reason: 'bust' });
  assert.ok(result.sessionId, 'result.sessionId');
  assert.ok(result.sessionStats, 'result.sessionStats');
  assert.ok(saved.length >= 1, 'saveSession called');
  assert.strictEqual(saved[0].source, 'tournamentAi', 'source tournamentAi');
  assert.ok(saved[0].stats && saved[0].stats.nHands === 1, 'computeStats stats');
  assert.ok(saved[0].hands && saved[0].hands.length === 1, 'session hands');
  const hist = g.PTTournamentStore.list();
  assert.ok(hist.some(function (h) { return h.sessionId === result.sessionId; }), 'history links sessionId');
  console.log('OK tournament-session-save');
}

// --- smoke: hand-end UI source includes trainer-style actions ---
{
  const uiSrc = fs.readFileSync(path.join(ROOT, 'js/tournament/ui.js'), 'utf8');
  assert.ok(uiSrc.includes('PTHandEndView') || uiSrc.includes('renderHandEndHtml'), 'ui uses HandEndView');
  assert.ok(uiSrc.includes('hand-end-review') || uiSrc.includes('Paso a paso'), 'paso a paso button');
  assert.ok(uiSrc.includes('renderSessionStatsHtml') || uiSrc.includes('sessionStats'), 'result uses session stats');
  assert.ok(uiSrc.includes('open-session') || uiSrc.includes('openSessionHand'), 'open session from result/history');
  assert.ok(uiSrc.includes('seat-name'), 'villain names on seats');
  assert.ok(uiSrc.includes('review-hand'), 'info handlog opens paso a paso');
  assert.ok(uiSrc.includes('trn-info-handlog-wrap') || uiSrc.includes('toggle-handlog'), 'handlog collapsed');
  assert.ok(uiSrc.includes('trn-hand-end-scroll'), 'hand-end scroll region');
  const cssSrc = fs.readFileSync(path.join(ROOT, 'css/tournaments.css'), 'utf8');
  assert.ok(cssSrc.includes('trn-hand-end-scroll'), 'css scroll region');
  assert.ok(cssSrc.includes('seat-name'), 'css seat names');
  /* Móvil: styles.css pone .seats { pointer-events:none }; torneo debe reactivar asientos. */
  assert.ok(/\.trn-play-like\s+\.seats\s+\.seat\s*\{[^}]*pointer-events:\s*auto/s.test(cssSrc),
    'css re-enables pointer-events on tournament seats');
  assert.ok(uiSrc.includes('data-player') && uiSrc.includes('roleModalPlayerId'),
    'clicking villain opens role modal');
  const coreChunk = fs.readFileSync(path.join(ROOT, 'js/bundle-chunks.js'), 'utf8');
  assert.ok(coreChunk.includes('hand-end-view.js'), 'chunk lists hand-end-view');
  assert.ok(coreChunk.includes('session-bridge.js'), 'chunk lists session-bridge');
  console.log('OK hand-end-session-ui-source');
}


// --- paso a paso desde torneo: volver al torneo, sin replay GTO / análisis ---
{
  const appSrc = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
  assert.ok(appSrc.includes('tournamentReviewReturn'), 'flag tournamentReviewReturn');
  assert.ok(appSrc.includes('Volver al torneo'), 'label Volver al torneo');
  assert.ok(appSrc.includes("goToTab('tournaments')"), 'back goes to tournaments');
  assert.ok(appSrc.includes('setTournamentReviewBackLabel'), 'setTournamentReviewBackLabel');
  assert.ok(/hideGtoReplay[\s\S]{0,120}to-replay|!hideGtoReplay[\s\S]{0,80}to-replay/.test(appSrc),
    'GTO replay button gated by hideGtoReplay');
  assert.ok(appSrc.includes('openTournamentHandReview'), 'openTournamentHandReview export');
  // No debe reutilizar el label corto de análisis como retorno de torneo
  const openTrn = appSrc.slice(appSrc.indexOf('function openTournamentHandReview'),
    appSrc.indexOf('window.openTournamentHandReview'));
  assert.ok(openTrn.includes('tournamentReviewReturn = true'), 'sets tournament return');
  assert.ok(openTrn.includes('setTournamentReviewBackLabel'), 'uses tournament back label');
  assert.ok(!openTrn.includes('setAnalysisReviewBackLabel'), 'does not use analysis back label');
  assert.ok(!/startInteractiveReplay|startInteractiveReplay/.test(openTrn),
    'tournament open does not start GTO replay');
}
console.log('OK tournament-review-back');

// --- Resultado: stats CTA, sin replay, manos colapsadas ---
{
  const uiSrc = fs.readFileSync(path.join(ROOT, 'js/tournament/ui.js'), 'utf8');
  const cssSrc = fs.readFileSync(path.join(ROOT, 'css/tournaments.css'), 'utf8');
  assert.ok(uiSrc.includes('Estadísticas del torneo'), 'CTA Estadísticas del torneo');
  assert.ok(uiSrc.includes('trn-hands-fold'), 'hands collapsed details');
  assert.ok(uiSrc.includes('finalTableBannerHtml'), 'final table banner helper');
  assert.ok(uiSrc.includes('MESA FINAL'), 'final table banner copy');
  assert.ok(uiSrc.includes("schedulePopupClear('ft', 3000)"), 'FT banner clears at 3s');
  assert.ok(!uiSrc.includes('confettiPiecesHtml') && !uiSrc.includes('trn-confetti'),
    'confetti removed from tournament UI');
  assert.ok(cssSrc.includes('trn-ft-banner') && cssSrc.includes('trn-ft-banner-fade'),
    'css final table banner');
  assert.ok(!cssSrc.includes('trn-confetti-piece'), 'confetti css removed');
  assert.ok(uiSrc.includes('fromTournament: true'), 'opens session as fromTournament');
  const rr = uiSrc.slice(uiSrc.indexOf('function renderResult'), uiSrc.indexOf('function renderHistory'));
  assert.ok(!/Mejores manos|Peores manos/.test(rr), 'no best/worst on result');
  assert.ok(!/session-replay-hand|>Replay</.test(rr), 'no Replay on result');
  const hev = fs.readFileSync(path.join(ROOT, 'js/hand-end-view.js'), 'utf8');
  assert.ok(hev.includes('gradeLabel') || hev.includes('grade.letter'), 'session grade not raw Object');
  const appSrc = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
  assert.ok(appSrc.includes('fromTournament'), 'app handles fromTournament');
  assert.ok(appSrc.includes('session-hands-fold') || appSrc.includes('sessionHandsFold'), 'session hands fold');
}
console.log('OK tournament-result-polish');




// --- Progress chip + hero in top10 ---
{
  const state = g.PTTournamentState.create(g.PTTournamentConfig.fromPreset('mtt18'), { seed: 9 });
  const chips = g.PTTournamentHud.compactChips(state);
  const progress = chips.find(function (c) {
    return String(c.cls || c.className || '').indexOf('progress') >= 0;
  });
  assert.ok(progress, 'progress chip present');
  assert.ok(/Nv\.|º|\//.test(progress.text), 'progress chip text: ' + progress.text);
  const rows = g.PTTournamentHud.infoRows(state);
  const top = rows.find(function (r) { return /Top 10/i.test(r.label); });
  assert.ok(top && top.value && top.value.html, 'top10 html');
  assert.ok(/is-hero/.test(top.value.content), 'hero highlighted in top10');
  assert.ok(/\(Hero\)/.test(top.value.content), 'hero tag in top10');
  const ranks = top.value.content.match(/trn-stack-rank">\d+\./g) || [];
  assert.ok(ranks.length >= 1, 'explicit ranks in markup');
  console.log('OK progress-chip-and-hero-top10');
}

// --- Save/resume keeps handIndex ---
{
  const state = g.PTTournamentState.create(g.PTTournamentConfig.fromPreset('sng6'), { seed: 11 });
  state.handIndex = 27;
  state.sessionHands = [];
  for (let i = 0; i < 5; i++) {
    state.sessionHands.push({ handIndex: i + 1, analysis: { handScore: 7, big: 'x'.repeat(5000) } });
  }
  const saved = g.PTTournamentStore.saveActive(state);
  assert.ok(saved.ok, 'saveActive ok');
  const loaded = g.PTTournamentStore.loadActive();
  assert.ok(loaded, 'loadActive');
  assert.strictEqual(loaded.handIndex, 27, 'handIndex preserved after save');
  const olderFurther = Object.assign({}, loaded, { handIndex: 40, _savedAt: '2020-01-01T00:00:00.000Z' });
  const newerEarlier = Object.assign({}, loaded, { handIndex: 17, _savedAt: '2030-01-01T00:00:00.000Z' });
  assert.ok(g.PTTournamentStore.isPreferableActive(olderFurther, newerEarlier), 'prefer more hands over newer ts');
  console.log('OK save-resume-handIndex');
}

// --- Role koins + wallet lesson/trainer ---
{
  const Wallet = g.PTTournamentWallet;
  Wallet.setBalance(50, { type: 'test_reset' });
  assert.strictEqual(Wallet.getBalance(), 50, 'balance set');
  assert.ok(!Wallet.canAfford(51), 'cannot afford > balance');
  const lesson = Wallet.earnFromLesson('lesson_test_a');
  assert.ok(lesson.added === 1 || lesson.ok, 'lesson award');
  const lesson2 = Wallet.earnFromLesson('lesson_test_a');
  assert.ok(lesson2.already || lesson2.added === 0, 'lesson not double-awarded');
  let awarded = 0;
  for (let i = 0; i < 25; i++) {
    const r = Wallet.noteTrainerHand();
    if (r.added) awarded += r.added;
  }
  assert.strictEqual(awarded, 1, '1 koin per 25 trainer hands');
  assert.strictEqual(g.PTTournamentRoleGuess.KOINS_PER_CORRECT, 2, '2 koins per correct role');
  console.log('OK koins-earn-rules');
}

// --- Names do not imply roles ---
{
  const pool = g.PTTournamentNames.POOL || [];
  const banned = /\b(maniac|nit|lag|tag|fish|call\s*station|nitty|loose|passive|aggro)\b/i;
  const bad = pool.filter(function (n) { return banned.test(n); });
  assert.strictEqual(bad.length, 0, 'no role-implying names: ' + bad.join(','));
  console.log('OK names-neutral');
}

// --- Leaderboard medals + hero ---
{
  const Lb = g.PTTournamentLeaderboard;
  assert.ok(Lb && Lb.renderHtml, 'leaderboard module');
  g.PTTournamentWallet.setBalance(200, { type: 'test_lb' });
  const html = Lb.renderHtml();
  assert.ok(/trn-leaderboard/.test(html), 'leaderboard html');
  assert.ok(/is-hero/.test(html), 'hero row');
  assert.ok(/🥇|trn-lb-medal-gold/.test(html), 'gold medal');
  const legend = Lb.legendHtml();
  assert.ok(/Escuela|Entrenador|rol/i.test(legend), 'legend explains earns');
  
  const ranks = Lb.rankings(20);
  assert.ok(ranks.every(function (r) { return String(r.id).indexOf('c_seed_') !== 0; }), 'no fake seed ids');
  assert.ok(!/MesaNorte|RangeLab|ICMPulse|FeltWalker/.test(html), 'no invented peer names');

  console.log('OK leaderboard-and-legend');
}


// --- Mesa Hero estable entre manos (no reshuffle) ---
{
  const state = g.PTTournamentState.create({
    kind: 'mtt', entries: 18, seatsPerTable: 6, startingStack: 1500, buyInEur: 5, placesPaid: 3
  }, { seed: 21 });
  const Seat = g.PTTournamentSeating;
  const heroTable = state.tables.find(function (tb) { return tb.isHeroTable; });
  assert.ok(heroTable, 'hero table');
  const before = heroTable.seatIds.slice().sort();
  // Rebalance without eliminations must keep the same hero-table roster
  Seat.rebalance(state);
  Seat.rebalance(state);
  const after = state.tables.find(function (tb) { return tb.isHeroTable; }).seatIds.slice().sort();
  assert.deepStrictEqual(after, before, 'hero table roster stable across rebalance');

  // Bust someone at hero table → one seat opens → fill from another table (roster changes by exactly that)
  const heroId = g.PTTournamentState.hero(state).id;
  const victimId = before.find(function (id) { return id !== heroId; });
  Seat.bustPlayer(state, victimId);
  Seat.rebalance(state);
  const ht2 = state.tables.find(function (tb) { return tb.isHeroTable; });
  assert.ok(ht2.seatIds.indexOf(victimId) < 0, 'busted player left hero table');
  assert.ok(ht2.seatIds.indexOf(heroId) >= 0, 'hero stays');
  assert.ok(ht2.seatIds.length >= 2, 'hero table still playable after refill');
  // Remaining survivors from before (except victim) still seated with hero
  before.forEach(function (id) {
    if (id === victimId) return;
    assert.ok(ht2.seatIds.indexOf(id) >= 0, 'survivor stays on hero table: ' + id);
  });
  console.log('OK stable-hero-table-roster');
}

// --- All-in: reveal holes → pause frame → then street runout ---
{
  const Live = g.PTTournamentLiveHand;
  const state = g.PTTournamentState.create(g.PTTournamentConfig.fromPreset('sng6'), { seed: 44 });
  const tableId = state.tables.find(function (t) { return t.isHeroTable; }).id;
  const on = g.PTTournamentSeating.playersOnTable(state, tableId);
  const btn = g.PTTournamentSeating.assignButton(state, tableId);
  const ordered = g.PTTournamentSeating.seatOrderWithButton(on, btn);
  const blinds = g.PTTournamentBlinds.currentLevel(state.config.blindSchedule, 0);
  // Build a hand and force all-in showdown with empty board
  const hand = Live.start(ordered, blinds, g.PTTournamentState.hero(state).id);
  hand._frames = [];
  hand.board = [];
  hand.street = 'preflop';
  hand.seats.forEach(function (s) {
    s.folded = false;
    s.allIn = true;
    s.stack = 0;
    s.invested = 100;
    s.streetInvested = 100;
  });
  hand.pot = hand.seats.length * 100;
  // Invoke showdown path via runToHeroOrEnd / internal finish — use public simulate after forcing
  // Directly call through advance loop: stage playing + streetDone all-in
  const finished = Live.runToHeroOrEnd(hand);
  assert.strictEqual(finished.stage, 'complete', 'all-in completes');
  const kinds = (finished._frames || []).map(function (f) { return f.kind; });
  // Frames may have been consumed; re-run finish path on a fresh forced hand
  const hand2 = Live.start(ordered, blinds, g.PTTournamentState.hero(state).id);
  hand2.board = [];
  hand2.street = 'flop';
  hand2.boardDeck = hand2.boardDeck || ['Ah','Kd','7c','2s','9h'];
  // ensure boardDeck has 5
  while (hand2.boardDeck.length < 5) hand2.boardDeck.push('2c');
  hand2.seats.forEach(function (s) {
    s.folded = false; s.allIn = true; s.stack = 0;
    s.invested = 50; s.streetInvested = 50;
  });
  hand2.pot = 300;
  hand2._frames = [];
  hand2.holesRevealed = false;
  // Use runToHeroOrEnd which should hit finishShowdown when nobody can act
  Live.runToHeroOrEnd(hand2);
  const frames = hand2._frames || [];
  const kinds2 = frames.map(function (f) { return f.kind; });
  const revealIdx = kinds2.indexOf('reveal');
  const streetIdx = kinds2.indexOf('street');
  assert.ok(revealIdx >= 0, 'has reveal frame, kinds=' + kinds2.join(','));
  assert.ok(streetIdx > revealIdx, 'streets come after reveal');
  assert.ok(hand2.holesRevealed, 'holesRevealed flag set');
  assert.ok(frames[revealIdx].holesRevealed, 'reveal frame marks holes');
  assert.strictEqual(frames[revealIdx].board.length, 0, 'reveal before board runout');
  console.log('OK allin-reveal-before-runout');
}

// --- Evaluación GTO MTT: fase push/fold con stack corto ---
{
  const GEval = g.PTTournamentGtoEval;
  assert.ok(GEval && GEval.buildInput, 'PTTournamentGtoEval.buildInput');
  assert.strictEqual(GEval.resolveTournamentPhase(5.1, {}), 'push', '5bb → fase push');
  assert.strictEqual(GEval.resolveTournamentPhase(18, {}), 'short', '18bb → short');
  assert.strictEqual(GEval.resolveTournamentPhase(40, {}), 'mid', '40bb → mid');
  assert.ok(GEval.resolveTournamentPhase(80, {}) === 'early' || GEval.resolveTournamentPhase(80, {}) === 'mid',
    'deep stack early/mid');

  const hand = {
    street: 'preflop',
    bb: 100,
    sb: 50,
    pot: 150,
    currentBet: 100,
    openerId: null,
    board: [],
    heroOptions: [
      { id: 'fold', label: 'Fold' },
      { id: 'allin', label: 'All-in', amount: 510 }
    ],
    seats: [
      { id: 'h1', isHero: true, pos: 'UTG', stack: 510, streetInvested: 0, folded: false, cards: ['8s', '8c'] },
      { id: 'v1', isHero: false, pos: 'BB', stack: 2000, streetInvested: 100, folded: false }
    ]
  };
  const hero = hand.seats[0];
  assert.ok(GEval.isFirstInOpen(hand, hero), 'UTG first-in open');
  const input = GEval.buildInput(hand, hero, { id: 'allin', amount: 510 });
  assert.ok(input.toCallBB === 0, 'RFI toCallBB=0 (ciegas no cuentan), got ' + input.toCallBB);
  assert.ok(input.stackBB > 4.5 && input.stackBB < 6, 'stackBB ~5.1, got ' + input.stackBB);
  assert.strictEqual(input.mttPhase, 'push', 'mttPhase push');
  assert.strictEqual(input.resolvedPhase, 'push', 'resolvedPhase push');
  assert.ok(input.pushFold, 'pushFold true');
  assert.strictEqual(input.preflopMode, 'push', 'preflopMode push');
  assert.strictEqual(input.formatHub, 'mtt', 'formatHub mtt');
  assert.strictEqual(input.chosenAction, 'allin', 'chosenAction allin not raise');
  assert.ok(input.availableActions.indexOf('allin') >= 0, 'availableActions includes allin');

  /* Chart push/fold directo: 88 UTG a 5bb debe shovear fuerte. */
  const PF = g.GTOPushFold;
  assert.ok(PF && PF.isPushPhase(input), 'isPushPhase true para input short');
  const strat = PF.pushFoldStrategy(Object.assign({}, input, {
    handCode: '88', position: 'UTG', effStack: input.stackBB
  }));
  const shoveFreq = Math.max(Number(strat.allin) || 0, Number(strat.raise) || 0);
  assert.ok(shoveFreq >= 0.5, '88 UTG 5bb shove freq>=50%, got ' + shoveFreq);

  if (g.GTO && typeof g.GTO.evaluateSpot === 'function') {
    const decision = GEval.evaluateHeroAction(hand, hero, { id: 'allin', amount: 510 });
    assert.ok(decision, 'decision returned');
    assert.ok(decision.mttPhase === 'push', 'decision carries mttPhase');
    assert.ok(decision.class !== 'error' && decision.class !== 'blunder',
      '88 shove @5bb UTG no debe ser error, got ' + decision.class + ' ev=' + decision.evLoss);
    assert.ok(decision.frequency >= 0.2 || decision.class === 'optima' || decision.class === 'aceptable',
      'shove 88 short debe tener freq razonable o clase buena, freq=' + decision.frequency + ' class=' + decision.class);
  }
}

console.log('OK tournament-phase-eval');

// --- Spins 3-Max presets + phase hub ---
{
  const Cfg = g.PTTournamentConfig;
  const spins = Cfg.listPresets().filter(function (p) { return p.kind === 'spin'; });
  assert.strictEqual(spins.length, 3, '3 spin presets');
  spins.forEach(function (p) {
    assert.strictEqual(p.entries, 3, p.id + ' entries 3');
    assert.strictEqual(p.seatsPerTable, 3, p.id + ' seats 3');
    assert.ok(p.placesPaid >= 1 && p.placesPaid < p.entries, p.id + ' placesPaid');
  });
  const GEval = g.PTTournamentGtoEval;
  assert.strictEqual(GEval.resolveFormatHub({ kind: 'spin' }), 'spin', 'hub spin');
  assert.strictEqual(GEval.resolveFormatHub({ formatHub: 'spin' }), 'spin', 'hub from formatHub');
  assert.strictEqual(GEval.resolveTournamentPhase(18, { kind: 'spin' }), 'mid', 'spin 18bb → mid (trainer-like)');
  assert.strictEqual(GEval.resolveTournamentPhase(10, { kind: 'spin' }), 'push', 'spin 10bb → push');
  const spinHand = {
    street: 'preflop', bb: 20, sb: 10, pot: 30, currentBet: 20, openerId: null, board: [],
    kind: 'spin', formatHub: 'spin',
    heroOptions: [{ id: 'fold' }, { id: 'allin', amount: 200 }],
    seats: [
      { id: 'h1', isHero: true, pos: 'BTN', stack: 200, streetInvested: 0, folded: false, cards: ['As', 'Kd'] },
      { id: 'v1', isHero: false, pos: 'BB', stack: 300, streetInvested: 20, folded: false }
    ]
  };
  const spinInput = GEval.buildInput(spinHand, spinHand.seats[0], { id: 'allin', amount: 200 });
  assert.strictEqual(spinInput.formatHub, 'spin', 'spin buildInput formatHub');
  assert.ok(spinInput.mttPhase === 'push' || spinInput.resolvedPhase === 'push', 'spin short → push phase');
}
console.log('OK spin-presets-and-phase');

// --- Push/fold freqs must sum ~100% after breakdown ---
{
  const PF = g.GTOPushFold;
  const GEval = g.PTTournamentGtoEval;
  const strat = PF.pushFoldStrategy({
    handCode: '88', position: 'UTG', effStack: 5, stackDepth: 5, toCallBB: 0,
    formatHub: 'mtt', availableActions: ['fold', 'raise', 'allin']
  });
  const raise = Number(strat.raise) || 0;
  const allin = Number(strat.allin) || 0;
  assert.ok(!(raise > 0.05 && allin > 0.05), 'no dual raise+allin mass, raise=' + raise + ' allin=' + allin);
  const broken = GEval.optionBreakdown
    ? GEval.optionBreakdown({ raise: 0.87, allin: 0.87, fold: 0.05 }, { pushFold: true })
    : null;
  if (broken) {
    const sumPct = broken.reduce(function (s, o) { return s + (Number(o.pct) || 0); }, 0);
    assert.ok(sumPct > 95 && sumPct < 105, 'optionBreakdown sum ~100, got ' + sumPct);
    const allinRow = broken.find(function (o) { return o.id === 'allin'; });
    const foldRow = broken.find(function (o) { return o.id === 'fold'; });
    assert.ok(allinRow && allinRow.pct > 80, 'merged shove dominates after renorm');
    assert.ok(foldRow && foldRow.pct < 20, 'fold remainder after renorm');
  }
}
console.log('OK pushfold-freq-100');


// --- Dealer / asientos físicos estables entre manos ---
{
  const Seat = g.PTTournamentSeating;
  const state = g.PTTournamentState.create(g.PTTournamentConfig.fromPreset('sng6'), { seed: 17 });
  const tableId = state.tables.find(function (t) { return t.isHeroTable; }).id;
  const on = Seat.playersOnTable(state, tableId).slice().sort(function (a, b) {
    return (a.seat || 0) - (b.seat || 0);
  });
  const physicalOrder = on.map(function (p) { return p.id; });

  const btn1 = Seat.assignButton(state, tableId);
  const ordered1 = Seat.seatOrderWithButton(on, btn1);
  assert.ok(ordered1.every(function (ts) { return ts.physicalSeat != null; }), 'physicalSeat en seatOrder');
  const ring1 = ordered1.slice().sort(function (a, b) {
    return a.physicalSeat - b.physicalSeat;
  }).map(function (ts) { return ts.player.id; });
  assert.deepStrictEqual(ring1, physicalOrder, 'anillo físico = seats ordenados');

  const btn2 = Seat.assignButton(state, tableId);
  assert.notStrictEqual(btn2, btn1, 'botón avanza de mano a mano');
  const ordered2 = Seat.seatOrderWithButton(on, btn2);
  const ring2 = ordered2.slice().sort(function (a, b) {
    return a.physicalSeat - b.physicalSeat;
  }).map(function (ts) { return ts.player.id; });
  assert.deepStrictEqual(ring2, physicalOrder, 'rivales no rotan de asiento físico');

  /* Bust del botón: el siguiente vivo en sentido horario recibe el botón. */
  Seat.bustPlayer(state, btn2);
  Seat.rebalance(state);
  const onAfter = Seat.playersOnTable(state, tableId).slice().sort(function (a, b) {
    return (a.seat || 0) - (b.seat || 0);
  });
  const btn3 = Seat.assignButton(state, tableId);
  assert.ok(onAfter.some(function (p) { return p.id === btn3; }), 'nuevo botón vivo');
  assert.notStrictEqual(btn3, btn2, 'botón no queda en eliminado');
  console.log('OK stable-physical-seats-and-button');
}

// --- Bust hero: siempre simula resto (sin Finalizar ya) ---
{
  const R = g.PTTournamentRunner;
  const cfg = g.PTTournamentConfig.normalize(Object.assign({}, g.PTTournamentConfig.fromPreset('sng6'), {
    onBust: 'ask',
    startingStack: 1500
  }));
  const state = R.create(cfg, { seed: 5 });
  const hero = g.PTTournamentState.hero(state);
  hero.stack = 0;
  g.PTTournamentSeating.bustPlayer(state, hero.id);
  R.onBustAsk(state);
  assert.strictEqual(state.status, 'finished', 'auto-sim → finished');
  assert.notStrictEqual(state.status, 'busted_pending', 'sin busted_pending');
  assert.strictEqual(g.PTTournamentState.playersLeft(state), 1, 'field liquidado a 1');
  assert.ok(state.result && state.result.reason === 'simulated_rest', 'reason simulated_rest');
  console.log('OK bust-auto-simulate-rest');
}

// --- Anillo visual estable durante fotogramas de animación ---
{
  const UI = g.PTTournamentsUI;
  assert.ok(UI && UI.ringByPhysicalSeat && UI.animHand && UI.setAnimFrame, 'PTTournamentsUI anim helpers');

  const liveSeats = [
    { id: 'hero', name: 'Hero', isHero: true, pos: 'UTG', seatIndex: 3, physicalSeat: 0, stack: 1500, invested: 0, streetInvested: 0, folded: false, allIn: false, cards: ['Qs', 'Tc'] },
    { id: 'v_hj', name: 'Isolan', isHero: false, pos: 'HJ', seatIndex: 4, physicalSeat: 1, stack: 2130, invested: 0, streetInvested: 0, folded: true, allIn: false },
    { id: 'v_co', name: 'ShoveShow', isHero: false, pos: 'CO', seatIndex: 5, physicalSeat: 2, stack: 1490, invested: 40, streetInvested: 0, folded: false, allIn: false },
    { id: 'v_btn', name: 'MidStack', isHero: false, pos: 'BTN', seatIndex: 0, physicalSeat: 3, stack: 860, invested: 0, streetInvested: 0, folded: true, allIn: false },
    { id: 'v_sb', name: 'Polarized', isHero: false, pos: 'SB', seatIndex: 1, physicalSeat: 4, stack: 1470, invested: 10, streetInvested: 0, folded: true, allIn: false },
    { id: 'v_bb', name: 'RiverGod', isHero: false, pos: 'BB', seatIndex: 2, physicalSeat: 5, stack: 1480, invested: 20, streetInvested: 0, folded: true, allIn: false }
  ];
  const liveHand = {
    seats: liveSeats,
    heroId: 'hero',
    sb: 10,
    bb: 20,
    ante: 0,
    board: ['8c', '4s', 'Ks'],
    street: 'flop',
    pot: 110,
    currentBet: 0,
    log: [],
    stage: 'playing',
    awaitingHero: true,
    holesRevealed: false
  };

  const ringLive = UI.ringByPhysicalSeat(liveHand.seats).map(function (s) { return s.id; });
  assert.deepStrictEqual(ringLive, ['hero', 'v_hj', 'v_co', 'v_btn', 'v_sb', 'v_bb'],
    'anillo live hero-first por physicalSeat, got ' + ringLive.join(','));

  const frame = {
    kind: 'act',
    actorId: 'v_co',
    street: 'flop',
    board: ['8c', '4s', 'Ks'],
    pot: 110,
    currentBet: 0,
    holesRevealed: false,
    seats: liveSeats.map(function (s) {
      return {
        id: s.id,
        stack: s.stack,
        invested: s.invested,
        streetInvested: s.streetInvested,
        folded: s.folded,
        allIn: s.allIn,
        physicalSeat: s.physicalSeat,
        lastAction: s.folded ? { action: 'fold', amount: 0, street: 'preflop' } : null
      };
    })
  };

  /* Repro del bug: merge sin physicalSeat → anillo distinto (ordena por id). */
  const brokenSeats = liveSeats.map(function (s) {
    const fs = frame.seats.find(function (x) { return x.id === s.id; });
    return {
      id: s.id, name: s.name, isHero: s.isHero, pos: s.pos, seatIndex: s.seatIndex,
      cards: s.cards, stack: fs.stack, invested: fs.invested, streetInvested: fs.streetInvested,
      folded: fs.folded, allIn: fs.allIn, lastAction: fs.lastAction
    };
  });
  const ringBroken = UI.ringByPhysicalSeat(brokenSeats).map(function (s) { return s.id; });
  assert.notDeepStrictEqual(ringBroken, ringLive,
    'sin physicalSeat el anillo cambia (repro), broken=' + ringBroken.join(','));

  UI.setAnimFrame(frame);
  const anim = UI.animHand(liveHand);
  UI.setAnimFrame(null);
  assert.ok(anim && anim._anim, 'animHand marca _anim');
  assert.ok(anim.seats.every(function (s) { return s.physicalSeat != null; }),
    'animHand conserva physicalSeat');
  const ringAnim = UI.ringByPhysicalSeat(anim.seats).map(function (s) { return s.id; });
  assert.deepStrictEqual(ringAnim, ringLive,
    'anillo animación = anillo live, anim=' + ringAnim.join(',') + ' live=' + ringLive.join(','));
  console.log('OK anim-ring-stable');
}

// --- All-in: no revelar holes hasta el fotograma reveal (tras el call) ---
{
  const UI = g.PTTournamentsUI;
  assert.ok(UI && UI.animHand && UI.setAnimFrame, 'animHand helpers');

  const seats = [
    { id: 'hero', name: 'Hero', isHero: true, pos: 'BB', physicalSeat: 0, seatIndex: 0, stack: 0, invested: 500, streetInvested: 500, folded: false, allIn: true, cards: ['As', 'Kh'] },
    { id: 'v1', name: 'ShoveShow', isHero: false, pos: 'UTG', physicalSeat: 1, seatIndex: 1, stack: 0, invested: 500, streetInvested: 500, folded: false, allIn: true, cards: ['Qd', 'Qc'] },
    { id: 'v2', name: 'Caller', isHero: false, pos: 'BTN', physicalSeat: 2, seatIndex: 2, stack: 200, invested: 500, streetInvested: 500, folded: false, allIn: false, cards: ['7c', '7d'] }
  ];
  /* Motor ya terminó: holesRevealed=true (como tras finishShowdown). */
  const liveHand = {
    seats: seats,
    heroId: 'hero',
    sb: 10,
    bb: 20,
    ante: 0,
    board: ['2c', '3d', '9h', 'Js', 'Kc'],
    street: 'river',
    pot: 1500,
    currentBet: 0,
    log: [],
    stage: 'complete',
    holesRevealed: true,
    awaitingHero: false
  };

  /* Fotograma del shove de v1: aún falta el call de v2 → no revelar. */
  const shoveFrame = {
    kind: 'act',
    actorId: 'v1',
    action: 'allin',
    street: 'preflop',
    board: [],
    pot: 520,
    currentBet: 500,
    holesRevealed: false,
    seats: seats.map(function (s) {
      return {
        id: s.id, stack: s.id === 'v1' ? 0 : (s.id === 'v2' ? 700 : 0),
        invested: s.id === 'v1' ? 500 : (s.id === 'hero' ? 20 : 0),
        streetInvested: s.id === 'v1' ? 500 : (s.id === 'hero' ? 20 : 0),
        folded: false, allIn: s.id !== 'v2', physicalSeat: s.physicalSeat,
        lastAction: s.id === 'v1' ? { action: 'allin', amount: 500 } : null
      };
    })
  };

  UI.setAnimFrame(shoveFrame);
  const duringShove = UI.animHand(liveHand);
  UI.setAnimFrame(null);
  assert.strictEqual(duringShove.holesRevealed, false,
    'durante shove (antes del call) holesRevealed debe ser false, got ' + duringShove.holesRevealed);
  assert.deepStrictEqual(duringShove.board, [], 'board vacío durante shove preflop');

  const revealFrame = {
    kind: 'reveal',
    street: 'preflop',
    board: [],
    pot: 1500,
    currentBet: 500,
    holesRevealed: true,
    seats: seats.map(function (s) {
      return {
        id: s.id, stack: 0, invested: 500, streetInvested: 500,
        folded: false, allIn: true, physicalSeat: s.physicalSeat, lastAction: null
      };
    })
  };
  UI.setAnimFrame(revealFrame);
  const duringReveal = UI.animHand(liveHand);
  UI.setAnimFrame(null);
  assert.strictEqual(duringReveal.holesRevealed, true, 'en fotograma reveal sí se muestran holes');
  assert.deepStrictEqual(duringReveal.board, [], 'reveal sigue sin comunitarias');
  console.log('OK allin-holes-only-on-reveal-frame');
}

// --- session GTO align: no merge torneos, heroCode, options, preflop leadType ---
{
  const storageSrc = fs.readFileSync(path.join(ROOT, 'js/storage.js'), 'utf8');
  assert.ok(/source === ['"]tournamentAi['"]|tournamentAi/.test(storageSrc)
    && /mergeSessionIfDuplicate[\s\S]{0,400}tournamentAi/.test(storageSrc),
    'mergeSessionIfDuplicate skips tournamentAi');

  const importSrc = fs.readFileSync(path.join(ROOT, 'js/import.js'), 'utf8');
  assert.ok(importSrc.includes("['fold', 'raise', 'allin']")
    || importSrc.includes('["fold", "raise", "allin"]'),
    'buildEvalInput preflop fallback fold/raise/allin');
  assert.ok(!/street === ['"]preflop['"][\s\S]{0,200}bet_33/.test(
    importSrc.slice(importSrc.indexOf('function buildEvalInputFromDecision'),
      importSrc.indexOf('function buildEvalInputFromDecision') + 2500)
  ) || importSrc.includes('nunca check/bet_33'),
    'preflop eval input must not default to check/bet_33');

  const spotSrc = fs.readFileSync(path.join(ROOT, 'js/engine/solver/spotKey.js'), 'utf8');
  assert.ok(/if \(street === ['"]preflop['"]\) return ['"]none['"]/.test(spotSrc),
    'spotKey preflop leadType none');

  const dec = g.PTTournamentSessionBridge.normalizeDecision({
    street: 'preflop',
    action: 'raise',
    class: 'optima',
    evLoss: 0,
    gto: { raise: 0.8, fold: 0.2 },
    options: ['fold', 'raise', 'allin'],
    input: {
      potBB: 1.5,
      toCallBB: 0,
      availableActions: ['fold', 'raise', 'allin'],
      initiative: 'none',
      formatHub: 'mtt',
      pushFold: false,
      spotKind: 'RFI',
      stackBB: 40
    }
  }, 20);
  assert.ok(dec.options && dec.options.indexOf('bet_33') < 0, 'no bet_33 in tournament options');
  assert.ok(dec.options.indexOf('raise') >= 0, 'raise option persisted');
  assert.strictEqual(dec.initiative, 'none', 'initiative persisted');
  assert.strictEqual(dec.formatHub, 'mtt', 'formatHub persisted');

  const handRfi = g.PTTournamentSessionBridge.handFromTournament({
    handIndex: 9,
    bb: 20,
    sb: 10,
    board: [],
    seats: [
      { id: 'h', name: 'Hero', isHero: true, pos: 'HJ', cards: ['As', '3s'], stack: 800, startStack: 800, folded: false },
      { id: 'v', name: 'Villain', isHero: false, pos: 'BB', cards: ['7c', '2d'], stack: 800, startStack: 800, folded: false }
    ],
    log: [{ street: 'preflop', id: 'h', name: 'Hero', action: 'raise', amount: 60 }],
    decisions: [{
      street: 'preflop',
      action: 'raise',
      class: 'optima',
      evLoss: 0,
      label: 'Raise',
      options: ['fold', 'raise', 'allin'],
      gto: { raise: 0.55, fold: 0.45 },
      input: { availableActions: ['fold', 'raise', 'allin'], initiative: 'none', potBB: 1.5, toCallBB: 0 }
    }],
    result: { deltas: { h: 30, v: -30 }, winners: ['h'], showdown: false, pot: 60, heroNet: 30, holeCards: {}, board: [] }
  }, { tournamentId: 't_align', handIndex: 9, heroName: 'Hero' });
  assert.strictEqual(handRfi.heroCode, 'A3s', 'A3s heroCode');
  assert.ok(handRfi.decisions[0].options && handRfi.decisions[0].options.indexOf('check') < 0,
    'bridged decision has no check option preflop');

  load(g, 'js/engine/solver/spotKey.js');
  const key = g.GTOSpotKey.buildSpotKey({
    street: 'preflop',
    position: 'HJ',
    initiative: 'aggressor',
    toCallBB: 0,
    potBB: 2.13,
    stackDepth: 40,
    spotKind: 'RFI'
  });
  assert.strictEqual(key.leadType, 'none', 'preflop leadType none even if initiative aggressor');

  const sess = g.PTTournamentSessionBridge.buildSessionFromTournament({
    id: 't_a',
    config: { name: 'Sit & Go 6-max', kind: 'sng', entries: 6, buyInEur: 5 },
    result: { place: 3, prizeEur: 0, stats: { profit: -5 } },
    finishedAt: '2026-01-01T00:00:00.000Z',
    sessionHands: [handRfi],
    handLog: []
  }, {});
  assert.strictEqual(sess.source, 'tournamentAi');
  assert.strictEqual(sess.tournamentAi, true, 'tournamentAi flag for merge skip');
  assert.strictEqual(sess.fileName.indexOf('Sit & Go'), 0, 'fileName from preset');
  console.log('OK tournament-session-gto-align');
}

// --- fichas de mesa en torneo = misma escala de color que Entrenar ---
{
  const UI = g.PTTournamentsUI;
  assert.ok(UI.chipTier && UI.chipStackHTML && UI.renderSeatBetHtml, 'chip helpers exported');
  assert.strictEqual(UI.chipTier(0.5), 'w');
  assert.strictEqual(UI.chipTier(2), 'r');
  assert.strictEqual(UI.chipTier(5), 'g');
  assert.strictEqual(UI.chipTier(15), 'b');
  assert.strictEqual(UI.chipTier(30), 'k');
  assert.strictEqual(UI.chipTier(80), 'p');
  const stack = UI.chipStackHTML(5);
  assert.ok(stack.includes('chip-stack') && stack.includes('chip-g'), 'green stack for 5bb');
  const seatBet = UI.renderSeatBetHtml(100, 20, 'bet-below'); // 5 bb
  assert.ok(seatBet.includes('seat-bet') && seatBet.includes('chip-g') && seatBet.includes('5 bb'),
    'seat bet shows chips + amount');
  const uiSrc = fs.readFileSync(path.join(ROOT, 'js/tournament/ui.js'), 'utf8');
  assert.ok(uiSrc.includes('pot-chips') && uiSrc.includes('chipStackHTML'), 'pot uses chip stack');
  assert.ok(uiSrc.includes('renderSeatBetHtml') && uiSrc.includes('renderHeroStreetChipsHtml'),
    'seat + hero street chips');
  const appSrc = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
  assert.ok(/function chipTier\(bb\)[\s\S]*?if \(bb < 1\) return 'w'/.test(appSrc),
    'trainer chipTier untouched');
  console.log('OK tournament-table-chips');
}

console.log('*** test-tournament OK ***');
