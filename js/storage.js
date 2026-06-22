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
      delete h.summary;
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

  function writeStats(st) {
    st.updatedAt = Date.now();
    write(scopedKey('stats'), st);
  }

  function mergeStats(localStats, cloudStats) {
    const a = localStats && typeof localStats === 'object' ? localStats : defaultStats();
    const b = cloudStats && typeof cloudStats === 'object' ? cloudStats : defaultStats();
    const lt = a.updatedAt || 0;
    const ct = b.updatedAt || 0;
    const pick = lt >= ct ? a : b;
    const out = JSON.parse(JSON.stringify(pick));
    delete out.updatedAt;
    return out;
  }
  function getErrors() { return read(scopedKey('errors'), []); }
  function getStats() { return read(scopedKey('stats'), defaultStats()); }

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
    notifySync(['history']);
  }

  function clearStats() {
    const st = defaultStats();
    writeStats(st);
    notifySync(['stats']);
    if (global.PTCloud && global.PTCloud.flushPush) global.PTCloud.flushPush();
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
  function getSession(id) {
    const s = getSessions().find((x) => x.id === id) || null;
    if (!s || !s.hasTxt) return s;
    const txt = readRaw(sessionTxtKey(id));
    return txt ? Object.assign({}, s, { rawText: txt }) : s;
  }
  function saveSession(session) {
    const rawText = session.rawText;
    const toStore = slimSession(session);
    let hasTxt = !!session.hasTxt;
    if (rawText) {
      hasTxt = writeRaw(sessionTxtKey(session.id), rawText);
      toStore.hasTxt = hasTxt;
    }
    const list = getSessions();
    const idx = list.findIndex((s) => s.id === toStore.id);
    if (idx >= 0) list[idx] = toStore; else list.unshift(toStore);
    if (!write(scopedKey('sessions'), list)) {
      return { ok: false, error: 'Cuota de almacenamiento local agotada.', session: session };
    }
    notifySync(['sessions']);
    const out = Object.assign({}, session, { hasTxt: hasTxt });
    if (hasTxt) out.rawText = rawText;
    else delete out.rawText;
    return { ok: true, session: out };
  }
  function removeSession(id) {
    try { localStorage.removeItem(sessionTxtKey(id)); } catch (e) { /* ignore */ }
    write(scopedKey('sessions'), getSessions().filter((s) => s.id !== id));
    notifySync(['sessions']);
  }
  function deleteSessionTxt(id) {
    const list = getSessions();
    const s = list.find((x) => x.id === id);
    if (s) {
      try { localStorage.removeItem(sessionTxtKey(id)); } catch (e) { /* ignore */ }
      s.hasTxt = false;
      write(scopedKey('sessions'), list);
      notifySync(['sessions']);
    }
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
    return Object.values(byId);
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
    const history = mergeRecordsById(local.history, cloudSnapshot.history, MAX_HISTORY);
    const errors = mergeRecordsById(local.errors, cloudSnapshot.errors, MAX_HISTORY);
    const sessions = mergeSessionsBidirectional(local.sessions, cloudSnapshot.sessions);
    const stats = mergeStats(local.stats, cloudSnapshot.stats);
    write(scopedKey('history'), history);
    write(scopedKey('errors'), errors);
    write(scopedKey('sessions'), sessions);
    writeStats(stats);
    return { history: history.length, errors: errors.length, sessions: sessions.length, stats: stats };
  }

  function replaceFromCloud(snapshot) {
    if (!snapshot) return;
    if (snapshot.stats) writeStats(JSON.parse(JSON.stringify(snapshot.stats)));
    if (snapshot.history) write(scopedKey('history'), snapshot.history);
    if (snapshot.errors) write(scopedKey('errors'), snapshot.errors);
    if (snapshot.sessions) write(scopedKey('sessions'), mergeSessionsFromCloud(snapshot.sessions));
  }

  global.Store = {
    setUserId,
    getHistory, getErrors, getStats, saveHand,
    clearHistory, clearStats, clearAll, clearErrors, removeError, exportData, scenarioLabel,
    getSessions, getSession, saveSession, removeSession, deleteSessionTxt,
    getCloudSnapshot, replaceFromCloud, mergeFromCloud
  };
})(window);
