/*
 * villain-ai-assist.js — Asistente IA de villanos (torneos Pro).
 * Local-first → veto/impacto/score → L1/L3 → Gemini (timeout) → audit vs motor.
 */
(function (global) {
  'use strict';

  var TIMEOUT_MS = 1100;
  var PROMPT_VERSION = 'v1';

  function assistStateFromHand(hand) {
    var st = (hand && hand.villainAssist) || null;
    if (!st) return null;
    return st;
  }

  function hasAiQuota() {
    var E = global.PTEntitlements;
    if (!E || !E.canUseAI) return false;
    try {
      var r = E.canUseAI();
      return !!(r && r.ok);
    } catch (e) {
      return false;
    }
  }

  function quotaRemaining() {
    var E = global.PTEntitlements;
    if (!E) return null;
    try {
      if (E.aiQuotaSummary) {
        var s = E.aiQuotaSummary();
        if (s && s.unlimited) return Infinity;
        if (s && s.totalLeft != null) return Number(s.totalLeft) || 0;
      }
      if (E.aiCombinedQuota) {
        var q = E.aiCombinedQuota();
        if (q && q.unlimited) return Infinity;
        if (q && q.totalLeft != null) return Number(q.totalLeft) || 0;
      }
    } catch (e) { /* */ }
    return null;
  }

  function bandFromStrength(strength, made) {
    var DC = global.GTODecisionContext;
    if (DC && typeof DC.bandFromMade === 'function') {
      try { return DC.bandFromMade(made, strength); } catch (e) { /* */ }
    }
    var s = strength != null ? strength : 0.5;
    if (s >= 0.88) return 'nuts';
    if (s >= 0.68) return 'value';
    if (s >= 0.45) return 'merge';
    if (s >= 0.28) return 'bluffcatch';
    return 'air';
  }

  function actionFamily(id) {
    var a = String(id || '').toLowerCase();
    if (a === 'allin') return 'raise';
    if (a === 'bet') return 'bet';
    if (a === 'raise') return 'raise';
    if (a === 'call') return 'call';
    if (a === 'check') return 'check';
    if (a === 'fold') return 'fold';
    return a;
  }

  function sameActionFamily(a, b) {
    return actionFamily(a && a.id) === actionFamily(b && b.id);
  }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var t = setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error('assist_timeout'));
      }, ms);
      promise.then(function (v) {
        if (done) return;
        done = true;
        clearTimeout(t);
        resolve(v);
      }, function (e) {
        if (done) return;
        done = true;
        clearTimeout(t);
        reject(e);
      });
    });
  }

  function buildCtx(hand, seat, local) {
    var D = global.PTTournamentVillainDecide;
    var profile = local.profile || (D && D.profileForSeat ? D.profileForSeat(seat, hand) : null);
    var pot = Number(hand.pot) || 0;
    var bb = Math.max(1, Number(hand.bb) || 1);
    var potBB = pot / bb;
    var stack = Number(seat.stack) || 0;
    var stackBB = stack / bb;
    var invested = Number(seat.invested) || 0;
    var startStack = Number(seat.startStack) || (stack + invested);
    var committedFrac = startStack > 0 ? invested / startStack : 0;
    var toCall = Math.max(0, (Number(hand.currentBet) || 0) - (Number(seat.streetInvested) || 0));
    var toCallBB = toCall / bb;
    var strength = local.strength != null ? local.strength
      : (D && D.strength01 ? D.strength01(hand, seat) : 0.5);
    var made = local.made || null;
    var band = local.handBand || bandFromStrength(strength, made);
    var Cache = global.PTVillainAssistCache;
    var Comp = global.PTVillainAssistComplexity;
    var phase = Comp ? Comp.resolvePhase({
      effectivePhase: hand.effectivePhase || hand.mttPhase,
      mttPhase: hand.mttPhase,
      mttStructureSituation: hand.mttStructureSituation
    }) : (hand.mttPhase || 'mid');

    var alive = (hand.seats || []).filter(function (s) {
      return s && !s.folded && (Number(s.stack) > 0 || (Number(s.streetInvested) || 0) > 0);
    });
    var playersInPot = alive.length || 2;
    var heroStatus = Comp && Comp.heroInvolvedStatus
      ? Comp.heroInvolvedStatus(hand, null)
      : null;

    return {
      street: hand.street,
      potBB: potBB,
      stackBB: stackBB,
      villainStackBB: stackBB,
      effStackBB: stackBB,
      toCallBB: toCallBB,
      committedFrac: committedFrac,
      facingJam: toCallBB >= stackBB * 0.85,
      handBand: band,
      freqs: local.freqs,
      board: (hand.board || []).map(function (c) {
        return typeof c === 'string' ? c : (c && c.code) || c;
      }),
      formatHub: hand.formatHub || (hand.kind === 'spin' ? 'spin' : 'mtt'),
      gameType: hand.gameType || hand.formatHub,
      effectivePhase: phase,
      mttPhase: hand.mttPhase,
      mttStructureSituation: hand.mttStructureSituation,
      position: seat.pos,
      inPosition: !!local.inPosition,
      initiative: local.initiative || 'none',
      playersInPot: playersInPot,
      multiway: playersInPot >= 3,
      roleBucket: (profile && profile.id) || seat.roleId || 'pro',
      preflopStrict: profile && profile.preflopStrict,
      facingSizeBucket: Cache ? Cache.facingSizeBucket(toCallBB, potBB) : 'none',
      icmBucket: Cache ? Cache.icmBucket(phase) : 'none',
      lineIntent: seat._lineIntent || null,
      potType: hand.potType || null,
      spr: potBB > 0 ? stackBB / potBB : stackBB,
      legalOptions: local.legalOptions || null,
      /* false solo cuando el Hero ya no está en la mano (villano vs villano). */
      heroInvolved: heroStatus == null ? true : heroStatus
    };
  }

  function mergePreferRemote(localAction, remote) {
    if (!remote || !remote.action || !remote.action.id) return localAction;
    var id = String(remote.action.id).toLowerCase();
    var allowed = { fold: 1, check: 1, call: 1, bet: 1, raise: 1, allin: 1 };
    if (!allowed[id]) return localAction;
    var out = { id: id };
    if (remote.action.amount != null && isFinite(Number(remote.action.amount))) {
      out.amount = Number(remote.action.amount);
    }
    return out;
  }

  function validateAgainstLocal(hand, seat, action, localAction) {
    if (!action || !action.id) return localAction;
    var tc = Math.max(0, (Number(hand.currentBet) || 0) - (Number(seat.streetInvested) || 0));
    var id = action.id;
    if (id === 'check' && tc > 0) return localAction || { id: 'fold' };
    if (id === 'fold' && tc <= 0) return { id: 'check' };
    if ((id === 'bet' || id === 'raise' || id === 'allin') && action.amount == null) {
      if (localAction && localAction.amount != null) {
        return { id: id === 'allin' ? 'raise' : id, amount: localAction.amount };
      }
      if (id === 'allin') {
        return { id: 'raise', amount: (Number(seat.streetInvested) || 0) + (Number(seat.stack) || 0) };
      }
    }
    return action;
  }

  function estimateEvDelta(localAction, finalAction, local) {
    /* Heurística ligera: si coinciden → 0; si no, usar freqs locales como proxy. */
    if (sameActionFamily(localAction, finalAction)) return 0;
    var freqs = (local && local.freqs) || {};
    var locF = Number(freqs[actionFamily(localAction && localAction.id)]) || 0;
    var finF = Number(freqs[actionFamily(finalAction && finalAction.id)]) || 0;
    /* ΔEV aproximado en bb: diferencia de masa de probabilidad * escala. */
    return Math.round(((finF - locF) * 0.8) * 100) / 100;
  }

  function auditTag(agree, deltaEv) {
    if (agree) return 'agree';
    if (deltaEv > 0.05) return 'differ_better';
    if (deltaEv < -0.05) return 'differ_worse';
    return 'differ_neutral';
  }

  function recordAudit(payload) {
    try {
      var c = global.PTSupabase && global.PTSupabase.getClient && global.PTSupabase.getClient();
      if (c && c.rpc) {
        c.rpc('pt_villain_assist_audit_insert', {
          p_payload: payload
        }).then(function () { /* fire-and-forget */ }, function () { /* */ });
      }
    } catch (e) { /* */ }
    try {
      if (global.PTLog && global.PTLog.event) {
        global.PTLog.event('villain_assist_audit', {
          tag: payload.tag,
          source: payload.source,
          phase: payload.phase,
          level: payload.level
        });
      }
    } catch (e2) { /* */ }
  }

  async function fetchVillainAction(ctx, local) {
    var endpoint = (global.PT_AI && global.PT_AI.endpoint) || '';
    if (!endpoint) throw new Error('no_endpoint');
    var token = null;
    if (global.PTSupabase && global.PTSupabase.getAccessToken) {
      token = await global.PTSupabase.getAccessToken();
    }
    if (!token) throw new Error('missing_auth');
    var key = (global.PTSupabase && global.PTSupabase.anonKey) || '';
    if (typeof key === 'function') key = key();
    var body = {
      mode: 'villain_action',
      payload: {
        spot: ctx,
        localAction: local.action,
        localFreqs: local.freqs || null,
        handBand: ctx.handBand,
        strength: local.strength
      }
    };
    if (global.PTDemo && global.PTDemo.isActive && global.PTDemo.isActive()) body.demo = true;
    if (global.PTCommunity && global.PTCommunity.aiCommunityId) {
      var cid = global.PTCommunity.aiCommunityId();
      if (cid) body.communityId = cid;
    }
    var res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'apikey': key || ''
      },
      body: JSON.stringify(body)
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      throw new Error(data.error || ('HTTP ' + res.status));
    }
    var action = data.action || (data.result && data.result.action);
    var freqs = data.freqs || data.action_freqs || (data.result && data.result.freqs);
    if (!action || !action.id) {
      if (freqs) {
        var Cache = global.PTVillainAssistCache;
        var id = Cache ? Cache.sampleFromFreqs(freqs) : null;
        if (id) action = { id: id, amount: data.sizeBB != null ? data.sizeBB : data.size_bb };
      }
    }
    if (!action || !action.id) throw new Error('invalid_action');
    return {
      action: {
        id: String(action.id).toLowerCase(),
        amount: action.amount != null ? action.amount : (action.sizeBB != null ? action.sizeBB : null)
      },
      freqs: freqs || null,
      confidence: data.confidence != null ? Number(data.confidence) : 0.55,
      model: data.model || null,
      promptVersion: PROMPT_VERSION,
      valid: true,
      charged: data.charged !== false
    };
  }

  function resolveLocalStrength(hand, seat) {
    var D = global.PTTournamentVillainDecide;
    if (!D || typeof D.strength01 !== 'function') return 0.5;
    try {
      if (seat && seat.cards) {
        return D.strength01(seat.cards, (hand && hand.board) || [], (hand && hand.street) || 'flop');
      }
    } catch (e) { /* */ }
    return 0.5;
  }

  function resolveMade(hand, seat) {
    var Made = global.GTOEquityMadeHand;
    if (!Made || typeof Made.classifyMadeHand !== 'function' || !seat || !seat.cards) return null;
    try {
      var hole = (seat.cards || []).map(function (c) {
        return typeof c === 'string' ? c : (c && c.code) || c;
      }).filter(Boolean);
      var board = ((hand && hand.board) || []).map(function (c) {
        return typeof c === 'string' ? c : (c && c.code) || c;
      }).filter(Boolean);
      if (hole.length >= 2 && board.length >= 3) return Made.classifyMadeHand(hole, board);
    } catch (e) { /* */ }
    return null;
  }

  /**
   * Freqs sintéticas cuando el motor solo devuelve la acción muestreada.
   * 72/28 fija daba mixEntropy≈0.25 y el score casi nunca superaba el umbral
   * Alta en SNG early/mid/late. Bandas ambiguas → mezcla cerrada; claras → más sesgo.
   */
  function syntheticFreqsForAssist(actionId, handBand, facingJam) {
    var primary = actionFamily(actionId);
    var secondary = primary === 'fold' ? 'call'
      : (primary === 'check' ? 'bet' : 'fold');
    var band = String(handBand || '').toLowerCase();
    var ambiguous = band === 'merge' || band === 'bluffcatch' || band === 'draw' || band === 'semi';
    var weak = band === 'air' || band === 'weak' || band === 'bluffcatch';
    var p;
    if (facingJam) {
      p = (weak || ambiguous) ? 0.54 : 0.62;
    } else if (ambiguous) {
      p = 0.56;
    } else if (band === 'value') {
      p = 0.68;
    } else if (band === 'nuts') {
      p = 0.82;
    } else if (band === 'air' && primary === 'fold') {
      p = 0.80;
    } else {
      p = 0.64;
    }
    var freqs = {};
    freqs[primary] = p;
    freqs[secondary] = Math.round((1 - p) * 100) / 100;
    return freqs;
  }

  function computeLocalBundle(hand, seat) {
    var D = global.PTTournamentVillainDecide;
    var action = { id: 'check' };
    if (D && typeof D.decide === 'function') {
      try { action = D.decide(hand, seat) || action; } catch (e) { /* */ }
    }
    var profile = D && D.profileForSeat ? D.profileForSeat(seat, hand) : null;
    var strength = resolveLocalStrength(hand, seat);
    var made = resolveMade(hand, seat);
    var handBand = bandFromStrength(strength, made);
    var toCall = Math.max(0, (Number(hand.currentBet) || 0) - (Number(seat.streetInvested) || 0));
    var stack = Number(seat.stack) || 0;
    var facingJam = toCall > 0 && stack > 0 && toCall >= stack * 0.85;
    var freqs = syntheticFreqsForAssist(action.id, handBand, facingJam);
    return {
      action: action,
      freqs: freqs,
      profile: profile,
      strength: strength,
      made: made,
      handBand: handBand
    };
  }

  /**
   * Decisión con assist. Si no aplica, devuelve acción local sync vía Promise.resolve.
   */
  async function decideWithAssist(hand, seat) {
    var Flags = global.PTVillainAssistFlags;
    var Comp = global.PTVillainAssistComplexity;
    var Cache = global.PTVillainAssistCache;
    var local = computeLocalBundle(hand, seat);
    var localAction = local.action;

    if (!Flags || !Flags.isEnabled()) return localAction;
    var st = assistStateFromHand(hand);
    if (!st || !st.enabled) return localAction;

    var presetId = (hand.tournamentConfig && hand.tournamentConfig.id) || hand.presetId;
    if (Comp && !Comp.isProPreset(presetId) && !(hand.villainAssist && hand.villainAssist.forcePro)) {
      return localAction;
    }

    var level = (st.level || 'medium');
    var lvlCfg = Comp ? Comp.levelConfig(level) : { threshold: 0.52, capPerHand: 2, capPerTournament: 40 };
    st.usedThisHand = Number(st.usedThisHand) || 0;
    st.calls = Number(st.calls) || 0;
    if (st.usedThisHand >= lvlCfg.capPerHand) return localAction;
    if (st.calls >= lvlCfg.capPerTournament) return localAction;

    var ctx = buildCtx(hand, seat, local);
    var ev = Comp ? Comp.evaluate(ctx, local, seat, hand, level) : { shouldAssist: false, reason: 'no_comp' };
    if (!ev.shouldAssist) {
      try {
        if (global.PTLog && global.PTLog.event) {
          global.PTLog.event('villain_assist_skipped', { reason: ev.reason, phase: ev.phase, score: ev.score });
        }
      } catch (eSk) { /* */ }
      return localAction;
    }

    var key = Cache ? Cache.buildKeyFromCtx(ctx) : null;
    var remote = null;
    var source = null;

    if (key && Cache) {
      try {
        remote = await Cache.lookup(key);
        if (remote) source = remote.source || 'cache';
      } catch (eL) { /* */ }
    }

    if (!remote) {
      var left = quotaRemaining();
      var canCharge = hasAiQuota() && (left == null || left > 0 || left === Infinity);
      if (!canCharge) {
        /* Solo-caché: sin miss de red. */
        return localAction;
      }
      try {
        remote = await withTimeout(fetchVillainAction(ctx, local), TIMEOUT_MS);
        source = 'gemini';
        if (remote && remote.valid) {
          st.calls += 1;
          st.usedThisHand += 1;
          if (key && Cache) {
            try { await Cache.write(key, remote); } catch (eW) { /* */ }
          }
          try {
            if (global.PTEntitlements && global.PTEntitlements.refresh) {
              global.PTEntitlements.refresh();
            }
          } catch (eR) { /* */ }
        }
      } catch (eFetch) {
        try {
          if (global.PTLog && global.PTLog.event) {
            global.PTLog.event('villain_assist_fallback', {
              error: String(eFetch && eFetch.message || eFetch)
            });
          }
        } catch (eF) { /* */ }
        return localAction;
      }
    }

    if (!remote || !remote.action) return localAction;
    var merged = mergePreferRemote(localAction, remote);
    var finalAction = validateAgainstLocal(hand, seat, merged, localAction);
    var agree = sameActionFamily(localAction, finalAction);
    var deltaEv = estimateEvDelta(localAction, finalAction, local);
    var tag = auditTag(agree, deltaEv);

    recordAudit({
      tag: tag,
      agree: agree,
      deltaEvVillain: deltaEv,
      source: source,
      phase: ev.phase,
      level: lvlCfg.id,
      score: ev.score,
      impact: ev.impact,
      presetId: presetId || null,
      spotKey: key,
      localAction: localAction && localAction.id,
      finalAction: finalAction && finalAction.id,
      charged: source === 'gemini',
      at: new Date().toISOString()
    });

    if (source === 'gemini' || source === 'l1' || source === 'l3' || source === 'cache') {
      try {
        if (global.PTLog && global.PTLog.event) {
          global.PTLog.event(source === 'gemini' ? 'assist_called' : 'assist_cache_hit', {
            phase: ev.phase,
            level: lvlCfg.id
          });
        }
      } catch (eE) { /* */ }
    }

    return finalAction;
  }

  function resetHandCounters(hand) {
    if (hand && hand.villainAssist) hand.villainAssist.usedThisHand = 0;
  }

  global.PTVillainAiAssist = {
    decideWithAssist: decideWithAssist,
    computeLocalBundle: computeLocalBundle,
    syntheticFreqsForAssist: syntheticFreqsForAssist,
    buildCtx: buildCtx,
    mergePreferRemote: mergePreferRemote,
    sameActionFamily: sameActionFamily,
    quotaRemaining: quotaRemaining,
    hasAiQuota: hasAiQuota,
    resetHandCounters: resetHandCounters,
    TIMEOUT_MS: TIMEOUT_MS
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
