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
  'engine/villainProfiles.js',
  'engine/villainPreflop.js',
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

const face4aqo = GTO.getStrategy({
  spotKind: 'face4bet', position: 'BTN', vsPosition: 'HJ',
  street: 'preflop', handCode: 'AQo', heroCards: ['As', 'Qd'],
  potBB: 25.25, toCallBB: 9.75, initiative: 'aggressor', inPosition: true
});
const aqoFold = Math.round((face4aqo.fold || 0) * 100);
console.log('AQo 3bet vs 4bet fold%', aqoFold, '(expect <=10)');
if (aqoFold > 10) { console.error('FAIL: AQo no debe foldear 90% vs 4-bet'); process.exit(1); }

const topSetInfo = GTO.Equity.classifyMadeHand(['As', 'Qd'], ['Qh', '7s', 'Qc']);
const facingDonk = GTO.Strategy.postflopStrategy({
  street: 'flop', board: ['Qh', '7s', 'Qc'], heroCards: ['As', 'Qd'],
  toCallBB: 12, potBB: 47, heroEquity: 0.91,
  initiative: 'caller', inPosition: true, madeHandInfo: topSetInfo
});
const donkFold = Math.round((facingDonk.fold || 0) * 100);
console.log('Top set vs donk fold%', donkFold, '(expect <=12)');
if (donkFold > 12) { console.error('FAIL: trío top no debe recomendar fold alto vs donk'); process.exit(1); }

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

const eqKqTurnFacing = GTO.Equity.equityVsRange(
  ['Ks', 'Qh'], ['9c', 'Qc', 'Jc', 'Th'],
  'TT+, AJs+, KQs, QJs, JTs, AQo, AKo, 99, 88', 800,
  { street: 'turn', facingBet: true }
);
const eqKqRiver = GTO.Equity.equityVsRange(
  ['Ks', 'Qh'], ['9c', 'Qc', 'Jc', 'Th', '2c'],
  'TT+, AJs+, KQs, QJs, JTs, AQo, AKo, 99, 88', 800,
  { street: 'river' }
);
console.log('KQ nut straight turn facing bet eq ~', Math.round(eqKqTurnFacing * 100) + '% (expect >40%, > river)');
console.log('KQ nut straight river eq ~', Math.round(eqKqRiver * 100) + '%');
if (eqKqTurnFacing < 0.35 || eqKqTurnFacing <= eqKqRiver) {
  console.error('FAIL KQ straight: turn equity', eqKqTurnFacing, 'river', eqKqRiver);
  process.exit(1);
}

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

const facingSanity = SV.sanityCheckSolver([
  { street: 'turn', gto: { fold: 0.16, call: 0.74, raise: 0.10 } },
  { street: 'river', gto: { fold: 0.21, call: 0.72, raise: 0.07 } }
], { turn: ['7s', '2c', 'Ac', 'Qc'], river: ['7s', '2c', 'Ac', 'Qc', '4h'] }, 1);
console.log('Facing bet turn/river sanity (Poker76 #185):', facingSanity.ok ? 'OK' : 'FAIL');
if (!facingSanity.ok) process.exit(1);

const jugarRange = 'TT+, AJs+, KQs, QJs, JTs, AQo, AKo, 99, 88';
const khAcTurn = GTO.computeHeroEquity({
  street: 'turn', board: ['4h', 'Ks', '6c', '4c'], heroCards: ['Kh', 'Ac'],
  villainRange: jugarRange,
  potBB: 36.59, toCallBB: 14.55, potBeforeBB: 22.04, villainLastAction: 'bet',
  initiative: 'caller', inPosition: true
});
const khAcRiver = GTO.computeHeroEquity({
  street: 'river', board: ['4h', 'Ks', '6c', '4c', '8c'], heroCards: ['Kh', 'Ac'],
  villainRange: jugarRange,
  potBB: 99.74, toCallBB: 48.6, potBeforeBB: 51.14, villainLastAction: 'bet',
  initiative: 'caller', inPosition: true
});
const khAsTurn = GTO.computeHeroEquity({
  street: 'turn', board: ['4h', 'Kc', '6c', '4c'], heroCards: ['Kh', 'As'],
  villainRange: jugarRange,
  potBB: 36.59, toCallBB: 14.55, potBeforeBB: 22.04, villainLastAction: 'bet',
  initiative: 'caller', inPosition: true
});
const khAsRiver = GTO.computeHeroEquity({
  street: 'river', board: ['4h', 'Kc', '6c', '4c', '8c'], heroCards: ['Kh', 'As'],
  villainRange: jugarRange,
  potBB: 99.74, toCallBB: 48.6, potBeforeBB: 51.14, villainLastAction: 'bet',
  initiative: 'caller', inPosition: true
});
const khAcEval = Cards.evaluate(['Kh', 'Ac'].concat(['4h', 'Ks', '6c', '4c', '8c']));
console.log('KhAc river hand:', khAcEval.name, '(expect Doble pareja, not Color)');
console.log('KhAc turn (FD+2p)', Math.round(khAcTurn * 100) + '%', 'river shove', Math.round(khAcRiver * 100) + '%');
console.log('KhAs turn (two pair)', Math.round(khAsTurn * 100) + '%', 'river shove', Math.round(khAsRiver * 100) + '%');
if (khAcEval.category >= 5) {
  console.error('FAIL KhAc: 4 clubs total must not evaluate as flush');
  process.exit(1);
}
if (khAcRiver < 0.40) {
  console.error('FAIL KhAc: river shove equity too low (expect ~50%+ vs rango polarizado QQ/AK/Kx)', khAcRiver);
  process.exit(1);
}
if (khAcRiver >= khAcTurn) {
  console.error('FAIL KhAc: river equity should be below turn (proyecto completado sin color)');
  process.exit(1);
}
if (khAsRiver >= khAsTurn || khAsRiver > 0.10) {
  console.error('FAIL KhAs: river shove equity should be near 0% on 4-club board without club');
  process.exit(1);
}

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

