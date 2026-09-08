/*
 * tournament/villain-decide.js — Villanos de torneo con motor Pro+ del entrenador.
 * Estilos fish/nit/tag/lag/maniac/pro sobre dificultad pro (keepArchetype).
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
   * Fish/nit del entrenador son muy check/fold; en torneo eso se siente
   * "todo check / overfold". Subimos suelos de agresión y defensa.
   */
  function tournamentPostflopFloor(role, postflop) {
    var pf = Object.assign({}, postflop || {});
    var floors = {
      fish:   { bet: 1.05, bluff: 0.85, raise: 0.95, call: 1.4, fold: 0.7 },
      nit:    { bet: 0.92, bluff: 0.55, raise: 0.85, call: 0.95, fold: 0.95 },
      tag:    { bet: 1.2,  bluff: 1.0,  raise: 1.25, call: 1.0, fold: 0.95 },
      lag:    { bet: 1.55, bluff: 1.55, raise: 1.55, call: 1.1, fold: 0.65 },
      maniac: { bet: 1.75, bluff: 1.9,  raise: 1.85, call: 1.15, fold: 0.5 },
      pro:    { bet: 1.2,  bluff: 1.05, raise: 1.3,  call: 1.0, fold: 0.95 }
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

  function profileForSeat(seat) {
    var VP = global.GTOVillainProfiles;
    var role = mapRoleId(seat && seat.roleId);
    if (!VP || typeof VP.applyDifficulty !== 'function') {
      return {
        id: role,
        preflopStrict: 0.92,
        postflop: tournamentPostflopFloor(role, {
          betFreqMult: 1.15, bluffFreqMult: 1, raiseFreqMult: 1.15, callMult: 1.05, foldMult: 0.9
        }),
        proStyle: seat && seat.proStyle || null
      };
    }
    var base = typeof VP.getProfile === 'function' ? VP.getProfile(role) : role;
    var prof = VP.applyDifficulty(base, 'pro', { forced: true, keepArchetype: true });
    prof = Object.assign({}, prof, {
      postflop: tournamentPostflopFloor(role, prof.postflop)
    });
    if (seat && seat.proStyle) {
      prof = Object.assign({}, prof, { proStyle: seat.proStyle });
    }
    // Pros explotativos: un poco más de agresividad postflop.
    if (prof.proStyle === 'exploit_pool' && prof.postflop) {
      var pf = Object.assign({}, prof.postflop);
      pf.betFreqMult = Math.min(2.2, (Number(pf.betFreqMult) || 1) * 1.12);
      pf.raiseFreqMult = Math.min(2.2, (Number(pf.raiseFreqMult) || 1) * 1.14);
      pf.bluffFreqMult = Math.min(2.2, (Number(pf.bluffFreqMult) || 1) * 1.1);
      pf.foldMult = Math.max(0.35, (Number(pf.foldMult) || 1) * 0.94);
      prof = Object.assign({}, prof, { postflop: pf });
    }
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

  /**
   * Cards.evaluate devuelve { category: 0..8, rank: [category, ...] } (mayor = mejor),
   * no un rank 1..7462. Mapear mal → NaN/basura → overfold y solo check.
   */
  function strength01(hole, board) {
    var C = global.Cards;
    board = board || [];
    var holeStr = holeStrength01(hole);
    if (!hole || hole.length < 2) return 0.1;
    if (C && C.evaluate && board.length >= 3) {
      try {
        var codes = hole.concat(board).map(function (c) {
          return typeof c === 'string' ? c : cardCode(c);
        });
        var ev = C.evaluate(codes);
        var cat = null;
        if (ev && ev.category != null && isFinite(Number(ev.category))) {
          cat = Number(ev.category);
        } else if (ev && Array.isArray(ev.rank) && isFinite(Number(ev.rank[0])) && Number(ev.rank[0]) <= 8) {
          cat = Number(ev.rank[0]);
        } else if (ev && typeof ev.rank === 'number' && ev.rank > 20) {
          return Math.max(0.05, Math.min(0.98, 1 - (ev.rank / 7462)));
        }
        if (cat != null && cat >= 0 && cat <= 8) {
          var made = 0.16 + (cat / 8) * 0.72;
          /* High card / pareja débil: mezclar fuerza de hole (AK high ≠ 72o). */
          if (cat <= 0) made = Math.max(made, 0.2 + holeStr * 0.5);
          else if (cat === 1) made = Math.max(made, 0.42 + holeStr * 0.25);
          else if (cat === 2) made = Math.max(made, 0.58);
          return Math.max(0.08, Math.min(0.98, made));
        }
      } catch (e) { /* */ }
    }
    return holeStr;
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
    // Si el campo está en burbuja, alinear fase efectiva para FormatAdjust / charts.
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
        if (norm.stackBB != null) ctx.stackBB = stackBB; // keep seat stack
      } catch (e3) { /* */ }
    }
    return ctx;
  }

  function applyFormatAdjustToFacing(face, strength, potOdds, ctx, profile, rnd) {
    var FA = global.GTOVillainFormatAdjust;
    var Ex = global.GTOVillainProExploit;
    var r = rnd != null ? rnd : Math.random();
    var m = (FA && typeof FA.multipliers === 'function') ? (FA.multipliers(ctx) || {}) : {};
    // Fold bias by ICM/bubble; PKO softens fold (más call vs stacks cortos).
    var foldPush = (Number(m.fold) || 1) - 1;
    if (ctx.tournamentType === 'pko' || ctx.tournamentType === 'mystery') {
      foldPush *= 0.55;
      if (ctx.stackBB <= 20 && strength > 0.28) foldPush -= 0.08;
    }
    if (face === 'call' && foldPush > 0.05 && r < foldPush * 0.55) return 'fold';
    if (face === 'fold' && foldPush < -0.02 && strength > potOdds) return 'call';
    if (face === 'raise' && (m.jamBias > 1.25 || ctx.stackBB <= 14) && strength > 0.55) {
      return 'raise';
    }
    if (face === 'raise' && m.raise < 0.75 && r < 0.35) return 'call';

    // Exploit vs perfil Hero (pros exploit_pool).
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

  function decidePreflop(hand, seat) {
    var VPF = global.GTOVillainPreflop;
    var profile = profileForSeat(seat);
    var tc = Math.max(0, hand.currentBet - seat.streetInvested);
    var code = handCode(seat.cards);
    var ctx = rangeCtx(hand, seat);
    var raises = raiseCount(hand);

    if (!hand.openerId) {
      if (seat.pos === 'BB' && tc <= 0) return { id: 'check' };
      var open = false;
      if (VPF && typeof VPF.isInOpenRange === 'function' && code) {
        try { open = !!VPF.isInOpenRange(code, seat.pos, ctx); } catch (e) { open = false; }
      } else {
        open = strength01(seat.cards, []) > 0.58;
      }
      if (open) {
        return {
          id: 'raise',
          amount: Math.min(
            seat.streetInvested + seat.stack,
            r2(hand.bb * openSizeBb(seat, profile))
          )
        };
      }
      return tc > 0 ? { id: 'fold' } : { id: 'check' };
    }

    var action = 'fold';
    if (VPF && code) {
      try {
        if (raises >= 3 && typeof VPF.villainVs4BetAction === 'function') {
          action = VPF.villainVs4BetAction(code, profile, Math.random()) || 'fold';
        } else if (raises >= 2 && hand.openerId === seat.id &&
            typeof VPF.openerVs3BetAction === 'function') {
          action = VPF.openerVs3BetAction(code, profile, Math.random(), ctx) || 'fold';
        } else if (typeof VPF.defendVsOpen === 'function') {
          action = VPF.defendVsOpen(
            code, profile, Math.random(), seat.pos, hand.openerPos || 'CO', ctx
          ) || 'fold';
        }
      } catch (e2) {
        action = 'fold';
      }
    } else {
      var s0 = strength01(seat.cards, []);
      if (s0 > 0.8) action = '3bet';
      else if (s0 > 0.55) action = 'call';
    }

    if (action === '3bet' || action === 'raise' || action === '4bet') {
      var mult = raises >= 2 ? 2.3 : (seat.pos === 'SB' || seat.pos === 'BB' ? 3.6 : 3.2);
      return { id: 'raise', amount: capRaiseTo(hand, seat, hand.currentBet * mult) };
    }
    if (action === 'call' || action === 'limp') {
      action = applyFormatAdjustToFacing('call', strength01(seat.cards, []), tc > 0 ? tc / (hand.pot + tc) : 0, ctx, profile, Math.random());
      if (action === 'fold') return tc <= 0 ? { id: 'check' } : { id: 'fold' };
      return tc <= 0 ? { id: 'check' } : { id: 'call' };
    }
    action = applyFormatAdjustToFacing('fold', strength01(seat.cards, []), tc > 0 ? tc / (hand.pot + tc) : 0, ctx, profile, Math.random());
    if (action === 'call') return tc <= 0 ? { id: 'check' } : { id: 'call' };
    return tc <= 0 ? { id: 'check' } : { id: 'fold' };
  }

  function decidePostflop(hand, seat) {
    var VP = global.GTOVillainProfiles;
    var profile = profileForSeat(seat);
    var tc = Math.max(0, hand.currentBet - seat.streetInvested);
    var strength = strength01(seat.cards, hand.board || []);
    var pot = Math.max(hand.pot || 1, 1);
    var potOdds = tc > 0 ? tc / (pot + tc) : 0;
    var street = hand.street || 'flop';
    var rnd = Math.random();
    var ctx = rangeCtx(hand, seat);
    var opts = {
      street: street,
      tier: strength > 0.7 ? 'strong' : (strength < 0.35 ? 'weak' : 'medium'),
      formatHub: ctx.formatHub,
      stackBB: ctx.stackBB,
      mttPhase: ctx.effectivePhase || ctx.mttPhase
    };

    if (tc > 0) {
      var face = 'fold';
      if (VP && typeof VP.postflopFacingBet === 'function') {
        try {
          face = VP.postflopFacingBet(strength, potOdds, profile, rnd, opts) || 'fold';
        } catch (e) { face = 'fold'; }
      } else if (strength > 0.78) {
        face = 'raise';
      } else if (strength > potOdds + 0.08) {
        face = 'call';
      } else if (strength > potOdds - 0.02 && rnd < 0.55) {
        face = 'call';
      }
      /* Anti-overfold: a tamaños chicos / medio-chicos seguir mucho más. */
      if (face === 'fold') {
        if (potOdds < 0.12 && strength > 0.12) face = 'call';
        else if (potOdds < 0.18 && strength > 0.18) face = rnd < 0.92 ? 'call' : 'fold';
        else if (potOdds < 0.24 && strength > 0.22) face = rnd < 0.82 ? 'call' : 'fold';
        else if (potOdds < 0.3 && strength > 0.32) face = rnd < 0.68 ? 'call' : 'fold';
        else if (potOdds < 0.36 && strength > 0.48) face = rnd < 0.55 ? 'call' : 'fold';
      }
      face = applyFormatAdjustToFacing(face, strength, potOdds, ctx, profile, rnd);
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

    var wasAgg = !!(hand.openerId && hand.openerId === seat.id);
    var lead = 'check';
    if (VP && typeof VP.postflopLead === 'function') {
      try {
        lead = VP.postflopLead(strength, profile, wasAgg, rnd, opts) || 'check';
      } catch (e2) { lead = 'check'; }
    } else if (strength > 0.55 || (strength > 0.35 && rnd < 0.48) || (wasAgg && rnd < 0.55)) {
      lead = 'bet';
    }

    /* Suelo de c-bet / value-bet: evita mesas de solo check. */
    if (lead === 'check') {
      var force = 0;
      var role = profile && profile.id;
      if (wasAgg && strength > 0.38) force = 0.62;
      else if (wasAgg && strength > 0.22) force = 0.48;
      else if (strength > 0.68) force = 0.58;
      else if (strength > 0.5) force = 0.36;
      else if (strength > 0.36) force = 0.22;
      if (role === 'lag' || role === 'maniac') force = Math.min(0.85, force + 0.18);
      if (role === 'nit') force *= 0.75;
      if (rnd < force) lead = 'bet';
    }
    lead = applyFormatAdjustToLead(lead, strength, ctx, wasAgg, rnd, profile);

    if (lead === 'bet') {
      var frac = sampleBetFrac(profile, street, strength);
      var FA = global.GTOVillainFormatAdjust;
      if (FA && FA.multipliers) {
        var mLead = FA.multipliers(ctx) || {};
        if (mLead.sizeSimple) frac = Math.min(frac, 0.66);
        if (mLead.jamBias > 1.3 && ctx.stackBB <= 14 && strength > 0.5) {
          return {
            id: 'raise',
            amount: seat.streetInvested + seat.stack
          };
        }
      }
      return {
        id: 'bet',
        amount: Math.min(
          seat.streetInvested + seat.stack,
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
