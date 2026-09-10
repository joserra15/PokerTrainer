#!/usr/bin/env node
/**
 * Motor pro unificado: DecisionContext, ICM en mix, LinePlan, drivers, torneo sample.
 * Ejecutar: node tools/test-pro-decision-engine.js
 */
'use strict';
const assert = require('assert');
const path = require('path');
const { createSandbox, loadTrainer, runFiles } = require('./load-engine-vm');

const sandbox = createSandbox();
loadTrainer(sandbox);
runFiles(sandbox, ['js/tournament/villain-decide.js']);

const DC = sandbox.window.GTODecisionContext;
const LP = sandbox.window.GTOVillainLinePolicy;
const RA = sandbox.window.GTORangeAdvantage;
const FA = sandbox.window.GTOVillainFormatAdjust;
const GTO = sandbox.window.GTO;
const TD = sandbox.window.PTTournamentVillainDecide;

assert.ok(DC, 'GTODecisionContext loaded');
assert.ok(LP && LP.createLinePlan, 'LinePlan API');
assert.ok(RA && RA.computeNutAdvantage, 'nutAdvantage');
assert.ok(TD && TD.decide, 'tournament decide');

// --- usesStrategySample ---
assert.strictEqual(DC.usesStrategySample('pro'), true);
assert.strictEqual(DC.usesStrategySample('tag'), true);
assert.strictEqual(DC.usesStrategySample('lag'), true);
assert.strictEqual(DC.usesStrategySample('fish'), false);
assert.strictEqual(DC.usesStrategySample('nit'), false);
assert.ok(DC.usesStrategySample({ id: 'pro', preflopStrict: 0.99 }));

// --- Nut advantage distinct from range advantage ---
const aceHigh = {
  board: ['As', '8d', '3c'],
  initiative: 'aggressor',
  inPosition: true,
  street: 'flop'
};
const lowConn = {
  board: ['8s', '7s', '6h'],
  initiative: 'aggressor',
  inPosition: true,
  street: 'flop'
};
const raAce = RA.computeRangeAdvantage(aceHigh);
const nutAce = RA.computeNutAdvantage(aceHigh);
const nutLow = RA.computeNutAdvantage(lowConn);
assert.ok(raAce > 0.1, 'range adv on A-high aggressor');
assert.ok(nutAce > nutLow, 'nut adv higher on A-high than low connected for aggressor');

// --- LinePlan create / update ---
const plan = LP.createLinePlan({
  board: ['Kh', 'Td', '7c'],
  initiative: 'caller',
  inPosition: false,
  street: 'flop',
  band: 'value',
  spr: 8
});
assert.ok(plan.mode === 'polar' || plan.mode === 'merge', 'plan mode');
const plan2 = LP.updateLinePlan(plan, { street: 'flop', intent: 'checkRaise', action: 'check', mode: 'polar' });
assert.ok(plan2.intents.indexOf('checkRaise') >= 0, 'XR intent stored');
assert.strictEqual(plan2.mode, 'polar');
assert.strictEqual(LP.riverRaisePlan({ band: 'nuts', spr: 3, strength: 0.95 }), 'raise-call');
assert.strictEqual(LP.riverRaisePlan({ band: 'air', spr: 8, strength: 0.15 }), 'raise-fold');

// --- XR turn setup exists ---
let xrTurn = 0;
for (let i = 0; i < 600; i++) {
  const line = LP.decideLead({
    street: 'turn',
    inPosition: false,
    initiative: 'caller',
    strength: 0.82,
    band: 'value',
    madeCategory: 3,
    board: ['Kh', 'Td', '7c', '2s'],
    formatHub: 'cash',
    stackBB: 100,
    spr: 6,
    polarization: 0.7
  }, i / 600);
  if (line.intent === 'checkRaise') xrTurn++;
}
assert.ok(xrTurn >= 5, 'some XR turn setups, got ' + xrTurn);

// --- ICM applyToFreqs raises fold on bubble ---
const base = { fold: 0.3, call: 0.5, raise: 0.2 };
const early = DC.applyIcmToFreqs(base, {
  formatHub: 'mtt',
  effectivePhase: 'early',
  stackBB: 40,
  band: 'merge',
  strength: 0.5
}, 'facing');
const bubble = DC.applyIcmToFreqs(Object.assign({}, base), {
  formatHub: 'mtt',
  effectivePhase: 'bubble',
  mttStructureSituation: 'bubble',
  stackBB: 22,
  band: 'merge',
  strength: 0.5,
  icmStacksBB: [22, 45, 30],
  icmPayouts: [0.5, 0.3, 0.2]
}, 'facing');
assert.ok(bubble.fold > early.fold, 'bubble fold > early fold');
assert.ok(DC.bubbleFactorFromCtx({
  formatHub: 'mtt',
  effectivePhase: 'bubble',
  mttStructureSituation: 'bubble',
  stackBB: 20
}) > 1.2, 'bubble factor > 1.2');

// --- Format PKO bountyCall ---
const pko = FA.multipliers({
  formatHub: 'mtt',
  stackBB: 18,
  effectivePhase: 'short',
  tournamentType: 'pko'
});
assert.ok(pko.bountyCall > 1, 'pko bountyCall');
assert.ok(pko.jamBias > 1, 'pko jam bias');

