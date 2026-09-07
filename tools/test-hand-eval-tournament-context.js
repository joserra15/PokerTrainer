#!/usr/bin/env node
/**
 * Regresión: evaluación GTO de manos con contexto de torneo/mesa
 * (hub, fase, stacks, HU/multiway, PKO) no debe romper analyzeHand
 * ni desviarse a charts de cash deep.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON, parseFloat, parseInt, isNaN, isFinite };
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
  'engine/solver/LocalSolverProvider.js',
  'engine/evaluateSpot.js',
  'engine/villainProfiles.js',
  'engine/villainFormatAdjust.js',
  'engine/villainPreflop.js',
  'engine/stacks.js',
  'play-config.js',
  'ranges.js',
  'range-matrix.js',
  'engine.js',
  'import/hhUtils.js',
  'import/formatDetector.js',
  'import/icmLite.js',
  'import/populationCompare.js',
  'import/parsers/pokerstars.js',
  'import/parsers/winamax.js',
  'import/parsers/ggpoker.js',
  'import/parsers/eightyeight.js',
  'import/parsers/coinpoker.js',
  'import.js',
  'hand-analysis.js'
];

scripts.forEach((f) => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
});

const { Importer, PTHandAnalysis, GTORangesRegistry: RR, GTO } = sandbox.window;
let failed = 0;
function assert(cond, msg) {
  if (cond) console.log('OK:', msg);
  else { console.error('FAIL:', msg); failed += 1; }
}

function resetSeed(seed) {
  if (sandbox.window.Cards && sandbox.window.Cards.rng) sandbox.window.Cards.rng.setSeed(seed || 42);
  if (sandbox.window.GTOCache) sandbox.window.GTOCache.clear();
}

function analyzeFromSpec(spec, seed) {
  resetSeed(seed);
  const raw = PTHandAnalysis.specToRawHand(spec);
  resetSeed(seed);
  return Importer.analyzeHand(raw);
}

function assertEvalShape(hand, label) {
  assert(!!hand, label + ': analyzeHand devolvió mano');
  assert(Array.isArray(hand.decisions) && hand.decisions.length >= 1,
    label + ': ≥1 decisión (got ' + ((hand.decisions && hand.decisions.length) || 0) + ')');
  hand.decisions.forEach(function (d, i) {
    assert(d && d.street && d.chosen, label + ' d' + i + ': street/chosen');
    assert(typeof d.evLoss === 'number' && isFinite(d.evLoss),
      label + ' d' + i + ': evLoss numérico (' + d.evLoss + ')');
    assert(d.class, label + ' d' + i + ': class presente');
    assert(d.gto && typeof d.gto === 'object', label + ' d' + i + ': estrategia gto');
  });
  assert(typeof hand.totalEvLoss === 'number' && isFinite(hand.totalEvLoss),
    label + ': totalEvLoss finito (' + hand.totalEvLoss + ')');
}

function openRaiseFreq(hand) {
  const pf = (hand.decisions || []).find(function (d) {
    return d.street === 'preflop' && (d.facing === 'RFI' || d.spotKind === 'rfi' || /RFI|open/i.test(d.spot || ''));
  });
  if (!pf || !pf.gto) return null;
  const g = pf.gto;
  const raise = Number(g.raise != null ? g.raise : (g.Raise != null ? g.Raise : 0)) || 0;
  return raise;
}

// --- 1) Cash deep control (no torneo) ---
{
  const cash = analyzeFromSpec({
    format: '6max',
    formatHub: 'cash',
    heroPos: 'CO',
    heroCards: ['As', 'Kd'],
    heroStackBB: 100,
    playersSeated: 6,
    villains: [{ pos: 'BB', cards: ['7c', '2d'], stackBB: 100 }],
    board: [],
    actions: {
      preflop: [
        { pos: 'UTG', action: 'fold' },
        { pos: 'HJ', action: 'fold' },
        { pos: 'CO', action: 'raise', amountBB: 2.5 },
        { pos: 'BTN', action: 'fold' },
        { pos: 'SB', action: 'fold' },
        { pos: 'BB', action: 'fold' }
      ],
      flop: [], turn: [], river: []
    }
  }, 11);
  assertEvalShape(cash, 'cash100');
  const ctxCash = RR.inferFromHand(cash);
  assert(ctxCash && !ctxCash.isTournament, 'cash: isTournament=false');
  assert(Math.abs((ctxCash.stackBB || 0) - 100) < 1 || ctxCash.stackDepth === 'standard',
    'cash: stack ~100 / standard');
}

// --- 2) MTT HU short / PKO: contexto + evaluación ---
{
  const hu = analyzeFromSpec({
    format: '6max',
    formatHub: 'mtt',
    tournamentType: 'pko',
    mttPhase: 'short',
    playersSeated: 2,
    heroPos: 'BTN',
    heroCards: ['As', 'Kd'],
    heroStackBB: 18,
    anteBB: 0.125,
    villains: [{ pos: 'BB', cards: ['Qs', 'Qd'], stackBB: 22 }],
    board: [],
    actions: {
      preflop: [
        { pos: 'BTN', action: 'raise', amountBB: 2.5 },
        { pos: 'BB', action: 'call' }
      ],
      flop: [], turn: [], river: []
    }
  }, 22);
  assertEvalShape(hu, 'mtt-hu-pko');
  assert(hu.playersSeated === 2, 'HU seats meta=2');
  assert(hu.seats && hu.seats.length === 2, 'HU raw seats=2 (no inventa 6)');
  assert(hu.tournamentType === 'pko', 'HU tournamentType pko');
  assert(hu.mttPhase === 'short' || hu.mttPhase === 'push' || hu.mttPhase === 'mid',
    'HU fase shortish: ' + hu.mttPhase);
  const ctxHu = RR.inferFromHand(hu);
  assert(ctxHu && ctxHu.isTournament, 'HU: isTournament');
  assert(ctxHu.formatHub === 'mtt' || ctxHu.isMtt, 'HU: hub mtt');
  assert(hu.effStackBB != null && hu.effStackBB <= 18.1,
    'HU: effStack ≤ hero 18: ' + hu.effStackBB);
  assert(hu.stackDepthBB != null && hu.stackDepthBB <= 18.1,
    'HU: stackDepthBB ≤ 18: ' + hu.stackDepthBB);
  assert(ctxHu.effectivePhase === 'short' || ctxHu.effectivePhase === 'push' || ctxHu.stackBB <= 32,
    'HU: fase/stack corto en registry: phase=' + ctxHu.effectivePhase + ' stackBB=' + ctxHu.stackBB);
  // Replay evaluateSpot desde decisión guardada
  const d0 = hu.decisions[0];
  assert(!!Importer.reEvaluateDecision || true, 'reEvaluate opcional');
  if (typeof Importer.rebuildDecision === 'function') {
    /* no-op */
  }
  const rebuilt = GTO.evaluateSpot({
    spotKind: d0.spotKind || 'rfi',
    position: 'BTN',
    street: 'preflop',
    board: [],
    heroCards: ['As', 'Kd'],
    handCode: hu.heroCode || 'AKo',
    potBB: d0.potBB || 1.5,
    toCallBB: d0.toCallBB || 0,
    chosenAction: d0.chosen,
    availableActions: d0.options || ['fold', 'raise'],
    stackDepth: ctxHu.stackBB,
    gameType: 'mtt',
    mttPhase: ctxHu.effectivePhase || 'short'
  });
  assert(rebuilt && rebuilt.evaluation && typeof rebuilt.evaluation.evLoss === 'number',
    'replay evaluateSpot MTT HU ok');
}

