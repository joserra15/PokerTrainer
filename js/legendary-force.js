/*
 * legendary-force.js — Convierte manos legendarias a force/playConfig del entrenador.
 */
(function (global) {
  'use strict';

  var LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  function cloneScript(script) {
    if (!script) return null;
    return {
      heroPos: script.heroPos,
      villainPos: script.villainPos,
      actions: (script.actions || []).map(function (a) {
        return {
          street: a.street,
          pos: a.pos,
          action: a.action,
          amountBB: a.amountBB != null ? a.amountBB : null
        };
      })
    };
  }

  /** Mapa posición → Jugador A/B/C según cast (estable por handId+heroId). */
  function buildAnonymizeMap(handDef, heroId) {
    var cast = handDef.cast || [];
    var map = { byPos: {}, byPlayerId: {} };
    var idx = 0;
    cast.forEach(function (m) {
      if (!m.pos) return;
      var label = 'Jugador ' + LABELS[idx];
      idx++;
      map.byPos[m.pos] = label;
      map.byPlayerId[m.playerId] = label;
    });
    map.heroId = heroId;
    map.heroLabel = map.byPlayerId[heroId] || 'Tú';
    return map;
  }

  function castMember(handDef, playerId) {
    var cast = handDef.cast || [];
    for (var i = 0; i < cast.length; i++) {
      if (cast[i].playerId === playerId) return cast[i];
    }
    return null;
  }

  function preflopActions(script) {
    return (script && script.actions || []).filter(function (a) { return a.street === 'preflop'; });
  }

  function countPreflopRaises(actions, pos) {
    return actions.filter(function (a) {
      return a.pos === pos && a.action === 'raise';
    }).length;
  }

  /** Infiere type/key del motor a partir del guion preflop (face3bet/face4bet/vsRFI/RFI). */
  function inferLegendaryScenario(role, playType) {
    var heroPos = role.heroPos;
    var villainPos = role.villainPos;
    var pre = preflopActions(role.forceScript);

    if (!pre.length) {
      return { type: playType || 'RFI', heroPos: heroPos };
    }

    var first = pre[0];
    var heroRaises = countPreflopRaises(pre, heroPos);
    var villainRaises = countPreflopRaises(pre, villainPos);

    if (first.pos === heroPos && first.action === 'raise') {
      if (villainRaises === 0) {
        return { type: 'RFI', heroPos: heroPos };
      }
      if (heroRaises >= 2 && villainRaises >= 2) {
        return { type: 'face4bet', heroPos: heroPos, key: heroPos + '_vs_' + villainPos };
      }
      if (villainRaises >= 1) {
        return { type: 'face3bet', heroPos: heroPos, key: heroPos + '_vs_' + villainPos };
      }
    }

    if (first.pos === villainPos && first.action === 'raise') {
      if (heroRaises >= 2 && villainRaises >= 1) {
        return { type: 'face4bet', heroPos: heroPos, key: heroPos + '_vs_' + villainPos };
      }
      if (heroRaises >= 1 && villainRaises === 1) {
        return { type: 'vsRFI', heroPos: heroPos, key: heroPos + '_vs_' + villainPos };
      }
      if (heroRaises === 0 && pre.some(function (a) {
        return a.pos === heroPos && a.action === 'call';
      })) {
        return { type: 'vsRFI', heroPos: heroPos, key: heroPos + '_vs_' + villainPos };
      }
    }

    if ((playType === 'face3bet' || playType === 'face4bet') && heroPos && villainPos) {
      return {
        type: playType,
        heroPos: heroPos,
        key: heroPos + '_vs_' + villainPos
      };
    }
    return { type: playType || 'RFI', heroPos: heroPos };
  }

  function toForce(handDef, heroId) {
    if (!handDef || !handDef.play || !handDef.play.roles) return null;
    var role = handDef.play.roles[heroId];
    if (!role) return null;
    var play = handDef.play;
    var scenario = inferLegendaryScenario(role, play.type);
    var force = {
      type: scenario.type,
      heroPos: scenario.heroPos || role.heroPos,
      seed: play.seed || 88000,
      forceDeal: {
        heroCards: (role.heroCards || []).slice(),
        villainCards: (role.villainCards || []).slice(),
        board: (play.board || []).slice(),
        villainPos: role.villainPos
      },
      forceScript: cloneScript(role.forceScript)
    };
    if (scenario.key) force.key = scenario.key;
    else if (play.key) force.key = play.key;
    return force;
  }

  function playConfig(handDef, heroId, opts) {
    opts = opts || {};
    var theme = (handDef.visual && handDef.visual.theme) || 'default';
    var pc = {
      formatHub: 'mtt',
      gameType: 'mtt',
      stackDepth: 'bb100',
      villainLevel: 'pro',
      handRange: 'all',
      liveAdvisor: false,
      actionMode: 'quick',
      schoolMode: false,
      handsTarget: 0,
      allowMultiway: false,
      legendaryMode: true,
      legendaryHandId: handDef.id,
      legendaryHeroId: heroId,
      legendaryBlind: opts.blind !== false,
      legendaryTheme: theme,
      legendaryEventLabel: (handDef.event && handDef.event.name) || '',
      legendaryAnonymize: buildAnonymizeMap(handDef, heroId)
    };
    if (global.PTPlayConfig && global.PTPlayConfig.normalize) {
      pc = global.PTPlayConfig.normalize(pc);
      pc.legendaryMode = true;
      pc.legendaryHandId = handDef.id;
      pc.legendaryHeroId = heroId;
      pc.legendaryBlind = opts.blind !== false;
      pc.legendaryTheme = theme;
      pc.legendaryEventLabel = (handDef.event && handDef.event.name) || '';
      pc.legendaryAnonymize = buildAnonymizeMap(handDef, heroId);
      pc.liveAdvisor = false;
      pc.handsTarget = 0;
      pc.schoolMode = false;
    }
    return pc;
  }

  function actionWord(item) {
    if (!item) return '';
    var t = item.type;
    if (t === 'check') return 'check';
    if (t === 'fold') return 'fold';
    if (t === 'call') return 'call' + (item.amount != null ? ' ' + item.amount : '');
    if (t === 'raise' || t === 'bet') return (t === 'bet' ? 'bet' : 'raise') + (item.to != null ? ' to ' + item.to : '');
    return t;
  }

  global.PTLegendaryForce = {
    toForce: toForce,
    playConfig: playConfig,
    inferLegendaryScenario: inferLegendaryScenario,
    buildAnonymizeMap: buildAnonymizeMap,
    castMember: castMember,
    actionWord: actionWord
  };
})(typeof window !== 'undefined' ? window : global);
