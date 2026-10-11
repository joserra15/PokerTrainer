#!/usr/bin/env node
/**
 * Regresión: fase MTT por stack del héroe (no avg del torneo) +
 * defensa short vs open (88 BB jam @ 15bb no Error con charts Early).
 */
'use strict';

const assert = require('assert');
const { createSandbox, loadEngine, runFiles } = require('./load-engine-vm');

const sandbox = createSandbox();
loadEngine(sandbox);
runFiles(sandbox, [
  'js/tournament/gto-eval.js',
  'js/tournament/live-hand.js'
]);

const w = sandbox.window || sandbox;
const Tax = w.PTFormatTaxonomy;
const GtoEval = w.PTTournamentGtoEval;
const Live = w.PTTournamentLiveHand;
const GTO = w.GTO;
const PF = w.GTOPushFold;
const RR = w.GTORangesRegistry;
const N = w.GTORangesNotation;

function ok(cond, msg) {
  assert.ok(cond, msg);
  console.log('OK:', msg);
}

ok(!!Tax && !!GtoEval && !!Live && !!GTO && !!PF, 'módulos cargados');

/* --- 1) Hero 15bb + mttPhase early (avg deep) → short --- */
(function phaseFromHeroNotAvg() {
  const phase = GtoEval.resolveTournamentPhase(15, {
    formatHub: 'mtt',
    kind: 'mtt',
    mttPhase: 'early',
    avgStackBB: 50,
    playersSeated: 6
  });
  ok(phase === 'short', '15bb con mttPhase early → short (got ' + phase + ')');

  const mid = GtoEval.resolveTournamentPhase(30, {
    formatHub: 'mtt',
    mttPhase: 'early',
    avgStackBB: 60
  });
  ok(mid === 'mid', '30bb con early avg → mid (got ' + mid + ')');

  const deep = GtoEval.resolveTournamentPhase(55, {
    formatHub: 'mtt',
    mttPhase: 'auto',
    avgStackBB: 55
  });
  ok(deep === 'early', '55bb auto → early (got ' + deep + ')');
})();

/* --- 2) Bubble / HU estructurales se respetan --- */
(function structuralOverrides() {
  const bubble = GtoEval.resolveTournamentPhase(15, {
    formatHub: 'mtt',
    mttPhase: 'bubble',
    mttStructureSituation: 'bubble',
    playersLeft: 13,
    placesPaid: 12
  });
  ok(bubble === 'bubble', 'bubble estructural no se pisa (got ' + bubble + ')');

  const hu = GtoEval.resolveTournamentPhase(15, {
    formatHub: 'mtt',
    mttPhase: 'hu',
    kind: 'hu',
    playersLeft: 2,
    placesPaid: 1,
    playersSeated: 2
  });
  ok(hu === 'hu', 'HU estructural no se pisa (got ' + hu + ')');
})();

/* --- 3) live-hand attachTourneyContext usa stack héroe --- */
(function liveHandHeroPhase() {
  const bb = 200;
  const hand = {
    bb: bb,
    sb: 100,
    ante: 20,
    seats: [
      { id: 'h', isHero: true, pos: 'BB', stack: 15 * bb, streetInvested: 0, startStack: 15 * bb },
      { id: 'v', isHero: false, pos: 'UTG2', stack: 80 * bb, streetInvested: 0 }
    ]
  };
  const state = {
    config: { kind: 'mtt', seatsPerTable: 6, placesPaid: 16, entries: 108, tournamentType: 'vanilla' },
    players: [
      { id: 'h', alive: true, stack: 15 * bb },
      { id: 'a', alive: true, stack: 55 * bb },
      { id: 'b', alive: true, stack: 60 * bb },
      { id: 'c', alive: true, stack: 48 * bb },
      { id: 'd', alive: true, stack: 70 * bb },
      { id: 'v', alive: true, stack: 80 * bb }
    ],
    playersLeft: 90
  };
  Live.attachTourneyContext(hand, state);
  ok(hand.avgStackBB != null && hand.avgStackBB > 45,
    'avgStackBB deep (got ' + hand.avgStackBB + ')');
  ok(hand.mttPhase === 'short',
    'attachTourneyContext: héroe 15bb → short pese a avg deep (got ' + hand.mttPhase + ')');
})();

