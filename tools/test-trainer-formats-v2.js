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

// Fase ↔ stack: Early spin no admite 25bb como short/mid; push fija 10bb
assert.strictEqual(Tax.stackDepthsForPhase('spin', 'early').join(','), 'bb25');
assert.strictEqual(Tax.stackDepthsForPhase('spin', 'mid').join(','), 'bb20,bb15');
assert.strictEqual(Tax.stackDepthsForPhase('spin', 'push').join(','), 'bb10');
assert.strictEqual(Tax.defaultStackDepthForPhase('spin', 'short'), 'bb15');
assert.strictEqual(Tax.clampStackDepth('spin', 'short', 'random', 'bb25'), 'bb15');
assert.strictEqual(Tax.clampStackDepth('spin', 'auto', 'push', 'bb25'), 'bb10');
assert.strictEqual(Tax.clampStackDepth('spin', 'auto', 'steal', 'bb10'), 'bb20');
assert.ok(Tax.stackSelectionLocked('spin', 'short', 'random'));
assert.ok(Tax.stackSelectionLocked('mtt', 'auto', 'steal'));
assert.ok(!Tax.stackSelectionLocked('spin', 'auto', 'rfi'));
assert.ok(Tax.allowedStackDepths('mtt', 'mid', 'random').indexOf('bb25') >= 0);
assert.strictEqual(Tax.allowedStackDepths('spin', 'early', 'random').join(','), 'bb25');
assert.strictEqual(Tax.allowedStackDepths('spin', 'mid', 'random').join(','), 'bb20');
assert.ok(Tax.allowedStackDepths('spin', 'auto', 'steal').indexOf('bb15') >= 0);

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

// vsRFI push: fold/call/shove (villano abre 2.5bb, no all-in)
const pfVsOpen = PF.pushFoldStrategy({
  handCode: 'AA', position: 'BB', effStack: 10, toCallBB: 1.5, openerPos: 'BTN'
});
assert.ok((pfVsOpen.allin || 0) > 0.5, 'AA 3-bet shove vs open corto');
assert.ok((pfVsOpen.call || 0) < (pfVsOpen.allin || 0), 'shove > call con AA vs open');

function assertPushVsRfiOptions(hub, label) {
  const cfg = PC.normalize({
    formatHub: hub, stackDepth: 'bb10', scenario: 'push', phase: 'push'
  });
  const hand = Engine.newHand(
    { type: 'vsRFI', key: hub === 'spin' ? 'BB_vs_BTN' : 'BTN_vs_CO', pushFold: true, seed: 77 },
    cfg
  );
  const ids = (hand.current.options || []).map((o) => o.id);
  assert.ok(ids.indexOf('fold') >= 0, label + ' fold');
  assert.ok(ids.indexOf('call') >= 0, label + ' call');
  assert.ok(ids.indexOf('allin') >= 0, label + ' shove/allin vs open');
  assert.ok(/shove/i.test((hand.current.options.find((o) => o.id === 'allin') || {}).label || ''), label + ' label shove');
}
assertPushVsRfiOptions('spin', 'spin push vsRFI');
assertPushVsRfiOptions('mtt', 'mtt push vsRFI');

