/**
 * Regresión HU: all-in residual (0.2 bb) en board húmedo no debe inventar
 * −8.82 bb (= ¼ del bote 35.26). Informe «peores manos» vs detalle 10/10.
 * Run: node tools/test-dust-allin-ev-loss.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');

function createSandbox() {
  const sandbox = {
    console, Math, Date, JSON, parseFloat, parseInt, isNaN, isFinite,
    Array, Object, String, Number, Boolean, Error, RegExp, Set, Map
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

function load(sandbox, rel) {
  const abs = path.join(ROOT, rel);
  vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: path.basename(rel) });
}

const g = createSandbox();
[
  'js/engine/math/evMath.js',
  'js/engine/scoring/errors.js',
  'js/engine/scoring/evLoss.js',
  'js/engine/scoring/scoring.js',
  'js/tournament/leaks-bridge.js'
].forEach(function (f) { load(g, f); });

const Errors = g.GTOErrors;
const EvLoss = g.GTOEvLoss;
const Scoring = g.GTOScoring;
const LB = g.PTTournamentLeaksBridge;

assert.ok(Errors && EvLoss && Scoring && LB, 'modules loaded');

// Spot del reporte: QJo BB, turn, all-in 0.2 bb, pot 35.26 bb, board húmedo.
const potBB = 35.26;
const betSizeBB = 0.2;
const input = {
  potBB: potBB,
  betSizeBB: betSizeBB,
  heroRemainingBB: 0.2,
  toCallBB: 0,
  potBeforeBB: potBB,
  street: 'turn',
  boardWet: true,
  chosenAction: 'allin',
  strategy: { check: 0.92, allin: 0.08 },
  madeHandInfo: { tier: 'strong' },
  heroEquity: 0.62
};

const detected = Errors.detectErrors(Object.assign({}, input, { strategy: input.strategy }));
assert.ok(!detected.some(function (e) { return e.type === 'sizing_incoherente'; }),
  'dust all-in no debe marcar sizing_incoherente, got ' + JSON.stringify(detected));
assert.ok(!detected.some(function (e) { return e.type === 'valor_insuficiente'; }),
  'dust all-in no debe marcar valor_insuficiente');

const ev = EvLoss.computeEvLoss('turn', 'imprecisa', 'allin', 'QJo', input.strategy, potBB, input);
assert.ok(ev.evLoss <= betSizeBB + 0.05,
  'fuga dust ≤ fichas arriesgadas (0.2), got ' + ev.evLoss);
assert.ok(ev.evLoss < 1, 'nunca inventar ~8.82 bb (= pot/4), got ' + ev.evLoss);

// Informe peores manos: mano 10/10 no aparece aunque totalEvLoss stale.
const perfect = {
  id: 'trn_x_h50',
  handIndex: 50,
  heroCode: 'QJo',
  heroPos: 'BB',
  totalEvLoss: 0,
  handScore: 10,
  handScoreMeta: Scoring.scoreHand([
    { class: 'optima', evLoss: 0, evErroneous: false },
    { class: 'optima', evLoss: 0, evErroneous: false }
  ], 0),
  decisions: [
    { street: 'preflop', class: 'optima', label: 'Raise to 7.5 bb', evLoss: 0, evErroneous: false },
    { street: 'turn', class: 'optima', label: 'All-in 0.2 bb', evLoss: 0, evErroneous: false }
  ],
  playersLeft: 2,
  placesPaid: 2,
  tableMax: 2,
  mttPhase: 'hu'
};
assert.strictEqual(perfect.handScoreMeta.allOptimal, true, 'allOptimal');
assert.strictEqual(perfect.handScoreMeta.score, 10, 'nota 10');

const staleBug = Object.assign({}, perfect, {
  totalEvLoss: 8.82,
  handScoreMeta: Scoring.scoreHand(perfect.decisions, 0),
  decisions: [
    perfect.decisions[0],
    {
      street: 'turn',
      class: 'error',
      label: 'All-in 0.2 bb',
      evLoss: 8.82,
      evErroneous: true,
      mttPhase: 'hu'
    }
  ]
});
/* Tras el fix de EV, un dust jam no debería generar 8.82; si el handScoreMeta
   dice allOptimal + EV≈0, el informe no la lista como peor. */
const reportPerfect = LB.topWorstHands({
  sessionHands: [perfect],
  config: { seatsPerTable: 2, placesPaid: 2 }
}, 3);
assert.strictEqual(reportPerfect.length, 0, 'mano 10/10 no es «peor mano»');

const reportLeak = LB.topWorstHands({
  sessionHands: [staleBug],
  config: { seatsPerTable: 2, placesPaid: 2 }
}, 3);
assert.ok(reportLeak.length >= 1, 'sigue listando leaks reales');
assert.ok(reportLeak[0].totalEvLoss < 2 || reportLeak[0].worstLabel,
  'leak real sigue visible');

console.log('OK dust-allin-ev-loss (evLoss=' + ev.evLoss + ' bb)');
