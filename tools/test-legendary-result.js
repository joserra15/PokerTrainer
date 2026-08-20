'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const root = path.join(__dirname, '..');
const catalogSrc = fs.readFileSync(path.join(root, 'js/legendary-hands-catalog.js'), 'utf8');
const forceSrc = fs.readFileSync(path.join(root, 'js/legendary-force.js'), 'utf8');
const resultSrc = fs.readFileSync(path.join(root, 'js/legendary-result.js'), 'utf8');

const sandbox = createSandbox();
sandbox.window = sandbox;
loadTrainer(sandbox);
vm.runInContext(catalogSrc, sandbox);
vm.runInContext(forceSrc, sandbox);
vm.runInContext(resultSrc, sandbox);

const Engine = sandbox.Engine;
const cat = sandbox.PTLegendaryCatalog;
const Force = sandbox.PTLegendaryForce;
const Result = sandbox.PTLegendaryResult;

assert.ok(Result, 'PTLegendaryResult');

function normAction(a) {
  if (!a) return '';
  if (a === 'bet' || String(a).indexOf('bet_') === 0) return 'bet';
  if (['open', 'allin', '3bet', '4bet'].includes(a)) return 'raise';
  return a;
}

function pickActionId(hand, scriptAct) {
  const opts = (hand.current && hand.current.options) || [];
  const ids = opts.map(function (o) { return o.id; });
  const want = normAction(scriptAct.action);
  if (want === 'fold') return 'fold';
  if (want === 'check' && ids.indexOf('check') >= 0) return 'check';
  if (want === 'call' && ids.indexOf('call') >= 0) return 'call';
  if (want === 'raise') {
    return ids.find(function (x) { return ['raise', '3bet', '4bet', 'allin'].indexOf(x) >= 0; }) || 'raise';
  }
  if (want === 'bet') {
    return ids.find(function (x) { return x === 'bet' || x.indexOf('bet_') === 0; }) ||
      ids.find(function (x) { return x === 'raise'; }) || 'raise';
  }
  throw new Error('no action for ' + want);
}

function playScript(handDef, heroId) {
  var force = Force.toForce(handDef, heroId);
  var pc = Force.playConfig(handDef, heroId);
  var script = force.forceScript;
  var hand = Engine.newHand(force, pc);
  var steps = 0;
  while (hand.stage !== 'complete' && steps++ < 60) {
    if (!hand.current || !hand.current.options || !hand.current.options.length) break;
    if (!hand._script || !hand._script.active) break;
    var acts = script.actions;
    var idx = hand._script.idx;
    if (idx >= acts.length || acts[idx].pos !== script.heroPos) break;
    Engine.act(hand, pickActionId(hand, acts[idx]));
  }
  return hand;
}

cat.list().forEach(function (h) {
  (h.heroCandidates || []).forEach(function (hid) {
    var hist = Result.historicalOutcomeBucket(h, hid);
    assert.ok(hist === 'won' || hist === 'lost', 'historical outcome ' + h.id + '/' + hid + ' = ' + hist);

    var hand = playScript(h, hid);
    var scriptActs = (Force.toForce(h, hid).forceScript.actions || [])
      .filter(function (a) { return a.pos === Force.toForce(h, hid).forceScript.heroPos; });
    var analysis = Result.comparePlay(hand, h, hid);
    if ((hand.decisions || []).length === scriptActs.length) {
      assert.ok(analysis.playedSameLine, 'full script play = same line: ' + h.id + '/' + hid);
      assert.ok(analysis.canShare, 'full script play can share: ' + h.id + '/' + hid);
    }

    var quiz = Result.buildQuizOptions(h, hid, cat.list());
    assert.strictEqual(quiz.length, 3, 'quiz 3 options');
    assert.strictEqual(quiz.filter(function (o) { return o.correct; }).length, 1, 'one correct');
  });
});

(function () {
  var h = cat.get('LH-2022-EPT-MC-100K-CALL-J8');
  var force = Force.toForce(h, 'adrian-mateos');
  var pc = Force.playConfig(h, 'adrian-mateos');
  var hand = Engine.newHand(force, pc);
  Engine.act(hand, 'call');
  Engine.act(hand, 'fold');
  var analysis = Result.comparePlay(hand, h, 'adrian-mateos');
  assert.ok(!analysis.playedSameLine, 'fold early != same line');
  assert.ok(analysis.historicalOutcome === 'won', 'Mateos historical won');
  assert.ok(analysis.playerOutcome === 'lost', 'fold = lost');
})();

(function () {
  var msg = Result.buildResultMessage({ playedSameLine: true, sameOutcome: false }, cat.get('LH-2022-EPT-MC-100K-CALL-J8'), 'adrian-mateos');
  assert.ok(/Mateos/.test(msg.title) || /igual/i.test(msg.body), 'message mentions star');
})();

console.log('test-legendary-result: OK');
