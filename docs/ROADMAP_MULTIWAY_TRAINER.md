# Roadmap — Botes multiway en el entrenador

> **Estado (v2.1.0):** Fases 0–3 **implementadas**. Ver `js/engine/multiway.js`, escenario UI `multiway`, y `tools/test-multiway-trainer.js`.
>
> Documento histórico + estado shipped. Las secciones «Hoy / Meta» de §1–2 describen el **gap pre-v2**; el estado actual está en el encabezado y en §Estado shipped abajo.

---

## Estado shipped (v2.1+)

| Dimensión | Estado |
|-----------|--------|
| Escenario UI `multiway` | Chip + subtipos SRP 3/4-way / limp pot |
| `allowMultiway` | On por defecto en `random`/`multiway`; off en escenarios fijos (RFI/3bet…) |
| Callers vivos al flop | Sí, cuando `allowMultiway` |
| Equity / scoring N-way | MC multi-oponente + flag `multiway` (confianza −1) |
| Cartas por rol × perfil | Samplers en `play-config` + perfiles por seat |

---

## 1. Resumen ejecutivo (histórico pre-v2)

| Dimensión | Antes | Meta (cumplida) |
|-----------|-------|-----------------|
| Deal de mesa | Full table | Sin cambio |
| Preflop multi-call | Callers descartados en goFlop | Callers vivos |
| Postflop | Solo `hand.villain` | N jugadores vivos |
| Opción Multiway | No existía | Chip + subtipos |
| Equity | HU | N-way MC |

**Veredicto histórico:** el gap era el colapso HU en `goFlop` y la falta de política N-way. Eso ya está cubierto en motor + UI.

---

## 2. Estado actual (mapa técnico)

### 2.1 Flujo

```
UI setup (escenario / handRange / nivel / multiway)
  → PTPlayConfig.pickScenario / buildScenarioPool
  → Engine.newHand → dealForPlayConfig → setup*
  → advancePreflop (callers extra si allowMultiway)
  → goFlop → seats vivas (multiway.js)
  → enterStreet / advancePostflop N-way
  → GTO evaluateSpot + equity N-way
```

### 2.2 Archivos clave

| Capa | Archivo | Rol |
|------|---------|-----|
| UI escenarios | `index.html` (`#setup-scenario`), `js/app.js` | Chips; lectura de config |
| Pool de spots | `js/play-config.js` | `buildScenarioPool`, samplers |
| Motor multiway | `js/engine/multiway.js` | Side pots, seats vivas, equity |
| Motor | `js/engine.js` | Setup, preflop, postflop |
| Scoring | `js/engine/scoring/scoring.js` | Flag `multiway` |

### 2.3–2.5 (archivo histórico)

Las listas de «puntos de colapso HU» y «lo que no existe» de versiones anteriores quedaron obsoletas tras Fases 0–3. Conservar solo como referencia de diseño; no usan el código actual.

---

## 3. Principios de diseño

1. **Una sola fuente de verdad postflop:** seats vivas en `hand.table.inHand` (N≥2), no un único `hand.villain` como dueño del pot. `villain` pasa a ser “to-act / focus UI” o se depreca gradualmente.
2. **Random = realismo por simulación**, no por quota fija de “30% multiway”. La tasa emerge de cartas + perfiles + rangos de call/3bet.
3. **Modo Multiway = sampling dirigido**: se construye el tipo de bote y se muestrean manos **aptas** por rol y perfil; no se espera a que salga por azar.
4. **Honestidad de GTO:** sin trees multiway reales, marcar `multiway: true`, bajar confianza, y usar heurísticas explícitas (c-bet down, value thicken, less bluff) documentadas.
5. **Replay/seed:** cualquier path multiway debe quedar en `replaySnapshot` (seats vivas, roles, forceDeal por seat).

---

## 4. Tipos de bote multiway a soportar

Prioridad de producto (cash 6-max primero; spin 3-max y MTT después):

