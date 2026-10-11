/*
 * school-bankroll-tool.js — Calculadora educativa de banca (Cash / Spins / MTT).
 * Heurísticas de estudio; no es consejo financiero.
 */
(function (global) {
  'use strict';

  var STORAGE_BASE = 'pt_bankroll_tool_v1';

  var FORMAT_RULES = {
    cash: {
      label: 'Cash',
      minBi: 20,
      fullBi: 30,
      comfortBi: 40,
      blurb: 'Orientativo 20–40 buy-ins del stake full.'
    },
    spin: {
      label: 'Spins',
      minBi: 50,
      fullBi: 80,
      comfortBi: 100,
      blurb: 'Spins: más colchón por varianza del multiplicador (~50–100+ BI).'
    },
    mtt: {
      label: 'Torneos',
      minBi: 50,
      fullBi: 75,
      comfortBi: 100,
      blurb: 'MTT: swings altos; orientativo ~50–100+ BI del buy-in medio.'
    }
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function userSuffix() {
    try {
      var u = (global.PTAuth && global.PTAuth.getUser && global.PTAuth.getUser()) || global.PT_AUTH_USER;
      if (u && (u.sub || u.id)) return '_' + String(u.sub || u.id);
    } catch (e) { /* ignore */ }
    return '';
  }

  function storageKey() {
    return STORAGE_BASE + userSuffix();
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(storageKey());
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function num(v, fallback) {
    var n = Number(v);
    return isFinite(n) && n > 0 ? n : fallback;
  }

  function compute(bankroll, buyIn, format) {
    var rules = FORMAT_RULES[format] || FORMAT_RULES.cash;
    var bi = buyIn > 0 ? bankroll / buyIn : 0;
    var recommendedBuyIn = bankroll / rules.fullBi;
    var moveUpBankroll = buyIn * rules.comfortBi;
    var moveDownBankroll = buyIn * rules.minBi;
    var zone = 'short';
    if (bi >= rules.comfortBi) zone = 'comfort';
    else if (bi >= rules.fullBi) zone = 'full';
    else if (bi >= rules.minBi) zone = 'ok';
    return {
      rules: rules,
      buyIns: bi,
      recommendedBuyIn: recommendedBuyIn,
      moveUpBankroll: moveUpBankroll,
      moveDownBankroll: moveDownBankroll,
      zone: zone
    };
  }

  function zoneLabel(zone) {
    if (zone === 'comfort') return 'Cómoda';
    if (zone === 'full') return 'Stake full razonable';
    if (zone === 'ok') return 'Jugable con cautela';
    return 'Corta · considera bajar o shots';
  }

  function money(n) {
    if (!isFinite(n)) return '—';
    var r = Math.round(n * 100) / 100;
    return r.toLocaleString('es-ES', { maximumFractionDigits: 2 }) + ' €';
  }

  function biStr(n) {
    if (!isFinite(n)) return '—';
    return (Math.round(n * 10) / 10).toLocaleString('es-ES', { maximumFractionDigits: 1 });
  }

  function ensureModal() {
    var el = document.getElementById('school-bankroll-modal');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'school-bankroll-modal';
    el.className = 'modal school-bankroll-modal hidden';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'school-bankroll-title');
    el.innerHTML =
      '<div class="modal-content school-bankroll-dialog">' +
      '<div class="school-bankroll-head">' +
      '<h3 id="school-bankroll-title">Calculadora de banca</h3>' +
      '<button type="button" class="btn btn-ghost" id="school-bankroll-close" aria-label="Cerrar">✕</button>' +
      '</div>' +
      '<p class="muted-text school-bankroll-disclaimer">Heurística educativa de la Escuela. No es consejo financiero ni garantiza resultados.</p>' +
      '<form id="school-bankroll-form" class="school-bankroll-form">' +
      '<label>Banca (€)<input type="number" min="1" step="1" name="bankroll" id="school-br-bankroll" required></label>' +
      '<label>Buy-in / stake (€)<input type="number" min="0.01" step="0.01" name="buyIn" id="school-br-buyin" required></label>' +
      '<label>Formato<select name="format" id="school-br-format">' +
      '<option value="cash">Cash</option>' +
      '<option value="spin">Spins</option>' +
      '<option value="mtt">Torneos (MTT)</option>' +
      '</select></label>' +
      '<button type="submit" class="btn btn-primary">Calcular</button>' +
      '</form>' +
      '<div id="school-bankroll-result" class="school-bankroll-result" hidden></div>' +
      '</div>';
    document.body.appendChild(el);

    el.addEventListener('click', function (ev) {
      if (ev.target === el) close();
    });
    var closeBtn = el.querySelector('#school-bankroll-close');
    if (closeBtn) closeBtn.addEventListener('click', close);
    var form = el.querySelector('#school-bankroll-form');
    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        renderResult();
      });
    }
    return el;
  }

  function renderResult() {
    var bankroll = num(document.getElementById('school-br-bankroll').value, 0);
    var buyIn = num(document.getElementById('school-br-buyin').value, 0);
    var format = document.getElementById('school-br-format').value || 'cash';
    if (!(bankroll > 0) || !(buyIn > 0)) return;

    var out = compute(bankroll, buyIn, format);
    saveState({ bankroll: bankroll, buyIn: buyIn, format: format });

    var host = document.getElementById('school-bankroll-result');
    if (!host) return;
    host.hidden = false;
    host.innerHTML =
      '<p class="school-bankroll-zone"><strong>' + esc(biStr(out.buyIns)) + ' BI</strong> · ' +
      esc(zoneLabel(out.zone)) + '</p>' +
      '<p class="muted-text">' + esc(out.rules.blurb) + '</p>' +
      '<ul class="school-bankroll-stats">' +
      '<li><span>Buy-in orientativo (≈' + esc(String(out.rules.fullBi)) + ' BI)</span><strong>' +
      esc(money(out.recommendedBuyIn)) + '</strong></li>' +
      '<li><span>Move-up cómodo (≈' + esc(String(out.rules.comfortBi)) + ' BI de este buy-in)</span><strong>' +
      esc(money(out.moveUpBankroll)) + '</strong></li>' +
      '<li><span>Zona move-down (≈' + esc(String(out.rules.minBi)) + ' BI)</span><strong>' +
      esc(money(out.moveDownBankroll)) + '</strong></li>' +
      '</ul>';
  }

  function open(opts) {
    opts = opts || {};
    var modal = ensureModal();
    var saved = loadState() || {};
    var format = opts.format || saved.format || 'cash';
    if (!FORMAT_RULES[format]) format = 'cash';
    var bankrollEl = document.getElementById('school-br-bankroll');
    var buyInEl = document.getElementById('school-br-buyin');
    var formatEl = document.getElementById('school-br-format');
    if (bankrollEl) bankrollEl.value = opts.bankroll != null ? opts.bankroll : (saved.bankroll != null ? saved.bankroll : 500);
    if (buyInEl) buyInEl.value = opts.buyIn != null ? opts.buyIn : (saved.buyIn != null ? saved.buyIn : (format === 'cash' ? 10 : format === 'spin' ? 2 : 10));
    if (formatEl) formatEl.value = format;
    modal.classList.remove('hidden');
    renderResult();
  }

  function close() {
    var modal = document.getElementById('school-bankroll-modal');
    if (modal) modal.classList.add('hidden');
  }

  global.PTSchoolBankrollTool = {
    open: open,
    close: close,
    compute: compute,
    FORMAT_RULES: FORMAT_RULES,
    loadState: loadState,
    saveState: saveState
  };
})(typeof window !== 'undefined' ? window : globalThis);
