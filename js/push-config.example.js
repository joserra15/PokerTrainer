/*
 * push-config.example.js — Web Push (VAPID).
 * Copia a js/push-config.js y pega la clave PÚBLICA.
 * La clave PRIVADA solo va en secrets de Supabase (VAPID_PRIVATE_KEY).
 *
 * Generar par:
 *   npx web-push generate-vapid-keys
 */
window.PT_PUSH = {
  enabled: false,
  /** Clave VAPID pública (base64url, punto P-256 sin comprimir). */
  vapidPublicKey: ''
};
