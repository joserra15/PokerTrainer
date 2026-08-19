# RoadMap — Manos legendarias (jugar manos reales de pros)

> Estudio de producto, catálogo de contenido y plan de implementación para una sección donde el usuario **juega manos reales** de jugadores famosos — sobre todo **españoles, mexicanos y argentinos** frente a referentes de **Estados Unidos** — sin saber quién es ni qué mano es hasta el final.  
> **Alcance de este documento:** visión, arquitectura, catálogo objetivo (≥100 manos), UX, pipeline de datos y fases de entrega.  
> Complementa: `ROADMAP_LECCIONES_DIRIGIDAS.md`, importador de sesiones, `forceScript` del motor, ForgeCoach.  
> Fecha: agosto 2026 · Producto: PokerForgeAI

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Experiencia de usuario](#2-experiencia-de-usuario)
3. [Estado actual y piezas reutilizables](#3-estado-actual-y-piezas-reutilizables)
4. [Modelo de datos](#4-modelo-de-datos)
5. [Ubicación en la app: menú y naming](#5-ubicación-en-la-app-menú-y-naming)
6. [Modos de juego](#6-modos-de-juego)
7. [Catálogo objetivo: ≥100 manos](#7-catálogo-objetivo-100-manos)
8. [Pipeline de autoría e ingesta](#8-pipeline-de-autoría-e-ingesta)
9. [Multiway y limitaciones del motor](#9-multiway-y-limitaciones-del-motor)
10. [ForgeCoach y narrativa](#10-forgecoach-y-narrativa)
11. [Monetización y progresión](#11-monetización-y-progresión)
12. [Legal, licencias y atribución](#12-legal-licencias-y-atribución)
13. [RoadMap de entrega por fases](#13-roadmap-de-entrega-por-fases)
14. [Métricas de éxito](#14-métricas-de-éxito)
15. [Decisiones abiertas](#15-decisiones-abiertas)

---

## 1. Resumen ejecutivo

**Propuesta:** nueva sección **«Manos legendarias»** (nombre provisional) donde el usuario entra en manos reales de alto impacto mediático (2020–2026, foco 2022–2026), con nombres reales de jugadores, contexto de torneo y línea original reproducible.

**Loop principal:**

1. El usuario elige filtro (región, jugador, evento, concepto) o pulsa **«Manos al azar»**.
2. Se le asigna un **rol aleatorio** entre los actores relevantes de la mesa (p. ej. Adrián Mateos, Will Berry, Lingkun Lu, Adrián García).
3. **Modo ciego:** no ve nombres ni título de la mano; solo posición, stacks y acción.
4. Juega con sus cartas reales; los demás siguen la **línea histórica** (`forceScript`) hasta que el héroe se desvíe.
5. Al terminar: **reveal** — quién era quién, cartas de todos, historia, clip/referencia, reacción en redes.
6. Opciones post-mano:
   - **Ver línea original** (timeline paso a paso)
   - **Repetir como otro jugador** (misma mano, otro rol)
   - **Repetir libre** (entrenador GTO sobre las mismas cartas)
   - **ForgeCoach:** «¿Qué haría GTO vs lo que hizo X?»

**Por qué encaja en PokerForgeAI:**

| Pieza existente | Reutilización |
|-----------------|---------------|
| `playAnalysisHand(force, playConfig)` | Entrada principal de juego |
| `forceDeal` + `forceScript` | Cartas y línea real del villano |
| `openAnalysisHandReview` / `startInteractiveReplay` | Revisión y línea original |
| Importador HH + `demo-session.json` | Formato objetivo de persistencia |
| Escuela (`school.js`) | Patrón de hub → detalle → sesión → resultado |
| ForgeCoach | Debrief contextual con nombres y evento |
| Guest traps (`guest-traps.js`) | Patrón de manos curadas sin registro |

**Gap principal:** no existe catálogo global ni UI de biblioteca. Hay que **autorar ≥100 manos**, convertirlas al formato interno y construir la sección.

**Veredicto de producto:** diferenciador fuerte para mercado hispanohablante (Winamax, CodigoPoker, PokerStars ES/LATAM). Retención alta si hay progresión («has jugado 12/100 manos», badges por jugador). Encaja mejor como **pestaña propia** que como submódulo del coach o de la escuela pedagógica.

---

## 2. Experiencia de usuario

### 2.1 Journey ideal

```
Hub Manos legendarias
  → Filtros / destacados / «Al azar»
  → Ficha de mano (spoiler oculto)
  → «Jugar en modo ciego»
  → Mesa (anonimizada: Jugador A, B, C…)
  → Decisiones del héroe
  → Pantalla reveal (nombres, cartas, story, viralidad)
  → Acciones: Línea original | Otro rol | Repetir | ForgeCoach
```

### 2.2 Principios UX

| Principio | Implementación |
|-----------|----------------|
| **Spoiler-free** | En juego: `Jugador A (BTN)`, sin foto ni apodo real |
| **Rol aleatorio** | Por defecto; opción «Elegir rol» tras 1ª completada |
| **Perspectiva múltiple** | Cada `cast[]` con `playerId` + `cards` + `pos` puede ser héroe |
| **Historia primero** | Reveal con 2–3 frases + enlace a clip/noticia |
| **No es lección GTO** | El grading GTO es secundario; la comparación es «tú vs pro» |
| **Rejugabilidad** | Contador de intentos por mano/rol en `stats.legendaryHands` |

### 2.3 Wire conceptual (hub)

- **Hero:** «¿Cómo habrías jugado la mano de Mateos contra Berry?»
- **Destacados:** 3–5 manos virales de la semana
- **Filtros:** País del héroe · Jugador · Evento (WSOP/EPT/SCOOP) · Año · Concepto (bluff, fold heroico, bad beat, ICM)
- **Progreso:** «34/100 manos jugadas · 8 perspectivas distintas»

---

## 3. Estado actual y piezas reutilizables

### 3.1 Motor de replay

El entrenador ya soporta manos con línea fija:

```javascript
// js/app.js — playAnalysisHand
// Villano sigue forceScript hasta desviación del héroe
playAnalysisHand(force, playConfig);
```

Formato de spot escolar (referencia mínima):

```javascript
{
  forceDeal: { heroCards, villainCards, board, villainPos },
  forceScript: { heroPos, villainPos, actions: [{ street, pos, action, amountBB }] },
  playConfig: { scenario, practiceStreet, schoolMode, … }
}
```

Para manos legendarias multi-jugador hace falta extender a **`cast[]`** + **`multiScript`** (ver §4 y §9).

### 3.2 Formato sesión importada

`data/demo-session.json` define el shape rico: `positions`, `streets`, `summary`, `villainShows`. Es el **formato canónico de almacenamiento** del catálogo.

### 3.3 Lo que NO existe

- Tabla o bundle `pt_legendary_hands` / `data/famous-hands/`
- UI de biblioteca
- Modo «rol aleatorio + anonimización»
- Multiway `forceScript` completo (solo parcial en motor)
- Scope ForgeCoach `legendaryHand`

---

## 4. Modelo de datos

### 4.1 Registro de catálogo (`LegendaryHand`)

```typescript
interface LegendaryHand {
  id: string;                    // "LH-2024-WSOP-ME-MATEOS-FOLD-KK"
  version: number;

  // Metadatos públicos
  title: string;                 // Spoiler: "Mateos foldea KK vs AA en 4-bet pot"
  titleBlind: string;            // "Fold imposible en bote 4-bet"
  year: number;
  date?: string;                 // ISO
  event: {
    name: string;                // "WSOP Main Event"
    series: "WSOP" | "EPT" | "SCOOP" | "WPT" | "Triton" | "LAPT" | "other";
    stage?: string;              // "Day 5", "Heads-up", "Final table"
    buyInUSD?: number;
    venue?: string;
  };
  format: "cash" | "mtt" | "spin";
  stakes?: { sb: number; bb: number; ante?: number };
  effectiveBB?: number;

  // Narrativa
  story: {
    es: string;                  // 2–4 frases
    en?: string;
    highlights: string[];        // bullets para reveal
    viralScore: 1 | 2 | 3 | 4 | 5;
    tags: string[];              // ["fold-heroico","bad-beat","4bet-pot"]
  };

  // Reparto
  cast: CastMember[];
  heroCandidates: string[];      // playerIds que pueden ser héroe (actores principales)

  // Datos de juego (mismo shape que demo-session hand + extensions)
  hand: SessionHandShape;

  // Replay técnico
  replay: {
    defaultHeroId: string;
    scripts: Record<string, ForceScriptPerHero>;  // playerId → script cuando ese jugador es héroe
    board: string[];
    potTimeline?: object[];
  };

  // Fuentes
  sources: {
    type: "pokernews" | "pokergo" | "youtube" | "hand-history" | "manual";
    url?: string;
    clipStartSec?: number;
    license: "editorial" | "public-recap" | "needs-review";
  }[];

  // Estado editorial
  editorial: {
    status: "draft" | "needs-hh" | "ready" | "published";
    locale: "es";
    reviewedBy?: string;
    notes?: string;
  };

  // Producto
  planGate: "free" | "study" | "coach";  // acceso mínimo
  featured?: boolean;
  regionPrimary: "ES" | "MX" | "AR" | "LATAM" | "US" | "INT";
}

interface CastMember {
  playerId: string;              // slug estable: "adrian-mateos"
  displayName: string;
  country: string;               // ISO
  countryLabel: string;          // "España"
  role: "hero" | "villain" | "support";
  pos: string;                   // "HJ", "BB", …
  cards?: [string, string];      // si conocidas
  stackBB?: number;
  showed?: boolean;
  mucked?: boolean;
}
```

### 4.2 Progreso usuario (`stats.legendaryHands`)

```javascript
{
  played: { "LH-2024-…": { count: 2, roles: ["adrian-mateos", "will-berry"], lastAt: ts } },
  revealed: ["LH-2024-…"],
  favorites: [],
  badges: ["mateos-5", "latam-20"],
  updatedAt: ts
}
```

### 4.3 Almacenamiento

| Fase | Dónde |
|------|--------|
| MVP | `data/legendary-hands/index.json` + `data/legendary-hands/hands/*.json` |
| V2 | Supabase `pt_legendary_hands` (JSONB + índices GIN en tags/players) |
| CDN | Bundle lazy `pt-legendary.js` (~500 KB comprimido para 100 manos) |

---

## 5. Ubicación en la app: menú y naming

### 5.1 Recomendación: **pestaña propia**

| Opción | Pros | Contras | Veredicto |
|--------|------|---------|-----------|
| **A. Pestaña «Manos legendarias»** | Descubrimiento, identidad de producto, SEO | +1 tab | **Recomendado** |
| B. Subsección Escuela (Módulo Pro) | Reutiliza progresión XP | Mezcla pedagogía con entretenimiento; confunde «spot GTO» vs «mano real» | No ideal como home |
| C. Dentro de ForgeCoach | Contexto IA | Coach es overlay, no biblioteca browsable | Solo debrief, no hub |
| D. Dentro de Sesiones | Reutiliza review UI | Sesiones = *mis* manos; mezcla confunde | Como vista de review sí |

**Propuesta concreta:**

- Nueva pestaña: **`data-tab="legendary"`** — label **«Manos legendarias»** (alternativas: «Manos de pros», «Replay legendario»).
- Posición: entre **Escuela** y **Guía básica** (contenido formativo-espectáculo).
- ForgeCoach: widget contextual en reveal, no sustituye la pestaña.
- Escuela: enlace cruzado opcional («Lección relacionada: folds imposibles») sin alojar el catálogo.

### 5.2 Naming interno

- Código: `js/legendary-hands.js`, `js/legendary-data.js`, bundle `pt-legendary`
- IDs: prefijo `LH-`
- i18n keys: `legendary.*`

---

## 6. Modos de juego

| Modo | Descripción | Motor |
|------|-------------|-------|
| **Ciego (default)** | Rol aleatorio, nombres anonimizados | `playAnalysisHand` + `legendaryBlind: true` |
| **Elegir rol** | Tras completar una vez | Mismo, `heroPlayerId` fijo |
| **Línea original** | Timeline sin input | `renderTimelineReview` |
| **Observador** | Auto-play acciones históricas | Nuevo: `playLegendaryObserver()` |
| **GTO libre** | Mismas cartas, villanos GTO | `playAnalysisHand` sin script |
| **Otro rol** | Re-lanzar con otro `heroPlayerId` | Rotación en `cast` |

**Anonimización en UI:** mapa `playerId → "Jugador A"` generado por seed de sesión (consistente dentro de la mano, distinto entre manos).

---

## 7. Catálogo objetivo: ≥100 manos

### 7.1 Criterios de selección

1. **Ventana temporal:** 2020–2026; **≥70 manos de 2022–2026**.
2. **Repercusión online:** cobertura PokerNews, PokerGO, CodigoPoker, Twitter/X, YouTube >50 K views, o momento FT WSOP/EPT.
3. **Geografía:** **≥40 manos** con protagonista ES/MX/AR; **≥25 manos** LATAM vs USA en la misma mesa.
4. **Datos jugables:** cartas conocidas de héroe y ≥1 villano; acción calle a calle documentada.
5. **Variedad:** preflop, 3-bet/4-bet/5-bet, bluffs river, hero folds, bad beats, ICM FT, PKO.

### 7.2 Distribución objetivo (100 manos)

| Bucket | # | Ejemplos de fuente |
|--------|---|-------------------|
| España (Mateos, Margets, Galiana, Aido, Zarco, Foxen…) | 28 | WSOP 2024–25, EPT, SCOOP |
| México (Nadal, Arce, Rodríguez…) | 12 | EPT Barcelona, WSOP, LAPT |
| Argentina (Salas, Ponzio, Cabrera…) | 12 | WSOP ME, SCOOP, EPT |
| LATAM otros (Brasil, Chile, Colombia vs US) | 8 | WSOP ME, Triton |
| USA vs LATAM (villano US, héroe LATAM y viceversa) | 25 | ME, HR, EPT |
| Online viral (SCOOP/GG/PokerStars) | 15 | Clips 2022–25 |
| **Total** | **100** | |

### 7.3 Seed catalog — manos documentadas (Fase 0)

Archivo vivo: `data/legendary-hands/index.json`. Estado editorial inicial: muchas en `needs-hh` (falta HH completo; hay recap público).

#### España — Adrián Mateos (8 manos seed)

| ID | Año | Evento | Oponentes US/LATAM | Concepto | Viral |
|----|-----|--------|-------------------|----------|-------|
| LH-2024-WSOP-ME-MATEOS-FOLD-KK | 2024 | WSOP ME D5 | Will Berry (US) | Fold KK vs AA en 4-bet, turn T | ★★★★★ |
| LH-2024-WSOP-ME-MATEOS-AA-CRACKED | 2024 | WSOP ME D5 | Adrián García (ES), Lingkun Lu | AA vs AK 5-bet shove, runner-runner flush | ★★★★★ |
| LH-2024-SCOOP-TITANS-BLUFF-River | 2024 | SCOOP $5.2k PKO HU | heyalisson (BR) | Overbet shove river en missed flush board | ★★★★ |
| LH-2022-EPT-MC-100K-CALL-J8 | 2022 | EPT Monte Carlo €100k | Badziakouski (BY) | Call-down 3 barrels con J-high | ★★★ |
| LH-2022-EPT-MC-100K-CALL-A2 | 2022 | EPT Monte Carlo €100k | Marius Gierse (DE) | Call-down A-high en pot limped | ★★★ |
| LH-2022-EPT-MC-100K-HU-K3 | 2022 | EPT Monte Carlo €100k | Gierse | HU call K-high vs J4 | ★★ |
| LH-2025-WSOP-E11-HR-WIN | 2025 | WSOP #11 $3.2k HR | Alex Kulev, Sternberg (US) | FT HR híbrido online/live | ★★★ |
| LH-2024-EPT-MC-25K-FT | 2024 | EPT Monte Carlo €25k | Campo US/EU | Deep run pre-ME | ★★ |

#### España — Leo Margets (6)

| ID | Año | Evento | Oponentes | Concepto | Viral |
|----|-----|--------|-----------|----------|-------|
| LH-2021-WSOP-CLOSER-HU-COMEBACK | 2021 | WSOP #83 $1.5k Closer | Alex Kulev | HU comeback: trips vs TP | ★★★★ |
| LH-2025-WSOP-ME-FT-BLUFF | 2025 | WSOP ME FT | Campo US | Bluff discutido en FT (1ª mujer FT en 30 años) | ★★★★★ |
| LH-2025-WSOP-ME-FT-KO | 2025 | WSOP ME FT | — | Eliminación 7º $1.5M | ★★★★ |
| LH-2018-WSOP-DOUBLE-STACK-2ND | 2018 | WSOP #73 | — | Mano clave FT (2º) | ★★ |
| LH-2009-WSOP-ME-27TH | 2009 | WSOP ME | — | Histórica (fuera ventana — opcional premium) | ★★ |
| LH-2021-WSOP-CLOSER-3BET-POT | 2021 | WSOP #83 | Song (US) | 3-bet pot FT | ★★ |

#### España — Antonio Galiana / Sergio Aido / otros (8)

| ID | Año | Evento | Oponentes | Concepto | Viral |
|----|-----|--------|-----------|----------|-------|
| LH-2024-WSOP-GALIANA-7HIGH-BLUFF | 2024 | WSOP #34 $2.5k | Johan Guilbert (FR) | 5-bet bluff 7-high en board monotone clubs | ★★★★★ |
| LH-2024-WSOP-AIDO-BRACELET | 2024 | WSOP (bracelet) | — | Mano decisiva FT | ★★★ |
| LH-2024-WSOP-MATEOS-48TH | 2024 | WSOP #34 | Galiana event | Mateos en mismo evento (mano deep) | ★★ |
| LH-2023-EPT-BCN-ES-FINAL | 2023 | EPT Barcelona | — | Manos FT españoles | ★★ |
| LH-2024-WYNN-SUMMER-NADAL-2ND | 2024 | Wynn Summer Classic | US field | Nadal deep (cross MX) | ★★★ |
| LH-2025-PS-OPEN-MALAGA-ROYAL | 2025 | PS Open Málaga | Simons vs 2 full houses | Royal flush crack | ★★★★ |
| LH-2024-WSOP-JAVIER-ZARCO | 2024 | WSOP | — | Mano viral española | ★★ |
| LH-2023-SCOOP-ES-WIN | 2023 | SCOOP | — | Título online ES | ★★ |

#### México (6)

| ID | Año | Evento | Oponentes | Concepto | Viral |
|----|-----|--------|-----------|----------|-------|
| LH-2024-EPT-BCN-NADAL-FH | 2024 | EPT Barcelona Estrellas ME | Luis Rayón Pérez | Full house vs bluff king-high | ★★★★ |
| LH-2024-EPT-BCN-NADAL-LEAD-D3 | 2024 | EPT Barcelona ME D3 | Parker Talbot (CA), Martin Zamani (US) | Acumulación chip lead | ★★★ |
| LH-2024-EPT-BCN-NADAL-2ND | 2024 | EPT Barcelona ME | FT internacional | Runner-up €394k | ★★★★ |
| LH-2016-WYNN-NADAL-WIN | 2016 | Wynn Summer Classic | Saout, Kerstetter (US) | Título (histórica — pack ampliado) | ★★ |
| LH-2024-WSOP-NADAL-SHOOTOUT | 2024 | WSOP #23 Shootout | — | Deep run | ★★ |
| LH-2025-WSOP-NADAL-LUCKY7 | 2025 | WSOP #90 | — | Deep | ★★ |

#### Argentina (6)

| ID | Año | Evento | Oponentes | Concepto | Viral |
|----|-----|--------|-----------|----------|-------|
| LH-2022-WSOP-ME-SALAS-A8 | 2022 | WSOP ME | Aaron Mermelstein (US) | A8 vs AK D27 | ★★★ |
| LH-2020-WSOP-ME-SALAS-HU-BOTTEON | 2020 | WSOP ME Intl FT | Brunno Botteon (BR) | K8 two pair river | ★★★★★ |
| LH-2021-WSOP-ME-SALAS-HEBERT | 2021 | WSOP ME Championship | Joseph Hebert (US) | KJ full house hand 173 HU | ★★★★★ |
| LH-2023-WSOP-PARADISE-4TH | 2023 | WSOP Paradise $25k | Mullur (US) | High roller 4º | ★★★ |
| LH-2024-EPT-MC-MYSTERY-3RD | 2024 | EPT MC €10.2k MB | — | Mystery Bounty 3º | ★★ |
| LH-2022-SCOOP-SALAS-PKO | 2022 | SCOOP $1.050 PKO | — | Título | ★★ |

#### LATAM vs USA — crossovers (10)

| ID | Año | Protagonistas | Concepto |
|----|-----|---------------|----------|
| LH-2024-WSOP-ME-GARCIA-FLUSH | 2024 | Adrián García (ES) vs Mateos | Runner-runner flush 5-bet pot |
| LH-2025-WSOP-ME-MIZRACHI-FT | 2025 | Mizrachi (US) vs Margets (ES) | ME FT |
| LH-2024-WSOP-BERRY-AA | 2024 | Will Berry (US) | Perspectiva villano vs Mateos |
| LH-2023-WSOP-ME-LATAM-DAY5 | 2023 | Varios LATAM vs US | Día 5 ME |
| LH-2022-WSOP-ME-MERMEl-STEIN | 2022 | Mermelstein (US) | Perspectiva eliminación Salas |
| LH-2024-TRITON-JUNGLE | 2024 | US vs BR/ES | High roller |
| LH-2025-EPT-BCN-FT | 2025 | Eychenne (FR) vs campo | ME EPT |
| LH-2024-GG-MILLIONS | 2024 | LATAM in US pool | Online HR |
| LH-2023-WPT-WOC | 2023 | Salas 3º WPT Online | vs US field |
| LH-2025-WSOP-FARAZ-72 | 2025 | Faraz Jaka (US) | 72o 3-bet bluff Day 1 ME viral |

### 7.4 Manos a completar para llegar a 100

Pipeline editorial por **plantillas repetibles**:

| Plantilla | # manos | Fuente |
|-----------|---------|--------|
| WSOP ME 2022–2025 Día 4–7 (LATAM protagonista) | 15 | PokerNews hand-by-hand, PokerGO |
| EPT Barcelona / Monte Carlo FT españoles | 10 | PokerStars replay |
| SCOOP / WCOOP títulos ES/MX/AR 2022–25 | 12 | PokerStars blog |
| Triton / SHR US vs LATAM | 8 | Triton highlights |
| Winamax/Ultimate Poker Show clips virales | 10 | YouTube ES |
| LAPT / BSOP / King’s LATAM | 8 | Recaps locales |
| PokerStars Open España (Malaga, etc.) | 7 | PS Open |
| «Perspectiva villano» de manos ya en catálogo | 20 | Mismo HH, otro rol |
| Manos US iconic vs LATAM en mesa (Jaka, Gold, Berry, Mizrachi…) | 10 | Clips 2024–25 |

**Total seed nombradas arriba:** ~44 únicas + ~20 perspectivas villano = **64**. Resto **36** vía plantillas WSOP/EPT/SCOOP con scraping manual asistido.

### 7.5 Ficha mínima por mano (checklist editorial)

- [ ] `id`, `year`, `event`, `cast[]` con países
- [ ] Cartas de todos los jugadores que vieron flop (o razón de muck)
- [ ] Acción calle a calle con tamaños (BB o % pot)
- [ ] Stacks efectivos al inicio
- [ ] `story.es` + `tags` + `viralScore`
- [ ] `sources[].url` verificable
- [ ] `replay.scripts` probado en motor
- [ ] ≥1 `heroCandidate` LATAM si aplica
- [ ] Revisión legal `editorial.status = ready`

---

## 8. Pipeline de autoría e ingesta

### 8.1 Fuentes de datos (prioridad)

1. **Hand histories oficiales** (PokerStars, GG) cuando están publicados
2. **Recaps PokerNews / CardPlayer** — texto con acción y cartas
3. **Clips PokerGO / YouTube** — verificación frame a frame
4. **Hendon Mob / WSOP.com** — metadatos y resultados
5. **CodigoPoker / PokerRed / Pokerlogia** — narrativa ES

### 8.2 Herramienta interna (CLI)

```
tools/legendary-ingest.js
  --source pokernews-url | --hh file.txt | --json draft.json
  → parse → validate → emit data/legendary-hands/hands/LH-….json
  → run tools/test-legendary-replay.js (smoke)
```

Pasos:

1. **Parse** HH con parsers existentes (`js/import/parsers/*`)
2. **Enriquecer** cast desde recap manual (YAML sidecar)
3. **Generar scripts** por héroe: algoritmo que fija `heroPos` y convierte `summary[]` en `forceScript`
4. **Validar** con replay automático (golden test por mano)
5. **Publicar** en índice

### 8.3 Sidecar de autoría (ejemplo)

```yaml
# hands/LH-2024-WSOP-ME-MATEOS-FOLD-KK.meta.yaml
cast:
  - id: adrian-mateos
    pos: HJ
    cards: [Ks, Kh]
  - id: will-berry
    pos: CO
    cards: [As, Ac]
board: [Qd, 4d, 2c, Ts, —]
story_es: |
  Mateos paga un 4-bet pot con KK. Berry apuesta flop y turn con AA;
  en el turn T, Mateos foldea en menos de 90 segundos. Joey Ingram: «en modo dios».
sources:
  - url: https://www.pokernews.com/news/2024/07/mateos-kings-fold-wsop-main-event-46510.htm
viralScore: 5
heroCandidates: [adrian-mateos, will-berry]
```

---

## 9. Multiway y limitaciones del motor

Hoy el trainer es **6-max** con foco **heads-up postflop**. Muchas manos legendarias son **3–4 way**.

| Estrategia | Cuándo |
|------------|--------|
| **A. Colapsar a HU** | Fold explícitos preflop/flop; quedan 2 jugadores — suficiente para ~65% del catálogo |
| **B. Multiway parcial** | `allowMultiway: true` + script para villanos secundarios (solo acciones, sin cartas) |
| **C. Modo observador** | Usuario no juega; ve timeline — para manos 4-way complejas |
| **D. Fase 2 engine** | Ver `ROADMAP_MULTIWAY_TRAINER.md` |

**Regla de catálogo MVP:** priorizar manos que colapsan a HU antes de publicar; marcar `multiway: true` si requiere B/C.

---

## 10. ForgeCoach y narrativa

Nuevo scope **`legendaryHand`** en `analyze-hand`:

```json
{
  "scope": "legendaryHand",
  "handId": "LH-2024-WSOP-ME-MATEOS-FOLD-KK",
  "heroPlayed": { "actions": ["call", "fold"] },
  "originalLine": { "mateos": ["call", "fold"], "berry": ["bet", "bet"] },
  "question": "¿El fold de Mateos es correctio sin conocer AA?"
}
```

Prompt incluye: nombres, evento, cita viral, stacks — **no solo GTO abstracto**.

---

## 11. Monetización y progresión

| Plan | Acceso |
|------|--------|
| **Gratis** | 5 manos destacadas/mes + 1 «mano del día» |
| **Study** | Catálogo completo; elección de rol |
| **Coach** | ForgeCoach debrief ilimitado + manos premium (HR, ME FT) |

**Progresión (sin confundir con Escuela):**

- Badges: «5 manos de Mateos», «Villano perfecto», «Fold más difícil»
- XP ligero opcional (`stats.legendaryHands.xp`) — **no** bloquea lecciones escuela
- Compartir reveal (reutilizar `share-hand`)

---

## 12. Legal, licencias y atribución

- Manos de eventos públicos: **recap editorial** + enlace fuente; no republicar video completo
- Atribución visible: PokerNews, PokerStars, WSOP, PokerGO
- Evitar HH crudos con nicknames de recreativos no famosos — **anonimizar recreativos** si aparecen
- `sources[].license = needs-review` hasta revisión manual
- Disclaimer: «Reconstrucción educativa; tamaños aproximados cuando la fuente no da HH exacto»

---

## 13. RoadMap de entrega por fases

### Fase 0 — Estudio y seed (actual)

- [x] Roadmap y schema
- [x] `data/legendary-hands/index.json` con ≥40 entradas seed
- [ ] Priorizar 10 manos «listas para HH» con ingest manual

### Fase 1 — MVP técnico (2–3 sprints)

- [ ] `js/legendary-hands.js` — hub + ficha + launch ciego
- [ ] `legendaryToForce(hand, heroPlayerId)` → `playAnalysisHand`
- [ ] Anonimización UI
- [ ] Pantalla reveal
- [ ] 10 manos `editorial.status = ready` jugables end-to-end
- [ ] Pestaña en `index.html` + bundle `pt-legendary`
- [ ] Progreso en `stats.legendaryHands`
- [ ] E2E: `e2e/legendary.spec.js`

### Fase 2 — Catálogo 50 manos

- [ ] CLI ingest + validador replay
- [ ] Filtros por jugador/paño/año
- [ ] Modo «Otro rol» + timeline original
- [ ] 50 manos publicadas
- [ ] ForgeCoach scope `legendaryHand`

### Fase 3 — 100 manos + polish

- [ ] Completar catálogo 100
- [ ] Multiway parcial (B)
- [ ] Supabase sync catálogo (CMS ligero)
- [ ] Plan gating + share reveal
- [ ] SEO landings por jugador («Manos de Adrián Mateos»)

### Fase 4 — Comunidad

- [ ] Votación mano de la semana
- [ ] Solicitudes de usuarios
- [ ] Integración Escuela: «Practica el concepto de esta mano» (spot GTO derivado)

---

## 14. Métricas de éxito

| Métrica | Objetivo 90 días post-launch |
|---------|------------------------------|
| Manos jugadas / MAU | ≥2 |
| % completan reveal | ≥85% |
| Rejugabilidad (2º rol) | ≥30% |
| Conversión Free → Study desde legendary | +5% relativo |
| Tiempo en sesión legendary | ≥8 min |
| NPS comentarios ForgeCoach legendary | ≥4/5 |

---

## 15. Decisiones abiertas

1. **Nombre final:** «Manos legendarias» vs «Manos de pros» vs «Replay legendario»
2. **Grading GTO en reveal:** ¿mostrar EV loss vs línea original del pro?
3. **Torneo vs cash:** ¿solo MTF o incluir cash high stakes?
4. **Idioma:** ES-only al launch o EN para cast internacional
5. **Multiway:** ¿esperar a roadmap multiway o lanzar con subset HU?

---

## Anexo A — Referencia de implementación mínima

```javascript
// legendary-hands.js (pseudo)
function playLegendaryHand(handId, opts) {
  var hand = LegendaryData.get(handId);
  var heroId = opts.heroId || randomHero(hand.heroCandidates);
  var force = legendaryToForce(hand, heroId);
  var pc = legendaryPlayConfig(hand, { blind: true, heroId: heroId });
  playAnalysisHand(force, pc);
}

function onHandEnd() {
  showLegendaryReveal(hand, heroId, userDecisions);
}
```

Reutiliza **100%** el loop de `playAnalysisHand` existente; el trabajo nuevo es **datos + hub + reveal + anonimización**.

---

*Documento vivo. Catálogo numérico en `data/legendary-hands/index.json`.*
