# Auditoría de seguridad y control de acceso

Fecha: 2026-10-16  
Alcance: vulnerabilidades web, RLS/RPCs, Edge Functions y enforcement por perfil en PokerForgeAI.

## Modelo de autorización

SPA estática + Supabase Auth (JWT) + RLS/RPCs + Edge Functions. Plan y `is_admin` viven en `pt_user_profiles` (no en el JWT). El cliente orquesta UX; la verdad de cuotas de coste (IA, Stripe, filas cloud) debe estar en servidor.

| Perfil | Capacidad de producto | Enforcement real |
|--------|----------------------|------------------|
| Guest | Demo limitada | Solo cliente (`PTGuest`) |
| free | Trainer diario, AI limitado, school/torneo básico | Cuotas AI/import en servidor; school/torneo en cliente |
| pro (Study) | Trainer/import ilimitado, más AI | Entitlements RPC + edge AI |
| premium (Coach) | Máximo AI + features | Igual + rank de contenido en cliente |
| Community member | `bypassPaywalls` en UI | Membresía en servidor; paywall estático en cliente |
| Community manager | Panel manager | RPCs `pt_is_community_manager` |
| Admin | Panel admin, unlimited | RPCs `is_pt_admin()`; UI con `user.isAdmin` |

## Hallazgos y estado

### Crítico / Alto (remediados en este cambio)

| ID | Hallazgo | Remediation |
|----|----------|-------------|
| C1 | Stored XSS en `share.html` vía `document.write` de HTML arbitrario | Sanitizado en Edge POST; render en iframe `sandbox` sin scripts; CSP en `share.html` |
| H1 | `freePromo` bypaseaba cuota Gemini | Solo con payload de home-greeting estricto |
| H2 | `pt_check_ai_access` / `pt_record_ai_usage` ejecutables por cualquier authenticated con `p_user_id` arbitrario | `REVOKE` de `authenticated`; solo `service_role` (edge) |
| H3 | Entitlements OR-eaban `isAdmin()` local y omitían RPC trainer si `unlimited()` | Fail-closed; no merge client admin; siempre registrar trainer en servidor |

### Medio (remediados)

| ID | Hallazgo | Remediation |
|----|----------|-------------|
| M1 | Open redirect en push (`sw.js` + `push-send`) | Allowlist same-origin |
| M2 | `pt_villain_assist_cache_put` sin gate de plan | Solo pro/premium/admin |
| M3 | `pt_app_settings` SELECT `using (true)` | Drop policy; RPC con claves allowlisted |
| M4 | CORS `*` en Edge | Allowlist de orígenes |
| M5 | `session-export` sin escape + `document.write` | Escape HTML en campos |

### Pendiente / aceptación (P2+)

| ID | Nota |
|----|------|
| P2-1 | Quitar auto-promote admin por email `info@pokerforgeai.com` (ops SQL one-shot + 2FA del buzón) |
| P2-2 | Sesión en cookies httpOnly (cambio arquitectónico) |
| P2-3 | Re-enable `verify_jwt` en gateway Supabase donde ya hay `verifyAuth` |
| P2-4 | Paywall server-side de lecciones estáticas (bajo valor; no son secretos) |
| INFO | Fail-open AI si falta service role → ahora fail-closed en `checkAiAccess` |

## Controles que ya estaban bien

- RLS own-row con `auth.uid()` tras migración `034`
- Admin RPCs con `is_pt_admin()`
- Stripe webhook firmado; `service_role` no en el browser
- Shared hands / promotions / guest funnel: RLS + deny-by-default en tabla

## Cómo verificar

```bash
node tools/test-share-hand.js
node tools/test-share-hand-edge-contract.js
node tools/test-analyze-hand-contract.js
node tools/test-entitlements.js
node tools/test-security-audit.js
node tools/test-rls-policies.js
```

Migración a aplicar en Supabase: `068_security_hardening.sql`.
