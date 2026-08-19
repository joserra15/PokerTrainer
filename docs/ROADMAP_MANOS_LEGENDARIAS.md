# RoadMap — Manos legendarias (jugar manos reales de pros)

> Estudio de producto, catálogo de contenido y plan de implementación para una sección donde el usuario **juega manos reales** de jugadores famosos — sobre todo **españoles, mexicanos y argentinos** frente a referentes de **Estados Unidos** — sin saber quién es ni qué mano es hasta el final.  
> **Alcance de este documento:** visión, arquitectura, catálogo objetivo (≥100 manos), UX, pipeline de datos y fases de entrega.  
> Complementa: `ROADMAP_LECCIONES_DIRIGIDAS.md`, importador de sesiones, `forceScript` del motor, ForgeCoach.  
> Fecha: agosto 2026 · Producto: PokerForgeAI

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Experiencia de usuario y flujo post-mano](#2-experiencia-de-usuario-y-flujo-post-mano)
3. [Diseño visual: mesa profesional broadcast](#3-diseño-visual-mesa-profesional-broadcast)
4. [Estado actual y piezas reutilizables](#4-estado-actual-y-piezas-reutilizables)
5. [Modelo de datos](#5-modelo-de-datos)
6. [Ubicación en la app: menú y naming](#6-ubicación-en-la-app-menú-y-naming)
7. [Modos de juego](#7-modos-de-juego)
8. [Catálogo objetivo: ≥100 manos](#8-catálogo-objetivo-100-manos)
9. [Pipeline de autoría e ingesta](#9-pipeline-de-autoría-e-ingesta)
10. [Multiway y limitaciones del motor](#10-multiway-y-limitaciones-del-motor)
11. [ForgeCoach y narrativa](#11-forgecoach-y-narrativa)
12. [Monetización y progresión](#12-monetización-y-progresión)
13. [Legal, licencias y atribución](#13-legal-licencias-y-atribución)
14. [Plan de implementación por fases](#14-plan-de-implementación-por-fases)
15. [Métricas de éxito](#15-métricas-de-éxito)
16. [Decisiones abiertas](#16-decisiones-abiertas)

---

## 1. Resumen ejecutivo

**Propuesta:** nueva sección **«Manos legendarias»** (nombre provisional) donde el usuario entra en manos reales de alto impacto mediático (2020–2026, foco 2022–2026), con nombres reales de jugadores, contexto de torneo y línea original reproducible.

**Loop principal:**

1. El usuario elige filtro o pulsa **«Manos al azar»**.
2. Se le asigna un **rol aleatorio** entre los actores de la mesa.
3. **Modo ciego** en **mesa broadcast** (neón/LED, fondo según evento): nombres anonimizados, cartas reales.
4. Juega la mano; el resto sigue la **línea histórica** (`forceScript`).
5. **Pantalla historia** (obligatoria, primer paso post-mano): narrativa, quién jugó, cuándo, enlace a vídeo (`target="_blank"`).
6. **Acciones secundarias:** línea original paso a paso (nombres reales) · jugar otro rol · ForgeCoach.

**Diferenciador visual:** la mesa no usa el skin estándar del entrenador; activa un **modo broadcast legendario** con luces, rail iluminado y fondo temático (WSOP, EPT, SCOOP…).

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

## 2. Experiencia de usuario y flujo post-mano

### 2.1 Journey completo (4 pantallas)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  HUB            │ ──► │  MESA CIEGA      │ ──► │  HISTORIA       │ ──► │  POST-HISTORIA   │
│  Biblioteca     │     │  Broadcast       │     │  (reveal)       │     │  (acciones)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘     └──────────────────┘
  Filtros / al azar       Rol aleatorio          Story + cast +         Timeline real
  Spoiler oculto          Jugador A, B…          fecha + vídeo ▶        Otro rol / Coach
                          Mesa neón + fondo      (nueva pestaña)
```

### 2.2 Pantalla 1 — Hub

- Grid/lista de manos con **título ciego** (`titleBlind`), año, evento, banderas de jugadores (sin spoiler de cartas).
- CTA principal: **«Jugar al azar»** · secundario: **«Elegir mano»**.
- Progreso: «23/100 manos · 41 perspectivas jugadas».

### 2.3 Pantalla 2 — Mesa ciega (juego)

| Elemento | Comportamiento |
|----------|----------------|
| Nombres | `Jugador A`, `Jugador B`… (mapa estable por mano) |
| Posición / stacks | Visibles |
| Cartas propias | Visibles |
| Cartas rivales | Ocultas hasta showdown o fin de mano |
| Título de mano | Oculto |
| Visual | **Modo broadcast** (§3): neón, LED rail, fondo según `event.series` |
| HUD estándar GTO | Minimizado u oculto (no romper inmersión) |

Al terminar la mano (fold/showdown/all-in): transición animada → **Pantalla Historia** (no se salta).

### 2.4 Pantalla 3 — Historia (reveal obligatorio)

Contenido en orden fijo:

1. **Título real** de la mano (spoiler permitido aquí).
2. **Historia** (`story.es`): 2–4 frases + bullets de momentos clave.
3. **Ficha del evento:**
   - Torneo · Etapa (Día 5, FT, HU…) · Fecha · Buy-in · Venue.
4. **Reparto (`cast`):** foto/avatar placeholder + **nombre real** + país + posición + cartas finales (si se vieron).
5. **Tu rol:** «Jugaste como **Adrián Mateos** (España · HJ)».
6. **Vídeo** (si `media.videoUrl` existe):
   - Botón **«Ver la mano original ▶»** → `window.open(url, '_blank', 'noopener,noreferrer')`.
   - Subtexto con fuente (PokerGO, YouTube, PokerNews…).
   - Si hay `clipStartSec`, mostrar hint «Empieza en 2:34» (no deep-link obligatorio en MVP).
7. CTA principal: **«Continuar »** (lleva a Post-historia).

**Regla:** el usuario **no puede** ir directo a timeline u otro rol sin pasar por Historia al menos una vez por sesión de mano.

### 2.5 Pantalla 4 — Post-historia (acciones)

Tras «Continuar», panel con tres acciones claras:

| Acción | Descripción | Implementación |
|--------|-------------|----------------|
| **Ver qué pasó en realidad** | Timeline paso a paso con **nombres reales**, cartas reveladas, tamaños | `openLegendaryTimeline(handId)` → reutiliza `renderTimelineReview` + `cast` |
| **Jugar con otro rol** | Selector de `heroCandidates` (Mateos / Berry / …) | `playLegendaryHand(handId, { heroId, blind: true })` |
| **Preguntar al ForgeCoach** | Debrief contextual (plan Coach) | scope `legendaryHand` |

Opcional secundario: **«Volver al hub»** · **«Compartir esta mano»**.

### 2.6 Principios UX

| Principio | Implementación |
|-----------|----------------|
| **Spoiler-free en juego** | Anonimización hasta Pantalla Historia |
| **Historia antes que datos** | Narrativa emocional → luego timeline técnico |
| **Vídeo externo** | Siempre nueva pestaña; nunca iframe embebido (licencias, rendimiento) |
| **Perspectiva múltiple** | Cada miembro de `cast` con cartas puede ser héroe |
| **Rejugabilidad** | Contador por mano/rol en `stats.legendaryHands` |

### 2.7 Wire — Post-historia

```
┌────────────────────────────────────────────────────────────┐
│  ¿Qué quieres hacer ahora?                                  │
├────────────────────────────────────────────────────────────┤
│  [ Ver qué pasó en realidad ]   ← timeline, nombres reales │
│  [ Jugar como Will Berry     ]   ← otro rol, modo ciego    │
│  [ Jugar como Lingkun Lu     ]                              │
│  [ Preguntar al ForgeCoach   ]   ← plan Coach              │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Diseño visual: mesa profesional broadcast

Las manos legendarias **no comparten el look del entrenador estándar**. Al entrar en juego se activa `body.legendary-play` (o contenedor `#legendary-play-active`) con skin dedicado.

### 3.1 Concepto visual

Inspiración: mesa de **TV / feature table** — rail con **tira LED**, felt premium, vignette de estudio, cartas con borde luminoso sutil, fondo atmosférico según el evento.

### 3.2 Temas de escenario (`visual.theme`)

Cada mano declara un tema derivado del evento (fallback automático por `event.series`):

| `visual.theme` | Evento | Fondo (backdrop) | Acento LED / neón |
|----------------|--------|------------------|-------------------|
| `wsop` | WSOP ME / bracelet Las Vegas | Oscuro cálido, bokeh dorado, silueta Horseshoe/Paris | `#f5c451` gold + `#ff6b35` amber |
| `ept` | EPT Barcelona / Monte Carlo | Azul profundo, luces ciudad, estrellas discretas | `#00d4ff` cyan + `#7c5cff` violet |
| `scoopp` | SCOOP / WCOOP online | Negro puro, grid digital, scanlines muy suaves | `#00ff88` green + `#0099ff` blue |
| `triton` | Triton / SHR | Negro, reflejos plateados, minimal luxury | `#e8e8e8` white + `#c9a227` gold |
| `lapt` | LAPT / BSOP / LATAM live | Verde/azul LATAM, crowd blur | `#2ecc71` + `#3498db` |
| `default` | Otros | Gradiente oscuro neutro | `#f5c451` |

Campo en datos:

```javascript
visual: {
  theme: "wsop",           // wsop | ept | scoopp | triton | lapt | default
  tableVariant: "feature", // feature | final-table | heads-up
  spotlight: true          // foco central en mesa
}
```

### 3.3 Componentes CSS (nuevos)

Archivo: **`css/legendary.css`** (lazy con bundle `pt-legendary`).

```css
/* Contenedor escena */
.legendary-scene {
  position: relative;
  min-height: 100%;
  background: var(--legendary-backdrop); /* por tema */
  overflow: hidden;
}

/* Fondo atmosférico (pseudo-capas) */
.legendary-scene::before { /* bokeh / gradiente */ }
.legendary-scene::after  { /* viñeta + grain sutil */ }

/* Mesa broadcast */
.legendary-scene .table-felt {
  /* Rail LED animado */
  border: 14px solid transparent;
  background:
    linear-gradient(var(--felt-a), var(--felt-b)) padding-box,
    linear-gradient(90deg, var(--led-a), var(--led-b), var(--led-a)) border-box;
  box-shadow:
    0 0 40px color-mix(in srgb, var(--led-a) 35%, transparent),
    0 0 80px color-mix(in srgb, var(--led-b) 20%, transparent),
    inset 0 0 60px rgba(0,0,0,.45);
  animation: legendary-led-pulse 4s ease-in-out infinite;
}

/* Tira LED perimetral (::after en .table-felt) */
.legendary-scene .table-felt::after {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: inherit;
  pointer-events: none;
  box-shadow:
    inset 0 0 12px var(--led-a),
    0 0 24px var(--led-b);
}

/* Cartas del héroe — borde sutil luminoso */
.legendary-scene .seat-hero .card {
  box-shadow: 0 0 12px color-mix(in srgb, var(--led-a) 50%, transparent);
}

/* Badge evento (esquina) */
.legendary-event-badge {
  position: absolute; top: 12px; left: 12px;
  padding: 6px 12px; border-radius: 8px;
  background: rgba(0,0,0,.55); backdrop-filter: blur(8px);
  border: 1px solid color-mix(in srgb, var(--led-a) 40%, transparent);
  font-size: 11px; font-weight: 700; letter-spacing: .06em;
  text-transform: uppercase; color: var(--led-a);
}
```

Variables por tema en `[data-legendary-theme="wsop"]` etc., análogas a los temas existentes `data-theme="emerald|midnight|crimson"` en `css/styles.css` (líneas 2264–2280).

### 3.4 Integración con motor existente

| Hook | Cambio |
|------|--------|
| `playAnalysisHand` | Si `playConfig.legendaryMode: true`, no aplicar `loadTableTheme()` estándar |
| `renderTable()` | Detectar `hand.playConfig.legendaryMode` → añadir clases `legendary-scene`, `data-legendary-theme` |
| `#play-active` | Wrapper extra `.legendary-play-wrap` con backdrop |
| Cartas | Reutilizar componente `.card` actual; solo override de sombra/borde |
| Transición fin mano | Clase `.legendary-hand-end` → fade out mesa → navigate a `#legendary-story` |

### 3.5 Pantalla Historia — diseño

- Layout tipo **artículo + ficha deportiva**, no mesa.
- Cabecera con gradiente del tema (`wsop` gold, `ept` cyan…).
- Grid de jugadores: avatar circular, bandera, nombre, cartas en miniatura.
- Botón vídeo destacado (icono play + borde neón del tema).
- Animación entrada: stagger suave en cast (CSS `@keyframes legendary-reveal-in`).

### 3.6 Accesibilidad y rendimiento

- **`prefers-reduced-motion`:** desactivar `legendary-led-pulse` y animaciones de fondo.
- **Móvil:** LED glow reducido (menos box-shadow), fondo estático (sin animación).
- **Contraste:** texto sobre backdrop siempre ≥ WCAG AA.

### 3.7 Assets opcionales (Fase 3+)

- Logos de serie en SVG monocromo (`assets/legendary/wsop-mark.svg`).
- Thumbnails de evento para hub (generados o estáticos por tema).
- No depender de fotos de jugadores en MVP (avatar genérico + bandera).

---

## 4. Estado actual y piezas reutilizables

### 4.1 Motor de replay

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

### 4.2 Formato sesión importada

`data/demo-session.json` define el shape rico: `positions`, `streets`, `summary`, `villainShows`. Es el **formato canónico de almacenamiento** del catálogo.

### 4.3 Lo que NO existe

- Tabla o bundle `pt_legendary_hands` / `data/famous-hands/`
- UI de biblioteca
- Modo «rol aleatorio + anonimización»
- Multiway `forceScript` completo (solo parcial en motor)
- Skin broadcast legendario (`css/legendary.css`)
- Pantallas Historia y Post-historia

- Scope ForgeCoach `legendaryHand`

---

## 5. Modelo de datos

### 5.1 Registro de catálogo (`LegendaryHand`)

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

  // Medios
  media?: {
    videoUrl?: string;           // YouTube, PokerGO, etc. — abre en nueva pestaña
    videoLabel?: string;         // "Ver en PokerGO"
    clipStartSec?: number;
    thumbnailUrl?: string;
  };

  // Visual broadcast (§3)
  visual: {
    theme: "wsop" | "ept" | "scoopp" | "triton" | "lapt" | "default";
    tableVariant?: "feature" | "final-table" | "heads-up";
    spotlight?: boolean;
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

### 5.2 Progreso usuario (`stats.legendaryHands`)

```javascript
{
  played: { "LH-2024-…": { count: 2, roles: ["adrian-mateos", "will-berry"], lastAt: ts } },
  revealed: ["LH-2024-…"],
  favorites: [],
  badges: ["mateos-5", "latam-20"],
  updatedAt: ts
}
```

### 5.3 Almacenamiento

| Fase | Dónde |
|------|--------|
| MVP | `data/legendary-hands/index.json` + `data/legendary-hands/hands/*.json` |
| V2 | Supabase `pt_legendary_hands` (JSONB + índices GIN en tags/players) |
| CDN | Bundle lazy `pt-legendary.js` (~500 KB comprimido para 100 manos) |

---

## 6. Ubicación en la app: menú y naming

### 6.1 Recomendación: **pestaña propia**

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

### 6.2 Naming interno

- Código: `js/legendary-hands.js`, `js/legendary-data.js`, bundle `pt-legendary`
- IDs: prefijo `LH-`
- i18n keys: `legendary.*`

---

## 7. Modos de juego

| Modo | Descripción | Motor |
|------|-------------|-------|
| **Ciego (default)** | Rol aleatorio, nombres anonimizados, mesa broadcast | `playAnalysisHand` + `legendaryMode: true` |
| **Historia (reveal)** | Pantalla obligatoria post-mano | `showLegendaryStory(handId, heroId)` |
| **Línea original** | Timeline con nombres reales | `openLegendaryTimeline(handId)` → `renderTimelineReview` |
| **Otro rol** | Mismo HH, otro `heroPlayerId`, vuelve a modo ciego | `playLegendaryHand(handId, { heroId })` |
| **GTO libre** | Mismas cartas, villanos GTO (secundario) | `playAnalysisHand` sin script |
| **ForgeCoach** | Debrief tras Historia | scope `legendaryHand` |

**Orden fijo post-mano:** Juego → **Historia** → (Continuar) → Post-historia { Timeline | Otro rol | Coach }.

**Vídeo:** botón en Historia llama a `openLegendaryVideo(hand)`:

```javascript
function openLegendaryVideo(hand) {
  var url = hand.media && hand.media.videoUrl;
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}
```

**Anonimización en UI:** mapa `playerId → "Jugador A"` generado por seed de sesión (consistente dentro de la mano, distinto entre manos).

---

## 8. Catálogo objetivo: ≥100 manos

### 8.1 Criterios de selección

1. **Ventana temporal:** 2020–2026; **≥70 manos de 2022–2026**.
2. **Repercusión online:** cobertura PokerNews, PokerGO, CodigoPoker, Twitter/X, YouTube >50 K views, o momento FT WSOP/EPT.
3. **Geografía:** **≥40 manos** con protagonista ES/MX/AR; **≥25 manos** LATAM vs USA en la misma mesa.
4. **Datos jugables:** cartas conocidas de héroe y ≥1 villano; acción calle a calle documentada.
5. **Variedad:** preflop, 3-bet/4-bet/5-bet, bluffs river, hero folds, bad beats, ICM FT, PKO.

### 8.2 Distribución objetivo (100 manos)

| Bucket | # | Ejemplos de fuente |
|--------|---|-------------------|
| España (Mateos, Margets, Galiana, Aido, Zarco, Foxen…) | 28 | WSOP 2024–25, EPT, SCOOP |
| México (Nadal, Arce, Rodríguez…) | 12 | EPT Barcelona, WSOP, LAPT |
| Argentina (Salas, Ponzio, Cabrera…) | 12 | WSOP ME, SCOOP, EPT |
| LATAM otros (Brasil, Chile, Colombia vs US) | 8 | WSOP ME, Triton |
| USA vs LATAM (villano US, héroe LATAM y viceversa) | 25 | ME, HR, EPT |
| Online viral (SCOOP/GG/PokerStars) | 15 | Clips 2022–25 |
| **Total** | **100** | |

### 8.3 Seed catalog — manos documentadas (Fase 0)

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

### 8.4 Manos a completar para llegar a 100

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

### 8.5 Ficha mínima por mano (checklist editorial)

- [ ] `id`, `year`, `event`, `cast[]` con países
- [ ] Cartas de todos los jugadores que vieron flop (o razón de muck)
- [ ] Acción calle a calle con tamaños (BB o % pot)
- [ ] Stacks efectivos al inicio
- [ ] `story.es` + `tags` + `viralScore`
- [ ] `sources[].url` verificable
- [ ] `replay.scripts` probado en motor
- [ ] ≥1 `heroCandidate` LATAM si aplica
- [ ] `media.videoUrl` si existe clip público
- [ ] `visual.theme` coherente con evento

- [ ] Revisión legal `editorial.status = ready`

---

## 9. Pipeline de autoría e ingesta

### 9.1 Fuentes de datos (prioridad)

1. **Hand histories oficiales** (PokerStars, GG) cuando están publicados
2. **Recaps PokerNews / CardPlayer** — texto con acción y cartas
3. **Clips PokerGO / YouTube** — verificación frame a frame
4. **Hendon Mob / WSOP.com** — metadatos y resultados
5. **CodigoPoker / PokerRed / Pokerlogia** — narrativa ES

### 9.2 Herramienta interna (CLI)

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

### 9.3 Sidecar de autoría (ejemplo)

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
media:
  videoUrl: https://www.youtube.com/watch?v=…   # si localizado
  videoLabel: Ver en YouTube
  clipStartSec: 154
visual:
  theme: wsop
  tableVariant: feature
viralScore: 5
heroCandidates: [adrian-mateos, will-berry]
```

---

## 10. Multiway y limitaciones del motor

Hoy el trainer es **6-max** con foco **heads-up postflop**. Muchas manos legendarias son **3–4 way**.

| Estrategia | Cuándo |
|------------|--------|
| **A. Colapsar a HU** | Fold explícitos preflop/flop; quedan 2 jugadores — suficiente para ~65% del catálogo |
| **B. Multiway parcial** | `allowMultiway: true` + script para villanos secundarios (solo acciones, sin cartas) |
| **C. Modo observador** | Usuario no juega; ve timeline — para manos 4-way complejas |
| **D. Fase 2 engine** | Ver `ROADMAP_MULTIWAY_TRAINER.md` |

**Regla de catálogo MVP:** priorizar manos que colapsan a HU antes de publicar; marcar `multiway: true` si requiere B/C.

---

## 11. ForgeCoach y narrativa

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

## 12. Monetización y progresión

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

## 13. Legal, licencias y atribución

- Manos de eventos públicos: **recap editorial** + enlace fuente; no republicar video completo
- Atribución visible: PokerNews, PokerStars, WSOP, PokerGO
- Evitar HH crudos con nicknames de recreativos no famosos — **anonimizar recreativos** si aparecen
- `sources[].license = needs-review` hasta revisión manual
- Disclaimer: «Reconstrucción educativa; tamaños aproximados cuando la fuente no da HH exacto»

- Vídeo: enlace externo en nueva pestaña; no rehosting de contenido

---

## 14. Plan de implementación por fases

> Fases listas para ejecutar. Cada tarea incluye **archivos**, **criterio de aceptación (DoD)** y **dependencias**.

### Vista general

```
Fase 1 ──► Shell + mesa broadcast + 1 mano jugable + Historia
Fase 2 ──► Post-historia (timeline + otro rol) + 10 manos + hub
Fase 3 ──► 50 manos + vídeos + filtros + ingest CLI
Fase 4 ──► 100 manos + ForgeCoach + plan gating + polish
```

---

### Fase 1 — Fundamentos jugables (empezar aquí)

**Objetivo:** una mano completa end-to-end con mesa broadcast y pantalla Historia.

| # | Tarea | Archivos | DoD |
|---|-------|----------|-----|
| 1.1 | Pestaña y shell HTML | `index.html`, `css/legendary.css` | Tab «Manos legendarias» visible; contenedor `#legendary-panel` con vistas `hub`, `play`, `story`, `after` |
| 1.2 | Módulo datos | `js/legendary-data.js` | Carga `data/legendary-hands/index.json` + fetch lazy de `hands/{id}.json` |
| 1.3 | Orquestador UI | `js/legendary-hands.js` | State machine: `hub → play → story → after` |
| 1.4 | CSS mesa broadcast | `css/legendary.css` | Temas `wsop`, `ept`, `scoopp` con LED rail + backdrop; `prefers-reduced-motion` |
| 1.5 | Hook mesa en motor | `js/app.js` (`renderTable`, `applyTableTheme`) | Si `playConfig.legendaryMode`, aplica `legendary-scene` + `data-legendary-theme`; no pisa tema trainer |
| 1.6 | Conversor a force | `js/legendary-force.js` | `legendaryToForce(hand, heroPlayerId)` → `{ forceDeal, forceScript, seed }` |
| 1.7 | Anonimización | `js/legendary-hands.js` | `anonymizeCast(cast, seed)` → labels Jugador A/B; restaurar nombres en Historia |
| 1.8 | Lanzar juego ciego | `js/legendary-hands.js` | `playLegendaryHand(id, { blind: true })` → `playAnalysisHand(force, playConfig)` |
| 1.9 | Intercept fin de mano | `js/app.js` o callback en legendary | Si `legendaryMode`, redirect a `#legendary-story` en lugar de pantalla trainer estándar |
| 1.10 | Pantalla Historia | `js/legendary-hands.js`, `css/legendary.css` | Muestra story, cast real, fecha, evento, tu rol; botón vídeo si `media.videoUrl` |
| 1.11 | Abrir vídeo | `js/legendary-hands.js` | `openLegendaryVideo` → nueva pestaña con `noopener,noreferrer` |
| 1.12 | 1 mano completa | `data/legendary-hands/hands/LH-2024-WSOP-ME-MATEOS-FOLD-KK.json` | `editorial.status: ready`; replay smoke test pasa |
| 1.13 | Bundle | `js/bundle-chunks.js`, `dist/` | Chunk lazy `pt-legendary` |
| 1.14 | Progreso básico | `js/storage.js` | `stats.legendaryHands.played[id]` actualizado al ver Historia |
| 1.15 | E2E mínimo | `e2e/legendary.spec.js` | Hub → jugar → Historia visible → vídeo link presente (mock) |

**Entregable Fase 1:** usuario juega Mateos fold KK en mesa neón WSOP → ve Historia con nombres reales → puede abrir vídeo.

**Dependencias externas:** HH completo de Mateos/Berry (autoría manual desde recap PokerNews).

---

### Fase 2 — Post-historia y catálogo inicial

**Objetivo:** flujo completo con timeline, cambio de rol, hub con 10 manos.

| # | Tarea | Archivos | DoD |
|---|-------|----------|-----|
| 2.1 | Pantalla Post-historia | `js/legendary-hands.js` | Tres CTAs: Timeline · Otro rol · Volver al hub |
| 2.2 | Timeline nombres reales | `js/legendary-hands.js` | `openLegendaryTimeline(hand)` adapta `hand` a shape sesión + `openAnalysisHandReview(h, 'timeline')` con nombres de `cast` |
| 2.3 | Selector otro rol | `js/legendary-hands.js` | Lista `heroCandidates` con bandera; relanza en modo ciego |
| 2.4 | Hub biblioteca | `js/legendary-hands.js` | Grid manos: titleBlind, año, flags, featured; botón «Al azar» |
| 2.5 | Badge evento en mesa | `css/legendary.css` | `.legendary-event-badge` con nombre evento (sin spoiler) |
| 2.6 | Transición animada | `css/legendary.css` | Fade mesa → Historia |
| 2.7 | 10 manos ready | `data/legendary-hands/hands/*.json` | Lista abajo; todas pasan `tools/test-legendary-replay.js` |
| 2.8 | Temas visuales restantes | `css/legendary.css` | `triton`, `lapt`, `default` |
| 2.9 | E2E flujo completo | `e2e/legendary.spec.js` | Jugar → Historia → Timeline → Otro rol |

**10 manos prioritarias Fase 2:**

1. `LH-2024-WSOP-ME-MATEOS-FOLD-KK`
2. `LH-2024-WSOP-ME-MATEOS-AA-CRACKED`
3. `LH-2024-WSOP-GALIANA-7HIGH-BLUFF`
4. `LH-2021-WSOP-CLOSER-HU-COMEBACK`
5. `LH-2024-EPT-BCN-NADAL-FH`
6. `LH-2022-WSOP-ME-SALAS-A8`
7. `LH-2020-WSOP-ME-SALAS-HU-BOTTEON`
8. `LH-2024-SCOOP-TITANS-BLUFF-River`
9. `LH-2022-EPT-MC-100K-CALL-J8`
10. `LH-2024-WSOP-BERRY-AA` (perspectiva villano)

**Entregable Fase 2:** producto usable con 10 manos virales y rejugabilidad por rol.

---

### Fase 3 — Escala a 50 manos + tooling

**Objetivo:** pipeline editorial, filtros, vídeos enlazados en mayoría de manos.

| # | Tarea | Archivos | DoD |
|---|-------|----------|-----|
| 3.1 | CLI ingest | `tools/legendary-ingest.js` | Parse recap/HH → JSON mano + validación |
| 3.2 | Smoke replay | `tools/test-legendary-replay.js` | CI falla si mano ready no replayable |
| 3.3 | Filtros hub | `js/legendary-hands.js` | Por país, jugador, año, tag, `event.series` |
| 3.4 | Campo media en índice | `data/legendary-hands/index.json` | `videoUrl` poblado donde exista clip |
| 3.5 | 50 manos ready | `data/legendary-hands/hands/` | 50 JSON con `editorial.status: ready` |
| 3.6 | Progreso ampliado | `js/storage.js` | Roles jugados, favoritos, contador global |
| 3.7 | Share reveal | `supabase/functions/share-hand` | Tipo `legendary` con story + cast (sin spoiler pre-juego) |
| 3.8 | Multiway HU-collapse | `js/legendary-force.js` | Documentar y soportar manos 3-way colapsadas |

**Entregable Fase 3:** biblioteca de 50 manos filtrable; ≥30 con enlace vídeo.

---

### Fase 4 — 100 manos + Coach + monetización

| # | Tarea | Archivos | DoD |
|---|-------|----------|-----|
| 4.1 | ForgeCoach scope | `supabase/functions/analyze-hand`, `js/ai-report.js` | scope `legendaryHand` con contexto evento |
| 4.2 | Plan gating | `js/legendary-hands.js`, billing | Free: 5 manos/mes; Study: catálogo; Coach: HR/FT + IA |
| 4.3 | 100 manos | catálogo completo | Distribución §8.2 cumplida |
| 4.4 | Supabase CMS | `supabase/migrations/xxx_legendary_hands.sql` | Tabla opcional para update sin deploy |
| 4.5 | SEO / landings | rutas estáticas o query | «Manos de Adrián Mateos» indexable |
| 4.6 | Polish visual | `css/legendary.css` | Logos serie SVG; spotlight FT; HU variant |
| 4.7 | Integración Escuela | `js/school.js` | Enlace opcional «Concepto relacionado» desde Historia |

**Entregable Fase 4:** producto completo lanzable.

---

### Estructura de archivos (target)

```
css/legendary.css
js/legendary-data.js       # carga catálogo
js/legendary-force.js      # legendaryToForce, anonymizeCast
js/legendary-hands.js      # UI hub, story, after, orchestration
data/legendary-hands/
  index.json
  hands/LH-….json
tools/legendary-ingest.js
tools/test-legendary-replay.js
e2e/legendary.spec.js
```

### Contrato `playConfig` legendario

```javascript
{
  legendaryMode: true,
  legendaryHandId: 'LH-2024-WSOP-ME-MATEOS-FOLD-KK',
  legendaryHeroId: 'adrian-mateos',
  legendaryBlind: true,
  legendaryTheme: 'wsop',      // → data-legendary-theme
  schoolMode: false,
  liveAdvisor: false,
  villainLevel: 'pro',
  formatHub: 'mtt'
}
```

### Callback fin de mano (integración app.js)

```javascript
// Al finalizar mano en trainer:
if (playConfig.legendaryMode && window.PTLegendary) {
  PTLegendary.onHandComplete(hand, {
    handId: playConfig.legendaryHandId,
    heroId: playConfig.legendaryHeroId,
    userDecisions: hand.decisions
  });
  return; // no mostrar pantalla resultado trainer estándar
}
```

---

## 15. Métricas de éxito

| Métrica | Objetivo 90 días post-launch |
|---------|------------------------------|
| Manos jugadas / MAU | ≥2 |
| % completan reveal | ≥85% |
| Rejugabilidad (2º rol) | ≥30% |
| Conversión Free → Study desde legendary | +5% relativo |
| Tiempo en sesión legendary | ≥8 min |
| NPS comentarios ForgeCoach legendary | ≥4/5 |

---

## 16. Decisiones abiertas

1. **Nombre final:** «Manos legendarias» vs «Manos de pros» vs «Replay legendario»
2. **Grading GTO en reveal:** ¿mostrar EV loss vs línea original del pro?
3. **Torneo vs cash:** ¿solo MTF o incluir cash high stakes?
4. **Idioma:** ES-only al launch o EN para cast internacional
5. **Multiway:** ¿esperar a roadmap multiway o lanzar con subset HU?

---

## Anexo A — Referencia de implementación mínima

```javascript
// js/legendary-hands.js
function playLegendaryHand(handId, opts) {
  var meta = LegendaryData.get(handId);
  var heroId = opts.heroId || randomPick(meta.heroCandidates);
  var force = LegendaryForce.toForce(meta, heroId);
  var pc = {
    legendaryMode: true,
    legendaryHandId: handId,
    legendaryHeroId: heroId,
    legendaryBlind: opts.blind !== false,
    legendaryTheme: (meta.visual && meta.visual.theme) || 'default',
    liveAdvisor: false,
    schoolMode: false
  };
  playAnalysisHand(force, pc);
}

function onHandComplete(ctx) {
  renderLegendaryStory(ctx.handId, ctx.heroId, ctx.userDecisions);
}

function onStoryContinue(handId) {
  renderLegendaryAfter(handId); // timeline | otro rol | coach
}

function openLegendaryVideo(hand) {
  var url = hand.media && hand.media.videoUrl;
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}
```

Reutiliza el loop de `playAnalysisHand`; trabajo nuevo = **skin broadcast + pantallas Historia/Post-historia + datos**.

---

*Documento vivo. Catálogo en `data/legendary-hands/index.json`. **Siguiente paso: Fase 1, tarea 1.1.***