| ID | Nombre | Forma típica | Frecuencia natural (orientativa) |
|----|--------|--------------|----------------------------------|
| `srp3way` | SRP 3-way | Open + cold-call + BB (u otro) call | Media-alta en fish; baja en pro |
| `srp4way+` | SRP 4+ | Open + ≥2 callers | Baja; más con fish/maniac |
| `limpPot` | Limp multiway | ≥2 limps → check/call BB o iso fallido | Media en fish |
| `squeezeCall` | Squeeze llamado multiway | Open + call + squeeze → ≥1 call | Baja (ya hay squeeze HU-céntrico) |
| `3betMulti` | 3-bet pot multiway | Open + call + 3bet cold / squeeze call-along | Rara |

MVP recomendado: **`srp3way` + `limpPot`**. El resto en fase 2.

---

## 5. Camino A — Random realista

### 5.1 Idea

En Random (sobre todo con `handRange: random` / `all`):

1. Repartir mesa completa (ya ocurre).
2. Simular preflop **asiento a asiento** con cartas reales + perfil (`VPF` + biases).
3. Si al cerrar la acción preflop quedan **≥3 jugadores** (héroe incluido), **conservar** el bote multiway al flop.
4. Si quedan 2 → flujo HU actual.
5. Si el héroe no llega al flop → mano no jugable / regenerar según política actual de practice street.

Con `handRange: playable|borderline` el Random sigue siendo scenario-first, pero los callers secundarios **dejan de foldearse en `goFlop`** cuando su acción preflop fue call coherente.

### 5.2 Cambios concretos

| # | Cambio | Dónde |
|---|--------|-------|
| A1 | Flag de sesión `allowMultiway: true` por defecto en random (o siempre on, off solo si UI lo pide) | `play-config.js`, UI opcional |
| A2 | En `resolveBlindsAfterHeroOpen`: si `allowMultiway` y `callers.length ≥ 2` (o héroe + ≥2), **no** volcar extras a fold en flop; construir `hand.opponents` / mantener `inHand` | `engine.js` |
| A3 | `goFlop`: solo fold extras si `!allowMultiway` o si el path es “focus HU”; si multiway, `syncTableToMultiwayPot` | `engine.js` |
| A4 | Sustituir / complementar `syncTableToActivePot` con versión N-way | `engine.js` |
| A5 | Postflop: orden de actuación `POSTFLOP_ORDER` entre seats vivas; cada perfil decide lead/face | `engine.js` + perfiles |
| A6 | Equity N-way (MC vs lista de rangos o cartas conocidas en sim) | `monteCarlo.js` |
| A7 | Showdown multi-mano + side pots básicos (si stacks desiguales) | `engine.js` / cards |
| A8 | UI: badges “3-way / 4-way”, revelar todas las manos vivas al final | `app.js`, CSS |
| A9 | Telemetría: `% manos multiway` por nivel de rivales / formato para validar realismo | tests + opcional stats sesión |

### 5.3 Realismo de frecuencias (sin hardcodear %)

La tasa debe salir de:

- **Cartas:** `handRange: random` maximiza naturalidad.
- **Perfiles:** fish/lag/maniac → más cold-calls; nit/pro/tag → menos.
- **Posición:** cold-call IP más frecuente que desde UTG vs EP open.
- **Stack / formato:** spins 3-max → multiway natural más raro; cash 6/9 → más; MTT bubble → menos calls light.

Validación: script de montecarlo interno (p.ej. 5k manos Random fish vs pro) midiendo `inHand.length ≥ 3` al flop; ajustar solo biases de call si las tasas son absurdas (no meter un `% multiway` artificial en el pool).

### 5.4 Riesgos A

- Estrategia postflop débil → mitigar con `multiway` + heurísticas + confianza baja.
- Complejidad de betting rounds (raises multiway) → MVP: un bet/raise por calle, rivales no-héroes con policy simple.
- Rendimiento MC N-way → menos samples o equity vs rango agregado aproximado en v1.

---

## 6. Camino B — Opción “Multiway” dedicada

### 6.1 Idea

Nuevo chip de escenario `multiway` (cash/MTT; en spin 3-max opcional como “3-way pot”).

Al seleccionarla:

1. El pool solo genera escenarios `srp3way` / `limpPot` (MVP).
2. Se fijan roles: opener, cold-caller(s), BB, héroe en una de esas seats.
3. Se muestrean cartas **desde rangos del rol**, modulados por **perfil del seat**.
4. Se salta el colapso HU; se entra al flop (o se juega la decisión preflop multiway si `practiceStreet: preflop`).

