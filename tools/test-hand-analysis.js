/* Test: análisis de manos manual (specToRawHand -> analyzeHand) e inyección de cartas fijas en el entrenador. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON };
sandbox.global = sandbox;
vm.createContext(sandbox);

const scripts = [
  'cards.js',
  'engine/cache.js',
  'engine/ranges/notation.js',
  'engine/ranges/data.js',
  'engine/ranges/extended.js',
  'engine/ranges/variants.js',
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
  'engine/solver/SolverProvider.js',
  'engine/scoring/classifier.js',
  'engine/scoring/evLoss.js',
  'engine/scoring/scoring.js',
  'engine/scoring/errors.js',
  'engine/explanations/rules.js',
  'engine/solver/LocalSolverProvider.js',
  'engine/evaluateSpot.js',
  'engine/villainProfiles.js',
  'engine/villainPreflop.js',
  'engine/stacks.js',
  'play-config.js',
  'ranges.js',
  'range-matrix.js',
  'engine.js',
  'import/hhUtils.js',
  'import/formatDetector.js',
  'import/parsers/pokerstars.js',
  'import/parsers/winamax.js',
  'import.js',
  'hand-analysis.js'
];

scripts.forEach((f) => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
});

const { Engine, Importer, PTHandAnalysis } = sandbox.window;
let failed = false;
function assert(cond, msg) {
  if (cond) console.log('OK:', msg);
  else { console.error('FAIL:', msg); failed = true; }
}

// --- 1) Spec manual -> mano analizada ---
const spec = {
  format: '6max',
  heroPos: 'CO',
  heroCards: ['As', 'Kd'],
  villains: [{ pos: 'BB', cards: ['Qs', 'Qd'] }],
  board: ['9c', 'Tc', '8c', '6s', '2h'],
  actions: {
    preflop: [
      { pos: 'UTG', action: 'fold' },
      { pos: 'HJ', action: 'fold' },
      { pos: 'CO', action: 'raise', amountBB: 2.5 },
      { pos: 'BTN', action: 'fold' },
      { pos: 'SB', action: 'fold' },
      { pos: 'BB', action: 'call' }
    ],
    flop: [
      { pos: 'BB', action: 'check' },
      { pos: 'CO', action: 'bet', amountBB: 3 },
      { pos: 'BB', action: 'call' }
    ],
    turn: [
      { pos: 'BB', action: 'check' },
      { pos: 'CO', action: 'check' }
    ],
    river: [
      { pos: 'BB', action: 'bet', amountBB: 8 },
      { pos: 'CO', action: 'call' }
    ]
  },
  _source: 'manual'
};

const raw = PTHandAnalysis.specToRawHand(spec);
assert(raw.hero === 'CO', 'hero = CO');
assert(raw.positions.CO === 'CO', 'positions map ok');
assert(raw.streets.preflop.length === 6, 'preflop 6 acciones');

const analyzed = PTHandAnalysis.buildAnalyzedHand(spec, 'manual');
assert(analyzed.heroPos === 'CO', 'analyzed heroPos CO');
assert(analyzed.heroCode === 'AKo' || analyzed.heroCode === 'AKs', 'heroCode ~ AK: ' + analyzed.heroCode);
assert(Array.isArray(analyzed.decisions) && analyzed.decisions.length >= 3, 'decisiones >=3: ' + (analyzed.decisions || []).length);
const pf = analyzed.decisions.find((d) => d.street === 'preflop');
assert(pf && pf.spotKind === 'RFI', 'preflop spot RFI: ' + (pf && pf.spotKind));
assert(analyzed.summary && analyzed.summary.length > 0, 'timeline generado');
assert(analyzed.boardAll.length === 5, 'board 5 cartas');

// --- 2) toTrainerConfig + Engine.newHand con cartas fijas ---
const cfg = PTHandAnalysis.toTrainerConfig(analyzed, 'pro', 'crimson');
assert(cfg.force && cfg.force.forceDeal, 'force.forceDeal presente');
assert(cfg.playConfig.villainLevel === 'pro', 'villainLevel pro');
assert(cfg.playConfig.tableTheme === 'crimson', 'tableTheme crimson');

const trainerHand = Engine.newHand(cfg.force, cfg.playConfig);
assert(trainerHand.hero.cards.join('') === 'AsKd', 'entrenador héroe = AsKd: ' + trainerHand.hero.cards.join(''));
const predealBoard = (trainerHand._predeal.board || []).slice(0, 5).join(' ');
assert(predealBoard.indexOf('9c') === 0, 'entrenador board comienza en 9c: ' + predealBoard);
// villano BB debería tener QsQd inyectado en el asiento del villano
const vSeat = (trainerHand._predeal && trainerHand._predeal.villainPos) || (trainerHand.villain && trainerHand.villain.pos);
const vCards = vSeat && trainerHand.table.holeCards[vSeat] ? trainerHand.table.holeCards[vSeat].join('') : '';
assert(vCards === 'QsQd', 'villano inyectado (' + vSeat + '): ' + vCards);

// unicidad de cartas en la mesa
const all = [];
Object.keys(trainerHand.table.holeCards).forEach((p) => { (trainerHand.table.holeCards[p] || []).forEach((c) => all.push(c)); });
(trainerHand._predeal.board || []).forEach((c) => all.push(c));
const uniq = new Set(all);
assert(uniq.size === all.length, 'sin cartas duplicadas en la mesa (' + all.length + ' cartas)');

// --- 3) vsRFI scenario mapping ---
const spec2 = {
  format: '6max', heroPos: 'BB', heroCards: ['7h', '7s'],
  villains: [{ pos: 'CO', cards: [] }],
  board: [],
  actions: { preflop: [
    { pos: 'UTG', action: 'fold' }, { pos: 'HJ', action: 'fold' },
    { pos: 'CO', action: 'raise', amountBB: 2.5 }, { pos: 'BTN', action: 'fold' },
    { pos: 'SB', action: 'fold' }, { pos: 'BB', action: 'call' }
  ], flop: [], turn: [], river: [] },
  _source: 'manual'
};
const an2 = PTHandAnalysis.buildAnalyzedHand(spec2, 'manual');
const pf2 = an2.decisions.find((d) => d.street === 'preflop');
assert(pf2 && pf2.spotKind === 'vsRFI', 'BB vs CO spot vsRFI: ' + (pf2 && pf2.spotKind));
const cfg2 = PTHandAnalysis.toTrainerConfig(an2, 'fish', 'midnight');
const th2 = Engine.newHand(cfg2.force, cfg2.playConfig);
assert(th2.hero.cards.join('') === '7h7s', 'vsRFI héroe = 7h7s: ' + th2.hero.cards.join(''));

if (failed) { console.error('\n*** TEST FALLÓ ***'); process.exit(1); }
console.log('\n*** TEST HAND-ANALYSIS OK ***');
