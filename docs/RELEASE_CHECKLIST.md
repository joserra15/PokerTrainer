# Release checklist — PokerForgeAI

Antes de un deploy o cambio de secrets en producción:

## Automatizado

1. [ ] `npm run test:ci` en verde (Node / contratos / motor).
2. [ ] E2E smoke: `SMOKE=1 npm run test:e2e` en verde (&lt; ~8 min).
3. [ ] E2E full en `main` (workflow `e2e.yml` sin `SMOKE`) en verde.

## Runbooks manuales / post-deploy

4. [ ] OAuth Google producción — [`docs/GOOGLE_OAUTH_PRODUCTION.md`](./GOOGLE_OAUTH_PRODUCTION.md)  
   Smoke: login real en staging/prod, redirect URI, usuarios de prueba si aplica.
5. [ ] Billing — [`docs/BILLING.md`](./BILLING.md)  
   Smoke opcional: workflow `billing-live` (Stripe test-mode) o checkout test manual.
6. [ ] Supabase RLS — workflow opcional `supabase-smoke` o `node tools/test-supabase.js` con anon key.
7. [ ] Age-gate / cookies / legal visibles para usuario nuevo.
8. [ ] Sentry/Analytics: configs de prod cargan; no rompen la app si fallan.

## Tras el deploy

9. [ ] Abrir home autenticado: entrenar 1 mano + import fixture pequeño.
10. [ ] Verificar plan/entitlements en Cuenta / Planes.
11. [ ] Si hubo cambio de Edge Functions: redeploy + un evento webhook de prueba en Stripe test.

Relacionado: [`docs/BACKLOG_REGRESION.md`](./BACKLOG_REGRESION.md).
