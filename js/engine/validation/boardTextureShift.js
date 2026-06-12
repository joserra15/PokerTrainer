/*
 * boardTextureShift.js — Módulo 1: invalidación por cambio de textura y value-bet con nuts.
 */
(function (global) {
  'use strict';

  const C = global.Cards;
  const Board = global.GTOBoardCluster;

  function rankVals(board) {
    const vals = new Set((board || []).map((c) => C.RANK_VALUE[c[0]]));
    if (vals.has(14)) vals.add(1);
    return vals;
  }

  /** High card de escalera posible solo con cartas del board (5 cartas). */
  function boardMadeStraightHigh(board) {
    if (!board || board.length < 5) return null;
    const vals = rankVals(board);
    for (let hi = 14; hi >= 5; hi--) {
      let ok = true;
      for (let k = 0; k < 5; k++) {
        if (!vals.has(hi - k)) { ok = false; break; }
      }
      if (ok) return hi;
    }
    return null;
  }

  /** Board con 4 cartas en ventana de escalera o 5 consecutivas visibles. */
  function isBoardCoordinated(board) {
    if (!board || board.length < 3) return false;
    if (boardMadeStraightHigh(board)) return true;
    const vals = rankVals(board);
    for (let lo = 1; lo <= 10; lo++) {
      const window = [lo, lo + 1, lo + 2, lo + 3, lo + 4];
      if (window.filter((v) => vals.has(v)).length >= 4) return true;
    }
    const tex = Board ? Board.boardTexture(board) : null;
    if (tex && (tex.wet || tex.paired)) return true;
    return false;
  }

  /**
   * Board Texture Shift: el river completa una escalera que no existía en turn.
   * @returns {{ shifted: boolean, invalidatePriorStreet: boolean, riverCompletesStraight: boolean, coordinated: boolean }}
   */
  function computeBoardTextureShift(turnBoard, riverBoard) {
    const turnStraight = boardMadeStraightHigh(turnBoard || []);
    const riverStraight = boardMadeStraightHigh(riverBoard || []);
    const riverCompletesStraight = !!riverStraight && !turnStraight;
    const coordinated = isBoardCoordinated(riverBoard || turnBoard || []);
    return {
      shifted: riverCompletesStraight || (riverBoard && turnBoard && riverBoard.length > turnBoard.length && coordinated),
      invalidatePriorStreet: riverCompletesStraight,
      riverCompletesStraight,
      coordinated
    };
  }

  /** ¿Héroe tiene escalera nut (nadie puede tener escalera superior)? */
  function isNutStraight(heroCards, board) {
    if (!heroCards || board.length < 3) return false;
    const heroScore = C.evaluate(heroCards.concat(board));
    if (heroScore.category !== 4) return false;
    const heroHigh = heroScore.rank[1];
    const deck = C.fullDeck();
    const dead = new Set(heroCards.concat(board));
    for (const c1 of deck) {
      if (dead.has(c1)) continue;
      for (const c2 of deck) {
        if (c2 === c1 || dead.has(c2)) continue;
        const vScore = C.evaluate([c1, c2].concat(board));
        if (vScore.category === 4 && C.compare(vScore, heroScore) > 0) return false;
      }
    }
    return true;
  }

  /**
   * Frecuencias probe cuando héroe tiene nuts de escalera (value betting).
   * Check mínimo; bet 66%+ predominante.
   */
  function nutStraightValueFrequencies(street) {
    const betTotal = street === 'river' ? 0.84 : 0.74;
    const check = 1 - betTotal;
    const split = street === 'river'
      ? { s33: 0.12, s66: 0.48, s100: 0.40 }
      : { s33: 0.18, s66: 0.44, s100: 0.38 };
    return {
      check,
      bet_33: betTotal * split.s33,
      bet_66: betTotal * split.s66,
      bet_100: betTotal * split.s100,
      _meta: { nutValue: true, betTotal }
    };
  }

  /** ¿Debe invalidarse la matriz de la calle anterior? */
  function shouldInvalidatePriorMatrix(turnBoard, riverBoard) {
    const shift = computeBoardTextureShift(turnBoard, riverBoard);
    return shift.invalidatePriorStreet;
  }

  /** River completó escalera del héroe que no existía en turn (texture shift real). */
  function riverStraightValueMode(heroCards, board, priorBoard, street) {
    if (street !== 'river' || !priorBoard || !board || board.length < 5) return null;
    const heroRiver = C.evaluate(heroCards.concat(board));
    const heroTurn = C.evaluate(heroCards.concat(priorBoard));
    if (heroRiver.category !== 4) return null;

    const shift = computeBoardTextureShift(priorBoard, board);
    const turnToRiverStraight = heroTurn.category !== 4 && isBoardCoordinated(board);

    if (shift.invalidatePriorStreet || turnToRiverStraight || isNutStraight(heroCards, board)) {
      return nutStraightValueFrequencies(street);
    }
    return null;
  }

  global.GTOBoardTextureShift = {
    rankVals,
    boardMadeStraightHigh,
    isBoardCoordinated,
    computeBoardTextureShift,
    isNutStraight,
    nutStraightValueFrequencies,
    riverStraightValueMode,
    shouldInvalidatePriorMatrix
  };
})(window);
