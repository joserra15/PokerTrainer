/*
 * range-matrix.js — Matriz 13×13 de estrategia GTO por spot (raise / call / fold).
 */
(function (global) {
  'use strict';

  const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  const RAISE_KEYS = ['raise', 'bet', 'bet_33', 'bet_66', 'bet_100'];
  const CALL_KEYS = ['call', 'check'];
  const FOLD_KEYS = ['fold'];
  const CHUNK_SIZE = 6;

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

  function inferOptions(decision) {
    if (decision.options && decision.options.length) return decision.options.slice();
    const gto = decision.gto || {};
    const order = ['fold', 'check', 'call', 'bet_33', 'bet_66', 'bet_100', 'bet', 'raise'];
    return order.filter(function (a) { return gto[a] != null; });
  }

  function heroCardsFromHand(hand) {
    if (hand.heroCards && hand.heroCards.length === 2) return hand.heroCards;
    if (hand.hero && hand.hero.cards && hand.hero.cards.length === 2) return hand.hero.cards;
    return [];
  }

  function buildBaseInput(hand, decision, source) {
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

  function computeMatrix(baseInput) {
    const dead = (baseInput.board || []).slice();
    const cells = [];
    for (let row = 0; row < 13; row++) {
      const rowCells = [];
      for (let col = 0; col < 13; col++) {
        const label = cellLabel(row, col);
        const heroCards = pickRepresentativeCards(label, dead);
        let action = 'fold';
        let freqs = { raise: 0, call: 0, fold: 1 };
        if (heroCards) {
          const raw = strategyForCombo(baseInput, label, heroCards);
          freqs = collapseStrategy(raw);
          action = dominantAction(freqs);
        }
        rowCells.push({ label, action, freqs });
      }
      cells.push(rowCells);
    }
    return { ranks: RANKS, cells };
  }

  function computeMatrixAsync(baseInput, onProgress) {
    return new Promise(function (resolve, reject) {
      if (!baseInput) {
        reject(new Error('Spot no disponible para matriz'));
        return;
      }
      const dead = (baseInput.board || []).slice();
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
            const heroCards = pickRepresentativeCards(label, dead);
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
          if (row >= 13) resolve({ ranks: RANKS, cells });
          else setTimeout(tick, 0);
        } catch (e) {
          reject(e);
        }
      }
      tick();
    });
  }

  function findDecisionIndex(hand, street) {
    if (!hand || !hand.decisions) return -1;
    for (let i = 0; i < hand.decisions.length; i++) {
      if (hand.decisions[i].street === street) return i;
    }
    return -1;
  }

  global.PTRangeMatrix = {
    RANKS,
    cellLabel,
    collapseStrategy,
    dominantAction,
    buildBaseInput,
    computeMatrix,
    computeMatrixAsync,
    findDecisionIndex,
    heroCardsFromHand,
    boardSliceForStreet,
    inferOptions
  };
})(window);
