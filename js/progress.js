/*
 * progress.js — Dashboard de progreso en el tiempo (P-02 + SN-30).
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
    return enrichSeries(buckets);
  }

  function enrichSeries(buckets) {
    return Object.keys(buckets).sort().map(function (k) {
      var b = buckets[k];
      b.accuracy = b.decisions ? Math.round((b.good / b.decisions) * 100) : null;
      b.errorRate = b.decisions ? Math.round(((b.decisions - b.good) / b.decisions) * 100) : null;
      b.evLoss = Math.round(b.evLoss * 100) / 100;
      b.netBB = Math.round((b.netBB || 0) * 100) / 100;
      b.label = fmtWeekLabel(k);
      return b;
    });
  }

  function buildSessionWeeklySeries(weeks) {
    weeks = weeks || 8;
    var Agg = global.PTStatsAggregate;
    if (!Agg || !global.Store || !global.Store.getStats) return [];
    var series = Agg.sessionWeeklySeries(global.Store.getStats(), weeks);
    return series.map(function (s) {
      s.errorRate = s.decisions ? Math.round(((s.decisions - (s.good || 0)) / s.decisions) * 100) : null;
      return s;
    });
  }

  function maxOf(series, field, useAbs) {
    var m = 0;
    series.forEach(function (s) {
      var v = Number(s[field]) || 0;
      m = Math.max(m, useAbs ? Math.abs(v) : v);
    });
    return m || 1;
  }

  function formatVal(field, val, suffix) {
    if (val == null) return '—';
    if (suffix === '%') return val + '%';
    if (suffix === ' bb') {
      if (field === 'evLoss') return '-' + Math.abs(Number(val) || 0) + suffix;
      if (field === 'netBB') return (Number(val) >= 0 ? '+' : '') + val + suffix;
      return val + suffix;
    }
    return String(val);
  }

  function barChart(title, series, field, suffix, colorVar) {
    if (!series.length) return '';
    var max = maxOf(series, field, true);
    var bars = series.map(function (s) {
      var val = s[field];
      var display = formatVal(field, val, suffix);
      var h = val == null ? 4 : Math.max(8, Math.round((Math.abs(Number(val) || 0) / max) * 100));
      var barColor = colorVar;
      if (field === 'netBB' && val != null) {
        barColor = Number(val) >= 0 ? '--green' : '--red';
      }
      if (field === 'errorRate' && val != null) {
        barColor = Number(val) <= 15 ? '--green' : (Number(val) <= 30 ? '--orange' : '--red');
      }
      var empty = val == null || (suffix !== '%' && Number(val) === 0 && field !== 'netBB');
      return '<div class="prog-bar-col' + (empty ? ' prog-bar-empty' : '') + '" title="' + escapeHtml(s.label) + ': ' + display + '">' +
        '<span class="prog-bar-val">' + escapeHtml(display) + '</span>' +
        '<div class="prog-bar-track"><div class="prog-bar" style="height:' + h + '%;background:var(' + barColor + ')"></div></div>' +
        '<span class="prog-bar-lbl">' + escapeHtml(s.label) + '</span></div>';
    }).join('');
    return '<div class="prog-chart"><h4>' + escapeHtml(title) + '</h4><div class="prog-bars">' + bars + '</div></div>';
  }

  function comboAccuracyChart(title, series) {
    if (!series.length) return '';
    var max = 100;
    var pts = series.map(function (s) {
      var acc = s.accuracy;
      var display = acc == null ? '—' : acc + '%';
      var h = acc == null ? 4 : Math.max(8, Math.round((acc / max) * 100));
      var lineY = acc == null ? 0 : (100 - acc);
      return '<div class="prog-bar-col prog-combo-col" title="' + escapeHtml(s.label) + ': ' + display + '">' +
        '<span class="prog-bar-val">' + escapeHtml(display) + '</span>' +
        '<div class="prog-bar-track prog-combo-track">' +
        '<div class="prog-bar" style="height:' + h + '%;background:var(--green)"></div>' +
        (acc != null ? '<div class="prog-combo-line" style="bottom:' + lineY + '%"></div>' : '') +
        '</div>' +
        '<span class="prog-bar-lbl">' + escapeHtml(s.label) + '</span></div>';
    }).join('');
    return '<div class="prog-chart prog-chart-combo"><h4>' + escapeHtml(title) + '</h4><div class="prog-bars">' + pts + '</div></div>';
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
      html += '<div class="progress-block"><h4 class="progress-block-title">Entrenador</h4><div class="progress-charts progress-charts-grid">' +
        comboAccuracyChart('Acierto', trainerSeries) +
        barChart('Tasa de error', trainerSeries, 'errorRate', '%', '--red') +
        barChart('EV perdido (bb)', trainerSeries, 'evLoss', ' bb', '--red') +
        barChart('Manos', trainerSeries, 'hands', '', '--gold') +
        '</div></div>';
    }

    if (hasSessions) {
      html += '<div class="progress-block progress-block-sessions"><h4 class="progress-block-title">Sesiones importadas</h4><div class="progress-charts progress-charts-grid">' +
        comboAccuracyChart('Acierto', sessionSeries) +
        barChart('Tasa de error', sessionSeries, 'errorRate', '%', '--red') +
        barChart('EV perdido (bb)', sessionSeries, 'evLoss', ' bb', '--red') +
        barChart('Resultado real (bb)', sessionSeries, 'netBB', ' bb', '--accent') +
        barChart('Manos', sessionSeries, 'hands', '', '--gold') +
        barChart('Sesiones', sessionSeries, 'sessions', '', '--orange') +
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
