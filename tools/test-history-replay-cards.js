#!/usr/bin/env node
/**
 * Regresión: repetir mano desde histórico conserva hero/villanos/board
 * en todas las calles (no regenera cartas tras la 1ª acción).
 *
 * Caso crítico 9max: LJ se mapea a HJ en motor; sin bloquear ambos asientos
 * el remuestreo del motor pisaba hero.cards al enfrentar 3bet.
 */
'use strict';

const assert = require('assert');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const sandbox = createSandbox();
loadTrainer(sandbox);
const { Engine, PTPlayConfig } = sandbox.window;

assert.ok(Engine, 'Engine loaded');
assert.ok(Engine.attachReplaySnapshot, 'attachReplaySnapshot exported');
assert.ok(Engine.snapshotForceDealFromHand, 'snapshotForceDealFromHand exported');

function cfg(extra) {
  return PTPlayConfig.normalize(Object.assign({
    formatHub: 'cash',
    gameType: 'cash6',
    stackDepth: 'bb100',
    scenario: 'rfi',
    handRange: 'playable',
    villainLevel: 'fish',
    practiceStreet: 'random',
    allowMultiway: true
  }, extra || {}));
}

function cardsKey(cards) {
  return (cards || []).slice().join(',');
}

function actThroughPreflop(hand) {
  if (!hand || !hand.current) return;
  const opts0 = (hand.current.options || []).map(function (o) { return o.id; });
  const actId = opts0.indexOf('raise') >= 0 ? 'raise'
    : (opts0.indexOf('open') >= 0 ? 'open' : opts0[0]);
  if (actId) Engine.act(hand, actId);
  let guard = 0;
  while (hand.stage === 'preflop' && hand.current && guard++ < 12) {
    const o2 = (hand.current.options || []).map(function (o) { return o.id; });
    const a2 = o2.indexOf('call') >= 0 ? 'call'
      : (o2.indexOf('check') >= 0 ? 'check'
        : (o2.indexOf('raise') >= 0 ? 'raise'
          : (o2.indexOf('fold') >= 0 ? 'fold' : o2[0])));
    if (!a2) break;
    Engine.act(hand, a2);
  }
}

console.log('1) attachReplaySnapshot guarda forceDeal completo');
{
  const play = cfg();
  let found = false;
  for (let i = 0; i < 40 && !found; i++) {
    const hand = Engine.newHand({ type: 'RFI', heroPos: 'CO', seed: 77000 + i }, play);
    if (!hand || !hand.current || !hand.hero.cards || hand.hero.cards.length !== 2) continue;
    const hero0 = hand.hero.cards.slice();
    const board0 = hand._predeal.board.slice();
    assert.strictEqual(board0.length, 5, 'predeal board 5');

    const snap = Engine.attachReplaySnapshot(hand);
    const fd = snap && snap.forceDeal;
    assert.ok(fd, 'forceDeal en replaySnapshot');
    assert.deepStrictEqual(fd.heroCards, hero0, 'snapshot hero = deal original');
    assert.strictEqual(fd.board.length, 5, 'snapshot board 5');
    assert.deepStrictEqual(fd.board, board0, 'snapshot board = predeal');
    assert.ok(fd.holeCards && Object.keys(fd.holeCards).length >= 2, 'holeCards map');
    assert.deepStrictEqual(fd.holeCards[hand.hero.pos], hero0, 'holeCards[hero] = hero cards');
    found = true;
  }
  assert.ok(found, 'ejercido snapshot');
}

