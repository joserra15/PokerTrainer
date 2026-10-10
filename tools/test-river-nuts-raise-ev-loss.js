#!/usr/bin/env node
/**
 * Regresión: raise river con nuts (mezcla ~7%) no inventa −pot×0.25 bb
 * cuando EV acción = EV óptimo.
 *
 * Spot reportado (MTT LAB): AQ nuts en KJT84, vs bet ~81bb a pote ~204,
 * CALL 93% / RAISE 7% → «Aceptable» pero UI mostraba −50.93 bb (= ¼ bote)
 * contradiciendo «EV acción = óptimo +235bb».
 *
 * Run: node tools/test-river-nuts-raise-ev-loss.js
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
  'js/engine/math/potMath.js',
  'js/engine/math/evMath.js',
  'js/engine/scoring/errors.js',
  'js/engine/scoring/evLoss.js',
  'js/engine/scoring/classifier.js'
].forEach(function (f) { load(g, f); });

const Ev = g.GTOEvMath;
const Errors = g.GTOErrors;
const Loss = g.GTOEvLoss;
const Cls = g.GTOClassifier;
assert.ok(Ev && Errors && Loss && Cls, 'modules loaded');

const potBB = 203.73;
const toCallBB = 81;
const potBeforeBB = potBB - toCallBB;
const betSizeBB = 202.5;
const equity = 0.9743;
const strat = { call: 0.93, raise: 0.07 };
const input = {
  street: 'river',
  potBB: potBB,
  potBeforeBB: potBeforeBB,
  toCallBB: toCallBB,
  heroEquity: equity,
  betSizeBB: betSizeBB,
  chosenAction: 'raise',
  availableActions: ['fold', 'call', 'raise'],
  madeHandInfo: { tier: 'strong', category: 4, ev: { category: 4 } },
  band: 'nuts',
  heroRemainingBB: 250,
  boardWet: false
};

// 1) Facing raise: no marcar sizing_incoherente con ideal de lead.
const detected = Errors.detectErrors(Object.assign({}, input, { strategy: strat }));
assert.ok(
  !detected.some(function (e) { return e.type === 'sizing_incoherente'; }),
  'raise vs bet no debe marcar sizing_incoherente, got ' + JSON.stringify(detected)
);

// 2) Tipificación por frecuencia: raise 7% → imprecisa (antes de reconcile).
const cls = Cls.classify(strat, 'raise', input.availableActions);
assert.strictEqual(cls.best, 'call', 'call lidera la mezcla');
assert.ok(cls.freq < 0.15, 'raise residual en mezcla');

// 3) EV: raise es óptimo (o empatado); no inventar pot×0.25.
const ev = Loss.computeEvLoss('river', cls.cls, 'raise', 'AQs', strat, potBB, input);
assert.ok(ev.actionEV != null && ev.bestEV != null, 'EV calculado');
assert.ok(
  Math.abs(ev.bestEV - ev.actionEV) < 0.15,
  'raise debe empatar/óptimo EV, gap=' + (ev.bestEV - ev.actionEV)
);
assert.ok(
  !(ev.evLoss > 1),
  'sin fuga inventada pot×0.25 (got ' + ev.evLoss + ', pot/4=' + (potBB * 0.25) + ')'
);
assert.ok(!ev.evErroneous, 'evErroneous debe ser false cuando EV≈óptimo');
assert.ok(
  !(ev.mathParams && ev.mathParams.deltaEV > 1),
  'deltaEV no puede contradecir EV acción=óptimo, got ' + (ev.mathParams && ev.mathParams.deltaEV)
);

// 4) Tras reconcile: aceptable (nuts value), no error.
const rec = Cls.reconcileWithEv(cls.cls, 'raise', cls.best, ev, {
  freq: cls.freq,
  maxFreq: cls.maxFreq,
  legalStrategy: cls.legalStrategy,
  equity: equity,
  band: 'nuts',
  madeHandInfo: input.madeHandInfo,
  street: 'river'
});
assert.ok(
  rec.cls === 'aceptable' || rec.cls === 'optima',
  'raise nuts en mezcla → aceptable/óptima, got ' + rec.cls
);

console.log('OK river-nuts-raise-ev-loss', {
  actionEV: ev.actionEV,
  bestEV: ev.bestEV,
  evLoss: ev.evLoss,
  class: rec.cls,
  freq: Math.round(cls.freq * 100) + '%'
});
