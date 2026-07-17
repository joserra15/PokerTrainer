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
      history_days: 30,
      analysis_hands_max: 5
    },
    pro: {
      trainer_hands_per_day: null,
      import_sessions_per_month: null,
      max_hands_per_import: null,
      ai_reports_per_month: 40,
      history_days: null,
      analysis_hands_max: 20
    },
    premium: {
      trainer_hands_per_day: null,
      import_sessions_per_month: null,
      max_hands_per_import: null,
      ai_reports_per_month: 150,
      history_days: null,
      analysis_hands_max: 100
    }
  };

  var ANALYSIS_HANDS_MAX = { free: 5, pro: 20, premium: 100 };

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

  function demoActive() {
    return global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive();
  }

  function e2eBypass() {
    return !!global.PT_E2E_MODE;
  }

  function isAdmin() {
    if (demoActive()) return false;
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
    return !!(u && u.isAdmin);
  }

  function localFallback() {
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
    var plan = demoActive() ? 'free' : ((u && u.plan) || 'free');
    return {
      plan: plan,
      plan_label: PLAN_LABELS[plan] || plan,
      is_admin: false,
      demo_mode: demoActive(),
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
    var plan = data.plan || 'free';
    var defaults = DEFAULT_LIMITS[plan] || DEFAULT_LIMITS.free;
    var lim = data.limits || {};
    data.limits = {
      trainer_hands_per_day: lim.trainer_hands_per_day != null ? lim.trainer_hands_per_day : defaults.trainer_hands_per_day,
      import_sessions_per_month: lim.import_sessions_per_month != null ? lim.import_sessions_per_month : defaults.import_sessions_per_month,
      max_hands_per_import: lim.max_hands_per_import != null ? lim.max_hands_per_import : defaults.max_hands_per_import,
      ai_reports_per_month: lim.ai_reports_per_month != null ? lim.ai_reports_per_month : defaults.ai_reports_per_month,
      history_days: lim.history_days != null ? lim.history_days : defaults.history_days,
      analysis_hands_max: lim.analysis_hands_max != null ? lim.analysis_hands_max : defaults.analysis_hands_max
    };
    var usage = data.usage || {};
    data.usage = {
      trainer_hands_today: Number(usage.trainer_hands_today) || 0,
      import_sessions_month: Number(usage.import_sessions_month) || 0,
      ai_reports_month: Number(usage.ai_reports_month) || 0,
      ai_plan_used_month: Number(usage.ai_plan_used_month) || 0,
      ai_bonus_used_month: Number(usage.ai_bonus_used_month) || 0
    };
    if (!data.bonus) data.bonus = { balance: 0, expires_at: null };
    if (!data.is_admin && isAdmin()) data.is_admin = true;
    if (data.is_admin) {
      data.limits.ai_reports_per_month = null;
      data.unlimited = true;
    } else if (data.limits && data.limits.ai_reports_per_month == null) {
      data.unlimited = true;
    } else {
      data.unlimited = false;
    }
    return data;
  }

  async function refresh() {
    state = null;
    if (e2eBypass() || !useAuth()) {
      state = localFallback();
      return state;
    }
    var c = client();
    if (!c) {
      state = localFallback();
      return state;
    }
    try {
      var rpc = demoActive() ? 'pt_get_demo_entitlements' : 'pt_get_entitlements';
      var res = await c.rpc(rpc);
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
    if (global.dispatchEvent) {
      global.dispatchEvent(new CustomEvent('pt-entitlements-updated', { detail: state }));
    }
    return state;
  }

  function applyToUser(ent) {
    var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
    if (!u || !ent) return;
    if (demoActive()) {
      u.demoMode = true;
      u.plan = ent.plan || 'free';
      u.planLabel = (ent.plan_label || PLAN_LABELS[u.plan] || u.plan) + ' (demo)';
      u.subscriptionStatus = ent.subscription_status;
      u.paidActive = !!ent.paid_active;
      return;
    }
    u.demoMode = false;
    u.plan = ent.plan || u.plan || 'free';
    u.planLabel = ent.plan_label || PLAN_LABELS[u.plan] || u.plan;
    u.subscriptionStatus = ent.subscription_status;
    u.paidActive = !!ent.paid_active;
    if (ent.is_admin) u.isAdmin = true;
    if (global.PTAuth && global.PTAuth.renderAccountMenu) {
      global.PTAuth.renderAccountMenu(u);
    }
    if (u.isAdmin && global.PTLoader) {
      global.PTLoader.ensure('admin').then(function () {
        if (global.PTAdmin && global.PTAdmin.initForUser) global.PTAdmin.initForUser(u);
      }).catch(function (e) { console.warn('[PTAdmin]', e); });
    } else if (global.PTAdmin && global.PTAdmin.initForUser) {
      global.PTAdmin.initForUser(u);
    }
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

  function bonusActive(ent) {
    var b = ent.bonus || {};
    var bal = Number(b.balance) || 0;
    if (bal <= 0) return false;
    if (!b.expires_at) return true;
    try { return new Date(b.expires_at) > new Date(); } catch (e) { return bal > 0; }
  }

  function aiPlanUsed(ent) {
    ent = ent || state || localFallback();
    var use = ent.usage || {};
    if (use.ai_plan_used_month != null && use.ai_plan_used_month !== '') {
      return Number(use.ai_plan_used_month) || 0;
    }
    var used = Number(use.ai_reports_month) || 0;
    var bonusUsed = Number(use.ai_bonus_used_month) || 0;
    if (bonusUsed > 0) return Math.max(0, used - bonusUsed);
    var pm = Number((ent.limits || {}).ai_reports_per_month) || 0;
    return Math.min(used, pm);
  }

  function canUseAI(ent) {
    ent = ent || state || localFallback();
    if (ent.is_admin || ent.unlimited || isAdmin()) return { ok: true, unlimited: true };
    var lim = ent.limits || {};
    var max = lim.ai_reports_per_month;
    var used = (ent.usage && ent.usage.ai_reports_month) || 0;
    var planUsed = aiPlanUsed(ent);
    var bonus = bonusActive(ent) ? (Number(ent.bonus.balance) || 0) : 0;
    if (max == null) return { ok: true, unlimited: true };
    if (max > 0 && planUsed < max) {
      return { ok: true, used: used, planUsed: planUsed, limit: max, bonus: bonus, source: 'plan' };
    }
    if (bonus > 0) {
      return { ok: true, used: used, planUsed: planUsed, limit: max, bonus: bonus, source: 'bonus' };
    }
    if (max <= 0) return { ok: false, reason: 'ai_plan', plan: ent.plan, bonus: 0 };
    return { ok: false, reason: 'ai_limit', used: used, limit: max, bonus: 0 };
  }

  function aiCombinedQuota(ent) {
    ent = ent || state || localFallback();
    if (ent.is_admin || isAdmin()) {
      return {
        unlimited: true,
        used: (ent.usage && ent.usage.ai_reports_month) || 0,
        bonus: bonusActive(ent) ? (Number(ent.bonus.balance) || 0) : 0
      };
    }
    var lim = ent.limits || {};
    var planMax = lim.ai_reports_per_month;
    var used = (ent.usage && ent.usage.ai_reports_month) || 0;
    var planUsed = aiPlanUsed(ent);
    var bonus = bonusActive(ent) ? (Number(ent.bonus.balance) || 0) : 0;
    if (planMax == null) {
      return { unlimited: true, used: used, bonus: bonus };
    }
    var pm = Number(planMax) || 0;
    if (pm <= 0 && bonus <= 0) {
      return { used: used, planMax: pm, bonus: 0, totalLimit: 0, totalLeft: 0, planUsed: 0 };
    }
    var planLeft = Math.max(0, pm - planUsed);
    var totalLeft = planLeft + bonus;
    var totalLimit = pm + bonus;
    return {
      used: used, planMax: pm, bonus: bonus, planUsed: planUsed,
      planLeft: planLeft, totalLimit: totalLimit, totalLeft: totalLeft
    };
  }

  function aiQuotaSummary(ent) {
    ent = ent || state || localFallback();
    if (ent.is_admin || isAdmin()) {
      var adminUsed = (ent.usage && ent.usage.ai_reports_month) || 0;
      return { unlimited: true, label: 'Consultas IA: ilimitadas (admin) · ' + adminUsed + ' usadas este mes' };
    }
    var q = aiCombinedQuota(ent);
    if (q.unlimited) {
      return { unlimited: true, label: 'Consultas IA: ilimitadas' };
    }
    if (!q.totalLimit) {
      return { unlimited: false, label: 'Tu plan no incluye consultas IA. Compra un bono en Planes.', totalLeft: 0, bonus: 0 };
    }
    var line = 'IA Coach: ' + q.used + '/' + q.totalLimit;
    if (q.bonus > 0) line += ' (incl. ' + q.bonus + ' bono)';
    line += ' · ' + q.totalLeft + ' disponibles';
    return {
      unlimited: false,
      used: q.used,
      limit: q.planMax,
      planLeft: q.planLeft != null ? q.planLeft : Math.max(0, q.planMax - (q.planUsed || 0)),
      bonus: q.bonus,
      totalLimit: q.totalLimit,
      totalLeft: q.totalLeft,
      label: line + '.'
    };
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
    if (!useAuth() || e2eBypass()) return { ok: true };
    var c = client();
    if (!c) return { ok: true };
    var rpc = demoActive() ? 'pt_demo_record_trainer_hand' : 'pt_record_trainer_hand';
    var res = await c.rpc(rpc);
    if (res.error) return { ok: false, error: res.error.message };
    if (state && state.usage) {
      state.usage.trainer_hands_today = (Number(state.usage.trainer_hands_today) || 0) + 1;
    }
    refresh().catch(function (e) { console.warn('[PTEntitlements]', e); });
    return res.data || { ok: true };
  }

  async function recordImportSession(handCount) {
    if (!useAuth() || e2eBypass()) return { ok: true };
    var c = client();
    if (!c) return { ok: true };
    var rpc = demoActive() ? 'pt_demo_record_import_session' : 'pt_record_import_session';
    var args = demoActive() ? { p_hand_count: handCount || 0 } : { p_hand_count: handCount || 0 };
    var res = await c.rpc(rpc, args);
    if (res.error) return { ok: false, error: res.error.message };
    await refresh();
    return res.data || { ok: true };
  }

  function analysisHandsMax(ent) {
    ent = ent || state || localFallback();
    if (ent.is_admin || isAdmin()) return 1000;
    var lim = ent.limits || {};
    if (typeof lim.analysis_hands_max === 'number') return lim.analysis_hands_max;
    var plan = ent.plan || 'free';
    return ANALYSIS_HANDS_MAX[plan] != null ? ANALYSIS_HANDS_MAX[plan] : ANALYSIS_HANDS_MAX.free;
  }

  function canSaveAnalysisHand(currentCount, ent) {
    ent = ent || state || localFallback();
    var max = analysisHandsMax(ent);
    var count = Number(currentCount) || 0;
    if (count >= max) {
      return { ok: false, reason: 'analysis_limit', used: count, limit: max, plan: ent.plan || 'free' };
    }
    return { ok: true, used: count, limit: max };
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
    aiCombinedQuota: aiCombinedQuota,
    aiQuotaSummary: aiQuotaSummary,
    canStartTrainerHand: canStartTrainerHand,
    canImportSession: canImportSession,
    analysisHandsMax: analysisHandsMax,
    canSaveAnalysisHand: canSaveAnalysisHand,
    recordTrainerHand: recordTrainerHand,
    recordImportSession: recordImportSession,
    historyCutoffDate: historyCutoffDate,
    unlimited: unlimited,
    demoActive: demoActive,
    isAdmin: isAdmin
  };
})(window);
