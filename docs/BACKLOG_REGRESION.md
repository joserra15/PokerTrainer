# Backlog — Pruebas de regresión (producción)

> Objetivo: que **ningún cambio futuro rompa** flujos críticos de PokerForgeAI en producción. Inventario del estado actual, huecos, y backlog priorizado de tareas de regresión.
>
> **Contexto:** La app ya está en producción (entrenador GTO + import de sesiones + billing Stripe + Supabase + IA Coach). El motor, importador y análisis manual tienen buena cobertura Node; monetización, nube, Edge Functions y E2E de producto están flojos o fuera de CI.
>
> **Relacionado:** `docs/BILLING.md`, `docs/EPIC_10_PARIDAD_SNOWIE.md`, `.github/workflows/static.yml`, `.github/workflows/e2e.yml`.

---

## 1. Resumen ejecutivo

| Capa | Estado hoy | Riesgo en producción |
|------|------------|----------------------|
| Motor GTO / scoring / EV | ✅ Fuerte (`selftest`, Poker76, play-EV, river, BB-vs-SB) | Bajo si se mantienen en CI |
| Import HH + HUD stats | ✅ Fuerte (`testimport`, VPIP/PFR) | Bajo–medio (formatos sala cambian) |
| Análisis manual | ✅ Bueno (`test-hand-analysis`) | Bajo |
| UX/guards estáticos (i18n, hotkeys, growth…) | ✅ Parcial en CI | Medio (falsos negativos: no ejecutan UI) |
| E2E Playwright | ⚠️ Humo mínimo (auth mock + 1 jugada + 1 import) | **Alto** en flujos de producto |
| Billing / paywall / Stripe Edge | ❌ Casi nada | **Crítico** (ingresos) |
| Cloud sync / Auth real | ❌ Casi nada | **Crítico** (pérdida de datos / login) |
| IA Coach Edge (`analyze-hand`) | ⚠️ Solo forma del payload | **Alto** |
| Admin / promos / cuenta | ❌ Nada | Medio |
| Scripts Node existentes fuera de CI | ⚠️ Varios listos pero no cableados | Medio (regresiones silenciosas) |

**Veredicto:** Para estabilidad post-lanzamiento, priorizar (1) meter en CI lo que ya existe, (2) E2E de flujos de negocio con auth mock, (3) tests de entitlements/paywall y contratos de Edge Functions, (4) ampliar E2E y contratos de datos (rangos vs-RFI/vs-3bet, replay, share).

---

## 2. Inventario actual

### 2.1 CI — Node (`.github/workflows/static.yml`)

| Script | Qué protege |
|--------|-------------|
| `tools/selftest.js` | Evaluador, rangos, equity, solver, scoring, sims |
| `tools/testimport.js` | PokerStars ES/EN, Winamax, GGPoker |
| `tools/test-p0-session-onboarding.js` | Sesión / onboarding |
| `tools/test-p1-retention.js` | Leaks, favorites, free AI=3, what-if |
| `tools/test-p2-expansion.js` | Live advisor, export, matriz postflop, i18n |
| `tools/test-ux-trainer-lang.js` | Chips advisor / i18n UI |
| `tools/test-vpip-pfr.js` | HUD stats en fixtures |
| `tools/validate-ranges-json.js` | Solo `rfi-6max-100bb.json` |
| `tools/regression-poker76.js` | EV vs referencia Excel |
| `tools/test-play-ev.js` | Alineación EV jugar vs import |
| `tools/test-ai-payload.js` | Shape payload IA, sin PII |
| `tools/test-river-trips.js` | Trips / board doblado |
| `tools/test-hand-analysis.js` | Editor análisis + forceDeal |
| `tools/test-gto-eval-ui.js` | Marcadores UI GTO + versión |
| `tools/test-bb-vs-sb-position.js` | BB vs SB IP/probe |
| `tools/test-card-picker-ux.js` | Card picker / drill / rangos |
| `tools/test-growth-ux.js` | Blog, gamificación, age gate |
| `tools/test-hotkeys-rake-help.js` | Hotkeys, rake, help |

