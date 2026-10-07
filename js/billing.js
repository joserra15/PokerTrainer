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
    return !!(c.enabled && functionsBase() && global.PTSupabase && global.PTSupabase.useAuth && global.PTSupabase.useAuth());
  }

  function purchasesPaused() {
    return !!cfg().purchasesPaused;
  }

  function purchasesOpen() {
    return enabled() && !purchasesPaused();
  }

  function founderInfo() {
    var f = cfg().founder;
    return f && typeof f === 'object' ? f : null;
  }

  function founderSeatsOpen() {
    if (global.PTBillingPromo && typeof global.PTBillingPromo.founderSeatsOpen === 'function') {
      return !!global.PTBillingPromo.founderSeatsOpen();
    }
    var f = founderInfo();
    if (!f || f.seatsOpen === false) return false;
    if (!f.closeDate) return true;
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    var today = d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
    return today <= String(f.closeDate);
  }

  function founderLaunchLabel() {
    var f = founderInfo();
    return (f && f.launchLabel) || 'octubre';
  }

  function purchasesPausedShortMsg() {
    return 'Las compras están temporalmente cerradas.';
  }

  function paywallFounderHtml() {
    var f = founderInfo() || {};
    if (!founderSeatsOpen()) return '';
    var studyBtn = (global.PTFounderRequest && global.PTFounderRequest.requestButtonHtml)
      ? global.PTFounderRequest.requestButtonHtml('study', 'btn-sm')
      : '<button type="button" class="btn btn-primary btn-sm" data-founder-request="study">Solicitar plaza FOUNDER Study</button>';
    var coachBtn = (global.PTFounderRequest && global.PTFounderRequest.requestButtonHtml)
      ? global.PTFounderRequest.requestButtonHtml('coach', 'btn-sm')
      : '<button type="button" class="btn btn-primary btn-sm" data-founder-request="coach">Solicitar plaza FOUNDER Coach</button>';
    var closeLabel = f.closeLabel || '31 de octubre';
    return '<div class="paywall-founder" role="note">' +
      '<p><strong>FOUNDER · solo octubre</strong></p>' +
      '<ul class="paywall-founder-list">' +
      '<li>Puedes <strong>contratar Study o Coach</strong> ahora a precio de lista.</li>' +
      '<li><strong>FOUNDER</strong> (−' + escapeHtml(String(f.discount || '40%').replace(/^−|^-/, '')) +
      ') solo está abierto en octubre; el <strong>' + escapeHtml(closeLabel) +
      '</strong> se cierra <strong>para siempre</strong>.</li>' +
      '<li><strong>Plazas limitadas</strong> · solicita Study o Coach abajo.</li>' +
      '</ul>' +
      '<p class="paywall-founder-launch">' +
      escapeHtml(f.urgencyNote || ('FOUNDER solo está abierto en octubre. El ' + closeLabel + ' se cierra para siempre.')) +
      '</p>' +
      '<p class="muted-text">' + escapeHtml(f.priorityNote ||
        'Solicita tu plaza FOUNDER Study o Coach en Planes; revisamos cada solicitud en soporte.') + '</p>' +
      '<p class="paywall-founder-cta-wrap">' + studyBtn + ' ' + coachBtn + '</p>' +
      '</div>';
  }

  function functionsBase() {
    var fromBilling = String(cfg().functionsUrl || '').trim().replace(/\/$/, '');
    if (fromBilling && isValidFunctionsBase(fromBilling)) return fromBilling;
    var sb = global.PT_SUPABASE || {};
    var fromSb = String(sb.url || '').trim().replace(/\/$/, '');
    if (fromSb) return fromSb + '/functions/v1';
    return fromBilling;
  }

  /** Reject placeholders / scrubbed hosts that break fetch (e.g. literal [REDACTED]). */
  function isValidFunctionsBase(url) {
    if (!url || /\[|\]|YOUR_PROJECT|TU_PROYECTO|REDACTED/i.test(url)) return false;
    try {
      var u = new URL(url);
      return (u.protocol === 'https:' || u.protocol === 'http:') && !!u.hostname && !u.username && !u.password;
    } catch (e) {
      return false;
    }
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

  function currentEntitlements() {
    return global.PTEntitlements && global.PTEntitlements.get
      ? global.PTEntitlements.get()
      : null;
  }

  /**
   * Promo (trialing + cancel_at_period_end) o plan otorgado sin Stripe
   * (admin / sin sub id / sin ningún pago Stripe registrado).
   */
  function isPromoOrManualGrant(ent) {
    ent = ent || currentEntitlements() || {};
    if (!(ent.plan === 'pro' || ent.plan === 'premium')) return false;
    var status = String(ent.subscription_status || '');
    var paidLike = !!ent.paid_active || status === 'trialing' || status === 'active';
    if (!paidLike) return false;
    if (status === 'trialing' && !!ent.subscription_cancel_at_period_end) return true;
    if (!ent.stripe_subscription_id) return true;
    // Id de sub en perfil pero nunca hubo pago Stripe → grant admin / id obsoleto.
    if (!ent.stripe_last_payment_at && (status === 'active' || status === 'trialing')) {
      return true;
    }
    return false;
  }

  /** True solo si hay suscripción Stripe real (no promo/manual grant). */
  function hasStripeSubscription(ent) {
    ent = ent || currentEntitlements() || {};
    if (isPromoOrManualGrant(ent)) return false;
    return !!(ent.stripe_subscription_id);
  }

  /** Gestionar facturación: Checkout si no hay sub Stripe live; si no, portal. */
  async function manageBilling() {
    if (!enabled()) {
      alert('El portal de facturación no está configurado todavía.');
      return;
    }
    var ent = currentEntitlements() || {};
    if (isPromoOrManualGrant(ent) || !hasStripeSubscription(ent)) {
      await subscribeViaCheckout(
        ent.plan === 'premium' ? 'premium' : 'pro',
        ent.billing_interval === 'year' ? 'year' : 'month'
      );
      return;
    }
    await openPortal();
  }

  function isMonthlySubscriber(ent) {
    ent = ent || {};
    return !!(ent.paid_active && hasStripeSubscription(ent) &&
      (ent.plan === 'pro' || ent.plan === 'premium') &&
      ent.billing_interval === 'month');
  }

  function portalSubscriptionMessage() {
    return 'Puedes gestionar tu suscripción en el portal seguro de Stripe.\n\n' +
      'Para cambiar de plan, pasar a facturación anual o cancelar, pulsa «Actualiza la suscripción» dentro del portal.\n\n' +
      '¿Abrir el portal ahora?';
  }

  function subscribePromptMessage(planLabel) {
    return 'Tu acceso actual viene de una promoción o asignación manual: aún no hay suscripción de pago en Stripe.\n\n' +
      'Para continuar con ' + (planLabel || 'tu plan') + ' de pago, te llevamos al checkout seguro.\n\n' +
      '¿Continuar?';
  }

  async function openPortalWithHint() {
    if (!enabled()) {
      alert('El portal de facturación no está configurado todavía.');
      return;
    }
    var ent = currentEntitlements() || {};
    if (isPromoOrManualGrant(ent) || !hasStripeSubscription(ent)) {
      await subscribeViaCheckout(ent.plan === 'premium' ? 'premium' : 'pro',
        ent.billing_interval === 'year' ? 'year' : 'month');
      return;
    }
    if (typeof window !== 'undefined' && window.confirm && !window.confirm(portalSubscriptionMessage())) {
      return;
    }
    await openPortal();
  }

  async function subscribeViaCheckout(plan, interval) {
    var plans = cfg().plans || {};
    var key = plan === 'premium' ? 'premium' : 'pro';
    var label = (plans[key] && plans[key].label) || key;
    if (typeof window !== 'undefined' && window.confirm && !window.confirm(subscribePromptMessage(label))) {
      return;
    }
    await startCheckout(key, interval === 'year' ? 'year' : 'month');
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
    if (global.PTCommunity && global.PTCommunity.requireMembership && global.PTCommunity.requireMembership()) {
      host.innerHTML = '';
      host.classList.add('hidden');
      return;
    }
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
    var ent = currentEntitlements() || {};
    if (!hasStripeSubscription(ent)) {
      await subscribeViaCheckout(ent.plan === 'premium' ? 'premium' : 'pro',
        ent.billing_interval === 'year' ? 'year' : 'month');
      return;
    }
    await openPortalWithHint();
  }

  function bonusConfig() {
    return cfg().bonus || {};
  }

  async function startCheckout(plan, interval) {
    if (purchasesPaused()) {
      showPaywall('purchases_paused', purchasesPausedShortMsg());
      return;
    }
    if (!enabled()) {
      showPaywall('billing_not_configured', 'El pago en línea se activará pronto. Mientras tanto, contacta con soporte.');
      return;
    }
    try {
      var data = await postBillingFunction('/stripe-checkout', {
        plan: plan === 'premium' ? 'premium' : 'pro',
        interval: interval === 'year' ? 'year' : 'month'
      });
      if (data.url) openInNewTab(data.url);
    } catch (e) {
      // Entitlements sin stripe_subscription_id aún, pero Stripe sí tiene sub.
      if (e && e.message === 'already_subscribed') {
        await openPortal();
        return;
      }
      throw e;
    }
  }

  async function startBonusCheckout(pack) {
    if (purchasesPaused()) {
      showPaywall('purchases_paused', purchasesPausedShortMsg() + ' Los bonos de IA también estarán disponibles entonces.');
      return;
    }
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
        var ent = currentEntitlements() || {};
        var plan = ent.plan === 'premium' ? 'premium' : 'pro';
        await subscribeViaCheckout(plan, ent.billing_interval === 'year' ? 'year' : 'month');
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
    import_limit: 'Has usado tu importación de sesión de este mes en el plan Gratis (1/mes).',
    import_hands_limit: 'El plan Gratis admite sesiones de hasta 200 manos por import.',
    ai_plan: 'ForgeCoach requiere consultas disponibles. El plan Gratis incluye 3 consultas/mes de prueba; Study 40/mes y Coach 150/mes. También puedes usar un bono de consultas.',
    ai_limit: 'Has agotado tus consultas ForgeCoach disponibles este mes (plan + bono).',
    billing_not_configured: '',
    purchases_paused: '',
    no_subscription: '',
    trial_ended: 'Tu prueba de Study ha terminado.',
    tournament_plan: 'Este torneo requiere un plan superior. Study desbloquea fáciles y medios; Coach incluye difíciles y pro.'
  };

  function trialInfo() {
    var t = cfg().trial;
    if (!t || !t.days) return null;
    return {
      plan: t.plan || 'pro',
      days: Number(t.days) || 10,
      label: t.label || ('Prueba Study ' + (t.days || 10) + ' días'),
      note: t.note || ''
    };
  }

  function trialDaysLeft(ent) {
    if (!ent || ent.subscription_status !== 'trialing') return null;
    var end = ent.subscription_period_end;
    if (!end) return null;
    var ms = new Date(end).getTime() - Date.now();
    if (isNaN(ms)) return null;
    return Math.max(0, Math.ceil(ms / 86400000));
  }

  function showPaywall(reason, customMsg) {
    if (global.PTGuest && global.PTGuest.isActive && global.PTGuest.isActive()) {
      if (global.PTGuest.showGate) global.PTGuest.showGate(reason === 'guest_gate' ? 'limit' : (reason || 'tab'));
      return;
    }
    var modal = document.getElementById('paywall-modal');
    if (!modal) {
      if (customMsg) alert(customMsg);
      else if (MESSAGES[reason]) alert(MESSAGES[reason]);
      if (global.goToTab) global.goToTab('pricing');
      return;
    }
    var title = document.getElementById('paywall-title');
    var body = document.getElementById('paywall-body');
    var toPricing = document.getElementById('paywall-to-pricing');
    var msg = customMsg || MESSAGES[reason] || 'Esta función requiere un plan superior.';
    var paused = purchasesPaused();
    var seatsOpen = founderSeatsOpen();
    if (title) {
      if (reason === 'ai_plan' || reason === 'ai_limit') title.textContent = 'ForgeCoach';
      else if (paused) title.textContent = 'Límite del plan Gratis';
      else title.textContent = 'Mejora tu plan';
    }
    if (body) {
      body.innerHTML = '<p>' + escapeHtml(msg) + '</p>';
      if (seatsOpen) {
        body.innerHTML += paywallFounderHtml();
      } else if (reason === 'ai_plan' || reason === 'ai_limit') {
        body.innerHTML += '<p class="muted-text" style="margin-top:10px">También puedes comprar un <strong>bono de consultas IA</strong> (válido 12 meses) en Planes.</p>';
      }
    }
    if (toPricing) {
      toPricing.textContent = seatsOpen ? 'Ver planes y FOUNDER' : 'Ver planes';
    }
    modal.classList.remove('hidden');
    document.body.classList.add('paywall-open');
    if (reason === 'ai_plan' || reason === 'ai_limit') {
      if (global.PTLog && global.PTLog.event) {
        global.PTLog.event('ai_paywall_shown', { reason: reason });
      } else if (global.PTAnalytics && global.PTAnalytics.track) {
        global.PTAnalytics.track('ai_paywall_shown', { reason: reason });
      }
    }
    if (body && typeof body.querySelectorAll === 'function') {
      body.querySelectorAll('[data-founder-request]').forEach(function (btn) {
        if (global.PTFounderRequest && global.PTFounderRequest.bindButton) {
          global.PTFounderRequest.bindButton(btn);
        }
      });
    }
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
    purchasesPaused: purchasesPaused,
    purchasesOpen: purchasesOpen,
    founderSeatsOpen: founderSeatsOpen,
    founderInfo: founderInfo,
    startCheckout: startCheckout,
    startBonusCheckout: startBonusCheckout,
    openPortal: openPortal,
    manageBilling: manageBilling,
    hasStripeSubscription: hasStripeSubscription,
    isPromoOrManualGrant: isPromoOrManualGrant,
    subscribeViaCheckout: subscribeViaCheckout,
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
    trialInfo: trialInfo,
    trialDaysLeft: trialDaysLeft,
    promoBannerHtml: function () {
      return global.PTBillingPromo && global.PTBillingPromo.bannerHtml
        ? global.PTBillingPromo.bannerHtml() : '';
    }
  };
})(window);
