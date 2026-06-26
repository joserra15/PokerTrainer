/*
 * entitlements.js — Límites freemium y estado de plan (Epic 3).
 */
(function (global) {
  'use strict';

  var PLAN_LABELS = {
    free: 'Gratis',
    pro: 'Study',
    premium: 'Coach'
  };

  var DEFAULT_LIMITS = {
    free: {
      trainer_hands_per_day: 15,
      import_sessions_per_month: 1,
      max_hands_per_import: 200,
      ai_reports_per_month: 0,
      history_days: 30
    },
    pro: {
      trainer_hands_per_day: null,
      import_sessions_per_month: null,
      max_hands_per_import: null,
      ai_reports_per_month: 0,
      history_days: null
    },
    premium: {
      trainer_hands_per_day: null,
      import_sessions_per_month: null,
      max_hands_per_import: null,
      ai_reports_per_month: 30,
      history_days: null
    }
  };

  var state = null;
  var loading = null;

  function client() {
    return global.PTSupabase && global.PTSupabase.getClient
      ? global.PTSupabase.getClient()
      : null;
  }

  function useAuth() {
    return global.PTSupabase && global.PTSupabase.useAuth && global.PTSupabase.useAuth();
  }

  function isAdmin() {
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
    return !!(u && u.isAdmin);
  }

  function localFallback() {
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
    var plan = (u && u.plan) || 'free';
    return {
      plan: plan,
      plan_label: PLAN_LABELS[plan] || plan,
      is_admin: isAdmin(),
      subscription_status: 'none',
      paid_active: plan === 'pro' || plan === 'premium',
      limits: DEFAULT_LIMITS[plan] || DEFAULT_LIMITS.free,
      usage: {
        trainer_hands_today: 0,
        import_sessions_month: 0,
        ai_reports_month: 0
      }
    };
  }

  function normalizeEnt(data) {
    if (!data) return localFallback();
    return data;
  }

  async function refresh() {
    if (!useAuth()) {
      state = localFallback();
      return state;
    }
    var c = client();
    if (!c) {
      state = localFallback();
      return state;
    }
    try {
      var res = await c.rpc('pt_get_entitlements');
      if (res.error) {
        console.warn('[PTEntitlements]', res.error.message);
        state = localFallback();
      } else {
        state = normalizeEnt(res.data);
      }
    } catch (e) {
      console.warn('[PTEntitlements]', e);
      state = localFallback();
    }
    applyToUser(state);
    return state;
  }

  function applyToUser(ent) {
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
    if (!u || !ent) return;
    u.plan = ent.plan || u.plan || 'free';
    u.planLabel = ent.plan_label || PLAN_LABELS[u.plan] || u.plan;
    u.subscriptionStatus = ent.subscription_status;
    u.paidActive = !!ent.paid_active;
  }

  async function ensureLoaded() {
    if (state) return state;
    if (loading) return loading;
    loading = refresh().finally(function () { loading = null; });
    return loading;
  }

  function unlimited(ent) {
    return ent.is_admin || ent.plan === 'pro' || ent.plan === 'premium';
  }

  function canUseAI(ent) {
    ent = ent || state || localFallback();
    if (ent.is_admin) return { ok: true, unlimited: true };
    var lim = ent.limits || {};
    var max = lim.ai_reports_per_month;
    if (max === 0 || max === null && ent.plan !== 'premium') {
      return { ok: false, reason: 'ai_plan', plan: ent.plan };
    }
    if (max == null) return { ok: true, unlimited: true };
    var used = (ent.usage && ent.usage.ai_reports_month) || 0;
    if (used >= max) return { ok: false, reason: 'ai_limit', used: used, limit: max };
    return { ok: true, used: used, limit: max };
  }

  function canStartTrainerHand(ent) {
    ent = ent || state || localFallback();
    if (unlimited(ent)) return { ok: true };
    var lim = ent.limits || {};
    var max = lim.trainer_hands_per_day;
    if (max == null) return { ok: true };
    var used = (ent.usage && ent.usage.trainer_hands_today) || 0;
    if (used >= max) return { ok: false, reason: 'trainer_limit', used: used, limit: max };
    return { ok: true, used: used, limit: max };
  }

  function canImportSession(handCount, ent) {
    ent = ent || state || localFallback();
    if (unlimited(ent)) return { ok: true };
    var lim = ent.limits || {};
    var maxImports = lim.import_sessions_per_month;
    var maxHands = lim.max_hands_per_import;
    var used = (ent.usage && ent.usage.import_sessions_month) || 0;
    if (maxImports != null && used >= maxImports) {
      return { ok: false, reason: 'import_limit', used: used, limit: maxImports };
    }
    if (maxHands != null && handCount > maxHands) {
      return { ok: false, reason: 'import_hands_limit', hands: handCount, limit: maxHands };
    }
    return { ok: true, used: used, limit: maxImports };
  }

  async function recordTrainerHand() {
    if (!useAuth()) return { ok: true };
    var c = client();
    if (!c) return { ok: true };
    var res = await c.rpc('pt_record_trainer_hand');
    if (res.error) return { ok: false, error: res.error.message };
    await refresh();
    return res.data || { ok: true };
  }

  async function recordImportSession(handCount) {
    if (!useAuth()) return { ok: true };
    var c = client();
    if (!c) return { ok: true };
    var res = await c.rpc('pt_record_import_session', { p_hand_count: handCount || 0 });
    if (res.error) return { ok: false, error: res.error.message };
    await refresh();
    return res.data || { ok: true };
  }

  function historyCutoffDate(ent) {
    ent = ent || state || localFallback();
    if (ent.is_admin) return null;
    var days = ent.limits && ent.limits.history_days;
    if (!days) return null;
    var d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  }

  global.PTEntitlements = {
    PLAN_LABELS: PLAN_LABELS,
    refresh: refresh,
    ensureLoaded: ensureLoaded,
    get: function () { return state || localFallback(); },
    canUseAI: canUseAI,
    canStartTrainerHand: canStartTrainerHand,
    canImportSession: canImportSession,
    recordTrainerHand: recordTrainerHand,
    recordImportSession: recordImportSession,
    historyCutoffDate: historyCutoffDate,
    unlimited: unlimited
  };
})(window);
