/*
 * errors.js — Detección de fugas EV: pot odds, sizing, faroles sin fold equity.
 */
(function (global) {
  'use strict';

  const Block = global.GTOBlockers;
  const EvMath = global.GTOEvMath;

  function detectErrors(input) {
    const errors = [];
    const action = input.chosenAction;
    const pot = input.potBB || 1;
    const toCall = input.toCallBB || 0;
    const betSize = input.betSizeBB || 0;
    const spr = input.spr != null ? input.spr : 10;
    const tier = input.madeHandInfo ? input.madeHandInfo.tier : (input.handRank ? input.handRank.tier : null);
    const freqs = input.strategy || {};
    const equity = input.heroEquity != null ? input.heroEquity : null;
    const potBefore = input.potBeforeBB != null ? input.potBeforeBB : Math.max(pot - toCall, 0.1);

    if (action === 'call' && toCall > 0 && equity != null && EvMath) {
      const be = EvMath.breakEvenEquity(potBefore, toCall);
      const impliedOk = global.GTOEvLoss && global.GTOEvLoss.impliedOddsAllowed
        ? global.GTOEvLoss.impliedOddsAllowed(input, { equity, breakEven: be }) : false;
      if (equity < be - 0.02 && !impliedOk) {
        errors.push({
          type: 'call_sin_odds',
          msg: `Call sin pot odds: equity ${Math.round(equity * 100)}% < break-even ${Math.round(be * 100)}%.`
        });
      }
    }

    if (action === 'fold' && toCall > 0 && equity != null && EvMath) {
      const be = EvMath.breakEvenEquity(potBefore, toCall);
      if (equity > be + 0.05) {
        errors.push({
          type: 'fold_con_equidad',
          msg: `Fold con equity ${Math.round(equity * 100)}% > break-even ${Math.round(be * 100)}%.`
        });
      }
    }

    if (action === 'bet' || action === 'raise' || (action && action.startsWith('bet_'))) {
      if (betSize > pot * 1.5 && spr > 4) errors.push({ type: 'overbet_absurda', msg: 'Overbet desproporcionada para el SPR actual.' });
      if (betSize > pot * 2.5) errors.push({ type: 'overbet_absurda', msg: 'Sizing excesivo respecto al bote.' });
      if (tier === 'air' && (freqs.bet || 0) < 0.15 && (freqs.raise || 0) < 0.15) {
        errors.push({ type: 'bluff_excesivo', msg: 'Farol con frecuencia GTO muy baja en este spot.' });
      }
      if (tier === 'strong' && betSize < pot * 0.2 && (action === 'bet' || action.startsWith('bet_'))) {
        errors.push({ type: 'valor_insuficiente', msg: 'Apuesta pequeña con mano fuerte — pérdida de extracción de valor.' });
      }
      const ideal = input.boardWet ? pot * 0.6 : pot * 0.4;
      if (betSize > 0 && Math.abs(betSize - ideal) > pot * 0.5) {
        errors.push({ type: 'sizing_incoherente', msg: 'Sizing no alineado con la textura del board.' });
      }
      if (tier === 'air' || tier === 'weak') {
        const polarized = input.villainBetRatio >= 0.6 || input.facingNode === 'shove';
        const lowBlockers = Block && input.heroCards && input.board
          ? (Block.computeBlockerScore(input.heroCards, input.board) || 0) < 0.15 : true;
        const lowFE = (input.foldEquity != null ? input.foldEquity : 0.15) < 0.12;
        if (polarized && (lowBlockers || lowFE)) {
          errors.push({
            type: 'bluff_sin_fold_equity',
            msg: 'Farol contra rango polarizado sin fold equity ni blockers relevantes.'
          });
        }
      }
    }

    if (action === 'bet' && input.initiative === 'caller' && !input.inPosition && toCall === 0) {
      errors.push({ type: 'donk_incorrecto', msg: 'Donk bet OOP como pagador — suele ser -EV sin ventaja de nuts.' });
    }

    if (action === 'raise' && toCall > 0 && betSize > 0 && betSize < toCall) {
      errors.push({ type: 'raise_imposible', msg: 'Raise menor que el mínimo legal.' });
    }

    if (action && freqs[action] === 0 && Object.keys(freqs).length > 0) {
      const hasAlt = Object.keys(freqs).some((a) => freqs[a] > 0.05);
      if (hasAlt && (input.availableActions || []).indexOf(action) >= 0) {
        errors.push({ type: 'frecuencia_imposible', msg: 'Acción con frecuencia GTO muy baja en este nodo.' });
      }
    }

    return errors;
  }

  global.GTOErrors = { detectErrors };
})(window);
