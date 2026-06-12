/*
 * streetStrategy.js — Validación antiduplicación Turn vs River, sanity check y recarga de estrategia.
 */
(function (global) {
  'use strict';

  const PROBE_ACTIONS = ['check', 'bet_33', 'bet_66', 'bet_100'];
  const ORDER = ['preflop', 'flop', 'turn', 'river'];
  const BTS = function () { return global.GTOBoardTextureShift; };

  /** Redondea frecuencias a enteros % para comparación estable. */
  function frequencyFingerprint(strategy, actions) {
    actions = actions || PROBE_ACTIONS;
    if (!strategy) return null;
    const parts = actions.map((a) => {
      const pct = Math.round((strategy[a] || 0) * 100);
      return a + ':' + pct;
    });
    return parts.join('|');
  }

  /** True si dos matrices de frecuencias son idénticas (margen 0%). */
  function frequenciesIdentical(a, b, actions) {
    actions = actions || PROBE_ACTIONS;
    if (!a || !b) return false;
    return actions.every((act) => Math.round((a[act] || 0) * 100) === Math.round((b[act] || 0) * 100));
  }

  /**
   * Compara calles consecutivas con acciones de probe (check/bet).
   * @returns {{ ok: boolean, alert: string|null, prevStreet: string, street: string, fingerprint: string }}
   */
  function validateConsecutiveProbeStreets(prevDecision, decision, tolerancePct) {
    tolerancePct = tolerancePct != null ? tolerancePct : 0;
    if (!prevDecision || !decision) return { ok: true, alert: null };

    const prevFp = frequencyFingerprint(prevDecision.gto || prevDecision.strategy);
    const fp = frequencyFingerprint(decision.gto || decision.strategy);
    if (!prevFp || !fp || prevFp !== fp) return { ok: true, alert: null, fingerprint: fp };

    if (tolerancePct > 0) {
      const ok = !PROBE_ACTIONS.every((act) =>
        Math.abs((decision.gto[act] || 0) - (prevDecision.gto[act] || 0)) * 100 <= tolerancePct
      );
      if (ok) return { ok: true, alert: null, fingerprint: fp };
    }

    return {
      ok: false,
      alert: 'Error de Renderizado: frecuencias idénticas en ' + prevDecision.street + ' y ' + decision.street
        + ' (' + fp + '). Recargar árbol de decisión.',
      prevStreet: prevDecision.street,
      street: decision.street,
      fingerprint: fp,
      code: 'STREET_FREQ_DUPLICATE'
    };
  }

  /**
   * Recorre decisiones de una mano y detecta duplicados Turn→River (u otras parejas).
   */
  function validateHandDecisions(decisions) {
    const alerts = [];
    const byStreet = {};
    (decisions || []).forEach((d) => {
      if (!d.street || !d.gto) return;
      const hasProbe = PROBE_ACTIONS.some((a) => d.gto[a] != null);
      if (!hasProbe) return;
      byStreet[d.street] = d;
    });

    for (let i = 1; i < ORDER.length; i++) {
      const prev = byStreet[ORDER[i - 1]];
      const cur = byStreet[ORDER[i]];
      if (!prev || !cur) continue;
      const r = validateConsecutiveProbeStreets(prev, cur, 0);
      if (!r.ok) alerts.push(r);
    }
    return alerts;
  }

  /** Clave de caché enriquecida: evita servir turn cuando cambia calle/bote/board. */
  function strategyCacheSuffix(input) {
    const board = (input.board || []).join('');
    const pot = Math.round((input.potBB || 0) * 100) / 100;
    const call = Math.round((input.toCallBB || 0) * 100) / 100;
    const tier = input.madeHandInfo && input.madeHandInfo.tier ? input.madeHandInfo.tier : '-';
    const nut = input.madeHandInfo && input.madeHandInfo.isNutStraight ? 'N' : '-';
    const shift = BTS() && input.priorBoard
      ? (BTS().shouldInvalidatePriorMatrix(input.priorBoard, input.board || []) ? 'SHIFT' : '-')
      : '-';
    return [input.street || '?', board, pot, call, tier, nut, shift, input.initiative || '-'].join(':');
  }

  /**
   * Módulo 3 — Sanity check: board coordinado + check% clonado entre turn/river.
   * @param {Object} boardsByStreet — { turn: [...], river: [...] }
   */
  function sanityCheckSolver(decisions, boardsByStreet, tolerancePct) {
    tolerancePct = tolerancePct != null ? tolerancePct : 1;
    const turnDec = (decisions || []).find((d) => d.street === 'turn' && d.gto);
    const riverDec = (decisions || []).find((d) => d.street === 'river' && d.gto);
    if (!turnDec || !riverDec) return { ok: true };

    const checkTurn = Math.round((turnDec.gto.check || 0) * 100);
    const checkRiver = Math.round((riverDec.gto.check || 0) * 100);
    const boards = boardsByStreet || {};
    const riverBoard = boards.river || riverDec.board || [];
    const turnBoard = boards.turn || turnDec.board || [];
    const coordinated = BTS() ? BTS().isBoardCoordinated(riverBoard) : false;
    const shift = BTS() ? BTS().computeBoardTextureShift(turnBoard, riverBoard) : { shifted: false };

    const checkClone = Math.abs(checkTurn - checkRiver) <= tolerancePct;
    const duplicateFp = frequencyFingerprint(turnDec.gto) === frequencyFingerprint(riverDec.gto);

    if (coordinated && (checkClone || duplicateFp)) {
      return {
        ok: false,
        code: 'SOLVER_SANITY_FAIL',
        action: 'INVALIDATE_AND_RECALC',
        log: '[SOLVER] ERROR: board coordinado (shift=' + shift.riverCompletesStraight
          + ') pero check turn=' + checkTurn + '% river=' + checkRiver + '% — recalcular árbol.',
        checkTurn,
        checkRiver,
        coordinated,
        textureShift: shift
      };
    }
    return { ok: true, checkTurn, checkRiver, coordinated };
  }

  /** Invalida caché del solver y devuelve instrucción de recálculo. */
  function invalidateSolverCache(reason) {
    if (global.GTOCache) global.GTOCache.clear('spot');
    return { recalc: true, reason: reason || 'cache invalidated' };
  }

  global.GTOStreetValidation = {
    PROBE_ACTIONS,
    frequencyFingerprint,
    frequenciesIdentical,
    validateConsecutiveProbeStreets,
    validateHandDecisions,
    strategyCacheSuffix,
    sanityCheckSolver,
    invalidateSolverCache
  };
})(window);
