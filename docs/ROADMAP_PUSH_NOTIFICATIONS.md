# Roadmap técnico — Notificaciones push (PWA · móvil + PC)

> **Estado:** fases 0–6 **implementadas** (agosto 2026). Operación: [`docs/PUSH.md`](./PUSH.md).  
> Pendiente de activación en prod: claves VAPID en secrets + migración `041` + deploy de Edge Functions.  
> **Alcance:** Web Push estándar (VAPID) en PokerForgeAI para **Android, iPhone/iPad (PWA instalada) y PC**.  
> **No usar** FCM ni apps nativas en esta entrega.  
> Complementa: `js/pwa.js`, `sw.js`, `js/re-engagement.js`, `js/account-settings.js`.  
> Fecha: agosto 2026 · Producto: PokerForgeAI

---

## 1. Resumen ejecutivo

| Dimensión | Hoy | Meta |
|-----------|-----|------|
| Service worker | Solo caché / offline (`sw.js`) | + `push` + `notificationclick` |
| Permisos | No se piden | Opt-in en Configuración, nunca al cargar |
| Suscripciones | No existen | Varios dispositivos por usuario (móvil + PC) |
| Backend | Sin Web Push | Edge Functions + tabla Supabase + VAPID |
| Re-engagement | Banner in-app + checkbox email | Push de “hace N días que no entrenas” |
| PC | PWA instalable | Push en Chrome/Edge (y Firefox si soporta) |
| iOS | Instrucciones de instalar | Push **solo** si la PWA está en pantalla de inicio |

**Veredicto:** sí se puede en **teléfono y PC**. El stack actual (PWA vanilla + Supabase Edge Functions) basta. No hace falta app nativa ni Firebase.

---

## 2. Estado actual (mapa técnico)

### 2.1 Lo que ya existe

| Pieza | Archivo | Qué aporta a push |
|-------|---------|-------------------|
| Registro SW | `js/pwa.js` | `navigator.serviceWorker.register('./sw.js')` con `scope` de la app |
| SW | `sw.js` | `install` / `activate` / `fetch`. **No hay** `push` ni `notificationclick` |
| Manifest | `site.webmanifest` | `display: standalone`, `start_url: ./?source=pwa` |
| Instalar | `js/pwa.js` + Configuración | Banner, iOS modal, `#account-install-app` |
| Auth | Supabase Auth + `js/auth.js` | Usuario logueado necesario para persistir suscripciones |
| Edge pattern | `js/billing.js` `postBillingFunction` | `fetch(functionsUrl + path)` con Bearer |
| Re-engagement | `js/re-engagement.js` | Consentimiento marketing + banner a 7 días (`pt_last_train`) |
| Actividad | `pt_user_profiles.last_seen_at` | Señal de inactividad en servidor |
| Tests PWA | `tools/test-pwa-manifest.js` | Contratos de SW/manifest |

### 2.2 Lo que no existe

- `PushManager.subscribe`
- Claves VAPID
- Tabla de suscripciones
- Edge Function de envío
- Toggle de notificaciones en UI
- Payload / deep link desde notificación

### 2.3 Decisión de arquitectura (cerrada)

**Web Push + VAPID + Supabase.** Motivos:

1. Encaja con JS puro (sin SDK de Firebase en el cliente).
2. El envío vive en Edge Functions Deno, igual que Stripe / share-hand.
3. Un mismo canal cubre Android, desktop Chromium y iOS 16.4+ (PWA instalada).
4. Un usuario puede tener **N suscripciones** (móvil + PC del trabajo + PC de casa).

```
[Usuario activa toggle]
        │
        ▼
 js/push.js  →  Notification.requestPermission()
        │
        ▼
 Service Worker  →  PushManager.subscribe({ userVisibleOnly, applicationServerKey })
        │
        ▼
 POST /functions/v1/push-subscribe   (endpoint, p256dh, auth, ua)
        │
        ▼
 public.pt_push_subscriptions
        │
        ▼
 Cron / admin / evento  →  POST push-send  →  endpoint del navegador
        │
        ▼
 sw.js 'push'  →  showNotification()
        │
        ▼
 sw.js 'notificationclick'  →  abrir ./?source=push&tab=play
```

