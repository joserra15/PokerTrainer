# Tools — cómo añadir una regresión

## Estilo del repo

1. **Node + `vm`** para motor/import/contratos (como `tools/selftest.js`).
2. **Guards de fuente** (`fs.readFileSync` + `assert`/`regex`) para HTML/CSS/Edge.
3. **Playwright** en `e2e/` para flujos UI (auth mock vía `e2e/helpers.js`).

## Checklist al añadir un test Node

1. Crear `tools/test-<nombre>.js` (o ampliar uno existente).
2. Cargar scripts en el **mismo orden** que el bundle core cuando toque motor (`cards` → ranges → equity → solver → scoring → `engine.js` → import).
3. Fixtures HH en `tools/fixtures/`.
4. Añadir script npm en `package.json` (`test:<nombre>`).
5. Añadir step en `tools/run-ci-tests.js` (lista canónica = CI `static.yml`).
6. Mensaje de éxito `*** … OK ***` y `process.exit(1)` en fallo.

## Checklist E2E

1. Spec en `e2e/*.spec.js`.
2. Usar `mockAuthenticatedUser` / `seedStudyData` / `goTab` de `helpers.js`.
3. Etiquetar **`@smoke`** en el `describe`/`test` si debe correr en cada PR.
4. Etiquetar **`@mobile`** si es layout móvil.
5. **No** añadir `waitForTimeout` fijos; preferir `expect().toBeVisible({ timeout })`.
6. Retries solo los de `playwright.config.js` (CI).

## Comandos

```bash
npm run test:ci          # toda la suite Node
npm run test:e2e         # Playwright full (build + test)
SMOKE=1 npm run test:e2e # solo @smoke (PR)
```

## Jobs opcionales (secrets)

- `.github/workflows/supabase-smoke.yml` — `workflow_dispatch` / nightly
- `.github/workflows/billing-live.yml` — Stripe test-mode, no bloquea PR

Ver también `docs/BACKLOG_REGRESION.md` y `docs/RELEASE_CHECKLIST.md`.
