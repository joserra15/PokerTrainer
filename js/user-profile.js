/*
 * user-profile.js — Perfil en Supabase (plan, admin, actividad).
 */
(function (global) {
  'use strict';

  var HEARTBEAT_MS = 5 * 60 * 1000;
  var heartbeatTimer = null;

  var PLAN_LABELS = {
    free: 'Gratis',
    pro: 'Study',
    premium: 'Coach'
  };

  function client() {
    return global.PTSupabase && global.PTSupabase.getClient
      ? global.PTSupabase.getClient()
      : null;
  }

  function useAuth() {
    return global.PTSupabase && global.PTSupabase.useAuth && global.PTSupabase.useAuth();
  }

  var ADMIN_EMAILS = ['info@pokerforgeai.com'];

  function isBootstrapAdmin(email) {
    if (!email) return false;
    var lower = String(email).toLowerCase();
    return ADMIN_EMAILS.some(function (e) { return lower === e.toLowerCase(); });
  }

  var ALIAS_MIN = 3;
  var ALIAS_MAX = 20;
  var ALIAS_RE = /^[A-Za-z0-9]([A-Za-z0-9_-]*[A-Za-z0-9])?$/;
  var ALIAS_RESERVED = { hero: 1, heroe: 1, 'héroe': 1, jugador: 1, admin: 1, pokerforge: 1 };

  function normalizeAliasLocal(raw) {
    var cleaned = String(raw == null ? '' : raw).trim();
    if (!cleaned) return { ok: true, alias: null };
    if (cleaned.length < ALIAS_MIN || cleaned.length > ALIAS_MAX) {
      return { ok: false, error: 'alias_length' };
    }
    if (!ALIAS_RE.test(cleaned)) return { ok: false, error: 'alias_format' };
    if (ALIAS_RESERVED[cleaned.toLowerCase()]) return { ok: false, error: 'alias_reserved' };
    return { ok: true, alias: cleaned };
  }

  function aliasErrorMessage(code) {
    if (code === 'alias_taken') return 'Ese alias ya está en uso. Elige otro.';
    if (code === 'alias_length') return 'El alias debe tener entre 3 y 20 caracteres.';
    if (code === 'alias_format') {
      return 'Usa letras, números, _ o - (sin espacios; debe empezar y terminar en letra o número).';
    }
    if (code === 'alias_reserved') return 'Ese alias está reservado. Elige otro.';
    if (code === 'not_authenticated') return 'Inicia sesión para guardar el alias.';
    return 'No se pudo guardar el alias.';
  }

  function applyTournamentAlias(user, alias) {
    if (!user) return user;
    var cleaned = alias == null || alias === '' ? null : String(alias).trim() || null;
    user.tournamentAlias = cleaned;
    user.displayName = cleaned || null;
    return user;
  }

  function persistAuthUserSession(user) {
    if (!user || user.isGuest || !user.sub) return;
    try {
      if (global.PT_AUTH_USER && global.PT_AUTH_USER.sub === user.sub) {
        global.PT_AUTH_USER = user;
      }
      localStorage.setItem('pt_auth_v1', JSON.stringify(user));
    } catch (ePers) { /* noop */ }
  }

  function emitTournamentAliasChanged(alias) {
    try {
      if (typeof global.dispatchEvent === 'function') {
        global.dispatchEvent(new CustomEvent('pt-tournament-alias-changed', {
          detail: { alias: alias || null }
        }));
      }
    } catch (eEv) { /* */ }
  }

  function getTournamentAlias(user) {
    var u = user || (global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null)
      || global.PT_AUTH_USER || null;
    if (!u) return '';
    var a = u.tournamentAlias != null ? u.tournamentAlias : u.tournament_alias;
    return a ? String(a).trim() : '';
  }

  /** Nombre a mostrar en mesa / clasificación: alias o nombre de cuenta. */
  function getTournamentDisplayName(opts) {
    opts = opts || {};
    var u = opts.user || (global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null)
      || global.PT_AUTH_USER || null;
    var alias = getTournamentAlias(u);
    if (alias) return alias.slice(0, ALIAS_MAX);
    if (u && u.name) {
      var full = String(u.name).trim();
      if (!full) return opts.fallback || 'Jugador';
      if (opts.firstTokenOnly) {
        var tok = full.split(/\s+/)[0];
        return tok || full;
      }
      return full.slice(0, 40);
    }
    if (u && u.email) return String(u.email).slice(0, 40);
    return opts.fallback || 'Jugador';
  }

  function applyProfileToUser(user, profile) {
    if (!user || !profile) return user;
    user.isAdmin = !!profile.is_admin || isBootstrapAdmin(user.email);
    user.isFounder = !!(profile.is_founder || profile.is_founder_study || profile.is_founder_coach);
    user.isFounderStudy = !!profile.is_founder_study;
    user.isFounderCoach = !!profile.is_founder_coach;
    user.founderRequestedAt = profile.founder_requested_at || null;
    user.founderStudyRequestedAt = profile.founder_study_requested_at || null;
    user.founderCoachRequestedAt = profile.founder_coach_requested_at || null;
    user.plan = profile.plan || 'free';
    user.planLabel = PLAN_LABELS[user.plan] || user.plan;
    user.aiDailyLimit = profile.ai_limit || profile.ai_daily_limit || null;
    user.subscriptionStatus = profile.subscription_status;
    user.paidActive = profile.plan === 'pro' || profile.plan === 'premium';
    if (Object.prototype.hasOwnProperty.call(profile, 'tournament_alias') ||
        Object.prototype.hasOwnProperty.call(profile, 'tournamentAlias')) {
      applyTournamentAlias(user, profile.tournament_alias != null
        ? profile.tournament_alias
        : profile.tournamentAlias);
    }
    return user;
  }

  async function setTournamentAlias(rawAlias) {
    var local = normalizeAliasLocal(rawAlias);
    if (!local.ok) {
      return { ok: false, error: local.error, message: aliasErrorMessage(local.error) };
    }
    if (!useAuth()) {
      return { ok: false, error: 'not_authenticated', message: aliasErrorMessage('not_authenticated') };
    }
    var c = client();
    if (!c) {
      return { ok: false, error: 'no_client', message: aliasErrorMessage('no_client') };
    }
    try {
      var res = await c.rpc('pt_set_tournament_alias', { p_alias: local.alias || '' });
      if (res.error) {
        if (global.PTAuth && global.PTAuth.isAuthFailureError &&
            global.PTAuth.isAuthFailureError(res.error) &&
            global.PTAuth.handleAuthFailure) {
          global.PTAuth.handleAuthFailure(res.error.message || 'not_authenticated');
        }
        return {
          ok: false,
          error: res.error.message || 'rpc_error',
          message: aliasErrorMessage(res.error.message)
        };
      }
      var data = res.data || {};
      if (!data.ok) {
        return {
          ok: false,
          error: data.error || 'alias_invalid',
          message: aliasErrorMessage(data.error)
        };
      }
      var user = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : global.PT_AUTH_USER;
      applyTournamentAlias(user, data.alias);
      persistAuthUserSession(user);
      emitTournamentAliasChanged(data.alias || null);
      return { ok: true, alias: data.alias || null };
    } catch (e) {
      return {
        ok: false,
        error: (e && e.message) || 'rpc_error',
        message: aliasErrorMessage((e && e.message) || 'rpc_error')
      };
    }
  }

  async function touchProfile(user) {
    if (!user || !useAuth()) return null;
    var c = client();
    if (!c) return null;
    try {
      var res = await c.rpc('pt_touch_profile', {
        p_email: user.email || '',
        p_name: user.name || ''
      });
      if (res.error) {
        console.warn('[PTProfile]', res.error.message);
        if (global.PTAuth && global.PTAuth.isAuthFailureError &&
            global.PTAuth.isAuthFailureError(res.error) &&
            global.PTAuth.handleAuthFailure) {
          global.PTAuth.handleAuthFailure(res.error.message || 'not_authenticated');
        }
        return null;
      }
      return res.data;
    } catch (e) {
      console.warn('[PTProfile]', e);
      if (global.PTAuth && global.PTAuth.isAuthFailureError &&
          global.PTAuth.isAuthFailureError(e) &&
          global.PTAuth.handleAuthFailure) {
        global.PTAuth.handleAuthFailure((e && e.message) || 'not_authenticated');
      }
      return null;
    }
  }

  async function touchAndApply(user) {
    var prevAlias = getTournamentAlias(user);
    var profile = await touchProfile(user);
    if (profile) applyProfileToUser(user, profile);
    persistAuthUserSession(user);
    var nextAlias = getTournamentAlias(user);
    if (nextAlias !== prevAlias) {
      emitTournamentAliasChanged(nextAlias || null);
    }
    if (global.PTEntitlements && global.PTEntitlements.refresh) {
      await global.PTEntitlements.refresh();
    }
    startHeartbeat(user);
    return user;
  }

  function startHeartbeat(user) {
    stopHeartbeat();
    if (!user || !useAuth()) return;
    heartbeatTimer = setInterval(function () {
      var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : user;
      if (u) touchProfile(u);
    }, HEARTBEAT_MS);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  async function getMyAiUsageToday() {
    if (global.PTEntitlements && global.PTEntitlements.ensureLoaded) {
      var ent = await global.PTEntitlements.ensureLoaded();
      var lim = ent.limits || {};
      var max = lim.ai_reports_per_month;
      if (ent.is_admin) return { used: ent.usage.ai_reports_month || 0, limit: '∞' };
      var used = (ent.usage && ent.usage.ai_reports_month) || 0;
      return { used: used, limit: max != null ? max : 0, period: 'month' };
    }
    if (!useAuth()) return { used: 0, limit: 0 };
    var c = client();
    var user = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
    if (!c || !user) return { used: 0, limit: 120 };
    var start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    var limit = user.aiDailyLimit || 120;
    var res = await c
      .from('pt_ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.sub)
      .gte('created_at', start.toISOString());
    return { used: res.count || 0, limit: limit };
  }

  global.PTProfile = {
    touchAndApply: touchAndApply,
    touchProfile: touchProfile,
    applyProfileToUser: applyProfileToUser,
    applyTournamentAlias: applyTournamentAlias,
    getTournamentAlias: getTournamentAlias,
    getTournamentDisplayName: getTournamentDisplayName,
    setTournamentAlias: setTournamentAlias,
    normalizeAliasLocal: normalizeAliasLocal,
    aliasErrorMessage: aliasErrorMessage,
    getMyAiUsageToday: getMyAiUsageToday,
    stopHeartbeat: stopHeartbeat,
    PLAN_LABELS: PLAN_LABELS
  };
})(window);
