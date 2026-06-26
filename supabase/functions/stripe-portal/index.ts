import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { cors, json, siteUrl, stripeRequest } from '../_shared/stripe.ts';

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

  const admin = adminClient();
  if (!admin) return json({ error: 'server_config' }, 500);

  const { data: profile } = await admin
    .from('pt_user_profiles')
    .select('stripe_customer_id')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  const customerId = profile?.stripe_customer_id as string | null;
  if (!customerId) {
    return json({ error: 'no_subscription' }, 404);
  }

  try {
    const portal = await stripeRequest('/billing_portal/sessions', 'POST', {
      customer: customerId,
      return_url: siteUrl() + '/?portal=return'
    });
    return json({ url: portal.url });
  } catch (e) {
    return json({ error: (e as Error).message || 'portal_error' }, 502);
  }
});
