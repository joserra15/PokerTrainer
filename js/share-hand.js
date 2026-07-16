/*
 * share-hand.js — Generar y publicar HTML estático temporal de un análisis de mano.
 */
(function (global) {
  'use strict';

  var TTL_DAYS = 14;
  var CSS_CACHE = null;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function appUrl() {
    var site = global.PT_SITE || {};
    return String(site.appUrl || '/').replace(/\/?$/, '/');
  }

  function functionsBase() {
    var billing = global.PT_BILLING || {};
    if (billing.functionsUrl) return String(billing.functionsUrl).replace(/\/$/, '');
    var sb = global.PT_SUPABASE || {};
    if (sb.url) return String(sb.url).replace(/\/$/, '') + '/functions/v1';
    return '';
  }

  function anonKey() {
    return (global.PT_SUPABASE && global.PT_SUPABASE.anonKey) || '';
  }

  async function authHeaders() {
    var token = global.PTSupabase && global.PTSupabase.getAccessToken
      ? await global.PTSupabase.getAccessToken()
      : null;
    if (!token) throw new Error('Inicia sesión para compartir una mano.');
    var headers = {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
    var key = anonKey();
    if (key) headers.apikey = key;
    return headers;
  }

  function formatExpiryDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return '';
    }
  }

  function expiryFromNow() {
    var d = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);
    return d.toISOString();
  }

  async function loadShareCss() {
    if (CSS_CACHE) return CSS_CACHE;
    var res = await fetch('css/share.css', { cache: 'force-cache' });
    if (!res.ok) throw new Error('No se pudo cargar el estilo de la página compartida.');
    CSS_CACHE = await res.text();
    return CSS_CACHE;
  }

  function inviteHTML() {
    var home = appUrl();
    return '<div class="share-invite">' +
      '<div class="share-invite-brand">' +
      '<img src="' + esc(home) + 'icons/icon-192.png" alt="PokerForgeAI" width="42" height="42" />' +
      '<div><h1>PokerForgeAI</h1>' +
      '<p>Entrena y analiza manos con GTO e IA Coach.</p></div>' +
      '</div>' +
      '<a class="btn btn-primary" href="' + esc(home) + '">Entrar</a>' +
      '</div>';
  }

  function footerHTML(expiresAtIso) {
    var until = formatExpiryDate(expiresAtIso);
    return '<footer class="share-footer">' +
      'Análisis compartido temporal · Disponible hasta el <strong>' + esc(until) + '</strong>.' +
      '</footer>';
  }

  function wrapDocument(opts) {
    var title = opts.title || 'Análisis de mano';
    var css = opts.css || '';
    var body = opts.bodyHtml || '';
    var expiresAt = opts.expiresAt || expiryFromNow();
    return '<!DOCTYPE html>\n' +
      '<html lang="es">\n' +
      '<head>\n' +
      '<meta charset="UTF-8" />\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />\n' +
      '<meta name="robots" content="noindex, nofollow" />\n' +
      '<meta name="theme-color" content="#0f1419" />\n' +
      '<title>' + esc(title) + ' · PokerForgeAI</title>\n' +
      '<link rel="icon" href="' + esc(appUrl()) + 'icons/favicon-32x32.png" type="image/png" sizes="32x32" />\n' +
      '<style>\n' + css + '\n</style>\n' +
      '</head>\n' +
      '<body>\n' +
      '<div class="share-wrap">\n' +
      inviteHTML() + '\n' +
      body + '\n' +
      footerHTML(expiresAt) + '\n' +
      '</div>\n' +
      '</body>\n' +
      '</html>';
  }

  function ensureDialog() {
    var el = document.getElementById('share-hand-dialog');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'share-hand-dialog';
    el.className = 'share-hand-dialog hidden';
    el.innerHTML =
      '<div class="share-hand-dialog-card" role="dialog" aria-modal="true" aria-labelledby="share-hand-dialog-title">' +
      '<button type="button" class="share-hand-dialog-close" data-share-close aria-label="Cerrar">&times;</button>' +
      '<h3 id="share-hand-dialog-title">Enlace para compartir</h3>' +
      '<p class="muted-text" data-share-msg>Cualquiera con el enlace podrá ver este análisis sin iniciar sesión.</p>' +
      '<div class="share-hand-url-row">' +
      '<input type="text" readonly data-share-url />' +
      '<button type="button" class="btn btn-primary" data-share-copy>Copiar</button>' +
      '</div>' +
      '<p class="muted-text" data-share-expiry></p>' +
      '</div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      if (e.target === el || e.target.closest('[data-share-close]')) closeDialog();
    });
    var copyBtn = el.querySelector('[data-share-copy]');
    if (copyBtn) {
      copyBtn.addEventListener('click', async function () {
        var input = el.querySelector('[data-share-url]');
        if (!input || !input.value) return;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(input.value);
          } else {
            input.focus();
            input.select();
            document.execCommand('copy');
          }
          copyBtn.textContent = 'Copiado';
          setTimeout(function () { copyBtn.textContent = 'Copiar'; }, 1600);
        } catch (err) {
          input.focus();
          input.select();
        }
      });
    }
    return el;
  }

  function closeDialog() {
    var el = document.getElementById('share-hand-dialog');
    if (el) el.classList.add('hidden');
  }

  function openDialog(result) {
    var el = ensureDialog();
    var input = el.querySelector('[data-share-url]');
    var expiry = el.querySelector('[data-share-expiry]');
    var msg = el.querySelector('[data-share-msg]');
    if (input) input.value = result.url || '';
    if (expiry) {
      expiry.textContent = result.expiresAt
        ? ('Disponible hasta el ' + formatExpiryDate(result.expiresAt) + '.')
        : '';
    }
    if (msg) {
      msg.textContent = 'Cualquiera con el enlace podrá ver este análisis sin iniciar sesión.';
    }
    el.classList.remove('hidden');
    if (input) {
      input.focus();
      input.select();
    }
  }

  function setButtonBusy(btn, busy) {
    if (!btn) return;
    if (busy) {
      btn.dataset.sharePrev = btn.textContent || '';
      btn.disabled = true;
      btn.textContent = 'Generando…';
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.sharePrev || 'Compartir';
      delete btn.dataset.sharePrev;
    }
  }

  async function createShare(opts) {
    var source = opts && opts.source;
    var hand = opts && opts.hand;
    var title = (opts && opts.title) || '';
    if (!source || !hand) throw new Error('Faltan datos de la mano.');
    if (!functionsBase()) throw new Error('Compartir no está disponible ahora mismo.');

    var ui = global.PTShareHandUI;
    if (!ui || !ui.buildBodyHTML) throw new Error('El generador de análisis no está listo.');

    var bodyHtml = ui.buildBodyHTML(hand, { source: source });
    if (!bodyHtml) throw new Error('No se pudo generar el análisis para compartir.');

    var expiresAt = expiryFromNow();
    var css = await loadShareCss();
    var html = wrapDocument({
      title: title || ui.handTitle(hand) || 'Análisis de mano',
      css: css,
      bodyHtml: bodyHtml,
      expiresAt: expiresAt
    });

    var res = await fetch(functionsBase() + '/share-hand', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        html: html,
        source: source,
        title: title || ui.handTitle(hand) || 'Análisis de mano'
      })
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      var err = data.error || ('HTTP ' + res.status);
      if (err === 'missing_auth' || err === 'invalid_auth') {
        throw new Error('Inicia sesión para compartir una mano.');
      }
      if (err === 'html_too_large') throw new Error('El análisis es demasiado grande para compartir.');
      throw new Error('No se pudo crear el enlace compartido.');
    }
    return data;
  }

  async function shareFromButton(btn, getPayload) {
    setButtonBusy(btn, true);
    try {
      var payload = typeof getPayload === 'function' ? getPayload() : getPayload;
      var result = await createShare(payload);
      openDialog(result);
      return result;
    } catch (e) {
      alert((e && e.message) || 'No se pudo compartir la mano.');
      return null;
    } finally {
      setButtonBusy(btn, false);
    }
  }

  global.PTShareHand = {
    ttlDays: TTL_DAYS,
    create: createShare,
    shareFromButton: shareFromButton,
    wrapDocument: wrapDocument,
    formatExpiryDate: formatExpiryDate
  };
})(window);
