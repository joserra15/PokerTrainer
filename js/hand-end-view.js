/*
 * hand-end-view.js — HTML compartido de fin de mano (entrenador / torneos).
 * Renderiza resumen de resultado + bloque de decisiones GTO.
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cap(s) {
    s = String(s || '');
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  function verdictWord(cls) {
    return {
      optima: 'Óptima',
      aceptable: 'Aceptable',
      imprecisa: 'Imprecisa',
      error: 'Error',
      unscored: 'Sin nota'
    }[cls] || cls || '';
  }

  function cardHtml(code) {
    if (!code) return '';
    if (global.Cards && Cards.cardToHTML) {
      try { return Cards.cardToHTML(code); } catch (e) { /* */ }
    }
    return '<span class="card-code">' + esc(code) + '</span>';
  }

  function cardsHtml(arr) {
    return (arr || []).map(cardHtml).join(' ');
  }

  function fmtBb(n) {
    var v = Number(n) || 0;
    var t = (Math.round(v * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
    return t;
  }

  function scoreBadgeHtml(meta) {
    if (!meta || meta.score == null) return '';
    var letter = (meta.letter || 'C').charAt(0);
    var score = Math.round(Number(meta.score) * 10) / 10;
    return '<span class="hand-score-badge grade-' + esc(letter) + '">' +
      esc(String(score)) + '/10 · ' + esc(letter) + '</span>';
  }

  function gtoBarsHtml(gto) {
    if (!gto || typeof gto !== 'object') return '';
    var keys = Object.keys(gto).sort(function (a, b) {
      return (Number(gto[b]) || 0) - (Number(gto[a]) || 0);
    });
    if (!keys.length) return '';
    return '<div class="gto-bars">' + keys.map(function (k) {
      var pct = Math.round((Number(gto[k]) || 0) * 100);
      return '<div class="gto-bar-row"><span class="gto-bar-lab">' + esc(k) +
        '</span><span class="gto-bar-track"><i style="width:' + pct + '%"></i></span>' +
        '<span class="gto-bar-pct">' + pct + '%</span></div>';
    }).join('') + '</div>';
  }

  function optionGridHtml(breakdown, chosen, best) {
    if (!breakdown || !breakdown.length) return '';
    return '<div class="option-grid">' + breakdown.map(function (o) {
      var id = o.id || o.action || '';
      var pct = o.pct != null ? o.pct : Math.round((Number(o.frequency) || 0) * 1000) / 10;
      var cls = 'opt-cell';
      if (id === chosen) cls += ' is-chosen';
      if (id === best) cls += ' is-best';
      return '<div class="' + cls + '"><strong>' + esc(o.label || id) + '</strong>' +
        '<span>' + esc(String(pct)) + '%</span></div>';
    }).join('') + '</div>';
  }

  function renderDecisionsHtml(decisions) {
    if (!decisions || !decisions.length) {
      return '<div class="card-box hand-end-decisions"><p class="muted">Sin decisiones del héroe en esta mano.</p></div>';
    }
    var html = '<div class="card-box hand-end-decisions"><h3>Evaluación GTO de la mano</h3>';
    decisions.forEach(function (d) {
      var cls = d.class || 'unscored';
      var label = d.label || d.chosen || d.action || '';
      html += '<div class="dec-review">' +
        '<div class="dec-head"><strong>' + esc(cap(d.street)) + '</strong> · ' + esc(label) +
        ' <span class="verdict ' + esc(cls) + '">' + esc(verdictWord(cls)) + '</span>';
      if (d.evLoss > 0) {
        html += ' <span class="net-neg">−' + esc(fmtBb(d.evLoss)) + ' bb</span>';
      }
      html += '</div>';
      if (d.explanation) html += '<div class="dec-expl">' + esc(d.explanation) + '</div>';
      if (d.optionBreakdown && d.optionBreakdown.length) {
        html += optionGridHtml(d.optionBreakdown, d.action || d.chosen, d.best);
      } else if (d.gto) {
        html += gtoBarsHtml(d.gto);
      }
      html += '</div>';
    });
    return html + '</div>';
  }

  /**
   * @param {object} analyzed mano bridged / sesión
   * @param {object} [opts] { showDecisions, title }
   */
  function renderHandEndHtml(analyzed, opts) {
    opts = opts || {};
    if (!analyzed) return '';
    var net = Number(analyzed.heroNetBB) || 0;
    var netCls = net > 0.02 ? 'net-pos' : (net < -0.02 ? 'net-neg' : '');
    var title = opts.title || (net > 0.02 ? 'Ganas la mano' : (net < -0.02 ? 'Pierdes la mano' : 'Mano terminada'));
    var scoreMeta = analyzed.handScoreMeta || null;
    var board = analyzed.boardAll || analyzed.board || [];
    if (board && !Array.isArray(board) && board.all) board = board.all;
    var html = '<div class="hand-end-view">' +
      '<div class="hand-end-view-head">' +
      '<p class="hand-end-kicker">Resultado de la mano</p>' +
      '<h3>' + esc(title) + '</h3>' +
      scoreBadgeHtml(scoreMeta) +
      (scoreMeta && scoreMeta.verdict ? ('<p class="muted">' + esc(scoreMeta.verdict) + '</p>') : '') +
      '</div>' +
      '<div class="hand-end-view-matchup">' +
      '<div class="hand-end-seat is-hero">' +
      '<div class="hand-end-seat-label">Héroe · ' + esc(analyzed.heroPos || '') + '</div>' +
      '<div class="hand-end-cards">' + cardsHtml(analyzed.heroCards) + '</div>' +
      '</div></div>' +
      (board && board.length
        ? ('<div class="hand-end-board"><span class="muted">Board</span><div class="hand-end-cards">' +
          cardsHtml(board) + '</div></div>')
        : '') +
      '<div class="hand-end-view-stats">' +
      '<div class="stat-card"><div class="big ' + netCls + '">' + (net >= 0 ? '+' : '') +
      esc(fmtBb(net)) + '</div><div class="lbl">Resultado (bb)</div></div>' +
      '<div class="stat-card"><div class="big ' + ((analyzed.totalEvLoss > 0) ? 'net-neg' : 'net-pos') +
      '">−' + esc(fmtBb(analyzed.totalEvLoss || 0)) + '</div><div class="lbl">EV perdido</div></div>' +
      (scoreMeta && scoreMeta.score != null
        ? ('<div class="stat-card"><div class="big">' + esc(String(Math.round(scoreMeta.score * 10) / 10)) +
          '</div><div class="lbl">Nota /10</div></div>')
        : '') +
      '</div>';
    if (opts.showDecisions !== false) html += renderDecisionsHtml(analyzed.decisions || []);
    html += '</div>';
    return html;
  }

  /**
   * Bloque de stats tipo sesión (Importer.computeStats).
   */
  function renderSessionStatsHtml(stats, opts) {
    opts = opts || {};
    if (!stats) return '<p class="muted">Sin estadísticas de sesión.</p>';
    function cell(val, lab) {
      return '<div class="trn-stat-cell"><div class="trn-stat-val">' + esc(val == null ? '—' : String(val)) +
        '</div><div class="trn-stat-lbl">' + esc(lab) + '</div></div>';
    }
    var acc = stats.accuracy != null ? (stats.accuracy + '%') : null;
    var vpip = stats.vpipPct != null ? (stats.vpipPct + '%') : null;
    var pfr = stats.pfrPct != null ? (stats.pfrPct + '%') : null;
    var wtsd = stats.wtsdPct != null ? (stats.wtsdPct + '%') : null;
    var wsd = stats.wsdPct != null ? (stats.wsdPct + '%') : null;
    var avgScore = stats.avgHandScore != null ? stats.avgHandScore : null;
    var grade = stats.grade || (stats.styleAssess && stats.styleAssess.grade) || null;
    var net = stats.netBB != null ? ((stats.netBB >= 0 ? '+' : '') + fmtBb(stats.netBB) + ' bb') : null;
    var ev = stats.evLossBB != null ? (fmtBb(stats.evLossBB) + ' bb') : null;
    var html = '<div class="trn-session-stats">' +
      (opts.title ? ('<h3>' + esc(opts.title) + '</h3>') : '') +
      (grade ? ('<p class="trn-session-grade">Nota sesión: <strong>' + esc(String(grade)) + '</strong></p>') : '') +
      '<div class="trn-stats-grid">' +
      cell(stats.nHands != null ? stats.nHands : stats.hands, 'Manos') +
      cell(net, 'Net') +
      cell(acc, 'Acierto GTO') +
      cell(avgScore, 'Nota media') +
      cell(vpip, 'VPIP') +
      cell(pfr, 'PFR') +
      cell(wtsd, 'WTSD') +
      cell(wsd, 'W$SD') +
      cell(ev, 'EV loss') +
      cell(stats.bbPer100 != null ? stats.bbPer100 : null, 'bb/100') +
      '</div></div>';
    return html;
  }

  global.PTHandEndView = {
    renderHandEndHtml: renderHandEndHtml,
    renderDecisionsHtml: renderDecisionsHtml,
    renderSessionStatsHtml: renderSessionStatsHtml,
    verdictWord: verdictWord,
    scoreBadgeHtml: scoreBadgeHtml
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
