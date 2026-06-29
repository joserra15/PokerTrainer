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

  function buildStats(data) {
    const st = data.stats || {};
    const byStreet = st.byStreet || {};
    const total = st.decisions || 0;
    const accuracy = total ? Math.round(((st.optima + st.aceptable) / total) * 100) : 0;
    const weekly = (data.weekly || []).map(function (w) {
      return {
        w: w.label,
        hands: w.hands,
        acc: w.accuracy,
        ev: w.evLoss
      };
    });
    const leaks = (data.leaks || []).map(function (l) {
      return { spot: l.label, n: l.count, ev: Math.round(l.evLoss * 100) / 100 };
    });
    return {
      src: 'statsGlobal',
      st: {
        hands: st.handsPlayed || 0,
        decisions: total,
        acc: accuracy,
        net: Math.round((st.totalNet || 0) * 100) / 100,
        evLost: Math.round((st.totalEvLoss || 0) * 100) / 100,
        accSt: {
          pf: byStreet.preflop ? Math.round((byStreet.preflop.good / Math.max(byStreet.preflop.n, 1)) * 100) : null,
          fl: byStreet.flop ? Math.round((byStreet.flop.good / Math.max(byStreet.flop.n, 1)) * 100) : null,
          tu: byStreet.turn ? Math.round((byStreet.turn.good / Math.max(byStreet.turn.n, 1)) * 100) : null,
          ri: byStreet.river ? Math.round((byStreet.river.good / Math.max(byStreet.river.n, 1)) * 100) : null
        },
        dist: {
          o: st.optima || 0,
          a: st.aceptable || 0,
          i: st.imprecisa || 0,
          e: st.error || 0
        }
      },
      progress: weekly.length ? weekly : undefined,
      leaks: leaks.length ? leaks : undefined,
      solverNote: 'Estadísticas del entrenador local. eq/gto/ev son estimaciones; verifica lo crítico.'
    };
  }

  function statsCacheKey(mode, question) {
    const base = 'stats_' + (global.PT_BUILD || '1');
    if (mode === 'question' && question) {
      let h = 0;
      const s = String(question).trim().toLowerCase();
      for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
      return base + '_q_' + Math.abs(h).toString(36);
    }
    return base + '_report';
  }
  function build(source, handObj) {
    if (!handObj) return null;
    if (source === 'statsGlobal') return buildStats(handObj);
    if (source === 'sessionGlobal') return buildSession(handObj);
    return source === 'session' ? fromSession(handObj) : fromTrainer(handObj);
  }

  function wcShort(c) {
    return { optima: 'o', aceptable: 'a', imprecisa: 'i', error: 'e' }[c] || c;
  }

  function boardCompact(cards) {
    return (cards || []).join('');
  }

  function slimHandLeak(h) {
    const bad = (h.decisions || []).filter(function (d) {
      return d.class === 'error' || d.class === 'imprecisa' ||
        (d.evLossBB != null ? d.evLossBB : (d.evLoss || 0)) > 0;
    });
    const o = {
      id: h.id,
      h: h.heroCode + ' ' + h.heroPos,
      net: h.heroNetBB,
      ev: h.totalEvLoss,
      acc: h.accuracy,
      wc: wcShort(h.worstClass)
    };
    if (h.board && h.board.length) o.brd = boardCompact(h.board);
    if (bad.length) o.dec = bad.map(slimDecision);
    const vil = villainLineFromSummary(h.summary, h.heroPos);
    if (vil) o.vil = vil;
    return o;
  }

  function slimHandTiny(h) {
    return String(h.id) + '|' + h.heroCode + ' ' + h.heroPos + '|' +
      h.heroNetBB + '|' + h.totalEvLoss + '|' + wcShort(h.worstClass);
  }

  function buildSession(session) {
    const st = session.stats || {};
    const hands = session.hands || [];
    const bb = hands[0] && hands[0].bb ? hands[0].bb : null;
    const accSt = st.accByStreet || {};
    const dist = st.dist || {};

    const leakHands = hands.filter(function (h) {
      return h.totalEvLoss > 0 || h.worstClass === 'error' || h.worstClass === 'imprecisa';
    });
    leakHands.sort(function (a, b) { return b.totalEvLoss - a.totalEvLoss; });
    const leakCap = 45;
    const leaks = leakHands.slice(0, leakCap).map(slimHandLeak);
    const leakIds = new Set(leaks.map(function (l) { return l.id; }));
    const clean = hands.filter(function (h) { return !leakIds.has(h.id); }).map(slimHandTiny);

    const payload = {
      src: 'sessionGlobal',
      name: String(session.fileName || 'session').replace(/\.txt$/i, ''),
      bb: bb,
      st: {
        n: st.nHands,
        acc: st.accuracy,
        net: st.netBB,
        evLost: st.evLossBB,
        expNet: st.expectedNet,
        var: st.varianceAdj,
        grade: st.grade ? (st.grade.letter + ' ' + st.grade.score) : null,
        accSt: {
          pf: accSt.preflop,
          fl: accSt.flop,
          tu: accSt.turn,
          ri: accSt.river
        },
        dist: {
          o: dist.optima || 0,
          a: dist.aceptable || 0,
          i: dist.imprecisa || 0,
          e: dist.error || 0
        },
        pctLeak: st.pctDecision,
        pctVar: st.pctVariance
      },
      solverNote: 'eq/gto/ev son estimaciones del solver; verifica lo crítico. clean=id|mano pos|net|ev|wc'
    };
    if (leaks.length) payload.leaks = leaks;
    if (leakHands.length > leakCap) payload.leakTrunc = leakHands.length;
    if (clean.length) payload.clean = clean;
    return payload;
  }

  function cacheKey(handId) {
    return String(handId) + '_' + (global.PT_BUILD || '1');
  }

  function sessionCacheKey(sessionId, mode, question) {
    const base = 'ses_' + String(sessionId) + '_' + (global.PT_BUILD || '1');
    if (mode === 'question' && question) {
      let h = 0;
      const s = String(question).trim().toLowerCase();
      for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
      return base + '_q_' + Math.abs(h).toString(36);
    }
    return base + '_report';
  }

  global.PTAIHandPayload = { build, cacheKey, sessionCacheKey, statsCacheKey, buildSession, buildStats };
})(window);
