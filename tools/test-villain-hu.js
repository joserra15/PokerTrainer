/*
 * test-villain-hu.js — Fase Heads Up: taxonomy, play-config, villanos y Escuela Coach.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');

global.window = global;
global.self = global;

function load(rel) {
  const code = fs.readFileSync(path.join(root, rel), 'utf8');
  vm.runInThisContext(code, { filename: rel });
}

load('js/engine/format/taxonomy.js');
load('js/engine/villainProfiles.js');
load('js/engine/villainFormatAdjust.js');
load('js/engine/villainPreflop.js');

const Tax = global.PTFormatTaxonomy;
const VP = global.GTOVillainProfiles;
const FA = global.GTOVillainFormatAdjust;
const Pre = global.GTOVillainPreflop;

assert.ok(Tax, 'taxonomy');
assert.ok(VP, 'profiles');
assert.ok(FA, 'format adjust');
assert.ok(Pre, 'preflop');

assert.ok(Tax.MTT_PHASES.indexOf('hu') >= 0, 'MTT_PHASES includes hu');
assert.strictEqual(Tax.normalizePhase('hu'), 'hu');
assert.strictEqual(Tax.PHASE_LABELS.hu, 'Heads Up');
assert.deepStrictEqual(Tax.stackDepthsForPhase('spin', 'hu'), ['bb25', 'bb20', 'bb15', 'bb10']);
assert.ok(Tax.stackDepthsForPhase('mtt', 'hu').indexOf('bb25') >= 0);
assert.ok(Tax.defaultMttStructureForPhase('hu'));
assert.strictEqual(Tax.defaultMttStructureForPhase('hu').playersLeft, 2);
assert.strictEqual(Tax.defaultMttStructureForPhase('hu').placesPaid, 1);
assert.strictEqual(Tax.isHeadsUpWta({ mttPhase: 'hu' }), true);
assert.strictEqual(Tax.isHeadsUpWta({ kind: 'hu' }), true);
assert.strictEqual(Tax.usesIcm({ formatHub: 'spin', mttPhase: 'hu', placesPaid: 1, playersLeft: 2 }), false);
assert.strictEqual(Tax.usesIcm({ formatHub: 'mtt', mttPhase: 'bubble', placesPaid: 12, playersLeft: 13 }), true);

/* Gate: NO ajustar solo por pot HU implícito (2 seated sin fase/kind). */
assert.strictEqual(VP.shouldApplyHuAdjust({ playersSeated: 2, playersLeft: 2, placesPaid: 1 }), false);
assert.strictEqual(VP.shouldApplyHuAdjust({ mttPhase: 'hu' }), true);
assert.strictEqual(VP.shouldApplyHuAdjust({ kind: 'hu' }), true);

const nit = VP.applyDifficulty(VP.getProfile('nit'), 'intermediate', { forced: true, keepArchetype: true });
const nitHu = VP.applyHuAdjust(nit, { mttPhase: 'hu' });
assert.ok(nitHu.huAdjusted, 'nit huAdjusted');
assert.ok(nitHu.preflop.foldBias < nit.preflop.foldBias, 'nit foldBias lower in HU');
assert.ok(nitHu.postflop.betFreqMult > nit.postflop.betFreqMult, 'nit bets more in HU');

const nitNo = VP.applyHuAdjust(nit, { mttPhase: 'mid', playersSeated: 2 });
assert.ok(!nitNo.huAdjusted, 'no hu adjust without explicit phase');

const mid = FA.multipliers({ formatHub: 'spin', mttPhase: 'mid', stackBB: 20, playersSeated: 2 });
const hu = FA.multipliers({ formatHub: 'spin', mttPhase: 'hu', stackBB: 20, kind: 'hu' });
assert.ok(hu.raise > mid.raise || hu.cbet > mid.cbet, 'HU format more aggressive than mid collapse');
const huDeep = FA.multipliers({ formatHub: 'mtt', mttPhase: 'hu', stackBB: 45, kind: 'hu' });
const huShort = FA.multipliers({ formatHub: 'mtt', mttPhase: 'hu', stackBB: 10, kind: 'hu' });
assert.ok(huDeep.overbet > huShort.overbet, 'deep HU allows more overbet than short');
assert.ok(huShort.jamBias >= huDeep.jamBias, 'short HU more jam');

