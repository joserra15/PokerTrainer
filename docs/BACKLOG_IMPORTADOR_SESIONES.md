# Backlog — Importador de sesiones (detección de formato + coaching pro)

> Objetivo: que el importador **detecte el tipo de juego y de mesa**, **persista esa metadata**, y **adapte estadísticas, ideales GTO y coaching** al contexto real de cada sesión. Además, ampliar capacidades útiles para jugadores profesionales / regulares serios.
>
> **Estado actual (resumen):** parsers NLHE cash/spins/MTT (PokerStars ES/EN+Zoom, Winamax, GGPoker, **888poker**, **CoinPoker**) con metadata first-class (`gameKind`, `tableMax`, `formatKey`). **P0–P2** (salvo What-if IMP-34) + **P3** (888, CoinPoker, PLO/SD parse-only, auto-import carpeta, ICM lite, vs GTO genérico). UI sesiones con pestañas Cash / Spins / Torneos. Pendiente ampliar salas (Party/WPN/iPoker) según demanda.
>
> **Relacionado:** `BACKLOG_METRICAS_POKER.md` (STAT-16 ideales por formato), `EPIC_10_PARIDAD_SNOWIE.md` (SN-20/21/35), `ESTUDIO_PRODUCTO_Y_MERCADO_AGOSTO_2026.md`.

---

## 1. Resumen ejecutivo

| Capacidad pedida | Hoy | Gap |
|------------------|-----|-----|
| Detectar **cash / spins / torneo** | Solo cash vs tournament (boolean); spins no existen; MTT se tira | Modelo `gameKind` + parsers + no descartar a ciegas |
| Detectar **tipo de mesa** (Max-6, Max-9, …) | Heurística por posiciones; texto `6-max` ignorado | Parsear `N-max` / seats max y persistir `tableMax` |
| Adaptar **stats al tipo de juego/mesa** | Ideales 6max/9max/mtt parciales; agregados sin split | Ideales + KPIs + agregados + UI + IA por contexto |
| Mejoras pro | HUD héroe + GTO review sólido en cash | Filtros stakes, stack depth, 4-bet, short-handed, ROI spins/MTT, etc. |

**Principio de producto:** seguir siendo un **revisor GTO / coach de estilo del héroe**, no un tracker de población. Cada ítem del backlog debe servir para **diagnosticar fugas con bandas honestas** según el juego que se está jugando.

---

## 2. Modelo de datos propuesto (contrato)

Extender mano parseada + mano analizada + sesión:

```js
// Por mano (parser → analyzeHand → persist)
meta: {
  gameKind: 'cash' | 'spin' | 'mtt' | 'sng' | 'unknown',
  tableMax: 2 | 3 | 6 | 8 | 9 | null,   // tamaño de mesa declarado
  playersSeated: number,                 // seats en esa mano
  shortHanded: boolean,                  // playersSeated < tableMax útil
  variant: 'nlhe' | 'plo' | 'shortdeck' | 'unknown',
  stakes: { sb, bb, currency, ante?, level?, buyIn?, prizePool? },
  stackDepthBB: number | null,           // stack medio o héroe al inicio
  platform: 'pokerstars' | 'winamax' | 'ggpoker' | …,
  locale: 'es' | 'en' | null,
  isZoom: boolean
}

// Por sesión (rollup)
session.context: {
  gameKind,              // moda / dominante
  tableMax,              // moda
  mix: { cash: n, spin: n, mtt: n, … },
  stakesLabel: 'NL25' | '€0.10/€0.25' | 'Spin €5' | …,
  formatKey: 'cash6' | 'cash9' | 'cash3' | 'spin3' | 'mtt9' | …,
  nDiscardedByReason: { notCash: n, badParse: n, unsupportedVariant: n }
}
```

**Unificar enums** con el trainer (`cash6` / `cash9` / `mtt` en `play-config.js` / `registry.js`) vía un solo mapper:

| `formatKey` | Stats ideals | Rangos GTO |
|-------------|--------------|------------|
| `cash6` | `STYLE_IDEAL_BY_FORMAT['6max']` | `gameType: 'cash6'` |
| `cash9` | `9max` | `cash9` |
| `cash3` / heads-up | bandas propias (más loose) | fallback cash6 + aviso |
| `spin3` | bandas spin (muy loose, stack-dependent) | mtt/spin ranges si existen |
| `mtt*` | `mtt` (+ fase stack) | `mtt` |

---

## 3. Detección: reglas por sala (referencia implementación)

### 3.1 Cash vs Spin vs Torneo

