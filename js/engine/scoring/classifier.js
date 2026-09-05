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
    if (!EvLoss.callFailsPotOdds(ctx, input)) return strategy;
    // Implied odds solo salvan si la equity está cerca del break-even.
    // Con Eq muy por debajo de BE (p.ej. 5% vs 28%) hay que rebalancear a fold.
    const clearlyShort = ctx.equity + 0.10 < ctx.breakEven;
    if (!clearlyShort && EvLoss.impliedOddsAllowed(input, ctx)) return strategy;

    const out = Object.assign({}, strategy);
    const callF = out.call || 0;
    const foldF = out.fold || 0;
    if (callF <= foldF + 0.02) return strategy;

    const shift = callF * (clearlyShort ? 0.92 : 0.75);
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
   * La UI pinta "mejor" (píldora verde y texto «mejor: X») junto a los % de la
   * mezcla, así que marcar como mejor una acción con menos % que la líder se lee
   * como una contradicción. Se compara con el % redondeado que ve el usuario.
   */
  function bestCoherentWithMix(best, freqBest, opts, chosen, freq, maxFreq, callSinOdds) {
    if (best === freqBest) return best;
    if (callSinOdds && best === 'fold') return best;
    if (!(maxFreq > 0)) return best;
    const bestFreq = mixFreqOf(best, opts, chosen, freq, freqBest, maxFreq);
    return Math.round(bestFreq * 100) < Math.round(maxFreq * 100) ? freqBest : best;
  }

  /** Peso mínimo en la mezcla para que la UI la presente como una opción real. */
  const MIX_MATERIAL_FREQ = 0.15;

  /**
   * El veredicto no puede ser peor de lo que admite la frecuencia mostrada:
   * "Error" está reservado a acciones casi ausentes de la mezcla, así que un
   * call que el grid pinta al 20 % baja como mucho a "Imprecisa" aunque el EV
   * del spot lo penalice.
   */
  function clampClassToMix(cls, freq) {
    if (cls === 'error' && freq >= MIX_MATERIAL_FREQ) return 'imprecisa';
    return cls;
  }

  /**
   * "Mejor" en UI = líder de la mezcla GTO, salvo que el EV apunte a una acción
   * también competitiva en frecuencia (o a fold por call sin odds).
   * Evita marcar raise ~7% como óptimo cuando call tiene ~70%+ por un EV heurístico inflado.
   * Evita marcar bet_33 ~11% como óptimo cuando check tiene ~78% por empate EV heurístico.
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
    const madeCat = opts.madeCategory != null
      ? opts.madeCategory
      : (opts.madeHandInfo && ((opts.madeHandInfo.ev && opts.madeHandInfo.ev.category)
        || opts.madeHandInfo.category)) || 0;
    const madeFlushPlus = madeCat >= 5;
    const madeTwoPairPlus = madeCat >= 2;
    const isNuts = opts.band === 'nuts' || equity >= 0.95 || madeFlushPlus;
    // Top dos / manos fuertes hechas: raise por valor no se degrada a error.
    const strongValueAggro = isNuts || (madeTwoPairPlus && equity >= 0.70);
    const valueAggro = chosen === 'raise' || chosen === 'bet'
      || (typeof chosen === 'string' && chosen.indexOf('bet_') === 0);
    if (!evResult || evResult.actionEV == null || evResult.bestEV == null) {
      return { cls: freqCls, best: freqBest };
    }
    const delta = Math.max(0, (evResult.bestEV || 0) - (evResult.actionEV || 0));
    let cls = freqCls;
    let best = freqBest;
    // Solo promover chosen a "best"/óptima si es competitiva en la mezcla GTO.
    // Sin maxFreq conocido, no promover residuales (~5–12%) por empate EV.
    // Call ~16% vs fold ~70% con ΔEV≈0 (heurística FE) no debe ser óptima.
    const chosenTrusted = strongValueAggro || chosen === freqBest || (maxFreq > 0
      ? evBestTrustedInMix(chosen, freqBest, maxFreq, freq, false)
      : freq >= 0.40);
    if (delta <= EV_OPTIMA_BB) {
      if (strongValueAggro && freq < 0.05) {
        cls = 'optima';
        best = chosen;
      } else if (chosenTrusted) {
        if (freq >= 0.15 || freqCls === 'optima' || freqCls === 'aceptable') {
          cls = 'optima';
          best = chosen;
        } else if (freq >= 0.05) {
          cls = 'aceptable';
          best = chosen;
        }
      } else if (freq >= 0.15) {
        // Empate EV sin peso de mezcla: conservar tipificación por frecuencia.
        cls = freqCls === 'optima' ? 'aceptable' : freqCls;
      } else if (freq >= 0.05) {
        cls = 'aceptable';
      }
    } else if (delta <= EV_TIE_BB) {
      if (cls === 'error' || cls === 'imprecisa') {
        cls = (freq >= 0.05 || strongValueAggro) ? 'aceptable' : cls;
      }
      if ((evResult.actionEV || 0) >= (evResult.bestEV || 0) - EV_OPTIMA_BB && chosenTrusted) {
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
    // Mezcla GTO casi empatada o con peso material: no degradar a imprecisa
    // por un ΔEV heurístico (p.ej. fold 42% vs call 53%).
    const withinMixBand = freq >= 0.15 && maxFreq > 0 && freq >= maxFreq - 0.08;
    const materialMix = freq >= 0.40
      || (freq >= 0.25 && maxFreq > 0 && freq >= maxFreq * 0.70);
    const freqDominant = withinMixBand || materialMix || (chosen === freqBest && freq >= 0.15);
    const trustEvBest = evBestTrustedInMix(bestAct, freqBest, maxFreq, evBestFreq, callSinOdds);
    if (evResult.evErroneous && evLoss >= EV_TIE_BB) {
      if (cls === 'optima' || cls === 'aceptable') {
        if (materialMix || withinMixBand) {
          // Frecuencia alta en la mezcla: como máximo bajar a aceptable. Con una
          // fuga de 1bb o más nunca puede seguir siendo "Óptima": la ficha ya
          // enseña el EV perdido al lado del veredicto.
          if ((freq < 0.40 || evLoss >= 1) && cls === 'optima') cls = 'aceptable';
        } else if (!(valueAggro && strongValueAggro)) {
          // Raise/bet con nuts, color o top dos fuertes: no degradar a error por ΔEV heurístico.
          cls = evLoss >= 1 ? 'error' : 'imprecisa';
        } else if (cls === 'optima' && freq < 0.15) {
          cls = 'aceptable';
        }
      }
      // Si el EV "óptimo" es residual (~11% bet), mantener el líder de mezcla (check).
      best = (trustEvBest || callSinOdds) ? bestAct : freqBest;
    } else if (delta >= EV_TIE_BB && chosen !== bestAct && !freqDominant) {
      // Sin peso de mezcla: óptima → aceptable si aún tiene ≥15%; si no, imprecisa.
      if (cls === 'optima') {
        cls = freq >= 0.15 ? 'aceptable' : (delta >= 1 ? 'imprecisa' : 'aceptable');
      }
      if (chosen === 'call' && freqBest === 'fold') bestAct = 'fold';
      if (trustEvBest) best = bestAct;
    }

    if (valueAggro && strongValueAggro && (cls === 'error' || cls === 'imprecisa')) {
      cls = 'aceptable';
    }

    best = bestCoherentWithMix(best, freqBest, opts, chosen, freq, maxFreq, callSinOdds);
    cls = clampClassToMix(cls, freq);

    return { cls, best };
  }

  global.GTOClassifier = {
    classify, filterStrategy, reconcileWithEv, adjustStrategyForHand, normalizeStrategy,
    bestCoherentWithMix, clampClassToMix, MIX_MATERIAL_FREQ
  };
})(window);
