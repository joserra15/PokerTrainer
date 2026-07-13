const STRIPE_API = 'https://api.stripe.com/v1';

export const BONUS_PACKS = {
  s: { credits: 10, label: 'Pack S' },
  m: { credits: 20, label: 'Pack M' },
  l: { credits: 40, label: 'Pack L' }
} as const;

export type BonusPack = keyof typeof BONUS_PACKS;
export type BonusTier = 'free' | 'study' | 'coach';

export function stripeKey(): string {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return key;
}

export function siteUrl(): string {
  return (Deno.env.get('PT_SITE_URL') || 'https://www.pokerforgeai.com').replace(/\/$/, '');
}

export function priceId(plan: string, interval: string): string {
  const map: Record<string, string | undefined> = {
    'pro_month': Deno.env.get('STRIPE_PRICE_PRO_MONTHLY'),
    'pro_year': Deno.env.get('STRIPE_PRICE_PRO_YEARLY'),
    'premium_month': Deno.env.get('STRIPE_PRICE_PREMIUM_MONTHLY'),
    'premium_year': Deno.env.get('STRIPE_PRICE_PREMIUM_YEARLY')
  };
  const id = map[plan + '_' + interval];
  if (!id) throw new Error('price_not_configured');
  return id;
}

export function bonusPriceId(tier: BonusTier, pack: BonusPack): string {
  const key = 'STRIPE_BONUS_' + tier.toUpperCase() + '_' + pack.toUpperCase();
  const id = Deno.env.get(key);
  if (!id) throw new Error('bonus_price_not_configured:' + key);
  return id;
}

export function planToBonusTier(plan: string): BonusTier {
  if (plan === 'premium') return 'coach';
  if (plan === 'pro') return 'study';
  return 'free';
}

export function bonusTierFromPriceId(priceId: string): { tier: BonusTier; pack: BonusPack } | null {
  const tiers: BonusTier[] = ['free', 'study', 'coach'];
  const packs: BonusPack[] = ['s', 'm', 'l'];
  for (const tier of tiers) {
    for (const pack of packs) {
      const envKey = 'STRIPE_BONUS_' + tier.toUpperCase() + '_' + pack.toUpperCase();
      if (Deno.env.get(envKey) === priceId) {
        return { tier, pack };
      }
    }
  }
  return null;
}

export function planFromPriceId(priceId: string): { plan: string; interval: string } | null {
  const pairs: Array<[string, string | undefined]> = [
    ['pro', Deno.env.get('STRIPE_PRICE_PRO_MONTHLY')],
    ['pro', Deno.env.get('STRIPE_PRICE_PRO_YEARLY')],
    ['premium', Deno.env.get('STRIPE_PRICE_PREMIUM_MONTHLY')],
    ['premium', Deno.env.get('STRIPE_PRICE_PREMIUM_YEARLY')]
  ];
  const intervals = ['month', 'year', 'month', 'year'];
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i][1] === priceId) {
      return { plan: pairs[i][0]!, interval: intervals[i]! };
    }
  }
  return null;
}

export function isStripeMissingResourceError(message: string): boolean {
  const m = String(message || '').toLowerCase();
  return m.includes('no such customer') ||
    m.includes('no such subscription') ||
    m.includes('resource_missing');
}

export async function fetchStripeCustomer(customerId: string): Promise<Record<string, unknown> | null> {
  try {
    const customer = await stripeRequest('/customers/' + encodeURIComponent(customerId), 'GET');
    return customer?.id ? customer : null;
  } catch (e) {
    if (isStripeMissingResourceError((e as Error).message)) return null;
    throw e;
  }
}

export async function createStripeCustomer(userId: string, email: string): Promise<string> {
  const customer = await stripeRequest('/customers', 'POST', {
    email: email || '',
    'metadata[supabase_user_id]': userId
  });
  return customer.id as string;
}

export async function clearStaleStripeIds(
  admin: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.49.1').createClient>,
  userId: string
): Promise<void> {
  await admin.from('pt_user_profiles').update({
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_status: null,
    subscription_period_end: null,
    billing_interval: null,
    subscription_cancel_at_period_end: false
  }).eq('user_id', userId);
}

export async function ensureStripeCustomer(
  admin: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.49.1').createClient>,
  userId: string,
  email: string,
  existingId: string | null
): Promise<string> {
  if (existingId) {
    const customer = await fetchStripeCustomer(existingId);
    if (customer?.id) return existingId;
    await clearStaleStripeIds(admin, userId);
  }

  const customerId = await createStripeCustomer(userId, email);
  await admin.rpc('pt_set_stripe_customer', {
    p_user_id: userId,
    p_customer_id: customerId
  });
  return customerId;
}

export async function stripeRequest(
  path: string,
  method: string,
  params?: Record<string, string>
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {
    Authorization: 'Bearer ' + stripeKey()
  };
  let body: string | undefined;
  if (params && method !== 'GET') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(params).toString();
  }
  const res = await fetch(STRIPE_API + path, { method, headers, body });
  const data = await res.json();
  if (!res.ok) {
    const msg = (data as { error?: { message?: string } })?.error?.message || 'stripe_error';
    throw new Error(msg);
  }
  return data as Record<string, unknown>;
}

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
  });
}
