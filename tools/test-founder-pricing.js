/* Precios FOUNDER: tarifa habitual tachada + precio FOUNDER destacado en la
   landing sin registro y en la pestaña Planes. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const billingCfgSrc = read('js/billing-config.js');
const billingCfgExSrc = read('js/billing-config.example.js');
const pricingViewSrc = read('js/pricing-view.js');
const landingSrc = read('js/landing.js');
const appSrc = read('js/app.js');
const i18nSrc = read('js/i18n.js');
const css = read('css/styles.css');
const html = read('index.html');

// Tabla comercial vigente: [mensual, anual/mes, anual, FOUNDER mensual,
// FOUNDER anual/mes, FOUNDER anual].
const TABLE = {
  pro: ['14,99', '9,92', '119', '8,99', '5,95', '71,40'],
  premium: ['34,99', '23,25', '279', '20,99', '13,95', '167,40']
};

function loadPricing(src) {
  const sandbox = { console };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'billing-config.js' });
  vm.runInContext(pricingViewSrc, sandbox, { filename: 'pricing-view.js' });
  return sandbox;
}

// --- Config: los seis importes de cada plan están declarados -----------------
[['js/billing-config.js', billingCfgSrc], ['js/billing-config.example.js', billingCfgExSrc]]
  .forEach(function ([name, src]) {
    const sb = loadPricing(src);
    Object.keys(TABLE).forEach(function (planId) {
      const p = sb.PT_BILLING.plans[planId];
      const got = [p.monthly, p.yearlyPerMonth, p.yearly,
        p.founderMonthly, p.founderYearlyPerMonth, p.founderYearly];
      assert.deepStrictEqual(got, TABLE[planId], name + ' → precios de ' + planId);
    });
    assert.ok(/para siempre/i.test(sb.PT_BILLING.founder.priceLock || ''),
      name + ' → founder.priceLock promete el precio para siempre');
  });

// --- Render sin i18n: cae a español, nunca a claves crudas -------------------
const sb = loadPricing(billingCfgSrc);
assert.ok(sb.PTPricing && sb.PTPricing.planPriceHtml, 'PTPricing.planPriceHtml');

Object.keys(TABLE).forEach(function (planId) {
  const out = sb.PTPricing.planPriceHtml(planId);
  TABLE[planId].forEach(function (n) {
    assert.ok(out.indexOf(n) >= 0, planId + ' muestra ' + n);
  });
  const [monthly, yearlyPerMonth, yearly, fMonthly, fYearlyPerMonth, fYearly] = TABLE[planId];
  // La tarifa habitual va tachada; la FOUNDER, en el importe grande.
  [monthly, yearlyPerMonth, yearly].forEach(function (n) {
    assert.ok(out.indexOf('<s class="price-strike">' + n) >= 0, planId + ' tacha ' + n);
  });
  [fMonthly, fYearlyPerMonth].forEach(function (n) {
    assert.ok(out.indexOf('<span class="price-amount">' + n) >= 0, planId + ' destaca ' + n);
  });
  assert.ok(out.indexOf('<s class="price-strike">' + fMonthly) < 0, planId + ' no tacha el precio FOUNDER');
  assert.ok(out.indexOf(fYearly + '&nbsp;€/año') >= 0 || out.indexOf(fYearly + ' €/año') >= 0,
    planId + ' muestra el total anual FOUNDER');
  assert.ok(out.indexOf('Hazte <strong>FOUNDER</strong> y lo tendrás por') >= 0, planId + ' reclamo FOUNDER');
  assert.ok(out.indexOf('−40%') >= 0, planId + ' badge de descuento');
  assert.ok(/Pagando mensual[\s\S]*Pagando anual/.test(out), planId + ' distingue mensual y anual');
  assert.ok(/Para siempre[\s\S]*para siempre/i.test(out), planId + ' promete el precio para siempre');
  assert.ok(out.indexOf('price.') < 0, planId + ' sin claves i18n crudas');
});

// Founder ya concedido: el reclamo pasa a confirmación, los precios siguen.
const owned = sb.PTPricing.planPriceHtml('pro', { owned: true });
assert.ok(owned.indexOf('Tu precio FOUNDER es') >= 0, 'founder concedido ve su precio');
assert.ok(owned.indexOf('8,99') >= 0 && owned.indexOf('5,95') >= 0, 'founder concedido ve los importes');

// Con las compras abiertas no se anuncia FOUNDER: solo la tarifa habitual.
sb.PT_BILLING.purchasesPaused = false;
const open = sb.PTPricing.planPriceHtml('pro');
assert.ok(open.indexOf('FOUNDER') < 0, 'sin pausa no se anuncia FOUNDER');
assert.ok(open.indexOf('14,99') >= 0 && open.indexOf('9,92') >= 0 && open.indexOf('119') >= 0,
  'sin pausa se ven mensual y anual');
assert.ok(open.indexOf('price-strike') < 0, 'sin pausa no hay precio tachado');

// --- Cableado de las dos superficies ----------------------------------------
assert.ok(/js\/pricing-view\.js/.test(html), 'index.html carga pricing-view.js');
assert.ok(html.indexOf("'js/pricing-view.js'") < html.indexOf("'js/landing.js'"),
  'pricing-view.js se carga antes que landing.js');
assert.ok(/PTPricing/.test(landingSrc), 'landing usa PTPricing');
assert.ok(/priceHtml\('pro'/.test(landingSrc) && /priceHtml\('premium'/.test(landingSrc),
  'landing pinta el bloque de Study y Coach');
assert.ok(/pricingPriceHtml\('pro'/.test(appSrc) && /pricingPriceHtml\('premium'/.test(appSrc),
  'Planes pinta el bloque de Study y Coach');
assert.ok(/is_founder_study/.test(appSrc) && /is_founder_coach/.test(appSrc),
  'Planes distingue al founder ya concedido');

// Copia estática de respaldo: la tabla completa también en texto plano.
[].concat(TABLE.pro, TABLE.premium).forEach(function (n) {
  assert.ok(html.indexOf(n) >= 0, 'index.html menciona el precio ' + n);
});
assert.ok(/para siempre/i.test(html), 'index.html promete el precio para siempre');

// --- Publicidad Founder: hosts landing + Inicio + helpers --------------------
assert.ok(/id="landing-promo-pill"/.test(html), 'host landing-promo-pill tras hero');
assert.ok(/landing-founder-promo-host hidden/.test(html) || /id="landing-promo-pill"[^>]*\bhidden\b/.test(html),
  'landing promo empieza oculto (evita flash post-login)');
assert.ok(/id="home-founder-promo"/.test(html), 'host home-founder-promo en Inicio');
assert.ok(/próximas semanas/i.test(billingCfgSrc), 'config: lanzamiento próximas semanas');
assert.ok(/ctaPlanes/.test(billingCfgSrc), 'config: ctaPlanes');
assert.ok(/founderStripHtml|homePromoHtml|founderNavBadgeHtml/.test(billingCfgSrc),
  'PTBillingPromo strip/home/nav helpers');
assert.ok(/founder-promo-title|founder-promo-brand/.test(billingCfgSrc),
  'strip Founder con título/marca visibles');
assert.ok(/pillHost\.innerHTML/.test(landingSrc) && /shouldShowLandingPromo|PT_AUTH_BOOT_DONE|pt_auth_v1/.test(landingSrc),
  'landing rellena promo solo tras auth boot / sin sesión');
assert.ok(/pt-auth-boot-done/.test(landingSrc), 'landing escucha pt-auth-boot-done');
assert.ok(/landing-promo-pill/.test(landingSrc) && /showPricing === false/.test(landingSrc),
  'landing oculta strip si comunidad sin pricing');
assert.ok(/mountHomeFounderPromo/.test(appSrc), 'app monta promo Founder en Inicio');
assert.ok(/isLoaded/.test(appSrc) && /pt-entitlements-updated/.test(appSrc),
  'home promo espera entitlements y se remonta al actualizar');
assert.ok(/markFounderPricingTabBadge|founderNavBadgeHtml/.test(appSrc),
  'app marca badge en tab Planes');
assert.ok(/\.founder-promo-strip/.test(css) && /\.founder-nav-badge/.test(css),
  'CSS strip y badge Founder');
assert.ok(/\.founder-promo-title/.test(css) && /\.founder-promo-brand/.test(css),
  'CSS título y marca Founder');

const promoSb = loadPricing(billingCfgSrc);
assert.ok(promoSb.PTBillingPromo.homePromoHtml().indexOf('Ir a Planes') >= 0,
  'homePromoHtml CTA Ir a Planes');
assert.ok(promoSb.PTBillingPromo.pillHtml().indexOf('founder-promo-strip') >= 0,
  'pillHtml es la banda Founder');
assert.ok(promoSb.PTBillingPromo.pillHtml().indexOf('founder-promo-title') >= 0,
  'pillHtml incluye título de oferta');
assert.ok(promoSb.PTBillingPromo.founderNavBadgeHtml().indexOf('−40%') >= 0,
  'nav badge −40%');
promoSb.PT_BILLING.purchasesPaused = false;
assert.strictEqual(promoSb.PTBillingPromo.homePromoHtml(), '', 'sin pausa no hay promo home');
assert.strictEqual(promoSb.PTBillingPromo.founderNavBadgeHtml(), '', 'sin pausa no hay badge');

// --- i18n y estilos ----------------------------------------------------------
['price.usual', 'price.monthly', 'price.annual', 'price.founder.lead', 'price.forever']
  .forEach(function (key) {
    const hits = i18nSrc.split("'" + key + "'").length - 1;
    assert.strictEqual(hits, 2, 'i18n define ' + key + ' en es y en');
  });
['.price-block', '.price-strike', '.price-founder-option', '.price-amount', '.price-forever']
  .forEach(function (sel) {
    assert.ok(css.indexOf(sel) >= 0, 'styles.css define ' + sel);
  });

console.log('*** founder-pricing OK (tabla completa, FOUNDER destacado) ***');