/* --- 4) Charts short: 88 en threeBetMix BB vs UTG2 --- */
(function shortChart88() {
  const ctx = {
    formatHub: 'mtt',
    gameType: 'mtt',
    stackBB: 15,
    stackDepth: 'bb15',
    mttPhase: 'short',
    resolvedPhase: 'short'
  };
  const row = RR.getVsRfiRow('BB', 'UTG2', ctx);
  ok(!!row, 'fila BB_vs_UTG2 short');
  ok(N.toSet(row.threeBetMix || '').has('88'),
    '88 en threeBetMix short BB_vs_UTG2');
  ok(N.toSet(row.call || '').has('88'),
    '88 sigue en call short BB_vs_UTG2');
})();

/* --- 5) stealDefense @ 15bb: allin material con 88 --- */
(function stealDefenseMidPair() {
  const strat = PF.stealDefenseStrategy({
    handCode: '88',
    position: 'BB',
    vsPosition: 'UTG2',
    effStack: 15,
    stackBB: 15,
    formatHub: 'mtt',
    mttPhase: 'short',
    resolvedPhase: 'short',
    rangeContext: RR.normalize({
      formatHub: 'mtt',
      stackBB: 15,
      mttPhase: 'short',
      resolvedPhase: 'short'
    })
  });
  ok((strat.allin || 0) >= 0.15,
    'stealDefense 88@15bb allin>=15% (got ' + Math.round((strat.allin || 0) * 100) + '%)');
})();

/* --- 6) Spot vivo: BB 88 jam vs UTG2 @ 15bb no Error --- */
(function jam88NotError() {
  const bb = 200;
  const heroStack = 15 * bb;
  const hand = {
    street: 'preflop',
    stage: 'playing',
    bb: bb,
    sb: 100,
    ante: 20,
    pot: 5 * bb,
    currentBet: 1.5 * bb,
    minRaise: bb,
    kind: 'mtt',
    formatHub: 'mtt',
    /* Contaminación típica: fase Early por avg del torneo. */
    mttPhase: 'early',
    avgStackBB: 52,
    playersLeft: 90,
    placesPaid: 16,
    playersSeated: 6,
    tableMax: 6,
    openerId: 'v1',
    openerPos: 'UTG2',
    board: [],
    seats: [
      {
        id: 'hero',
        isHero: true,
        pos: 'BB',
        stack: heroStack - bb,
        streetInvested: bb,
        cards: [{ code: '8s' }, { code: '8c' }],
        folded: false
      },
      {
        id: 'v1',
        isHero: false,
        pos: 'UTG2',
        stack: 80 * bb - 1.5 * bb,
        streetInvested: 1.5 * bb,
        folded: false,
        roleId: 'tag'
      },
      {
        id: 'sb',
        isHero: false,
        pos: 'SB',
        stack: 40 * bb,
        streetInvested: 0,
        folded: true,
        roleId: 'nit'
      }
    ],
    heroOptions: [
      { id: 'fold' },
      { id: 'call', amount: 0.5 * bb },
      { id: 'raise', amount: 4 * bb },
      { id: 'allin', amount: heroStack }
    ]
  };

  const hero = hand.seats[0];
  const input = GtoEval.buildInput(hand, hero, { id: 'allin', amount: heroStack });
  ok(input.mttPhase === 'short' || input.resolvedPhase === 'short',
    'buildInput fase short (got ' + input.mttPhase + '/' + input.resolvedPhase + ')');
  ok(input.preflopMode === 'stealDefense',
    'preflopMode stealDefense (got ' + input.preflopMode + ')');
  ok(input.chosenAction === 'allin' || input.chosenAction === 'raise',
    'chosen allin/raise (got ' + input.chosenAction + ')');

  const ev = GTO.evaluateSpot(input);
  const evaluation = ev && (ev.evaluation || ev);
  const strat = ev && (ev.strategy || ev.gto) || {};
  const cls = evaluation && evaluation.class;
  const allinF = (Number(strat.allin) || 0) + (Number(strat.raise) || 0);
  ok(cls !== 'error',
    '88 jam @15bb no class error (got ' + cls + ', allin+raise='
      + Math.round(allinF * 100) + '%)');
  ok(allinF >= 0.15 || cls === 'optima' || cls === 'aceptable' || cls === 'imprecisa',
    'freq agresiva material o clase no-error');
})();

