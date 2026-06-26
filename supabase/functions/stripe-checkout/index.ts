import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { cors, json, priceId, siteUrl, stripeRequest } from '../_shared/stripe.ts';

async function verifyAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false as const, status: 401, error: 'missing_auth' };
  }
  const token = authHeader.slice(7).trim();
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false as const, status: 500, error: 'supabase_env_missing' };
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false as const, status: 401, error: 'invalid_auth' };
  }
  return { ok: true as const, user: data.user };
}

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const auth = await verifyAuth(req);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  let body: { plan?: string; interval?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const plan = body.plan === 'premium' ? 'premium' : (body.plan === 'pro' ? 'pro' : null);
  const interval = body.interval === 'year' ? 'year' : 'month';
  if (!plan) return json({ error: 'invalid_plan' }, 400);

  let stripePriceId: string;
  try {
    stripePriceId = priceId(plan, interval);
  } catch {
    return json({ error: 'billing_not_configured' }, 503);
  }

  const admin = adminClient();
  if (!admin) return json({ error: 'server_config' }, 500);

  const userId = auth.user.id;
  const { data: profile } = await admin
    .from('pt_user_profiles')
    .select('stripe_customer_id, email')
    .eq('user_id', userId)
    .maybeSingle();

  let customerId = profile?.stripe_customer_id as string | null;

  if (!customerId) {
    const customer = await stripeRequest('/customers', 'POST', {
      email: auth.user.email || profile?.email || '',
      'metadata[supabase_user_id]': userId
    });
    customerId = customer.id as string;
    await admin.rpc('pt_set_stripe_customer', {
      p_user_id: userId,
      p_customer_id: customerId
    });
  }

  const base = siteUrl();
  const session = await stripeRequest('/checkout/sessions', 'POST', {
    mode: 'subscription',
    customer: customerId,
    'line_items[0][price]': stripePriceId,
    'line_items[0][quantity]': '1',
    success_url: base + '/?checkout=success',
    cancel_url: base + '/?checkout=cancel',
    'metadata[supabase_user_id]': userId,
    'metadata[plan]': plan,
    'subscription_data[metadata][supabase_user_id]': userId,
    'subscription_data[metadata][plan]': plan,
    allow_promotion_codes: 'true'
  });

  return json({ url: session.url });
});