assert.strictEqual(Pre.tournamentFoldBias({ isTournament: true, mttPhase: 'hu' }), 0);
assert.ok(Pre.huAggressionBias({ mttPhase: 'hu', stackBB: 20 }) > 0);
assert.strictEqual(Pre.huAggressionBias({ mttPhase: 'mid' }), 0);

/* play-config HU seats */
load('js/play-config.js');
const PC = global.PTPlayConfig;
assert.ok(PC && PC.normalize, 'play-config');
const cfg = PC.normalize({ formatHub: 'spin', gameType: 'spin3', mttPhase: 'hu', stackDepth: 'bb20' });
assert.strictEqual(cfg.mttPhase, 'hu');
assert.strictEqual(cfg.tableMax, 2);
assert.strictEqual(cfg.playersSeated, 2);
assert.strictEqual(cfg.playersLeft, 2);
assert.strictEqual(cfg.placesPaid, 1);
assert.deepStrictEqual(PC.tablePositions(cfg), ['SB', 'BB']);

const cfgMid = PC.normalize({ formatHub: 'spin', gameType: 'spin3', mttPhase: 'mid', stackDepth: 'bb20' });
assert.notStrictEqual(cfgMid.mttPhase, 'hu');
assert.ok(!cfgMid.huAdjusted);
assert.deepStrictEqual(PC.tablePositions(cfgMid).length, 3, 'spin mid remains 3-max');

/* Escuela Coach HU lessons */
const lessons = [];
global.PTSchoolData = {
  registerLessons: function (ls) { lessons.push.apply(lessons, ls); },
  rfiSpot: function (id, pos, cards, seed, meta) {
    return Object.assign({ id: id, heroPos: pos, heroCards: cards, seed: seed }, meta || {});
  },
  vsRfiSpot: function (id, pos, cards, seed, meta) {
    return Object.assign({ id: id, heroPos: pos, heroCards: cards, seed: seed }, meta || {});
  },
  isoSpot: function () { return {}; },
  bbVsSbLimpSpot: function () { return {}; },
  face3betSpot: function () { return {}; }
};
load('js/school-data-spin.js');
load('js/school-data-mtt.js');

function lesson(id) {
  return lessons.find(function (l) { return l.id === id; });
}

['S-18', 'S-19', 'S-20', 'S-21'].forEach(function (id) {
  const l = lesson(id);
  assert.ok(l, id + ' exists');
  assert.strictEqual(l.plan, 'coach', id + ' coach');
  assert.ok(Array.isArray(l.spots) && l.spots.length > 0, id + ' spots');
  l.spots.forEach(function (s) {
    const pc = s.playConfig || {};
    assert.strictEqual(pc.mttPhase, 'hu', id + ' spot mttPhase hu');
  });
});
assert.strictEqual(lesson('S-21').exam, true);

['T-23', 'T-24', 'T-25', 'T-26'].forEach(function (id) {
  const l = lesson(id);
  assert.ok(l, id + ' exists');
  assert.strictEqual(l.plan, 'coach', id + ' coach');
  assert.ok(Array.isArray(l.spots) && l.spots.length > 0, id + ' spots');
  l.spots.forEach(function (s) {
    const pc = s.playConfig || {};
    assert.strictEqual(pc.mttPhase, 'hu', id + ' spot mttPhase hu');
  });
});
assert.strictEqual(lesson('T-26').exam, true);

/* tournament presets smoke */
load('js/tournament/config.js');
const TCfg = global.PTTournamentConfig;
assert.ok(TCfg, 'tournament config');
const presets = typeof TCfg.listPresets === 'function' ? TCfg.listPresets() : [];
const huPresets = presets.filter(function (p) { return p.kind === 'hu'; });
assert.ok(huPresets.length >= 4, 'hu presets present');
['huEasy', 'huMedium', 'huHard', 'huPro'].forEach(function (id) {
  const p = huPresets.find(function (x) { return x.id === id; }) || (TCfg.PRESETS && TCfg.PRESETS[id]);
  assert.ok(p, id);
  assert.strictEqual(p.kind, 'hu');
  assert.strictEqual(p.seatsPerTable, 2);
});

console.log('ok test-villain-hu');
