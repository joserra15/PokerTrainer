/*
 * ai-hand-payload.js — JSON compacto para informe IA (sin narrativa duplicada).
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
    const o = {
      st: d.street,
      ch: d.chosen || d.action,
      ok: d.best,
      cl: d.class
    };
    const ev = d.evLossBB != null ? d.evLossBB : (d.evLoss != null ? d.evLoss : null);
    if (ev) o.ev = ev;
    const eq = d.heroEquityPct != null ? d.heroEquityPct : (d.heroEquity != null ? d.heroEquity : null);
    if (eq != null) o.eq = eq;
    if (d.toCallBB) o.call = d.toCallBB;
    if (d.potBB) o.pot = d.potBB;
    const gto = roundGto(d.gto);
    if (gto) o.gto = gto;
    if (d.villainAudit && d.villainAudit.severity === 'critical') o.vAudit = d.villainAudit.label;
    return o;
  }

  function scenarioLabel(scenario) {
    if (!scenario) return 'unknown';
    if (scenario.type === 'RFI') return 'RFI ' + scenario.heroPos;
    if (scenario.type === 'vsRFI') return (scenario.key || '').replace(/_/g, ' ');
    if (scenario.type === 'squeeze') return scenario.heroPos + ' squeeze';
    if (scenario.type === 'isoLimp') return scenario.heroPos + ' iso';
    return scenario.type || 'spot';
  }

  function moveCode(item) {
    const t = item.type || '';
    if (t === 'raise' && item.to != null) return 'r' + item.to;
    if (t === 'bet' && item.amount != null) return 'b' + item.amount;
    if (t === 'call' && item.amount != null) return 'c' + item.amount;
    return t[0] || '?';
  }

  function villainLineFromSummary(summary, heroPos) {
    if (!summary || !summary.length) return '';
    const parts = [];
    summary.forEach((item) => {
      if (item.kind !== 'action' || item.pos === heroPos) return;
      const st = (item.street || '')[0];
      parts.push(st + ':' + moveCode(item) + (item.allin ? '!' : ''));
    });
    return parts.join('|');
  }

  function compactRangeLog(log) {
    if (!log || !log.length) return null;
    return log.map((e) => {
      const st = (e.street || '')[0];
      const amt = e.amountBB != null ? e.amountBB + 'bb' : '';
      return st + ':' + (e.label || '') + (amt ? '/' + amt : '') + '=' + (e.summary || e.note || '');
    });
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
        critical.push({
          st: d.street,
          ch: d.chosen || d.action,
          ok: d.best,
          ev: d.evLossBB != null ? d.evLossBB : d.evLoss
        });
      }
    });
    return {
      n: n,
      acc: n ? Math.round((good / n) * 100) : 100,
      worst: worst,
      errs: critical.length ? critical : undefined
    };
  }

  function fromTrainer(hand) {
    const r = hand.result || {};
    const decisions = (hand.decisions || []).map(slimDecision);
    const villain = {
      pos: hand.villain.pos,
      prof: r.villainProfileShort || r.villainProfile || null,
      line: compactRangeLog(r.villainRangeLog),
      rng: r.villainRangeSummary || null
    };
    if (r.villainCards) villain.show = r.villainCards;
    return {
      src: 'trainer',
      spot: scenarioLabel(hand.scenario),
      hero: { pos: hand.hero.pos, code: hand.hero.code, cards: hand.hero.cards },
      board: r.board || hand.board || [],
      stack: hand.effStack || 100,
      dec: decisions,
      vil: villain,
      res: {
        net: r.heroNet != null ? r.heroNet : 0,
        evLoss: r.totalEvLoss != null ? r.totalEvLoss : 0,
        heroHand: r.heroHandName || null,
        vilHand: r.villainHandName || null
      },
      gto: buildGtoSummary(decisions),
      solverNote: 'eq/gto/ev son estimaciones del solver local; la IA debe verificar con sus propios cálculos.'
    };
  }

  function fromSession(h) {
    const decisions = (h.decisions || []).map(slimDecision);
    const showdownHands = Object.values(h.villainShows || {}).filter((c) => Array.isArray(c) && c.length);
    const villain = {
      line: villainLineFromSummary(h.summary, h.heroPos) || undefined,
      show: showdownHands.length ? showdownHands[0] : undefined
    };
    return {
      src: 'session',
      spot: 'imported',
      hero: { pos: h.heroPos, code: h.heroCode, cards: h.heroCards },
      board: h.board || [],
      dec: decisions,
      vil: villain,
      res: {
        net: h.heroNetBB != null ? h.heroNetBB : 0,
        evLoss: h.totalEvLoss != null ? h.totalEvLoss : 0,
        acc: h.accuracy
      },
      gto: buildGtoSummary(decisions),
      solverNote: 'eq/gto/ev son estimaciones del solver local; la IA debe verificar con sus propios cálculos.'
    };
  }

  function build(source, handObj) {
    if (!handObj) return null;
    return source === 'session' ? fromSession(handObj) : fromTrainer(handObj);
  }

  function cacheKey(handId) {
    return String(handId) + '_' + (global.PT_BUILD || '1');
  }

  global.PTAIHandPayload = { build, cacheKey };
})(window);
