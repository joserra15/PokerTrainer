/*
 * bluffAnalysis.js — Análisis post-decisión de faroles (make / catch).
 * No se usa como pista previa: coherente con clase GTO, sizing y formato.
 */
(function (global) {
  'use strict';

  function pct(x) {
    return Math.round((Number(x) || 0) * 100);
  }

  function round2(x) {
    return Math.round(Number(x) * 100) / 100;
  }

  function cap(s) {
    s = String(s || '');
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  function actionLabel(id) {
    if (!id) return '—';
    const names = {
      fold: 'fold', check: 'check', call: 'call', bet: 'bet', raise: 'raise',
      overbet: 'overbet', allin: 'all-in',
      bet_33: 'bet 33%', bet_50: 'bet 50%', bet_66: 'bet 66%', bet_75: 'bet 75%',
      bet_100: 'bet pot'
    };
    if (names[id]) return names[id];
    if (String(id).indexOf('bet_') === 0) return 'bet ' + String(id).slice(4) + '%';
    return String(id);
  }

  function isAggro(action) {
    if (!action) return false;
    return action === 'bet' || action === 'raise' || action === 'overbet' || action === 'allin'
      || String(action).indexOf('bet_') === 0;
  }

  function formatHubLabel(hub) {
    if (hub === 'spin') return 'Spins';
    if (hub === 'mtt') return 'MTT';
    return 'Cash';
  }

  function phaseLabel(phase) {
    const Tax = global.PTFormatTaxonomy;
    if (Tax && Tax.PHASE_LABELS && Tax.PHASE_LABELS[phase]) return Tax.PHASE_LABELS[phase];
    return phase || null;
  }

  function sizingRatio(input) {
    const pot = Number(input.potBeforeBB != null ? input.potBeforeBB : input.potBB) || 0;
    const size = Number(input.betSizeBB) || 0;
    if (pot <= 0 || size <= 0) return null;
    return size / pot;
  }

  /**
   * Evalúa si el sizing del farol es polar creíble.
   * @returns {{ ok: boolean, ratio: number|null, note: string, tier: string }}
   */
  function assessBluffSizing(input, opts) {
    opts = opts || {};
    const ratio = sizingRatio(input);
    const hub = input.formatHub || 'cash';
    const icm = !!(opts.icmLite || input.icmLite || hub === 'spin' || hub === 'mtt');
    if (ratio == null) {
      return { ok: false, ratio: null, note: 'Sin sizing de apuesta para evaluar.', tier: 'none' };
    }
    const r = Math.round(ratio * 100) / 100;
    // Polar típico river: ~55–150% pot; overbet hasta ~200% en cash.
    if (ratio < 0.35) {
      return {
        ok: false,
        ratio: r,
        note: 'Sizing demasiado pequeño para un farol polar (' + pct(ratio) + '% pot): parece merge, no presión.',
        tier: 'tiny'
      };
    }
    if (ratio < 0.55) {
      return {
        ok: false,
        ratio: r,
        note: 'Sizing medio (' + pct(ratio) + '% pot): poco polar; el rivales pagan más fácil.',
        tier: 'small'
      };
    }
    if (icm && ratio > 1.75) {
      return {
        ok: false,
        ratio: r,
        note: 'Overbet muy grande en ' + formatHubLabel(hub)
          + ' (' + pct(ratio) + '% pot): el ICM castiga stacks comprometidos.',
        tier: 'huge_icm'
      };
    }
    if (ratio > 2.2) {
      return {
        ok: false,
        ratio: r,
        note: 'Overbet extremo (' + pct(ratio) + '% pot): suele ser spew salvo blockers fuertes.',
        tier: 'huge'
      };
    }
    if (ratio >= 0.9 && ratio <= 1.35) {
      return {
        ok: true,
        ratio: r,
        note: 'Sizing pot (~' + pct(ratio) + '%): alineado con farol polar de river.',
        tier: 'pot'
      };
    }
    if (ratio > 1.35) {
      return {
        ok: true,
        ratio: r,
        note: 'Overbet polar (' + pct(ratio) + '% pot): fuerza folds de medias; correcto si FE/blockers acompañan.',
        tier: 'overbet'
      };
    }
    return {
      ok: true,
      ratio: r,
      note: 'Sizing polar medio-grande (' + pct(ratio) + '% pot): razonable para farol.',
      tier: 'mid_polar'
    };
  }

  function contextLine(input) {
    const hub = input.formatHub || (input.gameType && global.PTFormatTaxonomy
      && global.PTFormatTaxonomy.hubFromGameType
      ? global.PTFormatTaxonomy.hubFromGameType(input.gameType)
      : 'cash');
    const parts = [formatHubLabel(hub)];
    const phase = input.mttPhase || input.resolvedPhase || input.phase;
    if (phase && hub !== 'cash') {
      const pl = phaseLabel(phase);
      if (pl) parts.push('fase ' + pl);
    }
    const pot = input.potBB != null ? round2(input.potBB) : null;
    if (pot != null) parts.push('bote ' + pot + 'bb');
    const toCall = Number(input.toCallBB) || 0;
    if (toCall > 0) {
      const ratio = input.villainBetRatio != null
        ? input.villainBetRatio
        : (toCall / Math.max((input.potBeforeBB != null ? input.potBeforeBB : (pot - toCall)) || 1, 0.1));
      parts.push('rival apuesta ' + round2(toCall) + 'bb'
        + (ratio != null && isFinite(ratio) ? ' (~' + pct(ratio) + '% pot)' : ''));
    } else if (input.villainLastAction) {
      parts.push('rival ' + String(input.villainLastAction));
    }
    if (input.inPosition === true) parts.push('IP');
    else if (input.inPosition === false) parts.push('OOP');
    if (input.street) parts.push(cap(input.street));
    return parts.join(' · ');
  }

  function villainLineNote(input) {
    const toCall = Number(input.toCallBB) || 0;
    if (toCall > 0) {
      const ratio = input.villainBetRatio != null
        ? Number(input.villainBetRatio)
        : toCall / Math.max(Number(input.potBeforeBB || input.potBB) || 1, 0.1);
      if (input.facingNode === 'shove' || ratio >= 1) {
        return 'Línea rival polarizada (shove / overbet).';
      }
      if (ratio >= 0.6) return 'Línea rival polarizada (bet grande ~' + pct(ratio) + '% pot).';
      if (ratio >= 0.4) return 'Línea rival con bet mediano-grande (~' + pct(ratio) + '% pot).';
      return 'Línea rival con bet pequeño-medio (~' + pct(ratio) + '% pot).';
    }
    if (input.villainLastAction === 'check') {
      if (input.delayedCbet || input.priorAggressorBet === false) {
        return 'Rival checkea; nodo de delayed lead / probe.';
      }
      return 'Rival checkea; te cede la iniciativa.';
    }
    return '';
  }

  function bandLabel(band) {
    if (band === 'air') return 'aire';
    if (band === 'bluffcatch') return 'bluffcatch / showdown medio-débil';
    if (band === 'merge') return 'merge / showdown medio';
    if (band === 'value' || band === 'nuts') return 'valor';
    return band || 'mano media';
  }

  /**
   * Análisis post-decisión. Requiere chosenAction + evaluación GTO.
   */
  function analyze(raw) {
    const input = raw || {};
    const Tax = global.PTFormatTaxonomy;
    const intent = Tax && Tax.normalizeIntent
      ? Tax.normalizeIntent(input.practiceIntent || (input.bluffSpot && input.bluffSpot.intent) || 'mixed')
      : (input.practiceIntent || 'mixed');
    const chosen = input.chosenAction || input.action || null;
    const best = input.best || (input.evaluation && input.evaluation.best) || null;
    const cls = input.class || (input.evaluation && input.evaluation.class) || null;
    const strategy = input.strategy || input.gto || {};
    const spot = input.bluffSpot || null;
    const band = (spot && spot.band) || input.band
      || (input.handRank && input.handRank.band)
      || (input.madeHandInfo && input.madeHandInfo.tier) || null;
    const street = input.street || 'river';
    const facing = (Number(input.toCallBB) || 0) > 0;
    const ctx = contextLine(input);
    const lineNote = villainLineNote(input);
    const bestPct = pct(strategy[best] || 0);
    const chosenPct = pct(strategy[chosen] || 0);
    const fe = spot && spot.foldEquity != null ? spot.foldEquity
      : (input.foldEquity != null ? input.foldEquity : null);
    const blk = spot && spot.blockers != null ? spot.blockers
      : (input.blockerScore != null ? input.blockerScore : null);

    const paragraphs = [];
    const bullets = [];
    let headline = '';
    let sizing = { ok: null, ratio: null, note: '', tier: 'none' };
    let acceptableBluff = false;
    let catchCoherent = null;

    paragraphs.push(ctx + (lineNote ? '. ' + lineNote : '.'));

    if (intent === 'bluff_catch' || (facing && (band === 'bluffcatch' || band === 'merge'))) {
      // --- CAZAR FAROLES (post-decisión) ---
      const gtoCalls = best === 'call' || (strategy.call || 0) >= 0.25;
      const gtoFolds = best === 'fold' || ((strategy.fold || 0) >= 0.45 && (strategy.call || 0) < 0.20);
      const callIsError = chosen === 'call' && (cls === 'error' || (gtoFolds && !gtoCalls));
      const foldIsOpt = chosen === 'fold' && (cls === 'optima' || cls === 'aceptable');

      if (callIsError) {
        catchCoherent = false;
        headline = 'No es un bluffcatch GTO';
        paragraphs.push(
          'Aunque la mano es tipo ' + bandLabel(band)
          + ', GTO prefiere ' + actionLabel(best) + ' (' + bestPct
          + '%). Call aquí es ' + (cls || 'error')
          + ': el sizing/línea del rival o tu equity no justifican cazar.'
        );
        bullets.push('Tipo de mano: ' + bandLabel(band) + ' (parecido a bluffcatch, no mandato de call).');
        if (lineNote) bullets.push(lineNote);
        bullets.push('Veredicto GTO: ' + actionLabel(best) + ' (' + bestPct + '%), no call automático.');
        if (input.heroEquity != null) {
          const eq = Number(input.heroEquity);
          const eqPct = eq <= 1 ? pct(eq) : Math.round(eq);
          bullets.push('Equity ~' + eqPct + '% frente al rango que apuesta.');
        }
        if (input.formatHub === 'mtt' || input.formatHub === 'spin' || input.icmLite) {
          bullets.push('En ' + formatHubLabel(input.formatHub || 'mtt')
            + ' el ICM suele castigar calls marginales de bluffcatch.');
        }
      } else if (chosen === 'call' && (cls === 'optima' || cls === 'aceptable' || gtoCalls)) {
        catchCoherent = true;
        headline = 'Bluffcatch alineado con GTO';
        paragraphs.push(
          'Call correcto como bluffcatch: ' + bandLabel(band)
          + ' frente a ' + (lineNote || 'la apuesta rival')
          + ' GTO mezcla call ~' + pct(strategy.call || 0) + '%.'
        );
        bullets.push('Mano: ' + bandLabel(band));
        if (lineNote) bullets.push(lineNote);
        bullets.push('Frecuencia call GTO: ' + pct(strategy.call || 0) + '%.');
      } else if (foldIsOpt || (chosen === 'fold' && gtoFolds)) {
        catchCoherent = true;
        headline = 'Fold correcto (no cazamos)';
        paragraphs.push(
          'Fold es la línea GTO (' + bestPct
          + '%). El spot puede parecer bluffcatch por la categoría de mano, pero la combinación de sizing, bote y formato no justifica pagar.'
        );
        bullets.push('Mano tipo ' + bandLabel(band) + ' — categoría ≠ obligación de call.');
        bullets.push('GTO: ' + actionLabel(best) + ' (' + bestPct + '%).');
      } else if (facing) {
        headline = 'Decisión de bluffcatch';
        paragraphs.push(
          'Spot de showdown medio frente a apuesta. Elegiste ' + actionLabel(chosen)
          + ' (' + chosenPct + '%); GTO lidera con ' + actionLabel(best) + ' (' + bestPct + '%).'
        );
        bullets.push('Mano: ' + bandLabel(band));
        if (lineNote) bullets.push(lineNote);
      }
    }

    if (intent === 'bluff_make' || (!facing && isAggro(chosen) && (band === 'air' || band === 'bluffcatch' || band === 'weak'))) {
      // --- HACER FAROLES (post-decisión) ---
      sizing = assessBluffSizing(input, { icmLite: input.icmLite });
      const gtoChecks = best === 'check' || ((strategy.check || 0) >= 0.5 && !isAggro(best));
      const choseAggro = isAggro(chosen);
      const feOk = fe != null && fe >= 0.28;
      const blkOk = blk != null && blk >= 0.28;
      const delayed = !!(input.delayedCbet
        || (input.priorAggressorBet === false && input.villainLastAction === 'check'));
      const polarOk = sizing.ok === true && (sizing.tier === 'pot' || sizing.tier === 'overbet'
        || sizing.tier === 'mid_polar');

      let signals = [];
      if (delayed) signals.push('delayed / check-check del rival');
      if (feOk) signals.push('fold equity ~' + pct(fe) + '%');
      else if (fe != null) signals.push('fold equity baja (~' + pct(fe) + '%)');
      if (blkOk) signals.push('blockers útiles (' + round2(blk) + ')');
      else if (blk != null && blk < 0.15) signals.push('blockers pobres (' + round2(blk) + ')');
      if (polarOk) signals.push('sizing polar OK');
      else if (sizing.note) signals.push(sizing.note);

      const signalScore = (delayed ? 2 : 0) + (feOk ? 1 : 0) + (blkOk ? 1 : 0) + (polarOk ? 1 : 0)
        + (street === 'river' ? 1 : 0);
      acceptableBluff = !!(choseAggro && gtoChecks && street === 'river'
        && (band === 'air' || band === 'bluffcatch' || band === 'weak')
        && delayed && polarOk && (feOk || blkOk) && signalScore >= 4
        && (cls === 'error' || cls === 'imprecisa' || cls === 'aceptable' || cls === 'optima'));

      if (choseAggro && gtoChecks) {
        if (acceptableBluff || cls === 'aceptable' || cls === 'optima') {
          headline = headline || 'Farol aceptable (GTO mezcla check)';
          paragraphs.push(
            'GTO prioriza ' + actionLabel(best) + ' (' + bestPct
            + '%), pero un farol aquí es aceptable: '
            + signals.slice(0, 4).join('; ') + '.'
          );
          acceptableBluff = true;
        } else {
          headline = headline || 'Farol no justificado';
          paragraphs.push(
            'GTO es ' + actionLabel(best) + ' (' + bestPct
            + '%). Farolear con ' + actionLabel(chosen)
            + ' no está justificado en este contexto: '
            + (signals.length ? signals.slice(0, 3).join('; ') : 'faltan FE, blockers o sizing polar') + '.'
          );
        }
        if (sizing.note) {
          bullets.push('Sizing: ' + sizing.note);
        }
        signals.forEach(function (s) {
          if (bullets.indexOf(s) < 0 && bullets.indexOf('Sizing: ' + s) < 0) bullets.push(s);
        });
      } else if (choseAggro && isAggro(best)) {
        headline = headline || 'Farol / agresión en la mezcla';
        paragraphs.push(
          actionLabel(chosen) + ' está en la mezcla GTO (' + chosenPct
          + '%); la línea principal es ' + actionLabel(best) + ' (' + bestPct + '%).'
        );
        if (sizing.note) bullets.push('Sizing: ' + sizing.note);
      } else if (!choseAggro && gtoChecks && (band === 'air' || band === 'bluffcatch')) {
        headline = headline || 'Check correcto (sin farol)';
        paragraphs.push(
          'Check es la línea GTO (' + bestPct
          + '%). Un farol habría sido '
          + (feOk && blkOk && delayed ? 'aceptable con sizing polar' : 'sospechoso sin FE/blockers/historia')
          + '.'
        );
      }
    }

    // Detector reasons: solo descriptivos filtrados (nunca mandatos de call/bluff).
    if (spot && Array.isArray(spot.reasons)) {
      spot.reasons.forEach(function (r) {
        if (!r) return;
        const low = String(r).toLowerCase();
        if (low.indexOf('clásica') >= 0 || low.indexOf('clasica') >= 0) return;
        if (low.indexOf('debes') >= 0 || low.indexOf('haz ') >= 0) return;
        if (catchCoherent === false && low.indexOf('bluffcatch') >= 0) return;
        if (bullets.length < 6) bullets.push(r);
      });
    }

    if (!headline) {
      if (intent === 'bluff_make') headline = 'Análisis de farol';
      else if (intent === 'bluff_catch') headline = 'Análisis de bluffcatch';
      else headline = 'Análisis de agresión';
    }

    return {
      intent: intent,
      headline: headline,
      paragraphs: paragraphs,
      bullets: bullets.slice(0, 6),
      contextLine: ctx,
      sizing: sizing,
      acceptableBluff: acceptableBluff,
      catchCoherent: catchCoherent,
      band: band,
      summary: paragraphs.join(' ')
    };
  }

  /** HTML compacto para feedback / hand-end / advisor. */
  function renderHtml(analysis, escapeFn) {
    if (!analysis) return '';
    const esc = typeof escapeFn === 'function' ? escapeFn : function (s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };
    let html = '<div class="bluff-analysis">';
    html += '<strong>' + esc(analysis.headline) + '</strong>';
    if (analysis.paragraphs && analysis.paragraphs.length) {
      html += '<div class="bluff-analysis-body">' + esc(analysis.paragraphs.join(' ')) + '</div>';
    }
    if (analysis.bullets && analysis.bullets.length) {
      html += '<ul class="bluff-analysis-bullets">';
      analysis.bullets.forEach(function (b) {
        html += '<li>' + esc(b) + '</li>';
      });
      html += '</ul>';
    }
    html += '</div>';
    return html;
  }

  /**
   * ¿El farol elegido merece clase «aceptable»?
   * Usado por el classifier / LocalSolverProvider.
   */
  function shouldMarkAcceptable(input, cls) {
    if (cls === 'optima' || cls === 'aceptable') return false;
    if (!isAggro(input.chosenAction || input.action)) return false;
    const a = analyze(Object.assign({}, input, { class: cls }));
    return !!a.acceptableBluff;
  }

  global.GTOBluffAnalysis = {
    analyze: analyze,
    renderHtml: renderHtml,
    assessBluffSizing: assessBluffSizing,
    shouldMarkAcceptable: shouldMarkAcceptable,
    contextLine: contextLine,
    isAggro: isAggro
  };
})(typeof window !== 'undefined' ? window : globalThis);
