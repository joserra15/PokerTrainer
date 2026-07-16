/*
 * classifier.js — Clasificación vs frecuencias GTO (solo acciones legales).
 */
(function (global) {
  'use strict';

  function filterStrategy(freqs, availableActions) {
    if (!availableActions || !availableActions.length) return freqs;
    const out = {};
    availableActions.forEach((a) => { if (freqs[a] != null) out[a] = freqs[a]; });
    let sum = 0;
    for (const k in out) sum += out[k];
    if (sum <= 0) {
      const n = availableActions.length;
      availableActions.forEach((a) => { out[a] = 1 / n; });
      return out;
    }
    for (const k in out) out[k] = out[k] / sum;
    return out;
  }

  function normalizeStrategy(freqs) {
    let sum = 0;
    for (const k in freqs) sum += freqs[k] || 0;
    if (sum <= 0) return freqs;
    const out = {};
    for (const k in freqs) out[k] = (freqs[k] || 0) / sum;
    return out;
  }

  /** Si la mano no tiene pot odds para call, la estrategia mostrada debe favorecer fold. */
  function adjustStrategyForHand(strategy, input) {
    if (!strategy || !input || input.street === 'preflop') return strategy;
    const toCall = input.toCallBB || 0;
    if (toCall <= 0) return strategy;

    const EvLoss = global.GTOEvLoss;
    const EvMath = global.GTOEvMath;
    if (!EvLoss || !EvMath) return strategy;

    const ctx = EvMath.buildActionContext(Object.assign({}, input, { chosenAction: 'call' }), strategy);
    if (!EvLoss.callFailsPotOdds(ctx, input) || EvLoss.impliedOddsAllowed(input, ctx)) {
      return strategy;
    }

    const out = Object.assign({}, strategy);
    const callF = out.call || 0;
    const foldF = out.fold || 0;
    if (callF <= foldF + 0.02) return strategy;

    const shift = callF * 0.92;
    out.fold = foldF + shift;
    out.call = Math.max(0.02, callF - shift);
    return normalizeStrategy(out);
  }

  function classify(freqs, chosen, availableActions) {
    const legal = filterStrategy(freqs, availableActions);
    const f = legal[chosen] != null ? legal[chosen] : 0;
    let max = 0, best = availableActions && availableActions[0] ? availableActions[0] : 'fold';
    for (const a in legal) if (legal[a] > max) { max = legal[a]; best = a; }
    let cls;
    if (f >= max - 0.08 || f >= 0.40) cls = 'optima';
    else if (f >= 0.15) cls = 'aceptable';
    else if (f >= 0.05) cls = 'imprecisa';
    else cls = 'error';
    return { cls, freq: f, best, maxFreq: max, legalStrategy: legal };
  }

  const EV_TIE_BB = 0.15;
  const EV_OPTIMA_BB = 0.01;

  /** Frecuencia GTO de una acción en la mezcla legal (0 si no está). */
  function mixFreqOf(action, opts, chosen, freq, freqBest, maxFreq) {
    const legal = opts && opts.legalStrategy;
    if (legal && legal[action] != null) return legal[action] || 0;
    if (action === chosen) return freq;
    if (action === freqBest) return maxFreq;
    return 0;
  }

  /**
   * "Mejor" en UI = líder de la mezcla GTO, salvo que el EV apunte a una acción
   * también competitiva en frecuencia (o a fold por call sin odds).
   * Evita marcar raise ~7% como óptimo cuando call tiene ~70%+ por un EV heurístico inflado.
   */
  function evBestTrustedInMix(bestAct, freqBest, maxFreq, evBestFreq, callSinOdds) {
    if (bestAct === freqBest) return true;
    if (callSinOdds && bestAct === 'fold') return true;
    if (maxFreq <= 0) return true;
    // Dentro de la banda de indiferencia (±8pp) o con peso material en la mezcla
    if (evBestFreq >= maxFreq - 0.08) return true;
    if (evBestFreq >= 0.40) return true;
    return false;
  }

  /** Si la acción elegida tiene el mismo EV que la óptima, suavizar penalización por frecuencia baja. */
  function reconcileWithEv(freqCls, chosen, freqBest, evResult, opts) {
    opts = opts || {};
    const freq = opts.freq != null ? opts.freq : 0;
    const maxFreq = opts.maxFreq != null ? opts.maxFreq : (chosen === freqBest ? freq : 0);
    const equity = opts.equity != null ? opts.equity : 0;
    const isNuts = opts.band === 'nuts' || equity >= 0.95;
    if (!evResult || evResult.actionEV == null || evResult.bestEV == null) {
      return { cls: freqCls, best: freqBest };
    }
    const delta = Math.max(0, (evResult.bestEV || 0) - (evResult.actionEV || 0));
    let cls = freqCls;
    let best = freqBest;
    if (delta <= EV_OPTIMA_BB) {
      if (freq >= 0.15 || freqCls === 'optima' || freqCls === 'aceptable') {
        cls = 'optima';
        best = chosen;
      } else if (freq >= 0.05) {
        cls = 'aceptable';
        best = chosen;
      } else if (isNuts) {
        cls = 'optima';
        best = chosen;
      }
    } else if (delta <= EV_TIE_BB) {
      if (cls === 'error' || cls === 'imprecisa') {
        cls = (freq >= 0.05 || isNuts) ? 'aceptable' : cls;
      }
      if ((evResult.actionEV || 0) >= (evResult.bestEV || 0) - EV_OPTIMA_BB && (freq >= 0.05 || isNuts)) {
        best = chosen;
      }
    }

    const evLoss = evResult.evLoss != null ? evResult.evLoss : 0;
    let bestAct = evResult.bestAction || freqBest;
    if (chosen === 'call' && freqBest === 'fold') bestAct = 'fold';
    const callSinOdds = (evResult.evErrorReasons || []).some(function (r) {
      return r.type === 'call_sin_odds';
    });
    if (callSinOdds && chosen === 'call') bestAct = 'fold';
    const evBestFreq = mixFreqOf(bestAct, opts, chosen, freq, freqBest, maxFreq);
    // Mezcla GTO casi empatada (p.ej. check 28.9% vs bet_100 29.2%): no degradar
    // a imprecisa por un ΔEV heurístico; la frecuencia ya marca indiferencia.
    const withinMixBand = freq >= 0.15 && maxFreq > 0 && freq >= maxFreq - 0.08;
    const freqDominant = withinMixBand || (chosen === freqBest && freq >= 0.15);
    const trustEvBest = evBestTrustedInMix(bestAct, freqBest, maxFreq, evBestFreq, callSinOdds);
    if (evResult.evErroneous && evLoss >= EV_TIE_BB) {
      if (cls === 'optima' || cls === 'aceptable') {
        cls = evLoss >= 1 ? 'error' : 'imprecisa';
      }
      if (trustEvBest || callSinOdds) best = bestAct;
    } else if (delta >= EV_TIE_BB && chosen !== bestAct && !freqDominant) {
      if (cls === 'optima') cls = delta >= 1 ? 'imprecisa' : 'aceptable';
      if (chosen === 'call' && freqBest === 'fold') bestAct = 'fold';
      if (trustEvBest) best = bestAct;
    }

    return { cls, best };
  }

  global.GTOClassifier = { classify, filterStrategy, reconcileWithEv, adjustStrategyForHand, normalizeStrategy };
})(window);