/* --- 7) Cross-surface anchors: trainer path vs tournament --- */
(function crossSurfaceAnchors() {
  const PF = w.GTOPushFold;
  const RR = w.GTORangesRegistry;

  function evalDirect(opts) {
    const input = {
      spotKind: opts.spot,
      street: 'preflop',
      position: opts.position,
      vsPosition: opts.vsPosition || null,
      handCode: opts.hand,
      heroCards: opts.hand === 'AA' ? ['As', 'Ad'] : (opts.hand === 'ATo' ? ['As', 'Td'] : ['8s', '8c']),
      board: [],
      potBB: opts.spot === 'vsRFI' ? 5 : 1.5,
      toCallBB: opts.spot === 'vsRFI' ? 0.5 : 0,
      stackBB: opts.stackBB,
      stackDepth: opts.stackBB,
      effStack: opts.stackBB,
      availableActions: opts.spot === 'vsRFI'
        ? ['fold', 'call', 'raise', 'allin'] : ['fold', 'raise', 'allin'],
      chosenAction: opts.chosen,
      formatHub: 'mtt',
      gameType: 'mtt',
      mttPhase: opts.phase,
      resolvedPhase: opts.phase,
      effectivePhase: opts.phase,
      preflopMode: opts.mode,
      pushFold: opts.mode === 'push',
      scenario: opts.mode === 'stealDefense' ? '3bet' : undefined,
      scoreMode: 'gto'
    };
    if (opts.spot === 'vsRFI') input.vsRfiKey = opts.position + '_vs_' + opts.vsPosition;
    if (RR) RR.attachToInput(input, input);
    const ev = GTO.evaluateSpot(input);
    const strat = (ev && (ev.strategy || ev.gto)) || {};
    let best = 'fold'; let max = -1;
    Object.keys(strat).forEach(function (k) {
      const v = Number(strat[k]) || 0;
      if (v > max) { max = v; best = k; }
    });
    return { dominant: best, freq: max, strat: strat, class: (ev.evaluation || ev).class };
  }

  // AA BTN @12bb push: jam dominante
  const aa = evalDirect({
    spot: 'RFI', position: 'BTN', hand: 'AA', stackBB: 12, phase: 'push',
    mode: 'push', chosen: 'allin'
  });
  ok(aa.dominant === 'allin' || aa.dominant === 'raise',
    'AA BTN 12bb jam dominante (got ' + aa.dominant + ')');
  ok((Number(aa.strat.allin) || 0) + (Number(aa.strat.raise) || 0) >= 0.7,
    'AA BTN 12bb aggro≥70%');

  // ATo UTG early: fold
  const ato = evalDirect({
    spot: 'RFI', position: 'UTG', hand: 'ATo', stackBB: 80, phase: 'early',
    mode: 'standard', chosen: 'fold'
  });
  ok(ato.dominant === 'fold', 'ATo UTG early fold (got ' + ato.dominant + ')');

  // 88 BB vs UTG2 @15bb stealDefense: not error on allin
  const jam = evalDirect({
    spot: 'vsRFI', position: 'BB', vsPosition: 'UTG2', hand: '88',
    stackBB: 15, phase: 'short', mode: 'stealDefense', chosen: 'allin'
  });
  ok(jam.class !== 'error', 'trainer-path 88 jam class≠error (got ' + jam.class + ')');
  const jamAggro = (Number(jam.strat.allin) || 0) + (Number(jam.strat.raise) || 0);
  ok(jamAggro >= 0.15, 'trainer-path 88 jam aggro≥15% (got ' + Math.round(jamAggro * 100) + '%)');

  // Dual threshold 14bb: label short + push charts
  const phase14 = Tax.phaseFromStackBB(14, 'mtt');
  ok(phase14 === 'short', '14bb label short (got ' + phase14 + ')');
  ok(PF.isPushPhase({ formatHub: 'mtt', stackBB: 14, mttPhase: 'short' }),
    '14bb isPushPhase true (charts push)');
})();

console.log('\nOK mtt-short-phase-hero-stack');
