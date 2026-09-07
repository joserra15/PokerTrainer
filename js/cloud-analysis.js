/*
 * cloud-analysis.js — Manos de «Análisis de manos» en Supabase (pt_analysis_hands).
 * Persistencia principal en nube; el dispositivo solo guarda un índice ligero.
 */
(function (global) {
  'use strict';

  const TABLE = 'pt_analysis_hands';

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
    if (global.PT_E2E_MODE) return false;
    return !!(cfg().enabled && cfg().url && cfg().anonKey && getClient() && userId);
  }

  function setUser(user) {
    userId = user && user.sub ? user.sub : null;
    legacyGoogleSub = user && user.googleSub ? user.googleSub : null;
  }

  function slimDecision(d) {
    if (!d || typeof d !== 'object') return d;
    const out = Object.assign({}, d);
    delete out.optionBreakdown;
    delete out.explanation;
    delete out.context;
    delete out.mathParams;
    return out;
  }

  function slimPayload(hand) {
    let s;
    try {
      s = JSON.parse(JSON.stringify(hand || {}));
    } catch (e) {
      s = Object.assign({}, hand || {});
    }
    (s.decisions || []).forEach(function (d, i) {
      s.decisions[i] = slimDecision(d);
    });
    if (Array.isArray(s.streets)) {
      s.streets.forEach(function (st) {
        if (!st || !Array.isArray(st.actions)) return;
        st.actions.forEach(function (a, i) {
          st.actions[i] = slimDecision(a);
        });
      });
    }
    return s;
  }

  function handSummary(hand) {
    return {
      id: hand.id,
      createdAt: hand.createdAt || null,
      savedName: hand.savedName || null,
      heroPos: hand.heroPos || null,
      heroCards: hand.heroCards || null,
      heroCode: hand.heroCode || null,
      board: hand.board || null,
      handScore: hand.handScore != null ? hand.handScore : null,
      source: hand.source || null,
      cloudOnly: true,
      hasAiAnalysis: !!hand.aiAnalysis,
      hasCoachThread: !!(hand.coachThread && hand.coachThread.length)
    };
  }

  async function uploadHand(hand) {
    if (!isReady()) return { ok: false, error: 'cloud_not_ready' };
    if (!hand || !hand.id) return { ok: false, error: 'invalid_hand' };
    const client = getClient();
    const now = new Date().toISOString();
    const payload = slimPayload(hand);
    const summary = handSummary(hand);
    const { error } = await client.from(TABLE).upsert({
      user_id: userId,
      hand_id: hand.id,
      summary: summary,
      payload: payload,
      deleted_at: null,
      updated_at: now
    }, { onConflict: 'user_id,hand_id' });
    if (error) {
      console.warn('[PTCloudAnalysis] upload', error);
      return { ok: false, error: error.message || 'upload_failed' };
    }
    return { ok: true, hand: payload, summary: summary };
  }

  async function listHands() {
    if (!isReady()) return { ok: false, hands: [], error: 'cloud_not_ready' };
    const client = getClient();
    const { data, error } = await client
      .from(TABLE)
      .select('hand_id, summary, updated_at')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });
    if (error) {
      console.warn('[PTCloudAnalysis] list', error);
      return { ok: false, hands: [], error: error.message || 'list_failed' };
    }
    const hands = (data || []).map(function (row) {
      const s = Object.assign({}, row.summary || {});
      s.id = row.hand_id;
      s.cloudOnly = true;
      return s;
    });
    return { ok: true, hands: hands };
  }

  async function fetchHand(handId) {
    if (!isReady() || !handId) return { ok: false, error: 'cloud_not_ready' };
    const client = getClient();
    const { data, error } = await client
      .from(TABLE)
      .select('payload')
      .eq('user_id', userId)
      .eq('hand_id', handId)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) {
      console.warn('[PTCloudAnalysis] fetch', error);
      return { ok: false, error: error.message || 'fetch_failed' };
    }
    if (!data || !data.payload) return { ok: false, error: 'not_found' };
    const hand = data.payload;
    hand.id = handId;
    return { ok: true, hand: hand };
  }

  async function deleteHand(handId) {
    if (!isReady() || !handId) return { ok: false, error: 'cloud_not_ready' };
    const client = getClient();
    const { error } = await client
      .from(TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('hand_id', handId);
    if (error) {
      console.warn('[PTCloudAnalysis] delete', error);
      return { ok: false, error: error.message || 'delete_failed' };
    }
    return { ok: true };
  }

  async function purgeUserHands(uid) {
    if (!getClient() || !uid) return { ok: false };
    const { error } = await getClient().from(TABLE).delete().eq('user_id', uid);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  global.PTCloudAnalysis = {
    setUser,
    isReady,
    slimPayload,
    handSummary,
    uploadHand,
    listHands,
    fetchHand,
    deleteHand,
    purgeUserHands
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
