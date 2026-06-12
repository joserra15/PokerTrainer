/*
 * villainCallAudit.js — Módulo 2: auditoría de calls del villano (detector "call de estación").
 */
(function (global) {
  'use strict';

  const C = global.Cards;
  const N = global.GTORangesNotation;
  const BTS = global.GTOBoardTextureShift;
  const Eq = global.GTOEquity;

  const BB_DEFEND_RANGE = '22-99, A2s-AJs, K9s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, ATo-AJo, KQo, QJo, JTo';

  function allCombos(rangeStr, excluded) {
    if (Eq && Eq.allVillainCombos) return Eq.allVillainCombos(rangeStr, excluded);
    return [];
  }

  /**
   * Board Domination Index (BDI): % de combos del rango defensor que tienen escalera+ en el board.
   * Incluye sub-conteo de combos que completan escalera con J (blocker study).
   */
  function boardDominationIndex(board, defenderRangeStr, heroCards) {
    const dead = (heroCards || []).concat(board || []);
    const combos = allCombos(defenderRangeStr || BB_DEFEND_RANGE, dead);
    if (!combos.length) return { bdi: 0, jackStraightCombos: 0, total: 0, straightCombos: 0 };

    let straightCombos = 0;
    let jackStraightCombos = 0;
    combos.forEach((vh) => {
      const ev = C.evaluate(vh.concat(board));
      if (ev.category >= 4) {
        straightCombos++;
        if (vh.some((c) => c[0] === 'J')) jackStraightCombos++;
      }
    });

    return {
      bdi: straightCombos / combos.length,
      straightCombos,
      jackStraightCombos,
      total: combos.length
    };
  }

  /** EV heurístico de bluff-catch: negativo si el board domina el rango defensor. */
  function bluffCatchEvScore(bdi, potOdds, coordinated) {
    if (!coordinated) return 0.05;
    if (bdi >= 0.22) return -0.35;
    if (bdi >= 0.14) return -0.18;
    if (bdi >= 0.08) return -0.08;
    return 0.02;
  }

  /**
   * Audita call del villano en river (u otra calle).
   * @param {Object} ctx — { action, street, board, betBB, potBeforeBB, heroCards, defenderRange, aggressorBluffFreq }
   */
  function auditVillainCall(ctx) {
    ctx = ctx || {};
    if ((ctx.action || ctx.type) !== 'call') return null;
    const street = ctx.street || 'river';
    const board = ctx.board || [];
    const coordinated = BTS ? BTS.isBoardCoordinated(board) : false;
    const betBB = ctx.betBB || 0;
    const potBefore = Math.max(ctx.potBeforeBB || ctx.potBB || 1, 0.1);
    const betRatio = betBB / potBefore;

    const dom = boardDominationIndex(
      board,
      ctx.defenderRange || BB_DEFEND_RANGE,
      ctx.heroCards || []
    );

    const bluffCatchEv = bluffCatchEvScore(dom.bdi, betRatio, coordinated);
    const naturalBluffsLow = coordinated && dom.bdi >= 0.12 && ctx.aggressorBluffFreq != null
      && ctx.aggressorBluffFreq < 0.15;

    const isStationCall = street === 'river' && coordinated && betRatio >= 0.35
      && (dom.bdi >= 0.14 || naturalBluffsLow) && bluffCatchEv < -0.1;

    if (isStationCall) {
      return {
        severity: 'critical',
        code: 'VILLAIN_STATION_CALL',
        label: 'Error Crítico: Call de Estación (Overcall en Board Altamente Conectado)',
        summary: street.charAt(0).toUpperCase() + street.slice(1) + ': call '
          + (betBB ? betBB.toFixed(1) + 'bb' : '')
          + ' → overcall; board conecta con rango defensor (BDI '
          + Math.round(dom.bdi * 100) + '%, J-straight combos: ' + dom.jackStraightCombos + ').',
        note: 'No es bluff-catch viable: el rango del defensor tiene demasiadas escaleras/parejas fuertes '
          + 'y el agresor no tiene suficientes faroles naturales. Penalización aplicada al análisis del villano.',
        penalty: Math.round(Math.min(10, 4 + dom.bdi * 20)),
        dom,
        bluffCatchEv,
        bluffCatchViable: false
      };
    }

    if (street === 'river') {
      return {
        severity: 'info',
        code: 'VILLAIN_BLUFF_CATCH',
        label: 'Bluff-catch / valor fino',
        summary: 'River: call → bluff-catch o valor fino marginal.',
        bluffCatchViable: bluffCatchEv >= 0,
        dom,
        bluffCatchEv
      };
    }

    return null;
  }

  global.GTOVillainCallAudit = {
    BB_DEFEND_RANGE,
    boardDominationIndex,
    bluffCatchEvScore,
    auditVillainCall
  };
})(window);
