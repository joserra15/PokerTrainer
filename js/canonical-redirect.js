/*
 * canonical-redirect.js — Fuerza HTTPS y www.pokerforgeai.com en producción.
 * Debe ejecutarse lo antes posible en <head> (inline o primer script).
 */
(function () {
  'use strict';
  var h = location.hostname;
  if (!h || h === 'localhost' || h === '127.0.0.1' || location.protocol === 'file:') return;
  var canonical = 'www.pokerforgeai.com';
  var isProd = h === 'pokerforgeai.com' || h === canonical || /\.github\.io$/i.test(h);
  if (!isProd) return;
  if (location.protocol === 'http:' || h !== canonical) {
    location.replace('https://' + canonical + location.pathname + location.search + location.hash);
  }
})();