---

## 3. Matriz de soporte (objetivo de producto)

| Plataforma | Navegador | ¿Push? | Condición |
|------------|-----------|--------|-----------|
| Android | Chrome / Edge | Sí | HTTPS + permiso. App abierta o cerrada |
| Android | Firefox | Sí (validar) | Igual |
| Windows | Chrome / Edge | Sí | Permiso concedido |
| Windows | Firefox | Sí (validar) | Permiso concedido |
| macOS | Chrome / Edge | Sí | Permiso concedido |
| macOS | Safari 16+ | Parcial | Validar en Fase 5; no bloquear el resto |
| iPhone / iPad | Safari PWA | Sí | **Añadida a pantalla de inicio** + iOS 16.4+ |
| iPhone / iPad | Safari pestaña | No | Mostrar CTA “Instalar” (`PTPwa.installApp`) |
| Invited / guest | cualquiera | No | Solo usuarios autenticados |

Fase 1–4 se dan por **listas para producción** en Android + desktop Chromium. iOS y Safari macOS se pulen en Fase 5 sin retrasar el resto.

---

## 4. Contratos (congelar antes de codear)

### 4.1 Payload de notificación

JSON en el cuerpo del push (máx. ~2–3 KB; **sin datos sensibles**):

```json
{
  "title": "PokerForgeAI",
  "body": "Hace 7 días que no entrenas. ¿Una mano rápida?",
  "icon": "./icons/icon-192.png",
  "badge": "./icons/icon-192.png",
  "tag": "reengage-7d",
  "renotify": false,
  "data": {
    "type": "reengage",
    "url": "./?source=push&tab=play",
    "campaign": "inactive_7d"
  }
}
```

Reglas:

- `tag` agrupa duplicados (un re-engage a la vez).
- `data.url` es ruta relativa de la PWA, nunca URL absoluta de terceros.
- Tipos iniciales: `reengage` | `test` | `admin`. Más tipos en Fase 4.

### 4.2 Tabla `public.pt_push_subscriptions`

```sql
create table public.pt_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.pt_user_profiles(user_id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  platform text,          -- android | ios | desktop | unknown
  enabled boolean not null default true,
  last_error text,
  last_sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (endpoint)
);

create index pt_push_subscriptions_user_idx
  on public.pt_push_subscriptions (user_id) where enabled = true;
```

RLS:

- `select` / `insert` / `update` / `delete` propios para `authenticated` (`user_id = auth.uid()::text`).
- `service_role` envía y limpia endpoints muertos.

### 4.3 Edge Functions

| Función | Auth | Rol |
|---------|------|-----|
| `push-subscribe` | Bearer usuario | Upsert suscripción |
| `push-unsubscribe` | Bearer usuario | `enabled=false` o delete por `endpoint` |
| `push-send` | Bearer usuario **o** cron secret | Envío a un user / campaña. Self-test: solo a `auth.uid()` |
| `push-dispatch-reengage` | Cron secret (`PUSH_CRON_SECRET`) | Usuarios inactivos N días |

Patrón HTTP: el de `js/billing.js` (`functionsUrl` + `Authorization` + `apikey`).

### 4.4 Secrets (Supabase Edge)

| Secret | Uso |
|--------|-----|
| `VAPID_PUBLIC_KEY` | Cliente (`applicationServerKey`) y envío |
| `VAPID_PRIVATE_KEY` | Solo servidor |
| `VAPID_SUBJECT` | `mailto:info@pokerforgeai.com` |
| `PUSH_CRON_SECRET` | Header `x-cron-secret` del scheduler |
| `SITE_URL` | Ya existe; deep links |

La clave **pública** también se expone al cliente vía `js/push-config.js` (plantilla `push-config.example.js`), igual que analytics/billing. No meter la privada en el repo.

### 4.5 Cliente JS

