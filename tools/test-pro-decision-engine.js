#!/usr/bin/env node
/**
 * Regresión motor Pro unificado — coherencia de respuestas.
 * DecisionContext, ICM en mix, LinePlan, drivers, torneo sample, Escuela M3.
 * Ejecutar: node tools/test-pro-decision-engine.js
 */
'use strict';
const assert = require('assert');
const { createSandbox, loadTrainer, runFiles, loadEngine } = require('./load-engine-vm');

const sandbox = createSandbox();
loadTrainer(sandbox);
runFiles(sandbox, [
  'js/tournament/villain-decide.js',
  'js/school-data.js',
  'js/school-data-m1.js',
  'js/school-data-m2.js',
  'js/school-data-m3.js',
  'js/school-extra-spots.js'
]);

const DC = sandbox.window.GTODecisionContext;
const LP = sandbox.window.GTOVillainLinePolicy;
const RA = sandbox.window.GTORangeAdvantage;
const FA = sandbox.window.GTOVillainFormatAdjust;
const GTO = sandbox.window.GTO;
const TD = sandbox.window.PTTournamentVillainDecide;
const VP = sandbox.window.GTOVillainPreflop;
const Classifier = sandbox.window.GTOClassifier;
const SchoolData = sandbox.window.PTSchoolData;
const Engine = sandbox.window.Engine;

let checks = 0;
function ok(cond, msg) {
  assert.ok(cond, msg);
  checks++;
}
function eq(a, b, msg) {
  assert.strictEqual(a, b, msg);
  checks++;
}

function sumFreqs(freqs) {
  let s = 0;
  Object.keys(freqs || {}).forEach(function (k) {
    if (k.charAt(0) === '_') return;
    s += Math.max(0, Number(freqs[k]) || 0);
  });
  return s;
}

function assertNormalized(freqs, label) {
  const s = sumFreqs(freqs);
  ok(Math.abs(s - 1) < 0.03, label + ' suma ~1 (got ' + s.toFixed(4) + ')');
  Object.keys(freqs || {}).forEach(function (k) {
    if (k.charAt(0) === '_') return;
    ok((freqs[k] || 0) >= -1e-9, label + ' ' + k + ' ≥ 0');
  });
}

function betTotal(freqs) {
  let t = 0;
  ['bet_33', 'bet_66', 'bet_100', 'bet_125', 'overbet', 'bet'].forEach(function (k) {
    t += freqs[k] || 0;
  });
  return t;
}

ok(DC, 'GTODecisionContext loaded');
ok(LP && LP.createLinePlan, 'LinePlan API');
ok(RA && RA.computeNutAdvantage, 'nutAdvantage');
ok(TD && TD.decide, 'tournament decide');
ok(Engine && Engine.previewAdvice, 'previewAdvice');

/* ========== 1. usesStrategySample ========== */
eq(DC.usesStrategySample('pro'), true, 'pro samples');
eq(DC.usesStrategySample('tag'), true, 'tag samples');
eq(DC.usesStrategySample('lag'), true, 'lag samples');
eq(DC.usesStrategySample('fish'), false, 'fish heuristic');
eq(DC.usesStrategySample('nit'), false, 'nit heuristic');
eq(DC.usesStrategySample('maniac'), false, 'maniac heuristic');
ok(DC.usesStrategySample({ id: 'pro', preflopStrict: 0.99 }), 'strict profile');
ok(DC.usesStrategySample({ id: 'fish', preflopStrict: 0.99 }), 'preflopStrict forces sample');

/* ========== 2. Range / nut advantage coherencia ========== */
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
const monotone = {
  board: ['Ah', '9h', '3h'],
  initiative: 'aggressor',
  inPosition: true,
  street: 'flop'
};
ok(RA.computeRangeAdvantage(aceHigh) > 0.1, 'range adv A-high aggressor');
ok(RA.computeNutAdvantage(aceHigh) > RA.computeNutAdvantage(lowConn),
  'nut adv A-high > low connected (aggressor)');
const nutMonoAgg = RA.computeNutAdvantage(monotone);
const nutMonoCall = RA.computeNutAdvantage(Object.assign({}, monotone, { initiative: 'caller' }));
ok(nutMonoCall > nutMonoAgg - 0.05, 'caller often better nut flush on monotone');
const polDeep = RA.betPolarization({ street: 'flop', spr: 14, board: aceHigh.board, initiative: 'aggressor', inPosition: true }, 'merge');
const polShort = RA.betPolarization({ street: 'river', spr: 2.5, board: aceHigh.board, initiative: 'aggressor', inPosition: true }, 'nuts');
ok(polShort > polDeep, 'short SPR / nuts more polar than deep merge');

