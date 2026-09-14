#!/usr/bin/env node
/**
 * Regresión: el entrenador debe ofrecer varias opciones postflop libres
 * (check + bets / all-in), nunca solo «Check (pasar)».
 *
 * Bug reportado (MTT 9-max): héroe UTG2 (display) mapeado a HJ (engine);
 * capBet usaba engine pos → si HJ mesa tenía ~0 remaining, todas las bets
 * caían bajo el umbral y solo quedaba Check.
 *
 * Ejecutar: node tools/test-trainer-postflop-options.js
 */
'use strict';

const assert = require('assert');
const L = require('./load-engine-vm.js');

const sandbox = L.createSandbox();
L.loadTrainer(sandbox);

const Engine = sandbox.window.Engine;
const PTPlayConfig = sandbox.window.PTPlayConfig;
const PTStacks = sandbox.window.PTStacks;

assert.ok(Engine && PTPlayConfig && PTStacks, 'engine cargado');

const BOARD = ['5h', 'Th', 'Ah', '7c', 'Ts'];
const HERO = ['9s', '9h'];

function mttCfg() {
  return PTPlayConfig.normalize({
    formatHub: 'mtt',
    gameType: 'mtt',
    tableSize: 9,
    stackDepth: 'bb10',
    scenario: 'random',
    handRange: 'playable',
    villainLevel: 'intermediate',
    practiceStreet: 'turn',
    leftPlayers: 13,
    paidPlaces: 12,
    actionMode: 'quick'
  });
}

/**
 * Fuerza el spot del bug: river libre OOP, display UTG2 / engine HJ,
 * HJ mesa casi sin stack, héroe con 8.25bb (como el pantallazo).
 */
function rebuildRiverFreeNode() {
  const hand = Engine.newHand({ seed: 9142026 }, mttCfg());
  assert.ok(hand && hand.current, 'mano inicializada');

  hand.displayHeroPos = 'UTG2';
  hand.hero.pos = 'HJ';
  hand.villain.pos = 'BTN';
  hand.hero.cards = HERO.slice();
  hand.villain.cards = ['Kd', 'Qc'];
  hand.heroInPosition = false;
  hand.heroIsAggressor = false;
  hand.multiway = false;
  hand.potBB = 29;
  hand.heroInvested = 10;
  hand.villainInvested = 10;
  hand.effStack = 18.25;

  hand.stacks = {
    UTG: 22, UTG1: 20, UTG2: 18.25, LJ: 25,
    HJ: 10.4, CO: 30, BTN: 34.75, SB: 18, BB: 16
  };
  hand.table = hand.table || {};
  hand.table.invested = {
    UTG: 0.5, UTG1: 0.5, UTG2: 10, LJ: 0.5,
    HJ: 10.2, CO: 0.5, BTN: 10, SB: 0.5, BB: 0.5
  };
  hand.table.folded = {
    UTG: true, UTG1: true, LJ: true, HJ: true, CO: true, SB: true, BB: true
  };
  hand.table.inHand = new Set(['UTG2', 'BTN']);
  hand.table.streetBet = {};
  hand.table.holeCards = hand.table.holeCards || {};
  hand.table.holeCards.UTG2 = HERO.slice();
  hand.table.holeCards.BTN = hand.villain.cards.slice();

  // Turn → check cierra calle → enterStreet river (rebuild opciones).
  hand.stage = 'turn';
  hand.board = BOARD.slice(0, 4);
  hand._boardIdx = 4;
  if (hand._predeal) hand._predeal.board = BOARD.slice();
  hand.current = {
    street: 'turn',
    kind: 'postflop',
    potBB: hand.potBB,
    toCallBB: 0,
    options: [{ id: 'check', label: 'Check (pasar)' }],
    heroClosesOnCheck: true,
    gto: { check: 1 },
    context: 'test'
  };
  hand.decisions = [];

  const remDisp = PTStacks.remaining(hand, 'UTG2');
  const remEng = PTStacks.remaining(hand, 'HJ');
  assert.ok(remDisp >= 8, 'héroe UTG2 con stack real; got ' + remDisp);
  assert.ok(remEng < 0.5, 'HJ mesa casi vacío (reproduce bug); got ' + remEng);

  Engine.act(hand, 'check');
  assert.strictEqual(hand.stage, 'river', 'avanza a river');
  assert.ok(hand.current && hand.current.options, 'nodo river con opciones');
  assert.ok(!(hand.current.toCallBB > 0.01), 'acción libre (sin facing)');
  return hand;
}

console.log('1) Caso reportado: UTG2/HJ mismatch no deja solo Check');
{
  const hand = rebuildRiverFreeNode();
  const ids = hand.current.options.map(function (o) { return o.id; });
  const labels = hand.current.options.map(function (o) { return o.label; });
  assert.ok(ids.indexOf('check') >= 0, 'incluye check');
  assert.ok(hand.current.options.length >= 2,
    'debe haber varias opciones, no solo check; got ' + labels.join(' | '));
  const hasBet = ids.some(function (id) {
    return id === 'bet' || id === 'overbet' || id === 'allin' || (id && id.indexOf('bet_') === 0);
  });
  assert.ok(hasBet, 'debe ofrecer bet/all-in; got ' + labels.join(' | '));
  const allInLabel = labels.some(function (l) { return /All-in/i.test(l); });
  assert.ok(allInLabel, 'con pot 29 y stack 8.25 debe etiquetar All-in; got ' + labels.join(' | '));
  console.log('   opciones:', labels.join(' | '));
}

