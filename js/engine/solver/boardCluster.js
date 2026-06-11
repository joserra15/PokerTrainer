/*
 * boardCluster.js — Clasificación automática de texturas de board.
 */
(function (global) {
  'use strict';

  const C = global.Cards;
  const Cache = global.GTOCache;

  const CATEGORIES = [
    'RAINBOW_DRY', 'RAINBOW_DYNAMIC', 'TWO_TONE_DRY', 'TWO_TONE_DYNAMIC',
    'MONOTONE', 'PAIRED_LOW', 'PAIRED_HIGH',
    'LOW_CONNECTED', 'MIDDLE_CONNECTED', 'HIGH_CONNECTED',
    'ACE_HIGH', 'KING_HIGH', 'LOW_BOARD'
  ];

  function rankVal(card) { return C.RANK_VALUE[card[0]]; }

  function classifyBoard(board) {
    if (!board || !board.length) return 'LOW_BOARD';
    const key = board.join('');
    return Cache.memo('board', key, () => classifyBoardInner(board));
  }

  function classifyBoardInner(board) {
    const vals = board.map(rankVal).sort((a, b) => b - a);
    const suits = {};
    board.forEach((c) => { suits[c[1]] = (suits[c[1]] || 0) + 1; });
    const maxSuit = Math.max(...Object.values(suits));
    const uniqueVals = new Set(vals);
    const paired = uniqueVals.size < vals.length;
    const span = vals[0] - vals[vals.length - 1];
    const connected = span <= 4 && uniqueVals.size >= 3;
    const highCard = vals[0];

    if (maxSuit >= 3) return 'MONOTONE';

    if (paired) {
      const pairRank = vals.find((v, i, a) => a.indexOf(v) !== i);
      return pairRank >= 10 ? 'PAIRED_HIGH' : 'PAIRED_LOW';
    }

    if (highCard === 14) return 'ACE_HIGH';
    if (highCard === 13) return 'KING_HIGH';
    if (highCard <= 8) return 'LOW_BOARD';

    if (connected) {
      if (vals[0] >= 12) return 'HIGH_CONNECTED';
      if (vals[0] >= 9) return 'MIDDLE_CONNECTED';
      return 'LOW_CONNECTED';
    }

    const twoTone = maxSuit === 2;
    const dynamic = connected || twoTone;
    if (twoTone) return dynamic ? 'TWO_TONE_DYNAMIC' : 'TWO_TONE_DRY';
    return dynamic ? 'RAINBOW_DYNAMIC' : 'RAINBOW_DRY';
  }

  /** Textura legacy para compatibilidad (wet/paired). */
  function boardTexture(board) {
    const cat = classifyBoard(board);
    const wet = ['MONOTONE', 'TWO_TONE_DYNAMIC', 'TWO_TONE_DRY', 'HIGH_CONNECTED', 'MIDDLE_CONNECTED', 'LOW_CONNECTED', 'RAINBOW_DYNAMIC'].indexOf(cat) >= 0;
    const vals = board.map(rankVal);
    const paired = new Set(vals).size < vals.length;
    const suits = {};
    board.forEach((c) => { suits[c[1]] = (suits[c[1]] || 0) + 1; });
    return { wet, paired, maxSuit: Math.max(...Object.values(suits)), high: Math.max(...vals), category: cat };
  }

  global.GTOBoardCluster = { CATEGORIES, classifyBoard, boardTexture };
})(window);
