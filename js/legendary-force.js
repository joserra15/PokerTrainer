/*
 * legendary-force.js — Convierte manos legendarias a force/playConfig del entrenador.
 */
(function (global) {
  'use strict';

  var LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  var POS_ORDER_6 = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  var POS_ORDER_HU = ['BTN', 'BB'];
  var MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

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

  function posOrderForHand(handDef) {
    var variant = handDef.visual && handDef.visual.tableVariant;
    if (variant === 'heads-up') return POS_ORDER_HU.slice();
    return POS_ORDER_6.slice();
  }

  function firstMeaningfulPreflop(script, order) {
    var pre = preflopActions(script);
    var byPos = {};
    pre.forEach(function (a) {
      if (!byPos[a.pos]) byPos[a.pos] = a;
    });
    for (var i = 0; i < order.length; i++) {
      var pos = order[i];
      var act = byPos[pos];
      if (!act) continue;
      if (act.action === 'fold') continue;
      return { pos: pos, action: act };
    }
    for (var j = 0; j < pre.length; j++) {
      if (pre[j].action !== 'fold') return { pos: pre[j].pos, action: pre[j] };
    }
    return null;
  }

  /** Solo RFI o vsRFI — nunca face3bet/face4bet (el usuario juega desde UTG). */
  function inferLegendaryStartScenario(role, handDef) {
    var heroPos = role.heroPos;
    var villainPos = role.villainPos;
    var order = posOrderForHand(handDef);
    var first = firstMeaningfulPreflop(role.forceScript, order);

    if (!first) {
      return { type: 'RFI', heroPos: heroPos };
    }

    if (first.pos === heroPos) {
      return { type: 'RFI', heroPos: heroPos };
    }

    if (first.pos === villainPos && first.action.action === 'raise') {
      return { type: 'vsRFI', heroPos: heroPos, key: heroPos + '_vs_' + villainPos };
    }

    if (first.action.action === 'raise') {
      return { type: 'vsRFI', heroPos: heroPos, key: heroPos + '_vs_' + first.pos };
    }

    return { type: 'RFI', heroPos: heroPos };
  }

  function inferLegendaryScenario(role, playType, handDef) {
    return inferLegendaryStartScenario(role, handDef || { visual: {} });
  }

  function roleStackBB(handDef, heroId) {
    var play = handDef.play || {};
    var role = play.roles && play.roles[heroId];
    if (role && role.stackBB != null) return Number(role.stackBB);
    var stacks = play.stacks || {};
    if (role && role.heroPos && stacks[role.heroPos] != null) {
      return Number(stacks[role.heroPos]);
    }
    return play.defaultStackBB != null ? Number(play.defaultStackBB) : 100;
  }

  function buildLegendaryStacks(handDef, heroId) {
    var play = handDef.play || {};
    var base = play.stacks ? Object.assign({}, play.stacks) : null;
    if (!base) return null;
    var role = play.roles && play.roles[heroId];
    if (role && role.heroPos && role.stackBB != null) {
      base[role.heroPos] = Number(role.stackBB);
    }
    return base;
  }

  function epicDate(dateStr, year) {
    if (dateStr) {
      try {
        var d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          return d.getDate() + ' de ' + MONTHS_ES[d.getMonth()] + ' de ' + d.getFullYear();
        }
      } catch (e) { /* fall through */ }
    }
    return year ? String(year) : '';
  }

  function buildBriefing(handDef, heroId) {
    var ev = handDef.event || {};
    var role = handDef.play && handDef.play.roles && handDef.play.roles[heroId];
    var heroPos = role && role.heroPos;
    var stack = Math.round(roleStackBB(handDef, heroId));
    var venue = ev.venue || '';
    var when = epicDate(handDef.date, handDef.year);
    var eventName = ev.name || 'Torneo';
    var stage = ev.stage || '';
    var series = ev.series || '';
    var blinds = handDef.play && handDef.play.blindsLabel;
    var tableDesc = (handDef.visual && handDef.visual.tableVariant === 'heads-up')
      ? 'Mesa heads-up. Todo el torneo se decide en este duelo.'
      : (stage && /final|heads-up/i.test(stage))
        ? 'Mesa final. Cada decisión puede valer un título.'
        : 'Mesa de feature table. Cámaras, público y presión real.';
    var parts = [];
    if (venue) parts.push(venue + '.');
    if (when) parts.push(when + '.');
    parts.push(eventName + (stage ? ' — ' + stage : '') + '.');
    if (blinds) parts.push('Ciegas ' + blinds + '.');
    parts.push(tableDesc);
    if (heroPos) {
      parts.push('Te sientas en ' + heroPos + ' con ~' + stack + 'bb efectivos.');
    } else {
      parts.push('Tienes ~' + stack + 'bb efectivos.');
    }
    parts.push('Te reparten cartas boca abajo. La sala contiene la respiración.');
    parts.push('¿Qué harías?');
    return {
      title: handDef.titleBlind || eventName,
      kicker: series ? (series + ' · Mano legendaria') : 'Mano legendaria',
      body: parts.join(' '),
      stackBB: stack,
      heroPos: heroPos || '',
      eventLabel: [eventName, stage, handDef.year].filter(Boolean).join(' · ')
    };
  }

  function toForce(handDef, heroId) {
    if (!handDef || !handDef.play || !handDef.play.roles) return null;
    var role = handDef.play.roles[heroId];
    if (!role) return null;
    var scenario = inferLegendaryStartScenario(role, handDef);
    var force = {
      type: scenario.type,
      heroPos: scenario.heroPos || role.heroPos,
      seed: handDef.play.seed || 88000,
      forceDeal: {
        heroCards: (role.heroCards || []).slice(),
        villainCards: (role.villainCards || []).slice(),
        board: (handDef.play.board || []).slice(),
        villainPos: role.villainPos
      },
      forceScript: cloneScript(role.forceScript)
    };
    if (scenario.key) force.key = scenario.key;
    else if (handDef.play.key) force.key = handDef.play.key;
    return force;
  }

  function playConfig(handDef, heroId, opts) {
    opts = opts || {};
    var theme = (handDef.visual && handDef.visual.theme) || 'default';
    var heroStack = roleStackBB(handDef, heroId);
    var legStacks = buildLegendaryStacks(handDef, heroId);
    var briefing = buildBriefing(handDef, heroId);
    var pc = {
      formatHub: 'mtt',
      gameType: 'mtt',
      stackDepth: 'bb' + Math.round(heroStack),
      villainLevel: 'pro',
      handRange: 'all',
      liveAdvisor: false,
      actionMode: 'complete',
      schoolMode: false,
      handsTarget: 0,
      allowMultiway: false,
      legendaryMode: true,
      legendaryHandId: handDef.id,
      legendaryHeroId: heroId,
      legendaryBlind: opts.blind !== false,
      legendaryTheme: theme,
      legendaryEventLabel: (handDef.event && handDef.event.name) || '',
      legendaryAnonymize: buildAnonymizeMap(handDef, heroId),
      legendaryStacks: legStacks,
      legendaryBriefing: briefing,
      legendaryTableMax: (handDef.play && handDef.play.tableMax) || 6
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
      pc.legendaryStacks = legStacks;
      pc.legendaryBriefing = briefing;
      pc.legendaryTableMax = (handDef.play && handDef.play.tableMax) || 6;
      pc.stackDepth = 'bb' + Math.round(heroStack);
      pc.stackBB = heroStack;
      pc.liveAdvisor = false;
      pc.handsTarget = 0;
      pc.schoolMode = false;
      pc.actionMode = 'complete';
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
    inferLegendaryStartScenario: inferLegendaryStartScenario,
    buildAnonymizeMap: buildAnonymizeMap,
    buildBriefing: buildBriefing,
    buildLegendaryStacks: buildLegendaryStacks,
    castMember: castMember,
    actionWord: actionWord
  };
})(typeof window !== 'undefined' ? window : global);