### 2.2 CI — E2E (`.github/workflows/e2e.yml`)

| Spec | Qué protege |
|------|-------------|
| `e2e/auth.spec.js` | Con mock: gate oculto → shell home |
| `e2e/app.spec.js` | 1 decisión preflop; import Winamax fixture |

Auth real (Google/Supabase) **no** se prueba; se usa `PT_E2E_MODE` + `localStorage` (`e2e/helpers.js`).

### 2.3 Existen pero **no** están en CI

| Script | Valor |
|--------|-------|
| `tools/test-allin-runout.js` | All-in runout API/UI |
| `tools/test-river-board-ace-nut-flush.js` | Nut flush river |
| `tools/test-river-monotone-bet-range.js` | Monotone river equity |
| `tools/test-hand-score.js` | Nota 0–10 |
| `tools/test-share-hand.js` | HTML compartido (CTA/expiry) |
| `tools/test-landing-i18n.js` | Pricing keys landing |
| `tools/test-contact-pending-popup.js` | Modal mensaje pendiente |
| `tools/test-replay-hand.js` | Replay Winamax |
| `tools/check-hand-end-popup.js` | Browser: popup fin de mano |
| `tools/check-mobile-play-layout.js` | Browser: layout mobile |
| `tools/check-play-hud-layout.js` | Browser: HUD play |
| `tools/test-supabase.js` | Smoke REST+RLS (necesita credenciales) |
| `tools/sanity_check_solver.py` | Sanity solver (Python) |
| `tools/test-hand-77.js` | Diagnóstico puntual (bajo valor CI) |

### 2.4 Sin pruebas automatizadas relevantes

- Edge Functions Stripe: `stripe-checkout`, `stripe-portal`, `stripe-webhook`, `stripe-sync-*`
- Edge Functions producto: `analyze-hand`, `share-hand` (servidor)
- Cliente: `billing.js` checkout/portal UI, `cloud-store.js` / `cloud-sessions.js`, `auth.js` real, `admin-panel.js`, `admin-promotions.js`, `promo-redeem.js`, `account-settings.js`, `demo-mode.js`, `beginner-guide.js`, `pwa.js`, `analytics.js` / Sentry
- Datos: validación `vs-rfi` / `vs-3bet` JSON
- E2E pestañas: Histórico, Errores, Estadísticas, Rangos, Planes/paywall, Cuenta, Guía, Contacto, share page

---

## 3. Principios de regresión (cómo trabajar este backlog)

1. **CI es la red de seguridad.** Si un test no corre en GitHub Actions, no cuenta como regresión de producción.
2. **Mantener el estilo actual:** Node + `vm` + `assert` para motor/import/contratos; Playwright para flujos UI; guards de fuente solo cuando el comportamiento es “marcador/HTML estable”.
3. **Fixtures deterministicas** (`tools/fixtures/`) para HH y EV; seeds fijos en Monte Carlo.
4. **No bloquear CI con flakiness:** E2E con auth mock; tests de red/Stripe/Supabase live en job opcional o nightly con secrets.
5. **Contratos de Edge Functions** con handlers mockeados / Deno test — sin llamar a Stripe/Gemini reales en el job principal.
6. Toda tarea nueva debe: (a) script o spec, (b) entrada en `package.json` si aplica, (c) step en `static.yml` o `e2e.yml`.

Leyenda de esfuerzo relativo (sin calendario): **S** cambio local acotado · **M** varios archivos / nuevo patrón · **L** infraestructura o suite nueva · **XL** entorno + secrets + varios sistemas.

Prioridad: **P0** evita roturas de dinero/datos/flujo core · **P1** retención y confianza del producto · **P2** cobertura amplia / hygiene.

---

## 4. Backlog por pilares

### PILAR A — Cerrar la red CI existente (quick wins)

