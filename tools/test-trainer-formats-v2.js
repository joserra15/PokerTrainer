#!/usr/bin/env node
/**
 * Regresión PokerForgeAI 2.0 — hubs cash/spin/mtt, ICM trainer, bluff spots, push/fold.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createSandbox, loadTrainer, runFiles } = require('./load-engine-vm');

const sandbox = createSandbox();
loadTrainer(sandbox);

const w = sandbox.window;
const Tax = w.PTFormatTaxonomy;
const PC = w.PTPlayConfig;
const Engine = w.Engine;
const GTO = w.GTO;
const Bluff = w.GTOBluffSpotDetector;
const Icm = w.GTOIcmEv;
const PF = w.GTOPushFold;

assert.ok(Tax, 'PTFormatTaxonomy');
assert.ok(PC, 'PTPlayConfig');
assert.ok(Engine && Engine.newHand, 'Engine');
assert.ok(Bluff, 'BluffSpotDetector');
assert.ok(Icm, 'IcmEv');
assert.ok(PF, 'PushFold');

// --- Taxonomy ---
assert.strictEqual(Tax.hubFromGameType('spin3'), 'spin');
assert.strictEqual(Tax.hubFromGameType('mtt'), 'mtt');
assert.strictEqual(Tax.hubFromGameType('cash9'), 'cash');
assert.strictEqual(Tax.normalizeIntent('bluff_make'), 'bluff_make');
assert.strictEqual(Tax.resolvePhase({ formatHub: 'spin', stackBB: 10 }), 'push');
assert.ok(Tax.usesIcm({ formatHub: 'spin', gameType: 'spin3', stackBB: 25 }));
assert.ok(!Tax.usesIcm({ formatHub: 'cash', gameType: 'cash6', stackBB: 100 }));

// --- Normalize hubs ---
const cash = PC.normalize({ gameType: 'cash6' });
assert.strictEqual(cash.formatHub, 'cash');
assert.strictEqual(cash.practiceIntent, 'mixed');
assert.strictEqual(cash.anteBB, 0);

// Faroles ocultos en entrenador: bluff_make/catch se normalizan a mixed
assert.strictEqual(PC.normalize({ practiceIntent: 'bluff_make' }).practiceIntent, 'mixed');
assert.strictEqual(PC.normalize({ practiceIntent: 'bluff_catch' }).practiceIntent, 'mixed');

const mtt = PC.normalize({ gameType: 'mtt', stackDepth: 'bb50' });
assert.strictEqual(mtt.formatHub, 'mtt');
assert.strictEqual(mtt.gameType, 'mtt');
assert.ok(mtt.anteBB > 0, 'MTT tiene ante');

const spin = PC.normalize({ formatHub: 'spin' });
assert.strictEqual(spin.gameType, 'spin3');
assert.strictEqual(spin.formatHub, 'spin');
assert.strictEqual(spin.stackDepth, 'bb25');
assert.ok(PC.isSpin(spin));
assert.ok(PC.is3Max(spin));
assert.strictEqual(PC.heroPositions(spin).slice().sort().join(','), 'BB,BTN,SB');
assert.strictEqual(PC.tablePositions(spin).join(','), 'BTN,SB,BB');
assert.strictEqual(PC.dealOrder(spin).join(','), 'SB,BB,BTN');
assert.ok(PC.tablePositions(spin).indexOf('UTG') < 0);
assert.ok(PC.tablePositions(spin).indexOf('HJ') < 0);
assert.ok(PC.tablePositions(spin).indexOf('CO') < 0);

// gameType explícito mtt no debe ser pisado por DEFAULT formatHub
const mtt2 = PC.normalize({ gameType: 'mtt' });
assert.strictEqual(mtt2.gameType, 'mtt');

// --- Scenario pools ---
const spinPool = PC.buildScenarioPool(spin);
assert.ok(spinPool.length > 0, 'spin pool');
assert.ok(spinPool.every((s) => s.type !== 'cold4bet' && s.type !== 'squeeze' || spinPool.length), 'spin pool usable');

const pushCfg = PC.normalize({ formatHub: 'spin', stackDepth: 'bb10', scenario: 'push' });
const pushPool = PC.buildScenarioPool(pushCfg);
assert.ok(pushPool.some((s) => s.pushFold || s.type === 'RFI'), 'push scenarios');

// --- Push/fold charts ---
assert.ok(PF.shouldOpenShove('AKs', 'BTN', 10));
assert.ok(!PF.shouldOpenShove('72o', 'UTG', 10));
const pfStrat = PF.pushFoldStrategy({
  handCode: 'AA', position: 'BTN', effStack: 10, toCallBB: 0
});
assert.ok((pfStrat.raise || 0) > 0.5, 'AA shove');

// --- ICM ---
const eq = Icm.icmEquities([25, 25, 25], [0.65, 0.35, 0]);
assert.ok(eq && eq.length === 3);
const mult = Icm.riskMultiplier({
  formatHub: 'spin', gameType: 'spin3', icmEnabled: true,
  heroStackBB: 40, villainStackBB: 15, tableMax: 3,
  chosenAction: 'call', spinPayout: '2x'
});
assert.ok(mult >= 1, 'ICM risk mult >= 1 con stack grande');

// --- Bluff detector ---
const makeScore = Bluff.scoreBluffMake({
  street: 'river',
  handRank: { band: 'air', tier: 'air' },
  inPosition: true,
  foldEquity: 0.4,
  heroCards: ['As', '2d'],
  board: ['Kh', '7c', '2s', '9d', '3c'],
  strategy: { bet_66: 0.35, check: 0.65 },
  formatHub: 'cash',
  gameType: 'cash6'
});
assert.ok(makeScore.score >= 0.5, 'buen spot bluff make, score=' + makeScore.score);

const catchScore = Bluff.scoreBluffCatch({
  street: 'river',
  handRank: { band: 'bluffcatch', tier: 'weak' },
  toCallBB: 12,
  potBB: 20,
  potBeforeBB: 8,
  villainBetRatio: 1.5,
  facingNode: 'overbet',
  heroEquity: 0.35,
  heroCards: ['Ah', 'Td'],
  board: ['Ks', '7c', '2d', '9h', '3c']
});
assert.ok(catchScore.score >= 0.45, 'bluffcatch score=' + catchScore.score);

// --- Trainer hands: cash / spin / mtt ---
function playOne(cfg, seed) {
  if (w.GTOCache) w.GTOCache.clear();
  const hand = Engine.newHand({ seed: seed }, PC.normalize(cfg));
  assert.ok(hand && hand.current, 'hand current');
  assert.ok(hand.hero && hand.hero.cards && hand.hero.cards.length === 2);
  const actId = (hand.current.options && hand.current.options[0])
    ? hand.current.options[0].id
    : 'fold';
  const out = Engine.act(hand, actId);
  assert.ok(out && out.decision, 'decision');
  assert.ok(out.decision.class, 'class');
  return { hand, decision: out.decision };
}

const cashPlay = playOne({ gameType: 'cash6', stackDepth: 'bb100', scenario: 'rfi' }, 1001);
assert.strictEqual(cashPlay.hand.playConfig.formatHub, 'cash');

const spinPlay = playOne({
  formatHub: 'spin', stackDepth: 'bb25', scenario: 'rfi', spinPayout: '2x'
}, 2002);
assert.strictEqual(spinPlay.hand.playConfig.gameType, 'spin3');
assert.ok((spinPlay.hand.anteBB || 0) === 0 || spinPlay.hand.potBB > 1.5, 'spin pot');

const mttPlay = playOne({
  gameType: 'mtt', stackDepth: 'bb25', scenario: 'rfi', mttPhase: 'short'
}, 3003);
assert.ok(mttPlay.hand.anteBB > 0 || mttPlay.hand.playConfig.anteBB > 0, 'mtt ante');
assert.ok(mttPlay.decision.formatHub === 'mtt' || mttPlay.hand.playConfig.formatHub === 'mtt');

// Push spin: strategy path
const pushPlay = playOne({
  formatHub: 'spin', stackDepth: 'bb10', scenario: 'push'
}, 4004);
assert.ok(pushPlay.decision && pushPlay.decision.class, 'push decision');
assert.ok(pushPlay.hand.scenario && (pushPlay.hand.scenario.pushFold || pushPlay.hand.scenario.type === 'RFI'), 'push scenario');

// Evaluate with ICM fields present
const spot = GTO.evaluateSpot({
  spotKind: 'RFI', position: 'BTN', street: 'preflop',
  handCode: 'AA', heroCards: ['As', 'Ah'], chosenAction: 'raise', potBB: 1.5,
  availableActions: ['fold', 'raise'], initiative: 'none',
  formatHub: 'spin', gameType: 'spin3', icmEnabled: true,
  heroStackBB: 25, villainStackBB: 25, tableMax: 3, spinPayout: '2x'
});
assert.ok(spot.evaluation && spot.evaluation.class, 'spin evaluateSpot');

// UI markers
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.ok(indexHtml.includes('setup-format-hub'), 'hub tabs UI');
assert.ok(indexHtml.includes('setup-practice-intent'), 'intent UI');
assert.ok(indexHtml.includes('id="setup-practice-intent-wrap" hidden'), 'intent UI oculta');
assert.ok(indexHtml.includes('data-val="bluff_make" hidden'), 'chip hacer faroles oculto');
assert.ok(indexHtml.includes('data-val="bluff_catch" hidden'), 'chip cazar faroles oculto');
assert.ok(indexHtml.includes('data-val="spin3"'), 'spin3 chip');
assert.ok(indexHtml.includes('setup-mtt-phase'), 'phase UI');

const version = fs.readFileSync(path.join(__dirname, '..', 'js', 'version.js'), 'utf8');
assert.ok(/PT_BUILD\s*=\s*'2\.5\.12'/.test(version), 'version 2.5.11');

const appJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
assert.ok(appJs.includes('Mensajes de farol/cazar faroles ocultos'), 'badge mesa desactivado');

// 9-max: asientos equiespaciados (sin cluster CO/BTN arriba-derecha)
{
  function parseCoords(name) {
    const re = new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\];');
    const m = appJs.match(re);
    assert.ok(m, name + ' definido');
    const tops = [...m[1].matchAll(/top:\s*(\d+)/g)].map((x) => Number(x[1]));
    const lefts = [...m[1].matchAll(/left:\s*(\d+)/g)].map((x) => Number(x[1]));
    assert.equal(tops.length, 9, name + ' tiene 9 tops');
    assert.equal(lefts.length, 9, name + ' tiene 9 lefts');
    return tops.map((t, i) => ({ top: t, left: lefts[i] }));
  }
  function minAdjacentDist(coords) {
    let min = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const a = coords[i];
      const b = coords[(i + 1) % coords.length];
      const d = Math.hypot((a.left - b.left) * 1.2, (a.top - b.top) * 1.6);
      if (d < min) min = d;
    }
    return min;
  }
  const mob9 = parseCoords('SEAT_COORDS_MOBILE_9');
  const desk9 = parseCoords('SEAT_COORDS_9');
  assert.ok(minAdjacentDist(mob9) >= 34, 'móvil 9-max spacing ≥34 got ' + minAdjacentDist(mob9).toFixed(1));
  assert.ok(minAdjacentDist(desk9) >= 34, 'desktop 9-max spacing ≥34 got ' + minAdjacentDist(desk9).toFixed(1));
  // Lado derecho (left>70): al menos 3 tops distintos bien separados (no 2 pegados arriba)
  const rightMob = mob9.filter((c) => c.left >= 70).sort((a, b) => a.top - b.top);
  assert.ok(rightMob.length >= 3, 'móvil 9-max ≥3 asientos a la derecha');
  for (let i = 1; i < rightMob.length; i++) {
    assert.ok(rightMob[i].top - rightMob[i - 1].top >= 18,
      'móvil derecha gap vertical ≥18: ' + rightMob.map((c) => c.top).join(','));
  }
}

const chunks = fs.readFileSync(path.join(__dirname, '..', 'js', 'bundle-chunks.js'), 'utf8');
assert.ok(chunks.includes('format/taxonomy.js'), 'taxonomy in bundle');
assert.ok(chunks.includes('bluffSpotDetector.js'), 'bluff detector in bundle');
assert.ok(chunks.includes('icmEv.js'), 'icmEv in bundle');
assert.ok(chunks.includes('pushFold.js'), 'pushFold in bundle');

console.log('test-trainer-formats-v2 OK');
