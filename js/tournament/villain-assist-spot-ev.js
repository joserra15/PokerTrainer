/*
 * villain-assist-spot-ev.js — ΔEV spot motor vs assist vía PTTournamentGtoEval.
 * No inventa freqs: si el solver no scorifica → tagSpot = unscored.
 */
(function (global) {
  'use strict';

  var THRESHOLD_BB = 0.05;

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

  function normalizeAction(action) {
    if (!action) return null;
    if (typeof action === 'string') return { id: String(action).toLowerCase() };
    var id = action.id != null ? String(action.id).toLowerCase() : '';
    if (!id) return null;
    var out = { id: id };
    if (action.amount != null && isFinite(Number(action.amount))) {
      out.amount = Number(action.amount);
    }
    return out;
  }

  function scoreAction(hand, seat, action) {
    var G = global.PTTournamentGtoEval;
    if (!G || typeof G.evaluateHeroAction !== 'function') {
      return { scored: false, reason: 'no_gto_eval', unscored: true };
    }
    var act = normalizeAction(action);
    if (!act) return { scored: false, reason: 'no_action', unscored: true };
    try {
      var graded = G.evaluateHeroAction(hand, seat, act);
      if (!graded || graded.unscored || graded.class === 'unscored') {
        return {
          scored: false,
          reason: graded && graded.error ? String(graded.error) : 'unscored',
          unscored: true,
          graded: graded || null
        };
      }
      var actionEV = graded.actionEV;
      if (actionEV == null && graded.bestEV != null && graded.evLoss != null) {
        actionEV = Number(graded.bestEV) - Number(graded.evLoss);
      }
      return {
        scored: true,
        unscored: false,
        actionEV: actionEV != null && isFinite(Number(actionEV)) ? Number(actionEV) : null,
        evLoss: Number(graded.evLoss) || 0,
        frequency: Number(graded.frequency) || 0,
        class: graded.class || null,
        graded: graded
      };
    } catch (e) {
      return { scored: false, reason: String(e && e.message || e), unscored: true };
    }
  }

  /**
   * Compara acción local (motor) vs final (assist) en el mismo spot.
   * Preferir Δ de actionEV; si falta, Δ de −evLoss (menor pérdida = mejor).
   */
  function compareActions(hand, seat, localAction, finalAction) {
    var local = normalizeAction(localAction);
    var final = normalizeAction(finalAction);
    if (!local || !final) {
      return {
        scored: false,
        tagSpot: 'unscored',
        deltaEvSpotBb: null,
        evLocal: null,
        evFinal: null,
        reason: 'missing_action'
      };
    }
    if (sameActionFamily(local, final)) {
      return {
        scored: true,
        tagSpot: 'agree',
        deltaEvSpotBb: 0,
        evLocal: null,
        evFinal: null,
        reason: 'same_family'
      };
    }

    var sLocal = scoreAction(hand, seat, local);
    var sFinal = scoreAction(hand, seat, final);
    if (!sLocal.scored || !sFinal.scored) {
      return {
        scored: false,
        tagSpot: 'unscored',
        deltaEvSpotBb: null,
        evLocal: sLocal.actionEV != null ? sLocal.actionEV : null,
        evFinal: sFinal.actionEV != null ? sFinal.actionEV : null,
        reason: sLocal.reason || sFinal.reason || 'unscored',
        localScore: sLocal,
        finalScore: sFinal
      };
    }

    var delta = null;
    if (sLocal.actionEV != null && sFinal.actionEV != null) {
      delta = sFinal.actionEV - sLocal.actionEV;
    } else {
      /* Menor evLoss = mejor → Δ positivo si final pierde menos. */
      delta = (Number(sLocal.evLoss) || 0) - (Number(sFinal.evLoss) || 0);
    }
    delta = Math.round(delta * 100) / 100;

    var tagSpot = 'differ_neutral';
    if (delta > THRESHOLD_BB) tagSpot = 'differ_better';
    else if (delta < -THRESHOLD_BB) tagSpot = 'differ_worse';

    return {
      scored: true,
      tagSpot: tagSpot,
      deltaEvSpotBb: delta,
      evLocal: sLocal.actionEV != null ? sLocal.actionEV : -(Number(sLocal.evLoss) || 0),
      evFinal: sFinal.actionEV != null ? sFinal.actionEV : -(Number(sFinal.evLoss) || 0),
      reason: 'ok',
      localScore: sLocal,
      finalScore: sFinal
    };
  }

  /**
   * Re-evalúa desde un snapshot de audit (sin hand/seat vivos).
   * Reconstruye un hand/seat mínimo compatible con evaluateHeroAction.
   */
  function compareFromSnapshot(snap, localAction, finalAction) {
    snap = snap || {};
    var bb = Math.max(1, Number(snap.bb) || 1);
    var potBB = Number(snap.potBB);
    if (!isFinite(potBB) && snap.pot != null) potBB = Number(snap.pot) / bb;
    var stackBB = Number(snap.stackBB);
    if (!isFinite(stackBB) && snap.stack != null) stackBB = Number(snap.stack) / bb;
    var toCallBB = Number(snap.toCallBB);
    if (!isFinite(toCallBB) && snap.toCall != null) toCallBB = Number(snap.toCall) / bb;
    potBB = isFinite(potBB) ? potBB : 0;
    stackBB = isFinite(stackBB) ? stackBB : 0;
    toCallBB = isFinite(toCallBB) ? Math.max(0, toCallBB) : 0;

    var hole = (snap.hole || snap.villainHole || []).map(function (c) {
      return typeof c === 'string' ? c : (c && c.code) || c;
    }).filter(Boolean);
    var board = (snap.board || []).map(function (c) {
      return typeof c === 'string' ? c : (c && c.code) || c;
    }).filter(Boolean);

    var seat = {
      id: 'audit_villain',
      pos: snap.position || snap.pos || 'BTN',
      cards: hole.map(function (code) { return { code: code }; }),
      stack: stackBB * bb,
      streetInvested: 0,
      invested: 0,
      folded: false,
      isHero: false
    };
    var currentBet = toCallBB * bb;
    var hand = {
      street: snap.street || 'flop',
      board: board,
      pot: potBB * bb,
      bb: bb,
      currentBet: currentBet,
      minRaise: bb,
      seats: [seat],
      mttPhase: snap.phase || snap.effectivePhase || snap.mttPhase || 'mid',
      effectivePhase: snap.phase || snap.effectivePhase || snap.mttPhase || 'mid',
      mttStructureSituation: snap.mttStructureSituation || null,
      formatHub: snap.formatHub || 'mtt',
      gameType: snap.gameType || snap.formatHub || 'mtt',
      kind: snap.kind || null,
      playersLeft: snap.playersLeft != null ? snap.playersLeft : null,
      placesPaid: snap.placesPaid != null ? snap.placesPaid : null,
      playersSeated: snap.playersInPot != null ? snap.playersInPot : 2,
      tournamentConfig: snap.presetId ? { id: snap.presetId } : null
    };
    if (toCallBB > 0) {
      /* Un agresor fantasma para toCall coherente. */
      hand.seats.push({
        id: 'audit_opp',
        pos: 'BB',
        cards: [],
        stack: stackBB * bb,
        streetInvested: currentBet,
        invested: currentBet,
        folded: false,
        isHero: false
      });
      hand.openerId = 'audit_opp';
    }
    return compareActions(hand, seat, localAction || snap.localAction, finalAction || snap.finalAction);
  }

  function auditTagFromDelta(agree, deltaEv) {
    if (agree) return 'agree';
    if (deltaEv > THRESHOLD_BB) return 'differ_better';
    if (deltaEv < -THRESHOLD_BB) return 'differ_worse';
    return 'differ_neutral';
  }

  global.PTVillainAssistSpotEv = {
    THRESHOLD_BB: THRESHOLD_BB,
    compareActions: compareActions,
    compareFromSnapshot: compareFromSnapshot,
    scoreAction: scoreAction,
    sameActionFamily: sameActionFamily,
    actionFamily: actionFamily,
    auditTagFromDelta: auditTagFromDelta,
    normalizeAction: normalizeAction
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
