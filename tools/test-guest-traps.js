/* Las 5 manos guest: trampas preflop, limp/igualar error, línea habitual al river. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const sandbox = { window: {}, console, Math, Date, Set, Map, JSON, parseFloat, parseInt, isNaN };
sandbox.global = sandbox;
vm.createContext(sandbox);

const scripts = [
  'cards.js',
  'engine/cache.js',
  'engine/format/taxonomy.js',
  'engine/ranges/notation.js',
  'engine/ranges/data.js',
  'engine/ranges/extended.js',
  'engine/ranges/variants.js',
  'engine/ranges/pushFold.js',
  'engine/ranges/registry.js',
  'engine/ranges/weights.js',
  'engine/ranges/villainTracking.js',
  'engine/handStrength.js',
  'engine/equity/madeHand.js',
  'engine/math/potMath.js',
  'engine/math/evMath.js',
  'engine/equity/monteCarlo.js',
  'engine/equity/handRank.js',
  'engine/equity/blockers.js',
  'engine/solver/boardCluster.js',
  'engine/validation/boardTextureShift.js',
  'engine/validation/villainCallAudit.js',
  'engine/validation/streetStrategy.js',
  'engine/solver/rangeAdvantage.js',
  'engine/solver/riverShoveNode.js',
  'engine/solver/probeEV.js',
  'engine/solver/villainStrategyAdjust.js',
  'engine/solver/preflopSolver.js',
  'engine/solver/facingBet.js',
  'engine/solver/spotKey.js',
  'engine/solver/strategyTables.js',
  'engine/solver/bluffSpotDetector.js',
  'engine/solver/SolverProvider.js',
  'engine/scoring/classifier.js',
  'engine/scoring/icmEv.js',
  'engine/scoring/evLoss.js',
  'engine/scoring/scoring.js',
  'engine/scoring/errors.js',
  'engine/explanations/rules.js',
  'engine/solver/LocalSolverProvider.js',
  'engine/evaluateSpot.js',
  'engine/villainProfiles.js',
  'engine/villainPreflop.js',
  'engine/stacks.js',
  'play-config.js',
  'ranges.js',
  'engine.js',
  'guest-traps.js'
];

scripts.forEach(function (f) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
});

const Engine = sandbox.window.Engine;
const Traps = sandbox.window.PTGuestTraps;
assert.ok(Engine && Traps, 'Engine + PTGuestTraps');
assert.strictEqual(Traps.list().length, 5, '5 manos guest');
assert.ok(!Traps.playConfig(Traps.list()[0]).schoolDecisionEnd, 'guest juega la mano entera');

function idsOf(hand) {
  return ((hand.current && hand.current.options) || []).map(function (o) { return o.id; });
}

function pickContinue(hand, spot) {
  const opts = idsOf(hand);
  if (hand.stage === 'preflop' && spot && spot.bait && opts.indexOf(spot.bait) >= 0) {
    return spot.bait;
  }
  const preview = Engine.previewAdvice ? Engine.previewAdvice(hand) : null;
  const best = preview && preview.best;
  if (best && best !== 'fold' && opts.indexOf(best) >= 0) return best;
  const prefer = ['check', 'call', 'raise', 'bet_33', 'bet_66', 'bet_100', 'bet'];
  for (let i = 0; i < prefer.length; i++) {
    if (opts.indexOf(prefer[i]) >= 0) return prefer[i];
  }
  return opts.filter(function (id) { return id !== 'fold'; })[0] || opts[0];
}

const rfiSpots = Traps.list().filter(function (s) { return s.type === 'RFI'; });
assert.ok(rfiSpots.length >= 1, 'hay opens RFI con limp');

Traps.list().forEach(function (spot, i) {
  const force = Traps.toForce(spot);
  const cfg = Traps.playConfig(spot);
  assert.strictEqual(cfg.practiceStreet, 'preflop', spot.id + ' practiceStreet preflop');
  assert.ok(!spot.facingBet, spot.id + ' no salta al flop con facingBet');
  assert.ok((force.forceDeal.board || []).length === 5, spot.id + ' board de 5 cartas');
  assert.ok(force.forceScript && force.forceScript.actions.length, spot.id + ' tiene guion al river');

  const hand = Engine.newHand(force, cfg);
  assert.ok(hand && hand.current, spot.id + ' tiene nodo');
  assert.strictEqual(hand.stage, 'preflop', spot.id + ' empieza preflop (era ' + hand.stage + ')');
  const ids = idsOf(hand);
  assert.ok(ids.indexOf(spot.bait) >= 0, spot.id + ' ofrece cebo ' + spot.bait + ' (opts ' + ids.join(',') + ')');
  assert.ok(ids.indexOf('fold') >= 0, spot.id + ' ofrece fold');

  if (spot.type === 'RFI') {
    assert.ok(ids.indexOf('limp') >= 0, spot.id + ' ofrece limp/igualar');
    const limpHand = Engine.newHand(force, cfg);
    const limp = Engine.act(limpHand, 'limp');
    const lcls = limp.decision && limp.decision.class;
    assert.ok(lcls === 'error' || lcls === 'imprecisa',
      spot.id + ' limp debe ser error, fue ' + lcls);
  }
  if (spot.type === 'vsRFI') {
    assert.ok(ids.indexOf('call') >= 0, spot.id + ' ofrece igualar');
    const callHand = Engine.newHand(force, cfg);
    const call = Engine.act(callHand, 'call');
    const ccls = call.decision && call.decision.class;
    assert.ok(ccls === 'error' || ccls === 'imprecisa',
      spot.id + ' igualar debe ser error, fue ' + ccls + ' best=' + (call.decision && call.decision.best));
  }

  const baitHand = Engine.newHand(force, cfg);
  const bait = Engine.act(baitHand, spot.bait);
  const cls = bait.decision && bait.decision.class;
  assert.ok(cls === 'error' || cls === 'imprecisa',
    spot.id + ' cebo ' + spot.bait + ' debe ser error/imprecisa, fue ' + cls +
    ' (best=' + (bait.decision && bait.decision.best) + ')');

  const foldHand = Engine.newHand(force, cfg);
  const fold = Engine.act(foldHand, 'fold');
  const fcls = fold.decision && fold.decision.class;
  assert.ok(fcls === 'optima' || fcls === 'aceptable',
    spot.id + ' fold preflop debe ser óptima/aceptable, fue ' + fcls);

  const play = Engine.newHand(force, cfg);
  const streets = { preflop: false, flop: false, turn: false, river: false };
  streets[play.stage] = true;
  let steps = 0;
  let riverFacing = null;
  while (!play.result && play.current && steps < 16) {
    if (play.stage === 'river' && (play.current.toCallBB || 0) > 0) {
      riverFacing = idsOf(play).slice();
    }
    const action = pickContinue(play, spot);
    assert.ok(action, spot.id + ' hay acción en ' + play.stage);
    Engine.act(play, action);
    streets[play.stage] = true;
    steps++;
  }
  assert.ok(streets.preflop && streets.flop && streets.turn && streets.river,
    spot.id + ' la línea habitual debe pasar preflop/flop/turn/river, visto ' +
    Object.keys(streets).filter(function (k) { return streets[k]; }).join(','));

  assert.ok(riverFacing && riverFacing.indexOf(spot.riverBait) >= 0,
    spot.id + ' en river debe afrontar apuesta con cebo ' + spot.riverBait +
    ' (opts ' + (riverFacing || []).join(',') + ')');

  const riverHand = Engine.newHand(force, cfg);
  let rsteps = 0;
  while (!riverHand.result && riverHand.current && riverHand.stage !== 'river' && rsteps < 16) {
    Engine.act(riverHand, pickContinue(riverHand, spot));
    rsteps++;
  }
  assert.ok(riverHand.current && riverHand.stage === 'river', spot.id + ' llega a decisión de river');
  const riverAct = Engine.act(riverHand, spot.riverBait);
  const rcls = riverAct.decision && riverAct.decision.class;
  assert.ok(rcls === 'error' || rcls === 'imprecisa',
    spot.id + ' cebo river ' + spot.riverBait + ' debe ser error, fue ' + rcls +
    ' best=' + (riverAct.decision && riverAct.decision.best));

  console.log('OK', (i + 1) + '/5', spot.id, 'cebo=' + cls, 'best=' + bait.decision.best, '→ river');
});

const g1 = Traps.list()[0];
assert.strictEqual(g1.forceDeal.board[0], '9h', 'mano 1: flop 9 (par + draw)');
assert.ok(g1.forceDeal.heroCards.indexOf('9d') >= 0, 'mano 1 héroe A9o');
assert.strictEqual(g1.id, 'g1-a9o-bb-vs-utg', 'mano 1 id A9o vs UTG');

const g2 = Traps.list()[1];
assert.strictEqual(g2.forceDeal.villainCards.map(function (c) { return c[0]; }).sort().join(''), 'AK',
  'mano 2 villano AK');
assert.ok(g2.playConfig.guestNeverFold, 'mano 2 villano no foldea');

const g4 = Traps.list()[3];
assert.strictEqual(g4.forceDeal.villainCards[0][0] + g4.forceDeal.villainCards[1][0], 'AQ', 'mano 4 villano AQ');
assert.strictEqual(g4.forceDeal.board[4][0], 'J', 'mano 4 river J');
assert.ok(g4.playConfig.guestNeverFold, 'mano 4 villano no foldea');

function raiseDoesNotFold(spot) {
  const force = Traps.toForce(spot);
  const cfg = Traps.playConfig(spot);
  const play = Engine.newHand(force, cfg);
  let steps = 0;
  while (!play.result && play.current && play.stage === 'preflop' && steps < 8) {
    Engine.act(play, pickContinue(play, spot));
    steps++;
  }
  assert.ok(play.current && play.stage === 'flop', spot.id + ' llega al flop para raise');
  if (idsOf(play).indexOf('check') >= 0 && idsOf(play).indexOf('fold') < 0) {
    Engine.act(play, 'check');
  }
  const ids = idsOf(play);
  assert.ok(ids.indexOf('raise') >= 0, spot.id + ' flop ofrece raise (opts ' + ids.join(',') + ')');
  Engine.act(play, 'raise');
  assert.ok(!play.result, spot.id + ' villano no foldea el raise de flop (result=' +
    (play.result && play.result.reason) + ')');
  assert.ok(play.stage === 'turn' || play.stage === 'river' || play.current,
    spot.id + ' la mano sigue tras el raise');
}

raiseDoesNotFold(g2);
raiseDoesNotFold(g4);

console.log('*** guest-traps OK ***');

const noGuest = Engine.newHand({
  type: 'RFI',
  heroPos: 'UTG',
  seed: 1,
  forceDeal: { heroCards: ['Ah', 'Kh'], villainCards: ['7s', '7c'], board: [], villainPos: 'BB' }
}, {
  formatHub: 'cash', gameType: 'cash6', stackDepth: 'bb100', villainLevel: 'pro',
  handRange: 'all', schoolMode: false, practiceStreet: 'preflop', scenario: 'rfi'
});
assert.ok(idsOf(noGuest).indexOf('limp') < 0, 'entrenador autenticado no añade limp en RFI');
