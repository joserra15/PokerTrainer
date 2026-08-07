/* RG-D02 — slimPayload / sessionSummary round-trip sin perder manos/stats. */
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
  fs.readFileSync(path.join(__dirname, '..', 'js/cloud-sessions.js'), 'utf8'),
  sandbox,
  { filename: 'cloud-sessions.js' }
);

const CS = sandbox.window.PTCloudSessions;
assert.ok(CS && CS.slimPayload && CS.sessionSummary, 'PTCloudSessions');

const session = {
  id: 'ses-roundtrip-1',
  fileName: 'Winamax-sample.txt',
  hero: 'HeroNick',
  createdAt: '2026-06-01T12:00:00.000Z',
  nTotal: 2,
  nDiscarded: 0,
  analysisVersion: 3,
  rawText: 'SECRET HAND HISTORY SHOULD BE STRIPPED',
  stats: {
    nHands: 2,
    accuracy: 100,
    netBB: 1.5,
    evLossBB: 0.2,
    grade: { letter: 'A', score: 9 }
  },
  hands: [
    {
      id: '1001',
      heroCode: 'AKo',
      heroPos: 'CO',
      heroNetBB: 2,
      totalEvLoss: 0,
      decisions: [{
        street: 'preflop',
        action: 'raise',
        class: 'optima',
        optionBreakdown: { fold: 0, raise: 1 },
        explanation: 'narrative',
        context: 'spot context',
        mathParams: { pot: 1 }
      }]
    },
    {
      id: '1002',
      heroCode: '22',
      heroPos: 'BB',
      heroNetBB: -0.5,
      totalEvLoss: 0.2,
      decisions: [{ street: 'flop', action: 'fold', class: 'aceptable' }]
    }
  ]
};

const slim = CS.slimPayload(session);
assert.ok(!slim.rawText, 'slim quita rawText');
assert.strictEqual(slim.hands.length, 2, 'conserva manos');
assert.strictEqual(slim.stats.nHands, 2);
assert.strictEqual(slim.stats.evLossBB, 0.2);
assert.ok(!slim.hands[0].decisions[0].optionBreakdown, 'sin optionBreakdown');
assert.ok(!slim.hands[0].decisions[0].explanation, 'sin explanation');
assert.ok(!slim.hands[0].decisions[0].context, 'sin context');
assert.ok(!slim.hands[0].decisions[0].mathParams, 'sin mathParams');
assert.strictEqual(slim.hands[0].decisions[0].class, 'optima', 'conserva class');
assert.strictEqual(slim.hands[1].id, '1002');

// Round-trip JSON
const restored = JSON.parse(JSON.stringify(slim));
assert.strictEqual(restored.id, session.id);
assert.strictEqual(restored.hands.length, session.hands.length);
assert.deepStrictEqual(
  restored.hands.map((h) => h.id),
  session.hands.map((h) => h.id)
);
assert.strictEqual(restored.stats.accuracy, 100);

const summary = CS.sessionSummary(session);
assert.strictEqual(summary.id, session.id);
assert.strictEqual(summary.fileName, 'Winamax-sample.txt');
assert.strictEqual(summary.nTotal, 2);
assert.strictEqual(summary.hasTxt, false);
assert.strictEqual(summary.cloudOnly, true);
assert.ok(summary.stats && summary.stats.nHands === 2);

assert.strictEqual(CS.isReady(), false, 'E2E_MODE → cloud sessions not ready');

console.log('*** cloud-sessions OK (slim + summary round-trip) ***');