console.log('2) Replay con forceDeal: hero y board idénticos tras actuar');
{
  const play = cfg({ villainLevel: 'fish' });
  let exercised = 0;
  for (let i = 0; i < 60 && exercised < 3; i++) {
    const seed = 88000 + i;
    const hand = Engine.newHand({ type: 'RFI', heroPos: 'CO', seed: seed }, play);
    if (!hand || !hand.current || !hand.hero.cards || hand.hero.cards.length !== 2) continue;
    const hero0 = hand.hero.cards.slice();
    const board0 = hand._predeal.board.slice();
    const holes0 = {};
    Object.keys(hand.table.holeCards).forEach(function (p) {
      holes0[p] = hand.table.holeCards[p].slice();
    });

    const snap = Engine.attachReplaySnapshot(hand);
    const force = {
      type: 'RFI',
      heroPos: 'CO',
      seed: seed,
      forceDeal: snap.forceDeal,
      forceScript: snap.forceScript || null
    };
    const replayed = Engine.newHand(force, play);
    assert.deepStrictEqual(replayed.hero.cards, hero0, 'replay hero preflop');
    assert.deepStrictEqual(replayed._predeal.board, board0, 'replay predeal board');

    actThroughPreflop(replayed);

    assert.deepStrictEqual(replayed.hero.cards, hero0,
      'hero estable tras acción: ' + cardsKey(replayed.hero.cards) + ' vs ' + cardsKey(hero0));
    if (replayed.stage === 'flop' || (replayed.board && replayed.board.length >= 3)) {
      assert.deepStrictEqual(replayed.board.slice(0, 3), board0.slice(0, 3), 'flop board = snapshot');
      assert.deepStrictEqual(replayed.hero.cards, hero0, 'hero estable en flop');
    }
    Object.keys(holes0).forEach(function (p) {
      if (!replayed._forcedHole || !replayed._forcedHole[p]) return;
      assert.deepStrictEqual(replayed.table.holeCards[p], holes0[p], 'hole ' + p + ' estable');
    });
    exercised++;
  }
  assert.ok(exercised >= 2, 'ejercido replay estable: ' + exercised);
}

console.log('3) forceDeal vacío no tapa fallback de heroCards');
{
  const play = cfg();
  const hand = Engine.newHand({ type: 'RFI', heroPos: 'BTN', seed: 99001 }, play);
  assert.ok(hand.hero.cards && hand.hero.cards.length === 2, 'hero BTN cards');
  const hero = hand.hero.cards.slice();
  const board = hand._predeal.board.slice();
  const emptyDeal = { heroCards: [], villainCards: [], board: [], villainPos: null };
  function usable(fd) {
    if (!fd) return false;
    return !!(fd.heroCards && fd.heroCards.length === 2 && fd.heroCards[0] !== fd.heroCards[1]);
  }
  const fallback = usable(emptyDeal) ? emptyDeal : {
    heroCards: hero.slice(),
    villainCards: null,
    board: board.slice(),
    villainPos: null
  };
  assert.ok(usable(fallback), 'fallback usable');
  const replayed = Engine.newHand({
    type: 'RFI', heroPos: 'BTN', seed: 99001, forceDeal: fallback
  }, play);
  assert.deepStrictEqual(replayed.hero.cards, hero, 'fallback bloquea hero');
  assert.deepStrictEqual(replayed._predeal.board, board, 'fallback bloquea board');
}

console.log('4) 9max LJ→HJ: legacy heroCards-only y snapshot completo no cambian cartas');
{
  const play = cfg({
    formatHub: 'mtt',
    gameType: 'mtt',
    villainLevel: 'pro'
  });
  assert.ok(PTPlayConfig.is9Max(play), 'mtt es 9max');

  let found = null;
  for (let i = 0; i < 220 && !found; i++) {
    const hand = Engine.newHand({ type: 'RFI', heroPos: 'LJ', seed: 55000 + i }, play);
    if (!hand || !hand.hero.cards || hand.hero.cards.length !== 2) continue;
    if (!hand.displayHeroPos || hand.displayHeroPos === hand.hero.pos) continue;
    found = hand;
  }
  assert.ok(found, 'mano LJ con mapa display≠engine');
  assert.strictEqual(found.displayHeroPos, 'LJ');
  assert.notStrictEqual(found.hero.pos, 'LJ');

  const hero0 = found.hero.cards.slice();
  const board0 = found._predeal.board.slice();

  // Histórico antiguo: solo heroCards + board (sin holeCards map).
  const legacy = Engine.newHand({
    type: 'RFI',
    heroPos: 'LJ',
    seed: found.seed,
    forceDeal: {
      heroCards: hero0.slice(),
      villainCards: null,
      board: board0.slice(),
      villainPos: null,
      holeCards: null
    }
  }, play);
  assert.deepStrictEqual(legacy.hero.cards, hero0, 'legacy preflop hero');
  actThroughPreflop(legacy);
  assert.deepStrictEqual(legacy.hero.cards, hero0,
    'legacy hero estable tras acción (no remap HJ): ' + cardsKey(legacy.hero.cards));
  if (legacy.board && legacy.board.length >= 3) {
    assert.deepStrictEqual(legacy.board.slice(0, 3), board0.slice(0, 3), 'legacy flop board');
  }

  const snap = Engine.attachReplaySnapshot(found);
  const full = Engine.newHand({
    type: 'RFI',
    heroPos: 'LJ',
    seed: found.seed,
    forceDeal: snap.forceDeal
  }, play);
  assert.deepStrictEqual(full.hero.cards, hero0, 'snapshot preflop hero');
  actThroughPreflop(full);
  assert.deepStrictEqual(full.hero.cards, hero0, 'snapshot hero estable');
  if (full.board && full.board.length >= 3) {
    assert.deepStrictEqual(full.board.slice(0, 3), board0.slice(0, 3), 'snapshot flop board');
  }
}

