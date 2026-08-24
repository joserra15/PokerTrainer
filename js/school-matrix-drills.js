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
    if (kind === 'matrixPaint') return mountPaint(host, spot, ctx);
    return mountQuiz(host, spot, ctx);
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
    return !!(spot && (spot.kind === 'matrixQuiz' || spot.kind === 'matrixPaint'));
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
    isMatrixSpot: isMatrixSpot
  };
})(typeof window !== 'undefined' ? window : global);
