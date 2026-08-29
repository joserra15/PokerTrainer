/*
 * school.js — Escuela de Póker: hub multi-ruta (Cash/Spins/MTT/Rangos), runner de spots.
 * Escuela abierta a usuarios autenticados (SCHOOL_PUBLIC=true). Fases G–J: Spins, MTT, rangos/pro, leaks→lección.
 * Las manos de lección no consumen el cupo diario del entrenador.
 */
(function (global) {
  'use strict';

  var VIEW = { hub: 'hub', lesson: 'lesson', result: 'result', matrix: 'matrix' };
  var state = {
    view: VIEW.hub,
    route: 'cash',
    lessonId: null,
    session: null
  };

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function Data() {
    return global.PTSchoolData || null;
  }

  function Store() {
    return global.Store || null;
  }

  function hasAdminAccess() {
    var demoOn = global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive();
    if (demoOn) return false;
    if (global.PTAdmin && typeof global.PTAdmin.hasAccess === 'function') {
      return !!global.PTAdmin.hasAccess();
    }
    var u = authUser();
    return !!(u && u.isAdmin);
  }

  /* ---------- Progreso (stats.school → cloud via stats) ---------- */

  /**
   * Aprobados en esta sesión de página (sobrevive si localStorage/sync pierden el write).
   * Valor: true | { passed, score, pct, gold, perfect }.
   */
  var passedOverlay = Object.create(null);

  function defaultSchool() {
    return { xp: 0, lessons: {}, updatedAt: 0, version: 2 };
  }

  function normalizeDailySpot(ds) {
    if (!ds || typeof ds !== 'object') return null;
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

  function cloneDailySpot(ds) {
    var n = normalizeDailySpot(ds);
    return n ? Object.assign({}, n) : undefined;
  }

  function dayAfterDaily(iso) {
    if (!iso) return null;
    var d = new Date(iso + 'T12:00:00');
    if (isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + 1);
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  function mergeDailySpot(aRaw, bRaw) {
    var a = normalizeDailySpot(aRaw);
    var b = normalizeDailySpot(bRaw);
    if (!a && !b) return undefined;
    if (!a) return cloneDailySpot(b);
    if (!b) return cloneDailySpot(a);
    var pick = (!a.lastDay || (b.lastDay && b.lastDay > a.lastDay)) ? b
      : (!b.lastDay || a.lastDay > b.lastDay) ? a
      : (a.completed && !b.completed) ? a
      : (b.completed && !a.completed) ? b
      : ((Number(a.streak) || 0) >= (Number(b.streak) || 0)) ? a : b;
    var other = pick === a ? b : a;
    var streak = Math.max(Number(pick.streak) || 0, Number(other.streak) || 0);
    if (pick.lastDay && other.lastDay) {
      if (pick.lastDay === dayAfterDaily(other.lastDay) && pick.completed && pick.correct) {
        streak = Math.max(streak, (Number(other.streak) || 0) + 1);
      } else if (other.lastDay === dayAfterDaily(pick.lastDay) && other.completed && other.correct) {
        streak = Math.max(streak, (Number(pick.streak) || 0) + 1);
      }
    }
    var best = Math.max(Number(a.best) || 0, Number(b.best) || 0, streak);
    return {
      lastDay: pick.lastDay || other.lastDay || null,
      lastSpotId: pick.lastSpotId || other.lastSpotId || null,
      completed: !!(pick.completed || (pick.lastDay === other.lastDay && other.completed)),
      correct: !!(pick.correct || (pick.lastDay === other.lastDay && other.correct)),
      streak: streak,
      best: best,
      total: Math.max(Number(a.total) || 0, Number(b.total) || 0)
    };
  }

  /**
   * v1→v2: el examen M0 pasó de C-04 a C-06; C-04 es ahora "Sizing del open".
   * Migra progreso del examen antiguo a C-06 y deja C-04 limpio.
   */
  function migrateSchoolProgress(school) {
    var out = school && typeof school === 'object' ? school : defaultSchool();
    var ver = Number(out.version) || 1;
    if (ver >= 2) return out;
    var lessons = out.lessons && typeof out.lessons === 'object' ? Object.assign({}, out.lessons) : {};
    if (lessons['C-04'] && !lessons['C-06']) {
      lessons['C-06'] = lessons['C-04'];
      delete lessons['C-04'];
    }
    out.lessons = lessons;
    out.version = 2;
    out._migrated = true;
    return out;
  }

  function schoolBackupKey() {
    var uid = '';
    try {
      if (Store() && typeof Store().getUserId === 'function') uid = Store().getUserId() || '';
    } catch (e) { /* ignore */ }
    var suffix = '';
    try {
      if (global.PTCommunity && typeof global.PTCommunity.id === 'function') {
        var cid = global.PTCommunity.id();
        if (cid && cid !== 'pokerforge') suffix = '_' + cid;
      }
    } catch (e2) { /* ignore */ }
    return 'pt_school_backup' + suffix + '_v1' + (uid ? '_' + uid : '');
  }

  /** Copia backup legacy sin uid → clave con uid (login no debe perder Escuela). Solo PokerForge. */
  function migrateSchoolBackupToUser() {
    try {
      if (typeof localStorage === 'undefined') return;
      var key = schoolBackupKey();
      if (key.indexOf('pt_school_backup_mttlab') === 0 || key.indexOf('pt_school_backup_') === 0 && key !== 'pt_school_backup_v1' && key.indexOf('pt_school_backup_v1_') !== 0) {
        /* Comunidad: no migrar backup PF */
        if (key.indexOf('pt_school_backup_v1') !== 0) return;
      }
      if (global.PTCommunity && PTCommunity.id && PTCommunity.id() !== 'pokerforge') return;
      if (key === 'pt_school_backup_v1') return;
      if (localStorage.getItem(key)) return;
      var legacy = localStorage.getItem('pt_school_backup_v1');
      if (!legacy) return;
      localStorage.setItem(key, legacy);
    } catch (e) { /* ignore */ }
  }

  function readSchoolBackup() {
    try {
      if (typeof localStorage === 'undefined') return null;
      migrateSchoolBackupToUser();
      var raw = localStorage.getItem(schoolBackupKey());
      if (!raw && !(global.PTCommunity && PTCommunity.id && PTCommunity.id() !== 'pokerforge')) {
        raw = localStorage.getItem('pt_school_backup_v1');
      }
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function writeSchoolBackup(school) {
    try {
      if (typeof localStorage === 'undefined') return false;
      var backup = {
        xp: Number(school.xp) || 0,
        lessons: cloneLessonsMap(school.lessons),
        updatedAt: Date.now(),
        version: Number(school.version) || 2
      };
      var ds = cloneDailySpot(school.dailySpot);
      if (ds) backup.dailySpot = ds;
      var payload = JSON.stringify(backup);
      localStorage.setItem(schoolBackupKey(), payload);
      /* También en clave legacy solo en PokerForge. */
      try {
        var isCommunity = global.PTCommunity && PTCommunity.id && PTCommunity.id() !== 'pokerforge';
        if (!isCommunity && schoolBackupKey() !== 'pt_school_backup_v1') {
          localStorage.setItem('pt_school_backup_v1', payload);
        }
      } catch (e2) { /* ignore */ }
      return true;
    } catch (e) {
      return false;
    }
  }

  /** % de acierto a mostrar; null si no hay dato usable (evita «undefined%»). */
  function resolveBestPct(row) {
    if (!row || typeof row !== 'object') return null;
    var pct = row.bestPct;
    if (pct != null && isFinite(Number(pct))) return Number(pct);
    if (row.bestScore != null && isFinite(Number(row.bestScore))) {
      return Math.round(Number(row.bestScore) * 1000) / 10;
    }
    if (row.lastPct != null && isFinite(Number(row.lastPct))) return Number(row.lastPct);
    if (row.lastScore != null && isFinite(Number(row.lastScore))) {
      return Math.round(Number(row.lastScore) * 1000) / 10;
    }
    if (row.score != null && isFinite(Number(row.score))) {
      return Math.round(Number(row.score) * 1000) / 10;
    }
    if (row.pct != null && isFinite(Number(row.pct))) return Number(row.pct);
    return null;
  }

  function normalizeLessonRow(row) {
    if (!row || typeof row !== 'object') return null;
    var out = {
      bestScore: row.bestScore,
      bestPct: row.bestPct,
      attempts: row.attempts,
      passed: !!row.passed,
      gold: !!row.gold,
      perfect: !!row.perfect,
      lastScore: row.lastScore,
      lastPct: row.lastPct,
      updatedAt: row.updatedAt
    };
    var pct = resolveBestPct(out);
    if (pct != null) {
      out.bestPct = pct;
      if (out.bestScore == null || !isFinite(Number(out.bestScore))) {
        out.bestScore = pct / 100;
      }
    } else {
      delete out.bestPct;
      if (!(Number(out.bestScore) > 0)) delete out.bestScore;
    }
    return out;
  }

  function cloneLessonsMap(lessons) {
    var src = lessons && typeof lessons === 'object' ? lessons : {};
    var out = {};
    Object.keys(src).forEach(function (id) {
      var row = normalizeLessonRow(src[id]);
      if (row) out[id] = row;
    });
    return out;
  }

  function pickScoredField(a, b, field) {
    var aHas = a[field] != null && isFinite(Number(a[field]));
    var bHas = b[field] != null && isFinite(Number(b[field]));
    if (aHas && bHas) {
      return (a.updatedAt || '') >= (b.updatedAt || '') ? a[field] : b[field];
    }
    if (aHas) return a[field];
    if (bHas) return b[field];
    return undefined;
  }

  function mergeLessonProgressRows(a, b) {
    if (!a) return b ? normalizeLessonRow(b) : null;
    if (!b) return normalizeLessonRow(a);
    var bestScore = Math.max(Number(a.bestScore) || 0, Number(b.bestScore) || 0);
    var merged = {
      bestScore: bestScore,
      bestPct: Math.round(bestScore * 1000) / 10,
      attempts: Math.max(Number(a.attempts) || 0, Number(b.attempts) || 0),
      passed: !!(a.passed || b.passed),
      gold: !!(a.gold || b.gold),
      perfect: !!(a.perfect || b.perfect),
      lastScore: pickScoredField(a, b, 'lastScore'),
      lastPct: pickScoredField(a, b, 'lastPct'),
      updatedAt: (a.updatedAt || '') >= (b.updatedAt || '') ? a.updatedAt : b.updatedAt
    };
    /* Si no hay score real pero sí un % en alguno de los lados, no dejar 0%. */
    if (!(Number(a.bestScore) > 0) && !(Number(b.bestScore) > 0)) {
      var fallback = resolveBestPct(a) != null ? resolveBestPct(a) : resolveBestPct(b);
      if (fallback != null) {
        merged.bestPct = fallback;
        merged.bestScore = fallback / 100;
      } else {
        delete merged.bestScore;
        delete merged.bestPct;
      }
    }
    return normalizeLessonRow(merged);
  }

  function mergeSchoolObjects(a, b) {
    if (!a) return b ? {
      xp: Number(b.xp) || 0,
      lessons: cloneLessonsMap(b.lessons),
      dailySpot: cloneDailySpot(b.dailySpot),
      updatedAt: Number(b.updatedAt) || 0,
      version: Number(b.version) || 2
    } : defaultSchool();
    if (!b) return {
      xp: Number(a.xp) || 0,
      lessons: cloneLessonsMap(a.lessons),
      dailySpot: cloneDailySpot(a.dailySpot),
      updatedAt: Number(a.updatedAt) || 0,
      version: Number(a.version) || 2
    };
    var lessons = {};
    var ids = {};
    Object.keys(a.lessons || {}).forEach(function (id) { ids[id] = true; });
    Object.keys(b.lessons || {}).forEach(function (id) { ids[id] = true; });
    Object.keys(ids).forEach(function (id) {
      lessons[id] = mergeLessonProgressRows(
        (a.lessons && a.lessons[id]) || null,
        (b.lessons && b.lessons[id]) || null
      );
    });
    var out = {
      xp: Math.max(Number(a.xp) || 0, Number(b.xp) || 0),
      lessons: lessons,
      updatedAt: Math.max(Number(a.updatedAt) || 0, Number(b.updatedAt) || 0),
      version: Math.max(Number(a.version) || 1, Number(b.version) || 1)
    };
    var mergedDaily = mergeDailySpot(a.dailySpot, b.dailySpot);
    if (mergedDaily) out.dailySpot = mergedDaily;
    return out;
  }

  function rememberPassed(lessonId, summary) {
    if (!lessonId) return;
    var prev = passedOverlay[lessonId];
    var next = (prev && typeof prev === 'object') ? Object.assign({}, prev) : { passed: true };
    next.passed = true;
    if (summary && typeof summary === 'object') {
      if (summary.score != null && isFinite(Number(summary.score))) next.score = Number(summary.score);
      if (summary.pct != null && isFinite(Number(summary.pct))) next.pct = Number(summary.pct);
      if (summary.bestPct != null && isFinite(Number(summary.bestPct))) {
        next.pct = Math.max(Number(next.pct) || 0, Number(summary.bestPct));
      }
      if (summary.bestScore != null && isFinite(Number(summary.bestScore))) {
        next.score = Math.max(Number(next.score) || 0, Number(summary.bestScore));
      }
      if (summary.gold) next.gold = true;
      if (summary.perfect) next.perfect = true;
    }
    passedOverlay[lessonId] = next;
  }

  function applyOverlayToLessons(lessons) {
    var out = lessons && typeof lessons === 'object' ? lessons : {};
    Object.keys(passedOverlay).forEach(function (id) {
      var ov = passedOverlay[id];
      if (!ov) return;
      var prev = out[id] || {};
      var patch = { passed: true };
      if (typeof ov === 'object') {
        if (ov.gold) patch.gold = true;
        if (ov.perfect) patch.perfect = true;
        if (ov.score != null && isFinite(Number(ov.score))) {
          patch.bestScore = prev.bestScore != null
            ? Math.max(Number(prev.bestScore) || 0, Number(ov.score))
            : Number(ov.score);
        }
        if (ov.pct != null && isFinite(Number(ov.pct))) {
          patch.bestPct = prev.bestPct != null
            ? Math.max(Number(prev.bestPct) || 0, Number(ov.pct))
            : Number(ov.pct);
          patch.lastPct = ov.pct;
        }
        if (ov.score != null) patch.lastScore = ov.score;
      }
      /* No inventar fila solo-passed sin scores si ya no hay progreso durable. */
      if (!out[id] && resolveBestPct(patch) == null && resolveBestPct(prev) == null) {
        return;
      }
      out[id] = normalizeLessonRow(Object.assign({}, prev, patch));
    });
    return out;
  }

  /** Clave dedicada de Store (pequeña, sobrevive a cuota llena). */
  function readSchoolStore() {
    try {
      var S = Store();
      if (!S || typeof S.getSchoolProgress !== 'function') return null;
      var val = S.getSchoolProgress();
      return val && typeof val === 'object' ? val : null;
    } catch (e) {
      return null;
    }
  }

  /** Stats + clave propia + backup sin overlay (fuente durable para no pisar scores). */
  function readDurableSchool() {
    var st = Store() && Store().getStats ? Store().getStats() : null;
    var school = (st && st.school) ? st.school : null;
    var fromStats = null;
    if (school && typeof school === 'object') {
      fromStats = migrateSchoolProgress({
        xp: Number(school.xp) || 0,
        lessons: cloneLessonsMap(school.lessons),
        dailySpot: cloneDailySpot(school.dailySpot),
        updatedAt: Number(school.updatedAt) || 0,
        version: Number(school.version) || 1
      });
      if (fromStats._migrated) {
        delete fromStats._migrated;
        /* Evitar recursión: persistir migración vía writeSchool más abajo solo desde readSchool. */
        fromStats._needsPersistMigration = true;
      }
    }
    var merged = mergeSchoolObjects(fromStats, readSchoolStore());
    return mergeSchoolObjects(merged, readSchoolBackup());
  }

  function readSchool() {
    var merged = readDurableSchool();
    if (merged && merged._needsPersistMigration) {
      delete merged._needsPersistMigration;
      writeSchool(merged);
    }
    merged.lessons = applyOverlayToLessons(merged.lessons || {});
    var out = {
      xp: Number(merged.xp) || 0,
      lessons: cloneLessonsMap(merged.lessons || {}),
      updatedAt: Number(merged.updatedAt) || 0,
      version: Number(merged.version) || 2
    };
    var daily = cloneDailySpot(merged.dailySpot);
    if (daily) out.dailySpot = daily;
    return out;
  }

  function writeSchool(school) {
    var S = Store();
    /* Nunca escribir un snapshot más pobre que lo durable (stats+backup). */
    var durable = readDurableSchool();
    if (durable && durable._needsPersistMigration) delete durable._needsPersistMigration;
    var mergedIn = mergeSchoolObjects(durable, school);
    var payload = {
      xp: Number(mergedIn.xp) || 0,
      lessons: cloneLessonsMap(mergedIn.lessons),
      updatedAt: Date.now(),
      version: Number(mergedIn.version) || 2
    };
    var dailyOut = cloneDailySpot(mergedIn.dailySpot);
    if (dailyOut) payload.dailySpot = dailyOut;
    /* Clave propia primero: es pequeña y sobrevive aunque stats no quepa. */
    var savedOwn = false;
    if (S && typeof S.saveSchoolProgress === 'function') {
      try { savedOwn = !!S.saveSchoolProgress(payload); } catch (eOwn) { savedOwn = false; }
    }
    writeSchoolBackup(payload);
    if (!S || !S.getStats || !S.persistStats) return savedOwn;
    var st = S.getStats();
    /* Merge también con st.school crudo por si readDurable falló. */
    if (st && st.school) {
      var stMerged = mergeSchoolObjects(st.school, payload);
      payload = {
        xp: Math.max(Number(payload.xp) || 0, Number(st.school.xp) || 0),
        lessons: cloneLessonsMap(stMerged.lessons),
        updatedAt: Date.now(),
        version: Math.max(Number(payload.version) || 2, Number(st.school.version) || 2)
      };
      if (stMerged.dailySpot) payload.dailySpot = cloneDailySpot(stMerged.dailySpot);
    }
    st.school = payload;
    S.persistStats(st);
    var verified = false;
    try {
      var again = S.getStats();
      verified = !!(again && again.school && again.school.lessons);
    } catch (eVer) { /* ignore */ }
    if (!verified) {
      try {
        st.school = payload;
        S.persistStats(st);
      } catch (eRetry) { /* ignore */ }
    }
    if (global.PTCloud) {
      if (global.PTCloud.markLocalDirty) global.PTCloud.markLocalDirty(['stats']);
      if (global.PTCloud.schedulePush) global.PTCloud.schedulePush(['stats']);
      /* No esperar 2s: Safari en móvil mata el JS al cambiar de app. */
      if (global.PTCloud.flushPush) global.PTCloud.flushPush();
    }
    return true;
  }

  /** Marca aprobada en memoria + stats (+ backup). */
  function ensureLessonMarkedPassed(lessonId, summary) {
    if (!lessonId) return false;
    if (summary && summary.passed) rememberPassed(lessonId, summary);
    if (!summary || !summary.passed) return isLessonPassed(lessonId);
    var school = readSchool();
    var prev = school.lessons[lessonId] || {};
    var score = summary.score != null ? Number(summary.score) : null;
    var bestScore = prev.bestScore != null ? Number(prev.bestScore) : null;
    if (score != null && isFinite(score)) {
      bestScore = bestScore != null && isFinite(bestScore) ? Math.max(bestScore, score) : score;
    }
    var pct = summary.pct != null ? Number(summary.pct) : null;
    var bestPct = resolveBestPct({
      bestPct: prev.bestPct != null ? prev.bestPct : pct,
      bestScore: bestScore,
      lastPct: pct != null ? pct : prev.lastPct,
      lastScore: score != null ? score : prev.lastScore
    });
    school.lessons[lessonId] = normalizeLessonRow({
      bestScore: bestScore != null ? bestScore : (bestPct != null ? bestPct / 100 : prev.bestScore),
      bestPct: bestPct,
      attempts: Math.max(Number(prev.attempts) || 0, 1),
      passed: true,
      gold: !!(prev.gold || summary.gold),
      perfect: !!(prev.perfect || summary.perfect),
      lastScore: score != null ? score : prev.lastScore,
      lastPct: pct != null ? pct : prev.lastPct,
      updatedAt: new Date().toISOString()
    });
    if (summary.xpGain && !(prev.passed)) {
      /* xp already applied in recordLessonAttempt; don't double-count here */
    }
    writeSchool(school);
    return isLessonPassed(lessonId);
  }

  function showSchoolGateMessage(host, gate) {
    if (!host || !gate || gate.ok) return;
    var msg = gate.message || 'No puedes empezar esta lección ahora.';
    var existing = host.querySelector('.school-gate-msg');
    if (existing) existing.parentNode.removeChild(existing);
    var el = document.createElement('p');
    el.className = 'school-gate-msg';
    el.setAttribute('role', 'status');
    el.textContent = msg;
    var cta = host.querySelector('.school-lesson-cta') ||
      host.querySelector('.school-result-actions') ||
      host;
    cta.insertBefore(el, cta.firstChild);
  }

  function lessonProgress(lessonId) {
    var school = readSchool();
    return school.lessons[lessonId] || null;
  }

  function levelFromXp(xp) {
    var per = (Data() && Data().XP_PER_LEVEL) || 200;
    var level = Math.floor((Number(xp) || 0) / per) + 1;
    if (level < 1) level = 1;
    if (level > 30) level = 30;
    var into = (Number(xp) || 0) % per;
    return { level: level, into: into, per: per, xp: Number(xp) || 0 };
  }

  function isLessonPassed(lessonId) {
    if (lessonId && passedOverlay[lessonId]) return true;
    var p = lessonProgress(lessonId);
    return !!(p && p.passed);
  }

  function isLessonUnlocked(lessonId) {
    var data = Data();
    if (!data) return false;
    var lesson = data.getLesson(lessonId);
    if (!lesson) return false;
    if (global.PTCommunity && global.PTCommunity.unlockMode &&
        global.PTCommunity.unlockMode() === 'allOpen') {
      return true;
    }
    var list = data.lessonsForRoute(lesson.route);
    if (!list.length) return false;
    if (list[0].id === lessonId) return true;
    for (var i = 1; i < list.length; i++) {
      if (list[i].id === lessonId) return isLessonPassed(list[i - 1].id);
    }
    return false;
  }

  /**
   * Visibilidad del menú Escuela.
   * SCHOOL_PUBLIC=true → cualquier usuario autenticado (no demo).
   */
  var SCHOOL_BETA_EMAILS = [
    /* legacy allowlist; con SCHOOL_PUBLIC ya no hace falta */
  ];
  var SCHOOL_PUBLIC = true;

  function authUser() {
    return (global.PTAuth && global.PTAuth.getUser && global.PTAuth.getUser()) || global.PT_AUTH_USER || null;
  }

  function userEmail() {
    var u = authUser();
    return (u && u.email) ? String(u.email).toLowerCase() : '';
  }

  function isSchoolBetaUser() {
    var email = userEmail();
    if (!email) return false;
    for (var i = 0; i < SCHOOL_BETA_EMAILS.length; i++) {
      if (String(SCHOOL_BETA_EMAILS[i]).toLowerCase() === email) return true;
    }
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('pt_school_beta') === '1') return true;
    } catch (e) { /* ignore */ }
    return false;
  }

  function isDemoActive() {
    return !!(global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive());
  }

  /** ¿Puede ver el tab Escuela? Usuarios autenticados (GA). */
  function schoolMenuVisible() {
    if (isDemoActive()) return false;
    if (SCHOOL_PUBLIC) return !!authUser();
    return hasAdminAccess() || isSchoolBetaUser();
  }

  function trackSchool(eventName, props) {
    try {
      if (global.PTLog && typeof global.PTLog.event === 'function') {
        global.PTLog.event(eventName, props || {});
        return;
      }
      if (global.PTAnalytics && typeof global.PTAnalytics.track === 'function') {
        global.PTAnalytics.track(eventName, props || {});
      }
    } catch (e) { /* ignore */ }
  }

  function entitlementsPlan() {
    var ent = global.PTEntitlements && global.PTEntitlements.get
      ? global.PTEntitlements.get()
      : null;
    if (ent && ent.plan) return String(ent.plan);
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
    return (u && u.plan) || 'free';
  }

  /** free=0, study/pro=1, coach/premium=2 */
  function planRank(plan) {
    var p = String(plan || 'free').toLowerCase();
    if (p === 'premium' || p === 'coach') return 2;
    if (p === 'pro' || p === 'study') return 1;
    return 0;
  }

  function lessonPlanRank(lesson) {
    if (!lesson) return 0;
    return planRank(lesson.plan || 'free');
  }

  function planLabelFor(plan) {
    var p = String(plan || 'free').toLowerCase();
    if (p === 'premium' || p === 'coach') return 'Coach';
    if (p === 'pro' || p === 'study') return 'Study';
    return 'Gratis';
  }

  function openUpgrade(reason) {
    trackSchool('lesson_blocked_plan', { reason: reason || 'plan' });
    if (global.PTBilling && typeof global.PTBilling.showPaywall === 'function') {
      global.PTBilling.showPaywall(reason || 'school_plan');
      return;
    }
    if (typeof global.goToTab === 'function') global.goToTab('pricing');
  }

  /**
   * Gate de contenido (Fase D): plan Free/Study/Coach + desbloqueo lineal.
   * Menú visible a usuarios autenticados; dentro, el plan se respeta (free ve muros Study).
   */
  function canPlayLesson(lessonId) {
    if (!schoolMenuVisible()) {
      return { ok: false, reason: 'admin_only', message: 'Escuela en pruebas (solo administración).' };
    }
    var lesson = Data() && Data().getLesson(lessonId);
    if (!lesson) return { ok: false, reason: 'missing', message: 'Lección no encontrada.' };
    if (!isLessonUnlocked(lessonId)) {
      return { ok: false, reason: 'locked', message: 'Completa la lección anterior.' };
    }
    if (global.PTCommunity && global.PTCommunity.bypassPaywalls && global.PTCommunity.bypassPaywalls()) {
      return { ok: true, lesson: lesson };
    }
    var need = lessonPlanRank(lesson);
    var have = planRank(entitlementsPlan());
    if (have < need) {
      return {
        ok: false,
        reason: 'plan',
        message: 'Esta lección requiere plan ' + planLabelFor(lesson.plan) + '.',
        requiredPlan: lesson.plan,
        upgrade: true
      };
    }
    return { ok: true, lesson: lesson };
  }

  function schoolPlayConfig(spot, lesson) {
    var route = (lesson && lesson.route) || (spot && spot.route) || state.route || 'cash';
    var hub = route === 'spin' ? 'spin' : (route === 'mtt' ? 'mtt' : 'cash');
    var base = {
      scenario: 'rfi',
      practiceStreet: 'preflop',
      handRange: 'all',
      villainLevel: 'fish',
      formatHub: hub,
      gameType: hub === 'spin' ? 'spin3' : (hub === 'mtt' ? 'mtt' : 'cash6'),
      liveAdvisor: false,
      handsTarget: 0,
      schoolMode: true,
      schoolDecisionEnd: !(lesson && lesson.decisionEnd === false)
    };
    var extra = (spot && spot.playConfig) || {};
    var out = {};
    var k;
    for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    for (k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) out[k] = extra[k];
    return out;
  }

  function spotToForce(spot) {
    var fd = spot.forceDeal || {};
    var quiz = spot.villainQuiz || null;
    // En spots con quiz: no revelar hole cards del villano hasta después de la pregunta.
    var villainCards = quiz
      ? null
      : (fd.villainCards || null);
    var force = {
      type: spot.type || 'RFI',
      heroPos: spot.heroPos,
      seed: spot.seed,
      forceDeal: {
        heroCards: fd.heroCards || spot.heroCards,
        villainCards: villainCards,
        board: (fd.board || []).slice(),
        villainPos: fd.villainPos || 'BB'
      }
    };
    if (spot.key) force.key = spot.key;
    if (spot.limperPos) force.limperPos = spot.limperPos;
    if (spot.openerPos) force.openerPos = spot.openerPos;
    if (spot.callerPos) force.callerPos = spot.callerPos;
    if (spot.limperPositions) force.limperPositions = spot.limperPositions;
    if (spot.facingBet || (spot.forceDeal && spot.forceDeal.facingBet)) {
      force.facingBet = true;
      force.forceDeal.facingBet = true;
    }
    if (spot.forceScript) force.forceScript = spot.forceScript;
    return force;
  }

  function highlightLineSizing(text) {
    if (!text) return '';
    var escaped = esc(text);
    return escaped.replace(
      /(\d,\d bb|\d+% pot|overbet \d+% pot|overbet 125% pot|\d×|check-raise 3×|raise 3×|donk \d+% pot|c-bet \d+% pot)/g,
      '<span class="school-line-size">$1</span>'
    );
  }

  function formatLineStoryHtml(story) {
    if (!story || !story.length) return '';
    var items = story.map(function (row) {
      return '<li><span class="school-line-street">' + esc(row.street || '') + '</span> ' +
        highlightLineSizing(row.text || '') + '</li>';
    }).join('');
    return '<ul class="school-line-story">' + items + '</ul>';
  }

  function cardsHtml(cards) {
    if (!cards || !cards.length) return '';
    if (global.Cards && typeof global.Cards.cardToHTML === 'function') {
      return cards.map(function (c) { return global.Cards.cardToHTML(c); }).join('');
    }
    return esc(formatCards(cards));
  }

  function scorePoints(cls, pro) {
    if (cls === 'optima') return 1;
    if (cls === 'aceptable') return pro ? 0.5 : 0.6;
    if (cls === 'imprecisa') return 0.2;
    return 0;
  }

  function openRangesFromLesson(lesson) {
    var opts = (lesson && lesson.openRanges) || { spot: 'RFI', heroPos: 'BTN', street: 'preflop', gameType: 'cash6' };
    if (typeof global.openRangesExplorer === 'function') {
      global.openRangesExplorer(opts);
      return;
    }
    global.__ptPendingRanges = opts;
    if (typeof global.goToTab === 'function') global.goToTab('ranges');
  }

  function schoolLangBadgeHtml() {
    return '<span class="school-lang-badge" title="Contenido de la Escuela en español">ES</span>';
  }

  function recordLessonAttempt(lesson, spotResults) {
    var threshold = lesson.passThreshold != null ? lesson.passThreshold : 0.7;
    var goldTh = lesson.goldThreshold != null ? lesson.goldThreshold : 0.9;
    var total = 0;
    var weight = 0;
    (spotResults || []).forEach(function (r) {
      weight += 1;
      total += scorePoints(r.class, false);
    });
    var score = weight ? total / weight : 1;
    var pct = Math.round(score * 1000) / 10;
    var passed = score + 1e-9 >= threshold;
    var gold = score + 1e-9 >= goldTh;
    var perfect = score + 1e-9 >= 0.999;

    var school = readSchool();
    var prev = school.lessons[lesson.id] || {};
    var attempts = (Number(prev.attempts) || 0) + 1;
    var bestScore = prev.bestScore != null ? Math.max(prev.bestScore, score) : score;
    var firstPass = passed && !prev.passed;
    var firstGold = gold && !prev.gold;
    var xpGain = 0;
    if (firstPass) xpGain += Number(lesson.xp) || 0;
    else if (passed && score > (prev.bestScore || 0)) xpGain += Math.round((Number(lesson.xp) || 0) * 0.15);
    if (firstGold) xpGain += Math.round((Number(lesson.xp) || 0) * 0.25);
    if (perfect && !prev.perfect) xpGain += 20;

    school.xp = (Number(school.xp) || 0) + xpGain;
    school.lessons[lesson.id] = {
      bestScore: bestScore,
      bestPct: Math.round(bestScore * 1000) / 10,
      attempts: attempts,
      passed: !!(prev.passed || passed),
      gold: !!(prev.gold || gold),
      perfect: !!(prev.perfect || perfect),
      lastScore: score,
      lastPct: pct,
      updatedAt: new Date().toISOString()
    };
    writeSchool(school);

    var out = {
      score: score,
      pct: pct,
      passed: passed,
      gold: gold,
      perfect: perfect,
      xpGain: xpGain,
      bestPct: school.lessons[lesson.id].bestPct,
      threshold: threshold,
      goldThreshold: goldTh
    };
    if (passed) ensureLessonMarkedPassed(lesson.id, out);
    return out;
  }

  function completeTheoryLesson(lesson) {
    return recordLessonAttempt(lesson, []);
  }

  /* ---------- Sesión de spots ---------- */

  function activeSession() {
    return state.session;
  }

  function isSessionActive() {
    return !!(state.session && state.session.active);
  }

  function updateSchoolBanner() {
    var doc = typeof document !== 'undefined' ? document : null;
    var el = doc && doc.getElementById ? doc.getElementById('school-play-banner') : null;
    var play = doc && doc.getElementById ? doc.getElementById('play-active') : null;
    if (play && play.classList) {
      if (isSessionActive()) play.classList.add('is-school-session');
      else play.classList.remove('is-school-session');
    }
    if (!el) {
      notifyPlayLayout();
      return;
    }
    if (!isSessionActive()) {
      el.classList.add('hidden');
      el.innerHTML = '';
      notifyPlayLayout();
      return;
    }
    var s = state.session;
    var n = s.spots.length;
    var i = Math.min(s.index + 1, n);
    var spot = s.spots[s.index];
    var lineHtml = spot && spot.lineStory ? formatLineStoryHtml(spot.lineStory) : '';
    el.classList.remove('hidden');
    el.innerHTML =
      '<div class="school-play-banner-inner">' +
      '<span class="school-play-banner-label">Escuela · ' + esc(s.lessonTitle) + '</span>' +
      '<span class="school-play-banner-progress">Spot ' + i + ' / ' + n + '</span>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="school-exit-session">Salir</button>' +
      '</div>' +
      (lineHtml
        ? '<div class="school-line-banner"><p class="school-line-banner-label">Línea completa</p>' +
          lineHtml + '</div>'
        : '');
    var btn = doc.getElementById('school-exit-session');
    if (btn) {
      btn.addEventListener('click', function () {
        abandonSession(true);
      });
    }
    notifyPlayLayout();
  }

  /** Recalcula layout móvil (HUD oculto → más mesa). */
  function notifyPlayLayout() {
    try {
      if (typeof global.dispatchEvent === 'function' && typeof global.CustomEvent === 'function') {
        global.dispatchEvent(new global.CustomEvent('pt:school-session-ui'));
      } else if (typeof window !== 'undefined' && window.dispatchEvent && window.CustomEvent) {
        window.dispatchEvent(new window.CustomEvent('pt:school-session-ui'));
      }
    } catch (e) { /* ignore */ }
  }

  function abandonSession(goHub) {
    if (state.session) state.session.active = false;
    state.session = null;
    state.pendingMatrixSpot = null;
    if (state.view === VIEW.matrix) state.view = VIEW.hub;
    updateSchoolBanner();
    var doc = typeof document !== 'undefined' ? document : null;
    var fb = doc && doc.getElementById ? doc.getElementById('feedback') : null;
    if (fb) {
      fb.classList.add('hidden');
      fb.innerHTML = '';
    }
    if (goHub && typeof global.goToTab === 'function') {
      state.view = VIEW.hub;
      global.goToTab('school');
    }
  }

  function startSpotAt(index) {
    var s = state.session;
    if (!s || !s.active) return;
    if (index >= s.spots.length) {
      finishSession();
      return;
    }
    s.index = index;
    s.spotDecided = false;
    updateSchoolBanner();
    var spot = s.spots[index];
    var MX = global.PTSchoolMatrixDrills;
    if (MX && MX.isMatrixSpot && MX.isMatrixSpot(spot)) {
      startMatrixSpot(spot);
      return;
    }
    var force = spotToForce(spot);
    if (typeof global.playAnalysisHand === 'function') {
      var lesson = Data() && Data().getLesson(s.lessonId);
      global.playAnalysisHand(force, schoolPlayConfig(spot, lesson));
    }
  }

  function startMatrixSpot(spot) {
    var s = state.session;
    var MX = global.PTSchoolMatrixDrills;
    if (!s || !MX || !MX.mountDrill) return;
    state.view = VIEW.matrix;
    state.pendingMatrixSpot = spot;
    var schoolTab = typeof document !== 'undefined' ? document.getElementById('tab-school') : null;
    var onSchool = !!(schoolTab && schoolTab.classList.contains('active'));
    if (onSchool) {
      mountPendingMatrixDrill();
      return;
    }
    if (typeof global.goToTab === 'function') global.goToTab('school');
    else mountPendingMatrixDrill();
  }

  function mountPendingMatrixDrill() {
    var s = state.session;
    var spot = state.pendingMatrixSpot;
    if (!spot && s && s.spots && s.spots.length) {
      spot = s.spots[s.index || 0];
    }
    var MX = global.PTSchoolMatrixDrills;
    var root = typeof document !== 'undefined' ? document.getElementById('school-content') : null;
    if (!s || !spot || !MX || !root) return;
    state.pendingMatrixSpot = null;
    var lesson = Data() && Data().getLesson(s.lessonId);
    MX.mountDrill(root, spot, {
      index: s.index,
      total: s.spots.length,
      lessonId: s.lessonId,
      lessonTitle: s.lessonTitle || (lesson && lesson.title) || s.lessonId || '',
      timedSeconds: (lesson && lesson.timedSeconds) || s.timedSeconds || null,
      onAbort: function () { abandonSession(true); },
      onResult: function (result) {
        if (!state.session || !state.session.active) return;
        state.session.results.push({
          spotId: result.spotId || (spot && spot.id),
          class: result.class || 'error',
          action: result.action || spot.kind,
          actionLabel: result.actionLabel || '',
          heroPos: spot.heroPos || '',
          heroCards: null,
          board: (spot.quiz && spot.quiz.board) || spot.board || null,
          teachBack: result.teachBack || spot.teachBack || '',
          quizCorrect: !!result.quizCorrect,
          overlap: result.overlap
        });
        state.session.spotDecided = true;
        startSpotAt(state.session.index + 1);
      }
    });
  }

  function classLabel(cls) {
    if (cls === 'optima') return 'Óptima';
    if (cls === 'aceptable') return 'Aceptable';
    if (cls === 'imprecisa') return 'Imprecisa';
    if (cls === 'error') return 'Error';
    return cls || '—';
  }

  /** Cartas legibles en resumen (códigos del motor: Ah Td). */
  function formatCards(cards) {
    if (!cards || !cards.length) return '';
    return cards.map(function (c) { return String(c); }).join(' ');
  }

  function formatBoard(board) {
    if (!board || !board.length) return '';
    return formatCards(board);
  }

  /**
   * Resumen de spot fallido: posición · cartas · board (si hay) · clase + teachBack.
   * trapTag es interno (autoría/analytics): no se muestra al alumno.
   */
  function formatFailSpotHtml(f) {
    var parts = [];
    if (f.heroPos) parts.push(f.heroPos);
    var cards = formatCards(f.heroCards);
    if (cards) parts.push(cards);
    var board = formatBoard(f.board);
    if (board) parts.push('board ' + board);
    parts.push(classLabel(f.class));
    var explain = f.teachBack || f.reason || '';
    return '<li class="school-fail-item">' +
      '<div class="school-fail-head">' + esc(parts.join(' · ')) + '</div>' +
      (explain ? '<p class="school-fail-teach">' + esc(explain) + '</p>' : '') +
      '</li>';
  }

  function classRank(cls) {
    if (cls === 'optima') return 3;
    if (cls === 'aceptable') return 2;
    if (cls === 'imprecisa') return 1;
    return 0;
  }

  function worstDecisionClass(decisions) {
    var worst = 'optima';
    if (!(decisions && decisions.length)) return 'error';
    (decisions || []).forEach(function (d) {
      var cls = (d && d.class) || 'error';
      if (classRank(cls) < classRank(worst)) worst = cls;
    });
    return worst;
  }

  function formatLineActions(decisions) {
    if (!decisions || !decisions.length) return '—';
    return decisions.map(function (d) {
      var st = d.street ? String(d.street) : '';
      var lab = d.label || d.action || d.id || '—';
      return (st ? st + ': ' : '') + lab;
    }).join(' · ');
  }

  function lineKindFromDecisions(decisions) {
    var i;
    var d;
    var a;
    for (i = 0; i < (decisions || []).length; i++) {
      d = decisions[i];
      if (d.street && d.street !== 'flop') continue;
      a = String(d.action || d.id || '');
      if (a === 'call') return 'check-call';
      if (a === 'raise' || a.indexOf('raise') === 0) return 'check-raise';
      if (a === 'fold') return 'check-fold';
      if (a === 'check') return 'check';
      if (a.indexOf('bet') === 0) return 'bet';
    }
    return '';
  }

  function lineDecisionsHtml(decisions) {
    if (!decisions || decisions.length < 2) return '';
    var items = decisions.map(function (d) {
      var st = d.street ? String(d.street) : 'acción';
      var lab = d.label || d.action || d.id || '—';
      return '<li><span class="school-line-street">' + esc(st) + '</span> ' +
        esc(lab) + ' · ' + esc(classLabel(d.class)) + '</li>';
    }).join('');
    return '<ul class="school-line-story school-spot-line">' + items + '</ul>';
  }

  function showSpotFeedback(decision, spot, hand) {
    var s = state.session;
    var doc = typeof document !== 'undefined' ? document : null;
    var fb = doc && doc.getElementById ? doc.getElementById('feedback') : null;
    var actions = doc && doc.getElementById ? doc.getElementById('actions') : null;
    if (!fb || !s) return;
    var good = decision.class === 'optima' || decision.class === 'aceptable';
    var teach = (spot && spot.teachBack) || decision.reason || '';
    var remaining = s.spots.length - s.index - 1;
    var cards = spot && spot.forceDeal ? formatCards(spot.forceDeal.heroCards) : '';
    var boardCards = (hand && hand.board && hand.board.length)
      ? hand.board
      : (spot && spot.forceDeal ? spot.forceDeal.board : null);
    var board = formatBoard(boardCards);
    var meta = [];
    if (spot && spot.heroPos) meta.push(spot.heroPos);
    if (cards) meta.push(cards);
    if (board) meta.push('board ' + board);
    var kind = decision.lineKind || '';
    var actionLabel = kind
      ? (kind + (decision.label ? ' · ' + decision.label : ''))
      : (decision.label || decision.action || decision.id || '—');
    fb.classList.remove('hidden');
    fb.innerHTML =
      '<div class="school-spot-feedback ' + (good ? 'is-good' : 'is-bad') + '">' +
      '<h3>Spot ' + (s.index + 1) + ' / ' + s.spots.length + ' · ' + esc(classLabel(decision.class)) + '</h3>' +
      (meta.length ? '<p class="school-spot-meta">' + esc(meta.join(' · ')) + '</p>' : '') +
      '<p class="school-spot-action">Tu línea: <strong>' + esc(actionLabel) + '</strong></p>' +
      lineDecisionsHtml(decision.decisions) +
      (teach ? '<p class="school-spot-teach">' + esc(teach) + '</p>' : '') +
      '</div>';
    if (actions) {
      var nextLabel = remaining > 0 ? 'Siguiente spot »' : 'Ver resultado »';
      actions.className = 'actions';
      actions.innerHTML =
        '<button type="button" class="btn btn-primary" id="school-next-spot">' + nextLabel + '</button>' +
        '<button type="button" class="btn btn-ghost" id="school-abort-spot">Salir de la lección</button>';
      var next = document.getElementById('school-next-spot');
      var abort = document.getElementById('school-abort-spot');
      if (next) {
        next.addEventListener('click', function () {
          startSpotAt(s.index + 1);
        });
      }
      if (abort) {
        abort.addEventListener('click', function () {
          abandonSession(true);
        });
      }
    }
  }

  function finishSession() {
    var s = state.session;
    if (!s) return;
    if (s.daily) {
      finishDailySession(s);
      return;
    }
    var lesson = Data().getLesson(s.lessonId);
    var summary = recordLessonAttempt(lesson, s.results);
    if (summary.passed) ensureLessonMarkedPassed(lesson.id, summary);
    trackSchool(summary.passed ? 'lesson_complete' : 'lesson_fail', {
      lessonId: lesson.id,
      pct: summary.pct,
      passed: summary.passed,
      gold: summary.gold
    });
    s.active = false;
    state.session = null;
    updateSchoolBanner();
    state.view = VIEW.result;
    state.lessonId = lesson.id;
    state.lastResult = { lesson: lesson, summary: summary, results: s.results.slice() };
    if (typeof global.goToTab === 'function') global.goToTab('school');
  }

  function finishDailySession(s) {
    var ok = !!(s.results && s.results.length && s.results[0].quizCorrect);
    var ds = global.PTSchoolDailySpot && global.PTSchoolDailySpot.completeDaily
      ? global.PTSchoolDailySpot.completeDaily(null, s.results)
      : null;
    trackSchool('daily_spot_finish', {
      correct: ok,
      streak: ds && ds.streak,
      spotId: s.results[0] && s.results[0].spotId
    });
    s.active = false;
    state.session = null;
    updateSchoolBanner();
    state.view = VIEW.hub;
    state.lastDailyResult = {
      correct: ok,
      streak: ds && ds.streak,
      xpGain: ok ? (global.PTSchoolDailySpot && global.PTSchoolDailySpot.DAILY_XP) || 15 : 0,
      teachBack: s.results[0] && s.results[0].teachBack
    };
    if (typeof global.goToTab === 'function') global.goToTab('home');
    var homeHost = typeof document !== 'undefined' ? document.getElementById('home-daily-spot') : null;
    if (homeHost) {
      setTimeout(function () { renderHomeDailySpot(homeHost); }, 0);
    }
  }

  function renderHomeDailySpot(host) {
    if (!host) return;
    var DS = global.PTSchoolDailySpot;
    if (!DS || !DS.buildHomeCardHtml || !schoolMenuVisible()) {
      host.innerHTML = '';
      return;
    }
    var html = DS.buildHomeCardHtml();
    if (!html) {
      host.innerHTML = '';
      return;
    }
    if (state.lastDailyResult) {
      var dr = state.lastDailyResult;
      html =
        '<div class="school-daily-flash card-box ' + (dr.correct ? 'is-good' : 'is-bad') + '">' +
        '<p><strong>' + (dr.correct
          ? ('¡Spot del día acertado! +' + (dr.xpGain || 0) + ' XP · Racha ' + (dr.streak || 0))
          : ('Spot del día fallado. Racha ' + (dr.streak || 0) + '. Vuelve mañana.')) + '</strong></p>' +
        (dr.teachBack ? '<p class="muted-text">' + esc(dr.teachBack) + '</p>' : '') +
        '</div>' + html;
      state.lastDailyResult = null;
    }
    host.innerHTML = html;
    wireDailyPlayButton(host);
    ensureDailyPlayBinding(host);
    if (DS.mountHome) {
      try {
        DS.mountHome(host);
      } catch (eDailyHome) { /* ignore */ }
    }
  }

  function mountDailyDrillNow() {
    var root = typeof document !== 'undefined' ? document.getElementById('school-content') : null;
    if (!root) return false;
    if (state.view === VIEW.matrix && state.session && state.session.active) {
      if (state.pendingMatrixSpot || (state.session.spots && state.session.spots.length)) {
        mountPendingMatrixDrill();
        return true;
      }
    }
    render(root);
    return true;
  }

  function startDailySession() {
    var DS = global.PTSchoolDailySpot;
    if (!DS || !DS.pickDailySpot) return { ok: false, reason: 'missing' };
    var today = DS.dayKey();
    var ds = DS.readDailyState();
    if (ds.lastDay === today && ds.completed) return { ok: false, reason: 'done' };
    var spot = DS.pickDailySpot(today);
    if (!spot) return { ok: false, reason: 'empty' };
    trackSchool('daily_spot_start', { spotId: spot.id, kind: spot.kind });
    state.session = {
      active: true,
      daily: true,
      lessonId: '__daily__',
      lessonTitle: 'Spot del día',
      decisionEnd: true,
      spots: [spot],
      index: 0,
      spotDecided: false,
      results: []
    };
    state.view = VIEW.matrix;
    state.pendingMatrixSpot = spot;
    updateSchoolBanner();
    if (typeof global.goToTab === 'function') global.goToTab('school');
    mountDailyDrillNow();
    if (typeof setTimeout === 'function') {
      setTimeout(mountDailyDrillNow, 0);
      setTimeout(mountDailyDrillNow, 120);
    }
    return { ok: true, spot: spot };
  }

  function wireDailyPlayButton(host) {
    if (!host) return;
    var btn = host.querySelector('[data-school-daily-play]');
    if (!btn) return;
    btn.onclick = function (e) {
      if (e && e.preventDefault) e.preventDefault();
      if (typeof global.ptPlayDailySpot === 'function') global.ptPlayDailySpot(btn);
    };
  }

  function showDailyPlayFlash(root, reason) {
    if (!root) return;
    var DS = global.PTSchoolDailySpot;
    var msg = DS && DS.dailyPlayFeedback
      ? DS.dailyPlayFeedback(reason)
      : 'No se pudo iniciar el spot del día.';
    var card = root.querySelector('.school-daily');
    if (!card) return;
    var el = card.querySelector('.school-daily-msg');
    if (!el) {
      el = document.createElement('p');
      el.className = 'school-daily-msg muted-text';
      el.setAttribute('role', 'status');
      var actions = card.querySelector('.school-daily-actions');
      if (actions) actions.appendChild(el);
      else card.appendChild(el);
    }
    el.textContent = msg;
  }

  function ensureDailyPlayBinding(root) {
    if (!root || root._ptDailyPlayBound || typeof root.addEventListener !== 'function') return;
    root._ptDailyPlayBound = true;
    root.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-school-daily-play]') : null;
      if (!btn || !root.contains(btn)) return;
      e.preventDefault();
      if (btn.disabled) {
        showDailyPlayFlash(root, 'done');
        return;
      }
      var res = startDailySession();
      if (res && !res.ok) showDailyPlayFlash(root, res.reason);
    });
  }

  function startLessonSession(lessonId) {
    var data = Data();
    var lesson = data && data.getLesson(lessonId);
    if (!lesson) return { ok: false, reason: 'missing' };
    var gate = canPlayLesson(lessonId);
    if (!gate.ok) {
      trackSchool('lesson_blocked_plan', { lessonId: lessonId, reason: gate.reason });
      var host = typeof document !== 'undefined' ? document.getElementById('school-content') : null;
      if (host) showSchoolGateMessage(host, gate);
      if (gate.upgrade) openUpgrade(gate.reason);
      return gate;
    }
    trackSchool('lesson_start', { lessonId: lesson.id, module: lesson.module, plan: lesson.plan });
    if (!lesson.spots || !lesson.spots.length) {
      var summary = completeTheoryLesson(lesson);
      trackSchool('lesson_complete', { lessonId: lesson.id, pct: summary.pct, passed: summary.passed });
      state.view = VIEW.result;
      state.lessonId = lesson.id;
      state.lastResult = { lesson: lesson, summary: summary, results: [] };
      var hostTheory = typeof document !== 'undefined' ? document.getElementById('school-content') : null;
      if (hostTheory) render(hostTheory);
      return { ok: true, lesson: lesson, theory: true };
    }
    state.session = {
      active: true,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      decisionEnd: lesson.decisionEnd !== false,
      timedSeconds: lesson.timedSeconds || null,
      spots: lesson.spots.slice(),
      index: 0,
      spotDecided: false,
      results: []
    };
    startSpotAt(0);
    return { ok: true, lesson: lesson };
  }

  function closeSchoolHand(hand, decision, reason) {
    hand.stage = 'complete';
    hand._finishHandled = true;
    hand.result = {
      reason: reason || 'Escuela de Póker · spot evaluado',
      heroNet: 0,
      totalEvLoss: (decision && decision.evLoss) || 0,
      school: true,
      handScore: decision && decision.class === 'optima' ? 10
        : (decision && decision.class === 'aceptable' ? 7 : 3)
    };
    try {
      if (Store() && Store().saveHand) Store().saveHand(hand);
    } catch (e) { /* ignore */ }
  }

  function revealQuizVillain(hand, spot) {
    var quiz = spot && spot.villainQuiz;
    var cards = quiz && quiz.answerCards ? quiz.answerCards.slice() : null;
    if (!cards || cards.length < 2 || !hand) return;
    var vPos = (hand.villain && hand.villain.pos)
      || (spot.forceDeal && spot.forceDeal.villainPos)
      || null;
    if (hand.villain) hand.villain.cards = cards.slice();
    if (hand.table && hand.table.holeCards && vPos) {
      hand.table.holeCards[vPos] = cards.slice();
    }
    if (hand.forceDeal) hand.forceDeal.villainCards = cards.slice();
    if (hand.result) hand.result.showdown = true;
  }

  /** Mezcla opciones del quiz para que la correcta no quede siempre en 3ª. */
  function shuffleQuizOptions(options) {
    var arr = (options || []).slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function showVillainQuiz(hand, decision, spot) {
    var s = state.session;
    var fb = document.getElementById('feedback');
    var actions = document.getElementById('actions');
    if (!fb || !s || !spot || !spot.villainQuiz) return;
    var quiz = spot.villainQuiz;
    var prompt = quiz.prompt || '¿Qué crees que tiene el villano?';
    var options = shuffleQuizOptions(quiz.options || []);
    var optsHtml = options.map(function (opt, idx) {
      var id = opt.id || ('opt-' + idx);
      return '<button type="button" class="school-quiz-option" data-quiz-opt="' + esc(id) + '"' +
        ' aria-label="' + esc(opt.label || formatCards(opt.cards)) + '">' +
        '<span class="school-quiz-option-cards">' + cardsHtml(opt.cards) + '</span>' +
        '</button>';
    }).join('');
    fb.classList.remove('hidden');
    fb.innerHTML =
      '<div class="school-spot-feedback school-villain-quiz">' +
      '<h3>Spot ' + (s.index + 1) + ' / ' + s.spots.length + ' · ¿Qué tiene?</h3>' +
      '<p class="school-quiz-prompt">' + esc(prompt) + '</p>' +
      '<p class="school-quiz-hint">Lee los tamaños de apuesta en la línea: confirman o descartan cada mano.</p>' +
      '<div class="school-quiz-options">' + optsHtml + '</div>' +
      '</div>';
    if (actions) {
      actions.className = 'actions';
      actions.innerHTML =
        '<button type="button" class="btn btn-ghost" id="school-abort-spot">Salir de la lección</button>';
      var abort = document.getElementById('school-abort-spot');
      if (abort) {
        abort.addEventListener('click', function () {
          abandonSession(true);
        });
      }
    }
    Array.prototype.forEach.call(fb.querySelectorAll('[data-quiz-opt]'), function (btn) {
      btn.addEventListener('click', function () {
        gradeVillainQuiz(hand, decision, spot, btn.getAttribute('data-quiz-opt'));
      });
    });
  }

  function gradeVillainQuiz(hand, decision, spot, optionId) {
    var s = state.session;
    if (!s || !s.active || !spot || !spot.villainQuiz) return;
    var quiz = spot.villainQuiz;
    var chosen = null;
    var correct = null;
    (quiz.options || []).forEach(function (opt) {
      var id = opt.id || '';
      if (opt.correct) correct = opt;
      if (id === optionId) chosen = opt;
    });
    var ok = !!(chosen && chosen.correct);
    var cls = ok ? 'optima' : 'error';
    var elimHtml = '';
    (quiz.options || []).forEach(function (opt) {
      if (opt.correct) return;
      if (!opt.eliminated) return;
      elimHtml += '<li><strong>' + esc(opt.label || formatCards(opt.cards)) + '</strong>: ' +
        esc(opt.eliminated) + '</li>';
    });
    revealQuizVillain(hand, spot);
    s.results.push({
      spotId: spot.id,
      class: cls,
      action: 'villainQuiz',
      actionLabel: chosen ? (chosen.label || formatCards(chosen.cards)) : optionId,
      heroPos: spot.heroPos,
      heroCards: spot.forceDeal && spot.forceDeal.heroCards
        ? spot.forceDeal.heroCards.slice()
        : null,
      board: (hand && hand.board && hand.board.length)
        ? hand.board.slice()
        : (spot.forceDeal && spot.forceDeal.board ? spot.forceDeal.board.slice() : null),
      teachBack: quiz.teachBack || spot.teachBack || '',
      reason: ok ? 'Mano coherente con la línea' : 'Esa mano no sobrevive a la línea',
      trapTag: spot.trapTag,
      quizCorrect: ok,
      quizAnswer: correct ? (correct.label || formatCards(correct.cards)) : ''
    });

    var fb = document.getElementById('feedback');
    var actions = document.getElementById('actions');
    var remaining = s.spots.length - s.index - 1;
    var answerCards = quiz.answerCards || (correct && correct.cards) || [];
    if (fb) {
      fb.classList.remove('hidden');
      fb.innerHTML =
        '<div class="school-spot-feedback ' + (ok ? 'is-good' : 'is-bad') + '">' +
        '<h3>Spot ' + (s.index + 1) + ' / ' + s.spots.length + ' · ' + esc(classLabel(cls)) + '</h3>' +
        '<p class="school-quiz-reveal">Villano tenía: <span class="school-quiz-reveal-cards">' +
        cardsHtml(answerCards) + '</span> <strong>' +
        esc((correct && correct.label) || formatCards(answerCards)) + '</strong></p>' +
        '<p class="school-spot-action">Tu elección: <strong>' +
        esc(chosen ? (chosen.label || formatCards(chosen.cards)) : '—') + '</strong></p>' +
        (elimHtml
          ? '<div class="school-quiz-elim"><p>Manos descartadas por la línea:</p><ul>' +
            elimHtml + '</ul></div>'
          : '') +
        ((quiz.teachBack || spot.teachBack)
          ? '<p class="school-spot-teach">' + esc(quiz.teachBack || spot.teachBack) + '</p>'
          : '') +
        (global.PTSchoolShare && global.PTSchoolShare.buildLineQuizShareHtml
          ? global.PTSchoolShare.buildLineQuizShareHtml()
          : '') +
        '</div>';
      if (global.PTSchoolShare && global.PTSchoolShare.mountLineQuizShare) {
        try {
          var lesson = Data() && Data().getLesson(s.lessonId);
          var shareRoot = fb.querySelector('.school-share-line-quiz');
          var shareOpts = (quiz.options || []).map(function (opt) {
            return { cards: (opt.cards || []).slice() };
          });
          global.PTSchoolShare.mountLineQuizShare(shareRoot, {
            lessonId: s.lessonId,
            lessonTitle: (lesson && lesson.title) || s.lessonId || '',
            prompt: quiz.prompt || '¿Qué crees que tiene el villano?',
            lineStory: spot.lineStory || [],
            board: (hand && hand.board && hand.board.length)
              ? hand.board.slice()
              : (spot.forceDeal && spot.forceDeal.board ? spot.forceDeal.board.slice() : []),
            heroPos: spot.heroPos || '',
            heroCards: spot.forceDeal && spot.forceDeal.heroCards
              ? spot.forceDeal.heroCards.slice()
              : [],
            villainPos: spot.villainPos ||
              (spot.forceDeal && spot.forceDeal.villainPos) || '',
            options: shareOpts
          });
        } catch (eShareQuiz) { /* ignore */ }
      }
    }
    if (actions) {
      var nextLabel = remaining > 0 ? 'Siguiente spot »' : 'Ver resultado »';
      actions.className = 'actions';
      actions.innerHTML =
        '<button type="button" class="btn btn-primary" id="school-next-spot">' + nextLabel + '</button>' +
        '<button type="button" class="btn btn-ghost" id="school-abort-spot">Salir de la lección</button>';
      var next = document.getElementById('school-next-spot');
      var abort = document.getElementById('school-abort-spot');
      if (next) {
        next.addEventListener('click', function () {
          startSpotAt(s.index + 1);
        });
      }
      if (abort) {
        abort.addEventListener('click', function () {
          abandonSession(true);
        });
      }
    }
    try {
      if (typeof global.renderTable === 'function') global.renderTable();
    } catch (e2) { /* ignore */ }
  }

  /**
   * Hook desde app.onAction: corta la mano tras la 1ª decisión evaluada.
   * Spots con villainQuiz: tras la decisión de river, pregunta antes de revelar.
   * @returns {boolean} true si la Escuela maneja el resto del flujo
   */
  function afterTrainerAction(hand, decision) {
    var s = state.session;
    if (!s || !s.active || !s.decisionEnd) return false;
    if (s.spotDecided) return false;
    if (!decision) return false;
    s.spotDecided = true;
    var spot = s.spots[s.index];

    if (spot && spot.villainQuiz) {
      closeSchoolHand(hand, decision, 'Escuela de Póker · quiz de rango');
      showVillainQuiz(hand, decision, spot);
      return true;
    }

    s.results.push({
      spotId: spot && spot.id,
      class: decision.class,
      action: decision.action || decision.id,
      actionLabel: decision.label || decision.action || decision.id,
      heroPos: spot && spot.heroPos,
      heroCards: spot && spot.forceDeal && spot.forceDeal.heroCards
        ? spot.forceDeal.heroCards.slice()
        : null,
      board: (hand && hand.board && hand.board.length)
        ? hand.board.slice()
        : (spot && spot.forceDeal && spot.forceDeal.board
          ? spot.forceDeal.board.slice()
          : null),
      teachBack: (spot && spot.teachBack) || decision.reason || '',
      reason: decision.reason || '',
      trapTag: spot && spot.trapTag
    });

    closeSchoolHand(hand, decision, 'Escuela de Póker · spot evaluado');
    showSpotFeedback(decision, spot, hand);
    return true;
  }

  /**
   * Lección con decisionEnd=false: se juega la mano entera y se evalúa la línea
   * (p. ej. check-call vs check-raise en flop, turn y river).
   * @returns {boolean} true si la Escuela maneja el feedback
   */
  function afterHandFinished(hand) {
    var s = state.session;
    if (!s || !s.active) return false;
    if (s.decisionEnd) return false;
    if (s.spotDecided) return false;
    s.spotDecided = true;
    var spot = s.spots[s.index];
    var decisions = (hand && hand.decisions) || [];
    var cls = worstDecisionClass(decisions);
    var kind = lineKindFromDecisions(decisions);
    var label = formatLineActions(decisions);
    s.results.push({
      spotId: spot && spot.id,
      class: cls,
      action: kind || (decisions.length ? (decisions[0].action || decisions[0].id) : ''),
      actionLabel: kind ? (kind + ' · ' + label) : label,
      heroPos: spot && spot.heroPos,
      heroCards: spot && spot.forceDeal && spot.forceDeal.heroCards
        ? spot.forceDeal.heroCards.slice()
        : null,
      board: (hand && hand.board && hand.board.length)
        ? hand.board.slice()
        : (spot && spot.forceDeal && spot.forceDeal.board
          ? spot.forceDeal.board.slice()
          : null),
      teachBack: (spot && spot.teachBack) || '',
      reason: (hand && hand.result && hand.result.reason) || '',
      trapTag: spot && spot.trapTag,
      lineKind: kind,
      decisions: decisions.map(function (d) {
        return {
          street: d.street,
          class: d.class,
          action: d.action || d.id,
          label: d.label
        };
      })
    });
    showSpotFeedback({
      class: cls,
      label: label,
      lineKind: kind,
      decisions: decisions,
      reason: (spot && spot.teachBack) || ''
    }, spot, hand);
    return true;
  }

  /* ---------- UI ---------- */

  function routeProgress(routeId) {
    var list = Data().lessonsForRoute(routeId);
    var passed = 0;
    var gold = 0;
    list.forEach(function (l) {
      var p = lessonProgress(l.id);
      if (p && p.passed) passed += 1;
      if (p && p.gold) gold += 1;
    });
    return { total: list.length, passed: passed, gold: gold };
  }

  function nodeState(lesson) {
    var p = lessonProgress(lesson.id);
    if (p && p.passed) return 'done';
    if (!isLessonUnlocked(lesson.id)) return 'locked';
    var need = lessonPlanRank(lesson);
    var have = planRank(entitlementsPlan());
    if (have < need) return 'plan';
    return 'open';
  }

  function planBadge(plan) {
    if (plan === 'coach') return '<span class="school-plan-badge school-plan-coach">Coach</span>';
    if (plan === 'study') return '<span class="school-plan-badge school-plan-study">Study</span>';
    return '<span class="school-plan-badge school-plan-free">Gratis</span>';
  }

  var ROUTE_HERO = {
    cash: {
      eyebrow: 'Cash · Ruta principal',
      title: 'Escuela de Póker',
      lead: 'Fundamentos → preflop → postflop → Pro Coach. Gates de plan activos. Las lecciones no gastan el cupo diario del entrenador.'
    },
    spin: {
      eyebrow: 'Spins · Ruta torneo corto',
      title: 'Ruta Spins',
      lead: 'ICM, steal, push/fold y heads-up. M0 completo en Gratis; Study desde M1; Pro en Coach.'
    },
    mtt: {
      eyebrow: 'MTT · Ruta torneos',
      title: 'Ruta Torneos',
      lead: 'Early game, mid, short stack y burbuja. M0 completo en Gratis; Study desde M1; burbuja/FT en Coach.'
    },
    ranges: {
      eyebrow: 'Rangos · Laboratorio',
      title: 'Laboratorio de rangos',
      lead: 'M0 gratis: bases. M1 Study: blockers, pot odds y línea. M2–M4: range advantage + ¿qué tiene? (mixto + faroles).'
    },
    mttlab: {
      eyebrow: 'MTT LAB · Comunidad',
      title: 'Escuela MTT LAB',
      lead: 'Ocho módulos MTT: fundamentos, rivales, formatos, estudio, grind, mentalidad y transiciones. Todas las lecciones abiertas desde el inicio.'
    }
  };

  var MODULE_COPY = {
    cash: {
      M0: { title: 'M0 · Fundamentos Cash (Gratis)', lead: 'Desbloqueo lineal.' },
      M1: { title: 'M1 · Preflop core (Study)', lead: 'Defensa BB, 3-bet, squeeze, iso.' },
      M2: { title: 'M2 · Postflop core (Study)', lead: 'Textura, c-bet, F/C/R, pot odds y defensa.' },
      M4: { title: 'M4 · Pro Cash (Coach)', lead: '4-bet, SRP OOP, explotación y examen Pro.' }
    },
    spin: {
      M0: { title: 'M0 · Intro Spins (Gratis)', lead: 'Lobbies, steal, defensa y examen.' },
      M1: { title: 'M1 · Short stack (Study)', lead: 'Iso, shove y charts.' },
      M2: { title: 'M2 · ICM / HU (Study–Coach)', lead: 'Payout, pressure y heads-up.' },
      M3: { title: 'M3 · Pro Spins (Coach)', lead: 'Explotación y examen Pro.' }
    },
    mtt: {
      M0: { title: 'M0 · Early MTT (Gratis)', lead: 'Fases, paciencia y examen early.' },
      M1: { title: 'M1 · Mid / steal', lead: 'Steal, 3-bet y resteal.' },
      M2: { title: 'M2 · Short stack', lead: 'Push/fold antes de la burbuja.' },
      M3: { title: 'M3 · Antes de burbuja', lead: 'Ajuste de stack y presión.' },
      M4: { title: 'M4 · Burbuja / FT (Coach)', lead: 'ICM, roles y mesa final.' }
    },
    ranges: {
      M0: { title: 'M0 · Bases de rangos (Gratis)', lead: 'Matriz, RFI BTN y % que conecta.' },
      M1: { title: 'M1 · Lectura y frecuencias (Study)', lead: 'Blockers, pot odds, línea completa y node frequencies.' },
      M2: { title: 'M2 · ¿Qué tiene? Lectura (Study)', lead: 'Range advantage, quiz mixto y faroles por línea.' },
      M3: { title: 'M3 · ¿Qué tiene? Polar (Coach)', lead: 'Range advantage en 3BP, polar, draws fallidos y faroles difíciles.' },
      M4: { title: 'M4 · ¿Qué tiene? Avanzada (Coach)', lead: 'Range advantage límite, boats y faroles disfrazados de thin.' }
    },
    mttlab: (function () {
      var src = global.PT_MTTLAB_MODULE_COPY || {};
      var out = {};
      Object.keys(src).forEach(function (k) {
        out[k] = {
          title: (src[k].title || k),
          lead: src[k].blurb || ''
        };
      });
      return out;
    })()
  };

  function renderHub(root) {
    var data = Data();
    var school = readSchool();
    var lv = levelFromXp(school.xp);
    var routes = (data && data.ROUTES) || [];
    var pack = global.PTCommunity && global.PTCommunity.schoolPack
      ? global.PTCommunity.schoolPack()
      : 'pokerforge';
    if (pack === 'mttlab') {
      routes = routes.filter(function (r) { return r.id === 'mttlab'; });
      if (!state.route || state.route !== 'mttlab') state.route = 'mttlab';
    } else {
      routes = routes.filter(function (r) { return r.id !== 'mttlab'; });
    }
    var routeId = state.route || (pack === 'mttlab' ? 'mttlab' : 'cash');
    var hero = ROUTE_HERO[routeId] || ROUTE_HERO.cash;
    var rp = routeProgress(routeId);
    var routePct = rp.total > 0 ? Math.min(100, Math.round((rp.passed / rp.total) * 100)) : 0;
    var routeTabs = routes.map(function (r) {
      var active = r.id === routeId ? ' is-active' : '';
      var soon = r.status === 'soon' ? ' is-soon' : '';
      var title = r.status === 'soon' ? (r.teaser || 'Próximamente') : '';
      return '<button type="button" class="school-route-tab' + active + soon + '" data-school-route="' + esc(r.id) + '"' +
        (r.status !== 'active' ? ' disabled title="' + esc(title) + '"' : '') + '>' +
        esc(r.label) + (r.status === 'soon' ? ' <span class="school-soon">Pronto</span>' : '') +
        '</button>';
    }).join('');

    var soonTeasers = routes.filter(function (r) { return r.status === 'soon' && r.teaser; }).map(function (r) {
      return '<li><strong>' + esc(r.label) + ':</strong> ' + esc(r.teaser) + '</li>';
    }).join('');

    function renderModuleNodes(modLessons, startIdx) {
      return modLessons.map(function (l, i) {
        var st = nodeState(l);
        var p = lessonProgress(l.id);
        var pctVal = resolveBestPct(p);
        var pctHtml = p && p.passed && pctVal != null
          ? '<span class="school-node-pct">' + esc(String(pctVal)) + '%</span>'
          : '';
        var stars = '';
        if (p && p.passed) {
          stars = '<span class="school-stars" aria-label="maestría">' +
            (p.perfect ? '★★★' : (p.gold ? '★★☆' : '★☆☆')) + '</span>';
        }
        var lock = '';
        if (st === 'locked') lock = '<span class="school-node-lock" aria-hidden="true">Bloqueada</span>';
        if (st === 'plan') lock = '<span class="school-node-lock school-node-plan" aria-hidden="true">' +
          planLabelFor(l.plan) + '</span>';
        return '<button type="button" class="school-node is-' + st + '" data-school-lesson="' + esc(l.id) + '"' +
          (st === 'locked' ? ' disabled title="Completa la lección anterior."' : '') + '>' +
          '<span class="school-node-idx">' + (startIdx + i + 1) + '</span>' +
          '<span class="school-node-body">' +
          '<span class="school-node-title">' + esc(l.title) + '</span>' +
          '<span class="school-node-meta">' + planBadge(l.plan) + ' · ' + (l.hands || 0) + ' manos · +' + (l.xp || 0) + ' XP</span>' +
          '</span>' +
          pctHtml + stars + lock +
          '</button>';
      }).join('');
    }

    var modules = typeof data.modulesInRoute === 'function'
      ? data.modulesInRoute(routeId)
      : [];
    var modCopy = MODULE_COPY[routeId] || {};
    var idx = 0;
    var sections = modules.map(function (modId) {
      var modLessons = typeof data.lessonsForModule === 'function'
        ? data.lessonsForModule(routeId, modId)
        : data.lessonsForRoute(routeId).filter(function (l) { return l.module === modId; });
      var passed = 0;
      modLessons.forEach(function (l) { if (isLessonPassed(l.id)) passed += 1; });
      var copy = modCopy[modId] || { title: modId, lead: '' };
      var html = '<section class="school-map card-box">' +
        '<h3 class="school-map-title">' + esc(copy.title) + '</h3>' +
        '<p class="muted-text school-map-lead">' + passed + '/' + modLessons.length +
        (copy.lead ? ' · ' + esc(copy.lead) : '') + '</p>' +
        '<div class="school-nodes">' + renderModuleNodes(modLessons, idx) + '</div></section>';
      idx += modLessons.length;
      return html;
    }).join('');

    root.innerHTML =
      '<div class="school-page">' +
      '<header class="school-hero">' +
      '<p class="school-eyebrow">' + esc(hero.eyebrow) + ' ' + schoolLangBadgeHtml() + '</p>' +
      '<h2 class="school-title">' + esc(hero.title) + '</h2>' +
      '<p class="school-lead">' + esc(hero.lead) + '</p>' +
      '<p class="school-lang-note muted-text">Contenido pedagógico en español.</p>' +
      '<div class="school-hero-stats">' +
      '<div class="school-stat"><span class="school-stat-val">Nv. ' + lv.level + '</span><span class="school-stat-lbl">Nivel Escuela</span></div>' +
      '<div class="school-stat"><span class="school-stat-val">' + lv.xp + '</span><span class="school-stat-lbl">XP</span></div>' +
      '<div class="school-stat"><span class="school-stat-val">' + rp.passed + '/' + rp.total + '</span><span class="school-stat-lbl">Ruta</span></div>' +
      '<div class="school-stat"><span class="school-stat-val">' + rp.gold + '</span><span class="school-stat-lbl">Oro</span></div>' +
      '</div>' +
      '<div class="school-xp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      routePct + '" aria-label="Progreso de la ruta">' +
      '<div class="school-xp-fill school-xp-fill-anim" style="width:' + routePct + '%"></div></div>' +
      (global.PTSchoolShare && global.PTSchoolShare.buildHubPanelHtml
        ? global.PTSchoolShare.buildHubPanelHtml()
        : '') +
      '</header>' +
      '<div class="school-routes" role="tablist">' + routeTabs + '</div>' +
      (soonTeasers
        ? '<div class="muted-text school-route-teasers">Próximas rutas:<ul class="school-teaser-list">' + soonTeasers + '</ul></div>'
        : '') +
      (sections || '<p class="muted-text">No hay lecciones en esta ruta.</p>') +
      '</div>';

    var hubShare = root.querySelector('.school-share-hub');
    if (hubShare && global.PTSchoolShare && global.PTSchoolShare.mountHubSharePanel) {
      try {
        global.PTSchoolShare.mountHubSharePanel(hubShare, {
          eyebrow: hero.eyebrow,
          title: hero.title,
          lead: hero.lead,
          level: lv.level,
          xp: lv.xp,
          routePassed: rp.passed,
          routeTotal: rp.total,
          gold: rp.gold,
          xpPct: Math.min(100, Math.round((lv.into / lv.per) * 100)),
          routeId: routeId
        });
      } catch (eHub) { /* ignore */ }
    }
    root.querySelectorAll('[data-school-route]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-school-route');
        var route = routes.find(function (r) { return r.id === id; });
        if (!id || !route || route.status !== 'active') return;
        state.route = id;
        render(root);
      });
    });
    root.querySelectorAll('[data-school-lesson]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-school-lesson');
        var gate = canPlayLesson(id);
        if (!gate.ok) {
          if (gate.upgrade) openUpgrade(gate.reason);
          return;
        }
        state.view = VIEW.lesson;
        state.lessonId = id;
        render(root);
      });
    });
  }

  function renderLesson(root) {
    var lesson = Data().getLesson(state.lessonId);
    if (!lesson) {
      state.view = VIEW.hub;
      renderHub(root);
      return;
    }
    var p = lessonProgress(lesson.id);
    var theory = (lesson.theory || []).map(function (t) {
      if (t && typeof t === 'object') {
        var title = t.title ? '<strong class="school-theory-title">' + esc(t.title) + '</strong>' : '';
        var body = esc(t.body || t.text || '');
        return '<li>' + title + (title ? ' ' : '') + body + '</li>';
      }
      return '<li>' + esc(t) + '</li>';
    }).join('');
    var examples = (lesson.examples || []).map(function (ex) {
      return '<div class="school-example"><div class="school-example-label">' + esc(ex.title) + '</div>' +
        '<p>' + esc(ex.body) + '</p></div>';
    }).join('');
    var asks = (lesson.aiQuestions || []).map(function (q) {
      return '<button type="button" class="school-ask-chip" data-school-ask="' + esc(q) + '">' + esc(q) + '</button>';
    }).join('');
    var cta = !lesson.spots || !lesson.spots.length
      ? 'Completar lección'
      : (p && p.passed ? 'Repetir sesión (' + lesson.hands + ' manos)' : 'Empezar sesión (' + lesson.hands + ' manos)');

    var openRangesBtn = '';
    if (lesson.openRanges || lesson.route === 'ranges') {
      openRangesBtn = '<button type="button" class="btn btn-ghost" id="school-open-ranges">Abrir chart</button>';
    }
    var related = '';
    if (lesson.relatedLessons && lesson.relatedLessons.length) {
      related = '<section class="card-box school-section school-related">' +
        '<h3>Relacionado</h3><div class="school-related-links">' +
        lesson.relatedLessons.map(function (rl) {
          return '<button type="button" class="btn btn-ghost school-related-btn" data-school-goto-lesson="' +
            esc(rl.id) + '">' + esc(rl.label || rl.id) + '</button>';
        }).join('') +
        '</div></section>';
    }
    var externalLinksHtml = '';
    if (lesson.externalLinks && lesson.externalLinks.length) {
      externalLinksHtml = '<section class="card-box school-section">' +
        '<h3>Enlaces y vídeos</h3><ul class="school-external-links">' +
        lesson.externalLinks.map(function (link) {
          var href = esc(link.url || link.href || '#');
          var label = esc(link.label || link.title || link.url || 'Abrir');
          return '<li><a href="' + href + '" target="_blank" rel="noopener noreferrer">' + label + '</a></li>';
        }).join('') +
        '</ul></section>';
    }
    var previewHost = '';
    if (lesson.matrixPreview) {
      previewHost = '<section class="card-box school-section" id="school-matrix-preview-host">' +
        '<h3>Vista previa de matriz</h3>' +
        '<p class="muted-text">Chart de referencia (cash 6-max). Usa «Abrir chart» para el explorer completo.</p>' +
        '<div class="school-matrix-preview-mount"></div></section>';
    }

    root.innerHTML =
      '<div class="school-page school-lesson-page">' +
      '<button type="button" class="btn btn-ghost school-back" id="school-back-hub">« Volver al mapa</button>' +
      '<header class="school-lesson-header">' +
      '<p class="school-eyebrow">' + esc(lesson.id) + ' · ' + esc(lesson.module || 'M0') + ' · ' +
      esc((Data().ROUTES.find(function (r) { return r.id === lesson.route; }) || { label: lesson.route || 'Cash' }).label) +
      ' ' + planBadge(lesson.plan) + ' ' + schoolLangBadgeHtml() + '</p>' +
      '<h2 class="school-title">' + esc(lesson.title) + '</h2>' +
      '<p class="school-lead">' + esc(lesson.concept) + '</p>' +
      (p && p.passed
        ? '<p class="school-best">Mejor marca: <strong>' + esc(String(resolveBestPct(p) != null ? resolveBestPct(p) : '—')) + '%</strong> · ' +
          (p.perfect ? '100 %' : (p.gold ? 'Oro' : 'Aprobada')) +
          ' · ' + (p.attempts || 1) + ' intento(s)</p>'
        : '<p class="muted-text">Umbral aprobar: ' + Math.round((lesson.passThreshold || 0.7) * 100) +
          '% · Oro: ' + Math.round((lesson.goldThreshold || 0.9) * 100) + '%</p>') +
      '</header>' +
      '<section class="card-box school-section">' +
      '<h3>Concepto</h3><ul class="school-theory">' + theory + '</ul></section>' +
      externalLinksHtml +
      '<section class="card-box school-section"><h3>Ejemplos</h3>' + examples + '</section>' +
      previewHost +
      related +
      '<section class="card-box school-section">' +
      '<h3>ForgeCoach</h3>' +
      '<p class="muted-text">Preguntas sugeridas (consumen cuota de IA del plan).</p>' +
      '<div class="school-ask-chips">' + asks + '</div>' +
      '<div id="school-coach-mount" class="school-coach-mount"></div>' +
      '</section>' +
      '<div class="school-lesson-cta">' +
      '<button type="button" class="btn btn-primary" id="school-start-lesson">' + esc(cta) + '</button>' +
      openRangesBtn +
      '</div></div>';

    var back = document.getElementById('school-back-hub');
    if (back) {
      back.addEventListener('click', function () {
        state.view = VIEW.hub;
        render(root);
      });
    }
    var start = document.getElementById('school-start-lesson');
    if (start) {
      start.addEventListener('click', function () {
        startLessonSession(lesson.id);
      });
    }
    var openBtn = document.getElementById('school-open-ranges');
    if (openBtn) {
      openBtn.addEventListener('click', function () {
        openRangesFromLesson(lesson);
      });
    }
    root.querySelectorAll('[data-school-goto-lesson]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lid = btn.getAttribute('data-school-goto-lesson');
        if (lid) openLesson(lid);
      });
    });
    if (lesson.matrixPreview) {
      var mount = root.querySelector('.school-matrix-preview-mount');
      var MX = global.PTSchoolMatrixDrills;
      if (mount && MX && MX.previewHtml) {
        mount.innerHTML = MX.previewHtml(lesson.matrixPreview.position || 'BTN');
      }
    }
    mountCoach(root, lesson);
    bindAskChips(root);
  }

  function bindAskChips(root) {
    root.querySelectorAll('[data-school-ask]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var q = btn.getAttribute('data-school-ask') || '';
        var mount = root.querySelector('#school-coach-mount');
        if (!mount) return;
        var input = mount.querySelector('[data-ai-question-input]');
        var form = mount.querySelector('[data-ai-question-form]');
        var toggle = mount.querySelector('[data-ai-question-toggle]');
        if (form && form.hidden && toggle) toggle.click();
        if (input) {
          input.value = q;
          input.dispatchEvent(new Event('input'));
          input.focus();
        }
      });
    });
  }

  function mountCoach(root, lesson) {
    var host = root.querySelector('#school-coach-mount');
    if (!host || !global.PTAIReport || !global.PTAIReport.mount) return;
    host.innerHTML = '';
    global.PTAIReport.mount(host, {
      scope: 'learn',
      hideReport: true,
      openQuestionForm: true,
      questionToggleLabel: 'Preguntar al ForgeCoach',
      getData: function () {
        return {
          school: true,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          concept: lesson.concept,
          beginner: true
        };
      },
      persist: { kind: 'learn', lessonId: lesson.id }
    });
  }

  /** Tip breve tipo coach al cerrar la sesión (Fase F). */
  function schoolCoachTip(lesson, passed, fails) {
    if (!lesson) return '';
    if (passed && lesson.exam) return 'Examen superado. El módulo queda marcado y puedes seguir al siguiente.';
    if (passed) {
      if (lesson.module === 'M2') return 'Buen trabajo postflop. En mesa real, nombra la textura antes del sizing.';
      if (lesson.module === 'M1') return 'Preflop sólido. Posición y stack definen el tamaño; no copies ciegas de torneo.';
      return 'Lección superada. Siguiente nodo del mapa cuando quieras.';
    }
    var blob = (fails || []).map(function (f) {
      return String(f.reason || '') + ' ' + String(f.teachBack || '') + ' ' + String(f.spotId || '');
    }).join(' ').toLowerCase();
    if (/fold|pasaste|pasas/.test(blob) && /call|defend|defender|overfold/.test(blob + ' ' + (lesson.id || '') + ' ' + (lesson.title || '').toLowerCase())) {
      return 'Estás foldeando de más en spots de defensa. Revisa pot odds y si tienes equity realization.';
    }
    if (/3-?bet|squeeze|raise/.test(blob) && /spew|fancy|value|bluff|polar/.test(blob)) {
      return 'Revisa tu mix value/bluff: el sizing debe corresponder al plan (negar equity vs value-heavy).';
    }
    if (/c-?bet|barrel|flop|textura|wet|seco/.test(blob) || lesson.module === 'M2') {
      return 'En postflop, nombra la textura antes de actuar: ¿quién tiene más nut advantage? Luego bet o check.';
    }
    if (lesson.exam) return 'Repasa las lecciones del módulo y vuelve al examen con calma.';
    return 'Revisa los fallos abajo, lee otra vez el teach-back y reintenta la lección.';
  }

  function renderResult(root) {
    var pack = state.lastResult;
    if (!pack || !pack.lesson) {
      state.view = VIEW.hub;
      renderHub(root);
      return;
    }
    var lesson = pack.lesson;
    var sum = pack.summary;
    var nextId = Data().nextLessonId(lesson.id);
    var next = nextId ? Data().getLesson(nextId) : null;
    var ringCls = sum.passed ? 'is-pass' : 'is-fail';
    var fails = (pack.results || []).filter(function (r) {
      return r.class === 'error' || r.class === 'imprecisa';
    });
    var tip = schoolCoachTip(lesson, sum.passed, fails);
    var bestHist = resolveBestPct(sum);
    if (bestHist == null && sum.pct != null && isFinite(Number(sum.pct))) bestHist = Number(sum.pct);

    root.innerHTML =
      '<div class="school-page school-result-page">' +
      '<header class="school-result-hero ' + ringCls + '">' +
      '<p class="school-eyebrow">' + esc(lesson.id) + '</p>' +
      '<h2 class="school-title">' + (sum.passed ? 'Lección superada' : 'Casi — sigue practicando') + '</h2>' +
      '<div class="school-ring" aria-label="porcentaje">' +
      '<span class="school-ring-pct">' + esc(String(sum.pct != null ? sum.pct : '—')) + '%</span>' +
      '<span class="school-ring-lbl">acierto</span></div>' +
      '<p class="school-result-meta">Umbral ' + Math.round(sum.threshold * 100) +
      '% · Mejor histórica ' + esc(String(bestHist != null ? bestHist : '—')) + '%' +
      (sum.xpGain ? ' · <strong>+' + sum.xpGain + ' XP</strong>' : '') + '</p>' +
      (sum.gold ? '<p class="school-gold-tag">Marca oro</p>' : '') +
      (sum.perfect ? '<p class="school-gold-tag">¡100 %!</p>' : '') +
      '</header>' +
      (tip
        ? '<div class="school-coach-note card-box"><span class="school-coach-label">Coach</span><p>' + esc(tip) + '</p></div>'
        : '') +
      (fails.length
        ? '<section class="card-box"><h3>Spots a repasar</h3><ul class="school-fail-list">' +
          fails.map(formatFailSpotHtml).join('') + '</ul></section>'
        : '') +
      (global.PTSchoolShare && global.PTSchoolShare.buildPanelHtml
        ? global.PTSchoolShare.buildPanelHtml(lesson, sum)
        : '') +
      '<div class="school-result-actions">' +
      '<button type="button" class="btn btn-primary" id="school-retry">Repetir lección</button>' +
      (sum.passed && next
        ? '<button type="button" class="btn btn-primary" id="school-next-lesson">Siguiente: ' + esc(next.title) + '</button>'
        : '') +
      '<button type="button" class="btn btn-ghost" id="school-to-map">Volver al mapa</button>' +
      '</div></div>';

    document.getElementById('school-retry').addEventListener('click', function () {
      startLessonSession(lesson.id);
    });
    var nextBtn = document.getElementById('school-next-lesson');
    if (nextBtn && next) {
      nextBtn.addEventListener('click', function () {
        if (sum.passed) ensureLessonMarkedPassed(lesson.id, sum);
        var gate = canPlayLesson(next.id);
        /* Si acabamos de aprobar, no bloquear por «locked»: el overlay + backup
         * ya marcan la lección actual; el muro de plan sí se respeta. */
        if (!gate.ok && gate.reason === 'locked' && sum.passed) {
          rememberPassed(lesson.id, sum);
          gate = canPlayLesson(next.id);
        }
        if (!gate.ok && gate.reason === 'locked' && sum.passed) {
          state.view = VIEW.lesson;
          state.lessonId = next.id;
          render(root);
          return;
        }
        if (!gate.ok) {
          showSchoolGateMessage(root, gate);
          if (gate.upgrade) openUpgrade(gate.reason);
          return;
        }
        state.view = VIEW.lesson;
        state.lessonId = next.id;
        render(root);
      });
    }
    document.getElementById('school-to-map').addEventListener('click', function () {
      if (sum.passed) ensureLessonMarkedPassed(lesson.id, sum);
      state.view = VIEW.hub;
      render(root);
    });
    var shareRoot = root.querySelector('.school-share');
    if (shareRoot && global.PTSchoolShare && global.PTSchoolShare.mountSharePanel) {
      try {
        global.PTSchoolShare.mountSharePanel(shareRoot, lesson, sum);
        trackSchool('lesson_share_panel', {
          lessonId: lesson.id,
          passed: !!sum.passed,
          gold: !!sum.gold,
          exam: !!lesson.exam
        });
      } catch (eShare) { /* ignore */ }
    }
  }

  /** Deep-link desde Leaks / reportes → lección (solo si el menú Escuela es visible). */
  function openLesson(lessonId) {
    if (!schoolMenuVisible() || !lessonId) return false;
    var data = Data();
    var lesson = data && data.getLesson(lessonId);
    if (!lesson) return false;
    try { delete global.__ptPendingSchoolLesson; } catch (e) { /* ignore */ }
    state.route = lesson.route || 'cash';
    state.view = VIEW.lesson;
    state.lessonId = lesson.id;
    state.session = null;
    if (typeof global.goToTab === 'function') global.goToTab('school');
    else {
      var host = typeof document !== 'undefined' ? document.getElementById('school-content') : null;
      if (host) render(host);
    }
    return true;
  }

  function consumePendingLesson() {
    var pending = global.__ptPendingSchoolLesson;
    if (!pending) return;
    try { delete global.__ptPendingSchoolLesson; } catch (e) { /* ignore */ }
    var lesson = Data() && Data().getLesson(pending);
    if (!lesson) return;
    state.route = lesson.route || 'cash';
    state.view = VIEW.lesson;
    state.lessonId = lesson.id;
  }

  /** Tras sync nube: refresca el hub sin pisar una lección o spot en curso. */
  function refreshFromCloud() {
    if (isSessionActive()) return;
    if (state.view !== VIEW.hub) return;
    var root = typeof document !== 'undefined' ? document.getElementById('school-content') : null;
    if (root) render(root);
  }

  function render(container) {
    var root = container || document.getElementById('school-content');
    if (!root) return;
    if (!schoolMenuVisible()) {
      root.innerHTML = '<div class="school-page"><p class="muted-text">Escuela de Póker está en pruebas (solo administración).</p></div>';
      return;
    }
    if (!Data()) {
      root.innerHTML = '<div class="school-page"><p class="muted-text">Cargando currículum…</p></div>';
      return;
    }
    consumePendingLesson();
    if (state.view === VIEW.lesson) renderLesson(root);
    else if (state.view === VIEW.result) renderResult(root);
    else if (state.view === VIEW.matrix && state.session && state.session.active) {
      mountPendingMatrixDrill();
    } else renderHub(root);
  }

  function ensureBannerEl() {
    var play = document.getElementById('tab-play');
    if (!play || document.getElementById('school-play-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'school-play-banner';
    banner.className = 'school-play-banner hidden';
    var active = document.getElementById('play-active');
    if (active && active.parentNode) active.parentNode.insertBefore(banner, active);
    else play.insertBefore(banner, play.firstChild);
  }

  if (typeof global.addEventListener === 'function') {
    global.addEventListener('pt-cloud-synced', function () {
      refreshFromCloud();
    });
  }

  global.PTSchool = {
    render: render,
    refreshFromCloud: refreshFromCloud,
    openLesson: openLesson,
    afterTrainerAction: afterTrainerAction,
    afterHandFinished: afterHandFinished,
    isSessionActive: isSessionActive,
    activeSession: activeSession,
    hasAdminAccess: hasAdminAccess,
    readSchool: readSchool,
    isLessonUnlocked: isLessonUnlocked,
    isLessonPassed: isLessonPassed,
    canPlayLesson: canPlayLesson,
    migrateSchoolProgress: migrateSchoolProgress,
    startLessonSession: startLessonSession,
    startDailySession: startDailySession,
    renderHomeDailySpot: renderHomeDailySpot,
    showDailyPlayFlash: showDailyPlayFlash,
    abandonSession: abandonSession,
    _writeSchool: writeSchool,
    ensureBannerEl: ensureBannerEl,
    formatFailSpotHtml: formatFailSpotHtml,
    formatCards: formatCards,
    schoolCoachTip: schoolCoachTip,
    schoolMenuVisible: schoolMenuVisible,
    isSchoolBetaUser: isSchoolBetaUser,
    planRank: planRank,
    entitlementsPlan: entitlementsPlan,
    trackSchool: trackSchool,
    ensureLessonMarkedPassed: ensureLessonMarkedPassed,
    resolveBestPct: resolveBestPct,
    shuffleQuizOptions: shuffleQuizOptions,
    rememberPassed: rememberPassed,
    _clearPassedOverlay: function () {
      Object.keys(passedOverlay).forEach(function (k) { delete passedOverlay[k]; });
    },
    _passedOverlay: passedOverlay,
    _state: state
  };
})(typeof window !== 'undefined' ? window : globalThis);
