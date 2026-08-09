# Backlog — Métricas de póker ideales vs. PokerForgeAI

> Análisis de estadísticas HUD de referencia en la industria (cash NLHE 6-max), contraste con lo que calcula/muestra la app hoy, y backlog priorizado de cambios.
>
> **Contexto producto:** PokerForgeAI es entrenador GTO + revisor de sesiones (no un tracker/HUD de población). El objetivo no es clonar PokerTracker, sino **exponer al héroe las métricas de estilo que diagnostican fugas** y alinear coaching/UI con rangos idealizados de 6-max ~100bb.
>
> **Fuentes de referencia (industria):** RiverOdds HUD guide, Upswing/Seeker Start optimal values, PokerCoaching, BlackRain79, PokerStars ES (HUD), Pokerati 2026.
>
> **Relacionado:** `EPIC_10_PARIDAD_SNOWIE.md` (SN-30–35), `ESTUDIO_MERCADO.md` (P-02/P-03, sin HUD población), `BACKLOG_IMPORTADOR_SESIONES.md` (detección cash/spins/MTT + table max + split de stats).

---

## 1. Resumen ejecutivo

| Dimensión | Industria (6-max cash) | PokerForgeAI hoy | Gap |
|-----------|------------------------|------------------|-----|
| Preflop estilo (VPIP/PFR/gap) | Núcleo de todo HUD | ✅ Calculado + ideal 20–28 / 15–24 / gap 3–8 | Menor: por posición (Fase C) |
| Agresión preflop (3-bet, fold to 3-bet, steal, squeeze) | Tier 1 tras VPIP/PFR | ✅ Incluye squeeze | — |
| Postflop (C-bet, fold to C-bet, AF/AFq) | Tier 1–2 | ✅ Flop/turn/river C-bet + fold to flop c-bet + AF/AFq | — |
| Showdown (WTSD, W$SD, WWSF) | Tier 2–3 | ✅ WTSD / W$SD / WWSF | — |
| Resultados (bb/100, winrate, sample) | Básico en trackers | ✅ bb/100 + nota de varianza + sample trust | — |
| KPIs de estudio GTO (acierto, ΔEV, leaks) | Nicho trainers (Snowie, GTOW) | ✅ Fuerte | Ampliar UI (SN-30–33) |
| HUD de rivales / población | Core de trackers | ❌ Fuera de posicionamiento (OK) | No priorizar |

**Veredicto:** Tenemos un **núcleo GTO de estudio sólido** y solo el **primer escalón HUD del héroe** (VPIP/PFR). El backlog de mayor valor es completar el **perfil de estilo del héroe** sobre manos importadas (3-bet → C-bet → AF → showdown) con rangos ideales y avisos de muestra insuficiente, reutilizando el pipeline de `import.js` / `computeStats`.

---

## 2. Estadísticas ideales de referencia (cash 6-max ~100bb)

Rangos orientativos para un regular sólido. No son “GTO único”: varían por stakes, rake y mesa; sirven como **bandas de coaching** (como ya hacemos con `HUD_IDEAL`).

### 2.1 Tier 0 — Fundación (fiables ~100–200 manos)

| Métrica | Ideal 6-max | Señal si se desvía |
|---------|-------------|-------------------|
| **VPIP** | **20–28%** (regs fuertes a menudo 22–28) | &lt;18 nit; &gt;35 fish/loose |
| **PFR** | **15–22%** (a veces hasta ~24) | PFR muy bajo = pasivo |
| **Gap VPIP−PFR** | **3–8 pts** (óptimo frecuente 3–6; PFR ≈ 75–90% de VPIP) | Gap &gt;10 = calling station |

**App hoy:** `STYLE_IDEAL` en `js/import.js` = VPIP 20–28, PFR 15–24, gap 3–8 (+ 3-bet, steal, c-bet, AF…) → **alineado** con la industria.

### 2.2 Tier 1 — Agresión preflop (fiables ~400–500+ oportunidades)

| Métrica | Ideal 6-max | Notas |
|---------|-------------|-------|
| **3-Bet %** | **6–10%** (estándar ~8–10; &lt;5 value-only; &gt;12 light) | PokerStars ES usa bandas 4–7 / &gt;9 |
| **Fold to 3-Bet** | **~45–60%** (IP ~40–45, OOP ~45–50 en fuentes Upswing) | &gt;65 overfold; &lt;40 station |
| **ATS / Steal** | **~30–40%** desde CO/BTN/SB | Posicional |
| **Fold to Steal** | **~55–65%** (BB) | &gt;70 = target de steals |
| **Squeeze %** | **~7–9%** | Evento raro; sample grande |
| **4-Bet %** | Orientativo **2–4%** overall | Necesita 1k+ manos |

