/*
 * scoring.js — Puntuación 0-100 por decisión y 0-10 por mano.
 */
(function (global) {
  'use strict';

  /** Puntos de clase para la nota de mano (0–10). */
  const HAND_CLASS_PTS = { optima: 10, aceptable: 8.5, imprecisa: 3.5, error: 0 };
  /** Escala de saturación EV (bb): a EV_REF la componente EV vale ~5/10. */
  const HAND_EV_REF_BB = 4;

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

  function resolveHandEvLoss(decisions, totalEvLoss) {
    if (totalEvLoss != null && !Number.isNaN(Number(totalEvLoss))) {
      return Math.max(0, Number(totalEvLoss) || 0);
    }
    if (global.GTOEvLoss && global.GTOEvLoss.totalEvLossFromDecisions) {
      return Math.max(0, global.GTOEvLoss.totalEvLossFromDecisions(decisions) || 0);
    }
    return Math.max(0, (decisions || []).reduce(function (s, d) {
      return s + (d && d.evErroneous ? (Number(d.evLoss) || 0) : 0);
    }, 0));
  }

  function handGradeMeta(score, allOptimal, allGood, evLoss) {
    let letter;
    if (score >= 9) letter = 'A+';
    else if (score >= 8) letter = 'A';
    else if (score >= 7) letter = 'B';
    else if (score >= 6) letter = 'C';
    else if (score >= 4.5) letter = 'D';
    else letter = 'E';

    let label;
    if (allOptimal && evLoss <= 0.01) label = 'Perfecta';
    else if (score >= 9) label = 'Excelente';
    else if (score >= 8) label = 'Muy buena';
    else if (score >= 7) label = 'Buena';
    else if (score >= 6) label = 'Aceptable';
    else if (score >= 4.5) label = 'Floja';
    else label = 'Mala';

    let verdict;
    if (allOptimal && evLoss <= 0.01) {
      verdict = 'Todas las decisiones han sido óptimas.';
    } else if (allOptimal) {
      verdict = 'Decisiones óptimas, con un coste de EV residual.';
    } else if (allGood) {
      verdict = 'Sin errores graves, pero no todas las decisiones fueron óptimas.';
    } else if (score >= 6.5) {
      verdict = 'No todas las decisiones fueron óptimas; revisa los spots con más EV perdido.';
    } else if (score >= 4.5) {
      verdict = 'Hubo fugas relevantes; la puntuación refleja el EV perdido.';
    } else {
      verdict = 'Mano lejos de GTO: varias decisiones erróneas o mucho EV perdido.';
    }

    return { letter: letter, label: label, verdict: verdict };
  }

  /**
   * Nota de mano 0–10.
   * 10 = mano perfecta (todas óptimas, sin EV perdido).
   * 0 = todo mal / mucho EV perdido.
   * A igualdad de errores, más EV perdido → menos puntos (saturación suave).
   */
  function scoreHand(decisions, totalEvLoss) {
    const decs = decisions || [];
    const n = decs.length;
    const evLoss = round2(resolveHandEvLoss(decs, totalEvLoss));
    const allOptimal = n > 0 && decs.every(function (d) { return d && d.class === 'optima'; });
    const allGood = n > 0 && decs.every(function (d) {
      return d && (d.class === 'optima' || d.class === 'aceptable');
    });

    if (!n) {
      const empty = handGradeMeta(10, true, true, 0);
      return {
        score: 10,
        allOptimal: true,
        allGood: true,
        letter: empty.letter,
        label: empty.label,
        verdict: 'Sin decisiones evaluadas.',
        evLoss: 0,
        classScore: 10,
        evScore: 10
      };
    }

    let classSum = 0;
    decs.forEach(function (d) {
      const cls = d && d.class;
      classSum += HAND_CLASS_PTS[cls] != null ? HAND_CLASS_PTS[cls] : 0;
    });
    const classScore = classSum / n;
    const evScore = 10 * (HAND_EV_REF_BB / (HAND_EV_REF_BB + evLoss));

    // 35% calidad de decisiones + 65% magnitud de EV perdido
    let score = classScore * 0.35 + evScore * 0.65;
    if (allOptimal && evLoss <= 0.01) score = 10;
    score = Math.round(Math.max(0, Math.min(10, score)) * 10) / 10;

    const meta = handGradeMeta(score, allOptimal, allGood, evLoss);
    return {
      score: score,
      allOptimal: allOptimal,
      allGood: allGood,
      letter: meta.letter,
      label: meta.label,
      verdict: meta.verdict,
      evLoss: evLoss,
      classScore: round2(classScore),
      evScore: round2(evScore)
    };
  }

  /** Asegura handScore en un objeto mano (trainer o analizada). */
  function ensureHandScore(hand) {
    if (!hand) return null;
    const decisions = hand.decisions || [];
    const totalEvLoss = hand.totalEvLoss != null
      ? hand.totalEvLoss
      : (hand.result && hand.result.totalEvLoss);
    const graded = scoreHand(decisions, totalEvLoss);
    hand.handScore = graded.score;
    hand.handScoreMeta = graded;
    if (hand.result) {
      hand.result.handScore = graded.score;
      hand.result.handScoreMeta = graded;
    }
    return graded;
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

  global.GTOScoring = {
    scoreDecision, confidence, confidenceTier,
    scoreHand, ensureHandScore, HAND_CLASS_PTS, HAND_EV_REF_BB
  };
})(window);
