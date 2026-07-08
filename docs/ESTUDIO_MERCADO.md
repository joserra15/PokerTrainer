# Estudio de mercado — PokerForgeAI

> Documento de referencia para llevar PokerForgeAI a mercado.  
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

**PokerForgeAI** es una aplicación web de estudio de poker NLHE (JavaScript puro, sin build) desplegada en GitHub Pages. Combina entrenador GTO interactivo, importación de sesiones PokerStars (español), repaso de manos con evaluación por decisión, sincronización en nube (Supabase) e IA Coach (Gemini vía Edge Function).

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

### 3.2 Diferenciadores de PokerForgeAI

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

| Referencia | Precio | Posición PokerForgeAI |
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

---

### 6.2 Costes iniciales (antes del primer ingreso)

Inversión única para pasar de proyecto personal a producto comercial mínimo viable. Cifras orientativas para España/UE.

| Concepto | Coste único | Notas |
|----------|-------------|-------|
| Revisión legal (privacidad + términos) | €600–1.200 | Abogado RGPD; imprescindible antes de cobrar |
| Dominio (.es / .com) año 1 | €10–15 | |
| Stripe / Lemon Squeezy | €0 | Sin cuota de alta |
| Google Cloud (OAuth) | €0 | Verificación puede requerir tiempo, no dinero |
| Supabase | €0 | Free tier suficiente en beta |
| Diseño landing / logo | €0–300 | DIY o Fiverr |
| Tiempo de desarrollo (Fase 0+1) | — | 8–14 semanas si es side project; coste de oportunidad no contabilizado aquí |
| **Total cash inicial** | **€700–1.500** | Escenario típico: **~€1.000** |

> El mayor “coste inicial” en un side project suele ser **tiempo** (legal + auth + billing), no infraestructura. La cifra cash es baja porque GitHub Pages, Supabase free y el motor ya existen.

---

### 6.3 Supuestos del modelo financiero

| Parámetro | Valor base | Conservador | Optimista |
|-----------|------------|-------------|-----------|
| Precio Study | €14,99/mes | €14,99 | €14,99 |
| Precio Coach | €34,99/mes | €34,99 | €34,99 |
| Mix pagos | 70% Study / 30% Coach | 80% / 20% | 60% / 40% |
| Comisión Stripe | 2,5% + €0,25/transacción | 3,0% + €0,25 | 2,0% + €0,25 |
| Informes IA Coach/mes (media real) | 12 de 30 incluidos | 8 | 20 |
| Coste medio por informe IA (Gemini Flash) | €0,06 | €0,10 | €0,04 |
| Conversión free → paid | 4% | 2% | 6% |
| Churn mensual pagos | 7% | 10% | 5% |

**Ingreso neto por suscriptor** (después de Stripe, antes de costes variables):

| Plan | Bruto | Neto Stripe (~2,5%+€0,25) | Coste IA/mes (media) | **Margen de contribución** |
|------|-------|---------------------------|----------------------|----------------------------|
| Study | €14,99 | ~€14,37 | ~€0,05 | **~€14,32** |
| Coach | €34,99 | ~€33,87 | ~€0,72 (12×€0,06) | **~€33,15** |
| **Mix 70/30** | ~€20,99 | ~€20,22 | ~€0,25 | **~€19,97** |

Fórmula del ejemplo citado:

```
50 Study × €14,99 = €749,50
15 Coach × €34,99 = €524,85
─────────────────────────────
MRR bruto          = €1.274,35  ≈ €1.275
MRR neto (Stripe)  ≈ €1.235
Margen contrib.    ≈ €1.200/mes  (tras IA variable)
```

---

### 6.4 Costes operativos recurrentes por fase

| Fase | MAU | Pagos | Coste fijo/mes | Coste variable/mes | **Total opex/mes** |
|------|-----|-------|----------------|--------------------|--------------------|
| **Beta** (mes 1–3) | 50–150 | 0–10 | €15 (dominio) | €5–15 IA | **€20–30** |
| **Lanzamiento** (mes 4–6) | 200–500 | 15–40 | €45 (Supabase Pro + analytics) | €15–40 IA | **€60–85** |
| **Tracción** (mes 7–12) | 500–1.500 | 40–120 | €80 (infra + email + Sentry) | €40–120 IA | **€120–200** |
| **Escala** (año 2) | 2.000–5.000 | 120–350 | €150–250 | €150–400 IA | **€300–650** |

Desglose coste fijo maduro (~€80/mes en fase tracción):

| Concepto | €/mes |
|----------|-------|
| Supabase Pro | €25 |
| Analytics (Plausible) | €9 |
| Email transaccional (Resend) | €0–20 |
| Dominio (prorrateado) | €1 |
| Sentry (free → Team) | €0–26 |
| Buffer imprevistos | €10 |
| **Subtotal infra** | **~€45–80** |

Desglose adicional si se trata como negocio (no solo side project):

