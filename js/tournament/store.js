/*
 * tournament/store.js — Histórico local de torneos (resúmenes, cap 100).
 */
(function (global) {
  'use strict';

  var BASE_KEY = 'pt_tournaments_v1';
  var MAX = 100;

  function storageKey() {
    var uid = null;
    try {
      if (global.Store && typeof global.Store.getUserId === 'function') {
        uid = global.Store.getUserId();
      }
    } catch (e) { /* ignore */ }
    if (uid) return BASE_KEY + '_' + uid;
    return BASE_KEY;
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
      return true;
    } catch (e) {
      return false;
    }
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

  global.PTTournamentStore = {
    BASE_KEY: BASE_KEY,
    MAX: MAX,
    storageKey: storageKey,
    list: list,
    get: get,
    save: save,
    remove: remove,
    clear: clear
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
