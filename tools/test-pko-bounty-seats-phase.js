/* Regression: asientos PKO con bounty no deben perderse ni marcar fase HU falsa. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = {
  window: {}, console, Math, Date, Set, Map, JSON,
  parseFloat, parseInt, isNaN, Number, String, Array, Object, Boolean, Infinity, NaN, isFinite
};
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const scripts = [
  'cards.js', 'engine/cache.js', 'engine/format/taxonomy.js', 'engine/format/tournament-context.js',
  'engine/ranges/notation.js', 'engine/ranges/data.js',
  'engine/ranges/weights.js', 'engine/ranges/villainTracking.js', 'engine/handStrength.js',
  'engine/equity/madeHand.js', 'engine/math/potMath.js', 'engine/math/evMath.js', 'engine/equity/monteCarlo.js',
  'engine/solver/boardCluster.js', 'engine/solver/facingBet.js', 'engine/solver/spotKey.js',
  'engine/solver/strategyTables.js', 'engine/solver/bluffSpotDetector.js', 'engine/solver/SolverProvider.js',
  'engine/scoring/classifier.js', 'engine/scoring/icmEv.js', 'engine/scoring/evLoss.js', 'engine/scoring/scoring.js',
  'engine/scoring/errors.js', 'engine/explanations/rules.js',
  'engine/solver/LocalSolverProvider.js', 'engine/evaluateSpot.js',
  'engine/ranges/pushFold.js', 'engine/ranges/registry.js',
  'ranges.js', 'engine.js',
  'import/hhUtils.js', 'import/formatDetector.js', 'import/icmLite.js', 'import/populationCompare.js',
  'import/tournamentSummary.js', 'import/parsers/pokerstars.js', 'import/parsers/winamax.js',
  'import/parsers/ggpoker.js', 'import/parsers/eightyeight.js', 'import/parsers/coinpoker.js', 'import.js'
];
scripts.forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox, { filename: f });
});

const { Importer } = sandbox.window;
const TC = sandbox.window.PTTournamentContext;

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
  console.log('OK', msg);
}

const fixture = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'PokerStars-pko-bounty-seats.txt'),
  'utf8'
);
const parsed = Importer.parseSession(fixture, 'PokerStars-pko-bounty-seats.txt');
assert(parsed.hands.length >= 2, 'fixture parsea ≥2 manos');

const pko = parsed.hands.find((h) => String(h.tournamentId) === '4034320632');
assert(!!pko, 'mano PKO presente');
assert((pko.seats && pko.seats.length) === 5, 'PKO: 5 asientos parseados (bounty), got ' + (pko.seats && pko.seats.length));
assert(pko.playersSeated === 5, 'PKO: playersSeated=5, got ' + pko.playersSeated);
assert(pko.mttPhase !== 'hu', 'PKO: fase no es HU en parse, got ' + pko.mttPhase);
assert(pko.tournamentType === 'pko' || /bounty/i.test(fixture), 'PKO detectado o texto bounty');

const analyzed = Importer.analyzeHand(pko);
assert(analyzed.playersSeated === 5, 'analyze: playersSeated=5, got ' + analyzed.playersSeated);
assert(analyzed.mttPhase !== 'hu', 'analyze: fase dominante de mano no HU, got ' + analyzed.mttPhase);
assert(analyzed.seats && analyzed.seats.length === 5, 'analyze: conserva seats');

const session = Importer.buildSession(parsed, 'PokerStars-pko-bounty-seats.txt');
assert(session.stats.mttPhase !== 'hu',
  'sesión: fase dominante ≠ HU (got ' + session.stats.mttPhase + ')');
assert(!session.hands.some((h) => h.mttPhase === 'hu'),
  'ninguna mano de la fixture debe marcarse HU');

// Defensa: playersSeated=0 no debe inventar HU
const emptyCtx = TC.normalize({
  formatHub: 'mtt',
  gameKind: 'mtt',
  tableMax: 6,
  playersSeated: 0,
  mttPhase: 'short',
  heroStackBB: 20
});
assert(emptyCtx.playersSeated === 6, 'seated=0 → fallback tableMax 6, got ' + emptyCtx.playersSeated);
assert(emptyCtx.mttPhase !== 'hu' && emptyCtx.resolvedPhase !== 'hu',
  'seated=0 no fuerza HU, got phase=' + emptyCtx.mttPhase + '/' + emptyCtx.resolvedPhase);

// HU explícito sigue funcionando
const huCtx = TC.normalize({
  formatHub: 'mtt',
  gameKind: 'mtt',
  playersSeated: 2,
  tableMax: 2,
  placesPaid: 1,
  playersLeft: 2,
  mttPhase: 'short',
  heroStackBB: 18
});
assert(huCtx.mttPhase === 'hu' || huCtx.resolvedPhase === 'hu', 'HU WTA real sigue en hu');

console.log('\nOK test-pko-bounty-seats-phase');
