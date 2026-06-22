/*
 * ai-report.js — IA Coach: informe de mano, preguntas concretas, caché y descarga.
 */
(function (global) {
  'use strict';

  const CONSENT_KEY = 'pt_ai_consent_v1';
  const CACHE_PREFIX = 'pt_ai_coach_v1_';
  const QUESTION_MAX = 200;

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

  function ensureConsent() {
    if (localStorage.getItem(CONSENT_KEY) === '1') return Promise.resolve(true);
    return new Promise((resolve) => {
      const ok = confirm(
        'Se enviarán a un servicio de IA únicamente los datos de esta mano ' +
        '(cartas, acciones y análisis GTO). No se envía información personal.\n\n¿Continuar?'
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

  async function fetchCoach(payload, mode, question) {
    const c = cfg();
    const body = { payload: payload, mode: mode || 'report' };
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

  function downloadMarkdown(handId, markdown, suffix) {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = 'mano-' + handId + (suffix ? '-' + suffix : '') + '-' + date + '.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  function setPanelState(panel, state, message) {
    const status = panel.querySelector('[data-ai-status]');
    const body = panel.querySelector('[data-ai-body]');
    const actions = panel.querySelector('[data-ai-actions]');
    if (status) status.textContent = message || '';
    if (state === 'loading') {
      if (body) body.innerHTML = '<div class="ai-report-loading">Consultando IA Coach…</div>';
      if (actions) actions.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      const sendQ = panel.querySelector('[data-ai-question-send]');
      if (sendQ) sendQ.disabled = true;
    } else {
      if (actions) actions.querySelectorAll('button').forEach((b) => { b.disabled = false; });
      const sendQ = panel.querySelector('[data-ai-question-send]');
      if (sendQ) sendQ.disabled = false;
    }
  }

  function showReport(panel, report) {
    const body = panel.querySelector('[data-ai-body]');
    const meta = panel.querySelector('[data-ai-meta]');
    if (meta) {
      const kind = report.mode === 'question' ? 'Pregunta' : 'Informe';
      let line = report.cached
        ? kind + ' en caché · ' + (report.createdAt || '')
        : kind + ' · ' + (report.model || 'IA') + (report.createdAt ? ' · ' + report.createdAt : '');
      if (report.question) line += ' · «' + report.question.slice(0, 48) + (report.question.length > 48 ? '…' : '') + '»';
      if (report.truncated) line += ' · respuesta incompleta, pulsa Regenerar';
      meta.textContent = line;
    }
    if (body) body.innerHTML = renderMarkdown(report.reportMarkdown || '');
    panel._currentReport = report;
  }

  function cacheKeyFor(handId, mode, question) {
    const Payload = global.PTAIHandPayload;
    const base = Payload ? Payload.cacheKey(handId) : String(handId);
    if (mode === 'question') return base + '_q_' + hashQuestion(question);
    return base + '_report';
  }

  async function runCoach(panel, source, getHand, opts) {
    const mode = opts.mode || 'report';
    const force = !!opts.force;
    const question = mode === 'question' ? String(opts.question || '').trim().slice(0, QUESTION_MAX) : '';

    if (!isEnabled()) {
      alert('IA Coach no configurado. Copia js/ai-config.example.js como js/ai-config.js y completa endpoint y token.');
      return;
    }
    if (mode === 'question' && !question) {
      alert('Escribe una pregunta (máx. ' + QUESTION_MAX + ' caracteres).');
      return;
    }

    const handObj = typeof getHand === 'function' ? getHand() : getHand;
    if (!handObj) return;

    const Payload = global.PTAIHandPayload;
    if (!Payload) { alert('Módulo de payload no cargado.'); return; }

    const payload = Payload.build(source, handObj);
    if (!payload) return;

    const handId = handObj.id != null ? handObj.id : payload.id;
    const cacheKey = cacheKeyFor(handId, mode, question);
    if (!force) {
      const cached = readCache(cacheKey);
      if (cached && cached.reportMarkdown) {
        showReport(panel, Object.assign({ cached: true, mode: mode, question: question || cached.question }, cached));
        return;
      }
    }

    const ok = await ensureConsent();
    if (!ok) return;

    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const loadingMsg = mode === 'question' ? 'Analizando tu pregunta…' : 'Generando informe de la mano…';
    setPanelState(panel, 'loading', loadingMsg);
    try {
      const data = await fetchCoach(payload, mode, question);
      const report = {
        reportMarkdown: data.reportMarkdown,
        model: data.model,
        mode: data.mode || mode,
        question: mode === 'question' ? question : undefined,
        createdAt: new Date().toISOString(),
        truncated: !!data.truncated
      };
      writeCache(cacheKey, report);
      showReport(panel, report);
      setPanelState(panel, 'ready', '');
      if (mode === 'question') {
        const form = panel.querySelector('[data-ai-question-form]');
        if (form) form.hidden = true;
      }
    } catch (e) {
      setPanelState(panel, 'error', '');
      const body = panel.querySelector('[data-ai-body]');
      if (body) {
        body.innerHTML = '<div class="ai-report-error">Error: ' + escapeHtml(e.message) + '</div>';
      }
      console.error('[PTAI]', e);
    }
  }

  function bindQuestionForm(panel, source, getHand) {
    const form = panel.querySelector('[data-ai-question-form]');
    const toggleBtn = panel.querySelector('[data-ai-question-toggle]');
    const textarea = panel.querySelector('[data-ai-question-input]');
    const counter = panel.querySelector('[data-ai-question-count]');
    const cancelBtn = panel.querySelector('[data-ai-question-cancel]');
    const sendBtn = panel.querySelector('[data-ai-question-send]');
    if (!form || !textarea) return;

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
      panel._lastMode = 'question';
      panel._lastQuestion = q.slice(0, QUESTION_MAX);
      runCoach(panel, source, getHand, { mode: 'question', question: q }).catch(function (e) {
        console.error('[PTAI]', e);
      });
    });
  }

  function mount(container, options) {
    if (!container) return null;
    const source = options.source || 'trainer';
    const getHand = options.getHand;

    container.innerHTML =
      '<div class="ai-report-panel card-box">' +
      '<div class="ai-report-head">' +
      '<h3>IA Coach</h3>' +
      '<div class="ai-report-actions" data-ai-actions>' +
      '<button type="button" class="btn btn-primary btn-sm" data-ai-report>Informe de la mano</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-ai-question-toggle>Pregunta concreta</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-ai-regen>Regenerar</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-ai-download>Descargar .md</button>' +
      '</div></div>' +
      '<div class="ai-question-form" data-ai-question-form hidden>' +
      '<label class="ai-question-label" for="ai-q-input">Tu pregunta sobre esta mano</label>' +
      '<textarea id="ai-q-input" class="ai-question-input" data-ai-question-input maxlength="' + QUESTION_MAX + '" rows="3" placeholder="Ej.: ¿Debí foldear el turn con este sizing?"></textarea>' +
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
    panel._lastMode = 'report';
    panel._lastQuestion = '';

    function runReport(force) {
      panel._lastMode = 'report';
      panel._lastQuestion = '';
      runCoach(panel, source, getHand, { mode: 'report', force: force }).catch(function (e) {
        console.error('[PTAI]', e);
        setPanelState(panel, 'error', '');
        const body = panel.querySelector('[data-ai-body]');
        if (body) {
          body.innerHTML = '<div class="ai-report-error">Error: ' + escapeHtml(e.message) + '</div>';
        }
      });
    }

    container.querySelector('[data-ai-report]').addEventListener('click', function () { runReport(false); });
    container.querySelector('[data-ai-regen]').addEventListener('click', function () {
      const mode = panel._lastMode || 'report';
      const q = panel._lastQuestion || '';
      if (mode === 'question' && q) {
        runCoach(panel, source, getHand, { mode: 'question', question: q, force: true }).catch(console.error);
      } else {
        runReport(true);
      }
    });
    container.querySelector('[data-ai-download]').addEventListener('click', function () {
      const r = panel._currentReport;
      if (!r || !r.reportMarkdown) {
        alert('Genera un informe o envía una pregunta antes de descargar.');
        return;
      }
      const handObj = typeof getHand === 'function' ? getHand() : getHand;
      const id = handObj && handObj.id ? handObj.id : 'mano';
      const suffix = r.mode === 'question' ? 'pregunta' : 'informe';
      downloadMarkdown(id, r.reportMarkdown, suffix);
    });

    bindQuestionForm(panel, source, getHand);

    const Payload = global.PTAIHandPayload;
    if (Payload && getHand) {
      const handObj = typeof getHand === 'function' ? getHand() : getHand;
      if (handObj && handObj.id) {
        const cached = readCache(cacheKeyFor(handObj.id, 'report', ''));
        if (cached && cached.reportMarkdown) showReport(panel, Object.assign({ cached: true }, cached));
      }
    }

    return panel;
  }

  global.PTAIReport = {
    mount, isEnabled, ensureConsent, fetchCoach, readCache, downloadMarkdown, QUESTION_MAX
  };
})(window);
