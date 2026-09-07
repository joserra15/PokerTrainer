/*
 * Regresión: river overbet / all-in con escalera (~95%+ equity).
 *
 * Caso reportado (entrenador):
 * - Hero KsJs en 7d9cQhTc4s → escalera; equity >95 %.
 * - Bote ~62bb, all-in ~66bb (botón overbet etiquetado All-in).
 * Bugs:
 * 1) EV acción = 0bb porque «overbet» no era agresión en evMath → ΔEV ~95bb «Error».
 * 2) advancePostflop ignoraba «overbet» → finish con heroNet 0 («Mano terminada»).
 *
 * Ejecutar: node tools/test-river-overbet-nuts.js
 */
'use strict';
const assert = require('assert');
const L = require('./load-engine-vm.js');

const sandbox = L.createSandbox();
L.loadTrainer(sandbox);

const GTO = sandbox.window.GTO;
const EvMath = sandbox.window.GTOEvMath;
const Engine = sandbox.window.Engine;
const C = sandbox.window.Cards;
const PTPlayConfig = sandbox.window.PTPlayConfig;

assert.ok(GTO && EvMath && Engine, 'engine cargado');

const HERO = ['Ks', 'Js'];
const BOARD = ['7d', '9c', 'Qh', 'Tc', '4s'];
const POT = 62.28;
const STACK = 66.61;

assert.ok(C.evaluate(HERO.concat(BOARD)).category >= 4, 'Hero debe tener escalera');

/* ------------------------------------------------------------------ *
 * 1) EV math: overbet no puede devolver 0 con equity alta
 * ------------------------------------------------------------------ */
const ctx = EvMath.buildActionContext({
  potBB: POT,
  potBeforeBB: POT,
  toCallBB: 0,
  heroEquity: 0.9625,
  chosenAction: 'overbet',
  betSizeBB: STACK,
  madeHandInfo: { tier: 'strong' }
}, { check: 0.16, bet_33: 0.1, bet_66: 0.4, bet_100: 0.34, overbet: 0 });

const overEV = EvMath.actionEVMath('overbet', ctx);
const potEV = EvMath.actionEVMath('bet_100', ctx);
const checkEV = EvMath.actionEVMath('check', ctx);
assert.ok(overEV > 20, 'EV overbet debe ser alto con ~96% equity; got ' + overEV);
assert.ok(Math.abs(overEV) > 0.01, 'EV overbet no puede ser ~0');
assert.ok(overEV + 5 >= potEV * 0.85, 'overbet cerca de pot en EV con nueces');
assert.ok(overEV > checkEV, 'overbet debe superar check con nueces');
console.log('1) EV overbet', overEV, '| pot', potEV, '| check', checkEV);

/* ------------------------------------------------------------------ *
 * 2) evaluateSpot: no marcar Error −95bb por overbet con escalera
 * ------------------------------------------------------------------ */
const spot = GTO.evaluateSpot({
  spotKind: 'postflop',
  street: 'river',
  board: BOARD,
  heroCards: HERO,
  handCode: 'KJs',
  potBB: POT,
  toCallBB: 0,
  potBeforeBB: POT,
  chosenAction: 'overbet',
  betSizeBB: STACK,
  availableActions: ['check', 'bet_33', 'bet_66', 'bet_100', 'overbet'],
  inPosition: false,
  initiative: 'caller',
  heroEquity: 0.9625,
  bbSizeEuro: 0.05
});
const ev = spot.evaluation;
assert.ok(ev.actionEV > 20, 'UI no puede mostrar EV acción +0; got ' + ev.actionEV);
assert.ok(ev.evLoss < 5, 'fuga no puede ser ~95bb; got ' + ev.evLoss);
assert.notStrictEqual(ev.class, 'error',
  'overbet con escalera ~96% no es «error»; class=' + ev.class);
assert.ok(ev.class === 'optima' || ev.class === 'aceptable' || ev.class === 'imprecisa',
  'como mucho imprecisa; class=' + ev.class);
console.log('2) class', ev.class, '| EV acción', ev.actionEV, '| ΔEV', ev.evLoss,
  '| óptimo', ev.bestEV);

/* ------------------------------------------------------------------ *
 * 3) advancePostflop: overbet no termina en heroNet 0
 * ------------------------------------------------------------------ */
const cfg = PTPlayConfig.normalize({
  gameType: 'cash6',
  stackDepth: 'bb100',
  scenario: 'rfi',
  heroPos: 'UTG',
  handRange: 'random',
  villainLevel: 'pro',
  practiceStreet: 'river'
});

