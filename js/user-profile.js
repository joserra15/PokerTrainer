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

  var ADMIN_EMAILS = ['joserra15@gmail.com'];

  function isBootstrapAdmin(email) {
    if (!email) return false;
    var lower = String(email).toLowerCase();
    return ADMIN_EMAILS.some(function (e) { return lower === e.toLowerCase(); });
  }

  function applyProfileToUser(user, profile) {
    if (!user || !profile) return user;
    user.isAdmin = !!profile.is_admin || isBootstrapAdmin(user.email);
    user.plan = profile.plan || 'free';
    user.planLabel = PLAN_LABELS[user.plan] || user.plan;
    user.aiDailyLimit = profile.ai_limit || profile.ai_daily_limit || null;
    user.subscriptionStatus = profile.subscription_status;
    user.paidActive = profile.plan === 'pro' || profile.plan === 'premium';
    return user;
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
        return null;
      }
      return res.data;
    } catch (e) {
      console.warn('[PTProfile]', e);
      return null;
    }
  }

  async function touchAndApply(user) {
    var profile = await touchProfile(user);
    if (profile) applyProfileToUser(user, profile);
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
    getMyAiUsageToday: getMyAiUsageToday,
    stopHeartbeat: stopHeartbeat,
    PLAN_LABELS: PLAN_LABELS
  };
})(window);
