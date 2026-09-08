/*
 * tournament/store.js — Histórico + torneo en curso (local + sync Store/PTCloud).
 */
(function (global) {
  'use strict';

  var BASE_KEY = 'pt_tournaments_v1';
  var ACTIVE_KEY = 'pt_tournament_active_v1';
  var MAX = 100;
  /** Histórico completo en memoria (desde nube); localStorage solo guarda LOCAL_KEEP. */
  var LOCAL_KEEP = 15;
  var historyMemoryCache = null;
  var historyMemoryKey = null;

  function invalidateHistoryMemory() {
    historyMemoryCache = null;
    historyMemoryKey = null;
  }

  function currentHistoryKey() {
    return storageKey();
  }

  function userSuffix() {
    var uid = null;
    try {
      if (global.Store && typeof global.Store.getUserId === 'function') {
        uid = global.Store.getUserId();
      }
    } catch (e) { /* ignore */ }
    return uid ? ('_' + uid) : '';
  }

  /** '' en PokerForge; '_mttlab' en comunidades gated — histórico independiente. */
  function communitySuffix() {
    try {
      if (global.Store && typeof global.Store.communityDataSuffix === 'function') {
        return global.Store.communityDataSuffix() || '';
      }
      if (global.PTTournamentWallet && typeof global.PTTournamentWallet.communitySuffix === 'function') {
        return global.PTTournamentWallet.communitySuffix() || '';
      }
    } catch (e) { /* ignore */ }
    return '';
  }

  function communityId() {
    try {
      if (global.PTCommunity && typeof global.PTCommunity.id === 'function') {
        return String(global.PTCommunity.id() || 'pokerforge');
      }
    } catch (e) { /* ignore */ }
    var s = communitySuffix();
    return s ? String(s).replace(/^_/, '') : 'pokerforge';
  }

  function belongsToActiveCommunity(entry) {
    if (!entry) return false;
    var cid = communityId();
    if (!entry.communityId) return true; /* legacy en clave namespaced = esta comunidad */
    return String(entry.communityId) === String(cid);
  }

  function storageKey() {
    return BASE_KEY + communitySuffix() + userSuffix();
  }

  function activeStorageKey() {
    return ACTIVE_KEY + communitySuffix() + userSuffix();
  }

  function readList() {
    try {
      if (typeof localStorage === 'undefined') return [];
      var raw = localStorage.getItem(storageKey());
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeList(list, opts) {
    opts = opts || {};
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(storageKey(), JSON.stringify(list || []));
      if (!opts.silent) markCloudDirty('history');
      return true;
    } catch (e) {
      return false;
    }
  }

  function markCloudDirty(which) {
    try {
      var s = communitySuffix();
      var keys;
      if (which === 'active') keys = ['tournamentActive' + s];
      else if (which === 'history') keys = ['tournamentHistory' + s];
      else if (which === 'wallet') keys = ['tournamentWallet' + s];
      else {
        /* Compat: dirty genérico solo history+active (no wallet). */
        keys = ['tournamentActive' + s, 'tournamentHistory' + s];
      }
      if (global.PTCloud && typeof global.PTCloud.markLocalDirty === 'function') {
        global.PTCloud.markLocalDirty(keys);
      }
      if (global.PTCloud && typeof global.PTCloud.schedulePush === 'function') {
        global.PTCloud.schedulePush(keys);
      }
    } catch (e) { /* ignore */ }
  }

  function sortHistory(arr) {
    return (arr || []).slice().sort(function (a, b) {
      return (Date.parse(b.finishedAt || 0) || 0) - (Date.parse(a.finishedAt || 0) || 0);
    });
  }

  function setHistoryMemory(list) {
    historyMemoryKey = currentHistoryKey();
    historyMemoryCache = sortHistory(list).slice(0, MAX);
    return historyMemoryCache;
  }

  function getHistoryMemory() {
    if (historyMemoryCache && historyMemoryKey === currentHistoryKey()) {
      return historyMemoryCache.slice();
    }
    historyMemoryKey = currentHistoryKey();
    historyMemoryCache = sortHistory(readList()).slice(0, MAX);
    return historyMemoryCache.slice();
  }

  /**
   * Escribe solo los N más recientes en localStorage (silent por defecto
   * para no pushear un subset que pise la nube).
   */
  function trimLocalHistory(keep) {
    keep = keep == null ? LOCAL_KEEP : keep;
    if (!historyMemoryCache) setHistoryMemory(readList());
    var full = historyMemoryCache || [];
    var local = readList();
    if (local.length <= keep && full.length <= keep) return false;
    var next = full.slice(0, keep);
    return writeList(next, { silent: true });
  }

  function slimActiveAggressive(opts) {
    opts = opts || {};
    var st = loadActive();
    if (!st) return false;
    var aggressive = !!opts.aggressive;
    var handsKeep = aggressive ? 10 : 15;
    var logKeep = aggressive ? 15 : 20;
    var snap = slimForPersist(st);
    if (snap.sessionHands) snap.sessionHands = snap.sessionHands.slice(-handsKeep);
    if (snap.handLog) {
      snap.handLog = snap.handLog.slice(-logKeep).map(function (h) {
        return {
          handIndex: h.handIndex,
          bb: h.bb,
          pot: h.pot,
          showdown: h.showdown,
          result: h.result ? { heroNet: h.result.heroNet } : null,
          seats: (h.seats || []).filter(function (s) { return s.isHero; })
            .map(function (s) { return { isHero: true, pos: s.pos }; })
        };
      });
    }
    try {
      writeActiveRaw(snap);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Asegura push del histórico completo a la nube y luego recorta local.
   */
  async function ensureHistoryOffloaded(opts) {
    opts = opts || {};
    var keep = opts.keep != null ? opts.keep : (opts.aggressive ? 5 : LOCAL_KEEP);
    var full = getHistoryMemory();
    if (!full.length) full = readList();
    setHistoryMemory(full);
    var cloudReady = global.PTCloud && global.PTCloud.isReady && global.PTCloud.isReady();
    if (cloudReady && full.length) {
      try {
        markCloudDirty('history');
        if (typeof global.PTCloud.flushPush === 'function') {
          await global.PTCloud.flushPush();
        }
      } catch (e) { /* ignore */ }
    }
    var trimmed = trimLocalHistory(keep);
    if (opts.aggressive) slimActiveAggressive({ aggressive: true });
    return { ok: true, trimmed: trimmed, keep: keep, total: full.length };
  }

  function list() {
    return getHistoryMemory().filter(belongsToActiveCommunity);
  }

  function get(id) {
    var sid = String(id || '');
    if (!sid) return null;
    var mem = list();
    var hit = mem.find(function (x) { return x && x.id === sid; });
    if (hit) return hit;
    return readList().filter(belongsToActiveCommunity).find(function (x) { return x && x.id === sid; }) || null;
  }

  function normalizeSummary(summary) {
    summary = summary || {};
    return {
      id: String(summary.id || ''),
      name: String(summary.name || 'Torneo').slice(0, 80),
      kind: summary.kind === 'sng' ? 'sng' : 'mtt',
      entries: Number(summary.entries) || 0,
      place: summary.place != null ? Number(summary.place) : null,
      prizeEur: Number(summary.prizeEur) || 0,
      buyInEur: Number(summary.buyInEur) || 0,
      profit: Number(summary.profit) || 0,
      roi: Number(summary.roi) || 0,
      roleAccuracy: Number(summary.roleAccuracy) || 0,
      finishedAt: summary.finishedAt || new Date().toISOString(),
      presetId: summary.presetId || null,
      sessionId: summary.sessionId || null,
      communityId: summary.communityId || communityId()
    };
  }

  function save(summary) {
    var entry = normalizeSummary(summary);
    if (!entry.id) return { ok: false, reason: 'missing_id' };
    var arr = getHistoryMemory().filter(function (x) { return x && x.id !== entry.id; });
    arr.unshift(entry);
    if (arr.length > MAX) arr = arr.slice(0, MAX);
    setHistoryMemory(arr);
    var localOk = writeList(arr.slice(0, LOCAL_KEEP));
    if (!localOk) {
      /* Reintento: slim + trim agresivo. */
      try {
        if (global.Store && global.Store.freeStorageSpace) {
          global.Store.freeStorageSpace({ aggressive: true });
        }
      } catch (eFree) { /* ignore */ }
      trimLocalHistory(5);
      localOk = writeList(arr.slice(0, 5));
      if (!localOk) return { ok: false, reason: 'storage_full', entry: entry, list: arr };
    }
    return { ok: true, entry: entry, list: arr };
  }

  function remove(id) {
    var sid = String(id || '');
    var arr = getHistoryMemory();
    var next = arr.filter(function (x) { return x && x.id !== sid; });
    if (next.length === arr.length) return { ok: false, list: arr };
    setHistoryMemory(next);
    writeList(next.slice(0, LOCAL_KEEP));
    return { ok: true, list: next };
  }

  function clear() {
    setHistoryMemory([]);
    writeList([]);
    return { ok: true, list: [] };
  }

  function slimForPersist(state) {
    var snap = JSON.parse(JSON.stringify(state));
    /* Fotogramas y análisis pesados no son necesarios para reanudar. */
    if (snap._liveHand) {
      delete snap._liveHand._frames;
      if (snap._liveHand._animQueue) delete snap._liveHand._animQueue;
    }
    if (Array.isArray(snap.sessionHands) && snap.sessionHands.length > 40) {
      snap.sessionHands = snap.sessionHands.slice(-40);
    }
    if (Array.isArray(snap.handLog) && snap.handLog.length > 60) {
      snap.handLog = snap.handLog.slice(-60);
    }
    /* Recorta payloads de análisis en sessionHands para no saturar quota. */
    (snap.sessionHands || []).forEach(function (h) {
      if (!h || typeof h !== 'object') return;
      if (h.analysis) {
        h.analysis = {
          handScore: h.analysis.handScore,
          heroNetBB: h.analysis.heroNetBB,
          heroCode: h.analysis.heroCode,
          heroPos: h.analysis.heroPos
        };
      }
      if (h.streets && h.streets.length > 8) h.streets = h.streets.slice(0, 8);
    });
    return snap;
  }

  function writeActiveRaw(snap) {
    localStorage.setItem(activeStorageKey(), JSON.stringify(snap));
  }

  /** Snapshot del torneo en curso (para continuar más tarde). */
  function saveActive(state, opts) {
    opts = opts || {};
    if (!state || state.status === 'finished') {
      clearActive(opts);
      return { ok: false, reason: 'not_active' };
    }
    if (typeof localStorage === 'undefined') return { ok: false };
    try {
      var snap = opts.fromCloud ? JSON.parse(JSON.stringify(state)) : slimForPersist(state);
      /* Siempre refrescar _savedAt en guardados locales; en fromCloud conservar el remoto. */
      if (!opts.fromCloud || !snap._savedAt) snap._savedAt = new Date().toISOString();
      if (snap._progressRev == null) snap._progressRev = Number(state._progressRev) || 0;
      try {
        writeActiveRaw(snap);
      } catch (quotaErr) {
        /* Reintento agresivo si localStorage está lleno. */
        if (snap.sessionHands) snap.sessionHands = snap.sessionHands.slice(-15);
        if (snap.handLog) {
          snap.handLog = snap.handLog.slice(-20).map(function (h) {
            return {
              handIndex: h.handIndex,
              bb: h.bb,
              pot: h.pot,
              showdown: h.showdown,
              result: h.result ? { heroNet: h.result.heroNet, deltas: h.result.deltas, winners: h.result.winners } : null,
              seats: (h.seats || []).filter(function (s) { return s.isHero; })
                .map(function (s) { return { isHero: true, pos: s.pos }; })
            };
          });
        }
        if (snap._liveHand) {
          snap._liveHand = {
            stage: snap._liveHand.stage,
            street: snap._liveHand.street,
            pot: snap._liveHand.pot,
            bb: snap._liveHand.bb,
            sb: snap._liveHand.sb,
            ante: snap._liveHand.ante,
            board: snap._liveHand.board,
            seats: snap._liveHand.seats,
            toActId: snap._liveHand.toActId,
            heroId: snap._liveHand.heroId,
            awaitingHero: snap._liveHand.awaitingHero,
            result: snap._liveHand.result,
            decisions: snap._liveHand.decisions,
            log: snap._liveHand.log
          };
        }
        writeActiveRaw(snap);
      }
      if (!opts.silent) markCloudDirty('active');
      return { ok: true, savedAt: snap._savedAt, handIndex: snap.handIndex, progressRev: snap._progressRev };
    } catch (e) {
      try { console.warn('[Tournaments] saveActive failed', e); } catch (e2) { /* */ }
      return { ok: false, reason: 'serialize' };
    }
  }

  function loadActive() {
    try {
      if (typeof localStorage === 'undefined') return null;
      var raw = localStorage.getItem(activeStorageKey());
      if (!raw) return null;
      var st = JSON.parse(raw);
      if (!st || !st.id || st.status === 'finished') return null;
      return st;
    } catch (e) {
      return null;
    }
  }

  function clearActive(opts) {
    opts = opts || {};
    try {
      if (typeof localStorage === 'undefined') return { ok: false };
      localStorage.removeItem(activeStorageKey());
      if (!opts.silent) markCloudDirty('active');
      return { ok: true };
    } catch (e) {
      return { ok: false };
    }
  }

  /** Sustituye histórico desde nube (login replace) sin marcar dirty de push. */
  function replaceAll(list) {
    var cid = communityId();
    var arr = sortHistory((Array.isArray(list) ? list : []).filter(function (x) {
      return x && (!x.communityId || String(x.communityId) === String(cid));
    }).map(function (x) {
      return normalizeSummary(x);
    })).slice(0, MAX);
    setHistoryMemory(arr);
    writeList(arr.slice(0, LOCAL_KEEP), { silent: true });
    return { ok: true, list: arr };
  }

  /** Fusiona entradas remotas por id (finishedAt más reciente gana). */
  function mergeFromCloud(remoteList) {
    if (!Array.isArray(remoteList) || !remoteList.length) return list();
    var cid = communityId();
    var map = Object.create(null);
    function add(item) {
      if (!item || !item.id) return;
      if (item.communityId && String(item.communityId) !== String(cid)) return;
      var norm = normalizeSummary(item);
      var prev = map[norm.id];
      if (!prev) { map[norm.id] = norm; return; }
      var ta = Date.parse(norm.finishedAt || 0) || 0;
      var tb = Date.parse(prev.finishedAt || 0) || 0;
      if (ta >= tb) map[norm.id] = norm;
    }
    getHistoryMemory().forEach(add);
    remoteList.forEach(add);
    var next = Object.keys(map).map(function (k) { return map[k]; });
    next = sortHistory(next).slice(0, MAX);
    setHistoryMemory(next);
    writeList(next.slice(0, LOCAL_KEEP), { silent: true });
    return next;
  }

  function hasActive() {
    return !!loadActive();
  }

  /** True si `a` debe ganar a `b` al fusionar cloud (más avance o más reciente). */
  function isPreferableActive(a, b) {
    if (a && !b) return true;
    if (!a) return false;
    if (!b) return true;
    var aHand = Number(a.handIndex) || 0;
    var bHand = Number(b.handIndex) || 0;
    if (aHand !== bHand) return aHand > bHand;
    var aRev = Number(a._progressRev) || 0;
    var bRev = Number(b._progressRev) || 0;
    if (aRev !== bRev) return aRev > bRev;
    /* Misma mano: preferir la que tenga mano viva más avanzada. */
    var aLive = a._liveHand && a._liveHand.stage === 'complete' ? 2
      : (a._liveHand ? 1 : 0);
    var bLive = b._liveHand && b._liveHand.stage === 'complete' ? 2
      : (b._liveHand ? 1 : 0);
    if (aLive !== bLive) return aLive > bLive;
    var aTs = Date.parse(a._savedAt || 0) || 0;
    var bTs = Date.parse(b._savedAt || 0) || 0;
    return aTs >= bTs;
  }

  /** Resumen corto para el lobby. */
  function activeSummary() {
    var st = loadActive();
    if (!st) return null;
    var hero = null;
    try {
      if (global.PTTournamentState && global.PTTournamentState.hero) {
        hero = global.PTTournamentState.hero(st);
      }
    } catch (e) { /* ignore */ }
    if (!hero && st.players) {
      hero = st.players.find(function (p) { return p && p.isHero; }) || null;
    }
    var left = 0;
    (st.players || []).forEach(function (p) {
      if (p && p.alive !== false && (p.stack == null || p.stack > 0)) left++;
    });
    return {
      id: st.id,
      name: (st.config && st.config.name) || 'Torneo en curso',
      kind: (st.config && st.config.kind) || 'mtt',
      presetId: st._presetId || (st.config && st.config.id) || null,
      handIndex: Number(st.handIndex) || 0,
      playersLeft: left || ((st.config && st.config.entries) || 0),
      entries: (st.config && st.config.entries) || 0,
      heroStack: hero ? Number(hero.stack) || 0 : 0,
      savedAt: st._savedAt || null,
      status: st.status
    };
  }

  global.PTTournamentStore = {
    BASE_KEY: BASE_KEY,
    ACTIVE_KEY: ACTIVE_KEY,
    MAX: MAX,
    LOCAL_KEEP: LOCAL_KEEP,
    storageKey: storageKey,
    activeStorageKey: activeStorageKey,
    list: list,
    get: get,
    save: save,
    remove: remove,
    clear: clear,
    replaceAll: replaceAll,
    mergeFromCloud: mergeFromCloud,
    saveActive: saveActive,
    loadActive: loadActive,
    clearActive: clearActive,
    hasActive: hasActive,
    isPreferableActive: isPreferableActive,
    activeSummary: activeSummary,
    trimLocalHistory: trimLocalHistory,
    slimActiveAggressive: slimActiveAggressive,
    ensureHistoryOffloaded: ensureHistoryOffloaded,
    getHistoryMemory: getHistoryMemory,
    invalidateHistoryMemory: invalidateHistoryMemory
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