console.log('5) Replay sin board / board corrupto: sin cartas duplicadas (Qc héroe≠turn)');
{
  const play = cfg({
    formatHub: 'mtt',
    gameType: 'mtt',
    scenario: 'face3bet',
    handRange: 'random',
    villainLevel: 'pro',
    mttPhase: 'early',
    heroPos: 'CO'
  });

  // Histórico corrupto: Qc en héroe y en turn (caso reportado).
  const corrupt = Engine.newHand({
    type: 'face3bet',
    key: 'CO_vs_SB',
    seed: 42,
    forceDeal: {
      heroCards: ['Qc', 'Tc'],
      villainCards: ['As', 'Ad'],
      board: ['3d', '2s', '5c', 'Qc', 'Kh'],
      villainPos: 'SB',
      holeCards: { CO: ['Qc', 'Tc'], SB: ['As', 'Ad'] }
    }
  }, play);
  assert.strictEqual(Engine.hasDuplicateCards(corrupt), false,
    'board corrupto saneado: ' + cardsKey(corrupt._predeal.board));
  assert.strictEqual(cardsKey(corrupt.hero.cards), 'Qc,Tc', 'héroe Qc Tc intacto');
  assert.strictEqual(cardsKey(corrupt._predeal.board.slice(0, 3)), '3d,2s,5c',
    'flop preferido se conserva');
  assert.ok(corrupt._predeal.board.indexOf('Qc') < 0, 'Qc no en board');
  assert.ok(corrupt._predeal.board.indexOf('Tc') < 0, 'Tc no en board');

  // forceDeal solo heroCards (sin board): el board random no puede chocar.
  let emptyBoardHits = 0;
  for (let i = 0; i < 80; i++) {
    const h = Engine.newHand({
      type: 'face3bet',
      key: 'CO_vs_SB',
      seed: 3000 + i,
      forceDeal: {
        heroCards: ['Qc', 'Tc'],
        villainCards: null,
        board: [],
        villainPos: 'SB'
      }
    }, play);
    if (Engine.hasDuplicateCards(h)) emptyBoardHits++;
    assert.strictEqual(cardsKey(h.hero.cards), 'Qc,Tc', 'hero estable sin board');
  }
  assert.strictEqual(emptyBoardHits, 0, 'sin board: 0 duplicados en 80 seeds');

  // holeMap sin board: mismo invariante.
  let mapHits = 0;
  for (let i = 0; i < 80; i++) {
    const h = Engine.newHand({
      type: 'face3bet',
      key: 'CO_vs_SB',
      seed: 4000 + i,
      forceDeal: {
        heroCards: ['Qc', 'Tc'],
        board: [],
        holeCards: { CO: ['Qc', 'Tc'], SB: ['Ah', 'Kd'], BB: ['2h', '2d'] },
        villainPos: 'SB'
      }
    }, play);
    if (Engine.hasDuplicateCards(h)) mapHits++;
  }
  assert.strictEqual(mapHits, 0, 'holeMap sin board: 0 duplicados');
}

console.log('\n*** test-history-replay-cards OK ***');