// --- 3) Spin 3-max mid vs cash: charts distintos en open BTN ---
{
  const spinSpec = {
    format: '6max',
    formatHub: 'spin',
    tournamentType: 'vanilla',
    mttPhase: 'mid',
    playersSeated: 3,
    heroPos: 'BTN',
    heroCards: ['Ks', 'Jd'],
    heroStackBB: 18,
    villains: [
      { pos: 'SB', stackBB: 20 },
      { pos: 'BB', stackBB: 22 }
    ],
    board: [],
    actions: {
      preflop: [
        { pos: 'BTN', action: 'raise', amountBB: 2.5 },
        { pos: 'SB', action: 'fold' },
        { pos: 'BB', action: 'fold' }
      ],
      flop: [], turn: [], river: []
    }
  };
  const spin = analyzeFromSpec(spinSpec, 33);
  assertEvalShape(spin, 'spin3');
  const ctxSpin = RR.inferFromHand(spin);
  assert(ctxSpin && ctxSpin.isTournament && ctxSpin.isSpin, 'spin: isSpin/tournament');
  assert(spin.playersSeated === 3, 'spin playersSeated=3');

  const cashSame = analyzeFromSpec(Object.assign({}, spinSpec, {
    formatHub: 'cash',
    tournamentType: 'unknown',
    mttPhase: 'auto',
    heroStackBB: 100,
    villains: [
      { pos: 'SB', stackBB: 100 },
      { pos: 'BB', stackBB: 100 }
    ],
    playersSeated: 6,
    actions: {
      preflop: [
        { pos: 'UTG', action: 'fold' },
        { pos: 'HJ', action: 'fold' },
        { pos: 'CO', action: 'fold' },
        { pos: 'BTN', action: 'raise', amountBB: 2.5 },
        { pos: 'SB', action: 'fold' },
        { pos: 'BB', action: 'fold' }
      ],
      flop: [], turn: [], river: []
    }
  }), 33);
  assertEvalShape(cashSame, 'cash-control-KJo');
  const openSpin = RR.getOpenRaiseRow('BTN', ctxSpin);
  const openCash = RR.getOpenRaiseRow('BTN', RR.inferFromHand(cashSame));
  assert(!!openSpin && !!openCash, 'filas open BTN existen');
  assert(JSON.stringify(openSpin) !== JSON.stringify(openCash),
    'spin mid ≠ cash deep en open BTN (charts torneo)');
}

