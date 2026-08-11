# RoadMap — Lecciones dirigidas (Cash · Spins · MTT) — v2

> Estudio de producto y diseño pedagógico para **Escuela de Póker** en PokerForgeAI.  
> **Alcance:** análisis, currículum ampliado, monetización, UX y fases de entrega. **Sin implementación de código.**  
> Complementa: `ESTUDIO_PRODUCTO_Y_MERCADO_AGOSTO_2026.md`, `js/beginner-guide.js`, taxonomía de formatos, IA Coach, planes Gratis / Study / Coach.  
> Fecha: agosto 2026 — **v2 (revisión currículum)**  
>  
> **Decisiones cerradas:** nombre de menú **Escuela de Póker** · manos de lección **consumen cupo Free** (15/día del trainer) · menú **solo visible para administrador** hasta apertura controlada · M0 Cash completo en Gratis.

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
16. [Glosario y decisiones](#16-glosario-y-decisiones)

---

## 1. Resumen ejecutivo

**Escuela de Póker** convierte el entrenador libre de PokerForgeAI en un sistema curricular ordenado: teoría breve → ejemplos → sesión de spots fijos con trampas → umbral de acierto → desbloqueo. Tres rutas independientes (Cash, Spins, MTT) más un Laboratorio de Rangos transversal.

**Cambio v2:** se amplían sustancialmente las lecciones de los tres formatos para que:

- **Gratis** incluya el **módulo M0 completo de Cash** (fundamentos: posición, RFI, fold equity, examen) y una lección de presentación de Spins y MTT.
- **Study** tenga un recorrido largo y progresivo (preflop completo, postflop completo, estrategia intermedia, NL2→NL50 específico, Spins hasta ICM, MTT hasta push/fold + bubble temprana).
- **Coach** sea visiblemente distinto: todo lo pro, conceptos de NL75–NL100, bluff construction avanzada, spots de burbuja y final table, exploits sistemáticos, exámenes de certificación.

**Resumen de volumen v2:**

| Ruta | Total lecciones | Gratis | Study | Coach |
|------|-----------------|--------|-------|-------|
| Cash | ~58 | M0 completo (C-00–C-07) | M1–M4 (C-08–C-40) | M5–M6 (C-41–C-58) |
| Spins | ~32 | S-00–S-02 | S-03–S-20 | S-21–S-32 |
| MTT | ~38 | T-00–T-02 | T-03–T-24 | T-25–T-38 |
| Rangos | ~10 | R-00–R-01 | R-02–R-06 | R-07–R-10 |

---

## 2. Problema que resolvemos

### 2.1 Dolor del usuario

| Momento | Hoy | Con Escuela v2 |
|---------|-----|-----------------|
| Primera hora | Duda por dónde empezar | M0 gratis: ruta clara y manejable |
| Estudio diario | Sesión random genérica | Lección en 15 min con un solo concepto |
| Avanzar en micros | Sin guía NL2→NL50 | Módulos de nivel específico |
| Spins/MTT | Formato diferente sin guía | Rutas propias con ICM explícito |
| Upsell | Solo cuota de IA mayor | Contenido pro visible y bloqueado |

### 2.2 Principio rector

> Una lección = un trabajo mental. Si se puede aprobar sin entender el concepto, el pack está mal diseñado.

---

## 3. Estado actual y piezas reutilizables

| Pieza | Uso |
|-------|-----|
| `startGuidedTraining(partialConfig)` | Arranque de sesión preconfigurada |
| `playAnalysisHand(force, playConfig)` + `pendingForce` | Spots fijos con cartas/posición scriptadas |
| `schoolDecisionEnd` flag (implementado) | Corte en el nodo pedagógico |
| Grading `optima / aceptable / imprecisa / error` | Criterio de acierto |
| Seeds + `replaySnapshot` | Reproducibilidad |
| Fases MTT + ICM / Spins ICM | Ancla para lecciones torneo |
| Gamificación (racha, rating 700–1800) | Extender a XP/nivel Escuela |
| `stats.school` + merge cloud (implementado) | Persistencia de progreso |
| Entitlements Free / Study / Coach | Gate de contenido |
| Guía básica + mini-drills | Contenido M0 reutilizable |

---

## 4. Modelo pedagógico de una lección

```
┌─────────────────────────────────────────────────────────────┐
│  A. Header: título · formato · dificultad · XP · plan badge │
├─────────────────────────────────────────────────────────────┤
│  B. Teoría (2–4 min)                                        │
│     Concepto en 1 frase · porqué importa · regla práctica   │
│     IA Coach: preguntas sugeridas                           │
├─────────────────────────────────────────────────────────────┤
│  C. Ejemplo (1–2 spots comentados, sin puntuación)          │
├─────────────────────────────────────────────────────────────┤
│  D. Sesión dirigida (N spots fijos, 20–30 % trampas)        │
│     Feedback inmediato · IA Coach opcional tras error       │
├─────────────────────────────────────────────────────────────┤
│  E. Resultado: % · XP · desbloqueo · repetir para 100 %    │
└─────────────────────────────────────────────────────────────┘
```

### 4.1 Tipos de lección

| Tipo | Qué entrena | Manos/sesión |
|------|-------------|--------------|
| **A** Decisión binaria/ternaria | Open/fold, call/fold, c-bet/check | 12–16 |
| **B** Frecuencia y sizing | Bet 33 vs 75, 3-bet vs call | 14–18 |
| **C** Lectura de rango | Quiz: ¿qué % del rango llega aquí? | 10–14 |
| **D** Línea multi-street | Barrel / give up / raise (2–3 nodos) | 8–12 |
| **E** ICM / torneo | Call/fold con $EV, push/fold | 12–20 |
| **F** Examen de módulo | Mix de trampas del módulo | 16–24 |
| **G** Nivel NL específico | Exploits de población por nivel | 14–18 |

### 4.2 Criterios de aprobación

| Dificultad | Aprobar | Oro | Comentario |
|------------|---------|-----|------------|
| Fundamentos | ≥ 70 % | ≥ 90 % | `aceptable` cuenta pleno |
| Intermedio | ≥ 72 % | ≥ 90 % | `aceptable` = 0,6 pts |
| Avanzado | ≥ 75 % | ≥ 92 % | `aceptable` = 0,5 pts |
| Pro | ≥ 80 % | ≥ 95 % | solo `optima` cuenta pleno |

---

## 5. Diseño de spots fijos y trampas

### 5.1 Contrato de spot autorado

| Campo | Descripción |
|-------|-------------|
| `id` | slug único (`cash-rfi-btn-07`) |
| `type` | RFI, vsRFI, face3bet, 3bet, squeeze, flop, turn, river… |
| `heroPos`, `stackBB` | Posición y stack hero |
| `forceDeal` | `heroCards`, `villainCards`, `board`, `villainPos` |
| `decisionNode` | `preflop_rfi`, `flop_cbet`, `bubble_call`… |
| `solution` | Acción(es) correctas + frecuencias si aplica |
| `trapTag` | `none`, `dominated`, `overfold`, `icm_suicide`, `fancy_play`… |
| `teachBack` | 1–2 frases al fallar |
| `rangeHint` | Rango rival simplificado post-mano |
| `nlContext` | `any`, `nl2`, `nl10`, `nl25`, `nl50`, `nl75`, `nl100` |

### 5.2 Banco de trampas (ampliado)

| Trampa | Concepto puesto a prueba |
|--------|--------------------------|
| Dominated UTG | RFI tight early |
| Position blind | Misma mano, distinta posición |
| Fancy play syndrome | No limp ni slowplay innecesario |
| Overfold vs small bet | Defender vs 33 % |
| Overcall multiway | Ajustar rangos 3-way |
| ICM suicide | No hero-call burbuja |
| Covered wrong | Push/fold con stack covered |
| Sizing tell ignore | Respetar overbet polar |
| Sticky second pair | Pot control vs triple barrel |
| NL2 fish over-bluff | Fold menos vs station |
| NL50 reg 3-bet light | Ajustar defensa vs reg |
| Blockers misuse | Elegir bluffs con buenos blockers |
| Probe delay | Lead turn tras check flop |
| Short stack limp | Push/fold en lugar de limp-call |
| FT pressure | Call/fold con pay jump en mesa final |

---

## 6. Progresión, desbloqueo y planes

### 6.1 Árbol revisado (v2)

```
Escuela de Póker  (admin-only hasta Fase E)
│
├── Ruta Cash
│   ├── M0 Fundamentos base   → GRATIS completo
│   ├── M1 Preflop completo   → Study
│   ├── M2 Postflop completo  → Study
│   ├── M3 Estrategia media   → Study
│   ├── M4 NL por nivel       → Study (NL2–NL25) / Coach (NL50–NL100)
│   ├── M5 Bluffs & lines pro → Coach
│   └── M6 Examen certificación Cash → Coach
│
├── Ruta Spins
│   ├── M0 Spin intro         → GRATIS (1–2)
│   ├── M1 Fundamentos spin   → Study
│   ├── M2 ICM fundamentos    → Study
│   ├── M3 Mid-late pressures → Study
│   ├── M4 ICM avanzado       → Coach
│   └── M5 Pro Spins          → Coach
│
├── Ruta MTT
│   ├── M0 Torneo intro       → GRATIS (1–2)
│   ├── M1 Early & mid        → Study
│   ├── M2 Short & push       → Study
│   ├── M3 Bubble & ITM       → Study (básico) / Coach (avanzado)
│   ├── M4 Final table        → Coach
│   └── M5 Pro MTT            → Coach
│
└── Lab de Rangos
    ├── R0 Intro matrices     → GRATIS (1)
    ├── R1–R4                  → Study
    └── R5–R9                  → Coach
```

### 6.2 Estados de un nodo

| Estado | UX |
|--------|----|
| **Completada** | Check + % + estrellas (1–3) |
| **Desbloqueada** | CTA "Empezar" / "Repetir" |
| **Bloqueada** | Candado suave + "Completa Lx" |
| **Plan superior** | Badge Study/Coach + blur + CTA upgrade |
| **En progreso** | Barra parcial |

### 6.3 Monetización detallada (v2)

| Capa | Gratis | Study | Coach |
|------|--------|-------|-------|
| Cash M0 completo (7 lecciones) | ✅ | ✅ | ✅ |
| Cash M1–M3 (preflop + postflop + estrategia) | — | ✅ | ✅ |
| Cash M4 NL2–NL25 | — | ✅ | ✅ |
| Cash M4 NL50–NL100 + M5–M6 | — | — | ✅ |
| Spins intro (S-00–S-02) | ✅ | ✅ | ✅ |
| Spins M1–M3 | — | ✅ | ✅ |
| Spins M4–M5 pro | — | — | ✅ |
| MTT intro (T-00–T-02) | ✅ | ✅ | ✅ |
| MTT M1–M3 básico | — | ✅ | ✅ |
| MTT M3 avanzado + M4–M5 | — | — | ✅ |
| Lab Rangos R-00 | ✅ | ✅ | ✅ |
| Lab Rangos R-01–R-04 | — | ✅ | ✅ |
| Lab Rangos R-05–R-09 | — | — | ✅ |
| IA Coach en lección | 3/mes | 40/mes | 150/mes |
| Manos de lección en Free | Comparten 15/día | Ilimitadas | Ilimitadas |

---

## 7. UX visual: evolución, puntos y niveles

### 7.1 Principios

- Mapa de nodos como primer viewport (no dashboard de métricas).
- Nivel Escuela (1–30) + XP separado del rating de trainer libre.
- Nodos completados muestran **% mejor** y estrellas (aprobar / oro / 100 %).
- Nodos Study/Coach bloqueados muestran título, XP y badge de plan para seducir upsell.

### 7.2 Header Escuela

| Elemento | Descripción |
|----------|-------------|
| **Nivel Escuela** | 1–30 · tiers: Novato → Estudiante → Reg → Crusher |
| **XP** | Suma de aprobaciones + bonos oro |
| **Racha** | Reutilizar gamificación |
| **Barras de ruta** | % Cash / Spins / MTT completado |

### 7.3 Pantalla de resultado

- Anillo de % grande · "+XP" animado · estrellas 1–3.
- Spots fallados con replay 1-tap.
- Si aprueba: "Desbloqueada: X".
- Si falla: "Te faltan N aciertos" + repetir + IA.

---

## 8. IA Coach en cada paso

| Momento | Cuota |
|---------|-------|
| Teoría (chips sugeridos) | Sí |
| Tras ejemplo | Sí |
| Tras error en spot (teach-back + IA) | Sí |
| Informe fin de sesión (1 consulta) | Sí |
| Nodo bloqueado (respuesta genérica) | No |

---

## 9. Currículum Cash

**Stack default:** 100 bb, cash 6-max. 9-max aparece en lecciones de posición avanzada.

### M0 — Fundamentos base (GRATIS completo)

*7 lecciones · solo preflop open/fold · corte en nodo de decisión*

| ID | Lección | Tipo | Manos | Concepto core |
|----|---------|------|-------|---------------|
| C-00 | Cómo funciona la Escuela | Onboarding | 0 | Loop lección, %, planes |
| C-01 | Posición y por qué manda | A | 12 | Misma mano ≠ en UTG vs BTN |
| C-02 | Open-raise (RFI) básico | A | 14 | Ranges UTG–BTN simplificados |
| C-03 | Fold equity: open o fold | A | 10 | No limpear; open o fold |
| C-04 | Sizing del open | A | 12 | 2–2,5 bb estándar; ajuste según sala |
| C-05 | RFI desde SB (cabeza de serie de blinds) | A | 12 | SB es early OOP; abrir más tight que BTN |
| C-06 | Examen M0 — Fundamentos | F | 16 | Mix posición + RFI + sizing |

> Trampa clave M0: position blind, dominated early, fancy limp, over-open SB.

---

### M1 — Preflop completo (Study)

*12 lecciones · abre todo el árbol preflop · examen de módulo*

| ID | Lección | Tipo | Manos | Concepto core |
|----|---------|------|-------|---------------|
| C-07 | Defender BB vs open (MDF lite) | A/B | 16 | Call/fold/3-bet vs opens por posición |
| C-08 | 3-bet value y polar | B | 16 | Construir rango 3-bet vs CO/BTN |
| C-09 | 3-bet bluff (polarizar) | B | 14 | Qué manos sirven de bluff 3-bet |
| C-10 | Enfrentar 3-bet: call vs 4-bet vs fold | A | 16 | Rangos de defensa por posición |
| C-11 | Squeeze: oportunidad y rango | B | 14 | Cuándo squeeze; tamaño |
| C-12 | Iso-raise vs limps | A | 12 | Tamaño y mano para aislar |
| C-13 | BB vs SB limp | A | 12 | Punish / check vs wide SB |
| C-14 | Preflop multiway: call frío vs 3-bet | A | 12 | Cold-call HJ vs UTG-MP abre |
| C-15 | Blinds en batalla: SB vs BB | A/B | 14 | SB abre con rango wide; BB defiende |
| C-16 | Stack depth ajusta rangos (50 bb / 25 bb) | A | 12 | Short stack: tighter en calls, más shoves |
| C-17 | Rake y cómo afecta al rango | A | 10 | Manos borderline se doblan vs rake alto |
| C-18 | Examen M1 — Preflop completo | F | 20 | Mix + trampas |

---

### M2 — Postflop completo (Study)

*10 lecciones · textura de flop, calles y sizing · examen*

| ID | Lección | Tipo | Manos | Concepto core |
|----|---------|------|-------|---------------|
| C-19 | Clasificar textura de flop | C/A | 12 | Seco / rainbow · semi-coordinated · wet-mono |
| C-20 | C-bet IP en flop seco | A/B | 16 | Alta freq, sizing pequeño; caped villano |
| C-21 | C-bet OOP y cuándo ceder | A | 16 | Check range OOP; donar en wet boards |
| C-22 | Defensa vs c-bet: continue equity | A | 16 | MDF lite; backdoors + OESD valen |
| C-23 | Defensa vs c-bet OOP: donk, check-call | A | 14 | Donk en seco raro; check-call con medio |
| C-24 | Second barrel (turn) | D | 14 | Value barrel vs pot control vs give-up |
| C-25 | Probe / delayed c-bet | D | 12 | Lead turn tras check flop IP |
| C-26 | River: value thin y fat | A | 12 | ¿Cuánto apostar con qué mano? |
| C-27 | River: decision vs bet | A | 12 | Call/fold en river: MDF y conteo combos |
| C-28 | Examen M2 — Postflop | F | 20 | Mix textura + calles |

---

### M3 — Estrategia intermedia (Study)

*8 lecciones · faroles, líneas, rangos*

| ID | Lección | Tipo | Manos | Plan | Concepto core |
|----|---------|------|-------|------|---------------|
| C-29 | Semibluff: equity como seguro | D | 14 | Study | Draws como bluffs con plan B |
| C-30 | Check-raise en flop: polar vs merged | B | 12 | Study | No check-raise mergeado vs fish |
| C-31 | Probe + 2nd barrel: línea completa | D | 12 | Study | Barrel o give-up en turn-river |
| C-32 | Multiway postflop: ajustar sizing | A | 14 | Study | Apostar más pequeño vs más callers |
| C-33 | Bluff river + blockers (intro) | A/C | 14 | Study | Elegir bluffs que no bloqueen folds |
| C-34 | Bluff-catching: MDF y combos | A/C | 14 | Study | Contar combos para decidir call |
| C-35 | Posición postflop: IP vs OOP | A | 14 | Study | Ventaja de posición en calles |
| C-36 | Examen M3 — Estrategia | F | 20 | Study | Mix + trampas |

---

### M4 — Por nivel NL (Study NL2–NL25 · Coach NL50–NL100)

*Lecciones de explotación de población, ajustes de perfil y conceptos específicos del nivel.*

#### M4a — NL2–NL10 (Study)

| ID | Lección | Tipo | Manos | Concepto core |
|----|---------|------|-------|---------------|
| C-37 | Explotación del fish: over-fold y over-bluff | G | 14 | Bet/raise más value; fold menos vs bet |
| C-38 | Foldear menos vs estaciones de call | G | 14 | Thin value; no bluffear cuando llaman todo |
| C-39 | Iso-raise vs multiway fish: ajustar rango | G | 12 | Manos con showdown value en multiway |
| C-40 | Sizing vs fish: sobreapuesta por value | G | 12 | Overbets como value en seco con top pair |
| C-41 | Examen NL2–NL10 | F | 18 | Mix explotación |

#### M4b — NL25–NL50 (Study)

| ID | Lección | Tipo | Manos | Concepto core |
|----|---------|------|-------|---------------|
| C-42 | El reg medio: ajustar vs 3-bet light | G | 14 | Defender más vs regs; fold menos vs 3-bet polarizado |
| C-43 | Double barrel vs reg: credibilidad | G | 14 | Barrel en turns que mejoran tu rango percibido |
| C-44 | Raise flop vs c-bet reg | G | 12 | Momento para check-raise; no vs fish |
| C-45 | Imagen de mesa: ajustar vs historial | G | 12 | Bluffear menos vs alguien que ya te has visto |
| C-46 | Examen NL25–NL50 | F | 18 | Mix regs |

#### M4c — NL75–NL100 (Coach)

| ID | Lección | Tipo | Manos | Concepto core |
|----|---------|------|-------|---------------|
| C-47 | 4-bet / cold 4-bet: polar vs linear | B | 14 | Construir rango 4-bet sólido |
| C-48 | Equity realization OOP vs in-position | B/C | 12 | Por qué mismo % equity ≠ mismo EV |
| C-49 | Caped ranges: bet pequeño con set | B | 14 | Polar vs caped en flop seco |
| C-50 | Protection bets: apostar con 2p | B | 12 | Apostar para denegar equity |
| C-51 | Node locking mental (frecuencias mix) | B/C | 14 | Elegir freq 0/25/50/75/100 |
| C-52 | Examen NL75–NL100 | F | 20 | Mix conceptos pro |

---

### M5 — Bluffs & lines pro (Coach)

*Líneas multi-street, construcción de rangos, spots complejos*

| ID | Lección | Tipo | Manos | Concepto core |
|----|---------|------|-------|---------------|
| C-53 | Bluff construction: elegir combos river | A/C | 14 | Blockers correctos + fold equity |
| C-54 | Range vs range en flop | C | 14 | Quiz: % de rango que conecta con board |
| C-55 | Asignar rango rival tras línea (intro) | C | 12 | "Villain bet-bet-shove: polar o merge?" |
| C-56 | SRP OOP 100 bb: líneas check-call/raise | D | 12 | Cuándo CR vs CC en flop single raised pot |
| C-57 | Overbet como herramienta polar | B | 12 | Cuándo overbet; qué rangos lo justifican |
| C-58 | Explotación sistemática vs población ES | G | 16 | Adaptar a tendencias micros ES específicas |

---

### M6 — Examen de certificación Cash (Coach)

| ID | Lección | Tipo | Manos | Objetivo |
|----|---------|------|-------|----------|
| C-59 | Repaso express: preflop | F | 14 | Consolidar M0–M1 |
| C-60 | Repaso express: postflop | F | 14 | Consolidar M2–M3 |
| C-61 | Examen final Cash (mezcla total) | F | 28 | Certificación interna |

**Totales Cash v2:** 62 lecciones · Gratis: C-00–C-06 (7) · Study: C-07–C-46 (40) · Coach: C-47–C-61 (15).

---

## 10. Currículum Spins

**Formato:** `spin3`, payouts 2×/3×/5×. ICM desde M2. Stacks: 25 → 15 → 10 → 8 bb según módulo.

### M0 — Intro Spin (Gratis: S-00–S-02)

| ID | Lección | Manos | Concepto |
|----|---------|-------|----------|
| S-00 | Anatomía de un Spin: antes, ciega, ICM | 0–8 | Por qué no es cash; payout y prize pool |
| S-01 | Open steal BTN/SB a 20–25 bb | 14 | Robar antes de volverse corto |
| S-02 | Defensa ciega vs steal (20–25 bb) | 14 | 3-bet, call o fold ajustando ICM |

---

### M1 — Fundamentos Spin (Study)

| ID | Lección | Manos | Concepto |
|----|---------|-------|----------|
| S-03 | Iso-raise vs limps (15–20 bb) | 12 | No overcommit antes de saber stack |
| S-04 | Tamaño del open vs profundidad de stack | 12 | Open min o 2bb; rango ajustado |
| S-05 | Jugar el chip lead vs short (presión) | 14 | Aislar al corto; no flipear innecesario |
| S-06 | Jugar corto vs cover (survive + doubles) | 14 | Push o fold; evitar call -EV$ |
| S-07 | HU básico: open estándar heads-up | 14 | Open casi todo BTN; defend BB wide |
| S-08 | HU avanzado: 3-bet ranges HU | 14 | Polarizar en HU; fold equity HU |
| S-09 | Examen M1 — Fundamentos | 18 | Mix |

---

### M2 — ICM fundamentos (Study)

| ID | Lección | Manos | Concepto |
|----|---------|-------|----------|
| S-10 | Concepto ICM lite: chip $EV ≠ $ | 8 | Teoría con quiz; sin spots aún |
| S-11 | Push/fold 12–8 bb (memorizar bandas) | 20 | Charts push/fold adaptados a Spin |
| S-12 | Call shove ICM: foldar +EV chip | 16 | Overfold correcto: ICM suicide es real |
| S-13 | Ajuste 2× vs 5× payout | 14 | Tighter en 5×; less pressure en 2× |
| S-14 | Malos spots: +EV chip / −EV $ | 14 | Trampa clásica mid-stack |
| S-15 | Examen M2 — ICM fundamentos | 20 | Mix |

---

### M3 — Mid-late pressures (Study → borde Coach)

| ID | Lección | Manos | Plan | Concepto |
|----|---------|-------|------|----------|
| S-16 | 3-bet shove vs flat: thresholds | 16 | Study | Shove directamente vs flat 3-bet |
| S-17 | Call shove ICM (mid stack vs short) | 14 | Study | No obligado a llamar todo |
| S-18 | Limp-call: cuándo y cuándo no | 12 | Study | En Spin puede salir bien con cortos |
| S-19 | Postflop básico corto (12–15 bb) | 12 | Study | Apuesta todo o nada; draws como shove |
| S-20 | Examen M3 | 18 | Study | Mix |

---

### M4 — ICM avanzado (Coach)

| ID | Lección | Manos | Concepto |
|----|---------|-------|----------|
| S-21 | Bubble factor: cálculo mental | 12 | Multiplicador ICM por situación en Spin |
| S-22 | Pay jumps y heads-up pay delta | 12 | Cuánto vale ganar el duelo HU |
| S-23 | Range vs range shove/call (quiz) | 14 | Asignar rango shove rival; responder |
| S-24 | 3-way ICM: presión del chip leader | 14 | Explotar short; no exponer al big |
| S-25 | Ajuste vs tipos de rival (nit / maniac) | 14 | Call vs nit; fold vs push-wide |
| S-26 | Postflop ICM (mano de valor en flop) | 12 | Stack-off con sets vs ICM cost |
| S-27 | Examen M4 — ICM avanzado | 22 | Mix |

---

### M5 — Pro Spins (Coach)

| ID | Lección | Manos | Concepto |
|----|---------|-------|----------|
| S-28 | Construcción de rango HU pro | 14 | Frequency-based HU con blockers |
| S-29 | Explotar tendencias de población en Spins | 14 | Fish llama demasiado; reg overfolds |
| S-30 | Spin postflop intermedio: c-bet y barrel | 14 | Cuando stack lo permite (18+ bb) |
| S-31 | Spots de alta presión 3-way corto | 12 | All-in o fold sin postflop |
| S-32 | Examen final Spin Pro | 24 | Certificación |

**Totales Spins v2:** 33 lecciones · Gratis: S-00–S-02 (3) · Study: S-03–S-20 (18) · Coach: S-21–S-32 (12).

---

## 11. Currículum MTT

**Fases motor:** `early`, `mid`, `short`, `push`, `bubble`. Honestidad: principios ICM, no solver de campo completo.

### M0 — Intro MTT (Gratis: T-00–T-02)

| ID | Lección | Manos | Concepto |
|----|---------|-------|----------|
| T-00 | Anatomía de un torneo: fases y antes | 0–8 | Identificar fase por stack bb |
| T-01 | Early: cash-like con más paciencia | 14 | No spew early; profundidad de campo |
| T-02 | Lectura rápida de mesa: stacks y M | 12 | Estimar M; identificar short/mid/big |

---

### M1 — Early & mid (Study)

| ID | Lección | Manos | Concepto |
|----|---------|-------|----------|
| T-03 | RFI MTT early (ajuste por antes) | A | 14 | Rango con ante: abrir más; pot bigger |
| T-04 | 3-bet early MTT: solo value | A/B | 12 | No light 3-bet early; chips valen mucho |
| T-05 | Transición early→mid: stack awareness | A | 12 | Cambiar engranaje al llegar a 40 bb |
| T-06 | Open steal mid (antes grandes) | A | 14 | Ante = incentivo de robo; open BTN/CO/SB |
| T-07 | 3-bet polar mid: presionar | B | 14 | 3-bet vs late opens; tamaño ajustado |
| T-08 | Resteal vs steal (BB/SB war) | A | 14 | Resteal con manos de valor + blockers |
| T-09 | Confrontación mid stack vs mid stack | A | 12 | Evitar flip innecesario; no allin ligero |
| T-10 | Postflop básico MTT (50 bb) | D | 12 | C-bet continuación y give-up sencillos |
| T-11 | Examen M1 — Early & mid | F | 20 | Mix |

---

### M2 — Short & push (Study)

| ID | Lección | Manos | Concepto |
|----|---------|-------|----------|
| T-12 | Zona 20–12 bb: open-shove threshold | A/E | 16 | Cuándo open shove vs raise normal |
| T-13 | Push/fold 12–8 bb (charts MTT) | E | 20 | Memorizar bandas push/fold por posición |
| T-14 | Push/fold <8 bb: ampliar rango | E | 16 | Shove casi todo en BB cuando corto |
| T-15 | Calling shove (chip EV): base | E | 16 | Manos para call vs push en chip EV |
| T-16 | Limp-shove vs raise-fold (zonas grises) | E | 14 | Cuándo limp-shove en BB; trampas |
| T-17 | Short stack: elegir tus spots | A/E | 14 | Esperar manos con buen blockers y FE |
| T-18 | Postflop corto MTT: stack-off o fold | D | 12 | Con 20 bb en flop: call/shove o fold |
| T-19 | Examen M2 — Short & push | F | 20 | Mix |

---

### M3 — Bubble & ITM básico (Study · avanzado Coach)

| ID | Lección | Manos | Plan | Concepto |
|----|---------|-------|------|----------|
| T-20 | Concepto burbuja: roles (big/mid/short) | C/E | 12 | Study | Identificar tu rol antes de actuar |
| T-21 | Big stack en burbuja: presión al mid | E | 14 | Study | Aislar shorts; no flipear vs mids grandes |
| T-22 | Mid stack en burbuja: survival primero | E | 16 | Study | Overfold; pick spots vs cortos |
| T-23 | Short stack en burbuja: shove timing | E | 14 | Study | Empujar con FE; no esperar al cierre |
| T-24 | Examen M3 básico — Burbuja | F | 18 | Study | Mix roles |
| T-25 | ICM pressure en burbuja: cuantificar | E/C | 14 | Coach | Multiplicador ICM; call range más tight |
| T-26 | Pay jump ITM: primer dinero | E | 14 | Coach | No flip innecesario justo al entrar |
| T-27 | Burbuja: multiway all-in decision | E | 14 | Coach | Cuando hay 3-4 all-ins simultáneos |
| T-28 | Near-bubble: satelite vs deep-stack | E | 12 | Coach | Diferencia entre satélite y torneo normal |
| T-29 | Examen M3 avanzado — ICM burbuja | F | 22 | Coach | Mix trampas ICM |

---

### M4 — Final table (Coach)

| ID | Lección | Manos | Concepto |
|----|---------|-------|----------|
| T-30 | Final table: pay jumps y renegociar | E/C | 12 | Cada eliminación = $ real; ajustar |
| T-31 | Chip leader FT: presión sin flipear | E | 14 | Aislar; no colisionar innecesariamente |
| T-32 | Short stack FT: shove-or-fold estricto | E | 14 | No limp-call; no slow-play |
| T-33 | HU en torneo: diferencias vs cash HU | E/A | 14 | ICM + meta + presión de tiempo |
| T-34 | Examen FT | F | 20 | Mix |

---

### M5 — Pro MTT (Coach)

| ID | Lección | Manos | Concepto |
|----|---------|-------|----------|
| T-35 | Chip EV vs $EV: comparar decisiones | E/C | 14 | Ver ambas métricas; elegir la correcta |
| T-36 | Range reading en burbuja (quiz ICM) | C/E | 12 | Asignar rango rival; ajustar ICM |
| T-37 | Explotación de población en torneos ES | G | 14 | Tendencias regs ES; ajustar |
| T-38 | Examen final MTT | F | 26 | Certificación |

**Totales MTT v2:** 39 lecciones · Gratis: T-00–T-02 (3) · Study: T-03–T-24 (22) · Coach: T-25–T-38 (14).

---

## 12. Módulos transversales (rangos, estrategia, pro)

### 12.1 Laboratorio de Rangos

| ID | Lección | Formato | Plan | Objetivo |
|----|---------|---------|------|----------|
| R-00 | Cómo leer una matriz 13×13 | Onboarding | Gratis | Familiaridad con la UI de rangos |
| R-01 | Construir RFI BTN en 60 s | Interactive | Study | Memoria muscular del rango BTN |
| R-02 | Construir RFI CO y UTG | Interactive | Study | Ajuste por posición |
| R-03 | Dado un board, % del rango que conecta | C | Study | Texture × range |
| R-04 | Eliminación de combos (blockers) | C | Study | Contar combos post-turn |
| R-05 | Asignar rango rival tras línea bet-bet | C | Study | ¿Polar o merge? |
| R-06 | Examen Lab Rangos Study | F | Study | Mix R-01–R-05 |
| R-07 | Rango vs rango en flop (quiz) | C | Coach | % de equity por rango en board |
| R-08 | Node frequencies: elegir mix | B/C | Coach | 0/25/50/75/100 de frecuencia |
| R-09 | Rango de 4-bet / call shove | C | Coach | Polar en 4-bet; threshold de call |
| R-10 | Examen Lab Rangos Pro | F | Coach | Certificación |

---

### 12.2 Conceptos pro adicionales (material de cada lección Coach)

- Polar vs linear (C-47, C-53).
- Caped ranges (C-49).
- Protection bets (C-50).
- MDF completo (C-27).
- Equity realization OOP (C-48).
- Explotación sistemática population ES (C-58, T-37, S-29).
- Multiway pot geometry (C-32).
- ICM pressure multipliers (S-21, T-25).

---

## 13. Mapa de lecciones vs planes

### 13.1 Resumen de cobertura por plan (v2)

| Ruta | Total | Gratis | Study | Coach |
|------|-------|--------|-------|-------|
| Cash | 62 | 7 (M0) | 40 (M1–M4b) | 15 (M4c–M6) |
| Spins | 33 | 3 (M0) | 18 (M1–M3) | 12 (M4–M5) |
| MTT | 39 | 3 (M0) | 22 (M1–M3 básico) | 14 (M3 avanzado–M5) |
| Rangos | 11 | 1 | 6 | 4 |
| **TOTAL** | **145** | **14** | **86** | **45** |

> Study tiene ~86 lecciones de contenido; es decir, varias semanas de estudio diario serio (15 min/lección = ~21 h de contenido). Coach añade 45 lecciones pro que justifican el precio diferencial.

### 13.2 Por qué este reparto convierte

- **Gratis:** el usuario completa M0 Cash (7 lecciones) y toca el intro de Spins/MTT. Siente el producto sin llegar a las cosas interesantes → muro Study clarísimo.
- **Study:** recorrido largo y variado (preflop, postflop, NL-by-level, Spins con ICM, MTT hasta burbuja básica). Da para meses de trabajo progresivo.
- **Coach:** contenido pro diferenciado (NL75–NL100, bluff construction avanzada, ICM avanzado, FT, certificaciones). Comunicable en pricing como contenido distinto, no solo más cuota de IA.

---

## 14. RoadMap de entrega por fases

### Estado actual (post-Fases A–C)

- ✅ Menú Escuela admin-only.
- ✅ Runner spots fijos con `schoolDecisionEnd`.
- ✅ M0 Cash (C-00–C-06 → C-04 en código actual: se amplía a 7 en siguiente iteración).
- ✅ Progreso `stats.school`, XP/nivel, desbloqueo lineal.

### Próximas fases

#### Fase D — Gates de plan + allowlist beta

- `canPlayLesson(lessonId)` con Free / Study / Coach.
- Badges plan en nodos bloqueados.
- Paywall al agotar cupo Free en lección.
- Feature flag `schoolEnabledForUser`.
- Analytics: `lesson_start`, `lesson_complete`, `lesson_fail`, `lesson_blocked_plan`.

#### Fase E — Apertura pública + M1 Preflop completo

- Menú visible para todos (o rollout %).
- C-07–C-18 (12 lecciones preflop Study).
- Resultado visual mejorado: anillo, estrellas, replay 1-tap.
- CTA desde Inicio → Escuela.

#### Fase F — M2 + M3 Postflop + maestría

- C-19–C-36 (postflop completo + estrategia intermedia).
- Repetir para 100 %; estrellas 1–3.
- Informe IA fin de sesión (1 consulta).

#### Fase G — NL por nivel (M4a + M4b Study)

- C-37–C-46 (NL2–NL50).
- Spots con `nlContext` para personalización futura.

#### Fase H — Ruta Spins completa

- S-03–S-20 Study; S-21–S-32 Coach.
- Payout 2×/3×/5× como variable de lección.

#### Fase I — Ruta MTT completa

- T-03–T-24 Study; T-25–T-38 Coach.
- Copy honestidad ICM.
- Upsell en nodos burbuja y FT.

#### Fase J — Coach pro: Cash M4c–M6 + Lab Rangos + Spins/MTT pro

- C-47–C-61 (NL75–NL100 + bluffs pro + certificaciones).
- R-00–R-10.
- S/T exámenes finales.

#### Fase K — Personalización y cierre loop

- Bridge leaks → lección (`TRAINING_FOCUSES` → `lessonId`).
- "Tu fuga top = Lección C-20" desde Errores/Stats.
- A/B umbrales de aprobación.

---

## 15. Riesgos, honestidad del motor y métricas de éxito

### 15.1 Riesgos

| Riesgo | Mitigación |
|--------|------------|
| GTO prometido en spots = heurístico | Copy "referencia PokerForge"; lecciones NL-by-level son explotación, no GTO puro |
| MTT/Spins con motor poco profundo | Principios + ICM lite; honestidad en copy |
| Memorizar packs repetidos | Rotar orden, variantes isomorfas de suits, trampas espejo |
| 145 lecciones = coste de contenido alto | Priorizar fases E–G (valor a usuarios activos); Coach se entrega iterativamente |
| Confundir plan "Coach" vs función "IA Coach" | Copy: plan Coach · función IA Coach |

### 15.2 Métricas de éxito

| Métrica | Señal |
|---------|-------|
| D1: completa ≥ 1 lección M0 | Aha moment |
| D7: lecciones distintas ≥ 3 | Retención |
| Click nodo Study bloqueado | Intención upsell Study |
| Click nodo Coach bloqueado | Intención upsell Coach |
| Conversión Free → Study tras muro C-07 | Monetización |
| Conversión Study → Coach tras muro C-47 | Monetización Coach |
| % oro en lecciones core | Calidad de aprendizaje |
| Uso IA en lección vs libre | Valor cuota IA |
| Time-in-app días 8–30 con Escuela vs sin | Retención medio plazo |

---

## 16. Glosario y decisiones

### 16.1 Glosario

| Término | Significado |
|---------|-------------|
| **Escuela de Póker** | Menú / superficie de lecciones |
| **Ruta** | Cash / Spins / MTT / Rangos |
| **Lección** | Teoría + ejemplos + sesión dirigida |
| **Spot pack** | Lista de spots fijos de una lección |
| **Trampa** | Spot diseñado para el error típico del concepto |
| **Maestría** | Mejor % ≥ umbral oro / 100 % |
| **Study / Coach** | Planes de suscripción |
| **IA Coach** | Asistente Gemini (no el plan) |
| **nlContext** | Nivel NL al que aplica un spot (`nl2`–`nl100`) |

### 16.2 Decisiones cerradas

1. Nombre de menú: **Escuela de Póker**.
2. M0 Cash **completo en Gratis** (C-00–C-06, 7 lecciones).
3. Manos de lección consumen cupo Free del trainer.
4. Visibilidad inicial: solo admin.

### 16.3 Decisiones aún abiertas

1. ¿Exámenes de módulo obligatorios u opcionales para avanzar? (recomendado: obligatorios).
2. ¿Mostrar frecuencias GTO en fundamentos o solo acción correcta? (recomendado: acción + tip; freqs desde M2).
3. ¿Certificaciones compartibles en RRSS al completar ruta Coach?
4. ¿9-max como variante explícita en M1 o solo nota en lecciones de posición?

---

## Anexo A — Plantilla de brief de lección (para autores)

```yaml
id: C-20
title: C-bet IP en flop seco
route: cash
module: M2
plan: study
difficulty: intermediate
xp: 120
pass_threshold: 0.72
gold_threshold: 0.90
hands: 16
decision_end: true
nl_context: any
concept: >
  Agresor IP en flop seco (K72r): c-betea alto con sizing pequeño para
  negar equity y proteger range advantage.
traps_ratio: 0.25
ai_suggested_questions:
  - "¿Por qué sizing pequeño en seco y no 75%?"
  - "¿Qué manos check-back IP aquí?"
spot_pack: cash-cbet-ip-dry-v1
```

---

## Anexo B — Orden de autoría prioritario de packs (para iteración)

1. `cash-m0-complete-v1` (C-00–C-06) — ya implementado en code ✅
2. `cash-preflop-bb-defend-v1` (C-07)
3. `cash-3bet-polar-v1` (C-08–C-09)
4. `cash-face3bet-v1` (C-10)
5. `cash-cbet-ip-dry-v1` + `cash-cbet-oop-v1` (C-20–C-21)
6. `cash-defense-cbet-v1` (C-22–C-23)
7. `cash-nl2-exploit-v1` (C-37–C-40)
8. `spin-steal-defend-v1` (S-01–S-02)
9. `spin-pushfold-v1` (S-11)
10. `mtt-steal-mid-v1` (T-06–T-08)
11. `mtt-pushfold-v1` (T-13–T-14)
12. `mtt-bubble-roles-v1` (T-20–T-23)

---

## Anexo C — Relación con Guía básica actual

La Guía básica (8 secciones + 4 mini-drills) **no se elimina**; pasa a ser material de apoyo:

| Sección Guía | Lección Escuela |
|--------------|-----------------|
| Hold'em / manos / posiciones | C-00, C-01 |
| Acciones / RFI / 3-bet | C-02, C-08 |
| GTO intro | C-00 + tip en M1 |
| Mini-drill RFI | Sesión de C-02 |
| Mini-drill 3-bet / face3bet | C-08 / C-10 |
| Mini-drill flop | C-20 entrada |
| Preguntas IA | Chips por lección |

---

*Fin del RoadMap v2. Siguiente paso de implementación: Fase D (gates de plan + allowlist beta) cuando M0 esté validado por admin.*
