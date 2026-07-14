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

const ktFlushRiver = GTO.computeHeroEquity({
  street: 'river', board: ['Jc', '6c', '3d', 'Qc', '8c'], heroCards: ['Kc', 'Tc'],
  villainRange: jugarRange,
  potBB: 36.24, toCallBB: 12.64, potBeforeBB: 23.6, villainLastAction: 'bet',
  initiative: 'caller', inPosition: true
});
console.log('KcTc nut-ish flush river facing bet eq ~', Math.round(ktFlushRiver * 100) + '% (expect >=50%)');
if (ktFlushRiver < 0.50) {
  console.error('FAIL KcTc: king-high flush should not show ~0% equity facing bet', ktFlushRiver);
  process.exit(1);
}

const vpf = sandbox.window.GTOVillainPreflop;
if (vpf.openerVs3BetAction('85s', { difficultyLevel: 'pro', preflopStrict: 1 }, 0.01, { gameType: 'cash6', stackDepth: 'standard' }) === '4bet') {
  console.error('FAIL: pro opener must not 4-bet 85s');
  process.exit(1);
}
console.log('Pro opener 85s vs 3bet: no 4bet (OK)');

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

const cbetAirIp = ProbeEV.computeProbeStrategy({
  street: 'flop', potBB: 6, heroEquity: 0.16, inPosition: true, initiative: 'aggressor',
  villainLastAction: 'check',
  heroCards: ['Qd', '9h'], board: ['As', '7c', '2d'],
  handRank: { band: 'air', percentile: 0.12, tier: 'air' },
  madeHandInfo: { tier: 'air', ev: { category: 0 } }
});
const cbetAirIpPct = Math.round((1 - cbetAirIp.strategy.check) * 100);
const probeAirCaller = ProbeEV.computeProbeStrategy({
  street: 'flop', potBB: 6, heroEquity: 0.16, inPosition: true, initiative: 'caller',
  villainLastAction: 'check',
  heroCards: ['Qd', '9h'], board: ['As', '7c', '2d'],
  handRank: { band: 'air', percentile: 0.12, tier: 'air' }
});
const probeAirCallerPct = Math.round((1 - probeAirCaller.strategy.check) * 100);
console.log('Cbet air IP flop%', cbetAirIpPct, '(expect >=40)', 'probe air caller%', probeAirCallerPct, '(expect < cbet)');
if (cbetAirIpPct < 40 || probeAirCallerPct >= cbetAirIpPct) process.exit(1);

const SpotKey = sandbox.window.GTOSpotKey;
const leadFlop = SpotKey.buildSpotKey({ street: 'flop', initiative: 'aggressor', toCallBB: 0, inPosition: true, board: ['As', '7c', '2d'], potBB: 6 });
const leadTurn = SpotKey.buildSpotKey({ street: 'turn', initiative: 'aggressor', toCallBB: 0, inPosition: true, board: ['As', '7c', '2d', '9h'], potBB: 12 });
const leadRiver = SpotKey.buildSpotKey({ street: 'river', initiative: 'aggressor', toCallBB: 0, inPosition: true, board: ['As', '7c', '2d', '9h', '3c'], potBB: 12 });
console.log('Lead types', leadFlop.leadType, leadTurn.leadType, leadRiver.leadType,
  SpotKey.aggressorLeadLabel('flop'), SpotKey.aggressorLeadLabel('turn'), SpotKey.aggressorLeadLabel('river'));
if (leadFlop.leadType !== 'cbet' || leadTurn.leadType !== 'barrel2' || leadRiver.leadType !== 'barrel3') process.exit(1);
if (SpotKey.aggressorLeadLabel('turn') !== 'segundo barrel') process.exit(1);

const turnPureAir = ProbeEV.computeProbeStrategy({
  street: 'turn', potBB: 15.78, heroEquity: 0.12, inPosition: true, initiative: 'aggressor',
  villainLastAction: 'check',
  heroCards: ['2h', '3d'], board: ['Ts', 'Ks', 'Js', '6c'],
  handRank: { band: 'air', percentile: 0.05, tier: 'air' },
  madeHandInfo: sandbox.window.GTOEquityMadeHand.classifyMadeHand(['2h', '3d'], ['Ts', 'Ks', 'Js', '6c'])
});
const turnPureAirCheck = Math.round(turnPureAir.strategy.check * 100);
console.log('Turn pure air check%', turnPureAirCheck, '(expect >=70)');
if (turnPureAirCheck < 70) process.exit(1);

