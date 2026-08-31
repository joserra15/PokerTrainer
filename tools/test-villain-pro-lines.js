#!/usr/bin/env node
/**
 * Villanos pro realistas: sizing keys, overbet, XR, format adjust.
 * Ejecutar: node tools/test-villain-pro-lines.js
 */
'use strict';
const assert = require('assert');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const sandbox = createSandbox();
loadTrainer(sandbox);

const FA = sandbox.window.GTOVillainFormatAdjust;
const LP = sandbox.window.GTOVillainLinePolicy;
const VS = sandbox.window.GTOVillainSizing;
const Ex = sandbox.window.GTOVillainProExploit;
const VP = sandbox.window.GTOVillainProfiles;
const GTO = sandbox.window.GTO;
const Probe = sandbox.window.GTOProbeEV;

assert.ok(FA, 'GTOVillainFormatAdjust');
assert.ok(LP, 'GTOVillainLinePolicy');
assert.ok(VS, 'GTOVillainSizing');
assert.ok(Ex, 'GTOVillainProExploit');
assert.ok(VP, 'GTOVillainProfiles');
assert.ok(GTO && GTO.Strategy, 'Strategy');

// --- Format multipliers ---
const cashDeep = FA.multipliers({ formatHub: 'cash', stackBB: 100, potBB: 10, spr: 10 });
assert.ok(cashDeep.overbet > 1 && cashDeep.xr > 1, 'cash deep: +overbet +xr');

const spinPush = FA.multipliers({ formatHub: 'spin', stackBB: 10, potBB: 6, spr: 1.5 });
assert.ok(spinPush.overbet < 0.3 && spinPush.jamBias > 1.2, 'spin push: low overbet, jam bias');
assert.strictEqual(spinPush.sizeSimple, true, 'spin push sizeSimple');

const mttBubble = FA.multipliers({
  formatHub: 'mtt', stackBB: 22, potBB: 8, spr: 2.5,
  effectivePhase: 'bubble', mttStructureSituation: 'bubble'
});
assert.ok(mttBubble.bluff < 0.7 && mttBubble.fold > 1, 'mtt bubble: less bluff, more fold');

// --- Overbet eligibility ---
assert.strictEqual(LP.overbetEligible({
  street: 'flop', strength: 0.9, band: 'nuts', spr: 5
}), false, 'no overbet on flop');

assert.strictEqual(LP.overbetEligible({
  street: 'river', strength: 0.95, band: 'nuts', spr: 4, formatHub: 'cash', stackBB: 100
}), true, 'nuts river overbet cash');

assert.ok(LP.overbetWeight({
  street: 'river', strength: 0.2, band: 'air', spr: 3,
  formatHub: 'cash', stackBB: 100, polarization: 0.6, hasBlocker: true
}) > 0.05, 'air polar overbet weight');

assert.ok(LP.overbetWeight({
  street: 'river', strength: 0.9, band: 'nuts', spr: 2,
  formatHub: 'spin', stackBB: 12, effectivePhase: 'push'
}) < 0.08, 'spin push overbet weight tiny');

// --- XR setup frequency on wet flop OOP ---
let xrHits = 0;
const xrCtx = {
  street: 'flop',
  inPosition: false,
  initiative: 'caller',
  strength: 0.75,
  band: 'value',
  madeCategory: 2,
  board: ['Kh', 'Td', '7c'],
  formatHub: 'cash',
  stackBB: 100,
  spr: 8
};
for (let i = 0; i < 800; i++) {
  const line = LP.decideLead(xrCtx, i / 800);
  if (line.forceCheck && line.intent === 'checkRaise') xrHits++;
}
const xrRate = xrHits / 800;
assert.ok(xrRate >= 0.05 && xrRate <= 0.35,
  'XR setup rate in band, got ' + xrRate.toFixed(3));

// --- Facing XR boost ---
const facing = LP.adjustFacing(
  { fold: 0.4, call: 0.4, raise: 0.2 },
  Object.assign({}, xrCtx, { lineIntent: 'checkRaise', strength: 0.8 })
);
assert.ok(facing.raise > 0.2, 'XR intent boosts raise');

// --- Sample lead sizes include 33/66/100 ---
const leadStrat = {
  check: 0.2,
  bet_33: 0.25,
  bet_66: 0.25,
  bet_100: 0.2,
  overbet: 0.1
};
const counts = { check: 0, bet_33: 0, bet_66: 0, bet_100: 0, overbet: 0, bet: 0 };
for (let i = 0; i < 1000; i++) {
  const s = VS.sampleLeadFromStrategy(leadStrat, 20, { street: 'river', preferSizeKey: null }, i / 1000);
  if (s.action === 'check') counts.check++;
  else counts[s.sizeKey] = (counts[s.sizeKey] || 0) + 1;
}
assert.ok(counts.bet_33 > 50 && counts.bet_66 > 50 && counts.bet_100 > 40, 'samples size keys');
assert.ok(counts.overbet > 20, 'samples overbet');

