/*
 * legendary-result.js — Comparación con la línea histórica, quiz y mensajes post-mano.
 */
(function (global) {
  'use strict';

  function normAction(a) {
    if (!a) return '';
    var s = String(a);
    if (s.indexOf('bet_') === 0 || s === 'bet') return 'bet';
    if (s === 'open' || s === 'allin' || s === '3bet' || s === '4bet') return 'raise';
    return s;
  }

  function actionFamily(a) {
    var n = normAction(a);
    if (n === 'check' || n === 'call') return 'passive';
    if (n === 'fold') return 'fold';
    if (n === 'bet' || n === 'raise') return 'aggressive';
    return n;
  }

  function heroScriptActions(script) {
    if (!script || !script.heroPos) return [];
    return (script.actions || []).filter(function (a) { return a.pos === script.heroPos; });
  }

  function playerOutcomeBucket(engineHand) {
    var decisions = engineHand.decisions || [];
    var last = decisions[decisions.length - 1];
    if (last && last.action === 'fold') return 'lost';
    var r = engineHand.result || {};
    if (r.heroNet != null && r.heroNet > 0.05) return 'won';
    if (r.heroNet != null && r.heroNet < -0.05) return 'lost';
    if (r.showdown) return (r.heroNet != null && r.heroNet >= 0) ? 'won' : 'lost';
    if (r.heroNet != null && r.heroNet >= 0) return 'won';
    return null;
  }

  function evaluateShowdownBucket(handDef, heroId) {
    var Cards = global.Cards;
    var ForceMod = global.PTLegendaryForce;
    if (!Cards || !Cards.evaluate || !Cards.compare) return null;
    var member = ForceMod && ForceMod.castMember(handDef, heroId);
    if (!member || !member.cards || !member.cards.length) return null;
    var board = (handDef.play && handDef.play.board) || [];
    var heroEval = Cards.evaluate(member.cards.concat(board));
    var tl = handDef.timeline || [];
    var name = member.displayName;
    var heroShowed = tl.some(function (i) { return i.kind === 'show' && i.player === name; });
    if (!heroShowed) return 'lost';

    var lost = false;
    (handDef.cast || []).forEach(function (m) {
      if (m.playerId === heroId || !m.cards) return;
      var showed = tl.some(function (i) { return i.kind === 'show' && i.player === m.displayName; });
      if (!showed) return;
      var vEval = Cards.evaluate(m.cards.concat(board));
      if (Cards.compare(vEval, heroEval) > 0) lost = true;
    });
    return lost ? 'lost' : 'won';
  }

  function historicalOutcomeBucket(handDef, heroId) {
    var ForceMod = global.PTLegendaryForce;
    var member = ForceMod && ForceMod.castMember(handDef, heroId);
    if (!member) return null;
    var name = member.displayName;
    var tl = handDef.timeline || [];
    var heroActs = tl.filter(function (i) { return i.kind === 'action' && i.player === name; });
    var lastHero = heroActs[heroActs.length - 1];
    if (!lastHero) return null;
    if (lastHero.type === 'fold') return 'lost';

    var lastIdx = tl.indexOf(lastHero);
    for (var j = lastIdx + 1; j < tl.length; j++) {
      var it = tl[j];
      if (it.kind === 'action' && it.type === 'fold' && it.player !== name) return 'won';
    }

    var shows = tl.filter(function (i) { return i.kind === 'show'; });
    if (!shows.length) return 'won';
    return evaluateShowdownBucket(handDef, heroId);
  }

  function comparePlay(engineHand, handDef, heroId) {
    var role = handDef.play && handDef.play.roles && handDef.play.roles[heroId];
    var script = (engineHand && engineHand.forceScript) || (role && role.forceScript);
    var scriptActs = heroScriptActions(script);
    var decisions = (engineHand && engineHand.decisions) || [];

    var playedSameLine = decisions.length > 0 &&
      decisions.length === scriptActs.length &&
      decisions.every(function (d, i) {
        return d.street === scriptActs[i].street &&
          actionFamily(d.action) === actionFamily(scriptActs[i].action);
      });

    var histBucket = historicalOutcomeBucket(handDef, heroId);
    var playerBucket = playerOutcomeBucket(engineHand);
    var sameOutcome = !playedSameLine && !!histBucket && !!playerBucket &&
      histBucket === playerBucket;

    var matchLevel = playedSameLine ? 'same_line' : (sameOutcome ? 'same_outcome' : 'different');

    return {
      playedSameLine: playedSameLine,
      sameOutcome: sameOutcome,
      canShare: playedSameLine || sameOutcome,
      matchLevel: matchLevel,
      historicalOutcome: histBucket,
      playerOutcome: playerBucket
    };
  }

  function buildResultMessage(analysis, handDef, heroId) {
    var ForceMod = global.PTLegendaryForce;
    var star = ForceMod && ForceMod.castMember(handDef, heroId);
    var starName = star ? star.displayName : 'la estrella';
    if (analysis.playedSameLine) {
      return {
        title: '¡Igual que ' + starName + '!',
        body: 'Has replicado la misma línea que ' + starName + ' en esta mano histórica.'
      };
    }
    if (analysis.sameOutcome) {
      return {
        title: 'Mismo resultado',
        body: 'Has conseguido el mismo resultado de otra manera que ' + starName + '.'
      };
    }
    return {
      title: 'Línea distinta',
      body: 'Tu camino ha sido diferente al de ' + starName + ' en la historia real.'
    };
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function buildQuizOptions(handDef, heroId, allHands) {
    var ForceMod = global.PTLegendaryForce;
    var distractors = [];
    (handDef.heroCandidates || []).forEach(function (id) {
      if (id !== heroId && distractors.indexOf(id) < 0) distractors.push(id);
    });
    (handDef.cast || []).forEach(function (m) {
      if (m.playerId !== heroId && distractors.indexOf(m.playerId) < 0) {
        distractors.push(m.playerId);
      }
    });
    var guard = 0;
    while (distractors.length < 2 && allHands && guard++ < 40) {
      var other = allHands[Math.floor(Math.random() * allHands.length)];
      (other.heroCandidates || []).forEach(function (id) {
        if (id !== heroId && distractors.indexOf(id) < 0) distractors.push(id);
      });
    }
    distractors = distractors.slice(0, 2);

    var options = [{ playerId: heroId, correct: true }];
    distractors.forEach(function (id) {
      options.push({ playerId: id, correct: false });
    });

    return shuffle(options.map(function (opt) {
      var m = ForceMod && ForceMod.castMember(handDef, opt.playerId);
      if (!m && allHands) {
        for (var i = 0; i < allHands.length && !m; i++) {
          m = ForceMod && ForceMod.castMember(allHands[i], opt.playerId);
        }
      }
      return {
        playerId: opt.playerId,
        correct: opt.correct,
        label: m ? (m.displayName + ' · ' + m.countryLabel) : opt.playerId
      };
    }));
  }

  global.PTLegendaryResult = {
    normAction: normAction,
    actionFamily: actionFamily,
    comparePlay: comparePlay,
    buildResultMessage: buildResultMessage,
    buildQuizOptions: buildQuizOptions,
    playerOutcomeBucket: playerOutcomeBucket,
    historicalOutcomeBucket: historicalOutcomeBucket
  };
})(typeof window !== 'undefined' ? window : global);
