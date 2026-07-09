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

  function spotKeyFromError(err) {
    if (err.spotKey) return err.spotKey;
    var sc = err.scenarioRaw || {};
    var type = sc.type || 'unknown';
    var pos = err.displayHeroPos || err.heroPos || '?';
    var street = err.street || 'preflop';
    return type + '|' + pos + '|' + street;
  }

  function labelForKey(key) {
    var parts = String(key).split('|');
    var type = TYPE_LABELS[parts[0]] || parts[0];
    var pos = parts[1] || '?';
    var street = STREET_LABELS[parts[2]] || parts[2];
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
      var parts = k.split('|');
      var type = parts[0] || 'postflop';
      var street = parts[2] || 'postflop';
      if (!byStreet[street]) byStreet[street] = { street: street, label: STREET_LABELS[street] || street, count: 0, evLoss: 0 };
      if (!byType[type]) byType[type] = { type: type, label: TYPE_LABELS[type] || type, count: 0, evLoss: 0 };
      byStreet[street].count += l.count || 0;
      byStreet[street].evLoss += l.evLoss || 0;
      byType[type].count += l.count || 0;
      byType[type].evLoss += l.evLoss || 0;
    });
    return {
      byStreet: Object.keys(byStreet).map(function (s) { return byStreet[s]; }).sort(function (a, b) { return b.evLoss - a.evLoss; }),
      byType: Object.keys(byType).map(function (t) { return byType[t]; }).sort(function (a, b) { return b.evLoss - a.evLoss; })
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

  function renderBreakdownBars(title, rows, colorVar) {
    if (!rows.length) return '';
    var max = 1;
    rows.forEach(function (r) { max = Math.max(max, r.evLoss || 0, r.count || 0); });
    var bars = rows.map(function (r) {
      var h = Math.max(10, Math.round(((r.evLoss || r.count || 0) / max) * 100));
      return '<div class="leak-bar-col" title="' + escapeHtml(r.label) + ': ' + r.count + ' errores, EV ' + (r.evLoss || 0).toFixed(1) + ' bb">' +
        '<span class="leak-bar-val">' + escapeHtml(r.label) + '</span>' +
        '<div class="leak-bar" style="height:' + h + '%;background:var(' + (colorVar || '--red') + ')"></div>' +
        '<span class="leak-bar-meta muted-text">' + r.count + ' · ' + (r.evLoss || 0).toFixed(1) + ' bb</span></div>';
    }).join('');
    return '<div class="leak-breakdown"><h5>' + escapeHtml(title) + '</h5><div class="leak-bars">' + bars + '</div></div>';
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
    var trainerBreak = aggregateByStreet(errors, { minClass: 'imprecisa' });
    var trainerTypeBreak = aggregateBySpotType(errors, { minClass: 'imprecisa' });
    var sessAgg = st && st.aggregates ? aggregateLeaksMap(st.aggregates.sessionLeaks) : { byStreet: [], byType: [] };
    var fmt = global.GTOPotMath ? function (x) { return global.GTOPotMath.formatBB(x); } : function (x) { return String(x); };

    if (!trainerLeaks.length && !sessionLeaks.length && !trainerBreak.length) {
      host.innerHTML = '<div class="leaks-panel card-box"><h3>Leak detector</h3><p class="muted-text">Sin fugas recurrentes registradas. Entrena o importa sesiones para ver tus top spots. Los agregados se guardan aunque borres el histórico.</p></div>';
      return;
    }

    function leakRows(leaks, trainPrefix) {
      return leaks.map(function (l, i) {
        var trainBtn = trainPrefix && onTrain
          ? '<button type="button" class="btn btn-primary btn-sm" data-leak-train="' + escapeHtml(trainPrefix + ':' + l.key) + '">Repetir</button>'
          : '';
        return '<div class="leak-row">' +
          '<div class="leak-rank">#' + (i + 1) + '</div>' +
          '<div class="leak-main">' +
          '<div class="leak-title">' + escapeHtml(l.label) + '</div>' +
          '<div class="leak-sub muted-text">' + l.count + ' error' + (l.count === 1 ? '' : 'es') + ' · EV perdido ' + fmt(l.evLoss) + ' bb</div>' +
          '</div>' + trainBtn + '</div>';
      }).join('');
    }

    var html = '<div class="leaks-panel card-box"><h3>Leak detector</h3>';
    html += '<p class="muted-text leaks-intro">Top spots con más EV perdido.</p>';

    if (trainerBreak.length) {
      html += renderBreakdownBars('Entrenador · fugas por calle', trainerBreak, '--orange');
    }
    if (trainerTypeBreak.length) {
      html += renderBreakdownBars('Entrenador · fugas por tipo de spot', trainerTypeBreak, '--red');
    }
    if (sessAgg.byStreet.length) {
      html += renderBreakdownBars('Sesiones · fugas por calle', sessAgg.byStreet, '--accent');
    }
    if (sessAgg.byType.length) {
      html += renderBreakdownBars('Sesiones · fugas por tipo', sessAgg.byType, '--gold');
    }

    if (trainerLeaks.length) {
      html += '<h4 class="leaks-section-title">Top 5 · Entrenador</h4><div class="leak-list">' + leakRows(trainerLeaks, 'trainer') + '</div>';
    }
    if (sessionLeaks.length) {
      html += '<h4 class="leaks-section-title">Top 5 · Sesiones importadas</h4><div class="leak-list">' + leakRows(sessionLeaks, null) + '</div>';
    }
    html += '</div>';
    host.innerHTML = html;

    host.querySelectorAll('[data-leak-train]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var raw = btn.getAttribute('data-leak-train') || '';
        var parts = raw.split(':');
        if (parts[0] !== 'trainer') return;
        var key = parts.slice(1).join(':');
        var leak = trainerLeaks.find(function (l) { return l.key === key; });
        if (leak && onTrain) onTrain(leak);
      });
    });
  }

  global.PTLeaks = {
    spotKeyFromError: spotKeyFromError,
    aggregate: aggregate,
    aggregateByStreet: aggregateByStreet,
    aggregateBySpotType: aggregateBySpotType,
    errorRateFromStats: errorRateFromStats,
    errorRateWeekly: errorRateWeekly,
    topLeaks: topLeaks,
    renderPanel: renderPanel,
    labelForKey: labelForKey
  };
})(window);
