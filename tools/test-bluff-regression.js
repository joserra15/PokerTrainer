#!/usr/bin/env node
/**
 * Regresión faroles: delayed river, paired raises, push/steal short-mid,
 * paridad trainer/import/live, techos anti-spew, villanos mid-strength.
 * Run: node tools/test-bluff-regression.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
let failed = 0;
function ok(cond, msg) {
  if (cond) console.log('OK:', msg);
  else { failed++; console.error('FAIL:', msg); }
}

const sandbox = {
  console, Math, Date, Set, Map, JSON, parseFloat, parseInt, isNaN, isFinite,
  Object, Array, String, Number, Boolean, RegExp, Error, Promise
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);

const scripts = [
  'cards.js',
  'engine/cache.js',
  'engine/format/taxonomy.js',
  'engine/format/tournament-context.js',
  'engine/ranges/notation.js',
  'engine/ranges/data.js',
  'engine/ranges/extended.js',
  'engine/ranges/variants.js',
  'engine/ranges/nash-push-data.js',
  'engine/ranges/jsonLoader.js',
  'engine/ranges/pushFold.js',
  'engine/ranges/registry.js',
  'engine/ranges/weights.js',
  'engine/ranges/villainTracking.js',
  'engine/handStrength.js',
  'engine/equity/madeHand.js',
  'engine/math/potMath.js',
  'engine/math/evMath.js',
  'engine/equity/monteCarlo.js',
  'engine/equity/handRank.js',
  'engine/equity/blockers.js',
  'engine/solver/boardCluster.js',
  'engine/validation/boardTextureShift.js',
  'engine/validation/villainCallAudit.js',
  'engine/validation/streetStrategy.js',
  'engine/solver/rangeAdvantage.js',
  'engine/solver/riverShoveNode.js',
  'engine/solver/probeEV.js',
  'engine/solver/villainStrategyAdjust.js',
  'engine/solver/preflopSolver.js',
  'engine/solver/facingBet.js',
  'engine/solver/spotKey.js',
  'engine/solver/strategyTables.js',
  'engine/solver/bluffSpotDetector.js',
  'engine/solver/SolverProvider.js',
  'engine/scoring/classifier.js',
  'engine/scoring/icmEv.js',
  'engine/scoring/evLoss.js',
  'engine/scoring/scoring.js',
  'engine/scoring/errors.js',
  'engine/explanations/rules.js',
  'engine/explanations/bluffAnalysis.js',
  'engine/villainProfiles.js',
  'engine/solver/LocalSolverProvider.js',
  'engine/evaluateSpot.js',
  'tournament/gto-eval.js'
];

scripts.forEach(function (rel) {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', rel), 'utf8'), sandbox, { filename: rel });
});

const GTO = sandbox.GTO;
const Errors = sandbox.GTOErrors;
const Probe = sandbox.GTOProbeEV;
const PF = sandbox.GTOPushFold;
const VP = sandbox.GTOVillainProfiles;
const GEval = sandbox.PTTournamentGtoEval;
const Cl = sandbox.GTOClassifier;

function sumAggro(freqs) {
  let s = (freqs.bet || 0) + (freqs.raise || 0) + (freqs.overbet || 0) + (freqs.allin || 0);
  Object.keys(freqs || {}).forEach(function (k) {
    if (k.indexOf('bet_') === 0) s += freqs[k] || 0;
  });
  return s;
}

function classRank(c) {
  return ({ optima: 3, aceptable: 2, imprecisa: 1, error: 0 })[c] != null
    ? ({ optima: 3, aceptable: 2, imprecisa: 1, error: 0 })[c]
    : -1;
}

// --- 1) Delayed river OOP AXX blank overbet air ---
(function delayedRiverOopAxx() {
  const input = {
    spotKind: 'postflop',
    street: 'river',
    position: 'BB',
    vsPosition: 'BTN',
    heroCards: ['7h', '6c'],
    handCode: '76o',
    board: ['As', 'Kd', '2c', '3h', '8d'],
    potBB: 12,
    potBeforeBB: 12,
    toCallBB: 0,
    stackDepth: 80,
    initiative: 'aggressor',
    inPosition: false,
    priorAggressorBet: false,
    delayedCbet: true,
    villainLastAction: 'check',
    chosenAction: 'overbet',
    betSizeBB: 15,
    availableActions: ['check', 'bet_33', 'bet_66', 'bet_100', 'overbet'],
    formatHub: 'mtt',
    gameType: 'mtt'
  };
  const res = GTO.evaluateSpot(input);
  const cls = res.evaluation && res.evaluation.class;
  const aggro = sumAggro(res.strategy || {});
  ok(cls !== 'error', 'delayed AXX overbet air ≠ error, got ' + cls);
  ok(classRank(cls) >= 1, 'delayed AXX overbet ≥ imprecisa, got ' + cls);
  ok(aggro >= 0.12 && aggro <= 0.45, 'delayed air bet total in [0.12,0.45], got ' + aggro.toFixed(3));
  const errs = Errors.detectErrors(Object.assign({}, input, {
    strategy: res.strategy,
    madeHandInfo: { tier: 'air' },
    foldEquity: 0.35,
    street: 'river',
    villainLastAction: 'check'
  }));
  ok(!errs.some(function (e) { return e.type === 'bluff_excesivo'; }),
    'no bluff_excesivo falso en delayed polar');
})();

// --- 2) True triple-barrel air wet sigue castigado ---
(function tripleBarrelWetAir() {
  const input = {
    spotKind: 'postflop',
    street: 'river',
    position: 'BTN',
    heroCards: ['4c', '3d'],
    handCode: '43o',
    board: ['9h', '8h', '7d', '6c', '2s'],
    potBB: 20,
    potBeforeBB: 20,
    toCallBB: 0,
    stackDepth: 90,
    initiative: 'aggressor',
    inPosition: true,
    priorAggressorBet: true,
    delayedCbet: false,
    villainLastAction: 'call',
    chosenAction: 'bet_100',
    betSizeBB: 20,
    availableActions: ['check', 'bet_33', 'bet_66', 'bet_100', 'overbet'],
    formatHub: 'cash',
    gameType: 'cash6',
    madeHandInfo: { tier: 'air' },
    heroEquity: 0.12
  };
  const res = GTO.evaluateSpot(input);
  const aggro = sumAggro(res.strategy || {});
  ok(aggro <= 0.20, 'true barrel wet air capped ≤0.20, got ' + aggro.toFixed(3));
  const cls = res.evaluation && res.evaluation.class;
  ok(cls === 'error' || cls === 'imprecisa', 'triple-barrel air spew sigue mal, got ' + cls);
})();

// --- 3) bluff_excesivo suma bet_* ---
(function bluffExcesivoSumKeys() {
  const freqs = { check: 0.70, bet_33: 0.08, bet_66: 0.07, bet_100: 0.05, overbet: 0.04 };
  const errs = Errors.detectErrors({
    chosenAction: 'overbet',
    potBB: 10,
    toCallBB: 0,
    betSizeBB: 12,
    spr: 6,
    strategy: freqs,
    madeHandInfo: { tier: 'air' },
    priorAggressorBet: false,
    delayedCbet: true,
    foldEquity: 0.34,
    heroCards: ['Ah', '5c'],
    board: ['Kd', '7s', '2c', '3h', '9d']
  });
  ok(!errs.some(function (e) { return e.type === 'bluff_excesivo'; }),
    'bluff_excesivo usa suma (≥15% total), no keys sueltas');
  const low = Errors.detectErrors({
    chosenAction: 'bet_100',
    potBB: 10,
    toCallBB: 0,
    betSizeBB: 10,
    spr: 6,
    strategy: { check: 0.96, bet_33: 0.01, bet_66: 0.01, bet_100: 0.01, overbet: 0.01 },
    madeHandInfo: { tier: 'air' },
    priorAggressorBet: true,
    foldEquity: 0.1
  });
  ok(low.some(function (e) { return e.type === 'bluff_excesivo'; }),
    'bluff_excesivo sigue disparando con aggro total <15%');
})();

// --- 4) Raise air board paired ---
(function pairedBoardAirRaise() {
  const input = {
    spotKind: 'postflop',
    street: 'river',
    position: 'BB',
    heroCards: ['Ah', '5c'],
    handCode: 'A5o',
    board: ['Td', 'Tc', '7s', '3h', '2d'],
    potBB: 14,
    potBeforeBB: 8,
    toCallBB: 6,
    stackDepth: 70,
    initiative: 'caller',
    inPosition: false,
    chosenAction: 'raise',
    betSizeBB: 18,
    availableActions: ['fold', 'call', 'raise'],
    villainBetRatio: 0.75,
    facingNode: 'bet',
    formatHub: 'mtt',
    gameType: 'mtt'
  };
  const res = GTO.evaluateSpot(input);
  const raiseF = (res.strategy && (res.strategy.raise || 0)) || 0;
  const cls = res.evaluation && res.evaluation.class;
  ok(raiseF >= 0.05, 'paired air raise freq ≥5%, got ' + raiseF.toFixed(3));
  ok(cls !== 'error' || raiseF < 0.05, 'paired air raise no error automático si hay freq, class=' + cls);
})();

// --- 5) 14bb Nash shove ---
(function shove14bb() {
  ok(PF.isPushPhase({ formatHub: 'mtt', stackBB: 14 }), 'isPushPhase true a 14bb');
  const input = {
    spotKind: 'RFI',
    street: 'preflop',
    position: 'SB',
    handCode: 'ATs',
    stackDepth: 14,
    stackBB: 14,
    effStack: 14,
    toCallBB: 0,
    potBB: 1.5,
    chosenAction: 'allin',
    availableActions: ['fold', 'raise', 'allin'],
    formatHub: 'mtt',
    gameType: 'mtt',
    pushFold: true,
    preflopMode: 'push',
    anteBB: 0.12
  };
  const res = GTO.evaluateSpot(input);
  const cls = res.evaluation && res.evaluation.class;
  const jam = (res.strategy && ((res.strategy.allin || 0) + (res.strategy.raise || 0))) || 0;
  ok(jam >= 0.5, '14bb SB ATs jam freq ≥50%, got ' + jam.toFixed(3));
  ok(cls !== 'error', '14bb Nash shove ≠ error, got ' + cls);
})();

// --- 6) Steal SB ~18bb jam light ---
(function stealSb18JamLight() {
  const strat = PF.stealOpenStrategy({
    handCode: 'Q3o',
    position: 'SB',
    effStack: 18,
    stackBB: 18,
    anteBB: 0.15,
    rangeContext: { stackBB: 18, formatHub: 'mtt', anteBB: 0.15 }
  });
  ok((strat.allin || 0) >= 0.15, 'SB 18bb Q3o steal allin ≥15%, got ' + (strat.allin || 0));
  const input = {
    spotKind: 'RFI',
    street: 'preflop',
    position: 'SB',
    handCode: 'Q3o',
    stackDepth: 18,
    stackBB: 18,
    effStack: 18,
    toCallBB: 0,
    potBB: 1.5,
    chosenAction: 'allin',
    availableActions: ['fold', 'raise', 'allin'],
    formatHub: 'mtt',
    gameType: 'mtt',
    preflopMode: 'steal',
    scenario: 'steal',
    anteBB: 0.15
  };
  const res = GTO.evaluateSpot(input);
  const cls = res.evaluation && res.evaluation.class;
  ok(classRank(cls) >= 1, 'steal SB 18bb Q3o jam ≥ imprecisa, got ' + cls);
})();

// --- 7) SB ≥40bb Q3 jam sigue malo ---
(function deepQ3JamBad() {
  const input = {
    spotKind: 'RFI',
    street: 'preflop',
    position: 'SB',
    handCode: 'Q3o',
    stackDepth: 50,
    stackBB: 50,
    effStack: 50,
    toCallBB: 0,
    potBB: 1.5,
    chosenAction: 'allin',
    availableActions: ['fold', 'raise', 'allin'],
    formatHub: 'mtt',
    gameType: 'mtt',
    preflopMode: 'std',
    anteBB: 0.1
  };
  const res = GTO.evaluateSpot(input);
  const jam = (res.strategy && (res.strategy.allin || 0)) || 0;
  const cls = res.evaluation && res.evaluation.class;
  ok(jam < 0.08, '≥40bb SB Q3o allin residual, got ' + jam.toFixed(3));
  ok(cls === 'error' || cls === 'imprecisa', 'deep Q3 jam sigue malo, got ' + cls);
})();

// --- 8) gto-eval buildInput expone línea ---
(function gtoEvalLineContext() {
  ok(!!GEval && typeof GEval.buildInput === 'function', 'PTTournamentGtoEval.buildInput');
  const hand = {
    street: 'river',
    bb: 100,
    pot: 1200,
    currentBet: 0,
    minRaise: 200,
    board: ['As', 'Kd', '2c', '3h', '8d'],
    openerId: 'h1',
    seats: [
      {
        id: 'h1', isHero: true, pos: 'BB', stack: 8000, streetInvested: 0,
        cards: ['7h', '6c'], roleId: 'hero'
      },
      {
        id: 'v1', isHero: false, pos: 'BTN', stack: 7500, streetInvested: 0,
        cards: ['9c', '9d'], roleId: 'tag',
        lastAction: { action: 'check', street: 'river' }
      }
    ],
    log: [
      { id: 'h1', action: 'check', street: 'flop' },
      { id: 'v1', action: 'check', street: 'flop' },
      { id: 'h1', action: 'check', street: 'turn' },
      { id: 'v1', action: 'check', street: 'turn' },
      { id: 'v1', action: 'check', street: 'river' }
    ],
    decisions: [
      { street: 'flop', action: 'check' },
      { street: 'turn', action: 'check' }
    ],
    heroOptions: [{ id: 'check' }, { id: 'bet' }, { id: 'allin' }],
    formatHub: 'mtt',
    kind: 'mtt',
    ante: 12,
    playersLeft: 40,
    placesPaid: 15
  };
  const hero = hand.seats[0];
  const input = GEval.buildInput(hand, hero, { id: 'bet', amount: 1500 });
  ok(input.priorAggressorBet === false, 'buildInput priorAggressorBet=false');
  ok(input.delayedCbet === true, 'buildInput delayedCbet=true');
  ok(input.inPosition === false, 'buildInput inPosition=false (BB vs BTN)');
  ok(input.villainLastAction === 'check', 'buildInput villainLastAction=check');
  const graded = GEval.evaluateHeroAction(hand, hero, { id: 'bet', amount: 1500 });
  ok(graded.class !== 'error', 'live grade delayed river bet ≠ error, got ' + graded.class);
})();

// --- 9) Delayed vs barrel: frecuencias distintas + techo ---
(function delayedVsBarrelFreq() {
  const base = {
    spotKind: 'postflop',
    street: 'river',
    position: 'BB',
    heroCards: ['7h', '6c'],
    handCode: '76o',
    board: ['As', 'Kd', '2c', '3h', '8d'],
    potBB: 12,
    toCallBB: 0,
    stackDepth: 80,
    initiative: 'aggressor',
    inPosition: false,
    villainLastAction: 'check',
    availableActions: ['check', 'bet_33', 'bet_66', 'bet_100', 'overbet'],
    formatHub: 'mtt'
  };
  const delayed = Probe.computeProbeStrategy(Object.assign({}, base, {
    priorAggressorBet: false, delayedCbet: true
  }));
  const barrel = Probe.computeProbeStrategy(Object.assign({}, base, {
    priorAggressorBet: true, delayedCbet: false
  }));
  ok(delayed.betTotal > barrel.betTotal + 0.04,
    'delayed betTotal > barrel, ' + delayed.betTotal.toFixed(3) + ' vs ' + barrel.betTotal.toFixed(3));
  ok(delayed.betTotal <= 0.45, 'delayed techo anti-spew ≤0.45, got ' + delayed.betTotal.toFixed(3));
})();

// --- 10) Villano trainer: mid-strength fold sube vs overbet tras checks ---
(function villainTrainerFoldPolar() {
  const profile = VP.getProfile('tag') || VP.PROFILES.tag || VP.getProfile('pro');
  ok(!!profile, 'villain profile tag/pro');
  let foldsPassive = 0;
  let foldsNormal = 0;
  const N = 400;
  for (let i = 0; i < N; i++) {
    const r = (i + 0.5) / N;
    const a1 = VP.postflopFacingBet(0.52, 0.30, profile, r, {
      street: 'river', tier: 'medium', madeCategory: 1,
      passiveLine: true, delayedHeroLead: true, betRatio: 1.25, boardPaired: false
    });
    const a2 = VP.postflopFacingBet(0.52, 0.30, profile, r, {
      street: 'river', tier: 'medium', madeCategory: 1,
      passiveLine: false, betRatio: 0.40, boardPaired: false
    });
    if (a1 === 'fold') foldsPassive++;
    if (a2 === 'fold') foldsNormal++;
  }
  ok(foldsPassive > foldsNormal + 60,
    'mid-strength fold↑ tras delayed overbet (' + foldsPassive + ' vs ' + foldsNormal + ')');
  /* neverFold nuts intacto */
  let nutFolds = 0;
  for (let i = 0; i < 100; i++) {
    const a = VP.postflopFacingBet(0.95, 0.4, profile, i / 100, {
      street: 'river', tier: 'nuts', madeCategory: 5, neverFold: true, betRatio: 1.5
    });
    if (a === 'fold') nutFolds++;
  }
  ok(nutFolds === 0, 'neverFold nuts: 0 folds, got ' + nutFolds);
})();