Meter en CI lo que ya protege lógica crítica y hoy se puede saltar en un merge.

| ID | Tarea | P | Esf. | Criterio de aceptación |
|----|-------|---|------|------------------------|
| RG-A01 | Añadir a `static.yml` (y scripts npm faltantes): `test-allin-runout`, `test-river-board-ace-nut-flush`, `test-river-monotone-bet-range`, `test-hand-score`, `test-share-hand`, `test-landing-i18n`, `test-contact-pending-popup`, `test-replay-hand` | P0 | S | Push a `main` ejecuta todos; fallan si se rompe el comportamiento cubierto |
| RG-A02 | Extender `validate-ranges-json.js` a **vs-RFI** y **vs-3bet** (mismas reglas de posiciones/combos mínimas) | P0 | S | CI falla si falta posición o combo set vacío en esos JSON |
| RG-A03 | Unificar comando `npm run test:ci` que ejecute la misma lista que `static.yml` (evitar drift local vs CI) | P0 | S | Un solo script documentado en README; CI lo invoca o documenta equivalencia |
| RG-A04 | Decidir destino de `check-*-layout.js` / `check-hand-end-popup.js`: migrar asserts estables a Playwright **o** job opcional; no dejar checks huérfanos | P1 | M | Layout/popup fin de mano tienen al menos 1 assert en E2E o job marcado |
| RG-A05 | Excluir o marcar como diagnóstico `test-hand-77.js` (no CI) | P2 | S | README/backlog deja claro que no es suite de regresión |

---

### PILAR B — E2E de flujos de producto (Playwright)

Ampliar humo hasta cubrir el recorrido que un usuario de pago usa cada día. Seguir con `mockAuthenticatedUser` salvo tareas explícitas de auth live.

| ID | Tarea | P | Esf. | Criterio de aceptación |
|----|-------|---|------|------------------------|
| RG-B01 | E2E **sesión de entrenamiento completa**: setup → ≥1 calle postflop o fold → popup score → entrada en Histórico | P0 | M | Spec verde en CI; falla si no aparece score o no persiste mano |
| RG-B02 | E2E **import multi-sala**: fixtures PS ES, PS EN, Winamax, GGPoker → status OK + al menos 1 mano listada | P0 | M | Un test parametrizado o 4 casos; timeout acotado |
| RG-B03 | E2E **replay / volver a jugar** desde sesión importada | P0 | M | Tras import, abrir mano → replay → al menos 1 decisión evaluada |
| RG-B04 | E2E **análisis manual**: crear spot → analizar → “entrenar con cartas fijas” llega al trainer | P0 | M | Flujo UI sin depender de red |
| RG-B05 | E2E **pestañas de estudio**: Histórico, Errores (con seed localStorage), Estadísticas, Rangos (matriz visible) | P1 | M | Cada pestaña renderiza contenido esperado tras seed |
| RG-B06 | E2E **Live Advisor / modo sesión / drill adaptativo** (toggles y que no rompan `#actions`) | P1 | M | Con advisor ON se puede completar una decisión; sin crash |
| RG-B07 | E2E **paywall free**: seed plan free → exceder manos/día o IA → UI de upgrade / bloqueo coherente con `docs/BILLING.md` | P0 | M | Sin Stripe real; mock `PTEntitlements` / perfil en storage |
| RG-B08 | E2E **Planes / cuenta**: tab Planes muestra límites; Cuenta muestra estado; demo mode si aplica | P1 | M | Selectores estables; i18n no muestra keys crudas |
| RG-B09 | E2E **share page** (`share.html`) + CTA; **contacto** modal pendiente | P2 | S | Páginas cargan y elementos clave visibles |
| RG-B10 | E2E **mobile viewport** (play layout + tabs) | P1 | M | Proyecto Playwright con proyecto `Mobile Chrome` o `viewport` fijo; 1–2 specs críticas |
| RG-B11 | E2E **i18n ES/EN** smoke: cambiar idioma, trainer y landing no muestran claves `pt.` / `i18n.` crudas | P1 | S | Extiende guards actuales con click real de idioma |
| RG-B12 | Suite E2E **smoke P0** etiquetada (`@smoke`) que corra en todo PR; resto nightly/main | P1 | M | `e2e.yml` en PR ejecuta smoke &lt; ~5–8 min |

