/*
 * rangeAdvantage.js — Ventaja de nuts/rango por textura, initiative e IP (Fase 2).
 */
(function (global) {
  'use strict';

  const Board = global.GTOBoardCluster;

  /**
   * Ventaja de rango -1 (villano) .. +1 (héroe).
   */
  function computeRangeAdvantage(input) {
    const board = input.board || [];
    const initiative = input.initiative || 'caller';
    const inPosition = input.inPosition !== false;
    const street = input.street || 'flop';
    let adv = 0;

    if (board.length < 3 || !Board) {
      return inPosition ? 0.15 : -0.1;
    }

    const tex = Board.boardTexture(board);

    if (initiative === 'aggressor') adv += 0.18;
    else adv -= 0.08;

    if (inPosition) adv += 0.12;
    else adv -= 0.14;

    if (tex.category === 'HIGH_BOARD' || tex.category === 'ACE_HIGH') {
      if (initiative === 'aggressor') adv += 0.1;
    }

    if (tex.category === 'MONOTONE') {
      if (initiative === 'caller') adv -= 0.12;
      else adv += 0.05;
    }

    if (tex.paired) {
      if (initiative === 'aggressor' && inPosition) adv += 0.06;
      else if (!inPosition) adv -= 0.08;
    }

    if (tex.category === 'LOW_BOARD' || tex.category === 'TWO_TONE_DYNAMIC') {
      if (initiative === 'aggressor' && inPosition) adv += 0.08;
    }

    if (street === 'river') adv *= 1.15;

    return Math.max(-1, Math.min(1, adv));
  }

  /**
   * Ventaja de nueces -1..+1 (distinta de range advantage).
   * Boards monótonos / paired / broadway cambian quién tiene más nuts posibles.
   */
  function computeNutAdvantage(input) {
    const board = input.board || [];
    const initiative = input.initiative || 'caller';
    const inPosition = input.inPosition !== false;
    let nut = 0;

    if (board.length < 3 || !Board) {
      return initiative === 'aggressor' ? 0.1 : -0.05;
    }

    const tex = Board.boardTexture(board);

    // Agresor preflop suele tener más AA/KK/AQ+ → más nuts en A/K-high
    if (initiative === 'aggressor') nut += 0.12;
    else nut -= 0.06;

    if (tex.category === 'HIGH_BOARD' || tex.category === 'ACE_HIGH' || tex.category === 'KING_HIGH') {
      if (initiative === 'aggressor') nut += 0.14;
      else nut -= 0.08;
    }

    if (tex.category === 'MONOTONE') {
      // Caller BB tiene más suited connectors / broadways suited → a veces más nut flush
      if (initiative === 'caller') nut += 0.08;
      else nut -= 0.05;
    }

    if (tex.paired) {
      // Sets/fulls: agresor con overpairs/TT+ suele tener más boats en paired high
      if (initiative === 'aggressor' && inPosition) nut += 0.1;
      else if (!inPosition) nut -= 0.06;
    }

    if (tex.category === 'LOW_BOARD' || tex.category === 'MIDDLE_CONNECTED' || tex.category === 'TWO_TONE_DYNAMIC') {
      // Caller conecta más straights/two-pair en low connected
      if (initiative === 'caller') nut += 0.1;
      else nut -= 0.08;
    }

    if (input.street === 'river') nut *= 1.12;

    return Math.max(-1, Math.min(1, nut));
  }

  /** Polarización del rango de apuesta 0 (merge) .. 1 (muy polar). */
  function betPolarization(input, band) {
    const adv = computeRangeAdvantage(input);
    const nut = computeNutAdvantage(input);
    let pol = 0.35;
    if (band === 'nuts' || band === 'air') pol += 0.35;
    if (band === 'value') pol += 0.2;
    if (band === 'merge') pol -= 0.15;
    if (adv > 0.2) pol += 0.12;
    if (adv < -0.15) pol -= 0.1;
    if (nut > 0.15) pol += 0.08;
    if (nut < -0.1) pol -= 0.06;
    if (input.street === 'river') pol += 0.1;
    if (input.spr != null && input.spr <= 3.5) pol += 0.12;
    if (input.spr != null && input.spr >= 12) pol -= 0.08;
    if (input.potType === '3bp' || input.potType === '4bp') pol += 0.1;
    return Math.max(0, Math.min(1, pol));
  }

  global.GTORangeAdvantage = {
    computeRangeAdvantage: computeRangeAdvantage,
    computeNutAdvantage: computeNutAdvantage,
    betPolarization: betPolarization
  };
})(window);
