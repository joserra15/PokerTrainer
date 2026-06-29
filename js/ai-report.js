/*
 * ai-report.js — IA Coach: mano, sesión, preguntas concretas y caché.
 */
(function (global) {
  'use strict';

  const CONSENT_KEY = 'pt_ai_consent_v1';
  const CACHE_PREFIX = 'pt_ai_coach_v1_';
  const QUESTION_MAX = 500;
  const PRIVACY_NO_PII = 'No se envía ningún dato personal (nombre, email ni cuenta de usuario).';

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
    session: {
      reportBtn: 'Informe de esta mano',
      questionLabel: 'Tu pregunta sobre esta mano de la sesión',
      questionPh: 'Ej.: ¿El fold del river fue correcto con este board?',
      loadingReport: 'Generando informe de la mano…',
      loadingQuestion: 'Analizando tu pregunta…',
      reportKind: 'Informe',
      consent: 'los datos de esta mano importada (cartas, acciones y análisis GTO)'
    },
    sessionGlobal: {
      reportBtn: 'Informe de la sesión',
      questionLabel: 'Tu pregunta sobre esta sesión',
      questionPh: 'Ej.: ¿En qué calle perdí más EV? ¿Fue mala suerte o errores?',
      loadingReport: 'Generando informe de la sesión…',
      loadingQuestion: 'Analizando tu pregunta sobre la sesión…',
      reportKind: 'Informe de sesión',
      consent: 'las estadísticas y manos de esta sesión (cartas, acciones y análisis GTO)'
    }
  };

  function cfg() {
    return global.PT_AI || {};
  }

  function anonKey() {
    const c = cfg();
    return c.supabaseAnonKey || (global.PT_SUPABASE && global.PT_SUPABASE.anonKey) || '';
  }

  function isEnabled() {
    const c = cfg();
    return !!(c.enabled && c.endpoint);
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('es-ES', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return iso; }
  }

  function resolvePersistTarget(options, dataObj) {
    const p = options.persist;
    if (!p || !p.kind) return null;
    if (p.kind === 'history') {
      const handId = typeof p.getHandId === 'function' ? p.getHandId() : (dataObj && dataObj.id);
      return handId ? { kind: 'history', handId: handId } : null;
    }
    const sessionId = typeof p.getSessionId === 'function'
      ? p.getSessionId()
      : (dataObj && dataObj.id && p.kind === 'session' ? dataObj.id : p.sessionId);
    if (p.kind === 'session' && sessionId) return { kind: 'session', sessionId: sessionId };
    if (p.kind === 'sessionHand' && sessionId) {
      const handId = typeof p.getHandId === 'function' ? p.getHandId() : (dataObj && dataObj.id);
      return handId ? { kind: 'sessionHand', sessionId: sessionId, handId: handId } : null;
    }
    return null;
  }

  function migrateLegacyThread(target, scope, objId) {
    if (!target || !global.Store) return Promise.resolve([]);
    const thread = global.Store.getCoachThread(target);
    if (thread.length) return Promise.resolve(thread);
    const legacyReport = readCache(cacheKeyFor(scope, objId, 'report', ''));
    if (!legacyReport || !legacyReport.reportMarkdown) return Promise.resolve([]);
    const entry = {
      mode: 'report',
      reportMarkdown: legacyReport.reportMarkdown,
      model: legacyReport.model,
      createdAt: legacyReport.createdAt || new Date().toISOString(),
      truncated: !!legacyReport.truncated
    };
    return Promise.resolve(global.Store.appendCoachEntry(target, entry)).then(function (saved) {
      return saved && saved.ok && saved.thread ? saved.thread : [entry];
    });
  }

  function loadThread(options, dataObj, scope, objId) {
    const target = resolvePersistTarget(options, dataObj);
    if (target && global.Store) {
      let thread = global.Store.getCoachThread(target);
      if (!thread.length) {
        return migrateLegacyThread(target, scope, objId).then(function (migrated) {
          thread = migrated;
          if (typeof options.onThreadUpdate === 'function') options.onThreadUpdate(thread);
          return { target: target, thread: thread };
        });
      }
      if (typeof options.onThreadUpdate === 'function') options.onThreadUpdate(thread);
      return Promise.resolve({ target: target, thread: thread });
    }
    return Promise.resolve({ target: null, thread: [] });
  }

  function findInThread(thread, mode, question) {
    if (!thread || !thread.length) return null;
    if (mode === 'report') return thread.find(function (t) { return t.mode === 'report'; }) || null;
    const hq = hashQuestion(question);
    return thread.find(function (t) {
      return t.mode === 'question' && hashQuestion(t.question) === hq;
    }) || null;
  }

  async function formatQuotaLine(refresh) {
    if (!global.PTEntitlements) return '';
    const ent = refresh && global.PTEntitlements.refresh
      ? await global.PTEntitlements.refresh()
      : await global.PTEntitlements.ensureLoaded();
    if (ent.is_admin) return 'Consultas IA: ilimitadas (admin)';
    const max = ent.limits && ent.limits.ai_reports_per_month;
    const used = (ent.usage && ent.usage.ai_reports_month) || 0;
    if (max == null) return 'Consultas IA: ilimitadas';
    if (max === 0) return 'Tu plan no incluye consultas IA este mes.';
    const left = Math.max(0, max - used);
    return 'Te quedan ' + left + ' de ' + max + ' consultas IA este mes.';
  }

  function updateQuotaDisplay(panel, line) {
    const el = panel.querySelector('[data-ai-quota]');
    if (!el) return;
    if (line) {
      el.textContent = line;
      el.hidden = false;
    } else {
      el.hidden = true;
    }
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
    const iaUrl = (global.PTLegal && global.PTLegal.legalUrl)
      ? global.PTLegal.legalUrl('ia.html')
      : 'legal/ia.html';
    return new Promise((resolve) => {
      const ok = confirm(
        'Se enviarán a un servicio de IA únicamente ' + ui.consent + '.\n\n' +
        PRIVACY_NO_PII + '\n\n' +
        'Más información: ' + iaUrl + '\n\n¿Continuar?'
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

  function userFirstName(options) {
    if (options && options.userName) return String(options.userName).trim();
    const u = global.PT_AUTH_USER;
    if (!u) return '';
    const n = u.given_name || u.name || u.email || '';
    return String(n).split(/[\s@]/)[0];
  }

  function formatBB(x) {
    const n = Number(x) || 0;
    return (Math.round(n * 100) / 100).toFixed(2);
  }

  function cardsLabel(obj) {
    if (!obj) return 'tu mano';
    if (obj.heroCode) return obj.heroCode;
    const cards = obj.heroCards || (obj.hero && obj.hero.cards);
    if (cards && cards.length === 2 && global.Ranges) {
      try { return global.Ranges.handCode(cards[0], cards[1]); } catch (e) { /* noop */ }
    }
    return 'tu mano';
  }

  function coachAskSuffix() {
    return ' ¿Quieres que te ayude? Puedo generarte un informe automático o responder una pregunta concreta.';
  }

  function spotLabelFromHand(dataObj) {
    if (!dataObj) return null;
    if (dataObj.decisions && dataObj.decisions[0] && dataObj.decisions[0].spot) {
      return dataObj.decisions[0].spot;
    }
    const sc = dataObj.scenario;
    if (!sc) return null;
    if (sc.type === 'RFI') return 'RFI ' + sc.heroPos;
    if (sc.type === 'vsRFI') return (sc.key || '').replace(/_/g, ' ');
    if (sc.type === 'squeeze') return sc.heroPos + ' squeeze vs ' + (sc.openerPos || '');
    if (sc.type === 'isoLimp') return sc.heroPos + ' iso vs ' + (sc.limperPos || '');
    return sc.type || null;
  }

  function buildCoachCopy(scope, dataObj, userName) {
    const greet = userName
      ? ('¡Hola, <strong>' + escapeHtml(userName) + '</strong>! ')
      : '';

    if (scope === 'sessionGlobal' && dataObj) {
      const st = dataObj.stats || {};
      const g = st.grade || {};
      const n = (dataObj.hands || []).length;
      const title = greet + '¿Analizamos esta sesión?';
      const lead =
        'Has importado <strong>' + escapeHtml(dataObj.fileName || 'la sesión') + '</strong> (' + n + ' manos). ' +
        'Acierto <strong>' + (st.accuracy != null ? st.accuracy : '—') + '%</strong>, ' +
        'EV perdido por fugas <strong>-' + formatBB(st.evDecision != null ? st.evDecision : st.evLossBB) + ' bb</strong>' +
        (g.letter ? ', nota <strong>' + escapeHtml(g.letter) + '</strong>' : '') +
        '.' + coachAskSuffix();
      return { title: title, lead: lead };
    }

    if (dataObj && (scope === 'session' || scope === 'hand')) {
      const code = cardsLabel(dataObj);
      const pos = dataObj.heroPos || (dataObj.hero && dataObj.hero.pos) || (dataObj.displayHeroPos) || '—';
      const spot = spotLabelFromHand(dataObj);
      const net = dataObj.heroNetBB != null ? dataObj.heroNetBB : (dataObj.result && dataObj.result.heroNet);
      const ev = dataObj.totalEvLoss != null ? dataObj.totalEvLoss : (dataObj.result && dataObj.result.totalEvLoss);
      const acc = dataObj.accuracy != null
        ? dataObj.accuracy
        : (function () {
          const decs = dataObj.decisions || [];
          if (!decs.length) return null;
          const good = decs.filter((d) => d.class === 'optima' || d.class === 'aceptable').length;
          return Math.round((good / decs.length) * 100);
        }());
      const nDec = (dataObj.decisions || []).length;
      const nBad = (dataObj.decisions || []).filter((d) => d.class === 'error' || d.class === 'imprecisa').length;
      const board = dataObj.board && dataObj.board.length
        ? ' Board: <strong>' + escapeHtml(dataObj.board.join(' ')) + '</strong>.'
        : '';

      const title = greet + '¿Repasamos <strong>' + escapeHtml(code) + '</strong> desde <strong>' + escapeHtml(pos) + '</strong>?';
      let lead = '';
      if (spot) lead += 'Spot: <strong>' + escapeHtml(spot) + '</strong>. ';
      if (nDec) {
        lead += nDec + ' decisión' + (nDec > 1 ? 'es' : '') + ' GTO';
        if (acc != null) lead += ' · acierto <strong>' + acc + '%</strong>';
        if (ev != null) lead += ' · EV perdido <strong>-' + formatBB(ev) + ' bb</strong>';
        if (net != null) lead += ' · resultado real <strong>' + (net >= 0 ? '+' : '') + formatBB(net) + ' bb</strong>';
        lead += '.';
      }
      lead += board;
      if (nBad) {
        lead += ' <span class="ai-coach-hint">Hay ' + nBad + ' jugada' + (nBad > 1 ? 's' : '') +
          ' marcada' + (nBad > 1 ? 's' : '') + ' como error o imprecisa — buen momento para consultarme.</span>';
      } else {
        lead += coachAskSuffix();
      }
      return { title: title, lead: lead };
    }

    const title = greet + (scope === 'sessionGlobal' ? '¿Analizamos tu sesión?' : '¿Tienes dudas sobre esta mano?');
    const lead = scope === 'sessionGlobal'
      ? 'Puedo revisar tus estadísticas, las manos con más EV perdido y darte un plan de estudio.' + coachAskSuffix()
      : 'Analizo tus cartas, el board, las frecuencias GTO y el EV de cada decisión — solo con el contexto real de lo que jugaste.' + coachAskSuffix();
    return { title: title, lead: lead };
  }

  function coachStatusHtml() {
    const enabled = isEnabled();
    return enabled
      ? '<span class="home-coach-status on"><span class="home-coach-status-dot" aria-hidden="true"></span>Coach activo</span>'
      : '<span class="home-coach-status off"><span class="home-coach-status-dot" aria-hidden="true"></span>Configuración pendiente</span>';
  }

  function coachIntroHtml(titleId, copy) {
    return '<div class="home-coach-top">' +
      '<div class="home-coach-avatar" aria-hidden="true">&#129302;</div>' +
      '<div class="home-coach-intro">' +
      '<span class="home-coach-badge">Inteligencia artificial</span>' +
      '<h3 class="home-coach-title" id="' + titleId + '">' + copy.title + '</h3>' +
      '<p class="home-coach-lead">' + copy.lead + '</p>' +
      coachStatusHtml() +
      '</div></div>';
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
    if (m.includes('ai_plan') || (m.includes('rate') && m.includes('0'))) {
      return {
        kind: 'paywall',
        message: 'El IA Coach requiere Study (3/mes) o Coach (30/mes). Consulta la pestaña Planes.'
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
    if (global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive()) body.demo = true;

    let token = null;
    if (global.PTSupabase && global.PTSupabase.getAccessToken) {
      token = await global.PTSupabase.getAccessToken();
    }
    if (!token) {
      throw new Error('Inicia sesión para usar el IA Coach');
    }
    const key = anonKey();
    const res = await fetch(c.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'apikey': key || ''
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

  function turnMeta(entry, scope) {
    const ui = SCOPE_UI[scope] || SCOPE_UI.hand;
    const kind = entry.mode === 'question' ? 'Pregunta' : ui.reportKind;
    let line = kind;
    if (entry.createdAt) line += ' · ' + formatDate(entry.createdAt);
    if (entry.model) line += ' · ' + entry.model;
    if (entry.truncated) line += ' · incompleto';
    return line;
  }

  function showConversation(panel, thread, scope) {
    const body = panel.querySelector('[data-ai-body]');
    const meta = panel.querySelector('[data-ai-meta]');
    if (meta) meta.textContent = thread.length
      ? (thread.length + (thread.length === 1 ? ' respuesta guardada' : ' respuestas guardadas'))
      : '';
    if (!body) return;
    if (!thread || !thread.length) {
      body.innerHTML = '';
      panel._coachThread = [];
      return;
    }
    body.innerHTML = '<div class="ai-coach-thread">' + thread.map(function (entry) {
      let html = '<article class="ai-coach-turn">';
      html += '<div class="ai-coach-turn-meta">' + escapeHtml(turnMeta(entry, scope)) + '</div>';
      if (entry.mode === 'question' && entry.question) {
        html += '<div class="ai-coach-turn-q">«' + escapeHtml(entry.question) + '»</div>';
      }
      html += renderMarkdown(entry.reportMarkdown || '');
      html += '</article>';
      return html;
    }).join('') + '</div>';
    panel._coachThread = thread.slice();
  }

  function showReport(panel, report, scope) {
    showConversation(panel, [report], scope);
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
      alert('IA Coach no configurado. Copia js/ai-config.example.js como js/ai-config.js y activa el endpoint.');
      return;
    }
    if (global.PTEntitlements && global.PTEntitlements.ensureLoaded) {
      const ent = await global.PTEntitlements.ensureLoaded();
      const aiCheck = global.PTEntitlements.canUseAI(ent);
      if (!aiCheck.ok) {
        if (global.PTBilling) global.PTBilling.showPaywall(aiCheck.reason);
        else alert('Los informes IA requieren el plan Coach.');
        return;
      }
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
    const loaded = await loadThread(options, dataObj, scope, objId);
    const target = loaded.target;
    let thread = loaded.thread;

    const existing = findInThread(thread, mode, question);
    if (existing && existing.reportMarkdown) {
      showConversation(panel, thread, scope);
      formatQuotaLine(false).then(function (line) { updateQuotaDisplay(panel, line); });
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
        mode: mode === 'question' ? 'question' : 'report',
        question: mode === 'question' ? question : undefined,
        createdAt: new Date().toISOString(),
        truncated: !!data.truncated
      };
      if (target && global.Store && global.Store.appendCoachEntry) {
        const saved = await global.Store.appendCoachEntry(target, report);
        if (saved.ok && saved.thread) {
          thread = saved.thread;
          if (typeof options.onThreadUpdate === 'function') options.onThreadUpdate(thread);
        } else {
          thread = [report].concat(thread);
        }
      } else {
        thread = [report].concat(thread);
        writeCache(cacheKeyFor(scope, objId, mode, question), report);
      }
      showConversation(panel, thread, scope);
      setPanelState(panel, 'ready', '');
      if (mode === 'question') {
        const textarea = panel.querySelector('[data-ai-question-input]');
        if (textarea) textarea.value = '';
        const counter = panel.querySelector('[data-ai-question-count]');
        if (counter) counter.textContent = '0/' + QUESTION_MAX;
      }
      const quotaLine = await formatQuotaLine(true);
      updateQuotaDisplay(panel, quotaLine);
    } catch (e) {
      setPanelState(panel, 'error', '');
      const body = panel.querySelector('[data-ai-body]');
      const err = friendlyError(e.message);
      if (err.kind === 'paywall' && global.PTBilling) {
        global.PTBilling.showPaywall('ai_plan', err.message);
      } else if (body) showError(body, e.message);
      if (global.PTEntitlements && global.PTEntitlements.refresh) global.PTEntitlements.refresh();
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
    const titleId = 'ai-coach-title-' + uid;
    const dataObj = getDataObj(options);
    const copy = buildCoachCopy(scope, dataObj, userFirstName(options));

    container.innerHTML =
      '<div class="ai-report-panel">' +
      '<div class="home-coach-panel ai-coach-embed" role="region" aria-labelledby="' + titleId + '">' +
      coachIntroHtml(titleId, copy) +
      '<div class="ai-coach-actions" data-ai-actions>' +
      '<button type="button" class="btn btn-primary" data-ai-report>' + escapeHtml(ui.reportBtn) + '</button>' +
      '<button type="button" class="btn btn-ghost" data-ai-question-toggle>Pregunta concreta</button>' +
      '</div>' +
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
      '<div class="ai-coach-quota" data-ai-quota hidden></div>' +
      '<div data-ai-status class="ai-report-status"></div>' +
      '<div data-ai-body class="ai-report-content"></div>' +
      '</div></div>';

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

    const dataForLoad = getDataObj(options);
    const objId = getObjId(scope, dataForLoad);
    loadThread(options, dataForLoad, scope, objId).then(function (loaded) {
      if (loaded.thread.length) showConversation(panel, loaded.thread, scope);
    });
    formatQuotaLine(false).then(function (line) { updateQuotaDisplay(panel, line); });

    return panel;
  }

  function mountWelcome(container, options) {
    if (!container) return null;
    options = options || {};
    const first = userFirstName(options);
    const greet = first
      ? ('¡Hola, <strong>' + escapeHtml(first) + '</strong>! Soy tu IA Coach.')
      : '¡Hola! Soy tu <strong>IA Coach</strong> de poker GTO.';
    const titleId = 'home-coach-title';
    const copy = {
      title: greet,
      lead: 'Puedes consultarme las dudas de cualquier mano: analizo tus cartas, el board, las frecuencias GTO y el EV de cada decisión. Solo respondo con el contexto real de lo que jugaste — no invento spots.'
    };

    container.innerHTML =
      '<div class="home-coach-panel" role="region" aria-labelledby="' + titleId + '">' +
      '<div class="home-coach-top">' +
      '<div class="home-coach-avatar" aria-hidden="true">&#129302;</div>' +
      '<div class="home-coach-intro">' +
      '<span class="home-coach-badge">Inteligencia artificial</span>' +
      '<h3 class="home-coach-title" id="' + titleId + '">' + copy.title + '</h3>' +
      '<p class="home-coach-lead">' + copy.lead + '</p>' +
      coachStatusHtml() +
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
      '<p class="muted-text">Solo se envían datos de poker (cartas, acciones, análisis GTO y estadísticas de sesión) cuando lo solicitas y tras dar tu consentimiento. ' +
      PRIVACY_NO_PII + ' Las respuestas se guardan en tu historial de manos y sesiones.</p>' +
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
