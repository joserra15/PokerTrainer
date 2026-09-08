/* Cloud analysis hands: slimPayload / handSummary round-trip. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const sandbox = {
  window: { PT_E2E_MODE: true },
  console,
  Math,
  Date,
  Set,
  Map,
  JSON,
  Number,
  String,
  Object,
  Array,
  Promise
};
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'js/cloud-analysis.js'), 'utf8'),
  sandbox,
  { filename: 'cloud-analysis.js' }
);

const CA = sandbox.window.PTCloudAnalysis;
assert.ok(CA && CA.slimPayload && CA.handSummary, 'PTCloudAnalysis');

const hand = {
  id: 'ha-1',
  createdAt: '2026-09-07T12:00:00.000Z',
  savedName: 'CO AKo',
  heroPos: 'CO',
  heroCode: 'AKo',
  heroCards: ['As', 'Kd'],
  board: ['Ah', '7c', '2d'],
  handScore: 9.2,
  source: 'manual',
  aiAnalysis: { text: 'x' },
  coachThread: [{ id: 'c1', reportMarkdown: 'hola' }],
  decisions: [{
    street: 'preflop',
    action: 'raise',
    class: 'optima',
    optionBreakdown: { fold: 0, raise: 1 },
    explanation: 'narrative',
    context: 'spot',
    mathParams: { pot: 1.5 }
  }],
  streets: [{
    name: 'preflop',
    actions: [{
      action: 'raise',
      explanation: 'drop me',
      optionBreakdown: { x: 1 }
    }]
  }]
};

const slim = CA.slimPayload(hand);
assert.strictEqual(slim.id, 'ha-1');
assert.ok(!slim.decisions[0].optionBreakdown, 'sin optionBreakdown');
assert.ok(!slim.decisions[0].explanation, 'sin explanation');
assert.ok(!slim.decisions[0].context, 'sin context');
assert.ok(!slim.decisions[0].mathParams, 'sin mathParams');
assert.strictEqual(slim.decisions[0].class, 'optima');
assert.ok(!slim.streets[0].actions[0].explanation, 'streets slim');
assert.ok(slim.aiAnalysis, 'conserva aiAnalysis');

const summary = CA.handSummary(hand);
assert.strictEqual(summary.id, 'ha-1');
assert.strictEqual(summary.cloudOnly, true);
assert.strictEqual(summary.heroPos, 'CO');
assert.strictEqual(summary.hasAiAnalysis, true);
assert.strictEqual(summary.hasCoachThread, true);
assert.ok(!summary.decisions, 'summary sin decisions');

assert.strictEqual(CA.isReady(), false, 'E2E_MODE → cloud analysis not ready');

console.log('*** cloud-analysis OK (slim + summary) ***');
