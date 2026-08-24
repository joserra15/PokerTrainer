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
