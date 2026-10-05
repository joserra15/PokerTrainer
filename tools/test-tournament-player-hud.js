/**
 * tools/test-tournament-player-hud.js — HUD en vivo por jugador (torneos).
 * Run: node tools/test-tournament-player-hud.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');

function createSandbox() {
  const sandbox = {
    console, Math, Date, JSON, Promise, parseFloat, parseInt, isNaN, isFinite,
    Array, Object, String, Number, Boolean, Error, RegExp, Set, Map
  };
  sandbox.global = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

function load(sandbox, rel) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: path.basename(rel) });
}

const g = createSandbox();
load(g, 'js/engine/villainProExploit.js');
load(g, 'js/tournament/player-hud.js');

const Hud = g.PTTournamentPlayerHud;
assert.ok(Hud, 'PTTournamentPlayerHud export');
assert.strictEqual(typeof Hud.onHandComplete, 'function');
assert.strictEqual(typeof Hud.classify, 'function');
assert.strictEqual(typeof Hud.renderStripHtml, 'function');

/* --- analyzePreflop: open + 3bet + fold-to-3bet --- */
{
  const hand = {
    sb: 50,
    bb: 100,
    ante: 0,
    seats: [
      { id: 'hero', pos: 'CO', invested: 300 },
      { id: 'v1', pos: 'BTN', invested: 900 },
      { id: 'v2', pos: 'BB', invested: 100 }
    ],
    log: [
      { street: 'preflop', id: 'hero', action: 'raise' },
      { street: 'preflop', id: 'v1', action: 'raise' },
      { street: 'preflop', id: 'v2', action: 'fold' },
      { street: 'preflop', id: 'hero', action: 'fold' }
    ]
  };
  const pf = Hud.analyzePreflop(hand);
  assert.strictEqual(pf.hero.pfr, true, 'hero PFR on open');
  assert.strictEqual(pf.hero.threeBet, false, 'opener is not 3bettor');
  assert.strictEqual(pf.hero.foldTo3BetOpp, true, 'hero fold-to-3bet opp');
  assert.strictEqual(pf.hero.foldTo3Bet, true, 'hero folded to 3bet');
  assert.strictEqual(pf.v1.threeBet, true, 'v1 3bet');
  assert.strictEqual(pf.v1.threeBetOpp, true, 'v1 3bet opp');
  assert.strictEqual(pf.v1.pfr, true, 'v1 PFR');
  assert.strictEqual(pf.v2.threeBetOpp, false, 'BB folded after 3bet already out');
}

/* BB call vs open = 3bet opportunity */
{
  const hand = {
    sb: 50, bb: 100, ante: 0,
    seats: [
      { id: 'hero', pos: 'CO', invested: 250 },
      { id: 'v1', pos: 'BB', invested: 100 }
    ],
    log: [
      { street: 'preflop', id: 'hero', action: 'raise' },
      { street: 'preflop', id: 'v1', action: 'call' }
    ]
  };
  const pf = Hud.analyzePreflop(hand);
  assert.strictEqual(pf.v1.threeBetOpp, true, 'BB call vs open = 3bet opp');
  assert.strictEqual(pf.v1.threeBet, false, 'call is not 3bet');
  assert.strictEqual(pf.hero.pfr, true);
}

/* --- onHandComplete accumulates all seats --- */
{
  const state = { playerHud: {} };
  const hand = {
    sb: 50, bb: 100, ante: 0,
    seats: [
      { id: 'hero', isHero: true, pos: 'BTN', invested: 250 },
      { id: 'v1', pos: 'BB', invested: 100 }
    ],
    log: [
      { street: 'preflop', id: 'hero', action: 'raise' },
      { street: 'preflop', id: 'v1', action: 'fold' }
    ],
    result: { deltas: { hero: 100, v1: -100 } }
  };
  Hud.onHandComplete(state, hand);
  const hero = Hud.snapshot(state, 'hero');
  const v1 = Hud.snapshot(state, 'v1');
  assert.strictEqual(hero.hands, 1);
  assert.strictEqual(hero.vpipHands, 1);
  assert.strictEqual(hero.pfrHands, 1);
  assert.strictEqual(v1.hands, 1);
  assert.strictEqual(v1.vpipHands, 0, 'BB fold = no VPIP');
  assert.strictEqual(v1.threeBetOpps, 1);
  assert.strictEqual(v1.threeBetHands, 0);
}

/* --- 3bet hand increments --- */
{
  const state = { playerHud: {} };
  const hand = {
    sb: 50, bb: 100, ante: 0,
    seats: [
      { id: 'v1', pos: 'CO', invested: 300 },
      { id: 'v2', pos: 'BTN', invested: 900 },
      { id: 'hero', isHero: true, pos: 'BB', invested: 100 }
    ],
    log: [
      { street: 'preflop', id: 'v1', action: 'raise' },
      { street: 'preflop', id: 'v2', action: 'raise' },
      { street: 'preflop', id: 'hero', action: 'fold' },
      { street: 'preflop', id: 'v1', action: 'fold' }
    ]
  };
  Hud.onHandComplete(state, hand);
  const v2 = Hud.snapshot(state, 'v2');
  assert.strictEqual(v2.threeBetHands, 1);
  assert.strictEqual(v2.threeBetOpps, 1);
  assert.ok(v2.threeBetPct === 100, '3bet pct 100, got ' + v2.threeBetPct);
  const v1 = Hud.snapshot(state, 'v1');
  assert.strictEqual(v1.foldTo3BetOpps, 1);
  assert.strictEqual(v1.foldTo3BetHands, 1);
}

/* --- classify phase-aware + confidence --- */
{
  const low = Hud.classify({ hands: 2, vpipPct: 10, pfrPct: 8 }, 'early');
  assert.strictEqual(low.confidence, 0, 'below partial sample');
  assert.strictEqual(low.archetype, null);

  const nit = Hud.classify({
    hands: 12, vpipPct: 12, pfrPct: 10, foldTo3BetPct: 80
  }, 'early');
  assert.ok(nit.confidence > 0);
  assert.strictEqual(nit.archetype, 'nit');

  const lagLate = Hud.classify({
    hands: 20, vpipPct: 38, pfrPct: 32
  }, 'late');
  assert.ok(lagLate.archetype === 'lag' || lagLate.archetype === 'maniac',
    'loose late → lag/maniac, got ' + lagLate.archetype);
}

/* --- strip HTML --- */
{
  const html = Hud.renderStripHtml({
    hands: 7, vpipPct: 28.5, pfrPct: 22, threeBetPct: null
  });
  assert.ok(html.indexOf('Jugado') >= 0);
  assert.ok(html.indexOf('Subido') >= 0);
  assert.ok(html.indexOf('Resubido') >= 0);
  assert.ok(html.indexOf('Manos') >= 0);
  assert.ok(html.indexOf('28,5%') >= 0 || html.indexOf('28.5%') >= 0);
  assert.ok(html.indexOf('—') >= 0, 'missing 3bet shows dash');
}

/* --- multipliers use targetSessionStats --- */
{
  const Ex = g.GTOVillainProExploit;
  const m = Ex.multipliers({
    formatHub: 'mtt',
    proStyle: 'exploit_pool',
    targetProfile: 'overfolder',
    targetSessionStats: { handsPlayed: 20, vpipPct: 18, pfrPct: 14, foldToCbetFlopPct: 70 }
  });
  assert.ok(m.barrel > 1.1, 'overfolder target → more barrel');
  assert.ok(m.bluff > 1.05, 'overfolder target → more bluff');
}

console.log('ok — test-tournament-player-hud');
