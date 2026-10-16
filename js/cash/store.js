/*
 * cash/store.js — Sesión cash activa + histórico (local + sync cloud).
 */
(function (global) {
  'use strict';

  var BASE_KEY = 'pt_cash_sessions_v1';
  var ACTIVE_KEY = 'pt_cash_active_v1';
  var MAX = 100;
  var LOCAL_KEEP = 15;
  var historyMemoryCache = null;
  var historyMemoryKey = null;

  function invalidateHistoryMemory() {
    historyMemoryCache = null;
    historyMemoryKey = null;
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

  function storageKey() {
    return BASE_KEY + communitySuffix() + userSuffix();
  }

  function activeStorageKey() {
    return ACTIVE_KEY + communitySuffix() + userSuffix();
  }

  function markCloudDirty(which) {
    try {
      var s = communitySuffix();
      var keys;
      if (which === 'active') keys = ['cashActive' + s];
      else if (which === 'history') keys = ['cashHistory' + s];
      else keys = ['cashActive' + s, 'cashHistory' + s];
      if (global.PTCloud && typeof global.PTCloud.markLocalDirty === 'function') {
        global.PTCloud.markLocalDirty(keys);
      }
      if (global.PTCloud && typeof global.PTCloud.schedulePush === 'function') {
        global.PTCloud.schedulePush(keys);
      }
    } catch (e) { /* ignore */ }
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

  function sortHistory(arr) {
    return (arr || []).slice().sort(function (a, b) {
      return (Date.parse(b.finishedAt || 0) || 0) - (Date.parse(a.finishedAt || 0) || 0);
    });
  }

  function list() {
    var key = storageKey();
    if (historyMemoryCache && historyMemoryKey === key) {
      return sortHistory(historyMemoryCache);
    }
    var local = sortHistory(readList());
    historyMemoryCache = local;
    historyMemoryKey = key;
    return local;
  }

  function getHistoryMemory() {
    return list();
  }

  function setHistoryMemory(arr) {
    historyMemoryCache = Array.isArray(arr) ? arr.slice() : [];
    historyMemoryKey = storageKey();
  }

  function slimStateForActive(state) {
    if (!state) return null;
    var copy;
    try {
      copy = JSON.parse(JSON.stringify(state));
    } catch (e) {
      return null;
    }
    /* No persistir fotogramas pesados. */
    if (copy._liveHand) {
      delete copy._liveHand._frames;
      delete copy._liveHand.boardDeck;
    }
    if (copy.sessionHands && copy.sessionHands.length > 40) {
      copy.sessionHands = copy.sessionHands.slice(-40);
    }
    if (copy.handLog && copy.handLog.length > 40) {
      copy.handLog = copy.handLog.slice(-40);
    }
    copy.communityId = communityId();
    return copy;
  }

  function saveActive(state, opts) {
    opts = opts || {};
    try {
      if (typeof localStorage === 'undefined') return false;
      if (!state || state.status === 'finished') {
        localStorage.removeItem(activeStorageKey());
        if (!opts.silent) markCloudDirty('active');
        return true;
      }
      var slim = slimStateForActive(state);
      if (!slim) return false;
      localStorage.setItem(activeStorageKey(), JSON.stringify(slim));
      if (!opts.silent) markCloudDirty('active');
      return true;
    } catch (e) {
      return false;
    }
  }

  function loadActive() {
    try {
      if (typeof localStorage === 'undefined') return null;
      var raw = localStorage.getItem(activeStorageKey());
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.id || data.status === 'finished') return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function clearActive(opts) {
    opts = opts || {};
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(activeStorageKey());
      }
      if (!opts.silent) markCloudDirty('active');
    } catch (e) { /* */ }
  }

  function activeSummary() {
    var a = loadActive();
    if (!a) return null;
    var hero = (a.players || []).find(function (p) { return p && p.isHero; });
    return {
      id: a.id,
      presetId: a._presetId || (a.config && a.config.id),
      name: (a.config && a.config.name) || 'Cash',
      stakeLabel: (a.config && a.config.stakeLabel) || '',
      handIndex: a.handIndex || 0,
      stack: hero ? hero.stack : null,
      status: a.status
    };
  }

  function isPreferableActive(local, cloud) {
    if (!local) return false;
    if (!cloud) return true;
    var lh = Number(local.handIndex) || 0;
    var ch = Number(cloud.handIndex) || 0;
    if (lh !== ch) return lh > ch;
    var lt = Date.parse(local.startedAt || 0) || 0;
    var ct = Date.parse(cloud.startedAt || 0) || 0;
    return lt >= ct;
  }

  function historyEntryFromState(state) {
    if (!state || !state.result) return null;
    var cfg = state.config || {};
    var res = state.result;
    return {
      id: state.id,
      presetId: state._presetId || cfg.id,
      name: cfg.name || cfg.stakeLabel || 'Cash',
      stakeLabel: cfg.stakeLabel || cfg.id,
      stakeNl: cfg.stakeNl,
      kind: 'cash',
      buyInEur: Number(cfg.buyInEur) || 0,
      prizeEur: Number(res.cashOutKoins) || 0,
      profit: Number(res.profitKoins) || 0,
      investedKoins: Number(res.investedKoins) || 0,
      buyInsPaid: Number(res.buyInsPaid) || 1,
      hands: Number(res.hands) || 0,
      bbWon: Number(res.bbWon) || 0,
      bbPer100: Number(res.bbPer100) || 0,
      rakePaid: Number(res.rakePaid) || 0,
      startedAt: state.startedAt,
      finishedAt: state.finishedAt || new Date().toISOString(),
      communityId: communityId(),
      gtoAccuracy: state.gtoSession && state.gtoSession.accuracy,
      reason: res.reason || 'cashout'
    };
  }

  function pushHistory(entry, opts) {
    opts = opts || {};
    if (!entry || !entry.id) return false;
    var mem = list().filter(function (h) { return h && h.id !== entry.id; });
    mem.unshift(entry);
    if (mem.length > MAX) mem = mem.slice(0, MAX);
    setHistoryMemory(mem);
    writeList(mem.slice(0, LOCAL_KEEP), opts);
    return true;
  }

  function saveFinished(state, opts) {
    var entry = historyEntryFromState(state);
    if (!entry) return false;
    clearActive({ silent: true });
    return pushHistory(entry, opts);
  }

  function adoptActiveFromCloud(cloudActive) {
    if (!cloudActive || !cloudActive.id) return false;
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(activeStorageKey(), JSON.stringify(cloudActive));
      return true;
    } catch (e) {
      return false;
    }
  }

  function mergeHistoryFromCloud(cloudList) {
    if (!Array.isArray(cloudList) || !cloudList.length) return list();
    var byId = {};
    list().forEach(function (h) {
      if (h && h.id) byId[h.id] = h;
    });
    cloudList.forEach(function (h) {
      if (!h || !h.id) return;
      var cur = byId[h.id];
      if (!cur) {
        byId[h.id] = h;
        return;
      }
      var ct = Date.parse(h.finishedAt || 0) || 0;
      var lt = Date.parse(cur.finishedAt || 0) || 0;
      if (ct >= lt) byId[h.id] = h;
    });
    var merged = sortHistory(Object.keys(byId).map(function (k) { return byId[k]; }));
    setHistoryMemory(merged);
    writeList(merged.slice(0, LOCAL_KEEP), { silent: true });
    return merged;
  }

  global.PTCashStore = {
    list: list,
    getHistoryMemory: getHistoryMemory,
    setHistoryMemory: setHistoryMemory,
    saveActive: saveActive,
    loadActive: loadActive,
    clearActive: clearActive,
    activeSummary: activeSummary,
    isPreferableActive: isPreferableActive,
    saveFinished: saveFinished,
    historyEntryFromState: historyEntryFromState,
    pushHistory: pushHistory,
    adoptActiveFromCloud: adoptActiveFromCloud,
    mergeHistoryFromCloud: mergeHistoryFromCloud,
    invalidateHistoryMemory: invalidateHistoryMemory,
    communitySuffix: communitySuffix,
    markCloudDirty: markCloudDirty
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
