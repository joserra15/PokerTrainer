/*
 * range-matrix.js — Matrices 13×13: GTO hero (preflop) y rango villano (postflop).
 */
(function (global) {
  'use strict';

  const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  const RAISE_KEYS = ['raise', 'bet', 'bet_33', 'bet_66', 'bet_100'];
  const CALL_KEYS = ['call', 'check'];
  const FOLD_KEYS = ['fold'];
  const CHUNK_SIZE = 8;
  const D = function () { return global.GTORangesData || {}; };

  const EXPLORER_SPOTS = {
    RFI: {
      label: 'RFI',
      heroPositions: ['UTG', 'HJ', 'CO', 'BTN', 'SB'],
      villainPositions: [],
      build: function (heroPos) {
        return {
          spotKind: 'RFI',
          position: heroPos,
          stackDepth: 100,
          street: 'preflop',
          board: [],
          potBB: 1.5,
          toCallBB: 0,
          initiative: 'none',
          availableActions: ['fold', 'raise']
        };
      },
      title: function (heroPos) { return 'RFI · ' + heroPos; }
    },
    '3bet': {
      label: '3-Bet',
      heroPositions: ['BB', 'SB', 'BTN', 'CO', 'HJ'],
      villainPositions: ['UTG', 'HJ', 'CO', 'BTN'],
      build: function (heroPos, villainPos) {
        const key = heroPos + '_vs_' + villainPos;
        const data = D().VS_RFI || {};
        if (!data[key]) return null;
        return {
          spotKind: 'vsRFI',
          position: heroPos,
          vsPosition: villainPos,
          vsRfiKey: key,
          stackDepth: 100,
          street: 'preflop',
          board: [],
          potBB: 5,
          toCallBB: 2.5,
          initiative: 'caller',
          availableActions: ['fold', 'call', 'raise']
        };
      },
      title: function (heroPos, villainPos) { return heroPos + ' vs open ' + villainPos; }
    },
    '4bet': {
      label: '4-Bet',
      heroPositions: ['UTG', 'HJ', 'CO', 'BTN', 'SB'],
      villainPositions: [],
      build: function (heroPos) {
        return {
          spotKind: 'face3bet',
          position: heroPos,
          stackDepth: 100,
          street: 'preflop',
          board: [],
          potBB: 22,
          toCallBB: 7,
          initiative: 'aggressor',
          availableActions: ['fold', 'call', 'raise']
        };
      },
      title: function (heroPos) { return heroPos + ' afronta 3-bet'; }
    },
    squeeze: {
      label: 'Squeeze',
      heroPositions: ['BB', 'SB', 'BTN'],
      villainPositions: ['UTG', 'HJ', 'CO'],
      villainLabel: 'Opener',
      build: function (heroPos, villainPos) {
        return {
          spotKind: 'squeeze',
          position: heroPos,
          vsPosition: villainPos,
          stackDepth: 100,
          street: 'preflop',
          board: [],
          potBB: 8,
          toCallBB: 2.5,
          initiative: 'caller',
          availableActions: ['fold', 'call', 'raise']
        };
      },
      title: function (heroPos, villainPos) { return heroPos + ' squeeze vs ' + villainPos; }
    }
  };

  const SQUEEZE_COMBOS = [
    { heroPos: 'BB', openerPos: 'CO' },
    { heroPos: 'BB', openerPos: 'HJ' },
    { heroPos: 'SB', openerPos: 'UTG' },
    { heroPos: 'BTN', openerPos: 'UTG' },
    { heroPos: 'BTN', openerPos: 'HJ' }
  ];

  function cellLabel(row, col) {
    const r1 = RANKS[row];
    const r2 = RANKS[col];
    if (row === col) return r1 + r2;
    if (row < col) return r1 + r2 + 's';
    return r2 + r1 + 'o';
  }

  function pickRepresentativeCards(code, dead) {
    const Eq = global.GTO && global.GTO.Equity;
    if (Eq && Eq.concreteCombos) {
      const combos = Eq.concreteCombos(code, dead || []);
      if (combos.length) return combos[0];
    }
    return null;
  }

  function expandRangeSet(rangeStr) {
    const N = global.GTORangesNotation;
    if (!N || !rangeStr) return new Set();
    return N.toSet(rangeStr);
  }

  function collapseStrategy(freqs) {
    let raise = 0;
    let call = 0;
    let fold = 0;
    if (!freqs) return { raise: 0, call: 0, fold: 1 };
    Object.keys(freqs).forEach(function (k) {
      const v = freqs[k] || 0;
      if (RAISE_KEYS.indexOf(k) >= 0) raise += v;
      else if (CALL_KEYS.indexOf(k) >= 0) call += v;
      else if (FOLD_KEYS.indexOf(k) >= 0) fold += v;
    });
    const sum = raise + call + fold;
    if (sum > 0 && Math.abs(sum - 1) > 0.02) {
      raise /= sum;
      call /= sum;
      fold /= sum;
    }
    return { raise, call, fold };
  }

  function dominantAction(collapsed) {
    const r = collapsed.raise;
    const c = collapsed.call;
    const f = collapsed.fold;
    if (r >= c && r >= f) return 'raise';
    if (c >= f) return 'call';
    return 'fold';
  }

  function boardSliceForStreet(board, street) {
    const n = { preflop: 0, flop: 3, turn: 4, river: 5 }[street] || 0;
    return (board || []).slice(0, n);
  }

  function heroCardsFromHand(hand) {
    if (hand.heroCards && hand.heroCards.length === 2) return hand.heroCards;
    if (hand.hero && hand.hero.cards && hand.hero.cards.length === 2) return hand.hero.cards;
    return [];
  }

  function buildBaseInput(hand, decision, source) {
    if (decision.street !== 'preflop') return null;
    if (source === 'session' && global.Importer && global.Importer.buildEvalInputFromDecision) {
      const input = global.Importer.buildEvalInputFromDecision(hand, decision);
      delete input.chosenAction;
      return input;
    }
    if (global.Engine && global.Engine.buildMatrixInput) {
      return global.Engine.buildMatrixInput(hand, decision);
    }
    return null;
  }

  function strategyForCombo(baseInput, handCode, heroCards) {
    const input = Object.assign({}, baseInput, {
      handCode: handCode,
      heroCards: heroCards,
      heroEquity: undefined,
      madeHandInfo: undefined,
      handRank: undefined
    });
    if (input.street !== 'preflop') input._equityIters = 120;
    if (!global.GTO || !global.GTO.getStrategy) return { fold: 1 };
    return global.GTO.getStrategy(input);
  }

  function computeGtoMatrixAsync(baseInput, onProgress) {
    return new Promise(function (resolve, reject) {
      if (!baseInput || baseInput.street !== 'preflop') {
        reject(new Error('Matriz GTO solo disponible en preflop'));
        return;
      }
      const cells = [];
      let row = 0;
      let col = 0;
      let done = 0;
      const total = 169;

      function tick() {
        try {
          let n = 0;
          while (n < CHUNK_SIZE && row < 13) {
            if (!cells[row]) cells[row] = [];
            const label = cellLabel(row, col);
            const heroCards = pickRepresentativeCards(label, []);
            let action = 'fold';
            let freqs = { raise: 0, call: 0, fold: 1 };
            if (heroCards) {
              const raw = strategyForCombo(baseInput, label, heroCards);
              freqs = collapseStrategy(raw);
              action = dominantAction(freqs);
            }
            cells[row][col] = { label, action, freqs };
            done++;
            col++;
            if (col >= 13) { col = 0; row++; }
            n++;
          }
          if (onProgress) onProgress(done, total);
          if (row >= 13) resolve({ ranks: RANKS, cells, mode: 'gto' });
          else setTimeout(tick, 0);
        } catch (e) {
          reject(e);
        }
      }
      tick();
    });
  }

  function computeVillainRangeMatrix(rangeStr) {
    const inRange = expandRangeSet(rangeStr || D().BROAD_CONTINUE);
    const cells = [];
    for (let row = 0; row < 13; row++) {
      const rowCells = [];
      for (let col = 0; col < 13; col++) {
        const label = cellLabel(row, col);
        rowCells.push({
          label,
          action: inRange.has(label) ? 'inrange' : 'out',
          inRange: inRange.has(label)
        });
      }
      cells.push(rowCells);
    }
    return { ranks: RANKS, cells, mode: 'villain', rangeStr: rangeStr || '' };
  }

  function getVillainRangeForDecision(hand, decision, source) {
    if (decision.villainRange) return decision.villainRange;

    const VT = global.GTOVillainTracking;
    const board = decision.board && decision.board.length
      ? decision.board
      : boardSliceForStreet(hand.board || [], decision.street);

    if (source === 'session' && hand.streets && hand.hero && VT && VT.estimateRangeFromActions) {
      const acts = hand.streets[decision.street] || [];
      const idx = decision.actionSequenceId != null ? decision.actionSequenceId : acts.length;
      const bb = hand.bb || 0.05;
      const base = D().BROAD_CONTINUE;
      return VT.estimateRangeFromActions(
        acts.slice(0, idx),
        hand.hero,
        bb,
        decision.potBeforeBB || decision.potBB || 1,
        board,
        base
      );
    }

    if (source === 'trainer' && hand.villain && VT && VT.estimateActiveRange) {
      const baseRange = hand.villain.rangeStr || D().BROAD_CONTINUE;
      const facingBet = (decision.toCallBB || 0) > 0;
      const tags = hand.villainRangeTracker ? hand.villainRangeTracker.tags : [];
      return VT.estimateActiveRange({
        baseRange,
        street: decision.street,
        lastAction: decision.villainLastAction || (facingBet ? 'bet' : 'check'),
        betBB: facingBet ? decision.toCallBB : 0,
        potBeforeBB: decision.potBeforeBB || Math.max((decision.potBB || 1) - (decision.toCallBB || 0), 0.1),
        board,
        tags
      });
    }

    return D().BROAD_CONTINUE;
  }

  function buildExplorerInput(spotType, heroPos, villainPos) {
    const spot = EXPLORER_SPOTS[spotType];
    if (!spot) return null;
    if (spot.villainPositions && spot.villainPositions.length && !villainPos) return null;
    return spot.build(heroPos, villainPos);
  }

  function explorerTitle(spotType, heroPos, villainPos) {
    const spot = EXPLORER_SPOTS[spotType];
    if (!spot) return '';
    return spot.title(heroPos, villainPos);
  }

  function validVsRfiPairs() {
    const keys = D().VS_RFI_KEYS || Object.keys(D().VS_RFI || {});
    const pairs = {};
    keys.forEach(function (k) {
      const m = k.match(/^(\w+)_vs_(\w+)$/);
      if (!m) return;
      if (!pairs[m[1]]) pairs[m[1]] = [];
      pairs[m[1]].push(m[2]);
    });
    return pairs;
  }

  function findDecisionIndex(hand, street) {
    if (!hand || !hand.decisions) return -1;
    for (let i = 0; i < hand.decisions.length; i++) {
      if (hand.decisions[i].street === street) return i;
    }
    return -1;
  }

  function shortRange(str) {
    if (!str) return '—';
    if (str.length > 72) return str.slice(0, 69) + '…';
    return str;
  }

  global.PTRangeMatrix = {
    RANKS,
    EXPLORER_SPOTS,
    SQUEEZE_COMBOS,
    cellLabel,
    collapseStrategy,
    dominantAction,
    buildBaseInput,
    buildExplorerInput,
    explorerTitle,
    validVsRfiPairs,
    computeGtoMatrixAsync,
    computeVillainRangeMatrix,
    getVillainRangeForDecision,
    findDecisionIndex,
    heroCardsFromHand,
    boardSliceForStreet,
    shortRange,
    expandRangeSet
  };
})(window);
