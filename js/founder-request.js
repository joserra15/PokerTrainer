/*
 * founder-request.js — Solicitud FOUNDER Study / Coach (Contacto + flags perfil).
 */
(function (global) {
  'use strict';

  var PENDING_KEY = 'pt_founder_request_pending';

  function client() {
    return global.PTSupabase && global.PTSupabase.getClient
      ? global.PTSupabase.getClient()
      : null;
  }

  function isLoggedIn() {
    return !!(global.PTAuth && global.PTAuth.getUser && global.PTAuth.getUser());
  }

  function normalizePlan(plan) {
    var p = String(plan || 'study').toLowerCase();
    if (p === 'pro' || p === 'study') return 'study';
    if (p === 'premium' || p === 'coach') return 'coach';
    return 'study';
  }

  function planLabel(plan) {
    return normalizePlan(plan) === 'coach' ? 'Coach' : 'Study';
  }

  function subjectFor(plan) {
    return 'Solicitud de Founder ' + planLabel(plan);
  }

  function markPending(plan) {
    try { sessionStorage.setItem(PENDING_KEY, normalizePlan(plan)); } catch (e) { /* noop */ }
  }

  function clearPending() {
    try { sessionStorage.removeItem(PENDING_KEY); } catch (e) { /* noop */ }
  }

  function readPending() {
    try {
      var v = sessionStorage.getItem(PENDING_KEY);
      return v ? normalizePlan(v) : '';
    } catch (e) {
      return '';
    }
  }

  function hasPending() {
    return !!readPending();
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

  function entitlementsFounder(plan) {
    var ent = global.PTEntitlements && global.PTEntitlements.get
      ? global.PTEntitlements.get()
      : null;
    var tier = normalizePlan(plan);
    var isFounder = tier === 'coach'
      ? !!(ent && ent.is_founder_coach)
      : !!(ent && ent.is_founder_study);
    var requested = tier === 'coach'
      ? !!(ent && ent.founder_coach_requested_at)
      : !!(ent && ent.founder_study_requested_at);
    return { plan: tier, isFounder: isFounder, requested: requested };
  }

  async function submitRequest(plan) {
    var tier = normalizePlan(plan);
    var c = client();
    if (!c) throw new Error('No hay conexión con el servidor.');
    var res = await c.rpc('pt_request_founder_seat', { p_plan: tier });
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
    var label = data.plan_label || planLabel(data.plan);
    if (data.already_founder) {
      return 'Ya tienes plaza FOUNDER ' + label + ' confirmada. La verás en Configuración de cuenta.';
    }
    if (data.already_requested) {
      return 'Ya habías enviado una Solicitud de Founder ' + label + '. Puedes seguirla en Contacto.';
    }
    if (data.created || data.ok) {
      return 'Solicitud de Founder ' + label + ' enviada. Plazas limitadas por petición; el equipo la revisará en soporte.';
    }
    return 'Solicitud registrada.';
  }

  async function requestSeat(opts) {
    opts = opts || {};
    var plan = normalizePlan(opts.plan || opts.tier || 'study');
    if (!isLoggedIn()) {
      markPending(plan);
      if (opts.promptLogin !== false) startLoginNow();
      return { ok: false, pending_login: true, plan: plan };
    }
    clearPending();
    var data = await submitRequest(plan);
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
    var plan = readPending();
    if (!plan) return null;
    if (!isLoggedIn()) return null;
    clearPending();
    try {
      var data = await submitRequest(plan);
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
      var plan = normalizePlan(btn.getAttribute('data-founder-request') || 'study');
      btn.disabled = true;
      requestSeat({ plan: plan, goContact: true })
        .catch(function (err) {
          alert(err.message || 'No se pudo solicitar la plaza FOUNDER.');
        })
        .then(function () {
          if (!btn.isConnected) return;
          var st = entitlementsFounder(plan);
          if (st.isFounder) {
            btn.textContent = 'Plaza FOUNDER ' + planLabel(plan) + ' confirmada';
            btn.disabled = true;
          } else if (st.requested || readPending() === plan) {
            btn.textContent = 'Solicitud FOUNDER ' + planLabel(plan) + ' enviada';
            btn.disabled = true;
          } else {
            btn.disabled = false;
          }
        });
    });
  }

  function ctaLabel(plan) {
    var st = entitlementsFounder(plan);
    var label = planLabel(plan);
    if (st.isFounder) return 'Plaza FOUNDER ' + label + ' confirmada';
    if (st.requested) return 'Solicitud FOUNDER ' + label + ' enviada';
    return 'Solicitar plaza FOUNDER ' + label;
  }

  function ctaDisabled(plan) {
    var st = entitlementsFounder(plan);
    return !!(st.isFounder || st.requested);
  }

  function requestButtonHtml(plan, extraClass) {
    var tier = normalizePlan(plan);
    var disabled = ctaDisabled(tier);
    var cls = 'btn btn-primary' + (extraClass ? ' ' + extraClass : '');
    return '<button type="button" class="' + cls + ' founder-request-btn"' +
      (disabled ? ' disabled aria-disabled="true"' : '') +
      ' data-founder-request="' + tier + '">' + ctaLabel(tier) + '</button>';
  }

  global.PTFounderRequest = {
    subjectFor: subjectFor,
    normalizePlan: normalizePlan,
    planLabel: planLabel,
    markPending: markPending,
    clearPending: clearPending,
    hasPending: hasPending,
    readPending: readPending,
    requestSeat: requestSeat,
    tryRequestAfterLogin: tryRequestAfterLogin,
    bindButton: bindButton,
    ctaLabel: ctaLabel,
    ctaDisabled: ctaDisabled,
    requestButtonHtml: requestButtonHtml,
    founderCfg: founderCfg
  };
})(window);
