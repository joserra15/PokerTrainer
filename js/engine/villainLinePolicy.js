/*
 * villainLinePolicy.js — Política de líneas del villano pro:
 * check-raise, delayed c-bet, probe, donk, overbet, LinePlan multi-calle.
 * Heurística con frecuencias (no solver tree).
 */
(function (global) {
  'use strict';

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function boardTexture(board) {
    const Board = global.GTOBoardCluster;
    if (Board && Board.boardTexture) return Board.boardTexture(board || []);
    return { wet: false, paired: false, monotone: false };
  }

  function formatMults(ctx) {
    const FA = global.GTOVillainFormatAdjust;
    return FA && FA.multipliers ? FA.multipliers(ctx) : { xr: 1, overbet: 1, bluff: 1, cbet: 1 };
  }

  function exploitMults(ctx) {
    const Ex = global.GTOVillainProExploit;
    return Ex && Ex.multipliers ? Ex.multipliers(ctx) : { xr: 1, overbet: 1, barrel: 1, donk: 1 };
  }

  /**
   * ¿Spot apto para overbet de river (lead o raise)?
   */
  function overbetEligible(ctx) {
    ctx = ctx || {};
    if (ctx.street !== 'river') return false;
    const m = formatMults(ctx);
    if (m.overbet < 0.2) return false;
    const spr = ctx.spr != null ? ctx.spr : 8;
    const band = ctx.band || '';
    const polar = ctx.polarization != null ? ctx.polarization : 0.4;
    const strength = ctx.strength != null ? ctx.strength : 0.5;
    const nuts = !!ctx.isNuts || band === 'nuts' || (ctx.madeCategory != null && ctx.madeCategory >= 4);
    const air = band === 'air' || strength < 0.28;
    const valuePolar = nuts || (band === 'value' && strength > 0.78);
    const bluffPolar = air && (ctx.hasBlocker || polar > 0.45);
    if (spr > 12 && !nuts) return false;
    if (valuePolar || bluffPolar) return true;
    if (polar > 0.55 && (strength > 0.72 || strength < 0.3)) return true;
    if (spr <= 4 && strength > 0.65) return true;
    return false;
  }

  /** Peso base de overbet cuando es elegible (antes de format/exploit). */
  function overbetWeight(ctx) {
    if (!overbetEligible(ctx)) return 0;
    const m = formatMults(ctx);
    const e = exploitMults(ctx);
    let w = 0.14;
    if (ctx.isNuts || ctx.band === 'nuts') w = 0.22;
    else if (ctx.band === 'air' || (ctx.strength != null && ctx.strength < 0.28)) w = 0.16;
    else if (ctx.band === 'value') w = 0.18;
    if ((ctx.spr != null && ctx.spr <= 3.5) || (ctx.stackBB != null && ctx.stackBB <= 25)) w += 0.06;
    return clamp(w * m.overbet * (e.overbet || 1), 0, 0.35);
  }

  /**
   * Plan de línea multi-calle: polar|merge + intents + compromiso por calle.
   */
  function createLinePlan(ctx) {
    ctx = ctx || {};
    const RA = global.GTORangeAdvantage;
    let polar = ctx.polarization;
    if (polar == null && RA && RA.betPolarization) {
      polar = RA.betPolarization(ctx, ctx.band || 'merge');
    }
    polar = polar != null ? polar : 0.4;
    const mode = polar >= 0.52 ? 'polar' : 'merge';
    return {
      mode: mode,
      polarization: polar,
      intents: [],
      streetCommit: {},
      trapIp: false,
      floatOop: false,
      barrelCount: 0,
      giveUp: false,
      riverPlan: null
    };
  }

  function updateLinePlan(plan, event) {
    plan = plan || createLinePlan({});
    event = event || {};
    const street = event.street || 'flop';
    const action = event.action || null;
    const intent = event.intent || null;
    if (intent && plan.intents.indexOf(intent) < 0) plan.intents.push(intent);
    if (action) plan.streetCommit[street] = action;
    if (action === 'bet' || action === 'raise') {
      plan.barrelCount = (plan.barrelCount || 0) + 1;
      plan.giveUp = false;
    }
    if (intent === 'checkRaise') plan.mode = 'polar';
    if (intent === 'trap') plan.trapIp = true;
    if (intent === 'float') plan.floatOop = true;
    if (intent === 'giveUp') plan.giveUp = true;
    if (street === 'river' && event.riverPlan) plan.riverPlan = event.riverPlan;
    if (event.mode) plan.mode = event.mode;
    return plan;
  }

  /**
   * Decide river raise-call vs raise-fold plan según SPR / band.
   */
  function riverRaisePlan(ctx) {
    const spr = ctx.spr != null ? ctx.spr : 8;
    const band = ctx.band || '';
    const strength = ctx.strength != null ? ctx.strength : 0.5;
    if (band === 'nuts' || (ctx.isNuts && strength > 0.85)) return 'raise-call';
    if (band === 'value' && strength > 0.75 && spr <= 4) return 'raise-call';
    if (band === 'air' || strength < 0.3) return 'raise-fold';
    if (band === 'merge' || band === 'bluffcatch') return spr <= 2.5 ? 'raise-call' : 'call';
    return strength > 0.65 ? 'raise-call' : 'raise-fold';
  }

  /**
   * Decisión de lead (primero en actuar en la calle).
   * Retorna { actionHint, intent, forceCheck, preferSizeKey, reason, linePlanPatch }
   */
  function decideLead(ctx, rnd) {
    ctx = ctx || {};
    rnd = rnd != null ? rnd : Math.random();
    const m = formatMults(ctx);
    const e = exploitMults(ctx);
    const street = ctx.street || 'flop';
    const texture = boardTexture(ctx.board);
    const inPos = !!ctx.inPosition;
    const isAgg = ctx.initiative === 'aggressor';
    const strength = ctx.strength != null ? ctx.strength : 0.5;
    const band = ctx.band || '';
    const priorChecks = !!ctx.priorStreetCheckCheck;
    const plan = ctx.linePlan || null;
    const rangeAdv = ctx.rangeAdvantage != null ? ctx.rangeAdvantage : 0;
    const polar = (plan && plan.polarization != null)
      ? plan.polarization
      : (ctx.polarization != null ? ctx.polarization : 0.4);

    // Give-up tras línea polar fallida (air en turn/river)
    if (plan && plan.mode === 'polar' && (band === 'air' || strength < 0.28)
      && (street === 'turn' || street === 'river') && plan.barrelCount >= 1) {
      let giveFreq = clamp(0.55 - rangeAdv * 0.2, 0.35, 0.75);
      if (m.bluff < 0.7) giveFreq += 0.1;
      if (rnd < giveFreq) {
        return {
          actionHint: 'check',
          intent: 'giveUp',
          forceCheck: true,
          preferSizeKey: null,
          reason: 'polar_give_up',
          linePlanPatch: { intent: 'giveUp', action: 'check' }
        };
      }
    }

    // Float OOP: tras check-call flop, probe turn si pasivo
    if (plan && plan.floatOop && street === 'turn' && !isAgg && !inPos) {
      if (strength > 0.42 || band === 'merge' || band === 'value') {
        let probe = clamp(0.28 * m.cbet, 0.15, 0.4);
        if (rnd < probe) {
          return {
            actionHint: 'bet',
            intent: 'probe',
            forceCheck: false,
            preferSizeKey: 'bet_33',
            reason: 'float_probe',
            linePlanPatch: { intent: 'probe', action: 'bet' }
          };
        }
      }
    }

    // Trap IP vs calling station
    if (inPos && street === 'flop' && (band === 'nuts' || (band === 'value' && strength > 0.8))
      && !texture.wet && m.bluff > 0.5) {
      const heroFish = ctx.heroProfile === 'callingStation' || ctx.heroProfile === 'fish'
        || ctx.heroProfile === 'station';
      if (heroFish) {
        let trapFreq = clamp(0.14 * (e.barrel || 1), 0.06, 0.22);
        if (rnd < trapFreq) {
          return {
            actionHint: 'check',
            intent: 'trap',
            forceCheck: true,
            preferSizeKey: null,
            reason: 'trap_ip',
            linePlanPatch: { intent: 'trap', action: 'check', mode: 'merge' }
          };
        }
      }
    }

    // Delayed c-bet: agresor, flop fue check-check, turn
    if (isAgg && priorChecks && street === 'turn') {
      let delayFreq = clamp(0.42 * m.cbet * (e.barrel || 1), 0.25, 0.62);
      if (texture.wet) delayFreq *= 0.85;
      if (rangeAdv > 0.15) delayFreq = clamp(delayFreq + 0.08, 0.3, 0.72);
      if (strength > 0.55 || band === 'value' || band === 'nuts') delayFreq = clamp(delayFreq + 0.12, 0.3, 0.75);
      if (rnd < delayFreq) {
        return {
          actionHint: 'bet',
          intent: 'delayedCbet',
          forceCheck: false,
          preferSizeKey: polar > 0.55 ? 'bet_66' : 'bet_33',
          reason: 'delayed_cbet',
          linePlanPatch: { intent: 'delayedCbet', action: 'bet' }
        };
      }
    }

    // Barrel / double barrel según polarización + range advantage
    if (isAgg && street === 'turn' && plan && plan.barrelCount >= 1 && !priorChecks) {
      let barrelFreq = clamp(0.38 + polar * 0.25 + rangeAdv * 0.15, 0.22, 0.72);
      barrelFreq *= m.cbet * (e.barrel || 1);
      if (band === 'air') barrelFreq *= m.bluff;
      if (band === 'nuts' || band === 'value') barrelFreq = clamp(barrelFreq + 0.15, 0.3, 0.85);
      if (texture.wet && band === 'merge') barrelFreq *= 0.75;
      if (rnd < barrelFreq) {
        return {
          actionHint: 'bet',
          intent: 'barrel',
          forceCheck: false,
          preferSizeKey: polar > 0.55 ? 'bet_66' : 'bet_33',
          reason: 'double_barrel',
          linePlanPatch: { intent: 'barrel', action: 'bet' }
        };
      }
      if (band === 'air' || band === 'bluffcatch') {
        return {
          actionHint: 'check',
          intent: 'giveUp',
          forceCheck: true,
          preferSizeKey: null,
          reason: 'barrel_give_up',
          linePlanPatch: { intent: 'giveUp', action: 'check' }
        };
      }
    }

    // Donk: caller OOP, fuerte / nutted, turn/river — raro
    if (!isAgg && !inPos && (street === 'turn' || street === 'river')) {
      const strong = strength > 0.78 || band === 'nuts' || band === 'value' || (ctx.madeCategory != null && ctx.madeCategory >= 3);
      if (strong) {
        let donkFreq = clamp(0.07 * (e.donk || 1), 0.03, 0.14);
        if (street === 'river') donkFreq *= 1.15;
        if (m.bluff < 0.7) donkFreq *= 0.6;
        if (rnd < donkFreq) {
          return {
            actionHint: 'bet',
            intent: 'donk',
            forceCheck: false,
            preferSizeKey: 'bet_66',
            reason: 'donk_strong',
            linePlanPatch: { intent: 'donk', action: 'bet' }
          };
        }
      }
    }

    // Check-raise setup: OOP flop (mid/wet) o turn (más raro, polar)
    if (!inPos && m.xr >= 0.5) {
      const midWet = texture.wet || (!texture.paired && !texture.monotone);
      const canXrValue = strength > 0.62 || band === 'value' || band === 'nuts' || (ctx.madeCategory != null && ctx.madeCategory >= 2);
      const canXrBluff = (strength < 0.35 || band === 'air') && m.bluff > 0.65;
      if (street === 'flop' && midWet && (canXrValue || canXrBluff)) {
        let xrSetup = clamp(0.12 * m.xr * (e.xr || 1), 0.05, 0.22);
        if (canXrValue) xrSetup = clamp(xrSetup + 0.04, 0.06, 0.24);
        if (texture.paired) xrSetup *= 0.55;
        if ((ctx.multiwayCount || 2) >= 3) xrSetup *= 0.45;
        if (rnd < xrSetup) {
          return {
            actionHint: 'check',
            intent: 'checkRaise',
            forceCheck: true,
            preferSizeKey: null,
            reason: 'xr_setup',
            linePlanPatch: { intent: 'checkRaise', action: 'check', mode: 'polar' }
          };
        }
      }
      if (street === 'turn' && ((canXrValue && strength > 0.7) || (canXrBluff && polar > 0.55))) {
        let xrTurn = clamp(0.07 * m.xr * (e.xr || 1), 0.03, 0.14);
        if (texture.wet) xrTurn *= 1.15;
        if ((ctx.multiwayCount || 2) >= 3) xrTurn *= 0.4;
        if (rnd < xrTurn) {
          return {
            actionHint: 'check',
            intent: 'checkRaise',
            forceCheck: true,
            preferSizeKey: null,
            reason: 'xr_turn_setup',
            linePlanPatch: { intent: 'checkRaise', action: 'check', mode: 'polar' }
          };
        }
      }
    }

    // Protection bet OOP wet con value medio
    if (!inPos && street === 'flop' && texture.wet && (band === 'value' || band === 'merge')
      && strength >= 0.55 && strength <= 0.78 && isAgg) {
      let prot = clamp(0.34 * m.cbet, 0.2, 0.48);
      if (rnd < prot) {
        return {
          actionHint: 'bet',
          intent: 'protection',
          forceCheck: false,
          preferSizeKey: 'bet_66',
          reason: 'protection_wet',
          linePlanPatch: { intent: 'protection', action: 'bet', mode: 'merge' }
        };
      }
    }

    // Overbet lead river
    if (street === 'river' && overbetEligible(ctx)) {
      const w = overbetWeight(ctx);
      if (w > 0.08 && rnd < w * 1.4) {
        const rp = riverRaisePlan(ctx);
        return {
          actionHint: 'auto',
          intent: 'overbet',
          forceCheck: false,
          preferSizeKey: 'overbet',
          reason: 'river_overbet',
          linePlanPatch: { intent: 'overbet', action: 'bet', riverPlan: rp }
        };
      }
    }

    return {
      actionHint: 'auto',
      intent: null,
      forceCheck: false,
      preferSizeKey: null,
      reason: 'default',
      linePlanPatch: null
    };
  }

  /**
   * Ajuste de freqs al enfrentar apuesta (check-raise follow-through).
   */
  function adjustFacing(freqs, ctx) {
    ctx = ctx || {};
    const out = Object.assign({}, freqs || {});
    const m = formatMults(ctx);
    const e = exploitMults(ctx);

    if (ctx.lineIntent === 'checkRaise') {
      const street = ctx.street || 'flop';
      let boost = street === 'flop' ? 0.22 : (street === 'turn' ? 0.16 : 0.12);
      boost *= m.xr * (e.xr || 1);
      const strength = ctx.strength != null ? ctx.strength : 0.5;
      if (strength < 0.38) boost *= m.bluff;
      if (strength > 0.7) boost *= 1.15;
      if ((ctx.multiwayCount || 2) >= 3) boost *= 0.55;
      const raise = (out.raise || 0) + boost;
      const fold = Math.max(0, (out.fold || 0) * 0.75);
      const call = Math.max(0, 1 - raise - fold);
      out.raise = raise;
      out.fold = fold;
      out.call = call;
    }

    // Tras float: más fold a second barrel si air
    if (ctx.linePlan && ctx.linePlan.floatOop && ctx.street === 'turn'
      && (ctx.band === 'air' || (ctx.strength != null && ctx.strength < 0.35))) {
      out.fold = (out.fold || 0) * 1.2;
      out.call = (out.call || 0) * 0.75;
    }

    // Raise polar river → boost overbet eligibility flag
    if (ctx.street === 'river' && overbetEligible(ctx) && (out.raise || 0) > 0.05) {
      out._preferOverbetRaise = true;
      if (ctx.linePlan) {
        ctx.linePlan.riverPlan = riverRaisePlan(ctx);
      }
    }

    let sum = (out.fold || 0) + (out.call || 0) + (out.raise || 0);
    if (sum > 0) {
      out.fold = (out.fold || 0) / sum;
      out.call = (out.call || 0) / sum;
      out.raise = (out.raise || 0) / sum;
    }
    return out;
  }

  /** Ajuste opcional de lead freqs según LinePlan. */
  function adjustLead(freqs, ctx) {
    ctx = ctx || {};
    const out = Object.assign({}, freqs || {});
    const plan = ctx.linePlan;
    if (!plan) return out;
    const betKeys = ['bet_33', 'bet_66', 'bet_100', 'bet_125', 'overbet', 'bet'];
    if (plan.giveUp) {
      betKeys.forEach(function (k) {
        if (out[k] != null) out[k] *= 0.35;
      });
      out.check = (out.check || 0) + 0.25;
    } else if (plan.mode === 'polar' && (ctx.street === 'turn' || ctx.street === 'river')) {
      if (out.bet_33 != null && out.bet_66 != null) {
        const move = (out.bet_33 || 0) * 0.4;
        out.bet_33 *= 0.6;
        out.bet_100 = (out.bet_100 || 0) + move * 0.5;
        out.overbet = (out.overbet || 0) + move * 0.5;
      }
    } else if (plan.mode === 'merge') {
      if (out.overbet != null) {
        out.bet_66 = (out.bet_66 || 0) + (out.overbet || 0) * 0.6;
        out.overbet *= 0.4;
      }
    }
    let sum = 0;
    Object.keys(out).forEach(function (k) {
      if (k.charAt(0) === '_') return;
      sum += Math.max(0, out[k] || 0);
    });
    if (sum > 0) {
      Object.keys(out).forEach(function (k) {
        if (k.charAt(0) === '_') return;
        out[k] = Math.max(0, out[k] || 0) / sum;
      });
    }
    return out;
  }

  global.GTOVillainLinePolicy = {
    overbetEligible: overbetEligible,
    overbetWeight: overbetWeight,
    decideLead: decideLead,
    adjustFacing: adjustFacing,
    adjustLead: adjustLead,
    createLinePlan: createLinePlan,
    updateLinePlan: updateLinePlan,
    riverRaisePlan: riverRaisePlan,
    boardTexture: boardTexture
  };
})(typeof window !== 'undefined' ? window : global);