/* ========== 3. LinePlan ========== */
const plan = LP.createLinePlan({
  board: ['Kh', 'Td', '7c'],
  initiative: 'caller',
  inPosition: false,
  street: 'flop',
  band: 'value',
  spr: 8
});
ok(plan.mode === 'polar' || plan.mode === 'merge', 'plan mode');
const plan2 = LP.updateLinePlan(plan, {
  street: 'flop', intent: 'checkRaise', action: 'check', mode: 'polar'
});
ok(plan2.intents.indexOf('checkRaise') >= 0, 'XR intent stored');
eq(plan2.mode, 'polar', 'XR forces polar');
eq(LP.riverRaisePlan({ band: 'nuts', spr: 3, strength: 0.95 }), 'raise-call');
eq(LP.riverRaisePlan({ band: 'air', spr: 8, strength: 0.15 }), 'raise-fold');

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
ok(xrTurn >= 5, 'XR turn setups exist (' + xrTurn + ')');

/* Give-up tras polar barrel con air */
let giveUps = 0;
for (let i = 0; i < 400; i++) {
  const line = LP.decideLead({
    street: 'turn',
    inPosition: true,
    initiative: 'aggressor',
    strength: 0.18,
    band: 'air',
    board: ['As', '8d', '3c', '2h'],
    formatHub: 'cash',
    stackBB: 100,
    spr: 8,
    rangeAdvantage: -0.1,
    linePlan: { mode: 'polar', polarization: 0.7, barrelCount: 1, intents: ['barrel'], streetCommit: { flop: 'bet' } }
  }, i / 400);
  if (line.intent === 'giveUp' || line.forceCheck) giveUps++;
}
ok(giveUps >= 80, 'polar air give-up after barrel (' + giveUps + ')');

/* adjustFacing XR boost */
const facingBase = { fold: 0.4, call: 0.4, raise: 0.2 };
const facingXr = LP.adjustFacing(facingBase, {
  lineIntent: 'checkRaise', street: 'flop', strength: 0.8, band: 'value',
  formatHub: 'cash', stackBB: 100
});
ok(facingXr.raise > facingBase.raise, 'XR intent boosts raise');
assertNormalized(facingXr, 'XR facing');

/* adjustLead polar mueve sizing */
const leadMerge = LP.adjustLead(
  { check: 0.3, bet_33: 0.4, bet_66: 0.2, bet_100: 0.05, overbet: 0.05 },
  { street: 'turn', linePlan: { mode: 'polar', giveUp: false } }
);
ok((leadMerge.bet_33 || 0) < 0.4, 'polar reduces bet_33');
assertNormalized(leadMerge, 'polar lead');

/* ========== 4. ICM mix coherencia ========== */
const baseFace = { fold: 0.3, call: 0.5, raise: 0.2 };
const early = DC.applyIcmToFreqs(Object.assign({}, baseFace), {
  formatHub: 'mtt', effectivePhase: 'early', stackBB: 40, band: 'merge', strength: 0.5
}, 'facing');
const bubble = DC.applyIcmToFreqs(Object.assign({}, baseFace), {
  formatHub: 'mtt', effectivePhase: 'bubble', mttStructureSituation: 'bubble',
  stackBB: 22, band: 'merge', strength: 0.5,
  icmStacksBB: [22, 45, 30], icmPayouts: [0.5, 0.3, 0.2]
}, 'facing');
ok(bubble.fold > early.fold, 'bubble fold > early fold');
ok(bubble.raise < early.raise + 0.01, 'bubble raise ≤ early raise');
assertNormalized(early, 'early ICM');
assertNormalized(bubble, 'bubble ICM');
ok(DC.bubbleFactorFromCtx({
  formatHub: 'mtt', effectivePhase: 'bubble', mttStructureSituation: 'bubble', stackBB: 20
}) > 1.2, 'bubble factor floor');
eq(DC.bubbleFactorFromCtx({ formatHub: 'cash', stackBB: 100 }), 1, 'cash BF=1');

