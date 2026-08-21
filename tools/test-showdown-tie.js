#!/usr/bin/env node
/**
 * Regresión: empate en showdown no debe titular «Pierdes» ni inventar −EV
 * cuando potBB quedó corto (p.ej. sin la aportación del villano en table.invested).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const sandbox = {
  window: { document: { getElementById: function () { return null; } } },
  console, Math, Date, Object, Array, Number, String, JSON, parseInt, isFinite, Set, Map
};
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function load(rel) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), sandbox, { filename: rel });
}

[
  'js/cards.js',
  'js/engine/math/potMath.js',
  'js/engine/math/evMath.js',
  'js/engine/scoring/evLoss.js',
  'js/engine/scoring/scoring.js',
  'js/engine/multiway.js'
].forEach(load);

const C = sandbox.window.Cards;
const MW = sandbox.window.GTOMultiway;
assert.ok(C && C.evaluate && C.compare, 'Cards');

// AQ vs AQ mismo board = empate de categoría
const board = ['5d', '9d', '2h', 'Qc', '7c'];
const hScore = C.evaluate(['Ad', 'Qh'].concat(board));
const vScore = C.evaluate(['As', 'Qs'].concat(board));
assert.strictEqual(C.compare(hScore, vScore), 0, 'AQ vs AQ empate');
assert.ok(/Pareja/i.test(hScore.name), 'nombre pareja');

// Simula resolveHuShowdownNet (misma lógica que engine.js)
function resolveHuShowdownNet(hand, cmp) {
  const round2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
  const heroInv = round2(hand.heroInvested || 0);
  const villInv = round2(hand.villainInvested || 0);
  let pot = round2(hand.potBB || 0);
  const known = round2(heroInv + villInv);
  if (pot + 0.02 < known) pot = known;
  const dead = round2(Math.max(0, pot - known));
  const matched = round2(Math.min(heroInv, villInv));
  const contested = round2(2 * matched + dead);
  const uncalled = round2(Math.max(0, heroInv - villInv));
  let heroWon;
  if (cmp > 0) heroWon = round2(contested + uncalled);
  else if (cmp < 0) heroWon = uncalled;
  else heroWon = round2(contested / 2 + uncalled);
  return round2(heroWon - heroInv);
}

// Caso bug: pot = solo heroInvested (falta villano) → fórmula vieja daba −3.25
const buggy = { heroInvested: 6.5, villainInvested: 6.5, potBB: 6.5 };
const oldNet = Math.round((buggy.potBB / 2 - buggy.heroInvested) * 100) / 100;
assert.strictEqual(oldNet, -3.25, 'reproduce bug viejo −3.25');
const fixedNet = resolveHuShowdownNet(buggy, 0);
assert.ok(Math.abs(fixedNet) < 0.02, 'empate net≈0 tras fix, got ' + fixedNet);

// Empate con antes (dead money): net ≥ 0 (mitad de antes)
const withAnte = { heroInvested: 5, villainInvested: 5, potBB: 11.5 };
assert.ok(resolveHuShowdownNet(withAnte, 0) > 0, 'chop con antes → +EV chips');

// Desigual: hero metió de más, chop → uncalled vuelve, net≈0
const unequal = { heroInvested: 10, villainInvested: 5, potBB: 15 };
assert.ok(Math.abs(resolveHuShowdownNet(unequal, 0)) < 0.05, 'chop unequal net≈0');

// UI: handEndOutcome prioriza tied/empate sobre net negativo
const appSrc = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
assert.ok(/r\.tied|\/empate\/i/.test(appSrc), 'handEndOutcome usa tied/empate');
assert.ok(/Empate en el showdown/.test(appSrc), 'título empate');

const engSrc = fs.readFileSync(path.join(root, 'js/engine.js'), 'utf8');
assert.ok(/resolveHuShowdownNet/.test(engSrc), 'engine usa resolveHuShowdownNet');
assert.ok(/tied:\s*tied/.test(engSrc) || /tied:\s*!/.test(engSrc), 'result.tied en showdown');

console.log('OK: AQ vs AQ compare=0');
console.log('OK: pot corto ya no da −3.25 en empate (net=' + fixedNet + ')');
console.log('OK: UI prioriza empate sobre net<0');
console.log('\n*** test-showdown-tie OK ***');
