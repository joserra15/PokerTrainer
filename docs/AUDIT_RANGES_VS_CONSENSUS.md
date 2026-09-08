# Residuales: charts vs consenso GTO (cash 6-max 100bb)

Tras la pasada de paridad con dump profesional MCCFR (2026-09-07), con
excepción explícita de **BB vs UTG** (restaurado al chart de estudio 2026-09-08):

## Corregido en esta pasada
- Infra `combo_matrix` fraccionaria (RFI / vsRFI / vs3bet) con fallback a charts
- UTG/BTN RFI: mixes profesionales (A4s 57%, 98s 45%, KQo 66%, A2o 25%, A5s raise)
- BB vs UTG: chart de estudio — 3bet QQ+/AK + mix JJ/AQs/A5s/A4s/KJs; call ATo+/KJo+/QJo/JTo y K9s+/Q9s+/J9s+
- BB vs BTN: 99 call, TT/AJs/KQs/AQo 3bet; Ax bajos polar
- SB vs BTN: A5s/A4s 3bet puro; KQs mix
- BTN vs BB: QQ mix, JJ call, A4s/A5s 4bet/fold, AKo mix; más calling range
- Sizing cash 100bb: 3bet 10bb, 4bet 24bb
- Postflop SRP IP: anclas cbet dry/wet/paired/monotone

## Polar / aprox. consciente (no hard-fail)
- BB vs UTG no usa combo_matrix del dump raked (~10% call); se mantiene el chart pedagógico
- A5o (y a veces A4o) en 3betMix BB vs CO/BTN mientras A6o/A7o foldean: polar solver-like
- Matrices parciales (BTN RFI sample, algunos vsRFI): el resto del chart legacy cubre el soporte
- Postflop turn/river y multiway siguen siendo heurística MC, no árbol Pio/GTOW
- Capas Spin/MTT phase3: charts de estudio, no paridad solver
- Dump asume rake 5%/2.5bb cap; sesión default sigue ~5%/3bb en EV display

## Cómo re-auditar
```bash
npm run test:audit-ranges
npm run test:audit-pro-dump
npm run test:ranges
npm run test:range-tables
```
