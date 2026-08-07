/*
 * gamification.js — Racha diaria, misión ligera y rating de estudio.
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function dayKey(input) {
    var d = input ? new Date(input) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
  }

  function addDays(iso, delta) {
    var d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    return dayKey(d);
  }

  function parseItems(items) {
    var out = {};
    (items || []).forEach(function (it) {
      if (!it || !it.createdAt) return;
      var k = dayKey(it.createdAt);
      out[k] = (out[k] || 0) + 1;
    });
    return out;
  }

  function collectDecisions(history) {
    var out = [];
    (history || []).forEach(function (h) {
      (h.decisions || []).forEach(function (d) {
        out.push(d);
      });
    });
    return out;
  }

  function buildRating(history) {
    var recent = (history || []).slice(0, 30);
    var rating = 1000;
    recent.forEach(function (h) {
      var good = 0;
      var bad = 0;
      (h.decisions || []).forEach(function (d) {
        if (d.class === 'optima') good += 12;
        else if (d.class === 'aceptable') good += 6;
        else if (d.class === 'imprecisa') bad += 4;
        else if (d.class === 'error') bad += 10;
      });
      rating += Math.max(-18, Math.min(18, good - bad));
    });
    if (rating < 700) rating = 700;
    if (rating > 1800) rating = 1800;
    return rating;
  }

  function ratingTier(rating) {
    if (rating >= 1500) return 'Crusher';
    if (rating >= 1325) return 'Reg';
    if (rating >= 1150) return 'En ritmo';
    return 'Calentando';
  }

  function buildStreak(dayMap) {
    var keys = Object.keys(dayMap || {}).sort();
    if (!keys.length) return { current: 0, best: 0 };
    var best = 1;
    var run = 1;
    for (var i = 1; i < keys.length; i++) {
      if (addDays(keys[i - 1], 1) === keys[i]) run += 1;
      else run = 1;
      if (run > best) best = run;
    }
    var today = dayKey();
    var yesterday = addDays(today, -1);
    var current = 0;
    if (dayMap[today]) current = 1;
    else if (dayMap[yesterday]) current = 1;
    if (current) {
      var cursor = dayMap[today] ? today : yesterday;
      while (dayMap[addDays(cursor, -1)]) {
        current += 1;
        cursor = addDays(cursor, -1);
      }
    }
    return { current: current, best: best };
  }

  function snapshot(store) {
    store = store || global.Store;
    if (!store) return null;
    var history = store.getHistory ? store.getHistory() : [];
    var sessions = store.getSessions ? store.getSessions() : [];
    var errors = store.getErrors ? store.getErrors() : [];
    var historyDays = parseItems(history);
    var sessionDays = parseItems(sessions);
    var allDays = {};
    Object.keys(historyDays).forEach(function (k) { allDays[k] = (allDays[k] || 0) + historyDays[k]; });
    Object.keys(sessionDays).forEach(function (k) { allDays[k] = (allDays[k] || 0) + sessionDays[k]; });
    var today = dayKey();
    var streak = buildStreak(allDays);
    var decisions = collectDecisions(history);
    var good = decisions.filter(function (d) { return d.class === 'optima' || d.class === 'aceptable'; }).length;
    var recentDecisions = decisions.slice(-40);
    var recentGood = recentDecisions.filter(function (d) { return d.class === 'optima' || d.class === 'aceptable'; }).length;
    var rating = buildRating(history);
    return {
      streak: streak,
      rating: rating,
      ratingTier: ratingTier(rating),
      todayHands: historyDays[today] || 0,
      todaySessions: sessionDays[today] || 0,
      todayGoalHands: 10,
      decisions: decisions.length,
      accuracy: decisions.length ? Math.round((good / decisions.length) * 100) : null,
      recentAccuracy: recentDecisions.length ? Math.round((recentGood / recentDecisions.length) * 100) : null,
      errorsToReview: errors.length
    };
  }

  function missionText(s) {
    if (s.todayHands < s.todayGoalHands) {
      return 'Entrena ' + (s.todayGoalHands - s.todayHands) + ' mano' + ((s.todayGoalHands - s.todayHands) === 1 ? '' : 's') + ' más hoy';
    }
    if (s.todaySessions < 1) return 'Bonus del día: importa 1 sesión real';
    if (s.errorsToReview > 0) return 'Bonus del día: repasa tus errores pendientes';
    return 'Objetivo del día completado';
  }

  function renderHome(host, store) {
    if (!host) return;
    var s = snapshot(store);
    if (!s) {
      host.innerHTML = '';
      return;
    }
    var pct = Math.max(0, Math.min(100, Math.round((s.todayHands / s.todayGoalHands) * 100)));
    host.innerHTML =
      '<div class="game-panel card-box">' +
      '<div class="game-panel-head"><h3>Ritmo de estudio</h3><span class="game-tier">' + esc(s.ratingTier) + '</span></div>' +
      '<div class="game-stats">' +
      '<div class="game-stat"><strong>' + esc(String(s.streak.current)) + '</strong><span>Racha actual</span></div>' +
      '<div class="game-stat"><strong>' + esc(String(s.rating)) + '</strong><span>Rating</span></div>' +
      '<div class="game-stat"><strong>' + esc(s.recentAccuracy == null ? '—' : (s.recentAccuracy + '%')) + '</strong><span>Forma reciente</span></div>' +
      '</div>' +
      '<div class="game-mission">' +
      '<div class="game-mission-top"><strong>Misión de hoy</strong><span>' + esc(s.todayHands) + ' / ' + esc(String(s.todayGoalHands)) + ' manos</span></div>' +
      '<div class="game-progress"><span style="width:' + pct + '%"></span></div>' +
      '<p class="muted-text">' + esc(missionText(s)) + '</p>' +
      '</div>' +
      '</div>';
  }

  function renderStats(host, store) {
    if (!host) return;
    var s = snapshot(store);
    if (!s) {
      host.innerHTML = '';
      return;
    }
    host.innerHTML =
      '<div class="game-strip card-box">' +
      '<div class="game-strip-item"><span class="game-strip-val">' + esc(String(s.streak.current)) + '</span><span class="game-strip-lbl">Racha</span></div>' +
      '<div class="game-strip-item"><span class="game-strip-val">' + esc(String(s.streak.best)) + '</span><span class="game-strip-lbl">Mejor racha</span></div>' +
      '<div class="game-strip-item"><span class="game-strip-val">' + esc(String(s.rating)) + '</span><span class="game-strip-lbl">Rating</span></div>' +
      '<div class="game-strip-item"><span class="game-strip-val">' + esc(s.accuracy == null ? '—' : (s.accuracy + '%')) + '</span><span class="game-strip-lbl">Acierto global</span></div>' +
      '</div>';
  }

  global.PTGamification = {
    dayKey: dayKey,
    snapshot: snapshot,
    renderHome: renderHome,
    renderStats: renderStats
  };
})(window);
