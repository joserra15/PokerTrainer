/*
 * cloud-store.js — Sincronización Supabase (stats, history, errors).
 * Sesiones importadas: tabla pt_import_sessions (PTCloudSessions).
 */
(function (global) {
  'use strict';

  const DATA_KEYS = ['stats', 'history', 'errors'];
  const TABLE = 'pt_user_state';
  const PUSH_DELAY_MS = 2000;

  let userId = null;
  let legacyGoogleSub = null;
  let status = 'disabled';
  let statusDetail = 'Supabase desactivado';
  let pushTimer = null;
  let pendingKeys = new Set();
  let syncing = false;

  function cfg() {
    return global.PT_SUPABASE || {};
  }

  function hasValidConfig() {
    const c = cfg();
    return !!(c.enabled && c.url && c.anonKey);
  }

  function getClient() {
    return global.PTSupabase && global.PTSupabase.getClient
      ? global.PTSupabase.getClient()
      : null;
  }

  function isReady() {
    return hasValidConfig() && !!getClient() && !!userId;
  }

  function setStatus(next, detail) {
    status = next;
    statusDetail = detail || '';
    global.dispatchEvent(new CustomEvent('pt-cloud-status', {
      detail: { status, detail: statusDetail, syncing }
    }));
    renderStatusInAccount();
  }

  function renderStatusInAccount() {
    const meta = document.getElementById('account-meta');
    if (!meta) return;
    const cloudRow = meta.querySelector('[data-cloud-status]');
    if (!cloudRow) return;
    const labels = {
      disabled: 'Desactivado',
      pending: 'Pendiente config',
      ready: 'Listo',
      syncing: 'Sincronizando…',
      online: 'Sincronizado',
      error: 'Error sync',
      auth_required: 'Requiere login'
    };
    cloudRow.querySelector('strong').textContent = labels[status] || status;
    if (status === 'error' && statusDetail) {
      cloudRow.title = statusDetail;
    }
  }

  function init() {
    if (!cfg().enabled) {
      setStatus('disabled', 'Supabase desactivado');
      return null;
    }
    if (!hasValidConfig()) {
      setStatus('pending', 'Falta anonKey en js/supabase-config.js');
      return null;
    }
    const client = getClient();
    if (!client) {
      setStatus('error', 'SDK de Supabase no cargado');
      return null;
    }
    if (status !== 'online' && status !== 'syncing') {
      setStatus(userId ? 'ready' : 'auth_required', userId ? 'Usuario listo' : 'Inicia sesión');
    }
    return client;
  }

  function syncMetaKey() {
    return userId ? 'pt_sync_meta_' + userId : null;
  }

  function getSyncMeta() {
    const k = syncMetaKey();
    if (!k) return {};
    try {
      const raw = localStorage.getItem(k);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function setSyncMeta(key, ts) {
    const k = syncMetaKey();
    if (!k) return;
    const meta = getSyncMeta();
    meta[key] = ts || Date.now();
    try { localStorage.setItem(k, JSON.stringify(meta)); } catch (e) { /* noop */ }
  }

  function markLocalDirty(keys) {
    if (!userId) return;
    (keys || DATA_KEYS).forEach(function (k) { setSyncMeta(k, Date.now()); });
  }

  function tsFromRow(row) {
    if (!row || !row.updated_at) return 0;
    return new Date(row.updated_at).getTime();
  }

  function hasLocalData(key, snapshot) {
    const val = snapshot[key];
    if (key === 'stats') return !!(val && (val.handsPlayed || val.decisions));
    return Array.isArray(val) && val.length > 0;
  }

  function localMaxTs(meta) {
    let max = 0;
    for (let i = 0; i < DATA_KEYS.length; i++) {
      const t = meta[DATA_KEYS[i]] || 0;
      if (t > max) max = t;
    }
    return max;
  }

  async function pullRowById(id) {
    const client = getClient();
    const { data, error } = await client
      .from(TABLE)
      .select('user_id, payload, updated_at')
      .eq('user_id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function pullRow() {
    let row = await pullRowById(userId);
    if (!row && legacyGoogleSub && legacyGoogleSub !== userId) {
      row = await pullRowById(legacyGoogleSub);
      if (row) row._fromLegacy = true;
    }
    return row;
  }

  async function migrateLegacyCloudRow(row) {
    if (!row || !legacyGoogleSub || legacyGoogleSub === userId) return;
    const payload = row.payload || {};
    await pushPayload(payload);
    const client = getClient();
    const { error } = await client.from(TABLE).delete().eq('user_id', legacyGoogleSub);
    if (error) console.warn('[PTCloud] migrate delete legacy', error);
  }

  function stripLegacySessions(payload) {
    if (!payload) return payload;
    const body = Object.assign({}, payload);
    delete body.sessions;
    return body;
  }

  async function migrateLegacyCloudSessions(cloudPayload) {
    if (!global.Store || !global.Store.migrateLegacyPayloadSessions) return 0;
    if (!cloudPayload || !cloudPayload.sessions) return 0;
    const sessions = cloudPayload.sessions;
    if (!Array.isArray(sessions) || !sessions.length) return 0;
    const res = await global.Store.migrateLegacyPayloadSessions(sessions);
    return res && res.migrated ? res.migrated : 0;
  }

  async function refreshSessionsIndex() {
    if (!global.Store || !global.Store.refreshSessionsIndexFromCloud) return;
    try {
      await global.Store.refreshSessionsIndexFromCloud();
    } catch (e) {
      console.warn('[PTCloud] refresh sessions index', e);
    }
  }

  async function pushPayload(payload) {
    const client = getClient();
    const now = new Date().toISOString();
    const body = stripLegacySessions(Object.assign({}, payload, { syncedAt: now }));
    const { error } = await client.from(TABLE).upsert({
      user_id: userId,
      payload: body,
      updated_at: now
    }, { onConflict: 'user_id' });
    if (error) throw error;
    const ts = new Date(now).getTime();
    DATA_KEYS.forEach(function (k) { setSyncMeta(k, ts); });
  }

  async function syncOnLogin() {
    if (!userId || !init()) return false;
    if (!global.Store || !global.Store.getCloudSnapshot) return false;

    syncing = true;
    setStatus('syncing', 'Sincronizando con la nube…');

    try {
      const local = global.Store.getCloudSnapshot();
      const localHas = DATA_KEYS.some(function (k) { return hasLocalData(k, local); });
      const row = await pullRow();
      const cloudPayload = row && row.payload ? row.payload : null;
      const cloudHas = cloudPayload && DATA_KEYS.some(function (k) {
        return hasLocalData(k, cloudPayload);
      });

      if (cloudPayload && cloudPayload.sessions) {
        await migrateLegacyCloudSessions(cloudPayload);
      }
      if (global.Store.uploadLegacyLocalSessionsToCloud) {
        await global.Store.uploadLegacyLocalSessionsToCloud();
      }

      if (cloudHas && localHas && global.Store.mergeFromCloud) {
        global.Store.mergeFromCloud(cloudPayload);
      } else if (cloudHas) {
        const merged = {};
        DATA_KEYS.forEach(function (k) {
          if (cloudPayload[k] != null) merged[k] = cloudPayload[k];
        });
        global.Store.replaceFromCloud(merged);
        DATA_KEYS.forEach(function (k) { setSyncMeta(k, tsFromRow(row)); });
      }

      if (localHas || cloudHas) {
        await pushPayload(global.Store.getCloudSnapshot());
      }

      if (row && row._fromLegacy && legacyGoogleSub && legacyGoogleSub !== userId) {
        await migrateLegacyCloudRow(row);
      }

      await refreshSessionsIndex();

      setStatus('online', 'Datos sincronizados');
      global.dispatchEvent(new CustomEvent('pt-cloud-synced'));
      return true;
    } catch (e) {
      console.warn('[PTCloud] syncOnLogin', e);
      setStatus('error', e.message || 'Error al sincronizar');
      return false;
    } finally {
      syncing = false;
      if (pendingKeys.size) schedulePush(Array.from(pendingKeys));
    }
  }

  async function syncNow() {
    if (!isReady()) {
      setStatus('error', 'Inicia sesión para sincronizar');
      return { ok: false, reason: 'not_ready' };
    }
    if (!global.Store || !global.Store.mergeFromCloud) {
      return { ok: false, reason: 'store_unavailable' };
    }
    if (syncing) return { ok: false, reason: 'busy' };

    syncing = true;
    setStatus('syncing', 'Sincronizando…');
    try {
      const row = await pullRow();
      const cloudPayload = row && row.payload ? row.payload : {};
      if (cloudPayload.sessions) {
        await migrateLegacyCloudSessions(cloudPayload);
      }
      const summary = global.Store.mergeFromCloud(cloudPayload) || {};
      await pushPayload(global.Store.getCloudSnapshot());
      if (row && row._fromLegacy && legacyGoogleSub && legacyGoogleSub !== userId) {
        await migrateLegacyCloudRow(row);
      }
      await refreshSessionsIndex();
      setStatus('online', 'Sincronizado');
      global.dispatchEvent(new CustomEvent('pt-cloud-synced', { detail: summary }));
      return { ok: true, summary: summary };
    } catch (e) {
      console.warn('[PTCloud] syncNow', e);
      setStatus('error', e.message || 'Error al sincronizar');
      return { ok: false, reason: e.message || 'error' };
    } finally {
      syncing = false;
    }
  }

  function schedulePush(keys) {
    if (!isReady()) return;
    (keys || DATA_KEYS).forEach(function (k) { pendingKeys.add(k); });
    if (syncing) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(flushPush, PUSH_DELAY_MS);
  }

  async function flushPush() {
    if (!isReady() || syncing || !pendingKeys.size) return;
    if (!global.Store || !global.Store.getCloudSnapshot) return;

    const keys = Array.from(pendingKeys);
    pendingKeys.clear();
    pushTimer = null;

    try {
      const row = await pullRow();
      const cloudPayload = row && row.payload ? row.payload : {};
      const payload = global.Store.mergeDirtyKeysIntoCloud
        ? global.Store.mergeDirtyKeysIntoCloud(cloudPayload, keys)
        : (function () {
          const snapshot = global.Store.getCloudSnapshot();
          const merged = Object.assign({}, cloudPayload);
          keys.forEach(function (key) {
            if (snapshot[key] != null) merged[key] = snapshot[key];
          });
          return merged;
        })();
      await pushPayload(payload);
      if (status !== 'syncing') setStatus('online', 'Guardado en la nube');
    } catch (e) {
      console.warn('[PTCloud] push', e);
      setStatus('error', e.message || 'Error al guardar');
      keys.forEach(function (k) { pendingKeys.add(k); });
    }
  }

  async function ping() {
    const c = init();
    if (!c) return false;
    try {
      const { error } = await c.from(TABLE).select('user_id').limit(1);
      if (error) throw error;
      setStatus(userId ? 'online' : 'auth_required', userId ? 'Conectado' : 'Requiere login');
      return true;
    } catch (e) {
      setStatus('error', 'No se pudo conectar: ' + (e.message || 'error'));
      return false;
    }
  }

  function setUser(user) {
    userId = user && user.sub ? user.sub : null;
    legacyGoogleSub = user && user.googleSub ? user.googleSub : null;
    if (!userId) {
      if (pushTimer) clearTimeout(pushTimer);
      pendingKeys.clear();
      legacyGoogleSub = null;
      setStatus('auth_required', hasValidConfig() ? 'Sin usuario' : statusDetail);
      return;
    }
    init();
    setStatus('ready', 'Usuario listo');
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flushPush();
    });
    window.addEventListener('pagehide', function () { flushPush(); });
  }

  async function deleteUserRow() {
    if (!userId || !init()) return { ok: false, reason: 'not_ready' };
    if (syncing) return { ok: false, reason: 'busy' };
    syncing = true;
    try {
      const client = getClient();
      const { error } = await client.from(TABLE).delete().eq('user_id', userId);
      if (error) throw error;
      if (legacyGoogleSub && legacyGoogleSub !== userId) {
        await client.from(TABLE).delete().eq('user_id', legacyGoogleSub);
      }
      if (global.PTCloudSessions && global.PTCloudSessions.purgeUserSessions) {
        await global.PTCloudSessions.purgeUserSessions(userId);
        if (legacyGoogleSub && legacyGoogleSub !== userId) {
          await global.PTCloudSessions.purgeUserSessions(legacyGoogleSub);
        }
      }
      const metaK = syncMetaKey();
      if (metaK) {
        try { localStorage.removeItem(metaK); } catch (e) { /* noop */ }
      }
      setStatus('ready', 'Datos en nube eliminados');
      return { ok: true };
    } catch (e) {
      console.warn('[PTCloud] deleteUserRow', e);
      setStatus('error', e.message || 'Error al eliminar en nube');
      return { ok: false, reason: e.message || 'error' };
    } finally {
      syncing = false;
    }
  }

  global.PTCloud = {
    init,
    ping,
    setUser,
    syncOnLogin,
    syncNow,
    schedulePush,
    flushPush,
    markLocalDirty,
    deleteUserRow,
    isReady,
    getClient: getClient,
    getUserId: function () { return userId; },
    getStatus: function () { return { status, detail: statusDetail, syncing }; }
  };

  init();
})(window);
