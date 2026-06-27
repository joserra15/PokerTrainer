import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { cors, json, planFromPriceId, stripeKey, stripeRequest } from '../_shared/stripe.ts';

type StripeSub = {
  id: string;
  status: string;
  current_period_end?: number;
  customer?: string;
  metadata?: Record<string, string>;
  items?: {
    data?: Array<{
      price?: { id?: string; recurring?: { interval?: string } };
    }>;
  };
};

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

async function callerIsAdmin(admin: ReturnType<typeof createClient>, userId: string) {
  const { data } = await admin
    .from('pt_user_profiles')
    .select('is_admin')
    .eq('user_id', userId)
    .maybeSingle();
  return !!data?.is_admin;
}

async function findCustomerByEmail(email: string): Promise<string | null> {
  if (!email) return null;
  const q = "email:'" + email.replace(/'/g, "\\'") + "'";
  const data = await stripeRequest(
    '/customers/search?query=' + encodeURIComponent(q) + '&limit=1',
    'GET'
  );
  const list = (data.data as Array<{ id?: string }>) || [];
  return list[0]?.id || null;
}

async function latestPaidAt(customerId: string): Promise<string | null> {
  const data = await stripeRequest(
    '/invoices?customer=' + encodeURIComponent(customerId) + '&status=paid&limit=1',
    'GET'
  );
  const invoices = (data.data as Array<{
    status_transitions?: { paid_at?: number };
    created?: number;
  }>) || [];
  if (!invoices.length) return null;
  const inv = invoices[0];
  const paidUnix = inv.status_transitions?.paid_at || inv.created;
  if (!paidUnix) return null;
  return new Date(paidUnix * 1000).toISOString();
}

async function fetchActiveSubscription(customerId: string): Promise<StripeSub | null> {
  for (const status of ['active', 'trialing', 'past_due']) {
    const data = await stripeRequest(
      '/subscriptions?customer=' + encodeURIComponent(customerId) + '&status=' + status + '&limit=1',
      'GET'
    );
    const subs = (data.data as StripeSub[]) || [];
    if (subs.length) return subs[0];
  }
  return null;
}

async function applyStripeSubscription(
  admin: ReturnType<typeof createClient>,
  userId: string,
  sub: StripeSub,
  customerId: string
) {
  const priceId = sub.items?.data?.[0]?.price?.id;
  const mapped = priceId ? planFromPriceId(priceId) : null;
  const plan = mapped?.plan || 'pro';
  const interval = mapped?.interval || sub.items?.data?.[0]?.price?.recurring?.interval || 'month';
  const periodEndIso = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  await admin.rpc('pt_apply_subscription', {
    p_user_id: userId,
    p_plan: sub.status === 'canceled' || sub.status === 'unpaid' ? 'free' : plan,
    p_stripe_customer_id: customerId,
    p_stripe_subscription_id: sub.id,
    p_status: sub.status,
    p_period_end: periodEndIso,
    p_interval: interval
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const auth = await verifyAuth(req);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const admin = adminClient();
  if (!admin) return json({ error: 'server_config' }, 500);

  if (!(await callerIsAdmin(admin, auth.user.id))) {
    return json({ error: 'forbidden' }, 403);
  }

  try {
    stripeKey();
  } catch {
    return json({ error: 'billing_not_configured' }, 503);
  }

  const { data: profiles, error: listErr } = await admin
    .from('pt_user_profiles')
    .select('user_id, email, stripe_customer_id')
    .neq('user_id', 'pt_demo_user');

  if (listErr) return json({ error: listErr.message }, 500);

  let updated = 0;
  let linked = 0;
  let subscriptions = 0;
  let skipped = 0;
  const errors: Array<{ user_id: string; error: string }> = [];

  for (const prof of profiles || []) {
    try {
      let customerId = prof.stripe_customer_id as string | null;

      if (!customerId && prof.email) {
        customerId = await findCustomerByEmail(prof.email);
        if (customerId) {
          await admin.rpc('pt_set_stripe_customer', {
            p_user_id: prof.user_id,
            p_customer_id: customerId
          });
          linked++;
        }
      }

      if (!customerId) {
        skipped++;
        continue;
      }

      const sub = await fetchActiveSubscription(customerId);
      if (sub) {
        await applyStripeSubscription(admin, prof.user_id, sub, customerId);
        subscriptions++;
      }

      const paidAt = await latestPaidAt(customerId);
      if (!paidAt) {
        if (!sub) skipped++;
        continue;
      }

      await admin.rpc('pt_record_stripe_payment', {
        p_stripe_customer_id: customerId,
        p_paid_at: paidAt,
        p_user_id: prof.user_id
      });
      updated++;
    } catch (e) {
      errors.push({
        user_id: prof.user_id,
        error: e instanceof Error ? e.message : 'sync_failed'
      });
    }
  }

  return json({
    ok: true,
    updated,
    linked,
    subscriptions,
    skipped,
    total: (profiles || []).length,
    errors
  });
});
