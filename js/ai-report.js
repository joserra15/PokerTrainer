/*
 * ai-report.js — Informe IA: consentimiento, caché local, llamada API y descarga.
 */
(function (global) {
  'use strict';

  const CONSENT_KEY = 'pt_ai_consent_v1';
  const CACHE_PREFIX = 'pt_ai_report_v1_';

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
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => '<ul>' + m + '</ul>');
    html = html.replace(/\n\n/g, '</p><p>');
    return '<div class="ai-report-body"><p>' + html + '</p></div>';
  }

  async function fetchReport(payload) {
    const c = cfg();
    const res = await fetch(c.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + anonKey(),
        'apikey': anonKey(),
        'X-PT-AI-Token': c.token
      },
      body: JSON.stringify({ payload: payload })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error || data.message || ('HTTP ' + res.status);
      throw new Error(msg);
    }
    return data;
  }

  function downloadMarkdown(handId, markdown) {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = 'mano-' + handId + '-' + date + '.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  function setPanelState(panel, state, message) {
    const status = panel.querySelector('[data-ai-status]');
    const body = panel.querySelector('[data-ai-body]');
    const actions = panel.querySelector('[data-ai-actions]');
    if (status) status.textContent = message || '';
    if (state === 'loading') {
      if (body) body.innerHTML = '<div class="ai-report-loading">Generando informe…</div>';
      if (actions) actions.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    } else if (actions) {
      actions.querySelectorAll('button').forEach((b) => { b.disabled = false; });
    }
  }

  function showReport(panel, report) {
    const body = panel.querySelector('[data-ai-body]');
    const meta = panel.querySelector('[data-ai-meta]');
    if (meta) {
      meta.textContent = report.cached
        ? 'Informe en caché · ' + (report.createdAt || '')
        : 'Generado · ' + (report.model || 'IA') + (report.createdAt ? ' · ' + report.createdAt : '');
    }
    if (body) body.innerHTML = renderMarkdown(report.reportMarkdown || '');
    panel._currentReport = report;
  }

  async function generate(panel, source, getHand, force) {
    if (!isEnabled()) {
      alert('Informe IA no configurado. Copia js/ai-config.example.js como js/ai-config.js y completa endpoint y token.');
      return;
    }
    const handObj = typeof getHand === 'function' ? getHand() : getHand;
    if (!handObj) return;

    const Payload = global.PTAIHandPayload;
    if (!Payload) { alert('Módulo de payload no cargado.'); return; }

    const payload = Payload.build(source, handObj);
    if (!payload) return;

    const handId = handObj.id != null ? handObj.id : payload.id;
    const cacheKey = Payload.cacheKey(handId);
    if (!force) {
      const cached = readCache(cacheKey);
      if (cached && cached.reportMarkdown) {
        showReport(panel, Object.assign({ cached: true }, cached));
        return;
      }
    }

    const ok = await ensureConsent();
    if (!ok) return;

    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setPanelState(panel, 'loading', 'Consultando IA…');
    try {
      const data = await fetchReport(payload);
      const report = {
        reportMarkdown: data.reportMarkdown,
        model: data.model,
        createdAt: new Date().toISOString()
      };
      writeCache(cacheKey, report);
      showReport(panel, report);
      setPanelState(panel, 'ready', '');
    } catch (e) {
      setPanelState(panel, 'error', '');
      const body = panel.querySelector('[data-ai-body]');
      if (body) {
        body.innerHTML = '<div class="ai-report-error">Error: ' + escapeHtml(e.message) + '</div>';
      }
      console.error('[PTAI]', e);
    }
  }

  function mount(container, options) {
    if (!container) return null;
    const source = options.source || 'trainer';
    const getHand = options.getHand;

    container.innerHTML =
      '<div class="ai-report-panel card-box">' +
      '<div class="ai-report-head">' +
      '<h3>Informe IA</h3>' +
      '<div class="ai-report-actions" data-ai-actions>' +
      '<button type="button" class="btn btn-primary btn-sm" data-ai-generate>Generar informe</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-ai-regen>Regenerar</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-ai-download>Descargar .md</button>' +
      '</div></div>' +
      '<div class="muted-text ai-report-meta" data-ai-meta></div>' +
      '<div data-ai-status class="ai-report-status"></div>' +
      '<div data-ai-body class="ai-report-content"></div>' +
      '</div>';

    const panel = container.querySelector('.ai-report-panel');

    function runGenerate(force) {
      generate(panel, source, getHand, force).catch(function (e) {
        console.error('[PTAI]', e);
        setPanelState(panel, 'error', '');
        const body = panel.querySelector('[data-ai-body]');
        if (body) {
          body.innerHTML = '<div class="ai-report-error">Error: ' + escapeHtml(e.message) + '</div>';
        }
      });
    }

    container.querySelector('[data-ai-generate]').addEventListener('click', function () { runGenerate(false); });
    container.querySelector('[data-ai-regen]').addEventListener('click', function () { runGenerate(true); });
    container.querySelector('[data-ai-download]').addEventListener('click', () => {
      const r = panel._currentReport;
      if (!r || !r.reportMarkdown) {
        alert('Genera un informe antes de descargar.');
        return;
      }
      const handObj = typeof getHand === 'function' ? getHand() : getHand;
      const id = handObj && handObj.id ? handObj.id : 'mano';
      downloadMarkdown(id, r.reportMarkdown);
    });

    const Payload = global.PTAIHandPayload;
    if (Payload && getHand) {
      const handObj = typeof getHand === 'function' ? getHand() : getHand;
      if (handObj && handObj.id) {
        const cached = readCache(Payload.cacheKey(handObj.id));
        if (cached && cached.reportMarkdown) showReport(panel, Object.assign({ cached: true }, cached));
      }
    }

    return panel;
  }

  global.PTAIReport = {
    mount, isEnabled, ensureConsent, fetchReport, readCache, downloadMarkdown
  };
})(window);