API pública:

```javascript
window.PTPush = {
  isSupported: function () {},      // Notification + PushManager + serviceWorker
  permission: function () {},       // 'default' | 'granted' | 'denied'
  isStandaloneIOS: function () {},  // iOS + PWA instalada
  subscribe: function () {},        // pide permiso + guarda backend
  unsubscribe: function () {},
  sendTest: function () {}          // llama push-send type=test
};
```

---

## 5. Fases de implementación

Cada fase es un PR independiente, con tests y DoD. No mezclar “UX iOS” con “migración SQL” en el mismo PR.

---

### Fase 0 — Prep y claves (sin UX de producto)

**Objetivo:** poder suscribir y enviar un push de prueba en local/staging.

**Tareas**

- [ ] Generar par VAPID (una vez, fuera del repo):
  ```bash
  npx web-push generate-vapid-keys
  ```
- [ ] Guardar privada + subject en secrets de Supabase (staging).
- [ ] Añadir `js/push-config.example.js` con `enabled: false` y `vapidPublicKey: ''`.
- [ ] Documentar en este archivo (o `docs/PUSH.md` corto) cómo copiar a `js/push-config.js`.
- [ ] Confirmar que producción es HTTPS (`www.pokerforgeai.com`). Local: Chrome no entrega push en `file://`; usar `npx http-server` o el host de e2e.

**Archivos**

| Crear | Notas |
|-------|--------|
| `js/push-config.example.js` | Público; sin secretos |
| `js/push-config.js` | gitignored si sigue el patrón de otros configs, **o** vacío con `enabled: false` en repo |

**Tests**

- `tools/test-push-config.js`: el example existe, tiene `vapidPublicKey`, no contiene private key.

**DoD**

- Claves en staging.
- Config de ejemplo commiteada.
- Nadie pide permiso al usuario todavía.

---

### Fase 1 — Service worker + módulo cliente (aún sin persistir)

**Objetivo:** si el permiso ya está granted (DevTools / prompt manual), el SW muestra una notificación y el clic abre la app.

**Tareas**

- [ ] Crear `js/push.js` (IIFE, `window.PTPush`).
- [ ] Detectar soporte; en iOS no-standalone devolver `{ supported: false, reason: 'ios_not_installed' }`.
- [ ] `subscribe()`: esperar `navigator.serviceWorker.ready`, luego `reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`.
- [ ] Helper `urlBase64ToUint8Array` para la clave VAPID.
- [ ] En `sw.js`:
  - `push`: parsear JSON (fallback a texto), `showNotification(title, { body, icon, badge, tag, data })`.
  - `notificationclick`: `event.notification.close()`, `clients.matchAll({ type: 'window', includeUncontrolled: true })`, enfocar o `clients.openWindow(url)`.
- [ ] Reutilizar `handleLaunchParams` de `js/pwa.js` (`?tab=play`). Añadir `source=push`.
- [ ] Registrar `js/push.js` en `js/bundle-chunks.js` (chunk `core`, **antes** de `js/pwa.js` / `js/account-settings.js`) y en `index.html` fallback.
- [ ] Bump de caché SW: `CACHE = 'pt-shell-v19'` (o el siguiente).

**Archivos a tocar**

- `js/push.js` (nuevo)
- `sw.js`
- `js/pwa.js` (exportar `ready()` o reutilizar `serviceWorker.ready`)
- `js/bundle-chunks.js`
- `index.html`
- `tools/test-pwa-manifest.js` (asertar listeners `push` / `notificationclick`)

**Tests**

- Extender `tools/test-pwa-manifest.js`.
- `tools/test-push-client.js`: parseo de payload, detección iOS, URL de deep link.

**DoD**

- Con permiso granted, un push simulado (Application → Service Workers → Push en Chrome DevTools, o `reg.showNotification`) abre `/?tab=play`.
- Sin backend todavía: `subscribe()` puede loguear la subscription en consola.

**Fuera de alcance:** UI, SQL, envío real.

---

### Fase 2 — Persistencia y Edge subscribe/unsubscribe

