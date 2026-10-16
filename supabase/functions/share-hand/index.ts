import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { captureEdgeError } from '../_shared/sentry.ts';
import { corsFor, jsonFor } from '../_shared/http.ts';

const TTL_DAYS = 14;
const MAX_HTML_BYTES = 450_000;
const ALLOWED_SOURCES = new Set(['trainer', 'analysis', 'session', 'leak']);

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

/** Strip executable / high-risk markup from shared HTML (stored XSS defense). */
export function sanitizeShareHtml(html: string): string {
  let out = String(html || '');
  // Remove script/style/iframe/object/embed/link/meta-refresh/base/form
  out = out.replace(/<\s*(script|iframe|object|embed|link|base|form|textarea|input|button)[\s\S]*?>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  out = out.replace(/<\s*(script|iframe|object|embed|link|base|form|textarea|input|button)[^>]*\/?\s*>/gi, '');
  // Event handlers and javascript: / data: URLs in attributes
  out = out.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  out = out.replace(/\s(href|src|xlink:href|action)\s*=\s*(['"])\s*(javascript|data|vbscript):[\s\S]*?\2/gi, ' $1="#"');
  out = out.replace(/<\s*meta[^>]+http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '');
  // SVG/math that can carry script
  out = out.replace(/<\s*(svg|math)[\s\S]*?>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  out = out.replace(/<\s*(svg|math)[^>]*\/?\s*>/gi, '');
  return out;
}

function looksDangerous(html: string): boolean {
  return /<\s*script[\s>/]/i.test(html)
    || /\bon[a-z]+\s*=/i.test(html)
    || /javascript\s*:/i.test(html)
    || /<\s*iframe[\s>/]/i.test(html);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsFor(req) });

  try {
    const admin = adminClient();
    if (!admin) return jsonFor(req, { error: 'server_config' }, 500);

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const id = (url.searchParams.get('id') || '').trim();
      if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
        return jsonFor(req, { error: 'invalid_id', available: false }, 400);
      }

      const { data, error } = await admin
        .from('pt_shared_hands')
        .select('id, html, title, source, created_at, expires_at')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('[share-hand] get', error);
        return jsonFor(req, { error: 'db_error', available: false }, 500);
      }
      if (!data) {
        return jsonFor(req, {
          available: false,
          error: 'not_found',
          message: 'Esta mano ya no está disponible.'
        }, 404);
      }

      const expiresAt = new Date(data.expires_at).getTime();
      if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
        await admin.from('pt_shared_hands').delete().eq('id', id);
        return jsonFor(req, {
          available: false,
          error: 'expired',
          message: 'Esta mano ya no está disponible.'
        }, 404);
      }

      return jsonFor(req, {
        available: true,
        id: data.id,
        title: data.title,
        source: data.source,
        html: sanitizeShareHtml(String(data.html || '')),
        createdAt: data.created_at,
        expiresAt: data.expires_at
      });
    }

    if (req.method === 'POST') {
      const auth = await verifyAuth(req);
      if (!auth.ok) return jsonFor(req, { error: auth.error }, auth.status);

      let body: { html?: string; source?: string; title?: string };
      try {
        body = await req.json();
      } catch {
        return jsonFor(req, { error: 'invalid_json' }, 400);
      }

      const rawHtml = typeof body.html === 'string' ? body.html.trim() : '';
      const source = typeof body.source === 'string' ? body.source.trim() : '';
      const title = typeof body.title === 'string' ? body.title.trim().slice(0, 160) : '';

      if (!rawHtml) return jsonFor(req, { error: 'html_required' }, 400);
      if (!ALLOWED_SOURCES.has(source)) return jsonFor(req, { error: 'invalid_source' }, 400);
      if (byteLength(rawHtml) > MAX_HTML_BYTES) return jsonFor(req, { error: 'html_too_large' }, 413);

      const html = sanitizeShareHtml(rawHtml);
      if (!html.trim()) return jsonFor(req, { error: 'html_required' }, 400);
      if (looksDangerous(html)) return jsonFor(req, { error: 'html_rejected' }, 400);

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
        const code = String(error && (error as { code?: string }).code || '');
        const msg = String(error && (error as { message?: string }).message || '');
        if (code === '23514' || /source/i.test(msg)) {
          return jsonFor(req, { error: 'invalid_source', detail: msg }, 400);
        }
        return jsonFor(req, { error: 'db_error', detail: msg || undefined }, 500);
      }

      const shareUrl = `${siteBaseUrl()}/share.html?id=${data.id}`;
      return jsonFor(req, {
        ok: true,
        id: data.id,
        url: shareUrl,
        expiresAt: data.expires_at,
        createdAt: data.created_at,
        ttlDays: TTL_DAYS
      });
    }

    return jsonFor(req, { error: 'method_not_allowed' }, 405);
  } catch (err) {
    console.error('[share-hand]', err);
    await captureEdgeError(err, { fn: 'share-hand' });
    return jsonFor(req, { error: 'internal_error' }, 500);
  }
});
