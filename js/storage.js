/*
 * storage.js
 * Persistencia en localStorage: histórico de manos jugadas y registro de
 * errores (spots a repetir). Expuesto como `Store`.
 */
(function (global) {
  'use strict';

  const HIST_KEY = 'pt_history_v1';
  const ERR_KEY = 'pt_errors_v1';
  const STATS_KEY = 'pt_stats_v1';
  const SESS_KEY = 'pt_sessions_v1';
  const MAX_HISTORY = 500;

  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* cuota */ }
  }

  function getHistory() { return read(HIST_KEY, []); }
  function getErrors() { return read(ERR_KEY, []); }
  function getStats() {
    return read(STATS_KEY, {
      handsPlayed: 0, totalEvLoss: 0, totalNet: 0,
      decisions: 0, optima: 0, aceptable: 0, imprecisa: 0, error: 0,
      byStreet: {
        preflop: { n: 0, good: 0 },
        flop: { n: 0, good: 0 },
        turn: { n: 0, good: 0 },
        river: { n: 0, good: 0 }
      }
    });
  }

  /** Guarda una mano completada y actualiza errores y estadísticas. */
  function saveHand(hand) {
    const rec = serializeHand(hand);
    const hist = getHistory();
    hist.unshift(rec);
    if (hist.length > MAX_HISTORY) hist.length = MAX_HISTORY;
    write(HIST_KEY, hist);

    // errores a repetir: decisiones imprecisas/erróneas
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
    write(ERR_KEY, errs);

    // estadísticas
    const st = getStats();
    if (!st.byStreet) {
      st.byStreet = {
        preflop: { n: 0, good: 0 },
        flop: { n: 0, good: 0 },
        turn: { n: 0, good: 0 },
        river: { n: 0, good: 0 }
      };
    }
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
    write(STATS_KEY, st);

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

  function clearAll() {
    localStorage.removeItem(HIST_KEY);
    localStorage.removeItem(ERR_KEY);
    localStorage.removeItem(STATS_KEY);
  }
  function clearErrors() { localStorage.removeItem(ERR_KEY); }

  function removeError(id) {
    const errs = getErrors().filter((e) => e.id !== id);
    write(ERR_KEY, errs);
  }

  function exportData() {
    return JSON.stringify({ history: getHistory(), errors: getErrors(), stats: getStats() }, null, 2);
  }

  // ---------- Sesiones importadas ----------
  function getSessions() { return read(SESS_KEY, []); }
  function getSession(id) { return getSessions().find((s) => s.id === id) || null; }
  function saveSession(session) {
    const list = getSessions();
    const idx = list.findIndex((s) => s.id === session.id);
    // guardar versión "ligera" en la lista (sin manos completas) + la completa aparte sería ideal,
    // pero para simplicidad guardamos todo junto.
    if (idx >= 0) list[idx] = session; else list.unshift(session);
    write(SESS_KEY, list);
    return session;
  }
  function removeSession(id) { write(SESS_KEY, getSessions().filter((s) => s.id !== id)); }
  function deleteSessionTxt(id) {
    const list = getSessions();
    const s = list.find((x) => x.id === id);
    if (s) { s.rawText = null; s.hasTxt = false; write(SESS_KEY, list); }
    return s;
  }

  global.Store = {
    getHistory, getErrors, getStats, saveHand,
    clearAll, clearErrors, removeError, exportData, scenarioLabel,
    getSessions, getSession, saveSession, removeSession, deleteSessionTxt
  };
})(window);
