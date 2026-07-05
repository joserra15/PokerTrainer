/*
 * leaks.js — Agregación de errores por spot (P-03).
 */
(function (global) {
  'use strict';

  var TYPE_LABELS = {
    RFI: 'RFI',
    vsRFI: '3-Bet',
    face4bet: '4-Bet',
    squeeze: 'Squeeze',
    isoLimp: 'Iso limp',
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

  function topLeaks(errors, limit) {
    if (global.PTStatsAggregate && global.Store && global.Store.getStats) {
      var st = global.Store.getStats();
      if (st && st._aggMigrated) {
        return global.PTStatsAggregate.trainerTopLeaks(st, limit || 5);
      }
    }
    return aggregate(errors, { minClass: 'imprecisa' }).slice(0, limit || 5);
  }

  function renderPanel(host, errors, onTrain, opts) {
    if (!host) return;
    opts = opts || {};
    var trainerLeaks = topLeaks(errors, 5);
    var sessionLeaks = [];
    if (global.PTStatsAggregate && global.Store && global.Store.getStats) {
      sessionLeaks = global.PTStatsAggregate.sessionTopLeaks(global.Store.getStats(), 5);
    }
    if (!trainerLeaks.length && !sessionLeaks.length) {
      host.innerHTML = '<div class="leaks-panel card-box"><h3>Mis leaks</h3><p class="muted-text">Sin fugas recurrentes registradas. Entrena o importa sesiones para ver tus top spots. Los agregados se guardan aunque borres el histórico.</p></div>';
      return;
    }
    var fmt = global.GTOPotMath ? function (x) { return global.GTOPotMath.formatBB(x); } : function (x) { return String(x); };

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

    var html = '<div class="leaks-panel card-box"><h3>Mis leaks</h3>' +
      '<p class="muted-text leaks-intro">Top 5 spots con más EV perdido. Agregados persistentes (no se pierden al borrar histórico).</p>';

    if (trainerLeaks.length) {
      html += '<h4 class="leaks-section-title">Entrenador</h4><div class="leak-list">' + leakRows(trainerLeaks, 'trainer') + '</div>';
    }
    if (sessionLeaks.length) {
      html += '<h4 class="leaks-section-title">Sesiones importadas</h4><div class="leak-list">' + leakRows(sessionLeaks, null) + '</div>';
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
    topLeaks: topLeaks,
    renderPanel: renderPanel,
    labelForKey: labelForKey
  };
})(window);
