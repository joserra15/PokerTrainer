/*
 * tournament/wallet.js — Saldo de Koins (100 iniciales) + sync cloud.
 * Koins independientes por comunidad (clave local + payload nube namespaced).
 *
 * Importante sync: no inventar wallet al leer para push/merge. Un `ensure()`
 * con updatedAt=now en un PC vacío pisaba el saldo real del móvil.
 */
(function (global) {
  'use strict';

  var STARTING = 100;
  var KEY = 'pt_tournament_wallet_v1';

  function userSuffix() {
    var uid = null;
    try {
      if (global.Store && typeof global.Store.getUserId === 'function') {
        uid = global.Store.getUserId();
      }
    } catch (e) { /* */ }
    return uid ? ('_' + uid) : '';
  }

  /** '' en PokerForge; '_mttlab' (etc.) en comunidades gated. */
  function communitySuffix() {
    try {
      if (global.Store && typeof global.Store.communityDataSuffix === 'function') {
        return global.Store.communityDataSuffix() || '';
      }
      var id = null;
      if (global.PTCommunity && typeof global.PTCommunity.id === 'function') {
        id = global.PTCommunity.id();
      }
      if (!id || id === 'pokerforge') return '';
      return '_' + String(id);
    } catch (e) {
      return '';
    }
  }

  function storageKey() {
    return KEY + communitySuffix() + userSuffix();
  }

  function cloudDirtyKeys() {
    var s = communitySuffix();
    /* Solo wallet: no marcar history dirty (un [] local pisaría la nube). */
    return ['tournamentWallet' + s];
  }

  function markDirty() {
    try {
      var keys = cloudDirtyKeys();
      if (global.PTCloud && typeof global.PTCloud.markLocalDirty === 'function') {
        global.PTCloud.markLocalDirty(keys);
      }
      if (global.PTCloud && typeof global.PTCloud.schedulePush === 'function') {
        global.PTCloud.schedulePush(keys);
      }
    } catch (e) { /* */ }
  }

  function readRaw() {
    try {
      if (typeof localStorage === 'undefined') return null;
      var raw = localStorage.getItem(storageKey());
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function writeRaw(data, opts) {
    opts = opts || {};
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(storageKey(), JSON.stringify(data));
      if (!opts.silent) markDirty();
      return true;
    } catch (e) {
      return false;
    }
  }

  function normalizeStored(data) {
    if (!data || typeof data.balance !== 'number') return null;
    if (!data.lessonAwards || typeof data.lessonAwards !== 'object') data.lessonAwards = {};
    if (typeof data.trainerHands !== 'number') data.trainerHands = Number(data.trainerHands) || 0;
    if (typeof data.tournamentsPlayed !== 'number') {
      data.tournamentsPlayed = Number(data.tournamentsPlayed) || 0;
    }
    if (data.balance < 0) data.balance = 0;
    return data;
  }

  /** Lee sin crear saldo inventado (seguro para sync/push). */
  function peek() {
    return normalizeStored(readRaw());
  }

  function defaultWallet() {
    return {
      balance: STARTING,
      updatedAt: new Date().toISOString(),
      version: 1,
      trainerHands: 0,
      tournamentsPlayed: 0,
      lessonAwards: {}
    };
  }

  function ensure() {
    var data = peek();
    if (!data) {
      data = defaultWallet();
      writeRaw(data);
    }
    return data;
  }

  function getBalance() {
    return ensure().balance;
  }

  function getTournamentsPlayed() {
    return Number(ensure().tournamentsPlayed) || 0;
  }

  function setTournamentsPlayed(n) {
    var data = ensure();
    data.tournamentsPlayed = Math.max(0, Math.floor(Number(n) || 0));
    data.updatedAt = new Date().toISOString();
    writeRaw(data);
    return data.tournamentsPlayed;
  }

  function noteTournamentPlayed() {
    return setTournamentsPlayed(getTournamentsPlayed() + 1);
  }

  function setBalance(n, meta) {
    var bal = Math.round((Number(n) || 0) * 100) / 100;
    if (bal < 0) bal = 0;
    var data = ensure();
    data.balance = bal;
    data.updatedAt = new Date().toISOString();
    if (meta) data.last = meta;
    writeRaw(data);
    return data.balance;
  }

  function canAfford(cost) {
    return getBalance() + 1e-9 >= (Number(cost) || 0);
  }

  function debit(cost, meta) {
    cost = Math.round((Number(cost) || 0) * 100) / 100;
    if (cost < 0) cost = 0;
    var bal = getBalance();
    if (bal + 1e-9 < cost) {
      return { ok: false, reason: 'insufficient', balance: bal };
    }
    var next = Math.round((bal - cost) * 100) / 100;
    setBalance(next, Object.assign({ type: 'debit', amount: cost }, meta || {}));
    return { ok: true, balance: next, charged: cost };
  }

  function credit(amount, meta) {
    amount = Math.round((Number(amount) || 0) * 100) / 100;
    if (amount <= 0) return { ok: true, balance: getBalance(), added: 0 };
    var next = Math.round((getBalance() + amount) * 100) / 100;
    setBalance(next, Object.assign({ type: 'credit', amount: amount }, meta || {}));
    return { ok: true, balance: next, added: amount };
  }

  function communityId() {
    try {
      if (global.PTCommunity && typeof global.PTCommunity.id === 'function') {
        return global.PTCommunity.id() || 'pokerforge';
      }
    } catch (e) { /* */ }
    return 'pokerforge';
  }

  function toSnapshot(data) {
    if (!data || typeof data.balance !== 'number') return null;
    return {
      balance: data.balance,
      updatedAt: data.updatedAt,
      version: data.version || 1,
      trainerHands: Number(data.trainerHands) || 0,
      tournamentsPlayed: Number(data.tournamentsPlayed) || 0,
      lessonAwards: data.lessonAwards || {},
      communityId: communityId()
    };
  }

  /**
   * Snapshot para UI/cloud. Por defecto no inventa fila local.
   * opts.create === true → ensure() (p.ej. al abrir lobby sin sync).
   */
  function snapshot(opts) {
    opts = opts || {};
    if (opts.create) return toSnapshot(ensure());
    var data = peek();
    if (data) return toSnapshot(data);
    /* Vista sin persistir: no marcar dirty ni pisar nube. */
    return {
      balance: STARTING,
      updatedAt: null,
      version: 1,
      trainerHands: 0,
      tournamentsPlayed: 0,
      lessonAwards: {},
      communityId: communityId(),
      isDefault: true
    };
  }

  function applyRemote(remote, local) {
    var data = {
      balance: Math.max(0, Number(remote.balance) || 0),
      updatedAt: remote.updatedAt || new Date().toISOString(),
      version: remote.version || 1,
      /* Contador monótono: no perder manos locales al fusionar. */
      trainerHands: Math.max(
        remote.trainerHands != null ? Number(remote.trainerHands) || 0 : 0,
        (local && Number(local.trainerHands)) || 0
      ),
      tournamentsPlayed: Math.max(
        Number(remote.tournamentsPlayed) || 0,
        (local && Number(local.tournamentsPlayed)) || 0
      ),
      lessonAwards: Object.assign(
        {},
        (local && local.lessonAwards) || {},
        remote.lessonAwards || {}
      ),
      last: { type: 'cloud_merge' }
    };
    writeRaw(data, { silent: true });
    return toSnapshot(data);
  }

  function mergeFromCloud(remote) {
    if (!remote || typeof remote.balance !== 'number') return snapshot();
    var local = peek();
    if (!local) return applyRemote(remote, null);

    var localTs = Date.parse(local.updatedAt || 0) || 0;
    var remoteTs = Date.parse(remote.updatedAt || 0) || 0;

    if (remoteTs > localTs) {
      return applyRemote(remote, local);
    }
    if (remoteTs === localTs) {
      /* Empate: quedarse con el mínimo (no inventar koins gastados). */
      var tied = Object.assign({}, local, {
        balance: Math.min(local.balance, Math.max(0, remote.balance)),
        tournamentsPlayed: Math.max(
          Number(local.tournamentsPlayed) || 0,
          Number(remote.tournamentsPlayed) || 0
        ),
        trainerHands: Math.max(
          Number(local.trainerHands) || 0,
          remote.trainerHands != null ? Number(remote.trainerHands) || 0 : 0
        ),
        lessonAwards: Object.assign({}, local.lessonAwards || {}, remote.lessonAwards || {}),
        last: { type: 'cloud_merge_tie' }
      });
      if (tied.balance !== local.balance ||
          tied.tournamentsPlayed !== local.tournamentsPlayed ||
          tied.trainerHands !== local.trainerHands) {
        writeRaw(tied, { silent: true });
      }
      return toSnapshot(tied);
    }
    /* Local más reciente: aún fusionar contadores monótonos. */
    var dirtyLocal = false;
    if (remote.tournamentsPlayed != null) {
      var nextPlayed = Math.max(
        Number(local.tournamentsPlayed) || 0,
        Number(remote.tournamentsPlayed) || 0
      );
      if (nextPlayed !== (Number(local.tournamentsPlayed) || 0)) {
        local.tournamentsPlayed = nextPlayed;
        dirtyLocal = true;
      }
    }
    if (remote.trainerHands != null) {
      var nextHands = Math.max(
        Number(local.trainerHands) || 0,
        Number(remote.trainerHands) || 0
      );
      if (nextHands !== (Number(local.trainerHands) || 0)) {
        local.trainerHands = nextHands;
        dirtyLocal = true;
      }
    }
    if (dirtyLocal) writeRaw(local, { silent: true });
    return toSnapshot(local);
  }

  /** +1 Koin la primera vez que se aprueba una lección de Escuela. */
  function earnFromLesson(lessonId) {
    var id = String(lessonId || '');
    if (!id) return { ok: false, reason: 'missing_lesson' };
    var data = ensure();
    data.lessonAwards = data.lessonAwards || {};
    if (data.lessonAwards[id]) {
      return { ok: true, added: 0, already: true, balance: data.balance };
    }
    data.lessonAwards[id] = new Date().toISOString();
    writeRaw(data);
    return credit(1, { type: 'school_lesson', lessonId: id });
  }

  /** +1 Koin cada 25 manos de entrenador. */
  function noteTrainerHand() {
    var data = ensure();
    var n = (Number(data.trainerHands) || 0) + 1;
    data.trainerHands = n;
    data.updatedAt = new Date().toISOString();
    writeRaw(data);
    if (n > 0 && n % 25 === 0) {
      return credit(1, { type: 'trainer_hands', hands: n });
    }
    return { ok: true, added: 0, trainerHands: n, balance: data.balance };
  }

  global.PTTournamentWallet = {
    STARTING: STARTING,
    getBalance: getBalance,
    setBalance: setBalance,
    canAfford: canAfford,
    debit: debit,
    credit: credit,
    snapshot: snapshot,
    peek: peek,
    mergeFromCloud: mergeFromCloud,
    ensure: ensure,
    earnFromLesson: earnFromLesson,
    noteTrainerHand: noteTrainerHand,
    getTournamentsPlayed: getTournamentsPlayed,
    setTournamentsPlayed: setTournamentsPlayed,
    noteTournamentPlayed: noteTournamentPlayed,
    communitySuffix: communitySuffix,
    storageKey: storageKey
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
