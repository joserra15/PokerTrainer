/* Regresión: flop/turn no deben clonar frecuencias probe (Colorado 98s multiway). */
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

const { Importer, GTOStreetValidation: SV, GTOCache, GTOHandRank, GTOEquityMadeHand } = sandbox.window;
let failed = false;
function assert(cond, msg) {
  if (cond) console.log('OK:', msg);
  else { console.error('FAIL:', msg); failed = true; }
}

const hh = fs.readFileSync(path.join(__dirname, 'fixtures', 'bug-flop-turn-freq-colorado.txt'), 'utf8');
const parsed = Importer.parseHand(hh);
assert(parsed.hero === 'KazeDj', 'héroe = KazeDj');
assert(parsed.streets.turn.some((a) => a.player === 'BABA AU-RHUM' && a.type === 'bet'), 'turn: BABA apuesta (no check)');

let alertCount = 0;
let identicalCount = 0;
const RUNS = 25;
for (let i = 0; i < RUNS; i++) {
  GTOCache.clear();
  const analyzed = Importer.analyzeHand(Importer.parseHand(hh));
  const flop = analyzed.decisions.find((d) => d.street === 'flop' && d.toCallBB === 0);
  const turnProbe = analyzed.decisions.find((d) => d.street === 'turn' && d.toCallBB === 0);
  assert(!!flop && !!turnProbe, 'run ' + i + ': hay probe flop y turn');
  if (!flop || !turnProbe) break;

  const fpF = SV.frequencyFingerprint(flop.gto);
  const fpT = SV.frequencyFingerprint(turnProbe.gto);
  if (fpF === fpT) identicalCount++;
  if ((flop.renderAlert || '').includes('frecuencias idénticas')
    || (turnProbe.renderAlert || '').includes('frecuencias idénticas')) {
    alertCount++;
    console.error('ALERT run', i, 'flop', fpF, 'turn', fpT, turnProbe.renderAlert);
  }

  if (i === 0) {
    console.log('sample flop', fpF, 'eq', flop.heroEquity, 'tier', flop.madeHandTier);
    console.log('sample turn', fpT, 'eq', turnProbe.heroEquity, 'tier', turnProbe.madeHandTier);
    assert(!!turnProbe.madeHandTier || !!turnProbe.handRank, 'decisión turn expone madeHandTier/handRank');
    assert(
      analyzed.summary.filter((x) => x.street === 'turn' && x.type === 'bet').length >= 1,
      'timeline turn incluye bet de BABA'
    );
  }
}

assert(alertCount === 0, 'sin Error de Renderizado frecuencias idénticas en ' + RUNS + ' runs (visto ' + alertCount + ')');
assert(identicalCount === 0, 'flop/turn fingerprints distintos en ' + RUNS + ' runs (idénticos ' + identicalCount + ')');

// HandRank: pareja de board no es aire
const madeTurn = GTOEquityMadeHand.classifyMadeHand(['9h', '8h'], ['Jd', '5c', '6d', 'Jh']);
assert(madeTurn.ev.category >= 1, 'turn 98s en JJ56 = al menos pareja');
const hr = GTOHandRank.bandFromPercentile(0, 0.17, madeTurn);
assert(hr === 'bluffcatch', 'HandRank: pareja hecha con pct bajo → bluffcatch, no air (got ' + hr + ')');

// Benign: check 0.878 (fingerprint 88%) no debe alertar
const benign = SV.validateConsecutiveProbeStreets(
  { street: 'flop', gto: { check: 0.878, bet_33: 0.06, bet_66: 0.04, bet_100: 0.02 }, board: ['Jd', '5c', '6d'] },
  { street: 'turn', gto: { check: 0.878, bet_33: 0.06, bet_66: 0.04, bet_100: 0.02 }, board: ['Jd', '5c', '6d', 'Jh'] },
  0
);
assert(benign.ok === true, 'check 87.8% redondeado a 88% = benigno (no falso positivo)');

if (failed) {
  console.error('\n*** TEST FLOP-TURN FREQ DUPLICATE FALLÓ ***');
  process.exit(1);
}
console.log('\n*** TEST FLOP-TURN FREQ DUPLICATE OK ***');
