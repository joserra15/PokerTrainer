/**
 * tools/test-tournament-leak-replay-hu.js — Replay de fugas HU de torneo:
 * scenarioRaw con heroPos + newHand no deja «Eres undefined» ni hero.pos vacío.
 * Run: node tools/test-tournament-leak-replay-hu.js
 */
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { createSandbox, loadTrainer } = require('./load-engine-vm');

const ROOT = path.join(__dirname, '..');
const sb = createSandbox();
loadTrainer(sb);

function loadExtra(rel) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(code, sb, { filename: path.basename(rel) });
}
loadExtra('js/leaks.js');
loadExtra('js/tournament/leaks-bridge.js');

const Engine = sb.window.Engine;
const PC = sb.window.PTPlayConfig;
const LB = sb.window.PTTournamentLeaksBridge;

assert.ok(Engine, 'Engine loaded');
assert.ok(PC, 'PTPlayConfig loaded');
assert.ok(LB, 'leaks bridge');

const legacyErr = {
  id: 'legacy_hu',
  class: 'error',
  street: 'preflop',
  heroPos: 'SB',
  displayHeroPos: 'SB',
  heroCards: ['As', 'Kd'],
  source: 'tournamentAi',
  tournament: true,
  scenarioRaw: { type: 'RFI', tournament: true },
  playConfig: {
    formatHub: 'mtt',
    gameType: 'mtt',
    mttPhase: 'hu',
    resolvedPhase: 'hu',
    practiceIntent: 'mixed',
    source: 'tournamentAi'
  },
  evLoss: 1.2
};

/* Simular prepareReplayFromStored: inyectar heroPos desde el registro. */
const force = Object.assign({}, legacyErr.scenarioRaw, { seed: 42 });
const disp = legacyErr.displayHeroPos || legacyErr.heroPos;
if (disp) {
  if (!force.heroPos) force.heroPos = disp;
  force.displayHeroPos = force.displayHeroPos || disp;
}
force.forceDeal = { heroCards: legacyErr.heroCards.slice() };

const cfg = PC.normalize(Object.assign({}, legacyErr.playConfig));
const hand = Engine.newHand(force, cfg);
assert.ok(hand, 'newHand');
assert.ok(hand.hero && hand.hero.pos, 'hero.pos set (was undefined before fix)');
assert.strictEqual(hand.hero.pos, 'SB', 'hero.pos = SB');
assert.ok(hand.displayHeroPos === 'SB' || hand.scenario.heroPos === 'SB',
  'display/scenario heroPos SB');
assert.ok(hand.current && hand.current.context, 'has context');
assert.ok(!/Eres undefined/.test(hand.current.context),
  'context must not say Eres undefined: ' + hand.current.context);
assert.ok(/Eres SB/.test(hand.current.context),
  'context says Eres SB: ' + hand.current.context);

/* Nuevo pipeline: errorsFromHand ya trae heroPos en scenarioRaw. */
const fresh = LB.errorsFromHand({
  id: 'hu_fresh',
  heroPos: 'SB',
  heroCards: ['Ah', 'Qs'],
  tableMax: 2,
  mttPhase: 'hu',
  gameKind: 'mtt',
  decisions: [{
    street: 'preflop', class: 'error', evLoss: 0.8, spotKind: 'RFI',
    chosen: 'fold', best: 'raise', mttPhase: 'hu'
  }]
}, { id: 't', config: { kind: 'mtt' } });
assert.strictEqual(fresh[0].scenarioRaw.heroPos, 'SB', 'fresh scenarioRaw.heroPos');

console.log('OK tournament-leak-replay-hu');
