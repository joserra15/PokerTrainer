#!/usr/bin/env node
/**
 * tools/test-tournament-ai-difficulty.js
 * Ciegas infinitas, fuerza relativa al board, presets difíciles, soft mixes GTO, folds air.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');

function createSandbox() {
  const sandbox = {
    console: console,
    Math: Math,
    Date: Date,
    JSON: JSON,
    parseFloat: parseFloat,
    parseInt: parseInt,
    isNaN: isNaN,
    isFinite: isFinite,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Error: Error,
    RegExp: RegExp,
    Set: Set,
    Map: Map
  };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

function load(sandbox, rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) throw new Error('missing ' + rel);
  vm.runInContext(fs.readFileSync(abs, 'utf8'), sandbox, { filename: path.basename(rel) });
}

const g = createSandbox();
[
  'js/cards.js',
  'js/engine/equity/madeHand.js',
  'js/tournament/blinds.js',
  'js/tournament/config.js'
].forEach(function (f) { load(g, f); });

/* Optional solver bits for soft-mix check */
try {
  if (fs.existsSync(path.join(ROOT, 'js/engine/handStrength.js'))) {
    load(g, 'js/engine/handStrength.js');
  }
  if (fs.existsSync(path.join(ROOT, 'js/engine/ranges/notation.js'))) {
    load(g, 'js/engine/ranges/notation.js');
  }
  load(g, 'js/engine/solver/preflopSolver.js');
} catch (e) {
  console.warn('preflop solver optional load:', e.message);
}

/* ---- 1. Ciegas infinitas ---- */
const Blinds = g.PTTournamentBlinds;
assert(Blinds, 'PTTournamentBlinds missing');
const Cfg = g.PTTournamentConfig;
const sched = Cfg.defaultScheduleForSeats(6);
assert.strictEqual(sched.length, 10, 'base schedule has 10 levels');

const lv10Start = sched.slice(0, 9).reduce(function (a, l) { return a + l.hands; }, 0);
const at10 = Blinds.currentLevel(sched, lv10Start);
assert.strictEqual(at10.level, 10, 'level 10 at expected hand index');

const after10 = Blinds.currentLevel(sched, lv10Start + at10.hands);
assert.ok(after10.level >= 11, 'continues past level 10, got ' + after10.level);
assert.ok(after10.bb > at10.bb, 'blinds increase after level 10: ' + after10.bb + ' vs ' + at10.bb);

const until = Blinds.handsUntilNext(sched, lv10Start + at10.hands);
assert.ok(until != null && until > 0, 'handsUntilNext never null after last fixed level');

const next = Blinds.nextLevel(sched, lv10Start + at10.hands);
assert.ok(next && next.level > 10, 'nextLevel exists past fixed schedule');
console.log('OK blinds infinite: lv10', at10.bb, '→', after10.level, after10.bb);

/* ---- 2. Presets más duros ---- */
const hard = Cfg.fromPreset('hard');
assert.ok(hard.roleWeights.pro >= 55, 'hard pro weight ' + hard.roleWeights.pro);
assert.ok(hard.exploitProPct >= 0.65, 'hard exploitProPct ' + hard.exploitProPct);
const pro = Cfg.fromPreset('mttPro');
assert.ok(pro.roleWeights.pro >= 85, 'mttPro pro weight');
assert.ok(pro.exploitProPct >= 0.9, 'mttPro exploit');
console.log('OK presets harder: hard pro', hard.roleWeights.pro, 'exploit', hard.exploitProPct);

/* ---- 3. Fuerza relativa al board ---- */
const Made = g.GTOEquityMadeHand;
assert(Made && typeof Made.relativeStrength01 === 'function', 'relativeStrength01 missing');

const qjBoard = Made.relativeStrength01(['Qh', 'Jd'], ['4c', '7d', '7s', '9h', '4d'], 'river');
assert.ok(qjBoard < 0.35, 'QJ playing board two-pair should be weak, got ' + qjBoard);

const aHigh = Made.relativeStrength01(['As', '3c'], ['Kh', '7d', '7c', '9s', '2h'], 'river');
assert.ok(aHigh < 0.36, 'A-high vs pair board weak, got ' + aHigh);

const topPair = Made.relativeStrength01(['Ah', 'Kd'], ['Ac', '7d', '2c', '9s', '3h'], 'river');
assert.ok(topPair > 0.55, 'top pair AK should be strong, got ' + topPair);

const overpair = Made.relativeStrength01(['Qh', 'Qd'], ['Jc', '7d', '2c'], 'flop');
assert.ok(overpair > 0.55, 'QQ overpair strong, got ' + overpair);
console.log('OK relative strength: board-play', qjBoard.toFixed(2), 'top pair', topPair.toFixed(2));