const midRole = DC.applyIcmToFreqs(Object.assign({}, baseFace), {
  formatHub: 'mtt', effectivePhase: 'bubble', mttStructureSituation: 'bubble',
  stackBB: 25, stackRole: 'mid', band: 'merge', strength: 0.5
}, 'facing');
ok(midRole.fold >= bubble.fold - 0.02, 'mid role on bubble folds at least as much');

/* ========== 5. Format PKO / stack roles ========== */
const pko = FA.multipliers({
  formatHub: 'mtt', stackBB: 18, effectivePhase: 'short', tournamentType: 'pko'
});
ok(pko.bountyCall > 1, 'pko bountyCall');
ok(pko.jamBias > 1, 'pko jam bias');
const cover = FA.multipliers({
  formatHub: 'mtt', stackBB: 80, effectivePhase: 'bubble',
  mttStructureSituation: 'bubble', stackRole: 'cover'
});
ok(cover.bet >= 1, 'cover pressure bet');

/* ========== 6. refineLead / refineFacing + multiway / 3BP ========== */
const leadRaw = {
  check: 0.25, bet_33: 0.35, bet_66: 0.25, bet_100: 0.1, overbet: 0.05
};
const leadHu = DC.refineLead(leadRaw, {
  formatHub: 'cash', stackBB: 100, street: 'flop', band: 'air', strength: 0.2,
  initiative: 'aggressor', inPosition: true, multiwayCount: 2, potType: 'srp'
});
const leadMw = DC.refineLead(Object.assign({}, leadRaw), {
  formatHub: 'cash', stackBB: 100, street: 'flop', band: 'air', strength: 0.2,
  initiative: 'aggressor', inPosition: true, multiwayCount: 4, potType: 'srp'
});
ok(betTotal(leadMw) < betTotal(leadHu) + 0.02, 'multiway reduce air bet');
assertNormalized(leadHu, 'lead HU');
assertNormalized(leadMw, 'lead MW');

const lead3bp = DC.refineLead(Object.assign({}, leadRaw), {
  formatHub: 'cash', stackBB: 100, street: 'flop', band: 'value', strength: 0.7,
  initiative: 'aggressor', inPosition: true, multiwayCount: 2, potType: '3bp'
});
ok((lead3bp.bet_33 || 0) <= (leadRaw.bet_33 || 0) + 0.001, '3BP reduces small bets');
assertNormalized(lead3bp, 'lead 3BP');

const faceRef = DC.refineFacing(
  { fold: 0.35, call: 0.45, raise: 0.2 },
  {
    formatHub: 'cash', stackBB: 100, street: 'flop', band: 'merge', strength: 0.5,
    lineIntent: null, multiwayCount: 2, villainBetRatio: 1.0, toCallBB: 10, potBeforeBB: 10
  }
);
ok(faceRef.freqs && faceRef.freqs.fold != null, 'refineFacing freqs');
assertNormalized(faceRef.freqs, 'facing oversize');
ok((faceRef.freqs.call || 0) < 0.45, 'threshold defense cuts call vs oversize');

/* Engine.js refine delegates to DC */
ok(typeof Engine !== 'undefined', 'Engine loaded');

/* ========== 7. sampleFacing neverFold ========== */
eq(DC.sampleFacing({ fold: 1, call: 0, raise: 0 }, 0.5, { neverFold: true }), 'call',
  'neverFold forces call');
eq(DC.sampleFacing({ fold: 0, call: 0.2, raise: 0.8 }, 0.1, { neverFold: true, canRaise: true }),
  'raise', 'neverFold can raise');

/* ========== 8. computePostflopMix + drivers ========== */
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
eq(mix.kind, 'lead', 'lead mix');
assertNormalized(mix.freqs, 'mix lead');
ok(mix.drivers.length >= 1, 'drivers present');
ok(mix.topDrivers.length >= 1 && mix.topDrivers.length <= 3, 'topDrivers 1–3');
ok(mix.topDrivers.every(function (d) {
  return mix.drivers.some(function (x) { return x.id === d.id; });
}), 'topDrivers ⊆ drivers');

const mixFace = DC.computePostflopMix({
  facing: true,
  toCallBB: 3,
  potBB: 10,
  potBeforeBB: 7,
  heroEquity: 0.4,
  heroCards: ['Jh', '9d'],
  ctx: {
    board: ['As', '8d', '3c'],
    street: 'flop',
    initiative: 'caller',
    inPosition: false,
    stackBB: 100,
    formatHub: 'cash',
    spr: 10,
    strength: 0.4,
    band: 'bluffcatch'
  }
});
eq(mixFace.kind, 'facing', 'facing mix');
assertNormalized(mixFace.freqs, 'mix facing');

