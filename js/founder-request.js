/*
 * founder-request.js — Solicitud de plaza FOUNDER (Contacto + flag perfil).
 */
(function (global) {
  'use strict';

  var PENDING_KEY = 'pt_founder_request_pending';
  var SUBJECT = 'Solicitud de Founder';

  function client() {
    return global.PTSupabase && global.PTSupabase.getClient
      ? global.PTSupabase.getClient()
      : null;
  }

  function isLoggedIn() {
    return !!(global.PTAuth && global.PTAuth.getUser && global.PTAuth.getUser());
  }

  function markPending() {
    try { sessionStorage.setItem(PENDING_KEY, '1'); } catch (e) { /* noop */ }
  }

  function clearPending() {
    try { sessionStorage.removeItem(PENDING_KEY); } catch (e) { /* noop */ }
  }

  function hasPending() {
    try { return sessionStorage.getItem(PENDING_KEY) === '1'; } catch (e) { return false; }
  }

  function startLoginNow() {
    if (global.PT_startGoogleLogin) {
      global.PT_startGoogleLogin();
      return;
    }
    var btn = document.getElementById('auth-mobile-login');
    if (btn) btn.click();
  }

  function founderCfg() {
    return (global.PT_BILLING && global.PT_BILLING.founder) || {};
  }

  function entitlementsFounder() {
    var ent = global.PTEntitlements && global.PTEntitlements.get
      ? global.PTEntitlements.get()
      : null;
    return {
      isFounder: !!(ent && ent.is_founder),
      requested: !!(ent && ent.founder_requested_at)
    };
  }

  async function submitRequest() {
    var c = client();
    if (!c) throw new Error('No hay conexión con el servidor.');
    var res = await c.rpc('pt_request_founder_seat');
    if (res.error) throw new Error(res.error.message || 'request_failed');
    var data = res.data || {};
    if (global.PTEntitlements && global.PTEntitlements.refresh) {
      try { await global.PTEntitlements.refresh(); } catch (e) { /* noop */ }
    }
    if (global.PTContact && global.PTContact.refreshBadge) {
      try { global.PTContact.refreshBadge(); } catch (e) { /* noop */ }
    }
    return data;
  }

  function explainResult(data) {
    if (!data) return 'No se pudo completar la solicitud.';
    if (data.already_founder) {
      return 'Ya tienes plaza FOUNDER confirmada. La verás en Configuración de cuenta.';
    }
    if (data.already_requested) {
      return 'Ya habías enviado una Solicitud de Founder. Puedes seguirla en Contacto.';
    }
    if (data.created || data.ok) {
      return 'Solicitud de Founder enviada. El equipo la revisará en mensajes de soporte.';
    }
    return 'Solicitud registrada.';
  }

  async function requestSeat(opts) {
    opts = opts || {};
    if (!isLoggedIn()) {
      markPending();
      if (opts.promptLogin !== false) startLoginNow();
      return { ok: false, pending_login: true };
    }
    clearPending();
    var data = await submitRequest();
    if (opts.notify !== false) {
      try { alert(explainResult(data)); } catch (e) { /* noop */ }
    }
    if (opts.goContact && global.goToTab) {
      global.goToTab('contact');
      if (global.PTContact && global.PTContact.render && data.thread_id) {
        global.setTimeout(function () {
          global.PTContact.render(data.thread_id);
        }, 80);
      }
    }
    return data;
  }

  async function tryRequestAfterLogin() {
    if (!hasPending()) return null;
    if (!isLoggedIn()) return null;
    clearPending();
    try {
      var data = await submitRequest();
      try { alert(explainResult(data)); } catch (e) { /* noop */ }
      if (global.goToTab) {
        global.goToTab('contact');
        if (global.PTContact && global.PTContact.render && data.thread_id) {
          global.setTimeout(function () {
            global.PTContact.render(data.thread_id);
          }, 120);
        }
      }
      return data;
    } catch (e) {
      console.warn('[PTFounderRequest]', e);
      try {
        alert('No se pudo enviar la Solicitud de Founder: ' + (e.message || 'error'));
      } catch (e2) { /* noop */ }
      return { ok: false, error: e.message || 'error' };
    }
  }

  function bindButton(btn) {
    if (!btn || btn.dataset.founderBound) return;
    btn.dataset.founderBound = '1';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      btn.disabled = true;
      requestSeat({ goContact: true })
        .catch(function (err) {
          alert(err.message || 'No se pudo solicitar la plaza FOUNDER.');
        })
        .then(function () {
          if (!btn.isConnected) return;
          var st = entitlementsFounder();
          if (st.isFounder) {
            btn.textContent = 'Plaza FOUNDER confirmada';
            btn.disabled = true;
          } else if (st.requested || hasPending()) {
            btn.textContent = 'Solicitud enviada';
            btn.disabled = true;
          } else {
            btn.disabled = false;
          }
        });
    });
  }

  function ctaLabel() {
    var st = entitlementsFounder();
    if (st.isFounder) return 'Plaza FOUNDER confirmada';
    if (st.requested) return 'Solicitud FOUNDER enviada';
    return 'Solicitar plaza FOUNDER';
  }

  function ctaDisabled() {
    var st = entitlementsFounder();
    return !!(st.isFounder || st.requested);
  }

  function requestButtonHtml(extraClass) {
    var disabled = ctaDisabled();
    var cls = 'btn btn-primary' + (extraClass ? ' ' + extraClass : '');
    return '<button type="button" class="' + cls + ' founder-request-btn"' +
      (disabled ? ' disabled aria-disabled="true"' : '') +
      ' data-founder-request="1">' + ctaLabel() + '</button>';
  }

  global.PTFounderRequest = {
    subject: SUBJECT,
    markPending: markPending,
    clearPending: clearPending,
    hasPending: hasPending,
    requestSeat: requestSeat,
    tryRequestAfterLogin: tryRequestAfterLogin,
    bindButton: bindButton,
    ctaLabel: ctaLabel,
    ctaDisabled: ctaDisabled,
    requestButtonHtml: requestButtonHtml,
    founderCfg: founderCfg
  };
})(window);
