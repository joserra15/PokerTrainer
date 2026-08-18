import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { captureEdgeError } from '../_shared/sentry.ts';
import { adminClient, cors, cronAuthorized, json, siteBaseUrl } from '../_shared/http.ts';
import { sendWebPush, vapidEnv } from '../_shared/web-push.ts';

const INACTIVE_DAYS = 7;
const BATCH = 200;
const STALE_DAYS = 30;

type SubRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

async function cleanup(admin: NonNullable<ReturnType<typeof adminClient>>) {
  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from('pt_push_subscriptions')
    .delete()
    .or('enabled.eq.false,last_error.in.(410,404,gone)')
    .lt('updated_at', cutoff)
    .select('id');
  if (error) {
    console.error('[push-dispatch-reengage] cleanup', error);
    return 0;
  }
  return (data || []).length;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  try {
    if (!cronAuthorized(req)) return json({ error: 'missing_auth' }, 401);
    const admin = adminClient();
    if (!admin) return json({ error: 'server_config' }, 500);
    if (!vapidEnv()) return json({ error: 'vapid_env_missing' }, 500);

    const cleaned = await cleanup(admin);

    const inactiveBefore = new Date(Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const weekAgo = inactiveBefore;

    const { data: candidates, error } = await admin
      .from('pt_user_profiles')
      .select('user_id, last_seen_at')
      .lt('last_seen_at', inactiveBefore)
      .not('last_seen_at', 'is', null)
      .limit(BATCH);

    if (error) {
      console.error('[push-dispatch-reengage] users', error);
      return json({ error: 'list_failed' }, 500);
    }

    const site = siteBaseUrl();
    const payload = {
      title: 'PokerForgeAI',
      body: 'Hace 7 días que no entrenas. ¿Una mano rápida?',
      icon: `${site}/icons/icon-192.png`,
      badge: `${site}/icons/icon-192.png`,
      tag: 'reengage-7d',
      renotify: false,
      data: {
        type: 'reengage',
        url: './?source=push&tab=play',
        campaign: 'inactive_7d'
      }
    };
    const raw = JSON.stringify(payload);

    let users = 0;
    let sent = 0;
    let skipped = 0;
    let gone = 0;
    let failed = 0;

    for (const user of candidates || []) {
      const uid = user.user_id as string;
      const { data: subs } = await admin
        .from('pt_push_subscriptions')
        .select('id, user_id, endpoint, p256dh, auth, last_sent_at, last_campaign, last_campaign_at')
        .eq('user_id', uid)
        .eq('enabled', true);

      if (!subs || !subs.length) {
        skipped += 1;
        continue;
      }

      const tooSoon = (subs as Array<Record<string, unknown>>).some((s) => {
        const last = s.last_sent_at ? Date.parse(String(s.last_sent_at)) : 0;
        if (last && last > Date.parse(dayAgo)) return true;
        if (s.last_campaign === 'inactive_7d' && s.last_campaign_at) {
          return Date.parse(String(s.last_campaign_at)) > Date.parse(weekAgo);
        }
        return false;
      });
      if (tooSoon) {
        skipped += 1;
        continue;
      }

      users += 1;
      for (const row of subs as SubRow[]) {
        const result = await sendWebPush(row, raw);
        if (result.gone) {
          gone += 1;
          await admin.from('pt_push_subscriptions').update({
            enabled: false,
            last_error: String(result.status || '410')
          }).eq('id', row.id);
        } else if (result.ok) {
          sent += 1;
          await admin.from('pt_push_subscriptions').update({
            last_error: null,
            last_sent_at: new Date().toISOString(),
            last_campaign: 'inactive_7d',
            last_campaign_at: new Date().toISOString()
          }).eq('id', row.id);
        } else {
          failed += 1;
          await admin.from('pt_push_subscriptions').update({
            last_error: (result.error || String(result.status)).slice(0, 180)
          }).eq('id', row.id);
        }
      }
    }

    return json({
      ok: true,
      inactiveDays: INACTIVE_DAYS,
      users,
      sent,
      skipped,
      gone,
      failed,
      cleaned
    });
  } catch (err) {
    console.error('[push-dispatch-reengage]', err);
    await captureEdgeError(err, { function: 'push-dispatch-reengage' });
    return json({ error: 'Internal error' }, 500);
  }
});
