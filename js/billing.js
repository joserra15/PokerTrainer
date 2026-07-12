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

  function bonusTierForPlan(plan) {
    if (plan === 'premium') return 'coach';
    if (plan === 'pro') return 'study';
    return 'free';
  }

  function planRank(plan) {
    return plan === 'premium' ? 2 : (plan === 'pro' ? 1 : 0);
  }

  function formatPeriodEnd(iso) {
    if (!iso) return 'el final del periodo actual';
    try {
      return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch (e) { return 'el final del periodo actual'; }
  }

  function planChangeMessage(opts) {
    var labels = opts.planLabels || { free: 'Gratis', pro: 'Study', premium: 'Coach' };
    var tLabel = labels[opts.targetPlan] || opts.targetPlan;
    var intervalLabel = opts.targetInterval === 'year' ? 'anual' : 'mensual';
    var end = formatPeriodEnd(opts.periodEnd);
    var tail = '\n\nTe llevaremos al portal seguro de Stripe para confirmar el cambio.';

    if (opts.targetPlan === 'free') {
      return 'Vas a cancelar tu suscripción.\n\n' +
        'Conservarás el acceso a tu plan actual hasta ' + end + '. ' +
        'No se renovará y después pasarás al plan Gratis.' + tail;
    }

    var curRank = planRank(opts.currentPlan);
    var tRank = planRank(opts.targetPlan);

    if (tRank > curRank) {
      return 'Vas a mejorar a ' + tLabel + ' (' + intervalLabel + ').\n\n' +
        'El cambio es inmediato. Stripe solo te cobrará la parte proporcional por los días que quedan del periodo actual.' + tail;
    }
    if (tRank < curRank) {
      return 'Vas a cambiar a ' + tLabel + ' (' + intervalLabel + '), un plan inferior.\n\n' +
        'Mantendrás tu plan actual hasta ' + end + ' y luego pasarás a ' + tLabel + '. No se te cobra de más.' + tail;
    }
    // Mismo plan, cambio de intervalo.
    if (opts.targetInterval === 'year') {
      return 'Vas a pasar tu plan ' + tLabel + ' a facturación anual.\n\n' +
        'Se aplica al confirmar; Stripe ajusta el cobro de forma proporcional.' + tail;
    }
    return 'Vas a pasar tu plan ' + tLabel + ' a facturación mensual.\n\n' +
      'El cambio se aplicará al terminar el periodo anual actual (' + end + ').' + tail;
  }

  async function startPlanChange(opts) {
    opts = opts || {};
    var msg = planChangeMessage(opts);
    if (typeof window !== 'undefined' && window.confirm && !window.confirm(msg)) return;
    await openPortal();
  }

  function bonusConfig() {
    return cfg().bonus || {};
  }

  async function startCheckout(plan, interval) {
    if (!enabled()) {
      showPaywall('billing_not_configured', 'El pago en línea se activará pronto. Mientras tanto, contacta con soporte.');
      return;
    }
    var checkoutTab = window.open('about:blank', '_blank');
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
      if (checkoutTab) checkoutTab.close();
      throw new Error(data.error || 'checkout_failed');
    }
    if (data.url) {
      if (checkoutTab) checkoutTab.location.href = data.url;
      else openInNewTab(data.url);
    } else if (checkoutTab) {
      checkoutTab.close();
    }
  }

  async function startBonusCheckout(pack) {
    if (!enabled()) {
      showPaywall('billing_not_configured', 'El pago en línea se activará pronto.');
      return;
    }
    var checkoutTab = window.open('about:blank', '_blank');
    var headers = await authHeaders();
    var res = await fetch(functionsBase() + '/stripe-checkout', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ type: 'bonus', pack: pack })
    });
    var data = await res.json();
    if (!res.ok) {
      if (checkoutTab) checkoutTab.close();
      throw new Error(data.error || 'checkout_failed');
    }
    if (data.url) {
      if (checkoutTab) checkoutTab.location.href = data.url;
      else openInNewTab(data.url);
    } else if (checkoutTab) {
      checkoutTab.close();
    }
  }

  async function openPortal() {
    if (!enabled()) {
      alert('El portal de facturación no está configurado todavía.');
      return;
    }
    var portalTab = window.open('about:blank', '_blank');
    var headers = await authHeaders();
    var res = await fetch(functionsBase() + '/stripe-portal', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({})
    });
    var data = await res.json();
    if (!res.ok) {
      if (portalTab) portalTab.close();
      if (data.error === 'no_subscription') {
        showPaywall('no_subscription', 'Aún no tienes una suscripción activa.');
        return;
      }
      throw new Error(data.error || 'portal_failed');
    }
    if (data.url) {
      if (portalTab) portalTab.location.href = data.url;
      else openInNewTab(data.url);
    } else if (portalTab) {
      portalTab.close();
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
    ai_plan: 'El IA Coach requiere Study (5 consultas/mes), Coach (35/mes) o un bono de consultas. Los bonos están en la pestaña Planes.',
    ai_limit: 'Has agotado tus consultas IA incluidas este mes. Compra un bono o sube de plan.',
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
    planChangeMessage: planChangeMessage,
    promoBannerHtml: function () {
      return global.PTBillingPromo && global.PTBillingPromo.bannerHtml
        ? global.PTBillingPromo.bannerHtml() : '';
    }
  };
})(window);
