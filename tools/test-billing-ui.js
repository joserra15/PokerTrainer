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
  purchasesPaused: false,
  trial: { days: 10, plan: 'pro' },
  founder: {
    seatsOpen: true,
    launchLabel: 'octubre',
    closeDate: '2099-10-31',
    closeLabel: '31 de octubre',
    discount: '40%',
    seatsNote: 'Plazas limitadas por petición',
    urgencyNote: 'FOUNDER solo está abierto en octubre. El 31 de octubre se cierra para siempre.',
    priorityNote: 'Solicita plaza FOUNDER Study o Coach.'
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
assert.ok(B.purchasesPaused && !B.purchasesPaused(), 'purchasesPaused desactivado');
assert.ok(B.founderSeatsOpen && B.founderSeatsOpen(), 'plazas FOUNDER abiertas');
B.showPaywall('trainer_limit');
assert.ok(!docEls['paywall-modal'].classList.contains('hidden'), 'modal visible');
assert.ok(bodyClass.has('paywall-open'), 'body paywall-open');
assert.ok(/plan|manos|Gratis|FOUNDER|octubre|plazas limitadas/i.test(docEls['paywall-body'].innerHTML + docEls['paywall-title'].textContent),
  'mensaje paywall');
assert.ok(/para siempre|31 de octubre|solo octubre/i.test(docEls['paywall-body'].innerHTML),
  'paywall urgencia FOUNDER octubre');

B.showPaywall('ai_limit');
assert.ok(/ForgeCoach|IA|FOUNDER|consultas/i.test(docEls['paywall-body'].innerHTML), 'ai_limit menciona IA/FOUNDER');

const trial = B.trialInfo && B.trialInfo();
if (trial) {
  assert.strictEqual(trial.plan, 'pro');
  assert.strictEqual(trial.days, 10);
}

assert.ok(/purchasesPaused|founder|seatsOpen/.test(billingCfgEx), 'billing-config.example documenta pause/FOUNDER');
assert.ok(!/SUMMER26/.test(billingCfgEx), 'billing-config.example sin SUMMER26');

// functionsUrl no debe llevar project ref scrubbed (rompe fetch → stripe-portal)
const billingCfgSrc = fs.readFileSync(path.join(root, 'js/billing-config.js'), 'utf8');
assert.ok(!/functionsUrl:\s*'[^']*\[REDACTED\]/.test(billingCfgSrc), 'billing-config sin [REDACTED] en functionsUrl');
assert.ok(!/functionsUrl:\s*'https:\/\/[^']*supabase\.co/.test(billingCfgSrc),
  'billing-config no hardcodea project ref (usar PT_SUPABASE.url)');
assert.ok(/isValidFunctionsBase/.test(billingSrc), 'billing.js valida functionsUrl');
assert.ok(/functionsUrl:\s*''/.test(billingCfgSrc), 'functionsUrl vacío; se deriva en runtime');

// Derive: functionsUrl vacío o scrubbed → PT_SUPABASE.url/functions/v1
(async function testFunctionsUrlFallback() {
  async function runCase(functionsUrl) {
    const fetchCalls = [];
    const box = {
      window: {
        PT_BILLING: {
          enabled: true,
          purchasesPaused: false,
          functionsUrl: functionsUrl,
          plans: {},
          trial: { days: 10, plan: 'pro' }
        },
        PT_SUPABASE: { url: 'https://abcdefghijklmnopqr.supabase.co', anonKey: 'test-anon' },
        PTSupabase: {
          useAuth: () => true,
          getAccessToken: async () => 'tok'
        },
        open() { return { closed: false }; },
        location: { href: '' }
      },
      console,
      document: sandbox.document,
      URL,
      fetch: async (url) => {
        fetchCalls.push(String(url));
        return { ok: true, json: async () => ({ url: 'https://billing.example/portal' }) };
      },
      addEventListener() {},
      dispatchEvent() { return true; }
    };
    box.global = box;
    box.window.document = box.document;
    box.window.addEventListener = box.addEventListener;
    box.window.dispatchEvent = box.dispatchEvent;
    box.window.URL = URL;
    box.window.fetch = box.fetch;
    vm.createContext(box);
    vm.runInContext(billingSrc, box, { filename: 'billing.js' });
    assert.ok(box.window.PTBilling.enabled(), 'billing enabled con derive');
    await box.window.PTBilling.openPortal();
    assert.strictEqual(
      fetchCalls[0],
      'https://abcdefghijklmnopqr.supabase.co/functions/v1/stripe-portal',
      'openPortal deriva PT_SUPABASE.url cuando functionsUrl=' + JSON.stringify(functionsUrl)
    );
  }

  await runCase('');
  await runCase('https://[REDACTED].supabase.co/functions/v1');
})().then(function () {
  console.log('*** billing-ui OK (paywall markers + no price leak) ***');
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});
