/*
 * tournament/store.js — Histórico + torneo en curso (local + sync Store/PTCloud).
 */
(function (global) {
  'use strict';

  var BASE_KEY = 'pt_tournaments_v1';
  var ACTIVE_KEY = 'pt_tournament_active_v1';
  var MAX = 100;

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

  function list() {
    return readList().slice();
  }

  function get(id) {
    var sid = String(id || '');
    if (!sid) return null;
    return readList().find(function (x) { return x && x.id === sid; }) || null;
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
      sessionId: summary.sessionId || null
    };
  }

  function save(summary) {
    var entry = normalizeSummary(summary);
    if (!entry.id) return { ok: false, reason: 'missing_id' };
    var arr = readList().filter(function (x) { return x && x.id !== entry.id; });
    arr.unshift(entry);
    if (arr.length > MAX) arr = arr.slice(0, MAX);
    writeList(arr);
    return { ok: true, entry: entry, list: arr };
  }

  function remove(id) {
    var sid = String(id || '');
    var arr = readList();
    var next = arr.filter(function (x) { return x && x.id !== sid; });
    if (next.length === arr.length) return { ok: false, list: arr };
    writeList(next);
    return { ok: true, list: next };
  }

  function clear() {
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
      if (!opts.fromCloud || !snap._savedAt) snap._savedAt = new Date().toISOString();
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
              result: h.result ? { heroNet: h.result.heroNet } : null,
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
            board: snap._liveHand.board,
            seats: snap._liveHand.seats,
            toActId: snap._liveHand.toActId,
            result: snap._liveHand.result
          };
        }
        writeActiveRaw(snap);
      }
      if (!opts.silent) markCloudDirty('active');
      return { ok: true, savedAt: snap._savedAt, handIndex: snap.handIndex };
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
    var arr = Array.isArray(list) ? list.slice(0, MAX) : [];
    writeList(arr, { silent: true });
    return { ok: true, list: arr };
  }

  /** Fusiona entradas remotas por id (finishedAt más reciente gana). */
  function mergeFromCloud(remoteList) {
    if (!Array.isArray(remoteList) || !remoteList.length) return list();
    var map = Object.create(null);
    function add(item) {
      if (!item || !item.id) return;
      var prev = map[item.id];
      if (!prev) { map[item.id] = item; return; }
      var ta = Date.parse(item.finishedAt || 0) || 0;
      var tb = Date.parse(prev.finishedAt || 0) || 0;
      if (ta >= tb) map[item.id] = item;
    }
    readList().forEach(add);
    remoteList.forEach(add);
    var next = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) {
      return (Date.parse(b.finishedAt || 0) || 0) - (Date.parse(a.finishedAt || 0) || 0);
    }).slice(0, MAX);
    writeList(next, { silent: true });
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
    activeSummary: activeSummary
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
