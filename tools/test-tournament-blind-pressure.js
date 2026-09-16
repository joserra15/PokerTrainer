#!/usr/bin/env node
/**
 * Torneos: villanos sienten la próxima subida de ciegas (moverse antes de quedar cortos).
 * Run: node tools/test-tournament-blind-pressure.js
 */
'use strict';

const assert = require('assert');
const { createSandbox, loadTrainer, runFiles } = require('./load-engine-vm');

const s = createSandbox();
loadTrainer(s);
runFiles(s, [
  'js/tournament/config.js',
  'js/tournament/blinds.js',
  'js/tournament/names.js',
  'js/tournament/seating.js',
  'js/tournament/state.js',
  'js/tournament/live-hand.js',
  'js/tournament/villain-decide.js'
]);

const Blinds = s.window.PTTournamentBlinds || s.PTTournamentBlinds;
const Cfg = s.window.PTTournamentConfig || s.PTTournamentConfig;
const Live = s.window.PTTournamentLiveHand || s.PTTournamentLiveHand;
const D = s.window.PTTournamentVillainDecide || s.PTTournamentVillainDecide;
const State = s.window.PTTournamentState || s.PTTournamentState;

assert.ok(Blinds && Live && D && Cfg, 'deps');

/* ---- Flags: proyección crítica cerca del blind-up ---- */
const flagsOk = D.blindPressureFlags({
  handsUntilNextLevel: 2,
  nextBB: 50,
  stackBB: 16,
  stackAtNextBB: 9.6
}, 30);
assert.strictEqual(flagsOk.pressure, true, 'pressure near up + short after');
assert.strictEqual(flagsOk.strong, true, 'strong when ≤10bb after and until≤2');

const flagsFar = D.blindPressureFlags({
  handsUntilNextLevel: 8,
  nextBB: 50,
  stackBB: 16,
  stackAtNextBB: 9.6
}, 30);
assert.strictEqual(flagsFar.pressure, false, 'no pressure mid-level');

const flagsDeep = D.blindPressureFlags({
  handsUntilNextLevel: 1,
  nextBB: 50,
  stackBB: 80,
  stackAtNextBB: 48
}, 30);
assert.strictEqual(flagsDeep.pressure, false, 'deep stack ignores blind-up');

console.log('OK blindPressureFlags');

/* ---- attachTourneyContext expone el reloj ---- */
const preset = Cfg.fromPreset('easy');
assert.ok(preset && preset.blindSchedule, 'preset schedule');

const state = State.create(preset, { seed: 42, heroName: 'Hero' });
/* Colocar handIndex al final del nivel 1 (casi blind-up). */
const lv1Hands = preset.blindSchedule[0].hands;
state.handIndex = Math.max(0, lv1Hands - 2);
const until = Blinds.handsUntilNext(preset.blindSchedule, state.handIndex);
assert.ok(until <= 2, 'fixture near blind-up, until=' + until);

const next = Blinds.nextLevel(preset.blindSchedule, state.handIndex);
const cur = Blinds.currentLevel(preset.blindSchedule, state.handIndex);
/* ~16bb ahora → ~10.7bb tras up (bb 30→45 o 20→30 según nivel). */
const shortStack = Math.round(cur.bb * 16);
const hand = {
  bb: cur.bb,
  ante: cur.ante || 0,
  seats: [{ id: 'v1', stack: shortStack, pos: 'BTN' }, { id: 'hero', stack: 1000, pos: 'BB', isHero: true }]
};
Live.attachTourneyContext(hand, state);
assert.strictEqual(hand.handsUntilNextLevel, until, 'hand.handsUntilNextLevel');
assert.strictEqual(hand.nextBB, next.bb, 'hand.nextBB');
assert.ok(hand.state && hand.state.handsUntilNextLevel === until, 'state mirror');
assert.ok(hand.state.nextBB === next.bb, 'state nextBB');

const vSeat = {
  id: 'v1', cards: ['As', 'Kd'], pos: 'BTN', stack: shortStack,
  streetInvested: 0, roleId: 'pro', proStyle: 'exploit_pool'
};
hand.seats = [
  { id: 'h1', cards: ['2c', '3d'], pos: 'BB', stack: 2000, streetInvested: hand.bb, isHero: true, folded: false },
  vSeat
];
hand.street = 'preflop';
hand.currentBet = hand.bb;
hand.minRaise = hand.bb;
hand.pot = hand.bb + hand.bb / 2;
hand.openerId = null;
hand.kind = preset.kind || 'mtt';
hand.tournamentConfig = Object.assign({}, preset, { aiLevel: 'elite' });