const hand = Engine.newHand({ playConfig: cfg, seed: 20260905 });
assert.ok(hand && hand.current, 'mano river inicializada');

// Forzar el spot reportado: river lead, bote 62, stack ~66, overbet = all-in.
hand.stage = 'river';
hand.board = BOARD.slice();
hand._boardIdx = 5;
if (hand._predeal) hand._predeal.board = BOARD.slice();
hand.hero.cards = HERO.slice();
hand.hero.code = 'KJs';
hand.villain.cards = ['As', 'Ac'];
hand.heroInvested = 31.14;
hand.villainInvested = 31.14;
hand.potBB = POT;
hand.heroInPosition = false;
hand.heroIsAggressor = false;
const heroSeat = hand.displayHeroPos || hand.hero.pos || 'UTG';
const villSeat = hand.villain.pos || 'BTN';
hand.stacks = hand.stacks || {};
hand.stacks[heroSeat] = hand.heroInvested + STACK;
hand.stacks[villSeat] = hand.villainInvested + STACK;
if (hand.table) {
  hand.table.invested = hand.table.invested || {};
  hand.table.invested[heroSeat] = hand.heroInvested;
  hand.table.invested[villSeat] = hand.villainInvested;
  hand.table.streetBet = hand.table.streetBet || {};
  hand.table.streetBet[heroSeat] = 0;
  hand.table.streetBet[villSeat] = 0;
}
hand._betSizes = {
  bet_33: Math.round(POT * 0.33 * 100) / 100,
  bet_66: Math.round(POT * 0.66 * 100) / 100,
  bet_100: Math.min(STACK, POT),
  overbet: STACK
};
hand.current = {
  street: 'river',
  kind: 'postflop',
  potBB: POT,
  toCallBB: 0,
  options: [
    { id: 'check', label: 'Check' },
    { id: 'bet_33', label: '20bb', size: hand._betSizes.bet_33 },
    { id: 'bet_66', label: '41bb', size: hand._betSizes.bet_66 },
    { id: 'bet_100', label: '62bb', size: hand._betSizes.bet_100 },
    { id: 'overbet', label: 'All-in (' + STACK + 'bb)', size: STACK }
  ],
  gto: { check: 0.16, bet_33: 0.1, bet_66: 0.4, bet_100: 0.34, overbet: 0 },
  info: sandbox.window.GTOEquityMadeHand
    ? sandbox.window.GTOEquityMadeHand.classifyMadeHand(HERO, BOARD)
    : { tier: 'strong' },
  heroEquity: 0.9625,
  context: 'River test overbet'
};
hand.decisions = [];
hand.log = hand.log || [];

const beforePot = hand.potBB;
const out = Engine.act(hand, 'overbet');
assert.ok(out && out.decision, 'decisión registrada');
assert.ok(out.decision.actionEV > 20,
  'decisión no puede llevar EV acción 0; got ' + out.decision.actionEV);
assert.ok((out.decision.evLoss || 0) < 5,
  'decisión no puede llevar ΔEV ~95; got ' + out.decision.evLoss);
assert.notStrictEqual(out.decision.class, 'error',
  'clase decisión no error; got ' + out.decision.class);

// La mano no puede cerrarse con el fallback «Mano terminada» / heroNet 0
// sin haber metido la apuesta.
assert.ok(hand.potBB > beforePot + 1 || hand.result,
  'overbet debe aumentar el bote o resolver la mano');
if (hand.result) {
  assert.notStrictEqual(hand.result.reason, 'Mano terminada.',
    'no debe caer en el fallback de acción desconocida');
  // Si hubo showdown y hero gana (AA vs escalera), net > 0.
  if (hand.result.showdown && hand.result.heroHandName) {
    const cmp = C.compare(
      C.evaluate(HERO.concat(BOARD)),
      C.evaluate(['As', 'Ac'].concat(BOARD))
    );
    if (cmp > 0) {
      assert.ok(hand.result.heroNet > 1,
        'gane el bote: resultado real no puede ser +0; got ' + hand.result.heroNet);
    }
  }
} else if (hand.runoutPending) {
  while (hand.runoutPending) Engine.advanceRunout(hand);
  assert.ok(hand.result, 'showdown tras runout');
  assert.ok(hand.result.heroNet > 1,
    'gane el bote tras all-in: net > 0; got ' + (hand.result && hand.result.heroNet));
}

console.log('3) reason', hand.result && hand.result.reason,
  '| heroNet', hand.result && hand.result.heroNet,
  '| class', out.decision.class);

console.log('OK test-river-overbet-nuts');
