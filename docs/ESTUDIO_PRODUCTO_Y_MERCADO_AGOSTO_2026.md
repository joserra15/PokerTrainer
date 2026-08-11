# Estudio de producto y mercado — PokerForgeAI

> Análisis profundo del producto actual (v1.60.x, agosto 2026) + estudio competitivo de herramientas similares.  
> Criterio de priorización: **posible reclamo / atractivo para nuevos usuarios** (activación y conversión), no solo retención de usuarios ya pagando.  
> Sitio: [www.pokerforgeai.com](https://www.pokerforgeai.com) · Repo: [joserra15/PokerTrainer](https://github.com/joserra15/PokerTrainer)

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Producto actual en profundidad](#2-producto-actual-en-profundidad)
3. [Estudio competitivo completo](#3-estudio-competitivo-completo)
4. [Mapa de gaps vs. expectativas del mercado](#4-mapa-de-gaps-vs-expectativas-del-mercado)
5. [Mejoras y nuevas funcionalidades (prioridad por reclamo a nuevos usuarios)](#5-mejoras-y-nuevas-funcionalidades)
6. [Implicaciones de pricing y posicionamiento](#6-implicaciones-de-pricing-y-posicionamiento)
7. [Riesgos y apuestas estratégicas](#7-riesgos-y-apuestas-estratégicas)
8. [Conclusiones](#8-conclusiones)

---

## 1. Resumen ejecutivo

**PokerForgeAI** es un SaaS de estudio NL Hold'em en español: entrenador GTO heurístico + importación de sesiones (PokerStars ES/EN, Winamax) + leak detection + ForgeCoach (Gemini) + freemium Stripe. No es un solver completo: es un **compañero de estudio asequible** orientado a jugadores recreativos–serios (NL10–NL100+).

| Dimensión | Valoración agosto 2026 |
|-----------|------------------------|
| Madurez comercial | **Alta** — billing, legal, PWA, analytics, Sentry, admin, promo |
| Profundidad de estudio | **Media–alta** — loop completo train → errores → import → leaks → IA |
| Paridad vs Snowie-class | **Parcial** — live advisor y PWA hechos; falta modo sesión, GG, what-if, trial claro |
| Paridad vs GTO Wizard | **Baja (a propósito)** — no competimos en biblioteca solver |
| Diferenciador real | Español nativo + import sesiones reales + IA narrativa + precio Study €14,99 |
| Mayor freno a nuevos usuarios | Onboarding/trial confuso, cobertura de salas incompleta, duda de “¿es GTO de verdad?” |

**Veredicto:** El producto ya es vendible. El siguiente salto de crecimiento no es “más solver”, sino **cerrar la primera hora del usuario** (claridad free/trial, import que “simplemente funciona”, bloque de entrenamiento con resultado visible) y **comunicar honestamente** por qué es mejor opción que Snowie a mitad de precio y que Wizard a ⅓–⅒ del coste.

---

## 2. Producto actual en profundidad

### 2.1 Propuesta de valor

> Entrena decisiones GTO, importa tus sesiones reales y mejora con ForgeCoach — en español, desde el navegador, sin tarjeta para empezar.

Pilares reales en código:

1. **Entrenar** — spots preflop/postflop con grading EV (óptima / aceptable / imprecisa / error).
2. **Sesiones** — import HH → scoring por decisión → nota de sesión → repaso paso a paso.
3. **Análisis** — mano manual / texto → estructura → review / train / share.
4. **Rangos** — matrices 13×13 preflop (cash/MTT, stacks).
5. **Errores / Stats / Leaks** — banco de errores, HUD estilo héroe, top leaks.
6. **ForgeCoach** — informes mano/sesión/stats vía Gemini Edge Function.
7. **Cuenta cloud** — Google + Supabase sync + Stripe entitlements.

### 2.2 Público objetivo

| Segmento | Encaje | Motivación de compra |
|----------|--------|----------------------|
| Recreativo serio ES (NL2–NL25) | **Ideal** | Mejorar sin pagar Wizard; español; import PS/Winamax |
| Reg NL50–NL100 cash 6-max | **Bueno** | Estudio diario + IA; complementa tracker |
| MTT / Spin specialist | **Débil** | UI MTT existe; motor mapea a heurísticas 6-max |
| High stakes / coaches | **No target** | Necesitan Pio / Wizard Ultra |
| Anglófonos | **Cerrado hoy** | Producto ES-first; privacy EN parcial |

### 2.3 Monetización live

| Plan | Precio | Límites clave |
|------|--------|---------------|
| Gratis | €0 | 15 manos/día · 1 import/mes (≤200) · 5 análisis · 0 IA · hist. 30 días |
| Study (`pro`) | €14,99/mes · €119/año | Ilimitado train/import · 20 análisis · **40 IA/mes** |
| Coach (`premium`) | €34,99/mes · €279/año | 100 análisis · **150 IA/mes** |
| Packs IA | 20/40/80 créditos | Upsell sin subir plan |
| Promo | SUMMER26 50% | Landing `promo.html` |

Comparado con el mercado 2026: Study está **por debajo** de Snowie (~$30/mes) y **muy por debajo** de GTO Wizard Starter (~$39–49/mes) y Gecko (~$25–40/mes). El precio es una ventaja competitiva clara **si** el valor percibido en la primera sesión es suficiente.

### 2.4 Stack y calidad técnica

- Frontend: SPA vanilla JS (`index.html` ~65 KB, `app.js` grande), CSS, PWA.
- Backend: Supabase Auth/Postgres + Edge Functions (Deno).
- IA: Gemini (`analyze-hand`).
- Billing: Stripe checkout/portal/webhooks.
- Deploy: GitHub Pages + CI (selftests, import, EV regression, Playwright).
- Observabilidad: Plausible + Sentry.

Fortaleza: producto “cerrado” comercialmente (legal, cuotas, admin). Debilidad estructural: motor **heurístico + JSON de rangos**, no árbol solver; MTT/9-max no modelados con profundidad real.

### 2.5 Estado vs. roadmap interno (EPIC 10 Snowie)

| Pilar EPIC 10 | Estado agosto 2026 |
|---------------|-------------------|
| Live Advisor (SN-10–12) | **Hecho** (`js/live-advisor.js`) |
| PWA (SN-50) | **Hecho** |
| Sesión demo (SN-04) | **Hecho** (`sample-session.js`) |
| Import PS + Winamax | **Hecho** |
| Leaks / stats HUD | **Hecho** (backlog métricas cerrado) |
| Trial 10 días claro (SN-01–03) | **Parcial** — billing soporta `trialing`; UX trial agresiva pendiente |
| Modo sesión 25/50/100 (SN-14) | **Pendiente** |
| Import GGPoker (SN-20) | **Pendiente** |
| What-if (SN-40) | **Pendiente** |
| Comparativa Snowie en landing (SN-54) | **Pendiente** |
| Calentamiento 15 min (SN-51) | **Pendiente** |

El estudio de mercado previo (`ESTUDIO_MERCADO.md`, v1.19) está **obsoleto**: afirmaba ausencia de Stripe/PWA/legal; hoy eso ya está en producción.

---

## 3. Estudio competitivo completo

### 3.1 Categorías del mercado (2026)

El mercado de herramientas de poker se parte en **cinco categorías** que los jugadores confunden a menudo:

| Categoría | Qué compra el usuario | Ejemplos |
|-----------|----------------------|----------|
| **A. Solvers / bibliotecas GTO** | Respuestas teóricas exactas | GTO Wizard, PioSolver, GTO+, Simple Postflop, Monker, GTOBase |
| **B. Trainers GTO (drill)** | Repetición con grading EV | GTO Wizard Trainer, GTO Gecko, Lucid GTO, DTO, Postflop+ |
| **C. AI sparring / coach interactivo** | Jugar vs IA + consejo en vivo | PokerSnowie, (parcialmente) PokerForgeAI |
| **D. Trackers / HUD** | Stats de población y oponentes | Hand2Note, DriveHUD, PokerTracker |
| **E. ForgeCoaching narrativo** | Interpretar datos/manos en lenguaje natural | ClarityPoker, DriveHUD AI add-on, EdgeCore, PokerForgeAI ForgeCoach |

**PokerForgeAI opera en C + E + parte de B**, con un pie en review de HH (sin ser tracker D).

### 3.2 Matriz comparativa (precios orientativos junio–agosto 2026)

| Producto | Tipo | Precio | Trainer EV | Import HH | ForgeCoach | ES nativo | Web/PWA | Público |
|----------|------|--------|------------|-----------|----------|-----------|---------|---------|
| **PokerForgeAI** | C+E+B | €0 / 15 / 35 | Sí (heurístico) | PS, Winamax | Gemini informes | **Sí** | Sí | Rec–serio ES |
| PokerSnowie | C | ~$30/mes o ~$200–290/año | Sí (NN) | PS, GG, Winamax… | Live Advice (NN) | No | Desktop + apps | Beginner–intermedio |
| GTO Wizard | A+B | $39–279/mes | Sí (solver) | Sí (one-click) | AI solves / nodelock | No | Cloud | Regs–pros |
| GTO Gecko | A+B | $25–40/mes | Sí + explainability | Stats/review | SHAP “por qué” | No | Web + apps | Cash/MTT mid |
| Lucid GTO | B | $49/mes | Sí | Limitado | No fuerte | No | Multiplataforma | Cash casual |
| DTO Poker | B | $10–100/mes | Sí MTT | No foco | No | No | App | MTT low stakes |
| Postflop+ | B | $15/mes o lifetime | Postflop móvil | No | No | No | Mobile | Rec móvil |
| GTO+ | A | ~$75 one-time | No trainer serio | No | No | No | Desktop | Budget solver |
| PioSolver | A | $249–1099 | No | No | No | No | Desktop | Pros/coaches |
| Hand2Note 4 | D | Free–~$39/mes | No | Sí (core) | No | No | Desktop | Online regs |
| DriveHUD 3 | D+B | $60–200/año | GTO built-in | Sí | ChatGPT opcional | No | Desktop | Online + Asian apps |
| ClarityPoker / similares | E | Beta / variable | No | Via CSV tracker | RAG + Gemini | No | Web | Quien ya tiene DB |
| Octopi Poker | B+coaching | $200–600/año | Menos drill | Vault manos pro | Comunidad | No | Web | MTT + community |
| Flopzilla / Equilab | Equity | Low one-time | No | No | No | No | Desktop | Complemento |

Fuentes de precios: sitios oficiales y comparativas 2026 (GTO Gecko blog junio 2026, PokerNews, DeucesCracked, PokerToolsGuide, páginas de producto).

### 3.3 Perfiles de competidores relevantes

#### PokerSnowie — competidor más cercano en forma de producto

- **Qué vende:** sparring vs red neuronal + Live Advice + import + leaks + rangos + apps nativas.
- **Plan único** mensual/anual; trial ~10 días; marca “220k+ jugadores”.
- **Fortalezas:** UX de “jugar muchas manos”, consejo en vivo maduro, cobertura de salas, apps.
- **Debilidades 2026:** la industria lo trata cada vez más como NN de generación anterior (no GTO solver); foros cuestionan precisión vs solvers; **sin español**; precio ~2× Study.
- **Implicación:** PokerForgeAI debe ganar en **idioma, precio, IA narrativa y honestidad metodológica**, no en “somos más GTO que Snowie” sin datos.

#### GTO Wizard — líder de categoría, no rival directo de precio

- Biblioteca 10M+ soluciones, trainer EV-loss, HH analysis, nodelocking, Ultra multiway.
- Tras subidas marzo 2026: quejas de precio en foros; abre hueco para alternativas $15–40.
- **Implicación:** no pelear features A. Usar Wizard como **ancla de contraste** en landing: “si quieres solver, Wizard; si quieres estudiar tus sesiones en español por €15, nosotros”.

#### GTO Gecko / Lucid / DTO — trainers GTO “puros”

- Gecko: EV-loss + ELO + adaptive re-drill + explainability; $25–40.
- Lucid: cash simple, free generoso, $49.
- DTO: MTT barato desde $10.
- **Implicación:** estos ganan si el usuario solo quiere drills GTO. PokerForgeAI gana si el usuario quiere **sesión real + coach en español**. Diferenciar import + IA + ES es crítico; copiar solo drills sin solver propio es pelea perdida.

#### Trackers (Hand2Note, DriveHUD) — categoría distinta

- El jugador que busca HUD/población **no** es nuestro comprador primario.
- DriveHUD añade GTO + ChatGPT: señal de que el mercado mezcla tracker + IA.
- **Implicación:** no construir HUD población; sí **export/interop** futuro (CSV/PT4) para que ForgeCoach lea leaks de tracker = upsell Coach.

#### ForgeCoaches narrativos (ClarityPoker, EdgeCore, add-ons)

- Emergen en 2025–2026: LLM + datos estructurados (RAG sobre solver docs o CSV).
- PokerForgeAI ya tiene este pilar (Gemini + motor propio). Riesgo: proliferación de “ChatGPT + HH” baratos.
- **Implicación:** moat = **números del motor propios** (EV, grades, HUD estilo) alimentando la IA, no prompts genéricos. Documentar y vender “IA grounded en tu scoring”, no “ChatGPT que habla de poker”.

### 3.4 Posicionamiento relativo (mapa perceptual)

```
                    Precio bajo
                        │
         DTO · Postflop+│  ★ PokerForgeAI
                        │     (ES + sesiones + IA)
         Lucid free     │  Snowie
                        │
  Casual ───────────────┼─────────────── Pro/Research
                        │
              Gecko     │  Wizard Premium/Elite
                        │  Pio / Monker
                        │
                    Precio alto
```

Espacio vacío explotable: **“estudio de sesiones reales + ForgeCoach en español bajo €20/mes”**. Casi nadie ocupa ese cuadrante con producto web listo.

### 3.5 Qué buscan los nuevos usuarios (jobs-to-be-done)

Ordenados por frecuencia típica en el funnel recreativo–serio:

1. **“Quiero saber si juego bien sin pagar 100 $/mes”** → free/trial + grading claro.
2. **“Subí mis manos de PokerStars / Winamax / GG y dime mis fugas”** → import inmediato.
3. **“Practicar 20–30 min al día y ver progreso”** → modo sesión / calentamiento.
4. **“Que me lo expliquen en mi idioma”** → ES + IA narrativa.
5. **“Confiar en que no me enseñáis basura”** → metodología, disclaimers, calidad EV.
6. **“Llevarlo al móvil”** → PWA (ya tenemos) / percepción de app.
7. **“Comparar con lo que ya conozco (Snowie/Wizard)”** → tabla honesta en landing.

---

## 4. Mapa de gaps vs. expectativas del mercado

### 4.1 Gaps de activación (primera sesión)

| Expectativa mercado | PokerForgeAI hoy | Severidad para nuevos |
|---------------------|------------------|------------------------|
| Trial 7–14 días “todo Study” sin fricción | Freemium + `trialing` técnico; mensaje poco Snowie-claro | **Alta** |
| “Sube HH y en 2 min ves leaks” | Demo session sí; FAQ desactualizada (“solo PokerStars”); sin GG | **Alta** |
| Bloque de N manos con resumen | Manos continuas; sin modo 25/50/100 formal | **Alta** |
| Consejo en vivo mientras entrenas | Live Advisor **ya existe** | Cubierto |
| App móvil percibida | PWA existe; marketing puede infrautilizarlo | Media |
| Comparativa vs Snowie/Wizard | Ausente en landing | Media–Alta |

### 4.2 Gaps de confianza / producto

| Tema | Gap |
|------|-----|
| Metodología | Bien documentada en legal; landing debe repetir “heurístico educativo” sin sonar débil |
| MTT / 9-max | UI promete más de lo que el motor modela |
| FAQ / copy | Desalineados con Winamax + PS EN |
| i18n EN | Cierra TAM internacional |
| What-if / escenarios custom | Snowie/Wizard lo dan por hecho en usuarios intermedios |
| Adaptive drilling | Gecko/Wizard re-serven spots fallados de forma inteligente; nosotros tenemos “repetir errores” pero no sesión adaptativa completa |

### 4.3 Gaps que NO priorizar (fuera de posicionamiento)

- Nodelocking / custom multiway solver
- HUD de población en tiempo real (tracker war)
- Apps nativas iOS/Android (PWA primero)
- PLO
- “Somos más precisos que Wizard”

---

## 5. Mejoras y nuevas funcionalidades

Prioridad = **impacto en reclamo / conversión de nuevos usuarios** × factibilidad relativa al stack actual.  
Escala de reclamo: 5 = “razón principal para registrarse o pagar”; 1 = nice-to-have.

### P0 — Máximo reclamo para nuevos usuarios

| # | Mejora | Reclamo | Por qué convierte | Notas |
|---|--------|---------|-------------------|-------|
| **1** | **Trial Study 10 días + pantalla “Empieza gratis” con límites claros** | 5 | Elimina fricción tipo Snowie; el free actual (15 manos/día) se percibe “tacaño” vs trial completo | Stripe `trialing` ya soportado; falta UX y emails D+3/D+8 |
| **2** | **Import GGPoker + multi-archivo + copy/FAQ alineados** | 5 | “¿Soporta mi sala?” es filtro binario de activación; GG es sala #1 para muchos ES jóvenes | SN-20/21; actualizar FAQ que aún dice “solo PokerStars” |
| **3** | **Modo sesión 25/50/100 + resumen (acierto, EV perdido, tiempo) + atajo “Calentamiento 15 min”** | 5 | Los nuevos no quieren menú infinito; quieren un ritual diario medible | SN-14/51; habit loop = retención semana 1 |
| **4** | **Landing: tabla honesta vs Snowie / Wizard + prueba social + PWA “Instálalo”** | 4.5 | Nuevos llegan comparando; sin ancla de precio/idioma pierden el “aha” | SN-54; no exagerar GTO |
| **5** | **Onboarding guiado 3 pasos: demo sesión → 10 manos calentamiento → ver leak** | 4.5 | Time-to-value &lt; 3 min; reduce bounce post-login | Sesión demo ya existe; falta orquestación UI |

### P1 — Alto reclamo / retención temprana (días 2–14)

| # | Mejora | Reclamo | Por qué | Notas |
|---|--------|---------|---------|-------|
| **6** | **Dashboard leaks por calle y por spot (clic → drill)** | 4 | “Encontré mis fugas” es el momento de pago más fuerte tras import | Ampliar SN-30–32 sobre stats actuales |
| **7** | **What-if en mano importada** (cambiar acción/carta y re-evaluar) | 4 | Diferenciador vs “solo nota”; sensación de solver ligero | SN-40; acotar HU |
| **8** | **ForgeCoach: primer informe gratis / trial 3 informes + hilo de conversación real** | 4 | Upsell Coach; hoy free = 0 IA es muro duro | Coste Gemini; fair-use; reenviar contexto (gap en ESTUDIO_PROMPTS_IA) |
| **9** | **Adaptive drill: cola automática de peores spots (no solo “repetir fallados” manual)** | 3.5 | Paridad con expectativa Gecko/Wizard trainer | Usa error bank existente |
| **10** | **Preflop sizing toggle (2.5x vs 3x) en rangos + spots favoritos** | 3.5 | Usuarios que vienen de charts preguntan sizing día 1 | SN-43/44 |
| **11** | **Compartir mano / progreso social (ya hay share) potenciado: “mi peor leak de la semana”** | 3 | Virality ES en foros/Telegram/Discord | Extender `share.html` |

### P2 — Diferenciación y expansión de mercado

| # | Mejora | Reclamo | Por qué | Notas |
|---|--------|---------|---------|-------|
| **12** | **i18n inglés (UI + landing EN)** | 3.5 | Duplica TAM; SEO internacional | SEO.md ya lo lista |
| **13** | **Range viewer postflop simplificado** | 3 | Expectativa visual tipo Snowie/Wizard | SN-42; disclaimer heurístico |
| **14** | **Export informe sesión PDF + interop CSV tipo tracker** | 3 | Puente a coaches humanos y a Clarity-like workflows | SN-34 |
| **15** | **Modo “solo aviso si error grave” (umbral EV)** | 2.5 | Preferencia power users; Snowie-like | SN-13 |
| **16** | **Blog / contenido SEO ES** (“fugas NL25”, “importar Winamax”)** | 3 | Adquisición orgánica barata en nicho ES poco competido | SEO.md |
| **17** | **Programa referidos / afiliados escuelas poker ES** | 3 | B2B2C; escuelas odian precio Wizard | EPIC mercado P3 |
| **18** | **MTT/ICM honesto: o profundizar o quitar promesa** | 2.5 | Evitar churn por decepción; o partner DTO-like | Decisión de producto, no feature aislada |
| **19** | **Hotkeys + rake configurable** | 2 | Pulido trainer | SN-52/53 |
| **20** | **ELO / racha / streak gamificación ligera** | 2.5 | Habit; Gecko lo usa bien | Cuidado no trivializar estudio |

### Orden final recomendado (backlog de producto)

```
1  Trial 10d + límites claros en landing
2  Import GG + multi-file + FAQ/copy
3  Modo sesión + Calentamiento 15 min
4  Landing comparativa Snowie/Wizard + PWA CTA
5  Onboarding 3 pasos (demo → warmup → leak)
6  Leaks dashboard calle/spot → drill
7  What-if en import
8  IA: gratis/trial + hilo conversacional grounded
9  Adaptive drill queue
10 Sizing toggle + favoritos
11 Share / social leak
12 EN i18n + blog SEO ES
13 … (P2 restante)
```

---

## 6. Implicaciones de pricing y posicionamiento

### Mensaje recomendado (post-P0)

> **PokerForgeAI** — Entrena con consejo en vivo, importa PokerStars / Winamax / GG, detecta fugas y profundiza con ForgeCoach. En español, instalable como app, desde €0. Study €14,99/mes.  
> No sustituye a GTO Wizard si necesitas un solver. Sustituye a Snowie si quieres idioma, precio e informes IA sobre **tus** sesiones.

### Pricing

| Decisión | Recomendación |
|----------|---------------|
| Study €14,99 | **Mantener** — ancla vs Snowie/Gecko |
| Coach €34,99 | **Mantener** — cerca Snowie, debajo Wizard; IA es el upsell |
| Free 15 manos/día | Complementar con **trial 10d Study**, no subir free a ilimitado |
| Primer toque IA | 1–3 informes en trial/free bonificado para sentir Coach |
| Anual | Seguir ~20–33% dto; empuja cashflow |

### Qué no hacer en pricing

- Subir a €29 “porque Snowie cobra eso” sin cerrar P0 (pérdida de ventaja).
- Incluir IA ilimitada en Study (margen Gemini + canibaliza Coach).
- Competir en lifetime barato tipo Postflop+ (devalúa SaaS sync/IA).

---

## 7. Riesgos y apuestas estratégicas

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Usuario espera precisión Wizard | Alto churn / reviews negativas | Metodología visible; copy “estudio heurístico”; grades EV honestos |
| GG parser frágil | Activación fallida | Fixtures CI; versionar formato |
| Coste IA en trials | Margen negativo | Trial Study sin IA o con 3 informes; rate limit |
| Competidores EN añaden español | Pierde moat idioma | Velocidad + comunidad ES + escuelas |
| Documentación interna desfasada | Mala priorización | Este doc sustituye lectura de `ESTUDIO_MERCADO.md` para estado 2026 |
| Invertir en MTT superficial | Diluye marca cash 6-max | Decisión binaria: profundizar ICM o retirar claim |

**Apuesta principal:** el mercado 2026 castiga precios de Wizard y duda de Snowie. Un producto ES web a €15 con **import + trainer con advisor + IA grounded** puede capturar el segmento que hoy improvisan con ChatGPT + charts PDF.

---

## 8. Conclusiones

1. **PokerForgeAI ya no es un prototipo:** billing, legal, PWA, live advisor, import PS/Winamax, leaks, IA y admin están listos. El estudio de mercado de junio (v1.19) no describe el producto actual.
2. **El competidor de forma es PokerSnowie; el de aspiración es GTO Wizard; el de precio/nicho trainers es Gecko/Lucid/DTO.** Nuestro cuadrante (sesiones reales + IA + español + €15) está poco ocupado.
3. **Para nuevos usuarios, el orden de impacto es:** trial claro → salas de import → ritual de sesión/calentamiento → landing comparativa → onboarding → leaks accionables → what-if → IA de prueba.
4. **No ganaréis la guerra del solver.** Ganaréis si la primera hora responde: “entrené, vi mis fugas en mis manos, y me lo explicaron en español”.
5. **Siguiente documento operativo:** convertir la lista P0–P1 en issues GitHub con criterios de aceptación (reutilizar IDs SN-* de EPIC 10 donde apliquen).

---

### Anexo A — Fuentes

- Producto interno: `README.md`, `docs/BILLING.md`, `docs/EPIC_10_PARIDAD_SNOWIE.md`, `docs/ESTUDIO_MERCADO.md` (histórico), código `js/*`, `legal/metodologia.html`
- Mercado: [PokerSnowie](https://pokersnowie.com/), [GTO Gecko — Best trainers 2026](https://gtogecko.com/blog/best-gto-apps-platforms), [PokerNews GTO Wizard](https://www.pokernews.com/poker-tools/gto-wizard/), [DeucesCracked solvers](https://www.deucescracked.com/tools/gto-solvers), [PokerCorner solvers comparison](https://pokercorner.io/en/tools/solvers-comparison), [DriveHUD 3](https://drivehud.com/), Hand2Note pricing retailers, ClarityPoker / ForgeCoach trend 2026

### Anexo B — Relación con docs existentes

| Doc | Rol tras este estudio |
|-----|------------------------|
| `ESTUDIO_MERCADO.md` | Histórico pre-lanzamiento (v1.19); no usar para estado actual |
| `EPIC_10_PARIDAD_SNOWIE.md` | Backlog táctico Snowie; alinear estados (advisor/PWA hechos) |
| `BILLING.md` | Fuente de verdad de planes |
| **Este documento** | Visión producto + mercado agosto 2026 y priorización por reclamo a nuevos usuarios |

---

*Generado: agosto 2026 · Versión producto analizada: v1.60.x*