// --- 11) Value overbet nuts no degradado (anti-regresión) ---
(function valueOverbetNutsSafe() {
  const input = {
    spotKind: 'postflop',
    street: 'river',
    position: 'BTN',
    heroCards: ['Ah', 'Kh'],
    handCode: 'AKs',
    board: ['As', 'Kd', '2c', '3h', '8d'],
    potBB: 20,
    toCallBB: 0,
    stackDepth: 90,
    initiative: 'aggressor',
    inPosition: true,
    priorAggressorBet: true,
    chosenAction: 'overbet',
    betSizeBB: 30,
    availableActions: ['check', 'bet_33', 'bet_66', 'bet_100', 'overbet'],
    formatHub: 'cash'
  };
  const res = GTO.evaluateSpot(input);
  const cls = res.evaluation && res.evaluation.class;
  ok(cls === 'optima' || cls === 'aceptable', 'value overbet nuts sigue bien, got ' + cls);
})();

// --- 12) bluffAnalysis: catch incoherente (call error ≠ «bluffcatch clásico») ---
(function bluffCatchCoherentPostDecision() {
  const BA = sandbox.GTOBluffAnalysis;
  ok(!!BA, 'GTOBluffAnalysis cargado');
  const a = BA.analyze({
    practiceIntent: 'bluff_catch',
    chosenAction: 'call',
    best: 'fold',
    class: 'error',
    strategy: { fold: 0.72, call: 0.18, raise: 0.10 },
    street: 'river',
    potBB: 38,
    potBeforeBB: 24,
    toCallBB: 14,
    villainBetRatio: 0.6,
    formatHub: 'cash',
    band: 'bluffcatch',
    bluffSpot: {
      intent: 'bluff_catch',
      score: 0.85,
      band: 'bluffcatch',
      reasons: ['Mano tipo showdown medio (categoría bluffcatch).', 'River: decisión de bluffcatch clásica.']
    }
  });
  ok(a.catchCoherent === false, 'catchCoherent false cuando call es error GTO');
  ok(/no es un bluffcatch gto/i.test(a.headline), 'headline niega bluffcatch GTO, got ' + a.headline);
  ok(!/clásica/i.test(a.summary), 'summary no dice «clásica» si call es error');
  ok(/Cash/.test(a.contextLine), 'contexto incluye Cash');
})();

