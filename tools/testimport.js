/* Prueba del importador con el fichero real de sesión. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON, parseFloat, parseInt, isNaN };
sandbox.global = sandbox;
vm.createContext(sandbox);
const scripts = [
  'cards.js', 'engine/cache.js', 'engine/ranges/notation.js', 'engine/ranges/data.js',
  'engine/ranges/weights.js', 'engine/ranges/villainTracking.js', 'engine/handStrength.js',
  'engine/equity/madeHand.js', 'engine/equity/monteCarlo.js', 'engine/solver/boardCluster.js',
  'engine/solver/facingBet.js', 'engine/solver/spotKey.js', 'engine/solver/strategyTables.js', 'engine/solver/SolverProvider.js',
  'engine/scoring/classifier.js', 'engine/scoring/evLoss.js', 'engine/scoring/scoring.js',
  'engine/scoring/errors.js', 'engine/explanations/rules.js',
  'engine/solver/LocalSolverProvider.js', 'engine/evaluateSpot.js',
  'ranges.js', 'engine.js', 'import.js'
];
scripts.forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox, { filename: f });
});
const { Importer } = sandbox.window;

const txt = fs.readFileSync(path.join(__dirname, '..', 'sesiones', 'Poker56.txt'), 'utf8');
const parsed = Importer.parseSession(txt, 'Poker56.txt');
const session = Importer.buildSession(parsed, 'Poker56.txt');
console.log('Manos:', session.hands.length, '| acierto:', session.stats.accuracy + '%');
console.log('*** IMPORTADOR OK ***');