const turnAh3h = ProbeEV.computeProbeStrategy({
  street: 'turn', potBB: 15.78, heroEquity: 0.1675, inPosition: true, initiative: 'aggressor',
  villainLastAction: 'check',
  heroCards: ['Ah', '3h'], board: ['Ts', 'Ks', 'Js', '6c'],
  handRank: { band: 'air', percentile: 0.12, tier: 'air' },
  madeHandInfo: sandbox.window.GTOEquityMadeHand.classifyMadeHand(['Ah', '3h'], ['Ts', 'Ks', 'Js', '6c'])
});
const turnAh3hOk = turnAh3h.strategy.check >= turnAh3h.strategy.bet_33;
console.log('Turn Ah3h gutshot check>=bet33:', turnAh3hOk ? 'OK' : 'FAIL',
  'check%', Math.round(turnAh3h.strategy.check * 100),
  'bet33%', Math.round(turnAh3h.strategy.bet_33 * 100));
if (!turnAh3hOk) process.exit(1);

const facing = FB.calculateActionFrequencies({
  street: 'flop', currentPot: 10, betSize: 5, heroEquity: 0.55, tier: 'medium',
  handRank: { band: 'merge', tier: 'medium' }, inPosition: true, board: ['As', '7c', '2d']
});
console.log('Facing 50% pot merge call%', Math.round(facing.call * 100), 'fold%', Math.round(facing.fold * 100));

const badCallFreq = FB.calculateActionFrequencies({
  street: 'turn', currentPot: 17.2, betSize: 5.6, toCallBB: 5.6,
  heroEquity: 0.20, tier: 'medium',
  handRank: { band: 'merge', tier: 'medium' }, inPosition: true,
  board: ['Jh', '8c', 'Qh', '4h']
});
const badCallFreqOk = badCallFreq.fold > badCallFreq.call;
console.log('Turn sin pot odds fold>call:', badCallFreqOk ? 'OK' : 'FAIL',
  'fold%', Math.round(badCallFreq.fold * 100), 'call%', Math.round(badCallFreq.call * 100));

const akTurnCall = GTO.evaluateSpot({
  street: 'turn', board: ['Jh', '8c', 'Qh', '4h'], heroCards: ['As', 'Kc'],
  potBB: 22.8, toCallBB: 5.6, potBeforeBB: 17.2, chosenAction: 'call',
  heroEquity: 0.20, tier: 'medium',
  handRank: { band: 'merge', tier: 'medium' }, inPosition: true,
  villainLastAction: 'bet', availableActions: ['fold', 'call', 'raise'],
  bbSizeEuro: 0.02
});
const akTurnCoherent = akTurnCall.evaluation.class !== 'optima'
  && akTurnCall.optionBreakdown[0].id === 'fold'
  && akTurnCall.evaluation.best === 'fold';
console.log('AK turn call sin odds coherente:', akTurnCoherent ? 'OK' : 'FAIL',
  'class', akTurnCall.evaluation.class, 'top', akTurnCall.optionBreakdown[0].id);
if (!badCallFreqOk || !akTurnCoherent) process.exit(1);

const tqsTurnCall = GTO.evaluateSpot({
  street: 'turn', board: ['9h', '7s', '4s', 'Jc'], heroCards: ['Ts', 'Qs'],
  potBB: 11.6, toCallBB: 2.8, potBeforeBB: 8.8, chosenAction: 'call',
  heroEquity: 0.2075, tier: 'medium',
  handRank: { band: 'merge', tier: 'medium' }, inPosition: false,
  villainLastAction: 'bet', availableActions: ['fold', 'call', 'raise'],
  bbSizeEuro: 0.02
});
const tqsCoherent = tqsTurnCall.optionBreakdown[0].id === 'fold'
  && tqsTurnCall.evaluation.best === 'fold'
  && tqsTurnCall.evaluation.class !== 'optima';
console.log('TQs turn call sin odds coherente:', tqsCoherent ? 'OK' : 'FAIL',
  'class', tqsTurnCall.evaluation.class, 'top', tqsTurnCall.optionBreakdown[0].id);
if (!tqsCoherent) process.exit(1);

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

vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'import/hhUtils.js'), 'utf8'), sandbox, { filename: 'import/hhUtils.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'import/formatDetector.js'), 'utf8'), sandbox, { filename: 'import/formatDetector.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'import/parsers/pokerstars.js'), 'utf8'), sandbox, { filename: 'import/parsers/pokerstars.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'import/parsers/winamax.js'), 'utf8'), sandbox, { filename: 'import/parsers/winamax.js' });
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

const proHand = { table: {} };
VP.assignTableProfiles(proHand, ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'], 'BTN', 'pro');
const proStrong = Object.keys(proHand.table.profiles || {}).filter(function (pos) {
  return proHand.table.profiles[pos] === 'pro';
}).length;
console.log('Pro level all pro villains', proStrong, '(expect 5)');
const proProf = VP.profileForHand({ table: { profiles: { BB: 'pro' } }, playConfig: { villainLevel: 'pro' } }, 'BB');
const fishProf = VP.profileForHand({ table: { profiles: { BB: 'tag' } }, playConfig: { villainLevel: 'fish' } }, 'BB');
console.log('Pro villain label', proProf.label === 'Pro' ? 'OK' : 'FAIL');
console.log('Pro vs fish bluff mult', proProf.postflop.bluffFreqMult < fishProf.postflop.bluffFreqMult ? 'OK' : 'FAIL');

const trash4bPro = VPF.openerVs3BetAction('42o', proProf, 0.99, { gameType: 'cash6', stackDepth: 'standard' });
const trash3bPro = VPF.defendVsOpen('42o', proProf, 0.99, 'BB', 'CO', { gameType: 'cash6', stackDepth: 'standard' });
console.log('Pro 42o vs3bet', trash4bPro, 'defend', trash3bPro, '(expect fold fold)');

const trashIsoPro = VPF.limperVsIsoAction('42o', proProf, 0.99);
const trashSqPro = VPF.openerVsSqueezeAction('72o', proProf, 0.99, 'CO', { gameType: 'cash6', stackDepth: 'standard' });
console.log('Pro 42o iso', trashIsoPro, '72o squeeze', trashSqPro, '(expect fold fold)');

let rfiProRaiseOk = false;
try {
  const hPro = Engine.newHand(
    { type: 'RFI', heroPos: 'UTG', seed: 9001 },
    { gameType: 'cash6', stackDepth: 'standard', villainLevel: 'pro' }
  );
  Engine.act(hPro, 'raise');
  rfiProRaiseOk = true;
} catch (e) {
  console.error('RFI UTG pro raise', e.message);
}
console.log('RFI UTG pro raise', rfiProRaiseOk ? 'OK' : 'FAIL');

const VT = sandbox.window.GTOVillainTracking;
const RM = sandbox.window.PTRangeMatrix;
const mxProf = VT.buildVillainMatrixProfile({
  preflopRange: 'TT+, AJs+, KQs, 99, 88, 77, 55, A5s, A4s, KJo',
  street: 'turn',
  board: ['3c', '3s', '5d', 'Ks'],
  actionLine: [{ street: 'flop', action: 'bet' }, { street: 'turn', action: 'bet' }],
  lastAction: 'bet',
  betBB: 9,
  potBeforeBB: 18,
  villainPos: 'CO',
  heroCards: ['7s', '7h'],
  heroCode: '77',
  villainCode: '55'
});
const mx55 = mxProf.cellAction('55');
const mxA5 = mxProf.cellAction('A5s');
const mxOut = mxProf.cellAction('72o');
console.log('Villain matrix 55', mx55, 'A5s', mxA5, '72o', mxOut, 'narrative', !!mxProf.lineNarrative);

const mxFlopSb = VT.buildVillainMatrixProfile({
  preflopRange: 'TT+, AJs+, KQs, 99, 88, 77, 55, A5s, A4s, KJo',
  street: 'flop',
  board: ['3d', '3h', '2s'],
  actionLine: [],
  lastAction: 'bet',
  betBB: 4.85,
  potBeforeBB: 9.5,
  villainPos: 'CO',
  heroCards: ['7h', '7d'],
  heroCode: '77',
  villainCode: 'A5s'
});
const mxFlopA5 = mxFlopSb.cellAction('A5s');
console.log('Villain matrix flop A5s bet sin timeline', mxFlopA5, '(expect semibluff)');
if (mxFlopA5 !== 'semibluff') {
  console.error('FAIL: A5s en flop bet debería ser semibluff, got', mxFlopA5);
  process.exit(1);
}

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
  && trash3b === 'fold' && trash4b === 'fold' && trashAi === 'fold' && weakRiver === 'check'
  && trash4bPro === 'fold' && trash3bPro === 'fold'
  && trashIsoPro === 'fold' && trashSqPro === 'fold' && rfiProRaiseOk
  && (mx55 === 'value' || mx55 === 'semibluff') && mxOut === 'out' && mxProf.lineNarrative;

const ls = {
  _d: {},
  getItem(k) { return this._d[k] != null ? this._d[k] : null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; },
  get length() { return Object.keys(this._d).length; },
  key(i) { return Object.keys(this._d)[i]; }
};
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

(async function () {
await Store.saveSession({
  id: 's-local', createdAt: '2026-01-03T00:00:00Z', fileName: 'local.txt', hero: 'H',
  nTotal: 1, nDiscarded: 0, hands: [], stats: { nHands: 0, netBB: 0, evLossBB: 0, accuracy: 100, grade: { letter: 'A', score: 10, verdict: 'ok' } },
  analysisVersion: '1'
});
const mergedCloud = Store.mergeDirtyKeysIntoCloud(
  { sessions: [{ id: 's-cloud', createdAt: '2026-01-02T00:00:00Z', fileName: 'cloud.txt', hero: 'H', hands: [], stats: { nHands: 0, netBB: 0, evLossBB: 0, accuracy: 0, grade: { letter: 'C', score: 5, verdict: 'ok' } } }] },
  ['sessions', 'stats']
);
const mergeSessionsOk = !mergedCloud.sessions
  && Store.getSessions().some((s) => s.id === 's-local');
console.log('Store mergeDirtyKeys sessions (cloud-only):', mergeSessionsOk ? 'OK' : 'FAIL');

const sessId = 'sess-no-txt';
await Store.saveSession({
  id: sessId, createdAt: '2026-01-01T00:00:00Z', fileName: 'Poker99.txt', hero: 'Hero',
  nTotal: 1, nDiscarded: 0, hands: [], stats: { nHands: 0, netBB: 0, evLossBB: 0, accuracy: 100, grade: { letter: 'A', score: 10, verdict: 'ok' } },
  analysisVersion: '1'
});
const txtKey = 'pt_session_txt_v1_' + sessId;
const savedSess = Store.getSessions().find((s) => s.id === sessId);
const noTxtOk = savedSess && !savedSess.hasTxt && !ls.getItem(txtKey);
console.log('Store session sin txt:', noTxtOk ? 'OK' : 'FAIL');

Store.setUserId('gdpr-test-user');
Store.saveHand({
  id: 'gdpr1', createdAt: '2026-01-02T00:00:00Z', seed: 2, scenario: { type: 'RFI', heroPos: 'CO' },
  hero: { pos: 'CO', code: 'KK', cards: ['Ks', 'Kh'] },
  villain: { pos: 'BB' }, board: [], decisions: [],
  result: { heroNet: 0, totalEvLoss: 0, nErrors: 0, reason: 'gdpr' }
});
const gdprExp = JSON.parse(Store.exportFullUserData({ sub: 'gdpr-test-user', email: 'gdpr@test.com', name: 'GDPR' }));
const gdprExportOk = gdprExp.format === 'PokerForgeAI-GDPR-export-v1'
  && gdprExp.profile && gdprExp.profile.email === 'gdpr@test.com'
  && Array.isArray(gdprExp.history) && gdprExp.history.length >= 1;
console.log('GDPR export:', gdprExportOk ? 'OK' : 'FAIL');
const purged = Store.purgeLocalUserData('gdpr-test-user');
Store.setUserId('gdpr-test-user');
const gdprPurgeOk = purged.removed > 0 && Store.getHistory().length === 0;
console.log('GDPR purge:', gdprPurgeOk ? 'OK' : 'FAIL');
if (!gdprExportOk || !gdprPurgeOk) process.exit(1);
if (!noTxtOk) process.exit(1);
await Store.saveSession(Object.assign({}, savedSess, { rawText: 'big hand history text', hasTxt: true }));
const withTxt = Store.getSessions().find((s) => s.id === sessId);
await Store.saveSession(Object.assign({}, withTxt, { hands: [] }));
const cleanedOk = !Store.getSessions().find((s) => s.id === sessId).hasTxt && !ls.getItem(txtKey);
console.log('Store session limpia txt al re-guardar:', cleanedOk ? 'OK' : 'FAIL');
if (!cleanedOk) process.exit(1);

const RegRanges = sandbox.window.GTORangesRegistry;
const MatrixMod = sandbox.window.PTRangeMatrix;
const cashUtg = RegRanges.getOpenRaiseRow('UTG', { gameType: 'cash6', stackDepth: 'standard' });
const mttUtg = RegRanges.getOpenRaiseRow('UTG', { gameType: 'mtt', stackDepth: 'standard' });
const mttShortUtg = RegRanges.getOpenRaiseRow('UTG', { gameType: 'mtt', stackDepth: 'short' });
const rangesFormatOk = cashUtg && mttUtg && cashUtg.raise !== mttUtg.raise;
console.log('RFI UTG cash6 vs MTT distinto:', rangesFormatOk ? 'OK' : 'FAIL');
const rangesStackOk = mttUtg.raise !== mttShortUtg.raise;
console.log('RFI UTG MTT 100bb vs 40bb distinto:', rangesStackOk ? 'OK' : 'FAIL');
const bbVsUtg1 = RegRanges.getVsRfiRow('BB', 'UTG1', { gameType: 'mtt', stackDepth: 'standard' });
console.log('BB vs UTG1 MTT existe:', bbVsUtg1 ? 'OK' : 'FAIL');
const explorerInput = MatrixMod.buildExplorerInput('3bet', 'BB', 'UTG1', { gameType: 'mtt', stackDepth: 'standard' });
console.log('Explorer BB vs UTG1 MTT:', explorerInput ? 'OK' : 'FAIL');
const keys9 = sandbox.window.GTORangesVariants.allVsRfi9MaxKeys();
console.log('VS_RFI 9-max spots:', keys9.length, '(expect >=36)');
const vs3Keys = sandbox.window.GTORangesExtended.allVs3betPairKeys();
console.log('VS_3BET positional pairs:', vs3Keys.length, '(expect 15)');
const vs3Row = RegRanges.getVs3betRow('UTG', 'BB', { gameType: 'cash6', stackDepth: 'standard' });
console.log('VS_3BET UTG vs BB:', vs3Row && vs3Row.fourBet ? 'OK' : 'FAIL');
const sqRow = RegRanges.getSqueezeRow('BB', 'CO', 'BTN', { gameType: 'cash6', stackDepth: 'standard' });
console.log('Squeeze BB|CO|BTN:', sqRow && sqRow.raise ? 'OK' : 'FAIL');
const face3Explorer = MatrixMod.buildExplorerInput('4bet', 'UTG', 'BB', { gameType: 'cash6', stackDepth: 'standard' });
console.log('Explorer UTG vs 3bet BB:', face3Explorer ? 'OK' : 'FAIL');
const ranges9Ok = keys9.length >= 36 && bbVsUtg1 && explorerInput && rangesFormatOk && rangesStackOk
  && vs3Keys.length === 15 && vs3Row && sqRow && face3Explorer;
if (!ranges9Ok) process.exit(1);

const wmSidePotHand = `Winamax Poker - ESCAPE "Colorado" - HandId: #22618550-140764-1783120288 - Holdem no limit (0.01€/0.02€) - 2026/07/03 23:11:28 UTC
Table: 'Colorado' 6-max (real money) Seat #6 is the button
Seat 1: KazeDj (2€)
Seat 2: m.loulou (2.33€)
Seat 3: JP_TOJI (1.40€)
Seat 4: THAI-TANIC (7.43€)
Seat 5: Fruta53 (1.92€)
Seat 6: pomme-cerise (7.54€)
*** ANTE/BLINDS ***
KazeDj posts small blind 0.01€
m.loulou posts big blind 0.02€
Dealt to KazeDj [Jd Js]
*** PRE-FLOP ***
JP_TOJI folds
THAI-TANIC folds
Fruta53 folds
pomme-cerise raises 0.04€ to 0.06€
KazeDj raises 0.14€ to 0.20€
m.loulou folds
pomme-cerise calls 0.14€
*** FLOP *** [Kc 2h 7c]
KazeDj bets 0.27€
pomme-cerise calls 0.27€
*** TURN *** [Kc 2h 7c][Jh]
KazeDj bets 0.62€
pomme-cerise raises 6.45€ to 7.07€ and is all-in
KazeDj calls 0.91€ and is all-in
*** RIVER *** [Kc 2h 7c Jh][Kd]
*** SHOW DOWN ***
KazeDj shows [Jd Js] (Full of Jacks and Kings)
pomme-cerise shows [Ks Qh] (Trips of Kings)
pomme-cerise collected 5.54€ from side pot 1
KazeDj collected 3.62€ from main pot
*** SUMMARY ***
Total pot 9.16€ | Rake 0.40€
Board: [Kc 2h 7c Jh Kd]
Seat 1: KazeDj (small blind) showed [Jd Js] and won 3.62€ with Full of Jacks and Kings
Seat 6: pomme-cerise (button) showed [Ks Qh] and won 5.54€ with Trips of Kings`;
const wmParsed = Importer.parseHand(wmSidePotHand);
const wmAnalyzed = Importer.analyzeHand(wmParsed);
const wmSidePotOk = wmParsed.collected.KazeDj === 3.62 && wmAnalyzed.heroNetBB === 81;
console.log('Winamax main/side pot hero net BB:', wmAnalyzed.heroNetBB, wmSidePotOk ? 'OK' : 'FAIL');
if (!wmSidePotOk) process.exit(1);

const PC = sandbox.window.PTPlayConfig;
const ST = sandbox.window.PTStacks;
if (PC.isValidSqueezeCombo({ heroPos: 'BB', openerPos: 'CO', callerPos: 'HJ' })) {
  console.error('FAIL: squeeze CO open + HJ call debe ser inválido');
  process.exit(1);
}
console.log('Squeeze inválido CO→HJ rechazado: OK');
if (!PC.isValidSqueezeCombo({ heroPos: 'BB', openerPos: 'HJ', callerPos: 'CO' })) {
  console.error('FAIL: squeeze HJ open + CO call debe ser válido');
  process.exit(1);
}
console.log('Squeeze válido HJ→CO: OK');
const invalidInPool = PC.SQUEEZE_COMBOS.some(function (c) {
  return c.openerPos === 'CO' && c.callerPos === 'HJ';
});
if (invalidInPool) {
  console.error('FAIL: pool squeeze contiene CO/HJ');
  process.exit(1);
}
console.log('Pool squeeze sin CO/HJ:', PC.SQUEEZE_COMBOS.length, 'spots');

const cfg100 = PC.normalize({ stackDepth: 'bb100' });
const cfg25 = PC.normalize({ stackDepth: 'bb25' });
console.log('Stack config bb100/bb25:', PC.stackBB(cfg100), PC.stackBB(cfg25));
if (PC.stackBB(cfg100) !== 100 || PC.stackBB(cfg25) !== 25) {
  console.error('FAIL stackBB config');
  process.exit(1);
}

const stackHand = Engine.newHand({ type: 'vsRFI', key: 'BB_vs_CO', seed: 42 }, cfg100);
if (!stackHand.stacks || stackHand.stacks.BB !== 100) {
  console.error('FAIL: hero stack inicial 100bb', stackHand.stacks);
  process.exit(1);
}
const villainStack = stackHand.stacks.CO;
if (villainStack < 70 || villainStack > 130) {
  console.error('FAIL: villano stack no cercano a hero', villainStack);
  process.exit(1);
}
console.log('Stacks mesa hero 100bb villano ~', Math.round(villainStack), 'bb: OK');

const rem0 = ST.remaining(stackHand, 'BB');
const callOpt = (stackHand.current.options || []).find(function (o) { return o.id === 'call'; });
if (callOpt) {
  Engine.act(stackHand, 'call');
  const rem1 = ST.remaining(stackHand, 'BB');
  if (!(rem1 < rem0)) {
    console.error('FAIL: stack no baja tras call preflop', rem0, rem1);
    process.exit(1);
  }
  console.log('Stack hero tras call:', rem0, '→', rem1, 'OK');
}

const effShort = Engine.newHand({ type: 'vsRFI', key: 'BB_vs_CO', seed: 99 }, cfg25);
const eff = ST.effectiveForHero(effShort);
if (eff > 25.01) {
  console.error('FAIL: stack efectivo > hero stack', eff);
  process.exit(1);
}
console.log('Stack efectivo capped a hero/villain:', eff, 'OK');

const sqHand = Engine.newHand({
  type: 'squeeze', heroPos: 'BB', openerPos: 'HJ', callerPos: 'CO', seed: 777
}, cfg100);
const ctx = sqHand.current && sqHand.current.context || '';
if (ctx.indexOf('CO abre') >= 0 && ctx.indexOf('HJ paga') >= 0) {
  console.error('FAIL: contexto squeeze orden invertido:', ctx);
  process.exit(1);
}
if (ctx.indexOf('HJ abre') < 0 || ctx.indexOf('CO paga') < 0) {
  console.error('FAIL: contexto squeeze esperado HJ abre CO paga:', ctx);
  process.exit(1);
}
console.log('Contexto squeeze orden correcto: OK');

const sqCfg = PC.normalize({ stackDepth: 'bb100', scenario: 'squeeze', villainLevel: 'fish' });
let sqCallerVillainSeed = null;
for (let sqSeed = 1; sqSeed < 8000 && !sqCallerVillainSeed; sqSeed++) {
  const sqTry = Engine.newHand({
    type: 'squeeze', heroPos: 'BB', openerPos: 'BTN', callerPos: 'SB', seed: sqSeed
  }, sqCfg);
  Engine.act(sqTry, 'raise');
  if (sqTry.stage === 'flop' && sqTry.villain.pos === 'SB' && sqTry.scenario.openerPos === 'BTN') {
    sqCallerVillainSeed = sqSeed;
    if (sqTry.table && sqTry.table.folded && sqTry.table.folded.SB) {
      console.error('FAIL: squeeze pagador SB activo no debe verse fold al flop (seed', sqSeed, ')');
      process.exit(1);
    }
    Engine.act(sqTry, 'check');
    if (sqTry.stage === 'turn' && sqTry.table && sqTry.table.folded && sqTry.table.folded.SB) {
      console.error('FAIL: squeeze pagador SB fold en turn (seed', sqSeed, ')');
      process.exit(1);
    }
  }
}
if (!sqCallerVillainSeed) {
  console.error('FAIL: no se encontró seed squeeze abridor fold + pagador SB (revisar test)');
  process.exit(1);
}
console.log('Squeeze pagador→villano SB activo en mesa (seed', sqCallerVillainSeed, '): OK');

const coldCfg = PC.normalize({ stackDepth: 'bb100', scenario: 'cold4bet', villainLevel: 'fish' });
const coldHand = Engine.newHand({
  type: 'cold4bet', heroPos: 'CO', openerPos: 'UTG', threeBettorPos: 'HJ', seed: 1234
}, coldCfg);
if (!coldHand.current || coldHand.current.kind !== 'cold4bet') {
  console.error('FAIL: cold4bet hand not initialized');
  process.exit(1);
}
Engine.act(coldHand, 'raise');
if (coldHand.current && coldHand.current.kind === 'cold4bet') {
  console.error('FAIL: cold4bet raise did not advance state');
  process.exit(1);
}
console.log('Cold 4-bet avanza tras raise:', coldHand.stage, 'OK');

const coldProCfg = PC.normalize({ stackDepth: 'bb100', scenario: 'cold4bet', villainLevel: 'pro' });
const coldProHand = Engine.newHand({
  type: 'cold4bet', heroPos: 'CO', openerPos: 'UTG', threeBettorPos: 'HJ', seed: 991122
}, coldProCfg);
const tbSeat = coldProHand.villain.pos;
const tbCards = coldProHand.table && coldProHand.table.holeCards && coldProHand.table.holeCards[tbSeat];
if (!tbCards || tbCards.length < 2) {
  console.error('FAIL: cold4bet 3-bettor sin cartas');
  process.exit(1);
}
const tbCode = Ranges.handCode(tbCards[0], tbCards[1]);
if (VPF && !VPF.isInThreeBetRange(tbCode, tbSeat, 'UTG', { gameType: 'cash6', stackDepth: 'standard' })) {
  console.error('FAIL: cold4bet 3-bettor fuera de rango:', tbCode);
  process.exit(1);
}
if (tbCode === 'T7o') {
  console.error('FAIL: cold4bet 3-bettor no debe ser T7o en Pro');
  process.exit(1);
}
console.log('Cold 4-bet 3-bettor en rango:', tbCode, 'OK');

const proCfg = PC.normalize({ stackDepth: 'bb100', villainLevel: 'pro' });
let proHand = Engine.newHand({ type: 'vsRFI', key: 'BB_vs_CO', seed: 555 }, proCfg);
Engine.act(proHand, 'call');
if (proHand.stage !== 'flop') {
  console.error('FAIL: expected flop after call');
  process.exit(1);
}
let proOk = true;
try {
  Engine.act(proHand, 'check');
} catch (e) {
  proOk = false;
  console.error('FAIL: pro postflop threw', e.message);
}
if (!proOk || (proHand.stage !== 'turn' && proHand.stage !== 'complete' && proHand.current)) {
  console.log('Pro postflop check avanza:', proHand.stage, proOk ? 'OK' : 'FAIL');
}
if (!proOk) process.exit(1);
console.log('Pro villano postflop sin ReferenceError: OK');

// ---- Rangos de manos configurables (random / playable / borderline) ----
const rfiScen = { type: 'RFI', heroPos: 'BTN', engineHeroPos: 'BTN' };
const rfiFullWeights = PC.sampleHeroWeights(rfiScen, PC.normalize({}), 'random');
const rfiInRange = {};
Object.keys(rfiFullWeights).forEach(function (c) { if (rfiFullWeights[c] > 0) rfiInRange[c] = true; });

function heroRangeStats(mode) {
  const cfg = PC.normalize({ scenario: 'rfi', heroPos: 'BTN', handRange: mode, villainLevel: 'fish' });
  let out = 0, total = 0;
  const distinct = {};
  for (let s = 1; s <= 500; s++) {
    const h = Engine.newHand({ type: 'RFI', heroPos: 'BTN', seed: s }, cfg);
    const code = h.hero && h.hero.code;
    if (!code) continue;
    total++;
    distinct[code] = true;
    if (!rfiInRange[code]) out++;
  }
  return { outPct: total ? (out / total) * 100 : 0, distinct: Object.keys(distinct).length, total: total };
}

const rndStats = heroRangeStats('random');
const playStats = heroRangeStats('playable');
const bordStats = heroRangeStats('borderline');
console.log('Rango random  → fuera de rango', Math.round(rndStats.outPct) + '%', 'distintas', rndStats.distinct);
console.log('Rango jugables → fuera de rango', Math.round(playStats.outPct) + '%', 'distintas', playStats.distinct);
console.log('Rango borderline → fuera de rango', Math.round(bordStats.outPct) + '%', 'distintas', bordStats.distinct);

if (!(rndStats.outPct >= 25)) {
  console.error('FAIL: random debe repartir muchas manos fuera de rango, got', rndStats.outPct);
  process.exit(1);
}
if (!(playStats.outPct > 2 && playStats.outPct < 30)) {
  console.error('FAIL: jugables debe tener un pequeño % de folds, got', playStats.outPct);
  process.exit(1);
}
if (!(rndStats.outPct > playStats.outPct + 10)) {
  console.error('FAIL: random debe ser más aleatorio que jugables', rndStats.outPct, playStats.outPct);
  process.exit(1);
}
if (!(rndStats.distinct > playStats.distinct)) {
  console.error('FAIL: random debe tener más manos distintas que jugables', rndStats.distinct, playStats.distinct);
  process.exit(1);
}
if (!(bordStats.distinct > 0 && bordStats.distinct < playStats.distinct)) {
  console.error('FAIL: borderline debe ser subconjunto estrecho del rango', bordStats.distinct, playStats.distinct);
  process.exit(1);
}
console.log('Rangos configurables random/jugables/borderline: OK');

// River-only: villano sin stack no debe permitir check infinito
const riverCfg = PC.normalize({ stackDepth: 'bb25', practiceStreet: 'river', villainLevel: 'pro' });
const PTStacks = sandbox.window.PTStacks;
let riverZeroVillainSeed = null;
for (let rs = 1; rs < 6000 && !riverZeroVillainSeed; rs++) {
  const rh = Engine.newHand({ type: 'vsRFI', key: 'CO_vs_UTG', seed: rs }, riverCfg);
  Engine.fastForwardToStreet(rh, 'river');
  if (!rh.current || rh.stage !== 'river' || rh.result) continue;
  const vSeat = rh.villain && rh.villain.pos;
  if (!vSeat || !PTStacks || PTStacks.remaining(rh, vSeat) > 0.01) continue;
  Engine.act(rh, 'check');
  if (rh.stage === 'complete' && rh.result) {
    riverZeroVillainSeed = rs;
    break;
  }
}
if (!riverZeroVillainSeed) {
  console.error('FAIL: no se encontró seed river villano 0bb + check completa mano');
  process.exit(1);
}
console.log('River villano 0bb check cierra mano (seed', riverZeroVillainSeed, '): OK');

// Calle de práctica: reintentos hasta alcanzar la calle objetivo (no aceptar preflop a medias)
function dealAtPracticeStreet(target, cfg, maxTries) {
  let hand = null;
  let tries = 0;
  while (tries < maxTries) {
    hand = Engine.newHand(undefined, cfg);
    Engine.fastForwardToStreet(hand, target);
    if (!hand.result && hand.current && hand.stage === target) break;
    tries++;
  }
  return hand;
}
let riverRetryFails = 0;
for (let i = 0; i < 8; i++) {
  const rh2 = dealAtPracticeStreet('river', riverCfg, 12);
  if (!rh2 || rh2.stage !== 'river' || !rh2.current || rh2.result) riverRetryFails++;
}
if (riverRetryFails) {
  console.error('FAIL: calle river debe alcanzarse tras reintentos', riverRetryFails, 'de 8');
  process.exit(1);
}
console.log('Calle de práctica river con reintentos: OK');

vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'leaks.js'), 'utf8'), sandbox, { filename: 'leaks.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'stats-aggregate.js'), 'utf8'), sandbox, { filename: 'stats-aggregate.js' });
const PTLeaks = sandbox.window.PTLeaks;
const PTStatsAgg = sandbox.window.PTStatsAggregate;
const leakRec = {
  id: 'leak-test-1',
  scenario: 'BB squeeze vs HJ',
  scenarioRaw: { type: 'squeeze', heroPos: 'BB', openerPos: 'HJ', callerPos: 'CO' },
  displayHeroPos: 'BB',
  decisions: [{ street: 'river', class: 'error', evLoss: 3.5 }]
};
const leakKey = PTLeaks.spotKeyFromRecord(leakRec, 'river');
if (leakKey !== 'squeeze|BB|river') {
  console.error('FAIL: spotKeyFromRecord esperado squeeze|BB|river, got', leakKey);
  process.exit(1);
}
if (!PTLeaks.leakKeysMatch('spot|BB|river', 'squeeze|BB|river')) {
  console.error('FAIL: leakKeysMatch legacy spot vs squeeze');
  process.exit(1);
}
const leakSt = {};
PTStatsAgg.ensureAggregates(leakSt);
PTStatsAgg.rebuildTrainerLeaksFromHistory(leakSt.aggregates, [leakRec]);
const rebuilt = PTStatsAgg.trainerTopLeaks(leakSt, 5);
if (!rebuilt.length || rebuilt[0].key !== 'squeeze|BB|river') {
  console.error('FAIL: trainerTopLeaks key tras rebuild:', rebuilt[0] && rebuilt[0].key);
  process.exit(1);
}
console.log('Leak keys agregados vs replay:', leakKey, 'OK');

console.log(errors === 0 && complete === played && staleFold >= 75 && oldRecomputeOk && evOk && mergeSessionsOk ? '\n*** TODO OK ***' : '\n*** REVISAR ***');
})();
