/*
 * tournament/villain-decide.js — Villanos de torneo con motor Pro+ del entrenador.
 * Estilos fish/nit/tag/lag/maniac/pro sobre dificultad pro (keepArchetype).
 * Fuerza relativa al board, push/fold, steals, check-raise y presión de línea.
 */
(function (global) {
  'use strict';

  function r2(x) {
    return Math.round((Number(x) || 0) * 100) / 100;
  }

  function cardCode(c) {
    if (!c) return '';
    if (typeof c === 'string') return c;
    return c.code || (c.r != null && c.s ? String(c.r) + c.s : '');
  }

  function toCodes(cards) {
    if (!cards || !cards.length) return [];
    return cards.map(function (c) {
      return typeof c === 'string' ? c : cardCode(c);
    }).filter(Boolean);
  }

  function handCode(cards) {
    if (!cards || cards.length < 2) return null;
    var C = global.Cards;
    if (C && C.handCode) {
      try { return C.handCode(cards[0], cards[1]); } catch (e) { /* */ }
    }
    var a = cardCode(cards[0]);
    var b = cardCode(cards[1]);
    if (!a || !b) return null;
    var order = '23456789TJQKA';
    var ra = order.indexOf(a[0]);
    var rb = order.indexOf(b[0]);
    var hi = ra >= rb ? a : b;
    var lo = ra >= rb ? b : a;
    if (hi[0] === lo[0]) return hi[0] + lo[0];
    return hi[0] + lo[0] + (hi[1] === lo[1] ? 's' : 'o');
  }

  function mapRoleId(roleId) {
    var id = String(roleId || 'tag').toLowerCase();
    if (id === 'maniac') return 'maniac';
    var ok = { fish: 1, nit: 1, tag: 1, lag: 1, maniac: 1, pro: 1 };
    return ok[id] ? id : 'tag';
  }

  /**
   * Estilos de mesa = sesgo sobre motor Pro+, no pasividad extrema.
   * Tag/pro: más c-bet / bluff / raise; lag/maniac siguen muy agresivos.
   */
  function tournamentPostflopFloor(role, postflop) {
    var pf = Object.assign({}, postflop || {});
    var floors = {
      fish:   { bet: 1.05, bluff: 0.85, raise: 0.95, call: 1.4, fold: 0.7 },
      nit:    { bet: 0.92, bluff: 0.55, raise: 0.85, call: 0.95, fold: 0.95 },
      tag:    { bet: 1.35, bluff: 1.2,  raise: 1.4,  call: 1.0, fold: 0.95 },
      lag:    { bet: 1.55, bluff: 1.55, raise: 1.55, call: 1.1, fold: 0.65 },
      maniac: { bet: 1.75, bluff: 1.9,  raise: 1.85, call: 1.15, fold: 0.5 },
      pro:    { bet: 1.35, bluff: 1.25, raise: 1.45, call: 1.0, fold: 0.95 }
    };
    var f = floors[role] || floors.tag;
    function floor(key, minV, maxV) {
      var cur = Number(pf[key]);
      if (!isFinite(cur)) cur = minV;
      pf[key] = Math.max(minV, Math.min(maxV != null ? maxV : 2.4, cur));
    }
    floor('betFreqMult', f.bet);
    floor('bluffFreqMult', f.bluff);
    floor('raiseFreqMult', f.raise);
    floor('callMult', f.call);
    floor('foldMult', 0.35, f.fold);
    if (pf.betSizeMult == null || pf.betSizeMult < 0.85) pf.betSizeMult = 0.95;
    return pf;
  }

  function aiLevelOf(hand) {
    var cfg = (hand && hand.tournamentConfig) || {};
    var v = cfg.aiLevel || (hand && hand.state && hand.state.aiLevel);
    if (v === 'solid' || v === 'strong' || v === 'elite' || v === 'exploit_pro') return v;
    return 'elite';
  }

  function profileForSeat(seat, hand) {
    var VP = global.GTOVillainProfiles;
    var role = mapRoleId(seat && seat.roleId);
    var aiLevel = aiLevelOf(hand);
    if (!VP || typeof VP.applyDifficulty !== 'function') {
      return {
        id: role,
        preflopStrict: aiLevel === 'solid' ? 0.85 : 0.92,
        postflop: tournamentPostflopFloor(role, {
          betFreqMult: 1.15, bluffFreqMult: 1, raiseFreqMult: 1.15, callMult: 1.05, foldMult: 0.9
        }),
        proStyle: seat && seat.proStyle || null,
        aiLevel: aiLevel
      };
    }
    var base = typeof VP.getProfile === 'function' ? VP.getProfile(role) : role;
    var difficulty = (aiLevel === 'solid' || aiLevel === 'strong') ? 'intermediate' : 'pro';
    var prof = VP.applyDifficulty(base, difficulty, { forced: true, keepArchetype: true });
    if (aiLevel === 'strong') {
      /* Entre intermediate y pro: más estricto preflop, menos leak. */
      prof = Object.assign({}, prof, {
        preflopStrict: Math.max(Number(prof.preflopStrict) || 0, 0.9),
        leakRate: Math.min(Number(prof.leakRate) || 0.05, 0.015)
      });
    }
    if (aiLevel === 'solid') {
      /* Sólido (no fish): floors un poco más suaves que el pro de torneo. */
      var softFloor = tournamentPostflopFloor(role, prof.postflop);
      if (softFloor) {
        softFloor = Object.assign({}, softFloor);
        softFloor.betFreqMult = Math.max(0.85, (Number(softFloor.betFreqMult) || 1) * 0.92);
        softFloor.raiseFreqMult = Math.max(0.85, (Number(softFloor.raiseFreqMult) || 1) * 0.9);
        softFloor.bluffFreqMult = Math.max(0.7, (Number(softFloor.bluffFreqMult) || 1) * 0.88);
        softFloor.foldMult = Math.min(1.15, (Number(softFloor.foldMult) || 1) * 1.05);
      }
      prof = Object.assign({}, prof, { postflop: softFloor });
    } else {
      prof = Object.assign({}, prof, {
        postflop: tournamentPostflopFloor(role, prof.postflop)
      });
    }
    if (seat && seat.proStyle) {
      prof = Object.assign({}, prof, { proStyle: seat.proStyle });
    }
    // Pros explotativos: un poco más de agresividad postflop.
    if ((prof.proStyle === 'exploit_pool' || aiLevel === 'exploit_pro') && prof.postflop) {
      if (aiLevel === 'exploit_pro' && !prof.proStyle) {
        prof = Object.assign({}, prof, { proStyle: 'exploit_pool' });
      }
      var pf = Object.assign({}, prof.postflop);
      pf.betFreqMult = Math.min(2.2, (Number(pf.betFreqMult) || 1) * 1.12);
      pf.raiseFreqMult = Math.min(2.2, (Number(pf.raiseFreqMult) || 1) * 1.14);
      pf.bluffFreqMult = Math.min(2.2, (Number(pf.bluffFreqMult) || 1) * 1.1);
      pf.foldMult = Math.max(0.35, (Number(pf.foldMult) || 1) * 0.94);
      prof = Object.assign({}, prof, { postflop: pf });
    }
    prof = Object.assign({}, prof, { aiLevel: aiLevel });
    return prof;
  }

  function holeStrength01(hole) {
    if (!hole || hole.length < 2) return 0.1;
    var ranks = '23456789TJQKA';
    function rv(c) {
      return Math.max(0, ranks.indexOf(cardCode(c).charAt(0)));
    }
    var a = rv(hole[0]);
    var b = rv(hole[1]);
    var pair = cardCode(hole[0]).charAt(0) === cardCode(hole[1]).charAt(0);
    var suited = cardCode(hole[0]).charAt(1) === cardCode(hole[1]).charAt(1);
    return Math.max(0.05, Math.min(0.95,
      (Math.max(a, b) / 12) * 0.55 + (Math.min(a, b) / 12) * 0.2 +
      (pair ? 0.25 : 0) + (suited ? 0.08 : 0)
    ));
  }

  function highHoleRank01(hole) {
    var ranks = '23456789TJQKA';
    var a = Math.max(0, ranks.indexOf(cardCode(hole[0]).charAt(0)));
    var b = Math.max(0, ranks.indexOf(cardCode(hole[1]).charAt(0)));
    return Math.max(a, b) / 12;
  }

  /**
   * Fuerza board-relative. Preferir GTOEquityMadeHand.relativeStrength01;
   * fallback: nunca tratar two-pair del board como 0.58+.
   */
  function strength01(hole, board, street) {
    var C = global.Cards;
    var Made = global.GTOEquityMadeHand;
    board = board || [];
    var holeStr = holeStrength01(hole);
    if (!hole || hole.length < 2) return 0.1;

    var holeCodes = toCodes(hole);
    var boardCodes = toCodes(board);

    if (Made && typeof Made.relativeStrength01 === 'function' && boardCodes.length >= 3) {
      try {
        var rel = Made.relativeStrength01(holeCodes, boardCodes, street || 'flop');
        if (rel != null && isFinite(Number(rel))) {
          return Math.max(0.06, Math.min(0.98, Number(rel)));
        }
      } catch (eRel) { /* fallback abajo */ }
    }

    if (C && C.evaluate && boardCodes.length >= 3) {
      try {
        var full = C.evaluate(holeCodes.concat(boardCodes));
        var boardOnly = C.evaluate(boardCodes.slice());
        var cat = null;
        if (full && full.category != null && isFinite(Number(full.category))) {
          cat = Number(full.category);
        } else if (full && Array.isArray(full.rank) && isFinite(Number(full.rank[0])) && Number(full.rank[0]) <= 8) {
          cat = Number(full.rank[0]);
        } else if (full && typeof full.rank === 'number' && full.rank > 20) {
          return Math.max(0.05, Math.min(0.98, 1 - (full.rank / 7462)));
        }
        var bcat = boardOnly && boardOnly.category != null ? Number(boardOnly.category) : -1;
        var fullPri = (full && Array.isArray(full.rank)) ? (full.rank[1] || 0) : 0;
        var boardPri = (boardOnly && Array.isArray(boardOnly.rank)) ? (boardOnly.rank[1] || 0) : 0;
        var sameCat = cat != null && cat === bcat;
        var primaryMatch = sameCat && fullPri === boardPri;

        /* Playing the board / solo kicker → débil 0.10–0.30. */
        if (sameCat && primaryMatch) {
          var kick = highHoleRank01(hole);
          return Math.max(0.10, Math.min(0.30, 0.10 + kick * 0.20));
        }
        if (cat != null && cat >= 0 && cat <= 8) {
          var made = 0.16 + (cat / 8) * 0.72;
          if (cat <= 0) made = Math.max(made, 0.2 + holeStr * 0.5);
          else if (cat === 1) made = Math.max(made, 0.42 + holeStr * 0.25);
          else if (cat === 2) {
            /* Nunca scorear two-pair del board como value fuerte. */
            if (bcat === 2) made = Math.min(made, 0.30);
            else made = Math.max(made, 0.58);
          }
          return Math.max(0.08, Math.min(0.98, made));
        }
      } catch (e) { /* */ }
    }
    return holeStr;
  }

  function aliveSeats(hand) {
    return (hand && hand.seats ? hand.seats : []).filter(function (s) {
      return s && !s.folded;
    });
  }

  function isHeadsUp(hand) {
    var seats = hand && hand.seats ? hand.seats : [];
    if (seats.length === 2) return true;
    return aliveSeats(hand).length === 2;
  }

  function callEdgeForRole(role) {
    if (role === 'fish') return 0.04;
    if (role === 'nit') return 0.12;
    if (role === 'lag' || role === 'maniac') return 0.06;
    if (role === 'pro') return 0.10;
    return 0.08; /* tag */
  }

  function rangeCtx(hand, seat) {
    var bb = Math.max(1, Number(hand.bb) || 1);
    var stackBB = (Number(seat && seat.stack) || 0) / bb;
    var hub = (hand && hand.formatHub)
      || (hand && hand.state && hand.state.formatHub)
      || ((hand && hand.kind === 'spin') ? 'spin' : 'mtt');
    var Tax = global.PTFormatTaxonomy;
    var TC = global.PTTournamentContext;
    var phase = (hand && hand.mttPhase)
      || (hand && hand.state && hand.state.mttPhase)
      || 'auto';
    if ((!phase || phase === 'auto') && Tax && Tax.phaseFromStackBB) {
      try { phase = Tax.phaseFromStackBB(stackBB, hub); } catch (e) { /* */ }
    } else if ((!phase || phase === 'auto') && TC && TC.phaseFromStackBB) {
      phase = TC.phaseFromStackBB(stackBB, hub);
    }
    var st = (hand && hand.state) || {};
    var cfg = (hand && hand.tournamentConfig) || {};
    var heroStats = st.heroSessionStats || st.heroStats || hand.heroSessionStats || null;
    var Ex = global.GTOVillainProExploit;
    var heroProfile = null;
    if (Ex && Ex.profileFromStats && heroStats) {
      try { heroProfile = Ex.profileFromStats(heroStats); } catch (eHp) { heroProfile = null; }
    }
    var ctx = {
      formatHub: hub,
      gameType: hub === 'spin' ? 'spin3' : 'mtt',
      isTournament: true,
      stackBB: stackBB,
      street: (hand && hand.street) || 'preflop',
      mttPhase: phase,
      resolvedPhase: phase,
      effectivePhase: phase,
      tournamentType: (hand && hand.tournamentType)
        || st.tournamentType
        || cfg.tournamentType
        || 'unknown',
      playersSeated: (hand && hand.playersSeated)
        || (hand && hand.seats && hand.seats.length)
        || st.playersSeated
        || null,
      tableMax: (hand && hand.tableMax) || st.tableMax || cfg.seatsPerTable || null,
      anteBB: (hand && hand.anteBB != null)
        ? Number(hand.anteBB)
        : ((hand && hand.ante != null && bb > 0) ? Number(hand.ante) / bb : 0),
      playersLeft: st.playersLeft != null ? st.playersLeft
        : (hand && hand.playersLeft != null ? hand.playersLeft : null),
      placesPaid: st.placesPaid != null ? st.placesPaid
        : (cfg.placesPaid != null ? cfg.placesPaid
          : (hand && hand.placesPaid != null ? hand.placesPaid : null)),
      entries: st.entries != null ? st.entries : (cfg.entries != null ? cfg.entries : null),
      mttStructureSituation: st.mttStructureSituation
        || (hand && hand.mttStructureSituation)
        || null,
      heroProfile: heroProfile,
      heroSessionStats: heroStats,
      proStyle: (seat && seat.proStyle) || null
    };
    if ((!phase || phase === 'auto' || phase === 'early' || phase === 'mid')
      && ctx.mttStructureSituation === 'bubble') {
      ctx.mttPhase = 'bubble';
      ctx.resolvedPhase = 'bubble';
      ctx.effectivePhase = 'bubble';
    } else {
      ctx.mttPhase = phase;
      ctx.resolvedPhase = phase;
      ctx.effectivePhase = phase;
    }
    if (Tax && Tax.usesIcm) {
      try { ctx.icmEnabled = !!Tax.usesIcm(ctx); } catch (e2) { ctx.icmEnabled = hub !== 'cash'; }
    } else {
      ctx.icmEnabled = true;
    }
    var RR = global.GTORangesRegistry;
    if (RR && typeof RR.normalize === 'function') {
      try {
        var norm = RR.normalize(ctx);
        if (!ctx.effectivePhase || ctx.effectivePhase === 'auto') {
          ctx.effectivePhase = norm.effectivePhase || phase;
          ctx.resolvedPhase = norm.effectivePhase || phase;
        }
        ctx.isTournament = true;
        if (norm.stackBB != null) ctx.stackBB = stackBB;
      } catch (e3) { /* */ }
    }
    return ctx;
  }

  function applyFormatAdjustToFacing(face, strength, potOdds, ctx, profile, rnd) {
    var FA = global.GTOVillainFormatAdjust;
    var Ex = global.GTOVillainProExploit;
    var r = rnd != null ? rnd : Math.random();
    var m = (FA && typeof FA.multipliers === 'function') ? (FA.multipliers(ctx) || {}) : {};
    var foldPush = (Number(m.fold) || 1) - 1;
    if (ctx.tournamentType === 'pko' || ctx.tournamentType === 'mystery') {
      foldPush *= 0.55;
      if (ctx.stackBB <= 20 && strength > 0.28) foldPush -= 0.08;
    }
    /* HU TAG: menos fold bias. */
    if (ctx.isHeadsUp && profile && profile.id === 'tag') {
      foldPush *= 0.55;
    }
    if (face === 'call' && foldPush > 0.05 && r < foldPush * 0.55) return 'fold';
    if (face === 'fold' && foldPush < -0.02 && strength > potOdds) return 'call';
    if (face === 'raise' && (m.jamBias > 1.25 || ctx.stackBB <= 14) && strength > 0.55) {
      return 'raise';
    }
    if (face === 'raise' && m.raise < 0.75 && r < 0.35) return 'call';

    var proStyle = (profile && profile.proStyle) || (ctx && ctx.proStyle);
    if (proStyle === 'exploit_pool' && Ex && typeof Ex.multipliers === 'function') {
      var exCtx = Object.assign({}, ctx || {}, {
        proStyle: 'exploit_pool',
        strength: strength,
        band: strength > 0.7 ? 'value' : (strength < 0.35 ? 'air' : 'merge')
      });
      var em = Ex.multipliers(exCtx) || {};
      if (face === 'fold' && (em.barrel > 1.15 || em.bluff > 1.12) && strength > potOdds - 0.02 && r < 0.28) {
        return 'call';
      }
      if (face === 'call' && em.thinValue > 1.15 && strength > 0.55 && r < 0.22) {
        return 'raise';
      }
      if (face === 'raise' && em.bluff < 0.85 && strength < 0.38 && r < 0.4) {
        return 'call';
      }
    }
    return face;
  }

  function applyFormatAdjustToLead(lead, strength, ctx, wasAgg, rnd, profile) {
    var FA = global.GTOVillainFormatAdjust;
    var Ex = global.GTOVillainProExploit;
    var r = rnd != null ? rnd : Math.random();
    var m = (FA && typeof FA.multipliers === 'function') ? (FA.multipliers(ctx) || {}) : {};
    var betBoost = ((Number(m.bet) || 1) - 1) + ((Number(m.cbet) || 1) - 1) * (wasAgg ? 1 : 0.4);
    if (lead === 'check' && betBoost > 0.05 && strength > 0.32 && r < Math.min(0.55, 0.28 + betBoost)) {
      return 'bet';
    }
    if (lead === 'bet' && (Number(m.bluff) || 1) < 0.7 && strength < 0.35 && r < 0.4) {
      return 'check';
    }
    if ((ctx.tournamentType === 'pko' || ctx.tournamentType === 'mystery')
      && lead === 'check' && ctx.stackBB <= 18 && strength > 0.4 && r < 0.35) {
      return 'bet';
    }

    var proStyle = (profile && profile.proStyle) || (ctx && ctx.proStyle);
    if (proStyle === 'exploit_pool' && Ex && typeof Ex.multipliers === 'function') {
      var exCtx = Object.assign({}, ctx || {}, {
        proStyle: 'exploit_pool',
        initiative: wasAgg ? 'aggressor' : 'caller',
        strength: strength,
        band: strength > 0.7 ? 'value' : (strength < 0.35 ? 'air' : 'merge')
      });
      var em = Ex.multipliers(exCtx) || {};
      var barrelBoost = ((Number(em.barrel) || 1) - 1) * (wasAgg ? 1 : 0.45);
      var bluffBoost = ((Number(em.bluff) || 1) - 1);
      if (lead === 'check' && (barrelBoost > 0.08 || bluffBoost > 0.08)
        && strength > 0.28 && r < Math.min(0.62, 0.3 + barrelBoost + bluffBoost * 0.5)) {
        return 'bet';
      }
      if (lead === 'bet' && em.bluff < 0.8 && strength < 0.32 && r < 0.45) {
        return 'check';
      }
      if (lead === 'check' && em.thinValue > 1.15 && strength > 0.58 && r < 0.35) {
        return 'bet';
      }
    }
    return lead;
  }

  function raiseCount(hand) {
    var n = 0;
    (hand.log || []).forEach(function (e) {
      if (e.street !== 'preflop') return;
      if (e.action === 'raise' || e.action === 'bet') n += 1;
    });
    return n;
  }

  function openSizeBb(seat, profile) {
    var base = 2.5;
    if (profile && profile.id === 'nit') base = 2.2;
    else if (profile && (profile.id === 'lag' || profile.id === 'maniac')) base = 3;
    if (seat.pos === 'SB') base = Math.min(3.5, base + 0.5);
    return base;
  }

  function sampleBetFrac(profile, street, strength) {
    var VS = global.GTOVillainSizing;
    var rnd = Math.random();
    if (VS && typeof VS.sampleLeadFromStrategy === 'function') {
      try {
        var sample = VS.sampleLeadFromStrategy(
          { check: 0, bet_33: 0.22, bet_66: 0.42, bet_100: 0.26, bet_125: 0.1 },
          10,
          { street: street, strength: strength },
          rnd
        );
        if (sample && sample.action === 'bet' && sample.frac > 0) return sample.frac;
      } catch (e) { /* */ }
    }
    var VP = global.GTOVillainProfiles;
    if (VP && typeof VP.betSizeBB === 'function') {
      var amt = VP.betSizeBB(10, profile, rnd, { street: street, strength: strength });
      if (amt > 0) return amt / 10;
    }
    if (strength > 0.75) return 0.85;
    if (strength < 0.35) return 0.4;
    return 0.66;
  }

  function capRaiseTo(hand, seat, toAmt) {
    var maxTo = seat.streetInvested + seat.stack;
    var minTo = Math.min(maxTo, Math.max(hand.currentBet + hand.minRaise, hand.bb));
    var t = Math.max(minTo, Number(toAmt) || minTo);
    return Math.min(maxTo, r2(t));
  }

  function allInTo(seat) {
    return r2(seat.streetInvested + seat.stack);
  }

  function isPushPhaseCtx(ctx) {
    var PF = global.GTOPushFold;
    if (PF && typeof PF.isPushPhase === 'function') {
      try {
        return !!PF.isPushPhase({
          stackBB: ctx.stackBB,
          formatHub: ctx.formatHub,
          gameType: ctx.gameType,
          mttPhase: ctx.effectivePhase || ctx.mttPhase,
          rangeContext: ctx
        });
      } catch (e) { /* */ }
    }
    return (ctx.effectivePhase || ctx.mttPhase) === 'push' || ctx.stackBB <= 12;
  }

  function isLateStealPos(pos) {
    return pos === 'BTN' || pos === 'CO' || pos === 'SB';
  }

  function sampleStealAction(weights, rnd) {
    var r = rnd != null ? rnd : Math.random();
    var allin = Number(weights && weights.allin) || 0;
    var raise = Number(weights && weights.raise) || 0;
    if (r < allin) return 'allin';
    if (r < allin + raise) return 'raise';
    return 'fold';
  }

  function defendFn(VPF) {
    if (!VPF) return null;
    if (typeof VPF.defendVsOpen === 'function') return VPF.defendVsOpen.bind(VPF);
    if (typeof VPF.defend === 'function') return VPF.defend.bind(VPF);
    return null;
  }

  /**
   * Agresión del héroe en flop/turn/river a partir de hand.log.
   * streetsAgg = calles distintas con bet/raise; checks = checks del héroe.
   */
  function heroLinePressure(hand) {
    var hero = (hand.seats || []).find(function (s) { return s && s.isHero; });
    var heroId = hero && hero.id;
    var aggStreets = {};
    var checkCount = 0;
    var betRaiseCount = 0;
    (hand.log || []).forEach(function (e) {
      if (!e || (e.street !== 'flop' && e.street !== 'turn' && e.street !== 'river')) return;
      var isHero = heroId != null
        ? e.id === heroId
        : !!(hand.seats || []).find(function (s) { return s && s.id === e.id && s.isHero; });
      if (!isHero) return;
      if (e.action === 'bet' || e.action === 'raise') {
        aggStreets[e.street] = true;
        betRaiseCount += 1;
      } else if (e.action === 'check') {
        checkCount += 1;
      }
    });
    var multiStreetAgg = Object.keys(aggStreets).length;
    return {
      multiStreetAgg: multiStreetAgg,
      betRaiseCount: betRaiseCount,
      checkCount: checkCount,
      passive: checkCount >= 2 && betRaiseCount === 0,
      aggressive: multiStreetAgg >= 2 || betRaiseCount >= 2
    };
  }

  function isInPosition(hand, seat) {
    var order = ['SB', 'BB', 'UTG', 'UTG1', 'UTG2', 'LJ', 'HJ', 'CO', 'BTN'];
    var alive = aliveSeats(hand);
    if (alive.length <= 1) return true;
    var myIdx = order.indexOf(seat.pos);
    if (myIdx < 0) myIdx = 0;
    var maxOther = -1;
    for (var i = 0; i < alive.length; i++) {
      if (alive[i].id === seat.id) continue;
      maxOther = Math.max(maxOther, order.indexOf(alive[i].pos));
    }
    return myIdx > maxOther;
  }

  function decidePreflop(hand, seat) {
    var VPF = global.GTOVillainPreflop;
    var PF = global.GTOPushFold;
    var profile = profileForSeat(seat, hand);
    var role = profile.id || mapRoleId(seat.roleId);
    var tc = Math.max(0, hand.currentBet - seat.streetInvested);
    var code = handCode(seat.cards);
    var ctx = rangeCtx(hand, seat);
    var raises = raiseCount(hand);
    var hu = isHeadsUp(hand);
    ctx.isHeadsUp = hu;
    var holeStr = holeStrength01(seat.cards);
    var stackBB = ctx.stackBB;
    var pushPhase = isPushPhaseCtx(ctx);

    /* ---------- Sin opener: open / shove / steal ---------- */
    if (!hand.openerId) {
      if (seat.pos === 'BB' && tc <= 0) return { id: 'check' };

      /* Push/fold corto o fase push. */
      if ((stackBB <= 12 || pushPhase) && PF && typeof PF.shouldOpenShove === 'function' && code) {
        try {
          if (PF.shouldOpenShove(code, seat.pos, stackBB, { rangeContext: ctx, formatHub: ctx.formatHub })) {
            return { id: 'raise', amount: allInTo(seat) };
          }
        } catch (eShove) { /* */ }
        if (stackBB <= 12 || pushPhase) {
          return tc > 0 ? { id: 'fold' } : { id: 'check' };
        }
      }

      /* Steal folded-to late, 12–25 bb. */
      if (isLateStealPos(seat.pos) && stackBB > 12 && stackBB <= 25
        && PF && typeof PF.stealOpenStrategy === 'function' && code) {
        try {
          var steal = PF.stealOpenStrategy({
            handCode: code,
            position: seat.pos,
            heroPos: seat.pos,
            rangeContext: ctx,
            effStack: stackBB,
            stackBB: stackBB,
            formatHub: ctx.formatHub
          });
          var stealAct = sampleStealAction(steal, Math.random());
          if (stealAct === 'allin') {
            return { id: 'raise', amount: allInTo(seat) };
          }
          if (stealAct === 'raise') {
            return {
              id: 'raise',
              amount: Math.min(
                allInTo(seat),
                r2(hand.bb * openSizeBb(seat, profile))
              )
            };
          }
        } catch (eSteal) { /* */ }
      }

      var open = false;
      if (VPF && typeof VPF.isInOpenRange === 'function' && code) {
        try { open = !!VPF.isInOpenRange(code, seat.pos, ctx); } catch (e) { open = false; }
      } else {
        open = holeStr > 0.58;
      }

      /* HU: abrir más ancho desde BTN/SB si no está en chart. */
      if (!open && hu && (seat.pos === 'BTN' || seat.pos === 'SB')) {
        var huOpenThr = 0.40;
        if (role === 'tag') huOpenThr = 0.32;
        else if (role === 'lag' || role === 'pro' || role === 'maniac') huOpenThr = 0.28;
        else if (role === 'nit') huOpenThr = 0.40;
        else if (role === 'fish') huOpenThr = 0.30;
        if (holeStr > huOpenThr) open = true;
      }

      if (open) {
        return {
          id: 'raise',
          amount: Math.min(
            allInTo(seat),
            r2(hand.bb * openSizeBb(seat, profile))
          )
        };
      }
      return tc > 0 ? { id: 'fold' } : { id: 'check' };
    }

    /* ---------- Facing open / 3bet / shove ---------- */
    var opener = (hand.seats || []).find(function (s) { return s && s.id === hand.openerId; });
    var openerAllIn = !!(opener && (opener.allIn || opener.stack <= 0));
    var facingShove = openerAllIn || (tc > 0 && tc >= seat.stack * 0.85);

    if ((hu && stackBB <= 12) || facingShove || (pushPhase && facingShove)) {
      if (PF && typeof PF.shouldCallShove === 'function' && code) {
        try {
          var callShove = PF.shouldCallShove(
            code, seat.pos, stackBB, hand.openerPos || (opener && opener.pos) || 'BTN',
            { rangeContext: ctx, formatHub: ctx.formatHub }
          );
          if (callShove) return { id: 'call' };
        } catch (eCs) { /* */ }
      }
      if (facingShove || (hu && stackBB <= 12 && pushesOrShort(stackBB, pushPhase))) {
        /* Fuera de chart de call-shove: fold (salvo premium holeStr). */
        if (holeStr > 0.82) return { id: 'call' };
        return tc <= 0 ? { id: 'check' } : { id: 'fold' };
      }
    }

    var action = 'fold';
    var defend = defendFn(VPF);
    if (VPF && code) {
      try {
        if (raises >= 3 && typeof VPF.villainVs4BetAction === 'function') {
          action = VPF.villainVs4BetAction(code, profile, Math.random()) || 'fold';
        } else if (raises >= 2 && hand.openerId === seat.id &&
            typeof VPF.openerVs3BetAction === 'function') {
          action = VPF.openerVs3BetAction(code, profile, Math.random(), ctx) || 'fold';
        } else if (defend) {
          action = defend(
            code, profile, Math.random(), seat.pos, hand.openerPos || 'CO', ctx
          ) || 'fold';
        }
      } catch (e2) {
        action = 'fold';
      }
    } else {
      var s0 = holeStr;
      if (s0 > 0.8) action = '3bet';
      else if (s0 > 0.55) action = 'call';
    }

    /* HU: defender BB más ancho si el chart dice fold. */
    if (hu && (action === 'fold' || !action) && (seat.pos === 'BB' || seat.pos === 'SB')) {
      var defThr = 0.42;
      if (role === 'tag') defThr = 0.38;
      else if (role === 'pro' || role === 'lag' || role === 'maniac') defThr = 0.34;
      else if (role === 'nit') defThr = 0.48;
      else if (role === 'fish') defThr = 0.36;
      if (holeStr > defThr) {
        action = holeStr > defThr + 0.18 ? '3bet' : 'call';
      }
    }

    if (action === '3bet' || action === 'raise' || action === '4bet') {
      var mult = raises >= 2 ? 2.3 : (seat.pos === 'SB' || seat.pos === 'BB' ? 3.6 : 3.2);
      if (stackBB <= 12 || pushPhase) {
        return { id: 'raise', amount: allInTo(seat) };
      }
      return { id: 'raise', amount: capRaiseTo(hand, seat, hand.currentBet * mult) };
    }
    if (action === 'call' || action === 'limp') {
      action = applyFormatAdjustToFacing(
        'call', holeStr, tc > 0 ? tc / (hand.pot + tc) : 0, ctx, profile, Math.random()
      );
      if (action === 'fold') return tc <= 0 ? { id: 'check' } : { id: 'fold' };
      return tc <= 0 ? { id: 'check' } : { id: 'call' };
    }
    action = applyFormatAdjustToFacing(
      'fold', holeStr, tc > 0 ? tc / (hand.pot + tc) : 0, ctx, profile, Math.random()
    );
    if (action === 'call') return tc <= 0 ? { id: 'check' } : { id: 'call' };
    return tc <= 0 ? { id: 'check' } : { id: 'fold' };
  }

  function pushesOrShort(stackBB, pushPhase) {
    return stackBB <= 12 || !!pushPhase;
  }

  /**
   * Reglas de fold postflop (sustituyen el anti-overfold tóxico).
   * Retorna 'fold' forzoso, 'ok' si puede seguir, o ajusta call barato.
   */
  function applyPostflopFoldDiscipline(face, strength, potOdds, tc, pot, street, role, rnd) {
    var betFrac = pot > 0 ? tc / pot : 1;
    rnd = rnd != null ? rnd : Math.random();

    /* River air: fold vs ≥25% pot; potOdds minúsculo (<0.08) puede seguir. */
    if (street === 'river' && strength < 0.28) {
      if ((betFrac >= 0.25 || potOdds >= 0.20) && potOdds >= 0.08) return 'fold';
    }
    /* Bluffcatcher barato en river (potOdds tiny). */
    if (street === 'river' && potOdds < 0.08 && strength > 0.35 && face === 'fold') {
      return 'call';
    }

    /* Board-only / kicker-only en turn/river vs ≥33% pot. */
    if ((street === 'turn' || street === 'river') && strength < 0.32) {
      if (betFrac >= 0.33 || potOdds >= 0.248) return 'fold';
    }

    /* Calls baratos solo con edge según rol. */
    if (face === 'call' || face === 'fold') {
      var edge = callEdgeForRole(role);
      if (strength > potOdds + edge) {
        if (face === 'fold' && potOdds < 0.28 && rnd < 0.55) return 'call';
        return face === 'fold' ? face : 'call';
      }
      if (face === 'call' && strength <= potOdds + edge) {
        /* Sin edge suficiente: fold salvo raises value / semi. */
        if (strength < 0.55) return 'fold';
      }
    }
    return face;
  }

  function ensureLinePlan(seat, spotCtx) {
    var LP = global.GTOVillainLinePolicy;
    if (!LP || !LP.createLinePlan) return null;
    if (!seat._linePlan) seat._linePlan = LP.createLinePlan(spotCtx || {});
    return seat._linePlan;
  }

  function patchLinePlan(seat, street, patch) {
    var LP = global.GTOVillainLinePolicy;
    if (!LP || !LP.updateLinePlan || !patch) return;
    seat._linePlan = LP.updateLinePlan(seat._linePlan || LP.createLinePlan({}), Object.assign({
      street: street
    }, patch));
  }

  function isNeverFoldNuts(cards, board) {
    var RS = global.GTORiverShoveNode;
    if (!RS) return false;
    try {
      var codes = toCodes(cards);
      var boardCodes = toCodes(board || []);
      if (RS.isNeverFoldHand) return !!RS.isNeverFoldHand(codes, boardCodes);
      if (RS.isAbsoluteNuts) return !!RS.isAbsoluteNuts(codes, boardCodes);
    } catch (e) { /* */ }
    return false;
  }

  /**
   * Path Pro: samplea postflopStrategy (misma fuente que entrenador / Hero).
   * Retorna acción o null si no aplica / falla.
   */
  function decidePostflopFromStrategy(hand, seat, profile, role, strength, madeInfo, ctx, heroLine, inPos, initiative, rnd) {
    var DC = global.GTODecisionContext;
    var LP = global.GTOVillainLinePolicy;
    var VS = global.GTOVillainSizing;
    if (!DC || (!DC.usesStrategySample(profile) && !DC.usesStrategySample(role))) return null;
    if (!global.GTO || !global.GTO.Strategy || !global.GTO.Strategy.postflopStrategy) return null;

    var bb = Math.max(1, hand.bb || 1);
    var tc = Math.max(0, hand.currentBet - seat.streetInvested);
    var pot = Math.max(hand.pot || 1, 1);
    var potBB = pot / bb;
    var tcBB = tc / bb;
    var potBeforeBB = Math.max(potBB - tcBB, 0.1);
    var band = DC.bandFromMade(madeInfo, strength);
    var neverFold = isNeverFoldNuts(seat.cards, hand.board);
    var spotCtx = DC.buildFromTournament(hand, seat, {
      strength: strength,
      band: band,
      madeHandInfo: madeInfo,
      madeCategory: madeInfo && madeInfo.ev ? madeInfo.ev.category : null,
      initiative: initiative,
      inPosition: inPos,
      lineIntent: seat._lineIntent || null,
      formatHub: ctx.formatHub,
      stackBB: ctx.stackBB,
      effectivePhase: ctx.effectivePhase || ctx.mttPhase,
      mttPhase: ctx.mttPhase,
      mttStructureSituation: ctx.mttStructureSituation,
      tournamentType: ctx.tournamentType,
      playersLeft: ctx.playersLeft,
      placesPaid: ctx.placesPaid,
      proStyle: profile.proStyle || null,
      heroProfile: ctx.heroProfile || null
    });
    spotCtx.linePlan = ensureLinePlan(seat, spotCtx);
    spotCtx.toCallBB = tcBB;
    spotCtx.potBeforeBB = potBeforeBB;
    if (tcBB > 0) spotCtx.villainBetRatio = tcBB / potBeforeBB;

    var eq = strength;
    try {
      if (global.GTOEquity && global.GTOEquity.equityVsRange && seat.cards) {
        var D = global.GTORangesData;
        var baseRange = (D && D.BROAD_CONTINUE) || '22+,A2s+,K9s+,Q9s+,J9s+,T8s+,ATo+,KTo+,QJo';
        var range = baseRange;
        var VT = global.GTOVillainTracking;
        var streetEq = hand.street || 'flop';
        if (tcBB > 0 && VT && VT.estimateActiveRange) {
          range = VT.estimateActiveRange({
            baseRange: baseRange,
            street: streetEq,
            lastAction: ctx.villainLastAction || 'bet',
            betBB: tcBB,
            potBeforeBB: potBeforeBB,
            board: toCodes(hand.board || []),
            tags: []
          });
        } else if (tcBB > 0 && streetEq === 'river' && D && D.RANGE_FACING_RIVER_SHOVE) {
          range = D.RANGE_FACING_RIVER_SHOVE;
        }
        eq = global.GTOEquity.equityVsRange(
          toCodes(seat.cards),
          toCodes(hand.board || []),
          range,
          280,
          {
            street: streetEq,
            facingBet: tcBB > 0,
            betBB: tcBB,
            potBeforeBB: potBeforeBB,
            villainLastAction: ctx.villainLastAction || (tcBB > 0 ? 'bet' : null)
          }
        );
      }
    } catch (eEq) { eq = strength; }

    var strat = global.GTO.Strategy.postflopStrategy({
      toCallBB: tcBB,
      potBB: potBB,
      potBeforeBB: potBeforeBB,
      heroEquity: eq != null ? eq : strength,
      madeHandInfo: madeInfo,
      board: toCodes(hand.board || []),
      heroCards: toCodes(seat.cards),
      initiative: initiative,
      inPosition: inPos,
      spr: spotCtx.spr,
      street: hand.street || 'flop',
      villainLastAction: ctx.villainLastAction || null,
      potType: spotCtx.potType
    });

    /* Facing */
    if (tc > 0) {
      var refined = DC.refineFacing(strat, spotCtx);
      if (heroLine.aggressive && strength < 0.45) {
        refined.freqs.fold = (refined.freqs.fold || 0) * 1.2;
        refined.freqs.call = (refined.freqs.call || 0) * 0.85;
        refined.freqs = DC.normalize(refined.freqs);
      }
      var act = DC.sampleFacing(refined.freqs, rnd, {
        neverFold: neverFold,
        canRaise: tc > 0
      });
      if (act !== 'raise') seat._lineIntent = null;
      else if (seat._lineIntent === 'checkRaise') {
        patchLinePlan(seat, hand.street, { intent: 'checkRaise', action: 'raise' });
        seat._lineIntent = null;
      }
      if (act === 'call' && (hand.street === 'flop') && !inPos && strength >= 0.35 && strength <= 0.55) {
        patchLinePlan(seat, hand.street, { intent: 'float', action: 'call' });
        if (seat._linePlan) seat._linePlan.floatOop = true;
      }
      if (act === 'raise') {
        var raiseAmt;
        if (VS && VS.raiseSizeBB) {
          raiseAmt = VS.raiseSizeBB(potBeforeBB * bb, tc, Object.assign({}, spotCtx, {
            preferOverbetRaise: !!refined.preferOverbetRaise,
            remainingBB: spotCtx.remainingBB || spotCtx.stackBB
          }), Math.random());
          raiseAmt = capRaiseTo(hand, seat, raiseAmt);
        } else {
          raiseAmt = capRaiseTo(hand, seat, Math.max(
            hand.currentBet + hand.minRaise,
            hand.currentBet * 2.4,
            hand.currentBet + pot * 0.55
          ));
        }
        patchLinePlan(seat, hand.street, { action: 'raise' });
        return { id: 'raise', amount: raiseAmt };
      }
      if (act === 'call') {
        patchLinePlan(seat, hand.street, { action: 'call' });
        return { id: 'call' };
      }
      patchLinePlan(seat, hand.street, { action: 'fold' });
      return { id: 'fold' };
    }

    /* Lead: line policy primero (XR setup / delayed / trap), luego sample */
    if (LP && typeof LP.decideLead === 'function') {
      try {
        var leadLine = LP.decideLead(Object.assign({}, spotCtx, {
          priorStreetCheckCheck: !!(hand._priorStreetCheckCheck || seat._priorStreetCheckCheck),
          board: toCodes(hand.board || [])
        }), rnd);
        if (leadLine && leadLine.linePlanPatch) {
          patchLinePlan(seat, hand.street, leadLine.linePlanPatch);
          spotCtx.linePlan = seat._linePlan;
        }
        if (leadLine && (leadLine.forceCheck || leadLine.intent === 'checkRaise' || leadLine.intent === 'trap' || leadLine.intent === 'giveUp')) {
          if (leadLine.intent) seat._lineIntent = leadLine.intent;
          return { id: 'check' };
        }
        if (leadLine && leadLine.intent) seat._lineIntent = leadLine.intent;
        if (leadLine && leadLine.preferSizeKey) seat._preferSizeKey = leadLine.preferSizeKey;
        if (leadLine && leadLine.actionHint === 'bet') {
          /* fuerza bet de delayed/donk/protection — sizing abajo */
          var forcedFrac = 0.55;
          if (VS && VS.fracForKey && leadLine.preferSizeKey) {
            forcedFrac = VS.fracForKey(leadLine.preferSizeKey) || forcedFrac;
          } else if (leadLine.preferSizeKey === 'bet_33') forcedFrac = 0.33;
          else if (leadLine.preferSizeKey === 'bet_66') forcedFrac = 0.66;
          else if (leadLine.preferSizeKey === 'overbet') forcedFrac = 1.25;
          patchLinePlan(seat, hand.street, { action: 'bet', intent: leadLine.intent });
          return {
            id: 'bet',
            amount: Math.min(allInTo(seat), Math.max(hand.bb, r2(pot * forcedFrac)))
          };
        }
      } catch (eLead) { /* */ }
    }

    var leadFreqs = DC.refineLead(strat, spotCtx);
    if (VS && VS.sampleLeadFromStrategy) {
      var sampled = VS.sampleLeadFromStrategy(leadFreqs, potBB, Object.assign({}, spotCtx, {
        preferSizeKey: seat._preferSizeKey || null
      }), rnd);
      seat._preferSizeKey = null;
      if (sampled.action === 'bet') {
        patchLinePlan(seat, hand.street, { action: 'bet' });
        var FA = global.GTOVillainFormatAdjust;
        if (FA && FA.multipliers) {
          var mLead = FA.multipliers(spotCtx) || {};
          if (mLead.jamBias > 1.3 && spotCtx.stackBB <= 14 && strength > 0.5) {
            return { id: 'raise', amount: allInTo(seat) };
          }
        }
        return {
          id: 'bet',
          amount: Math.min(allInTo(seat), Math.max(hand.bb, r2(pot * (sampled.frac || 0.55))))
        };
      }
      patchLinePlan(seat, hand.street, { action: 'check' });
      return { id: 'check' };
    }

    var betP = 0;
    ['bet_100', 'bet_66', 'bet_33', 'overbet', 'bet'].forEach(function (k) {
      betP += leadFreqs[k] || 0;
    });
    if (rnd < betP) {
      patchLinePlan(seat, hand.street, { action: 'bet' });
      return {
        id: 'bet',
        amount: Math.min(allInTo(seat), Math.max(hand.bb, r2(pot * sampleBetFrac(profile, hand.street, strength))))
      };
    }
    patchLinePlan(seat, hand.street, { action: 'check' });
    return { id: 'check' };
  }

  function decidePostflop(hand, seat) {
    var VP = global.GTOVillainProfiles;
    var LP = global.GTOVillainLinePolicy;
    var Made = global.GTOEquityMadeHand;
    var Track = global.GTOVillainTracking;
    var DC = global.GTODecisionContext;
    var profile = profileForSeat(seat, hand);
    var role = profile.id || mapRoleId(seat.roleId);
    var tc = Math.max(0, hand.currentBet - seat.streetInvested);
    var street = hand.street || 'flop';
    var strength = strength01(seat.cards, hand.board || [], street);
    var pot = Math.max(hand.pot || 1, 1);
    var potOdds = tc > 0 ? tc / (pot + tc) : 0;
    var rnd = Math.random();
    var ctx = rangeCtx(hand, seat);
    ctx.isHeadsUp = isHeadsUp(hand);
    var heroLine = heroLinePressure(hand);
    var inPos = isInPosition(hand, seat);
    var wasAgg = !!(hand.openerId && hand.openerId === seat.id);
    var initiative = wasAgg ? 'aggressor' : 'caller';

    var madeInfo = null;
    if (Made && typeof Made.classifyMadeHand === 'function') {
      try {
        madeInfo = Made.classifyMadeHand(toCodes(seat.cards), toCodes(hand.board || []));
      } catch (eM) { madeInfo = null; }
    }

    var opts = {
      street: street,
      tier: strength > 0.7 ? 'strong' : (strength < 0.35 ? 'weak' : 'medium'),
      formatHub: ctx.formatHub,
      stackBB: ctx.stackBB,
      mttPhase: ctx.effectivePhase || ctx.mttPhase,
      madeCategory: madeInfo && madeInfo.ev ? madeInfo.ev.category : null,
      holeStrength: holeStrength01(seat.cards)
    };

    /* Tracking opcional (no bloquea si el shape de hand.log no encaja). */
    if (Track && typeof Track.inferVillainLineContext === 'function') {
      try {
        var lineCtx = Track.inferVillainLineContext({
          hand: hand,
          street: street,
          boardSoFar: hand.board || []
        });
        if (lineCtx && lineCtx.villainLastAction) {
          ctx.villainLastAction = lineCtx.villainLastAction;
        }
      } catch (eT) { /* */ }
    }

    /* ---------- Path Pro: misma estrategia que entrenador ---------- */
    if (DC && (DC.usesStrategySample(profile) || DC.usesStrategySample(role))) {
      try {
        var proAct = decidePostflopFromStrategy(
          hand, seat, profile, role, strength, madeInfo, ctx, heroLine, inPos, initiative, rnd
        );
        if (proAct) {
          /* Nuts absolutas nunca fold */
          if (proAct.id === 'fold' && isNeverFoldNuts(seat.cards, hand.board)) {
            return { id: 'call' };
          }
          return proAct;
        }
      } catch (ePro) { /* fallthrough heurística */ }
    }

    /* ---------- Facing bet (heurística fish/nit/maniac) ---------- */
    if (tc > 0) {
      var face = 'fold';
      if (VP && typeof VP.postflopFacingBet === 'function') {
        try {
          face = VP.postflopFacingBet(strength, potOdds, profile, rnd, opts) || 'fold';
        } catch (e) { face = 'fold'; }
      } else if (strength > 0.78) {
        face = 'raise';
      } else if (strength > potOdds + callEdgeForRole(role)) {
        face = 'call';
      }

      /* Check-raise follow-through. */
      if (seat._lineIntent === 'checkRaise') {
        var xrBoost = false;
        if (LP && typeof LP.adjustFacing === 'function') {
          try {
            var freqs = { fold: 0.45, call: 0.35, raise: 0.2 };
            if (face === 'raise') freqs = { fold: 0.15, call: 0.25, raise: 0.6 };
            else if (face === 'call') freqs = { fold: 0.25, call: 0.5, raise: 0.25 };
            else freqs = { fold: 0.55, call: 0.3, raise: 0.15 };
            var adj = LP.adjustFacing(freqs, {
              lineIntent: 'checkRaise',
              street: street,
              strength: strength,
              formatHub: ctx.formatHub,
              stackBB: ctx.stackBB,
              band: strength > 0.7 ? 'value' : (strength < 0.35 ? 'air' : 'merge')
            });
            var rXr = Math.random();
            if (rXr < (adj.raise || 0)) face = 'raise';
            else if (rXr < (adj.raise || 0) + (adj.call || 0)) face = 'call';
            else face = 'fold';
            xrBoost = true;
          } catch (eXr) { xrBoost = false; }
        }
        if (!xrBoost) {
          var drawish = (street === 'flop' || street === 'turn')
            && strength >= 0.38 && strength <= 0.52;
          if (strength > 0.55 || drawish) {
            if (Math.random() < (strength > 0.55 ? 0.62 : 0.42)) face = 'raise';
          }
        }
        seat._lineIntent = null;
      }

      /* Semibluff raises flop/turn medium strength. */
      if ((street === 'flop' || street === 'turn')
        && strength >= 0.38 && strength <= 0.52
        && (role === 'tag' || role === 'pro' || role === 'lag')
        && face === 'call' && Math.random() < 0.28) {
        face = 'raise';
      }

      /* Hero multi-street aggression → más fold con manos medias. */
      if (heroLine.aggressive && strength < 0.45 && face !== 'raise') {
        if (Math.random() < 0.55) face = 'fold';
      }

      face = applyPostflopFoldDiscipline(face, strength, potOdds, tc, pot, street, role, rnd);
      face = applyFormatAdjustToFacing(face, strength, potOdds, ctx, profile, rnd);
      face = applyPostflopFoldDiscipline(face, strength, potOdds, tc, pot, street, role, Math.random());

      if (face === 'fold' && isNeverFoldNuts(seat.cards, hand.board)) face = 'call';

      if (face === 'raise') {
        return {
          id: 'raise',
          amount: capRaiseTo(hand, seat, Math.max(
            hand.currentBet + hand.minRaise,
            hand.currentBet * 2.4,
            hand.currentBet + pot * 0.55
          ))
        };
      }
      if (face === 'call') return { id: 'call' };
      return { id: 'fold' };
    }

    /* ---------- Lead (heurística) ---------- */
    if (LP && typeof LP.decideLead === 'function') {
      try {
        var leadLineH = LP.decideLead({
          street: street,
          board: toCodes(hand.board || []),
          strength: strength,
          role: role,
          inPosition: inPos,
          initiative: initiative,
          band: strength > 0.7 ? 'value' : (strength < 0.35 ? 'air' : 'merge'),
          formatHub: ctx.formatHub,
          stackBB: ctx.stackBB,
          madeCategory: opts.madeCategory,
          spr: pot > 0 ? ctx.stackBB / (pot / Math.max(1, hand.bb || 1)) : ctx.stackBB,
          linePlan: seat._linePlan || null
        }, rnd);
        if (leadLineH && leadLineH.linePlanPatch) {
          patchLinePlan(seat, street, leadLineH.linePlanPatch);
        }
        if (leadLineH && (leadLineH.forceCheck || leadLineH.intent === 'checkRaise')) {
          seat._lineIntent = 'checkRaise';
          return { id: 'check' };
        }
        if (leadLineH && leadLineH.intent) seat._lineIntent = leadLineH.intent;
      } catch (eLead) { /* */ }
    }

    var lead = 'check';
    if (VP && typeof VP.postflopLead === 'function') {
      try {
        lead = VP.postflopLead(strength, profile, wasAgg, rnd, opts) || 'check';
      } catch (e2) { lead = 'check'; }
    } else if (strength > 0.55 || (strength > 0.35 && rnd < 0.48) || (wasAgg && rnd < 0.55)) {
      lead = 'bet';
    }

    if (lead === 'check') {
      var force = 0;
      if (wasAgg && strength > 0.38) force = 0.62;
      else if (wasAgg && strength > 0.22) force = 0.48;
      else if (strength > 0.68) force = 0.58;
      else if (strength > 0.5) force = 0.36;
      else if (strength > 0.36) force = 0.22;
      if (role === 'lag' || role === 'maniac') force = Math.min(0.85, force + 0.18);
      if (role === 'nit') force *= 0.75;
      if ((street === 'flop' || street === 'turn')
        && strength >= 0.38 && strength <= 0.52
        && (role === 'tag' || role === 'pro' || role === 'lag')) {
        force = Math.min(0.82, force + 0.22);
      }
      if (heroLine.passive && (role === 'pro' || role === 'tag') && strength > 0.28) {
        force = Math.min(0.85, force + 0.2);
      }
      if (rnd < force) lead = 'bet';
    }

    lead = applyFormatAdjustToLead(lead, strength, ctx, wasAgg, rnd, profile);

    if (lead === 'check' && heroLine.passive && (role === 'pro' || role === 'tag')
      && strength > 0.28 && Math.random() < 0.35) {
      lead = 'bet';
    }

    if (lead === 'bet') {
      var frac = sampleBetFrac(profile, street, strength);
      var FA2 = global.GTOVillainFormatAdjust;
      if (FA2 && FA2.multipliers) {
        var mLead2 = FA2.multipliers(ctx) || {};
        if (mLead2.sizeSimple) frac = Math.min(frac, 0.66);
        if (mLead2.jamBias > 1.3 && ctx.stackBB <= 14 && strength > 0.5) {
          return {
            id: 'raise',
            amount: allInTo(seat)
          };
        }
      }
      return {
        id: 'bet',
        amount: Math.min(
          allInTo(seat),
          Math.max(hand.bb, r2(pot * frac))
        )
      };
    }
    return { id: 'check' };
  }

  function decide(hand, seat) {
    if (!hand || !seat) return { id: 'check' };
    if (hand.street === 'preflop') return decidePreflop(hand, seat);
    return decidePostflop(hand, seat);
  }

  global.PTTournamentVillainDecide = {
    decide: decide,
    profileForSeat: profileForSeat,
    strength01: strength01,
    handCode: handCode,
    mapRoleId: mapRoleId
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