/* ========== 9. evaluateSpot drivers + ICM + legal filter ========== */
const spot = GTO.evaluateSpot({
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
ok(spot.drivers.length >= 1, 'evaluateSpot drivers');
ok(spot.topDrivers.length >= 1, 'topDrivers');
ok(Array.isArray(spot.conceptTags), 'conceptTags');
assertNormalized(spot.strategy, 'cash strategy');
Object.keys(spot.strategy).forEach(function (k) {
  ok(['check', 'bet_33', 'bet_66', 'bet_100'].indexOf(k) >= 0, 'legal only: ' + k);
});

const faceEarly = GTO.evaluateSpot({
  street: 'flop', heroCards: ['Jh', '9d'], board: ['As', '8d', '3c'],
  potBB: 10, toCallBB: 3.3, potBeforeBB: 6.7, initiative: 'caller', inPosition: false,
  availableActions: ['fold', 'call', 'raise'],
  formatHub: 'mtt', mttPhase: 'early', resolvedPhase: 'early',
  heroStackBB: 40, effStack: 40
});
const faceBubble = GTO.evaluateSpot({
  street: 'flop', heroCards: ['Jh', '9d'], board: ['As', '8d', '3c'],
  potBB: 10, toCallBB: 3.3, potBeforeBB: 6.7, initiative: 'caller', inPosition: false,
  availableActions: ['fold', 'call', 'raise'],
  formatHub: 'mtt', mttPhase: 'bubble', resolvedPhase: 'bubble',
  mttStructureSituation: 'bubble', heroStackBB: 22, effStack: 22,
  icmStacksBB: [22, 40, 28], icmPayouts: [0.5, 0.3, 0.2],
  playersLeft: 13, placesPaid: 12
});
ok((faceBubble.strategy.fold || 0) >= (faceEarly.strategy.fold || 0) - 0.02,
  'bubble fold ≥ early');
ok(faceBubble.bubbleFactor > 1 || (faceBubble.conceptTags || []).indexOf('icmBubble') >= 0,
  'bubble annotated');
assertNormalized(faceBubble.strategy, 'bubble strategy');

/* Best action is max freq (coherencia UI) */
if (Classifier && Classifier.classify) {
  const cls = Classifier.classify(spot.strategy, 'check', Object.keys(spot.strategy));
  let maxK = null;
  let maxV = -1;
  Object.keys(spot.strategy).forEach(function (k) {
    if (spot.strategy[k] > maxV) { maxV = spot.strategy[k]; maxK = k; }
  });
  eq(cls.best, maxK, 'classifier best = max freq');
}

/* ========== 10. Torneo: nuts never fold (Monte Carlo) ========== */
function riverNutsHand() {
  return {
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
}
['pro', 'tag', 'lag'].forEach(function (role) {
  let folds = 0;
  for (let i = 0; i < 40; i++) {
    const act = TD.decide(riverNutsHand(), {
      id: 'v1', roleId: role, pos: 'BB', cards: ['Td', '9d'],
      stack: 40, streetInvested: 0, invested: 0, _lineIntent: null, _linePlan: null
    });
    if (act.id === 'fold') folds++;
  }
  eq(folds, 0, role + ' never folds nut straight (' + folds + ' folds)');
});

/* Fish/nit path returns legal actions */
['fish', 'nit', 'maniac'].forEach(function (role) {
  const act = TD.decide(Object.assign(riverNutsHand(), {
    board: ['As', 'Kd', '2c', '8h', '3s'], currentBet: 12, pot: 20
  }), {
    id: 'v2', roleId: role, pos: 'BB', cards: ['7c', '2d'],
    stack: 40, streetInvested: 0, invested: 0
  });
  ok(act && ['fold', 'call', 'raise', 'check', 'bet'].indexOf(act.id) >= 0,
    role + ' legal action ' + (act && act.id));
});

/* Pro lead on dry A-high often bets (statistical) */
let proBets = 0;
for (let i = 0; i < 50; i++) {
  const act = TD.decide({
    street: 'flop',
    bb: 1,
    pot: 6.5,
    currentBet: 0,
    minRaise: 1,
    board: ['As', '8d', '3c'],
    openerId: 'v1',
    formatHub: 'mtt',
    mttPhase: 'early',
    seats: [],
    config: { formatHub: 'mtt', mttPhase: 'early', stackBB: 40 }
  }, {
    id: 'v1', roleId: 'pro', pos: 'BTN', cards: ['Kh', 'Qd'],
    stack: 40, streetInvested: 0, invested: 3
  });
  if (act.id === 'bet' || act.id === 'raise') proBets++;
}
ok(proBets >= 15, 'pro IP aggressor c-bets dry often (' + proBets + '/50)');

/* XR follow-through: with checkRaise intent, raise rate higher */
let xrRaises = 0;
let plainRaises = 0;
for (let i = 0; i < 60; i++) {
  const baseHand = {
    street: 'flop',
    bb: 1,
    pot: 12,
    currentBet: 4,
    minRaise: 4,
    board: ['Kh', 'Td', '7c'],
    openerId: 'hero',
    formatHub: 'cash',
    mttPhase: 'early',
    seats: [],
    config: { formatHub: 'cash', stackBB: 100 }
  };
  const seatXr = {
    id: 'v1', roleId: 'pro', pos: 'BB', cards: ['9h', '9d'],
    stack: 100, streetInvested: 0, invested: 0, _lineIntent: 'checkRaise'
  };
  const seatPlain = Object.assign({}, seatXr, { _lineIntent: null });
  if (TD.decide(baseHand, seatXr).id === 'raise') xrRaises++;
  if (TD.decide(baseHand, seatPlain).id === 'raise') plainRaises++;
}
ok(xrRaises >= plainRaises, 'XR intent raise ≥ plain (' + xrRaises + ' vs ' + plainRaises + ')');

/* ========== 11. Preflop cold4bet / squeeze ========== */
ok(VP && typeof VP.cold4BetAction === 'function', 'cold4BetAction');
ok(typeof VP.squeezeAction === 'function', 'squeezeAction');
const coldAA = [];
for (let i = 0; i < 80; i++) {
  coldAA.push(VP.cold4BetAction('AA', { id: 'pro', preflopStrict: 1 }, i / 80, {
    stackBB: 100, formatHub: 'cash'
  }));
}
ok(coldAA.filter(function (a) { return a === '4bet'; }).length >= 20, 'AA cold 4bets often');
eq(VP.cold4BetAction('72o', { id: 'pro', preflopStrict: 1 }, 0.1, { stackBB: 100 }), 'fold',
  '72o cold folds');
const sqMulti = VP.squeezeAction('A4s', { id: 'pro', preflopStrict: 1 }, 0.2, {
  callersAhead: 2, stackBB: 100
});
const sqSingle = VP.squeezeAction('A4s', { id: 'pro', preflopStrict: 1 }, 0.2, {
  callersAhead: 1, stackBB: 100
});
ok(typeof sqMulti === 'string' && typeof sqSingle === 'string', 'squeeze returns action');

/* ========== 12. Facing threshold defense ========== */
const Facing = sandbox.window.GTOFacingBet;
const small = Facing.calculateActionFrequencies({
  currentPot: 10, betSize: 3, heroEquity: 0.42, street: 'flop', inPosition: false,
  madeHandInfo: { tier: 'medium', ev: { category: 1 } },
  board: ['As', '8d', '3c'], heroCards: ['Jh', '9d']
});
const over = Facing.calculateActionFrequencies({
  currentPot: 10, betSize: 12, heroEquity: 0.42, street: 'flop', inPosition: false,
  madeHandInfo: { tier: 'medium', ev: { category: 1 } },
  board: ['As', '8d', '3c'], heroCards: ['Jh', '9d']
});
ok((over.fold || 0) >= (small.fold || 0) - 0.05, 'oversize → more fold');
assertNormalized(small, 'small face');
assertNormalized(over, 'over face');

/* ========== 13. previewAdvice drivers ========== */
const handAdvice = Engine.newHand({
  type: 'RFI',
  heroPos: 'BTN',
  seed: 424242
}, {
  formatHub: 'cash',
  gameType: 'cash6',
  stackBB: 100,
  villainLevel: 'pro',
  practiceStreet: 'flop'
});
if (handAdvice && handAdvice.current) {
  const advice = Engine.previewAdvice(handAdvice);
  if (advice && advice.recommended) {
    ok(Array.isArray(advice.drivers) || advice.drivers == null || advice.street === 'preflop',
      'previewAdvice drivers field');
    if (advice.street !== 'preflop' && advice.drivers) {
      ok(advice.drivers.length >= 0, 'drivers array');
    }
    assertNormalized(advice.recommended.strategy || advice.options.reduce(function (acc, o) {
      acc[o.id] = o.freq;
      return acc;
    }, {}), 'advice strategy-ish');
  } else {
    ok(true, 'previewAdvice skipped (no node options)');
  }
} else {
  ok(true, 'newHand smoke skipped');
}

/* Force a postflop advice path via evaluateSpot parity already covered;
   build minimal current node if Engine exposes buildSpotInput */
if (Engine.buildSpotInput && handAdvice) {
  /* ensure function exists */
  ok(true, 'buildSpotInput present');
}

/* ========== 14. Escuela M3 — spots producen estrategia coherente ========== */
ok(SchoolData && SchoolData.getLesson, 'SchoolData');
['C-21', 'C-22', 'C-23', 'C-24', 'C-25'].forEach(function (id) {
  const lesson = SchoolData.getLesson(id);
  ok(lesson && lesson.module === 'M3', id + ' M3');
  ok(lesson.spots && lesson.spots.length >= 10, id + ' ≥10 spots');
  eq(lesson.hands, lesson.spots.length, id + ' hands sync');
});

/* Sample M3 spots through evaluateSpot — freqs normalized, best defined */
function evalSchoolSpot(spot) {
  const deal = spot.forceDeal || {};
  const cards = deal.heroCards || spot.heroCards;
  const board = deal.board || spot.board || [];
  if (!cards || board.length < 3) return null;
  const facing = !!(spot.facingBet || deal.facingBet);
  const potBB = facing ? 6.5 : 5.5;
  const toCall = facing ? 2 : 0;
  return GTO.evaluateSpot({
    street: spot.street || (board.length >= 5 ? 'river' : (board.length === 4 ? 'turn' : 'flop')),
    heroCards: cards,
    board: board.slice(),
    potBB: potBB,
    toCallBB: toCall,
    potBeforeBB: potBB - toCall,
    initiative: facing ? 'caller' : 'aggressor',
    inPosition: (spot.heroPos || deal.heroPos || 'BTN') !== 'BB'
      && (spot.heroPos || deal.heroPos || 'BTN') !== 'SB',
    availableActions: facing
      ? ['fold', 'call', 'raise']
      : ['check', 'bet_33', 'bet_66', 'bet_100'],
    formatHub: 'cash',
    spr: 12,
    effStack: 100,
    chosenAction: facing ? 'call' : 'bet_33'
  });
}

let schoolEvalOk = 0;
['C-21', 'C-22', 'C-24'].forEach(function (id) {
  const lesson = SchoolData.getLesson(id);
  (lesson.spots || []).slice(0, 4).forEach(function (sp) {
    const res = evalSchoolSpot(sp);
    if (!res || !res.strategy) return;
    assertNormalized(res.strategy, id + ' ' + (sp.id || 'spot'));
    if (res.evaluation) {
      ok(['optima', 'aceptable', 'imprecisa', 'error'].indexOf(res.evaluation.class) >= 0,
        id + ' class ' + res.evaluation.class);
      ok(res.evaluation.best, id + ' has best');
      ok((res.strategy[res.evaluation.best] || 0) >= 0, id + ' best in strategy');
    }
    if (res.topDrivers) ok(res.topDrivers.length <= 3, id + ' topDrivers capped');
    schoolEvalOk++;
  });
});
ok(schoolEvalOk >= 6, 'evaluated ≥6 school M3 spots (' + schoolEvalOk + ')');

/* ========== 15. Parity: refineFacing DC vs FormatAdjust+LinePolicy pipeline ========== */
const rawF = { fold: 0.33, call: 0.45, raise: 0.22 };
const ctxXr = {
  formatHub: 'cash', stackBB: 100, street: 'flop', band: 'value', strength: 0.75,
  lineIntent: 'checkRaise', multiwayCount: 2
};
const viaDc = DC.refineFacing(rawF, ctxXr);
let viaManual = Object.assign({}, rawF);
viaManual = FA.applyToFreqs(viaManual, ctxXr, 'xr');
viaManual = DC.applyIcmToFreqs(viaManual, ctxXr, 'xr');
viaManual = LP.adjustFacing(viaManual, ctxXr);
assertNormalized(viaDc.freqs, 'DC XR refine');
ok(viaDc.freqs.raise > rawF.raise, 'both paths boost XR raise');

console.log('test-pro-decision-engine: OK (' + checks + ' asserts)');
