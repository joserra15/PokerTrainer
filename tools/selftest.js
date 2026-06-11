/* Self-test en Node: carga los módulos con un shim de window y simula manos. */
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
  'engine/ranges/weights.js',
  'engine/ranges/villainTracking.js',
  'engine/handStrength.js',
  'engine/equity/madeHand.js',
  'engine/math/potMath.js',
  'engine/equity/monteCarlo.js',
  'engine/solver/boardCluster.js',
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
  'ranges.js',
  'engine.js'
];

scripts.forEach((f) => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
});

const { Cards, Ranges, Engine, GTO } = sandbox.window;

function ev(cards) { return Cards.evaluate(cards).name; }
console.log('Royal flush:', ev(['As', 'Ks', 'Qs', 'Js', 'Ts', '2c', '3d']));
console.log('Full:', ev(['As', 'Ah', 'Ad', 'Ks', 'Kh', '2c', '3d']));
console.log('22+ =>', Ranges.expand('22+').length, 'manos');

const bt = GTO.BoardCluster.classifyBoard(['As', 'Kh', '7d']);
console.log('Board AsKh7d =>', bt);

const spot = GTO.evaluateSpot({
  spotKind: 'RFI', position: 'BTN', street: 'preflop',
  handCode: 'AA', heroCards: ['As', 'Ah'], chosenAction: 'raise', potBB: 1.5,
  availableActions: ['fold', 'raise'], initiative: 'none'
});
console.log('evaluateSpot RFI AA raise:', spot.evaluation.class);

const PM = sandbox.window.GTOPotMath;
console.log('potBBFromEuro prior 37 + street 1.30€ =>', PM.potBBFromEuro(37, 1.30, 0.05), '(bote total calle; display facing bet = 37.00)');
console.log('formatBB ugly =>', PM.formatBB(62.39999999999999));

const eqTurn = GTO.Equity.equityVsRange(
  ['Kd', 'Ac'], ['Tc', 'Qs', '7c', '6c'],
  GTO.Ranges.data.RANGE_FACING_TURN_RAISE, 800, { street: 'turn' }
);
const eqFlop = GTO.Equity.equityVsRange(
  ['Kd', 'Ac'], ['Tc', 'Qs', '7c'],
  GTO.Ranges.data.RANGE_FACING_LARGE_BET_WET, 800, { street: 'flop' }
);
console.log('AKo flop vs large bet range eq ~', Math.round(eqFlop * 100) + '% (expect ~25-35%)');
console.log('AKo turn nut FD vs tight raise range eq ~', Math.round(eqTurn * 100) + '% (expect ~15-35%)');

const eqRiverNonNut = GTO.Equity.equityVsRange(
  ['Jc', '9c'], ['5c', '9s', 'Kc', 'Qc', 'As'],
  'JJ+, AQs+, AKo, TT, AJs, KQs, A2s-AKs', 800,
  { street: 'river', facingBet: true }
);
console.log('J9cc river vs bet (non-nut flush) eq ~', Math.round(eqRiverNonNut * 100) + '% (expect ~0-5%)');

let played = 0, errors = 0, complete = 0;
for (let i = 0; i < 300; i++) {
  try {
    let h = Engine.newHand();
    let guard = 0;
    while (h.stage !== 'complete' && guard < 30) {
      const opts = h.current.options;
      const choice = opts[Math.floor(Math.random() * opts.length)].id;
      Engine.act(h, choice);
      guard++;
    }
    played++;
    if (h.stage === 'complete') complete++;
  } catch (e) {
    errors++;
    if (errors <= 3) console.error('ERROR mano', i, e.message);
  }
}
console.log(`Simulación: ${played} manos, ${complete} completadas, ${errors} errores.`);
console.log(errors === 0 && complete === played ? '\n*** TODO OK ***' : '\n*** REVISAR ***');
