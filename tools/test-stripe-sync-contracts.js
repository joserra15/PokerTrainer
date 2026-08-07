/* RG-C05 — Contratos stripe-sync-* (auth + shapes). Sin Stripe real. */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..', 'supabase/functions');
const files = [
  'stripe-sync-subscription/index.ts',
  'stripe-sync-payments/index.ts',
  'stripe-sync-my-payments/index.ts',
  'stripe-sync-bonus/index.ts'
];

files.forEach((rel) => {
  const src = fs.readFileSync(path.join(root, rel), 'utf8');
  assert.ok(/missing_auth/.test(src), rel + ' missing_auth');
  assert.ok(/invalid_auth/.test(src), rel + ' invalid_auth');
  assert.ok(/method_not_allowed/.test(src), rel + ' 405');
  assert.ok(/server_config/.test(src), rel + ' server_config');
  console.log('OK auth gates', rel);
});

const sub = fs.readFileSync(path.join(root, 'stripe-sync-subscription/index.ts'), 'utf8');
assert.ok(/ok:\s*true|ok:\s*!/.test(sub) || /\bok\b/.test(sub), 'subscription ok field');
assert.ok(/plan|subscription_id|synced/.test(sub), 'subscription success fields');

const pay = fs.readFileSync(path.join(root, 'stripe-sync-payments/index.ts'), 'utf8');
assert.ok(/forbidden|is_admin|admin/.test(pay), 'payments admin gate');
assert.ok(/updated|linked|errors/.test(pay), 'payments result shape');

const mine = fs.readFileSync(path.join(root, 'stripe-sync-my-payments/index.ts'), 'utf8');
assert.ok(/no_customer|recorded|sessions|invoices/.test(mine), 'my-payments shape');

const bonus = fs.readFileSync(path.join(root, 'stripe-sync-bonus/index.ts'), 'utf8');
assert.ok(/credited|scope|balance|skipped/.test(bonus), 'bonus sync shape');
assert.ok(/all/.test(bonus), 'bonus all flag');

console.log('*** stripe-sync-contracts OK ***');
