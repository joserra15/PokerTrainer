/*
 * ai-hand-payload.js — Normaliza manos (Jugar / Sesiones) a JSON sin datos personales.
 */
(function (global) {
  'use strict';

  function roundGto(gto) {
    if (!gto) return null;
    const out = {};
    Object.keys(gto).forEach((k) => { out[k] = Math.round(gto[k] * 1000) / 1000; });
    return out;
  }

  function slimDecision(d) {
    const mp = d.mathParams || {};
    return {
      street: d.street,
      chosen: d.action || d.chosen,
      chosenLabel: d.label || null,
      best: d.best,
      class: d.class,
      evLossBB: d.evLoss != null ? d.evLoss : null,
      evErroneous: !!d.evErroneous,
      heroEquityPct: d.heroEquity != null ? d.heroEquity : null,
      toCallBB: d.toCallBB != null ? d.toCallBB : null,
      potBB: d.potBB != null ? d.potBB : null,
      potOddsPct: mp.potOddsPct != null ? mp.potOddsPct : null,
      breakEvenPct: mp.breakEvenPct != null ? mp.breakEvenPct : null,
      gto: roundGto(d.gto),
      context: d.context || null,
      explanation: d.explanation || null,
      villainRange: d.villainRange || null,
      villainAudit: d.villainAudit
        ? { severity: d.villainAudit.severity, label: d.villainAudit.label }
        : null
    };
  }

  function scenarioLabel(scenario) {
    if (!scenario) return 'unknown';
    if (scenario.type === 'RFI') return 'RFI ' + scenario.heroPos;
    if (scenario.type === 'vsRFI') return (scenario.key || '').replace(/_/g, ' ');
    if (scenario.type === 'squeeze') return scenario.heroPos + ' squeeze';
    if (scenario.type === 'isoLimp') return scenario.heroPos + ' iso';
    return scenario.type || 'spot';
  }

  function formatAction(item) {
    const t = item.type || '';
    if (t === 'raise' && item.to != null) return 'raise to ' + item.to;
    if (t === 'bet' && item.amount != null) return 'bet ' + item.amount;
    if (t === 'call' && item.amount != null) return 'call ' + item.amount;
    return t;
  }

  function timelineFromSession(h, heroPos) {
    return (h.summary || []).map((item) => {
      if (item.kind === 'street') {
        return { kind: 'street', street: item.street, board: item.board || [] };
      }
      const isHero = item.pos === heroPos || item.pos === h.heroPos;
      return {
        kind: 'action',
        street: item.street,
        seat: item.pos || (isHero ? h.heroPos : 'VILLAIN'),
        move: formatAction(item),
        allin: !!item.allin
      };
    });
  }

  function timelineFromTrainer(hand) {
    const tl = [];
    let lastStreet = null;
    (hand.decisions || []).forEach((d) => {
      if (d.street !== lastStreet) {
        tl.push({ kind: 'street', street: d.street, board: d.board || [] });
        lastStreet = d.street;
      }
      tl.push({
        kind: 'action',
        street: d.street,
        seat: hand.hero.pos,
        move: d.label || d.action,
        hero: true
      });
    });
    return tl;
  }

  function buildGtoSummary(decisions) {
    const order = ['optima', 'aceptable', 'imprecisa', 'error'];
    let worst = 'optima';
    let n = 0;
    let good = 0;
    const critical = [];
    (decisions || []).forEach((d) => {
      n++;
      if (d.class === 'optima' || d.class === 'aceptable') good++;
      if (order.indexOf(d.class) > order.indexOf(worst)) worst = d.class;
      if (d.class === 'error' || d.class === 'imprecisa') {
        critical.push({ street: d.street, chosen: d.chosen || d.action, best: d.best, evLossBB: d.evLossBB });
      }
    });
    return {
      decisions: n,
      accuracyPct: n ? Math.round((good / n) * 100) : 100,
      worstClass: worst,
      criticalErrors: critical
    };
  }

  function fromTrainer(hand) {
    const r = hand.result || {};
    const decisions = (hand.decisions || []).map(slimDecision);
    return {
      meta: {
        handId: String(hand.id),
        source: 'trainer',
        analysisVersion: global.PT_BUILD || '1',
        locale: 'es'
      },
      setup: {
        scenario: scenarioLabel(hand.scenario),
        heroPos: hand.hero.pos,
        heroCode: hand.hero.code,
        heroCards: hand.hero.cards,
        villainPos: hand.villain.pos,
        effectiveStacksBB: hand.effStack || 100
      },
      timeline: timelineFromTrainer(hand),
      heroDecisions: decisions,
      result: {
        heroNetBB: r.heroNet != null ? r.heroNet : 0,
        totalEvLossBB: r.totalEvLoss != null ? r.totalEvLoss : 0,
        reason: r.reason || '',
        board: r.board || hand.board || [],
        villainCards: r.villainCards || null,
        villainHandName: r.villainHandName || null,
        heroHandName: r.heroHandName || null,
        villainProfile: r.villainProfile || null
      },
      gtoSummary: buildGtoSummary(decisions)
    };
  }

  function fromSession(h) {
    const decisions = (h.decisions || []).map(slimDecision);
    const showdownHands = Object.values(h.villainShows || {}).filter((c) => Array.isArray(c) && c.length);
    const villainCards = showdownHands.length ? showdownHands[0] : null;
    return {
      meta: {
        handId: String(h.id),
        source: 'session',
        analysisVersion: global.PT_BUILD || '1',
        locale: 'es'
      },
      setup: {
        scenario: 'imported_cash',
        heroPos: h.heroPos,
        heroCode: h.heroCode,
        heroCards: h.heroCards,
        stakes: { sb: h.sb, bb: h.bb }
      },
      timeline: timelineFromSession(h, h.heroPos),
      heroDecisions: decisions,
      result: {
        heroNetBB: h.heroNetBB != null ? h.heroNetBB : 0,
        totalEvLossBB: h.totalEvLoss != null ? h.totalEvLoss : 0,
        board: h.board || [],
        villainCards: villainCards,
        accuracyPct: h.accuracy,
        worstClass: h.worstClass
      },
      gtoSummary: buildGtoSummary(decisions)
    };
  }

  function build(source, handObj) {
    if (!handObj) return null;
    if (source === 'session') return fromSession(handObj);
    return fromTrainer(handObj);
  }

  function cacheKey(handId) {
    return String(handId) + '_' + (global.PT_BUILD || '1');
  }

  global.PTAIHandPayload = { build, cacheKey };
})(window);