/* ---- 4. Soft mixes preflop ---- */
const Pre = g.GTOPreflopSolver;
if (Pre && Pre.softenPureStrategy) {
  const pureRaise = Pre.softenPureStrategy({ fold: 0, raise: 1 }, 'AKs');
  assert.ok(pureRaise.raise < 0.97, 'pure raise softened, got ' + pureRaise.raise);
  assert.ok((pureRaise.fold || 0) + (pureRaise.call || 0) > 0.03, 'residual actions present');
  console.log('OK soft mixes: raise', pureRaise.raise.toFixed(2));
} else {
  console.log('SKIP soft mixes (solver not fully loaded)');
}

/* ---- 5. Villain decide fold board-air ---- */
const villainDeps = [
  'js/engine/format/taxonomy.js',
  'js/engine/format/tournament-context.js',
  'js/engine/ranges/data.js',
  'js/engine/ranges/notation.js',
  'js/engine/ranges/registry.js',
  'js/engine/ranges/pushFold.js',
  'js/engine/handStrength.js',
  'js/engine/villainProfiles.js',
  'js/engine/villainPreflop.js',
  'js/engine/villainFormatAdjust.js',
  'js/engine/villainProExploit.js',
  'js/engine/villainLinePolicy.js',
  'js/engine/villainSizing.js',
  'js/engine/boardCluster.js',
  'js/tournament/villain-decide.js'
];
villainDeps.forEach(function (f) {
  if (!fs.existsSync(path.join(ROOT, f))) {
    console.warn('missing optional', f);
    return;
  }
  try { load(g, f); } catch (e) { console.warn('load skip', f, e.message); }
});

const D = g.PTTournamentVillainDecide;
assert(D && D.decide, 'PTTournamentVillainDecide missing');

function mkHand(board, street, villainCards, opts) {
  opts = opts || {};
  const bb = 100;
  return {
    street: street,
    bb: bb,
    pot: opts.pot || 400,
    currentBet: opts.currentBet || 200,
    minRaise: bb,
    openerId: 'h1',
    openerPos: 'BB',
    board: board,
    log: opts.log || [],
    kind: 'mtt',
    seats: [
      {
        id: 'h1', cards: ['Ah', 'Kd'], pos: 'BB', roleId: 'tag',
        stack: 5000, streetInvested: 0, isHero: true, folded: false
      },
      {
        id: 'v1', cards: villainCards, pos: 'BTN', roleId: opts.role || 'pro',
        stack: opts.stack || 5000, streetInvested: 0, folded: false,
        proStyle: opts.proStyle || 'exploit_pool'
      }
    ]
  };
}

let folds = 0;
const airHand = mkHand(['4c', '7d', '7s', '9h', '4d'], 'river', ['Qc', 'Jd']);
for (let i = 0; i < 50; i++) {
  const a = D.decide(airHand, airHand.seats[1]);
  if (a && a.id === 'fold') folds++;
}
assert.ok(folds >= 35, 'board-air QJ should fold often, folds=' + folds + '/50');
console.log('OK villain folds board-air:', folds + '/50');

let continues = 0;
const valueHand = mkHand(['Ac', '7d', '2c', '9s', '3h'], 'river', ['Ah', 'Kd'], {
  currentBet: 150,
  pot: 400
});
for (let i = 0; i < 50; i++) {
  const a = D.decide(valueHand, valueHand.seats[1]);
  if (a && (a.id === 'call' || a.id === 'raise')) continues++;
}
assert.ok(continues >= 25, 'top pair should continue often, got ' + continues + '/50');
console.log('OK villain continues top pair:', continues + '/50');

/* HU open wider: BTN with medium hand */
let opens = 0;
for (let i = 0; i < 40; i++) {
  const hu = {
    street: 'preflop',
    bb: 100,
    pot: 150,
    currentBet: 100,
    minRaise: 100,
    openerId: null,
    openerPos: null,
    board: [],
    log: [],
    kind: 'mtt',
    seats: [
      {
        id: 'v1', cards: ['Kh', '9d'], pos: 'BTN', roleId: 'tag',
        stack: 2500, streetInvested: 50, folded: false
      },
      {
        id: 'h1', cards: ['7c', '2d'], pos: 'BB', roleId: 'tag',
        stack: 2500, streetInvested: 100, isHero: true, folded: false
      }
    ]
  };
  const a = D.decide(hu, hu.seats[0]);
  if (a && (a.id === 'raise' || a.id === 'bet')) opens++;
}
assert.ok(opens >= 10, 'HU BTN K9o should open sometimes, opens=' + opens + '/40');
console.log('OK HU steal/open pressure:', opens + '/40');

console.log('\nAll tournament AI difficulty checks passed.');
