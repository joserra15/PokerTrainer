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

const Made = sandbox.window.GTOEquityMadeHand;
const Strat = sandbox.window.GTOStrategyTables;
const SV = sandbox.window.GTOStreetValidation;
const q9 = ['Qd', '9h'];
const turnBoard = ['5c', '7h', '7d', '8d'];
const riverBoard = turnBoard.concat(['Tc']);
const infoTurn = Made.classifyMadeHand(q9, turnBoard);
const infoRiver = Made.classifyMadeHand(q9, riverBoard);
const turnStrat = Strat.probeStrategy({
  street: 'turn', board: turnBoard, heroCards: q9, potBB: 5.5, toCallBB: 0,
  initiative: 'aggressor', inPosition: true, madeHandInfo: infoTurn, heroEquity: 0.38
});
const riverStrat = Strat.probeStrategy({
  street: 'river', board: riverBoard, heroCards: q9, potBB: 9.14, toCallBB: 0,
  initiative: 'aggressor', inPosition: true, madeHandInfo: infoRiver, heroEquity: 0.22
});
const dup = SV.validateConsecutiveProbeStreets(
  { street: 'turn', gto: turnStrat }, { street: 'river', gto: riverStrat }, 0
);
console.log('Q9 BTN turn check%', Math.round(turnStrat.check * 100), 'river check%', Math.round(riverStrat.check * 100));
console.log('Turn vs River duplicate?', dup.ok ? 'NO (OK)' : 'YES (BUG)');

const benignDup = SV.validateConsecutiveProbeStreets(
  { street: 'flop', gto: { check: 1, bet_33: 0, bet_66: 0, bet_100: 0 }, board: ['7s', '6h', '7d'] },
  { street: 'turn', gto: { check: 1, bet_33: 0, bet_66: 0, bet_100: 0 }, board: ['7s', '6h', '7d', '5d'], handRank: { tier: 'weak' } },
  0
);
console.log('Benign flop-turn check line duplicate?', benignDup.ok ? 'NO ALERT (OK)' : 'ALERT (BUG)');

const nutHero = ['Jd', 'Qd'];
const turnB = ['Qc', 'Td', '7c', '8h'];
const riverB = turnB.concat(['9h']);
const nutRiver = Strat.probeStrategy({
  street: 'river', board: riverB, priorBoard: turnB, heroCards: nutHero, potBB: 9.14,
  toCallBB: 0, initiative: 'caller', inPosition: false,
  madeHandInfo: Made.classifyMadeHand(nutHero, riverB)
});
console.log('Nut straight river check%', Math.round(nutRiver.check * 100), '(expect <=20)');
console.log('Nut straight river bet66%+', Math.round((nutRiver.bet_66 + nutRiver.bet_100) * 100), '(expect >=40)');

const audit = sandbox.window.GTOVillainCallAudit.auditVillainCall({
  action: 'call', street: 'river', board: riverB, betBB: 6.03, potBeforeBB: 9.14,
  heroCards: nutHero, defenderRange: sandbox.window.GTOVillainCallAudit.BB_DEFEND_RANGE
});
console.log('Villain station call audit:', audit && audit.code === 'VILLAIN_STATION_CALL' ? 'DETECTED' : audit.code);

const FB = sandbox.window.GTOFacingBet;
const mdf = FB.calculateMDF(10, 5);
console.log('MDF 50% pot bet =>', Math.round(mdf * 100) + '% (expect ~67%)');

const ProbeEV = sandbox.window.GTOProbeEV;
const probeStrong = ProbeEV.computeProbeStrategy({
  street: 'flop', potBB: 6, heroEquity: 0.72, inPosition: true, initiative: 'aggressor',
  heroCards: ['Ah', 'Kd'], board: ['As', '7c', '2d'],
  handRank: { band: 'value', percentile: 0.85, tier: 'strong' }
});
const probeWeak = ProbeEV.computeProbeStrategy({
  street: 'flop', potBB: 6, heroEquity: 0.32, inPosition: true, initiative: 'aggressor',
  heroCards: ['Qd', '9h'], board: ['As', '7c', '2d'],
  handRank: { band: 'bluffcatch', percentile: 0.28, tier: 'weak' }
});
console.log('Probe value bet%', Math.round((1 - probeStrong.strategy.check) * 100), 'weak bet%', Math.round((1 - probeWeak.strategy.check) * 100));

const facing = FB.calculateActionFrequencies({
  street: 'flop', currentPot: 10, betSize: 5, heroEquity: 0.55, tier: 'medium',
  handRank: { band: 'merge', tier: 'medium' }, inPosition: true, board: ['As', '7c', '2d']
});
console.log('Facing 50% pot merge call%', Math.round(facing.call * 100), 'fold%', Math.round(facing.fold * 100));