**Objetivo:** cada dispositivo del usuario queda guardado y se puede borrar.

**Tareas**

- [ ] Migración `supabase/migrations/041_push_subscriptions.sql` (tabla + RLS + índices).
- [ ] `supabase/functions/push-subscribe/index.ts`
  - POST `{ endpoint, p256dh, auth, user_agent, platform }`
  - Upsert por `endpoint`; asignar `user_id` del JWT.
- [ ] `supabase/functions/push-unsubscribe/index.ts`
  - POST `{ endpoint }` → disable o delete.
- [ ] Cliente: tras `subscribe()`, POST a `push-subscribe`; al apagar toggle, `push-unsubscribe`.
- [ ] Detectar `platform` desde UA + `PTPwa.isIOS` / standalone / `matchMedia('(display-mode: standalone)')`.
- [ ] Al logout (`js/auth.js`): no borrar en servidor (otro device sigue); sí `unsubscribe()` local opcional. Decisión: **no auto-unsubscribe al logout** para no perder el PC si cierra sesión un rato. Documentar.

**Tests**

- `tools/test-push-edge-contract.js` (mismo estilo que `tools/test-share-hand-edge-contract.js` / stripe): CORS, 401 sin auth, upsert, unique endpoint.
- `tools/test-rls-policies.js`: incluir policies nuevas si el test lee SQL.

**DoD**

- Usuario logueado en Chrome desktop y Android → 2 filas.
- Re-suscribir el mismo endpoint no duplica.
- Usuario A no lee suscripciones de B (RLS).

---

### Fase 3 — Envío real + botón “Enviar prueba”

**Objetivo:** el usuario recibe un push de test en el dispositivo actual (y se valida el pipeline completo).

**Tareas**

- [ ] Dependencia Web Push en Deno. Opciones (elegir una y no mezclar):
  1. `https://esm.sh/web-push@3` (más rápida de integrar; verificar ESM en Edge).
  2. Implementación mínima RFC 8291/8292 si `web-push` no corre en Deno.
- [ ] `supabase/functions/push-send/index.ts`
  - Body: `{ type: 'test' }` → solo suscripciones del caller.
  - Body admin/cron: `{ user_id, type, title, body, url, tag }` con secret o `pt_profile_is_admin`.
  - Enviar con VAPID.
  - Si respuesta `404` / `410` / `Gone`: `enabled = false`, guardar `last_error`.
  - Actualizar `last_sent_at`.
- [ ] UI en Configuración (`js/account-settings.js`), sección nueva **Notificaciones**:
  - Toggle “Avisarme en este dispositivo”.
  - Botón “Enviar notificación de prueba” (visible si `permission === 'granted'`).
  - Copy iOS si no está instalada: reutilizar `PTPwa.installApp`.
- [ ] Estados UI: no soportado / denegado / iOS sin instalar / listo.
- [ ] i18n: strings en `js/i18n.js` si toca chrome visible (ES primero; EN si el selector sigue locked, igual que el resto de settings).

**Tests**

- Contrato edge: 401, self-test no acepta `user_id` ajeno, payload máximo.
- `tools/test-account-settings.js`: existe toggle y botón de prueba.
- Manual: checklist Fase 3 (abajo).

**DoD**

- En Android Chrome y Windows Chrome, el botón de prueba muestra una notificación con la app en segundo plano.
- Clic abre el entrenador.
- Endpoint inválido se desactiva solo.

---

### Fase 4 — Primer caso de producto: re-engagement 7 días

**Objetivo:** sustituir (o complementar) el banner in-app con un push real a inactivos que **opt-in push**.

**Tareas**

- [ ] `supabase/functions/push-dispatch-reengage/index.ts`
  - Auth: `x-cron-secret`.
  - Seleccionar usuarios con push `enabled`, `last_seen_at` (o última mano entrenada si se persiste) ≥ 7 días, y sin `last_sent_at` de campaña `inactive_7d` en los últimos 7 días.
  - Límite de lote (p. ej. 200/run) para no timeout.
  - Payload tipo `reengage`, `tag: reengage-7d`, URL `./?source=push&tab=play`.
