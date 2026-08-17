/*
 * guest-traps.js — 5 spots de prueba (sin registro).
 * Manos que parecen jugables al recreativo y el motor marca call/raise como error.
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
    schoolDecisionEnd: true,
    guestTrap: true,
    handsTarget: 5,
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
    return {
      id: spec.id,
      title: spec.title,
      bait: spec.bait,
      baitHint: spec.baitHint,
      type: spec.type,
      key: spec.key || null,
      heroPos: spec.heroPos,
      seed: spec.seed,
      facingBet: !!spec.facingBet,
      forceDeal: spec.forceDeal,
      playConfig: pc
    };
  }

  var TRAPS = [
    trap({
      id: 'g1-ato-vs-utg',
      title: 'As débil vs open UTG',
      bait: 'call',
      baitHint: 'ATo parece “tengo un as”. Contra UTG es fold: estás dominado.',
      type: 'vsRFI',
      key: 'BB_vs_UTG',
      heroPos: 'BB',
      seed: 11001,
      forceDeal: {
        heroCards: ['Ah', 'Td'],
        villainCards: ['Qs', 'Qd'],
        board: [],
        villainPos: 'UTG'
      },
      playConfig: { scenario: '3bet', practiceStreet: 'preflop' }
    }),
    trap({
      id: 'g2-qjo-btn-vs-utg',
      title: 'Broadway offsuit en botón',
      bait: 'call',
      baitHint: 'QJo en BTN vs UTG parece fácil. El open UTG te aplasta: fold.',
      type: 'vsRFI',
      key: 'BTN_vs_UTG',
      heroPos: 'BTN',
      seed: 11002,
      forceDeal: {
        heroCards: ['Qh', 'Jd'],
        villainCards: ['As', 'Kh'],
        board: [],
        villainPos: 'UTG'
      },
      playConfig: { scenario: '3bet', practiceStreet: 'preflop' }
    }),
    trap({
      id: 'g3-jto-utg-open',
      title: 'Open basura desde UTG',
      bait: 'raise',
      baitHint: 'JTo desde UTG parece “casi broadway”. El open UTG es el más duro: fold.',
      type: 'RFI',
      heroPos: 'UTG',
      seed: 11003,
      forceDeal: {
        heroCards: ['Js', 'Th'],
        villainCards: ['Ad', 'Ac'],
        board: [],
        villainPos: 'BB'
      },
      playConfig: { scenario: 'rfi', practiceStreet: 'preflop' }
    }),
    trap({
      id: 'g4-ace-high-float',
      title: 'Flot con as alto',
      bait: 'call',
      baitHint: 'Ah5h en K92 seco. Flotar el as alto es la trampa clásica: fold vs c-bet.',
      type: 'RFI',
      heroPos: 'BTN',
      seed: 11004,
      facingBet: true,
      forceDeal: {
        heroCards: ['Ah', '5h'],
        villainCards: ['Kd', 'Qc'],
        board: ['Ks', '9c', '2d', '7s', '3h'],
        villainPos: 'BB',
        facingBet: true
      },
      playConfig: { scenario: 'rfi', practiceStreet: 'flop' }
    }),
    trap({
      id: 'g5-overcard-float',
      title: 'Flot con dos overcards',
      bait: 'call',
      baitHint: 'QJ en A72. “Tengo overcards” no es plan. Sin draw real: fold vs c-bet.',
      type: 'RFI',
      heroPos: 'BTN',
      seed: 11005,
      facingBet: true,
      forceDeal: {
        heroCards: ['Qh', 'Jd'],
        villainCards: ['As', 'Kh'],
        board: ['Ad', '7c', '2s', '9d', '3h'],
        villainPos: 'BB',
        facingBet: true
      },
      playConfig: { scenario: 'rfi', practiceStreet: 'flop' }
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
    if (spot.facingBet) {
      force.facingBet = true;
      force.forceDeal.facingBet = true;
    }
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
