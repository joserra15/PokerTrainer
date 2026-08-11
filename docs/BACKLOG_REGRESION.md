# Backlog — Pruebas de regresión (producción)

> Objetivo: que **ningún cambio futuro rompa** flujos críticos de PokerForgeAI en producción. Inventario del estado actual, huecos, y backlog **repartido en fases**.
>
> **Contexto:** La app ya está en producción (entrenador GTO + import de sesiones + billing Stripe + Supabase + ForgeCoach). El motor, importador y análisis manual tienen buena cobertura Node; monetización, nube, Edge Functions y E2E de producto están flojos o fuera de CI.
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
| ForgeCoach Edge (`analyze-hand`) | ⚠️ Solo forma del payload | **Alto** |
| Admin / promos / cuenta | ❌ Nada | Medio |
| Scripts Node existentes fuera de CI | ⚠️ Varios listos pero no cableados | Medio (regresiones silenciosas) |

**Veredicto:** Blindar en 4 fases: (1) CI + paywall + E2E core, (2) dinero/datos/IA Edge, (3) producto completo en E2E + profundidad motor, (4) hygiene y smokes live opcionales.

### Mapa de fases

| Fase | Nombre | Meta de salida | # tareas |
|------|--------|----------------|----------|
| **1** | Blindaje inmediato | Todo test útil ya escrito corre en cada PR; paywall y flujos core E2E en rojo si se rompen | 12 ✅ |
| **2** | Dinero, datos e IA | Webhook/checkout, merge cloud/RLS y `analyze-hand` con contratos sin red externa | 11 ✅ |
| **3** | Producto completo | E2E de estudio/cuenta/mobile, admin/promos, golden hands, proceso de suite | 22 ✅ |
| **4** | Hygiene y live opcional | PWA/growth restantes, jobs nightly con secrets, checklist cobertura | 12 ✅ |
| | | **Total** | **57** |

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

## 3. Principios de regresión

1. **CI es la red de seguridad.** Si un test no corre en GitHub Actions, no cuenta como regresión de producción.
2. **Mantener el estilo actual:** Node + `vm` + `assert` para motor/import/contratos; Playwright para flujos UI; guards de fuente solo cuando el comportamiento es “marcador/HTML estable”.
3. **Fixtures deterministicas** (`tools/fixtures/`) para HH y EV; seeds fijos en Monte Carlo.
4. **No bloquear CI con flakiness:** E2E con auth mock; tests de red/Stripe/Supabase live en job opcional o nightly con secrets.
5. **Contratos de Edge Functions** con handlers mockeados / Deno test — sin llamar a Stripe/Gemini reales en el job principal.
6. Toda tarea nueva debe: (a) script o spec, (b) entrada en `package.json` si aplica, (c) step en `static.yml` o `e2e.yml`.
7. **No saltar de fase** si los criterios de salida de la anterior no están en verde (salvo excepciones puntuales documentadas).

Leyenda: **S** cambio local acotado · **M** varios archivos / nuevo patrón · **L** infraestructura o suite nueva · **XL** entorno + secrets + varios sistemas.

Prioridad: **P0** dinero/datos/flujo core · **P1** retención y confianza · **P2** hygiene / nice-to-have.

Pilar (trazabilidad): **A** CI existente · **B** E2E · **C** billing · **D** auth/nube · **E** IA/share · **F** motor/import · **G** admin/growth · **H** proceso.

---

## 4. Backlog por fases

### Fase 1 — Blindaje inmediato ✅

**Estado:** implementada (`npm run test:ci` + E2E Playwright en PR).

**Meta:** cerrar agujeros baratos; cada PR ejecuta la red Node completa; E2E cubre entrenar / importar / paywall free; entitlements alineados con `BILLING.md`.

**Criterio de salida:** `static` + E2E smoke en todo PR; un cambio que rompa límites free, import multi-sala o score de mano falla CI.

