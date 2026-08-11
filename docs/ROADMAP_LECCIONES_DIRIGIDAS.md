# RoadMap — Lecciones dirigidas (Cash · Spins · MTT)

> Estudio de producto y diseño pedagógico para un sistema de **entrenamiento dirigido por lecciones** en PokerForgeAI.  
> **Alcance de este documento:** análisis, currículum, monetización, UX de progresión y fases de entrega. **Sin implementación de código.**  
> Complementa: `ESTUDIO_PRODUCTO_Y_MERCADO_AGOSTO_2026.md`, Guía básica actual (`js/beginner-guide.js`), taxonomía de formatos (`js/engine/format/taxonomy.js`), IA Coach y planes Gratis / Study / Coach.  
> Fecha: agosto 2026 · Producto: PokerForgeAI (PokerTrainer)

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Problema que resolvemos](#2-problema-que-resolvemos)
3. [Estado actual y piezas reutilizables](#3-estado-actual-y-piezas-reutilizables)
4. [Modelo pedagógico de una lección](#4-modelo-pedagógico-de-una-lección) (incluye [§4.5 voz pedagógica](#45-voz-pedagógica-explicaciones))
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

**Veredicto de producto:** es el mayor salto de *activación + retención + upsell a Coach* posible sin construir un solver. Reutiliza `startGuidedTraining`, grading EV, seeds/replay y IA Coach; añade **contenido autorado + estado de progresión + UI de skill tree**.

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

### 4.5 Voz pedagógica (explicaciones)

Las lecciones hablan como un **profesor a sus alumnos**, no como un cheat-sheet ni un manual de solver.

| Regla | Qué hacer | Qué evitar |
|-------|-----------|------------|
| **Natural** | Frases completas, tono oral claro | Telegramas (`ATo UTG fold.`) y anglicismos sin ancla |
| **Breve pero no telegráfica** | 2–4 frases por bullet de teoría; teach-back 1–3 frases | Un solo eslogan; párrafos de media página |
| **Concepto la 1ª vez** | Nombre + explicación inline: *limpear (igualar la ciega grande para entrar en la mano)* | Usar jerga cruda (`limp`, `FE`, `OOP`) sin decir qué es |
| **No repetir definiciones** | Si M0 ya explicó *fold equity* en C-03, C-04+ lo usa sin redefinir | Copiar el mismo glosario en cada lección |
| **Un trabajo mental** | La teoría prepara solo el concepto de esa lección | Meter sizing, SB y 3-bet en la misma página “por si acaso” |

**Orden de introducción de vocabulario en Cash M0 (referencia de autoría):**

1. **C-00** — lección, spots fijos, umbral, cupo del entrenador.  
2. **C-01** — posiciones (UTG→BTN, SB/BB), early/late, *open* (subir primero), *fold*.  
3. **C-02** — *RFI*, *limpear/limp*, por qué en cash moderno es open o fold; apuntar al menú **Rangos** para estudiar RFI por posición.  
4. **C-03** — *fold equity*.  
5. **C-04** — *sizing* en *bb* (ciegas grandes).  
6. **C-05** — SB vs BTN, *fuera de posición (OOP)*.  
7. **C-06** — examen: cero vocabulario nuevo; solo aplicar.

**Teach-back:** misma voz. Recuerda *por qué* falló en esa posición/mano; no inventes otra solución ni reexpliques el glosario entero.

Implementación de referencia: `js/school-data.js` (cabecera del archivo + textos C-00…C-06).

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
| `teachBack` | 1–3 frases de profesor al fallar (natural; sin redefinir conceptos ya vistos) |
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
Academia
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
3. Rutas Cash / Spins / MTT son **independientes** (no forzar Cash completo para abrir Spins), salvo un **M0 compartido opcional** “Cómo funciona la Academia” (gratis).  
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
| Spots diarios Academia | Cuenta contra 15 manos/día **o** cuota aparte “lecciones” (ver decisión abierta) | Ilimitado en lecciones desbloqueadas | Ilimitado |

**Recomendación de producto:** las manos de Academia **comparten** el cupo de trainer en Free (simplicidad), pero en Study/Coach son ilimitadas como el entrenador. Alternativa premium: cuota diaria separada solo Free para no quemar las 15 en teoría.

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

### 7.2 Elementos permanentes (header Academia)

| Elemento | Descripción |
|----------|-------------|
| **Nivel Academia** | 1–30 (o tiers: Novato → Estudiante → Reg → Coach mente) derivado de XP |
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
La Academia tiene **XP/Nivel propios** para no contaminar el rating con packs fáciles. Mostrar ambos en perfil, con copy claro:

- Rating = rendimiento en juego libre / import.  
- Nivel Academia = progreso curricular.

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
| C-00 | Cómo funciona la Academia | Onboarding | 0 | Entender nodos, % y planes | — |
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

> Estimación en **complejidad técnica y de contenido**, no en calendario.

### Fase 0 — Diseño cerrado (doc + prototipos)

**Entregables:** este RoadMap; wireframes del mapa; contrato JSON de `Lesson` / `SpotPack`; umbrales de aprobación; matriz plan↔lección.  
**Riesgo bajo.** Sin código de producto aún (sí puede haber mock HTML aparte si se desea).

### Fase 1 — MVP Academia Cash (P0 activación)

**Alcance:**

- Nueva superficie “Academia” (tab o hub en Inicio / Guía).  
- Modelo de progreso en cloud (`lessonProgress`).  
- 8–10 lecciones Cash M0–M1 con packs fijos (manos cortas).  
- Estados visuales básicos + % + desbloqueo lineal.  
- Gate Free/Study (sin módulos Coach aún).  
- IA Coach chips en teoría.

**Éxito:** % usuarios nuevos que completan C-02 en D1; uplift trial→Study.

### Fase 2 — Postflop Cash + repetición maestría

- C-12–C-18, trampas postflop, anillo de resultado, estrellas, XP/Nivel Academia.  
- Repetir para 100 %.  
- Informe IA fin de sesión.

### Fase 3 — Spins path

- S-00–S-10 (Study) con ICM grading existente.  
- Integrar payout preset como variable de lección.

### Fase 4 — MTT path + Bubble Coach

- T-00–T-10 Study; T-13–T-18 Coach.  
- Copy de honestidad ICM.  
- Upsell fuerte en nodos burbuja.

### Fase 5 — Laboratorio de rangos + Pro packs

- Quizzes de matriz; C-26–C-31; S/T pro exams.  
- Frecuencias / node locking lite.  
- Certificaciones internas (badge perfil).

### Fase 6 — Personalización

- Sugerir lección desde leaks (`TRAINING_FOCUSES` → `lessonId`).  
- “Tu fuga top = Lección C-15” CTA desde Errores/Stats.  
- A/B de umbrales de aprobación.

### Dependencias técnicas (para planificación futura)

| Necesidad | Notas |
|-----------|-------|
| Spot runner “scripted” | Extender engine para forzar hole cards, board, línea y corte en nodo |
| Persistencia progreso | Tabla o payload cloud por `lessonId`: bestScore, attempts, unlockedAt |
| Entitlement contenido | Nuevo flag `canPlayLesson(lessonId)` además de manos/día |
| Authoring pipeline | JSON/YAML packs versionados + selftests de solución |
| Analytics | `lesson_start`, `lesson_complete`, `lesson_fail`, `lesson_unlock_block_plan` |

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

El estudio de producto prioriza activación (trial, import, bloque con resultado). La Academia **es** ese bloque con resultado — superior al calentamiento genérico 15 min — y debería listarse como iniciativa P0/P1 de crecimiento junto a trial UX, no como “más solver”.

---

## 16. Glosario y decisiones abiertas

### 16.1 Glosario de producto

| Término | Significado |
|---------|-------------|
| **Academia** | Nombre propuesto de la superficie de lecciones |
| **Ruta** | Cash / Spins / MTT (/ Rangos) |
| **Lección** | Teoría + ejemplos + sesión dirigida |
| **Spot pack** | Lista ordenada/barajada de spots fijos |
| **Trampa** | Spot diseñado para castigar el error típico del concepto |
| **Maestría** | Mejor % ≥ umbral oro / 100 % |
| **Study / Coach** | Planes de suscripción |
| **IA Coach** | Asistente Gemini, no el plan |

### 16.2 Decisiones abiertas (para producto)

1. ¿Nombre final: **Academia**, **Ruta de estudio**, **Lecciones**?  
2. ¿Manos de lección consumen cupo Free trainer o tienen cupo propio?  
3. ¿Spins/MTT se abren desde día 1 o tras C-02 Cash? (recomendado: día 1 independientes + CTA a Cash).  
4. ¿Exámenes de módulo obligatorios u opcionales para avanzar? (recomendado: obligatorios).  
5. ¿Mostrar solución GTO freqs en fundaciones o solo acción correcta? (recomendado: acción + tip; freqs desde intermedio).  
6. ¿Certificados compartibles al completar ruta Coach? (alto valor marketing).

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
# Voz: profesor (§4.5). Primera vez que sale un término en la ruta → explícalo;
# si ya salió en lecciones previas del módulo, úsalo sin redefinir.
concept: >
  Cuando has sido el agresor preflop y el flop es seco (pocas cartas conectadas,
  p. ej. K-7-2 de distintos palos), en posición conviene apostar a menudo
  con un tamaño pequeño: niegas equity barata al rival y aprovechas que tu
  rango llega más fuerte a ese board.
examples:
  - id: ex1
    narrative: >
      BTN vs BB, flop K♠7♦2♣, tú con A♠Q♠. Aquí un c-bet (~1/3 del bote)
      es la línea habitual: muchas manos del BB no conectan y te dejan pasar.
traps_ratio: 0.25
ai_suggested_questions:
  - "¿Por qué sizing pequeño y no 75% en seco?"
  - "¿Qué manos check-back IP aquí?"
spot_pack: cash-cbet-ip-dry-v1
new_terms: # solo los que esta lección introduce por primera vez en la ruta
  - "c-bet (continuation bet): apostar de nuevo en el flop tras haber subido preflop"
  - "flop seco: board con poca conectividad (pocos draws obvios)"
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

| Sección Guía | Lección Academia |
|--------------|------------------|
| Hold'em / manos / posiciones | C-00, C-01 |
| Acciones / RFI / 3-bet | C-02, C-06 |
| GTO intro | C-00 + tip en M1 |
| Mini-drill RFI | Sesión de C-02 |
| Mini-drill 3-bet / face3bet | C-06 / C-07 |
| Mini-drill flop | C-13 entrada |
| Preguntas IA | Chips por lección |

---

*Fin del estudio. Próximo paso natural tras validación de producto: Fase 0 wireframes + contrato JSON de SpotPack, aún sin lógica de motor hasta cerrar el brief de las 4 primeras lecciones Cash.*
