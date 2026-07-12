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

type CheckoutSession = {
  id: string;
  mode?: string;
  payment_status?: string;
  amount_total?: number | null;
  currency?: string | null;
  metadata?: Record<string, string>;
};

type Invoice = {
  id: string;
  status?: string;
  amount_paid?: number;
  currency?: string;
  created?: number;
  billing_reason?: string;
  lines?: { data?: Array<{ description?: string }> };
};

async function recordPayment(
  admin: ReturnType<typeof createClient>,
  userId: string,
  payload: Record<string, unknown>
) {
  const { error } = await admin.rpc('pt_record_payment', payload);
  if (error) throw new Error(error.message);
}

async function syncCheckoutSessions(
  admin: ReturnType<typeof createClient>,
  userId: string,
  customerId: string
) {
  let recorded = 0;
  const data = await stripeRequest(
    '/checkout/sessions?customer=' + encodeURIComponent(customerId) + '&limit=100',
    'GET'
  );
  const sessions = (data.data as CheckoutSession[]) || [];

  for (const session of sessions) {
    if (session.payment_status !== 'paid') continue;
    const meta = session.metadata || {};
    const amount = session.amount_total ?? null;
    const currency = session.currency || 'eur';

    if (session.mode === 'payment' && meta.purchase_type === 'ai_bonus') {
      const pack = (meta.bonus_pack || 's').toLowerCase() as BonusPack;
      const packDef = BONUS_PACKS[pack];
      const credits = packDef ? packDef.credits : parseInt(meta.bonus_credits || '0', 10);
      if (credits > 0) {
        const { data: creditRes, error: creditErr } = await admin.rpc('pt_credit_ai_bonus', {
          p_user_id: userId,
          p_credits: credits,
          p_pack_code: pack,
          p_stripe_session_id: session.id
        });
        if (creditErr) throw new Error(creditErr.message);
        const creditRow = creditRes as Record<string, unknown>;
        if (!creditRow?.ok) {
          throw new Error(String(creditRow?.error || 'bonus_credit_failed'));
        }
      }
      await recordPayment(admin, userId, {
        p_user_id: userId,
        p_kind: 'bonus',
        p_description: 'Bono IA' + (credits ? ' (' + credits + ' consultas)' : ''),
        p_amount_cents: amount,
        p_currency: currency,
        p_pack_code: pack,
        p_stripe_session_id: session.id,
        p_paid_at: new Date().toISOString()
      });
      recorded++;
      continue;
    }

    if (session.mode === 'subscription') {
      const plan = meta.plan || null;
      await recordPayment(admin, userId, {
        p_user_id: userId,
        p_kind: 'subscription',
        p_description: plan === 'premium' ? 'Suscripción Coach' : 'Suscripción Study',
        p_amount_cents: amount,
        p_currency: currency,
        p_plan: plan,
        p_stripe_session_id: session.id,
        p_paid_at: new Date().toISOString()
      });
      recorded++;
    }
  }

  return recorded;
}

async function syncInvoices(
  admin: ReturnType<typeof createClient>,
  userId: string,
  customerId: string
) {
  let recorded = 0;
  const data = await stripeRequest(
    '/invoices?customer=' + encodeURIComponent(customerId) + '&status=paid&limit=100',
    'GET'
  );
  const invoices = (data.data as Invoice[]) || [];

  for (const inv of invoices) {
    const paidAt = inv.created
      ? new Date(inv.created * 1000).toISOString()
      : new Date().toISOString();
    const desc = inv.lines?.data?.[0]?.description
      || (inv.billing_reason === 'subscription_cycle' ? 'Renovación suscripción' : 'Pago Stripe');
    await recordPayment(admin, userId, {
      p_user_id: userId,
      p_kind: inv.billing_reason === 'subscription_cycle' ? 'renewal' : 'invoice',
      p_description: desc,
      p_amount_cents: inv.amount_paid ?? null,
      p_currency: inv.currency || 'eur',
      p_stripe_invoice_id: inv.id,
      p_paid_at: paidAt
    });
    recorded++;
  }

  return recorded;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const auth = await verifyAuth(req);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const admin = adminClient();
  if (!admin) return json({ error: 'server_config' }, 500);

  try {
    stripeKey();
  } catch {
    return json({ error: 'billing_not_configured' }, 503);
  }

  const { data: profile, error: profErr } = await admin
    .from('pt_user_profiles')
    .select('stripe_customer_id')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (profErr) return json({ error: profErr.message }, 500);

  const customerId = profile?.stripe_customer_id as string | null;
  if (!customerId) {
    return json({ ok: true, recorded: 0, message: 'no_customer' });
  }

  try {
    const sessions = await syncCheckoutSessions(admin, auth.user.id, customerId);
    const invoices = await syncInvoices(admin, auth.user.id, customerId);
    return json({ ok: true, recorded: sessions + invoices, sessions, invoices });
  } catch (e) {
    return json({
      error: e instanceof Error ? e.message : 'sync_failed'
    }, 500);
  }
});
