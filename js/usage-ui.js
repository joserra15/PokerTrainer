/*
 * usage-ui.js — Contadores de límites freemium en UI (P-01).
 */
(function (global) {
  'use strict';

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function barRow(label, used, limit, level) {
    if (limit == null) return '';
    var u = Number(used) || 0;
    var l = Number(limit) || 0;
    var pct = l > 0 ? Math.min(100, Math.round((u / l) * 100)) : 0;
    var cls = level || (pct >= 100 ? 'full' : pct >= 80 ? 'high' : '');
    return '<div class="usage-row">' +
      '<div class="usage-row-head"><span>' + escapeHtml(label) + '</span><strong>' + u + ' / ' + l + '</strong></div>' +
      '<div class="usage-bar"><span class="usage-bar-fill ' + cls + '" style="width:' + pct + '%"></span></div>' +
      '</div>';
  }

  function renderWidget(host, ent) {
    if (!host) return;
    var Ent = global.PTEntitlements;
    ent = ent || (Ent && Ent.get ? Ent.get() : null);
    if (!ent) {
      host.innerHTML = '';
      host.classList.add('hidden');
      return;
    }
    if (Ent && Ent.unlimited(ent) && !ent.is_admin && !(Ent.isAdmin && Ent.isAdmin())) {
      host.innerHTML = '<div class="usage-widget usage-unlimited muted-text">Plan ' + escapeHtml(ent.plan_label || ent.plan) + ' · entrenador e imports sin límite</div>';
      var aiSummary = Ent.aiQuotaSummary ? Ent.aiQuotaSummary(ent) : null;
      if (aiSummary && !aiSummary.unlimited) {
        host.innerHTML += '<div class="usage-widget" style="margin-top:8px"><p class="muted-text" style="margin:0;font-size:12px">' + escapeHtml(aiSummary.label) + '</p></div>';
      }
      host.classList.remove('hidden');
      return;
    }
    if ((ent.is_admin || (Ent.isAdmin && Ent.isAdmin())) && Ent.aiQuotaSummary) {
      host.innerHTML = '<div class="usage-widget usage-unlimited muted-text">' + escapeHtml(Ent.aiQuotaSummary(ent).label) + '</div>';
      host.classList.remove('hidden');
      return;
    }
    var lim = ent.limits || {};
    var use = ent.usage || {};
    var rows = '';
    if (lim.trainer_hands_per_day != null) {
      rows += barRow('Entrenador hoy', use.trainer_hands_today, lim.trainer_hands_per_day);
    }
    if (lim.import_sessions_per_month != null) {
      rows += barRow('Imports este mes', use.import_sessions_month, lim.import_sessions_per_month);
    }
    if (Ent && Ent.analysisHandsMax) {
      var aMax = Ent.analysisHandsMax(ent);
      var aUsed = (global.Store && global.Store.getAnalysisHands)
        ? global.Store.getAnalysisHands().length
        : 0;
      if (aMax != null && aMax < 1000) {
        rows += barRow('Manos en análisis', aUsed, aMax);
      }
    }
    var aiQ = Ent && Ent.aiCombinedQuota ? Ent.aiCombinedQuota(ent) : null;
    if (aiQ && aiQ.unlimited) {
      rows += '<div class="usage-row usage-row-static"><span>IA Coach</span><strong>Ilimitado</strong></div>';
    } else if (aiQ && aiQ.totalLimit > 0) {
      rows += barRow('IA Coach (plan + bono)', aiQ.used, aiQ.totalLimit);
    } else if (lim.ai_reports_per_month != null && lim.ai_reports_per_month > 0) {
      rows += barRow('IA Coach mes', use.ai_reports_month, lim.ai_reports_per_month);
    } else if (lim.ai_reports_per_month === 0 && !(aiQ && aiQ.bonus > 0)) {
      rows += barRow('IA Coach mes', use.ai_reports_month, 0);
    }
    if (Ent && Ent.aiQuotaSummary) {
      var summary = Ent.aiQuotaSummary(ent);
      if (!summary.unlimited && summary.totalLeft != null && summary.totalLeft > 0 && !(aiQ && aiQ.totalLimit > 0)) {
        rows += '<div class="usage-row usage-row-static"><span>IA disponibles</span><strong>' + summary.totalLeft + '</strong></div>';
      }
    }
    if (lim.history_days != null) {
      rows += '<div class="usage-row usage-row-static"><span>Histórico visible</span><strong>' + lim.history_days + ' días</strong></div>';
    }
    if (!rows) {
      host.innerHTML = '';
      host.classList.add('hidden');
      return;
    }
    host.innerHTML = '<div class="usage-widget">' + rows +
      '<p class="usage-foot muted-text"><a href="#" data-go-pricing>Mejorar plan</a> para quitar límites.</p></div>';
    host.classList.remove('hidden');
    var link = host.querySelector('[data-go-pricing]');
    if (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        if (global.dispatchEvent) global.dispatchEvent(new CustomEvent('pt-go-tab', { detail: { tab: 'pricing' } }));
      });
    }
  }

  async function refreshHost(host) {
    var Ent = global.PTEntitlements;
    if (!Ent || !host) return;
    var ent = Ent.get && Ent.get();
    if (!ent && Ent.ensureLoaded) ent = await Ent.ensureLoaded();
    renderWidget(host, ent);
  }

  function refreshAll() {
    ['#home-usage', '#play-usage', '#sessions-usage', '#stats-usage'].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el) refreshHost(el);
    });
  }

  global.PTUsageUI = {
    renderWidget: renderWidget,
    refreshHost: refreshHost,
    refreshAll: refreshAll
  };

  global.addEventListener('pt-auth-ready', function () { refreshAll(); });
  global.addEventListener('pt-entitlements-updated', function () { refreshAll(); });
})(window);
