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
    launchLabel: 'próximas semanas',
    discount: '40%',
    seatsNote: 'Plazas limitadas',
    priorityNote: 'Solicita tu plaza FOUNDER Study o FOUNDER Coach en Planes: plazas limitadas; revisamos cada solicitud en soporte.',
    kicker: 'FOUNDER · plazas limitadas',
    title: 'FOUNDER Study y FOUNDER Coach · 40% de descuento para siempre · plazas limitadas',
    note: 'Lanzamiento en próximas semanas. Compras cerradas hasta entonces. Solicita tu plaza en el menú Planes; el administrador confirmará según disponibilidad.',
    ctaPlanes: 'Solicita tu plaza en Planes',
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
      '<p class="promo-banner-kicker">' + esc(f.kicker || 'FOUNDER · plazas limitadas') + '</p>' +
      '<p class="promo-banner-title"><strong>' + esc(f.title || ('Plan FOUNDER · ' + (f.discount || '40%') + ' dto. para siempre')) + '</strong></p>' +
      '<p class="promo-banner-note muted-text"><strong>Lanzamiento en ' + esc(f.launchLabel || 'próximas semanas') +
      '</strong> · <strong>' + esc(f.seatsNote || 'Plazas limitadas') + '</strong>. ' +
      esc(f.priorityNote || '') +
      '</p>' +
      '<p class="promo-banner-note muted-text">' + esc(f.note || '') + '</p>' +
      '</div>';
  }
  function founderStripHtml(opts) {
    var f = founderCfg();
    if (!f || !purchasesPaused()) return '';
    opts = opts || {};
    var href = opts.href || '#landing-pricing';
    var cta = opts.cta || f.ctaPlanes || 'Solicita tu plaza en Planes';
    var ctaAttr = opts.ctaAttr || '';
    var discount = String(f.discount || '40%').replace(/^−|^-/, '');
    var ctaTag = opts.button
      ? ('<button type="button" class="btn btn-primary founder-promo-cta"' + ctaAttr + '>' + esc(cta) + '</button>')
      : ('<a class="btn btn-primary founder-promo-cta" href="' + esc(href) + '"' + ctaAttr + '>' + esc(cta) + '</a>');
    return '<aside class="founder-promo-strip" role="note" aria-label="FOUNDER">' +
      '<div class="founder-promo-strip-glow" aria-hidden="true"></div>' +
      '<div class="founder-promo-strip-body">' +
      '<div class="founder-promo-strip-main">' +
      '<p class="founder-promo-brand">' +
      '<span class="founder-promo-brand-name">FOUNDER</span>' +
      '<span class="founder-promo-badge">−' + esc(discount) + '</span>' +
      '</p>' +
      '<p class="founder-promo-title">' + esc(discount) + ' de descuento para siempre</p>' +
      '<p class="founder-promo-lead">Lanzamiento en <strong>' + esc(f.launchLabel || 'próximas semanas') +
      '</strong> · ' + esc(f.seatsNote || 'Plazas limitadas') +
      ' · Study y Coach</p>' +
      '</div>' + ctaTag +
      '</div></aside>';
  }
  function founderPillHtml() {
    return founderStripHtml({ href: '#landing-pricing' });
  }
  function founderNavBadgeHtml() {
    if (!purchasesPaused()) return '';
    return '<span class="founder-nav-badge" aria-hidden="true">−40%</span>';
  }
  global.PTBillingPromo = {
    active: function () { return !!promoCfg() || purchasesPaused(); },
    config: promoCfg,
    purchasesPaused: purchasesPaused,
    founder: founderCfg,
    founderBannerHtml: founderBannerHtml,
    founderStripHtml: founderStripHtml,
    founderNavBadgeHtml: founderNavBadgeHtml,
    homePromoHtml: function () {
      return founderStripHtml({
        button: true,
        cta: 'Ir a Planes',
        ctaAttr: ' data-go-tab="pricing"'
      });
    },
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
