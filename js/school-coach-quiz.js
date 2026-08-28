/*
 * school-coach-quiz.js — Quiz heurístico desde mano importada / analizada (Fase 4).
 * Sin IA: el peor spot GTO de la mano → MCQ estilo Escuela.
 */
(function (global) {
  'use strict';

  var CLASS_RANK = { optima: 1, aceptable: 2, imprecisa: 3, error: 4 };

  var ACTION_LABELS = {
    fold: 'Fold',
    call: 'Call',
    raise: 'Raise',
    check: 'Check',
    bet: 'Bet',
    bet_33: 'Bet 33%',
    bet_66: 'Bet 66%',
    bet_100: 'Bet pot'
  };

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function boardAtStreet(hand, street) {
    var all = (hand && hand.boardAll) || (hand && hand.board) || [];
    if (street === 'preflop') return [];
    if (street === 'flop') return all.slice(0, 3);
    if (street === 'turn') return all.slice(0, 4);
    return all.slice(0, 5);
  }

  function labelForAction(id) {
    return ACTION_LABELS[id] || String(id || '').replace(/_/g, ' ');
  }

  function worstDecision(hand) {
    if (!hand || !hand.decisions || !hand.decisions.length) return null;
    var worst = null;
    hand.decisions.forEach(function (d) {
      var rank = CLASS_RANK[d.class] || 0;
      if (rank < 3) return;
      if (!worst) {
        worst = d;
        return;
      }
      var wr = CLASS_RANK[worst.class] || 0;
      if (rank > wr || (rank === wr && (Number(d.evLoss) || 0) > (Number(worst.evLoss) || 0))) {
        worst = d;
      }
    });
    return worst;
  }

  function optionsFromDecision(d) {
    var ids = (d && d.options) || ['fold', 'call', 'raise'];
    return ids.map(function (id) {
      return { id: id, label: labelForAction(id) };
    });
  }

  function buildSpotFromHand(hand) {
    var d = worstDecision(hand);
    if (!d) return null;
    var correct = d.best || d.chosen;
    return {
      id: 'coach-' + String(hand.id || 'hand') + '-' + d.street,
      kind: 'decisionQuiz',
      heroPos: hand.heroPos || hand.displayHeroPos || '',
      teachBack: (d.explanation && (d.explanation.summary || d.explanation.title)) ||
        'Repasa la línea GTO de este spot antes de repetir la mano.',
      quiz: {
        prompt: '¿Qué harías en ' + d.street + '?',
        line: d.spot || d.context || '',
        board: boardAtStreet(hand, d.street),
        heroCards: (hand.heroCards || []).slice(),
        options: optionsFromDecision(d),
        correctId: correct,
        teachBack: (d.explanation && d.explanation.body) ||
          ('La línea óptima era «' + labelForAction(correct) + '». Tu elección: «' +
            labelForAction(d.chosen) + '».')
      },
      sourceHandId: hand.id,
      sourceStreet: d.street
    };
  }

  function canBuildQuiz(hand) {
    return !!buildSpotFromHand(hand);
  }

  function renderPanelHtml(hand) {
    var spot = buildSpotFromHand(hand);
    if (!spot) return '';
    var q = spot.quiz || {};
    return (
      '<section class="school-coach-quiz card-box" data-school-coach-quiz="' + esc(hand.id) + '">' +
      '<p class="school-eyebrow">Quiz Escuela · desde tu mano</p>' +
      '<h4 class="school-coach-quiz-title">' + esc(q.prompt || 'Spot clave') + '</h4>' +
      '<p class="muted-text school-coach-quiz-lead">' + esc(q.line || '') + '</p>' +
      '<div class="school-coach-quiz-mount" data-school-coach-quiz-mount="' + esc(hand.id) + '"></div>' +
      '</section>'
    );
  }

  function mountPanel(root, hand, onDone) {
    if (!root || !hand) return false;
    var spot = buildSpotFromHand(hand);
    if (!spot) return false;
    var mount = root.querySelector('[data-school-coach-quiz-mount="' + CSS.escape(hand.id) + '"]') || root;
    var MX = global.PTSchoolMatrixDrills;
    if (!MX || !MX.mountDrill) return false;
    MX.mountDrill(mount, spot, {
      index: 0,
      total: 1,
      lessonId: '__coach__',
      lessonTitle: 'Quiz desde mano',
      onAbort: function () {
        if (typeof onDone === 'function') onDone(null);
      },
      onResult: function (result) {
        if (typeof onDone === 'function') onDone(result);
      }
    });
    return true;
  }

  global.PTSchoolCoachQuiz = {
    worstDecision: worstDecision,
    buildSpotFromHand: buildSpotFromHand,
    canBuildQuiz: canBuildQuiz,
    renderPanelHtml: renderPanelHtml,
    mountPanel: mountPanel
  };
})(typeof window !== 'undefined' ? window : globalThis);
