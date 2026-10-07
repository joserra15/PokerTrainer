/*
 * billing-config.example.js — Copiar a billing-config.js (no commitear secrets).
 */
window.PT_BILLING = {
  enabled: false,
  /** Si true: no hay checkout ni compra de bonos; planes visibles a título informativo. */
  purchasesPaused: false,
  /** Opcional. Si vacío, billing.js usa PT_SUPABASE.url + '/functions/v1'. */
  functionsUrl: '',
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
    seatsOpen: true,
    launchDate: '2026-10-01',
    launchLabel: 'octubre',
    closeDate: '2026-10-31',
    closeLabel: '31 de octubre',
    discount: '40%',
    seatsNote: 'Plazas limitadas',
    priorityNote: 'Solicita tu plaza FOUNDER Study o FOUNDER Coach en Planes: plazas limitadas; revisamos cada solicitud en soporte.',
    kicker: 'FOUNDER · solo octubre',
    title: 'FOUNDER Study y FOUNDER Coach · 40% de descuento para siempre · solo abierto en octubre',
    note: 'FOUNDER solo está abierto en octubre. El 31 de octubre se cierra para siempre. Puedes contratar Study o Coach ahora a precio de lista, o solicitar plaza FOUNDER (−40 % de por vida si te aprueban).',
    urgencyNote: 'FOUNDER solo está abierto en octubre. El 31 de octubre se cierra para siempre.',
    ctaPlanes: 'Solicita tu plaza en Planes',
    priceLock: 'Si entras como FOUNDER conservas ese precio para siempre mientras mantengas la suscripción activa.'
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
  function todayYmd() {
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  /** Plazas FOUNDER pedibles: flag seatsOpen y fecha ≤ closeDate. */
  function founderSeatsOpen() {
    var f = founderCfg();
    if (!f || f.seatsOpen === false) return false;
    var close = f.closeDate;
    if (!close) return true;
    return todayYmd() <= String(close);
  }
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function founderBannerHtml() {
    var f = founderCfg();
    if (!f || !founderSeatsOpen()) return '';
    return '<div class="promo-banner founder-banner" role="note">' +
      '<p class="promo-banner-kicker">' + esc(f.kicker || 'FOUNDER · solo octubre') + '</p>' +
      '<p class="promo-banner-title"><strong>' + esc(f.title || ('Plan FOUNDER · ' + (f.discount || '40%') + ' dto. para siempre')) + '</strong></p>' +
      '<p class="promo-banner-note muted-text"><strong>' +
      esc(f.urgencyNote || ('FOUNDER solo está abierto en octubre. El ' + (f.closeLabel || '31 de octubre') + ' se cierra para siempre.')) +
      '</strong> · <strong>' + esc(f.seatsNote || 'Plazas limitadas') + '</strong>. ' +
      esc(f.priorityNote || '') +
      '</p>' +
      '<p class="promo-banner-note muted-text">' + esc(f.note || '') + '</p>' +
      '</div>';
  }
  function founderStripHtml(opts) {
    var f = founderCfg();
    if (!f || !founderSeatsOpen()) return '';
    opts = opts || {};
    var href = opts.href || '#landing-pricing';
    var cta = opts.cta || f.ctaPlanes || 'Solicita tu plaza en Planes';
    var ctaAttr = opts.ctaAttr || '';
    var discount = String(f.discount || '40%').replace(/^−|^-/, '');
    var closeLabel = f.closeLabel || '31 de octubre';
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
      '<p class="founder-promo-lead">Solo abierto en <strong>octubre</strong> · se cierra el <strong>' +
      esc(closeLabel) + '</strong> para siempre · ' + esc(f.seatsNote || 'Plazas limitadas') +
      ' · Study y Coach</p>' +
      '</div>' + ctaTag +
      '</div></aside>';
  }
  function founderPillHtml() {
    return founderStripHtml({ href: '#landing-pricing' });
  }
  function founderNavBadgeHtml() {
    if (!founderSeatsOpen()) return '';
    return '<span class="founder-nav-badge" aria-hidden="true">−40%</span>';
  }
  global.PTBillingPromo = {
    active: function () { return founderSeatsOpen(); },
    config: function () { return null; },
    purchasesPaused: purchasesPaused,
    founderSeatsOpen: founderSeatsOpen,
    founder: founderCfg,
    founderBannerHtml: founderBannerHtml,
    founderStripHtml: founderStripHtml,
    founderNavBadgeHtml: founderNavBadgeHtml,
    homePromoHtml: function () {
      return founderStripHtml({
        button: true,
        cta: 'Ver FOUNDER en Planes',
        ctaAttr: ' data-go-tab="pricing"'
      });
    },
    pillHtml: function () {
      return founderSeatsOpen() ? founderPillHtml() : '';
    },
    bannerHtml: function () {
      return founderSeatsOpen() ? founderBannerHtml() : '';
    }
  };
})(window);
