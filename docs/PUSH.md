# Operación — Notificaciones push (Web Push + VAPID)

Complementa [`ROADMAP_PUSH_NOTIFICATIONS.md`](./ROADMAP_PUSH_NOTIFICATIONS.md).

## Secrets (Supabase Edge)

| Secret | Valor |
|--------|--------|
| `VAPID_PUBLIC_KEY` | Clave pública (la misma que `js/push-config.js`) |
| `VAPID_PRIVATE_KEY` | Clave privada (nunca en el repo) |
| `VAPID_SUBJECT` | `mailto:info@pokerforgeai.com` |
| `PUSH_CRON_SECRET` | Token largo aleatorio para el cron |
| `SITE_URL` | `https://www.pokerforgeai.com` |

Generar claves:

```bash
npx web-push generate-vapid-keys
```

Pega la pública en `js/push-config.js` (`vapidPublicKey`) y deja `enabled: true`.

Migración: `supabase/migrations/041_push_subscriptions.sql`.

Funciones: `push-subscribe`, `push-unsubscribe`, `push-send`, `push-dispatch-reengage`.

## Cron (re-engagement 7 días + limpieza 30 días)

GitHub Action `.github/workflows/push-reengage.yml` (18:00 UTC) o scheduler de Supabase.

Secrets del workflow: `SUPABASE_FUNCTIONS_URL` (p. ej. `https://PROJECT.supabase.co/functions/v1`) y `PUSH_CRON_SECRET`.

## Probar

1. HTTPS (o localhost servido).
2. Login: aparece **una sola vez** el aviso para activar notificaciones (Aceptar / Cancelar). Se puede cambiar después en Configuración.
3. Configuración → **Avisarme en este dispositivo**.
4. **Enviar notificación de prueba**.
5. Un mensaje de admin a un usuario también dispara push (`?tab=contact`).
6. En Admin → Usuarios, la columna **Push** muestra quién lo tiene activado (y se puede filtrar).

En iPhone: primero **Añadir a pantalla de inicio**.
