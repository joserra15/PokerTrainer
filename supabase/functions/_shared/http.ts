import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const DEFAULT_ORIGIN = 'https://www.pokerforgeai.com';

const STATIC_ALLOWED = new Set([
  'https://www.pokerforgeai.com',
  'https://pokerforgeai.com',
]);

/** Allowlisted browser origins for Edge CORS (no wildcard). */
export function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (STATIC_ALLOWED.has(origin)) return true;
  if (/^https:\/\/[\w.-]+\.github\.io$/i.test(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  return false;
}

export function corsFor(req?: Request): Record<string, string> {
  const origin = req?.headers.get('Origin') || '';
  const allow = isAllowedOrigin(origin) ? origin : DEFAULT_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allow,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
}

/** @deprecated Prefer corsFor(req) — kept for callers that only need a static header bag. */
export const cors = corsFor();

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export function jsonFor(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsFor(req), 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export function adminClient(): SupabaseClient | null {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function verifyAuth(req: Request) {
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

function safeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

export function cronAuthorized(req: Request) {
  const secret = Deno.env.get('PUSH_CRON_SECRET') || '';
  if (!secret) return false;
  const hdr = req.headers.get('x-cron-secret') || '';
  return safeEqual(hdr, secret);
}

export function siteBaseUrl() {
  return (Deno.env.get('SITE_URL') || 'https://www.pokerforgeai.com').replace(/\/$/, '');
}

/** Restrict push open URLs to same-origin relative paths (or absolute SITE_URL). */
export function safePushUrl(input: unknown): string {
  const fallback = './?source=push&tab=play';
  const raw = String(input == null ? '' : input).trim() || fallback;
  const site = siteBaseUrl();
  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw);
      const siteU = new URL(site);
      if (u.origin !== siteU.origin) return fallback;
      return u.pathname + u.search + u.hash || '/';
    }
    if (raw.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(raw)) return fallback;
    return raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('?') ? raw : fallback;
  } catch {
    return fallback;
  }
}
