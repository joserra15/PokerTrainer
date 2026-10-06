import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { captureEdgeError } from '../_shared/sentry.ts';
import { adminClient, cors, cronAuthorized, json } from '../_shared/http.ts';

/**
 * Pre-genera el Spot del día (hoy + mañana) para que sea aleatorio y común.
 * Auth: x-cron-secret (PUSH_CRON_SECRET).
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  try {
    if (!cronAuthorized(req)) return json({ error: 'missing_auth' }, 401);
    const admin = adminClient();
    if (!admin) return json({ error: 'server_config' }, 500);

    const { data: today, error: errToday } = await admin.rpc('pt_get_or_create_daily_spot', {
      p_date: null
    });
    if (errToday) {
      console.error('[daily-spot-generate] today', errToday);
      return json({ error: 'generate_today_failed', detail: errToday.message }, 500);
    }

    // Mañana (Europe/Madrid): date + 1 día sobre el spot_date de hoy.
    let tomorrow: unknown = null;
    const todayDate = today && (today as { spot_date?: string }).spot_date;
    if (todayDate) {
      const d = new Date(todayDate + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() + 1);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const nextIso = `${y}-${m}-${day}`;
      const { data: tm, error: errTm } = await admin.rpc('pt_get_or_create_daily_spot', {
        p_date: nextIso
      });
      if (errTm) {
        console.error('[daily-spot-generate] tomorrow', errTm);
        return json({ error: 'generate_tomorrow_failed', detail: errTm.message, today }, 500);
      }
      tomorrow = tm;
    }

    return json({ ok: true, today, tomorrow });
  } catch (e) {
    captureEdgeError(e, { fn: 'daily-spot-generate' });
    return json({ error: 'internal' }, 500);
  }
});
