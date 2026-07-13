/*
 * billing-config.js — Stripe Checkout (sin secrets; Price IDs van en Supabase).
 */
window.PT_BILLING = {
  enabled: true,
  functionsUrl: 'https://wrkupbxttqrpdpoztcky.supabase.co/functions/v1',
  plans: {
    pro: { label: 'Study', monthly: '14,99', yearly: '119', yearlyPerMonth: '9,92' },
    premium: { label: 'Coach', monthly: '34,99', yearly: '279', yearlyPerMonth: '23,25' }
  },
  bonus: {
    validityMonths: 12,
    packs: {
      s: { credits: 10, label: 'Pack S' },
      m: { credits: 20, label: 'Pack M' },
      l: { credits: 40, label: 'Pack L' }
    },
    prices: {
      free: { s: '7,99', m: '13,99', l: '22,99' },
      study: { s: '5,99', m: '9,99', l: '15,99' },
      coach: { s: '3,99', m: '6,99', l: '11,99' }
    }
  },
  promo: {
    active: true,
    code: 'SUMMER26',
    couponId: 'wcTGqarh',
    discount: '50%',
    kicker: 'Promoción de verano',
    note: 'Válido una sola vez por compra. Si lo usas en una suscripción, el descuento aplica solo al primer mes. Introduce el código en el checkout de Stripe.'
  }
};

(function (global) {
  'use strict';
  function promoCfg() {
    var b = global.PT_BILLING || {};
    return b.promo && b.promo.active !== false && b.promo.code ? b.promo : null;
  }
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  global.PTBillingPromo = {
    active: function () { return !!promoCfg(); },
    config: promoCfg,
    pillHtml: function () {
      var p = promoCfg();
      if (!p) return '';
      return '<p class="landing-promo-pill" role="note">' +
        '<strong>' + esc(p.discount || '50%') + ' dto.</strong> con código ' +
        '<code class="promo-code">' + esc(p.code) + '</code> · ' +
        '<a href="#landing-pricing">Ver condiciones</a></p>';
    },
    bannerHtml: function () {
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
