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

  function renderPricing() {
    var grid = document.getElementById('landing-pricing-grid');
    if (!grid) return;
    var plans = (global.PT_BILLING && global.PT_BILLING.plans) || {};
    var cards = [
      {
        title: 'Gratis', price: '0 €', period: '/mes', featured: false,
        features: ['15 manos entrenador/día', '1 sesión import/mes', 'Sesión de ejemplo incluida', 'Sin IA Coach']
      },
      {
        title: plans.pro ? plans.pro.label : 'Study',
        price: (plans.pro ? plans.pro.monthly : '14,99') + ' €', period: '/mes', featured: true,
        features: ['Entrenador ilimitado', 'Import ilimitado', '3 consultas IA Coach/mes', 'Sync en la nube']
      },
      {
        title: plans.premium ? plans.premium.label : 'Coach',
        price: (plans.premium ? plans.premium.monthly : '34,99') + ' €', period: '/mes', featured: false,
        features: ['Todo Study', '30 consultas IA/mes', 'Informes de sesión', 'Soporte prioritario']
      }
    ];
    grid.innerHTML = cards.map(function (c) {
      return '<div class="landing-price-card' + (c.featured ? ' featured' : '') + '">' +
        '<h3>' + escapeHtml(c.title) + '</h3>' +
        '<div class="landing-price">' + escapeHtml(c.price) + '<small>' + escapeHtml(c.period) + '</small></div>' +
        '<ul>' + c.features.map(function (f) { return '<li>' + escapeHtml(f) + '</li>'; }).join('') + '</ul>' +
        '<button type="button" class="btn ' + (c.featured ? 'btn-primary' : 'btn-ghost') + ' btn-block landing-price-cta">Ir al login</button>' +
        '</div>';
    }).join('');
    grid.querySelectorAll('.landing-price-cta').forEach(function (btn) {
      btn.addEventListener('click', scrollToLogin);
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

  function bindNav() {
    document.querySelectorAll('[data-landing-login]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        scrollToLogin();
      });
    });
    document.querySelectorAll('.landing-nav a[href^="#"]').forEach(function (a) {
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
  }

  function init() {
    if (!document.getElementById('auth-gate')) return;
    renderPricing();
    renderOAuthHints();
    bindNav();
  }

  global.PTLanding = { init: init, scrollToLogin: scrollToLogin };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
