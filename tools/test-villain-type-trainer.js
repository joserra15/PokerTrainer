#!/usr/bin/env node
/**
 * Entrenador: villainType fijo, scoreMode, Engine.newHand y buildSpotInput.
 * Ejecutar: node tools/test-villain-type-trainer.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');

const sandbox = createSandbox();
loadTrainer(sandbox);
const w = sandbox.window;
const PC = w.PTPlayConfig;
const VP = w.GTOVillainProfiles;
const Exploit = w.GTOHeroExploitAdjust;
const Eng = w.Engine;
const GTO = w.GTO;

assert.ok(PC && VP && Exploit && Eng && GTO, 'APIs trainer');

// --- UI contrato ---
assert.ok(/id="setup-group-villain-type"/.test(html), 'grupo tipo de rival en Avanzadas');
assert.ok(/id="setup-villain-type"/.test(html), 'chips tipo');
['random', 'tag', 'lag', 'nit', 'fish', 'maniac', 'pro'].forEach(function (id) {
  assert.ok(html.indexOf('data-val="' + id + '"') >= 0, 'chip ' + id);
});
assert.ok(/id="setup-group-score-mode"/.test(html), 'grupo scoreMode');
assert.ok(/id="setup-score-mode"/.test(html) && /hidden/.test(html), 'scoreMode oculto por defecto');
assert.ok(/Explotativo vs este rival/.test(html), 'copy explotativo');
assert.ok(/syncVillainTypeScoreModeUI/.test(app), 'sync UI scoreMode');
assert.ok(/activateSetupChip/.test(app), 'activateSetupChip compartido');
assert.ok(/villainType:/.test(app) && /scoreMode:/.test(app), 'readPlayConfig lee campos');

// --- normalize / label ---
const types = ['tag', 'lag', 'nit', 'fish', 'maniac', 'pro'];
types.forEach(function (t) {
  const c = PC.normalize({ villainType: t, scoreMode: 'exploit' });
  assert.strictEqual(c.villainType, t);
  if (t === 'pro') {
    assert.strictEqual(c.scoreMode, 'exploit', 'pro puede pedir exploit (adjust no-op)');
  } else {
    assert.strictEqual(c.scoreMode, 'exploit');
  }
  const lbl = PC.labelFor(c);
  assert.ok(/Tipo /i.test(lbl), 'label incluye tipo: ' + lbl);
});

const rnd = PC.normalize({ villainType: 'RANDOM', scoreMode: 'exploit' });
assert.strictEqual(rnd.villainType, 'random');
assert.strictEqual(rnd.scoreMode, 'gto');
assert.ok(!/Tipo /.test(PC.labelFor(rnd)), 'random no pinta Tipo');

assert.strictEqual(PC.normalizeVillainType('LAG'), 'lag');
assert.strictEqual(PC.normalizeVillainType(''), 'random');
assert.ok(PC.VILLAIN_TYPES.nit && PC.VILLAIN_TYPES.random);

// --- newHand fija arquetipo en todos los asientos ---
types.forEach(function (t) {
  const cfg = PC.normalize({
    formatHub: 'cash', gameType: 'cash6', scenario: 'rfi',
    practiceStreet: 'preflop', heroPos: 'BTN', handRange: 'playable',
    stackDepth: 'bb100', villainLevel: 'fish', villainType: t, scoreMode: 'exploit',
    actionMode: 'quick', allowMultiway: false
  });
  const hand = Eng.newHand({ seed: 4242 + t.charCodeAt(0) }, cfg);
  assert.ok(hand && hand.table, 'hand ' + t);
  assert.strictEqual(hand.table.forcedVillainType, t, 'forced ' + t);
  Object.keys(hand.table.profiles || {}).forEach(function (pos) {
    assert.strictEqual(hand.table.profiles[pos], t, t + ' seat ' + pos);
  });
  const input = Eng.buildSpotInput(hand, hand.current, null);
  assert.strictEqual(input.villainType, t, 'spot input type ' + t);
  assert.strictEqual(input.scoreMode, 'exploit');
});

// random + gto: no fuerza tipo
const cfgRnd = PC.normalize({
  formatHub: 'cash', gameType: 'cash6', scenario: 'rfi',
  practiceStreet: 'preflop', heroPos: 'BTN', villainLevel: 'pro',
  villainType: 'random', scoreMode: 'gto', actionMode: 'quick', allowMultiway: false
});
const handRnd = Eng.newHand({ seed: 99 }, cfgRnd);
assert.ok(!handRnd.table.forcedVillainType);
const inputRnd = Eng.buildSpotInput(handRnd, handRnd.current, null);
assert.strictEqual(inputRnd.scoreMode, 'gto');

// --- evaluateSpot: misma mano, fish vs gto cambia freqs ---
function flopInput(extra) {
  return Object.assign({
    spotKind: 'postflop',
    street: 'flop',
    position: 'BTN',
    vsPosition: 'BB',
    stackDepth: 100,
    board: ['As', '8h', '3c'],
    heroCards: ['Ad', '2d'],
    potBB: 6,
    toCallBB: 0,
    potBeforeBB: 6,
    initiative: 'aggressor',
    inPosition: true,
    availableActions: ['check', 'bet_33', 'bet_66', 'bet_100']
  }, extra || {});
}

const gtoEval = GTO.evaluateSpot(flopInput({ scoreMode: 'gto', villainType: 'fish', chosenAction: 'bet_66' }));
const fishEval = GTO.evaluateSpot(flopInput({ scoreMode: 'exploit', villainType: 'fish', chosenAction: 'bet_66' }));
assert.strictEqual(gtoEval.exploitApplied, false);
assert.ok(fishEval.exploitApplied);
assert.ok(fishEval.gtoStrategy, 'baseline GTO');
const gtoBet = (gtoEval.strategy.bet_66 || 0) + (gtoEval.strategy.bet_33 || 0) + (gtoEval.strategy.bet_100 || 0);
const fishBet = (fishEval.strategy.bet_66 || 0) + (fishEval.strategy.bet_33 || 0) + (fishEval.strategy.bet_100 || 0);
assert.ok(fishBet + 1e-9 >= gtoBet, 'fish value ≥ GTO bet mass');
assert.ok((fishEval.exploitReasons || []).length >= 1, 'reasons UI');

const airIn = flopInput({
  heroCards: ['7s', '6s'],
  board: ['Kh', '9d', '2c'],
  heroEquity: 0.18,
  chosenAction: 'check'
});
const airGto = GTO.evaluateSpot(Object.assign({}, airIn, { scoreMode: 'gto', villainType: 'nit' }));
const airNit = GTO.evaluateSpot(Object.assign({}, airIn, { scoreMode: 'exploit', villainType: 'nit' }));
const airFish = GTO.evaluateSpot(Object.assign({}, airIn, { scoreMode: 'exploit', villainType: 'fish' }));
assert.ok(airNit.exploitApplied && airFish.exploitApplied);
const nitBet = 1 - (airNit.strategy.check || 0);
const fishAirBet = 1 - (airFish.strategy.check || 0);
assert.ok(nitBet > fishAirBet, 'nit presiona air más que fish');

// TAG ≈ GTO (ajuste mínimo)
const tagLead = Exploit.adjustStrategy(
  { check: 0.4, bet_66: 0.6 },
  { scoreMode: 'exploit', villainType: 'tag', street: 'flop', toCallBB: 0, madeHandInfo: { tier: 'medium' } }
);
assert.ok(tagLead.applied);
assert.ok(Math.abs(tagLead.strategy.bet_66 - 0.6) < 0.12, 'TAG cerca de GTO');

// Preflop: 3-bet bluff vs fish baja, vs nit sube
const pfBluff = { fold: 0.4, call: 0.3, raise: 0.3 };
const fish3b = Exploit.adjustStrategy(pfBluff, {
  scoreMode: 'exploit', villainType: 'fish', street: 'preflop',
  toCallBB: 2.5, madeHandInfo: { tier: 'air' }, heroEquity: 0.22
});
const nit3b = Exploit.adjustStrategy(pfBluff, {
  scoreMode: 'exploit', villainType: 'nit', street: 'preflop',
  toCallBB: 2.5, madeHandInfo: { tier: 'air' }, heroEquity: 0.22
});
assert.ok(fish3b.strategy.raise < pfBluff.raise, 'fish: menos 3-bet bluff');
assert.ok(nit3b.strategy.raise > pfBluff.raise, 'nit: más 3-bet light');

// act() propaga flags a la decisión
const cfgAct = PC.normalize({
  formatHub: 'cash', gameType: 'cash6', scenario: 'rfi',
  practiceStreet: 'flop', heroPos: 'BTN', handRange: 'playable',
  stackDepth: 'bb100', villainType: 'fish', scoreMode: 'exploit',
  villainLevel: 'fish', actionMode: 'quick', allowMultiway: false
});
const handAct = Eng.newHand({ seed: 777 }, cfgAct);
if (handAct.current && handAct.current.options && handAct.current.options.length) {
  const first = handAct.current.options[0].id;
  const out = Eng.act(handAct, first);
  assert.ok(out.decision, 'decision');
  assert.ok(out.decision.scoreMode === 'exploit' || out.decision.gto, 'scoreMode o gto en decisión');
}

console.log('OK test-villain-type-trainer');