### 6.2 Rangos por rol × perfil (aptitud de cartas)

| Rol | Base de rango | Ajuste por perfil |
|-----|---------------|-------------------|
| Opener | Open-raise de su posición | Nit: top del open; Fish/Lag: más ancho (ya abierto) |
| Cold-caller | Defend/call vs open (no 3bet set) | Fish/Maniac: más junk suited/connectors; Pro/TAG: broadway + suited; Nit: casi no aparece como caller (resample seat/perfil o skip) |
| BB caller | BB call vs open (+ callers) | Fish: overcall width; Pro: defend más tight multiway |
| Limpers (`limpPot`) | `LIMP_RANGE` / limp weights | Fish: limps basura; TAG: casi no limp (evitar o rare) |
| Squeeze caller-along | Call vs squeeze subset | Solo manos fuertes / blockers según perfil |

Implementación sugerida:

- Extender `getScenarioDeals` / nuevos `sampleMultiwayRoleWeights(role, scenario, config, profileId)`.
- Filtro post-sample: `ensureSeatHandInRoleRange` (como `ensureOpenerOpenHand` / `ensureThreeBetHand`).
- Si el perfil es incompatible con el rol (nit cold-calling wide), **reasignar perfil** del seat o **resample** hasta coherencia (máx N intentos), no dejar manos absurdas.

### 6.3 Cambios concretos

| # | Cambio | Dónde |
|---|--------|-------|
| B1 | Chip UI `multiway` + label en `labelFor` | `index.html`, `app.js`, `play-config.js` |
| B2 | `mapScenarioType('multiway')` → pool `srp3way` / `limpPot` (pesos) | `play-config.js` |
| B3 | `setupSrpMultiway` / `setupLimpMultiway`: pot, investments, `inHand` N-way, **sin** `syncTableToActivePot` HU | `engine.js` |
| B4 | Samplers de deals por rol × perfil | `play-config.js` + opcional `multiwayRanges.js` |
| B5 | Sub-filtro opcional UI: “SRP 3-way / Limp pot / Cualquiera” | setup chips secundarios |
| B6 | `buildSpotInput`: `multiway: true`, lista de `vsPositions` / ranges | solver + scoring |
| B7 | Heurística postflop multiway modulada por cada perfil | `engine.js` / perfiles |
| B8 | Tests: `inHand.length ≥ 3` al flop; cartas en rango de rol; replay | `tools/`, `e2e/` |

### 6.4 UX propuesta (setup)

```
Escenario: … | Multiway
  └ (si Multiway activo) Tipo de bote: Random multiway | SRP 3-way | Limp pot
```

Compatible con: posición héroe, nivel rivales, calle de práctica, handRange (en modo dedicado, `playable`/`borderline` filtran al héroe; villanos siguen rol×perfil).

---

## 7. Modelo de datos propuesto

```js
// Extensión de hand (evolutiva; no romper HU de golpe)
hand.potType = 'hu' | 'srp3way' | 'srp4way' | 'limpPot' | …;
hand.multiway = true;
hand.opponents = [
  {
    pos, cards, rangeStr, profileId, profileLabel,
    invested, inHand: true
  }
];
// Compat: hand.villain = opponents[focusIndex] o “to act”
hand.table.inHand = { BTN: true, BB: true, CO: true, … };
```

Migración:

1. Helpers leen `opponents` si existe; si no, degradan a `villain` (HU legacy).
2. Tracker: un mapa `trackersByPos` o un tracker agregado; MVP puede trackear solo el “focus” y usar cartas fijas del resto para equity.
3. History / errores: guardar `opponents[].cards` y `potType`.

---

## 8. Postflop y grading (compartido A+B)

### 8.1 MVP de acción N-way

- Orden postflop estándar entre seats vivas.
- Policy villano: check/bet/call/fold según perfil, con **multiplicadores multiway** nuevos en `villainProfiles` (p.ej. `multiwayBluffMult: 0.55`, `multiwayCbetMult: 0.7`, `multiwayCallMult` más selectivo para pro).
- Un raise máximo “simple” por calle en v1 (evitar árboles enormes).

