/*
 * guest-traps.js — 5 manos de prueba (sin registro).
 * Trampas preflop (manos que parecen fuertes y no se juegan ahí),
 * limp/igualar siempre error, draws que fallan y un cebo en river.
 * Si el héroe cae en la trampa preflop, la línea habitual llega al river.
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
    pc.guestTrap = true;
    return {
      id: spec.id,
      title: spec.title,
      bait: spec.bait,
      baitHint: spec.baitHint,
      riverBait: spec.riverBait || 'call',
      type: spec.type,
      key: spec.key || null,
      heroPos: spec.heroPos,
      seed: spec.seed,
      forceDeal: spec.forceDeal,
      forceScript: spec.forceScript || null,
      playConfig: pc
    };
  }

  function script(heroPos, villainPos, heroPf, villainStreets) {
    var actions = [
      { pos: heroPos, street: 'preflop', action: heroPf }
    ];
    if (heroPf === 'raise') {
      ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'].forEach(function (pos) {
        if (pos === heroPos) return;
        if (pos === villainPos) {
          actions.push({ pos: pos, street: 'preflop', action: 'call' });
        } else {
          actions.push({ pos: pos, street: 'preflop', action: 'fold' });
        }
      });
    }
    (villainStreets || []).forEach(function (row) {
      actions.push({
        pos: villainPos,
        street: row.street,
        action: row.action,
        amountBB: row.amountBB != null ? row.amountBB : null
      });
    });
    return { heroPos: heroPos, villainPos: villainPos, actions: actions };
  }

  var barrels = [
    { street: 'flop', action: 'bet', amountBB: 2.5 },
    { street: 'turn', action: 'bet', amountBB: 6 },
    { street: 'river', action: 'bet', amountBB: 12 }
  ];
  var checkCheckBet = [
    { street: 'flop', action: 'check' },
    { street: 'turn', action: 'check' },
    { street: 'river', action: 'bet', amountBB: 8 }
  ];

  var TRAPS = [
    trap({
      id: 'g1-ato-bb-vs-utg',
      title: 'As débil vs open UTG',
      bait: 'call',
      riverBait: 'call',
      baitHint: 'ATo parece “tengo un as”. Contra UTG es fold: estás dominado. En flop hay color draw; si falla, no hero-callees el river.',
      type: 'vsRFI',
      key: 'BB_vs_UTG',
      heroPos: 'BB',
      seed: 11001,
      forceDeal: {
        heroCards: ['Ah', 'Td'],
        villainCards: ['Qs', 'Qd'],
        board: ['9h', '8h', '2c', '3d', '7s'],
        villainPos: 'UTG'
      },
      forceScript: script('BB', 'UTG', 'call', barrels),
      playConfig: { scenario: '3bet' }
    }),
    trap({
      id: 'g2-qjo-btn-vs-utg',
      title: 'Broadway offsuit en botón',
      bait: 'call',
      riverBait: 'call',
      baitHint: 'QJo en BTN vs UTG parece fácil. El open UTG te aplasta: fold. El proyecto de escalera no llega; pagar el river es el segundo error.',
      type: 'vsRFI',
      key: 'BTN_vs_UTG',
      heroPos: 'BTN',
      seed: 11002,
      forceDeal: {
        heroCards: ['Qh', 'Jd'],
        villainCards: ['As', 'Kh'],
        board: ['Ts', '9c', '2d', '3h', '7s'],
        villainPos: 'UTG'
      },
      forceScript: script('BTN', 'UTG', 'call', barrels),
      playConfig: { scenario: '3bet' }
    }),
    trap({
      id: 'g3-jto-utg-open',
      title: 'Open basura desde UTG',
      bait: 'raise',
      riverBait: 'call',
      baitHint: 'JTo desde UTG parece “casi broadway”. El open UTG es el más duro: fold. Limpear también es error. El proyecto no llega: no pagues el river.',
      type: 'RFI',
      heroPos: 'UTG',
      seed: 11003,
      forceDeal: {
        heroCards: ['Js', 'Th'],
        villainCards: ['Ad', 'Ac'],
        board: ['9s', '8h', '2c', '3d', 'Kd'],
        villainPos: 'BB'
      },
      forceScript: script('UTG', 'BB', 'raise', checkCheckBet),
      playConfig: { scenario: 'rfi' }
    }),
    trap({
      id: 'g4-kjo-sb-vs-utg',
      title: 'Broadway en SB vs UTG',
      bait: 'call',
      riverBait: 'call',
      baitHint: 'KJo en SB vs UTG parece fuerte. Fuera de posición contra el open más tight: fold. El color no llega; el river es un call incorrecto.',
      type: 'vsRFI',
      key: 'SB_vs_UTG',
      heroPos: 'SB',
      seed: 11006,
      forceDeal: {
        heroCards: ['Kh', 'Jd'],
        villainCards: ['Qs', 'Qd'],
        board: ['9h', '8h', '2c', '3d', '7s'],
        villainPos: 'UTG'
      },
      forceScript: script('SB', 'UTG', 'call', barrels),
      playConfig: { scenario: '3bet' }
    }),
    trap({
      id: 'g5-ato-utg-open',
      title: 'As débil desde UTG',
      bait: 'raise',
      riverBait: 'fold',
      baitHint: 'ATo desde UTG parece un as fuerte. No se abre: fold (limp también es error). Si llegas al river con dos pares, foldear el barrel pequeño es el error.',
      type: 'RFI',
      heroPos: 'UTG',
      seed: 11007,
      forceDeal: {
        heroCards: ['Ah', 'Td'],
        villainCards: ['8s', '8c'],
        board: ['As', '7c', '2d', '3s', 'Td'],
        villainPos: 'BB'
      },
      forceScript: script('UTG', 'BB', 'raise', [
        { street: 'flop', action: 'check' },
        { street: 'turn', action: 'check' },
        { street: 'river', action: 'bet', amountBB: 2 }
      ]),
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
    if (spot.forceScript) {
      force.forceScript = {
        heroPos: spot.forceScript.heroPos,
        villainPos: spot.forceScript.villainPos,
        actions: (spot.forceScript.actions || []).map(function (a) {
          return {
            street: a.street || null,
            pos: a.pos,
            action: a.action,
            amountBB: a.amountBB != null ? a.amountBB : null
          };
        })
      };
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
