/*
 * explanations/rules.js — Explicaciones concretas por acción (no genéricas repetidas).
 */
(function (global) {
  'use strict';

  const ACTION_NAMES = {
    fold: 'fold', check: 'check', call: 'call', bet: 'apostar', raise: 'subir',
    bet_33: 'apostar pequeño (33%)', bet_66: 'apostar medio (66%)', bet_100: 'apostar pot'
  };

  function pct(x) { return Math.round((x || 0) * 100); }

  function handDesc(input) {
    const info = input.madeHandInfo;
    if (!info) return input.handCode || 'tu mano';
    return info.ev ? info.ev.name : (input.handCode || 'tu mano');
  }

  function boardDesc(input) {
    const b = input.board || [];
    if (!b.length) return '';
    return b.join(' ');
  }

  function spotContext(input, spotKey) {
    const street = spotKey.street || input.street || 'preflop';
    const pot = input.potBB != null ? `${input.potBB}bb` : '';
    const facing = (input.toCallBB || 0) > 0 ? `afrontando ${input.toCallBB}bb` : 'sin apuesta previa';
    const pos = input.inPosition ? 'en posición' : 'fuera de posición';
    const role = spotKey.initiative === 'aggressor' ? 'agresor preflop'
      : spotKey.initiative === 'none' ? 'primero en hablar' : 'pagador preflop';
    const lead = spotKey.leadType === 'cbet' ? ' · c-bet'
      : spotKey.leadType === 'probe' ? ' · probe'
      : spotKey.leadType === 'donk' ? ' · donk' : '';
    return `${cap(street)} · bote ${pot} · ${role}${lead} · ${pos} · ${facing}.`;
  }

  function cap(s) { return (s || '').charAt(0).toUpperCase() + (s || '').slice(1); }

  function preflopExplain(input, evaluation, strategy) {
    const code = input.handCode || '??';
    const chosen = evaluation.chosenAction;
    const best = evaluation.best;
    const chPct = pct(strategy[chosen]);
    const bestPct = pct(strategy[best]);

    if (evaluation.evLoss <= 0.01 && (strategy[chosen] || 0) >= 0.005) {
      return `${spotContext(input, { street: 'preflop', initiative: input.initiative || 'caller' })} ${ACTION_NAMES[chosen] || chosen} está en la estrategia mixta GTO (${chPct}%) con el mismo EV que el resto de líneas válidas.`;
    }

    if (input.spotKind === 'RFI') {
      if (evaluation.class === 'optima') {
        return `${spotContext(input, { street: 'preflop', initiative: 'none' })} Con ${code}, abrir encaja en tu rango de apertura (${chPct}% GTO).`;
      }
      if (chosen === 'fold') {
        return `${spotContext(input, { street: 'preflop' })} ${code} está fuera del rango de open desde ${input.position}. Mejor fold (${bestPct}%).`;
      }
      return `${spotContext(input, { street: 'preflop' })} ${code} no debe abrirse siempre desde ${input.position}. La línea principal es ${ACTION_NAMES[best] || best} (${bestPct}%).`;
    }

    if (chosen === 'raise' && evaluation.class !== 'optima') {
      return `${spotContext(input, { street: 'preflop' })} ${code} es demasiado débil para 3-bet aquí. Prefiere ${ACTION_NAMES[best] || best} (${bestPct}%).`;
    }
    if (chosen === 'call' && evaluation.class === 'error') {
      return `${spotContext(input, { street: 'preflop' })} ${code} no tiene suficiente equity/implied odds para pagar ${input.toCallBB}bb. Fold es la línea (${bestPct}%).`;
    }
    if (chosen === 'fold' && evaluation.class === 'error') {
      return `${spotContext(input, { street: 'preflop' })} ${code} tiene suficiente valor para ${ACTION_NAMES[best] || best} (${bestPct}%), no para fold.`;
    }
    return `${spotContext(input, { street: 'preflop' })} Con ${code}, ${ACTION_NAMES[chosen] || chosen} (${chPct}%) vs mejor ${ACTION_NAMES[best] || best} (${bestPct}%).`;
  }

  function postflopExplain(input, spotKey, evaluation, strategy) {
    const chosen = evaluation.chosenAction;
    const best = evaluation.best;
    const chPct = pct(strategy[chosen]);
    const bestPct = pct(strategy[best]);
    const hand = handDesc(input);
    const board = boardDesc(input);
    const ctx = spotContext(input, spotKey);
    const tier = input.madeHandInfo ? input.madeHandInfo.tier : 'medium';
    const street = spotKey.street || input.street || 'flop';
    const facing = (input.toCallBB || 0) > 0;

    if (evaluation.evLoss <= 0.01 && (strategy[chosen] || 0) >= 0.005) {
      return `${ctx} ${ACTION_NAMES[chosen] || chosen} (${chPct}%) forma parte de la mezcla GTO: mismo EV que ${ACTION_NAMES[best] || best} u otras acciones con frecuencia > 0%.`;
    }

    if (evaluation.class === 'optima') {
      if (facing) {
        return `${ctx} Tienes ${hand} en [${board}]. ${cap(ACTION_NAMES[chosen] || chosen)} es la línea GTO principal (${chPct}%).`;
      }
      if (chosen === 'check') {
        const cbetHint = spotKey.leadType === 'cbet' && street === 'flop'
          ? ' En flop como agresor, el check back deja EV de c-bet sobre la mesa.'
          : '';
        return `${ctx} Con ${hand} (${tier}), check controla el bote (${chPct}% GTO).${cbetHint}`;
      }
      const betLabel = spotKey.leadType === 'cbet' ? 'c-bet' : (ACTION_NAMES[chosen] || chosen);
      return `${ctx} ${hand} en [${board}] quiere ${betLabel} (${chPct}%) por valor/protección/fold equity en este board ${spotKey.boardType}.`;
    }

    if (!facing && chosen === 'check' && (strategy.check || 0) >= 0.5) {
      return `${ctx} Check es correcto con ${hand}. No hay fold posible sin agresión — la alternativa sería ${ACTION_NAMES[best] || best} (${bestPct}%).`;
    }

    if (!facing && chosen === 'check') {
      return `${ctx} Con ${hand} en board ${spotKey.boardType}, estás dejando valor: ${ACTION_NAMES[best] || best} (${bestPct}%) captura más EV.`;
    }

    if (!facing && chosen.startsWith && chosen.startsWith('bet')) {
      return `${ctx} ${hand} no necesita este sizing en ${spotKey.boardType}. Mejor ${ACTION_NAMES[best] || best} (${bestPct}%) o check (${pct(strategy.check)}%).`;
    }

    if (facing && chosen === 'fold' && tier === 'strong') {
      return `${ctx} Fold con ${hand} es muy costoso. Tienes equity para ${ACTION_NAMES[best] || best} (${bestPct}%).`;
    }

    if (facing && chosen === 'call' && tier === 'air') {
      return `${ctx} Pagas ${input.toCallBB}bb con ${hand} sin equity suficiente. Fold (${pct(strategy.fold)}%) o raise selectivo.`;
    }

    if (facing && chosen === 'raise' && tier === 'medium') {
      return `${ctx} Raise con ${hand} es agresivo; call (${pct(strategy.call)}%) realiza mejor equity aquí.`;
    }

    return `${ctx} ${hand} en [${board}]: elegiste ${ACTION_NAMES[chosen] || chosen} (${chPct}%), GTO prefiere ${ACTION_NAMES[best] || best} (${bestPct}%). EV loss ${evaluation.evLoss}bb (${evaluation.evLossTier}).`;
  }

  function generate(input, spotKey, strategy, evaluation) {
    if (!evaluation || !evaluation.chosenAction) {
      return spotContext(input, spotKey);
    }
    if ((input.street || spotKey.street) === 'preflop' || ['RFI', 'vsRFI', 'squeeze', 'isoLimp', 'face3bet', 'face4bet', 'cold3bet', 'cold4bet', 'bbVsSbLimp', 'sbLimp'].indexOf(input.spotKind) >= 0) {
      return preflopExplain(input, evaluation, strategy);
    }
    return postflopExplain(input, spotKey, evaluation, strategy);
  }

  global.GTOExplanations = { generate };
})(window);
