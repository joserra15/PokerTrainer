/*
 * analytics-config.example.js — Plausible Analytics (G-07).
 * Copia a js/analytics-config.js y configura tu dominio.
 */
window.PT_ANALYTICS = {
  enabled: false,
  provider: 'plausible',
  /** Dominio registrado en Plausible (sin https://) */
  domain: 'pokerforgeai.example.com',
  /** URL del script (script.tagged-events.js o pa-XXXX.js de tu cuenta) */
  scriptUrl: 'https://plausible.io/js/pa-yB_bcSp765LNxWql3aZJS.js'
};