### 8.2 Equity

- `equityVsN(hero, board, opponents[])` — MC secuencial o vs unión de rangos.
- Showdown: comparar todas las manos vivas; side pots si all-in parcial.

### 8.3 Scoring

- Siempre `multiway: true` → confianza ↓ (ya parcialmente soportado).
- Heurísticas coach: menos bluff, value más fuerte, c-bet sizing down, overfold a raises.
- No fingir GTO exacto; copy de UI: “Aproximación multiway”.

---

## 9. Fases de entrega

### Fase 0 — Cimientos (sin UI multiway aún)

- Introducir `hand.multiway` / `opponents` / `syncTableToMultiwayPot`.
- Dejar de foldear `_callersAtFlop` cuando flag activo.
- Tests de regresión HU: el path actual sin flag = idéntico.

**Criterio de salida:** con flag forzado en tests, un open + 2 calls llega al flop con 3 `inHand`.

### Fase 1 — Random realista (Camino A, MVP)

- Activar flag en Random cash (y opcionalmente MTT).
- Postflop N-way mínimo + equity N-way + UI reveal.
- Validar tasas fish vs pro (script).

**Criterio de salida:** en Random fish aparecen botes 3-way de forma orgánica; en pro son claramente más raros; HU no se rompe.

### Fase 2 — Escenario Multiway (Camino B)

- Chip + `srp3way` / `limpPot`.
- Samplers rol × perfil + ensure ranges.
- Subtipos en setup.

**Criterio de salida:** 100 manos seguidas en Multiway → ≥95% con `inHand ≥ 3` al flop; cartas de cold-caller dentro del rango de call del perfil.

### Fase 3 — Profundidad

- `srp4way+`, squeeze multi, 3bet multi.
- Side pots completos.
- Mejor policy postflop / tablas aproximadas.
- Spin 3-max y MTT phase-aware.
- Métricas de sesión `% multiway` / leaks multiway en coach.

---

## 10. Orden de implementación sugerido (archivos)

```
1. js/engine.js
   - syncTableToMultiwayPot, goFlop gate, resolveBlindsAfterHeroOpen
   - opponents model + showdown N-way (básico)
2. js/engine/equity/monteCarlo.js
   - equity vs N
3. js/engine/villainProfiles.js
   - multiplicadores multiway postflop + sesgo cold-call preflop si falta
4. js/play-config.js
   - allowMultiway, scenario multiway, pool, role weights
5. js/app.js + index.html
   - chip, render seats/acciones, reveal, labels
6. js/engine/scoring + LocalSolverProvider
   - input.multiway + copy confianza
7. tools/test-multiway-*.js + e2e
```

---

## 11. Tests mínimos

| Test | Qué asegura |
|------|-------------|
| HU regression | Sin multiway, `_callersAtFlop` sigue colapsando (comportamiento actual) |
| Natural multi-call | Flag on + 2 callers → flop 3-way |
| Random rate smoke | 2k manos fish vs pro: tasa 3-way fish > pro |
| Dedicated srp3way | Escenario multiway → always ≥3 al flop |
| Role cards | Cold-caller code ∈ call weights del perfil |
| Replay | Mismo seed + snapshot reproduce seats y cartas |
| Scoring | `multiway` baja confianza / no crashea solver |

---

## 12. Fuera de alcance (v1)

- Solver GTO multiway real (trees).
- ICM multiway fino en MTT (usar heurística + flag).
- HUD de población multiway.
- Overhaul completo de historial/UI de errores (solo campos necesarios).

---

## 13. Decisión de producto recomendada

1. **Primero** cimientos + Random realista (A): el usuario ve multiway “como en la mesa” sin nuevo concepto.
2. **En paralelo corto** chip Multiway (B) con SRP 3-way + limp: quien quiera drill no depende del azar.
3. Mantener scoring honesto: multiway = aproximación, no fingir GTO.

Relacionado: `EPIC_10_PARIDAD_SNOWIE.md` (Snowie gana en multivía profundo; este roadmap cierra el gap de entrenamiento práctico sin copiar su motor neuronal).
