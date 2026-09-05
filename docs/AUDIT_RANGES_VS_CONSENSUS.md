# Residuales: charts vs consenso GTO (cash 6-max 100bb)

Tras la auditoría de 2026-09-05 (`tools/audit-ranges-vs-consensus.js` + `data/ranges/gto-consensus-6max-100bb.json`):

## Corregido en esta pasada
- BB vs UTG/HJ: gappers suited (K8s+/Q8s+/J8s+/T8s+, 97s, 86s)
- BB vs CO: T9o
- BB vs BTN: Q9o (cierra hueco cross-ladder vs K9o/J9o/98o)
- BTN vs BB 3-bet: ATo en callMix
- CO vs BB 3-bet: AJo/KQo en callMix
- Pedagogía KJo/KJs BB vs UTG y J9s CO vs BB alineada al chart
- CO vs HJ open 2.5x: **76s** entra en `threeBetMix` (farol polar IP con playability; no fold). Consenso: `mustThreeBet`.

## Polar / aprox. consciente (no hard-fail)
- A5o (y a veces A4o) en 3betMix BB vs CO/BTN mientras A6o/A7o foldean: polar solver-like
- A9o fold vs UTG con ATo call: frontera intencional
- SB vs UTG más tight que BB (ATo mustFold en baseline SB)
- Frequencias reales de solver (33/67) no modeladas: buckets 100%/50%/42%
- Postflop sigue siendo heurística MC, no árbol Pio/GTOW
- Capas Spin/MTT phase3: charts de estudio, no paridad solver

## Cómo re-auditar
```bash
npm run test:audit-ranges
npm run test:ranges
npm run test:range-tables
```
