/*
 * supabase-client.js — Cliente Supabase compartido (auth + sync + IA).
 */
(function (global) {
  'use strict';

  let client = null;

  function cfg() {
    return global.PT_SUPABASE || {};
  }

  function hasConfig() {
    const c = cfg();
    return !!(c.enabled && c.url && c.anonKey);
  }

  function useAuth() {
    return hasConfig() && cfg().useAuth !== false;
  }

  function getClient() {
    if (!hasConfig()) return null;
    if (!global.supabase || !global.supabase.createClient) return null;
    if (!client) {
      client = global.supabase.createClient(cfg().url, cfg().anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: global.localStorage
        }
      });
    }
    return client;
  }

  async function getAccessToken() {
    const c = getClient();
    if (!c) return null;
    const { data } = await c.auth.getSession();
    return data && data.session ? data.session.access_token : null;
  }

  function userFromSession(session) {
    if (!session || !session.user) return null;
    const u = session.user;
    const meta = u.user_metadata || {};
    const googleSub = meta.sub || meta.provider_id || null;
    const fix = global.PT_fixUtf8Text || function (s) { return s; };
    return {
      sub: u.id,
      googleSub: googleSub,
      email: u.email || '',
      name: fix(meta.full_name || meta.name || u.email || ''),
      picture: meta.avatar_url || meta.picture || '',
      emailVerified: !!(u.email_confirmed_at || meta.email_verified),
      locale: meta.locale || '',
      loginAt: Date.now(),
      authProvider: 'supabase'
    };
  }

  global.PTSupabase = {
    cfg: cfg,
    hasConfig: hasConfig,
    useAuth: useAuth,
    getClient: getClient,
    getAccessToken: getAccessToken,
    userFromSession: userFromSession
  };
})(window);