### 2.3 Tier 1–2 — Postflop (fiables ~200–300+ spots)

| Métrica | Ideal | Notas |
|---------|-------|-------|
| **Flop C-Bet** | **~50–70%** overall; IP más alto, OOP más selectivo (~25–40 en algunas guías IP/OOP split) | &gt;75 = c-bet demasiado automático |
| **Fold to Flop C-Bet** | **~45–55%** (ideal &lt;50–55) | &gt;60 overfold; &lt;40 station |
| **Turn / River C-Bet** | Más bajas y selectivas | Sample 1k+ |
| **AF** (bets+raises)/calls | **~2–3** (aceptable 2–4) | &lt;2 pasivo; &gt;4 maniac |
| **AFq** % agresivas | **~35–45%** equilibrado; &gt;50 agresivo | Más limpia que AF en algunos trackers |

### 2.4 Tier 2–3 — Showdown y resultados

| Métrica | Ideal | Notas |
|---------|-------|-------|
| **WTSD** | **27–32%** | &gt;35 station; &lt;22 overfold |
| **W$SD** | **49–54%** | Con sample grande |
| **WWSF** | **45–53%** | Won when saw flop |
| **bb/100** | Depende stakes; UI debe mostrar ± intervalo | Requiere muchas manos |
| **Sample trust** | Aviso si N &lt; umbral por métrica | Crítico para no coaching falso |

### 2.5 KPIs de estudio GTO (nuestro diferenciador)

No son HUD clásico; sí son el core del producto y deben seguir siendo el dashboard principal:

| Métrica | Rol |
|---------|-----|
| Acierto (óptima+aceptable) | Calidad de decisión |
| EV perdido (bb) / por mano | Coste de fugas |
| Error rate % | Paridad Snowie (SN-30) |
| Distribución clase decisión | Diagnóstico |
| Leaks por calle / spot | Estudio dirigido |
| Nota de sesión / luck vs skill | Motivación + honestidad |

---

## 3. Contraste detallado: industria vs. app

### 3.1 Lo que ya tenemos (bien)

| Capacidad | Dónde | Evaluación |
|-----------|-------|------------|
| VPIP / PFR / gap + coaching copy | `import.js` `heroPreflopHud`, `assessVpipPfr`, UI sesión/stats | ✅ Rangos ideales correctos para 6-max |
| Acierto, ΔEV, clases, grade | `computeStats`, classifier, scoring | ✅ Diferenciador trainer |
| Leaks top spots / calle (parcial) | `leaks.js`, `stats-aggregate.js` | ✅ Base; falta UI rica (SN-30–32) |
| Progreso semanal | `progress.js` | ✅ |
| Perfiles villano TAG/LAG/… | `villainProfiles.js` | ✅ Solo entrenador (no derivados de HH rivales) |
| Payload IA con vpip/pfr/leaks | `ai-hand-payload.js` | ✅ Extensible a nuevas métricas |

### 3.2 Lo que falta frente al estándar HUD del héroe

| Métrica | En app | Impacto coaching |
|---------|--------|------------------|
| 3-Bet % | No | Detectar nit vs light 3-bettor |
| Fold to 3-Bet | No | Overfold / call station preflop |
| Steal / Fold to Steal | No | Juego late + defensa blinds |
| Squeeze % | No | Spots multiway preflop (ya etiquetamos squeeze en leaks trainer) |
| C-Bet flop/turn/river | No | Predictabilidad postflop |
| Fold to C-Bet | No | Defensa / faroles rentables |
| AF / AFq | No | Balance pasivo-agresivo (SN-33 relacionado) |
| WTSD / W$SD / WWSF | No | Stations vs nits postflop |
| bb/100 + CI | No (solo netBB sesión) | Resultado a largo plazo |
| Stats **por posición** | No | VPIP/PFR/3bet por UTG…BB |
| Umbral de muestra por métrica | No | Evitar coaching con 40 manos |
| Ideales por formato (FR / MTT) | Solo 6-max cash hardcode | SN-35 + play-config |

### 3.3 Deuda de UX stats (ya en épicas)

| Ítem | Estado |
|------|--------|
| Error rate como número grande | SN-30 pendiente |
| Leaks por calle / spot clicables | SN-31/32; lógica parcial |
| Balance pasivo/agresivo | SN-33 |
| Export informe sesión | SN-34 |
| Cash vs MTT split | SN-35 |
| Manos/hora entrenador | SN-16 |
| Confidence badge vacío | Stub en UI |
| `#progress-dashboard` / `#leaks-panel` no cableados | Código existe, carousel es UI viva |

