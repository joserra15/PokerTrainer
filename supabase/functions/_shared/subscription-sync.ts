import { planFromPriceId, stripeRequest } from './stripe.ts';

export type StripeSub = {
  id: string;
  status: string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  cancel_at?: number | null;
  ended_at?: number | null;
  customer?: string;
  metadata?: Record<string, string>;
  items?: {
    data?: Array<{
      price?: { id?: string; recurring?: { interval?: string } };
    }>;
  };
};

function planTier(plan: string): number {
  if (plan === 'premium') return 2;
  if (plan === 'pro') return 1;
  return 0;
}

export function subscriptionCanceled(sub: StripeSub): boolean {
  if (sub.status === 'canceled' || sub.status === 'unpaid' || sub.status === 'incomplete_expired') {
    return true;
  }
  if (sub.cancel_at_period_end) return true;
  if (sub.cancel_at != null && sub.cancel_at > 0) return true;
  return false;
}

export function subscriptionRank(sub: StripeSub): number {
  const now = Math.floor(Date.now() / 1000);
  const end = sub.current_period_end || 0;
  const live = ['active', 'trialing', 'past_due'].includes(sub.status);
  const canceled = subscriptionCanceled(sub);
  const priceId = sub.items?.data?.[0]?.price?.id;
  const mapped = priceId ? planFromPriceId(priceId) : null;
  const tier = planTier(mapped?.plan || 'free');

  let score = end;
  if (live) score += 1e12;
  if (canceled && end > now) score += 5e11;
  if (sub.status === 'canceled' && end > now) score += 4e11;
  score += tier * 2e11;
  return score;
}

export async function fetchSubscriptionById(subId: string): Promise<StripeSub | null> {
  try {
    const sub = await stripeRequest('/subscriptions/' + encodeURIComponent(subId), 'GET');
    return (sub as StripeSub)?.id ? (sub as StripeSub) : null;
  } catch {
    return null;
  }
}

export async function fetchBestSubscription(
  customerId: string,
  preferredId?: string | null
): Promise<StripeSub | null> {
  const data = await stripeRequest(
    '/subscriptions?customer=' + encodeURIComponent(customerId) + '&status=all&limit=20',
    'GET'
  );
  const subs = (data.data as StripeSub[]) || [];
  if (!subs.length) {
    if (preferredId) return fetchSubscriptionById(preferredId);
    return null;
  }

  subs.sort((a, b) => subscriptionRank(b) - subscriptionRank(a));
  const best = subs[0];
  if (best?.id) {
    const full = await fetchSubscriptionById(best.id);
    return full || best;
  }
  return best;
}

export async function cancelOtherSubscriptions(customerId: string, keepSubId: string) {
  const data = await stripeRequest(
    '/subscriptions?customer=' + encodeURIComponent(customerId) + '&status=all&limit=20',
    'GET'
  );
  const subs = (data.data as StripeSub[]) || [];
  for (const sub of subs) {
    if (!sub.id || sub.id === keepSubId) continue;
    const live = ['active', 'trialing', 'past_due'].includes(sub.status);
    if (!live) continue;
    try {
      await stripeRequest('/subscriptions/' + encodeURIComponent(sub.id), 'DELETE');
    } catch (e) {
      console.warn('[stripe] cancel old sub', sub.id, e);
    }
  }
}

export async function applyStripeSubscription(
  admin: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.49.1').createClient>,
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
  const cancelAtEnd = subscriptionCanceled(sub);
  const now = Math.floor(Date.now() / 1000);
  const stillPaid = (sub.current_period_end || 0) > now;
  const downgrade = (sub.status === 'canceled' || sub.status === 'unpaid') && !stillPaid;

  await admin.rpc('pt_apply_subscription', {
    p_user_id: userId,
    p_plan: downgrade ? 'free' : plan,
    p_stripe_customer_id: customerId,
    p_stripe_subscription_id: sub.id,
    p_status: sub.status,
    p_period_end: periodEndIso,
    p_interval: interval,
    p_cancel_at_period_end: cancelAtEnd
  });

  return { plan: downgrade ? 'free' : plan, interval, status: sub.status };
}

export async function findCustomerByEmail(email: string): Promise<string | null> {
  if (!email) return null;
  const q = "email:'" + email.replace(/'/g, "\\'") + "'";
  const data = await stripeRequest(
    '/customers/search?query=' + encodeURIComponent(q) + '&limit=1',
    'GET'
  );
  const list = (data.data as Array<{ id?: string }>) || [];
  return list[0]?.id || null;
}

export async function syncUserSubscription(
  admin: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.49.1').createClient>,
  userId: string,
  email: string,
  existingCustomerId: string | null,
  preferredSubId: string | null
) {
  let customerId = existingCustomerId;
  if (!customerId && email) {
    customerId = await findCustomerByEmail(email);
    if (customerId) {
      await admin.rpc('pt_set_stripe_customer', {
        p_user_id: userId,
        p_customer_id: customerId
      });
    }
  }
  if (!customerId) {
    return { ok: false as const, error: 'no_customer' };
  }

  const sub = await fetchBestSubscription(customerId, preferredSubId);
  if (!sub) {
    return { ok: true as const, customerId, plan: null, synced: false };
  }

  const applied = await applyStripeSubscription(admin, userId, sub, customerId);
  return { ok: true as const, customerId, plan: applied.plan, synced: true, subscriptionId: sub.id };
}
