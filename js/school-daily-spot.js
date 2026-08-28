/*
 * school-daily-spot.js — Spot del día + racha Escuela (vehículo viral IG).
 * Cargar tras school-data-viral-quizzes.js y school.js.
 */
(function (global) {
  'use strict';

  var DAILY_XP = 15;
  var STORAGE_KEY = 'dailySpot';
  var IG_UTM = '?utm_source=instagram&utm_medium=social&utm_campaign=escuela_daily';

  var IG_WEEK = [
    { day: 1, kind: 'decisionQuiz', caption: 'Comenta F, C o R 👇' },
    { day: 2, kind: 'rfiQuiz', caption: '¿Open o fold? Comenta 👇' },
    { day: 3, kind: 'oddsQuiz', caption: '¿Call o fold? Pot vs bet 👇' },
    { day: 4, kind: 'sizingQuiz', caption: '¿Qué sizing elige el solver? 👇' },
    { day: 5, kind: 'blockerQuiz', caption: '¿Con cuál faroleas? A / B / C 👇' },
    { day: 6, kind: 'equityQuiz', caption: 'Estima tu equity · ¿A, B o C? 👇' },
    { day: 0, kind: 'textureQuiz', caption: '¿Seco, wet o monotone? 👇' }
  ];

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
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
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
    if (kind === 'sizingQuiz') return 'Sizing';
    if (kind === 'rfiQuiz') return 'RFI';
    if (kind === 'equityQuiz') return 'Equity';
    if (kind === 'textureQuiz') return 'Textura';
    if (kind === 'comboQuiz') return 'Combos';
    if (kind === 'nashQuiz') return 'Push / fold';
    if (kind === 'icmQuiz') return 'ICM';
    if (kind === 'sprQuiz') return 'SPR';
    if (kind === 'nutAdvQuiz') return 'Nut Advantage';
    return 'Quiz';
  }

  function shareUrl() {
    var base = (global.PTSchoolShare && global.PTSchoolShare.siteUrl)
      ? global.PTSchoolShare.siteUrl()
      : 'https://www.pokerforgeai.com/';
    return String(base).replace(/\/?$/, '/') + IG_UTM;
  }

  function igPlanForDay(forDay) {
    var d = forDay ? new Date(forDay + 'T12:00:00') : new Date();
    var dow = d.getDay();
    for (var i = 0; i < IG_WEEK.length; i++) {
      if (IG_WEEK[i].day === dow) return IG_WEEK[i];
    }
    return IG_WEEK[0];
  }

  function buildIgCaption(spot, forDay) {
    spot = spot || pickDailySpot(forDay);
    var plan = igPlanForDay(forDay);
    var kind = (spot && spot.kind) || plan.kind;
    var preview = spotPreview(spot);
    var caption = (kind === (spot && spot.kind) && plan.caption)
      ? plan.caption
      : (kindLabel(kind) + ' · sin spoiler');
    return caption + '\n' + preview + '\n' + shareUrl();
  }

  function weekCalendar(fromDay) {
    var start = fromDay || dayKey();
    var out = [];
    for (var i = 0; i < 7; i++) {
      var iso = addDays(start, i);
      var plan = igPlanForDay(iso);
      var spot = pickDailySpot(iso);
      out.push({
        day: iso,
        weekday: new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short' }),
        kind: (spot && spot.kind) || plan.kind,
        kindLabel: kindLabel((spot && spot.kind) || plan.kind),
        caption: plan.caption,
        preview: spotPreview(spot)
      });
    }
    return out;
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
    if (spot.kind === 'sizingQuiz') {
      return (q.line || '') + ' · ' + (q.board || []).join(' ');
    }
    if (spot.kind === 'rfiQuiz') {
      return (q.position || spot.heroPos || '') + ' · ' + (q.heroCards || []).join('');
    }
    if (spot.kind === 'equityQuiz') {
      return (q.villainRange || 'Equity') + ' · ' + (q.board || []).join(' ');
    }
    if (spot.kind === 'textureQuiz' || spot.kind === 'comboQuiz') {
      return (q.board || []).join(' ') + (q.handType ? ' · ' + q.handType : '');
    }
    if (spot.kind === 'nashQuiz') {
      return (q.position || '') + ' · ' + (q.stackBB || '?') + ' bb · ' + (q.heroCards || []).join('');
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
    if (global.PTSchoolShare && global.PTSchoolShare.spotToSharePayload) {
      return Object.assign(base, global.PTSchoolShare.spotToSharePayload(spot, { lessonTitle: 'Spot del día' }));
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
    var igHint = buildIgCaption(spot, today).split('\n')[0];
    return (
      '<section class="school-daily card-box" aria-label="Spot del día">' +
      '<div class="school-daily-head">' +
      '<div><p class="school-eyebrow">Spot del día · ' + esc(kind) + '</p>' +
      '<h3 class="school-daily-title">' + (doneToday ? 'Completado hoy' : '¿Listo para el reto?') + '</h3>' +
      '<p class="school-daily-lead muted-text">' + esc(preview) + '</p>' +
      '<p class="school-daily-ig muted-text">IG: ' + esc(igHint) + '</p></div>' +
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
    var shareRoot = card.querySelector('.school-share-daily');
    if (shareRoot && global.PTSchoolShare && global.PTSchoolShare.mountDailyShare) {
      try {
        global.PTSchoolShare.mountDailyShare(shareRoot, buildSharePayload());
      } catch (eDailyShare) { /* ignore */ }
    }
  }

  function dailyPlayFeedback(reason) {
    if (reason === 'done') return 'Ya completaste el spot de hoy. Vuelve mañana.';
    if (reason === 'empty') return 'No hay spots disponibles ahora mismo.';
    if (reason === 'missing') return 'El spot del día no está disponible. Recarga la página.';
    return 'No se pudo iniciar el spot del día.';
  }

  global.PTSchoolDailySpot = {
    dayKey: dayKey,
    getPool: getPool,
    pickDailySpot: pickDailySpot,
    readDailyState: readDailyState,
    writeDailyState: writeDailyState,
    buildHubCardHtml: buildHubCardHtml,
    buildSharePayload: buildSharePayload,
    buildIgCaption: buildIgCaption,
    weekCalendar: weekCalendar,
    shareUrl: shareUrl,
    completeDaily: completeDaily,
    mountHub: mountHub,
    dailyPlayFeedback: dailyPlayFeedback,
    DAILY_XP: DAILY_XP,
    IG_UTM: IG_UTM
  };
})(typeof window !== 'undefined' ? window : globalThis);
