/* Debug hand 261242286721 — 77 on paired board */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON };
sandbox.global = sandbox;
vm.createContext(sandbox);

const scripts = [
  'cards.js', 'engine/cache.js', 'engine/ranges/notation.js', 'engine/ranges/data.js',
  'engine/ranges/weights.js', 'engine/ranges/villainTracking.js', 'engine/handStrength.js',
  'engine/equity/madeHand.js', 'engine/math/potMath.js', 'engine/math/evMath.js',
  'engine/equity/monteCarlo.js', 'engine/equity/handRank.js', 'engine/equity/blockers.js',
  'engine/solver/boardCluster.js', 'engine/validation/boardTextureShift.js',
  'engine/validation/villainCallAudit.js', 'engine/validation/streetStrategy.js',
  'engine/solver/rangeAdvantage.js', 'engine/solver/riverShoveNode.js', 'engine/solver/probeEV.js',
  'engine/solver/villainStrategyAdjust.js', 'engine/solver/preflopSolver.js', 'engine/solver/facingBet.js',
  'engine/solver/spotKey.js', 'engine/solver/strategyTables.js', 'engine/solver/SolverProvider.js',
  'engine/scoring/classifier.js', 'engine/scoring/evLoss.js', 'engine/scoring/scoring.js',
  'engine/scoring/errors.js', 'engine/explanations/rules.js', 'engine/solver/LocalSolverProvider.js',
  'engine/evaluateSpot.js', 'engine/villainProfiles.js', 'ranges.js', 'engine.js',
  'import/hhUtils.js', 'import/formatDetector.js', 'import/parsers/pokerstars.js', 'import/parsers/winamax.js', 'import.js'
];

scripts.forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox, { filename: f });
});

const Importer = sandbox.window.Importer;
const GTO = sandbox.window.GTO;
const Cards = sandbox.window.Cards;

const handText = `Mano n.º 261242286721 de Zoom de PokerStars:  Hold'em No Limit (0.02 €/0.05 €) - 25-06-2026 1:14:48 CET
Mesa "Asterope" 6-max El asiento n.º 1 es el botón
Asiento 1: Fvieira1984 (4.64 € en fichas)
Asiento 2: KazeDj (5 € en fichas)
Asiento 3: Fyfouse78 (5.42 € en fichas)
Asiento 4: sramaverick2 (12.89 € en fichas)
Asiento 5: rafastary8 (5.50 € en fichas)
Asiento 6: juankrulez (3 € en fichas)
KazeDj: pone la ciega pequeña 0.02 €
Fyfouse78: pone la ciega grande 0.05 €
Repartidas a KazeDj [7s 7h]
sramaverick2: se retira
rafastary8: se retira
juankrulez: se retira
Fvieira1984: se retira
KazeDj: sube 0.10 € a 0.15 €
Fyfouse78: iguala 0.10 €
*** FLOP *** [3c 3s 5d]
KazeDj: apuesta 0.21 €
Fyfouse78: iguala 0.21 €
*** TURN *** [3c 3s 5d] [Ks]
KazeDj: pasa
Fyfouse78: apuesta 0.45 €
KazeDj: iguala 0.45 €
*** RIVER *** [3c 3s 5d Ks] [Kh]
KazeDj: pasa
Fyfouse78: pasa
*** SHOW DOWN ***
KazeDj: muestra [7s 7h]
Fyfouse78: muestra [5s 5h]
Fyfouse78 se lleva 1.54 € del bote`;

const parsed = Importer.parseHand(handText);
const analyzed = Importer.analyzeHand(parsed);
const board = analyzed.board;
console.log('Board:', board.join(' '));
console.log('Hero hand eval river:', Cards.evaluate(['7s', '7h'].concat(board)).name);

analyzed.decisions.forEach((d, i) => {
  console.log('\n---', i, d.street, d.chosen, '---');
  console.log('  class:', d.class, 'best:', d.best, 'freq%:', Math.round((d.frequency || 0) * 100));
  console.log('  evLoss:', d.evLoss, 'evErr:', d.evErroneous);
  console.log('  actionEV:', d.actionEV, 'bestEV:', d.bestEV, 'bestAction:', d.best);
  console.log('  heroEquity%:', d.heroEquity);
  if (d.gto) console.log('  gto:', JSON.stringify(Object.fromEntries(Object.entries(d.gto).map(([k,v]) => [k, Math.round(v*100)]))));
  if (d.villainRange) console.log('  villainRange:', d.villainRange.slice(0, 60));
});

// Direct equity check turn call spot
const turnBoard = ['3c', '3s', '5d', 'Ks'];
const VT = sandbox.window.GTOVillainTracking;
const range = VT.estimateRangeFromActions(
  parsed.streets.turn.slice(0, parsed.streets.turn.findIndex(a => a.player === 'KazeDj' && a.type === 'call') + 1),
  'KazeDj', 0.05, 8, turnBoard, '99+, AJs+, KQs, QJs, JTs, AQo, AKo, TT'
);
console.log('\nTurn villain range sample:', range);
const eqTurn = GTO.Equity.equityVsRange(['7s', '7h'], turnBoard, range, 800, { street: 'turn', facingBet: true });
console.log('Turn eq vs narrowed range:', Math.round(eqTurn * 10000) / 100 + '%');

const riverBoard = ['3c', '3s', '5d', 'Ks', 'Kh'];
const eqRiver = GTO.Equity.equityVsRange(['7s', '7h'], riverBoard, range, 800, { street: 'river', facingBet: false });
console.log('River eq vs same range (no bet):', Math.round(eqRiver * 10000) / 100 + '%');
