/*
 * pricing-view.js — Bloque de precios compartido por la landing sin registro
 * (js/landing.js) y la pestaña Planes de la app (js/app.js).
 *
 * Muestra la tarifa habitual tachada y, debajo y en grande, el precio FOUNDER
 * mensual y anual (con su equivalente por mes), más el aviso de precio
 * bloqueado para siempre. Los importes salen de PT_BILLING.plans; los textos
 * pasan por PTI18n cuando está cargado y caen a español si no lo está.
 */
(function (global) {
  'use strict';

  function billing() {
    return global.PT_BILLING || {};
  }

  function founderCfg() {
    var f = billing().founder;
    return f && typeof f === 'object' ? f : {};
  }

  function purchasesPaused() {
    return !!billing().purchasesPaused;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fill(text, vars) {
    if (!vars) return String(text);
    return String(text).replace(/\{(\w+)\}/g, function (m, k) {
      return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m;
    });
  }

  /** Traduce con PTI18n si está disponible; si falta la clave usa el texto español. */
  function tr(key, fallback, vars) {
    var i18n = global.PTI18n;
    var out = (i18n && typeof i18n.t === 'function') ? i18n.t(key, vars) : key;
    if (!out || out === key) out = fill(fallback, vars);
    return out;
  }

  function planCfg(planId) {
    var plans = billing().plans || {};
    return plans[planId] || null;
  }

  /** true cuando el plan tiene tarifa FOUNDER configurada y la oferta sigue viva. */
  function hasFounderPricing(planId) {
    var p = planCfg(planId);
    return !!(p && p.founderMonthly && purchasesPaused());
  }

  function amount(value, period) {
    return '<span class="price-amount">' + esc(value) + '&nbsp;€' +
      (period ? '<small>' + esc(period) + '</small>' : '') + '</span>';
  }

  function strike(value, period) {
    return '<s class="price-strike">' + esc(value) + '&nbsp;€' + esc(period || '') + '</s>';
  }

  function perMonth() {
    return tr('price.perMonth', '/mes');
  }

  function perYear() {
    return tr('price.perYear', '/año');
  }

  function usualBlockHtml(p) {
    var rows = '<span class="price-usual-row">' +
      '<span class="price-usual-term">' + esc(tr('price.monthly', 'Pagando mensual')) + '</span>' +
      strike(p.monthly, perMonth()) +
      '</span>';
    if (p.yearlyPerMonth && p.yearly) {
      rows += '<span class="price-usual-row">' +
        '<span class="price-usual-term">' + esc(tr('price.annual', 'Pagando anual')) + '</span>' +
        '<span class="price-usual-values">' +
        strike(p.yearlyPerMonth, perMonth()) +
        ' (' + strike(p.yearly, perYear()) + ')</span>' +
        '</span>';
    }
    return '<div class="price-usual">' +
      '<span class="price-usual-label">' + esc(tr('price.usual', 'Precio habitual')) + '</span>' +
      rows +
      '</div>';
  }

  function founderOptionsHtml(p) {
    var html = '<div class="price-founder-option">' +
      '<span class="price-option-term">' + esc(tr('price.monthly', 'Pagando mensual')) + '</span>' +
      amount(p.founderMonthly, perMonth()) +
      '</div>';
    if (p.founderYearlyPerMonth && p.founderYearly) {
      html += '<div class="price-founder-option is-best">' +
        '<span class="price-option-term">' + esc(tr('price.annual', 'Pagando anual')) +
        '<span class="price-best-badge">' + esc(tr('price.best', 'Mejor precio')) + '</span></span>' +
        amount(p.founderYearlyPerMonth, perMonth()) +
        '<span class="price-option-sub">' +
        esc(tr('price.annualBilled', '{price} €/año', { price: p.founderYearly })) +
        '</span>' +
        '</div>';
    }
    return '<div class="price-founder-grid">' + html + '</div>';
  }

  /**
   * Bloque de precios de un plan de pago.
   * @param {string} planId 'pro' | 'premium'
   * @param {{owned?: boolean}} [opts] owned: el usuario ya tiene la plaza FOUNDER.
   */
  function planPriceHtml(planId, opts) {
    var p = planCfg(planId);
    if (!p) return '';
    opts = opts || {};

    if (!hasFounderPricing(planId)) {
      var plain = '<div class="price-block price-block-plain">' +
        '<div class="price-main">' + amount(p.monthly, perMonth()) + '</div>';
      if (p.yearlyPerMonth && p.yearly) {
        plain += '<p class="price-annual-note">' +
          esc(tr('price.annualAlt', 'o {perMonth} €/mes pagando {yearly} €/año',
            { perMonth: p.yearlyPerMonth, yearly: p.yearly })) + '</p>';
      }
      return plain + '</div>';
    }

    var f = founderCfg();
    var lead;
    if (opts.owned) {
      lead = '<p class="price-founder-lead">' +
        esc(tr('price.founder.leadOwned', 'Tu precio FOUNDER es')) + '</p>';
    } else {
      lead = '<p class="price-founder-lead">' +
        esc(tr('price.founder.lead', 'Hazte {founder} y lo tendrás por'))
          .replace('{founder}', '<strong>FOUNDER</strong>') +
        '<span class="price-founder-badge">−' + esc(f.discount || '40%') + '</span></p>';
    }
    var lock = tr('price.forever', f.priceLock ||
      'Si entras como FOUNDER conservas ese precio mientras mantengas la suscripción activa.');

    return '<div class="price-block price-block-founder">' +
      usualBlockHtml(p) +
      lead +
      founderOptionsHtml(p) +
      '<p class="price-forever"><strong>' + esc(tr('price.forever.title', 'Para siempre')) + ':</strong> ' +
      esc(lock) + '</p>' +
      '</div>';
  }

  /** Bloque del plan Gratis: un solo importe, sin tarifa tachada. */
  function freePriceHtml() {
    return '<div class="price-block price-block-plain">' +
      '<div class="price-main">' + amount('0', perMonth()) + '</div>' +
      '</div>';
  }

  global.PTPricing = {
    planPrices: planCfg,
    hasFounderPricing: hasFounderPricing,
    planPriceHtml: planPriceHtml,
    freePriceHtml: freePriceHtml
  };
})(typeof window !== 'undefined' ? window : this);
