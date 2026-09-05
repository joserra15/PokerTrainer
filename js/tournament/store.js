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

  function storageKey() {
    return BASE_KEY + userSuffix();
  }

  function activeStorageKey() {
    return ACTIVE_KEY + userSuffix();
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

  function writeList(list) {
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(storageKey(), JSON.stringify(list || []));
      markCloudDirty();
      return true;
    } catch (e) {
      return false;
    }
  }

  function markCloudDirty() {
    try {
      if (global.PTCloud && typeof global.PTCloud.markLocalDirty === 'function') {
        global.PTCloud.markLocalDirty(['tournamentActive', 'tournamentHistory']);
      }
      if (global.PTCloud && typeof global.PTCloud.schedulePush === 'function') {
        global.PTCloud.schedulePush(['tournamentActive', 'tournamentHistory']);
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
      presetId: summary.presetId || null
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

  /** Snapshot del torneo en curso (para continuar más tarde). */
  function saveActive(state) {
    if (!state || state.status === 'finished') {
      clearActive();
      return { ok: false, reason: 'not_active' };
    }
    try {
      if (typeof localStorage === 'undefined') return { ok: false };
      var snap = JSON.parse(JSON.stringify(state));
      snap._savedAt = new Date().toISOString();
      localStorage.setItem(activeStorageKey(), JSON.stringify(snap));
      markCloudDirty();
      return { ok: true };
    } catch (e) {
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

  function clearActive() {
    try {
      if (typeof localStorage === 'undefined') return { ok: false };
      localStorage.removeItem(activeStorageKey());
      markCloudDirty();
      return { ok: true };
    } catch (e) {
      return { ok: false };
    }
  }

  function hasActive() {
    return !!loadActive();
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
    saveActive: saveActive,
    loadActive: loadActive,
    clearActive: clearActive,
    hasActive: hasActive,
    activeSummary: activeSummary
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
