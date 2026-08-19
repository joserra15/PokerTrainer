'use strict';
/**
 * Regresión manos legendarias: cada mano × cada rol, siguiendo el guion real.
 * Verifica que el villano ejecuta la línea histórica mientras el héroe no se desvía.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const root = path.join(__dirname, '..');
const catalogSrc = fs.readFileSync(path.join(root, 'js/legendary-hands-catalog.js'), 'utf8');
const forceSrc = fs.readFileSync(path.join(root, 'js/legendary-force.js'), 'utf8');

const sandbox = createSandbox();
sandbox.window = sandbox;
loadTrainer(sandbox);
vm.runInContext(catalogSrc, sandbox);
vm.runInContext(forceSrc, sandbox);

const w = sandbox;
const Engine = w.Engine;
const cat = w.PTLegendaryCatalog;
const Force = w.PTLegendaryForce;

assert.ok(Engine && cat && Force, 'engine + legendary modules');

function normAction(a) {
  if (!a) return '';
  if (a === 'bet' || (typeof a === 'string' && a.indexOf('bet_') === 0)) return 'bet';
  if (a === 'open' || a === 'allin' || a === '3bet' || a === '4bet') return 'raise';
  return a;
}

function pickActionId(hand, scriptAct) {
  const opts = (hand.current && hand.current.options) || [];
  const ids = opts.map(function (o) { return o.id; });
  const want = normAction(scriptAct.action);

  if (want === 'fold') return 'fold';
  if (want === 'check') {
    assert.ok(ids.indexOf('check') >= 0, 'check disponible en ' + hand.stage);
    return 'check';
  }
  if (want === 'call') {
    assert.ok(ids.indexOf('call') >= 0, 'call disponible en ' + hand.stage);
    return 'call';
  }
  if (want === 'raise') {
    if (hand.stage === 'preflop') {
      if (ids.indexOf('raise') >= 0) return 'raise';
      if (ids.indexOf('3bet') >= 0) return '3bet';
      if (ids.indexOf('4bet') >= 0) return '4bet';
      if (ids.indexOf('allin') >= 0) return 'allin';
    }
    if (ids.indexOf('raise') >= 0) return 'raise';
    var raiseOpt = opts.find(function (o) { return o.id.indexOf('raise') === 0; });
    if (raiseOpt) return raiseOpt.id;
  }
  if (want === 'bet') {
    if (ids.indexOf('bet') >= 0) return 'bet';
    var betOpt = opts.find(function (o) { return o.id.indexOf('bet_') === 0; });
    if (betOpt) return betOpt.id;
    // River shove/overbet: usar raise si no hay sizing de bet
    if (ids.indexOf('raise') >= 0) return 'raise';
    if (ids.indexOf('allin') >= 0) return 'allin';
  }
  throw new Error('No action id for ' + want + ' on ' + hand.stage + ' opts=' + ids.join(','));
}

function heroScriptActions(script, heroPos) {
  return (script.actions || []).filter(function (a) { return a.pos === heroPos; });
}

function nextHeroScriptAction(hand, script) {
  if (!hand._script || !hand._script.active) return null;
  var acts = script.actions || [];
  var idx = hand._script.idx;
  if (idx >= acts.length || acts[idx].pos !== script.heroPos) return null;
  return acts[idx];
}

function playScript(handDef, heroId) {
  var handRecord = handDef;
  var force = Force.toForce(handRecord, heroId);
  var pc = Force.playConfig(handRecord, heroId);
  assert.ok(force && force.forceScript, 'forceScript ' + handRecord.id + '/' + heroId);

  var script = force.forceScript;
  var hand = Engine.newHand(force, pc);
  assert.ok(hand._script && hand._script.active, 'guion activo al inicio: ' + handRecord.id + '/' + heroId);

  var heroIdx = 0;
  var steps = 0;
  var villainBets = [];

  while (hand.stage !== 'complete' && steps < 60) {
    steps++;
    if (!hand.current || !hand.current.options || !hand.current.options.length) break;

    var expected = nextHeroScriptAction(hand, script);
    if (!expected) break;

    if (expected.street && hand.stage !== 'preflop' && expected.street !== hand.stage) {
      break;
    }

    var actionId = pickActionId(hand, expected);
    var beforeStage = hand.stage;

    Engine.act(hand, actionId);
    heroIdx++;

    if (hand.villainAction) {
      var vType = hand.villainAction.type;
      if (vType === 'bet' || vType === 'raise') {
        villainBets.push({ street: beforeStage, type: vType });
      }
    }
  }

  assert.ok(heroIdx > 0, 'al menos una acción héroe: ' + handRecord.id + '/' + heroId);
  assert.ok(hand._script && hand._script.active,
    'guion debe seguir activo siguiendo la línea real: ' + handRecord.id + '/' + heroId);

  return { hand: hand, villainBets: villainBets, heroIdx: heroIdx };
}

var hands = cat.list();
assert.ok(hands.length >= 10, 'catalog hands');

hands.forEach(function (h) {
  (h.heroCandidates || []).forEach(function (hid) {
    var result = playScript(h, hid);
    assert.ok(result.heroIdx > 0, 'al menos una acción héroe: ' + h.id + '/' + hid);

    // EPT Monte Carlo: Mateos debe pagar 3 barrels
    if (h.id === 'LH-2022-EPT-MC-100K-CALL-J8' && hid === 'adrian-mateos') {
      var barrelStreets = result.villainBets.map(function (b) { return b.street; });
      assert.ok(barrelStreets.indexOf('flop') >= 0, 'barrel flop EPT Mateos');
      assert.ok(barrelStreets.indexOf('turn') >= 0, 'barrel turn EPT Mateos (regresión principal)');
      assert.ok(barrelStreets.indexOf('river') >= 0, 'barrel river EPT Mateos');
    }
  });
});

// Desvío grande → villano GTO (guion desactivado)
(function () {
  var h = cat.get('LH-2022-EPT-MC-100K-CALL-J8');
  var force = Force.toForce(h, 'adrian-mateos');
  var pc = Force.playConfig(h, 'adrian-mateos');
  var hand = Engine.newHand(force, pc);
  Engine.act(hand, 'call');
  Engine.act(hand, 'fold');
  assert.ok(!hand._script || !hand._script.active, 'guion off tras fold vs barrels');
})();

console.log('test-legendary-playthrough: OK (' + hands.length + ' hands × roles)');
