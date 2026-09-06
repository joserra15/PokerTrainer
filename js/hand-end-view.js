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
    return (arr || []).map(cardHtml).join('');
  }

  function fmtBb(n) {
    var v = Number(n) || 0;
    var t = (Math.round(v * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
    return t;
  }

  function cardCode(c) {
    if (!c) return '';
    if (typeof c === 'string') return c;
    return c.code || (c.r != null && c.s ? String(c.r) + c.s : '');
  }

  /** Badge como en Entrenar: «Nota 10/10» (sin letra confusa tipo «10/10 · A»). */
  function scoreBadgeHtml(meta) {
    if (!meta || meta.score == null) return '';
    var letter = (meta.letter || 'C').charAt(0);
    var score = Math.round(Number(meta.score) * 10) / 10;
    var scoreTxt = (Math.round(score * 10) / 10).toFixed(1).replace(/\.0$/, '');
    return '<span class="badge grade-' + esc(letter) + ' hand-score-badge" title="Nota de la mano (0–10)">' +
      'Nota ' + esc(scoreTxt) + '/10</span>';
  }

  function optimalBannerHtml(meta) {
    if (!meta) return '';
    if (meta.allOptimal) {
      return '<div class="hand-score-optimal ok">Todas las decisiones han sido óptimas</div>';
    }
    if (meta.verdict) {
      return '<div class="hand-score-optimal no">' + esc(meta.verdict) + '</div>';
    }
    return '<div class="hand-score-optimal no">No todas las decisiones han sido óptimas</div>';
  }

  function gtoBarsHtml(gto) {
    if (!gto || typeof gto !== 'object') return '';
    var keys = Object.keys(gto).sort(function (a, b) {
      return (Number(gto[b]) || 0) - (Number(gto[a]) || 0);
    });
    if (!keys.length) return '';
    return '<div class="gto-bars">' + keys.map(function (k) {
      var pct = Math.round((Number(gto[k]) || 0) * 100);
      return '<div class="gto-bar"><span class="lbl">' + esc(k) +
        '</span><span class="track"><i class="fill" style="width:' + pct + '%"></i></span>' +
        '<span class="pct">' + pct + '%</span></div>';
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
      if (d.context && typeof d.context === 'string') {
        html += '<div class="dec-context muted">' + esc(d.context) + '</div>';
      }
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
   * Asientos rivales con cartas visibles (showdown) o mensaje si no enseñaron.
   * Usa analyzed.shows / seats / handNames / positions.
   */
  function villainSeatsHtml(analyzed) {
    if (!analyzed) return '';
    var shows = analyzed.shows || {};
    var positions = analyzed.positions || {};
    var handNames = analyzed.handNames || {};
    var heroName = analyzed.hero || '';
    var seats = analyzed.seats || [];
    var rows = [];

    Object.keys(shows).forEach(function (name) {
      if (name === heroName) return;
      var cards = shows[name];
      if (!cards || !cards.length) return;
      rows.push({
        name: name,
        pos: positions[name] || '',
        cards: cards,
        handName: handNames[name] || null,
        showed: true
      });
    });

    if (!rows.length && seats.length) {
      seats.forEach(function (s) {
        var name = s.name || s.id;
        if (!name || name === heroName) return;
        if (s.folded) return;
        var cards = (s.cards || []).map(cardCode).filter(Boolean);
        if (cards.length >= 2) {
          rows.push({
            name: name,
            pos: s.pos || positions[name] || '',
            cards: cards,
            handName: handNames[name] || null,
            showed: true
          });
        }
      });
    }

    if (!rows.length) {
      return '<div class="hand-end-vs" aria-hidden="true">vs</div>' +
        '<div class="hand-end-seat">' +
        '<div class="hand-end-seat-label">Villanos</div>' +
        '<div class="hand-end-cards"><span class="muted-text">no llegaron a enseñar</span></div>' +
        '</div>';
    }

    if (rows.length === 1) {
      var one = rows[0];
      return '<div class="hand-end-vs" aria-hidden="true">vs</div>' +
        '<div class="hand-end-seat">' +
        '<div class="hand-end-seat-label">' + esc(one.name) +
        (one.pos ? (' · ' + esc(one.pos)) : '') + '</div>' +
        '<div class="hand-end-cards">' + cardsHtml(one.cards) + '</div>' +
        (one.handName ? ('<div class="hand-end-handname">' + esc(one.handName) + '</div>') : '') +
        '</div>';
    }

    return rows.map(function (r) {
      return '<div class="hand-end-seat">' +
        '<div class="hand-end-seat-label">' + esc(r.name) +
        (r.pos ? (' · ' + esc(r.pos)) : '') + '</div>' +
        '<div class="hand-end-cards">' + cardsHtml(r.cards) + '</div>' +
        (r.handName ? ('<div class="hand-end-handname">' + esc(r.handName) + '</div>') : '') +
        '</div>';
    }).join('');
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
    var heroHandName = analyzed.heroHandName ||
      (analyzed.handNames && analyzed.hero && analyzed.handNames[analyzed.hero]) || null;
    var multiVillains = Object.keys(analyzed.shows || {}).filter(function (n) {
      return n !== analyzed.hero;
    }).length > 1;
    var villainsBlock = villainSeatsHtml(analyzed);

    var html = '<div class="hand-end-view hand-end-popup">' +
      '<div class="hand-end-view-head hand-end-popup-head">' +
      '<p class="hand-end-kicker">Resultado de la mano</p>' +
      '<h3>' + esc(title) + '</h3>' +
      scoreBadgeHtml(scoreMeta) +
      optimalBannerHtml(scoreMeta) +
      '</div>' +
      '<div class="hand-end-view-matchup hand-end-matchup' +
      (multiVillains ? ' hand-end-matchup-multi' : '') + '">' +
      '<div class="hand-end-seat is-hero">' +
      '<div class="hand-end-seat-label">Héroe · ' + esc(analyzed.heroPos || '') + '</div>' +
      '<div class="hand-end-cards">' + cardsHtml(analyzed.heroCards) + '</div>' +
      (heroHandName ? ('<div class="hand-end-handname">' + esc(heroHandName) + '</div>') : '') +
      '</div>' +
      villainsBlock +
      '</div>' +
      (board && board.length
        ? ('<div class="hand-end-board"><span class="muted-text muted">Board</span><div class="hand-end-cards">' +
          cardsHtml(board) + '</div></div>')
        : '') +
      '<div class="hand-end-view-stats hand-end-popup-stats stats-content">' +
      '<div class="stat-card"><div class="big ' + netCls + '">' + (net >= 0 ? '+' : '') +
      esc(fmtBb(net)) + '</div><div class="lbl">Resultado (bb)</div></div>' +
      '<div class="stat-card"><div class="big ' + ((analyzed.totalEvLoss > 0) ? 'net-neg' : 'net-pos') +
      '">−' + esc(fmtBb(analyzed.totalEvLoss || 0)) + '</div><div class="lbl">EV perdido</div></div>' +
      (scoreMeta && scoreMeta.score != null
        ? ('<div class="stat-card hand-score-stat"><div class="big">' +
          esc(String(Math.round(scoreMeta.score * 10) / 10)) +
          '<span class="hand-score-over">/10</span></div><div class="lbl">Nota de la mano</div></div>')
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
    var gradeRaw = stats.grade || (stats.styleAssess && stats.styleAssess.grade) || null;
    var gradeLabel = null;
    if (gradeRaw != null) {
      if (typeof gradeRaw === 'object') {
        var letter = gradeRaw.letter != null ? String(gradeRaw.letter) : '';
        var score = gradeRaw.score != null ? String(gradeRaw.score) : '';
        if (letter && score) gradeLabel = letter + ' · ' + score + '/10';
        else if (letter) gradeLabel = letter;
        else if (score) gradeLabel = score + '/10';
        else if (gradeRaw.verdict) gradeLabel = String(gradeRaw.verdict);
      } else {
        gradeLabel = String(gradeRaw);
      }
    }
    var net = stats.netBB != null ? ((stats.netBB >= 0 ? '+' : '') + fmtBb(stats.netBB) + ' bb') : null;
    var ev = stats.evLossBB != null ? (fmtBb(stats.evLossBB) + ' bb') : null;
    var html = '<div class="trn-session-stats">' +
      (opts.title ? ('<h3>' + esc(opts.title) + '</h3>') : '') +
      (gradeLabel ? ('<p class="trn-session-grade">Nota sesión: <strong>' + esc(gradeLabel) + '</strong></p>') : '') +
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
    scoreBadgeHtml: scoreBadgeHtml,
    optimalBannerHtml: optimalBannerHtml
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
