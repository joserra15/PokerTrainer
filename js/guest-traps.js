/*
 * guest-traps.js — 5 manos de prueba (sin registro).
 * Todas empiezan preflop y están diseñadas para llegar al river:
 * el héroe liga algo con lo que puede apostar o pagar en cada calle.
 */
(function (global) {
  'use strict';

  var PLAY = {
    formatHub: 'cash',
    gameType: 'cash6',
    stackDepth: 'bb100',
    villainLevel: 'pro',
    handRange: 'all',
    liveAdvisor: false,
    actionMode: 'quick',
    schoolMode: true,
    schoolDecisionEnd: false,
    guestTrap: true,
    handsTarget: 0,
    allowMultiway: false
  };

  function trap(spec) {
    var pc = {};
    var k;
    for (k in PLAY) {
      if (Object.prototype.hasOwnProperty.call(PLAY, k)) pc[k] = PLAY[k];
    }
    for (k in (spec.playConfig || {})) {
      if (Object.prototype.hasOwnProperty.call(spec.playConfig, k)) pc[k] = spec.playConfig[k];
    }
    pc.practiceStreet = 'preflop';
    return {
      id: spec.id,
      title: spec.title,
      bait: spec.bait,
      baitHint: spec.baitHint,
      type: spec.type,
      key: spec.key || null,
      heroPos: spec.heroPos,
      seed: spec.seed,
      forceDeal: spec.forceDeal,
      playConfig: pc
    };
  }

  var TRAPS = [
    trap({
      id: 'g1-bb-77-vs-utg',
      title: 'Set en BB vs UTG',
      bait: 'fold',
      baitHint: '77 vs UTG parece “demasiado tight”. Es call: ligas set y puedes pagar o apostar hasta el river.',
      type: 'vsRFI',
      key: 'BB_vs_UTG',
      heroPos: 'BB',
      seed: 22006,
      forceDeal: {
        heroCards: ['7h', '7d'],
        villainCards: ['As', 'Kh'],
        board: ['7s', '2c', '2d', 'Td', '9h'],
        villainPos: 'UTG'
      },
      playConfig: { scenario: '3bet' }
    }),
    trap({
      id: 'g2-co-kqo-twopair',
      title: 'Dos pares en CO',
      bait: 'fold',
      baitHint: 'KQo en CO se abre. En KQ4 tienes dos pares: cobra, no te tires.',
      type: 'RFI',
      heroPos: 'CO',
      seed: 22002,
      forceDeal: {
        heroCards: ['Kh', 'Qd'],
        villainCards: ['Js', 'Ts'],
        board: ['Ks', 'Qc', '4h', '2d', '8c'],
        villainPos: 'BB'
      },
      playConfig: { scenario: 'rfi' }
    }),
    trap({
      id: 'g3-hj-99-set',
      title: 'Trío desde HJ',
      bait: 'fold',
      baitHint: '99 desde HJ se abre. En 952 ligas set: sigue la mano hasta el river.',
      type: 'RFI',
      heroPos: 'HJ',
      seed: 22003,
      forceDeal: {
        heroCards: ['9h', '9d'],
        villainCards: ['As', 'Jh'],
        board: ['9s', '5c', '2d', 'Td', '3h'],
        villainPos: 'BB'
      },
      playConfig: { scenario: 'rfi' }
    }),
    trap({
      id: 'g4-btn-a5s-flush',
      title: 'Color en botón',
      bait: 'fold',
      baitHint: 'A5s en BTN se abre. En K92 con dos corazones tienes draw y en river color: no te tires en flop.',
      type: 'RFI',
      heroPos: 'BTN',
      seed: 22004,
      forceDeal: {
        heroCards: ['Ah', '5h'],
        villainCards: ['8s', '7s'],
        board: ['Kh', '9h', '2c', '3d', '7h'],
        villainPos: 'BB'
      },
      playConfig: { scenario: 'rfi' }
    }),
    trap({
      id: 'g5-btn-qjo-top',
      title: 'Top pair en botón',
      bait: 'fold',
      baitHint: 'QJo en BTN se abre. En Q72 ligas top pair: puedes pagar o apostar las tres calles.',
      type: 'RFI',
      heroPos: 'BTN',
      seed: 22008,
      forceDeal: {
        heroCards: ['Qh', 'Jd'],
        villainCards: ['8s', '8c'],
        board: ['Qs', '7c', '2d', 'Td', '3h'],
        villainPos: 'BB'
      },
      playConfig: { scenario: 'rfi' }
    })
  ];

  function toForce(spot) {
    if (!spot) return null;
    var fd = spot.forceDeal || {};
    var force = {
      type: spot.type,
      heroPos: spot.heroPos,
      seed: spot.seed,
      forceDeal: {
        heroCards: (fd.heroCards || []).slice(),
        villainCards: fd.villainCards ? fd.villainCards.slice() : null,
        board: (fd.board || []).slice(),
        villainPos: fd.villainPos || 'BB'
      }
    };
    if (spot.key) force.key = spot.key;
    return force;
  }

  global.PTGuestTraps = {
    HAND_LIMIT: TRAPS.length,
    list: function () { return TRAPS.slice(); },
    get: function (i) { return TRAPS[i] || null; },
    toForce: toForce,
    playConfig: function (spot) {
      return spot && spot.playConfig ? spot.playConfig : PLAY;
    }
  };
})(typeof window !== 'undefined' ? window : global);
