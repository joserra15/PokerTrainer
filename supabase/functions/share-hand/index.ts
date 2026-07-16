import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { captureEdgeError } from '../_shared/sentry.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

const TTL_DAYS = 14;
const MAX_HTML_BYTES = 450_000;
const ALLOWED_SOURCES = new Set(['trainer', 'analysis', 'session']);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

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

function siteBaseUrl() {
  const raw = (Deno.env.get('SITE_URL') || 'https://www.pokerforgeai.com').replace(/\/$/, '');
  return raw;
}

function byteLength(s: string) {
  return new TextEncoder().encode(s).length;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const admin = adminClient();
    if (!admin) return json({ error: 'server_config' }, 500);

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const id = (url.searchParams.get('id') || '').trim();
      if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
        return json({ error: 'invalid_id', available: false }, 400);
      }

      const { data, error } = await admin
        .from('pt_shared_hands')
        .select('id, html, title, source, created_at, expires_at')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('[share-hand] get', error);
        return json({ error: 'db_error', available: false }, 500);
      }
      if (!data) {
        return json({
          available: false,
          error: 'not_found',
          message: 'Esta mano ya no está disponible.'
        }, 404);
      }

      const expiresAt = new Date(data.expires_at).getTime();
      if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
        await admin.from('pt_shared_hands').delete().eq('id', id);
        return json({
          available: false,
          error: 'expired',
          message: 'Esta mano ya no está disponible.'
        }, 404);
      }

      return json({
        available: true,
        id: data.id,
        title: data.title,
        source: data.source,
        html: data.html,
        createdAt: data.created_at,
        expiresAt: data.expires_at
      });
    }

    if (req.method === 'POST') {
      const auth = await verifyAuth(req);
      if (!auth.ok) return json({ error: auth.error }, auth.status);

      let body: { html?: string; source?: string; title?: string };
      try {
        body = await req.json();
      } catch {
        return json({ error: 'invalid_json' }, 400);
      }

      const html = typeof body.html === 'string' ? body.html.trim() : '';
      const source = typeof body.source === 'string' ? body.source.trim() : '';
      const title = typeof body.title === 'string' ? body.title.trim().slice(0, 160) : '';

      if (!html) return json({ error: 'html_required' }, 400);
      if (!ALLOWED_SOURCES.has(source)) return json({ error: 'invalid_source' }, 400);
      if (byteLength(html) > MAX_HTML_BYTES) return json({ error: 'html_too_large' }, 413);

      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + TTL_DAYS * 24 * 60 * 60 * 1000);

      const { data, error } = await admin
        .from('pt_shared_hands')
        .insert({
          user_id: auth.user.id,
          source,
          title: title || 'Análisis de mano',
          html,
          created_at: createdAt.toISOString(),
          expires_at: expiresAt.toISOString()
        })
        .select('id, expires_at, created_at')
        .single();

      if (error || !data) {
        console.error('[share-hand] insert', error);
        return json({ error: 'db_error' }, 500);
      }

      const shareUrl = `${siteBaseUrl()}/share.html?id=${data.id}`;
      return json({
        ok: true,
        id: data.id,
        url: shareUrl,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        ttlDays: TTL_DAYS
      });
    }

    return json({ error: 'method_not_allowed' }, 405);
  } catch (err) {
    console.error('[share-hand]', err);
    await captureEdgeError(err, { fn: 'share-hand' });
    return json({ error: 'internal_error' }, 500);
  }
});