| Señal en HH | Clasificación |
|-------------|----------------|
| Stakes fijos `(€0.05/€0.10)` / `real money` sin Tournament | **cash** |
| `Tournament #` / `Torneo` / hand id `TM…` + levels `(10/20)` | **mtt** (o **sng** si buy-in único y mesa única) |
| `Spin & Go` / `Spin&Go` / `Jackpot Sit & Go` / `Nitro` / mesa 3-max + prize multiplier | **spin** |
| Winamax `Go Fast` / tournament + 3 seats típicos | **spin** o **sng** según copy |
| Duda | `unknown` + UI “revisar” — **no silenciar** |

### 3.2 Table max

| Fuente | Ejemplo |
|--------|---------|
| Línea Table | `Table 'X' 6-max Seat #3 is the button` |
| GGPoker | `… 6-max …` / `9-max` |
| Contar seats max del file si no hay label | moda del máximo `seats.length` observado |
| Spins | casi siempre **3-max** |

Guardar **ambos**: `tableMax` (capacidad) y `playersSeated` (efectivos). Un 6-max a 4 jugadores **no** es lo mismo que un 6-max full para coaching de RFI.

### 3.3 Posiciones (deuda actual)

`assignPositions` (`hhUtils.js`) no emite `LJ` y cae a `EP0` en 9-max → rompe inferencia y stats por posición.

**Fix P0:** tabla de labels correcta por `tableMax` / `n` seats (HU, 3-max, 6-max, 8/9-max).

---

## 4. Adaptación de estadísticas

### 4.1 Qué debe cambiar por contexto

| Capa | Cash 6-max | Cash 9-max | Short-handed / HU | Spins 3-max | MTT |
|------|------------|------------|-------------------|-------------|-----|
| Bandas VPIP/PFR/3bet/steal | Actuales | Más tight (ya parcialmente) | Más loose | Muy loose + por stack (10/15/20/25bb) | Por stack + fase (early/bubble/ITM) |
| Fórmulas HUD | Igual | Igual | Steal densidades distintas | Incluir shove spots / vs shove | Antes/antes postflop selectivo |
| Rangos GTO al analizar | cash6 | cash9 | cash6 + disclaimer o pack SH | spin/mtt corto | mtt |
| Agregados multi-sesión | Bucket `cash6` | Bucket `cash9` | Bucket propio | Bucket `spin` | Bucket `mtt` |
| Copy coaching / IA | “regs 6-max” | “full ring” | “short-handed” | “spins ICM/push-fold” | “ICM / stack preservation” |
| KPIs extra | bb/100, rake | bb/100 | bb/100 | **ROI %**, ITM%, avg finish | **ROI/ITM**, $/torneo, bust level |

### 4.2 Regla de oro de agregados

**Nunca mezclar** VPIP de cash 6-max con spins o MTT en la misma tarjeta de “perfil de estilo” sin filtro. UI: selector `Todo | Cash 6-max | Cash 9-max | Spins | MTT`.

---

## 5. Backlog priorizado (IMP-*)

Leyenda esfuerzo: **S** · **M** · **L** · **XL**.  
Prioridad: **P0** (cimiento / pedida explícitamente) · **P1** (alto valor pro) · **P2** (profundidad) · **P3** (nice-to-have / salas nuevas).

---

### P0 — Cimiento de detección y metadata ✅ implementado

| ID | Tarea | Esf. | Estado |
|----|-------|------|--------|
| **IMP-01** | `gameKind` + `tableMax` + `playersSeated` en parsers | M | ✅ |
| **IMP-02** | Parsear `N-max` de líneas Table | S | ✅ |
| **IMP-03** | Conservar cash/spins/MTT etiquetados | M | ✅ |
| **IMP-04** | Persistir metadata en `analyzeHand` / `session.context` | M | ✅ |
| **IMP-05** | Unificar `formatKey` con ideals + registry | S | ✅ |
| **IMP-06** | Fix posiciones 9-max (LJ) / 3-max / HU | M | ✅ |
| **IMP-07** | UI badges Cash/Spin/MTT + Max-N + stakes | S | ✅ |
| **IMP-08** | Ideales por `formatKey` real | M | ✅ |
| **IMP-09** | Split agregados por formato (filtro Stats) | L | ✅ |
| **IMP-10** | Copy de import con mix / descartes | S | ✅ |

**DoD P0:** cumplido (`tools/testimport.js` + fixtures spin/9max).

---

### P1 — Spins + MTT usables + coaching pro core ✅ implementado