// --- 13) bluffAnalysis: farol aceptable + sizing ---
(function bluffMakeAcceptableSizing() {
  const BA = sandbox.GTOBluffAnalysis;
  const sizingBad = BA.assessBluffSizing({ potBB: 20, betSizeBB: 4 });
  ok(sizingBad.ok === false && sizingBad.tier === 'tiny', 'sizing tiny no polar');
  const sizingOk = BA.assessBluffSizing({ potBB: 20, betSizeBB: 20 });
  ok(sizingOk.ok === true, 'sizing pot polar OK');

  const a = BA.analyze({
    practiceIntent: 'bluff_make',
    chosenAction: 'overbet',
    best: 'check',
    class: 'imprecisa',
    strategy: { check: 0.78, bet_66: 0.08, overbet: 0.14 },
    street: 'river',
    potBB: 12,
    potBeforeBB: 12,
    toCallBB: 0,
    betSizeBB: 15,
    formatHub: 'mtt',
    mttPhase: 'bubble',
    delayedCbet: true,
    priorAggressorBet: false,
    villainLastAction: 'check',
    band: 'air',
    foldEquity: 0.35,
    blockerScore: 0.32,
    bluffSpot: { intent: 'bluff_make', score: 0.6, band: 'air', foldEquity: 0.35, blockers: 0.32, reasons: [] }
  });
  ok(a.acceptableBluff === true, 'farol delayed polar marcado aceptable');
  ok(/aceptable|mezcla check/i.test(a.headline + ' ' + a.summary), 'texto menciona aceptable/check GTO');
  ok(/MTT|fase|bote/i.test(a.contextLine + ' ' + a.summary), 'contexto MTT/fase/bote');
  ok(a.sizing && a.sizing.ok === true, 'sizing del farol OK');
})();