---

### PILAR C — Monetización y entitlements (crítico negocio)

| ID | Tarea | P | Esf. | Criterio de aceptación |
|----|-------|---|------|------------------------|
| RG-C01 | Unit/vm **matriz de límites** free / pro / premium / admin / trialing (`entitlements.js`) | P0 | M | Tabla de casos: manos/día, imports/mes, AI/mes, histórico; asserts exactos vs `BILLING.md` |
| RG-C02 | Tests **usage counters**: incrementar, reset periodo, bloquear al techo, bono IA | P0 | M | Cubrir `canUse` / `consume` (o API equivalente) sin red |
| RG-C03 | Contrato **stripe-webhook**: eventos `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.paid` → mapeo plan/status (handler con Stripe stub) | P0 | L | Deno test o Node harness; no llama Stripe real |
| RG-C04 | Contrato **stripe-checkout / stripe-portal**: input válido → URL shape; input inválido → 4xx; trial solo Study una vez (reglas documentadas) | P0 | L | Mismos asserts de negocio que `BILLING.md` |
| RG-C05 | Contrato **stripe-sync-*** (subscription, payments, bonus, my-payments): respuestas y errores de auth | P1 | M | Tests de función con auth mock |
| RG-C06 | Regresión UI **billing.js**: botones checkout/portal presentes según plan; no leak de price IDs secretos en HTML | P1 | S | Guard fuente + E2E seed perfiles |
| RG-C07 | **Promo redeem** + admin promotions: código válido/inválido/expirado (lógica cliente + SQL/policies si hay helpers) | P1 | M | Casos tabla; sin Stripe live |
| RG-C08 | Job opcional `billing-live` (secrets) smoke checkout test-mode — solo `workflow_dispatch` / nightly | P2 | L | No bloquea PR; documentado en `BILLING.md` |

---

### PILAR D — Auth, nube y RLS

| ID | Tarea | P | Esf. | Criterio de aceptación |
|----|-------|---|------|------------------------|
| RG-D01 | Unit **cloud-store merge**: local vs remoto por timestamp/tipo; debounce; no duplicar manos | P0 | M | Fixtures de estado; asserts de merge |
| RG-D02 | Unit **cloud-sessions**: serialización sesión importada ida/vuelta sin pérdida de manos/stats clave | P0 | M | Round-trip JSON |
| RG-D03 | Ampliar `test-supabase.js` → job CI opcional con secrets anon: lectura pública OK, write anónima denegada (RLS) | P1 | M | `workflow_dispatch` o environment `supabase-smoke` |
| RG-D04 | Tests de políticas RLS (SQL o supabase test): usuario A no lee estado de B; admin sí donde corresponda | P0 | L | Migraciones + casos mínimos en CI con DB efímera **o** documentar job staging |
| RG-D05 | Contrato cliente **auth.js**: estados logged-out / session / signOut limpian storage sensible (sin OAuth real) | P1 | M | vm + stubs Supabase client |
| RG-D06 | Checklist manual / runbook **OAuth Google producción** (ya hay docs) + smoke post-deploy | P1 | S | Enlace desde este backlog a `GOOGLE_OAUTH_PRODUCTION.md`; paso en release |

---

### PILAR E — IA Coach y share