console.log('2) Stack residual <0.5bb aún ofrece Check + All-in');
{
  const hand = Engine.newHand({ seed: 9142027 }, mttCfg());
  hand.displayHeroPos = 'UTG2';
  hand.hero.pos = 'HJ';
  hand.villain.pos = 'BTN';
  hand.hero.cards = HERO.slice();
  hand.villain.cards = ['Kd', 'Qc'];
  hand.heroInPosition = false;
  hand.heroIsAggressor = false;
  hand.multiway = false;
  hand.potBB = 20;
  hand.heroInvested = 18;
  hand.villainInvested = 2;
  hand.stacks = {
    UTG: 20, UTG1: 20, UTG2: 18.3, LJ: 20,
    HJ: 20, CO: 20, BTN: 30, SB: 20, BB: 20
  };
  hand.table = hand.table || {};
  hand.table.invested = {
    UTG: 0, UTG1: 0, UTG2: 18, LJ: 0,
    HJ: 0, CO: 0, BTN: 2, SB: 0, BB: 0
  };
  hand.table.folded = { UTG: true, UTG1: true, LJ: true, HJ: true, CO: true, SB: true, BB: true };
  hand.table.inHand = new Set(['UTG2', 'BTN']);
  hand.table.streetBet = {};
  hand.stage = 'turn';
  hand.board = BOARD.slice(0, 4);
  hand._boardIdx = 4;
  if (hand._predeal) hand._predeal.board = BOARD.slice();
  hand.current = {
    street: 'turn', kind: 'postflop', potBB: 20, toCallBB: 0,
    options: [{ id: 'check', label: 'Check' }],
    heroClosesOnCheck: true, gto: { check: 1 }, context: 'test'
  };
  hand.decisions = [];
  assert.ok(PTStacks.remaining(hand, 'UTG2') < 0.5
    && PTStacks.remaining(hand, 'UTG2') > 0.01, 'residual tip');

  Engine.act(hand, 'check');
  const labels = hand.current.options.map(function (o) { return o.label; });
  assert.ok(hand.current.options.length >= 2, 'Check + All-in con residual; got ' + labels.join(' | '));
  assert.ok(labels.some(function (l) { return /All-in/i.test(l); }), 'incluye All-in');
  console.log('   opciones:', labels.join(' | '));
}

console.log('3) Apuesta all-in postflop usa asiento de mesa (no deja stack fantasma)');
{
  const hand = rebuildRiverFreeNode();
  const before = PTStacks.remaining(hand, 'UTG2');
  const betOpt = hand.current.options.find(function (o) {
    return o.id === 'allin' || o.id === 'bet' || o.id === 'overbet'
      || (o.id && o.id.indexOf('bet_') === 0);
  });
  assert.ok(betOpt, 'hay opción de apuesta/all-in');
  Engine.act(hand, betOpt.id);
  const afterDisp = PTStacks.remaining(hand, 'UTG2');
  assert.ok(afterDisp <= 0.01 || hand.runoutPending || hand.result,
    'tras shove el stack de mesa UTG2 queda ~0 o hay runout; rem=' + afterDisp + ' before=' + before);
  console.log('   ok shove vía', betOpt.id);
}

console.log('4) Stack profundo: varios sizings + All-in (como torneos)');
{
  let found = null;
  for (let i = 0; i < 250 && !found; i++) {
    const play = PTPlayConfig.normalize({
      formatHub: 'cash', gameType: 'cash6', stackDepth: 'bb100',
      scenario: 'random', practiceStreet: 'flop', actionMode: 'quick'
    });
    const hand = Engine.newHand({ seed: i }, play);
    Engine.fastForwardToStreet(hand, 'flop');
    if (!hand.current || hand.result) continue;
    if ((hand.current.toCallBB || 0) > 0.01) continue;
    const rem = PTStacks.remaining(hand, hand.displayHeroPos || hand.hero.pos);
    if (rem < 40) continue;
    found = hand;
  }
  assert.ok(found, 'encontró flop libre deep');
  const ids = found.current.options.map(function (o) { return o.id; });
  assert.ok(ids.indexOf('check') >= 0, 'check');
  assert.ok(ids.indexOf('allin') >= 0, 'allin siempre');
  const bets = ids.filter(function (id) {
    return id === 'bet' || id === 'overbet' || (id && id.indexOf('bet_') === 0);
  });
  assert.ok(bets.length >= 2, 'varios sizings además de all-in; got ' + ids.join(','));
  assert.ok(found.current.options.length >= 4, 'varias opciones; got ' + found.current.options.length);
  console.log('   opciones:', found.current.options.map(function (o) { return o.label; }).join(' | '));
}

console.log('OK — trainer postflop options');