// --- 14) evaluateSpot adjunta bluffAnalysis post-decisión ---
(function evaluateSpotAttachesBluffAnalysis() {
  const input = {
    spotKind: 'postflop',
    street: 'river',
    position: 'BB',
    heroCards: ['7h', '6c'],
    handCode: '76o',
    board: ['As', 'Kd', '2c', '3h', '8d'],
    potBB: 12,
    potBeforeBB: 12,
    toCallBB: 0,
    stackDepth: 80,
    initiative: 'aggressor',
    inPosition: false,
    priorAggressorBet: false,
    delayedCbet: true,
    villainLastAction: 'check',
    chosenAction: 'overbet',
    betSizeBB: 15,
    availableActions: ['check', 'bet_33', 'bet_66', 'bet_100', 'overbet'],
    formatHub: 'mtt',
    gameType: 'mtt',
    practiceIntent: 'bluff_make'
  };
  const res = GTO.evaluateSpot(input);
  ok(!!(res.evaluation && res.evaluation.bluffAnalysis), 'evaluation.bluffAnalysis presente');
  ok(res.evaluation.bluffAnalysis.headline, 'bluffAnalysis.headline no vacío');
  ok(res.evaluation.practiceIntent === 'bluff_make', 'practiceIntent en evaluation');
})();

if (failed) {
  console.error('\n*** test-bluff-regression FAILED:', failed, '***');
  process.exit(1);
}
console.log('\n*** test-bluff-regression OK ***');
