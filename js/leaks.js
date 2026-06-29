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
    return aggregate(errors, { minClass: 'imprecisa' }).slice(0, limit || 5);
  }

  function renderPanel(host, errors, onTrain) {
    if (!host) return;
    var leaks = topLeaks(errors, 5);
    if (!leaks.length) {
      host.innerHTML = '<div class="leaks-panel card-box"><h3>Mis leaks</h3><p class="muted-text">Sin fugas recurrentes registradas. Sigue entrenando para ver tus top spots.</p></div>';
      return;
    }
    var fmt = global.GTOPotMath ? function (x) { return global.GTOPotMath.formatBB(x); } : function (x) { return String(x); };
    var rows = leaks.map(function (l, i) {
      return '<div class="leak-row">' +
        '<div class="leak-rank">#' + (i + 1) + '</div>' +
        '<div class="leak-main">' +
        '<div class="leak-title">' + escapeHtml(l.label) + '</div>' +
        '<div class="leak-sub muted-text">' + l.count + ' error' + (l.count === 1 ? '' : 'es') + ' · EV perdido ' + fmt(l.evLoss) + ' bb</div>' +
        '</div>' +
        '<button type="button" class="btn btn-primary btn-sm" data-leak-train="' + escapeHtml(l.key) + '">Repetir</button>' +
        '</div>';
    }).join('');
    host.innerHTML = '<div class="leaks-panel card-box"><h3>Mis leaks</h3>' +
      '<p class="muted-text leaks-intro">Top 5 spots donde más EV pierdes. «Repetir» repasa todas las manos erróneas de ese spot.</p>' +
      '<div class="leak-list">' + rows + '</div></div>';

    host.querySelectorAll('[data-leak-train]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-leak-train');
        var leak = leaks.find(function (l) { return l.key === key; });
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
