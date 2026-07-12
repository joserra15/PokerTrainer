# Billing — Epic 3

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

| ID DB | Nombre comercial | Precio orientativo |
|-------|------------------|-------------------|
| `free` | Gratis | €0 |
| `pro` | Study | €14,99/mes · €119/año |
| `premium` | Coach | €34,99/mes · €279/año |

## Límites por plan

| Recurso | Gratis | Study (`pro`) | Coach (`premium`) |
|---------|--------|---------------|-------------------|
| Manos entrenador / día | 15 | Ilimitado | Ilimitado |
| Sesiones import / mes | 1 | Ilimitado | Ilimitado |
| Manos por import (free) | 200 máx. | — | — |
| Informes IA / mes | 0 | 5 | 35 |
| Bono IA (compra única) | Sí (precio Gratis) | Sí (precio Study) | Sí (precio Coach) |
| Histórico | 30 días | Completo | Completo |

Los administradores (`is_admin`) no tienen límites.

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
