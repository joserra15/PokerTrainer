/*
 * tournament/wallet.js — Saldo de Koins (100 iniciales) + sync cloud.
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

  function storageKey() {
    return KEY + userSuffix();
  }

  function markDirty() {
    try {
      if (global.PTCloud && typeof global.PTCloud.markLocalDirty === 'function') {
        global.PTCloud.markLocalDirty(['tournamentWallet', 'tournamentHistory']);
      }
      if (global.PTCloud && typeof global.PTCloud.schedulePush === 'function') {
        global.PTCloud.schedulePush(['tournamentWallet', 'tournamentHistory']);
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

  function writeRaw(data) {
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(storageKey(), JSON.stringify(data));
      markDirty();
      return true;
    } catch (e) {
      return false;
    }
  }

  function ensure() {
    var data = readRaw();
    if (!data || typeof data.balance !== 'number') {
      data = {
        balance: STARTING,
        updatedAt: new Date().toISOString(),
        version: 1,
        trainerHands: 0,
        lessonAwards: {}
      };
      writeRaw(data);
    } else {
      if (!data.lessonAwards || typeof data.lessonAwards !== 'object') data.lessonAwards = {};
      if (typeof data.trainerHands !== 'number') data.trainerHands = Number(data.trainerHands) || 0;
      if (data.balance < 0) data.balance = 0;
    }
    return data;
  }

  function getBalance() {
    return ensure().balance;
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

  function snapshot() {
    var data = ensure();
    return {
      balance: data.balance,
      updatedAt: data.updatedAt,
      version: data.version || 1,
      trainerHands: Number(data.trainerHands) || 0,
      lessonAwards: data.lessonAwards || {}
    };
  }

  function mergeFromCloud(remote) {
    if (!remote || typeof remote.balance !== 'number') return snapshot();
    var local = ensure();
    var localTs = Date.parse(local.updatedAt || 0) || 0;
    var remoteTs = Date.parse(remote.updatedAt || 0) || 0;
    /* Preferir el saldo con timestamp más reciente; nunca negativo. */
    if (remoteTs > localTs) {
      setBalance(Math.max(0, remote.balance), { type: 'cloud_merge' });
      if (remote.trainerHands != null) {
        var d = ensure();
        d.trainerHands = Number(remote.trainerHands) || 0;
        d.lessonAwards = remote.lessonAwards || d.lessonAwards || {};
        writeRaw(d);
      }
    } else if (remoteTs === localTs && typeof remote.balance === 'number') {
      /* Empate: quedarse con el mínimo (no inventar koins gastados). */
      setBalance(Math.min(local.balance, Math.max(0, remote.balance)), { type: 'cloud_merge_tie' });
    }
    return snapshot();
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
    mergeFromCloud: mergeFromCloud,
    ensure: ensure,
    earnFromLesson: earnFromLesson,
    noteTrainerHand: noteTrainerHand
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
