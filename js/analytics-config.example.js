/*
 * analytics-config.example.js — Plausible Analytics (G-07).
 * Copia a js/analytics-config.js y configura tu dominio.
 */
window.PT_ANALYTICS = {
  enabled: false,
  provider: 'plausible',
  /** Dominio registrado en Plausible (sin https://) */
  domain: 'pokertrainer.example.com',
  /** URL del script (por defecto Plausible cloud) */
  scriptUrl: 'https://plausible.io/js/script.tagged-events.js'
};
