#!/usr/bin/env node
/**
 * Crea productos/precios en Stripe (suscripciones + bonos IA), webhook y secrets en Supabase.
 */
'use strict';

const { execSync } = require('child_process');
const https = require('https');

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
const SITE_URL = (process.env.PT_SITE_URL || 'https://joserra15.github.io/PokerTrainer').replace(/\/$/, '');
const PROJECT = process.env.SUPABASE_PROJECT || 'wrkupbxttqrpdpoztcky';
const WEBHOOK_URL = `https://${PROJECT}.supabase.co/functions/v1/stripe-webhook`;

const PLANS = [
  { key: 'pro', name: 'PokerTrainer Study', monthly: 1499, yearly: 11900 },
  { key: 'premium', name: 'PokerTrainer Coach', monthly: 3499, yearly: 27900 }
];

const BONUS_TIERS = [
  { tier: 'free', product: 'PokerTrainer IA Bono (Gratis)', packs: { s: 799, m: 1399, l: 2299 } },
  { tier: 'study', product: 'PokerTrainer IA Bono (Study)', packs: { s: 599, m: 999, l: 1599 } },
  { tier: 'coach', product: 'PokerTrainer IA Bono (Coach)', packs: { s: 399, m: 699, l: 1199 } }
];

function stripeRequest(method, path, params) {
  return new Promise((resolve, reject) => {
    const body = params ? new URLSearchParams(params).toString() : '';
    const req = https.request({
      hostname: 'api.stripe.com',
      path: '/v1' + path,
      method,
      headers: {
        Authorization: 'Bearer ' + STRIPE_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) reject(new Error(json.error?.message || data));
          else resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function findOrCreateProduct(name) {
  const list = await stripeRequest('GET', '/products?active=true&limit=100');
  const found = (list.data || []).find((p) => p.name === name);
  if (found) return found.id;
  const created = await stripeRequest('POST', '/products', {
    name,
    'metadata[app]': 'PokerTrainer'
  });
  return created.id;
}

async function findOrCreateRecurringPrice(productId, amount, interval) {
  const list = await stripeRequest('GET', `/prices?product=${productId}&active=true&limit=100`);
  const found = (list.data || []).find((p) =>
    p.unit_amount === amount &&
    p.currency === 'eur' &&
    p.recurring?.interval === interval
  );
  if (found) return found.id;
  const created = await stripeRequest('POST', '/prices', {
    product: productId,
    unit_amount: String(amount),
    currency: 'eur',
    'recurring[interval]': interval,
    'recurring[interval_count]': '1'
  });
  return created.id;
}

async function findOrCreateOneTimePrice(productId, amount, pack, tier) {
  const list = await stripeRequest('GET', `/prices?product=${productId}&active=true&limit=100`);
  const found = (list.data || []).find((p) =>
    p.unit_amount === amount &&
    p.currency === 'eur' &&
    !p.recurring &&
    p.metadata?.bonus_pack === pack &&
    p.metadata?.bonus_tier === tier
  );
  if (found) return found.id;
  const created = await stripeRequest('POST', '/prices', {
    product: productId,
    unit_amount: String(amount),
    currency: 'eur',
    'metadata[bonus_pack]': pack,
    'metadata[bonus_tier]': tier,
    'metadata[purchase_type]': 'ai_bonus'
  });
  return created.id;
}

async function findOrCreateWebhook() {
  const list = await stripeRequest('GET', '/webhook_endpoints?limit=100');
  const found = (list.data || []).find((w) => w.url === WEBHOOK_URL);
  if (found) return found.secret;
  const created = await stripeRequest('POST', '/webhook_endpoints', {
    url: WEBHOOK_URL,
    'enabled_events[0]': 'checkout.session.completed',
    'enabled_events[1]': 'customer.subscription.updated',
    'enabled_events[2]': 'customer.subscription.deleted',
    'enabled_events[3]': 'invoice.paid'
  });
  return created.secret;
}

function setSupabaseSecret(name, value) {
  execSync(`supabase secrets set ${name}=${value}`, { stdio: 'inherit', shell: true });
}

async function main() {
  if (!STRIPE_KEY || !STRIPE_KEY.startsWith('sk_')) {
    console.error('Falta STRIPE_SECRET_KEY (sk_test_... o sk_live_...)');
    process.exit(1);
  }

  console.log('Proyecto Supabase:', PROJECT);
  console.log('Webhook URL:', WEBHOOK_URL);
  console.log('Site URL:', SITE_URL);

  const priceIds = {};
  const bonusIds = {};

  for (const plan of PLANS) {
    const productId = await findOrCreateProduct(plan.name);
    priceIds[plan.key + '_monthly'] = await findOrCreateRecurringPrice(productId, plan.monthly, 'month');
    priceIds[plan.key + '_yearly'] = await findOrCreateRecurringPrice(productId, plan.yearly, 'year');
    console.log(plan.name, '→', priceIds[plan.key + '_monthly'], priceIds[plan.key + '_yearly']);
  }

  for (const tier of BONUS_TIERS) {
    const productId = await findOrCreateProduct(tier.product);
    for (const pack of ['s', 'm', 'l']) {
      const key = 'STRIPE_BONUS_' + tier.tier.toUpperCase() + '_' + pack.toUpperCase();
      bonusIds[key] = await findOrCreateOneTimePrice(productId, tier.packs[pack], pack, tier.tier);
      console.log(tier.product, pack.toUpperCase(), '→', bonusIds[key]);
    }
  }

  const webhookSecret = await findOrCreateWebhook();
  console.log('Webhook secret obtenido');

  setSupabaseSecret('STRIPE_SECRET_KEY', STRIPE_KEY);
  setSupabaseSecret('STRIPE_WEBHOOK_SECRET', webhookSecret);
  setSupabaseSecret('STRIPE_PRICE_PRO_MONTHLY', priceIds.pro_monthly);
  setSupabaseSecret('STRIPE_PRICE_PRO_YEARLY', priceIds.pro_yearly);
  setSupabaseSecret('STRIPE_PRICE_PREMIUM_MONTHLY', priceIds.premium_monthly);
  setSupabaseSecret('STRIPE_PRICE_PREMIUM_YEARLY', priceIds.premium_yearly);
  setSupabaseSecret('PT_SITE_URL', SITE_URL);

  Object.keys(bonusIds).forEach(function (k) {
    setSupabaseSecret(k, bonusIds[k]);
  });

  console.log('\nSecrets configurados (suscripciones + 9 bonos IA).');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