const Cls = sandbox.window.GTOClassifier;
const rec0 = Cls.reconcileWithEv('error', 'raise', 'fold', { actionEV: 0.5, bestEV: 0.5 }, { freq: 0, equity: 0.5 });
const rec8 = Cls.reconcileWithEv('imprecisa', 'bet_33', 'check', { actionEV: 4, bestEV: 4 }, { freq: 0.08, equity: 0.72 });
const recNuts = Cls.reconcileWithEv('error', 'bet_33', 'check', { actionEV: 4, bestEV: 4 }, { freq: 0.03, equity: 0.72, band: 'nuts' });
console.log('Reconcile 0% freq', rec0.cls, '8%', rec8.cls, 'nuts', recNuts.cls, '(expect not optima / aceptable / optima)');
if (rec0.cls === 'optima' || rec8.cls === 'optima') {
  console.error('FAIL: low-freq EV tie must not become optima');
  process.exit(1);
}
if (recNuts.cls !== 'optima') {
  console.error('FAIL: nuts EV tie should stay optima');
  process.exit(1);
}

const a6NutFlushBoard = ['8s', 'Kh', '9s', '7s', '2d'];
const a6Hero = ['As', '6s'];
const nutFlushRiverBet = GTO.evaluateSpot({
  street: 'river', board: a6NutFlushBoard, heroCards: a6Hero, handCode: 'A6s',
  potBB: 18, toCallBB: 0, chosenAction: 'bet_33', betSizeBB: 6,
  availableActions: ['check', 'bet_33', 'bet_66', 'bet_100'],
  initiative: 'caller', inPosition: false, bbSizeEuro: 0.05,
  heroEquity: 0.99,
  handRank: { band: 'nuts', tier: 'strong', percentile: 0.99 },
  madeHandInfo: { tier: 'strong', category: 5 }
});
const nutFlushRiverRaise = GTO.evaluateSpot({
  street: 'river', board: a6NutFlushBoard, heroCards: a6Hero, handCode: 'A6s',
  potBB: 28, toCallBB: 6, chosenAction: 'raise', betSizeBB: 6,
  availableActions: ['fold', 'call', 'raise'],
  villainLastAction: 'raise', initiative: 'caller', inPosition: false, bbSizeEuro: 0.05,
  heroEquity: 0.99,
  handRank: { band: 'nuts', tier: 'strong', percentile: 0.99 },
  madeHandInfo: { tier: 'strong', category: 5 }
});
console.log('Nut flush river bet class', nutFlushRiverBet.evaluation.class,
  'raise class', nutFlushRiverRaise.evaluation.class, '(bet: aceptable+, raise: not optima if low freq)');
if (nutFlushRiverBet.evaluation.class === 'error' || nutFlushRiverBet.evaluation.class === 'imprecisa') {
  console.error('FAIL: nut flush river bet should not be error/imprecisa when EV ties');
  process.exit(1);
}
if (nutFlushRiverRaise.evaluation.class === 'optima' && nutFlushRiverRaise.evaluation.frequency < 0.15) {
  console.error('FAIL: low-freq raise should not be optima');
  process.exit(1);
}

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

const VP = sandbox.window.GTOVillainProfiles;
const profHand = Engine.newHand({ type: 'RFI', heroPos: 'BTN', seed: 7777 });
const profCount = profHand.table && profHand.table.profiles ? Object.keys(profHand.table.profiles).length : 0;
console.log('Villain profiles per hand', profCount, '(expect 5)');
const maniacAgg = VP.postflopLead(0.12, VP.getProfile('maniac'), true, 0.1);
const nitAgg = VP.postflopLead(0.12, VP.getProfile('nit'), true, 0.99);
console.log('Maniac bluffs air', maniacAgg, 'Nit checks air', nitAgg);
const VPF = sandbox.window.GTOVillainPreflop;
const trash3b = VPF.defendVsOpen('63s', VP.getProfile('maniac'), 0.5, 'BB', 'CO');
const trash4b = VPF.openerVs3BetAction('54o', VP.getProfile('maniac'), 0.99);
const trashAi = VPF.villainVsAllInAction('63s', VP.getProfile('maniac'), 0.99);
const weakRiver = VP.postflopLead(0.28, VP.getProfile('maniac'), true, 0.5, { street: 'river', tier: 'weak' });
console.log('Trash 63s defend', trash3b, '54o vs3bet', trash4b, '63s vs AI', trashAi, 'weak river', weakRiver);

