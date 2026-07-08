/*
 * pwa.js — Instalación PWA, registro del service worker y ayuda iOS.
 */
(function (global) {
  'use strict';

  var DISMISS_KEY = 'pt_pwa_install_dismiss_v1';
  var deferredPrompt = null;
  var bannerEl = null;

  function $(sel) { return document.querySelector(sel); }

  function appBasePath() {
    var path = global.location.pathname || '/';
    if (path.endsWith('/')) return path;
    if (/\.[a-z0-9]+$/i.test(path)) {
      return path.substring(0, path.lastIndexOf('/') + 1);
    }
    return path + '/';
  }

  function isStandalone() {
    return global.matchMedia('(display-mode: standalone)').matches ||
      global.navigator.standalone === true;
  }

  function isIOS() {
    var ua = global.navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) ||
      (global.navigator.platform === 'MacIntel' && global.navigator.maxTouchPoints > 1);
  }

  function isDismissed() {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch (e) { return false; }
  }

  function setDismissed() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) { /* ignore */ }
  }

  function canPromptInstall() {
    return !!deferredPrompt;
  }

  function shouldOfferInstall() {
    if (isStandalone()) return false;
    if (isDismissed()) return false;
    return canPromptInstall() || isIOS();
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in global.navigator)) return;
    var build = global.PT_BUILD || '1';
    var base = appBasePath();
    var swUrl = base + 'sw.js?v=' + encodeURIComponent(build);
    global.addEventListener('load', function () {
      global.navigator.serviceWorker.register(swUrl, { scope: base }).catch(function (e) {
        console.warn('[PWA] Service worker', e);
      });
    });
  }

  function updateInstallUI() {
    var btn = $('#account-install-app');
    if (!btn) return;
    if (isStandalone()) {
      btn.classList.add('hidden');
      return;
    }
    if (canPromptInstall() || isIOS()) {
      btn.classList.remove('hidden');
      btn.textContent = isIOS() ? 'Instalar en iPhone/iPad' : 'Instalar app';
    } else {
      btn.classList.add('hidden');
    }
  }

  function hideBanner() {
    if (bannerEl) bannerEl.classList.add('hidden');
  }

  function showBanner() {
    if (!shouldOfferInstall() || isStandalone()) return;
    if (!bannerEl) {
      bannerEl = document.createElement('div');
      bannerEl.id = 'pwa-install-banner';
      bannerEl.className = 'pwa-install-banner hidden';
      bannerEl.innerHTML =
        '<div class="pwa-install-inner">' +
        '<div class="pwa-install-text">' +
        '<strong>Instala PokerForgeAI</strong>' +
        '<span class="pwa-install-sub">Acceso rápido desde tu pantalla de inicio, como una app.</span>' +
        '</div>' +
        '<div class="pwa-install-actions">' +
        '<button type="button" class="btn btn-primary btn-sm" id="pwa-install-accept">Instalar</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="pwa-install-dismiss">Ahora no</button>' +
        '</div></div>';
      document.body.appendChild(bannerEl);
      $('#pwa-install-accept').addEventListener('click', function () {
        installApp();
      });
      $('#pwa-install-dismiss').addEventListener('click', function () {
        setDismissed();
        hideBanner();
      });
    }
    bannerEl.classList.remove('hidden');
    document.body.classList.add('pwa-banner-open');
  }

  function hideBannerIfNeeded() {
    hideBanner();
    document.body.classList.remove('pwa-banner-open');
  }

  function showIOSInstructions() {
    var existing = $('#pwa-ios-modal');
    if (existing) {
      existing.classList.remove('hidden');
      return;
    }
    var modal = document.createElement('div');
    modal.id = 'pwa-ios-modal';
    modal.className = 'modal pwa-ios-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML =
      '<div class="modal-content pwa-ios-content">' +
      '<h3>Instalar en iPhone o iPad</h3>' +
      '<ol class="pwa-ios-steps">' +
      '<li>Abre esta página en <strong>Safari</strong>.</li>' +
      '<li>Pulsa el botón <strong>Compartir</strong> (cuadrado con flecha).</li>' +
      '<li>Elige <strong>Añadir a pantalla de inicio</strong>.</li>' +
      '<li>Confirma con <strong>Añadir</strong>.</li>' +
      '</ol>' +
      '<p class="muted-text">La app se abrirá a pantalla completa, sin barra del navegador.</p>' +
      '<button type="button" class="btn btn-primary btn-block" id="pwa-ios-close">Entendido</button>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.classList.add('hidden');
    });
    $('#pwa-ios-close').addEventListener('click', function () {
      modal.classList.add('hidden');
    });
  }

  function installApp() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (choice) {
        deferredPrompt = null;
        if (choice.outcome === 'accepted') hideBannerIfNeeded();
        updateInstallUI();
      }).catch(function () {
        deferredPrompt = null;
        updateInstallUI();
      });
      return;
    }
    if (isIOS()) showIOSInstructions();
  }

  function bindInstallEvents() {
    global.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      updateInstallUI();
      if (!isDismissed()) showBanner();
    });

    global.addEventListener('appinstalled', function () {
      deferredPrompt = null;
      hideBannerIfNeeded();
      updateInstallUI();
    });

    var btn = $('#account-install-app');
    if (btn) {
      btn.addEventListener('click', function () {
        installApp();
        var dropdown = $('#account-dropdown');
        if (dropdown) dropdown.classList.add('hidden');
      });
    }
  }

  function init() {
    registerServiceWorker();
    bindInstallEvents();
    updateInstallUI();
    if (isStandalone()) {
      document.documentElement.classList.add('pwa-standalone');
    }
    global.addEventListener('pt-auth-ready', function () {
      handleLaunchParams();
      updateInstallUI();
      if (deferredPrompt && !isDismissed()) showBanner();
    });
  }

  function handleLaunchParams() {
    if (!global.goToTab) return;
    var params = new URLSearchParams(global.location.search);
    var tab = params.get('tab');
    if (!tab) return;
    global.goToTab(tab);
    if (global.history && global.history.replaceState) {
      var url = new URL(global.location.href);
      url.searchParams.delete('tab');
      if (url.searchParams.get('source') === 'pwa-shortcut') url.searchParams.delete('source');
      global.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.PTPwa = {
    installApp: installApp,
    isStandalone: isStandalone,
    isIOS: isIOS,
    updateInstallUI: updateInstallUI
  };
})(window);
