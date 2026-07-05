/*
 * progress.js — Dashboard de progreso en el tiempo (P-02).
 * Usa agregados persistentes en stats (no depende del histórico).
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
    if (global.PTStatsAggregate && global.PTStatsAggregate.weekKey) {
      return global.PTStatsAggregate.weekKey(date);
    }
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

  /** Compat: reconstruye desde histórico si no hay agregados (fallback). */
  function buildWeeklySeries(history, weeks) {
    weeks = weeks || 8;
    var Agg = global.PTStatsAggregate;
    if (Agg && global.Store && global.Store.getStats) {
      var st = global.Store.getStats();
      if (st && st.aggregates && st._aggMigrated) {
        return Agg.trainerWeeklySeries(st, weeks);
      }
    }
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

  function buildSessionWeeklySeries(weeks) {
    weeks = weeks || 8;
    var Agg = global.PTStatsAggregate;
    if (!Agg || !global.Store || !global.Store.getStats) return [];
    return Agg.sessionWeeklySeries(global.Store.getStats(), weeks);
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
        '<span class="prog-bar-val">' + escapeHtml(display) + '</span>' +
        '<div class="prog-bar" style="height:' + h + '%;background:var(' + colorVar + ')"></div>' +
        '<span class="prog-bar-lbl">' + escapeHtml(s.label) + '</span></div>';
    }).join('');
    return '<div class="prog-chart"><h4>' + escapeHtml(title) + '</h4><div class="prog-bars">' + bars + '</div></div>';
  }

  function renderDashboard(host, opts) {
    if (!host) return;
    opts = opts || {};
    var weeks = opts.weeks || 8;
    var Store = global.Store;
    if (!Store || !Store.getStats) {
      host.innerHTML = '';
      return;
    }
    var trainerSeries = buildWeeklySeries(Store.getHistory ? Store.getHistory() : [], weeks);
    var sessionSeries = buildSessionWeeklySeries(weeks);
    var hasTrainer = trainerSeries.some(function (s) { return s.hands > 0; });
    var hasSessions = sessionSeries.some(function (s) { return (s.hands > 0) || (s.sessions > 0); });
    var sessTotal = global.PTStatsAggregate ? global.PTStatsAggregate.sessionsTotal(Store.getStats()) : null;

    if (!hasTrainer && !hasSessions) {
      host.innerHTML = '<div class="progress-panel card-box"><h3>Progreso semanal</h3><p class="muted-text">Juega manos o importa sesiones para ver gráficas de acierto y EV en el tiempo. Los datos se guardan en estadísticas aunque borres el histórico.</p></div>';
      return;
    }

    var intro = 'Últimas ' + weeks + ' semanas · datos persistentes en estadísticas';
    if (sessTotal && sessTotal.sessions) {
      intro += ' · ' + sessTotal.sessions + ' sesión' + (sessTotal.sessions === 1 ? '' : 'es') + ' importada' + (sessTotal.sessions === 1 ? '' : 's') + ' acumulada' + (sessTotal.sessions === 1 ? '' : 's');
    }

    var html = '<div class="progress-panel card-box"><h3>Progreso semanal</h3>' +
      '<p class="muted-text progress-intro">' + escapeHtml(intro) + '</p>';

    if (hasTrainer) {
      html += '<div class="progress-block"><h4 class="progress-block-title">Entrenador</h4><div class="progress-charts">' +
        barChart('Acierto', trainerSeries, 'accuracy', '%', '--green') +
        barChart('EV perdido (bb)', trainerSeries, 'evLoss', ' bb', '--red') +
        barChart('Manos', trainerSeries, 'hands', '', '--gold') +
        '</div></div>';
    }

    if (hasSessions) {
      html += '<div class="progress-block"><h4 class="progress-block-title">Sesiones importadas</h4><div class="progress-charts">' +
        barChart('Acierto', sessionSeries, 'accuracy', '%', '--green') +
        barChart('EV perdido (bb)', sessionSeries, 'evLoss', ' bb', '--red') +
        barChart('Manos', sessionSeries, 'hands', '', '--gold') +
        barChart('Sesiones', sessionSeries, 'sessions', '', '--gold') +
        '</div></div>';
    }

    html += '</div>';
    host.innerHTML = html;
  }

  global.PTProgress = {
    buildWeeklySeries: buildWeeklySeries,
    buildSessionWeeklySeries: buildSessionWeeklySeries,
    renderDashboard: renderDashboard
  };
})(window);
