#!/usr/bin/env node
/**
 * Regresión: un solo mazo de 52 (sin cartas duplicadas héroe/villanos/board),
 * orden de reparto (random / borderline / escenario) y jugabilidad básica.
 */
'use strict';

const assert = require('assert');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const sandbox = createSandbox();
loadTrainer(sandbox);
const w = sandbox.window;
const Engine = w.Engine;
const PC = w.PTPlayConfig;
const Cards = w.Cards;

assert.ok(Engine && PC && Cards, 'deps Engine/PTPlayConfig/Cards');
assert.ok(typeof Engine.hasDuplicateCards === 'function', 'hasDuplicateCards exportado');
assert.ok(typeof Engine.allDealtCards === 'function', 'allDealtCards exportado');

function cfg(extra) {
  return PC.normalize(Object.assign({
    formatHub: 'cash',
    gameType: 'cash6',
    stackDepth: 'bb100',
    scenario: 'random',
    handRange: 'random',
    villainLevel: 'pro',
    practiceStreet: 'preflop',
    heroPos: 'random'
  }, extra || {}));
}

function assertSingleDeck(hand, label) {
  assert.ok(hand && hand.table && hand.table.holeCards, label + ': holeCards');
  assert.ok(hand._predeal && hand._predeal.board && hand._predeal.board.length === 5,
    label + ': board predeal 5');
  assert.strictEqual(Engine.hasDuplicateCards(hand), false,
    label + ': sin duplicados (hoyos ∩ board)');
  const all = Engine.allDealtCards(hand);
  const uniq = new Set(all);
  assert.strictEqual(all.length, uniq.size, label + ': todas las cartas únicas');
  // Cada asiento con 2 cartas distintas
  Object.keys(hand.table.holeCards).forEach(function (pos) {
    const hc = hand.table.holeCards[pos];
    if (!hc || hc.length < 2) return;
    assert.notStrictEqual(hc[0], hc[1], label + ': ' + pos + ' pair distinta');
  });
  if (hand.hero && hand.hero.cards && hand.hero.cards.length === 2) {
    const board = hand._predeal.board;
    hand.hero.cards.forEach(function (c) {
      assert.ok(board.indexOf(c) < 0, label + ': hero card ' + c + ' no en board');
    });
  }
}

function countSeats(hand) {
  return Object.keys(hand.table.holeCards || {}).filter(function (p) {
    const hc = hand.table.holeCards[p];
    return hc && hc.length >= 2;
  }).length;
}

console.log('1) random + escenario random → mazo único (fuzz)');
{
  const play = cfg({ scenario: 'random', handRange: 'random' });
  for (let i = 0; i < 80; i++) {
    const hand = Engine.newHand({ seed: 1000 + i }, play);
    assertSingleDeck(hand, 'fullRandom#' + i);
    assert.ok(countSeats(hand) >= 6, 'fullRandom#' + i + ': ≥6 seats');
    assert.ok(hand.hero && hand.hero.cards && hand.hero.cards.length === 2,
      'fullRandom#' + i + ': hero tiene cartas');
    assert.ok(hand.current || hand.stage, 'fullRandom#' + i + ': mano jugable');
  }
}

console.log('2) borderline → héroe primero, mazo único');
{
  const play = cfg({ scenario: 'random', handRange: 'borderline', villainLevel: 'pro' });
  for (let i = 0; i < 40; i++) {
    const hand = Engine.newHand({ seed: 2000 + i }, play);
    assertSingleDeck(hand, 'borderline#' + i);
  }
}

console.log('3) jugables (playable) → mazo único');
{
  const play = cfg({ scenario: 'random', handRange: 'playable', villainLevel: 'pro' });
  for (let i = 0; i < 40; i++) {
    const hand = Engine.newHand({ seed: 3000 + i }, play);
    assertSingleDeck(hand, 'playable#' + i);
  }
}

console.log('4) escenario concreto (face3bet) + remuestreo pro → sin colisión con board');
{
  const play = cfg({
    scenario: 'face3bet',
    handRange: 'borderline',
    villainLevel: 'pro',
    practiceStreet: 'preflop'
  });
  for (let i = 0; i < 50; i++) {
    const hand = Engine.newHand({
      type: 'face3bet',
      key: 'CO_vs_BB',
      seed: 4000 + i
    }, play);
    assertSingleDeck(hand, 'face3bet#' + i);
    // Tras ensure* el héroe/villano no pueden compartir cartas con el board
    const boardSet = new Set(hand._predeal.board);
    Object.keys(hand.table.holeCards).forEach(function (pos) {
      const hc = hand.table.holeCards[pos];
      if (!hc) return;
      hc.forEach(function (c) {
        assert.ok(!boardSet.has(c), 'face3bet#' + i + ' ' + pos + ' vs board ' + c);
      });
    });
  }
}

console.log('5) escenario RFI + random hero → villanos de spot + mazo único');
{
  const play = cfg({ scenario: 'rfi', handRange: 'random', heroPos: 'BTN' });
  for (let i = 0; i < 40; i++) {
    const hand = Engine.newHand({ type: 'RFI', heroPos: 'BTN', seed: 5000 + i }, play);
    assertSingleDeck(hand, 'rfi-random#' + i);
  }
}

console.log('6) MTT 9-max + random → mazo único');
{
  const play = cfg({
    formatHub: 'mtt',
    gameType: 'mtt',
    stackDepth: 'bb100',
    scenario: 'random',
    handRange: 'random',
    mttPhase: 'early'
  });
  for (let i = 0; i < 30; i++) {
    const hand = Engine.newHand({ seed: 6000 + i }, play);
    assertSingleDeck(hand, 'mtt9#' + i);
  }
}

console.log('7) deadCardsExcludingSeat incluye board');
{
  const play = cfg({ scenario: 'face3bet', handRange: 'playable', villainLevel: 'pro' });
  const hand = Engine.newHand({ type: 'face3bet', key: 'BTN_vs_BB', seed: 42 }, play);
  const opener = hand.hero && hand.hero.pos;
  assert.ok(opener, 'hero pos');
  const dead = Engine.deadCardsExcludingSeat(hand, opener);
  hand._predeal.board.forEach(function (c) {
    assert.ok(dead.indexOf(c) >= 0, 'board ' + c + ' en dead al remuestrear');
  });
}

console.log('8) default handRange = random');
{
  assert.strictEqual(PC.DEFAULT.handRange, 'random');
  assert.strictEqual(PC.normalize({ gameType: 'cash6' }).handRange, 'random');
}

console.log('OK test-single-deck-deal');
