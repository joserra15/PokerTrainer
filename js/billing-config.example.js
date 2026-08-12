/*
 * billing-config.example.js — Copiar a billing-config.js (no commitear secrets).
 */
window.PT_BILLING = {
  enabled: false,
  /** Si true: no hay checkout ni compra de bonos; planes visibles a título informativo. */
  purchasesPaused: true,
  // Base URL de Edge Functions (sin barra final)
  functionsUrl: 'https://YOUR_PROJECT.supabase.co/functions/v1',
  trial: {
    plan: 'pro',
    days: 10,
    label: 'Prueba Study 10 días',
    note: 'Study con trial de 10 días (sin tarjeta si Stripe lo permite). Una vez por cuenta.'
  },
  plans: {
    pro: { label: 'Study', monthly: '14,99', yearly: '119', yearlyPerMonth: '9,92' },
    premium: { label: 'Coach', monthly: '34,99', yearly: '279', yearlyPerMonth: '23,25' }
  },
  bonus: {
    validityMonths: 12,
    packs: { s: { credits: 20, label: 'Pack S' }, m: { credits: 40, label: 'Pack M' }, l: { credits: 80, label: 'Pack L' } },
    prices: {
      free: { s: '7,99', m: '13,99', l: '22,99' },
      study: { s: '5,99', m: '9,99', l: '15,99' },
      coach: { s: '3,99', m: '6,99', l: '11,99' }
    }
  },
  founder: {
    code: 'FOUNDER',
    launchDate: '2026-11-15',
    launchLabel: '15 de noviembre de 2026',
    discount: '40%',
    seatsNote: 'Plazas limitadas',
    priorityNote: 'Prioridad para usuarios ya registrados que lo soliciten (Contacto o Instagram).',
    kicker: 'Lanzamiento FOUNDER',
    title: 'Plan FOUNDER el 15 de noviembre · 40% de descuento',
    note: 'Compras cerradas hasta esa fecha. Los planes se muestran informativos. Coach solo por invitación durante la beta.'
  },
  promo: {
    active: false,
    code: 'SUMMER26',
    couponId: 'wrv35N6u',
    discount: '50%',
    kicker: 'Promoción de verano',
    note: 'Válido una sola vez por compra. Si lo usas en una suscripción, el descuento aplica solo al primer mes. Introduce el código en el checkout de Stripe.'
  }
};

(function (global) {
  'use strict';
  function billing() {
    return global.PT_BILLING || {};
  }
  function founderCfg() {
    var f = billing().founder;
    return f && typeof f === 'object' ? f : null;
  }
  function purchasesPaused() {
    return billing().purchasesPaused !== false && !!billing().purchasesPaused;
  }
  function promoCfg() {
    if (purchasesPaused()) return null;
    var b = billing();
    return b.promo && b.promo.active !== false && b.promo.code ? b.promo : null;
  }
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function founderBannerHtml() {
    var f = founderCfg();
    if (!f || !purchasesPaused()) return '';
    return '<div class="promo-banner founder-banner" role="note">' +
      '<p class="promo-banner-kicker">' + esc(f.kicker || 'FOUNDER') + '</p>' +
      '<p class="promo-banner-title"><strong>' + esc(f.title || ('Plan FOUNDER · ' + (f.discount || '40%') + ' dto.')) + '</strong></p>' +
      '<p class="promo-banner-note muted-text">' +
      esc(f.launchLabel || '15 de noviembre') + ' · ' + esc(f.seatsNote || 'Plazas limitadas') + '. ' +
      esc(f.priorityNote || '') +
      '</p>' +
      '<p class="promo-banner-note muted-text">' + esc(f.note || '') + '</p>' +
      '</div>';
  }
  function founderPillHtml() {
    var f = founderCfg();
    if (!f || !purchasesPaused()) return '';
    return '<p class="landing-promo-pill founder-pill" role="note">' +
      '<strong>FOUNDER</strong> el ' + esc(f.launchLabel || '15 de noviembre') +
      ' · ' + esc(f.discount || '40%') + ' dto. · ' + esc(f.seatsNote || 'plazas limitadas') +
      ' · <a href="#landing-pricing">Ver planes</a></p>';
  }
  global.PTBillingPromo = {
    active: function () { return !!promoCfg() || purchasesPaused(); },
    config: promoCfg,
    purchasesPaused: purchasesPaused,
    founder: founderCfg,
    founderBannerHtml: founderBannerHtml,
    pillHtml: function () {
      if (purchasesPaused()) return founderPillHtml();
      var p = promoCfg();
      if (!p) return '';
      return '<p class="landing-promo-pill" role="note">' +
        '<strong>' + esc(p.discount || '50%') + ' dto.</strong> con código ' +
        '<code class="promo-code">' + esc(p.code) + '</code> · ' +
        '<a href="#landing-pricing">Ver condiciones</a></p>';
    },
    bannerHtml: function () {
      if (purchasesPaused()) return founderBannerHtml();
      var p = promoCfg();
      if (!p) return '';
      return '<div class="promo-banner" role="note">' +
        '<p class="promo-banner-kicker">' + esc(p.kicker || 'Oferta') + '</p>' +
        '<p class="promo-banner-title"><strong>' + esc(p.discount || '50%') + ' de descuento</strong> en cualquier compra con el código <code class="promo-code">' + esc(p.code) + '</code></p>' +
        '<p class="promo-banner-note muted-text">' + esc(p.note) + '</p>' +
        '</div>';
    }
  };
})(window);
