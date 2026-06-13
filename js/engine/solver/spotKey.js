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

  /** Construye clave de spot sin redundancia. */
  function buildSpotKey(input) {
    const board = input.board || [];
    const potBB = input.potBB || 1;
    const effStack = input.stackDepth || input.effStack || 100;
    const spr = input.spr != null ? input.spr : (potBB > 0 ? effStack / potBB : effStack);

    return {
      position: input.position || '?',
      vsPosition: input.vsPosition || null,
      stackDepth: bucketStack(effStack),
      street: input.street || 'preflop',
      boardType: board.length >= 3 ? Board.classifyBoard(board) : 'PREFLOP',
      spr: bucketSpr(spr),
      initiative: input.initiative || 'none',
      spotKind: input.spotKind || 'postflop',
      facing: (input.toCallBB || 0) > 0 ? 'bet' : 'none',
      facingNode: (function () {
        const RS = global.GTORiverShoveNode;
        if (!RS || (input.street || 'preflop') !== 'river' || !(input.toCallBB > 0)) return 'none';
        const potBefore = Math.max((input.potBB || 1) - (input.toCallBB || 0), 0.1);
        return RS.classifyFacingNode(input.toCallBB, potBefore, input.street, input.villainLastAction);
      })(),
      inPosition: !!input.inPosition
    };
  }

  function spotKeyString(key) {
    return [
      key.spotKind, key.position, key.vsPosition || '-',
      key.street, key.boardType, key.spr, key.initiative, key.facing,
      key.facingNode || '-',
      key.inPosition ? 'IP' : 'OOP'
    ].join('|');
  }

  global.GTOSpotKey = { buildSpotKey, spotKeyString, bucketSpr, bucketStack };
})(window);