// --- 4) MTT 4-max multiway + stacks distintos: effStack = min ---
{
  const mw = analyzeFromSpec({
    format: '6max',
    formatHub: 'mtt',
    tournamentType: 'vanilla',
    mttPhase: 'mid',
    playersSeated: 4,
    heroPos: 'CO',
    heroCards: ['Ah', 'Kh'],
    heroStackBB: 35,
    anteBB: 0.1,
    villains: [
      { pos: 'BTN', stackBB: 40 },
      { pos: 'SB', stackBB: 12 },
      { pos: 'BB', stackBB: 28 }
    ],
    board: ['Qc', '8h', '2d'],
    actions: {
      preflop: [
        { pos: 'CO', action: 'raise', amountBB: 2.5 },
        { pos: 'BTN', action: 'fold' },
        { pos: 'SB', action: 'call' },
        { pos: 'BB', action: 'call' }
      ],
      flop: [
        { pos: 'SB', action: 'check' },
        { pos: 'BB', action: 'check' },
        { pos: 'CO', action: 'bet', amountBB: 4 },
        { pos: 'SB', action: 'fold' },
        { pos: 'BB', action: 'call' }
      ],
      turn: [],
      river: []
    }
  }, 44);
  assertEvalShape(mw, 'mtt-4max');
  assert(mw.seats && mw.seats.length === 4, '4-max seats=4');
  assert(mw.effStackBB != null && mw.effStackBB <= 12.1,
    'effStack ≤ short SB 12bb: ' + mw.effStackBB);
  const flopDecs = (mw.decisions || []).filter(function (d) { return d.street === 'flop'; });
  assert(flopDecs.length >= 1, '4-max evalúa flop');
  const ctxMw = RR.inferFromHand(mw);
  assert(ctxMw.isTournament, '4-max tournament ctx');
}

