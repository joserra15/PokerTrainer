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

  let userId = null;

  function scopedKey(base) {
    if (userId) return KEY_PREFIX + base + KEY_SUFFIX + '_' + userId;
    return KEY_PREFIX + base + KEY_SUFFIX;
  }

  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* cuota */ }
  }

  function notifySync(keys) {
    if (!global.PTCloud) return;
    if (global.PTCloud.markLocalDirty) global.PTCloud.markLocalDirty(keys);
    if (global.PTCloud.schedulePush) global.PTCloud.schedulePush(keys);
  }

  function stripSessionsForCloud(sessions) {
    return sessions.map(function (s) {
      const copy = Object.assign({}, s);
      delete copy.rawText;
      copy.hasTxt = false;
      return copy;
    });
  }

  function migrateLegacyOnce(uid) {
    if (!uid) return;
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

  function getHistory() { return read(scopedKey('history'), []); }
  function getErrors() { return read(scopedKey('errors'), []); }
  function getStats() { return read(scopedKey('stats'), defaultStats()); }

  /** Guarda una mano completada y actualiza errores y estadísticas. */
  function saveHand(hand) {
    const rec = serializeHand(hand);
    const hist = getHistory();
    hist.unshift(rec);
    if (hist.length > MAX_HISTORY) hist.length = MAX_HISTORY;
    write(scopedKey('history'), hist);

    const errs = getErrors();
    hand.decisions.forEach((d, idx) => {
      if (d.class === 'error' || d.class === 'imprecisa') {
        errs.unshift({
          id: rec.id + '_' + idx,
          handId: rec.id,
          createdAt: rec.createdAt,
          seed: rec.seed,
          scenarioRaw: rec.scenarioRaw,
          scenario: rec.scenario,
          heroPos: rec.heroPos,
          heroCode: rec.heroCode,
          heroCards: rec.heroCards,
          street: d.street,
          chosen: d.label,
          chosenAction: d.action,
          best: d.best,
          class: d.class,
          evLoss: d.evLoss,
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
    write(scopedKey('stats'), st);
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
      decisions: hand.decisions.map((d) => ({
        street: d.street, action: d.action, label: d.label,
        class: d.class, best: d.best, evLoss: d.evLoss, gto: d.gto, context: d.context
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
    notifySync(['history']);
  }

  function clearStats() {
    write(scopedKey('stats'), defaultStats());
    notifySync(['stats']);
  }

  function clearAll() {
    clearHistory();
    clearErrors();
    clearStats();
  }
  function clearErrors() {
    localStorage.removeItem(scopedKey('errors'));
    notifySync(['errors']);
  }

  function removeError(id) {
    const errs = getErrors().filter((e) => e.id !== id);
    write(scopedKey('errors'), errs);
    notifySync(['errors']);
  }

  function exportData() {
    return JSON.stringify({ history: getHistory(), errors: getErrors(), stats: getStats() }, null, 2);
  }

  function getSessions() { return read(scopedKey('sessions'), []); }
  function getSession(id) { return getSessions().find((s) => s.id === id) || null; }
  function saveSession(session) {
    const list = getSessions();
    const idx = list.findIndex((s) => s.id === session.id);
    if (idx >= 0) list[idx] = session; else list.unshift(session);
    write(scopedKey('sessions'), list);
    notifySync(['sessions']);
    return session;
  }
  function removeSession(id) {
    write(scopedKey('sessions'), getSessions().filter((s) => s.id !== id));
    notifySync(['sessions']);
  }
  function deleteSessionTxt(id) {
    const list = getSessions();
    const s = list.find((x) => x.id === id);
    if (s) { s.rawText = null; s.hasTxt = false; write(scopedKey('sessions'), list); notifySync(['sessions']); }
    return s;
  }

  function getCloudSnapshot() {
    return {
      stats: getStats(),
      history: getHistory(),
      errors: getErrors(),
      sessions: stripSessionsForCloud(getSessions())
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

  function replaceFromCloud(snapshot) {
    if (!snapshot) return;
    if (snapshot.stats) write(scopedKey('stats'), snapshot.stats);
    if (snapshot.history) write(scopedKey('history'), snapshot.history);
    if (snapshot.errors) write(scopedKey('errors'), snapshot.errors);
    if (snapshot.sessions) write(scopedKey('sessions'), mergeSessionsFromCloud(snapshot.sessions));
  }

  global.Store = {
    setUserId,
    getHistory, getErrors, getStats, saveHand,
    clearHistory, clearStats, clearAll, clearErrors, removeError, exportData, scenarioLabel,
    getSessions, getSession, saveSession, removeSession, deleteSessionTxt,
    getCloudSnapshot, replaceFromCloud
  };
})(window);
