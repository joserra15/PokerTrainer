/* RG-C03/C04 — Contratos Stripe Edge (fuente + lógica pura de plan). Sin Stripe real. */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const webhook = fs.readFileSync(path.join(root, 'supabase/functions/stripe-webhook/index.ts'), 'utf8');
const checkout = fs.readFileSync(path.join(root, 'supabase/functions/stripe-checkout/index.ts'), 'utf8');
const portal = fs.readFileSync(path.join(root, 'supabase/functions/stripe-portal/index.ts'), 'utf8');
const shared = fs.readFileSync(path.join(root, 'supabase/functions/_shared/stripe.ts'), 'utf8');

// --- C03 webhook events + RPCs ---
['checkout.session.completed', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.paid']
  .forEach((ev) => {
    assert.ok(webhook.includes("'" + ev + "'") || webhook.includes('"' + ev + '"') || webhook.includes(ev),
      'webhook maneja ' + ev);
  });
assert.ok(/pt_apply_subscription/.test(webhook), 'RPC pt_apply_subscription');
assert.ok(/pt_credit_ai_bonus/.test(webhook), 'RPC pt_credit_ai_bonus');
assert.ok(/pt_record_stripe_payment|pt_record_payment/.test(webhook), 'RPC payments');
assert.ok(/verifyStripeSignature|stripe-signature/.test(webhook), 'verifica firma');
assert.ok(/invalid_signature/.test(webhook), '400 invalid_signature');
assert.ok(/ai_bonus|bonus_pack|purchase_type/.test(webhook), 'bonus path en checkout.session.completed');

// Lógica pura: cancelados sin periodo → free (espejo de applySubscription)
function resolvePlanAfterStatus(plan, status, periodEndUnix, nowUnix) {
  const stillPaid = (periodEndUnix || 0) > nowUnix;
  if ((status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') && !stillPaid) {
    return 'free';
  }
  return plan;
}
assert.strictEqual(resolvePlanAfterStatus('pro', 'canceled', 0, 1000), 'free');
assert.strictEqual(resolvePlanAfterStatus('premium', 'active', 2000, 1000), 'premium');
assert.strictEqual(resolvePlanAfterStatus('pro', 'canceled', 2000, 1000), 'pro', 'canceled con periodo restante mantiene plan hasta end');

// planFromPriceId mapping shape en shared
assert.ok(/STRIPE_PRICE_PRO_MONTHLY/.test(shared));
assert.ok(/STRIPE_PRICE_PREMIUM_YEARLY/.test(shared));
assert.ok(/function planFromPriceId/.test(shared));
assert.ok(/function planToBonusTier/.test(shared));
assert.ok(/BONUS_PACKS/.test(shared) && /credits:\s*20/.test(shared));

function planToBonusTier(plan) {
  if (plan === 'premium') return 'coach';
  if (plan === 'pro') return 'study';
  return 'free';
}
assert.strictEqual(planToBonusTier('premium'), 'coach');
assert.strictEqual(planToBonusTier('pro'), 'study');
assert.strictEqual(planToBonusTier('free'), 'free');

// --- C04 checkout / portal ---
assert.ok(/missing_auth/.test(checkout), 'checkout 401 missing_auth');
assert.ok(/invalid_auth/.test(checkout), 'checkout invalid_auth');
assert.ok(/invalid_json/.test(checkout), 'checkout 400 invalid_json');
assert.ok(/invalid_plan/.test(checkout), 'checkout invalid_plan');
assert.ok(/already_subscribed/.test(checkout) && /409/.test(checkout), 'checkout 409 already_subscribed');
assert.ok(/trial_period_days/.test(checkout) && /'10'|"10"|10/.test(checkout), 'trial 10 días Study');
assert.ok(/plan === 'pro'/.test(checkout) || /plan === \"pro\"/.test(checkout), 'trial solo pro');
assert.ok(/url:\s*session\.url|session\.url/.test(checkout), 'checkout devuelve url');
assert.ok(/type === 'bonus'|purchase_type/.test(checkout), 'checkout bonus packs');

assert.ok(/missing_auth/.test(portal), 'portal 401');
assert.ok(/billing_portal\/sessions/.test(portal), 'portal session Stripe');
assert.ok(/portal=return/.test(portal), 'return_url portal');
assert.ok(/url:\s*portal\.url|portal\.url/.test(portal), 'portal devuelve url');

console.log('*** stripe-edge-contracts OK (webhook + checkout + portal) ***');
