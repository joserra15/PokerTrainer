# Estudio de mercado — PokerTrainer

> Documento de referencia para llevar PokerTrainer a mercado.  
> Versión del producto analizada: **v1.19.14** (junio 2026).  
> Repositorio: [joserra15/PokerTrainer](https://github.com/joserra15/PokerTrainer)

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Estado actual del producto](#2-estado-actual-del-producto)
3. [Posicionamiento competitivo](#3-posicionamiento-competitivo)
4. [Gaps para lanzamiento comercial](#4-gaps-para-lanzamiento-comercial)
5. [Estrategia de pricing](#5-estrategia-de-pricing)
6. [Métricas y unit economics](#6-métricas-y-unit-economics)
7. [Roadmap por fases](#7-roadmap-por-fases)
8. [Riesgos](#8-riesgos)
9. [Backlog detallado](#9-backlog-detallado)
10. [Issues en GitHub](#10-issues-en-github)

---

## 1. Resumen ejecutivo

**PokerTrainer** es una aplicación web de estudio de poker NLHE (JavaScript puro, sin build) desplegada en GitHub Pages. Combina entrenador GTO interactivo, importación de sesiones PokerStars (español), repaso de manos con evaluación por decisión, sincronización en nube (Supabase) e IA Coach (Gemini vía Edge Function).

### Veredicto

| Dimensión | Valoración |
|-----------|------------|
| Profundidad de producto (features) | **Fuerte** para proyecto individual/pequeño equipo |
| Calidad técnica del motor | **Buena** — CI con regresión EV |
| Seguridad / producción | **Débil** — RLS abierta, tokens en cliente, OAuth en prueba |
| Go-to-market | **Temprano** — sin legal, monetización, analytics ni landing |
| Monetización | **No iniciada** |

**Conclusión:** El producto tiene valor real para el jugador recreativo-serio hispanohablante, pero **no está listo para mercado abierto** sin cerrar legal, auth/RLS, monetización y GTM básico.

**Posicionamiento recomendado:** no competir con solvers premium (GTO Wizard). Ser el **compañero de estudio GTO asequible**: entrenamiento + repaso de sesiones reales + coach IA.

**Pricing recomendado:** freemium + **Study ~€15/mes** + **Coach ~€35/mes**, con IA como palanca de upsell.

---

## 2. Estado actual del producto

### 2.1 Funcionalidades implementadas

| Área | Descripción | Archivos clave |
|------|-------------|----------------|
| Entrenador GTO | Spots preflop (RFI, vs open, 3bet…) y postflop con villanos modelados, Monte Carlo, EV | `js/engine.js`, `js/engine/**` |
| Modos de juego | Cash 6-max, 9-max, MTT (configuración) | `js/play-config.js`, `index.html` |
| Explorador de rangos | Matrices 13×13 preflop | `js/range-matrix.js`, `js/ranges.js` |
| Import sesiones | PokerStars `.txt` ES Cash NL; análisis por decisión; nota de sesión | `js/import.js` |
| Repaso de manos | Paso a paso, rejugar decisiones, matriz villano narrativa | `js/app.js`, `js/engine/ranges/villainTracking.js` |
| Historial / errores / stats | localStorage, export JSON, drill de errores | `js/storage.js` |
| IA Coach | Informes mano/sesión, caché local, consentimiento | `js/ai-report.js`, `supabase/functions/analyze-hand/` |
| Auth | Google OAuth (GIS); datos por `sub` | `js/auth-bootstrap.js`, `js/google-config.js` |
| Sync nube | Supabase `pt_user_state`; merge al login | `js/cloud-store.js`, `supabase/schema.sql` |
| CI/CD | Tests + deploy GitHub Pages | `.github/workflows/static.yml` |

### 2.2 Stack técnico

| Capa | Tecnología |
|------|------------|
| Frontend | Vanilla JS, SPA (`index.html`), CSS responsive |
| Dependencias runtime | CDN: `@supabase/supabase-js`, Google Identity Services |
| Backend | Supabase Postgres + Edge Functions (Deno) |
| IA | Google Gemini 2.5 Flash |
| Deploy | GitHub Pages en push a `main` |
| Tests | Node (`tools/selftest.js`, regresión Poker76, etc.) |

No hay `package.json` ni bundler; las herramientas Node son solo para desarrollo/CI.

### 2.3 Lo que NO existe hoy

- Stripe / suscripciones / paywall
- Política de privacidad, términos, cookies
- Analytics (GA, PostHog, Plausible)
- Error monitoring (Sentry)
- PWA (`manifest.json`, service worker)
- Landing marketing separada
- Onboarding guiado
- Import multi-sala (GG, Winamax, PS inglés)
- Supabase Auth con RLS por usuario (solo política dev abierta)
- Admin panel / soporte formal

---

## 3. Posicionamiento competitivo

### 3.1 Categoría

Híbrido entre:

1. **GTO decision trainer** (GTO Wizard Trainer, Upswing drills)
2. **Hand-history reviewer** con scoring heurístico GTO
3. **AI coaching layer** (informes cualitativos sobre manos/sesiones)

### 3.2 Diferenciadores de PokerTrainer

- Todo-en-uno en app estática sin instalación
- **Español nativo** + import PokerStars ES
- Local-first con sync opcional
- Precio potencial muy inferior a incumbentes
- Matriz villano adaptada a línea y board (no solo GTO estático)

### 3.3 Competidores de referencia (2026)

| Producto | Precio orientativo | Fortaleza | Debilidad vs. nosotros |
|----------|-------------------|-----------|------------------------|
| GTO Wizard | $39–279/mes | Solver completo, biblioteca masiva | Caro; no import PS ES nativo |
| GTO Coach | $20–80/mes | CFR+ solver, arena ELO | Menos foco en sesiones reales ES |
| PeakGTO | $59/mes (anual) | Barato para MTT NLHE | Sin import sesiones PS ES |
| PioSolver | €450 one-time | Gold standard solver | Desktop, curva alta, sin trainer integrado |

### 3.4 Limitaciones honestas

- Rangos/heurísticas **aproximadas**, no árbol solver completo
- Un solo formato de import (PokerStars ES Cash NL)
- Sin estadísticas de población ni HUD
- MTT/ICM superficial en UI vs. promesa parcial

---

## 4. Gaps para lanzamiento comercial

### 4.1 Bloqueantes P0 — Legal y confianza

| ID | Gap |
|----|-----|
| L-01 | Política de Privacidad (RGPD) |
| L-02 | Términos de Uso |
| L-03 | Banner cookies / consentimiento |
| L-04 | Página transparencia IA |
| L-05 | Exportación de datos (derecho de portabilidad) |
| L-06 | Eliminación de cuenta y datos en nube |
| L-07 | Registro de subprocesadores |
| L-08 | Revisión legal externa (recomendado) |
| — | Google OAuth en **producción** (salir de modo Prueba) |
| — | Dominio propio (credibilidad + OAuth) |

### 4.2 Bloqueantes P0 — Seguridad técnica

| ID | Gap |
|----|-----|
| S-01 | Supabase Auth con Google |
| S-02 | RLS `user_id = auth.uid()` — eliminar `anon_read_write_dev` |
| S-03 | Rotar secrets; configs sensibles fuera del repo |
| S-04 | Token IA solo en servidor |
| S-05 | Rate limiting en Edge Function |
| S-06 | Validar JWT en `analyze-hand` |
| S-07 | Auditar datos sensibles en repo (`sesiones/*.txt`) |
| S-08 | CSP y hardening básico |

Estado actual de RLS (desarrollo):

```sql
-- supabase/schema.sql — NO válido para producción
create policy "anon_read_write_dev" on public.pt_user_state
for all to anon using (true) with check (true);
```

### 4.3 MVP comercial P1

| ID | Gap |
|----|-----|
| M-01–M-08 | Billing (Stripe/Lemon Squeezy), entitlements, paywall |
| G-01–G-08 | Landing, onboarding, analytics, soporte |
| P-01 | Límites free tier implementados |

### 4.4 Crecimiento P2 / Moat P3

- PWA, dashboard progreso, más imports, SEO, referidos
- Rangos JSON de solver, MTT/ICM, B2B escuelas, i18n EN

---

## 5. Estrategia de pricing

### 5.1 Principios

1. **Freemium permanente** — estándar del sector poker training
2. **IA = coste variable** — cupos por plan o add-ons
3. **No competir en precio con solver premium** — competir en valor/€ para jugador medio
4. **Anual ~20% dto** — mejora cash flow y reduce churn
5. **Dos planes al lanzar** (opción simple) o tres (opción completa)

### 5.2 Propuesta de planes (recomendada)

| Plan | Precio | Público | Incluye |
|------|--------|---------|---------|
| **Free** | €0 | Curiosos, micro | 15 manos entrenador/día · 1 sesión import/mes (máx. 200 manos) · sync local · sin IA · histórico 30 días |
| **Study** | **€14,99/mes** o **€119/año** | Reg NL10–NL100 | Entrenador ilimitado · import ilimitado · sync · stats · matriz villano · repaso |
| **Coach** | **€34,99/mes** o **€279/año** | Feedback IA | Todo Study + **30 informes IA/mes** |
| **Coach Pro** | **€59,99/mes** o **€479/año** | Grinders | IA ilimitada* · export avanzado · spots custom (futuro) |

\*Fair use ~200 informes/mes.

**Add-on:** +20 informes IA por **€4,99**.

### 5.3 Alternativa MVP (más simple)

| Plan | Precio |
|------|--------|
| Free | Límites duros |
| **Pro** | **€19,99/mes** — todo excepto IA ilimitada (10 informes/mes) |

Menos fricción de decisión al lanzar.

### 5.4 Comparativa de mercado

| Referencia | Precio | Posición PokerTrainer |
|------------|--------|----------------------|
| GTO Wizard Starter | ~$39–49/mes | 3–4× más caro; más profundidad |
| GTO Coach Pro | ~$40/mes | Coach alineado en precio |
| PeakGTO anual | ~$59/mes | Study más barato |
| Herramientas ligeras | ~$17/mes | Study en rango impulso |

### 5.5 Qué monetizar vs. qué regalar

| Gratis (adquisición) | De pago (retención + margen) |
|----------------------|------------------------------|
| N manos entrenador/día | Entrenador ilimitado |
| 1 sesión import/mes | Import ilimitado |
| Stats básicas | Dashboard progreso / leaks |
| Repaso limitado | Matriz villano completa |
| — | Informes IA Coach |
| — | Sync multi-dispositivo prioritario |

---

## 6. Métricas y unit economics

### 6.1 Objetivos 12 meses (conservador)

| Métrica | Objetivo |
|---------|----------|
| Free → paid | 3–5% |
| Mix pagos | 70% Study / 30% Coach |
| Churn mensual | <8% Study, <6% Coach |
| CAC | <€40 (SEO + comunidad) |
| LTV Study (6 meses) | ~€90 |
| LTV Coach (8 meses) | ~€280 |

### 6.2 Costes operativos estimados (~500 MAU)

| Concepto | €/mes |
|----------|-------|
| Supabase Pro | ~€25 |
| Gemini (100 Coach × 30 informes) | €30–80 |
| Dominio + email | ~€15 |
| Stripe (~3% + €0,25) | Variable |
| Sentry / Plausible | €0–30 |

### 6.3 Punto de equilibrio

Ejemplo: 50 Study (€15) + 15 Coach (€35) ≈ **€1.275 MRR**.  
Equilibrio operativo aproximado: **30–40 suscriptores de pago**.

---

## 7. Roadmap por fases

| Fase | Duración | Objetivo | Criterio de listo |
|------|----------|----------|-------------------|
| **0 — Fundamentos** | 4–6 sem | Lanzar sin riesgo legal/técnico | OAuth prod, RLS, legal publicado, secrets rotados |
| **1 — MVP de pago** | 6–8 sem | Primeros ingresos | Checkout, 2 planes, 10 beta users pagando |
| **2 — Retención** | 8–12 sem | Reducir churn | Onboarding >60%, dashboard progreso, PWA |
| **3 — Escala** | 3–6 meses | Crecer | Multi-import, EN, referidos, €2k+ MRR |

### Orden de ejecución recomendado

1. EPIC 1 + 2 (Legal + Seguridad) — **sin esto, no lanzar**
2. EPIC 3 (Monetización) con 2 planes simples
3. EPIC 4 (Landing + onboarding) antes de marketing de pago

---

## 8. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| “No es solver real” → críticas | Alta | Medio | Transparencia; posicionamiento entrenador+repaso |
| Coste IA descontrolado | Media | Alto | Rate limits, cupos, caché |
| Baja conversión free→paid | Media | Alto | Onboarding + límites free justos |
| Dependencia Google OAuth | Baja | Medio | Magic link Supabase (P2) |
| Regulación juego | Baja | Alto | Términos: herramienta educativa, no operador |
| Fuga datos por RLS abierta | Alta si no se arregla | Crítico | EPIC 2 antes de usuarios reales |

---

## 9. Backlog detallado

Leyenda de esfuerzo: **S** = pequeño (1–2 días), **M** = medio (3–5 días), **L** = grande (1–2 semanas).

### EPIC 1 — Legal y cumplimiento RGPD `P0`

| ID | Tarea | Esfuerzo |
|----|-------|----------|
| L-01 | Redactar Política de Privacidad (ES + EN) | S |
| L-02 | Redactar Términos de Uso | S |
| L-03 | Banner cookies + gestión consentimiento | M |
| L-04 | Página “Cómo usamos la IA” | S |
| L-05 | Flujo “Exportar mis datos” (JSON completo) | M |
| L-06 | Flujo “Eliminar mi cuenta” (local + Supabase) | M |
| L-07 | Registro de subprocesadores | S |
| L-08 | Revisión legal externa | Externo |

### EPIC 2 — Seguridad y auth de producción `P0`

| ID | Tarea | Esfuerzo |
|----|-------|----------|
| S-01 | Migrar a Supabase Auth (Google provider) | L |
| S-02 | RLS: `user_id = auth.uid()` en `pt_user_state` | M |
| S-03 | Rotar keys; `.gitignore` configs sensibles | S |
| S-04 | `PT_AI_TOKEN` solo servidor; cliente usa JWT sesión | M |
| S-05 | Rate limit en `analyze-hand` | M |
| S-06 | Validar JWT en Edge Function | M |
| S-07 | Auditar/eliminar `sesiones/*.txt` del repo público | S |
| S-08 | CSP headers + hardening | S |

### EPIC 3 — Monetización y billing `P0/P1`

| ID | Tarea | Esfuerzo |
|----|-------|----------|
| M-01 | Elegir proveedor (Stripe vs Lemon Squeezy) | S |
| M-02 | Schema: `plans`, `subscriptions`, `usage_ai_reports` | M |
| M-03 | Stripe Checkout + Customer Portal | L |
| M-04 | Webhook Stripe → entitlements Supabase | L |
| M-05 | Middleware entitlements en app | M |
| M-06 | UI Pricing + paywall IA/import/entrenador | M |
| M-07 | Trial 7 días Coach (opcional) | M |
| M-08 | Emails transaccionales | M |

### EPIC 4 — Go-to-market `P1`

| ID | Tarea | Esfuerzo |
|----|-------|----------|
| G-01 | Dominio propio + SSL | S |
| G-02 | Landing marketing | M |
| G-03 | Google OAuth producción | M |
| G-04 | Onboarding 3 pasos | M |
| G-05 | Sesión de ejemplo precargada | M |
| G-06 | FAQ + Soporte/Contacto | S |
| G-07 | Analytics (Plausible/PostHog) | M |
| G-08 | Sentry errores JS + Edge | S |

### EPIC 5 — Producto core (retención) `P1/P2`

| ID | Tarea | Esfuerzo |
|----|-------|----------|
| P-01 | Límites free (manos/día, sesiones/mes) | M |
| P-02 | Dashboard progreso (acierto, EV en el tiempo) | L |
| P-03 | “Mis leaks” — top 5 spots | M |
| P-04 | Filtros entrenador (posición, spot, calle) | M |
| P-05 | PWA (manifest + service worker) | M |
| P-06 | Email re-engagement opcional | M |
| P-07 | Disclaimers “guía de estudio” | S |

### EPIC 6 — Import y cobertura `P2`

| ID | Tarea | Esfuerzo |
|----|-------|----------|
| I-01 | Import PokerStars inglés | M |
| I-02 | Import GGPoker / Winamax | L |
| I-03 | Soporte torneos (preflop mínimo) | L |
| I-04 | Archivos grandes 10k+ manos con progreso | M |
| I-05 | Re-análisis al actualizar motor | L |

### EPIC 7 — Calidad motor `P1/P2`

| ID | Tarea | Esfuerzo |
|----|-------|----------|
| Q-01 | `testimport.js` en CI | S |
| Q-02 | E2E Playwright básico | L |
| Q-03 | Rangos preflop desde JSON solver | L |
| Q-04 | Documento “Metodología GTO” público | S |
| Q-05 | Indicador confianza por decisión | M |

### EPIC 8 — IA Coach comercial `P1`

| ID | Tarea | Esfuerzo |
|----|-------|----------|
| A-01 | Contador informes usados/restantes | S |
| A-02 | Caché más agresiva | M |
| A-03 | Modo resumen corto vs completo | M |
| A-04 | Cola async + email sesiones largas | L |
| A-05 | Prompts por plan | M |

### EPIC 9 — Operaciones y escala `P2/P3`

| ID | Tarea | Esfuerzo |
|----|-------|----------|
| O-01 | Panel admin (usuarios, MRR, uso IA) | L |
| O-02 | Alertas coste Gemini | S |
| O-03 | Programa afiliados | M |
| O-04 | Plan Escuela B2B | L |
| O-05 | Localización EN | L |

---

## 10. Issues en GitHub

Backlog creado en [github.com/joserra15/PokerTrainer/issues](https://github.com/joserra15/PokerTrainer/issues).

| Issue | Título |
|-------|--------|
| [#1](https://github.com/joserra15/PokerTrainer/issues/1) | **[ROADMAP] Lanzamiento comercial PokerTrainer** |
| [#2](https://github.com/joserra15/PokerTrainer/issues/2) | [EPIC] Legal y cumplimiento RGPD |
| [#3](https://github.com/joserra15/PokerTrainer/issues/3) | [EPIC] Seguridad y auth de producción |
| [#4](https://github.com/joserra15/PokerTrainer/issues/4) | [EPIC] Monetización y billing |
| [#5](https://github.com/joserra15/PokerTrainer/issues/5) | [EPIC] Go-to-market y primera impresión |
| [#6](https://github.com/joserra15/PokerTrainer/issues/6) | [EPIC] Producto core — retención |
| [#7](https://github.com/joserra15/PokerTrainer/issues/7) | [EPIC] Import y cobertura de mercado |
| [#8](https://github.com/joserra15/PokerTrainer/issues/8) | [EPIC] Calidad y confianza del motor |
| [#9](https://github.com/joserra15/PokerTrainer/issues/9) | [EPIC] IA Coach comercial |
| [#10](https://github.com/joserra15/PokerTrainer/issues/10) | [EPIC] Operaciones y escala |

Tareas L-01…O-05: issues [#11](https://github.com/joserra15/PokerTrainer/issues/11)–[#69](https://github.com/joserra15/PokerTrainer/issues/69).

### Etiquetas

| Etiqueta | Significado |
|----------|-------------|
| `epic` | Issue contenedor de un epic |
| `roadmap` | Issue meta del roadmap |
| `P0` | Bloqueante para lanzamiento |
| `P1` | MVP comercial |
| `P2` | Crecimiento |
| `P3` | Escala / moat |
| `legal` | Legal / RGPD |
| `security` | Seguridad / auth |
| `billing` | Monetización |
| `gtm` | Go-to-market |
| `product` | Features producto |
| `import` | Import sesiones |
| `quality` | Calidad / tests |
| `ai` | IA Coach |
| `ops` | Operaciones |

### Recrear issues (idempotente)

El script no duplica issues con el mismo título:

```bash
# Requiere GITHUB_TOKEN con scope repo
node tools/create-github-backlog-issues.js

# Solo simular
set DRY_RUN=1
node tools/create-github-backlog-issues.js
```

---

## Referencias internas

- README producto: `README.md`
- Schema Supabase: `supabase/schema.sql`
- Config IA ejemplo: `js/ai-config.example.js`
- CI: `.github/workflows/static.yml`
- Versión actual: `js/version.js`

---

*Última actualización: junio 2026*
