/*
 * sentry-config.example.js — Monitorización de errores (G-08).
 * Copia a js/sentry-config.js y añade tu DSN de Sentry.
 */
window.PT_SENTRY = {
  enabled: false,
  dsn: 'https://YOUR_KEY@o000000.ingest.sentry.io/0000000',
  environment: 'production',
  tracesSampleRate: 0.1,
  /** Versión de release (se sobreescribe con PT_BUILD si existe) */
  release: null
};