| ID | Tarea | P | Esf. | Criterio de aceptación |
|----|-------|---|------|------------------------|
| RG-E01 | Mantener/ampliar `test-ai-payload.js`: home + session + hand; **cero PII**; tamaños máximos | P0 | S | Casos adicionales si hay nuevos entrypoints |
| RG-E02 | Contrato **analyze-hand** Edge: auth ausente → 401; body inválido → 4xx; mock Gemini → 200 con shape estable | P0 | L | Deno test; sin API key real en CI PR |
| RG-E03 | Regresión **cuotas IA** cliente+mensaje UI al agotar (free=3, pro/premium techos) | P0 | M | Ligado a RG-C01/C02 + E2E B07 |
| RG-E04 | Contrato **share-hand** Edge: crea/serve payload; expiry; no botones interactivos de app en HTML | P1 | M | Complementa `test-share-hand.js` |
| RG-E05 | E2E abrir mano → generar bloque share (UI) con mock de función | P2 | M | No depende de red real |

---

### PILAR F — Motor GTO e import (profundizar lo fuerte)

| ID | Tarea | P | Esf. | Criterio de aceptación |
|----|-------|---|------|------------------------|
| RG-F01 | Suite **golden hands** EV: ampliar Poker76 + 5–10 manos nuevas (PS/Winamax/GG) con EV esperado acotado | P0 | M | Fallo si ΔEV sale de tolerancia |
| RG-F02 | Regresión **rake** on/off en scoring y play-EV | P1 | S | Asserts en `test-play-ev` o script dedicado en CI |
| RG-F03 | Casos **multiway / folds** en import y análisis (ya parcial en hand-analysis) — fixtures dedicados | P1 | M | GG/PS multiway en CI |
| RG-F04 | Integrar o portar asserts de `sanity_check_solver.py` a Node CI (evitar dependencia Python en Actions) | P2 | M | Mismo invariante “check-freq clone” en JS |
| RG-F05 | Cobertura spots **9-max / deep** si el código de producto los expone; si no, test que el UI no los ofrezca por error | P2 | S | Assert producto actual |
| RG-F06 | Property/fuzz ligero: 1k manos random seed fija no lanzan excepción en `evaluateSpot` / scoreHand | P1 | M | En `selftest` o script CI &lt; 30s |

---

### PILAR G — Admin, cuenta, growth, PWA

| ID | Tarea | P | Esf. | Criterio de aceptación |
|----|-------|---|------|------------------------|
| RG-G01 | Tests **admin-panel** (vm o E2E con flag admin): listado, no accesible a no-admin | P1 | M | Seed `is_admin`; UI oculto/403 lógico |
| RG-G02 | **account-settings**: persistencia preferencias (idioma, advisor, hotkeys) round-trip storage | P1 | S | |
| RG-G03 | **demo-mode / sample-session**: carga demo sin login o con mock; datos coherentes | P1 | S | |
| RG-G04 | **beginner-guide**: pasos renderizan; no bloquean trainer | P2 | S | |
| RG-G05 | **PWA**: `sw.js` / manifest presentes; offline.html servible (guard + opcional Playwright offline) | P2 | S | |
| RG-G06 | **age-gate + cookies + legal**: flujo first-visit (parcialmente en growth-ux) → E2E sin mock de consent | P1 | S | helpers con modo “fresh profile” |
| RG-G07 | Analytics/Sentry: guards de que en prod se cargan configs y en E2E no rompen app si stub | P2 | S | |

---

### PILAR H — Proceso y calidad de la suite

| ID | Tarea | P | Esf. | Criterio de aceptación |
|----|-------|---|------|------------------------|
| RG-H01 | Documentar en README la matriz: unit / import / E2E / opcional live y cómo ejecutarla | P0 | S | Sección Tests actualizada con enlace a este backlog |
| RG-H02 | Política **PR checks**: `static` + E2E smoke en todo PR a `main` (hoy E2E ya en PR; alinear static si solo corre en push main) | P0 | M | Ambos workflows en `pull_request` |
| RG-H03 | Plantilla de “cómo añadir regresión” (orden de scripts vm, fixture, step CI) en este doc o `tools/README` | P1 | S | |
| RG-H04 | Etiquetar flaky: reintentos Playwright solo donde haga falta; prohibir `waitForTimeout` fijos nuevos | P1 | S | Convención en helpers |
| RG-H05 | Informe de cobertura **por módulo** (checklist trimestral, no % líneas vacío): marcar IDs RG hechos | P2 | S | Tabla §5 actualizada |
| RG-H06 | Release checklist: correr `test:ci` + smoke E2E + runbook OAuth/billing antes de cambios de secrets | P1 | S | |

