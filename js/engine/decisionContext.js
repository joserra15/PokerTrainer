/*
 * decisionContext.js — Contexto unificado + sample/refine de estrategia Pro
 * compartido entre entrenador, torneos, evaluateSpot (drivers) y Escuela.
 * Heurística + charts + ICM lite; no es un árbol CFR.
 */
(function (global) {
  'use strict';

  function clamp(x, lo, hi) {
    return Math.max(lo, Math.min(hi, x));
  }

  function normalize(freqs) {
    var out = Object.assign({}, freqs || {});
    var sum = 0;
    Object.keys(out).forEach(function (k) {
      if (k.charAt(0) === '_') return;
      sum += Math.max(0, out[k] || 0);
    });
    if (sum <= 0) return freqs || out;
    Object.keys(out).forEach(function (k) {
      if (k.charAt(0) === '_') return;
      out[k] = Math.max(0, out[k] || 0) / sum;
    });
    return out;
  }

  function bandFromMade(info, strength) {
    var s = strength != null ? strength : 0.5;
    if (info && info.ev && info.ev.category >= 4) return 'nuts';
    if (info) {
      if (info.tier === 'strong') return s > 0.82 ? 'nuts' : 'value';
      if (info.tier === 'medium') return 'merge';
      if (info.tier === 'weak') return 'bluffcatch';
      return 'air';
    }
    if (s >= 0.88) return 'nuts';
    if (s >= 0.68) return 'value';
    if (s >= 0.45) return 'merge';
    if (s >= 0.28) return 'bluffcatch';
    return 'air';
  }

  /** Roles que samplean postflopStrategy (misma fuente que Hero / entrenador Pro). */
  function usesStrategySample(profileOrRole) {
    if (!profileOrRole) return false;
    if (typeof profileOrRole === 'string') {
      var r = String(profileOrRole).toLowerCase();
      return r === 'pro' || r === 'tag' || r === 'lag';
    }
    var id = String(profileOrRole.id || profileOrRole.roleId || '').toLowerCase();
    if (profileOrRole.preflopStrict >= 0.99) return true;
    return id === 'pro' || id === 'tag' || id === 'lag';
  }

  function hubOf(ctx) {
    var Tax = global.PTFormatTaxonomy;
    if (Tax && Tax.normalizeHub) {
      return Tax.normalizeHub(ctx.formatHub || Tax.hubFromGameType(ctx.gameType));
    }
    var g = String(ctx.gameType || ctx.formatHub || 'cash');
    if (g.indexOf('spin') === 0) return 'spin';
    if (g === 'mtt' || g.indexOf('mtt') === 0) return 'mtt';
    return 'cash';
  }

  /**
   * Bubble factor lite desde contexto (stacks/payouts o heurística de fase).
   * En burbuja/FT usa al menos el suelo de fase (el BF Harville del short puede ser ~1).
   */
  function bubbleFactorFromCtx(ctx) {
    ctx = ctx || {};
    var Icm = global.GTOIcmEv;
    var hub = hubOf(ctx);
    var phase = ctx.effectivePhase || ctx.resolvedPhase || ctx.mttPhase || '';
    var situ = ctx.mttStructureSituation || '';
    var phaseFloor = 1;
    if (hub === 'spin') phaseFloor = phase === 'push' ? 1.45 : 1.2;
    else if (phase === 'bubble' || situ === 'bubble') phaseFloor = 1.55;
    else if (situ === 'ft9' || situ === 'mincash') phaseFloor = 1.28;
    else if (phase === 'push' || phase === 'short') phaseFloor = 1.22;

    var computed = 1;
    if (Icm && Icm.shouldApply && Icm.shouldApply(ctx) && Icm.bubbleFactor) {
      try {
        var stacks = ctx.icmStacksBB;
        var payouts = ctx.icmPayouts;
        if ((!stacks || !stacks.length) && Icm.contextForHand) {
          var syn = Icm.contextForHand({
            potBB: ctx.potBB,
            effStack: ctx.stackBB,
            playConfig: {
              formatHub: hub,
              gameType: ctx.gameType,
              mttPhase: phase,
              mttStructureSituation: situ,
              stackBB: ctx.stackBB,
              playersLeft: ctx.playersLeft,
              placesPaid: ctx.placesPaid,
              icmPayouts: ctx.icmPayouts,
              icmStacksBB: ctx.icmStacksBB,
              tournamentType: ctx.tournamentType
            }
          });
          if (syn) {
            stacks = syn.icmStacksBB;
            payouts = syn.icmPayouts;
          }
        }
        if (stacks && stacks.length >= 2 && payouts && payouts.length) {
          computed = Icm.bubbleFactor(
            stacks,
            ctx.icmHeroIdx != null ? ctx.icmHeroIdx : 0,
            ctx.icmVillainIdx != null ? ctx.icmVillainIdx : 1,
            payouts
          );
        }
      } catch (e) { /* fallthrough */ }
    }
    // Cover/big: BF alto; short en burbuja: sigue el suelo de fase (jobs de mesa).
    if (ctx.stackRole === 'cover') phaseFloor = Math.max(phaseFloor, 1.35);
    if (ctx.stackRole === 'short' && (phase === 'bubble' || situ === 'bubble')) {
      phaseFloor = Math.max(1.15, phaseFloor * 0.85);
    }
    return Math.max(computed || 1, phaseFloor);
  }

  /**
   * Repeso simétrico Hero↔Villain de freqs por ICM lite / bubble factor.
   */
  function applyIcmToFreqs(freqs, ctx, kind) {
    var out = Object.assign({}, freqs || {});
    var bf = bubbleFactorFromCtx(ctx);
    if (bf <= 1.05) return normalize(out);
    var over = clamp((bf - 1) / 1.8, 0, 1);
    var facing = kind === 'facing' || kind === 'xr' || (out.fold != null || out.call != null);
    if (facing) {
      out.fold = (out.fold || 0) * (1 + 0.28 * over);
      out.raise = (out.raise || 0) * (1 - 0.35 * over);
      if (ctx.band === 'air' || ctx.band === 'bluffcatch' || (ctx.strength != null && ctx.strength < 0.45)) {
        out.call = (out.call || 0) * (1 - 0.4 * over);
        out.raise = (out.raise || 0) * (1 - 0.25 * over);
      } else if (ctx.band === 'merge' || (ctx.strength != null && ctx.strength < 0.62)) {
        out.call = (out.call || 0) * (1 - 0.18 * over);
      }
    } else {
      var betKeys = ['bet_33', 'bet_66', 'bet_100', 'bet_125', 'overbet', 'bet'];
      var bluffish = ctx.band === 'air' || ctx.band === 'bluffcatch' || (ctx.strength != null && ctx.strength < 0.38);
      betKeys.forEach(function (k) {
        if (out[k] == null) return;
        if (bluffish) out[k] *= (1 - 0.42 * over);
        else if (k === 'overbet' || k === 'bet_125') out[k] *= (1 - 0.25 * over);
      });
      out.check = (out.check || 0) + over * 0.08;
    }
    // Stack role: short más shove/jam bias en lead; cover más pressure bet; mid más fold
    var role = ctx.stackRole || '';
    if (role === 'short' && !facing) {
      betKeys = ['bet_33', 'bet_66', 'bet_100', 'bet_125', 'overbet', 'bet'];
      betKeys.forEach(function (k) {
        if (out[k] != null) out[k] *= 1.08;
      });
    } else if (role === 'mid' && facing) {
      out.fold = (out.fold || 0) * 1.1;
      out.call = (out.call || 0) * 0.9;
    } else if (role === 'cover' && !facing) {
      betKeys = ['bet_33', 'bet_66', 'bet_100', 'overbet', 'bet'];
      betKeys.forEach(function (k) {
        if (out[k] != null) out[k] *= 1.1;
      });
      out.check = Math.max(0, (out.check || 0) * 0.9);
    }
    out._bubbleFactor = bf;
    return normalize(out);
  }

  function inferStackRole(ctx) {
    if (ctx.stackRole) return ctx.stackRole;
    var bb = Number(ctx.stackBB) || 0;
    var avg = Number(ctx.avgStackBB) || bb;
    if (!bb) return null;
    if (bb <= 12 || (avg > 0 && bb / avg <= 0.45)) return 'short';
    if (avg > 0 && bb / avg >= 1.55) return 'cover';
    if (ctx.effectivePhase === 'bubble' || ctx.mttStructureSituation === 'bubble') return 'mid';
    return null;
  }

  function buildBase(extra) {
    extra = extra || {};
    var Board = global.GTOBoardCluster;
    var RA = global.GTORangeAdvantage;
    var board = extra.board ? extra.board.slice() : [];
    var texture = extra.texture || (Board && Board.boardTexture ? Board.boardTexture(board) : {});
    var strength = extra.strength != null ? extra.strength : 0.5;
    var band = extra.band || bandFromMade(extra.madeHandInfo || extra.info, strength);
    var ctx = Object.assign({
      formatHub: 'cash',
      gameType: null,
      street: 'flop',
      potBB: 10,
      stackBB: 100,
      spr: 8,
      strength: strength,
      band: band,
      initiative: 'aggressor',
      inPosition: true,
      board: board,
      texture: texture,
      lineIntent: null,
      actionLine: null,
      multiwayCount: 2,
      potType: 'srp',
      stackRole: null,
      bubbleFactor: 1
    }, extra);
    ctx.formatHub = hubOf(ctx);
    ctx.hub = ctx.formatHub;
    ctx.stackRole = inferStackRole(ctx);
    if (RA) {
      try {
        ctx.rangeAdvantage = RA.computeRangeAdvantage({
          board: ctx.board,
          initiative: ctx.initiative,
          inPosition: ctx.inPosition,
          street: ctx.street
        });
        if (RA.computeNutAdvantage) {
          ctx.nutAdvantage = RA.computeNutAdvantage({
            board: ctx.board,
            initiative: ctx.initiative,
            inPosition: ctx.inPosition,
            street: ctx.street
          });
        }
        if (RA.betPolarization) {
          ctx.polarization = RA.betPolarization({
            board: ctx.board,
            initiative: ctx.initiative,
            inPosition: ctx.inPosition,
            street: ctx.street,
            spr: ctx.spr
          }, band);
        }
      } catch (eRa) { /* */ }
    }
    ctx.bubbleFactor = bubbleFactorFromCtx(ctx);
    return ctx;
  }

  /** Contexto desde mano del entrenador (API cercana a buildVillainSpotCtx). */
  function buildFromTrainer(hand, extra) {
    extra = extra || {};
    var cfg = (hand && hand.playConfig) || {};
    var Tax = global.PTFormatTaxonomy;
    var hub = Tax && Tax.normalizeHub
      ? Tax.normalizeHub(cfg.formatHub || Tax.hubFromGameType(cfg.gameType))
      : (cfg.formatHub || 'cash');
    return buildBase(Object.assign({
      formatHub: hub,
      gameType: cfg.gameType,
      tournamentType: cfg.tournamentType || 'unknown',
      playersLeft: cfg.playersLeft,
      placesPaid: cfg.placesPaid,
      mttStructureSituation: cfg.mttStructureSituation,
      effectivePhase: cfg.resolvedPhase || cfg.effectivePhase || cfg.mttPhase,
      resolvedPhase: cfg.resolvedPhase,
      mttPhase: cfg.mttPhase,
      street: hand.stage || hand.street || 'flop',
      potBB: Math.max(hand.potBB || 1, 0.1),
      board: hand.board ? hand.board.slice() : [],
      actionLine: hand.actionLine || null,
      priorStreetCheckCheck: !!(hand._priorStreetCheckCheck),
      lineIntent: hand._villainLineIntent || null,
      multiwayCount: (hand.table && hand.table.inHand && hand.table.inHand.length) || 2,
      potType: hand.potType || (hand._threeBetPot ? '3bp' : 'srp'),
      icmStacksBB: cfg.icmStacksBB,
      icmPayouts: cfg.icmPayouts
    }, extra));
  }

  /** Contexto desde mano/asiento de torneo IA. */
  function buildFromTournament(hand, seat, extra) {
    extra = extra || {};
    var bb = Math.max(1, hand.bb || 1);
    var potBB = (hand.pot || 0) / bb;
    var stackBB = seat && seat.stack != null ? seat.stack / bb : (extra.stackBB || 25);
    var cfg = hand.config || hand.playConfig || {};
    var remaining = seat && seat.stack != null ? seat.stack / bb : stackBB;
    var spr = potBB > 0 ? remaining / potBB : remaining;
    return buildBase(Object.assign({
      formatHub: cfg.formatHub || hand.formatHub || 'mtt',
      gameType: cfg.gameType || hand.gameType || 'mtt',
      tournamentType: cfg.tournamentType || hand.tournamentType || 'unknown',
      playersLeft: cfg.playersLeft != null ? cfg.playersLeft : hand.playersLeft,
      placesPaid: cfg.placesPaid != null ? cfg.placesPaid : hand.placesPaid,
      mttStructureSituation: cfg.mttStructureSituation || hand.mttStructureSituation,
      effectivePhase: cfg.effectivePhase || hand.effectivePhase || cfg.mttPhase || hand.mttPhase,
      mttPhase: cfg.mttPhase || hand.mttPhase,
      street: hand.street || 'flop',
      potBB: potBB,
      stackBB: remaining,
      spr: spr,
      remainingBB: remaining,
      board: (hand.board || []).map(function (c) {
        return typeof c === 'string' ? c : (c.code || (c.r != null ? String(c.r) + c.s : ''));
      }).filter(Boolean),
      actionLine: hand.actionLine || null,
      lineIntent: seat && seat._lineIntent || null,
      multiwayCount: (hand.seats || []).filter(function (s) {
        return s && s.inHand !== false && !(s.folded);
      }).length || 2,
      potType: hand.raisesPreflop >= 2 ? '3bp' : (hand.raisesPreflop >= 3 ? '4bp' : 'srp'),
      avgStackBB: cfg.avgStackBB || hand.avgStackBB,
      icmStacksBB: cfg.icmStacksBB || hand.icmStacksBB,
      icmPayouts: cfg.icmPayouts || hand.icmPayouts
    }, extra));
  }

  function refineLead(strat, ctx) {
    var out = Object.assign({}, strat || {});
    var FA = global.GTOVillainFormatAdjust;
    var Ex = global.GTOVillainProExploit;
    var LP = global.GTOVillainLinePolicy;
    if (FA && FA.applyToFreqs) out = FA.applyToFreqs(out, ctx, 'lead');
    out = applyIcmToFreqs(out, ctx, 'lead');
    if (Ex && Ex.applyToLeadFreqs) out = Ex.applyToLeadFreqs(out, ctx);
    if (LP && LP.adjustLead) out = LP.adjustLead(out, ctx);
    // Multiway: menos bluff/c-bet
    if ((ctx.multiwayCount || 2) >= 3) {
      var betKeys = ['bet_33', 'bet_66', 'bet_100', 'bet_125', 'overbet', 'bet'];
      var mw = ctx.multiwayCount >= 4 ? 0.55 : 0.7;
      betKeys.forEach(function (k) {
        if (out[k] != null) {
          if (ctx.band === 'air' || ctx.band === 'bluffcatch') out[k] *= mw * 0.85;
          else out[k] *= Math.min(1, mw + 0.15);
        }
      });
      out.check = (out.check || 0) + 0.08;
      out = normalize(out);
    }
    // 3BP/4BP: más polar, menos merge bets pequeños
    if (ctx.potType === '3bp' || ctx.potType === '4bp') {
      var scaleSmall = ctx.potType === '4bp' ? 0.55 : 0.72;
      if (out.bet_33 != null) {
        var move = (out.bet_33 || 0) * (1 - scaleSmall);
        out.bet_33 *= scaleSmall;
        out.bet_66 = (out.bet_66 || 0) + move * 0.4;
        out.bet_100 = (out.bet_100 || 0) + move * 0.35;
        out.overbet = (out.overbet || 0) + move * 0.25;
      }
      out = normalize(out);
    }
    return out;
  }

  function refineFacing(strat, ctx) {
    var out = Object.assign({}, strat || {});
    var FA = global.GTOVillainFormatAdjust;
    var Ex = global.GTOVillainProExploit;
    var LP = global.GTOVillainLinePolicy;
    var kind = ctx.lineIntent === 'checkRaise' ? 'xr' : 'facing';
    if (FA && FA.applyToFreqs) out = FA.applyToFreqs(out, ctx, kind);
    out = applyIcmToFreqs(out, ctx, kind);
    if (Ex && Ex.applyToFacingFreqs) out = Ex.applyToFacingFreqs(out, ctx);
    if (LP && LP.adjustFacing) out = LP.adjustFacing(out, ctx);
    var preferOverbetRaise = !!out._preferOverbetRaise;
    if (out._preferOverbetRaise) delete out._preferOverbetRaise;
    // Multiway: menos raises, calls más selectivos
    if ((ctx.multiwayCount || 2) >= 3) {
      out.raise = (out.raise || 0) * 0.55;
      if (ctx.band === 'air' || ctx.band === 'bluffcatch') {
        out.call = (out.call || 0) * 0.7;
        out.fold = (out.fold || 0) * 1.15;
      }
      out = normalize(out);
    }
    // Threshold defense vs oversized bets
    var betRatio = ctx.villainBetRatio != null ? ctx.villainBetRatio
      : (ctx.toCallBB > 0 && ctx.potBeforeBB > 0 ? ctx.toCallBB / ctx.potBeforeBB : null);
    if (betRatio != null && betRatio >= 0.85) {
      out.call = (out.call || 0) * 0.82;
      if (ctx.band === 'nuts' || ctx.band === 'value' || ctx.band === 'air') {
        out.raise = (out.raise || 0) * 1.12;
      } else {
        out.raise = (out.raise || 0) * 0.85;
        out.fold = (out.fold || 0) * 1.1;
      }
      out = normalize(out);
    }
    return { freqs: out, preferOverbetRaise: preferOverbetRaise };
  }

  function sampleFacing(strat, rnd, opts) {
    opts = opts || {};
    var raiseP = strat.raise || 0;
    var callP = strat.call || 0;
    if (opts.neverFold) {
      var rest = raiseP + callP;
      if (rest <= 0) return 'call';
      raiseP /= rest;
      callP /= rest;
    }
    if (opts.canRaise !== false && rnd < raiseP) return 'raise';
    if (rnd < raiseP + callP) return 'call';
    return opts.neverFold ? 'call' : 'fold';
  }

  /**
   * Drivers pedagógicos: por qué el mix se mueve.
   * Orden fijo: band → range/nut adv → MDF/potOdds → blockers → SPR/line → format/ICM → exploit.
   */
  function computeDrivers(ctx, strategy, meta) {
    meta = meta || {};
    var drivers = [];
    var tags = [];
    ctx = ctx || {};
    var facing = !!(meta.facing || (strategy && (strategy.fold != null || strategy.call != null)));

    if (ctx.band) {
      drivers.push({
        id: 'band',
        label: 'Banda ' + ctx.band,
        value: ctx.strength != null ? Math.round(ctx.strength * 100) / 100 : null,
        effect: ctx.band === 'nuts' || ctx.band === 'value' ? '+value' : (ctx.band === 'air' ? '+bluff/fold' : 'mix')
      });
      tags.push('band:' + ctx.band);
    }

    if (ctx.rangeAdvantage != null) {
      var ra = ctx.rangeAdvantage;
      drivers.push({
        id: 'rangeAdvantage',
        label: 'Range advantage',
        value: Math.round(ra * 100) / 100,
        effect: ra > 0.15 ? (facing ? '+raise/call' : '+cbet') : (ra < -0.1 ? (facing ? '+fold' : '+check') : 'neutral')
      });
      if (Math.abs(ra) > 0.12) tags.push('rangeAdv');
    }

    if (ctx.nutAdvantage != null && Math.abs(ctx.nutAdvantage) > 0.08) {
      drivers.push({
        id: 'nutAdvantage',
        label: 'Nut advantage',
        value: Math.round(ctx.nutAdvantage * 100) / 100,
        effect: ctx.nutAdvantage > 0 ? '+bet/raise' : '+pot-control'
      });
      tags.push('nutAdv');
    }

    if (meta.mdf != null) {
      drivers.push({
        id: 'mdf',
        label: 'MDF',
        value: Math.round(meta.mdf * 100) / 100,
        effect: '+defense floor'
      });
      tags.push('mdf');
    } else if (meta.potOdds != null) {
      drivers.push({
        id: 'potOdds',
        label: 'Pot odds',
        value: Math.round(meta.potOdds * 100) / 100,
        effect: 'call threshold'
      });
    }

    if (meta.blockerScore != null && Math.abs(meta.blockerScore) > 0.05) {
      drivers.push({
        id: 'blockers',
        label: 'Blockers',
        value: Math.round(meta.blockerScore * 100) / 100,
        effect: meta.blockerScore > 0 ? '+bluff/call' : '−bluff'
      });
      tags.push('blockers');
    }

    if (ctx.spr != null) {
      drivers.push({
        id: 'spr',
        label: 'SPR',
        value: Math.round(ctx.spr * 10) / 10,
        effect: ctx.spr <= 3 ? '+jam/polar' : (ctx.spr >= 10 ? '+small/merge' : 'standard')
      });
      if (ctx.spr <= 4) tags.push('spr');
    }

    if (ctx.polarization != null && ctx.polarization > 0.5) {
      drivers.push({
        id: 'polarization',
        label: 'Polarización',
        value: Math.round(ctx.polarization * 100) / 100,
        effect: '+overbet/XR'
      });
      tags.push('polar');
    }

    if (ctx.lineIntent) {
      drivers.push({
        id: 'lineIntent',
        label: 'Línea ' + ctx.lineIntent,
        value: 1,
        effect: ctx.lineIntent === 'checkRaise' ? '+raise' : ctx.lineIntent
      });
      if (ctx.lineIntent === 'checkRaise') tags.push('xr');
      tags.push('line');
    }

    if (ctx.potType && ctx.potType !== 'srp') {
      drivers.push({
        id: 'potType',
        label: 'Bote ' + String(ctx.potType).toUpperCase(),
        value: 1,
        effect: '+polar sizes'
      });
      tags.push(ctx.potType);
    }

    var bf = ctx.bubbleFactor != null ? ctx.bubbleFactor : bubbleFactorFromCtx(ctx);
    if (bf > 1.08) {
      drivers.push({
        id: 'icm',
        label: 'ICM / bubble factor',
        value: bf,
        effect: facing ? '+fold −thin call' : '−bluff'
      });
      tags.push('icmBubble');
    }

    if (ctx.stackRole) {
      drivers.push({
        id: 'stackRole',
        label: 'Rol ' + ctx.stackRole,
        value: 1,
        effect: ctx.stackRole === 'cover' ? '+pressure' : (ctx.stackRole === 'short' ? '+shove/steal' : 'survive')
      });
      tags.push('stackRole');
    }

    if ((ctx.multiwayCount || 2) >= 3) {
      drivers.push({
        id: 'multiway',
        label: 'Multiway ×' + ctx.multiwayCount,
        value: ctx.multiwayCount,
        effect: '−bluff −XR'
      });
      tags.push('multiway');
    }

    if (meta.exploitApplied) {
      drivers.push({
        id: 'exploit',
        label: 'Exploit',
        value: 1,
        effect: (meta.exploitReasons && meta.exploitReasons[0]) || 'vs tipo'
      });
      tags.push('exploit');
    }

    // Top 3 drivers más accionables primero (saltar band si hay otros)
    var ranked = drivers.slice().sort(function (a, b) {
      var pri = { rangeAdvantage: 0, nutAdvantage: 1, mdf: 2, icm: 3, lineIntent: 4, polarization: 5, spr: 6 };
      var pa = pri[a.id] != null ? pri[a.id] : 20;
      var pb = pri[b.id] != null ? pri[b.id] : 20;
      return pa - pb;
    });
    return {
      drivers: drivers,
      topDrivers: ranked.slice(0, 3),
      conceptTags: tags,
      bubbleFactor: bf
    };
  }

  /**
   * Pipeline completo: strategy tables → refine → drivers.
   * Usado por torneo Pro y tests de paridad.
   */
  function computePostflopMix(input) {
    input = input || {};
    var Strat = global.GTO && global.GTO.Strategy;
    if (!Strat || !Strat.postflopStrategy) return null;
    var ctx = buildBase(input.ctx || input);
    var facing = (input.toCallBB || 0) > 0 || !!input.facing;
    var strat = Strat.postflopStrategy({
      toCallBB: input.toCallBB || 0,
      potBB: input.potBB != null ? input.potBB : ctx.potBB,
      potBeforeBB: input.potBeforeBB != null ? input.potBeforeBB : Math.max((ctx.potBB || 1) - (input.toCallBB || 0), 0.1),
      heroEquity: input.heroEquity != null ? input.heroEquity : ctx.strength,
      madeHandInfo: input.madeHandInfo || ctx.madeHandInfo,
      board: ctx.board,
      heroCards: input.heroCards,
      initiative: ctx.initiative,
      inPosition: ctx.inPosition,
      spr: ctx.spr,
      street: ctx.street,
      villainLastAction: input.villainLastAction || null,
      potType: ctx.potType
    });
    if (facing) {
      var refined = refineFacing(strat, Object.assign({}, ctx, {
        toCallBB: input.toCallBB || 0,
        potBeforeBB: input.potBeforeBB,
        villainBetRatio: input.villainBetRatio
      }));
      var drv = computeDrivers(ctx, refined.freqs, {
        facing: true,
        potOdds: input.toCallBB > 0
          ? input.toCallBB / ((input.potBeforeBB || ctx.potBB) + input.toCallBB)
          : null
      });
      return {
        kind: 'facing',
        freqs: refined.freqs,
        preferOverbetRaise: refined.preferOverbetRaise,
        ctx: ctx,
        drivers: drv.drivers,
        topDrivers: drv.topDrivers,
        conceptTags: drv.conceptTags
      };
    }
    var lead = refineLead(strat, ctx);
    var drvL = computeDrivers(ctx, lead, { facing: false });
    return {
      kind: 'lead',
      freqs: lead,
      ctx: ctx,
      drivers: drvL.drivers,
      topDrivers: drvL.topDrivers,
      conceptTags: drvL.conceptTags
    };
  }

  global.GTODecisionContext = {
    clamp: clamp,
    normalize: normalize,
    bandFromMade: bandFromMade,
    usesStrategySample: usesStrategySample,
    hubOf: hubOf,
    bubbleFactorFromCtx: bubbleFactorFromCtx,
    applyIcmToFreqs: applyIcmToFreqs,
    inferStackRole: inferStackRole,
    buildBase: buildBase,
    buildFromTrainer: buildFromTrainer,
    buildFromTournament: buildFromTournament,
    refineLead: refineLead,
    refineFacing: refineFacing,
    sampleFacing: sampleFacing,
    computeDrivers: computeDrivers,
    computePostflopMix: computePostflopMix
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
