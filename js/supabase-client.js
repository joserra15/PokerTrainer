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

  /**
   * Adaptador sobre localStorage: si la cuota está llena (habitual al abrir
   * Admin con muchas RPC / refresh de token), libera cachés y reintenta.
   * Sin esto supabase-js lanza QuotaExceededError y tumba el panel.
   */
  function createAuthStorage() {
    const base = global.localStorage;
    function tryFree(aggressive) {
      try {
        if (global.Store && typeof global.Store.freeStorageSpace === 'function') {
          return !!global.Store.freeStorageSpace(aggressive ? { aggressive: true } : undefined);
        }
      } catch (e) { /* noop */ }
      return false;
    }
    return {
      getItem: function (key) {
        try {
          return base && base.getItem ? base.getItem(key) : null;
        } catch (e) {
          return null;
        }
      },
      setItem: function (key, value) {
        if (!base || !base.setItem) return;
        try {
          base.setItem(key, value);
          return;
        } catch (e1) {
          tryFree(false);
          try {
            base.setItem(key, value);
            return;
          } catch (e2) {
            tryFree(true);
            try {
              base.setItem(key, value);
            } catch (e3) {
              try {
                console.warn('[PTSupabase] auth storage QuotaExceeded; sesión no persistida');
              } catch (e4) { /* noop */ }
            }
          }
        }
      },
      removeItem: function (key) {
        try {
          if (base && base.removeItem) base.removeItem(key);
        } catch (e) { /* noop */ }
      }
    };
  }

  function getClient() {
    if (!hasConfig()) return null;
    if (!global.supabase || !global.supabase.createClient) return null;
    if (!client) {
      client = global.supabase.createClient(cfg().url, cfg().anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // El callback se consume de forma explícita en auth-bootstrap
          // (evita perder INITIAL_SESSION / code antes de suscribirse).
          detectSessionInUrl: false,
          flowType: 'pkce',
          storage: createAuthStorage()
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