const sessStats = Importer.computeStats([
  { heroNetBB: 50, totalEvLoss: 80, decisions: [{ class: 'error', street: 'flop' }] },
  { heroNetBB: -30, totalEvLoss: 2, decisions: [{ class: 'optima', street: 'flop' }] }
]);
console.log('Session expectedNet', sessStats.expectedNet, '(expect -62)');
console.log('Session varianceAdj', sessStats.varianceAdj, '(expect 82)');

const handEv = EvLoss.computeNetEvStats(99.58, 90.62);
console.log('Hand EV expected', handEv.expectedNet, '(expect ~8.96)', 'variance', handEv.varianceAdj, '(expect ~90.62)');

const leakVar = EvLoss.computeLeakVariancePct(-139.80, 29.99);
console.log('Leak/var losing session', leakVar.pctDecision + '%', leakVar.pctVariance + '%', '(expect ~21% ~79%)');
if (leakVar.pctDecision < 15 || leakVar.pctDecision > 28) {
  console.error('FAIL leak/var split for -139.80 / 29.99');
  process.exit(1);
}
const leakVarWin = EvLoss.computeLeakVariancePct(sessStats.actualNet, sessStats.evDecision);
console.log('Leak/var mixed session', leakVarWin.pctDecision + '%', '(expect ~80)');

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
  && sessStats.expectedNet === -62 && sessStats.varianceAdj === 82
  && handEv.expectedNet === 8.96 && handEv.varianceAdj === 90.62
  && profCount === 5 && maniacAgg === 'bet' && nitAgg === 'check'
  && trash3b === 'fold' && trash4b === 'fold' && trashAi === 'fold' && weakRiver === 'check';

const ls = { _d: {}, getItem(k) { return this._d[k] != null ? this._d[k] : null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } };
const storeBox = Object.assign({}, sandbox, { localStorage: ls });
vm.createContext(storeBox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'storage.js'), 'utf8'), storeBox, { filename: 'storage.js' });
const Store = storeBox.window.Store;
if (!Store || typeof Store.getHistory !== 'function' || typeof Store.mergeFromCloud !== 'function') {
  console.error('FAIL Store: getHistory o mergeFromCloud no disponibles');
  process.exit(1);
}
Store.saveHand({
  id: 't1', createdAt: '2026-01-01T00:00:00Z', seed: 1, scenario: { type: 'RFI', heroPos: 'BTN' },
  hero: { pos: 'BTN', code: 'AA', cards: ['As', 'Ah'] },
  villain: { pos: 'BB' }, board: [], decisions: [{ street: 'preflop', class: 'optima', action: 'raise', label: 'Sube' }],
  result: { heroNet: 1.5, totalEvLoss: 0, nErrors: 0, reason: 'test' }
});
const storeOk = Store.getHistory().length === 1 && Store.getStats().handsPlayed === 1;
console.log('Store saveHand/getHistory:', storeOk ? 'OK' : 'FAIL');
if (!storeOk) process.exit(1);

const sessId = 'sess-no-txt';
Store.saveSession({
  id: sessId, createdAt: '2026-01-01T00:00:00Z', fileName: 'Poker99.txt', hero: 'Hero',
  nTotal: 1, nDiscarded: 0, hands: [], stats: { nHands: 0, netBB: 0, evLossBB: 0, accuracy: 100, grade: { letter: 'A', score: 10, verdict: 'ok' } },
  analysisVersion: '1'
});
const txtKey = 'pt_session_txt_v1_' + sessId;
const savedSess = Store.getSessions().find((s) => s.id === sessId);
const noTxtOk = savedSess && !savedSess.hasTxt && !ls.getItem(txtKey);
console.log('Store session sin txt:', noTxtOk ? 'OK' : 'FAIL');
if (!noTxtOk) process.exit(1);
Store.saveSession(Object.assign({}, savedSess, { rawText: 'big hand history text', hasTxt: true }));
const withTxt = Store.getSessions().find((s) => s.id === sessId);
Store.saveSession(Object.assign({}, withTxt, { hands: [] }));
const cleanedOk = !Store.getSessions().find((s) => s.id === sessId).hasTxt && !ls.getItem(txtKey);
console.log('Store session limpia txt al re-guardar:', cleanedOk ? 'OK' : 'FAIL');
if (!cleanedOk) process.exit(1);

console.log(errors === 0 && complete === played && staleFold >= 75 && oldRecomputeOk && evOk ? '\n*** TODO OK ***' : '\n*** REVISAR ***');
