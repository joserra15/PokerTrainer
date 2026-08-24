/**
 * Regresión: la acción marcada como "mejor" debe ser coherente con los % que ve
 * el usuario en el grid de opciones.
 *
 * Bugs reportados:
 *  1. River con 99: se marcaba «mejor: Check» (28 %) cuando la líder de la
 *     mezcla era Bet pot (35 %).
 *  2. Flop con AKs: veredicto «Aceptable» y «mejor: Bet 33%», que era justo la
 *     acción jugada por el héroe (y tampoco la de mayor frecuencia).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
let failed = 0;
function assert(cond, msg) {
  if (cond) console.log('OK:', msg);
  else { failed++; console.error('FAIL:', msg); }
}

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON, parseFloat, parseInt, isNaN };
sandbox.global = sandbox;
vm.createContext(sandbox);

const scripts = [
  'cards.js',
  'engine/cache.js', 'engine/format/taxonomy.js',
  'engine/ranges/notation.js',
  'engine/ranges/data.js',
  'engine/ranges/extended.js',
  'engine/ranges/variants.js', 'engine/ranges/pushFold.js',
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
  'engine/solver/strategyTables.js', 'engine/solver/bluffSpotDetector.js',
  'engine/solver/SolverProvider.js',
  'engine/scoring/classifier.js', 'engine/scoring/icmEv.js',
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
  'import/icmLite.js', 'import/populationCompare.js',
  'import/parsers/pokerstars.js',
  'import/parsers/winamax.js', 'import/parsers/ggpoker.js',
  'import/parsers/eightyeight.js',
  'import/parsers/coinpoker.js',
  'import.js'
];
scripts.forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), sandbox, { filename: f });
});

const Cls = sandbox.window.GTOClassifier;
const { Importer } = sandbox.window;
const POSTFLOP_ACTS = ['check', 'bet_33', 'bet_66', 'bet_100'];

function leaderOf(strategy) {
  let best = null;
  let max = -1;
  Object.keys(strategy).forEach((a) => { if (strategy[a] > max) { max = strategy[a]; best = a; } });
  return best;
}

// --- 1. Los dos casos reportados -------------------------------------------
{
  // River 99: BET POT 35 · BET 66 30 · CHECK 28 · BET 33 7, héroe apuesta 33%.
  const strat = { bet_100: 0.35, bet_66: 0.30, check: 0.28, bet_33: 0.07 };
  const cls = Cls.classify(strat, 'bet_33', POSTFLOP_ACTS);
  const rec = Cls.reconcileWithEv(cls.cls, 'bet_33', cls.best, {
    actionEV: 16.95, bestEV: 17.99, bestAction: 'check',
    evLoss: 0, evErroneous: false, evErrorReasons: []
  }, {
    freq: cls.freq, maxFreq: cls.maxFreq, legalStrategy: cls.legalStrategy, equity: 0.2984
  });
  assert(rec.best === 'bet_100',
    'river: mejor = líder de mezcla (bet_100 35%), no el check de 28% por EV; got ' + rec.best);
}
{
  // Flop AKs: BET POT 30 · BET 66 29 · CHECK 28 · BET 33 13, héroe apuesta 33%.
  const strat = { bet_100: 0.30, bet_66: 0.29, check: 0.28, bet_33: 0.13 };
  const cls = Cls.classify(strat, 'bet_33', POSTFLOP_ACTS);
  const rec = Cls.reconcileWithEv(cls.cls, 'bet_33', cls.best, {
    actionEV: 12.48, bestEV: 12.48, bestAction: 'bet_33',
    evLoss: 0, evErroneous: false, evErrorReasons: []
  }, {
    freq: cls.freq, maxFreq: cls.maxFreq, legalStrategy: cls.legalStrategy, equity: 0.4642
  });
  assert(rec.best === 'bet_100',
    'flop: empate de EV no promueve una acción residual (13%) a mejor; got ' + rec.best);
  assert(rec.best !== 'bet_33', 'flop: "mejor" nunca es la propia acción residual del héroe');
}

// --- 2. Barrido: mejor nunca por debajo del líder de la mezcla --------------
{
  const mixes = [
    { bet_100: 0.30, bet_66: 0.29, check: 0.28, bet_33: 0.13 },
    { bet_100: 0.35, bet_66: 0.30, check: 0.28, bet_33: 0.07 },
    { check: 0.78, bet_33: 0.11, bet_66: 0.07, bet_100: 0.04 },
    { check: 0.38, bet_33: 0.30, bet_66: 0.21, bet_100: 0.11 }
  ];
  let violations = 0;
  let cases = 0;
  mixes.forEach((strat) => {
    const leader = leaderOf(strat);
    POSTFLOP_ACTS.forEach((chosen) => {
      const cls = Cls.classify(strat, chosen, POSTFLOP_ACTS);
      POSTFLOP_ACTS.forEach((bestAction) => {
        [0, 0.05, 0.2, 1.04, 3].forEach((delta) => {
          [false, true].forEach((evErroneous) => {
            [0, 0.2, 1.5].forEach((evLoss) => {
              [0.2, 0.46, 0.96].forEach((equity) => {
                cases++;
                const rec = Cls.reconcileWithEv(cls.cls, chosen, cls.best, {
                  actionEV: 12 - delta, bestEV: 12, bestAction, evLoss, evErroneous, evErrorReasons: []
                }, {
                  freq: cls.freq, maxFreq: cls.maxFreq, legalStrategy: cls.legalStrategy, equity
                });
                if ((strat[rec.best] || 0) < (strat[leader] || 0) - 1e-9) violations++;
              });
            });
          });
        });
      });
    });
  });
  assert(violations === 0,
    'ningún "mejor" con menos frecuencia que el líder (' + cases + ' combinaciones, ' + violations + ' fallos)');
}

// --- 3. Call sin pot odds sigue recomendando fold ---------------------------
{
  const strat = { fold: 0.30, call: 0.55, raise: 0.15 };
  const acts = ['fold', 'call', 'raise'];
  const cls = Cls.classify(strat, 'call', acts);
  const rec = Cls.reconcileWithEv(cls.cls, 'call', cls.best, {
    actionEV: -2.1, bestEV: 0, bestAction: 'fold',
    evLoss: 2.1, evErroneous: true,
    evErrorReasons: [{ type: 'call_sin_odds' }]
  }, {
    freq: cls.freq, maxFreq: cls.maxFreq, legalStrategy: cls.legalStrategy, equity: 0.05
  });
  assert(rec.best === 'fold', 'call sin odds mantiene fold como mejor; got ' + rec.best);
}

// --- 4. Manos completas: best === opción con mayor % del grid ---------------
['bug-best-vs-mix-99.txt', 'bug-best-vs-mix-akhh.txt'].forEach((file) => {
  const hh = fs.readFileSync(path.join(__dirname, 'fixtures', file), 'utf8');
  const parsed = Importer.parseSession(hh, file);
  const analyzed = Importer.analyzeHand(parsed.hands[0]);
  (analyzed.decisions || []).forEach((d) => {
    const grid = d.optionBreakdown || [];
    if (!grid.length) return;
    const topPct = grid.reduce((m, o) => Math.max(m, o.pct || 0), 0);
    const bestOpt = grid.find((o) => o.id === d.best);
    assert(!!bestOpt, file + ' ' + d.street + ': "mejor" (' + d.best + ') está en el grid');
    assert(bestOpt && (bestOpt.pct || 0) >= topPct,
      file + ' ' + d.street + ': mejor=' + d.best + ' (' + (bestOpt && bestOpt.pct) + '%) es la de mayor % (' + topPct + '%)');
  });
});

// --- 5. UI: «mejor: X» no se imprime si X es la acción jugada ---------------
{
  const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
  assert(/function resolveBestId\(/.test(app), 'app.js expone resolveBestId para el grid y el texto');
  assert(/function betterActionHtml\(/.test(app), 'app.js centraliza el texto «mejor: X»');
  assert(!/mejor: \$\{actionName\(heroDec\.best\)\}/.test(app),
    'la timeline ya no imprime heroDec.best sin comprobar la mezcla ni la acción elegida');
  assert(/best === \(d\.chosen \|\| d\.action\)/.test(app),
    'betterActionHtml se calla cuando "mejor" coincide con lo jugado');
  assert(/const best = resolveBestId\(breakdown, bestId\)/.test(app),
    'renderOptionGrid pinta en verde la opción de mayor %');

  // Réplica de la lógica de resolveBestId sobre los casos reportados.
  function resolveBestId(breakdown, bestId) {
    if (!breakdown || !breakdown.length) return bestId;
    let top = breakdown[0];
    let current = null;
    breakdown.forEach((o) => {
      if ((o.pct || 0) > (top.pct || 0)) top = o;
      if (o.id === bestId) current = o;
    });
    if (current && (current.pct || 0) >= (top.pct || 0)) return current.id;
    return top ? top.id : bestId;
  }
  const legacyGrid = [
    { id: 'bet_100', pct: 35 }, { id: 'bet_66', pct: 30 },
    { id: 'check', pct: 28 }, { id: 'bet_33', pct: 7 }
  ];
  assert(resolveBestId(legacyGrid, 'check') === 'bet_100',
    'decisiones antiguas guardadas con best residual se repintan sobre el líder');
  assert(resolveBestId(legacyGrid, 'bet_100') === 'bet_100', 'best ya coherente se respeta');
  assert(resolveBestId([], 'check') === 'check', 'sin grid se conserva el best del motor');
}

if (failed) {
  console.error('\n*** TEST BEST-MIX-COHERENCE FALLÓ (' + failed + ') ***');
  process.exit(1);
}
console.log('\n*** TEST BEST-MIX-COHERENCE OK ***');
