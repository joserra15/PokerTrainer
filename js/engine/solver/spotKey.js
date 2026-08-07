/*
 * spotKey.js — Abstracción de spot para lookup tables.
 */
(function (global) {
  'use strict';

  const Board = global.GTOBoardCluster;

  function bucketSpr(spr) {
    if (spr == null || spr <= 0) return 'low';
    if (spr < 4) return 'low';
    if (spr < 8) return 'mid';
    if (spr < 15) return 'high';
    return 'deep';
  }

  function bucketStack(depth) {
    const d = depth || 100;
    if (d <= 40) return 40;
    if (d <= 60) return 60;
    if (d <= 100) return 100;
    return 150;
  }

  /**
   * Tipo de lead del agresor preflop: c-bet solo en flop;
   * turn/river son barrels si ya hubo lead previo; si no, delayed c-bet.
   * @param {string} street
   * @param {boolean} [priorAggressorBet] true si el héroe ya bet/raise en calle previa
   */
  function aggressorLeadType(street, priorAggressorBet) {
    if (street === 'turn') {
      return priorAggressorBet === false ? 'delayed_cbet' : 'barrel2';
    }
    if (street === 'river') {
      return priorAggressorBet === false ? 'delayed_cbet' : 'barrel3';
    }
    return 'cbet';
  }

  /** Etiqueta UI en español para lead del agresor. */
  function aggressorLeadLabel(street, priorAggressorBet) {
    if (street === 'turn' || street === 'river') {
      if (priorAggressorBet === false) return 'delayed c-bet';
      return street === 'turn' ? 'segundo barrel' : 'tercer barrel';
    }
    return 'c-bet';
  }

  function leadTypeLabel(leadType) {
    if (leadType === 'cbet') return 'c-bet';
    if (leadType === 'delayed_cbet') return 'delayed c-bet';
    if (leadType === 'barrel2') return 'segundo barrel';
    if (leadType === 'barrel3') return 'tercer barrel';
    if (leadType === 'probe') return 'probe';
    if (leadType === 'donk') return 'donk';
    return '';
  }

  /** Construye clave de spot sin redundancia. */
  function buildSpotKey(input) {
    const board = input.board || [];
    const potBB = input.potBB || 1;
    const effStack = input.stackDepth || input.effStack || 100;
    const spr = input.spr != null ? input.spr : (potBB > 0 ? effStack / potBB : effStack);
    const rc = input.rangeContext || {};
    const gameType = rc.gameType || input.gameType || 'cash6';
    const stackLabel = rc.stackDepth || input.stackDepthLabel
      || (global.GTORangesRegistry ? global.GTORangesRegistry.stackLabelFromBB(effStack) : 'standard');
    const street = input.street || 'preflop';

    return {
      position: input.position || '?',
      vsPosition: input.vsPosition || null,
      stackDepth: bucketStack(effStack),
      stackLabel: stackLabel,
      gameType: gameType,
      street: street,
      boardType: board.length >= 3 ? Board.classifyBoard(board) : 'PREFLOP',
      spr: bucketSpr(spr),
      initiative: input.initiative || 'none',
      spotKind: input.spotKind || 'postflop',
      facing: (input.toCallBB || 0) > 0 ? 'bet' : 'none',
      leadType: (function () {
        if ((input.toCallBB || 0) > 0) return 'none';
        if (input.initiative === 'aggressor') {
          return aggressorLeadType(street, input.priorAggressorBet);
        }
        if (input.inPosition) return 'probe';
        return 'donk';
      })(),
      facingNode: (function () {
        const RS = global.GTORiverShoveNode;
        if (!RS || street !== 'river' || !(input.toCallBB > 0)) return 'none';
        const potBefore = Math.max((input.potBB || 1) - (input.toCallBB || 0), 0.1);
        return RS.classifyFacingNode(input.toCallBB, potBefore, street, input.villainLastAction);
      })(),
      inPosition: !!input.inPosition
    };
  }

  function spotKeyString(key) {
    return [
      key.spotKind, key.position, key.vsPosition || '-',
      key.gameType || 'cash6', key.stackLabel || key.stackDepth || 100,
      key.street, key.boardType, key.spr, key.initiative, key.facing,
      key.facingNode || '-',
      key.leadType || '-',
      key.inPosition ? 'IP' : 'OOP'
    ].join('|');
  }

  global.GTOSpotKey = {
    buildSpotKey, spotKeyString, bucketSpr, bucketStack,
    aggressorLeadType, aggressorLeadLabel, leadTypeLabel
  };
})(window);