// --- computePostflopMix + drivers ---
const mix = DC.computePostflopMix({
  toCallBB: 0,
  potBB: 6,
  heroEquity: 0.55,
  heroCards: ['Kh', 'Qd'],
  ctx: {
    board: ['As', '8d', '3c'],
    street: 'flop',
    initiative: 'aggressor',
    inPosition: true,
    stackBB: 100,
    formatHub: 'cash',
    spr: 16,
    strength: 0.55,
    band: 'merge'
  }
});
assert.ok(mix && mix.kind === 'lead', 'lead mix');
assert.ok(mix.freqs.check != null || mix.freqs.bet_33 != null, 'lead freqs');
assert.ok(mix.drivers && mix.drivers.length >= 1, 'drivers present');
assert.ok(mix.conceptTags.indexOf('rangeAdv') >= 0 || mix.drivers.some(function (d) {
  return d.id === 'rangeAdvantage';
}), 'rangeAdv driver/tag');

// --- evaluateSpot exposes drivers ---
const spot = GTO.evaluateSpot({
  spotKind: 'postflop',
  street: 'flop',
  heroCards: ['Kh', 'Qd'],
  board: ['As', '8d', '3c'],
  potBB: 6,
  toCallBB: 0,
  initiative: 'aggressor',
  inPosition: true,
  availableActions: ['check', 'bet_33', 'bet_66', 'bet_100'],
  formatHub: 'cash',
  spr: 16,
  effStack: 100
});
assert.ok(spot.drivers && spot.drivers.length >= 1, 'evaluateSpot drivers');
assert.ok(spot.topDrivers && spot.topDrivers.length >= 1, 'topDrivers');
assert.ok(Array.isArray(spot.conceptTags), 'conceptTags');

// Bubble vs early: fold freq higher for thin facing in MTT
const faceEarly = GTO.evaluateSpot({
  street: 'flop',
  heroCards: ['Jh', '9d'],
  board: ['As', '8d', '3c'],
  potBB: 10,
  toCallBB: 3.3,
  potBeforeBB: 6.7,
  initiative: 'caller',
  inPosition: false,
  availableActions: ['fold', 'call', 'raise'],
  formatHub: 'mtt',
  mttPhase: 'early',
  resolvedPhase: 'early',
  heroStackBB: 40,
  effStack: 40
});
const faceBubble = GTO.evaluateSpot({
  street: 'flop',
  heroCards: ['Jh', '9d'],
  board: ['As', '8d', '3c'],
  potBB: 10,
  toCallBB: 3.3,
  potBeforeBB: 6.7,
  initiative: 'caller',
  inPosition: false,
  availableActions: ['fold', 'call', 'raise'],
  formatHub: 'mtt',
  mttPhase: 'bubble',
  resolvedPhase: 'bubble',
  mttStructureSituation: 'bubble',
  heroStackBB: 22,
  effStack: 22,
  icmStacksBB: [22, 40, 28],
  icmPayouts: [0.5, 0.3, 0.2],
  playersLeft: 13,
  placesPaid: 12
});
assert.ok(
  (faceBubble.strategy.fold || 0) >= (faceEarly.strategy.fold || 0) - 0.02,
  'bubble fold >= early fold (approx)'
);
assert.ok(faceBubble.bubbleFactor > 1 || (faceBubble.conceptTags || []).indexOf('icmBubble') >= 0,
  'bubble annotated');

// --- Tournament pro never folds absolute nuts (river) ---
const hand = {
  street: 'river',
  bb: 1,
  pot: 20,
  currentBet: 10,
  minRaise: 10,
  board: ['As', 'Kh', 'Qd', 'Jc', '2c'],
  openerId: 'hero',
  formatHub: 'mtt',
  mttPhase: 'mid',
  seats: [],
  config: { formatHub: 'mtt', mttPhase: 'mid', stackBB: 40 }
};
const seat = {
  id: 'v1',
  roleId: 'pro',
  pos: 'BB',
  cards: ['Td', '9d'], // broadway straight nuts-ish on AKQJ2
  stack: 40,
  streetInvested: 0,
  invested: 0
};
// Actually T9 on AKQJ2 is the nuts straight
const actNuts = TD.decide(hand, seat);
assert.notStrictEqual(actNuts.id, 'fold', 'pro does not fold nut straight vs bet');

// Fish still works (heuristic path)
const seatFish = Object.assign({}, seat, { roleId: 'fish', cards: ['7c', '2d'], _lineIntent: null });
const actFish = TD.decide(Object.assign({}, hand, {
  board: ['As', 'Kd', '2c', '8h', '3s'],
  currentBet: 12,
  pot: 20
}), seatFish);
assert.ok(actFish && actFish.id, 'fish returns action');

// Threshold defense: oversized bet reduces call for merge
const Facing = sandbox.window.GTOFacingBet;
const small = Facing.calculateActionFrequencies({
  currentPot: 10,
  betSize: 3,
  heroEquity: 0.42,
  street: 'flop',
  inPosition: false,
  madeHandInfo: { tier: 'medium', ev: { category: 1 } },
  board: ['As', '8d', '3c'],
  heroCards: ['Jh', '9d']
});
const over = Facing.calculateActionFrequencies({
  currentPot: 10,
  betSize: 12,
  heroEquity: 0.42,
  street: 'flop',
  inPosition: false,
  madeHandInfo: { tier: 'medium', ev: { category: 1 } },
  board: ['As', '8d', '3c'],
  heroCards: ['Jh', '9d']
});
assert.ok((over.fold || 0) >= (small.fold || 0) - 0.05, 'oversize → more fold');

console.log('test-pro-decision-engine: OK');
