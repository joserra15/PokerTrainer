/*
 * progress.js — Dashboard de progreso en el tiempo (P-02).
 */
(function (global) {
  'use strict';

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function weekKey(date) {
    var d = new Date(date);
    var day = d.getDay();
    var diff = d.getDate() - day + (day === 0 ? -6 : 1);
    var monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().slice(0, 10);
  }

  function fmtWeekLabel(iso) {
    var d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  function buildWeeklySeries(history, weeks) {
    weeks = weeks || 8;
    var buckets = {};
    var now = new Date();
    for (var i = weeks - 1; i >= 0; i--) {
      var d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      var k = weekKey(d);
      buckets[k] = { key: k, hands: 0, decisions: 0, good: 0, evLoss: 0 };
    }
    (history || []).forEach(function (h) {
      if (!h.createdAt) return;
      var k = weekKey(h.createdAt);
      if (!buckets[k]) return;
      buckets[k].hands += 1;
      (h.decisions || []).forEach(function (d) {
        buckets[k].decisions += 1;
        if (d.class === 'optima' || d.class === 'aceptable') buckets[k].good += 1;
        buckets[k].evLoss += Number(d.evLoss) || 0;
      });
    });
    return Object.keys(buckets).sort().map(function (k) {
      var b = buckets[k];
      b.accuracy = b.decisions ? Math.round((b.good / b.decisions) * 100) : null;
      b.evLoss = Math.round(b.evLoss * 100) / 100;
      b.label = fmtWeekLabel(k);
      return b;
    });
  }

  function maxOf(series, field) {
    var m = 0;
    series.forEach(function (s) { m = Math.max(m, Number(s[field]) || 0); });
    return m || 1;
  }

  function barChart(title, series, field, suffix, colorVar) {
    if (!series.length) return '';
    var max = maxOf(series, field);
    var bars = series.map(function (s) {
      var val = s[field];
      var display = val == null ? '—' : (suffix === '%' ? val + '%' : val + suffix);
      var h = val == null ? 4 : Math.max(8, Math.round(((Number(val) || 0) / max) * 100));
      return '<div class="prog-bar-col" title="' + escapeHtml(s.label) + ': ' + display + '">' +
        '<div class="prog-bar" style="height:' + h + '%;background:var(' + colorVar + ')"></div>' +
        '<span class="prog-bar-lbl">' + escapeHtml(s.label) + '</span></div>';
    }).join('');
    return '<div class="prog-chart"><h4>' + escapeHtml(title) + '</h4><div class="prog-bars">' + bars + '</div></div>';
  }

  function renderDashboard(host, opts) {
    if (!host) return;
    opts = opts || {};
    var Store = global.Store;
    if (!Store || !Store.getHistory) {
      host.innerHTML = '';
      return;
    }
    var history = Store.getHistory();
    var Ent = global.PTEntitlements;
    if (Ent && Ent.historyCutoffDate) {
      var cutoff = Ent.historyCutoffDate(Ent.get && Ent.get());
      if (cutoff) history = history.filter(function (h) { return h.createdAt && h.createdAt >= cutoff; });
    }
    var series = buildWeeklySeries(history, opts.weeks || 8);
    var sessions = Store.getSessions ? Store.getSessions().length : 0;
    var hasData = series.some(function (s) { return s.hands > 0; });

    if (!hasData && !sessions) {
      host.innerHTML = '<div class="progress-panel card-box"><h3>Progreso</h3><p class="muted-text">Juega manos en el entrenador para ver gráficas de acierto y EV en el tiempo.</p></div>';
      return;
    }

    host.innerHTML = '<div class="progress-panel card-box"><h3>Progreso</h3>' +
      '<p class="muted-text progress-intro">Últimas ' + series.length + ' semanas · ' + sessions + ' sesión' + (sessions === 1 ? '' : 'es') + ' importada' + (sessions === 1 ? '' : 's') + '</p>' +
      '<div class="progress-charts">' +
      barChart('Acierto semanal', series, 'accuracy', '%', '--green') +
      barChart('EV perdido (bb)', series, 'evLoss', ' bb', '--red') +
      barChart('Manos entrenadas', series, 'hands', '', '--gold') +
      '</div></div>';
  }

  global.PTProgress = {
    buildWeeklySeries: buildWeeklySeries,
    renderDashboard: renderDashboard
  };
})(window);