| ID | Pilar | Tarea | P | Esf. | Criterio de aceptación |
|----|-------|-------|---|------|------------------------|
| RG-A01 | A | Meter en `static.yml` (+ npm scripts): `test-allin-runout`, `test-river-board-ace-nut-flush`, `test-river-monotone-bet-range`, `test-hand-score`, `test-share-hand`, `test-landing-i18n`, `test-contact-pending-popup`, `test-replay-hand` | P0 | S | CI ejecuta todos; fallan si se rompe lo cubierto |
| RG-A02 | A | Extender `validate-ranges-json.js` a **vs-RFI** y **vs-3bet** | P0 | S | CI falla si falta posición o combo set vacío |
| RG-A03 | A | Unificar `npm run test:ci` = misma lista que `static.yml` | P0 | S | Un comando local documentado; sin drift CI↔local |
| RG-H01 | H | Documentar matriz unit / import / E2E / live en README | P0 | S | Sección Tests + enlace a este backlog |
| RG-H02 | H | PR checks: `static` + E2E smoke en todo PR a `main` | P0 | M | Ambos workflows en `pull_request` |
| RG-C01 | C | Unit/vm **matriz de límites** free / pro / premium / admin / trialing | P0 | M | Asserts exactos vs `BILLING.md` |
| RG-C02 | C | Tests **usage counters**: incrementar, reset, techo, bono IA | P0 | M | `canUse` / `consume` (o equiv.) sin red |
| RG-E01 | E | Ampliar `test-ai-payload.js`: home + session + hand; cero PII; tamaños máx. | P0 | S | Casos por entrypoint en CI |
| RG-B01 | B | E2E **entrenamiento completo**: setup → decisión → score → Histórico | P0 | M | Spec CI; falla sin score o sin persistencia |
| RG-B02 | B | E2E **import multi-sala**: PS ES, PS EN, Winamax, GGPoker | P0 | M | Parametrizado; ≥1 mano listada; timeout acotado |
| RG-B07 | B | E2E **paywall free**: seed free → techo manos/IA → upgrade/bloqueo | P0 | M | Mock entitlements; coherente con `BILLING.md` |
| RG-E03 | E | Regresión **cuotas IA** UI al agotar (free=3, techos pro/premium) | P0 | M | Ligado a C01/C02 + E2E B07 |

**Orden sugerido dentro de la fase:** A01 → A02 → A03 → H01 → H02 → C01 → C02 → E01 → B01 → B02 → B07 → E03.

---

### Fase 2 — Dinero, datos e IA ✅

**Estado:** implementada (contratos Edge en Node, cloud merge/sessions, RLS SQL, golden hands, E2E replay/análisis).

**Meta:** contratos de Stripe e IA sin red externa; sync cloud y RLS protegen pérdida/fuga de datos; E2E de replay y análisis manual.

**Criterio de salida:** un PR que rompa mapeo webhook→plan, merge cloud o auth de `analyze-hand` falla CI; replay y análisis manual tienen E2E verde.

| ID | Pilar | Tarea | P | Esf. | Criterio de aceptación |
|----|-------|-------|---|------|------------------------|
| RG-C03 | C | Contrato **stripe-webhook** (checkout completed, sub updated/deleted, invoice.paid) con Stripe stub | P0 | L | Deno/Node harness; sin Stripe real |
| RG-C04 | C | Contrato **stripe-checkout / stripe-portal**: URL shape, 4xx, trial Study una vez | P0 | L | Reglas = `BILLING.md` |
| RG-D01 | D | Unit **cloud-store merge**: timestamps, debounce, sin duplicar manos | P0 | M | Fixtures de estado + asserts |
| RG-D02 | D | Unit **cloud-sessions**: round-trip sesión importada sin perder manos/stats | P0 | M | JSON ida/vuelta |
| RG-D04 | D | Políticas **RLS**: usuario A no lee a B; admin donde corresponda | P0 | L | DB efímera en CI **o** job staging documentado |
| RG-E02 | E | Contrato **analyze-hand**: 401 sin auth, 4xx body inválido, 200 con Gemini mock | P0 | L | Deno test; sin API key en PR |
| RG-B03 | B | E2E **replay / volver a jugar** desde sesión importada | P0 | M | ≥1 decisión evaluada en replay |
| RG-B04 | B | E2E **análisis manual** → entrenar con cartas fijas | P0 | M | Sin red; llega al trainer |
| RG-F01 | F | Suite **golden hands** EV: Poker76 + 5–10 manos nuevas (PS/Winamax/GG) | P0 | M | Fallo si ΔEV fuera de tolerancia |
| RG-C06 | C | Regresión UI **billing.js**: botones según plan; sin price IDs secretos en HTML | P1 | S | Guard fuente + E2E perfiles |
| RG-D05 | D | Contrato cliente **auth.js**: logged-out / session / signOut limpia storage (stubs) | P1 | M | vm + stub Supabase; sin OAuth real |

