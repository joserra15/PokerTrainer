# Auditoría del menú Rangos (explorador 13×13)

Fecha: 2026-09-15 · Producto: PokerForgeAI  
Alcance: pestaña **Rangos** (`#tab-ranges`), no el Laboratorio Escuela (R-01…R-33).  
Complementa: [`AUDIT_RANGES_VS_CONSENSUS.md`](AUDIT_RANGES_VS_CONSENSUS.md), [`ROADMAP_ESCUELA_RANGOS.md`](ROADMAP_ESCUELA_RANGOS.md).

## 1. Qué es el menú

Explorador de charts preflop/postflop: street → formato (6-max / 9-max / Spin / MTT) → stack → spot (RFI, 3-Bet, Vs 3-Bet, Iso, BB vs SB limp, Squeeze) → matriz 13×13.

Código clave:

| Pieza | Ruta |
|-------|------|
| UI shell | [`index.html`](../index.html) `#tab-ranges` |
| Estado / render | [`js/app.js`](../js/app.js) `renderRangesExplorer` |
| Spots / matriz | [`js/range-matrix.js`](../js/range-matrix.js) |
| Selección stack/formato | [`js/engine/ranges/registry.js`](../js/engine/ranges/registry.js) |
| Charts + `combo_matrix` | [`data/ranges/*.json`](../data/ranges/) + solver embeds |

## 2. Fuentes de contraste (RFI cash 6-max ~100bb)

| Fuente | UTG/LJ | HJ | CO | BTN | SB |
|--------|--------|----|----|-----|-----|
| BeyondGTO (Crafty Penguin) | 17% | 22% | 28% | 42% | 44% |
| GTO Gecko / FreeBetRange (bandas) | 15–18% | 19–22% | 25–30% | 40–48% | 36–47% |
| Preflop Wizard (aprox.) | 15–17% | 19–22% | 25–28% | 40–45% | 39–47% |
| **App (merge JSON + matrix)** | **~15.8%** | **~19.5%** | **~26.1%** | **~43.1%** | **~34.7%** |

Defensa BB (VIP Grinders / Preflop Wizard, rake medio, open 2.5x): vs UTG ~25–35% (hasta ~50% low-rake solvers); vs BTN ~52–65%. Dump interno MCCFR documentado en la auditoría de consenso.

### Veredicto calidad charts (100bb)

- UTG / HJ / CO / BTN: dentro de banda consenso.
- **SB RFI**: ligeramente tight (~34.7% vs 36–44%); solo legacy en [`data.js`](../js/engine/ranges/data.js) — **no** está en [`rfi-6max-100bb.json`](../data/ranges/rfi-6max-100bb.json).
- Audits actuales (`test:ranges`, `test:audit-ranges`, `test:audit-pro-dump`) pasan pero no cubren HJ/CO/SB globals ni pérdida de `combo_matrix` en short/deep.

## 3. Bugs confirmados (P0) — corregidos en este PR

1. **`combo_matrix` se perdía en short/deep** — `adjustOpenRow` / `adjustVsRfiRow` reconstruían solo notación (mix → 50%) y descartaban frecuencias fraccionarias y manos solo-matrix (p. ej. BTN 85s/74s).
2. **`BB_vs_SB` inaccesible** — datos en `VS_RFI`, pero `EXPLORER_SPOTS['3bet'].villainPositions` omitía `SB`.
3. **Etiquetas de stack incorrectas** — UI «40bb»/«150bb»; motor `short: 50` / `deep: 200`. UI alineada a **50bb / 200bb**.
4. **Open 2.5x/3x en RFI cosmético** — no cambiaba chart; control oculto en spot RFI.
5. **Race async en explorer** — `matrixJob` solo en modal; `renderRangesExplorer` ahora cancela jobs viejos.

## 4. Backlog P1 (no bloqueante)

- Exportar **SB RFI** al JSON solver (~36–40% raise-or-fold).
- Mostrar **% global / combos** en el título del spot.
- Ampliar consenso/audits: HJ/CO/SB RFI, `BB_vs_SB`, regresión short/deep + matrix (test de regresión añadido; ampliar consensus JSON sigue abierto).
- Reconciliar notación BTN con matrix-only (85s/74s en `raise`).
- Disclaimers más visibles: postflop = heurística; iso/squeeze = plantillas de estudio.
- Favoritos: restaurar campos ICM; no resetear spot al cambiar street postflop↔preflop.

## 5. Cómo verificar

```bash
npm run test:range-tables
node tools/test-ranges-explorer-p0.js
npm run test:ranges
npm run test:audit-ranges
```
