/*
 * school-daily-spot.js — Spot del día + racha Escuela (vehículo viral IG).
 * Cargar tras school-data-viral-quizzes.js y school.js.
 */
(function (global) {
  'use strict';

  var DAILY_XP = 15;
  var STORAGE_KEY = 'dailySpot';

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

  function hashDay(iso) {
    var h = 0;
    var s = String(iso || '');
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function getPool() {
    var V = global.PTSchoolViralQuizzes;
    if (V && V.DAILY_POOL && V.DAILY_POOL.length) return V.DAILY_POOL;
    return [];
  }

  function kindLabel(kind) {
    if (kind === 'oddsQuiz') return 'Pot odds';
    if (kind === 'blockerQuiz') return 'Blockers';
    if (kind === 'rangeAdvQuiz') return 'Range Advantage';
    if (kind === 'decisionQuiz') return 'Fold / Call / Raise';
    return 'Quiz';
  }

  function spotPreview(spot) {
    if (!spot) return 'Entrena un spot viral sin spoiler.';
    var q = spot.quiz || {};
    if (spot.kind === 'oddsQuiz') {
      return 'Pot ' + (q.potBB != null ? q.potBB : '?') + ' bb · Bet ' +
        (q.betBB != null ? q.betBB : '?') + ' bb · ' + (q.draw || '');
    }
    if (spot.kind === 'blockerQuiz') {
      return (q.board || []).join(' ') + ' · ' + (q.villainAction || 'River');
    }
    if (q.prompt) return q.prompt;
    if (q.line) return q.line;
    return kindLabel(spot.kind);
  }

  function readDailyState() {
    var school = global.PTSchool && global.PTSchool.readSchool
      ? global.PTSchool.readSchool()
      : {};
    var ds = school[STORAGE_KEY] || {};
    return {
      lastDay: ds.lastDay || null,
      lastSpotId: ds.lastSpotId || null,
      completed: !!ds.completed,
      correct: !!ds.correct,
      streak: Number(ds.streak) || 0,
      best: Number(ds.best) || 0,
      total: Number(ds.total) || 0
    };
  }

  function writeDailyState(patch) {
    if (!global.PTSchool || !global.PTSchool.readSchool) return null;
    var school = global.PTSchool.readSchool();
    var prev = school[STORAGE_KEY] || {};
    school[STORAGE_KEY] = Object.assign({}, prev, patch || {});
    if (global.PTSchool._writeSchool) {
      global.PTSchool._writeSchool(school);
    } else if (global.Store && global.Store.saveStats) {
      var stats = global.Store.getStats ? global.Store.getStats() : {};
      stats.school = school;
      global.Store.saveStats(stats);
    }
    return school[STORAGE_KEY];
  }

  function pickDailySpot(forDay) {
    var pool = getPool();
    if (!pool.length) return null;
    var day = forDay || dayKey();
    var idx = hashDay(day) % pool.length;
    return pool[idx];
  }

  function buildSharePayload(spot, day) {
    spot = spot || pickDailySpot(day);
    if (!spot) return null;
    var q = spot.quiz || {};
    var base = {
      lessonTitle: 'Spot del día',
      kind: spot.kind,
      kindLabel: kindLabel(spot.kind),
      prompt: q.prompt || spotPreview(spot)
    };
    if (spot.kind === 'decisionQuiz') {
      return Object.assign(base, {
        line: q.line || '',
        lineStory: q.lineStory || [],
        board: (q.board || []).slice(),
        heroPos: spot.heroPos || '',
        heroCards: (q.heroCards || []).slice(),
        villainPos: q.villainPos || 'BB',
        options: (q.options || []).map(function (o) { return { id: o.id, label: o.label }; })
      });
    }
    if (spot.kind === 'oddsQuiz') {
      return Object.assign(base, {
        potBB: q.potBB,
        betBB: q.betBB,
        draw: q.draw || '',
        board: (q.board || []).slice(),
        heroCards: (q.heroCards || []).slice(),
        options: (q.options || []).map(function (o) { return { id: o.id, label: o.label }; })
      });
    }
    if (spot.kind === 'blockerQuiz') {
      return Object.assign(base, {
        board: (q.board || []).slice(),
        villainAction: q.villainAction || '',
        options: (q.options || []).map(function (o) {
          return { id: o.id, label: o.label, cards: (o.cards || []).slice() };
        })
      });
    }
    return base;
  }

  function buildHubCardHtml() {
    var pool = getPool();
    if (!pool.length) return '';
    var today = dayKey();
    var ds = readDailyState();
    var spot = pickDailySpot(today);
    var doneToday = ds.lastDay === today && ds.completed;
    var streak = ds.streak || 0;
    var preview = spotPreview(spot);
    var kind = kindLabel(spot && spot.kind);
    return (
      '<section class="school-daily card-box" aria-label="Spot del día">' +
      '<div class="school-daily-head">' +
      '<div><p class="school-eyebrow">Spot del día · ' + esc(kind) + '</p>' +
      '<h3 class="school-daily-title">' + (doneToday ? 'Completado hoy' : '¿Listo para el reto?') + '</h3>' +
      '<p class="school-daily-lead muted-text">' + esc(preview) + '</p></div>' +
      '<div class="school-daily-streak" aria-label="Racha">' +
      '<span class="school-daily-streak-val">' + esc(String(streak)) + '</span>' +
      '<span class="school-daily-streak-lbl">días</span></div>' +
      '</div>' +
      '<div class="school-daily-actions">' +
      '<button type="button" class="btn btn-primary" data-school-daily-play"' +
      (doneToday ? ' disabled' : '') + '>' +
      (doneToday ? 'Vuelve mañana' : 'Jugar spot') + '</button>' +
      (global.PTSchoolShare && global.PTSchoolShare.buildDailyShareHtml
        ? global.PTSchoolShare.buildDailyShareHtml()
        : '') +
      '</div>' +
      '<p class="school-daily-meta muted-text">+' + DAILY_XP + ' XP al acertar · comparte sin spoiler en IG</p>' +
      '</section>'
    );
  }

  function updateStreak(ds, today, correct) {
    var streak = Number(ds.streak) || 0;
    var best = Number(ds.best) || 0;
    if (ds.lastDay === today && ds.completed) {
      return { streak: streak, best: best };
    }
    if (correct) {
      if (ds.lastDay && addDays(ds.lastDay, 1) === today) streak += 1;
      else streak = 1;
    } else {
      streak = 0;
    }
    if (streak > best) best = streak;
    return { streak: streak, best: best };
  }

  function completeDaily(summary, results) {
    var today = dayKey();
    var ds = readDailyState();
    if (ds.lastDay === today && ds.completed) return ds;
    var ok = !!(results && results.length && results[0].quizCorrect);
    var streakInfo = updateStreak(ds, today, ok);
    var xpGain = ok ? DAILY_XP : 0;
    if (xpGain && global.PTSchool && global.PTSchool.readSchool) {
      var school = global.PTSchool.readSchool();
      school.xp = (Number(school.xp) || 0) + xpGain;
      school[STORAGE_KEY] = {
        lastDay: today,
        lastSpotId: results[0] && results[0].spotId,
        completed: true,
        correct: ok,
        streak: streakInfo.streak,
        best: streakInfo.best,
        total: (Number(ds.total) || 0) + 1
      };
      if (global.PTSchool._writeSchool) global.PTSchool._writeSchool(school);
    } else {
      writeDailyState({
        lastDay: today,
        lastSpotId: results[0] && results[0].spotId,
        completed: true,
        correct: ok,
        streak: streakInfo.streak,
        best: streakInfo.best,
        total: (Number(ds.total) || 0) + 1
      });
    }
    if (global.PTSchool && global.PTSchool.trackSchool) {
      global.PTSchool.trackSchool('daily_spot_complete', {
        correct: ok,
        streak: streakInfo.streak,
        xp: xpGain
      });
    }
    return readDailyState();
  }

  function mountHub(root) {
    if (!root) return;
    var card = root.querySelector('.school-daily');
    if (!card) return;
    var play = card.querySelector('[data-school-daily-play]');
    if (play) {
      play.addEventListener('click', function () {
        if (play.disabled) return;
        if (global.PTSchool && global.PTSchool.startDailySession) {
          global.PTSchool.startDailySession();
        }
      });
    }
    var shareRoot = card.querySelector('.school-share-daily');
    if (shareRoot && global.PTSchoolShare && global.PTSchoolShare.mountDailyShare) {
      try {
        global.PTSchoolShare.mountDailyShare(shareRoot, buildSharePayload());
      } catch (eDailyShare) { /* ignore */ }
    }
  }

  global.PTSchoolDailySpot = {
    dayKey: dayKey,
    getPool: getPool,
    pickDailySpot: pickDailySpot,
    readDailyState: readDailyState,
    writeDailyState: writeDailyState,
    buildHubCardHtml: buildHubCardHtml,
    buildSharePayload: buildSharePayload,
    completeDaily: completeDaily,
    mountHub: mountHub,
    DAILY_XP: DAILY_XP
  };
})(typeof window !== 'undefined' ? window : globalThis);