// Stacks MTT/Spin: héroe al depth elegido; villanos mid/short/deep (no clon del héroe)
{
  const ST = w.PTStacks;
  assert.ok(ST && ST.tournamentBands, 'PTStacks.tournamentBands');
  const bands = ST.tournamentBands('mtt', 10);
  assert.ok(bands.mid[0] >= 15, 'mid band > hero 10bb');
  assert.ok(bands.deep[0] > bands.mid[1], 'deep > mid');

  const mttCfg = PC.normalize({ formatHub: 'mtt', stackDepth: 'bb10', scenario: 'push', phase: 'push' });
  const mttHand = Engine.newHand({ type: 'vsRFI', key: 'BB_vs_CO', pushFold: true, seed: 11 }, mttCfg);
  assert.strictEqual(mttHand.stacks.BB, 10, 'MTT hero 10bb');
  const mttVals = PC.POS_9.filter((p) => p !== 'BB').map((p) => mttHand.stacks[p]);
  assert.ok(mttVals.every((v) => typeof v === 'number' && v >= 4), 'MTT villain stacks');
  assert.ok(mttVals.some((v) => v >= 18), 'MTT algún mid/deep vs hero 10bb');
  assert.ok(Math.max.apply(null, mttVals) - Math.min.apply(null, mttVals) >= 5, 'MTT dispersión');

  const spinCfg = PC.normalize({ formatHub: 'spin', stackDepth: 'bb10', scenario: 'push', phase: 'push' });
  const spinHand = Engine.newHand({ type: 'vsRFI', key: 'BB_vs_BTN', pushFold: true, seed: 22 }, spinCfg);
  const spinPos = PC.tablePositions(spinCfg);
  assert.strictEqual(spinPos.length, 3, 'spin 3 asientos');
  spinPos.forEach((p) => assert.ok(spinHand.stacks[p] != null, 'spin stack ' + p));
  assert.strictEqual(spinHand.stacks.BB, 10, 'spin hero 10bb');
  const spinOthers = spinPos.filter((p) => p !== 'BB').map((p) => spinHand.stacks[p]);
  assert.ok(!spinOthers.every((v) => v >= 8 && v <= 12), 'spin no todos ≈10bb: ' + spinOthers.join(','));

  // Cash sigue cercano al héroe
  const cashHand = Engine.newHand({ type: 'vsRFI', key: 'BB_vs_CO', seed: 42 }, PC.normalize({ stackDepth: 'bb100' }));
  assert.ok(cashHand.stacks.CO >= 70 && cashHand.stacks.CO <= 130, 'cash villain cercano');

  // stackRole cover: héroe chip lead + al menos un short (S-06)
  const coverCfg = PC.normalize({
    formatHub: 'spin', stackDepth: 'bb25', scenario: 'steal', stackRole: 'cover'
  });
  const coverHand = Engine.newHand({ type: 'RFI', heroPos: 'BTN', seed: 71601 }, coverCfg);
  const coverPos = PC.tablePositions(coverCfg);
  const coverHero = coverHand.stacks.BTN;
  assert.strictEqual(coverHero, 25, 'cover hero 25bb');
  const coverOthers = coverPos.filter((p) => p !== 'BTN').map((p) => coverHand.stacks[p]);
  assert.ok(coverOthers.every((v) => v < coverHero - 0.5),
    'cover: villanos < héroe: ' + coverOthers.join(','));
  assert.ok(coverOthers.some((v) => v <= 14),
    'cover: hay short ≤14bb: ' + coverOthers.join(','));

  // stackRole short: covers detrás (S-07)
  const shortCfg = PC.normalize({
    formatHub: 'spin', stackDepth: 'bb10', scenario: 'push', stackRole: 'short'
  });
  const shortHand = Engine.newHand({ type: 'RFI', heroPos: 'BTN', seed: 71701 }, shortCfg);
  const shortHero = shortHand.stacks.BTN;
  const shortOthers = PC.tablePositions(shortCfg).filter((p) => p !== 'BTN').map((p) => shortHand.stacks[p]);
  assert.ok(shortOthers.every((v) => v > shortHero + 2),
    'short: villanos > héroe: ' + shortOthers.join(','));
}

// Push shove: si pagan (incluso "3bet" forzado), héroe all-in → runout, nunca face3bet
{
  const pushCfg = PC.normalize({
    formatHub: 'mtt', stackDepth: 'bb10', scenario: 'push', phase: 'push'
  });
  const shoveHand = Engine.newHand({
    type: 'RFI',
    heroPos: 'CO',
    engineHeroPos: 'CO',
    seed: 91,
    pushFold: true,
    forceScript: {
      heroPos: 'CO',
      villainPos: 'BB',
      actions: [
        { pos: 'CO', action: 'allin' },
        { pos: 'BTN', action: 'fold' },
        { pos: 'SB', action: 'fold' },
        { pos: 'BB', action: 'raise', amountBB: 34 }
      ]
    }
  }, pushCfg);
  assert.ok(shoveHand.current && shoveHand.current.options.some((o) => o.id === 'allin'), 'push ofrece shove');
  Engine.act(shoveHand, 'allin');
  assert.ok(!shoveHand.current || shoveHand.current.kind !== 'face3bet',
    'tras shove no vuelve face3bet (héroe ya all-in)');
  assert.ok(
    shoveHand.runoutPending || shoveHand.result || !shoveHand.current,
    'tras shove pagado → runout/showdown, no decisión'
  );
  const rem = w.PTStacks ? w.PTStacks.remaining(shoveHand, 'CO') : 0;
  assert.ok(rem <= 0.01, 'héroe sin fichas tras shove');
}

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
assert.ok(/PT_BUILD\s*=\s*'2.7.11'/.test(version), 'version 2.7.11');

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
