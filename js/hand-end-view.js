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
    /* Misma marca que paso a paso (opt-grid / opt-pill). */
    var bestId = best;
    if (!bestId) {
      var top = breakdown.slice().sort(function (a, b) {
        return (Number(b.frequency != null ? b.frequency : b.pct) || 0) -
          (Number(a.frequency != null ? a.frequency : a.pct) || 0);
      })[0];
      bestId = top && (top.id || top.action);
    }
    return '<div class="opt-grid option-grid">' + breakdown.map(function (o) {
      var id = o.id || o.action || '';
      var pct = o.pct != null ? o.pct : Math.round((Number(o.frequency) || 0) * 1000) / 10;
      var isBest = id === bestId;
      var isChosen = id === chosen;
      /* Si óptima y elegida coinciden: solo verde (best). */
      var cls = 'opt-pill opt-cell' + (isBest ? ' best is-best' : '') +
        (!isBest && isChosen ? ' chosen is-chosen' : '');
      var label = o.label || id;
      return '<div class="' + cls + '">' +
        '<span class="opt-lbl"><strong>' + esc(label) + '</strong></span>' +
        '<span class="opt-pct">' + esc(String(pct)) + '%</span></div>';
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
      var breakdown = d.optionBreakdown;
      if ((!breakdown || !breakdown.length) && d.gto) {
        breakdown = Object.keys(d.gto).map(function (id) {
          var freq = Number(d.gto[id]) || 0;
          return { id: id, label: String(id).toUpperCase(), pct: Math.round(freq * 1000) / 10, frequency: freq };
        }).filter(function (o) { return o.frequency >= 0.005; })
          .sort(function (a, b) { return b.frequency - a.frequency; });
      }
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
      if (breakdown && breakdown.length) {
        html += optionGridHtml(breakdown, d.action || d.chosen, d.best);
      } else if (d.gto) {
        html += gtoBarsHtml(d.gto);
      }
      html += '</div>';
    });
    return html + '</div>';
  }

  function seatDeltaHtml(deltaBB) {
    if (deltaBB == null || !isFinite(Number(deltaBB))) return '';
    var d = Number(deltaBB) || 0;
    var dCls = d > 0.02 ? 'net-pos' : (d < -0.02 ? 'net-neg' : '');
    return '<div class="hand-end-delta trn-hand-end-delta ' + dCls + '">' +
      (d >= 0 ? '+' : '') + esc(fmtBb(d)) + ' bb</div>';
  }

  function seatOutcomeMetaHtml(outcome) {
    if (!outcome) return '';
    var bits = '';
    bits += seatDeltaHtml(outcome.deltaBB);
    if (outcome.eliminated) {
      bits += '<div class="hand-end-eliminated">Eliminado</div>';
    }
    return bits;
  }

  /**
   * Asientos rivales con cartas visibles (showdown) o mensaje si no enseñaron.
   * Usa analyzed.shows / seats / handNames / positions / seatOutcomes.
   * El héroe se renderiza aparte (isHero / heroSeatName); no ocultar a un bot
   * que por colisión de nick coincida con el alias del héroe.
   */
  function villainSeatsHtml(analyzed) {
    if (!analyzed) return '';
    var shows = analyzed.shows || {};
    var positions = analyzed.positions || {};
    var handNames = analyzed.handNames || {};
    var heroName = analyzed.hero || '';
    var seats = analyzed.seats || [];
    var outcomes = analyzed.seatOutcomes || [];
    var outcomeByName = {};
    var nonHeroNames = {};
    outcomes.forEach(function (o) {
      if (!o || !o.name) return;
      if (o.isHero) return;
      nonHeroNames[String(o.name)] = true;
      outcomeByName[o.name] = o;
    });
    outcomes.forEach(function (o) {
      if (o && o.isHero && o.name && !outcomeByName[o.name]) {
        outcomeByName[o.name] = o;
      }
    });
    var rows = [];

    function isHeroDuplicateName(name) {
      if (!name) return false;
      if (nonHeroNames[String(name)]) return false;
      if (name === heroName) return true;
      if (analyzed.heroSeatName && name === analyzed.heroSeatName) return true;
      if (name === 'Héroe' || name === 'Hero') return true;
      for (var i = 0; i < seats.length; i++) {
        if (seats[i] && seats[i].isHero && seats[i].name === name) return true;
      }
      for (var j = 0; j < outcomes.length; j++) {
        if (outcomes[j] && outcomes[j].isHero && outcomes[j].name === name) return true;
      }
      return false;
    }

    function pushRow(name, pos, cards, handName, showed) {
      if (isHeroDuplicateName(name)) return;
      var oc = outcomeByName[name] || null;
      if (oc && oc.isHero && !nonHeroNames[String(name)]) return;
      rows.push({
        name: name,
        pos: pos || '',
        cards: cards || [],
        handName: handName || null,
        showed: !!showed,
        isWinner: !!(oc && oc.isWinner),
        deltaBB: oc ? oc.deltaBB : null,
        eliminated: !!(oc && oc.eliminated)
      });
    }

    Object.keys(shows).forEach(function (name) {
      if (isHeroDuplicateName(name)) return;
      var cards = shows[name];
      if (!cards || !cards.length) return;
      pushRow(name, positions[name] || '', cards, handNames[name] || null, true);
    });

    if (!rows.length && seats.length) {
      seats.forEach(function (s) {
        var name = s.name || s.id;
        if (!name || s.isHero || isHeroDuplicateName(name)) return;
        if (s.folded) return;
        var cards = (s.cards || []).map(cardCode).filter(Boolean);
        if (cards.length >= 2) {
          pushRow(name, s.pos || positions[name] || '', cards, handNames[name] || null, true);
        }
      });
    }

    /* Sin showdown: aún mostrar ganador(es) y eliminados con delta de bote. */
    if (!rows.length && outcomes.length) {
      outcomes.forEach(function (o) {
        if (!o || o.isHero || isHeroDuplicateName(o.name)) return;
        if (!o.isWinner && !o.eliminated && !(o.deltaBB > 0.02)) return;
        pushRow(o.name, o.pos || positions[o.name] || '', o.cards || [], o.handName || null, !!(o.cards && o.cards.length >= 2));
      });
    }

    if (!rows.length) {
      var winnerOnly = (analyzed.winners || []).filter(function (n) {
        return n && !isHeroDuplicateName(n);
      });
      if (winnerOnly.length) {
        winnerOnly.forEach(function (n) {
          var oc = outcomeByName[n];
          if (oc && oc.isHero && !nonHeroNames[String(n)]) return;
          pushRow(n, (oc && oc.pos) || positions[n] || '', (oc && oc.cards) || [], null, false);
        });
      }
    }

    if (!rows.length) {
      return '<div class="hand-end-vs" aria-hidden="true">vs</div>' +
        '<div class="hand-end-seat">' +
        '<div class="hand-end-seat-label">Villanos</div>' +
        '<div class="hand-end-cards"><span class="muted-text">no llegaron a enseñar</span></div>' +
        '</div>';
    }

    function seatBlock(r) {
      var cls = 'hand-end-seat' + (r.isWinner ? ' is-winner' : '') +
        (r.eliminated ? ' is-eliminated' : '');
      var cardsBlock = (r.cards && r.cards.length)
        ? cardsHtml(r.cards)
        : '<span class="muted-text">' + (r.isWinner ? 'gana sin showdown' : '—') + '</span>';
      return '<div class="' + cls + '">' +
        '<div class="hand-end-seat-label">' + esc(r.name) +
        (r.pos ? (' · ' + esc(r.pos)) : '') +
        (r.isWinner ? ' · Gana' : '') + '</div>' +
        '<div class="hand-end-cards">' + cardsBlock + '</div>' +
        (r.handName ? ('<div class="hand-end-handname">' + esc(r.handName) + '</div>') : '') +
        seatOutcomeMetaHtml(r) +
        '</div>';
    }

    if (rows.length === 1) {
      return '<div class="hand-end-vs" aria-hidden="true">vs</div>' + seatBlock(rows[0]);
    }

    return rows.map(seatBlock).join('');
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
    var title = opts.title;
    if (!title) {
      var winners = analyzed.winners || [];
      var heroWon = winners.indexOf(analyzed.hero) >= 0 || net > 0.02;
      if (!heroWon && winners.length === 1) {
        title = winners[0] + ' gana el bote';
      } else if (!heroWon && winners.length > 1) {
        title = 'Empate · ' + winners.join(', ');
      } else {
        title = net > 0.02 ? 'Ganas la mano' : (net < -0.02 ? 'Pierdes la mano' : 'Mano terminada');
      }
    }
    var scoreMeta = analyzed.handScoreMeta || null;
    var board = analyzed.boardAll || analyzed.board || [];
    if (board && !Array.isArray(board) && board.all) board = board.all;
    var heroHandName = analyzed.heroHandName ||
      (analyzed.handNames && analyzed.hero && analyzed.handNames[analyzed.hero]) || null;
    var heroOutcome = (analyzed.seatOutcomes || []).filter(function (o) {
      return o && (o.isHero || o.name === analyzed.hero);
    })[0] || { deltaBB: net, eliminated: false, isWinner: net > 0.02 };
    var multiVillains = Object.keys(analyzed.shows || {}).filter(function (n) {
      return n && n !== analyzed.hero && n !== analyzed.heroSeatName &&
        n !== 'Héroe' && n !== 'Hero';
    }).length > 1 || ((analyzed.seatOutcomes || []).filter(function (o) {
      return o && !o.isHero && (o.isWinner || o.eliminated || (o.cards && o.cards.length));
    }).length > 1);
    var villainsBlock = villainSeatsHtml(analyzed);
    var heroLabel = analyzed.hero || 'Héroe';

    var html = '<div class="hand-end-view hand-end-popup">' +
      '<div class="hand-end-view-head hand-end-popup-head">' +
      '<p class="hand-end-kicker">Resultado de la mano</p>' +
      '<h3>' + esc(title) + '</h3>' +
      scoreBadgeHtml(scoreMeta) +
      optimalBannerHtml(scoreMeta) +
      '</div>' +
      '<div class="hand-end-view-matchup hand-end-matchup' +
      (multiVillains ? ' hand-end-matchup-multi' : '') + '">' +
      '<div class="hand-end-seat is-hero' +
      (heroOutcome.isWinner ? ' is-winner' : '') +
      (heroOutcome.eliminated ? ' is-eliminated' : '') + '">' +
      '<div class="hand-end-seat-label">' + esc(heroLabel) + ' · ' + esc(analyzed.heroPos || '') +
      (heroOutcome.isWinner ? ' · Gana' : '') + '</div>' +
      '<div class="hand-end-cards">' + cardsHtml(analyzed.heroCards) + '</div>' +
      (heroHandName ? ('<div class="hand-end-handname">' + esc(heroHandName) + '</div>') : '') +
      seatOutcomeMetaHtml(heroOutcome) +
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