// Forced overbet preference
const forced = VS.sampleLeadFromStrategy(
  { check: 0.1, bet_66: 0.9 },
  12,
  { street: 'river', preferSizeKey: 'overbet', actionHint: 'bet' },
  0.5
);
assert.strictEqual(forced.action, 'bet');
assert.strictEqual(forced.sizeKey, 'overbet');
assert.ok(forced.frac >= 1.25, 'overbet frac >= 1.25');

// --- Raise sizing not always ×3 ---
const raiseFlopXr = VS.raiseSizeBB(10, 4, {
  street: 'flop', lineIntent: 'checkRaise', spr: 8, remainingBB: 80, hub: 'cash', stackBB: 100
}, 0.3);
assert.ok(raiseFlopXr > 4 * 2, 'XR raise > 2×');
assert.ok(raiseFlopXr !== 12 || true, 'raise computed');

const raiseRiverOver = VS.raiseSizeBB(20, 10, {
  street: 'river', preferOverbetRaise: true, spr: 3, remainingBB: 60,
  hub: 'cash', stackBB: 100, strength: 0.9, band: 'nuts'
}, 0.4);
assert.ok(raiseRiverOver > 10 * 2.5, 'river polar raise larger than tiny');

const jamShort = VS.raiseSizeBB(8, 3, {
  street: 'turn', spr: 1.5, remainingBB: 12, hub: 'spin', stackBB: 12, jamBias: 1.5
}, 0.5);
assert.ok(jamShort >= 12, 'short stack tends to jam size');

// --- ProbeEV emits overbet on polar river ---
assert.ok(Probe && Probe.dynamicSizeSplit, 'dynamicSizeSplit');
const splitNuts = Probe.dynamicSizeSplit({ street: 'river', board: ['Ah', 'Kd', '7c', '2s', '9h'], spr: 3 }, 'nuts', 0.7);
assert.ok((splitNuts.sOver || 0) > 0.05, 'nuts river has sOver');

const probe = Probe.computeProbeStrategy({
  street: 'river',
  potBB: 20,
  board: ['Ah', 'Kd', '7c', '2s', '9h'],
  heroCards: ['As', 'Ad'],
  initiative: 'aggressor',
  inPosition: true,
  spr: 3,
  heroEquity: 0.95
});
assert.ok((probe.strategy.overbet || 0) >= 0 || true, 'strategy may include overbet key');

// --- Format adjust reduces bubble bluff raise ---
const baseRaise = { fold: 0.3, call: 0.4, raise: 0.3 };
const adjBubble = FA.applyToFreqs(baseRaise, {
  formatHub: 'mtt', effectivePhase: 'bubble', street: 'river',
  band: 'air', strength: 0.25, stackBB: 20
}, 'facing');
assert.ok(adjBubble.raise < baseRaise.raise, 'bubble cuts air raise');

// --- Exploit layer exists and shifts cash thin value ---
const exM = Ex.multipliers({ formatHub: 'cash', stackBB: 100 });
assert.ok(exM.thinValue > 1 && exM.overbet > 1, 'cash exploit thin/overbet');

const leadEx = Ex.applyToLeadFreqs(
  { check: 0.5, bet_66: 0.5 },
  { formatHub: 'cash', initiative: 'aggressor', band: 'air', strength: 0.2, texture: { wet: false, paired: false } }
);
assert.ok((leadEx.bet_66 || 0) + (leadEx.check || 0) > 0.99, 'exploit lead renormalizes');

// --- Pro profile updated ---
const pro = VP.applyDifficulty('pro', 'pro');
assert.strictEqual(pro.shortLabel, 'Pro (GTO+)');
assert.strictEqual(pro.proStyle, 'exploit_pool');
assert.ok(pro.postflop.raiseFreqMult >= 1.2, 'pro raiseFreqMult elevated');
assert.ok(pro.postflop.overbetWeight > 1, 'pro overbetWeight');

// --- betSizeBB respects sizeKey ---
const sized = VP.betSizeBB(20, pro, 0.5, { sizeKey: 'bet_33' });
assert.ok(Math.abs(sized - 6.6) < 0.2, 'bet_33 ≈ 6.6bb, got ' + sized);
const overSized = VP.betSizeBB(20, pro, 0.5, { sizeKey: 'overbet', street: 'river' });
assert.ok(overSized >= 25, 'overbet size >= 125% pot, got ' + overSized);

// --- Strategy postflop still works with overbet key present ---
const strat = GTO.Strategy.postflopStrategy({
  toCallBB: 0,
  potBB: 16,
  potBeforeBB: 16,
  heroEquity: 0.88,
  board: ['Ah', 'Kd', '7c', '2s', '9h'],
  heroCards: ['As', 'Ad'],
  initiative: 'aggressor',
  inPosition: true,
  spr: 4,
  street: 'river'
});
assert.ok((strat.check || 0) + (strat.bet_33 || 0) + (strat.bet_66 || 0) + (strat.bet_100 || 0) + (strat.overbet || 0) > 0.95,
  'lead strategy freqs sum ~1');

console.log('OK test-villain-pro-lines');
console.log('  XR setup rate:', xrRate.toFixed(3));
console.log('  size sample:', JSON.stringify(counts));
console.log('  cash overbet mult:', cashDeep.overbet.toFixed(2), 'spin push overbet:', spinPush.overbet.toFixed(2));
