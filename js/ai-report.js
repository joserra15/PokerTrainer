/*
 * ai-report.js — IA Coach: mano, sesión, preguntas concretas y caché.
 */
(function (global) {
  'use strict';

  const CONSENT_KEY = 'pt_ai_consent_v1';
  const CACHE_PREFIX = 'pt_ai_coach_v1_';
  const QUESTION_MAX = 500;

  const SCOPE_UI = {
    hand: {
      reportBtn: 'Informe de la mano',
      questionLabel: 'Tu pregunta sobre esta mano',
      questionPh: 'Ej.: ¿Debí foldear el turn con este sizing?',
      loadingReport: 'Generando informe de la mano…',
      loadingQuestion: 'Analizando tu pregunta…',
      reportKind: 'Informe',
      consent: 'los datos de esta mano (cartas, acciones y análisis GTO)'
    },
    sessionGlobal: {
      reportBtn: 'Informe de la sesión',
      questionLabel: 'Tu pregunta sobre esta sesión',
      questionPh: 'Ej.: ¿En qué calle perdí más EV? ¿Fue mala suerte o errores?',
      loadingReport: 'Generando informe de la sesión…',
      loadingQuestion: 'Analizando tu pregunta sobre la sesión…',
      reportKind: 'Informe de sesión',
      consent: 'las estadísticas y manos de esta sesión (sin datos personales)'
    }
  };

  function cfg() {
    return global.PT_AI || {};
  }

  function anonKey() {
    const c = cfg();
    return c.supabaseAnonKey || (global.PT_SUPABASE && global.PT_SUPABASE.anonKey) || c.token;
  }

  function isEnabled() {
    const c = cfg();
    return !!(c.enabled && c.endpoint && c.token);
  }

  function hashQuestion(q) {
    let h = 0;
    const s = String(q || '').trim().toLowerCase();
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36);
  }

  function readCache(key) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeCache(key, data) {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
      return true;
    } catch (e) { return false; }
  }

  function ensureConsent(scope) {
    if (localStorage.getItem(CONSENT_KEY) === '1') return Promise.resolve(true);
    const ui = SCOPE_UI[scope] || SCOPE_UI.hand;
    return new Promise((resolve) => {
      const ok = confirm(
        'Se enviarán a un servicio de IA únicamente ' + ui.consent +
        '.\n\n¿Continuar?'
      );
      if (ok) {
        try { localStorage.setItem(CONSENT_KEY, '1'); } catch (e) { /* noop */ }
      }
      resolve(ok);
    });
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function friendlyError(raw) {
    const m = String(raw || '').toLowerCase();
    if (
      m.includes('high demand') || m.includes('overloaded') ||
      m.includes('resource exhausted') || m.includes('capacity') ||
      m.includes('503') || m.includes('unavailable')
    ) {
      return {
        kind: 'busy',
        message: 'El coach de IA está con mucha demanda ahora mismo. Espera unos segundos y vuelve a pulsar el botón.'
      };
    }
    if (m.includes('rate') || m.includes('quota') || m.includes('429')) {
      return {
        kind: 'busy',
        message: 'Has alcanzado el límite de consultas por ahora. Prueba de nuevo en unos minutos.'
      };
    }
    if (m.includes('unauthorized') || m.includes('401')) {
      return {
        kind: 'error',
        message: 'No se pudo conectar con el coach. Revisa la configuración de IA en la app.'
      };
    }
    if (m.includes('empty_response') || m.includes('gemini')) {
      return {
        kind: 'error',
        message: 'El coach no ha devuelto respuesta. Inténtalo de nuevo en un momento.'
      };
    }
    return {
      kind: 'error',
      message: 'No hemos podido obtener respuesta del coach. Comprueba tu conexión e inténtalo otra vez.'
    };
  }

  function loadingHtml(message, hint) {
    return '<div class="ai-report-loading">' +
      '<div class="play-boot-spinner" aria-hidden="true"></div>' +
      '<p class="play-boot-msg">' + escapeHtml(message) + '</p>' +
      (hint ? '<p class="muted-text play-boot-hint">' + escapeHtml(hint) + '</p>' : '') +
      '</div>';
  }

  function showError(body, raw) {
    const err = friendlyError(raw);
    const cls = err.kind === 'busy' ? 'ai-report-notice' : 'ai-report-error';
    body.innerHTML = '<div class="' + cls + '">' + escapeHtml(err.message) + '</div>';
  }

  function renderMarkdown(md) {
    let html = escapeHtml(md);
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^\*   (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (m) => '<ul>' + m + '</ul>');
    html = html.replace(/\n\n/g, '</p><p>');
    return '<div class="ai-report-body"><p>' + html + '</p></div>';
  }

  function apiMode(scope, mode) {
    if (scope === 'sessionGlobal') {
      return mode === 'question' ? 'session_question' : 'session_report';
    }
    return mode === 'question' ? 'question' : 'report';
  }

  async function fetchCoach(payload, scope, mode, question) {
    const c = cfg();
    const body = { payload: payload, mode: apiMode(scope, mode) };
    if (mode === 'question' && question) body.question = question;
    const res = await fetch(c.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + anonKey(),
        'apikey': anonKey(),
        'X-PT-AI-Token': c.token
      },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error || data.message || ('HTTP ' + res.status);
      throw new Error(msg);
    }
    return data;
  }

  function setPanelState(panel, state, message, hint) {
    const status = panel.querySelector('[data-ai-status]');
    const body = panel.querySelector('[data-ai-body]');
    const actions = panel.querySelector('[data-ai-actions]');
    if (status) status.textContent = state === 'loading' ? '' : (message || '');
    if (state === 'loading') {
      if (body) body.innerHTML = loadingHtml(message || 'Consultando IA Coach…', hint);
      if (actions) actions.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      const sendQ = panel.querySelector('[data-ai-question-send]');
      if (sendQ) sendQ.disabled = true;
    } else {
      if (actions) actions.querySelectorAll('button').forEach((b) => { b.disabled = false; });
      const sendQ = panel.querySelector('[data-ai-question-send]');
      if (sendQ) sendQ.disabled = false;
    }
  }

  function showReport(panel, report, scope) {
    const body = panel.querySelector('[data-ai-body]');
    const meta = panel.querySelector('[data-ai-meta]');
    const ui = SCOPE_UI[scope] || SCOPE_UI.hand;
    if (meta) {
      const kind = report.mode && report.mode.indexOf('question') >= 0 ? 'Pregunta' : ui.reportKind;
      let line = report.cached
        ? kind + ' en caché · ' + (report.createdAt || '')
        : kind + ' · ' + (report.model || 'IA') + (report.createdAt ? ' · ' + report.createdAt : '');
      if (report.question) line += ' · «' + report.question.slice(0, 48) + (report.question.length > 48 ? '…' : '') + '»';
      if (report.truncated) line += ' · respuesta incompleta';
      meta.textContent = line;
    }
    if (body) body.innerHTML = renderMarkdown(report.reportMarkdown || '');
    panel._currentReport = report;
  }

  function cacheKeyFor(scope, objId, mode, question) {
    const Payload = global.PTAIHandPayload;
    if (scope === 'sessionGlobal' && Payload && Payload.sessionCacheKey) {
      return Payload.sessionCacheKey(objId, mode, question);
    }
    const base = Payload ? Payload.cacheKey(objId) : String(objId);
    if (mode === 'question') return base + '_q_' + hashQuestion(question);
    return base + '_report';
  }

  function getDataObj(options) {
    if (typeof options.getData === 'function') return options.getData();
    if (typeof options.getHand === 'function') return options.getHand();
    return options.getHand || options.getData;
  }

  function getObjId(scope, obj) {
    if (!obj) return null;
    if (scope === 'sessionGlobal') return obj.id || obj.fileName || 'session';
    return obj.id;
  }

  async function runCoach(panel, options, opts) {
    const scope = resolveScope(options);
    const mode = opts.mode || 'report';
    const question = mode === 'question' ? String(opts.question || '').trim().slice(0, QUESTION_MAX) : '';
    const ui = SCOPE_UI[scope] || SCOPE_UI.hand;

    if (!isEnabled()) {
      alert('IA Coach no configurado. Copia js/ai-config.example.js como js/ai-config.js y completa endpoint y token.');
      return;
    }
    if (mode === 'question' && !question) {
      alert('Escribe una pregunta (máx. ' + QUESTION_MAX + ' caracteres).');
      return;
    }

    const dataObj = getDataObj(options);
    if (!dataObj) return;

    const Payload = global.PTAIHandPayload;
    if (!Payload) { alert('Módulo de payload no cargado.'); return; }

    const payload = Payload.build(scope, dataObj);
    if (!payload) return;

    const objId = getObjId(scope, dataObj);
    const cacheKey = cacheKeyFor(scope, objId, mode, question);
    const cached = readCache(cacheKey);
    if (cached && cached.reportMarkdown) {
      showReport(panel, Object.assign({ cached: true, mode: mode, question: question || cached.question }, cached), scope);
      return;
    }

    const ok = await ensureConsent(scope);
    if (!ok) return;

    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const loadingMsg = mode === 'question' ? ui.loadingQuestion : ui.loadingReport;
    setPanelState(panel, 'loading', loadingMsg, 'El coach está pensando la respuesta');
    try {
      const data = await fetchCoach(payload, scope, mode, question);
      const report = {
        reportMarkdown: data.reportMarkdown,
        model: data.model,
        mode: data.mode || apiMode(scope, mode),
        question: mode === 'question' ? question : undefined,
        createdAt: new Date().toISOString(),
        truncated: !!data.truncated
      };
      writeCache(cacheKey, report);
      showReport(panel, report, scope);
      setPanelState(panel, 'ready', '');
      if (mode === 'question') {
        const form = panel.querySelector('[data-ai-question-form]');
        if (form) form.hidden = true;
      }
    } catch (e) {
      setPanelState(panel, 'error', '');
      const body = panel.querySelector('[data-ai-body]');
      if (body) showError(body, e.message);
      console.error('[PTAI]', e);
    }
  }

  function bindQuestionForm(panel, options) {
    const form = panel.querySelector('[data-ai-question-form]');
    const toggleBtn = panel.querySelector('[data-ai-question-toggle]');
    const textarea = panel.querySelector('[data-ai-question-input]');
    const counter = panel.querySelector('[data-ai-question-count]');
    const cancelBtn = panel.querySelector('[data-ai-question-cancel]');
    const sendBtn = panel.querySelector('[data-ai-question-send]');
    if (!form || !textarea || !toggleBtn || !cancelBtn || !sendBtn) return;

    function updateCount() {
      const n = textarea.value.length;
      if (counter) counter.textContent = n + '/' + QUESTION_MAX;
    }

    toggleBtn.addEventListener('click', function () {
      form.hidden = !form.hidden;
      if (!form.hidden) {
        textarea.focus();
        updateCount();
      }
    });

    cancelBtn.addEventListener('click', function () {
      form.hidden = true;
    });

    textarea.addEventListener('input', updateCount);

    sendBtn.addEventListener('click', function () {
      const q = textarea.value.trim();
      if (!q) {
        alert('Escribe una pregunta.');
        return;
      }
      runCoach(panel, options, { mode: 'question', question: q }).catch(function (e) {
        console.error('[PTAI]', e);
      });
    });
  }

  function resolveScope(options) {
    if (options.scope) return options.scope;
    if (options.source === 'sessionGlobal') return 'sessionGlobal';
    if (options.source === 'session') return 'session';
    return 'hand';
  }

  function mount(container, options) {
    if (!container) return null;
    options = options || {};
    const scope = resolveScope(options);
    options.scope = scope;
    const ui = SCOPE_UI[scope] || SCOPE_UI.hand;
    const uid = 'ai-q-' + scope + '-' + Math.random().toString(36).slice(2, 8);

    container.innerHTML =
      '<div class="ai-report-panel card-box">' +
      '<div class="ai-report-head">' +
      '<h3>IA Coach</h3>' +
      '<div class="ai-report-actions" data-ai-actions>' +
      '<button type="button" class="btn btn-primary btn-sm" data-ai-report>' + escapeHtml(ui.reportBtn) + '</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-ai-question-toggle>Pregunta concreta</button>' +
      '</div></div>' +
      '<div class="ai-question-form" data-ai-question-form hidden>' +
      '<label class="ai-question-label" for="' + uid + '">' + escapeHtml(ui.questionLabel) + '</label>' +
      '<textarea id="' + uid + '" class="ai-question-input" data-ai-question-input maxlength="' + QUESTION_MAX + '" rows="3" placeholder="' + escapeHtml(ui.questionPh) + '"></textarea>' +
      '<div class="ai-question-foot">' +
      '<span class="muted-text ai-question-count" data-ai-question-count>0/' + QUESTION_MAX + '</span>' +
      '<div class="ai-question-btns">' +
      '<button type="button" class="btn btn-ghost btn-sm" data-ai-question-cancel>Cancelar</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-ai-question-send>Enviar pregunta</button>' +
      '</div></div></div>' +
      '<div class="muted-text ai-report-meta" data-ai-meta></div>' +
      '<div data-ai-status class="ai-report-status"></div>' +
      '<div data-ai-body class="ai-report-content"></div>' +
      '</div>';

    const panel = container.querySelector('.ai-report-panel');

    container.querySelector('[data-ai-report]').addEventListener('click', function () {
      runCoach(panel, options, { mode: 'report' }).catch(function (e) {
        console.error('[PTAI]', e);
        setPanelState(panel, 'error', '');
        const body = panel.querySelector('[data-ai-body]');
        if (body) showError(body, e.message);
      });
    });

    bindQuestionForm(panel, options);

    const dataObj = getDataObj(options);
    const objId = getObjId(scope, dataObj);
    if (objId) {
      const cached = readCache(cacheKeyFor(scope, objId, 'report', ''));
      if (cached && cached.reportMarkdown) showReport(panel, Object.assign({ cached: true }, cached), scope);
    }

    return panel;
  }

  function mountWelcome(container, options) {
    if (!container) return null;
    options = options || {};
    const first = options.userName || '';
    const greet = first
      ? ('¡Hola, <strong>' + escapeHtml(first) + '</strong>! Soy tu IA Coach.')
      : '¡Hola! Soy tu <strong>IA Coach</strong> de poker GTO.';
    const enabled = isEnabled();
    const statusHtml = enabled
      ? '<span class="home-coach-status on"><span class="home-coach-status-dot" aria-hidden="true"></span>Coach activo</span>'
      : '<span class="home-coach-status off"><span class="home-coach-status-dot" aria-hidden="true"></span>Configuración pendiente</span>';

    container.innerHTML =
      '<div class="home-coach-panel" role="region" aria-labelledby="home-coach-title">' +
      '<div class="home-coach-top">' +
      '<div class="home-coach-avatar" aria-hidden="true">&#129302;</div>' +
      '<div class="home-coach-intro">' +
      '<span class="home-coach-badge">Inteligencia artificial</span>' +
      '<h3 class="home-coach-title" id="home-coach-title">' + greet + '</h3>' +
      '<p class="home-coach-lead">Puedes consultarme las dudas de cualquier mano: analizo tus cartas, el board, las frecuencias GTO y el EV de cada decisión. Solo respondo con el contexto real de lo que jugaste — no invento spots.</p>' +
      statusHtml +
      '</div></div>' +
      '<div class="home-coach-steps">' +
      '<div class="home-coach-step"><span class="home-coach-step-num">1</span><h4>Informe automático</h4><p>Al terminar una mano en el entrenador, pulsa <em>Informe de la mano</em> y recibirás un análisis completo con fugas y líneas alternativas.</p></div>' +
      '<div class="home-coach-step"><span class="home-coach-step-num">2</span><h4>Pregunta concreta</h4><p>¿Dudas en un sizing o un fold? Usa <em>Pregunta concreta</em> (hasta ' + QUESTION_MAX + ' caracteres). Ej.: «¿Debí foldear el turn con este bet?»</p></div>' +
      '<div class="home-coach-step"><span class="home-coach-step-num">3</span><h4>Sesiones importadas</h4><p>En <em>Sesiones</em>, revisa manos reales paso a paso o pide un informe de toda la sesión con tus estadísticas y errores.</p></div>' +
      '</div>' +
      '<div class="home-coach-where">' +
      '<h4>Dónde encontrarme</h4>' +
      '<ul>' +
      '<li><strong>Entrenador</strong> — al finalizar cada mano, debajo del resultado.</li>' +
      '<li><strong>Sesiones</strong> — en la revisión de una mano y en el resumen de la sesión.</li>' +
      '<li><strong>Paso a paso</strong> — botón «Enviar pregunta» en cada decisión de la revisión.</li>' +
      '</ul></div>' +
      '<div class="home-coach-foot">' +
      '<p class="muted-text">Tus datos solo se envían a la IA cuando lo solicitas y tras dar tu consentimiento. Las respuestas se guardan en caché en tu navegador.</p>' +
      '<button type="button" class="btn btn-primary home-coach-cta" data-home-coach-play>Entrenar y probar el coach</button>' +
      '</div></div>';

    const playBtn = container.querySelector('[data-home-coach-play]');
    if (playBtn) {
      playBtn.addEventListener('click', function () {
        if (typeof options.onTrain === 'function') options.onTrain();
      });
    }
    return container.querySelector('.home-coach-panel');
  }

  global.PTAIReport = {
    mount, mountWelcome, isEnabled, ensureConsent, fetchCoach, readCache, QUESTION_MAX
  };
})(window);