| ID | Tarea | Esf. | Estado |
|----|-------|------|--------|
| **IMP-11** | Detector Spin & Go + `tableMax=3` | M | ✅ |
| **IMP-12** | Stack-aware (`stackDepthBB` / bins en filtros + registry) | L | ✅ (bins en UI; rangos vía `inferFromHand`) |
| **IMP-13** | Ideales HUD spins | M | ✅ |
| **IMP-14** | Fase MTT (`early/mid/short/push`) + badge | L | ✅ heurística por stack |
| **IMP-15** | ROI% / profit € / avg buy-in | M | ✅ (ROI aprox. con buy-in del HH) |
| **IMP-16** | Parse buy-in / multiplier | M | ✅ |
| **IMP-17** | 4-Bet % + fold to 4-bet | M | ✅ |
| **IMP-18** | Stake tier micro/low/mid/high | S | ✅ |
| **IMP-19** | Short-handed efectivo + ajuste ideals | M | ✅ |
| **IMP-20** | Filtros sesión: calle / gameKind / stack bin | M | ✅ |
| **IMP-21** | Payload IA consciente de formato | M | ✅ `coachingNote` |
| **IMP-22** | Export JSON/CSV ampliado | S | ✅ |

**DoD P1:** cumplido. ITM% fino queda como mejora P2 (requiere resultados de torneo fuera del HH de manos).

---

### P2 — Profundidad profesional (estudio diario serio)

