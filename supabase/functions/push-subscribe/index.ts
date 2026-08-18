import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { captureEdgeError } from '../_shared/sentry.ts';
import { adminClient, cors, json, verifyAuth } from '../_shared/http.ts';

const PLATFORMS = new Set(['android', 'ios', 'desktop', 'unknown']);

function platformOf(raw: unknown) {
  const s = String(raw || 'unknown');
  return PLATFORMS.has(s) ? s : 'unknown';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const admin = adminClient();
    if (!admin) return json({ error: 'server_config' }, 500);

    const auth = await verifyAuth(req);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const body = await req.json().catch(() => ({}));
    const endpoint = String(body.endpoint || '').trim();
    const p256dh = String(body.p256dh || '').trim();
    const keysAuth = String(body.auth || '').trim();
    if (!/^https:\/\//i.test(endpoint)) return json({ error: 'invalid_endpoint' }, 400);
    if (!p256dh || !keysAuth) return json({ error: 'missing_keys' }, 400);

    const row = {
      user_id: auth.user.id,
      endpoint,
      p256dh,
      auth: keysAuth,
      user_agent: String(body.user_agent || '').slice(0, 512) || null,
      platform: platformOf(body.platform),
      enabled: true,
      last_error: null
    };

    const { data, error } = await admin
      .from('pt_push_subscriptions')
      .upsert(row, { onConflict: 'endpoint' })
      .select('id, endpoint, platform, enabled')
      .maybeSingle();

    if (error) {
      console.error('[push-subscribe]', error);
      await captureEdgeError(error, { function: 'push-subscribe' });
      return json({ error: 'upsert_failed' }, 500);
    }

    return json({ ok: true, subscription: data });
  } catch (err) {
    console.error('[push-subscribe]', err);
    await captureEdgeError(err, { function: 'push-subscribe' });
    return json({ error: 'Internal error' }, 500);
  }
});