---

## 4. Backlog priorizado (nuevos ítems STAT-*)

Leyenda esfuerzo: **S** pequeño · **M** medio · **L** grande.  
Prioridad: **P0** valor inmediato en sesiones importadas · **P1** perfil completo · **P2** profundidad / formato.

Cruzar con EPIC 10: no duplicar SN-*; aquí el foco es **métricas de estilo HUD del héroe**.

---

### Fase A — Preflop style completo (P0) ✅ implementada

| ID | Cambio | Esf. | Criterio de aceptación |
|----|--------|------|------------------------|
| **STAT-01** | Calcular **3-Bet %** del héroe en import (oportunidades vs raises) | M | Campo en `computeStats`; UI sesión + carousel; ideal **6–10%** con assess copy ES |
| **STAT-02** | Calcular **Fold to 3-Bet %** | M | Denominador = veces facing 3-bet; ideal **45–60%**; warning sample &lt;50 opps |
| **STAT-03** | **Steal %** (CO/BTN/SB opens) + **Fold to Steal** (BB/SB) | M | Ideal steal ~30–40%; fold-to-steal ~55–65%; desglose por posición late |
| **STAT-04** | Extender `HUD_IDEAL` → objeto `STYLE_IDEAL` centralizado (VPIP, PFR, gap, 3bet, f3b, steal…) | S | Un solo módulo importable por UI, IA y tests |
| **STAT-05** | **Sample trust badges**: gris/ámbar/verde según N manos u oportunidades por métrica | S | Tabla umbrales documentada (VPIP 100, 3bet 400, …); no coaching rojo en sample bajo |

**DoD Fase A:** Tras importar una sesión Cash 6-max, el usuario ve VPIP/PFR/3bet/fold-to-3bet (y steal si hay late) con comentario de estilo, no solo dos números.

**Estado:** implementado en `heroStyleHud` / `computeStats` / UI sesión + carousel / agregados v6 / payload IA (`tools/test-vpip-pfr.js`).

---

### Fase B — Postflop y agresión (P0/P1) ✅ implementada

| ID | Cambio | Esf. | Criterio de aceptación |
|----|--------|------|------------------------|
| **STAT-06** | **Flop C-Bet %** (héroe fue PFR aggressor) | M | Ideal 50–70%; split IP/OOP si el timeline lo permite |
| **STAT-07** | **Fold to Flop C-Bet %** | M | Ideal ~45–55%; feed a leaks “overfold flop” |
| **STAT-08** | **AF** y/o **AFq** postflop | M | AF ideal 2–3; AFq ~40%; enlazar con SN-33 (gráfica balance) |
| **STAT-09** | Turn C-Bet / River C-Bet (opcional tras STAT-06) | L | Mostrar solo con sample ≥ umbral; sin alarmismo |

**DoD Fase B:** Perfil “preflop + flop” suficiente para decir “pasivo postflop / c-bet automático / overfolder”.

**Estado:** STAT-06/07/08/09 hechos (incluye C-Bet turn/river).

---

### Fase C — Showdown, resultados y posición (P1) ✅ implementada

| ID | Cambio | Esf. | Criterio de aceptación |
|----|--------|------|------------------------|
| **STAT-10** | **WTSD**, **W$SD**, **WWSF** | M | Ideales 27–32 / 49–54 / 45–53; solo con manos que vieron flop / SD |
| **STAT-11** | **bb/100** + manos totales agregadas (multi-sesión) | M | En stats agregadas; tooltip “varianza alta &lt;20k manos” |
| **STAT-12** | **VPIP/PFR/3bet por posición** (UTG…BB) | L | Tabla o heatmap; detecta “demasiado UTG” vs “BTN robando poco” |
| **STAT-13** | **Squeeze %** del héroe | S | Ideal ~7–9%; sample alto obligatorio |

**Estado:** implementado en `computeStats` / agregados v7 / UI perfil + tabla por posición.

---

### Fase D — Coaching, IA y producto (P1/P2) ✅ implementada

| ID | Cambio | Esf. | Criterio de aceptación |
|----|--------|------|------------------------|
| **STAT-14** | Mapa **estilo → leak drills**: p.ej. gap alto → drill “raise or fold”; fold-to-cbet alto → drill defensa flop | M | CTA desde assess hacia entrenador filtrado (SN-15) |
| **STAT-15** | Extender payload IA (`ai-hand-payload` / `stats_report`) con nuevas métricas + ideales | M | Coach menciona 3bet/Cbet/AF con bandas; tests `test-ai-payload` |
| **STAT-16** | Ideales **por formato**: 6-max vs 9-max vs MTT early | M | Usar `play-config` / tipo sesión; SN-35 alineado |
| **STAT-17** | Tarjeta UI **“Perfil de estilo”** (hero radar o barras vs ideal) | M | Una composición clara en Estadísticas / detalle sesión; no dashboard de chips sueltos |
| **STAT-18** | Tests unitarios parsers → cada nueva métrica (`tools/test-vpip-pfr.js` → `test-hero-hud-stats.js`) | M | Fixtures PS/Winamax; CI verde |