- [ ] Scheduler: Supabase cron diario (hora valle EU, p. ej. 18:00 UTC) o GitHub Action con secret.
- [ ] Preferencia **independiente** del checkbox email (`pt_marketing_consent`). Push ≠ email.
- [ ] Tope: 1 re-engage / usuario / 7 días (aunque tenga 3 devices: se envía a todos los devices enabled, misma `tag`).
- [ ] Opcional: persistir `last_trained_at` en perfil si `last_seen_at` es demasiado ruidoso (visita ≠ entrenar). Si se hace, tocarlo en `js/re-engagement.js` `touchTrain()` → cloud. Si no, usar `last_seen_at` en v1 y documentar el sesgo.

**Tests**

- Contrato: sin secret → 401; no selecciona usuarios activos; no reenvía antes de 7 días.
- Unit SQL o comentario en migración con query de selección.

**DoD**

- Cuenta de staging inactiva 7 días + push on → recibe 1 notificación.
- Cuenta activa no recibe.
- Email opt-in no implica push.

---

### Fase 5 — iOS, desktop Safari y pulido UX

**Objetivo:** no romper expectativas en iPhone; dejar clara la matriz.

**Tareas**

- [ ] Flujo iOS:
  1. Si no standalone → CTA “Instala la app para recibir avisos” (`showIOSInstructions`).
  2. Si standalone y `PushManager` existe → mismo toggle.
  3. Si standalone y no hay PushManager → “Actualiza iOS (16.4+)”.
- [ ] No llamar `requestPermission` en el primer paint. Solo tras click del toggle.
- [ ] Si `denied`: texto “Actívalas en Ajustes del sistema / candado de la barra”.
- [ ] Probar:
  - iPhone Safari instalada / no instalada
  - iPad
  - macOS Safari
  - Windows Edge
  - Android Chrome app cerrada
- [ ] Añadir la matriz real al final de este doc (lo probado vs teórico).
- [ ] Quiet hours: **no** en v1. Si molesta, Fase 6.

**Tests**

- `tools/test-push-client.js`: ramas iOS.
- E2E opcional: el toggle existe y no dispara permiso sin click (Playwright no concede push real en CI; no bloquear CI por envío real).

**DoD**

- iOS sin instalar no muestra el prompt nativo inútil.
- Documentada matriz verificada.

---

### Fase 6 — Limpieza, admin, analítica (endurecer)

**Objetivo:** operable en producción.

**Tareas**

- [ ] Job de limpieza: suscripciones `enabled=false` o `last_error` 410 con > 30 días → delete.
- [ ] Admin (`js/admin-panel.js`): botón “Enviar push de prueba a este usuario” (reutiliza `push-send` admin).
- [ ] Eventos Plausible (`js/analytics.js`) si el patrón de tagged events lo permite:
  - `push_permission_granted` / `denied`
  - `push_subscribed`
  - `push_test_sent`
  - `push_open` (al hidratar `source=push`)
- [ ] Cap de frecuencia global: máx. 1 push automático / usuario / día.
- [ ] Textos legales: Configuración + política de privacidad (si hay página legal): opt-in, opt-out, tipos de aviso.
- [ ] Extender `tools/test-pwa-manifest.js` / account-settings si faltan asertos.

**DoD**

- Admin puede diagnosticar “¿le llega a este user?”.
- Endpoints muertos no crecen sin límite.
- Hay métrica de opt-in y de clics.

---

## 6. Orden de PRs y dependencias

```
Fase 0  config + VAPID
   │
   ▼
Fase 1  SW + PTPush          ← se puede mergear sin secrets de prod
   │
   ▼
Fase 2  SQL + subscribe      ← requiere Fase 1
   │
   ▼
Fase 3  send + UI prueba     ← requiere 0 + 2
   │
   ▼
Fase 4  cron re-engage       ← requiere 3
   │
   ├── Fase 5  iOS / Safari  (paralelo a 4 si 3 está en prod)
   └── Fase 6  admin/analytics (después de 4)
```

