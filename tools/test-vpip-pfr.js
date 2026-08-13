/* Prueba HUD de estilo del héroe: VPIP/PFR + 3bet/steal/cbet/AF. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON, parseFloat, parseInt, isNaN };
sandbox.global = sandbox;
vm.createContext(sandbox);

const importChain = [
  'import/hhUtils.js',
  'import/formatDetector.js',
  'import/icmLite.js', 'import/populationCompare.js',
  'import/parsers/pokerstars.js',
  'import/parsers/winamax.js', 'import/parsers/ggpoker.js',
  'import/parsers/eightyeight.js',
  'import/parsers/coinpoker.js',
  'import.js'
];

const scripts = [
  'cards.js', 'engine/cache.js', 'engine/format/taxonomy.js', 'engine/ranges/notation.js', 'engine/ranges/data.js',
  'engine/ranges/weights.js', 'engine/ranges/villainTracking.js', 'engine/handStrength.js',
  'engine/equity/madeHand.js', 'engine/math/potMath.js', 'engine/math/evMath.js', 'engine/equity/monteCarlo.js',
  'engine/solver/boardCluster.js', 'engine/solver/facingBet.js', 'engine/solver/spotKey.js',
  'engine/solver/strategyTables.js', 'engine/solver/bluffSpotDetector.js', 'engine/solver/SolverProvider.js',
  'engine/scoring/classifier.js', 'engine/scoring/icmEv.js', 'engine/scoring/evLoss.js', 'engine/scoring/scoring.js',
  'engine/scoring/errors.js', 'engine/explanations/rules.js',
  'engine/solver/LocalSolverProvider.js', 'engine/evaluateSpot.js',
  'ranges.js', 'engine.js'
].concat(importChain).concat(['stats-aggregate.js']);

scripts.forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), sandbox, { filename: f });
});
const { Importer, PTStatsAggregate } = sandbox.window;

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

assert(Importer.STYLE_IDEAL && Importer.STYLE_IDEAL.pfrMax === 24, 'STYLE_IDEAL.pfrMax=24');
assert(Importer.HUD_IDEAL === Importer.STYLE_IDEAL, 'HUD_IDEAL alias');

// Casos unitarios VPIP/PFR
const foldHand = {
  hero: 'H',
  streets: { preflop: [{ player: 'H', type: 'fold' }] }
};
assert(Importer.heroPreflopHud(foldHand).vpip === false, 'fold no es VPIP');
assert(Importer.heroPreflopHud(foldHand).pfr === false, 'fold no es PFR');

const limpHand = {
  hero: 'H',
  streets: { preflop: [{ player: 'H', type: 'call', amount: 0.03 }] }
};
assert(Importer.heroPreflopHud(limpHand).vpip === true, 'limp es VPIP');
assert(Importer.heroPreflopHud(limpHand).pfr === false, 'limp no es PFR');

const raiseHand = {
  hero: 'H',
  streets: {
    preflop: [
      { player: 'V', type: 'fold' },
      { player: 'H', type: 'raise', amount: 0.15, to: 0.15 }
    ]
  }
};
assert(Importer.heroPreflopHud(raiseHand).vpip === true, 'raise es VPIP');
assert(Importer.heroPreflopHud(raiseHand).pfr === true, 'raise es PFR');

const bbCheck = {
  hero: 'H',
  streets: {
    preflop: [
      { player: 'V', type: 'fold' },
      { player: 'H', type: 'check' }
    ]
  }
};
assert(Importer.heroPreflopHud(bbCheck).vpip === false, 'BB check no es VPIP');
assert(Importer.heroPreflopHud(bbCheck).pfr === false, 'BB check no es PFR');

const callRaise = {
  hero: 'H',
  streets: {
    preflop: [
      { player: 'V', type: 'raise', amount: 0.10, to: 0.15 },
      { player: 'H', type: 'call', amount: 0.10 }
    ]
  }
};
assert(Importer.heroPreflopHud(callRaise).vpip === true, 'call raise es VPIP');
assert(Importer.heroPreflopHud(callRaise).pfr === false, 'call raise no es PFR');

// Reconstrucción desde summary
const fromSummary = {
  hero: 'H',
  summary: [
    { kind: 'action', street: 'preflop', player: 'V', type: 'fold' },
    { kind: 'action', street: 'preflop', player: 'H', type: 'raise', amount: 0.15, to: 0.15 }
  ]
};
assert(Importer.heroPreflopHud(fromSummary).vpip === true, 'summary raise es VPIP');
assert(Importer.heroPreflopHud(fromSummary).pfr === true, 'summary raise es PFR');
assert(fromSummary.streets && fromSummary.streets.preflop.length === 2, 'summary reconstruye streets');

const assessHi = Importer.assessVpipPfr(35, 12, 200);
assert(assessHi.status === 'high' || assessHi.status === 'low' || assessHi.status === 'gap', 'assess desvío');
assert(/VPIP|PFR/.test(assessHi.comment), 'comentario menciona métricas');
const assessOk = Importer.assessVpipPfr(24, 18, 200);
assert(assessOk.status === 'ok', 'rango ideal ok, got ' + assessOk.status);
const assessLagPfr = Importer.assessVpipPfr(26, 23, 200);
assert(assessLagPfr.status === 'ok', 'PFR 23 ya no es alto, got ' + assessLagPfr.status);
const assessLowSample = Importer.assessVpipPfr(40, 5, 20);
assert(assessLowSample.status === 'low_sample', 'muestra baja suaviza coaching');

const trustLow = Importer.sampleTrust(10, 'threeBet');
assert(trustLow.level === 'low', 'sample trust low');
const trustHigh = Importer.sampleTrust(500, 'threeBet');
assert(trustHigh.level === 'high', 'sample trust high');

// 3-bet: hero faces open and re-raises
const threeBetHand = {
  hero: 'H',
  heroPos: 'BB',
  positions: { V: 'BTN', H: 'BB' },
  streets: {
    preflop: [
      { player: 'V', type: 'raise', amount: 0.10, to: 0.15 },
      { player: 'H', type: 'raise', amount: 0.35, to: 0.50 }
    ],
    flop: [], turn: [], river: []
  }
};
const tb = Importer.heroStyleHud(threeBetHand);
assert(tb.threeBetOpp === true, '3bet opp');
assert(tb.threeBet === true, '3bet hit');
assert(tb.foldToStealOpp === true, 'BB vs BTN también fold-to-steal opp');
assert(tb.foldToSteal === false, '3bet no es fold to steal');

// Fold to 3-bet: hero opens, villain 3bets, hero folds
const foldTo3betHand = {
  hero: 'H',
  heroPos: 'BTN',
  positions: { H: 'BTN', V: 'BB' },
  streets: {
    preflop: [
      { player: 'H', type: 'raise', amount: 0.12, to: 0.15 },
      { player: 'V', type: 'raise', amount: 0.35, to: 0.50 },
      { player: 'H', type: 'fold' }
    ],
    flop: [], turn: [], river: []
  }
};
const f3 = Importer.heroStyleHud(foldTo3betHand);
assert(f3.stealOpp === true && f3.steal === true, 'open BTN es steal');
assert(f3.foldToThreeBetOpp === true, 'fold to 3bet opp');
assert(f3.foldToThreeBet === true, 'fold to 3bet hit');

// Steal miss: BTN folds when folded to
const stealFold = {
  hero: 'H',
  heroPos: 'BTN',
  positions: { H: 'BTN', SB: 'SB', BB: 'BB' },
  streets: {
    preflop: [
      { player: 'H', type: 'fold' },
      { player: 'SB', type: 'fold' },
      { player: 'BB', type: 'check' }
    ],
    flop: [], turn: [], river: []
  }
};
const sf = Importer.heroStyleHud(stealFold);
assert(sf.stealOpp === true, 'steal opp al fold');
assert(sf.steal === false, 'fold no es steal');

// C-bet flop: hero PFR bets flop
const cbetHand = {
  hero: 'H',
  heroPos: 'BTN',
  positions: { H: 'BTN', V: 'BB' },
  streets: {
    preflop: [
      { player: 'H', type: 'raise', amount: 0.12, to: 0.15 },
      { player: 'V', type: 'call', amount: 0.10 }
    ],
    flop: [
      { player: 'V', type: 'check' },
      { player: 'H', type: 'bet', amount: 0.20 }
    ],
    turn: [], river: []
  }
};
const cb = Importer.heroStyleHud(cbetHand);
assert(cb.cbetFlopOpp === true, 'cbet opp');
assert(cb.cbetFlop === true, 'cbet hit');
assert(cb.afBets === 1, 'AF bets');

// Fold to c-bet: villain PFR bets, hero folds
const foldCbetHand = {
  hero: 'H',
  heroPos: 'BB',
  positions: { V: 'BTN', H: 'BB' },
  streets: {
    preflop: [
      { player: 'V', type: 'raise', amount: 0.12, to: 0.15 },
      { player: 'H', type: 'call', amount: 0.10 }
    ],
    flop: [
      { player: 'H', type: 'check' },
      { player: 'V', type: 'bet', amount: 0.20 },
      { player: 'H', type: 'fold' }
    ],
    turn: [], river: []
  }
};
const fc = Importer.heroStyleHud(foldCbetHand);
assert(fc.foldToCbetFlopOpp === true, 'fold to cbet opp');
assert(fc.foldToCbetFlop === true, 'fold to cbet hit');
assert(fc.cbetFlopOpp === false, 'caller no tiene cbet opp');

// Squeeze: open + call, hero re-raises
const squeezeHand = {
  hero: 'H',
  heroPos: 'BB',
  positions: { O: 'CO', C: 'BTN', H: 'BB' },
  streets: {
    preflop: [
      { player: 'O', type: 'raise', amount: 0.12, to: 0.15 },
      { player: 'C', type: 'call', amount: 0.15 },
      { player: 'H', type: 'raise', amount: 0.55, to: 0.70 }
    ],
    flop: [], turn: [], river: []
  }
};
const sq = Importer.heroStyleHud(squeezeHand);
assert(sq.threeBetOpp === true && sq.threeBet === true, 'squeeze cuenta como 3bet');
assert(sq.squeezeOpp === true && sq.squeeze === true, 'squeeze hit');

// Turn/river c-bet after flop c-bet
const barrelHand = {
  hero: 'H',
  heroPos: 'BTN',
  positions: { H: 'BTN', V: 'BB' },
  board: ['Ah', '7d', '2c', '9s', '3h'],
  heroNetBB: 5,
  streets: {
    preflop: [
      { player: 'H', type: 'raise', amount: 0.12, to: 0.15 },
      { player: 'V', type: 'call', amount: 0.10 }
    ],
    flop: [
      { player: 'V', type: 'check' },
      { player: 'H', type: 'bet', amount: 0.20 },
      { player: 'V', type: 'call', amount: 0.20 }
    ],
    turn: [
      { player: 'V', type: 'check' },
      { player: 'H', type: 'bet', amount: 0.50 },
      { player: 'V', type: 'call', amount: 0.50 }
    ],
    river: [
      { player: 'V', type: 'check' },
      { player: 'H', type: 'bet', amount: 1.20 },
      { player: 'V', type: 'call', amount: 1.20 }
    ]
  },
  shows: { H: ['As', 'Kd'], V: ['7c', '7h'] }
};
const br = Importer.heroStyleHud(barrelHand);
assert(br.cbetFlop === true, 'barrel flop cbet');
assert(br.cbetTurnOpp === true && br.cbetTurn === true, 'turn cbet');
assert(br.cbetRiverOpp === true && br.cbetRiver === true, 'river cbet');
assert(br.sawFlop === true, 'saw flop');
assert(br.wentToSd === true, 'went to SD');
assert(br.wonAtSd === true, 'won at SD');
assert(br.wonWhenSawFlop === true, 'won when saw flop');

// Ideales por formato
assert(Importer.styleIdealForFormat('9max').vpipMax === 22, '9max vpipMax');
assert(Importer.styleIdealForFormat('mtt').threeBetMin === 5, 'mtt 3bet');
assert(Importer.inferSessionFormat([{ heroPos: 'UTG1', positions: { A: 'UTG1', B: 'BB' } }]) === '9max', 'infer 9max');

// Sesión real (sample EN)
const txt = fs.readFileSync(path.join(__dirname, 'fixtures', 'PokerEN-sample.txt'), 'utf8');
const session = Importer.buildSession(Importer.parseSession(txt, 'PokerEN-sample.txt'), 'PokerEN-sample.txt');
assert(session.stats.vpipPct != null, 'vpipPct presente');
assert(session.stats.pfrPct != null, 'pfrPct presente');
assert(session.stats.vpipHands >= session.stats.pfrHands, 'VPIP >= PFR en manos');
assert(session.stats.vpipPfr && session.stats.vpipPfr.comment, 'comentario VPIP/PFR');
assert(session.stats.style, 'style object');
assert(session.stats.threeBetOpps != null, 'threeBetOpps');
assert(session.stats.cbetFlopOpps != null, 'cbetFlopOpps');
assert(session.stats.afCalls != null, 'afCalls');
assert(session.stats.styleAssess, 'styleAssess');
assert(session.stats.bbPer100 != null, 'bbPer100');
assert(session.stats.sawFlopN != null, 'sawFlopN');
assert(session.stats.byPosition, 'byPosition');
assert(session.stats.format, 'format');
assert(Array.isArray(session.stats.styleAssess.drills), 'drills array');
console.log('Sample VPIP', session.stats.vpipPct + '%', 'PFR', session.stats.pfrPct + '%',
  '3Bet', session.stats.threeBetPct, 'CBet', session.stats.cbetFlopPct, 'AF', session.stats.af,
  'WTSD', session.stats.wtsdPct, 'bb/100', session.stats.bbPer100,
  '| manos', session.stats.vpipHands + '/' + session.stats.nHands);

// PokerStars Zoom EN
const zoomTxt = fs.readFileSync(path.join(__dirname, 'fixtures', 'Poker91.txt'), 'utf8');
const zoom = Importer.buildSession(Importer.parseSession(zoomTxt, 'Poker91.txt'), 'Poker91.txt');
assert(zoom.hands.length === 200, 'Poker91: 200 manos, got ' + zoom.hands.length);
assert(zoom.stats.vpipPct != null, 'Poker91 vpipPct presente');
assert(zoom.stats.pfrPct != null, 'Poker91 pfrPct presente');
assert(zoom.stats.vpipHands > 0, 'Poker91 tiene manos VPIP');
assert(zoom.stats.pfrHands > 0, 'Poker91 tiene manos PFR');
assert(zoom.stats.vpipHands >= zoom.stats.pfrHands, 'Poker91 VPIP >= PFR');
assert(zoom.stats.vpipPct >= 15 && zoom.stats.vpipPct <= 35, 'Poker91 VPIP en rango plausible, got ' + zoom.stats.vpipPct);
assert(zoom.stats.pfrPct >= 10 && zoom.stats.pfrPct <= 30, 'Poker91 PFR en rango plausible, got ' + zoom.stats.pfrPct);
assert(zoom.stats.threeBetOpps > 0, 'Poker91 tiene 3bet opps');
assert(zoom.stats.style && zoom.stats.style.sample, 'Poker91 style.sample');
assert(zoom.stats.wtsdPct != null || zoom.stats.sawFlopN === 0, 'Poker91 wtsd o sin flops');
assert(zoom.stats.bbPer100 != null, 'Poker91 bbPer100');
assert(zoom.stats.byPosition && Object.keys(zoom.stats.byPosition).length > 0, 'Poker91 byPosition');
assert(zoom.stats.cbetTurnOpps != null, 'Poker91 cbetTurnOpps');
assert(zoom.stats.squeezeOpps != null, 'Poker91 squeezeOpps');

const stripped = JSON.parse(JSON.stringify(zoom));
stripped.hands.forEach((h) => { delete h.streets; });
const recomputed = Importer.computeStats(stripped.hands);
assert(recomputed.vpipPct === zoom.stats.vpipPct, 'recompute sin streets conserva vpipPct');
assert(recomputed.pfrPct === zoom.stats.pfrPct, 'recompute sin streets conserva pfrPct');
assert(recomputed.threeBetPct === zoom.stats.threeBetPct, 'recompute conserva 3bet');
assert(recomputed.cbetFlopPct === zoom.stats.cbetFlopPct, 'recompute conserva cbet');
assert(recomputed.wtsdPct === zoom.stats.wtsdPct, 'recompute conserva wtsd');
assert(recomputed.bbPer100 === zoom.stats.bbPer100, 'recompute conserva bbPer100');
console.log('Poker91 VPIP', zoom.stats.vpipPct + '%', 'PFR', zoom.stats.pfrPct + '%',
  '3Bet', zoom.stats.threeBetPct + '% (' + zoom.stats.threeBetHits + '/' + zoom.stats.threeBetOpps + ')',
  'CBet', zoom.stats.cbetFlopPct, 'TurnCB', zoom.stats.cbetTurnPct, 'AF', zoom.stats.af,
  'WTSD', zoom.stats.wtsdPct, 'bb/100', zoom.stats.bbPer100,
  '| manos', zoom.stats.vpipHands + '/' + zoom.stats.nHands);

// Agregados semanales
const st = { aggregates: PTStatsAggregate.defaultAggregates() };
PTStatsAggregate.applySessionStub(st, session);
const tot = PTStatsAggregate.sessionsTotal(st);
assert(tot.vpipPct === session.stats.vpipPct, 'total vpipPct');
assert(tot.pfrPct === session.stats.pfrPct, 'total pfrPct');
assert(tot.threeBetOpps === session.stats.threeBetOpps, 'total threeBetOpps');
assert(tot.threeBetPct === session.stats.threeBetPct, 'total threeBetPct');
assert(tot.bbPer100 === session.stats.bbPer100, 'total bbPer100');
assert(tot.sawFlopN === session.stats.sawFlopN, 'total sawFlopN');
const weekly = PTStatsAggregate.sessionWeeklySeries(st, 8);
const withHands = weekly.filter((w) => w.hands > 0);
assert(withHands.length >= 1, 'hay semana con manos');
assert(withHands[0].vpipPct != null, 'semana con vpipPct');
assert(withHands[0].pfrPct != null, 'semana con pfrPct');
assert(withHands[0].threeBetOpps != null, 'semana con threeBetOpps');
assert(withHands[0].bbPer100 != null, 'semana con bbPer100');

console.log('*** HUD estilo (fases A–D) OK ***');
