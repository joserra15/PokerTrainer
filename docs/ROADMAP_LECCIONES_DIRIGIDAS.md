# RoadMap — Lecciones dirigidas (Cash · Spins · MTT)

> Estudio de producto y diseño pedagógico para **Escuela de Póker** (entrenamiento dirigido por lecciones) en PokerForgeAI.  
> **Alcance de este documento:** análisis, currículum, monetización, UX de progresión y fases de entrega. **Sin implementación de código.**  
> Complementa: `ESTUDIO_PRODUCTO_Y_MERCADO_AGOSTO_2026.md`, Guía básica actual (`js/beginner-guide.js`), taxonomía de formatos (`js/engine/format/taxonomy.js`), IA Coach y planes Gratis / Study / Coach.  
> Fecha: agosto 2026 · Producto: PokerForgeAI (PokerTrainer)  
>  
> **Decisiones cerradas:** nombre de menú **Escuela de Póker** · manos de lección **consumen cupo Free** (15/día del trainer) · menú **solo visible para administrador** hasta apertura controlada.

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Problema que resolvemos](#2-problema-que-resolvemos)
3. [Estado actual y piezas reutilizables](#3-estado-actual-y-piezas-reutilizables)
4. [Modelo pedagógico de una lección](#4-modelo-pedagógico-de-una-lección)
5. [Diseño de spots fijos y trampas](#5-diseño-de-spots-fijos-y-trampas)
6. [Progresión, desbloqueo y planes](#6-progresión-desbloqueo-y-planes)
7. [UX visual: evolución, puntos y niveles](#7-ux-visual-evolución-puntos-y-niveles)
8. [IA Coach en cada paso](#8-ia-coach-en-cada-paso)
9. [Currículum Cash](#9-currículum-cash)
10. [Currículum Spins](#10-currículum-spins)
11. [Currículum MTT](#11-currículum-mtt)
12. [Módulos transversales (rangos, estrategia, pro)](#12-módulos-transversales-rangos-estrategia-pro)
13. [Mapa de lecciones vs planes](#13-mapa-de-lecciones-vs-planes)
14. [RoadMap de entrega por fases](#14-roadmap-de-entrega-por-fases)
15. [Riesgos, honestidad del motor y métricas de éxito](#15-riesgos-honestidad-del-motor-y-métricas-de-éxito)
16. [Glosario y decisiones abiertas](#16-glosario-y-decisiones-abiertas)

---

## 1. Resumen ejecutivo

Hoy PokerForgeAI enseña con **entrenamiento aleatorio filtrado**, una **Guía básica estática** y **drills adaptativos** desde leaks. Falta el eslabón que convierte a un jugador recreativo en alguien con sistema: un **árbol de lecciones ordenadas**, con teoría breve, ejemplos y **sesión de spots autorados** (no RNG) que evalúan un único concepto.

**Propuesta:** tres rutas (Cash, Spins, MTT), cada una con lecciones de simple → pro. Cada lección:

1. Explica el concepto (texto + 1–2 ejemplos visuales).
2. Lanza una **sesión dirigida** de N manos con spots fijos, trampas y situaciones límite.
3. Termina la mano en el **punto de decisión** del concepto (p. ej. open / call / fold) cuando no aporte seguir.
4. Aprueba con un umbral de acierto → desbloquea la siguiente.
5. Expone **IA Coach** en teoría, feedback y post-sesión.
6. Permite **repetir** lecciones superadas para subir el % hacia 100 % y ganar puntos de maestría.

**Monetización alineada al producto actual:**

| Plan | Acceso curricular |
|------|-------------------|
| **Gratis** | 1–2 primeras lecciones de cada ruta (o solo Cash L1–L2) + vista del árbol |
| **Study** (`pro`) | Hasta ~mitad de cada ruta (fundamentos + intermedio) |
| **Coach** (`premium`) | Ruta completa, incluyendo lecciones **pro**, bubble ICM, bluff construction, range work avanzado |

**Veredicto de producto:** es el mayor salto de *activación + retención + upsell a Coach* posible sin construir un solver. Reutiliza `startGuidedTraining`, grading EV, seeds/replay y IA Coach; añade **contenido autorado + estado de progresión + UI de skill tree** bajo el menú **Escuela de Póker** (admin-only al inicio).

---

## 2. Problema que resolvemos

### 2.1 Dolor del usuario

| Momento | Qué pasa hoy | Qué debería pasar |
|---------|--------------|-------------------|
| Primera hora | “¿Por dónde empiezo?” → chips del entrenador o Guía | Ruta clara: Lección 1 → práctica 12 manos → aprobado |
| Estudio diario | Sesión random; el concepto se diluye | Bloque de 10–20 manos *solo* sobre c-bet / bubble / short |
| Tras un leak | Drill adaptativo útil, pero sin teoría | Lección que enseña el porqué y luego examina |
| Upsell a Coach | Solo más cupo de IA/análisis | Contenido pro exclusivo visible en el árbol |

### 2.2 Diferenciación vs mercado

- **GTO Wizard / Gecko:** drills masivos solver; poca narrativa en español y poca “lección con trama”.
- **Snowie:** sparring continuo; menos currículum por concepto.
- **PokerForgeAI oportunidad:** español nativo + lecciones guiadas + trampas pedagógicas + IA Coach + precio Study, con Coach como capa pro.

### 2.3 Principio rector

> Una lección = **un trabajo mental**. Si el usuario puede aprobar sin entender el concepto, el pack de spots está mal diseñado.

---

## 3. Estado actual y piezas reutilizables

### 3.1 Lo que ya existe

| Pieza | Uso para lecciones |
|-------|-------------------|
| `startGuidedTraining(partialConfig)` | Arranque de sesión con preset |
| Escenarios (`rfi`, `3bet`, `face3bet`, `cbet` vía street, `push`, `steal`, fases MTT) | Tipología de spots |
| Seeds + `replaySnapshot` | Spots **reproducibles** (base de packs fijos) |
| Grading `optima` / `aceptable` / `imprecisa` / `error` | Criterio de acierto |
| Bloques 25/50/100 manos | Modelo de “sesión de lección” (adaptar a 8–20) |
| Guía básica + 4 mini-drills | Contenido fundacional a absorber en L1–L4 Cash |
| `TRAINING_FOCUSES` | Catálogo de temas alineados a leaks |
| Gamificación (racha, rating 700–1800, tiers) | Extender a XP/nivel de Academia |
| Entitlements Free / Study / Coach | Gate de contenido (hoy solo volumen) |
| Fases MTT `early\|mid\|short\|push\|bubble` + ICM spins | Ancla de lecciones torneo |

### 3.2 Gaps a cubrir (producto, no solo UI)

1. Modelo de datos: `Track` → `Module` → `Lesson` → `SpotPack`.
2. Spots **autorados** (cartas, posiciones, board, línea, respuesta esperada, trampa).
3. Modo “decisión única” (mano corta en el nodo pedagógico).
4. Estado de progresión: desbloqueado / bloqueado / premium / % mejor intento.
5. UI de árbol + perfil de nivel.
6. Entitlement por **contenido** (no solo manos/día e IA).
7. Banco de trampas y quizzes de rango.

---

## 4. Modelo pedagógico de una lección

### 4.1 Anatomía fija (todas las lecciones)

```
┌─────────────────────────────────────────────────────────┐
│  A. HEADER: título · formato · dificultad · XP · plan   │
├─────────────────────────────────────────────────────────┤
│  B. TEORÍA (2–4 min lectura)                            │
│     · Concepto en 1 frase                               │
│     · Por qué importa (EV / ICM / frecuencia)           │
│     · Regla práctica memorable                          │
│     · IA Coach: preguntas sugeridas del concepto        │
├─────────────────────────────────────────────────────────┤
│  C. EJEMPLOS (1–2 spots comentados, no puntuados)       │
│     · Mesa estática + explicación + rango rival tip     │
├─────────────────────────────────────────────────────────┤
│  D. SESIÓN DIRIGIDA (N spots fijos)                     │
│     · Feedback inmediato por mano                       │
│     · Trampas mezcladas (~20–30 % del pack)             │
│     · IA Coach opcional tras error (gasta cuota)        │
├─────────────────────────────────────────────────────────┤
│  E. RESULTADO                                           │
│     · % acierto · puntos · vs umbral · desbloqueo       │
│     · Repetir / Siguiente / Pedir explicación IA        │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Tipos de lección (taxonomía interna)

| Tipo | Qué entrena | Fin de mano típico | Manos/sesión |
|------|-------------|--------------------|--------------|
| **A. Decisión binaria/ternaria** | Open / fold; call / fold; c-bet / check | Tras la acción del concepto | 12–16 |
| **B. Frecuencia y sizing** | ¿Bet 33 o 75? ¿3-bet o call?** | Tras sizing o action mix | 14–18 |
| **C. Lectura de rango** | “¿Qué % del rango rival llega aquí?” / elegir combo más probable | Tras responder quiz (sin mesa completa) | 10–14 |
| **D. Línea multi-street** | Barrel / give up / raise | Hasta turn o river según lección | 8–12 |
| **E. ICM / torneo** | Call/fold burbuja, push/fold | Tras decisión ICM | 12–20 |
| **F. Examen de módulo** | Mezcla de trampas del módulo | Mixto | 16–24 |

### 4.3 Criterios de aprobación (recomendados)

| Dificultad | Umbral aprobar | Umbral “oro” (maestría) | Notas |
|------------|----------------|-------------------------|--------|
| Fundamentos | ≥ 70 % óptima+aceptable | ≥ 90 % | `aceptable` cuenta como acierto suave |
| Intermedio | ≥ 75 % | ≥ 92 % | Peso mayor a errores graves |
| Avanzado / Pro | ≥ 80 % | ≥ 95 % | Solo `optima` cuenta pleno; `aceptable` 0,5 |

**Puntuación por mano (propuesta):**

- `optima` = 1,0  
- `aceptable` = 0,6 (fundamentos) / 0,5 (pro)  
- `imprecisa` = 0,2  
- `error` = 0  
- Bonus trampa detectada (si el usuario evita la trampa obvia) = +0,1 al score de sesión (cap)

**Repetición:** se guarda el **mejor % histórico**; el último intento actualiza XP parcial (menor que la primera aprobación).

### 4.4 Duración objetivo

- Teoría + ejemplos: **3–6 min**.  
- Sesión: **8–15 min**.  
- Total lección: **≤ 20 min** (encaja con “calentamiento” del backlog Snowie).

---

## 5. Diseño de spots fijos y trampas

### 5.1 Spot autorado (contrato de contenido)

Cada spot del pack declara:

| Campo | Ejemplo |
|-------|---------|
| `id` | `cash-rfi-btn-01` |
| `formatHub` | `cash` / `spin` / `mtt` |
| `heroPos`, `stackBB`, `effective` | BTN, 100 bb |
| `heroCards` | `AJo` |
| `villainProfile` | fish / reg / nit / maniac (etiqueta pedagógica) |
| `line` | acción previa fija (blinds posted, CO folds…) |
| `board` | opcional según street |
| `decisionNode` | `preflop_rfi` · `flop_cbet` · `bubble_call` … |
| `allowedActions` | subset UI (fold/call/raise o bet sizes) |
| `solution` | acción(es) correctas + freqs si aplica |
| `trapTag` | `none` · `dominated` · `icm_suicide` · `overfold` · `fancy_play` … |
| `teachBack` | 1–2 frases al fallar |
| `rangeHint` | rango rival simplificado para UI post-mano |

### 5.2 Tipos de trampa (banco transversal)

| Trampa | Objetivo pedagógico | Ejemplo |
|--------|---------------------|---------|
| **Dominada / reverse implied** | Evitar opens basura late | KTo UTG a 100 bb cash |
| **Fancy play syndrome** | No check-raise spewy con air vs fish | Flop seco vs calling station |
| **Overfold vs small bet** | Defender vs c-bet 33 % | BB con gutshot + backdoor |
| **Overcall multiway** | Ajustar rangos 3-way | Cold call HJ vs UTG+MP |
| **ICM suicide** | No hero-call burbuja | Mid stack llama shove chip leader |
| **Covered wrong** | Push/fold con stack covered mal | Spin 12 bb shove wide vs short |
| **Sizing tell ignore** | Respetar overbet polar | River overbet sin bluff-catcher |
| **Position blind** | No open igual UTG y BTN | Mismo combo, distinta posición |
| **Blocker misuse** | Bluff con mal blocker | River bluff con 2x que bloquea folds |
| **Sticky second pair** | Pot control / fold turn | Second pair sticky vs triple barrel |

**Regla de diseño:** 20–30 % del pack son trampas; el resto consolida el patrón correcto. Las trampas **nunca** deben ser ambigüedad GTO irresoluble: el teach-back debe ser inequívoco al nivel de la lección.

### 5.3 Manos cortas (decision-point end)

Para lecciones tipo A/B/E:

- El motor presenta el spot hasta el nodo.
- El usuario actúa.
- Se muestra feedback + rango rival tip + teach-back.
- **No se juega** flop/turn/river si no aportan al concepto.

Para tipo D (líneas): se permite 2–3 nodos encadenados del mismo pack, siempre scriptados.

### 5.4 Honestidad de solución

Mientras el motor sea heurístico (no árbol solver):

- Spots fundacionales: soluciones **populares/GTO-lite** ya alineadas con matrices de la app.
- Spots pro: etiquetar “Referencia PokerForge (heurística avanzada)” y, si hay duda, rango de acciones aceptables.
- No prometer “solver exacto” en copy de lección.

---

## 6. Progresión, desbloqueo y planes

### 6.1 Estructura del árbol

```
Escuela de Póker  (menú; admin-only hasta Fase E)
├── Ruta Cash (prioridad P0)
│   ├── M0 Fundamentos
│   ├── M1 Preflop core
│   ├── M2 Postflop core
│   ├── M3 Estrategia & faroles
│   └── M4 Pro (Coach)
├── Ruta Spins
│   ├── M0 Spin basics
│   ├── M1 Ante / steal / iso
│   ├── M2 ICM mid-late
│   └── M3 Pro (Coach)
└── Ruta MTT
    ├── M0 Torneo basics
    ├── M1 Early–Mid
    ├── M2 Short & Push
    ├── M3 Bubble & ITM
    └── M4 Pro (Coach)
```

### 6.2 Estados visuales de una lección

| Estado | Significado | UI |
|--------|-------------|----|
| **Completada** | Umbral superado ≥ 1 vez | Check + **mejor %** + CTA “Repetir → 100 %” |
| **Desbloqueada** | Prerrequisito OK y plan permite | CTA “Empezar” / “Continuar” |
| **Bloqueada (accesible)** | Visible, falta lección previa *o* falta subir % | Candado suave + “Completa Lx” |
| **Plan superior** | Contenido Coach (o Study si user free) | Badge plan + blur/teaser + CTA upgrade |
| **En progreso** | Sesión a medias | Barra parcial |

“Bloqueada pero accesible” = se ve título, dificultad, XP y teaser del concepto; no se puede jugar hasta cumplir regla.

### 6.3 Reglas de desbloqueo

1. Dentro de un módulo: lineal (L1 → L2 → …).  
2. Examen de módulo desbloquea el siguiente módulo.  
3. Rutas Cash / Spins / MTT son **independientes** (no forzar Cash completo para abrir Spins), salvo un **M0 compartido opcional** “Cómo funciona la Escuela” (gratis).  
4. Lecciones pro (Coach) visibles siempre para seducir upsell; jugables solo con plan Coach (o trial).  
5. Study llega ~hasta el 50 % de lecciones de cada ruta (ver §13).

### 6.4 Monetización detallada

| Capa | Gratis | Study | Coach |
|------|--------|-------|-------|
| Vista del árbol completo | Sí | Sí | Sí |
| Lecciones jugables | 1–2 por ruta (o Cash L1–L2 + 1 Spin + 1 MTT) | Hasta mitad (~fundamentos + intermedio temprano) | 100 % |
| Exámenes de módulo mid | No | Sí (módulos abiertos) | Sí |
| Módulos Pro / ICM hard / range pro | Teaser | Teaser | Sí |
| Repetición maestría | En lecciones free | En lecciones Study | Todas |
| IA Coach en lección | Cuota free (3/mes) | 40/mes | 150/mes |
| Spots diarios Escuela | **Consumen el cupo Free de trainer (15 manos/día)** | Ilimitado en lecciones desbloqueadas | Ilimitado |

**Decisión cerrada:** cada mano jugada dentro de una lección descuenta del mismo contador diario Free que Entrenar. Study/Coach siguen ilimitados. El paywall al agotar cupo puede apuntar a Study con copy del tipo “sigue la lección sin límite”.

### 6.5 Trial

El trial Study de 10 días debería desbloquear **contenido Study** del árbol (no Coach pro), para que el usuario “sienta” la mitad del camino y vea el muro pro.

---

## 7. UX visual: evolución, puntos y niveles

### 7.1 Principios de interfaz

- Una composición de **mapa de progresión** (no dashboard de métricas en el primer viewport).
- Jerarquía: **nivel del jugador + ruta activa + siguiente lección** como héroe.
- Evolución visible: camino/nodos con estados de color, % en nodos completados, brillo sutil solo en “siguiente”.
- Evitar cards innecesarias; los nodos del path *son* la interacción.
- Motion: (1) fill de progreso al aprobar, (2) unlock reveal del siguiente nodo, (3) contador XP al sumar puntos.

### 7.2 Elementos permanentes (header Escuela de Póker)

| Elemento | Descripción |
|----------|-------------|
| **Nivel Escuela** | 1–30 (o tiers: Novato → Estudiante → Reg → Coach mente) derivado de XP |
| **XP / puntos** | Suma de primeras aprobaciones + bonuses oro + rachas de lección |
| **Racha de estudio** | Reutilizar gamificación actual |
| **Dominancia por ruta** | 3 barras: Cash / Spins / MTT (% lecciones oro) |
| **Siguiente objetivo** | Una sola CTA primaria |

### 7.3 Vista de lección en el mapa

Cada nodo muestra:

- Número + título corto  
- Icono de tipo (preflop / flop / ICM / rango)  
- Estado (completo / abierto / candado / corona Coach)  
- Si completo: **% mejor** (ej. 86 %) y estrellas 1–3 (aprobar / ≥ umbral oro / 100 %)  
- XP de la lección  

### 7.4 Pantalla de resultado (potente)

- Anillo de % grande.  
- “+120 XP” animado.  
- Comparativa: tu % vs media anónima del spot pack (si hay datos).  
- Lista corta de manos falladas con replay 1-tap.  
- Si aprueba: confetti contenido + “Desbloqueada: C-bet en seco”.  
- Si falla: “Te faltan 2 aciertos” + CTA repetir + CTA IA.

### 7.5 Relación con rating actual

Mantener el **rating de estudio** (700–1800) del entrenador libre.  
Escuela de Póker tiene **XP/Nivel propios** para no contaminar el rating con packs fáciles. Mostrar ambos en perfil, con copy claro:

- Rating = rendimiento en juego libre / import.  
- Nivel Escuela = progreso curricular.

---

## 8. IA Coach en cada paso

### 8.1 Puntos de inserción

| Momento | UX | Consumo cuota |
|---------|-----|---------------|
| Teoría | Chips de preguntas sugeridas del concepto | Sí |
| Tras ejemplo | “¿Por qué este sizing?” | Sí |
| Tras error en spot | “Explícame mi error en 3 frases” (contexto del spot + teach-back) | Sí |
| Fin de sesión | Informe breve del patrón de fallos | Sí (1 informe) |
| Lección bloqueada pro | Teaser: respuesta genérica sin spoiler del pack | No / copy estático |

### 8.2 Contexto mínimo al modelo

Enviar: `lessonId`, concepto, spot id, acción usuario, solución, teach-back, formato.  
Evitar dumps enormes; el teach-back autorado es la ancla (la IA narra, no inventa otra solución).

### 8.3 Preguntas sugeridas por fase (ejemplos)

- RFI: “¿Por qué UTG abre más tight que BTN?”  
- C-bet: “¿Cuándo check-back con top pair débil IP?”  
- Bubble: “¿Por qué el mid-stack debe fold AEVs +EV chip?”  
- Bluff: “¿Qué blockers importan en este river?”  

---

## 9. Currículum Cash

**Stack default:** 100 bb, cash 6-max (núcleo del motor). 9-max solo como variante late en pro.  
**Orden:** simple → pro. **Study** ≈ M0–M2 (parcial M3). **Coach** = resto + M4.

### M0 — Fundamentos de mesa (Gratis → Study)

| ID | Lección | Tipo | Manos | Objetivo | Trampas clave |
|----|---------|------|-------|----------|---------------|
| C-00 | Cómo funciona la Escuela | Onboarding | 0 | Entender nodos, % y planes | — |
| C-01 | Posición y por qué manda | A | 12 | Elegir open/fold según posición con la misma mano | Position blind |
| C-02 | Open-raise (RFI) básico | A | 14 | Memorizar ranges UTG–BTN simplificados | Dominadas UTG |
| C-03 | Fold equity y por qué subir | A | 10 | Distinguir open vs limp mental (siempre open o fold) | Fancy limp |
| C-04 | Examen M0 | F | 16 | Consolidar | Mix |

### M1 — Preflop core (Study)

| ID | Lección | Tipo | Manos | Objetivo | Trampas |
|----|---------|------|-------|----------|---------|
| C-05 | Defender BB vs open | A/B | 16 | Call/fold/3-bet vs opens por posición | Overdefend trash |
| C-06 | 3-bet value y polar light | B | 16 | Construir 3-bet vs CO/BTN | 3-bet spew vs UTG |
| C-07 | Enfrentar 3-bet (continue / 4-bet / fold) | A | 16 | Rangos de defensa por posición | Hero-call dominated |
| C-08 | Squeeze tras open+call | B | 14 | Cuándo squeeze vs flat | Squeeze multiway loco |
| C-09 | Iso-raise vs limps | A | 12 | Aislar tamaño y mano | Overiso trash |
| C-10 | BB vs SB limp | A | 12 | Punish / check option | Overfold BB |
| C-11 | Examen preflop | F | 20 | Mix + trampas | Mix |

### M2 — Postflop core (Study → borde Coach)

| ID | Lección | Tipo | Manos | Objetivo | Trampas |
|----|---------|------|-------|----------|---------|
| C-12 | Textura de flop y plan | C/A | 12 | Clasificar seco / semi / wet | Mal plan en monotone |
| C-13 | C-bet IP en seco | A/B | 16 | Frecuencia y sizing pequeño | C-bet 75 siempre |
| C-14 | C-bet OOP y when to give up | A | 16 | Check range construction lite | Autocbet OOP wet |
| C-15 | Defensa vs c-bet | A | 16 | Continue equity + backdoors | Overfold vs 33 % |
| C-16 | Second barrel (turn) | D | 12 | Value vs bluff vs pot control | Sticky second pair |
| C-17 | River value | A | 12 | Value thin vs fat | Undervalue strong |
| C-18 | Examen postflop | F | 18 | Mix | Mix |

### M3 — Estrategia & faroles (Study parcial / Coach)

| ID | Lección | Tipo | Manos | Plan | Objetivo |
|----|---------|------|-------|------|----------|
| C-19 | Bluff con equity (semi) | D | 12 | Study | Semibluffs con plan |
| C-20 | Bluff river + blockers | A/C | 14 | Coach | Elegir bluffs con blockers |
| C-21 | Bluff-catching | A/C | 14 | Coach | Llamar con bluff-catchers correctos |
| C-22 | Probe / delayed c-bet | D | 12 | Study | Turn lead tras check flop |
| C-23 | Raise vs c-bet (polar) | B | 12 | Coach | No raise mergeado |
| C-24 | Multiway: c-bet y control | A | 14 | Coach | Ajuste 3-way |
| C-25 | Examen estrategia | F | 20 | Coach | Mix |

### M4 — Pro Cash (solo Coach)

| ID | Lección | Tipo | Manos | Objetivo |
|----|---------|------|-------|----------|
| C-26 | 4-bet / cold 4-bet | B | 14 | Polar vs linear por villain |
| C-27 | SRP OOP deep (150 bb mental → 100) | D | 10 | Líneas check-call / check-raise |
| C-28 | Explotación fish vs reg | A | 16 | Mismo spot, dos rivales |
| C-29 | Range vs range (quiz) | C | 14 | Adivinar composición del rango rival |
| C-30 | Node locking mental (frecuencias) | B/C | 12 | Elegir frecuencia correcta 0/25/50/75/100 |
| C-31 | Examen Pro Cash | F | 24 | Certificación interna |

**Totales Cash orientativos:** ~32 nodos · Study juega ~C-00–C-19/C-22 · Coach completo.

---

## 10. Currículum Spins

**Formato:** `spin3`, payouts 2×/3×/5× como variable pedagógica. ICM desde temprano.  
Spots usan stacks 25 → 15 → 10 → 8 bb según módulo.

### M0 — Spin basics (Gratis 1–2 · Study)

| ID | Lección | Manos | Objetivo |
|----|---------|-------|----------|
| S-00 | Anatomía de un Spin (antes/ciegas/ICM lite) | 0–8 | Entender payout y por qué no es cash |
| S-01 | Open steal desde BTN/SB a 20–25 bb | 14 | Robos + folds correctos |
| S-02 | Defensa ciega vs steal | 14 | 3-bet/call/fold ajustado ICM |
| S-03 | Examen M0 | 16 | Mix |

### M1 — Ante-game & presión (Study)

| ID | Lección | Manos | Objetivo |
|----|---------|-------|----------|
| S-04 | Iso y open vs limps cortos | 12 | No overcommit |
| S-05 | 3-bet shove vs flat (stack-off thresholds) | 16 | Elegir shove correctos |
| S-06 | Jugar el chip lead vs short | 14 | Presión sin suicidio |
| S-07 | Jugar short vs cover | 14 | Survive + double spots |
| S-08 | Examen M1 | 18 | Mix |

### M2 — ICM mid-late (Study borde / Coach)

| ID | Lección | Manos | Plan | Objetivo |
|----|---------|-------|------|----------|
| S-09 | Push/fold charts 12–8 bb | 20 | Study | Memorizar bandas |
| S-10 | Call shove ICM (no chip EV) | 16 | Study | Overfold correcto |
| S-11 | Malos spots “+EV chips / −EV $” | 14 | Coach | Trampa ICM suicide |
| S-12 | Ajuste 3× vs 5× payout | 12 | Coach | Más tight en 5× |
| S-13 | Examen ICM | 20 | Coach | Mix |

### M3 — Pro Spins (Coach)

| ID | Lección | Manos | Objetivo |
|----|---------|-------|----------|
| S-14 | Bubble factor mental heads-up pay jump | 12 | Lectura de pay jumps |
| S-15 | Range vs range shove/call | 14 | Quiz + decisión |
| S-16 | Explotación nit vs maniac en spins | 14 | Ajuste rival |
| S-17 | Final exam Spin Pro | 22 | Certificación |

---

## 11. Currículum MTT

**Fases motor:** `early`, `mid`, `short`, `push`, `bubble` (taxonomía actual).  
Honestidad: lecciones MTT enseñan **principios ICM y stack strategy**; no simulan field de 1000 con precisión de solver ICM completo.

### M0 — Torneo basics (Gratis 1 · Study)

| ID | Lección | Manos | Objetivo |
|----|---------|-------|----------|
| T-00 | Stages del torneo y ante | 8 | Identificar fase por stack bb |
| T-01 | Early: cash-like con paciencia | 14 | No spew early |
| T-02 | Antenas de stack (M / big stacks) | 12 | Lectura de mesa |
| T-03 | Examen M0 | 14 | Mix |

### M1 — Mid tournament (Study)

| ID | Lección | Manos | Objetivo |
|----|---------|-------|----------|
| T-04 | Steal antes de la zona corta | 14 | Abrir late |
| T-05 | 3-bet polar mid stacks | 14 | Presión |
| T-06 | Resteal y defense | 14 | BB/SB war |
| T-07 | Examen Mid | 16 | Mix |

### M2 — Short & Push (Study → Coach)

| ID | Lección | Manos | Plan | Objetivo |
|----|---------|-------|------|----------|
| T-08 | Zona 20–12 bb: open/shove | 16 | Study | Thresholds |
| T-09 | Push/fold 12–8 bb | 20 | Study | Charts |
| T-10 | Calling ranges vs shove (chip EV) | 16 | Study | Base |
| T-11 | Calling ranges con ICM | 16 | Coach | Ajuste |
| T-12 | Examen Short | 18 | Coach | Mix |

### M3 — Bubble & ITM (Coach-heavy)

| ID | Lección | Manos | Plan | Objetivo |
|----|---------|-------|------|----------|
| T-13 | Roles en burbuja (short/mid/big) | 12 | Study teaser / Coach play | Identificar rol |
| T-14 | Big stack pressure | 14 | Coach | Aislar shorts |
| T-15 | Mid stack survival | 16 | Coach | Overfold + pick spots |
| T-16 | Short stack ladder | 14 | Coach | Shove timing |
| T-17 | Pay jumps post-ITM | 12 | Coach | No flip innecesario |
| T-18 | Examen Bubble | 20 | Coach | Mix trampas ICM |

### M4 — Pro MTT (Coach)

| ID | Lección | Manos | Objetivo |
|----|---------|-------|----------|
| T-19 | Final table ICM intro | 12 | Conceptos FT |
| T-20 | Chip EV vs $EV drills | 14 | Comparar dos respuestas |
| T-21 | Range reading en burbuja | 12 | Quiz |
| T-22 | Examen Pro MTT | 22 | Certificación |

---

## 12. Módulos transversales (rangos, estrategia, pro)

Insertables en las tres rutas o como **ruta 4 opcional: Laboratorio de Rangos** (recomendado Coach + parte Study).

### 12.1 Laboratorio de rangos

| ID | Lección | Formato | Objetivo |
|----|---------|---------|----------|
| R-01 | Matriz 13×13: leer un range chart | Quiz UI | Familiaridad con la matriz de la app |
| R-02 | Construir RFI BTN en 60 s | Interactive matrix | Memoria muscular |
| R-03 | Dado un board, % de rango que conecta | C | Flop texture × range |
| R-04 | Eliminación de combos (blockers) | C | Contar combos |
| R-05 | Asignar rango rival tras línea | C | “Villain bet-bet-shove: ¿polar o merge?” |
| R-06 | Pro: node frequencies | C | Elegir mix correcto |

### 12.2 Conceptos pro (catálogo Coach)

- Polar vs linear.  
- Caped ranges y por qué bet small.  
- Protection bets.  
- Minimum defense frequency (MDF) lite.  
- Equity realization OOP.  
- Explotación sistemática (population tendencies ES microlímites).  
- Multiway pot geometry.  
- ICM pressure multipliers (narrados).  

Cada concepto pro = 1 lección tipo teoría corta + 12 spots + 1 quiz de rango.

---

## 13. Mapa de lecciones vs planes

### 13.1 Regla “hasta la mitad en Study”

Definición operativa por ruta:

| Ruta | Total lecciones jugables (aprox.) | Gratis | Study (≈50 %) | Coach |
|------|-----------------------------------|--------|---------------|-------|
| Cash | 32 | C-00–C-02 | C-00–C-18 + C-19/C-22 | Todas |
| Spins | 18 | S-00–S-01 | S-00–S-10 | Todas |
| MTT | 23 | T-00–T-01 | T-00–T-10 + teaser T-13 | Todas |
| Rangos | 6 | R-01 | R-01–R-03 | Todas |

Los nodos Coach se muestran en el mapa con badge **Coach** y preview del concepto.

### 13.2 Por qué esto convierte

- Free prueba el loop (teoría → spots → %).  
- Study da sensación de progresión real (~semanas de contenido).  
- Coach es el único sitio con **burbuja, bluff construction, range pro, exámenes finales** — valor distinto a “más IA”, comunicable en pricing.

---

## 14. RoadMap de entrega por fases

> Complejidad técnica y de contenido, no calendario.  
> **Por dónde empezar:** Fase A (esqueleto admin-only) → Fase B (1 lección jugable end-to-end) → ampliar contenido. No abrir Spins/MTT ni UI pública hasta que el loop Cash esté validado por admin.

### Decisiones de producto que condicionan las fases

| Decisión | Valor |
|----------|-------|
| Nombre del menú | **Escuela de Póker** |
| Cupo Free | Las manos de lección **consumen** las 15/día del trainer |
| Visibilidad inicial | Tab/menú **solo si `isAdmin`** (flag o rol admin existente) |
| Primera ruta | **Cash** (núcleo del motor) |
| Apertura a usuarios | Solo tras validar loop + 1 módulo Cash en admin |

```
Admin-only ──────────────────────────────────────► Beta usuarios ──► GA
   A          B           C           D
 esqueleto  1 lección   M0 Cash    M1 + gates
              E2E        completo   Study/Free
```

---

### Fase A — Esqueleto “Escuela de Póker” (admin-only) ← **EMPEZAR AQUÍ**

**Objetivo:** que el admin vea la opción en el menú y una pantalla vacía creíble, sin romper el producto para el resto.

| Entrega | Detalle |
|---------|---------|
| Tab/menú | Label **Escuela de Póker**; `goToTab('school')` (o id equivalente) |
| Gate visibilidad | Render del ítem solo para administrador; usuarios normales no ven nada |
| Shell UI | Header (nivel/XP placeholder), selector de ruta Cash (Spins/MTT disabled o “Próximamente”), lista/mapa stub de nodos |
| Copy | Título + 1 frase de valor; sin paywall aún |
| Telemetría mínima | `school_tab_open` (solo admin) |

**Fuera de alcance:** spots, progreso cloud, IA, gates de plan.  
**Criterio de hecho:** admin entra, ve el hub; cuenta free/study normal no ve el menú.  
**Por qué primero:** desbloquea iteración visual y de navegación sin deuda de contenido.

---

### Fase B — Vertical slice: 1 lección Cash jugable E2E

**Objetivo:** demostrar el producto completo con **una sola lección** (recomendado: **C-02 Open-raise / RFI básico**).

| Entrega | Detalle |
|---------|---------|
| Contrato `Lesson` + `SpotPack` | JSON versionado (brief Anexo A) |
| Spot runner scripted | Forzar cartas/posición/línea; **corte en nodo** (fold/call/raise); grading existente |
| Flujo lección | Teoría corta → 1 ejemplo → N spots (p. ej. 12) → pantalla resultado con % |
| Cupo Free | Cada spot llama al mismo `canStartTrainerHand` / consumo diario |
| Progreso local o cloud mínimo | `bestScore`, `attempts`, `passed` para esa lección |
| Desbloqueo stub | Nodo C-03 visible bloqueado tras aprobar C-02 (aunque C-03 aún no exista jugable) |
| Admin-only | Sigue oculto al resto |

**Criterio de hecho:** admin completa C-02, ve %, agota cupo Free si prueba con cuenta free admin/demo, puede repetir.  
**Por qué segundo:** valida el 80 % del riesgo técnico (runner + cupo + UI de resultado) antes de autorar decenas de packs.

---

### Fase C — Módulo M0 Cash completo (admin dogfood)

**Objetivo:** ruta jugable C-00 → C-04 (fundamentos) con desbloqueo lineal y mapa con estados.

| Entrega | Detalle |
|---------|---------|
| Contenido | C-00 (onboarding Escuela), C-01 posición, C-02 RFI, C-03 fold equity, C-04 examen |
| Mapa de nodos | Completada (con %) / desbloqueada / bloqueada |
| Umbrales | Aprobar ≥70 %; oro ≥90 %; repetir para mejorar % |
| XP/Nivel v1 | Sumar XP al aprobar; nivel Escuela básico |
| Trampas | 20–25 % en packs M0 |
| Persistencia cloud | Sync progreso en cuenta (no solo localStorage) |
| IA Coach | Chips de preguntas en pantalla de teoría (cuota IA normal) |

**Criterio de hecho:** admin puede “pasar el módulo” de punta a punta en una sesión de dogfood.  
**Aún admin-only.**

---

### Fase D — Gates de plan + preparación de beta

**Objetivo:** reglas Free / Study / Coach sobre el árbol Cash, todavía sin abrir el menú a todos (o abrir a lista blanca).

| Entrega | Detalle |
|---------|---------|
| `canPlayLesson(lessonId)` | Free: C-00–C-02 · Study: hasta ~mitad M1/M2 · Coach: nodos pro (aunque vacíos = teaser) |
| UI plan superior | Badge Coach / Study en nodos; CTA upgrade |
| Paywall cupo | Al 15/15 en lección → modal Study (mismo entitlement trainer) |
| Flag feature | `schoolEnabledForUser` = admin **o** allowlist beta **o** 100 % (GA) |
| Analytics | `lesson_start/complete/fail`, `lesson_blocked_plan`, `lesson_quota_hit` |

**Criterio de hecho:** cuenta free admin ve muro en C-03; Study puede más; flag permite enseñar a 1–2 betas sin menú global.

---

### Fase E — Apertura controlada + M1 Preflop Cash

**Objetivo:** primer valor público + más contenido Study.

| Entrega | Detalle |
|---------|---------|
| Visibilidad | Menú visible para todos (o % rollout); quitar admin-only |
| Contenido | C-05–C-11 (defensa BB, 3-bet, face 3-bet, squeeze, iso, examen) |
| UX resultado | Anillo %, lista de fallos, replay 1-tap |
| Onboarding | CTA desde Inicio / Guía básica → Escuela (mapa Anexo C) |
| Métricas producto | D1 completa ≥1 lección; conversión tras muro Free |

**Por dónde “lanzar” al usuario:** aquí, no antes.

---

### Fase F — Postflop Cash + maestría visual

| Entrega | Detalle |
|---------|---------|
| Contenido | C-12–C-18 (textura, c-bet IP/OOP, defensa, barrel, river, examen) |
| Maestría | Estrellas / % histórico / empujar al 100 % |
| IA | Informe breve fin de sesión (1 consulta) |
| Polish motion | Unlock reveal, XP tick, fill de progreso |

---

### Fase G — Ruta Spins

| Entrega | Detalle |
|---------|---------|
| Activar ruta Spins en el hub | Ya no “Próximamente” |
| Contenido Study | S-00–S-10 (steal, defensa, shove, push/fold, ICM call) |
| Payout | Variable 2×/3×/5× en briefs de lección |
| Cupo Free | Igual regla (1–2 lecciones Spins free) |

---

### Fase H — Ruta MTT + burbuja (Coach)

| Entrega | Detalle |
|---------|---------|
| Contenido Study | T-00–T-10 (early/mid/short/push) |
| Contenido Coach | T-13–T-18 burbuja/ITM + teasers visibles en Study |
| Copy honestidad | Principios ICM, no solver de field completo |
| Upsell | Nodos burbuja como gancho Coach |

---

### Fase I — Laboratorio de rangos + packs Pro

| Entrega | Detalle |
|---------|---------|
| Quizzes matriz 13×13 | R-01–R-03 Study; R-04–R-06 Coach |
| Pro Cash/Spins/MTT | C-26–C-31, S-14–S-17, T-19–T-22 |
| Certificación interna | Badge de ruta completada (opcional share) |

---

### Fase J — Personalización y cierre del loop con leaks

| Entrega | Detalle |
|---------|---------|
| Bridge leaks → lección | Desde Errores/Stats: “Practica en Escuela: C-15” |
| Map `TRAINING_FOCUSES` → `lessonId` | Sustituye solo el drill random cuando exista lección |
| A/B umbrales | Ajustar pass rate según datos reales |

---

### Resumen: orden de arranque

| Orden | Fase | Pregunta que responde | ¿Usuario final lo ve? |
|-------|------|------------------------|------------------------|
| **1** | **A** Esqueleto menú admin | ¿Cabe en la app? | No (solo admin) |
| **2** | **B** 1 lección E2E | ¿Funciona el runner + cupo? | No |
| **3** | **C** M0 Cash | ¿Se siente como curso? | No |
| **4** | **D** Gates + flag beta | ¿Monetiza y se puede beta? | Allowlist |
| **5** | **E** GA menú + M1 | ¿Activa y convierte? | **Sí** |
| 6 | F Postflop | ¿Retiene? | Sí |
| 7 | G Spins | ¿Cubre formato 2? | Sí |
| 8 | H MTT/burbuja | ¿Upsell Coach? | Sí |
| 9 | I Rangos/Pro | ¿Diferencia Coach? | Sí |
| 10 | J Leaks→Escuela | ¿Cierra el producto? | Sí |

### Dependencias técnicas (checklist de ingeniería)

| Necesidad | Fase mínima |
|-----------|-------------|
| Tab + `isAdmin` gate | A |
| Spot runner scripted + decision-end | B |
| Consumo cupo Free en lección | B |
| Packs JSON + selftests de solución | B–C |
| Progreso cloud `lessonProgress` | C |
| `canPlayLesson` + badges plan | D |
| Feature flag apertura | D–E |
| Analytics embudo Escuela | D |
| ICM/payout en briefs Spins/MTT | G–H |

---

## 15. Riesgos, honestidad del motor y métricas de éxito

### 15.1 Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Prometer GTO solver en spots autorados | Copy “referencia PokerForge”; rangos alineados a matrices app |
| MTT/Spins poco profundos vs cash | Currículum de principios + trampas ICM; no simular campos enormes |
| Grinding packs memorizando respuestas | Rotar orden, variantes isomorfas (suits), trampas espejo |
| Inflación de XP | Caps diarios; menos XP en repeticiones |
| Confundir “Coach” plan vs “IA Coach” | Copy UI: plan **Coach** · función **IA Coach** |
| Contenido caro de producir | Empezar Cash M0–M1; templates de spot |

### 15.2 Métricas de éxito

| Métrica | Señal |
|---------|-------|
| D1: inicio C-01 | Activación |
| D1: aprueba ≥ 1 lección | Aha moment |
| D7: lecciones distintas ≥ 3 | Retención |
| Click en nodo Coach bloqueado | Intención upsell |
| Conversión Free→Study tras muro L3 | Monetización Study |
| Conversión Study→Coach tras teaser bubble/bluff | Monetización Coach |
| % oro en lecciones core | Calidad de aprendizaje |
| Uso IA en lección vs libre | Valor cuota IA |

### 15.3 Encaje con roadmap agosto 2026

El estudio de producto prioriza activación (trial, import, bloque con resultado). **Escuela de Póker** es ese bloque con resultado — superior al calentamiento genérico 15 min — y debería listarse como iniciativa P0/P1 de crecimiento junto a trial UX, no como “más solver”. Arranque admin-only (Fases A–C) reduce riesgo de UX a medias.

---

## 16. Glosario y decisiones

### 16.1 Glosario de producto

| Término | Significado |
|---------|-------------|
| **Escuela de Póker** | Nombre del menú / superficie de lecciones |
| **Ruta** | Cash / Spins / MTT (/ Rangos) |
| **Lección** | Teoría + ejemplos + sesión dirigida |
| **Spot pack** | Lista ordenada/barajada de spots fijos |
| **Trampa** | Spot diseñado para castigar el error típico del concepto |
| **Maestría** | Mejor % ≥ umbral oro / 100 % |
| **Study / Coach** | Planes de suscripción |
| **IA Coach** | Asistente Gemini, no el plan |

### 16.2 Decisiones cerradas

1. Nombre de menú: **Escuela de Póker**.  
2. Manos de lección **consumen cupo Free** del trainer (15/día).  
3. Visibilidad inicial: **solo administrador**; apertura en Fase E (o beta allowlist en D).

### 16.3 Decisiones aún abiertas

1. ¿Spins/MTT se abren desde el hub en GA o tras completar C-02 Cash? (recomendado: visibles en hub, CTA a Cash).  
2. ¿Exámenes de módulo obligatorios u opcionales? (recomendado: obligatorios).  
3. ¿En fundaciones: solo acción correcta + tip, o también frecuencias? (recomendado: tip; freqs desde intermedio).  
4. ¿Certificados compartibles al completar ruta Coach?

---

## Anexo A — Plantilla de brief de lección (para autores)

```yaml
id: C-13
title: C-bet IP en flop seco
route: cash
module: M2
plan: study
difficulty: intermediate
xp: 120
pass_threshold: 0.75
gold_threshold: 0.92
hands: 16
decision_end: true
concept: >
  En flops secos como K72r, el agresor IP c-betea alto con sizing pequeño
  para negar equity y proteger su range advantage.
examples:
  - id: ex1
    narrative: "BTN vs BB, flop K♠7♦2♣, hero A♠Q♠ → bet 33%."
traps_ratio: 0.25
ai_suggested_questions:
  - "¿Por qué sizing pequeño y no 75% en seco?"
  - "¿Qué manos check-back IP aquí?"
spot_pack: cash-cbet-ip-dry-v1
```

## Anexo B — Prioridad de autoría de packs

1. `cash-rfi-positions-v1` (C-01–C-02)  
2. `cash-bb-defend-v1` (C-05)  
3. `cash-3bet-v1` (C-06–C-07)  
4. `cash-cbet-ip-dry-v1` (C-13)  
5. `spin-steal-defend-v1` (S-01–S-02)  
6. `mtt-pushfold-v1` (T-09)  
7. `mtt-bubble-roles-v1` (T-13–T-16, Coach)  
8. `range-lab-v1` (R-01–R-03)

## Anexo C — Relación con Guía básica actual

La Guía básica (8 secciones + 4 mini-drills) **no se elimina**: se convierte en material de apoyo y se mapea a lecciones:

| Sección Guía | Lección Escuela |
|--------------|-----------------|
| Hold'em / manos / posiciones | C-00, C-01 |
| Acciones / RFI / 3-bet | C-02, C-06 |
| GTO intro | C-00 + tip en M1 |
| Mini-drill RFI | Sesión de C-02 |
| Mini-drill 3-bet / face3bet | C-06 / C-07 |
| Mini-drill flop | C-13 entrada |
| Preguntas IA | Chips por lección |

---

*Fin del estudio. **Siguiente paso de implementación:** Fase A (menú Escuela de Póker solo admin) y, en cuanto el shell exista, Fase B (C-02 RFI end-to-end con cupo Free).*