**Orden sugerido:** C03 → C04 → D01 → D02 → E02 → B03 → B04 → F01 → D04 → C06 → D05.

---

### Fase 3 — Producto completo ✅

**Estado:** implementada (`@smoke` en PR, E2E estudio/advisor/planes/móvil/i18n/age-gate, contratos sync/promo/share, rake/multiway/fuzz, admin/cuenta/demo, release docs).

**Meta:** el resto del producto usable día a día tiene E2E o unit; admin/promos/cuenta cubiertos; suite E2E organizada (smoke vs full); motor profundizado (rake, multiway, fuzz).

**Criterio de salida:** smoke E2E etiquetado en PR (&lt; ~5–8 min); suite ampliada en `main`; pestañas de estudio, advisor, mobile y cuenta en verde; admin no accesible a no-admin.

| ID | Pilar | Tarea | P | Esf. | Criterio de aceptación |
|----|-------|-------|---|------|------------------------|
| RG-B12 | B | Suite E2E **`@smoke`** en todo PR; resto en nightly/`main` | P1 | M | PR &lt; ~5–8 min |
| RG-B05 | B | E2E pestañas **Histórico / Errores / Estadísticas / Rangos** (seed storage) | P1 | M | Contenido esperado visible |
| RG-B06 | B | E2E **Live Advisor / modo sesión / drill** no rompen `#actions` | P1 | M | Decisión completa con advisor ON |
| RG-B08 | B | E2E **Planes / Cuenta** (+ demo mode si aplica) | P1 | M | Límites visibles; sin keys i18n crudas |
| RG-B10 | B | E2E **mobile viewport** (play + tabs) | P1 | M | Proyecto Mobile Chrome o viewport fijo |
| RG-B11 | B | E2E **i18n ES/EN** smoke con cambio real de idioma | P1 | S | Sin claves `pt.` / `i18n.` crudas |
| RG-A04 | A | Migrar `check-*-layout` / `check-hand-end-popup` a Playwright **o** job opcional | P1 | M | Sin checks huérfanos |
| RG-C05 | C | Contrato **stripe-sync-*** (subscription, payments, bonus, my-payments) | P1 | M | Auth mock; respuestas/errores |
| RG-C07 | C | **Promo redeem** + admin promotions: válido / inválido / expirado | P1 | M | Casos tabla; sin Stripe live |
| RG-E04 | E | Contrato **share-hand** Edge: payload, expiry, HTML sin botones de app | P1 | M | Complementa `test-share-hand.js` |
| RG-F02 | F | Regresión **rake** on/off en scoring y play-EV | P1 | S | Script en CI |
| RG-F03 | F | Fixtures **multiway / folds** import + análisis | P1 | M | GG/PS multiway en CI |
| RG-F06 | F | Fuzz 1k manos seed fija: sin excepciones en `evaluateSpot` / `scoreHand` | P1 | M | CI &lt; 30s |
| RG-G01 | G | Tests **admin-panel**: listado; no accesible a no-admin | P1 | M | Seed `is_admin` |
| RG-G02 | G | **account-settings**: preferencias round-trip storage | P1 | S | idioma / advisor / hotkeys |
| RG-G03 | G | **demo-mode / sample-session**: carga coherente | P1 | S | Con mock o sin login según producto |
| RG-G06 | G | E2E **age-gate + cookies + legal** (perfil fresco, sin mock consent) | P1 | S | Helper “fresh profile” |
| RG-D06 | D | Runbook release: OAuth Google prod + smoke post-deploy | P1 | S | Enlace a `GOOGLE_OAUTH_PRODUCTION.md` |
| RG-H03 | H | Plantilla “cómo añadir regresión” (vm order, fixture, step CI) | P1 | S | En este doc o `tools/README` |
| RG-H04 | H | Convención anti-flaky Playwright (reintentos acotados; no `waitForTimeout` nuevos) | P1 | S | Documentado en helpers |
| RG-H06 | H | Release checklist: `test:ci` + smoke E2E + runbooks OAuth/billing | P1 | S | Lista en docs o issue template |

