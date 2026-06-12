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

  /** Polarización del rango de apuesta 0 (merge) .. 1 (muy polar). */
  function betPolarization(input, band) {
    const adv = computeRangeAdvantage(input);
    let pol = 0.35;
    if (band === 'nuts' || band === 'air') pol += 0.35;
    if (band === 'value') pol += 0.2;
    if (band === 'merge') pol -= 0.15;
    if (adv > 0.2) pol += 0.12;
    if (adv < -0.15) pol -= 0.1;
    if (input.street === 'river') pol += 0.1;
    return Math.max(0, Math.min(1, pol));
  }

  global.GTORangeAdvantage = { computeRangeAdvantage, betPolarization };
})(window);