**Estado:** drills CTA, barras vs ideal, ideales por formato, payload IA ampliado, tests en `test-vpip-pfr.js`.

---

### Fase E — Explicitamente fuera de alcance (no backlog activo)

| Ítem | Motivo |
|------|--------|
| HUD en vivo multi-mesa vs rivales | Posicionamiento: no somos tracker; ver `ESTUDIO_MERCADO` |
| Stats de población / database compartida | Legal + infra + no core GTO study |
| Equivalencia total PokerTracker columns | Overkill; priorizar las 10–12 métricas de coaching |

---

## 5. Orden de implementación recomendado

```
STAT-04 (STYLE_IDEAL)
  → STAT-01 + STAT-02 + STAT-05
  → STAT-03
  → STAT-06 + STAT-07 + STAT-08
  → STAT-15 + STAT-17
  → STAT-10 + STAT-11 + STAT-12
  → STAT-14 + STAT-16 + STAT-09 + STAT-13 + STAT-18
```

En paralelo (EPIC 10, no bloqueantes entre sí):

```
SN-30 (error rate) · SN-31/32 (leaks UI) · SN-33 (balance ≈ STAT-08)
```

---

## 6. Modelo de datos propuesto (mínimo)

Extender el objeto de `computeStats` (y agregados multi-sesión) con algo del estilo:

```js
style: {
  vpipPct, pfrPct, gap,
  threeBetPct, threeBetOpps,
  foldToThreeBetPct, foldToThreeBetOpps,
  stealPct, stealOpps,
  foldToStealPct, foldToStealOpps,
  cbetFlopPct, cbetFlopOpps,
  foldToCbetFlopPct, foldToCbetFlopOpps,
  af, afq,
  wtsdPct, wsdPct, wwsfPct,
  bbPer100,   // agregado
  byPosition: { UTG: { vpip, pfr, … }, … },
  assess: { /* status/label/comment por métrica */ },
  sample: { /* trust por métrica */ }
}
```

Mantener VPIP/PFR planos por compatibilidad con UI/IA actuales; migrar lecturas a `style.*` de forma gradual.

---

## 7. Ajuste fino a ideales actuales

| Parámetro actual (`HUD_IDEAL`) | Industria | Acción |
|-------------------------------|-----------|--------|
| VPIP 20–28 | 20–28 (regs 22–28) | Mantener; opcional subrango “regs fuertes” 22–28 en copy |
| PFR 15–22 | 15–24 | Valorar **pfrMax: 24** para no marcar LAG sólido como “alto” |
| Gap 3–8 | 3–6 óptimo frecuente; &gt;10 alerta fuerte | Mantener 3–8; endurecer copy si gap &gt;10 |

Ítem explícito:

| ID | Cambio | Esf. | P |
|----|--------|------|---|
| **STAT-00** | Revisar `pfrMax` (22→24) y copy de gap &gt;10; documentar bandas en UI | S | P0 | ✅ |

---

## 8. Métricas de éxito del backlog

| Señal | Objetivo |
|-------|----------|
| % sesiones importadas donde el usuario abre “Perfil de estilo” | Medir post STAT-17 |
| Coherencia coach IA vs números HUD | Spot-check: informe menciona métrica fuera de banda real |
| Reducción de fugas ligadas a estilo (gap, fold-to-cbet) en usuarios recurrentes | Antes/después 30 días con STAT-14 |
| Cero regressions en `test-vpip-pfr` / nuevo suite HUD | CI |

---

## 9. Referencias rápidas

- RiverOdds — Poker HUD Stats Explained  
- Seeker Start — Poker Stats Guide (optimal 6-max)  
- PokerCoaching — How to Use Poker HUD Stats  
- BlackRain79 — Best Poker HUD Stats  
- PokerStars ES — Estadísticas del HUD (VPIP, PFR, 3-Bet, C-Bet…)  
- Interno: `js/import.js` (`HUD_IDEAL`), `docs/EPIC_10_PARIDAD_SNOWIE.md` Pilar D  

---

*Documento generado para priorización de producto. No implica compromiso de fechas; el esfuerzo se expresa solo en tamaño técnico (S/M/L).*
