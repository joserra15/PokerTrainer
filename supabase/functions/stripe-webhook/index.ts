import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { planFromPriceId, stripeKey, BONUS_PACKS, BonusPack } from '../_shared/stripe.ts';
import { cancelOtherSubscriptions } from '../_shared/subscription-sync.ts';

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function verifyStripeSignature(payload: string, sigHeader: string): Promise<boolean> {
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) return false;

  const parts = sigHeader.split(',').reduce((acc: Record<string, string>, part) => {
    const [k, v] = part.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return false;

  const signedPayload = timestamp + '.' + payload;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return expected === v1;
}

async function recordStripePayment(
  admin: ReturnType<typeof createClient>,
  customerId: string | null,
  paidAt: string,
  userId?: string | null
) {
  await admin.rpc('pt_record_stripe_payment', {
    p_stripe_customer_id: customerId,
    p_paid_at: paidAt,
    p_user_id: userId || null
  });
}

async function recordPaymentLedger(
  admin: ReturnType<typeof createClient>,
  params: {
    userId: string;
    kind: string;
    description?: string;
    amountCents?: number | null;
    currency?: string;
    plan?: string | null;
    packCode?: string | null;
    sessionId?: string | null;
    invoiceId?: string | null;
    paymentIntentId?: string | null;
    paidAt?: string;
  }
) {
  try {
    await admin.rpc('pt_record_payment', {
      p_user_id: params.userId,
      p_kind: params.kind,
      p_description: params.description || null,
      p_amount_cents: params.amountCents ?? null,
      p_currency: params.currency || 'eur',
      p_plan: params.plan || null,
      p_pack_code: params.packCode || null,
      p_stripe_session_id: params.sessionId || null,
      p_stripe_invoice_id: params.invoiceId || null,
      p_stripe_payment_intent_id: params.paymentIntentId || null,
      p_paid_at: params.paidAt || new Date().toISOString()
    });
  } catch (e) {
    console.error('[stripe-webhook] pt_record_payment', e);
  }
}

async function userIdFromSubscription(subscriptionId: string): Promise<string | null> {
  if (!subscriptionId) return null;
  try {
    const sub = await fetch('https://api.stripe.com/v1/subscriptions/' + subscriptionId, {
      headers: { Authorization: 'Bearer ' + stripeKey() }
    }).then((r) => r.json());
    return (sub?.metadata as Record<string, string>)?.supabase_user_id || null;
  } catch {
    return null;
  }
}

async function userIdFromCustomer(
  admin: ReturnType<typeof createClient>,
  customerId: string | null
): Promise<string | null> {
  if (!customerId) return null;
  const { data: prof } = await admin
    .from('pt_user_profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return prof?.user_id || null;
}

async function applySubscription(
  admin: ReturnType<typeof createClient>,
  userId: string,
  plan: string,
  customerId: string | null,
  subscriptionId: string | null,
  status: string,
  periodEnd: number | null,
  interval: string | null,
  cancelAtPeriodEnd: boolean | null = null
) {
  const periodEndIso = periodEnd
    ? new Date(periodEnd * 1000).toISOString()
    : null;
  const now = Math.floor(Date.now() / 1000);
  const stillPaid = (periodEnd || 0) > now;
  const canceled = cancelAtPeriodEnd === true
    || status === 'canceled'
    || status === 'unpaid'
    || status === 'incomplete_expired';

  if ((status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') && !stillPaid) {
    plan = 'free';
  }

  await admin.rpc('pt_apply_subscription', {
    p_user_id: userId,
    p_plan: plan,
    p_stripe_customer_id: customerId,
    p_stripe_subscription_id: subscriptionId,
    p_status: status,
    p_period_end: periodEndIso,
    p_interval: interval,
    p_cancel_at_period_end: canceled
  });
}

function cancelFromSub(sub: Record<string, unknown>): boolean {
  const status = sub.status as string;
  if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') return true;
  if (sub.cancel_at_period_end) return true;
  if (sub.cancel_at != null && Number(sub.cancel_at) > 0) return true;
  return false;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method_not_allowed', { status: 405 });
  }

  const payload = await req.text();
  const sig = req.headers.get('stripe-signature') || '';

  try {
    stripeKey();
  } catch {
    return new Response('not_configured', { status: 503 });
  }

  const valid = await verifyStripeSignature(payload, sig);
  if (!valid) {
    return new Response('invalid_signature', { status: 400 });
  }

  const admin = adminClient();
  if (!admin) return new Response('server_config', { status: 500 });

  let event: {
    type: string;
    data: { object: Record<string, unknown> };
  };
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response('invalid_json', { status: 400 });
  }

  const obj = event.data.object;

  if (event.type === 'checkout.session.completed') {
    const meta = (obj.metadata as Record<string, string>) || {};
    const userId = meta.supabase_user_id || (obj.client_reference_id as string);
    const customerId = obj.customer as string;
    const mode = obj.mode as string;
    const sessionId = obj.id as string;

    if (mode === 'payment' && meta.purchase_type === 'ai_bonus' && userId) {
      const pack = (meta.bonus_pack || 's').toLowerCase() as BonusPack;
      const packDef = BONUS_PACKS[pack];
      const credits = packDef
        ? packDef.credits
        : parseInt(meta.bonus_credits || '0', 10);
      if (credits > 0) {
        const { data: creditRes, error: creditErr } = await admin.rpc('pt_credit_ai_bonus', {
          p_user_id: userId,
          p_credits: credits,
          p_pack_code: pack,
          p_stripe_session_id: sessionId
        });
        if (creditErr) {
          console.error('[stripe-webhook] pt_credit_ai_bonus', creditErr);
          return new Response(JSON.stringify({ error: 'bonus_credit_failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        const creditRow = creditRes as Record<string, unknown>;
        if (!creditRow?.ok) {
          console.error('[stripe-webhook] pt_credit_ai_bonus result', creditRow);
          return new Response(JSON.stringify({ error: creditRow?.error || 'bonus_credit_failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      if (customerId) {
        await recordStripePayment(admin, customerId, new Date().toISOString(), userId);
      }
      await recordPaymentLedger(admin, {
        userId,
        kind: 'bonus',
        description: 'Bono IA' + (credits ? ' (' + credits + ' consultas)' : ''),
        amountCents: obj.amount_total as number | null,
        currency: (obj.currency as string) || 'eur',
        packCode: pack,
        sessionId
      });
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const plan = meta.plan || 'pro';
    const subscriptionId = obj.subscription as string;

    if (userId && subscriptionId) {
      const sub = await fetch('https://api.stripe.com/v1/subscriptions/' + subscriptionId, {
        headers: { Authorization: 'Bearer ' + stripeKey() }
      }).then((r) => r.json());

      const priceId = sub?.items?.data?.[0]?.price?.id as string | undefined;
      const mapped = priceId ? planFromPriceId(priceId) : null;
      const finalPlan = mapped?.plan || plan;
      const interval = mapped?.interval || sub?.items?.data?.[0]?.price?.recurring?.interval || null;

      await applySubscription(
        admin,
        userId,
        finalPlan,
        customerId,
        subscriptionId,
        sub.status || 'active',
        sub.current_period_end || null,
        interval,
        !!sub.cancel_at_period_end || cancelFromSub(sub)
      );

      if (customerId && subscriptionId) {
        await cancelOtherSubscriptions(customerId, subscriptionId);
      }

      if (customerId) {
        await recordStripePayment(admin, customerId, new Date().toISOString(), userId);
      }
      await recordPaymentLedger(admin, {
        userId,
        kind: 'subscription',
        description: finalPlan === 'premium' ? 'Suscripción Coach' : 'Suscripción Study',
        amountCents: obj.amount_total as number | null,
        currency: (obj.currency as string) || 'eur',
        plan: finalPlan,
        sessionId
      });
    }
  }

  if (event.type === 'invoice.paid') {
    const customerId = obj.customer as string;
    const paidAtUnix = (obj.status_transitions as { paid_at?: number })?.paid_at;
    const paidAt = paidAtUnix
      ? new Date(paidAtUnix * 1000).toISOString()
      : new Date().toISOString();
    const subscriptionId = obj.subscription as string | null;
    let userId = (obj.metadata as Record<string, string>)?.supabase_user_id
      || await userIdFromSubscription(subscriptionId || '')
      || await userIdFromCustomer(admin, customerId);

    if (subscriptionId && userId) {
      try {
        const sub = await fetch('https://api.stripe.com/v1/subscriptions/' + subscriptionId, {
          headers: { Authorization: 'Bearer ' + stripeKey() }
        }).then((r) => r.json());

        const priceId = sub?.items?.data?.[0]?.price?.id as string | undefined;
        const mapped = priceId ? planFromPriceId(priceId) : null;
        const finalPlan = mapped?.plan || 'pro';
        const interval = mapped?.interval || sub?.items?.data?.[0]?.price?.recurring?.interval || null;

        await applySubscription(
          admin,
          userId,
          finalPlan,
          customerId,
          subscriptionId,
          sub.status || 'active',
          sub.current_period_end || null,
          interval,
          !!sub.cancel_at_period_end || cancelFromSub(sub)
        );
      } catch {
        /* subscription fetch failed; still record payment below */
      }
    }

    if (customerId || userId) {
      await recordStripePayment(admin, customerId, paidAt, userId);
    }
    if (userId) {
      const lines = obj.lines as { data?: Array<{ description?: string }> } | undefined;
      const desc = lines?.data?.[0]?.description
        || ((obj.billing_reason as string) === 'subscription_cycle' ? 'Renovación suscripción' : 'Pago Stripe');
      await recordPaymentLedger(admin, {
        userId,
        kind: (obj.billing_reason as string) === 'subscription_cycle' ? 'renewal' : 'invoice',
        description: desc,
        amountCents: obj.amount_paid as number | null,
        currency: (obj.currency as string) || 'eur',
        invoiceId: obj.id as string,
        paymentIntentId: obj.payment_intent as string | null,
        paidAt
      });
    }
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = obj;
    const userId = (sub.metadata as Record<string, string>)?.supabase_user_id;
    const customerId = sub.customer as string;
    const subscriptionId = sub.id as string;
    const status = sub.status as string;
    const periodEnd = sub.current_period_end as number | null;
    const priceId = (sub.items as { data?: Array<{ price?: { id?: string; recurring?: { interval?: string } } }> })
      ?.data?.[0]?.price?.id;
    const mapped = priceId ? planFromPriceId(priceId) : null;
    let plan = mapped?.plan || 'free';
    const interval = mapped?.interval || null;
    const cancelAtEnd = cancelFromSub(sub as Record<string, unknown>)
      || status === 'canceled'
      || event.type === 'customer.subscription.deleted';

    if (!userId && customerId) {
      const { data: prof } = await admin
        .from('pt_user_profiles')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();
      if (prof?.user_id) {
        await applySubscription(
          admin,
          prof.user_id,
          event.type === 'customer.subscription.deleted' ? 'free' : plan,
          customerId,
          subscriptionId,
          status,
          periodEnd,
          interval,
          cancelAtEnd
        );
      }
    } else if (userId) {
      await applySubscription(
        admin,
        userId,
        event.type === 'customer.subscription.deleted' ? 'free' : plan,
        customerId,
        subscriptionId,
        status,
        periodEnd,
        interval,
        cancelAtEnd
      );
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});
