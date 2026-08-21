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
    const raw = session && session.rawText;
    if (session) session.rawText = null;
    let s;
    try {
      s = JSON.parse(JSON.stringify(session || {}));
    } finally {
      if (session && raw != null) session.rawText = raw;
    }
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

  const HANDS_PER_SHARD = 200;

  function isHiddenSessionStub(s) {
    return !!(s && (s.hidden || s.shardParentId));
  }

  function visibleSessionList(list) {
    return (list || []).filter(function (s) { return s && s.id && !isHiddenSessionStub(s); });
  }

  function shardSessionId(parentId, index) {
    return String(parentId) + '__h' + index;
  }

  function buildHandShards(session, cap) {
    const hands = session.hands || [];
    const n = Math.max(1, Math.ceil(hands.length / cap));
    const ids = [];
    const payloads = [];
    for (let i = 0; i < n; i++) {
      const id = shardSessionId(session.id, i);
      const slice = hands.slice(i * cap, (i + 1) * cap);
      ids.push(id);
      payloads.push({
        id: id,
        hidden: true,
        shardParentId: session.id,
        shardIndex: i,
        shardTotal: n,
        fileName: session.fileName,
        hero: session.hero,
        createdAt: session.createdAt,
        hands: slice,
        nTotal: slice.length,
        stats: { nHands: slice.length },
        analysisVersion: session.analysisVersion
      });
    }
    return { ids: ids, payloads: payloads };
  }

  function parentForStorage(session, shardIds) {
    const n = (session.hands && session.hands.length) || (session.stats && session.stats.nHands) || 0;
    const parent = Object.assign({}, session, {
      hands: [],
      sharded: true,
      shardCount: shardIds.length,
      shardIds: shardIds,
      nTotal: Math.max(session.nTotal || 0, n),
      rawText: null,
      hasTxt: false
    });
    delete parent.freshImport;
    return parent;
  }

  async function assembleShardedSession(parent) {
    if (!parent || !parent.sharded || !parent.shardIds || !parent.shardIds.length) return parent;
    const CS = global.PTCloudSessions;
    let parts = [];
    if (CS && CS.isReady() && CS.fetchSessionsByIds) {
      parts = await CS.fetchSessionsByIds(parent.shardIds);
    }
    const byId = {};
    (parts || []).forEach(function (p) { if (p && p.id) byId[p.id] = p; });
    const hands = [];
    parent.shardIds.forEach(function (sid) {
      const p = byId[sid];
      if (p && p.hands && p.hands.length) {
        for (let i = 0; i < p.hands.length; i++) hands.push(p.hands[i]);
      }
    });
    if (!hands.length) return parent;
    return Object.assign({}, parent, { hands: hands, nTotal: hands.length });
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
    if (userId) {
      migrateLegacyOnce(userId);
      try {
        const keyed = 'pt_school_backup_v1_' + userId;
        if (!localStorage.getItem(keyed)) {
          const legacy = localStorage.getItem('pt_school_backup_v1');
          if (legacy) localStorage.setItem(keyed, legacy);
        }
      } catch (eBak) { /* ignore */ }
      try { hydrateSchoolFromBackupIntoStats(); } catch (eHyd) { /* ignore */ }
    }
  }

  function getUserId() {
    return userId;
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
      try { localStorage.removeItem(scopedKey('learn_coach')); } catch (e) { /* noop */ }
      try { localStorage.removeItem(scopedKey('learn_coach_lessons')); } catch (e) { /* noop */ }
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

  function readSchoolBackupRaw() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const keyed = 'pt_school_backup_v1' + (userId ? '_' + userId : '');
      let raw = localStorage.getItem(keyed);
      if (!raw) raw = localStorage.getItem('pt_school_backup_v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function hasSchoolProgress(st) {
    const school = st && st.school;
    if (school && typeof school === 'object') {
      if ((Number(school.xp) || 0) > 0) return true;
      const lessons = school.lessons;
      if (lessons && typeof lessons === 'object' && Object.keys(lessons).length > 0) return true;
    }
    /* Backup de Escuela cuenta como progreso local (login/sync no debe tratarlo vacío). */
    if (st && st.__skipSchoolBackup) return false;
    const bak = readSchoolBackupRaw();
    if (!bak || typeof bak !== 'object') return false;
    if ((Number(bak.xp) || 0) > 0) return true;
    return !!(bak.lessons && typeof bak.lessons === 'object' && Object.keys(bak.lessons).length > 0);
  }

  function hydrateSchoolFromBackupIntoStats() {
    const bak = readSchoolBackupRaw();
    if (!bak) return false;
    const st = getStats();
    const merged = mergeSchoolProgress(st && st.school, bak);
    if (!merged) return false;
    const before = st && st.school ? JSON.stringify(st.school) : '';
    const after = JSON.stringify(merged);
    if (before === after) return false;
    st.school = merged;
    writeStats(st);
    return true;
  }

  function isStatsEmpty(st) {
    return !(st && ((st.handsPlayed || 0) > 0 || (st.decisions || 0) > 0 || hasSchoolProgress(st)));
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

  function mergeSchoolProgress(aSchool, bSchool) {
    const a = aSchool && typeof aSchool === 'object' ? aSchool : null;
    const b = bSchool && typeof bSchool === 'object' ? bSchool : null;
    if (!a && !b) return undefined;
    if (!a) return JSON.parse(JSON.stringify(b));
    if (!b) return JSON.parse(JSON.stringify(a));
    const lessons = {};
    const ids = {};
    Object.keys(a.lessons || {}).forEach(function (id) { ids[id] = true; });
    Object.keys(b.lessons || {}).forEach(function (id) { ids[id] = true; });
    Object.keys(ids).forEach(function (id) {
      const la = (a.lessons && a.lessons[id]) || null;
      const lb = (b.lessons && b.lessons[id]) || null;
      if (!la) { lessons[id] = lb; return; }
      if (!lb) { lessons[id] = la; return; }
      const bestScore = Math.max(Number(la.bestScore) || 0, Number(lb.bestScore) || 0);
      let bestPct = Math.round(bestScore * 1000) / 10;
      if (!(Number(la.bestScore) > 0) && !(Number(lb.bestScore) > 0)) {
        const fa = la.bestPct != null ? Number(la.bestPct)
          : (la.lastPct != null ? Number(la.lastPct) : null);
        const fb = lb.bestPct != null ? Number(lb.bestPct)
          : (lb.lastPct != null ? Number(lb.lastPct) : null);
        const fallback = (fa != null && isFinite(fa)) ? fa : ((fb != null && isFinite(fb)) ? fb : null);
        if (fallback != null) bestPct = fallback;
        else bestPct = undefined;
      }
      function pickScored(field) {
        const aHas = la[field] != null && isFinite(Number(la[field]));
        const bHas = lb[field] != null && isFinite(Number(lb[field]));
        if (aHas && bHas) {
          return (la.updatedAt || '') >= (lb.updatedAt || '') ? la[field] : lb[field];
        }
        if (aHas) return la[field];
        if (bHas) return lb[field];
        return undefined;
      }
      const row = {
        bestScore: bestScore > 0 ? bestScore : (bestPct > 0 ? bestPct / 100 : bestScore),
        attempts: Math.max(Number(la.attempts) || 0, Number(lb.attempts) || 0),
        passed: !!(la.passed || lb.passed),
        gold: !!(la.gold || lb.gold),
        perfect: !!(la.perfect || lb.perfect),
        lastScore: pickScored('lastScore'),
        lastPct: pickScored('lastPct'),
        updatedAt: (la.updatedAt || '') >= (lb.updatedAt || '') ? la.updatedAt : lb.updatedAt
      };
      if (bestPct != null && isFinite(bestPct)) row.bestPct = bestPct;
      if (!(Number(row.bestScore) > 0) && row.bestPct == null) delete row.bestScore;
      lessons[id] = row;
    });
    return {
      xp: Math.max(Number(a.xp) || 0, Number(b.xp) || 0),
      lessons: lessons,
      updatedAt: Math.max(Number(a.updatedAt) || 0, Number(b.updatedAt) || 0),
      version: Math.max(Number(a.version) || 1, Number(b.version) || 1)
    };
  }

  function mergeFeatureUsage(aFu, bFu) {
    const a = aFu && typeof aFu === 'object' ? aFu : null;
    const b = bFu && typeof bFu === 'object' ? bFu : null;
    if (!a && !b) return undefined;
    if (!a) return JSON.parse(JSON.stringify(b));
    if (!b) return JSON.parse(JSON.stringify(a));
    function maxMap(x, y) {
      const out = {};
      const keys = {};
      Object.keys(x || {}).forEach(function (k) { keys[k] = true; });
      Object.keys(y || {}).forEach(function (k) { keys[k] = true; });
      Object.keys(keys).forEach(function (k) {
        out[k] = Math.max(Number(x && x[k]) || 0, Number(y && y[k]) || 0);
      });
      return out;
    }
    return {
      events: maxMap(a.events, b.events),
      tabs: maxMap(a.tabs, b.tabs),
      aiScopes: maxMap(a.aiScopes, b.aiScopes),
      aiModes: maxMap(a.aiModes, b.aiModes),
      updatedAt: Math.max(Number(a.updatedAt) || 0, Number(b.updatedAt) || 0)
    };
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
    const mergedSchool = mergeSchoolProgress(a.school, b.school);
    if (mergedSchool) out.school = mergedSchool;
    const mergedFu = mergeFeatureUsage(a.featureUsage, b.featureUsage);
    if (mergedFu) out.featureUsage = mergedFu;
    if (global.PTStatsAggregate && global.PTStatsAggregate.mergeAggregates) {
      out.aggregates = global.PTStatsAggregate.mergeAggregates(
        pick.aggregates,
        other.aggregates
      );
      global.PTStatsAggregate.rebuildTrainerLeaksFromHistory(out.aggregates, getHistory());
    }
    return out;
  }

  function normalizeFeatureUsage(fu) {
    const src = fu && typeof fu === 'object' ? fu : {};
    return {
      events: src.events && typeof src.events === 'object' ? src.events : {},
      tabs: src.tabs && typeof src.tabs === 'object' ? src.tabs : {},
      aiScopes: src.aiScopes && typeof src.aiScopes === 'object' ? src.aiScopes : {},
      aiModes: src.aiModes && typeof src.aiModes === 'object' ? src.aiModes : {},
      updatedAt: Number(src.updatedAt) || 0
    };
  }

  function getFeatureUsage() {
    const st = getStats();
    return normalizeFeatureUsage(st.featureUsage);
  }

  /** Contadores locales (se sincronizan con stats en la nube) para el panel admin de uso. */
  function trackFeatureUsage(name, props) {
    const eventName = String(name || '').trim();
    if (!eventName) return getFeatureUsage();
    const st = getStats();
    const fu = normalizeFeatureUsage(st.featureUsage);
    fu.events[eventName] = (Number(fu.events[eventName]) || 0) + 1;
    if (eventName === 'tab_view' && props && props.tab) {
      const tab = String(props.tab);
      fu.tabs[tab] = (Number(fu.tabs[tab]) || 0) + 1;
    }
    if (eventName === 'ai_coach_used') {
      if (props && props.scope) {
        const scope = String(props.scope);
        fu.aiScopes[scope] = (Number(fu.aiScopes[scope]) || 0) + 1;
      }
      if (props && props.mode) {
        const mode = String(props.mode);
        fu.aiModes[mode] = (Number(fu.aiModes[mode]) || 0) + 1;
      }
    }
    fu.updatedAt = Date.now();
    st.featureUsage = fu;
    writeStats(st);
    if (global.PTCloud) {
      if (global.PTCloud.markLocalDirty) global.PTCloud.markLocalDirty(['stats']);
      if (global.PTCloud.schedulePush) global.PTCloud.schedulePush(['stats']);
    }
    return fu;
  }

  function readLearnCoachMap() {
    const map = read(scopedKey('learn_coach_lessons'), null);
    if (map && typeof map === 'object' && !Array.isArray(map)) return map;
    return {};
  }

  function writeLearnCoachMap(map) {
    return write(scopedKey('learn_coach_lessons'), map || {});
  }
  function getHistory() { return read(scopedKey('history'), []); }
  function getErrors() {
    return read(scopedKey('errors'), []).filter(function (e) { return !isSchoolError(e); });
  }
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

  function isSchoolHand(hand) {
    if (!hand) return false;
    if (hand.school || (hand.result && hand.result.school)) return true;
    var cfg = hand.playConfig || {};
    return !!(cfg.schoolMode || cfg.school);
  }

  function isSchoolError(err) {
    if (!err) return false;
    var cfg = err.playConfig || {};
    if (cfg.schoolMode || cfg.school) return true;
    if (err.school) return true;
    return false;
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

    const schoolHand = isSchoolHand(hand);
    const errs = getErrors().filter(function (e) { return !isSchoolError(e); });
    if (!schoolHand) hand.decisions.forEach((d, idx) => {
      if (d.class === 'error' || d.class === 'imprecisa') {
        const sc = hand.scenario || {};
        const cfg = hand.playConfig || {};
        const Tax = global.PTFormatTaxonomy;
        const formatHub = cfg.formatHub || (Tax ? Tax.hubFromGameType(cfg.gameType) : 'cash');
        const practiceIntent = cfg.practiceIntent || (d.bluffSpot && d.bluffSpot.intent) || 'mixed';
        const baseKey = sc.type + '|' + (hand.displayHeroPos || hand.hero.pos || rec.heroPos || '?') + '|' + (d.street || 'preflop');
        const spotKey = Tax && Tax.formatSpotKey
          ? Tax.formatSpotKey(baseKey, {
            formatHub: formatHub,
            gameType: cfg.gameType,
            practiceIntent: practiceIntent,
            phase: cfg.resolvedPhase || cfg.mttPhase,
            street: d.street
          })
          : baseKey;
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
          formatHub: formatHub,
          practiceIntent: practiceIntent,
          mttPhase: cfg.resolvedPhase || cfg.mttPhase || null,
          chosen: d.label,
          chosenAction: d.action,
          best: d.best,
          class: d.class,
          evLoss: d.evLoss,
          evErroneous: d.evErroneous,
          mathParams: d.mathParams,
          context: d.context,
          gto: d.gto,
          icmPressure: d.icmPressure != null ? d.icmPressure : null,
          repeated: 0
        });
      }
    });
    if (errs.length > MAX_HISTORY) errs.length = MAX_HISTORY;
    write(scopedKey('errors'), errs);

    const st = getStats();
    if (!st.byStreet) st.byStreet = defaultStats().byStreet;
    /* Escuela no contamina acierto/EV/leaks de stats (ni consume cupo de entitlements). */
    st.handsPlayed += 1;
    if (!schoolHand) {
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
    }
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
        displayHeroPos: hand.replaySnapshot.displayHeroPos || null,
        forceDeal: hand.replaySnapshot.forceDeal ? {
          heroCards: (hand.replaySnapshot.forceDeal.heroCards || []).slice(),
          villainCards: (hand.replaySnapshot.forceDeal.villainCards || []).slice(),
          board: (hand.replaySnapshot.forceDeal.board || []).slice(),
          villainPos: hand.replaySnapshot.forceDeal.villainPos || null
        } : null,
        forceScript: hand.replaySnapshot.forceScript ? {
          heroPos: hand.replaySnapshot.forceScript.heroPos || null,
          villainPos: hand.replaySnapshot.forceScript.villainPos || null,
          actions: (hand.replaySnapshot.forceScript.actions || []).map(function (a) {
            return {
              street: a.street || null,
              pos: a.pos,
              action: a.action,
              amountBB: a.amountBB != null ? a.amountBB : null
            };
          })
        } : null
      } : null,
      heroPos: hand.hero.pos,
      heroCode: hand.hero.code,
      heroCards: hand.hero.cards,
      villainPos: hand.villain.pos,
      villainCards: r.villainCards || hand.villain.cards,
      board: r.board || hand.board,
      heroNet: r.heroNet || 0,
      totalEvLoss: r.totalEvLoss || 0,
      handScore: r.handScore != null ? r.handScore : (hand.handScore != null ? hand.handScore : null),
      handScoreMeta: r.handScoreMeta || hand.handScoreMeta || null,
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
        optionBreakdown: d.optionBreakdown, evErrorReasons: d.evErrorReasons,
        icmMultiplier: d.icmMultiplier != null ? d.icmMultiplier : null,
        icmPressure: d.icmPressure != null ? d.icmPressure : null,
        bubbleFactor: d.bubbleFactor != null ? d.bubbleFactor : null,
        icmNote: d.icmNote || null,
        icmLite: !!d.icmLite,
        icmChangedEv: !!d.icmChangedEv,
        chipEvLoss: d.chipEvLoss != null ? d.chipEvLoss : null,
        formatHub: d.formatHub || null,
        mttPhase: d.mttPhase || null,
        phaseNote: d.phaseNote || null
      }))
    };
  }

  function scenarioLabel(hand) {
    const s = hand.scenario;
    if (s.type === 'RFI') return `RFI ${s.heroPos}`;
    if (s.type === 'vsRFI') return s.key.replace(/_/g, ' ');
    if (s.type === 'face3bet') {
      const p = s.key.split('_');
      return p[0] + ' vs 3bet ' + p[2];
    }
    if (s.type === 'squeeze') return `${s.heroPos} squeeze vs ${s.openerPos}`;
    if (s.type === 'isoLimp') return `${s.heroPos} iso vs ${s.limperPos}`;
    if (s.type === 'bbVsSbLimp') return 'BB vs SB limp';
    if (s.type === 'sbLimp') return 'SB limp';
    if (s.type === 'cold4bet') return (s.heroPos || 'CO') + ' cold 4bet';
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
    return visibleSessionList(filterDeletedSessions(getSessionIndex()));
  }

  function getSession(id) {
    if (sessionMemoryCache[id]) return sessionMemoryCache[id];
    const stub = getSessionIndex().find(function (x) { return x.id === id; }) || null;
    return stub;
  }

  async function getSessionAsync(id) {
    if (!id) return null;
    const cached = sessionMemoryCache[id];
    if (cached && (!cached.sharded || (cached.hands && cached.hands.length))) return cached;
    const CS = global.PTCloudSessions;
    if (CS && CS.isReady()) {
      const res = await CS.fetchSession(id);
      if (res.ok && res.session) {
        const full = await assembleShardedSession(res.session);
        sessionMemoryCache[id] = full;
        return full;
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

  function sessionHandKey(hand) {
    if (global.Importer && global.Importer.handDedupeKey) return global.Importer.handDedupeKey(hand);
    if (!hand) return '';
    return String(hand.platform || '') + '|' + String(hand.id != null ? hand.id : '');
  }

  /**
   * IMP-30: si reimportas el mismo archivo (o solapa manos), fusiona y deduplica
   * por platform+hand.id conservando el id de sesión previo.
   */
  async function mergeTournamentSummaryIfDuplicate(session) {
    if (!session || session.source !== 'tournamentSummary') return session;
    const tid = session.tournamentId
      || (session.stats && session.stats.tournamentId)
      || (session.tournament && session.tournament.id);
    if (!tid) return session;
    const list = getSessionIndex();
    for (let i = 0; i < list.length; i++) {
      const stub = list[i];
      if (!stub || stub.id === session.id) continue;
      const existing = await getSessionAsync(stub.id);
      if (!existing) continue;
      const exTid = existing.tournamentId
        || (existing.stats && existing.stats.tournamentId)
        || (existing.tournament && existing.tournament.id);
      if (String(exTid) === String(tid)) {
        session.id = existing.id;
        return session;
      }
    }
    return session;
  }

  async function mergeSessionIfDuplicate(session) {
    if (session && session.source === 'tournamentSummary') {
      return mergeTournamentSummaryIfDuplicate(session);
    }
    if (!session || !session.hands || !session.hands.length || !session.fileName) return session;
    const list = getSessionIndex();
    const candidates = list.filter(function (s) {
      return s && s.id !== session.id
        && s.fileName === session.fileName
        && (!session.hero || !s.hero || s.hero === session.hero);
    });
    if (!candidates.length) return session;
    const nNew = (session.hands && session.hands.length) || 0;
    if (nNew > HANDS_PER_SHARD) {
      session.id = candidates[0].id;
      session.createdAt = candidates[0].createdAt || session.createdAt;
      return session;
    }
    const existing = await getSessionAsync(candidates[0].id);
    if (!existing || !existing.hands || !existing.hands.length) return session;

    const byKey = {};
    let anon = 0;
    function put(h, preferNew) {
      var k = sessionHandKey(h);
      if (!k || k === '|') k = '_anon_' + (anon++);
      if (!byKey[k] || preferNew) byKey[k] = h;
    }
    existing.hands.forEach(function (h) { put(h, false); });
    var replaced = 0;
    var added = 0;
    session.hands.forEach(function (h) {
      var k = sessionHandKey(h);
      if (k && k !== '|' && byKey[k]) replaced++;
      else added++;
      put(h, true);
    });

    const mergedHands = Object.keys(byKey).map(function (k) { return byKey[k]; });
    session.id = existing.id;
    session.createdAt = existing.createdAt || session.createdAt;
    session.hands = mergedHands;
    session.nParsed = Math.max(session.nParsed || 0, existing.nParsed || 0, mergedHands.length);
    session.nTotal = Math.max(session.nTotal || 0, existing.nTotal || 0, mergedHands.length);
    session.mergedHands = true;
    session.mergeMeta = { replaced: replaced, added: added, previousHands: existing.hands.length };
    if (global.Importer && global.Importer.computeStats) {
      session.stats = global.Importer.computeStats(mergedHands);
    }
    if (global.PTHHUtils && global.PTHHUtils.buildSessionContext) {
      session.context = global.PTHHUtils.buildSessionContext(
        mergedHands,
        session.nDiscardedByReason || existing.nDiscardedByReason || null
      );
    }
    if (session.rawText == null && existing.rawText) session.rawText = existing.rawText;
    return session;
  }

  function yieldToUi() {
    return new Promise(function (resolve) { setTimeout(resolve, 0); });
  }

  async function mapWithConcurrency(items, limit, fn) {
    let idx = 0;
    let failed = null;
    async function worker() {
      while (idx < items.length && !failed) {
        const i = idx++;
        const err = await fn(items[i], i);
        if (err) failed = err;
      }
    }
    const n = Math.min(Math.max(1, limit || 3), items.length || 1);
    const workers = [];
    for (let w = 0; w < n; w++) workers.push(worker());
    await Promise.all(workers);
    return failed;
  }

  async function saveShardedSession(session, onProgress) {
    const built = buildHandShards(session, HANDS_PER_SHARD);
    const parent = parentForStorage(session, built.ids);
    const totalSteps = 1 + built.payloads.length;
    let completed = 0;
    function tick() {
      completed++;
      if (onProgress) onProgress(completed, totalSteps, 'save');
    }
    if (onProgress) onProgress(0, totalSteps, 'save');
    const CS = global.PTCloudSessions;
    if (CS && CS.isReady()) {
      const upParent = await CS.uploadSession(parent);
      if (!upParent.ok) {
        return {
          ok: false,
          error: upParent.error === 'cloud_not_ready'
            ? 'Inicia sesión para guardar sesiones en la nube.'
            : (upParent.error || 'No se pudo guardar en la nube.')
        };
      }
      tick();
      const fail = await mapWithConcurrency(built.payloads, 3, async function (payload) {
        const up = await CS.uploadSession(payload);
        if (!up.ok) return up;
        tick();
        await yieldToUi();
        return null;
      });
      if (fail) {
        return {
          ok: false,
          error: 'No se pudieron guardar todas las manos (' + completed + '/' + totalSteps
            + '). ' + (fail.error || 'Inténtalo de nuevo.')
        };
      }
      sessionMemoryCache[session.id] = session;
      const list = visibleSessionList(getSessionIndex().filter(function (s) { return s.id !== session.id; }));
      const summary = CS.sessionSummary(parent);
      summary.nTotal = session.hands.length;
      list.unshift(summary);
      writeSessionIndex(list);
      try { localStorage.removeItem(scopedKey('sessions')); } catch (e) { /* ignore */ }
      try { localStorage.removeItem(sessionTxtKey(session.id)); } catch (e) { /* ignore */ }
      recordSessionStats(session);
      return { ok: true, session: session, cloudOnly: true };
    }
    const localParent = saveSessionLocal(parent);
    if (!localParent.ok) return localParent;
    if (onProgress) onProgress(totalSteps, totalSteps, 'save');
    sessionMemoryCache[session.id] = session;
    recordSessionStats(session);
    return { ok: true, session: session, cloudOnly: false };
  }

  async function saveSession(session, onProgress) {
    migrateLegacySessionsList();
    session = await mergeSessionIfDuplicate(session);
    const nHands = (session.hands && session.hands.length) || 0;
    if (nHands > HANDS_PER_SHARD) {
      return saveShardedSession(session, onProgress);
    }
    if (onProgress) onProgress(0, 1, 'save');
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
      sessionMemoryCache[session.id] = session;
      const list = visibleSessionList(getSessionIndex().filter(function (s) { return s.id !== session.id; }));
      list.unshift(upload.summary);
      writeSessionIndex(list);
      try { localStorage.removeItem(scopedKey('sessions')); } catch (e) { /* ignore */ }
      try { localStorage.removeItem(sessionTxtKey(session.id)); } catch (e) { /* ignore */ }
      recordSessionStats(session);
      if (onProgress) onProgress(1, 1, 'save');
      return { ok: true, session: session, cloudOnly: true };
    }
    const local = saveSessionLocal(session);
    if (local.ok) recordSessionStats(local.session);
    if (onProgress) onProgress(1, 1, 'save');
    return local;
  }

  async function removeSession(id) {
    const stub = getSessionIndex().find(function (x) { return x && x.id === id; }) || sessionMemoryCache[id];
    const extra = (stub && stub.shardIds) || [];
    delete sessionMemoryCache[id];
    extra.forEach(function (sid) { delete sessionMemoryCache[sid]; });
    markSessionDeleted(id);
    extra.forEach(markSessionDeleted);
    const CS = global.PTCloudSessions;
    if (CS && CS.isReady()) {
      const res = await CS.deleteSession(id);
      if (!res.ok) console.warn('[Store] removeSession cloud', res.error);
      if (CS.deleteSessionsByIds && extra.length) {
        const del = await CS.deleteSessionsByIds(extra);
        if (del && !del.ok) console.warn('[Store] removeSession shards', del.error);
      } else {
        for (let i = 0; i < extra.length; i++) {
          await CS.deleteSession(extra[i]);
        }
      }
    }
    writeSessionIndex(visibleSessionList(getSessionIndex().filter(function (s) {
      return s && s.id !== id && extra.indexOf(s.id) < 0 && !isHiddenSessionStub(s);
    })));
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
    writeSessionIndex(visibleSessionList(filterDeletedSessions(res.sessions || [])));
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

  function getOnboardingForCloud() {
    if (global.PTOnboarding && typeof global.PTOnboarding.getCloudState === 'function') {
      return global.PTOnboarding.getCloudState();
    }
    return null;
  }

  function mergeOnboardingStates(localOb, cloudOb) {
    if (global.PTOnboarding && typeof global.PTOnboarding.mergeStates === 'function') {
      return global.PTOnboarding.mergeStates(localOb, cloudOb);
    }
    const local = localOb || {};
    const cloud = cloudOb || {};
    const done = Object.assign({}, cloud.done || {}, local.done || {});
    Object.keys(done).forEach(function (k) {
      if ((local.done && local.done[k]) || (cloud.done && cloud.done[k])) done[k] = true;
      else delete done[k];
    });
    return {
      dismissed: !!(local.dismissed || cloud.dismissed),
      done: done,
      updatedAt: Math.max(Number(local.updatedAt) || 0, Number(cloud.updatedAt) || 0)
    };
  }

  function applyOnboardingFromCloud(remote) {
    if (global.PTOnboarding && typeof global.PTOnboarding.mergeFromCloud === 'function') {
      global.PTOnboarding.mergeFromCloud(remote || null);
    }
  }

  function getCloudSnapshot() {
    const snap = {
      stats: getStats(),
      history: getHistory(),
      errors: getErrors(),
      clearedAt: getClearedAt()
    };
    const onboarding = getOnboardingForCloud();
    if (onboarding) snap.onboarding = onboarding;
    return snap;
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
      } else if (key === 'onboarding') {
        out.onboarding = mergeOnboardingStates(local.onboarding, cloud.onboarding);
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
    applyOnboardingFromCloud(cloudSnapshot.onboarding);
    return { history: history.length, errors: errors.length, sessions: getSessions().length, stats: stats };
  }

  function replaceFromCloud(snapshot) {
    if (!snapshot) return;
    const cloudCa = snapshot.clearedAt || {};
    const localCa = getClearedAt();
    writeClearedAt(mergeClearedAtMeta(localCa, cloudCa));
    if (snapshot.stats) {
      const localSchool = (getStats() && getStats().school) || null;
      const bak = readSchoolBackupRaw();
      let stats = JSON.parse(JSON.stringify(snapshot.stats));
      const keep = mergeSchoolProgress(localSchool, bak);
      if (keep) {
        stats.school = mergeSchoolProgress(keep, stats.school) || keep;
      }
      writeStats(stats);
      try {
        if (stats.school) {
          const payload = JSON.stringify({
            xp: Number(stats.school.xp) || 0,
            lessons: stats.school.lessons || {},
            updatedAt: Date.now(),
            version: Number(stats.school.version) || 2
          });
          localStorage.setItem('pt_school_backup_v1' + (userId ? '_' + userId : ''), payload);
          localStorage.setItem('pt_school_backup_v1', payload);
        }
      } catch (eBak) { /* ignore */ }
    }
    if (snapshot.history) {
      write(scopedKey('history'), filterByClearedAt(snapshot.history, effectiveCloudClear('history', cloudCa)));
    }
    if (snapshot.errors) {
      write(scopedKey('errors'), filterByClearedAt(snapshot.errors, effectiveCloudClear('errors', cloudCa)));
    }
    applyOnboardingFromCloud(snapshot.onboarding);
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

  // ---------- MANOS DE ANÁLISIS (menú "Análisis de manos") ----------
  const ANALYSIS_KEY = 'analysis_hands';

  function getAnalysisHands() {
    const list = read(scopedKey(ANALYSIS_KEY), []);
    return Array.isArray(list) ? list : [];
  }

  function getAnalysisHand(id) {
    return getAnalysisHands().find(function (h) { return h.id === id; }) || null;
  }

  function saveAnalysisHand(hand) {
    if (!hand || !hand.id) return { ok: false, error: 'invalid_hand' };
    const list = getAnalysisHands();
    if (list.some(function (h) { return h.id === hand.id; })) {
      return updateAnalysisHand(hand);
    }
    list.unshift(hand);
    if (!write(scopedKey(ANALYSIS_KEY), list)) {
      return { ok: false, error: 'storage_full' };
    }
    return { ok: true, hand: hand, count: list.length };
  }

  function updateAnalysisHand(hand) {
    if (!hand || !hand.id) return { ok: false, error: 'invalid_hand' };
    const list = getAnalysisHands();
    const idx = list.findIndex(function (h) { return h.id === hand.id; });
    if (idx < 0) return { ok: false, error: 'hand_not_found' };
    list[idx] = hand;
    if (!write(scopedKey(ANALYSIS_KEY), list)) {
      return { ok: false, error: 'storage_full' };
    }
    return { ok: true, hand: hand, count: list.length };
  }

  function removeAnalysisHand(id) {
    const list = getAnalysisHands().filter(function (h) { return h.id !== id; });
    write(scopedKey(ANALYSIS_KEY), list);
    return { ok: true, count: list.length };
  }

  /** target: { kind: 'history'|'session'|'sessionHand'|'stats'|'learn'|'analysis', handId?, sessionId?, lessonId? } */
  function getCoachThread(target) {
    if (!target || !target.kind) return [];
    if (target.kind === 'stats') {
      return read(scopedKey('stats_coach'), []);
    }
    if (target.kind === 'learn') {
      const lessonId = target.lessonId ? String(target.lessonId) : 'default';
      const map = readLearnCoachMap();
      if (map[lessonId] && Array.isArray(map[lessonId])) return map[lessonId].slice();
      /* legacy: hilo global único (pre 2.5.12); no se reutiliza entre lecciones */
      if (lessonId === 'default') {
        const legacy = read(scopedKey('learn_coach'), []);
        return Array.isArray(legacy) ? legacy.slice() : [];
      }
      return [];
    }
    if (target.kind === 'analysis' && target.handId) {
      const rec = getAnalysisHand(target.handId);
      return rec && rec.coachThread ? rec.coachThread.slice() : [];
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

    if (target.kind === 'learn') {
      const lessonId = target.lessonId ? String(target.lessonId) : 'default';
      const map = readLearnCoachMap();
      let thread = Array.isArray(map[lessonId]) ? map[lessonId].slice() : [];
      if (!thread.length && lessonId === 'default') {
        const legacy = read(scopedKey('learn_coach'), []);
        if (Array.isArray(legacy) && legacy.length) thread = legacy.slice();
      }
      thread.unshift(e);
      thread = trimCoachThread(thread);
      map[lessonId] = thread;
      if (!writeLearnCoachMap(map)) {
        return Promise.resolve({ ok: false, error: 'storage_full' });
      }
      return Promise.resolve({ ok: true, entry: e, thread: thread.slice() });
    }

    if (target.kind === 'analysis' && target.handId) {
      const rec = getAnalysisHand(target.handId);
      if (!rec) return Promise.resolve({ ok: false, error: 'hand_not_found' });
      if (!rec.coachThread) rec.coachThread = [];
      rec.coachThread.unshift(e);
      rec.coachThread = trimCoachThread(rec.coachThread);
      const res = updateAnalysisHand(rec);
      if (!res.ok) return Promise.resolve({ ok: false, error: res.error || 'storage_full' });
      return Promise.resolve({ ok: true, entry: e, thread: rec.coachThread.slice() });
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

  function getFavoriteSpots() {
    return read(scopedKey('rangeFavorites'), []);
  }

  function normalizeFavoriteStreet(spot) {
    if (!spot) return 'preflop';
    if (spot.street === 'flop' || spot.street === 'turn' || spot.street === 'river' || spot.street === 'preflop') {
      return spot.street;
    }
    if (spot.spot === 'postflop') return 'flop';
    return 'preflop';
  }

  function favoriteSpotKey(spot) {
    if (!spot) return '';
    const street = normalizeFavoriteStreet(spot);
    const parts = [
      street,
      spot.gameType || 'cash6',
      spot.stackDepth || 'standard',
      spot.spot || '',
      spot.heroPos || '',
      spot.villainPos || '',
      spot.callerPos || '',
      spot.openSize || 2.5
    ];
    if (street !== 'preflop') {
      parts.push(spot.boardText || '');
      parts.push(spot.potBB != null ? String(spot.potBB) : '');
      parts.push(spot.toCallBB != null ? String(spot.toCallBB) : '');
    }
    return parts.join('|');
  }

  function isFavoriteSpot(spot) {
    const key = favoriteSpotKey(spot);
    return getFavoriteSpots().some(function (f) { return favoriteSpotKey(f) === key; });
  }

  function serializeFavoriteSpot(spot) {
    const street = normalizeFavoriteStreet(spot);
    const entry = {
      street: street,
      gameType: spot.gameType || 'cash6',
      stackDepth: spot.stackDepth || 'standard',
      spot: spot.spot || (street === 'preflop' ? 'RFI' : 'postflop'),
      heroPos: spot.heroPos || '',
      villainPos: spot.villainPos || '',
      callerPos: spot.callerPos || '',
      openSize: Number(spot.openSize) === 3 ? 3 : 2.5,
      label: spot.label || '',
      savedAt: new Date().toISOString()
    };
    if (street !== 'preflop') {
      entry.boardText = spot.boardText || '';
      entry.potBB = spot.potBB != null ? Number(spot.potBB) : 6;
      entry.toCallBB = spot.toCallBB != null ? Number(spot.toCallBB) : 0;
    }
    return entry;
  }

  function toggleFavoriteSpot(spot) {
    if (!spot || !(spot.spot || spot.street)) return { ok: false, favorites: getFavoriteSpots() };
    const key = favoriteSpotKey(spot);
    let list = getFavoriteSpots().slice();
    const idx = list.findIndex(function (f) { return favoriteSpotKey(f) === key; });
    if (idx >= 0) list.splice(idx, 1);
    else {
      list.unshift(serializeFavoriteSpot(spot));
      if (list.length > 20) list = list.slice(0, 20);
    }
    write(scopedKey('rangeFavorites'), list);
    return { ok: true, favorites: list, favorited: idx < 0 };
  }

  function removeFavoriteSpot(spotOrKey) {
    let list = getFavoriteSpots().slice();
    const key = typeof spotOrKey === 'string' ? spotOrKey : favoriteSpotKey(spotOrKey);
    if (!key) return { ok: false, favorites: list };
    const next = list.filter(function (f) { return favoriteSpotKey(f) !== key; });
    if (next.length === list.length) return { ok: false, favorites: list };
    write(scopedKey('rangeFavorites'), next);
    return { ok: true, favorites: next };
  }

  function getFavoriteSpotsForStreet(street) {
    const st = street || 'preflop';
    return getFavoriteSpots().filter(function (f) {
      return normalizeFavoriteStreet(f) === st;
    });
  }

  const MAX_PLAY_PRESETS = 12;

  function getPlayPresets() {
    const list = read(scopedKey('playPresets'), []);
    return Array.isArray(list) ? list : [];
  }

  function serializePlayPreset(name, config, existingId) {
    const label = String(name || '').trim().slice(0, 40);
    const cfg = config && typeof config === 'object' ? Object.assign({}, config) : {};
    delete cfg.schoolMode;
    delete cfg.school;
    return {
      id: existingId || ('u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)),
      name: label,
      config: cfg,
      savedAt: new Date().toISOString()
    };
  }

  /** Guarda o actualiza un preset de Entrenador (mismo nombre → overwrite). */
  function savePlayPreset(name, config) {
    const label = String(name || '').trim().slice(0, 40);
    if (!label) return { ok: false, reason: 'empty_name', presets: getPlayPresets() };
    if (!config || typeof config !== 'object') {
      return { ok: false, reason: 'invalid_config', presets: getPlayPresets() };
    }
    let list = getPlayPresets().slice();
    const lower = label.toLowerCase();
    const idx = list.findIndex(function (p) {
      return p && String(p.name || '').toLowerCase() === lower;
    });
    const entry = serializePlayPreset(label, config, idx >= 0 ? list[idx].id : null);
    if (idx >= 0) list[idx] = entry;
    else list.unshift(entry);
    if (list.length > MAX_PLAY_PRESETS) list = list.slice(0, MAX_PLAY_PRESETS);
    write(scopedKey('playPresets'), list);
    return { ok: true, preset: entry, presets: list };
  }

  function removePlayPreset(id) {
    const pid = String(id || '');
    if (!pid) return { ok: false, presets: getPlayPresets() };
    const list = getPlayPresets();
    const next = list.filter(function (p) { return p && p.id !== pid; });
    if (next.length === list.length) return { ok: false, presets: list };
    write(scopedKey('playPresets'), next);
    return { ok: true, presets: next };
  }

  function getPlayPreset(id) {
    const pid = String(id || '');
    if (!pid) return null;
    return getPlayPresets().find(function (p) { return p && p.id === pid; }) || null;
  }

  global.Store = {
    setUserId, getUserId,
    getHistory, getErrors, getStats, saveHand, persistStats: writeStats,
    clearHistory, clearStats, clearAll, clearErrors, removeError, exportData,     exportFullUserData,
    migrateLocalUserKeys,
    purgeLocalUserData, scenarioLabel,
    getSessions, getSession, getSessionAsync, saveSession, removeSession, deleteSessionTxt,
    refreshSessionsIndexFromCloud, uploadLegacyLocalSessionsToCloud, migrateLegacyPayloadSessions,
    getCloudSnapshot, replaceFromCloud, mergeFromCloud, mergeDirtyKeysIntoCloud,
    getClearedAt, detectResetConflicts, applyRemoteClears, rejectRemoteClears, clearRejectRemote,
    getCoachThread, appendCoachEntry,
    getFeatureUsage, trackFeatureUsage,
    getAnalysisHands, getAnalysisHand, saveAnalysisHand, updateAnalysisHand, removeAnalysisHand,
    getFavoriteSpots, getFavoriteSpotsForStreet, isFavoriteSpot, toggleFavoriteSpot,
    removeFavoriteSpot, favoriteSpotKey, normalizeFavoriteStreet,
    getPlayPresets, getPlayPreset, savePlayPreset, removePlayPreset
  };
})(window);
