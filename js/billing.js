/*
 * billing.js — Stripe Checkout y Customer Portal (Epic 3).
 */
(function (global) {
  'use strict';

  function cfg() {
    return global.PT_BILLING || {};
  }

  function enabled() {
    var c = cfg();
    return !!(c.enabled && c.functionsUrl && global.PTSupabase && global.PTSupabase.useAuth && global.PTSupabase.useAuth());
  }

  function functionsBase() {
    return String(cfg().functionsUrl || '').replace(/\/$/, '');
  }

  async function authHeaders() {
    var token = global.PTSupabase && global.PTSupabase.getAccessToken
      ? await global.PTSupabase.getAccessToken()
      : null;
    if (!token) throw new Error('not_authenticated');
    return {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    };
  }

  async function startCheckout(plan, interval) {
    if (!enabled()) {
      showPaywall('billing_not_configured', 'El pago en línea se activará pronto. Mientras tanto, contacta con soporte.');
      return;
    }
    var headers = await authHeaders();
    var res = await fetch(functionsBase() + '/stripe-checkout', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        plan: plan === 'premium' ? 'premium' : 'pro',
        interval: interval === 'year' ? 'year' : 'month'
      })
    });
    var data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'checkout_failed');
    }
    if (data.url) window.location.href = data.url;
  }

  async function openPortal() {
    if (!enabled()) {
      alert('El portal de facturación no está configurado todavía.');
      return;
    }
    var headers = await authHeaders();
    var res = await fetch(functionsBase() + '/stripe-portal', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({})
    });
    var data = await res.json();
    if (!res.ok) {
      if (data.error === 'no_subscription') {
        showPaywall('no_subscription', 'Aún no tienes una suscripción activa.');
        return;
      }
      throw new Error(data.error || 'portal_failed');
    }
    if (data.url) window.location.href = data.url;
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var MESSAGES = {
    trainer_limit: 'Has alcanzado el límite de manos de entrenamiento de hoy en el plan Gratis (15/día).',
    import_limit: 'Has usado tu importación de sesión de este mes en el plan Gratis.',
    import_hands_limit: 'El plan Gratis admite sesiones de hasta 200 manos.',
    ai_plan: 'Los informes IA Coach requieren el plan Coach.',
    ai_limit: 'Has agotado tus informes IA de este mes.',
    billing_not_configured: '',
    no_subscription: ''
  };

  function showPaywall(reason, customMsg) {
    var modal = document.getElementById('paywall-modal');
    if (!modal) {
      if (customMsg) alert(customMsg);
      else if (MESSAGES[reason]) alert(MESSAGES[reason]);
      if (global.goToTab) global.goToTab('pricing');
      return;
    }
    var title = document.getElementById('paywall-title');
    var body = document.getElementById('paywall-body');
    var msg = customMsg || MESSAGES[reason] || 'Esta función requiere un plan de pago.';
    if (title) title.textContent = reason === 'ai_plan' || reason === 'ai_limit' ? 'IA Coach' : 'Mejora tu plan';
    if (body) body.innerHTML = '<p>' + escapeHtml(msg) + '</p>';
    modal.classList.remove('hidden');
    document.body.classList.add('paywall-open');
  }

  function closePaywall() {
    var modal = document.getElementById('paywall-modal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('paywall-open');
  }

  function bindPaywall() {
    var modal = document.getElementById('paywall-modal');
    if (!modal || modal.dataset.bound) return;
    modal.dataset.bound = '1';
    modal.addEventListener('click', function (e) {
      if (e.target.id === 'paywall-modal' || e.target.closest('[data-close-paywall]')) {
        closePaywall();
      }
    });
    var toPricing = document.getElementById('paywall-to-pricing');
    if (toPricing) {
      toPricing.addEventListener('click', function () {
        closePaywall();
        if (global.goToTab) global.goToTab('pricing');
      });
    }
  }

  function handleCheckoutReturn() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      if (global.PTEntitlements && global.PTEntitlements.refresh) {
        global.PTEntitlements.refresh().then(function () {
          if (global.PTAuth && global.PTAuth.renderAccountMenu) {
            var u = global.PTAuth.getUser();
            if (u) global.PTAuth.renderAccountMenu(u);
          }
        });
      }
      history.replaceState({}, '', window.location.pathname + window.location.hash);
    }
  }

  global.PTBilling = {
    enabled: enabled,
    startCheckout: startCheckout,
    openPortal: openPortal,
    showPaywall: showPaywall,
    closePaywall: closePaywall,
    bindPaywall: bindPaywall,
    handleCheckoutReturn: handleCheckoutReturn,
    planInfo: function () { return cfg().plans || {}; }
  };
})(window);
