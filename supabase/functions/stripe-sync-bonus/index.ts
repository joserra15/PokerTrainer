import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { BONUS_PACKS, BonusPack, cors, json, stripeKey, stripeRequest } from '../_shared/stripe.ts';

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

type CheckoutSession = {
  id: string;
  payment_status?: string;
  mode?: string;
  metadata?: Record<string, string>;
};

async function listPaidBonusSessions(customerId: string): Promise<CheckoutSession[]> {
  const out: CheckoutSession[] = [];
  let startingAfter: string | null = null;

  for (let page = 0; page < 10; page++) {
    const qs = new URLSearchParams({
      customer: customerId,
      limit: '100'
    });
    if (startingAfter) qs.set('starting_after', startingAfter);

    const data = await stripeRequest('/checkout/sessions?' + qs.toString(), 'GET');
    const sessions = (data.data as CheckoutSession[]) || [];
    if (!sessions.length) break;

    for (const s of sessions) {
      if (s.mode !== 'payment') continue;
      if (s.payment_status !== 'paid') continue;
      const meta = s.metadata || {};
      if (meta.purchase_type !== 'ai_bonus') continue;
      out.push(s);
    }

    if (!data.has_more) break;
    startingAfter = sessions[sessions.length - 1]?.id || null;
    if (!startingAfter) break;
  }

  return out;
}

async function syncUserBonuses(
  admin: ReturnType<typeof createClient>,
  userId: string,
  customerId: string
) {
  const sessions = await listPaidBonusSessions(customerId);
  let credited = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const session of sessions) {
    const meta = session.metadata || {};
    const pack = (meta.bonus_pack || 's').toLowerCase() as BonusPack;
    const packDef = BONUS_PACKS[pack];
    const credits = packDef
      ? packDef.credits
      : parseInt(meta.bonus_credits || '0', 10);
    if (!credits || credits <= 0) {
      skipped++;
      continue;
    }

    const { data, error } = await admin.rpc('pt_credit_ai_bonus', {
      p_user_id: userId,
      p_credits: credits,
      p_pack_code: pack,
      p_stripe_session_id: session.id
    });

    if (error) {
      errors.push(session.id + ': ' + error.message);
      continue;
    }
    const row = data as Record<string, unknown>;
    if (row?.ok) {
      if (!row.duplicate) credited++;
      else skipped++;
    } else {
      errors.push(session.id + ': ' + String(row?.error || 'credit_failed'));
    }
  }

  const { data: prof } = await admin
    .from('pt_user_profiles')
    .select('ai_bonus_balance, ai_bonus_expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    user_id: userId,
    credited,
    skipped,
    sessions: sessions.length,
    balance: prof?.ai_bonus_balance ?? 0,
    expires_at: prof?.ai_bonus_expires_at ?? null,
    errors
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const auth = await verifyAuth(req);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const admin = adminClient();
  if (!admin) return json({ error: 'server_config' }, 500);

  let body: { all?: boolean } = {};
  try {
    if (req.headers.get('content-length') !== '0') {
      body = await req.json();
    }
  } catch {
    body = {};
  }

  const isAdmin = await callerIsAdmin(admin, auth.user.id);
  const syncAll = !!body.all && isAdmin;

  try {
    stripeKey();
  } catch {
    return json({ error: 'billing_not_configured' }, 503);
  }

  if (syncAll) {
    const { data: profiles, error: listErr } = await admin
      .from('pt_user_profiles')
      .select('user_id, stripe_customer_id')
      .not('stripe_customer_id', 'is', null)
      .neq('user_id', 'pt_demo_user');

    if (listErr) return json({ error: listErr.message }, 500);

    let totalCredited = 0;
    const results: Array<Record<string, unknown>> = [];
    const errors: string[] = [];

    for (const prof of profiles || []) {
      try {
        const r = await syncUserBonuses(
          admin,
          prof.user_id as string,
          prof.stripe_customer_id as string
        );
        totalCredited += r.credited;
        if (r.credited > 0 || r.errors.length) results.push(r);
        errors.push(...r.errors);
      } catch (e) {
        errors.push(
          prof.user_id + ': ' + (e instanceof Error ? e.message : 'sync_failed')
        );
      }
    }

    return json({
      ok: true,
      scope: 'all',
      credited: totalCredited,
      users: (profiles || []).length,
      results,
      errors
    });
  }

  const { data: profile, error: profErr } = await admin
    .from('pt_user_profiles')
    .select('stripe_customer_id')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (profErr) return json({ error: profErr.message }, 500);

  const customerId = profile?.stripe_customer_id as string | null;
  if (!customerId) {
    return json({ ok: true, credited: 0, skipped: 0, sessions: 0, balance: 0 });
  }

  try {
    const result = await syncUserBonuses(admin, auth.user.id, customerId);
    return json({ ok: true, scope: 'self', ...result });
  } catch (e) {
    return json({
      error: e instanceof Error ? e.message : 'sync_failed'
    }, 500);
  }
});
