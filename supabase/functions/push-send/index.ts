import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { captureEdgeError } from '../_shared/sentry.ts';
import { adminClient, cors, cronAuthorized, json, siteBaseUrl, verifyAuth } from '../_shared/http.ts';
import { sendWebPush, vapidEnv } from '../_shared/web-push.ts';

const TYPES = new Set(['test', 'reengage', 'admin']);
const MAX_JSON = 3000;

type SubRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  enabled: boolean;
};

function payloadOf(input: Record<string, unknown>) {
  const type = TYPES.has(String(input.type || '')) ? String(input.type) : 'admin';
  const site = siteBaseUrl();
  const url = String(input.url || './?source=push&tab=play');
  const title = String(input.title || 'PokerForgeAI').slice(0, 80);
  const body = String(input.body || 'Tienes un aviso de PokerForgeAI.').slice(0, 180);
  const tag = String(input.tag || type).slice(0, 64);
  const campaign = String(input.campaign || type).slice(0, 64);
  const icon = `${site}/icons/icon-192.png`;
  return {
    title,
    body,
    icon,
    badge: icon,
    tag,
    renotify: false,
    data: { type, url, campaign }
  };
}

async function isAdminUser(admin: NonNullable<ReturnType<typeof adminClient>>, userId: string) {
  const { data } = await admin
    .from('pt_user_profiles')
    .select('is_admin, email')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return false;
  if (data.is_admin) return true;
  return String(data.email || '').toLowerCase() === 'info@pokerforgeai.com';
}

async function markResult(
  admin: NonNullable<ReturnType<typeof adminClient>>,
  row: SubRow,
  result: { ok: boolean; gone: boolean; error?: string; status: number },
  campaign: string
) {
  if (result.gone) {
    await admin.from('pt_push_subscriptions').update({
      enabled: false,
      last_error: String(result.status || '410')
    }).eq('id', row.id);
    return;
  }
  if (result.ok) {
    await admin.from('pt_push_subscriptions').update({
      last_error: null,
      last_sent_at: new Date().toISOString(),
      last_campaign: campaign,
      last_campaign_at: new Date().toISOString()
    }).eq('id', row.id);
    return;
  }
  await admin.from('pt_push_subscriptions').update({
    last_error: (result.error || String(result.status)).slice(0, 180)
  }).eq('id', row.id);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const admin = adminClient();
    if (!admin) return json({ error: 'server_config' }, 500);
    if (!vapidEnv()) return json({ error: 'vapid_env_missing' }, 500);

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const type = TYPES.has(String(body.type || '')) ? String(body.type) : '';
    if (!type) return json({ error: 'invalid_type' }, 400);

    const cron = cronAuthorized(req);
    let callerId = '';
    let adminCaller = false;

    if (!cron) {
      const auth = await verifyAuth(req);
      if (!auth.ok) return json({ error: auth.error }, auth.status);
      callerId = auth.user.id;
      adminCaller = await isAdminUser(admin, callerId);
    }

    let targetUserId = callerId;
    if (body.user_id) {
      const requested = String(body.user_id);
      if (cron || adminCaller) targetUserId = requested;
      else if (requested !== callerId) return json({ error: 'forbidden_user' }, 403);
      else targetUserId = requested;
    }
    if (!targetUserId) return json({ error: 'missing_user' }, 400);

    if (type === 'test' && !cron && !adminCaller) {
      targetUserId = callerId;
    }

    const userIdsRaw = Array.isArray(body.user_ids) ? body.user_ids : [];
    const userIds = [...new Set(
      userIdsRaw.map((x) => String(x || '').trim()).filter(Boolean)
    )].slice(0, 200);
    const allUsers = body.all_users === true;

    if ((userIds.length > 0 || allUsers) && type !== 'test' && !cron && !adminCaller) {
      return json({ error: 'forbidden_user' }, 403);
    }

    const payload = payloadOf({ ...body, type });
    const raw = JSON.stringify(payload);
    if (new TextEncoder().encode(raw).length > MAX_JSON) {
      return json({ error: 'payload_too_large' }, 400);
    }

    let q = admin
      .from('pt_push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth, enabled')
      .eq('enabled', true);

    const endpoint = String(body.endpoint || '').trim();
    if (type === 'test') {
      q = q.eq('user_id', callerId);
      if (endpoint) q = q.eq('endpoint', endpoint);
    } else if (allUsers && (cron || adminCaller)) {
      if (callerId) q = q.neq('user_id', callerId);
    } else if (userIds.length && (cron || adminCaller)) {
      q = q.in('user_id', userIds);
    } else {
      q = q.eq('user_id', targetUserId);
    }

    const { data: subs, error } = await q;
    if (error) {
      console.error('[push-send] list', error);
      return json({ error: 'list_failed' }, 500);
    }
    if (!subs || !subs.length) return json({ ok: true, sent: 0, failed: 0, gone: 0 });

    let sent = 0;
    let failed = 0;
    let gone = 0;
    for (const row of subs as SubRow[]) {
      const result = await sendWebPush(row, raw);
      await markResult(admin, row, result, String(payload.data.campaign));
      if (result.gone) gone += 1;
      else if (result.ok) sent += 1;
      else failed += 1;
    }

    return json({ ok: true, sent, failed, gone });
  } catch (err) {
    console.error('[push-send]', err);
    await captureEdgeError(err, { function: 'push-send' });
    return json({ error: 'Internal error' }, 500);
  }
});
