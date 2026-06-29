/*
 * cloud-sessions.js — Sesiones importadas en Supabase (pt_import_sessions).
 * Persistencia principal en nube; el dispositivo solo guarda un índice ligero.
 */
(function (global) {
  'use strict';

  const TABLE = 'pt_import_sessions';

  let userId = null;
  let legacyGoogleSub = null;

  function cfg() {
    return global.PT_SUPABASE || {};
  }

  function getClient() {
    return global.PTSupabase && global.PTSupabase.getClient
      ? global.PTSupabase.getClient()
      : null;
  }

  function isReady() {
    return !!(cfg().enabled && cfg().url && cfg().anonKey && getClient() && userId);
  }

  function setUser(user) {
    userId = user && user.sub ? user.sub : null;
    legacyGoogleSub = user && user.googleSub ? user.googleSub : null;
  }

  function slimPayload(session) {
    const s = JSON.parse(JSON.stringify(session || {}));
    delete s.rawText;
    (s.hands || []).forEach(function (h) {
      (h.decisions || []).forEach(function (d) {
        delete d.optionBreakdown;
        delete d.explanation;
        delete d.context;
        delete d.mathParams;
      });
    });
    return s;
  }

  function sessionSummary(session) {
    return {
      id: session.id,
      fileName: session.fileName,
      hero: session.hero,
      createdAt: session.createdAt,
      nTotal: session.nTotal,
      nDiscarded: session.nDiscarded,
      stats: session.stats,
      analysisVersion: session.analysisVersion,
      hasTxt: false,
      cloudOnly: true
    };
  }

  async function uploadSession(session) {
    if (!isReady()) return { ok: false, error: 'cloud_not_ready' };
    const client = getClient();
    const now = new Date().toISOString();
    const payload = slimPayload(session);
    const summary = sessionSummary(session);
    const { error } = await client.from(TABLE).upsert({
      user_id: userId,
      session_id: session.id,
      summary: summary,
      payload: payload,
      deleted_at: null,
      updated_at: now
    }, { onConflict: 'user_id,session_id' });
    if (error) {
      console.warn('[PTCloudSessions] upload', error);
      return { ok: false, error: error.message || 'upload_failed' };
    }
    return { ok: true, session: payload, summary: summary };
  }

  async function listSessions() {
    if (!isReady()) return { ok: false, sessions: [], error: 'cloud_not_ready' };
    const client = getClient();
    const { data, error } = await client
      .from(TABLE)
      .select('session_id, summary, updated_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });
    if (error) {
      console.warn('[PTCloudSessions] list', error);
      return { ok: false, sessions: [], error: error.message || 'list_failed' };
    }
    const sessions = (data || []).map(function (row) {
      const s = Object.assign({}, row.summary || {});
      s.id = row.session_id;
      s.cloudOnly = true;
      return s;
    });
    return { ok: true, sessions: sessions };
  }

  async function fetchSession(sessionId) {
    if (!isReady() || !sessionId) return { ok: false, error: 'cloud_not_ready' };
    const client = getClient();
    const { data, error } = await client
      .from(TABLE)
      .select('payload')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) {
      console.warn('[PTCloudSessions] fetch', error);
      return { ok: false, error: error.message || 'fetch_failed' };
    }
    if (!data || !data.payload) return { ok: false, error: 'not_found' };
    return { ok: true, session: data.payload };
  }

  async function deleteSession(sessionId) {
    if (!isReady() || !sessionId) return { ok: false, error: 'cloud_not_ready' };
    const client = getClient();
    const { error } = await client
      .from(TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('session_id', sessionId);
    if (error) {
      console.warn('[PTCloudSessions] delete', error);
      return { ok: false, error: error.message || 'delete_failed' };
    }
    return { ok: true };
  }

  async function migrateSessionsFromPayload(sessions) {
    if (!isReady() || !sessions || !sessions.length) return { ok: true, migrated: 0 };
    let migrated = 0;
    for (let i = 0; i < sessions.length; i++) {
      const res = await uploadSession(sessions[i]);
      if (res.ok) migrated++;
    }
    return { ok: true, migrated: migrated };
  }

  async function purgeUserSessions(uid) {
    if (!getClient() || !uid) return { ok: false };
    const { error } = await getClient().from(TABLE).delete().eq('user_id', uid);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  global.PTCloudSessions = {
    setUser,
    isReady,
    slimPayload,
    sessionSummary,
    uploadSession,
    listSessions,
    fetchSession,
    deleteSession,
    migrateSessionsFromPayload,
    purgeUserSessions
  };
})(window);
