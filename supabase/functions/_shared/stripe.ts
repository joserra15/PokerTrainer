const STRIPE_API = 'https://api.stripe.com/v1';

export function stripeKey(): string {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return key;
}

export function siteUrl(): string {
  return (Deno.env.get('PT_SITE_URL') || 'https://joserra15.github.io/PokerTrainer').replace(/\/$/, '');
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
