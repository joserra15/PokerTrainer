/*
 * cloud-store.js — Sincronización Supabase (stats, history, errors, sessions).
 */
(function (global) {
  'use strict';

  const DATA_KEYS = ['stats', 'history', 'errors', 'sessions'];
  const TABLE = 'pt_user_state';
  const PUSH_DELAY_MS = 2000;

  let client = null;
  let userId = null;
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

  function isReady() {
    return hasValidConfig() && !!client && !!userId;
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
      error: 'Error sync'
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
    if (!global.supabase || !global.supabase.createClient) {
      setStatus('error', 'SDK de Supabase no cargado');
      return null;
    }
    if (!hasValidConfig()) {
      setStatus('pending', 'Falta anonKey en js/supabase-config.js');
      return null;
    }
    if (!client) {
      client = global.supabase.createClient(cfg().url, cfg().anonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    }
    if (status !== 'online' && status !== 'syncing') {
      setStatus('ready', 'Cliente listo');
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

  async function pullRow() {
    const { data, error } = await client
      .from(TABLE)
      .select('payload, updated_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function pushPayload(payload) {
    const now = new Date().toISOString();
    const body = Object.assign({}, payload, { syncedAt: now });
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
      const meta = getSyncMeta();
      const localMax = localMaxTs(meta);
      const row = await pullRow();
      const cloudTs = tsFromRow(row);
      const cloudPayload = row && row.payload ? row.payload : null;
      const cloudHas = cloudPayload && DATA_KEYS.some(function (k) {
        return hasLocalData(k, cloudPayload);
      });
      const localHas = DATA_KEYS.some(function (k) {
        return hasLocalData(k, local);
      });

      if (cloudHas && (!localHas || cloudTs >= localMax)) {
        const merged = {};
        DATA_KEYS.forEach(function (k) {
          if (cloudPayload[k] != null) merged[k] = cloudPayload[k];
        });
        global.Store.replaceFromCloud(merged);
        DATA_KEYS.forEach(function (k) { setSyncMeta(k, cloudTs); });
      } else if (localHas) {
        await pushPayload(local);
      } else if (cloudHas) {
        const merged = {};
        DATA_KEYS.forEach(function (k) {
          if (cloudPayload[k] != null) merged[k] = cloudPayload[k];
        });
        global.Store.replaceFromCloud(merged);
        DATA_KEYS.forEach(function (k) { setSyncMeta(k, cloudTs); });
      }

      setStatus('online', 'Datos sincronizados');
      global.dispatchEvent(new CustomEvent('pt-cloud-synced'));
      return true;
    } catch (e) {
      console.warn('[PTCloud] syncOnLogin', e);
      setStatus('error', e.message || 'Error al sincronizar');
      return false;
    } finally {
      syncing = false;
    }
  }

  function schedulePush(keys) {
    if (!isReady() || syncing) return;
    (keys || DATA_KEYS).forEach(function (k) { pendingKeys.add(k); });
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
      const snapshot = global.Store.getCloudSnapshot();
      const row = await pullRow();
      const payload = row && row.payload ? Object.assign({}, row.payload) : {};
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (snapshot[key] != null) payload[key] = snapshot[key];
      }
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
      setStatus('online', 'Conectado a Supabase');
      return true;
    } catch (e) {
      setStatus('error', 'No se pudo conectar: ' + (e.message || 'error'));
      return false;
    }
  }

  function setUser(user) {
    userId = user && user.sub ? user.sub : null;
    if (!userId) {
      if (pushTimer) clearTimeout(pushTimer);
      pendingKeys.clear();
      setStatus('ready', hasValidConfig() ? 'Sin usuario' : statusDetail);
      return;
    }
    init();
    setStatus('ready', 'Usuario listo');
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flushPush();
    });
  }

  global.PTCloud = {
    init,
    ping,
    setUser,
    syncOnLogin,
    schedulePush,
    flushPush,
    markLocalDirty,
    isReady,
    getClient: function () { return client; },
    getUserId: function () { return userId; },
    getStatus: function () { return { status, detail: statusDetail, syncing }; }
  };

  init();
})(window);