**Orden sugerido:** B12 → B05 → B06 → B08 → B10 → B11 → A04 → F02 → F03 → F06 → C05 → C07 → E04 → G01 → G02 → G03 → G06 → D06 → H03 → H04 → H06.

---

### Fase 4 — Hygiene y smokes live opcionales ✅

**Estado:** implementada (PWA/guide/analytics guards, share/contact E2E, solver sanity JS, variants, workflows `supabase-smoke` + `billing-live`).

**Meta:** cobertura periférica (PWA, guide, share UI, contact); jobs con secrets que no bloquean PR; mantenimiento del mapa de cobertura.

**Criterio de salida:** jobs `workflow_dispatch`/nightly documentados; P2 cerrados o explícitamente aplazados; tabla §6 actualizada con ✅.

| ID | Pilar | Tarea | P | Esf. | Criterio de aceptación |
|----|-------|-------|---|------|------------------------|
| RG-A05 | A | Marcar `test-hand-77.js` como diagnóstico (no CI) | P2 | S | README/backlog lo dejan claro |
| RG-B09 | B | E2E **share.html** + CTA; **contacto** modal pendiente | P2 | S | Elementos clave visibles |
| RG-C08 | C | Job opcional `billing-live` (Stripe test-mode) — solo dispatch/nightly | P2 | L | No bloquea PR; doc en `BILLING.md` |
| RG-D03 | D | Job CI opcional `test-supabase.js` con secrets anon (read OK / write deny) | P1 | M | `workflow_dispatch` o env `supabase-smoke` |
| RG-E05 | E | E2E share desde mano con mock de Edge Function | P2 | M | Sin red real |
| RG-F04 | F | Portar `sanity_check_solver.py` a Node CI | P2 | M | Mismo invariante en JS |
| RG-F05 | F | Assert 9-max/deep: cubiertos si existen, o UI no los ofrece por error | P2 | S | Refleja producto actual |
| RG-G04 | G | **beginner-guide**: pasos renderizan; no bloquean trainer | P2 | S | |
| RG-G05 | G | **PWA**: `sw.js` / manifest / `offline.html` | P2 | S | Guard (+ offline Playwright opcional) |
| RG-G07 | G | Analytics/Sentry: configs prod; E2E no rompe con stub | P2 | S | |
| RG-H05 | H | Checklist cobertura por módulo (trimestral); marcar IDs hechos en §6 | P2 | S | Tabla viva |
| RG-D03† | D | *(si no se hizo en F3)* completar smoke Supabase opcional | — | — | Ver RG-D03 arriba |

† RG-D03 es P1 pero depende de secrets: se planifica en Fase 4 para no bloquear Fases 1–3. Puede adelantarse cuando existan secrets de CI.

**Orden sugerido:** A05 → B09 → G04 → G05 → G07 → F04 → F05 → E05 → D03 → C08 → H05.

---

## 5. Índice por pilar (todas las tareas → fase)