const ctx = D.rangeCtx(hand, vSeat);
assert.ok(ctx.handsUntilNextLevel != null, 'ctx until');
assert.ok(ctx.nextBB > hand.bb, 'next BB higher');
assert.ok(ctx.stackAtNextBB != null && ctx.stackAtNextBB < ctx.stackBB, 'stack shrinks after up');
assert.strictEqual(ctx.blindPressure, true, 'ctx blindPressure stackNext=' + ctx.stackAtNextBB);
console.log('OK attach+rangeCtx', {
  until: ctx.handsUntilNextLevel,
  stackBB: ctx.stackBB,
  stackAtNext: ctx.stackAtNextBB,
  pressure: ctx.blindPressure,
  strong: ctx.blindPressureStrong
});

/* ---- Decide: más shoves/opens con presión que sin ella (misma mano jugable) ---- */
function countActs(h, seat, n) {
  let raises = 0;
  let allinish = 0;
  let folds = 0;
  for (let i = 0; i < n; i++) {
    const a = D.decide(h, seat);
    if (!a || a.id === 'fold') folds++;
    else if (a.id === 'raise' || a.id === 'bet') {
      raises++;
      const to = Number(a.amount) || 0;
      if (to >= seat.streetInvested + seat.stack - 1) allinish++;
    }
  }
  return { raises: raises, allinish: allinish, folds: folds };
}

function mkDecideHand(opts) {
  opts = opts || {};
  const bb = opts.bb || 30;
  const stack = opts.stack != null ? opts.stack : 480;
  const h = {
    street: 'preflop',
    bb: bb,
    ante: 0,
    pot: bb + bb / 2,
    currentBet: bb,
    minRaise: bb,
    openerId: null,
    board: [],
    log: [],
    kind: 'mtt',
    formatHub: 'mtt',
    mttPhase: 'mid',
    playersSeated: 6,
    placesPaid: 3,
    playersLeft: 12,
    handsUntilNextLevel: opts.until != null ? opts.until : 8,
    nextBB: opts.nextBB != null ? opts.nextBB : bb,
    tournamentConfig: { kind: 'mtt', aiLevel: 'elite', exploitProPct: 0.5 },
    seats: [
      {
        id: 'h1', cards: ['2c', '7d'], pos: 'BB', roleId: 'tag',
        stack: 3000, streetInvested: bb, isHero: true, folded: false
      },
      {
        id: 'v1', cards: opts.cards || ['Ah', 'Ts'], pos: 'BTN', roleId: 'pro',
        stack: stack, streetInvested: bb / 2, folded: false, proStyle: 'exploit_pool'
      }
    ]
  };
  h.state = {
    handsUntilNextLevel: h.handsUntilNextLevel,
    nextBB: h.nextBB,
    playersLeft: h.playersLeft,
    placesPaid: h.placesPaid,
    mttPhase: h.mttPhase
  };
  return h;
}

const n = 80;
const withPress = mkDecideHand({ until: 2, nextBB: 50, bb: 30, stack: 480, cards: ['Kh', 'Ts'] });
const noPress = mkDecideHand({ until: 8, nextBB: 30, bb: 30, stack: 480, cards: ['Kh', 'Ts'] });
const rPress = countActs(withPress, withPress.seats[1], n);
const rCalm = countActs(noPress, noPress.seats[1], n);

assert.ok(rPress.raises + rPress.allinish >= rCalm.raises * 0.9,
  'pressure should not fold more; press=' + JSON.stringify(rPress) + ' calm=' + JSON.stringify(rCalm));
assert.ok(
  rPress.allinish >= rCalm.allinish || rPress.raises >= Math.max(1, rCalm.raises),
  'under blind pressure expect ≥ jams or opens; press=' + JSON.stringify(rPress) +
  ' calm=' + JSON.stringify(rCalm)
);

/* Caso fuerte: 15bb ahora → ~9bb tras up, until=1 → casi siempre jam con ATs */
const strongH = mkDecideHand({ until: 1, nextBB: 50, bb: 30, stack: 450, cards: ['As', 'Td'] });
const rStrong = countActs(strongH, strongH.seats[1], n);
assert.ok(rStrong.raises >= Math.floor(n * 0.55),
  'strong pressure ATs should open/shove often, got ' + JSON.stringify(rStrong));
console.log('OK decide pressure', { rPress: rPress, rCalm: rCalm, rStrong: rStrong });

console.log('\nAll tournament blind-pressure checks passed.');
