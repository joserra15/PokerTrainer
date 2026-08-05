/*
 * live-advisor.js — Avisador en vivo durante el entrenador (SN-10–12).
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'pt_live_advisor_v1';
  var MODE_KEY = 'pt_live_advisor_mode_v1';
  var THRESHOLD_KEY = 'pt_serious_ev_threshold_v1';
  var DEFAULT_THRESHOLD = 0.5;
  var matrixJob = 0;
  /** Aviso grave pendiente de mostrar en modo silencio (hasta nueva mano / dismiss). */
  var pendingAlert = null;

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function t(key, vars) {
    if (global.PTI18n && global.PTI18n.t) return global.PTI18n.t(key, vars);
    return key;
  }

  function fmtBB(x) {
    if (global.GTOPotMath && global.GTOPotMath.formatBB) return global.GTOPotMath.formatBB(x);
    return String(x);
  }

  function cap(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  function loadPreference() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) { return false; }
  }

  function savePreference(on) {
    try { localStorage.setItem(STORAGE_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
  }

  /** 'always' | 'serious' */
  function loadMode() {
    try {
      var m = localStorage.getItem(MODE_KEY);
      return m === 'serious' ? 'serious' : 'always';
    } catch (e) { return 'always'; }
  }

  function saveMode(mode) {
    try { localStorage.setItem(MODE_KEY, mode === 'serious' ? 'serious' : 'always'); } catch (e) { /* ignore */ }
  }

  function loadThreshold() {
    try {
      var n = Number(localStorage.getItem(THRESHOLD_KEY));
      if (!isNaN(n) && n >= 0 && n <= 20) return n;
    } catch (e) { /* ignore */ }
    return DEFAULT_THRESHOLD;
  }

  function saveThreshold(bb) {
    var raw = bb;
    if (raw === '' || raw == null) {
      try { localStorage.setItem(THRESHOLD_KEY, String(DEFAULT_THRESHOLD)); } catch (e) { /* ignore */ }
      return DEFAULT_THRESHOLD;
    }
    var n = Number(raw);
    if (isNaN(n) || n < 0) n = DEFAULT_THRESHOLD;
    if (n > 20) n = 20;
    try { localStorage.setItem(THRESHOLD_KEY, String(n)); } catch (e) { /* ignore */ }
    return n;
  }

  /** true si debe avisarse (toast/feedback). En modo always siempre; en serious solo si EV perdido >= umbral. */
  function shouldWarn(evLoss, mode, threshold) {
    var m = mode || loadMode();
    if (m !== 'serious') return true;
    var thr = threshold != null && threshold !== '' ? Number(threshold) : loadThreshold();
    if (isNaN(thr)) thr = DEFAULT_THRESHOLD;
    return (Number(evLoss) || 0) >= thr;
  }

  function isPreActionVisible(mode) {
    return (mode || loadMode()) !== 'serious';
  }

  function setPendingAlert(alert) {
    pendingAlert = alert || null;
  }

  function clearPendingAlert() {
    pendingAlert = null;
  }

  function getPendingAlert() {
    return pendingAlert;
  }

  /**
   * Registra un aviso grave tras una decisión (modo silencio).
   * Se muestra en el panel hasta nueva mano o dismiss.
   */
  function recordSeriousAlert(decision, threshold) {
    if (!decision) return null;
    var thr = threshold != null ? Number(threshold) : loadThreshold();
    if (isNaN(thr)) thr = loadThreshold();
    pendingAlert = {
      street: decision.street || '',
      label: decision.label || decision.chosen || decision.action || '',
      class: decision.class || 'error',
      evLoss: Number(decision.evLoss) || 0,
      threshold: thr,
      best: decision.best || '',
      explanation: decision.explanation || ''
    };
    return pendingAlert;
  }

  function narrativeForHand(hand) {
    if (!hand) return '';
    var parts = [];
    if (hand.stage && hand.stage !== 'complete') parts.push(t('advisor.street') + ': ' + cap(hand.stage));
    if (hand.board && hand.board.length) {
      parts.push('Board: ' + hand.board.map(function (c) {
        return (global.Cards && global.Cards.cardToText) ? global.Cards.cardToText(c) : c;
      }).join(' '));
    }
    if (hand.villainAction) {
      var va = hand.villainAction;
      parts.push(t('advisor.villain') + ': ' + (va.type || '') + (va.size != null ? ' ' + fmtBB(va.size) + ' bb' : ''));
    }
    if (hand.heroAction) {
      var ha = hand.heroAction;
      parts.push(t('advisor.yourAction') + ': ' + (ha.type || ''));
    }
    return parts.join(' · ');
  }

  function renderMath(mp) {
    if (!mp) return '';
    var bits = [];
    if (mp.equityPct != null) bits.push('Equity ' + mp.equityPct + '%');
    if (mp.potOddsPct != null) bits.push('Pot odds ' + mp.potOddsPct + '%');
    if (mp.actionEV != null && mp.bestEV != null) {
      bits.push('EV ' + (mp.actionEV >= 0 ? '+' : '') + mp.actionEV + ' bb · ' + t('advisor.optimal') + ' ' + (mp.bestEV >= 0 ? '+' : '') + mp.bestEV + ' bb');
    }
    return bits.length ? '<div class="live-advisor-math muted-text">' + escapeHtml(bits.join(' · ')) + '</div>' : '';
  }

  function renderOptionEvList(options, bestId) {
    if (!options || !options.length) return '';
    var rows = options.map(function (o) {
      var cls = o.id === bestId ? ' live-advisor-opt-best' : '';
      var evStr = o.ev != null ? ((o.ev >= 0 ? '+' : '') + fmtBB(o.ev) + ' bb') : '—';
      var freq = Math.round((o.freq || 0) * 100);
      return '<div class="live-advisor-opt' + cls + '"><span>' + escapeHtml(o.label) + '</span>' +
        '<span class="muted-text">' + freq + '% · EV ' + evStr + '</span></div>';
    }).join('');
    return '<div class="live-advisor-evs">' + rows + '</div>';
  }

  function matricesSection() {
    return '<div class="live-advisor-matrices">' +
      '<div class="live-advisor-matrix-block"><h5>' + escapeHtml(t('advisor.matrixGto')) + '</h5>' +
      '<div class="live-advisor-matrix-host" data-matrix-kind="gto">' +
      '<p class="muted-text live-advisor-matrix-loading">' + escapeHtml(t('advisor.matrixLoading')) + '</p></div></div>' +
      '<div class="live-advisor-matrix-block"><h5>' + escapeHtml(t('advisor.matrixVillain')) + '</h5>' +
      '<div class="live-advisor-matrix-host" data-matrix-kind="villain">' +
      '<p class="muted-text live-advisor-matrix-loading">' + escapeHtml(t('advisor.matrixLoading')) + '</p></div></div>' +
      '</div>';
  }

  function loadMatrices(host, hand, jobId) {
    var RM = global.PTRangeMatrix;
    if (!RM || !host || !hand) return;
    var decision = RM.decisionFromLiveHand(hand);
    if (!decision) return;
    var heroCards = RM.heroCardsFromHand(hand);
    var heroCode = (heroCards.length === 2 && global.Ranges)
      ? global.Ranges.handCode(heroCards[0], heroCards[1])
      : null;
    var gtoHost = host.querySelector('[data-matrix-kind="gto"]');
    var vilHost = host.querySelector('[data-matrix-kind="villain"]');

    if (gtoHost) {
      if (decision.street === 'preflop') {
        var baseInput = RM.buildBaseInput(hand, decision, 'trainer');
        if (!baseInput) {
          gtoHost.innerHTML = '<p class="muted-text">' + escapeHtml(t('advisor.matrixUnavailable')) + '</p>';
        } else {
          RM.computeGtoMatrixAsync(baseInput, function () { /* silent */ }).then(function (result) {
            if (jobId !== matrixJob) return;
            gtoHost.innerHTML = RM.renderMatrixGrid(result, { heroCode: heroCode, mode: 'gto' });
          }).catch(function () {
            if (jobId !== matrixJob) return;
            gtoHost.innerHTML = '<p class="muted-text">' + escapeHtml(t('advisor.matrixGtoFail')) + '</p>';
          });
        }
      } else {
        gtoHost.innerHTML = '<p class="muted-text">' + escapeHtml(t('advisor.matrixGtoPreflopOnly')) + '</p>';
      }
    }

    if (vilHost) {
      try {
        var profile = RM.getVillainMatrixProfileLive(hand, decision);
        var result = RM.computeVillainRangeMatrix(profile);
        if (jobId !== matrixJob) return;
        vilHost.innerHTML = RM.renderMatrixGrid(result, {
          heroCode: heroCode,
          mode: 'villain',
          hideVillainCards: true
        });
      } catch (e) {
        if (jobId !== matrixJob) return;
        vilHost.innerHTML = '<p class="muted-text">' + escapeHtml(t('advisor.matrixVillainFail')) + '</p>';
      }
    }
  }

  function disableBtnHtml() {
    return '<button type="button" class="live-advisor-disable" data-disable-live-advisor title="' +
      escapeHtml(t('advisor.disable')) + '" aria-label="' + escapeHtml(t('advisor.disable')) + '">×</button>';
  }

  function renderSilentPanel(host) {
    host.classList.remove('hidden', 'live-advisor-alert');
    host.classList.add('live-advisor-silent');
    host.innerHTML =
      '<div class="live-advisor-head">' +
      '<span class="live-advisor-badge">' + escapeHtml(t('advisor.silent')) + '</span>' +
      '<span class="muted-text">' + escapeHtml(t('advisor.silentHint', { n: fmtBB(loadThreshold()) })) + '</span>' +
      disableBtnHtml() +
      '</div>';
  }

  function renderAlertPanel(host, alert) {
    host.classList.remove('hidden', 'live-advisor-silent');
    host.classList.add('live-advisor-alert');
    var street = alert.street ? cap(alert.street) + ': ' : '';
    host.innerHTML =
      '<div class="live-advisor-head">' +
      '<span class="live-advisor-badge live-advisor-badge-alert">' + escapeHtml(t('advisor.alert')) + '</span>' +
      '<span class="muted-text">' + escapeHtml(t('advisor.alertHint', { n: fmtBB(alert.threshold != null ? alert.threshold : loadThreshold()) })) + '</span>' +
      '<button type="button" class="live-advisor-disable" data-dismiss-advisor-alert title="' +
      escapeHtml(t('advisor.dismissAlert')) + '" aria-label="' + escapeHtml(t('advisor.dismissAlert')) + '">×</button>' +
      '</div>' +
      '<div class="live-advisor-alert-body">' +
      '<div class="live-advisor-rec-action net-neg">-' + escapeHtml(fmtBB(alert.evLoss)) + ' bb</div>' +
      '<div class="live-advisor-alert-detail">' + escapeHtml(street + (alert.label || '')) + '</div>' +
      (alert.explanation ? '<p class="live-advisor-expl">' + escapeHtml(alert.explanation) + '</p>' : '') +
      '</div>';
  }

  function renderPanel(host, hand, advice) {
    if (!host) return;
    if (!advice || !advice.recommended) {
      host.classList.add('hidden');
      host.classList.remove('live-advisor-alert', 'live-advisor-silent');
      host.innerHTML = '';
      return;
    }
    var RM = global.PTRangeMatrix;
    var decision = RM ? RM.decisionFromLiveHand(hand) : null;
    var rec = advice.recommended;
    var narr = narrativeForHand(hand);
    var freqPct = Math.round((rec.freq || 0) * 100);
    var jobId = ++matrixJob;
    host.classList.remove('hidden', 'live-advisor-alert', 'live-advisor-silent');
    host.innerHTML =
      '<div class="live-advisor-head">' +
      '<span class="live-advisor-badge">' + escapeHtml(t('advisor.live')) + '</span>' +
      '<span class="live-advisor-street">' + escapeHtml(cap(advice.street)) + '</span>' +
      disableBtnHtml() +
      '</div>' +
      (narr ? '<p class="live-advisor-narrative muted-text">' + escapeHtml(narr) + '</p>' : '') +
      (advice.context ? '<p class="live-advisor-context">' + escapeHtml(advice.context) + '</p>' : '') +
      '<div class="live-advisor-rec">' +
      '<div class="live-advisor-rec-label">' + escapeHtml(t('advisor.recommended')) + '</div>' +
      '<div class="live-advisor-rec-action">' + escapeHtml(rec.label) + '</div>' +
      '<div class="muted-text">' + escapeHtml(t('advisor.gtoFreq', { n: freqPct })) +
      ' · EV ' + (rec.ev != null ? ((rec.ev >= 0 ? '+' : '') + fmtBB(rec.ev) + ' bb') : '—') + '</div>' +
      '</div>' +
      renderMath(rec.mathParams) +
      renderOptionEvList(advice.options, rec.actionId) +
      (rec.explanation ? '<p class="live-advisor-expl">' + escapeHtml(rec.explanation) + '</p>' : '') +
      matricesSection();
    loadMatrices(host, hand, jobId);
  }

  function update(host, hand, enabled) {
    if (!host) return;
    if (!enabled || !hand) {
      matrixJob++;
      host.classList.add('hidden');
      host.classList.remove('live-advisor-alert', 'live-advisor-silent');
      host.innerHTML = '';
      return;
    }
    // Tras error grave: mantener el aviso visible también al completar la mano.
    if (pendingAlert && !isPreActionVisible()) {
      renderAlertPanel(host, pendingAlert);
      return;
    }
    if (hand.stage === 'complete' || !hand.current) {
      matrixJob++;
      host.classList.add('hidden');
      host.classList.remove('live-advisor-alert', 'live-advisor-silent');
      host.innerHTML = '';
      return;
    }
    // Modo «solo error grave»: silencio previo; aviso persistente si ya hubo fuga ≥ umbral.
    if (!isPreActionVisible()) {
      matrixJob++;
      if (pendingAlert) renderAlertPanel(host, pendingAlert);
      else renderSilentPanel(host);
      return;
    }
    var advice = global.Engine && global.Engine.previewAdvice
      ? global.Engine.previewAdvice(hand)
      : null;
    renderPanel(host, hand, advice);
  }

  global.PTLiveAdvisor = {
    loadPreference: loadPreference,
    savePreference: savePreference,
    loadMode: loadMode,
    saveMode: saveMode,
    loadThreshold: loadThreshold,
    saveThreshold: saveThreshold,
    shouldWarn: shouldWarn,
    isPreActionVisible: isPreActionVisible,
    DEFAULT_THRESHOLD: DEFAULT_THRESHOLD,
    recordSeriousAlert: recordSeriousAlert,
    clearPendingAlert: clearPendingAlert,
    getPendingAlert: getPendingAlert,
    setPendingAlert: setPendingAlert,
    update: update,
    renderPanel: renderPanel
  };
})(window);