| Concepto | €/mes |
|----------|-------|
| Legal amortizado (€1.000 ÷ 12) | €83 |
| Marketing mínimo (comunidad, ads) | €50–150 |
| **Total “negocio real”** | **€180–310** |

---

### 6.5 Punto de equilibrio — tres lecturas

#### A) Solo infraestructura (side project puro)

Coste fijo ~€60/mes en lanzamiento, margen medio ~€20/pago:

```
€60 ÷ €19,97 ≈ 3 suscriptores de pago
```

Con solo GitHub Pages + Supabase free, **cubres servidores casi desde el primer cliente**. Por eso el proyecto es viable como side project a nivel técnico.

#### B) Negocio sostenible (amortiza legal + marketing mínimo)

Coste fijo ~€180/mes (legal amortizado + infra + €50 marketing):

```
€180 ÷ €19,97 ≈ 9 suscriptores de pago
```

#### C) Objetivo “vale la pena el esfuerzo” (side project serio)

Aquí entra el coste de oportunidad: quieres **≥€500/mes netos** tras todos los gastos para compensar mantenimiento, soporte y mejoras:

```
(€180 opex + €500 objetivo) ÷ €19,97 ≈ 34 suscriptores de pago
```

**Los 30–40 pagos** del resumen ejecutivo se refieren a este escenario **C**: no es el mínimo para pagar Supabase, sino el punto donde el proyecto deja de ser “hobby que cubre gastos” y pasa a generar **ingresos significativos** (~€600–800 MRR bruto).

| Escenario | Pagos necesarios | MRR bruto aprox. | Beneficio mensual aprox. |
|-----------|------------------|------------------|--------------------------|
| Cubrir infra | ~3 | ~€60 | ~€0 |
| Cubrir legal + marketing | ~9 | ~€190 | ~€0 |
| Side project rentable | **~34** | **~€710** | **~€500** |
| Ejemplo citado (50+15) | 65 | **~€1.275** | **~€950–1.000** |
| Objetivo año 1 ambicioso | 120 | ~€2.520 | ~€2.000 |

---

### 6.6 Tabla: ingresos vs costes al escalar usuarios

Supuestos: mix 70% Study / 30% Coach, conversión 4% MAU→pago, precios del plan base, IA media 12 informes/Coach.

| MAU | Pagos (4%) | MRR bruto | MRR neto | Opex fijo | Opex variable (IA+extra) | **Resultado/mes** | **Resultado acum. año 1*** |
|-----|------------|-----------|----------|-----------|--------------------------|-------------------|------------------------------|
| 100 | 4 | €84 | €81 | €30 | €5 | **+€46** | — |
| 250 | 10 | €210 | €203 | €45 | €12 | **+€146** | — |
| 500 | 20 | €420 | €406 | €60 | €25 | **+€321** | — |
| 800 | 32 | €672 | €649 | €80 | €40 | **+€529** | — |
| 1.000 | 40 | €840 | €810 | €100 | €55 | **+€655** | — |
| 1.500 | 60 | €1.260 | €1.215 | €120 | €80 | **+€1.015** | — |
| 2.000 | 80 | €1.680 | €1.620 | €150 | €110 | **+€1.360** | — |
| 3.000 | 120 | €2.520 | €2.430 | €200 | €180 | **+€2.050** | — |
| 5.000 | 200 | €4.200 | €4.050 | €280 | €320 | **+€3.450** | — |

\*Acumulado año 1 asume crecimiento gradual (ver 6.7), no este snapshot instantáneo.

**Lectura rápida:**

- Con **40 pagos** (~1.000 MAU) ya superas cómodamente el umbral de €500/mes netos.
- Con **65 pagos** (el ejemplo 50+15) el margen mensual ronda **€950–1.000** antes de impuestos.
- A **200 pagos** (5.000 MAU) el negocio factura ~€4.200 MRR; el cuello de botella pasa a ser **soporte, IA y tiempo de desarrollo**, no la infra.

---

### 6.7 Evolución mes a mes — escenario conservador (año 1)

Premisas: lanzamiento de pago en **mes 4**; crecimiento MAU +15% mensual los primeros 6 meses de pago, luego +10%; conversión 3,5%; churn 8%; coste inicial €1.000 en mes 0; opex crece con escala.

| Mes | MAU | Pagos | MRR bruto | Costes/mes† | **Cash flow/mes** | **Cash acumulado** |
|-----|-----|-------|-----------|-------------|-------------------|---------------------|
| 0 | — | — | €0 | €1.000 (inicial) | **−€1.000** | −€1.000 |
| 1 | 80 | 0 | €0 | €20 | −€20 | −€1.020 |
| 2 | 120 | 0 | €0 | €25 | −€25 | −€1.045 |
| 3 | 180 | 0 | €0 | €30 | −€30 | −€1.075 |
| 4 | 250 | 9 | €189 | €95‡ | +€94 | −€981 |
| 5 | 290 | 12 | €252 | €110 | +€142 | −€839 |
| 6 | 335 | 15 | €315 | €125 | +€190 | −€649 |
| 7 | 385 | 18 | €378 | €140 | +€238 | −€411 |
| 8 | 440 | 22 | €462 | €155 | +€307 | −€104 |
| 9 | 510 | 26 | €546 | €170 | +€376 | **+€272** |
| 10 | 580 | 30 | €630 | €185 | +€445 | +€717 |
| 11 | 650 | 34 | €714 | €200 | +€514 | +€1.231 |
| 12 | 730 | 38 | €798 | €215 | +€583 | **+€1.814** |