**Primer valor para el usuario:** final de Fase 3 (aviso de prueba).  
**Primer valor de negocio:** final de Fase 4 (retorno de inactivos).

---

## 7. Checklist de prueba manual (Fase 3+)

| # | Caso | Esperado |
|---|------|----------|
| 1 | Android Chrome, app cerrada, test | Notificación del sistema |
| 2 | Clic en notificación | Abre PWA en pestaña Entrenar |
| 3 | Windows Chrome, app no enfocada | Igual |
| 4 | Segundo dispositivo mismo user | Las dos filas; test puede ir a todas o solo la actual (definir: **solo actual** en self-test) |
| 5 | Permiso denegado | Toggle off + copy de ajustes, sin loop de prompt |
| 6 | iOS Safari pestaña | CTA instalar, sin `requestPermission` |
| 7 | iOS PWA instalada 16.4+ | Toggle funciona |
| 8 | Logout/login mismo browser | Endpoint se re-upserta, no duplica |
| 9 | Desactivar toggle | Deja de llegar |
| 10 | Endpoint 410 | Fila `enabled=false` |

Self-test (Fase 3): enviar **solo al endpoint del dispositivo que pulsa el botón**, no a todos los devices del user.

---

## 8. Seguridad y privacidad

- Payload sin email, sin manos, sin tokens.
- HTTPS obligatorio (ya en prod).
- VAPID private solo en secrets.
- Opt-in explícito; push distinto de email marketing.
- RLS en suscripciones.
- `push-send` con `user_id` ajeno: solo admin o cron.
- Cumplimiento: el usuario puede borrar el toggle y “Eliminar cuenta” ya hace cascade del perfil → borrar suscripciones (`on delete cascade`).

---

## 9. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| `web-push` no corre bien en Deno Edge | Spike en Fase 3 día 1; fallback a librería Web Push Deno o micro-servicio Node solo para send |
| iOS cambia reglas PWA | Fase 5 aislada; Android+PC no esperan |
| Usuarios bloquean el prompt si se pide pronto | Solo click en toggle (Fase 3) |
| Cron dispara demasiado | tag + 7 días + cap 1/día (Fase 4/6) |
| SW cache viejo sin listener `push` | bump `CACHE` y `?v=PT_BUILD` ya existente |
| Guest / 5 manos | No ofrecer push hasta auth |

---

## 10. Métricas de éxito (tras Fase 4–6)

- % usuarios logueados con ≥1 suscripción enabled.
- % Android vs desktop vs iOS.
- CTR `push_open` / enviados (re-engage).
- Retorno a entrenar en 24 h tras re-engage vs control (si hay volumen).
- Tasa de `410` / envíos (higiene).

---

## 11. Fuera de alcance (v1)

- Firebase Cloud Messaging / APNs nativo.
- Notificaciones locales programadas sin servidor (`showTrigger` no es portable).
- Badges de icono iOS, sonidos custom, acciones múltiples.
- Push a invitados.
- Campañas promocionales / pricing (solo `test`, `reengage`, `admin`).
- Quiet hours y categorías extra (lección nueva, análisis listo).
- App Store / Play Store wrapper.

Esas van a un v2 cuando Fase 4 esté estable.

---

## 12. Definición de “listo para implementar”

Una fase está lista para codear cuando:

1. Los archivos de la tabla de la fase están identificados (arriba).
2. El contrato JSON/SQL no cambia en ese PR.
3. Hay test de contrato o aserto de fichero, al estilo del repo (`tools/test-*.js`).
4. El DoD es comprobable en Android Chrome **o** Windows Chrome (el otro se valida en el mismo PR si hay device; si no, en el PR de Fase 5).

**Siguiente acción concreta:** abrir PR de **Fase 0** (`push-config.example.js` + secrets staging) y en paralelo spike de `web-push` en una Edge Function de staging para no sorprenderse en Fase 3.