| ID | Tarea | Esf. | Estado | Criterio de aceptación |
|----|-------|------|--------|------------------------|
| **IMP-23** | **Limp %** / overlimp / iso-limp stats | S | ✅ | Detecta calling stations preflop |
| **IMP-24** | **Probe / delayed c-bet** ya parcialmente; exponer en UI con ideales | S | ✅ | Métricas turn no enterradas |
| **IMP-25** | Winrate **por stakes** y por **día/semana** (sesión real, no solo trainer) | M | ✅ | Gráfica filtrable cash6 NL25 vs NL50 |
| **IMP-26** | **Hand2Note-like tags** ligeros: “3bet pot OOP”, “SRP IP”, “vs miss cbet” auto | L | ✅ | Filtros de estudio sin DB de población |
| **IMP-27** | Ante / straddle aware (pot y stacks correctos en GG/PS/Winamax) | M | ✅ | Pot math no se rompe en mesas con ante |
| **IMP-28** | Recompute versionado: `analysisVersion` + banner “reanalizar con motor nuevo” | M | ✅ | Pros pueden re-scorear archivo antiguo |
| **IMP-29** | Import **multi-hero / shared HH**: confirmación de nick héroe | S | ✅ | No atribuir mal el héroe en archivos de equipo |
| **IMP-30** | Session **merge** inteligente (mismo file reimportado / manos solapadas) | M | ✅ | Dedup por `hand.id`+platform |
| **IMP-31** | Leak map **separado por formato** + CTA drill con `gameType` correcto | M | ✅ | Click “steal bajo” abre trainer cash9/mtt acorde |
| **IMP-32** | Confidence intervals bb/100 y EV loss rate (honestidad estadística) | M | ✅ | Tooltip sample / ± |
| **IMP-33** | Hotkeys / cola de revisión “solo errores graves” para volumen alto | S | ✅ | 500 manos/sesión revisables en minutos |
| **IMP-34** | What-if acotado en mano importada (cambiar acción hero y re-eval) | L | ⏭ omitido | Pedido mercado (SN-40); fuera de este corte (producto ocultó What-if en #142) |

**DoD P2 (sin What-if):** cumplido.

---

### P3 — Cobertura y moat (después del core)

| ID | Tarea | Esf. | Estado | Criterio de aceptación |
|----|-------|------|--------|------------------------|
| **IMP-35** | Más salas: **888poker**, **CoinPoker** (+ iPoker/Party/WPN bajo demanda) | XL | ✅ 888 + CoinPoker | Detector + parser + fixtures; otras salas a demanda |
| **IMP-36** | PLO / PLO5 import (parse only + “no GTO aún”) | L | ✅ | No romper NLHE; badge unsupported analysis |
| **IMP-37** | Short Deck | L | ✅ | Idem |
| **IMP-38** | Auto-import watcher / carpeta HH (File System Access API) | XL | ✅ MVP | Vigilancia carpeta Chrome/Edge + import manual |
| **IMP-39** | ICM lite spins 3-max + nota bubble MTT | XL | ✅ lite | Presión ICM aprox.; no motor ICM completo |
| **IMP-40** | Comparativa vs rangos GTO **genéricos** (OPEN_RAISE trainer) | L | ✅ | Nota en RFI: dentro/fuera del rango GTO genérico |

**DoD P3 (MVP):** cumplido. Party/WPN/iPoker e ICM completo quedan como follow-ups.

---

## 6. Mejoras “pro” adicionales (análisis, no pedidas pero recomendadas)

Ordenadas por ROI percibido para un regular serio ES (NL25–NL200 / spins mid):

1. **No mentir con el formato** (P0) — coaching con bandas cash en un spin destruye confianza.
2. **Filtros de estudio quirúrgicos** (P1) — el pro no lee 800 manos; quiere los 40 peores ΔEV.
3. **Stack depth en cada decisión** (P1) — en spins/MTT es el eje; en cash separa 40bb vs 150bb.
4. **4-bet / limp / short-handed** (P1–P2) — cierran el perfil de estilo “tipo tracker” sin ser tracker.
5. **Agregados por stakes + formato** (P1–P2) — el winrate “global” miente.
6. **Reanálisis versionado + export rico** (P2) — flujo tipo diario de estudio / coach humano.
7. **What-if** (P2) — diferencial claro vs “solo nota de sesión”.
8. **Auto-import** (P3) — comodidad; no bloquea valor analítico.

**Fuera de alcance consciente** (mantener alineación de producto):

- HUD live multi-mesa de rivales / DB compartida de población  
- Paridad columna a columna con PokerTracker / Hand2Note  
- Solver trees completos tipo GTO Wizard  

---

## 7. Orden de implementación recomendado

```
IMP-01 → IMP-02 → IMP-06          # detectar bien
     → IMP-04 → IMP-05 → IMP-08   # persistir + adaptar ideals/rangos
     → IMP-03 → IMP-07 → IMP-10   # no descartar + UI honesta
     → IMP-09                     # agregados por formato
     → IMP-11 → IMP-16 → IMP-13 → IMP-12 → IMP-15   # spins/MTT
     → IMP-17 → IMP-18 → IMP-19 → IMP-20 → IMP-21 → IMP-22
     → P2 según feedback usuarios de pago
```

**Primera entrega vendible (MVP formato):** IMP-01…10 sin aún ROI de spins.  
**Segunda entrega (spins/MTT):** IMP-11…16 + 21.  
**Tercera (perfil pro cash):** IMP-17…22 + 23/25.

---

## 8. Plan de tests / fixtures

| Fixture | Debe cubrir |
|---------|-------------|
| PS EN `6-max` cash | `gameKind=cash`, `tableMax=6` |
| PS EN `9-max` / full ring | `tableMax=9`, posiciones con LJ |
| PS ES cash | locale + currency € |
| PS Zoom | `isZoom=true` |
| PS/GG Spin & Go | `gameKind=spin`, `tableMax=3` |
| PS/GG Tournament levels | `gameKind=mtt`, no tratado como cash |
| Winamax cash + tournament | parity |
| Mixed file | `session.context.mix` + UI counts |
| Short-handed 6-max (4 seated) | `shortHanded=true` |

Tests ancla: ampliar `tools/testimport.js`, `tools/test-vpip-pfr.js`, e2e `e2e/import.spec.js`.

---

## 9. Métricas de éxito

| Señal | Objetivo |
|-------|----------|
| % imports con `gameKind != unknown` | >95% en salas soportadas |
| % usuarios que filtran stats por formato (tras IMP-09) | Medir analytics |
| Tickets “me importó un torneo y no salió nada” | → 0 tras IMP-03/10 |
| Coherencia IA vs formato (spot-check) | 0 informes cash en sesiones spin |
| Retención D7 en users con ≥1 import spin/MTT | Sube vs baseline cash-only |

---

## 10. Mapping a épicas / docs existentes

| Este backlog | Doc previo |
|--------------|------------|
| IMP-05 / IMP-08 / IMP-09 | STAT-16 + SN-35 (cash vs MTT split) |
| IMP-03 / GG ya parcialmente | SN-20 import GG (hecho en código; validar spins/MTT) |
| IMP-21 | `ESTUDIO_PROMPTS_IA.md` |
| IMP-34 | SN-40 What-if |
| Decisión “¿profundizar MTT?” | `ESTUDIO_PRODUCTO…` ítem 18 |

---

*Documento de priorización de producto/ingeniería. Esfuerzos S/M/L/XL son relativos al stack actual (parsers JS + `import.js` + agregados). No implica fechas.*
