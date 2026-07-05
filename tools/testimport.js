/* Prueba del importador con ficheros ES y EN de PokerStars. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON, parseFloat, parseInt, isNaN };
sandbox.global = sandbox;
vm.createContext(sandbox);

const importChain = [
  'import/hhUtils.js',
  'import/formatDetector.js',
  'import/parsers/pokerstars.js',
  'import/parsers/winamax.js',
  'import.js'
];

const scripts = [
  'cards.js', 'engine/cache.js', 'engine/ranges/notation.js', 'engine/ranges/data.js',
  'engine/ranges/weights.js', 'engine/ranges/villainTracking.js', 'engine/handStrength.js',
  'engine/equity/madeHand.js', 'engine/math/potMath.js', 'engine/math/evMath.js', 'engine/equity/monteCarlo.js',
  'engine/solver/boardCluster.js', 'engine/solver/facingBet.js', 'engine/solver/spotKey.js',
  'engine/solver/strategyTables.js', 'engine/solver/SolverProvider.js',
  'engine/scoring/classifier.js', 'engine/scoring/evLoss.js', 'engine/scoring/scoring.js',
  'engine/scoring/errors.js', 'engine/explanations/rules.js',
  'engine/solver/LocalSolverProvider.js', 'engine/evaluateSpot.js',
  'ranges.js', 'engine.js'
].concat(importChain);

scripts.forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox, { filename: f });
});
const { Importer } = sandbox.window;

function runFile(relPath, label) {
  const txt = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  const meta = Importer.detectSessionFormat(txt);
  const parsed = Importer.parseSession(txt, path.basename(relPath));
  const session = Importer.buildSession(parsed, path.basename(relPath));
  console.log(label + ':', session.hands.length, 'manos | acierto:', session.stats.accuracy + '%',
    '| formato:', meta ? meta.platformLabel + ' ' + meta.localeLabel : '?',
    '| héroe:', session.hero);
  if (!session.hero || !session.hands.length) {
    console.error('FAIL', label);
    process.exit(1);
  }
  if (meta && meta.locale === 'en' && label.indexOf('EN') >= 0) {
    const h = parsed.hands[0];
    if (!h || h.heroCards.length !== 2) {
      console.error('FAIL EN parse hero cards');
      process.exit(1);
    }
  }
}

runFile('tools/fixtures/Poker56.txt', 'ES Poker56');
const enPath = fs.existsSync(path.join(__dirname, '..', 'sesiones', 'PokerEN1.txt'))
  ? 'sesiones/PokerEN1.txt'
  : 'tools/fixtures/PokerEN-sample.txt';
runFile(enPath, 'EN PokerStars');
const wmPath = fs.existsSync(path.join(__dirname, '..', 'sesiones', '20260703_Paris 06_real_holdem_no-limit.txt'))
  ? 'sesiones/20260703_Paris 06_real_holdem_no-limit.txt'
  : 'tools/fixtures/Winamax-sample.txt';
runFile(wmPath, 'Winamax');
console.log('*** IMPORTADOR OK (PokerStars ES/EN + Winamax) ***');
