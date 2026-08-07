/*
 * landing.js — Landing pública antes del login (G-02).
 */
(function (global) {
  'use strict';

  function $(sel) { return document.querySelector(sel); }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function siteCfg() {
    return global.PT_SITE || {};
  }

  function scrollToLogin() {
    var panel = document.getElementById('landing-login');
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      panel.classList.remove('landing-login-focus');
      global.setTimeout(function () { panel.classList.add('landing-login-focus'); }, 20);
      global.setTimeout(function () { panel.classList.remove('landing-login-focus'); }, 2200);
      var btn = document.getElementById('auth-mobile-login');
      if (btn) btn.focus();
    }
  }

  function startLoginNow() {
    if (global.PT_startGoogleLogin) {
      global.PT_startGoogleLogin();
      return;
    }
    var btn = document.getElementById('auth-mobile-login');
    if (btn) {
      btn.click();
      return;
    }
    scrollToLogin();
  }

  function renderPromo() {
    var Promo = global.PTBillingPromo;
    if (!Promo) return;
    var pillHost = document.getElementById('landing-promo-pill');
    if (pillHost) pillHost.innerHTML = Promo.pillHtml ? Promo.pillHtml() : '';
    var bannerHost = document.getElementById('landing-promo-banner');
    if (bannerHost) bannerHost.innerHTML = Promo.bannerHtml ? Promo.bannerHtml() : '';
  }

  function t(key, vars) {
    return (global.PTI18n && global.PTI18n.t) ? global.PTI18n.t(key, vars) : key;
  }

  function i18nReady() {
    return !!(global.PTI18n && global.PTI18n.t);
  }

  function renderLimitsBox() {
    var host = document.getElementById('landing-limits-box');
    if (!host) return;
    if (!i18nReady()) return;
    var trial = (global.PT_BILLING && global.PT_BILLING.trial) || {};
    var days = trial.days || 10;
    host.innerHTML =
      '<h3>' + escapeHtml(t('limits.title')) + '</h3>' +
      '<ul class="landing-limits-list">' +
      '<li><strong>' + escapeHtml(t('plan.free')) + ':</strong> ' + escapeHtml(t('limits.free').replace(/^Gratis:\s*/i, '').replace(/^Free:\s*/i, '')) + '</li>' +
      '<li>' + escapeHtml(t('limits.trial', { days: days })) + '</li>' +
      '<li>' + escapeHtml(t('limits.card')) + '</li>' +
      '</ul>';
  }

  function renderPricing() {
    var grid = document.getElementById('landing-pricing-grid');
    if (!grid) return;
    if (!i18nReady()) return;
    var plans = (global.PT_BILLING && global.PT_BILLING.plans) || {};
    var trial = (global.PT_BILLING && global.PT_BILLING.trial) || {};
    var trialLabel = trial.label || 'Prueba Study 10 días';
    var cards = [
      {
        title: t('plan.free'), price: '0 €', period: '/mes', featured: false,
        features: [t('plan.free.f1'), t('plan.free.f2'), t('plan.free.f3'), t('plan.free.f4')]
      },
      {
        title: plans.pro ? plans.pro.label : 'Study',
        price: (plans.pro ? plans.pro.monthly : '14,99') + ' €', period: '/mes', featured: true,
        features: [
          t('plan.study.f1', { trial: trialLabel }),
          t('plan.study.f2'),
          t('plan.study.f3'),
          t('plan.study.f4'),
          t('plan.study.f5')
        ]
      },
      {
        title: plans.premium ? plans.premium.label : 'Coach',
        price: (plans.premium ? plans.premium.monthly : '34,99') + ' €', period: '/mes', featured: false,
        features: [
          t('plan.coach.f1'),
          t('plan.coach.f2'),
          t('plan.coach.f3'),
          t('plan.coach.f4'),
          t('plan.coach.f5')
        ]
      }
    ];
    grid.innerHTML = cards.map(function (c) {
      return '<div class="landing-price-card' + (c.featured ? ' featured' : '') + '">' +
        '<h3>' + escapeHtml(c.title) + '</h3>' +
        '<div class="landing-price">' + escapeHtml(c.price) + '<small>' + escapeHtml(c.period) + '</small></div>' +
        '<ul>' + c.features.map(function (f) { return '<li>' + escapeHtml(f) + '</li>'; }).join('') + '</ul>' +
        '<button type="button" class="btn ' + (c.featured ? 'btn-primary' : 'btn-ghost') + ' btn-block landing-price-cta">' +
        escapeHtml(t('plan.cta')) + '</button>' +
        '</div>';
    }).join('');
    grid.querySelectorAll('.landing-price-cta').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        startLoginNow();
      });
    });
  }

  function renderOAuthHints() {
    var setup = document.getElementById('auth-setup');
    if (!setup) return;
    var cfg = siteCfg();
    var origins = cfg.oauthJavascriptOrigins || [];
    var redirects = cfg.supabaseRedirectUrls || cfg.oauthRedirectUris || [];
    var originsEl = document.getElementById('auth-oauth-origins');
    var redirectsEl = document.getElementById('auth-oauth-redirects');
    if (originsEl) {
      originsEl.innerHTML = origins.map(function (o) {
        return '<code class="auth-copy">' + escapeHtml(o) + '</code>';
      }).join('');
    }
    if (redirectsEl) {
      redirectsEl.innerHTML = redirects.map(function (u) {
        return '<code class="auth-copy">' + escapeHtml(u) + '</code>';
      }).join('');
    }
    var appUrlEl = document.getElementById('auth-app-url');
    if (appUrlEl && cfg.appUrl) appUrlEl.textContent = cfg.appUrl;
  }

  function promoLandingUrl(code) {
    var site = siteCfg();
    var base = (site.appUrl || (location.origin + '/')).replace(/\/?$/, '/');
    return base + 'promo.html?c=' + encodeURIComponent(code);
  }

  function bindPromoCodeForm() {
    var form = document.getElementById('landing-promo-code-form');
    var input = document.getElementById('landing-promo-code-input');
    if (!form || !input) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var code = String(input.value || '').trim().toUpperCase();
      if (!code) {
        input.focus();
        return;
      }
      input.value = code;
      location.href = promoLandingUrl(code);
    });
  }

  function bindNav() {
    document.querySelectorAll('[data-landing-login]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        scrollToLogin();
      });
    });
    document.querySelectorAll('[data-set-lang]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var lang = btn.getAttribute('data-set-lang');
        if (global.PTI18n && global.PTI18n.setLang) global.PTI18n.setLang(lang);
      });
    });
    document.querySelectorAll('.landing-main a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href').slice(1);
        var target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
    document.querySelectorAll('[data-landing-install]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (global.PTPwa && global.PTPwa.installApp) {
          global.PTPwa.installApp();
          return;
        }
        scrollToLogin();
      });
    });
    bindPromoCodeForm();
  }

  function pendingPromoCode() {
    if (global.PTPromoRedeem && global.PTPromoRedeem.captureFromUrl) {
      return global.PTPromoRedeem.captureFromUrl();
    }
    try {
      var params = new URLSearchParams(location.search || '');
      var code = String(params.get('promo') || params.get('c') || '').trim().toUpperCase();
      if (code) {
        try { sessionStorage.setItem('pt_promo_pending', code); } catch (e) { /* noop */ }
        return code;
      }
      return String(sessionStorage.getItem('pt_promo_pending') || '').trim().toUpperCase();
    } catch (e) {
      return '';
    }
  }

  function renderPromoRegisterHint(code) {
    if (!code) return;
    var panel = document.getElementById('landing-login');
    if (!panel) return;
    var existing = document.getElementById('landing-promo-register-hint');
    if (existing) existing.remove();
    var hint = document.createElement('p');
    hint.id = 'landing-promo-register-hint';
    hint.className = 'landing-promo-pill';
    hint.setAttribute('role', 'note');
    hint.innerHTML = 'Promoción <code class="promo-code">' + escapeHtml(code) +
      '</code>: regístrate con Google (cuenta nueva) para activar el regalo.';
    panel.insertBefore(hint, panel.firstChild);
  }

  function refreshI18n() {
    if (global.PTI18n && global.PTI18n.apply) global.PTI18n.apply(document.getElementById('auth-gate') || document);
    renderLimitsBox();
    renderPricing();
  }

  function init() {
    if (!document.getElementById('auth-gate')) return;
    if (global.PTI18n && global.PTI18n.apply) global.PTI18n.apply(document);
    renderPromo();
    renderLimitsBox();
    renderPricing();
    renderOAuthHints();
    bindNav();
    var promoCode = pendingPromoCode();
    if (promoCode) {
      renderPromoRegisterHint(promoCode);
      scrollToLogin();
      var autoLogin = false;
      try { autoLogin = sessionStorage.getItem('pt_promo_autologin') === '1'; } catch (e) { /* noop */ }
      if (autoLogin || /[?&]promo=/i.test(location.search || '')) {
        try { sessionStorage.removeItem('pt_promo_autologin'); } catch (e) { /* noop */ }
        global.setTimeout(function () { startLoginNow(); }, 350);
      }
    }
  }

  global.PTLanding = { init: init, scrollToLogin: scrollToLogin, refreshI18n: refreshI18n };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
