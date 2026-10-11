# Auditoría: coherencia de fase MTT (entrenador / torneos / escuela)

Fecha: 2026-10-11  
Harness: [`tools/audit-mtt-phase-coherence.js`](../tools/audit-mtt-phase-coherence.js)  
Consenso: [`data/ranges/mtt-phase-consensus.json`](../data/ranges/mtt-phase-consensus.json)

```bash
npm run test:mtt-phase-audit
# o
node tools/audit-mtt-phase-coherence.js --assert-hard
```

## Resumen ejecutivo

| Check | Resultado |
|-------|-----------|
| Hard failures (CI) | **0** |
| Soft warnings | 1 agregado (pins escuela mid@bb25) |
| Cross-surface trainer↔torneo | **3/3** anchors OK |
| Fase por stack héroe (no avg) | OK |
| Bubble / HU estructurales | OK (no se pisan) |
| 88 BB jam @15bb | optima ~60% allin (torneo + trainer-path) |

## Umbrales del producto (canónicos)

Fuente: `PTFormatTaxonomy.phaseFromStackBB` ([`js/engine/format/taxonomy.js`](../js/engine/format/taxonomy.js)).

| Hub | push (label) | short | mid | early |
|-----|--------------|-------|-----|-------|
| MTT | ≤12bb | ≤25bb | ≤45bb | >45bb |
| Spin | ≤12bb | — | ≤20bb | >20bb |

**Dual intencional 13–14bb:** label `short` (o spin `mid`) + charts push/fold vía `GTOPushFold.isPushPhase` (≤14bb). Documentado y cubierto por regresión.

## Contraste con referencias web

| Fuente | Criterio | App | Veredicto |
|--------|----------|-----|-----------|
| [Sharkling](https://sharkling.io/preflop-poker-charts/mtt) | 15bb shove-first; ≤10bb pure P/F | 15bb = `short` + stealDefense; ≤12 label push / ≤14 charts | Alineado en defensa vs open; open RFI 15bb aún mezcla raise/shove (P1 soft) |
| [progressGTO](https://progressgto.com/learn/stack-size-zones-mtt) | Jam alto ≤12; raise crece 12–20 | Nash push ≤14; steal 14–25 | Coherente |
| [PokerHero](https://pokerhero.gg/blog/mtt-gto-strategy-antes-icm) | Re-shove 15–25bb | stealDefense 14–20bb MTT/spin | Cubierto en torneo y trainer |

P1 (fuera de esta pasada): expandir label `push` a 15bb o capa open-jam dedicada; capas `itm`/`ft` propias.

## Superficies y fixes aplicados

### 1. Torneos
- Fase de charts = **stack del héroe** (`live-hand.attachTourneyContext`, `gto-eval.resolveTournamentPhase`).
- vsRFI 14–20bb → `preflopMode: stealDefense`.

### 2. Entrenador
- `preflopSizingMode` activa `stealDefense` en MTT/spin a 14–20bb cuando el spot es vs open / 3bet ([`js/engine.js`](../js/engine.js)).
- `attachToInput` propaga `mttPhase = effectivePhase` ([`js/engine/ranges/registry.js`](../js/engine/ranges/registry.js)).

### 3. Escuela
- Spots short reales (~22bb) en T-02 usan `mttPhase: 'short'` + `bb20`.
- Pins `mid` + `bb25` se mantienen como **frontera pedagógica** (taxonomy mid incluye bb25); el audit los reporta como soft agregado.

## Hallazgos abiertos (P1 / P2)

1. **mid@bb25 school pins (~86):** auto resolvería `short`; pin explícito mid para lecciones de steal mid. No hard-fail.
2. **Bubble open→short vs vsRFI bubble layer:** asimetría de alias en registry (conocido).
3. **itm / ft sin capas dedicadas:** remapeo a mid / legacy.
4. **Web shove-first @15bb RFI:** soft rule; no exige jam 100% en open BTN.

## Anclas de regresión

- `tools/test-mtt-short-phase-hero-stack.js` — fase, 88 jam, AA@12, ATo UTG, dual 14bb.
- `tools/test-cover-widen-rfi.js` — cover 55bb → Early por stack héroe.
- CI: `test:mtt-phase-audit` en `tools/run-ci-tests.js`.
