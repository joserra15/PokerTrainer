import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { captureEdgeError } from '../_shared/sentry.ts';
import { adminClient, cors, json, verifyAuth } from '../_shared/http.ts';

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
    if (!endpoint) return json({ error: 'invalid_endpoint' }, 400);

    const { error } = await admin
      .from('pt_push_subscriptions')
      .update({ enabled: false, last_error: 'unsubscribed' })
      .eq('user_id', auth.user.id)
      .eq('endpoint', endpoint);

    if (error) {
      console.error('[push-unsubscribe]', error);
      await captureEdgeError(error, { function: 'push-unsubscribe' });
      return json({ error: 'update_failed' }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error('[push-unsubscribe]', err);
    await captureEdgeError(err, { function: 'push-unsubscribe' });
    return json({ error: 'Internal error' }, 500);
  }
});
