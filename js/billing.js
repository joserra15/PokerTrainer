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

  function openInNewTab(url) {
    var tab = window.open(url, '_blank', 'noopener,noreferrer');
    if (!tab) window.location.href = url;
  }

  function anonKey() {
    return (global.PT_SUPABASE && global.PT_SUPABASE.anonKey) || '';
  }

  async function authHeaders() {
    var token = global.PTSupabase && global.PTSupabase.getAccessToken
      ? await global.PTSupabase.getAccessToken()
      : null;
    if (!token) throw new Error('Inicia sesión para continuar.');
    var headers = {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    };
    var key = anonKey();
    if (key) headers.apikey = key;
    return headers;
  }

  async function postBillingFunction(path, body) {
    try {
      var res = await fetch(functionsBase() + path, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(body || {})
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
      return data;
    } catch (e) {
      if (e && e.message && e.message !== 'Failed to fetch') throw e;
      throw new Error('No se pudo contactar con el servidor de pagos. Comprueba tu conexión e inténtalo de nuevo.');
    }
  }

  function bonusTierForPlan(plan) {
    if (plan === 'premium') return 'coach';
    if (plan === 'pro') return 'study';
    return 'free';
  }

  function parsePlanPrice(s) {
    return parseFloat(String(s || '').replace(',', '.')) || 0;
  }

  function annualSavingsPercent(planKey) {
    var plans = cfg().plans || {};
    var p = plans[planKey];
    if (!p) return 0;
    var monthly = parsePlanPrice(p.monthly);
    var yearly = parsePlanPrice(p.yearly);
    if (monthly <= 0 || yearly <= 0) return 0;
    var twelveMonths = monthly * 12;
    if (twelveMonths <= yearly) return 0;
    return Math.round((1 - yearly / twelveMonths) * 100);
  }

  function isMonthlySubscriber(ent) {
    ent = ent || {};
    return !!(ent.paid_active && (ent.plan === 'pro' || ent.plan === 'premium') &&
      ent.billing_interval === 'month');
  }

  function portalSubscriptionMessage() {
    return 'Puedes gestionar tu suscripción en el portal seguro de Stripe.\n\n' +
      'Para cambiar de plan, pasar a facturación anual o cancelar, pulsa «Actualiza la suscripción» dentro del portal.\n\n' +
      '¿Abrir el portal ahora?';
  }

  async function openPortalWithHint() {
    if (!enabled()) {
      alert('El portal de facturación no está configurado todavía.');
      return;
    }
    if (typeof window !== 'undefined' && window.confirm && !window.confirm(portalSubscriptionMessage())) {
      return;
    }
    await openPortal();
  }

  function annualUpsellHtml(ent) {
    if (!isMonthlySubscriber(ent)) return '';
    var planKey = ent.plan === 'premium' ? 'premium' : 'pro';
    var pct = annualSavingsPercent(planKey);
    if (pct <= 0) return '';
    var planLabel = (cfg().plans[planKey] && cfg().plans[planKey].label) || planKey;
    return '<div class="annual-upsell-banner" role="note">' +
      '<p class="annual-upsell-text">Cambia tu suscripción <strong>' + escapeHtml(planLabel) + '</strong> a anual y <strong>ahorra un ' + pct + '%</strong> respecto a pagar 12 meses con tarifa mensual.</p>' +
      '<p class="muted-text annual-upsell-hint">En el portal de Stripe, pulsa «Actualiza la suscripción».</p>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-portal-manage>Gestionar suscripción</button>' +
      '</div>';
  }

  function mountAnnualUpsell(host, ent) {
    if (!host) return;
    var html = annualUpsellHtml(ent);
    if (!html) {
      host.innerHTML = '';
      host.classList.add('hidden');
      return;
    }
    host.innerHTML = html;
    host.classList.remove('hidden');
    var btn = host.querySelector('[data-portal-manage]');
    if (btn) {
      btn.addEventListener('click', function () {
        openPortalWithHint().catch(function (e) {
          alert(e.message || 'No se pudo abrir el portal.');
        });
      });
    }
  }

  async function startPlanChange() {
    await openPortalWithHint();
  }

  function bonusConfig() {
    return cfg().bonus || {};
  }

  async function startCheckout(plan, interval) {
    if (!enabled()) {
      showPaywall('billing_not_configured', 'El pago en línea se activará pronto. Mientras tanto, contacta con soporte.');
      return;
    }
    var data = await postBillingFunction('/stripe-checkout', {
      plan: plan === 'premium' ? 'premium' : 'pro',
      interval: interval === 'year' ? 'year' : 'month'
    });
    if (data.url) openInNewTab(data.url);
  }

  async function startBonusCheckout(pack) {
    if (!enabled()) {
      showPaywall('billing_not_configured', 'El pago en línea se activará pronto.');
      return;
    }
    var data = await postBillingFunction('/stripe-checkout', { type: 'bonus', pack: pack });
    if (data.url) openInNewTab(data.url);
  }

  async function openPortal() {
    if (!enabled()) {
      alert('El portal de facturación no está configurado todavía.');
      return;
    }
    try {
      var data = await postBillingFunction('/stripe-portal', {});
      if (data.url) openInNewTab(data.url);
    } catch (e) {
      if (e && e.message === 'no_subscription') {
        showPaywall('no_subscription', 'Aún no tienes una suscripción activa.');
        return;
      }
      throw e;
    }
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
    ai_plan: 'El IA Coach (añadir manos por texto, análisis y preguntas) requiere Study (5 consultas/mes), Coach (35/mes) o un bono. El plan Gratis no incluye IA. Los bonos están en la pestaña Planes.',
    ai_limit: 'Has agotado tus consultas IA disponibles. Compra un bono o sube de plan para seguir añadiendo manos con IA, analizando o preguntando.',
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
    if (body) {
      body.innerHTML = '<p>' + escapeHtml(msg) + '</p>';
      if (reason === 'ai_plan' || reason === 'ai_limit') {
        body.innerHTML += '<p class="muted-text" style="margin-top:10px">También puedes comprar un <strong>bono de consultas IA</strong> (válido 12 meses) en Planes.</p>';
      }
    }
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

  async function syncSubscription() {
    if (!enabled()) return { ok: false, error: 'billing_not_configured' };
    var headers = await authHeaders();
    var res = await fetch(functionsBase() + '/stripe-sync-subscription', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({})
    });
    var data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'sync_failed');
    }
    return data;
  }

  async function syncBonusPurchases(opts) {
    opts = opts || {};
    if (!enabled()) return { ok: false, error: 'billing_not_configured' };
    var headers = await authHeaders();
    var res = await fetch(functionsBase() + '/stripe-sync-bonus', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(opts.all ? { all: true } : {})
    });
    var data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'sync_bonus_failed');
    }
    return data;
  }

  async function refreshBillingState(opts) {
    opts = opts || {};
    try {
      await syncSubscription();
    } catch (e) {
      console.warn('[PTBilling] syncSubscription', e);
    }
    if (opts.syncBonus) {
      try {
        await syncBonusPurchases();
      } catch (e) {
        console.warn('[PTBilling] syncBonusPurchases', e);
      }
    }
    if (global.PTEntitlements && global.PTEntitlements.refresh) {
      await global.PTEntitlements.refresh();
    }
    if (global.PTProfile && global.PTProfile.touchAndApply) {
      var u = global.PTAuth && global.PTAuth.getUser ? global.PTAuth.getUser() : null;
      if (u) await global.PTProfile.touchAndApply(u);
    }
    if (global.PTAuth && global.PTAuth.renderAccountMenu) {
      var user = global.PTAuth.getUser();
      if (user) global.PTAuth.renderAccountMenu(user);
    }
  }

  function handleCheckoutReturn() {
    var params = new URLSearchParams(window.location.search);
    var checkout = params.get('checkout');
    var portal = params.get('portal');
    if (checkout === 'success' || checkout === 'bonus_success' || portal === 'return') {
      refreshBillingState({ syncBonus: checkout === 'bonus_success' || checkout === 'success' }).then(function (data) {
        if (checkout === 'bonus_success') {
          var ent = global.PTEntitlements && global.PTEntitlements.get ? global.PTEntitlements.get() : null;
          var bal = ent && ent.bonus ? Number(ent.bonus.balance) || 0 : 0;
          if (bal > 0) {
            alert('Bono IA acreditado. Tienes ' + bal + ' consultas de bono disponibles.');
          } else {
            alert('Pago recibido. Si el bono no aparece en unos segundos, actualiza la pestaña Planes.');
          }
          if (global.goToTab) global.goToTab('pricing');
        }
      });
      history.replaceState({}, '', window.location.pathname + window.location.hash);
    }
  }

  async function syncPayments() {
    if (!enabled()) {
      throw new Error('Stripe no está configurado.');
    }
    var headers = await authHeaders();
    var res = await fetch(functionsBase() + '/stripe-sync-payments', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({})
    });
    var data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'sync_failed');
    }
    return data;
  }

  function formatSyncMessage(data) {
    if (!data) return 'Sincronización completada.';
    var parts = [];
    if (data.subscriptions) parts.push(data.subscriptions + ' suscripción' + (data.subscriptions === 1 ? '' : 'es'));
    if (data.updated) parts.push(data.updated + ' pago' + (data.updated === 1 ? '' : 's') + ' actualizado' + (data.updated === 1 ? '' : 's'));
    if (data.linked) parts.push(data.linked + ' cliente' + (data.linked === 1 ? '' : 's') + ' Stripe vinculado' + (data.linked === 1 ? '' : 's'));
    if (!parts.length) parts.push('Sin cambios en Stripe');
    if (data.errors && data.errors.length) {
      parts.push(data.errors.length + ' error' + (data.errors.length === 1 ? '' : 'es'));
    }
    return parts.join(' · ');
  }

  async function syncMyPayments() {
    if (!enabled()) return { ok: false, error: 'billing_not_configured' };
    var headers = await authHeaders();
    var res = await fetch(functionsBase() + '/stripe-sync-my-payments', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({})
    });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || 'sync_payments_failed');
    try {
      await syncBonusPurchases();
    } catch (e) {
      console.warn('[PTBilling] syncBonusPurchases after payments', e);
    }
    return data;
  }

  global.addEventListener('pt-auth-ready', function () {
    if (!enabled()) return;
    syncBonusPurchases().then(function () {
      if (global.PTEntitlements && global.PTEntitlements.refresh) {
        return global.PTEntitlements.refresh();
      }
    }).catch(function (e) {
      console.warn('[PTBilling] auth bonus sync', e);
    });
  });

  global.addEventListener('pt-entitlements-updated', function (e) {
    var ent = (e && e.detail) || (global.PTEntitlements && global.PTEntitlements.get
      ? global.PTEntitlements.get() : null);
    mountAnnualUpsell(document.getElementById('home-annual-upsell'), ent);
    mountAnnualUpsell(document.getElementById('pricing-annual-upsell'), ent);
  });

  global.PTBilling = {
    enabled: enabled,
    startCheckout: startCheckout,
    startBonusCheckout: startBonusCheckout,
    openPortal: openPortal,
    syncPayments: syncPayments,
    syncBonusPurchases: syncBonusPurchases,
    syncMyPayments: syncMyPayments,
    syncSubscription: syncSubscription,
    refreshBillingState: refreshBillingState,
    formatSyncMessage: formatSyncMessage,
    showPaywall: showPaywall,
    closePaywall: closePaywall,
    bindPaywall: bindPaywall,
    handleCheckoutReturn: handleCheckoutReturn,
    planInfo: function () { return cfg().plans || {}; },
    bonusInfo: bonusConfig,
    bonusTierForPlan: bonusTierForPlan,
    startPlanChange: startPlanChange,
    openPortalWithHint: openPortalWithHint,
    portalSubscriptionMessage: portalSubscriptionMessage,
    annualSavingsPercent: annualSavingsPercent,
    annualUpsellHtml: annualUpsellHtml,
    mountAnnualUpsell: mountAnnualUpsell,
    isMonthlySubscriber: isMonthlySubscriber,
    promoBannerHtml: function () {
      return global.PTBillingPromo && global.PTBillingPromo.bannerHtml
        ? global.PTBillingPromo.bannerHtml() : '';
    }
  };
})(window);
