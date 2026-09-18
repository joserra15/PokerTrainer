/**
 * tests: villain assist complexity + cache key helpers
 */
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function load(file) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const sandbox = { window: {}, console, Math };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox;
}

const g = load('js/tournament/villain-assist-complexity.js');
const Comp = g.PTVillainAssistComplexity;
assert.ok(Comp, 'PTVillainAssistComplexity');

/* Premium AA preflop → veto */
{
  const local = { freqs: { raise: 0.9, fold: 0.1 }, action: { id: 'raise' } };
  const seat = { cards: [{ code: 'As' }, { code: 'Ad' }] };
  g.PTTournamentVillainDecide = {
    handCode: function () { return 'AA'; }
  };
  const v = Comp.hardVeto({ street: 'preflop' }, local, seat, { street: 'preflop' });
  assert.strictEqual(v.veto, true, 'AA trivial veto');
}

/* Motor seguro */
{
  const v = Comp.hardVeto({}, { freqs: { fold: 0.85, call: 0.15 } }, null, null);
  assert.strictEqual(v.veto, true, 'motor seguro');
}

/* Impacto 0 en bote chico */
{
  const m = Comp.impactMult({ potBB: 3, stackBB: 80, effStackBB: 80, toCallBB: 0 });
  assert.strictEqual(m, 0, 'low impact skip');
}

/* Impacto alto en jam */
{
  const m = Comp.impactMult({ potBB: 20, stackBB: 25, effStackBB: 25, toCallBB: 24, facingJam: true });
  assert.ok(m >= 1, 'jam impact high');
}

/* Evaluate: below threshold early small pot already vetoed by impact */
{
  const ev = Comp.evaluate(
    { potBB: 4, stackBB: 100, street: 'flop', handBand: 'merge', freqs: { bet: 0.5, check: 0.5 }, mttPhase: 'hu' },
    { freqs: { bet: 0.5, check: 0.5 }, handBand: 'merge' },
    null,
    { street: 'flop' },
    'high'
  );
  assert.strictEqual(ev.shouldAssist, false, 'HU micro-pot no assist');
  assert.strictEqual(ev.reason, 'low_impact');
}

/* Level normalize */
assert.strictEqual(Comp.normalizeLevel('alta'), 'high');
assert.strictEqual(Comp.normalizeLevel('baja'), 'low');
assert.ok(Comp.isProPreset('mttPro'));
assert.ok(!Comp.isProPreset('easy'));

/* Cache module */
const g2 = load('js/tournament/villain-assist-cache.js');
const Cache = g2.PTVillainAssistCache;
assert.ok(Cache);
const key = Cache.buildKeyFromCtx({
  street: 'river',
  potBB: 40,
  stackBB: 30,
  toCallBB: 20,
  handBand: 'bluffcatch',
  formatHub: 'mtt',
  effectivePhase: 'bubble',
  board: ['As', 'Kd', '7c', '2h', '9s']
});
assert.ok(key.indexOf('bluffcatch') >= 0, 'key has band');
assert.ok(key.indexOf('bubble') >= 0 || key.indexOf('v1') >= 0, 'key built');

Cache.l1Set(key, { action: { id: 'fold' }, freqs: { fold: 1 }, samples: 1 });
assert.ok(Cache.l1Get(key), 'l1 hit');
Cache.clearL1();
assert.ok(!Cache.l1Get(key), 'l1 cleared');

console.log('ok villain-assist');
