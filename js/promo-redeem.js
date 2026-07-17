/*
 * promo-redeem.js — Canje de promociones tras registro (cuentas nuevas).
 */
(function (global) {
  'use strict';

  var PENDING_KEY = 'pt_promo_pending';
  var RESULT_KEY = 'pt_promo_result';

  function normalizeCode(code) {
    return String(code || '').trim().toUpperCase();
  }

  function readPending() {
    try {
      return normalizeCode(sessionStorage.getItem(PENDING_KEY) || '');
    } catch (e) {
      return '';
    }
  }

  function savePending(code) {
    code = normalizeCode(code);
    try {
      if (code) sessionStorage.setItem(PENDING_KEY, code);
      else sessionStorage.removeItem(PENDING_KEY);
    } catch (e) { /* noop */ }
    return code;
  }

  function clearPending() {
    try { sessionStorage.removeItem(PENDING_KEY); } catch (e) { /* noop */ }
  }

  function captureFromUrl() {
    try {
      var params = new URLSearchParams(location.search || '');
      var code = normalizeCode(params.get('promo') || params.get('c') || '');
      if (code) {
        savePending(code);
        params.delete('promo');
        params.delete('c');
        var q = params.toString();
        var next = location.pathname + (q ? '?' + q : '') + (location.hash || '');
        history.replaceState(null, '', next || location.pathname);
      }
      return code || readPending();
    } catch (e) {
      return readPending();
    }
  }

  function client() {
    return global.PTSupabase && global.PTSupabase.getClient
      ? global.PTSupabase.getClient()
      : null;
  }

  function saveResult(result) {
    try {
      sessionStorage.setItem(RESULT_KEY, JSON.stringify(result || {}));
    } catch (e) { /* noop */ }
  }

  function lastResult() {
    try {
      var raw = sessionStorage.getItem(RESULT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  async function redeemPending() {
    var code = readPending();
    if (!code) return null;
    var c = client();
    if (!c) return null;
    try {
      var res = await c.rpc('pt_redeem_promotion', { p_code: code });
      if (res.error) {
        var msg = res.error.message || 'redeem_failed';
        var err = { ok: false, error: msg, code: code };
        if (/existing_user/i.test(msg)) err.error = 'existing_user';
        if (/inactive/i.test(msg)) err.error = 'inactive';
        if (/exhausted/i.test(msg)) err.error = 'exhausted';
        if (/already_redeemed/i.test(msg)) err.error = 'already_redeemed';
        if (/not_found/i.test(msg)) err.error = 'not_found';
        saveResult(err);
        clearPending();
        return err;
      }
      var data = res.data || { ok: false, error: 'empty' };
      if (data.ok) {
        saveResult(data);
        clearPending();
        if (global.PTEntitlements && global.PTEntitlements.refresh) {
          await global.PTEntitlements.refresh();
        }
        if (global.PTAccountSettings && global.PTAccountSettings.refresh) {
          global.PTAccountSettings.refresh();
        }
      } else {
        saveResult(data);
        clearPending();
      }
      return data;
    } catch (e) {
      var fail = { ok: false, error: (e && e.message) || 'redeem_failed', code: code };
      saveResult(fail);
      clearPending();
      return fail;
    }
  }

  function notifyUser(result) {
    if (!result) return;
    if (result.ok) {
      var parts = [];
      if (result.plan_label) {
        parts.push(result.plan_label + (result.plan_ends_at
          ? ' hasta ' + new Date(result.plan_ends_at).toLocaleDateString('es-ES')
          : ''));
      }
      if (result.bonus_credits) {
        parts.push(result.bonus_credits + ' consultas IA de bono');
      }
      var detail = parts.length ? (': ' + parts.join(' · ')) : '';
      try {
        alert('¡Promoción ' + (result.code || '') + ' activada' + detail + '!');
      } catch (e) { /* noop */ }
      return;
    }
    if (result.error === 'existing_user') {
      try {
        alert('Esta promoción solo es válida para cuentas nuevas. Tu cuenta ya existía.');
      } catch (e) { /* noop */ }
    }
  }

  async function tryRedeemAfterLogin() {
    captureFromUrl();
    if (!readPending()) return null;
    var result = await redeemPending();
    notifyUser(result);
    return result;
  }

  // Captura temprana por si el usuario llega con ?promo=
  captureFromUrl();

  global.PTPromoRedeem = {
    PENDING_KEY: PENDING_KEY,
    normalizeCode: normalizeCode,
    readPending: readPending,
    savePending: savePending,
    clearPending: clearPending,
    captureFromUrl: captureFromUrl,
    redeemPending: redeemPending,
    tryRedeemAfterLogin: tryRedeemAfterLogin,
    lastResult: lastResult
  };
})(window);
