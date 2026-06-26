/*
 * user-profile.js — Perfil en Supabase (plan, admin, actividad).
 */
(function (global) {
  'use strict';

  var HEARTBEAT_MS = 5 * 60 * 1000;
  var heartbeatTimer = null;

  var PLAN_LABELS = {
    free: 'Gratis',
    pro: 'Pro',
    premium: 'Premium'
  };

  function client() {
    return global.PTSupabase && global.PTSupabase.getClient
      ? global.PTSupabase.getClient()
      : null;
  }

  function useAuth() {
    return global.PTSupabase && global.PTSupabase.useAuth && global.PTSupabase.useAuth();
  }

  function applyProfileToUser(user, profile) {
    if (!user || !profile) return user;
    user.isAdmin = !!profile.is_admin;
    user.plan = profile.plan || 'free';
    user.planLabel = PLAN_LABELS[user.plan] || user.plan;
    user.aiDailyLimit = profile.ai_limit || profile.ai_daily_limit || null;
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
    if (!useAuth()) return { used: 0, limit: 120 };
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