---

## 5. Orden de ataque recomendado

### Fase 1 — Blindaje inmediato (P0 de bajo coste)

1. RG-A01, RG-A02, RG-A03 — CI completa con tests ya escritos  
2. RG-H01, RG-H02 — proceso: docs + PR checks  
3. RG-C01, RG-C02 — entitlements sin red  
4. RG-B01, RG-B02, RG-B07 — E2E core + paywall  

### Fase 2 — Dinero y datos

5. RG-C03, RG-C04 — contratos Stripe Edge  
6. RG-D01, RG-D02, RG-D04 — sync + RLS  
7. RG-E02, RG-E03 — analyze-hand + cuotas IA  
8. RG-B03, RG-B04 — replay + análisis manual E2E  

### Fase 3 — Producto completo

9. RG-B05–B06, RG-B10–B12 — resto E2E / mobile / smoke tags  
10. RG-F01, RG-F06 — golden hands + fuzz  
11. RG-G01–G03, RG-C07 — admin, cuenta, promos  
12. RG-C08, RG-D03, RG-D06 — smokes live opcionales y runbooks  

---

## 6. Mapa módulo → cobertura (checklist vivo)

| Módulo | Hoy | Meta | IDs |
|--------|-----|------|-----|
| Engine / ranges / EV | CI fuerte | + golden + fuzz + vs-RFI/3bet | A02, F01–F06 |
| Import + HUD | CI fuerte | + multi-sala E2E + multiway | B02, F03 |
| Hand analysis | CI Node | + E2E UI | B04 |
| Trainer / play UI | E2E humo | Sesión completa + advisor + mobile | B01, B06, B10 |
| Histórico / Errores / Stats | Indirecto | E2E con seed | B05 |
| Rangos UI | Guards | E2E matriz | B05, A02 |
| Entitlements / paywall | Parcial P1 | Matriz + E2E free | C01–C02, B07 |
| Stripe Edge | ❌ | Contratos + opcional live | C03–C08 |
| Auth | Mock E2E | Stubs cliente + runbook | D05–D06 |
| Cloud sync | ❌ | Merge + sessions + RLS | D01–D04 |
| IA Coach | Payload | Edge contrato + cuotas | E01–E03 |
| Share | HTML local | Edge + E2E | E04–E05, A01 |
| Admin / promos | ❌ | Acceso + redeem | G01, C07 |
| Growth / PWA / legal | Guards parciales | E2E fresh + PWA | G04–G07, A01 |
| Contact | Fuera CI | CI + E2E | A01, B09 |

---

## 7. Fuera de alcance (consciente)

- Clonar cobertura de trackers comerciales o solvers propietarios.  
- E2E OAuth Google real en cada PR (frágil; sustituir por stubs + smoke post-deploy).  
- Llamadas Stripe/Gemini de pago en CI de PR.  
- Refactor a Jest/Vitest solo por moda: solo si un pilar (C/D/E) lo exige; default = Node scripts + Playwright.

---

## 8. Definición de “hecho” para el backlog

Se considera la app **razonablemente blindada** cuando:

1. Todo script de regresión útil corre en CI en cada PR.  
2. Un PR que rompa entrenar / importar / paywall free / merge cloud / webhook→plan **falla CI en rojo**.  
3. Edge Functions de Stripe e IA tienen tests de contrato sin red externa.  
4. Existe smoke E2E &lt; ~8 min + suite ampliada en `main`.  
5. Este documento refleja IDs ✅ hechos en la tabla del §6.

---

*Primera versión: agosto 2026 — inventario post-producción para estabilizar cambios futuros.*