| Pilar | Tema | IDs → fase |
|-------|------|------------|
| **A** CI existente | A01–A03 → **F1** · A04 → **F3** · A05 → **F4** |
| **B** E2E producto | B01, B02, B07 → **F1** · B03, B04 → **F2** · B05, B06, B08, B10–B12 → **F3** · B09 → **F4** |
| **C** Monetización | C01, C02 → **F1** · C03, C04, C06 → **F2** · C05, C07 → **F3** · C08 → **F4** |
| **D** Auth / nube | D01, D02, D04, D05 → **F2** · D06 → **F3** · D03 → **F4** |
| **E** IA / share | E01, E03 → **F1** · E02 → **F2** · E04 → **F3** · E05 → **F4** |
| **F** Motor / import | F01 → **F2** · F02, F03, F06 → **F3** · F04, F05 → **F4** |
| **G** Admin / growth | G01–G03, G06 → **F3** · G04, G05, G07 → **F4** |
| **H** Proceso | H01, H02 → **F1** · H03, H04, H06 → **F3** · H05 → **F4** |

---

## 6. Mapa módulo → cobertura (checklist vivo)

Marcar ✅ en “Meta” / IDs al cerrar cada fase.

| Módulo | Hoy | Meta | IDs | Fase |
|--------|-----|------|-----|------|
| Engine / ranges / EV | ✅ | golden + fuzz + vs-RFI/3bet + sanity | A02, F01–F06 | 1–4 ✅ |
| Import + HUD | ✅ | multi-sala E2E + multiway | B02, F03 | 1, 3 ✅ |
| Hand analysis | ✅ | E2E UI | B04 | 2 ✅ |
| Trainer / play UI | ✅ | sesión + advisor + mobile | B01, B06, B10, A04 | 1, 3 ✅ |
| Histórico / Errores / Stats | ✅ | E2E con seed | B05 | 3 ✅ |
| Rangos UI | ✅ | E2E matriz | B05, A02 | 1, 3 ✅ |
| Entitlements / paywall | ✅ | Matriz + E2E free | C01–C02, B07, E03 | 1 ✅ |
| Stripe Edge | ✅ | Contratos + job live opcional | C03–C08 | 2–4 ✅ |
| Auth | ✅ | Stubs + runbook release | D05–D06 | 2, 3 ✅ |
| Cloud sync | ✅ | Merge + sessions + RLS + smoke opcional | D01–D04 | 2, 4 ✅ |
| ForgeCoach | ✅ | Edge + cuotas | E01–E03 | 1, 2 ✅ |
| Share | ✅ | Edge + E2E + mock | A01, E04–E05, B09 | 1, 3, 4 ✅ |
| Admin / promos | ✅ | Acceso + redeem | G01, C07 | 3 ✅ |
| Growth / PWA / legal | ✅ | E2E fresh + PWA + guide | G04–G07 | 3, 4 ✅ |
| Contact | ✅ | CI + E2E | A01, B09 | 1, 4 ✅ |
| Proceso CI/PR | ✅ | static+smoke en PR; release checklist | H01–H06, B12 | 1, 3, 4 ✅ |

---

## 7. Fuera de alcance (consciente)

- Clonar cobertura de trackers comerciales o solvers propietarios.  
- E2E OAuth Google real en cada PR (frágil; stubs + smoke post-deploy).  
- Llamadas Stripe/Gemini de pago en CI de PR.  
- Refactor a Jest/Vitest solo por moda: default = Node scripts + Playwright.

---

## 8. Definición de “hecho” global

La app está **razonablemente blindada** cuando las 4 fases cumplen su criterio de salida:

1. **Fase 1:** scripts útiles en CI de cada PR; paywall + entrenar + import E2E en rojo si fallan.  
2. **Fase 2:** contratos Stripe/IA + merge cloud/RLS + replay/análisis E2E.  
3. **Fase 3:** smoke E2E rápido en PR; estudio/cuenta/admin/motor profundo cubiertos.  
4. **Fase 4:** hygiene + jobs live opcionales documentados; §6 al día.

---

*Versión: agosto 2026 — 4 fases implementadas (57 tareas). Verificación: `npm run test:ci` + `SMOKE=1 npx playwright test`.*
