/*
 * admin-promotions.js — Generar y gestionar promociones (panel Admin).
 */
(function (global) {
  'use strict';

  var bound = false;
  var promotions = [];
  var lastCreated = null;

  function $(sel) { return document.querySelector(sel); }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function client() {
    return global.PTSupabase && global.PTSupabase.getClient
      ? global.PTSupabase.getClient()
      : null;
  }

  function appBaseUrl() {
    var site = global.PT_SITE || {};
    var base = (site.appUrl || (location.origin + '/')).replace(/\/?$/, '/');
    return base;
  }

  function promoUrl(code) {
    return appBaseUrl() + 'promo.html?c=' + encodeURIComponent(code);
  }

  function planLabel(plan) {
    if (plan === 'pro') return 'Study';
    if (plan === 'premium') return 'Coach';
    return '';
  }

  function giftSummary(p) {
    var parts = [];
    if (p.plan) {
      var months = Number(p.plan_duration_months) || 1;
      parts.push(planLabel(p.plan) + ' · ' + months + (months === 1 ? ' mes' : ' meses') + ' gratis');
    }
    if (p.bonus_credits) {
      parts.push(p.bonus_credits + ' consultas IA');
    }
    return parts.join(' + ') || '—';
  }

  function buildPromoHtml(p) {
    var url = promoUrl(p.code);
    var gift = giftSummary(p);
    var desc = String(p.description || '').trim();
    return [
      '<!DOCTYPE html>',
      '<html lang="es">',
      '<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />',
      '<title>' + escapeHtml(p.title || 'Promoción') + ' · PokerForgeAI</title></head>',
      '<body style="margin:0;font-family:Segoe UI,system-ui,sans-serif;background:#0f1419;color:#e6edf3;">',
      '<div style="max-width:640px;margin:0 auto;padding:32px 20px;">',
      '<p style="color:#2f81f7;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px;">PokerForgeAI</p>',
      '<h1 style="font-size:28px;margin:8px 0 12px;">' + escapeHtml(p.title || 'Promoción') + '</h1>',
      (desc ? '<p style="color:#8b97a7;line-height:1.5;margin:0 0 16px;">' + escapeHtml(desc) + '</p>' : ''),
      '<p style="font-size:18px;font-weight:700;margin:0 0 20px;">' + escapeHtml(gift) + '</p>',
      '<p style="margin:0 0 8px;"><a href="' + escapeHtml(url) + '" style="display:inline-block;background:#2f81f7;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">Registrarme y activar</a></p>',
      '<p style="color:#8b97a7;font-size:13px;margin:16px 0 0;">Código: <code>' + escapeHtml(p.code) + '</code> · Solo cuentas nuevas.</p>',
      '</div></body></html>'
    ].join('\n');
  }

  function showPromosPanel(show) {
    var promoPanel = $('#admin-promos-panel');
    var usersPanel = $('#admin-users-panel');
    var msgPanel = $('#admin-messages-panel');
    if (promoPanel) promoPanel.classList.toggle('hidden', !show);
    if (show) {
      if (usersPanel) usersPanel.classList.add('hidden');
      if (msgPanel) msgPanel.classList.add('hidden');
      loadPromotions();
    } else if (promoPanel && !promoPanel.classList.contains('hidden')) {
      promoPanel.classList.add('hidden');
      if (usersPanel) usersPanel.classList.remove('hidden');
    }
  }

  function setStatus(msg) {
    var el = $('#admin-promos-status');
    if (el) el.textContent = msg || '';
  }

  function setError(msg) {
    var el = $('#admin-promos-error');
    if (el) el.textContent = msg || '';
  }

  function formValues() {
    var plan = ($('#admin-promo-plan') && $('#admin-promo-plan').value) || '';
    var bonusSel = ($('#admin-promo-bonus') && $('#admin-promo-bonus').value) || '';
    var customBonus = Number(($('#admin-promo-bonus-custom') && $('#admin-promo-bonus-custom').value) || 0);
    var bonus = 0;
    if (bonusSel === 'custom') bonus = customBonus;
    else if (bonusSel) bonus = Number(bonusSel) || 0;
    return {
      title: (($('#admin-promo-title') && $('#admin-promo-title').value) || '').trim(),
      description: (($('#admin-promo-desc') && $('#admin-promo-desc').value) || '').trim(),
      plan: plan || null,
      plan_duration_months: plan ? (Number(($('#admin-promo-months') && $('#admin-promo-months').value) || 1) || 1) : null,
      bonus_credits: bonus,
      max_redemptions: Number(($('#admin-promo-max') && $('#admin-promo-max').value) || 100) || 100
    };
  }

  function syncFormUi() {
    var plan = ($('#admin-promo-plan') && $('#admin-promo-plan').value) || '';
    var monthsWrap = $('#admin-promo-months-wrap');
    var bonusSel = ($('#admin-promo-bonus') && $('#admin-promo-bonus').value) || '';
    var customWrap = $('#admin-promo-bonus-custom-wrap');
    if (monthsWrap) monthsWrap.classList.toggle('hidden', !plan);
    if (customWrap) customWrap.classList.toggle('hidden', bonusSel !== 'custom');
  }

  function renderGenerated(p) {
    var box = $('#admin-promo-generated');
    if (!box || !p) return;
    var url = promoUrl(p.code);
    var html = buildPromoHtml(p);
    box.classList.remove('hidden');
    box.innerHTML =
      '<h4>Promoción generada</h4>' +
      '<p class="muted-text">Enlace público (sin registro previo):</p>' +
      '<div class="admin-promo-link-row">' +
      '<input type="text" class="admin-promo-input" id="admin-promo-link" readonly value="' + escapeHtml(url) + '" />' +
      '<button type="button" class="btn btn-ghost btn-sm" id="admin-promo-copy-link">Copiar enlace</button>' +
      '<a class="btn btn-primary btn-sm" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">Abrir</a>' +
      '</div>' +
      '<p class="muted-text" style="margin-top:12px">HTML con detalle y botón de registro:</p>' +
      '<textarea class="admin-promo-html" id="admin-promo-html" rows="8" readonly>' + escapeHtml(html) + '</textarea>' +
      '<div class="admin-promo-actions">' +
      '<button type="button" class="btn btn-ghost btn-sm" id="admin-promo-copy-html">Copiar HTML</button>' +
      '</div>';

    var copyLink = $('#admin-promo-copy-link');
    if (copyLink) {
      copyLink.onclick = function () {
        copyText(url, 'Enlace copiado');
      };
    }
    var copyHtml = $('#admin-promo-copy-html');
    if (copyHtml) {
      copyHtml.onclick = function () {
        copyText(html, 'HTML copiado');
      };
    }
  }

  function copyText(text, okMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        setStatus(okMsg || 'Copiado');
      }).catch(function () {
        fallbackCopy(text, okMsg);
      });
      return;
    }
    fallbackCopy(text, okMsg);
  }

  function fallbackCopy(text, okMsg) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setStatus(okMsg || 'Copiado');
    } catch (e) {
      setError('No se pudo copiar');
    }
  }

  function renderList() {
    var host = $('#admin-promos-list');
    if (!host) return;
    if (!promotions.length) {
      host.innerHTML = '<p class="muted-text">Aún no hay promociones. Genera la primera arriba.</p>';
      return;
    }
    host.innerHTML = '<div class="admin-table-wrap"><table class="admin-table admin-promos-table">' +
      '<thead><tr>' +
      '<th>Código</th><th>Título</th><th>Regalo</th><th>Usados</th><th>Máx.</th><th>Estado</th><th></th>' +
      '</tr></thead><tbody>' +
      promotions.map(function (p) {
        var active = !!p.is_active && Number(p.used_count) < Number(p.max_redemptions);
        return '<tr data-promo-id="' + escapeHtml(p.id) + '">' +
          '<td><code>' + escapeHtml(p.code) + '</code></td>' +
          '<td>' + escapeHtml(p.title) + '</td>' +
          '<td>' + escapeHtml(giftSummary(p)) + '</td>' +
          '<td><input type="number" min="0" class="admin-promo-count-input" data-promo-used="' +
            escapeHtml(p.id) + '" value="' + escapeHtml(p.used_count) + '" /></td>' +
          '<td><input type="number" min="1" class="admin-promo-count-input" data-promo-max="' +
            escapeHtml(p.id) + '" value="' + escapeHtml(p.max_redemptions) + '" /></td>' +
          '<td>' + (active
            ? '<span class="admin-promo-badge admin-promo-badge-on">Activa</span>'
            : '<span class="admin-promo-badge admin-promo-badge-off">Inactiva</span>') +
          '</td>' +
          '<td class="admin-promo-row-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-promo-toggle="' + escapeHtml(p.id) + '">' +
          (p.is_active ? 'Desactivar' : 'Activar') + '</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-promo-save="' + escapeHtml(p.id) + '">Guardar</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-promo-copy="' + escapeHtml(p.id) + '">Copiar enlace</button>' +
          '</td></tr>';
      }).join('') +
      '</tbody></table></div>';

    host.querySelectorAll('[data-promo-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-promo-toggle');
        var p = promotions.find(function (x) { return x.id === id; });
        if (!p) return;
        updatePromotion(id, { p_is_active: !p.is_active });
      });
    });
    host.querySelectorAll('[data-promo-save]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-promo-save');
        var usedEl = host.querySelector('[data-promo-used="' + id + '"]');
        var maxEl = host.querySelector('[data-promo-max="' + id + '"]');
        updatePromotion(id, {
          p_used_count: Number(usedEl && usedEl.value),
          p_max_redemptions: Number(maxEl && maxEl.value)
        });
      });
    });
    host.querySelectorAll('[data-promo-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-promo-copy');
        var p = promotions.find(function (x) { return x.id === id; });
        if (!p) return;
        lastCreated = p;
        renderGenerated(p);
        copyText(promoUrl(p.code), 'Enlace copiado');
      });
    });
  }

  async function loadPromotions() {
    var c = client();
    if (!c) {
      setError('Supabase no disponible');
      return;
    }
    setError('');
    setStatus('Cargando promociones…');
    var res = await c.rpc('pt_admin_list_promotions');
    if (res.error) {
      setStatus('');
      setError(res.error.message || 'No se pudieron cargar las promociones');
      return;
    }
    promotions = (res.data && res.data.promotions) || [];
    setStatus(promotions.length + ' promoción' + (promotions.length === 1 ? '' : 'es'));
    renderList();
  }

  async function createPromotion() {
    var vals = formValues();
    if (!vals.title) {
      setError('Indica un título para la promoción');
      return;
    }
    if (!vals.plan && !(vals.bonus_credits > 0)) {
      setError('Elige un plan y/o un bono IA');
      return;
    }
    var c = client();
    if (!c) {
      setError('Supabase no disponible');
      return;
    }
    setError('');
    setStatus('Generando…');
    var res = await c.rpc('pt_admin_create_promotion', {
      p_title: vals.title,
      p_description: vals.description,
      p_plan: vals.plan,
      p_plan_duration_months: vals.plan_duration_months,
      p_bonus_credits: vals.bonus_credits,
      p_max_redemptions: vals.max_redemptions
    });
    if (res.error) {
      setStatus('');
      setError(res.error.message || 'No se pudo crear la promoción');
      return;
    }
    var p = (res.data && res.data.promotion) || null;
    if (!p) {
      setError('Respuesta vacía al crear la promoción');
      return;
    }
    lastCreated = p;
    renderGenerated(p);
    setStatus('Promoción ' + p.code + ' creada');
    await loadPromotions();
  }

  async function updatePromotion(id, args) {
    var c = client();
    if (!c) return;
    setError('');
    setStatus('Guardando…');
    var payload = { p_id: id };
    Object.keys(args || {}).forEach(function (k) { payload[k] = args[k]; });
    var res = await c.rpc('pt_admin_update_promotion', payload);
    if (res.error) {
      setStatus('');
      setError(res.error.message || 'No se pudo actualizar');
      return;
    }
    setStatus('Promoción actualizada');
    await loadPromotions();
  }

  function bindUi() {
    if (bound) return;
    bound = true;

    var openBtn = $('#admin-promos-btn');
    var backBtn = $('#admin-promos-back');
    if (openBtn) {
      openBtn.addEventListener('click', function () { showPromosPanel(true); });
    }
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        showPromosPanel(false);
        var usersPanel = $('#admin-users-panel');
        if (usersPanel) usersPanel.classList.remove('hidden');
      });
    }

    var genBtn = $('#admin-promo-generate');
    if (genBtn) genBtn.addEventListener('click', function () { createPromotion(); });

    ['admin-promo-plan', 'admin-promo-bonus'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', syncFormUi);
    });
    syncFormUi();

    // Si se abre Mensajes, ocultar promociones
    var msgBtn = $('#admin-messages-btn');
    if (msgBtn) {
      msgBtn.addEventListener('click', function () {
        var promoPanel = $('#admin-promos-panel');
        if (promoPanel) promoPanel.classList.add('hidden');
      });
    }
  }

  global.PTAdminPromos = {
    bindUi: bindUi,
    load: loadPromotions,
    show: showPromosPanel,
    promoUrl: promoUrl,
    buildPromoHtml: buildPromoHtml
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindUi);
  } else {
    bindUi();
  }
})(window);
