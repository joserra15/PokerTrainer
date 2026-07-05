/*
 * scoring.js — Puntuación 0-100: acción, sizing, frecuencia, línea.
 */
(function (global) {
  'use strict';

  function scoreDecision(input) {
    const freqs = input.strategy || {};
    const chosen = input.chosenAction;
    const cls = input.classification || 'error';
    const freq = freqs[chosen] || 0;
    const evLoss = input.evLoss || 0;

    // Acción (0-40)
    let actionScore = 0;
    if (cls === 'optima') actionScore = 40;
    else if (cls === 'aceptable') actionScore = 32;
    else if (cls === 'imprecisa') actionScore = 18;
    else actionScore = 5;

    // Frecuencia GTO (0-25)
    const freqScore = Math.min(25, freq * 25);

    // Sizing (0-20) — penaliza sizing incoherente
    let sizingScore = 20;
    if (input.sizingError) sizingScore = 5;
    else if (input.betSizeBB && input.potBB) {
      const ratio = input.betSizeBB / input.potBB;
      const ideal = input.boardWet ? 0.6 : 0.4;
      const dev = Math.abs(ratio - ideal);
      sizingScore = Math.max(0, 20 - dev * 30);
    }

    // Línea completa (0-15) — basado en EV loss relativo
    let lineScore = 15;
    if (evLoss > 8) lineScore = 0;
    else if (evLoss > 3) lineScore = 6;
    else if (evLoss > 1) lineScore = 10;

    const total = Math.round(Math.min(100, Math.max(0, actionScore + freqScore + sizingScore + lineScore)));
    return { score: total, breakdown: { action: actionScore, frequency: Math.round(freqScore), sizing: Math.round(sizingScore), line: lineScore } };
  }

  function confidence(freqs, chosen) {
    const f = freqs[chosen] || 0;
    let max = 0;
    for (const a in freqs) if (freqs[a] > max) max = freqs[a];
    return round2(0.5 + 0.5 * (max - Math.abs(f - max)));
  }

  /** Confianza en la evaluación: alta / media / baja (Q-05). */
  function confidenceTier(opts) {
    opts = opts || {};
    const street = opts.street || 'preflop';
    const maxFreq = opts.stratMaxFreq != null ? opts.stratMaxFreq : 0;
    const eqIters = opts.equityIters || 0;
    const reasons = [];

    if (street === 'preflop') {
      reasons.push('rangos preflop de referencia');
      return { tier: 'alta', label: 'Alta', title: 'Confianza alta en tablas preflop', reasons: reasons };
    }

    let score = 0;
    if (eqIters >= 500) { score += 2; reasons.push('Monte Carlo ampliado (' + eqIters + ' iter.)'); }
    else if (eqIters >= 350) { score += 1; reasons.push('Monte Carlo estándar (' + eqIters + ' iter.)'); }
    else if (eqIters > 0) { reasons.push('pocas iteraciones MC (' + eqIters + ')'); }

    if (maxFreq >= 0.65) { score += 2; reasons.push('estrategia clara (máx. ' + Math.round(maxFreq * 100) + '%)'); }
    else if (maxFreq >= 0.4) { score += 1; reasons.push('spot mixto'); }
    else { reasons.push('spot muy mixto'); }

    if (opts.riverShove) { score -= 1; reasons.push('nodo river shove/overbet'); }
    if (opts.multiway) { score -= 1; reasons.push('multiway aproximado'); }

    let tier = 'media';
    if (score >= 3) tier = 'alta';
    else if (score <= 0) tier = 'baja';

    const labels = { alta: 'Alta', media: 'Media', baja: 'Baja' };
    return {
      tier: tier,
      label: labels[tier],
      title: 'Confianza ' + labels[tier].toLowerCase() + ' en estimación postflop',
      reasons: reasons
    };
  }

  function round2(x) { return Math.round(x * 100) / 100; }

  global.GTOScoring = { scoreDecision, confidence, confidenceTier };
})(window);
