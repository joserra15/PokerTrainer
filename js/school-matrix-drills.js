/*
 * school-matrix-drills.js — Drills de matriz para Escuela Rangos (R-01 / R-02).
 * Quiz de localización / opción múltiple y pintar rangos sobre grid 13×13.
 * Contenido y UI en español.
 */
(function (global) {
  'use strict';

  var RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

  /** RFI cash6 100bb (raise ∪ mix) — alineado con data/ranges/rfi-6max-100bb.json */
  var RFI_NOTATION = {
    UTG: {
      raise: '22+, ATs+, KTs+, QTs+, JTs, T9s, 98s, 87s, 76s, AJo+, KQo',
      mix: 'A5s, A4s, A3s, 65s, KJo'
    },
    BTN: {
      raise: '22+, A2s+, K5s+, Q7s+, J7s+, T7s+, 96s+, 86s+, 75s+, 64s+, 54s, 43s, A2o+, K8o+, Q9o+, J9o+, T9o',
      mix: 'K2s-K4s, Q5s, Q6s, 53s, 42s, K7o, Q8o, J8o, T8o, 98o'
    }
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cellLabel(row, col) {
    var r1 = RANKS[row];
    var r2 = RANKS[col];
    if (row === col) return r1 + r2;
    if (row < col) return r1 + r2 + 's';
    return r2 + r1 + 'o';
  }

  function expandNotation(str) {
    var N = global.GTORangesNotation;
    if (N && typeof N.expand === 'function') return N.expand(str || '');
    if (N && typeof N.toSet === 'function') {
      var set = N.toSet(str || '');
      return set && typeof set.forEach === 'function' ? Array.from(set) : [];
    }
    return [];
  }

  function targetSetForPosition(pos) {
    var row = RFI_NOTATION[pos] || RFI_NOTATION.BTN;
    var raise = expandNotation(row.raise);
    var mix = expandNotation(row.mix);
    var out = {};
    raise.forEach(function (h) { out[h] = true; });
    mix.forEach(function (h) { out[h] = true; });
    return out;
  }

  function bandHands(band, pos) {
    var all = targetSetForPosition(pos || 'BTN');
    var keys = Object.keys(all);
    if (band === 'pairs') return keys.filter(function (h) { return h.length === 2; });
    if (band === 'ax_suited') return keys.filter(function (h) { return /^A[2-9TJQK]s$/.test(h); });
    if (band === 'broadway_o') {
      return keys.filter(function (h) {
        return /o$/.test(h) && /^[AKQJT]/.test(h) && /[AKQJT]/.test(h.charAt(1));
      });
    }
    if (band === 'sc') {
      return keys.filter(function (h) {
        return /s$/.test(h) && h.length === 3 && h.charAt(0) !== 'A' && h.charAt(0) !== 'K';
      });
    }
    return keys;
  }

  function staticGridHtml(opts) {
    opts = opts || {};
    var selected = opts.selected || {};
    var highlight = opts.highlight || null;
    var targetHint = opts.showTargets ? (opts.targets || {}) : null;
    var interactive = opts.interactive !== false;
    var html = '<div class="school-matrix-grid range-matrix-wrap range-matrix-wrap-compact"><div class="range-matrix-grid">';
    html += '<div class="rm-corner"></div>';
    RANKS.forEach(function (r) { html += '<div class="rm-label">' + r + '</div>'; });
    var row;
    var col;
    for (row = 0; row < 13; row++) {
      html += '<div class="rm-label">' + RANKS[row] + '</div>';
      for (col = 0; col < 13; col++) {
        var label = cellLabel(row, col);
        var cls = 'rm-cell school-mx-cell';
        if (selected[label]) cls += ' is-selected';
        if (highlight && highlight === label) cls += ' is-highlight';
        if (targetHint && targetHint[label]) cls += ' is-target-hint';
        if (row === col) cls += ' is-pair';
        else if (row < col) cls += ' is-suited';
        else cls += ' is-offsuit';
        if (interactive) {
          html += '<button type="button" class="' + cls + '" data-mx-cell="' + esc(label) + '" title="' +
            esc(label) + '"><span class="rm-code">' + esc(label) + '</span></button>';
        } else {
          html += '<div class="' + cls + '" title="' + esc(label) + '"><span class="rm-code">' +
            esc(label) + '</span></div>';
        }
      }
    }
    return html + '</div></div>';
  }

  function previewHtml(position) {
    var pos = position || 'BTN';
    var targets = targetSetForPosition(pos);
    return '<div class="school-matrix-preview">' +
      '<div class="school-matrix-preview-head">' +
      '<strong>Vista previa · RFI ' + esc(pos) + '</strong>' +
      '<span class="muted-text">Celdas en rango (raise + mix) del chart cash 6-max</span>' +
      '</div>' +
      staticGridHtml({ interactive: false, selected: targets }) +
      '</div>';
  }

  /**
   * @param {object} spot
   * @param {object} ctx { index, total, onResult, onAbort }
   */
  function mountDrill(host, spot, ctx) {
    if (!host || !spot) return;
    var kind = spot.kind || 'matrixQuiz';
    if (kind === 'rangeAdvQuiz') return mountRangeAdv(host, spot, ctx);
    if (kind === 'nutAdvQuiz') return mountNutAdv(host, spot, ctx);
    if (kind === 'decisionQuiz') return mountDecision(host, spot, ctx);
    if (kind === 'oddsQuiz') return mountOdds(host, spot, ctx);
    if (kind === 'blockerQuiz') return mountBlocker(host, spot, ctx);
    if (kind === 'sizingQuiz') return mountSizing(host, spot, ctx);
    if (kind === 'rfiQuiz') return mountRfi(host, spot, ctx);
    if (kind === 'equityQuiz') return mountEquity(host, spot, ctx);
    if (kind === 'textureQuiz') return mountTexture(host, spot, ctx);
    if (kind === 'comboQuiz') return mountCombo(host, spot, ctx);
    if (kind === 'nashQuiz') return mountNash(host, spot, ctx);
    if (kind === 'icmQuiz') return mountIcm(host, spot, ctx);
    if (kind === 'sprQuiz') return mountSpr(host, spot, ctx);
    if (kind === 'villainTypeQuiz') return mountVillainType(host, spot, ctx);
    if (kind === 'matrixPaint') return mountPaint(host, spot, ctx);
    return mountQuiz(host, spot, ctx);
  }

  function formatCardHtml(code) {
    var rank = String(code || '').charAt(0) || '?';
    var suit = String(code || '').charAt(1) || '';
    var sym = suit === 's' ? '♠' : suit === 'h' ? '♥' : suit === 'd' ? '♦' : suit === 'c' ? '♣' : '?';
    var red = suit === 'h' || suit === 'd';
    var label = (rank === 'T' ? '10' : rank) + sym;
    return '<span class="school-ra-card' + (red ? ' is-red' : '') + '" aria-label="' +
      esc(label) + '">' + esc(label) + '</span>';
  }

  function formatBoardHtml(board) {
    return '<div class="school-ra-board" role="img" aria-label="Flop">' +
      (board || []).map(formatCardHtml).join('') +
      '</div>';
  }

  /**
   * Quiz «¿quién tiene range advantage?» — flop concreto + posiciones.
   * spot.quiz: { prompt, line, board, options[{id,label}], correctId }
   */
  function mountRangeAdv(host, spot, ctx) {
    var quiz = spot.quiz || {};
    var prompt = quiz.prompt || '¿Quién tiene range advantage en este flop?';
    var line = quiz.line || '';
    var board = quiz.board || spot.board || [];
    var opts = quiz.options || [];
    if (ctx) ctx.host = host;
    var html =
      '<div class="school-matrix-drill school-ra-drill school-page">' +
      '<header class="school-matrix-drill-head">' +
      '<p class="school-eyebrow">Spot ' + (ctx.index + 1) + ' / ' + ctx.total +
      ' · Range Advantage</p>' +
      '<h2 class="school-title">Ventaja de rango</h2>' +
      '<p class="school-lead">' + esc(prompt) + '</p>' +
      '</header>';
    if (line) {
      html += '<p class="school-ra-line"><strong>Línea:</strong> ' + esc(line) + '</p>';
    }
    html += formatBoardHtml(board);
    html += '<div class="school-matrix-choices">' +
      opts.map(function (o) {
        return '<button type="button" class="btn school-mx-choice" data-ra-choice="' +
          esc(o.id) + '">' + esc(o.label) + '</button>';
      }).join('') +
      '</div>';
    html += '<div class="school-lesson-cta">' +
      '<button type="button" class="btn btn-ghost" id="school-mx-abort">Salir de la lección</button>' +
      '</div></div>';
    host.innerHTML = html;

    var abort = host.querySelector('#school-mx-abort');
    if (abort) abort.addEventListener('click', function () { if (ctx.onAbort) ctx.onAbort(); });

    Array.prototype.forEach.call(host.querySelectorAll('[data-ra-choice]'), function (btn) {
      btn.addEventListener('click', function () {
        gradeRangeAdv(spot, btn.getAttribute('data-ra-choice'), ctx);
      });
    });
  }

  function gradeRangeAdv(spot, choiceId, ctx) {
    var quiz = spot.quiz || {};
    var ok = choiceId === quiz.correctId;
    var label = choiceId;
    (quiz.options || []).forEach(function (o) {
      if (o.id === choiceId) label = o.label;
    });
    var teach = spot.teachBack || (ok
      ? 'Bien: identificaste quién tiene más manos fuertes en esa textura.'
      : 'Repasa quién conecta más value en este board según los rangos preflop.');
    var result = {
      spotId: spot.id,
      class: ok ? 'optima' : 'error',
      action: 'rangeAdvQuiz',
      actionLabel: label,
      teachBack: teach,
      quizCorrect: ok
    };

    var host = ctx && ctx.host;
    if (!host) {
      finishDrill(ctx, result);
      return;
    }

    Array.prototype.forEach.call(host.querySelectorAll('[data-ra-choice]'), function (btn) {
      btn.disabled = true;
      if (btn.getAttribute('data-ra-choice') === choiceId) {
        btn.classList.add(ok ? 'is-correct' : 'is-wrong');
      }
    });

    var remaining = Math.max(0, (ctx.total || 1) - (ctx.index || 0) - 1);
    var nextLabel = remaining > 0 ? 'Siguiente spot »' : 'Ver resultado »';
    var Share = global.PTSchoolShare;
    var feedback = document.createElement('div');
    feedback.className = 'school-spot-feedback school-ra-feedback ' + (ok ? 'is-good' : 'is-bad');
    feedback.innerHTML =
      '<h3>Spot ' + ((ctx.index || 0) + 1) + ' / ' + (ctx.total || 1) + ' · ' +
      (ok ? 'Óptima' : 'Error') + '</h3>' +
      '<p class="school-spot-action">Tu elección: <strong>' + esc(label) + '</strong></p>' +
      '<p class="school-spot-teach">' + esc(teach) + '</p>' +
      (Share && Share.buildRangeAdvShareHtml ? Share.buildRangeAdvShareHtml() : '') +
      '<div class="school-lesson-cta school-ra-next-cta">' +
      '<button type="button" class="btn btn-primary" id="school-ra-next">' + esc(nextLabel) + '</button>' +
      '<button type="button" class="btn btn-ghost" id="school-ra-abort">Salir de la lección</button>' +
      '</div>';

    var oldCta = host.querySelector('.school-lesson-cta');
    if (oldCta) oldCta.remove();
    host.appendChild(feedback);

    if (Share && Share.mountRangeAdvShare) {
      try {
        var shareRoot = feedback.querySelector('.school-share-range-adv');
        Share.mountRangeAdvShare(shareRoot, {
          lessonId: ctx.lessonId || '',
          lessonTitle: ctx.lessonTitle || 'Range Advantage',
          prompt: quiz.prompt || '¿Quién tiene range advantage en este flop?',
          line: quiz.line || '',
          board: (quiz.board || spot.board || []).slice(),
          options: (quiz.options || []).map(function (o) {
            return { id: o.id, label: o.label };
          })
        });
      } catch (eShareRa) { /* ignore */ }
    }

    var next = feedback.querySelector('#school-ra-next');
    var abort = feedback.querySelector('#school-ra-abort');
    if (next) {
      next.addEventListener('click', function () {
        finishDrill(ctx, result);
      });
    }
    if (abort) {
      abort.addEventListener('click', function () {
        if (ctx.onAbort) ctx.onAbort();
      });
    }
  }

  function drillEyebrow(kindLabel, ctx) {
    return 'Spot ' + (ctx.index + 1) + ' / ' + ctx.total + ' · ' + kindLabel;
  }

  function timedSecondsFor(spot, ctx) {
    var t = spot && spot.timedSeconds;
    if (t == null && ctx) t = ctx.timedSeconds;
    return Number(t) || 0;
  }

  function mountMcqDrill(host, spot, ctx, config) {
    config = config || {};
    var quiz = spot.quiz || {};
    var prompt = quiz.prompt || config.defaultPrompt || 'Elige una opción';
    var timed = timedSecondsFor(spot, ctx);
    if (ctx) ctx.host = host;
    var html =
      '<div class="school-matrix-drill school-mcq-drill school-page">' +
      '<header class="school-matrix-drill-head">' +
      '<p class="school-eyebrow">' + drillEyebrow(config.kindLabel || 'Quiz', ctx) + '</p>' +
      '<h2 class="school-title">' + esc(config.title || 'Quiz') + '</h2>' +
      '<p class="school-lead">' + esc(prompt) + '</p>' +
      (timed ? '<p class="school-matrix-timer" id="school-mcq-timer">Tiempo: <strong>' + timed + 's</strong></p>' : '') +
      '</header>' +
      (config.bodyHtml || '') +
      '<div class="school-matrix-choices school-mcq-choices">' +
      (quiz.options || []).map(function (o) {
        return '<button type="button" class="btn school-mx-choice school-mcq-choice" data-mcq-choice="' +
          esc(o.id) + '">' + esc(o.label) + '</button>';
      }).join('') +
      '</div>' +
      '<div class="school-lesson-cta">' +
      '<button type="button" class="btn btn-ghost" id="school-mx-abort">Salir de la lección</button>' +
      '</div></div>';
    host.innerHTML = html;

    var timerId = null;
    var deadline = timed ? Date.now() + timed * 1000 : 0;
    var graded = false;

    function autoFail() {
      if (graded) return;
      graded = true;
      if (timerId) clearInterval(timerId);
      gradeMcqQuiz(spot, '__timeout__', ctx, config);
    }

    if (timed) {
      timerId = setInterval(function () {
        var el = host.querySelector('#school-mcq-timer');
        var left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        if (el) el.innerHTML = 'Tiempo: <strong>' + left + 's</strong>';
        if (left <= 0) autoFail();
      }, 250);
    }

    var abort = host.querySelector('#school-mx-abort');
    if (abort) abort.addEventListener('click', function () {
      if (timerId) clearInterval(timerId);
      if (ctx.onAbort) ctx.onAbort();
    });

    Array.prototype.forEach.call(host.querySelectorAll('[data-mcq-choice]'), function (btn) {
      btn.addEventListener('click', function () {
        if (graded) return;
        graded = true;
        if (timerId) clearInterval(timerId);
        gradeMcqQuiz(spot, btn.getAttribute('data-mcq-choice'), ctx, config);
      });
    });
  }

  function buildOptionWhyHtml(quiz) {
    var opts = quiz && quiz.options || [];
    var correctId = quiz && quiz.correctId;
    var hasWhy = opts.some(function (o) { return o && o.why; });
    if (!hasWhy) return '';
    return '<ul class="school-mcq-why">' + opts.map(function (o) {
      var good = o.id === correctId;
      return '<li class="' + (good ? 'is-best' : 'is-worse') + '">' +
        '<strong>' + (good ? '✓ Mejor · ' : '✗ ') + esc(o.label || o.id) + ':</strong> ' +
        esc(o.why || '') + '</li>';
    }).join('') + '</ul>';
  }

  function gradeMcqQuiz(spot, choiceId, ctx, config) {
    config = config || {};
    var quiz = spot.quiz || {};
    var timeout = choiceId === '__timeout__';
    var ok = !timeout && choiceId === quiz.correctId;
    var label = choiceId;
    (quiz.options || []).forEach(function (o) {
      if (o.id === choiceId) label = o.label;
    });
    if (timeout) label = 'Tiempo agotado';
    var teach = timeout
      ? ('Tiempo agotado. ' + (quiz.teachBack || spot.teachBack || ''))
      : (quiz.teachBack || spot.teachBack || (ok
        ? 'Bien: acertaste la línea GTO de este spot.'
        : 'Repasa el motivo de cada opción antes de repetir.'));
    var whyHtml = buildOptionWhyHtml(quiz);
    var result = {
      spotId: spot.id,
      class: ok ? 'optima' : 'error',
      action: spot.kind || 'mcqQuiz',
      actionLabel: label,
      teachBack: teach,
      quizCorrect: ok
    };

    var host = ctx && ctx.host;
    if (!host) {
      finishDrill(ctx, result);
      return;
    }

    Array.prototype.forEach.call(host.querySelectorAll('[data-mcq-choice]'), function (btn) {
      btn.disabled = true;
      if (btn.getAttribute('data-mcq-choice') === choiceId) {
        btn.classList.add(ok ? 'is-correct' : 'is-wrong');
      }
    });

    var remaining = Math.max(0, (ctx.total || 1) - (ctx.index || 0) - 1);
    var nextLabel = remaining > 0 ? 'Siguiente spot »' : 'Ver resultado »';
    var Share = global.PTSchoolShare;
    var shareHtml = '';
    if (Share) {
      if (spot.kind === 'decisionQuiz' && Share.buildDecisionShareHtml) shareHtml = Share.buildDecisionShareHtml();
      else if (spot.kind === 'oddsQuiz' && Share.buildOddsShareHtml) shareHtml = Share.buildOddsShareHtml();
      else if (spot.kind === 'blockerQuiz' && Share.buildBlockerShareHtml) shareHtml = Share.buildBlockerShareHtml();
      else if (Share.buildGenericShareHtml) shareHtml = Share.buildGenericShareHtml(spot.kind);
    }
    var feedback = document.createElement('div');
    feedback.className = 'school-spot-feedback school-mcq-feedback ' + (ok ? 'is-good' : 'is-bad');
    feedback.innerHTML =
      '<h3>Spot ' + ((ctx.index || 0) + 1) + ' / ' + (ctx.total || 1) + ' · ' +
      (ok ? 'Óptima' : 'Error') + '</h3>' +
      '<p class="school-spot-action">Tu elección: <strong>' + esc(label) + '</strong></p>' +
      '<p class="school-spot-teach">' + esc(teach) + '</p>' +
      whyHtml +
      shareHtml +
      '<div class="school-lesson-cta school-mcq-next-cta">' +
      '<button type="button" class="btn btn-primary" id="school-mcq-next">' + esc(nextLabel) + '</button>' +
      '<button type="button" class="btn btn-ghost" id="school-mcq-abort">Salir de la lección</button>' +
      '</div>';

    var oldCta = host.querySelector('.school-lesson-cta');
    if (oldCta) oldCta.remove();
    host.appendChild(feedback);

    if (Share && config.mountShare) {
      try {
        config.mountShare(feedback.querySelector('.school-share-mcq'), spot, ctx);
      } catch (eShareMcq) { /* ignore */ }
    } else if (Share && Share.mountGenericShare) {
      try {
        Share.mountGenericShare(feedback.querySelector('.school-share-mcq'), spot, ctx);
      } catch (eShareGen) { /* ignore */ }
    }

    var next = feedback.querySelector('#school-mcq-next');
    var abort = feedback.querySelector('#school-mcq-abort');
    if (next) next.addEventListener('click', function () { finishDrill(ctx, result); });
    if (abort) abort.addEventListener('click', function () { if (ctx.onAbort) ctx.onAbort(); });
  }

  function formatLineStoryHtml(story) {
    if (!story || !story.length) return '';
    return '<ul class="school-line-story">' + story.map(function (row) {
      return '<li><span class="school-line-street">' + esc(row.street || '') + '</span> ' +
        esc(row.text || '') + '</li>';
    }).join('') + '</ul>';
  }

  function formatHeroCardsHtml(cards, heroPos) {
    var posHtml = heroPos
      ? (' · <span class="school-mcq-hero-pos">' + esc(heroPos) + '</span>')
      : '';
    return '<div class="school-mcq-hero">' +
      '<span class="school-mcq-hero-label">HÉROE' + posHtml + '</span>' +
      '<div class="school-ra-board">' + (cards || []).map(formatCardHtml).join('') + '</div></div>';
  }

  function heroPosForSpot(spot, quiz) {
    var q = quiz || (spot && spot.quiz) || {};
    return (spot && spot.heroPos) || q.position || '';
  }

  function mountDecision(host, spot, ctx) {
    var quiz = spot.quiz || {};
    var body =
      (quiz.line ? '<p class="school-ra-line"><strong>Línea:</strong> ' + esc(quiz.line) + '</p>' : '') +
      formatLineStoryHtml(quiz.lineStory) +
      formatBoardHtml(quiz.board || []) +
      formatHeroCardsHtml(quiz.heroCards, heroPosForSpot(spot, quiz));
    mountMcqDrill(host, spot, ctx, {
      kindLabel: 'Fold / Call / Raise',
      title: '¿Qué haces?',
      defaultPrompt: '¿Fold, call o raise?',
      bodyHtml: body,
      mountShare: function (root) {
        if (!root || !global.PTSchoolShare || !global.PTSchoolShare.mountDecisionShare) return;
        global.PTSchoolShare.mountDecisionShare(root, {
          lessonId: ctx.lessonId || '',
          lessonTitle: ctx.lessonTitle || '',
          prompt: quiz.prompt || '¿Qué haces?',
          line: quiz.line || '',
          lineStory: quiz.lineStory || [],
          board: (quiz.board || []).slice(),
          heroPos: spot.heroPos || '',
          heroCards: (quiz.heroCards || []).slice(),
          villainPos: quiz.villainPos || 'BB',
          options: (quiz.options || []).map(function (o) { return { id: o.id, label: o.label }; })
        });
      }
    });
  }

  /**
   * Quiz «¿qué tipo de jugador es el villano?» — señales de línea → arquetipo.
   * spot.quiz: { prompt, line, lineStory, board, options[{id,label,why?}], correctId, teachBack }
   */
  function mountVillainType(host, spot, ctx) {
    var quiz = spot.quiz || {};
    var body =
      (quiz.line ? '<p class="school-ra-line"><strong>Línea:</strong> ' + esc(quiz.line) + '</p>' : '') +
      formatLineStoryHtml(quiz.lineStory) +
      (quiz.signals ? '<ul class="school-vt-signals">' + (quiz.signals || []).map(function (s) {
        return '<li>' + esc(s) + '</li>';
      }).join('') + '</ul>' : '') +
      formatBoardHtml(quiz.board || []);
    mountMcqDrill(host, spot, ctx, {
      kindLabel: 'Tipo de rival',
      title: '¿Qué tipo de jugador es?',
      defaultPrompt: 'Según las señales, ¿qué arquetipo encaja mejor?',
      bodyHtml: body,
      mountShare: function (root) {
        if (!root || !global.PTSchoolShare || !global.PTSchoolShare.buildGenericShareHtml) return;
        /* share opcional vía HTML genérico en gradeMcqQuiz */
      }
    });
  }

  function mountOdds(host, spot, ctx) {
    var quiz = spot.quiz || {};
    var pot = quiz.potBB != null ? quiz.potBB : 0;
    var bet = quiz.betBB != null ? quiz.betBB : 0;
    var req = quiz.requiredPct != null ? quiz.requiredPct : null;
    var body =
      '<div class="school-odds-stats">' +
      '<div class="school-odds-stat"><span class="school-odds-val">' + esc(String(pot)) + ' bb</span><span class="muted-text">Pot</span></div>' +
      '<div class="school-odds-stat"><span class="school-odds-val">' + esc(String(bet)) + ' bb</span><span class="muted-text">Bet</span></div>' +
      (req != null ? '<div class="school-odds-stat"><span class="school-odds-val">' + esc(String(req)) + ' %</span><span class="muted-text">Necesitas</span></div>' : '') +
      '</div>' +
      '<p class="school-odds-draw"><strong>Draw:</strong> ' + esc(quiz.draw || '') + '</p>' +
      formatBoardHtml(quiz.board || []) +
      formatHeroCardsHtml(quiz.heroCards, heroPosForSpot(spot, quiz));
    mountMcqDrill(host, spot, ctx, {
      kindLabel: 'Pot odds',
      title: 'Precio del bote',
      defaultPrompt: '¿Tienes pot odds para call?',
      bodyHtml: body,
      mountShare: function (root) {
        if (!root || !global.PTSchoolShare || !global.PTSchoolShare.mountOddsShare) return;
        global.PTSchoolShare.mountOddsShare(root, {
          lessonId: ctx.lessonId || '',
          lessonTitle: ctx.lessonTitle || '',
          prompt: quiz.prompt || '¿Tienes pot odds para call?',
          potBB: pot,
          betBB: bet,
          draw: quiz.draw || '',
          board: (quiz.board || []).slice(),
          heroCards: (quiz.heroCards || []).slice(),
          options: (quiz.options || []).map(function (o) { return { id: o.id, label: o.label }; })
        });
      }
    });
  }

  function mountBlocker(host, spot, ctx) {
    var quiz = spot.quiz || {};
    var opts = quiz.options || [];
    var optsHtml = opts.map(function (o) {
      var cards = (o.cards || []).map(formatCardHtml).join('');
      return '<div class="school-blocker-opt">' +
        '<span class="school-blocker-label">' + esc(o.label || '') + '</span>' +
        '<div class="school-ra-board">' + cards + '</div></div>';
    }).join('');
    var body =
      '<p class="school-ra-line"><strong>Villano:</strong> ' + esc(quiz.villainAction || 'Bet') + '</p>' +
      formatBoardHtml(quiz.board || []) +
      '<div class="school-blocker-preview">' + optsHtml + '</div>';
    mountMcqDrill(host, spot, ctx, {
      kindLabel: 'Blockers',
      title: 'Elige tu bluff',
      defaultPrompt: quiz.prompt || '¿Con cuál faroleas?',
      bodyHtml: body,
      mountShare: function (root) {
        if (!root || !global.PTSchoolShare || !global.PTSchoolShare.mountBlockerShare) return;
        global.PTSchoolShare.mountBlockerShare(root, {
          lessonId: ctx.lessonId || '',
          lessonTitle: ctx.lessonTitle || '',
          prompt: quiz.prompt || '¿Con cuál faroleas?',
          board: (quiz.board || []).slice(),
          villainAction: quiz.villainAction || '',
          options: opts.map(function (o) {
            return { id: o.id, label: o.label, cards: (o.cards || []).slice() };
          })
        });
      }
    });
  }

  function mountSizing(host, spot, ctx) {
    var q = spot.quiz || {};
    var body = (q.line ? '<p class="school-ra-line"><strong>Línea:</strong> ' + esc(q.line) + '</p>' : '') +
      formatBoardHtml(q.board || []) + formatHeroCardsHtml(q.heroCards, heroPosForSpot(spot, q));
    mountMcqDrill(host, spot, ctx, { kindLabel: 'Sizing', title: 'Elige sizing', bodyHtml: body });
  }

  function mountRfi(host, spot, ctx) {
    var q = spot.quiz || {};
    var body = '<p class="school-ra-line"><strong>' + esc(q.position || spot.heroPos || '') + '</strong></p>' +
      formatHeroCardsHtml(q.heroCards, heroPosForSpot(spot, q));
    mountMcqDrill(host, spot, ctx, { kindLabel: 'RFI', title: '¿Open o fold?', bodyHtml: body });
  }

  function mountEquity(host, spot, ctx) {
    var q = spot.quiz || {};
    var body = '<p class="muted-text">' + esc(q.villainRange || '') + '</p>' +
      formatBoardHtml(q.board || []) + formatHeroCardsHtml(q.heroCards, heroPosForSpot(spot, q));
    mountMcqDrill(host, spot, ctx, { kindLabel: 'Equity', title: 'Estima equity', bodyHtml: body });
  }

  function mountTexture(host, spot, ctx) {
    var q = spot.quiz || {};
    var body = (q.line ? '<p class="school-ra-line">' + esc(q.line) + '</p>' : '') +
      formatBoardHtml(q.board || []);
    mountMcqDrill(host, spot, ctx, { kindLabel: 'Textura', title: 'Clasifica el flop', bodyHtml: body });
  }

  function mountCombo(host, spot, ctx) {
    var q = spot.quiz || {};
    var body = (q.line ? '<p class="school-ra-line">' + esc(q.line) + '</p>' : '') +
      formatBoardHtml(q.board || []) +
      '<p><strong>' + esc(q.handType || '') + '</strong></p>';
    mountMcqDrill(host, spot, ctx, { kindLabel: 'Combos', title: 'Cuenta combos', bodyHtml: body });
  }

  function mountNash(host, spot, ctx) {
    var q = spot.quiz || {};
    var body = '<p class="school-ra-line">' + esc(q.position || '') + ' · ' +
      esc(String(q.stackBB || '')) + ' bb</p>' + formatHeroCardsHtml(q.heroCards, heroPosForSpot(spot, q));
    mountMcqDrill(host, spot, ctx, { kindLabel: 'Nash', title: 'Push / fold', bodyHtml: body });
  }

  function mountIcm(host, spot, ctx) {
    var q = spot.quiz || {};
    var body = '<p class="school-ra-line">' + esc(q.payout || 'ICM spot') + ' · ' +
      esc(String(q.stackBB || '')) + ' bb</p>' + formatHeroCardsHtml(q.heroCards, heroPosForSpot(spot, q));
    mountMcqDrill(host, spot, ctx, { kindLabel: 'ICM', title: 'Burbuja / FT', bodyHtml: body });
  }

  function mountSpr(host, spot, ctx) {
    var q = spot.quiz || {};
    var body = '<p class="school-ra-line">Pot ' + esc(String(q.potBB || '')) + ' bb · Stack ' +
      esc(String(q.stackBB || '')) + ' bb</p>' +
      formatBoardHtml(q.board || []) + formatHeroCardsHtml(q.heroCards, heroPosForSpot(spot, q));
    mountMcqDrill(host, spot, ctx, { kindLabel: 'SPR', title: '¿Committed?', bodyHtml: body });
  }

  function mountNutAdv(host, spot, ctx) {
    var q = spot.quiz || {};
    var body = (q.line ? '<p class="school-ra-line">' + esc(q.line) + '</p>' : '') +
      formatBoardHtml(q.board || []);
    mountMcqDrill(host, spot, ctx, { kindLabel: 'Nut Advantage', title: 'Ventaja de nuts', bodyHtml: body });
  }

  function mountQuiz(host, spot, ctx) {
    var mode = (spot.quiz && spot.quiz.mode) || 'locate';
    var prompt = (spot.quiz && spot.quiz.prompt) || spot.teachBack || 'Localiza la celda en la matriz.';
    var selected = {};
    var html =
      '<div class="school-matrix-drill school-page">' +
      '<header class="school-matrix-drill-head">' +
      '<p class="school-eyebrow">Spot ' + (ctx.index + 1) + ' / ' + ctx.total + ' · Matriz</p>' +
      '<h2 class="school-title">Lee la matriz 13×13</h2>' +
      '<p class="school-lead">' + esc(prompt) + '</p>' +
      '</header>';

    if (mode === 'choice') {
      var opts = (spot.quiz && spot.quiz.options) || [];
      html += '<div class="school-matrix-choices">' +
        opts.map(function (o) {
          return '<button type="button" class="btn school-mx-choice" data-mx-choice="' +
            esc(o.id) + '">' + esc(o.label) + '</button>';
        }).join('') +
        '</div>';
      html += staticGridHtml({ interactive: false, selected: spot.quiz && spot.quiz.previewSelected || {} });
    } else if (mode === 'inRange') {
      var hand = spot.quiz && spot.quiz.hand;
      var hi = {};
      if (hand) hi[hand] = true;
      html += '<p class="school-matrix-hint muted-text">Celda resaltada: <strong>' + esc(hand || '') +
        '</strong>. ¿Entra en el RFI ' + esc((spot.quiz && spot.quiz.position) || 'BTN') + '?</p>';
      html += staticGridHtml({ interactive: false, highlight: hand, selected: hi });
      html += '<div class="school-matrix-choices">' +
        '<button type="button" class="btn btn-primary school-mx-choice" data-mx-choice="yes">Sí, entra</button>' +
        '<button type="button" class="btn school-mx-choice" data-mx-choice="no">No, fuera</button>' +
        '</div>';
    } else {
      html += '<p class="school-matrix-hint muted-text">Pulsa la celda correcta en la cuadrícula.</p>';
      html += staticGridHtml({ interactive: true, selected: selected });
    }

    html += '<div class="school-lesson-cta">' +
      '<button type="button" class="btn btn-ghost" id="school-mx-abort">Salir de la lección</button>' +
      '</div></div>';
    host.innerHTML = html;

    var abort = host.querySelector('#school-mx-abort');
    if (abort) abort.addEventListener('click', function () { if (ctx.onAbort) ctx.onAbort(); });

    if (mode === 'choice' || mode === 'inRange') {
      Array.prototype.forEach.call(host.querySelectorAll('[data-mx-choice]'), function (btn) {
        btn.addEventListener('click', function () {
          gradeQuizChoice(spot, btn.getAttribute('data-mx-choice'), ctx);
        });
      });
      return;
    }

    Array.prototype.forEach.call(host.querySelectorAll('[data-mx-cell]'), function (btn) {
      btn.addEventListener('click', function () {
        var label = btn.getAttribute('data-mx-cell');
        gradeQuizLocate(spot, label, ctx);
      });
    });
  }

  function gradeQuizLocate(spot, label, ctx) {
    var want = (spot.quiz && spot.quiz.targetCell) || '';
    var ok = label === want;
    finishDrill(ctx, {
      spotId: spot.id,
      class: ok ? 'optima' : 'error',
      action: 'matrixQuiz',
      actionLabel: label,
      teachBack: spot.teachBack || (ok
        ? ('Correcto: ' + want + ' está donde corresponde.')
        : ('Era ' + want + '. Recuerda: pares en diagonal, suited arriba, offsuit abajo.')),
      quizCorrect: ok
    });
  }

  function gradeQuizChoice(spot, choiceId, ctx) {
    var mode = spot.quiz && spot.quiz.mode;
    var ok = false;
    var label = choiceId;
    if (mode === 'inRange') {
      var hand = spot.quiz.hand;
      var pos = spot.quiz.position || 'BTN';
      var inSet = !!targetSetForPosition(pos)[hand];
      ok = (choiceId === 'yes' && inSet) || (choiceId === 'no' && !inSet);
      label = hand + (choiceId === 'yes' ? ' · entra' : ' · fuera');
    } else {
      var correct = spot.quiz && spot.quiz.correctId;
      ok = choiceId === correct;
      (spot.quiz.options || []).forEach(function (o) {
        if (o.id === choiceId) label = o.label;
      });
    }
    finishDrill(ctx, {
      spotId: spot.id,
      class: ok ? 'optima' : 'error',
      action: 'matrixQuiz',
      actionLabel: label,
      teachBack: spot.teachBack || (ok ? 'Bien leído.' : 'Repasa la teoría y el chart.'),
      quizCorrect: ok
    });
  }

  function mountPaint(host, spot, ctx) {
    var pos = (spot.paint && spot.paint.position) || 'BTN';
    var band = (spot.paint && spot.paint.band) || 'all';
    var prompt = (spot.paint && spot.paint.prompt) || spot.teachBack ||
      ('Marca las manos del RFI ' + pos + '.');
    var limitKeys = bandHands(band, pos);
    var limitSet = {};
    limitKeys.forEach(function (h) { limitSet[h] = true; });
    var targetAll = targetSetForPosition(pos);
    var targets = {};
    Object.keys(targetAll).forEach(function (h) {
      if (band === 'all' || limitSet[h]) targets[h] = true;
    });
    var selected = {};
    var seconds = (spot.paint && spot.paint.seconds) || 0;
    var deadline = seconds > 0 ? Date.now() + seconds * 1000 : 0;
    var timerId = null;

    function render() {
      var left = deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0;
      var html =
        '<div class="school-matrix-drill school-page">' +
        '<header class="school-matrix-drill-head">' +
        '<p class="school-eyebrow">Spot ' + (ctx.index + 1) + ' / ' + ctx.total + ' · Construir rango</p>' +
        '<h2 class="school-title">Pinta el RFI ' + esc(pos) + '</h2>' +
        '<p class="school-lead">' + esc(prompt) + '</p>' +
        (seconds
          ? '<p class="school-matrix-timer" id="school-mx-timer">Tiempo: <strong>' + left + 's</strong></p>'
          : '') +
        '</header>' +
        '<p class="school-matrix-hint muted-text">Pulsa celdas para marcar/desmarcar. Luego confirma.</p>' +
        staticGridHtml({ interactive: true, selected: selected }) +
        '<div class="school-lesson-cta">' +
        '<button type="button" class="btn btn-primary" id="school-mx-submit">Comprobar</button>' +
        '<button type="button" class="btn btn-ghost" id="school-mx-abort">Salir de la lección</button>' +
        '</div></div>';
      host.innerHTML = html;

      Array.prototype.forEach.call(host.querySelectorAll('[data-mx-cell]'), function (btn) {
        btn.addEventListener('click', function () {
          var label = btn.getAttribute('data-mx-cell');
          if (band !== 'all' && !limitSet[label] && !selected[label]) {
            /* permitir marcar solo banda + errores fuera */
          }
          if (selected[label]) delete selected[label];
          else selected[label] = true;
          btn.classList.toggle('is-selected', !!selected[label]);
        });
      });
      var submit = host.querySelector('#school-mx-submit');
      if (submit) {
        submit.addEventListener('click', function () {
          if (timerId) clearInterval(timerId);
          gradePaint(spot, selected, targets, band === 'all' ? null : limitSet, ctx);
        });
      }
      var abort = host.querySelector('#school-mx-abort');
      if (abort) {
        abort.addEventListener('click', function () {
          if (timerId) clearInterval(timerId);
          if (ctx.onAbort) ctx.onAbort();
        });
      }
    }

    render();
    if (deadline) {
      timerId = setInterval(function () {
        var el = host.querySelector('#school-mx-timer');
        var left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        if (el) el.innerHTML = 'Tiempo: <strong>' + left + 's</strong>';
        if (left <= 0) {
          clearInterval(timerId);
          gradePaint(spot, selected, targets, band === 'all' ? null : limitSet, ctx);
        }
      }, 250);
    }
  }

  function gradePaint(spot, selected, targets, scopeSet, ctx) {
    var keys = scopeSet ? Object.keys(scopeSet) : null;
    var universe = keys || Object.keys(targets).concat(Object.keys(selected));
    var uniq = {};
    universe.forEach(function (k) { uniq[k] = true; });
    if (!keys) {
      Object.keys(selected).forEach(function (k) { uniq[k] = true; });
      Object.keys(targets).forEach(function (k) { uniq[k] = true; });
    }
    var tp = 0;
    var fp = 0;
    var fn = 0;
    Object.keys(uniq).forEach(function (h) {
      if (scopeSet && !scopeSet[h] && !selected[h]) return;
      var should = !!targets[h];
      var got = !!selected[h];
      if (should && got) tp += 1;
      else if (!should && got) fp += 1;
      else if (should && !got) fn += 1;
    });
    var denom = tp + fp + fn;
    var overlap = denom ? tp / denom : 1;
    var threshold = (spot.paint && spot.paint.passOverlap) || 0.7;
    var ok = overlap >= threshold;
    var cls = overlap >= 0.9 ? 'optima' : (ok ? 'aceptable' : 'error');
    finishDrill(ctx, {
      spotId: spot.id,
      class: cls,
      action: 'matrixPaint',
      actionLabel: Math.round(overlap * 100) + '% solape',
      teachBack: spot.teachBack ||
        ('Solape ' + Math.round(overlap * 100) + '% (aciertos ' + tp + ', de más ' + fp +
          ', de menos ' + fn + '). Umbral ' + Math.round(threshold * 100) + '%.'),
      quizCorrect: ok,
      overlap: overlap
    });
  }

  function finishDrill(ctx, result) {
    if (!ctx || typeof ctx.onResult !== 'function') return;
    ctx.onResult(result);
  }

  function isMatrixSpot(spot) {
    return !!(spot && (
      spot.kind === 'matrixQuiz' ||
      spot.kind === 'matrixPaint' ||
      spot.kind === 'rangeAdvQuiz' ||
      spot.kind === 'nutAdvQuiz' ||
      spot.kind === 'decisionQuiz' ||
      spot.kind === 'oddsQuiz' ||
      spot.kind === 'blockerQuiz' ||
      spot.kind === 'sizingQuiz' ||
      spot.kind === 'rfiQuiz' ||
      spot.kind === 'equityQuiz' ||
      spot.kind === 'textureQuiz' ||
      spot.kind === 'comboQuiz' ||
      spot.kind === 'nashQuiz' ||
      spot.kind === 'icmQuiz' ||
      spot.kind === 'sprQuiz' ||
      spot.kind === 'villainTypeQuiz'
    ));
  }

  global.PTSchoolMatrixDrills = {
    RANKS: RANKS,
    RFI_NOTATION: RFI_NOTATION,
    cellLabel: cellLabel,
    targetSetForPosition: targetSetForPosition,
    bandHands: bandHands,
    staticGridHtml: staticGridHtml,
    previewHtml: previewHtml,
    mountDrill: mountDrill,
    mountRangeAdv: mountRangeAdv,
    mountDecision: mountDecision,
    mountVillainType: mountVillainType,
    mountOdds: mountOdds,
    mountBlocker: mountBlocker,
    isMatrixSpot: isMatrixSpot
  };
})(typeof window !== 'undefined' ? window : global);
