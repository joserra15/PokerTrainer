# Billing — Epic 3

## Estado comercial (octubre 2026 → FOUNDER)

Con `PT_BILLING.purchasesPaused: false` (activo en cliente):

- **Checkout Stripe** (Study/Coach, trial, bonos) habilitado en Planes; la landing invita a iniciar sesión para contratar.
- **FOUNDER** se controla aparte con `founder.seatsOpen` + `closeDate` (`2026-10-31`). Helper `PTBillingPromo.founderSeatsOpen()`: plazas pedibles solo en octubre; el 1 de noviembre se apaga solo.
- Mientras las plazas están abiertas: precios FOUNDER (−40 % para siempre), banda `#landing-promo-pill`, banner en Planes, badge `−40%`, `#home-founder-promo` y botones **Solicitar plaza FOUNDER Study / Coach** (además de los CTAs Stripe).
- Urgencia de copy: FOUNDER solo en octubre; el **31 de octubre** se cierra **para siempre**.
- Se oculta en comunidades gated (`hidePricing` / `community-shell`) y si el usuario ya es founder.
- Botones **Solicitar plaza**: `pt_request_founder_seat(p_plan)` (migraciones `037`/`038`) crea hilo `Solicitud de Founder Study|Coach`. Admin marca `is_founder_study` / `is_founder_coach`.
- Para cerrar plazas antes de tiempo: `founder.seatsOpen: false`. Para pausar cobros otra vez: `purchasesPaused: true`.

## Proveedor: Stripe

**Decisión (M-01):** Stripe frente a Lemon Squeezy.

| Criterio | Stripe | Lemon Squeezy |
|----------|--------|---------------|
| IVA UE / facturación | Stripe Tax o manual | Merchant of Record incluido |
| Integración Supabase | Webhooks + Edge Functions | Similar |
| Customer Portal | Nativo | Incluido |
| Control y flexibilidad | Alto | Medio |
| Comisión | ~2,5% + €0,25 | ~5% + €0,50 |

Para un producto SaaS con suscripciones mensuales/anuales y portal de cliente, **Stripe** ofrece mejor integración con nuestro stack (Supabase Edge Functions) y escalabilidad. La gestión de IVA en España se puede activar con Stripe Tax cuando haya volumen.

## Planes (IDs internos en `pt_user_profiles.plan`)

| ID DB | Nombre comercial | Pagando mensual | Pagando anual |
|-------|------------------|-----------------|---------------|
| `free` | Gratis | €0 | €0 |
| `pro` | Study | €14,99/mes | €9,92/mes (€119/año) |
| `premium` | Coach | €34,99/mes | €23,25/mes (€279/año) |
| `pro` | Study **FOUNDER** (−40 %) | €8,99/mes | €5,95/mes (€71,40/año) |
| `premium` | Coach **FOUNDER** (−40 %) | €20,99/mes | €13,95/mes (€167,40/año) |

Los seis importes de cada plan viven en `PT_BILLING.plans` (`js/billing-config.js`, espejo en
`js/billing-config.example.js`) y los pinta `js/pricing-view.js`, compartido por la landing sin
registro y la pestaña Planes: tarifa habitual tachada, precio FOUNDER en grande y la promesa de
precio bloqueado para siempre. La regresión `tools/test-founder-pricing.js` fija esa tabla.

## Límites por plan

| Recurso | Gratis | Study (`pro`) | Coach (`premium`) |
|---------|--------|---------------|-------------------|
| Manos entrenador / día | 15 | Ilimitado | Ilimitado |
| Sesiones import / mes | 1 | Ilimitado | Ilimitado |
| Manos por import (free) | 200 máx. | — | — |
| Informes IA / mes | 0 | 40 | 150 |
| Bono IA (compra única) | Sí (precio Gratis) · packs 20/40/80 | Sí (precio Study) | Sí (precio Coach) |
| Histórico | 30 días | Completo | Completo |

Los administradores (`is_admin`) no tienen límites.

## Trial Study (10 días)

Checkout de **Study (`pro`)** ofrece `subscription_data[trial_period_days]=10` **una vez por cliente Stripe**
(si el customer no tiene suscripciones previas). También usa `payment_method_collection=if_required`
cuando hay trial. Coach no incluye trial automático.

El backend ya trata `subscription_status=trialing` como plan de pago activo (`paid_active`).

## Configuración Stripe (producción)

### 1. Productos y precios en Stripe Dashboard

Crear dos productos con precios recurrentes:

- **Study** → copiar Price IDs a secrets `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`
- **Coach** → `STRIPE_PRICE_PREMIUM_MONTHLY`, `STRIPE_PRICE_PREMIUM_YEARLY`

### 2. Secrets en Supabase

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_PRO_MONTHLY=price_...
supabase secrets set STRIPE_PRICE_PRO_YEARLY=price_...
supabase secrets set STRIPE_PRICE_PREMIUM_MONTHLY=price_...
supabase secrets set STRIPE_PRICE_PREMIUM_YEARLY=price_...
supabase secrets set PT_SITE_URL=https://www.pokerforgeai.com
```

Checkout sigue con `allow_promotion_codes` por si hace falta un cupón operativo; el cliente **no anuncia** códigos de verano. Desactivar en Stripe Dashboard cualquier Promotion Code antiguo (p. ej. SUMMER26) que no deba usarse.

### 3. Webhook en Stripe

URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`

Eventos:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### 4. Desplegar funciones

```bash
supabase functions deploy stripe-checkout
supabase functions deploy stripe-portal
supabase functions deploy stripe-webhook
```

### 5. Cliente (`js/billing-config.js`)

Copiar `js/billing-config.example.js` y poner `enabled: true` cuando Stripe esté configurado.

## Flujo usuario

1. Usuario en plan Gratis agota límite → modal paywall → pestaña Planes.
2. Elige Study o Coach → Stripe Checkout.
3. Webhook actualiza `plan` y `subscription_status` en `pt_user_profiles`.
4. Gestionar suscripción → Customer Portal (`stripe-portal`).

## Emails transaccionales (M-08)

Stripe envía por defecto confirmación de pago y avisos de fallo. Emails de marca propia (Resend) quedan como mejora futura.

## Smoke opcional (CI)

Job `.github/workflows/billing-live.yml` (`workflow_dispatch` / nightly): comprueba que existe `STRIPE_SECRET_KEY_TEST` (`sk_test_…`) en el environment `billing-live`. **No bloquea PRs.** Contratos sin red: `npm run test:stripe-contracts` y `tools/test-stripe-sync-contracts.js`.
