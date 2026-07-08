/*
 * disclaimer.js — Aviso metodológico guía de estudio (P-07).
 */
(function (global) {
  'use strict';

  var TEXT = 'El análisis GTO de PokerForgeAI es <strong>heurístico y educativo</strong>: usa tablas, Monte Carlo y reglas aproximadas. No sustituye un solver exacto ni constituye asesoramiento de juego.';

  var SHORT = 'Análisis heurístico GTO · no es solver exacto.';

  function html(variant) {
    if (variant === 'foot') {
      return '<span class="app-foot-disclaimer" role="note">' + SHORT + '</span>';
    }
    var cls = 'study-disclaimer' + (variant === 'inline' ? ' study-disclaimer-inline' : '');
    var body = variant === 'short' ? SHORT : TEXT;
    return '<aside class="' + cls + '" role="note"><span class="study-disclaimer-icon" aria-hidden="true">ℹ</span><span>' + body + '</span></aside>';
  }

  function mount(selector, variant) {
    var el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return;
    el.innerHTML = html(variant || 'full');
  }

  global.PTDisclaimer = {
    TEXT: TEXT,
    SHORT: SHORT,
    html: html,
    mount: mount
  };
})(window);