†Costes/mes = infra + IA variable + legal amortizado (€83) + marketing (€50 desde mes 4).  
‡Mes 4 incluye setup Stripe, primer mes Supabase Pro.

**Hitos del escenario conservador:**

| Hito | Mes aprox. |
|------|------------|
| Recuperar inversión inicial (€1.000) | Mes 9 |
| ≥€500/mes netos | Mes 10–11 |
| ~€800 MRR bruto | Mes 12 |
| 38 suscriptores de pago | Mes 12 |

---

### 6.8 Evolución mes a mes — escenario optimista (año 1)

Premisas: buen product-market fit en comunidad poker ES; conversión 5%; churn 6%; MAU +25% mensual tras lanzamiento; algo de marketing (€150/mes desde mes 4).

| Mes | MAU | Pagos | MRR bruto | Costes/mes | **Cash flow/mes** | **Cash acumulado** |
|-----|-----|-------|-----------|------------|-------------------|---------------------|
| 0 | — | — | €0 | €1.000 | −€1.000 | −€1.000 |
| 4 | 400 | 20 | €420 | €200 | +€220 | −€780 |
| 6 | 625 | 35 | €735 | €250 | +€485 | −€295 |
| 8 | 980 | 55 | €1.155 | €320 | +€835 | +€540 |
| 10 | 1.500 | 85 | €1.785 | €400 | +€1.385 | +€2.925 |
| 12 | 2.300 | 130 | €2.730 | €500 | +€2.230 | **+€7.175** |

En el escenario optimista, el ejemplo **50 Study + 15 Coach** se alcanza hacia el **mes 7–8**, no al inicio.

---

### 6.9 Sensibilidad: qué mueve más la aguja

| Variable | Impacto en beneficio | Acción prioritaria |
|----------|----------------------|--------------------|
| **Conversión free→paid** (+1 pp) | +€200–400 MRR a 1.000 MAU | Onboarding, límites free bien calibrados, trial Coach |
| **Churn** (−2 pp) | +15–20% LTV | Dashboard progreso, email re-engagement |
| **Mix hacia Coach** (+10 pp Coach) | +€1,50 margen medio/pago | Upsell IA tras import de sesión |
| **Uso IA** (20 vs 8 informes) | +€0,72/Coach/mes | Caché, modo resumen, cupos estrictos |
| **CAC** (€40 vs €80) | Retraso break-even 2–3 meses | SEO, comunidad, referidos — evitar paid search al inicio |
| **Precio Study** (+€2) | +€1,40 neto/sub | Test A/B cuando haya tracción |

---

### 6.10 Impuestos y forma jurídica (España, orientativo)

No es asesoramiento fiscal; solo planning:

| Figura | Cuándo tiene sentido | Nota |
|--------|----------------------|------|
| **Autónomo** | Desde primeros ingresos regulares | Cuota + IRPF sobre beneficio |
| **SL** | MRR >€2.000–3.000 sostenido | Más costes fijos, mejor si hay socios o inversión |

A **€1.275 MRR** (~€15.300/año bruto) muchos lo gestionarían como autónomo en paralelo a otro trabajo. A **€2.500+ MRR** conviene asesoría para optimizar IVA (Stripe + UE) y retenciones.

---

### 6.11 Resumen ejecutivo financiero

```
Inversión inicial cash:     ~€1.000
Break-even infra pura:      ~3 pagos  (~€60 MRR)
Break-even “negocio”:       ~9 pagos  (~€190 MRR)
Side project rentable:      ~34 pagos (~€710 MRR) → ~€500/mes netos
Ejemplo 50 Study + 15 Coach: 65 pagos → ~€1.275 MRR → ~€1.000/mes netos

Recuperar inversión inicial:  mes 8–10 (conservador) / mes 5–6 (optimista)
```

El proyecto es **viable como side project** porque los costes fijos de infra son bajos y el producto ya está construido. El reto no es pagar el servidor: es **conseguir 30–65 usuarios de pago** que confíen en un análisis GTO aproximado frente a alternativas establecidas — ahí el ROI del tiempo invertido en legal, UX y marketing es lo que realmente hay que amortizar.


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
| [#1](https://github.com/joserra15/PokerTrainer/issues/1) | **[ROADMAP] Lanzamiento comercial PokerForgeAI** |
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
