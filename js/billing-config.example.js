/*
 * billing-config.example.js — Copiar a billing-config.js (no commitear secrets).
 */
window.PT_BILLING = {
  enabled: false,
  /** Si true: no hay checkout ni compra de bonos; planes visibles a título informativo. */
  purchasesPaused: true,
  functionsUrl: 'https://YOUR_PROJECT.supabase.co/functions/v1',
  trial: {
    plan: 'pro',
    days: 10,
    label: 'Prueba Study 10 días',
    note: 'Study con trial de 10 días (sin tarjeta si Stripe lo permite). Una vez por cuenta.'
  },
  plans: {
    pro: {
      label: 'Study',
      monthly: '14,99', yearly: '119', yearlyPerMonth: '9,92',
      founderMonthly: '8,99', founderYearly: '71,40', founderYearlyPerMonth: '5,95'
    },
    premium: {
      label: 'Coach',
      monthly: '34,99', yearly: '279', yearlyPerMonth: '23,25',
      founderMonthly: '20,99', founderYearly: '167,40', founderYearlyPerMonth: '13,95'
    }
  },
  bonus: {
    validityMonths: 12,
    packs: {
      s: { credits: 20, label: 'Pack S' },
      m: { credits: 40, label: 'Pack M' },
      l: { credits: 80, label: 'Pack L' }
    },
    prices: {
      free: { s: '7,99', m: '13,99', l: '22,99' },
      study: { s: '5,99', m: '9,99', l: '15,99' },
      coach: { s: '3,99', m: '6,99', l: '11,99' }
    }
  },
  founder: {
    code: 'FOUNDER',
    launchDate: null,
    launchLabel: 'próximamente',
    discount: '40%',
    seatsNote: 'Plazas limitadas por petición',
    priorityNote: 'Solicita plaza FOUNDER Study o FOUNDER Coach: plazas limitadas por petición; revisamos cada solicitud en soporte.',
    kicker: 'FOUNDER próximamente',
    title: 'FOUNDER Study y FOUNDER Coach · 40% de descuento · plazas limitadas por petición',
    note: 'Compras cerradas hasta el lanzamiento. Solicita tu plaza en Study o Coach; el administrador confirmará según disponibilidad.',
    priceLock: 'Si entras como FOUNDER conservas ese precio para siempre mientras mantengas la suscripción activa.'
  },
  promo: {
    // Cupón Stripe de verano desactivado mientras las compras estén pausadas.
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
      '<p class="promo-banner-note muted-text"><strong>' + esc(f.launchLabel || 'próximamente') +
      '</strong> · <strong>' + esc(f.seatsNote || 'Plazas limitadas por petición') + '</strong>. ' +
      esc(f.priorityNote || '') +
      '</p>' +
      '<p class="promo-banner-note muted-text">' + esc(f.note || '') + '</p>' +
      '</div>';
  }
  function founderPillHtml() {
    var f = founderCfg();
    if (!f || !purchasesPaused()) return '';
    return '<p class="landing-promo-pill founder-pill" role="note">' +
      '<strong>FOUNDER</strong> ' + esc(f.launchLabel || 'próximamente') +
      ' · ' + esc(f.discount || '40%') + ' dto. · <strong>' + esc(f.seatsNote || 'plazas limitadas por petición') + '</strong>' +
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
