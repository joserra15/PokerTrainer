/* RG-C06 — Marcadores UI billing / paywall; sin price IDs secretos en HTML. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const billingSrc = fs.readFileSync(path.join(root, 'js/billing.js'), 'utf8');
const billingCfgEx = fs.readFileSync(path.join(root, 'js/billing-config.example.js'), 'utf8');

assert.ok(/id="paywall-modal"/.test(html), 'paywall-modal en HTML');
assert.ok(/id="paywall-title"/.test(html), 'paywall-title');
assert.ok(/id="paywall-body"/.test(html), 'paywall-body');
assert.ok(/id="paywall-to-pricing"/.test(html), 'paywall-to-pricing');
assert.ok(/data-close-paywall/.test(html), 'close paywall');
assert.ok(/id="pricing-grid"/.test(html), 'pricing-grid');
assert.ok(/data-tab="pricing"/.test(html), 'tab pricing');

// No price_ live/test IDs embebidos en HTML o billing.js cliente
assert.ok(!/price_[A-Za-z0-9]{10,}/.test(html), 'HTML sin price_… de Stripe');
assert.ok(!/price_[A-Za-z0-9]{10,}/.test(billingSrc), 'billing.js sin price_… hardcoded');
assert.ok(/startCheckout|openPortal|showPaywall/.test(billingSrc), 'API billing');
assert.ok(/trainer_limit|import_limit|ai_limit|ai_plan/.test(billingSrc), 'MESSAGES paywall');

// Config de ejemplo documenta prices vía env/secrets, no secrets reales
assert.ok(/PT_BILLING|enabled/.test(billingCfgEx), 'billing-config.example');

// Runtime showPaywall con DOM mínimo
const docEls = {};
function makeEl(id) {
  const el = {
    id,
    classList: {
      _set: new Set(id === 'paywall-modal' ? ['hidden'] : []),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      contains(c) { return this._set.has(c); }
    },
    textContent: '',
    innerHTML: '',
    dataset: {},
    style: {},
    addEventListener() {},
    closest() { return null; }
  };
  docEls[id] = el;
  return el;
}
['paywall-modal', 'paywall-title', 'paywall-body', 'paywall-to-pricing'].forEach(makeEl);

const bodyClass = new Set();
const founderCfg = {
  enabled: false,
  purchasesPaused: true,
  trial: { days: 10, plan: 'pro' },
  founder: {
    launchLabel: '15 de noviembre de 2026',
    discount: '40%',
    seatsNote: 'Plazas limitadas',
    priorityNote: 'Prioridad para usuarios ya registrados que lo soliciten.'
  }
};
const sandbox = {
  window: {
    PT_BILLING: Object.assign({}, founderCfg)
  },
  console,
  document: {
    body: {
      classList: {
        add: (c) => bodyClass.add(c),
        remove: (c) => bodyClass.delete(c),
        contains: (c) => bodyClass.has(c)
      }
    },
    getElementById: (id) => docEls[id] || null
  },
  fetch: async () => ({ ok: false, json: async () => ({}) }),
  addEventListener() {},
  dispatchEvent() { return true; }
};
sandbox.global = sandbox;
sandbox.window = Object.assign(sandbox.window, {
  document: sandbox.document,
  addEventListener: sandbox.addEventListener,
  dispatchEvent: sandbox.dispatchEvent,
  PT_BILLING: sandbox.window.PT_BILLING
});
// billing IIFE uses global === window
sandbox.window.PT_BILLING = Object.assign({}, founderCfg);
vm.createContext(sandbox);
vm.runInContext(billingSrc, sandbox, { filename: 'billing.js' });

const B = sandbox.window.PTBilling;
assert.ok(B && B.showPaywall, 'PTBilling.showPaywall');
assert.ok(B.purchasesPaused && B.purchasesPaused(), 'purchasesPaused activo');
B.showPaywall('trainer_limit');
assert.ok(!docEls['paywall-modal'].classList.contains('hidden'), 'modal visible');
assert.ok(bodyClass.has('paywall-open'), 'body paywall-open');
assert.ok(/plan|manos|Gratis|FOUNDER|noviembre/i.test(docEls['paywall-body'].innerHTML + docEls['paywall-title'].textContent),
  'mensaje paywall');

B.showPaywall('ai_limit');
assert.ok(/ForgeCoach|IA|FOUNDER|consultas/i.test(docEls['paywall-body'].innerHTML), 'ai_limit menciona IA/FOUNDER');

const trial = B.trialInfo && B.trialInfo();
if (trial) {
  assert.strictEqual(trial.plan, 'pro');
  assert.strictEqual(trial.days, 10);
}

assert.ok(/purchasesPaused|founder/.test(billingCfgEx), 'billing-config.example documenta pause/FOUNDER');

console.log('*** billing-ui OK (paywall markers + no price leak) ***');
