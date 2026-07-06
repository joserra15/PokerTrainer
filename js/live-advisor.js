/*
 * live-advisor.js — Avisador en vivo durante el entrenador (SN-10–12).
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'pt_live_advisor_v1';

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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

  function narrativeForHand(hand) {
    if (!hand) return '';
    var parts = [];
    if (hand.stage && hand.stage !== 'complete') parts.push('Calle: ' + cap(hand.stage));
    if (hand.board && hand.board.length) {
      parts.push('Board: ' + hand.board.map(function (c) {
        return (global.Cards && global.Cards.cardToText) ? global.Cards.cardToText(c) : c;
      }).join(' '));
    }
    if (hand.villainAction) {
      var va = hand.villainAction;
      parts.push('Villano: ' + (va.type || '') + (va.size != null ? ' ' + fmtBB(va.size) + ' bb' : ''));
    }
    if (hand.heroAction) {
      var ha = hand.heroAction;
      parts.push('Tu última acción: ' + (ha.type || ''));
    }
    return parts.join(' · ');
  }

  function renderMath(mp) {
    if (!mp) return '';
    var bits = [];
    if (mp.equityPct != null) bits.push('Equity ' + mp.equityPct + '%');
    if (mp.potOddsPct != null) bits.push('Pot odds ' + mp.potOddsPct + '%');
    if (mp.actionEV != null && mp.bestEV != null) {
      bits.push('EV ' + (mp.actionEV >= 0 ? '+' : '') + mp.actionEV + ' bb · óptimo ' + (mp.bestEV >= 0 ? '+' : '') + mp.bestEV + ' bb');
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

  function renderPanel(host, hand, advice) {
    if (!host) return;
    if (!advice || !advice.recommended) {
      host.classList.add('hidden');
      host.innerHTML = '';
      return;
    }
    var rec = advice.recommended;
    var narr = narrativeForHand(hand);
    var freqPct = Math.round((rec.freq || 0) * 100);
    host.classList.remove('hidden');
    host.innerHTML =
      '<div class="live-advisor-head">' +
      '<span class="live-advisor-badge">Avisador en vivo</span>' +
      '<span class="live-advisor-street">' + escapeHtml(cap(advice.street)) + '</span>' +
      '</div>' +
      (narr ? '<p class="live-advisor-narrative muted-text">' + escapeHtml(narr) + '</p>' : '') +
      (advice.context ? '<p class="live-advisor-context">' + escapeHtml(advice.context) + '</p>' : '') +
      '<div class="live-advisor-rec">' +
      '<div class="live-advisor-rec-label">Acción recomendada</div>' +
      '<div class="live-advisor-rec-action">' + escapeHtml(rec.label) + '</div>' +
      '<div class="muted-text">Frecuencia GTO ' + freqPct + '% · EV ' + (rec.ev != null ? ((rec.ev >= 0 ? '+' : '') + fmtBB(rec.ev) + ' bb') : '—') + '</div>' +
      '</div>' +
      renderMath(rec.mathParams) +
      renderOptionEvList(advice.options, rec.actionId) +
      (rec.explanation ? '<p class="live-advisor-expl">' + escapeHtml(rec.explanation) + '</p>' : '');
  }

  function update(host, hand, enabled) {
    if (!enabled || !hand || hand.stage === 'complete' || !hand.current) {
      if (host) {
        host.classList.add('hidden');
        host.innerHTML = '';
      }
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
    update: update,
    renderPanel: renderPanel
  };
})(window);
