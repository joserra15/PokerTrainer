/* Regresión: BB vs SB heads-up debe ser IP (probe), no OOP/donk; sin falso SOLVER ERROR. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON, parseFloat, parseInt, isNaN };
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
  'import.js'
];

scripts.forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox, { filename: f });
});

const { Importer, GTOStreetValidation: SV, GTOSpotKey } = sandbox.window;
let failed = false;
function assert(cond, msg) {
  if (cond) console.log('OK:', msg);
  else { console.error('FAIL:', msg); failed = true; }
}

const hh = fs.readFileSync(path.join(__dirname, 'fixtures', 'bug-bb-vs-sb-45.txt'), 'utf8');
const parsed = Importer.parseSession(hh, 'bug-bb-vs-sb-45.txt');
assert(parsed.hands.length === 1, 'parsea 1 mano');
assert(parsed.hero === 'KazeDj', 'héroe = KazeDj (BB)');

const analyzed = Importer.analyzeHand(parsed.hands[0]);
const turn = analyzed.decisions.find((d) => d.street === 'turn' && d.toCallBB === 0);
const river = analyzed.decisions.find((d) => d.street === 'river' && d.toCallBB === 0);
assert(!!turn && !!river, 'hay decisiones probe turn y river');
assert(turn.inPosition === true, 'BB vs SB turn: inPosition=true (era false/OOP)');
assert(river.inPosition === true, 'BB vs SB river: inPosition=true');
assert((turn.explanation || '').indexOf('en posición') >= 0, 'explicación turn: en posición');
assert((turn.explanation || '').indexOf('fuera de posición') < 0, 'explicación turn: no OOP');
assert((turn.explanation || '').indexOf('probe') >= 0, 'explicación turn: probe (no donk)');
assert((turn.explanation || '').indexOf('donk') < 0, 'explicación turn: sin donk');
assert(turn.best === 'check', 'turn best=check (líder GTO), no bet residual: ' + turn.best);
assert(turn.chosen === 'bet_33', 'turn chosen=bet_33');
assert((river.explanation || '').indexOf('probe') >= 0, 'explicación river: probe');
assert(river.best === 'check', 'river best=check');
assert(!(turn.renderAlert || '').includes('[SOLVER] ERROR'), 'sin falso SOLVER ERROR en turn');
assert(!(river.renderAlert || '').includes('[SOLVER] ERROR'), 'sin falso SOLVER ERROR en river');

const spot = GTOSpotKey.buildSpotKey({
  street: 'turn', potBB: 8, toCallBB: 0, initiative: 'caller', inPosition: true,
  board: ['9c', '7s', '3s', '7c'], position: 'BB', vsPosition: 'SB'
});
assert(spot.leadType === 'probe', 'spotKey BB IP caller → probe');
assert(spot.leadType !== 'donk', 'spotKey BB IP caller ≠ donk');

// Sanity: check-down 90%/90% en board coordinado es benigno (no clon de caché)
const benign = SV.sanityCheckSolver([
  { street: 'turn', gto: { check: 0.90, bet_33: 0.05, bet_66: 0.03, bet_100: 0.02 }, board: ['9c', '7s', '3s', '7c'] },
  { street: 'river', gto: { check: 0.90, bet_33: 0.04, bet_66: 0.04, bet_100: 0.03 }, board: ['9c', '7s', '3s', '7c', 'Tc'] }
], { turn: ['9c', '7s', '3s', '7c'], river: ['9c', '7s', '3s', '7c', 'Tc'] }, 1);
assert(benign.ok === true, 'sanity: check-down 90%/90% coordinado = OK (benigno)');

// Sanity: frecuencias value idénticas sí deben fallar
const clone = SV.sanityCheckSolver([
  { street: 'turn', gto: { check: 0.40, bet_33: 0.30, bet_66: 0.20, bet_100: 0.10 }, board: ['9c', '7s', '3s', '7c'] },
  { street: 'river', gto: { check: 0.40, bet_33: 0.30, bet_66: 0.20, bet_100: 0.10 }, board: ['9c', '7s', '3s', '7c', 'Tc'] }
], { turn: ['9c', '7s', '3s', '7c'], river: ['9c', '7s', '3s', '7c', 'Tc'] }, 1);
assert(clone.ok === false, 'sanity: freqs value clonadas = FAIL');

// BB vs BTN sigue OOP
const bbVsBtnHh = [
  "PokerStars Hand #1: Hold'em No Limit (€0.02/€0.05) - 2026/07/17 12:00:00 CET",
  "Table 'X' 6-max Seat #1 is the button",
  'Seat 1: Villain (€5 in chips)',
  'Seat 2: SBPlayer (€5 in chips)',
  'Seat 3: HeroBag (€5 in chips)',
  'SBPlayer: posts small blind €0.02',
  'HeroBag: posts big blind €0.05',
  '*** HOLE CARDS ***',
  'Dealt to HeroBag [Ah Kd]',
  'Villain: raises €0.10 to €0.15',
  'SBPlayer: folds',
  'HeroBag: calls €0.10',
  '*** FLOP *** [2c 2d 7h]',
  'HeroBag: checks',
  'Villain: bets €0.20',
  'HeroBag: folds',
  '*** SUMMARY ***',
  'Total pot €0.47 | Rake €0.00',
  'Board [2c 2d 7h]',
  'Seat 1: Villain (button) collected (€0.47)',
  'Seat 2: SBPlayer (small blind) folded before Flop',
  'Seat 3: HeroBag (big blind) folded on the Flop'
].join('\n');
const bbBtnParsed = Importer.parseSession(bbVsBtnHh, 'bb-vs-btn.txt');
assert(bbBtnParsed.hands[0].positions.HeroBag === 'BB', 'HeroBag es BB');
assert(bbBtnParsed.hands[0].positions.Villain === 'BTN', 'Villain es BTN');
const bbBtn = Importer.analyzeHand(bbBtnParsed.hands[0]);
const flopBb = bbBtn.decisions.find((d) => d.street === 'flop');
assert(flopBb && flopBb.inPosition === false, 'BB vs BTN sigue OOP');

if (failed) { console.error('\n*** TEST BB-VS-SB FALLÓ ***'); process.exit(1); }
console.log('\n*** TEST BB-VS-SB OK ***');
