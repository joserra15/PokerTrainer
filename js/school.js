/*
 * school.js — Escuela de Póker: hub, lecciones M0, runner de spots fijos.
 * Visible solo para admin (Fases A–C). Las manos consumen cupo Free del trainer.
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

  function readSchool() {
    var st = Store() && Store().getStats ? Store().getStats() : null;
    var school = (st && st.school) ? st.school : null;
    if (!school || typeof school !== 'object') return defaultSchool();
    var migrated = migrateSchoolProgress({
      xp: Number(school.xp) || 0,
      lessons: school.lessons && typeof school.lessons === 'object' ? school.lessons : {},
      updatedAt: Number(school.updatedAt) || 0,
      version: Number(school.version) || 1
    });
    if (migrated._migrated) {
      delete migrated._migrated;
      writeSchool(migrated);
    }
    return {
      xp: Number(migrated.xp) || 0,
      lessons: migrated.lessons || {},
      updatedAt: Number(migrated.updatedAt) || 0,
      version: Number(migrated.version) || 2
    };
  }

  function writeSchool(school) {
    var S = Store();
    if (!S || !S.getStats || !S.persistStats) return;
    var st = S.getStats();
    st.school = {
      xp: Number(school.xp) || 0,
      lessons: school.lessons || {},
      updatedAt: Date.now(),
      version: Number(school.version) || 2
    };
    S.persistStats(st);
    if (global.PTCloud) {
      if (global.PTCloud.markLocalDirty) global.PTCloud.markLocalDirty(['stats']);
      if (global.PTCloud.schedulePush) global.PTCloud.schedulePush(['stats']);
    }
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
   * Gate de contenido (preparado para Fase D).
   * Hoy: admin-only UI + desbloqueo lineal. En D se añadirá Study/Coach.
   */
  function canPlayLesson(lessonId) {
    if (!hasAdminAccess()) {
      return { ok: false, reason: 'admin_only', message: 'Escuela en pruebas (solo administración).' };
    }
    var lesson = Data() && Data().getLesson(lessonId);
    if (!lesson) return { ok: false, reason: 'missing', message: 'Lección no encontrada.' };
    if (!isLessonUnlocked(lessonId)) {
      return { ok: false, reason: 'locked', message: 'Completa la lección anterior.' };
    }
    // Fase D: comprobar lesson.plan vs entitlements (free/study/coach).
    return { ok: true, lesson: lesson };
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

    return {
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
  }

  function completeTheoryLesson(lesson) {
    return recordLessonAttempt(lesson, []);
  }

  /* ---------- Sesión de spots ---------- */

  function schoolPlayConfig() {
    return {
      scenario: 'rfi',
      practiceStreet: 'preflop',
      handRange: 'all',
      villainLevel: 'fish',
      formatHub: 'cash',
      gameType: 'cash6',
      liveAdvisor: false,
      handsTarget: 0,
      schoolMode: true,
      schoolDecisionEnd: true
    };
  }

  function spotToForce(spot) {
    return {
      type: spot.type || 'RFI',
      heroPos: spot.heroPos,
      seed: spot.seed,
      forceDeal: {
        heroCards: (spot.forceDeal && spot.forceDeal.heroCards) || spot.heroCards,
        villainCards: (spot.forceDeal && spot.forceDeal.villainCards) || null,
        board: (spot.forceDeal && spot.forceDeal.board) || [],
        villainPos: (spot.forceDeal && spot.forceDeal.villainPos) || 'BB'
      }
    };
  }

  function activeSession() {
    return state.session;
  }

  function isSessionActive() {
    return !!(state.session && state.session.active);
  }

  function updateSchoolBanner() {
    var el = document.getElementById('school-play-banner');
    if (!el) return;
    if (!isSessionActive()) {
      el.classList.add('hidden');
      el.innerHTML = '';
      return;
    }
    var s = state.session;
    var n = s.spots.length;
    var i = Math.min(s.index + 1, n);
    el.classList.remove('hidden');
    el.innerHTML =
      '<div class="school-play-banner-inner">' +
      '<span class="school-play-banner-label">Escuela · ' + esc(s.lessonTitle) + '</span>' +
      '<span class="school-play-banner-progress">Spot ' + i + ' / ' + n + '</span>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="school-exit-session">Salir</button>' +
      '</div>';
    var btn = document.getElementById('school-exit-session');
    if (btn) {
      btn.addEventListener('click', function () {
        abandonSession(true);
      });
    }
  }

  function abandonSession(goHub) {
    if (state.session) state.session.active = false;
    state.session = null;
    updateSchoolBanner();
    var fb = document.getElementById('feedback');
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
      global.playAnalysisHand(force, schoolPlayConfig());
    }
  }

  function classLabel(cls) {
    if (cls === 'optima') return 'Óptima';
    if (cls === 'aceptable') return 'Aceptable';
    if (cls === 'imprecisa') return 'Imprecisa';
    if (cls === 'error') return 'Error';
    return cls || '—';
  }

  function showSpotFeedback(decision, spot) {
    var s = state.session;
    var fb = document.getElementById('feedback');
    var actions = document.getElementById('actions');
    if (!fb || !s) return;
    var good = decision.class === 'optima' || decision.class === 'aceptable';
    var teach = (spot && spot.teachBack) || decision.reason || '';
    var remaining = s.spots.length - s.index - 1;
    fb.classList.remove('hidden');
    fb.innerHTML =
      '<div class="school-spot-feedback ' + (good ? 'is-good' : 'is-bad') + '">' +
      '<h3>Spot ' + (s.index + 1) + ' / ' + s.spots.length + ' · ' + esc(classLabel(decision.class)) + '</h3>' +
      '<p class="school-spot-action">Tu acción: <strong>' + esc(decision.label || decision.action || decision.id || '—') + '</strong></p>' +
      (teach ? '<p class="school-spot-teach">' + esc(teach) + '</p>' : '') +
      (spot && spot.trapTag && spot.trapTag !== 'none'
        ? '<p class="muted-text">Trampa: ' + esc(spot.trapTag) + '</p>'
        : '') +
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
    if (!lesson) return;
    var gate = canPlayLesson(lessonId);
    if (!gate.ok) return;
    if (!lesson.spots || !lesson.spots.length) {
      var summary = completeTheoryLesson(lesson);
      state.view = VIEW.result;
      state.lessonId = lesson.id;
      state.lastResult = { lesson: lesson, summary: summary, results: [] };
      var host = typeof document !== 'undefined' ? document.getElementById('school-content') : null;
      if (host) render(host);
      return;
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
  }

  /**
   * Hook desde app.onAction: corta la mano tras la 1ª decisión evaluada.
   * @returns {boolean} true si la Escuela maneja el resto del flujo
   */
  function afterTrainerAction(hand, decision) {
    var s = state.session;
    if (!s || !s.active || !s.decisionEnd) return false;
    if (s.spotDecided) return false;
    if (!decision) return false;
    s.spotDecided = true;
    var spot = s.spots[s.index];
    s.results.push({
      spotId: spot && spot.id,
      class: decision.class,
      action: decision.action || decision.id,
      actionLabel: decision.label || decision.action || decision.id,
      trapTag: spot && spot.trapTag
    });

    hand.stage = 'complete';
    hand._finishHandled = true;
    hand.result = {
      reason: 'Escuela de Póker · spot evaluado',
      heroNet: 0,
      totalEvLoss: decision.evLoss || 0,
      school: true,
      handScore: decision.class === 'optima' ? 10 : (decision.class === 'aceptable' ? 7 : 3)
    };
    try {
      if (Store() && Store().saveHand) Store().saveHand(hand);
    } catch (e) { /* ignore */ }

    showSpotFeedback(decision, spot);
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
    if (isLessonUnlocked(lesson.id)) return 'open';
    return 'locked';
  }

  function planBadge(plan) {
    if (plan === 'coach') return '<span class="school-plan-badge school-plan-coach">Coach</span>';
    if (plan === 'study') return '<span class="school-plan-badge school-plan-study">Study</span>';
    return '<span class="school-plan-badge school-plan-free">Gratis</span>';
  }

  function renderHub(root) {
    var data = Data();
    var school = readSchool();
    var lv = levelFromXp(school.xp);
    var routes = (data && data.ROUTES) || [];
    var lessons = data.lessonsForRoute(state.route);
    var rp = routeProgress(state.route);
    var m0 = data.m0Lessons ? data.m0Lessons() : lessons.filter(function (l) { return l.module === 'M0'; });
    var m0Passed = 0;
    m0.forEach(function (l) { if (isLessonPassed(l.id)) m0Passed += 1; });
    var m0Pct = m0.length ? Math.round((m0Passed / m0.length) * 100) : 0;

    var routeTabs = routes.map(function (r) {
      var active = r.id === state.route ? ' is-active' : '';
      var soon = r.status === 'soon' ? ' is-soon' : '';
      var title = r.status === 'soon' ? (r.teaser || 'Próximamente') : '';
      return '<button type="button" class="school-route-tab' + active + soon + '" data-school-route="' + esc(r.id) + '"' +
        (r.status === 'soon' ? ' disabled title="' + esc(title) + '"' : '') + '>' +
        esc(r.label) + (r.status === 'soon' ? ' <span class="school-soon">Pronto</span>' : '') +
        '</button>';
    }).join('');

    var soonTeasers = routes.filter(function (r) { return r.status === 'soon' && r.teaser; }).map(function (r) {
      return '<li><strong>' + esc(r.label) + ':</strong> ' + esc(r.teaser) + '</li>';
    }).join('');

    var nodes = lessons.map(function (l, idx) {
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
      var lock = st === 'locked' ? '<span class="school-node-lock" aria-hidden="true">Bloqueada</span>' : '';
      return '<button type="button" class="school-node is-' + st + '" data-school-lesson="' + esc(l.id) + '"' +
        (st === 'locked' ? ' disabled' : '') + '>' +
        '<span class="school-node-idx">' + (idx + 1) + '</span>' +
        '<span class="school-node-body">' +
        '<span class="school-node-title">' + esc(l.title) + '</span>' +
        '<span class="school-node-meta">' + planBadge(l.plan) + ' · ' + (l.hands || 0) + ' manos · +' + (l.xp || 0) + ' XP</span>' +
        '</span>' +
        pctHtml + stars + lock +
        '</button>';
    }).join('');

    root.innerHTML =
      '<div class="school-page">' +
      '<header class="school-hero">' +
      '<p class="school-eyebrow">Admin · M0 v2 · Preparado para Fase D</p>' +
      '<h2 class="school-title">Escuela de Póker</h2>' +
      '<p class="school-lead">Módulo M0 Cash completo en Gratis (7 lecciones). Spots fijos, desbloqueo lineal. Las manos consumen el cupo Free del entrenador.</p>' +
      '<div class="school-hero-stats">' +
      '<div class="school-stat"><span class="school-stat-val">Nv. ' + lv.level + '</span><span class="school-stat-lbl">Nivel Escuela</span></div>' +
      '<div class="school-stat"><span class="school-stat-val">' + lv.xp + '</span><span class="school-stat-lbl">XP</span></div>' +
      '<div class="school-stat"><span class="school-stat-val">' + m0Passed + '/' + m0.length + '</span><span class="school-stat-lbl">M0 Cash</span></div>' +
      '<div class="school-stat"><span class="school-stat-val">' + rp.gold + '</span><span class="school-stat-lbl">Oro</span></div>' +
      '</div>' +
      '<div class="school-xp-bar" aria-hidden="true"><div class="school-xp-fill" style="width:' +
      Math.min(100, Math.round((lv.into / lv.per) * 100)) + '%"></div></div>' +
      '<p class="muted-text school-m0-progress">Progreso M0: ' + m0Passed + ' de ' + m0.length +
      ' lecciones (' + m0Pct + '%)</p>' +
      '</header>' +
      '<div class="school-routes" role="tablist">' + routeTabs + '</div>' +
      (soonTeasers
        ? '<div class="muted-text school-route-teasers">Próximas rutas:<ul class="school-teaser-list">' + soonTeasers + '</ul></div>'
        : '') +
      '<section class="school-map card-box">' +
      '<h3 class="school-map-title">Módulo M0 · Fundamentos Cash (Gratis)</h3>' +
      '<p class="muted-text school-map-lead">7 lecciones de simple a examen. Completa en orden. Tras M0, Study abre el preflop completo (Fase E).</p>' +
      '<div class="school-nodes">' + nodes + '</div>' +
      '</section>' +
      '</div>';

    root.querySelectorAll('[data-school-route]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-school-route');
        if (!id || id === 'spin' || id === 'mtt') return;
        state.route = id;
        render(root);
      });
    });
    root.querySelectorAll('[data-school-lesson]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-school-lesson');
        var gate = canPlayLesson(id);
        if (!gate.ok) return;
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
      '<p class="school-eyebrow">' + esc(lesson.id) + ' · M0 Cash ' + planBadge(lesson.plan) + '</p>' +
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
      '<h3>IA Coach</h3>' +
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
      questionToggleLabel: 'Preguntar al IA Coach',
      getData: function () {
        return {
          school: true,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          concept: lesson.concept,
          beginner: true
        };
      },
      persist: { kind: 'learn' }
    });
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
      (fails.length
        ? '<section class="card-box"><h3>Spots a repasar</h3><ul class="school-fail-list">' +
          fails.map(function (f) {
            return '<li>' + esc(f.spotId || 'spot') + ' · ' + esc(classLabel(f.class)) +
              (f.trapTag && f.trapTag !== 'none' ? ' · trampa ' + esc(f.trapTag) : '') + '</li>';
          }).join('') + '</ul></section>'
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
        state.view = VIEW.lesson;
        state.lessonId = next.id;
        render(root);
      });
    }
    document.getElementById('school-to-map').addEventListener('click', function () {
      state.view = VIEW.hub;
      render(root);
    });
  }

  function render(container) {
    var root = container || document.getElementById('school-content');
    if (!root) return;
    if (!hasAdminAccess()) {
      root.innerHTML = '<div class="school-page"><p class="muted-text">Escuela de Póker está en pruebas (solo administración).</p></div>';
      return;
    }
    if (!Data()) {
      root.innerHTML = '<div class="school-page"><p class="muted-text">Cargando currículum…</p></div>';
      return;
    }
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

  global.PTSchool = {
    render: render,
    afterTrainerAction: afterTrainerAction,
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
    _state: state
  };
})(typeof window !== 'undefined' ? window : globalThis);
