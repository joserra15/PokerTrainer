/* Prueba VPIP / PFR en importación de sesiones. */
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

// Casos unitarios de heroPreflopHud
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

const assessHi = Importer.assessVpipPfr(35, 12);
assert(assessHi.status === 'high' || assessHi.status === 'low' || assessHi.status === 'gap', 'assess desvío');
assert(/VPIP|PFR/.test(assessHi.comment), 'comentario menciona métricas');
const assessOk = Importer.assessVpipPfr(24, 18);
assert(assessOk.status === 'ok', 'rango ideal ok, got ' + assessOk.status);

// Sesión real
const txt = fs.readFileSync(path.join(__dirname, 'fixtures', 'PokerEN-sample.txt'), 'utf8');
const session = Importer.buildSession(Importer.parseSession(txt, 'PokerEN-sample.txt'), 'PokerEN-sample.txt');
assert(session.stats.vpipPct != null, 'vpipPct presente');
assert(session.stats.pfrPct != null, 'pfrPct presente');
assert(session.stats.vpipHands >= session.stats.pfrHands, 'VPIP >= PFR en manos');
assert(session.stats.vpipPfr && session.stats.vpipPfr.comment, 'comentario VPIP/PFR');
console.log('Sample VPIP', session.stats.vpipPct + '%', 'PFR', session.stats.pfrPct + '%',
  '| manos', session.stats.vpipHands + '/' + session.stats.nHands);

// Agregados semanales
const st = { aggregates: PTStatsAggregate.defaultAggregates() };
PTStatsAggregate.applySessionStub(st, session);
const tot = PTStatsAggregate.sessionsTotal(st);
assert(tot.vpipPct === session.stats.vpipPct, 'total vpipPct');
assert(tot.pfrPct === session.stats.pfrPct, 'total pfrPct');
const weekly = PTStatsAggregate.sessionWeeklySeries(st, 8);
const withHands = weekly.filter((w) => w.hands > 0);
assert(withHands.length >= 1, 'hay semana con manos');
assert(withHands[0].vpipPct != null, 'semana con vpipPct');
assert(withHands[0].pfrPct != null, 'semana con pfrPct');

console.log('*** VPIP/PFR OK ***');
