/*
 * lineReconcile.js — Matiza veredictos nodales cuando la línea completa es
 * check-raise (check → raise/all-in en la misma calle).
 *
 * El motor puntúa el check en aislamiento (vs bet/check en el nodo libre).
 * ForgeCoach y la pedagogía tratan check-raise como una sola jugada: si el
 * follow-through es bueno, no dejar el setup como «imprecisa/error».
 */
(function (global) {
  'use strict';

  const CLASS_RANK = { optima: 0, aceptable: 1, imprecisa: 2, error: 3, unscored: 4 };
  const GOOD = { optima: true, aceptable: true };

  function actionId(d) {
    if (!d) return '';
    return String(d.action || d.chosen || d.chosenAction || '').toLowerCase();
  }

  function isCheck(act) {
    return act === 'check';
  }

  function isRaiseFollowThrough(act) {
    return act === 'raise' || act === 'allin' || act === 'checkraise' || act === 'check-raise';
  }

  function isFacingRaise(d) {
    if (!d) return false;
    if ((Number(d.toCallBB) || 0) > 0) return true;
    const v = String(d.villainLastAction || '').toLowerCase();
    if (v === 'bet' || v === 'raise' || v === 'allin' || v === 'bet_33' || v === 'bet_66'
      || v === 'bet_100' || v === 'overbet') return true;
    const kind = String(d.kind || d.spotKind || d.facing || '').toLowerCase();
    return kind.indexOf('facing') >= 0 || kind === 'vsbet' || kind === 'vs_bet';
  }

  function heroEquityPct(d) {
    if (!d) return 0;
    if (d.heroEquityExact != null && !Number.isNaN(Number(d.heroEquityExact))) {
      const x = Number(d.heroEquityExact);
      return x <= 1.0001 ? x * 100 : x;
    }
    if (d.heroEquity != null && !Number.isNaN(Number(d.heroEquity))) {
      const x = Number(d.heroEquity);
      return x <= 1.0001 ? x * 100 : x;
    }
    return 0;
  }

  function checkFreq(d) {
    if (!d) return 0;
    if (d.frequency != null) return Number(d.frequency) || 0;
    if (d.freqGto != null) return Number(d.freqGto) || 0;
    const gto = d.gtoBaseline || d.gtoStrategy || d.gto || {};
    return Number(gto.check) || 0;
  }

  function primaryClass(d) {
    return (d && (d.classGto || d.class)) || 'unscored';
  }

  function isStrongTrap(d) {
    const eq = heroEquityPct(d);
    if (eq >= 65) return true;
    const band = d && d.handRank && d.handRank.band;
    if (band === 'nuts' || band === 'value') return true;
    const made = d && (d.madeHandInfo || null);
    const cat = made && ((made.ev && made.ev.category) || made.category);
    if (cat != null && Number(cat) >= 2) return true;
    return false;
  }

  function upgradeTarget(checkDec, raiseCls) {
    /* Setup siempre deja de ser fuga si el XR se completa bien. */
    let target = 'aceptable';
    /* Con follow-through óptimo y check en mezcla (o trampa fuerte), alinear con ForgeCoach. */
    if (raiseCls === 'optima') {
      const freq = checkFreq(checkDec);
      if (freq >= 0.05 || isStrongTrap(checkDec)) target = 'optima';
    }
    return target;
  }

  function applyClass(d, cls) {
    if (!d || !cls) return;
    if (d._rawClass == null && d.class) d._rawClass = d.class;
    if (d._rawClassGto == null && d.classGto) d._rawClassGto = d.classGto;
    d.class = cls;
    if (d.classGto === 'imprecisa' || d.classGto === 'error' || d.classGto == null) {
      d.classGto = cls;
    } else if ((CLASS_RANK[d.classGto] || 99) > (CLASS_RANK[cls] || 99)) {
      d.classGto = cls;
    }
    /* El veredicto explotativo no debe contradecir el matiz de línea si era peor. */
    if (d.classExploit === 'imprecisa' || d.classExploit === 'error') {
      d.classExploit = cls;
    }
  }

  function softenEv(d) {
    if (!d) return;
    if (d.evErroneous) {
      d.evErroneous = false;
      d.evLossLineSoftened = true;
    }
  }

  /**
   * Mutates decisions in place. Safe to call multiple times.
   * @returns {{ upgraded: number, pairs: number }}
   */
  function reconcileCheckRaiseLines(decisions) {
    const decs = decisions || [];
    let upgraded = 0;
    let pairs = 0;

    for (let i = 0; i < decs.length; i++) {
      const checkDec = decs[i];
      if (!checkDec || !isCheck(actionId(checkDec))) continue;
      if ((Number(checkDec.toCallBB) || 0) > 0) continue;

      let raiseDec = null;
      for (let j = i + 1; j < decs.length; j++) {
        const next = decs[j];
        if (!next) continue;
        if (next.street && checkDec.street && next.street !== checkDec.street) break;
        const act = actionId(next);
        if (isRaiseFollowThrough(act) && isFacingRaise(next)) {
          raiseDec = next;
          break;
        }
        /* Otra acción del héroe en la misma calle rompe el XR (call/fold/bet). */
        if (act === 'check' || act === 'call' || act === 'fold' || act === 'bet'
          || act === 'overbet' || (act.indexOf('bet_') === 0)) {
          break;
        }
      }
      if (!raiseDec) continue;

      const raiseCls = primaryClass(raiseDec);
      if (!GOOD[raiseCls]) continue;
      pairs++;

      checkDec.lineRole = 'checkRaiseSetup';
      checkDec.lineLabel = 'check-raise';
      raiseDec.lineRole = 'checkRaiseFollowThrough';
      raiseDec.lineLabel = 'check-raise';

      const checkCls = primaryClass(checkDec);
      if (checkCls === 'imprecisa' || checkCls === 'error') {
        const target = upgradeTarget(checkDec, raiseCls);
        applyClass(checkDec, target);
        softenEv(checkDec);
        checkDec.lineNote = target === 'optima'
          ? 'Check como setup de check-raise (línea completada con follow-through óptimo).'
          : 'Check como setup de check-raise (follow-through aceptable/óptimo).';
        checkDec.suppressBestHint = true;
        upgraded++;
      } else if (!checkDec.lineNote) {
        checkDec.lineNote = 'Check como setup de check-raise.';
        checkDec.suppressBestHint = checkCls === 'optima' || checkCls === 'aceptable';
      }
    }

    return { upgraded: upgraded, pairs: pairs };
  }

  global.GTOLineReconcile = {
    reconcileCheckRaiseLines: reconcileCheckRaiseLines,
    CLASS_RANK: CLASS_RANK
  };
})(window);
