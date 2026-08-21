#!/usr/bin/env node
/**
 * Regresión: tipificación de mezcla alta + pot odds / EV coherentes.
 *
 * Caso reportado: fold ~42% marcado imprecisa; Equity 5% vs pot odds ~28%
 * pero el motor marcaba raise/call como +EV por betSize=0 al foldar.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const sandbox = { window: {}, console, Math, Date, Object, Array, Number, String, JSON, parseInt, isFinite };
vm.createContext(sandbox);

function load(rel) {
  const code = fs.readFileSync(path.join(root, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

[
  'js/engine/math/potMath.js',
  'js/engine/math/evMath.js',
  'js/engine/scoring/evLoss.js',
  'js/engine/scoring/classifier.js',
  'js/engine/scoring/errors.js',
  'js/engine/scoring/scoring.js'
].forEach(load);

const Ev = sandbox.window.GTOEvMath;
const Cls = sandbox.window.GTOClassifier;
const Loss = sandbox.window.GTOEvLoss;
const assertOk = (cond, msg) => { assert.ok(cond, msg); };

// --- Pot odds: bote 11.12, bet 7.49 → BE ≈ 28.7% (no ~38–40%) ---
(function potOddsBreakEven() {
  const potBefore = 11.12;
  const toCall = 7.49;
  const be = Ev.breakEvenEquity(potBefore, toCall);
  assertOk(Math.abs(be - 0.287) < 0.005, 'BE pot odds ≈ 28.7%, got ' + be);
  // Fórmula incorrecta call/potAfterBet ≈ 40% — no debe usarse como break-even
  const wrong = toCall / (potBefore + toCall);
  assertOk(wrong > 0.38 && wrong < 0.42, 'sanity call/pot ≈ 40%');
  assertOk(Math.abs(be - wrong) > 0.08, 'BE correcto ≠ call/pot');
  console.log('OK pot odds BE', Math.round(be * 1000) / 10 + '%');
})();

// --- Con equity 5%, fold es mejor que call; raise no es +EV gratis ---
(function equityFiveFoldBest() {
  const potBefore = 11.12;
  const toCall = 7.49;
  const eq = 0.05;
  const input = {
    street: 'turn',
    potBB: 18.61,
    potBeforeBB: potBefore,
    toCallBB: toCall,
    heroEquity: eq,
    chosenAction: 'fold',
    availableActions: ['fold', 'call', 'raise']
  };
  const ctx = Ev.buildActionContext(input, {});
  const callEV = Ev.actionEVMath('call', ctx);
  const foldEV = Ev.actionEVMath('fold', ctx);
  const raiseEV = Ev.actionEVMath('raise', ctx);
  assertOk(callEV < -1, 'call con 5% equity debe ser −EV, got ' + callEV);
  assertOk(foldEV === 0, 'fold EV = 0');
  assertOk(raiseEV < foldEV, 'raise no puede ser +EV con 5% y tamaño real, raise=' + raiseEV);
  const best = Ev.bestEvAction(['fold', 'call', 'raise'], ctx);
  assertOk(best.best === 'fold', 'mejor acción EV = fold, got ' + best.best + ' @' + best.bestEV);
  assertOk(best.bestEV <= 0.05, 'bestEV fold ≈ 0, got ' + best.bestEV);
  console.log('OK EV fold>call/raise con eq 5%', { callEV, raiseEV, best });
})();

// --- Fold 42% vs call 53%: no tipificar imprecisa ---
(function fold42NotImprecise() {
  const strat = { fold: 0.42, call: 0.53, raise: 0.05 };
  const acts = ['fold', 'call', 'raise'];
  const cls = Cls.classify(strat, 'fold', acts);
  assertOk(cls.cls === 'optima', 'freq 42% clasifica optima, got ' + cls.cls);
  const input = {
    street: 'turn',
    potBB: 18.61,
    potBeforeBB: 11.12,
    toCallBB: 7.49,
    heroEquity: 0.05,
    availableActions: acts,
    chosenAction: 'fold'
  };
  const ev = Loss.computeEvLoss('turn', cls.cls, 'fold', null, strat, 18.61, input);
  assertOk(ev.bestAction === 'fold' || ev.actionEV >= ev.bestEV - 0.05,
    'bestAction fold o empate, got ' + ev.bestAction + ' bestEV=' + ev.bestEV);
  assertOk(ev.mathParams.equityPct === 5, 'equityPct 5');
  assertOk(Math.abs(ev.mathParams.potOddsPct - 28.7) < 0.2, 'potOddsPct ~28.7');
  const rec = Cls.reconcileWithEv(cls.cls, 'fold', cls.best, ev, {
    freq: cls.freq,
    maxFreq: cls.maxFreq,
    legalStrategy: cls.legalStrategy,
    equity: 0.05
  });
  assertOk(rec.cls === 'optima' || rec.cls === 'aceptable',
    'fold 42% no imprecisa/error, got ' + rec.cls);
  assertOk(rec.cls !== 'imprecisa' && rec.cls !== 'error', 'no tipificar imprecisa');
  console.log('OK fold 42% →', rec.cls);
})();

// --- adjustStrategyForHand: Eq muy bajo vs BE → fold dominante ---
(function adjustShortEquity() {
  const raw = { fold: 0.42, call: 0.53, raise: 0.05 };
  const adj = Cls.adjustStrategyForHand(raw, {
    street: 'turn',
    potBB: 18.61,
    potBeforeBB: 11.12,
    toCallBB: 7.49,
    heroEquity: 0.05
  });
  assertOk(adj.fold > adj.call, 'tras ajuste fold > call, got fold=' + adj.fold + ' call=' + adj.call);
  console.log('OK adjustStrategy fold dominante', {
    fold: Math.round(adj.fold * 100),
    call: Math.round(adj.call * 100)
  });
})();

// --- CSS móvil: HUD no solapa asiento top-right ---
(function mobileHudCss() {
  const css = fs.readFileSync(path.join(root, 'css/styles.css'), 'utf8');
  assertOk(/table-train-hud[\s\S]{0,200}left:\s*8px/.test(css)
    || /\.table-train-hud\s*\{[^}]*left:\s*8px/.test(css),
    'HUD móvil anclado a la izquierda');
  assertOk(/seat-edge-right\s+\.seat-act-wrap/.test(css)
    && /top:\s*calc\(100%\s*\+\s*2px\)/.test(css),
    'acción villano bajo el asiento en móvil');
  console.log('OK CSS HUD/acción móvil');
})();

console.log('\n*** test-feedback-ev-mix OK ***');
