/*
 * leaks.js — Agregación de errores por spot + leak detector (SN-30–32).
 */
(function (global) {
  'use strict';

  var TYPE_LABELS = {
    RFI: 'RFI',
    vsRFI: '3-Bet',
    face4bet: '4-Bet',
    squeeze: 'Squeeze',
    face3bet: 'Vs 3-Bet',
    bbVsSbLimp: 'BB vs SB limp',
    sbLimp: 'SB limp',
    cold4bet: 'Cold 4-Bet',
    isoLimp: 'Iso-limp',
    isoL: 'Iso-limp',
    limp: 'Limp',
    postflop: 'Postflop'
  };

  var STREET_LABELS = {
    preflop: 'Preflop',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River'
  };

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function scenarioObjFromRecord(rec) {
    var sc = rec && (rec.scenarioRaw || rec.scenario);
    return sc && typeof sc === 'object' ? sc : {};
  }

  function spotKeyFromRecord(rec, street) {
    var sc = scenarioObjFromRecord(rec);
    var type = sc.type || 'unknown';
    var pos = rec.displayHeroPos || rec.heroPos || '?';
    return type + '|' + pos + '|' + (street || 'preflop');
  }

  function spotKeyFromError(err) {
    if (err.spotKey) return err.spotKey;
    var sc = err.scenarioRaw || {};
    if (typeof sc !== 'object' || !sc) sc = {};
    var type = sc.type || 'unknown';
    var pos = err.displayHeroPos || err.heroPos || '?';
    var street = err.street || 'preflop';
    return type + '|' + pos + '|' + street;
  }

  /** Coincide claves de leak; tolera agregados legacy con tipo "spot". */
  function leakKeysMatch(targetKey, candidateKey) {
    if (targetKey === candidateKey) return true;
    var tp = String(targetKey || '').split('|');
    var cp = String(candidateKey || '').split('|');
    if (tp.length < 3 || cp.length < 3) return false;
    if (tp[0] !== 'spot' && cp[0] !== 'spot' && tp[0] !== cp[0]) return false;
    return tp[1] === cp[1] && tp[2] === cp[2];
  }

  function parseLeakKey(key) {
    var parts = String(key || '').split('|');
    if (parts.length >= 4) {
      return {
        family: parts[0] || '',
        type: parts[1] || 'postflop',
        pos: parts[2] || '?',
        street: parts[3] || 'postflop'
      };
    }
    return {
      family: '',
      type: parts[0] || 'postflop',
      pos: parts[1] || '?',
      street: parts[2] || 'preflop'
    };
  }

  function isKnownStreet(street) {
    return !!(STREET_LABELS[street] || street === 'postflop');
  }

  function labelForKey(key) {
    var parsed = parseLeakKey(key);
    var type = TYPE_LABELS[parsed.type] || parsed.type;
    var pos = parsed.pos || '?';
    var street = STREET_LABELS[parsed.street] || parsed.street;
    return type + ' · ' + pos + ' · ' + street;
  }

  function aggregate(errors, opts) {
    opts = opts || {};
    var minClass = opts.minClass || 'imprecisa';
    var order = ['optima', 'aceptable', 'imprecisa', 'error'];
    var minIdx = order.indexOf(minClass);
    var map = {};

    (errors || []).forEach(function (err) {
      if (order.indexOf(err.class) < minIdx) return;
      var key = spotKeyFromError(err);
      if (!map[key]) {
        map[key] = { key: key, label: labelForKey(key), count: 0, evLoss: 0, sample: err, errors: [] };
      }
      map[key].count += 1;
      map[key].evLoss += Number(err.evLoss) || 0;
      map[key].errors.push(err);
      if (!map[key].sample || (err.evLoss || 0) > (map[key].sample.evLoss || 0)) {
        map[key].sample = err;
      }
    });

    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) {
        if (b.evLoss !== a.evLoss) return b.evLoss - a.evLoss;
        return b.count - a.count;
      });
  }

  function aggregateByStreet(errors, opts) {
    var list = aggregate(errors, opts);
    var map = {};
    list.forEach(function (l) {
      var street = (l.key.split('|')[2]) || 'preflop';
      if (!map[street]) map[street] = { street: street, label: STREET_LABELS[street] || street, count: 0, evLoss: 0 };
      map[street].count += l.count;
      map[street].evLoss += l.evLoss;
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.evLoss - a.evLoss; });
  }

  function aggregateBySpotType(errors, opts) {
    var list = aggregate(errors, opts);
    var map = {};
    list.forEach(function (l) {
      var type = l.key.split('|')[0] || 'postflop';
      if (!map[type]) map[type] = { type: type, label: TYPE_LABELS[type] || type, count: 0, evLoss: 0 };
      map[type].count += l.count;
      map[type].evLoss += l.evLoss;
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.evLoss - a.evLoss; });
  }

  function aggregateLeaksMap(leakMap) {
    var byStreet = {};
    var byType = {};
    Object.keys(leakMap || {}).forEach(function (k) {
      var l = leakMap[k];
      var parsed = parseLeakKey(k);
      var type = parsed.type || 'postflop';
      var street = parsed.street || 'postflop';
      if (!isKnownStreet(street)) return;
      if (!byStreet[street]) byStreet[street] = { street: street, label: STREET_LABELS[street] || street, count: 0, evLoss: 0 };
      if (!byType[type]) byType[type] = { type: type, label: TYPE_LABELS[type] || type, count: 0, evLoss: 0 };
      byStreet[street].count += l.count || 0;
      byStreet[street].evLoss += l.evLoss || 0;
      byType[type].count += l.count || 0;
      byType[type].evLoss += l.evLoss || 0;
    });
    return {
      byStreet: Object.keys(byStreet).map(function (s) { return byStreet[s]; }).sort(function (a, b) { return (b.count - a.count) || (b.evLoss - a.evLoss); }),
      byType: Object.keys(byType).map(function (t) { return byType[t]; }).sort(function (a, b) { return (b.count - a.count) || (b.evLoss - a.evLoss); })
    };
  }

  function errorRateFromStats(st) {
    if (!st || !st.decisions) return null;
    var good = (st.optima || 0) + (st.aceptable || 0);
    return Math.round((good / st.decisions) * 100);
  }

  function errorRateWeekly(series) {
    return (series || []).map(function (s) {
      return {
        label: s.label,
        errorRate: s.decisions ? Math.round(((s.decisions - (s.good || 0)) / s.decisions) * 100) : null,
        accuracy: s.accuracy
      };
    });
  }

  function topLeaks(errors, limit) {
    if (global.PTStatsAggregate && global.Store && global.Store.getStats) {
      var st = global.Store.getStats();
      if (st && st._aggMigrated) {
        var fromAgg = global.PTStatsAggregate.trainerTopLeaks(st, limit || 5);
        if (fromAgg.length && fromAgg[0].count <= 50000) return fromAgg;
      }
    }
    return aggregate(errors, { minClass: 'imprecisa' }).slice(0, limit || 5);
  }

  function renderBreakdownBars(title, rows, colorVar, clickKind) {
    if (!rows.length) return '';
    var max = 1;
    rows.forEach(function (r) { max = Math.max(max, r.count || 0, r.evLoss || 0); });
    var bars = rows.map(function (r) {
      var magnitude = r.count || 0;
      if (!magnitude && r.evLoss) magnitude = r.evLoss;
      var w = Math.max(8, Math.round((magnitude / max) * 100));
      var dataAttr = '';
      if (clickKind === 'street' && r.street) dataAttr = ' data-leak-filter-street="' + escapeHtml(r.street) + '"';
      if (clickKind === 'type' && r.type) dataAttr = ' data-leak-filter-type="' + escapeHtml(r.type) + '"';
      var clickable = dataAttr ? ' leak-bar-row-click leak-bar-col-click' : '';
      return '<button type="button" class="leak-bar-row' + clickable + '"' + dataAttr +
        ' title="' + escapeHtml(r.label) + ': ' + r.count + ' errores — clic para filtrar/entrenar">' +
        '<span class="leak-bar-row-lbl">' + escapeHtml(r.label) + '</span>' +
        '<span class="leak-bar-row-track"><span class="leak-bar-row-fill" style="width:' + w + '%;background:var(' + (colorVar || '--red') + ')"></span></span>' +
        '<span class="leak-bar-row-val">' + r.count + '</span></button>';
    }).join('');
    return '<div class="leak-breakdown"><h5>' + escapeHtml(title) + '</h5><div class="leak-bar-rows leak-bars">' + bars + '</div></div>';
  }

  function schoolLessonCtaVisible() {
    if (global.PTSchool && typeof global.PTSchool.schoolMenuVisible === 'function') {
      return !!global.PTSchool.schoolMenuVisible();
    }
    if (global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive()) return false;
    if (global.PTAdmin && typeof global.PTAdmin.hasAccess === 'function') {
      return !!global.PTAdmin.hasAccess();
    }
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
    return !!(u && u.isAdmin);
  }

  function lessonIdForLeak(leak) {
    if (!global.PTAIReport || typeof global.PTAIReport.lessonFromLeak !== 'function') return null;
    return global.PTAIReport.lessonFromLeak(leak);
  }

  function openSchoolLesson(lessonId) {
    if (!lessonId) return;
    global.__ptPendingSchoolLesson = lessonId;
    if (global.PTSchool && typeof global.PTSchool.openLesson === 'function') {
      global.PTSchool.openLesson(lessonId);
      return;
    }
    if (typeof global.goToTab === 'function') global.goToTab('school');
  }

  function renderLeakList(leaks, opts) {
    opts = opts || {};
    if (!leaks || !leaks.length) {
      return '<div class="stats-carousel-empty muted-text">Sin fugas destacables.</div>';
    }
    var mode = opts.mode || 'trainer';
    var showEv = !!opts.showEv;
    var showSchool = mode === 'trainer' && schoolLessonCtaVisible();
    var fmt = global.GTOPotMath ? function (x) { return global.GTOPotMath.formatBB(x); } : function (x) { return String(x); };
    return '<div class="stats-leak-list">' + leaks.map(function (l, i) {
      var actions = '';
      if (mode === 'trainer') {
        actions += '<button type="button" class="stats-leak-action" data-stats-train-leak="' +
          escapeHtml(l.key) + '">Repetir</button>';
        if (showSchool) {
          var lid = lessonIdForLeak(l);
          if (lid) {
            actions += '<button type="button" class="stats-leak-action stats-leak-action-secondary" data-stats-school-lesson="' +
              escapeHtml(lid) + '">Ver lección</button>';
          }
        }
      } else if (l.sessionId) {
        actions += '<button type="button" class="stats-leak-action" data-stats-open-session="' +
          escapeHtml(l.sessionId) + '">Ir a la sesión</button>';
      }
      var sub = l.count + ' error' + (l.count === 1 ? '' : 'es');
      if (showEv) sub += ' · EV perdido ' + fmt(l.evLoss) + ' bb';
      return '<div class="stats-leak-row">' +
        '<div class="stats-leak-rank">#' + (i + 1) + '</div>' +
        '<div class="stats-leak-main">' +
        '<div class="stats-leak-title">' + escapeHtml(l.label) + '</div>' +
        '<div class="stats-leak-sub muted-text">' + sub + '</div>' +
        '</div>' +
        (actions ? '<div class="stats-leak-actions">' + actions + '</div>' : '') +
        '</div>';
    }).join('') + '</div>';
  }

  /** Cola de peores spots ordenada por EV perdido (adaptive drill). */
  function worstSpotsQueue(errors, limitSpots, limitHands) {
    var spots = aggregate(errors, { minClass: 'imprecisa' }).slice(0, limitSpots || 8);
    var out = [];
    var seen = {};
    spots.forEach(function (spot) {
      (spot.errors || []).slice().sort(function (a, b) {
        return (Number(b.evLoss) || 0) - (Number(a.evLoss) || 0);
      }).forEach(function (err) {
        if (seen[err.id]) return;
        seen[err.id] = true;
        out.push(err);
      });
    });
    if (limitHands && out.length > limitHands) out = out.slice(0, limitHands);
    return out;
  }

  function weeklyTopLeak(errors) {
    var now = Date.now();
    var weekMs = 7 * 24 * 60 * 60 * 1000;
    var recent = (errors || []).filter(function (e) {
      if (!e.createdAt) return true;
      var t = new Date(e.createdAt).getTime();
      return !isNaN(t) && (now - t) <= weekMs;
    });
    var list = aggregate(recent.length ? recent : errors, { minClass: 'imprecisa' });
    return list[0] || null;
  }

  function renderPanel(host, errors, onTrain, opts) {
    if (!host) return;
    opts = opts || {};
    var trainerLeaks = topLeaks(errors, 5);
    var sessionLeaks = [];
    var st = global.Store && global.Store.getStats ? global.Store.getStats() : null;
    if (global.PTStatsAggregate && st) {
      sessionLeaks = global.PTStatsAggregate.sessionTopLeaks(st, 5);
    }
    if (!trainerLeaks.length && !sessionLeaks.length) {
      host.innerHTML = '<div class="leaks-panel card-box"><h3>Fugas</h3><p class="muted-text">Sin fugas recurrentes registradas. Entrena o importa sesiones para ver tus top spots.</p></div>';
      return;
    }
    var html = '<div class="leaks-panel card-box">';
    if (trainerLeaks.length) {
      html += '<h4 class="leaks-section-title">Top 5 · Entrenador</h4>' + renderLeakList(trainerLeaks, { mode: 'trainer' });
    }
    if (sessionLeaks.length) {
      html += '<h4 class="leaks-section-title">Top 5 · Fugas en sesiones importadas</h4>' + renderLeakList(sessionLeaks, { mode: 'sessions' });
    }
    html += '</div>';
    host.innerHTML = html;
    host.querySelectorAll('[data-stats-train-leak]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-stats-train-leak');
        var leak = trainerLeaks.find(function (l) { return l.key === key; });
        if (leak && onTrain) onTrain(leak);
      });
    });
    host.querySelectorAll('[data-stats-school-lesson]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openSchoolLesson(btn.getAttribute('data-stats-school-lesson'));
      });
    });
    if (typeof opts.onOpenSession === 'function') {
      host.querySelectorAll('[data-stats-open-session]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          opts.onOpenSession(btn.getAttribute('data-stats-open-session'));
        });
      });
    }
    if (typeof opts.onFilter === 'function') {
      host.querySelectorAll('[data-leak-filter-street], [data-leak-filter-type]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          opts.onFilter({
            street: btn.getAttribute('data-leak-filter-street') || '',
            spotType: btn.getAttribute('data-leak-filter-type') || ''
          });
        });
      });
    }
  }

  global.PTLeaks = {
    scenarioObjFromRecord: scenarioObjFromRecord,
    spotKeyFromRecord: spotKeyFromRecord,
    leakKeysMatch: leakKeysMatch,
    spotKeyFromError: spotKeyFromError,
    aggregate: aggregate,
    aggregateByStreet: aggregateByStreet,
    aggregateBySpotType: aggregateBySpotType,
    errorRateFromStats: errorRateFromStats,
    errorRateWeekly: errorRateWeekly,
    topLeaks: topLeaks,
    worstSpotsQueue: worstSpotsQueue,
    weeklyTopLeak: weeklyTopLeak,
    renderPanel: renderPanel,
    renderBreakdownBars: renderBreakdownBars,
    renderLeakList: renderLeakList,
    parseLeakKey: parseLeakKey,
    aggregateLeaksMap: aggregateLeaksMap,
    openSchoolLesson: openSchoolLesson,
    labelForKey: labelForKey,
    TYPE_LABELS: TYPE_LABELS,
    STREET_LABELS: STREET_LABELS
  };
})(window);
