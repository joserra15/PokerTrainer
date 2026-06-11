/*
 * errors.js — Detección automática de errores estratégicos.
 */
(function (global) {
  'use strict';

  function detectErrors(input) {
    const errors = [];
    const action = input.chosenAction;
    const pot = input.potBB || 1;
    const toCall = input.toCallBB || 0;
    const betSize = input.betSizeBB || 0;
    const spr = input.spr != null ? input.spr : 10;
    const tier = input.madeHandInfo ? input.madeHandInfo.tier : null;
    const freqs = input.strategy || {};

    if (action === 'bet' || action === 'raise') {
      if (betSize > pot * 1.5 && spr > 4) errors.push({ type: 'overbet_absurda', msg: 'Overbet desproporcionada para el SPR actual.' });
      if (betSize > pot * 2.5) errors.push({ type: 'overbet_absurda', msg: 'Sizing excesivo respecto al bote.' });
      if (tier === 'air' && (freqs.bet || 0) < 0.15 && (freqs.raise || 0) < 0.15) errors.push({ type: 'bluff_excesivo', msg: 'Farol con frecuencia GTO muy baja en este spot.' });
      if (tier === 'strong' && betSize < pot * 0.2 && action === 'bet') errors.push({ type: 'valor_insuficiente', msg: 'Apuesta pequeña con mano fuerte — dejas valor en la mesa.' });
      const ideal = input.boardWet ? pot * 0.6 : pot * 0.4;
      if (betSize > 0 && Math.abs(betSize - ideal) > pot * 0.5) errors.push({ type: 'sizing_incoherente', msg: 'Sizing no alineado con la textura del board.' });
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