// --- 5) Bubble / near-money: evaluación sigue válida ---
{
  const bubble = analyzeFromSpec({
    format: '6max',
    formatHub: 'mtt',
    tournamentType: 'vanilla',
    mttPhase: 'bubble',
    playersSeated: 6,
    playersLeft: 13,
    placesPaid: 12,
    heroPos: 'BTN',
    heroCards: ['7h', '7d'],
    heroStackBB: 18,
    anteBB: 0.15,
    villains: [
      { pos: 'SB', stackBB: 25 },
      { pos: 'BB', stackBB: 30 },
      { pos: 'UTG', stackBB: 20 },
      { pos: 'HJ', stackBB: 22 },
      { pos: 'CO', stackBB: 15 }
    ],
    board: [],
    actions: {
      preflop: [
        { pos: 'UTG', action: 'fold' },
        { pos: 'HJ', action: 'fold' },
        { pos: 'CO', action: 'fold' },
        { pos: 'BTN', action: 'raise', amountBB: 2.2 },
        { pos: 'SB', action: 'fold' },
        { pos: 'BB', action: 'fold' }
      ],
      flop: [], turn: [], river: []
    }
  }, 55);
  assertEvalShape(bubble, 'mtt-bubble');
  assert(bubble.mttPhase === 'bubble', 'bubble phase preservada');
  const ctxB = RR.inferFromHand(bubble);
  assert(ctxB.isTournament, 'bubble tournament');
}

// --- 6) Texto IA sparse → fillMissing → eval coherente ---
{
  const sparse = PTHandAnalysis.normalizeAiSpec({
    format: '6max',
    formatHub: 'mtt',
    tournamentType: 'unknown',
    mttPhase: 'auto',
    heroPos: 'CO',
    heroCards: ['Ah', 'Kh'],
    villains: [{ pos: 'BB', cards: [] }],
    board: [],
    actions: {
      preflop: [
        { pos: 'CO', action: 'raise', amountBB: 2.5 },
        { pos: 'BB', action: 'fold' }
      ],
      flop: [], turn: [], river: []
    }
  });
  PTHandAnalysis.fillMissingSpecDefaults(sparse, 'MTT PKO mid CO AhKh open, BB fold');
  assert(Number(sparse.heroStackBB) > 0, 'fill hero stack');
  assert(sparse.tournamentType === 'pko', 'fill PKO');
  resetSeed(66);
  const fromText = PTHandAnalysis.buildAnalyzedHand(sparse, 'text');
  assertEvalShape(fromText, 'text-autofill');
  assert(fromText.formatHub === 'mtt' || fromText.gameKind === 'mtt', 'text hub mtt');
}

// --- 7) Determinismo: misma mano → mismo totalEvLoss ---
{
  const spec = {
    format: '6max',
    formatHub: 'mtt',
    tournamentType: 'vanilla',
    mttPhase: 'push',
    playersSeated: 3,
    heroPos: 'BTN',
    heroCards: ['As', 'Ts'],
    heroStackBB: 10,
    villains: [
      { pos: 'SB', stackBB: 12 },
      { pos: 'BB', stackBB: 11 }
    ],
    board: [],
    actions: {
      preflop: [
        { pos: 'BTN', action: 'raise', amountBB: 10 },
        { pos: 'SB', action: 'fold' },
        { pos: 'BB', action: 'fold' }
      ],
      flop: [], turn: [], river: []
    }
  };
  const a = analyzeFromSpec(spec, 77);
  const b = analyzeFromSpec(spec, 77);
  assertEvalShape(a, 'push-a');
  assert(Math.abs((a.totalEvLoss || 0) - (b.totalEvLoss || 0)) < 1e-9,
    'determinismo totalEvLoss: ' + a.totalEvLoss + ' vs ' + b.totalEvLoss);
  assert(a.decisions.length === b.decisions.length, 'determinismo n decisiones');
}

if (failed) {
  console.error('\n*** test-hand-eval-tournament-context FALLÓ (' + failed + ') ***');
  process.exit(1);
}
console.log('\n*** test-hand-eval-tournament-context OK ***');
