/*
 * push-config.js — Web Push (VAPID). Plantilla: js/push-config.example.js
 * Pega aquí la clave pública tras `npx web-push generate-vapid-keys`.
 * La privada NO va en este archivo: secret VAPID_PRIVATE_KEY en Supabase.
 */
window.PT_PUSH = {
  enabled: true,
  vapidPublicKey: ''
};