const RS = sandbox.window.GTORiverShoveNode;
const pairedBoard = ['Th', 'Ts', '3h', '2h', 'Kh'];
const nutFlushHero = ['Ah', '4h'];
const shoveRange = RS.microstakesRiverShoveRange(pairedBoard, RS.boardPairRank(pairedBoard));
const eqShove = GTO.Equity.equityVsRange(nutFlushHero, pairedBoard, shoveRange, 800, {
  street: 'river', riverShove: true, shoveNode: true
});
const smallBet = FB.calculateActionFrequencies({
  street: 'river', currentPot: 40, betSize: 9.6, toCallBB: 9.6,
  heroEquity: 0.72, tier: 'strong', heroCards: nutFlushHero, board: pairedBoard,
  handRank: { band: 'value', tier: 'strong' }, inPosition: true
});
const shoveBet = FB.calculateActionFrequencies({
  street: 'river', currentPot: 237, betSize: 186.6, toCallBB: 186.6,
  heroEquity: eqShove, tier: 'strong', heroCards: nutFlushHero, board: pairedBoard,
  handRank: { band: 'value', tier: 'strong' }, inPosition: true, villainLastAction: 'raise'
});
console.log('Nut flush paired board eq vs shove range ~', Math.round(eqShove * 100) + '% (expect <25%)');
console.log('Small bet call%', Math.round(smallBet.call * 100), 'shove fold%', Math.round(shoveBet.fold * 100), '(expect call high, shove fold high)');
const nodeClone = SV.validateFacingNodeChange(
  { street: 'river', toCallBB: 9.6, potBB: 50, gto: smallBet },
  { street: 'river', toCallBB: 186.6, potBB: 280, gto: shoveBet }
);
console.log('Bet→Shove freq clone?', nodeClone.ok ? 'NO (OK)' : 'YES (BUG)');

vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'import.js'), 'utf8'), sandbox, { filename: 'import.js' });
const Importer = sandbox.window.Importer;
const staleHand = {
  hero: 'Hero', heroPos: 'BTN', heroCards: nutFlushHero, heroCode: 'A4s', bb: 0.05,
  positions: { Hero: 'BTN' }, decisions: []
};
const staleDec = {
  street: 'river', spotKind: 'postflop', chosen: 'call', toCallBB: 186.6,
  potBB: 93.4, board: pairedBoard.slice(), options: ['fold', 'call', 'raise'],
  heroEquity: 0, villainLastAction: 'raise', facingNode: 'shove',
  potBeforeBB: 93.4, initiative: 'caller', inPosition: true
};
staleHand.decisions.push(staleDec);
Importer.recomputeHandDecisions(staleHand);
const staleFold = Math.round((staleDec.gto.fold || 0) * 100);
console.log('Session review re-eval shove fold%', staleFold, '(expect >=75)');

const oldSessionHand = {
  id: '999', heroPos: 'BB', heroCards: nutFlushHero, heroCode: 'A4s', bb: 0.05,
  board: pairedBoard.slice(),
  decisions: [{
    street: 'preflop', spotKind: 'vsRFI', chosen: 'call', toCallBB: 2,
    potBB: 3, options: ['fold', 'call', 'raise']
  }, {
    street: 'river', spotKind: 'postflop', chosen: 'fold', toCallBB: 186.6,
    potBB: 93.4, board: pairedBoard.slice(), options: ['fold', 'call', 'raise'],
    heroEquity: 12, villainLastAction: 'raise'
  }]
};
let oldRecomputeOk = true;
try {
  Importer.recomputeHandDecisions(oldSessionHand);
} catch (e) {
  oldRecomputeOk = false;
  console.error('Old session recompute failed:', e.message);
}
console.log('Old session hand recompute:', oldRecomputeOk ? 'OK' : 'FAIL');

const EvLoss = sandbox.window.GTOEvLoss;
const errBet = EvLoss.computeEvLoss('flop', 'error', 'bet_66', null,
  { check: 0.95, bet_33: 0.03, bet_66: 0.01, bet_100: 0.01 },
  15, { potBB: 15, toCallBB: 0, betSizeBB: 5, street: 'flop', bbSizeEuro: 0.05 });
console.log('Error bluff bet loss', errBet.evLoss, 'erroneous', errBet.evErroneous);

const badCall = EvLoss.computeEvLoss('flop', 'optima', 'call', null,
  { fold: 0.5, call: 0.4, raise: 0.1 },
  11, { potBB: 11, toCallBB: 3, potBeforeBB: 8, heroEquity: 0.08, street: 'flop', bbSizeEuro: 0.05 });
console.log('Call sin odds loss', badCall.evLoss, 'bb (expect >=2)', 'eq', badCall.mathParams.equityPct, 'be', badCall.mathParams.breakEvenPct);

const sessStats = Importer.computeStats([
  { heroNetBB: 50, totalEvLoss: 80, decisions: [{ class: 'error', street: 'flop' }] },
  { heroNetBB: -30, totalEvLoss: 2, decisions: [{ class: 'optima', street: 'flop' }] }
]);
console.log('Session expectedNet', sessStats.expectedNet, '(expect 102)');
console.log('Session varianceAdj', sessStats.varianceAdj, '(expect -82)');

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
const evOk = badCall.evLoss >= 2 && badCall.evErroneous
  && sessStats.expectedNet === 102 && sessStats.varianceAdj === -82;
console.log(errors === 0 && complete === played && staleFold >= 75 && oldRecomputeOk && evOk ? '\n*** TODO OK ***' : '\n*** REVISAR ***');
