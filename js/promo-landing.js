/*
 * promo-landing.js — Landing pública de promoción (?c=CODIGO).
 */
(function (global) {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function appUrl(path) {
    var site = global.PT_SITE || {};
    var base = (site.appUrl || '/').replace(/\/?$/, '/');
    return base + String(path || '').replace(/^\//, '');
  }

  function codeFromUrl() {
    try {
      return String(new URLSearchParams(location.search).get('c') || '').trim().toUpperCase();
    } catch (e) {
      return '';
    }
  }

  function supabaseUrl() {
    return (global.PT_SUPABASE && global.PT_SUPABASE.url) || '';
  }

  function anonKey() {
    return (global.PT_SUPABASE && global.PT_SUPABASE.anonKey) || '';
  }

  async function fetchPromo(code) {
    var base = String(supabaseUrl()).replace(/\/$/, '');
    var key = anonKey();
    if (!base || !key) throw new Error('Supabase no configurado');
    var res = await fetch(base + '/rest/v1/rpc/pt_get_promotion_public', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: 'Bearer ' + key
      },
      body: JSON.stringify({ p_code: code })
    });
    if (!res.ok) {
      var txt = await res.text();
      throw new Error(txt || ('HTTP ' + res.status));
    }
    return res.json();
  }

  function giftItems(p) {
    var items = [];
    if (p.plan_label) {
      var months = Number(p.plan_duration_months) || 1;
      items.push(p.plan_label + ' · ' + months + (months === 1 ? ' mes gratis' : ' meses gratis'));
    }
    if (p.bonus_credits) {
      items.push(p.bonus_credits + ' consultas IA de bono');
    }
    return items;
  }

  function showLoading() {
    $('promo-loading').classList.remove('hidden');
    $('promo-active').classList.add('hidden');
    $('promo-unavailable').classList.add('hidden');
  }

  function showActive(p) {
    $('promo-loading').classList.add('hidden');
    $('promo-unavailable').classList.add('hidden');
    var active = $('promo-active');
    active.classList.remove('hidden');

    $('promo-title').textContent = p.title || 'Promoción especial';
    var lead = $('promo-lead');
    lead.textContent = p.description || 'Regístrate con una cuenta nueva y activa tu regalo al instante.';
    lead.classList.toggle('hidden', !lead.textContent);

    var gifts = $('promo-gifts');
    gifts.innerHTML = giftItems(p).map(function (g) {
      return '<span class="promo-gift-item">' + escapeHtml(g) + '</span>';
    }).join('');

    $('promo-code-note').innerHTML =
      'Código <code>' + escapeHtml(p.code) + '</code> · Solo válido para cuentas nuevas.';

    document.title = (p.title || 'Promoción') + ' · PokerForgeAI';
  }

  function showUnavailable(opts) {
    opts = opts || {};
    $('promo-loading').classList.add('hidden');
    $('promo-active').classList.add('hidden');
    var box = $('promo-unavailable');
    box.classList.remove('hidden');
    $('promo-unavail-title').textContent = opts.title || 'Promoción no disponible';
    $('promo-unavail-lead').textContent = opts.lead ||
      'Esta promoción no está activa o ha alcanzado el máximo de registros.';
    document.title = 'Promoción no disponible · PokerForgeAI';
  }

  function bindRegister(code) {
    var btn = $('promo-register');
    if (!btn) return;
    btn.addEventListener('click', function () {
      try {
        sessionStorage.setItem('pt_promo_pending', code);
      } catch (e) { /* noop */ }
      location.assign(appUrl('?promo=' + encodeURIComponent(code)));
    });
  }

  function bindAltLinks() {
    var free = $('promo-register-free');
    var plans = $('promo-see-plans');
    if (free) free.href = appUrl('');
    if (plans) plans.href = appUrl('#landing-pricing');
    var home = $('promo-home');
    if (home) home.href = appUrl('');
  }

  async function boot() {
    bindAltLinks();
    var code = codeFromUrl();
    if (!code) {
      showUnavailable({
        title: 'Enlace no válido',
        lead: 'Falta el código de promoción. Puedes registrarte con una cuenta gratuita o elegir un plan.'
      });
      return;
    }

    showLoading();
    try {
      var data = await fetchPromo(code);
      if (!data || !data.ok) {
        showUnavailable({
          title: 'Promoción no encontrada',
          lead: 'Este enlace no corresponde a ninguna promoción. Regístrate gratis o mira los planes disponibles.'
        });
        return;
      }
      if (!data.available) {
        var reason = data.reason === 'exhausted'
          ? 'Se ha alcanzado el máximo de registros de esta promoción.'
          : 'Esta promoción no está activada en este momento.';
        showUnavailable({
          title: 'Promoción no disponible',
          lead: reason + ' Puedes registrarte con una cuenta gratuita o con alguno de nuestros planes.'
        });
        return;
      }
      showActive(data);
      bindRegister(data.code);
    } catch (e) {
      showUnavailable({
        title: 'No se pudo cargar la promoción',
        lead: 'Inténtalo de nuevo en unos minutos o regístrate con una cuenta gratuita.'
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
