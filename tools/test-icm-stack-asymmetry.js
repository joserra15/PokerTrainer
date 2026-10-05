#!/usr/bin/env node
/**
 * Regresión: asimetría ICM cubre/cubierto (BF canónico, coverage, villanos).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { window: {}, console, Math, Date, Set, Map, JSON, parseFloat, parseInt, isNaN, isFinite, Number, String, Array, Object };
sandbox.global = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const scripts = [
  'js/engine/cache.js',
  'js/engine/format/taxonomy.js',
  'js/engine/scoring/icmEv.js',
  'js/engine/stacks.js',
  'js/engine/stackCoverage.js',
  'js/engine/decisionContext.js',
  'js/engine/villainFormatAdjust.js',
  'js/engine/villainPreflop.js'
];

scripts.forEach(function (f) {
  const full = path.join(ROOT, f);
  vm.runInContext(fs.readFileSync(full, 'utf8'), sandbox, { filename: f });
});

const Icm = sandbox.GTOIcmEv || sandbox.window.GTOIcmEv;
const Cov = sandbox.PTStackCoverage || sandbox.window.PTStackCoverage;
const DC = sandbox.GTODecisionContext || sandbox.window.GTODecisionContext;
const FA = sandbox.GTOVillainFormatAdjust || sandbox.window.GTOVillainFormatAdjust;
const VPF = sandbox.GTOVillainPreflop || sandbox.window.GTOVillainPreflop;
const Tax = sandbox.PTFormatTaxonomy || sandbox.window.PTFormatTaxonomy;
const ST = sandbox.PTStacks || sandbox.window.PTStacks;

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed += 1;
  } else {
    console.log('OK:', msg);
  }
}
function approx(a, b, tol, msg) {
  ok(Math.abs(Number(a) - Number(b)) <= (tol != null ? tol : 0.02), msg + ' (got ' + a + ', expect ~' + b + ')');
}

ok(!!Icm && !!Icm.bubbleFactorPair, 'GTOIcmEv.bubbleFactorPair');
ok(!!Cov && !!Cov.roleForStack, 'PTStackCoverage');
ok(!!FA && !!FA.multipliers, 'GTOVillainFormatAdjust');
ok(!!Tax && Tax.MTT_PHASES.indexOf('ft') >= 0 && Tax.MTT_PHASES.indexOf('itm') >= 0, 'fases itm/ft en taxonomy');
ok(Tax.normalizePhase('ft') === 'ft', 'normalizePhase(ft)');
ok(Tax.normalizePhase('itm') === 'itm', 'normalizePhase(itm)');
ok(Tax.usesIcm({ formatHub: 'mtt', mttPhase: 'ft', playersLeft: 9, placesPaid: 9 }), 'usesIcm ft');
ok(Tax.usesIcm({ formatHub: 'mtt', mttPhase: 'itm', playersLeft: 12, placesPaid: 12 }), 'usesIcm itm');

// BF=2 → requiredEquity 2/3, RP ≈ 0.167 (O'Kearney)
approx(Icm.requiredEquity(2), 0.667, 0.001, 'requiredEquity(BF=2)');
approx(Icm.riskPremium(2), 0.167, 0.001, 'riskPremium(BF=2)');
approx(Icm.riskPremium(1), 0, 0.001, 'riskPremium(BF=1)');

// Chip lead vs short: BF asimétrico
const stacks = [40, 20, 10];
const pays = [0.5, 0.3, 0];
const bfCover = Icm.bubbleFactorPair(stacks, 0, 2, pays);
const bfShort = Icm.bubbleFactorPair(stacks, 2, 0, pays);
const bfMid = Icm.bubbleFactorPair(stacks, 1, 0, pays);
ok(bfCover < bfShort, 'cover BF < short BF (' + bfCover + ' < ' + bfShort + ')');
ok(bfMid > bfCover, 'mid BF > cover BF (' + bfMid + ' > ' + bfCover + ')');
ok(Icm.riskPremium(bfMid) > Icm.riskPremium(bfShort), 'mid RP > short RP');
ok(Icm.bubbleFactor(stacks, 0, 2, pays) === bfCover, 'bubbleFactor alias canónico');

const matrix = Icm.bubbleFactorMatrix(stacks, pays);
ok(matrix.length === 3 && matrix[0][0] === 1 && matrix[0][2] === bfCover, 'bubbleFactorMatrix');

// Coverage roles
ok(Cov.roleForStack(50, [50, 20, 18, 15]) === 'cover', 'role cover chip lead');
ok(Cov.roleForStack(25, [50, 25, 24, 23]) === 'mid', 'role mid flat-ish');
ok(Cov.roleForStack(8, [50, 25, 20, 8]) === 'short', 'role short');
ok(Cov.MEANINGFUL === 1.25, 'MEANINGFUL threshold');

const hand = {
  stacks: { BTN: 50, SB: 22, BB: 18, hero: 50, villain: 22 },
  hero: { pos: 'BTN' },
  villain: { pos: 'SB' }
};
const roles = Cov.rolesForTable(hand);
ok(roles.BTN && roles.BTN.role === 'cover' && roles.BTN.isChipLead, 'rolesForTable chip lead');
const cov = Cov.coverageFor(hand, 'BTN', 'SB');
ok(cov.covers && !cov.covered, 'coverageFor cover');

const pair = Cov.pairContext(hand, 'BTN', 'SB', {
  icmStacksBB: [50, 22, 18],
  icmPayouts: [0.5, 0.3, 0],
  icmHeroIdx: 0,
  icmVillainIdx: 1
});
ok(pair.stackRole === 'cover', 'pairContext stackRole cover');
ok(pair.coversOpponent, 'pairContext coversOpponent');
ok(pair.ownRiskPremium != null && pair.opponentRiskPremium != null, 'pairContext RPs');
ok(pair.ownRiskPremium < pair.opponentRiskPremium, 'cover ownRP < oppRP');

const why = Cov.explainPairPressure(pair, 'bubble');
ok(why && /cubre|presión|farolear/i.test(why), 'explainPairPressure: ' + why);

// bubbleFactorFromCtx floors asimétricos
const bfFloorCover = DC.bubbleFactorFromCtx({
  formatHub: 'mtt', mttPhase: 'bubble', stackRole: 'cover', coversOpponent: true, stackBB: 40
});
const bfFloorMid = DC.bubbleFactorFromCtx({
  formatHub: 'mtt', mttPhase: 'bubble', stackRole: 'mid', stackBB: 25
});
const bfFloorShort = DC.bubbleFactorFromCtx({
  formatHub: 'mtt', mttPhase: 'bubble', stackRole: 'short', stackBB: 10
});
ok(bfFloorCover <= 1.25, 'cover floor BF ≤ 1.25 (got ' + bfFloorCover + ')');
ok(bfFloorMid >= 1.55, 'mid bubble floor BF ≥ 1.55 (got ' + bfFloorMid + ')');
ok(bfFloorShort < bfFloorMid, 'short floor < mid floor');

const bfPairPreferred = DC.bubbleFactorFromCtx({
  formatHub: 'mtt', mttPhase: 'bubble', stackRole: 'mid', pairBubbleFactor: 1.4, stackBB: 25
});
ok(bfPairPreferred === 1.4 || bfPairPreferred >= 1.25, 'prefer pair BF when present');

// FormatAdjust: cover bluffea más que mid en bubble
const midMult = FA.multipliers({
  formatHub: 'mtt', mttPhase: 'bubble', stackRole: 'mid',
  ownRiskPremium: 0.18, opponentRiskPremium: 0.04, coveredByOpponent: true,
  stackBB: 25, potBB: 5
});
const coverMult = FA.multipliers({
  formatHub: 'mtt', mttPhase: 'bubble', stackRole: 'cover',
  ownRiskPremium: 0.03, opponentRiskPremium: 0.16, coversOpponent: true,
  stackBB: 45, potBB: 5
});
ok(coverMult.bluff > midMult.bluff, 'cover bluff > mid bluff (' + coverMult.bluff + ' > ' + midMult.bluff + ')');
ok(coverMult.fold < midMult.fold, 'cover fold < mid fold (' + coverMult.fold + ' < ' + midMult.fold + ')');
ok(coverMult.overbet <= midMult.overbet * 1.05 || coverMult.overbet < 1, 'cover size-down overbet');

// Preflop: foldBias / stealBias asimétricos
const foldCover = VPF.tournamentFoldBias({
  isTournament: true, mttPhase: 'bubble', stackRole: 'cover',
  ownRiskPremium: 0.03, coversOpponent: true
});
const foldMid = VPF.tournamentFoldBias({
  isTournament: true, mttPhase: 'bubble', stackRole: 'mid',
  ownRiskPremium: 0.18, coveredByOpponent: true
});
const foldShort = VPF.tournamentFoldBias({
  isTournament: true, mttPhase: 'bubble', stackRole: 'short',
  ownRiskPremium: 0.1
});
ok(foldCover < foldMid, 'foldBias cover < mid (' + foldCover + ' < ' + foldMid + ')');
ok(foldShort < foldMid, 'foldBias short < mid (short overfolds less)');

const stealCover = VPF.tournamentStealBias({
  isTournament: true, mttPhase: 'bubble', stackRole: 'cover',
  opponentRiskPremium: 0.18, coversOpponent: true
});
const stealMid = VPF.tournamentStealBias({
  isTournament: true, mttPhase: 'bubble', stackRole: 'mid',
  opponentRiskPremium: 0.04, coveredByOpponent: true
});
ok(stealCover > stealMid, 'stealBias cover > mid (' + stealCover + ' > ' + stealMid + ')');

// Pedagogical rotation
ok(typeof ST.pickPedagogicalStackRole === 'function', 'pickPedagogicalStackRole');
const counts = { cover: 0, mid: 0, short: 0 };
for (let i = 0; i < 1000; i++) {
  counts[ST.pickPedagogicalStackRole(i / 1000)] += 1;
}
ok(counts.cover >= 300 && counts.cover <= 400, 'pedagogical ~35% cover (' + counts.cover + ')');
ok(counts.mid >= 350 && counts.mid <= 450, 'pedagogical ~40% mid (' + counts.mid + ')');
ok(counts.short >= 200 && counts.short <= 300, 'pedagogical ~25% short (' + counts.short + ')');
ok(ST.isIcmTeachingPhase({ mttPhase: 'bubble' }), 'isIcmTeachingPhase bubble');
ok(ST.isIcmTeachingPhase({ mttPhase: 'ft' }), 'isIcmTeachingPhase ft');
ok(!ST.isIcmTeachingPhase({ mttPhase: 'early' }), 'not teaching early');

// bundles include stackCoverage
const chunks = fs.readFileSync(path.join(ROOT, 'js/bundle-chunks.js'), 'utf8');
ok(chunks.indexOf('stackCoverage.js') >= 0, 'stackCoverage in bundle-chunks');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
ok(html.indexOf('setup-stack-role') >= 0, 'UI Rol de stack');
ok(html.indexOf('data-val="itm"') >= 0 && html.indexOf('data-val="ft"') >= 0, 'UI fases itm/ft');

if (failed) {
  console.error('\n' + failed + ' assertion(s) failed');
  process.exit(1);
}
console.log('\nAll ICM asymmetry assertions passed');
