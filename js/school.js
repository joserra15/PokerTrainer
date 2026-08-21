/*
 * school.js — Escuela de Póker: hub multi-ruta (Cash/Spins/MTT/Rangos), runner de spots.
 * Escuela abierta a usuarios autenticados (SCHOOL_PUBLIC=true). Fases G–J: Spins, MTT, rangos/pro, leaks→lección.
 * Las manos de lección no consumen el cupo diario del entrenador.
 */
(function (global) {
  'use strict';

  var VIEW = { hub: 'hub', lesson: 'lesson', result: 'result' };
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
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
    return !!(u && u.isAdmin);
  }

  /* ---------- Progreso (stats.school → cloud via stats) ---------- */

  /** Aprobados en esta sesión de página (sobrevive si localStorage/sync pierden el write). */
  var passedOverlay = Object.create(null);

  function defaultSchool() {
    return { xp: 0, lessons: {}, updatedAt: 0, version: 2 };
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
    return 'pt_school_backup_v1' + (uid ? '_' + uid : '');
  }

  function readSchoolBackup() {
    try {
      if (typeof localStorage === 'undefined') return null;
      var raw = localStorage.getItem(schoolBackupKey());
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
      localStorage.setItem(schoolBackupKey(), JSON.stringify({
        xp: Number(school.xp) || 0,
        lessons: cloneLessonsMap(school.lessons),
        updatedAt: Date.now(),
        version: Number(school.version) || 2
      }));
      return true;
    } catch (e) {
      return false;
    }
  }

  function cloneLessonsMap(lessons) {
    var src = lessons && typeof lessons === 'object' ? lessons : {};
    var out = {};
    Object.keys(src).forEach(function (id) {
      var row = src[id];
      if (!row || typeof row !== 'object') return;
      out[id] = {
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
    });
    return out;
  }

  function mergeLessonProgressRows(a, b) {
    if (!a) return b ? Object.assign({}, b) : null;
    if (!b) return Object.assign({}, a);
    var bestScore = Math.max(Number(a.bestScore) || 0, Number(b.bestScore) || 0);
    return {
      bestScore: bestScore,
      bestPct: Math.round(bestScore * 1000) / 10,
      attempts: Math.max(Number(a.attempts) || 0, Number(b.attempts) || 0),
      passed: !!(a.passed || b.passed),
      gold: !!(a.gold || b.gold),
      perfect: !!(a.perfect || b.perfect),
      lastScore: (a.updatedAt || '') >= (b.updatedAt || '') ? a.lastScore : b.lastScore,
      lastPct: (a.updatedAt || '') >= (b.updatedAt || '') ? a.lastPct : b.lastPct,
      updatedAt: (a.updatedAt || '') >= (b.updatedAt || '') ? a.updatedAt : b.updatedAt
    };
  }

  function mergeSchoolObjects(a, b) {
    if (!a) return b ? {
      xp: Number(b.xp) || 0,
      lessons: cloneLessonsMap(b.lessons),
      updatedAt: Number(b.updatedAt) || 0,
      version: Number(b.version) || 2
    } : defaultSchool();
    if (!b) return {
      xp: Number(a.xp) || 0,
      lessons: cloneLessonsMap(a.lessons),
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
    return {
      xp: Math.max(Number(a.xp) || 0, Number(b.xp) || 0),
      lessons: lessons,
      updatedAt: Math.max(Number(a.updatedAt) || 0, Number(b.updatedAt) || 0),
      version: Math.max(Number(a.version) || 1, Number(b.version) || 1)
    };
  }

  function readSchool() {
    var st = Store() && Store().getStats ? Store().getStats() : null;
    var school = (st && st.school) ? st.school : null;
    var fromStats = null;
    if (school && typeof school === 'object') {
      fromStats = migrateSchoolProgress({
        xp: Number(school.xp) || 0,
        lessons: cloneLessonsMap(school.lessons),
        updatedAt: Number(school.updatedAt) || 0,
        version: Number(school.version) || 1
      });
      if (fromStats._migrated) {
        delete fromStats._migrated;
        writeSchool(fromStats);
      }
    }
    var fromBackup = readSchoolBackup();
    var merged = mergeSchoolObjects(fromStats, fromBackup);
    Object.keys(passedOverlay).forEach(function (id) {
      if (!passedOverlay[id]) return;
      var prev = merged.lessons[id] || {};
      merged.lessons[id] = Object.assign({}, prev, { passed: true });
    });
    return {
      xp: Number(merged.xp) || 0,
      lessons: merged.lessons || {},
      updatedAt: Number(merged.updatedAt) || 0,
      version: Number(merged.version) || 2
    };
  }

  function writeSchool(school) {
    var S = Store();
    if (!S || !S.getStats || !S.persistStats) {
      writeSchoolBackup(school);
      return false;
    }
    var payload = {
      xp: Number(school.xp) || 0,
      lessons: cloneLessonsMap(school.lessons),
      updatedAt: Date.now(),
      version: Number(school.version) || 2
    };
    var st = S.getStats();
    st.school = payload;
    S.persistStats(st);
    writeSchoolBackup(payload);
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
    if (summary && summary.passed) passedOverlay[lessonId] = true;
    if (!summary || !summary.passed) return isLessonPassed(lessonId);
    var school = readSchool();
    var prev = school.lessons[lessonId] || {};
    school.lessons[lessonId] = {
      bestScore: prev.bestScore != null ? prev.bestScore : summary.score,
      bestPct: prev.bestPct != null ? prev.bestPct : summary.pct,
      attempts: Math.max(Number(prev.attempts) || 0, 1),
      passed: true,
      gold: !!(prev.gold || summary.gold),
      perfect: !!(prev.perfect || summary.perfect),
      lastScore: summary.score != null ? summary.score : prev.lastScore,
      lastPct: summary.pct != null ? summary.pct : prev.lastPct,
      updatedAt: new Date().toISOString()
    };
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

  function userEmail() {
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
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
    if (SCHOOL_PUBLIC) return !!(global.PTAuth && global.PTAuth.getUser && global.PTAuth.getUser());
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

  function formatLineStoryHtml(story) {
    if (!story || !story.length) return '';
    var items = story.map(function (row) {
      return '<li><span class="school-line-street">' + esc(row.street || '') + '</span> ' +
        esc(row.text || '') + '</li>';
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
    var force = spotToForce(s.spots[index]);
    if (typeof global.playAnalysisHand === 'function') {
      var lesson = Data() && Data().getLesson(s.lessonId);
      global.playAnalysisHand(force, schoolPlayConfig(s.spots[index], lesson));
    }
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

  function showVillainQuiz(hand, decision, spot) {
    var s = state.session;
    var fb = document.getElementById('feedback');
    var actions = document.getElementById('actions');
    if (!fb || !s || !spot || !spot.villainQuiz) return;
    var quiz = spot.villainQuiz;
    var prompt = quiz.prompt || '¿Qué crees que tiene el villano?';
    var optsHtml = (quiz.options || []).map(function (opt, idx) {
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
      '<p class="school-quiz-hint">Elige la mano que sobrevive a la línea. Las otras dos ya deberían estar descartadas.</p>' +
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
      lead: 'M0 gratis: bases. M1 Study: blockers y línea. M2–M4: ¿qué tiene? (mixto + lecciones de faroles por actuación).'
    }
  };

  var MODULE_COPY = {
    cash: {
      M0: { title: 'M0 · Fundamentos Cash (Gratis)', lead: 'Desbloqueo lineal.' },
      M1: { title: 'M1 · Preflop core (Study)', lead: 'Defensa BB, 3-bet, squeeze, iso.' },
      M2: { title: 'M2 · Postflop core (Study)', lead: 'Textura, c-bet, defensa, barrels.' },
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
      M1: { title: 'M1 · Lectura y frecuencias (Study)', lead: 'Blockers, línea completa y node frequencies.' },
      M2: { title: 'M2 · ¿Qué tiene? Lectura (Study)', lead: 'Quiz mixto + faroles por línea al cierre del bloque.' },
      M3: { title: 'M3 · ¿Qué tiene? Polar (Coach)', lead: 'Polar, draws fallidos y faroles difíciles.' },
      M4: { title: 'M4 · ¿Qué tiene? Sutil (Coach)', lead: 'Sutileza, boats y faroles disfrazados de thin.' }
    }
  };

  function renderHub(root) {
    var data = Data();
    var school = readSchool();
    var lv = levelFromXp(school.xp);
    var routes = (data && data.ROUTES) || [];
    var routeId = state.route || 'cash';
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
        var pctHtml = p && p.passed
          ? '<span class="school-node-pct">' + esc(String(p.bestPct)) + '%</span>'
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
      '<p class="school-eyebrow">' + esc(hero.eyebrow) + '</p>' +
      '<h2 class="school-title">' + esc(hero.title) + '</h2>' +
      '<p class="school-lead">' + esc(hero.lead) + '</p>' +
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

    root.innerHTML =
      '<div class="school-page school-lesson-page">' +
      '<button type="button" class="btn btn-ghost school-back" id="school-back-hub">« Volver al mapa</button>' +
      '<header class="school-lesson-header">' +
      '<p class="school-eyebrow">' + esc(lesson.id) + ' · ' + esc(lesson.module || 'M0') + ' · ' +
      esc((Data().ROUTES.find(function (r) { return r.id === lesson.route; }) || { label: lesson.route || 'Cash' }).label) +
      ' ' + planBadge(lesson.plan) + '</p>' +
      '<h2 class="school-title">' + esc(lesson.title) + '</h2>' +
      '<p class="school-lead">' + esc(lesson.concept) + '</p>' +
      (p && p.passed
        ? '<p class="school-best">Mejor marca: <strong>' + esc(String(p.bestPct)) + '%</strong> · ' +
          (p.perfect ? '100 %' : (p.gold ? 'Oro' : 'Aprobada')) +
          ' · ' + (p.attempts || 1) + ' intento(s)</p>'
        : '<p class="muted-text">Umbral aprobar: ' + Math.round((lesson.passThreshold || 0.7) * 100) +
          '% · Oro: ' + Math.round((lesson.goldThreshold || 0.9) * 100) + '%</p>') +
      '</header>' +
      '<section class="card-box school-section">' +
      '<h3>Concepto</h3><ul class="school-theory">' + theory + '</ul></section>' +
      '<section class="card-box school-section"><h3>Ejemplos</h3>' + examples + '</section>' +
      '<section class="card-box school-section">' +
      '<h3>ForgeCoach</h3>' +
      '<p class="muted-text">Preguntas sugeridas (consumen cuota de IA del plan).</p>' +
      '<div class="school-ask-chips">' + asks + '</div>' +
      '<div id="school-coach-mount" class="school-coach-mount"></div>' +
      '</section>' +
      '<div class="school-lesson-cta">' +
      '<button type="button" class="btn btn-primary" id="school-start-lesson">' + esc(cta) + '</button>' +
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

    root.innerHTML =
      '<div class="school-page school-result-page">' +
      '<header class="school-result-hero ' + ringCls + '">' +
      '<p class="school-eyebrow">' + esc(lesson.id) + '</p>' +
      '<h2 class="school-title">' + (sum.passed ? 'Lección superada' : 'Casi — sigue practicando') + '</h2>' +
      '<div class="school-ring" aria-label="porcentaje">' +
      '<span class="school-ring-pct">' + esc(String(sum.pct)) + '%</span>' +
      '<span class="school-ring-lbl">acierto</span></div>' +
      '<p class="school-result-meta">Umbral ' + Math.round(sum.threshold * 100) +
      '% · Mejor histórica ' + esc(String(sum.bestPct)) + '%' +
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
          passedOverlay[lesson.id] = true;
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
    else renderHub(root);
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
    abandonSession: abandonSession,
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
    _clearPassedOverlay: function () {
      Object.keys(passedOverlay).forEach(function (k) { delete passedOverlay[k]; });
    },
    _passedOverlay: passedOverlay,
    _state: state
  };
})(typeof window !== 'undefined' ? window : globalThis);
