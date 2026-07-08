/*
 * storage.js
 * Persistencia en localStorage: histórico de manos jugadas y registro de
 * errores (spots a repetir). Expuesto como `Store`.
 * Los datos se namespanean por usuario (Google sub) cuando hay sesión activa.
 */
(function (global) {
  'use strict';

  const KEY_PREFIX = 'pt_';
  const KEY_SUFFIX = '_v1';
  const LEGACY_KEYS = {
    history: 'pt_history_v1',
    errors: 'pt_errors_v1',
    stats: 'pt_stats_v1',
    sessions: 'pt_sessions_v1'
  };
  const MAX_HISTORY = 500;
  const COACH_THREAD_MAX = 10;

  let userId = null;

  function scopedKey(base) {
    if (userId) return KEY_PREFIX + base + KEY_SUFFIX + '_' + userId;
    return KEY_PREFIX + base + KEY_SUFFIX;
  }

  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function readRaw(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }
  function writeRaw(key, val) {
    try { localStorage.setItem(key, val); return true; }
    catch (e) { return false; }
  }

  function sessionTxtKey(id) {
    return scopedKey('session_txt') + '_' + id;
  }

  /** Reduce tamaño de sesión para localStorage (197 manos ≈ 580 KB → 230 KB). */
  function slimSession(session) {
    const s = JSON.parse(JSON.stringify(session));
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

  function notifySync(keys) {
    if (!global.PTCloud) return;
    const cloudKeys = (keys || []).filter(function (k) { return k !== 'sessions'; });
    if (!cloudKeys.length) return;
    if (global.PTCloud.markLocalDirty) global.PTCloud.markLocalDirty(cloudKeys);
    if (global.PTCloud.schedulePush) global.PTCloud.schedulePush(cloudKeys);
  }

  const sessionMemoryCache = {};

  function getDeletedSessionIds() {
    return read(scopedKey('sessions_deleted'), []);
  }

  function markSessionDeleted(id) {
    if (!id) return;
    const ids = getDeletedSessionIds();
    if (ids.indexOf(id) < 0) {
      ids.push(id);
      write(scopedKey('sessions_deleted'), ids);
    }
  }

  function filterDeletedSessions(sessions) {
    const deleted = {};
    getDeletedSessionIds().forEach(function (id) { deleted[id] = true; });
    return (sessions || []).filter(function (s) { return s && s.id && !deleted[s.id]; });
  }

  function getSessionIndex() {
    return read(scopedKey('sessions_index'), []);
  }

  function writeSessionIndex(list) {
    return write(scopedKey('sessions_index'), list || []);
  }

  function migrateLegacySessionsList() {
    const legacy = read(scopedKey('sessions'), []);
    if (!legacy.length) return;
    const index = getSessionIndex();
    const ids = {};
    index.forEach(function (s) { ids[s.id] = true; });
    legacy.forEach(function (s) {
      if (!s || !s.id || ids[s.id]) return;
      index.unshift({
        id: s.id,
        fileName: s.fileName,
        hero: s.hero,
        createdAt: s.createdAt,
        nTotal: s.nTotal,
        nDiscarded: s.nDiscarded,
        stats: s.stats,
        analysisVersion: s.analysisVersion,
        hasTxt: false,
        cloudOnly: true
      });
      ids[s.id] = true;
    });
    writeSessionIndex(index);
    try { localStorage.removeItem(scopedKey('sessions')); } catch (e) { /* ignore */ }
  }

  async function uploadLegacyLocalSessionsToCloud() {
    const CS = global.PTCloudSessions;
    if (!CS || !CS.isReady()) return { uploaded: 0 };
    const legacy = read(scopedKey('sessions'), []);
    if (!legacy.length) return { uploaded: 0 };
    let uploaded = 0;
    for (let i = 0; i < legacy.length; i++) {
      const s = legacy[i];
      if (!s || !s.id) continue;
      let full = s;
      if (s.hasTxt) {
        const txt = readRaw(sessionTxtKey(s.id));
        if (txt) full = Object.assign({}, s, { rawText: txt });
      }
      const res = await CS.uploadSession(full);
      if (res.ok) uploaded++;
    }
    try { localStorage.removeItem(scopedKey('sessions')); } catch (e) { /* ignore */ }
    legacy.forEach(function (s) {
      if (s && s.id) {
        try { localStorage.removeItem(sessionTxtKey(s.id)); } catch (e) { /* ignore */ }
      }
    });
    return { uploaded: uploaded };
  }

  function migrateLegacyOnce(uid) {
    if (!uid) return;
    if (localStorage.getItem('pt_account_purged_' + uid)) return;
    const flag = 'pt_migrated_v1_' + uid;
    if (localStorage.getItem(flag)) return;
    Object.keys(LEGACY_KEYS).forEach(function (base) {
      const legacy = LEGACY_KEYS[base];
      const raw = localStorage.getItem(legacy);
      if (!raw) return;
      const target = scopedKey(base);
      if (!localStorage.getItem(target)) localStorage.setItem(target, raw);
    });
    localStorage.setItem(flag, '1');
  }

  function setUserId(uid) {
    userId = uid || null;
    if (userId) migrateLegacyOnce(userId);
  }

  function defaultStats() {
    return {
      handsPlayed: 0, totalEvLoss: 0, totalNet: 0,
      decisions: 0, optima: 0, aceptable: 0, imprecisa: 0, error: 0,
      byStreet: {
        preflop: { n: 0, good: 0 },
        flop: { n: 0, good: 0 },
        turn: { n: 0, good: 0 },
        river: { n: 0, good: 0 }
      }
    };
  }

  function writeStats(st) {
    st.updatedAt = Date.now();
    write(scopedKey('stats'), st);
  }

  function clearedAtStorageKey() {
    return scopedKey('cleared_at');
  }

  function getClearedAt() {
    return read(clearedAtStorageKey(), {});
  }

  function writeClearedAt(ca) {
    write(clearedAtStorageKey(), ca || {});
  }

  function markCleared(key) {
    const ca = getClearedAt();
    ca[key] = Date.now();
    writeClearedAt(ca);
    if (key === 'stats') {
      try { localStorage.removeItem(scopedKey('stats_coach')); } catch (e) { /* noop */ }
    }
  }

  function filterByClearedAt(arr, clearedTs) {
    if (!clearedTs) return arr || [];
    return (arr || []).filter(function (item) {
      if (!item) return false;
      const ts = item.createdAt ? new Date(item.createdAt).getTime() : 0;
      return !ts || ts > clearedTs;
    });
  }

  function isStatsEmpty(st) {
    return !(st && ((st.handsPlayed || 0) > 0 || (st.decisions || 0) > 0));
  }

  function hasRejectRemote(key) {
    return !!(getClearedAt()[key + '_reject']);
  }

  function rejectRemoteClears(keys) {
    const ca = getClearedAt();
    (keys || []).forEach(function (k) { ca[k + '_reject'] = Date.now(); });
    writeClearedAt(ca);
  }

  function clearRejectRemote(keys) {
    const ca = getClearedAt();
    let changed = false;
    (keys || []).forEach(function (k) {
      const flag = k + '_reject';
      if (ca[flag]) { delete ca[flag]; changed = true; }
    });
    if (changed) writeClearedAt(ca);
  }

  function effectiveCloudClear(key, cloudCa) {
    if (hasRejectRemote(key)) return 0;
    return (cloudCa && cloudCa[key]) || 0;
  }

  function mergeClearedAtMeta(localCa, cloudCa) {
    const out = Object.assign({}, localCa || {});
    Object.keys(cloudCa || {}).forEach(function (k) {
      if (k.indexOf('_reject') >= 0) return;
      out[k] = Math.max(out[k] || 0, cloudCa[k] || 0);
    });
    return out;
  }

  function mergeStatsWithClear(localStats, cloudStats, localCa, cloudCa) {
    const lClear = (localCa && localCa.stats) || 0;
    const cClear = effectiveCloudClear('stats', cloudCa);
    if (lClear > cClear && isStatsEmpty(cloudStats)) {
      return JSON.parse(JSON.stringify(localStats));
    }
    if (cClear > lClear && isStatsEmpty(localStats)) {
      return JSON.parse(JSON.stringify(cloudStats));
    }
    return mergeStats(localStats, cloudStats);
  }

  function hasLocalDataAfterClear(key, snapshot, localClearTs) {
    if (key === 'stats') {
      const st = snapshot.stats;
      if (isStatsEmpty(st)) return false;
      return (st.updatedAt || 0) > (localClearTs || 0);
    }
    return (snapshot[key] || []).some(function (item) {
      const ts = item.createdAt ? new Date(item.createdAt).getTime() : Date.now();
      return ts > (localClearTs || 0);
    });
  }

  function detectResetConflicts(cloudSnapshot) {
    if (!cloudSnapshot) return [];
    const cloudCa = cloudSnapshot.clearedAt || {};
    const localCa = getClearedAt();
    const local = getCloudSnapshot();
    const labels = { history: 'histórico', errors: 'errores', stats: 'estadísticas' };
    const conflicts = [];
    ['history', 'errors', 'stats'].forEach(function (key) {
      const cloudTs = cloudCa[key] || 0;
      const localTs = localCa[key] || 0;
      if (cloudTs <= localTs) return;
      if (!hasLocalDataAfterClear(key, local, localTs)) return;
      conflicts.push({ key: key, label: labels[key] || key });
    });
    return conflicts;
  }

  function applyRemoteClears(cloudCa, keys) {
    const ca = getClearedAt();
    (keys || ['history', 'errors', 'stats']).forEach(function (k) {
      const cloudTs = (cloudCa && cloudCa[k]) || 0;
      if (cloudTs > (ca[k] || 0)) ca[k] = cloudTs;
      delete ca[k + '_reject'];
    });
    writeClearedAt(ca);
    if (ca.history) write(scopedKey('history'), filterByClearedAt(getHistory(), ca.history));
    if (ca.errors) write(scopedKey('errors'), filterByClearedAt(getErrors(), ca.errors));
    if (ca.stats) {
      const st = getStats();
      if (isStatsEmpty(st) || (st.updatedAt || 0) <= ca.stats) {
        writeStats(defaultStats());
      }
    }
  }

  function mergeStats(localStats, cloudStats) {
    const a = localStats && typeof localStats === 'object' ? localStats : defaultStats();
    const b = cloudStats && typeof cloudStats === 'object' ? cloudStats : defaultStats();
    const lt = a.updatedAt || 0;
    const ct = b.updatedAt || 0;
    const pick = lt >= ct ? a : b;
    const other = lt >= ct ? b : a;
    const out = JSON.parse(JSON.stringify(pick));
    delete out.updatedAt;
    if (global.PTStatsAggregate && global.PTStatsAggregate.mergeAggregates) {
      out.aggregates = global.PTStatsAggregate.mergeAggregates(
        pick.aggregates,
        other.aggregates
      );
      global.PTStatsAggregate.rebuildTrainerLeaksFromHistory(out.aggregates, getHistory());
    }
    return out;
  }
  function getHistory() { return read(scopedKey('history'), []); }
  function getErrors() { return read(scopedKey('errors'), []); }
  function getStats() {
    var st = read(scopedKey('stats'), defaultStats());
    if (global.PTStatsAggregate) {
      global.PTStatsAggregate.ensureAggregates(st);
      var aggVer = global.PTStatsAggregate.AGG_VERSION || 2;
      if (!st._aggVersion || st._aggVersion < aggVer) {
        global.PTStatsAggregate.rebuildFromLegacy(st, getHistory(), getSessions());
        st._aggVersion = aggVer;
        st._aggMigrated = true;
        writeStats(st);
      }
    }
    return st;
  }

  /** Guarda una mano completada y actualiza errores y estadísticas. */
  function saveHand(hand) {
    if (global.GTO && global.GTO.EvLoss) {
      hand.result.totalEvLoss = global.GTO.EvLoss.totalEvLossFromDecisions(hand.decisions);
    }
    const rec = serializeHand(hand);
    const hist = getHistory();
    hist.unshift(rec);
    if (hist.length > MAX_HISTORY) hist.length = MAX_HISTORY;
    write(scopedKey('history'), hist);

    const errs = getErrors();
    hand.decisions.forEach((d, idx) => {
      if (d.class === 'error' || d.class === 'imprecisa') {
        const sc = hand.scenario || {};
        const spotKey = sc.type + '|' + (hand.displayHeroPos || hand.hero.pos || rec.heroPos || '?') + '|' + (d.street || 'preflop');
        errs.unshift({
          id: rec.id + '_' + idx,
          handId: rec.id,
          createdAt: rec.createdAt,
          seed: rec.seed,
          scenarioRaw: rec.scenarioRaw,
          scenario: rec.scenario,
          playConfig: rec.playConfig,
          displayHeroPos: rec.displayHeroPos,
          replaySnapshot: rec.replaySnapshot,
          heroPos: rec.heroPos,
          heroCode: rec.heroCode,
          heroCards: rec.heroCards,
          street: d.street,
          spotKey: spotKey,
          chosen: d.label,
          chosenAction: d.action,
          best: d.best,
          class: d.class,
          evLoss: d.evLoss,
          evErroneous: d.evErroneous,
          mathParams: d.mathParams,
          context: d.context,
          gto: d.gto,
          repeated: 0
        });
      }
    });
    if (errs.length > MAX_HISTORY) errs.length = MAX_HISTORY;
    write(scopedKey('errors'), errs);

    const st = getStats();
    if (!st.byStreet) st.byStreet = defaultStats().byStreet;
    st.handsPlayed += 1;
    st.totalEvLoss += hand.result.totalEvLoss || 0;
    st.totalNet += hand.result.heroNet || 0;
    hand.decisions.forEach((d) => {
      st.decisions += 1;
      st[d.class] = (st[d.class] || 0) + 1;
      const street = st.byStreet[d.street];
      if (street) {
        street.n += 1;
        if (d.class === 'optima' || d.class === 'aceptable') street.good += 1;
      }
    });
    st.totalEvLoss = Math.round(st.totalEvLoss * 100) / 100;
    st.totalNet = Math.round(st.totalNet * 100) / 100;
    if (global.PTStatsAggregate) global.PTStatsAggregate.applyTrainerHand(st, rec);
    writeStats(st);
    notifySync(['history', 'errors', 'stats']);

    return rec;
  }

  function serializeHand(hand) {
    const r = hand.result || {};
    return {
      id: hand.id,
      createdAt: hand.createdAt,
      seed: hand.seed,
      scenario: scenarioLabel(hand),
      scenarioRaw: hand.scenario,
      playConfig: hand.playConfig ? Object.assign({}, hand.playConfig) : null,
      displayHeroPos: hand.displayHeroPos || null,
      replaySnapshot: hand.replaySnapshot ? {
        scenario: Object.assign({}, hand.replaySnapshot.scenario || {}),
        seed: hand.replaySnapshot.seed,
        playConfig: hand.replaySnapshot.playConfig ? Object.assign({}, hand.replaySnapshot.playConfig) : null,
        displayHeroPos: hand.replaySnapshot.displayHeroPos || null
      } : null,
      heroPos: hand.hero.pos,
      heroCode: hand.hero.code,
      heroCards: hand.hero.cards,
      villainPos: hand.villain.pos,
      villainCards: r.villainCards || hand.villain.cards,
      board: r.board || hand.board,
      heroNet: r.heroNet || 0,
      totalEvLoss: r.totalEvLoss || 0,
      nErrors: r.nErrors || 0,
      showdown: !!r.showdown,
      reason: r.reason || '',
      heroHandName: r.heroHandName || null,
      villainHandName: r.villainHandName || null,
      villainProfile: r.villainProfile || hand.villain.profileLabel || null,
      villainProfileShort: r.villainProfileShort || hand.villain.profileShort || null,
      decisions: hand.decisions.map((d) => ({
        street: d.street, action: d.action, label: d.label,
        class: d.class, best: d.best, evLoss: d.evLoss, evErroneous: d.evErroneous,
        mathParams: d.mathParams, heroEquity: d.heroEquity, toCallBB: d.toCallBB,
        gto: d.gto, context: d.context, explanation: d.explanation,
        optionBreakdown: d.optionBreakdown, evErrorReasons: d.evErrorReasons
      }))
    };
  }

  function scenarioLabel(hand) {
    const s = hand.scenario;
    if (s.type === 'RFI') return `RFI ${s.heroPos}`;
    if (s.type === 'vsRFI') return s.key.replace(/_/g, ' ');
    if (s.type === 'squeeze') return `${s.heroPos} squeeze vs ${s.openerPos}`;
    if (s.type === 'isoLimp') return `${s.heroPos} iso vs ${s.limperPos}`;
    return s.type;
  }

  function clearHistory() {
    localStorage.removeItem(scopedKey('history'));
    markCleared('history');
    notifySync(['history']);
    if (global.PTCloud && global.PTCloud.flushPush) {
      global.PTCloud.flushPush();
    }
  }

  function clearErrors() {
    localStorage.removeItem(scopedKey('errors'));
    markCleared('errors');
    notifySync(['errors']);
    if (global.PTCloud && global.PTCloud.flushPush) {
      global.PTCloud.flushPush();
    }
  }

  function clearStats() {
    const st = defaultStats();
    writeStats(st);
    markCleared('stats');
    notifySync(['stats']);
    if (global.PTCloud && global.PTCloud.flushPush) global.PTCloud.flushPush();
  }

  function clearAll() {
    clearHistory();
    clearErrors();
    clearStats();
  }

  function removeError(id) {
    const errs = getErrors().filter((e) => e.id !== id);
    write(scopedKey('errors'), errs);
    notifySync(['errors']);
  }

  function exportData() {
    return JSON.stringify({ history: getHistory(), errors: getErrors(), stats: getStats() }, null, 2);
  }

  /** Exportación RGPD: perfil + histórico + errores + stats + sesiones (con .txt local si existe). */
  function exportFullUserData(profile) {
    const sessions = getSessions().map(function (s) {
      return getSession(s.id);
    });
    return JSON.stringify({
      format: 'PokerForgeAI-GDPR-export-v1',
      exportedAt: new Date().toISOString(),
      profile: profile ? {
        sub: profile.sub,
        email: profile.email,
        name: profile.name,
        emailVerified: !!profile.emailVerified,
        locale: profile.locale || ''
      } : null,
      stats: getStats(),
      history: getHistory(),
      errors: getErrors(),
      sessions: sessions,
      note: 'Los .txt de sesión se incluyen si siguen en este dispositivo (rawText).'
    }, null, 2);
  }

  /** Renombra claves localStorage de un userId antiguo (Google sub) al nuevo (Supabase uuid). */
  function migrateLocalUserKeys(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return { moved: 0 };
    const needle = '_' + fromId;
    const repl = '_' + toId;
    let moved = 0;
    const keys = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || k.indexOf('pt_') !== 0) continue;
        if (k.indexOf(needle) >= 0) keys.push(k);
      }
      keys.forEach(function (k) {
        const val = localStorage.getItem(k);
        if (val == null) return;
        const nk = k.split(needle).join(repl);
        if (nk !== k) {
          localStorage.setItem(nk, val);
          localStorage.removeItem(k);
          moved++;
        }
      });
      if (userId === fromId) userId = toId;
    } catch (e) { /* noop */ }
    return { moved: moved };
  }

  /** Borra todos los datos locales del usuario (no cierra sesión OAuth). */
  function purgeLocalUserData(uid, opts) {
    if (!uid) return { removed: 0 };
    let removed = 0;
    const toRemove = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || k.indexOf('pt_') !== 0) continue;
        if (k === 'pt_auth_v1') continue;
        if (k.indexOf('_' + uid) >= 0 || k === 'pt_migrated_v1_' + uid || k === 'pt_sync_meta_' + uid) {
          toRemove.push(k);
        }
      }
      toRemove.forEach(function (k) {
        localStorage.removeItem(k);
        removed++;
      });
      if (opts && opts.clearLegacy) {
        Object.keys(LEGACY_KEYS).forEach(function (base) {
          const legacy = LEGACY_KEYS[base];
          if (localStorage.getItem(legacy)) {
            localStorage.removeItem(legacy);
            removed++;
          }
        });
      }
      if (localStorage.getItem('pt_ai_consent_v1')) {
        localStorage.removeItem('pt_ai_consent_v1');
        removed++;
      }
      const aiKeys = [];
      for (let j = 0; j < localStorage.length; j++) {
        const ak = localStorage.key(j);
        if (ak && ak.indexOf('pt_ai_coach_v1_') === 0) aiKeys.push(ak);
      }
      aiKeys.forEach(function (k) {
        localStorage.removeItem(k);
        removed++;
      });
      localStorage.setItem('pt_account_purged_' + uid, String(Date.now()));
    } catch (e) { /* noop */ }
    if (userId === uid) userId = null;
    return { removed: removed };
  }

  function getSessions() {
    migrateLegacySessionsList();
    return filterDeletedSessions(getSessionIndex());
  }

  function getSession(id) {
    if (sessionMemoryCache[id]) return sessionMemoryCache[id];
    const stub = getSessionIndex().find(function (x) { return x.id === id; }) || null;
    return stub;
  }

  async function getSessionAsync(id) {
    if (!id) return null;
    if (sessionMemoryCache[id]) return sessionMemoryCache[id];
    const CS = global.PTCloudSessions;
    if (CS && CS.isReady()) {
      const res = await CS.fetchSession(id);
      if (res.ok && res.session) {
        sessionMemoryCache[id] = res.session;
        return res.session;
      }
    }
    return getSession(id);
  }

  function saveSessionLocal(session) {
    const rawText = session.rawText;
    const toStore = slimSession(session);
    let hasTxt = false;
    if (rawText) {
      hasTxt = writeRaw(sessionTxtKey(session.id), rawText);
      toStore.hasTxt = hasTxt;
    } else {
      toStore.hasTxt = false;
      try { localStorage.removeItem(sessionTxtKey(session.id)); } catch (e) { /* ignore */ }
    }
    const list = getSessionIndex();
    const summary = global.PTCloudSessions
      ? global.PTCloudSessions.sessionSummary(toStore)
      : Object.assign({}, toStore, { cloudOnly: false });
    const idx = list.findIndex(function (s) { return s.id === toStore.id; });
    if (idx >= 0) list[idx] = summary; else list.unshift(summary);
    if (!writeSessionIndex(list)) {
      return { ok: false, error: 'Cuota de almacenamiento local agotada.', session: session };
    }
    sessionMemoryCache[session.id] = toStore;
    const out = Object.assign({}, session, { hasTxt: hasTxt, cloudOnly: false });
    if (hasTxt) out.rawText = rawText;
    else delete out.rawText;
    return { ok: true, session: out };
  }

  function recordSessionStats(session) {
    if (!session || !global.PTStatsAggregate) return;
    var st = getStats();
    global.PTStatsAggregate.applySessionHands(st, session);
    writeStats(st);
  }

  async function saveSession(session) {
    migrateLegacySessionsList();
    const CS = global.PTCloudSessions;
    if (CS && CS.isReady()) {
      const upload = await CS.uploadSession(session);
      if (!upload.ok) {
        return {
          ok: false,
          error: upload.error === 'cloud_not_ready'
            ? 'Inicia sesión para guardar sesiones en la nube.'
            : (upload.error || 'No se pudo guardar en la nube.')
        };
      }
      sessionMemoryCache[session.id] = upload.session;
      const list = getSessionIndex().filter(function (s) { return s.id !== session.id; });
      list.unshift(upload.summary);
      writeSessionIndex(list);
      try { localStorage.removeItem(scopedKey('sessions')); } catch (e) { /* ignore */ }
      try { localStorage.removeItem(sessionTxtKey(session.id)); } catch (e) { /* ignore */ }
      recordSessionStats(upload.session);
      return { ok: true, session: upload.session, cloudOnly: true };
    }
    const local = saveSessionLocal(session);
    if (local.ok) recordSessionStats(local.session);
    return local;
  }

  async function removeSession(id) {
    delete sessionMemoryCache[id];
    markSessionDeleted(id);
    const CS = global.PTCloudSessions;
    if (CS && CS.isReady()) {
      const res = await CS.deleteSession(id);
      if (!res.ok) console.warn('[Store] removeSession cloud', res.error);
    }
    writeSessionIndex(getSessionIndex().filter(function (s) { return s.id !== id; }));
    try { localStorage.removeItem(sessionTxtKey(id)); } catch (e) { /* ignore */ }
    try {
      const legacy = read(scopedKey('sessions'), []);
      if (legacy.length) {
        write(scopedKey('sessions'), legacy.filter(function (s) { return s.id !== id; }));
      }
    } catch (e) { /* ignore */ }
    try {
      const st = getStats();
      if (global.PTStatsAggregate) {
        global.PTStatsAggregate.removeSession(st, id);
        writeStats(st);
      }
    } catch (e) { /* ignore */ }
  }

  async function refreshSessionsIndexFromCloud() {
    const CS = global.PTCloudSessions;
    if (!CS || !CS.isReady()) return { ok: false, sessions: getSessions() };
    const res = await CS.listSessions();
    if (!res.ok) return res;
    writeSessionIndex(filterDeletedSessions(res.sessions || []));
    return res;
  }

  async function migrateLegacyPayloadSessions(sessions) {
    const CS = global.PTCloudSessions;
    if (!CS || !CS.isReady() || !sessions || !sessions.length) return { migrated: 0 };
    const deleted = {};
    getDeletedSessionIds().forEach(function (id) { deleted[id] = true; });
    const toMigrate = sessions.filter(function (s) { return s && s.id && !deleted[s.id]; });
    if (!toMigrate.length) return { migrated: 0 };
    return CS.migrateSessionsFromPayload(toMigrate);
  }
  function deleteSessionTxt(id) {
    const list = getSessionIndex();
    const s = list.find(function (x) { return x.id === id; });
    if (s) {
      try { localStorage.removeItem(sessionTxtKey(id)); } catch (e) { /* ignore */ }
      s.hasTxt = false;
      writeSessionIndex(list);
    }
    return s;
  }

  function getCloudSnapshot() {
    return {
      stats: getStats(),
      history: getHistory(),
      errors: getErrors(),
      clearedAt: getClearedAt()
    };
  }

  function mergeSessionsFromCloud(cloudSessions) {
    const local = getSessions();
    const localById = {};
    local.forEach(function (s) { localById[s.id] = s; });
    const merged = cloudSessions.map(function (cloudS) {
      const localS = localById[cloudS.id];
      if (localS && localS.rawText && !cloudS.rawText) {
        return Object.assign({}, cloudS, { rawText: localS.rawText, hasTxt: true });
      }
      return cloudS;
    });
    const cloudIds = {};
    merged.forEach(function (s) { cloudIds[s.id] = true; });
    local.forEach(function (s) {
      if (!cloudIds[s.id]) merged.unshift(s);
    });
    return merged;
  }

  function mergeRecordsById(localArr, cloudArr, maxLen) {
    const map = Object.create(null);
    function add(item) {
      if (!item || !item.id) return;
      const prev = map[item.id];
      if (!prev) { map[item.id] = item; return; }
      const ta = item.createdAt || '';
      const tb = prev.createdAt || '';
      if (ta >= tb) map[item.id] = item;
    }
    (cloudArr || []).forEach(add);
    (localArr || []).forEach(add);
    return Object.values(map).sort(function (a, b) {
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    }).slice(0, maxLen || MAX_HISTORY);
  }

  function mergeSessionsBidirectional(local, cloud) {
    const byId = {};
    (cloud || []).forEach(function (s) { byId[s.id] = s; });
    (local || []).forEach(function (s) {
      const prev = byId[s.id];
      if (!prev) { byId[s.id] = s; return; }
      byId[s.id] = Object.assign({}, prev, s, {
        rawText: s.rawText || prev.rawText || null,
        hasTxt: !!(s.rawText || prev.rawText || s.hasTxt || prev.hasTxt)
      });
    });
    return Object.values(byId).sort(function (a, b) {
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }

  function mergeArrayKeyForCloud(key, local, cloud, cloudCa, localCa, maxLen) {
    const cloudClear = effectiveCloudClear(key, cloudCa);
    const localArr = filterByClearedAt(local[key], localCa[key]);
    const cloudArr = filterByClearedAt(cloud[key] || [], cloudClear);
    const localCleared = !!(localCa[key] && localCa[key] >= cloudClear);
    if (!localArr.length && localCleared) {
      return { data: [], clearedTs: localCa[key] };
    }
    return {
      data: mergeRecordsById(localArr, cloudArr, maxLen),
      clearedTs: Math.max(localCa[key] || 0, cloudClear || 0) || 0
    };
  }

  /** Fusiona solo las claves tocadas antes de subir a la nube (evita pisar datos de otros dispositivos). */
  function mergeDirtyKeysIntoCloud(cloudPayload, dirtyKeys) {
    const cloud = cloudPayload || {};
    const local = getCloudSnapshot();
    const localCa = getClearedAt();
    const cloudCa = cloud.clearedAt || {};
    const keys = (dirtyKeys || []).filter(function (k) { return k !== 'sessions'; });
    if (!keys.length) return Object.assign({}, cloud);
    const out = Object.assign({}, cloud);
    out.clearedAt = Object.assign({}, cloudCa, localCa);
    keys.forEach(function (key) {
      if (key === 'history') {
        const merged = mergeArrayKeyForCloud('history', local, cloud, cloudCa, localCa, MAX_HISTORY);
        out.history = merged.data;
        if (merged.clearedTs) out.clearedAt.history = merged.clearedTs;
        else delete out.clearedAt.history;
        if (hasRejectRemote('history')) {
          delete out.clearedAt.history;
          if (localCa.history) out.clearedAt.history = localCa.history;
        }
      } else if (key === 'errors') {
        const merged = mergeArrayKeyForCloud('errors', local, cloud, cloudCa, localCa, MAX_HISTORY);
        out.errors = merged.data;
        if (merged.clearedTs) out.clearedAt.errors = merged.clearedTs;
        else delete out.clearedAt.errors;
        if (hasRejectRemote('errors')) {
          delete out.clearedAt.errors;
          if (localCa.errors) out.clearedAt.errors = localCa.errors;
        }
      } else if (key === 'stats') {
        const localCleared = !!(localCa.stats && localCa.stats >= effectiveCloudClear('stats', cloudCa));
        if (isStatsEmpty(local.stats) && localCleared) {
          out.stats = JSON.parse(JSON.stringify(local.stats));
          out.clearedAt.stats = localCa.stats;
        } else {
          out.stats = mergeStatsWithClear(local.stats, cloud.stats, localCa, cloudCa);
          const maxClear = Math.max(localCa.stats || 0, effectiveCloudClear('stats', cloudCa));
          if (maxClear) out.clearedAt.stats = maxClear;
          else delete out.clearedAt.stats;
        }
        if (hasRejectRemote('stats')) {
          delete out.clearedAt.stats;
          if (localCa.stats) out.clearedAt.stats = localCa.stats;
        }
      } else if (local[key] != null) {
        out[key] = local[key];
      }
    });
    delete out.sessions;
    return out;
  }

  function recomputeStatsFromHistory(history) {
    const st = defaultStats();
    (history || []).forEach(function (h) {
      st.handsPlayed += 1;
      st.totalEvLoss += h.totalEvLoss || 0;
      st.totalNet += h.heroNet || 0;
      (h.decisions || []).forEach(function (d) {
        st.decisions += 1;
        st[d.class] = (st[d.class] || 0) + 1;
        const street = st.byStreet[d.street];
        if (street) {
          street.n += 1;
          if (d.class === 'optima' || d.class === 'aceptable') street.good += 1;
        }
      });
    });
    st.totalEvLoss = Math.round(st.totalEvLoss * 100) / 100;
    st.totalNet = Math.round(st.totalNet * 100) / 100;
    return st;
  }

  /** Fusiona datos locales con snapshot de la nube (union por id). */
  function mergeFromCloud(cloudSnapshot) {
    if (!cloudSnapshot) return null;
    const local = getCloudSnapshot();
    const cloudCa = cloudSnapshot.clearedAt || {};
    const localCa = getClearedAt();
    const mergedCa = mergeClearedAtMeta(localCa, cloudCa);
    writeClearedAt(mergedCa);

    const history = mergeRecordsById(
      filterByClearedAt(local.history, localCa.history),
      filterByClearedAt(cloudSnapshot.history, effectiveCloudClear('history', cloudCa)),
      MAX_HISTORY
    );
    const errors = mergeRecordsById(
      filterByClearedAt(local.errors, localCa.errors),
      filterByClearedAt(cloudSnapshot.errors, effectiveCloudClear('errors', cloudCa)),
      MAX_HISTORY
    );
    const stats = mergeStatsWithClear(local.stats, cloudSnapshot.stats, mergedCa, cloudCa);
    write(scopedKey('history'), history);
    write(scopedKey('errors'), errors);
    writeStats(stats);
    return { history: history.length, errors: errors.length, sessions: getSessions().length, stats: stats };
  }

  function replaceFromCloud(snapshot) {
    if (!snapshot) return;
    const cloudCa = snapshot.clearedAt || {};
    const localCa = getClearedAt();
    writeClearedAt(mergeClearedAtMeta(localCa, cloudCa));
    if (snapshot.stats) {
      writeStats(JSON.parse(JSON.stringify(snapshot.stats)));
    }
    if (snapshot.history) {
      write(scopedKey('history'), filterByClearedAt(snapshot.history, effectiveCloudClear('history', cloudCa)));
    }
    if (snapshot.errors) {
      write(scopedKey('errors'), filterByClearedAt(snapshot.errors, effectiveCloudClear('errors', cloudCa)));
    }
  }

  function normalizeCoachEntry(entry) {
    return {
      id: entry.id || ('coach_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
      mode: entry.mode === 'question' ? 'question' : 'report',
      question: entry.question || undefined,
      reportMarkdown: entry.reportMarkdown || '',
      model: entry.model || null,
      createdAt: entry.createdAt || new Date().toISOString(),
      truncated: !!entry.truncated
    };
  }

  function trimCoachThread(thread) {
    if (!thread || thread.length <= COACH_THREAD_MAX) return thread;
    return thread.slice(0, COACH_THREAD_MAX);
  }

  /** target: { kind: 'history'|'session'|'sessionHand'|'stats', handId?, sessionId? } */
  function getCoachThread(target) {
    if (!target || !target.kind) return [];
    if (target.kind === 'stats') {
      return read(scopedKey('stats_coach'), []);
    }
    if (target.kind === 'history' && target.handId) {
      const rec = getHistory().find(function (h) { return h.id === target.handId; });
      return rec && rec.coachThread ? rec.coachThread.slice() : [];
    }
    if (target.sessionId) {
      const session = getSession(target.sessionId);
      if (!session) return [];
      if (target.kind === 'session') {
        return session.coachThread ? session.coachThread.slice() : [];
      }
      if (target.kind === 'sessionHand' && target.handId) {
        const hand = (session.hands || []).find(function (h) { return h.id === target.handId; });
        return hand && hand.coachThread ? hand.coachThread.slice() : [];
      }
    }
    return [];
  }

  function appendCoachEntry(target, entry) {
    const e = normalizeCoachEntry(entry);
    if (!target || !target.kind) return Promise.resolve({ ok: false, error: 'invalid_target' });

    if (target.kind === 'stats') {
      let thread = read(scopedKey('stats_coach'), []);
      thread.unshift(e);
      thread = trimCoachThread(thread);
      if (!write(scopedKey('stats_coach'), thread)) {
        return Promise.resolve({ ok: false, error: 'storage_full' });
      }
      return Promise.resolve({ ok: true, entry: e, thread: thread.slice() });
    }

    if (target.kind === 'history' && target.handId) {
      const hist = getHistory();
      const idx = hist.findIndex(function (h) { return h.id === target.handId; });
      if (idx < 0) return Promise.resolve({ ok: false, error: 'hand_not_found' });
      if (!hist[idx].coachThread) hist[idx].coachThread = [];
      hist[idx].coachThread.unshift(e);
      hist[idx].coachThread = trimCoachThread(hist[idx].coachThread);
      if (!write(scopedKey('history'), hist)) {
        return Promise.resolve({ ok: false, error: 'storage_full' });
      }
      notifySync(['history']);
      return Promise.resolve({ ok: true, entry: e, thread: hist[idx].coachThread.slice() });
    }

    if (target.sessionId) {
      return getSessionAsync(target.sessionId).then(function (session) {
        if (!session) return { ok: false, error: 'session_not_found' };
        if (target.kind === 'session') {
          if (!session.coachThread) session.coachThread = [];
          session.coachThread.unshift(e);
          session.coachThread = trimCoachThread(session.coachThread);
        } else if (target.kind === 'sessionHand' && target.handId) {
          const hand = (session.hands || []).find(function (h) { return h.id === target.handId; });
          if (!hand) return { ok: false, error: 'hand_not_found' };
          if (!hand.coachThread) hand.coachThread = [];
          hand.coachThread.unshift(e);
          hand.coachThread = trimCoachThread(hand.coachThread);
        } else {
          return { ok: false, error: 'invalid_target' };
        }
        return saveSession(session).then(function (saved) {
          if (!saved.ok) return saved;
          const thread = target.kind === 'session'
            ? (saved.session.coachThread || []).slice()
            : ((saved.session.hands || []).find(function (h) { return h.id === target.handId; }) || {}).coachThread || [];
          return { ok: true, entry: e, thread: thread.slice() };
        });
      });
    }

    return Promise.resolve({ ok: false, error: 'invalid_target' });
  }

  global.Store = {
    setUserId,
    getHistory, getErrors, getStats, saveHand, persistStats: writeStats,
    clearHistory, clearStats, clearAll, clearErrors, removeError, exportData,     exportFullUserData,
    migrateLocalUserKeys,
    purgeLocalUserData, scenarioLabel,
    getSessions, getSession, getSessionAsync, saveSession, removeSession, deleteSessionTxt,
    refreshSessionsIndexFromCloud, uploadLegacyLocalSessionsToCloud, migrateLegacyPayloadSessions,
    getCloudSnapshot, replaceFromCloud, mergeFromCloud, mergeDirtyKeysIntoCloud,
    getClearedAt, detectResetConflicts, applyRemoteClears, rejectRemoteClears, clearRejectRemote,
    getCoachThread, appendCoachEntry
  };
})(window);
